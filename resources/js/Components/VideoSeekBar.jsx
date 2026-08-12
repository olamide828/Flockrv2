import { useEffect, useRef, useState } from 'react'
import { useVideoSeek } from '@/lib/useVideoSeek'

export default function VideoSeekBar({ videoRef, enabled = true, color = '#FF6B35', onProgress, onSeekStart, onSeekEnd }) {
  const barRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [engaged, setEngaged] = useState(false)
  const shrinkTimerRef = useRef(null)

  const { seekingRef, handleSeekDown, handleSeekMove, handleSeekUp } = useVideoSeek(
    () => videoRef.current,
    barRef,
    { onSeeking: (pct) => { setProgress(pct); onProgress?.(pct) } }
  )

  useEffect(() => {
    if (!enabled) return
    let raf
    const tick = () => {
      const el = videoRef.current
      if (el?.duration && !seekingRef.current) {
        const pct = (el.currentTime / el.duration) * 100
        setProgress(pct)
        onProgress?.(pct)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, videoRef])

  const engage = () => {
    clearTimeout(shrinkTimerRef.current)
    setEngaged(true)
  }
  const disengage = () => {
    clearTimeout(shrinkTimerRef.current)
    shrinkTimerRef.current = setTimeout(() => setEngaged(false), 900)
  }

  return (
    <div
      onPointerDown={e => { e.stopPropagation(); engage(); onSeekStart?.(); handleSeekDown(e) }}
      onPointerMove={e => { e.stopPropagation(); handleSeekMove(e) }}
      onPointerUp={e => { e.stopPropagation(); handleSeekUp(e); onSeekEnd?.(); disengage() }}
      onMouseEnter={engage}
      onMouseLeave={() => { if (!seekingRef.current) disengage() }}
      style={{ position: 'absolute', bottom: 4, left: 0, right: 0, height: 18, zIndex: 25, cursor: 'pointer', display: 'flex', alignItems: 'flex-end', touchAction: 'none' }}
    >
      <div ref={barRef} style={{ width: '100%', height: engaged ? 5 : 1.5, background: engaged ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)', transition: 'height 0.18s cubic-bezier(0.34,1.56,0.64,1), background 0.18s ease', position: 'relative' }}>
        <div style={{ height: '100%', background: color, width: `${progress}%`, transition: seekingRef.current ? 'none' : 'width 0.08s linear', position: 'relative' }}>
          {engaged && (
            <div style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', background: color, boxShadow: '0 0 0 3px rgba(0,0,0,0.3)' }} />
          )}
        </div>
      </div>
    </div>
  )
}