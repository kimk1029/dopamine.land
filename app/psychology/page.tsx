'use client'

import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'
import { LayoutGrid, Heart, CalendarDays, Moon, Sun } from 'lucide-react'

const portalItems = [
  { href: '/mbti', label: '밤MBTI', desc: '16문항 · 결과 공유', icon: LayoutGrid, color: 'from-violet-500 to-purple-700', bg: 'hover:from-violet-600/20 hover:to-purple-700/20 border-violet-500/30' },
  { href: '/psychology/tendency', label: '성 성향', desc: '관계 성향 테스트', icon: Heart, color: 'from-pink-500 to-rose-600', bg: 'hover:from-pink-600/20 hover:to-rose-600/20 border-pink-500/30' },
  { href: '/psychology/saju', label: '사주', desc: '생년월일로 보는 사주', icon: CalendarDays, color: 'from-amber-500 to-orange-600', bg: 'hover:from-amber-600/20 hover:to-orange-600/20 border-amber-500/30' },
  { href: '/psychology/dream', label: '꿈해몽', desc: '꿈 키워드 해석', icon: Moon, color: 'from-indigo-500 to-blue-700', bg: 'hover:from-indigo-600/20 hover:to-blue-700/20 border-indigo-500/30' },
  { href: '/psychology/fortune', label: '오늘의 운세', desc: '이름으로 보는 오늘 운세', icon: Sun, color: 'from-yellow-500 to-amber-600', bg: 'hover:from-yellow-600/20 hover:to-amber-600/20 border-yellow-500/30' },
]

export default function PsychologyPortalPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 overflow-x-hidden">
      <HeaderNavigator />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">심리테스트</h1>
        <p className="text-slate-400 mb-10">원하는 테스트를 골라보세요.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {portalItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl bg-[#18181b] border border-white/10 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 ${item.bg}`}
            >
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 shadow-lg`}>
                <item.icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <span className="font-bold text-white text-center text-base sm:text-lg">{item.label}</span>
              <span className="text-slate-400 text-xs sm:text-sm mt-1 text-center">{item.desc}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
