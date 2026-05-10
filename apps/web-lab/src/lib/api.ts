import type { ApiResponse } from '@byteready/shared'

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const apiJson = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  let body: ApiResponse<T> | null = null
  try {
    body = (await res.json()) as ApiResponse<T>
  } catch {
    throw new ApiError('PARSE_ERROR', `响应非合法 JSON (status=${res.status})`, res.status)
  }
  if (!body) {
    throw new ApiError('EMPTY_BODY', `响应体为空 (status=${res.status})`, res.status)
  }
  if (!body.success) {
    throw new ApiError(body.error.code, body.error.message, res.status)
  }
  return body.data
}
