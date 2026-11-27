import { useEffect, useState } from 'react'
import { api } from '../../api.js'

export default function useMeetings(onError) {
  const [meetings, setMeetings] = useState(null)

  useEffect(() => {
    let active = true
    api('meetings/')
      .then(list => { if (active) setMeetings(list) })
      .catch(err => { if (active) onError(err.message) })
    return () => { active = false }
  }, [onError])

  async function addMeeting(fields) {
    const saved = await api('meetings/', { method: 'POST', json: fields })
    setMeetings(list => [...list, saved].sort((a, b) =>
      b.start_date.localeCompare(a.start_date) || b.id - a.id
    ))
  }

  const totalDays = meetings?.reduce((sum, meeting) => sum + meeting.days, 0)
  return { meetings, totalDays, addMeeting }
}
