import { useEffect, useRef, useState } from 'react'
import { RiPauseFill, RiPlayFill } from 'react-icons/ri'
import { fmtTime } from '../../lib/media'

const ACCENT = '#FF6B35'

/** Deterministic, natural-looking bars for when the real audio can't be decoded (e.g. no CORS on the file host). */
function fakePeaks(seed, n) {
    let x = (Number(seed) || 7) * 9301 + 49297
    const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280 }
    const out = []
    let v = 0.5
    for (let i = 0; i < n; i++) {
        v = Math.min(1, Math.max(0.12, v + (rnd() - 0.5) * 0.55))
        out.push(v)
    }
    return out
}

/**
 * Real waveform of an audio URL / blob URL as `bars` values in 0..1.
 * Falls back to a seeded fake waveform if the file can't be fetched or decoded.
 */
export function useWaveform(src, bars = 64, seed = 1, { waveformUrl = null, duration = 0, skipDecode = false } = {}) {
    const [peaks, setPeaks] = useState(() => fakePeaks(seed, bars))
    const [real, setReal] = useState(false)

    useEffect(() => {
        let dead = false
        setPeaks(fakePeaks(seed, bars))
        setReal(false)

        const reduce = (values) => {            // any-length array of 0..1 -> `bars` values
            const size = values.length / bars
            const out = []
            for (let i = 0; i < bars; i++) {
                let m = 0
                for (let j = Math.floor(i * size); j < Math.max(Math.floor(i * size) + 1, Math.floor((i + 1) * size)) && j < values.length; j++) m = Math.max(m, values[j])
                out.push(m)
            }
            const max = Math.max(...out, 0.0001)
            return out.map(v => Math.max(0.1, v / max))
        }

        ;(async () => {
            // 1) a ready-made waveform from the provider (BBC audiowaveform JSON: interleaved min/max)
            if (waveformUrl) {
                try {
                    const j = await (await fetch(waveformUrl)).json()
                    const d = j?.data
                    if (Array.isArray(d) && d.length > 3) {
                        const range = 2 ** ((j.bits || 8) - 1)
                        const vals = []
                        for (let i = 0; i + 1 < d.length; i += 2) vals.push(Math.max(Math.abs(d[i]), Math.abs(d[i + 1])) / range)
                        if (!dead) { setPeaks(reduce(vals)); setReal(true) }
                        return
                    }
                } catch { /* fall through */ }
            }
            // 2) decode the audio itself (skipped for very long files: decoding hundreds of MB would crash a phone tab)
            const Ctx = window.AudioContext || window.webkitAudioContext
            if (!src || !Ctx || duration > 900 || skipDecode) return
            let ctx
            try {
                const res = await fetch(src)
                if (!res.ok) throw new Error('fetch')
                const buf = await res.arrayBuffer()
                ctx = new Ctx()
                const audio = await new Promise((ok, no) => ctx.decodeAudioData(buf, ok, no))
                if (dead) return
                const ch = audio.getChannelData(0)
                const size = Math.floor(ch.length / bars) || 1
                const vals = []
                for (let i = 0; i < bars; i++) {
                    let sum = 0
                    let n = 0
                    const step = Math.max(1, Math.floor(size / 200))
                    for (let j = i * size; j < (i + 1) * size && j < ch.length; j += step) { sum += ch[j] * ch[j]; n++ }
                    vals.push(Math.sqrt(sum / (n || 1)))
                }
                setPeaks(reduce(vals))
                setReal(true)
            } catch { /* keep the fake waveform */ } finally {
                try { ctx?.close() } catch { /* ignore */ }
            }
        })()
        return () => { dead = true }
    }, [src, bars, seed, waveformUrl, duration, skipDecode])

    return { peaks, real }
}

