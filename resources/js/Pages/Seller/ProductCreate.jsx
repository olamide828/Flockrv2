import { useState, useRef, useCallback } from 'react'
import { Head, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'
import {
  RiArrowLeftLine, RiImageAddLine, RiCloseLine, RiCheckLine,
  RiRocketLine, RiVideoLine, RiListCheck2, RiAddLine,
  RiDeleteBinLine, RiSparklingLine, RiPriceTag3Line,
} from 'react-icons/ri'

const COMMISSION_RATE = 0.05

function useImageEnhancement() {
  const pollRef = useRef(null)
  const startPolling = useCallback((productId, onUpdated) => {
    if (pollRef.current) clearInterval(pollRef.current)
    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const { data } = await axios.get(`/api/products/${productId}/images`)
        onUpdated(data.image_urls ?? [])
      } catch {}
      if (attempts >= 20) clearInterval(pollRef.current)
    }, 3000)
  }, [])
  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
  }, [])
  return { startPolling, stopPolling }
}

export default function ProductCreate({ categories = [] }) {
  const [form, setForm] = useState({
    name: '', description: '', price: '', compare_price: '',
    stock_quantity: 1, category_id: '', condition: 'new',
    shipping_fee: 0, ships_nationwide: true, // kept for backend compat
  })
  const [tagsInput,  setTagsInput]  = useState('')
  const [attributes, setAttributes] = useState([{ key: '', value: '' }])
  const [images,        setImages]        = useState([])
  const [previews,      setPreviews]      = useState([])
  const [uploadedUrls,  setUploadedUrls]  = useState([])
  const [enhancing,     setEnhancing]     = useState(false)
  const [productId,     setProductId]     = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [errors,     setErrors]     = useState({})
  const [success,    setSuccess]    = useState(false)
  const fileRef = useRef(null)

  const { startPolling, stopPolling } = useImageEnhancement()
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const parsedTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)

  const setAttr    = (i, field, val) => setAttributes(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a))
  const addAttr    = () => setAttributes(prev => [...prev, { key: '', value: '' }])
  const removeAttr = (i) => setAttributes(prev => prev.filter((_, idx) => idx !== i))

  const attributesObject = Object.fromEntries(
    attributes.filter(a => a.key.trim()).map(a => [a.key.trim(), a.value.trim()])
  )

  const handleImages = (e) => {
    const files = Array.from(e.target.files).slice(0, 6 - images.length)
    const next  = [...images, ...files].slice(0, 6)
    setImages(next)
    setPreviews(next.map(f => URL.createObjectURL(f)))
    e.target.value = ''
  }
  const removeImage = (i) => {
    setImages(prev   => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  // Commission preview
  const receives    = Number(form.price) || 0
  const listedPrice = receives > 0 ? Math.ceil(receives / (1 - COMMISSION_RATE)) : 0
  const flockrFee   = listedPrice - receives

  const submit = async (e) => {
    e?.preventDefault()
    setErrors({})
    setSubmitting(true)

    try {
      const { data: product } = await axios.post('/api/products', {
        name:             form.name,
        description:      form.description || null,
        seller_price:     Number(form.price),
        compare_price:    form.compare_price ? Number(form.compare_price) : null,
        stock_quantity:   Math.max(1, Number(form.stock_quantity)),
        category_id:      form.category_id || null,
        condition:        form.condition,
        shipping_fee:     form.shipping_fee ? Number(form.shipping_fee) : 0,
        ships_nationwide: form.ships_nationwide,
        tags:             parsedTags,
        attributes:       attributesObject,
      })

      setProductId(product.id)

      if (images.length > 0) {
        setUploading(true)
        const fd = new FormData()
        images.forEach(img => fd.append('images[]', img))
        const { data: imgData } = await axios.post(
          `/api/products/${product.id}/images`, fd,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        )
        setUploadedUrls(imgData.images ?? [])
        setUploading(false)
        if (imgData.processing) {
          setEnhancing(true)
          startPolling(product.id, (updatedUrls) => {
            const prev = (imgData.images ?? []).join(',')
            const next = updatedUrls.join(',')
            if (next && next !== prev) {
              setUploadedUrls(updatedUrls)
              setEnhancing(false)
              stopPolling()
            }
          })
        }
      }

      setSuccess(true)
    } catch (err) {
      setUploading(false)
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {})
      } else {
        setErrors({ general: err.response?.data?.message ?? 'Something went wrong.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <>
        <Head title="Product Created!" />
        <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 360 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,217,126,0.1)', border: '1.5px solid rgba(0,217,126,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <RiCheckLine size={32} color="#00d97e" />
            </div>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 24, margin: '0 0 10px' }}>Product Created!</h2>
            {enhancing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', margin: '0 0 16px', padding: '10px 16px', background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)', borderRadius: 12 }}>
                <RiSparklingLine size={15} color="#FF6B35" style={{ animation: 'pulse 1.5s ease infinite' }} />
                <span style={{ color: '#FF6B35', fontSize: 13, fontWeight: 600 }}>Enhancing images in background…</span>
              </div>
            )}
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6, margin: '0 0 28px' }}>
              Your product is live in the shop. Tag it in a video to boost sales!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => router.visit('/seller/upload')} style={primaryBtn}>
                <RiVideoLine size={16} /> Upload a Video
              </button>
              <button onClick={() => {
                stopPolling()
                setSuccess(false)
                setForm({ name:'',description:'',price:'',compare_price:'',stock_quantity:1,category_id:'',condition:'new',shipping_fee:'',ships_nationwide:true })
                setImages([]); setPreviews([]); setUploadedUrls([])
                setTagsInput(''); setAttributes([{ key: '', value: '' }])
                setEnhancing(false); setProductId(null)
              }} style={ghostBtn}>
                Add Another Product
              </button>
              <button onClick={() => router.visit('/seller/products')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer', padding: 8 }}>
                View All Products →
              </button>
            </div>
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </>
    )
  }

  return (
    <>
      <Head title="Create Product" />
      <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 100 }}>

        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => window.history.back()} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>
            <RiArrowLeftLine size={18} />
          </button>
          <h1 style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: 0, flex: 1 }}>New Product</h1>
          <button
            onClick={submit}
            disabled={submitting || uploading || !form.name || !form.price}
            style={{ padding: '8px 18px', background: (submitting || uploading || !form.name || !form.price) ? 'rgba(255,92,0,0.35)' : '#ff5c00', border: 'none', borderRadius: 999, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {submitting || uploading ? 'Saving…' : <><RiCheckLine size={14} />Publish</>}
          </button>
        </div>

        <form onSubmit={submit} style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {errors.general && (
            <div style={{ background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.25)', borderRadius: 12, padding: '12px 16px', color: '#ff3b5c', fontSize: 13 }}>
              {errors.general}
            </div>
          )}

          {/* Images */}
          <Card>
            <SectionTitle icon={<RiImageAddLine size={15} />} title="Product Photos" />
            {enhancing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)', borderRadius: 12 }}>
                <RiSparklingLine size={16} color="#FF6B35" style={{ animation: 'pulse 1.5s ease infinite', flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#FF6B35', fontSize: 13, fontWeight: 600, margin: 0 }}>Enhancing images…</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '2px 0 0' }}>Removing background, adding clean white canvas</p>
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {(uploadedUrls.length > 0 ? uploadedUrls : previews).map((src, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: '#1a1a1a' }}>
                  <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  {enhancing && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(255,107,53,0.15) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />}
                  {i === 0 && <div style={{ position: 'absolute', top: 5, left: 5, background: '#ff5c00', borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 700, color: '#fff' }}>COVER</div>}
                  {uploadedUrls.length === 0 && (
                    <button type="button" onClick={() => removeImage(i)} style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <RiCloseLine size={12} />
                    </button>
                  )}
                  {!enhancing && uploadedUrls.length > 0 && (
                    <div style={{ position: 'absolute', bottom: 5, right: 5, background: 'rgba(16,185,129,0.9)', borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <RiCheckLine size={9} /> Enhanced
                    </div>
                  )}
                </div>
              ))}
              {previews.length < 6 && uploadedUrls.length === 0 && (
                <button type="button" onClick={() => fileRef.current?.click()} style={{ aspectRatio: '1', borderRadius: 10, border: '2px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'rgba(255,255,255,0.25)' }}>
                  <RiImageAddLine size={22} />
                  <span style={{ fontSize: 11 }}>Add photo</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleImages} style={{ display: 'none' }} />
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, margin: '6px 0 0' }}>
              Up to 6 photos · First photo is cover · Backgrounds auto-removed
            </p>
          </Card>

          {/* Product Info */}
          <Card>
            <SectionTitle icon={<RiListCheck2 size={15} />} title="Product Details" />
            <Field label="Product Name *" error={errors.name}>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ankara Midi Dress" style={inputSt} required />
            </Field>
            <Field label="Description" error={errors.description}>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe your product — material, size, what's included..." rows={3} style={{ ...inputSt, resize: 'none', lineHeight: 1.6 }} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Category" error={errors.category_id}>
                <select value={form.category_id} onChange={e => set('category_id', e.target.value)} style={inputSt}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Condition *" error={errors.condition}>
                <select value={form.condition} onChange={e => set('condition', e.target.value)} style={inputSt}>
                  <option value="new">New</option>
                  <option value="used">Used</option>
                  <option value="refurbished">Refurbished</option>
                </select>
              </Field>
            </div>
          </Card>

          {/* Tags */}
          <Card>
            <SectionTitle icon={<RiPriceTag3Line size={15} />} title="Tags" />
            <Field label="Tags (comma separated)" error={errors.tags}>
              <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. ankara, dress, fashion, women" style={inputSt} />
            </Field>
            {parsedTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {parsedTags.map((tag, i) => (
                  <span key={i} style={{ padding: '4px 10px', background: 'rgba(255,92,0,0.1)', border: '1px solid rgba(255,92,0,0.25)', borderRadius: 999, color: '#ff5c00', fontSize: 12, fontWeight: 600 }}>#{tag}</span>
                ))}
              </div>
            )}
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, margin: 0 }}>Tags help buyers find your product</p>
          </Card>

          {/* Attributes */}
          <Card>
            <SectionTitle icon={<RiListCheck2 size={15} />} title="Attributes" />
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '-6px 0 0' }}>Add specs like size, color, material, weight…</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attributes.map((attr, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={attr.key} onChange={e => setAttr(i, 'key', e.target.value)} placeholder="e.g. Size" style={{ ...inputSt, flex: '0 0 38%' }} />
                  <input value={attr.value} onChange={e => setAttr(i, 'value', e.target.value)} placeholder="e.g. M, L, XL" style={{ ...inputSt, flex: 1 }} />
                  {attributes.length > 1 && (
                    <button type="button" onClick={() => removeAttr(i)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', flexShrink: 0 }}>
                      <RiDeleteBinLine size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addAttr} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 10, padding: '9px 14px', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', width: 'fit-content' }}>
              <RiAddLine size={15} /> Add attribute
            </button>
          </Card>

          {/* Pricing */}
          <Card>
            <SectionTitle title="Pricing & Stock" />

            {/* Commission calculator */}
            {receives > 0 && (
              <div style={{ padding: '12px 14px', background: 'rgba(255,92,0,0.06)', border: '1px solid rgba(255,92,0,0.18)', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RiPriceTag3Line size={14} color="#ff5c00" />
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Listed price in shop</span>
                  </div>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>₦{listedPrice.toLocaleString()}</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,92,0,0.12)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <PriceRow label="You receive"      value={`₦${receives.toLocaleString()}`}    color="rgba(16,185,129,0.9)" />
                  <PriceRow label="Flockr fee (5%)"  value={`−₦${flockrFee.toLocaleString()}`}  color="rgba(255,255,255,0.3)" />
                </div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: 0, lineHeight: 1.5 }}>
                  The 5% commission is added on top — you always receive what you enter below.
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Your Price (₦) *" error={errors.seller_price}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 14, pointerEvents: 'none' }}>₦</span>
                  <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="5,000" min="1" style={{ ...inputSt, paddingLeft: 28 }} required />
                </div>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, margin: '5px 0 0' }}>Amount you want to receive</p>
              </Field>
              <Field label="Compare Price (₦)" error={errors.compare_price}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)', fontSize: 14, pointerEvents: 'none', textDecoration: 'line-through' }}>₦</span>
                  <input type="number" value={form.compare_price} onChange={e => set('compare_price', e.target.value)} placeholder="8,000" min="1" style={{ ...inputSt, paddingLeft: 28 }} />
                </div>
              </Field>
            </div>

            <Field label="Stock Quantity *" error={errors.stock_quantity}>
              <input type="number" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} placeholder="1" min="1" style={inputSt} required />
            </Field>
          </Card>

          {/* Shipping */}
          <Card>
            <SectionTitle title="Delivery" />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.15)', borderRadius: 14 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect width="13" height="8" x="9" y="13" rx="2"/><path d="M17 17v-4l4 2-4 2z"/></svg>
              <div>
                <p style={{ margin: '0 0 4px', color: '#fff', fontSize: 13, fontWeight: 700 }}>Delivery handled by TShip</p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 1.6 }}>
                  You don't need to set a delivery fee. Courier rates are calculated automatically at checkout based on your pickup address and the buyer's location.
                  Make sure your <a href="/settings" style={{ color: '#FF6B35', textDecoration: 'none', fontWeight: 600 }}>pickup address</a> is set in Settings → Addresses.
                </p>
              </div>
            </div>
          </Card>

          <button type="submit" disabled={submitting || uploading || !form.name || !form.price} style={{ ...primaryBtn, opacity: (submitting || uploading || !form.name || !form.price) ? 0.5 : 1 }}>
            <RiRocketLine size={17} />
            {submitting || uploading ? 'Publishing...' : 'Publish Product'}
          </button>
        </form>

        <style>{`
          @keyframes spin    { to { transform: rotate(360deg) } }
          @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.5} }
          @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
          input:focus, textarea:focus, select:focus { border-color: rgba(255,92,0,0.6) !important; outline: none; box-shadow: 0 0 0 3px rgba(255,92,0,0.08); }
          input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
          select option { background: #1a1a1a; }
        `}</style>
      </div>
    </>
  )
}

ProductCreate.layout = page => <AppLayout>{page}</AppLayout>

function Card({ children }) {
  return <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
}
function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
      {icon && <span style={{ color: 'rgba(255,92,0,0.8)' }}>{icon}</span>}
      <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>{title}</p>
    </div>
  )
}
function Field({ label, error, children }) {
  return (
    <div>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 7px' }}>{label}</p>
      {children}
      {error && <p style={{ color: '#ff3b5c', fontSize: 12, margin: '5px 0 0' }}>{Array.isArray(error) ? error[0] : error}</p>}
    </div>
  )
}
function PriceRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{label}</span>
      <span style={{ color: color ?? '#fff', fontSize: 12, fontWeight: 600 }}>{value}</span>
    </div>
  )
}
const inputSt = {
  width: '100%', padding: '12px 14px',
  background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 10, color: '#fff', fontSize: 14, fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
}
const primaryBtn = {
  width: '100%', padding: '15px', background: '#ff5c00', border: 'none', borderRadius: 999,
  color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
}
const ghostBtn = {
  width: '100%', padding: '13px', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999,
  color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer',
}