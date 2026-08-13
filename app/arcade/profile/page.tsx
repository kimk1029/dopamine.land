import { redirect } from 'next/navigation'

// 포인트 대시보드는 마이페이지(/profile)로 통합되었다.
export default function ArcadeProfilePage() {
  redirect('/profile')
}
