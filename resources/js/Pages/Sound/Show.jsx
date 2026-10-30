import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { RiArrowLeftLine, RiMusic2Fill, RiPauseFill, RiPlayFill, RiVideoAddLine } from 'react-icons/ri'
import { KEYFRAMES, Spinner } from '../../Components/Upload/ui'
import { fmtTime } from '../../lib/media'

const hue = (id) => (Number(id || 0) * 47) % 360

/**
 * Everything on Flockr that uses one sound: the sound's details, a preview button,
 * "Use this sound" (opens the uploader with it already chosen) and a grid of videos.
 */
export default function SoundShow({ sound, total = 0, videos: first = [], has_more = false }) {
    const [videos, setVideos] = useState(first)
    const [more, setMore] = useState(has_more)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [playing, setPlaying] = useState(false)
    const audioRef = useRef(null)

    useEffect(() => () => audioRef.current?.pause(), [])

    const back = () => (window.history.length > 1 ? window.history.back() : router.visit('/'))

    const toggle = () => {
        const a = audioRef.current
        if (!a) return
        if (playing) { a.pause(); setPlaying(false); return }
        a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }

    const loadMore = async () => {
        setLoading(true)
        try {
            const { data } = await axios.get(`/api/sounds/${sound.id}/videos`, { params: { page: page + 1 } })
            setVideos(v => [...v, ...(data.data ?? [])])
            setMore(!!data.has_more)
            setPage(p => p + 1)
        } catch { /* keep what we have */ } finally { setLoading(false) }
    }

    const h = hue(sound.id)
    const isOriginal = sound.source === 'original'

    return (
        <div style={{ minHeight: '100dvh', background: '#0a0a0a', color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
            <Head title={`${sound.title} · Sound`} />
            <style>{KEYFRAMES}</style>

            <div style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 12px) 14px calc(env(safe-area-inset-bottom) + 110px)' }}>
                <button onClick={back} aria-label="Back" style={{ width: 38, height: 38, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RiArrowLeftLine size={19} />
                </button>

                {/* Hero */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '18px 0 16px' }}>
                    <div style={{ position: 'relative', width: 104, height: 104, borderRadius: 22, overflow: 'hidden', flexShrink: 0, background: `linear-gradient(135deg, hsl(${h} 75% 48%), hsl(${(h + 55) % 360} 70% 28%))` }}>
                        {sound.cover_url && <img src={sound.cover_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                        <button onClick={toggle} aria-label={playing ? 'Pause preview' : 'Play preview'} style={{ position: 'absolute', inset: 0, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            {playing ? <RiPauseFill size={38} /> : <RiPlayFill size={38} />}
                        </button>
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.2, overflowWrap: 'anywhere' }}>{sound.title}</h1>
                        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{isOriginal ? `Original sound · ${sound.artist}` : sound.artist}</p>
                        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                            {total.toLocaleString()} video{total === 1 ? '' : 's'}{sound.duration ? ` · ${fmtTime(sound.duration)}` : ''}
                        </p>
                        {sound.attribution && <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{sound.attribution}</p>}
                        <a href={`/copyright?sound=${sound.id}`} style={{ display: 'inline-block', marginTop: 6, color: 'rgba(255,255,255,0.4)', fontSize: 11, textDecoration: 'underline' }}>Report this sound</a>
                    </div>
                </div>

                {/* Grid */}
                {videos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6 }}>
                        <RiMusic2Fill size={30} color="rgba(255,255,255,0.2)" /><br />
                        No videos use this sound yet. Be the first!
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                        {videos.map(v => (
                            <Link key={v.id} href={`/@${v.user?.username}/video/${v.ulid}`} style={{ position: 'relative', display: 'block', aspectRatio: '9/16', background: '#151515', overflow: 'hidden', borderRadius: 4 }}>
                                {v.thumbnail_url_full
                                    ? <img src={v.thumbnail_url_full} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: v.enhance ? 'contrast(1.07) saturate(1.14) brightness(1.04)' : 'none' }} />
                                    : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiMusic2Fill size={22} color="rgba(255,255,255,0.2)" /></div>}
                                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 6px 5px', background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)', fontSize: 11, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    @{v.user?.username}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {more && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                        <button onClick={loadMore} disabled={loading} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 999, padding: '10px 22px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {loading ? <Spinner size={14} /> : 'Load more'}
                        </button>
                    </div>
                )}
            </div>

            {/* Use this sound */}
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px calc(env(safe-area-inset-bottom) + 14px)', background: 'linear-gradient(to top, #0a0a0a 60%, transparent)', display: 'flex', justifyContent: 'center' }}>
                <a href={`/seller/upload?sound=${sound.id}`} style={{ width: '100%', maxWidth: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 999, background: '#FF6B35', color: '#fff', fontSize: 15, fontWeight: 800, textDecoration: 'none' }}>
                    <RiVideoAddLine size={19} /> Use this sound
                </a>
            </div>

            <audio ref={audioRef} src={sound.url} preload="none" onEnded={() => setPlaying(false)} />
        </div>
    )
}

SoundShow.layout = page => page
