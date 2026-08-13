'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';
import { ArcadeButton } from '@/components/arcade';
import { kujiDrawApi } from '@/lib/kujihub/api/kujiDraw';
import type { KujiListItem } from '@/lib/kujihub/types/kujiDraw';
import { getWebAuthSession, setWebAuthSession } from '@/lib/kujihub/auth/webAuth';
import { loginWithDev, loginWithGoogle, loginWithKakao, loginWithNaver } from '@/lib/kujihub/api/webAuth';
import {
  GOOGLE_CLIENT_ID,
  KAKAO_REST_API_KEY,
  NAVER_CLIENT_ID,
} from '@/lib/kujihub/config/runtimeConfig';

type WebLoginOption = {
  id: 'kakao' | 'naver' | 'google' | 'dev';
  label: string;
  shortLabel: string;
  chip: string;
  tone: 'accent' | 'primary' | 'secondary';
};

const LOGIN_OPTIONS: WebLoginOption[] = [
  { id: 'kakao', label: '카카오 로그인', shortLabel: '카카오', chip: 'KAKAO', tone: 'accent' },
  { id: 'naver', label: '네이버 로그인', shortLabel: '네이버', chip: 'NAVER', tone: 'secondary' },
  { id: 'google', label: '구글 로그인', shortLabel: '구글', chip: 'GOOGLE', tone: 'primary' },
  { id: 'dev', label: '바로가기(개발용)', shortLabel: '바로가기', chip: 'DEV', tone: 'accent' },
];


function buildCallbackUrl(provider: 'kakao' | 'naver') {
  return `${window.location.origin}/?provider=${provider}`;
}

