import { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import {
  RiShoppingBagLine,
  RiTimeLine,
  RiCheckboxCircleLine,
  RiRefreshLine,
  RiArchiveDrawerLine,
  RiTruckLine,
  RiGiftLine,
  RiCloseCircleLine,
  RiArrowGoBackLine,
  RiStoreLine,
  RiArrowRightSLine,
  RiAlertLine,
} from 'react-icons/ri'

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'rgba(234,179,8,0.12)',   text: '#EAB308', Icon: RiTimeLine           },
  paid:       { label: 'Paid',       color: 'rgba(16,185,129,0.12)',  text: '#10B981', Icon: RiCheckboxCircleLine },
  confirmed:  { label: 'Confirmed',  color: 'rgba(59,130,246,0.12)',  text: '#3B82F6', Icon: RiRefreshLine        },
  processing: { label: 'Processing', color: 'rgba(59,130,246,0.12)',  text: '#3B82F6', Icon: RiArchiveDrawerLine  },
  shipped:    { label: 'Shipped',    color: 'rgba(139,92,246,0.12)',  text: '#8B5CF6', Icon: RiTruckLine          },
  delivered:  { label: 'Delivered',  color: 'rgba(16,185,129,0.12)', text: '#10B981', Icon: RiGiftLine           },
  cancelled:  { label: 'Cancelled',  color: 'rgba(239,68,68,0.12)',   text: '#EF4444', Icon: RiCloseCircleLine    },
  refunded:   { label: 'Refunded',   color: 'rgba(156,163,175,0.12)',text: '#9CA3AF', Icon: RiArrowGoBackLine    },
  disputed:   { label: 'Disputed',   color: 'rgba(156,163,175,0.12)',text: '#F59E0B', Icon: RiAlertLine    },
}

const TRACKING_STEPS = ['confirmed', 'processing', 'shipped', 'delivered']

export default function OrdersList({ orders = [] }) {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <>
      <Head title="My Orders" />
      <div style={{ height: '100%', overflowY: 'auto', background: '#0A0A0A', color: '#fff', fontFamily: '"DM Sans", sans-serif' }}>

        {/* Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px' }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>My Orders</h1>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {['all', 'pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded', 'disputed'].map(s => {
            const cfg = STATUS_CONFIG[s]
            const active = filter === s
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
                  background: active ? '#FF6B35' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${active ? '#FF6B35' : 'rgba(255,255,255,0.08)'}`,
                  color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {cfg && <cfg.Icon size={12} />}
                {s === 'all' ? 'All Orders' : cfg?.label}
              </button>
            )
          })}
        </div>

        {/* List */}
        <div style={{ padding: '16px 20px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 14, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RiShoppingBagLine size={32} color="rgba(255,255,255,0.2)" />
              </div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: 0 }}>No orders yet</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>Your purchases will appear here.</p>
              <Link href="/shop" style={{ marginTop: 8, padding: '11px 28px', background: '#FF6B35', borderRadius: 999, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                Start Shopping
              </Link>
            </div>
          )}

          {filtered.map(order => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
            const StatusIcon = cfg.Icon
            const currentIdx = TRACKING_STEPS.indexOf(order.status)
            const showTracking = currentIdx !== -1

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                style={{ display: 'block', background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden', textDecoration: 'none', transition: 'border-color 0.15s' }}
              >
                {/* Order header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <p style={{ margin: 0, color: '#fff', fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{order.reference}</p>
                    <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                      {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: cfg.color }}>
                    <StatusIcon size={12} color={cfg.text} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: cfg.text }}>{cfg.label}</span>
                  </div>
                </div>

                {/* Items preview */}
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Product image stack */}
                    <div style={{ display: 'flex', position: 'relative', flexShrink: 0 }}>
                      {order.items?.slice(0, 3).map((item, i) => (
                        <div key={i} style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: 'rgba(255,255,255,0.06)',
                          border: '2px solid #111',
                          overflow: 'hidden', flexShrink: 0,
                          marginLeft: i > 0 ? -10 : 0,
                          position: 'relative', zIndex: 3 - i,
                        }}>
                          {item.product?.primary_image
                            ? <img src={item.product.primary_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <RiShoppingBagLine size={16} color="rgba(255,255,255,0.25)" />
                              </div>
                          }
                        </div>
                      ))}
                      {order.items?.length > 3 && (
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '2px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: -10, zIndex: 0, flexShrink: 0 }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700 }}>+{order.items.length - 3}</span>
                        </div>
                      )}
                    </div>

                    {/* Order meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.items?.[0]?.product_name}
                        {order.items?.length > 1 && ` + ${order.items.length - 1} more`}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <RiStoreLine size={11} color="rgba(255,255,255,0.35)" />
                        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>@{order.seller?.username}</span>
                      </div>
                    </div>

                    {/* Price + arrow */}
                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div>
                        <p style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 15 }}>₦{Number(order.total).toLocaleString()}</p>
                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</p>
                      </div>
                      <RiArrowRightSLine size={18} color="rgba(255,255,255,0.2)" />
                    </div>
                  </div>
                </div>

                {/* Tracking progress bar */}
                {showTracking && (
                  <div style={{ padding: '0 16px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      {TRACKING_STEPS.map((step, i) => {
                        const done = i <= currentIdx
                        return (
                          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: done ? '#10B981' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }} />
                            {i < TRACKING_STEPS.length - 1 && (
                              <div style={{ flex: 1, height: 2, background: done && i < currentIdx ? '#10B981' : 'rgba(255,255,255,0.08)', transition: 'background 0.2s' }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                      {['Confirmed', 'Processing', 'Shipped', 'Delivered'].map((l, i) => (
                        <span key={l} style={{ fontSize: 9, color: i <= currentIdx ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', fontWeight: i === currentIdx ? 700 : 400 }}>{l}</span>
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