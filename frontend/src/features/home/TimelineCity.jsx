import { Badge } from '../../components/Landmark.jsx'

export default function City({ place, english = false }) {
  return <a className="timeline-city" href={'#/p/' + place.slug}>
    <Badge place={place} /><strong>{place.name}</strong>{english && <small>{place.name_en}</small>}
  </a>
}
