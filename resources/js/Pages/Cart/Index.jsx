import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import {
    RiAddLine,
    RiArrowLeftLine,
    RiArrowRightLine,
    RiDeleteBinLine,
    RiFlashlightLine,
    RiImageLine,
    RiShieldCheckLine,
    RiShoppingCart2Line,
    RiSubtractLine,
    RiTruckLine,
    RiVerifiedBadgeLine,
} from 'react-icons/ri';

export default function CartIndex({ cartItems: initialItems = [] }) {
    const [items, setItems] = useState(initialItems);
    const [loading, setLoading] = useState({}); // { [itemId]: true }
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState('');
    const [showClearModal, setShowClearModal] = useState(false);

    // ── Derived totals ────────────────────────────────────────────────────────
    const subtotal = items.reduce((s, i) => s + Number(i.product?.price ?? 0) * i.quantity, 0);
    const shipping = items.reduce((s, i) => Math.max(s, Number(i.product?.shipping_fee ?? 0)), 0);
    const total = subtotal + shipping;
    const isEmpty = items.length === 0;

    // Group items by seller for display
    const grouped = items.reduce((acc, item) => {
        const sellerId = item.product?.seller?.id ?? 'unknown';
        if (!acc[sellerId]) acc[sellerId] = { seller: item.product?.seller, items: [] };
        acc[sellerId].items.push(item);
        return acc;
    }, {});

    // ── Actions ───────────────────────────────────────────────────────────────
    const updateQuantity = async (item, delta) => {
        const newQty = item.quantity + delta;
        if (newQty < 1) return removeItem(item);

        setLoading((l) => ({ ...l, [item.id]: true }));
        try {
            await axios.patch(`/api/cart/${item.id}`, { quantity: newQty });
            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)));
        } catch (e) {
            setError(e.response?.data?.message ?? 'Failed to update quantity.');
        } finally {
            setLoading((l) => ({ ...l, [item.id]: false }));
        }
    };

    const removeItem = async (item) => {
        setLoading((l) => ({ ...l, [item.id]: true }));
        try {
            await axios.delete(`/api/cart/${item.id}`);
            setItems((prev) => prev.filter((i) => i.id !== item.id));
        } catch {
            setError('Failed to remove item.');
        } finally {
            setLoading((l) => ({ ...l, [item.id]: false }));
        }
    };

    const clearCart = async () => {
        setShowClearModal(false);
        try {
            await axios.delete('/api/cart');
            setItems([]);
        } catch {
            setError('Failed to clear cart.');
        }
    };

    const handleCheckout = async () => {
        setChecking(true);
        setError('');
        try {
            const { data } = await axios.post('/api/cart/checkout');
            window.location.href = data.authorization_url;
        } catch (e) {
            setError(e.response?.data?.message ?? 'Checkout failed. Please try again.');
        } finally {
            setChecking(false);
        }
    };

    return (
        <>
            <Head title="Cart" />

            <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
                {/* Header */}
                <div
                    style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 40,
                        background: 'rgba(10,10,10,0.95)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        padding: '0 20px',
                    }}
                >
                    <div style={{ maxWidth: 720, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button
                            onClick={() => window.history.back()}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: 'rgba(255,255,255,0.06)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                flexShrink: 0,
                            }}
                        >
                            <RiArrowLeftLine size={18} />
                        </button>
                        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>My Cart</h1>
                        {!isEmpty && (
                            <span
                                style={{
                                    marginLeft: 6,
                                    padding: '2px 10px',
                                    borderRadius: 999,
                                    background: 'rgba(255,107,53,0.15)',
                                    color: '#FF6B35',
                                    fontSize: 12,
                                    fontWeight: 700,
                                }}
                            >
                                {items.length} item{items.length !== 1 ? 's' : ''}
                            </span>
                        )}
                        {!isEmpty && (
                            <button
                                onClick={() => setShowClearModal(true)}
                                style={{
                                    marginLeft: 'auto',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'rgba(255,255,255,0.3)',
                                    fontSize: 12,
                                    padding: 0,
                                }}
                            >
                                Clear all
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 120px' }}>
                    {/* Error */}
                    {error && (
                        <div
                            style={{
                                marginBottom: 16,
                                padding: '12px 16px',
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 12,
                                color: '#EF4444',
                                fontSize: 13,
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Empty state */}
                    {isEmpty && (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '80px 24px',
                                textAlign: 'center',
                                gap: 16,
                            }}
                        >
                            <div
                                style={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <RiShoppingCart2Line size={32} color="rgba(255,255,255,0.2)" />
                            </div>
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 20, margin: 0 }}>Your cart is empty</p>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>Discover products from Nigerian sellers.</p>
                            <Link
                                href="/shop"
                                style={{
                                    padding: '12px 28px',
                                    background: '#FF6B35',
                                    borderRadius: 999,
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: 14,
                                    textDecoration: 'none',
                                    marginTop: 8,
                                }}
                            >
                                Start Shopping
                            </Link>
                        </div>
                    )}

                    {/* Grouped by seller */}
                    {!isEmpty &&
                        Object.values(grouped).map(({ seller, items: sellerItems }) => (
                            <div
                                key={seller?.id ?? 'unknown'}
                                style={{
                                    marginBottom: 20,
                                    background: '#111',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: 20,
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Seller header */}
                                <Link
                                    href={`/@${seller?.username}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '14px 16px',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        textDecoration: 'none',
                                    }}
                                >
                                    <img
                                        src={
                                            seller?.avatar_url ??
                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(seller?.name ?? 'S')}&background=1a1a1a&color=fff`
                                        }
                                        alt={seller?.name}
                                        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{seller?.name}</span>
                                            {seller?.is_verified && <RiVerifiedBadgeLine size={13} color="#FF6B35" />}
                                        </div>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>@{seller?.username}</span>
                                    </div>
                                    <RiArrowRightLine size={16} color="rgba(255,255,255,0.3)" />
                                </Link>

                                {/* Items */}
                                {sellerItems.map((item, idx) => {
                                    const product = item.product;
                                    const itemTotal = Number(product?.price ?? 0) * item.quantity;
                                    const isLoading = loading[item.id];

                                    return (
                                        <div
                                            key={item.id}
                                            style={{
                                                display: 'flex',
                                                gap: 14,
                                                padding: '14px 16px',
                                                borderBottom: idx < sellerItems.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                                opacity: isLoading ? 0.5 : 1,
                                                transition: 'opacity 0.2s',
                                            }}
                                        >
                                            {/* Product image */}
                                            <Link href={`/@${seller?.username}/products/${product?.slug}`} style={{ flexShrink: 0 }}>
                                                <div
                                                    style={{
                                                        width: 72,
                                                        height: 72,
                                                        borderRadius: 12,
                                                        overflow: 'hidden',
                                                        background: 'rgba(255,255,255,0.04)',
                                                    }}
                                                >
                                                    {product?.primary_image ? (
                                                        <img
                                                            src={product.primary_image}
                                                            alt={product.name}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <div
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}
                                                        >
                                                            <RiImageLine size={24} color="rgba(255,255,255,0.2)" />
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>

                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <Link href={`/@${seller?.username}/products/${product?.slug}`} style={{ textDecoration: 'none' }}>
                                                    <p
                                                        style={{
                                                            color: '#fff',
                                                            fontSize: 14,
                                                            fontWeight: 600,
                                                            margin: '0 0 4px',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {product?.name}
                                                    </p>
                                                </Link>
                                                <p style={{ color: '#FF6B35', fontWeight: 700, fontSize: 14, margin: '0 0 10px' }}>
                                                    ₦{Number(product?.price ?? 0).toLocaleString()} × {item.quantity} = ₦{itemTotal.toLocaleString()}
                                                </p>

                                                {/* Quantity controls + remove */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            background: 'rgba(255,255,255,0.06)',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRadius: 10,
                                                            overflow: 'hidden',
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() => updateQuantity(item, -1)}
                                                            disabled={isLoading}
                                                            style={{
                                                                width: 34,
                                                                height: 34,
                                                                border: 'none',
                                                                background: 'none',
                                                                cursor: 'pointer',
                                                                color: 'rgba(255,255,255,0.6)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}
                                                        >
                                                            <RiSubtractLine size={15} />
                                                        </button>
                                                        <span
                                                            style={{
                                                                minWidth: 28,
                                                                textAlign: 'center',
                                                                fontSize: 14,
                                                                fontWeight: 700,
                                                                color: '#fff',
                                                            }}
                                                        >
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => updateQuantity(item, 1)}
                                                            disabled={isLoading || item.quantity >= (product?.stock_quantity ?? 99)}
                                                            style={{
                                                                width: 34,
                                                                height: 34,
                                                                border: 'none',
                                                                background: 'none',
                                                                cursor: 'pointer',
                                                                color: 'rgba(255,255,255,0.6)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}
                                                        >
                                                            <RiAddLine size={15} />
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => removeItem(item)}
                                                        disabled={isLoading}
                                                        style={{
                                                            width: 34,
                                                            height: 34,
                                                            borderRadius: 10,
                                                            background: 'rgba(239,68,68,0.1)',
                                                            border: '1px solid rgba(239,68,68,0.2)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: '#EF4444',
                                                        }}
                                                    >
                                                        <RiDeleteBinLine size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                    {/* Order summary */}
                    {!isEmpty && (
                        <div
                            style={{
                                background: '#111',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 20,
                                padding: '18px 20px',
                                marginTop: 8,
                            }}
                        >
                            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Order Summary</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <SummaryRow label="Subtotal" value={`₦${subtotal.toLocaleString()}`} />
                                <SummaryRow
                                    label="Delivery"
                                    value={shipping === 0 ? 'Free' : `₦${shipping.toLocaleString()}`}
                                    valueColor={shipping === 0 ? '#10B981' : undefined}
                                />
                                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                                <SummaryRow label="Total" value={`₦${total.toLocaleString()}`} bold />
                            </div>

                            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <RiShieldCheckLine size={14} color="#10B981" />
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Secure payment via Paystack</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <RiTruckLine size={14} color="#FF6B35" />
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Delivery details confirmed after payment</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky checkout bar */}
                {!isEmpty && (
                    <div
                        style={{
                            position: 'fixed',
                            // bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '12px 20px 28px',
                            background: 'rgba(10,10,10,0.97)',
                            backdropFilter: 'blur(24px)',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            zIndex: 50,
                        }}
                        className="cart-sticky-bar bottom-[40px] lg:bottom-0"
                    >
                        <div style={{ maxWidth: 720, margin: '0 auto' }}>
                            <button
                                onClick={handleCheckout}
                                disabled={checking}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: checking ? 'rgba(255,107,53,0.6)' : '#FF6B35',
                                    border: 'none',
                                    borderRadius: 999,
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: 16,
                                    cursor: checking ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    transition: 'background 0.2s',
                                }}
                            >
                                {checking ? (
                                    <>
                                        <div
                                            style={{
                                                width: 18,
                                                height: 18,
                                                border: '2px solid rgba(255,255,255,0.3)',
                                                borderTopColor: '#fff',
                                                borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite',
                                            }}
                                        />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <RiFlashlightLine size={18} />
                                        Checkout · ₦{total.toLocaleString()}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Clear cart modal */}
                {showClearModal && (
                    <>
                        <div
                            onClick={() => setShowClearModal(false)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0,0,0,0.7)',
                                backdropFilter: 'blur(8px)',
                                zIndex: 100,
                                animation: 'fadeIn 0.2s ease',
                            }}
                        />
                        <div
                            style={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: 'min(360px, 90vw)',
                                background: '#161616',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 24,
                                padding: 28,
                                zIndex: 101,
                                animation: 'slideUp 0.25s ease',
                            }}
                        >
                            {/* Icon */}
                            <div
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: '50%',
                                    background: 'rgba(239,68,68,0.1)',
                                    border: '1px solid rgba(239,68,68,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 20px',
                                }}
                            >
                                <RiDeleteBinLine size={24} color="#EF4444" />
                            </div>

                            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>Clear your cart?</h3>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 24px', textAlign: 'center', lineHeight: 1.5 }}>
                                This will remove all {items.length} item{items.length !== 1 ? 's' : ''} from your cart. This cannot be undone.
                            </p>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={() => setShowClearModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '13px',
                                        borderRadius: 999,
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={clearCart}
                                    style={{
                                        flex: 1,
                                        padding: '13px',
                                        borderRadius: 999,
                                        background: 'rgba(239,68,68,0.15)',
                                        border: '1px solid rgba(239,68,68,0.3)',
                                        color: '#EF4444',
                                        fontSize: 14,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Clear Cart
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <style>{`
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
    @media (min-width: 768px) {
        .cart-sticky-bar { left: 240px !important; }
    }
`}</style>
        </>
    );
}

CartIndex.layout = (page) => <AppLayout>{page}</AppLayout>;

function SummaryRow({ label, value, bold, valueColor }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: bold ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: bold ? 15 : 13, fontWeight: bold ? 700 : 400 }}>{label}</span>
            <span style={{ color: valueColor ?? (bold ? '#FF6B35' : '#fff'), fontSize: bold ? 16 : 13, fontWeight: bold ? 800 : 500 }}>{value}</span>
        </div>
    );
}
