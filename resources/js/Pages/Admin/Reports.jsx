import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import {
  RiGroupLine, RiVideoLine, RiShoppingBagLine, RiBankCardLine,
  RiAlertLine, RiBarChartLine, RiArrowRightLine,
  RiCheckboxCircleLine, RiCloseCircleLine, RiTimeLine,
  RiChat1Line, RiLoader4Line, RiArrowDownSLine,
} from 'react-icons/ri'

function AdminLayout({ children, active }) {
  const links = [
    { href: '/admin/dashboard',           icon: RiBarChartLine,    label: 'Overview'  },
    { href: '/admin/users',     icon: RiGroupLine,       label: 'Users'     },
    { href: '/admin/videos',    icon: RiVideoLine,       label: 'Videos'    },
    { href: '/admin/orders',    icon: RiShoppingBagLine, label: 'Orders'    },
    { href: '/admin/payouts',   icon: RiBankCardLine,    label: 'Payouts'   },
    { href: '/admin/reports',   icon: RiAlertLine,       label: 'Reports'   },
    { href: '/admin/analytics', icon: RiBarChartLine,    label: 'Analytics' },
    { href: '/admin/disputes', icon: RiAlertLine, label: 'Disputes' },
  ]
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: '"DM Sans", sans-serif', display: 'flex' }}>
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '8px 14px 20px' }}>
          <p style={{ margin: 0, color: '#FF6B35', fontWeight: 800, fontSize: 18 }}>Flockr</p>
          <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Admin Panel</p>
        </div>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, textDecoration: 'none', background: active === l.href ? 'rgba(255,107,53,0.12)' : 'transparent', color: active === l.href ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontWeight: active === l.href ? 600 : 400, fontSize: 14 }}>
            <l.icon size={18} />{l.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, textDecoration: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            <RiArrowRightLine size={18} /> Back to App
          </Link>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '32px' }}>{children}</div>
    </div>
  )
}

