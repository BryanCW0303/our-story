import { useState } from 'react'
import { api } from '../../api.js'
import Modal from '../../components/Modal.jsx'

export default function SettingsForm({ config, onClose, onSaved }) {
  const [form, setForm] = useState({ ...config, start_date: config.start_date ?? '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      onSaved(await api('config/', { method: 'PUT', json: { ...form, start_date: form.start_date || null } }))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal title="網站設定" onClose={onClose} locked={busy}>
      <form onSubmit={submit} className="form">
        <label>
          網站標題
          <input value={form.title} onChange={set('title')} maxLength={60} required />
        </label>
        <div className="form-row">
          <label>
            第一個名字
            <input value={form.name_a} onChange={set('name_a')} maxLength={30} />
          </label>
          <label>
            第二個名字
            <input value={form.name_b} onChange={set('name_b')} maxLength={30} />
          </label>
        </div>
        <label>
          在一起的日期
          <input type="date" value={form.start_date} onChange={set('start_date')} />
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
            {busy ? '儲存中…' : '儲存'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
