import AppLayout from '@/Layouts/AppLayout'
import { Head, Link, usePage } from '@inertiajs/react'
import { useState } from 'react'
import ProductCard from '@/Components/Product/ProductCard'
import VerifiedBadge from '@/Components/VerifiedBadge';
import {
    RiArrowRightLine, RiBookmarkLine, RiCheckboxCircleLine,
    RiCloseCircleLine, RiGiftLine, RiGroupLine, RiHeartLine,
    RiLoader4Line, RiPlayCircleLine, RiRefreshLine,
    RiSettings4Line, RiShoppingBagLine, RiTimeLine, RiTruckLine,
    RiVerifiedBadgeLine,
} from 'react-icons/ri'
import { MdOutlinePersonOutline } from 'react-icons/md'

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusColor(status) {
    const map = {
        pending:    { bg: 'rgba(234,179,8,0.12)',   text: '#EAB308', label: 'Pending'    },
        paid:       { bg: 'rgba(16,185,129,0.12)',  text: '#10B981', label: 'Paid'       },
        confirmed:  { bg: 'rgba(59,130,246,0.12)',  text: '#3B82F6', label: 'Confirmed'  },
        processing: { bg: 'rgba(139,92,246,0.12)',  text: '#8B5CF6', label: 'Processing' },
        shipped:    { bg: 'rgba(59,130,246,0.12)',  text: '#3B82F6', label: 'Shipped'    },
        delivered:  { bg: 'rgba(16,185,129,0.12)',  text: '#10B981', label: 'Delivered'  },
        cancelled:  { bg: 'rgba(239,68,68,0.12)',   text: '#EF4444', label: 'Cancelled'  },
        refunded:   { bg: 'rgba(156,163,175,0.12)', text: '#9CA3AF', label: 'Refunded'   },
    }
    return map[status] ?? { bg: 'rgba(255,255,255,0.08)', text: '#fff', label: status }
}

function statusIcon(status) {
    const size = 14
    const map = {
        pending:    <RiTimeLine size={size} />,
        paid:       <RiCheckboxCircleLine size={size} />,
        confirmed:  <RiCheckboxCircleLine size={size} />,
        processing: <RiLoader4Line size={size} />,
        shipped:    <RiTruckLine size={size} />,
        delivered:  <RiGiftLine size={size} />,
        cancelled:  <RiCloseCircleLine size={size} />,
        refunded:   <RiRefreshLine size={size} />,
    }
    return map[status] ?? <RiShoppingBagLine size={size} />
}

