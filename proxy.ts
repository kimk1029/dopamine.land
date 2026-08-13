import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, checkIPBlocklist, recordRequest } from '@/lib/security'
import { CONTENT_SECURITY_POLICY } from '@/lib/csp'

// 보안 헤더 설정
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || ''

  // 정적 파일 및 특정 경로는 Rate Limiting 제외
  const isStaticFile = pathname.startsWith('/_next/') || 
                       pathname.startsWith('/favicon.ico') ||
                       pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/i)

  // 1. IP 차단 목록 확인 (정적 파일도 차단된 IP는 차단)
  if (checkIPBlocklist(ip)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // 2. 요청 기록 (DDoS 탐지용) - 정적 파일 제외
  if (!isStaticFile) {
    recordRequest(ip, pathname, userAgent)
  }

  // 3. API 라우트에 대한 Rate Limiting (정적 파일 제외)
  let rateLimitResult: { allowed: boolean; error?: string; retryAfter?: number; remaining?: number } = { allowed: true, remaining: 300 }
  if (!isStaticFile && pathname.startsWith('/api/')) {
    rateLimitResult = checkRateLimit(ip, pathname)
  }
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: rateLimitResult.error || 'Too many requests' },
      { 
        status: 429,
        headers: {
          'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
        }
      }
    )
  }

  // 4. 요청 크기 제한
  if (request.method === 'POST') {
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB 제한
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      )
    }
  }

  // 5. 의심스러운 User-Agent 차단 (API 라우트에만 적용, 정적 파일 제외)
  if (!isStaticFile && pathname.startsWith('/api/')) {
    const suspiciousPatterns = [
      /curl/i,
      /wget/i,
      /python/i,
      /scraper/i,
    ]
    
    // bot은 허용하되, API 엔드포인트에서만 체크
    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      const isAllowedBot = /Googlebot|Bingbot|Slurp|DuckDuckBot/i.test(userAgent)
      if (!isAllowedBot) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    }
  }

  // 6. 보안 헤더 추가
  const response = NextResponse.next()
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // 7. Rate limit 정보 헤더 추가 (API 라우트에만)
  if (pathname.startsWith('/api/')) {
    response.headers.set('X-RateLimit-Limit', '300')
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining?.toString() || '0')
  }

  return response
}

// 클라이언트 IP 추출
function getClientIP(request: NextRequest): string {
  // X-Forwarded-For 헤더에서 IP 추출 (프록시 환경)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  // X-Real-IP 헤더 확인
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  // 기본값 (로컬 개발 환경)
  return '127.0.0.1'
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

