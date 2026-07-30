import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import {
    RiArchiveDrawerLine,
    RiArrowLeftLine,
    RiCheckDoubleLine,
    RiCheckLine,
    RiCloseLine,
    RiExternalLinkLine,
    RiGiftLine,
    RiLoader4Line,
    RiMapPinLine,
    RiSearchLine,
    RiTimeLine,
    RiTruckLine,
} from 'react-icons/ri';
import Toast, { useToast } from '@/Components/Toast';

const STATUS_CFG = {
    pending:         { label: 'Pending Payment',   color: '#EAB308', bg: 'rgba(234,179,8,0.12)'   },
    paid:            { label: 'Paid — Pack Item',  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
    confirmed:       { label: 'Courier Dispatched',color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
    processing:      { label: 'Ready for Pickup',  color: '#FF6B35', bg: 'rgba(255,107,53,0.12)'  },
    shipped:         { label: 'In Transit',        color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
    delivered:       { label: 'Delivered',         color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
    pickup_failed:   { label: 'Pickup Failed',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
    delivery_failed: { label: 'Delivery Failed',   color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
    returned:        { label: 'Returned',          color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
    cancelled:       { label: 'Cancelled',         color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
    disputed:        { label: 'Disputed',          color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
    refunded:        { label: 'Refunded',          color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
};

const FILTER_TABS = [
    { key: 'all',       label: 'All' },
    { key: 'paid',      label: 'To Pack' },
    { key: 'processing',label: 'Awaiting Pickup' },
    { key: 'shipped',   label: 'In Transit' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
];

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function Pagination({ pagination, onNavigate }) {
    if (!pagination?.links || pagination.last_page <= 1) return null;
    return (
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6, padding: '8px 0 24px' }}>
            {pagination.links.map((link, i) => (
                <button
                    key={i}
                    type="button"
                    disabled={!link.url}
                    onClick={() => link.url && onNavigate(link.url)}
                    style={{
                        minWidth: 34, height: 34, padding: '0 10px', borderRadius: 10,
                        border: link.active ? '1px solid rgba(255,107,53,0.4)' : '1px solid rgba(255,255,255,0.08)',
                        background: link.active ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.03)',
                        color: link.active ? '#FF6B35' : (link.url ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)'),
                        fontSize: 12, fontWeight: 700, cursor: link.url ? 'pointer' : 'not-allowed',
                    }}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>
    );
}

// ── Single order row ──────────────────────────────────────────────────────────
function OrderRow({ order: initial, showToast }) {
    const [order,    setOrder]    = useState(initial);
    const [open,     setOpen]     = useState(false);
    const [loading,  setLoading]  = useState(false);

    const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending;

    const markReady = async () => {
        if (!confirm('Confirm your item is packed and ready for courier pickup?')) return;
        setLoading(true);
        try {
            await axios.patch('/api/orders/' + order.id + '/status', { status: 'processing' });
            setOrder(o => ({ ...o, status: 'processing' }));
            showToast('Marked as ready! Courier will be dispatched shortly.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message ?? 'Failed to update order.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const reschedule = async () => {
        setLoading(true);
        try {
            await axios.post('/api/orders/' + order.id + '/reschedule-pickup');
            setOrder(o => ({ ...o, status: 'processing' }));
            showToast('Pickup rescheduled. A courier will try again.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message ?? 'Failed to reschedule.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const sellerEarning = Math.max(0, Number(order.subtotal ?? 0) - Number(order.platform_fee ?? 0));

    return (
        <div style={{
            background: 'var(--flockr-card)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            overflow: 'hidden',
            transition: 'border-color 0.2s',
        }}>
            {order.status === 'paid' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(59,130,246,0.08)', borderBottom: '1px solid rgba(59,130,246,0.15)' }}>
                    <RiArchiveDrawerLine size={14} color="#3B82F6" style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0, color: '#3B82F6', fontSize: 12, fontWeight: 600 }}>
                        Pack your item and mark as ready — a courier will come to you.
                    </p>
                </div>
            )}

            {order.status === 'pickup_failed' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
                    <RiCloseLine size={14} color="#EF4444" style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0, color: '#EF4444', fontSize: 12, fontWeight: 600 }}>
                        Courier couldn't reach you. Be available and reschedule pickup.
                    </p>
                </div>
            )}

            <div
                onClick={() => setOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
            >
                <img
                    src={order.buyer?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(order.buyer?.name ?? 'B')}&background=1a1a1a&size=40`}
                    alt={order.buyer?.name}
                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                            {order.buyer?.name ?? 'Buyer'}
                        </span>
                        <span style={{
                            padding: '2px 8px',
                            background: cfg.bg,
                            border: '1px solid ' + cfg.color + '44',
                            borderRadius: 999,
                            color: cfg.color,
                            fontSize: 10,
                            fontWeight: 700,
                            flexShrink: 0,
                        }}>
                            {cfg.label}
                        </span>
                    </div>
                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'monospace' }}>
                        {order.reference} · {fmtDate(order.created_at)}
                    </p>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, color: '#FF6B35', fontWeight: 800, fontSize: 15 }}>
                        ₦{Number(order.total).toLocaleString()}
                    </p>
                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
                        {open ? '▲' : '▼'}
                    </p>
                </div>
            </div>

            {open && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

                    {order.items?.map((item, i) => (
                        <div key={item.id ?? i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
                                {item.product?.primary_image
                                    ? <img src={item.product.primary_image} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiGiftLine size={16} color="rgba(255,255,255,0.2)" /></div>
                                }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</p>
                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Qty {item.quantity} · ₦{Number(item.unit_price).toLocaleString()} each</p>
                            </div>
                            <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>₦{Number(item.total).toLocaleString()}</p>
                        </div>
                    ))}

                    {order.shipping_address && (
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                                <RiMapPinLine size={12} color="#FF6B35" />
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deliver to</span>
                            </div>
                            <p style={{ margin: 0, color: '#fff', fontSize: 13 }}>
                                {order.shipping_address.name} · {order.shipping_address.phone}
                            </p>
                            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                                {[order.shipping_address.address, order.shipping_address.city, order.shipping_address.state].filter(Boolean).join(', ')}
                            </p>
                        </div>
                    )}

                    {(order.courier_name || order.tracking_number) && (
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <RiTruckLine size={14} color="#8B5CF6" style={{ flexShrink: 0 }} />
                            <div>
                                {order.courier_name && <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{order.courier_name}</p>}
                                {order.tracking_number && <p style={{ margin: '1px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'monospace' }}>#{order.tracking_number}</p>}
                            </div>
                        </div>
                    )}

                    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Subtotal</span>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>₦{Number(order.subtotal ?? 0).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Flockr fee</span>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>-₦{Number(order.platform_fee ?? 0).toLocaleString()}</span>
                        </div>
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>You earn</span>
                            <span style={{ color: '#10B981', fontSize: 14, fontWeight: 800 }}>₦{sellerEarning.toLocaleString()}</span>
                        </div>
                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
                            Paid to your wallet after delivery is confirmed
                        </p>
                    </div>

                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {order.status === 'paid' && (
                            <button
                                type="button"
                                onClick={markReady}
                                disabled={loading}
                                style={{ width: '100%', padding: '13px', background: loading ? 'rgba(59,130,246,0.4)' : '#3B82F6', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            >
                                {loading
                                    ? <><RiLoader4Line size={15} style={{ animation: 'spin 0.8s linear infinite' }} />Updating…</>
                                    : <><RiCheckLine size={15} />Mark Ready for Pickup</>
                                }
                            </button>
                        )}

                        {order.status === 'pickup_failed' && (
                            <button
                                type="button"
                                onClick={reschedule}
                                disabled={loading}
                                style={{ width: '100%', padding: '13px', background: loading ? 'rgba(255,107,53,0.4)' : '#FF6B35', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            >
                                {loading
                                    ? <><RiLoader4Line size={15} style={{ animation: 'spin 0.8s linear infinite' }} />Rescheduling…</>
                                    : <><RiTruckLine size={15} />Reschedule Pickup</>
                                }
                            </button>
                        )}

                        <a
                            href={'/orders/' + order.id}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                        >
                            <RiExternalLinkLine size={13} /> View Full Order
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SellerOrders({ orders: initialOrders = { data: [] }, stats = {} }) {
    const { showToast, ToastComponent } = useToast();

    const [pagination, setPagination] = useState(initialOrders);
    const orders = pagination.data ?? [];
    const [filterTab, setFilterTab] = useState('all');
    const [search,    setSearch]    = useState('');

    const filtered = orders.filter(o => {
        const matchesTab    = filterTab === 'all' || o.status === filterTab;
        const matchesSearch = !search || o.reference.toLowerCase().includes(search.toLowerCase()) || o.buyer?.name?.toLowerCase().includes(search.toLowerCase());
        return matchesTab && matchesSearch;
    });

    // Real, all-time counts from the backend — not just what's on this page
    const totalAll = Object.values(stats).reduce((s, n) => s + Number(n ?? 0), 0);

    const goToPage = (url) => {
        router.get(url, {}, {
            preserveState: true,
            preserveScroll: true,
            only: ['orders'],
            onSuccess: (page) => setPagination(page.props.orders),
        });
    };

    return (
        <>
            <Head title="My Orders" />
            <div className="scroll-hidden h-screen overflow-y-auto" style={{ background: 'var(--flockr-black)' }}>

                {/* Header */}
                <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px' }}>
                    <div style={{ maxWidth: 720, margin: '0 auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button
                                    type="button"
                                    onClick={() => window.history.back()}
                                    aria-label="Go back"
                                    style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                                >
                                    <RiArrowLeftLine size={17} />
                                </button>
                                <h1 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Orders</h1>
                            </div>
                            {/* Quick stats — sourced from all-time backend counts, not just this page */}
                            <div style={{ display: 'flex', gap: 16 }}>
                                {[
                                    { label: 'To Pack',   value: stats['paid']      ?? 0, color: '#3B82F6' },
                                    { label: 'In Transit',value: stats['shipped']   ?? 0, color: '#8B5CF6' },
                                    { label: 'Delivered', value: stats['delivered'] ?? 0, color: '#10B981' },
                                ].map(s => (
                                    <div key={s.label} style={{ textAlign: 'center' }}>
                                        <p style={{ margin: 0, color: s.color, fontWeight: 800, fontSize: 18, fontFamily: 'var(--font-display)' }}>{s.value}</p>
                                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Search */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                            <RiSearchLine size={15} color="rgba(255,255,255,0.3)" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search this page by reference or buyer name…"
                                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontFamily: 'inherit' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Filter tabs */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    <div style={{ display: 'flex', maxWidth: 720, margin: '0 auto', padding: '0 20px' }}>
                        {FILTER_TABS.map(tab => {
                            const count  = tab.key === 'all' ? totalAll : (stats[tab.key] ?? 0);
                            const active = filterTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setFilterTab(tab.key)}
                                    style={{
                                        padding: '12px 14px 10px',
                                        background: 'none', border: 'none',
                                        borderBottom: active ? '2px solid #FF6B35' : '2px solid transparent',
                                        color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                                        fontSize: 13, fontWeight: active ? 700 : 400,
                                        cursor: 'pointer', whiteSpace: 'nowrap',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        marginBottom: -1,
                                    }}
                                >
                                    {tab.label}
                                    {count > 0 && (
                                        <span style={{ padding: '1px 6px', background: active ? '#FF6B35' : 'rgba(255,255,255,0.1)', borderRadius: 999, fontSize: 10, fontWeight: 700, color: active ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Order list */}
                <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 20px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 0' }}>
                            <RiGiftLine size={40} color="rgba(255,255,255,0.1)" style={{ display: 'block', margin: '0 auto 12px' }} />
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0, fontWeight: 600 }}>
                                {search ? 'No orders match your search on this page' : 'No orders yet'}
                            </p>
                            {!search && <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, margin: '6px 0 0' }}>Orders from buyers will appear here</p>}
                        </div>
                    ) : (
                        filtered.map(order => (
                            <OrderRow
                                key={order.id}
                                order={order}
                                showToast={showToast}
                            />
                        ))
                    )}
                </div>

                {filterTab === 'all' && !search && (
                    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px' }}>
                        <Pagination pagination={pagination} onNavigate={goToPage} />
                    </div>
                )}
            </div>

            {ToastComponent}
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </>
    );
}

SellerOrders.layout = page => <AppLayout>{page}</AppLayout>;