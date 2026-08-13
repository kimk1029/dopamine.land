'use client'

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ensureKujiPlayer, kujiDrawApi } from '@/lib/kujihub/api/kujiDraw';
import type { KujiListItem, KujiPlayer } from '@/lib/kujihub/types/kujiDraw';
import { ArcadeBox, ArcadeButton } from '@/components/arcade';

export function KujiListPage() {
  const [items, setItems] = useState<KujiListItem[]>([]);
  const [player, setPlayer] = useState<KujiPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompactLayout, setIsCompactLayout] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768
  );
  const router = useRouter();

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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, ensuredPlayer] = await Promise.all([kujiDrawApi.getList(), ensureKujiPlayer()]);
      setItems(list);
      setPlayer(ensuredPlayer);
    } catch (e) {
      setError(e instanceof Error ? e.message : '쿠지 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="blink" style={{ color: 'var(--arcade-primary)', fontSize: '1.5rem', fontWeight: 900 }}>
          LOADING DATA...
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <header className="kuji-list-header" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ color: 'var(--arcade-secondary)', fontSize: '2rem', marginBottom: '16px', fontWeight: 900 }}>
            SELECT MACHINE
          </h1>
          <p style={{ color: '#fff', fontSize: '0.9rem', opacity: 0.8, fontWeight: 500 }}>
            CHOOSE YOUR DESTINY. EVERY DRAW IS A NEW CHANCE.
          </p>
        </div>
        <ArcadeBox label={isCompactLayout ? undefined : 'PLAYER_WALLET'} variant="accent" isChunky={false} className="kuji-wallet-box">
          <div className="kuji-wallet-value" style={{ fontSize: '1.25rem', color: 'var(--arcade-accent)', fontWeight: 900 }}>
            {player ? `${player.points.toLocaleString()} P` : '0 P'}
          </div>
        </ArcadeBox>
      </header>

      {error && (
        <ArcadeBox variant="primary" style={{ marginBottom: '24px', borderColor: 'var(--error)' }}>
          <div style={{ color: 'var(--error)', fontSize: '1rem', fontWeight: 900 }}>
            ERROR: {error}
          </div>
        </ArcadeBox>
      )}

      <div className="arcade-grid" style={{ padding: 0 }}>
        {items.map((item) => (
          <ArcadeBox 
            key={item.id} 
            label={item.remaining === 0 ? "SOLD_OUT" : "ACTIVE"} 
            variant={item.remaining === 0 ? "default" : "secondary"}
            className="kuji-card-arcade"
            style={{ opacity: item.remaining === 0 ? 0.6 : 1 }}
          >
            <div className="kuji-img-placeholder" style={{ height: '180px', overflow: 'hidden', padding: 0 }}>
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl} 
                  alt={item.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'auto' }} 
                />
              ) : (
                <div style={{ fontSize: '3rem' }}>
                  {item.remaining === 0 ? '💀' : '🎁'}
                </div>
              )}
            </div>
            <div style={{ padding: '20px 0 0' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '12px', height: '3rem', overflow: 'hidden', fontWeight: 900 }}>
                {item.title}
              </h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '1.1rem', color: 'var(--arcade-accent)', fontWeight: 900 }}>
                  {item.price.toLocaleString()} P
                </span>
                <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>
                  {item.remaining}/{item.boardSize} LEFT
                </span>
              </div>
              <ArcadeButton 
                variant={item.remaining === 0 ? "primary" : "secondary"} 
                size="sm" 
                style={{ width: '100%' }}
                disabled={item.remaining === 0}
                onClick={() => router.push(`/kuji/${item.id}`)}
              >
                {item.remaining === 0 ? "GAME OVER" : "INSERT COIN"}
              </ArcadeButton>
            </div>
          </ArcadeBox>
        ))}
      </div>
    </div>
  );
}
