import { useState, useRef, useCallback } from 'react'
import axios from 'axios'

/**
 * useVideoDownload
 *
 * Handles the full server-side watermark download flow:
 *   1. POST /api/videos/{ulid}/download/prepare  → get job_key
 *   2. Poll GET /api/videos/download/status?job_key=...  every 2s
 *   3. When status === 'done', trigger browser download via <a> click
 *   4. POST cleanup to delete the temp file from storage
 *
 * Usage:
 *   const { download, state } = useVideoDownload(video)
 *   // state: 'idle' | 'preparing' | 'processing' | 'done' | 'error'
 */
export function useVideoDownload(video) {
  const [state,   setState]   = useState('idle')   // idle | preparing | processing | done | error
  const [errMsg,  setErrMsg]  = useState('')
  const pollTimer = useRef(null)
  const jobKeyRef = useRef(null)

  const stopPolling = () => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null }
  }

  const triggerBrowserDownload = useCallback(async (url, jobKey) => {
    try {
      // Fetch as blob so the browser downloads instead of navigating
      const res  = await fetch(url, { mode: 'cors' })
      const blob = await res.blob()
      const burl = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = burl
      a.download = `flockr-${video.user?.username ?? 'video'}-${video.ulid ?? Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(burl), 10_000)

      setState('done')
      setTimeout(() => setState('idle'), 4000) // reset after 4s

      // Cleanup temp file on server (best-effort)
      axios.delete(`/api/videos/download/cleanup?job_key=${encodeURIComponent(jobKey)}`).catch(() => {})
    } catch {
      setState('error')
      setErrMsg('Download failed. Try again.')
      setTimeout(() => setState('idle'), 4000)
    }
  }, [video.user?.username, video.ulid])

  const download = useCallback(async () => {
    if (state !== 'idle' && state !== 'error') return
    setState('preparing')
    setErrMsg('')
    stopPolling()

    try {
      const { data } = await axios.post(`/api/videos/${video.ulid}/download/prepare`, {}, { withCredentials: true })
      const jobKey   = data.job_key
      jobKeyRef.current = jobKey

      // If already done (cached), download immediately
      if (data.status === 'done' && data.url) {
        await triggerBrowserDownload(data.url, jobKey)
        return
      }

      setState('processing')

      // Poll every 2 seconds
      pollTimer.current = setInterval(async () => {
        try {
          const { data: poll } = await axios.get(
            `/api/videos/download/status?job_key=${encodeURIComponent(jobKey)}`,
            { withCredentials: true }
          )

          if (poll.status === 'done' && poll.url) {
            stopPolling()
            await triggerBrowserDownload(poll.url, jobKey)
          } else if (poll.status === 'error') {
            stopPolling()
            setState('error')
            setErrMsg(poll.message ?? 'Processing failed. Try again.')
            setTimeout(() => setState('idle'), 4000)
          }
          // 'processing' → keep polling
        } catch {
          stopPolling()
          setState('error')
          setErrMsg('Connection error. Try again.')
          setTimeout(() => setState('idle'), 4000)
        }
      }, 2000)

      // Timeout after 5 minutes
      setTimeout(() => {
        if (pollTimer.current) {
          stopPolling()
          setState('error')
          setErrMsg('Processing timed out. Try again.')
          setTimeout(() => setState('idle'), 4000)
        }
      }, 300_000)

    } catch (err) {
      setState('error')
      setErrMsg(err.response?.data?.message ?? 'Failed to start download.')
      setTimeout(() => setState('idle'), 4000)
    }
  }, [state, video.ulid, triggerBrowserDownload])

  // Label and color helpers for the button
  const label = {
    idle:       'Download',
    preparing:  'Preparing…',
    processing: 'Processing…',
    done:       '✓ Downloaded!',
    error:      'Retry Download',
  }[state]

  const color = {
    idle:       '#fff',
    preparing:  'rgba(255,255,255,0.5)',
    processing: 'rgba(255,255,255,0.5)',
    done:       '#10B981',
    error:      '#EF4444',
  }[state]

  const bg = {
    idle:       'rgba(255,255,255,0.06)',
    preparing:  'rgba(255,255,255,0.04)',
    processing: 'rgba(255,255,255,0.04)',
    done:       'rgba(16,185,129,0.12)',
    error:      'rgba(239,68,68,0.12)',
  }[state]

  const busy = state === 'preparing' || state === 'processing'

  return { download, state, label, color, bg, busy, errMsg }
}