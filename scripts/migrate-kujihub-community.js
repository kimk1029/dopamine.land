/**
 * kujihub 서버(기본: 시놀로지 운영 서버)의 community 데이터를
 * 통합 DB(Post / Comment)로 이관한다.
 *
 * 실행: node scripts/migrate-kujihub-community.js
 *   - 통합 DB 접속은 DATABASE_URL 환경변수 사용 (.env.local 참고)
 *   - 소스는 KUJIHUB_API_ORIGIN (기본 http://kimk1029.synology.me:9933)
 *
 * 작성자 매핑: kujihub 커뮤니티는 익명 문자열 작성자라서, 닉네임이 일치하는
 * 계정이 있으면 그 계정으로, 없으면 'KUJIHUB' 이관용 계정으로 귀속시키고
 * 본문 앞에 원작성자를 표기한다.
 */
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')

const ORIGIN = process.env.KUJIHUB_API_ORIGIN || 'http://kimk1029.synology.me:9933'
const prisma = new PrismaClient()

async function fetchJson(path) {
  const res = await fetch(`${ORIGIN}${path}`)
  if (!res.ok) throw new Error(`${path} 요청 실패: ${res.status}`)
  return res.json()
}

async function getFallbackUser() {
  const existing = await prisma.user.findFirst({ where: { nickname: 'KUJIHUB' } })
  if (existing) return existing
  return prisma.user.create({
    data: {
      email: 'kujihub-import@dopamine.land',
      password: crypto.randomBytes(32).toString('hex'), // 로그인 불가 계정
      nickname: 'KUJIHUB',
    },
  })
}

async function main() {
  const posts = await fetchJson('/api/community/posts')
  console.log(`kujihub 서버: 게시글 ${posts.length}건 발견`)

  const fallback = await getFallbackUser()
  const users = await prisma.user.findMany({ select: { id: true, nickname: true } })
  const byNickname = new Map(users.map((u) => [u.nickname, u.id]))

  const resolveAuthor = (author) => {
    const id = byNickname.get(author)
    return id
      ? { authorId: id, prefix: '' }
      : { authorId: fallback.id, prefix: `[원작성자: ${author || '익명'}]\n\n` }
  }

  let newPosts = 0
  let newComments = 0
  let skipped = 0

  for (const p of posts) {
    const createdAt = new Date(p.createdAt)
    let targetId
    const dup = await prisma.post.findFirst({ where: { title: p.title, createdAt } })
    if (dup) {
      targetId = dup.id
      skipped++
    } else {
      const { authorId, prefix } = resolveAuthor(p.author)
      const created = await prisma.post.create({
        data: {
          title: p.title,
          content: prefix + (p.content || ''),
          category: p.isNotice ? '공지' : p.category || '자유',
          isNotice: Boolean(p.isNotice),
          authorId,
          createdAt,
        },
      })
      targetId = created.id
      newPosts++
    }

    if (!p.commentCount) continue
    const comments = await fetchJson(`/api/community/posts/${p.id}/comments`)
    for (const c of comments) {
      const cCreatedAt = new Date(c.createdAt)
      const cDup = await prisma.comment.findFirst({
        where: { postId: targetId, createdAt: cCreatedAt, content: { endsWith: c.content } },
      })
      if (cDup) continue
      const { authorId, prefix } = resolveAuthor(c.author)
      await prisma.comment.create({
        data: {
          content: prefix + c.content,
          postId: targetId,
          authorId,
          createdAt: cCreatedAt,
        },
      })
      newComments++
    }
  }

  console.log(`이관 완료: 게시글 신규 ${newPosts} (중복 스킵 ${skipped}), 댓글 신규 ${newComments}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
