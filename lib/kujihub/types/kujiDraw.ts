export interface KujiListItem {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  price: number;
  boardSize: number;
  remaining: number;
  status: 'active' | 'sold_out' | 'draft';
}

export interface KujiPrizeItem {
  id: string;
  grade: string;
  name: string;
  color: string;
  chance: number;
  displayOrder: number;
  totalCount: number;
  remainingCount: number;
  usedCount: number;
}

export interface KujiDetail extends KujiListItem {
  prizes: KujiPrizeItem[];
}

export interface KujiPlayer {
  id: string;
  nickname: string;
  points: number;
  role?: string;
  earnedToday?: boolean;
}

export interface KujiPurchase {
  id: string;
  kujiId: string;
  playerId: string;
  quantity: number;
  totalPrice: number;
  status: string;
  selectedSlots: number[];
  results: KujiReserveResult[];
}

export interface KujiPurchaseResponse {
  purchase: KujiPurchase;
  player: KujiPlayer;
  kuji: {
    id: string;
    title: string;
    price: number;
    remaining: number;
  };
}

export interface KujiBoardResponse {
  kujiId: string;
  slots: Record<string, { status: 'locked' | 'drawn'; grade?: string; color?: string; name?: string }>;
}

export interface KujiReserveResult {
  slotNumber: number;
  grade: string;
  name: string;
  color: string;
}
