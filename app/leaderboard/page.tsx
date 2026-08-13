'use client'

import { useState, useEffect } from 'react'
import HeaderNavigator from '@/components/HeaderNavigator'
import { motion } from 'framer-motion'
import { Trophy, Crown, Zap, Rocket, BarChart3, Search, Loader2 } from 'lucide-react'
import Billboard from '@/components/Billboard'

interface RankingItem {
    rank: number
    name: string
    points: number // Total: Points, Game: Profit
    level?: number // Total Only
    detail?: string // Game Only (e.g. Win Rate, Profit)
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

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" fill="currentColor" />
    if (rank === 2) return <Trophy className="w-5 h-5 text-slate-300" />
    if (rank === 3) return <Trophy className="w-5 h-5 text-amber-600" />
    return <span className="w-6 text-center font-bold text-slate-500">#{rank}</span>
  }

  const renderLeaderboardList = () => {
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        )
    }

    if (rankings.length === 0) {
        return (
            <div className="flex justify-center items-center h-64 text-slate-500">
                랭킹 데이터가 없습니다.
            </div>
        )
    }

    if (leaderboardTab === 'total') {
        // 상위 3명
        const top3 = rankings.slice(0, 3);
        // 나머지
        const rest = rankings.slice(3);
        
        return (
            <div>
                {/* Top 3 Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {top3.map((user, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`relative ${user.rank === 1 ? 'md:-mt-6 z-10' : ''}`}
                        >
                            <div className={`bg-[#1a1a20] border ${user.rank === 1 ? 'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]' : 'border-white/10'} rounded-3xl p-6 flex flex-col items-center relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300 h-full justify-center`}>
                                {user.rank === 1 && <div className="absolute inset-0 bg-yellow-500/5 pointer-events-none" />}
                                
                                <div className="relative mb-4">
                                    <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full ${user.rank === 1 ? 'bg-yellow-400/20 ring-yellow-400' : user.rank === 2 ? 'bg-slate-300/20 ring-slate-300' : 'bg-amber-700/20 ring-amber-700'} flex items-center justify-center mb-2 ring-2 ring-offset-4 ring-offset-[#1a1a20]`}>
                                        <span className={`text-3xl md:text-4xl font-black ${user.rank === 1 ? 'text-yellow-400' : user.rank === 2 ? 'text-slate-300' : 'text-amber-700'}`}>
                                            {user.rank}
                                        </span>
                                    </div>
                                    {user.rank === 1 && (
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce">
                                            <Crown className="w-8 h-8 md:w-10 md:h-10 text-yellow-400 fill-yellow-400" />
                                        </div>
                                    )}
                                </div>
                                
                                <h3 className="text-lg md:text-xl font-bold text-white mb-1">{user.name}</h3>
                                <div className="text-xs font-bold text-slate-500 uppercase mb-3">Level {user.level}</div>
                                <div className="text-2xl font-black text-emerald-400">
                                    {user.points.toLocaleString()} P
                                </div>
                                <div className="text-[10px] text-slate-600 mt-2 font-mono">
                                    Activity Score
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Rest List */}
                <div className="bg-[#1a1a20]/80 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <div className="col-span-2 text-center">Rank</div>
                        <div className="col-span-6">Player</div>
                        <div className="col-span-4 text-right">Points</div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {rest.map((user, idx) => (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + (idx * 0.05) }}
                                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors"
                            >
                                <div className="col-span-2 flex justify-center text-slate-400 font-bold">
                                    {user.rank}
                                </div>
                                <div className="col-span-6">
                                    <div className="font-bold text-slate-200">{user.name}</div>
                                    <div className="text-xs text-slate-500">Level {user.level}</div>
                                </div>
                                <div className="col-span-4 text-right font-bold text-emerald-400">
                                    {user.points.toLocaleString()}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        );
    } else {
        // 게임별 랭킹 리스트 (순수익 기준)
        return (
            <div className="bg-[#1a1a20]/80 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden">
                 <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-2 text-center">Rank</div>
                    <div className="col-span-5">Player</div>
                    <div className="col-span-3 text-right">Net Profit</div>
                    <div className="col-span-2 text-right">Detail</div>
                </div>
                <div className="divide-y divide-white/5">
                    {rankings.map((user, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors"
                        >
                            <div className="col-span-2 flex justify-center">
                                {getRankIcon(user.rank)}
                            </div>
                            <div className="col-span-5 font-bold text-slate-200">
                                {user.name}
                            </div>
                            <div className={`col-span-3 text-right font-bold ${user.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {user.points > 0 ? '+' : ''}{user.points.toLocaleString()}
                            </div>
                            <div className="col-span-2 text-right text-xs font-medium text-slate-400">
                                {user.detail}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0c] to-black text-slate-100 overflow-x-hidden selection:bg-purple-500/30">
      <HeaderNavigator />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        
        <section className="mb-12 text-center">
            <div className="flex flex-col items-center mb-6">
                <div className="flex items-center gap-2 text-yellow-400 mb-2 animate-pulse">
                    <Crown className="w-6 h-6" fill="currentColor" />
                    <span className="font-bold tracking-widest text-sm">HALL OF FAME</span>
                    <Crown className="w-6 h-6" fill="currentColor" />
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-white text-center tracking-tight mb-4">
                    LEADERBOARD
                </h1>
                <p className="text-slate-400 max-w-xl mx-auto">
                    활동량과 게임 실력으로 증명된 최고의 플레이어들입니다.
                </p>
            </div>
        </section>

        {/* Leaderboard Tabs */}
        <div className="flex justify-center mb-10">
            <div className="flex p-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden overflow-x-auto max-w-full">
                {[
                    { id: 'total', label: '종합 활동 랭킹', icon: Trophy },
                    { id: 'blackjack', label: 'Blackjack', icon: Zap },
                    { id: 'bustabit', label: 'Bustabit', icon: BarChart3 },
                    { id: 'kuji', label: 'Kuji', icon: Rocket },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setLeaderboardTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                            leaderboardTab === tab.id 
                            ? 'bg-white/10 text-white shadow-lg border border-white/10' 
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 ${leaderboardTab === tab.id ? 'text-purple-400' : ''}`} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto">
            {renderLeaderboardList()}
        </div>

      </main>
    </div>
  )
}
