export interface SessionUser {
  id: number
  email: string
  nickname?: string
  points?: number
  level?: number
  userType?: number
}

type Refresher = () => void | Promise<void>

let activeRefresher: Refresher | null = null

/** Called by the shell so any page can trigger a header refresh. */
export const registerUserRefresh = (refresher: Refresher | null) => {
  activeRefresher = refresher
}

/** Re-reads the signed-in user so point/level displays stay in sync. */
export const refreshUserPoints = () => {
  activeRefresher?.()
}

/**
 * Resolves the signed-in user from the stored token.
 *
 * Returns the cached user on transient failures (503, network) so a flaky
 * request never looks like a logout; only a 401 clears the session.
 */
export const loadSessionUser = async (): Promise<SessionUser | null> => {
  if (typeof window === 'undefined') return null

  const token = localStorage.getItem('token')
  const storedUser = localStorage.getItem('user')

  if (!token) {
    if (storedUser) localStorage.removeItem('user')
    return null
  }

  const cached = (): SessionUser | null => {
    if (!storedUser) return null
    try {
      return JSON.parse(storedUser) as SessionUser
    } catch {
      return null
    }
  }

  try {
    const response = await fetch('/api/user/me', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.ok) {
      const user = (await response.json()) as SessionUser
      localStorage.setItem('user', JSON.stringify(user))
      return user
    }

    if (response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      return null
    }

    console.error('사용자 정보 조회 실패:', response.status)
    return cached()
  } catch (error) {
    console.error('사용자 정보를 불러오지 못했습니다:', error)
    return cached()
  }
}

export const clearSession = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}
