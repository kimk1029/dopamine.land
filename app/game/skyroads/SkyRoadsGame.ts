/**
 * SKYROADS — 1993, BlueMoon Software / Creative Dimensions (MS-DOS) 재현 엔진
 *
 * 물리 상수는 원작 SKYROADS.EXE 를 리버스 엔지니어링한 결과(OpenRoads 포트 / ModdingWiki
 * SkyRoads level format)에서 그대로 가져왔다. 화면 구성(지평선 위치·초점거리·대시보드
 * 레이아웃)은 원작 320x200 VGA 스크린샷을 픽셀 단위로 계측해 맞췄다.
 *
 * 주요 원작 수치
 *  - 도로 폭 7칸, 칸 크기 46x46, 도로 윗면 y=80, 반블록 y=100, 풀블록 y=120
 *  - 점프 초속도 0x480/0x80 = 9.0/frame, 중력 = -floor(G * 0x1680/0x190)/0x80
 *  - 착지 반발계수 -0.5 (|vy| > G * 0x104/8/0x80 일 때) → 원작 특유의 통통 튀는 착지
 *  - 최고 전진속도 0x2AAA/0x10000, 가속 0x4B/0x10000, 부스트/감속 패드 0x12F/0x10000
 *  - 조향 0x1D/0x80 이며 전진속도에 비례(정지 상태에서는 거의 못 돈다)
 *  - 시뮬레이션 고정 30Hz
 */

/* ------------------------------------------------------------------ */
/* 1. 원작 물리 상수                                                    */
/* ------------------------------------------------------------------ */

export const TICK = 1 / 36            // 고정 시뮬레이션 스텝.
                                      // 원작 산소 소모식이 0x24(=36) 로 나누므로 원작은 36Hz 다.

const GROUND_Y = 80                   // 0x2800/0x80 — 도로 윗면
const TILE_BOTTOM_Y = 72              // 0x2400/0x80 — 도로 슬래브 아랫면
const CUBE_HALF_Y = 100               // 반높이 블록 윗면
const CUBE_FULL_Y = 120               // 풀높이 블록 윗면
const CELL = 46                       // 칸 한 변 (가로 = 세로)
const ROAD_X0 = 95                    // 0x2F80/0x80 — 도로 왼쪽 끝
const ROAD_W = 322                    // 7 * 46
const START_X = 256                   // 0x8000/0x80 — 도로 중앙

const JUMP_VY = 0x480 / 0x80          // 9.0
const MAX_ZVEL = 0x2AAA / 0x10000     // 0.16666 — 원작 최고속
const ZACCEL = 0x4B / 0x10000         // 스로틀 가감속

/**
 * 원작은 30스테이지로 끝나므로 최고속이 고정이지만, 무한 모드에서는 그러면
 * 5분을 달려도 체감 속도가 그대로다. 행성을 넘길 때마다 최고속과 가속을
 * 같은 비율로 끌어올려(=가속에 걸리는 시간은 유지) 갈수록 빨라지게 한다.
 */
const OVERDRIVE_PER_PLANET = 0.11
const OVERDRIVE_MAX = 0.9
export function overdrive(planetIndex: number): number {
  return 1 + Math.min(OVERDRIVE_MAX, Math.max(0, planetIndex) * OVERDRIVE_PER_PLANET)
}
const PAD_ZACCEL = 0x12F / 0x10000    // 부스트/감속 패드
const XMOVE = 0x1D / 0x80             // 조향 계수
const XRATE_BIAS = 0x618 / 0x10000    // 정지 상태에서도 남는 미세 조향
const SLIDE_STEP = 0x11 / 0x80        // 미끄럼 누적량
const WALL_ZPENALTY = 0x97 / 0x10000  // 벽 스침 감속
const BUMP_OFF = 0x3A0 / 0x80         // 벽 스침 밀림량
const FULL_TANK = 0x7530              // 30000
const REFILL_SFX_THRESHOLD = 0x6978

// 터널 단면 (중심에서의 거리별 천장/바닥, y-68 기준) — 원작 테이블 그대로
const TUN_CEILS = [
  0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
  0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
  0x20, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1E, 0x1E,
  0x1E, 0x1D, 0x1D, 0x1D, 0x1C, 0x1B, 0x1A, 0x19,
  0x18, 0x16, 0x14, 0x12, 0x11, 0x0E,
]
const TUN_LOWS = [
  0x10, 0x10, 0x10, 0x10, 0x0F, 0x0E, 0x0D, 0x0B,
  0x08, 0x07, 0x06, 0x05, 0x03, 0x03, 0x03, 0x03,
  0x03, 0x03, 0x02, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]

function sFloor(n: number): number {
  const s = n >= 0 ? 1 : -1
  return Math.floor(n * s) * s
}
const round16 = (n: number) => Math.floor(n * 0x80) / 0x80
const round32 = (n: number) => Math.floor(n * 0x10000) / 0x10000

/* ------------------------------------------------------------------ */
/* 2. 화면 / 투영 상수 (원작 스크린샷 계측값)                            */
/* ------------------------------------------------------------------ */

export const SCREEN_W = 320
export const SCREEN_H = 200
const HORIZON_Y = 33                  // 도로 소실점이 찍히는 스캔라인
const CENTER_X = 160
const FOCAL = 138                     // 픽셀 초점거리
const CAM_H = 69                      // 도로 윗면 위 카메라 높이 (1.5칸)
const CAM_Y = GROUND_Y + CAM_H        // 149
const CAM_BACK = 138                  // 우주선 뒤 3칸
const NEAR_Z = 12                     // 근평면
const VIEW_ROWS = 34                  // 앞쪽으로 그리는 칸 수
const FAR_FACE_Z = 760                // 이보다 멀면 윗면만 그린다 (측면은 1px 미만)
const DASH_TOP = 111                  // 대시보드(콕핏 프레임 포함) 최상단
const SCENE_BOTTOM = 146              // 3D 화면을 그리는 마지막 스캔라인+1

/* ------------------------------------------------------------------ */
/* 3. 타일 효과 / 행성 팔레트                                            */
/* ------------------------------------------------------------------ */

export enum Effect { None = 0, Accel, Decel, Kill, Slide, Refill }

// 원작 팔레트 인덱스별 효과 (Levels/Level.ts 의 switch 그대로)
function effectOf(colorIndex: number): Effect {
  switch (colorIndex) {
    case 10: return Effect.Accel
    case 12: return Effect.Kill
    case 9: return Effect.Refill
    case 8: return Effect.Slide
    case 2: return Effect.Decel
    default: return Effect.None
  }
}

type RGB = [number, number, number]

// 특수 타일 색은 원작에서 행성이 바뀌어도 거의 그대로 유지된다
const SPECIAL_COLORS: Record<number, RGB> = {
  2: [0, 108, 0],       // sticky  — 감속
  8: [168, 168, 172],   // slippery— 미끄럼
  9: [0, 84, 216],      // supplies— 연료/산소 보급
  10: [64, 232, 64],    // boost   — 부스트
  12: [232, 60, 112],   // burning — 즉사
}

/** 도로 무늬. 행성마다 달라서 흘러가는 그림이 매번 바뀐다. */
export type RoadStyle = 'stripe' | 'checker' | 'band' | 'rail'

export interface Planet {
  name: string
  gravity: number            // 원작 raw 값 (표시값 = (raw-3)*100)
  fuel: number               // 이 값만큼의 칸을 주행하면 연료 고갈
  oxygen: number             // 초
  tiles: RGB[]               // 인덱스 1..15 의 윗면 색
  cube: RGB                  // 블록 기본 윗면 색
  lanes: number[]            // 컬럼별 기본 색 인덱스 (도로 줄무늬)
  lanesAlt: number[]         // 무늬가 교차할 때 쓰는 두 번째 색 세트
  style: RoadStyle
  /** 런타임에 덮어쓰는 최고속/가속 (없으면 원작 값) */
  maxZVel?: number
  zAccel?: number
  sky: { top: RGB; bottom: RGB; nebula: RGB; star: RGB }
  body: { x: number; y: number; r: number; color: RGB; ring: boolean } | null
  terrain: RGB | null        // 지평선 실루엣 색 (없으면 안 그림)
}

function mkTiles(base: RGB[]): RGB[] {
  // 인덱스 1..15. 특수 슬롯(2,8,9,10,12)은 고정색으로 덮어쓴다.
  const out: RGB[] = new Array(16)
  for (let i = 1; i <= 15; i++) out[i] = base[(i - 1) % base.length]
  for (const k of Object.keys(SPECIAL_COLORS)) out[+k] = SPECIAL_COLORS[+k]
  return out
}

export const PLANETS: Planet[] = [
  {
    name: 'RED HEAT', gravity: 8, fuel: 340, oxygen: 52,
    tiles: mkTiles([[196, 32, 32], [140, 24, 24], [232, 96, 40], [96, 16, 16], [216, 64, 32], [160, 40, 24], [120, 20, 28], [200, 48, 48], [148, 28, 20], [236, 120, 48]]),
    cube: [188, 152, 132], lanes: [3, 1, 5, 3, 5, 1, 3],
    lanesAlt: [4, 3, 1, 1, 1, 3, 4], style: 'stripe',
    sky: { top: [8, 0, 8], bottom: [56, 8, 12], nebula: [128, 24, 24], star: [255, 200, 180] },
    body: { x: 246, y: 44, r: 30, color: [200, 72, 40], ring: false }, terrain: [72, 20, 20],
  },
  {
    name: 'INTO THE SUN', gravity: 7, fuel: 330, oxygen: 50,
    tiles: mkTiles([[240, 176, 32], [200, 120, 24], [248, 216, 96], [168, 88, 16], [232, 152, 48], [144, 72, 16], [252, 232, 152], [216, 136, 32], [184, 104, 24], [248, 196, 72]]),
    cube: [200, 176, 140], lanes: [5, 3, 1, 7, 1, 3, 5],
    lanesAlt: [1, 5, 3, 3, 3, 5, 1], style: 'band',
    sky: { top: [40, 12, 0], bottom: [168, 88, 16], nebula: [240, 160, 40], star: [255, 240, 200] },
    body: { x: 160, y: 26, r: 46, color: [255, 232, 128], ring: false }, terrain: [96, 44, 8],
  },
  {
    name: 'BLUE PLANET', gravity: 9, fuel: 320, oxygen: 48,
    tiles: mkTiles([[40, 96, 224], [24, 60, 160], [72, 176, 240], [16, 40, 112], [56, 128, 216], [32, 72, 176], [120, 208, 248], [40, 88, 200], [20, 52, 136], [88, 160, 232]]),
    cube: [176, 190, 208], lanes: [3, 5, 1, 7, 1, 5, 3],
    lanesAlt: [5, 1, 3, 3, 3, 1, 5], style: 'checker',
    sky: { top: [0, 4, 24], bottom: [8, 24, 72], nebula: [32, 72, 168], star: [200, 224, 255] },
    body: { x: 66, y: 40, r: 34, color: [48, 112, 216], ring: false }, terrain: [16, 32, 72],
  },
  {
    name: 'SATELLITE', gravity: 6, fuel: 330, oxygen: 50,
    tiles: mkTiles([[176, 176, 184], [120, 120, 132], [216, 216, 224], [88, 88, 100], [152, 152, 164], [104, 104, 116], [240, 240, 248], [136, 136, 148], [72, 72, 84], [196, 196, 208]]),
    cube: [208, 208, 216], lanes: [5, 3, 1, 5, 1, 3, 5],
    lanesAlt: [9, 5, 3, 7, 3, 5, 9], style: 'rail',
    sky: { top: [0, 0, 0], bottom: [8, 8, 16], nebula: [40, 40, 56], star: [255, 255, 255] },
    body: { x: 250, y: 36, r: 26, color: [64, 128, 216], ring: false }, terrain: [56, 56, 64],
  },
  {
    name: 'MISTY', gravity: 7, fuel: 320, oxygen: 46,
    tiles: mkTiles([[131, 16, 231], [96, 12, 172], [213, 65, 65], [168, 40, 224], [72, 8, 132], [180, 96, 240], [232, 96, 96], [112, 16, 196], [148, 32, 208], [88, 16, 152]]),
    cube: [176, 176, 188], lanes: [1, 2, 1, 3, 1, 2, 1],
    lanesAlt: [5, 1, 5, 7, 5, 1, 5], style: 'stripe',
    sky: { top: [8, 4, 20], bottom: [40, 24, 72], nebula: [104, 64, 168], star: [230, 220, 255] },
    body: null, terrain: [104, 104, 128],
  },
  {
    name: 'ASTEROID BELT', gravity: 10, fuel: 300, oxygen: 44,
    tiles: mkTiles([[168, 120, 64], [120, 84, 44], [200, 160, 96], [88, 60, 32], [148, 104, 56], [104, 72, 40], [216, 184, 128], [136, 96, 52], [72, 48, 28], [184, 140, 80]]),
    cube: [172, 148, 116], lanes: [3, 1, 5, 1, 5, 1, 3],
    lanesAlt: [1, 5, 3, 3, 3, 5, 1], style: 'checker',
    sky: { top: [4, 4, 8], bottom: [20, 16, 20], nebula: [72, 56, 44], star: [240, 230, 210] },
    body: { x: 60, y: 30, r: 18, color: [140, 108, 72], ring: false }, terrain: [64, 48, 32],
  },
  {
    name: 'CRAB NEBULA', gravity: 5, fuel: 320, oxygen: 46,
    tiles: mkTiles([[232, 48, 168], [168, 24, 120], [248, 128, 216], [120, 16, 88], [200, 40, 144], [144, 20, 104], [252, 176, 232], [216, 44, 156], [96, 12, 72], [240, 96, 200]]),
    cube: [200, 176, 200], lanes: [3, 1, 5, 7, 5, 1, 3],
    lanesAlt: [6, 3, 1, 1, 1, 3, 6], style: 'band',
    sky: { top: [16, 0, 24], bottom: [64, 8, 56], nebula: [192, 40, 152], star: [255, 220, 250] },
    body: { x: 236, y: 30, r: 22, color: [248, 160, 224], ring: true }, terrain: null,
  },
  {
    name: 'OVER THE BASE', gravity: 11, fuel: 300, oxygen: 44,
    tiles: mkTiles([[32, 176, 160], [20, 120, 112], [64, 216, 200], [16, 88, 80], [40, 152, 140], [24, 104, 96], [120, 240, 224], [36, 168, 152], [12, 72, 68], [80, 200, 184]]),
    cube: [160, 184, 180], lanes: [5, 3, 1, 3, 1, 3, 5],
    lanesAlt: [3, 5, 9, 5, 9, 5, 3], style: 'rail',
    sky: { top: [0, 8, 12], bottom: [4, 32, 40], nebula: [16, 96, 104], star: [200, 255, 248] },
    body: null, terrain: [24, 60, 64],
  },
  {
    name: 'THE EARTH', gravity: 12, fuel: 290, oxygen: 42,
    tiles: mkTiles([[48, 176, 64], [28, 120, 44], [96, 216, 104], [20, 88, 32], [64, 152, 72], [36, 104, 48], [160, 240, 168], [52, 184, 68], [16, 72, 28], [112, 200, 120]]),
    cube: [200, 208, 200], lanes: [3, 5, 1, 5, 1, 5, 3],
    lanesAlt: [5, 3, 6, 1, 6, 3, 5], style: 'checker',
    sky: { top: [0, 0, 16], bottom: [8, 20, 56], nebula: [24, 64, 128], star: [255, 255, 255] },
    body: { x: 74, y: 34, r: 40, color: [56, 128, 208], ring: false }, terrain: [24, 56, 32],
  },
  {
    name: 'DRUIDA', gravity: 13, fuel: 280, oxygen: 40,
    tiles: mkTiles([[224, 176, 48], [160, 120, 28], [248, 216, 120], [112, 80, 20], [192, 148, 40], [136, 100, 24], [252, 236, 176], [208, 164, 44], [88, 64, 16], [232, 196, 88]]),
    cube: [204, 184, 140], lanes: [1, 3, 5, 1, 5, 3, 1],
    lanesAlt: [3, 1, 6, 5, 6, 1, 3], style: 'band',
    sky: { top: [16, 0, 20], bottom: [48, 16, 56], nebula: [128, 56, 152], star: [255, 240, 200] },
    body: { x: 250, y: 40, r: 34, color: [216, 176, 88], ring: true }, terrain: [72, 48, 24],
  },
]

