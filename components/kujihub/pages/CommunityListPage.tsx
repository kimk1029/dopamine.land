'use client'

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { communityApi } from '@/lib/kujihub/api/community';
import type { CommunityPost } from '@/lib/kujihub/types/community';
import { ArcadeBox, ArcadeButton } from '@/components/arcade';

export function CommunityListPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await communityApi.getList();
      setPosts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : '목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="blink" style={{ color: 'var(--arcade-primary)', fontSize: '1.5rem', fontWeight: 900 }}>
          SYNCING_COMM_LINK...
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <header className="page-header" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--arcade-secondary)', fontSize: '2.5rem', marginBottom: '16px', fontWeight: 900 }}>
            COMMUNITY_LOGS
          </h1>
          <p style={{ color: '#fff', fontSize: '1rem', opacity: 0.8, fontWeight: 500 }}>
            DECRYPTING MESSAGES FROM THE RESISTANCE.
          </p>
        </div>
        <div className="desktop-only">
          <ArcadeButton variant="primary" size="sm" onClick={() => router.push('/community/new')}>
            NEW_MESSAGE
          </ArcadeButton>
        </div>
      </header>

      {error && (
        <ArcadeBox variant="primary" style={{ marginBottom: '24px', borderColor: 'var(--error)' }}>
          <div style={{ color: 'var(--error)', fontSize: '1rem', fontWeight: 900 }}>
            COMM_LINK_ERROR: {error}
          </div>
        </ArcadeBox>
      )}

      {!error && posts.length === 0 ? (
        <ArcadeBox label="EMPTY_CHANNEL" variant="default" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', marginBottom: '24px', fontWeight: 700 }}>
            NO DATA DETECTED IN THIS SECTOR.
          </p>
          <ArcadeButton variant="accent" onClick={() => router.push('/community/new')}>
            INITIALIZE_FIRST_POST
          </ArcadeButton>
        </ArcadeBox>
      ) : (
        <table className="bulletin-board bulletin-board-compact">
          <thead>
            <tr className="bulletin-header">
              <th style={{ width: '80px' }}>ID</th>
              <th>SUBJECT</th>
              <th style={{ width: '150px' }}>AUTHOR</th>
              <th style={{ width: '120px' }}>DATE</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post, index) => (
              <tr 
                key={post.id} 
                className={`bulletin-row ${post.isNotice ? 'notice' : ''}`}
                onClick={() => router.push(`/community/${post.id}`)}
              >
                <td style={{ color: post.isNotice ? 'var(--arcade-accent)' : 'var(--arcade-accent)', fontWeight: 900 }}>
                  {post.isNotice ? 'NOTICE' : String(posts.length - index).padStart(3, '0')}
                </td>
                <td className="text-left">
                  <span className="bulletin-title-prefix">{post.isNotice ? '[NOTICE]' : '[GENERAL]'}</span>
                  <span className="bulletin-title">{post.title} [{post.commentCount ?? 0}]</span>
                </td>
                <td style={{ color: '#fff', opacity: 0.8 }}>{post.author}</td>
                <td style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                  {dayjs(post.createdAt).format('YYYY.MM.DD')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mobile-only community-compose-fab">
        <ArcadeButton 
          variant="accent" 
          size="lg" 
          onClick={() => router.push('/community/new')}
          className="coin-btn"
          style={{ borderRadius: '50%', width: '60px', height: '60px', padding: 0, fontSize: '2rem', boxShadow: '0 10px 24px rgba(0,0,0,0.42)' }}
        >
          +
        </ArcadeButton>
      </div>
    </div>
  );
}
