import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * Centered dialog. Esc or a click on the backdrop closes it unless `locked`.
 * Rendered straight into <body>, so an animated ancestor cannot throw off its full-screen backdrop.
 */
export default function Modal({ title, onClose, locked = false, children }) {
  const panel = useRef(null)

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && !locked) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [onClose, locked])

  useEffect(() => {
    panel.current?.querySelector('input:not([type=file]), textarea')?.focus()
  }, [])

  return createPortal(
    <div
      className="backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !locked) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={panel}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} disabled={locked} aria-label="關閉" type="button">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
