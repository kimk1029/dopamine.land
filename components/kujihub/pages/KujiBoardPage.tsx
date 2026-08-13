'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ensureKujiPlayer, kujiDrawApi } from '@/lib/kujihub/api/kujiDraw';
import type { KujiBoardResponse, KujiPlayer, KujiReserveResult, KujiDetail } from '@/lib/kujihub/types/kujiDraw';
import { ArcadeBox, ArcadeButton } from '@/components/arcade';
import { KujiRevealModal } from '@/components/kujihub/KujiRevealModal';

function sortNumeric(values: number[]) {
  return [...values].sort((a, b) => a - b);
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error || fallback;
  }
  return fallback;
}

export function KujiBoardPage() {
  const { id, purchaseId } = useParams<{ id: string; purchaseId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const quantity = Number(searchParams.get('qty') || '1');
  
  const [player, setPlayer] = useState<KujiPlayer | null>(null);
  const [board, setBoard] = useState<KujiBoardResponse | null>(null);
  const [kuji, setKuji] = useState<KujiDetail | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [results, setResults] = useState<KujiReserveResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [boardData, ensuredPlayer, kujiData] = await Promise.all([
        kujiDrawApi.getBoard(id), 
        ensureKujiPlayer(),
        kujiDrawApi.getOne(id)
      ]);
      setBoard(boardData);
      setPlayer(ensuredPlayer);
      setKuji(kujiData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '보드를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const prizeStatus = useMemo(() => {
    if (!kuji || !board) return [];
    
    // In a real app, the server would provide the counts. 
    // Here we'll just group drawn slots by grade to show what's been taken.
    const drawnGrades: Record<string, number> = {};
    Object.values(board.slots).forEach(slot => {
      if (slot.status === 'drawn' && slot.grade) {
        drawnGrades[slot.grade] = (drawnGrades[slot.grade] || 0) + 1;
      }
    });

    return kuji.prizes.map(p => ({
      ...p,
      drawn: drawnGrades[p.grade] || 0
    }));
  }, [kuji, board]);

  const remainingTotal = useMemo(() => {
    if (!board) return 0;
    return 80 - Object.values(board.slots).filter((slot) => slot.status === 'drawn').length;
  }, [board]);

  const handleFinishReveal = async () => {
    if (!id || !purchaseId) return;
    try {
      await kujiDrawApi.complete(id, purchaseId, selectedSlots);
      router.push('/kuji');
    } catch (e) {
      console.error('Failed to complete draw', e);
      router.push('/kuji');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="blink" style={{ color: 'var(--arcade-primary)', fontSize: '1.5rem', fontWeight: 900 }}>
        INITIALIZING MATRIX...
      </div>
    </div>
  );

  return (
    <div className="animate-in">
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ color: 'var(--arcade-secondary)', fontSize: '2.5rem', fontWeight: 900, marginBottom: '8px' }}>
            SLOT_MATRIX_v2.0
          </h1>
          <p style={{ color: '#fff', fontSize: '1rem', opacity: 0.8, fontWeight: 700 }}>
            {remainingTotal} SECTORS REMAINING IN UNIT_{id}
          </p>
        </div>
        <ArcadeBox label="WALLET" variant="accent" isChunky={false} style={{ padding: '12px 24px' }}>
          <div style={{ fontSize: '1.5rem', color: 'var(--arcade-accent)', fontWeight: 900 }}>
            {player?.points.toLocaleString()} P
          </div>
        </ArcadeBox>
      </header>

      <div className="detail-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '40px' }}>
        {/* Left: The Board */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <ArcadeBox label="MAIN_BOARD_INTERFACE" variant="default" style={{ padding: '40px' }}>
            <div className="kuji-board-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(10, 1fr)', 
              gap: '12px',
              background: 'rgba(0,0,0,0.5)',
              padding: '24px',
              border: '4px solid rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)'
            }}>
              {Array.from({ length: 80 }, (_, i) => i + 1).map((slot) => {
                const info = board?.slots?.[String(slot)];
                const isDrawn = info?.status === 'drawn';
                const isLocked = info?.status === 'locked';
                const isSelected = selectedSlots.includes(slot);
                
                return (
                  <button
                    key={slot}
                    disabled={isDrawn || isLocked || reserving}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedSlots(selectedSlots.filter((s) => s !== slot));
                      } else if (selectedSlots.length < quantity) {
                        setSelectedSlots([...selectedSlots, slot]);
                      }
                    }}
                    style={{
                      aspectRatio: '1',
                      fontSize: '1rem',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: (isDrawn || isLocked) ? 'not-allowed' : 'pointer',
                      background: isDrawn 
                        ? (info?.color || '#333')
                        : isSelected 
                          ? 'var(--arcade-accent)' 
                          : 'var(--arcade-surface)',
                      border: '2px solid',
                      borderColor: isSelected 
                        ? '#fff' 
                        : isDrawn 
                          ? 'rgba(0,0,0,0.2)' 
                          : '#333',
                      color: isSelected ? '#000' : isDrawn ? '#fff' : 'rgba(255,255,255,0.4)',
                      opacity: isLocked && !isDrawn ? 0.6 : 1,
                      transition: 'all 0.1s steps(2)',
                      position: 'relative',
                      boxShadow: isSelected ? '0 0 15px var(--arcade-accent)' : 'none',
                      transform: isSelected ? 'scale(1.05)' : 'none',
                      zIndex: isSelected ? 10 : 1,
                      overflow: 'hidden',
                      imageRendering: 'pixelated'
                    }}
                  >
                    {isDrawn ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '100%', height: '100%', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1.25rem', textShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}>{info?.grade}</span>
                        <div style={{ 
                          position: 'absolute', 
                          top: '2px', 
                          right: '-10px', 
                          background: 'var(--arcade-error)', 
                          color: '#fff', 
                          fontSize: '0.5rem', 
                          padding: '1px 12px',
                          transform: 'rotate(15deg)',
                          fontWeight: 900,
                          boxShadow: '2px 2px 0 rgba(0,0,0,0.3)'
                        }}>HIT!</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ 
                          position: 'absolute', 
                          left: 0, 
                          top: 0, 
                          bottom: 0, 
                          width: '4px', 
                          background: 'rgba(0,0,0,0.2)',
                          borderRight: '1px dashed rgba(255,255,255,0.1)'
                        }} />
                        {isSelected ? '✓' : slot}
                        <div style={{ 
                          position: 'absolute', 
                          bottom: 0, 
                          left: 0, 
                          right: 0, 
                          height: '2px', 
                          background: 'rgba(0,0,0,0.3)' 
                        }} />
                      </>
                    )}
                    
                    {isLocked && !isDrawn && (
                      <div className="blink" style={{ 
                        position: 'absolute', 
                        inset: 0, 
                        border: '2px solid var(--arcade-primary)',
                        background: 'rgba(255,0,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.6rem',
                        color: 'var(--arcade-primary)'
                      }}>LOCKED</div>
                    )}
                  </button>
                );
              })}
            </div>
          </ArcadeBox>

          <ArcadeBox label="SYSTEM_LOG" variant="secondary">
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
              {`> SECURE CONNECTION ESTABLISHED...`} <br/>
              {`> TARGET_UNIT: ${kuji?.title}`} <br/>
              {`> SCANNING FOR HIGH-GRADE PRIZES... READY.`}
            </p>
          </ArcadeBox>
        </div>

        {/* Right: Actions & Prize Status */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Prize Intel */}
          <ArcadeBox label="PRIZE_INTEL" variant="secondary">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {prizeStatus.map((prize, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px',
                  padding: '10px',
                  background: 'rgba(0,0,0,0.3)',
                  border: `2px solid ${prize.color}44`
                }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    background: prize.color, 
                    color: '#000', 
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    border: '3px solid #000'
                  }}>
                    {prize.grade}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#fff' }}>{prize.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                      STATUS: {prize.drawn > 0 ? `${prize.drawn} TAKEN` : 'STILL IN BOARD'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ArcadeBox>

          {/* Action Panel */}
          <ArcadeBox label="ACTION_CONSOLE" variant="primary">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'rgba(255,255,255,0.6)' }}>REQ_SLOTS:</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--arcade-primary)' }}>{quantity}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'rgba(255,255,255,0.6)' }}>SELECTED:</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--arcade-accent)' }}>{selectedSlots.length}</span>
              </div>

              <div style={{ 
                minHeight: '100px', 
                background: 'rgba(0,0,0,0.5)', 
                border: '3px dashed rgba(255,255,255,0.2)', 
                padding: '16px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                alignContent: 'flex-start'
              }}>
                {sortNumeric(selectedSlots).map(s => (
                  <div key={s} className="animate-in" style={{ 
                    padding: '6px 12px', 
                    background: 'var(--arcade-primary)', 
                    color: '#000', 
                    fontSize: '0.9rem',
                    fontWeight: 900,
                    boxShadow: '4px 4px 0 rgba(0,0,0,0.5)'
                  }}>#{s}</div>
                ))}
                {selectedSlots.length === 0 && (
                  <div className="blink" style={{ fontSize: '0.85rem', opacity: 0.4, margin: 'auto', fontWeight: 900, textAlign: 'center' }}>
                    AWAITING INPUT... <br/> SELECT {quantity} SECTORS
                  </div>
                )}
              </div>

              {error && (
                <div style={{ color: 'var(--error)', fontSize: '0.85rem', fontWeight: 900, textAlign: 'center', padding: '10px', background: 'rgba(255,0,0,0.1)', border: '1px solid var(--error)' }}>
                  [ ERROR: {error} ]
                </div>
              )}

              <div style={{ marginTop: '12px' }}>
                <ArcadeButton
                  variant="accent"
                  className="coin-btn"
                  disabled={selectedSlots.length !== quantity || reserving}
                  onClick={async () => {
                    if (!id || !purchaseId || !player) return;
                    setReserving(true);
                    setError(null);
                    try {
                      const res = await kujiDrawApi.reserve(id, selectedSlots, player.id, purchaseId);
                      setResults(res);
                    } catch (e) {
                      setError(getApiErrorMessage(e, 'RESERVATION_FAILED'));
                    } finally {
                      setReserving(false);
                    }
                  }}
                  style={{ width: '100%', fontSize: '1.25rem' }}
                >
                  {reserving ? 'RESERVING...' : 'INITIATE_DRAW'}
                </ArcadeButton>
                
                <ArcadeButton variant="secondary" size="sm" onClick={() => router.push('/kuji')} style={{ width: '100%', marginTop: '16px' }}>
                  ABORT_MISSION
                </ArcadeButton>
              </div>
            </div>
          </ArcadeBox>
        </aside>
      </div>

      {results.length > 0 && (
        <KujiRevealModal
          results={results}
          onFinish={handleFinishReveal}
        />
      )}
    </div>
  );
}
