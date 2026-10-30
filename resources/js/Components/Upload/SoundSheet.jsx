import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { RiAddLine, RiCloseLine, RiDeleteBinLine, RiMusic2Fill, RiPauseFill, RiPlayFill, RiSearchLine, RiShieldCheckLine, RiUserVoiceLine } from 'react-icons/ri'
import { attachAudioSource, fmtTime } from '../../lib/media'
import { MAX_USE_SECONDS, WaveScrubber } from './AudioWave'
import CreateSound from './CreateSound'
import { S, Spinner } from './ui'

const TABS = [
    { id: 'library',  label: 'Library',         hint: 'Royalty-free music cleared for use in videos' },
    { id: 'free',     label: 'Free music',      hint: 'Free songs (CC0 / CC BY). Credit is added to your video automatically' },
    { id: 'creators', label: 'Creator sounds',  hint: 'Original sounds from videos on Flockr' },
    { id: 'mine',     label: 'My sounds',       hint: 'Sounds you recorded or uploaded' },
    { id: 'epidemic', label: 'Epidemic',        hint: 'Epidemic Sound catalogue', optional: true },
]

const hue = (id) => (Number(id) || [...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0)) * 47 % 360

function Cover({ sound, playing, onToggle }) {
    return (
        <button
            onClick={e => { e.stopPropagation(); onToggle() }}
            aria-label={playing ? 'Pause preview' : 'Play preview'}
            style={{ position: 'relative', width: 48, height: 48, borderRadius: 12, border: 'none', padding: 0, overflow: 'hidden', flexShrink: 0, cursor: 'pointer', background: `linear-gradient(135deg, hsl(${hue(sound.id)} 75% 48%), hsl(${(hue(sound.id) + 50) % 360} 70% 30%))` }}
        >
            {sound.cover_url && <img src={sound.cover_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.28)' }}>
                {playing ? <RiPauseFill size={22} color="#fff" /> : <RiPlayFill size={22} color="#fff" />}
            </span>
        </button>
    )
}

function Slider({ label, value, min = 0, max = 100, step = 1, onChange, format }) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={S.smallLabel}>{label}</span>
                <span style={{ color: '#FF6B35', fontSize: 12, fontWeight: 700 }}>{format ? format(value) : value}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: '100%', accentColor: '#FF6B35', cursor: 'pointer' }} />
        </div>
    )
}

/**
 * Bottom sheet to pick a sound for the video and mix it with the original audio.
 * Sounds come from GET /api/sounds (library tracks + original sounds from creators).
 */
