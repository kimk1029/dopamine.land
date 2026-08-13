'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'

type SajuReport = {
  title: string
  overall: string
  relationship: string
  money: string
  health: string
  action: string
}

const overallPool = [
  '기본 기운이 안정적으로 흐르며, 급한 변화보다는 꾸준함에서 성과가 쌓이는 흐름입니다.',
  '새로운 인연과 기회가 들어오기 쉬운 시기입니다. 다만 선택 기준을 분명히 하면 더 좋습니다.',
  '외부 변화가 잦은 편이라 유연성이 중요한 운세입니다. 일정 여유를 남겨두면 실수가 줄어듭니다.',
  '집중력이 높아지는 시기로, 하나를 깊게 파고들 때 좋은 결과가 나옵니다.',
]

const relationshipPool = [
  '가까운 관계에서는 말보다 태도가 크게 전달되는 흐름입니다. 작은 배려가 신뢰를 키웁니다.',
  '새로운 인연운이 들어와 만남 폭이 넓어질 수 있습니다. 성급함보다 관찰이 유리합니다.',
  '기존 관계의 재정비에 좋은 시기입니다. 오해가 있었던 부분은 먼저 풀어보세요.',
  '감정 기복을 조절하면 관계운이 크게 올라갑니다. 반응 전에 한 박자 쉬는 습관이 도움됩니다.',
]

const moneyPool = [
  '수입보다 지출 관리가 핵심인 흐름입니다. 고정비 점검이 운을 지켜줍니다.',
  '작은 보상, 환급, 할인 등 생활형 재물운이 들어오기 쉬운 시기입니다.',
  '큰 결정보다 분산과 기록이 유리합니다. 소비 내역을 적으면 흐름이 안정됩니다.',
  '준비해 둔 일이 금전적으로 연결될 가능성이 있습니다. 서두르지 말고 타이밍을 보세요.',
]

const healthPool = [
  '수면 리듬과 회복력이 운세의 기반이 됩니다. 잠드는 시간을 일정하게 맞춰 보세요.',
  '목·어깨 긴장 관리가 중요합니다. 짧은 스트레칭을 자주 하는 습관이 좋습니다.',
  '소화·컨디션이 예민할 수 있어 과식과 야식을 줄이는 것이 유리합니다.',
  '체력은 나쁘지 않지만 과로 누적에 주의가 필요합니다. 주간 휴식 계획을 먼저 잡으세요.',
]

const actionPool = [
  '이번 주 행동 포인트: 일정을 80%만 채우고 20%는 여유 시간으로 비워두기.',
  '이번 주 행동 포인트: 미뤄둔 정리 1개를 마무리해 기운의 막힘을 풀기.',
  '이번 주 행동 포인트: 중요한 연락 1건 먼저 보내 흐름의 주도권 잡기.',
  '이번 주 행동 포인트: 지출 1개 줄이고 자기계발 1개 시작하기.',
]

function getSeedIndex(seed: string, size: number): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return hash % size
}

function getSajuResult(birthStr: string): SajuReport {
  const titleIndex = getSeedIndex(`${birthStr}-title`, 4)
  const title = ['균형형', '성장형', '변화형', '안정형'][titleIndex]
  return {
    title,
    overall: overallPool[getSeedIndex(`${birthStr}-overall`, overallPool.length)],
    relationship: relationshipPool[getSeedIndex(`${birthStr}-relationship`, relationshipPool.length)],
    money: moneyPool[getSeedIndex(`${birthStr}-money`, moneyPool.length)],
    health: healthPool[getSeedIndex(`${birthStr}-health`, healthPool.length)],
    action: actionPool[getSeedIndex(`${birthStr}-action`, actionPool.length)],
  }
}

export default function SajuPage() {
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')

  const result = useMemo(() => {
    const y = year.trim()
    const m = month.trim()
    const d = day.trim()
    if (!y || !m || !d) return null
    return getSajuResult(`${y}-${m}-${d}`)
  }, [year, month, day])

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100">
      <HeaderNavigator />
      <main className="container mx-auto px-4 sm:px-6 pb-20">
        <Link href="/psychology" className="inline-flex items-center text-slate-500 hover:text-slate-400 text-sm mb-6">← 심리테스트</Link>
        <h1 className="text-2xl font-bold text-white mb-2">사주</h1>
        <p className="text-slate-400 mb-8">생년월일을 입력하면 중앙 리포트 형태로 사주 풀이를 보여드려요. (재미용)</p>

        <div className="max-w-3xl mx-auto space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 text-sm mb-1">년</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1990"
                className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">월</label>
              <input
                type="text"
                value={month}
                onChange={(e) => setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="01"
                className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">일</label>
              <input
                type="text"
                value={day}
                onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="15"
                className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>
          {result && (
            <div className="bg-[#18181b] border border-amber-500/30 rounded-2xl p-6 md:p-8 space-y-6 text-center">
              <div>
                <p className="text-sm text-amber-300/80">사주 결과 리포트</p>
                <h2 className="text-2xl font-bold text-amber-200 mt-1">{result.title} 기질</h2>
              </div>

              <div className="space-y-4 text-left">
                <div className="bg-amber-500/5 border border-white/10 rounded-xl p-4">
                  <p className="text-amber-300 font-semibold mb-2">종합 흐름</p>
                  <p className="text-slate-200 leading-relaxed">{result.overall}</p>
                </div>
                <div className="bg-amber-500/5 border border-white/10 rounded-xl p-4">
                  <p className="text-amber-300 font-semibold mb-2">관계운</p>
                  <p className="text-slate-200 leading-relaxed">{result.relationship}</p>
                </div>
                <div className="bg-amber-500/5 border border-white/10 rounded-xl p-4">
                  <p className="text-amber-300 font-semibold mb-2">재물운</p>
                  <p className="text-slate-200 leading-relaxed">{result.money}</p>
                </div>
                <div className="bg-amber-500/5 border border-white/10 rounded-xl p-4">
                  <p className="text-amber-300 font-semibold mb-2">건강운</p>
                  <p className="text-slate-200 leading-relaxed">{result.health}</p>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4">
                  <p className="text-amber-200 font-semibold mb-2">실천 가이드</p>
                  <p className="text-amber-100 leading-relaxed">{result.action}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
