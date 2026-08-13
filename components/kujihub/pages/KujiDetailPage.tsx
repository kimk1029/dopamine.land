'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import { ensureKujiPlayer, kujiDrawApi } from '@/lib/kujihub/api/kujiDraw';
import type { KujiDetail, KujiPlayer } from '@/lib/kujihub/types/kujiDraw';
import { ArcadeBox, ArcadeButton } from '@/components/arcade';

export function KujiDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [kuji, setKuji] = useState<KujiDetail | null>(null);
  const [player, setPlayer] = useState<KujiPlayer | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompactLayout, setIsCompactLayout] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768
  );

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
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, ensuredPlayer] = await Promise.all([kujiDrawApi.getOne(id), ensureKujiPlayer()]);
      setKuji(detail);
      setPlayer(ensuredPlayer);
    } catch (e) {
      setError(e instanceof Error ? e.message : '쿠지 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(() => (kuji ? kuji.price * quantity : 0), [kuji, quantity]);
  const canAfford = (player?.points ?? 0) >= total;

  function getPurchaseError(error: unknown) {
    if (axios.isAxiosError<{ error?: string }>(error)) {
      return error.response?.data?.error;
    }
    return undefined;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="blink" style={{ color: 'var(--arcade-primary)', fontSize: '1.5rem', fontWeight: 900 }}>
          SCANNING MACHINE...
        </div>
      </div>
    );
  }

  if (!kuji) {
    return (
      <div className="animate-in">
        <ArcadeBox variant="primary" label="ERROR">
          <p style={{ color: 'var(--error)', fontWeight: 900 }}>
            {error ?? 'MACHINE_NOT_FOUND'}
          </p>
          <ArcadeButton variant="secondary" onClick={() => router.push('/kuji')} style={{ marginTop: '20px' }}>
            BACK_TO_LIST
          </ArcadeButton>
        </ArcadeBox>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <header className="kuji-detail-header" style={{ marginBottom: '24px' }}>
        <div style={{ color: 'var(--arcade-primary)', fontWeight: 900, marginBottom: '12px' }}>
          KUJI SELECT
        </div>
        <h1 style={{ color: 'var(--arcade-secondary)', fontSize: isCompactLayout ? '1.34rem' : '2rem', marginBottom: '14px', fontWeight: 900, lineHeight: 1.25, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          {kuji.title}
        </h1>
        <p style={{ color: '#fff', fontSize: isCompactLayout ? '0.84rem' : '1rem', opacity: 0.8, fontWeight: 500, lineHeight: 1.7, maxWidth: '920px' }}>
          {kuji.description || '쿠지 상세 정보와 보상 목록을 확인한 뒤 원하는 수량만큼 바로 시작할 수 있습니다.'}
        </p>
      </header>

      <div className="kuji-detail-shell" style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <div
          className="kuji-detail-top-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: isCompactLayout ? '1fr' : 'minmax(260px, 0.85fr) minmax(320px, 1.1fr) minmax(220px, 0.85fr)',
            gap: isCompactLayout ? '14px' : '20px',
            alignItems: 'stretch',
            marginBottom: '22px',
          }}
        >
          <ArcadeBox label="STATUS" variant="secondary">
            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.65, fontWeight: 900 }}>REMAINING</span>
                <span style={{ fontSize: '1.4rem', color: 'var(--arcade-secondary)', fontWeight: 900 }}>
                  {kuji.remaining}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.65, fontWeight: 900 }}>BOARD</span>
                <span style={{ fontSize: '1.1rem', color: 'var(--arcade-primary)', fontWeight: 900 }}>
                  {kuji.boardSize}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.65, fontWeight: 900 }}>PRICE</span>
                <span style={{ fontSize: '1.1rem', color: 'var(--arcade-accent)', fontWeight: 900 }}>
                  {kuji.price.toLocaleString()} P
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.65, fontWeight: 900 }}>TIERS</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 900 }}>{kuji.prizes.length}</span>
              </div>
            </div>
          </ArcadeBox>

          <ArcadeBox label="PURCHASE CONSOLE" variant="primary" className="kuji-purchase-console" style={{ width: '100%', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: isCompactLayout ? '16px' : '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>PLAYER_CREDITS</span>
                <span style={{ fontSize: '1.1rem', color: 'var(--arcade-accent)', fontWeight: 900 }}>
                  {player?.points.toLocaleString() ?? 0} P
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>UNIT_PRICE</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 900 }}>
                  {kuji.price.toLocaleString()} P
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isCompactLayout ? 'stretch' : 'center', flexDirection: isCompactLayout ? 'column' : 'row', padding: '8px 0', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>QUANTITY</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCompactLayout ? 'space-between' : 'flex-start', gap: '16px', width: isCompactLayout ? '100%' : 'auto' }}>
                  <ArcadeButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setQuantity((v) => Math.max(1, v - 1))}
                    style={{ padding: isCompactLayout ? '6px 14px' : '4px 12px' }}
                  >-</ArcadeButton>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900 }}>{quantity}</span>
                  <ArcadeButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setQuantity((v) => Math.min(Math.min(10, kuji.remaining), v + 1))}
                    style={{ padding: isCompactLayout ? '6px 14px' : '4px 12px' }}
                  >+</ArcadeButton>
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: isCompactLayout ? '14px' : '16px', border: '2px solid var(--arcade-primary)', marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isCompactLayout ? 'stretch' : 'center', flexDirection: isCompactLayout ? 'column' : 'row', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 900 }}>TOTAL_COST</span>
                  <span style={{ fontSize: isCompactLayout ? '1.2rem' : '1.5rem', color: 'var(--arcade-primary)', fontWeight: 900 }}>
                    {total.toLocaleString()} P
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isCompactLayout ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <ArcadeButton
                  variant="accent"
                  className="coin-btn"
                  disabled={submitting || kuji.remaining === 0 || !canAfford}
                  onClick={async () => {
                    if (!id || !player) return;
                    setSubmitting(true);
                    setError(null);
                    try {
                      const response = await kujiDrawApi.createPurchase(id, quantity, player.id);
                      setPlayer(response.player);
                      router.push(`/kuji/${id}/board/${response.purchase.id}?qty=${quantity}`);
                    } catch (e) {
                      const apiError = getPurchaseError(e);
                      if (apiError === 'insufficient_points') setError('INSUFFICIENT_CREDITS');
                      else if (apiError === 'not_enough_slots') setError('MACHINE_EMPTY');
                      else setError('TRANSACTION_FAILED');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  style={{ width: '100%', minHeight: isCompactLayout ? '48px' : undefined }}
                >
                  {submitting ? 'SYNCING...' : kuji.remaining === 0 ? 'SOLD_OUT' : !canAfford ? 'NO_CREDITS' : 'START_GAME'}
                </ArcadeButton>
                <ArcadeButton variant="secondary" size="sm" onClick={() => router.push('/kuji')} style={{ width: '100%', minHeight: isCompactLayout ? '46px' : undefined }}>
                  EXIT_MACHINE
                </ArcadeButton>
              </div>

              {error ? (
                <div style={{ color: 'var(--error)', fontSize: '0.8rem', textAlign: 'center', fontWeight: 900 }}>
                  [ ERROR: {error} ]
                </div>
              ) : null}
            </div>
          </ArcadeBox>

          <ArcadeBox label="GUIDE" variant="default">
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.82rem', lineHeight: 1.55 }}>
                수량을 먼저 고른 뒤 시작하면 다음 화면에서 실제 슬롯을 선택합니다.
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {kuji.prizes.map((prize) => (
                  <div key={prize.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '0.76rem' }}>
                    <span style={{ color: prize.color, fontWeight: 900 }}>{prize.grade}</span>
                    <span style={{ color: 'rgba(255,255,255,0.68)' }}>
                      {(prize.chance * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ArcadeBox>
        </div>

        <ArcadeBox label="PRIZE STOCK" variant="secondary">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fit, minmax(${isCompactLayout ? '140px' : '220px'}, 1fr))`,
              gap: isCompactLayout ? '8px' : '12px',
            }}
          >
              {kuji.prizes.map((prize, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 12px',
                    background: 'rgba(0,0,0,0.24)',
                    border: `1px solid ${prize.color}55`,
                    minHeight: '104px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ color: prize.color, fontSize: '1.2rem', fontWeight: 900 }}>
                      {prize.grade}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
                      {prize.remainingCount} / {prize.totalCount}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 700, lineHeight: 1.4 }}>
                    {prize.name}
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${prize.totalCount > 0 ? (prize.remainingCount / prize.totalCount) * 100 : 0}%`,
                        height: '100%',
                        background: prize.color,
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.62)' }}>
                    <span>TOTAL {prize.totalCount}</span>
                    <span>LEFT {prize.remainingCount}</span>
                  </div>
                </div>
              ))}
          </div>
        </ArcadeBox>
      </div>
    </div>
  );
}
