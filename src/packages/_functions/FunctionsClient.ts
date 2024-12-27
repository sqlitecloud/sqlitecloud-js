import { DEFAULT_HEADERS } from '../../drivers/constants'
import { SQLiteCloudError } from '../../drivers/types'
import { FUNCTIONS_ROOT_PATH } from '../constants'
import { getAPIUrl } from '../utils'
import { Fetch, resolveFetch } from '../utils/fetch'

/**
 * FunctionInvokeOptions
 * @param args - The arguments to pass to the function.
 * @param headers - The headers to pass to the function.
 */
interface FunctionInvokeOptions {
  params: Record<string, any>
  headers?: Record<string, string>
  apiKey?: string
}

/**
 * FunctionsClient
 * @param invoke - Invoke a function.
 * @param setAuth - Set the authentication token.
 */
export class FunctionsClient {
  protected url: string
  protected fetch: Fetch
  protected headers: Record<string, string>

  constructor(
    connectionString: string,
    options: {
      fetch?: Fetch,
      headers?: Record<string, string>
    } = {
      headers: {}
    }
  ) {
    this.url = getAPIUrl(connectionString, FUNCTIONS_ROOT_PATH)
    this.fetch = resolveFetch(options.fetch)
    this.headers = { ...DEFAULT_HEADERS, ...options.headers }
  }
 // TODO: check authorization and api key setup in Gateway
  setAuth(token: string) {
    this.headers.Authorization = `Bearer ${token}`
  }

  async invoke(functionId: string, options: FunctionInvokeOptions) {
    let body;
    let _headers: Record<string, string> = {}
    if (options.params && 
      ((options.headers && !Object.prototype.hasOwnProperty.call(options.headers, 'Content-Type')) || !options.headers)
    ) {
      if (
        (typeof Blob !== 'undefined' && options.params instanceof Blob) ||
        options.params instanceof ArrayBuffer
      ) {
        // will work for File as File inherits Blob
        // also works for ArrayBuffer as it is the same underlying structure as a Blob
        _headers['Content-Type'] = 'application/octet-stream'
        body = options.params
      } else if (typeof options.params === 'string') {
        // plain string
        _headers['Content-Type'] = 'text/plain'
        body = options.params
      } else if (typeof FormData !== 'undefined' && options.params instanceof FormData) {
        _headers['Content-Type'] = 'multipart/form-data'
        body = options.params
      } else {
        // default, assume this is JSON
        _headers['Content-Type'] = 'application/json'
        body = JSON.stringify(options.params)
      }
    }

    try {    
      const response = await this.fetch(`${this.url}/${functionId}`, {
        method: 'POST',
        body,
        headers: { ..._headers, ...this.headers, ...options.headers }
      })

      if (!response.ok) {
        throw new SQLiteCloudError(`Failed to invoke function: ${response.statusText}`)
      }
      return { error: null, ...(await response.json()) }
    } catch (error) {
      return { data: null, error }
    }
  }
}
