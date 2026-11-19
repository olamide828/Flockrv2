import ProductCard from '@/Components/Product/ProductCard'
import VerifiedBadge from '@/Components/VerifiedBadge'
import { etaLabel } from '@/Components/Order/OrderSummary'
import AppLayout from '@/Layouts/AppLayout'
import { Head, Link, usePage } from '@inertiajs/react'
import { useEffect, useMemo, useState } from 'react'
import {
    RiArrowRightLine, RiAwardLine, RiBookmarkLine, RiCheckboxCircleLine, RiCloseLine, RiFileCopyLine,
    RiGiftLine, RiGroupLine, RiHeartLine, RiLoader4Line, RiPlayCircleLine, RiRefreshLine,
    RiSettings4Line, RiShoppingBagLine, RiSparklingFill, RiTicket2Line, RiTimeLine, RiTruckLine, RiCloseCircleLine,
} from 'react-icons/ri'

// ── Status ────────────────────────────────────────────────────────────────────
const ST = {
    pending:          ['Pending', '#EAB308'],
    paid:             ['Paid', '#10B981'],
    confirmed:        ['Seller preparing', '#3B82F6'],
    processing:       ['Ready for pickup', '#8B5CF6'],
    ready_for_pickup: ['Ready for pickup', '#8B5CF6'],
    shipped:          ['Picked up', '#3B82F6'],
    in_transit:       ['On the way', '#6366F1'],
    delivered:        ['Delivered', '#10B981'],
    pickup_failed:    ['Delayed', '#F59E0B'],
    delivery_failed:  ['Delivery failed', '#EF4444'],
    returned:         ['Returned', '#9CA3AF'],
    disputed:         ['In dispute', '#F59E0B'],
    cancelled:        ['Cancelled', '#EF4444'],
    refunded:         ['Refunded', '#9CA3AF'],
}
const ACTIVE = ['paid', 'confirmed', 'processing', 'ready_for_pickup', 'shipped', 'in_transit', 'pickup_failed', 'delivery_failed']
const naira = (n) => '₦' + Number(n ?? 0).toLocaleString('en-NG')
const day = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const STEPS = [['paid', 'Paid'], ['processing', 'Packed'], ['shipped', 'Picked up'], ['delivered', 'Delivered']]
const stepIndex = (s) => ({ paid: 0, confirmed: 0, processing: 1, ready_for_pickup: 1, shipped: 2, in_transit: 2, delivered: 3 }[s] ?? -1)

function Progress({ status }) {
    const cur = stepIndex(status)
    if (cur < 0) return null
    return (
        <div className="ud-prog">
            {STEPS.map(([k, l], i) => (
                <div key={k} className={'ud-ps' + (i <= cur ? ' on' : '')}><i />{i < STEPS.length - 1 && <b />}<span>{l}</span></div>
            ))}
        </div>
    )
}

