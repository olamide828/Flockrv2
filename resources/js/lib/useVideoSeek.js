import { useRef, useCallback } from 'react'

// One drag-to-seek implementation shared by every video player in the app —
// pointer-capture based so dragging keeps tracking smoothly even if the
// pointer moves outside the bar's exact bounds mid-drag, and it behaves
// identically for mouse and touch without separate code paths.
export function useVideoSeek(getVideoEl, seekBarRef, { onSeeking, onSeekStart, onSeekEnd } = {}) {
  const seekingRef = useRef(false)

  const seekToClientX = useCallback((clientX) => {
    const el = getVideoEl()
    if (!el?.duration || !seekBarRef.current) return
    const rect = seekBarRef.current.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    el.currentTime = pct * el.duration
    onSeeking?.(pct * 100)
  }, [getVideoEl, seekBarRef, onSeeking])

  const handleSeekDown = useCallback((e) => {
    seekingRef.current = true
    onSeekStart?.()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    seekToClientX(e.clientX)
  }, [seekToClientX, onSeekStart])

  const handleSeekMove = useCallback((e) => {
    if (!seekingRef.current) return
    seekToClientX(e.clientX)
  }, [seekToClientX])

  const handleSeekUp = useCallback((e) => {
    seekingRef.current = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    onSeekEnd?.()
  }, [onSeekEnd])

  return { seekingRef, handleSeekDown, handleSeekMove, handleSeekUp }
}