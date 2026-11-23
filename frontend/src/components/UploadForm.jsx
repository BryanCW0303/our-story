import { useState } from 'react'
import { api, NOTE_MAX, todayString } from '../api.js'
import Icon from './Icon.jsx'
import Modal from './Modal.jsx'

const MIB = 1024 * 1024
const MAX_PHOTO_BYTES = 80 * MIB
const sizeLabel = (bytes) => (bytes / MIB).toLocaleString('zh-Hant', { maximumFractionDigits: 2 }) + ' MiB'

/** Upload photos to one place. They go up one at a time so each request stays small. */
export default function UploadForm({ place, onClose, onUploaded }) {
  const [files, setFiles] = useState([])
  const [date, setDate] = useState(todayString())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const oversized = files.filter((file) => file.size > MAX_PHOTO_BYTES)
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0)

  function pick(event) {
    setFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    if (!files.length) return setError('先選一張照片')
    if (oversized.length) return
    setBusy(true)
    setError('')
    const queue = [...files]
    for (let i = 0; i < queue.length; i++) {
      setProgress(`上傳中 ${i + 1} / ${queue.length}…`)
      const body = new FormData()
      body.append('image', queue[i])
      body.append('taken_on', date)
      body.append('note', note)
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
            <span>{files.length ? `已選 ${files.length} 張，共 ${sizeLabel(totalBytes)}` : '點這裡選照片，可以一次選多張'}</span>
            <input type="file" accept="image/*" multiple hidden onChange={pick} disabled={busy} />
          </label>
          <small>可選多張，單張最多 80 MiB。</small>
          {oversized.length > 0 && (
            <div className="notice error" role="alert">
              以下 {oversized.length} 張超過上限：
              <ul>{oversized.map((file, i) => <li key={i}>{file.name}（{sizeLabel(file.size)}）</li>)}</ul>
              <button type="button" className="btn ghost" onClick={() => setFiles(files.filter((file) => file.size <= MAX_PHOTO_BYTES))}>
                移除超限照片
              </button>
            </div>
          )}
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
          <button className="btn primary" disabled={busy || !files.length || oversized.length > 0}>
            {busy ? '請稍候…' : '上傳'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
