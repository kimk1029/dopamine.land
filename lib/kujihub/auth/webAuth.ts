export type WebAuthProvider = 'google' | 'kakao' | 'naver' | 'dev';

export type WebAuthSession = {
  provider: WebAuthProvider;
  token: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    image: string | null;
  };
  createdAt: number;
};

const STORAGE_KEY = 'kujihub_web_auth';

export function getWebAuthSession(): WebAuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as WebAuthSession;
    if (!parsed?.provider || !parsed?.token) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function setWebAuthSession(session: Omit<WebAuthSession, 'createdAt'>) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: WebAuthSession = {
    ...session,
    createdAt: Date.now(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearWebAuthSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function isWebAuthed() {
  return Boolean(getWebAuthSession());
}
