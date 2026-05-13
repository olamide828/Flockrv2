import { useRef, useState, useEffect, useCallback } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import axios from 'axios'
import ProductTagPin from './ProductTagPin'
import ProductSheet from './ProductSheet'

export default function VideoCard({ video, isActive }) {
  const { auth }       = usePage().props
  const videoRef       = useRef(null)
  const progressRef    = useRef(null)
  const watchStartRef  = useRef(null)

  const [playing,       setPlaying]       = useState(false)
  const [muted,         setMuted]         = useState(true)
  const [progress,      setProgress]      = useState(0)
  const [liked,         setLiked]         = useState(video.is_liked ?? false)
  const [likesCount,    setLikesCount]    = useState(video.likes_count ?? 0)
  const [saved,         setSaved]         = useState(video.is_saved ?? false)
  const [showProducts,  setShowProducts]  = useState(false)
  const [showComments,  setShowComments]  = useState(false)
  const [tapFlash,      setTapFlash]      = useState(false)
  const [loading,       setLoading]       = useState(true)

  // ── Autoplay when active ─────────────────────────────────────────────────
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (isActive) {
      el.play().catch(() => {})
      watchStartRef.current = Date.now()
    } else {
      el.pause()
      el.currentTime = 0
      // Record watch time when leaving
      if (watchStartRef.current) {
        const secs = Math.round((Date.now() - watchStartRef.current) / 1000)
        axios.post(`/api/videos/${video.id}/view`, {
          watch_seconds: secs,
          session_id: null,
        }).catch(() => {})
        watchStartRef.current = null
      }
    }
  }, [isActive])

  // ── Progress bar ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const onTime = () => {
      if (el.duration) setProgress((el.currentTime / el.duration) * 100)
    }
    el.addEventListener('timeupdate', onTime)
    return () => el.removeEventListener('timeupdate', onTime)
  }, [])

  // ── Double-tap to like ───────────────────────────────────────────────────
  const lastTap = useRef(0)
  const handleVideoTap = useCallback(() => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      handleLike()
      setTapFlash(true)
      setTimeout(() => setTapFlash(false), 700)
    } else {
      videoRef.current?.paused
        ? videoRef.current.play().catch(() => {})
        : videoRef.current?.pause()
      setPlaying(!videoRef.current?.paused)
    }
    lastTap.current = now
  }, [liked])

  const handleLike = useCallback(async () => {
    if (!auth?.user) { router.visit('/login'); return }
    const next = !liked
    setLiked(next)
    setLikesCount(c => c + (next ? 1 : -1))
    try {
      await axios.post(`/api/videos/${video.id}/like`)
    } catch {
      setLiked(!next)
      setLikesCount(c => c + (next ? -1 : 1))
    }
  }, [liked, auth])

  const handleSave = useCallback(async () => {
    if (!auth?.user) { router.visit('/login'); return }
    setSaved(s => !s)
    await axios.post(`/api/videos/${video.id}/save`).catch(() => setSaved(s => !s))
  }, [auth])

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setMuted(videoRef.current.muted)
  }, [])

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: video.title, url: `/video/${video.id}` }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(`${window.location.origin}/video/${video.id}`)
    }
  }, [video])

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">

      {/* ── Video element ─────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src={video.hls_url ?? video.video_url}
        poster={video.thumbnail_url_full}
        muted
        loop
        playsInline
        preload="metadata"
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={handleVideoTap}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* ── Gradient overlays ─────────────────────────────────────────── */}
      <div className="video-overlay absolute inset-0 pointer-events-none" />
      <div className="video-overlay-top absolute inset-0 pointer-events-none" />

      {/* ── Loading spinner ───────────────────────────────────────────── */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* ── Double-tap heart flash ────────────────────────────────────── */}
      {tapFlash && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="w-28 h-28 text-flockr-red animate-heart-pop drop-shadow-2xl" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        </div>
      )}

      {/* ── Pause icon (brief flash when paused) ─────────────────────── */}
      {!playing && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Progress bar (bottom) ────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
        <div className="h-full bg-flockr-orange transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Product tag pins on video ─────────────────────────────────── */}
      {video.is_for_sale && video.products?.map((product) => (
        <ProductTagPin
          key={product.id}
          product={product}
          pinX={product.pivot?.pin_x ?? 30}
          pinY={product.pivot?.pin_y ?? 60}
          onClick={() => setShowProducts(true)}
        />
      ))}

      {/* ── Right sidebar actions ─────────────────────────────────────── */}
      <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5">

        {/* Avatar */}
        <div className="relative">
          <Link href={`/@${video.user?.username}`}>
            <img
              src={video.user?.avatar_url ?? `https://ui-avatars.com/api/?name=${video.user?.name}&background=111`}
              alt={video.user?.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-white/20"
            />
          </Link>
          <button
            onClick={() => axios.post(`/api/users/${video.user?.id}/follow`)}
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-flockr-orange flex items-center justify-center shadow-lg"
          >
            <span className="text-white text-xs font-bold leading-none">+</span>
          </button>
        </div>

        {/* Like */}
        <ActionBtn
          onClick={handleLike}
          icon={
            <svg className={`w-7 h-7 transition-all duration-200 ${liked ? 'text-flockr-red scale-110' : 'text-white'}`} fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          }
          label={formatCount(likesCount)}
        />

        {/* Comment */}
        <ActionBtn
          onClick={() => setShowComments(true)}
          icon={
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
          }
          label={formatCount(video.comments_count)}
        />

        {/* Save */}
        <ActionBtn
          onClick={handleSave}
          icon={
            <svg className={`w-7 h-7 ${saved ? 'text-flockr-amber' : 'text-white'}`} fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          }
          label={formatCount(video.saves_count)}
        />

        {/* Share */}
        <ActionBtn
          onClick={handleShare}
          icon={
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
          }
          label="Share"
        />

        {/* Mute */}
        <button onClick={toggleMute} className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm">
          {muted
            ? <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.348 2.595.341 1.24 1.518 1.905 2.66 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" /></svg>
            : <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.348 2.595.341 1.24 1.518 1.905 2.66 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" /><path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" /></svg>
          }
        </button>
      </div>

      {/* ── Bottom info: user + caption + products ────────────────────── */}
      <div className="absolute bottom-8 left-4 right-20 space-y-3">
        {/* Seller info */}
        <Link href={`/@${video.user?.username}`} className="flex items-center gap-2">
          <span className="font-display font-semibold text-white text-[15px]">@{video.user?.username}</span>
          {video.user?.is_verified && (
            <span className="verified-badge">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </Link>

        {/* Caption */}
        {video.description && (
          <p className="text-white/90 text-sm leading-snug line-clamp-2">{video.description}</p>
        )}

        {/* Hashtags */}
        {video.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {video.hashtags.slice(0, 4).map((tag, i) => (
              <Link key={i} href={`/explore?q=${encodeURIComponent(tag)}`}
                className="text-xs text-flockr-orange/80 hover:text-flockr-orange transition-colors font-medium">
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* Shop strip — if video has tagged products */}
        {video.is_for_sale && video.products?.length > 0 && (
          <button
            onClick={() => setShowProducts(true)}
            className="flex items-center gap-2 bg-flockr-orange/15 border border-flockr-orange/30 rounded-full px-4 py-2 backdrop-blur-sm"
          >
            <svg className="w-4 h-4 text-flockr-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
            </svg>
            <span className="text-flockr-orange text-xs font-semibold">
              {video.products.length} Product{video.products.length > 1 ? 's' : ''} in this video
            </span>
          </button>
        )}
      </div>

      {/* ── Product sheet (slides up) ─────────────────────────────────── */}
      {showProducts && (
        <ProductSheet products={video.products} onClose={() => setShowProducts(false)} />
      )}
    </div>
  )
}

function ActionBtn({ onClick, icon, label }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group">
      <div className="p-1.5 rounded-full transition-all group-active:scale-90">{icon}</div>
      {label && <span className="text-white/80 text-xs font-medium tabular-nums">{label}</span>}
    </button>
  )
}

function formatCount(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
