import { useRef, useState, useEffect, useCallback } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import axios from 'axios'
import {
  RiHeartLine, RiHeartFill, RiChat1Line,
  RiBookmarkLine, RiBookmarkFill, RiShareForwardLine,
  RiVolumeMuteLine, RiVolumeUpLine,
  RiCloseLine, RiShoppingBag2Line, RiMapPinLine,
  RiMoreLine, RiLoader4Line, RiCheckLine,
  RiWhatsappLine, RiFacebookCircleLine, RiTelegramLine,
  RiTwitterXLine, RiLink, RiRedditLine, RiInstagramLine,
  RiDownload2Line, RiFlag2Line, RiSearchLine,
} from 'react-icons/ri'
import ReportVideoModal from '../../Pages/Video/ReportVideoModal'
import CommentSheet from '../Video/CommentSheet'
import Toast from '@/Components/Toast'
import VerifiedBadge from '@/Components/VerifiedBadge'
import VideoSeekBar from '@/Components/VideoSeekBar'
import { hasUserInteracted, onFirstInteraction } from '@/lib/videoAutoplay'
import { useLikeAnimation, LikeAnimationOverlay } from '@/Components/LikeAnimation'
import { ensurePlaying } from '@/lib/ensurePlaying'

const fmt = (n) => {
  const num = Number(n ?? 0)
  if (isNaN(num)) return '0'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'K'
  return String(num)
}
const timeAgo = (d) => {
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return new Date(d).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}

function ExpandableDescription({ text, maxLines = 2 }) {
  const [expanded, setExpanded] = useState(false)
  if (!text) return null
  const isLong = text.length > 100
  if (!isLong || expanded) {
    return (
      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: 0, lineHeight: 1.4 }}>
        {text}
        {expanded && isLong && (
          <button onClick={e => { e.stopPropagation(); setExpanded(false) }}
            style={{ background: 'none', border: 'none', color: '#FF6B35', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '0 0 0 4px' }}>
            less
          </button>
        )}
      </p>
    )
  }
  return (
    <div>
      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: maxLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {text}
      </p>
      <button onClick={e => { e.stopPropagation(); setExpanded(true) }}
        style={{ background: 'none', border: 'none', color: '#FF6B35', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '2px 0 0', display: 'block' }}>
        see more
      </button>
    </div>
  )
}

