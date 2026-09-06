import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import {
  RiGroupLine, RiVideoLine, RiShoppingBagLine, RiBankCardLine,
  RiAlertLine, RiBarChartLine, RiArrowRightLine, RiLoader4Line,
} from 'react-icons/ri'

function AdminLayout({ children, active }) {
  const links = [
    { href: '/admin/dashboard', icon: RiBarChartLine,    label: 'Overview'  },
    { href: '/admin/users',     icon: RiGroupLine,       label: 'Users'     },
    { href: '/admin/videos',    icon: RiVideoLine,       label: 'Videos'    },
    { href: '/admin/orders',    icon: RiShoppingBagLine, label: 'Orders'    },
    { href: '/admin/payouts',   icon: RiBankCardLine,    label: 'Payouts'   },
    { href: '/admin/reports',   icon: RiAlertLine,       label: 'Reports'   },
    { href: '/admin/disputes',  icon: RiAlertLine,       label: 'Disputes'  },
    { href: '/admin/analytics', icon: RiBarChartLine,    label: 'Analytics' },
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
      </div>
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '32px' }}>{children}</div>
    </div>
  )
}

const STATUS_CFG = {
  open:            { label: 'Awaiting seller',  color: '#EAB308', bg: 'rgba(234,179,8,0.12)'   },
  awaiting_admin:  { label: 'Needs review',     color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  resolved_buyer:  { label: 'Refunded',         color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  resolved_seller: { label: 'Seller paid',      color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  closed:          { label: 'Closed',           color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
}

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [detail,    setDetail]    = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [note,      setNote]      = useState('')
  const [resolving, setResolving] = useState(false)

  const load = (status = statusFilter) => {
    setLoading(true)
    axios.get('/api/admin/disputes', { params: status ? { status } : {} })
      .then(r => setDisputes(r.data))
      .finally(() => setLoading(false))
  }

  useState(() => { load() }, [])

  const openDetail = async (d) => {
    setDetail({ ...d, messages: [] })
    setDetailLoading(true)
    try {
      const { data } = await axios.get(`/api/disputes/${d.id}`)
      setDetail(data)
    } finally {
      setDetailLoading(false)
    }
  }

  const resolve = async (outcome) => {
    if (!note.trim()) { alert('Please add a resolution note explaining the decision.'); return }
    if (!confirm(`Resolve this dispute: ${outcome === 'refund_buyer' ? 'refund the buyer' : 'release funds to the seller'}?`)) return
    setResolving(true)
    try {
      await axios.post(`/api/admin/disputes/${detail.id}/resolve`, { outcome, resolution_note: note })
      setDetail(null)
      setNote('')
      load()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Failed to resolve.')
    } finally {
      setResolving(false)
    }
  }

  const list = disputes?.data ?? []

  return (
    <AdminLayout active="/admin/disputes">
      <Head title="Admin · Disputes" />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Disputes</h1>
        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{disputes?.total ?? 0} total</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['', 'All'], ['open', 'Awaiting seller'], ['awaiting_admin', 'Needs review'], ['resolved_buyer', 'Refunded'], ['resolved_seller', 'Seller paid']].map(([v, l]) => (
          <button key={v} onClick={() => { setStatusFilter(v); load(v) }} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: statusFilter === v ? '#FF6B35' : 'rgba(255,255,255,0.04)', color: statusFilter === v ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: statusFilter === v ? 700 : 400, fontSize: 13, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <RiLoader4Line size={28} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
          {list.map((d, i) => {
            const cfg = STATUS_CFG[d.status] ?? STATUS_CFG.open
            return (
              <div key={d.id} onClick={() => openDetail(d)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < list.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 700 }}>{d.order?.reference} — {d.reason}</p>
                  <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>@{d.buyer?.username} vs @{d.seller?.username}</p>
                </div>
                <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                <RiArrowRightLine size={16} color="rgba(255,255,255,0.2)" />
              </div>
            )
          })}
          {list.length === 0 && <p style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)' }}>No disputes.</p>}
        </div>
      )}

      {detail && (
        <>
          <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 460, zIndex: 101, background: '#111', borderLeft: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Dispute #{detail.id}</h3>
              <button onClick={() => setDetail(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#fff' }}>✕</button>
            </div>

            {detailLoading ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '30px 0' }}>Loading…</p>
            ) : (
              <>
                <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#fff' }}>Order {detail.order?.reference} · ₦{Number(detail.order?.total).toLocaleString()}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Buyer @{detail.buyer?.username} vs Seller @{detail.seller?.username}</p>
                </div>

                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 8px' }}>Thread</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {detail.messages?.map(m => (
                    <div key={m.id} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                      <p style={{ margin: '0 0 4px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                        {m.user_id === detail.buyer_id ? 'Buyer' : m.user_id === detail.seller_id ? 'Seller' : 'Admin'} · {new Date(m.created_at).toLocaleString()}
                      </p>
                      <p style={{ margin: 0, fontSize: 13, color: '#fff' }}>{m.message}</p>
                      {m.attachment_urls?.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          {m.attachment_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} /></a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {!['resolved_buyer', 'resolved_seller', 'closed'].includes(detail.status) && (
                  <>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 8px' }}>Resolution note (required)</p>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Explain your decision — this is visible to both parties."
                      style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', fontSize: 13, outline: 'none', resize: 'none', marginBottom: 12, boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button onClick={() => resolve('refund_buyer')} disabled={resolving} style={{ padding: '12px', borderRadius: 12, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#3B82F6', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        Refund Buyer
                      </button>
                      <button onClick={() => resolve('release_seller')} disabled={resolving} style={{ padding: '12px', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        Release to Seller
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AdminLayout>
  )
}