function Bars({ peaks, progress = 0, height, active = ACCENT, idle = 'rgba(255,255,255,0.28)', from = 0, to = 1 }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, height, width: '100%' }}>
            {peaks.map((p, i) => {
                const pos = i / peaks.length
                const inWin = pos >= from && pos <= to
                const played = pos < progress
                return <span key={i} style={{ flex: 1, minWidth: 2, height: `${Math.max(10, p * 100)}%`, borderRadius: 2, background: !inWin ? 'rgba(255,255,255,0.16)' : played ? active : idle, transition: 'background 0.08s' }} />
            })}
        </div>
    )
}

/**
 * Custom audio player (no native controls): play/pause, waveform with progress, tap or drag to seek, time.
 * Pass either `src` (URL / blob URL).
 */
export default function AudioWave({ src, seed = 1, height = 38, bars = 48, skipDecode = false }) {
    const el = useRef(null)
    const box = useRef(null)
    const { peaks } = useWaveform(src, bars, seed, { skipDecode })
    const [playing, setPlaying] = useState(false)
    const [t, setT] = useState(0)
    const [dur, setDur] = useState(0)
    const dragging = useRef(false)

    useEffect(() => { setPlaying(false); setT(0); setDur(0) }, [src])

    const toggle = () => {
        const a = el.current
        if (!a) return
        if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {})
        else { a.pause(); setPlaying(false) }
    }

    const seekTo = (clientX) => {
        const a = el.current
        const r = box.current?.getBoundingClientRect()
        if (!a || !r || !dur) return
        const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
        a.currentTime = ratio * dur
        setT(a.currentTime)
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 999, padding: '8px 14px 8px 8px' }}>
            <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: ACCENT, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {playing ? <RiPauseFill size={20} /> : <RiPlayFill size={20} />}
            </button>
            <div
                ref={box}
                onPointerDown={e => { dragging.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); seekTo(e.clientX) }}
                onPointerMove={e => { if (dragging.current) seekTo(e.clientX) }}
                onPointerUp={() => { dragging.current = false }}
                onPointerCancel={() => { dragging.current = false }}
                style={{ flex: 1, minWidth: 0, cursor: 'pointer', touchAction: 'none' }}
            >
                <Bars peaks={peaks} progress={dur ? t / dur : 0} height={height} />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtTime(playing || t ? t : dur)}</span>
            <audio
                ref={el}
                src={src}
                preload="metadata"
                onLoadedMetadata={e => setDur(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
                onTimeUpdate={e => { if (!dragging.current) setT(e.currentTarget.currentTime) }}
                onEnded={() => { setPlaying(false); setT(0) }}
                onPause={() => setPlaying(false)}
                onPlay={() => setPlaying(true)}
            />
        </div>
    )
}

export const MAX_USE_SECONDS = 150   // the part of a sound a video can use: 2:30

/**
 * Choose which part of a sound to use. Shows the WHOLE sound as a waveform with a highlighted range:
 *  - drag the left or right edge to make the range longer or shorter,
 *  - drag the middle to slide the range along,
 *  - the range can never be longer than 2:30 (the box stops growing and says so),
 *  - long sounds scroll sideways.
 * `videoSec` marks where the video ends inside the range (music after that point will not play).
 */
