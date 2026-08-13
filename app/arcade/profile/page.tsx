'use client'

import { useEffect, useState } from 'react'
import HeaderNavigator from '@/components/HeaderNavigator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { Trophy, Medal, Target, TrendingUp, Gift, Gamepad2, User } from 'lucide-react'
import { getLevelProgress, getPointsForNextLevel } from '@/lib/points'
import PetTamagotchi from '@/components/PetTamagotchi'

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Loading Profile...
    </div>
  )

  if (!stats) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        로그인이 필요합니다.
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

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0c] to-black text-slate-100 overflow-x-hidden">
      <HeaderNavigator />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        
        {/* 상단 프로필 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <Card className="lg:col-span-1 bg-[#131316] border-white/10 text-white overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-transparent pointer-events-none" />
                <CardContent className="p-8 flex flex-col items-center text-center relative z-10">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 flex items-center justify-center text-4xl font-bold mb-4 shadow-xl border-4 border-[#131316]">
                        {user.nickname?.[0] || 'U'}
                    </div>
                    <h2 className="text-2xl font-bold mb-1">{user.nickname || user.email.split('@')[0]}</h2>
                    <div className="flex items-center gap-2 mb-6">
                        <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/30">
                            LV. {level}
                        </Badge>
                        <span className="text-slate-400 text-sm">Member since {new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="w-full bg-black/40 rounded-xl p-4 border border-white/5 mb-6">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400 font-bold">EXP Progress</span>
                            <span className="text-violet-400 font-mono">{points.toLocaleString()} / {nextPoints.toLocaleString()}</span>
                        </div>
                        <Progress value={progress} className="h-2 bg-white/10" indicatorClassName="bg-gradient-to-r from-violet-600 to-indigo-600" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                        <div className="bg-white/5 rounded-lg p-3 text-center">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Weekly Profit</div>
                            <div className={`text-xl font-bold ${(stats.weeklySummary?.totalProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {(stats.weeklySummary?.totalProfit || 0) > 0 ? '+' : ''}
                                {Number(stats.weeklySummary?.totalProfit || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 text-center">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Total Points</div>
                            <div className="text-xl font-bold text-violet-400">{points.toLocaleString()}</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 text-center">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Achievements</div>
                            <div className="text-xl font-bold text-yellow-400">{achievements.length}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 펫 다마고치 */}
                <div className="md:col-span-2">
                    <Card className="bg-[#131316] border-white/10 text-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-2xl">🐾</span>
                                My Pet
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PetTamagotchi />
                        </CardContent>
                    </Card>
                </div>
                {/* 플레이 통계 (Pie) */}
                <Card className="bg-[#131316] border-white/10 text-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Gamepad2 className="w-5 h-5 text-blue-400" />
                            Most Played Games (This Week)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] min-h-[250px]">
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
                                    >
                                        {pieData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500">No data</div>
                        )}
                    </CardContent>
                </Card>

                {/* 승률 통계 (Bar) */}
                <Card className="bg-[#131316] border-white/10 text-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Target className="w-5 h-5 text-red-400" />
                            Win Rate by Game (This Week)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] min-h-[250px]">
                        {gameStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                                <BarChart data={gameStats} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                    <XAxis type="number" stroke="#666" domain={[0, 100]} unit="%" hide />
                                    <YAxis dataKey="gameType" type="category" stroke="#999" width={80} tickFormatter={(v) => v.toUpperCase()} />
                                    <RechartsTooltip 
                                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="winRate" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20}>
                                        {/* <LabelList dataKey="winRate" position="right" fill="#fff" formatter={(v) => `${v}%`} /> */}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500">No data</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>

        {/* 포인트 그래프 */}
        <Card className="bg-[#131316] border-white/10 text-white mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Daily Profit History (This Week)
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] min-h-[300px]">
                {lineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                        <LineChart data={lineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} />
                            <YAxis stroke="#666" fontSize={12} tickLine={false} />
                            <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: any) => {
                                    if (value === undefined || value === null || typeof value !== 'number') return ['0 P', 'Profit']
                                    return [`${value > 0 ? '+' : ''}${value.toLocaleString()} P`, 'Profit']
                                }}
                            />
                            <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={{r:4, fill:'#131316', stroke:'#10b981'}} activeDot={{r:6}} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">No data</div>
                )}
            </CardContent>
        </Card>

        {/* 하단 섹션: 쿠지 내역 & 업적 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 이치방쿠지 컬렉션 */}
            <Card className="bg-[#131316] border-white/10 text-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-pink-400" />
                        Ichiban Kuji Collection
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {kujiData.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            아직 당첨된 경품이 없습니다.
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {kujiData.map((item) => (
                                <div key={item.rank} className="flex flex-col items-center p-3 bg-white/5 rounded-xl border border-white/5 min-w-[80px]">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mb-2 shadow-lg
                                        ${['A', 'B', 'LAST_ONE'].includes(item.rank) ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black' : 'bg-slate-700 text-white'}
                                    `}>
                                        {item.rank === 'LAST_ONE' ? '👑' : item.rank}
                                    </div>
                                    <span className="text-sm font-bold text-slate-300">x{item.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 업적 */}
            <Card className="bg-[#131316] border-white/10 text-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Medal className="w-5 h-5 text-yellow-400" />
                        Achievements
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {achievements.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            아직 획득한 업적이 없습니다.<br/>게임을 플레이하여 배지를 모아보세요!
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {achievements.map((ua: any) => (
                                <div key={ua.id} className="flex flex-col items-center p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group">
                                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                                        {ua.achievement.icon || '🏆'}
                                    </div>
                                    <h4 className="font-bold text-sm text-center mb-1 text-slate-200">{ua.achievement.name}</h4>
                                    <p className="text-[10px] text-slate-500 text-center line-clamp-2">{ua.achievement.description}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>

      </main>
    </div>
  )
}
