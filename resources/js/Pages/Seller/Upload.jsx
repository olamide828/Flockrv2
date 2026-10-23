import { Head, router } from '@inertiajs/react'
import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    RiAddLine, RiArrowLeftLine, RiArrowRightLine, RiCameraSwitchLine,
    RiCheckLine, RiCloseLine, RiDeleteBinLine, RiHashtag, RiImageAddLine,
    RiImageLine, RiPriceTag3Line, RiShoppingBag3Line, RiUploadCloud2Line,
    RiVolumeMuteLine, RiVolumeUpLine,
} from 'react-icons/ri'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MAX_SECONDS   = 60   // longest recording
const PHOTO_SECONDS = 5    // a photo is posted as a short video of this length

// ⚠️ ASSUMED endpoint for the quick "Create product" sheet. Point this at your
// real product-creation route (and adjust the field names in ProductSheet).
const PRODUCT_CREATE_URL = '/api/products'

const TEXT_COLORS = [
    { hex: '#FFFFFF', label: 'White'  },
    { hex: '#000000', label: 'Black'  },
    { hex: '#FF6B35', label: 'Orange' },
    { hex: '#EF4444', label: 'Red'    },
    { hex: '#FBBF24', label: 'Yellow' },
    { hex: '#3B82F6', label: 'Blue'   },
    { hex: '#10B981', label: 'Green'  },
    { hex: '#8B5CF6', label: 'Purple' },
]

const GALLERY_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

// ─────────────────────────────────────────────────────────────────────────────
// Media helpers
// ─────────────────────────────────────────────────────────────────────────────
function pickMime() {
    if (typeof MediaRecorder === 'undefined') return ''
    const candidates = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
    ]
    return candidates.find(t => MediaRecorder.isTypeSupported(t)) || ''
}

function blobToFile(blob, mime) {
    const isMp4 = (mime || blob.type || '').includes('mp4')
    return new File([blob], `flockr-${Date.now()}.${isMp4 ? 'mp4' : 'webm'}`, { type: isMp4 ? 'video/mp4' : 'video/webm' })
}

function readDuration(url) {
    return new Promise(resolve => {
        const v = document.createElement('video')
        v.preload = 'metadata'
        v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? Math.max(1, Math.round(v.duration)) : null)
        v.onerror = () => resolve(null)
        v.src = url
    })
}

// Turns a still image (Blob) into a short silent video so it can be posted like any other video.
async function photoToVideoFile(blob, seconds = PHOTO_SECONDS) {
    const mime = pickMime()
    if (!mime) throw new Error('unsupported')

    const url = URL.createObjectURL(blob)
    try {
        const img = await new Promise((res, rej) => {
            const i = new Image()
            i.onload = () => res(i)
            i.onerror = rej
            i.src = url
        })

        const scale = Math.min(1, 1920 / Math.max(img.naturalWidth, img.naturalHeight))
        const w = Math.max(2, Math.round(img.naturalWidth * scale) & ~1)
        const h = Math.max(2, Math.round(img.naturalHeight * scale) & ~1)

        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')

        const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: mime, videoBitsPerSecond: 3_000_000 })
        const chunks = []
        rec.ondataavailable = e => { if (e.data?.size) chunks.push(e.data) }
        const stopped = new Promise(r => { rec.onstop = r })

        rec.start(250)
        const t0 = performance.now()
        await new Promise(resolve => {
            const tick = () => {
                ctx.drawImage(img, 0, 0, w, h)
                if (performance.now() - t0 < seconds * 1000) requestAnimationFrame(tick)
                else resolve()
            }
            tick()
        })
        rec.stop()
        await stopped

        return blobToFile(new Blob(chunks, { type: mime }), mime)
    } finally {
        URL.revokeObjectURL(url)
    }
}

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

