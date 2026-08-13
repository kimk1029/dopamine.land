import { redirect } from 'next/navigation'

// 글쓰기는 /comm의 NEW_MESSAGE 폼으로 통합되었다.
export default function Page() {
  redirect('/comm')
}
