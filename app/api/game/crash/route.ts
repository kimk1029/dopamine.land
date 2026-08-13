import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateAndValidateRequest } from '@/lib/request-auth'
import { calculateLevel } from '@/lib/points'
import {
  generateCrashPoint,
  validateCashOut,
  calculateCrashPayout,
} from '@/lib/game-servers/crash-server'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateAndValidateRequest(request, false)
    
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json(
        { error: authResult.error || '인증 실패' },
        { status: authResult.status || 401 }
      )
    }
    
    const payload = authResult.payload
    const body = await request.json()
    const { action } = body
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 게임 시작 (베팅 + 크래시 포인트 생성)
    if (action === 'start') {
      const { betAmount } = body
      
      if (!betAmount || betAmount < 1 || betAmount > 1000000) {
        return NextResponse.json(
          { error: '베팅 금액이 유효하지 않습니다.' },
          { status: 400 }
        )
      }
      
      if (user.points < betAmount) {
        return NextResponse.json(
          { error: '포인트가 부족합니다.' },
          { status: 400 }
        )
      }
      
      // 포인트 차감
      const updatedPoints = parseFloat((user.points - betAmount).toFixed(2))
      
      // 서버에서 크래시 포인트 생성
      const crashPoint = generateCrashPoint()
      
      // GameSession 생성
      const gameSession = await prisma.gameSession.create({
        data: {
          userId: payload.userId,
          gameType: 'bustabit',
          betAmount: betAmount,
          status: 'pending',
          gameData: {
            crashPoint,
            betAmount,
          },
        }
      })
      
      // 포인트 업데이트
      await prisma.user.update({
        where: { id: payload.userId },
        data: { points: updatedPoints }
      })
      
      return NextResponse.json({
        sessionId: gameSession.id,
        crashPoint,
        points: updatedPoints,
      })
    }
    
    // 캐시아웃
    if (action === 'cashout') {
      const { sessionId, multiplier } = body
      
      if (!sessionId) {
        return NextResponse.json(
          { error: '게임 세션이 필요합니다.' },
          { status: 400 }
        )
      }
      
      if (!multiplier || multiplier < 1.0) {
        return NextResponse.json(
          { error: '유효하지 않은 배율입니다.' },
          { status: 400 }
        )
      }
      
      const gameSession = await prisma.gameSession.findUnique({
        where: { id: sessionId }
      })
      
      if (!gameSession || gameSession.userId !== payload.userId) {
        return NextResponse.json(
          { error: '유효하지 않은 게임 세션입니다.' },
          { status: 400 }
        )
      }
      
      if (gameSession.status !== 'pending') {
        return NextResponse.json(
          { error: '이미 종료된 게임입니다.' },
          { status: 400 }
        )
      }
      
      const gameData = gameSession.gameData as any
      const crashPoint = gameData.crashPoint
      
      // 캐시아웃 검증
      const validation = validateCashOut(crashPoint, multiplier)
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || '캐시아웃 검증 실패' },
          { status: 400 }
        )
      }
      
      // 지급액 계산
      const payout = calculateCrashPayout(gameSession.betAmount, multiplier)
      
      // 포인트 지급
      const finalPoints = parseFloat((user.points + payout).toFixed(2))
      const updatedLevel = calculateLevel(finalPoints)
      
      await prisma.user.update({
        where: { id: payload.userId },
        data: { points: finalPoints, level: updatedLevel }
      })
      
      // 세션 업데이트
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          status: 'settled',
          result: 'win',
          payout: payout,
          settledAt: new Date(),
        }
      })
      
      // 게임 로그 저장
      await prisma.gameLog.create({
        data: {
          userId: payload.userId,
          gameType: 'bustabit',
          betAmount: gameSession.betAmount,
          payout: payout,
          profit: payout - gameSession.betAmount,
          result: 'WIN',
          multiplier: multiplier,
        }
      })
      
      // 전광판 이벤트 (10배 이상)
      if (multiplier >= 10) {
        const nickname = user.nickname || user.email.split('@')[0]
        await prisma.billboardEvent.create({
          data: {
            userId: payload.userId,
            gameType: 'bustabit',
            message: `[BUSTABIT] ${nickname}님이 ${multiplier.toFixed(2)}배로 ${payout.toLocaleString()}P 잭팟!`
          }
        })
      }
      
      return NextResponse.json({
        payout,
        points: finalPoints,
        level: updatedLevel,
        pointsChange: payout - gameSession.betAmount,
      })
    }
    
    // 크래시 처리 (자동)
    if (action === 'crash') {
      const { sessionId } = body
      
      if (!sessionId) {
        return NextResponse.json(
          { error: '게임 세션이 필요합니다.' },
          { status: 400 }
        )
      }
      
      const gameSession = await prisma.gameSession.findUnique({
        where: { id: sessionId }
      })
      
      if (!gameSession || gameSession.userId !== payload.userId) {
        return NextResponse.json(
          { error: '유효하지 않은 게임 세션입니다.' },
          { status: 400 }
        )
      }
      
      if (gameSession.status !== 'pending') {
        return NextResponse.json(
          { error: '이미 종료된 게임입니다.' },
          { status: 400 }
        )
      }
      
      // 크래시 시 패배 (이미 베팅 금액 차감됨)
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          status: 'settled',
          result: 'lose',
          payout: 0,
          settledAt: new Date(),
        }
      })
      
      // 히스토리에서 몇 배에서 터졌는지 보이도록 크래시 배율을 기록한다.
      const crashedAt = (gameSession.gameData as any)?.crashPoint ?? 0
      await prisma.gameLog.create({
        data: {
          userId: payload.userId,
          gameType: 'bustabit',
          betAmount: gameSession.betAmount,
          payout: 0,
          profit: -gameSession.betAmount,
          result: 'LOSE',
          multiplier: crashedAt,
        }
      })
      
      return NextResponse.json({
        result: 'lose',
        payout: 0,
        points: user.points,
        pointsChange: -gameSession.betAmount,
      })
    }
    
    return NextResponse.json(
      { error: '유효하지 않은 액션입니다.' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('크래시 게임 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