const STATUS_CFG = {
  pending:   { label: 'Pending',   color: '#EAB308', bg: 'rgba(234,179,8,0.12)'   },
  reviewed:  { label: 'Reviewed',  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  actioned:  { label: 'Actioned',  color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  dismissed: { label: 'Dismissed', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
}

function fmtTime(d) {
  return new Date(d).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

// ── Chat history viewer ───────────────────────────────────────────────────────
function ChatHistory({ conversationId, reporterId, reportedId }) {
  const [messages,  setMessages]  = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [loaded,    setLoaded]    = useState(false)

  const load = async () => {
    if (loaded) return
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/admin/conversations/${conversationId}/messages`)
      setMessages(data)
      setLoaded(true)
    } catch { setMessages([]) }
    finally { setLoading(false) }
  }

  if (!loaded) {
    return (
      <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        {loading ? <RiLoader4Line size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <RiChat1Line size={15} />}
        {loading ? 'Loading chat history...' : 'View Chat History'}
      </button>
    )
  }

  if (!messages?.length) {
    return <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No messages found</p>
  }

  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <RiChat1Line size={14} color="#FF6B35" />
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600 }}>Chat History · {messages.length} messages</span>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {messages.map((msg, i) => {
          const isReporter = msg.sender_id === reporterId
          const isReported = msg.sender_id === reportedId
          return (
            <div key={msg.id ?? i} style={{ display: 'flex', flexDirection: 'column', alignItems: isReporter ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                {!isReporter && <img src={msg.sender?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.name ?? 'U')}&background=222`} alt="" style={{ width: 18, height: 18, borderRadius: '50%' }} />}
                <span style={{ fontSize: 10, color: isReported ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.35)' }}>
                  @{msg.sender?.username}{isReported ? ' (reported)' : ''}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{fmtTime(msg.created_at)}</span>
              </div>
              <div style={{
                maxWidth: '80%', padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.4,
                background: isReporter ? '#FF6B35' : isReported ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
                border: isReported ? '1px solid rgba(239,68,68,0.25)' : 'none',
                color: '#fff',
              }}>
                {msg.body}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminReports({ reports, filters = {} }) {
 const [status,     setStatus]     = useState(filters?.status ?? '')
const [sort,       setSort]       = useState(filters?.sort   ?? 'latest')
const [typeFilter, setTypeFilter] = useState(filters?.type   ?? '')
  const [loading, setLoading] = useState(null)
  const [toast,   setToast]   = useState(null)
  const [detail,  setDetail]  = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }


// REPLACE your current doFilter with this:
const doFilter = (overrides = {}) => {
  router.get('/admin/reports', {
    status: overrides.status ?? status,
    sort:   overrides.sort   ?? sort,
    type:   overrides.type   ?? typeFilter,  // ← was overrides.typeFilter, now overrides.type
  }, { preserveState: true })
}
  const action = async (reportId, act) => {
    setLoading(`${act}-${reportId}`)
    try {
      const { data } = await axios.post(`/api/admin/reports/${reportId}/${act}`)
      showToast(data.message)
      setDetail(null)
      router.reload()
    } catch (e) { showToast(e.response?.data?.message ?? 'Failed', 'error') }
    finally { setLoading(null) }
  }

  const banReported = async (report) => {
    if (!confirm(`Ban @${report.reported?.username}? They will be suspended from the platform.`)) return
    setLoading(`ban-${report.id}`)
    try {
      await axios.post(`/api/admin/users/${report.reported_id}/suspend`)
      await axios.post(`/api/admin/reports/${report.id}/actioned`)
      showToast(`@${report.reported?.username} has been banned`)
      setDetail(null)
      router.reload()
    } catch { showToast('Failed', 'error') }
    finally { setLoading(null) }
  }

  // const list = reports?.data ?? reports ?? []

  const list = reports?.data ?? reports ?? []

const filteredList = (list ?? []).filter(r => {
  const isVideo = r.reason?.includes('[Video:')
  const isOrder = r.reason?.includes('Order dispute') || r.reason?.includes('FLK-') || !!r.order_id
  const isChat  = !!r.conversation_id

  if (typeFilter === 'video') return isVideo
  if (typeFilter === 'order') return isOrder
  if (typeFilter === 'chat')  return isChat
  if (typeFilter === 'user')  return !isVideo && !isOrder && !isChat
  return true
})

// return (   // ← your existing return starts here

  return (
    <AdminLayout active="/admin/reports">
      <Head title="Admin · Reports" />

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: toast.type === 'error' ? '#EF4444' : '#10B981', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600, pointerEvents: 'none' }}>
          {toast.msg}
        </div>
      )}

      {/* Detail panel */}
      {detail && (
        <>
          <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, zIndex: 101, background: '#111', borderLeft: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Report Detail</h3>
              <button onClick={() => setDetail(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>✕</button>
            </div>

            {/* Reporter */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Reported by</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                <img src={detail.reporter?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(detail.reporter?.name ?? 'U')}&background=222`} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{detail.reporter?.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>@{detail.reporter?.username}</p>
                </div>
              </div>
            </div>

            {/* Reported */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Reported account</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12 }}>
                <img src={detail.reported?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(detail.reported?.name ?? 'U')}&background=222`} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{detail.reported?.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>@{detail.reported?.username} · {detail.reported?.role}</p>
                </div>
                <Link href={`/@${detail.reported?.username}`} target="_blank" style={{ color: '#FF6B35', fontSize: 12, textDecoration: 'none' }}>View →</Link>
              </div>
            </div>

            {/* Reason */}
{(() => {
  const videoMatch = detail.reason?.match(/\[Video: ([A-Z0-9]+)\]/)
  const videoUlid  = videoMatch?.[1] ?? null
  const cleanReason = detail.reason?.replace(/\[Video: [A-Z0-9]+\]\s*/, '') ?? ''
  return (
    <div style={{ padding: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 16 }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Reason</p>
      <p style={{ margin: 0, color: '#fff', fontSize: 14, lineHeight: 1.5 }}>{cleanReason}</p>
      {videoUlid && (
        <Link
          href={`/@${detail.reported?.username}/video/${videoUlid}`}
          target="_blank"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '5px 12px', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', borderRadius: 999, color: '#FF6B35', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
        >
          <RiVideoLine size={13} /> View Reported Video →
        </Link>
      )}
      <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
        {detail.conversation_id ? '📩 Reported from a conversation · ' : ''}
        {videoUlid ? '🎬 Video report · ' : ''}
        {new Date(detail.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  )
})()}

{detail.report_count > 1 && (
  <div style={{ padding: '10px 14px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ fontSize: 18 }}>⚠️</span>
    <p style={{ margin: 0, color: '#EAB308', fontSize: 13, fontWeight: 600 }}>
      Reported {detail.report_count} times — this user keeps reporting this content
    </p>
  </div>
)}

            {/* Chat history — only shown when report came from a conversation */}
            {detail.conversation_id && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                  Chat History
                </p>
                <ChatHistory
                  conversationId={detail.conversation_id}
                  reporterId={detail.reporter_id}
                  reportedId={detail.reported_id}
                />
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {detail.status === 'pending' || detail.status === 'reviewed' ? (
                <>
                  <button
                    onClick={() => action(detail.id, 'actioned')}
                    disabled={!!loading}
                    style={{ padding: '12px', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >
                    ✓ Mark as Actioned
                  </button>
                  <button
                    onClick={() => banReported(detail)}
                    disabled={!!loading}
                    style={{ padding: '12px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >
                    🚫 Ban @{detail.reported?.username}
                  </button>
                  <button
                    onClick={() => action(detail.id, 'dismissed')}
                    disabled={!!loading}
                    style={{ padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                  >
                    Dismiss Report
                  </button>
                </>
              ) : (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '8px 0' }}>
                  This report has been <strong style={{ color: STATUS_CFG[detail.status]?.color }}>{detail.status}</strong>.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Reports Queue</h1>
        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{reports?.total ?? list.length} reports</p>
      </div>

      {/* ── Filters bar ─────────────────────────────────────────── */}
<div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
  {/* Status tabs */}
  {[['', 'All'], ['pending', 'Pending'], ['reviewed', 'Reviewed'], ['actioned', 'Actioned'], ['dismissed', 'Dismissed']].map(([v, l]) => (
    <button key={v} onClick={() => { setStatus(v); doFilter({ status: v }) }}
      style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: status === v ? '#FF6B35' : 'rgba(255,255,255,0.04)', color: status === v ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: status === v ? 700 : 400, fontSize: 13, cursor: 'pointer' }}>
      {l}
    </button>
  ))}

  {/* Divider */}
  <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

  {/* Type filter */}
  {[['', 'All Types'], ['video', 'Video Reports'], ['chat', 'Chat Reports'], ['order', 'Order Reports'], ['user', 'User Reports']].map(([v, l]) => (
    <button key={v} onClick={() => { setTypeFilter(v); doFilter({ type: v }) }}
      style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: typeFilter === v ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)', color: typeFilter === v ? '#3B82F6' : 'rgba(255,255,255,0.5)', fontWeight: typeFilter === v ? 700 : 400, fontSize: 13, cursor: 'pointer', borderColor: typeFilter === v ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)' }}>
      {l}
    </button>
  ))}

  {/* Sort — pushed to right */}
  <div style={{ marginLeft: 'auto', position: 'relative' }}>
    <select
      value={sort}
      onChange={e => { const v = e.target.value; setSort(v); doFilter({ sort: v }) }}
      style={{ appearance: 'none', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, padding: '8px 32px 8px 14px', cursor: 'pointer', outline: 'none' }}>
      <option value="latest" style={{ background: '#111' }}>Latest First</option>
      <option value="oldest" style={{ background: '#111' }}>Oldest First</option>
      <option value="az"     style={{ background: '#111' }}>A→Z (reported user)</option>
      <option value="za"     style={{ background: '#111' }}>Z→A (reported user)</option>
    </select>
    <RiArrowDownSLine size={14} color="rgba(255,255,255,0.4)"
      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
  </div>
</div>

      {/* Report list */}
     {/* Report list — grouped by date */}
{(() => {
  // Group reports by date string
  const groups = {}
  filteredList.forEach(r => {
    const dateKey = new Date(r.created_at).toLocaleDateString('en-NG', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(r)
  })

  return Object.entries(groups).map(([dateLabel, items]) => (
    <div key={dateLabel} style={{ marginBottom: 8 }}>
      {/* Date header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 10px' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          {dateLabel}
        </p>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Reports under this date */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(r => {
          const cfg    = STATUS_CFG[r.status] ?? STATUS_CFG.pending
          const isChat  = !!r.conversation_id
          const isVideo = r.reason?.includes('[Video:')
          const isOrder = r.reason?.includes('Order dispute') || r.reason?.includes('FLK-') || !!r.order_id

          // Time only — no date
          const timeOnly = new Date(r.created_at).toLocaleTimeString('en-NG', {
            hour: '2-digit', minute: '2-digit'
          })

          return (
            <div key={r.id} onClick={() => setDetail(r)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, cursor: 'pointer' }}>
              <img
                src={r.reported?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(r.reported?.name ?? 'U')}&background=222`}
                alt=""
                style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>@{r.reported?.username}</p>
                  <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                  {r.report_count > 1 && (
  <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(234,179,8,0.12)', color: '#EAB308' }}>
    ×{r.report_count}
  </span>
)}
                  {isChat && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>
                      <RiChat1Line size={10} /> Chat report
                    </span>
                  )}
                  {isVideo && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(255,107,53,0.12)', color: '#FF6B35' }}>
                      <RiVideoLine size={10} /> Video report
                    </span>
                  )}
                  {isOrder && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                      <RiShoppingBagLine size={10} /> Order report
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.reason}
                </p>
                {/* Time only — date is shown in the group header */}
                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                  by @{r.reporter?.username} · {timeOnly}
                </p>
              </div>
              <RiArrowRightLine size={16} color="rgba(255,255,255,0.2)" />
            </div>
          )
        })}
      </div>
    </div>
  ))
})()}

      {filteredList.length === 0 && (
  <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
    <RiAlertLine size={40} style={{ margin: '0 auto 12px', display: 'block' }} />
    <p style={{ margin: 0 }}>No reports found</p>
  </div>
)}

      {reports?.last_page > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '24px 0' }}>
          {Array.from({ length: Math.min(reports.last_page, 10) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => router.get('/admin/reports', { status, page: p })} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: reports.current_page === p ? '#FF6B35' : 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>{p}</button>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  )
}