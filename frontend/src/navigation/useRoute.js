import { useCallback, useEffect, useRef, useState } from 'react'

// Pages live in the URL hash so the browser's back button and shared links work:
//   #/               home (the places)
//   #/p/tokyo          one place: its photo timeline
//   #/p/tokyo/12       one photo
//   #/p/tokyo/food     the same place: its favourite restaurants
//   #/p/tokyo/food/3   one restaurant
//   #/a/film           one kind of activity (films, LEGO, games)
function readRoute() {
  const hash = window.location.hash
  const [, slug, food, id] = hash.match(/^#\/p\/([\w-]+)(?:\/(food))?(?:\/(\d+))?$/) ?? []
  const [, activity] = hash.match(/^#\/a\/([\w-]+)$/) ?? []
  return {
    meetings: hash === '#/meetings',
    slug: slug ?? null,
    tab: food ? 'food' : 'photos',
    photoId: !food && id ? Number(id) : null,
    restaurantId: food && id ? Number(id) : null,
    activity: activity ?? null,
  }
}

export default function useRoute(onNavigate) {
  const [route, setRoute] = useState(readRoute)
  const current = useRef(route)
  const lastPhoto = useRef(null)

  useEffect(() => {
    const onChange = () => {
      const previous = current.current
      const next = readRoute()
      current.current = next
      // Returning from a photo to its place keeps your spot in the timeline (PlacePage scrolls to it).
      const returning = Boolean(previous.photoId) && !next.photoId && next.slug === previous.slug
      lastPhoto.current = returning ? previous.photoId : null
      setRoute(next)
      onNavigate()
      if (!returning) window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [onNavigate])

  const replacePhoto = useCallback((slug, id) => {
    window.history.replaceState(null, '', `#/p/${slug}/${id}`)
    current.current = readRoute()
    setRoute(current.current)
  }, [])

  return { route, focusId: lastPhoto.current, replacePhoto }
}
