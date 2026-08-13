import { Suspense } from 'react'
import '@/styles/kujihub/base.css'
import KujihubAuthProvider from '@/components/kujihub/KujihubAuthProvider'
import { LandingPage } from '@/components/kujihub/pages/LandingPage'

/**
 * 사이트 첫 화면 = kujihub 웹의 랜딩(로그인 게이트).
 *
 * 소셜 로그인 콜백을 쿼리스트링으로 받기 때문에 useSearchParams 를 쓰고,
 * 그래서 Suspense 경계가 필요하다. 로그인된 방문자는 LandingPage 안에서
 * /dashboard 로 즉시 넘어간다.
 */
/**
 * 정적 프리렌더 중에는 useSearchParams 가 클라이언트 렌더로 빠져(BAILOUT)
 * 첫 HTML 이 빈 껍데기가 된다. 사이트 첫 화면이라 요청 시 서버 렌더로 돌려
 * 마크업이 실제로 내려가게 한다.
 */
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <div className="kujihub-scope">
      <KujihubAuthProvider>
        <Suspense fallback={null}>
          <LandingPage />
        </Suspense>
      </KujihubAuthProvider>
    </div>
  )
}
