import { useEffect, useRef, useState } from 'react'
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
  const touchX = useRef(null)
  const canStep = photos.length > 1 && !paused

  useEffect(() => {
    const onKey = (event) => {
      // Not while editing, typing in any field, or with a dialog (login, delete) open.
      if (paused || document.querySelector('.backdrop')) return
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return
      if (event.key === 'ArrowLeft' && canStep) onStep(-1)
      if (event.key === 'ArrowRight' && canStep) onStep(1)
      if (event.key === 'Escape') window.location.hash = `#/p/${place.slug}`
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [paused, canStep, onStep, place.slug])

  return (
    <>
      <a className="back" href={`#/p/${place.slug}`}>
        <Icon name="back" /> 返回{place.name}
      </a>
      <div className="viewer">
        <div>
          <div
            className="frame"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              const moved = e.changedTouches[0].clientX - (touchX.current ?? e.changedTouches[0].clientX)
              if (canStep && Math.abs(moved) > 50) onStep(moved < 0 ? 1 : -1)
            }}
          >
            <img key={photo.id} src={photo.image} width={photo.width} height={photo.height} alt="" />
          </div>
          <div className="pager">
            <button className="round" onClick={() => onStep(-1)} disabled={!canStep} aria-label="上一張">
              <Icon name="prev" />
            </button>
            <span>
              {index + 1} / {photos.length}
            </span>
            <button className="round" onClick={() => onStep(1)} disabled={!canStep} aria-label="下一張">
              <Icon name="next" />
            </button>
          </div>
        </div>
        <div>
          <div className="stamp">
            <span className="date">{photo.taken_on.replaceAll('-', '.')}</span>
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
