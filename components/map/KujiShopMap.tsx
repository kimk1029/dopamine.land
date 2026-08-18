'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArcadeBox } from '@/components/arcade'
import {
  KUJI_SHOPS,
  MAP_DEFAULT_CENTER,
  SHOP_CATEGORY_COLOR,
  SHOP_CATEGORY_LABEL,
  listShopRegions,
  type KujiShop,
  type KujiShopCategory,
} from '@/lib/kuji-shops'
import { useNaverMaps } from './useNaverMaps'

type CategoryFilter = KujiShopCategory | 'all'

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'kuji', label: SHOP_CATEGORY_LABEL.kuji },
  { value: 'gacha', label: SHOP_CATEGORY_LABEL.gacha },
  { value: 'crane', label: SHOP_CATEGORY_LABEL.crane },
  { value: 'mixed', label: SHOP_CATEGORY_LABEL.mixed },
]

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string
  )

const markerLabel = (shop: KujiShop) => shop.short || shop.name.slice(0, 2)

/** 네이버 지도 검색 링크. 앱이 깔려 있으면 앱으로, 아니면 웹으로 열린다. */
const naverMapLink = (shop: KujiShop) =>
  `https://map.naver.com/p/search/${encodeURIComponent(shop.searchQuery || shop.name)}`

/**
 * 마커는 기본 핀 대신 픽셀 박스로 그린다. 사이트 전체가 아케이드 톤이라
 * 기본 핀을 쓰면 지도만 따로 노는 느낌이 나서다.
 */
const markerContent = (shop: KujiShop, active: boolean) => {
  const color = SHOP_CATEGORY_COLOR[shop.category]
  return `
    <div style="
      transform: translate(-50%, -100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      filter: drop-shadow(0 0 ${active ? '10px' : '4px'} ${color});
    ">
      <div style="
        padding: ${active ? '7px 12px' : '5px 9px'};
        border: 3px solid ${color};
        background: rgba(0,0,0,${active ? '0.95' : '0.82'});
        color: ${color};
        font-weight: 900;
        font-size: ${active ? '0.82rem' : '0.72rem'};
        letter-spacing: 0.04em;
        white-space: nowrap;
        line-height: 1;
      ">${escapeHtml(markerLabel(shop))}</div>
      <div style="
        width: 0; height: 0;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: 9px solid ${color};
      "></div>
    </div>
  `
}

const infoWindowContent = (shop: KujiShop) => {
  const color = SHOP_CATEGORY_COLOR[shop.category]
  return `
    <div style="
      min-width: 220px;
      max-width: 280px;
      padding: 14px;
      border: 3px solid ${color};
      background: rgba(4, 4, 12, 0.96);
      color: #fff;
      box-shadow: 0 0 22px rgba(0,0,0,0.6);
    ">
      <div style="color:${color}; font-size:0.62rem; font-weight:900; letter-spacing:0.08em; margin-bottom:6px;">
        ${escapeHtml(SHOP_CATEGORY_LABEL[shop.category])} · ${escapeHtml(shop.region)}
      </div>
      <div style="font-size:1rem; font-weight:900; margin-bottom:8px;">${escapeHtml(shop.name)}</div>
      <div style="font-size:0.8rem; opacity:0.82; line-height:1.5;">${escapeHtml(shop.address)}</div>
      ${shop.hours ? `<div style="font-size:0.78rem; opacity:0.7; margin-top:4px;">⏰ ${escapeHtml(shop.hours)}</div>` : ''}
      ${shop.phone ? `<div style="font-size:0.78rem; opacity:0.7; margin-top:2px;">☎ ${escapeHtml(shop.phone)}</div>` : ''}
      <a href="${escapeHtml(naverMapLink(shop))}" target="_blank" rel="noopener noreferrer"
        style="display:inline-block; margin-top:12px; padding:7px 12px; border:2px solid ${color}; color:${color}; font-size:0.72rem; font-weight:900; text-decoration:none;">
        네이버 지도에서 열기 →
      </a>
    </div>
  `
}

