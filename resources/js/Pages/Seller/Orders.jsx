import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import { useToast } from '@/Components/Toast';
import {
    RiArrowRightSLine,
    RiBox3Line,
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
    RiShieldCheckLine,
    RiTimeLine,
    RiTruckLine,
    RiWallet3Line,
} from 'react-icons/ri';

// ── Status config ─────────────────────────────────────────────────────────────
const S = {
    pending:         { label: 'Pending',          color: '#EAB308', bg: 'rgba(234,179,8,0.08)'    },
    paid:            { label: 'Pack Item',         color: '#3B82F6', bg: 'rgba(59,130,246,0.08)'  },
    confirmed:       { label: 'Courier Coming',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)'  },
    processing:      { label: 'Ready for Pickup', color: '#FF6B35', bg: 'rgba(255,107,53,0.08)'  },
    ready_for_pickup:{ label: 'Ready for Pickup', color: '#FF6B35', bg: 'rgba(255,107,53,0.08)'  },
    shipped:         { label: 'Picked Up',        color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)'  },
    in_transit:      { label: 'In Transit',       color: '#6366F1', bg: 'rgba(99,102,241,0.08)'  },
    delivered:       { label: 'Delivered',        color: '#10B981', bg: 'rgba(16,185,129,0.08)'  },
    pickup_failed:   { label: 'Pickup Failed',    color: '#EF4444', bg: 'rgba(239,68,68,0.08)'   },
    delivery_failed: { label: 'Delivery Failed',  color: '#EF4444', bg: 'rgba(239,68,68,0.08)'   },
    returned:        { label: 'Returned',         color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)' },
    cancelled:       { label: 'Cancelled',        color: '#EF4444', bg: 'rgba(239,68,68,0.08)'   },
    disputed:        { label: 'Disputed',         color: '#F59E0B', bg: 'rgba(245,158,11,0.08)'  },
    refunded:        { label: 'Refunded',         color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)' },
};

const TABS = [
    { key: 'all',           label: 'All'       },
    { key: 'paid',          label: 'To Pack'   },
    { key: 'processing',    label: 'Ready'     },
    { key: 'shipped',       label: 'In Transit'},
    { key: 'delivered',     label: 'Delivered' },
    { key: 'issues',        label: 'Issues'    },
];

const ISSUE_STATUSES = ['pickup_failed', 'delivery_failed', 'disputed', 'returned'];

function fmtDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-NG', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
}

function parseAddr(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return null; }
}

