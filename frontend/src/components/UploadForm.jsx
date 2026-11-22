import { useState } from 'react'
import { api, NOTE_MAX, todayString } from '../api.js'
import Icon from './Icon.jsx'
import Modal from './Modal.jsx'

/** Upload photos to one place. They go up one at a time so each request stays small. */
export default function UploadForm({ place, onClose, onUploaded }) {
  const [files, setFiles] = useState([])
  const [date, setDate] = useState(todayString())
  const [note, setNote] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  function pick(event) {
    setFiles(Array.from(event.target.files ?? []))
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    if (!files.length) return setError('先選一張照片')
    setBusy(true)
    setError('')
    const queue = [...files]
    for (let i = 0; i < queue.length; i++) {
      setProgress(`上傳中 ${i + 1} / ${queue.length}…`)
      const body = new FormData()
      body.append('image', queue[i])
      body.append('taken_on', date)
      body.append('note', note)
      body.append('is_public', isPublic ? 'true' : 'false')
      try {
        onUploaded(await api(`places/${place.slug}/photos/`, { method: 'POST', form: body }))
      } catch (err) {
        // Keep only what has not gone up yet, so trying again cannot upload a photo twice.
        setFiles(queue.slice(i))
        setError(`${queue[i].name}：${err.message}`)
        setBusy(false)
        setProgress('')
        return
      }
    }
    onClose()
  }

  return (
    <Modal title={`上傳照片到${place.name}`} onClose={onClose} locked={busy}>
      <form onSubmit={submit} className="form">
        <div>
          <span className="field-label">照片</span>
          <label className="drop">
            <Icon name="upload" />
            <span>{files.length ? `已選 ${files.length} 張照片` : '點這裡選照片，可以一次選多張'}</span>
            <input type="file" accept="image/*" multiple hidden onChange={pick} disabled={busy} />
          </label>
        </div>
        <label>
          拍攝日期
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <small>照片本身有記錄拍攝時間的話，會自動用那個時間；沒有的才用這裡選的日期。</small>
        </label>
        <label>
          留言（可以之後再寫）
          <textarea
            className="hand"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={NOTE_MAX}
            placeholder="寫下關於這張照片的話…"
          />
          {files.length > 1 && note && <small>這段話會寫在這次上傳的每一張照片上。</small>}
        </label>
        <label className="check">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          <span>
            公開給所有訪客
            <small>取消勾選後，只有登入的人看得到</small>
          </span>
        </label>

        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          {busy && <span className="muted progress">{progress}</span>}
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? '請稍候…' : '上傳'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
