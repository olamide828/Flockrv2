import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import ProductCard from '@/Components/Product/ProductCard';

import {
    RiAddLine, RiArrowDownLine, RiArrowRightLine, RiArrowUpLine,
    RiBankCardLine, RiBookmarkLine, RiCheckboxCircleLine, RiCloseCircleLine,
    RiEyeLine, RiGiftLine, RiHeartLine, RiLoader4Line,
    RiMoneyDollarCircleLine, RiPlayCircleLine, RiRefreshLine,
    RiSettings4Line, RiShoppingBagLine, RiStoreLine, RiTimeLine,
    RiTruckLine, RiUploadCloud2Line, RiUserFollowLine, RiVideoLine,
    RiFireLine, RiLockLine, RiTrophyLine, RiSparklingLine,
    RiBarChartBoxLine, RiCloseLine, RiLightbulbFlashLine,
} from 'react-icons/ri';
import { MdOutlineStorefront } from 'react-icons/md';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCount(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return String(n ?? 0);
}

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
    };
    return map[status] ?? { bg: 'rgba(255,255,255,0.08)', text: '#fff', label: status };
}

function statusIcon(status) {
    const size = 14;
    const map = {
        pending:    <RiTimeLine size={size} />,
        paid:       <RiCheckboxCircleLine size={size} />,
        confirmed:  <RiCheckboxCircleLine size={size} />,
        processing: <RiLoader4Line size={size} />,
        shipped:    <RiTruckLine size={size} />,
        delivered:  <RiGiftLine size={size} />,
        cancelled:  <RiCloseCircleLine size={size} />,
        refunded:   <RiRefreshLine size={size} />,
    };
    return map[status] ?? <RiShoppingBagLine size={size} />;
}

function TrackingBar({ status }) {
    const steps = [
        { key: 'confirmed',  label: 'Confirmed',  Icon: RiCheckboxCircleLine },
        { key: 'processing', label: 'Processing', Icon: RiLoader4Line },
        { key: 'shipped',    label: 'Shipped',    Icon: RiTruckLine },
        { key: 'delivered',  label: 'Delivered',  Icon: RiGiftLine },
    ];
    const currentIdx = steps.findIndex(s => s.key === status);
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
    );
}

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
                {video.status && video.status !== 'active' && (
                    <div style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#fff' }}>
                        {video.status === 'processing' && <RiLoader4Line size={10} />}
                        {video.status}
                    </div>
                )}
            </div>
        </Link>
    );
}

// ── Gamification sub-components ────────────────────────────────────────────
function LevelCard({ gamification }) {
    if (!gamification) return null;
    const { level, xp, xp_into_level, xp_for_level, streak_days } = gamification;
    const pct = Math.min(100, Math.round((xp_into_level / xp_for_level) * 100));

    return (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, padding: 24, background: 'linear-gradient(135deg, #1a1a1a 0%, #111 60%)', border: '1px solid rgba(255,107,53,0.15)' }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,107,53,0.08)', filter: 'blur(20px)' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg,#ff6b35,#ff8c00)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(255,107,53,0.35)' }}>
                        <RiTrophyLine size={22} color="#fff" />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Creator Level</p>
                        <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: '#fff' }}>Level {level}</p>
                    </div>
                </div>
                {streak_days > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 999, padding: '7px 14px' }}>
                        <RiFireLine size={15} color="#FB923C" />
                        <span style={{ color: '#FB923C', fontWeight: 800, fontSize: 13 }}>{streak_days} day{streak_days !== 1 ? 's' : ''}</span>
                    </div>
                )}
            </div>
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{xp_into_level.toLocaleString()} / {xp_for_level.toLocaleString()} XP</span>
                    <span style={{ color: '#FF6B35', fontSize: 12, fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#ff6b35,#ff8c00)', borderRadius: 999, transition: 'width 0.5s ease' }} />
                </div>
            </div>
        </div>
    );
}

