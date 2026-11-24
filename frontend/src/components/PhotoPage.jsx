import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { api, NOTE_MAX } from '../api.js'
import Icon from './Icon.jsx'
import Modal from './Modal.jsx'

/** The note on its sheet of letter paper, plus the buttons to edit it or delete the photo. */
function Note({ photo, authed, onChanged, onDeleted, onBusy }) {
  const [draft, setDraft] = useState(null) // non-null while editing
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const field = useRef(null)

  // Moving to another photo would throw away what is being typed, so it waits until this is done.
  useEffect(() => {
    onBusy(Boolean(draft) || confirming)
    return () => onBusy(false)
  }, [draft, confirming, onBusy])

  const editing = Boolean(draft)
  useEffect(() => {
    if (editing) field.current?.focus()
  }, [editing])

  async function save() {
    setBusy(true)
    setError('')
    try {
      onChanged(await api(`photos/${photo.id}/`, { method: 'PATCH', json: draft }))
      setDraft(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError('')
    try {
      await api(`photos/${photo.id}/`, { method: 'DELETE' })
      onDeleted(photo)
    } catch (err) {
      setError(err.message)
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <>
      <div className="letter">
        {draft ? (
          <textarea
            ref={field}
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            maxLength={NOTE_MAX}
            placeholder="寫下關於這張照片的話…"
            aria-label="留言"
          />
        ) : photo.note ? (
          <>
            <p>{photo.note}</p>
            {photo.note_by && <p className="sign">—— {photo.note_by}</p>}
          </>
        ) : (
          <p className="none">這張照片還沒有留言。</p>
        )}
      </div>

      {draft && (
        <div className="edit-fields">
          <label>
            拍攝日期
            <input
              type="date"
              value={draft.taken_on}
              onChange={(e) => setDraft({ ...draft, taken_on: e.target.value })}
              required
            />
          </label>
        </div>
      )}

      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      {authed && (
        <div className="edit">
          {draft ? (
            <>
              <button className="btn primary" onClick={save} disabled={busy || !draft.taken_on}>
                {busy ? '儲存中…' : '儲存'}
              </button>
              <button className="btn ghost" onClick={() => setDraft(null)} disabled={busy}>
                取消
              </button>
            </>
          ) : (
            <>
              <button
                className="btn primary"
                onClick={() => setDraft({ note: photo.note, taken_on: photo.taken_on })}
              >
                <Icon name="pencil" /> 編輯照片
              </button>
              <button className="btn ghost danger" onClick={() => setConfirming(true)}>
                <Icon name="trash" /> 刪除照片
              </button>
            </>
          )}
        </div>
      )}

      {confirming && (
        <Modal title="刪除這張照片？" onClose={() => setConfirming(false)} locked={busy}>
          <p className="muted">照片和留言會一起刪除，刪除後無法復原。</p>
          <div className="form-actions">
            <button className="btn ghost" onClick={() => setConfirming(false)} disabled={busy}>
              取消
            </button>
            <button className="btn primary" onClick={remove} disabled={busy}>
              {busy ? '刪除中…' : '刪除'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

/** One photo: the picture on the left, its note on the right. Arrow keys and swipes move through the place. */
export default function PhotoPage({ place, photos, index, authed, onStep, onChanged, onDeleted }) {
  const photo = photos[index]
  const [paused, setPaused] = useState(false) // while the note is being edited or the delete dialog is open
  const track = useRef(null)
  const drag = useRef(null)
  const arrival = useRef(null)
  const previousDate = useRef(photo.taken_on)
  const stamp = useRef(null)
  const canStep = photos.length > 1 && !paused

  const step = useCallback((direction, offset = 0) => {
    if (!canStep) return
    drag.current = null
    arrival.current = direction * track.current.clientWidth + offset
    onStep(direction)
  }, [canStep, onStep])

  useLayoutEffect(() => {
    const strip = track.current
    strip.style.translate = ''
    if (arrival.current !== null && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      strip.animate([{ translate: arrival.current + 'px' }, { translate: '0px' }],
        { duration: 300, easing: 'cubic-bezier(.22,.72,.24,1)' })
    }
    arrival.current = null
    drag.current = null
    return () => strip.getAnimations().forEach(animation => animation.cancel())
  }, [photo.id])

  useLayoutEffect(() => {
    if (previousDate.current !== photo.taken_on && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stamp.current.animate([{ transform: 'translateY(7px)', opacity: .2 }, { transform: 'translateY(0)', opacity: 1 }],
        { duration: 220, easing: 'ease-out' })
    }
    previousDate.current = photo.taken_on
  }, [photo.taken_on])

  function finishDrag(event) {
    if (drag.current?.id !== event.pointerId) return
    const distance = event.clientX - drag.current.x
    const width = track.current.clientWidth
    drag.current = null
    if (canStep && event.type === 'pointerup' && Math.abs(distance) > Math.min(55, width * .15)) {
      step(distance < 0 ? 1 : -1, Math.max(-width, Math.min(width, distance)))
    } else {
      const from = track.current.style.translate
      track.current.style.translate = ''
      if (from && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        track.current.animate([{ translate: from }, { translate: '0px' }], { duration: 160 })
      }
    }
  }

  useEffect(() => {
    const onKey = (event) => {
      // Not while editing, typing in any field, or with a dialog (login, delete) open.
      if (paused || document.querySelector('.backdrop')) return
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return
      if (event.key === 'ArrowLeft' && canStep) step(-1)
      if (event.key === 'ArrowRight' && canStep) step(1)
      if (event.key === 'Escape') window.location.hash = `#/p/${place.slug}`
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [paused, canStep, step, place.slug])

  return (
    <>
      <a className="back" href={`#/p/${place.slug}`}>
        <Icon name="back" /> 返回{place.name}
      </a>
      <div className="viewer">
        <div>
          <div className="frame album-frame">
            <div className="album-window"
              onPointerDown={e => {
                if (!canStep || !e.isPrimary || e.button !== 0) return
                track.current.getAnimations().forEach(animation => animation.cancel())
                drag.current = { id: e.pointerId, x: e.clientX }
                e.currentTarget.setPointerCapture(e.pointerId)
              }}
              onPointerMove={e => {
                if (drag.current?.id !== e.pointerId) return
                const width = track.current.clientWidth
                track.current.style.translate = Math.max(-width, Math.min(width, e.clientX - drag.current.x)) + 'px'
              }}
              onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}
            >
              <div ref={track} className="album-track">
                {[-1, 0, 1].map(offset => {
                  const item = photos[(index + offset + photos.length) % photos.length]
                  return <div className="album-slide" key={offset} aria-hidden={offset !== 0}>
                    {(offset === 0 || photos.length > 1) && <img src={item.image} width={item.width} height={item.height}
                      draggable={false} alt={place.name + '相簿照片'} />}
                  </div>
                })}
              </div>
            </div>
          </div>
          <div className="pager">
            <button className="round" onClick={() => step(-1)} disabled={!canStep} aria-label="上一張">
              <Icon name="prev" />
            </button>
            <span>
              {index + 1} / {photos.length}
            </span>
            <button className="round" onClick={() => step(1)} disabled={!canStep} aria-label="下一張">
              <Icon name="next" />
            </button>
          </div>
        </div>
        <div>
          <div className="stamp">
            <time ref={stamp} className="date" dateTime={photo.taken_on}>{photo.taken_on.replaceAll('-', '.')}</time>
            <span className="where">
              <Icon name="pin" /> {place.name}
            </span>
          </div>
          <Note
            key={photo.id}
            photo={photo}
            authed={authed}
            onChanged={onChanged}
            onDeleted={onDeleted}
            onBusy={setPaused}
          />
        </div>
      </div>
    </>
  )
}
