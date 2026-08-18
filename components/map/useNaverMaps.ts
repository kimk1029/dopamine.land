'use client'

import { useEffect, useState } from 'react'

/**
 * 네이버 지도 인증 키. 소셜 로그인용 NAVER_CLIENT_ID 와는 **다른 값**이고,
 * 네이버 클라우드 플랫폼 Maps 서비스에서 따로 발급받아야 한다.
 */
const CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || ''

/**
 * 현재 콘솔에서 발급되는 키는 `ncpKeyId`, 예전에 발급받은 키는 `ncpClientId`
 * 로 넘겨야 인증이 통과한다. 키를 갈아끼울 때 코드를 안 고치도록 열어둔다.
 */
const KEY_PARAM = process.env.NEXT_PUBLIC_NAVER_MAP_KEY_PARAM || 'ncpKeyId'

const SCRIPT_ID = 'naver-maps-sdk'

export type NaverMapsStatus = 'missing-key' | 'loading' | 'ready' | 'error'

/**
 * maps.js 를 한 번만 삽입하고 로드 상태를 알려준다.
 *
 * 라우트를 오갈 때마다 스크립트를 다시 넣으면 인증 요청이 중복으로 나가므로,
 * 이미 붙어 있는 태그가 있으면 거기에 리스너만 건다.
 */
export function useNaverMaps(): NaverMapsStatus {
  const [status, setStatus] = useState<NaverMapsStatus>(
    CLIENT_ID ? 'loading' : 'missing-key'
  )

  useEffect(() => {
    if (!CLIENT_ID) return
    if (window.naver?.maps) {
      setStatus('ready')
      return
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    const script = existing ?? document.createElement('script')

    const handleLoad = () => setStatus(window.naver?.maps ? 'ready' : 'error')
    const handleError = () => setStatus('error')

    script.addEventListener('load', handleLoad)
    script.addEventListener('error', handleError)

    if (!existing) {
      script.id = SCRIPT_ID
      script.async = true
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?${KEY_PARAM}=${encodeURIComponent(CLIENT_ID)}`
      document.head.appendChild(script)
    }

    return () => {
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }
  }, [])

  return status
}
