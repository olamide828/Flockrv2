import { useState, useEffect, useRef } from 'react'
import { Link, router } from '@inertiajs/react'
import axios from 'axios'
import {
  RiSendPlaneFill, RiCloseLine, RiArrowLeftLine, RiChat1Line, RiMoreLine,
  RiGroupLine, RiShieldLine, RiReplyLine, RiImage2Line, RiDeleteBinLine,
  RiSettings3Line, RiShareLine, RiLogoutBoxLine, RiInformationLine, RiRestartLine,
} from 'react-icons/ri'
import Av from './Av'
import ShareRoomSheet from './ShareRoomSheet'
import RoomInfoModal from './RoomInfoModal'
import RoomMediaPlayer from './RoomMediaPlayer'
import RoomMediaLightbox from './RoomMediaLightBox';
import { fmtTime } from './Helpers'
import GlassHeader, { GlassIconBtn } from '@/Components/Chat/GlassHeader'
import GlassComposer from '@/Components/Chat/GlassComposer'
import { GLASS } from '@/Components/Chat/glass'
import MessageActionMenu, { ReactionChips, toggleMyReaction } from '@/Components/Chat/MessageActionMenu'
import Ticks, { tickState } from '@/Components/Chat/Ticks'
import MentionText from '@/Components/Common/MentionText'
import { mergeIncoming, settleOptimistic, markFailed, markSending, isNetworkFailure, useElementHeight } from '@/Components/Chat/useChatMessages'

export default function RoomChat({ room, auth, onBack, onOpenMembers, onOpenRules, onOpenSettings, onLeaveRoom, showToast, initialMediaMessageId, onConsumedInitialMedia }) {
  const [messages,  setMessages]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [hasMore,   setHasMore]   = useState(false)
  const [body,      setBody]      = useState('')
  const [sending,   setSending]   = useState(false)
  const [replyTo,   setReplyTo]   = useState(null)
  const [msgAction, setMsgAction] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)
  const startPt = useRef({ x: 0, y: 0 })
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [pendingMedia, setPendingMedia] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(null) // 0-100 while uploading, null otherwise

