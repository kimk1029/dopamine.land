import { redirect } from 'next/navigation'

// 수정은 /comm 상세 화면의 EDIT_MESSAGE 모달로 통합되었다.
export default function Page() {
  redirect('/comm')
}
