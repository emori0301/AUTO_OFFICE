import IORedis from 'ioredis';

// In-memory fallback
const mem = new Map<string, { v: string; exp?: number }>();

const memCache = {
  async get(key: string): Promise<string | null> {
    const e = mem.get(key);
    if (!e) return null;
    if (e.exp && e.exp < Date.now()) { mem.delete(key); return null; }
    return e.v;
  },
  async set(key: string, value: string, ttl?: number): Promise<void> {
    mem.set(key, { v: value, exp: ttl ? Date.now() + ttl * 1000 : undefined });
  },
  async del(key: string): Promise<void> { mem.delete(key); },
};

let redis: IORedis | null = null;
let redisReady = false;

if (process.env.REDIS_URL) {
  redis = new IORedis(process.env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
  redis.connect()
    .then(() => { redisReady = true; console.log('[cache] Redis connected'); })
    .catch(() => console.warn('[cache] Redis unavailable — using in-memory fallback'));
  redis.on('error', () => { redisReady = false; });
}

export const cache = {
  async get(key: string): Promise<string | null> {
    if (redisReady && redis) {
      try { return await redis.get(key); } catch { /* fall through */ }
    }
    return memCache.get(key);
  },
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (redisReady && redis) {
      try {
        ttl ? await redis.set(key, value, 'EX', ttl) : await redis.set(key, value);
        return;
      } catch { /* fall through */ }
    }
    await memCache.set(key, value, ttl);
  },
  async del(key: string): Promise<void> {
    if (redisReady && redis) {
      try { await redis.del(key); return; } catch { /* fall through */ }
    }
    await memCache.del(key);
  },
};
