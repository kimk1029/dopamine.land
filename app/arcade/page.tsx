'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'
import Billboard from '@/components/Billboard'
import { ArcadeBox, ArcadeButton, ArcadeTicker } from '@/components/arcade'

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

    const earnMethods = [
        { icon: '📝', title: '게시판 작성', desc: '게시글을 작성하면 포인트를 받을 수 있습니다', reward: '+10 P', variant: 'secondary' as const, color: 'var(--arcade-secondary)' },
        { icon: '💬', title: '댓글 작성', desc: '댓글을 작성하면 포인트를 받을 수 있습니다', reward: '+5 P', variant: 'accent' as const, color: 'var(--arcade-accent)' },
        { icon: '❤️', title: '좋아요', desc: '게시글에 좋아요를 누르면 포인트를 받을 수 있습니다', reward: '+1 P', variant: 'primary' as const, color: 'var(--arcade-primary)' },
    ]

    return (
        <div className="animate-in" style={{ width: '100%' }}>

            {/* 1. Billboard Section (Top Most) */}
            <section style={{ marginBottom: '40px' }}>
                <Billboard />
            </section>

            {/* 2. Hero Section */}
            <section style={{ textAlign: 'center', padding: '40px 8px 24px', marginBottom: '48px' }}>
                <div
                    className="arcade-font-pixel blink"
                    style={{ color: 'var(--arcade-accent)', fontSize: '0.7rem', marginBottom: '24px', letterSpacing: '2px' }}
                >
                    WELCOME TO DOPAMINE.LAND
                </div>
                <h1
                    className="hero-title glitch-text"
                    style={{ fontSize: 'clamp(1.6rem, 5vw, 3rem)' }}
                >
                    오늘 당신의 운세는?
                </h1>
                <h2
                    className="hero-subtitle"
                    style={{ fontSize: 'clamp(0.9rem, 3vw, 1.5rem)', marginBottom: '24px' }}
                >
                    잭팟에 도전하세요!
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '28px', fontWeight: 500 }}>
                    무한의 계단, 블랙잭, 바카라 등 다양한 미니게임이 준비되어 있습니다.
                    <br />
                    지금 바로 플레이하고{' '}
                    <span style={{ color: 'var(--arcade-accent)', fontWeight: 900 }}>랭킹 1위</span>
                    의 주인공이 되어보세요.
                </p>
                <Link href="/game">
                    <ArcadeButton variant="primary" size="lg" className="btn-glitch-active">
                        🕹 지금 시작하고 100P 받기
                    </ArcadeButton>
                </Link>
            </section>

            {/* Ticker */}
            <section style={{ marginBottom: '48px' }}>
                <ArcadeTicker
                    text="★ DOPAMINE.LAND ★ INSERT COIN ★ 매일 다양한 활동으로 포인트를 모아보세요! ★ 오늘의 잭팟 주인공은 바로 당신 ★"
                    variant="accent"
                />
            </section>

            {/* 3. Dashboard Summary (Secondary) */}
            <section
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '24px',
                    marginBottom: '56px',
                    alignItems: 'stretch',
                }}
            >
                {/* My Stats */}
                <ArcadeBox label="MY_STATUS" variant="primary">
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '8px' }}>
                            <div>
                                <div className="arcade-font-pixel" style={{ fontSize: '0.55rem', color: 'var(--arcade-secondary)', marginBottom: '8px', letterSpacing: '1px' }}>
                                    NICKNAME
                                </div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>
                                    {currentUser?.nickname || 'Guest User'}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '24px' }}>
                                <div style={{ flex: 1 }}>
                                    <div className="arcade-font-pixel" style={{ fontSize: '0.55rem', color: 'var(--arcade-secondary)', marginBottom: '8px', letterSpacing: '1px' }}>
                                        LEVEL
                                    </div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>
                                        LV.{currentUser?.level || 1}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div className="arcade-font-pixel" style={{ fontSize: '0.55rem', color: 'var(--arcade-secondary)', marginBottom: '8px', letterSpacing: '1px' }}>
                                        POINTS
                                    </div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--arcade-accent)' }}>
                                        {currentPoints.toLocaleString()} P
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ borderTop: '2px dashed rgba(255,255,255,0.15)', paddingTop: '16px', textAlign: 'center' }}>
                            <Link href="/game">
                                <ArcadeButton variant="secondary" size="sm">
                                    게임 기록 확인하기
                                </ArcadeButton>
                            </Link>
                        </div>
                    </div>
                </ArcadeBox>

                {/* Point History Graph */}
                <ArcadeBox label="POINT_HISTORY" variant="secondary" style={{ minHeight: '320px' }}>
                    <div style={{ width: '100%', height: '280px', paddingTop: '8px' }}>
                        {pointsHistory.length === 0 ? (
                            <div
                                className="arcade-font-pixel"
                                style={{
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'rgba(255,255,255,0.4)',
                                    fontSize: '0.65rem',
                                    textAlign: 'center',
                                    lineHeight: 1.8,
                                }}
                            >
                                {isClient && localStorage.getItem('token') ? 'NO_HISTORY_DATA' : 'LOGIN_REQUIRED'}
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={pointsHistory}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(value) => {
                                            const date = new Date(value)
                                            return `${date.getMonth() + 1}/${date.getDate()}`
                                        }}
                                        stroke="rgba(255,255,255,0.45)"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        tickFormatter={(value) => `${value}`}
                                        stroke="rgba(255,255,255,0.45)"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        dx={-10}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#000',
                                            border: '3px solid var(--arcade-secondary)',
                                            borderRadius: 0,
                                            color: '#fff',
                                            fontFamily: "'Galmuri11', sans-serif",
                                        }}
                                        labelStyle={{ color: 'var(--arcade-secondary)', marginBottom: '4px' }}
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
                                        type="stepAfter"
                                        dataKey="points"
                                        stroke="var(--arcade-primary)"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#000', stroke: 'var(--arcade-primary)', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: 'var(--arcade-primary)', stroke: '#fff', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </ArcadeBox>
            </section>

            {/* 4. 포인트 획득 방법 카드 */}
            <section style={{ marginBottom: '56px' }}>
                <ArcadeBox label="HOW_TO_EARN" variant="accent">
                    <div style={{ paddingTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <span style={{ fontSize: '1.8rem' }}>🪙</span>
                            <div>
                                <h3 className="arcade-font-pixel" style={{ color: 'var(--arcade-accent)', fontSize: '0.85rem', marginBottom: '6px' }}>
                                    포인트 획득 방법
                                </h3>
                                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', fontWeight: 500 }}>
                                    다양한 활동으로 포인트를 모아보세요
                                </p>
                            </div>
                        </div>

                        <div className="arcade-grid" style={{ gap: '24px' }}>
                            {earnMethods.map((m) => (
                                <ArcadeBox key={m.title} variant={m.variant} isChunky={false} className="kuji-card-arcade">
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                                        <span style={{ fontSize: '1.6rem' }}>{m.icon}</span>
                                        <span
                                            className="arcade-font-pixel"
                                            style={{
                                                color: m.color,
                                                border: `2px solid ${m.color}`,
                                                padding: '4px 8px',
                                                fontSize: '0.6rem',
                                                background: 'rgba(0,0,0,0.5)',
                                            }}
                                        >
                                            {m.reward}
                                        </span>
                                    </div>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>{m.title}</h4>
                                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{m.desc}</p>
                                </ArcadeBox>
                            ))}
                        </div>

                        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '2px dashed rgba(255,255,255,0.15)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                                <span>📅</span>
                                <span>매일 다양한 활동으로 포인트를 모아보세요!</span>
                            </div>
                        </div>
                    </div>
                </ArcadeBox>
            </section>

        </div>
    )
}
