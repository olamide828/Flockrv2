import { useState, useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import ProductCard from '@/Components/Product/ProductCard'
import axios from 'axios'

const SORT_OPTIONS = [
  { value: 'popular',    label: '🔥 Most Popular' },
  { value: 'newest',     label: '🆕 Newest First' },
  { value: 'price_asc',  label: '💰 Price: Low → High' },
  { value: 'price_desc', label: '💰 Price: High → Low' },
]

export default function Shop({ categories = [], featuredProducts = [] }) {
  const [products,       setProducts]       = useState(featuredProducts)
  const [loading,        setLoading]        = useState(false)
  const [selectedCat,    setSelectedCat]    = useState(null)
  const [sort,           setSort]           = useState('popular')
  const [priceRange,     setPriceRange]     = useState([0, 500000])
  const [condition,      setCondition]      = useState('')
  const [viewMode,       setViewMode]       = useState('grid')
  const [page,           setPage]           = useState(1)
  const [hasMore,        setHasMore]        = useState(true)

  useEffect(() => {
    fetchProducts(true)
  }, [selectedCat, sort, condition])

  const fetchProducts = async (reset = false) => {
    setLoading(true)
    const currentPage = reset ? 1 : page
    if (reset) setPage(1)
    try {
      const { data } = await axios.get('/api/shop/products', {
        params: {
          category_id: selectedCat,
          sort,
          condition: condition || undefined,
          price_min: priceRange[0] || undefined,
          price_max: priceRange[1] < 500000 ? priceRange[1] : undefined,
          page: currentPage,
          per_page: 24,
        }
      })
      if (reset) {
        setProducts(data.data)
      } else {
        setProducts(prev => [...prev, ...data.data])
      }
      setHasMore(data.current_page < data.last_page)
      if (!reset) setPage(p => p + 1)
    } catch {
      // keep existing
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head title="Shop" />
      <div className="h-screen flex bg-flockr-black overflow-hidden">

        {/* ── Left sidebar: filters (desktop) ─────────────────────── */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/[0.06] overflow-y-auto scroll-hidden p-5 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-flockr-muted uppercase tracking-wider mb-3">Categories</h3>
            <div className="space-y-0.5">
              <button
                onClick={() => setSelectedCat(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedCat ? 'bg-flockr-orange/10 text-flockr-orange font-medium' : 'text-flockr-muted hover:text-white hover:bg-white/[0.04]'}`}
              >
                All Categories
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${selectedCat === cat.id ? 'bg-flockr-orange/10 text-flockr-orange font-medium' : 'text-flockr-muted hover:text-white hover:bg-white/[0.04]'}`}
                >
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-flockr-muted uppercase tracking-wider mb-3">Condition</h3>
            <div className="space-y-0.5">
              {[{ v: '', l: 'Any' }, { v: 'new', l: '✨ New' }, { v: 'used', l: '🔄 Used' }, { v: 'refurbished', l: '🛠 Refurbished' }].map(c => (
                <button
                  key={c.v}
                  onClick={() => setCondition(c.v)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${condition === c.v ? 'bg-flockr-orange/10 text-flockr-orange font-medium' : 'text-flockr-muted hover:text-white hover:bg-white/[0.04]'}`}
                >
                  {c.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-flockr-muted uppercase tracking-wider mb-3">Max Price</h3>
            <div className="space-y-2">
              {[5000, 10000, 25000, 50000, 100000, 500000].map(p => (
                <button
                  key={p}
                  onClick={() => setPriceRange([0, p])}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${priceRange[1] === p ? 'bg-flockr-orange/10 text-flockr-orange font-medium' : 'text-flockr-muted hover:text-white hover:bg-white/[0.04]'}`}
                >
                  {p === 500000 ? 'Any price' : `Under ₦${(p).toLocaleString()}`}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main area ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="shrink-0 border-b border-white/[0.06] px-5 py-3 flex items-center gap-3">
            {/* Mobile category scroll */}
            <div className="md:hidden flex gap-2 overflow-x-auto scroll-hidden flex-1">
              <button
                onClick={() => setSelectedCat(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${!selectedCat ? 'bg-flockr-orange text-white' : 'bg-flockr-card text-flockr-muted border border-white/[0.08]'}`}
              >
                All
              </button>
              {categories.slice(0, 6).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${selectedCat === cat.id ? 'bg-flockr-orange text-white' : 'bg-flockr-card text-flockr-muted border border-white/[0.08]'}`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-3 shrink-0">
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="bg-flockr-card border border-white/[0.08] text-white text-xs rounded-lg px-3 py-2 outline-none"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div className="flex items-center gap-1">
                {['grid', 'list'].map(m => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={`p-2 rounded-lg transition-colors ${viewMode === m ? 'text-flockr-orange bg-flockr-orange/10' : 'text-flockr-muted hover:text-white'}`}
                  >
                    {m === 'grid'
                      ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z"/></svg>
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.008v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.008v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.008v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    }
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="flex-1 overflow-y-auto scroll-hidden px-5 py-5 pb-24 md:pb-5">
            {loading && products.length === 0 ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-3'}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-flockr-card rounded-flockr border border-white/[0.06] overflow-hidden">
                    <div className="skeleton aspect-square" />
                    <div className="p-3 space-y-2">
                      <div className="skeleton h-3 rounded w-3/4" />
                      <div className="skeleton h-3 rounded w-1/2" />
                      <div className="skeleton h-4 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <span className="text-5xl">🛍</span>
                <p className="text-white font-display font-bold text-lg">No products found</p>
                <p className="text-flockr-muted text-sm">Try changing your filters.</p>
              </div>
            ) : (
              <>
                <div className={viewMode === 'grid'
                  ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'
                  : 'space-y-3'
                }>
                  {products.map(p => <ProductCard key={p.id} product={p} layout={viewMode === 'list' ? 'list' : 'grid'} />)}
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => fetchProducts(false)}
                      disabled={loading}
                      className="btn-ghost px-8 py-3"
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

Shop.layout = page => <AppLayout>{page}</AppLayout>