/* ------------------------------------------------------------------ */
/* 4. 레벨 (셀 구조 + 무한 생성기)                                       */
/* ------------------------------------------------------------------ */

export interface Cell {
  tile: number       // 0 = 없음, 1..15 = 색 인덱스
  cube: 0 | 1 | 2    // 0 없음, 1 반높이, 2 풀높이
  cubeColor: number  // 0 = 블록 기본색
  tunnel: boolean
}

const EMPTY_CELL: Cell = { tile: 0, cube: 0, cubeColor: 0, tunnel: false }
const isEmptyCell = (c: Cell) => c.tile === 0 && c.cube === 0 && !c.tunnel
const cubeHeight = (c: Cell) => (c.cube === 1 ? CUBE_HALF_Y : CUBE_FULL_Y)

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PLANET_ROWS = 260   // 행성 하나당 주행 칸 수

export class EndlessRoad {
  private rows = new Map<number, Cell[]>()
  private generated = 0
  private rnd: () => number
  private lastRefillRow = 0

  constructor(seed: number) {
    this.rnd = mulberry32(seed)
    // 출발 구간: 원작 로드 시작처럼 넓고 평평하게. 최고속까지 약 146프레임(≈24칸)이
    // 걸리므로 첫 장애물 전에 충분히 가속할 활주로를 준다.
    this.pushRows(this.plain(26, 7))
  }

  planetAt(row: number): Planet {
    return PLANETS[Math.floor(Math.max(0, row) / PLANET_ROWS) % PLANETS.length]
  }

  /** 오버드라이브까지 반영한 이 지점의 최고속 */
  maxZVelAt(row: number): number {
    return MAX_ZVEL * overdrive(this.planetIndexAt(row))
  }
  planetIndexAt(row: number): number {
    return Math.floor(Math.max(0, row) / PLANET_ROWS)
  }

  ensure(upto: number) {
    while (this.generated < upto) this.pushRows(this.nextChunk())
  }

  prune(below: number) {
    for (const k of this.rows.keys()) if (k < below) this.rows.delete(k)
  }

  getCell(xPos: number, _yPos: number, zPos: number): Cell {
    const x = xPos - ROAD_X0
    if (x > ROAD_W || x < 0) return EMPTY_CELL
    const z = Math.floor(Math.floor(zPos * 8) / 8)
    const col = Math.floor(x / CELL)
    if (col < 0 || col > 6) return EMPTY_CELL
    const row = this.rows.get(z)
    return row ? row[col] : EMPTY_CELL
  }

  rowAt(z: number): Cell[] | undefined { return this.rows.get(z) }

  /* --- 원작 충돌 판정 --------------------------------------------- */

  private insideTileY(yPos: number, distFromCenter: number, cell: Cell): boolean {
    const d = Math.round(distFromCenter)
    if (d > 37) return false
    const y2 = yPos - 68
    const hasTunnel = cell.tunnel
    const hasCube = cell.cube !== 0
    if (hasTunnel && !hasCube) return y2 > TUN_LOWS[d] && y2 < TUN_CEILS[d]
    if (!hasTunnel && hasCube) return yPos < cubeHeight(cell)
    if (hasTunnel && hasCube) return y2 > TUN_LOWS[d] && yPos < cubeHeight(cell)
    return false
  }

  isInsideTile(xPos: number, yPos: number, zPos: number): boolean {
    const left = this.getCell(xPos - 14, yPos, zPos)
    const right = this.getCell(xPos + 14, yPos, zPos)
    if (isEmptyCell(left) && isEmptyCell(right)) return false

    if (yPos < GROUND_Y && yPos > 0x1e80 / 0x80) return true
    if (yPos < 0x2180 / 0x80) return false

    let center = this.getCell(xPos, yPos, zPos)
    let d = 23 - mod(xPos - 49, 46)
    let varA = -46
    if (d < 0) { d = 1 - d; varA = 46 }

    if (this.insideTileY(yPos, d, center)) return true
    center = this.getCell(xPos + varA, yPos, zPos)
    return this.insideTileY(yPos, 47 - d, center)
  }

  /* --- 무한 생성 --------------------------------------------------- */

  private pushRows(rows: Cell[][]) {
    for (const r of rows) { this.rows.set(this.generated, r); this.generated++ }
  }

  private cell(color: number, cube: 0 | 1 | 2 = 0, cubeColor = 0, tunnel = false): Cell {
    return { tile: color, cube, cubeColor, tunnel }
  }

  /**
   * 컬럼/행에 따른 타일 색. 행성마다 무늬가 달라서 같은 도로도 다르게 흘러간다.
   * 가로 방향으로 색이 바뀌는 스타일은 전진 속도를 눈으로 읽게 해주는 역할도 한다.
   */
  private lane(row: number, col: number): number {
    const p = this.planetAt(row)
    const A = p.lanes, B = p.lanesAlt
    switch (p.style) {
      case 'checker':
        return ((row + col) & 1) === 0 ? A[col] : B[col]
      case 'band':
        return (Math.floor(row / 3) & 1) === 0 ? A[col] : B[col]
      case 'rail':
        // 바깥 두 줄은 고정 레일, 안쪽은 4행마다 교차
        if (col === 0 || col === 6) return B[col]
        return (Math.floor(row / 4) & 1) === 0 ? A[col] : B[col]
      default:
        // 세로 줄무늬 + 8행마다 가로 밴딩 (원작 MISTY 로드의 느낌)
        return Math.floor(row / 8) % 4 === 3 ? B[col] : A[col]
    }
  }

  /** 지정 컬럼에만 타일이 있는 행 */
  private mkRow(row: number, cols: boolean[]): Cell[] {
    const out: Cell[] = []
    for (let c = 0; c < 7; c++) out.push(cols[c] ? this.cell(this.lane(row, c)) : { ...EMPTY_CELL })
    return out
  }

  private plain(len: number, width: number, center = 3): Cell[][] {
    const rows: Cell[][] = []
    const half = (width - 1) / 2
    for (let i = 0; i < len; i++) {
      const cols: boolean[] = []
      for (let c = 0; c < 7; c++) cols.push(Math.abs(c - center) <= half)
      rows.push(this.mkRow(this.generated + i, cols))
    }
    return rows
  }

  /**
   * 공백이 행성 경계를 걸치면 뒤쪽 행성의 중력이 더 셀 수 있으므로,
   * 공백이 덮는 모든 행 중 가장 빡빡한 값으로 자른다.
   */
  private safeGap(row: number, want: number): number {
    let limit = this.maxGap(row)
    for (let i = 1; i <= want; i++) limit = Math.min(limit, this.maxGap(row + i))
    return Math.max(1, Math.min(want, limit))
  }

  /** 이 지점의 중력·최고속으로 넘을 수 있는 최대 공백 칸 수 */
  maxGap(row: number): number {
    const g = Math.abs(gravityAccel(this.planetAt(row).gravity))
    const airFrames = (2 * JUMP_VY) / g
    return Math.max(1, Math.min(5, Math.floor(airFrames * this.maxZVelAt(row)) - 1))
  }

  private canJump(row: number): boolean {
    return this.planetAt(row).gravity < 0x14
  }

  private nextChunk(): Cell[][] {
    const r = this.rnd
    const row0 = this.generated
    const planetProgress = (row0 % PLANET_ROWS) / PLANET_ROWS
    // 첫 80칸은 난이도 0. 이후 1200칸에 걸쳐 올라간다(≈3분).
    const diff = Math.min(1, Math.max(0, (row0 - 80) / 1200))
    const rows: Cell[][] = []
    const push = (rs: Cell[][]) => { for (const x of rs) rows.push(x) }

    // 행성 진입 직후 / 보급이 급할 때는 안전 구간
    if (planetProgress < 0.06) return this.plain(9, 7)
    if (row0 - this.lastRefillRow > 34) { push(this.supply(row0)); return rows }

    // [가중치, 등장 시작 칸, 생성기] — 거리에 따라 패턴을 하나씩 풀어준다
    const pool: Array<[number, number, () => Cell[][]]> = [
      [0.9, 0, () => this.plain(5 + Math.floor(r() * 5), 5 + Math.floor(r() * 3))],
      [0.5, 0, () => this.supply(row0)],
      [0.9, 30, () => this.narrow(row0, diff)],
      [1.0, 50, () => this.gaps(row0, diff)],
      [0.7, 70, () => this.chicane(row0, diff)],
      [0.5, 80, () => this.padRun(row0, Effect.Accel)],
      [0.4, 80, () => this.padRun(row0, Effect.Decel)],
      [0.9, 110, () => this.slalom(row0, diff)],
      [0.6, 130, () => this.pillars(row0, diff)],
      [0.5, 150, () => this.tunnel(row0)],
      [0.6, 170, () => this.padRun(row0, Effect.Slide)],
      [0.8, 190, () => this.islands(row0, diff)],
      [0.7, 220, () => this.hurdles(row0, diff)],
      [0.5, 250, () => this.boostChain(row0, diff)],
      [0.45, 280, () => this.split(row0, diff)],
      [0.5, 310, () => this.killLane(row0, diff)],
      [0.4 + diff * 0.4, 350, () => this.staircase(row0, diff)],
      [0.35 + diff * 0.6, 420, () => this.minefield(row0, diff)],
      [0.4 + diff * 0.5, 520, () => this.weave(row0, diff)],
    ]
    let total = 0
    for (const [w, minRow] of pool) if (row0 >= minRow) total += w
    let pick = r() * total
    for (const [w, minRow, fn] of pool) {
      if (row0 < minRow) continue
      pick -= w
      if (pick <= 0) { push(fn()); break }
    }
    if (rows.length === 0) push(this.plain(8, 7))
    // 패턴 사이에 짧은 착지 구간을 넣어 원작의 "숨 돌리는" 리듬을 만든다.
    // 난이도가 오를수록 이 여유가 사라진다.
    push(this.plain(Math.max(1, 3 - Math.round(diff * 2)) + Math.floor(r() * 3), 7))
    return rows
  }

  /* --- 개별 패턴 ---------------------------------------------------- */

