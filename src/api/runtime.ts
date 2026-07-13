const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const stripApiSuffix = (value: string) => trimTrailingSlash(value).replace(/\/api$/i, '')

const getConfiguredApiBase = () =>
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  ''

const isLocalHost = () => {
  if (typeof window === 'undefined') return false

  const hostname = window.location.hostname.toLowerCase()
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost')
  )
}

export const getApiBaseUrl = () => {
  const configured = trimTrailingSlash(getConfiguredApiBase())

  if (isLocalHost()) {
    return ''
  }

  return configured
}

export const getApiOrigin = () => stripApiSuffix(getApiBaseUrl())

export const getSocketOrigin = () => {
  const configuredSocket = import.meta.env.VITE_SOCKET_URL
  if (configuredSocket && !isLocalHost()) {
    return stripApiSuffix(configuredSocket)
  }

  const apiOrigin = getApiOrigin()
  return apiOrigin || window.location.origin
}
