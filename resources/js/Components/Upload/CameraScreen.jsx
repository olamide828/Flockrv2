import { useEffect, useRef, useState } from 'react'
import {
    RiCameraLensLine, RiCameraSwitchLine, RiCloseLine, RiFlashlightFill, RiFlashlightLine,
    RiGridLine, RiImageAddLine, RiImageLine, RiShoppingBag3Line, RiTimer2Line,
} from 'react-icons/ri'
import { MAX_SECONDS, PHOTO_SECONDS, blobToFile, fmtTime, photoToVideoFile, pickMime } from '../../lib/media'
import { S, Spinner } from './ui'

const R = 40
const C = 2 * Math.PI * R
const HOLD_MS = 450

function qualityLabel(s) {
    if (!s?.width || !s?.height) return null
    const long = Math.max(s.width, s.height)
    const short = Math.min(s.width, s.height)
    const res = long >= 3800 ? '4K' : short >= 1000 ? '1080p' : short >= 700 ? '720p' : `${short}p`
    return `${res}${s.frameRate ? ` · ${Math.round(s.frameRate)}fps` : ''}`
}

/**
 * Full-screen camera.
 *
 *  - asks for the best the device offers (up to 1080p, 30 fps) and records at 10 Mbps
 *  - flashlight: real torch where the browser exposes it (Chrome on Android); a screen
 *    "ring light" on the front camera
 *  - pinch to zoom + 1x/2x/3x shortcuts when the camera supports zoom
 *  - 3s / 10s countdown, 3x3 grid, tap to start/stop or hold to record
 *  - photos use the camera's full-resolution still where available
 *  - "HQ" hands over to the phone's own camera app (HDR, stabilisation, night mode)
 */
