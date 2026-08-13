import React, { ReactNode } from 'react'

interface GameContainerProps {
  children: ReactNode
  className?: string
  centerContent?: boolean // 내용물 중앙 정렬 여부 (기본값 true)
  isDemo?: boolean // 데모 모드 여부
}

export default function GameContainer({ children, className = '', centerContent = true, isDemo = false }: GameContainerProps) {
  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* 여백 요구사항: 상단 30px, 좌우 50px, 하단 30px */}
      <div className="flex-1 flex flex-col pt-[30px] px-0 md:px-[50px] pb-[30px] w-full h-full overflow-hidden relative">
        {/* 데모 모드 배지 */}
        {isDemo && (
          <div className="absolute top-[30px] left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
            <div className="bg-yellow-500/90 text-black px-6 py-2 rounded-full font-black shadow-[0_0_20px_rgba(234,179,8,0.6)] animate-pulse border-2 border-yellow-300 text-lg tracking-widest uppercase">
              Demo Mode
            </div>
          </div>
        )}
        
        <div 
          className={`flex-1 relative w-full h-full border-2 border-white/10 rounded-none md:rounded-xl bg-black/20 backdrop-blur-sm overflow-hidden ${centerContent ? 'flex items-center justify-center' : 'flex flex-col'} ${className}`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
