// Shop/Index.jsx — Refined
import { useState, useEffect, useRef } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import ProductCard from '@/Components/Product/ProductCard'
import axios from 'axios'
import {
  HiFire, HiClock, HiCurrencyDollar, HiSparkles, HiArrowPath,
  HiWrench, HiShoppingBag, HiSquares2X2, HiBars3, HiChevronDown,
  HiMagnifyingGlass, HiXMark, HiAdjustmentsHorizontal,
} from 'react-icons/hi2'
import { RiCloseLine } from 'react-icons/ri'

const SORT_OPTIONS = [
  { value: 'popular',    label: 'Most Popular',       icon: <HiFire className="text-orange-500" /> },
  { value: 'newest',     label: 'Newest First',       icon: <HiClock className="text-blue-400" /> },
  { value: 'price_asc',  label: 'Price: Low to High', icon: <HiCurrencyDollar className="text-green-500" /> },
  { value: 'price_desc', label: 'Price: High to Low', icon: <HiCurrencyDollar className="text-green-500" /> },
]

const PRICE_PRESETS = [
  { label: 'Any price',   max: 500000 },
  { label: 'Under ₦5k',  max: 5000   },
  { label: 'Under ₦10k', max: 10000  },
  { label: 'Under ₦25k', max: 25000  },
  { label: 'Under ₦50k', max: 50000  },
  { label: 'Under ₦100k',max: 100000 },
]

const CONDITIONS = [
  { v: '',            l: 'Any'         },
  { v: 'new',         l: 'New'         },
  { v: 'used',        l: 'Used'        },
  { v: 'refurbished', l: 'Refurbished' },
]