  private narrow(row0: number, diff: number): Cell[][] {
    const r = this.rnd
    const len = 10 + Math.floor(r() * 14)
    const width = Math.max(diff > 0.45 ? 1 : 3, 5 - Math.floor(diff * 2 + r() * 2))
    const rows: Cell[][] = []
    let center = 3
    let dir = r() < 0.5 ? -1 : 1
    for (let i = 0; i < len; i++) {
      if (i % 4 === 0) {
        center += dir
        const lim = (width - 1) / 2
        if (center - lim < 0 || center + lim > 6) { dir = -dir; center += dir * 2 }
      }
      const cols: boolean[] = []
      for (let c = 0; c < 7; c++) cols.push(Math.abs(c - center) <= (width - 1) / 2)
      rows.push(this.mkRow(row0 + i, cols))
    }
    return rows
  }

  private gaps(row0: number, diff: number): Cell[][] {
    const r = this.rnd
    const rows: Cell[][] = []
    const n = 2 + Math.floor(r() * 3)
    const gmax = this.maxGap(row0)
    for (let k = 0; k < n; k++) {
      const padLen = 4 - Math.floor(diff * 2) + Math.floor(r() * 3)
      const w = 7 - Math.floor(r() * (2 + diff * 3))
      for (const rr of this.plainAt(row0 + rows.length, padLen, w)) rows.push(rr)
      const gapRow = row0 + rows.length
      const gap = row0 < 200 ? 1 : this.safeGap(gapRow, 1 + Math.floor(r() * gmax))
      for (let i = 0; i < gap; i++) rows.push(this.mkRow(row0 + rows.length, [false, false, false, false, false, false, false]))
    }
    for (const rr of this.plainAt(row0 + rows.length, 5, 7)) rows.push(rr)
    return rows
  }

  private plainAt(row0: number, len: number, width: number, center = 3): Cell[][] {
    const rows: Cell[][] = []
    const half = (width - 1) / 2
    for (let i = 0; i < len; i++) {
      const cols: boolean[] = []
      for (let c = 0; c < 7; c++) cols.push(Math.abs(c - center) <= half)
      rows.push(this.mkRow(row0 + i, cols))
    }
    return rows
  }

  private islands(row0: number, diff: number): Cell[][] {
    const r = this.rnd
    const rows: Cell[][] = []
    const gmax = this.maxGap(row0)
    let center = 3
    const n = 3 + Math.floor(r() * 3)
    for (let k = 0; k < n; k++) {
      const w = Math.max(1, 3 - Math.floor(diff * 2))
      const len = 2 + Math.floor(r() * 3)
      const half = (Math.max(1, w) - 1) / 2
      for (let i = 0; i < len; i++) {
        const cols: boolean[] = []
        for (let c = 0; c < 7; c++) cols.push(Math.abs(c - center) <= half)
        rows.push(this.mkRow(row0 + rows.length, cols))
      }
      const gap = this.safeGap(row0 + rows.length, 1 + Math.floor(r() * gmax))
      for (let i = 0; i < gap; i++) rows.push(this.mkRow(row0 + rows.length, [false, false, false, false, false, false, false]))
      center += (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 2))
      center = Math.max(1, Math.min(5, center))
    }
    for (const rr of this.plainAt(row0 + rows.length, 4, 7)) rows.push(rr)
    return rows
  }

  private slalom(row0: number, diff: number): Cell[][] {
    const r = this.rnd
    const rows: Cell[][] = []
    const seg = 4 + Math.floor(r() * 3)
    const n = 3 + Math.floor(r() * 3)
    const openW = diff > 0.7 ? 1 : diff > 0.35 ? 2 : 3
    let open = Math.floor(r() * (8 - openW))
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < seg; i++) {
        const row: Cell[] = []
        for (let c = 0; c < 7; c++) {
          const isOpen = c >= open && c < open + openW
          if (isOpen) row.push(this.cell(this.lane(row0 + rows.length, c)))
          else row.push(this.cell(this.lane(row0 + rows.length, c), 2, 0))
        }
        rows.push(row)
      }
      open = Math.max(0, Math.min(7 - openW, open + (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 2))))
      for (const rr of this.plainAt(row0 + rows.length, 2, 7)) rows.push(rr)
    }
    return rows
  }

  private hurdles(row0: number, diff: number): Cell[][] {
    const r = this.rnd
    if (!this.canJump(row0)) return this.slalom(row0, diff)
    const rows: Cell[][] = []
    const n = 2 + Math.floor(r() * 3)
    for (let k = 0; k < n; k++) {
      for (const rr of this.plainAt(row0 + rows.length, 4 + Math.floor(r() * 3), 7)) rows.push(rr)
      const h: 1 | 2 = this.planetAt(row0).gravity <= 8 && r() < 0.4 ? 2 : 1
      const thick = 1 + Math.floor(r() * 2)
      for (let i = 0; i < thick; i++) {
        const row: Cell[] = []
        for (let c = 0; c < 7; c++) row.push(this.cell(this.lane(row0 + rows.length, c), h, 0))
        rows.push(row)
      }
    }
    for (const rr of this.plainAt(row0 + rows.length, 4, 7)) rows.push(rr)
    return rows
  }

  private padRun(row0: number, eff: Effect): Cell[][] {
    const r = this.rnd
    const color = eff === Effect.Slide ? 8 : eff === Effect.Accel ? 10 : 2
    const len = eff === Effect.Slide ? 10 + Math.floor(r() * 10) : 4 + Math.floor(r() * 6)
    const width = eff === Effect.Slide ? 7 : 3 + Math.floor(r() * 3)
    const rows: Cell[][] = []
    const half = (width - 1) / 2
    for (let i = 0; i < len; i++) {
      const row: Cell[] = []
      for (let c = 0; c < 7; c++) {
        if (Math.abs(c - 3) <= half) row.push(this.cell(color))
        else if (eff !== Effect.Slide) row.push(this.cell(this.lane(row0 + i, c)))
        else row.push({ ...EMPTY_CELL })
      }
      rows.push(row)
    }
    for (const rr of this.plainAt(row0 + rows.length, 4, 7)) rows.push(rr)
    return rows
  }

  private minefield(row0: number, diff: number): Cell[][] {
    const r = this.rnd
    const rows: Cell[][] = []
    const len = 8 + Math.floor(r() * 10)
    const density = 0.14 + diff * 0.2
    for (let i = 0; i < len; i++) {
      const row: Cell[] = []
      let safe = 0
      for (let c = 0; c < 7; c++) {
        if (r() < density) row.push(this.cell(12))
        else { row.push(this.cell(this.lane(row0 + i, c))); safe++ }
      }
      if (safe === 0) row[3] = this.cell(this.lane(row0 + i, 3))
      rows.push(row)
    }
    return rows
  }

  private tunnel(row0: number): Cell[][] {
    const r = this.rnd
    const rows: Cell[][] = []
    const len = 8 + Math.floor(r() * 10)
    const width = 3 + 2 * Math.floor(r() * 2)
    const half = (width - 1) / 2
    for (let i = 0; i < len; i++) {
      const row: Cell[] = []
      for (let c = 0; c < 7; c++) {
        if (Math.abs(c - 3) <= half) row.push(this.cell(this.lane(row0 + i, c), 0, 0, true))
        else row.push({ ...EMPTY_CELL })
      }
      rows.push(row)
    }
    for (const rr of this.plainAt(row0 + rows.length, 4, 7)) rows.push(rr)
    return rows
  }

  private split(row0: number, diff: number): Cell[][] {
    const r = this.rnd
    const rows: Cell[][] = []
    const len = 10 + Math.floor(r() * 12)
    const w = diff > 0.5 ? 1 : 2
    const leftEnd = w - 1
    const rightStart = 7 - w
    for (let i = 0; i < len; i++) {
      const cols: boolean[] = []
      for (let c = 0; c < 7; c++) cols.push(c <= leftEnd || c >= rightStart)
      rows.push(this.mkRow(row0 + i, cols))
    }
    for (const rr of this.plainAt(row0 + rows.length, 4, 7)) rows.push(rr)
    return rows
  }

  private staircase(row0: number, diff: number): Cell[][] {
    const r = this.rnd
    const rows: Cell[][] = []
    const n = 4 + Math.floor(r() * 4)
    let side = r() < 0.5 ? 0 : 1
    for (let k = 0; k < n; k++) {
      const seg = 3 + Math.floor(r() * 2)
      for (let i = 0; i < seg; i++) {
        const row: Cell[] = []
        for (let c = 0; c < 7; c++) {
          const blocked = side === 0 ? c >= 4 : c <= 2
          row.push(this.cell(this.lane(row0 + rows.length, c), blocked ? 1 : 0, 0))
        }
        rows.push(row)
      }
      side = 1 - side
    }
    for (const rr of this.plainAt(row0 + rows.length, 4, 7)) rows.push(rr)
    return rows
  }

  /** 도로가 통째로 좌우로 스윽 밀려가는 구간 */
  private chicane(row0: number, diff: number): Cell[][] {
    const r = this.rnd
    const rows: Cell[][] = []
    const width = Math.max(3, 5 - Math.round(diff * 2))
    const half = (width - 1) / 2
    const span = 12 + Math.floor(r() * 14)
    const amp = 3 - half
    const phase = r() * Math.PI * 2
    for (let i = 0; i < span; i++) {
      const center = 3 + Math.round(Math.sin(phase + (i / span) * Math.PI * 2) * amp)
      const cols: boolean[] = []
      for (let c = 0; c < 7; c++) cols.push(Math.abs(c - center) <= half)
      rows.push(this.mkRow(row0 + i, cols))
    }
    for (const rr of this.plainAt(row0 + rows.length, 3, 7)) rows.push(rr)
    return rows
  }

  /** 넓은 도로 위에 기둥 블록이 흩뿌려진 구간 — 피해서 지나가거나 넘는다 */
  private pillars(row0: number, diff: number): Cell[][] {
    const r = this.rnd
    const rows: Cell[][] = []
    const len = 10 + Math.floor(r() * 12)
    const density = 0.12 + diff * 0.16
    for (let i = 0; i < len; i++) {
      const row: Cell[] = []
      let blocked = 0
      for (let c = 0; c < 7; c++) {
        const put = r() < density
        if (put) blocked++
        row.push(this.cell(this.lane(row0 + i, c), put ? (r() < 0.5 ? 1 : 2) : 0, 0))
      }
      if (blocked >= 6) row[3] = this.cell(this.lane(row0 + i, 3))
      rows.push(row)
    }
    for (const rr of this.plainAt(row0 + rows.length, 3, 7)) rows.push(rr)
    return rows
  }

  /** 부스트 패드 뒤에 긴 틈 — 속도를 받아서 날아가야 한다 */
  private boostChain(row0: number, diff: number): Cell[][] {
    const r = this.rnd
    const rows: Cell[][] = []
    const gmax = this.maxGap(row0)
    const n = 2 + Math.floor(r() * 2)
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < 4; i++) {
        const row: Cell[] = []
        for (let c = 0; c < 7; c++) row.push(this.cell(Math.abs(c - 3) <= 1 ? 10 : this.lane(row0 + rows.length, c)))
        rows.push(row)
      }
      const gap = this.safeGap(row0 + rows.length, Math.min(gmax, 2 + Math.floor(r() * 2 + diff * 2)))
      for (let i = 0; i < gap; i++) rows.push(this.mkRow(row0 + rows.length, [false, false, false, false, false, false, false]))
      for (const rr of this.plainAt(row0 + rows.length, 3, 5)) rows.push(rr)
    }
    for (const rr of this.plainAt(row0 + rows.length, 3, 7)) rows.push(rr)
    return rows
  }

  /** 한두 차선이 통째로 즉사 타일 — 차선을 읽고 피해야 한다 */
  private killLane(row0: number, diff: number): Cell[][] {
    const r = this.rnd
    const rows: Cell[][] = []
    const len = 10 + Math.floor(r() * 12)
    const lanesHot = diff > 0.5 ? 2 : 1
    let hot = Math.floor(r() * 7)
    for (let i = 0; i < len; i++) {
      if (i > 0 && i % 6 === 0) hot = Math.floor(r() * 7)
      const row: Cell[] = []
      for (let c = 0; c < 7; c++) {
        const isHot = c >= hot && c < hot + lanesHot
        row.push(this.cell(isHot ? 12 : this.lane(row0 + i, c)))
      }
      rows.push(row)
    }
    for (const rr of this.plainAt(row0 + rows.length, 3, 7)) rows.push(rr)
    return rows
  }

  /** 한 칸 폭 길이 좌우로 뱀처럼 흐르는 구간 */
  private weave(row0: number, diff: number): Cell[][] {
    const r = this.rnd
    const rows: Cell[][] = []
    const span = 14 + Math.floor(r() * 12)
    const width = diff > 0.7 ? 1 : 2
    const half = (width - 1) / 2
    const phase = r() * Math.PI * 2
    for (let i = 0; i < span; i++) {
      const center = 3 + Math.round(Math.sin(phase + i * 0.42) * (3 - half))
      const cols: boolean[] = []
      for (let c = 0; c < 7; c++) cols.push(Math.abs(c - center) <= half)
      rows.push(this.mkRow(row0 + i, cols))
    }
    for (const rr of this.plainAt(row0 + rows.length, 4, 7)) rows.push(rr)
    return rows
  }

  private supply(row0: number): Cell[][] {
    const r = this.rnd
    this.lastRefillRow = row0
    const rows: Cell[][] = []
    const diff = Math.min(1, Math.max(0, (row0 - 80) / 1200))
    // 초반에는 두 칸짜리 보급 패치를 줘서 놓치기 어렵게 한다
    const width = diff > 0.55 ? 1 : 2
    const col = 1 + Math.floor(r() * (6 - width))
    for (const rr of this.plainAt(row0, 3, 7)) rows.push(rr)
    for (let i = 0; i < 3; i++) {
      const row: Cell[] = []
      for (let c = 0; c < 7; c++) {
        const isPad = c >= col && c < col + width
        row.push(this.cell(isPad ? 9 : this.lane(row0 + rows.length, c)))
      }
      rows.push(row)
    }
    for (const rr of this.plainAt(row0 + rows.length, 3, 7)) rows.push(rr)
    return rows
  }
}

