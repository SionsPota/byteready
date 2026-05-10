import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch, readCache, type ApiOptions, type ApiResult } from '../lib/api.ts'

interface UseApiResult<T> {
  data: T | null
  error: string | null
  loading: boolean
  refreshing: boolean
  refresh: () => Promise<void>
}

const inflight = new Map<string, Promise<ApiResult<unknown>>>()

function buildKey(input: RequestInfo | URL, options?: ApiOptions): string {
  const url = typeof input === 'string' ? input : input.toString()
  if (!options?.body) return url
  return `${url}::${options.method || 'GET'}::${String(options.body).slice(0, 200)}`
}

export function useApi<T>(
  input: RequestInfo | URL | null,
  options: ApiOptions = {},
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const mountedRef = useRef(true)

  const key = input ? buildKey(input, options) : ''

  const execute = useCallback(
    async (skipCache: boolean, silent: boolean): Promise<void> => {
      if (!input) return
      const url = typeof input === 'string' ? input : input.toString()

      if (!silent) {
        if (skipCache) setRefreshing(true)
        else setLoading(true)
      }
      setError(null)

      try {
        // 并发去重
        let promise = inflight.get(key)
        if (!promise) {
          promise = apiFetch<T>(url, { ...options, skipCache }).then((r) => r as ApiResult<unknown>)
          inflight.set(key, promise)
          promise.finally(() => inflight.delete(key))
        }

        const result = (await promise) as ApiResult<T>
        if (mountedRef.current) {
          setData(result.data)
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (mountedRef.current) {
          if (!silent) {
            setLoading(false)
            setRefreshing(false)
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, key],
  )

  useEffect(() => {
    mountedRef.current = true
    if (!input) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }

    // 先尝试读缓存快速渲染
    const cached = readCache<T>(input, options)
    if (cached) {
      setData(cached)
      setLoading(false)
      // 后台静默刷新
      execute(true, true)
    } else {
      setData(null)
      execute(false, false)
    }

    return () => {
      mountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, key])

  const refresh = useCallback(async () => {
    await execute(true, false)
  }, [execute])

  return { data, error, loading, refreshing, refresh }
}
