'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { ArcadeBox, ArcadeButton, ArcadeTicker } from '@/components/arcade'
import { toast } from 'sonner'

// --- Game Data ---
const GAMES = {
    casino: [
        { id: 'holdem', name: 'Texas Holdem', desc: '심리전의 정수, 텍사스 홀덤', icon: '🃏', path: '/game/holdem', glow: '#ff2d55', multiplayer: true, maintenance: true },
        { id: 'blackjack', name: 'Blackjack', desc: '21을 향한 승부', icon: '♠️', path: '/game/blackjack', glow: '#e2e8f0' },
        { id: 'bustabit', name: 'Graph Game', desc: '타이밍이 생명! 그래프', icon: '📈', path: '/game/bustabit', glow: '#ff9500' },
        { id: 'roulette', name: 'Roulette', desc: '운명의 휠을 돌려라', icon: '🎡', path: '/game/roulette', glow: '#ff00ff' },
        { id: 'cloverpit', name: 'Slots', desc: '잭팟을 노려라', icon: '🍀', path: '/game/cloverpit', glow: '#39ff14' },
    ],
    arcade: [
        { id: 'skyroads', name: 'Sky Roads', desc: '우주를 질주하라', icon: '🚀', path: '/game/skyroads', glow: '#7b68ee', pcOnly: true },
        { id: 'windrunner', name: 'Wind Runner', desc: '바람을 가르는 질주', icon: '🌪️', path: '/game/windrunner', glow: '#00ffff', pcOnly: true },
        { id: 'stairs', name: 'Infinite Stairs', desc: '무한 계단 오르기', icon: '🪜', path: '/game/stairs', glow: '#4d9fff' },
        { id: 'stacker', name: 'Stacker', desc: '블록을 쌓아 올려라', icon: '📦', path: '/game/stacker', glow: '#00e5ff' },
        { id: 'orbital-defense', name: 'Orbital Defense', desc: '궤도를 지켜라', icon: '🛡️', path: '/game/orbital-defense', glow: '#aaff00' },
        { id: 'tetris', name: 'Tetris', desc: '우주 테트리스', icon: '🧱', path: '/game/tetris', glow: '#00b3ff', multiplayer: true, maintenance: true },
    ],
    shop: [ // Kuji moved to shop category for display
        { id: 'kuji', name: 'Ichiban Kuji', desc: '행운의 뽑기! (100P)', icon: '🎁', path: '/game/kuji', glow: '#ffd60a', inProgress: true },
        { id: 'space-race', name: '우주 레이스', desc: '우주를 가르는 레이스', icon: '🛸', path: '/game/kuji/space-race', glow: '#00ffff' }
    ]
}

const HOF_GAMES = [
    { key: 'skyroads', label: 'SKYROADS' },
    { key: 'windrunner', label: 'WINDRUNNER' },
    { key: 'stairs', label: 'STAIRS' },
]

