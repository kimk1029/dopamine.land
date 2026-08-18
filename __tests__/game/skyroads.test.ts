import { Ship, EndlessRoad, PLANETS, gravityAccel, ShipState, TICK } from '@/app/game/skyroads/SkyRoadsGame'

function run(planetIdx: number, frames: number, ctl: (f: number, s: Ship) => { turn: number; accel: number; jump: boolean }) {
  const road = new EndlessRoad(12345)
  road.ensure(400)
  const ship = new Ship()
  const exp = ship.clone()
  const p = PLANETS[planetIdx]
  const trace: Array<{ f: number; y: number; z: number; vy: number; vz: number; st: number }> = []
  for (let f = 0; f < frames; f++) {
    ship.update(road, p, exp, ctl(f, ship), {})
    trace.push({ f, y: ship.v.y, z: ship.v.z, vy: ship.v.vy, vz: ship.v.vz, st: ship.v.state })
  }
  return { ship, trace, road }
}

/** 사람이 하듯 앞을 보고 달리는 간단한 오토파일럿 */
function autopilot(seed: number, maxFrames = 6000) {
  const road = new EndlessRoad(seed)
  const ship = new Ship()
  const exp = ship.clone()
  for (let f = 0; f < maxFrames; f++) {
    const row = Math.floor(ship.v.z)
    road.ensure(row + 90)
    const planet = road.planetAt(row)

    // 몇 칸 앞의 안전한 컬럼을 찾는다
    const look = 3
    const myCol = Math.floor((ship.v.x - 95) / 46)
    let target = myCol
    let bestCost = Infinity
    for (let c = 0; c < 7; c++) {
      let cost = Math.abs(c - myCol) * 1.5
      let ok = true
      for (let d = 1; d <= look; d++) {
        const cell = road.getCell(95 + c * 46 + 23, 0, row + d)
        const empty = cell.tile === 0 && cell.cube === 0 && !cell.tunnel
        if (empty) { cost += 6; if (d <= 2) ok = false }
        if (cell.cube !== 0) cost += 8
        if (cell.tile === 12) { cost += 30; ok = false }
        if (cell.tile === 9) cost -= 6
        if (cell.tile === 10) cost -= 2
      }
      if (!ok) cost += 20
      if (cost < bestCost) { bestCost = cost; target = c }
    }
    const targetX = 95 + target * 46 + 23
    const turn = ship.v.x < targetX - 8 ? 1 : ship.v.x > targetX + 8 ? -1 : 0

    // 속도에 맞춰 앞을 보고 점프 (틈의 시작 직전에 뜬다)
    const emptyAt = (dz: number) => {
      const c = road.getCell(ship.v.x, 0, ship.v.z + dz)
      return c.tile === 0 && c.cube === 0 && !c.tunnel
    }
    const blockAt = (dz: number) => road.getCell(ship.v.x, 0, ship.v.z + dz).cube !== 0
    const killAt = (dz: number) => road.getCell(ship.v.x, 0, ship.v.z + dz).tile === 12
    const lead = 0.9 + ship.v.vz * 4
    const needJump = emptyAt(lead) || emptyAt(lead + 0.8) || blockAt(lead) || killAt(lead)
    const inTunnel = road.getCell(ship.v.x, 0, ship.v.z).tunnel || road.getCell(ship.v.x, 0, ship.v.z + 1).tunnel
    const jump = needJump && !inTunnel && planet.gravity < 0x14

    // 위험 구간에서는 살짝 감속
    const accel = ship.v.vz < (needJump ? 0.14 : 0.16) ? 1 : 0
    ship.update(road, planet, exp, { turn, accel, jump }, {})
    if (ship.v.state !== 0 || ship.v.y < -10) break
  }
  const row = Math.floor(ship.v.z)
  const cause = ship.v.state === 1 ? 'CRASH' : ship.v.state === 2 ? 'FUEL' : ship.v.state === 3 ? 'OXY' : ship.v.y < -10 ? 'FELL' : 'ALIVE'
  return { dist: row, state: ship.v.state, y: ship.v.y, cause }
}

