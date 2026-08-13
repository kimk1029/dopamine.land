'use client'

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import '@/styles/kujihub/calculator.css';

const DEFAULT_TICKET_PRICE = 1000;

function num(s: string): number {
  const v = parseInt(String(s).replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(v) ? 0 : v;
}

function clean(raw: string): string {
  return raw.replace(/[^0-9]/g, '').slice(0, 6);
}

function pct(v: number): string {
  return v >= 0.9995 ? '100' : (v * 100).toFixed(1);
}

const stepBtn: CSSProperties = {
  height: 44,
  border: '1px solid #2b2b52',
  background: '#12122c',
  color: '#4ff5e8',
  fontSize: 16,
};

const numRowBtn: CSSProperties = {
  width: 44,
  border: 'none',
  borderLeft: '1px solid #2b2b52',
  background: '#12122c',
  fontSize: 18,
};

const numRowInput: CSSProperties = {
  width: 56,
  background: '#0a0a1e',
  border: 'none',
  borderLeft: '1px solid #2b2b52',
  color: '#f2f3ff',
  fontSize: 18,
  textAlign: 'center',
  padding: '6px 0',
};

interface CalcState {
  total: string;
  wish: string;
  wishDrawn: number;
  otherDrawn: string;
}

/** 전체 장수를 기준으로 모든 하위 값을 범위 안으로 클램핑 */
function normalize(next: CalcState): CalcState {
  const tn = num(next.total);
  let wish = next.wish;
  if (next.total !== '' && tn >= 0 && wish !== '' && num(wish) > tn) {
    wish = String(tn);
  }
  const wn = num(wish);
  const wishDrawn = Math.min(Math.max(next.wishDrawn, 0), wn);
  let otherDrawn = next.otherDrawn;
  if (next.total !== '' && otherDrawn !== '') {
    const maxOther = Math.max(tn - wn, 0);
    if (num(otherDrawn) > maxOther) otherDrawn = String(maxOther);
  }
  return { total: next.total, wish, wishDrawn, otherDrawn };
}

function NumRow({
  label,
  code,
  edge,
  value,
  onChange,
  onBump,
}: {
  label: string;
  code: string;
  edge: string;
  value: string;
  onChange: (raw: string) => void;
  onBump: (delta: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid #2b2b52', background: 'rgba(12,12,32,.75)' }}>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          borderLeft: `3px solid ${edge}`,
          overflow: 'hidden',
        }}
      >
        <span style={{ fontSize: 12, color: '#e8e9ff', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontSize: 8, color: '#6f74b8', letterSpacing: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{code}</span>
      </div>
      <button type="button" onClick={() => onBump(-1)} style={{ ...numRowBtn, color: '#8f93d6' }}>
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        style={numRowInput}
      />
      <button type="button" onClick={() => onBump(1)} style={{ ...numRowBtn, color: '#4ff5e8' }}>
        ＋
      </button>
    </div>
  );
}

export function CalculatorPage() {
  const [state, setState] = useState<CalcState>({ total: '', wish: '', wishDrawn: 0, otherDrawn: '' });
  const [nRaw, setNRaw] = useState(10);
  const [priceRaw, setPriceRaw] = useState(String(DEFAULT_TICKET_PRICE));

  const update = (patch: Partial<CalcState>) => {
    setState(prev => normalize({ ...prev, ...patch }));
  };

  const totalNum = num(state.total);
  const wishNum = num(state.wish);
  const maxOther = state.total !== '' ? Math.max(totalNum - wishNum, 0) : 999999;

  const calc = useMemo(() => {
    const total = num(state.total);
    const wish = num(state.wish);
    const wishDrawn = Math.min(state.wishDrawn, wish);
    const otherDrawn = num(state.otherDrawn);
    const entered = state.total !== '' && state.wish !== '' && total > 0 && wish > 0;

    let errorMsg = '';
    if (entered && wishDrawn + otherDrawn >= total) {
      errorMsg = '남은 티켓이 없습니다';
    }
    const valid = entered && !errorMsg;

    const remainTotal = valid ? total - wishDrawn - otherDrawn : 0;
    const remainWish = valid ? Math.min(wish - wishDrawn, remainTotal) : 0;
    const pNext = remainTotal > 0 ? remainWish / remainTotal : 0;
    const nMax = Math.max(remainTotal, 1);
    const n = Math.min(Math.max(nRaw || 1, 1), nMax);

    let pNone = 1;
    for (let i = 0; i < n && remainTotal > 0; i += 1) {
      const numer = remainTotal - remainWish - i;
      if (numer <= 0) {
        pNone = 0;
        break;
      }
      pNone *= numer / (remainTotal - i);
    }
    const pAtLeast = remainWish > 0 ? 1 - pNone : 0;
    const expected = remainTotal > 0 ? (n * remainWish) / remainTotal : 0;

    let verdict = '';
    if (valid) {
      if (pAtLeast >= 0.9) verdict = '확률 매우 높음. 지금이 기회다!';
      else if (pAtLeast >= 0.6) verdict = '나쁘지 않다. 도전해볼 만하다.';
      else if (pAtLeast >= 0.3) verdict = '운에 맡기는 구간. 신중하게.';
      else verdict = '확률 낮음. 다음 기회를 노리자.';
    }

    return {
      showEmpty: !entered && !errorMsg,
      showError: !!errorMsg,
      errorMsg,
      showResult: valid,
      remainTotal,
      remainWish,
      pNext,
      n,
      nMax,
      pAtLeast,
      expected,
      verdict,
    };
  }, [state, nRaw]);

  const price = num(priceRaw) || DEFAULT_TICKET_PRICE;
  const filled = Math.round(calc.pNext * 20);
  const meterCells = Array.from({ length: 20 }, (_, i) => i < filled);
  const sliderPct = wishNum > 0 ? (state.wishDrawn / wishNum) * 100 : 0;

  return (
    <div className="calcv2">
      <div className="calcv2-scanlines" />
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '12px 14px 76px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 9, color: '#6f74b8', letterSpacing: 2 }}>KUJIHUB // PROB_ENGINE</div>
            <h1 className="calcv2-title">쿠지확률계산기</h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, color: '#3dff8e', letterSpacing: 1 }}>
              <span className="calcv2-blink" style={{ width: 6, height: 6, background: '#3dff8e', boxShadow: '0 0 8px #3dff8e' }} />
              LIVE
            </span>
            <div style={{ fontSize: 9, color: '#6f74b8', marginTop: 4 }}>HYPERGEO_MODE</div>
          </div>
        </div>

        {/* STEP 01 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#4ff5e8', letterSpacing: 1, whiteSpace: 'nowrap' }}>▚ STEP_01 :: 현장 입력</span>
          <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(79,245,232,.5), transparent)' }} />
        </div>

        {/* 전체 장수 */}
        <NumRow
          label="총 갯수"
          code="TOTAL_TICKETS"
          edge="#4ff5e8"
          value={state.total}
          onChange={raw => update({ total: clean(raw) })}
          onBump={d => update({ total: String(Math.max(totalNum + d, 0)) })}
        />

        {/* 위시 그룹 */}
        <div style={{ border: '1px solid rgba(255,61,245,.4)', background: 'rgba(255,61,245,.03)', padding: 8, display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', marginTop: 4 }}>
          <span style={{ position: 'absolute', top: -8, left: 10, background: '#0a0a1e', padding: '0 6px', fontSize: 9, color: '#ff3df5', letterSpacing: 1 }}>
            WISH :: 위시
          </span>

          <NumRow
            label="총 위시 갯수"
            code="WISH_PRIZES"
            edge="#ff3df5"
            value={state.wish}
            onChange={raw => update({ wish: clean(raw) })}
            onBump={d => update({ wish: String(Math.max(wishNum + d, 0)) })}
          />

          {/* 이미 뽑힌 위시 — 슬라이더 */}
          <div style={{ border: '1px solid #2b2b52', background: 'rgba(12,12,32,.75)', padding: '6px 10px 8px', borderLeft: '3px solid #ffd23d' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, overflow: 'hidden' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                <span style={{ fontSize: 12, color: '#e8e9ff', whiteSpace: 'nowrap' }}>이미 뽑힌 위시</span>
                <span style={{ fontSize: 8, color: '#6f74b8', letterSpacing: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>WISH_DRAWN</span>
              </span>
              <span style={{ fontSize: 16, color: '#ffd23d', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {state.wishDrawn}
                <span style={{ fontSize: 11, color: '#6f74b8' }}> / {wishNum}</span>
              </span>
            </div>
            <input
              type="range"
              className="calcv2-slider"
              min={0}
              max={Math.max(wishNum, 0)}
              step={1}
              value={state.wishDrawn}
              disabled={wishNum <= 0}
              onChange={e => update({ wishDrawn: Number(e.target.value) })}
              style={{
                background: wishNum > 0
                  ? `linear-gradient(90deg, #ffd23d ${sliderPct}%, #1a1a38 ${sliderPct}%)`
                  : '#1a1a38',
              }}
            />
          </div>
        </div>

        {/* 하위 그룹 */}
        <div style={{ border: '1px solid #2b2b52', background: 'rgba(111,116,184,.04)', padding: 8, position: 'relative', marginTop: 4 }}>
          <span style={{ position: 'absolute', top: -8, left: 10, background: '#0a0a1e', padding: '0 6px', fontSize: 9, color: '#8f93d6', letterSpacing: 1 }}>
            LOWER :: 하위
          </span>
          <NumRow
            label="뽑힌 하위"
            code={state.total !== '' ? `LOWER_DRAWN · MAX ${maxOther}` : 'LOWER_DRAWN'}
            edge="#6f74b8"
            value={state.otherDrawn}
            onChange={raw => update({ otherDrawn: clean(raw) })}
            onBump={d => update({ otherDrawn: String(Math.min(Math.max(num(state.otherDrawn) + d, 0), maxOther)) })}
          />
        </div>

        {/* STEP 02 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 10, color: '#ff3df5', letterSpacing: 1, whiteSpace: 'nowrap' }}>▞ STEP_02 :: 분석 결과</span>
          <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,61,245,.5), transparent)' }} />
        </div>

        {calc.showEmpty && (
          <div style={{ textAlign: 'center', padding: '30px 12px', border: '1px dashed #2b2b52', fontSize: 12, color: '#8f93d6', lineHeight: 1.8 }}>
            <span style={{ whiteSpace: 'nowrap' }}>총 갯수와 총 위시 갯수를 입력하세요</span>{' '}
            <span style={{ fontSize: 10, color: '#6f74b8', whiteSpace: 'nowrap' }}>AWAITING_INPUT</span>
            <span className="calcv2-cursor" />
          </div>
        )}

        {calc.showError && (
          <div
            style={{
              textAlign: 'center',
              padding: '18px 12px',
              border: '1px solid rgba(255,77,90,.6)',
              background: 'rgba(255,77,90,.08)',
              fontSize: 12,
              color: '#ff8d96',
              lineHeight: 1.7,
            }}
          >
            ⚠ ERROR :: {calc.errorMsg}
          </div>
        )}

        {calc.showResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* NEXT_DRAW */}
            <div style={{ border: '1px solid rgba(255,61,245,.5)', background: 'rgba(255,61,245,.05)', padding: '16px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 11, color: '#ffb3fb', letterSpacing: 1, whiteSpace: 'nowrap' }}>NEXT_DRAW :: 다음 1개</span>
                <span style={{ fontSize: 36, color: '#ff3df5', textShadow: '0 0 16px rgba(255,61,245,.55)' }}>
                  {pct(calc.pNext)}
                  <span style={{ fontSize: 16 }}>%</span>
                </span>
              </div>
              <div style={{ display: 'flex', gap: 3, marginTop: 12 }}>
                {meterCells.map((on, i) => (
                  <span
                    key={i}
                    style={{
                      flex: 1,
                      height: 14,
                      background: on ? '#ff3df5' : '#1a1a38',
                      boxShadow: on ? '0 0 6px rgba(255,61,245,.6)' : 'none',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: '#8f93d6' }}>
                <span style={{ whiteSpace: 'nowrap' }}>
                  남은 티켓 <b style={{ color: '#f2f3ff' }}>{calc.remainTotal}</b>개
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>
                  남은 위시 <b style={{ color: '#4ff5e8' }}>{calc.remainWish}</b>개
                </span>
              </div>
            </div>

            {/* SIMULATION */}
            <div style={{ border: '1px solid #2b2b52', background: 'rgba(12,12,32,.75)', padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#4ff5e8', letterSpacing: 1, whiteSpace: 'nowrap' }}>SIMULATION :: 몇 개 뽑지?</span>
                <span style={{ fontSize: 24, color: '#f2f3ff', whiteSpace: 'nowrap' }}>
                  {calc.n}
                  <span style={{ fontSize: 11, color: '#6f74b8' }}> 개</span>
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 12 }}>
                <button type="button" onClick={() => setNRaw(Math.max(calc.n - 1, 1))} style={{ ...stepBtn, color: '#8f93d6' }}>
                  −1
                </button>
                <button type="button" onClick={() => setNRaw(Math.min(calc.n + 1, calc.nMax))} style={stepBtn}>
                  +1
                </button>
                <button type="button" onClick={() => setNRaw(Math.min(calc.n + 5, calc.nMax))} style={stepBtn}>
                  +5
                </button>
                <button type="button" onClick={() => setNRaw(Math.min(calc.n + 10, calc.nMax))} style={stepBtn}>
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => setNRaw(1)}
                  style={{ height: 44, border: '1px solid rgba(255,61,245,.5)', background: 'rgba(255,61,245,.08)', color: '#ff3df5', fontSize: 12 }}
                >
                  RESET
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #2b2b52', paddingTop: 11 }}>
                  <span style={{ color: '#8f93d6', whiteSpace: 'nowrap' }}>위시 1개 이상 뜰 확률</span>
                  <span style={{ color: '#3dff8e', fontSize: 16, whiteSpace: 'nowrap' }}>{pct(calc.pAtLeast)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8f93d6', whiteSpace: 'nowrap' }}>기대 위시 획득</span>
                  <span style={{ color: '#f2f3ff', whiteSpace: 'nowrap' }}>{calc.expected.toFixed(1)} 개</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#8f93d6', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                    예상 비용 (
                    <input
                      type="text"
                      inputMode="numeric"
                      value={priceRaw}
                      onChange={e => setPriceRaw(clean(e.target.value))}
                      style={{
                        width: 52,
                        background: '#0a0a1e',
                        border: '1px solid #2b2b52',
                        color: '#cfd2ff',
                        fontSize: 12,
                        textAlign: 'right',
                        padding: '2px 4px',
                      }}
                    />
                    원/개)
                  </span>
                  <span style={{ color: '#ffd23d', whiteSpace: 'nowrap' }}>{(calc.n * price).toLocaleString()}원</span>
                </div>
              </div>
            </div>

            {/* VERDICT */}
            <div style={{ border: '1px solid #2b2b52', background: '#0a0a1e', padding: '12px 14px', fontSize: 11, lineHeight: 1.9, color: '#8f93d6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ color: '#4ff5e8' }}>&gt; VERDICT ::</span> {calc.verdict}
            </div>
          </div>
        )}

        <div
          style={{
            fontSize: 9,
            color: '#4a4e86',
            letterSpacing: 1,
            lineHeight: 1.8,
            borderTop: '1px solid #1a1a38',
            paddingTop: 10,
          }}
        >
          &gt; HYPERGEOMETRIC · REMAIN_BASED · NO_REPLACEMENT
        </div>
      </div>
    </div>
  );
}
