import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

const cache = new Map()

export function useProfilePreview(username, enabled) {
  const [data, setData] = useState(() => (username ? cache.get(username) ?? null : null))
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!enabled || !username || fetchedRef.current) return
    fetchedRef.current = true
    if (cache.has(username)) { setData(cache.get(username)); return }
    axios.get(`/api/users/${username}/preview`)
      .then(({ data }) => { cache.set(username, data); setData(data) })
      .catch(() => {})
  }, [enabled, username])

  return data
}