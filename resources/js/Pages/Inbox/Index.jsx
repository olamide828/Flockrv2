import { useState, useEffect, useRef, useCallback } from 'react'
import { Head, usePage, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'
import {
  RiSendPlaneFill, RiArrowLeftLine, RiChat1Line,
  RiCheckDoubleLine, RiCheckLine, RiSearchLine,
  RiCloseLine, RiMoreLine, RiAlertLine, RiProhibitedLine, RiBellLine,
} from 'react-icons/ri'
import OffPlatformWarningSheet from '@/Components/Chat/OffPlatformWarningSheet'
import PayWithFlockrSheet from '@/Components/Chat/PayWithFlockrSheet'
import MentionAutocomplete from '@/Components/Chat/MentionAutocomplete'
import MessageRequestSheet from '@/Components/Chat/MessageRequestSheet'
import ConversationStartCard from '@/Components/Chat/ConversationStartCard'
import ChatBackgroundAnimation from '@/Components/Chat/ChatBackgroundAnimation'
import ThemePickerModal from '@/Components/Chat/ThemePickerModal'
import ProPlansSheet from '@/Components/ProPlansSheet'

// ── Off-platform payment detection: layer 1 — keyword regex (free, instant) ───
const OFF_PLATFORM_KEYWORDS = [
  'account number', 'acct no', 'acc no', 'account no', 'bank transfer',
  'pay me directly', 'pay directly', 'pay you directly', 'whatsapp me',
  'whatsapp number', 'my whatsapp', 'send money', 'outside flockr',
  'off flockr', 'off-platform', 'off platform', 'zelle', 'venmo',
  'cash app', 'cashapp', 'wire transfer', 'bank details', 'sort code',
  'iban', 'paypal', 'moniepoint', 'opay', 'palmpay', 'kuda bank',
  'transfer directly', "don't use flockr", 'skip flockr', 'avoid the fee',
  'cash on delivery', 'western union', 'money gram', 'moneygram',
  'bitcoin', 'crypto payment', 'gift card', 'send the money',
  'my number is', 'call me on', 'text me on', 'send aza', 'aza',
  'where should i make payment to', 'where should i make payment to?',
  'where can i send money to', 'where can i send money to?', 'send me your details',

  'account details', 'acct details', 'acct number', 'acc details', 'bank account',
  'account name', 'acct name', 'bank name', 'routing number', 'swift code',
  'fairmoney', 'vfd', 'access bank', 'gtb', 'zenith', 'first bank',
  'fcmb', 'wema', 'alat', 'drop aza', 'send your aza', 'drop your account',
  'drop acct', 'drop account', 'send account', 'send acct', 'drop your details',
  'send details', 'make transfer', 'direct transfer', 'do transfer', 'wire me',
  'bypass fee', 'save on fee', 'save fees', 'platform fee', 'flockr fee',
  'without fee', 'no commission', 'cheaper outside', 'cheaper if you pay',
  'discount if direct', 'pay outside', 'pay off app', 'off the app', 'take it off',
  'reach me on', 'dm me on', 'ig dm', 'check instagram', 'my ig',
  'my instagram', 'hit me on', 'send ur details', 'send your details',
  'send your account details', 'send ur account details',
]
const OFF_PLATFORM_REGEX = new RegExp(
  '\\b(' + OFF_PLATFORM_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
  'i'
)

function normalizeForDetection(text) {
  if (!text) return ''
  let t = text.toLowerCase()


  const leetMap = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' }
  t = t.replace(/[013457@$]/g, ch => leetMap[ch] ?? ch)

  t = t.replace(/\b(?:[a-z][\s._-]){2,}[a-z]\b/g, match => match.replace(/[\s._-]/g, ''))


  t = t.replace(/([a-z])\1{2,}/g, '$1')

  return t
}

function detectOffPlatformKeyword(text) {
  if (!text) return null
  const direct = text.match(OFF_PLATFORM_REGEX)
  if (direct) return direct[0]

  const normalized = normalizeForDetection(text)
  const normMatch = normalized.match(OFF_PLATFORM_REGEX)
  return normMatch ? `${normMatch[0]} (obfuscated)` : null
}


// ── Layer 2 — soft signal gate for the AI classifier. ─────────────────────────
const SOFT_SIGNAL_WORDS = [
  'pay', 'payment', 'send', 'transfer', 'account', 'bank', 'whatsapp',
  'instagram', 'telegram', 'number', 'cash', 'fee', 'commission',
  'direct', 'outside', 'off', 'app', 'details', 'wallet', 'crypto',
]


function hasSoftSignal(text) {
  if (!text) return false
  if (/\d{6,}/.test(text)) return true

  const lower = text.toLowerCase()
  if (SOFT_SIGNAL_WORDS.some(w => lower.includes(w))) return true

  const normalized = normalizeForDetection(text)
  return SOFT_SIGNAL_WORDS.some(w => normalized.includes(w))
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)    return 'now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}

function lastSeenText(lastSeenAt, isOnline) {
  if (isOnline) return 'Online'
  if (!lastSeenAt) return 'Offline'
  const diff = (Date.now() - new Date(lastSeenAt)) / 1000
  if (diff < 60)    return 'Last seen just now'
  if (diff < 3600)  return `Last seen ${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `Last seen ${Math.floor(diff / 3600)}h ago`
  return `Last seen ${new Date(lastSeenAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}`
}

function fmtTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })
}

function dotStyle(i) {
    return {
        display: 'inline-block',
        width: 7, height: 7,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.5)',
        animation: `typingDot 1.2s ease-in-out infinite`,
        animationDelay: `${i * 0.2}s`,
    }
}

// ── Avatar — shows question mark placeholder for blocked users ────────────────
function Avatar({ user, size = 40, showStatus = false, isBlocked = false }) {
  const [err, setErr] = useState(false)
  const src = (!err && !isBlocked && user?.avatar_url) ? user.avatar_url : null
  const isOnline = user?.is_online

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {src
        ? <img src={src} alt={user?.name ?? ''} onError={() => setErr(true)}
            style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
        : <div style={{
            width: size, height: size, borderRadius: '50%',
            background: isBlocked ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#ff5c00,#ff8c00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isBlocked ? 'rgba(255,255,255,0.3)' : '#fff',
            fontWeight: 700, fontSize: size * 0.4,
            border: isBlocked ? '1px solid rgba(255,255,255,0.1)' : 'none',
          }}>
            {isBlocked ? '?' : (user?.name ?? 'U')[0].toUpperCase()}
          </div>
      }
      {showStatus && !isBlocked && (
        <span style={{
          position: 'absolute', bottom: 1, right: 1,
          width: size * 0.28, height: size * 0.28, borderRadius: '50%',
          background: isOnline ? '#10B981' : '#6B7280',
          border: `2px solid #0a0a0a`,
        }} />
      )}
    </div>
  )
}