function mod(a: number, n: number) { return ((a % n) + n) % n }

/**
 * 행성 정의에 오버드라이브(최고속·가속 배율)를 얹은 런타임 사본.
 * 프레임마다 새로 만들지 않도록 행성 인덱스별로 캐시한다.
 */
const RUNTIME_PLANETS = new Map<number, Planet>()
export function runtimePlanet(planetIndex: number): Planet {
  const cached = RUNTIME_PLANETS.get(planetIndex)
  if (cached) return cached
  const base = PLANETS[planetIndex % PLANETS.length]
  const k = overdrive(planetIndex)
  // 산소는 행성이 넘어갈수록 조금씩 빡빡해진다
  const tighten = Math.max(0.72, 1 - planetIndex * 0.035)
  const p: Planet = {
    ...base,
    oxygen: Math.round(base.oxygen * tighten),
    maxZVel: MAX_ZVEL * k,
    zAccel: ZACCEL * k,   // 가속도 같은 비율 → 최고속까지 걸리는 시간은 유지
  }
  RUNTIME_PLANETS.set(planetIndex, p)
  return p
}

export function gravityAccel(gravity: number): number {
  return -Math.floor((gravity * 0x1680) / 0x190) / 0x80
}

/* ------------------------------------------------------------------ */
/* 5. Ship — 원작 물리 이식                                             */
/* ------------------------------------------------------------------ */

export enum ShipState { Alive = 0, Exploded, OutOfFuel, OutOfOxygen }

export interface Controls { turn: number; accel: number; jump: boolean }

export interface ShipEvents {
  bounced?: (power: number) => void
  bumped?: () => void
  exploded?: () => void
  refilled?: () => void
}

interface ShipVars {
  x: number; y: number; z: number
  slideAmount: number; slidingAccel: number; xMovementBase: number
  vy: number; vz: number
  fuel: number; oxygen: number
  offsetNotInsideTile: number
  onGround: boolean; goingUp: boolean
  ranJumpMaster: boolean; jumpMasterDelta: number; jumpMasterOn: boolean
  jumpedFromY: number
  state: ShipState
}

export class Ship {
  v: ShipVars

  constructor(init?: Partial<ShipVars>) {
    this.v = {
      x: START_X, y: GROUND_Y, z: 3,
      slideAmount: 0, slidingAccel: 0, xMovementBase: 0,
      vy: 0, vz: 0,
      fuel: FULL_TANK, oxygen: FULL_TANK,
      offsetNotInsideTile: 0,
      onGround: true, goingUp: false,
      ranJumpMaster: false, jumpMasterDelta: 0, jumpMasterOn: false,
      jumpedFromY: 0,
      state: ShipState.Alive,
      ...init,
    }
  }

  clone(into?: Ship): Ship {
    if (!into) { const s = new Ship(); s.v = { ...this.v }; return s }
    into.v = { ...this.v }
    return into
  }

  /** 이번 프레임에 적용할 최고속 (오버드라이브 반영) */
  private maxZ = MAX_ZVEL
  private zAccel = ZACCEL

  private sanitize() {
    const v = this.v
    v.x = Math.round(v.x * 0x80) / 0x80
    v.y = Math.round(v.y * 0x80) / 0x80
    v.z = Math.round(v.z * 0x10000) / 0x10000
  }

  update(level: EndlessRoad, planet: Planet, expected: Ship, ctl: Controls, ev: ShipEvents) {
    const v = this.v
    this.maxZ = planet.maxZVel ?? MAX_ZVEL
    this.zAccel = planet.zAccel ?? ZACCEL
    this.sanitize()
    const canControl = v.state === ShipState.Alive

    const cell = level.getCell(v.x, v.y, v.z)
    const isAboveNothing = isEmptyCell(cell)
    const touch = this.touchEffect(cell)
    const onSliding = touch === Effect.Slide
    const onDecelPad = touch === Effect.Decel

    this.applyTouch(touch, ev)
    this.updateYVelocity(expected, planet, ev)
    this.updateZVelocity(canControl, ctl.accel)
    this.updateXVelocity(canControl, ctl.turn, onSliding, isAboveNothing, v.goingUp)
    this.updateJump(canControl, isAboveNothing, ctl.jump, planet)
    this.updateJumpMaster(ctl, level, planet)
    this.updateGravity(gravityAccel(planet.gravity))

    this.clone(expected)
    expected.attemptMotion(onDecelPad)
    expected.sanitize()
    this.moveTo(expected, level)
    this.sanitize()
    expected.sanitize()
    this.handleBumps(expected, level, ev)
    this.handleCollision(expected, ev)
    this.handleSlideCollision(expected)
    this.handleBounce(expected, level)
    this.handleOxygenAndFuel(planet)
  }

  private touchEffect(cell: Cell): Effect {
    const v = this.v
    if (!v.onGround) return Effect.None
    if (Math.floor(v.y) === GROUND_Y && cell.tile !== 0) return effectOf(cell.tile)
    if (Math.floor(v.y) > GROUND_Y && cell.cube !== 0 && cubeHeight(cell) === v.y) {
      return effectOf(cell.cubeColor)
    }
    return Effect.None
  }

  private applyTouch(eff: Effect, ev: ShipEvents) {
    const v = this.v
    switch (eff) {
      case Effect.Accel: v.vz += PAD_ZACCEL; break
      case Effect.Decel: v.vz -= PAD_ZACCEL; break
      case Effect.Kill:
        if (v.state !== ShipState.Exploded) ev.exploded?.()
        v.state = ShipState.Exploded
        break
      case Effect.Refill:
        if (v.state === ShipState.Alive) {
          if (v.fuel < REFILL_SFX_THRESHOLD || v.oxygen < REFILL_SFX_THRESHOLD) ev.refilled?.()
          v.fuel = FULL_TANK
          v.oxygen = FULL_TANK
        }
        break
    }
    this.clampZ()
  }

  private updateYVelocity(expected: Ship, planet: Planet, ev: ShipEvents) {
    const v = this.v
    if (Math.abs(expected.v.y - v.y) <= 0.01) return
    if (v.slideAmount === 0 || v.offsetNotInsideTile >= 2) {
      const yvel = Math.abs(v.vy)
      if (yvel > (planet.gravity * 0x104) / 8 / 0x80) {
        if (v.vy < 0) ev.bounced?.(yvel)
        v.vy = -0.5 * v.vy            // 원작의 반발계수 — 통통 튀는 착지
      } else {
        v.vy = 0
      }
    } else {
      v.vy = 0
    }
  }

  private updateZVelocity(canControl: boolean, accel: number) {
    this.v.vz += (canControl ? accel : 0) * this.zAccel
    this.clampZ()
  }

  private updateXVelocity(canControl: boolean, turn: number, onSliding: boolean, aboveNothing: boolean, goingUp: boolean) {
    const v = this.v
    if (onSliding) return
    const c1 = (goingUp || aboveNothing) && v.xMovementBase === 0 && v.vy > 0 && v.y - v.jumpedFromY < 30
    const c2 = !goingUp && !aboveNothing
    if (c1 || c2) v.xMovementBase = canControl ? turn * XMOVE : 0
  }

  private updateJump(canControl: boolean, aboveNothing: boolean, jump: boolean, planet: Planet) {
    const v = this.v
    if (!v.goingUp && !aboveNothing && jump && planet.gravity < 0x14 && canControl) {
      v.vy = JUMP_VY
      v.goingUp = true
      v.jumpedFromY = v.y
    }
  }

  private updateJumpMaster(ctl: Controls, level: EndlessRoad, planet: Planet) {
    const v = this.v
    if (v.goingUp && !v.ranJumpMaster && v.y >= 110) {
      this.runJumpMaster(ctl, level, planet)
      v.ranJumpMaster = true
    }
  }

  private updateGravity(g: number) {
    const v = this.v
    if (v.y >= 0x28) {
      v.vy += g
      v.vy = sFloor(v.vy * 0x80) / 0x80
    } else if (v.vy > -105 / 0x80) {
      v.vy = -105 / 0x80
    }
  }

  private attemptMotion(onDecelPad: boolean) {
    const v = this.v
    const dead = v.state === ShipState.Exploded
    let motionVel = v.vz
    if (!onDecelPad) motionVel += XRATE_BIAS
    const xMotion = (sFloor(v.xMovementBase * 0x80) * sFloor(motionVel * 0x10000)) / 0x10000 + v.slideAmount
    if (!dead) {
      v.x += xMotion
      v.y += v.vy
      v.z += v.vz
    }
  }

  private interp(dest: Ship, pct: number) {
    const v = this.v, d = dest.v
    v.x = round16((d.x - v.x) * pct + v.x)
    v.y = round16((d.y - v.y) * pct + v.y)
    v.z = round32((d.z - v.z) * pct + v.z)
  }

  private moveTo(dest: Ship, level: EndlessRoad) {
    const v = this.v, d = dest.v
    if (v.x === d.x && v.y === d.y && v.z === d.z) return

    const fake = this.clone()
    let iter = 1
    for (iter = 1; iter <= 5; iter++) {
      this.clone(fake)
      fake.interp(dest, iter / 5)
      if (level.isInsideTile(fake.v.x, fake.v.y, fake.v.z)) break
    }
    iter--
    this.interp(dest, iter / 5)

    let zGran = 0x1000 / 0x10000
    while (zGran !== 0) {
      this.clone(fake)
      fake.v.z += zGran
      if (d.z - v.z >= zGran && !level.isInsideTile(fake.v.x, fake.v.y, fake.v.z)) {
        v.z = fake.v.z
      } else {
        zGran /= 0x10
        zGran = Math.floor(zGran * 0x10000) / 0x10000
      }
    }
    v.z = round32(v.z)

    let xGran = d.x > v.x ? 0x7d / 0x80 : -0x7d / 0x80
    while (Math.abs(xGran) > 0) {
      this.clone(fake)
      fake.v.x += xGran
      if (Math.abs(d.x - v.x) >= Math.abs(xGran) && !level.isInsideTile(fake.v.x, fake.v.y, fake.v.z)) {
        v.x = fake.v.x
      } else {
        xGran = sFloor((xGran / 5) * 0x80) / 0x80
      }
    }
    v.x = round16(v.x)

    let yGran = d.y > v.y ? 0x7d / 0x80 : -0x7d / 0x80
    while (Math.abs(yGran) > 0) {
      this.clone(fake)
      fake.v.y += yGran
      if (Math.abs(d.y - v.y) >= Math.abs(yGran) && !level.isInsideTile(fake.v.x, fake.v.y, fake.v.z)) {
        v.y = fake.v.y
      } else {
        yGran = sFloor((yGran / 5) * 0x80) / 0x80
      }
    }
    v.y = round16(v.y)
  }

  private handleBumps(expected: Ship, level: EndlessRoad, ev: ShipEvents) {
    const v = this.v, d = expected.v
    const moved = this.clone()
    moved.v.z = d.z
    if (v.z !== d.z && level.isInsideTile(moved.v.x, moved.v.y, moved.v.z)) {
      this.clone(moved)
      moved.v.x = v.x - BUMP_OFF
      moved.v.z = d.z
      if (!level.isInsideTile(moved.v.x, moved.v.y, moved.v.z)) {
        v.x = moved.v.x; d.z = v.z; ev.bumped?.()
      } else {
        moved.v.x = v.x + BUMP_OFF
        if (!level.isInsideTile(moved.v.x, moved.v.y, moved.v.z)) {
          v.x = moved.v.x; d.z = v.z; ev.bumped?.()
        }
      }
    }
  }

  private handleCollision(expected: Ship, ev: ShipEvents) {
    const v = this.v
    if (Math.abs(v.z - expected.v.z) > 0.01) {
      if (v.vz < (1 / 3) * this.maxZ) {
        v.vz = 0
        ev.bumped?.()
      } else if (v.state !== ShipState.Exploded) {
        v.state = ShipState.Exploded
        ev.exploded?.()
      }
    }
  }

  private handleSlideCollision(expected: Ship) {
    const v = this.v
    if (Math.abs(v.x - expected.v.x) > 0.01) {
      v.xMovementBase = 0
      if (v.slideAmount !== 0) { expected.v.x = v.x; v.slideAmount = 0 }
      v.vz -= WALL_ZPENALTY
      this.clampZ()
    }
  }

  private handleBounce(expected: Ship, level: EndlessRoad) {
    const v = this.v
    v.onGround = false
    if (!(v.vy < 0 && expected.v.y !== v.y)) return

    v.vz += v.jumpMasterDelta
    v.jumpMasterDelta = 0
    v.ranJumpMaster = false
    v.jumpMasterOn = false
    v.goingUp = false
    v.onGround = true
    v.slidingAccel = 0

    const moved = this.clone()
    for (let i = 1; i <= 0xe; i++) {
      this.clone(moved)
      moved.v.x += i
      moved.v.y -= 1 / 0x80
      if (!level.isInsideTile(moved.v.x, moved.v.y, moved.v.z)) {
        v.slidingAccel++; v.offsetNotInsideTile = i; break
      }
    }
    for (let i = 1; i <= 0xe; i++) {
      this.clone(moved)
      moved.v.x -= i
      moved.v.y -= 1 / 0x80
      if (!level.isInsideTile(moved.v.x, moved.v.y, moved.v.z)) {
        v.slidingAccel--; v.offsetNotInsideTile = i; break
      }
    }
    if (v.slidingAccel !== 0) v.slideAmount += SLIDE_STEP * v.slidingAccel
    else v.slideAmount = 0
  }

