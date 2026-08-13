import { redirect } from 'next/navigation'

// 게시판은 /comm 커뮤니티 채널로 통합되었다.
export default function BoardPage() {
  redirect('/comm')
}
