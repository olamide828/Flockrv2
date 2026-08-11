import { useRef, useState } from 'react'
import { RiVolumeMuteLine, RiVolumeUpLine, RiFullscreenLine, RiFullscreenExitLine } from 'react-icons/ri'

/**
 * Replaces native <video controls> for images/videos sent in room chat.
 * Same control language as the feed's PostVideoPlayer (tap to play/pause,
 * mute icon top-right) plus a fullscreen toggle, since chat bubbles are
 * small and people will want to blow a video up to see it properly.
 */
export default function RoomMediaPlayer({ src, maxHeight = 220 }) {
  const videoRef = useRef(null)
  const wrapRef  = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted]     = useState(true)
  const [showIcon, setShowIcon] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) { video.play().catch(() => {}); setPlaying(true) }
    else { video.pause(); setPlaying(false) }
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
      if (!document.fullscreenElement) {
        await wrap.requestFullscreen?.()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen?.()
        setIsFullscreen(false)
      }
    } catch {}
  }

  return (
    <div ref={wrapRef} onClick={togglePlay} style={{ position:'relative', cursor:'pointer', background:'#000', width:'100%', height:'100%' }}>
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        playsInline
        loop
style={{
          width: isFullscreen ? 'auto' : '100%',
          height: isFullscreen ? 'auto' : '100%',
          maxHeight: isFullscreen ? '100vh' : 'none',
          maxWidth: '100%',
          objectFit: isFullscreen ? 'contain' : 'cover',
          display: 'block',
        }}      />

      <div style={{ position:'absolute', top:8, right:8, display:'flex', gap:6, zIndex:2 }}>
        <button onClick={toggleMute} style={{ width:28, height:28, borderRadius:'50%', background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {muted ? <RiVolumeMuteLine size={14} color="#fff" /> : <RiVolumeUpLine size={14} color="#fff" />}
        </button>
        <button onClick={toggleFullscreen} style={{ width:28, height:28, borderRadius:'50%', background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {isFullscreen ? <RiFullscreenExitLine size={14} color="#fff" /> : <RiFullscreenLine size={14} color="#fff" />}
        </button>
      </div>

      {(showIcon || !playing) && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {playing
              ? <svg width={16} height={16} fill="white" viewBox="0 0 24 24"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>
              : <svg width={16} height={16} fill="white" viewBox="0 0 24 24"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
            }
          </div>
        </div>
      )}
    </div>
  )
}