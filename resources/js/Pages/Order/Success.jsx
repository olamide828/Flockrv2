import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { RiArrowRightLine, RiCheckLine, RiTimeLine } from 'react-icons/ri';
import OrderSummary from '@/Components/Order/OrderSummary';
import TrackingTimeline, { ProgressStages } from '@/Components/Order/TrackingTimeline';

export default function OrderSuccess({ order }) {
    const hasCourier = !!order.courier_name;
    return (
        <>
            <Head title="Order Confirmed!" />
            <div className="scroll-hidden h-screen overflow-y-auto" style={{ background: 'var(--flockr-black)' }}>
                <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px 100px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ textAlign: 'center', marginBottom: 10 }}>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
                            <RiCheckLine size={34} color="#10B981" />
                        </div>
                        <h1 style={{ margin: '0 0 8px', color: '#fff', fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)' }}>Order Confirmed! 🎉</h1>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.5 }}>Your payment was successful. {order.seller?.name} has been notified and will pack your item.</p>
                        <div style={{ display: 'inline-flex', marginTop: 12, padding: '6px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999 }}>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: 'monospace' }}>{order.reference}</span>
                        </div>
                    </div>

                    <ProgressStages order={order} />
                    <TrackingTimeline order={order} />
                    <OrderSummary order={order} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.15)', borderRadius: 14 }}>
                        <RiTimeLine size={16} color="#FF6B35" style={{ flexShrink: 0 }} />
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.5 }}>
                            {hasCourier ? 'Your courier is booked. Updates appear here as the courier reports them.' : 'The seller will pack your item shortly. Once ready, a courier will be dispatched.'}
                        </p>
                    </div>

                    <Link href={'/orders/' + order.id + '/tracking'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, background: '#FF6B35', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                        Track Order <RiArrowRightLine size={16} />
                    </Link>
                    <Link href="/shop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                        Continue Shopping
                    </Link>
                </div>
            </div>
            <style>{'@keyframes popIn{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}'}</style>
        </>
    );
}

OrderSuccess.layout = page => <AppLayout>{page}</AppLayout>;
