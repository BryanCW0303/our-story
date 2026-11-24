import { KINDS } from '../places/kinds.js'
import { ACTIVITIES } from '../activities/catalog.js'
import { parseDate } from '../../dates.js'
import FootprintTimeline from './FootprintTimeline.jsx'
import Icon from '../../components/Icon.jsx'
import { Badge } from '../../components/Landmark.jsx'

const DAY_MS = 24 * 60 * 60 * 1000

function daysTogether(startDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Round across daylight-saving shifts so local calendar days stay whole.
  return Math.max(0, Math.round((today - parseDate(startDate)) / DAY_MS))
}

const yearMonth = (date) => date.slice(0, 7).replace('-', '.')

/**
 * Trips list the individual months visited; homes show the span of residence.
 * A current home has no end yet, so it runs to "now".
 */
function placeSpan(place) {
  if (!place.first_photo) return '還沒有照片'
  if (place.kind === 'trip') return place.trip_months.map(yearMonth).join('、')
  const from = yearMonth(place.first_photo)
  if (place.kind === 'now') return `${from} – now`
  const to = yearMonth(place.last_photo)
  return from === to ? from : `${from} – ${to}`
}

function Footprints({ places }) {
  const withPhotos = places.filter((place) => place.photo_count > 0)
  const total = places.reduce((sum, place) => sum + place.photo_count, 0)

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
            <strong>{new Set(withPhotos.map((place) => place.name)).size}</strong>
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
            <span>筆餐飲</span>
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
        <FootprintTimeline places={places} />
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
        {config?.start_date && (
          <p className="days">
            我們已經在一起 <strong>{days.toLocaleString()}</strong> 天
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
