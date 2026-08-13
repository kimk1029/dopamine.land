'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ArcadeBox, ArcadeButton } from '@/components/arcade'
import { loadSessionUser, type SessionUser } from '@/lib/user-session'
import { formatRelativeTime } from '@/lib/utils'

interface CommPost {
  bbs_uid: number
  title: string
  author: string
  creation_date: string
  views: number
  category: string
  is_notice: boolean
}

const CATEGORIES = [
  { key: '전체', label: 'ALL' },
  { key: '공지', label: 'NOTICE' },
  { key: '자유', label: 'FREE' },
  { key: '정보', label: 'INFO' },
  { key: '질문', label: 'Q&A' },
]

const ITEMS_PER_PAGE = 15

function CommBoard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get('category')
  const [posts, setPosts] = useState<CommPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState(
    CATEGORIES.some((c) => c.key === initialCategory) ? (initialCategory as string) : '전체'
  )
  const [page, setPage] = useState(1)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [writing, setWriting] = useState(false)
  const [title, setTitle] = useState('')
  const [contents, setContents] = useState('')
  const [writeCategory, setWriteCategory] = useState('자유')
  const [asNotice, setAsNotice] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/posts')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '목록을 불러올 수 없습니다.')
      setPosts(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
    loadSessionUser().then(setUser)
  }, [fetchPosts])

  const filtered = useMemo(() => {
    if (category === '전체') return posts
    if (category === '공지') return posts.filter((p) => p.is_notice)
    return posts.filter((p) => !p.is_notice && p.category === category)
  }, [posts, category])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const isAdmin = user?.userType === 1

  const handleSubmit = async () => {
    if (!title.trim() || !contents.trim()) {
      alert('제목과 내용을 입력해주세요.')
      return
    }
    const token = localStorage.getItem('token')
    if (!token) {
      alert('로그인이 필요합니다.')
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          contents,
          category: writeCategory,
          isNotice: asNotice,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '게시글 작성에 실패했습니다.')
      setTitle('')
      setContents('')
      setAsNotice(false)
      setWriting(false)
      fetchPosts()
    } catch (e) {
      alert(e instanceof Error ? e.message : '게시글 작성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="blink arcade-font-pixel" style={{ color: 'var(--arcade-primary)', fontSize: '1rem' }}>
          SYNCING_COMM_LINK...
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in">
      <header
        style={{
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            className="arcade-font-pixel glitch-text"
            style={{ color: 'var(--arcade-secondary)', fontSize: '1.6rem', marginBottom: '12px' }}
          >
            COMM_CHANNEL
          </h1>
          <p style={{ color: '#fff', opacity: 0.8, fontWeight: 500 }}>
            자유롭게 소통하는 통합 커뮤니티 채널입니다. (구 게시판 + 공지사항)
          </p>
        </div>
        {user && (
          <ArcadeButton variant="primary" size="sm" onClick={() => setWriting((w) => !w)}>
            {writing ? 'CANCEL' : 'NEW_MESSAGE'}
          </ArcadeButton>
        )}
      </header>

      {error && (
        <ArcadeBox variant="primary" style={{ marginBottom: '24px' }}>
          <div style={{ color: 'var(--arcade-primary)', fontWeight: 900 }}>COMM_LINK_ERROR: {error}</div>
        </ArcadeBox>
      )}

      {writing && (
        <ArcadeBox label="NEW_MESSAGE" variant="secondary" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              {CATEGORIES.filter((c) => c.key !== '전체' && c.key !== '공지').map((c) => (
                <ArcadeButton
                  key={c.key}
                  variant={writeCategory === c.key ? 'accent' : 'secondary'}
                  size="sm"
                  onClick={() => setWriteCategory(c.key)}
                >
                  {c.label}
                </ArcadeButton>
              ))}
              {isAdmin && (
                <label
                  className="arcade-font-pixel"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--arcade-accent)',
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={asNotice}
                    onChange={(e) => setAsNotice(e.target.checked)}
                  />
                  NOTICE
                </label>
              )}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목"
              maxLength={200}
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: '2px solid var(--arcade-secondary)',
                color: '#fff',
                padding: '12px',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
            <textarea
              value={contents}
              onChange={(e) => setContents(e.target.value)}
              placeholder="내용"
              rows={6}
              maxLength={10000}
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: '2px solid var(--arcade-secondary)',
                color: '#fff',
                padding: '12px',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <ArcadeButton variant="accent" size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'SENDING...' : 'TRANSMIT'}
              </ArcadeButton>
            </div>
          </div>
        </ArcadeBox>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {CATEGORIES.map((c) => (
          <ArcadeButton
            key={c.key}
            variant={category === c.key ? 'accent' : 'secondary'}
            size="sm"
            onClick={() => {
              setCategory(c.key)
              setPage(1)
            }}
          >
            {c.label}
          </ArcadeButton>
        ))}
      </div>

      {pageItems.length === 0 ? (
        <ArcadeBox label="EMPTY_CHANNEL" variant="default" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', fontWeight: 700 }}>
            NO DATA DETECTED IN THIS SECTOR.
          </p>
        </ArcadeBox>
      ) : (
        <table className="bulletin-board bulletin-board-compact">
          <thead>
            <tr className="bulletin-header">
              <th style={{ width: '90px' }}>ID</th>
              <th>SUBJECT</th>
              <th style={{ width: '140px' }}>AUTHOR</th>
              <th style={{ width: '70px' }}>VIEWS</th>
              <th style={{ width: '110px' }}>DATE</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((post) => (
              <tr
                key={post.bbs_uid}
                className={`bulletin-row ${post.is_notice ? 'notice' : ''}`}
                onClick={() => router.push(`/comm/${post.bbs_uid}`)}
              >
                <td style={{ color: 'var(--arcade-accent)', fontWeight: 900 }}>
                  {post.is_notice ? 'NOTICE' : String(post.bbs_uid).padStart(3, '0')}
                </td>
                <td className="text-left">
                  <span className="bulletin-title-prefix">
                    {post.is_notice ? '[NOTICE]' : `[${post.category}]`}
                  </span>
                  <span className="bulletin-title">{post.title}</span>
                </td>
                <td style={{ color: '#fff', opacity: 0.8 }}>{post.author}</td>
                <td style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{post.views}</td>
                <td style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                  {formatRelativeTime(post.creation_date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          <ArcadeButton
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ◀
          </ArcadeButton>
          <span
            className="arcade-font-pixel"
            style={{ color: 'var(--arcade-accent)', alignSelf: 'center', fontSize: '0.7rem' }}
          >
            {page} / {totalPages}
          </span>
          <ArcadeButton
            variant="secondary"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            ▶
          </ArcadeButton>
        </div>
      )}
    </div>
  )
}

export default function CommPage() {
  return (
    <Suspense fallback={null}>
      <CommBoard />
    </Suspense>
  )
}
