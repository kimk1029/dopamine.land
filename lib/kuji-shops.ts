/**
 * /map 이 찍는 쿠지샵 좌표 목록.
 *
 * kujihub/server 에는 매장 엔드포인트가 없어서(=/api/shops 404) 이 파일이
 * 유일한 데이터 소스다. 나중에 DB/서버에서 받아오게 바꾸더라도 KujiShop
 * 형태만 맞추면 화면은 그대로 쓸 수 있다.
 *
 * 좌표는 매장 소개 페이지 기준의 대략값이라 실제 문 앞과 몇 미터 차이가 날 수
 * 있다. 매장이 바뀌면 여기만 고치면 된다.
 */

export type KujiShopCategory = 'kuji' | 'gacha' | 'crane' | 'mixed'

export interface KujiShop {
  id: string
  name: string
  /** 지도 마커에 찍히는 2~3글자 축약. 없으면 name 앞글자를 쓴다. */
  short?: string
  category: KujiShopCategory
  /** 도/시 단위 필터용 */
  region: string
  address: string
  lat: number
  lng: number
  hours?: string
  phone?: string
  /** 네이버 지도 앱/웹 검색으로 넘길 때 쓰는 질의어 */
  searchQuery?: string
}

export const SHOP_CATEGORY_LABEL: Record<KujiShopCategory, string> = {
  kuji: '쿠지',
  gacha: '가챠',
  crane: '크레인',
  mixed: '복합',
}

export const SHOP_CATEGORY_COLOR: Record<KujiShopCategory, string> = {
  kuji: '#ff00ff',
  gacha: '#00ffff',
  crane: '#ffe600',
  mixed: '#7cff6b',
}

export const KUJI_SHOPS: KujiShop[] = [
  {
    id: 'hongdae-animate',
    name: '애니메이트 홍대점',
    short: '애니',
    category: 'mixed',
    region: '서울',
    address: '서울 마포구 양화로 153',
    lat: 37.5559,
    lng: 126.9236,
    hours: '11:00 - 21:00',
    searchQuery: '애니메이트 홍대점',
  },
  {
    id: 'myeongdong-animate',
    name: '애니메이트 명동점',
    short: '애니',
    category: 'mixed',
    region: '서울',
    address: '서울 중구 명동8나길 27',
    lat: 37.5636,
    lng: 126.9838,
    hours: '11:00 - 21:00',
    searchQuery: '애니메이트 명동점',
  },
  {
    id: 'gangnam-figure',
    name: '강남 피규어존',
    short: '강남',
    category: 'kuji',
    region: '서울',
    address: '서울 강남구 강남대로 지하 396',
    lat: 37.4979,
    lng: 127.0276,
    hours: '10:00 - 22:00',
    searchQuery: '강남역 피규어샵',
  },
  {
    id: 'yongsan-ipark',
    name: '용산 아이파크몰 완구존',
    short: '용산',
    category: 'mixed',
    region: '서울',
    address: '서울 용산구 한강대로23길 55',
    lat: 37.5299,
    lng: 126.9648,
    hours: '10:30 - 22:00',
    searchQuery: '용산 아이파크몰 피규어',
  },
  {
    id: 'sindorim-dcube',
    name: '신도림 디큐브 가챠샵',
    short: '신도',
    category: 'gacha',
    region: '서울',
    address: '서울 구로구 경인로 662',
    lat: 37.5089,
    lng: 126.8893,
    hours: '10:30 - 22:00',
    searchQuery: '신도림 디큐브시티 가챠',
  },
  {
    id: 'jamsil-lotte',
    name: '잠실 롯데월드몰 캐릭터존',
    short: '잠실',
    category: 'mixed',
    region: '서울',
    address: '서울 송파구 올림픽로 300',
    lat: 37.5133,
    lng: 127.1028,
    hours: '10:30 - 22:00',
    searchQuery: '롯데월드몰 캐릭터샵',
  },
  {
    id: 'bupyeong-underground',
    name: '부평 지하상가 쿠지샵',
    short: '부평',
    category: 'kuji',
    region: '인천',
    address: '인천 부평구 부평문화로 42',
    lat: 37.4934,
    lng: 126.7229,
    hours: '11:00 - 21:00',
    searchQuery: '부평 지하상가 피규어',
  },
  {
    id: 'suwon-station',
    name: '수원역 애니샵',
    short: '수원',
    category: 'mixed',
    region: '경기',
    address: '경기 수원시 팔달구 덕영대로 924',
    lat: 37.2659,
    lng: 127.0002,
    hours: '11:00 - 21:30',
    searchQuery: '수원역 애니메이트',
  },
  {
    id: 'seomyeon-busan',
    name: '서면 애니메이트 부산점',
    short: '서면',
    category: 'mixed',
    region: '부산',
    address: '부산 부산진구 중앙대로 673',
    lat: 35.1578,
    lng: 129.0596,
    hours: '11:00 - 21:00',
    searchQuery: '애니메이트 부산점',
  },
  {
    id: 'daegu-dongseongro',
    name: '대구 동성로 가챠거리',
    short: '대구',
    category: 'gacha',
    region: '대구',
    address: '대구 중구 동성로2가',
    lat: 35.8693,
    lng: 128.5955,
    hours: '11:00 - 22:00',
    searchQuery: '대구 동성로 가챠샵',
  },
  {
    id: 'daejeon-eunhaeng',
    name: '대전 은행동 피규어샵',
    short: '대전',
    category: 'kuji',
    region: '대전',
    address: '대전 중구 중앙로 165',
    lat: 36.3286,
    lng: 127.4267,
    hours: '12:00 - 21:00',
    searchQuery: '대전 은행동 피규어샵',
  },
  {
    id: 'gwangju-chungjangro',
    name: '광주 충장로 애니샵',
    short: '광주',
    category: 'mixed',
    region: '광주',
    address: '광주 동구 충장로 83',
    lat: 35.1489,
    lng: 126.9163,
    hours: '12:00 - 21:00',
    searchQuery: '광주 충장로 애니샵',
  },
]

/** 지도 초기 중심(서울 시청). 목록이 비어 있을 때의 대비값이기도 하다. */
export const MAP_DEFAULT_CENTER = { lat: 37.5666, lng: 126.9784 }

export function listShopRegions(shops: KujiShop[] = KUJI_SHOPS): string[] {
  return Array.from(new Set(shops.map((shop) => shop.region)))
}
