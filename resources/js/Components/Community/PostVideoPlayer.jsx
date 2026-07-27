import { useRef, useState, useEffect } from 'react'
import {
  RiVolumeMuteLine, RiVolumeUpLine, RiMoreLine, RiCloseLine,
  RiFullscreenLine, RiFullscreenExitLine, RiFlag2Line,
} from 'react-icons/ri'


export default function PostVideoPlayer({ src, poster, onReport, fillContainer = false }) {
  const videoRef = useRef(null)
  const wrapRef  = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted]     = useState(true)
  const [showIcon, setShowIcon] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [speed, setSpeed] = useState(1)

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

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const togglePlay = () => {
    if (showMore) return
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

  const toggleFullscreen = async (e) => {
    e.stopPropagation()
    const wrap = wrapRef.current
    if (!wrap) return
    try {
      if (!document.fullscreenElement) await wrap.requestFullscreen?.()
      else await document.exitFullscreen?.()
    } catch {}
  }

  const setPlaybackSpeed = (s) => {
    if (videoRef.current) videoRef.current.playbackRate = s
    setSpeed(s)
  }

  return (
    <div ref={wrapRef} onClick={togglePlay} style={{ position: 'relative', cursor: 'pointer', background: '#000', height: fillContainer ? '100%' : 'auto' }}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={muted}
        playsInline
        loop
        style={{
          width: '100%',
          height: isFullscreen ? '100vh' : (fillContainer ? '100%' : 'auto'),
          maxHeight: isFullscreen || fillContainer ? 'none' : 400,
          objectFit: isFullscreen ? 'contain' : 'cover',
          display: 'block',
        }}
      />

      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 8, zIndex: 2 }}>
        <button onClick={toggleMute} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {muted ? <RiVolumeMuteLine size={16} color="#fff" /> : <RiVolumeUpLine size={16} color="#fff" />}
        </button>
        <button onClick={toggleFullscreen} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isFullscreen ? <RiFullscreenExitLine size={15} color="#fff" /> : <RiFullscreenLine size={15} color="#fff" />}
        </button>
        <button onClick={e => { e.stopPropagation(); setShowMore(true) }} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RiMoreLine size={17} color="#fff" />
        </button>
      </div>

      {speed !== 1 && (
        <div style={{ position: 'absolute', top: 10, left: 10, padding: '3px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 700, zIndex: 2 }}>
          {speed}x
        </div>
      )}

      {(showIcon || !playing) && !showMore && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {playing
              ? <svg width={20} height={20} fill="white" viewBox="0 0 24 24"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>
              : <svg width={20} height={20} fill="white" viewBox="0 0 24 24"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
            }
          </div>
        </div>
      )}

      {showMore && (
        <>
          <div onClick={e => { e.stopPropagation(); setShowMore(false) }} style={{ position: 'absolute', inset: 0, zIndex: 9, background: 'rgba(0,0,0,0.5)' }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, background: 'rgba(18,18,18,0.98)', backdropFilter: 'blur(20px)', borderRadius: '18px 18px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 2px' }}>
              <div style={{ width: 32, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 14px 10px' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Video Options</span>
              <button onClick={() => setShowMore(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RiCloseLine size={15} />
              </button>
            </div>

            <div style={{ padding: '0 14px 14px' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Playback Speed</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                  <button key={s} onClick={() => setPlaybackSpeed(s)}
                    style={{ padding: '6px 13px', borderRadius: 999, border: `1px solid ${speed === s ? '#FF6B35' : 'rgba(255,255,255,0.1)'}`, background: speed === s ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.04)', color: speed === s ? '#FF6B35' : '#fff', fontSize: 12, fontWeight: speed === s ? 700 : 400, cursor: 'pointer' }}>
                    {s === 1 ? 'Normal' : `${s}x`}
                  </button>
                ))}
              </div>
            </div>

            {onReport && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => { setShowMore(false); onReport() }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 13, fontWeight: 600 }}>
                  <RiFlag2Line size={17} /> Report post
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}