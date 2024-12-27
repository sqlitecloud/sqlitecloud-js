
// Test functions client
// invoke

import { CHINOOK_API_KEY, CHINOOK_DATABASE_URL } from "../../../test/shared"
import { FunctionsClient } from "../_functions/FunctionsClient"

const TEST_SQL_FUNCTION_ID = 'test-1-sql'
const TEST_JS_FUNCTION_ID = 'test-1-js'

const TEST_FUNCTION_ARG = {
  filter: 'a',
  limit: 10
}

const functions = new FunctionsClient(CHINOOK_DATABASE_URL)

describe('FunctionsClient', () => {
  it('should invoke a JS function', async () => {

    const { data, error } = await functions.invoke(TEST_JS_FUNCTION_ID, {
      params: TEST_FUNCTION_ARG,
      headers: {
        'Authorization': `Bearer ${CHINOOK_API_KEY}`
      }
    })
    expect(data.message).toBeDefined()
    expect(data.result).toBeDefined()
    expect(error).toBeNull()
  })

  it('should invoke a SQL function', async () => {
    const { data, error } = await functions.invoke(TEST_SQL_FUNCTION_ID, {
      params: TEST_FUNCTION_ARG,
      headers: {
        'Authorization': `Bearer ${CHINOOK_API_KEY}`
      }
    })
    expect(data).toBeDefined()
    expect(data.length > 0).toBeTruthy()
    expect(error).toBeNull()
  })
})

