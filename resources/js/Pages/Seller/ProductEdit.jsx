import AppLayout from '@/Layouts/AppLayout'
import { Head, router } from '@inertiajs/react'
import axios from 'axios'
import { useRef, useState } from 'react'
import {
    RiAddLine, RiArrowLeftLine, RiCheckLine,
    RiDeleteBinLine, RiImageLine, RiLoader4Line,
    RiSaveLine, RiStoreLine,
} from 'react-icons/ri'

const CONDITIONS = [
    { value: 'new',         label: 'New',         desc: 'Brand new, never used' },
    { value: 'used',        label: 'Used',         desc: 'Previously owned' },
    { value: 'refurbished', label: 'Refurbished',  desc: 'Restored to working condition' },
]

export default function ProductEdit({ product, categories = [] }) {
    const [form, setForm] = useState({
        name:            product.name ?? '',
        description:     product.description ?? '',
        price:           product.price ?? '',
        compare_price:   product.compare_price ?? '',
        stock_quantity:  product.stock_quantity ?? '',
        category_id:     product.category_id ?? '',
        condition:       product.condition ?? 'new',
        ships_nationwide: product.ships_nationwide ?? false,
        shipping_fee:    product.shipping_fee ?? '',
        status:          product.status ?? 'active',
        tags:            (product.tags ?? []).join(', '),
    })

    const [images, setImages]         = useState(product.image_urls ?? [])
    const [newImages, setNewImages]   = useState([]) // files to upload
    const [previews, setPreviews]     = useState([]) // preview URLs for new files
    const [saving, setSaving]         = useState(false)
    const [uploading, setUploading]   = useState(false)
    const [errors, setErrors]         = useState({})
    const [success, setSuccess]       = useState(false)
    const [tagInput, setTagInput]     = useState((product.tags ?? []).join(', '))

    const fileRef = useRef(null)

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

    const handleImageFiles = (e) => {
        const files = Array.from(e.target.files ?? [])
        if (!files.length) return
        const totalExisting = images.length + newImages.length
        const allowed = Math.min(files.length, 6 - totalExisting)
        const selected = files.slice(0, allowed)
        setNewImages(prev => [...prev, ...selected])
        setPreviews(prev => [...prev, ...selected.map(f => URL.createObjectURL(f))])
        e.target.value = ''
    }

    const removeExistingImage = (idx) => {
        setImages(prev => prev.filter((_, i) => i !== idx))
    }

    const removeNewImage = (idx) => {
        setPreviews(prev => prev.filter((_, i) => i !== idx))
        setNewImages(prev => prev.filter((_, i) => i !== idx))
    }

    const handleSave = async () => {
        setSaving(true)
        setErrors({})
        setSuccess(false)

        try {
            // 1. Update product fields
            await axios.put(`/api/products/${product.id}`, {
                name:             form.name,
                description:      form.description,
                price:            form.price,
                compare_price:    form.compare_price || null,
                stock_quantity:   form.stock_quantity,
                category_id:      form.category_id || null,
                condition:        form.condition,
                ships_nationwide: form.ships_nationwide,
                shipping_fee:     form.shipping_fee || 0,
                status:           form.status,
                tags:             tagInput.split(',').map(t => t.trim()).filter(Boolean),
            })

            // 2. Upload new images if any
            if (newImages.length > 0) {
                setUploading(true)
                const fd = new FormData()
                newImages.forEach(f => fd.append('images[]', f))
                const { data } = await axios.post(`/api/products/${product.id}/images`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                })
                setImages(data.images ?? [])
                setNewImages([])
                setPreviews([])
                setUploading(false)
            }

            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
        } catch (err) {
            const errs = err.response?.data?.errors ?? {}
            const msg  = err.response?.data?.message ?? 'Failed to save. Please try again.'
            setErrors(Object.keys(errs).length ? errs : { _general: msg })
        } finally {
            setSaving(false)
            setUploading(false)
        }
    }

    const totalImages = images.length + newImages.length
    const canAddMore  = totalImages < 6

    return (
        <>
            <Head title={`Edit · ${product.name}`} />

            <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingBottom: 100 }}>

                {/* Header */}
                <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px' }}>
                    <div style={{ maxWidth: 720, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button onClick={() => window.history.back()} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                            <RiArrowLeftLine size={18} />
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Edit Product</h1>
                            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 999, background: success ? '#10B981' : '#FF6B35', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'background 0.3s', flexShrink: 0 }}
                        >
                            {saving ? <RiLoader4Line size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : success ? <RiCheckLine size={14} /> : <RiSaveLine size={14} />}
                            {saving ? 'Saving…' : success ? 'Saved!' : 'Save'}
                        </button>
                    </div>
                </div>

                <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>

                    {/* Error */}
                    {errors._general && (
                        <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: '#EF4444', fontSize: 13 }}>
                            {errors._general}
                        </div>
                    )}

                    {/* Status toggle */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                        {['active', 'draft', 'archived'].map(s => (
                            <button key={s} onClick={() => set('status', s)} style={{ padding: '7px 16px', borderRadius: 999, border: `1px solid ${form.status === s ? '#FF6B35' : 'rgba(255,255,255,0.1)'}`, background: form.status === s ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.03)', color: form.status === s ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Images */}
                    <Section title="Images" subtitle={`${totalImages}/6 photos`}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                            {/* Existing images */}
                            {images.map((url, i) => (
                                <div key={`ex-${i}`} style={{ position: 'relative', aspectRatio: '1', borderRadius: 14, overflow: 'hidden', background: '#1a1a1a' }}>
                                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    {i === 0 && (
                                        <span style={{ position: 'absolute', top: 6, left: 6, padding: '2px 7px', background: '#FF6B35', borderRadius: 999, fontSize: 9, fontWeight: 700, color: '#fff' }}>COVER</span>
                                    )}
                                    <button onClick={() => removeExistingImage(i)} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                        <RiDeleteBinLine size={12} />
                                    </button>
                                </div>
                            ))}
                            {/* New image previews */}
                            {previews.map((url, i) => (
                                <div key={`new-${i}`} style={{ position: 'relative', aspectRatio: '1', borderRadius: 14, overflow: 'hidden', background: '#1a1a1a', border: '2px solid rgba(255,107,53,0.4)' }}>
                                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                                    <span style={{ position: 'absolute', top: 6, left: 6, padding: '2px 7px', background: 'rgba(255,107,53,0.9)', borderRadius: 999, fontSize: 9, fontWeight: 700, color: '#fff' }}>NEW</span>
                                    <button onClick={() => removeNewImage(i)} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                        <RiDeleteBinLine size={12} />
                                    </button>
                                </div>
                            ))}
                            {/* Add button */}
                            {canAddMore && (
                                <button onClick={() => fileRef.current?.click()} style={{ aspectRatio: '1', borderRadius: 14, border: '1.5px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
                                    <RiAddLine size={22} />
                                    <span style={{ fontSize: 11, fontWeight: 600 }}>Add Photo</span>
                                </button>
                            )}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageFiles} style={{ display: 'none' }} />
                        {uploading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                                <RiLoader4Line size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                                Uploading images…
                            </div>
                        )}
                    </Section>

                    {/* Basic info */}
                    <Section title="Basic Info">
                        <Field label="Product Name" error={errors.name}>
                            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Nike Air Force 1" style={inputStyle} />
                        </Field>
                        <Field label="Description" error={errors.description}>
                            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe your product…" rows={5} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
                        </Field>
                        <Field label="Category" error={errors.category_id}>
                            <select value={form.category_id} onChange={e => set('category_id', e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                                <option value="">Select category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Tags (comma separated)" error={errors.tags}>
                            <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="e.g. sneakers, fashion, unisex" style={inputStyle} />
                        </Field>
                    </Section>

                    {/* Pricing */}
                    <Section title="Pricing & Stock">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <Field label="Price (₦)" error={errors.price}>
                                <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" style={inputStyle} />
                            </Field>
                            <Field label="Compare Price (₦)" error={errors.compare_price}>
                                <input type="number" value={form.compare_price} onChange={e => set('compare_price', e.target.value)} placeholder="Optional" style={inputStyle} />
                            </Field>
                        </div>
                        <Field label="Stock Quantity" error={errors.stock_quantity}>
                            <input type="number" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} placeholder="0" style={inputStyle} />
                        </Field>
                    </Section>

                    {/* Condition */}
                    <Section title="Condition">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {CONDITIONS.map(c => (
                                <button key={c.value} onClick={() => set('condition', c.value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, border: `1px solid ${form.condition === c.value ? 'rgba(255,107,53,0.5)' : 'rgba(255,255,255,0.08)'}`, background: form.condition === c.value ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}>
                                    <div>
                                        <p style={{ color: form.condition === c.value ? '#FF6B35' : '#fff', fontSize: 14, fontWeight: 600, margin: 0 }}>{c.label}</p>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '2px 0 0' }}>{c.desc}</p>
                                    </div>
                                    {form.condition === c.value && (
                                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <RiCheckLine size={12} color="#fff" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </Section>

                    {/* Shipping */}
                    <Section title="Shipping">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14 }}>
                            <div>
                                <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: 0 }}>Ships Nationwide</p>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '2px 0 0' }}>Deliver to any state in Nigeria</p>
                            </div>
                            <button onClick={() => set('ships_nationwide', !form.ships_nationwide)} style={{ width: 46, height: 26, borderRadius: 999, background: form.ships_nationwide ? '#10B981' : 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.25s', flexShrink: 0 }}>
                                <span style={{ position: 'absolute', top: 3, left: form.ships_nationwide ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                            </button>
                        </div>
                        <Field label="Shipping Fee (₦, 0 = free)" error={errors.shipping_fee}>
                            <input type="number" value={form.shipping_fee} onChange={e => set('shipping_fee', e.target.value)} placeholder="0" style={inputStyle} />
                        </Field>
                    </Section>

                    {/* Save button (bottom) */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{ width: '100%', padding: '16px', background: success ? '#10B981' : '#FF6B35', border: 'none', borderRadius: 999, color: '#fff', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.7 : 1, transition: 'background 0.3s', marginTop: 8 }}
                    >
                        {saving ? <RiLoader4Line size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : success ? <RiCheckLine size={18} /> : <RiSaveLine size={18} />}
                        {saving ? 'Saving changes…' : success ? 'Changes saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    )
}

ProductEdit.layout = page => <AppLayout>{page}</AppLayout>

function Section({ title, subtitle, children }) {
    return (
        <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h2>
                {subtitle && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{subtitle}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {children}
            </div>
        </div>
    )
}

function Field({ label, error, children }) {
    return (
        <div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 7px' }}>{label}</p>
            {children}
            {error && <p style={{ color: '#EF4444', fontSize: 12, margin: '5px 0 0' }}>{Array.isArray(error) ? error[0] : error}</p>}
        </div>
    )
}

const inputStyle = {
    width: '100%', padding: '13px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#fff', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'DM Sans, sans-serif',
    transition: 'border-color 0.2s',
}