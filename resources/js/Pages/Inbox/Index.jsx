import { useState, useEffect, useRef } from 'react'
import { Head, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'

export default function Inbox({ conversations: initialConvs = [] }) {
  const { auth } = usePage().props
  const [conversations, setConversations] = useState(initialConvs)
  const [active,        setActive]        = useState(null)
  const [messages,      setMessages]      = useState([])
  const [body,          setBody]          = useState('')
  const [sending,       setSending]       = useState(false)
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const bottomRef  = useRef(null)
  const channelRef = useRef(null)

  // ── Load messages when conversation selected ─────────────────────────────
  useEffect(() => {
    if (!active) return
    setLoadingMsgs(true)
    axios.get(`/api/conversations/${active.id}/messages`)
      .then(r => setMessages(r.data.data))
      .finally(() => setLoadingMsgs(false))

    // Subscribe to Reverb/Pusher channel
    if (window.Echo) {
      channelRef.current?.unsubscribe()
      channelRef.current = window.Echo
        .private(`conversation.${active.id}`)
        .listen('MessageSent', (e) => {
          setMessages(prev => [...prev, e.message])
        })
    }
    return () => channelRef.current?.unsubscribe()
  }, [active?.id])

  // ── Scroll to bottom on new message ──────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!body.trim() || !active || sending) return
    setSending(true)
    const optimistic = {
      id: Date.now(),
      sender_id: auth.user.id,
      body: body.trim(),
      created_at: new Date().toISOString(),
      _optimistic: true,
    }
    setMessages(prev => [...prev, optimistic])
    setBody('')
    try {
      const { data } = await axios.post(`/api/conversations/${active.id}/messages`, {
        body: optimistic.body,
      })
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m))
      // Bump conversation to top
      setConversations(prev => {
        const updated = prev.map(c => c.id === active.id ? { ...c, last_message: data, unread_count: 0 } : c)
        return [updated.find(c => c.id === active.id), ...updated.filter(c => c.id !== active.id)]
      })
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }

  const otherUser = (conv) => conv.participants?.find(p => p.id !== auth?.user?.id)

  return (
    <>
      <Head title="Inbox" />
      <div className="h-screen flex bg-flockr-black overflow-hidden">

        {/* ── Sidebar: conversation list ───────────────────────────── */}
        <div className={`${active ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-white/[0.06] shrink-0`}>
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h1 className="font-display font-bold text-white text-xl">Inbox</h1>
          </div>
          <div className="flex-1 overflow-y-auto scroll-hidden divide-y divide-white/[0.04]">
            {conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
                <span className="text-4xl">💬</span>
                <p className="text-white font-semibold">No conversations yet</p>
                <p className="text-flockr-muted text-xs">Message a seller from any product or video page.</p>
              </div>
            )}
            {conversations.map(conv => {
              const other = otherUser(conv)
              const isActive = active?.id === conv.id
              return (
                <button
                  key={conv.id}
                  onClick={() => setActive(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.03] transition-colors ${isActive ? 'bg-white/[0.04]' : ''}`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={other?.avatar_url ?? `https://ui-avatars.com/api/?name=${other?.name}&background=1a1a1a`}
                      alt={other?.name}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-flockr-orange rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-white text-sm font-semibold truncate">{other?.name}</p>
                      <p className="text-flockr-subtle text-[11px] shrink-0 ml-2">
                        {conv.last_message ? timeAgo(conv.last_message.created_at) : ''}
                      </p>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? 'text-white font-medium' : 'text-flockr-muted'}`}>
                      {conv.last_message?.sender_id === auth?.user?.id ? 'You: ' : ''}
                      {conv.last_message?.body ?? 'Start a conversation'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Chat panel ───────────────────────────────────────────── */}
        <div className={`${!active ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0`}>
          {!active ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <span className="text-5xl">💬</span>
                <p className="text-white font-display font-bold text-lg">Select a conversation</p>
                <p className="text-flockr-muted text-sm">Choose a chat from the left to start messaging.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.06] shrink-0 glass-dark">
                <button onClick={() => setActive(null)} className="md:hidden p-1.5 rounded-full hover:bg-white/[0.06] text-flockr-muted">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                </button>
                {(() => { const other = otherUser(active); return (
                  <div className="flex items-center gap-3">
                    <img
                      src={other?.avatar_url ?? `https://ui-avatars.com/api/?name=${other?.name}&background=1a1a1a`}
                      alt={other?.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-white font-semibold text-sm">{other?.name}</p>
                      <p className="text-flockr-muted text-xs">@{other?.username}</p>
                    </div>
                  </div>
                )})()}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto scroll-hidden px-5 py-4 space-y-3">
                {loadingMsgs && Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? '' : 'justify-end'}`}>
                    <div className={`skeleton h-10 rounded-2xl ${i % 2 === 0 ? 'w-3/5' : 'w-2/5'}`} />
                  </div>
                ))}

                {messages.map((msg, i) => {
                  const isMine = msg.sender_id === auth?.user?.id
                  const showAvatar = !isMine && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id)
                  const other = otherUser(active)
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {!isMine && (
                        <div className="w-7 h-7 shrink-0">
                          {showAvatar && (
                            <img src={other?.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                          )}
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMine
                            ? 'bg-flockr-orange text-white rounded-br-sm'
                            : 'bg-flockr-card text-white border border-white/[0.06] rounded-bl-sm'
                        } ${msg._optimistic ? 'opacity-70' : ''}`}
                      >
                        {msg.body}
                        <div className={`text-[10px] mt-1 ${isMine ? 'text-white/50' : 'text-flockr-subtle'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                          {isMine && <span className="ml-1">✓</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Message input */}
              <div className="shrink-0 px-4 py-3 border-t border-white/[0.06] pb-safe">
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                  <input
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Type a message..."
                    className="input-flockr flex-1 py-2.5"
                    maxLength={1000}
                  />
                  <button
                    type="submit"
                    disabled={!body.trim() || sending}
                    className="w-10 h-10 rounded-full bg-flockr-orange flex items-center justify-center shrink-0 disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    {sending
                      ? <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      : <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/></svg>
                    }
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

Inbox.layout = page => <AppLayout>{page}</AppLayout>

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)   return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}
