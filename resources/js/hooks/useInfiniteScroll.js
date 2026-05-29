import { useState, useRef, useCallback } from 'react'
import axios from 'axios'

export function useInfiniteScroll(initialData = [], endpoint = '/api/feed') {
  const [items,   setItems]   = useState(Array.isArray(initialData) ? initialData : [])
  const [loading, setLoading] = useState(false)
  // Start as false — only set true if server confirms more exist
  const [hasMore, setHasMore] = useState(false)
  const loadingRef = useRef(false)

  const cursorRef = useRef(
    Array.isArray(initialData) && initialData.length > 0
      ? (initialData[initialData.length - 1]?.id ?? 0)
      : 0
  )

  const loadMore = useCallback(async (params = {}, replace = false) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)

    try {
      const cursor = replace ? 0 : cursorRef.current
      const { data } = await axios.get(endpoint, {
        params: { cursor, ...params },
        withCredentials: true,
      })

      const incoming = Array.isArray(data.data) ? data.data : []
      setHasMore(data.has_more ?? false)
      cursorRef.current = data.next_cursor ?? 0

      if (replace) {
        setItems(incoming)
      } else {
        // Deduplicate by ID to prevent double entries
        setItems(prev => {
          const existingIds = new Set(prev.map(v => v.id))
          const fresh = incoming.filter(v => !existingIds.has(v.id))
          return [...prev, ...fresh]
        })
      }
    } catch (err) {
      console.error('Feed load error:', err)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [endpoint])

  const reset = useCallback((newItems = []) => {
    setItems(newItems)
    setHasMore(false)
    cursorRef.current = newItems.length > 0 ? (newItems[newItems.length - 1]?.id ?? 0) : 0
    loadingRef.current = false
  }, [])

  return { items, loading, hasMore, loadMore, setItems, reset }
}