export function WaveScrubber({ src, waveformUrl, seed = 1, duration, start, end, onChange, playhead = null, videoSec = 0, maxSpan = MAX_USE_SECONDS, height = 64 }) {
    const scroller = useRef(null)
    const drag = useRef(null)
    const [W, setW] = useState(320)
    const [capped, setCapped] = useState(false)
    const minSpan = Math.min(1, duration)

    useEffect(() => {
        const el = scroller.current
        if (!el) return undefined
        const ro = new ResizeObserver(() => setW(el.clientWidth || 320))
        ro.observe(el)
        setW(el.clientWidth || 320)
        return () => ro.disconnect()
    }, [])

    const pxPerSec = Math.max(W / Math.max(duration, 1), (W * 0.9) / maxSpan)   // at least: a full 2:30 box fills ~90% of the width
    const contentW = Math.max(W, duration * pxPerSec)
    const bars = Math.max(24, Math.floor(contentW / 4))
    const { peaks } = useWaveform(src, bars, seed, { waveformUrl, duration })

    // Bring the range into view when the sound changes
    useEffect(() => {
        if (scroller.current) scroller.current.scrollLeft = Math.max(0, start * pxPerSec - W * 0.15)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src, duration])

    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
    const begin = (mode) => (e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture?.(e.pointerId)
        drag.current = { mode, x0: e.clientX, s0: start, e0: end }
    }
    const move = (e) => {
        const d = drag.current
        if (!d) return
        const dt = (e.clientX - d.x0) / pxPerSec
        let s = d.s0
        let en = d.e0
        let hit = false
        if (d.mode === 'body') {
            const shift = clamp(dt, -d.s0, duration - d.e0)
            s = d.s0 + shift
            en = d.e0 + shift
        } else if (d.mode === 'left') {
            const lo = Math.max(0, d.e0 - maxSpan)
            const raw = d.s0 + dt
            hit = raw < lo && lo > 0
            s = clamp(raw, lo, d.e0 - minSpan)
        } else {
            const hi = Math.min(duration, d.s0 + maxSpan)
            const raw = d.e0 + dt
            hit = raw > hi && hi < duration
            en = clamp(raw, d.s0 + minSpan, hi)
        }
        setCapped(hit)
        onChange({ start: Math.round(s * 10) / 10, end: Math.round(en * 10) / 10 })
    }
    const finish = () => { drag.current = null; setCapped(false) }

    const x = (t) => t * pxPerSec
    const span = end - start
    const accent = capped ? '#EF4444' : ACCENT
    const videoCut = videoSec > 0 && videoSec < span ? start + videoSec : null
    const handle = { position: 'absolute', top: 0, bottom: 0, width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'ew-resize', touchAction: 'none', zIndex: 3 }
    const grip = { width: 5, height: 26, borderRadius: 3, background: '#fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.4)' }

    return (
        <div>
            <div ref={scroller} style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', touchAction: 'pan-x' }}>
                <div style={{ position: 'relative', width: contentW, padding: '6px 0' }}>
                    <Bars peaks={peaks} progress={playhead != null && duration ? playhead / duration : 0} height={height} from={start / duration} to={end / duration} idle="rgba(255,255,255,0.75)" active="#fff" />

                    {/* The range */}
                    <div
                        onPointerDown={begin('body')} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}
                        style={{ position: 'absolute', top: 2, bottom: 2, left: x(start), width: Math.max(8, x(span)), border: `2px solid ${accent}`, borderRadius: 10, background: capped ? 'rgba(239,68,68,0.12)' : 'rgba(255,107,53,0.10)', boxSizing: 'border-box', cursor: 'grab', touchAction: 'none', zIndex: 2, transition: 'border-color 0.12s' }}
                    >
                        {videoCut != null && (
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: x(videoCut - start), right: 0, background: 'repeating-linear-gradient(135deg, rgba(0,0,0,0.5), rgba(0,0,0,0.5) 4px, rgba(0,0,0,0.3) 4px, rgba(0,0,0,0.3) 8px)', borderRadius: '0 8px 8px 0', pointerEvents: 'none' }} />
                        )}
                        <div onPointerDown={e => { e.stopPropagation(); begin('left')(e) }} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} style={{ ...handle, left: -15 }}><span style={grip} /></div>
                        <div onPointerDown={e => { e.stopPropagation(); begin('right')(e) }} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} style={{ ...handle, right: -15 }}><span style={grip} /></div>
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 6, color: 'rgba(255,255,255,0.5)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                <span>Using <b style={{ color: accent }}>{fmtTime(start)} – {fmtTime(end)}</b> ({fmtTime(span)})</span>
                <span style={{ color: capped ? '#EF4444' : undefined, fontWeight: capped ? 800 : 400 }}>{capped ? `Max ${fmtTime(maxSpan)}` : `${fmtTime(duration)} total · max ${fmtTime(maxSpan)}`}</span>
            </div>
            {videoCut != null && (
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Your video is {fmtTime(videoSec)} long, so the striped part won&apos;t play.</p>
            )}
        </div>
    )
}
