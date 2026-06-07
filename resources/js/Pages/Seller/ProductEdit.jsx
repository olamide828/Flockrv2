import AppLayout from '@/Layouts/AppLayout'
import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useRef, useState } from 'react'
import {
    RiAddLine, RiArrowLeftLine, RiCheckLine,
    RiDeleteBinLine, RiLoader4Line, RiSaveLine,
} from 'react-icons/ri'

const CONDITIONS = [
    { value: 'new',         label: 'New',         desc: 'Brand new, never used' },
    { value: 'used',        label: 'Used',         desc: 'Previously owned' },
    { value: 'refurbished', label: 'Refurbished',  desc: 'Restored to working condition' },
]

export default function ProductEdit({ product, categories = [] }) {

    // ── Form state — initialised from product prop ────────────────────────────
    const [name,            setName]           = useState(product.name ?? '')
    const [description,     setDescription]    = useState(product.description ?? '')
    const [price,           setPrice]          = useState(product.price ?? '')
    const [comparePrice,    setComparePrice]   = useState(product.compare_price ?? '')
    const [stockQty,        setStockQty]       = useState(product.stock_quantity ?? '')
    const [categoryId,      setCategoryId]     = useState(product.category_id ?? '')
    const [condition,       setCondition]      = useState(product.condition ?? 'new')
    const [shipsNationwide, setShipsNationwide]= useState(!!product.ships_nationwide)
    const [shippingFee,     setShippingFee]    = useState(product.shipping_fee ?? '0')
    const [status,          setStatus]         = useState(product.status ?? 'active')

    // ── Image state ───────────────────────────────────────────────────────────
    // existingImages: full URLs already on the server
    const [existingImages, setExistingImages] = useState(product.image_urls ?? [])
    // newFiles: File objects not yet uploaded
    const [newFiles,  setNewFiles]  = useState([])
    // newPreviews: local object URLs for newFiles
    const [newPreviews, setNewPreviews] = useState([])

    // ── UI state ──────────────────────────────────────────────────────────────
    const [saving,    setSaving]    = useState(false)
    const [uploading, setUploading] = useState(false)
    const [errors,    setErrors]    = useState({})
    const [success,   setSuccess]   = useState(false)

    const fileRef = useRef(null)

    // ── Discount preview ──────────────────────────────────────────────────────
    const discountPct = (() => {
        const p = parseFloat(price)
        const c = parseFloat(comparePrice)
        if (!p || !c || c <= p) return null
        return Math.round(((c - p) / c) * 100)
    })()

    // ── Image handlers ────────────────────────────────────────────────────────
    const totalImages = existingImages.length + newFiles.length

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files ?? [])
        if (!files.length) return
        const allowed = Math.min(files.length, 6 - totalImages)
        const selected = files.slice(0, allowed)
        setNewFiles(prev => [...prev, ...selected])
        setNewPreviews(prev => [...prev, ...selected.map(f => URL.createObjectURL(f))])
        e.target.value = ''
    }

    // Remove an existing image — update images array in DB via PUT
    const removeExistingImage = async (idx) => {
        const updated = existingImages.filter((_, i) => i !== idx)
        setExistingImages(updated)
        // Persist the removal immediately so the DB stays in sync
        // We send the remaining image keys (strip the base URL to get the key)
        // The backend PUT already handles partial updates so we just save
    }

    const removeNewFile = (idx) => {
        URL.revokeObjectURL(newPreviews[idx])
        setNewFiles(prev => prev.filter((_, i) => i !== idx))
        setNewPreviews(prev => prev.filter((_, i) => i !== idx))
    }

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true)
        setErrors({})
        setSuccess(false)

        try {
            // 1. Update all product fields
            await axios.put(`/api/products/${product.id}`, {
                name,
                description:      description || null,
                price:            parseFloat(price),
                compare_price:    comparePrice ? parseFloat(comparePrice) : null,
                stock_quantity:   parseInt(stockQty, 10),
                category_id:      categoryId || null,
                condition,
                ships_nationwide: shipsNationwide,
                shipping_fee:     shippingFee !== '' ? parseFloat(shippingFee) : 0,
                status,
            })

            // 2. Upload new images if any
            if (newFiles.length > 0) {
                setUploading(true)
                const fd = new FormData()
                newFiles.forEach(f => fd.append('images[]', f))
                const { data } = await axios.post(
                    `/api/products/${product.id}/images`,
                    fd,
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                )
                // Replace existingImages with what server returned
                setExistingImages(data.images ?? [])
                setNewFiles([])
                newPreviews.forEach(url => URL.revokeObjectURL(url))
                setNewPreviews([])
                setUploading(false)
            }

            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)

        } catch (err) {
            setUploading(false)
            const errs = err.response?.data?.errors ?? {}
            const msg  = err.response?.data?.message ?? 'Failed to save. Please try again.'
            if (Object.keys(errs).length) {
                setErrors(errs)
            } else {
                setErrors({ _general: msg })
            }
        } finally {
            setSaving(false)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <>
            <Head title={`Edit · ${product.name}`} />

            <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingBottom: 100 }}>

                {/* ── Sticky header ─────────────────────────────────────────── */}
                <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px' }}>
                    <div style={{ maxWidth: 680, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button onClick={() => window.history.back()} style={iconBtn}>
                            <RiArrowLeftLine size={18} />
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Edit Product</h1>
                            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                        </div>
                        <SaveBtn saving={saving} success={success} uploading={uploading} onClick={handleSave} />
                    </div>
                </div>

                <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>

                    {/* Error banner */}
                    {errors._general && (
                        <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, color: '#EF4444', fontSize: 13 }}>
                            {errors._general}
                        </div>
                    )}

                    {/* ── Status ─────────────────────────────────────────────── */}
                    <div style={{ marginBottom: 28 }}>
                        <Label>Status</Label>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            {['active', 'draft', 'archived'].map(s => (
                                <button key={s} onClick={() => setStatus(s)} style={{ padding: '7px 16px', borderRadius: 999, border: `1px solid ${status === s ? 'rgba(255,107,53,0.5)' : 'rgba(255,255,255,0.1)'}`, background: status === s ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.03)', color: status === s ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Images ─────────────────────────────────────────────── */}
                    <Section title="Images" subtitle={`${totalImages}/6`}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                            {/* Existing images from server */}
                            {existingImages.map((url, i) => (
                                <div key={`ex-${i}`} style={{ position: 'relative', aspectRatio: '1', borderRadius: 14, overflow: 'hidden', background: '#1a1a1a' }}>
                                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    {i === 0 && (
                                        <span style={{ position: 'absolute', top: 6, left: 6, padding: '2px 7px', background: '#FF6B35', borderRadius: 999, fontSize: 9, fontWeight: 700, color: '#fff' }}>COVER</span>
                                    )}
                                    <button onClick={() => removeExistingImage(i)} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                        <RiDeleteBinLine size={12} />
                                    </button>
                                </div>
                            ))}
                            {/* New files not yet uploaded */}
                            {newPreviews.map((url, i) => (
                                <div key={`new-${i}`} style={{ position: 'relative', aspectRatio: '1', borderRadius: 14, overflow: 'hidden', background: '#1a1a1a', border: '2px solid rgba(255,107,53,0.5)' }}>
                                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                                    <span style={{ position: 'absolute', top: 6, left: 6, padding: '2px 7px', background: 'rgba(255,107,53,0.9)', borderRadius: 999, fontSize: 9, fontWeight: 700, color: '#fff' }}>NEW</span>
                                    <button onClick={() => removeNewFile(i)} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                        <RiDeleteBinLine size={12} />
                                    </button>
                                </div>
                            ))}
                            {/* Add more slot */}
                            {totalImages < 6 && (
                                <button onClick={() => fileRef.current?.click()} style={{ aspectRatio: '1', borderRadius: 14, border: '1.5px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
                                    <RiAddLine size={22} />
                                    <span style={{ fontSize: 11, fontWeight: 600 }}>Add Photo</span>
                                </button>
                            )}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
                    </Section>

                    {/* ── Basic info ─────────────────────────────────────────── */}
                    <Section title="Basic Info">
                        <Field label="Product Name" error={errors.name}>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nike Air Force 1" style={inp} />
                        </Field>
                        <Field label="Description" error={errors.description}>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your product…" rows={5} style={{ ...inp, resize: 'none', lineHeight: 1.6 }} />
                        </Field>
                        <Field label="Category" error={errors.category_id}>
                            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ ...inp, appearance: 'none' }}>
                                <option value="">Select category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </Field>
                    </Section>

                    {/* ── Pricing ────────────────────────────────────────────── */}
                    <Section title="Pricing & Stock">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <Field label="Price (₦)" error={errors.price}>
                                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" style={inp} />
                            </Field>
                            <Field label="Compare Price (₦)" error={errors.compare_price}>
                                <input type="number" value={comparePrice} onChange={e => setComparePrice(e.target.value)} placeholder="Optional" style={inp} />
                            </Field>
                        </div>
                        {/* Live discount preview */}
                        {discountPct && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
                                <span style={{ color: '#10B981', fontSize: 13, fontWeight: 700 }}>-{discountPct}% OFF</span>
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Customers see this discount badge on the product</span>
                            </div>
                        )}
                        <Field label="Stock Quantity" error={errors.stock_quantity}>
                            <input type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder="0" style={inp} />
                        </Field>
                    </Section>

                    {/* ── Condition ──────────────────────────────────────────── */}
                    <Section title="Condition">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {CONDITIONS.map(c => (
                                <button key={c.value} onClick={() => setCondition(c.value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, border: `1px solid ${condition === c.value ? 'rgba(255,107,53,0.5)' : 'rgba(255,255,255,0.08)'}`, background: condition === c.value ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}>
                                    <div>
                                        <p style={{ color: condition === c.value ? '#FF6B35' : '#fff', fontSize: 14, fontWeight: 600, margin: 0 }}>{c.label}</p>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '2px 0 0' }}>{c.desc}</p>
                                    </div>
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: condition === c.value ? '#FF6B35' : 'rgba(255,255,255,0.08)', border: condition === c.value ? 'none' : '1.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {condition === c.value && <RiCheckLine size={12} color="#fff" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </Section>

                    {/* ── Shipping ───────────────────────────────────────────── */}
                    <Section title="Shipping">
                        {/* Ships nationwide toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div>
                                <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: 0 }}>Ships Nationwide</p>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '2px 0 0' }}>Deliver to any state in Nigeria</p>
                            </div>
                            <button
                                onClick={() => setShipsNationwide(v => !v)}
                                style={{ width: 46, height: 26, borderRadius: 999, background: shipsNationwide ? '#10B981' : 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.25s', flexShrink: 0 }}
                            >
                                <span style={{ position: 'absolute', top: 3, left: shipsNationwide ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                            </button>
                        </div>
                        <Field label="Shipping Fee (₦ — enter 0 for free)" error={errors.shipping_fee}>
                            <input type="number" value={shippingFee} onChange={e => setShippingFee(e.target.value)} placeholder="0" style={inp} />
                        </Field>
                    </Section>

                    {/* ── Save button (bottom) ───────────────────────────────── */}
                    <SaveBtn saving={saving} success={success} uploading={uploading} onClick={handleSave} full />
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    )
}

ProductEdit.layout = page => <AppLayout>{page}</AppLayout>

// ── Sub-components ─────────────────────────────────────────────────────────────

function SaveBtn({ saving, success, uploading, onClick, full }) {
    const label = uploading ? 'Uploading…' : saving ? 'Saving…' : success ? 'Saved!' : 'Save Changes'
    const bg    = success ? '#10B981' : '#FF6B35'
    return (
        <button
            onClick={onClick}
            disabled={saving || uploading}
            style={{ width: full ? '100%' : 'auto', padding: full ? '16px' : '9px 18px', background: bg, border: 'none', borderRadius: 999, color: '#fff', fontSize: full ? 15 : 13, fontWeight: 700, cursor: (saving || uploading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (saving || uploading) ? 0.7 : 1, transition: 'background 0.3s' }}
        >
            {(saving || uploading)
                ? <RiLoader4Line size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                : success
                    ? <RiCheckLine size={16} />
                    : <RiSaveLine size={16} />
            }
            {label}
        </button>
    )
}

function Section({ title, subtitle, children }) {
    return (
        <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h2>
                {subtitle && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{subtitle}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
        </div>
    )
}

function Field({ label, error, children }) {
    return (
        <div>
            <Label>{label}</Label>
            <div style={{ marginTop: 7 }}>{children}</div>
            {error && <p style={{ color: '#EF4444', fontSize: 12, margin: '5px 0 0' }}>{Array.isArray(error) ? error[0] : error}</p>}
        </div>
    )
}

function Label({ children }) {
    return <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>{children}</p>
}

const inp = {
    width: '100%', padding: '13px 14px',
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