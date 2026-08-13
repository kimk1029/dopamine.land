import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// 내 게임 히스토리 조회 (?gameType=blackjack&limit=30)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }
    const payload = verifyToken(authHeader.substring(7))
    if (!payload) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }

    const gameType = request.nextUrl.searchParams.get('gameType') || undefined
    const limitParam = parseInt(request.nextUrl.searchParams.get('limit') || '30')
    const limit = Math.min(Math.max(limitParam || 30, 1), 100)

    const logs = await prisma.gameLog.findMany({
      where: {
        userId: payload.userId,
        ...(gameType ? { gameType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        gameType: true,
        betAmount: true,
        payout: true,
        profit: true,
        result: true,
        multiplier: true,
        createdAt: true,
      },
    })

    return NextResponse.json(logs, { status: 200 })
  } catch (error) {
    console.error('게임 히스토리 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
