import { redirect } from 'next/navigation'

// kujihub 커뮤니티는 통합 DB 기반 /comm 채널로 합쳐졌다.
export default function Page() {
  redirect('/comm')
}
