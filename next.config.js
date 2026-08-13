/**
 * kujihub 웹이 쓰는 API 서버는 앱(React Native)과 공유하는 별도 서버라
 * 이 프로젝트로 옮겨오지 않는다.
 *
 * 서버가 http 로만 열려 있어서 https 로 배포된 이 사이트에서 브라우저가
 * 직접 부르면 mixed content 로 차단된다. 그래서 /kujihub-api 로 프록시한다.
 */
const { KUJIHUB_API_ORIGIN, CONTENT_SECURITY_POLICY } = require('./lib/csp')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/kujihub-api/:path*',
        destination: `${KUJIHUB_API_ORIGIN}/:path*`,
      },
    ]
  },
  compiler: {
    styledComponents: true,
  },
  typescript: {
    // Vercel 빌드 시 타입 오류가 있어도 빌드를 계속 진행 (선택사항)
    // ignoreBuildErrors: false, // 기본값은 false (타입 오류 시 빌드 실패)
  },
  // 보안 헤더 추가
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            // 페이지 응답은 proxy.ts 가 같은 값으로 덮어쓴다(lib/csp.js 주석 참고).
            value: CONTENT_SECURITY_POLICY
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
