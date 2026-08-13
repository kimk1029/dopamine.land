'use client'

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { ArcadeBox, ArcadeButton } from '@/components/arcade';
import { getWebAuthSession } from '@/lib/kujihub/auth/webAuth';
import { communityApi } from '@/lib/kujihub/api/community';
import { ensureKujiPlayer } from '@/lib/kujihub/api/kujiDraw';
import type { CommunityPost } from '@/lib/kujihub/types/community';
import type { KujiPlayer } from '@/lib/kujihub/types/kujiDraw';

// Level & Character Logic
const POINTS_PER_LEVEL = 500;
const LEVEL_CHARACTER_STAGES = [
  { minLevel: 1, rank: 'NOVICE', charType: 'egg', summary: '시작 단계입니다. 기본 알 형태 캐릭터로 시작합니다.' },
  { minLevel: 2, rank: 'ROOKIE', charType: 'slime', summary: '첫 진화 단계입니다. 커뮤니티 활동으로 빠르게 도달할 수 있습니다.' },
  { minLevel: 5, rank: 'VETERAN', charType: 'robot', summary: '활동이 꾸준한 플레이어 구간입니다.' },
  { minLevel: 10, rank: 'ELITE', charType: 'knight', summary: '상위권 운영자 단계입니다. 누적 포인트가 많이 필요합니다.' },
  { minLevel: 20, rank: 'LEGEND', charType: 'dragon', summary: '최종 진화 단계입니다. 장기적인 활동이 필요합니다.' },
] as const;

function getLevelInfo(points: number) {
  const level = Math.floor(points / POINTS_PER_LEVEL) + 1;
  const currentLevelPoints = points % POINTS_PER_LEVEL;
  const progress = (currentLevelPoints / POINTS_PER_LEVEL) * 100;
  
  let rank = 'NOVICE';
  let charType = 'egg';
  
  if (level >= 20) { rank = 'LEGEND'; charType = 'dragon'; }
  else if (level >= 10) { rank = 'ELITE'; charType = 'knight'; }
  else if (level >= 5) { rank = 'VETERAN'; charType = 'robot'; }
  else if (level >= 2) { rank = 'ROOKIE'; charType = 'slime'; }
  
  return { level, progress, rank, charType, nextLevelPoints: POINTS_PER_LEVEL - currentLevelPoints };
}

