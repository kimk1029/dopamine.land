'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, CheckCircle2, PlayCircle, Gift, Zap } from 'lucide-react'
import AdBanner from '@/components/AdBanner'
import { refreshUserPoints } from '@/components/HeaderNavigator'

type Mission = {
  id: string
  title: string
  description: string
  target: number
  current: number
  reward: number
  unit: string
  claimed: boolean
}

export default function ChargePage() {
  const [loading, setLoading] = useState(true)
  const [missions, setMissions] = useState<Mission[]>([])
  const [adLoading, setAdLoading] = useState(false)
  
  // 보상 모달 상태
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [rewardAmount, setRewardAmount] = useState(0)
  const [rewardMessage, setRewardMessage] = useState('')

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch('/api/charge/status', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        if (res.status === 401) {
            // 토큰 만료 또는 없음 -> 로그인 필요
            // 여기서는 조용히 실패하거나 로그인 유도 가능
            console.log('Login required')
        }
        throw new Error('Failed to fetch status')
      }

      const data = await res.json()
      
      const newMissions: Mission[] = [
        {
          id: 'post_10',
          title: '게시글 작성 마스터',
          description: '게시글 10개를 작성하여 커뮤니티 활동을 시작하세요!',
          target: 10,
          current: data.postCount,
          reward: 500,
          unit: '개',
          claimed: data.rewards.includes('post_10')
        },
        {
          id: 'comment_50',
          title: '수다쟁이',
          description: '댓글 50개를 작성하여 다른 유저들과 소통하세요!',
          target: 50,
          current: data.commentCount,
          reward: 300,
          unit: '개',
          claimed: data.rewards.includes('comment_50')
        }
      ]

      setMissions(newMissions)
    } catch (error) {
      console.error(error)
      // 에러 발생 시 빈 미션 목록 대신 기본 미션 목록을 보여주되, 진행도는 0으로 표시할 수도 있음
      // 여기서는 일단 에러 로그만 남김
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 토큰이 있는지 확인
    const token = localStorage.getItem('token')
    if (token) {
        fetchStatus()
    } else {
        // 비로그인 상태일 때 빈 미션 목록 대신 기본 미션(0/0)을 보여주려면 여기서 설정
        setLoading(false)
        setMissions([
            {
                id: 'post_10',
                title: '게시글 작성 마스터',
                description: '게시글 10개를 작성하여 커뮤니티 활동을 시작하세요!',
                target: 10,
                current: 0,
                reward: 500,
                unit: '개',
                claimed: false
            },
            {
                id: 'comment_50',
                title: '수다쟁이',
                description: '댓글 50개를 작성하여 다른 유저들과 소통하세요!',
                target: 50,
                current: 0,
                reward: 300,
                unit: '개',
                claimed: false
            }
        ])
    }
  }, [])

  const handleWatchAd = async () => {
    if (adLoading) return
    setAdLoading(true)

    // 광고 시청 시뮬레이션 (3초 딜레이)
    // 실제로는 여기서 구글 애드센스 보상형 광고 API를 호출하거나
    // 전면 광고를 띄워야 함. 웹에서는 보통 전면 광고 후 콜백으로 처리.
    // 여기서는 "광고를 봤다"고 가정하고 바로 지급 API 호출
    
    setTimeout(async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/charge/ad-reward', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        })

        if (res.ok) {
            const data = await res.json()
            setRewardAmount(data.rewardAmount)
            setRewardMessage('광고 시청 보상이 지급되었습니다!')
            setShowRewardModal(true)
            refreshUserPoints() // 헤더 포인트 갱신
        }
      } catch (error) {
        console.error(error)
      } finally {
        setAdLoading(false)
      }
    }, 3000)
  }

  const handleClaim = async (missionId: string) => {
    try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/charge/claim', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({ missionId })
        })

        if (res.ok) {
            const data = await res.json()
            setRewardAmount(data.rewardAmount)
            setRewardMessage('미션 클리어 보상이 지급되었습니다!')
            setShowRewardModal(true)
            refreshUserPoints() // 헤더 포인트 갱신
            fetchStatus() // 미션 상태 갱신
        } else {
            const error = await res.json()
            alert(error.error || '보상 수령 실패')
        }
    } catch (error) {
        console.error(error)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] pb-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-500">
                <Zap className="w-8 h-8" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-white">충전소</h1>
                <p className="text-slate-400">포인트를 무료로 획득할 수 있는 다양한 방법들을 확인하세요.</p>
            </div>
        </div>

        {/* 광고 영역 */}
        <section className="mb-12">
            <Card className="bg-gradient-to-br from-indigo-900/50 to-violet-900/50 border-indigo-500/30 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 blur-[100px] rounded-full" />
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl text-white">
                        <PlayCircle className="text-yellow-400" />
                        광고 보고 포인트 받기
                    </CardTitle>
                    <CardDescription className="text-indigo-200">
                        짧은 광고 영상을 시청하고 즉시 포인트를 획득하세요. (하루 제한 없음)
                    </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="bg-black/30 rounded-xl p-8 flex flex-col items-center justify-center border border-white/5">
                        <p className="text-indigo-300 mb-6 text-center max-w-md">
                            광고 시청 완료 시 <span className="text-yellow-400 font-bold">50P</span>가 즉시 지급됩니다.
                            <br />
                            (실제 서비스에서는 구글 애드센스 광고가 재생됩니다)
                        </p>
                        <Button 
                            size="lg" 
                            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 text-lg shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                            onClick={handleWatchAd}
                            disabled={adLoading}
                        >
                            {adLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    광고 로딩 중...
                                </>
                            ) : (
                                <>
                                    <PlayCircle className="mr-2 h-5 w-5" />
                                    광고 시청하기 (+50P)
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </section>

        {/* 광고 배너 삽입 */}
        <div className="mb-12">
            <AdBanner dataAdSlot="1234567890" />
        </div>

        {/* 미션 영역 */}
        <section>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Gift className="text-pink-500" />
                도전 과제
            </h2>
            
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {missions.map((mission) => {
                        const percent = Math.min(100, Math.floor((mission.current / mission.target) * 100))
                        const isCompleted = mission.current >= mission.target
                        const isClaimed = mission.claimed

                        return (
                            <Card 
                                key={mission.id} 
                                className={`border-white/10 transition-all duration-300 ${
                                    isClaimed 
                                        ? 'bg-black/40 opacity-70' 
                                        : isCompleted 
                                            ? 'bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]' 
                                            : 'bg-[#12141a]'
                                }`}
                            >
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className={`text-xl mb-2 ${isCompleted && !isClaimed ? 'text-emerald-400' : 'text-white'}`}>
                                                {mission.title}
                                            </CardTitle>
                                            <CardDescription className="text-slate-400">
                                                {mission.description}
                                            </CardDescription>
                                        </div>
                                        <div className="bg-white/5 px-3 py-1 rounded-full border border-white/10 text-yellow-400 font-bold text-sm">
                                            +{mission.reward}P
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className={isCompleted ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                                                {isCompleted ? '달성 완료!' : '진행 중'}
                                            </span>
                                            <span className="text-white font-mono">
                                                {mission.current} / {mission.target} {mission.unit}
                                            </span>
                                        </div>
                                        <Progress 
                                            value={percent} 
                                            className="h-3 bg-black/50" 
                                            indicatorClassName={
                                                isClaimed 
                                                    ? "bg-slate-600" 
                                                    : isCompleted 
                                                        ? "bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse" 
                                                        : "bg-gradient-to-r from-violet-600 to-indigo-600"
                                            }
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    {isClaimed ? (
                                        <Button disabled className="w-full bg-white/5 text-slate-500 border border-white/5">
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            지급 완료
                                        </Button>
                                    ) : isCompleted ? (
                                        <Button 
                                            onClick={() => handleClaim(mission.id)}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse"
                                        >
                                            <Gift className="mr-2 h-4 w-4" />
                                            보상 받기 (Click!)
                                        </Button>
                                    ) : (
                                        <Button disabled className="w-full bg-white/5 text-slate-500 border border-white/5">
                                            진행 중... {percent}%
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            )}
        </section>
      </div>

      {/* 보상 획득 모달 */}
      <Dialog open={showRewardModal} onOpenChange={setShowRewardModal}>
        <DialogContent className="bg-[#1a1d24] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-4 pt-4">
                <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Gift className="w-8 h-8 text-yellow-500" />
                </div>
                <span className="text-2xl font-bold text-yellow-400">축하합니다!</span>
            </DialogTitle>
            <DialogDescription className="text-center text-slate-300 text-lg py-4">
              {rewardMessage}
              <br />
              <span className="text-2xl font-bold text-white mt-2 block">+{rewardAmount} Point</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button 
                onClick={() => setShowRewardModal(false)}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8"
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

