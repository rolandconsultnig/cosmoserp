export function getOrCreateDeviceId() {
  const key = 'posDeviceId';
  let v = localStorage.getItem(key);
  if (v) return v;
  v = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `dev_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
  localStorage.setItem(key, v);
  return v;
}

export async function getOfflineSaleRecord(offlineId) {
  if (!offlineId) return null;
  return withStore('readonly', (store) => requestToPromise(store.get(offlineId)));
}

function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function openDb() {
  const req = indexedDB.open('cosmos_pos', 1);
  req.onupgradeneeded = () => {
    const db = req.result;
    const store = db.createObjectStore('offline_sales', { keyPath: 'offlineId' });
    store.createIndex('status', 'status', { unique: false });
    store.createIndex('createdAt', 'createdAt', { unique: false });
  };
  return requestToPromise(req);
}

async function withStore(mode, fn) {
  const db = await openDb();
  try {
    const tx = db.transaction('offline_sales', mode);
    const store = tx.objectStore('offline_sales');
    const result = await fn(store);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return result;
  } finally {
    db.close();
  }
}

export async function enqueueOfflineSale(payload) {
  const offlineId = payload?.offlineId;
  if (!offlineId) {
    throw new Error('offlineId is required');
  }
  const record = {
    offlineId,
    status: 'PENDING',
    attempts: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
    payload,
  };

  await withStore('readwrite', (store) => requestToPromise(store.put(record)));
  return record;
}

export async function getPendingOfflineSales(limit = 25) {
  return withStore('readonly', async (store) => {
    const idx = store.index('status');
    const req = idx.getAll('PENDING');
    const all = await requestToPromise(req);
    const sorted = (all || []).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    return sorted.slice(0, limit);
  });
}

export async function getPendingOfflineSalesCount() {
  const rows = await getPendingOfflineSales(10_000);
  return rows.length;
}

export async function markOfflineSaleSynced(offlineId, serverId) {
  await withStore('readwrite', async (store) => {
    const existing = await requestToPromise(store.get(offlineId));
    if (!existing) return;
    existing.status = 'SYNCED';
    existing.syncedAt = new Date().toISOString();
    existing.serverId = serverId || null;
    await requestToPromise(store.put(existing));
  });
}

export async function markOfflineSaleFailed(offlineId, errorMessage) {
  await withStore('readwrite', async (store) => {
    const existing = await requestToPromise(store.get(offlineId));
    if (!existing) return;
    existing.attempts = (existing.attempts || 0) + 1;
    existing.lastError = errorMessage || 'Sync failed';
    await requestToPromise(store.put(existing));
  });
}

export async function syncOfflineSalesOnce(api, { deviceId, terminalId, limit = 10 } = {}) {
  if (!navigator.onLine) {
    return { ok: false, reason: 'offline', synced: 0, skipped: 0 };
  }

  const pending = await getPendingOfflineSales(limit);
  if (!pending.length) {
    return { ok: true, synced: 0, skipped: 0 };
  }

  const sales = pending.map((r) => ({
    ...r.payload,
    offline: true,
    offlineId: r.offlineId,
    deviceId: deviceId || r.payload?.deviceId || null,
    terminalId: terminalId || r.payload?.terminalId || null,
  }));

  const res = await api.post('/pos/offline-sync', { sales });
  const results = res?.data?.data || [];

  let synced = 0;
  let skipped = 0;

  const byOfflineId = new Map(results.map((x) => [x.offlineId, x]));

  for (const r of pending) {
    const item = byOfflineId.get(r.offlineId);
    if (!item) continue;
    if (item.status === 'synced' || item.status === 'skipped_existing') {
      await markOfflineSaleSynced(r.offlineId, item.id);
      if (item.status === 'synced') synced += 1;
      else skipped += 1;
    }
  }

  return { ok: true, synced, skipped, total: pending.length };
}
