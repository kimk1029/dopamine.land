import { redirect } from 'next/navigation'

// 게시판 상세는 /comm/[id]로 통합되었다.
export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/comm/${id}`)
}
