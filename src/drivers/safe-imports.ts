/**
 * safe-imports.ts - Safe imports for optional React Native dependencies
 *
 * This module provides safe imports for dependencies that are optional peer dependencies.
 * When these dependencies are not installed (e.g., using the package in a web/Next.js context),
 * the imports will still work. However, in React Native contexts where these dependencies are
 * required but not installed, clear error messages will be thrown.
 */

import { SQLiteCloudError } from './types'

/**
 * Detects if we're running in React Native environment
 */
export function isReactNative(): boolean {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative'
}

/**
 * Safely imports the URL class from whatwg-url or react-native-url-polyfill
 * In React Native: Uses react-native-url-polyfill (via react-native field mapping)
 * In Web/Node: Uses whatwg-url
 */
export function getSafeURL(): typeof import('whatwg-url').URL {
  try {
    // In React Native, Metro bundler will resolve this to react-native-url-polyfill
    // In Web/Node, this will resolve to whatwg-url
    const { URL } = require('whatwg-url')
    return URL
  } catch (error) {
    if (isReactNative()) {
      throw new SQLiteCloudError(
        'Missing required React Native dependency: react-native-url-polyfill. ' +
        'Please install it using: npm install react-native-url-polyfill',
        { errorCode: 'ERR_MISSING_DEPENDENCY', cause: error as Error }
      )
    }
    throw new SQLiteCloudError(
      'Failed to load URL parser. Please ensure whatwg-url is installed.',
      { errorCode: 'ERR_MISSING_DEPENDENCY', cause: error as Error }
    )
  }
}

/**
 * Safely imports the Buffer class from buffer or @craftzdog/react-native-buffer
 * In React Native: Uses @craftzdog/react-native-buffer (via react-native field mapping)
 * In Web/Node: Uses buffer package
 */
export function getSafeBuffer(): typeof import('buffer').Buffer {
  try {
    // In React Native, Metro bundler will resolve this to @craftzdog/react-native-buffer
    // In Web/Node, this will resolve to buffer package
    const { Buffer } = require('buffer')
    return Buffer
  } catch (error) {
    if (isReactNative()) {
      throw new SQLiteCloudError(
        'Missing required React Native dependency: @craftzdog/react-native-buffer. ' +
        'Please install it using: npm install @craftzdog/react-native-buffer',
        { errorCode: 'ERR_MISSING_DEPENDENCY', cause: error as Error }
      )
    }
    throw new SQLiteCloudError(
      'Failed to load Buffer library. Please ensure buffer package is installed.',
      { errorCode: 'ERR_MISSING_DEPENDENCY', cause: error as Error }
    )
  }
}

/**
 * Safely imports the tls module or react-native-tcp-socket
 * In React Native: Uses react-native-tcp-socket (via react-native field mapping)
 * In Node: Uses native tls module
 * In Browser: Will return null (browser field sets tls to false)
 */
export function getSafeTLS(): typeof import('tls') | null {
  try {
    // In React Native, Metro bundler will resolve this to react-native-tcp-socket
    // In Node, this will resolve to native tls module
    // In Browser, the browser field in package.json sets tls to false
    const tls = require('tls')
    if (tls === false || !tls) {
      return null
    }
    return tls
  } catch (error) {
    if (isReactNative()) {
      throw new SQLiteCloudError(
        'Missing required React Native dependency: react-native-tcp-socket. ' +
        'Please install it using: npm install react-native-tcp-socket',
        { errorCode: 'ERR_MISSING_DEPENDENCY', cause: error as Error }
      )
    }
    // In browser context, tls is not available (WebSocket should be used instead)
    return null
  }
}
