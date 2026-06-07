import { useRef, useState, useEffect, useCallback } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import axios from 'axios'
import {
  RiHeartLine, RiHeartFill, RiChat1Line,
  RiBookmarkLine, RiBookmarkFill, RiShareForwardLine,
  RiVolumeMuteLine, RiVolumeUpLine, RiUserAddLine,
  RiUserFollowLine, RiCloseLine, RiSendPlaneFill,
  RiShoppingBag2Line, RiMapPinLine, RiVerifiedBadgeLine,
  RiDeleteBinLine, RiMoreLine, RiReplyLine,
  RiLoader4Line, RiCheckLine,
  RiWhatsappLine, RiFacebookCircleLine, RiTelegramLine,
  RiTwitterXLine, RiLink, RiRedditLine, RiInstagramLine,
  RiDownload2Line,
} from 'react-icons/ri'

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── ExpandableDescription ─────────────────────────────────────────────────────
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

// ── ShareSheet — includes Download button ─────────────────────────────────────
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

  // Download button label + style based on current state
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
    // ── Download button (server-side watermark) ───────────────────────────────
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

// ── CommentInput ──────────────────────────────────────────────────────────────
function CommentInput({ auth, commentBody, setCommentBody, sending, sendComment, replyTo, setReplyTo, inputRef }) {
  if (!auth?.user) {
    return (
      <div style={{ padding: '10px 14px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={() => router.visit('/login')} style={{ width: '100%', padding: '11px', background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: 12, color: '#FF6B35', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Log in to comment
        </button>
      </div>
    )
  }
  return (
    <div style={{ padding: '10px 14px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      {replyTo && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '6px 10px', background: 'rgba(255,107,53,0.08)', borderRadius: 8, border: '1px solid rgba(255,107,53,0.2)' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
            Replying to <span style={{ color: '#FF6B35' }}>{replyTo.user?.name ?? replyTo.user?.username}</span>
          </span>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', padding: 0 }}>
            <RiCloseLine size={14} />
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
        <img src={auth.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(auth.user.name)}&background=222`}
          alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={commentBody}
          onChange={e => setCommentBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
          onTouchStart={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          placeholder={replyTo ? `Reply to ${replyTo.user?.name ?? replyTo.user?.username}...` : 'Add a comment...'}
          maxLength={500}
          style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '9px 16px', color: '#fff', fontSize: 13, outline: 'none' }}
        />
        <button onClick={sendComment} disabled={!commentBody.trim() || sending}
          style={{ background: commentBody.trim() && !sending ? '#FF6B35' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: commentBody.trim() ? 'pointer' : 'default', flexShrink: 0, transition: 'background 0.2s' }}>
          {sending ? <RiLoader4Line size={15} color="#fff" style={{ animation: 'vc-spin 0.8s linear infinite' }} /> : <RiSendPlaneFill size={15} color="#fff" />}
        </button>
      </div>
    </div>
  )
}

// ── CommentItem ───────────────────────────────────────────────────────────────
function CommentItem({ comment, onReply, onDelete, currentUserId, isAdmin }) {
  const avatar    = comment.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.name || 'U')}&background=222&color=fff`
  const canDelete = currentUserId && (comment.user?.id === currentUserId || isAdmin)
  const [menuOpen,        setMenuOpen]        = useState(false)
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false)
  const longPressTimer = useRef(null)

  const handleLongPressStart = () => {
    if (!canDelete) return
    longPressTimer.current = setTimeout(() => {
      if (window.innerWidth < 768) setDeleteSheetOpen(true)
    }, 500)
  }
  const handleLongPressEnd = () => clearTimeout(longPressTimer.current)
  const doDelete = () => { setMenuOpen(false); setDeleteSheetOpen(false); onDelete(comment) }

  return (
    <>
      <div
        onMouseDown={handleLongPressStart} onMouseUp={handleLongPressEnd}
        onTouchStart={handleLongPressStart} onTouchEnd={handleLongPressEnd} onTouchCancel={handleLongPressEnd}
        style={{ display: 'flex', gap: 10, padding: '10px 0', opacity: comment._opt ? 0.6 : 1, position: 'relative' }}
      >
        <img src={avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{comment.user?.name || comment.user?.username}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{timeAgo(comment.created_at)}</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: '3px 0 6px', lineHeight: 1.4 }}>{comment.body}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => onReply(comment)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 11, padding: 0 }}>
              <RiReplyLine size={13} /> Reply
            </button>
            {canDelete && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setMenuOpen(o => !o)}
                  style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0 }}>
                  <RiMoreLine size={15} />
                </button>
                {menuOpen && (
                  <>
                    <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                    <div style={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 99, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', minWidth: 120, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', marginBottom: 4 }}>
                      <button onClick={doDelete} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 13, fontWeight: 600 }}>
                        <RiDeleteBinLine size={15} /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {comment.replies?.length > 0 && (
            <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '2px solid rgba(255,255,255,0.06)' }}>
              {comment.replies.map(r => (
                <CommentItem key={r.id} comment={r} onReply={onReply} onDelete={onDelete} currentUserId={currentUserId} isAdmin={isAdmin} />
              ))}
            </div>
          )}
        </div>
      </div>
      {deleteSheetOpen && (
        <>
          <div onClick={() => setDeleteSheetOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201, background: 'rgba(18,18,18,0.98)', backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', animation: 'vc-slideup 0.25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
            </div>
            <div style={{ padding: '8px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{comment.user?.name}</p>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{comment.body}</p>
            </div>
            <button onClick={doDelete} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 15, fontWeight: 700 }}>
              <RiDeleteBinLine size={20} /> Delete Comment
            </button>
            <button onClick={() => setDeleteSheetOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 'calc(100% - 32px)', margin: '0 16px 16px', padding: '13px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, borderRadius: 14 }}>
              Cancel
            </button>
          </div>
        </>
      )}
    </>
  )
}

