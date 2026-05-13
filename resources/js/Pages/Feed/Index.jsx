import { useState, useEffect, useRef, useCallback } from 'react'
import { Head, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import VideoCard from '@/Components/Feed/VideoCard'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

export default function FeedIndex({ initialVideos }) {
  const { auth } = usePage().props
  const [activeIndex, setActiveIndex]   = useState(0)
  const [feedType,    setFeedType]      = useState('for_you')
  const containerRef = useRef(null)
  const itemRefs     = useRef([])

  const { items: videos, loading, hasMore, loadMore } = useInfiniteScroll(
    initialVideos, '/api/feed'
  )

  // ── Intersection observer — detect which video is in view ────────────────
  useEffect(() => {
    const observers = []
    itemRefs.current.forEach((el, i) => {
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveIndex(i) },
        { threshold: 0.7 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [videos.length])

  // ── Load more when near end ──────────────────────────────────────────────
  useEffect(() => {
    if (activeIndex >= videos.length - 3 && hasMore && !loading) {
      loadMore({ type: feedType })
    }
  }, [activeIndex, videos.length, hasMore, loading, feedType])

  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'j') scrollToIndex(activeIndex + 1)
      if (e.key === 'ArrowUp'   || e.key === 'k') scrollToIndex(activeIndex - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeIndex])

  const scrollToIndex = useCallback((i) => {
    const clamped = Math.max(0, Math.min(i, videos.length - 1))
    itemRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth' })
  }, [videos.length])

  return (
    <>
      <Head title="For You" />

      {/* Feed type tabs — fixed on top of feed */}
      <div className="absolute top-0 left-0 right-0 z-30 flex justify-center pt-4 pb-2 pointer-events-none md:pt-3">
        <div className="pointer-events-auto flex items-center gap-1 glass-dark rounded-full px-1.5 py-1">
          {['for_you', 'following'].map(type => (
            <button
              key={type}
              onClick={() => setFeedType(type)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                feedType === type
                  ? 'bg-white text-flockr-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {type === 'for_you' ? 'For You' : 'Following'}
            </button>
          ))}
        </div>
      </div>

      {/* Scroll container */}
      <div
        ref={containerRef}
        className="feed-container w-full"
        style={{ height: '100dvh' }}
      >
        {videos.map((video, i) => (
          <div
            key={video.id}
            ref={el => itemRefs.current[i] = el}
            className="feed-item"
          >
            <VideoCard video={video} isActive={activeIndex === i} />
          </div>
        ))}

        {/* Loading next */}
        {loading && (
          <div className="feed-item flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-white/20 border-t-flockr-orange rounded-full animate-spin" />
              <p className="text-flockr-muted text-sm">Loading more videos...</p>
            </div>
          </div>
        )}

        {/* End of feed */}
        {!hasMore && !loading && videos.length > 0 && (
          <div className="feed-item flex items-center justify-center">
            <div className="text-center space-y-3 px-8">
              <div className="text-5xl">🎬</div>
              <p className="text-white font-display font-bold text-xl">You're all caught up!</p>
              <p className="text-flockr-muted text-sm">Follow more sellers to see their videos here.</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && videos.length === 0 && (
          <div className="feed-item flex items-center justify-center">
            <div className="text-center space-y-4 px-8">
              <div className="text-6xl">📱</div>
              <p className="text-white font-display font-bold text-2xl">Welcome to Flockr</p>
              <p className="text-flockr-muted text-sm leading-relaxed">
                Discover products through videos from Nigerian sellers.
              </p>
              {!auth?.user && (
                <a href="/register" className="btn-primary inline-block mt-2">Get Started</a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Scroll hint on first load */}
      {videos.length > 0 && activeIndex === 0 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 animate-bounce pointer-events-none md:bottom-8">
          <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <p className="text-white/30 text-xs">Scroll for more</p>
        </div>
      )}
    </>
  )
}

FeedIndex.layout = page => <AppLayout>{page}</AppLayout>
