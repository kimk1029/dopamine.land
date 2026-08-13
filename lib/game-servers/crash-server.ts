/**
 * 크래시 게임 서버 측 게임 로직
 * 크래시 포인트를 서버에서 생성
 */

// 크래시 포인트 생성 (1.01 ~ 1000.00)
// 즉사(1.00) 라운드 없이 최소 1% 상승은 보장하고, 그 이후 시점은
// heavy-tail 분포(0.99/(1-r))를 따라 랜덤하게 터진다.
export function generateCrashPoint(): number {
  const r = Math.random()
  const crashPoint = 0.99 / (1 - r)
  return Math.min(1000, Math.max(1.01, Math.floor(crashPoint * 100) / 100))
}

// 배율 계산 (시간 기반)
export function calculateMultiplier(elapsedSeconds: number, gameSpeed: number = 0.085): number {
  return Math.pow(Math.E, gameSpeed * elapsedSeconds)
}

// 캐시아웃 검증
export function validateCashOut(
  crashPoint: number,
  cashOutMultiplier: number
): { valid: boolean; error?: string } {
  if (cashOutMultiplier >= crashPoint) {
    return { valid: false, error: '크래시 포인트보다 높은 배율로 캐시아웃할 수 없습니다.' }
  }
  
  if (cashOutMultiplier < 1.0) {
    return { valid: false, error: '배율은 1.0 이상이어야 합니다.' }
  }
  
  return { valid: true }
}

// 지급액 계산
export function calculateCrashPayout(
  betAmount: number,
  multiplier: number
): number {
  return Math.floor(betAmount * multiplier)
}