  private handleOxygenAndFuel(planet: Planet) {
    const v = this.v
    v.oxygen -= FULL_TANK / (0x24 * planet.oxygen)
    if (v.oxygen <= 0) { v.oxygen = 0; if (v.state === ShipState.Alive) v.state = ShipState.OutOfOxygen }
    v.fuel -= (v.vz * FULL_TANK) / planet.fuel
    if (v.fuel <= 0) { v.fuel = 0; if (v.state === ShipState.Alive) v.state = ShipState.OutOfFuel }
  }

  /* --- JUMP-O-MASTER (원작의 점프 보정 장치) ---------------------- */

  private runJumpMaster(ctl: Controls, level: EndlessRoad, planet: Planet) {
    const v = this.v
    if (this.willLandOnTile(ctl, level, planet)) return
    const vz0 = v.vz
    const xm = v.xMovementBase
    let i = 1
    for (i = 1; i <= 6; i++) {
      v.xMovementBase = round16(xm + (xm * i) / 10)
      if (this.willLandOnTile(ctl, level, planet)) break
      v.xMovementBase = round16(xm - (xm * i) / 10)
      if (this.willLandOnTile(ctl, level, planet)) break
      v.xMovementBase = xm

      let zv2 = round32(vz0 + (vz0 * i) / 10)
      v.vz = clampZ(zv2, this.maxZ)
      if (v.vz === zv2 && this.willLandOnTile(ctl, level, planet)) break

      zv2 = round32(vz0 - (vz0 * i) / 10)
      v.vz = clampZ(zv2, this.maxZ)
      if (v.vz === zv2 && this.willLandOnTile(ctl, level, planet)) break

      v.vz = vz0
    }
    v.jumpMasterDelta = vz0 - v.vz
    if (i <= 6) v.jumpMasterOn = true
  }

  private isOnNothing(level: EndlessRoad, x: number, z: number) {
    const cell = level.getCell(x, 0, z)
    return isEmptyCell(cell) || (cell.tile !== 0 && effectOf(cell.tile) === Effect.Kill)
  }

  private willLandOnTile(ctl: Controls, level: EndlessRoad, planet: Planet): boolean {
    const v = this.v
    let xPos = v.x, yPos = v.y, zPos = v.z
    let xVel = v.xMovementBase, yVel = v.vy, zVel = v.vz
    const g = gravityAccel(planet.gravity)
    let guard = 0
    while (guard++ < 400) {
      const curX = xPos, curZ = zPos
      yVel += g
      zPos += zVel
      const xRate = zVel + XRATE_BIAS
      xPos += xVel * xRate * 128 + v.slideAmount
      if (xPos < ROAD_X0 || xPos > ROAD_X0 + ROAD_W) return false
      yPos += yVel
      zVel = clampZ(zVel + ctl.accel * this.zAccel, this.maxZ)
      if (yPos <= GROUND_Y) {
        return !this.isOnNothing(level, curX, curZ) && !this.isOnNothing(level, xPos, zPos)
      }
    }
    return false
  }

  private clampZ() { this.v.vz = clampZ(this.v.vz, this.maxZ) }
}

function clampZ(z: number, max: number = MAX_ZVEL) { return Math.min(Math.max(0, z), max) }

/* ------------------------------------------------------------------ */
/* 6. 소프트웨어 래스터라이저 (320x200, VGA 톤의 하드 엣지)              */
/* ------------------------------------------------------------------ */

// 사각형 클리핑/투영용 스크래치 (프레임마다 수천 번 호출되므로 재사용한다)
const QX = new Float64Array(4), QY = new Float64Array(4), QZ = new Float64Array(4)
const CX = new Float64Array(8), CY = new Float64Array(8), CZ = new Float64Array(8)
const SX = new Float64Array(8), SY = new Float64Array(8)

const rgba = (r: number, g: number, b: number) =>
  (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)

function shade(c: RGB, k: number): number {
  return rgba(Math.min(255, c[0] * k) | 0, Math.min(255, c[1] * k) | 0, Math.min(255, c[2] * k) | 0)
}

// 면 방향별 감쇠 — 원작 팔레트가 top/front/right/left 를 따로 갖는 것을 흉내
const K_TOP = 1.0, K_FRONT = 0.62, K_RIGHT = 0.80, K_LEFT = 0.44

class Raster {
  buf = new Uint32Array(SCREEN_W * SCREEN_H)
  clipBottom = SCREEN_H

  clear(color: number) { this.buf.fill(color) }

  blit(src: Uint32Array) { this.buf.set(src) }

  px(x: number, y: number, c: number) {
    x = Math.round(x); y = Math.round(y)
    if (x < 0 || y < 0 || x >= SCREEN_W || y >= this.clipBottom) return
    this.buf[y * SCREEN_W + x] = c
  }

  hline(x0: number, x1: number, y: number, c: number) {
    y = Math.round(y)
    if (y < 0 || y >= this.clipBottom) return
    x0 = Math.round(x0); x1 = Math.round(x1)
    if (x0 < 0) x0 = 0
    if (x1 > SCREEN_W - 1) x1 = SCREEN_W - 1
    const base = y * SCREEN_W
    for (let x = x0; x <= x1; x++) this.buf[base + x] = c
  }

  rect(x0: number, y0: number, w: number, h: number, c: number) {
    x0 = Math.round(x0); y0 = Math.round(y0); w = Math.round(w); h = Math.round(h)
    for (let y = y0; y < y0 + h; y++) this.hline(x0, x0 + w - 1, y, c)
  }

  /** 볼록 다각형 스캔라인 채우기 (안티에일리어싱 없음 = VGA 느낌) */
  polyF(xs: Float64Array, ys: Float64Array, n: number, c: number) {
    if (n < 3) return
    let minY = Infinity, maxY = -Infinity
    for (let i = 0; i < n; i++) { const y = ys[i]; if (y < minY) minY = y; if (y > maxY) maxY = y }
    if (maxY < 0 || minY >= this.clipBottom) return
    let y0 = Math.ceil(minY - 0.5)
    let y1 = Math.ceil(maxY - 0.5) - 1
    if (y1 < y0) y0 = y1 = Math.round(minY)   // 원경의 1픽셀 조각도 살린다
    if (y0 < 0) y0 = 0
    if (y1 >= this.clipBottom) y1 = this.clipBottom - 1
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5
      let xmin = Infinity, xmax = -Infinity
      for (let i = 0; i < n; i++) {
        const j = i + 1 === n ? 0 : i + 1
        const ay = ys[i], by = ys[j]
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) {
          const x = xs[i] + ((sy - ay) / (by - ay)) * (xs[j] - xs[i])
          if (x < xmin) xmin = x
          if (x > xmax) xmax = x
        }
      }
      if (xmin === Infinity) continue
      let px0 = Math.ceil(xmin - 0.5)
      let px1 = Math.ceil(xmax - 0.5) - 1
      if (px1 < px0) px1 = px0
      if (px0 < 0) px0 = 0
      if (px1 > SCREEN_W - 1) px1 = SCREEN_W - 1
      const base = y * SCREEN_W
      for (let x = px0; x <= px1; x++) this.buf[base + x] = c
    }
  }

}

/* ------------------------------------------------------------------ */
/* 7. 5x7 픽셀 폰트                                                     */
/* ------------------------------------------------------------------ */

const FONT: Record<string, string> = {
  'A': '0E11111F111111',
  'B': '1E11111E11111E',
  'C': '0E11101010110E',
  'D': '1C12111111121C',
  'E': '1F10101E10101F',
  'F': '1F10101E101010',
  'G': '0E11101711110F',
  'H': '1111111F111111',
  'I': '0E04040404040E',
  'J': '0702020202120C',
  'K': '11121418141211',
  'L': '1010101010101F',
  'M': '111B1515111111',
  'N': '11191513111111',
  'O': '0E11111111110E',
  'P': '1E11111E101010',
  'Q': '0E11111115120D',
  'R': '1E11111E141211',
  'S': '0F10100E01011E',
  'T': '1F040404040404',
  'U': '1111111111110E',
  'V': '11111111110A04',
  'W': '11111115151B11',
  'X': '11110A040A1111',
  'Y': '11110A04040404',
  'Z': '1F01020408101F',
  '0': '0E11131519110E',
  '1': '040C040404040E',
  '2': '0E11010204081F',
  '3': '1F02040201110E',
  '4': '02060A121F0202',
  '5': '1F101E0101110E',
  '6': '0608101E11110E',
  '7': '1F010204080808',
  '8': '0E11110E11110E',
  '9': '0E11110F01021C',
  ' ': '00000000000000',
  '-': '0000001F000000',
  '.': '00000000000C0C',
  ':': '000C0C000C0C00',
  '/': '01010204081010',
  '!': '04040404040004',
  '?': '0E110102040004',
  '%': '18190204081303',
  '+': '0004041F040400',
  '>': '08040201020408',
  '<': '02040810080402',
  '*': '000A041F040A00',
}

// 글리프를 모듈 로드 시 한 번만 비트맵으로 풀어둔다 (매 프레임 문자열 파싱 방지)
const FONT_BITS: Record<string, Uint8Array> = (() => {
  const out: Record<string, Uint8Array> = {}
  for (const ch of Object.keys(FONT)) {
    const hex = FONT[ch]
    const rows = new Uint8Array(7)
    for (let i = 0; i < 7; i++) rows[i] = parseInt(hex.substr(i * 2, 2), 16)
    out[ch] = rows
  }
  return out
})()

function drawText(r: Raster, x: number, y: number, text: string, color: number, shadow?: number) {
  let cx = Math.round(x)
  y = Math.round(y)
  for (const ch of text.toUpperCase()) {
    const g = FONT_BITS[ch] ?? FONT_BITS['?']
    for (let row = 0; row < 7; row++) {
      const bits = g[row]
      if (bits === 0) continue
      for (let col = 0; col < 5; col++) {
        if (bits & (1 << (4 - col))) {
          if (shadow !== undefined) r.px(cx + col + 1, y + row + 1, shadow)
          r.px(cx + col, y + row, color)
        }
      }
    }
    cx += 6
  }
}
function textWidth(t: string) { return t.length * 6 - 1 }

/* ------------------------------------------------------------------ */
/* 8. 배경 / 대시보드 사전 렌더                                         */
/* ------------------------------------------------------------------ */

function buildBackground(p: Planet, seed: number): Uint32Array {
  const r = new Raster()
  const rnd = mulberry32(seed)
  const { top, bottom, nebula, star } = p.sky

  for (let y = 0; y < SCREEN_H; y++) {
    const t = Math.min(1, y / 140)
    const c = rgba(
      (top[0] + (bottom[0] - top[0]) * t) | 0,
      (top[1] + (bottom[1] - top[1]) * t) | 0,
      (top[2] + (bottom[2] - top[2]) * t) | 0,
    )
    r.hline(0, SCREEN_W - 1, y, c)
  }

  // 성운 — 굵은 픽셀 블롭을 겹쳐 원작 배경 그림 느낌을 낸다
  for (let i = 0; i < 90; i++) {
    const cx = rnd() * SCREEN_W
    const cy = rnd() * 90
    const rad = 6 + rnd() * 26
    const a = 0.10 + rnd() * 0.16
    for (let y = Math.max(0, (cy - rad) | 0); y < Math.min(120, cy + rad); y++) {
      const dy = (y - cy) / rad
      const w = Math.sqrt(Math.max(0, 1 - dy * dy)) * rad
      for (let x = Math.max(0, (cx - w) | 0); x < Math.min(SCREEN_W, cx + w); x++) {
        const idx = y * SCREEN_W + x
        const o = r.buf[idx]
        const orr = o & 255, og = (o >> 8) & 255, ob = (o >> 16) & 255
        r.buf[idx] = rgba(
          (orr + (nebula[0] - orr) * a) | 0,
          (og + (nebula[1] - og) * a) | 0,
          (ob + (nebula[2] - ob) * a) | 0,
        )
      }
    }
  }

  // 별
  const starC = rgba(star[0], star[1], star[2])
  const starD = shade(star, 0.55)
  for (let i = 0; i < 220; i++) {
    const x = (rnd() * SCREEN_W) | 0
    const y = (rnd() * 118) | 0
    r.px(x, y, rnd() < 0.35 ? starC : starD)
  }

  // 행성체
  if (p.body) {
    const { x: bx, y: by, r: br, color, ring } = p.body
    for (let y = -br; y <= br; y++) {
      const w = Math.sqrt(Math.max(0, br * br - y * y))
      for (let x = -w; x <= w; x++) {
        const nx = x / br, ny = y / br
        const light = Math.max(0.25, 1.05 - Math.sqrt((nx + 0.4) * (nx + 0.4) + (ny + 0.35) * (ny + 0.35)) * 0.95)
        const band = 0.92 + 0.16 * Math.sin(ny * 9 + Math.sin(nx * 3) * 1.5)
        r.px((bx + x) | 0, (by + y) | 0, shade(color, light * band))
      }
    }
    if (ring) {
      for (let a = 0; a < 360; a += 1) {
        const rad = (a * Math.PI) / 180
        for (const rr of [br * 1.5, br * 1.62, br * 1.74]) {
          const x = bx + Math.cos(rad) * rr
          const y = by + Math.sin(rad) * rr * 0.24
          r.px(x | 0, y | 0, shade(color, 0.7))
        }
      }
    }
  }

  // 지평선 실루엣 (원작 배경화의 암석 지형)
  if (p.terrain) {
    for (let i = 0; i < 26; i++) {
      const base = HORIZON_Y + 2 + rnd() * 9
      const cx = rnd() * (SCREEN_W + 60) - 30
      const w = 10 + rnd() * 34
      const h = 8 + rnd() * 48
      const k = 0.55 + rnd() * 0.6
      const c = shade(p.terrain, k)
      const cLight = shade(p.terrain, k * 1.5)
      for (let x = (cx - w / 2) | 0; x < cx + w / 2; x++) {
        const t = Math.abs((x - cx) / (w / 2))
        const hh = h * (1 - t * t * 0.85)
        for (let y = base; y > base - hh; y--) r.px(x, y, c)
        if (x < cx - w * 0.22) for (let y = base - 1; y > base - hh; y -= 2) { if (((x + y) & 3) === 0) r.px(x, y, cLight) }
      }
    }
  }

  return r.buf
}

