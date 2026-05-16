import { useState, useEffect } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import ProductCard from '@/Components/Product/ProductCard'
import axios from 'axios'
import {
  RiArrowLeftLine, RiArrowLeftSLine, RiArrowRightSLine,
  RiBookmarkLine, RiBookmarkFill, RiTruckLine, RiShieldCheckLine,
  RiVerifiedBadgeLine, RiArrowRightLine, RiFlashlightLine,
  RiSparkling2Line, RiVideoLine, RiImageLine, RiSubtractLine, RiAddLine,
} from 'react-icons/ri'

export default function ProductShow({ product, similarProducts = [] }) {
  const { auth } = usePage().props
  const [activeImg,      setActiveImg]      = useState(0)
  const [quantity,       setQuantity]       = useState(1)
  const [buying,         setBuying]         = useState(false)
  const [saved,          setSaved]          = useState(product.is_saved ?? false)
  const [activeTab,      setActiveTab]      = useState('description')
  const [sellerProducts, setSellerProducts] = useState([])

  // Build full image URLs — prefer model accessor, fall back to raw array
  const r2Base = typeof window !== 'undefined' && window.flockrConfig?.r2Url
    ? window.flockrConfig.r2Url.replace(/\/$/, '')
    : ''

  const allImages = (() => {
    if (product.image_urls?.length)   return product.image_urls
    if (product.primary_image)        return [product.primary_image]
    const raw = product.images ?? []
    if (raw.length) return raw.map(img => img.startsWith('http') ? img : `${r2Base}/${img}`)
    return []
  })()

  const totalPrice = (Number(product.price) * quantity).toLocaleString()

  // Load more products from this seller
  useEffect(() => {
    if (!product.seller?.username) return
    axios.get('/api/shop/products', { params: { per_page: 8 } })
      .then(r => {
        const others = (r.data.data ?? []).filter(p => p.seller?.username === product.seller.username && p.id !== product.id)
        setSellerProducts(others.slice(0, 8))
      })
      .catch(() => {})
  }, [product.id])

  const handleBuy = async () => {
    if (!auth?.user) { router.visit('/login'); return }
    setBuying(true)
    try {
      const { data } = await axios.post('/api/orders/checkout', { product_id: product.id, quantity })
      window.location.href = data.authorization_url
    } catch (err) {
      alert(err.response?.data?.message ?? 'Checkout failed. Please try again.')
    } finally { setBuying(false) }
  }

  const handleSave = async () => {
    if (!auth?.user) { router.visit('/login'); return }
    setSaved(s => !s)
    await axios.post(`/api/products/${product.id}/save`).catch(() => setSaved(s => !s))
  }

  const prevImg = () => setActiveImg(i => (i - 1 + allImages.length) % allImages.length)
  const nextImg = () => setActiveImg(i => (i + 1) % allImages.length)

  return (
    <>
      <Head title={product.name} />

      <div className="h-screen overflow-y-auto scroll-hidden bg-flockr-black">

        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-flockr-black/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-white/[0.06] transition-colors text-flockr-muted hover:text-white">
            <RiArrowLeftLine size={20} />
          </button>
          <h1 className="font-display font-bold text-white text-sm truncate flex-1">{product.name}</h1>
          <button onClick={handleSave} className="p-2 rounded-full hover:bg-white/[0.06] transition-colors">
            {saved
              ? <RiBookmarkFill size={20} color="#FBBF24" />
              : <RiBookmarkLine size={20} className="text-flockr-muted" />
            }
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 pb-32 md:pb-8">
          <div className="md:grid md:grid-cols-2 md:gap-10">

            {/* ── Images ─────────────────────────────────────────────── */}
            <div className="space-y-3">

              {/* Main image + arrows */}
              <div className="aspect-square rounded-2xl overflow-hidden bg-flockr-card border border-white/[0.06] relative">
                {allImages.length > 0 && allImages[activeImg] ? (
                  <img src={allImages[activeImg]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-flockr-subtle">
                    <RiImageLine size={64} />
                  </div>
                )}

                {product.discount_percent && (
                  <span className="absolute top-3 left-3 badge badge-orange text-sm">
                    -{product.discount_percent}% OFF
                  </span>
                )}

                {/* Left / Right arrows */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImg}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors border border-white/10"
                    >
                      <RiArrowLeftSLine size={22} />
                    </button>
                    <button
                      onClick={nextImg}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors border border-white/10"
                    >
                      <RiArrowRightSLine size={22} />
                    </button>

                    {/* Dot indicators */}
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                      {allImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImg(i)}
                          style={{
                            width: i === activeImg ? 18 : 6,
                            height: 6, borderRadius: 3, padding: 0, border: 'none', cursor: 'pointer',
                            background: i === activeImg ? '#FF6B35' : 'rgba(255,255,255,0.4)',
                            transition: 'all 0.2s',
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail strip — same as original */}
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
                      {img
                        ? <img src={img} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-flockr-card" />
                      }
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Product info ────────────────────────────────────────── */}
            <div className="space-y-5 mt-5 md:mt-0">

              {product.category && (
                <div className="flex items-center gap-1.5 text-xs text-flockr-muted">
                  <Link href="/shop" className="hover:text-white transition-colors">Shop</Link>
                  <span>/</span>
                  <span className="text-white">{product.category.name}</span>
                </div>
              )}

              <h1 className="font-display font-bold text-white text-2xl leading-snug">{product.name}</h1>

              <div className="flex items-end gap-3">
                <span className="text-flockr-orange font-display font-bold text-3xl">
                  ₦{Number(product.price).toLocaleString()}
                </span>
                {product.compare_price && (
                  <span className="text-flockr-muted text-lg line-through mb-0.5">
                    ₦{Number(product.compare_price).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${product.is_in_stock ? 'bg-flockr-green' : 'bg-flockr-red'}`} />
                <span className={`text-sm font-medium ${product.is_in_stock ? 'text-flockr-green' : 'text-flockr-red'}`}>
                  {product.is_in_stock ? `In Stock (${product.stock_quantity} left)` : 'Out of Stock'}
                </span>
              </div>

              {product.attributes && Object.keys(product.attributes).length > 0 && (
                <div className="space-y-3">
                  {Object.entries(product.attributes).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-flockr-muted text-xs uppercase tracking-wider mb-1.5">{key}</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(val)
                          ? val.map(v => <span key={v} className="px-3 py-1.5 rounded-xl border border-white/[0.1] text-white text-sm hover:border-flockr-orange cursor-pointer transition-colors">{v}</span>)
                          : <span className="px-3 py-1.5 rounded-xl border border-white/[0.1] text-white text-sm">{val}</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {product.is_in_stock && (
                <div className="flex items-center gap-3">
                  <span className="text-flockr-muted text-sm">Qty</span>
                  <div className="flex items-center gap-1 bg-flockr-card rounded-xl border border-white/[0.08]">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-2.5 text-flockr-muted hover:text-white transition-colors flex items-center">
                      <RiSubtractLine size={16} />
                    </button>
                    <span className="px-3 text-white font-semibold text-sm min-w-[2ch] text-center">{quantity}</span>
                    <button onClick={() => setQuantity(q => Math.min(product.stock_quantity, q + 1))} className="px-3 py-2.5 text-flockr-muted hover:text-white transition-colors flex items-center">
                      <RiAddLine size={16} />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleBuy}
                  disabled={!product.is_in_stock || buying}
                  className="btn-primary flex-1 py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-2xl"
                >
                  {buying ? (
                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Processing...</>
                  ) : product.is_in_stock
                    ? <><RiFlashlightLine size={18} /> Buy Now · ₦{totalPrice}</>
                    : 'Out of Stock'
                  }
                </button>
                <button onClick={handleSave} className="btn-ghost px-4 py-3.5 rounded-2xl flex items-center gap-1.5">
                  {saved
                    ? <><RiBookmarkFill size={17} color="#FBBF24" /> Saved</>
                    : <><RiBookmarkLine size={17} /> Save</>
                  }
                </button>
              </div>

              <div className="bg-flockr-card rounded-2xl border border-white/[0.06] p-4 space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <RiTruckLine size={18} color="#FF6B35" className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">
                      {Number(product.shipping_fee) === 0 ? 'Free Shipping' : `₦${Number(product.shipping_fee).toLocaleString()} delivery`}
                    </p>
                    <p className="text-flockr-muted text-xs mt-0.5">
                      {product.ships_nationwide ? 'Ships nationwide across Nigeria' : `Ships from ${product.location ?? 'Nigeria'}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <RiShieldCheckLine size={18} color="#10B981" className="shrink-0 mt-0.5" />
                  <p className="text-flockr-muted text-xs">Secure payment via Paystack. Buyer protection included.</p>
                </div>
              </div>

              <Link
                href={`/@${product.seller?.username}`}
                className="flex items-center gap-3 p-3.5 bg-flockr-card rounded-2xl border border-white/[0.06] hover:border-white/[0.14] transition-all group"
              >
                <img
                  src={product.seller?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(product.seller?.name ?? 'S')}&background=1a1a1a`}
                  alt={product.seller?.name}
                  className="w-11 h-11 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-white font-semibold text-sm">{product.seller?.name}</p>
                    {product.seller?.is_verified && <RiVerifiedBadgeLine size={14} color="#FF6B35" />}
                  </div>
                  <p className="text-flockr-muted text-xs">
                    @{product.seller?.username}
                    {product.seller?.total_sales > 0 && ` · ${Number(product.seller.total_sales).toLocaleString()} sales`}
                  </p>
                </div>
                <RiArrowRightLine size={16} className="text-flockr-muted group-hover:text-white transition-colors" />
              </Link>
            </div>
          </div>

          {/* ── Tabs ────────────────────────────────────────────────── */}
          <div className="mt-8 border-b border-white/[0.06]">
            <div className="flex gap-6">
              {[
                { key: 'description',    label: 'Description' },
                { key: 'ai_description', label: 'AI Summary',  Icon: RiSparkling2Line },
                { key: 'videos',         label: 'Videos',      Icon: RiVideoLine },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`pb-3 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === key ? 'tab-active text-white' : 'text-flockr-muted hover:text-white'
                  }`}
                >
                  {Icon && <Icon size={13} />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 text-flockr-muted text-sm leading-relaxed whitespace-pre-line">
            {activeTab === 'description' && (product.description || 'No description provided.')}
            {activeTab === 'ai_description' && (
              product.ai_description ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-flockr-orange mb-3">
                    <RiSparkling2Line size={14} />
                    <span className="text-xs font-medium">AI-generated summary</span>
                  </div>
                  <p>{product.ai_description}</p>
                </div>
              ) : <p className="italic">AI summary is being generated...</p>
            )}
            {activeTab === 'videos' && (
              product.videos?.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {product.videos.map(v => (
                    <a key={v.id} href={`/video/${v.id}`} className="relative aspect-[9/16] rounded-2xl overflow-hidden group">
                      {v.thumbnail_url_full && <img src={v.thumbnail_url_full} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                      <div className="video-overlay absolute inset-0" />
                    </a>
                  ))}
                </div>
              ) : <p className="italic">No videos yet for this product.</p>
            )}
          </div>

          {/* ── More from this seller ────────────────────────────────── */}
          {sellerProducts.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-white text-lg">
                  More from @{product.seller?.username}
                </h2>
                <Link href={`/@${product.seller?.username}`} className="text-flockr-orange text-sm hover:underline flex items-center gap-1">
                  View all <RiArrowRightLine size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sellerProducts.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}

          {/* ── You might also like ──────────────────────────────────── */}
          {similarProducts.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display font-bold text-white text-lg mb-4">You might also like</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {similarProducts.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}
        </div>

        {/* Mobile sticky buy bar */}
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-30 p-4 glass-dark border-t border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-flockr-orange font-bold text-lg">₦{Number(product.price).toLocaleString()}</p>
              {product.compare_price && (
                <p className="text-flockr-muted text-xs line-through">₦{Number(product.compare_price).toLocaleString()}</p>
              )}
            </div>
            <button
              onClick={handleBuy}
              disabled={!product.is_in_stock || buying}
              className="btn-primary flex-1 py-3 rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {buying ? 'Processing...' : product.is_in_stock ? `Buy Now · ₦${totalPrice}` : 'Out of Stock'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

ProductShow.layout = page => <AppLayout>{page}</AppLayout>