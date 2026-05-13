import { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', emoji: '⏳' },
  paid:       { label: 'Paid',       color: 'badge-green',                                            emoji: '✅' },
  confirmed:  { label: 'Confirmed',  color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',        emoji: '🔄' },
  processing: { label: 'Processing', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',        emoji: '📦' },
  shipped:    { label: 'Shipped',    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',  emoji: '🚚' },
  delivered:  { label: 'Delivered',  color: 'badge-green',                                            emoji: '🎉' },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-500/10 text-red-400 border-red-500/20',           emoji: '❌' },
  refunded:   { label: 'Refunded',   color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',        emoji: '↩️' },
}

export default function OrdersList({ orders }) {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <>
      <Head title="My Orders" />
      <div className="h-screen overflow-y-auto scroll-hidden bg-flockr-black">

        {/* Header */}
        <div className="sticky top-0 z-20 bg-flockr-black/90 backdrop-blur-md border-b border-white/[0.06] px-5 py-4">
          <h1 className="font-display font-bold text-white text-xl">My Orders</h1>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 px-5 py-3 overflow-x-auto scroll-hidden border-b border-white/[0.06]">
          {['all', 'paid', 'shipped', 'delivered', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                filter === s ? 'bg-flockr-orange text-white' : 'bg-flockr-card text-flockr-muted border border-white/[0.06] hover:text-white'
              }`}
            >
              {s === 'all' ? 'All Orders' : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 pb-28 md:pb-8 space-y-3">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <span className="text-5xl">📦</span>
              <p className="text-white font-display font-bold text-lg">No orders yet</p>
              <p className="text-flockr-muted text-sm">Your purchases will appear here.</p>
              <Link href="/shop" className="btn-primary text-sm py-2.5 px-6 mt-2">Start Shopping</Link>
            </div>
          )}
          {filtered.map(order => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-flockr-card rounded-flockr-lg border border-white/[0.06] hover:border-white/[0.12] transition-all overflow-hidden"
              >
                {/* Order header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                  <div>
                    <p className="text-white font-mono text-sm font-bold">{order.reference}</p>
                    <p className="text-flockr-muted text-xs mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`badge ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
                </div>

                {/* Items preview */}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {order.items?.slice(0, 3).map((item, i) => (
                        <div key={i} className="w-10 h-10 rounded-lg bg-flockr-surface border border-flockr-card overflow-hidden">
                          {item.product?.primary_image
                            ? <img src={item.product.primary_image} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-xs">📦</div>
                          }
                        </div>
                      ))}
                      {order.items?.length > 3 && (
                        <div className="w-10 h-10 rounded-lg bg-flockr-surface border border-flockr-card flex items-center justify-center">
                          <span className="text-flockr-muted text-xs">+{order.items.length - 3}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium line-clamp-1">
                        {order.items?.[0]?.product_name}
                        {order.items?.length > 1 && ` + ${order.items.length - 1} more`}
                      </p>
                      <p className="text-flockr-muted text-xs">from @{order.seller?.username}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white font-bold naira">₦{Number(order.total).toLocaleString()}</p>
                      <p className="text-flockr-muted text-xs">{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Tracking bar for shipped orders */}
                {['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status) && (
                  <div className="px-4 pb-3">
                    <div className="flex items-center gap-1">
                      {['confirmed', 'processing', 'shipped', 'delivered'].map((step, i) => {
                        const steps = ['confirmed', 'processing', 'shipped', 'delivered']
                        const currentIdx = steps.indexOf(order.status)
                        const done = i <= currentIdx
                        return (
                          <div key={step} className="flex items-center flex-1">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${done ? 'bg-flockr-green' : 'bg-flockr-subtle'}`} />
                            {i < 3 && <div className={`h-px flex-1 ${done && i < currentIdx ? 'bg-flockr-green' : 'bg-flockr-subtle'}`} />}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      {['Confirmed', 'Processing', 'Shipped', 'Delivered'].map(l => (
                        <span key={l} className="text-[9px] text-flockr-subtle">{l}</span>
                      ))}
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}

OrdersList.layout = page => <AppLayout>{page}</AppLayout>
