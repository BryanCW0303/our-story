import { useEffect, useState } from 'react'
import { KINDS } from '../places/kinds.js'
import { ACTIVITIES } from '../activities/catalog.js'
import { daysTogether } from '../../dates.js'
import Reunion from './Reunion.jsx'
import FootprintTimeline from './FootprintTimeline.jsx'
import Icon from '../../components/Icon.jsx'
import { Badge } from '../../components/Landmark.jsx'

const yearMonth = (date) => date.slice(0, 7).replace('-', '.')

/**
 * Trips list the individual months visited; former homes show the span of residence.
 */
function placeSpan(place) {
  if (!place.first_photo) return '還沒有照片'
  if (place.kind === 'trip') return place.trip_months.map(yearMonth).join('、')
  const from = yearMonth(place.first_photo)
  const to = yearMonth(place.last_photo)
  return from === to ? from : `${from} – ${to}`
}

function HomeStats({ places }) {
  const withPhotos = places.filter((place) => place.photo_count > 0)
  const total = places.reduce((sum, place) => sum + place.photo_count, 0)

  return (
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
        <span>間餐飲</span>
      </div>
      <Icon name="heart" />
      <div className="stat">
        <strong>{ACTIVITIES.reduce((sum, activity) => sum + activity.items.length, 0)}</strong>
        <span>項活動</span>
      </div>
    </div>
  )
}

export default function Home({ config, places, meetingDays, authed, onConfigSaved, onOpenSettings }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer
    function refresh() {
      clearTimeout(timer)
      const current = new Date()
      setNow(current)
      timer = setTimeout(refresh, 60000 - current.getTime() % 60000)
    }
    refresh()
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const hasNames = Boolean(config?.name_a && config?.name_b)
  const days = config?.start_date ? daysTogether(config.start_date, config.anniversary_timezone, now) : 0

  return (
    <>
      <header className="hero">
        {config?.start_date && <div className="since">Since {config.start_date.replaceAll('-', '.')}</div>}
        <h1 className={hasNames ? 'couple-names' : undefined}>
          {hasNames ? (
            <>
              <span>{config.name_a}</span>
              <Icon name="heart" />
              <span>{config.name_b}</span>
            </>
          ) : (
            config?.title
          )}
        </h1>
        {(config?.start_date || places) && (
          <div className="together-summary">
            {config?.start_date && (
              <p className="days">
                我們已經在一起 <strong>{days.toLocaleString()}</strong> 天
              </p>
            )}
            {places && <HomeStats places={places} />}
          </div>
        )}
        {authed && config && !(hasNames && config.start_date) && (
          <p>
            <button className="link" onClick={onOpenSettings}>
              填上兩個人的名字和在一起的日期
            </button>
          </p>
        )}
      </header>

      {places && config && <Reunion now={now} places={places} config={config} meetingDays={meetingDays} onSaved={onConfigSaved} />}
      {places && (
        <>
          <div className="divider">
            <Icon name="route" />
          </div>
          <h2 className="sec">年度回顧</h2>
          <section className="trail-card">
            <FootprintTimeline places={places} />
          </section>
        </>
      )}

      <div className="divider">
        <Icon name="pin" />
      </div>
      <h2 className="sec">世界足跡</h2>
      {places &&
        KINDS.filter((group) => group.kind !== 'now').map((group) => (
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
      <h2 className="sec">兩人活動</h2>
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
