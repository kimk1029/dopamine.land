'use client'

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { communityApi } from '@/lib/kujihub/api/community';
import type { CommunityFeedItem } from '@/lib/kujihub/types/community';
import { ArcadeBox, ArcadeButton } from '@/components/arcade';

function feedLabel(item: CommunityFeedItem) {
  if (item.type === 'post_created') return 'NEW_POST';
  if (item.type === 'post_updated') return 'UPDATE';
  if (item.type === 'post_deleted') return 'DELETE';
  if (item.type === 'lineup_alert') return 'ALERT';
  if (item.type === 'quick_post') return 'QUICK_SIGNAL';
  return 'SIGNAL';
}

export function FeedPage() {
  const [items, setItems] = useState<CommunityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Visibility & Animation state
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // DOS Input & Tags state
  const [inputText, setInputText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tags = ['가챠교환', '쿠지현황'];

  const loadFeed = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await communityApi.getFeed(60);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '피드를 불러올 수 없습니다.');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleQuickPost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await communityApi.createFeedItem({
        type: 'quick_post',
        title: selectedTag ? `[${selectedTag}] ${text}` : text,
        body: text,
        imageUrl: selectedImage || undefined,
      });
      setInputText('');
      setSelectedTag(null);
      setSelectedImage(null);
      setIsExpanded(false); // Collapse on success
      await loadFeed(false);
    } catch (err) {
      console.error('Failed to post from CLI:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = useMemo(() => {
    // Exclude bulletin board posts (post_created, post_updated, post_deleted)
    const signalsOnly = items.filter(item => 
      item.type !== 'post_created' && 
      item.type !== 'post_updated' && 
      item.type !== 'post_deleted'
    );

    if (!selectedTag) return signalsOnly;
    return signalsOnly.filter(item => 
      item.title.includes(`[${selectedTag}]`) || 
      item.body.includes(selectedTag) ||
      (item.type === 'quick_post' && item.title.includes(selectedTag))
    );
  }, [items, selectedTag]);

  const toggleTag = (tag: string) => {
    setSelectedTag(prev => prev === tag ? null : tag);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await communityApi.uploadImage(file);
      setSelectedImage(base64);
    } catch (err) {
      console.error('File read error:', err);
    }
  };

  const handleTerminalHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    if (nextState) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  };

  if (loading && !refreshing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="blink" style={{ color: 'var(--arcade-primary)', fontSize: '1.5rem', fontWeight: 900 }}>
          SYNCING FEED...
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <header className="page-header" style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ color: 'var(--arcade-secondary)', fontSize: '2rem', marginBottom: '8px' }}>
              LIVE_SIGNAL_FEED
            </h1>
            <p style={{ color: '#fff', fontSize: '0.9rem', opacity: 0.8, fontWeight: 500 }}>
              REAL-TIME SECTOR MONITORING & DATA INPUT.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <ArcadeButton variant="secondary" size="sm" onClick={() => loadFeed()}>
              REFRESH
            </ArcadeButton>
          </div>
        </div>

        {/* DOS Style Input Section */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
          <div 
            className="dos-container" 
            style={{
              ...dosStyles.container,
              width: '100%',
              maxWidth: '800px',
            }}
          >
            <div className="dos-header" style={dosStyles.header} onClick={handleTerminalHeaderClick}>
              <div style={dosStyles.dot} />
              <span style={dosStyles.headerText}>KUJI_TERMINAL_V1.0.WEB</span>
              <span style={{ marginLeft: 'auto', color: '#555', fontSize: '10px', fontWeight: 900 }}>
                {isExpanded ? '[ CLICK TO COLLAPSE ]' : '[ CLICK TO EXPAND ]'}
              </span>
            </div>
            
            <div 
              className="dos-body" 
              style={{
                ...dosStyles.body,
                maxHeight: isExpanded ? '600px' : '0px',
                padding: isExpanded ? '24px' : '0px 24px',
                opacity: isExpanded ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.4s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.2s ease, padding 0.4s ease'
              }}
            >
              <form onSubmit={handleQuickPost} style={dosStyles.inputRow}>
                <span style={dosStyles.prompt}>C:\FEED{'>'} </span>
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    ref={inputRef}
                    style={dosStyles.input}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isExpanded ? "INPUT DATA AND PRESS ENTER..." : ""}
                    autoComplete="off"
                    disabled={isSubmitting || !isExpanded}
                  />
                  {isExpanded && !isSubmitting && inputText.length === 0 && (
                    <div 
                      className="blink" 
                      style={{
                        ...dosStyles.cursor,
                        position: 'absolute',
                        left: 0,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{
                        width: '10px',
                        height: '20px',
                        backgroundColor: '#39ff14',
                        boxShadow: '0 0 5px #39ff14',
                      }} />
                    </div>
                  )}
                  {isSubmitting && <div className="blink" style={{ color: '#39FF14', marginLeft: '12px' }}>...</div>}
                </div>
                {isExpanded && !isSubmitting && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px' }}>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} 
                      style={dosStyles.imageBtn}
                      title="Add Image"
                    >
                      <span style={{ fontSize: '1.6rem', color: selectedImage ? '#39FF14' : '#008F11', fontWeight: 900 }}>
                        +
                      </span>
                    </button>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); handleQuickPost(); }} 
                      style={dosStyles.submitBtn}
                      title="Submit Signal"
                    >
                      <span style={{ fontSize: '1.4rem', color: '#39FF14', fontWeight: 900 }}>
                        ↵
                      </span>
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={onFileChange}
                />
              </form>

              {isExpanded && (
                <div style={{ borderTop: '1px dashed #222', paddingTop: '16px', marginTop: '16px' }}>
                  {selectedImage && (
                    <div style={dosStyles.previewRow}>
                      <span style={dosStyles.tagPrompt}>ATTACHED_FILE: </span>
                      <div style={dosStyles.imageFrame}>
                        <img src={selectedImage} alt="preview" style={dosStyles.previewImage} />
                        <button onClick={() => setSelectedImage(null)} style={dosStyles.closeBtn}>[X]</button>
                      </div>
                    </div>
                  )}

                  <div style={dosStyles.tagRow}>
                    <span style={dosStyles.tagPrompt}>SELECT_TAG: </span>
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={(e) => { e.stopPropagation(); toggleTag(tag); }}
                        style={{
                          ...dosStyles.tagButton,
                          ...(selectedTag === tag ? dosStyles.tagActive : {})
                        }}
                      >
                        {selectedTag === tag ? `[*${tag}]` : `[ ${tag} ]`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {error && (
        <ArcadeBox variant="primary" style={{ marginBottom: '24px', borderColor: 'var(--error)' }}>
          <div style={{ color: 'var(--error)', fontSize: '1rem', fontWeight: 900 }}>
            SIGNAL_INTERRUPTED: {error}
          </div>
        </ArcadeBox>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {filteredItems.map((item) => (
          <ArcadeBox 
            key={item.id} 
            label={feedLabel(item)} 
            variant={item.type === 'lineup_alert' ? 'accent' : 'secondary'}
            onClick={() => {
              if (item.postId) {
                router.push(`/community/${item.postId}`);
              }
            }}
            style={{ cursor: item.postId || item.imageUrl ? 'pointer' : 'default' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: '1.1rem', color: 'var(--arcade-secondary)', marginBottom: '12px', fontWeight: 900, wordBreak: 'break-word' }}>
                  {item.title}
                </h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  {item.imageUrl && (
                    <div
                      style={{
                        ...dosStyles.itemImageFrame,
                        cursor: 'zoom-in',
                        flexShrink: 0,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPreviewImage(item.imageUrl || null);
                      }}
                    >
                      <img src={item.imageUrl} alt="feed-content" style={dosStyles.itemPreviewImage} />
                    </div>
                  )}
                  <p style={{ fontSize: '0.95rem', color: '#fff', opacity: 0.8, lineHeight: '1.4', flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                    {item.body}
                  </p>
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, flexShrink: 0 }}>
                {dayjs(item.createdAt).format('HH:mm:ss')}
              </div>
            </div>
          </ArcadeBox>
        ))}
        {filteredItems.length === 0 && !error && (
          <ArcadeBox label="EMPTY_SIGNAL" variant="default" style={{ textAlign: 'center', padding: '60px' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', fontWeight: 700 }}>
              {selectedTag ? `NO DATA DETECTED FOR '${selectedTag}'.` : 'NO DATA DETECTED IN THIS SECTOR.'}
            </p>
          </ArcadeBox>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedPreviewImage && (
        <div 
          style={modalStyles.overlay} 
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div style={modalStyles.content} onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedPreviewImage} 
              alt="preview-large" 
              style={modalStyles.image} 
            />
            <button 
              style={modalStyles.closeBtn}
              onClick={() => setSelectedPreviewImage(null)}
            >
              [ CLOSE_X ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    cursor: 'zoom-out',
    padding: '20px',
  },
  content: {
    position: 'relative',
    maxWidth: '95%',
    maxHeight: '95%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  image: {
    maxWidth: '100%',
    maxHeight: 'calc(100vh - 120px)',
    objectFit: 'contain',
    border: '4px solid #fff',
    boxShadow: '0 0 30px rgba(255, 0, 255, 0.3)',
  },
  closeBtn: {
    marginTop: '20px',
    backgroundColor: 'var(--arcade-primary)',
    color: '#000',
    border: 'none',
    padding: '8px 24px',
    fontFamily: "'VT323', monospace",
    fontSize: '1.2rem',
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '4px 4px 0 #000',
  }
};

const dosStyles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#000',
    borderRadius: '4px',
    border: '2px solid #333',
    overflow: 'hidden',
    fontFamily: "'VT323', monospace",
    cursor: 'pointer',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  },
  header: {
    backgroundColor: '#1a1a1a',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid #333',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#39ff14',
    boxShadow: '0 0 5px #39ff14',
  },
  headerText: {
    color: '#888',
    fontSize: '12px',
    fontWeight: 900,
    letterSpacing: '1px',
  },
  body: {
    padding: '20px',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    height: '24px',
  },
  prompt: {
    color: '#39ff14',
    fontSize: '1.2rem',
    fontWeight: 900,
    whiteSpace: 'pre',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#39ff14',
    fontSize: '1.2rem',
    fontWeight: 900,
    padding: 0,
    outline: 'none',
    textShadow: '0 0 5px rgba(57, 255, 20, 0.5)',
    caretColor: 'transparent', // Hide the native cursor
  },
  imageBtn: {
    padding: '0 4px',
    color: '#008f11',
    fontWeight: 900,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '0 4px',
    color: '#39ff14',
    fontWeight: 900,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  previewRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '16px',
  },
  imageFrame: {
    width: '80px',
    height: '80px',
    border: '2px solid #39ff14',
    position: 'relative',
    padding: '4px',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: 0.8,
  },
  itemImageFrame: {
    width: '100px',
    height: '100px',
    border: '1px solid rgba(57, 255, 20, 0.3)',
    padding: '4px',
    backgroundColor: '#000',
  },
  itemPreviewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  closeBtn: {
    position: 'absolute',
    top: '-10px',
    right: '-30px',
    color: '#ff0033',
    fontWeight: 900,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  tagRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  tagPrompt: {
    color: '#008f11',
    fontSize: '1rem',
    fontWeight: 700,
  },
  tagButton: {
    color: '#008f11',
    fontSize: '1rem',
    fontWeight: 700,
    transition: 'all 0.2s',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  tagActive: {
    color: '#39ff14',
    textShadow: '0 0 8px rgba(57, 255, 20, 0.8)',
  },
  cursor: {
    width: '10px',
    height: '20px',
    backgroundColor: '#39ff14',
    marginLeft: '4px',
    boxShadow: '0 0 5px #39ff14',
  }
};
