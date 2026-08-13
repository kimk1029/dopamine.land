'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import { decodePayload, getBarColor, getIntensityText, getScoreTextColor, type RoleResult } from '../result-utils'

function TendencyResultContent() {
  const searchParams = useSearchParams()
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null)
  const [shared, setShared] = useState(false)

  const payload = useMemo(() => decodePayload(searchParams.get('data')), [searchParams])
  const results = payload?.results ?? []
  const top3 = results.slice(0, 3)
  const topRole = top3[0] ?? null
  const secondRole = top3[1] ?? null
  const thirdRole = top3[2] ?? null
  const selectedRole = results.find((r) => r.key === selectedRoleKey) ?? topRole ?? null

  const handleShare = async () => {
    if (!topRole) return

    const text = `내 성 성향 테스트 결과는 ${topRole.label} (${topRole.score}%)야. 너도 해봐!`
    const url = window.location.href

    try {
      if (navigator.share) {
        await navigator.share({
          title: '성 성향 테스트 결과',
          text,
          url,
        })
        setShared(true)
        setTimeout(() => setShared(false), 2000)
        return
      }
    } catch {
      // 사용자가 공유 시트를 닫은 경우를 포함해 fallback으로 이동
    }

    await navigator.clipboard.writeText(url)
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  if (!payload || results.length === 0) {
    return (
      <div className="min-h-screen bg-[#09090b] text-slate-100">
        <HeaderNavigator />
        <main className="container mx-auto px-4 sm:px-6 pb-20 flex flex-col items-center justify-center min-h-[80vh]">
          <h1 className="text-2xl font-bold text-white mb-2">결과 정보를 찾을 수 없어요.</h1>
          <p className="text-slate-400 mb-6 text-center">테스트를 완료한 뒤 결과 페이지로 이동해 주세요.</p>
          <Link
            href="/psychology/tendency"
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-white transition-colors"
          >
            테스트 하러 가기
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 overflow-x-hidden">
      <HeaderNavigator />
      <main className="container mx-auto px-4 sm:px-6 pb-20">
        <div className="max-w-3xl mx-auto bg-[#18181b] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="text-center">
            <p className="text-sm text-cyan-300/80">성 성향 테스트 결과 리포트</p>
            <h1 className="text-3xl font-black text-white mt-1">{topRole?.label}</h1>
            <p className="text-slate-300 mt-1">
              {topRole?.score}% · {topRole ? getIntensityText(topRole.score) : '-'}
            </p>
          </div>

          <div className="space-y-2">
            {results.map((item: RoleResult) => {
              const abs = Math.min(100, Math.abs(item.score))
              const width = `${(abs / 100) * 50}%`
              return (
                <div key={item.key} className="grid grid-cols-[64px_1fr_130px_78px] gap-3 items-center">
                  <span className={`text-lg font-semibold ${getScoreTextColor(item.score)}`}>{item.score}%</span>
                  <div className="relative h-2 bg-black/40 rounded-full overflow-hidden">
                    <div className="absolute left-1/2 top-0 h-full w-[1px] bg-white/30" />
                    {item.score >= 0 ? (
                      <div className={`absolute left-1/2 top-0 h-full ${getBarColor(item.score)}`} style={{ width }} />
                    ) : (
                      <div className={`absolute right-1/2 top-0 h-full ${getBarColor(item.score)}`} style={{ width }} />
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedRoleKey(item.key)}
                    className={`text-left font-medium transition ${
                      selectedRoleKey === item.key ? 'text-cyan-300' : 'text-slate-200 hover:text-cyan-300'
                    }`}
                  >
                    {item.label}
                  </button>
                  <button onClick={() => setSelectedRoleKey(item.key)} className="text-sm text-slate-400 hover:text-slate-200">
                    성향 해설
                  </button>
                </div>
              )
            })}
          </div>

          {selectedRole && (
            <div className="border border-white/10 rounded-xl p-5 md:p-6 bg-black/20 space-y-5">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="bg-cyan-500/5 border border-white/10 rounded-lg p-3">
                  <p className="text-xs text-cyan-300 mb-1">주 성향</p>
                  <p className="text-slate-100 font-semibold">
                    {topRole?.label ?? '-'} ({topRole?.score ?? 0}%)
                  </p>
                </div>
                <div className="bg-cyan-500/5 border border-white/10 rounded-lg p-3">
                  <p className="text-xs text-cyan-300 mb-1">보조 성향</p>
                  <p className="text-slate-100 font-semibold">
                    {secondRole?.label ?? '-'} ({secondRole?.score ?? 0}%)
                  </p>
                </div>
                <div className="bg-cyan-500/5 border border-white/10 rounded-lg p-3">
                  <p className="text-xs text-cyan-300 mb-1">서브 성향</p>
                  <p className="text-slate-100 font-semibold">
                    {thirdRole?.label ?? '-'} ({thirdRole?.score ?? 0}%)
                  </p>
                </div>
              </div>

              <div className="bg-cyan-500/5 border border-white/10 rounded-lg p-4">
                <p className="text-cyan-300 font-semibold mb-2">
                  {selectedRole.label} ({selectedRole.score}%)
                </p>
                <p className="text-slate-300 leading-relaxed">{selectedRole.description}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleShare}
              className="w-full py-4 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition-colors"
            >
              {shared ? '✅ 공유 링크 복사 완료!' : '🔗 결과 공유하기'}
            </button>
            <Link
              href="/psychology/tendency"
              className="block w-full py-4 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl font-bold transition-colors text-center border border-white/10"
            >
              다시 테스트하기
            </Link>
            <Link
              href="/psychology"
              className="block w-full py-3 text-slate-500 hover:text-slate-400 text-sm font-medium transition-colors text-center"
            >
              ← 심리테스트 메인으로
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function TendencyResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090b] text-slate-100 flex items-center justify-center">
          <div className="animate-pulse text-slate-400">결과를 불러오는 중...</div>
        </div>
      }
    >
      <TendencyResultContent />
    </Suspense>
  )
}

