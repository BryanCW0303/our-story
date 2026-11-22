import { useState } from 'react'
import { api } from '../api.js'
import Icon from './Icon.jsx'
import Modal from './Modal.jsx'

/** Add a favourite restaurant to a place, or edit one (pass `restaurant`). Only the name is required. */
export default function RestaurantForm({ place, restaurant, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: restaurant?.name ?? '',
    cuisine: restaurant?.cuisine ?? '',
    location: restaurant?.location ?? '',
    must_order: restaurant?.must_order ?? '',
  })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) return setError('先填餐廳名')
    setBusy(true)
    setError('')
    const body = new FormData()
    for (const [key, value] of Object.entries(form)) body.append(key, value.trim())
    if (file) body.append('image', file)
    try {
      onSaved(
        restaurant
          ? await api(`restaurants/${restaurant.id}/`, { method: 'PATCH', form: body })
          : await api(`places/${place.slug}/restaurants/`, { method: 'POST', form: body }),
      )
    } catch (err) {
      setError(file ? `${file.name}：${err.message}` : err.message)
      setBusy(false)
    }
  }

  let pick = '點這裡選一張照片，沒有也可以'
  if (file) pick = `已選：${file.name}`
  else if (restaurant?.image) pick = '點這裡換一張照片，不換就留空'

  return (
    <Modal title={restaurant ? '編輯餐廳' : `新增餐廳到${place.name}`} onClose={onClose} locked={busy}>
      <form onSubmit={submit} className="form" noValidate>
        <div>
          <span className="field-label">圖片（選填）</span>
          <label className="drop">
            <Icon name="photo" />
            <span>{pick}</span>
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={busy}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setError('')
              }}
            />
          </label>
        </div>
        <label>
          餐廳名
          <input value={form.name} onChange={set('name')} maxLength={60} placeholder="例如：巷口拉麵" />
        </label>
        <label>
          種類
          <input value={form.cuisine} onChange={set('cuisine')} maxLength={30} placeholder="例如：拉麵、咖啡廳、燒烤" />
        </label>
        <label>
          位置
          <input
            value={form.location}
            onChange={set('location')}
            maxLength={120}
            placeholder="地址，或「車站旁邊」這樣的描述"
          />
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
