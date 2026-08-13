import { api } from './client';
import { parseKujiDateString } from '../utils/parseKujiDate';
import type { KujiLineupMonth, KujiLineupItem, ScheduleByDate } from '../types/kuji';

export interface CustomLineupPayload {
  brand: string;
  title: string;
  imageUrl?: string;
  storeDate?: string;
  onlineDate?: string;
  url?: string;
  submittedBy?: string;
  year: number;
  month: number;
}

export async function addCustomLineup(payload: CustomLineupPayload): Promise<KujiLineupItem> {
  const { data } = await api.post('/api/lineup-custom', payload);
  return data;
}

export async function deleteCustomLineup(id: number): Promise<void> {
  await api.delete(`/api/lineup-custom/${id}`);
}

export async function fetchLineup(year: number, month: number): Promise<KujiLineupMonth> {
  const { data } = await api.get<KujiLineupMonth>('/api/kuji-lineup', { params: { year, month } });
  return data;
}

export function buildScheduleByDate(monthData: KujiLineupMonth): ScheduleByDate {
  const byDate: ScheduleByDate = {};
  for (const item of monthData.items) {
    const storeDate = parseKujiDateString(item.storeDate);
    if (storeDate) {
      if (!byDate[storeDate]) byDate[storeDate] = [];
      byDate[storeDate].push({
        date: storeDate,
        type: 'store',
        label: item.storeDate || '',
        item,
      });
    }
    const onlineDate = parseKujiDateString(item.onlineDate);
    if (onlineDate) {
      if (!byDate[onlineDate]) byDate[onlineDate] = [];
      byDate[onlineDate].push({
        date: onlineDate,
        type: 'online',
        label: item.onlineDate || '',
        item,
      });
    }
  }
  return byDate;
}
