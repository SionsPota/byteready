interface CacheEntry<T> {
  data: T
  ts: number
  etag?: string
}

const memoryCache = new Map<string, CacheEntry<unknown>>()

const CACHE_PREFIX = 'br_api_cache::'

function cacheKey(input: RequestInfo | URL, init?: RequestInit): string {
  const url = typeof input === 'string' ? input : input.toString()
  if (!init || !init.body) return url
  // 简单 body 哈希：对 POST 等带 body 的请求做区分
  const bodyHash = String(init.body).slice(0, 200)
  return `${url}::${init.method || 'GET'}::${bodyHash}`
}

function isCacheable(init?: RequestInit): boolean {
  const method = (init?.method || 'GET').toUpperCase()
  return method === 'GET' || method === 'HEAD'
}

function readLocal(key: string): CacheEntry<unknown> | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    return JSON.parse(raw) as CacheEntry<unknown>
  } catch {
    return null
  }
}

function writeLocal(key: string, entry: CacheEntry<unknown>): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // localStorage 满时静默失败
  }
}

function removeLocal(key: string): void {
  localStorage.removeItem(CACHE_PREFIX + key)
}

export interface ApiOptions extends RequestInit {
  ttl?: number          // 缓存有效期(ms)，默认 30000(30s)
  persist?: boolean     // 是否持久化到 localStorage，默认 false
  skipCache?: boolean   // 是否跳过读取缓存，默认 false
  background?: boolean  // 是否在后台静默刷新（不触发 loading），默认 false
}

export interface ApiResult<T> {
  data: T
  fromCache: boolean
  status: number
}

/** 带缓存的 fetch 包装器 */
export async function apiFetch<T>(
  input: RequestInfo | URL,
  options: ApiOptions = {},
): Promise<ApiResult<T>> {
  const key = cacheKey(input, options)
  const ttl = options.ttl ?? 30_000
  const now = Date.now()

  // 非 GET 请求不走读缓存逻辑
  const canRead = isCacheable(options) && !options.skipCache

  if (canRead) {
    // 先查内存
    const mem = memoryCache.get(key)
    if (mem && now - mem.ts < ttl) {
      return { data: mem.data as T, fromCache: true, status: 200 }
    }
    // 再查 localStorage
    if (options.persist) {
      const local = readLocal(key)
      if (local && now - local.ts < ttl) {
        memoryCache.set(key, local) // 回填内存
        return { data: local.data as T, fromCache: true, status: 200 }
      }
    }
  }

  // 实际 fetch
  const res = await fetch(input, {
    ...options,
    credentials: options.credentials ?? 'include',
  })
  const json = (await res.json()) as { success: boolean; data?: T; error?: string }

  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP ${res.status}`)
  }

  const entry: CacheEntry<T> = { data: json.data as T, ts: now }

  if (isCacheable(options)) {
    memoryCache.set(key, entry as CacheEntry<unknown>)
    if (options.persist) {
      writeLocal(key, entry as CacheEntry<unknown>)
    }
  }

  return { data: json.data as T, fromCache: false, status: res.status }
}

/** 读取缓存（不触发网络请求） */
export function readCache<T>(input: RequestInfo | URL, init?: RequestInit): T | null {
  const key = cacheKey(input, init)
  const mem = memoryCache.get(key)
  if (mem) return mem.data as T
  const local = readLocal(key)
  if (local) return local.data as T
  return null
}

/** 使缓存失效 */
export function invalidateCache(pattern?: string | RegExp): void {
  if (!pattern) {
    memoryCache.clear()
    // 清除所有 localStorage 中以 CACHE_PREFIX 开头的键
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k?.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(k)
      }
    }
    return
  }

  for (const [key] of memoryCache) {
    if (typeof pattern === 'string' ? key.startsWith(pattern) : pattern.test(key)) {
      memoryCache.delete(key)
    }
  }
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i)
    if (k?.startsWith(CACHE_PREFIX)) {
      const realKey = k.slice(CACHE_PREFIX.length)
      if (typeof pattern === 'string' ? realKey.startsWith(pattern) : pattern.test(realKey)) {
        localStorage.removeItem(k)
      }
    }
  }
}

/** 按精确 key 使缓存失效 */
export function invalidateKey(input: RequestInfo | URL, init?: RequestInit): void {
  const key = cacheKey(input, init)
  memoryCache.delete(key)
  removeLocal(key)
}
