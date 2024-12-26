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
  args: any[]
  headers?: Record<string, string>
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
      customFetch?: Fetch,
      headers?: Record<string, string>
    } = {}
  ) {
    this.url = getAPIUrl(connectionString, FUNCTIONS_ROOT_PATH)
    this.fetch = resolveFetch(options.customFetch)
    this.headers = options.headers ? { ...DEFAULT_HEADERS, ...options.headers } : { ...DEFAULT_HEADERS }
  }
 // TODO: check authorization and api key setup in Gateway
  setAuth(token: string) {
    this.headers.Authorization = `Bearer ${token}`
  }

  async invoke(functionId: string, options: FunctionInvokeOptions) {
    let body;
    let _headers: Record<string, string> = {}
    if (options.args && 
      ((options.headers && !Object.prototype.hasOwnProperty.call(options.headers, 'Content-Type')) || !options.headers)
    ) {
      if (
        (typeof Blob !== 'undefined' && options.args instanceof Blob) ||
        options.args instanceof ArrayBuffer
      ) {
        // will work for File as File inherits Blob
        // also works for ArrayBuffer as it is the same underlying structure as a Blob
        _headers['Content-Type'] = 'application/octet-stream'
        body = options.args
      } else if (typeof options.args === 'string') {
        // plain string
        _headers['Content-Type'] = 'text/plain'
        body = options.args
      } else if (typeof FormData !== 'undefined' && options.args instanceof FormData) {
        _headers['Content-Type'] = 'multipart/form-data'
        body = options.args
      } else {
        // default, assume this is JSON
        _headers['Content-Type'] = 'application/json'
        body = JSON.stringify(options.args)
      }
    }

    try {    
      const response = await this.fetch(`${this.url}/${functionId}`, {
        method: 'POST',
        body: JSON.stringify(options.args),
        headers: { ..._headers, ...this.headers, ...options.headers }
      })

      if (!response.ok) {
        throw new SQLiteCloudError(`Failed to invoke function: ${response.statusText}`)
      }

      let responseType = (response.headers.get('Content-Type') ?? 'text/plain').split(';')[0].trim()
      let data: any
      if (responseType === 'application/json') {
        data = await response.json()
      } else if (responseType === 'application/octet-stream') {
        data = await response.blob()
      } else if (responseType === 'text/event-stream') {
        data = response
      } else if (responseType === 'multipart/form-data') {
        data = await response.formData()
      } else {
        data = await response.text()
      }
      return { ...data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}
