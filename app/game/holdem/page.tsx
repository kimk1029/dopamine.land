'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import { motion } from 'framer-motion'
import { Users, Plus, Loader2, Clock, Coins, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface HoldemRoom {
  id: string
  name: string
  maxPlayers: number
  smallBlind: number
  bigBlind: number
  status: string
  pot: number
  playerCount: number
  createdAt: string
}

export default function HoldemPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<HoldemRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchRooms = async () => {
      try {
        const res = await fetch('/api/holdem/rooms', {
          signal: abortController.signal
        })
        if (res.ok) {
          const data = await res.json()
          setRooms(data.rooms || [])
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Failed to fetch rooms', error)
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      }
    }
    
    fetchRooms()
    
    return () => {
      abortController.abort()
    }
  }, [])

  const handleCreateRoom = async () => {
    setCreating(true)
    const abortController = new AbortController()
    
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('로그인이 필요합니다.')
        setCreating(false)
        return
      }

      const res = await fetch('/api/holdem/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: `Room ${Date.now()}`,
          smallBlind: 10,
          bigBlind: 20,
          maxPlayers: 6
        }),
        signal: abortController.signal
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/game/holdem/${data.roomId}`)
      } else {
        const error = await res.json()
        alert(error.error || '방 생성 실패')
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to create room', error)
        alert('방 생성 중 오류가 발생했습니다.')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleJoinRoom = (roomId: string) => {
    router.push(`/game/holdem/${roomId}`)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0c] to-black text-slate-100 overflow-x-hidden">
      <HeaderNavigator />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">

        <section className="mb-12 text-center">
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <Users className="w-6 h-6" />
              <span className="font-bold tracking-widest text-sm">MULTIPLAYER</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white text-center tracking-tight mb-4">
              TEXAS HOLDEM
            </h1>
            <p className="text-slate-400 max-w-xl mx-auto">
              다른 플레이어들과 실시간으로 포커를 즐기세요. 방을 만들거나 참가할 수 있습니다.
            </p>
          </div>
        </section>

        {/* 방 생성 버튼 */}
        <div className="mb-8 flex justify-center">
          <Button
            onClick={handleCreateRoom}
            disabled={true}
            size="lg"
            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold px-8 py-6 rounded-full opacity-50 cursor-not-allowed"
          >
            <Wrench className="mr-2 h-5 w-5" />
            점검 중 (공사중)
          </Button>
        </div>

        {/* 방 리스트 */}
        <section>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">현재 활성화된 방이 없습니다.</p>
              <p className="text-sm mt-2">새 방을 만들어 시작하세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                  className="cursor-pointer"
                  onClick={() => handleJoinRoom(room.id)}
                >
                  <Card className="bg-[#131316]/80 backdrop-blur-md border-white/10 hover:border-red-500/50 transition-all h-full">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-white text-xl">{room.name}</CardTitle>
                        <div className={`px-2 py-1 rounded text-xs font-bold ${room.status === 'playing'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                            : 'bg-slate-500/20 text-slate-400 border border-slate-500/50'
                          }`}>
                          {room.status === 'playing' ? '게임 중' : '대기 중'}
                        </div>
                      </div>
                      <CardDescription className="text-slate-400">
                        {room.playerCount} / {room.maxPlayers} 명
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 flex items-center gap-2">
                            <Coins className="w-4 h-4" />
                            블라인드
                          </span>
                          <span className="text-white font-bold">
                            {room.smallBlind} / {room.bigBlind}
                          </span>
                        </div>
                        {room.status === 'playing' && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500 flex items-center gap-2">
                              <Coins className="w-4 h-4" />
                              포트
                            </span>
                            <span className="text-emerald-400 font-bold">
                              {room.pot.toLocaleString()} P
                            </span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-white/5">
                          <Button
                            className="w-full bg-red-600 hover:bg-red-500 text-white"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleJoinRoom(room.id)
                            }}
                          >
                            입장하기
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  )
}

