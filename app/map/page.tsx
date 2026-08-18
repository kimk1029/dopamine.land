import type { Metadata } from 'next'
import '@/styles/arcade/kuji-map.css'
import KujiShopMap from '@/components/map/KujiShopMap'

export const metadata: Metadata = {
  title: '쿠지샵 지도 | DOPAMINE.LAND',
  description: '전국 쿠지 · 가챠 · 크레인 매장을 지도에서 한눈에 확인하세요.',
}

export default function Page() {
  return <KujiShopMap />
}
