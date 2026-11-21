import { useEffect, useRef, useState } from 'react'
import { api, todayString } from '../api.js'
import Modal from './Modal.jsx'

let nextKey = 0

/** Create or edit a moment. Photos upload one at a time so each request stays small. */
export default function MomentEditor({ moment, onClose, onSaved }) {
  // After the first successful save of a new moment we remember its id, so a retry
  // after a failed photo upload updates it instead of creating a duplicate.
  const [momentId, setMomentId] = useState(moment?.id ?? null)
  const [form, setForm] = useState({
    title: moment?.title ?? '',
    date: moment?.date ?? todayString(),
    location: moment?.location ?? '',
    description: moment?.description ?? '',
    is_public: moment?.is_public ?? true,
  })
  const [existing, setExisting] = useState(moment?.photos ?? [])
  const [removed, setRemoved] = useState([])
  const [pending, setPending] = useState([]) // [{key, file, preview}]
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const picker = useRef(null)
  const previews = useRef(new Set())

  useEffect(() => {
    const urls = previews.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  function addFiles(event) {
    const added = Array.from(event.target.files ?? []).map((file) => {
      const preview = URL.createObjectURL(file)
      previews.current.add(preview)
      return { key: nextKey++, file, preview }
    })
    setPending((current) => [...current, ...added])
    event.target.value = '' // allow picking the same file again
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      setProgress('儲存中…')
      let id = momentId
      if (id) {
        await api(`moments/${id}/`, { method: 'PATCH', json: form })
      } else {
        id = (await api('moments/', { method: 'POST', json: form })).id
        setMomentId(id)
      }

      for (const photo of removed) {
        await api(`photos/${photo.id}/`, { method: 'DELETE' })
        setRemoved((current) => current.filter((p) => p.id !== photo.id))
      }

      const queue = [...pending]
      for (let i = 0; i < queue.length; i++) {
        setProgress(`上傳照片 ${i + 1} / ${queue.length}…`)
        const body = new FormData()
        body.append('image', queue[i].file)
        let saved
        try {
          saved = await api(`moments/${id}/photos/`, { method: 'POST', form: body })
        } catch (err) {
          throw new Error(`${queue[i].file.name}：${err.message}`)
        }
        setExisting((current) => [...current, saved])
        setPending((current) => current.filter((p) => p.key !== queue[i].key))
      }
      onSaved()
    } catch (err) {
      setError(err.message)
      setBusy(false)
      setProgress('')
    }
  }

  return (
    <Modal title={moment ? '編輯回憶' : '新增回憶'} onClose={momentId && !moment ? onSaved : onClose} locked={busy}>
      <form onSubmit={submit} className="form">
        <label>
          標題
          <input value={form.title} onChange={set('title')} maxLength={120} placeholder="例如：第一次一起看海" required />
        </label>
        <div className="form-row">
          <label>
            日期
            <input type="date" value={form.date} onChange={set('date')} required />
          </label>
          <label>
            地點
            <input value={form.location} onChange={set('location')} maxLength={120} placeholder="可以不填" />
          </label>
        </div>
        <label>
          想記下來的話
          <textarea value={form.description} onChange={set('description')} rows={4} placeholder="可以不填" />
        </label>

        <div>
          <span className="field-label">照片</span>
          <div className="thumbs">
            {existing.map((photo) => (
              <div className="thumb" key={`e${photo.id}`}>
                <img src={photo.thumb} alt="" />
                <button
                  type="button"
                  className="thumb-remove"
                  aria-label="移除這張照片"
                  disabled={busy}
                  onClick={() => {
                    setExisting((current) => current.filter((p) => p.id !== photo.id))
                    setRemoved((current) => [...current, photo])
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {pending.map((item) => (
              <div className="thumb" key={`p${item.key}`} title={item.file.name}>
                <span className="thumb-name">{item.file.name}</span>
                <img src={item.preview} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                <button
                  type="button"
                  className="thumb-remove"
                  aria-label="移除這張照片"
                  disabled={busy}
                  onClick={() => setPending((current) => current.filter((p) => p.key !== item.key))}
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="thumb add" onClick={() => picker.current.click()} disabled={busy}>
              <span aria-hidden="true">＋</span>
              加照片
            </button>
          </div>
          <input ref={picker} type="file" accept="image/*" multiple hidden onChange={addFiles} />
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={form.is_public}
            onChange={(e) => setForm((current) => ({ ...current, is_public: e.target.checked }))}
          />
          <span>
            公開給所有訪客
            <small>取消勾選後，只有登入的人看得到這則回憶和照片</small>
          </span>
        </label>

        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          {busy && <span className="muted progress">{progress}</span>}
          <button type="button" className="btn ghost" onClick={momentId && !moment ? onSaved : onClose} disabled={busy}>
            取消
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? '請稍候…' : '儲存'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