// ── Single order row ──────────────────────────────────────────────────────────
function OrderRow({ order: init, showToast }) {
    const [order,   setOrder]   = useState(init);
    const [open,    setOpen]    = useState(false);
    const [loading, setLoading] = useState(false);

    const cfg     = S[order.status] ?? S.pending;
    const addr    = parseAddr(order.shipping_address);
    const earning = Math.max(0, Number(order.subtotal ?? 0) - Number(order.platform_fee ?? 0));
    const isPaid  = ['paid', 'confirmed'].includes(order.status);
    const isFail  = ISSUE_STATUSES.includes(order.status);
    const isDone  = order.status === 'delivered';

    const markReady = async () => {
        if (!confirm('Confirm your item is packed and ready for courier pickup?')) return;
        setLoading(true);
        try {
            await axios.patch('/api/orders/' + order.id + '/status', { status: 'processing' });
            setOrder(o => ({ ...o, status: 'processing' }));
            showToast('Marked ready! Courier dispatching shortly.', 'success');
        } catch (e) {
            showToast(e.response?.data?.message ?? 'Failed to update.', 'error');
        } finally { setLoading(false); }
    };

    const reschedule = async () => {
        setLoading(true);
        try {
            await axios.post('/api/orders/' + order.id + '/reschedule-pickup');
            setOrder(o => ({ ...o, status: 'processing' }));
            showToast('Pickup rescheduled.', 'success');
        } catch (e) {
            showToast(e.response?.data?.message ?? 'Failed.', 'error');
        } finally { setLoading(false); }
    };

    return (
        <div style={{
            borderRadius: 20,
            overflow: 'hidden',
            background: 'var(--flockr-card, #111)',
            border: isPaid
                ? '1px solid rgba(59,130,246,0.25)'
                : isFail
                    ? '1px solid rgba(239,68,68,0.25)'
                    : isDone
                        ? '1px solid rgba(16,185,129,0.15)'
                        : '1px solid rgba(255,255,255,0.07)',
            transition: 'border-color 0.2s',
        }}>
            {/* Action nudge */}
            {isPaid && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', background: 'rgba(59,130,246,0.07)', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B82F6', flexShrink: 0, animation: 'blink 1.4s ease infinite' }} />
                    <p style={{ margin: 0, color: '#3B82F6', fontSize: 12, fontWeight: 600 }}>Pack your item — tap to expand and mark ready for pickup</p>
                </div>
            )}
            {isFail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', background: 'rgba(239,68,68,0.07)', borderBottom: '1px solid rgba(239,68,68,0.12)' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                    <p style={{ margin: 0, color: '#EF4444', fontSize: 12, fontWeight: 600 }}>{order.status === 'pickup_failed' ? 'Courier couldn\'t reach you — reschedule pickup' : S[order.status]?.label}</p>
                </div>
            )}

            {/* Collapsed row */}
            <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}>
                {/* Avatar + status dot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                        src={order.buyer?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(order.buyer?.name ?? 'B')}&background=161616&color=aaa&size=40`}
                        alt=""
                        style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', background: '#1a1a1a' }}
                    />
                    <span style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: cfg.color, border: '2px solid #111', display: 'block' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{order.buyer?.name ?? 'Buyer'}</span>
                        <span style={{
                            padding: '2px 9px',
                            borderRadius: 999,
                            background: cfg.bg,
                            color: cfg.color,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            border: `1px solid ${cfg.color}28`,
                            flexShrink: 0,
                        }}>{cfg.label}</span>
                    </div>
                    <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.28)', fontSize: 11, fontFamily: 'monospace' }}>
                        {order.reference} · {fmtDate(order.created_at)}
                    </p>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div>
                        <p style={{ margin: 0, color: '#FF6B35', fontWeight: 800, fontSize: 16 }}>₦{Number(order.total ?? 0).toLocaleString()}</p>
                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'right' }}>
                            {order.items?.length ?? 1} item{(order.items?.length ?? 1) !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <RiArrowRightSLine size={16} color="rgba(255,255,255,0.2)" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', marginLeft: 2 }} />
                </div>
            </div>

            {/* Expanded */}
            {open && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

                    {/* Items */}
                    <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {(order.items ?? []).map((item, i) => (
                            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                                    {item.product?.primary_image
                                        ? <img src={item.product.primary_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiGiftLine size={16} color="rgba(255,255,255,0.15)" /></div>
                                    }
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</p>
                                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Qty {item.quantity} · ₦{Number(item.unit_price).toLocaleString()}</p>
                                </div>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>₦{Number(item.total).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>

                    {/* Delivery + courier */}
                    {(addr || order.courier_name) && (
                        <div style={{ display: 'grid', gridTemplateColumns: addr && order.courier_name ? '1fr 1fr' : '1fr', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {addr && (
                                <div style={{ padding: '12px 18px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                                        <RiMapPinLine size={11} color="rgba(255,107,53,0.7)" />
                                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Ship to</span>
                                    </div>
                                    <p style={{ margin: 0, color: '#fff', fontSize: 12, fontWeight: 600 }}>{addr.name}</p>
                                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11, lineHeight: 1.5 }}>
                                        {[addr.address, addr.city, addr.state].filter(Boolean).join(', ')}
                                    </p>
                                </div>
                            )}
                            {order.courier_name && (
                                <div style={{ padding: '12px 18px', borderLeft: addr ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                                        <RiTruckLine size={11} color="rgba(139,92,246,0.7)" />
                                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Courier</span>
                                    </div>
                                    <p style={{ margin: 0, color: '#fff', fontSize: 12, fontWeight: 600 }}>{order.courier_name}</p>
                                    {order.tracking_number
                                        ? <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'monospace' }}>{order.tracking_number}</p>
                                        : <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>Awaiting tracking #</p>
                                    }
                                </div>
                            )}
                        </div>
                    )}

                    {/* Earnings pills */}
                    <div style={{ padding: '12px 18px', display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {[
                            { k: 'Subtotal',   v: '₦' + Number(order.subtotal ?? 0).toLocaleString(),       c: 'rgba(255,255,255,0.45)' },
                            { k: 'Flockr fee', v: '-₦' + Number(order.platform_fee ?? 0).toLocaleString(),  c: 'rgba(239,68,68,0.8)'   },
                            { k: 'You earn',   v: '₦' + earning.toLocaleString(),                           c: '#10B981', bold: true    },
                        ].map(r => (
                            <div key={r.k} style={{ flex: 1, padding: '10px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, textAlign: 'center' }}>
                                <p style={{ margin: '0 0 3px', color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.k}</p>
                                <p style={{ margin: 0, color: r.c, fontSize: r.bold ? 15 : 13, fontWeight: r.bold ? 800 : 500 }}>{r.v}</p>
                            </div>
                        ))}
                    </div>
                    {isDone && (
                        <div style={{ padding: '8px 18px', background: 'rgba(16,185,129,0.05)', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <RiCheckDoubleLine size={13} color="#10B981" />
                            <p style={{ margin: 0, color: 'rgba(16,185,129,0.7)', fontSize: 11 }}>Earnings released after delivery confirmation</p>
                        </div>
                    )}

                    {/* Timestamps */}
                    <div style={{ padding: '10px 18px 4px', display: 'flex', flexDirection: 'column', gap: 5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {[
                            { l: 'Order placed',  v: fmtDate(order.created_at)   },
                            { l: 'Paid',          v: fmtDate(order.paid_at)       },
                            { l: 'Picked up',     v: fmtDate(order.shipped_at)    },
                            { l: 'Delivered',     v: fmtDate(order.delivered_at)  },
                        ].filter(r => r.v).map(row => (
                            <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>{row.l}</span>
                                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{row.v}</span>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {isPaid && (
                            <button type="button" onClick={markReady} disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? 'rgba(59,130,246,0.4)' : '#3B82F6', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {loading ? <><RiLoader4Line size={16} style={{ animation: 'spin 0.8s linear infinite' }} />Updating…</> : <><RiCheckLine size={16} />Mark Ready for Pickup</>}
                            </button>
                        )}
                        {order.status === 'pickup_failed' && (
                            <button type="button" onClick={reschedule} disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? 'rgba(255,107,53,0.4)' : '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {loading ? <><RiLoader4Line size={16} style={{ animation: 'spin 0.8s linear infinite' }} />Rescheduling…</> : <><RiMotorbikeLine size={16} />Reschedule Pickup</>}
                            </button>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <Link href={'/orders/' + order.id + '/tracking'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: 12, background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)', color: '#8B5CF6', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                                <RiTruckLine size={13} /> Track Delivery
                            </Link>
                            <Link href={'/orders/' + order.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                                <RiExternalLinkLine size={13} /> View Order
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SellerOrders({ orders: raw = [] }) {
    const { showToast, ToastComponent } = useToast();

    const orders = Array.isArray(raw) ? raw : (raw?.data ?? []);
    const [tab,    setTab]    = useState('all');
    const [search, setSearch] = useState('');

    // Counts per tab
    const counts = orders.reduce((acc, o) => {
        const k = ISSUE_STATUSES.includes(o.status) ? 'issues'
                : ['confirmed', 'ready_for_pickup'].includes(o.status) ? 'processing'
                : o.status === 'in_transit' ? 'shipped'
                : o.status;
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
    }, {});

    const filtered = orders.filter(o => {
        const groups = {
            all:        null,
            paid:       ['paid', 'confirmed'],
            processing: ['processing', 'ready_for_pickup'],
            shipped:    ['shipped', 'in_transit'],
            delivered:  ['delivered'],
            issues:     ISSUE_STATUSES,
        };
        const allowed = groups[tab];
        return (!allowed || allowed.includes(o.status))
            && (!search || o.reference.toLowerCase().includes(search.toLowerCase()) || (o.buyer?.name ?? '').toLowerCase().includes(search.toLowerCase()));
    });

    // Summary stats
    const earned  = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + Math.max(0, Number(o.subtotal ?? 0) - Number(o.platform_fee ?? 0)), 0);
    const toAct   = orders.filter(o => ['paid', 'confirmed', 'pickup_failed'].includes(o.status)).length;
    const transit = orders.filter(o => ['shipped', 'in_transit', 'processing', 'ready_for_pickup'].includes(o.status)).length;

    return (
        <>
            <Head title="My Orders" />
            <div className="scroll-hidden h-screen overflow-y-auto" style={{ background: 'var(--flockr-black, #0a0a0a)' }}>

                {/* Sticky header */}
                <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ maxWidth: 720, margin: '0 auto', padding: '14px 20px 0' }}>

                        {/* Top row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <h1 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display, sans-serif)' }}>Orders</h1>

                            {/* Mini stat chips */}
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[
                                    { label: 'Earned',    value: '₦' + (earned >= 1000 ? (earned / 1000).toFixed(1) + 'k' : earned.toLocaleString()), color: '#10B981' },
                                    { label: 'Action',    value: toAct,   color: toAct > 0 ? '#3B82F6' : 'rgba(255,255,255,0.3)' },
                                    { label: 'In Transit',value: transit, color: transit > 0 ? '#8B5CF6' : 'rgba(255,255,255,0.3)' },
                                ].map(s => (
                                    <div key={s.label} style={{ textAlign: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
                                        <p style={{ margin: 0, color: s.color, fontWeight: 800, fontSize: 13 }}>{s.value}</p>
                                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.25)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Search */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, marginBottom: 1 }}>
                            <RiSearchLine size={14} color="rgba(255,255,255,0.2)" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search orders or buyers…"
                                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontFamily: 'inherit' }}
                            />
                            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', display: 'flex' }}><RiCloseLine size={15} /></button>}
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
                        <div style={{ display: 'flex', maxWidth: 720, margin: '0 auto', padding: '0 20px' }}>
                            {TABS.map(t => {
                                const n      = t.key === 'all' ? orders.length : (counts[t.key] ?? 0);
                                const active = tab === t.key;
                                return (
                                    <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '11px 12px 9px', background: 'none', border: 'none', borderBottom: active ? '2px solid #FF6B35' : '2px solid transparent', color: active ? '#fff' : 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, marginBottom: -1 }}>
                                        {t.label}
                                        {n > 0 && <span style={{ padding: '1px 6px', background: active ? '#FF6B35' : 'rgba(255,255,255,0.08)', borderRadius: 999, fontSize: 10, fontWeight: 700, color: active ? '#fff' : 'rgba(255,255,255,0.35)' }}>{n}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* List */}
                <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 20px 100px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '72px 0' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <RiBox3Line size={26} color="rgba(255,255,255,0.15)" />
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>
                                {search ? 'No matching orders' : tab === 'all' ? 'No orders yet' : 'Nothing here'}
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, margin: 0 }}>
                                {search ? 'Try a different search' : tab === 'all' ? 'Orders from buyers will appear here' : 'No orders in this category'}
                            </p>
                        </div>
                    ) : filtered.map(o => (
                        <OrderRow key={o.id} order={o} showToast={showToast} />
                    ))}
                </div>
            </div>

            {ToastComponent}
            <style>{'@keyframes spin{to{transform:rotate(360deg)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}'}</style>
        </>
    );
}

SellerOrders.layout = page => <AppLayout>{page}</AppLayout>;