// ─────────────────────────────────────────────────────────────────────────────
// Text overlay (shared by editor + review)
// Outline is a text stroke so it matches what the downloaded video burns in.
// ─────────────────────────────────────────────────────────────────────────────
function OverlayText({ overlay, onMouseDown, onEdit, onRemove, interactive }) {
    return (
        <div
            onMouseDown={onMouseDown}
            onTouchStart={onMouseDown}
            style={{
                position: 'absolute',
                top: `${overlay.top}%`,
                left: `${overlay.left}%`,
                maxWidth: '77%',
                zIndex: 10,
                cursor: interactive ? 'grab' : 'default',
                userSelect: 'none',
                touchAction: 'none',
            }}
        >
            <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                <span style={{
                    color: overlay.textColor,
                    fontSize: overlay.fontSize,
                    fontWeight: overlay.fontStyle === 'bold' ? 800 : 600,
                    fontStyle: overlay.fontStyle === 'italic' ? 'italic' : 'normal',
                    textShadow: overlay.showOutline ? 'none' : '0 2px 6px rgba(0,0,0,0.7)',
                    WebkitTextStroke: overlay.showOutline ? `${Math.max(2, Math.round(overlay.fontSize * 0.22))}px ${overlay.outlineColor}` : undefined,
                    paintOrder: 'stroke fill',
                    display: 'inline-block',
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: interactive ? 'auto' : 'none',
                }}>
                    {overlay.text}
                </span>

                {interactive && (
                    <>
                        <button
                            onMouseDown={e => { e.stopPropagation(); onEdit?.() }}
                            onTouchStart={e => { e.stopPropagation(); onEdit?.() }}
                            style={{ position: 'absolute', top: -14, left: -14, width: 28, height: 28, borderRadius: '50%', background: '#FF6B35', border: '2px solid #fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 800, zIndex: 11 }}
                        >
                            ✎
                        </button>
                        <button
                            onMouseDown={e => { e.stopPropagation(); onRemove?.() }}
                            onTouchStart={e => { e.stopPropagation(); onRemove?.() }}
                            style={{ position: 'absolute', top: -14, right: -14, width: 28, height: 28, borderRadius: '50%', background: '#EF4444', border: '2px solid #fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11 }}
                        >
                            <RiCloseLine size={14} color="#fff" />
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera (Video / Photo)
// ─────────────────────────────────────────────────────────────────────────────
function CameraScreen({ onCaptured, onGallery, onClose, showProductHint, onProductHint }) {
    const videoRef  = useRef(null)
    const streamRef = useRef(null)
    const recRef    = useRef(null)
    const chunksRef = useRef([])
    const timerRef  = useRef(null)
    const startRef  = useRef(0)

    const [mode,      setMode]      = useState('video')
    const [facing,    setFacing]    = useState('environment')
    const [camError,  setCamError]  = useState(null)
    const [notice,    setNotice]    = useState(null)
    const [ready,     setReady]     = useState(false)
    const [recording, setRecording] = useState(false)
    const [elapsed,   setElapsed]   = useState(0)
    const [busy,      setBusy]      = useState(false)

    const stopStream = () => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
    }

    // Open (or re-open on flip) the camera
    useEffect(() => {
        let cancelled = false
        setReady(false); setCamError(null)

        ;(async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                setCamError('The camera is not available here. Use a secure (https) connection, or pick a file from your gallery.')
                return
            }
            stopStream()
            const video = { facingMode: { ideal: facing }, width: { ideal: 1080 }, height: { ideal: 1920 } }
            let stream
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video, audio: true })
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
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play().catch(() => {})
            }
            setReady(true)
        })()

        return () => { cancelled = true }
    }, [facing])

    // Leaving the screen: stop timer, recorder and camera
    useEffect(() => () => {
        clearInterval(timerRef.current)
        if (recRef.current && recRef.current.state === 'recording') {
            recRef.current.onstop = null
            try { recRef.current.stop() } catch { /* already stopped */ }
        }
        stopStream()
    }, [])

    useEffect(() => {
        if (!notice) return
        const t = setTimeout(() => setNotice(null), 3500)
        return () => clearTimeout(t)
    }, [notice])

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
        let rec
        try {
            rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4_000_000 } : undefined)
        } catch {
            setNotice('Recording is not supported in this browser. Pick a video from your gallery instead.')
            return
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
        recRef.current   = rec
        startRef.current = Date.now()
        setElapsed(0)
        setRecording(true)
        timerRef.current = setInterval(() => {
            const s = (Date.now() - startRef.current) / 1000
            setElapsed(s)
            if (s >= MAX_SECONDS) stopRecording()
        }, 100)
    }

    const takePhoto = async () => {
        const v = videoRef.current
        if (!v || !v.videoWidth || busy) return
        setBusy(true)
        try {
            const c = document.createElement('canvas')
            c.width = v.videoWidth; c.height = v.videoHeight
            const ctx = c.getContext('2d')
            if (facing === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1) }
            ctx.drawImage(v, 0, 0)
            const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92))
            const file = await photoToVideoFile(blob)
            onCaptured(file, PHOTO_SECONDS)
        } catch {
            setNotice('Photos are not supported in this browser yet. Try recording a video instead.')
        } finally {
            setBusy(false)
        }
    }

    const onShutter = () => {
        if (mode === 'photo') return takePhoto()
        return recording ? stopRecording() : startRecording()
    }

    const R = 40
    const C = 2 * Math.PI * R
    const progress = Math.min(1, elapsed / MAX_SECONDS)

    return (
        <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
            <video
                ref={videoRef}
                autoPlay playsInline muted
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: facing === 'user' ? 'scaleX(-1)' : 'none', opacity: ready ? 1 : 0, transition: 'opacity 0.25s' }}
            />

            {/* Fatal camera error */}
            {camError && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, textAlign: 'center', zIndex: 5 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,107,53,0.12)', border: '1.5px dashed rgba(255,107,53,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RiImageLine size={28} color="#FF6B35" />
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.6, margin: 0, maxWidth: 320 }}>{camError}</p>
                    <button onClick={onGallery} style={{ ...S.primaryBtn, padding: '12px 28px' }}><RiImageLine size={16} /> Pick from gallery</button>
                </div>
            )}

            {/* Top bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: 'calc(env(safe-area-inset-top) + 14px) 16px 40px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <button onClick={onClose} disabled={recording} aria-label="Close" style={{ ...S.glassBtn, opacity: recording ? 0.3 : 1 }}>
                    <RiCloseLine size={22} />
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 2 }}>
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

                <button onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')} disabled={recording || !ready} aria-label="Flip camera" style={{ ...S.glassBtn, opacity: recording || !ready ? 0.3 : 1 }}>
                    <RiCameraSwitchLine size={21} />
                </button>
            </div>

            {/* Notice */}
            {notice && (
                <div style={{ position: 'absolute', left: 16, right: 16, bottom: 'calc(env(safe-area-inset-bottom) + 190px)', zIndex: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, textAlign: 'center' }}>
                    {notice}
                </div>
            )}

            {/* Bottom controls */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10, padding: '60px 24px calc(env(safe-area-inset-bottom) + 18px)', background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 420, margin: '0 auto' }}>
                    <button onClick={onGallery} disabled={recording} aria-label="Pick from gallery" style={{ ...S.glassBtn, width: 48, height: 48, borderRadius: 14, opacity: recording ? 0.3 : 1 }}>
                        <RiImageAddLine size={22} />
                    </button>

                    {/* Shutter */}
                    <button onClick={onShutter} disabled={!ready || busy} aria-label={mode === 'photo' ? 'Take photo' : recording ? 'Stop recording' : 'Start recording'} style={{ position: 'relative', width: 88, height: 88, background: 'none', border: 'none', padding: 0, cursor: ready && !busy ? 'pointer' : 'default', opacity: ready ? 1 : 0.4 }}>
                        <svg width="88" height="88" viewBox="0 0 88 88" style={{ position: 'absolute', inset: 0 }}>
                            <circle cx="44" cy="44" r={R} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="4" />
                            {mode === 'video' && recording && (
                                <circle cx="44" cy="44" r={R} fill="none" stroke="#FF6B35" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform="rotate(-90 44 44)" />
                            )}
                        </svg>
                        <span style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            width: mode === 'video' && recording ? 30 : 66, height: mode === 'video' && recording ? 30 : 66,
                            borderRadius: mode === 'video' && recording ? 8 : '50%',
                            background: mode === 'photo' ? '#fff' : '#EF4444',
                            transition: 'all 0.2s ease',
                        }}>
                            {busy && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner dark /></span>}
                        </span>
                    </button>

                    <div style={{ width: 48 }} />
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