export default function GameLobby() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [kujiResult, setKujiResult] = useState<any>(null)
    const [isBuyingKuji, setIsBuyingKuji] = useState(false)
    const [showKujiModal, setShowKujiModal] = useState(false)
    const [detailTab, setDetailTab] = useState<string | null>(null)
    const [hofTab, setHofTab] = useState('skyroads')

    useEffect(() => {
        const abortController = new AbortController()

        const fetchStats = async () => {
            try {
                const res = await fetch('/api/stats', {
                    signal: abortController.signal
                })
                if (res.ok) {
                    const data = await res.json()
                    // Filter out non-casino games from chart data
                    if (data.byGame) {
                        data.byGame = data.byGame.filter((g: any) =>
                            ['blackjack', 'bustabit', 'cloverpit', 'roulette', 'holdem'].includes(g.gameType)
                        );
                    }
                    // 디버깅: 순위 데이터 확인
                    if (data.rankings) {
                        console.log('Rankings data:', data.rankings)
                    }
                    setStats(data)
                } else {
                    console.error('Stats API error:', res.status, await res.text())
                }
            } catch (e: any) {
                // AbortError는 무시 (의도적인 취소)
                if (e.name !== 'AbortError') {
                    console.error('Stats fetch error:', e)
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false)
                }
            }
        }

        fetchStats()

        return () => {
            abortController.abort()
        }
    }, [])


    const handleGameClick = (e: React.MouseEvent, game: any) => {
        // No modal needed anymore, direct link
    }

    const handleBuyKuji = async () => {
        if (isBuyingKuji) return;
        setIsBuyingKuji(true);
        setKujiResult(null);

        const abortController = new AbortController();

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('로그인이 필요합니다.');
                setIsBuyingKuji(false);
                return;
            }
            const res = await fetch('/api/shop/kuji', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                signal: abortController.signal
            });
            const data = await res.json();
            if (res.ok) {
                setKujiResult(data.prize);
                toast.success(`[Rank ${data.prize.rank}] ${data.prize.name} 당첨!`);
                // Stats 업데이트 (AbortController 없이, 단순 요청)
                try {
                    const statsRes = await fetch('/api/stats');
                    if (statsRes.ok) {
                        const statsData = await statsRes.json();
                        if (statsData.byGame) {
                            statsData.byGame = statsData.byGame.filter((g: any) =>
                                ['blackjack', 'bustabit', 'cloverpit', 'roulette', 'holdem'].includes(g.gameType)
                            );
                        }
                        setStats(statsData);
                    }
                } catch (e) {
                    // Stats 업데이트 실패는 무시
                }
            } else {
                toast.error(data.error || '뽑기 실패');
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Kuji buy error:', error);
                toast.error('뽑기 중 오류가 발생했습니다.');
            }
        } finally {
            setIsBuyingKuji(false);
        }
    }

    // --- Components ---

    const GameCard = ({ game, gameStats }: { game: any; gameStats?: any }) => {
        // 해당 게임의 통계 찾기
        const stat = gameStats?.find((s: any) => s.gameType === game.id)

        return (
            <Link
                href={game.path}
                onClick={(e) => {
                    if (game.maintenance) {
                        e.preventDefault()
                    } else {
                        handleGameClick(e, game)
                    }
                }}
                className={`game-cab ${game.inProgress ? 'game-cab-live' : ''} ${game.maintenance ? 'game-cab-locked' : ''}`}
                style={{ '--cab-glow': game.glow } as React.CSSProperties}
            >
                {/* Cabinet marquee strip */}
                <div className="cab-marquee" style={{ background: game.glow }} />

                {/* Status badges */}
                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px', zIndex: 5 }}>
                    {game.beta && <span className="cab-badge" style={{ color: '#ff2d55', borderColor: '#ff2d55' }}>BETA</span>}
                    {game.pcOnly && <span className="cab-badge" style={{ color: '#4d9fff', borderColor: '#4d9fff' }}>PC</span>}
                    {game.multiplayer && !game.maintenance && (
                        <span className="cab-badge blink" style={{ color: 'var(--arcade-accent)', borderColor: 'var(--arcade-accent)' }}>MULTI</span>
                    )}
                    {game.inProgress && (
                        <span className="cab-badge blink" style={{ color: 'var(--arcade-secondary)', borderColor: 'var(--arcade-secondary)' }}>LIVE</span>
                    )}
                </div>

                {game.maintenance && (
                    <div className="cab-maintenance">
                        <span style={{ fontSize: '1.6rem' }}>🔧</span>
                        <span className="arcade-font-pixel" style={{ color: '#ffd60a', fontSize: '0.6rem' }}>공사중</span>
                    </div>
                )}

                <div style={{ fontSize: '2rem', lineHeight: 1, marginBottom: '12px', filter: `drop-shadow(0 0 6px ${game.glow})` }}>
                    {game.icon}
                </div>
                <h3
                    className="arcade-font-pixel glitch-text"
                    style={{ color: '#fff', fontSize: '0.72rem', marginBottom: '8px', lineHeight: 1.4 }}
                >
                    {game.name}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', marginBottom: '12px' }}>{game.desc}</p>

                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {game.maintenance ? (
                        <span className="arcade-font-pixel" style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)' }}>
                            OUT_OF_ORDER
                        </span>
                    ) : game.inProgress ? (
                        <span className="arcade-font-pixel blink" style={{ fontSize: '0.55rem', color: 'var(--arcade-secondary)' }}>
                            🔥 절찬리 진행중
                        </span>
                    ) : (
                        <span className="cab-coin arcade-font-pixel" style={{ fontSize: '0.55rem' }}>
                            INSERT COIN ▶
                        </span>
                    )}
                    {stat && (
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                            {stat.totalGames?.toLocaleString() || 0}회
                        </span>
                    )}
                </div>
            </Link>
        )
    }

    const SectionHeader = ({ icon, title, color }: { icon: string; title: string; color: string }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <span style={{ fontSize: '1.2rem', filter: `drop-shadow(0 0 6px ${color})` }}>{icon}</span>
            <h2 className="arcade-font-pixel glitch-text" style={{ color, fontSize: '0.9rem' }}>{title}</h2>
        </div>
    )

    const activeDetailTab = detailTab ?? stats?.byGame?.[0]?.gameType
    const detailGame = stats?.byGame?.find((g: any) => g.gameType === activeDetailTab)

    return (
        <div className="animate-in">
            <style>{`
                .game-cab {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    min-height: 200px;
                    padding: 20px 16px 16px;
                    background: rgba(0, 0, 0, 0.55);
                    border: 4px solid rgba(255, 255, 255, 0.25);
                    box-shadow: 6px 6px 0 0 #000;
                    text-decoration: none;
                    overflow: hidden;
                    image-rendering: pixelated;
                    transition: transform 0.1s steps(2, end), border-color 0.1s, box-shadow 0.1s;
                }
                .game-cab:hover {
                    transform: translateY(-4px);
                    border-color: var(--cab-glow);
                    box-shadow: 6px 6px 0 0 #000, 0 0 18px var(--cab-glow), inset 0 0 14px rgba(255, 255, 255, 0.06);
                }
                .game-cab .cab-coin {
                    color: rgba(255, 255, 255, 0.35);
                }
                .game-cab:hover .cab-coin {
                    color: var(--arcade-accent);
                    animation: blink 1s infinite;
                }
                .cab-marquee {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 6px;
                    box-shadow: 0 0 10px var(--cab-glow);
                }
                .cab-badge {
                    font-family: 'Press Start 2P', cursive;
                    font-size: 0.42rem;
                    padding: 4px 6px;
                    background: rgba(0, 0, 0, 0.85);
                    border: 2px solid;
                    letter-spacing: 1px;
                }
                .cab-maintenance {
                    position: absolute;
                    inset: 0;
                    z-index: 4;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    background: repeating-linear-gradient(
                        -45deg,
                        rgba(0, 0, 0, 0.82),
                        rgba(0, 0, 0, 0.82) 14px,
                        rgba(255, 214, 10, 0.14) 14px,
                        rgba(255, 214, 10, 0.14) 28px
                    );
                }
                .game-cab-locked {
                    cursor: not-allowed;
                    filter: grayscale(0.4);
                }
                .game-cab-locked:hover {
                    transform: none;
                    border-color: rgba(255, 255, 255, 0.25);
                    box-shadow: 6px 6px 0 0 #000;
                }
                .game-cab-live {
                    border-color: var(--arcade-secondary);
                    animation: cab-live-pulse 1.6s ease-in-out infinite;
                }
                @keyframes cab-live-pulse {
                    0%, 100% { box-shadow: 6px 6px 0 0 #000, 0 0 8px var(--arcade-secondary); }
                    50% { box-shadow: 6px 6px 0 0 #000, 0 0 22px var(--arcade-secondary); }
                }
                .cab-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
                    gap: 20px;
                }
                .hof-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 14px;
                    border: 2px solid rgba(255, 255, 255, 0.12);
                    background: rgba(0, 0, 0, 0.45);
                }
                .lobby-stat-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
                    gap: 14px;
                }
                .lobby-stat-cell {
                    border: 2px solid rgba(255, 255, 255, 0.12);
                    background: rgba(0, 0, 0, 0.45);
                    padding: 12px;
                }
            `}</style>

            {/* Ticker */}
            <div style={{ marginBottom: '32px' }}>
                <ArcadeTicker
                    text="*** WELCOME TO DOPAMINE.LAND *** INSERT COIN TO PLAY *** 다양한 게임과 보상이 기다리고 있습니다 *** WEEKLY RESET EVERY MONDAY ***"
                    variant="secondary"
                    speed={25}
                />
            </div>

            {/* Header & Summary */}
            <header
                className="page-header"
                style={{
                    marginBottom: '40px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    flexWrap: 'wrap',
                    gap: '16px',
                }}
            >
                <div>
                    <h1
                        className="arcade-font-pixel glitch-text"
                        style={{ color: 'var(--arcade-primary)', fontSize: '1.6rem', marginBottom: '12px', textShadow: '4px 4px 0 var(--arcade-secondary)' }}
                    >
                        GAME_SELECT
                    </h1>
                    <p style={{ color: '#fff', opacity: 0.8, fontWeight: 500 }}>
                        다양한 게임과 보상이 기다리고 있습니다.
                    </p>
                </div>
                {stats && (
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <ArcadeBox label="WIN_RATE" variant="accent" isChunky={false} style={{ minWidth: '160px', textAlign: 'right' }}>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>주간 리셋</div>
                            <div className="arcade-font-pixel" style={{ color: 'var(--arcade-accent)', fontSize: '1rem' }}>
                                {stats.summary.winRate.toFixed(1)}%
                            </div>
                        </ArcadeBox>
                        <ArcadeBox label="PROFIT" variant="secondary" isChunky={false} style={{ minWidth: '160px', textAlign: 'right' }}>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>주간 리셋</div>
                            <div
                                className="arcade-font-pixel"
                                style={{
                                    color: stats.summary.totalProfit >= 0 ? 'var(--arcade-secondary)' : '#ff2d55',
                                    fontSize: '1rem',
                                }}
                            >
                                {stats.summary.totalProfit > 0 ? '+' : ''}{stats.summary.totalProfit.toLocaleString()}
                            </div>
                        </ArcadeBox>
                    </div>
                )}
            </header>

            {/* --- Game Lists (Categorized) --- */}

            {/* Casino Games */}
            <section style={{ marginBottom: '48px' }}>
                <SectionHeader icon="🎲" title="CASINO_FLOOR" color="var(--arcade-primary)" />
                <div className="cab-grid">
                    {GAMES.casino.map(g => <GameCard key={g.id} game={g} gameStats={stats?.byGame} />)}
                </div>
            </section>

            {/* Arcade Games */}
            <section style={{ marginBottom: '48px' }}>
                <SectionHeader icon="⚡" title="ARCADE_ZONE" color="var(--arcade-secondary)" />
                <div className="cab-grid">
                    {GAMES.arcade.map(g => <GameCard key={g.id} game={g} />)}
                </div>
            </section>

            {/* Shop / Event */}
            <section style={{ marginBottom: '56px' }}>
                <SectionHeader icon="🎁" title="SHOP_&_EVENT" color="var(--arcade-accent)" />
                <div className="cab-grid">
                    {GAMES.shop.map(g => <GameCard key={g.id} game={g} />)}
                </div>
            </section>

            {/* Kuji Modal Overlay Removed */}

            {/* --- Bottom Stats Section --- */}
            <section style={{ borderTop: '4px dashed rgba(255,255,255,0.15)', paddingTop: '48px' }}>
                <SectionHeader icon="📊" title="GAME_STATISTICS" color="var(--arcade-primary)" />

                {/* 카지노 통계 통합 꺽은선 그래프 */}
                <ArcadeBox label="CASINO_OVERVIEW" variant="primary" style={{ marginBottom: '40px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '16px' }}>
                        카지노 게임별 승률, 환급률, 거래량, 배율 통합 현황
                    </p>
                    <div style={{ height: '400px', minHeight: '400px' }}>
                        {stats?.byGame && stats.byGame.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minHeight={400}>
                                <LineChart data={stats.byGame}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
                                    <XAxis
                                        dataKey="gameType"
                                        stroke="#00ffff"
                                        fontSize={11}
                                        tickFormatter={(v) => v.toUpperCase()}
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        stroke="rgba(255,255,255,0.5)"
                                        fontSize={11}
                                        label={{ value: '승률/환급률 (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'rgba(255,255,255,0.6)' } }}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        stroke="rgba(255,255,255,0.5)"
                                        fontSize={11}
                                        label={{ value: '거래량/배율', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: 'rgba(255,255,255,0.6)' } }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', border: '3px solid var(--arcade-primary)', borderRadius: 0, color: '#fff', fontFamily: "'Galmuri11', sans-serif" }}
                                        formatter={(value: any, name: any) => {
                                            if (value === undefined || value === null || typeof value !== 'number') {
                                                return [value ?? 0, name ?? ''];
                                            }
                                            const nameStr = String(name || '');
                                            if (nameStr === 'winRate' || nameStr === 'rtp') {
                                                return [`${value.toFixed(1)}%`, nameStr === 'winRate' ? '승률' : '환급률']
                                            } else if (nameStr === 'totalBet') {
                                                return [`${value.toLocaleString()} P`, '거래량']
                                            } else if (nameStr === 'avgMultiplier') {
                                                return [`${value.toFixed(2)}x`, '평균 배율']
                                            }
                                            return [value, nameStr]
                                        }}
                                    />
                                    <Legend
                                        wrapperStyle={{ paddingTop: '20px' }}
                                        formatter={(value: string) => {
                                            const labels: Record<string, string> = {
                                                'winRate': '승률',
                                                'rtp': '환급률',
                                                'totalBet': '거래량',
                                                'avgMultiplier': '평균 배율'
                                            }
                                            return labels[value] || value
                                        }}
                                    />
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="winRate"
                                        stroke="#39ff14"
                                        strokeWidth={3}
                                        dot={{ r: 5, fill: '#39ff14' }}
                                        activeDot={{ r: 7 }}
                                        name="winRate"
                                    />
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="rtp"
                                        stroke="#00ffff"
                                        strokeWidth={3}
                                        dot={{ r: 5, fill: '#00ffff' }}
                                        activeDot={{ r: 7 }}
                                        name="rtp"
                                    />
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="totalBet"
                                        stroke="#ffd60a"
                                        strokeWidth={3}
                                        dot={{ r: 5, fill: '#ffd60a' }}
                                        activeDot={{ r: 7 }}
                                        name="totalBet"
                                    />
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="avgMultiplier"
                                        stroke="#ff00ff"
                                        strokeWidth={3}
                                        dot={{ r: 5, fill: '#ff00ff' }}
                                        activeDot={{ r: 7 }}
                                        name="avgMultiplier"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className={`arcade-font-pixel ${loading ? 'blink' : ''}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                                    {loading ? "로딩 중..." : "데이터가 없습니다."}
                                </span>
                            </div>
                        )}
                    </div>
                </ArcadeBox>

                {/* 게임별 상세 통계 (탭으로 전환) */}
                <ArcadeBox label="GAME_DETAILS" variant="secondary" style={{ marginBottom: '40px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '16px' }}>
                        카지노 게임별 상세 통계
                    </p>
                    {stats?.byGame && stats.byGame.length > 0 ? (
                        <div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                {stats.byGame.map((game: any) => (
                                    <ArcadeButton
                                        key={game.gameType}
                                        variant={activeDetailTab === game.gameType ? 'accent' : 'secondary'}
                                        size="sm"
                                        onClick={() => setDetailTab(game.gameType)}
                                    >
                                        {game.gameType.toUpperCase()}
                                    </ArcadeButton>
                                ))}
                            </div>

                            {detailGame && (
                                <div style={{ border: '2px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.45)', padding: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
                                        <h4 className="arcade-font-pixel" style={{ color: 'var(--arcade-secondary)', fontSize: '0.85rem' }}>
                                            {detailGame.gameType.toUpperCase()}
                                        </h4>
                                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                                            {detailGame.totalGames.toLocaleString()}회 플레이
                                        </span>
                                    </div>
                                    <div className="lobby-stat-grid">
                                        <div className="lobby-stat-cell">
                                            <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px', fontSize: '0.8rem' }}>승리</span>
                                            <div style={{ color: 'var(--arcade-accent)', fontWeight: 900, fontSize: '1.1rem' }}>{detailGame.wins?.toLocaleString() || 0}회</div>
                                        </div>
                                        <div className="lobby-stat-cell">
                                            <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px', fontSize: '0.8rem' }}>패배</span>
                                            <div style={{ color: '#ff2d55', fontWeight: 900, fontSize: '1.1rem' }}>{detailGame.losses?.toLocaleString() || 0}회</div>
                                        </div>
                                        <div className="lobby-stat-cell">
                                            <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px', fontSize: '0.8rem' }}>승률</span>
                                            <div style={{ color: 'var(--arcade-accent)', fontWeight: 900, fontSize: '1.1rem' }}>{detailGame.winRate?.toFixed(1) || '0.0'}%</div>
                                        </div>
                                        <div className="lobby-stat-cell">
                                            <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px', fontSize: '0.8rem' }}>환급률</span>
                                            <div style={{ color: 'var(--arcade-secondary)', fontWeight: 900, fontSize: '1.1rem' }}>{detailGame.rtp?.toFixed(1) || '0.0'}%</div>
                                        </div>
                                        <div className="lobby-stat-cell">
                                            <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px', fontSize: '0.8rem' }}>총 베팅</span>
                                            <div style={{ color: 'var(--arcade-secondary)', fontWeight: 900, fontSize: '1.1rem' }}>{detailGame.totalBet?.toLocaleString() || 0} P</div>
                                        </div>
                                        <div className="lobby-stat-cell">
                                            <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px', fontSize: '0.8rem' }}>총 지급</span>
                                            <div style={{ color: 'var(--arcade-primary)', fontWeight: 900, fontSize: '1.1rem' }}>{detailGame.totalPayout?.toLocaleString() || 0} P</div>
                                        </div>
                                        {detailGame.maxPayout > 0 && (
                                            <div className="lobby-stat-cell">
                                                <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px', fontSize: '0.8rem' }}>최대 승리</span>
                                                <div style={{ color: '#ffd60a', fontWeight: 900, fontSize: '1.1rem' }}>{detailGame.maxPayout?.toLocaleString() || 0} P</div>
                                            </div>
                                        )}
                                        {detailGame.avgMultiplier > 0 && (
                                            <div className="lobby-stat-cell">
                                                <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px', fontSize: '0.8rem' }}>평균 배율</span>
                                                <div style={{ color: 'var(--arcade-primary)', fontWeight: 900, fontSize: '1.1rem' }}>{detailGame.avgMultiplier?.toFixed(2) || '0.00'}x</div>
                                            </div>
                                        )}
                                        <div className="lobby-stat-cell">
                                            <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px', fontSize: '0.8rem' }}>순수익</span>
                                            <div style={{ color: detailGame.profit >= 0 ? 'var(--arcade-accent)' : '#ff2d55', fontWeight: 900, fontSize: '1.1rem' }}>
                                                {detailGame.profit >= 0 ? '+' : ''}{detailGame.profit?.toLocaleString() || 0} P
                                            </div>
                                        </div>
                                        {detailGame.recent24h !== undefined && (
                                            <div className="lobby-stat-cell">
                                                <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px', fontSize: '0.8rem' }}>최근 24시간</span>
                                                <div style={{ color: 'var(--arcade-secondary)', fontWeight: 900, fontSize: '1.1rem' }}>{detailGame.recent24h?.toLocaleString() || 0}회</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <span className={`arcade-font-pixel ${loading ? 'blink' : ''}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                                {loading ? "로딩 중..." : "데이터가 없습니다."}
                            </span>
                        </div>
                    )}
                </ArcadeBox>

                {/* Arcade Ranking List */}
                <ArcadeBox label="HALL_OF_FAME" variant="accent">
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '16px' }}>
                        기록 경쟁 게임 최고 득점자 (Top 3)
                    </p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '20px' }}>
                        {HOF_GAMES.map((g) => (
                            <ArcadeButton
                                key={g.key}
                                variant={hofTab === g.key ? 'accent' : 'secondary'}
                                size="sm"
                                onClick={() => setHofTab(g.key)}
                            >
                                {g.label}
                            </ArcadeButton>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <span className="arcade-font-pixel blink" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>로딩 중...</span>
                            </div>
                        ) : stats?.rankings?.[hofTab]?.length > 0 ? (
                            stats.rankings[hofTab].map((rank: any, idx: number) => (
                                <div key={idx} className="hof-row">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <span
                                            className="arcade-font-pixel"
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.7rem',
                                                border: '2px solid',
                                                borderColor: idx === 0 ? '#ffd60a' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'rgba(255,255,255,0.2)',
                                                color: idx === 0 ? '#ffd60a' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'rgba(255,255,255,0.4)',
                                            }}
                                        >
                                            {idx + 1}
                                        </span>
                                        <span style={{ color: '#fff', fontWeight: 700 }}>{rank.nickname || 'Unknown'}</span>
                                    </div>
                                    <span className="arcade-font-pixel" style={{ color: 'var(--arcade-secondary)', fontSize: '0.75rem' }}>
                                        {rank.score?.toLocaleString() || 0}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)' }}>
                                아직 기록이 없습니다. 도전을 시작하세요!
                                {stats && !stats.rankings && (
                                    <div style={{ fontSize: '0.7rem', marginTop: '8px', color: 'rgba(255,255,255,0.25)' }}>(데이터 로드 중...)</div>
                                )}
                            </div>
                        )}
                    </div>
                </ArcadeBox>
            </section>
        </div>
    )
}
