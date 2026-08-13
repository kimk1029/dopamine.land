/**
 * kujihub 웹이 쓰던 `import.meta.env`(Vite) 대체.
 *
 * Next는 클라이언트 번들에서 `process.env.NEXT_PUBLIC_*`를 **리터럴 접근**일
 * 때만 인라인한다. 원본의 `getClientEnv(key)`처럼 동적 키로 읽으면 값이
 * undefined가 되므로, 필요한 값을 여기서 상수로 고정해 내보낸다.
 */

/**
 * 쿠지허브 API(=kujihub/server)의 베이스 URL.
 *
 * 기본값이 상대경로인 이유: 서버는 http로만 열려 있고 이 사이트는 https로
 * 배포되기 때문에, 브라우저가 직접 호출하면 mixed content로 차단된다.
 * next.config.js의 rewrite가 `/kujihub-api/*`를 실제 서버로 넘겨준다.
 * 앱(React Native)은 이 경로를 쓰지 않고 서버를 직접 호출하므로 영향 없음.
 */
export const KUJIHUB_API_BASE =
  process.env.NEXT_PUBLIC_KUJIHUB_API_BASE || '/kujihub-api';

/** rewrite 대상 원본 서버. next.config.js와 값을 맞춰야 한다. */
export const KUJIHUB_API_ORIGIN =
  process.env.NEXT_PUBLIC_KUJIHUB_API_ORIGIN || 'http://kimk1029.synology.me:9933';

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export const KAKAO_REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY || '';

export const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || '';
