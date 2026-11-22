import { parseDate } from '../api.js'
import Icon from './Icon.jsx'
import { Badge } from './Landmark.jsx'

const DAY_MS = 24 * 60 * 60 * 1000

function daysTogether(startDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Rounding absorbs daylight-saving shifts; the first day counts as day 1.
  return Math.round((today - parseDate(startDate)) / DAY_MS) + 1
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

      <div className="divider">
        <Icon name="pin" />
      </div>
      <h2 className="sec">我們去過的地方</h2>
      <p className="sub">點一個地方，看看那裡的我們</p>
      <div className="places">
        {places?.map((place) => (
          <a className="place" href={`#/p/${place.slug}`} key={place.slug}>
            <Badge place={place} />
            <b>{place.name}</b>
            <span className="en">{place.name_en}</span>
            <span className="meta">{place.photo_count} 張照片</span>
          </a>
        ))}
      </div>
    </>
  )
}
