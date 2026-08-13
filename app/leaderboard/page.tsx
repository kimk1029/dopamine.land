'use client'

import { useState, useEffect } from 'react'
import { ArcadeBox, ArcadeButton } from '@/components/arcade'

interface RankingItem {
    rank: number
    name: string
    points: number // Total: Points, Game: Profit
    level?: number // Total Only
    detail?: string // Game Only (e.g. Win Rate, Profit)
}

const TABS: { id: 'total' | 'blackjack' | 'bustabit' | 'kuji'; label: string }[] = [
    { id: 'total', label: 'TOTAL' },
    { id: 'blackjack', label: 'BLACKJACK' },
    { id: 'bustabit', label: 'BUSTABIT' },
    { id: 'kuji', label: 'KUJI' },
]

const RANK_COLORS: Record<number, string> = {
    1: 'var(--arcade-accent)',
    2: 'var(--arcade-secondary)',
    3: 'var(--arcade-primary)',
}

const RANK_MEDALS: Record<number, string> = {
    1: '1ST',
    2: '2ND',
    3: '3RD',
}

export default function LeaderboardPage() {
  const [leaderboardTab, setLeaderboardTab] = useState<'total' | 'blackjack' | 'skyroads' | 'bustabit' | 'kuji'>('total')
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRankings = async (type: string) => {
    setLoading(true)
    try {
        let url = ''
        if (type === 'total') {
            url = '/api/ranking/total?limit=50'
        } else {
            // 게임별 랭킹 (순수익 기준)
            url = `/api/ranking/game?gameType=${type}&limit=50`
        }

        const res = await fetch(url)
        if (res.ok) {
            const data = await res.json()
            setRankings(data.rankings || [])
        } else {
            setRankings([])
        }
    } catch (error) {
        console.error('Failed to fetch rankings', error)
        setRankings([])
    } finally {
        setLoading(false)
    }
  }

  useEffect(() => {
    fetchRankings(leaderboardTab)
  }, [leaderboardTab])

  const renderRankCell = (rank: number) => {
    const color = RANK_COLORS[rank]
    if (color) {
        return (
            <span className="arcade-font-pixel" style={{ color, fontSize: '0.7rem' }}>
                {RANK_MEDALS[rank]}
            </span>
        )
    }
    return (
        <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 900 }}>
            {String(rank).padStart(2, '0')}
        </span>
    )
  }

  const renderLeaderboardList = () => {
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
                <div className="blink arcade-font-pixel" style={{ color: 'var(--arcade-primary)', fontSize: '1rem' }}>
                    LOADING_SCORES...
                </div>
            </div>
        )
    }

    if (rankings.length === 0) {
        return (
            <ArcadeBox label="NO_RECORDS" variant="default" style={{ textAlign: 'center', padding: '60px' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', fontWeight: 700 }}>
                    랭킹 데이터가 없습니다.
                </p>
            </ArcadeBox>
        )
    }

    if (leaderboardTab === 'total') {
        // 상위 3명
        const top3 = rankings.slice(0, 3);
        // 나머지
        const rest = rankings.slice(3);

        return (
            <div className="animate-in">
                {/* Top 3 Cards */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '16px',
                        marginBottom: '40px',
                    }}
                >
                    {top3.map((user, idx) => (
                        <ArcadeBox
                            key={idx}
                            variant={user.rank === 1 ? 'accent' : user.rank === 2 ? 'secondary' : 'primary'}
                            label={`RANK_${user.rank}`}
                            style={{ textAlign: 'center' }}
                        >
                            <div
                                className={`arcade-font-pixel ${user.rank === 1 ? 'blink' : ''}`}
                                style={{
                                    color: RANK_COLORS[user.rank] ?? '#fff',
                                    fontSize: user.rank === 1 ? '1.6rem' : '1.2rem',
                                    marginBottom: '12px',
                                }}
                            >
                                {RANK_MEDALS[user.rank] ?? `#${user.rank}`}
                            </div>
                            <div
                                className="glitch-text"
                                style={{ color: '#fff', fontWeight: 900, fontSize: '1.2rem', marginBottom: '4px' }}
                            >
                                {user.name}
                            </div>
                            <div
                                className="arcade-font-pixel"
                                style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.55rem', marginBottom: '14px' }}
                            >
                                LV.{user.level}
                            </div>
                            <div
                                className="arcade-font-pixel"
                                style={{ color: RANK_COLORS[user.rank] ?? '#fff', fontSize: '0.9rem' }}
                            >
                                {user.points.toLocaleString()}P
                            </div>
                            <div
                                className="arcade-font-pixel"
                                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.5rem', marginTop: '8px' }}
                            >
                                ACTIVITY_SCORE
                            </div>
                        </ArcadeBox>
                    ))}
                </div>

                {/* Rest List */}
                {rest.length > 0 && (
                    <table className="bulletin-board">
                        <thead>
                            <tr className="bulletin-header">
                                <th style={{ width: '90px' }}>RANK</th>
                                <th>PLAYER</th>
                                <th style={{ width: '110px' }}>LEVEL</th>
                                <th style={{ width: '160px' }}>POINTS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rest.map((user, idx) => (
                                <tr key={idx} className="bulletin-row" style={{ cursor: 'default' }}>
                                    <td>{renderRankCell(user.rank)}</td>
                                    <td className="text-left">
                                        <span className="bulletin-title">{user.name}</span>
                                    </td>
                                    <td style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                                        LV.{user.level}
                                    </td>
                                    <td style={{ color: 'var(--arcade-accent)', fontWeight: 900 }}>
                                        {user.points.toLocaleString()}P
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        );
    } else {
        // 게임별 랭킹 리스트 (순수익 기준)
        return (
            <div className="animate-in">
                <table className="bulletin-board">
                    <thead>
                        <tr className="bulletin-header">
                            <th style={{ width: '90px' }}>RANK</th>
                            <th>PLAYER</th>
                            <th style={{ width: '160px' }}>NET_PROFIT</th>
                            <th style={{ width: '130px' }}>DETAIL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rankings.map((user, idx) => (
                            <tr key={idx} className="bulletin-row" style={{ cursor: 'default' }}>
                                <td>{renderRankCell(user.rank)}</td>
                                <td className="text-left">
                                    <span
                                        className="bulletin-title"
                                        style={RANK_COLORS[user.rank] ? { color: RANK_COLORS[user.rank] } : undefined}
                                    >
                                        {user.name}
                                    </span>
                                </td>
                                <td
                                    style={{
                                        color: user.points >= 0 ? 'var(--arcade-accent)' : 'var(--arcade-primary)',
                                        fontWeight: 900,
                                    }}
                                >
                                    {user.points > 0 ? '+' : ''}{user.points.toLocaleString()}
                                </td>
                                <td style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                                    {user.detail}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
  }

  return (
    <div className="animate-in">
      <header style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div
            className="arcade-font-pixel blink"
            style={{ color: 'var(--arcade-accent)', fontSize: '0.7rem', marginBottom: '12px', letterSpacing: '2px' }}
        >
            ★ HALL_OF_FAME ★
        </div>
        <h1
            className="arcade-font-pixel glitch-text"
            style={{
                color: 'var(--arcade-secondary)',
                fontSize: '1.8rem',
                marginBottom: '12px',
                textShadow: '4px 4px 0 var(--arcade-primary)',
            }}
        >
            HIGH_SCORES
        </h1>
        <p style={{ color: '#fff', opacity: 0.8, fontWeight: 500 }}>
            활동량과 게임 실력으로 증명된 최고의 플레이어들입니다.
        </p>
      </header>

      {/* Leaderboard Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
            <ArcadeButton
                key={tab.id}
                variant={leaderboardTab === tab.id ? 'accent' : 'secondary'}
                size="sm"
                onClick={() => setLeaderboardTab(tab.id)}
            >
                {tab.label}
            </ArcadeButton>
        ))}
      </div>

      {/* Content */}
      {renderLeaderboardList()}
    </div>
  )
}
