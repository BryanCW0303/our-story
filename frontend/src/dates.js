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

export function daysTogether(startDate, timeZone, now) {
  // Compare calendar dates at UTC midnight so a DST transition still counts as one day.
  const today = now.toLocaleDateString('sv-SE', { timeZone })
  return Math.max(0, (Date.parse(today) - Date.parse(startDate)) / 86400000)
}
