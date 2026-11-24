import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, usePage, router } from '@inertiajs/react'
import axios from 'axios'
import {
  RiCloseLine, RiMoreFill, RiHeartFill, RiHeartLine, RiPushpinFill, RiFlagLine, RiDeleteBinLine,
  RiFileCopyLine, RiSendPlaneFill, RiImageAddLine, RiChat3Line, RiCheckLine,
} from 'react-icons/ri'
import Toast from '@/Components/Toast'
import MentionText from '@/Components/Common/MentionText'
import MentionSuggest, { detectMention, applyMention } from '@/Components/Common/MentionSuggest'
import { firstChar } from '@/lib/initial'

const ORANGE = '#FF6B35'
const MAX_IMG_MB = 5
const REPORT_REASONS = ['Spam', 'Harassment or bullying', 'Hate speech', 'Nudity or sexual content', 'Violence or threats', 'Scam or fraud', 'Misinformation', 'Something else']

// ── emoji suggestions: a default row, with matching ones moved to the front as you type ──
const BASE_EMOJIS = ['😂', '😍', '🔥', '👏', '😮', '🙌', '💯', '❤️', '😭', '🙏', '🤣', '😎']
const WORD_EMOJIS = [
  [/love|luv|beautiful|gorgeous|cute|pretty|nice/i, ['😍', '❤️', '🥰']],
  [/lol|lmao|funny|haha|hehe|joke|laugh/i, ['😂', '🤣', '😭']],
  [/fire|hot|lit|sweet|dope|clean|sharp/i, ['🔥', '💯', '😮']],
  [/congrat|well done|proud|bravo|great|good job|nice one/i, ['👏', '🎉', '🙌']],
  [/thank|thanks|bless|amen|please|pls/i, ['🙏', '❤️', '🥹']],
  [/wow|omg|shock|crazy|wahala|wild/i, ['😮', '😱', '🤯']],
  [/sad|sorry|pain|cry|miss/i, ['😢', '😭', '💔']],
  [/price|cost|buy|how much|where|available|dm/i, ['🛍️', '💸', '👀']],
]
function suggestEmojis(text) {
  const front = []
  for (const [re, list] of WORD_EMOJIS) if (re.test(text)) front.push(...list)
  return [...new Set([...front, ...BASE_EMOJIS])].slice(0, 14)
}

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
  const src = !err && user?.avatar_url
  return src
    ? <img src={src} alt={user?.name ?? ''} onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#ff5c00,#ff8c00)', color: '#fff', fontWeight: 700, fontSize: size * 0.42, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{firstChar(user?.name)}</div>
}

/** Small round creator avatar with a red heart at its bottom: "the creator liked this comment" */
function CreatorLiked({ owner }) {
  const [tip, setTip] = useState(false)
  useEffect(() => {
    if (!tip) return
    const t = setTimeout(() => setTip(false), 2200)
    return () => clearTimeout(t)
  }, [tip])
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, marginBottom: 5 }}>
      <button type="button" onClick={(e) => { e.stopPropagation(); setTip(t => !t) }} aria-label="Liked by creator"
        style={{ position: 'relative', display: 'inline-flex', width: 22, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer', lineHeight: 0 }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', border: '1.5px solid #111', display: 'block' }}><Avatar user={owner} size={22} /></span>
        <span style={{ position: 'absolute', left: '50%', bottom: -6, transform: 'translateX(-50%)', width: 13, height: 13, borderRadius: '50%', background: '#111', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}>
          <RiHeartFill size={9} color="#EF4444" style={{ display: 'block' }} />
        </span>
      </button>
      {tip && (
        <span role="tooltip" style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: -6, whiteSpace: 'nowrap', background: 'rgba(40,40,44,0.98)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.5)', zIndex: 5 }}>
          Liked by creator
          <span style={{ position: 'absolute', top: '100%', left: 14, width: 8, height: 8, background: 'rgba(40,40,44,0.98)', borderRight: '1px solid rgba(255,255,255,0.14)', borderBottom: '1px solid rgba(255,255,255,0.14)', transform: 'translateY(-4px) rotate(45deg)' }} />
        </span>
      )}
    </span>
  )
}

