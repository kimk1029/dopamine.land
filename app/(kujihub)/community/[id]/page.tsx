import { redirect } from 'next/navigation'

// 이관 후 게시글 ID 체계가 달라 목록으로 보낸다.
export default function Page() {
  redirect('/comm')
}
