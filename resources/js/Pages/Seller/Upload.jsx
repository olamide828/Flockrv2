import AppLayout from '@/Layouts/AppLayout'
import { Head, router, usePage } from '@inertiajs/react'
import axios from 'axios'
import { useCallback, useRef, useState } from 'react'
import {
    RiAddLine, RiArrowLeftLine, RiArrowRightLine,
    RiCheckLine, RiCloseLine, 
    RiDeleteBinLine, RiHashtag, RiPriceTag3Line,
    RiTimeLine, RiUploadCloud2Line, RiVideoLine,
} from 'react-icons/ri'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
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

const OUTLINE_COLORS = [
    { hex: '#FFFFFF', label: 'White'  },
    { hex: '#000000', label: 'Black'  },
    { hex: '#FF6B35', label: 'Orange' },
    { hex: '#EF4444', label: 'Red'    },
    { hex: '#FBBF24', label: 'Yellow' },
    { hex: '#3B82F6', label: 'Blue'   },
    { hex: '#10B981', label: 'Green'  },
    { hex: '#8B5CF6', label: 'Purple' },
]

const STEPS = [
    { id: 1, label: 'Video'   },
    { id: 2, label: 'Text'    },
    { id: 3, label: 'Details' },
    { id: 4, label: 'Post'    },
]

