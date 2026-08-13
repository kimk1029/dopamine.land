'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getWebAuthSession } from '@/lib/kujihub/auth/webAuth'

/**
 * kujihub/web 의 `RequireWebAuth` 라우트 가드를 옮긴 것.
 *
 * 세션은 localStorage 에만 있어서 서버에서는 판정할 수 없다. 그래서 첫
 * 렌더에서는 아무것도 그리지 않고, 마운트 후 세션을 확인해 없으면 랜딩(`/`)
 * 으로 돌려보낸다. 게임·보드 같은 dopamine.land 페이지는 이 가드를 쓰지
 * 않으므로 로그인 없이 그대로 열린다.
 */
export default function KujihubGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (getWebAuthSession()) {
      setAllowed(true)
    } else {
      router.replace('/')
    }
  }, [router])

  if (!allowed) return null

  return <>{children}</>
}