// Simple CSS Pixel Art Component
function PixelCharacter({ type }: { type: string }) {
  const renderPixel = (colors: string[][]) => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colors[0].length}, 1fr)`, width: '120px', height: '120px', imageRendering: 'pixelated' }}>
        {colors.flat().map((c, i) => (
          <div key={i} style={{ backgroundColor: c === 't' ? 'transparent' : c }} />
        ))}
      </div>
    );
  };

  // 10x10 grids
  const egg = [
    ['t','t','t','#fff','#fff','#fff','#fff','t','t','t'],
    ['t','t','#fff','#eee','#eee','#eee','#eee','#fff','t','t'],
    ['t','#fff','#eee','#eee','#eee','#eee','#eee','#eee','#fff','t'],
    ['#fff','#eee','#eee','#eee','#eee','#eee','#eee','#eee','#eee','#fff'],
    ['#fff','#eee','#333','#eee','#eee','#eee','#333','#eee','#eee','#fff'],
    ['#fff','#eee','#eee','#eee','#eee','#eee','#eee','#eee','#eee','#fff'],
    ['#fff','#eee','#eee','#eee','#f00','#f00','#eee','#eee','#eee','#fff'],
    ['t','#fff','#eee','#eee','#eee','#eee','#eee','#eee','#fff','t'],
    ['t','t','#fff','#eee','#eee','#eee','#eee','#fff','t','t'],
    ['t','t','t','#fff','#fff','#fff','#fff','t','t','t'],
  ];

  const slime = [
    ['t','t','t','t','t','t','t','t','t','t'],
    ['t','t','t','t','t','t','t','t','t','t'],
    ['t','t','t','#0ff','#0ff','#0ff','#0ff','t','t','t'],
    ['t','t','#0ff','#0ff','#0ff','#0ff','#0ff','#0ff','t','t'],
    ['t','#0ff','#0ff','#333','#0ff','#0ff','#333','#0ff','#0ff','t'],
    ['t','#0ff','#0ff','#0ff','#0ff','#0ff','#0ff','#0ff','#0ff','t'],
    ['#0ff','#0ff','#0ff','#0ff','#0ff','#0ff','#0ff','#0ff','#0ff','#0ff'],
    ['#0ff','#0ff','#0ff','#0ff','#fff','#fff','#0ff','#0ff','#0ff','#0ff'],
    ['t','#0ff','#0ff','#0ff','#0ff','#0ff','#0ff','#0ff','#0ff','t'],
    ['t','t','#0ff','#0ff','#0ff','#0ff','#0ff','#0ff','t','t'],
  ];

  const robot = [
    ['t','t','#555','#555','#555','#555','#555','#555','t','t'],
    ['t','#555','#aaa','#aaa','#aaa','#aaa','#aaa','#aaa','#555','t'],
    ['t','#555','#f00','#aaa','#aaa','#aaa','#f00','#aaa','#555','t'],
    ['t','#555','#aaa','#aaa','#aaa','#aaa','#aaa','#aaa','#555','t'],
    ['t','t','#555','#555','#555','#555','#555','#555','t','t'],
    ['t','t','t','#333','#333','#333','#333','t','t','t'],
    ['t','#555','#555','#555','#555','#555','#555','#555','t'],
    ['#555','#aaa','#aaa','#aaa','#aaa','#aaa','#aaa','#aaa','#555'],
    ['#555','#aaa','#333','#aaa','#aaa','#333','#aaa','#aaa','#555'],
    ['t','#555','#555','#555','#555','#555','#555','#555','t'],
  ];

  const knight = [
    ['t','t','t','#f00','#f00','t','t','t','t','t'],
    ['t','t','#aaa','#aaa','#aaa','#aaa','t','t','t','t'],
    ['t','#aaa','#aaa','#aaa','#aaa','#aaa','#aaa','t','t','t'],
    ['t','#aaa','#333','#aaa','#aaa','#333','#aaa','t','t','t'],
    ['t','#aaa','#aaa','#aaa','#aaa','#aaa','#aaa','t','t','t'],
    ['t','t','#aaa','#aaa','#aaa','#aaa','t','t','t','t'],
    ['t','t','#aaa','#aaa','#aaa','#aaa','t','t','t','t'],
    ['t','#555','#aaa','#aaa','#aaa','#aaa','#555','t','t','t'],
    ['#555','#555','#aaa','#aaa','#aaa','#aaa','#555','#555','t','t'],
    ['t','#555','#555','t','t','#555','#555','t','t','t','t'],
  ];

  const dragon = [
    ['t','t','t','t','#f0f','t','t','t','t','t'],
    ['t','t','t','#f0f','#f0f','#f0f','t','t','t','t'],
    ['t','t','#f0f','#f0f','#f0f','#f0f','#f0f','t','t','t'],
    ['t','#f0f','#333','#f0f','#f0f','#333','#f0f','t','t','t'],
    ['t','#f0f','#f0f','#f0f','#f0f','#f0f','#f0f','t','t','t'],
    ['#f0f','#f0f','#f0f','#f0f','#f0f','#f0f','#f0f','#f0f','t','t'],
    ['t','t','#f0f','#f0f','#f0f','#f0f','#f0f','t','t','t'],
    ['t','t','#f0f','#f0f','#f0f','#f0f','#f0f','t','t','t'],
    ['t','#f0f','#f0f','t','t','t','#f0f','#f0f','t'],
    ['#f0f','#f0f','t','t','t','t','t','#f0f','#f0f','t'],
  ];

  const grids: Record<string, string[][]> = { egg, slime, robot, knight, dragon };
  return renderPixel(grids[type] || egg);
}

function getProviderLabel(provider: string) {
  switch (provider) {
    case 'google': return 'GOOGLE';
    case 'kakao': return 'KAKAO';
    case 'naver': return 'NAVER';
    default: return 'DEV';
  }
}

export function ProfilePage() {
  const router = useRouter();
  const session = getWebAuthSession();
  const [player, setPlayer] = useState<KujiPlayer | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLevelHelpOpen, setIsLevelHelpOpen] = useState(false);

  const userName = session?.user.name?.trim() || 'PLAYER';
  const provider = getProviderLabel(session?.provider || 'dev');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [playerData, communityPosts] = await Promise.all([
          ensureKujiPlayer(userName),
          communityApi.getList(),
        ]);
        if (!cancelled) {
          setPlayer(playerData);
          setPosts(communityPosts.filter((post) => post.author === userName).slice(0, 5));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : '프로필 정보를 불러올 수 없습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userName]);

  const levelInfo = useMemo(() => getLevelInfo(player?.points ?? 0), [player?.points]);
  const joinedLabel = useMemo(() => session?.createdAt ? dayjs(session.createdAt).format('YYYY.MM.DD HH:mm') : '-', [session?.createdAt]);
  const currentPoints = player?.points ?? 0;

  return (
    <div className="animate-in">
      <header className="page-header" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: 'var(--arcade-secondary)', fontSize: '2rem' }}>
          PLAYER_DASHBOARD
        </h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <ArcadeButton variant="secondary" size="sm" onClick={() => router.push('/community/new')}>
            NEW_LOG
          </ArcadeButton>
          <ArcadeButton variant="accent" size="sm" onClick={() => window.location.reload()}>
            REFRESH_SYNC
          </ArcadeButton>
        </div>
      </header>

      {error ? (
        <ArcadeBox variant="primary" style={{ marginBottom: '24px', borderColor: 'var(--error)' }}>
          <div style={{ color: 'var(--error)', fontWeight: 900 }}>
            SYNC_FAILURE: {error}
          </div>
        </ArcadeBox>
      ) : null}

      <div className="profile-dashboard" style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '32px' }}>
        <aside className="profile-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Level & Character Card */}
          <ArcadeBox label={`LEVEL_${levelInfo.level}_${levelInfo.rank}`} variant="primary" style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div style={{ fontSize: '1.3rem', color: 'var(--arcade-secondary)', fontWeight: 900 }}>
                LV.{levelInfo.level}
              </div>
              <button
                type="button"
                onClick={() => setIsLevelHelpOpen(true)}
                aria-label="레벨 시스템 안내 열기"
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  border: '2px solid var(--arcade-accent)',
                  background: 'rgba(0, 0, 0, 0.72)',
                  color: 'var(--arcade-accent)',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 0 10px rgba(57, 255, 20, 0.25)',
                }}
              >
                ?
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <PixelCharacter type={levelInfo.charType} />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 900, marginBottom: '8px', color: 'var(--arcade-accent)' }}>
                <span>EXP_PROGRESS</span>
                <span>{Math.round(levelInfo.progress)}%</span>
              </div>
              <div style={{ height: '12px', background: '#111', border: '2px solid #333', position: 'relative', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${levelInfo.progress}%`, 
                  backgroundColor: 'var(--arcade-accent)',
                  boxShadow: '0 0 10px var(--arcade-accent)'
                }} />
              </div>
              <p style={{ marginTop: '8px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                {levelInfo.nextLevelPoints}P UNTIL NEXT LEVEL UP
              </p>
            </div>

            <h2 style={{ fontSize: '1.5rem', color: 'var(--arcade-secondary)', fontWeight: 900, marginBottom: '4px' }}>
              {userName}
            </h2>
            <p style={{ color: 'var(--arcade-primary)', fontSize: '0.8rem', fontWeight: 900 }}>
              {levelInfo.rank} OPERATOR
            </p>
          </ArcadeBox>

          <ArcadeBox label="PLAYER_STATUS" variant="secondary">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.6, fontWeight: 700, fontSize: '0.8rem' }}>TOTAL_CREDITS</span>
                <span style={{ fontWeight: 900, color: 'var(--arcade-accent)' }}>
                  {(player?.points ?? 0).toLocaleString()} P
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.6, fontWeight: 700, fontSize: '0.8rem' }}>ACCESS_LEVEL</span>
                <span style={{ fontWeight: 900 }}>{(player?.role || 'user').toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.6, fontWeight: 700, fontSize: '0.8rem' }}>DATA_LOGS</span>
                <span style={{ fontWeight: 900 }}>{posts.length}</span>
              </div>
            </div>
          </ArcadeBox>

          <ArcadeBox label="SESSION_INTEL" variant="default">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 900, fontSize: '0.65rem' }}>LINKED_PROVIDER</div>
              <div style={{ fontWeight: 700, color: 'var(--arcade-secondary)' }}>{provider} ID_LINK</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 900, fontSize: '0.65rem', marginTop: '6px' }}>UPTIME_SINCE</div>
              <div style={{ fontWeight: 700 }}>{joinedLabel}</div>
            </div>
          </ArcadeBox>
        </aside>

        <section className="profile-main" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <ArcadeBox label="RECENT_DATA_LOGS" variant="secondary">
            {loading ? (
              <div className="blink" style={{ fontWeight: 900, color: 'var(--arcade-primary)', padding: '20px' }}>
                DECRYPTING_LOGS...
              </div>
            ) : posts.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, padding: '20px', textAlign: 'center' }}>
                NO DATA LOGS FOUND IN THIS SECTOR.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {posts.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => router.push(`/community/${post.id}`)}
                    style={{
                      padding: '14px 20px',
                      border: '2px solid #222',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(0,0,0,0.5)',
                      color: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: "'Galmuri11', sans-serif"
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--arcade-secondary)', fontWeight: 900, fontSize: '1rem' }}>{post.title}</div>
                      <div style={{ marginTop: '6px', fontSize: '0.75rem', opacity: 0.5, fontWeight: 500 }}>
                        {dayjs(post.createdAt).format('YYYY.MM.DD HH:mm:ss')}
                      </div>
                    </div>
                    <div style={{ color: 'var(--arcade-accent)', fontWeight: 900, fontSize: '0.8rem' }}>
                      [ OPEN_LOG ]
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ArcadeBox>

          <ArcadeBox label="COMMAND_CENTER" variant="accent">
            <div className="quick-action-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              <ArcadeButton variant="primary" size="md" onClick={() => router.push('/kuji')} style={{ width: '100%', margin: 0 }}>
                KUJI_STATION
              </ArcadeButton>
              <ArcadeButton variant="secondary" size="md" onClick={() => router.push('/community')} style={{ width: '100%', margin: 0 }}>
                COMM_BOARD
              </ArcadeButton>
              <ArcadeButton variant="accent" size="md" onClick={() => router.push('/feed')}>
                LIVE_FEED
              </ArcadeButton>
            </div>
          </ArcadeBox>

          <ArcadeBox label="SYSTEM_NOTICES" variant="primary">
            <div style={{ fontSize: '0.85rem', color: '#fff', lineHeight: '1.6', opacity: 0.8 }}>
              <p>• LEVEL UP BY EARNING POINTS THROUGH COMMUNITY ENGAGEMENT.</p>
              <p>• NEW CHARACTER EVOLUTIONS UNLOCKED AT LEVEL 2, 5, 10, AND 20.</p>
              <p>• MAINTAIN HIGH ACTIVITY TO REACH 'LEGEND' OPERATOR STATUS.</p>
            </div>
          </ArcadeBox>
        </section>
      </div>

      {isLevelHelpOpen ? (
        <div
          onClick={() => setIsLevelHelpOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(6, 8, 16, 0.88)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(920px, 100%)',
              maxHeight: '85vh',
              overflowY: 'auto',
              border: '4px solid var(--arcade-secondary)',
              background: 'linear-gradient(180deg, rgba(9, 12, 22, 0.98), rgba(16, 5, 24, 0.98))',
              boxShadow: '0 0 32px rgba(255, 0, 255, 0.22)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ color: 'var(--arcade-primary)', fontWeight: 900, fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                  LEVEL SYSTEM GUIDE
                </div>
                <h2 style={{ margin: '8px 0 0', color: 'var(--arcade-secondary)', fontSize: '1.8rem' }}>
                  POINTS / LEVEL / CHARACTER
                </h2>
              </div>
              <ArcadeButton variant="primary" size="sm" onClick={() => setIsLevelHelpOpen(false)} style={{ margin: 0 }}>
                CLOSE
              </ArcadeButton>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <ArcadeBox label="CURRENT_STATUS" variant="secondary" isChunky={false}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontWeight: 700 }}>
                  <div>현재 레벨: <span style={{ color: 'var(--arcade-secondary)', fontWeight: 900 }}>LV.{levelInfo.level}</span></div>
                  <div>현재 포인트: <span style={{ color: 'var(--arcade-accent)', fontWeight: 900 }}>{currentPoints.toLocaleString()}P</span></div>
                  <div>다음 레벨까지: <span style={{ color: '#fff', fontWeight: 900 }}>{levelInfo.nextLevelPoints}P</span></div>
                </div>
              </ArcadeBox>
              <ArcadeBox label="LEVEL RULE" variant="accent" isChunky={false}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontWeight: 700, lineHeight: 1.6 }}>
                  <div>레벨은 누적 포인트 기준으로 자동 상승합니다.</div>
                  <div><span style={{ color: 'var(--arcade-accent)', fontWeight: 900 }}>500P</span>를 모을 때마다 레벨이 1 오릅니다.</div>
                  <div>공식 계산식: <span style={{ color: '#fff', fontWeight: 900 }}>LV = floor(POINTS / 500) + 1</span></div>
                </div>
              </ArcadeBox>
            </div>

            <ArcadeBox label="HOW_TO_RANK_UP" variant="primary" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div style={{ border: '2px solid rgba(255,255,255,0.12)', padding: '14px', background: 'rgba(0,0,0,0.28)' }}>
                  <div style={{ color: 'var(--arcade-accent)', fontWeight: 900, marginBottom: '8px' }}>커뮤니티 글 작성</div>
                  <div style={{ lineHeight: 1.6 }}>게시글 작성 시 포인트를 획득해 레벨 상승에 가장 빠르게 기여합니다.</div>
                </div>
                <div style={{ border: '2px solid rgba(255,255,255,0.12)', padding: '14px', background: 'rgba(0,0,0,0.28)' }}>
                  <div style={{ color: 'var(--arcade-accent)', fontWeight: 900, marginBottom: '8px' }}>댓글 및 상호작용</div>
                  <div style={{ lineHeight: 1.6 }}>댓글 작성과 커뮤니티 활동도 누적 포인트에 반영됩니다.</div>
                </div>
                <div style={{ border: '2px solid rgba(255,255,255,0.12)', padding: '14px', background: 'rgba(0,0,0,0.28)' }}>
                  <div style={{ color: 'var(--arcade-accent)', fontWeight: 900, marginBottom: '8px' }}>일일 접속 보상</div>
                  <div style={{ lineHeight: 1.6 }}>매일 로그인 보상 포인트를 챙기면 안정적으로 다음 레벨에 가까워집니다.</div>
                </div>
              </div>
            </ArcadeBox>

            <ArcadeBox label="CHARACTER EVOLUTION" variant="secondary">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                {LEVEL_CHARACTER_STAGES.map((stage) => (
                  <div
                    key={stage.minLevel}
                    style={{
                      padding: '16px 12px',
                      border: '2px solid rgba(255,255,255,0.12)',
                      background: levelInfo.level >= stage.minLevel ? 'rgba(255, 0, 255, 0.08)' : 'rgba(0, 0, 0, 0.24)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                      <PixelCharacter type={stage.charType} />
                    </div>
                    <div style={{ color: 'var(--arcade-secondary)', fontWeight: 900, fontSize: '1rem' }}>
                      LV.{stage.minLevel} {stage.rank}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.82rem', lineHeight: 1.6, opacity: 0.82 }}>
                      {stage.summary}
                    </div>
                  </div>
                ))}
              </div>
            </ArcadeBox>
          </div>
        </div>
      ) : null}
    </div>
  );
}
