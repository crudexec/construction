export class AssetFetchError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'AssetFetchError' }
}

export async function fetchAssetJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(20000)
  const response = await fetch(url, { credentials: 'include', signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
  if (response.status === 401) throw new AssetFetchError('Your session has expired or changed. Sign in again to continue.', 401)
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new AssetFetchError(data?.error || `Could not load this data (HTTP ${response.status}). Please try again.`, response.status)
  if (data === null) throw new AssetFetchError('The server returned an unexpected response. Please try again.', response.status)
  return data as T
}
