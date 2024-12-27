import nodeFetch, { Headers as NodeFetchHeaders } from 'node-fetch'

export type Fetch = typeof fetch

export const resolveFetch = (customFetch?: Fetch): Fetch => {
  let _fetch: Fetch
  if (customFetch) {
    _fetch = customFetch
  } else if (typeof fetch !== 'undefined') {
    _fetch = fetch
  } else {
    _fetch = nodeFetch as unknown as Fetch
  }
  return _fetch
}

export const resolveHeadersConstructor = () => {
  if (typeof Headers === 'undefined') {
    return NodeFetchHeaders
  }

  return Headers
}

// authorization is the connection string
export const fetchWithAuth = (authorization: string, customFetch?: Fetch): Fetch => {
  const fetch = resolveFetch(customFetch)
  const HeadersConstructor = resolveHeadersConstructor()

  return (input, init) => {
    const headers = new HeadersConstructor(init?.headers)
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${authorization}`)
    }
    // @ts-ignore
    return fetch(input, { ...init, headers })
  }
}
