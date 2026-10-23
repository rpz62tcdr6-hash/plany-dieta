import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL, getApiKey } from './key'

export { AI_MODEL }

export function makeClient(): Anthropic {
  const apiKey = getApiKey()
  if (!apiKey) throw new AiError('Brak klucza API. Dodaj go w zakładce Ustawienia → Asystent AI.')
  // Aplikacja działa wyłącznie w przeglądarce trenera, a klucz wpisuje on sam – stąd wywołanie z przeglądarki.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 })
}

export class AiError extends Error {}

/** Czytelny komunikat po polsku dla błędu z API */
export function describeError(e: unknown): string {
  if (e instanceof AiError) return e.message
  if (e instanceof Anthropic.AuthenticationError) return 'Nieprawidłowy klucz API – sprawdź go w Ustawieniach.'
  if (e instanceof Anthropic.PermissionDeniedError) return 'Ten klucz nie ma dostępu do modelu. Sprawdź uprawnienia w konsoli Anthropic.'
  if (e instanceof Anthropic.RateLimitError) return 'Za dużo zapytań naraz albo wyczerpany limit konta – spróbuj za chwilę.'
  if (e instanceof Anthropic.BadRequestError) return `Zapytanie odrzucone: ${e.message}`
  if (e instanceof Anthropic.APIUserAbortError) return 'Anulowano.'
  if (e instanceof Anthropic.APIConnectionError) return 'Brak połączenia z internetem lub z serwerem AI.'
  if (e instanceof Anthropic.InternalServerError) return 'Serwer AI jest chwilowo przeciążony – spróbuj ponownie za minutę.'
  if (e instanceof Anthropic.APIError) return `Błąd AI (${e.status ?? '?'}): ${e.message}`
  return e instanceof Error ? e.message : 'Nieznany błąd.'
}

/** Szybkie sprawdzenie klucza – pobiera opis modelu, bez generowania (bez kosztu) */
export async function testConnection(): Promise<string> {
  const client = makeClient()
  const model = await client.models.retrieve(AI_MODEL)
  return model.display_name
}
