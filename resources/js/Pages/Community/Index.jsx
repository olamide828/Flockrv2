import { useState, useEffect, useRef, useCallback } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'
import { useToast } from '@/Components/Toast'
import {
  RiAddLine, RiCloseLine, RiSendPlaneFill, RiHeartLine, RiHeartFill,
  RiChat1Line, RiMoreLine, RiGlobalLine, RiLockLine, RiGroupLine,
  RiArrowLeftLine, RiDeleteBinLine, RiVerifiedBadgeLine,
  RiSearchLine, RiShieldLine, RiReplyLine, RiImage2Line,
  RiFireLine, RiCheckLine, RiRepeatLine, RiEyeLine,
  RiArrowRightSLine, RiSettings3Line, RiShareLine, RiLogoutBoxLine,
  RiAlertLine, RiProhibitedLine,
} from 'react-icons/ri'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60)     return `${Math.floor(s)}s`
  if (s < 3600)   return `${Math.floor(s / 60)}m`
  if (s < 86400)  return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(d).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}

function fmtTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}

function fmtCount(n) {
  const num = Number(n ?? 0)
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (num >= 1_000)     return (num / 1_000).toFixed(1).replace('.0', '') + 'K'
  return String(num)
}

function Av({ user, size = 36, className = '' }) {
  const [err, setErr] = useState(false)
  const src = (!err && user?.avatar_url) ? user.avatar_url
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'U')}&background=1a1a1a&color=fff`
  return <img src={src} alt="" onError={() => setErr(true)}
    style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Post Composer — full-screen modal, device upload
// ─────────────────────────────────────────────────────────────────────────────
function PostComposer({ auth, onClose, onPosted }) {
  const [content,  setContent]  = useState('')
  const [media,    setMedia]    = useState(null)   // { url, type, preview }
  const [posting,  setPosting]  = useState(false)
  const textRef    = useRef(null)
  const fileRef    = useRef(null)

  useEffect(() => { setTimeout(() => textRef.current?.focus(), 100) }, [])
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isVideo = file.type.startsWith('video/')
    const preview = URL.createObjectURL(file)
    setMedia({ preview, type: isVideo ? 'video' : 'image', file })
  }

  const submit = async () => {
    if ((!content.trim() && !media) || posting) return;

    setPosting(true);

    try {
        let mediaUrl = null;
        let mediaType = null;

        if (media?.file) {
            const form = new FormData();
            form.append('file', media.file);
            form.append('type', media.type);

            try {
                const { data } = await axios.post('/api/upload/media', form, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                if (!data?.url) {
                    throw new Error('Upload succeeded but no media URL was returned.');
                }

                mediaUrl = data.url;
                mediaType = media.type;
            } catch (err) {
                console.error('Media upload failed:', err);
                alert(err.response?.data?.message ?? 'Failed to upload media. Please try again.');
                return;
            }
        }

        const { data } = await axios.post('/api/community/posts', {
            content: content.trim() || null,
            media_url: mediaUrl,
            media_type: mediaType,
        });

        onPosted(data);

        if (media?.preview?.startsWith('blob:')) {
            URL.revokeObjectURL(media.preview);
        }

        onClose();
    } catch (err) {
        console.error(err);
        alert(err.response?.data?.message ?? 'Something went wrong while creating your post.');
    } finally {
        setPosting(false);
    }
};

  const canPost = !posting && (content.trim().length > 0 || !!media)

  return (
    <div style={{ position:'fixed', inset:0, zIndex:900, background:'#0a0a0a', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
          <RiCloseLine size={18} />
        </button>
        <span style={{ color:'#fff', fontWeight:700, fontSize:16 }}>New Post</span>
        <button onClick={submit} disabled={!canPost} style={{ padding:'8px 22px', borderRadius:999, background: canPost ? '#FF6B35' : 'rgba(255,255,255,0.08)', border:'none', cursor: canPost ? 'pointer' : 'default', color: canPost ? '#fff' : 'rgba(255,255,255,0.3)', fontSize:14, fontWeight:700, transition:'all 0.2s' }}>
          {posting ? 'Posting...' : 'Post'}
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        <div style={{ display:'flex', gap:12 }}>
          <Av user={auth?.user} size={42} />
          <div style={{ flex:1 }}>
            <p style={{ margin:'0 0 10px', color:'rgba(255,255,255,0.6)', fontSize:13 }}>{auth?.user?.name}</p>
            <textarea
              ref={textRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What's the latest? Share a product drop, update or story with your community..."
              maxLength={2000}
              rows={5}
              style={{ width:'100%', background:'none', border:'none', outline:'none', color:'rgba(255,255,255,0.92)', fontSize:17, lineHeight:1.6, resize:'none', boxSizing:'border-box', fontFamily:'"DM Sans", sans-serif', letterSpacing:'-0.1px' }}
            />
            {content.length > 1800 && (
              <p style={{ color: content.length >= 2000 ? '#EF4444' : 'rgba(255,255,255,0.3)', fontSize:11, margin:'4px 0 0', textAlign:'right' }}>{2000 - content.length}</p>
            )}
          </div>
        </div>

        {media && (
          <div style={{ marginTop:16, position:'relative', borderRadius:18, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)' }}>
            {media.type === 'video'
              ? <video src={media.preview} controls style={{ width:'100%', maxHeight:320, display:'block', background:'#000' }} />
              : <img src={media.preview} alt="" style={{ width:'100%', maxHeight:400, objectFit:'cover', display:'block' }} />
            }
            <button onClick={() => setMedia(null)} style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
              <RiCloseLine size={16} />
            </button>
          </div>
        )}
      </div>

      <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', padding:'12px 16px', display:'flex', alignItems:'center', gap:20, flexShrink:0 }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }} />
        <button onClick={() => fileRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:7, background:'none', border:'none', cursor:'pointer', color:'#FF6B35', fontSize:14, fontWeight:600, padding:0 }}>
          <RiImage2Line size={22} /> Photo/Video
        </button>
        <div style={{ marginLeft:'auto', position:'relative', width:28, height:28 }}>
          <svg width={28} height={28} style={{ transform:'rotate(-90deg)' }}>
            <circle cx={14} cy={14} r={11} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2.5} />
            <circle cx={14} cy={14} r={11} fill="none"
              stroke={content.length > 1800 ? '#EF4444' : '#FF6B35'}
              strokeWidth={2.5}
              strokeDasharray={`${(content.length / 2000) * 69.1} 69.1`}
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Post Report Modal (lightweight — reuses Toast for confirmation)
// ─────────────────────────────────────────────────────────────────────────────
function PostReportModal({ post, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const REASONS = [
    'Spam or misleading',
    'Harassment or bullying',
    'Hate speech or discrimination',
    'Scam or fraud',
    'Inappropriate content',
    'Other',
  ]

  const submit = async () => {
    if (!reason) return
    setSubmitting(true)
    try { await onSubmit(reason); onClose() }
    catch { setSubmitting(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:920, background:'rgba(0,0,0,0.7)' }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(400px,92vw)', zIndex:921, background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:20 }}>
        <p style={{ color:'#fff', fontWeight:700, fontSize:16, margin:'0 0 4px' }}>Report Post</p>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12, margin:'0 0 16px' }}>Your report is anonymous.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {REASONS.map(r => (
            <button key={r} onClick={() => setReason(r)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:12, cursor:'pointer', background: reason === r ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.04)', border:`1px solid ${reason === r ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.08)'}`, color: reason === r ? '#FF6B35' : '#fff', fontSize:13, textAlign:'left' }}>
              {r}
              {reason === r && <RiCheckLine size={14} />}
            </button>
          ))}
        </div>
        <button onClick={submit} disabled={!reason || submitting}
          style={{ width:'100%', marginTop:16, padding:13, background: reason ? '#FF6B35' : 'rgba(255,255,255,0.06)', border:'none', borderRadius:999, color: reason ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight:700, fontSize:14, cursor: reason ? 'pointer' : 'default' }}>
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Post Card — X/Instagram hybrid, click goes to post page
// ─────────────────────────────────────────────────────────────────────────────
function PostCard({ post, auth, onDelete, onLike, onDismiss, onBlockAuthor, onReport, standalone = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const canDelete  = auth?.user?.id === post.user_id || auth?.user?.role === 'admin'
  const notMine    = auth?.user?.id !== post.user_id
  const isSeller   = post.user?.role === 'seller'

  const handleLikeClick = (e) => { e.stopPropagation(); e.preventDefault(); onLike(post) }
  const handleMenuClick = (e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(o => !o) }
  const handleDelClick  = (e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(false); onDelete(post) }

  const inner = (
    <div style={{ display:'flex', gap:12, padding: standalone ? '16px' : '14px 16px', borderBottom: standalone ? 'none' : '1px solid rgba(255,255,255,0.06)', cursor: standalone ? 'default' : 'pointer' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
        <Link href={`/@${post.user?.username}`} onClick={e => e.stopPropagation()} style={{ display:'block' }}>
          <Av user={post.user} size={40} />
        </Link>
        {standalone && <div style={{ width:2, flex:1, background:'rgba(255,255,255,0.07)', marginTop:8, borderRadius:1 }} />}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:3 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <Link href={`/@${post.user?.username}`} onClick={e => e.stopPropagation()} style={{ textDecoration:'none' }}>
                <span style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{post.user?.name}</span>
              </Link>
              {post.user?.is_verified && <RiVerifiedBadgeLine size={13} color="#FF6B35" />}
              {isSeller && (
                <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:999, background:'rgba(255,107,53,0.15)', color:'#FF6B35', border:'1px solid rgba(255,107,53,0.25)' }}>Seller</span>
              )}
            </div>
            <span style={{ color:'rgba(255,255,255,0.35)', fontSize:12 }}>@{post.user?.username} · {timeAgo(post.created_at)}</span>
          </div>

          {(canDelete || notMine) && (
            <div style={{ position:'relative' }}>
              <button onClick={handleMenuClick} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', padding:4, borderRadius:'50%', display:'flex' }}>
                <RiMoreLine size={18} />
              </button>
              {menuOpen && (
                <>
                  <div onClick={e => { e.stopPropagation(); setMenuOpen(false) }} style={{ position:'fixed', inset:0, zIndex:98 }} />
                  <div style={{ position:'absolute', top:28, right:0, zIndex:99, background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, overflow:'hidden', minWidth:170, boxShadow:'0 8px 32px rgba(0,0,0,0.7)' }}>
                    {canDelete && (
                      <button onClick={handleDelClick} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'#EF4444', fontSize:13, fontWeight:600 }}>
                        <RiDeleteBinLine size={16} /> Delete post
                      </button>
                    )}
                    {!canDelete && notMine && (
                      <>
                        <button onClick={e => { e.stopPropagation(); e.preventDefault(); setMenuOpen(false); onDismiss(post) }}
                          style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:600, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                          <RiEyeLine size={16} color="rgba(255,255,255,0.5)" /> Not interested
                        </button>
                        <button onClick={e => { e.stopPropagation(); e.preventDefault(); setMenuOpen(false); onBlockAuthor(post) }}
                          style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'#EF4444', fontSize:13, fontWeight:600, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                          <RiProhibitedLine size={16} /> Block @{post.user?.username}
                        </button>
                        <button onClick={e => { e.stopPropagation(); e.preventDefault(); setMenuOpen(false); onReport(post) }}
                          style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:600 }}>
                          <RiAlertLine size={16} color="rgba(255,255,255,0.5)" /> Report post
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {post.content && (
          <p style={{ color:'rgba(255,255,255,0.92)', fontSize:15, lineHeight:1.55, margin:'6px 0 10px', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{post.content}</p>
        )}

        {post.media_url && (
          <div style={{ borderRadius:18, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)', marginBottom:10, background:'#000' }}
            onClick={e => e.stopPropagation()}>
            {post.media_type === 'video'
              ? <video src={post.media_url} controls style={{ width:'100%', maxHeight:400, objectFit:'contain', display:'block' }} />
              : <img src={post.media_url} alt="" style={{ width:'100%', maxHeight:520, objectFit:'cover', display:'block' }} />
            }
          </div>
        )}

        <div style={{ display:'flex', alignItems:'center', gap:0, marginTop:4, marginLeft:-8 }}>
          <button onClick={handleLikeClick} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', padding:'8px', borderRadius:999, color: post.is_liked_by_me ? '#EF4444' : 'rgba(255,255,255,0.45)', fontSize:13, fontWeight:500, transition:'color 0.15s' }}>
            {post.is_liked_by_me ? <RiHeartFill size={20} /> : <RiHeartLine size={20} />}
            {post.likes_count > 0 && <span style={{ fontSize:13 }}>{fmtCount(post.likes_count)}</span>}
          </button>

          <Link href={`/community/posts/${post.id}`} onClick={e => e.stopPropagation()}
            style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', padding:'8px', borderRadius:999, color:'rgba(255,255,255,0.45)', fontSize:13, fontWeight:500, textDecoration:'none' }}>
            <RiChat1Line size={20} />
            {post.comments_count > 0 && <span>{fmtCount(post.comments_count)}</span>}
          </Link>

          <button onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(`${window.location.origin}/community/posts/${post.id}`) }}
            style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', padding:'8px', borderRadius:999, color:'rgba(255,255,255,0.45)', fontSize:13, fontWeight:500 }}>
            <RiRepeatLine size={20} />
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px', color:'rgba(255,255,255,0.35)', fontSize:13, marginLeft:'auto', marginRight:0 }}>
            <RiEyeLine size={18} />
            {post.views_count > 0 && <span>{fmtCount(post.views_count)}</span>}
          </div>
        </div>
      </div>
    </div>
  )

  if (standalone) return <div>{inner}</div>

  return (
    <div onClick={() => router.visit(`/community/posts/${post.id}`)} style={{ background:'transparent' }}>
      {inner}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Room Chat — WhatsApp / Discord style, swipe-to-reply, image upload, typing
// ─────────────────────────────────────────────────────────────────────────────
function RoomChat({ room, auth, onBack, onOpenMembers, onOpenRules, onOpenSettings, onLeaveRoom }) {
  const [messages,  setMessages]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [hasMore,   setHasMore]   = useState(false)
  const [body,      setBody]      = useState('')
  const [sending,   setSending]   = useState(false)
  const [replyTo,   setReplyTo]   = useState(null)
  const [msgAction, setMsgAction] = useState(null)
  const [pendingMedia, setPendingMedia] = useState(null) // { preview, type, file }
  const [typing,    setTyping]    = useState(false)
  const [headerMenu, setHeaderMenu] = useState(false)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const roomFileRef = useRef(null)
  const channelRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const lastTypingSentRef = useRef(0)
  const swipeRef   = useRef({})
  const isOwner    = auth?.user?.id === room.seller_id

  useEffect(() => {
    setLoading(true)
    axios.get(`/api/community/rooms/${room.id}/messages`)
      .then(r => { setMessages(r.data.messages ?? []); setHasMore(r.data.has_more ?? false) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [room.id])

  useEffect(() => {
    if (!loading) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 60)
  }, [messages.length, loading])

  useEffect(() => {
    if (!window.Echo) return
    channelRef.current?.unsubscribe()
    const channel = window.Echo.private(`room.${room.id}`)
    channel.listen('RoomMessageSent', (e) => setMessages(p => [...p, e.message]))
    channel.listenForWhisper('typing', (e) => {
      if (e.user_id === auth?.user?.id) return
      setTyping(true)
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000)
    })
    channelRef.current = channel
    return () => { clearTimeout(typingTimeoutRef.current); channelRef.current?.unsubscribe() }
  }, [room.id])

  useEffect(() => { if (replyTo) inputRef.current?.focus() }, [replyTo])

  const broadcastTyping = () => {
    if (!window.Echo) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < 2000) return
    lastTypingSentRef.current = now
    try { window.Echo.private(`room.${room.id}`).whisper('typing', { user_id: auth?.user?.id }) } catch {}
  }

  const loadMore = async () => {
    const firstId = messages[0]?.id
    if (!firstId) return
    const r = await axios.get(`/api/community/rooms/${room.id}/messages`, { params: { before_id: firstId } })
    setMessages(p => [...(r.data.messages ?? []), ...p])
    setHasMore(r.data.has_more ?? false)
  }

  const pickRoomMedia = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isVideo = file.type.startsWith('video/')
    setPendingMedia({ preview: URL.createObjectURL(file), type: isVideo ? 'video' : 'image', file })
  }

  const send = async (e) => {
    e.preventDefault()
    if ((!body.trim() && !pendingMedia) || sending) return
    if (!auth?.user) { router.visit('/login'); return }
    setSending(true)

    let media_url = null, media_type = null
    if (pendingMedia) {
      try {
        const form = new FormData()
        form.append('file', pendingMedia.file)
        form.append('type', pendingMedia.type)
        const { data } = await axios.post('/api/upload/media', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        media_url = data.url; media_type = pendingMedia.type
      } catch {
        setSending(false)
        return
      }
    }

    const opt = {
      id: `opt-${Date.now()}`, user_id: auth.user.id, body: body.trim() || null,
      media_url: media_url ?? pendingMedia?.preview, media_type,
      created_at: new Date().toISOString(), user: auth.user,
      reply_to: replyTo, reply_to_id: replyTo?.id ?? null, _opt: true,
    }
    setMessages(p => [...p, opt])
    const b = body.trim()
    setBody(''); setReplyTo(null); setPendingMedia(null)
    try {
      const { data } = await axios.post(`/api/community/rooms/${room.id}/messages`, {
        body: b || null, media_url, media_type, reply_to_id: opt.reply_to_id,
      })
      setMessages(p => p.map(m => m.id === opt.id ? data : m))
    } catch { setMessages(p => p.filter(m => m.id !== opt.id)); setBody(b) }
    finally { setSending(false) }
  }

  const deleteMsg = async (msg) => {
    setMsgAction(null)
    setMessages(p => p.filter(m => m.id !== msg.id))
    try { await axios.delete(`/api/community/rooms/${room.id}/messages/${msg.id}`) }
    catch { setMessages(p => [...p, msg].sort((a, b) => a.id - b.id)) }
  }

  const onTouchStart = (e, msg) => { swipeRef.current = { startX: e.touches[0].clientX, msgId: msg.id, el: e.currentTarget } }
  const onTouchMove  = (e, msg) => {
    const dx = e.touches[0].clientX - (swipeRef.current.startX ?? 0)
    if (dx > 0 && swipeRef.current.msgId === msg.id) {
      const el = swipeRef.current.el
      if (el) el.style.transform = `translateX(${Math.min(dx * 0.5, 60)}px)`
    }
  }
  const onTouchEnd = (e, msg) => {
    const dx = e.changedTouches[0].clientX - (swipeRef.current.startX ?? 0)
    const el = swipeRef.current.el
    if (el) el.style.transform = 'translateX(0)'
    if (dx > 50) { setReplyTo(msg); inputRef.current?.focus() }
    swipeRef.current = {}
  }

  const pressTimer = useRef(null)
  const onPressStart = (e, msg) => {
    pressTimer.current = setTimeout(() => {
      const rect = e.currentTarget.getBoundingClientRect()
      setMsgAction({ msg, y: rect.top })
    }, 500)
  }
  const onPressEnd = () => clearTimeout(pressTimer.current)

  const grouped = messages.reduce((acc, msg) => {
    const date = msg.created_at ? new Date(msg.created_at).toDateString() : 'Unknown'
    if (!acc.length || acc[acc.length-1].date !== date) acc.push({ date, msgs:[] })
    acc[acc.length-1].msgs.push(msg)
    return acc
  }, [])

  const isMine = msg => msg.user_id === auth?.user?.id
  const canDel  = msg => isMine(msg) || isOwner || auth?.user?.role === 'admin'

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#050505' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(8,8,8,0.97)', backdropFilter:'blur(16px)', flexShrink:0, zIndex:10 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.6)', display:'flex', padding:4 }}>
          <RiArrowLeftLine size={22} />
        </button>
        <div style={{ width:38, height:38, borderRadius:'50%', overflow:'hidden', flexShrink:0 }}>
          <img src={room.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:0, color:'#fff', fontWeight:700, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{room.name}</p>
          <p style={{ margin:0, color:'rgba(255,255,255,0.35)', fontSize:11 }}>{room.members_count} members</p>
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {room.rules?.length > 0 && (
            <button onClick={onOpenRules} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)' }}>
              <RiShieldLine size={17} />
            </button>
          )}
          <button onClick={onOpenMembers} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)' }}>
            <RiGroupLine size={17} />
          </button>
          {isOwner ? (
            <button onClick={onOpenSettings} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)' }}>
              <RiSettings3Line size={17} />
            </button>
          ) : (
            <div style={{ position:'relative' }}>
              <button onClick={() => setHeaderMenu(o => !o)} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)' }}>
                <RiMoreLine size={17} />
              </button>
              {headerMenu && (
                <>
                  <div onClick={() => setHeaderMenu(false)} style={{ position:'fixed', inset:0, zIndex:98 }} />
                  <div style={{ position:'absolute', top:42, right:0, zIndex:99, background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, overflow:'hidden', minWidth:160, boxShadow:'0 8px 32px rgba(0,0,0,0.7)' }}>
                    <button onClick={() => { setHeaderMenu(false); onLeaveRoom(room) }}
                      style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'#EF4444', fontSize:13, fontWeight:600 }}>
                      <RiLogoutBoxLine size={16} /> Leave room
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none', padding:'8px 0' }}>
        {hasMore && (
          <div style={{ display:'flex', justifyContent:'center', padding:'12px 0' }}>
            <button onClick={loadMore} style={{ padding:'6px 18px', borderRadius:999, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.5)', fontSize:12, cursor:'pointer' }}>Load earlier</button>
          </div>
        )}

        {loading && (
          <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}>
            <div style={{ width:24, height:24, border:'2px solid rgba(255,255,255,0.1)', borderTopColor:'#FF6B35', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 24px', gap:12, textAlign:'center' }}>
            <div style={{ width:60, height:60, borderRadius:18, background:'rgba(255,107,53,0.1)', border:'1px solid rgba(255,107,53,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <RiChat1Line size={28} color="#FF6B35" />
            </div>
            <p style={{ color:'#fff', fontWeight:700, fontSize:16, margin:0 }}>No messages yet</p>
            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:13, margin:0 }}>Be the first to say something!</p>
          </div>
        )}

        {grouped.map(group => (
          <div key={group.date}>
            <div style={{ display:'flex', alignItems:'center', gap:10, margin:'12px 16px' }}>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
              <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11, padding:'3px 12px', background:'rgba(255,255,255,0.04)', borderRadius:999, border:'1px solid rgba(255,255,255,0.06)', whiteSpace:'nowrap' }}>
                {new Date(group.date).toLocaleDateString('en-NG', { weekday:'short', month:'short', day:'numeric' })}
              </span>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
            </div>

            {group.msgs.map((msg, i) => {
              const mine     = isMine(msg)
              const prevMsg  = group.msgs[i - 1]
              const showAv   = !mine && (!prevMsg || prevMsg.user_id !== msg.user_id)
              const showName = showAv

              return (
                <div key={msg.id}
                  onTouchStart={e => { onTouchStart(e, msg); onPressStart(e, msg) }}
                  onTouchMove={e  => onTouchMove(e, msg)}
                  onTouchEnd={e   => { onTouchEnd(e, msg); onPressEnd() }}
                  onMouseDown={e  => onPressStart(e, msg)}
                  onMouseUp={onPressEnd}
                  style={{ display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start', padding:`${showAv ? 8 : 2}px 12px 2px`, alignItems:'flex-end', gap:8, opacity: msg._opt ? 0.6 : 1, transition:'transform 0.15s ease', cursor:'default', userSelect:'none' }}>
                  {!mine && (
                    <div style={{ width:32, flexShrink:0, alignSelf:'flex-end' }}>
                      {showAv && <Link href={`/@${msg.user?.username}`}><Av user={msg.user} size={32} /></Link>}
                    </div>
                  )}

                  <div style={{ maxWidth:'72%', display:'flex', flexDirection:'column', alignItems: mine ? 'flex-end' : 'flex-start', gap:2 }}>
                    {showName && <span style={{ color:'#FF6B35', fontSize:11, fontWeight:700, paddingLeft:2 }}>{msg.user?.name}</span>}

                    {msg.reply_to && (
                      <div style={{ padding:'5px 10px', borderRadius:10, background:'rgba(255,255,255,0.05)', borderLeft:'2px solid #FF6B35', maxWidth:'100%', marginBottom:2 }}>
                        <p style={{ margin:0, color:'#FF6B35', fontSize:10, fontWeight:700 }}>{msg.reply_to?.user?.name}</p>
                        <p style={{ margin:0, color:'rgba(255,255,255,0.5)', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>{msg.reply_to?.body}</p>
                      </div>
                    )}

                    <div style={{
                      padding: msg.media_url && !msg.body ? 0 : '9px 14px',
                      background: mine ? '#FF6B35' : 'rgba(255,255,255,0.09)',
                      borderRadius: mine
                        ? `18px ${showName ? 18 : 5}px 5px 18px`
                        : `${showName ? 18 : 5}px 18px 18px 5px`,
                      color:'#fff', fontSize:14, lineHeight:1.45, wordBreak:'break-word',
                      overflow:'hidden',
                      boxShadow: mine ? '0 2px 12px rgba(255,107,53,0.3)' : 'none',
                    }}>
                      {msg.media_url && (
                        <div style={{ overflow:'hidden', borderRadius: msg.body ? '14px 14px 0 0' : 14 }}>
                          {msg.media_type === 'video'
                            ? <video src={msg.media_url} controls style={{ width:'100%', maxHeight:220, display:'block' }} />
                            : <img src={msg.media_url} alt="" style={{ width:'100%', maxHeight:250, objectFit:'cover', display:'block' }} />
                          }
                        </div>
                      )}
                      {msg.body && <p style={{ margin: msg.media_url ? '8px 14px 10px' : 0, whiteSpace:'pre-wrap' }}>{msg.body}</p>}
                    </div>

                    <span style={{ color:'rgba(255,255,255,0.22)', fontSize:10, padding: mine ? '0 4px 0 0' : '0 0 0 4px' }}>{fmtTime(msg.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* Typing bubble */}
        {typing && (
          <div style={{ display:'flex', alignItems:'flex-end', gap:8, padding:'2px 12px', marginTop:4 }}>
            <div style={{ width:32, flexShrink:0 }} />
            <div style={{ padding:'10px 14px', background:'rgba(255,255,255,0.09)', borderRadius:'5px 18px 18px 18px', display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,0.5)', animation:'typingDot 1.2s ease-in-out infinite' }} />
              <span style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,0.5)', animation:'typingDot 1.2s ease-in-out infinite', animationDelay:'0.2s' }} />
              <span style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,0.5)', animation:'typingDot 1.2s ease-in-out infinite', animationDelay:'0.4s' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} style={{ height:8 }} />
      </div>

      {/* Message action sheet (long press) */}
      {msgAction && (
        <>
          <div onClick={() => setMsgAction(null)} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.5)' }} />
          <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:201, background:'rgba(18,18,18,0.98)', backdropFilter:'blur(24px)', borderRadius:'20px 20px 0 0', borderTop:'1px solid rgba(255,255,255,0.08)', paddingBottom:'env(safe-area-inset-bottom, 16px)', animation:'slideUp 0.22s ease' }}>
            <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 6px' }}>
              <div style={{ width:36, height:4, borderRadius:999, background:'rgba(255,255,255,0.2)' }} />
            </div>
            <div style={{ padding:'6px 20px 12px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ margin:0, color:'rgba(255,255,255,0.4)', fontSize:11 }}>{msgAction.msg.user?.name}</p>
              <p style={{ margin:'4px 0 0', color:'rgba(255,255,255,0.7)', fontSize:13, lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{msgAction.msg.body}</p>
            </div>
            <button onClick={() => { setReplyTo(msgAction.msg); setMsgAction(null); inputRef.current?.focus() }}
              style={{ display:'flex', alignItems:'center', gap:14, width:'100%', padding:'15px 20px', background:'none', border:'none', cursor:'pointer', color:'#fff', fontSize:15, fontWeight:600, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <RiReplyLine size={22} color="#FF6B35" /> Reply
            </button>
            {canDel(msgAction.msg) && (
              <button onClick={() => deleteMsg(msgAction.msg)}
                style={{ display:'flex', alignItems:'center', gap:14, width:'100%', padding:'15px 20px', background:'none', border:'none', cursor:'pointer', color:'#EF4444', fontSize:15, fontWeight:700, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <RiDeleteBinLine size={22} /> Delete message
              </button>
            )}
            <button onClick={() => setMsgAction(null)}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'calc(100% - 32px)', margin:'6px 16px 8px', padding:'13px', background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.6)', fontSize:14, fontWeight:600, borderRadius:14 }}>
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Reply banner */}
      {replyTo && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background:'rgba(255,107,53,0.07)', borderTop:'1px solid rgba(255,107,53,0.18)', flexShrink:0 }}>
          <RiReplyLine size={15} color="#FF6B35" />
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, color:'#FF6B35', fontSize:11, fontWeight:700 }}>{replyTo.user?.name}</p>
            <p style={{ margin:0, color:'rgba(255,255,255,0.5)', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{replyTo.body}</p>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', display:'flex' }}>
            <RiCloseLine size={16} />
          </button>
        </div>
      )}

      {/* Pending media preview */}
      {pendingMedia && (
        <div style={{ padding:'10px 14px 0', flexShrink:0 }}>
          <div style={{ position:'relative', display:'inline-block', borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)' }}>
            {pendingMedia.type === 'video'
              ? <video src={pendingMedia.preview} style={{ height:90, display:'block' }} />
              : <img src={pendingMedia.preview} alt="" style={{ height:90, display:'block' }} />
            }
            <button onClick={() => setPendingMedia(null)} style={{ position:'absolute', top:5, right:5, background:'rgba(0,0,0,0.75)', border:'none', borderRadius:'50%', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
              <RiCloseLine size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'10px 12px', borderTop:'1px solid rgba(255,255,255,0.07)', background:'rgba(8,8,8,0.95)', flexShrink:0, paddingBottom:'max(12px, env(safe-area-inset-bottom))' }}>
        {auth?.user ? (
          <form onSubmit={send} style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input ref={roomFileRef} type="file" accept="image/*,video/*" onChange={pickRoomMedia} style={{ display:'none' }} />
            <button type="button" onClick={() => roomFileRef.current?.click()} style={{ width:38, height:38, borderRadius:'50%', background:'rgba(255,255,255,0.07)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'#FF6B35' }}>
              <RiImage2Line size={18} />
            </button>
            <div style={{ flex:1, display:'flex', alignItems:'center', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:999, padding:'0 14px', gap:8 }}>
              <input ref={inputRef} value={body} onChange={e => { setBody(e.target.value); broadcastTyping() }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
                placeholder="Message..." maxLength={2000}
                style={{ flex:1, background:'none', border:'none', outline:'none', color:'#fff', fontSize:14, padding:'11px 0' }} />
            </div>
            <button type="submit" disabled={(!body.trim() && !pendingMedia) || sending}
              style={{ width:44, height:44, borderRadius:'50%', background: (body.trim() || pendingMedia) ? '#FF6B35' : 'rgba(255,255,255,0.07)', border:'none', cursor: (body.trim() || pendingMedia) ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.2s' }}>
              <RiSendPlaneFill size={18} color={(body.trim() || pendingMedia) ? '#fff' : 'rgba(255,255,255,0.25)'} />
            </button>
          </form>
        ) : (
          <button onClick={() => router.visit('/login')} style={{ width:'100%', padding:'12px', background:'rgba(255,107,53,0.1)', border:'1px solid rgba(255,107,53,0.25)', borderRadius:14, color:'#FF6B35', fontWeight:700, fontSize:14, cursor:'pointer' }}>
            Log in to send messages
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Room Settings Modal — owner only: name, description, avatar, privacy
// ─────────────────────────────────────────────────────────────────────────────
function RoomSettingsModal({ room, onClose, onSaved, showToast }) {
  const [name, setName] = useState(room.name)
  const [desc, setDesc] = useState(room.description ?? '')
  const [isPrivate, setIsPrivate] = useState(room.is_private)
  const [avatarPreview, setAvatarPreview] = useState(room.avatar_url)
  const [avatarFile, setAvatarFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const pickAvatar = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const shareRoom = async () => {
    const url = `${window.location.origin}/community/rooms/join/${room.invite_code}`
    if (navigator.share) {
      try { await navigator.share({ title: room.name, text: `Join ${room.name} on Flockr`, url }) } catch {}
    } else {
      navigator.clipboard?.writeText(url)
      showToast?.('Room link copied!')
    }
  }

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      let avatar_url
      if (avatarFile) {
        const form = new FormData()
        form.append('file', avatarFile)
        form.append('type', 'image')
        const { data } = await axios.post('/api/upload/media', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        avatar_url = data.url
      }
      const { data } = await axios.put(`/api/community/rooms/${room.id}`, {
        name: name.trim(), description: desc.trim(), is_private: isPrivate,
        ...(avatar_url ? { avatar_url } : {}),
      })
      onSaved(data)
      showToast?.('Room updated')
      onClose()
    } catch { showToast?.('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:900, background:'rgba(0,0,0,0.7)' }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(420px,92vw)', zIndex:901, background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:22, padding:20, maxHeight:'85vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <p style={{ color:'#fff', fontWeight:700, fontSize:16, margin:0 }}>Room Settings</p>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}><RiCloseLine size={16} /></button>
        </div>

        <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
          <button onClick={() => fileRef.current?.click()} style={{ position:'relative', border:'none', background:'none', cursor:'pointer', padding:0 }}>
            <img src={avatarPreview} alt="" style={{ width:76, height:76, borderRadius:'50%', objectFit:'cover', border:'1px solid rgba(255,255,255,0.15)' }} />
            <div style={{ position:'absolute', bottom:0, right:0, width:24, height:24, borderRadius:'50%', background:'#FF6B35', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#fff' }}>✎</div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={pickAvatar} style={{ display:'none' }} />
        </div>

        <label style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, textTransform:'uppercase' }}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={80}
          style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'10px 12px', color:'#fff', margin:'6px 0 14px', boxSizing:'border-box' }} />

        <label style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, textTransform:'uppercase' }}>Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={500}
          style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'10px 12px', color:'#fff', margin:'6px 0 14px', boxSizing:'border-box', resize:'none', fontFamily:'"DM Sans", sans-serif' }} />

        <button onClick={() => setIsPrivate(p => !p)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', padding:'10px 0', background:'none', border:'none', cursor:'pointer', marginBottom:10 }}>
          <span style={{ color:'#fff', fontSize:14 }}>Private room</span>
          <div style={{ width:40, height:22, borderRadius:999, background: isPrivate ? '#FF6B35' : 'rgba(255,255,255,0.15)', position:'relative' }}>
            <div style={{ position:'absolute', top:3, left: isPrivate ? 21 : 3, width:16, height:16, borderRadius:'50%', background:'#fff' }} />
          </div>
        </button>

        {room.is_private && (
          <button onClick={shareRoom} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'12px 0', background:'none', border:'none', borderTop:'1px solid rgba(255,255,255,0.06)', cursor:'pointer', color:'#FF6B35', fontSize:13, fontWeight:600, marginBottom:6 }}>
            <RiShareLine size={16} /> Share invite link
          </button>
        )}

        <div style={{ display:'flex', gap:10, marginTop:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:12, borderRadius:12, background:'rgba(255,255,255,0.06)', border:'none', color:'#fff', cursor:'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()} style={{ flex:1, padding:12, borderRadius:12, background:'#FF6B35', border:'none', color:'#fff', fontWeight:700, cursor:'pointer' }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Room Discovery Modal
// ─────────────────────────────────────────────────────────────────────────────
function RoomDiscovery({ auth, onClose, onJoin, onJoinedDirectly, joinedIds, initialInvite = '' }) {
  const [q,       setQ]       = useState('')
  const [rooms,   setRooms]   = useState([])
  const [loading, setLoading] = useState(true)
  const [invite,  setInvite]  = useState(initialInvite)
  const [joining, setJoining] = useState(null)
  const debRef   = useRef(null)
  const inputRef = useRef(null)
  const { showToast, ToastComponent } = useToast()

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  useEffect(() => {
    clearTimeout(debRef.current)
    debRef.current = setTimeout(async () => {
      setLoading(true)
      try { const { data } = await axios.get('/api/community/rooms/discover', { params: { q } }); setRooms(data) }
      catch {} finally { setLoading(false) }
    }, q ? 300 : 0)
  }, [q])

  const joinByInvite = async () => {
    if (!invite.trim()) return
    setJoining('invite')
    try {
      const { data } = await axios.post('/api/community/rooms/join-by-invite', { invite_code: invite.trim() })
      if (data.joined && data.room) {
        onJoinedDirectly(data.room)
        onClose()
      }
    } catch (e) { showToast(e.response?.data?.message ?? 'Invalid invite code', 'error') }
    finally { setJoining(null) }
  }

  const handleRoomJoin = async (room) => {
    setJoining(room.id)
    try {
      const joinedRoom = await onJoin(room)
      if (joinedRoom) onClose()
    }
    catch {}
    finally { setJoining(null) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:810, background:'#0a0a0a', display:'flex', flexDirection:'column' }}>
      {ToastComponent}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
          <RiArrowLeftLine size={18} />
        </button>
        <div style={{ flex:1, position:'relative' }}>
          <RiSearchLine size={16} color="rgba(255,255,255,0.3)" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search rooms..."
            style={{ width:'100%', height:42, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:999, paddingLeft:40, paddingRight:14, color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box' }} />
        </div>
      </div>

      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,107,53,0.04)', flexShrink:0 }}>
        <p style={{ margin:'0 0 8px', color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:600 }}>HAVE AN INVITE CODE TO JOIN A PRIVATE ROOOM?</p>
        <div style={{ display:'flex', gap:8 }}>
          <input value={invite} onChange={e => setInvite(e.target.value.toUpperCase())} placeholder="Enter 8-character code..."
            style={{ flex:1, height:40, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'0 14px', color:'#fff', fontSize:14, outline:'none', fontFamily:'monospace', letterSpacing:'0.1em' }} />
          <button onClick={joinByInvite} disabled={!invite.trim() || joining === 'invite'}
            style={{ padding:'0 18px', borderRadius:12, background: invite.trim() ? '#FF6B35' : 'rgba(255,255,255,0.07)', border:'none', cursor: invite.trim() ? 'pointer' : 'default', color: invite.trim() ? '#fff' : 'rgba(255,255,255,0.3)', fontSize:14, fontWeight:700 }}>
            {joining === 'invite' ? '...' : 'Join'}
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
        {loading && <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}><div style={{ width:24, height:24, border:'2px solid rgba(255,255,255,0.1)', borderTopColor:'#FF6B35', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} /></div>}

        {!loading && rooms.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 24px' }}>
            <RiGroupLine size={36} color="rgba(255,255,255,0.1)" style={{ margin:'0 auto 12px', display:'block' }} />
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, margin:0 }}>{q ? `No rooms matching "${q}"` : 'No public rooms yet'}</p>
          </div>
        )}

        {rooms.map(room => {
          const already = room.already_joined || joinedIds.includes(room.id)
          return (
            <div key={room.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <img src={room.avatar_url} alt="" style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'1px solid rgba(255,255,255,0.1)' }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <p style={{ color:'#fff', fontSize:15, fontWeight:700, margin:0 }}>{room.name}</p>
                  {room.is_private && <RiLockLine size={12} color="rgba(255,255,255,0.4)" />}
                </div>
                {room.description && <p style={{ color:'rgba(255,255,255,0.45)', fontSize:13, margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{room.description}</p>}
                <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, margin:'3px 0 0' }}>by @{room.seller?.username} · {room.members_count} members</p>
              </div>
              {already ? (
                <span style={{ padding:'7px 16px', borderRadius:999, background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', fontSize:13, fontWeight:600, flexShrink:0 }}>Joined</span>
              ) : (
                <button onClick={() => handleRoomJoin(room)} disabled={joining === room.id}
                  style={{ padding:'7px 18px', borderRadius:999, background:'#FF6B35', border:'none', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:700, flexShrink:0, opacity: joining === room.id ? 0.6 : 1 }}>
                  {joining === room.id ? '...' : (room.is_private ? 'Request' : 'Join')}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } } @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Rules Modal — simple centered modal (owner edits, member accepts to join)
// ─────────────────────────────────────────────────────────────────────────────
function RulesModal({ room, auth, onClose, onSaved, onAccept }) {
  const isOwner  = auth?.user?.id === room.seller_id
  const [rules,   setRules]   = useState(room.rules ?? [])
  const [newRule, setNewRule] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [agreed,  setAgreed]  = useState(false)

  const save = async () => {
    setSaving(true)
    try { await axios.put(`/api/community/rooms/${room.id}/rules`, { rules }); onSaved(rules); onClose() }
    catch {} finally { setSaving(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:870, background:'rgba(0,0,0,0.7)' }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(460px, 92vw)', zIndex:880, background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, overflow:'hidden', maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <RiShieldLine size={18} color="#FF6B35" />
            <p style={{ margin:0, color:'#fff', fontWeight:700, fontSize:16 }}>Room Rules</p>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}><RiCloseLine size={16} /></button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
          {rules.length === 0 && <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>No rules set yet.</p>}
          {rules.map((rule, i) => (
            <div key={i} style={{ display:'flex', gap:12, padding:'12px 14px', background:'rgba(255,255,255,0.04)', borderRadius:14, border:'1px solid rgba(255,255,255,0.07)', marginBottom:8, alignItems:'flex-start' }}>
              <span style={{ color:'#FF6B35', fontSize:13, fontWeight:800, flexShrink:0, minWidth:20 }}>{i+1}.</span>
              <p style={{ flex:1, color:'rgba(255,255,255,0.88)', fontSize:14, margin:0, lineHeight:1.5 }}>{rule}</p>
              {isOwner && (
                <button onClick={() => setRules(r => r.filter((_,j) => j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444', display:'flex', padding:0, flexShrink:0 }}>
                  <RiCloseLine size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        {!isOwner && onAccept && (
          <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
            <button onClick={() => setAgreed(a => !a)} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', background:'none', border:'none', cursor:'pointer', marginBottom:14, padding:0 }}>
              <div style={{ width:22, height:22, borderRadius:6, border:`2px solid ${agreed ? '#FF6B35' : 'rgba(255,255,255,0.25)'}`, background: agreed ? '#FF6B35' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                {agreed && <RiCheckLine size={13} color="#fff" />}
              </div>
              <span style={{ color: agreed ? '#fff' : 'rgba(255,255,255,0.6)', fontSize:14, textAlign:'left' }}>
                I've read and agree to follow these rules
              </span>
            </button>
            <button onClick={() => { if (agreed) { onAccept(); onClose() } }} disabled={!agreed}
              style={{ width:'100%', padding:'14px', background: agreed ? '#FF6B35' : 'rgba(255,255,255,0.06)', border:'none', borderRadius:14, color: agreed ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight:700, fontSize:15, cursor: agreed ? 'pointer' : 'default', transition:'all 0.2s' }}>
              Join Room
            </button>
          </div>
        )}

        {isOwner && (
          <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
            <div style={{ display:'flex', gap:8, marginBottom:10 }}>
              <input value={newRule} onChange={e => setNewRule(e.target.value)} onKeyDown={e => e.key==='Enter' && newRule.trim() && (setRules(r => [...r, newRule.trim()]), setNewRule(''))} placeholder="Add rule..."
                style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'9px 12px', color:'#fff', fontSize:13, outline:'none' }} />
              <button onClick={() => newRule.trim() && (setRules(r => [...r, newRule.trim()]), setNewRule(''))} style={{ padding:'9px 16px', borderRadius:12, background:'rgba(255,255,255,0.08)', border:'none', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:600 }}>Add</button>
            </div>
            <button onClick={save} disabled={saving} style={{ width:'100%', padding:'12px', background:'#FF6B35', border:'none', borderRadius:12, color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}>
              {saving ? 'Saving...' : 'Save Rules'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Members Drawer — Members + Requests tabs (owner sees Requests on private rooms)
// ─────────────────────────────────────────────────────────────────────────────
function MembersDrawer({ room, auth, onClose, onKick, showToast }) {
  const [tab,       setTab]       = useState('members')
  const [members,   setMembers]   = useState([])
  const [requests,  setRequests]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [resolving, setResolving] = useState(null)
  const isOwner = auth?.user?.id === room.seller_id
  const showRequestsTab = isOwner && room.is_private

  useEffect(() => {
    axios.get(`/api/community/rooms/${room.id}/members`)
      .then(r => setMembers(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [room.id])

  useEffect(() => {
    if (!showRequestsTab) return
    axios.get(`/api/community/rooms/${room.id}/requests`)
      .then(r => setRequests(r.data)).catch(() => {})
  }, [room.id, showRequestsTab])

  const resolve = async (req, action) => {
    setResolving(req.request_id)
    try {
      await axios.post(`/api/community/rooms/${room.id}/requests/${req.request_id}`, { action })
      setRequests(prev => prev.filter(r => r.request_id !== req.request_id))
      if (action === 'approve') {
        setMembers(prev => [...prev, { id: req.id, name: req.name, username: req.username, avatar_url: req.avatar_url, role: 'member' }])
        showToast?.(`${req.name} approved`)
      } else {
        showToast?.('Request declined')
      }
    } catch {
      showToast?.('Something went wrong', 'error')
    } finally {
      setResolving(null)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:850, background:'rgba(0,0,0,0.6)' }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'min(340px, 88vw)', zIndex:860, background:'#111', borderLeft:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 0' }}>
          <p style={{ margin:0, color:'#fff', fontWeight:700, fontSize:15 }}>
            {tab === 'members' ? `Members · ${members.length}` : `Requests · ${requests.length}`}
          </p>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}><RiCloseLine size={16} /></button>
        </div>

        {showRequestsTab && (
          <div style={{ display:'flex', margin:'14px 16px 0', background:'rgba(255,255,255,0.05)', borderRadius:12, padding:3 }}>
            {[{ key:'members', label:'Members' }, { key:'requests', label:`Requests${requests.length ? ` (${requests.length})` : ''}` }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ flex:1, padding:'8px 0', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background: tab===t.key ? '#FF6B35' : 'transparent', color: tab===t.key ? '#fff' : 'rgba(255,255,255,0.5)', transition:'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:6 }}>
          {tab === 'members' && (
            <>
              {loading && <div style={{ display:'flex', justifyContent:'center', padding:24 }}><div style={{ width:22, height:22, border:'2px solid rgba(255,255,255,0.1)', borderTopColor:'#FF6B35', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} /></div>}
              {!loading && members.map(m => (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0' }}>
                  <Av user={m} size={38} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <p style={{ color:'#fff', fontSize:13, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</p>
                      {m.role === 'moderator' && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:999, background:'rgba(255,107,53,0.15)', color:'#FF6B35', flexShrink:0 }}>Host</span>}
                      {m.is_verified && <RiVerifiedBadgeLine size={11} color="#FF6B35" />}
                    </div>
                    <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, margin:0 }}>@{m.username}</p>
                  </div>
                  {isOwner && m.id !== auth?.user?.id && (
                    <button onClick={() => onKick(m)} style={{ padding:'5px 10px', borderRadius:8, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0 }}>Kick</button>
                  )}
                </div>
              ))}
            </>
          )}

          {tab === 'requests' && (
            <>
              {requests.length === 0 && (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'50px 12px', textAlign:'center' }}>
                  <RiGroupLine size={28} color="rgba(255,255,255,0.15)" />
                  <p style={{ color:'rgba(255,255,255,0.35)', fontSize:13, margin:0 }}>No pending requests</p>
                </div>
              )}
              {requests.map(req => (
                <div key={req.request_id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <Av user={req} size={38} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:'#fff', fontSize:13, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{req.name}</p>
                    <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, margin:0 }}>@{req.username}</p>
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button onClick={() => resolve(req, 'reject')} disabled={resolving === req.request_id}
                      style={{ width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <RiCloseLine size={15} />
                    </button>
                    <button onClick={() => resolve(req, 'approve')} disabled={resolving === req.request_id}
                      style={{ width:30, height:30, borderRadius:'50%', background:'#FF6B35', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <RiCheckLine size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Room
// ─────────────────────────────────────────────────────────────────────────────
function CreateRoomModal({ onClose, onCreated }) {
  const [name,      setName]      = useState('')
  const [desc,      setDesc]      = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [creating,  setCreating]  = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || creating) return
    setCreating(true)
    try {
      const { data } = await axios.post('/api/community/rooms', { name:name.trim(), description:desc.trim(), is_private:isPrivate })
      onCreated(data)
      onClose()
    } catch {} finally { setCreating(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:850, background:'rgba(0,0,0,0.7)' }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(440px, 94vw)', zIndex:860, background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:22, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin:0, color:'#fff', fontWeight:700, fontSize:16 }}>Create a Room</p>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}><RiCloseLine size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ padding:'20px', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:7 }}>Room Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. VIP Drops, Skincare Insiders..." maxLength={80}
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'12px 14px', color:'#fff', fontSize:15, outline:'none', boxSizing:'border-box' }} />
          </div>
          <div>
            <label style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:7 }}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What's this room for?" rows={3} maxLength={500}
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'12px 14px', color:'#fff', fontSize:14, outline:'none', resize:'none', boxSizing:'border-box', fontFamily:'"DM Sans", sans-serif' }} />
          </div>

          <button type="button" onClick={() => setIsPrivate(p => !p)}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:16, background: isPrivate ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.04)', border:`1px solid ${isPrivate ? 'rgba(255,107,53,0.3)' : 'rgba(255,255,255,0.08)'}`, cursor:'pointer', transition:'all 0.2s' }}>
            {isPrivate ? <RiLockLine size={20} color="#FF6B35" /> : <RiGlobalLine size={20} color="rgba(255,255,255,0.4)" />}
            <div style={{ textAlign:'left', flex:1 }}>
              <p style={{ margin:0, color: isPrivate ? '#FF6B35' : '#fff', fontSize:14, fontWeight:600 }}>{isPrivate ? 'Private Room' : 'Public Room'}</p>
              <p style={{ margin:0, color:'rgba(255,255,255,0.35)', fontSize:12 }}>{isPrivate ? 'Invite link, or requests you approve' : 'Anyone can discover and join'}</p>
            </div>
            <div style={{ width:40, height:22, borderRadius:999, background: isPrivate ? '#FF6B35' : 'rgba(255,255,255,0.15)', position:'relative', flexShrink:0, transition:'background 0.2s' }}>
              <div style={{ position:'absolute', top:3, left: isPrivate ? 21 : 3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.15s' }} />
            </div>
          </button>

          <button type="submit" disabled={!name.trim() || creating}
            style={{ padding:'14px', background: name.trim() ? '#FF6B35' : 'rgba(255,255,255,0.06)', border:'none', borderRadius:14, color: name.trim() ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight:700, fontSize:15, cursor: name.trim() ? 'pointer' : 'default', transition:'all 0.2s' }}>
            {creating ? 'Creating...' : 'Create Room'}
          </button>
        </form>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Room Avatar in tray
// ─────────────────────────────────────────────────────────────────────────────
function RoomTrayAvatar({ room, isActive, onClick }) {
  return (
    <button onClick={onClick} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0, width:68 }}>
      <div style={{ position:'relative' }}>
        {room.has_unread && !isActive && (
          <div style={{ position:'absolute', inset:-3, borderRadius:'50%', background:'conic-gradient(from 0deg, #FF6B35, #FFD700, #FF6B35)', animation:'spin 2s linear infinite', zIndex:0 }} />
        )}
        <div style={{ position:'relative', zIndex:1, width:54, height:54, borderRadius:'50%', overflow:'hidden', border: isActive ? '2.5px solid #FF6B35' : room.has_unread ? '2.5px solid #050505' : '2px solid rgba(255,255,255,0.1)' }}>
          <img src={room.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        </div>
        {isActive && <div style={{ position:'absolute', bottom:1, right:1, width:13, height:13, borderRadius:'50%', background:'#10B981', border:'2.5px solid #050505', zIndex:2 }} />}
      </div>
      <span style={{ color: isActive ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontSize:10, fontWeight: isActive ? 700 : 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%', textAlign:'center' }}>{room.name}</span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Community Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Community({ joinedRooms: initJoined = [], discoverRooms: initDiscover = [] }) {
  const { auth } = usePage().props
  const pageUrl = usePage().url
  const isSeller = ['seller', 'admin'].includes(auth?.user?.role)
  const { showToast, ToastComponent } = useToast()

  const [view,          setView]          = useState('feed')
  const [activeRoomId,  setActiveRoomId]  = useState(null)
  const [joinedRooms,   setJoinedRooms]   = useState(initJoined)
  const [discoverRooms, setDiscoverRooms] = useState(initDiscover)

  const [showComposer,  setShowComposer]   = useState(false)
  const [showCreateRoom,setShowCreateRoom] = useState(false)
  const [showDiscover,  setShowDiscover]   = useState(false)
  const [inviteFromUrl, setInviteFromUrl]  = useState('')
  const [membersRoom,   setMembersRoom]    = useState(null)
  const [rulesRoom,     setRulesRoom]      = useState(null)
  const [settingsRoom,  setSettingsRoom]   = useState(null)
  const [pendingJoin,   setPendingJoin]    = useState(null)
  const [reportPost,    setReportPost]     = useState(null)

  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const loaderRef = useRef(null)

  const activeRoom = activeRoomId ? joinedRooms.find(r => r.id === activeRoomId) : null

  // Auto-open Discover with a prefilled invite code from /community?invite=CODE
  useEffect(() => {
    const params = new URLSearchParams(pageUrl.split('?')[1] ?? '')
    const invite = params.get('invite')
    if (invite) {
      setInviteFromUrl(invite.toUpperCase())
      setShowDiscover(true)
      window.history.replaceState({}, '', '/community')
    }
  }, [])

  const loadFeed = useCallback(async (reset = false) => {
    const p = reset ? 1 : page
    if (!reset && !hasMore) return
    setLoading(true)
    try {
      const { data } = await axios.get('/api/community/feed', { params: { page: p } })
      const incoming = data.data ?? []
      setPosts(prev => reset ? incoming : [...prev, ...incoming])
      setHasMore(data.current_page < data.last_page)
      setPage(reset ? 2 : p + 1)
    } catch {} finally { setLoading(false) }
  }, [page, hasMore])

  useEffect(() => { loadFeed(true) }, [])

  useEffect(() => {
    if (!loaderRef.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && !loading && hasMore) loadFeed() }, { threshold:0.1 })
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [loadFeed, loading, hasMore])

  const handleLike = async (post) => {
    if (!auth?.user) { router.visit('/login'); return }
    const was = post.is_liked_by_me
    setPosts(p => p.map(q => q.id === post.id ? { ...q, is_liked_by_me:!was, likes_count: was ? Math.max(0, q.likes_count-1) : q.likes_count+1 } : q))
    try {
      const { data } = await axios.post(`/api/community/posts/${post.id}/like`)
      setPosts(p => p.map(q => q.id === post.id ? { ...q, is_liked_by_me:data.liked, likes_count:data.likes_count } : q))
    } catch {
      setPosts(p => p.map(q => q.id === post.id ? { ...q, is_liked_by_me:was, likes_count:post.likes_count } : q))
    }
  }

  const handleDelete = async (post) => {
    setPosts(p => p.filter(q => q.id !== post.id))
    try { await axios.delete(`/api/community/posts/${post.id}`) }
    catch { loadFeed(true) }
  }

  const handleDismiss = (post) => {
    setPosts(p => p.filter(q => q.id !== post.id))
    axios.post(`/api/community/posts/${post.id}/dismiss`).catch(() => {})
  }

  const handleBlockAuthor = async (post) => {
    try {
      await axios.post(`/api/users/${post.user_id}/block`)
      setPosts(p => p.filter(q => q.user_id !== post.user_id))
      showToast(`Blocked @${post.user?.username}`)
    } catch { showToast('Failed to block', 'error') }
  }

  const submitPostReport = async (reason) => {
    if (!reportPost) return
    try {
      await axios.post(`/api/users/${reportPost.user_id}/report`, { reason, post_id: reportPost.id })
      showToast('Report submitted')
    } catch { showToast('Failed to submit report', 'error') }
  }

  // Join flow: private rooms need approval unless joined via invite code.
  const handleJoin = async (room) => {
    if (!auth?.user) { router.visit('/login'); return }
    const hasRules = room.rules?.length > 0
    if (hasRules && !room.is_private) {
      setPendingJoin(room)
      return
    }
    return doJoin(room)
  }

  const doJoin = async (room) => {
    try {
      if (room.is_private) {
        await axios.post(`/api/community/rooms/${room.id}/request-join`)
        showToast(`Request sent to join ${room.name}`)
        return null
      }
      const { data } = await axios.post(`/api/community/rooms/${room.id}/join`)
      if (data.joined) {
        const r = data.room ?? { ...room, has_unread:false, pivot_role:'member' }
        setJoinedRooms(p => [r, ...p.filter(x => x.id !== r.id)])
        setDiscoverRooms(p => p.filter(x => x.id !== room.id))
        showToast(`Joined ${room.name}!`)
        return r
      }
    } catch { showToast('Failed to join', 'error') }
  }

  // Invite-code join bypasses request/approval entirely — already joined server-side.
  const onJoinedDirectly = (room) => {
    setJoinedRooms(p => [room, ...p.filter(x => x.id !== room.id)])
    setDiscoverRooms(p => p.filter(x => x.id !== room.id))
    showToast(`Joined ${room.name}!`)
  }

  const handleRoomCreated = (room) => {
    setJoinedRooms(p => [room, ...p])
    setView('rooms')
    setActiveRoomId(room.id)
    showToast(`"${room.name}" created!`)
    if (room.is_private && room.invite_code) {
      navigator.clipboard?.writeText(room.invite_code)
      showToast(`Invite code ${room.invite_code} copied to clipboard!`)
    }
  }

  const handleKick = async (member) => {
    if (!membersRoom) return
    try { await axios.delete(`/api/community/rooms/${membersRoom.id}/kick`, { data: { user_id: member.id } }); showToast(`${member.name} removed`) }
    catch { showToast('Failed', 'error') }
  }

  const handleLeaveRoom = async (room) => {
    if (!confirm(`Leave ${room.name}?`)) return
    try {
      await axios.post(`/api/community/rooms/${room.id}/join`) // toggles -> leaves since already a member
      setJoinedRooms(p => p.filter(r => r.id !== room.id))
      setActiveRoomId(null)
      showToast(`Left ${room.name}`)
    } catch { showToast('Failed to leave', 'error') }
  }

  const openRoom = (room) => {
    setActiveRoomId(room.id)
    setJoinedRooms(p => p.map(r => r.id === room.id ? { ...r, has_unread:false } : r))
  }

  // Full-screen room chat
  if (view === 'rooms' && activeRoom) {
    return (
      <>
        <Head title={activeRoom.name} />
        {ToastComponent}
        {membersRoom  && <MembersDrawer room={membersRoom} auth={auth} onClose={() => setMembersRoom(null)} onKick={handleKick} showToast={showToast} />}
        {rulesRoom    && <RulesModal room={rulesRoom} auth={auth} onClose={() => setRulesRoom(null)} onSaved={rules => setJoinedRooms(p => p.map(r => r.id === rulesRoom.id ? { ...r, rules } : r))} />}
        {settingsRoom && <RoomSettingsModal room={settingsRoom} onClose={() => setSettingsRoom(null)} showToast={showToast}
          onSaved={updated => setJoinedRooms(p => p.map(r => r.id === updated.id ? { ...r, ...updated } : r))} />}
        <div style={{ height:'100%', overflow:'hidden' }}>
          <RoomChat room={activeRoom} auth={auth}
            onBack={() => setActiveRoomId(null)}
            onOpenMembers={() => setMembersRoom(activeRoom)}
            onOpenRules={() => setRulesRoom(activeRoom)}
            onOpenSettings={() => setSettingsRoom(activeRoom)}
            onLeaveRoom={handleLeaveRoom}
          />
        </div>
        <style>{`@keyframes spin { to { transform:rotate(360deg); } } @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } } @keyframes typingDot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }`}</style>
      </>
    )
  }

  return (
    <>
      <Head title="Community" />
      {ToastComponent}
      {showComposer    && <PostComposer auth={auth} onClose={() => setShowComposer(false)} onPosted={p => setPosts(prev => [p, ...prev])} />}
      {showCreateRoom  && <CreateRoomModal onClose={() => setShowCreateRoom(false)} onCreated={handleRoomCreated} />}
      {showDiscover    && <RoomDiscovery auth={auth} onClose={() => { setShowDiscover(false); setInviteFromUrl('') }} onJoin={handleJoin} onJoinedDirectly={onJoinedDirectly} joinedIds={joinedRooms.map(r => r.id)} initialInvite={inviteFromUrl} />}
      {membersRoom     && <MembersDrawer room={membersRoom} auth={auth} onClose={() => setMembersRoom(null)} onKick={handleKick} showToast={showToast} />}
      {rulesRoom       && <RulesModal room={rulesRoom} auth={auth} onClose={() => setRulesRoom(null)} onSaved={rules => setJoinedRooms(p => p.map(r => r.id === rulesRoom.id ? { ...r, rules } : r))} />}
      {settingsRoom    && <RoomSettingsModal room={settingsRoom} onClose={() => setSettingsRoom(null)} showToast={showToast}
        onSaved={updated => setJoinedRooms(p => p.map(r => r.id === updated.id ? { ...r, ...updated } : r))} />}
      {pendingJoin     && <RulesModal room={pendingJoin} auth={auth} onClose={() => setPendingJoin(null)} onSaved={() => {}} onAccept={() => doJoin(pendingJoin)} />}
      {reportPost      && <PostReportModal post={reportPost} onClose={() => setReportPost(null)} onSubmit={submitPostReport} />}

      <div style={{ height:'100%', overflowY:'auto', background:'#050505', color:'#fff', fontFamily:'"DM Sans", sans-serif', position:'relative' }}>
        <div style={{ maxWidth:640, margin:'0 auto' }}>

          {/* ── HEADER ─────────────────────────────────────────────── */}
          <div style={{ position:'sticky', top:0, zIndex:40, background:'rgba(5,5,5,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 0' }}>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800, letterSpacing:'-0.4px' }}>Community</h1>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setShowDiscover(true)} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.07)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.6)' }}>
                  <RiSearchLine size={17} />
                </button>
                {isSeller && (
                  <button onClick={() => setShowCreateRoom(true)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:999, background:'#FF6B35', border:'none', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:700 }}>
                    <RiAddLine size={15} /> Room
                  </button>
                )}
              </div>
            </div>

            <div style={{ display:'flex', marginTop:12 }}>
              {[{ key:'feed', label:'Feed' }, { key:'rooms', label:`Rooms${joinedRooms.length > 0 ? ` (${joinedRooms.length})` : ''}` }].map(t => (
                <button key={t.key} onClick={() => { setView(t.key); setActiveRoomId(null) }}
                  style={{ flex:1, padding:'11px 0', background:'none', border:'none', cursor:'pointer', color: view===t.key ? '#fff' : 'rgba(255,255,255,0.4)', fontSize:14, fontWeight: view===t.key ? 700 : 500, borderBottom: view===t.key ? '2px solid #FF6B35' : '2px solid transparent', position:'relative', transition:'all 0.15s' }}>
                  {t.label}
                  {t.key === 'rooms' && joinedRooms.some(r => r.has_unread) && (
                    <span style={{ position:'absolute', top:9, right:'calc(50% - 28px)', width:7, height:7, borderRadius:'50%', background:'#FF6B35', border:'1.5px solid #050505' }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── ROOMS VIEW ──────────────────────────────────────────── */}
          {view === 'rooms' && (
            <>
              {joinedRooms.length === 0 ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 24px', textAlign:'center', gap:20 }}>
                  <div style={{ width:80, height:80, borderRadius:24, background:'rgba(255,107,53,0.08)', border:'1px solid rgba(255,107,53,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <RiGroupLine size={36} color="#FF6B35" />
                  </div>
                  <div>
                    <h3 style={{ color:'#fff', fontSize:20, fontWeight:700, margin:'0 0 8px' }}>Join your first Room</h3>
                    <p style={{ color:'rgba(255,255,255,0.45)', fontSize:14, lineHeight:1.65, margin:0, maxWidth:300 }}>
                      Rooms are exclusive spaces by sellers. Get early drops, insider info, and direct access to your favourite vendors.
                    </p>
                  </div>
                  <button onClick={() => setShowDiscover(true)} style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 30px', background:'linear-gradient(135deg, rgba(255,107,53,0.2), rgba(255,107,53,0.08))', border:'1px solid rgba(255,107,53,0.35)', borderRadius:999, cursor:'pointer', backdropFilter:'blur(12px)' }}>
                    <RiSearchLine size={18} color="#FF6B35" />
                    <span style={{ color:'#FF6B35', fontWeight:700, fontSize:15 }}>Explore Rooms</span>
                  </button>
                  {discoverRooms.slice(0, 3).map(room => (
                    <div key={room.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'rgba(255,255,255,0.04)', borderRadius:16, border:'1px solid rgba(255,255,255,0.07)', width:'100%', maxWidth:400 }}>
                      <img src={room.avatar_url} alt="" style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0, textAlign:'left' }}>
                        <p style={{ color:'#fff', fontSize:14, fontWeight:700, margin:0 }}>{room.name}</p>
                        <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, margin:'2px 0 0' }}>{room.members_count} members</p>
                      </div>
                      <button onClick={() => handleJoin(room)} style={{ padding:'7px 16px', borderRadius:999, background:'#FF6B35', border:'none', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:700, flexShrink:0 }}>{room.is_private ? 'Request' : 'Join'}</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'16px 16px 4px', background:'rgba(8,8,8,0.5)' }}>
                    <div style={{ display:'flex', gap:14, overflowX:'auto', scrollbarWidth:'none', paddingBottom:12 }}>
                      {joinedRooms.map(room => (
                        <RoomTrayAvatar key={room.id} room={room} isActive={false} onClick={() => openRoom(room)} />
                      ))}
                      <button onClick={() => setShowDiscover(true)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', flexShrink:0, width:68 }}>
                        <div style={{ width:54, height:54, borderRadius:'50%', background:'rgba(255,255,255,0.05)', border:'1px dashed rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <RiAddLine size={22} color="rgba(255,255,255,0.4)" />
                        </div>
                        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:10 }}>Explore</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ padding:'14px 0' }}>
                    <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 8px', padding:'0 16px' }}>Your Rooms</p>
                    {joinedRooms.map(room => (
                      <button key={room.id} onClick={() => openRoom(room)}
                        style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', width:'100%', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.05)', transition:'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ position:'relative', flexShrink:0 }}>
                          {room.has_unread && <div style={{ position:'absolute', inset:-2, borderRadius:'50%', background:'conic-gradient(#FF6B35, #FFD700, #FF6B35)', animation:'spin 2s linear infinite', zIndex:0 }} />}
                          <div style={{ position:'relative', zIndex:1, width:50, height:50, borderRadius:'50%', overflow:'hidden', border: room.has_unread ? '2px solid #050505' : '2px solid rgba(255,255,255,0.08)' }}>
                            <img src={room.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          </div>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                            <p style={{ color:'#fff', fontWeight: room.has_unread ? 700 : 600, fontSize:14, margin:0 }}>{room.name}</p>
                            {room.pivot_role === 'moderator' && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:999, background:'rgba(255,107,53,0.15)', color:'#FF6B35' }}>Host</span>}
                          </div>
                          <p style={{ color: room.has_unread ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)', fontSize:12, margin:0, fontWeight: room.has_unread ? 500 : 400 }}>
                            {room.has_unread ? 'New messages' : 'Tap to open chat'}
                          </p>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {room.has_unread && <div style={{ width:10, height:10, borderRadius:'50%', background:'#FF6B35' }} />}
                          <RiArrowRightSLine size={18} color="rgba(255,255,255,0.25)" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── GENERAL FEED ────────────────────────────────────────── */}
          {view === 'feed' && (
            <div>
              {loading && posts.length === 0 && (
                Array.from({ length:3 }).map((_, i) => (
                  <div key={i} style={{ display:'flex', gap:12, padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', opacity: 1 - i*0.25 }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(255,255,255,0.07)', flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ width:120, height:10, borderRadius:999, background:'rgba(255,255,255,0.07)', marginBottom:8 }} />
                      <div style={{ width:'90%', height:10, borderRadius:999, background:'rgba(255,255,255,0.05)', marginBottom:6 }} />
                      <div style={{ width:'65%', height:10, borderRadius:999, background:'rgba(255,255,255,0.04)' }} />
                    </div>
                  </div>
                ))
              )}

              {!loading && posts.length === 0 && (
                <div style={{ textAlign:'center', padding:'80px 24px' }}>
                  <RiFireLine size={40} color="rgba(255,255,255,0.1)" style={{ margin:'0 auto 12px', display:'block' }} />
                  <p style={{ color:'rgba(255,255,255,0.4)', fontSize:15, fontWeight:600, margin:'0 0 6px' }}>Nothing here yet</p>
                  <p style={{ color:'rgba(255,255,255,0.25)', fontSize:13, margin:0 }}>Be the first to post something!</p>
                </div>
              )}

              {posts.map(post => (
                <PostCard key={post.id} post={post} auth={auth}
                  onDelete={handleDelete} onLike={handleLike}
                  onDismiss={handleDismiss} onBlockAuthor={handleBlockAuthor}
                  onReport={setReportPost}
                />
              ))}

              {hasMore && <div ref={loaderRef} style={{ height:1 }} />}
              {loading && posts.length > 0 && (
                <div style={{ display:'flex', justifyContent:'center', padding:'20px 0' }}>
                  <div style={{ width:22, height:22, border:'2px solid rgba(255,255,255,0.1)', borderTopColor:'#FF6B35', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                </div>
              )}
            </div>
          )}

        </div>

        {view === 'feed' && (
          <button
            onClick={() => auth?.user ? setShowComposer(true) : router.visit('/login')}
            style={{ position:'fixed', bottom:82, right:18, width:54, height:54, borderRadius:'50%', background:'#FF6B35', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 24px rgba(255,107,53,0.5)', zIndex:50 }}
          >
            <RiAddLine size={28} color="#fff" />
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin     { to { transform:rotate(360deg); } }
        @keyframes slideUp  { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes typingDot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }
        ::-webkit-scrollbar { display:none; }
      `}</style>
    </>
  )
}

Community.layout = page => <AppLayout>{page}</AppLayout>