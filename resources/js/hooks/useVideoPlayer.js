import { useRef, useState, useCallback, useEffect } from 'react'

export function useVideoPlayer() {
  const videoRef   = useRef(null)
  const [playing,  setPlaying]  = useState(false)
  const [muted,    setMuted]    = useState(true)   // start muted (autoplay policy)
  const [progress, setProgress] = useState(0)      // 0–100
  const [volume,   setVolume]   = useState(1)
  const [loading,  setLoading]  = useState(true)

  // ── Sync progress ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const onTime = () => {
      if (el.duration) setProgress((el.currentTime / el.duration) * 100)
    }
    const onLoad  = () => setLoading(false)
    const onWait  = () => setLoading(true)
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    el.addEventListener('timeupdate',    onTime)
    el.addEventListener('canplay',       onLoad)
    el.addEventListener('waiting',       onWait)
    el.addEventListener('playing',       onPlay)
    el.addEventListener('pause',         onPause)

    return () => {
      el.removeEventListener('timeupdate',  onTime)
      el.removeEventListener('canplay',     onLoad)
      el.removeEventListener('waiting',     onWait)
      el.removeEventListener('playing',     onPlay)
      el.removeEventListener('pause',       onPause)
    }
  }, [])

  const play = useCallback(() => {
    videoRef.current?.play().catch(() => {})
  }, [])

  const pause = useCallback(() => {
    videoRef.current?.pause()
  }, [])

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.paused ? play() : pause()
  }, [play, pause])

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return
    const next = !videoRef.current.muted
    videoRef.current.muted = next
    setMuted(next)
  }, [])

  const seek = useCallback((percent) => {
    const el = videoRef.current
    if (!el || !el.duration) return
    el.currentTime = (percent / 100) * el.duration
  }, [])

  // Auto-play when element enters viewport (IntersectionObserver)
  const setupAutoplay = useCallback((el) => {
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {})
        } else {
          el.pause()
          el.currentTime = 0
        }
      },
      { threshold: 0.7 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return {
    videoRef, playing, muted, progress, volume, loading,
    play, pause, togglePlay, toggleMute, seek, setupAutoplay,
  }
}
