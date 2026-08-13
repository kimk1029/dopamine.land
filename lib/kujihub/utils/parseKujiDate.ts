const DATE_FULL_REG = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
const DATE_MONTH_REG = /(\d{4})年(\d{1,2})月/;

export function parseKujiDateString(str: string | undefined): string | null {
  if (!str || typeof str !== 'string') return null;
  // Full date: YYYY年MM月DD日
  const full = str.match(DATE_FULL_REG);
  if (full) {
    const [, y, mo, d] = full;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Month-only: YYYY年M月 (e.g. gacha sites) → map to day 1
  const monthOnly = str.match(DATE_MONTH_REG);
  if (monthOnly) {
    const [, y, mo] = monthOnly;
    return `${y}-${mo.padStart(2, '0')}-01`;
  }
  return null;
}