/* 대시보드: 원작 스크린샷 계측 좌표 그대로 */
const DASH_SAGE: RGB = [115, 148, 139]
const DASH_SAGE_D: RGB = [82, 115, 108]
const DASH_SAGE_L: RGB = [156, 180, 158]
const DASH_EDGE: RGB = [52, 74, 70]
const LCD_TAN: RGB = [185, 162, 84]
const LCD_TAN_D: RGB = [138, 118, 52]
const LCD_TEXT: RGB = [34, 58, 40]
const GAUGE_MAG: RGB = [176, 12, 150]
const GAUGE_MAG_D: RGB = [98, 0, 82]
const DIAL_NAVY: RGB = [22, 7, 74]
const LED_ON: RGB = [64, 232, 64]

const DIAL_CX = 161, DIAL_CY = 169, DIAL_RX = 31, DIAL_RY = 24
const SPEED_STEPS = 34, ARC_STEPS = 10

// 다이얼 픽셀 분류표 — atan2/sqrt 를 매 프레임 돌리지 않기 위해 미리 굽는다.
// kind: 0 바깥 / 1 허브 / 2 허브테두리 / 3 속도눈금틈 / 4 속도눈금 / 5 링틈 / 6 O2 / 7 FUEL
const DIAL_W = DIAL_RX * 2 + 1
const DIAL_H = DIAL_RY * 2 + 1
const DIAL_KIND = new Uint8Array(DIAL_W * DIAL_H)
const DIAL_STEP = new Uint8Array(DIAL_W * DIAL_H)
;(() => {
  for (let y = -DIAL_RY; y <= DIAL_RY; y++) {
    for (let x = -DIAL_RX; x <= DIAL_RX; x++) {
      const i = (y + DIAL_RY) * DIAL_W + (x + DIAL_RX)
      const nx = x / DIAL_RX, ny = y / DIAL_RY
      const d = Math.sqrt(nx * nx + ny * ny)
      if (d > 1) { DIAL_KIND[i] = 0; continue }
      if (d < 0.44) { DIAL_KIND[i] = 1; continue }
      if (d < 0.48) { DIAL_KIND[i] = 2; continue }
      if (x > 0) {
        const t = ((Math.atan2(ny, nx) + Math.PI / 2) / Math.PI) * SPEED_STEPS
        if (t % 1 < 0.26) { DIAL_KIND[i] = 3 } else { DIAL_KIND[i] = 4; DIAL_STEP[i] = Math.min(255, t | 0) }
      } else {
        let a = Math.atan2(ny, nx)
        if (a < 0) a += Math.PI * 2
        const f = ((a - Math.PI / 2) / Math.PI) * ARC_STEPS
        if (d > 0.7 && d <= 0.74) { DIAL_KIND[i] = 5; continue }
        if (f % 1 < 0.16) { DIAL_KIND[i] = 5; continue }
        DIAL_KIND[i] = d > 0.74 ? 6 : 7
        DIAL_STEP[i] = Math.min(255, f | 0)
      }
    }
  }
})()

function buildDashboard(): Uint32Array {
  const r = new Raster()
  r.buf.fill(0)
  const sage = rgba(...DASH_SAGE)
  const sageD = rgba(...DASH_SAGE_D)
  const sageL = rgba(...DASH_SAGE_L)
  const edge = rgba(...DASH_EDGE)

  // 콕핏 실루엣: 중앙은 131행, 양쪽 어깨는 111행까지 솟는다
  const topAt = (x: number) => {
    const shoulder = (cx: number) => 131 - 20 * Math.exp(-Math.pow((x - cx) / 26, 2))
    let y = Math.min(shoulder(52), shoulder(268))
    if (x < 14) y += (14 - x) * 0.6
    if (x > 305) y += (x - 305) * 0.6
    return Math.round(y)
  }
  for (let x = 0; x < SCREEN_W; x++) {
    const t = topAt(x)
    for (let y = t; y < SCREEN_H; y++) {
      const shadeK = y < t + 2 ? sageL : x > 240 ? sageD : sage
      r.px(x, y, shadeK)
    }
    r.px(x, t, edge)
  }
  // 콕핏 패널 분할선
  for (let y = 131; y < SCREEN_H; y++) {
    r.px(84, y, sageD); r.px(85, y, edge)
    r.px(238, y, edge); r.px(239, y, sageL)
  }
  r.hline(0, SCREEN_W - 1, 133, sageD)

  // 좌측 진행 표시 슬롯
  r.rect(24, 137, 54, 14, edge)
  r.rect(26, 139, 50, 10, rgba(58, 26, 56))

  // LCD 두 개 (GRAV-O METER / JUMP-O MASTER)
  const lcd = (x: number) => {
    r.rect(x - 2, 143, 38, 22, edge)
    r.rect(x, 145, 34, 18, rgba(...LCD_TAN_D))
    r.rect(x, 145, 34, 16, rgba(...LCD_TAN))
    r.rect(x + 14, 138, 6, 5, edge)               // LED 하우징
  }
  lcd(93)
  lcd(197)

  // 큰 다이얼 배경
  for (let y = -DIAL_RY - 3; y <= DIAL_RY + 3; y++) {
    for (let x = -DIAL_RX - 3; x <= DIAL_RX + 3; x++) {
      const d = (x * x) / ((DIAL_RX + 3) * (DIAL_RX + 3)) + (y * y) / ((DIAL_RY + 3) * (DIAL_RY + 3))
      if (d <= 1) r.px(DIAL_CX + x, DIAL_CY + y, edge)
    }
  }
  for (let y = -DIAL_RY; y <= DIAL_RY; y++) {
    for (let x = -DIAL_RX; x <= DIAL_RX; x++) {
      const d = (x * x) / (DIAL_RX * DIAL_RX) + (y * y) / (DIAL_RY * DIAL_RY)
      if (d <= 1) r.px(DIAL_CX + x, DIAL_CY + y, x <= 0 ? rgba(...GAUGE_MAG_D) : rgba(...DIAL_NAVY))
    }
  }

  // 라벨
  drawText(r, 84, 168, 'GRAV-O', rgba(...LCD_TEXT))
  drawText(r, 90, 177, 'METER', rgba(...LCD_TEXT))
  drawText(r, 199, 168, 'JUMP-O', rgba(...LCD_TEXT))
  drawText(r, 196, 177, 'MASTER', rgba(...LCD_TEXT))

  return r.buf
}

/* ------------------------------------------------------------------ */
/* 9. 게임                                                              */
/* ------------------------------------------------------------------ */

export interface HudState {
  score: number
  distance: number
  planet: string
  planetIndex: number
  gravity: number
  fuel: number
  oxygen: number
  speed: number
  jumpMaster: boolean
  state: 'ready' | 'playing' | 'dead'
  deathReason: string
  paused: boolean
}

export interface SkyRoadsOptions {
  onHud?: (h: HudState) => void
  onGameOver?: (score: number, distance: number) => void
  muted?: boolean
}

interface Debris { x: number; y: number; z: number; vx: number; vy: number; vz: number; s: number; c: number }

