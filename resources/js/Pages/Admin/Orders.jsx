import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import {
  RiSearchLine, RiGroupLine, RiVideoLine, RiShoppingBagLine,
  RiBankCardLine, RiAlertLine, RiBarChartLine, RiArrowRightLine,
  RiTimeLine, RiCheckboxCircleLine, RiTruckLine, RiGiftLine,
  RiCloseCircleLine, RiArrowGoBackLine, RiRefreshLine, RiArchiveDrawerLine,
} from 'react-icons/ri'

function AdminLayout({ children, active }) {
  const links = [
    { href: '/admin',           icon: RiBarChartLine,    label: 'Overview'  },
    { href: '/admin/users',     icon: RiGroupLine,       label: 'Users'     },
    { href: '/admin/videos',    icon: RiVideoLine,       label: 'Videos'    },
    { href: '/admin/orders',    icon: RiShoppingBagLine, label: 'Orders'    },
    { href: '/admin/payouts',   icon: RiBankCardLine,    label: 'Payouts'   },
    { href: '/admin/reports',   icon: RiAlertLine,       label: 'Reports'   },
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

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: '#EAB308', bg: 'rgba(234,179,8,0.12)',    Icon: RiTimeLine           },
  paid:       { label: 'Paid',       color: '#10B981', bg: 'rgba(16,185,129,0.12)',   Icon: RiCheckboxCircleLine },
  confirmed:  { label: 'Confirmed',  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',   Icon: RiRefreshLine        },
  processing: { label: 'Processing', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',   Icon: RiArchiveDrawerLine  },
  shipped:    { label: 'Shipped',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',   Icon: RiTruckLine          },
  delivered:  { label: 'Delivered',  color: '#10B981', bg: 'rgba(16,185,129,0.12)',   Icon: RiGiftLine           },
  cancelled:  { label: 'Cancelled',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)',    Icon: RiCloseCircleLine    },
  refunded:   { label: 'Refunded',   color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', Icon: RiArrowGoBackLine    },
}

export default function AdminOrders({ orders, filters = {} }) {
  const [search,    setSearch]    = useState(filters.search ?? '')
  const [status,    setStatus]    = useState(filters.status ?? '')
  const [loading,   setLoading]   = useState(null)
  const [toast,     setToast]     = useState(null)
  const [detail,    setDetail]    = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const doFilter = () => router.get('/admin/orders', { search, status }, { preserveState: true })

  const updateStatus = async (orderId, newStatus) => {
    setLoading(`status-${orderId}`)
    try {
      await axios.patch(`/api/admin/orders/${orderId}/status`, { status: newStatus })
      showToast(`Order marked as ${newStatus}`)
      router.reload()
    } catch (e) { showToast(e.response?.data?.message ?? 'Failed', 'error') }
    finally { setLoading(null) }
  }

  const refund = async (order) => {
    if (!confirm(`Refund order ${order.reference}?`)) return
    setLoading(`refund-${order.id}`)
    try {
      const { data } = await axios.post(`/api/admin/orders/${order.id}/refund`)
      showToast(data.message)
      router.reload()
    } catch { showToast('Failed', 'error') } finally { setLoading(null) }
  }

  const resolve = async (order) => {
    setLoading(`resolve-${order.id}`)
    try {
      const { data } = await axios.post(`/api/admin/orders/${order.id}/resolve`)
      showToast(data.message)
      router.reload()
    } catch { showToast('Failed', 'error') } finally { setLoading(null) }
  }

  const list = orders?.data ?? orders ?? []

  return (
    <AdminLayout active="/admin/orders">
      <Head title="Admin · Orders" />

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: toast.type === 'error' ? '#EF4444' : '#10B981', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600, pointerEvents: 'none' }}>
          {toast.msg}
        </div>
      )}

      {/* Order detail panel */}
      {detail && (
        <>
          <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, zIndex: 101, background: '#111', borderLeft: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Order Detail</h3>
              <button onClick={() => setDetail(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>✕</button>
            </div>

            <p style={{ fontFamily: 'monospace', color: '#FF6B35', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>{detail.reference}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Buyer',    value: `@${detail.buyer?.username}` },
                { label: 'Seller',   value: `@${detail.seller?.username}` },
                { label: 'Total',    value: `₦${Number(detail.total).toLocaleString()}` },
                { label: 'Status',   value: detail.status },
                { label: 'Created',  value: new Date(detail.created_at).toLocaleDateString() },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{r.label}</span>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* Status updater */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Update Status</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['confirmed', 'processing', 'shipped', 'delivered'].map(s => (
                  <button key={s} onClick={() => { updateStatus(detail.id, s); setDetail(null) }} style={{ padding: '7px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{s}</button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {detail.status !== 'refunded' && (
                <button onClick={() => { refund(detail); setDetail(null) }} style={{ padding: '11px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Refund Order</button>
              )}
              {['cancelled', 'disputed'].includes(detail.status) && (
                <button onClick={() => { resolve(detail); setDetail(null) }} style={{ padding: '11px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Mark as Resolved</button>
              )}
            </div>
          </div>
        </>
      )}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Order Management</h1>
        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{orders?.total ?? list.length} orders total</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <RiSearchLine size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doFilter()} placeholder="Search reference..." style={{ width: '100%', height: 40, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, paddingLeft: 36, paddingRight: 12, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setTimeout(doFilter, 50) }} style={{ height: 40, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '0 14px', color: '#fff', fontSize: 13, outline: 'none' }}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={doFilter} style={{ height: 40, padding: '0 18px', background: '#FF6B35', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Filter</button>
      </div>

      {/* Table */}
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Reference', 'Buyer', 'Seller', 'Total', 'Status', 'Date', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((o, i) => {
                const cfg = STATUS_CONFIG[o.status] ?? {}
                return (
                  <tr key={o.id} style={{ borderBottom: i < list.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: 'pointer' }} onClick={() => setDetail(o)}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#FF6B35', fontWeight: 700 }}>{o.reference}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>@{o.buyer?.username}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>@{o.seller?.username}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#FF6B35' }}>₦{Number(o.total).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                      {new Date(o.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={e => { e.stopPropagation(); setDetail(o) }} style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 11, cursor: 'pointer' }}>Manage</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {list.length === 0 && <p style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No orders found</p>}

        {orders?.last_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px' }}>
            {Array.from({ length: Math.min(orders.last_page, 10) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => router.get('/admin/orders', { ...filters, page: p })} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: orders.current_page === p ? '#FF6B35' : 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}