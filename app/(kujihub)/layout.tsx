import '@/styles/kujihub/base.css'
import KujihubGuard from '@/components/kujihub/KujihubGuard'

/**
 * kujihub 에서 옮겨온 라우트들의 공통 껍데기.
 *
 * `.kujihub-scope` 는 원본 index.css 의 전역 리셋을 이 서브트리에만
 * 적용하기 위한 것이다(styles/kujihub/base.css 주석 참고). 사이드바는
 * 루트 레이아웃의 ArcadeShell 이 이미 그리고 있으므로 여기서는 감싸지 않는다.
 */
export default function KujihubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="kujihub-scope">
      <KujihubGuard>{children}</KujihubGuard>
    </div>
  )
}
