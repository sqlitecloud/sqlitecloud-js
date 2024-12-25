import { SQLiteCloudError } from '../../drivers/types'
import { FUNCTIONS_ROOT_PATH } from '../constants'
import { getAPIUrl } from '../utils'
import { Fetch, resolveFetch, resolveHeadersConstructor } from '../utils/fetch'

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
    this.headers = options.headers ?? {}
  }
 // auth token is the full connection string with apikey
  setAuth(token: string) {
    this.headers.Authorization = `Bearer ${token}`
  }

  async invoke(functionName: string, args: any[]) {
    try {    
      // TODO IMPLEMENT
    } catch (error) {
      throw new SQLiteCloudError(`Failed to invoke function: ${error}`)
    }
  }


}