function ShareSheet({ videoUrl, videoTitle, onClose, onDownload, dlState }) {
  const [copied, setCopied] = useState(false)
  const enc      = encodeURIComponent(videoUrl)
  const encTitle = encodeURIComponent(videoTitle || 'Check this out on Flockr')
  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  const handleCopy = async () => {
    await navigator.clipboard.writeText(videoUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const dlLabel = { idle: 'Download', preparing: 'Preparing…', processing: 'Processing…', done: '✓ Saved!', error: 'Retry' }[dlState] ?? 'Download'
  const dlColor = { idle: '#fff', preparing: 'rgba(255,255,255,0.4)', processing: 'rgba(255,255,255,0.4)', done: '#10B981', error: '#EF4444' }[dlState] ?? '#fff'
  const dlBg    = { idle: 'rgba(255,255,255,0.06)', preparing: 'rgba(255,255,255,0.04)', processing: 'rgba(255,255,255,0.04)', done: 'rgba(16,185,129,0.12)', error: 'rgba(239,68,68,0.12)' }[dlState] ?? 'rgba(255,255,255,0.06)'
  const dlBusy  = dlState === 'preparing' || dlState === 'processing'

  const opts = [
    { label: 'WhatsApp',     Icon: RiWhatsappLine,       color: '#25D366', bg: 'rgba(37,211,102,0.12)',  href: `https://wa.me/?text=${encTitle}%20${enc}` },
    { label: 'Facebook',     Icon: RiFacebookCircleLine, color: '#1877F2', bg: 'rgba(24,119,242,0.12)',  href: `https://www.facebook.com/sharer/sharer.php?u=${enc}` },
    { label: 'Telegram',     Icon: RiTelegramLine,       color: '#26A5E4', bg: 'rgba(38,165,228,0.12)',  href: `https://t.me/share/url?url=${enc}&text=${encTitle}` },
    { label: 'X (Twitter)',  Icon: RiTwitterXLine,       color: '#fff',    bg: 'rgba(255,255,255,0.08)', href: `https://twitter.com/intent/tweet?text=${encTitle}&url=${enc}` },
    { label: 'Reddit',       Icon: RiRedditLine,         color: '#FF4500', bg: 'rgba(255,69,0,0.12)',    href: `https://reddit.com/submit?url=${enc}&title=${encTitle}` },
    { label: 'Instagram',    Icon: RiInstagramLine,      color: '#E1306C', bg: 'rgba(225,48,108,0.12)', href: null, onClick: handleCopy },
    ...(canShare ? [{ label: 'More', Icon: RiShareForwardLine, color: '#FF6B35', bg: 'rgba(255,107,53,0.12)', href: null, onClick: () => navigator.share({ title: videoTitle || 'Flockr', url: videoUrl }).catch(() => {}) }] : []),
    { label: dlLabel, Icon: RiDownload2Line, color: dlColor, bg: dlBg, href: null, onClick: dlBusy ? undefined : onDownload },
  ]

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(18,18,18,0.98)', backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', animation: 'vc-slideup 0.28s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 14px' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Share</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RiCloseLine size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 20, padding: '0 20px 24px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {opts.map(o => (
            <button key={o.label}
              onClick={() => { if (o.onClick) { o.onClick(); return } if (o.href) window.open(o.href, '_blank', 'noopener,noreferrer') }}
              disabled={o.label === dlLabel && dlBusy}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: (o.label === dlLabel && dlBusy) ? 'default' : 'pointer', flexShrink: 0, opacity: (o.label === dlLabel && dlBusy) ? 0.6 : 1 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: o.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${o.color}22` }}>
                {(o.label === dlLabel && dlBusy)
                  ? <RiLoader4Line size={26} color={o.color} style={{ animation: 'vc-spin 0.8s linear infinite' }} />
                  : <o.Icon size={26} color={o.color} />
                }
              </div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, whiteSpace: 'nowrap' }}>{o.label}</span>
            </button>
          ))}
        </div>
        <div style={{ margin: '0 16px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <RiLink size={18} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{videoUrl}</span>
          <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, background: copied ? 'rgba(16,185,129,0.15)' : '#FF6B35', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0, transition: 'background 0.2s' }}>
            {copied ? <><RiCheckLine size={13} /> Copied!</> : 'Copy link'}
          </button>
        </div>
      </div>
    </>
  )
}

function SideBtn({ onClick, children, label, btnRef }) {
  return (
    <button ref={btnRef} onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))' }}>
        {children}
      </div>
      {label !== undefined && label !== '' && (
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.9)', marginTop: 1 }}>{label}</span>
      )}
    </button>
  )
}

function useVideoDownload(video) {
  const [dlState, setDlState] = useState('idle')
  const pollTimer = useRef(null)
  const stopPolling = () => { if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null } }

  const triggerBrowserDownload = useCallback(async (url, jobKey) => {
    try {
      const res  = await fetch(url, { mode: 'cors' })
      const blob = await res.blob()
      const burl = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = burl
      a.download = `flockr-${video.user?.username ?? 'video'}-${video.ulid ?? Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(burl), 10_000)
      setDlState('done')
      setTimeout(() => setDlState('idle'), 4000)
      axios.delete(`/api/videos/download/cleanup?job_key=${encodeURIComponent(jobKey)}`).catch(() => {})
    } catch {
      setDlState('error')
      setTimeout(() => setDlState('idle'), 4000)
    }
  }, [video.user?.username, video.ulid])

  const download = useCallback(async () => {
    if (dlState !== 'idle' && dlState !== 'error') return
    setDlState('preparing')
    stopPolling()
    try {
      const { data } = await axios.post(`/api/videos/${video.ulid}/download/prepare`, {}, { withCredentials: true })
      const jobKey   = data.job_key
      if (data.status === 'done' && data.url) { await triggerBrowserDownload(data.url, jobKey); return }
      setDlState('processing')
      pollTimer.current = setInterval(async () => {
        try {
          const { data: poll } = await axios.get(`/api/videos/download/status?job_key=${encodeURIComponent(jobKey)}`, { withCredentials: true })
          if (poll.status === 'done' && poll.url) { stopPolling(); await triggerBrowserDownload(poll.url, jobKey) }
          else if (poll.status === 'error') { stopPolling(); setDlState('error'); setTimeout(() => setDlState('idle'), 4000) }
        } catch { stopPolling(); setDlState('error'); setTimeout(() => setDlState('idle'), 4000) }
      }, 2000)
      setTimeout(() => { if (pollTimer.current) { stopPolling(); setDlState('error'); setTimeout(() => setDlState('idle'), 4000) } }, 300_000)
    } catch {
      setDlState('error')
      setTimeout(() => setDlState('idle'), 4000)
    }
  }, [dlState, video.ulid, triggerBrowserDownload])

  return { download, dlState }
}

