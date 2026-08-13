'use client'

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { communityApi } from '@/lib/kujihub/api/community';
import type { CommunityPost, CommunityComment } from '@/lib/kujihub/types/community';
import { ArcadeBox, ArcadeButton } from '@/components/arcade';
import { getWebAuthSession } from '@/lib/kujihub/auth/webAuth';

export function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768
  );
  const session = getWebAuthSession();
  const authorName = session?.user.name?.trim() || 'PLAYER';
  const canManagePost = post?.author === authorName;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const fetchPostAndComments = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const postId = Number(id);
      const [postData, commentsData] = await Promise.all([
        communityApi.getOne(postId),
        communityApi.getComments(postId).catch(() => [] as CommunityComment[]),
      ]);
      setPost(postData);
      setComments(commentsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '글을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPostAndComments();
  }, [fetchPostAndComments]);

  const handleDelete = async () => {
    if (!id || !window.confirm('DELETE THIS LOG PERMANENTLY?')) return;
    try {
      await communityApi.remove(Number(id));
      router.push('/community');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'ERASE_FAILED');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !commentContent.trim()) return;
    setIsSubmitting(true);
    try {
      const newComment = await communityApi.createComment(Number(id), {
        content: commentContent.trim(),
      });
      setComments((prev) => [...prev, newComment]);
      setCommentContent('');
    } catch (submitError) {
      window.alert(submitError instanceof Error ? submitError.message : '댓글 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="blink" style={{ color: 'var(--arcade-primary)', fontSize: '1.5rem', fontWeight: 900 }}>
          DECRYPTING_LOG...
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="animate-in">
        <ArcadeBox variant="primary" label="ERROR">
          <p style={{ color: 'var(--error)', fontWeight: 900 }}>
            {error ?? 'LOG_NOT_FOUND'}
          </p>
          <ArcadeButton variant="secondary" onClick={() => router.push('/community')} style={{ marginTop: '20px' }}>
            BACK_TO_ARCHIVE
          </ArcadeButton>
        </ArcadeBox>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{ marginBottom: isMobile ? '24px' : '40px' }}>
        {/* Top row: breadcrumb + action buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          <div style={{ color: 'var(--arcade-primary)', fontSize: '0.75rem', fontWeight: 900 }}>
            MESSAGE_ID: {post.id}
          </div>
          {canManagePost && (
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <ArcadeButton
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/community/edit/${post.id}`)}
                style={{ margin: 0 }}
              >
                EDIT
              </ArcadeButton>
              <ArcadeButton
                variant="primary"
                size="sm"
                onClick={handleDelete}
                style={{ margin: 0 }}
              >
                ERASE
              </ArcadeButton>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 style={{
          color: 'var(--arcade-secondary)',
          fontSize: isMobile ? '1.5rem' : '2.2rem',
          marginBottom: '12px',
          fontWeight: 900,
          lineHeight: 1.3,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
        }}>
          {post.title}
        </h1>

        {/* Meta */}
        <div style={{
          display: 'flex',
          gap: isMobile ? '10px' : '20px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: isMobile ? '0.78rem' : '0.9rem', color: 'var(--arcade-accent)', fontWeight: 900 }}>
            {post.author}
          </span>
          <span style={{ fontSize: isMobile ? '0.72rem' : '0.85rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
            {dayjs(post.createdAt).format('YYYY.MM.DD HH:mm')}
          </span>
        </div>
      </header>

      {/* ── Main layout ────────────────────────────────────────── */}
      <div
        className="community-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 260px',
          gap: isMobile ? '16px' : '28px',
          marginBottom: '40px',
          alignItems: 'start',
        }}
      >
        {/* Left: content + comments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '28px', minWidth: 0 }}>
          <ArcadeBox label="LOG_CONTENT" variant="default" style={{ minHeight: isMobile ? 'auto' : '400px' }}>
            <div style={{
              fontSize: isMobile ? '0.95rem' : '1.1rem',
              color: '#fff',
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap',
              fontFamily: 'Galmuri11, sans-serif',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}>
              {post.content || '( NO_DATA_RECORDED )'}
            </div>
          </ArcadeBox>

          {/* Comments */}
          <ArcadeBox label="LOG_COMMENTS" variant="secondary">
            {comments.length > 0 ? (
              <div className="comment-list">
                {comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-author">{comment.author}</div>
                    <div className="comment-content">{comment.content}</div>
                    <div className="comment-date">{dayjs(comment.createdAt).format('YYYY.MM.DD HH:mm')}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', padding: '20px 0' }}>
                NO COMMENTS DETECTED
              </div>
            )}

            <form onSubmit={handleCommentSubmit} className="comment-input-area">
              {isMobile ? (
                /* Mobile: stacked layout */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    background: 'rgba(0,0,0,0.5)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    color: 'var(--arcade-accent)',
                    padding: '7px 10px',
                    fontFamily: 'Galmuri11, sans-serif',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                  }}>
                    {authorName}
                  </div>
                  <input
                    type="text"
                    placeholder="ENTER COMMENT DATA..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      border: '2px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      padding: '8px 12px',
                      fontFamily: 'Galmuri11, sans-serif',
                      width: '100%',
                      fontSize: '0.9rem',
                    }}
                    disabled={isSubmitting}
                  />
                  <ArcadeButton
                    variant="accent"
                    size="sm"
                    type="submit"
                    disabled={!commentContent.trim() || isSubmitting}
                    style={{ width: '100%', margin: 0 }}
                  >
                    TRANSMIT
                  </ArcadeButton>
                </div>
              ) : (
                /* Desktop: side-by-side */
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    background: 'rgba(0,0,0,0.5)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    padding: '8px 12px',
                    fontFamily: 'Galmuri11, sans-serif',
                    width: '150px',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                  }}>
                    {authorName}
                  </div>
                  <input
                    type="text"
                    placeholder="ENTER COMMENT DATA..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      border: '2px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      padding: '8px 12px',
                      fontFamily: 'Galmuri11, sans-serif',
                      flex: 1,
                      minWidth: 0,
                    }}
                    disabled={isSubmitting}
                  />
                  <ArcadeButton variant="accent" size="sm" type="submit" disabled={!commentContent.trim() || isSubmitting}>
                    TRANSMIT
                  </ArcadeButton>
                </div>
              )}
            </form>
          </ArcadeBox>
        </div>

        {/* Right: sidebar (hidden on mobile → stacks below) */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '28px' }}>
          <ArcadeBox label="METADATA" variant="secondary">
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                <div style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '4px', fontWeight: 900 }}>SECTOR</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>GENERAL_COMM</div>
              </li>
              <li style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                <div style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '4px', fontWeight: 900 }}>BYTE_SIZE</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{post.content.length.toLocaleString()} B</div>
              </li>
              <li>
                <div style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '4px', fontWeight: 900 }}>LAST_SYNC</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{dayjs(post.updatedAt).format('HH:mm:ss')}</div>
              </li>
            </ul>
          </ArcadeBox>

          <ArcadeBox label="NAVIGATION" variant="default">
            <ArcadeButton
              variant="secondary"
              size="sm"
              style={{ width: '100%', margin: 0 }}
              onClick={() => router.push('/community')}
            >
              BACK_TO_LIST
            </ArcadeButton>
          </ArcadeBox>
        </aside>
      </div>
    </div>
  );
}
