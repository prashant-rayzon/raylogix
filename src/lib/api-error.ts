export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const err = error as any

  const message =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.data?.message ||
    err?.data?.error ||
    err?.message

  if (typeof message === 'string' && message.trim()) return message.trim()

  const errors = err?.response?.data?.errors || err?.errors
  if (Array.isArray(errors)) {
    const first = errors
      .map((item) => {
        if (typeof item === 'string') return item
        if (typeof item?.message === 'string') return item.message
        return null
      })
      .find(Boolean)

    if (first) return String(first)
  }

  return fallback
}
