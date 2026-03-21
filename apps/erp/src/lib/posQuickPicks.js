/** Shared with POS terminal + POS dashboard (same localStorage). */
export const QUICK_PICK_STORAGE_KEY = 'cosmos-pos-quick-picks-v1';
export const MAX_QUICK_PICKS = 12;

export function readQuickPickIdsFromStorage() {
  try {
    const raw = localStorage.getItem(QUICK_PICK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === 'string').slice(0, MAX_QUICK_PICKS);
  } catch {
    return [];
  }
}

export function writeQuickPickIdsToStorage(ids) {
  try {
    localStorage.setItem(QUICK_PICK_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}
