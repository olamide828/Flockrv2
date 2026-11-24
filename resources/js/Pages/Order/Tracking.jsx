import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { RiArrowLeftLine, RiCheckDoubleLine, RiMapPinLine, RiRefreshLine, RiTimeLine } from 'react-icons/ri';
import OrderSummary, { addressOf } from '@/Components/Order/OrderSummary';
import TrackingTimeline, { ProgressStages, fmtDateTime } from '@/Components/Order/TrackingTimeline';

const PROBLEM = {
    pickup_failed:   { label: 'Pickup failed',   sub: "The courier couldn't reach the seller. Pickup is being rescheduled." },
    delivery_failed: { label: 'Delivery failed', sub: 'A delivery attempt failed. Another attempt will be made.' },
    returned:        { label: 'Returned',        sub: 'The package was returned to the sender. Please contact support.' },
    cancelled:       { label: 'Cancelled',       sub: 'This order has been cancelled.' },
    disputed:        { label: 'Under review',    sub: 'This order is under review by our support team.' },
};

// ── Main ─────────────────────────────────────────────────────────────────────
export default function OrderTracking({ order: initialOrder }) {
    const [order, setOrder] = useState(initialOrder);
    const [refreshing, setRefreshing] = useState(false);
    const problem = PROBLEM[order.status];
    const done = order.status === 'delivered';
    const address = addressOf(order);
    const { auth } = usePage().props;
    const isBuyer = auth?.user?.id === order.buyer_id;

    const refresh = async () => {
        setRefreshing(true);
        try {
            const { data } = await axios.get(`/api/orders/${order.id}/status`);
            setOrder(prev => ({ ...prev, ...data.order }));
        } catch {}
        finally { setRefreshing(false); }
    };

    useEffect(() => {
        if (done || problem) return;
        const id = setInterval(refresh, 60000);
        return () => clearInterval(id);
    }, [order.status]);

    return (
        <>
            <Head title={`Track · ${order.reference}`} />
            <div className="scroll-hidden h-screen overflow-y-auto" style={{ background: '#0a0a0a' }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button onClick={() => window.history.back()} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}><RiArrowLeftLine size={18} /></button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>Track Delivery</p>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'monospace' }}>{order.reference}</p>
                    </div>
                    <button onClick={refresh} disabled={refreshing} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: refreshing ? '#FF6B35' : 'rgba(255,255,255,0.5)' }}>
                        <RiRefreshLine size={16} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
                    </button>
                </div>

                <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 20px 100px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {done && (
                        <div style={{ padding: '24px 20px', background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, textAlign: 'center' }}>
                            <RiCheckDoubleLine size={30} color="#10B981" />
                            <p style={{ margin: '8px 0 4px', color: '#10B981', fontWeight: 800, fontSize: 20 }}>Delivered! 🎉</p>
                            {order.delivered_at && <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{fmtDateTime(order.delivered_at)}</p>}
                            {isBuyer && <Link href={`/orders/${order.id}`} style={{ display: 'inline-flex', padding: '9px 20px', background: '#FF6B35', borderRadius: 999, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>View order &amp; leave a review</Link>}
                        </div>
                    )}

                    {problem && (
                        <div style={{ padding: '16px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16 }}>
                            <p style={{ margin: '0 0 4px', color: '#EF4444', fontWeight: 700, fontSize: 14 }}>{problem.label}</p>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.5 }}>{problem.sub}</p>
                        </div>
                    )}

                    <ProgressStages order={order} />
                    <TrackingTimeline order={order} title="Shipment history" />

                    <OrderSummary order={order} />

                    {!done && !problem && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }}>
                            <RiTimeLine size={13} color="rgba(255,255,255,0.25)" />
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Updates come straight from the courier and refresh every minute</p>
                        </div>
                    )}
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}

OrderTracking.layout = page => <AppLayout>{page}</AppLayout>;
