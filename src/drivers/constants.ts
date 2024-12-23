const version = '0.0.1'
let JS_ENV = ''
// @ts-ignore
if (typeof Deno !== 'undefined') {
  JS_ENV = 'deno'
} else if (typeof document !== 'undefined') {
  JS_ENV = 'web'
} else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
  JS_ENV = 'react-native'
} else {
  JS_ENV = 'node'
}

export const DEFAULT_HEADERS = { 'X-Client-Info': `sqlitecloud-js-${JS_ENV}/${version}` }
export const DEFAULT_GLOBAL_OPTIONS = {
  headers: DEFAULT_HEADERS
}

export const DEFAULT_WEBLITE_VERSION = 'v2'
export const WEBLITE_PORT = 8090
