import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { api, REFUSED } from '../../api.js'
import LoginForm from './LoginForm.jsx'

const MemberApp = lazy(() => import('../../App.jsx'))

export default function SessionGate() {
  const [session, setSession] = useState(null)
  const [loginOpen, setLoginOpen] = useState(false)

  const version = useRef(0)

  function changeSession(next) {
    version.current += 1
    setSession(next)
    setLoginOpen(false)
  }

  useEffect(() => {
    let current = true
    const refresh = async () => {
      const request = ++version.current
      const next = await api('session/').catch(() => null)
      if (current && request === version.current) setSession(next)
    }
    const onVisible = () => {
      if (!document.hidden) refresh()
    }
    refresh()
    window.addEventListener(REFUSED, refresh)
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      current = false
      window.removeEventListener(REFUSED, refresh)
      window.removeEventListener('pageshow', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    if (!session?.authenticated) document.title = 'memories'
  }, [session])

  if (session?.authenticated) {
    return (
      <Suspense fallback={<p className="center" role="status">正在載入相簿…</p>}>
        <MemberApp key={session.username} onLoggedOut={() => changeSession(null)} />
      </Suspense>
    )
  }
  return (
    <main className="hero">
      <h1>Hi, 歡迎來到memories</h1>
      <button className="btn primary" onClick={() => setLoginOpen(true)}>登入</button>
      {loginOpen && (
        <LoginForm onClose={() => setLoginOpen(false)} onLoggedIn={changeSession} />
      )}
    </main>
  )
}
