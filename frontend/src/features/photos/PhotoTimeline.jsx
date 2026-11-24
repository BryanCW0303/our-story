import { useEffect, useMemo, useRef } from 'react'
import Icon from '../../components/Icon.jsx'

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

/** The photo timeline, grouped by month. `focusId` is the photo to scroll back to. */
export default function PhotoTimeline({ place, photos, authed, focusId }) {
  const months = useMemo(() => byMonth(photos ?? []), [photos])
  const scrolled = useRef(false)

  useEffect(() => {
    if (scrolled.current || !photos || !focusId) return
    scrolled.current = true
    document.getElementById(`photo-${focusId}`)?.scrollIntoView({ block: 'center' })
  }, [photos, focusId])

  if (!photos) return <p className="muted center">載入中…</p>
  if (!photos.length) {
    return (
      <div className="empty">
        <p>這裡還沒有照片。</p>
        <p className="muted">{authed ? '按「上傳照片」放上第一張。' : '登入後就可以上傳。'}</p>
      </div>
    )
  }
  return (
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
                aria-label={`${monthLabel(month.key)}的照片`}
              >
                <img src={photo.thumb} alt="" loading="lazy" />
                <span className="cap">
                  {photo.note || <span className="none">還沒有留言</span>}
                </span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
