import { redirect } from 'next/navigation'

// 공지사항은 /comm 커뮤니티 채널의 NOTICE 카테고리로 통합되었다.
export default function NoticePage() {
  redirect(`/comm?category=${encodeURIComponent('공지')}`)
}
