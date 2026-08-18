/**
 * 네이버 지도 JS API v3 최소 타입.
 *
 * 공식 @types 패키지가 없어서 /map 이 실제로 부르는 것만 선언해 둔다.
 * 새 기능을 쓰게 되면 여기에 추가하면 된다.
 */
declare namespace naver.maps {
  class LatLng {
    constructor(lat: number, lng: number)
    lat(): number
    lng(): number
  }

  class LatLngBounds {
    constructor()
    extend(latlng: LatLng): LatLngBounds
  }

  class Point {
    constructor(x: number, y: number)
  }

  class Size {
    constructor(width: number, height: number)
  }

  interface MapOptions {
    center?: LatLng
    zoom?: number
    minZoom?: number
    maxZoom?: number
    zoomControl?: boolean
    zoomControlOptions?: { position?: number; style?: number }
    mapDataControl?: boolean
    scaleControl?: boolean
    logoControlOptions?: { position?: number }
    mapTypeControl?: boolean
    /** true 면 지도 위에서 휠 스크롤이 페이지 스크롤 대신 확대/축소로 간다. */
    scrollWheel?: boolean
    tileTransition?: boolean
  }

  class Map {
    constructor(element: HTMLElement | string, options?: MapOptions)
    setCenter(latlng: LatLng): void
    setZoom(zoom: number, useEffect?: boolean): void
    getZoom(): number
    panTo(latlng: LatLng, options?: { duration?: number }): void
    fitBounds(bounds: LatLngBounds, margin?: { top?: number; right?: number; bottom?: number; left?: number }): void
    destroy(): void
  }

  interface MarkerIcon {
    content?: string
    anchor?: Point
    size?: Size
    url?: string
  }

  interface MarkerOptions {
    position: LatLng
    map?: Map
    icon?: MarkerIcon
    title?: string
    zIndex?: number
  }

  class Marker {
    constructor(options: MarkerOptions)
    setMap(map: Map | null): void
    setIcon(icon: MarkerIcon): void
    setZIndex(zIndex: number): void
    getPosition(): LatLng
  }

  interface InfoWindowOptions {
    content: string | HTMLElement
    borderWidth?: number
    borderColor?: string
    backgroundColor?: string
    disableAnchor?: boolean
    pixelOffset?: Point
    maxWidth?: number
  }

  class InfoWindow {
    constructor(options: InfoWindowOptions)
    open(map: Map, anchor?: Marker | LatLng): void
    close(): void
    getMap(): Map | null
    setContent(content: string | HTMLElement): void
  }

  namespace Event {
    function addListener(
      target: object,
      eventName: string,
      listener: (...args: unknown[]) => void
    ): unknown
    function removeListener(listener: unknown): void
  }

  namespace Position {
    const TOP_RIGHT: number
    const RIGHT_CENTER: number
    const BOTTOM_RIGHT: number
  }
}

interface Window {
  naver?: typeof naver
}