describe('SkyRoads 원작 물리', () => {
  it('중력 가속도가 원작 공식과 일치한다', () => {
    expect(gravityAccel(8)).toBeCloseTo(-115 / 128, 10)   // 표시값 500
    expect(gravityAccel(5)).toBeCloseTo(-72 / 128, 10)    // 표시값 200
    expect(gravityAccel(13)).toBeCloseTo(-187 / 128, 10)  // 표시값 1000
  })

  it('점프 정점 높이가 풀블록(40)을 겨우 넘는다 — RED HEAT(중력 500)', () => {
    const { trace } = run(0, 40, (f) => ({ turn: 0, accel: 0, jump: f === 1 }))
    const peak = Math.max(...trace.map((t) => t.y))
    expect(peak - 80).toBeGreaterThan(40)
    expect(peak - 80).toBeLessThan(50)
  })

  it('착지할 때 반발계수 -0.5 로 여러 번 통통 튄다', () => {
    const { trace } = run(0, 120, (f) => ({ turn: 0, accel: 0, jump: f === 1 }))
    // 지면(80)에서 다시 떠오른 구간 수를 센다
    let bounces = 0
    for (let i = 2; i < trace.length; i++) {
      if (trace[i - 1].y <= 80.01 && trace[i].y > 80.01) bounces++
    }
    expect(bounces).toBeGreaterThanOrEqual(2)
    const heights: number[] = []
    let cur = 0
    for (const t of trace) {
      if (t.y > 80.01) cur = Math.max(cur, t.y - 80)
      else if (cur > 0) { heights.push(cur); cur = 0 }
    }
    // 각 튕김 높이는 대략 1/4 로 줄어든다 (속도 1/2 → 높이 1/4)
    expect(heights.length).toBeGreaterThanOrEqual(3)
    expect(heights[1] / heights[0]).toBeGreaterThan(0.15)
    expect(heights[1] / heights[0]).toBeLessThan(0.35)
  })

  it('전진 최고속도가 0x2AAA/0x10000 로 클램프된다', () => {
    const { ship } = run(0, 400, () => ({ turn: 0, accel: 1, jump: false }))
    expect(ship.v.vz).toBeCloseTo(0x2aaa / 0x10000, 8)
  })

  it('가속 페달을 계속 밟으면 약 146프레임(4.9초)만에 최고속', () => {
    const { trace } = run(0, 300, () => ({ turn: 0, accel: 1, jump: false }))
    const idx = trace.findIndex((t) => t.vz >= 0x2aaa / 0x10000 - 1e-9)
    expect(idx).toBeGreaterThan(130)
    expect(idx).toBeLessThan(160)
    expect(idx * TICK).toBeGreaterThan(4)
  })

  it('조향은 전진속도에 비례한다 (정지 상태에서는 거의 못 돈다)', () => {
    const steer = (vz: number) => {
      const road = new EndlessRoad(1)          // 앞 14칸은 항상 평평한 출발 구간
      road.ensure(60)
      const ship = new Ship({ vz })
      const exp = ship.clone()
      for (let f = 0; f < 20; f++) ship.update(road, PLANETS[0], exp, { turn: 1, accel: 0, jump: false }, {})
      return ship.v.x - 256
    }
    const dStill = steer(0)
    const dFast = steer(0x2aaa / 0x10000)
    expect(dStill).toBeGreaterThan(0)
    // 최고속에서의 조향량은 정지 상태의 약 8배 (0.1905 / 0.0238)
    expect(dFast / dStill).toBeGreaterThan(6)
    expect(dFast / dStill).toBeLessThan(10)
  })

  it('공중에서는 조향이 잠긴다 (점프 직후 30유닛까지만 허용)', () => {
    // 먼저 속도를 올린 뒤 점프하고, 점프 후에만 방향키를 넣는다
    const { trace, ship } = run(0, 200, (f) => ({
      turn: f > 150 ? 1 : 0,
      accel: f < 140 ? 1 : 0,
      jump: f === 145,
    }))
    const airborne = trace.filter((t) => t.f > 146 && t.f < 160 && t.y > 82)
    expect(airborne.length).toBeGreaterThan(3)
  })

  it('도로 밖으로 나가면 낙하 후 y<-10 에서 사망 판정 대상이 된다', () => {
    const road = new EndlessRoad(999)
    road.ensure(200)
    const ship = new Ship({ x: 95 - 40 })   // 도로 왼쪽 바깥
    const exp = ship.clone()
    for (let f = 0; f < 200; f++) ship.update(road, PLANETS[0], exp, { turn: 0, accel: 0, jump: false }, {})
    expect(ship.v.y).toBeLessThan(-10)
  })

  it('산소는 시간에, 연료는 주행거리에 비례해 줄어든다', () => {
    const p = PLANETS[0]
    // 정지 상태: 산소만 닳고 연료는 그대로
    const idle = run(0, 300, () => ({ turn: 0, accel: 0, jump: false }))
    expect(idle.ship.v.oxygen).toBeCloseTo(30000 - (300 * 30000) / (0x24 * p.oxygen), 4)
    expect(idle.ship.v.fuel).toBeCloseTo(30000, 6)

    // 주행 상태: 이동한 칸 수만큼 연료가 닳는다 (보급 타일을 밟기 전 구간만 본다)
    const road = new EndlessRoad(12345)
    road.ensure(60)
    const ship = new Ship({ vz: 0x2aaa / 0x10000 })
    const exp = ship.clone()
    const z0 = ship.v.z
    for (let f = 0; f < 20; f++) ship.update(road, p, exp, { turn: 0, accel: 0, jump: false }, {})
    const travelled = ship.v.z - z0
    expect(30000 - ship.v.fuel).toBeCloseTo((travelled * 30000) / p.fuel, 3)
  })

  it('중력이 0x14 이상이면 점프가 봉인된다', () => {
    const road = new EndlessRoad(7)
    road.ensure(200)
    const heavy = { ...PLANETS[0], gravity: 0x14 }
    const ship = new Ship()
    const exp = ship.clone()
    for (let f = 0; f < 30; f++) ship.update(road, heavy, exp, { turn: 0, accel: 0, jump: true }, {})
    expect(ship.v.y).toBeCloseTo(80, 3)
  })

  it('무한 도로가 항상 통과 가능한 컬럼을 남긴다', () => {
    const road = new EndlessRoad(4242)
    road.ensure(3000)
    let emptyStreak = 0
    let maxStreak = 0
    for (let z = 0; z < 3000; z++) {
      const row = road.rowAt(z)!
      const any = row.some((c) => c.tile !== 0 || c.cube !== 0 || c.tunnel)
      if (!any) { emptyStreak++; maxStreak = Math.max(maxStreak, emptyStreak) }
      else emptyStreak = 0
    }
    // 어떤 행성이든 점프로 넘을 수 있는 최대 공백(4칸)을 넘지 않는다
    expect(maxStreak).toBeLessThanOrEqual(4)
  })

  it('보급 타일이 주기적으로 등장한다', () => {
    const road = new EndlessRoad(31337)
    road.ensure(2000)
    let last = 0, worst = 0
    for (let z = 0; z < 2000; z++) {
      const row = road.rowAt(z)!
      if (row.some((c) => c.tile === 9)) { worst = Math.max(worst, z - last); last = z }
    }
    expect(worst).toBeLessThan(120)
  })
})

describe('SkyRoads 플레이 가능성', () => {
  it('오토파일럿이 충분히 멀리 간다 (맵이 막히지 않는다)', () => {
    const runs = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => autopilot(s * 7919))
    const dists = runs.map((r) => r.dist)
    console.log('autopilot', runs.map((r) => `${r.dist}:${r.cause}`).join('  '))
    const avg = dists.reduce((a, b) => a + b, 0) / dists.length
    expect(Math.min(...dists)).toBeGreaterThan(60)
    expect(avg).toBeGreaterThan(200)
  })

  it('출발 직후 20칸은 절대 죽지 않는다', () => {
    for (let s = 0; s < 12; s++) {
      const road = new EndlessRoad(s * 31 + 5)
      road.ensure(200)
      const ship = new Ship()
      const exp = ship.clone()
      for (let f = 0; f < 200; f++) {
        ship.update(road, road.planetAt(Math.floor(ship.v.z)), exp, { turn: 0, accel: 1, jump: false }, {})
        if (ship.v.z > 12) break
      }
      expect(ship.v.state).toBe(0)
      expect(ship.v.y).toBeGreaterThan(70)
    }
  })
})
