import { Head, router, usePage } from '@inertiajs/react'
import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    RiAddLine, RiArrowLeftLine, RiArrowRightLine, RiCheckLine, RiHashtag, RiMagicLine, RiMusic2Fill,
    RiPriceTag3Line, RiShoppingBag3Line, RiUploadCloud2Line, RiVolumeMuteLine, RiVolumeUpLine,
} from 'react-icons/ri'
import CameraScreen from '../../Components/Upload/CameraScreen'
import OverlayLayer from '../../Components/Upload/OverlayLayer'
import PreviewVideo from '../../Components/Upload/PreviewVideo'
import ProductSheet from '../../Components/Upload/ProductSheet'
import SoundSheet from '../../Components/Upload/SoundSheet'
import SoundMarquee from '../../Components/Video/SoundMarquee'
import TextEditor from '../../Components/Upload/TextEditor'
import { CHint, KEYFRAMES, S, SCard, Spinner } from '../../Components/Upload/ui'
import { ENHANCE_CSS, PHOTO_SECONDS, fmtTime, photoToVideoFile, probeVideo } from '../../lib/media'
import { ensureTextFonts, renderOverlayBlob } from '../../lib/textOverlays'

const GALLERY_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

export default function Upload({ products: initialProducts = [] }) {
    const authUser = usePage().props?.auth?.user
    const isAdmin = authUser?.role === 'admin'
    // 'camera' → 'edit' (preview, text, sound) → 'details' (then Post)
    const [stage, setStage] = useState('camera')

    // Products (local copy so a newly created one can be added and tagged)
    const [products, setProducts] = useState(initialProducts)
    const [taggedIds, setTaggedIds] = useState([])
    const [productSearch, setProductSearch] = useState('')
    const [productSheet, setProductSheet] = useState(false)
    const [toast, setToast] = useState(null)

    // Video
    const [videoFile, setVideoFile] = useState(null)
    const [videoUrl, setVideoUrl] = useState(null)
    const [videoDuration, setVideoDuration] = useState(null)
    const [videoDims, setVideoDims] = useState(null)       // { width, height } as the browser decodes it
    const [hasOwnAudio, setHasOwnAudio] = useState(true)
    const [muted, setMuted] = useState(false)
    const [originalVolume, setOriginalVolume] = useState(1)
    const [preparing, setPreparing] = useState(false)
    const [previewState, setPreviewState] = useState('loading')

    // Text overlays
    const [overlays, setOverlays] = useState([])
    const [editor, setEditor] = useState(null)             // { initial } while the text editor is open
    const [textDefaults, setTextDefaults] = useState(null)
    const [gesturing, setGesturing] = useState(false)

    // Sound
    const [sound, setSound] = useState(null)               // { sound, start, end, musicVolume }
    const preSound = useRef(null)                          // sound chosen on a sound page ("Use this sound"), kept across retakes
    const [soundSheet, setSoundSheet] = useState(false)
    const [allowReuse, setAllowReuse] = useState(true)
    const [posterUrl, setPosterUrl] = useState(null)     // freeze-frame shown instantly while the recording loads
    // "Enhance" look: on by default, remembered per device
    const [enhance, setEnhance] = useState(() => { try { return localStorage.getItem('flockr.enhance') !== '0' } catch { return true } })
    const toggleEnhance = () => setEnhance(v => { const n = !v; try { localStorage.setItem('flockr.enhance', n ? '1' : '0') } catch { /* optional */ } return n })

    // Details
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [hashtags, setHashtags] = useState('')

    // Upload
    const [uploading, setUploading] = useState(false)
    const [uploadLabel, setUploadLabel] = useState('')
    const [progress, setProgress] = useState(0)
    const [errors, setErrors] = useState({})
    const [done, setDone] = useState(false)

    const fileInputRef = useRef(null)
    const nativeInputRef = useRef(null)
    const frameRef = useRef(null)
    const videoRef = useRef(null)
    const musicRef = useRef(null)
    const frameSize = useRef({ w: 390, h: 844 })
    const urlRef = useRef(null)

    const hasProducts = products.length > 0

    useEffect(() => { ensureTextFonts() }, [])

    useEffect(() => {
        if (!toast) return undefined
        const t = setTimeout(() => setToast(null), 2800)
        return () => clearTimeout(t)
    }, [toast])

    useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

    // The editor frame size is saved with every overlay so text lands where the creator put it
    useEffect(() => {
        const el = frameRef.current
        if (stage !== 'edit' || !el) return undefined
        const update = () => {
            const r = el.getBoundingClientRect()
            if (r.width && r.height) frameSize.current = { w: r.width, h: r.height }
        }
        update()
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
        ro?.observe(el)
        window.addEventListener('resize', update)
        return () => { ro?.disconnect(); window.removeEventListener('resize', update) }
    }, [stage])

    // ── Music preview follows the video (play, pause, loop) ────────────────────
    useEffect(() => {
        const a = musicRef.current
        const v = videoRef.current
        if (!a || !v || stage !== 'edit' || !sound) { a?.pause(); return undefined }
        a.src = sound.sound.url
        a.volume = sound.musicVolume
        const align = () => { try { a.currentTime = sound.start + (v.currentTime || 0) } catch { /* not seekable yet */ } }
        const onPlay = () => { align(); a.play().catch(() => {}) }
        const onPause = () => a.pause()
        const onSeek = () => align()
        let last = 0
        const endT = sound.end ?? Infinity
        const onTime = () => {
            if (v.currentTime < last - 0.3) { align(); if (!v.paused) a.play().catch(() => {}) }   // video looped: music restarts too
            last = v.currentTime
            if (a.currentTime >= endT && !a.paused) a.pause()                                       // chosen part of the sound is over
        }
        v.addEventListener('play', onPlay)
        v.addEventListener('playing', onPlay)
        v.addEventListener('pause', onPause)
        v.addEventListener('seeked', onSeek)
        v.addEventListener('timeupdate', onTime)
        if (!v.paused) onPlay()
        return () => {
            v.removeEventListener('play', onPlay)
            v.removeEventListener('playing', onPlay)
            v.removeEventListener('pause', onPause)
            v.removeEventListener('seeked', onSeek)
            v.removeEventListener('timeupdate', onTime)
            a.pause()
        }
    }, [sound, stage, videoUrl, previewState])

    // Arrived from a sound page: /seller/upload?sound=ID
    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get('sound')
        if (!id) return
        axios.get(`/api/sounds/${id}`)
            .then(({ data }) => {
                if (!data?.sound) return
                const sel = { sound: data.sound, start: 0, musicVolume: 0.7 }
                preSound.current = sel
                setSound(sel)
            })
            .catch(() => {})
    }, [])

    // ── Video in / out ────────────────────────────────────────────────────────
    const setVideo = useCallback((file, secs, { silent = false, dims = null, poster = null } = {}) => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        const url = URL.createObjectURL(file)
        urlRef.current = url
        setPosterUrl(poster)
        setVideoUrl(url)
        setVideoFile(file)
        setVideoDuration(secs)
        setVideoDims(dims)
        setHasOwnAudio(!silent)
        setMuted(silent)
        setOriginalVolume(1)
        setOverlays([])
        setErrors({})
        setPreviewState('loading')
        setStage('edit')
    }, [])

    const handleFile = useCallback(async (file, { silent = false } = {}) => {
        if (!file) return
        try {
            if (file.type.startsWith('image/')) {
                setPreparing(true)
                const asVideo = await photoToVideoFile(file)
                setVideo(asVideo, PHOTO_SECONDS, { silent: true })
                return
            }
        } catch {
            setToast('Photos are not supported in this browser yet. Pick a video instead.')
            return
        } finally {
            setPreparing(false)
        }
        const type = file.type || ''
        if (type && !GALLERY_VIDEO_TYPES.includes(type) && !type.startsWith('video/')) { setToast('Use an MP4, WebM, MOV or AVI video.'); return }
        if (file.size > 512 * 1024 * 1024) { setToast('Max video size is 512MB.'); return }
        const url = URL.createObjectURL(file)
        const meta = await probeVideo(url)
        URL.revokeObjectURL(url)
        // meta === null means this browser can't decode it. We still let it through: the server can.
        setVideo(file, meta?.duration ?? null, { silent, dims: meta?.width ? { width: meta.width, height: meta.height } : null })
    }, [setVideo])

    const openNative = (mode) => {
        const el = nativeInputRef.current
        if (!el) return
        el.setAttribute('accept', mode === 'photo' ? 'image/*' : 'video/*')
        el.setAttribute('capture', 'environment')
        el.click()
    }

    const discardVideo = () => {
        if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null }
        setVideoUrl(null); setVideoFile(null); setVideoDuration(null); setVideoDims(null); setPosterUrl(null)
        setOverlays([]); setSound(preSound.current)
    }

    const closeUploader = () => {
        if (window.history.length > 1) window.history.back()
        else router.visit('/seller/dashboard')
    }

    // ── Text ──────────────────────────────────────────────────────────────────
    const updateOverlay = useCallback((id, patch) => setOverlays(prev => prev.map(o => (o.id === id ? { ...o, ...patch } : o))), [])
    const removeOverlay = useCallback((id) => setOverlays(prev => prev.filter(o => o.id !== id)), [])
    const overlaysRef = useRef(overlays)
    overlaysRef.current = overlays
    const editOverlay = useCallback((id) => setEditor({ initial: overlaysRef.current.find(o => o.id === id) || null }), [])

    const finishText = (o, defaults) => {
        const initial = editor?.initial
        setEditor(null)
        if (!o) {
            if (initial) removeOverlay(initial.id)     // emptied an existing text = delete it
            return
        }
        if (defaults) setTextDefaults(defaults)
        setOverlays(prev => (initial ? prev.map(x => (x.id === initial.id ? o : x)) : [...prev, o]))
    }

    // ── Products ──────────────────────────────────────────────────────────────
    const toggleProduct = (id) => setTaggedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))

    const handleProductCreated = (p, warning) => {
        setProducts(prev => [p, ...prev])
        setTaggedIds(prev => [...prev, p.id])
        setProductSheet(false)
        setToast(warning || 'Product created and tagged ✓')
    }

    // ── Navigation ────────────────────────────────────────────────────────────
    const editBack = () => {
        if ((overlays.length > 0 || sound) && !window.confirm('Discard this video and your edits?')) return
        discardVideo()
        setStage('camera')
    }

    const applySound = (sel, origVol) => {
        setSound(sel)
        setOriginalVolume(origVol)
        setSoundSheet(false)
    }

    // ── Upload ────────────────────────────────────────────────────────────────
    const handleUpload = async () => {
        if (!videoFile) { setErrors({ video: 'No video selected' }); setStage('camera'); return }
        if (!title.trim()) { setErrors({ title: 'Please add a title' }); return }
        setUploading(true); setErrors({}); setProgress(0)

        try {
            const { w: fw, h: fh } = frameSize.current
            const vw = videoDims?.width, vh = videoDims?.height
            // video pixels per editor pixel (the preview is cover-fitted into the frame)
            const k = vw && vh ? Math.min(vw / fw, vh / fh) : 1080 / fw

            setUploadLabel('Preparing text…')
            const fd = new FormData()
            const meta = []
            for (const o of overlays) {
                const r = await renderOverlayBlob(o, k)
                if (!r.blob) throw new Error('Could not prepare your text. Try removing it and adding it again.')
                fd.append('overlay_images[]', r.blob, `overlay-${meta.length}.png`)
                meta.push({ ...o, frame_w: Math.round(fw), frame_h: Math.round(fh), png_index: meta.length, png_scale: r.scale, png_w: r.width, png_h: r.height })
            }

            fd.append('video', videoFile)
            fd.append('title', title.trim())
            fd.append('description', description.trim())
            fd.append('hashtags', hashtags.trim())
            fd.append('product_ids', JSON.stringify(taggedIds))
            fd.append('text_overlays', JSON.stringify(meta))
            if (videoDuration) fd.append('duration_seconds', Math.max(1, Math.round(videoDuration)))
            fd.append('original_volume', String(muted || !hasOwnAudio ? 0 : originalVolume))
            fd.append('allow_sound_reuse', allowReuse ? '1' : '0')
            fd.append('enhance', enhance ? '1' : '0')
            if (sound) {
                fd.append('sound_id', String(sound.sound.id))
                fd.append('sound_start', String(Math.round(sound.start)))
                if (sound.end) fd.append('sound_end', String(Math.round(sound.end * 10) / 10))
                fd.append('music_volume', String(sound.musicVolume))
            }

            setUploadLabel('Uploading…')
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
            setErrors(d?.errors ?? { _general: d?.message ?? err.message ?? 'Upload failed.' })
            if (d?.errors?.video) setStage('camera')
        } finally {
            setUploading(false)
            setUploadLabel('')
        }
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    if (done) {
        return (
            <>
                <Head title="Uploaded!" />
                <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
                        <RiCheckLine size={36} color="#10B981" />
                    </div>
                    <p style={{ color: '#fff', fontWeight: 800, fontSize: 22, margin: 0 }}>Video uploaded!</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0, textAlign: 'center', padding: '0 24px' }}>
                        {sound || overlays.length ? 'We are adding your sound and text. It goes live in a moment.' : 'Redirecting to your dashboard…'}
                    </p>
                    <div style={{ height: 3, width: 160, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#FF6B35', animation: 'fill 2.2s linear forwards' }} />
                    </div>
                </div>
                <style>{KEYFRAMES}</style>
            </>
        )
    }

    const soundPill = (extra) => (
        <button onClick={() => setSoundSheet(true)} aria-label="Add sound" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, maxWidth: '100%', padding: '8px 14px', borderRadius: 999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...extra }}>
            <RiMusic2Fill size={14} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sound ? sound.sound.title : 'Add sound'}</span>
        </button>
    )

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <Head title="Create" />

            {/* ════ CAMERA ═══════════════════════════════════════════════ */}
            {stage === 'camera' && sound && (
                <div style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top) + 64px)', left: 0, right: 0, zIndex: 30, display: 'flex', justifyContent: 'center', padding: '0 70px', pointerEvents: 'none' }}>
                    <div style={{ pointerEvents: 'auto', maxWidth: '100%' }}>{soundPill()}</div>
                </div>
            )}
            {stage === 'camera' && (
                <CameraScreen
                    onCaptured={(file, secs, opts) => setVideo(file, secs, { silent: !!opts?.silent, poster: opts?.poster ?? null })}
                    enhance={enhance}
                    onToggleEnhance={toggleEnhance}
                    onGallery={() => fileInputRef.current?.click()}
                    onNativeCapture={openNative}
                    onClose={closeUploader}
                    showProductHint={!hasProducts}
                    onProductHint={() => setProductSheet(true)}
                />
            )}

            {/* ════ EDIT (preview + text + sound) ═══════════════════════ */}
            {stage === 'edit' && (
                <div ref={frameRef} style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
                    <PreviewVideo
                        ref={videoRef}
                        src={videoUrl}
                        muted={muted || !hasOwnAudio}
                        volume={originalVolume}
                        poster={posterUrl}
                        filter={enhance ? ENHANCE_CSS : undefined}
                        onSoundBlocked={() => { setMuted(true); setToast('Sound is off. Tap the speaker to turn it on.') }}
                        onStatus={setPreviewState}
                        onMetrics={m => { if (m.width) setVideoDims({ width: m.width, height: m.height }); if (m.duration && !videoDuration) setVideoDuration(Math.max(1, Math.round(m.duration))) }}
                    >
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 22%, transparent 70%, rgba(0,0,0,0.55))', pointerEvents: 'none' }} />
                    </PreviewVideo>

                    <OverlayLayer
                        overlays={overlays}
                        frameRef={frameRef}
                        hiddenId={editor?.initial?.id ?? null}
                        onUpdate={updateOverlay}
                        onRemove={removeOverlay}
                        onEdit={editOverlay}
                        onGesture={setGesturing}
                    />

                    <div style={{ opacity: gesturing ? 0 : 1, transition: 'opacity 0.15s', pointerEvents: gesturing ? 'none' : 'auto' }}>
                        {/* Top: sound pill + product nudge */}
                        <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 14px)', left: 16, right: 80, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                            {soundPill()}
                            {!hasProducts && (
                                <button onClick={() => setProductSheet(true)} style={S.hintPill}>
                                    <RiShoppingBag3Line size={13} /> Create &amp; tag a product to get more sales
                                </button>
                            )}
                        </div>

                        {/* Right tools */}
                        <div style={{ position: 'absolute', right: 14, top: 'calc(env(safe-area-inset-top) + 14px)', zIndex: 20, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                            <button onClick={() => setEditor({ initial: null })} aria-label="Add text" style={S.toolBtn}>
                                <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>Aa</span>
                                <span style={S.toolLabel}>Text</span>
                            </button>
                            <button onClick={() => setSoundSheet(true)} aria-label="Sound" style={S.toolBtn}>
                                <RiMusic2Fill size={20} />
                                <span style={S.toolLabel}>Sound</span>
                            </button>
                            <button onClick={toggleEnhance} aria-label="Enhance" aria-pressed={enhance} style={{ ...S.toolBtn, color: enhance ? '#FF6B35' : '#fff' }}>
                                <RiMagicLine size={20} />
                                <span style={S.toolLabel}>Enhance</span>
                            </button>
                            {hasOwnAudio && (
                                <button onClick={() => setMuted(m => !m)} aria-label={muted ? 'Unmute video' : 'Mute video'} style={S.toolBtn}>
                                    {muted ? <RiVolumeMuteLine size={20} /> : <RiVolumeUpLine size={20} />}
                                    <span style={S.toolLabel}>{muted ? 'Muted' : 'Volume'}</span>
                                </button>
                            )}
                        </div>

                        {overlays.length === 0 && (
                            <p style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(env(safe-area-inset-bottom) + 96px)', textAlign: 'center', margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: 12, zIndex: 15, pointerEvents: 'none' }}>
                                Tap <strong style={{ color: '#fff' }}>Aa</strong> to add text, <strong style={{ color: '#fff' }}>Sound</strong> for music, or just tap Next
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
                </div>
            )}

            {/* ════ DETAILS → POST ═══════════════════════════════════════ */}
            {stage === 'details' && (
                <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a', color: '#fff', overflowY: 'auto' }}>
                    <div style={{ maxWidth: 520, margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 14px) 16px calc(env(safe-area-inset-bottom) + 120px)' }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                            <button onClick={() => setStage('edit')} disabled={uploading} aria-label="Back" style={S.iconBtn}><RiArrowLeftLine size={18} /></button>
                            <div style={{ flex: 1 }}>
                                <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Post details</h1>
                                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Last step · add details, tag a product, post</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
                            {[0, 1, 2].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i < 2 ? '#10B981' : '#FF6B35' }} />)}
                        </div>

                        {errors._general && <div style={{ ...S.errBanner, marginBottom: 14 }}>{errors._general}</div>}
                        {errors.video && <div style={{ ...S.errBanner, marginBottom: 14 }}>{Array.isArray(errors.video) ? errors.video[0] : errors.video}</div>}

                        {/* Video summary */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 10, marginBottom: 16 }}>
                            <div style={{ width: 54, aspectRatio: '9/16', borderRadius: 10, overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                                <video src={videoUrl ? `${videoUrl}#t=0.1` : undefined} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Your video{videoDuration ? ` · ${fmtTime(videoDuration)}` : ''}</p>
                                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                    {[overlays.length > 0 ? `${overlays.length} text${overlays.length !== 1 ? 's' : ''}` : null, sound ? `♪ ${sound.sound.title}` : null].filter(Boolean).join(' · ') || 'No text or sound added'}
                                </p>
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

                            {/* Sound: what plays on the video + whether others can reuse your own audio */}
                            <SCard title="Sound" action={<button onClick={() => setSoundSheet(true)} disabled={uploading} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 999, padding: '5px 12px', color: '#FF6B35', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{sound ? 'Change' : 'Add'}</button>}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 12px' }}>
                                    <SoundMarquee
                                        sound={sound ? sound.sound : null}
                                        username={authUser?.username}
                                        style={{ flex: 1, maxWidth: 'none', minWidth: 0 }}
                                    />
                                    {sound && <button onClick={() => setSound(null)} disabled={uploading} aria-label="Remove sound" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 12, cursor: 'pointer' }}>Remove</button>}
                                </div>
                                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                                    {sound
                                        ? `Mixed in from ${fmtTime(sound.start)}${sound.end ? ` to ${fmtTime(sound.end)}` : ''} at ${Math.round(sound.musicVolume * 100)}% volume${hasOwnAudio ? `, your own audio at ${muted ? 0 : Math.round(originalVolume * 100)}%` : ''}. This credit shows under your video.`
                                        : hasOwnAudio ? 'Your video plays with its own audio. Add music from the library, or record your own sound.' : 'Silent video. Add a sound to bring it to life.'}
                                </p>
                                {hasOwnAudio && !sound && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Let others use your sound</p>
                                            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Other creators can pick your video&apos;s original audio.</p>
                                        </div>
                                        <button onClick={() => setAllowReuse(v => !v)} role="switch" aria-checked={allowReuse} aria-label="Allow sound reuse" style={{ width: 44, height: 24, borderRadius: 999, background: allowReuse ? '#10B981' : 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.25s', flexShrink: 0 }}>
                                            <span style={{ position: 'absolute', top: 3, left: allowReuse ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)' }} />
                                        </button>
                                    </div>
                                )}
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
                                    <button onClick={() => setProductSheet(true)} style={{ ...S.primaryBtn, margin: '0 auto', padding: '12px 24px' }}>
                                        <RiAddLine size={16} /> Create a product
                                    </button>
                                </div>
                            ) : (
                                <SCard
                                    title="Tag Products"
                                    badge={taggedIds.length > 0 ? `${taggedIds.length} selected` : null}
                                    action={<button onClick={() => setProductSheet(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,107,53,0.12)', border: 'none', borderRadius: 999, padding: '5px 10px', color: '#FF6B35', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}><RiAddLine size={12} /> New</button>}
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
                                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{uploadLabel || 'Uploading…'}</span>
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
                            <button onClick={handleUpload} disabled={uploading} style={{ ...S.primaryBtn, flex: 1, opacity: uploading ? 0.8 : 1 }}>
                                {uploading ? <><Spinner />{uploadLabel === 'Uploading…' ? `${progress}%` : uploadLabel}</> : <><RiUploadCloud2Line size={17} /> Post</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ Text editor ══════════════════════════════════════════ */}
            {editor && (
                <TextEditor
                    key={editor.initial?.id ?? 'new'}
                    initial={editor.initial}
                    defaults={textDefaults}
                    frameW={frameSize.current.w}
                    frameH={frameSize.current.h}
                    onDone={finishText}
                    onCancel={() => setEditor(null)}
                />
            )}

            <SoundSheet
                open={soundSheet}
                onClose={() => setSoundSheet(false)}
                current={sound}
                originalVolume={muted ? 0 : originalVolume}
                hasOwnAudio={hasOwnAudio}
                videoDuration={videoDuration}
                isAdmin={isAdmin}
                onApply={applySound}
                onRemove={() => { setSound(null); setSoundSheet(false) }}
            />
            <ProductSheet open={productSheet} onClose={() => setProductSheet(false)} onCreated={handleProductCreated} />

            {/* Preparing a photo */}
            {preparing && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                    <Spinner size={30} />
                    <p style={{ margin: 0, color: '#fff', fontSize: 14, fontWeight: 700 }}>Getting your photo ready…</p>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>This takes about {PHOTO_SECONDS} seconds</p>
                </div>
            )}

            {toast && (
                <div style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top) + 16px)', left: '50%', transform: 'translateX(-50%)', zIndex: 300, maxWidth: '90vw', padding: '10px 18px', borderRadius: 999, background: 'rgba(16,185,129,0.95)', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'pop 0.3s ease', textAlign: 'center' }}>
                    {toast}
                </div>
            )}

            <audio ref={musicRef} loop preload="auto" />
            <input ref={fileInputRef} type="file" accept="video/*,image/*" onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }} style={{ display: 'none' }} />
            <input ref={nativeInputRef} type="file" onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }} style={{ display: 'none' }} />
            <style>{KEYFRAMES}</style>
        </>
    )
}

// Full-screen, no app layout / navbar
Upload.layout = page => page
