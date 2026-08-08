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
    RiMotorbikeLine,
    RiPhoneLine,
    RiRefreshLine,
    RiShoppingBagLine,
    RiStoreLine,
    RiTimeLine,
    RiTruckLine,
} from 'react-icons/ri';

// ── Full status pipeline (matches all possible order statuses) ────────────────
const PIPELINE = [
    {
        keys:   ['pending'],
        label:  'Order Placed',
        sub:    'Waiting for payment confirmation',
        icon:   RiShoppingBagLine,
        color:  '#EAB308',
    },
    {
        keys:   ['paid', 'confirmed'],
        label:  'Payment Confirmed',
        sub:    'Seller has been notified and is preparing your item',
        icon:   RiCheckLine,
        color:  '#3B82F6',
    },
    {
        keys:   ['processing', 'ready_for_pickup'],
        label:  'Packed & Ready',
        sub:    'Item is packed and waiting for courier pickup',
        icon:   RiStoreLine,
        color:  '#FF6B35',
    },
    {
        keys:   ['shipped'],
        label:  'Picked Up',
        sub:    'Courier has collected your package from the seller',
        icon:   RiMotorbikeLine,
        color:  '#8B5CF6',
    },
    {
        keys:   ['in_transit'],
        label:  'In Transit',
        sub:    'Your package is on its way to you',
        icon:   RiTruckLine,
        color:  '#6366F1',
    },
    {
        keys:   ['out_for_delivery'],
        label:  'Out for Delivery',
        sub:    'Courier is nearby and heading to your address',
        icon:   RiMotorbikeLine,
        color:  '#F59E0B',
    },
    {
        keys:   ['delivered'],
        label:  'Delivered',
        sub:    'Package delivered successfully',
        icon:   RiCheckDoubleLine,
        color:  '#10B981',
    },
];

// Statuses that break the normal pipeline
const PROBLEM_STATUSES = {
    pickup_failed:   { label: 'Pickup Failed',    color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   sub: 'Courier couldn\'t reach the seller. Pickup is being rescheduled.' },
    delivery_failed: { label: 'Delivery Failed',  color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   sub: 'Delivery attempt failed. Another attempt will be made.' },
    returned:        { label: 'Returned',         color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.2)', sub: 'Package was returned to sender. Please contact support.' },
    cancelled:       { label: 'Cancelled',        color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   sub: 'This order has been cancelled.' },
    disputed:        { label: 'Under Review',     color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  sub: 'This order is under review by our support team.' },
};

function getCurrentStep(status) {
    for (let i = 0; i < PIPELINE.length; i++) {
        if (PIPELINE[i].keys.includes(status)) return i;
    }
    return -1;
}

function fmtDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-NG', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
    });
}

