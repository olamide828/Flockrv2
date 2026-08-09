import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import {
    RiArrowRightLine,
    RiCheckDoubleLine,
    RiCheckLine,
    RiCloseLine,
    RiExternalLinkLine,
    RiGiftLine,
    RiLoader4Line,
    RiMapPinLine,
    RiMotorbikeLine,
    RiRefreshLine,
    RiSearchLine,
    RiShoppingBagLine,
    RiStoreLine,
    RiTimeLine,
    RiTruckLine,
    RiWalletLine,
} from 'react-icons/ri';
import { useToast } from '@/Components/Toast';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
    pending:         { label: 'Pending Payment',   color: '#EAB308', bg: 'rgba(234,179,8,0.1)',    dot: '#EAB308' },
    paid:            { label: 'Pack Item',         color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',   dot: '#3B82F6' },
    confirmed:       { label: 'Courier Coming',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',   dot: '#8B5CF6' },
    processing:      { label: 'Ready for Pickup',  color: '#FF6B35', bg: 'rgba(255,107,53,0.1)',   dot: '#FF6B35' },
    ready_for_pickup:{ label: 'Ready for Pickup',  color: '#FF6B35', bg: 'rgba(255,107,53,0.1)',   dot: '#FF6B35' },
    shipped:         { label: 'Picked Up',         color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',   dot: '#8B5CF6' },
    in_transit:      { label: 'In Transit',        color: '#6366F1', bg: 'rgba(99,102,241,0.1)',   dot: '#6366F1' },
    delivered:       { label: 'Delivered',         color: '#10B981', bg: 'rgba(16,185,129,0.1)',   dot: '#10B981' },
    pickup_failed:   { label: 'Pickup Failed',     color: '#EF4444', bg: 'rgba(239,68,68,0.1)',    dot: '#EF4444' },
    delivery_failed: { label: 'Delivery Failed',   color: '#EF4444', bg: 'rgba(239,68,68,0.1)',    dot: '#EF4444' },
    returned:        { label: 'Returned',          color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)',  dot: '#9CA3AF' },
    cancelled:       { label: 'Cancelled',         color: '#EF4444', bg: 'rgba(239,68,68,0.1)',    dot: '#EF4444' },
    disputed:        { label: 'Disputed',          color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',   dot: '#F59E0B' },
    refunded:        { label: 'Refunded',          color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)',  dot: '#9CA3AF' },
};

const TABS = [
    { key: 'all',            label: 'All Orders' },
    { key: 'paid',           label: 'To Pack'    },
    { key: 'processing',     label: 'Awaiting'   },
    { key: 'shipped',        label: 'In Transit' },
    { key: 'delivered',      label: 'Delivered'  },
    { key: 'pickup_failed',  label: 'Issues'     },
];

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon: Icon }) {
    return (
        <div style={{ flex: 1, minWidth: 0, background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} color={color} />
                </div>
            </div>
            <p style={{ margin: 0, color: '#fff', fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{value}</p>
            {sub && <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{sub}</p>}
        </div>
    );
}

// ── Order card ────────────────────────────────────────────────────────────────
function OrderCard({ order: initial, showToast }) {
    const [order,   setOrder]   = useState(initial);
    const [open,    setOpen]    = useState(false);
    const [loading, setLoading] = useState(false);

    const cfg = STATUS[order.status] ?? STATUS.pending;

    const markReady = async () => {
        if (!confirm('Confirm your item is packed and ready for courier pickup?')) return;
        setLoading(true);
        try {
            await axios.patch('/api/orders/' + order.id + '/status', { status: 'processing' });
            setOrder(o => ({ ...o, status: 'processing' }));
            showToast('Marked ready! Courier will be dispatched shortly.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message ?? 'Failed to update.', 'error');
        } finally { setLoading(false); }
    };

    const reschedule = async () => {
        setLoading(true);
        try {
            await axios.post('/api/orders/' + order.id + '/reschedule-pickup');
            setOrder(o => ({ ...o, status: 'processing' }));
            showToast('Pickup rescheduled. Courier will try again.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message ?? 'Failed to reschedule.', 'error');
        } finally { setLoading(false); }
    };

    const address = order.shipping_address
        ? (typeof order.shipping_address === 'string'
            ? (() => { try { return JSON.parse(order.shipping_address); } catch { return null; } })()
            : order.shipping_address)
        : null;

    const sellerEarning = Math.max(0, Number(order.subtotal ?? 0) - Number(order.platform_fee ?? 0));
    const isPaid        = order.status === 'paid' || order.status === 'confirmed';
    const isDelivered   = order.status === 'delivered';
    const isFailed      = order.status === 'pickup_failed';

    return (
        <div style={{
            background: '#111',
            border: `1px solid ${isPaid ? 'rgba(59,130,246,0.2)' : isFailed ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 20,
            overflow: 'hidden',
            transition: 'border-color 0.2s',
        }}>
            {/* Action banner */}
            {isPaid && (
                <div style={{ padding: '10px 18px', background: 'rgba(59,130,246,0.08)', borderBottom: '1px solid rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                    <p style={{ margin: 0, color: '#3B82F6', fontSize: 12, fontWeight: 600 }}>
                        Pack your item and click "Mark Ready" — a courier will come to you
                    </p>
                </div>
            )}
            {isFailed && (
                <div style={{ padding: '10px 18px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                    <p style={{ margin: 0, color: '#EF4444', fontSize: 12, fontWeight: 600 }}>
                        Courier couldn't reach you — please reschedule pickup
                    </p>
                </div>
            )}

            {/* Main header */}
            <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', cursor: 'pointer' }}>
                {/* Buyer avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                        src={order.buyer?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(order.buyer?.name ?? 'B')}&background=1a1a1a&color=fff&size=44`}
                        alt={order.buyer?.name}
                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                    />
                    {/* Status dot */}
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: cfg.dot, border: '2px solid #111', boxShadow: `0 0 6px ${cfg.dot}60` }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.buyer?.name ?? 'Buyer'}
                        </span>
                        <span style={{ padding: '2px 8px', background: cfg.bg, border: `1px solid ${cfg.color}30`, borderRadius: 999, color: cfg.color, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                            {cfg.label}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'monospace' }}>{order.reference}</span>
                        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>·</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{fmtDate(order.created_at)}</span>
                    </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, color: '#FF6B35', fontWeight: 800, fontSize: 16 }}>₦{Number(order.total ?? 0).toLocaleString()}</p>
                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
                        {order.items?.length ?? 1} item{(order.items?.length ?? 1) !== 1 ? 's' : ''} · {open ? '▲' : '▼'}
                    </p>
                </div>
            </div>

            {/* Expanded detail */}
            {open && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

                    {/* Items list */}
                    {order.items?.map((item, i) => (
                        <div key={item.id ?? i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ width: 46, height: 46, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
                                {item.product?.primary_image
                                    ? <img src={item.product.primary_image} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiGiftLine size={18} color="rgba(255,255,255,0.2)" /></div>
                                }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</p>
                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Qty {item.quantity} × ₦{Number(item.unit_price).toLocaleString()}</p>
                            </div>
                            <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>₦{Number(item.total).toLocaleString()}</p>
                        </div>
                    ))}

                    {/* Delivery + courier row */}
                    <div style={{ display: 'grid', gridTemplateColumns: address ? '1fr 1fr' : '1fr', gap: 1, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {address && (
                            <div style={{ padding: '12px 18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                    <RiMapPinLine size={12} color="#FF6B35" />
                                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ship to</span>
                                </div>
                                <p style={{ margin: 0, color: '#fff', fontSize: 12, fontWeight: 600 }}>{address.name}</p>
                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 11, lineHeight: 1.4 }}>
                                    {[address.address, address.city, address.state].filter(Boolean).join(', ')}
                                </p>
                            </div>
                        )}
                        {order.courier_name && (
                            <div style={{ padding: '12px 18px', borderLeft: address ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                    <RiTruckLine size={12} color="#8B5CF6" />
                                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Courier</span>
                                </div>
                                <p style={{ margin: 0, color: '#fff', fontSize: 12, fontWeight: 600 }}>{order.courier_name}</p>
                                {order.tracking_number && (
                                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'monospace' }}>{order.tracking_number}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Earnings breakdown */}
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 8 }}>
                        {[
                            { label: 'Subtotal',  value: '₦' + Number(order.subtotal ?? 0).toLocaleString(),      color: 'rgba(255,255,255,0.5)' },
                            { label: 'Flockr fee',value: '-₦' + Number(order.platform_fee ?? 0).toLocaleString(), color: '#EF4444'               },
                            { label: 'You earn',  value: '₦' + sellerEarning.toLocaleString(),                    color: '#10B981', bold: true   },
                        ].map(r => (
                            <div key={r.label} style={{ flex: 1, textAlign: 'center', padding: '10px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                                <p style={{ margin: '0 0 4px', color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.label}</p>
                                <p style={{ margin: 0, color: r.color, fontSize: r.bold ? 15 : 13, fontWeight: r.bold ? 800 : 600 }}>{r.value}</p>
                            </div>
                        ))}
                    </div>
                    {isDelivered && (
                        <div style={{ padding: '8px 18px 0', marginTop: -4 }}>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>💰 Earnings released after delivery confirmation</p>
                        </div>
                    )}

                    {/* Timeline */}
                    <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {[
                            { label: 'Ordered',   value: fmtDate(order.created_at)  },
                            { label: 'Paid',      value: order.paid_at      ? fmtDate(order.paid_at)      : null },
                            { label: 'Shipped',   value: order.shipped_at   ? fmtDate(order.shipped_at)   : null },
                            { label: 'Delivered', value: order.delivered_at ? fmtDate(order.delivered_at) : null },
                        ].filter(r => r.value).map(row => (
                            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{row.label}</span>
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{row.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Action buttons */}
                    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {isPaid && (
                            <button type="button" onClick={markReady} disabled={loading}
                                style={{ width: '100%', padding: '13px', background: loading ? 'rgba(59,130,246,0.4)' : '#3B82F6', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {loading
                                    ? <><RiLoader4Line size={15} style={{ animation: 'spin 0.8s linear infinite' }} />Updating…</>
                                    : <><RiCheckLine size={15} />Mark Ready for Pickup</>
                                }
                            </button>
                        )}
                        {isFailed && (
                            <button type="button" onClick={reschedule} disabled={loading}
                                style={{ width: '100%', padding: '13px', background: loading ? 'rgba(255,107,53,0.4)' : '#FF6B35', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {loading
                                    ? <><RiLoader4Line size={15} style={{ animation: 'spin 0.8s linear infinite' }} />Rescheduling…</>
                                    : <><RiMotorbikeLine size={15} />Reschedule Pickup</>
                                }
                            </button>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <Link href={'/orders/' + order.id + '/tracking'}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 10, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', color: '#8B5CF6', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                                <RiTruckLine size={13} /> Track Delivery
                            </Link>
                            <Link href={'/orders/' + order.id}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                                <RiExternalLinkLine size={13} /> View Order
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SellerOrders({ orders: initialOrders = [] }) {
    const { showToast, ToastComponent } = useToast();
    const orders   = Array.isArray(initialOrders) ? initialOrders : (initialOrders?.data ?? []);
    const [tab,    setTab]    = useState('all');
    const [search, setSearch] = useState('');

    const counts = orders.reduce((acc, o) => {
        const key = o.status === 'confirmed' || o.status === 'ready_for_pickup' ? 'processing'
                  : o.status === 'in_transit' ? 'shipped'
                  : ['pickup_failed', 'delivery_failed', 'disputed'].includes(o.status) ? 'pickup_failed'
                  : o.status;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});

    const filtered = orders.filter(o => {
        const tabKey = tab === 'all' ? null
                     : tab === 'processing' ? ['processing', 'confirmed', 'ready_for_pickup']
                     : tab === 'shipped'    ? ['shipped', 'in_transit']
                     : tab === 'pickup_failed' ? ['pickup_failed', 'delivery_failed', 'disputed']
                     : [tab];
        const matchTab    = !tabKey || tabKey.includes(o.status);
        const matchSearch = !search
            || o.reference.toLowerCase().includes(search.toLowerCase())
            || (o.buyer?.name ?? '').toLowerCase().includes(search.toLowerCase());
        return matchTab && matchSearch;
    });

    const totalRevenue  = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + Math.max(0, Number(o.subtotal ?? 0) - Number(o.platform_fee ?? 0)), 0);
    const pendingOrders = orders.filter(o => ['paid', 'confirmed', 'processing', 'ready_for_pickup'].includes(o.status)).length;

    return (
        <>
            <Head title="Orders" />
            <div className="scroll-hidden h-screen overflow-y-auto" style={{ background: 'var(--flockr-black)' }}>

                {/* Header */}
                <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 20px' }}>
                    <div style={{ maxWidth: 720, margin: '0 auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <h1 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>Orders</h1>
                            <Link href="/seller/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 999, color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                                Dashboard <RiArrowRightLine size={13} />
                            </Link>
                        </div>

                        {/* Stats row */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                            <StatCard label="Total Orders"  value={orders.length}                      sub="All time"              color="#FF6B35"  icon={RiShoppingBagLine} />
                            <StatCard label="To Action"     value={pendingOrders}                      sub="Need attention"        color="#3B82F6"  icon={RiTimeLine}        />
                            <StatCard label="Earned"        value={'₦' + totalRevenue.toLocaleString()} sub="From delivered orders" color="#10B981"  icon={RiWalletLine}      />
                        </div>

                        {/* Search */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                            <RiSearchLine size={15} color="rgba(255,255,255,0.25)" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by buyer name or order reference…"
                                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontFamily: 'inherit' }}
                            />
                            {search && (
                                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
                                    <RiCloseLine size={15} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tab strip */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    <div style={{ display: 'flex', maxWidth: 720, margin: '0 auto', padding: '0 20px' }}>
                        {TABS.map(t => {
                            const count  = t.key === 'all' ? orders.length
                                         : t.key === 'pickup_failed' ? (counts['pickup_failed'] ?? 0)
                                         : (counts[t.key] ?? 0);
                            const active = tab === t.key;
                            return (
                                <button key={t.key} onClick={() => setTab(t.key)}
                                    style={{ padding: '12px 14px 10px', background: 'none', border: 'none', borderBottom: active ? '2px solid #FF6B35' : '2px solid transparent', color: active ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1 }}>
                                    {t.label}
                                    {count > 0 && (
                                        <span style={{ padding: '1px 6px', background: active ? '#FF6B35' : 'rgba(255,255,255,0.08)', borderRadius: 999, fontSize: 10, fontWeight: 700, color: active ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Order list */}
                <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 20px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 0' }}>
                            <RiGiftLine size={40} color="rgba(255,255,255,0.08)" style={{ display: 'block', margin: '0 auto 14px' }} />
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>
                                {search ? 'No orders match your search' : 'No orders yet'}
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, margin: 0 }}>
                                {search ? 'Try a different search term' : 'Orders from buyers will appear here'}
                            </p>
                        </div>
                    ) : filtered.map(order => (
                        <OrderCard key={order.id} order={order} showToast={showToast} />
                    ))}
                </div>
            </div>

            {ToastComponent}
            <style>{'@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}'}</style>
        </>
    );
}

SellerOrders.layout = page => <AppLayout>{page}</AppLayout>;