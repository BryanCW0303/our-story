import { useState } from 'react'
import { api } from '../../api.js'

export default function MeetingsPage({ meetings, onAdded }) {
  const [start, setStart] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = Object.fromEntries(new FormData(form))
    setBusy(true)
    setError('')
    try {
      onAdded(await api('meetings/', { method: 'POST', json: fields }))
      form.reset()
      setStart('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const history = meetings && [...meetings].sort((a, b) => b.start_date.localeCompare(a.start_date) || b.id - a.id)
  return <section className="meetings-page">
    <a href="#/">回到首頁</a>
    <h1>見面紀錄</h1>
    <form className="form reunion-panel" onSubmit={save}>
      <div className="form-row">
        <label>起始日期<input type="date" name="start_date" required value={start} onChange={e => setStart(e.target.value)} /></label>
        <label>結束日期<input type="date" name="end_date" required min={start || undefined} /></label>
      </div>
      <label>地點<input name="location" required maxLength={100} /></label>
      {error && <p role="alert" className="notice error">{error}</p>}
      <div className="form-actions"><button className="btn primary" disabled={busy || !meetings}>{busy ? '儲存中…' : '新增見面紀錄'}</button></div>
    </form>
    {!history ? <p role="status">載入中…</p> : history.length === 0 ? <p>還沒有見面紀錄。</p> :
      <ul className="meeting-history">{history.map(meeting => <li key={meeting.id}>
        <strong>{meeting.location} · {meeting.days} 天</strong>
        <span>{meeting.start_date} 至 {meeting.end_date}</span>
      </li>)}</ul>}
  </section>
}
