'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import SkyRoadsLeaderboard from '@/components/game/SkyRoadsLeaderboard'
import { SkyRoadsGame, SCREEN_W, SCREEN_H, type HudState } from './SkyRoadsGame'

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

const EMPTY_HUD: HudState = {
  score: 0, distance: 0, planet: 'RED HEAT', planetIndex: 0, gravity: 500,
  fuel: 1, oxygen: 1, speed: 0, jumpMaster: false,
  state: 'ready', deathReason: '', paused: false,
}

export default function SkyRoadsPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<SkyRoadsGame | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [hud, setHud] = useState<HudState>(EMPTY_HUD)
  const [best, setBest] = useState(0)
  const [isDemo, setIsDemo] = useState(false)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    setIsDemo(!localStorage.getItem('token'))
    const saved = localStorage.getItem('skyroads_highscore')
    if (saved) setBest(parseInt(saved) || 0)
    return () => abortRef.current?.abort()
  }, [])

  const handleGameOver = useCallback(async (score: number) => {
    const finalScore = Math.floor(score)
    setBest((prev) => {
      if (finalScore <= prev) return prev
      localStorage.setItem('skyroads_highscore', String(finalScore))
      return finalScore
    })

    const token = localStorage.getItem('token')
    if (!token) return

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    try {
      await fetch('/api/game/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gameType: 'skyroads', score: finalScore }),
        signal: abortRef.current.signal,
      })
    } catch (error) {
      if ((error as Error).name !== 'AbortError') console.error('Score save failed', error)
    } finally {
      abortRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return
    const game = new SkyRoadsGame(canvasRef.current, {
      onHud: setHud,
      onGameOver: (score) => { void handleGameOver(score) },
    })
    gameRef.current = game
    game.start()
    return () => { game.destroy(); gameRef.current = null }
  }, [handleGameOver])

  const toggleMute = () => {
    setMuted((m) => { gameRef.current?.setMuted(!m); return !m })
  }

  const restart = () => gameRef.current?.restart()

  return (
    <div
      className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-4 pb-6 pt-16"
      style={{ background: C.bg, color: '#fff', fontFamily: FONT_KR }}
    >
      {/* 헤더 — 뒤로가기(LOBBY)는 ArcadeShell 이 고정으로 깔아준다 */}
      <div className="z-10 flex w-full max-w-[1000px] items-center gap-4">
        <h1 className="arcade-font-pixel flex-1 text-center text-lg tracking-widest md:text-2xl" style={{ color: C.cyan, textShadow: `0 0 10px ${C.cyan}55` }}>
          SKYROADS
        </h1>

        <button
          onClick={toggleMute}
          className="flex h-10 w-10 items-center justify-center border-2 transition-colors"
          style={{ borderColor: C.border, background: C.panel }}
          aria-label={muted ? '소리 켜기' : '소리 끄기'}
        >
          {muted ? <VolumeX className="h-5 w-5" style={{ color: C.dim }} /> : <Volume2 className="h-5 w-5" style={{ color: C.lime }} />}
        </button>
      </div>

      <p className="mt-1 text-[11px] tracking-wider" style={{ color: C.dim }}>
        1993 BLUEMOON SOFTWARE · 원작 물리 그대로 복각
      </p>

      {/* 상단 스탯 바 */}
      <div className="mt-4 grid w-full max-w-[800px] grid-cols-4 gap-2">
        <Stat label="행성" value={hud.planet} accent={C.magenta} />
        <Stat label="거리" value={`${hud.distance} KM`} accent={C.cyan} />
        <Stat label="점수" value={hud.score.toLocaleString()} accent={C.yellow} />
        <Stat label="최고" value={best.toLocaleString()} accent={C.lime} />
      </div>

      {/* 게임 화면 — 320x200 을 4:3 으로 확대 (원작 VGA 화면비) */}
      <div
        className="relative mt-3 w-full max-w-[800px] border-4"
        style={{ borderColor: C.border, background: '#000', aspectRatio: '4 / 3' }}
      >
        <canvas
          ref={canvasRef}
          width={SCREEN_W}
          height={SCREEN_H}
          className="block h-full w-full"
          style={{ imageRendering: 'pixelated' }}
        />

      </div>

      {hud.state === 'dead' && (
        <button
          onClick={restart}
          className="mt-3 border-2 px-6 py-2 text-xs tracking-widest transition-colors"
          style={{ borderColor: C.magenta, background: C.panel, color: C.magenta }}
        >
          RETRY (R)
        </button>
      )}

      {/* 조작법 */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] tracking-wider" style={{ color: C.dim }}>
        <Key k="↑" desc="가속" />
        <Key k="↓" desc="감속" />
        <Key k="← →" desc="조향" />
        <Key k="SPACE" desc="점프" />
        <Key k="P" desc="일시정지" />
        <Key k="R" desc="재시작" />
      </div>

      <p className="mt-3 max-w-[700px] text-center text-[11px] leading-relaxed" style={{ color: C.dim }}>
        속도를 올려야 틈을 넘을 수 있지만 연료는 <b style={{ color: C.yellow }}>주행거리</b>에,
        산소는 <b style={{ color: C.cyan }}>시간</b>에 비례해 줄어든다. 파란 <b style={{ color: '#5aa0ff' }}>보급 타일</b>을 밟으면 둘 다 가득 찬다.
        회색은 미끄럼, 진초록은 감속, 연초록은 부스트, 분홍빨강은 즉사.
      </p>

      {isDemo && (
        <p className="mt-2 text-[11px]" style={{ color: C.yellow }}>
          로그인하면 기록이 랭킹에 등록됩니다.
        </p>
      )}

      <SkyRoadsLeaderboard />
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="border-2 px-2 py-1" style={{ borderColor: C.border, background: C.panel }}>
      <div className="text-[9px] tracking-widest" style={{ color: C.dim }}>{label}</div>
      <div className="truncate text-[12px] md:text-sm" style={{ color: accent }}>{value}</div>
    </div>
  )
}

function Key({ k, desc }: { k: string; desc: string }) {
  return (
    <span className="flex items-center gap-1">
      <kbd className="border-2 px-2 py-[2px] text-[10px]" style={{ borderColor: C.border, background: C.panel, color: '#fff' }}>{k}</kbd>
      {desc}
    </span>
  )
}
