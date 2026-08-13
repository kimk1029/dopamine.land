/**
 * kujihub 로컬 DB(community_posts / community_comments)의 데이터를
 * 통합 DB(Post / Comment)로 이관한다.
 *
 * 실행:
 *   KUJIHUB_DATABASE_URL="postgresql://postgres@localhost:5432/kujihub" \
 *     node scripts/migrate-kujihub-community.js
 *   (통합 DB 접속은 .env.local의 DATABASE_URL 사용)
 *
 * 작성자 매핑: kujihub 커뮤니티는 익명 문자열 작성자라서, 닉네임이 일치하는
 * 계정이 있으면 그 계정으로, 없으면 'KUJIHUB' 이관용 계정으로 귀속시키고
 * 본문 앞에 원작성자를 표기한다.
 */
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')

const target = new PrismaClient()
const source = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.KUJIHUB_DATABASE_URL ||
        'postgresql://postgres@localhost:5432/kujihub',
    },
  },
})

async function getFallbackUser() {
  const existing = await target.user.findFirst({ where: { nickname: 'KUJIHUB' } })
  if (existing) return existing
  return target.user.create({
    data: {
      email: 'kujihub-import@dopamine.land',
      password: crypto.randomBytes(32).toString('hex'), // 로그인 불가 계정
      nickname: 'KUJIHUB',
    },
  })
}

async function main() {
  const posts = await source.$queryRawUnsafe(
    'SELECT id, category, is_notice, title, content, author, created_at FROM community_posts ORDER BY id'
  )
  const comments = await source.$queryRawUnsafe(
    'SELECT id, post_id, author, content, created_at FROM community_comments ORDER BY id'
  )
  console.log(`kujihub: 게시글 ${posts.length}건, 댓글 ${comments.length}건 발견`)

  const fallback = await getFallbackUser()
  const users = await target.user.findMany({ select: { id: true, nickname: true } })
  const byNickname = new Map(users.map((u) => [u.nickname, u.id]))

  const resolveAuthor = (author) => {
    const id = byNickname.get(author)
    return id
      ? { authorId: id, prefix: '' }
      : { authorId: fallback.id, prefix: `[원작성자: ${author || '익명'}]\n\n` }
  }

  const postIdMap = new Map()
  let skipped = 0

  for (const p of posts) {
    const dup = await target.post.findFirst({
      where: { title: p.title, createdAt: p.created_at },
    })
    if (dup) {
      postIdMap.set(p.id, dup.id)
      skipped++
      continue
    }
    const { authorId, prefix } = resolveAuthor(p.author)
    const created = await target.post.create({
      data: {
        title: p.title,
        content: prefix + (p.content || ''),
        category: p.is_notice ? '공지' : p.category || '자유',
        isNotice: Boolean(p.is_notice),
        authorId,
        createdAt: p.created_at,
      },
    })
    postIdMap.set(p.id, created.id)
  }
  console.log(`게시글 이관 완료 (신규 ${postIdMap.size - skipped}, 중복 스킵 ${skipped})`)

  let migratedComments = 0
  for (const c of comments) {
    const postId = postIdMap.get(c.post_id)
    if (!postId) continue
    const dup = await target.comment.findFirst({
      where: { postId, createdAt: c.created_at, content: c.content },
    })
    if (dup) continue
    const { authorId, prefix } = resolveAuthor(c.author)
    await target.comment.create({
      data: {
        content: prefix + c.content,
        postId,
        authorId,
        createdAt: c.created_at,
      },
    })
    migratedComments++
  }
  console.log(`댓글 이관 완료 (신규 ${migratedComments})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await source.$disconnect()
    await target.$disconnect()
  })
