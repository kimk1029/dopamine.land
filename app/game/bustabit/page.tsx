'use client'

import { useCallback, useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import { BustabitGame } from './BustabitGame'
import GameContainer from '@/components/GameContainer'

// 픽셀 아케이드 팔레트 (styles/arcade 디자인 패밀리)
const C = {
  bg: '#0a0a1a',
  panel: '#11112a',
  border: '#333355',
  magenta: '#ff00ff',
  cyan: '#00ffff',
  lime: '#39ff14',
  yellow: '#ffe600',
  dim: '#8888aa',
}

const FONT_KR = "'Galmuri11', monospace"

interface GameHistoryItem {
  id: number | string
  betAmount: number
  payout: number
  profit: number
  result: string
  multiplier: number
  createdAt: string
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function BustabitGameComponent() {
  const searchParams = useSearchParams()
  const betAmount = parseInt(searchParams.get('bet') || '0')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<BustabitGame | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [isDemo, setIsDemo] = useState(false)

  // 개인 베팅 히스토리 (GET /api/game/history)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<GameHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    setIsDemo(!localStorage.getItem('token'))
  }, [])

  const fetchHistory = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      setHistoryLoading(true)
      const res = await fetch('/api/game/history?gameType=bustabit&limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setHistory(await res.json())
      }
    } catch (e) {
      console.error('History fetch error:', e)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // 오버레이를 열 때마다 갱신
  useEffect(() => {
    if (showHistory) fetchHistory()
  }, [showHistory, fetchHistory])

  // 캔버스 크기 계산 (GameContainer 여백: pt-20 상당의 헤더 영역 + 좌우/하단 패딩 고려)
  const getCanvasSize = () => {
    const isMobile = window.innerWidth < 768

    const totalHeaderHeight = 80
    const totalSidePadding = isMobile ? 0 : 100
    const totalBottomPadding = 30

    const width = Math.max(320, window.innerWidth - totalSidePadding)
    const height = Math.max(480, window.innerHeight - totalHeaderHeight - totalBottomPadding)

    return { width, height }
  }

  useEffect(() => {
    if (!canvasRef.current) return

    const { width, height } = getCanvasSize()

    const canvas = canvasRef.current
    const game = new BustabitGame(canvas, betAmount, width, height)

    game.setMessageCallback((msg: string) => {
      setMessage(msg)
      setTimeout(() => setMessage(''), 3000)
    })

    game.setLoadingProgressCallback((progress: number) => {
      setLoadingProgress(progress)
      if (progress >= 100) {
        setTimeout(() => setLoading(false), 500)
      }
    })

    // 라운드 정산 후 개인 히스토리 갱신
    game.setRoundEndCallback(() => {
      fetchHistory()
    })

    gameRef.current = game
    game.start()

    handleResize()

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy()
        gameRef.current = null
      }
    }
  }, [betAmount, fetchHistory])

  const handleResize = () => {
    if (!gameRef.current) return
    const { width, height } = getCanvasSize()
    gameRef.current.resize(width, height)
  }

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', () => setTimeout(handleResize, 100))
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return (
    <div className="h-screen overflow-hidden" style={{ background: C.bg }}>
      <HeaderNavigator />
      <GameContainer className="relative" isDemo={isDemo}>
        {loading && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-20"
            style={{ background: C.bg }}
          >
            <div style={{ width: 'min(420px, 85vw)', border: `4px solid ${C.cyan}`, background: C.panel, padding: '28px 24px' }}>
              <div
                className="arcade-font-pixel blink"
                style={{ color: C.magenta, fontSize: '0.85rem', textAlign: 'center', marginBottom: '20px' }}
              >
                NOW_LOADING...
              </div>
              <div style={{ border: `3px solid ${C.border}`, height: '20px', background: C.bg }}>
                <div style={{ width: `${loadingProgress}%`, height: '100%', background: C.magenta, transition: 'width 0.3s steps(5)' }} />
              </div>
              <div
                className="arcade-font-pixel"
                style={{ display: 'flex', justifyContent: 'space-between', color: C.dim, fontSize: '0.5rem', marginTop: '10px' }}
              >
                <span>INITIALIZING</span>
                <span>{loadingProgress}%</span>
              </div>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
          style={{
            display: 'block',
            touchAction: 'none',
            imageRendering: 'pixelated',
          }}
        />

        {message && (
          <div
            className="absolute top-10 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap"
            style={{
              background: C.bg,
              border: `4px solid ${C.yellow}`,
              color: C.yellow,
              padding: '12px 24px',
              fontFamily: FONT_KR,
              fontWeight: 700,
              fontSize: '1rem',
            }}
          >
            {message}
          </div>
        )}

        {/* HISTORY 토글 버튼 (고정 코너, 게임플레이 방해 금지) */}
        <button
          className="arcade-font-pixel"
          onClick={() => setShowHistory((v) => !v)}
          style={{
            position: 'fixed',
            right: '14px',
            bottom: '14px',
            zIndex: 40,
            background: showHistory ? C.cyan : C.bg,
            color: showHistory ? '#000' : C.cyan,
            border: `3px solid ${C.cyan}`,
            padding: '10px 14px',
            fontSize: '0.6rem',
            lineHeight: 1,
          }}
        >
          HISTORY
        </button>

        {showHistory && (
          <div
            style={{
              position: 'fixed',
              right: '14px',
              bottom: '60px',
              zIndex: 39,
              width: 'min(400px, calc(100vw - 28px))',
              maxHeight: '60vh',
              overflowY: 'auto',
              background: C.bg,
              border: `4px solid ${C.magenta}`,
            }}
          >
            <div
              className="arcade-font-pixel"
              style={{
                position: 'sticky',
                top: 0,
                background: C.magenta,
                color: '#000',
                padding: '10px 12px',
                fontSize: '0.6rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>BET_HISTORY</span>
              <span style={{ cursor: 'pointer' }} onClick={() => setShowHistory(false)}>X</span>
            </div>

            {isDemo ? (
              <div style={{ padding: '24px 16px', color: C.dim, fontFamily: FONT_KR, textAlign: 'center' }}>
                로그인하면 히스토리가 기록됩니다
              </div>
            ) : historyLoading && history.length === 0 ? (
              <div className="arcade-font-pixel blink" style={{ padding: '24px 16px', color: C.cyan, fontSize: '0.55rem', textAlign: 'center' }}>
                LOADING...
              </div>
            ) : history.length === 0 ? (
              <div className="arcade-font-pixel" style={{ padding: '24px 16px', color: C.dim, fontSize: '0.55rem', textAlign: 'center' }}>
                NO_RECORDS
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="arcade-font-pixel" style={{ color: C.cyan, fontSize: '0.45rem' }}>
                    <th style={{ padding: '8px 6px', textAlign: 'left' }}>TIME</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>BET</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>MULT</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>PAYOUT</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>PROFIT</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>RESULT</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => {
                    const win = h.profit >= 0
                    return (
                      <tr
                        key={h.id}
                        style={{
                          fontFamily: FONT_KR,
                          fontSize: '0.75rem',
                          color: '#fff',
                          borderTop: `1px solid ${C.border}`,
                        }}
                      >
                        <td style={{ padding: '6px', color: C.dim }}>{formatTime(h.createdAt)}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{h.betAmount.toLocaleString()}</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: C.cyan }}>
                          {h.multiplier > 0 ? `${h.multiplier.toFixed(2)}x` : '-'}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{h.payout.toLocaleString()}</td>
                        <td style={{ padding: '6px', textAlign: 'right', color: win ? C.lime : C.magenta }}>
                          {win ? '+' : ''}{h.profit.toLocaleString()}
                        </td>
                        <td
                          className="arcade-font-pixel"
                          style={{ padding: '6px', textAlign: 'center', fontSize: '0.45rem', color: win ? C.lime : C.magenta }}
                        >
                          {h.result}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </GameContainer>
    </div>
  )
}

export default function BustabitGamePage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center h-screen arcade-font-pixel blink"
          style={{ background: '#0a0a1a', color: '#00ffff', fontSize: '0.8rem' }}
        >
          NOW_LOADING...
        </div>
      }
    >
      <BustabitGameComponent />
    </Suspense>
  )
}
