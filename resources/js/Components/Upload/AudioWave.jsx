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
export function useWaveform(src, bars = 64, seed = 1) {
    const [peaks, setPeaks] = useState(() => fakePeaks(seed, bars))
    const [real, setReal] = useState(false)

    useEffect(() => {
        let dead = false
        setPeaks(fakePeaks(seed, bars))
        setReal(false)
        if (!src) return undefined
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return undefined

        ;(async () => {
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
                const out = []
                for (let i = 0; i < bars; i++) {
                    let sum = 0
                    const from = i * size
                    const step = Math.max(1, Math.floor(size / 200))
                    let n = 0
                    for (let j = from; j < from + size && j < ch.length; j += step) { sum += ch[j] * ch[j]; n++ }
                    out.push(Math.sqrt(sum / (n || 1)))
                }
                const max = Math.max(...out, 0.0001)
                setPeaks(out.map(v => Math.max(0.1, v / max)))
                setReal(true)
            } catch { /* keep the fake waveform */ } finally {
                try { ctx?.close() } catch { /* ignore */ }
            }
        })()
        return () => { dead = true }
    }, [src, bars, seed])

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
export default function AudioWave({ src, seed = 1, height = 38, bars = 48 }) {
    const el = useRef(null)
    const box = useRef(null)
    const { peaks } = useWaveform(src, bars, seed)
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

/**
 * Pick which part of a long sound to use: the whole sound as a waveform with a highlighted window the
 * length of the video. Tap or drag anywhere to move the window. `playhead` (seconds) shows preview progress.
 */
export function WaveScrubber({ peaks, duration, windowSec, start, onChange, playhead = null, height = 54 }) {
    const box = useRef(null)
    const dragging = useRef(false)
    const win = Math.min(windowSec || duration, duration)
    const maxStart = Math.max(0, Math.floor(duration - win))

    const move = (clientX) => {
        const r = box.current?.getBoundingClientRect()
        if (!r || !duration) return
        const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
        const centre = ratio * duration
        onChange(Math.round(Math.min(maxStart, Math.max(0, centre - win / 2))))
    }

    const from = start / duration
    const to = (start + win) / duration
    const progress = playhead != null && duration ? playhead / duration : from

    return (
        <div>
            <div
                ref={box}
                onPointerDown={e => { dragging.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); move(e.clientX) }}
                onPointerMove={e => { if (dragging.current) move(e.clientX) }}
                onPointerUp={() => { dragging.current = false }}
                onPointerCancel={() => { dragging.current = false }}
                style={{ position: 'relative', cursor: 'ew-resize', touchAction: 'none', padding: '4px 0' }}
            >
                <Bars peaks={peaks} progress={progress} height={height} from={from} to={to} idle="rgba(255,255,255,0.7)" />
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${from * 100}%`, width: `${(to - from) * 100}%`, border: `2px solid ${ACCENT}`, borderRadius: 8, pointerEvents: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, color: 'rgba(255,255,255,0.45)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                <span>Starts at <b style={{ color: ACCENT }}>{fmtTime(start)}</b></span>
                <span>Drag to choose the part · {fmtTime(duration)} total</span>
            </div>
        </div>
    )
}
