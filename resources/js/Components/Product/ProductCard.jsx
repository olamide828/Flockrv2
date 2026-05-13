import { useState } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import axios from 'axios'

export default function ProductCard({ product, layout = 'grid' }) {
  const { auth } = usePage().props
  const [saved,   setSaved]   = useState(product.is_saved ?? false)
  const [imgErr,  setImgErr]  = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!auth?.user) { router.visit('/login'); return }
    setSaved(s => !s)
    await axios.post(`/api/products/${product.id}/save`).catch(() => setSaved(s => !s))
  }

  const handleBuy = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!auth?.user) { router.visit('/login'); return }
    try {
      const { data } = await axios.post('/api/orders/checkout', { product_id: product.id, quantity: 1 })
      window.location.href = data.authorization_url
    } catch (err) {
      alert(err.response?.data?.message ?? 'Checkout failed.')
    }
  }

  if (layout === 'list') {
    return (
      <Link href={`/products/${product.slug}`} className="flex gap-4 p-3 bg-flockr-card rounded-flockr border border-white/[0.06] hover:border-white/[0.12] transition-all group">
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-flockr-surface shrink-0 relative">
          {!imgErr && product.primary_image
            ? <img src={product.primary_image} alt={product.name} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
            : <PlaceholderImage />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium line-clamp-2 leading-snug">{product.name}</p>
          <p className="text-flockr-muted text-xs mt-0.5">@{product.seller?.username}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-flockr-orange font-bold naira">₦{Number(product.price).toLocaleString()}</span>
            <button onClick={handleBuy} className="btn-primary text-xs py-1.5 px-3">Buy</button>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/products/${product.slug}`} className="product-card group block">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-flockr-surface">
        {!imgErr && product.primary_image
          ? <img
              src={product.primary_image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImgErr(true)}
            />
          : <PlaceholderImage />
        }

        {/* Discount badge */}
        {product.discount_percent && (
          <span className="absolute top-2 left-2 badge badge-orange">
            -{product.discount_percent}%
          </span>
        )}

        {/* Sold out overlay */}
        {!product.is_in_stock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm tracking-widest uppercase">Sold Out</span>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          className="absolute top-2 right-2 w-8 h-8 rounded-full glass flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
        >
          <svg className={`w-4 h-4 ${saved ? 'text-flockr-amber' : 'text-white'}`} fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="text-white text-sm font-medium line-clamp-2 leading-snug">{product.name}</p>

        <div className="flex items-center gap-1.5">
          <img
            src={product.seller?.avatar_url ?? `https://ui-avatars.com/api/?name=${product.seller?.name}&background=1a1a1a&size=32`}
            alt={product.seller?.name}
            className="w-4 h-4 rounded-full object-cover"
          />
          <span className="text-flockr-muted text-xs truncate">@{product.seller?.username}</span>
          {product.seller?.is_verified && (
            <span className="verified-badge w-3 h-3">
              <svg className="w-1.5 h-1.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-flockr-orange font-bold naira leading-tight">
              ₦{Number(product.price).toLocaleString()}
            </div>
            {product.compare_price && (
              <div className="text-flockr-muted text-xs line-through naira">
                ₦{Number(product.compare_price).toLocaleString()}
              </div>
            )}
          </div>

          {product.is_in_stock && (
            <button
              onClick={handleBuy}
              className="btn-primary text-xs py-2 px-3"
            >
              Buy Now
            </button>
          )}
        </div>

        {/* Views / orders social proof */}
        {product.orders_count > 0 && (
          <p className="text-flockr-muted text-[11px]">
            🔥 {product.orders_count > 50 ? '50+' : product.orders_count} sold
          </p>
        )}
      </div>
    </Link>
  )
}

function PlaceholderImage() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-flockr-surface text-flockr-subtle">
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    </div>
  )
}
