import { useState } from 'react'
import { PageFrame, Missing } from '../../components/PageFrame.jsx'
import usePlaceCollection from './usePlaceCollection.js'
import PhotoPage from '../photos/PhotoPage.jsx'
import PlacePage from './PlacePage.jsx'
import RestaurantForm from '../restaurants/RestaurantForm.jsx'
import RestaurantPage from '../restaurants/RestaurantPage.jsx'
import UploadForm from '../photos/UploadForm.jsx'

const oldestFirst = (a, b) => a.taken_on.localeCompare(b.taken_on) || a.id - b.id

export default function PlaceRoute({ place, route, focusId, replacePhoto, onChange, error, setError }) {
  const { slug } = place
  const [modal, setModal] = useState(null)
  const [photos, changePhotos] = usePlaceCollection(`places/${slug}/photos/`, setError)
  const [restaurants, changeRestaurants] = usePlaceCollection(`places/${slug}/restaurants/`, setError)
  const index = photos?.findIndex(p => p.id === route.photoId) ?? -1
  const restaurant = restaurants?.find(r => r.id === route.restaurantId)

  function step(delta) {
    if (index < 0) return
    const next = photos[(index + delta + photos.length) % photos.length]
    replacePhoto(slug, next.id)
  }

  function updatePhotos(change) {
    changePhotos(list => change(list).sort(oldestFirst))
    onChange()
  }

  function updateRestaurants(change) {
    changeRestaurants(change)
    onChange()
  }

  let page
  if (route.restaurantId) {
    if (!restaurants) {
      page = <p className="muted center pad">載入中…</p>
    } else if (!restaurant) {
      page = <Missing text="找不到這間餐廳，可能已經刪除。" href={`#/p/${slug}/food`} label={`回到${place.name}`} />
    } else {
      page = (
        <RestaurantPage
          key={restaurant.id}
          place={place}
          restaurant={restaurant}
          authed
          onChanged={(saved) => updateRestaurants((list) => list.map((r) => (r.id === saved.id ? saved : r)))}
          onDeleted={(gone) => {
            updateRestaurants((list) => list.filter((r) => r.id !== gone.id))
            window.location.hash = `#/p/${slug}/food`
          }}
        />
      )
    }
  } else if (!route.photoId) {
    page = (
      <PlacePage
        place={place}
        tab={route.tab}
        photos={photos}
        restaurants={restaurants}
        authed
        focusId={focusId}
        onUpload={() => setModal('upload')}
        onAddRestaurant={() => setModal('restaurant')}
      />
    )
  } else if (!photos) {
    page = <p className="muted center pad">載入中…</p>
  } else if (index < 0) {
    page = <Missing text="找不到這張照片，可能已經刪除。" href={`#/p/${slug}`} label={`回到${place.name}`} />
  } else {
    page = (
      <PhotoPage
        place={place}
        photos={photos}
        index={index}
        authed
        onStep={step}
        onChanged={(saved) => updatePhotos((list) => list.map((p) => (p.id === saved.id ? saved : p)))}
        onDeleted={(gone) => {
          updatePhotos((list) => list.filter((p) => p.id !== gone.id))
          window.location.hash = `#/p/${slug}`
        }}
      />
    )
  }

  const view = route.photoId ? 'photo' : route.restaurantId ? 'restaurant' : 'list'
  return (
    <>
      <PageFrame key={view} error={error}>{page}</PageFrame>
      {modal === 'upload' && (
        <UploadForm
          place={place}
          onClose={() => setModal(null)}
          onUploaded={(photo) => updatePhotos((list) => [...list, photo])}
        />
      )}
      {modal === 'restaurant' && (
        <RestaurantForm
          place={place}
          onClose={() => setModal(null)}
          onSaved={(saved) => {
            updateRestaurants((list) => [...list, saved])
            setModal(null)
          }}
        />
      )}
    </>
  )
}
