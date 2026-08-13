'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'
import { dreamInterpretations, dreamDefaultMessage } from './data'

type DreamReport = {
  summary: string
  emotion: string
  relation: string
  growth: string
  action: string
}

function getSeedIndex(seed: string, size: number): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return hash % size
}

export default function DreamPage() {
  const [dreamInput, setDreamInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const result = useMemo(() => {
    if (!hasSubmitted) return null

    const trimmed = dreamInput.trim()
    if (!trimmed) return { matches: [], message: dreamDefaultMessage, report: null as DreamReport | null }

    const matches: { keyword: string; text: string }[] = []
    for (const keyword of Object.keys(dreamInterpretations)) {
      if (trimmed.includes(keyword)) {
        matches.push({ keyword, text: dreamInterpretations[keyword] })
      }
    }

    if (matches.length === 0) return { matches: [], message: dreamDefaultMessage, report: null as DreamReport | null }

    const seed = `${trimmed}-${matches.map((m) => m.keyword).join('-')}`
    const summaries = [
      '이번 꿈은 최근의 감정 정리와 현실 과제 사이에서 균형을 찾으려는 마음이 반영된 흐름으로 보입니다.',
      '무의식 속에서 현재 고민을 재배치하는 과정이 강하게 나타났습니다. 중요한 선택을 앞둔 신호일 수 있습니다.',
      '꿈 전체 분위기로 볼 때, 불안과 기대가 함께 움직이는 전환기성 패턴이 확인됩니다.',
      '꿈의 상징들이 공통적으로 내면의 에너지 회복과 관계 정비를 가리키고 있습니다.',
    ]
    const emotions = [
      '감정선은 예민하지만 통제 불가능한 수준은 아닙니다. 감정을 억누르기보다 이름 붙여 정리할수록 빠르게 안정됩니다.',
      '긴장감이 꿈 안에서 상징적으로 해소되는 모습입니다. 낮 시간에는 작은 휴식 루틴이 도움이 됩니다.',
      '무의식에서 경계심이 높아져 있습니다. 새로운 자극을 줄이고 익숙한 패턴으로 하루를 구성해 보세요.',
      '내면의 피로와 회복 욕구가 동시에 보입니다. 감정 소모가 큰 대화는 짧게 정리하는 것이 유리합니다.',
    ]
    const relations = [
      '관계 측면에서는 오해를 줄이는 직접적 표현이 중요합니다. 추측보다 확인이 관계운을 올립니다.',
      '지금은 상대를 이해하려는 태도가 강점으로 작동합니다. 반응보다 질문이 더 좋은 결과를 만듭니다.',
      '관계에서 기대치 조율이 핵심입니다. 경계를 분명히 말하면 안정감이 올라갑니다.',
      '가까운 사람과의 작은 합의가 큰 갈등을 예방해 주는 흐름입니다.',
    ]
    const growths = [
      '일·학업에서는 한 번에 크게 바꾸기보다, 작은 개선을 반복하는 방식이 성과로 이어집니다.',
      '지금은 계획 수정 능력이 성장 포인트입니다. 완벽함보다 진행률을 우선하세요.',
      '집중력은 충분하므로 우선순위만 재정렬하면 체감 성과가 크게 올라갑니다.',
      '정리·기록·복기가 성장의 핵심입니다. 하루 10분 메모가 생각보다 큰 차이를 만듭니다.',
    ]
    const actions = [
      '실천 팁: 오늘은 잠들기 전 3줄 꿈 메모를 남기고, 내일 실행할 행동 1가지만 확정해 보세요.',
      '실천 팁: 감정이 올라올 때 즉시 반응하지 말고 10분 뒤 다시 판단해 보세요.',
      '실천 팁: 미뤄 둔 정리 1개를 완료하면 꿈에서 보인 불안 신호가 빠르게 낮아질 수 있습니다.',
      '실천 팁: 몸을 움직이는 15분 루틴(산책/스트레칭)으로 에너지를 순환시켜 보세요.',
    ]

    const report: DreamReport = {
      summary: summaries[getSeedIndex(`${seed}-s`, summaries.length)],
      emotion: emotions[getSeedIndex(`${seed}-e`, emotions.length)],
      relation: relations[getSeedIndex(`${seed}-r`, relations.length)],
      growth: growths[getSeedIndex(`${seed}-g`, growths.length)],
      action: actions[getSeedIndex(`${seed}-a`, actions.length)],
    }

    return { matches, message: null, report }
  }, [dreamInput, hasSubmitted])

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
        <h1 className="text-2xl font-bold text-white mb-2">꿈해몽</h1>
        <p className="text-slate-400 mb-8">
          꿈에 나온 키워드를 입력해 보세요. 예: 물, 뱀, 비행, 추락, 아기, 개, 꽃, 해, 집, 돈
        </p>

        <div className="max-w-3xl mx-auto space-y-4">
          <input
            value={dreamInput}
            onChange={(e) => setDreamInput(e.target.value)}
            placeholder="꿈 내용을 간단히 입력..."
            className="w-full bg-[#18181b] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => {
              if (!dreamInput.trim() || isLoading) return
              setHasSubmitted(false)
              setIsLoading(true)
              if (timeoutRef.current) clearTimeout(timeoutRef.current)
              timeoutRef.current = setTimeout(() => {
                setIsLoading(false)
                setHasSubmitted(true)
              }, 5000)
            }}
            disabled={!dreamInput.trim() || isLoading}
            className={`w-full rounded-lg px-4 py-3 font-semibold transition ${
              !dreamInput.trim() || isLoading
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {isLoading ? '해몽 분석 중...' : '해몽 보기'}
          </button>

          {isLoading && (
            <div className="bg-[#18181b] border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 text-indigo-300">
                <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                <span>꿈 키워드를 분석 중입니다... (약 5초)</span>
              </div>
            </div>
          )}

          {!isLoading && result && (
            <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 text-center">
              <div>
                <p className="text-indigo-300/80 text-sm">꿈해몽 결과 리포트</p>
                <h2 className="text-2xl font-bold text-indigo-200 mt-1">당신의 꿈 심리 풀이</h2>
              </div>

              {result.matches.length > 0 && (
                <div className="space-y-2 text-left">
                  <p className="text-indigo-300 font-semibold">감지된 핵심 키워드</p>
                  {result.matches.map((m) => (
                    <div key={m.keyword} className="space-y-1 bg-indigo-500/5 border border-white/10 rounded-lg p-3">
                      <span className="text-indigo-400 font-medium">[{m.keyword}]</span>
                      <p className="text-slate-200">{m.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {result.report && (
                <div className="space-y-4 text-left">
                  <div className="bg-indigo-500/5 border border-white/10 rounded-xl p-4">
                    <p className="text-indigo-300 font-semibold mb-2">종합 해석</p>
                    <p className="text-slate-200 leading-relaxed">{result.report.summary}</p>
                  </div>
                  <div className="bg-indigo-500/5 border border-white/10 rounded-xl p-4">
                    <p className="text-indigo-300 font-semibold mb-2">감정 흐름 풀이</p>
                    <p className="text-slate-200 leading-relaxed">{result.report.emotion}</p>
                  </div>
                  <div className="bg-indigo-500/5 border border-white/10 rounded-xl p-4">
                    <p className="text-indigo-300 font-semibold mb-2">관계/대인운 풀이</p>
                    <p className="text-slate-200 leading-relaxed">{result.report.relation}</p>
                  </div>
                  <div className="bg-indigo-500/5 border border-white/10 rounded-xl p-4">
                    <p className="text-indigo-300 font-semibold mb-2">성장 포인트</p>
                    <p className="text-slate-200 leading-relaxed">{result.report.growth}</p>
                  </div>
                  <div className="bg-indigo-500/5 border border-indigo-500/30 rounded-xl p-4">
                    <p className="text-indigo-200 font-semibold mb-2">오늘의 실천 가이드</p>
                    <p className="text-indigo-100 leading-relaxed">{result.report.action}</p>
                  </div>
                </div>
              )}

              {result.message && <p className="text-slate-300">{result.message}</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