function TrackingBar({ status }) {
    const steps = [
        { key: 'confirmed',  label: 'Confirmed',  Icon: RiCheckboxCircleLine },
        { key: 'processing', label: 'Processing', Icon: RiLoader4Line },
        { key: 'shipped',    label: 'Shipped',    Icon: RiTruckLine },
        { key: 'delivered',  label: 'Delivered',  Icon: RiGiftLine },
    ]
    const currentIdx = steps.findIndex(s => s.key === status)
    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 14px', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {steps.map((step, i) => (
                    <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: i <= currentIdx ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${i <= currentIdx ? '#10B981' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <step.Icon size={11} color={i <= currentIdx ? '#10B981' : 'rgba(255,255,255,0.2)'} />
                            </div>
                            <span style={{ color: i <= currentIdx ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)', fontSize: 9, whiteSpace: 'nowrap', fontWeight: i === currentIdx ? 700 : 400 }}>{step.label}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{ flex: 1, height: 1.5, background: i < currentIdx ? '#10B981' : 'rgba(255,255,255,0.08)', margin: '0 4px', marginBottom: 14 }} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

// Same VideoThumb as Explore page
function VideoThumb({ video }) {
    return (
        <Link
            href={`/@${video.user?.username}/video/${video.ulid}`}
            className="group relative block overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111]"
            style={{ textDecoration: 'none' }}
        >
            <div className="relative aspect-[9/16] w-full">
                {video.thumbnail_url_full
                    ? <img src={video.thumbnail_url_full} alt={video.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    : <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center"><RiPlayCircleLine size={28} color="rgba(255,255,255,0.2)" /></div>
                }
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                    <div className="flex items-center gap-2">
                        <img
                            src={video.user?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(video.user?.name ?? 'U')}&background=111111`}
                            className="h-7 w-7 rounded-full object-cover"
                            alt=""
                        />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-white">{video.user?.name}</p>
                            <p className="truncate text-[11px] text-white/45">@{video.user?.username}</p>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function UserDashboard({ orders = [], savedProducts = [], savedVideos = [] }) {
    const { auth } = usePage().props
    const [tab, setTab] = useState('orders')

    const kpis = [
        { label: 'Orders',       value: orders.length,                      Icon: RiShoppingBagLine },
        { label: 'Wishlist',     value: savedProducts.length,               Icon: RiHeartLine },
        { label: 'Saved Videos', value: savedVideos.length,                 Icon: RiBookmarkLine },
        { label: 'Following',    value: auth?.user?.following_count ?? 0,   Icon: RiGroupLine },
    ]

    const tabs = [
        { key: 'orders',   label: 'Orders',       Icon: RiShoppingBagLine },
        { key: 'wishlist', label: 'Wishlist',      Icon: RiHeartLine },
        { key: 'saved',    label: 'Saved Videos',  Icon: RiBookmarkLine },
    ]

    return (
        <>
            <Head title="My Dashboard" />

            <div style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: '#0a0a0a', color: '#fff', fontFamily: 'DM Sans, sans-serif', scrollbarWidth: 'none' }}>

                {/* ── Header ─────────────────────────────────────────────── */}
                <header style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(20px)', background: 'rgba(10,10,10,0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ maxWidth: 1100, height: 68, margin: 'auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B35' }}>
                                <MdOutlinePersonOutline size={20} />
                            </div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>My Dashboard</h1>
                                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Personal Account</p>
                            </div>
                        </div>
                        <Link href="/settings/profile" style={{ height: 36, width: 36, borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                            <RiSettings4Line size={16} />
                        </Link>
                    </div>
                </header>

                <main style={{ maxWidth: 1100, margin: 'auto', padding: '28px 24px 100px' }}>

                    {/* ── Profile card ───────────────────────────────────── */}
                    <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }} className='flex-col lg:flex-row gap-8'>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,92,0,0.3)', background: 'linear-gradient(135deg,#ff5c00,#ff8c00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
                                {auth?.user?.avatar_url
                                    ? <img src={auth.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : (auth?.user?.name?.[0] ?? 'U').toUpperCase()
                                }
                            </div>
                            <div>
                                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: 0 }}>Welcome back</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                    <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 22, margin: 0, letterSpacing: '-0.5px' }}>{auth?.user?.name}</h2>
                                    <VerifiedBadge type={auth?.user?.verification_type} size={18} />
                                </div>
                                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '2px 0 0' }}>@{auth?.user?.username}</p>
                            </div>
                        </div>
                        <Link href={`/@${auth?.user?.username}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                            View Profile <RiArrowRightLine size={14} />
                        </Link>
                    </section>

                    {/* ── KPI Grid ───────────────────────────────────────── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
                        {kpis.map(kpi => (
                            <div key={kpi.label} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 22, padding: '20px' }}>
                                <div style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                    <kpi.Icon size={19} color="rgba(255,255,255,0.6)" />
                                </div>
                                <h3 style={{ margin: '0 0 4px', fontSize: 30, letterSpacing: '-1px', color: '#fff' }}>{kpi.value}</h3>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{kpi.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── Tab nav ────────────────────────────────────────── */}
                    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 24 }}>
                        {tabs.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 18px', background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid #FF6B35' : '2px solid transparent', color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                <t.Icon size={15} />
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── ORDERS ─────────────────────────────────────────── */}
                    {tab === 'orders' && (
                        orders.length === 0 ? (
                            <Empty Icon={RiShoppingBagLine} title="No orders yet" sub="Your purchases will appear here." cta={{ label: 'Start Shopping', href: '/shop' }} />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {orders.map(order => {
                                    const cfg = statusColor(order.status)
                                    return (
                                        <Link key={order.id} href={`/orders/${order.id}`} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden', textDecoration: 'none', display: 'block' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div>
                                                    <p style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, margin: 0 }}>{order.reference}</p>
                                                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '3px 0 0' }}>
                                                        {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <span style={{ background: cfg.bg, color: cfg.text, borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>{cfg.label}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px' }}>
                                                <div style={{ display: 'flex' }}>
                                                    {order.items?.slice(0, 3).map((item, i) => (
                                                        <div key={i} style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '2px solid #111', marginLeft: i > 0 ? -12 : 0, overflow: 'hidden', flexShrink: 0 }}>
                                                            {item.product?.images?.[0]
                                                                ? <img src={item.product.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiShoppingBagLine size={14} color="rgba(255,255,255,0.2)" /></div>
                                                            }
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {order.items?.[0]?.product_name}{order.items?.length > 1 ? ` +${order.items.length - 1} more` : ''}
                                                    </p>
                                                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '3px 0 0' }}>from @{order.seller?.username}</p>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <p style={{ color: '#FF6B35', fontWeight: 800, fontSize: 15, margin: 0 }}>₦{Number(order.total).toLocaleString()}</p>
                                                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: '3px 0 0' }}>{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                            {['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status) && (
                                                <div style={{ padding: '0 18px 14px' }}><TrackingBar status={order.status} /></div>
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>
                        )
                    )}

                    {/* ── WISHLIST ───────────────────────────────────────── */}
                    {tab === 'wishlist' && (
                        savedProducts.length === 0
                            ? <Empty Icon={RiHeartLine} title="Your wishlist is empty" sub="Save products you love and find them here." cta={{ label: 'Browse Shop', href: '/shop' }} />
                            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }} className="md:grid-cols-3 lg:grid-cols-4">
                                {savedProducts.map(p => <ProductCard key={p.id} product={p} />)}
                              </div>
                    )}

                    {/* ── SAVED VIDEOS ───────────────────────────────────── */}
                    {tab === 'saved' && (
                        savedVideos.length === 0
                            ? <Empty Icon={RiBookmarkLine} title="No saved videos" sub="Bookmark videos you want to watch again." cta={{ label: 'Explore Videos', href: '/' }} />
                            : <div style={{ display: 'grid', gap: 8 }} className="lg:grid-cols-6 grid-cols-2">
                                {savedVideos.map(v => <VideoThumb key={v.id} video={v} />)}
                              </div>
                    )}
                </main>
            </div>
        </>
    )
}

UserDashboard.layout = page => <AppLayout>{page}</AppLayout>

function Empty({ Icon, title, sub, cta }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 14, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={28} color="rgba(255,255,255,0.2)" />
            </div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: 0 }}>{title}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>{sub}</p>
            {cta && (
                <Link href={cta.href} style={{ marginTop: 6, padding: '11px 28px', background: '#FF6B35', borderRadius: 999, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                    {cta.label}
                </Link>
            )}
        </div>
    )
}