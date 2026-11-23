import { useCallback, useEffect, useRef, useState } from 'react'
import { ACTIVITIES } from './activities.js'
import { api, REFUSED } from './api.js'
import ActivityPage from './components/ActivityPage.jsx'
import Home from './components/Home.jsx'
import Icon from './components/Icon.jsx'
import LoginForm from './components/LoginForm.jsx'
import PhotoPage from './components/PhotoPage.jsx'
import PlacePage from './components/PlacePage.jsx'
import RestaurantForm from './components/RestaurantForm.jsx'
import RestaurantPage from './components/RestaurantPage.jsx'
import SettingsForm from './components/SettingsForm.jsx'
import UploadForm from './components/UploadForm.jsx'

// Pages live in the URL hash so the browser's back button and shared links work:
//   #/               home (the places)
//   #/p/tokyo          one place: its photo timeline
//   #/p/tokyo/12       one photo
//   #/p/tokyo/food     the same place: its favourite restaurants
//   #/p/tokyo/food/3   one restaurant
//   #/a/film           one kind of activity (films, LEGO, games)
function readRoute() {
  const hash = window.location.hash
  const [, slug, food, id] = hash.match(/^#\/p\/([\w-]+)(?:\/(food))?(?:\/(\d+))?$/) ?? []
  const [, activity] = hash.match(/^#\/a\/([\w-]+)$/) ?? []
  return {
    slug: slug ?? null,
    tab: food ? 'food' : 'photos',
    photoId: !food && id ? Number(id) : null,
    restaurantId: food && id ? Number(id) : null,
    activity: activity ?? null,
  }
}

const oldestFirst = (a, b) => a.taken_on.localeCompare(b.taken_on) || a.id - b.id

export default function App() {
  const [route, setRoute] = useState(readRoute)
  const [session, setSession] = useState(null)
  const [config, setConfig] = useState(null)
  const [places, setPlaces] = useState(null)
  const [album, setAlbum] = useState({ slug: null, photos: null }) // the photos of the place being viewed
  const [menu, setMenu] = useState({ slug: null, restaurants: null }) // and its favourite restaurants
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null) // 'login' | 'settings' | 'upload' | 'restaurant'
  const current = useRef(route) // the route as of the last navigation, for the listeners below
  const lastPhoto = useRef(null) // the photo just left, so its place's timeline can scroll back to it

  const authed = Boolean(session?.authenticated)
  const place = places?.find((p) => p.slug === route.slug) ?? null
  const photos = album.slug === route.slug ? album.photos : null
  const index = photos && route.photoId ? photos.findIndex((p) => p.id === route.photoId) : -1
  const restaurants = menu.slug === route.slug ? menu.restaurants : null
  const restaurant = restaurants?.find((r) => r.id === route.restaurantId) ?? null

  useEffect(() => {
    const onChange = () => {
      const previous = current.current
      const next = readRoute()
      current.current = next
      // Returning from a photo to its place keeps your spot in the timeline (PlacePage scrolls to it).
      const returning = Boolean(previous.photoId) && !next.photoId && next.slug === previous.slug
      lastPhoto.current = returning ? previous.photoId : null
      setRoute(next)
      setError('')
      if (!returning) window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const loadPlaces = useCallback(() => {
    api('places/')
      .then(setPlaces)
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    // The session call also hands the browser its CSRF cookie.
    api('session/')
      .then(setSession)
      .catch((err) => setError(err.message))
    api('config/')
      .then(setConfig)
      .catch(() => {})
    loadPlaces()
  }, [loadPlaces])

  useEffect(() => {
    if (config?.title) document.title = config.title
  }, [config])

  // A refused request means the page's idea of who is signed in is out of date (the session ran out,
  // or was ended elsewhere): ask again, so the login button comes back instead of every save failing.
  useEffect(() => {
    const refresh = () => {
      api('session/')
        .then(setSession)
        .catch(() => {})
      loadPlaces()
    }
    window.addEventListener(REFUSED, refresh)
    return () => window.removeEventListener(REFUSED, refresh)
  }, [loadPlaces])

  // Load the place's photos; again after logging in or out, since that changes what is visible.
  const slug = place?.slug ?? null
  useEffect(() => {
    if (!slug) return
    let stale = false
    setAlbum((current) => (current.slug === slug ? current : { slug, photos: null }))
    api(`places/${slug}/photos/`)
      .then((list) => !stale && setAlbum({ slug, photos: list }))
      .catch((err) => !stale && setError(err.message))
    return () => {
      stale = true
    }
  }, [slug, authed])

  // Restaurants are the same for everyone, so they only reload when the place changes.
  useEffect(() => {
    if (!slug) return
    let stale = false
    setMenu((current) => (current.slug === slug ? current : { slug, restaurants: null }))
    api(`places/${slug}/restaurants/`)
      .then((list) => !stale && setMenu({ slug, restaurants: list }))
      .catch((err) => !stale && setError(err.message))
    return () => {
      stale = true
    }
  }, [slug])

  // After any change, the places are fetched again: their counts and dates come from the server.
  const updatePhotos = (change) => {
    setAlbum((current) => (current.photos ? { ...current, photos: change(current.photos).sort(oldestFirst) } : current))
    loadPlaces()
  }
  const updateRestaurants = (change) => {
    setMenu((current) => (current.restaurants ? { ...current, restaurants: change(current.restaurants) } : current))
    loadPlaces()
  }

  // Stepping between photos replaces the history entry, so "back" returns to the timeline in one go.
  const step = useCallback(
    (delta) => {
      if (!photos || index < 0) return
      const next = photos[(index + delta + photos.length) % photos.length]
      window.history.replaceState(null, '', `#/p/${slug}/${next.id}`)
      current.current = readRoute()
      setRoute(current.current)
    },
    [photos, index, slug],
  )

  async function logout() {
    try {
      setSession(await api('logout/', { method: 'POST' }))
      loadPlaces()
    } catch (err) {
      setError(err.message)
    }
  }

  const activity = ACTIVITIES.find((entry) => entry.id === route.activity)
  let page
  if (route.activity) {
    page = activity ? <ActivityPage activity={activity} /> : <Missing text="找不到這一頁。" href="#/" label="回到首頁" />
  } else if (!route.slug) {
    page = <Home config={config} places={places} authed={authed} onOpenSettings={() => setModal('settings')} />
  } else if (!places) {
    page = <p className="muted center pad">載入中…</p>
  } else if (!place) {
    page = <Missing text="找不到這個地方。" href="#/" label="回到首頁" />
  } else if (route.restaurantId) {
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
          authed={authed}
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
        authed={authed}
        focusId={lastPhoto.current}
        onUpload={() => setModal('upload')}
        onAddRestaurant={() => setModal('restaurant')}
      />
    )
  } else if (!photos) {
    page = <p className="muted center pad">載入中…</p>
  } else if (index < 0) {
    page = <Missing text="找不到這張照片，可能已經刪除，或是需要登入才看得到。" href={`#/p/${slug}`} label={`回到${place.name}`} />
  } else {
    page = (
      <PhotoPage
        place={place}
        photos={photos}
        index={index}
        authed={authed}
        onStep={step}
        onChanged={(saved) => updatePhotos((list) => list.map((p) => (p.id === saved.id ? saved : p)))}
        onDeleted={(gone) => {
          updatePhotos((list) => list.filter((p) => p.id !== gone.id))
          window.location.hash = `#/p/${slug}`
        }}
      />
    )
  }

  return (
    <>
      <header className="nav">
        <a className="brand" href="#/">
          <Icon name="heart" />
          {config?.title ?? ''}
        </a>
        <nav>
          {authed && config && (
            <button className="pill" onClick={() => setModal('settings')}>
              設定
            </button>
          )}
          {authed ? (
            <button className="pill" onClick={logout}>
              登出
            </button>
          ) : (
            session && (
              <button className="pill" onClick={() => setModal('login')}>
                登入
              </button>
            )
          )}
        </nav>
      </header>

      {/* The key replays the entrance animation when the page changes, but not between photos or tabs. */}
      <main key={`${route.activity ? `a-${route.activity}` : (route.slug ?? 'home')}:${route.photoId ? 'photo' : route.restaurantId ? 'restaurant' : 'list'}`}>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {page}
      </main>

      {modal === 'login' && (
        <LoginForm
          onClose={() => setModal(null)}
          onLoggedIn={(next) => {
            setSession(next)
            setModal(null)
            loadPlaces()
          }}
        />
      )}
      {modal === 'settings' && config && (
        <SettingsForm
          config={config}
          onClose={() => setModal(null)}
          onSaved={(next) => {
            setConfig(next)
            setModal(null)
          }}
        />
      )}
      {modal === 'upload' && place && (
        <UploadForm
          place={place}
          onClose={() => setModal(null)}
          onUploaded={(photo) => updatePhotos((list) => [...list, photo])}
        />
      )}
      {modal === 'restaurant' && place && (
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

function Missing({ text, href, label }) {
  return (
    <div className="empty pad">
      <p>{text}</p>
      <a className="btn ghost" href={href}>
        {label}
      </a>
    </div>
  )
}
