import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../api.js'
import { todayString } from '../../dates.js'
import './Anniversary.css'

function Folio({ photos, onClose }) {
  const panel = useRef(null)
  const [index, setIndex] = useState(0)
  const photo = photos[index]
  useEffect(() => {
    const dialog = panel.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  function step(delta) {
    setIndex(i => Math.max(0, Math.min(photos.length - 1, i + delta)))
  }
  return createPortal(
    <dialog className="anniversary" ref={panel} aria-labelledby="anniversary-title"
      onCancel={e => { e.preventDefault(); onClose() }}
      onClick={e => {
        if (e.target !== panel.current) return
        const box = panel.current.getBoundingClientRect()
        if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) onClose()
      }}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          step(e.key === 'ArrowLeft' ? -1 : 1)
        }
      }}>
      <header><strong id="anniversary-title">那年今日</strong>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="關閉回憶">×</button>
      </header>
      <div className="anniversary-spread">
        <div className="anniversary-mount"><img key={photo.id} src={photo.image} alt={photo.city + '相簿，第 ' + (index + 1) + ' 張照片'} /></div>
        <section><small>一年前的今天</small><h2>{photo.city}</h2>
          <time dateTime={photo.date}>{photo.date.replaceAll('-', '.')}</time>
          {photo.note && <p>{photo.note}</p>}
          <footer><small aria-live="polite">{index + 1} / {photos.length} 張</small>
            {photos.length > 1 && <div>
              <button type="button" disabled={!index} onClick={() => step(-1)} aria-label="上一張">←</button>
              <button type="button" disabled={index === photos.length - 1} onClick={() => step(1)} aria-label="下一張">→</button>
            </div>}
          </footer>
        </section>
      </div>
    </dialog>, document.body)
}

export default function Anniversary({ eligible }) {
  const [memory, setMemory] = useState(null)
  const pending = useRef(null)
  const claimed = useRef(null)

  useEffect(() => {
    if (!eligible) return
    function check() {
      const day = todayString()
      if (document.hidden || claimed.current === day || pending.current === day) return
      pending.current = day
      api('anniversary/', { method: 'POST', json: { local_day: day } })
        .then(photos => {
          if (day === todayString() && photos.length) {
            claimed.current = day
            setMemory({ day, photos })
          }
        })
        .catch(() => {}) // The homepage remains usable if the optional memory request fails.
        .finally(() => { if (pending.current === day) pending.current = null })
    }
    const timer = setTimeout(check, 0)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('pageshow', check)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('pageshow', check)
    }
  }, [eligible])

  return eligible && memory?.day === todayString()
    ? <Folio photos={memory.photos} onClose={() => setMemory(null)} />
    : null
}
