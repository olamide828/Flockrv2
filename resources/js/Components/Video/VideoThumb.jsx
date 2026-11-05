import { Link } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'
import { RiVolumeMuteFill, RiVolumeUpFill } from 'react-icons/ri'
import { useHlsVideo } from '@/lib/useHlsVideo'

// Same card as the Explore page: autoplays muted once 60% in view, only one thumbnail can have sound at a time.
// (Explore keeps its own private copy; this one is shared by the sound sheet and anywhere else that wants it.)
const fmtCount = (n) => !n ? '0' : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.0', '')}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1).replace('.0', '')}K` : String(n)

let soundOwner = null
const soundListeners = new Set()
function setSoundOwner(id) { soundOwner = id; soundListeners.forEach(fn => fn(id)) }
function useSoundOwner() {
    const [owner, setOwner] = useState(soundOwner)
    useEffect(() => { soundListeners.add(setOwner); return () => { soundListeners.delete(setOwner) } }, [])
    return owner
}

/** autoplay=false (default) shows a still thumbnail: lighter on data and the page. autoplay=true behaves like Explore. */
export default function VideoThumb({ video, onNavigate, autoplay = false }) {
    const myId = useRef(Symbol('thumb')).current
    const owner = useSoundOwner()
    const muted = owner !== myId

    const [inView, setInView] = useState(false)
    const [playing, setPlaying] = useState(false)
    const [started, setStarted] = useState(false)
    const [waiting, setWaiting] = useState(false)
    const [stuck, setStuck] = useState(false)
    const wrapRef = useRef(null)
    const vidRef = useRef(null)

    const src = autoplay ? (video.video_stream_url ?? null) : null
    useHlsVideo(vidRef, inView ? src : null)

    useEffect(() => {
        const el = wrapRef.current
        if (!el || !src) return
        const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.6 })
        io.observe(el)
        return () => io.disconnect()
    }, [src])

    useEffect(() => {
        const vid = vidRef.current
        if (!vid) return
        if (inView) {
            setStuck(false)
            vid.play().catch(err => { if (err?.name === 'NotAllowedError') setStuck(true) })
        } else {
            vid.pause()
            setPlaying(false); setStarted(false); setWaiting(false)
            if (soundOwner === myId) setSoundOwner(null)
        }
    }, [inView])

    useEffect(() => { if (vidRef.current) vidRef.current.muted = muted }, [muted])
    useEffect(() => () => { if (soundOwner === myId) setSoundOwner(null) }, [])

    const toggleMute = (e) => { e.preventDefault(); e.stopPropagation(); setSoundOwner(muted ? myId : null) }
    const showLoader = !!src && inView && !stuck && (!playing || waiting)
    const showButton = !!src && playing && !waiting

    return (
        <Link href={`/@${video.user?.username}/video/${video.ulid}`} onClick={onNavigate} className="group relative block overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111]">
            <div ref={wrapRef} className="relative aspect-[9/16] w-full">
                {video.thumbnail_url_full
                    ? <img src={video.thumbnail_url_full} alt={video.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    : <div className="absolute inset-0 bg-[#1a1a1a]" />}

                {src && (
                    <video ref={vidRef} poster={video.thumbnail_url_full ?? undefined} muted loop autoPlay playsInline
                        onPlaying={() => { setPlaying(true); setStarted(true); setWaiting(false) }}
                        onWaiting={() => setWaiting(true)} onPause={() => setPlaying(false)} onError={() => setStuck(true)}
                        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300" style={{ opacity: started ? 1 : 0 }} />
                )}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {video.views_count > 0 && (
                    <div style={{ position: 'absolute', top: 7, left: 7, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', borderRadius: 999, padding: '2px 7px' }}>
                        <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>{fmtCount(video.views_count)}</span>
                    </div>
                )}

                {showLoader && (
                    <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 10, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                )}
                {showButton && (
                    <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute video' : 'Mute video'}
                        style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 10, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                        {muted ? <RiVolumeMuteFill size={14} /> : <RiVolumeUpFill size={14} />}
                    </button>
                )}

                <div className="absolute inset-x-0 bottom-0 p-2.5 pr-11">
                    <div className="flex items-center gap-1.5">
                        <img src={video.user?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(video.user?.name ?? 'U')}&background=111111`} alt="" className="h-6 w-6 rounded-full object-cover flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[10px] font-semibold text-white leading-tight">{video.user?.name}</p>
                            <p className="truncate text-[9px] text-white/45">@{video.user?.username}</p>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    )
}