export default function KujiShopMap() {
  const status = useNaverMaps()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<naver.maps.Map | null>(null)
  const markersRef = useRef<Map<string, naver.maps.Marker>>(new Map())
  const infoWindowRef = useRef<naver.maps.InfoWindow | null>(null)

  const [category, setCategory] = useState<CategoryFilter>('all')
  const [region, setRegion] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const regions = useMemo(() => listShopRegions(), [])
  const shops = useMemo(
    () =>
      KUJI_SHOPS.filter(
        (shop) =>
          (category === 'all' || shop.category === category) &&
          (region === 'all' || shop.region === region)
      ),
    [category, region]
  )

  // 지도 인스턴스는 한 번만 만든다. 필터가 바뀌어도 재생성하지 않는다.
  useEffect(() => {
    if (status !== 'ready' || !containerRef.current || mapRef.current) return
    const { naver } = window
    if (!naver) return

    mapRef.current = new naver.maps.Map(containerRef.current, {
      center: new naver.maps.LatLng(MAP_DEFAULT_CENTER.lat, MAP_DEFAULT_CENTER.lng),
      zoom: 7,
      minZoom: 6,
      zoomControl: true,
      zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT },
      mapDataControl: false,
      scaleControl: false,
    })
    infoWindowRef.current = new naver.maps.InfoWindow({
      content: '',
      borderWidth: 0,
      backgroundColor: 'transparent',
      disableAnchor: true,
      pixelOffset: new naver.maps.Point(0, -12),
    })

    return () => {
      infoWindowRef.current?.close()
      infoWindowRef.current = null
      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current.clear()
      mapRef.current?.destroy()
      mapRef.current = null
    }
  }, [status])

  // 필터 결과에 맞춰 마커를 다시 깔고, 보이는 매장이 다 들어오게 화면을 맞춘다.
  useEffect(() => {
    const map = mapRef.current
    const { naver } = window
    if (status !== 'ready' || !map || !naver) return

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current.clear()
    infoWindowRef.current?.close()

    const bounds = new naver.maps.LatLngBounds()
    shops.forEach((shop) => {
      const position = new naver.maps.LatLng(shop.lat, shop.lng)
      const marker = new naver.maps.Marker({
        position,
        map,
        title: shop.name,
        icon: { content: markerContent(shop, false), anchor: new naver.maps.Point(0, 0) },
      })
      naver.maps.Event.addListener(marker, 'click', () => setSelectedId(shop.id))
      markersRef.current.set(shop.id, marker)
      bounds.extend(position)
    })

    if (shops.length > 1) {
      map.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 })
    } else if (shops.length === 1) {
      map.setCenter(new naver.maps.LatLng(shops[0].lat, shops[0].lng))
      map.setZoom(15)
    }

    // 필터에서 빠진 매장이 선택돼 있으면 선택을 푼다.
    setSelectedId((current) =>
      current && shops.some((shop) => shop.id === current) ? current : null
    )
  }, [shops, status])

  // 선택된 매장 강조 + 정보창. 마커 클릭과 목록 클릭이 같은 경로를 타게 한다.
  useEffect(() => {
    const map = mapRef.current
    const infoWindow = infoWindowRef.current
    const { naver } = window
    if (status !== 'ready' || !map || !infoWindow || !naver) return

    shops.forEach((shop) => {
      const marker = markersRef.current.get(shop.id)
      if (!marker) return
      const active = shop.id === selectedId
      marker.setIcon({
        content: markerContent(shop, active),
        anchor: new naver.maps.Point(0, 0),
      })
      marker.setZIndex(active ? 100 : 1)
    })

    const selected = shops.find((shop) => shop.id === selectedId)
    if (!selected) {
      infoWindow.close()
      return
    }

    const marker = markersRef.current.get(selected.id)
    infoWindow.setContent(infoWindowContent(selected))
    if (marker) infoWindow.open(map, marker)
    map.panTo(new naver.maps.LatLng(selected.lat, selected.lng))
  }, [selectedId, shops, status])

  return (
    <div className="animate-in kuji-map-page">
      <header className="page-header kuji-map-header">
        <div>
          <h1
            style={{
              color: 'var(--arcade-secondary)',
              fontSize: '2rem',
              marginBottom: '10px',
              fontWeight: 900,
            }}
          >
            KUJI SHOP MAP
          </h1>
          <p style={{ color: '#fff', fontSize: '0.9rem', opacity: 0.8, fontWeight: 500 }}>
            전국 쿠지 · 가챠 매장 {KUJI_SHOPS.length}곳. 마커를 누르면 상세가 열립니다.
          </p>
        </div>
        <ArcadeBox label="ON MAP" variant="accent" isChunky={false} className="kuji-map-count">
          <div style={{ fontSize: '1.25rem', color: 'var(--arcade-accent)', fontWeight: 900 }}>
            {shops.length} SHOPS
          </div>
        </ArcadeBox>
      </header>

      <div className="kuji-map-filters">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {CATEGORY_FILTERS.map((filter) => {
            const active = filter.value === category
            const color =
              filter.value === 'all'
                ? 'var(--arcade-primary)'
                : SHOP_CATEGORY_COLOR[filter.value]
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setCategory(filter.value)}
                style={{
                  padding: '8px 14px',
                  border: `2px solid ${color}`,
                  background: active ? color : 'rgba(0,0,0,0.6)',
                  color: active ? '#05050c' : color,
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                {filter.label}
              </button>
            )
          })}
        </div>

        <select
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          aria-label="지역 선택"
          style={{
            padding: '9px 12px',
            border: '2px solid var(--arcade-secondary)',
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            fontWeight: 900,
            fontSize: '0.78rem',
          }}
        >
          <option value="all">전체 지역</option>
          {regions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="kuji-map-body">
        <aside className="kuji-map-list">
          {shops.length === 0 && (
            <div style={{ padding: '20px', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
              조건에 맞는 매장이 없습니다.
            </div>
          )}
          {shops.map((shop) => {
            const active = shop.id === selectedId
            const color = SHOP_CATEGORY_COLOR[shop.category]
            return (
              <button
                key={shop.id}
                type="button"
                onClick={() => setSelectedId(shop.id)}
                className="kuji-map-list-item"
                style={{
                  borderColor: active ? color : 'rgba(255,255,255,0.16)',
                  background: active ? 'rgba(255,0,255,0.12)' : 'rgba(0,0,0,0.5)',
                }}
              >
                <span
                  className="kuji-map-list-badge"
                  style={{ borderColor: color, color }}
                >
                  {markerLabel(shop)}
                </span>
                <span style={{ minWidth: 0, display: 'block' }}>
                  <span
                    style={{
                      display: 'block',
                      color: '#fff',
                      fontWeight: 900,
                      fontSize: '0.9rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {shop.name}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      color: 'rgba(255,255,255,0.66)',
                      fontSize: '0.75rem',
                      marginTop: '3px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {shop.region} · {SHOP_CATEGORY_LABEL[shop.category]}
                  </span>
                </span>
              </button>
            )
          })}
        </aside>

        <div className="kuji-map-canvas">
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

          {status !== 'ready' && (
            <div className="kuji-map-overlay">
              {status === 'loading' && (
                <div className="blink" style={{ color: 'var(--arcade-primary)', fontWeight: 900 }}>
                  LOADING MAP...
                </div>
              )}
              {status === 'error' && (
                <div style={{ color: 'var(--error, #ff4d4d)', fontWeight: 900, textAlign: 'center' }}>
                  지도를 불러오지 못했습니다.
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', opacity: 0.8, fontWeight: 500 }}>
                    네이버 클라우드 콘솔에서 이 도메인이 등록돼 있는지 확인해 주세요.
                  </div>
                </div>
              )}
              {status === 'missing-key' && (
                <div style={{ textAlign: 'center', maxWidth: '420px', padding: '24px' }}>
                  <div style={{ color: 'var(--arcade-accent)', fontWeight: 900, marginBottom: '10px' }}>
                    NAVER MAP KEY 없음
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.82rem', lineHeight: 1.6 }}>
                    <code>.env.local</code> 에{' '}
                    <code>NEXT_PUBLIC_NAVER_MAP_CLIENT_ID</code> 를 넣고 서버를 다시 띄우면
                    지도가 표시됩니다. 네이버 클라우드 플랫폼 &gt; Maps &gt; Web Dynamic Map
                    에서 발급받은 값이며, 소셜 로그인용 키와는 다릅니다.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
