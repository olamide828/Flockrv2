import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { RiBookmarkFill, RiBookmarkLine, RiCloseLine, RiFlagLine, RiMusic2Fill, RiPauseFill, RiPlayFill, RiShareForwardLine, RiVideoAddLine, RiForbid2Line } from 'react-icons/ri'
import SoundShareSheet from '@/Components/Sound/SoundShareSheet'
import VideoThumb from '@/Components/Video/VideoThumb'
import { useToast } from '@/Components/Toast'

const hue = (id) => (Number(id || 0) * 47) % 360
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

const GONE = {
    copyright: { title: 'This sound was removed', text: 'It was taken down after a copyright claim, so it can no longer be played or used in new videos.' },
    private:   { title: 'This sound is private', text: 'Its owner has not made it available to everyone.' },
    removed:   { title: 'This sound is no longer available', text: 'It has been removed from Flockr. Videos that used it may no longer be available either.' },
}

/**
 * Full-height sheet for one sound: details, preview, "Use this sound" and the videos that use it.
 * Pass `soundId`, or `fromVideo` (a video ulid, for a creator's original sound). A deleted or taken-down sound is
 * shown as a friendly "removed" state, with the reason, instead of a 404 page.
 */
export default function SoundDetailsSheet({ soundId, soundUlid, fromVideo, onClose }) {
    const { showToast, ToastComponent } = useToast()
    const [closing, setClosing] = useState(false)
    const [state, setState] = useState({ loading: true })
    const [videos, setVideos] = useState([])
    const [more, setMore] = useState(false)
    const [page, setPage] = useState(1)
    const [loadingMore, setLoadingMore] = useState(false)
    const [playing, setPlaying] = useState(false)
    const [shareOpen, setShareOpen] = useState(false)
    const audioRef = useRef(null)
    const sentinel = useRef(null)

    const close = () => { setClosing(true); setTimeout(onClose, 200) }

    useEffect(() => {
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const onKey = (e) => { if (e.key === 'Escape') close() }
        window.addEventListener('keydown', onKey)
        return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); audioRef.current?.pause() }
    }, []) // eslint-disable-line

    useEffect(() => {
        let alive = true
        const url = fromVideo ? `/api/sounds/from-video/${fromVideo}/sheet` : soundUlid ? `/api/sounds/u/${soundUlid}/sheet` : `/api/sounds/${soundId}/sheet`
        axios.get(url)
            .then(({ data }) => {
                if (!alive) return
                setState(data)
                setVideos(data.videos ?? []); setMore(!!data.has_more); setPage(1)
            })
            .catch(() => alive && setState({ status: 'error' }))
        return () => { alive = false }
    }, [soundId, soundUlid, fromVideo])

    const sound = state.sound
    const toggleSave = async () => {
        if (!sound) return
        const was = !!sound.is_saved
        setState(st => ({ ...st, sound: { ...st.sound, is_saved: !was } }))
        try {
            const { data } = await axios.post(`/api/sounds/${sound.id}/save`)
            setState(st => ({ ...st, sound: { ...st.sound, is_saved: data.saved } }))
            showToast(data.saved ? 'Sound saved' : 'Removed from saved', data.saved ? 'success' : 'info')
        } catch (e) {
            setState(st => ({ ...st, sound: { ...st.sound, is_saved: was } }))
            if (e?.response?.status === 401) { window.location.href = '/login'; return }
            showToast('Could not update saved sounds', 'error')
        }
    }
    const loadMore = useCallback(async () => {
        if (!sound || loadingMore || !more) return
        setLoadingMore(true)
        try {
            const { data } = await axios.get(`/api/sounds/${sound.id}/videos`, { params: { page: page + 1 } })
            setVideos(v => [...v, ...(data.data ?? []).filter(n => !v.some(o => o.id === n.id))])
            setMore(!!data.has_more); setPage(p => p + 1)
        } catch { setMore(false) } finally { setLoadingMore(false) }
    }, [sound, loadingMore, more, page])

    // infinite scroll
    useEffect(() => {
        const el = sentinel.current
        if (!el || !more) return
        const io = new IntersectionObserver(([e]) => e.isIntersecting && loadMore(), { rootMargin: '400px' })
        io.observe(el)
        return () => io.disconnect()
    }, [more, loadMore])

    const toggle = () => {
        const a = audioRef.current
        if (!a) return
        if (playing) { a.pause(); setPlaying(false); return }
        a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }

    const h = hue(sound?.id)
    const gone = state.status === 'removed' || state.status === 'error'
    const goneInfo = state.status === 'error' ? { title: 'Could not load this sound', text: 'Check your connection and try again.' } : GONE[state.reason] ?? GONE.removed

    return createPortal(
        // React events bubble through portals: stop them so taps inside the sheet never reach the video behind it
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100 }} onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
            <div onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', animation: 'sdFade 0.2s ease' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '94dvh', maxWidth: 860, margin: '0 auto', background: '#0b0b0d', borderRadius: '26px 26px 0 0', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#fff', fontFamily: 'DM Sans, sans-serif', animation: closing ? 'sdDown 0.2s ease forwards' : 'sdUp 0.3s cubic-bezier(0.22,1,0.36,1)' }}>
                <style>{`
                    @keyframes sdUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
                    @keyframes sdDown{to{transform:translateY(100%)}}
                    @keyframes sdFade{from{opacity:0}to{opacity:1}}
                    @keyframes sdShimmer{0%{opacity:.5}50%{opacity:1}100%{opacity:.5}}
                    @keyframes sdRing{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.35);opacity:0}}
                    @keyframes spin{to{transform:rotate(360deg)}}
                    .sd-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
                    @media (min-width:700px){.sd-grid{grid-template-columns:repeat(4,1fr);gap:10px}}
                `}</style>

                {/* header bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, display: 'flex', justifyContent: 'center', paddingTop: 8, pointerEvents: 'none' }}>
                    <div style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.22)' }} />
                </div>
                <button onClick={close} aria-label="Close" style={{ position: 'absolute', top: 14, right: 14, zIndex: 6, width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RiCloseLine size={19} />
                </button>

                <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
                    {state.loading && (
                        <div style={{ padding: '70px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 132, height: 132, borderRadius: 28, background: 'rgba(255,255,255,0.06)', animation: 'sdShimmer 1.4s infinite' }} />
                            <div style={{ width: 180, height: 18, borderRadius: 8, background: 'rgba(255,255,255,0.06)', animation: 'sdShimmer 1.4s infinite' }} />
                            <div style={{ width: 120, height: 14, borderRadius: 8, background: 'rgba(255,255,255,0.05)', animation: 'sdShimmer 1.4s infinite' }} />
                        </div>
                    )}

                    {gone && (
                        <div style={{ padding: '110px 28px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}>
                            <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <RiForbid2Line size={38} color="rgba(255,255,255,0.35)" />
                            </div>
                            <h2 style={{ margin: '8px 0 0', fontSize: 19, fontWeight: 800 }}>{goneInfo.title}</h2>
                            <p style={{ margin: 0, maxWidth: 320, color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6 }}>{goneInfo.text}</p>
                            {state.reason === 'copyright' && <a href="/copyright" style={{ color: '#FF6B35', fontSize: 13, fontWeight: 600, marginTop: 4 }}>Read our copyright policy</a>}
                            <button onClick={close} style={{ marginTop: 18, padding: '12px 30px', borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Close</button>
                        </div>
                    )}

                    {sound && (
                        <>
                            {/* hero */}
                            <div style={{ position: 'relative', padding: '46px 20px 22px', textAlign: 'center', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', inset: 0, background: sound.cover_url ? `center/cover url(${sound.cover_url})` : `linear-gradient(160deg, hsl(${h} 70% 38%), hsl(${(h + 60) % 360} 65% 14%))`, filter: 'blur(38px) saturate(1.3)', transform: 'scale(1.4)', opacity: 0.55 }} />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(11,11,13,0.1), #0b0b0d 96%)' }} />
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
                                        {playing && <span style={{ position: 'absolute', inset: 0, borderRadius: 30, border: '2px solid rgba(255,107,53,0.7)', animation: 'sdRing 1.4s ease-out infinite' }} />}
                                        <div style={{ position: 'absolute', inset: 0, borderRadius: 28, overflow: 'hidden', background: `linear-gradient(135deg, hsl(${h} 75% 48%), hsl(${(h + 55) % 360} 70% 26%))`, boxShadow: '0 18px 50px rgba(0,0,0,0.55)' }}>
                                            {sound.cover_url
                                                ? <img src={sound.cover_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiMusic2Fill size={46} color="rgba(255,255,255,0.55)" /></div>}
                                            <button onClick={toggle} aria-label={playing ? 'Pause preview' : 'Play preview'} style={{ position: 'absolute', inset: 0, border: 'none', cursor: 'pointer', background: playing ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0.22)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                                                    {playing ? <RiPauseFill size={28} /> : <RiPlayFill size={28} style={{ marginLeft: 2 }} />}
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    <h1 style={{ margin: '18px 0 0', fontSize: 21, fontWeight: 800, lineHeight: 1.2, overflowWrap: 'anywhere' }}>{sound.title}</h1>
                                    <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>{sound.source === 'original' ? `Original sound · ${sound.artist}` : sound.artist}</p>
                                    <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.42)', fontSize: 12 }}>
                                        {(state.total ?? 0).toLocaleString()} video{state.total === 1 ? '' : 's'}{sound.duration ? ` · ${fmtTime(sound.duration)}` : ''}
                                    </p>
                                    {sound.attribution && <p style={{ margin: '8px auto 0', maxWidth: 360, color: 'rgba(255,255,255,0.34)', fontSize: 11, lineHeight: 1.5 }}>{sound.attribution}</p>}

                                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
                                        <a href={`/seller/upload?sound=${sound.id}`} style={{ flex: '0 1 240px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 20px', borderRadius: 999, background: '#FF6B35', color: '#fff', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
                                            <RiVideoAddLine size={18} /> Use this sound
                                        </a>
                                        <button onClick={toggleSave} aria-label={sound.is_saved ? 'Remove from saved' : 'Save sound'} style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.09)', border: 'none', color: sound.is_saved ? '#FF6B35' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                            {sound.is_saved ? <RiBookmarkFill size={19} /> : <RiBookmarkLine size={19} />}
                                        </button>
                                        <button onClick={() => setShareOpen(true)} aria-label="Share sound" style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.09)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <RiShareForwardLine size={19} />
                                        </button>
                                        <a href={`/copyright?sound=${sound.id}`} aria-label="Report sound" style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.09)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <RiFlagLine size={18} />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* videos */}
                            <div style={{ padding: '4px 14px calc(env(safe-area-inset-bottom) + 28px)' }}>
                                <p style={{ margin: '0 2px 12px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Videos with this sound</p>
                                {videos.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '36px 24px', color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6 }}>
                                        <RiMusic2Fill size={28} color="rgba(255,255,255,0.18)" /><br />No videos use this sound yet. Be the first!
                                    </div>
                                ) : (
                                    <div className="sd-grid">
                                        {videos.map(v => <VideoThumb key={v.id} video={v} onNavigate={close} />)}
                                    </div>
                                )}
                                {more && <div ref={sentinel} style={{ display: 'flex', justifyContent: 'center', padding: '18px 0' }}>{loadingMore && <div style={{ width: 22, height: 22, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}</div>}
                            </div>
                            {shareOpen && <SoundShareSheet sound={sound} onClose={() => setShareOpen(false)} />}
                            <audio ref={audioRef} src={sound.url} preload="none" onEnded={() => setPlaying(false)} />
                        </>
                    )}
                </div>
            </div>
            {ToastComponent}
        </div>,
        document.body,
    )
}
