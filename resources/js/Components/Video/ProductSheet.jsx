import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import axios from 'axios'

export default function ProductSheet({ products, onClose }) {
  const { auth } = usePage().props
  const [buying, setBuying] = useState(null)

  const handleBuy = async (product) => {
    if (!auth?.user) { router.visit('/login'); return }
    setBuying(product.id)
    try {
      const { data } = await axios.post('/api/orders/checkout', {
        product_id: product.id,
        quantity: 1,
      })
      window.location.href = data.authorization_url
    } catch (err) {
      alert(err.response?.data?.message ?? 'Could not start checkout. Please try again.')
    } finally {
      setBuying(null)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-40 bg-flockr-surface rounded-t-2xl bottom-sheet max-h-[75vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-white/[0.06] shrink-0">
          <h3 className="font-display font-bold text-white text-base">
            Products in this video
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <svg className="w-4 h-4 text-flockr-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Product list */}
        <div className="overflow-y-auto flex-1 scroll-hidden p-4 space-y-3">
          {products.map((product) => (
            <div key={product.id} className="flex items-center gap-3 bg-flockr-card rounded-flockr p-3 border border-white/[0.06]">
              {/* Image */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-flockr-subtle shrink-0">
                {product.primary_image
                  ? <img src={product.primary_image} alt={product.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-flockr-muted">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    </div>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium leading-tight line-clamp-1">{product.name}</p>
                {product.seller && (
                  <p className="text-flockr-muted text-xs mt-0.5">by @{product.seller.username}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-flockr-orange font-bold text-base naira">
                    ₦{Number(product.price).toLocaleString()}
                  </span>
                  {product.compare_price && (
                    <span className="text-flockr-muted text-xs line-through naira">
                      ₦{Number(product.compare_price).toLocaleString()}
                    </span>
                  )}
                  {product.discount_percent && (
                    <span className="badge badge-orange">{product.discount_percent}% off</span>
                  )}
                </div>
              </div>

              {/* Buy button */}
              <button
                onClick={() => handleBuy(product)}
                disabled={buying === product.id || !product.is_in_stock}
                className="btn-primary text-xs py-2 px-4 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {buying === product.id
                  ? <span className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Wait...
                    </span>
                  : product.is_in_stock ? 'Buy Now' : 'Sold Out'
                }
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
