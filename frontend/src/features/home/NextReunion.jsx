import { useState } from 'react'
import { api } from '../../api.js'
import { todayString } from '../../dates.js'

export default function NextReunion({ config, onSaved }) {
  const today = todayString()
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const date = config.reunion_date
  const city = config.reunion_city
  // ISO dates parsed as UTC midnight give calendar days, including across DST changes.
  const days = date ? (Date.parse(date) - Date.parse(today)) / 86400000 : null

  async function save(event) {
    event.preventDefault()
    setError('')
    if (!draft.reunion_city.trim()) return setError('請填寫見面地點')
    setBusy(true)
    try {
      onSaved(await api('config/', { method: 'PATCH', json: draft }))
      setDraft(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const upcoming = days !== null && days >= 0
  return <>
    <div className="reunion-entry">
      {upcoming && <time className="reunion-calendar" dateTime={date} aria-label={date}>
        <small>{Number(date.slice(5,7))} 月</small><strong>{date.slice(8)}</strong>
      </time>}
      <div><h3>下次見面</h3>
        <p>{upcoming ? <>{days > 0 ? <>再過 <strong>{days}</strong> 天</> : '今天'}，在{city}見。</> : '還沒約定下一次見面。'}</p>
      </div>
      {!draft && <button className="btn ghost" onClick={() => {
        setError('')
        setDraft({ reunion_date: upcoming ? date : today, reunion_city: city || '' })
      }}>{upcoming ? '編輯' : '設定見面'}</button>}
    </div>
    {draft && <form className="form reunion-form" onSubmit={save}>
      <div className="form-row">
        <label>見面日期<input type="date" required min={today} value={draft.reunion_date}
          onChange={e => setDraft({ ...draft, reunion_date: e.target.value })} /></label>
        <label>見面地點<input required maxLength={60} value={draft.reunion_city}
          onChange={e => setDraft({ ...draft, reunion_city: e.target.value })} /></label>
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="btn ghost" disabled={busy} onClick={() => setDraft(null)}>取消</button>
        <button className="btn primary" disabled={busy}>{busy ? '儲存中…' : '儲存'}</button></div>
    </form>}
  </>
}
