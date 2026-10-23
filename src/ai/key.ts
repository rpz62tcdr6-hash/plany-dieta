/** Model używany przez asystenta */
export const AI_MODEL = 'claude-opus-5-5'

/**
 * Klucz API trzymamy tylko w pamięci tej przeglądarki – osobno od danych aplikacji,
 * więc nie trafia do kopii zapasowej ani do kodu strony.
 */
const KEY = 'asystent-ai:klucz'

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function setApiKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY, key.trim())
    else localStorage.removeItem(KEY)
  } catch {
    // brak dostępu do pamięci przeglądarki
  }
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0
}

