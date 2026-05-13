import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'

export default function AdminDashboard({ stats, recentUsers, pendingVideos, flaggedOrders }) {
  const [activeTab, setActiveTab] = useState('overview')

  const verifyUser = async (userId) => {
    await axios.post(`/api/admin/users/${userId}/verify`)
    router.reload()
  }

  const approveVideo = async (videoId) => {
    await axios.post(`/api/admin/videos/${videoId}/approve`)
    router.reload()
  }

  const rejectVideo = async (videoId, reason) => {
    await axios.post(`/api/admin/videos/${videoId}/reject`, { reason })
    router.reload()
  }

  return (
    <>
      <Head title="Admin Dashboard" />

      <div className="h-screen overflow-y-auto scroll-hidden bg-flockr-black">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-flockr-black/90 backdrop-blur-md border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛡</span>
              <div>
                <h1 className="font-display font-bold text-white text-xl">Admin Panel</h1>
                <p className="text-flockr-muted text-xs">Flockr Platform Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-green">Platform Healthy</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-white/[0.06] px-6">
          <div className="flex gap-6 max-w-7xl mx-auto overflow-x-auto scroll-hidden">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'users',    label: 'Users' },
              { key: 'videos',   label: 'Videos', badge: pendingVideos?.length },
              { key: 'orders',   label: 'Orders',  badge: flaggedOrders?.length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3.5 text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-colors ${
                  activeTab === tab.key ? 'tab-active text-white' : 'text-flockr-muted hover:text-white'
                }`}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span className="bg-flockr-orange text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6 pb-24 md:pb-8 space-y-8">

          {/* ── Overview ─────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users',    value: formatCount(stats?.total_users),     icon: '👥', color: 'text-blue-400' },
                  { label: 'Active Sellers', value: formatCount(stats?.total_sellers),   icon: '🎬', color: 'text-flockr-orange' },
                  { label: 'GMV (30d)',       value: `₦${Number(stats?.gmv_30d ?? 0).toLocaleString()}`, icon: '💰', color: 'text-flockr-green' },
                  { label: 'Total Videos',   value: formatCount(stats?.total_videos),    icon: '📹', color: 'text-purple-400' },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-flockr-card rounded-flockr-lg border border-white/[0.06] p-5">
                    <span className="text-2xl">{kpi.icon}</span>
                    <p className={`font-display font-bold text-2xl mt-3 ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-flockr-muted text-xs mt-1">{kpi.label}</p>
                  </div>
                ))}
              </div>

              {/* Platform health */}
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { label: 'New users today',        value: stats?.new_users_today ?? 0,    icon: '🆕' },
                  { label: 'Videos uploaded today',  value: stats?.videos_today ?? 0,        icon: '📤' },
                  { label: 'Orders today',           value: stats?.orders_today ?? 0,        icon: '📦' },
                  { label: 'Active right now',       value: stats?.active_now ?? 0,          icon: '🟢' },
                  { label: 'Failed video jobs',      value: stats?.failed_video_jobs ?? 0,   icon: '⚠️' },
                  { label: 'Queue size',             value: stats?.queue_size ?? 0,           icon: '⚡' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 bg-flockr-card rounded-flockr border border-white/[0.06] p-4">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="text-white font-bold text-lg leading-tight">{item.value}</p>
                      <p className="text-flockr-muted text-xs">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Users ─────────────────────────────────────────────────── */}
          {activeTab === 'users' && (
            <div className="bg-flockr-card rounded-flockr-lg border border-white/[0.06] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h2 className="font-display font-bold text-white text-base">Recent Users</h2>
                <Link href="/admin/users" className="text-flockr-orange text-xs hover:underline">View all users</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['User', 'Role', 'Joined', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs text-flockr-muted font-medium uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {recentUsers?.map(user => (
                      <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                            <div>
                              <p className="text-white font-medium">{user.name}</p>
                              <p className="text-flockr-muted text-xs">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`badge ${user.role === 'seller' ? 'badge-orange' : user.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-white/5 text-flockr-muted border-white/10'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-flockr-muted text-xs">
                          {new Date(user.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`badge ${user.is_verified ? 'badge-green' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                            {user.is_verified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {!user.is_verified && user.role === 'seller' && (
                              <button onClick={() => verifyUser(user.id)} className="text-xs text-flockr-green hover:underline">Verify</button>
                            )}
                            <Link href={`/admin/users/${user.id}`} className="text-xs text-flockr-muted hover:text-white transition-colors">View</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Videos moderation ─────────────────────────────────────── */}
          {activeTab === 'videos' && (
            <div className="space-y-4">
              <p className="text-flockr-muted text-sm">{pendingVideos?.length ?? 0} videos pending review</p>
              {pendingVideos?.length === 0 && (
                <div className="text-center py-16">
                  <span className="text-4xl">✅</span>
                  <p className="text-white font-display font-bold text-lg mt-3">All clear!</p>
                  <p className="text-flockr-muted text-sm mt-1">No videos pending moderation.</p>
                </div>
              )}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingVideos?.map(video => (
                  <div key={video.id} className="bg-flockr-card rounded-flockr-lg border border-white/[0.06] overflow-hidden">
                    <div className="relative aspect-[16/9] bg-flockr-surface">
                      {video.thumbnail_url_full
                        ? <img src={video.thumbnail_url_full} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-flockr-muted"><span className="text-3xl">🎬</span></div>
                      }
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-white text-sm font-medium line-clamp-1">{video.title ?? 'Untitled'}</p>
                        <p className="text-flockr-muted text-xs">@{video.user?.username} · {(video.duration_seconds / 60).toFixed(1)} min</p>
                      </div>
                      {video.captions && (
                        <p className="text-flockr-muted text-xs line-clamp-2 bg-flockr-surface rounded-lg p-2">{video.captions}</p>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => approveVideo(video.id)} className="flex-1 btn-primary text-xs py-2">✓ Approve</button>
                        <button
                          onClick={() => { const r = prompt('Rejection reason:'); if (r) rejectVideo(video.id, r) }}
                          className="flex-1 text-xs py-2 rounded-full border border-flockr-red/40 text-flockr-red hover:bg-flockr-red/10 transition-colors"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Orders ────────────────────────────────────────────────── */}
          {activeTab === 'orders' && (
            <div className="bg-flockr-card rounded-flockr-lg border border-white/[0.06] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h2 className="font-display font-bold text-white text-base">Flagged Orders</h2>
                <Link href="/admin/orders" className="text-flockr-orange text-xs hover:underline">All orders</Link>
              </div>
              {flaggedOrders?.length === 0 ? (
                <div className="py-16 text-center">
                  <span className="text-4xl">✅</span>
                  <p className="text-flockr-muted text-sm mt-3">No flagged orders.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {flaggedOrders?.map(order => (
                    <div key={order.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{order.reference}</p>
                        <p className="text-flockr-muted text-xs">{order.buyer?.name} → {order.seller?.name}</p>
                      </div>
                      <p className="text-white font-bold naira">₦{Number(order.total).toLocaleString()}</p>
                      <span className={`badge ${order.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'badge-orange'}`}>{order.status}</span>
                      <Link href={`/admin/orders/${order.id}`} className="text-xs text-flockr-orange hover:underline">Review</Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

AdminDashboard.layout = page => <AppLayout>{page}</AppLayout>

function formatCount(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