// ── Report Modal ──────────────────────────────────────────────────────────────
function ReportModal({ user, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const REASONS = [
    'Spam or misleading content',
    'Harassment or bullying',
    'Hate speech or discrimination',
    'Scam or fraud',
    'Inappropriate content',
    'Other',
  ]

  const handleSubmit = async () => {
    if (!reason) return
    setSubmitting(true)
    try { await onSubmit(reason); setDone(true); }
    catch { alert('Failed to submit report. Try again.') }
    finally { setSubmitting(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
          <RiArrowLeftLine size={20} />
        </button>
        <div>
          <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: 0 }}>Report Conversation</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '2px 0 0' }}>@{user?.username}</p>
        </div>
      </div>
      <div style={{ flex: 1, padding: '24px 20px', maxWidth: 480, width: '100%', margin: '0 auto' }}>
        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RiCheckLine size={28} color="#10B981" />
            </div>
            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>Report Submitted</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>Thank you. Our team will review this report.</p>
            <button onClick={onClose} style={{ marginTop: 8, padding: '12px 32px', background: '#ff5c00', border: 'none', borderRadius: 999, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>Your report is anonymous and your chat history will be reviewed by our team.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, cursor: 'pointer', background: reason === r ? 'rgba(255,92,0,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${reason === r ? 'rgba(255,92,0,0.4)' : 'rgba(255,255,255,0.08)'}`, color: reason === r ? '#ff5c00' : '#fff', fontSize: 14, fontWeight: reason === r ? 600 : 400, textAlign: 'left' }}>
                  {r}
                  {reason === r && <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#ff5c00', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><RiCheckLine size={12} color="#fff" /></div>}
                </button>
              ))}
            </div>
            <button onClick={handleSubmit} disabled={!reason || submitting} style={{ width: '100%', marginTop: 28, padding: '15px', background: reason ? '#ff5c00' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 999, color: reason ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: 700, cursor: reason ? 'pointer' : 'default', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Chat context menu (block + report) ────────────────────────────────────────
function ChatMenu({ isBlocked, onBlock, onReport, onClose, onAnimation }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
      <div style={{ position: 'absolute', top: 44, right: 0, width: 180, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
        <button onClick={onAnimation} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
    <RiVipDiamondLine size={16} color="rgba(255,255,255,0.5)" /> Animation
</button>
        <button onClick={onReport} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <RiAlertLine size={16} color="rgba(255,255,255,0.5)" /> Report
        </button>
        <button onClick={onBlock} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: isBlocked ? '#10B981' : '#EF4444', fontSize: 13, fontWeight: 500 }}>
          <RiProhibitedLine size={16} color={isBlocked ? '#10B981' : '#EF4444'} />
          {isBlocked ? 'Unblock' : 'Block'}
        </button>
      </div>
    </>
  )
}


function renderMessageBody(text) {
    const parts = text.split(/(@[a-zA-Z0-9_.]+)/g)
    return parts.map((part, i) =>
        part.startsWith('@')
            ? <span key={i} style={{ color: '#FF6B35', fontWeight: 700 }}>{part}</span>
            : part
    )
}

// ── Main Inbox ────────────────────────────────────────────────────────────────
export default function Inbox({ conversations: initialConvs = [], blockedByMeIds = [], blockedByOtherIds = [] }) {
  const { auth } = usePage().props
  const pageUrl  = usePage().url

  const [conversations,  setConversations]  = useState(initialConvs)
  const [convSearch,     setConvSearch]     = useState('')
  const [userSearch,     setUserSearch]     = useState('')
  const [userResults,    setUserResults]    = useState([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [active,         setActive]         = useState(null)
  const [messages,       setMessages]       = useState([])
  const [msgSearch,      setMsgSearch]      = useState('')
  const [msgSearchOpen,  setMsgSearchOpen]  = useState(false)
  const [body,           setBody]           = useState('')
  const [sending,        setSending]        = useState(false)
  const [loadingMsgs,    setLoadingMsgs]    = useState(false)
  const [starting,       setStarting]       = useState(false)
  const [showMenu,       setShowMenu]       = useState(false)
  const [reportTarget,   setReportTarget]   = useState(null)
  const [notifUnread, setNotifUnread]   = useState(false)
const [latestNotif, setLatestNotif]   = useState(null)
const typingTimeoutRef = useRef(null)
const lastTypingSentRef = useRef(0)
const [typingUsers, setTypingUsers] = useState({})
const [mentionStart, setMentionStart] = useState(null)
const [mentionQuery, setMentionQuery] = useState(null)
const [showRequestSheet, setShowRequestSheet] = useState(false)
const [myChatTheme, setMyChatTheme] = useState(auth?.user?.chat_theme ?? 'off')
const [showThemePicker, setShowThemePicker] = useState(false)
const [showProSheet, setShowProSheet] = useState(false)

const canUsePro = auth?.user?.role === 'seller' && auth?.user?.is_subscriber

// ── Off-platform payment safety ────────────────────────────────────────────
const [showWarningSheet, setShowWarningSheet]   = useState(false)
const [warningKeyword, setWarningKeyword]       = useState(null)
const [sellerInfoCache, setSellerInfoCache]     = useState({})
const [continuedCounts, setContinuedCounts]     = useState({})
const [bannerConversations, setBannerConversations] = useState({})
const [showPayFlockrSheet, setShowPayFlockrSheet]   = useState(false)
const [payFlockrSeller, setPayFlockrSeller]         = useState(null)
const scannedMsgIdsRef = useRef(new Set())


const handleFollowFromChat = async () => {
    const other = otherUser(active)
    if (!other) return
    setActive(prev => ({ ...prev, participants: prev.participants.map(p => p.id === other.id ? { ...p, i_follow_them: true } : p) }))
    setConversations(prev => prev.map(c => c.id === active.id ? { ...c, participants: c.participants.map(p => p.id === other.id ? { ...p, i_follow_them: true } : p) } : c))
    try {
        await axios.post(`/api/users/${other.id}/follow`)
    } catch {
        setActive(prev => ({ ...prev, participants: prev.participants.map(p => p.id === other.id ? { ...p, i_follow_them: false } : p) }))
        showToast('Failed to follow. Try again.', 'error')
    }
}

const resolveActiveTheme = () => {
    const other = otherUser(active)
    if (other?.role === 'seller' && other?.has_active_subscription_flag && other?.chat_theme && other.chat_theme !== 'off') {
        return other.chat_theme
    }
    return myChatTheme
}

const broadcastTyping = () => {
    if (!active || !window.Echo) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < 2000) return
    lastTypingSentRef.current = now
    try {
        window.Echo.private(`conversation.${active.id}`)
            .whisper('typing', { user_id: auth.user.id })
    } catch {}
}

  const [blockedByMe,    setBlockedByMe]    = useState(() => {
    const m = {}; blockedByMeIds.forEach(id => { m[id] = true }); return m
  })
  const [blockedByOther, setBlockedByOther] = useState(() => {
    const m = {}; blockedByOtherIds.forEach(id => { m[id] = true }); return m
  })

  const bottomRef  = useRef(null)
  const channelRef = useRef(null)
  const inputRef   = useRef(null)

  useEffect(() => {
    if (active) document.body.classList.add('chat-open')
    else        document.body.classList.remove('chat-open')
    return () => document.body.classList.remove('chat-open')
  }, [active])

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

  useEffect(() => {
    if (!auth?.user) return
    axios.get('/api/notifications?limit=1').then(({ data }) => {
        setNotifUnread(data.unread_count > 0)
        setLatestNotif(data.notifications?.[0] ?? null)
    }).catch(() => {})

    const handler = () => setNotifUnread(false)
    window.addEventListener('flockr:notif-read', handler)
    return () => window.removeEventListener('flockr:notif-read', handler)
}, [auth?.user])




useEffect(() => {
    if (!window.Echo || !initialConvs.length) return

    const activeChannels = []

    initialConvs.forEach((conv) => {
        const channel = window.Echo.private(`conversation.${conv.id}`)

        channel.listen('.MessageSent', (e) => {
            setConversations(prev => {
                const updated = prev.map(c => {
                    if (c.id !== conv.id) return c

                    return {
                        ...c,
                        last_message: e.message,
                        unread_count:
                            active?.id === conv.id
                                ? 0
                                : (c.unread_count ?? 0) + 1,
                    }
                })

                const found = updated.find(c => c.id === conv.id)

                return [
                    found,
                    ...updated.filter(c => c.id !== conv.id),
                ]
            })

            if (active?.id === conv.id) {
                setMessages(prev => {
                    if (prev.some(m => m.id === e.message.id)) {
                        return prev
                    }

                    const optimisticIndex = prev.findIndex(
                        m =>
                            String(m.id).startsWith('opt-') &&
                            m.body === e.message.body &&
                            m.sender_id === e.message.sender_id
                    )

                    if (optimisticIndex !== -1) {
                        const copy = [...prev]
                        copy[optimisticIndex] = e.message
                        return copy
                    }

                    return [...prev, e.message]
                })
                axios.post(`/api/conversations/${conv.id}/mark-read`).catch(() => {})
            }
        })

        channel.listenForWhisper('typing', (e) => {
            if (e.user_id === auth.user.id) return

            setTypingUsers(prev => ({
                ...prev,
                [conv.id]: true,
            }))

            setTimeout(() => {
                setTypingUsers(prev => ({
                    ...prev,
                    [conv.id]: false,
                }))
            }, 2000)
        })

        activeChannels.push(channel)
    })

    return () => {
        activeChannels.forEach(channel => {
            channel.stopListening('.MessageSent')
        })
    }
}, [active?.id])

useEffect(() => {
    if (!active) return

    setLoadingMsgs(true)
    setMessages([])
    setMsgSearch('')
    setMsgSearchOpen(false)

    axios.get(`/api/conversations/${active.id}/messages`)
        .then(({ data }) => {
            const msgs = Array.isArray(data)
                ? data
                : (data.data ?? [])

            setMessages(msgs)

            setConversations(prev =>
                prev.map(c =>
                    c.id === active.id
                        ? { ...c, unread_count: 0 }
                        : c
                )
            )
        })
        .catch(() => {
            setMessages([])
        })
        .finally(() => {
            setLoadingMsgs(false)

            setTimeout(() => {
                inputRef.current?.focus()
            }, 100)
        })
}, [active?.id])

useEffect(() => {
    window.__flockrActiveConversationId = active?.id ?? null
    return () => { window.__flockrActiveConversationId = null }
}, [active?.id])

  useEffect(() => {
    if (!msgSearch) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, msgSearch])

  // Hydrate the off-platform banner/continued-count for this conversation.
  useEffect(() => {
    if (!active) return
    axios.get(`/api/safety/conversations/${active.id}/status`)
      .then(({ data }) => {
        setContinuedCounts(prev => ({ ...prev, [active.id]: data.continued_count }))
        if (data.show_banner) {
          setBannerConversations(prev => ({ ...prev, [active.id]: true }))
        }
      })
      .catch(() => {})
  }, [active?.id])

  const otherUser = useCallback((conv) =>
    conv?.participants?.find(p => p.id !== auth?.user?.id),
  [auth?.user?.id])

  // ── Determine who the "buyer" is in this conversation, based on account
  // role — not who sent/received a given message. The buyer is the party who
  // stands to lose money if payment happens off-platform, so warnings should
  // always be shown to the buyer regardless of who typed the risky message.
  // Falls back to "current user" if roles can't be resolved (e.g. two seller
  // accounts messaging each other) so the feature never silently does nothing.
  const participantRoles = useCallback((conv) => {
    const other = otherUser(conv)
    const me = auth?.user
    if (!other || !me) return { buyer: null, seller: null, isMeBuyer: false }

    let buyer, seller
    if (me.role === 'buyer' && other.role !== 'buyer') { buyer = me; seller = other }
    else if (other.role === 'buyer' && me.role !== 'buyer') { buyer = other; seller = me }
    else if (me.role === 'buyer') { buyer = me; seller = other }
    else if (other.role === 'buyer') { buyer = other; seller = me }
    else { buyer = me; seller = other } // ambiguous — default to warning the current viewer

    return { buyer, seller, isMeBuyer: buyer.id === me.id }
  }, [auth?.user, otherUser])

  // Scan the newest message for off-platform payment signals. Only runs at
  // all when the CURRENT viewer is the buyer in this conversation — the
  // warning is about protecting the buyer, so it doesn't matter whether the
  // buyer or the seller typed the risky message, only that the buyer sees it.
  useEffect(() => {
    if (!active || !messages.length) return
    const { isMeBuyer, seller } = participantRoles(active)
    if (!isMeBuyer || !seller) return

    const last = messages[messages.length - 1]
    if (!last?.body || String(last.id).startsWith('opt-') || scannedMsgIdsRef.current.has(last.id)) return
    scannedMsgIdsRef.current.add(last.id)

    const matched = detectOffPlatformKeyword(last.body)
    if (matched) {
      triggerOffPlatformWarning(matched, seller)
      return
    }

    if (hasSoftSignal(last.body)) {
      axios.post('/api/safety/classify-message', { message: last.body })
        .then(({ data }) => {
          if (data?.is_risky && (data.confidence ?? 0) >= 0.55) {
            triggerOffPlatformWarning(data.reason ? `AI: ${data.reason}` : 'AI-detected risk', seller)
          }
        })
        .catch(() => {})
    }
  }, [messages, active, participantRoles])

  useEffect(() => {
    if (!userSearch.trim()) { setUserResults([]); return }
    const t = setTimeout(async () => {
      setSearchingUsers(true)
      try { const { data } = await axios.get('/api/users/search', { params: { q: userSearch } }); setUserResults(data) }
      catch { setUserResults([]) }
      finally { setSearchingUsers(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [userSearch])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!body.trim() || !active || sending) return
    const other = otherUser(active)
    if (other && (blockedByMe[other.id] || blockedByOther[other.id])) return
    setSending(true)
    const optimistic = { id: `opt-${Date.now()}`, sender_id: auth.user.id, body: body.trim(), created_at: new Date().toISOString(), _optimistic: true, sender: auth.user }
    setMessages(prev => [...prev, optimistic])
    setBody('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    try {
      const { data } = await axios.post(`/api/conversations/${active.id}/messages`, { body: optimistic.body })
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m))
      setConversations(prev => {
        const updated = prev.map(c => c.id === active.id ? { ...c, last_message: data, unread_count: 0 } : c)
        const found = updated.find(c => c.id === active.id)
        return [found, ...updated.filter(c => c.id !== active.id)]
      })
      if (active?.is_support) {
    const countAtSend = messages.length + 1
    setTimeout(() => {
        setMessages(curr => {
            if (curr.length <= countAtSend) {
                axios.get(`/api/conversations/${active.id}/messages`)
                    .then(({ data }) => setMessages(Array.isArray(data) ? data : (data.data ?? [])))
                    .catch(() => {})
            }
            return curr
        })
    }, 6000)
}
    } catch (err) {
    setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    if (err.response?.status === 403 && err.response.data?.request_limit_reached) {
        showToast?.(err.response.data.message, 'error')
    }
    } finally { setSending(false) }
  }


const detectMention = (text, cursorPos) => {
    const other = otherUser(active)
    if (!other?.is_flockr_support) { setMentionStart(null); setMentionQuery(null); return }
    const before = text.slice(0, cursorPos)
    const match = before.match(/(?:^|\s)@([a-zA-Z0-9_.]{0,20})$/)
    if (match) {
        setMentionStart(cursorPos - match[1].length - 1)
        setMentionQuery(match[1])
    } else {
        setMentionStart(null)
        setMentionQuery(null)
    }
}

const selectMention = (user) => {
    if (mentionStart === null) return
    const before = body.slice(0, mentionStart)
    const after = body.slice(mentionStart + 1 + (mentionQuery?.length ?? 0))
    setBody(`${before}@${user.username} ${after}`)
    setMentionStart(null)
    setMentionQuery(null)
    inputRef.current?.focus()
}

  const startConversation = async (user) => {
    setUserSearch(''); setUserResults([])
    setStarting(true)
    try {
      const { data } = await axios.post('/api/conversations', { user_id: user.id })
      setConversations(prev => prev.find(c => c.id === data.id) ? prev : [data, ...prev])
      setActive(data)
    } catch {}
    finally { setStarting(false) }
  }

  useEffect(() => {
    if (!active) return
    const other = otherUser(active)
    if (!other || other.is_flockr_support) return
    const iSentAny = messages.some(m => m.sender_id === auth?.user?.id)
    const otherSentAny = messages.some(m => m.sender_id === other.id)
    
    if (!other.i_follow_them && otherSentAny && !iSentAny && !active.request_dismissed) {
        setShowRequestSheet(true)
    }
}, [active?.id, messages.length])

const dismissRequestSheet = () => {
    if (active) {
        axios.post(`/api/conversations/${active.id}/dismiss-request`).catch(() => {})
        setActive(prev => ({ ...prev, request_dismissed: true }))
        setConversations(prev => prev.map(c => c.id === active.id ? { ...c, request_dismissed: true } : c))
    }
    setShowRequestSheet(false)
}

  const handleBlock = async () => {
    const other = otherUser(active)
    if (!other) return
    setShowMenu(false)
    try {
      const { data } = await axios.post(`/api/users/${other.id}/block`)
      setBlockedByMe(prev => ({ ...prev, [other.id]: data.blocked }))
    } catch { alert('Failed. Try again.') }
  }

   const handleReport = async (reason) => {
    const conv  = reportTarget ?? active
    const other = otherUser(conv)
    if (!other || !conv) return

    if (conv?.id) {
      await axios.post(`/api/conversations/${conv.id}/report`, { reason })
    } else {
      await axios.post(`/api/users/${other.id}/report`, { reason })
    }
  }

  // ── Off-platform payment safety handlers ──────────────────────────────────
  const fetchSellerInfo = async (id) => {
    try {
      const { data } = await axios.get(`/api/safety/seller-info/${id}`)
      setSellerInfoCache(prev => ({ ...prev, [id]: { ...prev[id], ...data } }))
      return data
    } catch (err) {
      console.error('[safety] Failed to fetch seller info', err.response?.status, err.response?.data ?? err.message)
      return null
    }
  }

  const triggerOffPlatformWarning = (keyword, seller) => {
    if (!seller || !active) return

    setSellerInfoCache(prev => ({
      ...prev,
      [seller.id]: prev[seller.id] ?? {
        id: seller.id,
        name: seller.name,
        username: seller.username,
        avatar_url: seller.avatar_url,
        is_verified: seller.is_verified,
        joined_at: null,
      },
    }))

    setWarningKeyword(keyword)
    setShowWarningSheet(true)
    fetchSellerInfo(seller.id)

    axios.post('/api/safety/off-platform-warning', {
      conversation_id: active.id,
      seller_id: seller.id,
      action: 'shown',
      trigger_keyword: keyword,
    }).catch(() => {})
  }

  const handleWarningContinue = async () => {
    setShowWarningSheet(false)
    const { seller } = participantRoles(active)
    if (!seller || !active) return
    try {
      const { data } = await axios.post('/api/safety/off-platform-warning', {
        conversation_id: active.id,
        seller_id: seller.id,
        action: 'continued',
        trigger_keyword: warningKeyword,
      })
      setContinuedCounts(prev => ({ ...prev, [active.id]: data.continued_count }))
      if (data.show_banner) {
        setBannerConversations(prev => ({ ...prev, [active.id]: true }))
      }
    } catch {}
  }

  const handleWarningPayFlockr = async () => {
    setShowWarningSheet(false)
    const { seller } = participantRoles(active)
    if (!active) return
    if (seller) {
      axios.post('/api/safety/off-platform-warning', {
        conversation_id: active.id,
        seller_id: seller.id,
        action: 'paid_flockr',
        trigger_keyword: warningKeyword,
      }).catch(() => {})
    }
    setPayFlockrSeller(seller)
    setShowPayFlockrSheet(true)
  }

  const isEffectivelyBlocked = (userId) => !!blockedByMe[userId] || !!blockedByOther[userId]

  const filteredConvs = convSearch.trim()
    ? conversations.filter(c => {
        const other = otherUser(c)
        const isBlk = other && isEffectivelyBlocked(other.id)
        if (isBlk) return false
        return other?.name?.toLowerCase().includes(convSearch.toLowerCase())
            || other?.username?.toLowerCase().includes(convSearch.toLowerCase())
      })
    : conversations

  const filteredMsgs = msgSearch.trim()
    ? messages.filter(m => m.body?.toLowerCase().includes(msgSearch.toLowerCase()))
    : messages

  const isMine     = (msg) => msg.sender_id === auth?.user?.id
  const showAvatar = (msgs, i) => !isMine(msgs[i]) && msgs[i + 1]?.sender_id !== msgs[i].sender_id
  const isFirst    = (msgs, i) => i === 0 || msgs[i - 1]?.sender_id !== msgs[i].sender_id
  const isLast     = (msgs, i) => i === msgs.length - 1 || msgs[i + 1]?.sender_id !== msgs[i].sender_id



  return (
    <>
      <Head title={active ? `${otherUser(active)?.name ?? 'Chat'} · Inbox` : 'Inbox'} />

      {reportTarget && (
        <ReportModal
          user={otherUser(reportTarget)}
          onClose={() => setReportTarget(null)}
          onSubmit={handleReport}
        />
      )}

      {showWarningSheet && active && (
        <OffPlatformWarningSheet
          seller={sellerInfoCache[participantRoles(active).seller?.id]}
          onContinue={handleWarningContinue}
          onPayFlockr={handleWarningPayFlockr}
          onClose={() => setShowWarningSheet(false)}
        />
      )}

      {showRequestSheet && active && (
    <MessageRequestSheet
        sender={otherUser(active)}
        onContinue={dismissRequestSheet}
        onReport={() => { dismissRequestSheet(); setReportTarget(active) }}
        onBlock={async () => { dismissRequestSheet(); await handleBlock() }}
        onClose={dismissRequestSheet}
    />
)}

      {showPayFlockrSheet && payFlockrSeller && (
        <PayWithFlockrSheet
          seller={payFlockrSeller}
          onClose={() => setShowPayFlockrSheet(false)}
        />
      )}

      {showThemePicker && (
  <ThemePickerModal
    currentTheme={myChatTheme}
    canUsePro={canUsePro}
    onSelectTheme={(theme) => setMyChatTheme(theme)}
    onUpgrade={() => {
      setShowThemePicker(false)
      setShowProSheet(true)
    }}
    onClose={() => setShowThemePicker(false)}
  />
)}

{showProSheet && (
  <ProPlansSheet onClose={() => setShowProSheet(false)} />
)}

      <style>{`
        @media (max-width: 767px) {
          body.chat-open .mobile-topbar     { display: none !important; }
          body.chat-open .mobile-bottom-nav { display: none !important; }
          body.chat-open .page-content      { overflow: hidden !important; }
        }
        .msg-bubble { max-width: 72%; word-break: break-word; }
        .conv-item:hover { background: rgba(255,255,255,0.03) !important; }
        .conv-item-active { background: rgba(255,255,255,0.06) !important; }
        .search-inp { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 999px; color: #fff; font-size: 13px; outline: none; padding: 9px 14px 9px 36px; width: 100%; box-sizing: border-box; transition: border-color 0.2s; }
        .search-inp:focus { border-color: rgba(255,92,0,0.5) !important; }
@keyframes bubbleFloat {
    0%   { transform: translateY(0) translateX(0); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 0.6; }
    100% { transform: translateY(-115vh) translateX(18px); opacity: 0; }
}
@keyframes sparkFloat {
    0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
    12%  { opacity: 0.9; }
    88%  { opacity: 0.4; }
    100% { transform: translateY(-115vh) translateX(-26px) rotate(180deg); opacity: 0; }
}
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ height: '100%', display: 'flex', background: '#0a0a0a', overflow: 'hidden', position: 'relative' }}>

        
        {/* ══ SIDEBAR ══ */}
        <div
          style={{ display: 'flex', flexDirection: 'column', width: '100%', borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, background: '#0d0d0d', ...(active ? { display: 'none' } : {}) }}
          className="inbox-sidebar"
        >
          <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>Messages</h1>
              {starting && <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#ff5c00', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
            </div>
            {(userResults.length > 0 || searchingUsers) && (
              <div style={{ marginTop: 8, background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                {searchingUsers && <div style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Searching...</div>}
                {userResults.map(user => (
                  <button key={user.id} onClick={() => startConversation(user)} className="conv-item" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <Avatar user={user} size={36} />
                    <div>
                      <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{user.name}</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!userSearch && conversations.length > 3 && (
              <div style={{ position: 'relative', marginTop: 8 }}>
                <RiSearchLine size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input value={convSearch} onChange={e => setConvSearch(e.target.value)} placeholder="Filter conversations..." className="search-inp" />
              </div>
            )}
          </div>
          <button
    onClick={() => {
        setNotifUnread(false)
        router.visit('/notifications')
    }}
    className="conv-item"
    style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
        borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left',
    }}
>
    <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: notifUnread
                ? 'linear-gradient(135deg, rgba(255,92,0,0.2), rgba(255,140,0,0.1))'
                : 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${notifUnread ? 'rgba(255,92,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <RiBellLine size={22} color={notifUnread ? '#FF6B35' : 'rgba(255,255,255,0.4)'} />
        </div>
        {notifUnread && (
            <span style={{
                position: 'absolute', bottom: 1, right: -1,
                width: 12, height: 12, borderRadius: '50%',
                background: '#FF6B35', border: '2px solid #0d0d0d',
            }} />
        )}
    </div>

    <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
            <p style={{ color: '#fff', fontSize: 14, fontWeight: notifUnread ? 700 : 600, margin: 0 }}>
                Notifications
            </p>
            {latestNotif && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, flexShrink: 0, margin: 0 }}>
                    {timeAgo(latestNotif.created_at)}
                </p>
            )}
        </div>
        <p style={{
            color: notifUnread ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
            fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontWeight: notifUnread ? 500 : 400,
        }}>
            {latestNotif ? latestNotif.body : 'No notifications yet'}
        </p>
    </div>
</button>

          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
            {filteredConvs.length === 0 && !starting && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, padding: '0 32px', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiChat1Line size={24} color="rgba(255,255,255,0.2)" /></div>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: 0 }}>No conversations</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0, lineHeight: 1.5 }}>Search for someone above to start chatting.</p>
              </div>
            )}
            {filteredConvs.map(conv => {
              const other    = otherUser(conv)
              const isAct    = active?.id === conv.id
              const unread   = conv.unread_count ?? 0
              const iBlocked = other && !!blockedByMe[other.id]
              const blocked  = other && isEffectivelyBlocked(other.id)
              const displayName = blocked ? 'Unknown User' : (other?.name ?? '')

              return (
                <button key={conv.id} onClick={() => setActive(conv)} className={`conv-item ${isAct ? 'conv-item-active' : ''}`}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'left' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar user={other} size={48} showStatus={!blocked} isBlocked={blocked} />
                    {unread > 0 && (
                      <span style={{ position: 'absolute', bottom: 0, right: -2, minWidth: 18, height: 18, borderRadius: 999, background: '#ff5c00', border: '2px solid #0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', padding: '0 4px' }}>
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
  <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
    <p style={{ color: blocked ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: 14, fontWeight: unread > 0 ? 700 : 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: blocked ? 'italic' : 'normal' }}>
      {displayName}
    </p>
    {conv.is_support && (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 999, background: 'rgba(255,107,53,0.15)', color: '#FF6B35', fontSize: 9, fontWeight: 800, marginLeft: 6, flexShrink: 0 }}>
       Flockr AI 
      </span>
    )}
  </div>
  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, flexShrink: 0, margin: 0 }}>{timeAgo(conv.last_message?.created_at)}</p>
</div>
                   <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    {iBlocked ? 'You blocked this user' 
        : blocked ? 'Message unavailable' 
        : typingUsers[conv.id] ? (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        height: 14,
    }}>
        <span style={dotStyle(0)} />
        <span style={dotStyle(1)} />
        <span style={dotStyle(2)} />
    </div>
)
        : (conv.last_message?.sender_id === auth?.user?.id ? 'You: ' : '') + (conv.last_message?.body ?? 'Say hello!')}
</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ══ CHAT PANEL ══ */}
        <div style={{ flex: 1, flexDirection: 'column', minWidth: 0, background: '#0a0a0a', display: active ? 'flex' : 'none' }} className="chat-panel">
          
         <ChatBackgroundAnimation theme={active ? resolveActiveTheme() : 'off'} />

            {!active ? (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiChat1Line size={32} color="rgba(255,255,255,0.2)" /></div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: 0 }}>Your messages</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, margin: 0 }}>Select a conversation or search for someone.</p>
            </div>
          ) : (() => {
            const other      = otherUser(active)
            const iBlocked   = other && !!blockedByMe[other.id]
            const theyBlocked = other && !!blockedByOther[other.id]
            const blocked    = iBlocked || theyBlocked
            const displayName = blocked ? 'Unknown User' : (other?.name ?? '')

            return (
              <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(13,13,13,0.97)', backdropFilter: 'blur(12px)', flexShrink: 0, position: 'relative', zIndex: 5 }}>
                  <button onClick={() => setActive(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', padding: 6, borderRadius: 8 }}>
                    <RiArrowLeftLine size={20} />
                  </button>
                  <button onClick={() => !blocked && router.visit(`/@${other?.username}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: blocked ? 'default' : 'pointer', flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <Avatar user={other} size={38} showStatus={!blocked} isBlocked={blocked} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: blocked ? 'rgba(255,255,255,0.4)' : '#fff', fontSize: 14, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: blocked ? 'italic' : 'normal' }}>
                        {displayName}
                      </p>
                      {!blocked && (
                        <p style={{ color: other?.is_online ? '#10B981' : 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0, fontWeight: other?.is_online ? 600 : 400 }}>
                          {lastSeenText(other?.last_seen_at, other?.is_online)}
                        </p>
                      )}
                      {theyBlocked && !iBlocked && (
                        <p style={{ color: 'rgba(239,68,68,0.7)', fontSize: 11, margin: 0 }}>You can't message this user</p>
                      )}
                      {iBlocked && (
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0 }}>You blocked this user</p>
                      )}
                    </div>
                  </button>

                  <button onClick={() => setMsgSearchOpen(o => !o)} style={{ width: 36, height: 36, borderRadius: '50%', background: msgSearchOpen ? 'rgba(255,92,0,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${msgSearchOpen ? 'rgba(255,92,0,0.3)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <RiSearchLine size={16} color={msgSearchOpen ? '#ff5c00' : 'rgba(255,255,255,0.5)'} />
                  </button>
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowMenu(m => !m)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <RiMoreLine size={18} color="rgba(255,255,255,0.5)" />
                    </button>
                    {showMenu && (
                      <ChatMenu
                        isBlocked={iBlocked}
                        onBlock={handleBlock}
                        onAnimation={() => { setShowMenu(false); setShowThemePicker(true) }}
                        onReport={() => { setShowMenu(false); setReportTarget(active); }}
                        onClose={() => setShowMenu(false)}
                      />
                    )}
                  </div>
                </div>

                {bannerConversations[active.id] && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.15)', flexShrink: 0 }}>
                    <RiAlertLine size={15} color="#EF4444" style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0, color: '#EF4444', fontSize: 12, fontWeight: 600 }}>This seller asked to be paid outside Flockr. Be extra careful.</p>
                  </div>
                )}

                {msgSearchOpen && (
                  <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0d0d0d', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                    <div style={{ position: 'relative' }}>
                      <RiSearchLine size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input autoFocus value={msgSearch} onChange={e => setMsgSearch(e.target.value)} placeholder="Search in conversation..." className="search-inp" />
                      {msgSearch && (
                        <>
                          <span style={{ position: 'absolute', right: 36, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{filteredMsgs.length} result{filteredMsgs.length !== 1 ? 's' : ''}</span>
                          <button onClick={() => setMsgSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}><RiCloseLine size={14} /></button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', gap: 2, position: 'relative', zIndex: 1 }}>
                  {loadingMsgs && <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}><div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#ff5c00', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>}
{!loadingMsgs && filteredMsgs.length === 0 && (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
    {msgSearch ? (
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No messages matching "{msgSearch}"</p>
    ) : (
      <ConversationStartCard
          other={otherUser(active)}
          following={otherUser(active)?.i_follow_them}
          onFollow={handleFollowFromChat}
      />
    )}
  </div>
)}
                  {filteredMsgs.map((msg, i) => {
                    const mine    = isMine(msg)
                    const first   = isFirst(filteredMsgs, i)
                    const last    = isLast(filteredMsgs, i)
                    const showAv  = showAvatar(filteredMsgs, i)

    const msgDate = msg.created_at ? new Date(msg.created_at).toDateString() : null
    const prevDate = i > 0 && filteredMsgs[i-1].created_at ? new Date(filteredMsgs[i-1].created_at).toDateString() : null
    const showDate = i === 0 || msgDate !== prevDate

                    const highlight = msgSearch && msg.body?.toLowerCase().includes(msgSearch.toLowerCase())
                    const br      = mine
                      ? `18px ${first ? 18 : 4}px ${last ? 18 : 4}px 18px`
                      : `${first ? 18 : 4}px 18px 18px ${last ? 18 : 4}px`

                    const senderIsBlocked = !mine && blocked

                    return (
        <div key={msg.id}>
            {showDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 8px', padding: '0 4px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', padding: '3px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 999, border: '1px solid rgba(255,255,255,0.06)' }}>
                        {fmtDate(msg.created_at)}
                    </span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: first && !showDate ? 8 : 0 }}>
                {!mine && (
                    <div style={{ width: 28, flexShrink: 0 }}>
                        {showAv && <Avatar user={senderIsBlocked ? null : (msg.sender ?? other)} size={28} isBlocked={senderIsBlocked} />}
                    </div>
                )}
                <div className="msg-bubble" style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: 2 }}>
                    <div style={{ padding: '9px 14px', background: mine ? (highlight ? '#e85200' : '#ff5c00') : (highlight ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'), border: mine ? 'none' : '1px solid rgba(255,255,255,0.08)', borderRadius: br, color: '#fff', fontSize: 14, lineHeight: 1.5, opacity: msg._optimistic ? 0.6 : 1, boxShadow: mine ? '0 2px 12px rgba(255,92,0,0.2)' : 'none' }}>
                        {renderMessageBody(msg.body)}
                    </div>
                    {last && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, paddingLeft: mine ? 0 : 4, paddingRight: mine ? 4 : 0 }}>
                            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>{fmtTime(msg.created_at)}</span>
                            {mine && (msg._optimistic ? <RiCheckLine size={11} color="rgba(255,255,255,0.25)" /> : <RiCheckDoubleLine size={11} color={msg.read_at ? '#ff5c00' : 'rgba(255,255,255,0.3)'} />)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
})}

{typingUsers[active?.id] && (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: 'flex-start', marginTop: 8 }}>
        <div style={{ width: 28, flexShrink: 0 }}>
            <Avatar user={other} size={28} isBlocked={blocked} />
        </div>
        <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px 18px 18px 18px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={dotStyle(0)} />
            <span style={dotStyle(1)} />
            <span style={dotStyle(2)} />
        </div>
    </div>
)}
                  <div ref={bottomRef} />
                </div>

                <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0d0d0d', position: 'relative', zIndex: 1 }}>
                  
                {mentionQuery !== null && (
        <MentionAutocomplete
            initialQuery={mentionQuery}
            onSelect={selectMention}
            onClose={() => { setMentionStart(null); setMentionQuery(null) }}
        />
    )}
                  
                  {iBlocked ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 0' }}>
                      <RiProhibitedLine size={16} color="rgba(255,255,255,0.3)" />
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                        You blocked this user.{' '}
                        <button onClick={handleBlock} style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}>Unblock</button>
                      </span>
                    </div>
                  ) : theyBlocked ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 0' }}>
                      <RiProhibitedLine size={16} color="rgba(239,68,68,0.5)" />
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>You can't reply to this conversation.</span>
                    </div>
                  ) : (
                    <form onSubmit={sendMessage} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '6px 14px', gap: 8, maxHeight: 132, overflow: 'hidden' }}>
    <textarea
        ref={inputRef}
        value={body}
        onChange={e => { setBody(e.target.value); broadcastTyping(); detectMention(e.target.value, e.target.selectionStart) }}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
        placeholder="Message..."
        maxLength={1000}
        rows={1}
        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 14, padding: '6px 0', resize: 'none', fontFamily: 'inherit', lineHeight: 1.4, maxHeight: 108, overflowY: 'auto' }}
        onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 108) + 'px' }}
    />
</div>
                      <button type="submit" disabled={!body.trim() || sending} style={{ width: 42, height: 42, borderRadius: '50%', background: body.trim() ? '#ff5c00' : 'rgba(255,255,255,0.08)', border: 'none', cursor: body.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                        <RiSendPlaneFill size={17} color={body.trim() ? '#fff' : 'rgba(255,255,255,0.25)'} />
                      </button>
                    </form>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .inbox-sidebar { display: flex !important; width: 340px !important; }
          .chat-panel    { display: flex !important; }
        }
          @keyframes typingDot {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-6px); opacity: 1; }
}
      `}</style>
    </>
  )
}

Inbox.layout = page => <AppLayout>{page}</AppLayout>