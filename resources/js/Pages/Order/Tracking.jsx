import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import {
    RiArrowLeftLine,
    RiCheckDoubleLine,
    RiCheckLine,
    RiFileCopyLine,
    RiLoader4Line,
    RiMapPinLine,
    RiPhoneLine,
    RiRefreshLine,
    RiStoreLine,
    RiTimeLine,
    RiTruckLine,
    RiUser3Line,
} from 'react-icons/ri';

// ── Status definitions ────────────────────────────────────────────────────────
const STATUSES = [
    {
        key:     'paid',
        label:   'Order Confirmed',
        sub:     'Payment received, waiting for seller to pack',
        icon:    RiCheckLine,
        color:   '#3B82F6',
    },
    {
        key:     'processing',
        label:   'Packed & Ready',
        sub:     'Seller has packed your item, awaiting courier',
        icon:    RiStoreLine,
        color:   '#FF6B35',
    },
    {
        key:     'shipped',
        label:   'Picked Up',
        sub:     'Courier has collected your package',
        icon:    RiTruckLine,
        color:   '#8B5CF6',
    },
    {
        key:     'delivered',
        label:   'Delivered',
        sub:     'Package delivered to your address',
        icon:    RiCheckDoubleLine,
        color:   '#10B981',
    },
];

const STATUS_INDEX = {
    pending:         -1,
    paid:             0,
    confirmed:        0,
    processing:       1,
    ready_for_pickup: 1,
    shipped:          2,
    in_transit:       2,
    delivered:        3,
};

const PROBLEM_STATUSES = {
    pickup_failed:   { label: 'Pickup Failed',   color: '#EF4444', sub: 'Courier couldn\'t reach the seller. Rescheduling soon.' },
    delivery_failed: { label: 'Delivery Failed', color: '#EF4444', sub: 'Delivery attempt failed. Another attempt will be made.' },
    returned:        { label: 'Returned',        color: '#9CA3AF', sub: 'Package was returned. Please contact support.' },
    cancelled:       { label: 'Cancelled',       color: '#EF4444', sub: 'This order was cancelled.' },
    disputed:        { label: 'Disputed',        color: '#F59E0B', sub: 'This order is under review by our team.' },
};

function fmtDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-NG', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
    });
}