export class SkyRoadsGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private image: ImageData
  private raster = new Raster()
  private dash = buildDashboard()
  private bg!: Uint32Array
  private bgPlanet = -1

  private road!: EndlessRoad
  private ship!: Ship
  private expected!: Ship
  private planet!: Planet
  private planetIdx = 0
  /** 오버드라이브가 반영된 현재 최고속 — HUD 와 렌더 연출이 함께 본다 */
  private maxZ = MAX_ZVEL

  private keys = new Set<string>()
  private acc = 0
  private last = 0
  private raf = 0
  private frame = 0
  private running = false

  private score = 0
  private deathReason = ''
  private deadFrames = 0
  private debris: Debris[] = []
  private flash = 0
  private started = false
  private paused = false
  private opts: SkyRoadsOptions
  private seed = 1

  private audio: AudioContext | null = null
  private engineOsc: OscillatorNode | null = null
  private engineGain: GainNode | null = null
  muted: boolean

  constructor(canvas: HTMLCanvasElement, opts: SkyRoadsOptions = {}) {
    this.canvas = canvas
    this.opts = opts
    this.muted = !!opts.muted
    canvas.width = SCREEN_W
    canvas.height = SCREEN_H
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D context unavailable')
    ctx.imageSmoothingEnabled = false
    this.ctx = ctx
    // 래스터 버퍼를 그대로 들여다보는 ImageData — 프레임마다 복사하지 않는다
    this.image = new ImageData(new Uint8ClampedArray(this.raster.buf.buffer), SCREEN_W, SCREEN_H)
    this.reset()
    this.bind()
  }

  /* --- 수명 주기 --------------------------------------------------- */

  reset() {
    this.seed = (Math.random() * 0xffffffff) >>> 0
    this.road = new EndlessRoad(this.seed)
    this.ship = new Ship()
    this.expected = this.ship.clone()
    this.planetIdx = 0
    this.planet = runtimePlanet(0)
    this.maxZ = this.planet.maxZVel ?? MAX_ZVEL
    this.bgPlanet = -1
    this.setBackground(0)
    this.score = 0
    this.frame = 0
    this.deathReason = ''
    this.deadFrames = 0
    this.debris = []
    this.flash = 0
    this.started = false
    this.paused = false
    this.acc = 0
    this.last = typeof performance !== 'undefined' ? performance.now() : 0
    this.pushHud()
  }

  /** 새 판을 시작한다 (게임오버 화면의 RETRY 버튼 / R 키). */
  restart() {
    this.reset()
    this.started = true
    this.initAudio()
    this.start()
    this.pushHud()
  }

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    const loop = (t: number) => {
      if (!this.running) return
      this.raf = requestAnimationFrame(loop)
      let dt = (t - this.last) / 1000
      this.last = t
      if (dt > 0.25) dt = 0.25
      if (!this.paused) {
        this.acc += dt
        let guard = 0
        while (this.acc >= TICK && guard++ < 6) { this.acc -= TICK; this.step() }
      }
      this.render()
    }
    this.raf = requestAnimationFrame(loop)
  }

  destroy() {
    this.running = false
    cancelAnimationFrame(this.raf)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.stopEngineSound()
    try { this.audio?.close() } catch { /* noop */ }
  }

  setMuted(m: boolean) {
    this.muted = m
    if (m) this.stopEngineSound()
  }

  togglePause() {
    if (!this.started || this.ship.v.state !== ShipState.Alive) return
    this.paused = !this.paused
    if (this.paused) this.stopEngineSound()
    this.pushHud()
  }

  /* --- 입력 -------------------------------------------------------- */

  private bind() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Spacebar'].includes(k)) e.preventDefault()
    this.keys.add(k === 'Spacebar' ? ' ' : k)
    if (!this.started && (k === ' ' || k === 'ArrowUp' || k === 'Enter')) {
      this.started = true
      this.initAudio()
      this.pushHud()
    }
    if (k === 'r' || k === 'R') {
      if (this.deathReason) this.restart()
    }
    if (k === 'p' || k === 'P') this.togglePause()
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key === 'Spacebar' ? ' ' : e.key)
  }

  private controls(): Controls {
    if (!this.started || this.paused) return { turn: 0, accel: 0, jump: false }
    const k = this.keys
    const left = k.has('ArrowLeft') || k.has('a') || k.has('A')
    const right = k.has('ArrowRight') || k.has('d') || k.has('D')
    const up = k.has('ArrowUp') || k.has('w') || k.has('W')
    const down = k.has('ArrowDown') || k.has('s') || k.has('S')
    return {
      turn: left ? -1 : right ? 1 : 0,
      accel: up ? 1 : down ? -1 : 0,
      jump: k.has(' '),
    }
  }

  private isOver() {
    return this.ship.v.state !== ShipState.Alive || this.ship.v.y < -10
  }

  /* --- 시뮬레이션 --------------------------------------------------- */

  private step() {
    this.frame++
    if (this.flash > 0) this.flash--
    const v = this.ship.v

    if (this.deathReason) {
      this.deadFrames++
      for (const d of this.debris) {
        d.x += d.vx; d.y += d.vy; d.z += d.vz
        d.vy -= 0.55
      }
      return
    }

    const row = Math.floor(v.z)
    this.road.ensure(row + 90)
    this.road.prune(row - 8)

    const pi = this.road.planetIndexAt(row)
    if (pi !== this.planetIdx) {
      this.planetIdx = pi
      this.score += 1000
      this.setBackground(pi)
      this.blip(660, 0.08, 'square', 0.16)
    }
    this.planet = runtimePlanet(this.road.planetIndexAt(row))
    this.maxZ = this.planet.maxZVel ?? MAX_ZVEL

    const before = v.z
    this.ship.update(this.road, this.planet, this.expected, this.controls(), {
      bounced: (p) => this.blip(150 + p * 22, 0.05, 'square', Math.min(0.2, 0.05 + p * 0.02)),
      bumped: () => this.blip(90, 0.06, 'sawtooth', 0.1),
      exploded: () => this.explode(),
      refilled: () => { this.score += 250; this.chime() },
    })
    if (v.z > before) this.score += (v.z - before) * 10

    if (v.state === ShipState.Exploded && !this.deathReason) this.die('CRASHED')
    else if (v.state === ShipState.OutOfFuel) this.die('OUT OF FUEL')
    else if (v.state === ShipState.OutOfOxygen) this.die('OUT OF OXYGEN')
    else if (v.y < -10) this.die('FELL OFF THE ROAD')

    this.engineSound()
    if (this.frame % 3 === 0) this.pushHud()
  }

  private die(reason: string) {
    if (this.deathReason) return
    this.deathReason = reason
    this.deadFrames = 0
    this.stopEngineSound()
    if (reason === 'CRASHED') this.explode()
    else this.blip(120, 0.5, 'sawtooth', 0.14)
    this.pushHud()
    this.opts.onGameOver?.(Math.floor(this.score), Math.floor(this.ship.v.z))
  }

  private explode() {
    if (this.debris.length) return
    this.flash = 3
    const v = this.ship.v
    const rnd = mulberry32(this.frame * 2654435761)
    for (let i = 0; i < 18; i++) {
      const a = rnd() * Math.PI * 2
      const sp = 1.2 + rnd() * 4.2
      this.debris.push({
        x: v.x, y: v.y + 6, z: v.z * CELL,
        vx: Math.cos(a) * sp, vy: 1 + rnd() * 6, vz: Math.sin(a) * sp * 0.6,
        s: 2 + rnd() * 6,
        c: [rgba(255, 240, 180), rgba(240, 130, 40), rgba(200, 40, 40), rgba(90, 110, 150)][(rnd() * 4) | 0],
      })
    }
    this.blip(70, 0.45, 'sawtooth', 0.22)
    this.noise(0.5, 0.25)
  }

  private setBackground(i: number) {
    if (this.bgPlanet === i) return
    this.bgPlanet = i
    this.bg = buildBackground(PLANETS[i % PLANETS.length], (this.seed ^ (i * 7919)) >>> 0)
  }

  private pushHud() {
    const v = this.ship.v
    this.opts.onHud?.({
      score: Math.floor(this.score),
      distance: Math.floor(v.z),
      planet: this.planet.name,
      planetIndex: this.planetIdx,
      gravity: (this.planet.gravity - 3) * 100,
      fuel: v.fuel / FULL_TANK,
      oxygen: v.oxygen / FULL_TANK,
      speed: v.vz / this.maxZ,
      jumpMaster: v.jumpMasterOn,
      state: this.deathReason ? 'dead' : this.started ? 'playing' : 'ready',
      deathReason: this.deathReason,
      paused: this.paused,
    })
  }

  /* --- 투영 -------------------------------------------------------- */

  private camZ = 0
  private shakeX = 0
  private shakeY = 0

  /**
   * 사각형 하나를 근평면으로 자른 뒤 화면에 채운다.
   * 프레임당 1000개 가까이 호출되므로 스크래치 버퍼만 쓰고 아무것도 할당하지 않는다.
   */
  private quad4(
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
    dx: number, dy: number, dz: number,
    color: number,
  ) {
    const cam = this.camZ
    QX[0] = ax; QY[0] = ay; QZ[0] = az - cam
    QX[1] = bx; QY[1] = by; QZ[1] = bz - cam
    QX[2] = cx; QY[2] = cy; QZ[2] = cz - cam
    QX[3] = dx; QY[3] = dy; QZ[3] = dz - cam

    let n = 0
    for (let i = 0; i < 4; i++) {
      const j = i === 3 ? 0 : i + 1
      const azz = QZ[i], bzz = QZ[j]
      const aIn = azz >= NEAR_Z, bIn = bzz >= NEAR_Z
      if (aIn) { CX[n] = QX[i]; CY[n] = QY[i]; CZ[n] = azz; n++ }
      if (aIn !== bIn) {
        const t = (NEAR_Z - azz) / (bzz - azz)
        CX[n] = QX[i] + (QX[j] - QX[i]) * t
        CY[n] = QY[i] + (QY[j] - QY[i]) * t
        CZ[n] = NEAR_Z
        n++
      }
    }
    if (n < 3) return
    for (let i = 0; i < n; i++) {
      const s = FOCAL / CZ[i]
      SX[i] = CENTER_X + this.shakeX + CX[i] * s
      SY[i] = HORIZON_Y + this.shakeY - (CY[i] - CAM_Y) * s
    }
    this.raster.polyF(SX, SY, n, color)
  }

  private quad(p: Array<[number, number, number]>, color: number) {
    this.quad4(
      p[0][0], p[0][1], p[0][2],
      p[1][0], p[1][1], p[1][2],
      p[2][0], p[2][1], p[2][2],
      p[3][0], p[3][1], p[3][2],
      color,
    )
  }

  /* --- 렌더 -------------------------------------------------------- */

  private render() {
    const r = this.raster
    const v = this.ship.v
    r.clipBottom = SCREEN_H
    r.blit(this.bg)

    // 빠를수록 카메라가 살짝 물러나 시야가 넓어진다 (속도감용 달리 줌)
    const speedFrac = Math.min(1, v.vz / this.maxZ)
    const camBack = CAM_BACK * (1 + 0.12 * speedFrac)
    this.camZ = v.z * CELL - camBack
    // 최고속 근처에서만 1픽셀 흔들림
    const shakeAmt = Math.max(0, speedFrac - 0.7) / 0.3
    this.shakeX = shakeAmt > 0 ? (((this.frame * 7) % 3) - 1) * shakeAmt : 0
    this.shakeY = shakeAmt > 0 ? (((this.frame * 5) % 3) - 1) * shakeAmt * 0.6 : 0
    r.clipBottom = SCENE_BOTTOM    // 대시보드 뒤로는 그릴 필요 없음

    const startRow = Math.max(0, Math.floor(v.z) - 4)
    const endRow = startRow + VIEW_ROWS
    const tiles = this.planet.tiles
    const cubeBase = this.planet.cube

    for (let z = endRow; z >= startRow; z--) {
      const row = this.road.rowAt(z)
      if (!row) continue
      const prev = this.road.rowAt(z - 1)
      const zStart = z * CELL         // 카메라에 가까운 쪽 면
      const zEnd = (z + 1) * CELL
      const dzFar = zEnd - this.camZ
      if (dzFar <= NEAR_Z) continue
      // 이 행의 가장 높은 지점(풀블록 윗면)이 화면 아래라면 통째로 생략
      if (HORIZON_Y + (CAM_Y - CUBE_FULL_Y) * (FOCAL / dzFar) >= SCENE_BOTTOM) continue
      const far = zStart - this.camZ > FAR_FACE_Z
      // 한 행 걸러 윗면을 조금 어둡게 → 도로가 밑으로 흘러가는 게 눈에 보인다
      const rowK = (z & 1) === 0 ? 1 : 0.86
      // 도로 셀 순서: 화면 중앙에서 먼 컬럼부터 그린다
      const order = [0, 6, 1, 5, 2, 4, 3]
      for (const x of order) {
        const c = row[x]
        if (isEmptyCell(c)) continue
        const xl = x * CELL - CELL * 3.5
        const xr = xl + CELL
        const hSelf = c.cube !== 0 ? cubeHeight(c) : c.tile !== 0 ? GROUND_Y : 0
        const hL = x > 0 ? heightOf(row[x - 1]) : 0
        const hR = x < 6 ? heightOf(row[x + 1]) : 0
        const hF = prev ? heightOf(prev[x]) : 0
        const drawLeft = !far && (x === 0 || hL < hSelf)
        const drawRight = !far && (x === 6 || hR < hSelf)
        const drawFront = !far && hF < hSelf

        if (c.tile !== 0) {
          const base = tiles[c.tile] ?? tiles[1]
          this.box(xl, xr, TILE_BOTTOM_Y, GROUND_Y, zStart, zEnd, base, drawFront, drawLeft, drawRight, rowK)
        }
        if (c.cube !== 0 && !c.tunnel) {
          const base = c.cubeColor ? tiles[c.cubeColor] ?? cubeBase : cubeBase
          this.box(xl, xr, GROUND_Y, cubeHeight(c), zStart, zEnd, base, drawFront, drawLeft, drawRight)
        }
        if (c.tunnel) {
          this.tunnelArch(xl, xr, zStart, zEnd, tiles[c.tile] ?? tiles[1])
        }
      }
    }

    this.drawSpeedStreaks(speedFrac)
    this.drawShip()

    if (this.flash > 0) {
      const c = rgba(255, 255, 255)
      for (let y = 0; y < SCENE_BOTTOM; y++) {
        for (let x = 0; x < SCREEN_W; x += 1) if (((x + y + this.flash) & 1) === 0) r.px(x, y, c)
      }
    }

    r.clipBottom = SCREEN_H
    this.drawDashboard()
    this.drawOverlay()

    this.ctx.putImageData(this.image, 0, 0)
  }

  private box(
    xl: number, xr: number, yb: number, yt: number, zNear: number, zFar: number,
    base: RGB, front: boolean, left: boolean, right: boolean, topK = 1,
  ) {
    // 월드 z 는 진행 방향으로 증가한다 → zNear 쪽 면이 카메라를 향한 앞면이다.
    if (front) this.quad4(xl, yt, zNear, xr, yt, zNear, xr, yb, zNear, xl, yb, zNear, shade(base, K_FRONT))
    if (left) this.quad4(xl, yt, zNear, xl, yb, zNear, xl, yb, zFar, xl, yt, zFar, shade(base, K_LEFT))
    if (right) this.quad4(xr, yt, zNear, xr, yb, zNear, xr, yb, zFar, xr, yt, zFar, shade(base, K_RIGHT))
    this.quad4(xl, yt, zNear, xr, yt, zNear, xr, yt, zFar, xl, yt, zFar, shade(base, K_TOP * topK))
  }

  private tunnelArch(xl: number, xr: number, zStart: number, zEnd: number, base: RGB) {
    if (zStart - this.camZ < CELL) return
    const cx = (xl + xr) / 2
    const R = 23, YM = 0.855
    const SEG = 12
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI
      const a1 = ((i + 1) / SEG) * Math.PI
      const p0x = cx + Math.cos(a0) * R, p0y = GROUND_Y + Math.sin(a0) * R * YM
      const p1x = cx + Math.cos(a1) * R, p1y = GROUND_Y + Math.sin(a1) * R * YM
      const k = 0.35 + 0.55 * Math.sin((i + 0.5) / SEG * Math.PI)
      this.quad4(p0x, p0y, zStart, p1x, p1y, zStart, p1x, p1y, zEnd, p0x, p0y, zEnd, shade(base, k))
    }
  }

  /** 소실점에서 바깥으로 뻗는 선. 도로 위에는 그리지 않아 원작 화면을 해치지 않는다. */
  private drawSpeedStreaks(speedFrac: number) {
    if (speedFrac < 0.5) return
    const r = this.raster
    const k = (speedFrac - 0.5) / 0.5
    const col = this.planet.sky.star
    const c = shade(col, 0.55 + k * 0.45)
    const n = 18
    const travel = this.ship.v.z * 0.6
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996                       // 황금각으로 고르게 흩는다
      const t = ((travel + i * 0.618) % 1)
      const rad = 6 + t * t * 340
      const dx = Math.cos(a), dy = Math.sin(a)
      const len = 2 + t * 14 * k
      for (let l = 0; l < len; l++) {
        const rr = rad + l
        const x = CENTER_X + dx * rr * 1.7
        const y = HORIZON_Y + dy * rr
        if (y < 2 || y >= SCENE_BOTTOM) break
        // 도로 실루엣 안쪽이면 건너뛴다 (도로 반폭 = (y-33) * 7/3)
        if (y > HORIZON_Y && Math.abs(x - CENTER_X) < (y - HORIZON_Y) * 2.34) continue
        r.px(x, y, c)
      }
    }
  }

  private drawShip() {
    const v = this.ship.v
    if (this.debris.length) { this.drawDebris(); return }
    if (v.y < -30) return

    const sx = v.x - START_X
    const sy = v.y
    const sz = v.z * CELL

    // 그림자
    const cell = this.road.getCell(v.x, 0, v.z)
    if (!isEmptyCell(cell) && v.y > GROUND_Y + 1) {
      const k = Math.max(0.1, 1 - (v.y - GROUND_Y) / 90)
      const w = 15 * k + 4
      const top = cell.cube !== 0 ? cubeHeight(cell) : GROUND_Y
      this.quad4(sx - w, top + 0.4, sz - 11, sx + w, top + 0.4, sz - 11, sx + w, top + 0.4, sz + 11, sx - w, top + 0.4, sz + 11, rgba(0, 0, 0))
    }

    const ctl = this.controls()
    const HULL: RGB = [46, 74, 114]
    const HULL_D: RGB = [26, 40, 62]
    const HULL_L: RGB = [110, 150, 200]
    const DOME: RGB = [176, 208, 236]
    const flick = (this.frame % 4) / 4

    type Face = { p: Array<[number, number, number]>; c: number; z: number }
    const faces: Face[] = []
    const add = (pts: Array<[number, number, number]>, c: number) => {
      let zz = 0
      for (const p of pts) zz += p[2]
      faces.push({ p: pts.map((p) => [p[0] + sx, p[1] + sy, p[2] + sz] as [number, number, number]), c, z: zz / pts.length })
    }

    // 본체 (뒤 -15 ~ 앞 +15, 바닥 0 ~ 윗면 9)
    add([[-18, 9, -15], [18, 9, -15], [11, 9, 15], [-11, 9, 15]], shade(HULL_L, 1))
    add([[-18, 0, -15], [18, 0, -15], [11, 0, 15], [-11, 0, 15]], shade(HULL_D, 0.5))
    add([[-18, 9, -15], [18, 9, -15], [18, 0, -15], [-18, 0, -15]], shade(HULL, 0.75))
    add([[-18, 9, -15], [-18, 0, -15], [-11, 0, 15], [-11, 9, 15]], shade(HULL, 0.55))
    add([[18, 9, -15], [18, 0, -15], [11, 0, 15], [11, 9, 15]], shade(HULL, 0.92))
    // 좌우 포드
    for (const s of [-1, 1]) {
      const x0 = s * 12, x1 = s * 20
      const xa = Math.min(x0, x1), xb = Math.max(x0, x1)
      add([[xa, 11, -16], [xb, 11, -16], [xb, 11, 2], [xa, 11, 2]], shade(HULL_L, 0.88))
      add([[xa, 11, -16], [xb, 11, -16], [xb, 3, -16], [xa, 3, -16]], shade(HULL_D, 1.1))
      add([[xa + 1, 9, -16.4], [xb - 1, 9, -16.4], [xb - 1, 5, -16.4], [xa + 1, 5, -16.4]], rgba(198 - flick * 40, 52, 44))
      // 엔진 불꽃 — 뒤로 갈수록 좁아지는 판 두 장
      const thrust = (ctl.accel > 0 ? 1 : ctl.accel < 0 ? 0.2 : 0.5) * (0.5 + 0.9 * Math.min(1, this.ship.v.vz / this.maxZ))
      const fl = (3 + flick * 4) * thrust + 2
      add([[xa + 2, 8.5, -17 - fl * 0.5], [xb - 2, 8.5, -17 - fl * 0.5], [xb - 2, 5.5, -17 - fl * 0.5], [xa + 2, 5.5, -17 - fl * 0.5]], rgba(252, 200 - flick * 50, 96))
      add([[xa + 3, 8, -17 - fl], [xb - 3, 8, -17 - fl], [xb - 3, 6, -17 - fl], [xa + 3, 6, -17 - fl]], rgba(252, 128 + flick * 50, 48))
    }
    // 캐노피 돔
    add([[-6, 15, -5], [6, 15, -5], [5, 15, 6], [-5, 15, 6]], shade(DOME, 1))
    add([[-6, 15, -5], [6, 15, -5], [6, 9, -5], [-6, 9, -5]], shade(DOME, 0.62))
    add([[-6, 15, -5], [-6, 9, -5], [-5, 9, 6], [-5, 15, 6]], shade(DOME, 0.5))
    add([[6, 15, -5], [6, 9, -5], [5, 9, 6], [5, 15, 6]], shade(DOME, 0.85))
    // 노즈
    add([[-11, 9, 15], [11, 9, 15], [7, 3, 21], [-7, 3, 21]], shade(HULL_L, 0.8))

    faces.sort((a, b) => b.z - a.z)
    for (const f of faces) this.quad(f.p, f.c)
  }

  private drawDebris() {
    for (const d of this.debris) {
      const s = d.s
      const x = d.x - START_X
      this.quad4(x - s, d.y + s, d.z - s, x + s, d.y + s, d.z - s, x + s, d.y - s, d.z - s, x - s, d.y - s, d.z - s, d.c)
      this.quad4(x - s, d.y + s, d.z - s, x + s, d.y + s, d.z - s, x + s, d.y + s, d.z + s, x - s, d.y + s, d.z + s, d.c)
    }
  }

  /* --- 대시보드 / 오버레이 ----------------------------------------- */

  private drawDashboard() {
    const r = this.raster
    const v = this.ship.v
    // 정적 부분
    const src = this.dash
    for (let i = DASH_TOP * SCREEN_W; i < src.length; i++) if (src[i] !== 0) r.buf[i] = src[i]

    // 진행 표시 (다음 행성까지)
    const prog = ((v.z % PLANET_ROWS) / PLANET_ROWS)
    r.rect(27, 140, Math.max(1, Math.round(48 * prog)), 8, rgba(...GAUGE_MAG))

    // GRAV-O METER 수치
    const grav = String((this.planet.gravity - 3) * 100)
    drawText(r, Math.round(93 + 17 - textWidth(grav) / 2), 149, grav, rgba(...LCD_TEXT))
    // JUMP-O MASTER
    const jm = v.jumpMasterOn ? 'ON' : 'IDLE'
    drawText(r, Math.round(197 + 17 - textWidth(jm) / 2), 149, jm, rgba(...LCD_TEXT))
    // LED
    const led = rgba(...LED_ON)
    r.rect(93 + 15, 139, 3, 3, led)
    r.rect(197 + 15, 139, 3, 3, v.jumpMasterOn ? led : rgba(28, 70, 28))

    // 큰 다이얼 — 왼쪽 반원은 O2/FUEL 아크, 오른쪽 반원은 34칸 속도계.
    // 분류는 DIAL_KIND/DIAL_STEP 에 미리 구워두고 매 프레임에는 색만 고른다.
    const od = this.maxZ / MAX_ZVEL
    const speedLit = Math.min(1, v.vz / this.maxZ) * SPEED_STEPS
    const oxyPct = Math.max(0, Math.min(1, v.oxygen / FULL_TANK))
    const fuelPct = Math.max(0, Math.min(1, v.fuel / FULL_TANK))
    const oxyLit = Math.round(oxyPct * ARC_STEPS)
    const fuelLit = Math.round(fuelPct * ARC_STEPS)
    const blink = ((this.frame >> 2) & 1) === 0
    const oxyOn = oxyPct < 0.2 && blink ? rgba(255, 72, 72) : rgba(236, 72, 208)
    const fuelOn = fuelPct < 0.2 && blink ? rgba(255, 72, 72) : rgba(196, 16, 164)
    const gaugeOff = rgba(62, 0, 52)
    const ringGap = rgba(30, 0, 26)
    const hubC = rgba(126, 156, 148)
    const hubEdge = rgba(70, 92, 88)
    const speedGap = rgba(18, 6, 60)
    const speedOff = rgba(38, 24, 96)

    for (let dy = 0; dy < DIAL_H; dy++) {
      const py = DIAL_CY - DIAL_RY + dy
      if (py < 0 || py >= SCREEN_H) continue
      const rowBase = py * SCREEN_W
      const mapBase = dy * DIAL_W
      for (let dx = 0; dx < DIAL_W; dx++) {
        const kind = DIAL_KIND[mapBase + dx]
        if (kind === 0) continue
        const step = DIAL_STEP[mapBase + dx]
        let c: number
        switch (kind) {
          case 1: c = hubC; break
          case 2: c = hubEdge; break
          case 3: c = speedGap; break
          case 4: {
            if (step < speedLit) {
              const k = step / SPEED_STEPS
              // 오버드라이브가 붙을수록 눈금이 시안 → 주황으로 달아오른다
              const heat = Math.min(1, (od - 1) / OVERDRIVE_MAX)
              c = rgba(80 + k * 175, 210 - k * 60 - heat * 110, 255 - heat * 200)
            } else c = speedOff
            break
          }
          case 5: c = ringGap; break
          case 6: c = step < oxyLit ? oxyOn : gaugeOff; break
          default: c = step < fuelLit ? fuelOn : gaugeOff; break
        }
        const px = DIAL_CX - DIAL_RX + dx
        if (px >= 0 && px < SCREEN_W) r.buf[rowBase + px] = c
      }
    }

    drawText(r, DIAL_CX - 5, DIAL_CY - 8, 'O2', rgba(...LCD_TEXT))
    drawText(r, DIAL_CX - 11, DIAL_CY + 1, 'FUEL', rgba(...LCD_TEXT))
    drawText(r, DIAL_CX - 14, DIAL_CY + DIAL_RY - 4, 'SPEED', rgba(244, 244, 244), rgba(12, 12, 12))
  }

  private drawOverlay() {
    const r = this.raster
    const white = rgba(236, 236, 236)
    const dim = rgba(140, 152, 168)
    const black = rgba(0, 0, 0)

    drawText(r, 4, 3, this.planet.name, rgba(255, 224, 96), black)
    drawText(r, 4, 12, `DIST ${Math.floor(this.ship.v.z)}`, dim, black)
    const spd = Math.round((this.ship.v.vz / MAX_ZVEL) * 100)
    const spdMax = Math.round((this.maxZ / MAX_ZVEL) * 100)
    drawText(r, 4, 21, `SPD ${spd}/${spdMax}`, spd >= spdMax ? rgba(120, 240, 255) : dim, black)
    const sc = `SCORE ${Math.floor(this.score)}`
    drawText(r, SCREEN_W - 4 - textWidth(sc), 3, sc, white, black)

    if (!this.started) {
      this.banner(['SKYROADS', '', 'UP: THRUST   DOWN: BRAKE', 'LEFT / RIGHT: STEER', 'SPACE: JUMP', '', 'PRESS SPACE TO LAUNCH'], 46)
    } else if (this.paused) {
      this.banner(['PAUSED', '', 'PRESS P TO RESUME'], 62)
    } else if (this.deathReason && this.deadFrames > 12) {
      this.banner([this.deathReason, '', `SCORE ${Math.floor(this.score)}`, `DISTANCE ${Math.floor(this.ship.v.z)}`, '', 'PRESS R TO RETRY'], 40)
    }
  }

  private banner(lines: string[], y0: number) {
    const r = this.raster
    let w = 0
    for (const l of lines) w = Math.max(w, textWidth(l))
    const x0 = Math.round((SCREEN_W - w) / 2)
    const h = lines.length * 9 + 8
    r.rect(x0 - 8, y0 - 6, w + 16, h, rgba(0, 0, 0))
    for (let x = x0 - 8; x < x0 + w + 8; x++) { r.px(x, y0 - 6, rgba(200, 200, 208)); r.px(x, y0 - 7 + h, rgba(200, 200, 208)) }
    for (let y = y0 - 6; y < y0 - 6 + h; y++) { r.px(x0 - 8, y, rgba(200, 200, 208)); r.px(x0 + w + 7, y, rgba(200, 200, 208)) }
    lines.forEach((l, i) => {
      drawText(r, Math.round((SCREEN_W - textWidth(l)) / 2), y0 + i * 9, l, i === 0 ? rgba(255, 224, 96) : rgba(230, 230, 236))
    })
  }

  /* --- 사운드 (원작 SFX 를 흉내낸 간이 신스) ------------------------ */

  private initAudio() {
    if (this.audio || this.muted) return
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.audio = new AC()
    } catch { this.audio = null }
  }

  private blip(freq: number, dur: number, type: OscillatorType, gain: number) {
    if (this.muted || !this.audio) return
    const ac = this.audio
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, ac.currentTime)
    o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.4), ac.currentTime + dur)
    g.gain.setValueAtTime(gain, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur)
    o.connect(g).connect(ac.destination)
    o.start(); o.stop(ac.currentTime + dur + 0.02)
  }

  private noise(dur: number, gain: number) {
    if (this.muted || !this.audio) return
    const ac = this.audio
    const n = ac.sampleRate * dur
    const buf = ac.createBuffer(1, n, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
    const s = ac.createBufferSource()
    const g = ac.createGain()
    g.gain.value = gain
    s.buffer = buf
    s.connect(g).connect(ac.destination)
    s.start()
  }

  private chime() {
    if (this.muted || !this.audio) return
    ;[523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.09, 'square', 0.09), i * 55))
  }

  private engineSound() {
    if (this.muted || !this.audio || this.ship.v.state !== ShipState.Alive) { this.stopEngineSound(); return }
    const ac = this.audio
    if (!this.engineOsc) {
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.type = 'triangle'
      g.gain.value = 0
      o.connect(g).connect(ac.destination)
      o.start()
      this.engineOsc = o
      this.engineGain = g
    }
    const t = this.ship.v.vz / this.maxZ
    this.engineOsc.frequency.setTargetAtTime(48 + t * 92, ac.currentTime, 0.08)
    this.engineGain!.gain.setTargetAtTime(0.012 + t * 0.03, ac.currentTime, 0.1)
  }

  private stopEngineSound() {
    if (this.engineGain && this.audio) this.engineGain.gain.setTargetAtTime(0, this.audio.currentTime, 0.05)
  }
}

function heightOf(c: Cell): number {
  if (isEmptyCell(c)) return 0
  if (c.cube !== 0) return cubeHeight(c)
  if (c.tile !== 0) return GROUND_Y
  return 0
}
