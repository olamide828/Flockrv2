import { useState, useEffect, useRef } from 'react'
import { Head, router, usePage, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import ProductCard from '@/Components/Product/ProductCard'
import axios from 'axios'

import {
  RiFireLine, RiShirtLine, RiPaintBrushLine, RiSmartphoneLine,
  RiRestaurantLine, RiHome4Line, RiCapsuleLine, RiHandbagLine,
  RiBearSmileLine, RiSearchLine, RiCloseLine, RiGridLine,
  RiListCheck2, RiFlashlightLine, RiVerifiedBadgeLine,
  RiArrowDownSLine, RiPlayCircleLine, RiUser3Line, RiBookLine,
  RiGamepadLine, RiCarLine, RiFootballLine, RiLeafLine,
  RiPaletteLine, RiApps2Line, RiArrowLeftLine, RiTimeLine,
  RiDeleteBinLine, RiArrowRightSLine, RiRocketLine, RiStarLine,
  RiShoppingBag3Line,
} from 'react-icons/ri'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: null, label: 'All',         icon: RiApps2Line,       color: '#FF6B35' },
  { id: 1,    label: 'Fashion',     icon: RiShirtLine,       color: '#EC4899' },
  { id: 2,    label: 'Beauty',      icon: RiPaintBrushLine,  color: '#A855F7' },
  { id: 3,    label: 'Electronics', icon: RiSmartphoneLine,  color: '#3B82F6' },
  { id: 4,    label: 'Food',        icon: RiRestaurantLine,  color: '#F59E0B' },
  { id: 5,    label: 'Home',        icon: RiHome4Line,       color: '#10B981' },
  { id: 6,    label: 'Health',      icon: RiCapsuleLine,     color: '#EF4444' },
  { id: 7,    label: 'Accessories', icon: RiHandbagLine,     color: '#F97316' },
  { id: 8,    label: 'Kids',        icon: RiBearSmileLine,   color: '#06B6D4' },
  { id: 9,    label: 'Books',       icon: RiBookLine,        color: '#84CC16' },
  { id: 10,   label: 'Gaming',      icon: RiGamepadLine,     color: '#8B5CF6' },
  { id: 11,   label: 'Auto',        icon: RiCarLine,         color: '#6B7280' },
  { id: 12,   label: 'Sports',      icon: RiFootballLine,    color: '#14B8A6' },
  { id: 13,   label: 'Organic',     icon: RiLeafLine,        color: '#22C55E' },
  { id: 14,   label: 'Art',         icon: RiPaletteLine,     color: '#F43F5E' },
]

const SORT_OPTIONS = [
  { value: 'relevance',  label: 'Most Relevant' },
  { value: 'popular',    label: 'Most Popular' },
  { value: 'newest',     label: 'Newest First' },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
]

const CONDITION_OPTIONS = [
  { value: '',            label: 'Any Condition' },
  { value: 'new',         label: 'New Only' },
  { value: 'used',        label: 'Used' },
  { value: 'refurbished', label: 'Refurbished' },
]

const HISTORY_KEY = 'flockr_search_history'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtCount(num) {
  if (!num) return '0'
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.0', '')}M`
  if (num >= 1_000)     return `${(num / 1_000).toFixed(1).replace('.0', '')}K`
  return num.toString()
}

function pl(n, singular, plural) {
  return Number(n) === 1 ? singular : plural
}

function getHistory()         { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] } }
function addToHistory(q)      { if (!q?.trim()) return; const h = getHistory().filter(x => x !== q).slice(0, 9); localStorage.setItem(HISTORY_KEY, JSON.stringify([q, ...h])) }
function removeFromHistory(q) { localStorage.setItem(HISTORY_KEY, JSON.stringify(getHistory().filter(x => x !== q))) }

