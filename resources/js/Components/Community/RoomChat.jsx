import { useState, useEffect, useRef } from 'react'
import { Link, router } from '@inertiajs/react'
import axios from 'axios'
import {
  RiSendPlaneFill, RiCloseLine, RiArrowLeftLine, RiChat1Line, RiMoreLine,
  RiGroupLine, RiShieldLine, RiReplyLine, RiImage2Line, RiDeleteBinLine,
  RiSettings3Line, RiShareLine, RiLogoutBoxLine, RiInformationLine,
} from 'react-icons/ri'
import Av from './Av'
import ShareRoomSheet from './ShareRoomSheet'
import RoomInfoModal from './RoomInfoModal'
import RoomMediaPlayer from './RoomMediaPlayer'
import { fmtTime } from './Helpers'

export default function RoomChat({ room, auth, onBack, onOpenMembers, onOpenRules, onOpenSettings, onLeaveRoom, showToast }) {
  const [messages,  setMessages]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [hasMore,   setHasMore]   = useState(false)
  const [body,      setBody]      = useState('')
  const [sending,   setSending]   = useState(false)
  const [replyTo,   setReplyTo]   = useState(null)
  const [msgAction, setMsgAction] = useState(null)
  const [pendingMedia, setPendingMedia] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(null) // 0-100 while uploading, null otherwise
  const [typing,    setTyping]    = useState(false)
  const [headerMenu, setHeaderMenu] = useState(false)
  const [showShare,  setShowShare]  = useState(false)
  const [showInfo,   setShowInfo]   = useState(false)

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
    channel.listen('.RoomMessageSent', (e) => setMessages(p => {
      // Already have the real message (e.g. the HTTP response for our own
      // send already landed) — nothing to do.
      if (p.some(m => m.id === e.message.id)) return p

      // If this is our own message and its optimistic placeholder is still
      // showing, swap it in-place instead of appending a second bubble.
      // Previously this always appended, then relied on the later HTTP
      // response to prune the optimistic copy — which worked, but left a
      // brief window where both were visible (the "flashes then leaves"
      // duplicate). Merging here means there's never a second bubble at all,
      // regardless of whether the broadcast or the HTTP response wins the race.
      const optIndex = p.findIndex(m =>
        String(m.id).startsWith('opt-') &&
        m.user_id === e.message.user_id &&
        m.body === e.message.body &&
        m.media_url === e.message.media_url
      )
      if (optIndex !== -1) {
        const copy = [...p]
        copy[optIndex] = e.message
        return copy
      }
      return [...p, e.message]
    }))
    channel.listen('.RoomMessageDeleted', (e) => {
      setMessages(p => p.map(m => m.id === e.message_id
        ? { ...m, is_deleted: true, body: null, media_url: null, media_type: null }
        : m))
    })
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
        setUploadProgress(0)
        const { data } = await axios.post('/api/upload/media', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            if (evt.total) setUploadProgress(Math.round((evt.loaded * 100) / evt.total))
          },
        })
        media_url = data.url; media_type = pendingMedia.type
      } catch (err) {
        showToast?.(err.response?.data?.message ?? 'Upload failed. Please try again.', 'error')
        setSending(false)
        setUploadProgress(null)
        return
      }
      setUploadProgress(null)
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
      setMessages(p => {
        const alreadyDeliveredByBroadcast = p.some(m => m.id === data.id && m.id !== opt.id)
        if (alreadyDeliveredByBroadcast) return p.filter(m => m.id !== opt.id)
        return p.map(m => m.id === opt.id ? data : m)
      })
    } catch { setMessages(p => p.filter(m => m.id !== opt.id)); setBody(b) }
    finally { setSending(false) }
  }

  const deleteMsg = async (msg) => {
    setMsgAction(null)
    setMessages(p => p.map(m => m.id === msg.id ? { ...m, is_deleted: true, body: null, media_url: null, media_type: null } : m))
    try { await axios.delete(`/api/community/rooms/${room.id}/messages/${msg.id}`) }
    catch { /* already optimistic; a refresh will resync if this genuinely failed */ }
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
    if (dx > 50 && !msg.is_system && !msg.is_deleted) { setReplyTo(msg); inputRef.current?.focus() }
    swipeRef.current = {}
  }

  // FIX: capture the bounding rect immediately (synchronously), not inside
  // the setTimeout callback — by the time the timer fires, e.currentTarget
  // can already be null (event pooling / row re-render), which was throwing
  // "Cannot read properties of null (reading 'getBoundingClientRect')".
  const onPressStart = (e, msg) => {
    if (msg.is_system || msg.is_deleted) return
    const rect = e.currentTarget?.getBoundingClientRect()
    if (!rect) return
    pressTimer.current = setTimeout(() => {
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
      {showShare && <ShareRoomSheet room={room} onClose={() => setShowShare(false)} />}
      {showInfo  && <RoomInfoModal room={room} onClose={() => setShowInfo(false)} />}

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
          {canShare && (
            <button onClick={() => setShowShare(true)} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)' }}>
              <RiShareLine size={16} />
            </button>
          )}
          <button onClick={onOpenMembers} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)' }}>
            <RiGroupLine size={17} />
          </button>
          {isOwner && (
            <button onClick={onOpenSettings} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)' }}>
              <RiSettings3Line size={17} />
            </button>
          )}
          <div style={{ position:'relative' }}>
            <button onClick={() => setHeaderMenu(o => !o)} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)' }}>
              <RiMoreLine size={17} />
            </button>
            {headerMenu && (
              <>
                <div onClick={() => setHeaderMenu(false)} style={{ position:'fixed', inset:0, zIndex:98 }} />
                <div style={{ position:'absolute', top:42, right:0, zIndex:99, background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, overflow:'hidden', minWidth:170, boxShadow:'0 8px 32px rgba(0,0,0,0.7)' }}>
                  <button onClick={() => { setHeaderMenu(false); setShowInfo(true) }}
                    style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:600, borderBottom: !isOwner ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <RiInformationLine size={16} color="rgba(255,255,255,0.5)" /> Info
                  </button>
                  {!isOwner && (
                    <button onClick={() => { setHeaderMenu(false); onLeaveRoom(room) }}
                      style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'#EF4444', fontSize:13, fontWeight:600 }}>
                      <RiLogoutBoxLine size={16} /> Leave room
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
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
              if (msg.is_system) {
                return (
                  <div key={msg.id} style={{ display:'flex', justifyContent:'center', padding:'6px 16px' }}>
                    <span style={{ color:'rgba(255,255,255,0.3)', fontSize:12, padding:'4px 12px', background:'rgba(255,255,255,0.03)', borderRadius:999 }}>{msg.body}</span>
                  </div>
                )
              }

              const mine     = isMine(msg)
              const prevMsg  = group.msgs[i - 1]
              const showAv   = !mine && (!prevMsg || prevMsg.user_id !== msg.user_id || prevMsg.is_system)
              const showName = showAv

              return (
                <div key={msg.id}
                  onTouchStart={e => { onTouchStart(e, msg); onPressStart(e, msg) }}
                  onTouchMove={e  => onTouchMove(e, msg)}
                  onTouchEnd={e   => { onTouchEnd(e, msg); onPressEnd() }}
                  onMouseDown={e  => onPressStart(e, msg)}
                  onMouseUp={onPressEnd}
                  onMouseLeave={onPressEnd}
                  style={{ display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start', padding:`${showAv ? 8 : 2}px 12px 2px`, alignItems:'flex-end', gap:8, opacity: msg._opt ? 0.6 : 1, transition:'transform 0.15s ease', cursor:'default', userSelect:'none' }}>
                  {!mine && (
                    <div style={{ width:32, flexShrink:0, alignSelf:'flex-end' }}>
                      {showAv && <Link href={`/@${msg.user?.username}`}><Av user={msg.user} size={32} /></Link>}
                    </div>
                  )}

                  <div style={{ maxWidth:'72%', display:'flex', flexDirection:'column', alignItems: mine ? 'flex-end' : 'flex-start', gap:2 }}>
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
                    ) : (
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
                              ? <RoomMediaPlayer src={msg.media_url} maxHeight={220} />
                              : <img src={msg.media_url} alt="" style={{ width:'100%', maxHeight:250, objectFit:'cover', display:'block' }} />
                            }
                          </div>
                        )}
                        {msg.body && <p style={{ margin: msg.media_url ? '8px 14px 10px' : 0, whiteSpace:'pre-wrap' }}>{msg.body}</p>}
                      </div>
                    )}

                    <span style={{ color:'rgba(255,255,255,0.22)', fontSize:10, padding: mine ? '0 4px 0 0' : '0 0 0 4px' }}>{fmtTime(msg.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

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

      {pendingMedia && (
        <div style={{ padding:'10px 14px 0', flexShrink:0 }}>
          <div style={{ position:'relative', display:'inline-block', borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)' }}>
            {pendingMedia.type === 'video'
              ? <video src={pendingMedia.preview} style={{ height:90, display:'block' }} />
              : <img src={pendingMedia.preview} alt="" style={{ height:90, display:'block' }} />
            }
            {uploadProgress !== null && (
              <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
                <span style={{ color:'#fff', fontSize:13, fontWeight:700 }}>{uploadProgress}%</span>
                <div style={{ width:'70%', height:4, borderRadius:999, background:'rgba(255,255,255,0.2)', overflow:'hidden' }}>
                  <div style={{ width:`${uploadProgress}%`, height:'100%', background:'#FF6B35', transition:'width 0.15s' }} />
                </div>
              </div>
            )}
            {uploadProgress === null && (
              <button onClick={() => setPendingMedia(null)} style={{ position:'absolute', top:5, right:5, background:'rgba(0,0,0,0.75)', border:'none', borderRadius:'50%', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
                <RiCloseLine size={13} />
              </button>
            )}
          </div>
        </div>
      )}

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
              style={{ width:44, height:44, borderRadius:'50%', background: (body.trim() || pendingMedia) ? '#FF6B35' : 'rgba(255,255,255,0.07)', border:'none', cursor: (body.trim() || pendingMedia) ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <RiSendPlaneFill size={18} color={(body.trim() || pendingMedia) ? '#fff' : 'rgba(255,255,255,0.25)'} />
            </button>
          </form>
        ) : (
          <button onClick={() => router.visit('/login')} style={{ width:'100%', padding:'12px', background:'rgba(255,107,53,0.1)', border:'1px solid rgba(255,107,53,0.25)', borderRadius:14, color:'#FF6B35', fontWeight:700, fontSize:14, cursor:'pointer' }}>
            Log in to send messages
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes typingDot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }
      `}</style>
    </div>
  )
}