import { parseDate } from '../api.js'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function PinIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1a5 5 0 0 0-5 5c0 3.6 5 9 5 9s5-5.400 5-9a5 5 0 0 0-5-5zm0 6.800A1.800 1.800 0 1 1 8 4.200a1.800 1.800 0 0 1 0 3.600z"
      />
    </svg>
  )
}

function PhotoGrid({ photos, title, onOpen }) {
  if (photos.length === 0) return null
  const layout = photos.length === 1 ? 'one' : photos.length === 2 || photos.length === 4 ? 'two' : 'three'
  return (
    <div className={`photos ${layout}`}>
      {photos.map((photo, index) => (
        <button
          key={photo.id}
          className="photo"
          onClick={() => onOpen(photos, index)}
          aria-label={`放大看「${title}」的第 ${index + 1} 張照片`}
          style={layout === 'one' ? { aspectRatio: `${photo.width} / ${photo.height}` } : undefined}
        >
          <img src={photo.thumb} alt="" loading="lazy" />
        </button>
      ))}
    </div>
  )
}

function MomentCard({ moment, authed, onOpenPhoto, onEdit, onDelete }) {
  const date = parseDate(moment.date)
  return (
    <article className="moment">
      <span className="moment-dot" aria-hidden="true" />
      <p className="moment-meta">
        <time dateTime={moment.date}>
          {date.getMonth() + 1} 月 {date.getDate()} 日 · 週{WEEKDAYS[date.getDay()]}
        </time>
        {moment.location && (
          <span className="moment-place">
            <PinIcon />
            {moment.location}
          </span>
        )}
        {!moment.is_public && <span className="badge">僅登入可見</span>}
      </p>
      <h3>{moment.title}</h3>
      {moment.description && <p className="moment-text">{moment.description}</p>}
      <PhotoGrid photos={moment.photos} title={moment.title} onOpen={onOpenPhoto} />
      {authed && (
        <p className="moment-actions">
          <button className="link" onClick={() => onEdit(moment)}>
            編輯
          </button>
          <button className="link danger" onClick={() => onDelete(moment)}>
            刪除
          </button>
        </p>
      )}
    </article>
  )
}

export default function Timeline({ moments, ...handlers }) {
  if (moments.length === 0) return null

  // Group consecutive moments (already newest first) under a year heading.
  const years = []
  for (const moment of moments) {
    const year = moment.date.slice(0, 4)
    if (years.at(-1)?.year !== year) years.push({ year, items: [] })
    years.at(-1).items.push(moment)
  }

  return (
    <div className="timeline">
      {years.map(({ year, items }) => (
        <section key={year} aria-label={`${year} 年`}>
          <h2 className="year">{year}</h2>
          {items.map((moment) => (
            <MomentCard key={moment.id} moment={moment} {...handlers} />
          ))}
        </section>
      ))}
    </div>
  )
}