// ── SideBtn ───────────────────────────────────────────────────────────────────
function SideBtn({ onClick, children, label }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))' }}>
        {children}
      </div>
      {label !== undefined && label !== '' && (
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.9)', marginTop: 1 }}>{label}</span>
      )}
    </button>
  )
}

// ── useVideoDownload hook ─────────────────────────────────────────────────────
function useVideoDownload(video) {
  const [dlState, setDlState] = useState('idle') // idle | preparing | processing | done | error
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

// ── Main VideoCard ────────────────────────────────────────────────────────────
export default function VideoCard({ video, isActive }) {
  const { auth }        = usePage().props
  const videoRef        = useRef(null)
  const watchStartRef   = useRef(null)
  const commentInputRef = useRef(null)
  const lastTap         = useRef(0)
  const viewTimerRef = useRef(null)

  const [playing,       setPlaying]       = useState(false)
  const [muted,         setMuted]         = useState(true)
  const [progress,      setProgress]      = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [tapFlash,      setTapFlash]      = useState(false)
  const [liked,         setLiked]         = useState(video.is_liked ?? false)
  const [likesCount,    setLikesCount]    = useState(Number(video.likes_count ?? 0))
  const [saved,         setSaved]         = useState(video.is_saved ?? false)
  const [savesCount,    setSavesCount]    = useState(Number(video.saves_count ?? 0))
  const [followed,      setFollowed]      = useState(video.is_following ?? false)
  const [commentsCount, setCommentsCount] = useState(Number(video.comments_count ?? 0))
  const [showComments,  setShowComments]  = useState(false)
  const [showProducts,  setShowProducts]  = useState(false)
  const [showShare,     setShowShare]     = useState(false)
  const [comments,      setComments]      = useState([])
  const [commentBody,   setCommentBody]   = useState('')
  const [sending,       setSending]       = useState(false)
  const [loadingCmts,   setLoadingCmts]   = useState(false)
  const [cmtsLoaded,    setCmtsLoaded]    = useState(false)
  const [replyTo,       setReplyTo]       = useState(null)

  // ── Download hook ─────────────────────────────────────────────────────────
  const { download, dlState } = useVideoDownload(video)

  const isOwner     = auth?.user?.id === video.user_id
  const isAdmin     = auth?.user?.role === 'admin'
  const hasProducts = video.is_for_sale && video.products?.length > 0
  const videoSrc    = video.video_stream_url ?? video.hls_url ?? video.video_url
  const videoUrl    = typeof window !== 'undefined' ? `${window.location.origin}/@${video.user?.username}/video/${video.ulid}` : ''

 useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (isActive) {
        el.muted = true
        el.play().then(() => { setPlaying(true); setTimeout(() => { el.muted = false; setMuted(false) }, 300) }).catch(() => {})
        watchStartRef.current = Date.now()

        // Fire view after 5 seconds of watching — catches users who never scroll away
        viewTimerRef.current = setTimeout(() => {
            const secs = Math.round((Date.now() - watchStartRef.current) / 1000)
            if (secs >= 3) {
                axios.post(`/api/videos/${video.ulid}/view`, { watch_seconds: secs, session_id: null }, { withCredentials: true }).catch(() => {})
                watchStartRef.current = null // prevent double-firing on scroll away
            }
        }, 5000)
    } else {
        clearTimeout(viewTimerRef.current)
        el.pause(); el.currentTime = 0
        setShowComments(false); setShowProducts(false); setShowShare(false)
        if (watchStartRef.current) {
            const secs = Math.round((Date.now() - watchStartRef.current) / 1000)
            if (secs >= 3) axios.post(`/api/videos/${video.ulid}/view`, { watch_seconds: secs, session_id: null }, { withCredentials: true }).catch(() => {})
            watchStartRef.current = null
        }
    }
}, [isActive])

  useEffect(() => {
    const el = videoRef.current; if (!el) return
    const onTime = () => { if (el.duration) setProgress((el.currentTime / el.duration) * 100) }
    el.addEventListener('timeupdate', onTime)
    return () => el.removeEventListener('timeupdate', onTime)
  }, [])

  useEffect(() => {
    if (!showComments || cmtsLoaded) return
    setLoadingCmts(true)
    axios.get(`/api/videos/${video.ulid}/comments`)
      .then(r => { setComments(r.data.data ?? r.data); setCmtsLoaded(true) })
      .catch(() => {})
      .finally(() => { setLoadingCmts(false); setTimeout(() => commentInputRef.current?.focus(), 350) })
  }, [showComments])

  const handleVideoTap = useCallback(() => {
    if (showComments || showProducts || showShare) return
    const now = Date.now()
    if (now - lastTap.current < 300) {
      if (!liked) handleLike()
      setTapFlash(true); setTimeout(() => setTapFlash(false), 700)
    } else {
      videoRef.current?.paused ? videoRef.current.play().catch(() => {}) : videoRef.current?.pause()
    }
    lastTap.current = now
  }, [liked, showComments, showProducts, showShare])

  const handleLike = useCallback(async () => {
    if (!auth?.user) { router.visit('/login'); return }
    const was = liked; setLiked(!was); setLikesCount(c => Math.max(0, c + (was ? -1 : 1)))
    try { const { data } = await axios.post(`/api/videos/${video.ulid}/like`, {}, { withCredentials: true }); setLiked(data.liked); setLikesCount(Number(data.likes_count ?? 0)) }
    catch { setLiked(was); setLikesCount(c => Math.max(0, c + (was ? 1 : -1))) }
  }, [liked, auth, video.id])

  const handleSave = useCallback(async () => {
    if (!auth?.user) { router.visit('/login'); return }
    const was = saved; setSaved(!was); setSavesCount(c => Math.max(0, c + (was ? -1 : 1)))
    try { const { data } = await axios.post(`/api/videos/${video.ulid}/save`, {}, { withCredentials: true }); setSaved(data.saved); if (data.saves_count !== undefined) setSavesCount(Number(data.saves_count)) }
    catch { setSaved(was); setSavesCount(c => Math.max(0, c + (was ? 1 : -1))) }
  }, [saved, auth, video.id])

  const handleFollow = useCallback(async () => {
    if (!auth?.user) { router.visit('/login'); return }
    if (followed) return; setFollowed(true)
    await axios.post(`/api/users/${video.user?.id}/follow`, {}, { withCredentials: true }).catch(() => setFollowed(false))
  }, [followed, auth, video.user?.id])

  const toggleMute = useCallback(() => { setMuted(m => { if (videoRef.current) videoRef.current.muted = !m; return !m }) }, [])

  const sendComment = useCallback(async () => {
    if (!commentBody.trim() || !auth?.user || sending) return
    setSending(true)
    const text = commentBody.trim(); const parentId = replyTo?.id ?? null
    const opt = { id: `opt-${Date.now()}`, body: text, user: auth.user, created_at: new Date().toISOString(), _opt: true }
    if (parentId) { setComments(prev => prev.map(c => c.id === parentId ? { ...c, replies: [...(c.replies ?? []), opt] } : c)) }
    else { setComments(prev => [opt, ...prev]); setCommentsCount(c => c + 1) }
    setCommentBody(''); setReplyTo(null)
    try {
      const { data } = await axios.post(`/api/videos/${video.ulid}/comments`, { body: text, parent_id: parentId }, { withCredentials: true })
      if (parentId) { setComments(prev => prev.map(c => c.id === parentId ? { ...c, replies: (c.replies ?? []).map(r => r.id === opt.id ? data : r) } : c)) }
      else { setComments(prev => prev.map(c => c.id === opt.id ? data : c)) }
    } catch {
      if (parentId) setComments(prev => prev.map(c => c.id === parentId ? { ...c, replies: (c.replies ?? []).filter(r => r.id !== opt.id) } : c))
      else { setComments(prev => prev.filter(c => c.id !== opt.id)); setCommentsCount(c => Math.max(0, c - 1)) }
      setCommentBody(text)
    } finally { setSending(false) }
  }, [commentBody, auth, sending, replyTo, video.id])

  const handleDeleteComment = useCallback(async (comment) => {
    const isTop = comments.some(c => c.id === comment.id)
    if (isTop) { const rc = comment.replies?.length ?? 0; setComments(prev => prev.filter(c => c.id !== comment.id)); setCommentsCount(c => Math.max(0, c - 1 - rc)) }
    else { setComments(prev => prev.map(c => ({ ...c, replies: (c.replies ?? []).filter(r => r.id !== comment.id) }))); setCommentsCount(c => Math.max(0, c - 1)) }
    await axios.delete(`/api/comments/${comment.id}`, { withCredentials: true }).catch(() => {})
  }, [comments])

  const handleReply = useCallback((comment) => { setReplyTo(comment); commentInputRef.current?.focus() }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>

      {showShare && (
        <ShareSheet
          videoUrl={videoUrl}
          videoTitle={video.title}
          onClose={() => setShowShare(false)}
          onDownload={download}
          dlState={dlState}
        />
      )}

      <video
        ref={videoRef} src={videoSrc} poster={video.thumbnail_url_full ?? undefined}
        muted loop playsInline preload="metadata"
        onCanPlay={() => setLoading(false)}
        onWaiting={() => { if (!videoRef.current?.ended) setLoading(true) }}
        onPlay={() => setPlaying(true)}
        onPause={() => { if (!videoRef.current?.ended) setPlaying(false) }}
        onEnded={() => { const el = videoRef.current; if (el) { el.currentTime = 0; el.play().catch(() => {}) } }}
        onClick={handleVideoTap}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
      />

      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.1) 45%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)', pointerEvents: 'none' }} />

      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}>
          <div style={{ width: 36, height: 36, border: '2.5px solid rgba(255,255,255,0.15)', borderTopColor: '#ff5c00', borderRadius: '50%', animation: 'vc-spin 0.8s linear infinite' }} />
        </div>
      )}

      {tapFlash && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 6 }}>
          <RiHeartFill size={96} color="#ef4444" style={{ filter: 'drop-shadow(0 0 24px rgba(239,68,68,0.6))', animation: 'vc-heart 0.65s ease forwards' }} />
        </div>
      )}

      <div onClick={e => { const el = videoRef.current; if (!el?.duration) return; const rect = e.currentTarget.getBoundingClientRect(); el.currentTime = ((e.clientX - rect.left) / rect.width) * el.duration }}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, zIndex: 10, cursor: 'pointer', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.15)' }}>
          <div style={{ height: '100%', background: '#ff5c00', width: `${progress}%`, transition: 'width 0.1s linear' }} />
        </div>
      </div>

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
          {!followed && auth?.user?.id !== video.user_id && (
            <button onClick={handleFollow} style={{ position: 'absolute', bottom: -11, left: '50%', transform: 'translateX(-50%)', width: 22, height: 22, borderRadius: '50%', background: '#ff5c00', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
              <RiUserAddLine size={11} color="#fff" />
            </button>
          )}
          {followed && (
            <div style={{ position: 'absolute', bottom: -11, left: '50%', transform: 'translateX(-50%)', width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RiUserFollowLine size={11} color="#fff" />
            </div>
          )}
        </div>
        <SideBtn onClick={handleLike} label={fmt(likesCount)}>
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
        <button onClick={toggleMute} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {muted ? <RiVolumeMuteLine size={17} color="#fff" /> : <RiVolumeUpLine size={17} color="#fff" />}
        </button>
      </div>

      <div style={{ position: 'absolute', bottom: 16, left: 14, right: 72, zIndex: 10 }} onClick={e => e.stopPropagation()}>
        <Link href={`/@${video.user?.username}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none', marginBottom: 5 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{video.user?.name}</span>
          {video.user?.is_verified && <RiVerifiedBadgeLine size={13} color="#ff5c00" />}
        </Link>
        {video.title && <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '0 0 4px', lineHeight: 1.35, textShadow: '0 1px 4px rgba(0,0,0,0.8)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{video.title}</p>}
        <ExpandableDescription text={video.description} />
        {video.hashtags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {video.hashtags.slice(0, 5).map((tag, i) => <span key={i} style={{ color: '#ff5c00', fontSize: 13, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>{tag.startsWith('#') ? tag : `#${tag}`}</span>)}
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
        <BottomSheet onClose={() => setShowComments(false)} title={`Comments (${fmt(commentsCount)})`} height="58%">
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loadingCmts && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#ff5c00', borderRadius: '50%', animation: 'vc-spin 0.8s linear infinite' }} /></div>}
            {!loadingCmts && comments.length === 0 && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: '32px 0' }}>No comments yet. Be the first!</p>}
            {comments.map(c => <CommentItem key={c.id} comment={c} onReply={handleReply} onDelete={handleDeleteComment} currentUserId={auth?.user?.id} isAdmin={isAdmin} />)}
          </div>
          <CommentInput auth={auth} commentBody={commentBody} setCommentBody={setCommentBody} sending={sending} sendComment={sendComment} replyTo={replyTo} setReplyTo={setReplyTo} inputRef={commentInputRef} />
        </BottomSheet>
      )}

      {showProducts && hasProducts && (
        <BottomSheet onClose={() => setShowProducts(false)} title="Products in this video" height="auto" maxHeight="55%">
          <div style={{ overflowY: 'auto', padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {video.products.map(p => (
              <Link key={p.id} href={`/@${p.user?.username}/products/${p.slug ?? p.id}`} style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
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

      <style>{`
        @keyframes vc-spin    { to { transform: rotate(360deg); } }
        @keyframes vc-heart   { 0%{transform:scale(0);opacity:1} 50%{transform:scale(1.3)} 100%{transform:scale(1);opacity:0} }
        @keyframes vc-slideup { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
    </div>
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