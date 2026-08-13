'use client'

import Board from '@/components/board/Board'
import HeaderNavigator from '@/components/HeaderNavigator'

export default function BoardPage() {
  return (
    <div className="min-h-screen bg-transparent">
      <HeaderNavigator />
      <div className="pb-12 px-4 sm:px-6 lg:px-8">
        <Board />
      </div>
    </div>
  )
}
