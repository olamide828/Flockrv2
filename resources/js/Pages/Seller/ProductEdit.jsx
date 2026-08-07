import AppLayout from '@/Layouts/AppLayout'
import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useRef, useState } from 'react'
import {
    RiAddLine, RiArrowLeftLine, RiCheckLine,
    RiDeleteBinLine, RiLoader4Line, RiSaveLine,
    RiPriceTag3Line,
} from 'react-icons/ri'

const COMMISSION_RATE = 0.05

const CONDITIONS = [
    { value: 'new',         label: 'New',         desc: 'Brand new, never used' },
    { value: 'used',        label: 'Used',         desc: 'Previously owned' },
    { value: 'refurbished', label: 'Refurbished',  desc: 'Restored to working condition' },
]

const VARIANT_PRESETS = ['Size', 'Color', 'Material', 'Weight', 'Style']

export default function ProductEdit({ product, categories = [] }) {

    // ── Derive seller_price from product ──────────────────────────────────────
    // product.seller_price is what seller receives (stored after commission calc)
    // If seller_price not yet on product (old listing), back-calculate from price
    const initialSellerPrice = product.seller_price
        ? String(Math.round(Number(product.seller_price)))
        : product.price
            ? String(Math.round(Number(product.price) * (1 - COMMISSION_RATE)))
            : ''

    // ── Form state ────────────────────────────────────────────────────────────
    const [name,            setName]            = useState(product.name ?? '')
    const [description,     setDescription]     = useState(product.description ?? '')
    const [sellerPrice,     setSellerPrice]     = useState(initialSellerPrice)
    const [comparePrice,    setComparePrice]    = useState(product.compare_price ?? '')
    const [stockQty,        setStockQty]        = useState(product.stock_quantity ?? '')
    const [categoryId,      setCategoryId]      = useState(product.category_id ?? '')
    const [condition,       setCondition]       = useState(product.condition ?? 'new')
    const [shipsNationwide, setShipsNationwide] = useState(!!product.ships_nationwide)
    const [shippingFee,     setShippingFee]     = useState(product.shipping_fee ?? '0')
    const [status,          setStatus]          = useState(product.status ?? 'active')

    // ── Attributes/variants ───────────────────────────────────────────────────
    // Normalise stored attributes → array of { key, value } pairs
    const initialAttrs = (() => {
        const raw = product.attributes
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [{ key: '', value: '' }]
        const entries = Object.entries(raw)
        return entries.length > 0
            ? entries.map(([key, val]) => ({ key, value: Array.isArray(val) ? val.join(', ') : String(val ?? '') }))
            : [{ key: '', value: '' }]
    })()
    const [attributes, setAttributes] = useState(initialAttrs)

    const setAttr    = (i, field, val) => setAttributes(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a))
    const addAttr    = (key = '') => setAttributes(prev => [...prev, { key, value: '' }])
    const removeAttr = (i) => setAttributes(prev => prev.filter((_, idx) => idx !== i))

    // Build object for API — parse comma-separated values into arrays
    const attributesObject = Object.fromEntries(
        attributes
            .filter(a => a.key.trim())
            .map(a => {
                const parts = a.value.split(',').map(v => v.trim()).filter(Boolean)
                return [a.key.trim(), parts.length > 1 ? parts : (parts[0] ?? '')]
            })
    )

    // ── Image state ───────────────────────────────────────────────────────────
    const [existingImages, setExistingImages] = useState(product.image_urls ?? [])
    const [newFiles,       setNewFiles]       = useState([])
    const [newPreviews,    setNewPreviews]    = useState([])

    // ── UI state ──────────────────────────────────────────────────────────────
    const [saving,    setSaving]    = useState(false)
    const [uploading, setUploading] = useState(false)
    const [errors,    setErrors]    = useState({})
    const [success,   setSuccess]   = useState(false)

    const fileRef = useRef(null)

    // ── Commission preview ────────────────────────────────────────────────────
    const receives    = Number(sellerPrice) || 0
    const listedPrice = receives > 0 ? Math.ceil(receives / (1 - COMMISSION_RATE)) : 0
    const flockrFee   = listedPrice - receives

    // ── Discount preview ──────────────────────────────────────────────────────
    const discountPct = (() => {
        const l = listedPrice
        const c = parseFloat(comparePrice)
        if (!l || !c || c <= l) return null
        return Math.round(((c - l) / c) * 100)
    })()

    // ── Image handlers ────────────────────────────────────────────────────────
    const totalImages = existingImages.length + newFiles.length

    const handleFileSelect = (e) => {
        const files   = Array.from(e.target.files ?? [])
        const allowed = Math.min(files.length, 6 - totalImages)
        const selected = files.slice(0, allowed)
        setNewFiles(prev    => [...prev, ...selected])
        setNewPreviews(prev => [...prev, ...selected.map(f => URL.createObjectURL(f))])
        e.target.value = ''
    }

    const removeExistingImage = (idx) => setExistingImages(prev => prev.filter((_, i) => i !== idx))

    const removeNewFile = (idx) => {
        URL.revokeObjectURL(newPreviews[idx])
        setNewFiles(prev    => prev.filter((_, i) => i !== idx))
        setNewPreviews(prev => prev.filter((_, i) => i !== idx))
    }

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true)
        setErrors({})
        setSuccess(false)

        try {
            // 1. Update product fields — send seller_price, backend computes listed price
            await axios.put(`/api/products/${product.id}`, {
                name,
                description:      description || null,
                seller_price:     parseFloat(sellerPrice),
                compare_price:    comparePrice ? parseFloat(comparePrice) : null,
                stock_quantity:   parseInt(stockQty, 10),
                category_id:      categoryId || null,
                condition,
                ships_nationwide: shipsNationwide,
                shipping_fee:     shippingFee !== '' ? parseFloat(shippingFee) : 0,
                status,
                attributes:       attributesObject,
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
            setErrors(Object.keys(errs).length ? errs : { _general: msg })
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <Head title={`Edit · ${product.name}`} />

            <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingBottom: 100 }}>

                {/* ── Sticky header ─────────────────────────────────────── */}
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

                    {/* ── Status ───────────────────────────────────────────── */}
                    <div style={{ marginBottom: 28 }}>
                        <Label>Status</Label>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            {['active', 'draft', 'archived'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatus(s)}
                                    style={{ padding: '7px 16px', borderRadius: 999, border: `1px solid ${status === s ? 'rgba(255,107,53,0.5)' : 'rgba(255,255,255,0.1)'}`, background: status === s ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.03)', color: status === s ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Images ───────────────────────────────────────────── */}
                    <Section title="Images" subtitle={`${totalImages}/6`}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                            {existingImages.map((url, i) => (
                                <div key={`ex-${i}`} style={{ position: 'relative', aspectRatio: '1', borderRadius: 14, overflow: 'hidden', background: '#1a1a1a' }}>
                                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    {i === 0 && (
                                        <span style={{ position: 'absolute', top: 6, left: 6, padding: '2px 7px', background: '#FF6B35', borderRadius: 999, fontSize: 9, fontWeight: 700, color: '#fff' }}>COVER</span>
                                    )}
                                    <button
                                        onClick={() => removeExistingImage(i)}
                                        style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                                    >
                                        <RiDeleteBinLine size={12} />
                                    </button>
                                </div>
                            ))}
                            {newPreviews.map((url, i) => (
                                <div key={`new-${i}`} style={{ position: 'relative', aspectRatio: '1', borderRadius: 14, overflow: 'hidden', background: '#1a1a1a', border: '2px solid rgba(255,107,53,0.5)' }}>
                                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                                    <span style={{ position: 'absolute', top: 6, left: 6, padding: '2px 7px', background: 'rgba(255,107,53,0.9)', borderRadius: 999, fontSize: 9, fontWeight: 700, color: '#fff' }}>NEW</span>
                                    <button
                                        onClick={() => removeNewFile(i)}
                                        style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                                    >
                                        <RiDeleteBinLine size={12} />
                                    </button>
                                </div>
                            ))}
                            {totalImages < 6 && (
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    style={{ aspectRatio: '1', borderRadius: 14, border: '1.5px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
                                >
                                    <RiAddLine size={22} />
                                    <span style={{ fontSize: 11, fontWeight: 600 }}>Add Photo</span>
                                </button>
                            )}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
                    </Section>

                    {/* ── Basic info ───────────────────────────────────────── */}
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

                    {/* ── Pricing & Stock ──────────────────────────────────── */}
                    <Section title="Pricing & Stock">

                        {/* Commission calculator */}
                        {receives > 0 && (
                            <div style={{ padding: '12px 14px', background: 'rgba(255,92,0,0.06)', border: '1px solid rgba(255,92,0,0.18)', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <RiPriceTag3Line size={13} color="#ff5c00" />
                                        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>Listed in shop for</span>
                                    </div>
                                    <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>₦{listedPrice.toLocaleString()}</span>
                                </div>
                                <div style={{ borderTop: '1px solid rgba(255,92,0,0.12)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <PriceRow label="You receive"       value={`₦${receives.toLocaleString()}`}    color="#10B981" />
                                    <PriceRow label="Flockr fee (5%)"   value={`−₦${flockrFee.toLocaleString()}`}  color="rgba(255,255,255,0.3)" />
                                </div>
                                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, margin: 0, lineHeight: 1.5 }}>
                                    The 5% is added on top — you always receive what you enter below.
                                </p>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <Field label="Your Price (₦)" error={errors.seller_price}>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 14, pointerEvents: 'none' }}>₦</span>
                                    <input
                                        type="number"
                                        value={sellerPrice}
                                        onChange={e => setSellerPrice(e.target.value)}
                                        placeholder="5,000"
                                        min="1"
                                        style={{ ...inp, paddingLeft: 28 }}
                                    />
                                </div>
                                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, margin: '4px 0 0' }}>Amount you want to receive</p>
                            </Field>
                            <Field label="Compare Price (₦)" error={errors.compare_price}>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)', fontSize: 14, pointerEvents: 'none', textDecoration: 'line-through' }}>₦</span>
                                    <input
                                        type="number"
                                        value={comparePrice}
                                        onChange={e => setComparePrice(e.target.value)}
                                        placeholder="Optional"
                                        style={{ ...inp, paddingLeft: 28 }}
                                    />
                                </div>
                            </Field>
                        </div>

                        {discountPct && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
                                <span style={{ color: '#10B981', fontSize: 13, fontWeight: 700 }}>-{discountPct}% OFF</span>
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Customers see this discount badge</span>
                            </div>
                        )}

                        <Field label="Stock Quantity" error={errors.stock_quantity}>
                            <input type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder="0" style={inp} />
                        </Field>
                    </Section>

                    {/* ── Variants & Attributes ────────────────────────────── */}
                    <Section title="Variants & Details">
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '-8px 0 0' }}>
                            Add options like size or colour — separate multiple values with commas.
                        </p>

                        {/* Quick-add preset buttons */}
                        <div>
                            <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Quick Add</p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {VARIANT_PRESETS.map(preset => {
                                    const exists = attributes.some(a => a.key.toLowerCase() === preset.toLowerCase())
                                    return (
                                        <button
                                            key={preset}
                                            type="button"
                                            disabled={exists}
                                            onClick={() => !exists && addAttr(preset)}
                                            style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: exists ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.12)', background: exists ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)', color: exists ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', cursor: exists ? 'default' : 'pointer' }}
                                        >
                                            {exists ? `✓ ${preset}` : `+ ${preset}`}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Attribute rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {attributes.map((attr, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                        <input
                                            value={attr.key}
                                            onChange={e => setAttr(i, 'key', e.target.value)}
                                            placeholder="e.g. Size"
                                            style={{ ...inp, flex: '0 0 38%', fontWeight: 600 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeAttr(i)}
                                            style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', flexShrink: 0 }}
                                        >
                                            <RiDeleteBinLine size={12} />
                                        </button>
                                    </div>
                                    <input
                                        value={attr.value}
                                        onChange={e => setAttr(i, 'value', e.target.value)}
                                        placeholder={
                                            attr.key.toLowerCase() === 'size'     ? 'e.g. S, M, L, XL, XXL' :
                                            attr.key.toLowerCase() === 'color'    ? 'e.g. Red, Black, Navy Blue' :
                                            attr.key.toLowerCase() === 'material' ? 'e.g. Cotton, Polyester, Linen' :
                                            'Separate options with commas: Option 1, Option 2'
                                        }
                                        style={inp}
                                    />
                                    {/* Parsed option pills */}
                                    {attr.value && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                                            {attr.value.split(',').map(v => v.trim()).filter(Boolean).map((v, j) => (
                                                <span key={j} style={{ padding: '3px 9px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 500 }}>
                                                    {v}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => addAttr()}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 10, padding: '9px 14px', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', width: 'fit-content' }}
                        >
                            <RiAddLine size={15} /> Add custom attribute
                        </button>
                    </Section>

                    {/* ── Condition ────────────────────────────────────────── */}
                    <Section title="Condition">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {CONDITIONS.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => setCondition(c.value)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, border: `1px solid ${condition === c.value ? 'rgba(255,107,53,0.5)' : 'rgba(255,255,255,0.08)'}`, background: condition === c.value ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}
                                >
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

                    {/* ── Shipping ─────────────────────────────────────────── */}
                    <Section title="Shipping">
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
                        {/* TShip notice — replaces manual shipping fee */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.15)', borderRadius: 14, marginTop: 8 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect width="13" height="8" x="9" y="13" rx="2"/><path d="M17 17v-4l4 2-4 2z"/></svg>
                            <div>
                                <p style={{ margin: '0 0 3px', color: '#fff', fontSize: 13, fontWeight: 700 }}>Delivery handled by TShip</p>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 1.6 }}>
                                    Courier rates are calculated at checkout automatically. No need to set a delivery fee.
                                    Ensure your <a href="/settings" style={{ color: '#FF6B35', textDecoration: 'none', fontWeight: 600 }}>pickup address</a> is set in Settings → Addresses.
                                </p>
                            </div>
                        </div>
                    </Section>

                    {/* ── Bottom save button ───────────────────────────────── */}
                    <SaveBtn saving={saving} success={success} uploading={uploading} onClick={handleSave} full />
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                input:focus, textarea:focus, select:focus { border-color: rgba(255,92,0,0.5) !important; outline: none; box-shadow: 0 0 0 3px rgba(255,92,0,0.08); }
                select option { background: #1a1a1a; }
            `}</style>
        </>
    )
}

ProductEdit.layout = page => <AppLayout>{page}</AppLayout>

// ── Sub-components ────────────────────────────────────────────────────────────

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
                : success ? <RiCheckLine size={16} /> : <RiSaveLine size={16} />
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

function PriceRow({ label, value, color }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11 }}>{label}</span>
            <span style={{ color: color ?? '#fff', fontSize: 12, fontWeight: 600 }}>{value}</span>
        </div>
    )
}

const inp = {
    width: '100%', padding: '13px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#fff', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.2s, box-shadow 0.2s',
}

const iconBtn = {
    width: 36, height: 36, borderRadius: 10,
    background: 'rgba(255,255,255,0.06)', border: 'none',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#fff', flexShrink: 0,
}