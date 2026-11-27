import { useEffect, useRef, useState } from 'react'
import City from './TimelineCity.jsx'
import './FootprintTimeline.css'

const months = Array.from({ length: 12 }, (_, i) => i + 1)
function timelineMonths(place, today) {
  if (place.kind !== 'now') return place.photo_months ?? place.trip_months ?? []
  if (!place.first_photo) return []

  const [firstYear, firstMonth] = place.first_photo.split('-').map(Number)
  const marked = []
  const end = today.getFullYear() * 12 + today.getMonth()
  for (let index = firstYear * 12 + firstMonth - 1; index <= end; index++) {
    const year = Math.floor(index / 12)
    const month = String(index % 12 + 1).padStart(2, '0')
    marked.push(year + '-' + month)
  }
  return marked
}

export default function FootprintTimeline({ places }) {
  const [selection, setSelection] = useState('')
  const timeline = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        observer.disconnect()
      }
    })
    observer.observe(timeline.current)
    return () => observer.disconnect()
  }, [])
  const today = new Date()
  const entries = places.map((place) => ({ place, marked: timelineMonths(place, today) }))
  const years = [...new Set(entries.flatMap(({ marked }) => marked).map((date) => date.slice(0, 4)))].sort().reverse()
  const year = years.includes(selection) ? selection : years[0]
  const rows = entries.map(({ place, marked }) => ({
    place,
    recorded: marked.filter((date) => date.slice(0, 4) === year).map((date) => Number(date.slice(5))),
  })).filter(({ recorded }) => recorded.length)
  const residences = rows.filter(({ place }) => place.kind !== 'trip')
  const stops = months.map((month) => ({
    month,
    cities: rows.filter(({ place, recorded }) => place.kind === 'trip' && recorded.includes(month)),
  })).filter(({ cities }) => cities.length)

  return <section ref={timeline} className={'footprint-timeline' + (isVisible ? ' playing' : '')}>
    <div className="timeline-heading"><h4>年度足跡</h4>
      {year && <select aria-label="足跡年份" value={year} onChange={(e) => setSelection(e.target.value)}>
        {years.map((y) => <option key={y}>{y}</option>)}
      </select>}
    </div>
    <h5>居住地</h5>
    {residences.length ? <><table key={year} className="residence-months" aria-label={year + ' 年居住地月份'}>
      <thead><tr><th scope="col">月份</th>{months.map((m) => <th scope="col" key={m}>{m}</th>)}</tr></thead>
      <tbody>{residences.map(({ place, recorded }) => <tr key={place.slug}>
        <th scope="row"><City place={place} /></th>
        {months.map((m) => <td key={m} aria-label={recorded.includes(m) ? (place.kind === 'now' ? '居住中' : '有照片') : '無標記'}>
          {recorded.includes(m) && <i aria-hidden="true" style={{ animationDelay: (m * 45) + 'ms' }} />}
        </td>)}
      </tr>)}</tbody>
    </table><p>現居地從第一張照片的月份標到本月；曾居地標示有照片的月份。</p></> : <p>尚無居住地照片。</p>}
    <h4 className="journey-heading">旅遊地</h4>
    {stops.length ? <ol key={year} className="travel-trail" aria-label="按照片月份排列的旅遊足跡">
      {stops.map(({ month, cities }, i) => <li key={month} style={{ flexGrow: cities.length, animationDelay: (180 + i * 90) + 'ms' }}>
        <div>{cities.map(({ place }) => <City key={place.slug} place={place} />)}</div>
        <time dateTime={year + '-' + String(month).padStart(2, '0')}>{month}月</time>
      </li>)}
    </ol> : <p>尚無旅遊地照片。</p>}
  </section>
}