// ─────────────────────────────────────────────────────────────────────────────
// Search Overlay (unchanged from your version)
// ─────────────────────────────────────────────────────────────────────────────
function SearchOverlay({ initialQuery = '', onClose, onSearch }) {
  const [val,     setVal]     = useState(initialQuery)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState(getHistory)
  const debRef   = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  useEffect(() => {
    clearTimeout(debRef.current)
    if (!val.trim()) { setResults(null); return }
    debRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await axios.get('/api/search', { params: { q: val, limit: 12 } })
        setResults(data)
      } catch { setResults(null) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(debRef.current)
  }, [val])

  const commit       = (q) => { addToHistory(q); onSearch(q); onClose() }
  const handleSubmit = (e) => { e.preventDefault(); if (val.trim()) commit(val.trim()) }
  const pickHistory  = (q) => { setVal(q); commit(q) }

  const deleteHistory = (e, q) => { e.stopPropagation(); removeFromHistory(q); setHistory(getHistory()) }
  const clearAll      = () => { localStorage.removeItem(HISTORY_KEY); setHistory([]) }

  const hasResults  = results && (results.sellers?.length || results.products?.length || results.videos?.length)
  const showHistory = !val.trim() && history.length > 0
  const showEmpty   = !val.trim() && history.length === 0

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#050505', display: 'flex', flexDirection: 'column', animation: 'overlayIn 0.22s cubic-bezier(0.32,0.72,0,1)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
          <RiArrowLeftLine size={20} />
        </button>
        <form onSubmit={handleSubmit} style={{ flex: 1, position: 'relative' }}>
          <RiSearchLine size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input ref={inputRef} value={val} onChange={e => setVal(e.target.value)} placeholder="Search products, people, videos..."
            style={{ width: '100%', height: 44, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, paddingLeft: 42, paddingRight: val ? 40 : 16, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          {val && (
            <button type="button" onClick={() => setVal('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
              <RiCloseLine size={14} />
            </button>
          )}
        </form>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {!loading && showHistory && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, margin: 0 }}>Recent</p>
              <button onClick={clearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontSize: 12, fontWeight: 600 }}>Clear all</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {history.map(q => (
                <div key={q} onClick={() => pickHistory(q)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.03)' }}>
                  <RiTimeLine size={16} color="rgba(255,255,255,0.3)" />
                  <span style={{ flex: 1, color: '#fff', fontSize: 14 }}>{q}</span>
                  <button onClick={e => deleteHistory(e, q)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', display: 'flex', padding: 4 }}><RiDeleteBinLine size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && showEmpty && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RiSearchLine size={26} color="rgba(255,255,255,0.2)" />
            </div>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: 15, margin: 0 }}>Search Flockr</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>Find products, people & videos</p>
          </div>
        )}

        {!loading && results && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {results.sellers?.length > 0 && (
              <section>
                <p style={sectionLabel}>People · {results.sellers.length} {pl(results.sellers.length, 'result', 'results')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {results.sellers.map(s => (
                    <Link key={s.id} href={`/@${s.username}`} onClick={() => { addToHistory(val.trim()); onClose() }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none' }}>
                      <img src={s.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=222`} alt={s.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                          {s.is_verified && <RiVerifiedBadgeLine size={13} color="#FF6B35" />}
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '2px 0 0' }}>@{s.username}{s.role === 'seller' && <span style={{ marginLeft: 6, color: '#FF6B35', fontWeight: 600 }}>· Seller</span>}</p>
                        {s.bio && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.bio}</p>}
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, flexShrink: 0, margin: 0, whiteSpace: 'nowrap' }}>{fmtCount(s.followers_count)} {pl(s.followers_count, 'follower', 'followers')}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {results.products?.length > 0 && (
              <section>
                <p style={sectionLabel}>Products · {results.products.length} {pl(results.products.length, 'item', 'items')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {results.products.slice(0, 8).map(p => (
                    <Link key={p.id} href={p.seller?.username ? `/@${p.seller.username}/products/${p.slug ?? p.id}` : `/products/${p.slug ?? p.id}`}
                      onClick={() => { addToHistory(val.trim()); onClose() }}
                      style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none' }}>
                      <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
                        {p.primary_image && <img src={p.primary_image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                        {p.seller?.username && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '3px 0 0' }}>@{p.seller.username}</p>}
                      </div>
                      <p style={{ color: '#FF6B35', fontSize: 15, fontWeight: 800, margin: 0, flexShrink: 0 }}>₦{Number(p.price).toLocaleString()}</p>
                    </Link>
                  ))}
                </div>
                {results.products.length > 8 && (
                  <button onClick={() => { addToHistory(val.trim()); onSearch(val.trim()); onClose() }}
                    style={{ width: '100%', marginTop: 10, padding: '11px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    See all {results.products.length} products →
                  </button>
                )}
              </section>
            )}

            {results.videos?.length > 0 && (
              <section>
                <p style={sectionLabel}>Videos · {results.videos.length} {pl(results.videos.length, 'item', 'items')}</p>
                <div className="grid grid-cols-2 lg:grid-cols-6" style={{ display: 'grid', gap: 8 }}>
                  {results.videos.slice(0, 6).map(v => <VideoThumb key={v.id} video={v} />)}
                </div>
              </section>
            )}

            {!hasResults && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12, textAlign: 'center' }}>
                <RiSearchLine size={34} color="rgba(255,255,255,0.1)" />
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 600, margin: 0 }}>No results for "{val}"</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>Try different keywords</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes overlayIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin      { to   { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const sectionLabel = { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }

// ─────────────────────────────────────────────────────────────────────────────
// Main Explore — improved discovery page
// ─────────────────────────────────────────────────────────────────────────────
export default function Explore({ trendingProducts = [], trendingVideos = [], topSellers = [] }) {
  const pageUrl = usePage().url
  const qParam  = new URLSearchParams(pageUrl.split('?')[1] ?? '').get('q') ?? ''

  const [searchOpen,   setSearchOpen]   = useState(!!qParam)
  const [inputVal,     setInputVal]     = useState(qParam)
  const [query,        setQuery]        = useState(qParam)
  const [category,     setCategory]     = useState(null)
  const [sort,         setSort]         = useState('relevance')
  const [condition,    setCondition]    = useState('')
  const [priceMax,     setPriceMax]     = useState('')
  const [viewMode,     setViewMode]     = useState('grid')
  const [activeSection,setActiveSection] = useState('all') // 'all' | 'videos' | 'products'

  const [results,  setResults]  = useState([])
  const [sellers,  setSellers]  = useState([])
  const [videos,   setVideos]   = useState(trendingVideos)
  const [loading,  setLoading]  = useState(false)

  // Hot products — sorted by views in last 24h (from trending data)
  const hotProducts  = trendingProducts.slice(0, 6)
  // New arrivals — sorted by created_at desc
  const newArrivals  = [...trendingProducts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6)
  // Top videos — sorted by views
  const topVideos    = [...trendingVideos].sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0)).slice(0, 6)
  // Rising videos — highest likes:views ratio (engagement signal)
  const risingVideos = [...trendingVideos].sort((a, b) => {
    const ra = (a.likes_count ?? 0) / Math.max(a.views_count ?? 1, 1)
    const rb = (b.likes_count ?? 0) / Math.max(b.views_count ?? 1, 1)
    return rb - ra
  }).slice(0, 3)

  const debounceRef = useRef(null)

  const hasQuery    = query.trim().length >= 1
  const isSearching = hasQuery || category !== null

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!hasQuery && category === null) {
      setResults([]); setSellers([]); setVideos(trendingVideos); return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await axios.get('/api/search', {
          params: { q: query, category_id: category, sort, condition: condition || undefined, price_max: priceMax || undefined },
        })
        setResults(data.products ?? [])
        setSellers(data.sellers ?? [])
        setVideos(data.videos ?? [])
      } catch {} finally { setLoading(false) }
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query, category, sort, condition, priceMax])

  useEffect(() => {
    if (qParam && qParam !== query) { setQuery(qParam); setInputVal(qParam) }
  }, [qParam])

  const handleOverlaySearch = (q) => {
    setQuery(q); setInputVal(q)
    router.get('/explore', { q }, { preserveState: true, replace: true })
  }

  const handleCategoryClick = (catId) => {
    setCategory(catId)
    // If no query, set a space so isSearching becomes true and filters show
    if (!query.trim() && catId !== null) setQuery(' ')
    if (catId === null) { setQuery(''); setInputVal('') }
  }

  return (
    <>
      <Head title="Explore" />

      {searchOpen && (
        <SearchOverlay
          initialQuery={inputVal}
          onClose={() => setSearchOpen(false)}
          onSearch={handleOverlaySearch}
        />
      )}

      <div className="h-full overflow-hidden bg-[#050505] text-white">
        <div className="flex h-full flex-col">

          {/* ── HEADER ─────────────────────────────────────────────────── */}
          <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050505]/95 backdrop-blur-xl">
            <div className="px-4 py-3 lg:px-6">

              {/* Title */}
              <div className="mb-3">
                <h1 className="text-[20px] font-bold tracking-tight text-white">Explore</h1>
                <p className="text-xs text-white/35 mt-0.5">Discover what's hot on Flockr</p>
              </div>

              {/* Search bar */}
              <div className="relative mb-3">
                <div onClick={() => setSearchOpen(true)} style={{ cursor: 'text' }} className="relative">
                  <RiSearchLine size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <div className="h-11 w-full rounded-2xl border border-white/[0.07] bg-[#0F0F0F] pl-11 pr-12 text-[13px] flex items-center select-none" style={{ color: query.trim() ? '#fff' : 'rgba(255,255,255,0.25)' }}>
                    {query.trim() || 'Search products, sellers, videos...'}
                  </div>
                  {query.trim() && (
                    <button type="button" onClick={e => { e.stopPropagation(); setQuery(''); setInputVal(''); setCategory(null); router.get('/explore', {}, { preserveState: true, replace: true }) }}
                      className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/35 hover:bg-white/[0.05]">
                      <RiCloseLine size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Categories — always visible, scrollable */}
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {CATEGORIES.map(cat => {
                  const active = category === cat.id
                  const Icon   = cat.icon
                  return (
                    <button key={cat.id ?? 'all'} onClick={() => handleCategoryClick(cat.id)}
                      style={{ background: active ? `${cat.color}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? cat.color + '50' : 'rgba(255,255,255,0.07)'}`, color: active ? cat.color : 'rgba(255,255,255,0.5)' }}
                      className="flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all">
                      <Icon size={13} />
                      {cat.label}
                    </button>
                  )
                })}
              </div>

              {/* Filters — only after searching */}
              {hasQuery && (
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none mt-3">
                  <NativeSelect value={sort}      onChange={setSort}      options={SORT_OPTIONS} />
                  <NativeSelect value={condition} onChange={setCondition} options={CONDITION_OPTIONS} />
                  <input type="number" placeholder="Max ₦" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                    className="h-9 w-[100px] flex-shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-xs text-white outline-none placeholder:text-white/25" />
                  <div className="ml-auto flex items-center rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
                    {[{ m: 'grid', I: RiGridLine }, { m: 'list', I: RiListCheck2 }].map(({ m, I }) => (
                      <button key={m} onClick={() => setViewMode(m)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${viewMode === m ? 'bg-white/[0.08] text-white' : 'text-white/35'}`}>
                        <I size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── BODY ────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 pb-32 pt-5 lg:px-6 space-y-10">

              {/* ── SEARCH RESULTS ──────────────────────────────────────── */}
              {isSearching && (
                <>
                  {loading && (
                    <div className="flex justify-center py-16">
                      <div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                  )}

                  {!loading && (
                    <div className="space-y-10">
                      {sellers.length > 0 && (
                        <section>
                          <SectionHeader icon={RiUser3Line} title="People" count={sellers.length} />
                          <div className="space-y-3">
                            {sellers.map(s => (
                              <Link key={s.id} href={`/@${s.username}`} style={{ textDecoration: 'none' }}
                                className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                                <img src={s.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}`} className="h-11 w-11 rounded-xl object-cover" alt={s.name} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-semibold text-white">{s.name}</p>
                                    {s.is_verified && <RiVerifiedBadgeLine size={13} color="#FF6B35" />}
                                  </div>
                                  <p className="text-xs text-white/40">@{s.username}{s.role === 'seller' && <span style={{ color: '#FF6B35', fontWeight: 600, marginLeft: 6 }}>· Seller</span>}</p>
                                </div>
                                <span className="text-xs text-white/30 shrink-0">{fmtCount(s.followers_count)} {pl(s.followers_count, 'follower', 'followers')}</span>
                              </Link>
                            ))}
                          </div>
                        </section>
                      )}

                      <section>
                        <SectionHeader icon={RiFlashlightLine} title="Products" count={results.length} />
                        {results.length > 0 ? (
                          <div className={viewMode === 'list' ? 'flex flex-col gap-4' : 'grid grid-cols-2 gap-3 lg:grid-cols-6'}>
                            {results.map(p => <ProductCard key={p.id} product={p} layout={viewMode === 'list' ? 'list' : 'grid'} />)}
                          </div>
                        ) : sellers.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-20 text-center">
                            <RiSearchLine size={34} className="text-white/15" />
                            <p className="mt-3 text-sm text-white/50">No results found</p>
                            <p className="text-xs text-white/30">Try different keywords or filters</p>
                          </div>
                        )}
                      </section>

                      {videos.length > 0 && (
                        <section>
                          <SectionHeader icon={RiPlayCircleLine} title="Videos" count={videos.length} />
                          <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
                            {videos.map(v => <VideoThumb key={v.id} video={v} />)}
                          </div>
                        </section>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── DISCOVERY PAGE (default, no search) ─────────────────── */}
              {!isSearching && !loading && (
                <>
                  {/* ── Trending videos ────────────────────────────────── */}
                  {topVideos.length > 0 && (
                    <section>
                      <SectionHeader icon={RiFireLine} title="Trending Now" badge="🔥 Hot" />
                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
                        {topVideos.map(v => <VideoThumb key={v.id} video={v} />)}
                      </div>
                    </section>
                  )}

                  {/* ── Top sellers horizontal scroll ────────────────────── */}
                  {topSellers.length > 0 && (
                    <section>
                      <SectionHeader icon={RiStarLine} title="Top Sellers" badge="Verified" />
                      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
                        {topSellers.map(seller => (
                          <Link key={seller.id} href={`/@${seller.username}`} style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 72 }}>
                            <div style={{ position: 'relative' }}>
                              <img
                                src={seller.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.name)}&background=222`}
                                alt={seller.name}
                                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,107,53,0.4)' }}
                              />
                              {seller.is_verified && (
                                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: '50%', background: '#FF6B35', border: '2px solid #050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <RiVerifiedBadgeLine size={11} color="#fff" />
                                </div>
                              )}
                            </div>
                            <div style={{ textAlign: 'center', width: '100%' }}>
                              <p style={{ color: '#fff', fontSize: 11, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seller.name}</p>
                              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: '2px 0 0' }}>{fmtCount(seller.total_sales ?? 0)} sales</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* ── Hot products ─────────────────────────────────────── */}
                  {hotProducts.length > 0 && (
                    <section>
                      <SectionHeader icon={RiRocketLine} title="Popular Products" badge="Most ordered" seeAllHref="/shop" />
                      {/* Horizontal scroll — same treatment as New Arrivals but taller cards */}
                      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
                        {hotProducts.map(p => (
                          <Link key={p.id}
                            href={`/@${p.seller?.username}/products/${p.slug ?? p.id}`}
                            style={{ flexShrink: 0, width: 160, textDecoration: 'none' }}>
                            <div style={{ width: 160, height: 160, borderRadius: 18, overflow: 'hidden', background: '#1a1a1a', marginBottom: 8, position: 'relative' }}>
                              {p.primary_image
                                ? <img src={p.primary_image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', background: '#222' }} />
                              }
                              {/* Orders badge */}
                              {(p.orders_count ?? 0) > 0 && (
                                <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', borderRadius: 999, padding: '3px 8px' }}>
                                  <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>{fmtCount(p.orders_count)} sold</span>
                                </div>
                              )}
                            </div>
                            <p style={{ color: '#fff', fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                            {p.seller?.username && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: '2px 0 3px' }}>@{p.seller.username}</p>}
                            <p style={{ color: '#FF6B35', fontSize: 13, fontWeight: 800, margin: 0 }}>₦{Number(p.price).toLocaleString()}</p>
                          </Link>
                        ))}
                        {/* See all card at the end */}
                        
                      </div>
                    </section>
                  )}

                  {/* ── Rising videos (high engagement) ─────────────────── */}
                  {risingVideos.length > 0 && (
                    <section>
                      <SectionHeader icon={RiFlashlightLine} title="Rising Videos" badge="⚡ Gaining traction" />
                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
                        {risingVideos.map(v => <VideoThumb key={v.id} video={v} />)}
                      </div>
                    </section>
                  )}

                  {/* ── New arrivals ─────────────────────────────────────── */}
                  {newArrivals.length > 0 && (
                    <section>
                      <SectionHeader icon={RiShoppingBag3Line} title="New Arrivals" badge="Just listed" seeAllHref="/shop?sort=newest" />
                      {/* Horizontal scroll row — different from the grid above */}
                      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
                        {newArrivals.map(p => (
                          <Link key={p.id}
                            href={`/@${p.seller?.username}/products/${p.slug ?? p.id}`}
                            style={{ flexShrink: 0, width: 140, textDecoration: 'none' }}>
                            <div style={{ width: 140, height: 140, borderRadius: 16, overflow: 'hidden', background: '#1a1a1a', marginBottom: 8 }}>
                              {p.primary_image
                                ? <img src={p.primary_image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', background: '#222' }} />
                              }
                            </div>
                            <p style={{ color: '#fff', fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                            <p style={{ color: '#FF6B35', fontSize: 13, fontWeight: 800, margin: '3px 0 0' }}>₦{Number(p.price).toLocaleString()}</p>
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* ── More videos ──────────────────────────────────────── */}
                  {trendingVideos.length > 6 && (
                    <section>
                      <SectionHeader icon={RiPlayCircleLine} title="More Videos" />
                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
                        {trendingVideos.slice(6, 12).map(v => <VideoThumb key={v.id} video={v} />)}
                      </div>
                    </section>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      </div>

      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}

Explore.layout = page => <AppLayout>{page}</AppLayout>

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function NativeSelect({ value, onChange, options }) {
  return (
    <div className="relative flex-shrink-0">
      <select value={value} onChange={e => onChange(e.target.value)} className="h-9 appearance-none rounded-xl border border-white/[0.06] bg-white/[0.03] pl-3 pr-9 text-xs text-white outline-none">
        {options.map(o => <option key={o.value} value={o.value} className="bg-[#111]">{o.label}</option>)}
      </select>
      <RiArrowDownSLine size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/35" />
    </div>
  )
}

function SectionHeader({ icon: Icon, title, count, badge, seeAllHref }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]">
          <Icon size={17} className="text-white/70" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-white">{title}</h2>
            {badge && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(255,107,53,0.15)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.25)' }}>{badge}</span>}
          </div>
          {count !== undefined && <p className="text-[11px] text-white/30">{count} {pl(count, 'item', 'items')}</p>}
        </div>
      </div>
      {seeAllHref && (
        <Link href={seeAllHref} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, color: '#FF6B35', fontSize: 12, fontWeight: 600 }}>
          See all <RiArrowRightSLine size={15} />
        </Link>
      )}
    </div>
  )
}

function VideoThumb({ video }) {
  return (
    <Link href={`/@${video.user?.username}/video/${video.ulid}`} className="group relative block overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111]">
      <div className="relative aspect-[9/16] w-full">
        {video.thumbnail_url_full
          ? <img src={video.thumbnail_url_full} alt={video.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          : <div className="absolute inset-0 bg-[#1a1a1a]" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {/* View count badge */}
        {video.views_count > 0 && (
          <div style={{ position: 'absolute', top: 7, left: 7, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', borderRadius: 999, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>{fmtCount(video.views_count)}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <div className="flex items-center gap-1.5">
            <img src={video.user?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(video.user?.name ?? 'U')}&background=111111`} className="h-6 w-6 rounded-full object-cover flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold text-white leading-tight">{video.user?.name}</p>
              <p className="truncate text-[9px] text-white/45">@{video.user?.username}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}