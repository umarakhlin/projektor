import { createClient } from "redis";

type RedisConn = ReturnType<typeof createClient>;

const store = new Map<string, { count: number; resetAt: number }>();
const CLEANUP_INTERVAL = 60_000; // 1 min
const REDIS_KEY_PREFIX = "rate_limit:";
let redisClient: RedisConn | null = null;
let redisConnectPromise: Promise<RedisConn | null> | null = null;

function cleanup() {
  const now = Date.now();
  for (const [key, val] of store.entries()) {
    if (val.resetAt < now) store.delete(key);
  }
}
setInterval(cleanup, CLEANUP_INTERVAL);

function getRedisUrl(): string | null {
  const raw = process.env.REDIS_URL?.trim();
  return raw ? raw : null;
}

async function getRedisClient(): Promise<RedisConn | null> {
  const url = getRedisUrl();
  if (!url) return null;
  if (redisClient?.isOpen) return redisClient;
  if (redisConnectPromise) return redisConnectPromise;

  const client = createClient({ url });
  client.on("error", (err) => {
    console.error("Redis rate-limit error:", err);
  });
  redisConnectPromise = client.connect().then(() => {
    redisClient = client;
    redisConnectPromise = null;
    return client;
  }).catch((err) => {
    redisConnectPromise = null;
    console.error("Redis connection failed, using memory rate-limit:", err);
    return null;
  });
  return redisConnectPromise;
}

function rateLimitMemory(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  entry.count++;
  return { ok: true, remaining: limit - entry.count };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; remaining: number }> {
  const redis = await getRedisClient();
  if (!redis) {
    return rateLimitMemory(key, limit, windowMs);
  }

  const redisKey = `${REDIS_KEY_PREFIX}${key}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.pExpire(redisKey, windowMs);
    }
    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count)
    };
  } catch (err) {
    console.error("Redis rate-limit command failed, using memory fallback:", err);
    return rateLimitMemory(key, limit, windowMs);
  }
}

export function getRateLimitKey(identifier: string, action: string): string {
  return `${action}:${identifier}`;
}

export function getClientId(req: Request, userId?: string | null): string {
  if (userId) return userId;
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return (forwarded?.split(",")[0]?.trim() || realIp || "unknown").slice(0, 64);
}
