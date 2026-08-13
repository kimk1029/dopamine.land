/**
 * 구 /notice 페이지의 하드코딩 공지들을 comm(공지 카테고리) 게시글로 이관한다.
 * 실행: node scripts/seed-notices.js  (.env.local의 DATABASE_URL 필요)
 */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const notices = [
  {
    title: '오픈 베타 서비스 시작 안내',
    content:
      '안녕하세요, 관리자입니다. 드디어 오픈 베타 서비스를 시작합니다! 많은 이용 부탁드립니다.',
    createdAt: new Date('2023-10-25T00:00:00+09:00'),
  },
  {
    title: '[점검] 서버 안정화 작업 안내',
    content:
      '서버 안정화를 위해 10월 27일 새벽 2시부터 4시까지 점검이 진행될 예정입니다.',
    createdAt: new Date('2023-10-26T00:00:00+09:00'),
  },
  {
    title: '신규 게임 "이치방쿠지" 업데이트',
    content: '새로운 뽑기 게임 이치방쿠지가 추가되었습니다. 지금 바로 도전해보세요!',
    createdAt: new Date('2023-10-30T00:00:00+09:00'),
  },
]

async function main() {
  const admin = await prisma.user.findFirst({
    where: { userType: 1 },
    orderBy: { id: 'asc' },
  })
  if (!admin) {
    throw new Error('관리자(userType=1) 계정이 없어 공지를 이관할 수 없습니다.')
  }

  for (const notice of notices) {
    const exists = await prisma.post.findFirst({
      where: { title: notice.title, isNotice: true },
    })
    if (exists) {
      console.log(`skip (이미 존재): ${notice.title}`)
      continue
    }
    await prisma.post.create({
      data: {
        title: notice.title,
        content: notice.content,
        category: '공지',
        isNotice: true,
        authorId: admin.id,
        createdAt: notice.createdAt,
      },
    })
    console.log(`이관 완료: ${notice.title}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
