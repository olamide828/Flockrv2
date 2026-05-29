import { useState } from 'react'
import { Head, Link, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import ProductCard from '@/Components/Product/ProductCard'
import axios from 'axios'

const STATUS_COLORS = {
  pending:    { bg: 'rgba(255,179,0,0.12)',   text: '#ffb300', label: 'Pending'    },
  paid:       { bg: 'rgba(0,217,126,0.12)',   text: '#00d97e', label: 'Paid'       },
  confirmed:  { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa', label: 'Confirmed'  },
  processing: { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa', label: 'Processing' },
  shipped:    { bg: 'rgba(139,92,246,0.12)',  text: '#a78bfa', label: 'Shipped'    },
  delivered:  { bg: 'rgba(0,217,126,0.12)',   text: '#00d97e', label: 'Delivered'  },
  cancelled:  { bg: 'rgba(255,59,92,0.12)',   text: '#ff3b5c', label: 'Cancelled'  },
}

export default function UserDashboard({ orders = [], savedProducts = [], savedVideos = [] }) {
  const { auth } = usePage().props
  const [tab, setTab] = useState('orders')

  const tabs = [
    { key: 'orders',  label: 'Orders',        count: orders.length,        icon: '📦' },
    { key: 'wishlist',label: 'Wishlist',       count: savedProducts.length, icon: '❤️' },
    { key: 'saved',   label: 'Saved Videos',  count: savedVideos.length,   icon: '🔖' },
  ]

  return (
    <>
      <Head title="My Dashboard" />
      <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 80 }}>

        {/* Header */}
        <div style={{
          background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '16px 20px',
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <h1 style={{ color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: 0 }}>
            My Dashboard
          </h1>
        </div>

        {/* Profile summary */}
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff5c00, #ff8c00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0,
            fontFamily: 'var(--font-display)',
            overflow: 'hidden',
          }}>
            {auth?.user?.avatar_url
              ? <img src={auth.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (auth?.user?.name?.[0] ?? 'U').toUpperCase()
            }
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>{auth?.user?.name}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '2px 0 0' }}>@{auth?.user?.username}</p>
          </div>
          <Link
            href="/settings/profile"
            style={{
              padding: '8px 16px', borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
          >
            ⚙️ Settings
          </Link>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, padding: '16px 20px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { label: 'Orders',        value: orders.length,        icon: '📦' },
            { label: 'Wishlist',      value: savedProducts.length, icon: '❤️' },
            { label: 'Saved Videos',  value: savedVideos.length,   icon: '🔖' },
            { label: 'Following',     value: auth?.user?.following_count ?? 0, icon: '👥' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '14px 18px', flexShrink: 0, textAlign: 'center', minWidth: 90,
            }}>
              <p style={{ fontSize: 20, margin: '0 0 4px' }}>{s.icon}</p>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)', margin: 0 }}>{s.value}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '2px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tab nav */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', margin: '0 20px' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '12px 8px', background: 'none', border: 'none',
                borderBottom: tab === t.key ? '2px solid #ff5c00' : '2px solid transparent',
                color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.count > 0 && (
                <span style={{
                  background: tab === t.key ? '#ff5c00' : 'rgba(255,255,255,0.1)',
                  color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700,
                  padding: '1px 6px', minWidth: 18, textAlign: 'center',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: '16px 20px' }}>

          {/* ── ORDERS ─────────────────────────────────────────────── */}
          {tab === 'orders' && (
            orders.length === 0 ? (
              <Empty emoji="📦" title="No orders yet" sub="Your purchases will appear here." cta={{ label: 'Start Shopping', href: '/shop' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {orders.map(order => {
                  const cfg = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending
                  return (
                    <Link key={order.id} href={`/orders/${order.id}`} style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 14, overflow: 'hidden', textDecoration: 'none', display: 'block',
                    }}>
                      {/* Order header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          {/* FIX: Show order tracking code prominently */}
                          <p style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, margin: 0 }}>
                            {order.reference}
                          </p>
                          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '2px 0 0' }}>
                            {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <span style={{
                          background: cfg.bg, color: cfg.text,
                          borderRadius: 999, padding: '4px 10px',
                          fontSize: 11, fontWeight: 700,
                        }}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Items preview */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                        {/* Product images */}
                        <div style={{ display: 'flex' }}>
                          {order.items?.slice(0, 3).map((item, i) => (
                            <div key={i} style={{
                              width: 38, height: 38, borderRadius: 8,
                              background: 'rgba(255,255,255,0.06)',
                              border: '2px solid #0a0a0a',
                              marginLeft: i > 0 ? -10 : 0,
                              overflow: 'hidden', flexShrink: 0,
                            }}>
                              {item.product?.images?.[0]
                                ? <img src={item.product.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📦</div>
                              }
                            </div>
                          ))}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#fff', fontSize: 13, margin: 0, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {order.items?.[0]?.product_name}
                            {order.items?.length > 1 ? ` + ${order.items.length - 1} more` : ''}
                          </p>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '2px 0 0' }}>
                            from @{order.seller?.username}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ color: '#ff5c00', fontWeight: 700, fontSize: 14, margin: 0 }}>
                            ₦{Number(order.total).toLocaleString()}
                          </p>
                          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: '2px 0 0' }}>
                            {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Tracking progress bar for in-progress orders */}
                      {['confirmed','processing','shipped','delivered'].includes(order.status) && (
                        <div style={{ padding: '0 14px 12px' }}>
                          <TrackingBar status={order.status} />
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )
          )}

          {/* ── WISHLIST ────────────────────────────────────────────── */}
          {tab === 'wishlist' && (
            savedProducts.length === 0 ? (
              <Empty emoji="❤️" title="Your wishlist is empty" sub="Save products you love and they'll appear here." cta={{ label: 'Browse Shop', href: '/shop' }} />
            ) : (
              <div style={{ display: 'grid', gap: 10 }} className='lg:grid-cols-6 grid-cols-2 lg:w-full w-100'>
                {savedProducts.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )
          )}

          {/* ── SAVED VIDEOS ─────────────────────────────────────────── */}
          {tab === 'saved' && (
            savedVideos.length === 0 ? (
              <Empty emoji="🔖" title="No saved videos" sub="Bookmark videos you want to watch again." cta={{ label: 'Explore Videos', href: '/' }} />
            ) : (
              <div style={{ display: 'grid', gap: 4 }} className='grid-cols-3 lg:grid-cols-6'>
                {savedVideos.map(video => (
                  <Link key={video.id} href={`/video/${video.id}`} style={{
                    position: 'relative', aspectRatio: '9/16', display: 'block',
                    borderRadius: 10, overflow: 'hidden', background: '#111', textDecoration: 'none',
                  }}>
                    {video.thumbnail_url_full && (
                      <img src={video.thumbnail_url_full} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
                    <div style={{ position: 'absolute', bottom: 6, left: 6, right: 6 }}>
                       <img src={video.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(video.name)}&background=1a1a1a`}
                            alt={video.name} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      <p className='text-[12px] truncate'>{video.user?.name}</p>
                      <p style={{ color: '#fff', fontSize: 10, fontWeight: 500, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {video.title ?? video.description ?? 'no-title'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </>
  )
}

UserDashboard.layout = page => <AppLayout>{page}</AppLayout>

function TrackingBar({ status }) {
  const steps = ['confirmed', 'processing', 'shipped', 'delivered']
  const currentIdx = steps.indexOf(status)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {steps.map((step, i) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: i <= currentIdx ? '#00d97e' : 'rgba(255,255,255,0.15)',
              transition: 'background 0.3s',
            }} />
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1.5, background: i < currentIdx ? '#00d97e' : 'rgba(255,255,255,0.1)' }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {['Confirmed', 'Processing', 'Shipped', 'Delivered'].map(l => (
          <span key={l} style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

function Empty({ emoji, title, sub, cta }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12, textAlign: 'center' }}>
      <span style={{ fontSize: 48 }}>{emoji}</span>
      <p style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: 0 }}>{title}</p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>{sub}</p>
      {cta && (
        <Link href={cta.href} style={{
          marginTop: 8, padding: '11px 28px', background: '#ff5c00', borderRadius: 999,
          color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none',
          fontFamily: 'var(--font-display)',
        }}>
          {cta.label}
        </Link>
      )}
    </div>
  )
}