const getRawApiBase = () =>
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  ''

const normalizeHttpsIfNeeded = (url: string) => {
  try {
    const isPageHttps =
      typeof window !== 'undefined' && window.location.protocol === 'https:'

    if (isPageHttps && url.startsWith('http://')) {
      return url.replace(/^http:\/\//i, 'https://')
    }
  } catch {
    // Ignore window access issues during non-browser execution.
  }

  return url
}

export const API_ORIGIN = normalizeHttpsIfNeeded(getRawApiBase()).replace(
  /\/api\/?$/,
  ''
)
