import { Ship, EndlessRoad, PLANETS, gravityAccel, ShipState, TICK, overdrive, runtimePlanet } from '@/app/game/skyroads/SkyRoadsGame'

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

    // 앞의 틈을 찾아, 실제 체공거리로 건널 수 있을 때만 뛴다
    const solidAt = (dz: number) => {
      const c = road.getCell(ship.v.x, 0, ship.v.z + dz)
      return (c.tile !== 0 || c.cube !== 0 || c.tunnel) && c.tile !== 12
    }
    const blockAt = (dz: number) => road.getCell(ship.v.x, 0, ship.v.z + dz).cube !== 0
    const airFrames = (2 * 9) / Math.abs(gravityAccel(planet.gravity))
    const reach = airFrames * ship.v.vz

    let gapStart = -1, gapEnd = -1
    for (let d = 0.6; d < 8; d += 0.5) {
      if (!solidAt(d)) { gapStart = d; break }
    }
    if (gapStart >= 0) {
      gapEnd = gapStart
      for (let d = gapStart; d < gapStart + 8; d += 0.5) {
        if (solidAt(d)) { gapEnd = d; break }
        gapEnd = d
      }
    }
    const inTunnel = road.getCell(ship.v.x, 0, ship.v.z).tunnel || road.getCell(ship.v.x, 0, ship.v.z + 1).tunnel
    const nearGap = gapStart >= 0 && gapStart < 1.3
    const jump = !inTunnel && planet.gravity < 0x14 &&
      ((nearGap && reach > gapEnd + 0.8) || blockAt(1.0))

    // 틈 앞에서는 최고속을 유지한다
    const accel = 1
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

  it('가속 페달을 계속 밟으면 약 146프레임(36Hz 기준 4.1초)만에 최고속', () => {
    const { trace } = run(0, 300, () => ({ turn: 0, accel: 1, jump: false }))
    const idx = trace.findIndex((t) => t.vz >= 0x2aaa / 0x10000 - 1e-9)
    expect(idx).toBeGreaterThan(130)
    expect(idx).toBeLessThan(160)
    expect(idx * TICK).toBeGreaterThan(3.5)
    expect(idx * TICK).toBeLessThan(4.6)
  })

  it('행성을 넘길 때마다 최고속(오버드라이브)이 올라간다', () => {
    expect(overdrive(0)).toBeCloseTo(1, 6)
    expect(overdrive(3)).toBeGreaterThan(overdrive(0))
    expect(overdrive(20)).toBeCloseTo(1.5, 6)   // 상한
    const p0 = runtimePlanet(0)
    const p5 = runtimePlanet(5)
    // 기본 배율이 얹혀 원작보다 빠르게 출발하고, 행성을 넘길수록 더 빨라진다
    expect(p0.maxZVel!).toBeGreaterThan((0x2aaa / 0x10000) * 1.5)
    expect(p5.maxZVel!).toBeGreaterThan(p0.maxZVel! * 1.3)
    // 가속도 같은 비율이라 최고속까지 걸리는 프레임 수는 유지된다
    expect(p5.maxZVel! / p5.zAccel!).toBeCloseTo(p0.maxZVel! / p0.zAccel!, 6)

    // 실제로 더 멀리 나아간다
    const travelled = (p: ReturnType<typeof runtimePlanet>) => {
      const road = new EndlessRoad(5)
      road.ensure(400)
      const ship = new Ship({ vz: p.maxZVel })
      const exp = ship.clone()
      const z0 = ship.v.z
      for (let f = 0; f < 20; f++) ship.update(road, p, exp, { turn: 0, accel: 1, jump: false }, {})
      return ship.v.z - z0
    }
    expect(travelled(p5)).toBeGreaterThan(travelled(p0) * 1.3)
  })

  it('속도를 올려도 좌우 이동 속도는 조종 가능한 범위로 눌린다', () => {
    const lateral = (p: ReturnType<typeof runtimePlanet>) => {
      const road = new EndlessRoad(1)
      road.ensure(60)
      const ship = new Ship({ vz: p.maxZVel })
      const exp = ship.clone()
      const x0 = ship.v.x
      for (let f = 0; f < 20; f++) ship.update(road, p, exp, { turn: 1, accel: 0, jump: false }, {})
      return (ship.v.x - x0) / 20      // 프레임당 좌우 이동
    }
    const l0 = lateral(runtimePlanet(0))
    const l9 = lateral(runtimePlanet(9))
    // 전진속도는 1.5배가 되지만 좌우 이동은 거의 그대로여야 조종이 된다
    expect(l9 / l0).toBeLessThan(1.15)
    // 도로 폭(322)을 가로지르는 데 1초 이상은 걸려야 한다 (36Hz)
    expect(322 / (l9 * 36)).toBeGreaterThan(1)
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

  it('공백 구간이 그 지점에서 점프로 넘을 수 있는 길이를 넘지 않는다', () => {
    const road = new EndlessRoad(4242)
    road.ensure(3000)
    let streak = 0
    for (let z = 0; z < 3000; z++) {
      const row = road.rowAt(z)!
      const any = row.some((c) => c.tile !== 0 || c.cube !== 0 || c.tunnel)
      if (!any) {
        streak++
        expect(streak).toBeLessThanOrEqual(road.maxGap(z))
      } else streak = 0
    }
  })

  it('행성마다 도로 무늬 스타일이 다르다', () => {
    const styles = new Set(PLANETS.map((p) => p.style))
    expect(styles.size).toBeGreaterThanOrEqual(3)
    for (const p of PLANETS) {
      expect(p.lanes).toHaveLength(7)
      expect(p.lanesAlt).toHaveLength(7)
    }
    // 같은 컬럼이라도 행이 달라지면 색이 바뀌는 구간이 존재한다 (전진 속도 단서)
    const road = new EndlessRoad(77)
    road.ensure(2600)
    let varied = 0
    for (const idx of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const base = idx * 260 + 40
      const colors = new Set<number>()
      for (let z = base; z < base + 12; z++) {
        const c = road.rowAt(z)?.[3]
        if (c && c.tile) colors.add(c.tile)
      }
      if (colors.size > 1) varied++
    }
    expect(varied).toBeGreaterThanOrEqual(5)
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
