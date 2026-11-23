import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts ship with the site (no outside font service): serif for headings, a brush-like kai for notes.
import '@fontsource/noto-serif-tc/500.css'
import '@fontsource/noto-serif-tc/700.css'
import '@fontsource/lxgw-wenkai-tc/400.css'
import SessionGate from './SessionGate.jsx'
import './styles.css'

// A tab opened before a deployment may still reference the previous member bundle.
const retryKey = 'memories:bundle-retry'
window.addEventListener('vite:preloadError', () => {
  const now = Date.now()
  if (now - Number(sessionStorage.getItem(retryKey)) > 60_000) {
    sessionStorage.setItem(retryKey, String(now))
    window.location.reload()
  }
})

class PageBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="hero">
          <p role="alert">相簿未能載入，請重新載入頁面。</p>
          <button className="btn primary" onClick={() => window.location.reload()}>重新載入</button>
        </main>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PageBoundary>
      <SessionGate />
    </PageBoundary>
  </StrictMode>,
)
