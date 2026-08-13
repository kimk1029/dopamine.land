'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArcadeBox, ArcadeButton } from '@/components/arcade';
import { mediaApi, type AnimeCategory, type MediaVideo } from '@/lib/kujihub/api/media';

function buildYouTubeUrl(video: MediaVideo) {
  return video.isShort
    ? `https://www.youtube.com/shorts/${video.videoId}`
    : `https://www.youtube.com/watch?v=${video.videoId}`;
}

export function MediaPage() {
  const requestIdRef = useRef(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const [categories, setCategories] = useState<AnimeCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [videos, setVideos] = useState<MediaVideo[]>([]);
  const [page, setPage] = useState(1);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  const loadVideos = useCallback(async (reset: boolean, category: AnimeCategory) => {
    if (reset) {
      setLoadingInitial(true);
      setPage(1);
      setHasMore(true);
      pageRef.current = 1;
      hasMoreRef.current = true;
    } else {
      if (loadingMoreRef.current || !hasMoreRef.current) {
        return;
      }
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }

    setError(null);
    const requestId = ++requestIdRef.current;
    const targetPage = reset ? 1 : pageRef.current + 1;

    try {
      const data = await mediaApi.searchVideos(category.query, targetPage, 18);
      if (requestId !== requestIdRef.current) {
        return;
      }

      setVideos((current) => {
        if (reset) {
          return data.items;
        }

        const existingIds = new Set(current.map((item) => item.videoId));
        const nextItems = data.items.filter((item) => !existingIds.has(item.videoId));
        return [...current, ...nextItems];
      });

      setPage(targetPage);
      pageRef.current = targetPage;
      const nextHasMore = data.items.length >= 12;
      setHasMore(nextHasMore);
      hasMoreRef.current = nextHasMore;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '영상 목록을 불러오지 못했습니다.');
      if (reset) {
        setVideos([]);
      }
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingCategories(true);
      setError(null);
      try {
        const items = await mediaApi.getCategories();
        if (cancelled) {
          return;
        }
        setCategories(items);
        setSelectedCategoryId((current) => current ?? items[0]?.id ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : '애니 목록을 불러오지 못했습니다.');
          setLoadingInitial(false);
        }
      } finally {
        if (!cancelled) {
          setLoadingCategories(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCategory) {
      return;
    }

    void loadVideos(true, selectedCategory);
  }, [loadVideos, selectedCategory, selectedCategoryId]);

  useEffect(() => {
    if (!loadMoreRef.current || !selectedCategory) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target?.isIntersecting && !loadingInitial && !loadingMoreRef.current && hasMoreRef.current) {
          void loadVideos(false, selectedCategory);
        }
      },
      { rootMargin: '320px 0px' },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [loadVideos, loadingInitial, selectedCategory, selectedCategoryId]);

  return (
    <div className="animate-in">
      <header style={{ marginBottom: '32px' }}>
        <div style={{ color: 'var(--arcade-primary)', fontWeight: 900, marginBottom: '12px' }}>
          MEDIA ARCHIVE
        </div>
        <h1 style={{ color: 'var(--arcade-secondary)', fontSize: '2.5rem', fontWeight: 900, marginBottom: '16px' }}>
          ANIME x KUJI VIDEO GRID
        </h1>
        <p style={{ color: '#fff', opacity: 0.78, fontWeight: 500, lineHeight: 1.6, maxWidth: '860px' }}>
          애니 카드를 선택하면 `{selectedCategory?.query ?? '애니명 쿠지'}` 기준으로 유튜브 영상을 불러옵니다.
          아래 그리드는 무한 스크롤로 계속 이어집니다.
        </p>
      </header>

      <ArcadeBox label="ANIME LIST" variant="primary" style={{ marginBottom: '28px' }}>
        {loadingCategories ? (
          <div className="blink" style={{ color: 'var(--arcade-primary)', fontWeight: 900 }}>
            LOADING_ANIME_INDEX...
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(124px, 1fr))',
            gap: '10px',
          }}>
            {categories.map((category) => {
              const active = category.id === selectedCategoryId;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  style={{
                    minHeight: '154px',
                    padding: 0,
                    border: active ? `3px solid ${category.accentColor || 'var(--arcade-primary)'}` : '2px solid rgba(255,255,255,0.12)',
                    background: 'linear-gradient(135deg, rgba(8, 18, 32, 0.95), rgba(40, 10, 48, 0.95))',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'stretch',
                    boxShadow: active ? `0 0 24px ${category.accentColor || 'rgba(255,255,255,0.2)'}` : 'none',
                    transition: 'transform 0.18s ease, border-color 0.18s ease',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        padding: '8px',
                        boxSizing: 'border-box',
                        background: 'rgba(4, 8, 18, 0.92)',
                      }}
                    />
                  ) : null}
                  <div style={{
                    width: '100%',
                    padding: '12px 10px',
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.96))',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    position: 'relative',
                  }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 900, marginBottom: '5px', lineHeight: 1.18 }}>{category.name}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.75, lineHeight: 1.2 }}>{category.query}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ArcadeBox>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: 'var(--arcade-accent)', fontWeight: 900 }}>
            {selectedCategory ? `${selectedCategory.name} RESULT GRID` : 'RESULT GRID'}
          </div>
          <div style={{ marginTop: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
            {videos.length}개 로드됨 {hasMore ? '· 더 불러오는 중' : '· 마지막 목록'}
          </div>
        </div>
        {selectedCategory ? (
          <ArcadeButton variant="secondary" size="sm" onClick={() => void loadVideos(true, selectedCategory)}>
            REFRESH
          </ArcadeButton>
        ) : null}
      </div>

      {error ? (
        <ArcadeBox variant="primary" style={{ marginBottom: '24px', borderColor: 'var(--error)' }}>
          <div style={{ color: 'var(--error)', fontWeight: 900 }}>
            MEDIA_LOAD_ERROR: {error}
          </div>
        </ArcadeBox>
      ) : null}

      {loadingInitial ? (
        <ArcadeBox label="VIDEO GRID" variant="secondary">
          <div className="blink" style={{ color: 'var(--arcade-primary)', fontWeight: 900 }}>
            SCANNING_YOUTUBE_ARCHIVE...
          </div>
        </ArcadeBox>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '18px',
          }}>
            {videos.map((video) => (
              <button
                key={`${video.videoId}-${video.id}`}
                type="button"
                onClick={() => window.open(buildYouTubeUrl(video), '_blank', 'noopener,noreferrer')}
                style={{
                  padding: 0,
                  border: '2px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.45)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  color: '#fff',
                }}
              >
                <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#05070c' }}>
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    padding: '5px 8px',
                    background: video.isShort ? 'var(--arcade-accent)' : 'rgba(0,0,0,0.72)',
                    color: video.isShort ? '#000' : '#fff',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                  }}>
                    {video.isShort ? 'SHORTS' : video.duration || 'VIDEO'}
                  </div>
                </div>

                <div style={{ padding: '16px' }}>
                  <div style={{
                    color: 'var(--arcade-secondary)',
                    fontWeight: 900,
                    lineHeight: 1.45,
                    minHeight: '3em',
                    marginBottom: '10px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {video.title}
                  </div>
                  <div style={{ color: '#fff', fontSize: '0.86rem', fontWeight: 700, marginBottom: '8px' }}>
                    {video.creator}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', marginBottom: '12px' }}>
                    {[video.views, video.published].filter(Boolean).join(' · ') || selectedCategory?.query}
                  </div>
                  <div style={{
                    color: 'rgba(255,255,255,0.68)',
                    fontSize: '0.8rem',
                    lineHeight: 1.5,
                    minHeight: '3.6em',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {video.description || `${selectedCategory?.name ?? '애니'} 관련 쿠지 영상`}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {!loadingInitial && videos.length === 0 ? (
            <ArcadeBox label="EMPTY" variant="default" style={{ marginTop: '24px' }}>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>
                표시할 영상이 없습니다. 다른 애니 리스트를 선택해보세요.
              </div>
            </ArcadeBox>
          ) : null}

          <div ref={loadMoreRef} style={{ height: '1px' }} />

          <div style={{ display: 'flex', justifyContent: 'center', padding: '26px 0 8px' }}>
            {loadingMore ? (
              <div className="blink" style={{ color: 'var(--arcade-primary)', fontWeight: 900 }}>
                LOADING_MORE_VIDEOS...
              </div>
            ) : !hasMore && videos.length > 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                더 표시할 영상이 없습니다.
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