// ─────────────────────────────────────────────────────────────────────────────
// Overlay renderer (shared between phone frame + review)
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
                zIndex: 10,
                cursor: interactive ? 'grab' : 'default',
                userSelect: 'none',
                touchAction: 'none',
            }}
        >
            <div style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{
                    color: overlay.textColor,
                    fontSize: overlay.fontSize,
                    fontWeight: overlay.fontStyle === 'bold' ? 800 : 600,
                    fontStyle: overlay.fontStyle === 'italic' ? 'italic' : 'normal',
                    textShadow: overlay.showOutline ? 'none' : '0 2px 8px rgba(0,0,0,0.9)',
                    border: overlay.showOutline ? `2.5px solid ${overlay.outlineColor}` : 'none',
                    borderRadius: overlay.showOutline ? 8 : 0,
                    padding: overlay.showOutline ? '3px 10px' : 0,
                    display: 'inline-block',
                    lineHeight: 1.3,
                    maxWidth: 200,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    pointerEvents: interactive ? 'auto' : 'none',
                }}>
                    {overlay.text}
                </span>

                {/* Edit / remove buttons — only in interactive mode */}
                {interactive && (
                    <>
                        <button
                            onMouseDown={e => { e.stopPropagation(); onEdit?.() }}
                            onTouchStart={e => { e.stopPropagation(); onEdit?.() }}
                            style={{ position: 'absolute', top: -10, left: -10, width: 20, height: 20, borderRadius: '50%', background: '#FF6B35', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 800, zIndex: 11 }}
                        >
                            ✎
                        </button>
                        <button
                            onMouseDown={e => { e.stopPropagation(); onRemove?.() }}
                            onTouchStart={e => { e.stopPropagation(); onRemove?.() }}
                            style={{ position: 'absolute', top: -10, right: -10, width: 20, height: 20, borderRadius: '50%', background: 'rgba(239,68,68,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11 }}
                        >
                            <RiCloseLine size={11} color="#fff" />
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step bar
// ─────────────────────────────────────────────────────────────────────────────
function StepBar({ step }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 0 2px' }}>
            {STEPS.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, transition: 'all 0.3s', background: step > s.id ? '#10B981' : step === s.id ? '#FF6B35' : 'rgba(255,255,255,0.08)', color: step >= s.id ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                            {step > s.id ? <RiCheckLine size={12} /> : s.id}
                        </div>
                        <span style={{ color: step === s.id ? '#FF6B35' : step > s.id ? '#10B981' : 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: step === s.id ? 700 : 400 }}>
                            {s.label}
                        </span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div style={{ width: 36, height: 2, background: step > s.id ? '#10B981' : 'rgba(255,255,255,0.08)', margin: '0 4px 14px', transition: 'background 0.3s' }} />
                    )}
                </div>
            ))}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Phone frame
// ─────────────────────────────────────────────────────────────────────────────
function PhoneFrame({ children, frameRef, maxWidth = 260 }) {
    return (
        <div
            ref={frameRef}
            style={{ position: 'relative', width: '100%', maxWidth, margin: '0 auto', aspectRatio: '9/16', borderRadius: 22, overflow: 'hidden', background: '#111', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', flexShrink: 0 }}
        >
            {children}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function Upload({ products = [] }) {
    const { auth } = usePage().props

    // Step
    const [step, setStep] = useState(1)

    // Video
    const [videoFile,     setVideoFile]     = useState(null)
    const [videoPreview,  setVideoPreview]  = useState(null)
    const [videoDuration, setVideoDuration] = useState(null)

    // Text overlays
    const [textOverlays,  setTextOverlays]  = useState([])
    const [isEditingText, setIsEditingText] = useState(false)
    const [editingId,     setEditingId]     = useState(null)
    const [currentText,   setCurrentText]   = useState('')
    const [textColor,     setTextColor]     = useState('#FFFFFF')
    const [outlineColor,  setOutlineColor]  = useState('#000000')
    const [showOutline,   setShowOutline]   = useState(false)
    const [fontSize,      setFontSize]      = useState(20)
    const [fontStyle,     setFontStyle]     = useState('normal')

    // Form
    const [title,         setTitle]         = useState('')
    const [description,   setDescription]   = useState('')
    const [hashtags,      setHashtags]      = useState('')
    const [taggedIds,     setTaggedIds]     = useState([])
    const [productSearch, setProductSearch] = useState('')

    // Upload
    const [uploading, setUploading] = useState(false)
    const [progress,  setProgress]  = useState(0)
    const [errors,    setErrors]    = useState({})
    const [done,      setDone]      = useState(false)

    // Refs
    const fileInputRef = useRef(null)
    const textInputRef = useRef(null)
    const frameRef     = useRef(null)
    const dragState    = useRef(null)

    // ── File handling ─────────────────────────────────────────────────────────
    const handleVideoFile = useCallback((file) => {
        if (!file) return
        const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
        if (!validTypes.includes(file.type)) { setErrors(e => ({ ...e, video: 'Use MP4, WebM, MOV or AVI' })); return }
        if (file.size > 512 * 1024 * 1024) { setErrors(e => ({ ...e, video: 'Max size is 512MB' })); return }
        setErrors(e => { const n = { ...e }; delete n.video; return n })
        setVideoFile(file)
        setVideoPreview(URL.createObjectURL(file))
    }, [])

    const handleDrop = useCallback((e) => { e.preventDefault(); handleVideoFile(e.dataTransfer.files?.[0]) }, [handleVideoFile])

    // ── Drag to reposition ───────────────────────────────────────────────────
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
            setOutlineColor('#000000'); setShowOutline(false); setFontSize(20); setFontStyle('normal')
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
            setTextOverlays(prev => [...prev, { id: Date.now(), ...data, top: 20 + prev.length * 14, left: 10 }])
        }
        setIsEditingText(false); setCurrentText(''); setEditingId(null)
    }

    const removeOverlay = (id) => setTextOverlays(prev => prev.filter(o => o.id !== id))

    // ── Products ──────────────────────────────────────────────────────────────
    const toggleProduct = (id) => setTaggedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    const taggedProducts   = products.filter(p => taggedIds.includes(p.id))

    // ── Step nav ──────────────────────────────────────────────────────────────
    const goNext = () => {
        if (step === 1 && !videoFile) { setErrors({ video: 'Please select a video first' }); return }
        if (step === 3 && !title.trim()) { setErrors({ title: 'Please add a title' }); return }
        setErrors({}); setStep(s => Math.min(s + 1, 4))
    }
    const goBack = () => setStep(s => Math.max(s - 1, 1))

    // ── Upload ────────────────────────────────────────────────────────────────
    const handleUpload = async () => {
        if (!videoFile) { setErrors({ video: 'No video selected' }); return }
        if (!title.trim()) { setErrors({ title: 'Title is required' }); setStep(3); return }
        setUploading(true); setErrors({}); setProgress(0)
        const fd = new FormData()
        fd.append('video', videoFile)
        fd.append('title', title.trim())
        fd.append('description', description.trim())
        fd.append('hashtags', hashtags.trim())
        fd.append('product_ids', JSON.stringify(taggedIds))
        fd.append('text_overlays', JSON.stringify(textOverlays))
        if (videoDuration) fd.append('duration_seconds', videoDuration)
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
            setStep(d?.errors?.video ? 1 : 3)
        } finally { setUploading(false) }
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    if (done) return (
        <>
            <Head title="Uploaded!" />
            <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
                    <RiCheckLine size={36} color="#10B981" />
                </div>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 22, margin: 0 }}>Video uploaded!</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>Redirecting to your dashboard…</p>
                <div style={{ height: 3, width: 160, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#FF6B35', animation: 'fill 2.2s linear forwards' }} />
                </div>
            </div>
            <style>{`@keyframes pop{0%{transform:scale(0.3);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes fill{0%{width:0}100%{width:100%}}`}</style>
        </>
    )

    const back = () => {
        window.history.back()
    }

    // ── Layout ────────────────────────────────────────────────────────────────
    return (
        <>
            <Head title="Upload Video" />
            <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>

                {/* Header */}
                <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 16px' }}>
                    <div style={{ maxWidth: 860, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => step === 1 ? back() : goBack()} style={S.iconBtn}>
                            <RiArrowLeftLine size={18} />
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h1 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Upload Video</h1>
                            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Step {step} of {STEPS.length} · {STEPS[step-1].label}</p>
                        </div>
                        {step < 4
                            ? <button onClick={goNext} style={{ ...S.primaryBtn, padding: '8px 16px', fontSize: 13, opacity: step === 1 && !videoFile ? 0.4 : 1, cursor: step === 1 && !videoFile ? 'not-allowed' : 'pointer' }}>
                                {step === 3 ? 'Review' : 'Continue'} <RiArrowRightLine size={13} />
                              </button>
                            : <button onClick={handleUpload} disabled={uploading} style={{ ...S.primaryBtn, padding: '8px 16px', fontSize: 13 }}>
                                {uploading ? <><Spinner />{progress}%</> : <><RiUploadCloud2Line  size={14} /> Post</>}
                              </button>
                        }
                    </div>
                </header>

                {/* Step bar */}
                <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 16px' }}>
                    <StepBar step={step} />
                </div>

                {/* Step content */}
                <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 16px 100px' }}>

                    {/* ════ STEP 1 ════════════════════════════════════════ */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                            <PhoneFrame frameRef={frameRef}>
                                {!videoPreview ? (
                                    <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, cursor: 'pointer', background: 'radial-gradient(ellipse at center, rgba(255,107,53,0.06) 0%, transparent 70%)' }}>
                                        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,107,53,0.1)', border: '1.5px dashed rgba(255,107,53,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <RiVideoLine size={24} color="#FF6B35" />
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '0 16px' }}>
                                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: '0 0 5px' }}>Tap to select video</p>
                                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0, lineHeight: 1.5 }}>MP4 · WebM · MOV · AVI<br />Max 512MB</p>
                                        </div>
                                        <span style={{ padding: '8px 18px', borderRadius: 999, background: '#FF6B35', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <RiAddLine size={13} /> Choose File
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <video src={videoPreview} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} controls playsInline loop onLoadedMetadata={e => setVideoDuration(Math.round(e.target.duration))} />
                                        <button onClick={() => fileInputRef.current?.click()} style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, padding: '5px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Change</button>
                                        <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, zIndex: 10, padding: '7px 10px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <RiVideoLine size={11} color="#FF6B35" />
                                            <span style={{ color: '#fff', fontSize: 10, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{videoFile?.name}</span>
                                            {videoDuration && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}><RiTimeLine size={10} />{videoDuration}s</span>}
                                        </div>
                                    </>
                                )}
                            </PhoneFrame>
                            {errors.video && <div style={S.errBanner}>{errors.video}</div>}
                            {videoPreview && (
                                <button onClick={goNext} style={{ ...S.primaryBtn, padding: '13px 36px', fontSize: 14 }}>
                                    Continue <RiArrowRightLine size={15} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* ════ STEP 2 ════════════════════════════════════════ */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
                            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textAlign: 'center', margin: 0 }}>
                                Tap <strong style={{ color: '#fff' }}>Aa</strong> to add text. Drag overlays to move them.
                            </p>
                            <PhoneFrame frameRef={frameRef}>
                                <video src={videoPreview} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} playsInline loop muted autoPlay />
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)' }} />
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
                                <button onClick={() => openTextEditor()} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: 12, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 900, zIndex: 20 }}>
                                    Aa
                                </button>
                            </PhoneFrame>

                            {textOverlays.length > 0 && (
                                <div style={{ width: '100%', maxWidth: 280 }}>
                                    <p style={S.smallLabel}>Text Layers ({textOverlays.length})</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
                                        {textOverlays.map(o => (
                                            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: o.textColor, border: '1.5px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                                                <span style={{ flex: 1, color: '#fff', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.text}</span>
                                                <button onClick={() => openTextEditor(o)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 7, padding: '3px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                                                <button onClick={() => removeOverlay(o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex', padding: 2 }}><RiDeleteBinLine size={13} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={goBack} style={S.outlineBtn}>← Back</button>
                                <button onClick={goNext} style={S.primaryBtn}>{textOverlays.length === 0 ? 'Skip' : 'Continue'} <RiArrowRightLine size={14} /></button>
                            </div>
                        </div>
                    )}

                    {/* ════ STEP 3 ════════════════════════════════════════ */}
                    {step === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500, margin: '0 auto' }}>
                            {errors._general && <div style={S.errBanner}>{errors._general}</div>}

                            <SCard title="Title *">
                                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your video a catchy title…" maxLength={100} style={S.inp} autoFocus />
                                <CHint n={title.length} max={100} />
                                {errors.title && <p style={S.errTxt}>{Array.isArray(errors.title) ? errors.title[0] : errors.title}</p>}
                            </SCard>

                            <SCard title="Description">
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell people what your video is about…" maxLength={2200} rows={4} style={{ ...S.inp, resize: 'none', lineHeight: 1.6 }} />
                                <CHint n={description.length} max={2200} />
                            </SCard>

                            <SCard title="Hashtags">
                                <div style={{ position: 'relative' }}>
                                    <RiHashtag size={13} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="fashion trending ootd naija" style={{ ...S.inp, paddingLeft: 30 }} />
                                </div>
                                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '4px 0 0' }}>Space-separated, no # needed</p>
                            </SCard>

                            {products.length > 0 && (
                                <SCard title="Tag Products" badge={taggedIds.length > 0 ? `${taggedIds.length} selected` : null}>
                                    <div style={{ position: 'relative', marginBottom: 8 }}>
                                        <RiPriceTag3Line size={13} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                        <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products…" style={{ ...S.inp, paddingLeft: 30, padding: '10px 14px 10px 30px', fontSize: 12 }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
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

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={goBack} style={S.outlineBtn}>← Back</button>
                                <button onClick={goNext} style={{ ...S.primaryBtn, flex: 1 }}>Review <RiArrowRightLine size={14} /></button>
                            </div>
                        </div>
                    )}

                    {/* ════ STEP 4 ════════════════════════════════════════ */}
                    {step === 4 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                            {errors._general && <div style={{ ...S.errBanner, maxWidth: 560, width: '100%' }}>{errors._general}</div>}

                            {/* Responsive: phone top, summary below on mobile; side by side on desktop */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: 560, alignItems: 'center' }}>

                                {/* Phone preview */}
                                <PhoneFrame frameRef={null} maxWidth={220}>
                                    <video src={videoPreview} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} playsInline loop muted autoPlay />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                                    {textOverlays.map(o => (
                                        <OverlayText key={o.id} overlay={o} interactive={false} />
                                    ))}
                                    <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, zIndex: 10 }}>
                                        {title && <p style={{ color: '#fff', fontWeight: 700, fontSize: 11, margin: '0 0 3px', textShadow: '0 1px 4px rgba(0,0,0,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>}
                                        {hashtags && <p style={{ color: '#FF6B35', fontSize: 10, margin: 0 }}>{hashtags.split(' ').slice(0, 3).map(h => `#${h.replace(/^#/, '')}`).join(' ')}</p>}
                                    </div>
                                </PhoneFrame>

                                {/* Summary — always full width, stacks naturally */}
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <SRow label="Title"       val={title} />
                                    {description && <SRow label="Description" val={`${description.slice(0,100)}${description.length > 100 ? '…' : ''}`} muted />}
                                    {hashtags    && <SRow label="Hashtags"    val={hashtags.split(' ').slice(0,5).map(h=>`#${h.replace(/^#/,'')}`).join(' ')} />}
                                    {videoDuration && <SRow label="Duration"  val={`${videoDuration}s`} />}
                                    {textOverlays.length > 0 && <SRow label="Text Overlays" val={`${textOverlays.length} overlay${textOverlays.length !== 1 ? 's' : ''}`} />}

                                    {/* Tagged products */}
                                    {taggedProducts.length > 0 && (
                                        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px' }}>
                                            <p style={{ ...S.smallLabel, marginBottom: 10 }}>Tagged Products</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {taggedProducts.map(p => (
                                                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 32, height: 32, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
                                                            {p.primary_image && <img src={p.primary_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                        </div>
                                                        <span style={{ flex: 1, color: '#fff', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                                        <span style={{ color: '#FF6B35', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>₦{Number(p.price).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Edit shortcuts */}
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {[['Edit video', 1], ['Edit text', 2], ['Edit details', 3]].map(([l, s]) => (
                                            <button key={l} onClick={() => setStep(s)} style={{ padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', fontSize: 11, cursor: 'pointer' }}>{l}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            {uploading && (
                                <div style={{ width: '100%', maxWidth: 560, background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Uploading…</span>
                                        <span style={{ color: '#FF6B35', fontWeight: 700 }}>{progress}%</span>
                                    </div>
                                    <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#FF6B35,#ff8c00)', borderRadius: 999, transition: 'width 0.3s ease' }} />
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={goBack} style={S.outlineBtn} disabled={uploading}>← Back</button>
                                <button onClick={handleUpload} disabled={uploading} style={{ ...S.primaryBtn, padding: '13px 36px', fontSize: 15 }}>
                                    {uploading ? <><Spinner />{progress}%</> : <><RiUploadCloud2Line size={17} /> Post Video</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ════ Text editor modal ══════════════════════════════════ */}
                {isEditingText && (
                    <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(14px)' }} />
                        <div style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16, overflowY: 'auto' }}>

                            {/* Font style */}
                            <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.06)', padding: 5, borderRadius: 999 }}>
                                {[{ v: 'normal', l: 'Normal' }, { v: 'bold', l: 'Bold' }, { v: 'italic', l: 'Italic' }].map(f => (
                                    <button key={f.v} onClick={() => setFontStyle(f.v)} style={{ padding: '7px 14px', borderRadius: 999, border: 'none', background: fontStyle === f.v ? '#fff' : 'transparent', color: fontStyle === f.v ? '#000' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: f.v === 'bold' ? 800 : 400, fontStyle: f.v === 'italic' ? 'italic' : 'normal', cursor: 'pointer', transition: 'all 0.15s' }}>
                                        {f.l}
                                    </button>
                                ))}
                            </div>

                            {/* Size slider */}
                            <div style={{ width: '100%', maxWidth: 380 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={S.smallLabel}>Size</span>
                                    <span style={{ color: '#FF6B35', fontSize: 12, fontWeight: 700 }}>{fontSize}px</span>
                                </div>
                                <input type="range" min={12} max={56} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} style={{ width: '100%', accentColor: '#FF6B35', cursor: 'pointer' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>Small</span>
                                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>Large</span>
                                </div>
                            </div>

                            {/* Live preview textarea */}
                            <div style={{ width: '100%', maxWidth: 380 }}>
                                <textarea
                                    ref={textInputRef}
                                    value={currentText}
                                    onChange={e => setCurrentText(e.target.value)}
                                    placeholder="Type something…"
                                    rows={3} maxLength={200}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveTextOverlay() } }}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: 14, color: textColor, fontSize: fontSize > 36 ? 36 : fontSize, fontWeight: fontStyle === 'bold' ? 800 : 500, fontStyle: fontStyle === 'italic' ? 'italic' : 'normal', textAlign: 'center', padding: '14px', outline: 'none', resize: 'none', lineHeight: 1.4, boxSizing: 'border-box', fontFamily: 'DM Sans, sans-serif', border: showOutline ? `2.5px solid ${outlineColor}` : '1.5px solid rgba(255,255,255,0.15)' }}
                                />
                                <div style={{ textAlign: 'right', marginTop: 4 }}>
                                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>{currentText.length}/200</span>
                                </div>
                            </div>

                            {/* Text color */}
                            <ColorRow label="Text Color" colors={TEXT_COLORS} selected={textColor} onSelect={setTextColor} />

                            {/* Outline */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={S.smallLabel}>Outline</span>
                                    <button onClick={() => setShowOutline(o => !o)} style={{ width: 40, height: 22, borderRadius: 999, background: showOutline ? '#10B981' : 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.25s' }}>
                                        <span style={{ position: 'absolute', top: 3, left: showOutline ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                                    </button>
                                </div>
                                {showOutline && <ColorRow label="Outline Color" colors={OUTLINE_COLORS} selected={outlineColor} onSelect={setOutlineColor} />}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => { setIsEditingText(false); setCurrentText(''); setEditingId(null) }} style={S.outlineBtn}>Cancel</button>
                                <button onClick={saveTextOverlay} disabled={!currentText.trim()} style={{ ...S.primaryBtn, opacity: currentText.trim() ? 1 : 0.4, cursor: currentText.trim() ? 'pointer' : 'default' }}>
                                    {editingId ? 'Update' : 'Add Text'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                <input ref={fileInputRef} type="file" accept="video/*" onChange={e => handleVideoFile(e.target.files?.[0])} style={{ display: 'none' }} />
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </>
    )
}

Upload.layout = page => <AppLayout>{page}</AppLayout>

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function Spinner() {
    return <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
}

function SCard({ title, badge, children }) {
    return (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{title}</h3>
                {badge && <span style={{ color: '#FF6B35', fontSize: 11, fontWeight: 700 }}>{badge}</span>}
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
        </div>
    )
}

function SRow({ label, val, muted }) {
    return (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 14px' }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>{label}</p>
            <p style={{ color: muted ? 'rgba(255,255,255,0.5)' : '#fff', fontSize: 13, fontWeight: muted ? 400 : 600, margin: 0, wordBreak: 'break-word' }}>{val}</p>
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
    primaryBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 26px', borderRadius: 999, background: '#FF6B35', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
    outlineBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    errBanner:  { padding: '11px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, color: '#EF4444', fontSize: 13, textAlign: 'center' },
    errTxt:     { color: '#EF4444', fontSize: 12, margin: '5px 0 0' },
    smallLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 },
}