function Thumb({ src, size = 44, Icon = RiShoppingBagLine, style }) {
    return (
        <div style={{ width: size, height: size, borderRadius: 10, background: '#1a1a1a', border: '2px solid #111', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
            {src ? <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon size={size * 0.38} color="rgba(255,255,255,0.2)" />}
        </div>
    )
}

function OrderCard({ order }) {
    const [label, color] = ST[order.status] ?? [order.status, '#fff']
    const items = order.items ?? []
    const confirmable = order.status === 'delivered' && !order.escrow_released_at
    return (
        <Link href={`/orders/${order.id}`} className={'ud-order' + (confirmable ? ' hot' : '')}>
            <div className="ud-order-top">
                <div>
                    <b className="mono">{order.reference}</b>
                    <small>{day(order.created_at)}</small>
                </div>
                <span className="ud-chip" style={{ color, background: color + '1f' }}>{label}</span>
            </div>
            <div className="ud-order-mid">
                <div style={{ display: 'flex' }}>
                    {items.slice(0, 3).map((it, i) => <Thumb key={i} src={it.product?.primary_image} style={{ marginLeft: i ? -12 : 0 }} />)}
                </div>
                <div className="ud-order-info">
                    <b>{items[0]?.product_name ?? 'Order'}{items.length > 1 ? ` +${items.length - 1} more` : ''}</b>
                    <small>from @{order.seller?.username ?? 'seller'}</small>
                </div>
                <div className="ud-order-amt"><b>{naira(order.total)}</b><small>{items.length} item{items.length !== 1 ? 's' : ''}</small></div>
            </div>
            {ACTIVE.includes(order.status) && etaLabel(order) && <div style={{ margin: '8px 2px 0', fontSize: 12, color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 6 }}><RiTruckLine size={13} color="#10B981" />Expected <b style={{ color: '#10B981' }}>{etaLabel(order)}</b></div>}
            {confirmable && <div className="ud-nudge"><RiCheckboxCircleLine size={14} />Got it? Confirm delivery, or tell us if something’s wrong.</div>}
            {ACTIVE.includes(order.status) && <Progress status={order.status} />}
        </Link>
    )
}

function VideoThumb({ video }) {
    return (
        <Link href={`/@${video.user?.username}/video/${video.ulid}`} className="ud-vid">
            {video.thumbnail_url_full
                ? <img src={video.thumbnail_url_full} alt={video.title ?? ''} loading="lazy" />
                : <div className="ud-vid-ph"><RiPlayCircleLine size={28} color="rgba(255,255,255,0.2)" /></div>}
            <div className="ud-vid-by">
                <img src={video.user?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(video.user?.name ?? 'U')}&background=111111`} alt="" />
                <span>@{video.user?.username}</span>
            </div>
        </Link>
    )
}

function Empty({ Icon, title, sub, cta }) {
    return (
        <div className="ud-empty">
            <div><Icon size={28} color="rgba(255,255,255,0.2)" /></div>
            <p>{title}</p><small>{sub}</small>
            {cta && <Link href={cta.href}>{cta.label}</Link>}
        </div>
    )
}

function CopyCode({ code }) {
    const [ok, setOk] = useState(false)
    return (
        <button className="ud-copy" onClick={() => { navigator.clipboard?.writeText(code); setOk(true); setTimeout(() => setOk(false), 1400) }}>
            {ok ? <RiCheckboxCircleLine size={14} /> : <RiFileCopyLine size={14} />}{ok ? 'Copied' : 'Copy'}
        </button>
    )
}

// ── Creator Rewards teaser ────────────────────────────────────────────────────
function RewardsModal({ onClose }) {
    useEffect(() => {
        const k = (e) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', k)
        return () => window.removeEventListener('keydown', k)
    }, [onClose])
    return (
        <div className="ud-modal" onClick={onClose} role="dialog" aria-modal="true">
            <div className="ud-modal-card" onClick={(e) => e.stopPropagation()}>
                <button className="ud-modal-x" onClick={onClose} aria-label="Close"><RiCloseLine size={18} /></button>
                <div className="ud-modal-ic"><RiAwardLine size={34} /><RiSparklingFill className="sp s1" size={14} /><RiSparklingFill className="sp s2" size={11} /></div>
                <span className="ud-soon">COMING SOON</span>
                <h3>Flockr Creator Rewards</h3>
                <p>We’re building a way to reward people whose videos get discovered and loved. Details will be shared soon.</p>
                <button className="ud-modal-btn" onClick={onClose}>Got it</button>
            </div>
        </div>
    )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function UserDashboard({ orders = [], savedProducts = [], savedVideos = [], coupons = [], stats = {} }) {
    const { auth } = usePage().props
    const [tab, setTab] = useState(() => { try { return new URLSearchParams(window.location.search).get('tab') || 'orders' } catch { return 'orders' } })
    const [filter, setFilter] = useState('all')
    const [rewards, setRewards] = useState(false)

    const active = orders.filter((o) => ACTIVE.includes(o.status))
    const awaiting = orders.filter((o) => o.status === 'delivered' && !o.escrow_released_at)
    const shownOrders = useMemo(() => {
        if (filter === 'active') return active
        if (filter === 'delivered') return orders.filter((o) => o.status === 'delivered')
        if (filter === 'closed') return orders.filter((o) => ['cancelled', 'refunded', 'returned'].includes(o.status))
        return orders
    }, [orders, filter])

    const wishlistSorted = useMemo(() => [...savedProducts].sort((a, b) => (b.just_restocked ? 1 : 0) - (a.just_restocked ? 1 : 0) || (b.is_in_stock ? 1 : 0) - (a.is_in_stock ? 1 : 0)), [savedProducts])
    const restocked = savedProducts.filter((p) => p.just_restocked && p.is_in_stock).length

    const kpis = [
        { label: 'Orders', value: stats.orders ?? orders.length, sub: active.length ? `${active.length} on the way` : 'All delivered', Icon: RiShoppingBagLine, go: 'orders' },
        { label: 'Wishlist', value: savedProducts.length, sub: restocked ? `${restocked} back in stock` : 'Saved products', Icon: RiHeartLine, go: 'wishlist', hot: restocked > 0 },
        { label: 'Saved videos', value: savedVideos.length, sub: 'Watch again', Icon: RiBookmarkLine, go: 'saved' },
        { label: 'Following', value: stats.following ?? auth?.user?.following_count ?? 0, sub: 'Sellers & creators', Icon: RiGroupLine },
    ]

    const tabs = [
        { key: 'orders', label: 'Orders', Icon: RiShoppingBagLine, n: active.length },
        { key: 'wishlist', label: 'Wishlist', Icon: RiHeartLine, n: restocked },
        { key: 'saved', label: 'Saved videos', Icon: RiBookmarkLine },
        { key: 'coupons', label: 'Coupons', Icon: RiTicket2Line, n: coupons.length },
    ]

    return (
        <>
            <Head title="My Dashboard" />
            <div className="ud-page scroll-hidden">
                <header className="ud-head">
                    <div className="ud-wrap ud-head-in">
                        <div>
                            <h1>My Dashboard</h1>
                            <p>Personal account</p>
                        </div>
                        <Link href="/settings/profile" className="ud-gear" aria-label="Settings"><RiSettings4Line size={16} /></Link>
                    </div>
                </header>

                <main className="ud-wrap ud-main">
                    <section className="ud-me">
                        <div className="ud-me-l">
                            <div className="ud-av">{auth?.user?.avatar_url ? <img src={auth.user.avatar_url} alt="" /> : (auth?.user?.name?.[0] ?? 'U').toUpperCase()}</div>
                            <div>
                                <small>Welcome back</small>
                                <h2>{auth?.user?.name} <VerifiedBadge type={auth?.user?.verification_type} size={17} /></h2>
                                <span>@{auth?.user?.username}</span>
                            </div>
                        </div>
                        <Link href={`/@${auth?.user?.username}`} className="ud-viewprofile">View profile <RiArrowRightLine size={14} /></Link>
                    </section>

                    {awaiting.length > 0 && (
                        <Link href={`/orders/${awaiting[0].id}`} className="ud-banner">
                            <RiCheckboxCircleLine size={18} />
                            <div><b>{awaiting.length === 1 ? 'An order was delivered' : `${awaiting.length} orders were delivered`}</b><small>Confirm you received it so the seller gets paid — or report a problem.</small></div>
                            <RiArrowRightLine size={16} />
                        </Link>
                    )}

                    <div className="ud-kpis">
                        {kpis.map((k) => (
                            <button key={k.label} className={'ud-kpi' + (k.hot ? ' hot' : '')} onClick={() => k.go && setTab(k.go)} disabled={!k.go}>
                                <div className="ud-kpi-ic"><k.Icon size={18} /></div>
                                <b>{k.value}</b>
                                <span>{k.label}</span>
                                <small>{k.sub}</small>
                            </button>
                        ))}
                        {/* Creator Rewards — teaser */}
                        <button className="ud-kpi ud-rewards" onClick={() => setRewards(true)}>
                            <div className="ud-kpi-ic"><RiAwardLine size={18} /></div>
                            <b>Rewards</b>
                            <span>Flockr Creator Rewards</span>
                            <small><em>Coming soon</em></small>
                        </button>
                    </div>

                    <div className="ud-tabs" role="tablist">
                        {tabs.map((t) => (
                            <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
                                <t.Icon size={15} />{t.label}{t.n > 0 && <em>{t.n}</em>}
                            </button>
                        ))}
                    </div>

                    {tab === 'orders' && (
                        <>
                            {orders.length > 0 && (
                                <div className="ud-filters">
                                    {[['all', 'All'], ['active', 'Active'], ['delivered', 'Delivered'], ['closed', 'Cancelled / refunded']].map(([k, l]) => (
                                        <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
                                    ))}
                                </div>
                            )}
                            {orders.length === 0
                                ? <Empty Icon={RiShoppingBagLine} title="No orders yet" sub="Your purchases will appear here." cta={{ label: 'Start shopping', href: '/shop' }} />
                                : shownOrders.length === 0
                                    ? <Empty Icon={RiShoppingBagLine} title="Nothing in this view" sub="Try another filter." />
                                    : <div className="ud-list">{shownOrders.map((o) => <OrderCard key={o.id} order={o} />)}</div>}
                        </>
                    )}

                    {tab === 'wishlist' && (
                        savedProducts.length === 0
                            ? <Empty Icon={RiHeartLine} title="Your wishlist is empty" sub="Save products you love. We’ll tell you when they’re back in stock." cta={{ label: 'Browse shop', href: '/shop' }} />
                            : <div className="ud-grid">{wishlistSorted.map((p) => <ProductCard key={p.id} product={p} />)}</div>
                    )}

                    {tab === 'saved' && (
                        savedVideos.length === 0
                            ? <Empty Icon={RiBookmarkLine} title="No saved videos" sub="Bookmark videos you want to watch again." cta={{ label: 'Explore videos', href: '/' }} />
                            : <div className="ud-vgrid">{savedVideos.map((v) => <VideoThumb key={v.id} video={v} />)}</div>
                    )}

                    {tab === 'coupons' && (
                        coupons.length === 0
                            ? <Empty Icon={RiTicket2Line} title="No coupons right now" sub="Leave a review on something you bought and you could earn one." />
                            : <div className="ud-list">
                                {coupons.map((c) => (
                                    <div key={c.id} className="ud-coupon">
                                        <div className="ud-coupon-l"><RiGiftLine size={20} /><b>{naira(c.amount)}</b><small>off</small></div>
                                        <div className="ud-coupon-r">
                                            <code>{c.code}</code>
                                            <small>{Number(c.min_order) > 0 ? `Min. order ${naira(c.min_order)} · ` : ''}{c.expires_at ? `Expires ${day(c.expires_at)}` : 'No expiry'}</small>
                                        </div>
                                        <CopyCode code={c.code} />
                                    </div>
                                ))}
                            </div>
                    )}
                </main>
            </div>
            {rewards && <RewardsModal onClose={() => setRewards(false)} />}
            <style>{css}</style>
        </>
    )
}

UserDashboard.layout = (page) => <AppLayout>{page}</AppLayout>

const css = `
.ud-page{height:100vh;overflow-y:auto;overflow-x:hidden;background:#0a0a0a;color:#fff;font-family:'DM Sans',sans-serif}
.ud-wrap{max-width:1100px;margin:0 auto;padding:0 16px}
.ud-head{position:sticky;top:0;z-index:50;backdrop-filter:blur(20px);background:rgba(10,10,10,.82);border-bottom:1px solid rgba(255,255,255,.05)}
.ud-head-in{height:62px;display:flex;align-items:center;justify-content:space-between}
.ud-head h1{margin:0;font-size:16px;font-weight:800}.ud-head p{margin:1px 0 0;font-size:12px;color:rgba(255,255,255,.4)}
.ud-gear{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.6)}
.ud-main{padding-top:22px;padding-bottom:110px}
.ud-me{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.ud-me-l{display:flex;gap:14px;align-items:center;min-width:0}
.ud-av{width:58px;height:58px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid rgba(255,92,0,.3);background:linear-gradient(135deg,#ff5c00,#ff8c00);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700}
.ud-av img{width:100%;height:100%;object-fit:cover}
.ud-me small{display:block;color:rgba(255,255,255,.45);font-size:12px}.ud-me h2{margin:1px 0;font-size:20px;font-weight:800;letter-spacing:-.4px;display:flex;align-items:center;gap:6px}.ud-me span{color:rgba(255,255,255,.35);font-size:13px}
.ud-viewprofile{display:flex;align-items:center;gap:6px;padding:9px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.65);font-size:13px;font-weight:600}
.ud-banner{display:flex;gap:12px;align-items:center;padding:13px 15px;margin-bottom:16px;border-radius:16px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.25);color:#10B981}
.ud-banner div{flex:1;min-width:0}.ud-banner b{display:block;font-size:14px}.ud-banner small{display:block;color:rgba(255,255,255,.55);font-size:12px;margin-top:2px}
.ud-kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:22px}
@media(min-width:760px){.ud-kpis{grid-template-columns:repeat(5,1fr)}}
.ud-kpi{all:unset;box-sizing:border-box;cursor:pointer;background:#111;border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:16px;display:flex;flex-direction:column;gap:2px;min-width:0}
.ud-kpi:disabled{cursor:default}.ud-kpi:not(:disabled):hover{border-color:rgba(255,255,255,.18)}
.ud-kpi.hot{border-color:rgba(16,185,129,.45)}
.ud-kpi-ic{width:36px;height:36px;border-radius:12px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;margin-bottom:10px;color:rgba(255,255,255,.65)}
.ud-kpi b{font-size:26px;letter-spacing:-1px}.ud-kpi span{font-size:13px;color:rgba(255,255,255,.7);font-weight:600}.ud-kpi small{font-size:11.5px;color:rgba(255,255,255,.38)}
.ud-kpi.hot small{color:#10B981;font-weight:700}
.ud-rewards{grid-column:span 2;background:linear-gradient(135deg,rgba(255,107,53,.18),rgba(245,185,59,.08));border-color:rgba(255,107,53,.35);position:relative;overflow:hidden}
@media(min-width:760px){.ud-rewards{grid-column:span 1}}
.ud-rewards .ud-kpi-ic{background:rgba(255,107,53,.2);color:#FF9F7A}.ud-rewards b{font-size:20px;letter-spacing:-.4px;margin-top:4px}
.ud-rewards em{font-style:normal;display:inline-block;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.1);color:#fff;font-weight:800;font-size:10px;letter-spacing:.06em;text-transform:uppercase}
.ud-tabs{display:flex;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:18px}
.ud-tabs button{display:flex;align-items:center;gap:7px;padding:12px 16px;background:none;border:0;border-bottom:2px solid transparent;color:rgba(255,255,255,.42);font-size:13.5px;font-weight:500;cursor:pointer;white-space:nowrap;flex-shrink:0;margin-bottom:-1px}
.ud-tabs button.on{color:#fff;font-weight:700;border-color:#FF6B35}
.ud-tabs em{font-style:normal;font-size:10px;font-weight:800;background:#FF6B35;color:#fff;border-radius:999px;padding:1px 7px}
.ud-filters{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin-bottom:14px}
.ud-filters button{flex-shrink:0;padding:6px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.1);background:none;color:rgba(255,255,255,.55);font-size:12.5px;font-weight:600;cursor:pointer}
.ud-filters button.on{background:#fff;color:#000;border-color:#fff}
.ud-list{display:flex;flex-direction:column;gap:12px}
.ud-order{display:block;background:#111;border:1px solid rgba(255,255,255,.07);border-radius:18px;overflow:hidden;color:inherit}
.ud-order.hot{border-color:rgba(16,185,129,.35)}
.ud-order-top{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid rgba(255,255,255,.05)}
.ud-order-top b{display:block;font-size:13px}.mono{font-family:monospace}.ud-order-top small{display:block;margin-top:2px;font-size:11px;color:rgba(255,255,255,.35)}
.ud-chip{padding:4px 11px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap}
.ud-order-mid{display:flex;align-items:center;gap:12px;padding:12px 16px}
.ud-order-info{flex:1;min-width:0}.ud-order-info b{display:block;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ud-order-info small{display:block;margin-top:2px;font-size:11.5px;color:rgba(255,255,255,.38)}
.ud-order-amt{text-align:right;flex-shrink:0}.ud-order-amt b{display:block;color:#FF6B35;font-size:15px;font-weight:800}.ud-order-amt small{font-size:10.5px;color:rgba(255,255,255,.32)}
.ud-nudge{display:flex;gap:8px;align-items:center;padding:9px 16px;background:rgba(16,185,129,.07);color:#10B981;font-size:12px;font-weight:600}
.ud-prog{display:flex;padding:4px 18px 14px}
.ud-ps{flex:1;position:relative;display:flex;flex-direction:column;align-items:center;gap:5px;font-size:9.5px;color:rgba(255,255,255,.28)}
.ud-ps i{width:10px;height:10px;border-radius:50%;background:#222;border:2px solid #333;z-index:1}.ud-ps b{position:absolute;top:4px;left:50%;width:100%;height:2px;background:#222}
.ud-ps.on{color:rgba(255,255,255,.7)}.ud-ps.on i{background:#10B981;border-color:#10B981}.ud-ps.on b{background:#10B981}
.ud-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}@media(min-width:768px){.ud-grid{grid-template-columns:repeat(3,1fr)}}@media(min-width:1024px){.ud-grid{grid-template-columns:repeat(4,1fr)}}
.ud-vgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}@media(min-width:1024px){.ud-vgrid{grid-template-columns:repeat(6,1fr)}}
.ud-vid{position:relative;display:block;aspect-ratio:9/16;border-radius:16px;overflow:hidden;background:#111;border:1px solid rgba(255,255,255,.06)}
.ud-vid>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.ud-vid-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#1a1a1a}
.ud-vid-by{position:absolute;left:0;right:0;bottom:0;padding:22px 10px 9px;background:linear-gradient(transparent,rgba(0,0,0,.75));display:flex;gap:7px;align-items:center;font-size:11px;color:#fff}
.ud-vid-by img{width:22px;height:22px;border-radius:50%;object-fit:cover}.ud-vid-by span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ud-coupon{display:flex;align-items:center;gap:14px;background:#111;border:1px dashed rgba(255,107,53,.4);border-radius:16px;padding:14px 16px}
.ud-coupon-l{display:flex;flex-direction:column;align-items:center;color:#FF6B35;min-width:56px}.ud-coupon-l b{font-size:17px;font-weight:800}.ud-coupon-l small{font-size:10px;color:rgba(255,255,255,.4)}
.ud-coupon-r{flex:1;min-width:0}.ud-coupon-r code{display:block;font-size:13.5px;font-weight:700;letter-spacing:.06em;word-break:break-all}.ud-coupon-r small{display:block;margin-top:3px;font-size:11.5px;color:rgba(255,255,255,.4)}
.ud-copy{display:flex;gap:5px;align-items:center;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;font-size:12px;font-weight:700;cursor:pointer}
.ud-empty{display:flex;flex-direction:column;align-items:center;padding:64px 16px;gap:10px;text-align:center}
.ud-empty>div{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center}
.ud-empty p{margin:0;font-weight:700;font-size:17px}.ud-empty small{color:rgba(255,255,255,.42);font-size:13px;max-width:300px}
.ud-empty a{margin-top:6px;padding:11px 26px;background:#FF6B35;border-radius:999px;color:#fff;font-weight:700;font-size:14px}
.ud-modal{position:fixed;inset:0;z-index:600;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.78);backdrop-filter:blur(10px);animation:udfade .2s}
.ud-modal-card{position:relative;width:100%;max-width:340px;background:linear-gradient(180deg,#1b1410,#111 50%);border:1px solid rgba(255,107,53,.3);border-radius:26px;padding:30px 24px 22px;text-align:center;animation:udpop .45s cubic-bezier(.2,1.4,.4,1)}
.ud-modal-x{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;border:0;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
.ud-modal-ic{position:relative;width:74px;height:74px;margin:0 auto 14px;border-radius:24px;background:rgba(255,107,53,.15);color:#FF9F7A;display:flex;align-items:center;justify-content:center;animation:udfloat 3s ease-in-out infinite}
.ud-modal-ic .sp{position:absolute;color:#F5B93B;animation:udtw 1.6s infinite}.ud-modal-ic .s1{top:-4px;right:-6px}.ud-modal-ic .s2{bottom:2px;left:-8px;animation-delay:.6s}
.ud-soon{display:inline-block;padding:3px 11px;border-radius:999px;background:rgba(255,255,255,.08);font-size:10px;font-weight:800;letter-spacing:.1em}
.ud-modal-card h3{margin:12px 0 8px;font-size:21px;font-weight:900;letter-spacing:-.02em}
.ud-modal-card p{margin:0 0 20px;font-size:13.5px;line-height:1.55;color:rgba(255,255,255,.55)}
.ud-modal-btn{width:100%;padding:13px;border:0;border-radius:14px;background:#FF6B35;color:#fff;font-size:14.5px;font-weight:800;cursor:pointer}
@keyframes udfade{from{opacity:0}}@keyframes udpop{from{opacity:0;transform:scale(.8) translateY(20px)}}@keyframes udfloat{50%{transform:translateY(-5px)}}@keyframes udtw{50%{opacity:.25;transform:scale(.7)}}
@media(prefers-reduced-motion:reduce){.ud-modal *,.ud-modal{animation:none!important}}
`
