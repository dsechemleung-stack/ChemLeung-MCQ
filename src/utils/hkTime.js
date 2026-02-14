export const HK_TIME_ZONE = 'Asia/Hong_Kong';

export function formatHKDateKey(dateLike = new Date()) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);

  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  return `${y}-${m}-${day}`;
}

export function getHKYearMonth(dateLike = new Date()) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(d);

  const y = Number(parts.find(p => p.type === 'year')?.value);
  const m = Number(parts.find(p => p.type === 'month')?.value);

  return { year: y, monthIndex: m - 1 };
}

export function getHKDateParts(dateLike = new Date()) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);

  const y = Number(parts.find(p => p.type === 'year')?.value);
  const m = Number(parts.find(p => p.type === 'month')?.value);
  const day = Number(parts.find(p => p.type === 'day')?.value);

  return { year: y, monthIndex: m - 1, day };
}

export function getHKWeekdayIndex(dateLike = new Date()) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const wk = new Intl.DateTimeFormat('en-US', {
    timeZone: HK_TIME_ZONE,
    weekday: 'short'
  }).format(d);

  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wk] ?? 0;
}

export function parseHKDateKey(dateKey) {
  if (!dateKey) return null;
  const [y, m, d] = String(dateKey).split('-').map(Number);
  if (!y || !m || !d) return null;
  return makeHKDate(y, m - 1, d);
}

export function makeHKDate(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));
}
