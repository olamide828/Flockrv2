import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { RiAddLine, RiCloseLine, RiImageAddLine, RiPriceTag3Line } from 'react-icons/ri'
import { S, Spinner } from './ui'

// Same rule as Seller/ProductCreate: the 5% commission is added on top of what the seller enters.
const COMMISSION_RATE = 0.05
const MAX_PHOTOS = 6

const CONDITIONS = [
    { id: 'new', label: 'New' },
    { id: 'used', label: 'Used' },
    { id: 'refurbished', label: 'Refurbished' },
]

/**
 * Quick "create a product" sheet inside the uploader. It uses the same two calls as the full
 * product form: POST /api/products, then POST /api/products/{id}/images. The finished product
 * is handed back to the uploader and tagged on the video automatically.
 */
export default function ProductSheet({ open, onClose, onCreated }) {
    const [name, setName] = useState('')
    const [price, setPrice] = useState('')
    const [compare, setCompare] = useState('')
    const [stock, setStock] = useState('1')
    const [condition, setCondition] = useState('new')
    const [desc, setDesc] = useState('')
    const [files, setFiles] = useState([])      // [{ file, url }]
    const [busy, setBusy] = useState(false)
    const [stage, setStage] = useState('')
    const [errs, setErrs] = useState({})
    const [err, setErr] = useState('')
    const inputRef = useRef(null)
    const filesRef = useRef(files)
    filesRef.current = files

    useEffect(() => () => filesRef.current.forEach(f => URL.revokeObjectURL(f.url)), [])

    if (!open) return null

    const receives = Number(price) || 0
    const listed = receives > 0 ? Math.ceil(receives / (1 - COMMISSION_RATE)) : 0

    const addFiles = (e) => {
        const picked = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
        setFiles(prev => [...prev, ...picked.map(file => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_PHOTOS))
        e.target.value = ''
    }
    const removeFile = (i) => setFiles(prev => { URL.revokeObjectURL(prev[i].url); return prev.filter((_, idx) => idx !== i) })

    const reset = () => {
        files.forEach(f => URL.revokeObjectURL(f.url))
        setName(''); setPrice(''); setCompare(''); setStock('1'); setCondition('new'); setDesc(''); setFiles([]); setErrs({}); setErr('')
    }

    const submit = async () => {
        const e = {}
        if (!name.trim()) e.name = 'Give your product a name.'
        if (!(Number(price) > 0)) e.seller_price = 'Enter the price you want to receive.'
        if (!(Number(stock) >= 1)) e.stock_quantity = 'Stock must be at least 1.'
        setErrs(e); setErr('')
        if (Object.keys(e).length) return

        setBusy(true)
        setStage('Creating product…')
        try {
            const { data: product } = await axios.post('/api/products', {
                name: name.trim(),
                description: desc.trim() || null,
                seller_price: Number(price),
                compare_price: compare ? Number(compare) : null,
                stock_quantity: Math.max(1, Number(stock)),
                category_id: null,
                condition,
                shipping_fee: 0,
                ships_nationwide: true,
                tags: [],
                attributes: {},
            })
            if (!product?.id) throw new Error('The server did not return the new product.')

            let images = []
            let warning = null
            if (files.length) {
                setStage('Uploading photos…')
                try {
                    const fd = new FormData()
                    files.forEach(f => fd.append('images[]', f.file))
                    const { data } = await axios.post(`/api/products/${product.id}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                    images = data?.images ?? []
                } catch {
                    warning = 'Product created, but its photos did not upload. Add them from your products page.'
                }
            }

            onCreated({
                id: product.id,
                name: product.name ?? name.trim(),
                price: product.price ?? listed,
                compare_price: product.compare_price ?? null,
                stock_quantity: product.stock_quantity ?? Number(stock),
                primary_image: images[0] ?? product.primary_image ?? files[0]?.url ?? null,
            }, warning)
            reset()
        } catch (ex) {
            const d = ex.response?.data
            if (ex.response?.status === 422 && d?.errors) {
                setErrs(Object.fromEntries(Object.entries(d.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])))
            } else {
                setErr(d?.message || ex.message || 'Could not create the product. Please try again.')
            }
        } finally {
            setBusy(false)
            setStage('')
        }
    }

    const Field = ({ label, error, children }) => (
        <div>
            <p style={{ ...S.smallLabel, marginBottom: 6 }}>{label}</p>
            {children}
            {error && <p style={S.errTxt}>{error}</p>}
        </div>
    )

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 220 }}>
            <div onClick={() => !busy && onClose()} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '92dvh', overflowY: 'auto', background: '#111', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', padding: '8px 18px calc(env(safe-area-inset-bottom) + 20px)', animation: 'sheetUp 0.28s cubic-bezier(0.22,1,0.36,1)' }}>
                <div style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '4px auto 14px' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fff' }}>Create a product</h2>
                    <button onClick={onClose} disabled={busy} style={{ ...S.iconBtn, width: 32, height: 32 }} aria-label="Close"><RiCloseLine size={18} /></button>
                </div>
                <p style={{ margin: '0 0 16px', color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.5 }}>
                    It goes live in your shop and is tagged on this video automatically, so viewers can buy straight from it.
                </p>

                {/* Photos */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {files.map((f, i) => (
                        <div key={f.url} style={{ position: 'relative', width: 72, height: 72, borderRadius: 14, overflow: 'hidden', background: '#222' }}>
                            <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {i === 0 && <span style={{ position: 'absolute', left: 4, bottom: 4, background: '#ff5c00', borderRadius: 4, padding: '1px 5px', fontSize: 8, fontWeight: 800, color: '#fff' }}>COVER</span>}
                            <button onClick={() => removeFile(i)} aria-label="Remove photo" style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiCloseLine size={12} color="#fff" /></button>
                        </div>
                    ))}
                    {files.length < MAX_PHOTOS && (
                        <button onClick={() => inputRef.current?.click()} style={{ width: 72, height: 72, borderRadius: 14, background: 'rgba(255,107,53,0.08)', border: '1.5px dashed rgba(255,107,53,0.45)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, color: '#FF6B35', fontSize: 10, fontWeight: 700 }}>
                            <RiImageAddLine size={20} /> Photo
                        </button>
                    )}
                    <input ref={inputRef} type="file" accept="image/*" multiple onChange={addFiles} style={{ display: 'none' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Field label="Product name *" error={errs.name}>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ankara Midi Dress" maxLength={120} style={S.inp} />
                    </Field>

                    {receives > 0 && (
                        <div style={{ padding: '10px 12px', background: 'rgba(255,92,0,0.06)', border: '1px solid rgba(255,92,0,0.18)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}><RiPriceTag3Line size={13} color="#ff5c00" /> Listed price in shop</span>
                                <span style={{ color: '#fff', fontWeight: 800 }}>₦{listed.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>You receive</span>
                                <span style={{ color: 'rgba(16,185,129,0.9)', fontSize: 12, fontWeight: 600 }}>₦{receives.toLocaleString()}</span>
                            </div>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>Flockr&apos;s 5% fee is added on top. You always receive what you enter.</p>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                            <Field label="Your price (₦) *" error={errs.seller_price}>
                                <input value={price} onChange={e => setPrice(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="5000" style={S.inp} />
                            </Field>
                        </div>
                        <div style={{ flex: 1 }}>
                            <Field label="Compare price (₦)" error={errs.compare_price}>
                                <input value={compare} onChange={e => setCompare(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="8000" style={S.inp} />
                            </Field>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                            <Field label="Stock *" error={errs.stock_quantity}>
                                <input value={stock} onChange={e => setStock(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="1" style={S.inp} />
                            </Field>
                        </div>
                        <div style={{ flex: 1 }}>
                            <Field label="Condition" error={errs.condition}>
                                <select value={condition} onChange={e => setCondition(e.target.value)} style={S.inp}>
                                    {CONDITIONS.map(c => <option key={c.id} value={c.id} style={{ background: '#1a1a1a' }}>{c.label}</option>)}
                                </select>
                            </Field>
                        </div>
                    </div>

                    <Field label="Description" error={errs.description}>
                        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Material, size, what's included…" rows={3} maxLength={1000} style={{ ...S.inp, resize: 'none', lineHeight: 1.5 }} />
                    </Field>
                </div>

                {err && <div style={{ ...S.errBanner, marginTop: 12 }}>{err}</div>}

                <button onClick={submit} disabled={busy} style={{ ...S.primaryBtn, width: '100%', marginTop: 16, padding: '14px 0', opacity: busy ? 0.75 : 1 }}>
                    {busy ? <><Spinner /> {stage}</> : <><RiAddLine size={16} /> Create &amp; tag product</>}
                </button>
            </div>
        </div>
    )
}