// ── Static map (Google Maps embed showing seller → buyer route) ───────────────
function DeliveryMap({ sellerCity, sellerState, buyerCity, buyerState }) {
    if (!sellerCity || !buyerCity) return null;

    const origin      = encodeURIComponent(`${sellerCity}, ${sellerState}, Nigeria`);
    const destination = encodeURIComponent(`${buyerCity}, ${buyerState}, Nigeria`);
    const apiKey      = window.__GOOGLE_MAPS_KEY__ ?? ''; // optional — works without key in embed mode

    const src = apiKey
        ? `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${origin}&destination=${destination}&mode=driving`
        : `https://maps.google.com/maps?q=${destination}&output=embed`;

    return (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiMapPinLine size={14} color="#FF6B35" />
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Delivery Route</p>
            </div>
            <iframe
                src={src}
                width="100%"
                height="220"
                style={{ border: 'none', display: 'block', filter: 'invert(0.9) hue-rotate(180deg) brightness(0.85)' }}
                loading="lazy"
                allowFullScreen
                title="Delivery route"
            />
            <div style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF6B35', flexShrink: 0 }} />
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{sellerCity}, {sellerState}</span>
                </div>
                <div style={{ height: 1, width: 32, background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{buyerCity}, {buyerState}</span>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                </div>
            </div>
        </div>
    );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function OrderTracking({ order: initialOrder }) {
    const [order,      setOrder]      = useState(initialOrder);
    const [refreshing, setRefreshing] = useState(false);
    const [copied,     setCopied]     = useState(false);
    const [events,     setEvents]     = useState([]);
    const [loadingEvt, setLoadingEvt] = useState(false);

    const currentStep = getCurrentStep(order.status);
    const isProblem   = PROBLEM_STATUSES[order.status];
    const isComplete  = order.status === 'delivered';

    const address = order.shipping_address
        ? (typeof order.shipping_address === 'string'
            ? JSON.parse(order.shipping_address)
            : order.shipping_address)
        : null;

    // Auto-refresh every 60s while active
    useEffect(() => {
        if (isComplete || isProblem) return;
        const id = setInterval(refresh, 60000);
        return () => clearInterval(id);
    }, [order.status]);

    // Load Terminal tracking events
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
        try { await navigator.clipboard.writeText(order.tracking_number); } catch {}
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Progress percentage for the bar
    const progressPct = isProblem
        ? ((currentStep >= 0 ? currentStep : 0) / (PIPELINE.length - 1)) * 100
        : Math.max(0, (currentStep / (PIPELINE.length - 1)) * 100);

    return (
        <>
            <Head title={`Track · ${order.reference}`} />
            <div className="scroll-hidden h-screen overflow-y-auto" style={{ background: '#0a0a0a' }}>

                {/* Sticky header */}
                <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Link href={`/orders/${order.id}`} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textDecoration: 'none', flexShrink: 0 }}>
                        <RiArrowLeftLine size={18} />
                    </Link>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>Track Delivery</p>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'monospace' }}>{order.reference}</p>
                    </div>
                    <button onClick={refresh} disabled={refreshing} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: refreshing ? '#FF6B35' : 'rgba(255,255,255,0.5)' }}>
                        <RiRefreshLine size={16} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
                    </button>
                </div>

                <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 20px 100px' }}>

                    {/* ── Delivered hero ─────────────────────────────────────── */}
                    {isComplete && (
                        <div style={{ padding: '24px 20px', background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, marginBottom: 16, textAlign: 'center' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                                <RiCheckDoubleLine size={28} color="#10B981" />
                            </div>
                            <p style={{ margin: '0 0 4px', color: '#10B981', fontWeight: 800, fontSize: 20, fontFamily: 'var(--font-display)' }}>Delivered! 🎉</p>
                            {order.delivered_at && <p style={{ margin: '0 0 14px', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{fmtDate(order.delivered_at)}</p>}
                            {!order.review && (
                                <Link href={`/orders/${order.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: '#FF6B35', borderRadius: 999, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                                    Leave a Review ✍️
                                </Link>
                            )}
                        </div>
                    )}

                    {/* ── Problem banner ─────────────────────────────────────── */}
                    {isProblem && (
                        <div style={{ padding: '16px 18px', background: isProblem.bg, border: `1px solid ${isProblem.border}`, borderRadius: 16, marginBottom: 16 }}>
                            <p style={{ margin: '0 0 4px', color: isProblem.color, fontWeight: 700, fontSize: 14 }}>{isProblem.label}</p>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.5 }}>{isProblem.sub}</p>
                        </div>
                    )}

                    {/* ── Progress bar ───────────────────────────────────────── */}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Order placed</span>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Delivered</span>
                        </div>
                        <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                            <div style={{
                                position: 'absolute', left: 0, top: 0, height: '100%',
                                width: `${progressPct}%`,
                                background: isProblem
                                    ? 'rgba(239,68,68,0.6)'
                                    : 'linear-gradient(90deg, #3B82F6, #FF6B35, #10B981)',
                                borderRadius: 3,
                                transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
                            }} />
                            {/* Moving truck dot */}
                            {!isProblem && (
                                <div style={{
                                    position: 'absolute', top: '50%',
                                    left: `${progressPct}%`,
                                    transform: 'translate(-50%, -50%)',
                                    transition: 'left 1.2s cubic-bezier(0.4,0,0.2,1)',
                                    zIndex: 2,
                                }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0a0a0a', border: '2px solid #FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(255,107,53,0.5)' }}>
                                        <RiTruckLine size={12} color="#FF6B35" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Full status timeline ───────────────────────────────── */}
                    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Shipment Status</p>
                            {!isComplete && !isProblem && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'pulse 1.5s infinite' }} />
                                    <span style={{ color: '#10B981', fontSize: 11, fontWeight: 600 }}>Live</span>
                                </div>
                            )}
                        </div>

                        <div style={{ padding: '16px 18px' }}>
                            {PIPELINE.map((step, i) => {
                                const StepIcon = step.icon;
                                const done     = !isProblem && currentStep >= i;
                                const active   = !isProblem && currentStep === i;
                                const isLast   = i === PIPELINE.length - 1;

                                // Timestamp for specific steps
                                let timestamp = null;
                                if (i === 0 && order.created_at) timestamp = fmtDate(order.created_at);
                                if (i === 1 && order.paid_at) timestamp = fmtDate(order.paid_at);
                                if (i === 3 && order.shipped_at) timestamp = fmtDate(order.shipped_at);
                                if (i === 6 && order.delivered_at) timestamp = fmtDate(order.delivered_at);

                                return (
                                    <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                        {/* Icon column */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 40 }}>
                                            <div style={{
                                                width: 40, height: 40, borderRadius: '50%',
                                                background: done
                                                    ? active ? `${step.color}20` : 'rgba(16,185,129,0.1)'
                                                    : 'rgba(255,255,255,0.04)',
                                                border: `2px solid ${done ? (active ? step.color : '#10B981') : 'rgba(255,255,255,0.08)'}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.5s',
                                                boxShadow: active ? `0 0 20px ${step.color}50` : 'none',
                                                flexShrink: 0,
                                            }}>
                                                {done && !active
                                                    ? <RiCheckLine size={16} color="#10B981" />
                                                    : <StepIcon size={16} color={done ? step.color : 'rgba(255,255,255,0.15)'} />
                                                }
                                            </div>
                                            {!isLast && (
                                                <div style={{
                                                    width: 2, height: 40, margin: '3px 0',
                                                    background: done && currentStep > i
                                                        ? 'rgba(16,185,129,0.35)'
                                                        : 'rgba(255,255,255,0.06)',
                                                    transition: 'background 0.5s',
                                                }} />
                                            )}
                                        </div>

                                        {/* Text column */}
                                        <div style={{ paddingTop: 8, paddingBottom: isLast ? 0 : 32, flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                                <p style={{
                                                    margin: 0, fontSize: 14,
                                                    color: done ? '#fff' : 'rgba(255,255,255,0.2)',
                                                    fontWeight: active ? 700 : done ? 600 : 400,
                                                    transition: 'color 0.3s',
                                                }}>{step.label}</p>
                                                {timestamp && done && (
                                                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, flexShrink: 0 }}>{timestamp}</span>
                                                )}
                                            </div>
                                            <p style={{ margin: '3px 0 0', color: done ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)', fontSize: 12, lineHeight: 1.4 }}>
                                                {step.sub}
                                            </p>
                                            {active && (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '3px 10px', background: `${step.color}18`, border: `1px solid ${step.color}35`, borderRadius: 999 }}>
                                                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: step.color, animation: 'pulse 1.5s infinite' }} />
                                                    <span style={{ color: step.color, fontSize: 11, fontWeight: 600 }}>Current status</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Terminal courier events ─────────────────────────────── */}
                    {loadingEvt && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, marginBottom: 16 }}>
                            <RiLoader4Line size={15} color="#FF6B35" style={{ animation: 'spin 0.8s linear infinite' }} />
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Loading courier updates…</span>
                        </div>
                    )}

                    {events.length > 0 && (
                        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Courier Updates from {order.courier_name}</p>
                            </div>
                            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {events.map((evt, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? '#FF6B35' : 'rgba(255,255,255,0.2)', flexShrink: 0, marginTop: 5 }} />
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, color: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: i === 0 ? 600 : 400 }}>
                                                {evt.description ?? evt.status}
                                            </p>
                                            {evt.location && <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>📍 {evt.location}</p>}
                                            {evt.created_at && <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>{fmtDate(evt.created_at)}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Courier info ────────────────────────────────────────── */}
                    {(order.courier_name || order.tracking_number) && (
                        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '16px 18px', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <RiTruckLine size={22} color="#8B5CF6" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {order.courier_name && <p style={{ margin: '0 0 3px', color: '#fff', fontSize: 14, fontWeight: 700 }}>{order.courier_name}</p>}
                                    {order.tracking_number
                                        ? <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{order.tracking_number}</p>
                                        : <p style={{ margin: 0, color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Tracking number will appear once courier picks up</p>
                                    }
                                </div>
                                {order.tracking_number && (
                                    <button onClick={copyTracking} style={{ width: 36, height: 36, borderRadius: 10, background: copied ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: copied ? '#10B981' : 'rgba(255,255,255,0.4)', flexShrink: 0, transition: 'all 0.2s' }}>
                                        {copied ? <RiCheckLine size={15} /> : <RiFileCopyLine size={15} />}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Map ─────────────────────────────────────────────────── */}
                    <DeliveryMap
                        sellerCity={order.seller?.pickup_city}
                        sellerState={order.seller?.pickup_state}
                        buyerCity={address?.city}
                        buyerState={address?.state}
                    />

                    {/* ── Delivery address ─────────────────────────────────────── */}
                    {address && (
                        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '16px 18px', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <RiMapPinLine size={14} color="#FF6B35" />
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Delivering to</p>
                            </div>
                            <p style={{ margin: '0 0 3px', color: '#fff', fontSize: 14, fontWeight: 600 }}>{address.name}</p>
                            <p style={{ margin: '0 0 6px', color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
                                {[address.address, address.city, address.state].filter(Boolean).join(', ')}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <RiPhoneLine size={12} color="rgba(255,255,255,0.25)" />
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{address.phone}</span>
                            </div>
                        </div>
                    )}

                    {/* ── Order items ──────────────────────────────────────────── */}
                    {order.items?.length > 0 && (
                        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Items in this package</p>
                            </div>
                            <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {order.items.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
                                            {item.product?.primary_image
                                                ? <img src={item.product.primary_image} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiShoppingBagLine size={18} color="rgba(255,255,255,0.2)" /></div>
                                            }
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</p>
                                            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Qty {item.quantity}</p>
                                        </div>
                                        <p style={{ margin: 0, color: '#FF6B35', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>₦{Number(item.total).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Auto-refresh notice ──────────────────────────────────── */}
                    {!isComplete && !isProblem && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }}>
                            <RiTimeLine size={13} color="rgba(255,255,255,0.2)" />
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
                                Page refreshes automatically every 60 seconds
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