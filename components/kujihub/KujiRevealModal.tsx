'use client'

import { useState } from 'react';
import type { KujiReserveResult } from '@/lib/kujihub/types/kujiDraw';
import { ArcadeBox, ArcadeButton } from '@/components/arcade';

interface KujiRevealModalProps {
  results: KujiReserveResult[];
  onFinish: () => void;
}

export function KujiRevealModal({ results, onFinish }: KujiRevealModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isPeeling, setIsPeeling] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [completed, setCompleted] = useState(false);

  const currentResult = results[currentIndex];

  const handleReveal = () => {
    if (revealed || isPeeling) return;
    
    setIsPeeling(true);
    // Tense delay for peeling animation
    setTimeout(() => {
      setRevealed(true);
      setIsPeeling(false);
      
      // Show fireworks if it's a high-grade prize (A, B, or Special)
      if (['A', 'B', 'S', 'LAST', 'SP'].includes(currentResult.grade.toUpperCase())) {
        setShowFireworks(true);
        setTimeout(() => setShowFireworks(false), 3000);
      }
    }, 1500);
  };

  const nextTicket = () => {
    if (currentIndex < results.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setRevealed(false);
    } else {
      setCompleted(true);
    }
  };

  // Fireworks effect
  const renderFireworks = () => {
    if (!showFireworks) return null;
    return (
      <div className="fireworks-container">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="firework" style={{ 
            left: `${Math.random() * 100}%`, 
            top: `${Math.random() * 100}%`,
            backgroundColor: ['#ff00ff', '#00ffff', '#39ff14', '#ffff00', '#ff0000'][Math.floor(Math.random() * 5)],
            animationDelay: `${Math.random() * 0.5}s`
          }} />
        ))}
      </div>
    );
  };

  if (completed) {
    return (
      <div className="reveal-overlay arcade-body crt scanlines">
        <div className="animate-in" style={{ width: 'min(600px, 95%)' }}>
          <ArcadeBox label="FINAL_RESULTS" variant="primary">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              {results.map((r, i) => (
                <div key={i} style={{ 
                  padding: '16px', 
                  border: '2px solid rgba(255,255,255,0.1)', 
                  textAlign: 'center',
                  background: 'rgba(0,0,0,0.3)'
                }}>
                  <div style={{ 
                    width: '50px', 
                    height: '50px', 
                    backgroundColor: r.color, 
                    color: '#000', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    fontFamily: 'Press Start 2P, cursive',
                    fontSize: '1.2rem',
                    border: '4px solid #000'
                  }}>
                    {r.grade}
                  </div>
                  <div className="arcade-font-pixel" style={{ fontSize: '0.6rem', color: '#fff' }}>{r.name}</div>
                </div>
              ))}
            </div>
            <ArcadeButton variant="accent" size="lg" style={{ width: '100%' }} onClick={onFinish}>
              CLAIM_PRIZES & EXIT
            </ArcadeButton>
          </ArcadeBox>
        </div>
      </div>
    );
  }

  return (
    <div className="reveal-overlay arcade-body crt scanlines">
      {renderFireworks()}
      
      <div className="reveal-container animate-in">
        <div className="arcade-font-pixel" style={{ color: 'var(--arcade-secondary)', letterSpacing: '2px', fontSize: '0.8rem' }}>
          SIGNAL {currentIndex + 1} / {results.length}
        </div>

        <div className={`kuji-ticket-container ${revealed ? 'is-revealed' : ''} ${isPeeling ? 'is-peeling' : ''}`}>
          {/* Back of the ticket (Hidden state) */}
          <div className="kuji-ticket-back" onClick={handleReveal} style={{ background: 'var(--arcade-surface)', border: '6px solid var(--arcade-primary)' }}>
            <div className="ticket-pattern" style={{ border: '2px dashed var(--arcade-primary)' }}></div>
            <div className="arcade-font-pixel blink" style={{ fontSize: '0.9rem', color: 'var(--arcade-accent)' }}>TAP_TO_PEEL</div>
            <div className="arcade-font-pixel" style={{ position: 'absolute', bottom: '20px', fontSize: '0.5rem', color: 'var(--arcade-primary)' }}>KUJIHUB_SYSTEM</div>
          </div>

          {/* Front of the ticket (Revealed state) */}
          <div className="kuji-ticket-front" style={{ background: '#000', border: '6px solid var(--arcade-secondary)' }}>
            <div className="arcade-font-pixel" style={{ fontSize: '8rem', color: currentResult.color, textShadow: '6px 6px 0px rgba(255,255,255,0.1)' }}>
              {currentResult.grade}
            </div>
            <div className="arcade-font-pixel" style={{ fontSize: '0.8rem', color: '#fff', textAlign: 'center', margin: '20px 0' }}>
              {currentResult.name}
            </div>
            <div className="arcade-font-pixel" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>
              SLOT_LINK #{currentResult.slotNumber}
            </div>
          </div>
        </div>

        <div className="reveal-actions">
          {revealed ? (
            <ArcadeButton variant="primary" size="lg" onClick={nextTicket} className="coin-btn">
              {currentIndex < results.length - 1 ? 'NEXT_SIGNAL' : 'REVEAL_SUMMARY'}
            </ArcadeButton>
          ) : (
            <p className="arcade-font-pixel" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>
              INITIATING DECRYPTION...
            </p>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .reveal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 10, 26, 0.98);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .reveal-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
          width: 100%;
          max-width: 400px;
        }

        .kuji-ticket-container {
          width: 300px;
          height: 420px;
          position: relative;
          perspective: 1200px;
          cursor: pointer;
        }

        .kuji-ticket-back, .kuji-ticket-front {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .kuji-ticket-back {
          z-index: 2;
        }

        .kuji-ticket-front {
          transform: rotateY(180deg);
        }

        .is-revealed .kuji-ticket-back {
          transform: rotateY(180deg);
        }

        .is-revealed .kuji-ticket-front {
          transform: rotateY(0deg);
        }

        .is-peeling .kuji-ticket-back {
          animation: peel-shake 0.1s infinite;
        }

        @keyframes peel-shake {
          0% { transform: translate(0, 0); }
          25% { transform: translate(2px, -2px); }
          50% { transform: translate(-2px, 2px); }
          75% { transform: translate(2px, 2px); }
          100% { transform: translate(0, 0); }
        }

        .ticket-pattern {
          position: absolute;
          inset: 12px;
        }

        /* Fireworks */
        .fireworks-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1100;
        }

        .firework {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 2px;
          animation: explode 0.8s ease-out forwards;
        }

        @keyframes explode {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(40); opacity: 0; }
        }
      `}} />
    </div>
  );
}
