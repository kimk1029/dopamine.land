'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import HeaderNavigator from '@/components/HeaderNavigator'
import { tendencyOptionLabels, tendencyQuestions } from './data'
import { computeRoleResults, encodePayload, type AnswerValue } from './result-utils'

export default function TendencyPage() {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({})

  const answeredCount = Object.keys(answers).length
  const progress = Math.round((answeredCount / tendencyQuestions.length) * 100)

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100">
      <HeaderNavigator />
      <main className="container mx-auto px-4 sm:px-6 pb-20">
        <Link href="/psychology" className="inline-flex items-center text-slate-500 hover:text-slate-400 text-sm mb-6">
          ← 심리테스트
        </Link>
        <h1 className="text-2xl font-bold text-white mb-2">성 성향 테스트</h1>
        <p className="text-slate-400 mb-2">문항 {tendencyQuestions.length}개 · 5점 척도 상세 결과</p>
        <p className="text-xs text-slate-500 mb-6">결과는 참고용이며 개인의 실제 관계는 신뢰·합의·존중이 최우선입니다.</p>

        <div className="max-w-5xl mx-auto space-y-8">
          <div className="bg-[#18181b] border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">진행률</span>
              <span className="text-sm text-cyan-400">
                {answeredCount}/{tendencyQuestions.length} ({progress}%)
              </span>
            </div>
            <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="space-y-4">
            {tendencyQuestions.map((q) => (
              <div key={q.id} className="bg-[#18181b] border border-white/10 rounded-xl p-4">
                <p className="font-semibold text-white mb-3">
                  {q.id}. {q.text}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {tendencyOptionLabels.map((label, idx) => {
                    const value = (idx + 1) as AnswerValue
                    const selected = answers[q.id] === value
                    return (
                      <button
                        key={value}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
                        className={`px-3 py-2 rounded-lg border text-sm transition ${
                          selected
                            ? 'bg-cyan-600 border-cyan-500 text-white'
                            : 'bg-black/20 border-white/10 text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                if (answeredCount !== tendencyQuestions.length) return
                const results = computeRoleResults(answers)
                const data = encodePayload({
                  generatedAt: new Date().toISOString(),
                  totalQuestions: tendencyQuestions.length,
                  results,
                })
                router.push(`/psychology/tendency/result?data=${data}`)
              }}
              className={`px-5 py-2 rounded-lg font-semibold transition ${
                answeredCount === tendencyQuestions.length
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
              disabled={answeredCount !== tendencyQuestions.length}
            >
              결과 보기
            </button>
            <button
              onClick={() => {
                setAnswers({})
              }}
              className="px-5 py-2 rounded-lg font-semibold border border-white/15 text-slate-300 hover:bg-white/5"
            >
              다시하기
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
