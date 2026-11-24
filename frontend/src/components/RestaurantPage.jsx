import { useEffect, useRef, useState } from 'react'
import { api, NOTE_MAX } from '../api.js'
import Icon from './Icon.jsx'
import Modal from './Modal.jsx'
import RestaurantForm from './RestaurantForm.jsx'

export default function RestaurantPage({ place, restaurant, authed, onChanged, onDeleted }) {
  const [draft, setDraft] = useState(null) // the note text while it is being edited
  const [dialog, setDialog] = useState(null) // 'edit' | 'delete'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const field = useRef(null)

  const editing = draft !== null
  useEffect(() => {
    if (editing) field.current?.focus()
  }, [editing])

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [restaurant.name, place.name].filter(Boolean).join(' '),
  )}`

  async function saveNote() {
    setBusy(true)
    setError('')
    try {
      onChanged(await api(`restaurants/${restaurant.id}/`, { method: 'PATCH', json: { note: draft } }))
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
      await api(`restaurants/${restaurant.id}/`, { method: 'DELETE' })
      onDeleted(restaurant)
    } catch (err) {
      setError(err.message)
      setBusy(false)
      setDialog(null)
    }
  }

  return (
    <>
      <a className="back" href={`#/p/${place.slug}/food`}>
        <Icon name="back" /> 返回{place.name}
      </a>
      <section className="restaurant-detail">
        <div className="stamp">
          <span className="where">
            <Icon name="pin" /> {place.name}
          </span>
        </div>
        <h1 className="rest-name">{restaurant.name}</h1>

        <div className="letter">
          {editing ? (
            <textarea
              ref={field}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={NOTE_MAX}
              placeholder="寫下關於這間餐廳的話…"
              aria-label="留言"
            />
          ) : restaurant.note ? (
            <>
              <p>{restaurant.note}</p>
              {restaurant.note_by && <p className="sign">—— {restaurant.note_by}</p>}
            </>
          ) : (
            <p className="none">還沒有留言。</p>
          )}
        </div>

        <ul className="facts">
          {restaurant.must_order && (
            <li>
              <Icon name="star" /> 必點：{restaurant.must_order}
            </li>
          )}
          <li>
            <Icon name="pin" />
            <a href={mapUrl} target="_blank" rel="noopener noreferrer">在地圖上看</a>
          </li>
        </ul>

        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}

        {authed && (
          <div className="edit">
            {editing ? (
              <>
                <button className="btn primary" onClick={saveNote} disabled={busy}>
                  {busy ? '儲存中…' : '儲存留言'}
                </button>
                <button className="btn ghost" onClick={() => setDraft(null)} disabled={busy}>
                  取消
                </button>
              </>
            ) : (
              <>
                <button className="btn primary" onClick={() => setDraft(restaurant.note)}>
                  <Icon name="pencil" /> {restaurant.note ? '編輯留言' : '寫留言'}
                </button>
                <button className="btn ghost" onClick={() => setDialog('edit')}>
                  編輯餐廳
                </button>
                <button className="btn ghost danger" onClick={() => setDialog('delete')}>
                  <Icon name="trash" /> 刪除
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {dialog === 'edit' && (
        <RestaurantForm
          place={place}
          restaurant={restaurant}
          onClose={() => setDialog(null)}
          onSaved={(saved) => {
            onChanged(saved)
            setDialog(null)
          }}
        />
      )}
      {dialog === 'delete' && (
        <Modal title="刪除這間餐廳？" onClose={() => setDialog(null)} locked={busy}>
          <p className="muted">餐廳的資料和留言會一起刪除，刪除後無法復原。</p>
          <div className="form-actions">
            <button className="btn ghost" onClick={() => setDialog(null)} disabled={busy}>
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
