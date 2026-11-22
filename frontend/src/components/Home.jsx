import { ACTIVITIES } from '../activities.js'
import { parseDate } from '../api.js'
import Icon from './Icon.jsx'
import { Badge } from './Landmark.jsx'

const DAY_MS = 24 * 60 * 60 * 1000

/** The groups of places on the home page, in display order. `short` is for the small labels in the summary. */
export const KINDS = [
  { kind: 'now', name: '現居地', short: '現居地', icon: 'home' },
  { kind: 'past', name: '曾經居住過的地方', short: '曾住過', icon: 'history' },
  { kind: 'trip', name: '旅遊地點', short: '旅遊地點', icon: 'plane' },
]

function daysTogether(startDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Rounding absorbs daylight-saving shifts; the first day counts as day 1.
  return Math.round((today - parseDate(startDate)) / DAY_MS) + 1
}

const yearMonth = (date) => date.slice(0, 7).replace('-', '.')

/**
 * What a place's card says under its name: the months of its earliest and latest photo.
 * A current home has no end yet, so it runs to "now".
 */
function placeSpan(place) {
  if (!place.first_photo) return '還沒有照片'
  const from = yearMonth(place.first_photo)
  if (place.kind === 'now') return `${from} – now`
  const to = yearMonth(place.last_photo)
  return from === to ? from : `${from} – ${to}`
}

const monthLabel = (date) => `${date.slice(0, 4)} 年 ${Number(date.slice(5, 7))} 月`

/**
 * How many places, photos, restaurants and activities so far, and the places as a route in the order they were first visited.
 * "First visited" is the date of a place's earliest photo. A city listed under both kinds
 * (Vancouver) is one place and one stop here, dated by the earliest photo of either.
 */
function Footprints({ places }) {
  const cities = new Map()
  for (const place of places) {
    const seen = cities.get(place.name)
    if (!seen) cities.set(place.name, { place, first: place.first_photo })
    else if (place.first_photo && (!seen.first || place.first_photo < seen.first)) seen.first = place.first_photo
  }
  // ISO dates sort as text; '9' puts the places without photos last.
  const stops = [...cities.values()].sort((a, b) => (a.first ?? '9').localeCompare(b.first ?? '9'))
  const visited = stops.filter((stop) => stop.first)
  const withPhotos = places.filter((place) => place.photo_count > 0)
  const total = places.reduce((sum, place) => sum + place.photo_count, 0)

  let span = '上傳第一張照片，足跡就從這裡開始'
  if (withPhotos.length) {
    const earliest = withPhotos.reduce((a, b) => (b.first_photo < a.first_photo ? b : a))
    const latest = withPhotos.reduce((a, b) => (b.last_photo > a.last_photo ? b : a))
    span = `從 ${monthLabel(earliest.first_photo)}的${earliest.name}，到 ${monthLabel(latest.last_photo)}的${latest.name}`
  }

  return (
    <>
      <div className="divider">
        <Icon name="route" />
      </div>
      <h2 className="sec">我們的足跡</h2>
      <p className="sub">一起走過的每一步</p>
      <section className="trail-card">
        <div className="stats">
          <div className="stat">
            <strong>{visited.length}</strong>
            <span>個地方</span>
          </div>
          <Icon name="heart" />
          <div className="stat">
            <strong>{total.toLocaleString()}</strong>
            <span>張照片</span>
          </div>
          <Icon name="heart" />
          <div className="stat">
            <strong>{places.reduce((sum, place) => sum + place.restaurant_count, 0).toLocaleString()}</strong>
            <span>間餐廳</span>
          </div>
          <Icon name="heart" />
          <div className="stat">
            <strong>{ACTIVITIES.reduce((sum, activity) => sum + activity.items.length, 0)}</strong>
            <span>項活動</span>
          </div>
        </div>
        <p className="kinds">
          {KINDS.map((group) => (
            <span key={group.kind}>
              <Icon name={group.icon} />
              {group.short} {withPhotos.filter((place) => place.kind === group.kind).length}
            </span>
          ))}
        </p>
        <p className="kinds acts">
          {ACTIVITIES.map((activity) => (
            <span key={activity.id}>
              <Icon name={activity.chip} />
              {activity.name} {activity.items.length}
            </span>
          ))}
        </p>
        <p className="span">{span}</p>
        <div className="path">
          {stops.map(({ place, first }) => (
            <a className={first ? 'stop' : 'stop unvisited'} href={`#/p/${place.slug}`} key={place.slug}>
              <Badge place={place} />
              <b>{place.name}</b>
              <small>{first ? yearMonth(first) : '還沒去'}</small>
            </a>
          ))}
        </div>
      </section>
    </>
  )
}

export default function Home({ config, places, authed, onOpenSettings }) {
  const hasNames = Boolean(config?.name_a && config?.name_b)
  const days = config?.start_date ? daysTogether(config.start_date) : 0

  return (
    <>
      <header className="hero">
        {config?.start_date && <div className="since">Since {config.start_date.replaceAll('-', '.')}</div>}
        <h1>
          {hasNames ? (
            <>
              {config.name_a}
              <Icon name="heart" />
              {config.name_b}
            </>
          ) : (
            config?.title
          )}
        </h1>
        {days > 0 && (
          <p className="days">
            在一起的第<strong>{days.toLocaleString()}</strong>天
          </p>
        )}
        {authed && config && !(hasNames && config.start_date) && (
          <p>
            <button className="link" onClick={onOpenSettings}>
              填上兩個人的名字和在一起的日期
            </button>
          </p>
        )}
      </header>

      {places && <Footprints places={places} />}

      <div className="divider">
        <Icon name="pin" />
      </div>
      <h2 className="sec">我們去過的地方</h2>
      <p className="sub">點一個地方，看看那裡的我們</p>
      {places &&
        KINDS.map((group) => (
          <section key={group.kind}>
            <h3 className="group">
              <Icon name={group.icon} />
              {group.name}
            </h3>
            <div className="places">
              {places
                .filter((place) => place.kind === group.kind)
                .map((place) => (
                  <a className="place" href={`#/p/${place.slug}`} key={place.slug}>
                    <Badge place={place} />
                    <b>{place.name}</b>
                    <span className="en">{place.name_en}</span>
                    <span className="meta">{placeSpan(place)}</span>
                  </a>
                ))}
            </div>
          </section>
        ))}

      <div className="divider">
        <Icon name="sparkles" />
      </div>
      <h2 className="sec">我們一起做過的事</h2>
      <p className="sub">看過的、拼過的、玩過的</p>
      <div className="places">
        {ACTIVITIES.map((activity) => (
          <a className="place" href={`#/a/${activity.id}`} key={activity.id}>
            <Badge place={{ slug: activity.icon, color: activity.color }} />
            <b>{activity.name}</b>
            <span className="en">{activity.en}</span>
            <span className="meta">
              {activity.items.length} {activity.unit}
            </span>
          </a>
        ))}
      </div>
    </>
  )
}
