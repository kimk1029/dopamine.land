'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { ArcadeBox } from '@/components/arcade'
import { getLevelProgress, getPointsForNextLevel } from '@/lib/points'
import PetTamagotchi from '@/components/PetTamagotchi'

const COLORS = ['#ff00ff', '#00ffff', '#39ff14', '#ffe600', '#ff4d4d'];

const TOOLTIP_STYLE = {
  backgroundColor: '#000',
  border: '2px solid var(--arcade-secondary)',
  borderRadius: 0,
  fontFamily: "'Galmuri11', sans-serif",
}

function NoData() {
  return (
    <div
      className="arcade-font-pixel"
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.35)',
        fontSize: '0.65rem',
      }}
    >
      NO_DATA
    </div>
  )
}

export default function ProfilePage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const res = await fetch('/api/user/stats', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="blink arcade-font-pixel" style={{ color: 'var(--arcade-primary)', fontSize: '1rem' }}>
        LOADING_PLAYER_DATA...
      </div>
    </div>
  )

  if (!stats) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <ArcadeBox label="ACCESS_DENIED" variant="primary" style={{ textAlign: 'center', padding: '40px 60px' }}>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem' }}>로그인이 필요합니다.</p>
      </ArcadeBox>
    </div>
  )

  const { user, gameStats, dailyStats, kujiStats, achievements } = stats

  // 레벨 계산
  const level = user.level
  const points = user.points
  const progress = getLevelProgress(points, level)
  const nextPoints = getPointsForNextLevel(level)

  // 차트 데이터 가공
  const pieData = gameStats.map((g: any) => ({
    name: g.gameType.toUpperCase(),
    value: Number(g.totalGames)
  }))

  const kujiData = Object.entries(kujiStats).map(([rank, count]) => ({
    rank, count: Number(count)
  })).sort((a, b) => a.rank.localeCompare(b.rank))

  // 일자별 수익 데이터 (누적 아님, 일별 변동량)
  const lineData = dailyStats.map((d: any) => ({
      date: d.date.substring(5), // MM-DD
      profit: d.profit
  }))

  const weeklyProfit = Number(stats.weeklySummary?.totalProfit || 0)

  return (
    <div className="animate-in">
      {/* 페이지 헤더 */}
      <header className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1
            className="arcade-font-pixel glitch-text"
            style={{ color: 'var(--arcade-secondary)', fontSize: '1.6rem', marginBottom: '12px' }}
          >
            PLAYER_CARD
          </h1>
          <p style={{ color: '#fff', opacity: 0.8, fontWeight: 500 }}>
            파일럿 라이센스 및 전적 데이터를 확인합니다.
          </p>
        </div>
      </header>

      {/* 상단 프로필 섹션 */}
      <div
        className="profile-dashboard"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '24px', marginBottom: '32px' }}
      >
        {/* 파일럿 라이센스 */}
        <ArcadeBox label="PILOT_LICENSE" variant="primary">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {/* 픽셀 아바타 프레임 */}
            <div
              className="arcade-font-pixel"
              style={{
                width: '96px',
                height: '96px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.2rem',
                color: '#000',
                background: 'linear-gradient(135deg, var(--arcade-primary), var(--arcade-secondary))',
                border: '4px solid #fff',
                boxShadow: '6px 6px 0 0 #000',
                imageRendering: 'pixelated',
                marginBottom: '16px',
              }}
            >
              {user.nickname?.[0] || 'U'}
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>
              {user.nickname || user.email.split('@')[0]}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <span
                className="arcade-font-pixel"
                style={{
                  color: 'var(--arcade-accent)',
                  border: '2px solid var(--arcade-accent)',
                  padding: '4px 10px',
                  fontSize: '0.6rem',
                  background: 'rgba(0,0,0,0.6)',
                }}
              >
                LV.{level}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem' }}>
                SINCE {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* EXP 바 */}
            <div style={{ width: '100%', background: 'rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.15)', padding: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="arcade-font-pixel" style={{ color: 'var(--arcade-secondary)', fontSize: '0.55rem' }}>EXP</span>
                <span style={{ color: 'var(--arcade-primary)', fontSize: '0.8rem', fontWeight: 700 }}>
                  {points.toLocaleString()} / {nextPoints.toLocaleString()}
                </span>
              </div>
              <div style={{ height: '14px', background: '#000', border: '2px solid var(--arcade-secondary)' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, Math.max(0, progress))}%`,
                    background: 'repeating-linear-gradient(90deg, var(--arcade-primary) 0 8px, var(--arcade-secondary) 8px 16px)',
                    imageRendering: 'pixelated',
                    transition: 'width 0.4s steps(10)',
                  }}
                />
              </div>
            </div>

            {/* 스탯 리드아웃 */}
            <div
              className="profile-stat-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', width: '100%' }}
            >
              <div style={{ background: 'rgba(0,0,0,0.55)', border: '2px solid rgba(255,255,255,0.12)', padding: '10px 6px', textAlign: 'center' }}>
                <div className="arcade-font-pixel" style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>WEEKLY_PROFIT</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: weeklyProfit >= 0 ? 'var(--arcade-accent)' : '#ff4d4d' }}>
                  {weeklyProfit > 0 ? '+' : ''}{weeklyProfit.toLocaleString()}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.55)', border: '2px solid rgba(255,255,255,0.12)', padding: '10px 6px', textAlign: 'center' }}>
                <div className="arcade-font-pixel" style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>TOTAL_PTS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--arcade-primary)' }}>{points.toLocaleString()}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.55)', border: '2px solid rgba(255,255,255,0.12)', padding: '10px 6px', textAlign: 'center' }}>
                <div className="arcade-font-pixel" style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>BADGES</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ffe600' }}>{achievements.length}</div>
              </div>
            </div>
          </div>
        </ArcadeBox>

        {/* 우측 컬럼: 펫 + 차트 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          {/* 펫 다마고치 */}
          <ArcadeBox label="COMPANION_UNIT" variant="accent" isChunky={false}>
            <PetTamagotchi />
          </ArcadeBox>

          <div
            className="signal-feed-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}
          >
            {/* 플레이 통계 (Pie) */}
            <ArcadeBox label="GAME_FREQUENCY" variant="secondary" isChunky={false}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginBottom: '8px' }}>이번 주 가장 많이 플레이한 게임</p>
              <div style={{ height: '250px', minHeight: '250px' }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="#000"
                      >
                        {pieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#fff' }} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontFamily: "'Galmuri11', sans-serif" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <NoData />
                )}
              </div>
            </ArcadeBox>

            {/* 승률 통계 (Bar) */}
            <ArcadeBox label="WIN_RATE" variant="secondary" isChunky={false}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginBottom: '8px' }}>이번 주 게임별 승률</p>
              <div style={{ height: '250px', minHeight: '250px' }}>
                {gameStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                    <BarChart data={gameStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" horizontal={false} />
                      <XAxis type="number" stroke="#666" domain={[0, 100]} unit="%" hide />
                      <YAxis dataKey="gameType" type="category" stroke="#00ffff" width={80} tickFormatter={(v) => v.toUpperCase()} fontSize={12} />
                      <RechartsTooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={TOOLTIP_STYLE}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="winRate" fill="#39ff14" radius={0} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <NoData />
                )}
              </div>
            </ArcadeBox>
          </div>
        </div>
      </div>

      {/* 포인트 그래프 */}
      <ArcadeBox label="PROFIT_LOG" variant="accent" style={{ marginBottom: '32px' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginBottom: '8px' }}>이번 주 일별 수익 히스토리</p>
        <div style={{ height: '300px', minHeight: '300px' }}>
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
                <XAxis dataKey="date" stroke="#00ffff" fontSize={12} tickLine={false} />
                <YAxis stroke="#00ffff" fontSize={12} tickLine={false} />
                <RechartsTooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => {
                    if (value === undefined || value === null || typeof value !== 'number') return ['0 P', 'Profit']
                    return [`${value > 0 ? '+' : ''}${value.toLocaleString()} P`, 'Profit']
                  }}
                />
                <Line
                  type="stepAfter"
                  dataKey="profit"
                  stroke="#39ff14"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#000', stroke: '#39ff14', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#ff00ff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <NoData />
          )}
        </div>
      </ArcadeBox>

      {/* 하단 섹션: 쿠지 내역 & 업적 */}
      <div
        className="profile-dashboard"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}
      >
        {/* 이치방쿠지 컬렉션 */}
        <ArcadeBox label="KUJI_VAULT" variant="primary">
          {kujiData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>
              아직 당첨된 경품이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
              {kujiData.map((item) => {
                const isRare = ['A', 'B', 'LAST_ONE'].includes(item.rank)
                return (
                  <div
                    key={item.rank}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '12px',
                      minWidth: '80px',
                      background: 'rgba(0,0,0,0.55)',
                      border: `2px solid ${isRare ? '#ffe600' : 'rgba(255,255,255,0.2)'}`,
                      boxShadow: isRare ? '4px 4px 0 0 rgba(255,230,0,0.35)' : '4px 4px 0 0 rgba(0,0,0,0.5)',
                    }}
                  >
                    <div
                      className="arcade-font-pixel"
                      style={{
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: item.rank === 'LAST_ONE' ? '1.1rem' : '0.9rem',
                        marginBottom: '8px',
                        color: isRare ? '#000' : '#fff',
                        background: isRare ? '#ffe600' : 'var(--arcade-surface)',
                        border: '2px solid #fff',
                        imageRendering: 'pixelated',
                      }}
                    >
                      {item.rank === 'LAST_ONE' ? '👑' : item.rank}
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--arcade-secondary)' }}>x{item.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </ArcadeBox>

        {/* 업적 */}
        <ArcadeBox label="ACHIEVEMENTS" variant="accent">
          {achievements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>
              아직 획득한 업적이 없습니다.<br />게임을 플레이하여 배지를 모아보세요!
            </div>
          ) : (
            <div
              className="quick-action-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '14px' }}
            >
              {achievements.map((ua: any) => (
                <div
                  key={ua.id}
                  className="glitch-text"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '14px 8px',
                    background: 'rgba(0,0,0,0.55)',
                    border: '2px solid rgba(57,255,20,0.35)',
                    boxShadow: '4px 4px 0 0 rgba(0,0,0,0.5)',
                    cursor: 'default',
                  }}
                >
                  <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>
                    {ua.achievement.icon || '🏆'}
                  </div>
                  <h4 style={{ fontWeight: 900, fontSize: '0.85rem', textAlign: 'center', marginBottom: '4px', color: 'var(--arcade-accent)' }}>
                    {ua.achievement.name}
                  </h4>
                  <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                    {ua.achievement.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ArcadeBox>
      </div>
    </div>
  )
}
