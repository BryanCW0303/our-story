import { Fragment } from 'react'
import NextReunion from './NextReunion.jsx'
import { cityClock } from './cityClock.js'
import City from './TimelineCity.jsx'
import './Reunion.css'

export default function Reunion({ now, places, config, meetingDays, onSaved }) {
  const homes = places.filter(place => place.kind === 'now')
  return <section className="reunion-panel rounded-panel" aria-labelledby="reunion-heading">
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
    <NextReunion config={config} onSaved={onSaved} />
  </section>
}
