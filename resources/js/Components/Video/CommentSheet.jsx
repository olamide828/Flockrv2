import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, usePage, router } from '@inertiajs/react'
import axios from 'axios'
import Toast from '@/Components/Toast'

function timeAgo(d) {
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60)     return 'now'
  if (s < 3600)   return `${Math.floor(s / 60)}m`
  if (s < 86400)  return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(d).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}

function Avatar({ user, size = 36 }) {
  const [err, setErr] = useState(false)
  const src = (!err && user?.avatar_url)
    ? user.avatar_url
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'U')}&background=1a1a1a&color=fff`
  return (
    <img src={src} alt={user?.name ?? ''} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />
  )
}

// ── Like button (persists to DB) ─────────────────────────────────────────────
function LikeBtn({ commentId, initialCount = 0, initialLiked = false, size = 12 }) {
  const [liked,  setLiked]  = useState(initialLiked)  // ← from server, not hardcoded false
  const [count,  setCount]  = useState(initialCount)
  const [busy,   setBusy]   = useState(false)

  const toggle = async () => {
    if (busy) return
    const wasLiked = liked
    setLiked(!wasLiked)
    setCount(c => wasLiked ? Math.max(0, c - 1) : c + 1)
    setBusy(true)
    try {
      const { data } = await axios.post(`/api/comments/${commentId}/like`)
      setLiked(data.liked)
      setCount(data.likes_count)
    } catch {
      setLiked(wasLiked)
      setCount(c => wasLiked ? c + 1 : Math.max(0, c - 1))
    } finally { setBusy(false) }
  }

  return (
    <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: liked ? '#EF4444' : 'rgba(255,255,255,0.35)', fontSize: size - 1, fontWeight: 600 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
      {count > 0 && count}
    </button>
  )
}

// ── Mobile action sheet (delete + pin for owner) ─────────────────────────────
function ActionSheet({ comment, isVideoOwner, onDelete, onPin, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201, background: 'rgba(18,18,18,0.98)', backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingBottom: 'env(safe-area-inset-bottom, 16px)', animation: 'slideUp 0.22s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
        </div>
        {/* Preview */}
        <div style={{ padding: '6px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{comment.user?.name}</p>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{comment.body}</p>
        </div>
        {/* Pin — only video owner on top-level comments */}
        {isVideoOwner && !comment.parent_id && (
          <button onClick={onPin} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '15px 20px', background: 'none', border: 'none', cursor: 'pointer', color: comment.is_pinned ? '#FF6B35' : '#fff', fontSize: 15, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"/></svg>
            {comment.is_pinned ? 'Unpin comment' : 'Pin comment'}
          </button>
        )}
        {/* Delete */}
        <button onClick={onDelete} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '15px 20px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 15, fontWeight: 700 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
          Delete
        </button>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 'calc(100% - 32px)', margin: '0 16px 12px', padding: '13px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, borderRadius: 14 }}>Cancel</button>
      </div>
    </>
  )
}

// ── Desktop 3-dot menu ────────────────────────────────────────────────────────
function DesktopMenu({ comment, isVideoOwner, onDelete, onPin, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
      <div style={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 99, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', minWidth: 150, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', marginBottom: 4 }}>
        {isVideoOwner && !comment.parent_id && (
          <button onClick={onPin} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: comment.is_pinned ? '#FF6B35' : '#fff', fontSize: 13, fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"/></svg>
            {comment.is_pinned ? 'Unpin' : 'Pin comment'}
          </button>
        )}
        <button onClick={onDelete} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 13, fontWeight: 600 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
          Delete
        </button>
      </div>
    </>
  )
}

// ── Reply row (flat, depth=1) ─────────────────────────────────────────────────
function ReplyItem({ reply, videoOwnerId, currentUserId, isAdmin, onReply, onDelete, onPin }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheet,    setSheet]    = useState(false)
  const longRef   = useRef(null)
  const isMobile  = () => window.innerWidth < 768

  const isOP    = reply.user?.id === videoOwnerId
  const canDel  = currentUserId && (reply.user?.id === currentUserId || isAdmin)
  const isOwner = currentUserId === videoOwnerId

  const startLong = () => {
    if (!canDel && !isOwner) return
    longRef.current = setTimeout(() => { if (isMobile()) setSheet(true) }, 500)
  }
  const endLong = () => clearTimeout(longRef.current)
  const doDelete = () => { setMenuOpen(false); setSheet(false); onDelete(reply, true) }
  const doPin    = () => { setMenuOpen(false); setSheet(false); onPin(reply) }

  return (
    <>
      <div onMouseDown={startLong} onMouseUp={endLong} onTouchStart={startLong} onTouchEnd={endLong} onTouchCancel={endLong}
        style={{ display: 'flex', gap: 8, opacity: reply._opt ? 0.55 : 1 }}>
        <Link href={`/@${reply.user?.username}`} style={{ flexShrink: 0 }}>
          <Avatar user={reply.user} size={28} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Link href={`/@${reply.user?.username}`} style={{ textDecoration: 'none' }}>
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{reply.user?.name}</span>
            </Link>
            {isOP && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(255,107,53,0.18)', border: '1px solid rgba(255,107,53,0.35)', color: '#FF6B35' }}>OP</span>}
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{timeAgo(reply.created_at)}</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, margin: '4px 0 6px', lineHeight: 1.45, wordBreak: 'break-word' }}>
            {reply.reply_to_username && <span style={{ color: '#FF6B35', fontWeight: 600, marginRight: 4 }}>@{reply.reply_to_username}</span>}
            {reply.body}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <LikeBtn commentId={reply.id} initialCount={reply.likes_count ?? 0} initialLiked={reply.is_liked_by_me ?? false} size={12} />
            <button onClick={() => onReply(reply)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600 }}>Reply</button>
            {(canDel || isOwner) && !isMobile() && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setMenuOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                </button>
                {menuOpen && <DesktopMenu comment={reply} isVideoOwner={isOwner} onDelete={doDelete} onPin={doPin} onClose={() => setMenuOpen(false)} />}
              </div>
            )}
          </div>
        </div>
      </div>
      {sheet && <ActionSheet comment={reply} isVideoOwner={isOwner} onDelete={doDelete} onPin={doPin} onClose={() => setSheet(false)} />}
    </>
  )
}

// ── Top-level comment ─────────────────────────────────────────────────────────
function CommentItem({ comment, videoOwnerId, currentUserId, isAdmin, onReply, onDelete, onPin }) {
  const [showReplies, setShowReplies] = useState(false)
  const [pinnedLocal, setPinnedLocal] = useState(comment.is_pinned)
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [sheet,       setSheet]       = useState(false)
  const longRef  = useRef(null)
  const isMobile = () => window.innerWidth < 768

  const isOP    = comment.user?.id === videoOwnerId
  const canDel  = currentUserId && (comment.user?.id === currentUserId || isAdmin)
  const isOwner = currentUserId === videoOwnerId
  const replies = comment.replies ?? []

  const startLong = () => {
    if (!canDel && !isOwner) return
    longRef.current = setTimeout(() => { if (isMobile()) setSheet(true) }, 500)
  }
  const endLong = () => clearTimeout(longRef.current)
  const doDelete = () => { setMenuOpen(false); setSheet(false); onDelete(comment, false) }
  const doPin    = () => {
    setMenuOpen(false); setSheet(false)
    setPinnedLocal(p => !p)
    onPin(comment)
  }

  const handleReplyToReply = (reply) => {
    setShowReplies(true)
    onReply({ rootId: comment.id, tagUsername: reply.user?.username })
  }

  return (
    <>
      <div onMouseDown={startLong} onMouseUp={endLong} onTouchStart={startLong} onTouchEnd={endLong} onTouchCancel={endLong}
        style={{ display: 'flex', gap: 10, opacity: comment._opt ? 0.55 : 1 }}>
        <Link href={`/@${comment.user?.username}`} style={{ flexShrink: 0 }}>
          <Avatar user={comment.user} size={36} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Link href={`/@${comment.user?.username}`} style={{ textDecoration: 'none' }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{comment.user?.name}</span>
            </Link>
            {isOP && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(255,107,53,0.18)', border: '1px solid rgba(255,107,53,0.35)', color: '#FF6B35' }}>OP</span>}
            {pinnedLocal && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>📌 Pinned</span>}
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{timeAgo(comment.created_at)}</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14, margin: '5px 0 8px', lineHeight: 1.45, wordBreak: 'break-word' }}>{comment.body}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <LikeBtn commentId={comment.id} initialCount={comment.likes_count ?? 0} initialLiked={comment.is_liked_by_me ?? false} size={13} />
            <button onClick={() => onReply({ rootId: comment.id, tagUsername: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 600 }}>Reply</button>
            {(canDel || isOwner) && !isMobile() && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setMenuOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                </button>
                {menuOpen && <DesktopMenu comment={{ ...comment, is_pinned: pinnedLocal }} isVideoOwner={isOwner} onDelete={doDelete} onPin={doPin} onClose={() => setMenuOpen(false)} />}
              </div>
            )}
          </div>

          {/* View replies toggle */}
          {replies.length > 0 && (
            <button onClick={() => setShowReplies(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#FF6B35', fontSize: 12, fontWeight: 700 }}>
              <div style={{ width: 22, height: 1.5, background: 'rgba(255,107,53,0.45)', borderRadius: 1 }} />
              {showReplies ? 'Hide replies' : `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
            </button>
          )}

          {/* Flat reply thread */}
          {showReplies && replies.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {replies.map(reply => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  videoOwnerId={videoOwnerId}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onReply={handleReplyToReply}
                  onDelete={onDelete}
                  onPin={onPin}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {sheet && <ActionSheet comment={{ ...comment, is_pinned: pinnedLocal }} isVideoOwner={isOwner} onDelete={doDelete} onPin={doPin} onClose={() => setSheet(false)} />}
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CommentSheet({ videoId, videoOwnerId, onClose, onCountChange }) {
  const { auth } = usePage().props
  const isAdmin  = auth?.user?.role === 'admin'

  const [comments, setComments] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [body,     setBody]     = useState('')
  const [posting,  setPosting]  = useState(false)
  const [replyTo,  setReplyTo]  = useState(null)
  const [toast, setToast] = useState(null)
const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
}
  // replyTo = { rootId: number, tagUsername: string|null }

  const inputRef = useRef(null)

  useEffect(() => {
    axios.get(`/api/videos/${videoId}/comments`)
      .then(r => setComments(r.data.data ?? r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [videoId])

  useEffect(() => {
    if (replyTo) setTimeout(() => inputRef.current?.focus(), 80)
  }, [replyTo])

  const handleReply = useCallback(({ rootId, tagUsername }) => {
    setReplyTo({ rootId, tagUsername })
  }, [])

  const handlePin = useCallback(async (comment) => {
    try {
      await axios.post(`/api/comments/${comment.id}/pin`)
      // Refresh to get accurate pinned state from server
      const r = await axios.get(`/api/videos/${videoId}/comments`)
      setComments(r.data.data ?? r.data ?? [])
      showToast('Comment pinned', 'success')
    } catch {}
  }, [videoId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!auth?.user) { router.visit('/login'); return }
    if (!body.trim() || posting) return
    setPosting(true)

    const text     = body.trim()
    const parentId = replyTo?.rootId ?? null
    const tagUser  = replyTo?.tagUsername ?? null

    const optimistic = {
      id:                `opt-${Date.now()}`,
      body:              text,
      user:              auth.user,
      created_at:        new Date().toISOString(),
      likes_count:       0,
      replies:           [],
      reply_to_username: tagUser,
      is_pinned:         false,
      _opt:              true,
    }

    if (parentId) {
      // ── KEY FIX: auto-expand the parent thread so reply is visible immediately
      setComments(prev => prev.map(c =>
        c.id === parentId
          ? { ...c, replies: [...(c.replies ?? []), optimistic] }
          : c
      ))
    } else {
      setComments(prev => [optimistic, ...prev])
      onCountChange?.(1)
    }

    setBody('')
    setReplyTo(null)

    try {
      const { data } = await axios.post(`/api/videos/${videoId}/comments`, {
        body:               text,
        parent_id:          parentId,
        reply_to_username:  tagUser ?? undefined,
      })

      if (parentId) {
        // Replace optimistic with real data — keep it in replies[], not top-level
        setComments(prev => prev.map(c =>
          c.id === parentId
            ? { ...c, replies: (c.replies ?? []).map(r => r.id === optimistic.id ? { ...data, reply_to_username: tagUser } : r) }
            : c
        ))
      } else {
        setComments(prev => prev.map(c => c.id === optimistic.id ? data : c))
        showToast('Comment added', 'success')
      }
    } catch {
      // Rollback
      if (parentId) {
        setComments(prev => prev.map(c =>
          c.id === parentId
            ? { ...c, replies: (c.replies ?? []).filter(r => r.id !== optimistic.id) }
            : c
        ))
      } else {
        setComments(prev => prev.filter(c => c.id !== optimistic.id))
        onCountChange?.(-1)
      }
      setBody(text)
    } finally { setPosting(false) }
  }

  const handleDelete = useCallback(async (comment, isReply) => {
    if (isReply) {
      setComments(prev => prev.map(c => ({
        ...c,
        replies: (c.replies ?? []).filter(r => r.id !== comment.id),
      })))
      onCountChange?.(-1)
    } else {
      const replyCount = comment.replies?.length ?? 0
      setComments(prev => prev.filter(c => c.id !== comment.id))
      onCountChange?.(-(1 + replyCount))
    }
    try {
    await axios.delete(`/api/comments/${comment.id}`)
    showToast('Comment deleted', 'error')
}
    catch {
      const r = await axios.get(`/api/videos/${videoId}/comments`).catch(() => null)
      if (r) setComments(r.data.data ?? r.data ?? [])
    }
  }, [videoId])

  const totalCount = comments.reduce((s, c) => s + 1 + (c.replies?.length ?? 0), 0)
  const replyingToComment = replyTo ? comments.find(c => c.id === replyTo.rootId) : null

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }} />

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40, background: '#111', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', height: '72vh', animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)' }}>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Comments</span>
            {!loading && totalCount > 0 && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>{totalCount}</span>}
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Comment list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 20, scrollbarWidth: 'none' }}>
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, opacity: 1 - i * 0.2 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: 80,    height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.07)', marginBottom: 8 }} />
                <div style={{ width: '90%', height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.05)', marginBottom: 5 }} />
                <div style={{ width: '65%', height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.04)' }} />
              </div>
            </div>
          ))}

          {!loading && comments.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 0' }}>
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: 0 }}>No comments yet</p>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, margin: 0 }}>Be the first to say something</p>
            </div>
          )}

          {!loading && comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              videoOwnerId={videoOwnerId}
              currentUserId={auth?.user?.id}
              isAdmin={isAdmin}
              onReply={handleReply}
              onDelete={handleDelete}
              onPin={handlePin}
            />
          ))}
        </div>

        {/* Input */}
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 14px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          {replyTo && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '7px 11px', background: 'rgba(255,107,53,0.08)', borderRadius: 10, border: '1px solid rgba(255,107,53,0.2)' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                Replying to <span style={{ color: '#FF6B35', fontWeight: 600 }}>@{replyTo.tagUsername ?? replyingToComment?.user?.username}</span>
              </span>
              <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', padding: 2 }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {auth?.user ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Avatar user={auth.user} size={32} />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '0 14px', gap: 8 }}>
                <input
                  ref={inputRef}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
                  placeholder={replyTo ? `Reply to @${replyTo.tagUsername ?? replyingToComment?.user?.username}...` : 'Add a comment...'}
                  maxLength={500}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 14, padding: '10px 0' }}
                />
                {body.length > 400 && <span style={{ fontSize: 10, color: body.length >= 500 ? '#EF4444' : 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{500 - body.length}</span>}
              </div>
              <button type="submit" disabled={!body.trim() || posting} style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: body.trim() ? 'pointer' : 'default', background: body.trim() && !posting ? '#FF6B35' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                {posting
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={body.trim() ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                }
              </button>
            </form>
          ) : (
            <button onClick={() => router.visit('/login')} style={{ width: '100%', padding: '12px', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', borderRadius: 14, color: '#FF6B35', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Log in to comment
            </button>
          )}
        </div>
      </div>

      {toast && (
          <div style={{ position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 30, pointerEvents: 'none' }}>
              <Toast toast={toast ? { message: toast.msg, type: toast.type } : null} onDismiss={() => setToast(null)} />
          </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes spin    { to   { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}