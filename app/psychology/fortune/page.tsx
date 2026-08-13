'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'
import { fortuneCategories, fortuneData, getSeedIndex } from './data'

const luckyColors = ['골드', '네이비', '화이트', '민트', '라벤더', '버건디', '스카이']
const luckyItems = ['노트', '머그컵', '이어폰', '책갈피', '키링', '손수건', '작은 파우치']
const luckyTimes = ['09:00~11:00', '11:00~13:00', '14:00~16:00', '16:00~18:00', '20:00~22:00']
const luckyDirections = ['동쪽', '서쪽', '남쪽', '북쪽', '남동쪽', '북서쪽']

const categoryGuides: Record<string, string> = {
  total: '오늘은 전체 흐름을 무리 없이 이어가는 것이 핵심입니다. 빠른 결정보다는 안정적인 선택이 더 유리합니다.',
  money: '금전운은 들어오고 나가는 흐름을 동시에 확인하는 날입니다. 결제 전에 한 번 더 체크하면 실수가 줄어듭니다.',
  love: '연애/관계운은 말의 온도가 중요합니다. 짧아도 따뜻한 표현이 관계를 크게 바꿀 수 있습니다.',
  health: '건강운은 회복 리듬이 포인트입니다. 피곤함을 미루지 말고 짧게라도 쉬는 구간을 확보해 보세요.',
  work: '학업·일운은 집중 시간대를 정해 몰입할 때 효율이 올라갑니다. 우선순위 1개를 먼저 끝내는 전략이 좋습니다.',
}

export default function FortunePage() {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  const results = useMemo(() => {
    if (!hasSubmitted) return null
    const trimmed = name.trim()
    if (!trimmed || !birthDate) return null
    const seed = `${trimmed}-${birthDate}-${today}`

    const categoryResults = fortuneCategories.map((cat) => {
      const list = fortuneData[cat.key]
      const index = getSeedIndex(seed + cat.key, list.length)
      return { ...cat, text: list[index], guide: categoryGuides[cat.key] }
    })

    return {
      categories: categoryResults,
      profileTitle: ['차분한 추진형', '균형 잡힌 성장형', '관계 운용형', '기회 포착형'][getSeedIndex(`${seed}-title`, 4)],
      luckyColor: luckyColors[getSeedIndex(`${seed}-color`, luckyColors.length)],
      luckyItem: luckyItems[getSeedIndex(`${seed}-item`, luckyItems.length)],
      luckyTime: luckyTimes[getSeedIndex(`${seed}-time`, luckyTimes.length)],
      luckyDirection: luckyDirections[getSeedIndex(`${seed}-direction`, luckyDirections.length)],
      overallComment:
        [
          '오늘의 흐름은 급하게 크게 바꾸기보다, 이미 잡아둔 리듬을 유지할 때 안정적으로 좋아집니다.',
          '대인/업무/금전에서 모두 작은 조정이 큰 차이를 만드는 날입니다. 디테일을 챙기면 운이 열립니다.',
          '에너지가 분산되기 쉬운 날이라 선택과 집중이 중요합니다. 우선순위 1순위를 먼저 끝내보세요.',
          '컨디션 관리와 소통 균형이 좋아서, 무리하지 않으면 체감 성과가 분명히 보이는 하루입니다.',
        ][getSeedIndex(`${seed}-overall`, 4)],
    }
  }, [name, birthDate, today, hasSubmitted])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100">
      <HeaderNavigator />
      <main className="container mx-auto px-4 sm:px-6 pb-20">
        <Link href="/psychology" className="inline-flex items-center text-slate-500 hover:text-slate-400 text-sm mb-6">← 심리테스트</Link>
        <h1 className="text-2xl font-bold text-white mb-2">오늘의 운세</h1>
        <p className="text-slate-400 mb-8">이름과 생년월일을 입력하면 오늘의 운세를 카테고리별로 보여드려요.</p>

        <div className="max-w-3xl mx-auto space-y-6">
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 또는 닉네임 입력"
              className="w-full bg-[#18181b] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-yellow-500"
            />
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-[#18181b] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-yellow-500"
            />
            <button
              onClick={() => {
                if (!name.trim() || !birthDate || isLoading) return
                setHasSubmitted(false)
                setIsLoading(true)
                if (timeoutRef.current) clearTimeout(timeoutRef.current)
                timeoutRef.current = setTimeout(() => {
                  setIsLoading(false)
                  setHasSubmitted(true)
                }, 5000)
              }}
              disabled={!name.trim() || !birthDate || isLoading}
              className={`w-full rounded-lg px-4 py-3 font-semibold transition ${
                !name.trim() || !birthDate || isLoading
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-yellow-600 hover:bg-yellow-500 text-white'
              }`}
            >
              {isLoading ? '운세 계산 중...' : '운세 보기'}
            </button>
          </div>

          {isLoading && (
            <div className="bg-[#18181b] border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 text-yellow-300">
                <div className="w-5 h-5 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
                <span>입력 정보로 운세를 계산 중입니다... (약 5초)</span>
              </div>
            </div>
          )}

          {!isLoading && results && (
            <div className="bg-[#18181b] border border-yellow-500/25 rounded-2xl p-6 md:p-8 space-y-6 text-center">
              <div>
                <p className="text-yellow-300/80 text-sm">오늘의 운세 결과 리포트</p>
                <h2 className="text-2xl font-bold text-yellow-200 mt-1">{results.profileTitle}</h2>
                <p className="text-slate-300 mt-3 leading-relaxed">{results.overallComment}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
                <div className="bg-yellow-500/5 border border-white/10 rounded-lg p-3">
                  <p className="text-yellow-300 text-xs mb-1">럭키 컬러</p>
                  <p className="text-slate-100 font-semibold">{results.luckyColor}</p>
                </div>
                <div className="bg-yellow-500/5 border border-white/10 rounded-lg p-3">
                  <p className="text-yellow-300 text-xs mb-1">럭키 아이템</p>
                  <p className="text-slate-100 font-semibold">{results.luckyItem}</p>
                </div>
                <div className="bg-yellow-500/5 border border-white/10 rounded-lg p-3">
                  <p className="text-yellow-300 text-xs mb-1">집중 시간대</p>
                  <p className="text-slate-100 font-semibold">{results.luckyTime}</p>
                </div>
                <div className="bg-yellow-500/5 border border-white/10 rounded-lg p-3">
                  <p className="text-yellow-300 text-xs mb-1">길한 방향</p>
                  <p className="text-slate-100 font-semibold">{results.luckyDirection}</p>
                </div>
              </div>

              <div className="space-y-4 text-left">
                {results.categories.map((item) => (
                  <div key={item.key} className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5">
                    <p className="text-yellow-400 font-bold text-sm mb-2">{item.label}</p>
                    <p className="text-slate-200 leading-relaxed">{item.text}</p>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">{item.guide}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
