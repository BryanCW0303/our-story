import PhotoTimeline from '../photos/PhotoTimeline.jsx'
import RestaurantList from '../restaurants/RestaurantList.jsx'
import { KINDS } from './kinds.js'
import Icon from '../../components/Icon.jsx'
import { Badge } from '../../components/Landmark.jsx'

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
        <RestaurantList place={place} restaurants={restaurants} authed={authed} />
      ) : (
        <PhotoTimeline place={place} photos={photos} authed={authed} focusId={focusId} />
      )}
    </>
  )
}
