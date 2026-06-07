import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import {
  RiUserLine, RiVideoLine, RiShoppingBagLine, RiMoneyDollarCircleLine,
  RiStoreLine, RiTimeLine, RiCheckboxCircleLine, RiAlertLine,
  RiArrowRightLine, RiShieldLine, RiBarChartLine, RiBankCardLine,
  RiGroupLine, RiLoader4Line, RiRefreshLine,
} from 'react-icons/ri'

function StatCard({ label, value, icon: Icon, color = '#FF6B35', sub }) {
  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
      </div>
      <p style={{ margin: 0, color: '#fff', fontSize: 28, fontWeight: 800, letterSpacing: '-1px' }}>{value}</p>
      <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{label}</p>
      {sub && <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>{sub}</p>}
    </div>
  )
}

function NavItem({ href, icon: Icon, label, active }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      borderRadius: 12, textDecoration: 'none', transition: 'all 0.15s',
      background: active ? 'rgba(255,107,53,0.12)' : 'transparent',
      color: active ? '#FF6B35' : 'rgba(255,255,255,0.5)',
      fontWeight: active ? 600 : 400, fontSize: 14,
    }}>
      <Icon size={18} />
      {label}
    </Link>
  )
}

export default function AdminDashboard({ stats, recentUsers, pendingVideos, flaggedOrders, recentOrders }) {
  const [approvingId, setApprovingId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)

  const handleApprove = async (videoId) => {
    setApprovingId(videoId)
    try {
      await axios.post(`/api/admin/videos/${videoId}/approve`)
      router.reload()
    } catch { alert('Failed') } finally { setApprovingId(null) }
  }

  const handleReject = async (videoId) => {
    const reason = prompt('Rejection reason:')
    if (!reason) return
    setRejectingId(videoId)
    try {
      await axios.post(`/api/admin/videos/${videoId}/reject`, { reason })
      router.reload()
    } catch { alert('Failed') } finally { setRejectingId(null) }
  }

  const fmt = (n) => Number(n ?? 0).toLocaleString()
  const fmtMoney = (n) => '₦' + Number(n ?? 0).toLocaleString()

  return (
    <>
      <Head title="Admin Dashboard" />
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: '"DM Sans", sans-serif', display: 'flex' }}>

        {/* Sidebar */}
        <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
          <div style={{ padding: '8px 14px 20px', marginBottom: 8 }}>
            <p style={{ margin: 0, color: '#FF6B35', fontWeight: 800, fontSize: 18 }}>Flockr</p>
            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Admin Panel</p>
          </div>
          <NavItem href="/admin"           icon={RiBarChartLine}          label="Overview"   active={true} />
          <NavItem href="/admin/users"      icon={RiGroupLine}             label="Users" />
          <NavItem href="/admin/videos"     icon={RiVideoLine}             label="Videos" />
          <NavItem href="/admin/orders"     icon={RiShoppingBagLine}       label="Orders" />
          <NavItem href="/admin/payouts"    icon={RiBankCardLine}          label="Payouts" />
          <NavItem href="/admin/reports"    icon={RiAlertLine}             label="Reports" />
          <NavItem href="/admin/analytics"  icon={RiBarChartLine}          label="Analytics" />
          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, textDecoration: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
              <RiArrowRightLine size={18} /> Back to App
            </Link>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '32px' }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Overview</h1>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Platform health at a glance</p>
          </div>

          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard label="Total Users"      value={fmt(stats.total_users)}    icon={RiUserLine}              color="#3B82F6" sub={`+${fmt(stats.new_users_today)} today`} />
            <StatCard label="Total Sellers"    value={fmt(stats.total_sellers)}  icon={RiStoreLine}             color="#8B5CF6" />
            <StatCard label="Active Videos"    value={fmt(stats.total_videos)}   icon={RiVideoLine}             color="#10B981" sub={`${fmt(stats.videos_today)} today`} />
            <StatCard label="Total Orders"     value={fmt(stats.total_orders)}   icon={RiShoppingBagLine}       color="#F59E0B" sub={`${fmt(stats.orders_today)} today`} />
            <StatCard label="GMV (7d)"         value={fmtMoney(stats.gmv_7d)}   icon={RiMoneyDollarCircleLine} color="#FF6B35" />
            <StatCard label="GMV (30d)"        value={fmtMoney(stats.gmv_30d)}  icon={RiMoneyDollarCircleLine} color="#FF6B35" />
            <StatCard label="Pending Videos"   value={fmt(stats.pending_videos)} icon={RiTimeLine}              color="#EAB308" />
            <StatCard label="Queue Size"       value={fmt(stats.queue_size)}     icon={RiLoader4Line}           color="#6B7280" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Pending Videos */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Pending Videos</h3>
                <Link href="/admin/videos" style={{ color: '#FF6B35', textDecoration: 'none', fontSize: 13 }}>View all →</Link>
              </div>
              {pendingVideos?.length === 0
                ? <p style={{ padding: '24px 20px', color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0 }}>No pending videos</p>
                : pendingVideos?.slice(0, 5).map(v => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
                      {v.thumbnail_url_full && <img src={v.thumbnail_url_full} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title || 'Untitled'}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>@{v.user?.username}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleApprove(v.id)} disabled={approvingId === v.id} style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {approvingId === v.id ? '...' : 'Approve'}
                      </button>
                      <button onClick={() => handleReject(v.id)} disabled={rejectingId === v.id} style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* Recent Orders */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Recent Orders</h3>
                <Link href="/admin/orders" style={{ color: '#FF6B35', textDecoration: 'none', fontSize: 13 }}>View all →</Link>
              </div>
              {recentOrders?.slice(0, 6).map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>{o.reference}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{o.buyer?.username} → {o.seller?.username}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#FF6B35' }}>₦{Number(o.total).toLocaleString()}</span>
                  <span style={{
                    padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: o.status === 'paid' ? 'rgba(16,185,129,0.12)' : o.status === 'pending' ? 'rgba(234,179,8,0.12)' : 'rgba(255,255,255,0.06)',
                    color: o.status === 'paid' ? '#10B981' : o.status === 'pending' ? '#EAB308' : 'rgba(255,255,255,0.5)',
                  }}>{o.status}</span>
                </div>
              ))}
            </div>

            {/* Recent Users */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden', gridColumn: '1 / -1' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Recent Users</h3>
                <Link href="/admin/users" style={{ color: '#FF6B35', textDecoration: 'none', fontSize: 13 }}>View all →</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 0 }}>
                {recentUsers?.slice(0, 8).map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                    <img src={u.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=222`} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>@{u.username} · {u.role}</p>
                    </div>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: u.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: u.is_active ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                      {u.is_active ? 'Active' : 'Banned'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}