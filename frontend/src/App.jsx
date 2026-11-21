import { useCallback, useEffect, useState } from 'react'
import { api, parseDate } from './api.js'
import Lightbox from './components/Lightbox.jsx'
import LoginForm from './components/LoginForm.jsx'
import MomentEditor from './components/MomentEditor.jsx'
import SettingsForm from './components/SettingsForm.jsx'
import Timeline from './components/Timeline.jsx'

const DAY_MS = 24 * 60 * 60 * 1000

function daysTogether(startDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Rounding absorbs daylight-saving shifts; the first day counts as day 1.
  return Math.round((today - parseDate(startDate)) / DAY_MS) + 1
}

function Hero({ config, authed, onOpenSettings }) {
  const hasNames = config.name_a && config.name_b
  const days = config.start_date ? daysTogether(config.start_date) : null
  const start = config.start_date ? parseDate(config.start_date) : null

  return (
    <section className="hero">
      <p className="hero-eyebrow">{hasNames ? config.title : 'Our Story'}</p>
      <h1 className="hero-names">
        {hasNames ? (
          <>
            {config.name_a} <span className="hero-amp">&amp;</span> {config.name_b}
          </>
        ) : (
          config.title
        )}
      </h1>
      {days !== null && days > 0 && (
        <p className="hero-days">
          在一起的第 <strong>{days.toLocaleString()}</strong> 天
          <span className="hero-since">
            自 {start.getFullYear()} 年 {start.getMonth() + 1} 月 {start.getDate()} 日
          </span>
        </p>
      )}
      {days === null && authed && (
        <button className="link" onClick={onOpenSettings}>
          填上兩個人的名字和在一起的日期
        </button>
      )}
    </section>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [config, setConfig] = useState(null)
  const [moments, setMoments] = useState([])
  const [nextPage, setNextPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null) // {type: 'login' | 'settings' | 'moment', moment?}
  const [lightbox, setLightbox] = useState(null) // {photos, index}

  const authed = Boolean(session?.authenticated)

  const loadMoments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const page = await api('moments/')
      setMoments(page.results)
      setNextPage(page.next ? 2 : null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // The session call must finish first: it sets the CSRF cookie.
    api('session/')
      .then(setSession)
      .catch((err) => setError(err.message))
    api('config/')
      .then(setConfig)
      .catch(() => {})
    loadMoments()
  }, [loadMoments])

  useEffect(() => {
    if (config?.title) document.title = config.title
  }, [config])

  async function loadMore() {
    setLoading(true)
    try {
      const page = await api(`moments/?page=${nextPage}`)
      setMoments((current) => [...current, ...page.results])
      setNextPage(page.next ? nextPage + 1 : null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    try {
      setSession(await api('logout/', { method: 'POST' }))
      loadMoments()
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeMoment(moment) {
    if (!window.confirm(`確定要刪除「${moment.title}」和裡面的 ${moment.photos.length} 張照片嗎？刪除後無法復原。`)) return
    try {
      await api(`moments/${moment.id}/`, { method: 'DELETE' })
      setMoments((current) => current.filter((m) => m.id !== moment.id))
    } catch (err) {
      setError(err.message)
    }
  }

  const closeModal = () => setModal(null)

  return (
    <>
      <header className="topbar">
        <span className="brand">{config?.title ?? ''}</span>
        <nav>
          {authed ? (
            <>
              <button className="btn primary" onClick={() => setModal({ type: 'moment' })}>
                新增回憶
              </button>
              <button className="btn ghost" onClick={() => setModal({ type: 'settings' })}>
                設定
              </button>
              <button className="btn ghost" onClick={logout}>
                登出
              </button>
            </>
          ) : (
            session && (
              <button className="btn ghost" onClick={() => setModal({ type: 'login' })}>
                登入
              </button>
            )
          )}
        </nav>
      </header>

      <main>
        {config && <Hero config={config} authed={authed} onOpenSettings={() => setModal({ type: 'settings' })} />}

        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}

        <Timeline
          moments={moments}
          authed={authed}
          onOpenPhoto={(photos, index) => setLightbox({ photos, index })}
          onEdit={(moment) => setModal({ type: 'moment', moment })}
          onDelete={removeMoment}
        />

        {!loading && !error && moments.length === 0 && (
          <div className="empty">
            <p>這裡還沒有任何回憶。</p>
            {authed ? (
              <button className="btn primary" onClick={() => setModal({ type: 'moment' })}>
                寫下第一個
              </button>
            ) : (
              <p className="muted">登入後就可以開始記錄。</p>
            )}
          </div>
        )}

        {loading && <p className="muted center">載入中…</p>}
        {!loading && nextPage && (
          <p className="center">
            <button className="btn ghost" onClick={loadMore}>
              載入更早的回憶
            </button>
          </p>
        )}
      </main>

      <footer className="footer">{config?.title}</footer>

      {modal?.type === 'login' && (
        <LoginForm
          onClose={closeModal}
          onLoggedIn={(next) => {
            setSession(next)
            closeModal()
            loadMoments()
          }}
        />
      )}
      {modal?.type === 'settings' && config && (
        <SettingsForm
          config={config}
          onClose={closeModal}
          onSaved={(next) => {
            setConfig(next)
            closeModal()
          }}
        />
      )}
      {modal?.type === 'moment' && (
        <MomentEditor
          moment={modal.moment}
          onClose={closeModal}
          onSaved={() => {
            closeModal()
            loadMoments()
          }}
        />
      )}
      {lightbox && <Lightbox photos={lightbox.photos} startIndex={lightbox.index} onClose={() => setLightbox(null)} />}
    </>
  )
}
