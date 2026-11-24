import { useState } from 'react'
import { api } from '../../api.js'
import Modal from '../../components/Modal.jsx'

/** Add a favourite restaurant to a place, or edit one (pass `restaurant`). Only the name is required. */
export default function RestaurantForm({ place, restaurant, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: restaurant?.name ?? '',
    must_order: restaurant?.must_order ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) return setError('先填餐飲名稱')
    setBusy(true)
    setError('')
    try {
      onSaved(
        restaurant
          ? await api(`restaurants/${restaurant.id}/`, { method: 'PATCH', json: form })
          : await api(`places/${place.slug}/restaurants/`, { method: 'POST', json: form }),
      )
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal title={restaurant ? '編輯餐飲' : `新增餐飲到${place.name}`} onClose={onClose} locked={busy}>
      <form onSubmit={submit} className="form" noValidate>
        <label>
          餐飲名稱
          <input value={form.name} onChange={set('name')} maxLength={60} placeholder="例如：巷口拉麵" />
        </label>
        <label>
          必點
          <input value={form.must_order} onChange={set('must_order')} maxLength={120} placeholder="例如：叉燒拉麵加蛋" />
        </label>

        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? '請稍候…' : restaurant ? '儲存' : '新增'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