export default function VideoCard({ video, isActive }) {
  const { auth }        = usePage().props
  const videoRef        = useRef(null)
  const watchStartRef   = useRef(null)
  const lastTap         = useRef(0)
  const tapTimerRef     = useRef(null)
  const unmuteUnsubRef  = useRef(null)
  const viewTimerRef    = useRef(null)
  const isSeeking       = useRef(false)
  const likeBtnRef      = useRef(null)
  const userPausedRef = useRef(false)

  const [playing,       setPlaying]       = useState(false)
  const [muted,         setMuted]         = useState(true)
  const [duration, setDuration] = useState(0)
  const [progress,      setProgress]      = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [liked,         setLiked]         = useState(video.is_liked ?? false)
  const [likesCount,    setLikesCount]    = useState(Number(video.likes_count ?? 0))
  const [saved,         setSaved]         = useState(video.is_saved ?? false)
  const [savesCount,    setSavesCount]    = useState(Number(video.saves_count ?? 0))
  const [followed,      setFollowed]      = useState(video.is_following ?? false)
  const [commentsCount, setCommentsCount] = useState(Number(video.comments_count ?? 0))
  const [showComments,  setShowComments]  = useState(false)
  const [showProducts,  setShowProducts]  = useState(false)
  const [showShare,     setShowShare]     = useState(false)
  const [showReportVideo, setShowReportVideo] = useState(false)
  const [showMoreSheet, setShowMoreSheet] = useState(false)
  const [showPP, setShowPP] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }
  

  const { burst, trigger: triggerLikeAnim } = useLikeAnimation(likeBtnRef)

  useEffect(() => {
    if (showReportVideo) {
      videoRef.current?.pause()
      setPlaying(false)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      if (isActive) {
        videoRef.current?.play().catch(() => {})
        setPlaying(true)
      }
    }
    return () => { document.body.style.overflow = '' }
  }, [showReportVideo])

  const { download, dlState } = useVideoDownload(video);

  const isOwner     = auth?.user?.id === video.user_id
  const hasProducts = video.is_for_sale && video.products?.length > 0
  const videoSrc    = video.video_stream_url ?? video.hls_url ?? video.video_url
  const videoUrl    = typeof window !== 'undefined' ? `${window.location.origin}/@${video.user?.username}/video/${video.ulid}` : ''

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

   if (isActive) {
      unmuteUnsubRef.current?.()
      unmuteUnsubRef.current = null
      userPausedRef.current = false

      if (hasUserInteracted()) {
        el.muted = false
        setMuted(false)
        el.play().then(() => setPlaying(true)).catch(() => {
          // Some browsers can still refuse unmuted autoplay in edge cases —
          // fall back to muted so playback at least starts.
          el.muted = true; setMuted(true)
          el.play().then(() => setPlaying(true)).catch(() => {})
        })
      } else {
        el.muted = true
        setMuted(true)
        el.play().then(() => setPlaying(true)).catch(() => {})
        unmuteUnsubRef.current = onFirstInteraction(() => {
          if (videoRef.current === el) { el.muted = false; setMuted(false) }
        })
      }

      watchStartRef.current = Date.now()
      viewTimerRef.current = setTimeout(() => {
        const secs = Math.round((Date.now() - (watchStartRef.current ?? Date.now())) / 1000)
        if (secs >= 3) {
          axios.post(`/api/videos/${video.ulid}/view`, { watch_seconds: secs, session_id: null }, { withCredentials: true }).catch(() => {})
          watchStartRef.current = null
        }
      }, 5000)
    } else {
      unmuteUnsubRef.current?.()
      unmuteUnsubRef.current = null

      if (isSeeking.current) return
      clearTimeout(viewTimerRef.current)
      el.pause()
      el.currentTime = 0
      setShowComments(false)
      setShowProducts(false)
      setShowShare(false)

      if (watchStartRef.current) {
        const secs = Math.round((Date.now() - watchStartRef.current) / 1000)
        if (secs >= 3) {
          axios.post(`/api/videos/${video.ulid}/view`, { watch_seconds: secs, session_id: null }, { withCredentials: true }).catch(() => {})
        }
        watchStartRef.current = null
      }
    }
  }, [isActive])


  useEffect(() => {
    const sheetOpen = showComments || showProducts || showShare || showMoreSheet
    if (!sheetOpen) return
    const stop = (e) => e.stopPropagation()
    document.addEventListener('wheel',      stop, { capture: true })
    document.addEventListener('touchmove',  stop, { capture: true, passive: false })
    document.addEventListener('touchstart', stop, { capture: true })
    return () => {
      document.removeEventListener('wheel',      stop, { capture: true })
      document.removeEventListener('touchmove',  stop, { capture: true })
      document.removeEventListener('touchstart', stop, { capture: true })
    }
  }, [showComments, showProducts, showShare, showMoreSheet])

  useEffect(() => {
    if (!isActive) return
    const handleKey = (e) => {
      const el = videoRef.current
      if (!el) return
      if (e.key === 'ArrowRight') { e.preventDefault(); el.currentTime = Math.min(el.duration, el.currentTime + 5) }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); el.currentTime = Math.max(0, el.currentTime - 5) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isActive])

  const handleLike = useCallback(async () => {
    if (!auth?.user) { router.visit('/login'); return }
    const was = liked; setLiked(!was); setLikesCount(c => Math.max(0, c + (was ? -1 : 1)))
    try { const { data } = await axios.post(`/api/videos/${video.ulid}/like`, {}, { withCredentials: true }); setLiked(data.liked); setLikesCount(Number(data.likes_count ?? 0)) }
    catch { setLiked(was); setLikesCount(c => Math.max(0, c + (was ? 1 : -1))) }
  }, [liked, auth, video.id])

  // Single/double-tap disambiguation: a single tap doesn't act immediately —
  // it waits up to 300ms to see if a second tap follows. If it does, that's
  // a double-tap (like, wherever on the frame you tapped); if not, THEN the
  // play/pause fires. This is what stops the two gestures from fighting.
  const handleVideoTap = useCallback((e) => {
    if (showComments || showProducts || showShare) return
    const now = Date.now()
    const dt = now - lastTap.current

    if (dt > 0 && dt < 300) {
      clearTimeout(tapTimerRef.current)
      tapTimerRef.current = null
      lastTap.current = 0
      if (!liked) handleLike()
      triggerLikeAnim(e.clientX, e.clientY)
    } else {
      lastTap.current = now
      tapTimerRef.current = setTimeout(() => {
        tapTimerRef.current = null
        const el = videoRef.current
        if (el?.paused) { userPausedRef.current = false; el.play().catch(() => {}) }
        else { userPausedRef.current = true; el?.pause() }
        setShowPP(true)
      }, 300)
    }
  }, [liked, showComments, showProducts, showShare, triggerLikeAnim, handleLike])

  const handleSave = useCallback(async () => {
    if (!auth?.user) { router.visit('/login'); return }
    const was = saved; setSaved(!was); setSavesCount(c => Math.max(0, c + (was ? -1 : 1)))
    showToast(was ? 'Removed from saved' : 'Video Saved', was ? 'error' : 'success')
    try { const { data } = await axios.post(`/api/videos/${video.ulid}/save`, {}, { withCredentials: true }); setSaved(data.saved); if (data.saves_count !== undefined) setSavesCount(Number(data.saves_count)) }
    catch { setSaved(was); setSavesCount(c => Math.max(0, c + (was ? 1 : -1))) }
  }, [saved, auth, video.id])

  const handleFollow = useCallback(async () => {
    if (!auth?.user) { router.visit('/login'); return }
    if (followed) return; setFollowed(true)
    await axios.post(`/api/users/${video.user?.id}/follow`, {}, { withCredentials: true }).catch(() => setFollowed(false))
  }, [followed, auth, video.user?.id])

  const toggleMute = useCallback(() => { setMuted(m => { if (videoRef.current) videoRef.current.muted = !m; return !m }) }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>

      {showShare && (
        <ShareSheet videoUrl={videoUrl} videoTitle={video.title} onClose={() => setShowShare(false)} onDownload={download} dlState={dlState} />
      )}
      {showMoreSheet && (
        <MoreSheet onClose={() => setShowMoreSheet(false)} onReport={() => setShowReportVideo(true)} videoRef={videoRef} />
      )}
      {showReportVideo && <ReportVideoModal video={video} onClose={() => setShowReportVideo(false)} />}

      <video
        ref={videoRef} src={videoSrc} poster={video.thumbnail_url_full ?? undefined}
        muted playsInline preload={isActive ? 'auto' : 'none'}
        onCanPlay={() => setLoading(false)}
        onPlaying={() => setLoading(false)}
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onWaiting={() => { if (!videoRef.current?.ended) setLoading(true) }}
        onPlay={() => { setPlaying(true); setShowPP(false) }}
        onPause={() => {
          const el = videoRef.current
          if (!el?.ended) {
            setPlaying(false)
            if (isActive && !userPausedRef.current) ensurePlaying(el)
          }
        }}
        onStalled={() => { if (isActive) ensurePlaying(videoRef.current) }}
        onEnded={() => { const el = videoRef.current; if (el) { el.currentTime = 0; el.play().catch(() => {}) } }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
      />

      <div onClick={handleVideoTap} style={{ position: 'absolute', inset: 0, zIndex: 5, cursor: 'pointer' }} />

      {Array.isArray(video.text_overlays) && video.text_overlays.map(overlay => (
        <span key={overlay.id} style={{
          position: 'absolute', top: `${overlay.top}%`, left: `${overlay.left}%`, zIndex: 8,
          color: overlay.textColor ?? '#fff', fontSize: overlay.fontSize ?? 18,
          fontWeight: overlay.fontStyle === 'bold' ? 800 : 600,
          fontStyle: overlay.fontStyle === 'italic' ? 'italic' : 'normal',
          textShadow: overlay.showOutline ? 'none' : '0 2px 8px rgba(0,0,0,0.9)',
          border: overlay.showOutline ? `2px solid ${overlay.outlineColor ?? '#fff'}` : 'none',
          borderRadius: overlay.showOutline ? 8 : 0, padding: overlay.showOutline ? '3px 10px' : 0,
          pointerEvents: 'none', userSelect: 'none', maxWidth: '80%', wordBreak: 'break-word', lineHeight: 1.3, display: 'inline-block',
        }}>{overlay.text}</span>
      ))}

      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.1) 45%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)', pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', gap: 8 }} onClick={e => e.stopPropagation()}>
        <Link href="/explore" onClick={e => e.stopPropagation()} style={{ textDecoration: 'none' }}>
          <button style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <RiSearchLine size={20} />
          </button>
        </Link>
        <button onClick={() => setShowMoreSheet(true)} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <RiMoreLine size={20} />
        </button>
      </div>

      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}>
          <div style={{ width: 36, height: 36, border: '2.5px solid rgba(255,255,255,0.15)', borderTopColor: '#ff5c00', borderRadius: '50%', animation: 'vc-spin 0.8s linear infinite' }} />
        </div>
      )}

      {showPP && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6, cursor: 'pointer', pointerEvents: 'none' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {playing
              ? <svg width={22} height={22} fill="white" viewBox="0 0 24 24"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>
              : <svg width={22} height={22} fill="white" viewBox="0 0 24 24"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
            }
          </div>
        </div>
      )}

   <VideoSeekBar
        videoRef={videoRef}
        enabled={isActive}
        onProgress={setProgress}
        onSeekStart={() => { isSeeking.current = true; clearTimeout(window._seekTimer) }}
        onSeekEnd={() => { window._seekTimer = setTimeout(() => { isSeeking.current = false }, 1500) }}
      />

      <div style={{ position: 'absolute', right: 10, bottom: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, zIndex: 10 }} onClick={e => e.stopPropagation()}>
        <div style={{ position: 'relative', marginBottom: 4 }}>
          <Link href={`/@${video.user?.username}`} onClick={e => e.stopPropagation()}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', border: '2.5px solid #fff', background: '#222' }}>
              {video.user?.avatar_url
                ? <img src={video.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#ff5c00,#ff8c00)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18 }}>{(video.user?.name ?? 'U')[0]}</div>
              }
            </div>
          </Link>
        </div>
        <SideBtn btnRef={likeBtnRef} onClick={handleLike} label={fmt(likesCount)}>
          {liked ? <RiHeartFill size={28} color="#ef4444" /> : <RiHeartLine size={28} color="#fff" />}
        </SideBtn>
        <SideBtn onClick={() => { if (!auth?.user) { router.visit('/login'); return }; setShowComments(s => !s); setShowProducts(false); setShowShare(false) }} label={fmt(commentsCount)}>
          <RiChat1Line size={28} color={showComments ? '#ff5c00' : '#fff'} />
        </SideBtn>
        <SideBtn onClick={handleSave} label={fmt(savesCount)}>
          {saved ? <RiBookmarkFill size={28} color="#fbbf24" /> : <RiBookmarkLine size={28} color="#fff" />}
        </SideBtn>
        <SideBtn onClick={() => { setShowShare(s => !s); setShowComments(false); setShowProducts(false) }} label="Share">
          <RiShareForwardLine size={28} color={showShare ? '#ff5c00' : '#fff'} />
        </SideBtn>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button onClick={toggleMute} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {muted ? <RiVolumeMuteLine size={17} color="#fff" /> : <RiVolumeUpLine size={17} color="#fff" />}
          </button>
          {duration > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
              <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, fontFamily: 'monospace', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {(() => { const cur = (progress / 100) * duration; const f = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`; return f(cur) })()}
              </span>
              <div style={{ width: 14, height: 1, background: 'rgba(255,255,255,0.3)', margin: '1px 0' }} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontFamily: 'monospace', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {(() => { const f = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`; return f(duration) })()}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 16, left: 14, right: 72, zIndex: 10 }} onClick={e => e.stopPropagation()}>
        {!isOwner && (
          <button onClick={handleFollow} style={{ display: 'block', marginBottom: 4, padding: '5px 14px', background: 'transparent', border: '1px solid #FF6B35', borderRadius: 999, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', width: 'fit-content' }}>
            {followed ? 'Following' : 'Follow'}
          </button>
        )}
        <Link href={`/@${video.user?.username}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none', marginBottom: 5 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{video.user?.name}</span>
          <VerifiedBadge type={video.user?.verification_type} size={13} />
        </Link>
        {video.title && <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '0 0 4px', lineHeight: 1.35, textShadow: '0 1px 4px rgba(0,0,0,0.8)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{video.title}</p>}
        <ExpandableDescription text={video.description} />
        {video.hashtags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {video.hashtags.slice(0, 5).map((tag, i) => (
              <Link key={i} href={`/explore?q=${encodeURIComponent(tag.replace(/^#/, ''))}`} onClick={e => e.stopPropagation()} prefetch="hover"
                style={{ color: '#FF6B35', fontSize: 13, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.7)', textDecoration: 'none' }}>
                {tag.startsWith('#') ? tag : `#${tag}`}
              </Link>
            ))}
          </div>
        )}
        {video.user?.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
            <RiMapPinLine size={11} color="rgba(255,255,255,0.55)" />
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{video.user.location}</span>
          </div>
        )}
        {hasProducts && (
          <button onClick={() => { setShowProducts(s => !s); setShowComments(false); setShowShare(false) }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,92,0,0.18)', border: '1px solid rgba(255,92,0,0.4)', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', width: 'fit-content', marginTop: 6, backdropFilter: 'blur(8px)' }}>
            <RiShoppingBag2Line size={13} color="#ff5c00" />
            <span style={{ color: '#ff5c00', fontSize: 12, fontWeight: 700 }}>{video.products.length} Product{video.products.length !== 1 ? 's' : ''} · Tap to shop</span>
          </button>
        )}
      </div>

      {showComments && (
        <CommentSheet videoId={video.ulid} videoOwnerId={video.user_id} onClose={() => setShowComments(false)} onCountChange={(delta) => setCommentsCount(c => Math.max(0, c + delta))} />
      )}

      {showProducts && hasProducts && (
        <BottomSheet onClose={() => setShowProducts(false)} title="Products in this video" height="auto" maxHeight="55%">
          <div style={{ overflowY: 'auto', padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {video.products.map(p => (
              <Link key={p.id} href={`/@${p.seller?.username}/products/${p.slug ?? p.id}`} style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0 }}>
                  {p.primary_image && <img src={p.primary_image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                  <p style={{ color: '#ff5c00', fontWeight: 700, fontSize: 14, margin: '3px 0 0' }}>₦{Number(p.price).toLocaleString()}</p>
                </div>
                <div style={{ padding: '8px 16px', background: '#ff5c00', borderRadius: 999, color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Buy</div>
              </Link>
            ))}
          </div>
        </BottomSheet>
      )}

      <LikeAnimationOverlay burst={burst} />

      <style>{`
        @keyframes vc-spin    { to { transform: rotate(360deg); } }
        @keyframes vc-slideup { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>

      {toast && (
        <div style={{ position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 30, pointerEvents: 'none' }}>
          <Toast toast={toast ? { message: toast.msg, type: toast.type } : null} onDismiss={() => setToast(null)} />
        </div>
      )}
    </div>
  )
}

function MoreSheet({ onClose, onReport, videoRef }) {
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
  const [currentSpeed, setCurrentSpeed] = useState(videoRef.current?.playbackRate ?? 1)
  const setSpeed = (s) => { if (videoRef.current) videoRef.current.playbackRate = s; setCurrentSpeed(s) }

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(18,18,18,0.98)', backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', animation: 'vc-slideup 0.28s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 14px' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Video Options</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RiCloseLine size={18} />
          </button>
        </div>
        <div style={{ padding: '0 16px 18px' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Playback Speed</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {speeds.map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                style={{ padding: '8px 16px', borderRadius: 999, border: `1px solid ${currentSpeed === s ? '#ff5c00' : 'rgba(255,255,255,0.1)'}`, background: currentSpeed === s ? 'rgba(255,92,0,0.15)' : 'rgba(255,255,255,0.04)', color: currentSpeed === s ? '#ff5c00' : '#fff', fontSize: 13, fontWeight: currentSpeed === s ? 700 : 400, cursor: 'pointer' }}>
                {s === 1 ? 'Normal' : `${s}x`}
              </button>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '4px 0' }}>
          <button onClick={() => { onClose(); onReport(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 14, fontWeight: 600 }}>
            <RiFlag2Line size={18} /> Report video
          </button>
        </div>
      </div>
    </>
  )
}

function BottomSheet({ onClose, title, height, maxHeight, children }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 19, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height, maxHeight, background: 'rgba(14,14,14,0.98)', backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.09)', zIndex: 20, display: 'flex', flexDirection: 'column', animation: 'vc-slideup 0.28s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 10px', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RiCloseLine size={17} />
          </button>
        </div>
        {children}
      </div>
    </>
  )
}