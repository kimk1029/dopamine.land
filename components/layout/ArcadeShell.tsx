'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LoginModal from '@/components/LoginModal'
import { ArcadeButton } from '@/components/arcade'
import {
  clearSession,
  loadSessionUser,
  registerUserRefresh,
  type SessionUser,
} from '@/lib/user-session'
import {
  clearWebAuthSession,
  getWebAuthSession,
  type WebAuthSession,
} from '@/lib/kujihub/auth/webAuth'

interface NavItem {
  path: string
  label: string
  icon: string
  /** Shown in the mobile bottom bar, which only has room for a few. */
  mobile?: boolean
  adminOnly?: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
}

/** kujihub 웹에서 옮겨온 1차 메뉴. 사이트의 기본 화면들이다. */
const KUJIHUB_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'HOME', icon: '🏠', mobile: true },
  { path: '/kuji', label: 'KUJI', icon: '🎰', mobile: true },
  { path: '/map', label: 'MAP', icon: '🗺️', mobile: true },
  { path: '/calc', label: 'CALC', icon: '🧮' },
  { path: '/media', label: 'MEDIA', icon: '📺' },
  { path: '/feed', label: 'FEED', icon: '📡' },
  { path: '/comm', label: 'COMM', icon: '👥', mobile: true },
  { path: '/profile', label: 'MY', icon: '👤', mobile: true },
]

/**
 * dopamine.land 이 원래 갖고 있던 메뉴. 쿠지허브 레이아웃 안에서
 * 서브 메뉴 그룹으로 들어간다. `/arcade` 는 옮기기 전 이 앱의 첫 화면.
 */
const ARCADE_ITEMS: NavItem[] = [
  { path: '/arcade', label: 'ARCADE', icon: '🎪' },
  { path: '/game', label: 'GAME', icon: '🕹️', mobile: true },
  { path: '/leaderboard', label: 'RANK', icon: '🏆' },
  { path: '/charge', label: 'CHARGE', icon: '⚡' },
  { path: '/admin', label: 'ADMIN', icon: '🛡️', adminOnly: true },
]

/** 심리테스트는 아직 특정 계정에만 공개된 상태다. */
const PSYCHOLOGY_ALLOWED_EMAIL = 'kimk1029@naver.com'

const getInitials = (name: string) => {
  const trimmed = name.trim()
  return trimmed ? trimmed.slice(0, 2).toUpperCase() : 'U'
}

interface UserCardProps {
  /** sidebar = 데스크톱 사이드바 상단, mobile = 사이드바가 숨는 폭에서의 대체 카드 */
  variant: 'sidebar' | 'mobile'
  signedIn: boolean
  userName: string
  badge: string
  statusLine: string
  onClick?: () => void
}

/**
 * 프로필 카드. 데스크톱에서는 사이드바 맨 위에, 사이드바가 사라지는
 * 768px 이하에서는 본문 상단에 같은 내용이 뜬다(표시 여부는 CSS 담당).
 */
function UserCard({ variant, signedIn, userName, badge, statusLine, onClick }: UserCardProps) {
  const compact = variant === 'sidebar'
  const avatarSize = compact ? 42 : 52

  return (
    <button
      type="button"
      className={`layout-usercard layout-usercard-${variant}`}
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: compact ? '10px' : '14px',
        padding: compact ? '10px 12px' : '14px 16px',
        border: '3px solid var(--arcade-secondary)',
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.88), rgba(36, 8, 46, 0.92))',
        boxShadow: '0 0 24px rgba(255, 0, 255, 0.18)',
        textAlign: 'left',
        cursor: signedIn ? 'default' : 'pointer',
      }}
    >
      <div
        style={{
          width: `${avatarSize}px`,
          height: `${avatarSize}px`,
          borderRadius: '50%',
          border: '2px solid var(--arcade-primary)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--arcade-primary)',
          fontWeight: 900,
          fontSize: compact ? '0.85rem' : '1rem',
          background: 'rgba(6, 10, 16, 0.92)',
          flexShrink: 0,
        }}
      >
        {signedIn ? getInitials(userName) : '?'}
      </div>

      <div
        className="layout-usercopy"
        style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}
      >
        <div
          className="arcade-font-pixel"
          style={{ color: 'var(--arcade-accent)', fontSize: compact ? '0.45rem' : '0.55rem' }}
        >
          {badge}
        </div>
        <div
          style={{
            color: '#fff',
            fontWeight: 900,
            fontSize: compact ? '0.86rem' : '1rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {userName}
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.72)',
            fontSize: compact ? '0.7rem' : '0.8rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {statusLine}
        </div>
      </div>
    </button>
  )
}

