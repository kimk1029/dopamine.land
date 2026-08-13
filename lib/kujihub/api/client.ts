import axios from 'axios';
import { getWebAuthSession } from '../auth/webAuth';
import { KUJIHUB_API_BASE } from '../config/runtimeConfig';

export const api = axios.create({
  baseURL: KUJIHUB_API_BASE,
  // 원본은 10초였는데 /api/kuji-lineup 이 실측 12초라 HOME 이 매번 타임아웃난다.
  // 서버(kujihub/server)를 손대지 않기로 했으므로 클라이언트 쪽을 늘려둔다.
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const session = getWebAuthSession();
  if (session?.token) {
    const headers = axios.AxiosHeaders.from(config.headers ?? {});
    headers.set('Authorization', `Bearer ${session.token}`);
    headers.set('X-Web-Auth-Token', session.token);
    config.headers = headers;
  }
  return config;
});
