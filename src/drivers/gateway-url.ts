/** Gateway URL helpers shared by stateless HTTP and socket.io transports. */

/** Default gateway domain suffix used when gatewayurl is not provided. */
export const DEFAULT_GATEWAY_DOMAIN = 'gateway.sqlite.cloud'

/** Build a tenant gateway hostname from a core hostname and optional gateway suffix. */
export function buildGatewayHost(host: string, gatewayurl?: string): string {
  if (!host) return host
  const suffix = gatewayurl || DEFAULT_GATEWAY_DOMAIN
  if (host === suffix || host.endsWith('.' + suffix)) return host
  const parts = host.split('.')
  if (parts.length < 3) return host
  return `${parts.slice(0, -2).join('.')}.${suffix}`
}

/** Build the HTTP SQL endpoint while retaining a configured local gateway path prefix. */
export function buildGatewaySqlUrl(host: string, gatewayurl?: string): string {
  if (gatewayurl?.includes('localhost')) {
    const url = new URL(gatewayurl.includes('://') ? gatewayurl : `http://${gatewayurl}`)
    if (url.protocol === 'ws:') url.protocol = 'http:'
    if (url.protocol === 'wss:') url.protocol = 'https:'
    const prefix = url.pathname.replace(/\/+$/, '')
    url.pathname = `${prefix}/v2/weblite/sql`
    url.search = ''
    return url.toString()
  }

  return `https://${buildGatewayHost(host, gatewayurl)}:443/v2/weblite/sql`
}
