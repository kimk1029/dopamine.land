/**
 * CSP 한 곳 정의.
 *
 * 페이지 응답의 CSP는 proxy.ts(미들웨어)가 덮어쓰고, 미들웨어 matcher에서
 * 빠진 정적 경로는 next.config.js의 headers()가 담당한다. 두 군데가 따로
 * 관리되다 보니 실제로 어긋나 있었으므로(=Galmuri 폰트가 CSP에 막힘)
 * 여기서 문자열을 만들어 양쪽이 같은 값을 쓰게 한다.
 *
 * next.config.js가 CommonJS라 이 파일도 .js/CommonJS로 둔다.
 */

/** kujihub/server. 앱과 공유하는 별도 서버라 이 프로젝트로 옮기지 않는다. */
const KUJIHUB_API_ORIGIN =
  process.env.NEXT_PUBLIC_KUJIHUB_API_ORIGIN || 'http://kimk1029.synology.me:9933'

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // accounts.google.com: 쿠지허브 랜딩의 구글 로그인(@react-oauth/google)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://accounts.google.com",
  // cdn.jsdelivr.net: 쿠지허브 UI가 쓰는 Galmuri 픽셀 폰트
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  // 쿠지 라인업/미디어 썸네일이 http로 오는 경우가 있어 서버 오리진을 명시
  `img-src 'self' data: blob: https: ${KUJIHUB_API_ORIGIN}`,
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
  // 기본 경로는 /kujihub-api 프록시(=same origin)라 'self'로 충분하지만,
  // NEXT_PUBLIC_KUJIHUB_API_BASE로 서버를 직접 부르는 설정도 열어둔다.
  `connect-src 'self' https: wss: ws://localhost:3001 ws://localhost:* wss://*.supabase.co https://*.supabase.co https://accounts.google.com ${KUJIHUB_API_ORIGIN}`,
  // 구글 로그인 iframe
  "frame-src 'self' https://accounts.google.com",
].join('; ')

module.exports = { KUJIHUB_API_ORIGIN, CONTENT_SECURITY_POLICY }
