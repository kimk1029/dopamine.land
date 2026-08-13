'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'
import { questions, type MBTIType } from './data'

export default function MBTITestPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [scores, setScores] = useState<Record<MBTIType, number>>({
    E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0
  })
  const [fade, setFade] = useState('opacity-100 translate-x-0')

  const handleAnswer = (type: MBTIType) => {
    const newScores = { ...scores, [type]: scores[type] + 1 }
    setScores(newScores)

    setFade('opacity-0 -translate-x-5')

    setTimeout(() => {
      if (currentStep < questions.length - 1) {
        setCurrentStep(currentStep + 1)
        setFade('opacity-0 translate-x-5')

        setTimeout(() => {
          setFade('opacity-100 translate-x-0')
        }, 50)
      } else {
        finishTest(newScores)
      }
    }, 300)
  }

  const finishTest = (finalScores: Record<MBTIType, number>) => {
    const r1 = finalScores.E >= finalScores.I ? 'E' : 'I'
    const r2 = finalScores.S >= finalScores.N ? 'S' : 'N'
    const r3 = finalScores.T >= finalScores.F ? 'T' : 'F'
    const r4 = finalScores.J >= finalScores.P ? 'J' : 'P'
    const resultType = `${r1}${r2}${r3}${r4}`
    router.push(`/mbti/result/${resultType}`)
  }

  const currentQ = questions[currentStep]
  const progress = ((currentStep + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 overflow-x-hidden">
      <HeaderNavigator />

      {/* 상단 프로그레스 바 */}
      <div className="fixed top-16 left-0 right-0 h-2 bg-white/5 z-50">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="container mx-auto px-4 sm:px-6 pb-20 min-h-screen flex flex-col items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          {/* 질문 카운터 */}
          <div className="text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-white/5 text-violet-400 text-xs font-bold tracking-widest border border-white/10">
              QUESTION {currentStep + 1} / {questions.length}
            </span>
          </div>

          {/* 질문 영역 (애니메이션 적용) */}
          <div className={`transition-all duration-300 ease-in-out transform ${fade}`}>
            <h2 className="text-2xl md:text-3xl font-bold text-center leading-relaxed break-keep min-h-[100px] flex items-center justify-center text-white drop-shadow-lg">
              {currentQ.text}
            </h2>

            <div className="mt-10 space-y-4">
              <button
                onClick={() => handleAnswer(currentQ.agree)}
                className="w-full py-5 px-6 rounded-2xl bg-[#18181b] hover:bg-gradient-to-r hover:from-purple-600 hover:to-indigo-600 border border-white/10 hover:border-transparent transition-all duration-200 text-base font-medium shadow-lg hover:shadow-purple-500/30 active:scale-[0.98] text-left group"
              >
                <span className="text-purple-400 font-bold mr-2 group-hover:text-white">A.</span>
                <span className="group-hover:text-white text-slate-200">{currentQ.answerA}</span>
              </button>

              <button
                onClick={() => handleAnswer(currentQ.disagree)}
                className="w-full py-5 px-6 rounded-2xl bg-[#18181b] hover:bg-gradient-to-r hover:from-pink-600 hover:to-rose-600 border border-white/10 hover:border-transparent transition-all duration-200 text-base font-medium shadow-lg hover:shadow-pink-500/30 active:scale-[0.98] text-left group"
              >
                <span className="text-pink-400 font-bold mr-2 group-hover:text-white">B.</span>
                <span className="group-hover:text-white text-slate-200">{currentQ.answerB}</span>
              </button>
            </div>
          </div>

          <div className="text-center pt-4">
            <Link href="/psychology" className="text-sm text-slate-500 hover:text-slate-400 transition-colors">
              ← 심리테스트 메인으로
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
