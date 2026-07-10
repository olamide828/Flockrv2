import AppLayout from '@/Layouts/AppLayout'
import { Head, router, usePage } from '@inertiajs/react'
import axios from 'axios'
import { UploadCloud } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import {
    RiAddLine, RiArrowLeftLine, RiArrowRightLine,
    RiCheckLine, RiCloseLine,
    RiDeleteBinLine, RiGlobalLine, RiHashtag,
    RiLockLine, RiPlayCircleLine, RiPriceTag3Line,
    RiTimeLine, RiUploadCloud2Line, RiVideoLine,
} from 'react-icons/ri'

// ── Constants ─────────────────────────────────────────────────────────────────
const COLORS = [
    { hex: '#FFFFFF', label: 'White'  },
    { hex: '#000000', label: 'Black'  },
    { hex: '#FF6B35', label: 'Orange' },
    { hex: '#EF4444', label: 'Red'    },
    { hex: '#FBBF24', label: 'Yellow' },
    { hex: '#3B82F6', label: 'Blue'   },
    { hex: '#10B981', label: 'Green'  },
    { hex: '#8B5CF6', label: 'Purple' },
]

const FONT_SIZES = [16, 20, 24, 30, 36]

const STEPS = [
    { id: 1, label: 'Video',    desc: 'Select & preview'  },
    { id: 2, label: 'Text',     desc: 'Add text overlays' },
    { id: 3, label: 'Details',  desc: 'Title & caption'   },
    { id: 4, label: 'Publish',  desc: 'Review & post'     },
]

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ step }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '20px 0 4px' }}>
            {STEPS.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, transition: 'all 0.3s', background: step > s.id ? '#10B981' : step === s.id ? '#FF6B35' : 'rgba(255,255,255,0.08)', color: step >= s.id ? '#fff' : 'rgba(255,255,255,0.3)', border: step === s.id ? '2px solid rgba(255,107,53,0.4)' : '2px solid transparent' }}>
                            {step > s.id ? <RiCheckLine size={14} /> : s.id}
                        </div>
                        <span style={{ color: step === s.id ? '#FF6B35' : step > s.id ? '#10B981' : 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: step === s.id ? 700 : 400, whiteSpace: 'nowrap' }}>
                            {s.label}
                        </span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div style={{ width: 48, height: 2, background: step > s.id ? '#10B981' : 'rgba(255,255,255,0.08)', margin: '0 4px 16px', transition: 'background 0.3s' }} />
                    )}
                </div>
            ))}
        </div>
    )
}

