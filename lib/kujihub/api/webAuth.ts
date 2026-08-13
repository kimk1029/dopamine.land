import { api } from './client';
import type { WebAuthProvider, WebAuthSession } from '../auth/webAuth';
import axios from 'axios';

type WebAuthResponse = Omit<WebAuthSession, 'createdAt'>;

function rethrowApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      '로그인 요청에 실패했습니다.';
    throw new Error(message);
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error('로그인 요청에 실패했습니다.');
}

export async function loginWithGoogle(accessToken: string): Promise<WebAuthResponse> {
  try {
    const { data } = await api.post<WebAuthResponse>('/api/auth/web/google', { accessToken });
    return data;
  } catch (error) {
    rethrowApiError(error);
  }
}

export async function loginWithKakao(code: string, redirectUri: string): Promise<WebAuthResponse> {
  try {
    const { data } = await api.post<WebAuthResponse>('/api/auth/web/kakao', { code, redirectUri });
    return data;
  } catch (error) {
    rethrowApiError(error);
  }
}

export async function loginWithNaver(code: string, state: string): Promise<WebAuthResponse> {
  try {
    const { data } = await api.post<WebAuthResponse>('/api/auth/web/naver', { code, state });
    return data;
  } catch (error) {
    rethrowApiError(error);
  }
}

export async function loginWithDev(nickname = 'DEV USER'): Promise<WebAuthResponse> {
  try {
    const { data } = await api.post<WebAuthResponse>('/api/auth/web/dev', { nickname });
    return data;
  } catch (error) {
    rethrowApiError(error);
  }
}

export function isRealProvider(provider: WebAuthProvider) {
  return provider === 'google' || provider === 'kakao' || provider === 'naver';
}
