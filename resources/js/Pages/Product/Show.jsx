import { useState } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import ProductCard from '@/Components/Product/ProductCard'
import axios from 'axios'

export default function ProductShow({ product, similarProducts = [], sellerOtherProducts = [] }) {
  const { auth } = usePage().props
  const [activeImg,  setActiveImg]  = useState(0)
  const [quantity,   setQuantity]   = useState(1)
  const [buying,     setBuying]     = useState(false)
  const [saved,      setSaved]      = useState(product.is_saved ?? false)
  const [activeTab,  setActiveTab]  = useState('description')

  const images = product.images ?? []
  const allImages = images.length > 0 ? images.map(img =>
    `${window.flockrConfig?.r2Url ?? ''}/${img}`
  ) : [null]

  const handleBuy = async () => {
    if (!auth?.user) { router.visit('/login'); return }
    setBuying(true)
    try {
      const { data } = await axios.post('/api/orders/checkout', {
        product_id: product.id,
        quantity,
      })
      window.location.href = data.authorization_url
    } catch (err) {
      alert(err.response?.data?.message ?? 'Checkout failed. Please try again.')
    } finally {
      setBuying(false)
    }
  }

  const handleSave = async () => {
    if (!auth?.user) { router.visit('/login'); return }
    setSaved(s => !s)
    await axios.post(`/api/products/${product.id}/save`).catch(() => setSaved(s => !s))
  }

  return (
    <>
      <Head title={product.name} />

      <div className="h-screen overflow-y-auto scroll-hidden bg-flockr-black">
        {/* Back button */}
        <div className="sticky top-0 z-20 bg-flockr-black/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-white/[0.06] transition-colors text-flockr-muted hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="font-display font-bold text-white text-sm truncate flex-1">{product.name}</h1>
          <button onClick={handleSave} className="p-2 rounded-full hover:bg-white/[0.06] transition-colors">
            <svg className={`w-5 h-5 ${saved ? 'text-flockr-amber' : 'text-flockr-muted'}`} fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 pb-32 md:pb-8">
          <div className="md:grid md:grid-cols-2 md:gap-10">

            {/* ── Images ─────────────────────────────────────────────── */}
            <div className="space-y-3">
              {/* Main image */}
              <div className="aspect-square rounded-flockr-lg overflow-hidden bg-flockr-card border border-white/[0.06] relative">
                {allImages[activeImg]
                  ? <img src={allImages[activeImg]} alt={product.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-flockr-subtle">
                      <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" /></svg>
                    </div>
                }
                {product.discount_percent && (
                  <span className="absolute top-3 left-3 badge badge-orange text-sm">
                    -{product.discount_percent}% OFF
                  </span>
                )}
              </div>
              {/* Thumbnails */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto scroll-hidden">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                        activeImg === i ? 'border-flockr-orange' : 'border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-flockr-card" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Product info ────────────────────────────────────────── */}
            <div className="space-y-5 mt-5 md:mt-0">
              {/* Category breadcrumb */}
              {product.category && (
                <div className="flex items-center gap-1.5 text-xs text-flockr-muted">
                  <Link href="/shop" className="hover:text-white transition-colors">Shop</Link>
                  <span>/</span>
                  <span className="text-white">{product.category.name}</span>
                </div>
              )}

              {/* Name */}
              <h1 className="font-display font-bold text-white text-2xl leading-snug">{product.name}</h1>

              {/* Price */}
              <div className="flex items-end gap-3">
                <span className="text-flockr-orange font-display font-bold text-3xl naira">
                  ₦{Number(product.price).toLocaleString()}
                </span>
                {product.compare_price && (
                  <span className="text-flockr-muted text-lg line-through naira mb-0.5">
                    ₦{Number(product.compare_price).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Stock */}
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${product.is_in_stock ? 'bg-flockr-green' : 'bg-flockr-red'}`} />
                <span className={`text-sm font-medium ${product.is_in_stock ? 'text-flockr-green' : 'text-flockr-red'}`}>
                  {product.is_in_stock ? `In Stock (${product.stock_quantity} left)` : 'Out of Stock'}
                </span>
              </div>

              {/* Attributes */}
              {product.attributes && Object.keys(product.attributes).length > 0 && (
                <div className="space-y-3">
                  {Object.entries(product.attributes).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-flockr-muted text-xs uppercase tracking-wider mb-1.5">{key}</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(val)
                          ? val.map(v => (
                              <span key={v} className="px-3 py-1.5 rounded-full border border-white/[0.1] text-white text-sm hover:border-flockr-orange cursor-pointer transition-colors">{v}</span>
                            ))
                          : <span className="px-3 py-1.5 rounded-full border border-white/[0.1] text-white text-sm">{val}</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity */}
              {product.is_in_stock && (
                <div className="flex items-center gap-3">
                  <span className="text-flockr-muted text-sm">Qty</span>
                  <div className="flex items-center gap-1 bg-flockr-card rounded-xl border border-white/[0.08]">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="px-3 py-2.5 text-flockr-muted hover:text-white transition-colors"
                    >−</button>
                    <span className="px-3 text-white font-semibold text-sm min-w-[2ch] text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => Math.min(product.stock_quantity, q + 1))}
                      className="px-3 py-2.5 text-flockr-muted hover:text-white transition-colors"
                    >+</button>
                  </div>
                </div>
              )}

              {/* CTAs */}
              <div className="flex gap-3">
                <button
                  onClick={handleBuy}
                  disabled={!product.is_in_stock || buying}
                  className="btn-primary flex-1 py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {buying
                    ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Processing...</>
                    : product.is_in_stock ? '⚡ Buy Now' : 'Out of Stock'
                  }
                </button>
                <button onClick={handleSave} className="btn-ghost px-4 py-3.5">
                  {saved ? '★ Saved' : '☆ Save'}
                </button>
              </div>

              {/* Shipping info */}
              <div className="bg-flockr-card rounded-flockr border border-white/[0.06] p-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="text-lg">🚚</span>
                  <div>
                    <p className="text-white font-medium">
                      {product.shipping_fee == 0 ? 'Free Shipping' : `₦${Number(product.shipping_fee).toLocaleString()} delivery`}
                    </p>
                    <p className="text-flockr-muted text-xs">
                      {product.ships_nationwide ? 'Ships nationwide across Nigeria' : `Ships from ${product.location}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="text-lg">🔒</span>
                  <p className="text-flockr-muted text-xs">Secure payment via Paystack. Buyer protection included.</p>
                </div>
              </div>

              {/* Seller card */}
              <Link href={`/@${product.seller?.username}`} className="flex items-center gap-3 p-3.5 bg-flockr-card rounded-flockr border border-white/[0.06] hover:border-white/[0.12] transition-all group">
                <img
                  src={product.seller?.avatar_url ?? `https://ui-avatars.com/api/?name=${product.seller?.name}&background=1a1a1a`}
                  alt={product.seller?.name}
                  className="w-11 h-11 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-white font-semibold text-sm">{product.seller?.name}</p>
                    {product.seller?.is_verified && (
                      <span className="verified-badge">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </span>
                    )}
                  </div>
                  <p className="text-flockr-muted text-xs">@{product.seller?.username} · {Number(product.seller?.total_sales).toLocaleString()} sales</p>
                </div>
                <svg className="w-4 h-4 text-flockr-muted group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            </div>
          </div>

          {/* ── Tabs: Description / AI Description ──────────────────── */}
          <div className="mt-8 border-b border-white/[0.06]">
            <div className="flex gap-6">
              {['description', 'ai_description', 'videos'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium transition-colors ${
                    activeTab === tab ? 'tab-active text-white' : 'text-flockr-muted hover:text-white'
                  }`}
                >
                  {tab === 'description' ? 'Description' : tab === 'ai_description' ? '✨ AI Summary' : '📹 Videos'}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 text-flockr-muted text-sm leading-relaxed whitespace-pre-line">
            {activeTab === 'description' && (product.description || 'No description provided.')}
            {activeTab === 'ai_description' && (
              product.ai_description
                ? <div className="space-y-2">
                    <div className="flex items-center gap-2 text-flockr-orange mb-3">
                      <span>✨</span>
                      <span className="text-xs font-medium">AI-generated summary</span>
                    </div>
                    <p>{product.ai_description}</p>
                  </div>
                : <p className="text-flockr-muted italic">AI summary is being generated...</p>
            )}
            {activeTab === 'videos' && (
              product.videos?.length > 0
                ? <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {product.videos.map(v => (
                      <a key={v.id} href={`/video/${v.id}`} className="relative aspect-[9/16] rounded-flockr overflow-hidden group">
                        <img src={v.thumbnail_url_full} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="video-overlay absolute inset-0" />
                      </a>
                    ))}
                  </div>
                : <p className="text-flockr-muted italic">No videos yet for this product.</p>
            )}
          </div>

          {/* ── Similar Products ─────────────────────────────────────── */}
          {similarProducts.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display font-bold text-white text-lg mb-4">You might also like</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {similarProducts.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky buy bar (mobile) ─────────────────────────────────── */}
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-30 p-4 glass-dark border-t border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-flockr-orange font-bold text-lg naira">₦{Number(product.price).toLocaleString()}</p>
              {product.compare_price && (
                <p className="text-flockr-muted text-xs line-through naira">₦{Number(product.compare_price).toLocaleString()}</p>
              )}
            </div>
            <button
              onClick={handleBuy}
              disabled={!product.is_in_stock || buying}
              className="btn-primary flex-1 py-3 disabled:opacity-60"
            >
              {buying ? 'Processing...' : product.is_in_stock ? '⚡ Buy Now' : 'Out of Stock'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

ProductShow.layout = page => <AppLayout>{page}</AppLayout>
