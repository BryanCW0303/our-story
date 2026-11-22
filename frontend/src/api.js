// Thin wrapper around fetch for the Django API (session cookie + CSRF token).

/** Longest note the server accepts next to a photo or a restaurant (NOTE_MAX in the backend's models.py). */
export const NOTE_MAX = 500

/**
 * Fired on `window` when the server refuses a request as not signed in: the session ran out, or was
 * ended from another device. The app listens for it and asks the server again who is signed in.
 */
export const REFUSED = 'memories:refused'

function csrfToken() {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

function errorMessage(data, status) {
  if (status === 429) return '嘗試太多次了，請一分鐘後再試'
  if (status === 403) return '請重新登入後再試'
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail
    const first = Object.values(data)[0]
    if (Array.isArray(first) && first.length) return String(first[0])
  }
  return '發生錯誤，請再試一次'
}

export async function api(path, { method = 'GET', json, form } = {}) {
  const headers = {}
  if (method !== 'GET') headers['X-CSRFToken'] = csrfToken()
  let body
  if (form) {
    body = form
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  }

  let response
  try {
    response = await fetch(`/api/${path}`, { method, headers, body, credentials: 'same-origin' })
  } catch {
    throw new Error('連不上伺服器，請檢查網路')
  }
  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (response.status === 403) window.dispatchEvent(new Event(REFUSED))
  if (!response.ok) throw new Error(errorMessage(data, response.status))
  return data
}

/** Parse "YYYY-MM-DD" as a local date (new Date(str) would treat it as UTC). */
export function parseDate(text) {
  const [year, month, day] = text.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function todayString() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
