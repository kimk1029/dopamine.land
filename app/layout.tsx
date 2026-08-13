import type { Metadata } from 'next'
import './globals.css'
import '@/styles/arcade/arcade.css'
import '@/styles/arcade/arcade-components.css'
import GoogleAdsense from '@/components/GoogleAdsense'
import OnlineUsers from '@/components/OnlineUsers'
import ArcadeShell from '@/components/layout/ArcadeShell'

export const metadata: Metadata = {
  metadataBase: new URL('https://dopamine-ground.vercel.app'),
  title: 'DOPAMINE.LAND',
  description: '지금 접속하면 100포인트 무료! 실시간 랭킹 1위에 도전하세요.',
  icons: {
    icon: [
      { url: '/arcade-icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: '/arcade-icon.svg',
  },
  openGraph: {
    title: 'DOPAMINE.LAND',
    description: '지금 접속하면 100포인트 무료! 실시간 랭킹 1위에 도전하세요.',
    url: 'https://dopamine-ground.vercel.app',
    siteName: 'DOPAMINE.LAND',
    images: [
      {
        url: '/images/og-default.png',
        width: 1200,
        height: 630,
        alt: 'DOPAMINE LAND Main Preview',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8606099213555265"
          crossOrigin="anonymous"
        />
        <GoogleAdsense pId={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID || ''} />
      </head>
      <body suppressHydrationWarning>
        <ArcadeShell>{children}</ArcadeShell>
        <OnlineUsers />
      </body>
    </html>
  )
}