export default function CameraScreen({ onCaptured, onGallery, onNativeCapture, onClose, showProductHint, onProductHint }) {
    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const trackRef = useRef(null)
    const recRef = useRef(null)
    const chunksRef = useRef([])
    const timerRef = useRef(null)
    const startRef = useRef(0)
    const countRef = useRef(null)
    const gesture = useRef({ ignoreUp: false, holding: false, timer: null })
    const pinch = useRef({ ptrs: new Map(), startDist: 0, startZoom: 1 })
    const zoomFrame = useRef(0)
    const zoomPending = useRef(null)

    const [mode, setMode] = useState('video')
    const [facing, setFacing] = useState('environment')
    const [selfie, setSelfie] = useState(false)
    const [camError, setCamError] = useState(null)
    const [notice, setNotice] = useState(null)
    const [ready, setReady] = useState(false)
    const [recording, setRecording] = useState(false)
    const [elapsed, setElapsed] = useState(0)
    const [busy, setBusy] = useState(false)
    const [caps, setCaps] = useState({ torch: false, zoom: null })
    const [torchOn, setTorchOn] = useState(false)
    const [ring, setRing] = useState(false)
    const [zoom, setZoom] = useState(1)
    const [grid, setGrid] = useState(false)
    const [timer, setTimer] = useState(0)
    const [count, setCount] = useState(null)
    const [quality, setQuality] = useState(null)
    const [flashFx, setFlashFx] = useState(0)

    const stopStream = () => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        trackRef.current = null
    }

    // ── Open (or re-open on flip) the camera ──────────────────────────────────
    useEffect(() => {
        let cancelled = false
        setReady(false)
        setCamError(null)
        setTorchOn(false)
        setZoom(1)
        setCaps({ torch: false, zoom: null })

        ;(async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                setCamError('The camera is not available here. Use a secure (https) connection, or pick a file from your gallery.')
                return
            }
            stopStream()

            const video = {
                facingMode: { ideal: facing },
                width: { ideal: 1080 },
                height: { ideal: 1920 },
                aspectRatio: { ideal: 9 / 16 },
                frameRate: { ideal: 30, max: 60 },
            }
            const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }

            let stream
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video, audio })
            } catch {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video, audio: false })
                } catch (e) {
                    if (!cancelled) setCamError(
                        e?.name === 'NotAllowedError'
                            ? 'Camera permission was denied. Allow camera access in your browser settings, or pick a file from your gallery.'
                            : 'We could not start your camera. You can still pick a file from your gallery.'
                    )
                    return
                }
            }
            if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }

            streamRef.current = stream
            const track = stream.getVideoTracks()[0]
            trackRef.current = track
            const c = track?.getCapabilities?.() ?? {}
            const s = track?.getSettings?.() ?? {}

            // Let the camera keep refocusing and re-metering as the scene changes
            const adv = {}
            if (c.focusMode?.includes?.('continuous')) adv.focusMode = 'continuous'
            if (c.exposureMode?.includes?.('continuous')) adv.exposureMode = 'continuous'
            if (c.whiteBalanceMode?.includes?.('continuous')) adv.whiteBalanceMode = 'continuous'
            if (Object.keys(adv).length) track.applyConstraints({ advanced: [adv] }).catch(() => {})

            setCaps({
                torch: !!c.torch,
                zoom: c.zoom ? { min: c.zoom.min ?? 1, max: c.zoom.max ?? 1, step: c.zoom.step || 0.1 } : null,
            })
            // Phones report facingMode; a desktop webcam doesn't, and behaves like a selfie camera
            setSelfie((s.facingMode ?? 'user') === 'user')
            setQuality(qualityLabel(s))

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play().catch(() => {})
            }
            setReady(true)
        })()

        return () => { cancelled = true }
    }, [facing])

    // ── Teardown ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const onHide = () => { if (document.hidden && recRef.current?.state === 'recording') recRef.current.stop() }
        document.addEventListener('visibilitychange', onHide)
        return () => {
            document.removeEventListener('visibilitychange', onHide)
            clearInterval(timerRef.current)
            clearInterval(countRef.current)
            clearTimeout(gesture.current.timer)
            cancelAnimationFrame(zoomFrame.current)
            if (recRef.current && recRef.current.state === 'recording') {
                recRef.current.onstop = null
                try { recRef.current.stop() } catch { /* already stopped */ }
            }
            stopStream()
        }
    }, [])

    useEffect(() => {
        if (!notice) return undefined
        const t = setTimeout(() => setNotice(null), 3500)
        return () => clearTimeout(t)
    }, [notice])

    // ── Flash / torch ─────────────────────────────────────────────────────────
    const flashAvailable = caps.torch || selfie
    const flashOn = caps.torch ? torchOn : ring

    const toggleFlash = async () => {
        if (caps.torch) {
            const next = !torchOn
            try {
                await trackRef.current.applyConstraints({ advanced: [{ torch: next }] })
                setTorchOn(next)
            } catch {
                setNotice('The flashlight is not available right now.')
            }
        } else {
            setRing(r => !r)
        }
    }

    // ── Zoom ──────────────────────────────────────────────────────────────────
    const applyZoom = (z) => {
        const range = caps.zoom
        if (!range || !trackRef.current) return
        const next = Math.min(range.max, Math.max(range.min, z))
        setZoom(next)
        zoomPending.current = next
        if (!zoomFrame.current) {
            zoomFrame.current = requestAnimationFrame(() => {
                zoomFrame.current = 0
                const value = zoomPending.current
                trackRef.current?.applyConstraints({ advanced: [{ zoom: value }] }).catch(() => {})
            })
        }
    }

    const onPinchDown = (e) => {
        const p = pinch.current
        p.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (p.ptrs.size === 2) {
            const [a, b] = [...p.ptrs.values()]
            p.startDist = Math.hypot(a.x - b.x, a.y - b.y)
            p.startZoom = zoom
        }
    }
    const onPinchMove = (e) => {
        const p = pinch.current
        if (!p.ptrs.has(e.pointerId)) return
        p.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (p.ptrs.size === 2 && p.startDist > 0) {
            const [a, b] = [...p.ptrs.values()]
            applyZoom(p.startZoom * (Math.hypot(a.x - b.x, a.y - b.y) / p.startDist))
        }
    }
    const onPinchUp = (e) => { pinch.current.ptrs.delete(e.pointerId) }

    const zoomStops = caps.zoom ? [1, 2, 3, 5].filter(z => z >= caps.zoom.min - 0.01 && z <= caps.zoom.max + 0.01) : []

    // ── Recording ─────────────────────────────────────────────────────────────
    const stopRecording = () => {
        if (recRef.current && recRef.current.state === 'recording') recRef.current.stop()
    }

    const startRecording = () => {
        const stream = streamRef.current
        if (!stream || typeof MediaRecorder === 'undefined') {
            setNotice('Recording is not supported in this browser. Pick a video from your gallery instead.')
            return
        }
        const mime = pickMime()
        const s = trackRef.current?.getSettings?.() ?? {}
        const pixels = (s.width || 1080) * (s.height || 1920)
        const videoBitsPerSecond = pixels >= 1920 * 1080 * 0.9 ? 10_000_000 : 6_000_000

        let rec
        try {
            rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond, audioBitsPerSecond: 192_000 })
        } catch {
            try { rec = new MediaRecorder(stream) } catch {
                setNotice('Recording is not supported in this browser. Pick a video from your gallery instead.')
                return
            }
        }

        chunksRef.current = []
        rec.ondataavailable = e => { if (e.data?.size) chunksRef.current.push(e.data) }
        rec.onstop = () => {
            clearInterval(timerRef.current)
            setRecording(false)
            const secs = Math.max(1, Math.round((Date.now() - startRef.current) / 1000))
            const type = rec.mimeType || mime || 'video/webm'
            const blob = new Blob(chunksRef.current, { type })
            if (blob.size < 1000) { setNotice('That was too short. Hold on a little longer.'); return }
            onCaptured(blobToFile(blob, type), secs)
        }

        rec.start(500)
        recRef.current = rec
        startRef.current = Date.now()
        setElapsed(0)
        setRecording(true)
        timerRef.current = setInterval(() => {
            const sec = (Date.now() - startRef.current) / 1000
            setElapsed(sec)
            if (sec >= MAX_SECONDS) stopRecording()
        }, 100)
    }

    // ── Photo ─────────────────────────────────────────────────────────────────
    const takePhoto = async () => {
        const v = videoRef.current
        if (!v || busy) return
        setBusy(true)
        setFlashFx(n => n + 1)
        try {
            let blob = null
            // Full-sensor still where the browser supports it (Chrome / Android)
            if (typeof ImageCapture !== 'undefined' && trackRef.current) {
                try { blob = await new ImageCapture(trackRef.current).takePhoto() } catch { blob = null }
            }
            if (!blob) {
                if (!v.videoWidth) throw new Error('no frame')
                const c = document.createElement('canvas')
                c.width = v.videoWidth
                c.height = v.videoHeight
                c.getContext('2d').drawImage(v, 0, 0)
                blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.95))
            }
            onCaptured(await photoToVideoFile(blob), PHOTO_SECONDS, { silent: true })
        } catch {
            setNotice('Photos are not supported in this browser yet. Try recording a video instead.')
        } finally {
            setBusy(false)
        }
    }

    // ── Shutter (tap = start/stop, hold = record while held) ──────────────────
    const begin = () => (mode === 'photo' ? takePhoto() : startRecording())

    const startWithTimer = () => {
        if (timer === 0) { begin(); return }
        let n = timer
        setCount(n)
        countRef.current = setInterval(() => {
            n -= 1
            if (n <= 0) { clearInterval(countRef.current); setCount(null); begin() }
            else setCount(n)
        }, 1000)
    }
    const cancelCountdown = () => { clearInterval(countRef.current); setCount(null) }

    const onShutterDown = (e) => {
        if (e.button > 0) return
        const g = gesture.current
        g.ignoreUp = false
        g.holding = false
        e.currentTarget.setPointerCapture?.(e.pointerId)
        if (!ready || busy) { g.ignoreUp = true; return }
        if (count !== null) { cancelCountdown(); g.ignoreUp = true; return }
        if (recording) { stopRecording(); g.ignoreUp = true; return }
        if (mode === 'video' && timer === 0) {
            g.timer = setTimeout(() => { g.holding = true; startRecording() }, HOLD_MS)
        }
    }
    const onShutterUp = () => {
        const g = gesture.current
        clearTimeout(g.timer)
        if (g.ignoreUp) { g.ignoreUp = false; return }
        if (g.holding) { g.holding = false; stopRecording(); return }
        startWithTimer()
    }
    const onShutterCancel = () => {
        const g = gesture.current
        clearTimeout(g.timer)
        if (g.holding) { g.holding = false; stopRecording() }
        g.ignoreUp = false
    }
    // Keyboard / assistive tech: a click with no pointer (detail === 0)
    const onShutterClick = (e) => {
        if (e.detail !== 0 || !ready || busy) return
        if (count !== null) cancelCountdown()
        else if (recording) stopRecording()
        else startWithTimer()
    }

    const progress = Math.min(1, elapsed / MAX_SECONDS)
    const recordingUi = mode === 'video' && recording
    const toolOpacity = recording ? 0.3 : 1

    return (
        <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden', touchAction: 'none' }}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: selfie ? 'scaleX(-1)' : 'none', opacity: ready ? 1 : 0, transition: 'opacity 0.25s' }}
            />

            {/* Pinch surface */}
            <div
                onPointerDown={onPinchDown}
                onPointerMove={onPinchMove}
                onPointerUp={onPinchUp}
                onPointerCancel={onPinchUp}
                style={{ position: 'absolute', inset: 0, zIndex: 1 }}
            />

            {/* Ring light (selfie flash) */}
            {ring && selfie && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', border: '46px solid #FFF4DC', boxShadow: 'inset 0 0 70px 10px rgba(255,236,200,0.95)' }} />
            )}

            {/* Grid */}
            {grid && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
                    {[33.33, 66.66].map(p => <div key={`v${p}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${p}%`, width: 1, background: 'rgba(255,255,255,0.35)' }} />)}
                    {[33.33, 66.66].map(p => <div key={`h${p}`} style={{ position: 'absolute', left: 0, right: 0, top: `${p}%`, height: 1, background: 'rgba(255,255,255,0.35)' }} />)}
                </div>
            )}

            {/* Shutter flash */}
            {flashFx > 0 && <div key={flashFx} style={{ position: 'absolute', inset: 0, zIndex: 6, background: '#fff', pointerEvents: 'none', animation: 'shutterFlash 0.35s ease-out forwards' }} />}

            {/* Countdown */}
            {count !== null && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span key={count} style={{ color: '#fff', fontSize: 140, fontWeight: 900, textShadow: '0 6px 30px rgba(0,0,0,0.6)', animation: 'countPop 0.6s ease-out' }}>{count}</span>
                </div>
            )}

            {/* Fatal camera error */}
            {camError && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,107,53,0.12)', border: '1.5px dashed rgba(255,107,53,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RiImageLine size={28} color="#FF6B35" />
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.6, margin: 0, maxWidth: 320 }}>{camError}</p>
                    <button onClick={onGallery} style={{ ...S.primaryBtn, padding: '12px 28px' }}><RiImageLine size={16} /> Pick from gallery</button>
                </div>
            )}

            {/* Top bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: 'calc(env(safe-area-inset-top) + 14px) 16px 40px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pointerEvents: 'none' }}>
                <button onClick={onClose} disabled={recording} aria-label="Close" style={{ ...S.glassBtn, opacity: toolOpacity, pointerEvents: 'auto' }}>
                    <RiCloseLine size={22} />
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 2, pointerEvents: 'auto' }}>
                    {recording ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 999, background: 'rgba(239,68,68,0.9)', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'blink 1s ease-in-out infinite' }} />
                            {fmtTime(elapsed)}
                        </div>
                    ) : showProductHint && (
                        <button onClick={onProductHint} style={S.hintPill}>
                            <RiShoppingBag3Line size={13} /> Create &amp; tag a product to get more sales
                        </button>
                    )}
                </div>

                <div style={{ width: 42, display: 'flex', justifyContent: 'flex-end' }}>
                    {quality && !recording && (
                        <span style={{ padding: '4px 8px', borderRadius: 8, background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.03em', whiteSpace: 'nowrap', transform: 'translateX(4px)' }}>{quality}</span>
                    )}
                </div>
            </div>

            {/* Right tools */}
            <div style={{ position: 'absolute', right: 12, top: 'calc(env(safe-area-inset-top) + 72px)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', opacity: toolOpacity, pointerEvents: recording ? 'none' : 'auto' }}>
                <button onClick={() => setFacing(f => (f === 'user' ? 'environment' : 'user'))} disabled={!ready} aria-label="Flip camera" style={S.toolBtn}>
                    <RiCameraSwitchLine size={24} /><span style={S.toolLabel}>Flip</span>
                </button>
                {flashAvailable && (
                    <button onClick={toggleFlash} aria-label={caps.torch ? 'Flashlight' : 'Ring light'} aria-pressed={flashOn} style={{ ...S.toolBtn, color: flashOn ? '#FBBF24' : '#fff' }}>
                        {flashOn ? <RiFlashlightFill size={24} /> : <RiFlashlightLine size={24} />}
                        <span style={S.toolLabel}>{caps.torch ? 'Torch' : 'Light'}</span>
                    </button>
                )}
                <button onClick={() => setTimer(t => (t === 0 ? 3 : t === 3 ? 10 : 0))} aria-label="Timer" style={{ ...S.toolBtn, color: timer ? '#FF6B35' : '#fff' }}>
                    <RiTimer2Line size={24} /><span style={S.toolLabel}>{timer ? `${timer}s` : 'Timer'}</span>
                </button>
                <button onClick={() => setGrid(g => !g)} aria-label="Grid" aria-pressed={grid} style={{ ...S.toolBtn, color: grid ? '#FF6B35' : '#fff' }}>
                    <RiGridLine size={24} /><span style={S.toolLabel}>Grid</span>
                </button>
            </div>

            {/* Notice */}
            {notice && (
                <div style={{ position: 'absolute', left: 16, right: 16, bottom: 'calc(env(safe-area-inset-bottom) + 230px)', zIndex: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, textAlign: 'center' }}>
                    {notice}
                </div>
            )}

            {/* Bottom controls */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10, padding: '60px 24px calc(env(safe-area-inset-bottom) + 18px)', background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
                {zoomStops.length > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
                        {zoomStops.map(z => {
                            const active = Math.abs(zoom - z) < 0.15
                            return (
                                <button key={z} onClick={() => applyZoom(z)} style={{ minWidth: 38, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer', background: active ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.45)', color: active ? '#000' : '#fff', fontSize: 12, fontWeight: 800 }}>
                                    {active && zoom !== z ? `${zoom.toFixed(1)}×` : `${z}×`}
                                </button>
                            )
                        })}
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 420, margin: '0 auto' }}>
                    <button onClick={onGallery} disabled={recording} aria-label="Pick from gallery" style={{ ...S.glassBtn, width: 48, height: 48, borderRadius: 14, opacity: toolOpacity }}>
                        <RiImageAddLine size={22} />
                    </button>

                    {/* Shutter */}
                    <button
                        onPointerDown={onShutterDown}
                        onPointerUp={onShutterUp}
                        onPointerCancel={onShutterCancel}
                        onClick={onShutterClick}
                        onContextMenu={e => e.preventDefault()}
                        disabled={!ready}
                        aria-label={mode === 'photo' ? 'Take photo' : recording ? 'Stop recording' : 'Start recording'}
                        style={{ position: 'relative', width: 88, height: 88, background: 'none', border: 'none', padding: 0, cursor: ready && !busy ? 'pointer' : 'default', opacity: ready ? 1 : 0.4, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                    >
                        <svg width="88" height="88" viewBox="0 0 88 88" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                            <circle cx="44" cy="44" r={R} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="4" />
                            {recordingUi && (
                                <circle cx="44" cy="44" r={R} fill="none" stroke="#FF6B35" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform="rotate(-90 44 44)" />
                            )}
                        </svg>
                        <span style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
                            width: recordingUi ? 30 : 66, height: recordingUi ? 30 : 66,
                            borderRadius: recordingUi ? 8 : '50%',
                            background: mode === 'photo' ? '#fff' : '#EF4444',
                            transition: 'all 0.2s ease',
                        }}>
                            {busy && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner dark /></span>}
                        </span>
                    </button>

                    <button onClick={() => onNativeCapture?.(mode)} disabled={recording} aria-label="Use your phone's camera app for the best quality" style={{ ...S.glassBtn, width: 48, height: 48, borderRadius: 14, flexDirection: 'column', gap: 1, opacity: toolOpacity }}>
                        <RiCameraLensLine size={19} />
                        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.04em' }}>HQ</span>
                    </button>
                </div>

                {/* Mode tabs */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 14 }}>
                    {[['video', 'VIDEO'], ['photo', 'PHOTO']].map(([m, label]) => (
                        <button key={m} onClick={() => !recording && setMode(m)} disabled={recording} style={{ background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer', color: mode === m ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', borderBottom: mode === m ? '2px solid #FF6B35' : '2px solid transparent', opacity: recording && mode !== m ? 0.3 : 1 }}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
