import { useRef, useState, useEffect } from 'react'
import { RiVolumeMuteLine, RiVolumeUpLine } from 'react-icons/ri'

/**
 * Replaces the native <video controls> element on feed post videos.
 * - Tap to play/pause (shows a brief play/pause icon, like VideoCard)
 * - Mute/unmute button, top-right
 * - Auto-pauses when scrolled out of view (IntersectionObserver)
 * - Starts muted (autoplay-safe), unmutes only on explicit tap of the icon
 */
export default function PostVideoPlayer({ src, poster }) {
  const videoRef = useRef(null)
  const wrapRef  = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted]     = useState(true)
  const [showIcon, setShowIcon] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    const video = videoRef.current
    if (!el || !video) return

    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        video.pause()
        setPlaying(false)
      }
    }, { threshold: 0.5 })

    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
    setShowIcon(true)
    setTimeout(() => setShowIcon(false), 500)
  }

  const toggleMute = (e) => {
    e.stopPropagation()
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }

  return (
    <div ref={wrapRef} onClick={togglePlay} style={{ position: 'relative', cursor: 'pointer', background: '#000' }}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={muted}
        playsInline
        loop
        style={{ width: '100%', maxHeight: 400, objectFit: 'contain', display: 'block' }}
      />

      <button onClick={toggleMute} style={{ position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        {muted ? <RiVolumeMuteLine size={16} color="#fff" /> : <RiVolumeUpLine size={16} color="#fff" />}
      </button>

      {(showIcon || !playing) && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {playing
              ? <svg width={20} height={20} fill="white" viewBox="0 0 24 24"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>
              : <svg width={20} height={20} fill="white" viewBox="0 0 24 24"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
            }
          </div>
        </div>
      )}
    </div>
  )
}