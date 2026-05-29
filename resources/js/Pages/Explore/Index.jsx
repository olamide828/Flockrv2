import { useState, useEffect, useRef, useCallback } from 'react'
import { Head, router, usePage, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import ProductCard from '@/Components/Product/ProductCard'
import axios from 'axios'
import {
  RiFireLine, RiShirtLine, RiPaintBrushLine, RiSmartphoneLine,
  RiRestaurantLine, RiHome4Line, RiCapsuleLine, RiHandbagLine,
  RiBearSmileLine, RiSearchLine, RiCloseLine, RiGridLine,
  RiListCheck2, RiFlashlightLine, RiVerifiedBadgeLine,
  RiArrowDownSLine,
} from 'react-icons/ri'

const CATEGORIES = [
  { id: null, label: 'All',         Icon: RiFireLine        },
  { id: 1,    label: 'Fashion',     Icon: RiShirtLine       },
  { id: 2,    label: 'Beauty',      Icon: RiPaintBrushLine  },
  { id: 3,    label: 'Electronics', Icon: RiSmartphoneLine  },
  { id: 4,    label: 'Food',        Icon: RiRestaurantLine  },
  { id: 5,    label: 'Home',        Icon: RiHome4Line       },
  { id: 6,    label: 'Health',      Icon: RiCapsuleLine     },
  { id: 7,    label: 'Accessories', Icon: RiHandbagLine     },
  { id: 8,    label: 'Kids',        Icon: RiBearSmileLine   },
]

const SORT_OPTIONS = [
  { value: 'relevance',  label: 'Most Relevant'    },
  { value: 'popular',    label: 'Most Popular'     },
  { value: 'newest',     label: 'Newest First'     },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
]

const CONDITION_OPTIONS = [
  { value: '',            label: 'Any Condition' },
  { value: 'new',         label: 'New Only'      },
  { value: 'used',        label: 'Used'          },
  { value: 'refurbished', label: 'Refurbished'   },
]

export default function Explore({ trendingProducts = [], trendingVideos = [] }) {
  const pageUrl = usePage().url
  const qParam  = new URLSearchParams(pageUrl.split('?')[1] ?? '').get('q') ?? ''

  const [inputVal,    setInputVal]    = useState(qParam)
  const [query,       setQuery]       = useState(qParam)
  const [category,    setCategory]    = useState(null)
  const [sort,        setSort]        = useState('relevance')
  const [condition,   setCondition]   = useState('')
  const [priceMax,    setPriceMax]    = useState('')
  const [viewMode,    setViewMode]    = useState('grid')
  const [results,     setResults]     = useState([])
  const [sellers,     setSellers]     = useState([])
  const [videos,      setVideos]      = useState(trendingVideos)
  const [loading,     setLoading]     = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSug,     setShowSug]     = useState(false)

  const debounceRef = useRef(null)
  const sugRef      = useRef(null)

  const isSearching = query.trim().length >= 2 || category !== null

  // ── Main search ────────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (query.trim().length < 2 && category === null) {
        setResults([]); setSellers([]); setVideos(trendingVideos); return
      }
      setLoading(true)
      try {
        const { data } = await axios.get('/api/search', {
          params: { q: query, category_id: category, sort, condition: condition || undefined, price_max: priceMax || undefined },
        })
        setResults(data.products ?? [])
        setSellers(data.sellers  ?? [])
        setVideos(data.videos    ?? [])
      } catch { /* keep existing */ }
      finally { setLoading(false) }
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query, category, sort, condition, priceMax])

  // Sync URL param
  useEffect(() => {
    if (qParam && qParam !== query) { setQuery(qParam); setInputVal(qParam) }
  }, [qParam])

  // ── Suggestions ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (inputVal.trim().length < 2) { setSuggestions([]); setShowSug(false); return }
    clearTimeout(sugRef.current)
    sugRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get('/api/search', { params: { q: inputVal, limit: 5 } })
        const items = [
          ...(data.sellers  ?? []).slice(0, 3).map(s => ({ label: s.name, sub: `@${s.username}`, href: `/@${s.username}`, verified: s.is_verified })),
          ...(data.products ?? []).slice(0, 2).map(p => ({ label: p.name, sub: 'Product', href: `/@${p.seller?.username}/products/${p.slug}` })),
        ]
        setSuggestions(items)
        setShowSug(items.length > 0)
      } catch { setSuggestions([]) }
    }, 250)
    return () => clearTimeout(sugRef.current)
  }, [inputVal])

  const handleSubmit = (e) => {
    e.preventDefault()
    setQuery(inputVal); setShowSug(false)
    router.get('/explore', { q: inputVal }, { preserveState: true, replace: true })
  }

  const handleClear = () => {
    setInputVal(''); setQuery(''); setShowSug(false)
    router.get('/explore', {}, { preserveState: true, replace: true })
  }

  return (
    <>
      <Head title="Explore" />

      {/* height:100% + flex col so sticky header + scrollable body works */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0A0A0A', overflow: 'hidden' }}>

        {/* ── STICKY HEADER (no position:sticky needed — it's a flex child, not scroll child) */}
        <div style={{ flexShrink: 0, background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 30 }}>

          {/* Search */}
          <div style={{ padding: '12px 16px 0', position: 'relative' }}>
            <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
              <RiSearchLine size={15} color="rgba(255,255,255,0.3)"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={inputVal}
                onChange={e => { setInputVal(e.target.value); setShowSug(true) }}
                onFocus={() => suggestions.length > 0 && setShowSug(true)}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                placeholder="Search products, sellers, videos..."
                style={{
                  width: '100%', padding: '10px 36px', background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                  color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
              {inputVal && (
                <button type="button" onClick={handleClear}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                  <RiCloseLine size={16} color="rgba(255,255,255,0.4)" />
                </button>
              )}
            </form>

            {/* Suggestions */}
            {showSug && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 16, right: 16, background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
                {suggestions.map((s, i) => (
                  <Link key={i} href={s.href}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', textDecoration: 'none', borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                    onMouseDown={e => e.preventDefault()}>
                    <RiSearchLine size={13} color="rgba(255,255,255,0.25)" />
                    <span style={{ flex: 1, color: '#fff', fontSize: 13 }}>{s.label}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{s.sub}</span>
                    {s.verified && <RiVerifiedBadgeLine size={12} color="#FF6B35" />}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Category chips */}
          <div style={{ display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {CATEGORIES.map(cat => {
              const active = category === cat.id
              return (
                <button key={cat.id ?? 'all'} onClick={() => setCategory(cat.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
                    background: active ? '#FF6B35' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${active ? '#FF6B35' : 'rgba(255,255,255,0.08)'}`,
                    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                    fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  <cat.Icon size={12} />
                  {cat.label}
                </button>
              )
            })}
          </div>

          {/* Filter row */}
           
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              <NativeSelect value={sort} onChange={setSort} options={SORT_OPTIONS} />
              <NativeSelect value={condition} onChange={setCondition} options={CONDITION_OPTIONS} />
              <input
                type="number" placeholder="Max ₦"
                value={priceMax} onChange={e => setPriceMax(e.target.value)}
                style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', width: 90, flexShrink: 0 }}
              />
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, flexShrink: 0 }}>
                {[{ m: 'grid', I: RiGridLine }, { m: 'list', I: RiListCheck2 }].map(({ m, I }) => (
                  <button key={m} onClick={() => setViewMode(m)}
                    style={{ padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === m ? 'rgba(255,107,53,0.2)' : 'transparent', color: viewMode === m ? '#FF6B35' : 'rgba(255,255,255,0.3)', display: 'flex', transition: 'all 0.15s' }}>
                    <I size={14} />
                  </button>
                ))}
              </div>
            </div>
          
        </div>

        {/* ── SCROLLABLE BODY ────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          <div style={{ padding: '14px 14px 100px' }}>

            {/* Skeletons */}
            {loading && (
              <div style={grid(viewMode)}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, width: '70%' }} />
                      <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, width: '45%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results */}
            {!loading && isSearching && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {sellers.length > 0 && (
                  <section>
                    <Label>Sellers · {sellers.length}</Label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {sellers.map(s => (
                        <Link key={s.id} href={`/@${s.username}`}
                          style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none' }}>
                          <img src={s.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=1a1a1a`}
                            alt={s.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{s.name}</span>
                              {s.is_verified && <RiVerifiedBadgeLine size={12} color="#FF6B35" />}
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12 }}>@{s.username}</span>
                          </div>
                          <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, flexShrink: 0 }}>{fmtCount(s.followers_count)} followers</span>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {results.length > 0 ? (
                  <section>
                    <Label>Products · {results.length}</Label>
                    <div style={grid(viewMode)} className={`${viewMode === "list" ? "w-full" : "w-100"}`}>
                      {results.map(p => <ProductCard key={p.id} product={p} layout={viewMode === 'list' ? 'list' : 'grid'} />)}
                    </div>
                  </section>
                ) : sellers.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '60px 0' }}>
                    <RiSearchLine size={36} color="rgba(255,255,255,0.1)" />
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>No results</p>
                    <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, margin: 0 }}>Try different keywords or browse categories above.</p>
                  </div>
                )}

                {videos.length > 0 && (
                  <section>
                    <Label>Videos · {videos.length}</Label>
                    <div style={{ display: 'grid', gap: 4 }} className='grid-cols-3 lg:grid-cols-6'>
                      {videos.map(v => <VideoThumb key={v.id} video={v} />)}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* Trending */}
            {!isSearching && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {trendingVideos.length > 0 && (
                  <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <RiFireLine size={15} color="#FF6B35" />
                      <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>Trending Videos</h2>
                    </div>
                    <div style={{ display: 'grid', gap: 4 }} className='lg:grid-cols-6 grid-cols-3'>
                      {trendingVideos.slice(0, 9).map(v => <VideoThumb key={v.id} video={v} />)}
                    </div>
                  </section>
                )}

                {trendingProducts.length > 0 && (
                  <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <RiFlashlightLine size={15} color="#FF6B35" />
                      <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>Popular Right Now</h2>
                    </div>
                    <div style={grid('grid')} className='w-100'>
                      {trendingProducts.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
        select option { background:#1a1a1a; color:#fff; }
      `}</style>
    </>
  )
}

Explore.layout = page => <AppLayout>{page}</AppLayout>

// ── Helpers ───────────────────────────────────────────────────────────────────

function NativeSelect({ value, onChange, options }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ appearance: 'none', padding: '6px 26px 6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <RiArrowDownSLine size={13} color="rgba(255,255,255,0.35)"
        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  )
}

function VideoThumb({ video }) {
  return (
    <Link href={`/@${video.user?.username}/video/${video.ulid}`}
      style={{ position: 'relative', aspectRatio: '9/16', display: 'block', borderRadius: 8, overflow: 'hidden', background: '#111', textDecoration: 'none' }}>
      {video.thumbnail_url_full
        ? <img src={video.thumbnail_url_full} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }} />
      }
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }} />
      <div style={{ position: 'absolute', bottom: 13, left: 13, right: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
        <img src={video.user?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(video.user?.name ?? 'U')}&background=111&size=32`}
          style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {video.user?.name}
        </span>
        <p>{video.user?.hashtags}</p>
      </div>
    </Link>
  )
}

function Label({ children }) {
  return (
    <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>
      {children}
    </p>
  )
}

function grid(mode) {
  if (mode === 'list') return { display: 'flex', flexDirection: 'column', gap: 8 }
  return { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }
}

function fmtCount(n) {
  const num = Number(n ?? 0)
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'K'
  return String(num)
}