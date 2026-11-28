import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import useRoute from './navigation/useRoute.js'
import PlaceRoute from './features/places/PlaceRoute.jsx'
import { PageFrame, Missing } from './components/PageFrame.jsx'
import SettingsForm from './features/settings/SettingsForm.jsx'
import { ACTIVITIES } from './features/activities/catalog.js'
import { api } from './api.js'
import ActivityPage from './features/activities/ActivityPage.jsx'
import Anniversary from './features/home/Anniversary.jsx'
import Home from './features/home/Home.jsx'
import HomePreview from './features/home/HomePreview.jsx'
import MeetingsPage from './features/meetings/MeetingsPage.jsx'
import useMeetings from './features/meetings/useMeetings.js'
import Icon from './components/Icon.jsx'

const Storybook = lazy(() => import('./features/storybook/Storybook.jsx'))

export default function App({ onLoggedOut }) {
  const [config, setConfig] = useState(null)
  const [places, setPlaces] = useState(null)
  const [error, setError] = useState('')
  const { meetings, totalDays, addMeeting } = useMeetings(setError)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const clearError = useCallback(() => setError(''), [])
  const { route, focusId, replacePhoto } = useRoute(clearError)
  const place = places?.find(p => p.slug === route.slug)
  const request = useRef(0)
  const loadPlaces = useCallback(() => {
    const id = ++request.current
    api('places/')
      .then(list => { if (request.current === id) setPlaces(list) })
      .catch(err => { if (request.current === id) setError(err.message) })
  }, [])

  useEffect(() => {
    api('config/')
      .then(setConfig)
      .catch(() => {})
    loadPlaces()
  }, [loadPlaces])

  useEffect(() => {
    if (config?.title) document.title = config.title
  }, [config])

  async function logout() {
    try {
      await api('logout/', { method: 'POST' })
      onLoggedOut()
    } catch (err) {
      setError(err.message)
    }
  }

  if (route.storybook) return <Suspense fallback={<p role="status">正在展開書頁…</p>}><Storybook /></Suspense>

  const activity = ACTIVITIES.find((entry) => entry.id === route.activity)
  let page
  if (route.meetings) {
    page = <MeetingsPage meetings={meetings} onAdd={addMeeting} />
  } else if (route.activity) {
    page = activity ? <ActivityPage activity={activity} /> : <Missing text="找不到這一頁。" href="#/" label="回到首頁" />
  } else if (!route.slug) {
    page = <HomePreview><Home onConfigSaved={setConfig} config={config} places={places} meetingDays={totalDays} authed onOpenSettings={() => setSettingsOpen(true)} /></HomePreview>
  } else if (!places) {
    page = <p className="muted center pad">載入中…</p>
  } else if (!place) {
    page = <Missing text="找不到這個地方。" href="#/" label="回到首頁" />
  } else {
    page = (
      <PlaceRoute
        key={place.slug}
        place={place}
        route={route}
        focusId={focusId}
        replacePhoto={replacePhoto}
        onChange={loadPlaces}
        error={error}
        setError={setError}
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
          {config && (
            <button className="pill" onClick={() => setSettingsOpen(true)}>
              設定
            </button>
          )}
          <button className="pill" onClick={logout}>登出</button>
        </nav>
      </header>

      {place ? page : <PageFrame key={route.activity ?? 'home'} error={error}>{page}</PageFrame>}

      <Anniversary eligible={!route.slug && !route.activity && !route.meetings && !settingsOpen} />

      {settingsOpen && config && (
        <SettingsForm
          config={config}
          onClose={() => setSettingsOpen(false)}
          onSaved={(next) => {
            setConfig(next)
            setSettingsOpen(false)
          }}
        />
      )}
    </>
  )
}
