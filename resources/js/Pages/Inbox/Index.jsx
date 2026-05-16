import { useState, useEffect, useRef, useCallback } from 'react'
import { Head, usePage, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'
import {
  RiSendPlaneFill,
  RiArrowLeftLine,
  RiChat1Line,
  RiCheckDoubleLine,
  RiCheckLine,
  RiSearchLine,
  RiCloseLine,
  RiEmotionLine,
} from 'react-icons/ri'

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)    return 'now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}

function fmtTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}

function Avatar({ user, size = 40 }) {
  const src = user?.avatar_url
    ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'U')}&background=1a1a1a&color=888`
  return (
    <img
      src={src} alt={user?.name ?? ''}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Inbox({ conversations: initialConvs = [] }) {
  const { auth }  = usePage().props
  const pageUrl   = usePage().url

  const [conversations,  setConversations]  = useState(initialConvs)
  const [convSearch,     setConvSearch]     = useState('')   // sidebar search
  const [userSearch,     setUserSearch]     = useState('')   // search users to start new chat
  const [userResults,    setUserResults]    = useState([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [active,         setActive]         = useState(null)
  const [messages,       setMessages]       = useState([])
  const [msgSearch,      setMsgSearch]      = useState('')   // search inside chat
  const [msgSearchOpen,  setMsgSearchOpen]  = useState(false)
  const [body,           setBody]           = useState('')
  const [sending,        setSending]        = useState(false)
  const [loadingMsgs,    setLoadingMsgs]    = useState(false)
  const [starting,       setStarting]       = useState(false)

  const bottomRef  = useRef(null)
  const channelRef = useRef(null)
  const inputRef   = useRef(null)
  const userSearchRef = useRef(null)

  // ── Auto-open from ?user= param ──────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(pageUrl.split('?')[1] ?? '')
    const userId = params.get('user')
    if (!userId || !auth?.user) return
    setStarting(true)
    axios.post('/api/conversations', { user_id: parseInt(userId) })
      .then(({ data }) => {
        setConversations(prev => prev.find(c => c.id === data.id) ? prev : [data, ...prev])
        setActive(data)
        window.history.replaceState({}, '', '/inbox')
      })
      .catch(() => {})
      .finally(() => setStarting(false))
  }, [])

  // ── Load messages when active conversation changes ────────────────────────
  useEffect(() => {
    if (!active) return
    setLoadingMsgs(true)
    setMessages([])
    setMsgSearch('')
    setMsgSearchOpen(false)

    axios.get(`/api/conversations/${active.id}/messages`)
      .then(r => {
        // Controller now returns array directly (no pagination wrapper needed)
        const data = r.data
        const arr  = Array.isArray(data) ? data : (data.data ?? [])
        setMessages(arr)
      })
      .finally(() => {
        setLoadingMsgs(false)
        setTimeout(() => inputRef.current?.focus(), 100)
      })

    // Mark as read in local state
    setConversations(prev =>
      prev.map(c => c.id === active.id ? { ...c, unread_count: 0 } : c)
    )

    if (window.Echo) {
      channelRef.current?.unsubscribe()
      channelRef.current = window.Echo
        .private(`conversation.${active.id}`)
        .listen('MessageSent', (e) => {
          setMessages(prev => [...prev, e.message])
          setConversations(prev =>
            prev.map(c => c.id === active.id
              ? { ...c, last_message: e.message }
              : c
            )
          )
        })
    }
    return () => channelRef.current?.unsubscribe()
  }, [active?.id])

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    if (!msgSearch) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, msgSearch])

  // ── Search users (debounced) ──────────────────────────────────────────────
  useEffect(() => {
    if (!userSearch.trim()) { setUserResults([]); return }
    const t = setTimeout(async () => {
      setSearchingUsers(true)
      try {
        const { data } = await axios.get('/api/users/search', { params: { q: userSearch } })
        setUserResults(data)
      } catch { setUserResults([]) }
      finally { setSearchingUsers(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [userSearch])

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e.preventDefault()
    if (!body.trim() || !active || sending) return
    setSending(true)

    const optimistic = {
      id:         `opt-${Date.now()}`,
      sender_id:  auth.user.id,
      body:       body.trim(),
      created_at: new Date().toISOString(),
      _optimistic: true,
      sender: auth.user,
    }
    setMessages(prev => [...prev, optimistic])
    setBody('')

    try {
      const { data } = await axios.post(`/api/conversations/${active.id}/messages`, { body: optimistic.body })
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m))
      setConversations(prev => {
        const updated = prev.map(c =>
          c.id === active.id ? { ...c, last_message: data, unread_count: 0 } : c
        )
        const found = updated.find(c => c.id === active.id)
        return [found, ...updated.filter(c => c.id !== active.id)]
      })
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }

  // ── Start conversation from user search ───────────────────────────────────
  const startConversation = async (user) => {
    setUserSearch('')
    setUserResults([])
    setStarting(true)
    try {
      const { data } = await axios.post('/api/conversations', { user_id: user.id })
      setConversations(prev => prev.find(c => c.id === data.id) ? prev : [data, ...prev])
      setActive(data)
    } catch {}
    finally { setStarting(false) }
  }

  const otherUser = useCallback((conv) =>
    conv?.participants?.find(p => p.id !== auth?.user?.id),
  [auth?.user?.id])

  // ── Filtered conversations (sidebar search) ───────────────────────────────
  const filteredConvs = convSearch.trim()
    ? conversations.filter(c => {
        const other = otherUser(c)
        return other?.name?.toLowerCase().includes(convSearch.toLowerCase())
            || other?.username?.toLowerCase().includes(convSearch.toLowerCase())
      })
    : conversations

  // ── Filtered messages (in-chat search) ────────────────────────────────────
  const filteredMsgs = msgSearch.trim()
    ? messages.filter(m => m.body?.toLowerCase().includes(msgSearch.toLowerCase()))
    : messages

  // ── Message grouping helpers ──────────────────────────────────────────────
  const isMine = (msg) => msg.sender_id === auth?.user?.id
  const showAvatar = (msgs, i) => {
    if (isMine(msgs[i])) return false
    return msgs[i + 1]?.sender_id !== msgs[i].sender_id
  }
  const isFirst = (msgs, i) => i === 0 || msgs[i - 1]?.sender_id !== msgs[i].sender_id
  const isLast  = (msgs, i) => i === msgs.length - 1 || msgs[i + 1]?.sender_id !== msgs[i].sender_id

  return (
    <>
      <Head title="Inbox" />

      <style>{`
        .msg-bubble { max-width: 72%; word-break: break-word; }
        .conv-item:hover { background: rgba(255,255,255,0.03); }
        .conv-item.active { background: rgba(255,255,255,0.06); }
        input::placeholder { color: rgba(255,255,255,0.25); }
        .search-inp { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 999px; color: #fff; font-size: 13px; outline: none; padding: 9px 14px 9px 36px; width: 100%; transition: border-color 0.2s; }
        .search-inp:focus { border-color: rgba(255,92,0,0.5); }
      `}</style>

      <div style={{ height: '100%', display: 'flex', background: '#0a0a0a', overflow: 'hidden', minHeight: '100dvh' }}>

        {/* ══ SIDEBAR ══════════════════════════════════════════════════ */}
        <div style={{
          display: active ? 'none' : 'flex',
          flexDirection: 'column',
          width: '100%',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          background: '#0d0d0d',
        }}
        className="md:flex md:w-[340px]"
        >
          {/* Header */}
          <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>
                Messages
              </h1>
              {starting && (
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#ff5c00', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              )}
            </div>

            {/* Search users to start new chat */}
            <div style={{ position: 'relative' }}>
              <RiSearchLine size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                ref={userSearchRef}
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search people..."
                className="search-inp"
              />
              {userSearch && (
                <button onClick={() => { setUserSearch(''); setUserResults([]) }}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
                  <RiCloseLine size={14} />
                </button>
              )}
            </div>

            {/* User search results dropdown */}
            {(userResults.length > 0 || searchingUsers) && (
              <div style={{ marginTop: 8, background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                {searchingUsers && (
                  <div style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Searching...</div>
                )}
                {userResults.map(user => (
                  <button key={user.id} onClick={() => startConversation(user)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    className="conv-item"
                  >
                    <Avatar user={user} size={36} />
                    <div>
                      <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{user.name}</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Filter existing convs */}
            {!userSearch && conversations.length > 3 && (
              <div style={{ position: 'relative', marginTop: 8 }}>
                <RiSearchLine size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  value={convSearch}
                  onChange={e => setConvSearch(e.target.value)}
                  placeholder="Filter conversations..."
                  className="search-inp"
                />
              </div>
            )}
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
            {filteredConvs.length === 0 && !starting && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, padding: '0 32px', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RiChat1Line size={24} color="rgba(255,255,255,0.2)" />
                </div>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: 0 }}>No conversations</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                  Search for someone above to start chatting.
                </p>
              </div>
            )}

            {filteredConvs.map(conv => {
              const other    = otherUser(conv)
              const isActive = active?.id === conv.id
              const unread   = conv.unread_count ?? 0
              return (
                <button
                  key={conv.id}
                  onClick={() => setActive(conv)}
                  className={`conv-item ${isActive ? 'active' : ''}`}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'left' }}
                >
                  {/* Avatar with unread badge */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar user={other} size={48} />
                    {unread > 0 && (
                      <div style={{
                        position: 'absolute', top: -2, right: -2,
                        minWidth: 18, height: 18, borderRadius: 999,
                        background: '#ff5c00', border: '2px solid #0d0d0d',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800, color: '#fff', padding: '0 4px',
                      }}>
                        {unread > 99 ? '99+' : unread}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                      <p style={{ color: '#fff', fontSize: 14, fontWeight: unread > 0 ? 700 : 600, margin: 0, truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {other?.name}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, flexShrink: 0, margin: 0 }}>
                        {timeAgo(conv.last_message?.created_at)}
                      </p>
                    </div>
                    <p style={{
                      color: unread > 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
                      fontSize: 12, margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontWeight: unread > 0 ? 500 : 400,
                    }}>
                      {conv.last_message?.sender_id === auth?.user?.id ? 'You: ' : ''}
                      {conv.last_message?.body ?? 'Say hello!'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ══ CHAT PANEL ════════════════════════════════════════════════ */}
        <div style={{
          flex: 1, display: active ? 'flex' : 'none', flexDirection: 'column', minWidth: 0, background: '#0a0a0a',
        }}
        className="md:flex"
        >
          {!active ? (
            /* Desktop empty state */
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RiChat1Line size={32} color="rgba(255,255,255,0.2)" />
              </div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: 0 }}>Your messages</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, margin: 0 }}>Select a conversation or search for someone.</p>
            </div>
          ) : (
            <>
              {/* ── Chat header ─────────────────────────────────────── */}
              {(() => {
                const other = otherUser(active)
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
                    {/* Back (mobile) */}
                    <button onClick={() => setActive(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 4 }}
                      className="md:hidden"
                    >
                      <RiArrowLeftLine size={20} />
                    </button>

                    {/* User info — clicking goes to profile */}
                    <button onClick={() => router.visit(`/@${other?.username}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <Avatar user={other} size={38} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{other?.name}</p>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0 }}>@{other?.username}</p>
                      </div>
                    </button>

                    {/* Search messages icon */}
                    <button
                      onClick={() => setMsgSearchOpen(o => !o)}
                      style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: msgSearchOpen ? 'rgba(255,92,0,0.15)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${msgSearchOpen ? 'rgba(255,92,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
                      }}
                    >
                      <RiSearchLine size={16} color={msgSearchOpen ? '#ff5c00' : 'rgba(255,255,255,0.5)'} />
                    </button>
                  </div>
                )
              })()}

              {/* ── Message search bar (expandable) ──────────────────── */}
              {msgSearchOpen && (
                <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0d0d0d', flexShrink: 0 }}>
                  <div style={{ position: 'relative' }}>
                    <RiSearchLine size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      autoFocus
                      value={msgSearch}
                      onChange={e => setMsgSearch(e.target.value)}
                      placeholder="Search in conversation..."
                      className="search-inp"
                    />
                    {msgSearch && (
                      <span style={{ position: 'absolute', right: 36, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                        {filteredMsgs.length} result{filteredMsgs.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {msgSearch && (
                      <button onClick={() => setMsgSearch('')}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
                        <RiCloseLine size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Messages ──────────────────────────────────────────── */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {loadingMsgs && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                    <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#ff5c00', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                )}

                {!loadingMsgs && filteredMsgs.length === 0 && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '48px 0' }}>
                    {msgSearch
                      ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No messages matching "{msgSearch}"</p>
                      : <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No messages yet — say hello!</p>
                    }
                  </div>
                )}

                {filteredMsgs.map((msg, i) => {
                  const mine     = isMine(msg)
                  const first    = isFirst(filteredMsgs, i)
                  const last     = isLast(filteredMsgs, i)
                  const showAv   = showAvatar(filteredMsgs, i)
                  const highlight = msgSearch && msg.body?.toLowerCase().includes(msgSearch.toLowerCase())

                  // Border radius logic: group consecutive messages
                  const baseR = 18
                  const myBR  = mine
                    ? `${baseR}px ${first ? baseR : 4}px ${last ? baseR : 4}px ${baseR}px`
                    : `${first ? baseR : 4}px ${baseR}px ${baseR}px ${last ? baseR : 4}px`

                  return (
                    <div key={msg.id} style={{
                      display: 'flex', alignItems: 'flex-end', gap: 8,
                      justifyContent: mine ? 'flex-end' : 'flex-start',
                      marginTop: first ? 8 : 0,
                    }}>
                      {/* Avatar (other side only) */}
                      {!mine && (
                        <div style={{ width: 28, flexShrink: 0 }}>
                          {showAv && <Avatar user={otherUser(active)} size={28} />}
                        </div>
                      )}

                      <div className="msg-bubble" style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: 2 }}>
                        <div style={{
                          padding: '9px 14px',
                          background: mine
                            ? (highlight ? '#e85200' : '#ff5c00')
                            : (highlight ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'),
                          border: mine ? 'none' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: myBR,
                          color: '#fff',
                          fontSize: 14,
                          lineHeight: 1.5,
                          opacity: msg._optimistic ? 0.6 : 1,
                          transition: 'opacity 0.2s',
                          boxShadow: mine ? '0 2px 12px rgba(255,92,0,0.2)' : 'none',
                        }}>
                          {msg.body}
                        </div>

                        {/* Timestamp + read receipt (only on last of group) */}
                        {last && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, paddingLeft: mine ? 0 : 4, paddingRight: mine ? 4 : 0 }}>
                            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
                              {fmtTime(msg.created_at)}
                            </span>
                            {mine && (
                              msg._optimistic
                                ? <RiCheckLine size={11} color="rgba(255,255,255,0.25)" />
                                : <RiCheckDoubleLine size={11} color={msg.read_at ? '#ff5c00' : 'rgba(255,255,255,0.3)'} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* ── Input ────────────────────────────────────────────── */}
              <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0d0d0d' }}>
                <form onSubmit={sendMessage} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '0 14px', gap: 8, transition: 'border-color 0.2s' }}
                    onFocus={() => {}} // handled via CSS
                  >
                    {<input
                      ref={inputRef}
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(e)}
                      placeholder="Message..."
                      maxLength={1000}
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 14, padding: '11px 0' }}
                    />}
                    {body.length > 800 && (
                      <span style={{ color: body.length >= 1000 ? '#ff3b5c' : 'rgba(255,255,255,0.25)', fontSize: 10, flexShrink: 0 }}>
                        {1000 - body.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!body.trim() || sending}
                    style={{
                      width: 42, height: 42, borderRadius: '50%',
                      background: body.trim() ? '#ff5c00' : 'rgba(255,255,255,0.08)',
                      border: 'none', cursor: body.trim() ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'background 0.2s, transform 0.1s',
                      transform: sending ? 'scale(0.9)' : 'scale(1)',
                    }}
                  >
                    <RiSendPlaneFill size={17} color={body.trim() ? '#fff' : 'rgba(255,255,255,0.25)'} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  )
}

Inbox.layout = page => <AppLayout>{page}</AppLayout>