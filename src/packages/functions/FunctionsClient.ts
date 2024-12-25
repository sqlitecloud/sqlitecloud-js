import { DEFAULT_HEADERS } from '../../drivers/constants'
import { SQLiteCloudError } from '../../drivers/types'
import { FUNCTIONS_ROOT_PATH } from '../constants'
import { getAPIUrl } from '../utils'
import { Fetch, resolveFetch } from '../utils/fetch'

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
 // auth token is the full connection string with apikey
  setAuth(token: string) {
    this.headers.Authorization = `Bearer ${token}`
  }

  async invoke(functionId: string, args: any[]) {
    // add argument handling
    try {    
      const response = await this.fetch(`${this.url}/${functionId}`, {
        method: 'POST',
        body: JSON.stringify(args),
        headers: this.headers
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
        // default to text
        data = await response.text()
      }
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}

/**

 */