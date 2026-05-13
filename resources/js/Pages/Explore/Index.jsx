import { useState, useEffect, useRef } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import ProductCard from '@/Components/Product/ProductCard'
import axios from 'axios'

const CATEGORIES = [
  { id: null,  label: 'All',         emoji: '🔥' },
  { id: 1,     label: 'Fashion',     emoji: '👗' },
  { id: 2,     label: 'Beauty',      emoji: '💄' },
  { id: 3,     label: 'Electronics', emoji: '📱' },
  { id: 4,     label: 'Food',        emoji: '🍲' },
  { id: 5,     label: 'Home',        emoji: '🏠' },
  { id: 6,     label: 'Health',      emoji: '💊' },
  { id: 7,     label: 'Accessories', emoji: '👜' },
  { id: 8,     label: 'Kids',        emoji: '🧸' },
]

export default function Explore({ trendingProducts = [], trendingVideos = [] }) {
  const { url } = usePage()
  const params  = new URLSearchParams(url.split('?')[1] ?? '')
  const qParam  = params.get('q') ?? ''

  const [query,      setQuery]      = useState(qParam)
  const [inputVal,   setInputVal]   = useState(qParam)
  const [category,   setCategory]   = useState(null)
  const [results,    setResults]    = useState([])
  const [videos,     setVideos]     = useState(trendingVideos)
  const [loading,    setLoading]    = useState(false)
  const [viewMode,   setViewMode]   = useState('grid')  // grid | list
  const [priceMax,   setPriceMax]   = useState('')
  const [sort,       setSort]       = useState('relevance')
  const debounceRef = useRef(null)

  // ── Search whenever query/category/sort changes ──────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (query.trim().length >= 2 || category !== null) {
        runSearch()
      } else {
        setResults([])
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [query, category, sort, priceMax])

  const runSearch = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/search', {
        params: { q: query, category_id: category, sort, price_max: priceMax || undefined }
      })
      setResults(data.products)
      setVideos(data.videos ?? [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setQuery(inputVal)
    router.replace(`/explore?q=${encodeURIComponent(inputVal)}`, { preserveState: true })
  }

  const isSearching = query.trim().length >= 2 || category !== null

  return (
    <>
      <Head title="Explore" />

      <div className="h-screen overflow-y-auto scroll-hidden bg-flockr-black">

        {/* ── Search bar ──────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-flockr-black/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3">
          <form onSubmit={handleSubmit} className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-flockr-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
            </svg>
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Search products, sellers, videos..."
              className="input-flockr pl-10 pr-10"
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => { setInputVal(''); setQuery('') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-flockr-muted hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </form>
        </div>

        {/* ── Category chips ───────────────────────────────────────────── */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scroll-hidden">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id ?? 'all'}
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0 ${
                category === cat.id
                  ? 'bg-flockr-orange text-white shadow-orange-glow'
                  : 'bg-flockr-card text-flockr-muted border border-white/[0.06] hover:border-white/[0.14] hover:text-white'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* ── Filters row (when searching) ─────────────────────────────── */}
        {isSearching && (
          <div className="flex items-center gap-3 px-4 pb-3 overflow-x-auto scroll-hidden">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="input-flockr py-1.5 text-xs w-auto pr-7"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23888'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '14px', appearance: 'none' }}
            >
              <option value="relevance">Most Relevant</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="newest">Newest</option>
              <option value="popular">Most Popular</option>
            </select>
            <input
              type="number"
              placeholder="Max price ₦"
              value={priceMax}
              onChange={e => setPriceMax(e.target.value)}
              className="input-flockr py-1.5 text-xs w-32"
            />
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'text-flockr-orange bg-flockr-orange/10' : 'text-flockr-muted hover:text-white'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z"/></svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'text-flockr-orange bg-flockr-orange/10' : 'text-flockr-muted hover:text-white'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              </button>
            </div>
          </div>
        )}

        <div className="px-4 pb-24 md:pb-8 space-y-8">

          {/* ── Loading skeleton ─────────────────────────────────────── */}
          {loading && (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-3'}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-flockr-card rounded-flockr overflow-hidden border border-white/[0.06]">
                  <div className="skeleton aspect-square" />
                  <div className="p-3 space-y-2">
                    <div className="skeleton h-3 rounded w-3/4" />
                    <div className="skeleton h-3 rounded w-1/2" />
                    <div className="skeleton h-4 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Search results ───────────────────────────────────────── */}
          {!loading && isSearching && (
            <>
              {results.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-flockr-muted text-sm">
                      <span className="text-white font-semibold">{results.length}</span> results
                      {query && <> for "<span className="text-flockr-orange">{query}</span>"</>}
                    </p>
                  </div>
                  <div className={viewMode === 'grid'
                    ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'
                    : 'space-y-3'
                  }>
                    {results.map(p => <ProductCard key={p.id} product={p} layout={viewMode === 'list' ? 'list' : 'grid'} />)}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="text-5xl">🔍</div>
                  <p className="text-white font-display font-bold text-lg">No results found</p>
                  <p className="text-flockr-muted text-sm text-center">
                    Try different keywords or browse categories above.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Default: trending ────────────────────────────────────── */}
          {!isSearching && !loading && (
            <>
              {/* Trending Videos */}
              {videos.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🔥</span>
                    <h2 className="font-display font-bold text-white text-base">Trending Videos</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {videos.slice(0, 6).map(video => (
                      <a key={video.id} href={`/video/${video.id}`} className="relative aspect-[9/16] rounded-flockr overflow-hidden bg-flockr-card group border border-white/[0.06]">
                        <img src={video.thumbnail_url_full} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="video-overlay absolute inset-0" />
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white text-xs font-medium line-clamp-2 leading-snug">{video.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <img src={video.user?.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                            <span className="text-white/70 text-[10px]">@{video.user?.username}</span>
                          </div>
                        </div>
                        {video.is_for_sale && (
                          <div className="absolute top-2 right-2">
                            <span className="badge badge-orange" style={{ fontSize: '9px' }}>🛍 Shop</span>
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* Trending Products */}
              {trendingProducts.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">⚡</span>
                    <h2 className="font-display font-bold text-white text-base">Popular Right Now</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {trendingProducts.map(p => <ProductCard key={p.id} product={p} />)}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

Explore.layout = page => <AppLayout>{page}</AppLayout>
