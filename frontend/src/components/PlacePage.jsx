import { useEffect, useMemo, useRef } from 'react'
import { KINDS } from './Home.jsx'
import Icon from './Icon.jsx'
import { Badge } from './Landmark.jsx'
import { RestaurantArt } from './RestaurantPage.jsx'

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
function Timeline({ place, photos, authed, focusId }) {
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
                  {!photo.is_public && <Icon name="lock" />}
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

/** The place's favourite restaurants as a wall of covers. */
function Restaurants({ place, restaurants, authed }) {
  if (!restaurants) return <p className="muted center">載入中…</p>
  if (!restaurants.length) {
    return (
      <div className="empty">
        <p>這裡還沒有餐廳。</p>
        <p className="muted">{authed ? '按「新增餐廳」記下第一間。' : '登入後就可以新增。'}</p>
      </div>
    )
  }
  return (
    <div className="covers food">
      {restaurants.map((restaurant) => (
        <a className="cover" href={`#/p/${place.slug}/food/${restaurant.id}`} key={restaurant.id}>
          <RestaurantArt restaurant={restaurant} />
          <b>{restaurant.name}</b>
          <small>{restaurant.cuisine}</small>
        </a>
      ))}
    </div>
  )
}

/** One place, in two tabs: its photos on a timeline, and its favourite restaurants. */
export default function PlacePage({ place, tab, photos, restaurants, authed, focusId, onUpload, onAddRestaurant }) {
  const kindName = KINDS.find((group) => group.kind === place.kind)?.name
  const onFood = tab === 'food'

  return (
    <>
      <a className="back" href="#/">
        <Icon name="back" /> 所有地方
      </a>
      <div className="place-head">
        <Badge place={place} />
        <div>
          <h1>{place.name}</h1>
          <p>
            {kindName} · {place.photo_count} 張照片 · {place.restaurant_count} 間喜歡的餐廳
          </p>
        </div>
        {authed && (
          <div className="actions">
            {onFood ? (
              <button className="btn primary" onClick={onAddRestaurant}>
                <Icon name="plus" /> 新增餐廳
              </button>
            ) : (
              <button className="btn primary" onClick={onUpload}>
                <Icon name="upload" /> 上傳照片
              </button>
            )}
          </div>
        )}
      </div>

      <nav className="tabs">
        <a className={onFood ? 'tab' : 'tab on'} href={`#/p/${place.slug}`}>
          <Icon name="photo" />
          照片<small>{place.photo_count}</small>
        </a>
        <a className={onFood ? 'tab on' : 'tab'} href={`#/p/${place.slug}/food`}>
          <Icon name="food" />
          喜歡的餐廳<small>{place.restaurant_count}</small>
        </a>
      </nav>

      {onFood ? (
        <Restaurants place={place} restaurants={restaurants} authed={authed} />
      ) : (
        <Timeline place={place} photos={photos} authed={authed} focusId={focusId} />
      )}
    </>
  )
}