// ─────────────────────────────────────────────────────────────────────────────
// Quick "create product" bottom sheet
// ─────────────────────────────────────────────────────────────────────────────
function ProductSheet({ open, onClose, onCreated }) {
    const [name,  setName]  = useState('')
    const [price, setPrice] = useState('')
    const [stock, setStock] = useState('1')
    const [desc,  setDesc]  = useState('')
    const [files, setFiles] = useState([])      // [{ file, url }]
    const [busy,  setBusy]  = useState(false)
    const [err,   setErr]   = useState('')
    const inputRef = useRef(null)

    useEffect(() => () => files.forEach(f => URL.revokeObjectURL(f.url)), []) // eslint-disable-line react-hooks/exhaustive-deps

    if (!open) return null

    const addFiles = (e) => {
        const picked = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
        setFiles(prev => [...prev, ...picked.map(file => ({ file, url: URL.createObjectURL(file) }))].slice(0, 4))
        e.target.value = ''
    }
    const removeFile = (i) => setFiles(prev => { URL.revokeObjectURL(prev[i].url); return prev.filter((_, idx) => idx !== i) })

    const reset = () => { setName(''); setPrice(''); setStock('1'); setDesc(''); setFiles([]); setErr('') }

    const submit = async () => {
        if (!name.trim())                     return setErr('Give your product a name.')
        if (!Number(price) || Number(price) <= 0) return setErr('Enter a valid price.')
        setBusy(true); setErr('')

        const fd = new FormData()
        fd.append('name', name.trim())
        fd.append('price', String(Number(price)))
        fd.append('stock_quantity', String(Math.max(0, parseInt(stock, 10) || 1)))
        if (desc.trim()) fd.append('description', desc.trim())
        fd.append('status', 'active')
        files.forEach(f => fd.append('images[]', f.file))

        try {
            const res = await axios.post(PRODUCT_CREATE_URL, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
            const raw = res.data?.product ?? res.data?.data ?? res.data ?? {}
            if (!raw.id) { setErr('Product was created but the server did not return its id. Refresh and tag it from the list.'); return }
            onCreated({
                id: raw.id,
                name: raw.name ?? name.trim(),
                price: raw.price ?? Number(price),
                compare_price: raw.compare_price ?? null,
                stock_quantity: raw.stock_quantity ?? Number(stock),
                primary_image: raw.primary_image ?? (Array.isArray(raw.images) ? raw.images[0] : null) ?? files[0]?.url ?? null,
            })
            reset()
        } catch (e) {
            const d = e.response?.data
            const first = d?.errors ? Object.values(d.errors).flat()[0] : null
            setErr(first || d?.message || 'Could not create the product. Please try again.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
            <div onClick={() => !busy && onClose()} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '90dvh', overflowY: 'auto', background: '#111', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', padding: '8px 18px calc(env(safe-area-inset-bottom) + 20px)', animation: 'sheetUp 0.28s cubic-bezier(0.22,1,0.36,1)' }}>
                <div style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '4px auto 14px' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fff' }}>Create a product</h2>
                    <button onClick={onClose} disabled={busy} style={{ ...S.iconBtn, width: 32, height: 32 }}><RiCloseLine size={18} /></button>
                </div>
                <p style={{ margin: '0 0 16px', color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.5 }}>
                    It will be tagged on this video automatically, so viewers can buy straight from it.
                </p>

                {/* Photos */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {files.map((f, i) => (
                        <div key={f.url} style={{ position: 'relative', width: 72, height: 72, borderRadius: 14, overflow: 'hidden', background: '#222' }}>
                            <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button onClick={() => removeFile(i)} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiCloseLine size={12} color="#fff" /></button>
                        </div>
                    ))}
                    {files.length < 4 && (
                        <button onClick={() => inputRef.current?.click()} style={{ width: 72, height: 72, borderRadius: 14, background: 'rgba(255,107,53,0.08)', border: '1.5px dashed rgba(255,107,53,0.45)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, color: '#FF6B35', fontSize: 10, fontWeight: 700 }}>
                            <RiImageAddLine size={20} /> Photo
                        </button>
                    )}
                    <input ref={inputRef} type="file" accept="image/*" multiple onChange={addFiles} style={{ display: 'none' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Product name" maxLength={120} style={S.inp} />
                    <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#FF6B35', fontWeight: 700 }}>₦</span>
                            <input value={price} onChange={e => setPrice(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="Price" style={{ ...S.inp, paddingLeft: 30 }} />
                        </div>
                        <input value={stock} onChange={e => setStock(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="In stock" style={{ ...S.inp, width: 110, flex: 'none' }} />
                    </div>
                    <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description (optional)" rows={3} maxLength={1000} style={{ ...S.inp, resize: 'none', lineHeight: 1.5 }} />
                </div>

                {err && <div style={{ ...S.errBanner, marginTop: 12 }}>{err}</div>}

                <button onClick={submit} disabled={busy} style={{ ...S.primaryBtn, width: '100%', marginTop: 16, padding: '14px 0', opacity: busy ? 0.7 : 1 }}>
                    {busy ? <><Spinner /> Creating…</> : <><RiAddLine size={16} /> Create &amp; tag product</>}
                </button>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function Upload({ products: initialProducts = [] }) {
    // 'camera' → 'edit' (preview + text) → 'details' (then Post)
    const [stage, setStage] = useState('camera')

    // Products (local copy so newly created ones can be added and tagged)
    const [products,      setProducts]      = useState(initialProducts)
    const [taggedIds,     setTaggedIds]     = useState([])
    const [productSearch, setProductSearch] = useState('')
    const [sheetOpen,     setSheetOpen]     = useState(false)
    const [toast,         setToast]         = useState(null)

    // Video
    const [videoFile,     setVideoFile]     = useState(null)
    const [videoPreview,  setVideoPreview]  = useState(null)
    const [videoDuration, setVideoDuration] = useState(null)
    const [muted,         setMuted]         = useState(false)

    // Text overlays
    const [textOverlays,  setTextOverlays]  = useState([])
    const [isEditingText, setIsEditingText] = useState(false)
    const [editingId,     setEditingId]     = useState(null)
    const [currentText,   setCurrentText]   = useState('')
    const [textColor,     setTextColor]     = useState('#FFFFFF')
    const [outlineColor,  setOutlineColor]  = useState('#000000')
    const [showOutline,   setShowOutline]   = useState(false)
    const [fontSize,      setFontSize]      = useState(28)
    const [fontStyle,     setFontStyle]     = useState('normal')

    // Details form
    const [title,       setTitle]       = useState('')
    const [description, setDescription] = useState('')
    const [hashtags,    setHashtags]    = useState('')

    // Upload
    const [uploading, setUploading] = useState(false)
    const [progress,  setProgress]  = useState(0)
    const [errors,    setErrors]    = useState({})
    const [done,      setDone]      = useState(false)

    // Refs
    const fileInputRef  = useRef(null)
    const textInputRef  = useRef(null)
    const frameRef      = useRef(null)
    const previewRef    = useRef(null)
    const dragState     = useRef(null)
    const frameSizeRef  = useRef({ w: 390, h: 844 })

    const hasProducts = products.length > 0

    // Toast auto-dismiss
    useEffect(() => {
        if (!toast) return
        const t = setTimeout(() => setToast(null), 2600)
        return () => clearTimeout(t)
    }, [toast])

    // Remember the editor frame size: it is saved with the overlays so the
    // downloaded video can place text exactly where the creator put it.
    useEffect(() => {
        if (stage !== 'edit' || !frameRef.current) return
        const el = frameRef.current
        const update = () => {
            const r = el.getBoundingClientRect()
            if (r.width && r.height) frameSizeRef.current = { w: r.width, h: r.height }
        }
        update()
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
        ro?.observe(el)
        window.addEventListener('resize', update)
        return () => { ro?.disconnect(); window.removeEventListener('resize', update) }
    }, [stage])

    useEffect(() => { if (previewRef.current) previewRef.current.muted = muted }, [muted, stage])

    // ── Video in / out ────────────────────────────────────────────────────────
    const handleCaptured = useCallback((file, secs) => {
        setVideoPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file) })
        setVideoFile(file)
        setVideoDuration(secs)
        setTextOverlays([])
        setErrors({})
        setStage('edit')
    }, [])

    const handleGalleryFile = useCallback(async (file) => {
        if (!file) return
        try {
            if (file.type.startsWith('image/')) {
                const asVideo = await photoToVideoFile(file)
                handleCaptured(asVideo, PHOTO_SECONDS)
                return
            }
        } catch {
            setToast('Photos are not supported in this browser yet. Pick a video instead.')
            return
        }
        if (!GALLERY_VIDEO_TYPES.includes(file.type)) { setToast('Use an MP4, WebM, MOV or AVI video.'); return }
        if (file.size > 512 * 1024 * 1024)            { setToast('Max video size is 512MB.'); return }
        const url = URL.createObjectURL(file)
        const secs = await readDuration(url)
        URL.revokeObjectURL(url)
        handleCaptured(file, secs)
    }, [handleCaptured])

    const discardVideo = () => {
        if (videoPreview) URL.revokeObjectURL(videoPreview)
        setVideoFile(null); setVideoPreview(null); setVideoDuration(null); setTextOverlays([])
    }

    const closeUploader = () => {
        if (window.history.length > 1) window.history.back()
        else router.visit('/seller/dashboard')
    }

    // ── Drag to reposition ────────────────────────────────────────────────────
    const startDrag = (e, id) => {
        e.preventDefault(); e.stopPropagation()
        const frame = frameRef.current
        if (!frame) return
        const rect = frame.getBoundingClientRect()
        const cx = e.touches ? e.touches[0].clientX : e.clientX
        const cy = e.touches ? e.touches[0].clientY : e.clientY
        const overlay = textOverlays.find(o => o.id === id)
        if (!overlay) return
        dragState.current = { id, startX: cx, startY: cy, origTop: overlay.top, origLeft: overlay.left, frameW: rect.width, frameH: rect.height }

        const onMove = (ev) => {
            if (!dragState.current) return
            if (ev.cancelable) ev.preventDefault()
            const mx = ev.touches ? ev.touches[0].clientX : ev.clientX
            const my = ev.touches ? ev.touches[0].clientY : ev.clientY
            const dx = ((mx - dragState.current.startX) / dragState.current.frameW) * 100
            const dy = ((my - dragState.current.startY) / dragState.current.frameH) * 100
            setTextOverlays(prev => prev.map(o => o.id === dragState.current.id
                ? { ...o, top: Math.min(90, Math.max(2, dragState.current.origTop + dy)), left: Math.min(80, Math.max(2, dragState.current.origLeft + dx)) }
                : o
            ))
        }
        const onEnd = () => {
            dragState.current = null
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup',   onEnd)
            window.removeEventListener('touchmove', onMove)
            window.removeEventListener('touchend',  onEnd)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup',   onEnd)
        window.addEventListener('touchmove', onMove, { passive: false })
        window.addEventListener('touchend',  onEnd)
    }

    // ── Text overlay CRUD ─────────────────────────────────────────────────────
    const openTextEditor = (overlay = null) => {
        if (overlay) {
            setEditingId(overlay.id); setCurrentText(overlay.text)
            setTextColor(overlay.textColor); setOutlineColor(overlay.outlineColor ?? '#000000')
            setShowOutline(overlay.showOutline ?? false); setFontSize(overlay.fontSize); setFontStyle(overlay.fontStyle)
        } else {
            setEditingId(null); setCurrentText(''); setTextColor('#FFFFFF')
            setOutlineColor('#000000'); setShowOutline(false); setFontSize(28); setFontStyle('normal')
        }
        setIsEditingText(true)
        setTimeout(() => textInputRef.current?.focus(), 120)
    }

    const saveTextOverlay = () => {
        if (!currentText.trim()) { setIsEditingText(false); return }
        const data = { text: currentText.trim(), textColor, outlineColor, showOutline, fontSize, fontStyle }
        if (editingId) {
            setTextOverlays(prev => prev.map(o => o.id === editingId ? { ...o, ...data } : o))
        } else {
            setTextOverlays(prev => [...prev, { id: Date.now(), ...data, top: 30 + (prev.length % 5) * 9, left: 10 }])
        }
        setIsEditingText(false); setCurrentText(''); setEditingId(null)
    }

    const removeOverlay = (id) => setTextOverlays(prev => prev.filter(o => o.id !== id))

    // ── Products ──────────────────────────────────────────────────────────────
    const toggleProduct    = (id) => setTaggedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))

    const handleProductCreated = (p) => {
        setProducts(prev => [p, ...prev])
        setTaggedIds(prev => [...prev, p.id])
        setSheetOpen(false)
        setToast('Product created and tagged ✓')
    }

    // ── Navigation ────────────────────────────────────────────────────────────
    const editBack = () => {
        if (textOverlays.length > 0 && !window.confirm('Discard this video and its text?')) return
        discardVideo()
        setStage('camera')
    }

    const detailsNext = () => {
        if (!title.trim()) { setErrors({ title: 'Please add a title' }); return }
        setErrors({})
        handleUpload()
    }

    // ── Upload ────────────────────────────────────────────────────────────────
    const handleUpload = async () => {
        if (!videoFile)    { setErrors({ video: 'No video selected' }); setStage('camera'); return }
        if (!title.trim()) { setErrors({ title: 'Title is required' }); setStage('details'); return }
        setUploading(true); setErrors({}); setProgress(0)

        // Save the editor frame size with each overlay so the download renders it in the same place
        const { w: fw, h: fh } = frameSizeRef.current
        const overlaysForServer = textOverlays.map(o => ({
            ...o,
            frame_w:    Math.round(fw),
            frame_h:    Math.round(fh),
            font_ratio: Number((o.fontSize / fw).toFixed(4)),
        }))

        const fd = new FormData()
        fd.append('video', videoFile)
        fd.append('title', title.trim())
        fd.append('description', description.trim())
        fd.append('hashtags', hashtags.trim())
        fd.append('product_ids', JSON.stringify(taggedIds))
        fd.append('text_overlays', JSON.stringify(overlaysForServer))
        if (videoDuration) fd.append('duration_seconds', Math.max(1, Math.round(videoDuration)))

        try {
            await axios.post('/api/videos/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: e => { if (e.total) setProgress(Math.round((e.loaded / e.total) * 100)) },
            })
            setDone(true)
            setTimeout(() => router.visit('/seller/dashboard'), 2200)
        } catch (err) {
            if (err.response?.status === 409) {
                setErrors({ _general: 'Please verify your email before uploading videos.' })
                setTimeout(() => router.visit('/verify-email'), 1500)
                return
            }
            const d = err.response?.data
            setErrors(d?.errors ?? { _general: d?.message ?? 'Upload failed.' })
            if (d?.errors?.video) setStage('camera')
        } finally { setUploading(false) }
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    if (done) return (
        <>
            <Head title="Uploaded!" />
            <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
                    <RiCheckLine size={36} color="#10B981" />
                </div>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 22, margin: 0 }}>Video uploaded!</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>Redirecting to your dashboard…</p>
                <div style={{ height: 3, width: 160, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#FF6B35', animation: 'fill 2.2s linear forwards' }} />
                </div>
            </div>
            <style>{KEYFRAMES}</style>
        </>
    )

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <Head title="Create" />

            {/* ════ CAMERA ═══════════════════════════════════════════════ */}
            {stage === 'camera' && (
                <CameraScreen
                    onCaptured={handleCaptured}
                    onGallery={() => fileInputRef.current?.click()}
                    onClose={closeUploader}
                    showProductHint={!hasProducts}
                    onProductHint={() => setSheetOpen(true)}
                />
            )}

            {/* ════ EDIT (preview + text) ════════════════════════════════ */}
            {stage === 'edit' && (
                <div ref={frameRef} style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
                    <video
                        ref={previewRef}
                        src={videoPreview}
                        loop playsInline
                        onLoadedData={e => { e.target.muted = muted; e.target.play().catch(() => { e.target.muted = true; setMuted(true); e.target.play().catch(() => {}) }) }}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 22%, transparent 70%, rgba(0,0,0,0.55))', pointerEvents: 'none' }} />

                    {textOverlays.map(overlay => (
                        <OverlayText
                            key={overlay.id}
                            overlay={overlay}
                            interactive
                            onMouseDown={e => startDrag(e, overlay.id)}
                            onEdit={() => openTextEditor(overlay)}
                            onRemove={() => removeOverlay(overlay.id)}
                        />
                    ))}

                    {/* Top: product nudge */}
                    {!hasProducts && (
                        <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 14px)', left: 16, right: 76, zIndex: 20 }}>
                            <button onClick={() => setSheetOpen(true)} style={S.hintPill}>
                                <RiShoppingBag3Line size={13} /> Create &amp; tag a product to get more sales
                            </button>
                        </div>
                    )}

                    {/* Right tools */}
                    <div style={{ position: 'absolute', right: 14, top: 'calc(env(safe-area-inset-top) + 14px)', zIndex: 20, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                        <button onClick={() => openTextEditor()} aria-label="Add text" style={{ ...S.toolBtn }}>
                            <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.02em' }}>Aa</span>
                            <span style={S.toolLabel}>Text</span>
                        </button>
                        <button onClick={() => setMuted(m => !m)} aria-label={muted ? 'Unmute' : 'Mute'} style={S.toolBtn}>
                            {muted ? <RiVolumeMuteLine size={20} /> : <RiVolumeUpLine size={20} />}
                            <span style={S.toolLabel}>{muted ? 'Muted' : 'Sound'}</span>
                        </button>
                    </div>

                    {textOverlays.length === 0 && (
                        <p style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(env(safe-area-inset-bottom) + 96px)', textAlign: 'center', margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: 12, zIndex: 15, pointerEvents: 'none' }}>
                            Tap <strong style={{ color: '#fff' }}>Aa</strong> to add text, or just tap Next
                        </p>
                    )}

                    {/* Bottom: Back / Next */}
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, padding: '16px 16px calc(env(safe-area-inset-bottom) + 16px)', display: 'flex', gap: 10 }}>
                        <button onClick={editBack} style={{ ...S.outlineBtn, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', flex: '0 0 auto' }}>
                            <RiArrowLeftLine size={16} /> Back
                        </button>
                        <button onClick={() => setStage('details')} style={{ ...S.primaryBtn, flex: 1 }}>
                            Next <RiArrowRightLine size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* ════ DETAILS → POST ═══════════════════════════════════════ */}
            {stage === 'details' && (
                <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a', color: '#fff', overflowY: 'auto' }}>
                    <div style={{ maxWidth: 520, margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 14px) 16px calc(env(safe-area-inset-bottom) + 120px)' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                            <button onClick={() => setStage('edit')} disabled={uploading} style={S.iconBtn}><RiArrowLeftLine size={18} /></button>
                            <div style={{ flex: 1 }}>
                                <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Post details</h1>
                                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Last step · add details, tag a product, post</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
                            {[0, 1, 2].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i < 2 ? '#10B981' : '#FF6B35' }} />)}
                        </div>

                        {errors._general && <div style={{ ...S.errBanner, marginBottom: 14 }}>{errors._general}</div>}

                        {/* Video summary */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 10, marginBottom: 16 }}>
                            <div style={{ width: 54, aspectRatio: '9/16', borderRadius: 10, overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                                <video src={videoPreview ? `${videoPreview}#t=0.1` : undefined} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Your video{videoDuration ? ` · ${videoDuration}s` : ''}</p>
                                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{textOverlays.length > 0 ? `${textOverlays.length} text overlay${textOverlays.length !== 1 ? 's' : ''} added` : 'No text added'}</p>
                            </div>
                            <button onClick={() => setStage('edit')} disabled={uploading} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 999, padding: '7px 14px', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <SCard title="Title *">
                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your video a catchy title…" maxLength={100} style={S.inp} />
                                <CHint n={title.length} max={100} />
                                {errors.title && <p style={S.errTxt}>{Array.isArray(errors.title) ? errors.title[0] : errors.title}</p>}
                            </SCard>

                            <SCard title="Description">
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell people what your video is about…" maxLength={1000} rows={4} style={{ ...S.inp, resize: 'none', lineHeight: 1.6 }} />
                                <CHint n={description.length} max={1000} />
                            </SCard>

                            <SCard title="Hashtags">
                                <div style={{ position: 'relative' }}>
                                    <RiHashtag size={13} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="fashion trending ootd naija" style={{ ...S.inp, paddingLeft: 30 }} />
                                </div>
                                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '4px 0 0' }}>Space-separated, no # needed</p>
                            </SCard>

                            {/* Products */}
                            {!hasProducts ? (
                                <div style={{ background: 'linear-gradient(160deg, rgba(255,107,53,0.12), rgba(255,107,53,0.03))', border: '1px solid rgba(255,107,53,0.3)', borderRadius: 18, padding: '22px 18px', textAlign: 'center' }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,107,53,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                        <RiShoppingBag3Line size={22} color="#FF6B35" />
                                    </div>
                                    <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800 }}>You have no product to tag yet</p>
                                    <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>
                                        Create and tag a product to get more sales. Viewers can buy straight from your video.
                                    </p>
                                    <button onClick={() => setSheetOpen(true)} style={{ ...S.primaryBtn, margin: '0 auto', padding: '12px 24px' }}>
                                        <RiAddLine size={16} /> Create a product
                                    </button>
                                </div>
                            ) : (
                                <SCard
                                    title="Tag Products"
                                    badge={taggedIds.length > 0 ? `${taggedIds.length} selected` : null}
                                    action={<button onClick={() => setSheetOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,107,53,0.12)', border: 'none', borderRadius: 999, padding: '5px 10px', color: '#FF6B35', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}><RiAddLine size={12} /> New</button>}
                                >
                                    {taggedIds.length === 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 12, background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)', color: '#FF9F7A', fontSize: 12, lineHeight: 1.4 }}>
                                            <RiShoppingBag3Line size={14} style={{ flexShrink: 0 }} /> Tag a product to get more sales.
                                        </div>
                                    )}
                                    {products.length > 5 && (
                                        <div style={{ position: 'relative' }}>
                                            <RiPriceTag3Line size={13} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                            <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products…" style={{ ...S.inp, padding: '10px 14px 10px 30px', fontSize: 12 }} />
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                                        {filteredProducts.map(product => {
                                            const tagged = taggedIds.includes(product.id)
                                            return (
                                                <button key={product.id} onClick={() => toggleProduct(product.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: `1px solid ${tagged ? 'rgba(255,107,53,0.45)' : 'rgba(255,255,255,0.07)'}`, background: tagged ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                                                    <div style={{ width: 38, height: 38, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
                                                        {product.primary_image && <img src={product.primary_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{ color: '#fff', fontSize: 12, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                                                        <p style={{ color: '#FF6B35', fontSize: 12, fontWeight: 700, margin: '2px 0 0' }}>₦{Number(product.price).toLocaleString()}</p>
                                                    </div>
                                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: tagged ? '#FF6B35' : 'rgba(255,255,255,0.08)', border: tagged ? 'none' : '1.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        {tagged && <RiCheckLine size={11} color="#fff" />}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                        {filteredProducts.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '14px 0', margin: 0 }}>No products found</p>}
                                    </div>
                                </SCard>
                            )}

                            {uploading && (
                                <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Uploading…</span>
                                        <span style={{ color: '#FF6B35', fontWeight: 700 }}>{progress}%</span>
                                    </div>
                                    <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#FF6B35,#ff8c00)', borderRadius: 999, transition: 'width 0.3s ease' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom: Back / Post */}
                    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30, background: 'linear-gradient(to top, #0a0a0a 65%, transparent)', padding: '28px 16px calc(env(safe-area-inset-bottom) + 14px)' }}>
                        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', gap: 10 }}>
                            <button onClick={() => setStage('edit')} disabled={uploading} style={{ ...S.outlineBtn, flex: '0 0 auto' }}><RiArrowLeftLine size={16} /> Back</button>
                            <button onClick={detailsNext} disabled={uploading} style={{ ...S.primaryBtn, flex: 1, opacity: uploading ? 0.8 : 1 }}>
                                {uploading ? <><Spinner />{progress}%</> : <><RiUploadCloud2Line size={17} /> Post</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ Text editor ══════════════════════════════════════════ */}
            {isEditingText && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(14px)' }} />
                    <div style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.06)', padding: 5, borderRadius: 999 }}>
                            {[{ v: 'normal', l: 'Normal' }, { v: 'bold', l: 'Bold' }, { v: 'italic', l: 'Italic' }].map(f => (
                                <button key={f.v} onClick={() => setFontStyle(f.v)} style={{ padding: '7px 14px', borderRadius: 999, border: 'none', background: fontStyle === f.v ? '#fff' : 'transparent', color: fontStyle === f.v ? '#000' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: f.v === 'bold' ? 800 : 400, fontStyle: f.v === 'italic' ? 'italic' : 'normal', cursor: 'pointer', transition: 'all 0.15s' }}>
                                    {f.l}
                                </button>
                            ))}
                        </div>

                        <div style={{ width: '100%', maxWidth: 380 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={S.smallLabel}>Size</span>
                                <span style={{ color: '#FF6B35', fontSize: 12, fontWeight: 700 }}>{fontSize}px</span>
                            </div>
                            <input type="range" min={14} max={72} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} style={{ width: '100%', accentColor: '#FF6B35', cursor: 'pointer' }} />
                        </div>

                        <div style={{ width: '100%', maxWidth: 380 }}>
                            <textarea
                                ref={textInputRef}
                                value={currentText}
                                onChange={e => setCurrentText(e.target.value)}
                                placeholder="Type something…"
                                rows={3} maxLength={200}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveTextOverlay() } }}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: 14, color: textColor, fontSize: Math.min(fontSize, 36), fontWeight: fontStyle === 'bold' ? 800 : 500, fontStyle: fontStyle === 'italic' ? 'italic' : 'normal', textAlign: 'center', padding: '14px', outline: 'none', resize: 'none', lineHeight: 1.4, boxSizing: 'border-box', fontFamily: 'DM Sans, sans-serif', border: showOutline ? `2.5px solid ${outlineColor}` : '1.5px solid rgba(255,255,255,0.15)' }}
                            />
                            <div style={{ textAlign: 'right', marginTop: 4 }}>
                                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>{currentText.length}/200</span>
                            </div>
                        </div>

                        <ColorRow label="Text Color" colors={TEXT_COLORS} selected={textColor} onSelect={setTextColor} />

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={S.smallLabel}>Outline</span>
                                <button onClick={() => setShowOutline(o => !o)} style={{ width: 40, height: 22, borderRadius: 999, background: showOutline ? '#10B981' : 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.25s' }}>
                                    <span style={{ position: 'absolute', top: 3, left: showOutline ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                                </button>
                            </div>
                            {showOutline && <ColorRow label="Outline Color" colors={TEXT_COLORS} selected={outlineColor} onSelect={setOutlineColor} />}
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => { setIsEditingText(false); setCurrentText(''); setEditingId(null) }} style={S.outlineBtn}>Cancel</button>
                            <button onClick={saveTextOverlay} disabled={!currentText.trim()} style={{ ...S.primaryBtn, opacity: currentText.trim() ? 1 : 0.4, cursor: currentText.trim() ? 'pointer' : 'default' }}>
                                {editingId ? 'Update' : 'Add Text'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <ProductSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onCreated={handleProductCreated} />

            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top) + 16px)', left: '50%', transform: 'translateX(-50%)', zIndex: 300, padding: '10px 18px', borderRadius: 999, background: 'rgba(16,185,129,0.95)', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'pop 0.3s ease', whiteSpace: 'nowrap' }}>
                    {toast}
                </div>
            )}

            <input ref={fileInputRef} type="file" accept="video/*,image/*" onChange={e => { handleGalleryFile(e.target.files?.[0]); e.target.value = '' }} style={{ display: 'none' }} />
            <style>{KEYFRAMES}</style>
        </>
    )
}

// Full-screen, no app layout / navbar
Upload.layout = page => page

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pop{0%{transform:scale(0.3);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes fill{0%{width:0}100%{width:100%}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}
@keyframes sheetUp{0%{transform:translateY(100%)}100%{transform:translateY(0)}}
`

function Spinner({ dark }) {
    return <div style={{ width: 14, height: 14, border: `2px solid ${dark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)'}`, borderTopColor: dark ? '#000' : '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
}

function SCard({ title, badge, action, children }) {
    return (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, flex: 1 }}>{title}</h3>
                {badge && <span style={{ color: '#FF6B35', fontSize: 11, fontWeight: 700 }}>{badge}</span>}
                {action}
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
        </div>
    )
}

function CHint({ n, max }) {
    return <div style={{ textAlign: 'right', marginTop: 3 }}><span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>{n}/{max}</span></div>
}

function ColorRow({ label, colors, selected, onSelect }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
            <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.4)', padding: '8px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)' }}>
                {colors.map(c => (
                    <button key={c.hex} onClick={() => onSelect(c.hex)} title={c.label} style={{ width: selected === c.hex ? 28 : 22, height: selected === c.hex ? 28 : 22, borderRadius: '50%', background: c.hex, border: selected === c.hex ? '3px solid #FF6B35' : '2px solid rgba(255,255,255,0.15)', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }} />
                ))}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared styles
// ─────────────────────────────────────────────────────────────────────────────
const S = {
    inp:        { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'DM Sans, sans-serif' },
    iconBtn:    { width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 },
    glassBtn:   { width: 42, height: 42, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 },
    toolBtn:    { width: 46, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, textShadow: '0 1px 4px rgba(0,0,0,0.6)' },
    toolLabel:  { fontSize: 10, fontWeight: 700, opacity: 0.9 },
    hintPill:   { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,107,53,0.5)', color: '#FFB08F', fontSize: 11, fontWeight: 700, cursor: 'pointer', textAlign: 'left', lineHeight: 1.3 },
    primaryBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '14px 26px', borderRadius: 999, background: '#FF6B35', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
    outlineBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '14px 22px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
    errBanner:  { padding: '11px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, color: '#EF4444', fontSize: 13, textAlign: 'center' },
    errTxt:     { color: '#EF4444', fontSize: 12, margin: '5px 0 0' },
    smallLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 },
}