import { useEffect, useState } from 'react'
import { router } from '@inertiajs/react'
import axios from 'axios'
import { RiCloseLine, RiShoppingBag3Line, RiSubtractLine, RiAddLine, RiLoader4Line } from 'react-icons/ri'

export default function PayWithFlockrSheet({ seller, onClose }) {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!seller?.id) return
    axios.get('/api/shop/products', { params: { seller_id: seller.id, per_page: 50 } })
      .then(({ data }) => {
        const items = data.data ?? data
        setProducts(items)
        if (items.length === 1) setSelected(items[0])
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [seller?.id])

  const handleConfirm = async () => {
    if (!selected) return
    setAdding(true)
    setError('')
    try {
      await axios.post('/api/cart', { product_id: selected.id, quantity: qty })
      router.visit('/cart')
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not add to cart. Try again.')
      setAdding(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 980, background: 'rgba(0,0,0,0.75)' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 981, maxWidth: 480, margin: '0 auto', maxHeight: '82vh', display: 'flex', flexDirection: 'column', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', borderRadius: '24px 24px 0 0', padding: '10px 20px calc(20px + env(safe-area-inset-bottom,0px))', animation: 'pwSlideUp 0.24s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)', margin: '4px auto 14px', flexShrink: 0 }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <RiCloseLine size={16} />
        </button>

        <div style={{ flexShrink: 0, marginBottom: 14 }}>
          <p style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 16 }}>Pay with Flockr</p>
          <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            {selected ? 'Confirm the item and quantity' : `What are you buying from @${seller?.username}?`}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <RiLoader4Line size={22} color="rgba(255,255,255,0.3)" style={{ animation: 'pwSpin 0.8s linear infinite' }} />
            </div>
          )}

          {!loading && products.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <RiShoppingBag3Line size={30} color="rgba(255,255,255,0.2)" style={{ marginBottom: 10 }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>This seller has no active products right now. Ask them to share a product link, or proceed carefully.</p>
            </div>
          )}

          {!loading && !selected && products.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {products.map(p => (
                <button key={p.id} onClick={() => setSelected(p)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 10, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
                    {p.primary_image ? <img src={p.primary_image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <p style={{ margin: '2px 0 0', color: '#FF6B35', fontSize: 13, fontWeight: 700 }}>₦{Number(p.price).toLocaleString()}</p>
                  </div>
                </button>
              ))}
            </div>
          )}


{selected && (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 16 }}>
      <div style={{ width: 54, height: 54, borderRadius: 12, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
        {selected.primary_image ? <img src={selected.primary_image} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, color: '#fff', fontSize: 14, fontWeight: 700 }}>{selected.name}</p>
        <p style={{ margin: '3px 0 0', color: '#FF6B35', fontSize: 15, fontWeight: 800 }}>₦{Number(selected.price).toLocaleString()}</p>
      </div>
      {products.length > 1 && (
        <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>Change</button>
      )}
    </div>

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Quantity</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><RiSubtractLine size={15} /></button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, minWidth: 20, textAlign: 'center' }}>{qty}</span>
        <button
          onClick={() => setQty(q => Math.min(selected.stock_quantity ?? 99, q + 1))}
          disabled={qty >= (selected.stock_quantity ?? 99)}
          style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: qty >= (selected.stock_quantity ?? 99) ? 'not-allowed' : 'pointer', opacity: qty >= (selected.stock_quantity ?? 99) ? 0.4 : 1 }}
        ><RiAddLine size={15} /></button>
      </div>
    </div>

    {/* Stock indicator — orange when low, red when out */}
    <p style={{
      margin: '0 0 20px',
      fontSize: 12,
      fontWeight: 600,
      color: (selected.stock_quantity ?? 0) === 0 ? '#EF4444' : (selected.stock_quantity ?? 0) <= 5 ? '#F59E0B' : 'rgba(255,255,255,0.4)',
      textAlign: 'right',
    }}>
      {(selected.stock_quantity ?? 0) === 0
        ? 'Out of stock'
        : `${selected.stock_quantity} in stock${(selected.stock_quantity <= 5) ? ' — almost gone' : ''}`}
    </p>

    {error && <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{error}</p>}

    <button
      onClick={handleConfirm}
      disabled={adding || (selected.stock_quantity ?? 0) === 0}
      style={{ width: '100%', padding: 15, borderRadius: 999, background: '#FF6B35', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: (adding || selected.stock_quantity === 0) ? 'not-allowed' : 'pointer', opacity: (adding || selected.stock_quantity === 0) ? 0.6 : 1 }}
    >
      {adding ? 'Adding…' : (selected.stock_quantity ?? 0) === 0 ? 'Out of Stock' : 'Continue to Checkout'}
    </button>
  </div>
)}
        </div>
      </div>
      <style>{`
        @keyframes pwSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pwSpin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}