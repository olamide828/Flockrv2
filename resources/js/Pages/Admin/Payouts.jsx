import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import {
  RiGroupLine, RiVideoLine, RiShoppingBagLine, RiBankCardLine,
  RiAlertLine, RiBarChartLine, RiArrowRightLine, RiSearchLine,
  RiCheckboxCircleLine, RiCloseCircleLine, RiTimeLine, RiMoneyDollarCircleLine,
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
  pending: { label: 'Pending', color: '#EAB308', bg: 'rgba(234,179,8,0.12)',   Icon: RiTimeLine           },
  paid:    { label: 'Paid',    color: '#10B981', bg: 'rgba(16,185,129,0.12)',   Icon: RiCheckboxCircleLine },
  failed:  { label: 'Failed',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)',    Icon: RiCloseCircleLine    },
}

export default function AdminPayouts({ payouts, filters = {}, stats = {} }) {
  const [search,  setSearch]  = useState(filters.search ?? '')
  const [status,  setStatus]  = useState(filters.status ?? '')
  const [loading, setLoading] = useState(null)
  const [toast,   setToast]   = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  const doFilter = () => router.get('/admin/payouts', { search, status }, { preserveState: true })

  const approve = async (payout) => {
    if (!confirm(`Approve ₦${Number(payout.amount).toLocaleString()} payout to @${payout.seller?.username}?`)) return
    setLoading(payout.id)
    try {
      const { data } = await axios.post(`/api/admin/payouts/${payout.id}/approve`)
      showToast(data.message)
      router.reload()
    } catch (e) { showToast(e.response?.data?.message ?? 'Failed to approve payout', 'error') }
    finally { setLoading(null) }
  }

  const list = payouts?.data ?? payouts ?? []

  return (
    <AdminLayout active="/admin/payouts">
      <Head title="Admin · Payouts" />

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: toast.type === 'error' ? '#EF4444' : '#10B981', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600, pointerEvents: 'none' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Payout Management</h1>
        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Approve seller withdrawal requests</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Pending',          value: stats.pending_count  ?? 0, color: '#EAB308' },
          { label: 'Pending Amount',   value: `₦${Number(stats.pending_amount ?? 0).toLocaleString()}`, color: '#EAB308' },
          { label: 'Paid (30d)',       value: stats.paid_count_30d ?? 0, color: '#10B981' },
          { label: 'Paid Amount (30d)',value: `₦${Number(stats.paid_amount_30d ?? 0).toLocaleString()}`, color: '#10B981' },
        ].map(s => (
          <div key={s.label} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 18px' }}>
            <p style={{ margin: 0, color: s.color, fontSize: 22, fontWeight: 800 }}>{s.value}</p>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <RiSearchLine size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doFilter()} placeholder="Search seller username..." style={{ width: '100%', height: 40, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, paddingLeft: 36, paddingRight: 12, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setTimeout(doFilter, 50) }} style={{ height: 40, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '0 14px', color: '#fff', fontSize: 13, outline: 'none' }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>
        <button onClick={doFilter} style={{ height: 40, padding: '0 18px', background: '#FF6B35', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Filter</button>
      </div>

      {/* Table */}
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Seller', 'Amount', 'Bank', 'Status', 'Requested', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((p, i) => {
                const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.pending
                const StatusIcon = cfg.Icon
                return (
                  <tr key={p.id} style={{ borderBottom: i < list.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={p.seller?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(p.seller?.name ?? 'S')}&background=222`} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{p.seller?.name}</p>
                          <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>@{p.seller?.username}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#FF6B35', fontWeight: 800, fontSize: 15 }}>₦{Number(p.amount).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ margin: 0, fontSize: 12, color: '#fff' }}>{p.seller?.bank_name ?? '—'}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{p.seller?.account_last4 ? `****${p.seller.account_last4}` : p.seller?.account_name ?? ''}</p>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                        <StatusIcon size={12} />{cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                      {new Date(p.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {p.status === 'pending' && (
                        <button onClick={() => approve(p)} disabled={loading === p.id} style={{ padding: '6px 16px', borderRadius: 10, background: loading === p.id ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: 12, fontWeight: 700, cursor: loading === p.id ? 'not-allowed' : 'pointer' }}>
                          {loading === p.id ? 'Sending...' : 'Approve & Pay'}
                        </button>
                      )}
                      {p.status === 'paid' && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Paid {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : ''}</span>}
                      {p.status === 'failed' && <span style={{ color: '#EF4444', fontSize: 12 }}>Failed</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)' }}>
            <RiMoneyDollarCircleLine size={36} style={{ margin: '0 auto 10px', display: 'block' }} />
            <p style={{ margin: 0 }}>No payout requests found</p>
          </div>
        )}

        {payouts?.last_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px' }}>
            {Array.from({ length: Math.min(payouts.last_page, 10) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => router.get('/admin/payouts', { ...filters, page: p })} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: payouts.current_page === p ? '#FF6B35' : 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}