export default function Shop({ categories = [], featuredProducts = [] }) {
  const [products,    setProducts]    = useState(featuredProducts)
  const [loading,     setLoading]     = useState(false)
  const [selectedCat, setSelectedCat] = useState(null)
  const [sort,        setSort]        = useState('popular')
  const [priceMax,    setPriceMax]    = useState(500000)
  const [condition,   setCondition]   = useState('')
  const [viewMode,    setViewMode]    = useState('grid')
  const [page,        setPage]        = useState(1)
  const [hasMore,     setHasMore]     = useState(true)
  const [sortOpen,    setSortOpen]    = useState(false)
  const [search,      setSearch]      = useState('')
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const debounceRef = useRef(null)
  const sortRef     = useRef(null)

  // Close sort on outside click
  useEffect(() => {
    const fn = (e) => { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const debounceSearch = (q) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchProducts(true, q), 350)
  }

  useEffect(() => { fetchProducts(true) }, [selectedCat, sort, condition, priceMax])

  const fetchProducts = async (reset = false, q = search) => {
    setLoading(true)
    const pg = reset ? 1 : page
    if (reset) setPage(1)
    try {
      const { data } = await axios.get('/api/shop/products', {
        params: {
          q:           q || undefined,
          category_id: selectedCat,
          sort,
          condition:   condition || undefined,
          price_max:   priceMax < 500000 ? priceMax : undefined,
          page:        pg,
          per_page:    24,
        }
      })
      reset ? setProducts(data.data) : setProducts(prev => [...prev, ...data.data])
      setHasMore(data.current_page < data.last_page)
      if (!reset) setPage(p => p + 1)
    } catch {/**/ } finally { setLoading(false) }
  }

  const activeSort         = SORT_OPTIONS.find(o => o.value === sort)
  const activeFiltersCount = [selectedCat !== null, condition !== '', priceMax !== 500000].filter(Boolean).length
  const clearFilters       = () => { setSelectedCat(null); setCondition(''); setPriceMax(500000) }

  return (
    <>
      <Head title="Shop" />

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} className="md:hidden">
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
            onClick={() => setDrawerOpen(false)}
          />
          <div style={{ position: 'relative', marginLeft: 'auto', width: 272, height: '100%', background: '#0d0d0d', borderLeft: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Filters</span>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}>
                <RiCloseLine size={20} />
              </button>
            </div>
            <SidebarBody
              categories={categories} selectedCat={selectedCat} setSelectedCat={setSelectedCat}
              condition={condition} setCondition={setCondition} priceMax={priceMax} setPriceMax={setPriceMax}
              activeFiltersCount={activeFiltersCount} clearFilters={clearFilters}
            />
          </div>
        </div>
      )}

      <div className="h-screen flex bg-flockr-black overflow-hidden">

        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/[0.06] overflow-y-auto scroll-hidden">
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Filters</span>
            {activeFiltersCount > 0 && (
              <span style={{ background: '#ff5c00', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '2px 7px' }}>
                {activeFiltersCount}
              </span>
            )}
          </div>
          <div style={{ flex: 1, padding: '18px 14px' }}>
            <SidebarBody
              categories={categories} selectedCat={selectedCat} setSelectedCat={setSelectedCat}
              condition={condition} setCondition={setCondition} priceMax={priceMax} setPriceMax={setPriceMax}
              activeFiltersCount={activeFiltersCount} clearFilters={clearFilters}
            />
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="shrink-0 border-b border-white/[0.06]">

            {/* Row 1: title / sort / view */}
            <div style={{ padding: '12px 20px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>

              {/* Mobile filter button */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden"
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '7px 12px', color: 'rgba(255,255,255,0.55)', fontSize: 12, cursor: 'pointer', position: 'relative', flexShrink: 0 }}
              >
                <HiAdjustmentsHorizontal style={{ width: 14, height: 14 }} />
                Filters
                {activeFiltersCount > 0 && (
                  <span style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, background: '#ff5c00', borderRadius: '50%', fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <span className="hidden md:block" style={{ color: '#fff', fontWeight: 800, fontSize: 18, flex: 1 }}>Shop</span>
              <div style={{ flex: 1 }} className="md:hidden" />

              {/* Sort dropdown */}
              <div style={{ position: 'relative' }} ref={sortRef}>
                <button
                  onClick={() => setSortOpen(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 12, borderRadius: 10, padding: '7px 12px', cursor: 'pointer', minWidth: 142, outline: 'none' }}
                >
                  {activeSort.icon}
                  <span style={{ flex: 1, textAlign: 'left' }}>{activeSort.label}</span>
                  <HiChevronDown style={{ width: 13, height: 13, transition: 'transform 0.2s', transform: sortOpen ? 'rotate(180deg)' : 'none' }} />
                </button>
                {sortOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 176, background: '#111', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.7)', zIndex: 40, overflow: 'hidden', padding: '4px 0' }}>
                    {SORT_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 12, cursor: 'pointer', border: 'none', background: sort === o.value ? 'rgba(255,92,0,0.07)' : 'none', color: sort === o.value ? '#ff5c00' : 'rgba(255,255,255,0.7)', fontWeight: sort === o.value ? 600 : 400 }}
                        onClick={() => { setSort(o.value); setSortOpen(false) }}
                      >
                        {o.icon} {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View toggle */}
              <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: 3, borderRadius: 10 }}>
                {[{ m: 'grid', Icon: HiSquares2X2 }, { m: 'list', Icon: HiBars3 }].map(({ m, Icon }) => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    style={{ padding: '5px 6px', borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', background: viewMode === m ? 'rgba(255,255,255,0.09)' : 'none', color: viewMode === m ? '#ff5c00' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s' }}
                  >
                    <Icon style={{ width: 15, height: 15 }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Search */}
            <div style={{ padding: '0 20px 12px' }}>
              <div style={{ position: 'relative' }}>
                <HiMagnifyingGlass style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.22)', width: 15, height: 15, pointerEvents: 'none' }} />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); debounceSearch(e.target.value) }}
                  placeholder="Search products, sellers, brands…"
                  style={{ width: '100%', height: 40, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, paddingLeft: 38, paddingRight: search ? 36 : 14, fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(255,92,0,0.45)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
                />
                {search && (
                  <button
                    onClick={() => { setSearch(''); fetchProducts(true, '') }}
                    style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 2, display: 'flex', lineHeight: 1 }}
                  >
                    <HiXMark style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>
            </div>

            {/* Row 3: Mobile category pills */}
            <div className="md:hidden" style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 20px 12px' }}>
              {[{ id: null, name: 'All' }, ...categories].map(cat => (
                <button
                  key={cat.id ?? 'all'}
                  onClick={() => setSelectedCat(cat.id ?? null)}
                  style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer', border: 'none', background: selectedCat === (cat.id ?? null) ? '#ff5c00' : 'rgba(255,255,255,0.05)', color: selectedCat === (cat.id ?? null) ? '#fff' : 'rgba(255,255,255,0.5)', boxShadow: selectedCat === (cat.id ?? null) ? '0 0 12px rgba(255,92,0,0.35)' : 'none', transition: 'all 0.15s' }}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Row 4: Active filter chips (desktop only) */}
            {activeFiltersCount > 0 && (
              <div className="hidden md:flex" style={{ alignItems: 'center', gap: 8, padding: '0 20px 11px', flexWrap: 'wrap' }}>
                {selectedCat !== null && (
                  <ActiveChip onRemove={() => setSelectedCat(null)}>
                    {categories.find(c => c.id === selectedCat)?.name}
                  </ActiveChip>
                )}
                {condition !== '' && (
                  <ActiveChip onRemove={() => setCondition('')}>
                    {CONDITIONS.find(c => c.v === condition)?.l}
                  </ActiveChip>
                )}
                {priceMax !== 500000 && (
                  <ActiveChip onRemove={() => setPriceMax(500000)}>
                    {PRICE_PRESETS.find(p => p.max === priceMax)?.label}
                  </ActiveChip>
                )}
                <button
                  onClick={clearFilters}
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Products */}
          <div className="flex-1 overflow-y-auto scroll-hidden" style={{ padding: '20px 20px 96px' }}>

            {/* {!loading && products.length > 0 && (
              <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, marginBottom: 14 }}>
                {products.length} product{products.length !== 1 ? 's' : ''}
                {search && <span style={{ color: 'rgba(255,255,255,0.45)' }}> for &ldquo;{search}&rdquo;</span>}
              </p>
            )} */}

            {loading && products.length === 0 ? (
              <div style={gridSt(viewMode)}>
                {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} viewMode={viewMode} />)}
              </div>
            ) : products.length === 0 ? (
              <EmptyState search={search} onClear={() => { setSearch(''); fetchProducts(true, '') }} />
            ) : (
              <>
                <div style={gridSt(viewMode)}>
                  {products.map(p => (
                    <ProductCard key={p.id} product={p} layout={viewMode === 'list' ? 'list' : 'grid'} />
                  ))}
                  {/* Inline skeletons while loading more */}
                  {loading && Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={`s${i}`} viewMode={viewMode} />
                  ))}
                </div>

                {hasMore && !loading && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
                    <button onClick={() => fetchProducts(false)} className="btn-ghost" style={{ padding: '12px 40px', fontSize: 13 }}>
                      Load more
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function gridSt(viewMode) {
  return viewMode === 'list'
    ? { display: 'flex', flexDirection: 'column', gap: 10 }
    : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }
}

function SidebarBody({ categories, selectedCat, setSelectedCat, condition, setCondition, priceMax, setPriceMax, activeFiltersCount, clearFilters }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <SideSection label="Categories">
        <SideBtn active={!selectedCat} onClick={() => setSelectedCat(null)}>All Categories</SideBtn>
        {categories.map(cat => (
          <SideBtn key={cat.id} active={selectedCat === cat.id} onClick={() => setSelectedCat(cat.id)}>
            {cat.icon && <span style={{ marginRight: 6 }}>{cat.icon}</span>}
            {cat.name}
          </SideBtn>
        ))}
      </SideSection>

      <SideSection label="Condition">
        {CONDITIONS.map(c => (
          <SideBtn key={c.v} active={condition === c.v} onClick={() => setCondition(c.v)}>{c.l}</SideBtn>
        ))}
      </SideSection>

      <SideSection label="Max Price">
        {PRICE_PRESETS.map(p => (
          <SideBtn key={p.max} active={priceMax === p.max} onClick={() => setPriceMax(p.max)}>{p.label}</SideBtn>
        ))}
      </SideSection>

      {activeFiltersCount > 0 && (
        <button
          onClick={clearFilters}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}
        >
          Clear {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}

function SideSection({ label, children }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', margin: '0 0 10px' }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {children}
      </div>
    </div>
  )
}

function SideBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: 10, fontSize: 13, cursor: 'pointer', border: active ? '1px solid rgba(255,92,0,0.2)' : '1px solid transparent', background: active ? 'rgba(255,92,0,0.08)' : 'none', color: active ? '#ff5c00' : 'rgba(255,255,255,0.5)', fontWeight: active ? 600 : 400, transition: 'all 0.15s' }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' } }}
    >
      {children}
    </button>
  )
}

function ActiveChip({ children, onRemove }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(255,92,0,0.1)', border: '1px solid rgba(255,92,0,0.25)', borderRadius: 999, fontSize: 11, color: '#ff5c00', fontWeight: 600 }}>
      {children}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#ff5c00', cursor: 'pointer', padding: 0, display: 'flex', lineHeight: 1 }}>
        <HiXMark style={{ width: 12, height: 12 }} />
      </button>
    </span>
  )
}

function Skeleton({ viewMode }) {
  if (viewMode === 'list') {
    return (
      <div className="bg-flockr-card rounded-flockr border border-white/[0.06]" style={{ display: 'flex', gap: 14, padding: 12 }}>
        <div className="skeleton" style={{ width: 80, height: 80, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
          <div className="skeleton" style={{ height: 13, borderRadius: 6, width: '75%' }} />
          <div className="skeleton" style={{ height: 11, borderRadius: 6, width: '50%' }} />
          <div className="skeleton" style={{ height: 15, borderRadius: 6, width: '30%', marginTop: 6 }} />
        </div>
      </div>
    )
  }
  return (
    <div className="bg-flockr-card rounded-flockr border border-white/[0.06]" style={{ overflow: 'hidden' }}>
      <div className="skeleton" style={{ aspectRatio: '1' }} />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 12, borderRadius: 5, width: '75%' }} />
        <div className="skeleton" style={{ height: 11, borderRadius: 5, width: '50%' }} />
        <div className="skeleton" style={{ height: 14, borderRadius: 5, width: '35%', marginTop: 4 }} />
      </div>
    </div>
  )
}

function EmptyState({ search, onClear }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 360, gap: 14, textAlign: 'center', padding: '60px 0' }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <HiShoppingBag style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.1)' }} />
      </div>
      <p style={{ color: '#fff', fontWeight: 800, fontSize: 17, margin: 0 }}>
        {search ? `No results for "${search}"` : 'Nothing here yet'}
      </p>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0, maxWidth: 260, lineHeight: 1.6 }}>
        {search ? 'Try a different search term or adjust your filters.' : 'Try changing your filters.'}
      </p>
      {search && (
        <button onClick={onClear} className="btn-ghost" style={{ marginTop: 8, padding: '10px 28px', fontSize: 13 }}>
          Clear search
        </button>
      )}
    </div>
  )
}