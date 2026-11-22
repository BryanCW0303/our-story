import { useEffect, useMemo, useRef } from 'react'
import { KINDS } from './Home.jsx'
import Icon from './Icon.jsx'
import { Badge } from './Landmark.jsx'

/** Photos arrive sorted oldest first; cut them into one group per calendar month. */
function byMonth(photos) {
  const months = []
  for (const photo of photos) {
    const key = photo.taken_on.slice(0, 7)
    if (months.at(-1)?.key !== key) months.push({ key, photos: [] })
    months.at(-1).photos.push(photo)
  }
  return months
}

const monthLabel = (key) => `${key.slice(0, 4)} 年 ${Number(key.slice(5))} 月`
const dayLabel = (date) => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`

/** One place: its photos on a timeline, grouped by month. `focusId` is the photo to scroll back to. */
export default function PlacePage({ place, photos, authed, focusId, onUpload }) {
  const months = useMemo(() => byMonth(photos ?? []), [photos])
  const scrolled = useRef(false)
  const kindName = KINDS.find((group) => group.kind === place.kind)?.name

  useEffect(() => {
    if (scrolled.current || !photos || !focusId) return
    scrolled.current = true
    document.getElementById(`photo-${focusId}`)?.scrollIntoView({ block: 'center' })
  }, [photos, focusId])

  return (
    <>
      <a className="back" href="#/">
        <Icon name="back" /> 所有地方
      </a>
      <div className="place-head">
        <Badge place={place} />
        <div>
          <h1>{place.name}</h1>
          {photos && (
            <p>
              {kindName} · {photos.length} 張照片{months.length > 0 && ` · ${months.length} 個月份`}
            </p>
          )}
        </div>
        {authed && (
          <div className="actions">
            <button className="btn primary" onClick={onUpload}>
              <Icon name="upload" /> 上傳照片
            </button>
          </div>
        )}
      </div>

      {!photos && <p className="muted center">載入中…</p>}
      {photos?.length === 0 && (
        <div className="empty">
          <p>這裡還沒有照片。</p>
          <p className="muted">{authed ? '按「上傳照片」放上第一張。' : '登入後就可以上傳。'}</p>
        </div>
      )}

      {months.length > 0 && (
        <div className="timeline">
          {months.map((month) => (
            <section className="month" key={month.key}>
              <span className="dot">
                <Icon name="heart" />
              </span>
              <h2>
                {monthLabel(month.key)}
                <small>{month.photos.length} 張</small>
              </h2>
              <div className="shots">
                {month.photos.map((photo) => (
                  <a
                    className="polaroid"
                    id={`photo-${photo.id}`}
                    href={`#/p/${place.slug}/${photo.id}`}
                    key={photo.id}
                    aria-label={`${photo.taken_on} 的照片`}
                  >
                    <img src={photo.thumb} alt="" loading="lazy" />
                    <span className="cap">
                      <em>{dayLabel(photo.taken_on)}</em>
                      {!photo.is_public && <Icon name="lock" />}
                      {photo.note || <span className="none">還沒有留言</span>}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
