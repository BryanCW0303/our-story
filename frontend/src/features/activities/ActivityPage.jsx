import { coverUrl } from './catalog.js'
import Icon from '../../components/Icon.jsx'
import { Badge } from '../../components/Landmark.jsx'

/** One kind of thing we did together, as a wall of covers. */
export default function ActivityPage({ activity }) {
  return (
    <>
      <a className="back" href="#/">
        <Icon name="back" /> 回到首頁
      </a>
      <div className="place-head">
        <Badge place={{ slug: activity.icon, color: activity.color }} />
        <div>
          <h1>{activity.name}</h1>
          <p>
            一起{activity.verb} {activity.items.length} {activity.unit}
          </p>
        </div>
      </div>
      <div className={`covers ${activity.id}`}>
        {activity.items.map((item) => (
          <figure className="cover" key={item.cover}>
            <img className="art" src={coverUrl(item.cover)} alt="" loading="lazy" />
            <figcaption>
              <b>{item.title}</b>
              <small>{item.sub}</small>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="credit">封面圖片的版權屬於各自的權利人。</p>
    </>
  )
}
