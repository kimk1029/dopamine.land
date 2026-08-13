export interface KujiLineupItem {
  title: string;
  slug: string;
  url: string;
  image?: string;
  storeDate?: string;
  onlineDate?: string;
  translatedTitle?: string;
  translatedStoreDate?: string;
  translatedOnlineDate?: string;
  /** 데이터 출처: 이치방쿠지 크롤링 or 직접 등록 */
  source?: 'ichiban' | 'custom';
  /** 쿠지 브랜드명 */
  brand?: string;
  /** 커스텀 항목 DB ID (삭제 시 사용) */
  customId?: number;
  /** 제보자 */
  submittedBy?: string;
  /** 카테고리: 쿠지 / 가챠 / 크레인 */
  category?: 'kuji' | 'gacha' | 'crane';
}

export interface KujiLineupMonth {
  year: number;
  month: number;
  items: KujiLineupItem[];
  translationProvider?: 'papago' | 'fallback';
  /** 지원 브랜드 목록 */
  brands?: string[];
}

export interface ScheduleEntry {
  date: string;
  type: 'store' | 'online';
  label: string;
  item: KujiLineupItem;
}

export type ScheduleByDate = Record<string, ScheduleEntry[]>;