export default function SoundSheet({ open, onClose, current, originalVolume, hasOwnAudio, videoDuration, isAdmin = false, onApply, onRemove }) {
    const [tab, setTab] = useState('library')
    const [q, setQ] = useState('')
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [hasMore, setHasMore] = useState(false)
    const [playingId, setPlayingId] = useState(null)
    const [creating, setCreating] = useState(false)
    const [playhead, setPlayhead] = useState(null)

    const [sel, setSel] = useState(null)
    const [start, setStart] = useState(0)
    const [end, setEnd] = useState(0)
    const [epidemicOn, setEpidemicOn] = useState(false)
    const [importing, setImporting] = useState(false)
    const [musicVol, setMusicVol] = useState(70)
    const [origVol, setOrigVol] = useState(100)

    const audioRef = useRef(null)
    const reqId = useRef(0)

    // Load the current selection into the sheet each time it opens
    useEffect(() => {
        if (!open) { audioRef.current?.pause(); setPlayingId(null); setCreating(false); return }
        setSel(current?.sound ?? null)
        setStart(current?.start ?? 0)
        setEnd(current?.end ?? 0)
        setMusicVol(Math.round((current?.musicVolume ?? 0.7) * 100))
        setOrigVol(Math.round(originalVolume * 100))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const load = useCallback(async (reset, offset = 0) => {
        const id = ++reqId.current
        setLoading(true)
        setError(null)
        try {
            const { data } = await axios.get('/api/sounds', { params: { tab, q: q.trim() || undefined, offset } })
            if (id !== reqId.current) return
            const rows = Array.isArray(data) ? data : (data?.data ?? [])
            setItems(prev => (reset ? rows : [...prev, ...rows]))
            setHasMore(!!data?.has_more)
            if (data?.meta?.epidemic) setEpidemicOn(true)
        } catch {
            if (id === reqId.current) setError('Could not load sounds. Check your connection and try again.')
        } finally {
            if (id === reqId.current) setLoading(false)
        }
    }, [tab, q])

    useEffect(() => {
        if (!open) return undefined
        const t = setTimeout(() => load(true, 0), q ? 300 : 0)
        return () => clearTimeout(t)
    }, [open, tab, q, load])

    const togglePreview = async (sound, from = 0) => {
        const a = audioRef.current
        if (!a) return
        if (playingId === sound.id) { a.pause(); setPlayingId(null); return }
        try {
            let url = sound.url
            if (!url && sound.source === 'epidemic') {
                const { data } = await axios.get(`/api/sounds/epidemic/${sound.external_id}/preview`)
                url = data.url
            }
            if (!url) return
            a.pause()
            a.volume = musicVol / 100
            await attachAudioSource(a, url)
            const go = () => { try { a.currentTime = from } catch { /* not seekable yet */ } a.play().then(() => setPlayingId(sound.id)).catch(() => setPlayingId(null)) }
            if (a.readyState >= 1) go(); else a.addEventListener('loadedmetadata', go, { once: true })
        } catch {
            setError('Could not play that preview.')
        }
    }

    // Default range: as much as the video can use, never more than 2:30 or the sound itself
    const defaultEnd = (sound, from = 0) => Math.min(sound.duration || MAX_USE_SECONDS, from + Math.min(videoDuration || 60, MAX_USE_SECONDS))

    const choose = (sound) => {
        setSel(sound)
        setStart(0)
        setEnd(defaultEnd(sound, 0))
        if (playingId !== sound.id) togglePreview(sound, 0)
    }

    const remove = async (sound) => {
        if (!window.confirm(`Delete “${sound.title}”? Videos already posted with it keep their audio.`)) return
        try {
            await axios.delete(`/api/sounds/${sound.id}`)
            setItems(prev => prev.filter(x => x.id !== sound.id))
            if (sel?.id === sound.id) { setSel(null); audioRef.current?.pause(); setPlayingId(null) }
        } catch { setError('Could not delete that sound.') }
    }

    const saved = (sound) => {
        setCreating(false)
        setTab(sound.source === 'library' ? 'library' : 'mine')
        setQ('')
        setItems(prev => [sound, ...prev.filter(x => x.id !== sound.id)])
        choose(sound)
    }

    useEffect(() => { if (audioRef.current) audioRef.current.volume = musicVol / 100 }, [musicVol])

    const onRange = ({ start: s0, end: e0 }) => {
        if (s0 !== start && audioRef.current && playingId) audioRef.current.currentTime = s0
        setStart(s0)
        setEnd(e0)
    }

    const apply = async () => {
        audioRef.current?.pause()
        setPlayingId(null)
        let chosen = sel
        if (sel.source === 'epidemic' || sel.source === 'openverse') {
            // External tracks are copied into our library the first time someone uses them
            setImporting(true)
            try {
                const { data } = await axios.post(sel.source === 'openverse' ? `/api/sounds/free/${sel.external_id}/import` : `/api/sounds/epidemic/${sel.external_id}/import`)
                chosen = data.sound
            } catch (e) {
                setImporting(false)
                setError(e?.response?.data?.message || 'Could not add that track. Try another one.')
                return
            }
            setImporting(false)
        }
        onApply({ sound: chosen, start, end: end || defaultEnd(chosen, start), musicVolume: musicVol / 100 }, origVol / 100)
    }

    if (!open) return null

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '82dvh', display: 'flex', flexDirection: 'column', background: '#111', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', animation: 'sheetUp 0.28s cubic-bezier(0.22,1,0.36,1)' }}>
                <div style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '10px auto 6px' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 18px 10px' }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fff' }}>{creating ? 'Create sound' : 'Add sound'}</h2>
                    {!creating && (
                        <button onClick={() => setCreating(true)} style={{ marginLeft: 'auto', marginRight: 10, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#FF6B35,#FF3D6E)', color: '#fff', fontSize: 12, fontWeight: 800 }}>
                            <RiAddLine size={15} /> Create sound
                        </button>
                    )}
                    <button onClick={onClose} style={{ ...S.iconBtn, width: 32, height: 32 }} aria-label="Close"><RiCloseLine size={18} /></button>
                </div>

                {creating ? <CreateSound isAdmin={isAdmin} onBack={() => setCreating(false)} onSaved={saved} /> : (<>
                {/* Search */}
                <div style={{ padding: '0 18px 10px', position: 'relative' }}>
                    <RiSearchLine size={15} color="rgba(255,255,255,0.35)" style={{ position: 'absolute', left: 31, top: 14 }} />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search songs, artists, sounds" style={{ ...S.inp, paddingLeft: 38, borderRadius: 999 }} />
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, padding: '0 18px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {TABS.filter(t => !t.optional || epidemicOn || tab === t.id).map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} aria-pressed={tab === t.id} style={{ padding: '8px 14px', whiteSpace: 'nowrap', flexShrink: 0, borderRadius: 999, border: 'none', cursor: 'pointer', background: tab === t.id ? '#fff' : 'rgba(255,255,255,0.07)', color: tab === t.id ? '#000' : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700 }}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <p style={{ margin: '0 18px 8px', color: 'rgba(255,255,255,0.35)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <RiShieldCheckLine size={12} /> {TABS.find(t => t.id === tab).hint}
                </p>

                {/* List */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 12px' }}>
                    {error && <div style={{ ...S.errBanner, margin: '6px 6px 12px' }}>{error} <button onClick={() => load(true, 0)} style={{ background: 'none', border: 'none', color: '#fff', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>Retry</button></div>}

                    {items.map(s => {
                        const active = sel?.id === s.id
                        return (
                            <div key={s.id} role="button" tabIndex={0} onClick={() => choose(s)} onKeyDown={e => { if (e.key === 'Enter') choose(s) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 8px', borderRadius: 14, cursor: 'pointer', background: active ? 'rgba(255,107,53,0.1)' : 'transparent', border: `1px solid ${active ? 'rgba(255,107,53,0.4)' : 'transparent'}` }}>
                                <Cover sound={s} playing={playingId === s.id} onToggle={() => togglePreview(s, active ? start : 0)} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, color: '#fff', fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</p>
                                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        {s.source === 'original' && <RiUserVoiceLine size={12} />}
                                        {s.artist}{s.duration ? ` · ${fmtTime(s.duration)}` : ''}{s.uses_count ? ` · ${s.uses_count.toLocaleString()} videos` : ''}
                                    </p>
                                </div>
                                {(s.mine || isAdmin) && (
                                    <button onClick={e => { e.stopPropagation(); remove(s) }} aria-label="Delete sound" style={{ ...S.iconBtn, width: 32, height: 32, flexShrink: 0 }}><RiDeleteBinLine size={16} /></button>
                                )}
                            </div>
                        )
                    })}

                    {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 18 }}><Spinner size={20} /></div>}

                    {!loading && !error && items.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '36px 24px', color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6 }}>
                            <RiMusic2Fill size={28} color="rgba(255,255,255,0.2)" style={{ marginBottom: 8 }} /><br />
                            {q ? `No sounds match “${q}”.` : tab === 'creators' ? 'No creator sounds yet. Post a video with original audio and it will show up here.' : tab === 'mine' ? 'You have not made a sound yet. Tap “Create sound” to record or upload one.' : 'No library tracks yet.'}
                        </div>
                    )}

                    {hasMore && !loading && (
                        <button onClick={() => load(false, items.length)} style={{ display: 'block', margin: '8px auto 14px', background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 999, padding: '8px 18px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Load more</button>
                    )}
                </div>

                </>)}

                {/* Mix panel */}
                {!creating && (sel || current) && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 18px calc(env(safe-area-inset-bottom) + 14px)', background: '#0d0d0d', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {sel && <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>♪ {sel.title} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>· {sel.artist}</span></p>}
                        {sel && sel.duration > 0 && <WaveScrubber src={sel.url} waveformUrl={sel.waveform_url} seed={sel.id} duration={sel.duration} start={start} end={end || defaultEnd(sel, start)} onChange={onRange} playhead={playingId === sel.id ? playhead : null} videoSec={videoDuration || 0} />}
                        {sel && <Slider label="Music volume" value={musicVol} onChange={setMusicVol} format={v => `${v}%`} />}
                        {hasOwnAudio && <Slider label="Your video's sound" value={origVol} onChange={setOrigVol} format={v => (v === 0 ? 'Off' : `${v}%`)} />}
                        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                            {current && <button onClick={() => { audioRef.current?.pause(); onRemove() }} style={{ ...S.outlineBtn, padding: '12px 18px', fontSize: 13 }}>Remove</button>}
                            <button onClick={sel ? apply : onClose} disabled={importing} style={{ ...S.primaryBtn, flex: 1, padding: '12px 0', fontSize: 14 }}>{importing ? <Spinner size={16} /> : sel ? 'Use this sound' : 'Done'}</button>
                        </div>
                    </div>
                )}
            </div>
            <audio ref={audioRef} preload="none" onEnded={() => setPlayingId(null)} onTimeUpdate={e => { const t = e.currentTarget.currentTime; setPlayhead(t); if (sel && playingId === sel.id && end && t >= end) e.currentTarget.currentTime = start }} />
        </div>
    )
}