const [typingUsers, setTypingUsers] = useState({}) 
const typingTimersRef = useRef({}) 
  const [headerMenu, setHeaderMenu] = useState(false)
  const [showShare,  setShowShare]  = useState(false)
  const [showInfo,   setShowInfo]   = useState(false)

  const [headerRef, headerH] = useElementHeight()
  const [composerRef, composerH] = useElementHeight()
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const roomFileRef = useRef(null)
  const channelRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const lastTypingSentRef = useRef(0)
  const swipeRef   = useRef({})
  const pressTimer = useRef(null)
    const isOwner    = auth?.user?.id === room.seller_id
  // Everyone can share a public room. Only the seller can share a private one.
  const canShare = !room.is_private || isOwner

  const mediaMessages = messages.filter(m => m.media_url && !m.is_deleted)
  const openLightbox = (msg) => {
    const i = mediaMessages.findIndex(m => m.id === msg.id)
    if (i !== -1) setLightboxIndex(i)
  }

  useEffect(() => {
    setLoading(true)
    axios.get(`/api/community/rooms/${room.id}/messages`)
      .then(r => { setMessages(r.data.messages ?? []); setHasMore(r.data.has_more ?? false) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [room.id])

  // Keep my ticks fresh (✓ → ✓✓ → orange ✓✓) while the room is open: refresh delivery state every 20s
  useEffect(() => {
    const t = setInterval(() => {
      if (document.hidden) return
      axios.get(`/api/community/rooms/${room.id}/messages`).then(r => {
        const fresh = new Map((r.data.messages ?? []).map(m => [m.id, m]))
        setMessages(p => p.map(m => fresh.has(m.id) && m.user_id === auth?.user?.id ? { ...m, delivery: fresh.get(m.id).delivery } : m))
      }).catch(() => {})
    }, 20000)
    return () => clearInterval(t)
  }, [room.id, auth?.user?.id])

  useEffect(() => {
    if (!loading) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 60)
  }, [messages.length, loading])

  useEffect(() => {
    if (!initialMediaMessageId || loading) return
    const idx = mediaMessages.findIndex(m => m.id === initialMediaMessageId)
    if (idx !== -1) {
      setLightboxIndex(idx)
      onConsumedInitialMedia?.()
    }
  }, [initialMediaMessageId, loading, mediaMessages])

useEffect(() => {
    if (!window.Echo) return
    const channel = window.Echo.private(`room.${room.id}`)
    channel.listen('.RoomMessageSent', (e) => setMessages(p => mergeIncoming(p, e.message)))
    channel.listen('.RoomMessageDeleted', (e) => {
      setMessages(p => p.map(m => m.id === e.message_id
        ? { ...m, is_deleted: true, body: null, media_url: null, media_type: null }
        : m))
    })

    channel.listen('.RoomMessageUpdated', (e) => {
      setMessages(p => p.map(m => m.id === e.message_id
        ? { ...m, reactions: e.reactions ?? m.reactions, ...(e.body != null ? { body: e.body, edited_at: e.edited_at } : {}) }
        : m))
    })

    channel.listen('.RoomMessageLiked', (e) => {
      setMessages(p => p.map(m => m.id === e.message_id
        ? { ...m, likes_count: e.likes_count }
        : m))
    })

    channel.listenForWhisper('typing', (e) => {
      if (e.user_id === auth?.user?.id) return
      setTypingUsers(prev => ({ ...prev, [e.user_id]: e.name || 'Someone' }))
      clearTimeout(typingTimersRef.current[e.user_id])
      typingTimersRef.current[e.user_id] = setTimeout(() => {
        setTypingUsers(prev => {
          const next = { ...prev }
          delete next[e.user_id]
          return next
        })
      }, 2000)
    })
    channelRef.current = channel
    return () => {
      Object.values(typingTimersRef.current).forEach(clearTimeout)
      channel.stopListening('.RoomMessageSent')
      channel.stopListening('.RoomMessageDeleted')
      channel.stopListening('.RoomMessageLiked')
      channel.stopListeningForWhisper('typing')
    }
  }, [room.id])

  useEffect(() => { if (replyTo) inputRef.current?.focus() }, [replyTo])

  const broadcastTyping = () => {
    if (!window.Echo) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < 2000) return
    lastTypingSentRef.current = now
    try {
      window.Echo.private(`room.${room.id}`).whisper('typing', {
        user_id: auth?.user?.id,
        name: auth?.user?.name,
      })
    } catch {}
  }

  const loadMore = async () => {
    const firstId = messages[0]?.id
    if (!firstId) return
    const r = await axios.get(`/api/community/rooms/${room.id}/messages`, { params: { before_id: firstId } })
    setMessages(p => [...(r.data.messages ?? []), ...p])
    setHasMore(r.data.has_more ?? false)
  }

  const MAX_UPLOAD_MB = 100

  const pickRoomMedia = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      showToast?.(`That file is too big — max ${MAX_UPLOAD_MB}MB.`, 'error')
      e.target.value = ''
      return
    }
    const isVideo = file.type.startsWith('video/')
    setPendingMedia({ preview: URL.createObjectURL(file), type: isVideo ? 'video' : 'image', file })
  }

  // Sends (or re-sends) one optimistic message. No internet / timeout / server error → the bubble stays with a red Retry.
  const deliver = async (opt) => {
    const p = opt._payload
    try {
      let media_url = p.media_url ?? null
      const media_type = p.media_type ?? null
      if (p.file && !media_url) {
        const form = new FormData()
        form.append('file', p.file)
        form.append('type', media_type)
        const { data } = await axios.post('/api/upload/media', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })
        media_url = data.url
        opt._payload = { ...p, media_url }   // if only the message POST fails later, Retry won't upload the file again
      }
      const { data } = await axios.post(`/api/community/rooms/${room.id}/messages`, {
        body: p.body, media_url, media_type, reply_to_id: p.reply_to_id,
      }, { timeout: 20000 })
      setMessages(prev => settleOptimistic(prev, opt.id, data))
    } catch (err) {
      if (isNetworkFailure(err)) {
        setMessages(prev => markFailed(prev, opt.id).map(m => m.id === opt.id ? { ...m, _payload: opt._payload } : m))
      } else {
        setMessages(prev => prev.filter(m => m.id !== opt.id))
        showToast?.(err.response?.data?.message ?? 'Could not send that message.', 'error')
      }
    }
  }

  const retrySend = (msg) => {
    if (!msg?._payload) return
    setMessages(prev => markSending(prev, msg.id))
    deliver(msg)
  }

  const send = async (e) => {
    e?.preventDefault?.()
    if (editingMsg) { submitEdit(); return }
    if (!body.trim() && !pendingMedia) return
    if (!auth?.user) { router.visit('/login'); return }

    const text = body.trim() || null
    const opt = {
      id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, user_id: auth.user.id, body: text,
      media_url: pendingMedia?.preview ?? null, media_type: pendingMedia?.type ?? null,
      created_at: new Date().toISOString(), user: auth.user,
      reply_to: replyTo, reply_to_id: replyTo?.id ?? null, _opt: true, _optimistic: true,
      _payload: { body: text, file: pendingMedia?.file ?? null, media_type: pendingMedia?.type ?? null, reply_to_id: replyTo?.id ?? null },
    }
    setMessages(p => [...p, opt])
    setBody(''); setReplyTo(null); setPendingMedia(null)
    if (inputRef.current) inputRef.current.style.height = 'auto'
    deliver(opt)
  }

  const deleteMsg = async (msg) => {
    setMsgAction(null)
    setMessages(p => p.map(m => m.id === msg.id ? { ...m, is_deleted: true, body: null, media_url: null, media_type: null } : m))
    try { await axios.delete(`/api/community/rooms/${room.id}/messages/${msg.id}`) }
    catch { /* already optimistic; a refresh will resync if this genuinely failed */ }
  }

  const EDIT_MINUTES = 15
  const canEditMsg = (m) => m && isMine(m) && !!m.body && !m.is_deleted && !m._opt && !String(m.id).startsWith('opt-') && (Date.now() - new Date(m.created_at).getTime()) < EDIT_MINUTES * 60000

  const reactTo = async (msg, emoji) => {
    if (String(msg.id).startsWith('opt-')) return
    const me = auth.user.id
    const before = msg.reactions ?? []
    setMessages(p => p.map(m => m.id === msg.id ? { ...m, reactions: toggleMyReaction(before, me, emoji) } : m))
    try {
      const { data } = await axios.post(`/api/community/rooms/${room.id}/messages/${msg.id}/react`, { emoji })
      setMessages(p => p.map(m => m.id === msg.id ? { ...m, reactions: data.reactions } : m))
    } catch {
      setMessages(p => p.map(m => m.id === msg.id ? { ...m, reactions: before } : m))
      showToast?.('Could not add your reaction.', 'error')
    }
  }

  const startEdit = (msg) => { setReplyTo(null); setEditingMsg(msg); setBody(msg.body); setTimeout(() => inputRef.current?.focus(), 50) }
  const cancelEdit = () => { setEditingMsg(null); setBody('') }
  const submitEdit = async () => {
    const msg = editingMsg, text = body.trim()
    if (!msg || !text) return
    if (text === msg.body) { cancelEdit(); return }
    const prev = { body: msg.body, edited_at: msg.edited_at }
    setMessages(p => p.map(m => m.id === msg.id ? { ...m, body: text, edited_at: new Date().toISOString() } : m))
    cancelEdit()
    try {
      const { data } = await axios.patch(`/api/community/rooms/${room.id}/messages/${msg.id}`, { body: text })
      setMessages(p => p.map(m => m.id === msg.id ? { ...m, body: data.body, edited_at: data.edited_at } : m))
    } catch (err) {
      setMessages(p => p.map(m => m.id === msg.id ? { ...m, ...prev } : m))
      showToast?.(err.response?.data?.message ?? 'Could not edit that message.', 'error')
    }
  }

  const toggleLikeMsg = async (msg) => {
    const wasLiked = msg.is_liked_by_me
    setMessages(p => p.map(m => m.id === msg.id
      ? { ...m, is_liked_by_me: !wasLiked, likes_count: (m.likes_count ?? 0) + (wasLiked ? -1 : 1) }
      : m))
    try {
      const { data } = await axios.post(`/api/community/rooms/${room.id}/messages/${msg.id}/like`)
      setMessages(p => p.map(m => m.id === msg.id ? { ...m, is_liked_by_me: data.liked, likes_count: data.likes_count } : m))
    } catch {
      setMessages(p => p.map(m => m.id === msg.id
        ? { ...m, is_liked_by_me: wasLiked, likes_count: (m.likes_count ?? 0) + (wasLiked ? 1 : -1) }
        : m))
    }
  }

  const onTouchStart = (e, msg) => {
    swipeRef.current = { startX: e.touches[0].clientX, msgId: msg.id, el: e.currentTarget }
    startPt.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchMove  = (e, msg) => {
    // scrolling or swiping cancels the long-press
    if (Math.abs(e.touches[0].clientX - startPt.current.x) > 8 || Math.abs(e.touches[0].clientY - startPt.current.y) > 8) clearTimeout(pressTimer.current)
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
    if (dx > 50 && !msg.is_system && !msg.is_deleted) { setReplyTo(msg); inputRef.current?.focus() }
    swipeRef.current = {}
  }

  // The rect is read right away (not inside the timer), when the row element is certainly still there.
  const openMenuFor = (rowEl, msg) => {
    const bubble = rowEl?.querySelector?.('[data-bubble]') ?? rowEl
    const rect = bubble?.getBoundingClientRect()
    if (rect) setMsgAction({ msg, rect })
  }
  const onPressStart = (e, msg) => {
    if (msg.is_system || msg.is_deleted || msg._opt) return
    const row = e.currentTarget
    clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => { navigator.vibrate?.(8); openMenuFor(row, msg) }, 420)
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
    <div style={{ position:'relative', height:'100%', overflow:'hidden', background:'#050505' }}>
      {showShare && <ShareRoomSheet room={room} onClose={() => setShowShare(false)} />}
      {showInfo  && <RoomInfoModal room={room} onClose={() => setShowInfo(false)} />}

      {/* Messages scroll under the floating glass header and composer */}
      <div style={{ position:'absolute', inset:0, overflowY:'auto', scrollbarWidth:'none', padding:`${headerH + 8}px 0 ${composerH + 8}px` }}>
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
              if (msg.is_system) {
                return (
                  <div key={msg.id} style={{ display:'flex', justifyContent:'center', padding:'6px 16px' }}>
                    <span style={{ color:'rgba(255,255,255,0.3)', fontSize:12, padding:'4px 12px', background:'rgba(255,255,255,0.03)', borderRadius:999 }}>{msg.body}</span>
                  </div>
                )
              }

              const mine     = isMine(msg)
              const prevMsg  = group.msgs[i - 1]
              const nextMsg  = group.msgs[i + 1]
const showName = !mine && (!prevMsg || prevMsg.user_id !== msg.user_id || prevMsg.is_system)
const showAv   = !mine && (!nextMsg || nextMsg.user_id !== msg.user_id || nextMsg.is_system)

              return (
                <div key={msg.id}
                  onTouchStart={e => { onTouchStart(e, msg); onPressStart(e, msg) }}
                  onTouchMove={e  => onTouchMove(e, msg)}
                  onTouchEnd={e   => { onTouchEnd(e, msg); onPressEnd() }}
                  onMouseDown={e  => onPressStart(e, msg)}
                  onMouseUp={onPressEnd}
                  onMouseLeave={onPressEnd}
                  onContextMenu={e => { e.preventDefault(); if (!msg.is_deleted && !msg._opt) openMenuFor(e.currentTarget, msg) }}
                  style={{ WebkitTouchCallout:'none', WebkitUserSelect:'none', display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start', padding:`${showAv ? 8 : 2}px 12px 2px`, alignItems:'flex-end', gap:8, opacity: msg._failed ? 1 : (msg._opt ? 0.6 : 1), transition:'transform 0.15s ease', cursor:'default', userSelect:'none' }}>
                  {!mine && (
                    <div style={{ width:32, flexShrink:0, alignSelf:'flex-end' }}>
                      {showAv && <Link href={`/@${msg.user?.username}`}><Av user={msg.user} size={32} /></Link>}
                    </div>
                  )}

                  <div data-bubble style={{ maxWidth:'72%', display:'flex', flexDirection:'column', alignItems: mine ? 'flex-end' : 'flex-start', gap:2 }}>
                    {showName && <span style={{ color:'#FF6B35', fontSize:11, fontWeight:700, paddingLeft:2 }}>{msg.user?.name}</span>}

                    {msg.reply_to && !msg.is_deleted && (
                      <div style={{ padding:'5px 10px', borderRadius:10, background:'rgba(255,255,255,0.05)', borderLeft:'2px solid #FF6B35', maxWidth:'100%', marginBottom:2 }}>
                        <p style={{ margin:0, color:'#FF6B35', fontSize:10, fontWeight:700 }}>{msg.reply_to?.user?.name}</p>
                        <p style={{ margin:0, color:'rgba(255,255,255,0.5)', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>{msg.reply_to?.body}</p>
                      </div>
                    )}

                    {msg.is_deleted ? (
                      <div style={{ padding:'9px 14px', background:'rgba(255,255,255,0.04)', border:'1px dashed rgba(255,255,255,0.12)', borderRadius: mine ? '18px 5px 5px 18px' : '5px 18px 18px 5px', color:'rgba(255,255,255,0.35)', fontSize:13, fontStyle:'italic' }}>
                        This message was deleted
                      </div>
                    ) : msg.media_url ? (
                      <div style={{
                        background: 'rgba(255,255,255,0.10)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255,255,255,0.22)',
                        borderRadius: mine
                          ? `22px ${showName ? 22 : 8}px 8px 22px`
                          : `${showName ? 22 : 8}px 22px 22px 8px`,
                        boxShadow: '0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
                        overflow: 'hidden',
                        color: '#fff', fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word',
                      }}>
                        <div onClick={() => openLightbox(msg)} style={{ cursor: 'pointer', width: 220, height: 220, overflow: 'hidden' }}>
                          {msg.media_type === 'video'
                            ? <RoomMediaPlayer src={msg.media_url} maxHeight={220} />
                            : <img src={msg.media_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                          }
                        </div>
                        {msg.body && <p style={{ margin: '8px 14px 10px' }}>{msg.body}</p>}
                      </div>
                    ) : (
                      <div style={{
                        padding: '9px 14px',
                        background: mine ? '#FF6B35' : 'rgba(255,255,255,0.09)',
                        borderRadius: mine
                          ? `18px ${showName ? 18 : 5}px 5px 18px`
                          : `${showName ? 18 : 5}px 18px 18px 5px`,
                        color:'#fff', fontSize:14, lineHeight:1.45, wordBreak:'break-word',
                        overflow:'hidden',
                        boxShadow: mine ? '0 2px 12px rgba(255,107,53,0.3)' : 'none',
                      }}>
                        <p style={{ margin: 0, whiteSpace:'pre-wrap' }}><MentionText text={msg.body} linkStyle={{ fontWeight:700, color:'#fff', textDecoration:'underline' }} /></p>
                      </div>
                    )}

                    {!msg.is_deleted && msg.reactions?.length > 0 && (
                      <ReactionChips reactions={msg.reactions} myId={auth?.user?.id} mine={mine} onToggle={(emoji) => reactTo(msg, emoji)} />
                    )}

                    <span style={{ display:'inline-flex', alignItems:'center', gap:4, color:'rgba(255,255,255,0.3)', fontSize:10, padding: mine ? '0 4px 0 0' : '0 0 0 4px' }}>
                      {msg.edited_at && !msg.is_deleted && <span>Edited</span>}
                      <span>{fmtTime(msg.created_at)}</span>
                      {mine && !msg.is_deleted && !msg._failed && <Ticks state={tickState({ ...msg, _optimistic: msg._opt && !msg._failed })} />}
                    </span>
                  </div>
                  {msg._failed && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); retrySend(msg) }} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} aria-label="Message not sent. Tap to retry" title="Not sent. Tap to retry"
                      style={{ flex:'0 0 28px', width:28, height:28, minWidth:28, padding:0, borderRadius:'50%', border:'1px solid rgba(239,68,68,0.55)', background:'rgba(239,68,68,0.18)', color:'#f87171', display:'inline-flex', alignItems:'center', justifyContent:'center', alignSelf:'center', cursor:'pointer', lineHeight:0, order: mine ? -1 : 2 }}>
                      <RiRestartLine size={15} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {(() => {
          const names = Object.values(typingUsers)
          if (names.length === 0) return null
          const text = names.length === 1
            ? `${names[0]} is typing`
            : `${names[0]} and ${names.length - 1} other${names.length - 1 > 1 ? 's' : ''} typing`
          return (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'2px 16px', marginTop:4 }}>
              <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12, fontStyle:'italic' }}>{text}</span>
              <span style={{ display:'flex', gap:4 }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:'rgba(255,255,255,0.4)', animation:'typingDot 1.2s ease-in-out infinite' }} />
                <span style={{ width:5, height:5, borderRadius:'50%', background:'rgba(255,255,255,0.4)', animation:'typingDot 1.2s ease-in-out infinite', animationDelay:'0.2s' }} />
                <span style={{ width:5, height:5, borderRadius:'50%', background:'rgba(255,255,255,0.4)', animation:'typingDot 1.2s ease-in-out infinite', animationDelay:'0.4s' }} />
              </span>
            </div>
          )
        })()}
        <div ref={bottomRef} style={{ height:8 }} />
      </div>

      <GlassHeader
        headerRef={headerRef}
        onBack={onBack}
        onTitleClick={() => setShowInfo(true)}
        avatar={<img src={room.avatar_url} alt="" style={{ width:34, height:34, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />}
        title={<span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{room.name}</span>}
        subtitle={typingUsers && Object.keys(typingUsers).length ? 'typing…' : `${room.members_count} members`}
        subtitleColor={typingUsers && Object.keys(typingUsers).length ? '#ff8a4d' : undefined}
        actions={<>
          <GlassIconBtn label="Members" onClick={onOpenMembers}><RiGroupLine size={18} /></GlassIconBtn>
          <div style={{ position:'relative' }}>
            <GlassIconBtn label="More" onClick={() => setHeaderMenu(o => !o)}><RiMoreLine size={20} /></GlassIconBtn>
            {headerMenu && (
              <>
                <div onClick={() => setHeaderMenu(false)} style={{ position:'fixed', inset:0, zIndex:98 }} />
                <div style={{ ...GLASS, background:'rgba(24,24,26,0.82)', position:'absolute', top:44, right:0, zIndex:99, borderRadius:16, overflow:'hidden', minWidth:180 }}>
                  {[
                    { show:true, icon:<RiInformationLine size={16} />, label:'Room info', run:() => setShowInfo(true) },
                    { show: room.rules?.length > 0, icon:<RiShieldLine size={16} />, label:'Rules', run:onOpenRules },
                    { show: canShare, icon:<RiShareLine size={16} />, label:'Share room', run:() => setShowShare(true) },
                    { show: isOwner, icon:<RiSettings3Line size={16} />, label:'Room settings', run:onOpenSettings },
                  ].filter(i => i.show).map(i => (
                    <button key={i.label} onClick={() => { setHeaderMenu(false); i.run() }}
                      style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'12px 16px', background:'none', border:'none', borderBottom:'1px solid rgba(255,255,255,0.06)', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:600 }}>
                      <span style={{ color:'rgba(255,255,255,0.6)', display:'flex' }}>{i.icon}</span> {i.label}
                    </button>
                  ))}
                  {!isOwner && (
                    <button onClick={() => { setHeaderMenu(false); onLeaveRoom(room) }}
                      style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'#EF4444', fontSize:13, fontWeight:600 }}>
                      <RiLogoutBoxLine size={16} /> Leave room
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </>}
      />

      {msgAction && (
        <MessageActionMenu
          msg={msgAction.msg} rect={msgAction.rect} mine={isMine(msgAction.msg)}
          myReaction={(msgAction.msg.reactions ?? []).find(r => r.user_id === auth?.user?.id)?.emoji}
          canCopy={!!msgAction.msg.body} canEdit={canEditMsg(msgAction.msg)} canDelete={canDel(msgAction.msg)}
          onReact={(emoji) => reactTo(msgAction.msg, emoji)}
          onReply={() => { setReplyTo(msgAction.msg); inputRef.current?.focus() }}
          onCopy={() => { navigator.clipboard?.writeText(msgAction.msg.body).then(() => showToast?.('Copied')).catch(() => {}) }}
          onEdit={() => startEdit(msgAction.msg)}
          onDelete={() => deleteMsg(msgAction.msg)}
          onClose={() => setMsgAction(null)}
        />
      )}

      {lightboxIndex !== null && (
        <RoomMediaLightbox
          room={room}
          mediaMessages={mediaMessages}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onReply={(msg) => { setReplyTo(msg); inputRef.current?.focus() }}
          onDelete={(msg) => deleteMsg(msg)}
          canDeleteMsg={canDel}
          onLike={toggleLikeMsg}
        />
      )}


      {auth?.user ? (
        <GlassComposer
          composerRef={composerRef}
          value={body}
          onChange={setBody}
          onSubmit={send}
          onPickMedia={(file) => {
            if (file.size > MAX_UPLOAD_MB * 1024 * 1024) { showToast?.(`That file is too big — max ${MAX_UPLOAD_MB}MB.`, 'error'); return }
            setPendingMedia({ preview: URL.createObjectURL(file), type: file.type.startsWith('video/') ? 'video' : 'image', file })
          }}
          inputRef={inputRef}
          mediaInputRef={roomFileRef}
          placeholder="Message"
          canSend={body.trim().length > 0 || !!pendingMedia}
          onInputExtra={() => broadcastTyping()}
          top={<>
            {editingMsg && (
              <div style={{ ...GLASS, display:'flex', alignItems:'center', gap:10, padding:'8px 14px', borderRadius:16 }}>
                <div style={{ flex:1, minWidth:0, borderLeft:'2px solid #FF6B35', paddingLeft:8 }}>
                  <p style={{ margin:0, color:'#FF6B35', fontSize:11, fontWeight:700 }}>Editing message</p>
                  <p style={{ margin:0, color:'rgba(255,255,255,0.7)', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{editingMsg.body}</p>
                </div>
                <button onClick={cancelEdit} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', display:'inline-flex', alignItems:'center', justifyContent:'center', padding:4, lineHeight:0 }}><RiCloseLine size={16} style={{ display:'block' }} /></button>
              </div>
            )}
            {replyTo && (
              <div style={{ ...GLASS, display:'flex', alignItems:'center', gap:10, padding:'8px 14px', borderRadius:16 }}>
                <RiReplyLine size={15} color="#FF6B35" />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, color:'#FF6B35', fontSize:11, fontWeight:700 }}>{replyTo.user?.name}</p>
                  <p style={{ margin:0, color:'rgba(255,255,255,0.7)', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{replyTo.body}</p>
                </div>
                <button onClick={() => setReplyTo(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', display:'flex' }}><RiCloseLine size={16} /></button>
              </div>
            )}
            {pendingMedia && (
              <div style={{ position:'relative', display:'inline-block', borderRadius:14, overflow:'hidden', ...GLASS }}>
                {pendingMedia.type === 'video'
                  ? <video src={pendingMedia.preview} style={{ height:90, display:'block' }} />
                  : <img src={pendingMedia.preview} alt="" style={{ height:90, display:'block' }} />}
                <button onClick={() => setPendingMedia(null)} style={{ position:'absolute', top:5, right:5, background:'rgba(0,0,0,0.75)', border:'none', borderRadius:'50%', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
                  <RiCloseLine size={13} />
                </button>
              </div>
            )}
          </>}
        />
      ) : (
        <div ref={composerRef} style={{ position:'absolute', left:0, right:0, bottom:0, zIndex:20, padding:'8px 12px calc(env(safe-area-inset-bottom) + 10px)' }}>
          <button onClick={() => router.visit('/login')} style={{ ...GLASS, width:'100%', padding:'13px', borderRadius:20, color:'#FF6B35', fontWeight:700, fontSize:14, cursor:'pointer' }}>
            Log in to send messages
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes typingDot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }
      `}</style>
    </div>
  )
}