function createOAuthState(provider: 'kakao' | 'naver') {
  const state = `${provider}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  window.sessionStorage.setItem(`kujihub_oauth_state_${provider}`, state);
  return state;
}

function getStoredOAuthState(provider: 'kakao' | 'naver') {
  return window.sessionStorage.getItem(`kujihub_oauth_state_${provider}`);
}

function clearStoredOAuthState(provider: 'kakao' | 'naver') {
  window.sessionStorage.removeItem(`kujihub_oauth_state_${provider}`);
}

function validateOAuthState(provider: 'kakao' | 'naver', state: string | null) {
  const expected = getStoredOAuthState(provider);
  return Boolean(state && expected && state === expected);
}

function buildKakaoAuthUrl() {
  const state = createOAuthState('kakao');
  const params = new URLSearchParams({
    client_id: KAKAO_REST_API_KEY,
    redirect_uri: buildCallbackUrl('kakao'),
    response_type: 'code',
    state,
  });
  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}

function buildNaverAuthUrl() {
  const state = createOAuthState('naver');
  const params = new URLSearchParams({
    client_id: NAVER_CLIENT_ID,
    redirect_uri: buildCallbackUrl('naver'),
    response_type: 'code',
    state,
  });
  return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
}

function redirectTo(url: string) {
  window.location.assign(url);
}

export function LandingPage() {
  const router = useRouter();
  // react-router 의 location.search 대체. 문자열로 고정해 훅 의존성에 그대로 쓴다.
  const search = useSearchParams().toString();
  const [featured, setFeatured] = useState<KujiListItem[]>([]);
  const [showLoginPanel, setShowLoginPanel] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  const callbackMessage = useMemo(() => {
    const params = new URLSearchParams(search);
    const provider = params.get('provider');
    const state = params.get('state');
    const errorCode = params.get('error');

    if (!provider) {
      return null;
    }

    if (errorCode) {
      return '소셜 로그인에 실패했습니다. 다시 시도해주세요.';
    }

    if (provider === 'kakao' || provider === 'naver') {
      const code = params.get('code');
      if (code && !validateOAuthState(provider, state)) {
        return '로그인 검증에 실패했습니다. 다시 시도해주세요.';
      }
    }

    return null;
  }, [search]);

  const isCallbackAuthenticating = useMemo(() => {
    const params = new URLSearchParams(search);
    const provider = params.get('provider');
    const code = params.get('code');
    const errorCode = params.get('error');

    if (errorCode || callbackMessage) {
      return false;
    }

    return Boolean((provider === 'kakao' || provider === 'naver') && code);
  }, [callbackMessage, search]);

  const completeLogin = useCallback((session: Parameters<typeof setWebAuthSession>[0]) => {
    setWebAuthSession(session);
    router.replace('/dashboard');
  }, [router]);

  useEffect(() => {
    kujiDrawApi.getList().then(list => {
      setFeatured(list.slice(0, 3));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (getWebAuthSession()) {
      router.replace('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const provider = params.get('provider');
    const code = params.get('code');
    const state = params.get('state');
    const errorCode = params.get('error');

    if (!provider) {
      return;
    }

    if (errorCode) {
      if (provider === 'kakao' || provider === 'naver') {
        clearStoredOAuthState(provider);
      }
      window.history.replaceState({}, '', '/');
      return;
    }

    if ((provider === 'kakao' || provider === 'naver') && code) {
      if (callbackMessage) {
        clearStoredOAuthState(provider);
        window.history.replaceState({}, '', '/');
        return;
      }

      clearStoredOAuthState(provider);

      const loginPromise =
        provider === 'kakao'
          ? loginWithKakao(code, buildCallbackUrl('kakao'))
          : loginWithNaver(code, state || '');

      loginPromise
        .then((session) => {
          window.history.replaceState({}, '', '/');
          completeLogin(session);
        })
        .catch((authError) => {
          setError(authError instanceof Error ? authError.message : '로그인 처리에 실패했습니다.');
          window.history.replaceState({}, '', '/');
        });
    }
  }, [callbackMessage, completeLogin, search]);

  const loginHelp = useMemo(() => {
    const missing = [];
    if (!KAKAO_REST_API_KEY) missing.push('KAKAO');
    if (!NAVER_CLIENT_ID) missing.push('NAVER');
    if (!GOOGLE_CLIENT_ID) missing.push('GOOGLE');
    return missing;
  }, []);

  function handlePressStart() {
    if (showLoginPanel || isGlitching) {
      return;
    }

    setError(null);
    setIsGlitching(true);
    window.setTimeout(() => {
      setShowLoginPanel(true);
      setIsGlitching(false);
    }, 820);
  }

  function handleLogin(option: WebLoginOption['id']) {
    setError(null);

    if (option === 'dev') {
      setAuthenticating(true);
      loginWithDev()
        .then((session) => {
          completeLogin(session);
        })
        .catch((authError) => {
          setError(authError instanceof Error ? authError.message : '개발용 로그인에 실패했습니다.');
        })
        .finally(() => {
          setAuthenticating(false);
        });
      return;
    }

    if (option === 'google') {
      if (!GOOGLE_CLIENT_ID) {
        setError('NEXT_PUBLIC_GOOGLE_CLIENT_ID가 없습니다.');
        return;
      }
      return;
    }

    if (option === 'kakao') {
      if (!KAKAO_REST_API_KEY) {
        setError('NEXT_PUBLIC_KAKAO_REST_API_KEY가 없습니다.');
        return;
      }
      redirectTo(buildKakaoAuthUrl());
      return;
    }

    if (!NAVER_CLIENT_ID) {
      setError('NEXT_PUBLIC_NAVER_CLIENT_ID가 없습니다.');
      return;
    }
    redirectTo(buildNaverAuthUrl());
  }

  if (isCallbackAuthenticating) {
    return (
      <div className="arcade-body scanlines crt landing-shell" style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="blink" style={{ color: 'var(--arcade-primary)', fontWeight: 900 }}>AUTHENTICATING...</div>
      </div>
    );
  }

  return (
    <div className="arcade-body scanlines crt landing-shell">
      <div className="landing-topbar">
        <div style={{ color: 'var(--arcade-secondary)', fontWeight: 900 }}>1P: 00000</div>
        <div className="blink" style={{ color: 'var(--arcade-accent)', fontWeight: 900 }}>WEB LOGIN MODE</div>
        <div style={{ color: 'var(--arcade-primary)', fontWeight: 900 }}>CREDITS: 01</div>
      </div>

      <section className="arcade-hero landing-hero">
        <h1 className="hero-title glitch-heavy" style={{ fontSize: '6rem' }}>
          KUJI<br />HUB
        </h1>
        <p className="hero-subtitle" style={{ letterSpacing: '12px', color: 'var(--arcade-secondary)', marginBottom: '3rem' }}>
          // WEB LOGIN ARCADE GATE
        </p>

        <div className="login-gate-wrap">
          <div
            className={[
              'login-gate-stage',
              showLoginPanel ? 'is-revealed' : '',
              isGlitching ? 'is-glitching' : '',
            ].join(' ')}
          >
            <div className="login-gate-face start-face">
              <ArcadeButton
                variant="accent"
                size="lg"
                onClick={handlePressStart}
                className="coin-btn btn-glitch-active"
              >
                PRESS START
              </ArcadeButton>
            </div>

            <div className="login-gate-face login-face">
              <div className="web-login-panel">
                {LOGIN_OPTIONS.map((option) => (
                  option.id === 'google' ? (
                    GOOGLE_CLIENT_ID ? (
                      <GoogleLoginButton
                        key={option.id}
                        disabled={authenticating}
                        onError={(message) => setError(message)}
                        onSuccess={(accessToken) => {
                          setAuthenticating(true);
                          loginWithGoogle(accessToken)
                            .then((session) => {
                              completeLogin(session);
                            })
                            .catch((authError) => {
                              setError(authError instanceof Error ? authError.message : '구글 로그인에 실패했습니다.');
                            })
                            .finally(() => {
                              setAuthenticating(false);
                            });
                        }}
                      />
                    ) : (
                      <button
                        key={option.id}
                        type="button"
                        className="web-login-btn tone-primary"
                        onClick={() => setError('NEXT_PUBLIC_GOOGLE_CLIENT_ID가 없습니다.')}
                      >
                        <span className="web-login-btn-chip">GOOGLE</span>
                        <span className="web-login-btn-label">구글</span>
                        <span className="web-login-btn-sub">WEB</span>
                      </button>
                    )
                  ) : (
                    <button
                      key={option.id}
                      type="button"
                      className={`web-login-btn tone-${option.tone}`}
                      onClick={() => handleLogin(option.id)}
                    >
                      <span className="web-login-btn-chip">{option.chip}</span>
                      <span className="web-login-btn-label">{option.shortLabel}</span>
                      <span className="web-login-btn-sub">
                        {option.id === 'dev' ? 'FAST' : 'WEB'}
                      </span>
                    </button>
                  )
                ))}
              </div>
            </div>
          </div>

          <p className="landing-gate-caption">
            PRESS START를 눌러야 로그인 버튼이 활성화됩니다.
          </p>
        </div>

        {error || callbackMessage ? <div className="landing-login-error">{error ?? callbackMessage}</div> : null}
        {authenticating || isCallbackAuthenticating ? (
          <div className="landing-login-hint">
            인증 정보를 확인하는 중입니다...
          </div>
        ) : null}
        {loginHelp.length > 0 ? (
          <div className="landing-login-hint">
            누락된 웹 환경변수: {loginHelp.join(', ')}
          </div>
        ) : null}

        <div style={{ marginTop: '4rem', display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {featured.map(item => (
            <div key={item.id} style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
              LOADED: {item.title.substring(0, 15)}...
            </div>
          ))}
        </div>

        <div className="blink" style={{ marginTop: '2rem', color: 'var(--arcade-accent)', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '4px' }}>
          © 2026 KUJIHUB ENTERTAINMENT SYSTEM
        </div>
      </section>

      <footer className="landing-footer">
        <div style={{ display: 'flex', gap: '4rem', justifyContent: 'center' }}>
          <span className="glitch-text" style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: 900, color: 'rgba(255,255,255,0.5)' }}>FAQ</span>
          <span className="glitch-text" style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: 900, color: 'rgba(255,255,255,0.5)' }}>LEGAL</span>
          <span className="glitch-text" style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: 900, color: 'rgba(255,255,255,0.5)' }}>SUPPORT</span>
        </div>
      </footer>
    </div>
  );
}

function GoogleLoginButton({
  disabled,
  onSuccess,
  onError,
}: {
  disabled: boolean;
  onSuccess: (token: string) => void;
  onError: (message: string) => void;
}) {
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      if (tokenResponse.access_token) {
        onSuccess(tokenResponse.access_token);
        return;
      }

      onError('구글 토큰을 받지 못했습니다.');
    },
    onError: () => {
      onError('구글 로그인에 실패했습니다. 설정값을 확인해주세요.');
    },
  });

  return (
    <button
      type="button"
      className="web-login-btn tone-primary"
      disabled={disabled}
      onClick={() => {
        login();
      }}
    >
      <span className="web-login-btn-chip">GOOGLE</span>
      <span className="web-login-btn-label">구글</span>
      <span className="web-login-btn-sub">WEB</span>
    </button>
  );
}
