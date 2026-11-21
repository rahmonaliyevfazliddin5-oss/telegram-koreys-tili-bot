const memoryCache = new Map();

export async function fetchWithCache(key, fetcher, ttlMs = 60000) {
  const cached = memoryCache.get(key);
  const now = Date.now();

  if (cached && (now - cached.timestamp < ttlMs)) {
    return cached.data;
  }

  try {
    const data = await fetcher();
    memoryCache.set(key, { data, timestamp: now });
    return data;
  } catch (err) {
    if (cached) {
      console.warn("Serving stale cache on error for key:", key);
      return cached.data;
    }
    throw err;
  }
}

export function invalidateCache(keyPrefix) {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  for (const k of memoryCache.keys()) {
    if (k.startsWith(keyPrefix)) {
      memoryCache.delete(k);
    }
  }
}
