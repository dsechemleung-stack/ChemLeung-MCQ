const STORAGE_KEY = 'debug_time_travel_offset_days';
const DEBUG_FLAG_KEY = 'debug_srs';

function isTimeTravelEnabled() {
  try {
    return localStorage.getItem(DEBUG_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

export function getTimeTravelOffsetDays() {
  if (!isTimeTravelEnabled()) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return 0;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function setTimeTravelOffsetDays(days) {
  if (!isTimeTravelEnabled()) return;
  try {
    localStorage.setItem(STORAGE_KEY, String(Number(days) || 0));
  } catch {
    // ignore
  }
}

export function resetTimeTravel() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getNow() {
  const now = new Date();
  const offsetDays = getTimeTravelOffsetDays();
  if (!offsetDays) return now;
  const shifted = new Date(now);
  shifted.setDate(shifted.getDate() + offsetDays);
  return shifted;
}

export function getTodayDateStr() {
  return getNow().toISOString().split('T')[0];
}
