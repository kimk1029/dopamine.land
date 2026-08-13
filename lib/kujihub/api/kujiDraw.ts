import { api } from './client';
import type {
  KujiBoardResponse,
  KujiDetail,
  KujiListItem,
  KujiPlayer,
  KujiPurchaseResponse,
  KujiReserveResult,
} from '../types/kujiDraw';

const PLAYER_KEY = 'kujihub_kuji_player_id';

function getPlayerId() {
  // Next는 이 모듈을 서버에서도 평가할 수 있어 window 접근을 막아둔다.
  // 서버에서 반환되는 빈 문자열로는 요청을 보내지 않도록 호출부가 모두
  // 클라이언트 컴포넌트/이펙트 안에 있다.
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(PLAYER_KEY);
  if (existing) return existing;
  const created = `web_guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(PLAYER_KEY, created);
  return created;
}

export async function ensureKujiPlayer(nickname?: string): Promise<KujiPlayer> {
  const { data } = await api.post<KujiPlayer>('/api/kujis/player/ensure', {
    playerId: getPlayerId(),
    nickname: nickname || '웹 게스트',
  });
  return data;
}

export const kujiDrawApi = {
  getList: () => api.get<KujiListItem[]>('/api/kujis').then((r) => r.data),
  getOne: (id: string) => api.get<KujiDetail>(`/api/kujis/${id}`).then((r) => r.data),
  getBoard: (id: string) => api.get<KujiBoardResponse>(`/api/kujis/${id}/board`).then((r) => r.data),
  createPurchase: (id: string, quantity: number, playerId: string) =>
    api.post<KujiPurchaseResponse>(`/api/kujis/${id}/purchase`, { quantity, playerId }).then((r) => r.data),
  reserve: (id: string, slots: number[], playerId: string, purchaseId: string) =>
    api
      .post<{ results: Array<{ slot: number; grade: string; name: string; color: string }> }>(`/api/kujis/${id}/reserve`, {
        slots,
        userId: playerId,
        purchaseId,
      })
      .then((r) =>
        r.data.results.map((item) => ({
          slotNumber: item.slot,
          grade: item.grade,
          name: item.name,
          color: item.color,
        })) as KujiReserveResult[]
      ),
  complete: (id: string, purchaseId: string, slots: number[]) =>
    api.post(`/api/kujis/${id}/complete`, { purchaseId, slots }).then((r) => r.data),
  getPlayerId,
};