// ── Animated truck along the progress bar ────────────────────────────────────
function TruckProgress({ currentIndex, total }) {
    const pct = currentIndex < 0 ? 0 : Math.min((currentIndex / (total - 1)) * 100, 100);
    return (
        <div style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, margin: '0 0 32px' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #3B82F6, #FF6B35, #10B981)', borderRadius: 2, transition: 'width 1s ease' }} />
            <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%, -50%)', transition: 'left 1s ease', zIndex: 2 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0a0a0a', border: '2px solid #FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(255,107,53,0.4)' }}>
                    <RiTruckLine size={14} color="#FF6B35" />
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OrderTracking({ order: initialOrder }) {
    const [order,     setOrder]     = useState(initialOrder);
    const [refreshing,setRefreshing]= useState(false);
    const [copied,    setCopied]    = useState(false);
    const [events,    setEvents]    = useState([]);
    const [loadingEvt,setLoadingEvt]= useState(false);

    const currentIndex  = STATUS_INDEX[order.status] ?? -1;
    const isProblem     = PROBLEM_STATUSES[order.status];
    const isComplete    = order.status === 'delivered';
    const address       = order.shipping_address
                            ? (typeof order.shipping_address === 'string'
                                ? JSON.parse(order.shipping_address)
                                : order.shipping_address)
                            : null;

    // Auto-refresh every 60s if not delivered
    useEffect(() => {
        if (isComplete || isProblem) return;
        const interval = setInterval(refresh, 60000);
        return () => clearInterval(interval);
    }, [order.status]);

    // Load Terminal tracking events if shipment ID exists
    useEffect(() => {
        if (!order.terminal_shipment_id) return;
        setLoadingEvt(true);
        axios.get(`/api/orders/${order.id}/tracking`)
            .then(r => setEvents(r.data.events ?? []))
            .catch(() => {})
            .finally(() => setLoadingEvt(false));
    }, [order.terminal_shipment_id]);

    const refresh = async () => {
        setRefreshing(true);
        try {
            const { data } = await axios.get(`/api/orders/${order.id}/status`);
            setOrder(prev => ({ ...prev, ...data.order }));
        } catch {}
        finally { setRefreshing(false); }
    };

    const copyTracking = async () => {
        if (!order.tracking_number) return;
        await navigator.clipboard.writeText(order.tracking_number).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <Head title={`Tracking · ${order.reference}`} />
            <div className="scroll-hidden h-screen overflow-y-auto" style={{ background: '#0a0a0a' }}>

                {/* Header */}
                <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Link href={`/orders/${order.id}`} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textDecoration: 'none', flexShrink: 0 }}>
                        <RiArrowLeftLine size={18} />
                    </Link>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>Track Order</p>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: 'monospace' }}>{order.reference}</p>
                    </div>
                    <button
                        onClick={refresh}
                        disabled={refreshing}
                        style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: refreshing ? '#FF6B35' : 'rgba(255,255,255,0.5)' }}
                    >
                        <RiRefreshLine size={16} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
                    </button>
                </div>

                <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px 100px' }}>

                    {/* Problem status banner */}
                    {isProblem && (
                        <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, marginBottom: 20 }}>
                            <p style={{ margin: '0 0 4px', color: isProblem.color, fontWeight: 700, fontSize: 14 }}>{isProblem.label}</p>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{isProblem.sub}</p>
                        </div>
                    )}

                    {/* Delivered banner */}
                    {isComplete && (
                        <div style={{ padding: '18px', background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 18, marginBottom: 20, textAlign: 'center' }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                <RiCheckDoubleLine size={26} color="#10B981" />
                            </div>
                            <p style={{ margin: '0 0 4px', color: '#10B981', fontWeight: 800, fontSize: 18, fontFamily: 'var(--font-display)' }}>Delivered! 🎉</p>
                            <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                                {order.delivered_at ? `Delivered on ${fmtDate(order.delivered_at)}` : 'Your package has been delivered'}
                            </p>
                            {!order.review && (
                                <Link href={`/orders/${order.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#FF6B35', borderRadius: 999, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                                    Leave a Review
                                </Link>
                            )}
                        </div>
                    )}

                    {/* Truck progress bar */}
                    {!isProblem && (
                        <TruckProgress currentIndex={currentIndex} total={STATUSES.length} />
                    )}

                    {/* Status timeline */}
                    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
                        <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Delivery Timeline</p>
                        </div>
                        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                            {STATUSES.map((s, i) => {
                                const StepIcon = s.icon;
                                const done     = currentIndex >= i;
                                const active   = currentIndex === i;
                                const isLast   = i === STATUSES.length - 1;

                                return (
                                    <div key={s.key} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                        {/* Icon + line */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                            <div style={{
                                                width: 38, height: 38, borderRadius: '50%',
                                                background: done ? (active ? `rgba(${s.color === '#3B82F6' ? '59,130,246' : s.color === '#FF6B35' ? '255,107,53' : s.color === '#8B5CF6' ? '139,92,246' : '16,185,129'},0.15)` : 'rgba(16,185,129,0.1)') : 'rgba(255,255,255,0.04)',
                                                border: `2px solid ${done ? (active ? s.color : '#10B981') : 'rgba(255,255,255,0.08)'}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.4s',
                                                boxShadow: active ? `0 0 16px ${s.color}40` : 'none',
                                            }}>
                                                <StepIcon size={16} color={done ? (active ? s.color : '#10B981') : 'rgba(255,255,255,0.2)'} />
                                            </div>
                                            {!isLast && (
                                                <div style={{ width: 2, height: 36, background: done && currentIndex > i ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)', margin: '4px 0', transition: 'background 0.4s' }} />
                                            )}
                                        </div>

                                        {/* Text */}
                                        <div style={{ paddingTop: 8, paddingBottom: isLast ? 0 : 36 }}>
                                            <p style={{ margin: 0, color: done ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: done ? 700 : 400, transition: 'color 0.3s' }}>
                                                {s.label}
                                            </p>
                                            <p style={{ margin: '3px 0 0', color: done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)', fontSize: 12, lineHeight: 1.4 }}>
                                                {s.sub}
                                            </p>
                                            {/* Timestamps */}
                                            {i === 0 && order.paid_at && done && (
                                                <p style={{ margin: '4px 0 0', color: '#3B82F6', fontSize: 11, fontWeight: 600 }}>{fmtDate(order.paid_at)}</p>
                                            )}
                                            {i === 2 && order.shipped_at && done && (
                                                <p style={{ margin: '4px 0 0', color: '#8B5CF6', fontSize: 11, fontWeight: 600 }}>{fmtDate(order.shipped_at)}</p>
                                            )}
                                            {i === 3 && order.delivered_at && done && (
                                                <p style={{ margin: '4px 0 0', color: '#10B981', fontSize: 11, fontWeight: 600 }}>{fmtDate(order.delivered_at)}</p>
                                            )}
                                            {/* Active pulse */}
                                            {active && !isProblem && (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '3px 10px', background: `${s.color}18`, border: `1px solid ${s.color}40`, borderRadius: 999 }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, animation: 'pulse 1.5s infinite' }} />
                                                    <span style={{ color: s.color, fontSize: 11, fontWeight: 600 }}>In progress</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Courier info */}
                    {(order.courier_name || order.tracking_number) && (
                        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '16px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <RiTruckLine size={20} color="#8B5CF6" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {order.courier_name && (
                                    <p style={{ margin: '0 0 2px', color: '#fff', fontSize: 14, fontWeight: 700 }}>{order.courier_name}</p>
                                )}
                                {order.tracking_number && (
                                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'monospace' }}>
                                        {order.tracking_number}
                                    </p>
                                )}
                            </div>
                            {order.tracking_number && (
                                <button onClick={copyTracking} style={{ width: 36, height: 36, borderRadius: 10, background: copied ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: copied ? '#10B981' : 'rgba(255,255,255,0.4)', flexShrink: 0, transition: 'all 0.2s' }}>
                                    {copied ? <RiCheckLine size={15} /> : <RiFileCopyLine size={15} />}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Terminal tracking events */}
                    {loadingEvt && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, marginBottom: 16 }}>
                            <RiLoader4Line size={15} color="#FF6B35" style={{ animation: 'spin 0.8s linear infinite' }} />
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Loading courier events…</span>
                        </div>
                    )}

                    {events.length > 0 && (
                        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Courier Updates</p>
                            </div>
                            <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {events.map((evt, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF6B35', flexShrink: 0, marginTop: 5 }} />
                                        <div>
                                            <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{evt.description ?? evt.status}</p>
                                            {evt.location && <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>📍 {evt.location}</p>}
                                            {evt.created_at && <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>{fmtDate(evt.created_at)}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Delivery address */}
                    {address && (
                        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '16px 18px', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <RiMapPinLine size={14} color="#FF6B35" />
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Delivering to</p>
                            </div>
                            <p style={{ margin: '0 0 2px', color: '#fff', fontSize: 14, fontWeight: 600 }}>{address.name}</p>
                            <p style={{ margin: '0 0 2px', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                                {[address.address, address.city, address.state].filter(Boolean).join(', ')}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                <RiPhoneLine size={12} color="rgba(255,255,255,0.3)" />
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{address.phone}</span>
                            </div>
                        </div>
                    )}

                    {/* Order + seller info */}
                    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Order Details</p>
                        </div>
                        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {/* Items */}
                            {order.items?.map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
                                        {item.product?.primary_image
                                            ? <img src={item.product.primary_image} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiStoreLine size={16} color="rgba(255,255,255,0.2)" /></div>
                                        }
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</p>
                                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Qty {item.quantity}</p>
                                    </div>
                                    <p style={{ margin: 0, color: '#FF6B35', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>₦{Number(item.total).toLocaleString()}</p>
                                </div>
                            ))}

                            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                            {/* Seller */}
                            {order.seller && (
                                <Link href={`/@${order.seller.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                                    <img src={order.seller.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(order.seller.name)}&background=1a1a1a`} alt={order.seller.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                    <div>
                                        <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{order.seller.name}</p>
                                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>@{order.seller.username}</p>
                                    </div>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Auto-refresh notice */}
                    {!isComplete && !isProblem && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                            <RiTimeLine size={13} color="rgba(255,255,255,0.2)" />
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
                                Status updates automatically every 60 seconds
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin  { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
            `}</style>
        </>
    );
}

OrderTracking.layout = page => <AppLayout>{page}</AppLayout>;