import nodeFetch, { Headers as NodeFetchHeaders } from 'node-fetch'

export type Fetch = typeof fetch

export const resolveFetch = (customFetch?: Fetch): Fetch => {
  let _fetch: Fetch
  if (customFetch) {
    _fetch = customFetch
  } else if (typeof fetch !== 'undefined') {
    _fetch = nodeFetch as unknown as Fetch
  } else {
    _fetch = fetch
  }
  return (...args: Parameters<Fetch>) => _fetch(...args)
}

export const resolveHeadersConstructor = () => {
  if (typeof Headers === 'undefined') {
    return NodeFetchHeaders
  }

  return Headers
}

export const fetchWithAuth = (authorization: string, customFetch?: Fetch): Fetch => {
  const fetch = resolveFetch(customFetch)
  const HeadersConstructor = resolveHeadersConstructor()

  return async (input, init) => {
    const headers = new HeadersConstructor(init?.headers)
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${authorization}`)
    }
    // @ts-ignore
    return fetch(input, { ...init, headers })
  }
}
