import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { RiImageLine, RiPlayFill } from 'react-icons/ri'
import { Spinner } from './ui'

/**
 * A looping, autoplaying preview that doesn't depend on lucky browser behaviour:
 *  - it asks to play on every readiness event (iOS never fires `loadeddata` on its own),
 *  - if sound is blocked it falls back to muted playback and tells the parent,
 *  - if the browser cannot decode the file it says so instead of showing a black screen,
 *  - tapping toggles play / pause.
 */
const PreviewVideo = forwardRef(function PreviewVideo(
    { src, muted = false, volume = 1, onSoundBlocked, onStatus, onMetrics, style, children },
    ref,
) {
    const el = useRef(null)
    useImperativeHandle(ref, () => el.current)

    const [status, setStatus] = useState('loading')   // loading | playing | slow | error
    const [paused, setPaused] = useState(false)
    const mutedRef = useRef(muted)
    mutedRef.current = muted

    useEffect(() => {
        const v = el.current
        if (!v || !src) return undefined
        let dead = false
        setStatus('loading')

        const play = async () => {
            if (dead) return
            v.muted = mutedRef.current
            try {
                await v.play()
            } catch {
                if (dead) return
                if (!v.muted) {                       // autoplay with sound was refused
                    v.muted = true
                    onSoundBlocked?.()
                    try { await v.play() } catch { /* the user can tap to start it */ }
                }
            }
        }
        const onPlaying = () => { if (!dead) { setStatus('playing'); setPaused(false); onStatus?.('playing') } }
        const onError   = () => { if (!dead) { setStatus('error'); onStatus?.('error') } }
        const onPause   = () => { if (!dead && !v.ended) setPaused(true) }
        const onMeta    = () => { if (!dead) onMetrics?.({ width: v.videoWidth, height: v.videoHeight, duration: Number.isFinite(v.duration) ? v.duration : null }) }

        v.addEventListener('loadedmetadata', onMeta)
        v.addEventListener('loadeddata', play)
        v.addEventListener('canplay', play)
        v.addEventListener('playing', onPlaying)
        v.addEventListener('pause', onPause)
        v.addEventListener('error', onError)
        play()

        const t = setTimeout(() => { if (!dead && v.readyState < 2 && !v.error) setStatus('slow') }, 4000)
        return () => {
            dead = true
            clearTimeout(t)
            v.removeEventListener('loadedmetadata', onMeta)
            v.removeEventListener('loadeddata', play)
            v.removeEventListener('canplay', play)
            v.removeEventListener('playing', onPlaying)
            v.removeEventListener('pause', onPause)
            v.removeEventListener('error', onError)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src])

    // Keep the element in step with the mute / volume the parent wants
    useEffect(() => {
        const v = el.current
        if (!v) return
        v.volume = Math.min(1, Math.max(0, volume))
        v.muted = muted
        if (!muted && v.paused && status === 'playing') v.play().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [muted, volume])

    const toggle = () => {
        const v = el.current
        if (!v || status === 'error') return
        if (v.paused) v.play().catch(() => {})
        else v.pause()
    }

    return (
        <div style={{ position: 'absolute', inset: 0, background: '#000', ...style }} onClick={toggle}>
            <video
                ref={el}
                src={src}
                loop
                playsInline
                preload="auto"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {status === 'slow' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <Spinner size={26} />
                </div>
            )}

            {paused && status === 'playing' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', animation: 'fadeIn 0.15s ease' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RiPlayFill size={36} color="#fff" />
                    </div>
                </div>
            )}

            {status === 'error' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, textAlign: 'center', background: 'radial-gradient(ellipse at center, #1b1b1b, #0a0a0a)' }}>
                    <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(255,107,53,0.1)', border: '1.5px dashed rgba(255,107,53,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RiImageLine size={26} color="#FF6B35" />
                    </div>
                    <p style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>Can&apos;t preview this file here</p>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.6, maxWidth: 300 }}>
                        Your browser can&apos;t play this format (it&apos;s common with iPhone HEVC videos on desktop Chrome).
                        You can still continue and post it, or go back and pick a different clip.
                    </p>
                </div>
            )}

            {children}
        </div>
    )
})

export default PreviewVideo