/**
 * Game play screens size their canvas from `window.innerWidth/innerHeight`,
 * so they get the whole viewport with no sidebar. The `/game` lobby keeps
 * the normal shell.
 */
const isCabinetRoute = (pathname: string) => /^\/game\/[^/]+/.test(pathname)

/**
 * 랜딩(로그인 게이트)은 kujihub 웹에서도 사이드바 밖에 있던 화면이라
 * 셸을 씌우지 않고 그대로 내보낸다.
 */
const isBareRoute = (pathname: string) => pathname === '/'

/**
 * Picks the deepest matching nav entry so `/game/kuji` highlights KUJI
 * rather than also lighting up GAME.
 */
const resolveActivePath = (pathname: string, items: NavItem[]) => {
  const matches = items.filter((item) =>
    item.path === '/'
      ? pathname === '/'
      : pathname === item.path || pathname.startsWith(`${item.path}/`)
  )
  return matches.sort((a, b) => b.path.length - a.path.length)[0]?.path
}

export default function ArcadeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [kujiSession, setKujiSession] = useState<WebAuthSession | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)

  const refresh = useCallback(async () => {
    setUser(await loadSessionUser())
    setKujiSession(getWebAuthSession())
  }, [])

  useEffect(() => {
    refresh()
    registerUserRefresh(refresh)
    return () => registerUserRefresh(null)
  }, [refresh])

  const handleLogout = () => {
    // 쿠지허브 세션과 이 앱의 세션은 서로 다른 서버를 보고 있어서 둘 다 지운다.
    clearSession()
    clearWebAuthSession()
    setUser(null)
    setKujiSession(null)
    window.location.href = '/'
  }

  const canSeePsychology = user?.email?.toLowerCase() === PSYCHOLOGY_ALLOWED_EMAIL
  const navGroups: NavGroup[] = [
    { title: 'MAIN', items: KUJIHUB_ITEMS },
    {
      title: 'ARCADE',
      items: [
        ...ARCADE_ITEMS.filter((item) => !item.adminOnly || user?.userType === 1),
        ...(canSeePsychology
          ? [{ path: '/psychology', label: 'MIND', icon: '🔮' } as NavItem]
          : []),
      ],
    },
  ]
  const navItems = navGroups.flatMap((group) => group.items)

  const activePath = resolveActivePath(pathname, navItems)
  const signedIn = Boolean(kujiSession || user)
  const userName =
    kujiSession?.user.name?.trim() ||
    user?.nickname?.trim() ||
    user?.email?.split('@')[0] ||
    'GUEST'
  const statusLine = kujiSession
    ? `${kujiSession.provider.toUpperCase()} 로그인`
    : user
      ? `${(user.points ?? 0).toLocaleString()} P`
      : '로그인이 필요합니다'
  const userBadge = kujiSession
    ? 'DOPAMINE.LAND'
    : user
      ? `LV.${user.level ?? 1}`
      : 'PRESS START'

  if (isBareRoute(pathname)) {
    return <>{children}</>
  }

  if (isCabinetRoute(pathname)) {
    return (
      <div className="scanlines crt" style={{ minHeight: '100vh' }}>
        <Link
          href="/game"
          className="arcade-font-pixel"
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            fontSize: '0.6rem',
            color: 'var(--arcade-secondary)',
            background: 'rgba(0,0,0,0.82)',
            border: '2px solid var(--arcade-secondary)',
            textDecoration: 'none',
          }}
        >
          <span aria-hidden="true">◀</span>
          <span>LOBBY</span>
        </Link>
        {children}
      </div>
    )
  }

  return (
    <div
      className="layout arcade-grid-bg scanlines crt"
      style={{ minHeight: '100vh', display: 'flex', width: '100%', overflowX: 'hidden' }}
    >
      {/* Desktop sidebar */}
      <aside
        className="sidebar"
        style={{
          width: '280px',
          background: 'rgba(0,0,0,0.9)',
          borderRight: '4px solid var(--arcade-primary)',
          height: '100vh',
          position: 'fixed',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="sidebar-header"
          style={{ padding: '24px', borderBottom: '4px solid var(--arcade-secondary)' }}
        >
          <Link
            href="/"
            className="logo-container"
            style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <Image
              src="/arcade/logo.png"
              alt=""
              width={40}
              height={40}
              style={{ imageRendering: 'pixelated' }}
              priority
            />
            <span
              className="arcade-font-pixel"
              style={{ color: 'var(--arcade-primary)', fontSize: '0.72rem' }}
            >
              DOPAMINE.LAND
            </span>
          </Link>
        </div>

        <div
          className="sidebar-profile"
          style={{ padding: '14px 16px', borderBottom: '4px solid var(--arcade-secondary)' }}
        >
          <UserCard
            variant="sidebar"
            signedIn={signedIn}
            userName={userName}
            badge={userBadge}
            statusLine={statusLine}
            onClick={signedIn ? undefined : () => setLoginOpen(true)}
          />
        </div>

        <nav
          className="sidebar-nav"
          style={{
            flex: 1,
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
          }}
        >
          {navGroups.map((group, groupIndex) => (
            <div
              key={group.title}
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <div
                className="arcade-font-pixel"
                style={{
                  marginTop: groupIndex === 0 ? 0 : '10px',
                  padding: '0 4px 6px',
                  borderBottom: '2px solid rgba(255,255,255,0.14)',
                  color: 'var(--arcade-accent)',
                  fontSize: '0.5rem',
                  letterSpacing: '0.08em',
                }}
              >
                {group.title}
              </div>

              {group.items.map((item) => {
                const isActive = item.path === activePath
                return (
                  <Link key={item.path} href={item.path} style={{ textDecoration: 'none' }}>
                    <div
                      className={`arcade-font-pixel ${isActive ? 'glitch-text' : ''}`}
                      style={{
                        padding: '10px 14px',
                        color: isActive ? 'var(--arcade-secondary)' : '#fff',
                        background: isActive ? 'rgba(255,0,255,0.1)' : 'transparent',
                        border: isActive
                          ? '2px solid var(--arcade-secondary)'
                          : '2px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '0.7rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div
          style={{
            padding: '24px',
            borderTop: '4px solid var(--arcade-secondary)',
            background: 'rgba(0,0,0,0.5)',
          }}
        >
          <ArcadeButton
            variant={signedIn ? 'primary' : 'accent'}
            size="sm"
            className="arcade-font-pixel"
            style={{ width: '100%', margin: 0 }}
            onClick={signedIn ? handleLogout : () => setLoginOpen(true)}
          >
            {signedIn ? 'QUIT GAME' : 'INSERT COIN'}
          </ArcadeButton>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="mobile-nav">
        {navItems
          .filter((item) => item.mobile)
          .map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`mobile-nav-item ${item.path === activePath ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
      </nav>

      <main
        className="main-content"
        style={{
          marginLeft: '280px',
          width: 'calc(100% - 280px)',
          minHeight: '100vh',
          padding: '24px',
          position: 'relative',
          zIndex: 1,
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
      >
        <div className="page-shell" style={{ width: '100%' }}>
          {/* 데스크톱에서는 사이드바 상단이 프로필 자리다. 사이드바가 숨는
              폭에서만 이 카드가 CSS 로 나타난다. */}
          <div className="layout-userbar">
            <UserCard
              variant="mobile"
              signedIn={signedIn}
              userName={userName}
              badge={userBadge}
              statusLine={statusLine}
              onClick={signedIn ? undefined : () => setLoginOpen(true)}
            />
          </div>

          {children}
        </div>
      </main>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLoginSuccess={refresh}
      />
    </div>
  )
}
