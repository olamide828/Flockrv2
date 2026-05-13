import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import axios from 'axios'

export default function ProductSheet({ products, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bottom-sheet">
        <div className="bg-flockr-surface rounded-t-2xl border-t border-white/[0.08] max-h-[70vh] overflow-hidden flex flex-col">

          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2 shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="px-5 pb-3 flex items-center justify-between shrink-0 border-b border-white/[0.06]">
            <h3 className="font-display font-semibold text-white text-base">
              Products in this video
            </h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
              <svg className="w-5 h-5 text-flockr-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Product list */}
          <div className="overflow-y-auto scroll-hidden">
            {products.map((product) => (
              <ProductRow key={product.id} product={product} onClose={onClose} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function ProductRow({ product, onClose }) {
  const { auth }  = usePage().props
  const [adding, setAdding] = useState(false)
  const [added,  setAdded]  = useState(false)

  const handleBuyNow = () => {
    if (!auth?.user) { router.visit('/login'); return }
    router.visit(`/checkout?product_id=${product.id}&qty=1`)
    onClose()
  }

  const handleAddToCart = async () => {
    if (!auth?.user) { router.visit('/login'); return }
    setAdding(true)
    try {
      await axios.post('/api/cart', { product_id: product.id, quantity: 1 })
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch {
      alert('Could not add to cart. Try again.')
    } finally {
      setAdding(false)
    }
  }

  const discount = product.discount_percent

  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      {/* Image */}
      <div className="w-16 h-16 rounded-xl bg-flockr-card border border-white/[0.06] overflow-hidden shrink-0">
        {product.primary_image
          ? <img src={product.primary_image} alt={product.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-flockr-subtle">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
            </div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium leading-snug line-clamp-1">{product.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-flockr-orange font-semibold text-sm naira">
            ₦{Number(product.price).toLocaleString()}
          </span>
          {discount && (
            <>
              <span className="text-flockr-muted text-xs line-through naira">
                ₦{Number(product.compare_price).toLocaleString()}
              </span>
              <span className="badge badge-green text-[10px] py-0.5">{discount}% off</span>
            </>
          )}
        </div>
        {product.is_in_stock
          ? <span className="text-xs text-flockr-green">In stock</span>
          : <span className="text-xs text-flockr-red">Out of stock</span>
        }
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          onClick={handleBuyNow}
          disabled={!product.is_in_stock}
          className="btn-primary text-xs py-1.5 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Buy Now
        </button>
        <button
          onClick={handleAddToCart}
          disabled={adding || !product.is_in_stock}
          className="btn-ghost text-xs py-1.5 px-3"
        >
          {added ? '✓ Added' : adding ? '...' : 'Add to cart'}
        </button>
      </div>
    </div>
  )
}
