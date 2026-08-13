'use client'

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { communityApi } from '@/lib/kujihub/api/community';
import { ensureKujiPlayer } from '@/lib/kujihub/api/kujiDraw';
import type { KujiPlayer } from '@/lib/kujihub/types/kujiDraw';
import { getWebAuthSession } from '@/lib/kujihub/auth/webAuth';

export function CommunityPostFormPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const editId = id ? Number(id) : null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isNotice, setIsNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true); // default true for player load
  const [player, setPlayer] = useState<KujiPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompactLayout, setIsCompactLayout] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768
  );
  const session = getWebAuthSession();
  const authorName = session?.user.name?.trim() || 'PLAYER';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const syncLayout = () => setIsCompactLayout(mediaQuery.matches);
    syncLayout();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncLayout);
      return () => mediaQuery.removeEventListener('change', syncLayout);
    }

    mediaQuery.addListener(syncLayout);
    return () => mediaQuery.removeListener(syncLayout);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const currentPlayer = await ensureKujiPlayer();
        if (!cancelled) {
          setPlayer(currentPlayer);
        }
        
        if (editId) {
          const post = await communityApi.getOne(editId);
          if (!cancelled) {
            if (post.author !== authorName) {
              router.replace(`/community/${editId}`);
              return;
            }
            setTitle(post.title);
            setContent(post.content);
            setIsNotice(!!post.isNotice);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authorName, editId, router]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const t = title.trim();
      if (!t) return;
      setError(null);
      setLoading(true);
      try {
        if (editId) {
          await communityApi.update(editId, {
            title: t,
            content: content.trim(),
            isNotice: player?.role === 'admin' ? isNotice : undefined,
          });
        } else {
          await communityApi.create({
            title: t,
            content: content.trim(),
            isNotice: player?.role === 'admin' ? isNotice : false,
          });
        }
        router.push('/community');
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : '저장에 실패했습니다.');
        setLoading(false);
      }
    },
    [editId, title, content, isNotice, player, router]
  );

  if (fetching) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="blink" style={{ color: 'var(--arcade-primary)', fontSize: '1.5rem', fontWeight: 900 }}>
          DOWNLOADING_DATA...
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <header style={{ marginBottom: '32px' }}>
        <h1
          style={{
            color: 'var(--arcade-secondary)',
            fontSize: isCompactLayout ? '1.08rem' : '2rem',
            marginBottom: '8px',
            fontWeight: 900,
            lineHeight: 1.2,
            letterSpacing: isCompactLayout ? '0.02em' : 'normal',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          }}
        >
          {editId ? 'MODIFY_MAINFRAME_LOG' : 'INITIALIZE_NEW_BROADCAST'}
        </h1>
        <p style={{ color: '#fff', fontSize: isCompactLayout ? '0.78rem' : '0.9rem', opacity: 0.8, fontWeight: 500, lineHeight: 1.5 }}>
          ESTABLISHING SECURE CONNECTION TO DATA_CORE_01...
        </p>
      </header>

      <div style={{ ...dosStyles.container, maxWidth: isCompactLayout ? '100%' : '900px' }}>
        <div style={{ ...dosStyles.header, padding: isCompactLayout ? '10px 12px' : '10px 20px', gap: isCompactLayout ? '10px' : '15px', flexWrap: 'wrap' }}>
          <div style={dosStyles.dot} />
          <span style={{ ...dosStyles.headerText, fontSize: isCompactLayout ? '10px' : '14px', letterSpacing: isCompactLayout ? '1px' : '2px' }}>
            KUJIHUB_BROADCAST_SYSTEM_V4.2
          </span>
          <span style={{ marginLeft: 'auto', color: '#555', fontSize: isCompactLayout ? '9px' : '10px', fontWeight: 900, wordBreak: 'break-all' }}>
            SESSION: {authorName}
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ ...dosStyles.body, padding: isCompactLayout ? '16px 14px 18px' : '30px' }}>
          {error && (
            <div style={{ color: 'var(--error)', marginBottom: '20px', padding: '10px', border: '1px solid var(--error)', background: 'rgba(255,0,0,0.1)' }}>
              [ FATAL_ERROR: {error} ]
            </div>
          )}

            <div style={dosStyles.terminalSession}>
              <div style={{ ...dosStyles.line, fontSize: isCompactLayout ? '0.94rem' : '1.4rem' }}>
                <span style={dosStyles.dimPrompt}>C:\USERS\{authorName.toUpperCase()}&gt;</span> login --sector community
              </div>
            <div style={{ ...dosStyles.line, fontSize: isCompactLayout ? '0.94rem' : '1.4rem' }}>
              <span style={dosStyles.greenText}>AUTHENTICATION_SUCCESSFUL. READY FOR INPUT.</span>
            </div>
            
            {/* Title Input */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ ...dosStyles.line, fontSize: isCompactLayout ? '0.94rem' : '1.4rem', flexDirection: isCompactLayout ? 'column' : 'row', alignItems: isCompactLayout ? 'stretch' : 'center', gap: isCompactLayout ? '8px' : 0 }}>
                <span style={{ ...dosStyles.prompt, marginRight: isCompactLayout ? 0 : '10px' }}>ENTER_TITLE{'>'} </span>
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', width: '100%' }}>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    autoFocus
                    autoComplete="off"
                    style={{ ...dosStyles.input, fontSize: isCompactLayout ? '1.02rem' : '1.4rem' }}
                  />
                  {title.length === 0 && (
                    <div 
                      className="blink" 
                      style={{
                        ...dosStyles.inlineCursor,
                        position: 'absolute',
                        left: 0,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{
                        width: isCompactLayout ? '10px' : '12px',
                        height: isCompactLayout ? '18px' : '24px',
                        backgroundColor: '#39ff14',
                        boxShadow: '0 0 5px #39ff14',
                      }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Input */}
            <div style={{ marginTop: '24px' }}>
              <div style={dosStyles.line}>
                <span style={{ ...dosStyles.prompt, fontSize: isCompactLayout ? '0.94rem' : 'inherit' }}>MESSAGE_BODY{'>'} </span>
              </div>
              <div style={{ position: 'relative', marginTop: '8px' }}>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder=""
                  rows={isCompactLayout ? 8 : 10}
                  style={{ ...dosStyles.textarea, fontSize: isCompactLayout ? '0.98rem' : '1.3rem', minHeight: isCompactLayout ? '220px' : 'unset' }}
                />
                {content.length === 0 && (
                  <div className="blink" style={{ ...dosStyles.inlineCursor, position: 'absolute', top: '10px', left: '10px', pointerEvents: 'none' }} />
                )}
              </div>
            </div>

            {player?.role === 'admin' && (
              <div style={{ marginTop: '20px', display: 'flex', alignItems: isCompactLayout ? 'flex-start' : 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ ...dosStyles.prompt, fontSize: isCompactLayout ? '0.94rem' : 'inherit' }}>SET_NOTICE? [Y/N]{'>'}</span>
                <input
                  type="checkbox"
                  checked={isNotice}
                  onChange={(e) => setIsNotice(e.target.checked)}
                  style={dosStyles.checkbox}
                />
                <span style={dosStyles.greenText}>{isNotice ? 'YES' : 'NO'}</span>
              </div>
            )}

            <div style={{ marginTop: '32px', borderTop: '1px dashed #222', paddingTop: '20px' }}>
              <div style={{ ...dosStyles.line, fontSize: isCompactLayout ? '0.94rem' : '1.4rem' }}>
                <span style={dosStyles.dimPrompt}>SYSTEM_STATUS:</span> <span className="blink" style={dosStyles.greenText}>READY_FOR_BROADCAST</span>
              </div>
              
              <div style={{ display: 'flex', gap: isCompactLayout ? '12px' : '20px', marginTop: '24px', flexDirection: isCompactLayout ? 'column' : 'row' }}>
                <button 
                  type="submit" 
                  disabled={!title.trim() || loading}
                  style={{
                    ...dosStyles.terminalBtn,
                    backgroundColor: '#39FF14',
                    color: '#000',
                    width: isCompactLayout ? '100%' : 'auto',
                    fontSize: isCompactLayout ? '0.95rem' : '1.2rem',
                    padding: isCompactLayout ? '11px 16px' : '12px 30px',
                  }}
                >
                  {loading ? '[ EXECUTING... ]' : editId ? '[ UPDATE_RECORD ]' : '[ EXECUTE_BROADCAST ]'}
                </button>
                
                <button 
                  type="button" 
                  onClick={() => router.push(editId ? `/community/${editId}` : '/community')}
                  style={{
                    ...dosStyles.terminalBtn,
                    backgroundColor: 'transparent',
                    color: '#39FF14',
                    border: '2px solid #39FF14',
                    width: isCompactLayout ? '100%' : 'auto',
                    fontSize: isCompactLayout ? '0.95rem' : '1.2rem',
                    padding: isCompactLayout ? '11px 16px' : '12px 30px',
                  }}
                >
                  [ ABORT_PROCESS ]
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const dosStyles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#000',
    borderRadius: '4px',
    border: '2px solid #333',
    overflow: 'hidden',
    fontFamily: "'Galmuri11', 'VT323', monospace",
    boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    backgroundColor: '#1a1a1a',
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    borderBottom: '1px solid #333',
  },
  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#39ff14',
    boxShadow: '0 0 8px #39ff14',
  },
  headerText: {
    color: '#888',
    fontSize: '14px',
    fontWeight: 900,
    letterSpacing: '2px',
  },
  body: {
    padding: '30px',
  },
  terminalSession: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  line: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '1.4rem',
    color: '#39ff14',
    flexWrap: 'wrap',
    rowGap: '6px',
  },
  prompt: {
    color: '#39ff14',
    fontWeight: 900,
    marginRight: '10px',
  },
  dimPrompt: {
    color: '#008f11',
    marginRight: '10px',
  },
  greenText: {
    color: '#39ff14',
  },
  input: {
    background: 'transparent',
    border: 'none',
    color: '#39ff14',
    fontSize: '1.4rem',
    fontWeight: 900,
    padding: 0,
    outline: 'none',
    width: '100%',
    fontFamily: "'Galmuri11', 'VT323', monospace",
    caretColor: 'transparent',
  },
  textarea: {
    background: 'rgba(57, 255, 20, 0.03)',
    border: '1px solid #111',
    color: '#39ff14',
    fontSize: '1.3rem',
    fontWeight: 500,
    padding: '10px',
    outline: 'none',
    width: '100%',
    lineHeight: '1.4',
    fontFamily: "'Galmuri11', 'VT323', monospace",
    caretColor: '#39ff14',
    resize: 'none',
    boxSizing: 'border-box',
  },
  inlineCursor: {
    width: '12px',
    height: '24px',
    backgroundColor: '#39ff14',
    boxShadow: '0 0 5px #39ff14',
    display: 'inline-block',
    verticalAlign: 'middle',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    accentColor: '#39ff14',
    cursor: 'pointer',
  },
  terminalBtn: {
    padding: '12px 30px',
    fontSize: '1.2rem',
    fontWeight: 900,
    fontFamily: "'Galmuri11', 'VT323', monospace",
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
  }
};
