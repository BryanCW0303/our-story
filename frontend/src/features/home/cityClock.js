function city(timeZone, latitude, longitude) {
  const format = (locale, options) => new Intl.DateTimeFormat(locale, { timeZone, ...options })
  return {
    latitude, longitude,
    time: format('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
    date: format('en-US', { month: 'numeric', day: 'numeric' }),
    weekday: format('en-US', { weekday: 'short' }),
  }
}

const cities = new Map([
  ['vancouver', city('America/Vancouver', 49.2827, -123.1207)],
  ['tokyo', city('Asia/Tokyo', 35.6762, 139.6503)],
])

// NOAA solar position approximation. Longitude is positive east of Greenwich.
function isDaylight(now, { latitude, longitude }) {
  const rad = Math.PI / 180
  const year = now.getUTCFullYear()
  const start = Date.UTC(year, 0, 1)
  const yearLength = Date.UTC(year + 1, 0, 1) - start
  const g = 2 * Math.PI * (now.getTime() - start - 43200000) / yearLength
  const { sin, cos } = Math
  const equationMinutes = 229.18 * (0.000075 + 0.001868*cos(g) - 0.032077*sin(g)
    - 0.014615*cos(2*g) - 0.040849*sin(2*g))
  const declination = 0.006918 - 0.399912*cos(g) + 0.070257*sin(g) - 0.006758*cos(2*g)
    + 0.000907*sin(2*g) - 0.002697*cos(3*g) + 0.00148*sin(3*g)
  const utcMinutes = now.getUTCHours()*60 + now.getUTCMinutes() + now.getUTCSeconds()/60
  const hourAngle = ((utcMinutes + equationMinutes + 4*longitude)/4 - 180) * rad
  const altitudeSin = sin(latitude*rad)*sin(declination) + cos(latitude*rad)*cos(declination)*cos(hourAngle)
  return altitudeSin >= cos(90.833*rad)
}

export function cityClock(slug, now) {
  const location = cities.get(slug)
  if (!location) return null
  return {
    daylight: isDaylight(now, location),
    time: location.time.format(now),
    date: location.date.format(now) + ' ' + location.weekday.format(now),
  }
}
