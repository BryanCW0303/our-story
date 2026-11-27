import { Fragment, useEffect, useState } from 'react'
import { api } from '../../api.js'
import { todayString } from '../../dates.js'
import { cityClock } from './cityClock.js'
import City from './TimelineCity.jsx'
import './Reunion.css'

export default function Reunion({ places, config, meetingDays, onSaved }) {
  const [now, setNow] = useState(() => new Date())
  const today = todayString()
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const homes = places.filter(place => place.kind === 'now')
  const date = config.reunion_date
  const city = config.reunion_city
  // ISO dates parsed as UTC midnight give calendar days, including across DST changes.
  const days = date ? (Date.parse(date) - Date.parse(today)) / 86400000 : null

  useEffect(() => {
    let timer
    function refresh() {
      clearTimeout(timer)
      const current = new Date()
      setNow(current)
      timer = setTimeout(refresh, 60000 - current.getTime() % 60000)
    }
    refresh()
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

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
  return <section className="reunion-panel" aria-labelledby="reunion-heading">
    <h2 id="reunion-heading">異國戀中</h2>
    <div className="meeting-cities">
      <div className="home-pair">{homes.map((place, i) => {
        const clock = cityClock(place.slug, now)
        return <Fragment key={place.slug}>
          {i > 0 && <span className="home-bridge" aria-hidden="true"><b>♡</b></span>}
          <div className={'home-city home-city-' + place.slug}>
            <City place={place} english />
            {clock && <div className="city-clock" role="group" aria-label={place.name + '當地時間'}>
              <span className="clock-phase" data-daylight={clock.daylight}>{clock.daylight ? '☀ 白天' : '☾ 夜晚'}</span>
              <time dateTime={now.toISOString()}>{clock.time}</time>
              <small>{clock.date}</small>
            </div>}
          </div>
        </Fragment>
      })}</div>
      <p className="meeting-total">異國後，我們總共見了 <a href="#/meetings" aria-label={`查看見面紀錄，共 ${meetingDays ?? '…'} 天`}>{meetingDays ?? '…'}</a> 天</p>
    </div>
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
  </section>
}
