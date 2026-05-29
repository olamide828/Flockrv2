import { useState, useRef } from 'react'
import { Head, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'
import {
  RiArrowLeftLine,
  RiImageAddLine,
  RiCloseLine,
  RiCheckLine,
  RiRocketLine,
  RiVideoLine,
  RiListCheck2,
} from 'react-icons/ri'

export default function ProductCreate({ categories = [] }) {
  const [form, setForm] = useState({
    name: '', description: '', price: '', compare_price: '',
    stock_quantity: 1, category_id: '', condition: 'new',
    shipping_fee: '', ships_nationwide: true,
  })
  const [images,     setImages]     = useState([])
  const [previews,   setPreviews]   = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [errors,     setErrors]     = useState({})
  const [success,    setSuccess]    = useState(false)
  const fileRef = useRef(null)

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleImages = (e) => {
    const files = Array.from(e.target.files).slice(0, 6 - images.length)
    const newFiles = [...images, ...files].slice(0, 6)
    setImages(newFiles)
    setPreviews(newFiles.map(f => URL.createObjectURL(f)))
  }

  const removeImage = (i) => {
    setImages(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const submit = async (e) => {
    e.preventDefault()
    setErrors({})
    setSubmitting(true)

    try {
      const { data: product } = await axios.post('/api/products', {
        name:             form.name,
        description:      form.description || null,
        price:            Number(form.price),
        compare_price:    form.compare_price ? Number(form.compare_price) : null,
        stock_quantity:   Math.max(1, Number(form.stock_quantity)),
        category_id:      form.category_id || null,
        condition:        form.condition,
        shipping_fee:     form.shipping_fee ? Number(form.shipping_fee) : 0,
        ships_nationwide: form.ships_nationwide,
      })

      if (images.length > 0) {
        const fd = new FormData()
        images.forEach(img => fd.append('images[]', img))
        await axios.post(`/api/products/${product.id}/images`, fd)
      }

      setSuccess(true)
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {})
      } else {
        setErrors({ general: err.response?.data?.message ?? 'Something went wrong.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <>
        <Head title="Product Created!" />
        <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 360 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,217,126,0.1)', border: '1.5px solid rgba(0,217,126,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <RiCheckLine size={32} color="#00d97e" />
            </div>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 24, margin: '0 0 10px', letterSpacing: '-0.4px' }}>
              Product Created!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6, margin: '0 0 28px' }}>
              Your product is live in the shop. Tag it in a video to boost sales!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => router.visit('/seller/upload')} style={primaryBtn}>
                <RiVideoLine size={16} /> Upload a Video
              </button>
              <button
                onClick={() => {
                  setSuccess(false)
                  setForm({ name:'',description:'',price:'',compare_price:'',stock_quantity:1,category_id:'',condition:'new',shipping_fee:'',ships_nationwide:true })
                  setImages([]); setPreviews([])
                }}
                style={ghostBtn}
              >
                Add Another Product
              </button>
              <button onClick={() => router.visit('/seller/products')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer', padding: 8 }}>
                View All Products →
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head title="Create Product" />
      <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 100 }}>

        {/* Top bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => window.history.back()} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>
            <RiArrowLeftLine size={18} />
          </button>
          <h1 style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: 0, flex: 1 }}>New Product</h1>
          <button
            onClick={submit}
            disabled={submitting || !form.name || !form.price}
            style={{
              padding: '8px 18px', background: (submitting || !form.name || !form.price) ? 'rgba(255,92,0,0.35)' : '#ff5c00',
              border: 'none', borderRadius: 999, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {submitting ? 'Saving…' : <><RiCheckLine size={14} />Publish</>}
          </button>
        </div>

        <form onSubmit={submit} style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {errors.general && (
            <div style={{ background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.25)', borderRadius: 12, padding: '12px 16px', color: '#ff3b5c', fontSize: 13 }}>
              {errors.general}
            </div>
          )}

          {/* ── Images ─────────────────────────────────────────────── */}
          <Card>
            <SectionTitle icon={<RiImageAddLine size={15} />} title="Product Photos" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {previews.map((src, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: '#1a1a1a' }}>
                  <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  {i === 0 && (
                    <div style={{ position: 'absolute', top: 5, left: 5, background: '#ff5c00', borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 700, color: '#fff' }}>
                      COVER
                    </div>
                  )}
                  <button type="button" onClick={() => removeImage(i)}
                    style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <RiCloseLine size={12} />
                  </button>
                </div>
              ))}
              {previews.length < 6 && (
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{ aspectRatio: '1', borderRadius: 10, border: '2px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'rgba(255,255,255,0.25)', transition: 'all 0.2s' }}>
                  <RiImageAddLine size={22} />
                  <span style={{ fontSize: 11 }}>Add photo</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleImages} style={{ display: 'none' }} />
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, margin: '6px 0 0' }}>
              Up to 6 photos · First photo is the cover image
            </p>
          </Card>

          {/* ── Product Info ────────────────────────────────────────── */}
          <Card>
            <SectionTitle icon={<RiListCheck2 size={15} />} title="Product Details" />

            <Field label="Product Name *" error={errors.name}>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ankara Midi Dress" style={inputSt} required />
            </Field>

            <Field label="Description" error={errors.description}>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Describe your product — material, size, what's included..."
                rows={3} style={{ ...inputSt, resize: 'none', lineHeight: 1.6 }} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Category" error={errors.category_id}>
                <select value={form.category_id} onChange={e => set('category_id', e.target.value)} style={inputSt}>
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
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

          {/* ── Pricing ─────────────────────────────────────────────── */}
          <Card>
            <SectionTitle title="Pricing & Stock" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Price (₦) *" error={errors.price}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 14, pointerEvents: 'none' }}>₦</span>
                  <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="5,000" min="1" style={{ ...inputSt, paddingLeft: 28 }} required />
                </div>
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

          {/* ── Shipping ────────────────────────────────────────────── */}
          <Card>
            <SectionTitle title="Shipping" />
            <Field label="Shipping Fee (₦)" error={errors.shipping_fee}>
              <input type="number" value={form.shipping_fee} onChange={e => set('shipping_fee', e.target.value)} placeholder="0 for free shipping" min="0" style={inputSt} />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div
                onClick={() => set('ships_nationwide', !form.ships_nationwide)}
                style={{
                  width: 44, height: 24, borderRadius: 999,
                  background: form.ships_nationwide ? '#ff5c00' : 'rgba(255,255,255,0.1)',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, left: form.ships_nationwide ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>Ships nationwide across Nigeria</span>
            </label>
          </Card>

          {/* Mobile submit */}
          <button type="submit" disabled={submitting || !form.name || !form.price} style={{
            ...primaryBtn,
            opacity: (submitting || !form.name || !form.price) ? 0.5 : 1,
          }}>
            <RiRocketLine size={17} />
            {submitting ? 'Publishing...' : 'Publish Product'}
          </button>
        </form>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg) } }
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
  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {children}
    </div>
  )
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
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 7px' }}>
        {label}
      </p>
      {children}
      {error && <p style={{ color: '#ff3b5c', fontSize: 12, margin: '5px 0 0' }}>{error}</p>}
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
  width: '100%', padding: '15px',
  background: '#ff5c00', border: 'none', borderRadius: 999,
  color: '#fff', fontSize: 15, fontWeight: 700,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
}

const ghostBtn = {
  width: '100%', padding: '13px',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 999, color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer',
}