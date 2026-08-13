'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArcadeBox, ArcadeButton } from '@/components/arcade'
import { formatRelativeTime } from '@/lib/utils'

interface PostData {
  bbs_uid: number
  title: string
  author: string
  authorId: number
  creation_date: string
  contents: string
  likes: number
  liked: boolean
  views: number
  category: string
  is_notice: boolean
}

interface Comment {
  id: number
  content: string
  authorId: number
  author: {
    id: number
    email: string
    nickname?: string
  }
  parentId: number | null
  replies: Comment[]
  createdAt: string
  updatedAt: string
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.6)',
  border: '2px solid var(--arcade-secondary)',
  color: '#fff',
  padding: '12px',
  fontSize: '0.95rem',
  outline: 'none',
  width: '100%',
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [post, setPost] = useState<PostData | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: number } | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [commentContent, setCommentContent] = useState('')
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [likeLoading, setLikeLoading] = useState(false)

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser)
          setCurrentUser(user)
        } catch (e) {
          console.error('Failed to parse user data')
        }
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true)
        setError(null)
        const id = params.id as string
        const token = localStorage.getItem('token')
        const headers: HeadersInit = {}
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(`/api/posts/${id}`, { headers })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '게시글을 불러오는데 실패했습니다.')
        }

        setPost(data)
        setEditTitle(data.title)
        setEditContent(data.contents)
      } catch (err) {
        console.error('Error fetching post:', err)
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchPost()
      fetchComments()
    }
  }, [params.id])

  const fetchComments = async () => {
    try {
      const id = params.id as string
      const response = await fetch(`/api/comments?postId=${id}`)
      const data = await response.json()

      if (response.ok) {
        setComments(data)
      }
    } catch (err) {
      console.error('Error fetching comments:', err)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const token = localStorage.getItem('token')
      const id = params.id as string
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        router.push('/comm')
      } else {
        const data = await response.json()
        alert(data.error || '삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = async () => {
    try {
      const token = localStorage.getItem('token')
      const id = params.id as string
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          contents: editContent.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPost(prev => prev ? { ...prev, title: data.title, contents: data.contents } : null)
        setEditDialogOpen(false)
      } else {
        const data = await response.json()
        alert(data.error || '수정에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error updating post:', error)
      alert('수정 중 오류가 발생했습니다.')
    }
  }

  const handleCommentSubmit = async (parentId: number | null = null) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('로그인이 필요합니다.')
        return
      }

      const content = parentId ? replyContent : commentContent
      if (!content.trim()) {
        alert('댓글 내용을 입력해주세요.')
        return
      }

      const id = params.id as string
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          postId: parseInt(id),
          content,
          parentId,
        }),
      })

      if (response.ok) {
        if (parentId) {
          setReplyContent('')
          setReplyTo(null)
        } else {
          setCommentContent('')
        }
        fetchComments()
      } else {
        const data = await response.json()
        alert(data.error || '댓글 작성에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error creating comment:', error)
      alert('댓글 작성 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        fetchComments()
      } else {
        const data = await response.json()
        alert(data.error || '댓글 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('댓글 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleLike = async () => {
    if (!currentUser || !post) {
      alert('로그인이 필요합니다.')
      return
    }
    if (likeLoading) return

    setLikeLoading(true)
    const prevLiked = post.liked
    const prevLikes = post.likes

    // Optimistic Update
    setPost({ ...post, liked: !prevLiked, likes: prevLiked ? prevLikes - 1 : prevLikes + 1 })

    try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/posts/${post.bbs_uid}/like`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        })

        if (!response.ok) {
            // Revert on failure
            setPost({ ...post, liked: prevLiked, likes: prevLikes })
            alert('좋아요 처리 중 오류가 발생했습니다.')
        } else {
            const data = await response.json()
            // Ensure synced with server response
            setPost(prev => prev ? { ...prev, liked: data.liked, likes: data.liked ? prevLikes + 1 : prevLikes - 1 } : null)
        }
    } catch (e) {
        console.error(e)
        setPost({ ...post, liked: prevLiked, likes: prevLikes })
    } finally {
        setLikeLoading(false)
    }
  }

  const isAuthor = post && currentUser && post.authorId === currentUser.id

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="blink arcade-font-pixel" style={{ color: 'var(--arcade-primary)', fontSize: '1rem' }}>
          LOADING_MESSAGE...
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="animate-in">
        <ArcadeBox label="SIGNAL_LOST" variant="primary" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ color: 'var(--arcade-primary)', fontWeight: 900, marginBottom: '24px' }}>
            오류: {error || '게시글을 찾을 수 없습니다.'}
          </p>
          <ArcadeButton variant="secondary" size="sm" onClick={() => router.push('/comm')}>
            목록으로
          </ArcadeButton>
        </ArcadeBox>
      </div>
    )
  }

  return (
    <div className="animate-in">
      {/* 게시글 본문 */}
      <ArcadeBox label="MESSAGE_LOG" variant="secondary" style={{ marginBottom: '32px' }}>
        <header style={{ borderBottom: '2px dashed rgba(255,255,255,0.15)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div
                className="arcade-font-pixel"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                  fontSize: '0.6rem',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    color: post.is_notice ? 'var(--arcade-accent)' : 'var(--arcade-primary)',
                    border: `2px solid ${post.is_notice ? 'var(--arcade-accent)' : 'var(--arcade-primary)'}`,
                    padding: '4px 8px',
                  }}
                >
                  {post.is_notice ? '[NOTICE]' : `[${post.category}]`}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>#{String(post.bbs_uid).padStart(3, '0')}</span>
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>{formatRelativeTime(post.creation_date)}</span>
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>VIEWS:{post.views}</span>
              </div>
              <h1
                className="glitch-text"
                style={{
                  color: '#fff',
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  lineHeight: 1.3,
                  wordBreak: 'break-word',
                }}
              >
                {post.title}
              </h1>
            </div>

            {isAuthor && (
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <ArcadeButton variant="secondary" size="sm" onClick={() => setEditDialogOpen(true)} title="수정">
                  EDIT
                </ArcadeButton>
                <ArcadeButton variant="primary" size="sm" onClick={handleDelete} title="삭제">
                  DEL
                </ArcadeButton>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              marginTop: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                className="arcade-font-pixel"
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.6)',
                  border: '2px solid var(--arcade-secondary)',
                  color: 'var(--arcade-secondary)',
                  fontSize: '0.8rem',
                }}
              >
                {post.author.charAt(0).toUpperCase()}
              </div>
              <span style={{ color: '#fff', fontWeight: 700 }}>{post.author}</span>
            </div>

            <ArcadeButton
              variant={post.liked ? 'primary' : 'secondary'}
              size="sm"
              onClick={handleLike}
              disabled={likeLoading}
            >
              {post.liked ? '♥' : '♡'} {post.likes}
            </ArcadeButton>
          </div>
        </header>

        <div
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            minHeight: '200px',
            lineHeight: 1.7,
            color: 'rgba(255,255,255,0.9)',
            fontSize: '1rem',
            maxWidth: '860px',
          }}
        >
          {post.contents}
        </div>

        <div
          style={{
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '2px dashed rgba(255,255,255,0.15)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <ArcadeButton variant="secondary" size="sm" onClick={() => router.push('/comm')}>
            ◀ 목록으로
          </ArcadeButton>
        </div>
      </ArcadeBox>

      {/* 댓글 섹션 */}
      <ArcadeBox label={`COMMENTS (${comments.length})`} variant="accent">
        {/* 댓글 작성 */}
        {currentUser ? (
          <div className="comment-input-area" style={{ marginTop: 0, borderTop: 'none', paddingTop: '8px' }}>
            <label
              htmlFor="comment"
              className="arcade-font-pixel"
              style={{ color: 'var(--arcade-accent)', fontSize: '0.6rem' }}
            >
              WRITE_COMMENT
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', flexWrap: 'wrap' }}>
              <textarea
                id="comment"
                placeholder="댓글을 입력하세요... (댓글 작성 시 5P 지급)"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                rows={3}
                style={{ ...inputStyle, flex: 1, minWidth: '200px', resize: 'vertical', borderColor: 'var(--arcade-accent)' }}
              />
              <ArcadeButton variant="accent" size="sm" onClick={() => handleCommentSubmit()}>
                등록
              </ArcadeButton>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '2px dashed rgba(255,255,255,0.2)',
              padding: '20px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.9rem',
            }}
          >
            댓글을 작성하려면{' '}
            <button
              onClick={() => document.getElementById('login-trigger')?.click()}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--arcade-accent)',
                cursor: 'pointer',
                fontWeight: 900,
                textDecoration: 'underline',
                fontSize: 'inherit',
                padding: 0,
              }}
            >
              로그인
            </button>
            이 필요합니다.
          </div>
        )}

        {/* 댓글 목록 */}
        <div className="comment-list">
          {comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                  <span className="comment-author">
                    {comment.author.nickname || comment.author.email}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
                {currentUser && comment.authorId === currentUser.id && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="arcade-font-pixel"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--arcade-primary)',
                      cursor: 'pointer',
                      fontSize: '0.55rem',
                    }}
                  >
                    [DEL]
                  </button>
                )}
              </div>
              <p className="comment-content" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {comment.content}
              </p>

              {currentUser && (
                <button
                  onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                  className="arcade-font-pixel"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--arcade-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.55rem',
                    marginTop: '8px',
                    padding: 0,
                  }}
                >
                  ▶ 답글
                </button>
              )}

              {/* 대댓글 작성 */}
              {replyTo === comment.id && (
                <div style={{ marginTop: '12px', marginLeft: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <textarea
                    placeholder="답글을 입력하세요..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={2}
                    style={{ ...inputStyle, flex: 1, minWidth: '180px', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <ArcadeButton variant="accent" size="sm" onClick={() => handleCommentSubmit(comment.id)}>
                      등록
                    </ArcadeButton>
                    <ArcadeButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setReplyTo(null)
                        setReplyContent('')
                      }}
                    >
                      취소
                    </ArcadeButton>
                  </div>
                </div>
              )}

              {/* 대댓글 목록 */}
              {comment.replies && comment.replies.length > 0 && (
                <div
                  style={{
                    marginTop: '16px',
                    marginLeft: '16px',
                    borderLeft: '2px solid rgba(255,255,255,0.15)',
                    paddingLeft: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {comment.replies.map((reply) => (
                    <div key={reply.id}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                          <span className="comment-author" style={{ color: 'var(--arcade-secondary)', fontSize: '0.8rem' }}>
                            └ {reply.author.nickname || reply.author.email}
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>
                            {formatRelativeTime(reply.createdAt)}
                          </span>
                        </div>
                        {currentUser && reply.authorId === currentUser.id && (
                          <button
                            onClick={() => handleDeleteComment(reply.id)}
                            className="arcade-font-pixel"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--arcade-primary)',
                              cursor: 'pointer',
                              fontSize: '0.5rem',
                            }}
                          >
                            [DEL]
                          </button>
                        )}
                      </div>
                      <p
                        className="comment-content"
                        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.9rem' }}
                      >
                        {reply.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {comments.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 16px',
              marginTop: '24px',
              border: '2px dashed rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            첫 번째 댓글을 남겨보세요!
          </div>
        )}
      </ArcadeBox>

      {/* 수정 다이얼로그 */}
      {editDialogOpen && (
        <div
          onClick={() => setEditDialogOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '640px' }}>
            <ArcadeBox label="EDIT_MESSAGE" variant="secondary">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    htmlFor="edit-title"
                    className="arcade-font-pixel"
                    style={{ color: 'var(--arcade-secondary)', fontSize: '0.6rem' }}
                  >
                    TITLE
                  </label>
                  <input
                    id="edit-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    htmlFor="edit-content"
                    className="arcade-font-pixel"
                    style={{ color: 'var(--arcade-secondary)', fontSize: '0.6rem' }}
                  >
                    CONTENTS
                  </label>
                  <textarea
                    id="edit-content"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={12}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                  <ArcadeButton variant="secondary" size="sm" onClick={() => setEditDialogOpen(false)}>
                    취소
                  </ArcadeButton>
                  <ArcadeButton variant="accent" size="sm" onClick={handleEdit}>
                    수정
                  </ArcadeButton>
                </div>
              </div>
            </ArcadeBox>
          </div>
        </div>
      )}
    </div>
  )
}
