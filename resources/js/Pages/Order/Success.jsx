import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import {
    RiArrowRightLine,
    RiCheckLine,
    RiGiftLine,
    RiMapPinLine,
    RiShoppingBag2Line,
    RiTimeLine,
    RiTruckLine,
} from 'react-icons/ri';

export default function OrderSuccess({ order }) {
    const items      = order.items ?? [];
    const seller     = order.seller;
    const address    = order.shipping_address;
    const hasCourier = !!order.courier_name;

    // Delivery steps
    const steps = [
        { label: 'Order Confirmed',     done: true,                          icon: RiCheckLine       },
        { label: 'Seller Packing Item', done: order.status !== 'paid',       icon: RiGiftLine        },
        { label: 'Courier Pickup',      done: ['shipped','delivered'].includes(order.status), icon: RiTruckLine },
        { label: 'Delivered',           done: order.status === 'delivered',   icon: RiCheckLine       },
    ];

    return (
        <>
            <Head title="Order Confirmed!" />
            <div className="scroll-hidden h-screen overflow-y-auto" style={{ background: 'var(--flockr-black)' }}>
                <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px 100px' }}>

                    {/* Success hero */}
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        {/* Animated checkmark */}
                        <div style={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))',
                            border: '2px solid rgba(16,185,129,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px',
                            animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                        }}>
                            <RiCheckLine size={34} color="#10B981" />
                        </div>
                        <h1 style={{ margin: '0 0 8px', color: '#fff', fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                            Order Confirmed! 🎉
                        </h1>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.5 }}>
                            Your payment was successful. {seller?.name} has been notified and will pack your item.
                        </p>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '6px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999 }}>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: 'monospace' }}>{order.reference}</span>
                        </div>
                    </div>

                    {/* Delivery progress */}
                    <div style={{ background: 'var(--flockr-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '18px 20px', marginBottom: 14 }}>
                        <p style={{ margin: '0 0 16px', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Delivery Progress</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                            {steps.map((step, i) => {
                                const StepIcon = step.icon;
                                const isLast   = i === steps.length - 1;
                                return (
                                    <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                            <div style={{
                                                width: 30, height: 30, borderRadius: '50%',
                                                background: step.done ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                                                border: `2px solid ${step.done ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.3s',
                                            }}>
                                                <StepIcon size={14} color={step.done ? '#10B981' : 'rgba(255,255,255,0.2)'} />
                                            </div>
                                            {!isLast && (
                                                <div style={{ width: 2, height: 24, background: step.done ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)', margin: '3px 0' }} />
                                            )}
                                        </div>
                                        <div style={{ paddingTop: 5, paddingBottom: isLast ? 0 : 24 }}>
                                            <p style={{ margin: 0, color: step.done ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: step.done ? 600 : 400 }}>
                                                {step.label}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Courier info — shown if Terminal created shipment */}
                    {hasCourier && (
                        <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 16, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <RiTruckLine size={20} color="#8B5CF6" style={{ flexShrink: 0 }} />
                            <div>
                                <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{order.courier_name}</p>
                                {order.tracking_number && (
                                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'monospace' }}>
                                        Tracking: {order.tracking_number}
                                    </p>
                                )}
                                {!order.tracking_number && (
                                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                                        Tracking number will appear once courier picks up
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Order items */}
                    <div style={{ background: 'var(--flockr-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden', marginBottom: 14 }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                Items ({items.length})
                            </p>
                        </div>
                        {items.map((item, i) => (
                            <div key={item.id ?? i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 18px', borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
                                    {item.product?.primary_image
                                        ? <img src={item.product.primary_image} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiShoppingBag2Line size={18} color="rgba(255,255,255,0.2)" /></div>
                                    }
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</p>
                                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Qty {item.quantity}</p>
                                </div>
                                <p style={{ margin: 0, color: '#FF6B35', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>₦{Number(item.total).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>

                    {/* Price breakdown */}
                    <div style={{ background: 'var(--flockr-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '16px 18px', marginBottom: 14 }}>
                        <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Price Breakdown</p>
                        {[
                            { label: 'Subtotal',            value: '₦' + Number(order.subtotal ?? 0).toLocaleString() },
                            { label: 'Courier fee',         value: '₦' + Number(order.courier_fee ?? 0).toLocaleString() },
                            { label: 'Flockr delivery fee', value: '₦200' },
                            { label: 'Platform fee',        value: '₦' + Number(order.platform_fee ?? 0).toLocaleString() },
                        ].map(row => (
                            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{row.label}</span>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{row.value}</span>
                            </div>
                        ))}
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '10px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Total Paid</span>
                            <span style={{ color: '#FF6B35', fontWeight: 800, fontSize: 18 }}>₦{Number(order.total).toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Delivery address */}
                    {address && (
                        <div style={{ background: 'var(--flockr-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '16px 18px', marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                <RiMapPinLine size={14} color="#FF6B35" />
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Delivering to</p>
                            </div>
                            <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{address.name} · {address.phone}</p>
                            <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                                {[address.address, address.city, address.state].filter(Boolean).join(', ')}
                            </p>
                            {address.landmark && (
                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>📍 Near {address.landmark}</p>
                            )}
                        </div>
                    )}

                    {/* ETA notice */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.15)', borderRadius: 14, marginBottom: 24 }}>
                        <RiTimeLine size={16} color="#FF6B35" style={{ flexShrink: 0 }} />
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.5 }}>
                            {hasCourier
                                ? 'Your courier is dispatched. Track your delivery in My Orders.'
                                : 'The seller will pack your item shortly. Once ready, a courier will be dispatched to deliver to you.'
                            }
                        </p>
                    </div>

                    {/* CTA buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <Link
                            href={'/orders/' + order.id + '/tracking'}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', background: '#FF6B35', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
                        >
                            Track Order <RiArrowRightLine size={16} />
                        </Link>
                        <Link
                            href="/shop"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                        >
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </div>
            <style>{'@keyframes popIn{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}'}</style>
        </>
    );
}

OrderSuccess.layout = page => <AppLayout>{page}</AppLayout>;