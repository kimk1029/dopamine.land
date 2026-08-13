'use client'

import { useCallback, useEffect, useRef, Suspense, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import { BlackjackGame } from './BlackjackGame'
import { GameState } from '../types'

// 아케이드 팔레트
const ARCADE = {
  bg: '#0a0a1a',
  surface: '#1a1a2e',
  magenta: '#ff00ff',
  cyan: '#00ffff',
  lime: '#39ff14',
  yellow: '#ffe600',
  lose: '#ff3366',
  gray: '#9ca3af',
}

const FONT_KR = "'Galmuri11', monospace"

interface HistoryRow {
  id: number | string
  gameType: string
  betAmount: number
  payout: number
  profit: number
  result: string
  multiplier: number
  createdAt: string
}

function resultColor(result: string): string {
  const r = (result || '').toUpperCase()
  if (r === 'WIN' || r === 'BLACKJACK') return ARCADE.lime
  if (r === 'LOSE') return ARCADE.lose
  return ARCADE.gray
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const thStyle: CSSProperties = {
  padding: '6px 4px',
  textAlign: 'center',
  borderBottom: `2px solid ${ARCADE.surface}`,
  whiteSpace: 'nowrap',
}

const tdStyle: CSSProperties = {
  padding: '6px 4px',
  whiteSpace: 'nowrap',
}

function BlackjackGameComponent() {
  const searchParams = useSearchParams()
  const betAmount = parseInt(searchParams.get('bet') || '0')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<BlackjackGame | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [isDemo, setIsDemo] = useState(false)

  // 히스토리 패널 상태
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyTick, setHistoryTick] = useState(0)

  useEffect(() => {
    setIsDemo(!localStorage.getItem('token'))
  }, [])

  const fetchHistory = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      setHistoryLoading(true)
      const res = await fetch('/api/game/history?gameType=blackjack&limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setHistory(data)
      }
    } catch {
      // 네트워크 오류는 조용히 무시 (기존 목록 유지)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // 패널이 열릴 때 + 라운드 정산 후(historyTick 증가) 갱신
  useEffect(() => {
    if (historyOpen) fetchHistory()
  }, [historyOpen, historyTick, fetchHistory])

  // [수정] 캔버스 크기 계산 (공통 로직)
  const getCanvasSize = () => {
    const isMobile = window.innerWidth < 768
    const totalHeaderHeight = 80
    // Mobile: 0 padding, Desktop: 100 padding (50*2)
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
    const game = new BlackjackGame(canvas, betAmount, width, height)

    game.setStateChangeCallback((state: GameState) => {
      // 라운드 종료 → SHUFFLE 진입 시 서버 히스토리 갱신 트리거
      if (state === GameState.SHUFFLE) {
        setHistoryTick((t) => t + 1)
      }
    })

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

    gameRef.current = game
    game.start()

    handleResize()

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy()
        gameRef.current = null
      }
    }
  }, [betAmount])

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
    <div className="h-screen overflow-hidden" style={{ backgroundColor: ARCADE.bg }}>
      <HeaderNavigator />

      {/* 아케이드 게임 프레임 */}
      <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: ARCADE.bg }}>
        <div className="flex-1 flex flex-col pt-[30px] px-0 md:px-[50px] pb-[30px] w-full h-full overflow-hidden relative">
          {/* 데모 모드 배지 (픽셀) */}
          {isDemo && (
            <div className="absolute top-[30px] left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <div
                className="arcade-font-pixel blink"
                style={{
                  backgroundColor: '#000',
                  color: ARCADE.yellow,
                  border: `4px solid ${ARCADE.yellow}`,
                  boxShadow: '4px 4px 0 #000',
                  padding: '8px 16px',
                  fontSize: '0.7rem',
                  letterSpacing: '2px',
                }}
              >
                DEMO_MODE
              </div>
            </div>
          )}

          <div
            className="flex-1 relative w-full h-full overflow-hidden flex items-center justify-center"
            style={{ border: `4px solid ${ARCADE.surface}`, backgroundColor: ARCADE.bg }}
          >
            {/* NOW_LOADING 오버레이 (픽셀) */}
            {loading && (
              <div
                className="absolute inset-0 z-20 flex flex-col items-center justify-center"
                style={{ backgroundColor: ARCADE.bg }}
              >
                <div
                  style={{
                    width: 'min(90%, 420px)',
                    backgroundColor: ARCADE.surface,
                    border: `4px solid ${ARCADE.magenta}`,
                    boxShadow: '8px 8px 0 #000',
                    padding: '32px',
                  }}
                >
                  <div
                    className="arcade-font-pixel blink text-center"
                    style={{ color: ARCADE.cyan, fontSize: '0.9rem', marginBottom: '20px' }}
                  >
                    NOW_LOADING...
                  </div>
                  {/* 세그먼트 픽셀 게이지 */}
                  <div
                    style={{
                      border: '4px solid #fff',
                      backgroundColor: '#000',
                      padding: '4px',
                      display: 'flex',
                      gap: '4px',
                      height: '32px',
                    }}
                  >
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          backgroundColor: loadingProgress >= (i + 1) * 5 ? ARCADE.lime : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                  <div
                    className="arcade-font-pixel"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: '#fff',
                      fontSize: '0.55rem',
                      marginTop: '12px',
                    }}
                  >
                    <span style={{ color: ARCADE.magenta }}>SHUFFLING_CARDS</span>
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

            {/* 메시지 토스트 (픽셀) */}
            {message && (
              <div
                className="absolute top-10 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap"
                style={{
                  backgroundColor: ARCADE.bg,
                  border: `4px solid ${ARCADE.cyan}`,
                  boxShadow: '6px 6px 0 #000',
                  color: '#fff',
                  padding: '12px 24px',
                  fontFamily: FONT_KR,
                  fontSize: '1.05rem',
                  fontWeight: 700,
                }}
              >
                {message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HISTORY 토글 버튼 (고정, 게임플레이 비간섭 코너) */}
      <button
        type="button"
        className="arcade-font-pixel"
        onClick={() => setHistoryOpen((o) => !o)}
        style={{
          position: 'fixed',
          top: '90px',
          right: '10px',
          zIndex: 50,
          backgroundColor: historyOpen ? ARCADE.lime : '#000',
          color: historyOpen ? '#000' : ARCADE.lime,
          border: `3px solid ${ARCADE.lime}`,
          boxShadow: '4px 4px 0 #000',
          padding: '10px 14px',
          fontSize: '0.6rem',
          letterSpacing: '1px',
        }}
      >
        HISTORY
      </button>

      {/* HISTORY 패널 (픽셀 오버레이) */}
      {historyOpen && (
        <div
          style={{
            position: 'fixed',
            top: '140px',
            right: '10px',
            zIndex: 49,
            width: 'min(380px, calc(100vw - 20px))',
            maxHeight: 'calc(100vh - 170px)',
            overflowY: 'auto',
            backgroundColor: ARCADE.bg,
            border: `4px solid ${ARCADE.cyan}`,
            boxShadow: '8px 8px 0 #000',
            padding: '16px',
          }}
        >
          <div
            className="arcade-font-pixel"
            style={{
              color: ARCADE.cyan,
              fontSize: '0.65rem',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: `2px solid ${ARCADE.surface}`,
            }}
          >
            HISTORY_LOG // BLACKJACK
          </div>

          {isDemo ? (
            <div
              style={{
                color: ARCADE.gray,
                fontFamily: FONT_KR,
                fontSize: '0.9rem',
                padding: '24px 0',
                textAlign: 'center',
              }}
            >
              로그인하면 히스토리가 기록됩니다
            </div>
          ) : historyLoading && history.length === 0 ? (
            <div
              className="arcade-font-pixel blink"
              style={{ color: ARCADE.magenta, fontSize: '0.55rem', padding: '24px 0', textAlign: 'center' }}
            >
              LOADING...
            </div>
          ) : history.length === 0 ? (
            <div
              style={{
                color: ARCADE.gray,
                fontFamily: FONT_KR,
                fontSize: '0.9rem',
                padding: '24px 0',
                textAlign: 'center',
              }}
            >
              아직 게임 기록이 없습니다
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT_KR, fontSize: '0.8rem' }}>
              <thead>
                <tr className="arcade-font-pixel" style={{ color: ARCADE.magenta, fontSize: '0.5rem' }}>
                  <th style={thStyle}>TIME</th>
                  <th style={thStyle}>BET</th>
                  <th style={thStyle}>RESULT</th>
                  <th style={thStyle}>PAYOUT</th>
                  <th style={thStyle}>PROFIT</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${ARCADE.surface}` }}>
                    <td style={{ ...tdStyle, color: ARCADE.gray, textAlign: 'center' }}>
                      {formatTime(row.createdAt)}
                    </td>
                    <td style={{ ...tdStyle, color: ARCADE.yellow, textAlign: 'right' }}>
                      {Math.floor(row.betAmount).toLocaleString()}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: resultColor(row.result),
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    >
                      {(row.result || '').toUpperCase()}
                    </td>
                    <td style={{ ...tdStyle, color: '#fff', textAlign: 'right' }}>
                      {Math.floor(row.payout).toLocaleString()}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: row.profit >= 0 ? ARCADE.lime : ARCADE.lose,
                        textAlign: 'right',
                      }}
                    >
                      {row.profit >= 0 ? '+' : ''}
                      {Math.floor(row.profit).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export default function BlackjackGamePage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center h-screen"
          style={{ backgroundColor: ARCADE.bg }}
        >
          <span className="arcade-font-pixel blink" style={{ color: ARCADE.magenta, fontSize: '0.9rem' }}>
            NOW_LOADING...
          </span>
        </div>
      }
    >
      <BlackjackGameComponent />
    </Suspense>
  )
}
