import { useState, useRef, useCallback, useEffect } from 'react'
import axios from 'axios'

/**
 * useVideoDownload
 *
 * Handles server-side watermarked video download.
 * Fixes:
 * - Single prepare call (guarded by ref, not state)
 * - Single polling interval with proper cleanup on unmount
 * - Single browser download trigger
 * - Single cleanup call
 * - No React StrictMode double-invoke issues (uses ref guards)
 */
export function useVideoDownload(video) {
  const [dlState, setDlState] = useState('idle') // idle | preparing | processing | done | error

  // Refs don't trigger re-renders and survive StrictMode double-invoke
  const pollRef     = useRef(null)   // interval ID
  const activeRef   = useRef(false)  // true while a download is in flight
  const downloadedRef = useRef(false) // prevents double browser download trigger

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const triggerBrowserDownload = useCallback((url, jobKey) => {
    // Guard: only trigger once per download session
    if (downloadedRef.current) return
    downloadedRef.current = true

    const filename = `flockr-${video.user?.username ?? 'video'}-${video.ulid ?? Date.now()}.mp4`

    // Use fetch to get the file as a blob, then create object URL
    // This ensures a single file download, not multiple
    fetch(url, { mode: 'cors' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.blob()
      })
      .then(blob => {
        const burl = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = burl
        a.download = filename
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        // Small delay before cleanup so browser has time to start download
        setTimeout(() => {
          document.body.removeChild(a)
          URL.revokeObjectURL(burl)
        }, 2000)

        setDlState('done')
        setTimeout(() => {
          setDlState('idle')
          activeRef.current   = false
          downloadedRef.current = false
        }, 4000)

        // Cleanup temp file on server — single call
        axios.delete(`/api/videos/download/cleanup?job_key=${encodeURIComponent(jobKey)}`)
          .catch(() => {}) // best-effort
      })
      .catch(() => {
        setDlState('error')
        setTimeout(() => {
          setDlState('idle')
          activeRef.current   = false
          downloadedRef.current = false
        }, 4000)
      })
  }, [video.user?.username, video.ulid])

  const download = useCallback(async () => {
    // Guard: prevent multiple simultaneous download sessions
    if (activeRef.current) return
    if (dlState !== 'idle' && dlState !== 'error') return

    activeRef.current   = true
    downloadedRef.current = false
    stopPolling()
    setDlState('preparing')

    try {
      const { data } = await axios.post(
        `/api/videos/${video.ulid}/download/prepare`,
        {},
        { withCredentials: true }
      )

      const jobKey = data.job_key

      // Already done (shouldn't happen with new controller but handle it)
      if (data.status === 'done' && data.url) {
        triggerBrowserDownload(data.url, jobKey)
        return
      }

      setDlState('processing')

      // Poll every 3 seconds — less aggressive than 2s
      pollRef.current = setInterval(async () => {
        try {
          const { data: poll } = await axios.get(
            `/api/videos/download/status?job_key=${encodeURIComponent(jobKey)}`,
            { withCredentials: true }
          )

          if (poll.status === 'done' && poll.url) {
            stopPolling()
            triggerBrowserDownload(poll.url, jobKey)
          } else if (poll.status === 'error' || poll.status === 'not_found') {
            stopPolling()
            setDlState('error')
            setTimeout(() => {
              setDlState('idle')
              activeRef.current = false
            }, 4000)
          }
          // 'processing' or 'queued' → keep polling
        } catch {
          // Network error during poll — keep trying, don't abort
        }
      }, 3000)

      // Hard timeout: 10 minutes
      setTimeout(() => {
        if (pollRef.current) {
          stopPolling()
          setDlState('error')
          setTimeout(() => {
            setDlState('idle')
            activeRef.current = false
          }, 4000)
        }
      }, 600_000)

    } catch (err) {
      activeRef.current = false
      setDlState('error')
      setTimeout(() => setDlState('idle'), 4000)
    }
  }, [dlState, video.ulid, triggerBrowserDownload])

  const label = { idle: 'Download', preparing: 'Preparing…', processing: 'Processing…', done: '✓ Done!', error: 'Retry' }[state]
  const color = { idle: '#fff', preparing: '#aaa', processing: '#aaa', done: '#10B981', error: '#EF4444' }[state]
  const bg = { idle: 'rgba(255,255,255,0.06)', preparing: 'rgba(255,255,255,0.04)', processing: 'rgba(255,255,255,0.04)', done: 'rgba(16,185,129,0.12)', error: 'rgba(239,68,68,0.12)' }[state]
  const busy = dlState === 'preparing' || dlState === 'processing'


  return { download, dlState, label, color, bg, busy, errMsg  }
}