function LikeBtn({ commentId, initialCount = 0, initialLiked = false, onResult, size = 13 }) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const busy = useRef(false)
  const toggle = async () => {
    if (busy.current) return
    busy.current = true
    const was = liked
    setLiked(!was); setCount(c => was ? Math.max(0, c - 1) : c + 1)
    try {
      const { data } = await axios.post(`/api/comments/${commentId}/like`)
      setLiked(data.liked); setCount(data.likes_count); onResult?.(data)
    } catch { setLiked(was); setCount(c => was ? c + 1 : Math.max(0, c - 1)) }
    finally { busy.current = false }
  }
  return (
    <button onClick={toggle} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: liked ? '#EF4444' : 'rgba(255,255,255,0.4)', fontSize: size - 1, fontWeight: 600, lineHeight: 1 }}>
      {liked ? <RiHeartFill size={size + 1} style={{ display: 'block' }} /> : <RiHeartLine size={size + 1} style={{ display: 'block' }} />}
      {count > 0 && <span>{count}</span>}
    </button>
  )
}

// ── bottom sheet used for the ⋯ menu and the report form (sits inside the comment sheet) ──
function MiniSheet({ title, onClose, children }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 61, background: 'rgba(22,22,24,0.98)', backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', maxHeight: '80%', overflowY: 'auto', animation: 'cs-slideUp .22s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}><div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} /></div>
        {title && <p style={{ margin: 0, padding: '4px 20px 10px', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600 }}>{title}</p>}
        {children}
      </div>
    </>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', color: danger ? '#EF4444' : '#fff', fontSize: 15, fontWeight: 600, textAlign: 'left' }}>
      <Icon size={20} style={{ display: 'block', flexShrink: 0 }} />{label}
    </button>
  )
}

