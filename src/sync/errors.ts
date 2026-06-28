export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = err.message
    return msg === 'Failed to fetch' || msg.includes('fetch') || msg.includes('NetworkError') || msg.includes('network')
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return msg.includes('network') || msg.includes('timeout') || msg.includes('aborted')
  }
  return false
}

export function isSessionError(err: unknown): boolean {
  if (err instanceof Error) {
    return (
      err.message.includes('Sessão expirada') ||
      err.message.includes('JWT') ||
      err.message.includes('invalid_jwt') ||
      err.message.includes('not authenticated') ||
      err.message.includes('PGRST301')
    )
  }
  return false
}
