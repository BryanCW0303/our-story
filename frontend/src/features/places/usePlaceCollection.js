import { useEffect, useRef, useState } from 'react'
import { api } from '../../api.js'

// The route is keyed by place, so list state and outstanding requests belong to one city.
export default function usePlaceCollection(path, onError) {
  const [items, setItems] = useState(null)
  const [revision, setRevision] = useState(0)
  const ready = useRef(false)

  useEffect(() => {
    let active = true
    api(path)
      .then(list => {
        if (active) {
          ready.current = true
          setItems(list)
        }
      })
      .catch(err => { if (active) onError(err.message) })
    return () => { active = false }
  }, [path, revision, onError])

  function update(change) {
    if (ready.current) setItems(change)
    // A write can finish before the initial read. Fetch the committed list in that case.
    else setRevision(value => value + 1)
  }
  return [items, update]
}
