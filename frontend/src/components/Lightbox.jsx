import { useEffect, useRef, useState } from 'react'

/** Full-screen photo viewer: arrow keys / buttons to move, Esc or backdrop to close. */
export default function Lightbox({ photos, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex)
  const many = photos.length > 1
  const touchX = useRef(0)

  useEffect(() => {
    const step = (delta) => setIndex((i) => (i + delta + photos.length) % photos.length)
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [photos.length, onClose])

  const step = (delta) => (event) => {
    event.stopPropagation()
    setIndex((i) => (i + delta + photos.length) % photos.length)
  }

  // Swipe left / right on a phone.
  const onTouchStart = (event) => {
    touchX.current = event.touches[0].clientX
  }
  const onTouchEnd = (event) => {
    const moved = event.changedTouches[0].clientX - touchX.current
    if (many && Math.abs(moved) > 50) setIndex((i) => (i + (moved < 0 ? 1 : -1) + photos.length) % photos.length)
  }

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="照片"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <img key={photos[index].id} src={photos[index].image} alt="" onClick={(e) => e.stopPropagation()} />
      <button className="lightbox-btn close" onClick={onClose} aria-label="關閉">
        ×
      </button>
      {many && (
        <>
          <button className="lightbox-btn prev" onClick={step(-1)} aria-label="上一張">
            ‹
          </button>
          <button className="lightbox-btn next" onClick={step(1)} aria-label="下一張">
            ›
          </button>
          <span className="lightbox-count">
            {index + 1} / {photos.length}
          </span>
        </>
      )}
    </div>
  )
}
