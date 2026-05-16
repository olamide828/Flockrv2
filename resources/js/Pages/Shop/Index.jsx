import { useState, useEffect, useRef } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import ProductCard from '@/Components/Product/ProductCard'
import axios from 'axios'

import { 
  HiFire, 
  HiClock, 
  HiCurrencyDollar, 
  HiSparkles, 
  HiArrowPath, 
  HiWrench, 
  HiShoppingBag,
  HiSquares2X2, 
  HiBars3,
  HiChevronDown
} from "react-icons/hi2";

const SORT_OPTIONS = [
  { value: 'popular',   label: 'Most Popular',   icon: <HiFire className="text-orange-500" /> },
  { value: 'newest',    label: 'Newest First',   icon: <HiClock className="text-blue-400" /> },
  { value: 'price_asc',  label: 'Price: Low-High', icon: <HiCurrencyDollar className="text-green-500" /> },
  { value: 'price_desc', label: 'Price: High-Low', icon: <HiCurrencyDollar className="text-green-500" /> },
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
  const [sortOpen,       setSortOpen]       = useState(false)

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

  const activeSort = SORT_OPTIONS.find(o => o.value === sort)

  return (
    <>
      <Head title="Shop" />
      <div className="h-screen flex bg-flockr-black overflow-hidden">

        {/* ── Left sidebar ─────────────────────── */}
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
              {[
                { v: '', l: 'Any', i: null }, 
                { v: 'new', l: 'New', i: <HiSparkles className="text-yellow-400" /> }, 
                { v: 'used', l: 'Used', i: <HiArrowPath className="text-blue-400" /> }, 
                { v: 'refurbished', l: 'Refurbished', i: <HiWrench className="text-gray-400" /> }
              ].map(c => (
                <button
                  key={c.v}
                  onClick={() => setCondition(c.v)}
                  className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm transition-colors ${condition === c.v ? 'bg-flockr-orange/10 text-flockr-orange font-medium' : 'text-flockr-muted hover:text-white hover:bg-white/[0.04]'}`}
                >
                  {c.i}
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
          <div className="shrink-0 border-b border-white/[0.06] px-5 py-3 flex items-center gap-3">
            
            <div className="md:hidden flex gap-2 overflow-x-auto scroll-hidden flex-1">
              <button
                onClick={() => setSelectedCat(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${!selectedCat ? 'bg-flockr-orange text-white' : 'bg-flockr-card text-flockr-muted border border-white/[0.08]'}`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${selectedCat === cat.id ? 'bg-flockr-orange text-white' : 'bg-flockr-card text-flockr-muted border border-white/[0.08]'}`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            <div className=" flex justify-between items-center flex-1 gap-4">
              <h1>Shop</h1>
              {/* Custom Dropdown to support Icons */}
              <div className="relative">
                <button 
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-2 bg-black border border-white/[0.08] text-white text-xs rounded-lg px-3 py-2 outline-none min-w-[140px]"
                >
                  {activeSort.icon}
                  {activeSort.label}
                  <HiChevronDown className={`ml-auto transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {sortOpen && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-black border border-white/[0.08] rounded-lg shadow-xl z-50 overflow-hidden">
                    {SORT_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-white hover:bg-white/5 transition-colors"
                        onClick={() => {
                          setSort(o.value);
                          setSortOpen(false);
                        }}
                      >
                        {o.icon} {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg">
                <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'text-flockr-orange bg-white/10' : 'text-flockr-muted hover:text-white'}`}
                >
                    <HiSquares2X2 className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'text-flockr-orange bg-white/10' : 'text-flockr-muted hover:text-white'}`}
                >
                    <HiBars3 className="w-4 h-4" />
                </button>
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
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <HiShoppingBag className="text-6xl text-flockr-muted opacity-20" />
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