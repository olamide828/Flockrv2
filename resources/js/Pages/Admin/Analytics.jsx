import { useState, useEffect } from 'react'
import { Head, Link } from '@inertiajs/react'
import axios from 'axios'
import {
  RiGroupLine, RiVideoLine, RiShoppingBagLine, RiBankCardLine,
  RiAlertLine, RiBarChartLine, RiArrowRightLine,
  RiMoneyDollarCircleLine, RiUserAddLine, RiLoader4Line,
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

function MiniBarChart({ data, valueKey, color = '#FF6B35', height = 80 }) {
  if (!data?.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>No data</div>
  const max = Math.max(...data.map(d => Number(d[valueKey] ?? 0)), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height, paddingTop: 8 }}>
      {data.map((d, i) => {
        const val = Number(d[valueKey] ?? 0)
        const pct = (val / max) * 100
        return (
          <div key={i} title={`${d.date}: ${val}`} style={{ flex: 1, background: color, borderRadius: '3px 3px 0 0', height: `${Math.max(pct, 2)}%`, opacity: 0.8, transition: 'height 0.3s', minWidth: 2, cursor: 'default' }} />
        )
      })}
    </div>
  )
}

function fmtMoney(n) { return '₦' + Number(n ?? 0).toLocaleString() }
function fmt(n)      { const num = Number(n ?? 0); if (num >= 1_000_000) return (num/1_000_000).toFixed(1)+'M'; if (num >= 1_000) return (num/1_000).toFixed(1)+'K'; return String(num) }

export default function AdminAnalytics() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/admin/analytics')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout active="/admin/analytics">
      <Head title="Admin · Analytics" />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Analytics</h1>
        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Last 30 days</p>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <RiLoader4Line size={32} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {!loading && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Revenue chart */}
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue (30d)</p>
                <p style={{ margin: '4px 0 0', color: '#FF6B35', fontSize: 28, fontWeight: 800, letterSpacing: '-1px' }}>
                  {fmtMoney(data.revenueByDay?.reduce((s, d) => s + Number(d.revenue ?? 0), 0))}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Total orders</p>
                <p style={{ margin: '2px 0 0', color: '#fff', fontSize: 18, fontWeight: 700 }}>
                  {fmt(data.revenueByDay?.reduce((s, d) => s + Number(d.orders ?? 0), 0))}
                </p>
              </div>
            </div>
            <MiniBarChart data={data.revenueByDay} valueKey="revenue" color="#FF6B35" height={100} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>{data.revenueByDay?.[0]?.date}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>{data.revenueByDay?.[data.revenueByDay.length - 1]?.date}</span>
            </div>
          </div>

          {/* User growth chart */}
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '20px 24px' }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Users (30d)</p>
              <p style={{ margin: '4px 0 0', color: '#3B82F6', fontSize: 28, fontWeight: 800, letterSpacing: '-1px' }}>
                {fmt(data.userGrowth?.reduce((s, d) => s + Number(d.users ?? 0), 0))}
              </p>
            </div>
            <MiniBarChart data={data.userGrowth} valueKey="users" color="#3B82F6" height={80} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Top sellers */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>Top Sellers</p>
                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>By revenue</p>
              </div>
              {data.topSellers?.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ width: 22, color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700, flexShrink: 0, textAlign: 'center' }}>{i + 1}</span>
                  <img src={s.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=222`} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>@{s.username}</p>
                  </div>
                  <p style={{ margin: 0, color: '#FF6B35', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{fmtMoney(s.revenue)}</p>
                </div>
              ))}
              {!data.topSellers?.length && <p style={{ padding: '20px', color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0 }}>No data yet</p>}
            </div>

            {/* Top products */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>Top Products</p>
                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>By orders</p>
              </div>
              {data.topProducts?.map((p, i) => {
                const img = Array.isArray(p.images) ? p.images[0] : null
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ width: 22, color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700, flexShrink: 0, textAlign: 'center' }}>{i + 1}</span>
                    <div style={{ width: 32, height: 32, borderRadius: 8, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
                      {img && <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>₦{Number(p.price).toLocaleString()}</p>
                    </div>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{p.order_items_count} orders</p>
                  </div>
                )
              })}
              {!data.topProducts?.length && <p style={{ padding: '20px', color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0 }}>No data yet</p>}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  )
}