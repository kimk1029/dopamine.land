import { ProfilePage } from '@/components/kujihub/pages/ProfilePage'
import ArcadePointsPanel from '@/components/profile/ArcadePointsPanel'

// 마이페이지 = 쿠지허브 프로필 + 아케이드 포인트/전적 대시보드 통합.
export default function Page() {
  return (
    <>
      <ProfilePage />
      <div style={{ marginTop: '40px' }}>
        <ArcadePointsPanel />
      </div>
    </>
  )
}
