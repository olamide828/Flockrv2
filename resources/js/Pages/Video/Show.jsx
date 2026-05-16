import { useState, useRef, useEffect, useCallback } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import axios from 'axios'
import AppLayout from '@/Layouts/AppLayout'

// ── Icons ─────────────────────────────────────────────────────────────────────
const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? '#ff3b5c' : 'none'} stroke={filled ? '#ff3b5c' : 'currentColor'} strokeWidth={1.8} className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
)
const CommentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
)
const BookmarkIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? '#ffb300' : 'none'} stroke={filled ? '#ffb300' : 'currentColor'} strokeWidth={1.8} className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
  </svg>
)
const ShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
  </svg>
)
const CartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
)
const MuteIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" />
  </svg>
)
const UnmuteIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
    <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
  </svg>
)
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)
const ChevronUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
)
const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
)
const VerifiedIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#ff5c00] shrink-0">
    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.491 4.491 0 01-3.497-1.307 4.491 4.491 0 01-1.307-3.497A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
)
const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
)
const DotsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
  </svg>
)

const fmt = (n) => {
  const num = Number(n ?? 0)
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return String(num)
}
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function CommentItem({ comment }) {
  const avatar = comment.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.name || 'U')}&background=1a1a1a&color=888888`
  return (
    <div className="flex gap-3 py-3">
      <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white text-xs font-semibold">@{comment.user?.username}</span>
          <span className="text-[#555] text-[10px]">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-[#ccc] text-sm leading-relaxed">{comment.body}</p>
      </div>
    </div>
  )
}

function ProductRow({ product }) {
  return (
    <button
      onClick={() => router.visit(`/products/${product.slug}`)}
      className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.07] bg-[#161616] hover:border-[#ff5c00]/40 transition-all w-full text-left"
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#111] shrink-0">
        {product.primary_image
          ? <img src={product.primary_image} alt={product.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-[#444]"><CartIcon /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium line-clamp-1">{product.name}</p>
        <p className="text-[#ff5c00] text-sm font-bold mt-0.5">₦{Number(product.price).toLocaleString()}</p>
      </div>
      <span className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-[#ff5c00] text-white">Buy</span>
    </button>
  )
}

export default function VideoShow({ video, isLiked: initLiked, isSaved: initSaved, isFollowing: initFollowing }) {
  const { auth } = usePage().props
  const videoRef    = useRef(null)
  const progressRef = useRef(null)
  const viewTracked = useRef(false)

  const [playing,      setPlaying]      = useState(false)
  const [muted,        setMuted]        = useState(false)
  const [progress,     setProgress]     = useState(0)
  const [duration,     setDuration]     = useState(0)
  const [currentTime,  setCurrentTime]  = useState(0)
  const [liked,        setLiked]        = useState(initLiked)
  const [likesCount,   setLikes]        = useState(video.likes_count ?? 0)
  const [saved,        setSaved]        = useState(initSaved)
  const [following,    setFollowing]    = useState(initFollowing)
  const [heartAnim,    setHeartAnim]    = useState(false)
  const [showPPIcon,   setShowPP]       = useState(false)
  const [tab,          setTab]          = useState('comments')
  const [comments,     setComments]     = useState([])
  const [cmtsLoaded,   setCmtsLoaded]   = useState(false)
  const [loadingCmts,  setLoadingCmts]  = useState(false)
  const [commentText,  setCommentText]  = useState('')
  const [mobileSheet,  setMobileSheet]  = useState(null)
  const [copied,       setCopied]       = useState(false)

  const isOwner    = auth?.user?.id === video.user?.id
  const hasProducts = video.is_for_sale && video.products?.length > 0
  const avatarSrc  = video.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(video.user?.name || 'U')}&background=222&color=888`

  useEffect(() => { videoRef.current?.play().then(() => setPlaying(true)).catch(() => {}) }, [])
  useEffect(() => { loadComments() }, [])

  const togglePlay = () => {
    const el = videoRef.current; if (!el) return
    if (el.paused) { el.play(); setPlaying(true) } else { el.pause(); setPlaying(false) }
    setShowPP(true); setTimeout(() => setShowPP(false), 600)
  }

  const onTimeUpdate = () => {
    const el = videoRef.current; if (!el?.duration) return
    setProgress((el.currentTime / el.duration) * 100)
    setCurrentTime(el.currentTime)
    if (!viewTracked.current && el.currentTime >= 3 && auth?.user) {
      viewTracked.current = true
      axios.post(`/api/videos/${video.id}/view`, { watch_seconds: Math.floor(el.currentTime) }, { withCredentials: true }).catch(() => {})
    }
  }

  const onLoadedMetadata = () => { if (videoRef.current) setDuration(videoRef.current.duration) }

  const seek = (e) => {
    const el = videoRef.current; const bar = progressRef.current; if (!el || !bar) return
    el.currentTime = ((e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth) * el.duration
  }

  const toggleMute = () => { setMuted(m => { if (videoRef.current) videoRef.current.muted = !m; return !m }) }

  const handleLike = async () => {
    if (!auth?.user) return router.visit('/login')
    const prev = liked; setLiked(!prev); setLikes(c => prev ? c - 1 : c + 1)
    if (!prev) { setHeartAnim(true); setTimeout(() => setHeartAnim(false), 400) }
    try {
      const { data } = await axios.post(`/api/videos/${video.id}/like`, {}, { withCredentials: true })
      setLiked(data.liked); setLikes(data.likes_count)
    } catch { setLiked(prev); setLikes(c => prev ? c + 1 : c - 1) }
  }

  const handleSave = async () => {
    if (!auth?.user) return router.visit('/login')
    setSaved(s => !s)
    try { await axios.post(`/api/videos/${video.id}/save`, {}, { withCredentials: true }) } catch { setSaved(s => !s) }
  }

  const handleFollow = async () => {
    if (!auth?.user) return router.visit('/login')
    setFollowing(f => !f)
    try { await axios.post(`/api/users/${video.user.id}/follow`, {}, { withCredentials: true }) } catch { setFollowing(f => !f) }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) { try { await navigator.share({ title: video.title || 'Flockr', url }) } catch {} }
    else { await navigator.clipboard.writeText(url) }
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const loadComments = useCallback(async () => {
    if (cmtsLoaded) return
    setLoadingCmts(true)
    try {
      const { data } = await axios.get(`/api/videos/${video.id}/comments`)
      setComments(data.data ?? data); setCmtsLoaded(true)
    } catch {} finally { setLoadingCmts(false) }
  }, [cmtsLoaded, video.id])

  const submitComment = async () => {
    if (!commentText.trim() || !auth?.user) return
    const text = commentText; setCommentText('')
    try {
      const { data } = await axios.post(`/api/videos/${video.id}/comments`, { body: text }, { withCredentials: true })
      setComments(c => [data, ...c])
    } catch { setCommentText(text) }
  }

  const openSheet = (sheet) => { setMobileSheet(sheet); if (sheet === 'comments') loadComments() }

  const fmtTime = (s) => {
    const m = Math.floor(s / 60); const sec = Math.floor(s % 60)
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  // ── Shared comment input ──────────────────────────────────────────────────
  const CommentInput = () => auth?.user ? (
    <div className="p-3 border-t border-white/[0.06] flex gap-2 items-center shrink-0 bg-[#0d0d0d]">
      <img src={auth.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(auth.user.name)}&background=222`}
        alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
      <input
        value={commentText}
        onChange={e => setCommentText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submitComment()}
        placeholder="Add comment..."
        className="flex-1 bg-[#1e1e1e] border border-white/[0.08] rounded-full px-4 py-2 text-sm text-white placeholder-[#555] outline-none focus:border-white/20 transition-colors"
      />
      <button
        onClick={submitComment}
        disabled={!commentText.trim()}
        className="text-[#ff5c00] font-bold text-sm disabled:text-[#333] shrink-0 transition-colors"
      >
        Post
      </button>
    </div>
  ) : (
    <div className="p-3 shrink-0 bg-[#0d0d0d]">
      <button
        onClick={() => router.visit('/login')}
        className="w-full py-3 rounded-full bg-[#ff5c00] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#e85200] transition-colors"
      >
        Log in to comment
      </button>
    </div>
  )

  return (
    <>
      <Head title={video.title || `@${video.user?.username} on Flockr`} />

      <div className="flex overflow-hidden bg-black" style={{ height: '100%', minHeight: '100dvh' }}>

        {/* ── VIDEO SIDE ───────────────────────────────────────────── */}
        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden min-w-0">

          {/* Close / back */}
          <button
            onClick={() => window.history.back()}
            className="absolute top-4 left-4 z-30 w-9 h-9 rounded-full bg-[#222] flex items-center justify-center text-white hover:bg-[#333] transition-colors"
          >
            <CloseIcon />
          </button>

          {/* Three dots */}
          <button className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-[#222] flex items-center justify-center text-white hover:bg-[#333] transition-colors">
            <DotsIcon />
          </button>

          {/* Prev / Next arrows — right side of video like TikTok desktop */}
          <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 flex-col gap-3">
            <button
              onClick={() => router.visit(`/video/${video.prev_id ?? video.id}`)}
              className="w-9 h-9 rounded-full bg-[#222] flex items-center justify-center text-white hover:bg-[#333] transition-colors disabled:opacity-30"
              disabled={!video.prev_id}
            >
              <ChevronUpIcon />
            </button>
            <button
              onClick={() => router.visit(`/video/${video.next_id ?? video.id}`)}
              className="w-9 h-9 rounded-full bg-[#222] flex items-center justify-center text-white hover:bg-[#333] transition-colors disabled:opacity-30"
              disabled={!video.next_id}
            >
              <ChevronDownIcon />
            </button>
          </div>

          {/* Video */}
          <video
            ref={videoRef}
            src={video.video_stream_url}
            className="h-full w-full object-contain cursor-pointer"
            loop playsInline muted={muted}
            poster={video.thumbnail_url_full}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onClick={togglePlay}
            style={{ maxHeight: '100dvh' }}
          />

          {/* Play/pause flash */}
          {showPPIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="bg-black/60 rounded-full p-5">
                {playing
                  ? <svg viewBox="0 0 24 24" fill="white" className="w-10 h-10"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>
                  : <svg viewBox="0 0 24 24" fill="white" className="w-10 h-10"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>
                }
              </div>
            </div>
          )}

          {/* Progress bar + time — bottom of video, no gradient */}
          <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-3 bg-black/40">
            {/* time */}
            <div className="flex justify-end mb-1.5">
              <span className="text-white/60 text-xs font-mono">{fmtTime(currentTime)}/{fmtTime(duration)}</span>
            </div>
            {/* scrubber */}
            <div
              ref={progressRef}
              onClick={seek}
              className="w-full h-1 bg-white/20 rounded-full cursor-pointer group hover:h-1.5 transition-all"
            >
              <div className="h-full bg-white rounded-full relative" style={{ width: `${progress}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            {/* mute + pip row */}
            <div className="flex items-center justify-end gap-2 mt-2">
              <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                {muted ? <MuteIcon /> : <UnmuteIcon />}
              </button>
            </div>
          </div>

          {/* Mobile-only overlay: creator info + action buttons */}
          <div className="md:hidden absolute bottom-20 left-0 right-0 z-20 px-4">
            <div className="flex items-end gap-3">
              {/* left: creator + caption */}
              <div className="flex-1 min-w-0">
                <button onClick={() => router.visit(`/@${video.user?.username}`)} className="flex items-center gap-2 mb-2 group">
                  <img src={avatarSrc} alt="" className="w-9 h-9 rounded-full border-2 border-[#ff5c00] object-cover shrink-0" />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-white text-sm font-bold">@{video.user?.username}</span>
                      {video.user?.is_verified && <VerifiedIcon />}
                    </div>
                  </div>
                </button>
                {video.title && <p className="text-white text-sm font-semibold line-clamp-1 mb-0.5">{video.title}</p>}
                {video.description && <p className="text-white/70 text-xs line-clamp-2">{video.description}</p>}
                {video.hashtags?.length > 0 && <p className="text-[#ff5c00] text-xs mt-1">{video.hashtags.slice(0, 4).join(' ')}</p>}
                {!isOwner && auth?.user && (
                  <button onClick={handleFollow} className={`mt-2 px-4 py-1 rounded-full text-xs font-bold border transition-all ${following ? 'border-white/20 text-white/50' : 'border-[#ff5c00] text-[#ff5c00]'}`}>
                    {following ? 'Following' : '+ Follow'}
                  </button>
                )}
              </div>
              {/* right: action buttons */}
              <div className="flex flex-col items-center gap-5 shrink-0 pb-1">
                <MobileBtn icon={<HeartIcon filled={liked} />} count={fmt(likesCount)} onClick={handleLike} anim={heartAnim} />
                <MobileBtn icon={<CommentIcon />} count={fmt(video.comments_count ?? 0)} onClick={() => openSheet('comments')} />
                <MobileBtn icon={<BookmarkIcon filled={saved} />} count="" onClick={handleSave} />
                {hasProducts && <MobileBtn icon={<CartIcon />} count={video.products.length} onClick={() => openSheet('products')} color="#ff5c00" />}
                <MobileBtn icon={<ShareIcon />} count="" onClick={handleShare} />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (desktop) ────────────────────────────────── */}
        <div
          className="hidden md:flex flex-col w-[360px] shrink-0 border-l border-white/[0.06]"
          style={{ height: '100%', minHeight: '100dvh', background: '#0d0d0d' }}
        >
          {/* ── Creator row ── */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] shrink-0">
            <button onClick={() => router.visit(`/@${video.user?.username}`)}>
              <img src={avatarSrc} alt="" className="w-10 h-10 rounded-full object-cover" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <button
                  onClick={() => router.visit(`/@${video.user?.username}`)}
                  className="text-white text-sm font-bold hover:underline truncate"
                >
                  {video.user?.name ?? video.user?.username}
                </button>
                {video.user?.is_verified && <VerifiedIcon />}
              </div>
              <p className="text-[#888] text-xs truncate">
                @{video.user?.username}
                {video.created_at && <span className="ml-2">· {timeAgo(video.created_at)}</span>}
              </p>
            </div>
            {!isOwner && (
              <button
                onClick={auth?.user ? handleFollow : () => router.visit('/login')}
                className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all shrink-0 ${
                  following
                    ? 'border-white/20 text-white/50 bg-transparent'
                    : 'border-[#ff5c00] bg-[#ff5c00] text-white hover:bg-[#e85200]'
                }`}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          {/* ── Caption ── */}
          {(video.title || video.description || video.hashtags?.length > 0) && (
            <div className="px-5 py-4 border-b border-white/[0.06] shrink-0">
              {video.title && <p className="text-white text-sm font-semibold mb-1">{video.title}</p>}
              {video.description && <p className="text-[#aaa] text-sm leading-relaxed">{video.description}</p>}
              {video.hashtags?.length > 0 && (
                <p className="text-[#ff5c00] text-sm mt-2 font-medium">{video.hashtags.join(' ')}</p>
              )}
            </div>
          )}

          {/* ── Action row (like TikTok: icons + counts in a row) ── */}
          <div className="flex items-center gap-1 px-5 py-3 border-b border-white/[0.06] shrink-0">
            <ActionBtn icon={<HeartIcon filled={liked} />} count={fmt(likesCount)} onClick={handleLike} anim={heartAnim} active={liked} activeColor="#ff3b5c" />
            <ActionBtn icon={<CommentIcon />} count={fmt(video.comments_count ?? 0)} onClick={() => setTab('comments')} active={tab === 'comments'} activeColor="#ff5c00" />
            <ActionBtn icon={<BookmarkIcon filled={saved} />} count={saved ? 'Saved' : 'Save'} onClick={handleSave} active={saved} activeColor="#ffb300" />
            <div className="flex-1" />
            <button onClick={handleShare} className="text-[#888] hover:text-white transition-colors p-2">
              <ShareIcon />
            </button>
          </div>

          {/* ── Copy link row (like TikTok) ── */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] shrink-0">
            <div className="flex-1 min-w-0 bg-[#1a1a1a] border border-white/[0.06] rounded-lg px-3 py-2">
              <p className="text-[#666] text-xs truncate">{typeof window !== 'undefined' ? window.location.href : ''}</p>
            </div>
            <button
              onClick={handleCopyLink}
              className="shrink-0 text-sm font-bold text-white hover:text-[#ff5c00] transition-colors whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-white/[0.06] shrink-0">
            <TabBtn label="Comments" count={video.comments_count ?? 0} active={tab === 'comments'} onClick={() => setTab('comments')} />
            {hasProducts && (
              <TabBtn label="Shop" count={video.products.length} active={tab === 'products'} onClick={() => setTab('products')} />
            )}
            <TabBtn label={`@${video.user?.username}`} active={tab === 'creator'} onClick={() => router.visit(`/@${video.user?.username}`)} />
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto scroll-hidden flex flex-col min-h-0">
            {tab === 'products' && hasProducts && (
              <div className="p-4 space-y-2 flex-1">
                {video.products.map(p => <ProductRow key={p.id} product={p} />)}
              </div>
            )}

            {tab === 'comments' && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto scroll-hidden px-5 divide-y divide-white/[0.04]">
                  {loadingCmts && (
                    <p className="py-8 text-center text-[#555] text-sm">Loading comments...</p>
                  )}
                  {!loadingCmts && comments.length === 0 && (
                    <div className="py-12 text-center">
                      <p className="text-[#555] text-sm font-medium">No comments yet</p>
                      <p className="text-[#333] text-xs mt-1">Be the first to comment!</p>
                    </div>
                  )}
                  {comments.map(c => <CommentItem key={c.id} comment={c} />)}
                </div>
                <CommentInput />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE BOTTOM SHEETS ─────────────────────────────────────── */}
      {mobileSheet && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileSheet(null)} />
          <div className="relative bg-[#111] rounded-t-2xl flex flex-col max-h-[75vh]">
            {/* handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            {/* header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] shrink-0">
              <span className="text-white font-bold text-sm">
                {mobileSheet === 'comments'
                  ? `Comments (${fmt(video.comments_count ?? 0)})`
                  : `Shop (${video.products?.length})`
                }
              </span>
              <button onClick={() => setMobileSheet(null)} className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-[#888]">
                <CloseIcon />
              </button>
            </div>

            {mobileSheet === 'products' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-2 scroll-hidden">
                {video.products?.map(p => <ProductRow key={p.id} product={p} />)}
              </div>
            )}

            {mobileSheet === 'comments' && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-4 divide-y divide-white/[0.04] scroll-hidden">
                  {loadingCmts && <p className="py-6 text-center text-[#555] text-sm">Loading...</p>}
                  {!loadingCmts && comments.length === 0 && (
                    <p className="py-8 text-center text-[#555] text-sm">No comments yet. Be the first!</p>
                  )}
                  {comments.map(c => <CommentItem key={c.id} comment={c} />)}
                </div>
                <CommentInput />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionBtn({ icon, count, onClick, anim, active, activeColor }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
      style={{ color: active ? activeColor : '#888' }}
    >
      <span className={anim ? 'heart-pop' : ''}>{icon}</span>
      {count !== '' && <span className="text-sm font-semibold" style={{ color: active ? activeColor : '#ccc' }}>{count}</span>}
    </button>
  )
}

function MobileBtn({ icon, count, onClick, color = 'white', anim }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1" style={{ color }}>
      <span className={anim ? 'heart-pop' : ''}>{icon}</span>
      {count !== '' && <span className="text-white text-[11px] font-semibold">{count}</span>}
    </button>
  )
}

function TabBtn({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-xs font-semibold relative transition-colors ${active ? 'text-white' : 'text-[#555] hover:text-[#888]'}`}
    >
      {label}{count > 0 ? ` (${count})` : ''}
      {active && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-white rounded-full" />}
    </button>
  )
}

VideoShow.layout = page => <AppLayout>{page}</AppLayout>