function BadgesRow({ badges }) {
    if (!badges?.length) return null;
    return (
        <div className="dashboard-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <RiSparklingLine size={16} color="#FF6B35" />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>Achievements</h3>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {badges.map(b => (
                    <div key={b.key} style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '8px 14px', borderRadius: 999,
                        background: b.earned ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${b.earned ? 'rgba(255,107,53,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        opacity: b.earned ? 1 : 0.4,
                    }}>
                        <RiTrophyLine size={13} color={b.earned ? '#FF6B35' : 'rgba(255,255,255,0.3)'} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: b.earned ? '#fff' : 'rgba(255,255,255,0.4)' }}>{b.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function GrowthTips({ tips }) {
    if (!tips?.length) return null;
    return (
        <div className="dashboard-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <RiLightbulbFlashLine size={16} color="#FBBF24" />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>Growth Tips</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tips.map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '11px 14px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 12 }}>
                        <span style={{ color: '#FBBF24', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.5 }}>{tip}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AnalyticsLockedCard({ onClick }) {
    return (
        <button onClick={onClick} style={{
            display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
            padding: '20px 22px', borderRadius: 24, cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.06))',
            border: '1px solid rgba(139,92,246,0.25)',
        }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <RiBarChartBoxLine size={22} color="#A78BFA" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 14 }}>Seller Analytics</p>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', background: 'rgba(139,92,246,0.2)', borderRadius: 999, color: '#A78BFA', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                        <RiLockLine size={9} /> Pro
                    </span>
                </div>
                <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Deep insights on watch time, audience retention, and conversion funnels.</p>
            </div>
            <RiArrowRightLine size={16} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
        </button>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SellerDashboard({
    stats, recentOrders = [], topProducts = [], recentVideos = [],
    orders = [], savedProducts = [], savedVideos = [], gamification = null,
}) {
    const [period, setPeriod] = useState('30d');
    const [tab, setTab] = useState('overview');
    const [showProModal, setShowProModal] = useState(false);

    const kpis = [
        { label: 'Revenue',   value: `₦${Number(stats?.revenue ?? 0).toLocaleString()}`, icon: RiMoneyDollarCircleLine, change: stats?.revenue_change, highlight: true },
        { label: 'Orders',    value: stats?.orders_count ?? 0,                            icon: RiShoppingBagLine,       change: stats?.orders_change },
        { label: 'Views',     value: formatCount(stats?.views_count ?? 0),               icon: RiEyeLine,               change: stats?.views_change },
        { label: 'Followers', value: formatCount(stats?.followers_count ?? 0),           icon: RiUserFollowLine,        change: stats?.followers_change },
    ];

    const quickActions = [
        { href: '/seller/products/create', icon: RiAddLine,         label: 'Add Product' },
        { href: '/seller/upload',          icon: RiUploadCloud2Line, label: 'Upload Video' },
        { href: '/seller/payouts',         icon: RiBankCardLine,     label: 'Payouts' },
        { href: '/seller/settings',        icon: RiSettings4Line,    label: 'Settings' },
    ];

    const tabs = [
        { key: 'overview',  label: 'Overview',      Icon: MdOutlineStorefront },
        { key: 'orders',    label: 'My Orders',     Icon: RiShoppingBagLine },
        { key: 'wishlist',  label: 'Wishlist',      Icon: RiHeartLine },
        { key: 'saved',     label: 'Saved Videos',  Icon: RiBookmarkLine },
    ];

    return (
        <>
            <Head title="Seller Dashboard" />

            {showProModal && (
                <>
                    <div onClick={() => setShowProModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} />
                    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(380px,90vw)', zIndex: 201, background: '#131313', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 24, padding: 26, textAlign: 'center' }}>
                        <button onClick={() => setShowProModal(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                            <RiCloseLine size={15} />
                        </button>
                        <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <RiBarChartBoxLine size={26} color="#A78BFA" />
                        </div>
                        <p style={{ color: '#fff', fontWeight: 800, fontSize: 17, margin: '0 0 8px' }}>Analytics is launching soon</p>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.6, margin: '0 0 20px' }}>
                            Deep video and sales analytics is coming as a Pro feature. We'll let you know the moment it's ready.
                        </p>
                        <button onClick={() => setShowProModal(false)} style={{ width: '100%', padding: 13, background: 'linear-gradient(135deg,#8B5CF6,#6366F1)', border: 'none', borderRadius: 999, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                            Got it
                        </button>
                    </div>
                </>
            )}

            <div className="seller-dashboard">
                {/* HEADER */}
                <header className="dashboard-header">
                    <div className="dashboard-header-inner">
                        <div className="dashboard-brand">
                            <div className="dashboard-logo"><MdOutlineStorefront size={18} /></div>
                            <div>
                                <h1>Dashboard</h1>
                                <p>Seller Studio</p>
                            </div>
                        </div>
                        <div className="dashboard-header-actions">
                            <div className="period-switcher">
                                {['7d', '30d', '90d'].map(p => (
                                    <button key={p} onClick={() => setPeriod(p)} className={period === p ? 'active' : ''}>{p.toUpperCase()}</button>
                                ))}
                            </div>
                            <Link href="/seller/upload" className="upload-btn">
                                <RiUploadCloud2Line size={16} /> Upload
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="dashboard-content">

                    {/* HERO */}
                    <section className="hero-section">
                        <div>
                            <p className="hero-subtitle">Welcome back</p>
                            <h2>Your store is growing</h2>
                        </div>
                        {stats?.revenue_change != null && (
                            <div className="hero-stat-card">
                                <span>This Month</span>
                                <strong style={{ color: stats.revenue_change >= 0 ? '#22c55e' : '#ef4444' }}>
                                    {stats.revenue_change >= 0 ? '+' : ''}{stats.revenue_change}% Sales
                                </strong>
                            </div>
                        )}
                    </section>

                    {/* KPI GRID */}
                    <section className="kpi-grid">
                        {kpis.map(kpi => {
                            const Icon = kpi.icon;
                            const up = (kpi.change ?? 0) >= 0;
                            return (
                                <div className="kpi-card" key={kpi.label}>
                                    <div className="kpi-top">
                                        <div className="kpi-icon"><Icon size={20} /></div>
                                        {kpi.change != null && (
                                            <div className={`kpi-change ${up ? 'up' : 'down'}`}>
                                                {up ? <RiArrowUpLine size={12} /> : <RiArrowDownLine size={12} />}
                                                <span>{Math.abs(kpi.change)}%</span>
                                            </div>
                                        )}
                                    </div>
                                    <h3 className={kpi.highlight ? 'highlight' : ''}>{kpi.value}</h3>
                                    <p>{kpi.label}</p>
                                </div>
                            );
                        })}
                    </section>

                    {/* ── GAMIFICATION SECTION ─────────────────────────────── */}
                    {gamification && (
                        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <LevelCard gamification={gamification} />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                                <BadgesRow badges={gamification.badges} />
                                <GrowthTips tips={gamification.tips} />
                            </div>
                            <AnalyticsLockedCard onClick={() => setShowProModal(true)} />
                        </section>
                    )}

                    {/* ── TAB NAV ──────────────────────────────────────────── */}
                    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 24, overflowX: 'auto', scrollbarWidth: 'none' }}>
                        {tabs.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 18px', background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid #ff6b35' : '2px solid transparent', color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                <t.Icon size={15} />
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
                    {tab === 'overview' && (
                        <>
                            <section className="main-grid">
                                {/* RECENT ORDERS (seller's sales) */}
                                <div className="dashboard-card">
                                    <div className="card-header">
                                        <div className="card-title"><RiShoppingBagLine /><h3>Recent Sales</h3></div>
                                        <Link href="/seller/orders">View all <RiArrowRightLine /></Link>
                                    </div>
                                    {!recentOrders.length ? (
                                        <div className="empty-state"><RiShoppingBagLine size={34} /><h4>No orders yet</h4><p>Share your videos to drive sales.</p></div>
                                    ) : (
                                        <div className="orders-list">
                                            {recentOrders.map(order => (
                                                <div className="order-row" key={order.id}>
                                                    <div className="order-icon" style={{ background: statusColor(order.status).bg, color: statusColor(order.status).text }}>{statusIcon(order.status)}</div>
                                                    <div className="order-meta">
                                                        <h4>{order.reference}</h4>
                                                        <p>{order.buyer?.name} · {order.items_count} item{order.items_count !== 1 ? 's' : ''}</p>
                                                    </div>
                                                    <div className="order-right">
                                                        <strong>₦{Number(order.total).toLocaleString()}</strong>
                                                        <span className="status-pill" style={{ background: statusColor(order.status).bg, color: statusColor(order.status).text }}>{order.status}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* TOP PRODUCTS */}
                                <div className="dashboard-card">
                                    <div className="card-header">
                                        <div className="card-title"><RiStoreLine /><h3>Top Products</h3></div>
                                        <Link href="/seller/products">Manage <RiArrowRightLine /></Link>
                                    </div>
                                    {!topProducts.length ? (
                                        <div className="empty-state">
                                            <RiStoreLine size={34} /><h4>No products yet</h4>
                                            <Link href="/seller/products/create" className="empty-btn"><RiAddLine /> Add Product</Link>
                                        </div>
                                    ) : (
                                        <div className="products-list">
                                            {topProducts.map((product, index) => (
                                                <div className="product-row" key={product.id}>
                                                    <span className="product-rank">{index + 1}</span>
                                                    <div className="product-thumb">
                                                        {product.primary_image ? <img src={product.primary_image} alt={product.name} /> : <RiStoreLine />}
                                                    </div>
                                                    <div className="product-meta">
                                                        <h4>{product.name}</h4>
                                                        <p>{product.orders_count} sold</p>
                                                    </div>
                                                    <strong className="product-price">₦{Number(product.price).toLocaleString()}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* VIDEOS */}
                            <section className="dashboard-card" style={{ marginTop: 24 }}>
                                <div className="card-header">
                                    <div className="card-title"><RiVideoLine /><h3>Your Videos</h3></div>
                                    <Link href="/seller/videos">View all <RiArrowRightLine /></Link>
                                </div>
                                <div className="video-grid">
                                    <Link href="/seller/upload" className="upload-tile">
                                        <div>
                                            <div className="upload-circle"><RiAddLine size={22} /></div>
                                            <span>New Video</span>
                                        </div>
                                    </Link>
                                    {recentVideos?.slice(0, 3).map(video => (
                                        <Link key={video.id} href={`/@${video.user?.username}/video/${video.ulid}`} className="video-tile">
                                            {video.thumbnail_url_full
                                                ? <img src={video.thumbnail_url_full} alt={video.title} />
                                                : <div className="video-empty"><RiPlayCircleLine size={28} /></div>
                                            }
                                            <div className="video-overlay">
                                                <div className="video-stats">
                                                    <span><RiEyeLine />{formatCount(video.views_count)}</span>
                                                    <span><RiHeartLine />{formatCount(video.likes_count)}</span>
                                                </div>
                                            </div>
                                            {video.status !== 'active' && (
                                                <div className="video-badge">
                                                    {video.status === 'processing' && <RiLoader4Line size={10} />}
                                                    <span>{video.status}</span>
                                                </div>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </section>

                            {/* QUICK ACTIONS */}
                            <section className="quick-grid" style={{ marginTop: 24 }}>
                                {quickActions.map(action => {
                                    const Icon = action.icon;
                                    return (
                                        <Link href={action.href} key={action.href} className="quick-card">
                                            <div className="quick-icon"><Icon size={22} /></div>
                                            <span>{action.label}</span>
                                        </Link>
                                    );
                                })}
                            </section>
                        </>
                    )}

                    {/* ── MY ORDERS TAB (purchases as buyer) ───────────────── */}
                    {tab === 'orders' && (
                        orders.length === 0 ? (
                            <EmptyState Icon={RiShoppingBagLine} title="No purchases yet" sub="Products you buy will appear here." cta={{ label: 'Browse Shop', href: '/shop' }} />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {orders.map(order => {
                                    const cfg = statusColor(order.status);
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
                                                    <p style={{ color: '#ff6b35', fontWeight: 800, fontSize: 15, margin: 0 }}>₦{Number(order.total).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            {['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status) && (
                                                <div style={{ padding: '0 18px 14px' }}><TrackingBar status={order.status} /></div>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {/* ── WISHLIST TAB ──────────────────────────────────────── */}
                    {tab === 'wishlist' && (
                        savedProducts.length === 0 ? (
                            <EmptyState Icon={RiHeartLine} title="Your wishlist is empty" sub="Save products you love and find them here." cta={{ label: 'Browse Shop', href: '/shop' }} />
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }} className="lg:grid-cols-4">
                                {savedProducts.map(p => <ProductCard key={p.id} product={p} />)}
                            </div>
                        )
                    )}

                    {/* ── SAVED VIDEOS TAB ──────────────────────────────────── */}
                    {tab === 'saved' && (
                        savedVideos.length === 0 ? (
                            <EmptyState Icon={RiBookmarkLine} title="No saved videos" sub="Bookmark videos you want to watch again." cta={{ label: 'Explore Videos', href: '/' }} />
                        ) : (
                            <div style={{ display: 'grid', gap: 8 }} className="lg:grid-cols-6 grid-cols-2">
                                {savedVideos.map(v => <VideoThumb key={v.id} video={v} />)}
                            </div>
                        )
                    )}

                </main>
            </div>

            <style>{`
                * { box-sizing: border-box; }
                .seller-dashboard { height: 100vh; overflow-y: auto; overflow-x: hidden; background: #0a0a0a; color: white; font-family: "DM Sans", sans-serif; scrollbar-width: none; }
                .seller-dashboard::-webkit-scrollbar { display: none; }
                .dashboard-header { position: sticky; top: 0; z-index: 50; backdrop-filter: blur(20px); background: rgba(10,10,10,0.8); border-bottom: 1px solid rgba(255,255,255,0.05); }
                .dashboard-header-inner { max-width: 1200px; height: 72px; margin: auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; }
                .dashboard-brand { display: flex; align-items: center; gap: 14px; }
                .dashboard-logo { width: 42px; height: 42px; border-radius: 14px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; color: #ff6b35; }
                .dashboard-brand h1 { margin: 0; font-size: 16px; font-weight: 700; }
                .dashboard-brand p { margin: 2px 0 0; font-size: 12px; color: rgba(255,255,255,0.45); }
                .dashboard-header-actions { display: flex; align-items: center; gap: 14px; }
                .period-switcher { display: flex; background: #111111; padding: 4px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.05); }
                .period-switcher button { border: none; background: transparent; color: rgba(255,255,255,0.5); padding: 8px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; }
                .period-switcher button.active { background: white; color: black; }
                .upload-btn { height: 42px; padding: 0 18px; border-radius: 999px; background: white; color: black; display: flex; align-items: center; gap: 6px; text-decoration: none; font-size: 13px; font-weight: 700; }
                .dashboard-content { max-width: 1200px; margin: auto; padding: 28px 24px 100px; display: flex; flex-direction: column; gap: 24px; }
                .hero-section { display: flex; justify-content: space-between; align-items: center; }
                .hero-subtitle { margin: 0; font-size: 13px; color: rgba(255,255,255,0.45); }
                .hero-section h2 { margin: 4px 0 0; font-size: 38px; line-height: 1; letter-spacing: -2px; }
                .hero-stat-card { background: #111111; border: 1px solid rgba(255,255,255,0.05); padding: 16px 20px; border-radius: 22px; }
                .hero-stat-card span { display: block; font-size: 12px; color: rgba(255,255,255,0.45); margin-bottom: 4px; }
                .hero-stat-card strong { font-size: 20px; }
                .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 16px; }
                .kpi-card, .dashboard-card, .quick-card { background: #111111; border: 1px solid rgba(255,255,255,0.05); }
                .kpi-card { padding: 24px; border-radius: 26px; }
                .kpi-top { display: flex; justify-content: space-between; align-items: center; }
                .kpi-icon { width: 46px; height: 46px; border-radius: 16px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; }
                .kpi-change { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; }
                .kpi-change.up { color: #22c55e; }
                .kpi-change.down { color: #ef4444; }
                .kpi-card h3 { margin: 22px 0 6px; font-size: 34px; letter-spacing: -1px; }
                .kpi-card h3.highlight { color: #ff6b35; }
                .kpi-card p { margin: 0; color: rgba(255,255,255,0.45); font-size: 13px; }
                .main-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(340px,1fr)); gap: 18px; }
                .dashboard-card { border-radius: 28px; overflow: hidden; }
                .card-header { display: flex; justify-content: space-between; align-items: center; padding: 22px; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .card-title { display: flex; align-items: center; gap: 8px; }
                .card-title h3 { margin: 0; font-size: 15px; }
                .card-header a { color: #ff6b35; text-decoration: none; display: flex; align-items: center; gap: 4px; font-size: 13px; }
                .empty-state { padding: 60px 24px; text-align: center; color: rgba(255,255,255,0.4); }
                .empty-state h4 { margin: 16px 0 8px; }
                .empty-btn { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; padding: 10px 18px; border-radius: 999px; background: white; color: black; text-decoration: none; font-weight: 700; }
                .order-row, .product-row { display: flex; align-items: center; gap: 14px; padding: 16px 22px; }
                .order-row:not(:last-child), .product-row:not(:last-child) { border-bottom: 1px solid rgba(255,255,255,0.04); }
                .order-icon, .product-thumb { width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
                .product-thumb { overflow: hidden; background: rgba(255,255,255,0.05); }
                .product-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .order-meta, .product-meta { flex: 1; min-width: 0; }
                .order-meta h4, .product-meta h4 { margin: 0; font-size: 14px; }
                .order-meta p, .product-meta p { margin: 4px 0 0; font-size: 12px; color: rgba(255,255,255,0.45); }
                .order-right { text-align: right; }
                .status-pill { display: inline-block; margin-top: 6px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: capitalize; }
                .product-price { color: #ff6b35; }
                .product-rank { color: rgba(255,255,255,0.3); font-size: 12px; width: 18px; }
                .video-grid { padding: 18px; display: grid; grid-template-columns: repeat(auto-fill,minmax(140px,1fr)); gap: 12px; }
                .upload-tile, .video-tile { position: relative; aspect-ratio: 9/16; border-radius: 24px; overflow: hidden; text-decoration: none; }
                .upload-tile { border: 1.5px dashed rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: white; }
                .upload-circle { width: 54px; height: 54px; border-radius: 50%; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; margin: auto auto 10px; }
                .video-tile { background: #181818; transition: transform 0.2s ease; }
                .video-tile:hover { transform: scale(1.02); }
                .video-tile img, .video-empty { width: 100%; height: 100%; object-fit: cover; }
                .video-empty { display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); }
                .video-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent 55%); display: flex; align-items: flex-end; padding: 10px; }
                .video-stats { display: flex; gap: 10px; }
                .video-stats span { display: flex; align-items: center; gap: 4px; font-size: 11px; color: white; }
                .video-badge { position: absolute; top: 10px; left: 10px; padding: 5px 8px; border-radius: 999px; background: rgba(0,0,0,0.7); display: flex; align-items: center; gap: 4px; font-size: 10px; color: white; }
                .quick-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
                .quick-card { padding: 22px; border-radius: 24px; text-decoration: none; color: white; display: flex; flex-direction: column; gap: 14px; transition: transform 0.2s ease; }
                .quick-card:hover { transform: translateY(-2px); }
                .quick-icon { width: 52px; height: 52px; border-radius: 16px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; }
                @media (max-width: 900px) { .hero-section { flex-direction: column; align-items: flex-start; gap: 18px; } .quick-grid { grid-template-columns: repeat(2,1fr); } }
                @media (max-width: 640px) { .dashboard-header-inner { padding: 0 16px; } .dashboard-content { padding: 20px 16px 100px; } .period-switcher { display: none; } .hero-section h2 { font-size: 30px; } .quick-grid { grid-template-columns: 1fr; } .video-grid { grid-template-columns: repeat(2,1fr); } }
            `}</style>
        </>
    );
}

SellerDashboard.layout = page => <AppLayout>{page}</AppLayout>;

function EmptyState({ Icon, title, sub, cta }) {
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
    );
}