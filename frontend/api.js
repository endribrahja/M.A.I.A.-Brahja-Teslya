/**
 * @param {string} path
 * @param {string} [method]
 * @param {unknown} [body]
 */
export async function api(path, method = 'GET', body) {
  const response = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    headers: method === 'GET' ? undefined : {'Content-Type': 'application/json'},
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {})
  });
  const data = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error(typeof data.detail === 'string' ? data.detail : 'Richiesta non riuscita.'), {
      status: response.status
    });
  }
  return data;
}

const entities = new Map([['&','&amp;'],['<','&lt;'],['>','&gt;'],['"','&quot;'],["'",'&#39;']]);

/** @param {unknown} value */
export const esc = value => String(value ?? '').replace(/[&<>"']/g, token => entities.get(token) ?? token);

/** @param {number | null | undefined} value */
export const num = value => value == null ? '—' : new Intl.NumberFormat('it-IT',{maximumFractionDigits:3}).format(value);

/** @param {number | null | undefined} timestamp */
export const dateTime = timestamp => timestamp == null ? 'Non disponibile' : new Intl.DateTimeFormat('it-IT',{
  dateStyle:'short',timeStyle:'short',timeZone:'Europe/Rome'
}).format(new Date(timestamp * 1000));

/** @param {string} value */
export const day = value => new Intl.DateTimeFormat('it-IT',{
  day:'2-digit',month:'short',timeZone:'UTC'
}).format(new Date(value + 'T12:00:00Z'));

export function today() {
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}

/**
 * @param {string} value
 * @param {number} step
 */
export function shift(value, step) {
  const date = new Date(value + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + step);
  return date.toISOString().slice(0,10);
}
