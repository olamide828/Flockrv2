import { useState, useRef, useCallback } from 'react'
import axios from 'axios'

export function useInfiniteScroll(initialData = [], endpoint = '/api/feed') {
  const [items,   setItems]   = useState(Array.isArray(initialData) ? initialData : [])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const cursorRef = useRef(
    Array.isArray(initialData) && initialData.length > 0
      ? (initialData[initialData.length - 1]?.id ?? 0)
      : 0
  )

  const loadMore = useCallback(async (params = {}) => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const { data } = await axios.get(endpoint, {
        params: { cursor: cursorRef.current, ...params },
      })
      const incoming = Array.isArray(data.data) ? data.data : []
      setItems(prev => [...prev, ...incoming])
      setHasMore(data.has_more ?? false)
      cursorRef.current = data.next_cursor ?? 0
    } catch (err) {
      console.error('Feed load error:', err)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, endpoint])

  const reset = useCallback(() => {
    setItems([])
    setHasMore(true)
    cursorRef.current = 0
  }, [])

  return { items, loading, hasMore, loadMore, setItems, reset }
}