function ReportSheet({ onClose, onSubmit }) {
  const [reason, setReason] = useState(null)
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <MiniSheet title="Why are you reporting this comment?" onClose={onClose}>
      <div style={{ padding: '0 12px' }}>
        {REPORT_REASONS.map(r => (
          <button key={r} onClick={() => setReason(r)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 10px', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: '#fff', fontSize: 14, textAlign: 'left' }}>
            {r}{reason === r && <RiCheckLine size={18} color={ORANGE} style={{ display: 'block' }} />}
          </button>
        ))}
        {reason && (
          <textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={500} rows={2} placeholder="Add details (optional)"
            style={{ width: '100%', boxSizing: 'border-box', marginTop: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none', resize: 'none' }} />
        )}
        <button disabled={!reason || busy} onClick={async () => { setBusy(true); await onSubmit(reason, details.trim()); setBusy(false) }}
          style={{ width: '100%', margin: '12px 0 4px', height: 46, borderRadius: 14, border: 'none', cursor: reason ? 'pointer' : 'default', background: reason ? ORANGE : 'rgba(255,255,255,0.08)', color: reason ? '#fff' : 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: 15 }}>
          {busy ? 'Sending…' : 'Send report'}
        </button>
      </div>
    </MiniSheet>
  )
}

function ImageViewer({ src, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', right: 14, width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.14)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 0 }}>
        <RiCloseLine size={22} style={{ display: 'block' }} />
      </button>
      <img src={src} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
    </div>
  )
}

// ── One comment or reply ──
function CommentRow({ comment, isReply, onLikeResult, owner, videoOwnerId, currentUserId, isAdmin, onReply, onMenu, onOpenImage, children }) {
  const isCreator = comment.user?.id === videoOwnerId
  const small = isReply
  const pressRef = useRef(null)
  const pt = useRef({ x: 0, y: 0 })
  const startPress = (e) => {
    if (!currentUserId) return
    const t = e.touches?.[0]; if (t) pt.current = { x: t.clientX, y: t.clientY }
    clearTimeout(pressRef.current)
    pressRef.current = setTimeout(() => onMenu(comment, isReply), 450)
  }
  const movePress = (e) => { const t = e.touches?.[0]; if (t && (Math.abs(t.clientX - pt.current.x) > 8 || Math.abs(t.clientY - pt.current.y) > 8)) clearTimeout(pressRef.current) }
  const endPress = () => clearTimeout(pressRef.current)

  return (
    <div onTouchStart={startPress} onTouchMove={movePress} onTouchEnd={endPress} onTouchCancel={endPress}
      style={{ display: 'flex', gap: small ? 8 : 10, opacity: comment._opt ? 0.55 : 1, WebkitTouchCallout: 'none' }}>
      <Link href={`/@${comment.user?.username}`} style={{ flexShrink: 0 }}><Avatar user={comment.user} size={small ? 28 : 36} /></Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Link href={`/@${comment.user?.username}`} style={{ textDecoration: 'none' }}><span style={{ color: '#fff', fontSize: small ? 12 : 13, fontWeight: 700 }}>{comment.user?.name}</span></Link>
          {isCreator && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(255,107,53,0.18)', border: '1px solid rgba(255,107,53,0.35)', color: ORANGE }}>Creator</span>}
          {comment.is_pinned && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}><RiPushpinFill size={9} style={{ display: 'block' }} />Pinned</span>}
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{timeAgo(comment.created_at)}</span>
        </div>

        {(comment.body || comment.reply_to_username) && (
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: small ? 13 : 14, margin: '4px 0 6px', lineHeight: 1.45, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
            {comment.reply_to_username && <Link href={`/@${comment.reply_to_username}`} style={{ color: ORANGE, fontWeight: 600, marginRight: 4, textDecoration: 'none' }}>@{comment.reply_to_username}</Link>}
            <MentionText text={comment.body} />
          </p>
        )}

        {comment.image_url && (
          <button onClick={() => onOpenImage(comment.image_url)} aria-label="Open picture" style={{ display: 'block', padding: 0, margin: '2px 0 8px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, overflow: 'hidden', background: '#000', cursor: 'zoom-in' }}>
            <img src={comment.image_url} alt="" loading="lazy" style={{ display: 'block', maxWidth: small ? 170 : 220, maxHeight: small ? 170 : 240, width: 'auto', height: 'auto', objectFit: 'cover' }} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minHeight: 24 }}>
          <LikeBtn commentId={comment.id} initialCount={comment.likes_count ?? 0} initialLiked={comment.is_liked_by_me ?? false} size={small ? 12 : 13}
            onResult={(d) => onLikeResult(comment.id, d)} />
          {!comment._opt && <button onClick={() => onReply(comment, isReply)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600 }}>Reply</button>}
          {comment.liked_by_creator && owner && <CreatorLiked owner={owner} />}
          {currentUserId && !comment._opt && (
            <button onClick={() => onMenu(comment, isReply)} aria-label="More" style={{ marginLeft: 'auto', width: 26, height: 26, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 0 }}>
              <RiMoreFill size={17} style={{ display: 'block' }} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Main ──
export default function CommentSheet({ videoId, videoOwnerId, onClose, onCountChange }) {
  const { auth } = usePage().props
  const me = auth?.user
  const isAdmin = me?.role === 'admin'

  const [comments, setComments] = useState([])
  const [owner, setOwner]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [body, setBody]         = useState('')
  const [image, setImage]       = useState(null)       // { file, url }
  const [posting, setPosting]   = useState(false)
  const [replyTo, setReplyTo]   = useState(null)       // { rootId, tagUsername }
  const [expanded, setExpanded] = useState({})
  const [menu, setMenu]         = useState(null)       // { comment, isReply }
  const [reporting, setReporting] = useState(null)
  const [viewer, setViewer]     = useState(null)
  const [mention, setMention]   = useState(null)
  const [toast, setToast]       = useState(null)
  const inputRef = useRef(null)
  const fileRef  = useRef(null)

  const showToast = (msg, type = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 2500) }

  const load = useCallback(() => axios.get(`/api/videos/${videoId}/comments`).then(r => {
    setComments(r.data.data ?? r.data ?? [])
    if (r.data.video_owner) setOwner(r.data.video_owner)
  }), [videoId])

  useEffect(() => { load().catch(() => {}).finally(() => setLoading(false)) }, [load])
  useEffect(() => { if (replyTo) setTimeout(() => inputRef.current?.focus(), 80) }, [replyTo])
  useEffect(() => () => { if (image?.url) URL.revokeObjectURL(image.url) }, [image])

  const emojis = useMemo(() => suggestEmojis(body), [body])
  const isOwner = me?.id === videoOwnerId

  const insertEmoji = (e) => {
    const el = inputRef.current
    const at = el?.selectionStart ?? body.length
    const to = el?.selectionEnd ?? at
    const next = (body.slice(0, at) + e + body.slice(to)).slice(0, 500)
    setBody(next)
    setTimeout(() => { el?.focus(); const p = at + e.length; el?.setSelectionRange?.(p, p) }, 0)
  }

  const onInput = (e) => {
    setBody(e.target.value)
    setMention(detectMention(e.target.value, e.target.selectionStart))
  }

  const pickFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!/^image\//.test(f.type)) { showToast('Only pictures can be added for now.', 'error'); return }
    if (f.size > MAX_IMG_MB * 1024 * 1024) { showToast(`That picture is too big (max ${MAX_IMG_MB}MB).`, 'error'); return }
    setImage({ file: f, url: URL.createObjectURL(f) })
  }

  const handleReply = useCallback((comment, isReply) => {
    const rootId = isReply ? comments.find(c => (c.replies ?? []).some(r => r.id === comment.id))?.id : comment.id
    if (!rootId) return
    setExpanded(x => ({ ...x, [rootId]: true }))
    setReplyTo({ rootId, tagUsername: isReply ? comment.user?.username : null })
  }, [comments])

  const handlePin = async (comment) => {
    try {
      await axios.post(`/api/comments/${comment.id}/pin`)
      await load()
      showToast(comment.is_pinned ? 'Comment unpinned' : 'Comment pinned')
    } catch { showToast('Could not pin that comment', 'error') }
  }

  const handleDelete = async (comment, isReply) => {
    if (isReply) {
      setComments(prev => prev.map(c => ({ ...c, replies: (c.replies ?? []).filter(r => r.id !== comment.id) })))
      onCountChange?.(-1)
    } else {
      const n = comment.replies?.length ?? 0
      setComments(prev => prev.filter(c => c.id !== comment.id))
      onCountChange?.(-(1 + n))
    }
    try { await axios.delete(`/api/comments/${comment.id}`); showToast('Comment deleted') }
    catch { showToast('Could not delete that comment', 'error'); load().catch(() => {}) }
  }

  const submitReport = async (reason, description) => {
    try {
      const { data } = await axios.post(`/api/comments/${reporting.id}/report`, { reason, description: description || undefined })
      showToast(data.message ?? 'Report sent')
      setReporting(null)
    } catch (e) { showToast(e.response?.data?.message ?? 'Could not send the report', 'error') }
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!me) { router.visit('/login'); return }
    const text = body.trim()
    if ((!text && !image) || posting) return
    setPosting(true)

    const parentId = replyTo?.rootId ?? null
    const tagUser  = replyTo?.tagUsername ?? null
    const img      = image

    const optimistic = {
      id: `opt-${Date.now()}`, body: text, user: me, created_at: new Date().toISOString(), likes_count: 0, replies: [],
      reply_to_username: tagUser, is_pinned: false, image_url: img?.url ?? null, _opt: true,
    }
    if (parentId) {
      setComments(prev => prev.map(c => c.id === parentId ? { ...c, replies: [...(c.replies ?? []), optimistic] } : c))
      setExpanded(x => ({ ...x, [parentId]: true }))
    } else {
      setComments(prev => [optimistic, ...prev]); onCountChange?.(1)
    }
    setBody(''); setReplyTo(null); setImage(null); setMention(null)

    try {
      const fd = new FormData()
      if (text) fd.append('body', text)
      if (parentId) fd.append('parent_id', parentId)
      if (tagUser) fd.append('reply_to_username', tagUser)
      if (img) fd.append('image', img.file)
      const { data } = await axios.post(`/api/videos/${videoId}/comments`, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 })
      if (parentId) setComments(prev => prev.map(c => c.id === parentId ? { ...c, replies: (c.replies ?? []).map(r => r.id === optimistic.id ? { ...data, reply_to_username: tagUser } : r) } : c))
      else { setComments(prev => prev.map(c => c.id === optimistic.id ? data : c)); showToast('Comment added') }
    } catch (err) {
      if (parentId) setComments(prev => prev.map(c => c.id === parentId ? { ...c, replies: (c.replies ?? []).filter(r => r.id !== optimistic.id) } : c))
      else { setComments(prev => prev.filter(c => c.id !== optimistic.id)); onCountChange?.(-1) }
      setBody(text); if (img) setImage(img)
      showToast(err.response?.data?.message ?? err.response?.data?.errors?.image?.[0] ?? 'Could not post your comment', 'error')
    } finally { setPosting(false) }
  }

  const totalCount = comments.reduce((s, c) => s + 1 + (c.replies?.length ?? 0), 0)
  const replyingToComment = replyTo ? comments.find(c => c.id === replyTo.rootId) : null
  const canSend = (body.trim() || image) && !posting

  const menuComment = menu?.comment
  const canDeleteMenu = menuComment && me && (menuComment.user?.id === me.id || isOwner || isAdmin)
  const onLikeResult = (id, d) => setComments(prev => prev.map(c => c.id === id ? { ...c, liked_by_creator: d.liked_by_creator } : { ...c, replies: (c.replies ?? []).map(r => r.id === id ? { ...r, liked_by_creator: d.liked_by_creator } : r) }))
  const rowProps = { onLikeResult, owner, videoOwnerId, currentUserId: me?.id, isAdmin, onReply: handleReply, onMenu: (comment, isReply) => setMenu({ comment, isReply }), onOpenImage: setViewer }

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }} />

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40, background: 'linear-gradient(180deg,#161618,#0e0e10)', borderRadius: '22px 22px 0 0', borderTop: '1px solid rgba(255,255,255,0.09)', display: 'flex', flexDirection: 'column', height: '78vh', animation: 'cs-slideUp 0.28s cubic-bezier(0.32,0.72,0,1)', overflow: 'hidden' }}>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '9px 0 0', flexShrink: 0 }}><div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)' }} /></div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, letterSpacing: '-0.2px' }}>Comments</span>
            {!loading && totalCount > 0 && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600 }}>{totalCount}</span>}
          </div>
          <button onClick={onClose} aria-label="Close comments" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 0, lineHeight: 0 }}>
            <RiCloseLine size={18} style={{ display: 'block' }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 20, scrollbarWidth: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}>
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, opacity: 1 - i * 0.2 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: 80, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.07)', marginBottom: 8 }} />
                <div style={{ width: '90%', height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.05)', marginBottom: 5 }} />
                <div style={{ width: '65%', height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.04)' }} />
              </div>
            </div>
          ))}

          {!loading && comments.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 0' }}>
              <RiChat3Line size={40} color="rgba(255,255,255,0.2)" />
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0, fontWeight: 600 }}>No comments yet</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, margin: 0 }}>Be the first to say something</p>
            </div>
          )}

          {!loading && comments.map(comment => {
            const replies = comment.replies ?? []
            const open = !!expanded[comment.id]
            return (
              <CommentRow key={comment.id} comment={comment} isReply={false} {...rowProps}>
                {replies.length > 0 && (
                  <button onClick={() => setExpanded(x => ({ ...x, [comment.id]: !open }))} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: ORANGE, fontSize: 12, fontWeight: 700 }}>
                    <span style={{ width: 22, height: 1.5, background: 'rgba(255,107,53,0.45)', borderRadius: 1 }} />
                    {open ? 'Hide replies' : `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
                  </button>
                )}
                {open && replies.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {replies.map(r => <CommentRow key={r.id} comment={r} isReply {...rowProps} />)}
                  </div>
                )}
              </CommentRow>
            )
          })}
        </div>

        {/* composer */}
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)', padding: '8px 12px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', background: 'rgba(14,14,16,0.9)' }}>
          {replyTo && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '6px 10px', background: 'rgba(255,107,53,0.08)', borderRadius: 10, border: '1px solid rgba(255,107,53,0.2)' }}>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>Replying to <span style={{ color: ORANGE, fontWeight: 600 }}>@{replyTo.tagUsername ?? replyingToComment?.user?.username}</span></span>
              <button onClick={() => setReplyTo(null)} aria-label="Cancel reply" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 2, lineHeight: 0 }}><RiCloseLine size={14} style={{ display: 'block' }} /></button>
            </div>
          )}

          {me ? (
            <>
              {mention && (
                <div style={{ marginBottom: 8 }}>
                  <MentionSuggest query={mention.query} onClose={() => setMention(null)}
                    onPick={(u) => { setBody(b => applyMention(b, mention, u.username)); setTimeout(() => inputRef.current?.focus(), 0) }} />
                </div>
              )}

              {image && (
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
                  <img src={image.url} alt="" style={{ height: 72, maxWidth: 160, objectFit: 'cover', borderRadius: 12, display: 'block', border: '1px solid rgba(255,255,255,0.12)' }} />
                  <button onClick={() => setImage(null)} aria-label="Remove picture" style={{ position: 'absolute', top: -7, right: -7, width: 22, height: 22, borderRadius: '50%', background: '#2a2a2e', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 0 }}>
                    <RiCloseLine size={13} style={{ display: 'block' }} />
                  </button>
                </div>
              )}

              {/* emoji suggestions */}
              <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 8, paddingBottom: 2 }}>
                {emojis.map(em => (
                  <button key={em} type="button" onMouseDown={e => e.preventDefault()} onClick={() => insertEmoji(em)} aria-label={`Add ${em}`}
                    style={{ flex: '0 0 auto', width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 20, background: 'rgba(255,255,255,0.06)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 }}>{em}</button>
                ))}
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Avatar user={me} size={32} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '0 6px 0 14px', gap: 6 }}>
                  <input ref={inputRef} value={body} onChange={onInput} onClick={e => setMention(detectMention(body, e.target.selectionStart))}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
                    placeholder={replyTo ? `Reply to @${replyTo.tagUsername ?? replyingToComment?.user?.username}…` : 'Add a comment… use @ to tag'}
                    maxLength={500}
                    style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 14, padding: '10px 0', WebkitUserSelect: 'text', userSelect: 'text' }} />
                  {body.length > 400 && <span style={{ fontSize: 10, color: body.length >= 500 ? '#EF4444' : 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{500 - body.length}</span>}
                  <button type="button" onClick={() => fileRef.current?.click()} aria-label="Add a picture" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer', color: image ? ORANGE : 'rgba(255,255,255,0.55)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 0, flexShrink: 0 }}>
                    <RiImageAddLine size={20} style={{ display: 'block' }} />
                  </button>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={pickFile} style={{ display: 'none' }} />
                </div>
                <button type="submit" disabled={!canSend} aria-label="Send" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: canSend ? 'pointer' : 'default', background: canSend ? ORANGE : 'rgba(255,255,255,0.07)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 0, transition: 'background .2s' }}>
                  <RiSendPlaneFill size={17} color={canSend ? '#fff' : 'rgba(255,255,255,0.3)'} style={{ display: 'block' }} />
                </button>
              </form>
            </>
          ) : (
            <button onClick={() => router.visit('/login')} style={{ width: '100%', padding: 12, background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', borderRadius: 14, color: ORANGE, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Log in to comment</button>
          )}
        </div>

        {menu && (
          <MiniSheet onClose={() => setMenu(null)} title={`${menuComment.user?.name ?? ''}: ${(menuComment.body || 'Picture').slice(0, 60)}`}>
            {isOwner && !menu.isReply && <MenuItem icon={RiPushpinFill} label={menuComment.is_pinned ? 'Unpin comment' : 'Pin comment'} onClick={() => { const c = menuComment; setMenu(null); handlePin(c) }} />}
            {menuComment.body && <MenuItem icon={RiFileCopyLine} label="Copy text" onClick={() => { navigator.clipboard?.writeText(menuComment.body).then(() => showToast('Copied')).catch(() => {}); setMenu(null) }} />}
            {me && menuComment.user?.id !== me.id && <MenuItem icon={RiFlagLine} label="Report comment" onClick={() => { setReporting(menuComment); setMenu(null) }} />}
            {canDeleteMenu && <MenuItem icon={RiDeleteBinLine} danger label="Delete comment" onClick={() => { const { comment, isReply } = menu; setMenu(null); handleDelete(comment, isReply) }} />}
          </MiniSheet>
        )}
        {reporting && <ReportSheet onClose={() => setReporting(null)} onSubmit={submitReport} />}
      </div>

      {viewer && <ImageViewer src={viewer} onClose={() => setViewer(null)} />}

      {toast && (
        <div style={{ position: 'absolute', bottom: 150, left: '50%', transform: 'translateX(-50%)', zIndex: 70, pointerEvents: 'none' }}>
          <Toast toast={toast} onDismiss={() => setToast(null)} />
        </div>
      )}

      <style>{`@keyframes cs-slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </>
  )
}