// ── Phone frame wrapper ───────────────────────────────────────────────────────
function PhoneFrame({ children, style }) {
    return (
        <div style={{ position: 'relative', width: '100%', maxWidth: 280, margin: '0 auto', aspectRatio: '9/16', borderRadius: 28, overflow: 'hidden', background: '#111', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 64px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)', ...style }}>
            {children}
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Upload({ products = [] }) {
    const { auth } = usePage().props

    // ── Step ─────────────────────────────────────────────────────────────────
    const [step, setStep] = useState(1)

    // ── Video file state ──────────────────────────────────────────────────────
    const [videoFile,    setVideoFile]    = useState(null)
    const [videoPreview, setVideoPreview] = useState(null)
    const [thumbnail,    setThumbnail]    = useState(null)
    const [thumbPreview, setThumbPreview] = useState(null)
    const [videoDuration, setVideoDuration] = useState(null) // detected from HTML5 video

    // ── Text overlay state ────────────────────────────────────────────────────
    const [textOverlays,  setTextOverlays]  = useState([])
    const [isEditingText, setIsEditingText] = useState(false)
    const [currentText,   setCurrentText]   = useState('')
    const [selectedColor, setSelectedColor] = useState('#FFFFFF')
    const [selectedSize,  setSelectedSize]  = useState(20)
    const [selectedFont,  setSelectedFont]  = useState('normal') // normal | bold | italic
    const [editingId,     setEditingId]     = useState(null)     // null = new, id = editing existing

    // ── Form / meta state ─────────────────────────────────────────────────────
    const [title,          setTitle]         = useState('')
    const [description,    setDescription]   = useState('')
    const [hashtags,       setHashtags]      = useState('')
    const [visibility,     setVisibility]    = useState('public')
    const [taggedIds,      setTaggedIds]     = useState([])
    const [productSearch,  setProductSearch] = useState('')

    // ── Upload state ──────────────────────────────────────────────────────────
    const [uploading,  setUploading]  = useState(false)
    const [progress,   setProgress]   = useState(0)
    const [errors,     setErrors]     = useState({})
    const [done,       setDone]       = useState(false)

    // ── Refs ──────────────────────────────────────────────────────────────────
    const fileInputRef  = useRef(null)
    const thumbInputRef = useRef(null)
    const videoRef      = useRef(null)
    const textInputRef  = useRef(null)

    // ── File validation (original logic preserved) ────────────────────────────
    const handleVideoFile = useCallback((file) => {
        if (!file) return
        const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
        if (!validTypes.includes(file.type)) {
            setErrors(e => ({ ...e, video: 'Please upload a valid video file (MP4, WebM, MOV, AVI)' }))
            return
        }
        if (file.size > 512 * 1024 * 1024) {
            setErrors(e => ({ ...e, video: 'Video must be less than 512MB' }))
            return
        }
        setErrors(e => { const n = { ...e }; delete n.video; return n })
        setVideoFile(file)
        const url = URL.createObjectURL(file)
        setVideoPreview(url)
    }, [])

    const handleDrop = useCallback((e) => {
        e.preventDefault()
        handleVideoFile(e.dataTransfer.files?.[0])
    }, [handleVideoFile])

    const handleThumbFile = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setThumbnail(file)
        setThumbPreview(URL.createObjectURL(file))
    }

    // ── Text overlay handlers ─────────────────────────────────────────────────
    const openTextEditor = (overlay = null) => {
        if (overlay) {
            setEditingId(overlay.id)
            setCurrentText(overlay.text)
            setSelectedColor(overlay.color)
            setSelectedSize(overlay.size)
            setSelectedFont(overlay.font)
        } else {
            setEditingId(null)
            setCurrentText('')
            setSelectedColor('#FFFFFF')
            setSelectedSize(20)
            setSelectedFont('normal')
        }
        setIsEditingText(true)
        setTimeout(() => textInputRef.current?.focus(), 100)
    }

    const saveTextOverlay = () => {
        if (!currentText.trim()) { setIsEditingText(false); return }
        const overlay = {
            id:    editingId ?? Date.now(),
            text:  currentText.trim(),
            color: selectedColor,
            size:  selectedSize,
            font:  selectedFont,
            top:   40,   // initial y%
            left:  10,   // initial x%
        }
        if (editingId) {
            setTextOverlays(prev => prev.map(o => o.id === editingId ? overlay : o))
        } else {
            // Offset new overlays so they don't stack
            overlay.top = 20 + (textOverlays.length * 12)
            overlay.left = 10
            setTextOverlays(prev => [...prev, overlay])
        }
        setCurrentText('')
        setIsEditingText(false)
        setEditingId(null)
    }

    const removeOverlay = (id) => setTextOverlays(prev => prev.filter(o => o.id !== id))

    // ── Product tagging ───────────────────────────────────────────────────────
    const toggleProduct = (id) => setTaggedIds(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    )

    // ── Step navigation ───────────────────────────────────────────────────────
    const goNext = () => {
        if (step === 1 && !videoFile) {
            setErrors({ video: 'Please select a video first' })
            return
        }
        if (step === 3 && !title.trim()) {
            setErrors({ title: 'Please add a title' })
            return
        }
        setErrors({})
        setStep(s => Math.min(s + 1, 4))
    }

    const goBack = () => setStep(s => Math.max(s - 1, 1))

    // ── Upload (original axios logic preserved exactly) ───────────────────────
    const handleUpload = async () => {
        if (!videoFile) { setErrors({ video: 'Please select a video' }); return }
        if (!title.trim()) { setErrors({ title: 'Title is required' }); return }

        setUploading(true)
        setErrors({})
        setProgress(0)

        const formData = new FormData()
        formData.append('video',                 videoFile)
        formData.append('title',                 title.trim())
        formData.append('description',           description.trim())
        formData.append('hashtags',              hashtags)
        formData.append('visibility',            visibility)
        formData.append('tagged_product_ids',    JSON.stringify(taggedIds))
        formData.append('text_overlays',         JSON.stringify(textOverlays))
        if (thumbnail) formData.append('thumbnail', thumbnail)
        if (videoDuration) formData.append('duration_seconds', videoDuration)

        try {
            await axios.post('/api/videos/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
                },
            })
            setDone(true)
            setTimeout(() => router.visit('/seller/dashboard'), 2200)
        } catch (err) {
            const errData = err.response?.data
            if (errData?.errors) {
                setErrors(errData.errors)
            } else {
                setErrors({ _general: errData?.message ?? 'Upload failed. Please try again.' })
            }
            setStep(errData?.errors?.video ? 1 : 3)
        } finally {
            setUploading(false)
        }
    }

    // ── Success screen ────────────────────────────────────────────────────────
    if (done) {
        return (
            <>
                <Head title="Uploaded!" />
                <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pop 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
                        <RiCheckLine size={36} color="#10B981" />
                    </div>
                    <p style={{ color: '#fff', fontWeight: 800, fontSize: 24, margin: 0, letterSpacing: '-0.5px' }}>Video uploaded!</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>Redirecting to your dashboard…</p>
                    <div style={{ height: 3, width: 160, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
                        <div style={{ height: '100%', background: '#FF6B35', borderRadius: 999, animation: 'fill 2.2s linear forwards' }} />
                    </div>
                </div>
                <style>{`
                    @keyframes pop  { 0%{transform:scale(0.3);opacity:0} 100%{transform:scale(1);opacity:1} }
                    @keyframes fill { 0%{width:0%} 100%{width:100%} }
                `}</style>
            </>
        )
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <Head title="Upload Video" />

            <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>

                {/* ── Header ──────────────────────────────────────────────── */}
                <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px' }}>
                    <div style={{ maxWidth: 900, margin: '0 auto', height: 58, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button onClick={() => step === 1 ? router.visit('/seller/dashboard') : goBack()} style={iconBtn}>
                            <RiArrowLeftLine size={18} />
                        </button>
                        <div style={{ flex: 1 }}>
                            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Upload Video</h1>
                            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{STEPS[step - 1]?.desc}</p>
                        </div>
                        {step < 4 ? (
                            <button onClick={goNext} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 999, background: step === 1 && !videoFile ? 'rgba(255,255,255,0.06)' : '#FF6B35', border: 'none', color: step === 1 && !videoFile ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: 13, fontWeight: 700, cursor: step === 1 && !videoFile ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                                {step === 3 ? 'Review' : 'Continue'} <RiArrowRightLine size={14} />
                            </button>
                        ) : (
                            <button onClick={handleUpload} disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 999, background: uploading ? 'rgba(255,107,53,0.5)' : '#FF6B35', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer' }}>
                                {uploading ? <><Spinner size={14} />{progress}%</> : <><UploadCloud size={15} /> Post</>}
                            </button>
                        )}
                    </div>
                </header>

                {/* ── Step bar ─────────────────────────────────────────────── */}
                <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
                    <StepBar step={step} />
                </div>

                {/* ── Step content ─────────────────────────────────────────── */}
                <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 20px 100px' }}>

                    {/* ════ STEP 1 — Select Video ════════════════════════════ */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                            <PhoneFrame>
                                {!videoPreview ? (
                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={e => e.preventDefault()}
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, cursor: 'pointer', background: 'radial-gradient(ellipse at center, rgba(255,107,53,0.06) 0%, transparent 70%)' }}
                                    >
                                        <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,107,53,0.1)', border: '1.5px dashed rgba(255,107,53,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <RiVideoLine size={26} color="#FF6B35" />
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '0 20px' }}>
                                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 6px' }}>Tap to select video</p>
                                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0, lineHeight: 1.5 }}>MP4 · WebM · MOV · AVI<br />Max 512MB</p>
                                        </div>
                                        <div style={{ padding: '9px 20px', borderRadius: 999, background: '#FF6B35', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <RiAddLine size={14} /> Choose File
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <video
                                            ref={videoRef}
                                            src={videoPreview}
                                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                            controls playsInline loop
                                            onLoadedMetadata={e => setVideoDuration(Math.round(e.target.duration))}
                                        />
                                        {/* Replace button */}
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, padding: '6px 12px', borderRadius: 999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Change
                                        </button>
                                        {/* File info */}
                                        <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, zIndex: 10, padding: '8px 10px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <RiVideoLine size={12} color="#FF6B35" />
                                            <span style={{ color: '#fff', fontSize: 11, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{videoFile?.name}</span>
                                            {videoDuration && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}><RiTimeLine size={10} />{videoDuration}s</span>}
                                        </div>
                                    </>
                                )}
                            </PhoneFrame>

                            {errors.video && (
                                <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, color: '#EF4444', fontSize: 13, textAlign: 'center' }}>
                                    {errors.video}
                                </div>
                            )}

                            {/* Custom thumbnail */}
                            {videoPreview && (
                                <div style={{ width: '100%', maxWidth: 280 }}>
                                    <p style={label}>Custom Cover (Optional)</p>
                                    <button onClick={() => thumbInputRef.current?.click()} style={{ width: '100%', height: 48, borderRadius: 12, border: '1.5px dashed rgba(255,255,255,0.12)', background: thumbPreview ? 'none' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, overflow: 'hidden', padding: 0 }}>
                                        {thumbPreview ? <img src={thumbPreview} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <><RiAddLine size={14} /> Add cover image</>}
                                    </button>
                                    <input ref={thumbInputRef} type="file" accept="image/*" onChange={handleThumbFile} style={{ display: 'none' }} />
                                </div>
                            )}

                            {videoPreview && (
                                <button onClick={goNext} style={{ padding: '14px 40px', borderRadius: 999, background: '#FF6B35', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    Continue <RiArrowRightLine size={16} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* ════ STEP 2 — Text Overlays ═══════════════════════════ */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', margin: 0 }}>
                                Add text that appears over your video. Tap an overlay to edit it.
                            </p>

                            <PhoneFrame>
                                {/* Video background */}
                                <video
                                    src={videoPreview}
                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                    playsInline loop muted autoPlay
                                />
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)' }} />

                                {/* Text overlays */}
                                {textOverlays.map(overlay => (
                                    <div
                                        key={overlay.id}
                                        onClick={() => openTextEditor(overlay)}
                                        style={{ position: 'absolute', top: `${overlay.top}%`, left: `${overlay.left}%`, zIndex: 10, cursor: 'pointer', maxWidth: '80%' }}
                                    >
                                        <span style={{ color: overlay.color, fontSize: overlay.size, fontWeight: overlay.font === 'bold' ? 800 : 500, fontStyle: overlay.font === 'italic' ? 'italic' : 'normal', textShadow: '0 2px 8px rgba(0,0,0,0.9)', display: 'block', lineHeight: 1.3, wordBreak: 'break-word', WebkitTextStroke: overlay.color === '#FFFFFF' ? '0px' : '0px' }}>
                                            {overlay.text}
                                        </span>
                                    </div>
                                ))}

                                {/* Floating action bar */}
                                <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 20 }}>
                                    <button onClick={() => openTextEditor()} style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 900 }}>
                                        Aa
                                    </button>
                                    {textOverlays.length > 0 && (
                                        <button onClick={() => setTextOverlays([])} style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.2)', backdropFilter: 'blur(12px)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <RiDeleteBinLine size={16} color="#EF4444" />
                                        </button>
                                    )}
                                </div>
                            </PhoneFrame>

                            {/* Overlay list for managing */}
                            {textOverlays.length > 0 && (
                                <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <p style={label}>Text Layers ({textOverlays.length})</p>
                                    {textOverlays.map((o, i) => (
                                        <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: o.color, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                                            <span style={{ flex: 1, color: '#fff', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.text}</span>
                                            <button onClick={() => openTextEditor(o)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: '4px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                                            <button onClick={() => removeOverlay(o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.6)', display: 'flex', padding: 4 }}>
                                                <RiCloseLine size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={goBack} style={outlineBtn}>← Back</button>
                                <button onClick={goNext} style={primaryBtn}>
                                    {textOverlays.length === 0 ? 'Skip' : 'Continue'} <RiArrowRightLine size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ════ STEP 3 — Details ════════════════════════════════ */}
                    {step === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 520, margin: '0 auto' }}>

                            {errors._general && <ErrorBanner msg={errors._general} />}

                            {/* Title */}
                            <Card title="Title *">
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Give your video a catchy title…"
                                    maxLength={100}
                                    style={inp}
                                    autoFocus
                                />
                                <div style={{ textAlign: 'right', marginTop: 4 }}>
                                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>{title.length}/100</span>
                                </div>
                                {errors.title && <p style={errTxt}>{Array.isArray(errors.title) ? errors.title[0] : errors.title}</p>}
                            </Card>

                            {/* Description */}
                            <Card title="Description">
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell people what your video is about…" maxLength={2200} rows={4} style={{ ...inp, resize: 'none', lineHeight: 1.6 }} />
                                <div style={{ textAlign: 'right', marginTop: 4 }}>
                                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>{description.length}/2200</span>
                                </div>
                            </Card>

                            {/* Hashtags */}
                            <Card title="Hashtags">
                                <div style={{ position: 'relative' }}>
                                    <RiHashtag size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="fashion trending ootd" style={{ ...inp, paddingLeft: 32 }} />
                                </div>
                                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '4px 0 0' }}>Space-separated, no # needed</p>
                            </Card>

                            {/* Visibility */}
                            <Card title="Visibility">
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {[
                                        { value: 'public',  label: 'Public',  Icon: RiGlobalLine, desc: 'Everyone' },
                                        { value: 'private', label: 'Private', Icon: RiLockLine,   desc: 'Only you' },
                                    ].map(v => (
                                        <button key={v.value} onClick={() => setVisibility(v.value)} style={{ flex: 1, padding: '12px 10px', borderRadius: 12, border: `1px solid ${visibility === v.value ? 'rgba(255,107,53,0.5)' : 'rgba(255,255,255,0.08)'}`, background: visibility === v.value ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                                <v.Icon size={13} color={visibility === v.value ? '#FF6B35' : 'rgba(255,255,255,0.4)'} />
                                                <span style={{ color: visibility === v.value ? '#FF6B35' : '#fff', fontSize: 13, fontWeight: 600 }}>{v.label}</span>
                                            </div>
                                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>{v.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </Card>

                            {/* Tag products */}
                            {products.length > 0 && (
                                <Card title="Tag Products" subtitle={taggedIds.length > 0 ? `${taggedIds.length} selected` : undefined}>
                                    <div style={{ position: 'relative', marginBottom: 10 }}>
                                        <RiPriceTag3Line size={13} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                        <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products…" style={{ ...inp, paddingLeft: 30, height: 38, fontSize: 12 }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                                        {filteredProducts.map(product => {
                                            const tagged = taggedIds.includes(product.id)
                                            return (
                                                <button key={product.id} onClick={() => toggleProduct(product.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: `1px solid ${tagged ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.07)'}`, background: tagged ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}>
                                                    <div style={{ width: 38, height: 38, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
                                                        {product.primary_image && <img src={product.primary_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                                                        <p style={{ color: '#FF6B35', fontSize: 12, fontWeight: 700, margin: '2px 0 0' }}>₦{Number(product.price).toLocaleString()}</p>
                                                    </div>
                                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: tagged ? '#FF6B35' : 'rgba(255,255,255,0.08)', border: tagged ? 'none' : '1.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        {tagged && <RiCheckLine size={11} color="#fff" />}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </Card>
                            )}

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={goBack} style={outlineBtn}>← Back</button>
                                <button onClick={goNext} style={{ ...primaryBtn, flex: 1 }}>Review <RiArrowRightLine size={14} /></button>
                            </div>
                        </div>
                    )}

                    {/* ════ STEP 4 — Review & Post ══════════════════════════ */}
                    {step === 4 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                            {errors._general && <ErrorBanner msg={errors._general} />}

                            {/* Side by side: phone + summary */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, width: '100%', maxWidth: 640, alignItems: 'start' }} className="review-grid">

                                {/* Preview */}
                                <PhoneFrame>
                                    <video src={videoPreview} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} playsInline loop muted autoPlay />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                                    {textOverlays.map(overlay => (
                                        <span key={overlay.id} style={{ position: 'absolute', top: `${overlay.top}%`, left: `${overlay.left}%`, color: overlay.color, fontSize: overlay.size, fontWeight: overlay.font === 'bold' ? 800 : 500, fontStyle: overlay.font === 'italic' ? 'italic' : 'normal', textShadow: '0 2px 8px rgba(0,0,0,0.9)', zIndex: 10, maxWidth: '80%', wordBreak: 'break-word' }}>
                                            {overlay.text}
                                        </span>
                                    ))}
                                    {/* Bottom info */}
                                    <div style={{ position: 'absolute', bottom: 12, left: 10, right: 10, zIndex: 10 }}>
                                        {title && <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: '0 0 3px', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{title}</p>}
                                        {hashtags && <p style={{ color: '#FF6B35', fontSize: 11, margin: 0 }}>{hashtags.split(' ').slice(0, 3).map(h => `#${h.replace('#', '')}`).join(' ')}</p>}
                                    </div>
                                </PhoneFrame>

                                {/* Summary card */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={summaryCard}>
                                        <p style={summaryLabel}>Title</p>
                                        <p style={summaryVal}>{title}</p>
                                    </div>
                                    {description && (
                                        <div style={summaryCard}>
                                            <p style={summaryLabel}>Description</p>
                                            <p style={{ ...summaryVal, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{description.slice(0, 120)}{description.length > 120 ? '…' : ''}</p>
                                        </div>
                                    )}
                                    <div style={summaryCard}>
                                        <p style={summaryLabel}>Visibility</p>
                                        <p style={summaryVal}>{visibility === 'public' ? '🌍 Public' : '🔒 Private'}</p>
                                    </div>
                                    {textOverlays.length > 0 && (
                                        <div style={summaryCard}>
                                            <p style={summaryLabel}>Text Overlays</p>
                                            <p style={summaryVal}>{textOverlays.length} overlay{textOverlays.length !== 1 ? 's' : ''}</p>
                                        </div>
                                    )}
                                    {taggedIds.length > 0 && (
                                        <div style={summaryCard}>
                                            <p style={summaryLabel}>Tagged Products</p>
                                            <p style={summaryVal}>{taggedIds.length} product{taggedIds.length !== 1 ? 's' : ''}</p>
                                        </div>
                                    )}
                                    {videoDuration && (
                                        <div style={summaryCard}>
                                            <p style={summaryLabel}>Duration</p>
                                            <p style={summaryVal}>{videoDuration}s</p>
                                        </div>
                                    )}

                                    {/* Edit shortcuts */}
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {[
                                            { label: 'Edit video',   onClick: () => setStep(1) },
                                            { label: 'Edit text',    onClick: () => setStep(2) },
                                            { label: 'Edit details', onClick: () => setStep(3) },
                                        ].map(a => (
                                            <button key={a.label} onClick={a.onClick} style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                                {a.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Upload progress */}
                            {uploading && (
                                <div style={{ width: '100%', maxWidth: 640, background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 18px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Uploading…</span>
                                        <span style={{ color: '#FF6B35', fontWeight: 700 }}>{progress}%</span>
                                    </div>
                                    <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #FF6B35, #ff8c00)', borderRadius: 999, transition: 'width 0.3s ease' }} />
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={goBack} style={outlineBtn} disabled={uploading}>← Back</button>
                                <button onClick={handleUpload} disabled={uploading} style={{ ...primaryBtn, padding: '13px 40px', fontSize: 15 }}>
                                    {uploading ? <><Spinner size={16} />{progress}%</> : <><UploadCloud size={18} /> Post Video</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ════ Text editing modal ══════════════════════════════════ */}
                {isEditingText && (
                    <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }} />
                        <div style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 20 }}>

                            {/* Font style */}
                            <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.06)', padding: 6, borderRadius: 999 }}>
                                {[
                                    { value: 'normal', label: 'Normal' },
                                    { value: 'bold',   label: 'Bold',   style: { fontWeight: 800 } },
                                    { value: 'italic', label: 'Italic', style: { fontStyle: 'italic' } },
                                ].map(f => (
                                    <button key={f.value} onClick={() => setSelectedFont(f.value)} style={{ padding: '7px 16px', borderRadius: 999, border: 'none', background: selectedFont === f.value ? '#fff' : 'transparent', color: selectedFont === f.value ? '#000' : 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', ...f.style }}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {/* Size selector */}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Size</span>
                                {FONT_SIZES.map(s => (
                                    <button key={s} onClick={() => setSelectedSize(s)} style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${selectedSize === s ? '#FF6B35' : 'rgba(255,255,255,0.15)'}`, background: selectedSize === s ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.04)', color: selectedSize === s ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                                        {s}
                                    </button>
                                ))}
                            </div>

                            {/* Text input */}
                            <div style={{ width: '100%', maxWidth: 420 }}>
                                <textarea
                                    ref={textInputRef}
                                    value={currentText}
                                    onChange={e => setCurrentText(e.target.value)}
                                    placeholder="Type something…"
                                    rows={3}
                                    maxLength={200}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveTextOverlay() } }}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 16, color: selectedColor, fontSize: selectedSize, fontWeight: selectedFont === 'bold' ? 800 : 500, fontStyle: selectedFont === 'italic' ? 'italic' : 'normal', textAlign: 'center', padding: '16px', outline: 'none', resize: 'none', lineHeight: 1.4, boxSizing: 'border-box', textShadow: '0 2px 8px rgba(0,0,0,0.8)', fontFamily: 'DM Sans, sans-serif' }}
                                />
                                <div style={{ textAlign: 'right', marginTop: 4 }}>
                                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>{currentText.length}/200</span>
                                </div>
                            </div>

                            {/* Color palette */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', padding: '10px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)' }}>
                                {COLORS.map(c => (
                                    <button key={c.hex} onClick={() => setSelectedColor(c.hex)} title={c.label} style={{ width: selectedColor === c.hex ? 30 : 24, height: selectedColor === c.hex ? 30 : 24, borderRadius: '50%', background: c.hex, border: selectedColor === c.hex ? '3px solid #FF6B35' : '2px solid rgba(255,255,255,0.15)', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }} />
                                ))}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button onClick={() => { setIsEditingText(false); setCurrentText(''); setEditingId(null) }} style={outlineBtn}>Cancel</button>
                                <button onClick={saveTextOverlay} disabled={!currentText.trim()} style={{ ...primaryBtn, opacity: currentText.trim() ? 1 : 0.4, cursor: currentText.trim() ? 'pointer' : 'default' }}>
                                    {editingId ? 'Update' : 'Add Text'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Hidden inputs */}
                <input ref={fileInputRef} type="file" accept="video/*" onChange={e => handleVideoFile(e.target.files?.[0])} style={{ display: 'none' }} />
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @media (max-width: 600px) {
                    .review-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </>
    )
}

Upload.layout = page => <AppLayout>{page}</AppLayout>

// ── Micro-components ──────────────────────────────────────────────────────────
function Spinner({ size = 16 }) {
    return <div style={{ width: size, height: size, border: `2px solid rgba(255,255,255,0.25)`, borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
}

function Card({ title, subtitle, children }) {
    return (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{title}</h3>
                {subtitle && <span style={{ color: '#FF6B35', fontSize: 12, fontWeight: 600 }}>{subtitle}</span>}
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
        </div>
    )
}

function ErrorBanner({ msg }) {
    return (
        <div style={{ width: '100%', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, color: '#EF4444', fontSize: 13, textAlign: 'center' }}>
            {msg}
        </div>
    )
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inp = {
    width: '100%', padding: '12px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#fff', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'DM Sans, sans-serif',
}

const iconBtn = {
    width: 36, height: 36, borderRadius: 10,
    background: 'rgba(255,255,255,0.06)', border: 'none',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#fff', flexShrink: 0,
}

const primaryBtn = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '12px 28px', borderRadius: 999, background: '#FF6B35',
    border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
}

const outlineBtn = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '12px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
}

const label = { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }
const errTxt = { color: '#EF4444', fontSize: 12, margin: '5px 0 0' }

const summaryCard = { background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px' }
const summaryLabel = { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }
const summaryVal = { color: '#fff', fontSize: 14, fontWeight: 600, margin: 0 }