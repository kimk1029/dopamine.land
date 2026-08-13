'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import HeaderNavigator from '@/components/HeaderNavigator'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { Activity, Gamepad2, ArrowRight, Coins, MessageSquare, ThumbsUp, Calendar, BarChart3, FileText, Heart } from 'lucide-react'
import Link from 'next/link'
import Billboard from '@/components/Billboard'

interface RankingUser {
    id: number
    email: string
    nickname: string | null
    points: number
    level: number
    rank: number
}

export default function Home() {
    const router = useRouter()
    // 기존 상태 유지
    const [dailyRankings, setDailyRankings] = useState<RankingUser[]>([])
    const [loading, setLoading] = useState(true)
    const [pointsHistory, setPointsHistory] = useState<Array<{ date: string; points: number }>>([])
    const [currentPoints, setCurrentPoints] = useState(0)
    const [currentUser, setCurrentUser] = useState<{ nickname: string; level: number } | null>(null)
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)

        // 구글 로그인 콜백 처리
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search)
            const token = urlParams.get('token')
            const userParam = urlParams.get('user')
            const loginBonus = urlParams.get('loginBonus')
            const error = urlParams.get('error')

            if (error) {
                alert(error)
                // URL에서 에러 파라미터 제거
                window.history.replaceState({}, document.title, window.location.pathname)
            }

            if (token && userParam) {
                try {
                    const user = JSON.parse(userParam)
                    localStorage.setItem('token', token)
                    localStorage.setItem('user', JSON.stringify(user))

                    if (loginBonus) {
                        alert(`로그인 보너스로 ${loginBonus} 포인트를 받았습니다!`)
                    }

                    // URL에서 파라미터 제거 (새로고침 없이)
                    window.history.replaceState({}, document.title, window.location.pathname)
                    // 페이지 새로고침 대신 상태만 업데이트
                    setCurrentUser({ nickname: user.nickname || user.email.split('@')[0], level: user.level })
                    setCurrentPoints(user.points)
                    return
                } catch (e) {
                    console.error('Failed to parse user data:', e)
                }
            }
        }

        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token')
                if (token) {
                    const userRes = await fetch('/api/user/me', { headers: { Authorization: `Bearer ${token}` } });
                    if (userRes.ok) {
                        const userData = await userRes.json();
                        setCurrentUser({ nickname: userData.nickname || userData.email.split('@')[0], level: userData.level });
                        setCurrentPoints(userData.points);
                    }

                    const historyResponse = await fetch('/api/user/points-history', {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                    if (historyResponse.ok) {
                        const historyData = await historyResponse.json()
                        setPointsHistory(historyData.history || [])
                    }
                }

                const dailyRes = await fetch('/api/ranking/period?period=daily&limit=3');
                if (dailyRes.ok) setDailyRankings((await dailyRes.json()).rankings || []);

            } catch (error) {
                console.error('데이터 조회 오류:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0c] to-black text-slate-100 overflow-x-hidden selection:bg-purple-500/30">
            <HeaderNavigator />

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">

                {/* 1. Billboard Section (Top Most) */}
                <section className="mb-10">
                    <Billboard />
                </section>

                {/* 2. Hero Section */}
                <section className="mb-20 text-center relative py-10">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] -z-10 pointer-events-none" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, type: "spring" }}
                    >
                        <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-purple-400 mb-6 backdrop-blur-sm">
                            Welcome to 도파민랜드
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-tight">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-gradient-x">
                                오늘 당신의 운세는?
                            </span>
                            <br />
                            <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                                잭팟에 도전하세요!
                            </span>
                        </h1>
                        <p className="text-slate-400 text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
                            무한의 계단, 블랙잭, 바카라 등 다양한 미니게임이 준비되어 있습니다.<br />
                            지금 바로 플레이하고 <span className="text-yellow-400 font-bold">랭킹 1위</span>의 주인공이 되어보세요.
                        </p>
                        <Link href="/game">
                            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg px-10 py-7 rounded-full shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:shadow-[0_0_50px_rgba(168,85,247,0.7)] transition-all transform hover:scale-105 active:scale-95">
                                <Gamepad2 className="w-6 h-6 mr-2" />
                                지금 시작하고 100P 받기
                            </Button>
                        </Link>
                    </motion.div>
                </section>

                {/* 3. Dashboard Summary (Secondary) */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
                    {/* My Stats */}
                    <div className="lg:col-span-1 bg-[#131316]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-purple-400" />
                                MY STATUS
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <div className="text-xs text-slate-500 font-bold uppercase mb-1">Nickname</div>
                                    <div className="text-2xl font-black text-white">
                                        {currentUser?.nickname || 'Guest User'}
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <div className="text-xs text-slate-500 font-bold uppercase mb-1">Level</div>
                                        <div className="text-xl font-bold text-white flex items-center gap-1">
                                            {currentUser?.level || 1} <span className="text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">LVL</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-slate-500 font-bold uppercase mb-1">Points</div>
                                        <div className="text-xl font-bold text-emerald-400">
                                            {currentPoints.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5">
                            <Link href="/game">
                                <Button className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10">
                                    게임 기록 확인하기
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Point History Graph */}
                    <div className="lg:col-span-2 bg-[#131316]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 h-[300px] flex flex-col">
                        <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-cyan-400" />
                            POINT HISTORY
                        </h3>
                        <div className="flex-1 w-full min-h-[300px]">
                            {pointsHistory.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                                    {isClient && localStorage.getItem('token') ? 'No history data' : 'Login required to view history'}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                    <LineChart data={pointsHistory}>
                                        <defs>
                                            <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(value) => {
                                                const date = new Date(value)
                                                return `${date.getMonth() + 1}/${date.getDate()}`
                                            }}
                                            stroke="#64748b"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            tickFormatter={(value) => `${value}`}
                                            stroke="#64748b"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            dx={-10}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                            labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                            formatter={(value: any) => {
                                                if (value === undefined || value === null || typeof value !== 'number') return ['0 P', 'Points']
                                                return [`${value.toLocaleString()} P`, 'Points']
                                            }}
                                            // recharts 3.10 부터 label 이 ReactNode 로 넓어져서 Date 에 그대로 못 넣는다.
                                            labelFormatter={(label) =>
                                                typeof label === 'string' || typeof label === 'number'
                                                    ? new Date(label).toLocaleDateString()
                                                    : ''
                                            }
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="points"
                                            stroke="#8b5cf6"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#1e293b', stroke: '#8b5cf6', strokeWidth: 2 }}
                                            activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </section>

                {/* 4. 포인트 획득 방법 카드 */}
                <section className="mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <div className="bg-[#131316]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border border-yellow-500/30 flex items-center justify-center">
                                    <Coins className="w-6 h-6 text-yellow-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">포인트 획득 방법</h3>
                                    <p className="text-sm text-slate-400">다양한 활동으로 포인트를 모아보세요</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* 게시판 작성 */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                    className="bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/20 rounded-2xl p-6 hover:border-blue-500/40 transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                                            <FileText className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
                                            <span className="text-blue-400 font-bold text-sm">+10 P</span>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">게시판 작성</h4>
                                    <p className="text-sm text-slate-400">게시글을 작성하면 포인트를 받을 수 있습니다</p>
                                </motion.div>

                                {/* 댓글 작성 */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.4 }}
                                    className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/20 rounded-2xl p-6 hover:border-green-500/40 transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                                            <MessageSquare className="w-5 h-5 text-green-400" />
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                                            <span className="text-green-400 font-bold text-sm">+5 P</span>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">댓글 작성</h4>
                                    <p className="text-sm text-slate-400">댓글을 작성하면 포인트를 받을 수 있습니다</p>
                                </motion.div>

                                {/* 좋아요 */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.5 }}
                                    className="bg-gradient-to-br from-pink-500/10 to-rose-600/10 border border-pink-500/20 rounded-2xl p-6 hover:border-pink-500/40 transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center group-hover:bg-pink-500/30 transition-colors">
                                            <Heart className="w-5 h-5 text-pink-400" />
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30">
                                            <span className="text-pink-400 font-bold text-sm">+1 P</span>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">좋아요</h4>
                                    <p className="text-sm text-slate-400">게시글에 좋아요를 누르면 포인트를 받을 수 있습니다</p>
                                </motion.div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/5">
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <Calendar className="w-4 h-4" />
                                    <span>매일 다양한 활동으로 포인트를 모아보세요!</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </section>

            </main>
        </div>
    )
}
