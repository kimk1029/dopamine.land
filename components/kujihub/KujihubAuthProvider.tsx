'use client'

import { GoogleOAuthProvider } from '@react-oauth/google'
import { GOOGLE_CLIENT_ID } from '@/lib/kujihub/config/runtimeConfig'

/**
 * kujihub/web 의 App.tsx 가 하던 일. 클라이언트 ID가 없으면 provider 없이
 * 그대로 렌더해서(원본과 동일) 구글 버튼만 비활성으로 남는다.
 */
export default function KujihubAuthProvider({ children }: { children: React.ReactNode }) {
  if (!GOOGLE_CLIENT_ID) return <>{children}</>

  return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>
}
