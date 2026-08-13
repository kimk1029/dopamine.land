'use client'

import { useState, useEffect } from 'react'
import { ArcadeBox, ArcadeButton, ArcadeTicker } from '@/components/arcade'
import AdBanner from '@/components/AdBanner'
import { refreshUserPoints } from '@/lib/user-session'

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
    <div className="animate-in">
      {/* 페이지 헤더 */}
      <header className="page-header" style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1
            className="arcade-font-pixel glitch-text"
            style={{ color: 'var(--arcade-primary)', fontSize: '1.6rem', marginBottom: '12px' }}
          >
            INSERT_COIN
          </h1>
          <p style={{ color: '#fff', opacity: 0.8, fontWeight: 500 }}>
            포인트를 무료로 획득할 수 있는 다양한 방법들을 확인하세요.
          </p>
        </div>
      </header>

      <div style={{ marginBottom: '32px' }}>
        <ArcadeTicker
          text="FREE PLAY MODE :: 광고 보고 코인 충전 :: 미션 클리어 보너스 지급 :: CONTINUE? 9... 8... 7..."
          variant="accent"
        />
      </div>

      {/* 광고 영역 */}
      <section style={{ marginBottom: '48px' }}>
        <ArcadeBox variant="secondary" label="AD_PLAYER" isChunky>
          <div style={{ padding: '8px 4px' }}>
            <h2
              className="arcade-font-pixel"
              style={{ color: 'var(--arcade-secondary)', fontSize: '1rem', marginBottom: '10px' }}
            >
              WATCH_AD {'>'} GET_COIN
            </h2>
            <p style={{ color: '#fff', opacity: 0.8, marginBottom: '20px' }}>
              짧은 광고 영상을 시청하고 즉시 포인트를 획득하세요. (하루 제한 없음)
            </p>

            <div
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: '2px dashed var(--arcade-secondary)',
                padding: '32px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                textAlign: 'center',
              }}
            >
              <p style={{ color: '#fff', opacity: 0.85 }}>
                광고 시청 완료 시{' '}
                <span style={{ color: 'var(--arcade-accent)', fontWeight: 900 }}>50P</span>가 즉시
                지급됩니다.
                <br />
                <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>
                  (실제 서비스에서는 구글 애드센스 광고가 재생됩니다)
                </span>
              </p>
              <ArcadeButton
                variant="accent"
                size="lg"
                className={adLoading ? '' : 'coin-btn'}
                onClick={handleWatchAd}
                disabled={adLoading}
              >
                {adLoading ? (
                  <span className="blink">NOW_LOADING... 광고 로딩 중</span>
                ) : (
                  <>▶ 광고 시청하기 (+50P)</>
                )}
              </ArcadeButton>
            </div>
          </div>
        </ArcadeBox>
      </section>

      {/* 광고 배너 삽입 */}
      <div style={{ marginBottom: '48px' }}>
        <AdBanner dataAdSlot="1234567890" />
      </div>

      {/* 미션 영역 */}
      <section>
        <h2
          className="arcade-font-pixel"
          style={{ color: 'var(--arcade-accent)', fontSize: '1.1rem', marginBottom: '28px' }}
        >
          MISSION_BOARD
        </h2>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <span
              className="blink arcade-font-pixel"
              style={{ color: 'var(--arcade-primary)', fontSize: '0.9rem' }}
            >
              LOADING_MISSIONS...
            </span>
          </div>
        ) : (
          <div className="arcade-grid">
            {missions.map((mission) => {
              const percent = Math.min(100, Math.floor((mission.current / mission.target) * 100))
              const isCompleted = mission.current >= mission.target
              const isClaimed = mission.claimed

              const boxVariant = isClaimed ? 'default' : isCompleted ? 'accent' : 'primary'
              const boxLabel = isClaimed ? 'STAGE_CLEAR' : isCompleted ? 'REWARD_READY' : 'IN_PROGRESS'

              return (
                <ArcadeBox
                  key={mission.id}
                  variant={boxVariant}
                  label={boxLabel}
                  isChunky
                  className="kuji-card-arcade"
                  style={isClaimed ? { opacity: 0.6 } : undefined}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div>
                        <h3
                          style={{
                            color: isCompleted && !isClaimed ? 'var(--arcade-accent)' : '#fff',
                            fontWeight: 900,
                            fontSize: '1.2rem',
                            marginBottom: '8px',
                          }}
                        >
                          {mission.title}
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                          {mission.description}
                        </p>
                      </div>
                      <span
                        className="arcade-font-pixel"
                        style={{
                          color: 'var(--arcade-accent)',
                          border: '2px solid var(--arcade-accent)',
                          background: 'rgba(0,0,0,0.6)',
                          padding: '6px 10px',
                          fontSize: '0.6rem',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        +{mission.reward}P
                      </span>
                    </div>

                    {/* 진행도 바 */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                          fontSize: '0.85rem',
                        }}
                      >
                        <span
                          className={isCompleted && !isClaimed ? 'blink' : undefined}
                          style={{
                            color: isCompleted ? 'var(--arcade-accent)' : 'rgba(255,255,255,0.6)',
                            fontWeight: isCompleted ? 900 : 500,
                          }}
                        >
                          {isCompleted ? '달성 완료!' : '진행 중'}
                        </span>
                        <span style={{ color: '#fff', fontFamily: "'Galmuri11', monospace" }}>
                          {mission.current} / {mission.target} {mission.unit}
                        </span>
                      </div>
                      <div
                        style={{
                          height: '18px',
                          background: '#000',
                          border: '3px solid var(--arcade-border)',
                          padding: '2px',
                          imageRendering: 'pixelated',
                        }}
                      >
                        <div
                          style={{
                            width: `${percent}%`,
                            height: '100%',
                            background: isClaimed
                              ? 'rgba(255,255,255,0.25)'
                              : isCompleted
                                ? 'var(--arcade-accent)'
                                : 'var(--arcade-primary)',
                            backgroundImage:
                              'repeating-linear-gradient(90deg, rgba(0,0,0,0.25) 0 4px, transparent 4px 8px)',
                            transition: 'width 0.3s steps(10)',
                          }}
                        />
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div style={{ display: 'flex' }}>
                      {isClaimed ? (
                        <ArcadeButton variant="secondary" size="sm" disabled style={{ width: '100%', opacity: 0.5 }}>
                          ✔ 지급 완료
                        </ArcadeButton>
                      ) : isCompleted ? (
                        <ArcadeButton
                          variant="accent"
                          size="md"
                          className="coin-btn"
                          style={{ width: '100%' }}
                          onClick={() => handleClaim(mission.id)}
                        >
                          ★ 보상 받기 (PRESS_START)
                        </ArcadeButton>
                      ) : (
                        <ArcadeButton variant="secondary" size="sm" disabled style={{ width: '100%', opacity: 0.5 }}>
                          진행 중... {percent}%
                        </ArcadeButton>
                      )}
                    </div>
                  </div>
                </ArcadeBox>
              )
            })}
          </div>
        )}
      </section>

      {/* 보상 획득 모달 */}
      {showRewardModal && (
        <div
          onClick={() => setShowRewardModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px' }} className="animate-in">
            <ArcadeBox variant="accent" label="REWARD_GET" isChunky>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 8px',
                  textAlign: 'center',
                }}
              >
                <div className="arcade-font-pixel blink" style={{ color: 'var(--arcade-accent)', fontSize: '1.1rem' }}>
                  CONGRATULATIONS!
                </div>
                <p style={{ color: '#fff', opacity: 0.85 }}>{rewardMessage}</p>
                <div
                  className="arcade-font-pixel"
                  style={{ color: 'var(--arcade-secondary)', fontSize: '1.3rem', textShadow: '3px 3px 0 #000' }}
                >
                  +{rewardAmount} POINT
                </div>
                <ArcadeButton variant="accent" size="md" onClick={() => setShowRewardModal(false)}>
                  확인 (OK)
                </ArcadeButton>
              </div>
            </ArcadeBox>
          </div>
        </div>
      )}
    </div>
  )
}
