import { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'

export default function SellerDashboard({ stats, recentOrders, topProducts, recentVideos }) {
  const [period, setPeriod] = useState('7d')

  return (
    <>
      <Head title="Seller Dashboard" />

      <div className="h-screen overflow-y-auto scroll-hidden bg-flockr-black">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-flockr-black/90 backdrop-blur-md border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div>
              <h1 className="font-display font-bold text-white text-xl">Seller Dashboard</h1>
              <p className="text-flockr-muted text-xs mt-0.5">Track your sales and grow your store</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Period selector */}
              <div className="flex items-center gap-1 bg-flockr-card rounded-xl border border-white/[0.06] p-1">
                {['7d', '30d', '90d'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p ? 'bg-flockr-orange text-white' : 'text-flockr-muted hover:text-white'}`}
                  >
                    {p === '7d' ? '7 days' : p === '30d' ? '30 days' : '90 days'}
                  </button>
                ))}
              </div>
              <Link href="/seller/upload" className="btn-primary text-sm py-2.5 px-4">+ Upload Video</Link>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-6 pb-24 md:pb-8 space-y-8">

          {/* ── KPI Cards ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Revenue',     value: `₦${Number(stats?.revenue ?? 0).toLocaleString()}`,   icon: '💰', change: stats?.revenue_change,    color: 'text-flockr-green' },
              { label: 'Orders',      value: stats?.orders_count ?? 0,                              icon: '📦', change: stats?.orders_change,     color: 'text-blue-400' },
              { label: 'Views',       value: formatCount(stats?.views_count ?? 0),                  icon: '👁',  change: stats?.views_change,      color: 'text-purple-400' },
              { label: 'Followers',   value: formatCount(stats?.followers_count ?? 0),              icon: '👥', change: stats?.followers_change,   color: 'text-flockr-amber' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-flockr-card rounded-flockr-lg border border-white/[0.06] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{kpi.icon}</span>
                  {kpi.change != null && (
                    <span className={`text-xs font-semibold ${kpi.change >= 0 ? 'text-flockr-green' : 'text-flockr-red'}`}>
                      {kpi.change >= 0 ? '↑' : '↓'} {Math.abs(kpi.change)}%
                    </span>
                  )}
                </div>
                <p className={`font-display font-bold text-2xl ${kpi.color}`}>{kpi.value}</p>
                <p className="text-flockr-muted text-xs mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* ── Main grid ────────────────────────────────────────────── */}
          <div className="grid md:grid-cols-3 gap-6">

            {/* Recent Orders */}
            <div className="md:col-span-2 bg-flockr-card rounded-flockr-lg border border-white/[0.06]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h2 className="font-display font-bold text-white text-base">Recent Orders</h2>
                <Link href="/seller/orders" className="text-flockr-orange text-xs hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {!recentOrders?.length && (
                  <div className="px-5 py-10 text-center">
                    <p className="text-4xl mb-2">📦</p>
                    <p className="text-flockr-muted text-sm">No orders yet. Share your videos to get sales!</p>
                  </div>
                )}
                {recentOrders?.map(order => (
                  <div key={order.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-flockr-surface flex items-center justify-center shrink-0">
                      <span className="text-lg">{statusEmoji(order.status)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{order.reference}</p>
                      <p className="text-flockr-muted text-xs">{order.buyer?.name} · {order.items_count} item{order.items_count !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white font-semibold text-sm naira">₦{Number(order.total).toLocaleString()}</p>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusStyle(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-flockr-card rounded-flockr-lg border border-white/[0.06]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h2 className="font-display font-bold text-white text-base">Top Products</h2>
                <Link href="/seller/products" className="text-flockr-orange text-xs hover:underline">Manage</Link>
              </div>
              <div className="p-3 space-y-2">
                {!topProducts?.length && (
                  <div className="py-8 text-center">
                    <p className="text-3xl mb-2">🛍</p>
                    <p className="text-flockr-muted text-xs">Add products to start selling</p>
                    <Link href="/seller/products/create" className="btn-primary text-xs py-2 px-4 mt-3 inline-block">Add Product</Link>
                  </div>
                )}
                {topProducts?.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <span className="text-flockr-muted text-xs font-bold w-4 shrink-0 text-center">{i + 1}</span>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-flockr-surface shrink-0">
                      {p.primary_image
                        ? <img src={p.primary_image} alt={p.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-flockr-subtle" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium line-clamp-1">{p.name}</p>
                      <p className="text-flockr-muted text-[11px]">{p.orders_count} sold</p>
                    </div>
                    <p className="text-flockr-orange text-xs font-bold naira shrink-0">₦{Number(p.price).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Recent Videos ─────────────────────────────────────────── */}
          <div className="bg-flockr-card rounded-flockr-lg border border-white/[0.06]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="font-display font-bold text-white text-base">Your Videos</h2>
              <Link href="/seller/videos" className="text-flockr-orange text-xs hover:underline">View all</Link>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* Upload new */}
              <Link href="/seller/upload" className="aspect-[9/16] rounded-flockr overflow-hidden border-2 border-dashed border-white/[0.12] hover:border-flockr-orange/50 flex flex-col items-center justify-center gap-2 text-flockr-muted hover:text-flockr-orange transition-all group">
                <div className="w-10 h-10 rounded-full bg-white/[0.04] group-hover:bg-flockr-orange/10 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <span className="text-[11px] font-medium text-center leading-tight px-2">Upload Video</span>
              </Link>

              {recentVideos?.map(video => (
                <Link key={video.id} href={`/video/${video.id}`} className="relative aspect-[9/16] rounded-flockr overflow-hidden group">
                  {video.thumbnail_url_full
                    ? <img src={video.thumbnail_url_full} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="w-full h-full bg-flockr-surface flex items-center justify-center"><span className="text-2xl">🎬</span></div>
                  }
                  <div className="video-overlay absolute inset-0" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center gap-2 text-white/80 text-[10px]">
                      <span>👁 {formatCount(video.views_count)}</span>
                      <span>❤️ {formatCount(video.likes_count)}</span>
                    </div>
                  </div>
                  {video.status !== 'active' && (
                    <div className="absolute top-2 left-2">
                      <span className={`badge text-[9px] ${video.status === 'processing' ? 'badge-orange' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                        {video.status}
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* ── Quick actions ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/seller/products/create', icon: '➕', label: 'Add Product',    sub: 'List a new item' },
              { href: '/seller/upload',          icon: '🎬', label: 'Upload Video',   sub: 'Reach more buyers' },
              { href: '/seller/payouts',         icon: '💳', label: 'Payouts',        sub: 'Withdraw earnings' },
              { href: '/seller/settings',        icon: '⚙️', label: 'Store Settings', sub: 'Edit your shop' },
            ].map(a => (
              <Link key={a.href} href={a.href} className="flex flex-col items-center gap-2 p-4 bg-flockr-card rounded-flockr-lg border border-white/[0.06] hover:border-flockr-orange/30 hover:bg-flockr-orange/5 transition-all group text-center">
                <span className="text-3xl">{a.icon}</span>
                <div>
                  <p className="text-white text-sm font-semibold">{a.label}</p>
                  <p className="text-flockr-muted text-xs">{a.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

SellerDashboard.layout = page => <AppLayout>{page}</AppLayout>

function formatCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function statusEmoji(status) {
  const map = { pending: '⏳', paid: '✅', confirmed: '🔄', processing: '📦', shipped: '🚚', delivered: '🎉', cancelled: '❌', refunded: '↩️' }
  return map[status] ?? '📦'
}

function statusStyle(status) {
  const map = {
    pending:    'bg-yellow-500/10 text-yellow-400',
    paid:       'bg-green-500/10 text-green-400',
    shipped:    'bg-blue-500/10 text-blue-400',
    delivered:  'bg-flockr-green/10 text-flockr-green',
    cancelled:  'bg-red-500/10 text-red-400',
  }
  return map[status] ?? 'bg-white/5 text-white/60'
}
