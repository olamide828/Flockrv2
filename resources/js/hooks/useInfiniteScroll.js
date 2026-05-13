import { useState, useRef, useCallback } from 'react'
import axios from 'axios'

export function useInfiniteScroll(initialData = [], endpoint = '/api/feed') {
  const [items,    setItems]    = useState(initialData)
  const [loading,  setLoading]  = useState(false)
  const [hasMore,  setHasMore]  = useState(true)
  const cursorRef = useRef(initialData[initialData.length - 1]?.id ?? 0)

  const loadMore = useCallback(async (params = {}) => {
    if (loading || !hasMore) return
    setLoading(true)

    try {
      const { data } = await axios.get(endpoint, {
        params: { cursor: cursorRef.current, ...params },
      })
      setItems(prev => [...prev, ...data.data])
      setHasMore(data.has_more)
      cursorRef.current = data.next_cursor ?? 0
    } catch (err) {
      console.error('Feed load error:', err)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, endpoint])

  return { items, loading, hasMore, loadMore, setItems }
}
