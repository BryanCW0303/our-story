import { Fragment, useState } from 'react'
import { Badge } from './Landmark.jsx'
import './FootprintTimeline.css'

const months = Array.from({ length: 12 }, (_, i) => i + 1)
const photoMonths = (place) => place.photo_months ?? place.trip_months ?? []

function City({ place, english = false }) {
  return <a className="timeline-city" href={'#/p/' + place.slug}>
    <Badge place={place} /><strong>{place.name}</strong>{english && <small>{place.name_en}</small>}
  </a>
}

export default function FootprintTimeline({ places }) {
  const [selection, setSelection] = useState('')
  const years = [...new Set(places.flatMap(photoMonths).map((date) => date.slice(0, 4)))].sort().reverse()
  const year = years.includes(selection) ? selection : years[0]
  const homes = places.filter((place) => place.kind === 'now')
  const rows = places.map((place) => ({
    place,
    recorded: photoMonths(place).filter((date) => date.slice(0, 4) === year).map((date) => Number(date.slice(5))),
  })).filter(({ recorded }) => recorded.length)
  const residences = rows.filter(({ place }) => place.kind !== 'trip')
  const stops = months.map((month) => ({
    month,
    cities: rows.filter(({ place, recorded }) => place.kind === 'trip' && recorded.includes(month)),
  })).filter(({ cities }) => cities.length)

  return <section className="footprint-timeline">
    {homes.length > 0 && <>
      <h3>{homes.length === 2 ? '我們現在分住兩地' : '我們的現居地'}</h3>
      <div className="home-pair">{homes.map((place, i) => <Fragment key={place.slug}>
        {i > 0 && <span className="home-bridge" aria-hidden="true">♡</span>}
        <City place={place} english />
      </Fragment>)}</div>
    </>}
    <div className="timeline-heading"><h4>年度足跡</h4>
      {year && <select aria-label="足跡年份" value={year} onChange={(e) => setSelection(e.target.value)}>
        {years.map((y) => <option key={y}>{y}</option>)}
      </select>}
    </div>
    <h5>居住地</h5>
    {residences.length ? <><table className="residence-months" aria-label={year + ' 年居住地照片月份'}>
      <thead><tr><th scope="col">月份</th>{months.map((m) => <th scope="col" key={m}>{m}</th>)}</tr></thead>
      <tbody>{residences.map(({ place, recorded }) => <tr key={place.slug}>
        <th scope="row"><City place={place} /></th>
        {months.map((m) => <td key={m} aria-label={recorded.includes(m) ? '有照片' : '無照片'}>
          {recorded.includes(m) && <i aria-hidden="true" />}
        </td>)}
      </tr>)}</tbody>
    </table><p>每個方塊代表該月有居住地照片。</p></> : <p>尚無居住地照片。</p>}
    <h4 className="journey-heading">旅遊地</h4>
    {stops.length ? <ol className="travel-trail" aria-label="按照片月份排列的旅遊足跡">
      {stops.map(({ month, cities }) => <li key={month} style={{ flexGrow: cities.length }}>
        <div>{cities.map(({ place }) => <City key={place.slug} place={place} />)}</div>
        <time dateTime={year + '-' + String(month).padStart(2, '0')}>{month}月</time>
      </li>)}
    </ol> : <p>尚無旅遊地照片。</p>}
  </section>
}
