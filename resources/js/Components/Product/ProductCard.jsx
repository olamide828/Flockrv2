import { Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { RiBookmarkFill, RiBookmarkLine, RiImageLine, RiStarFill, RiVerifiedBadgeLine } from 'react-icons/ri';

export default function ProductCard({ product, layout = 'grid' }) {
    // Null guard — prevents @undefined URLs when seller is deleted
    if (!product?.seller?.username) return null;

    const { auth } = usePage().props;
    const [saved,  setSaved]  = useState(product.is_saved ?? false);
    const [imgErr, setImgErr] = useState(false);

    useEffect(() => {
        setSaved(product.is_saved ?? false);
    }, [product.id, product.is_saved]);

    const handleSave = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!auth?.user) { router.visit('/login'); return; }
        setSaved(s => !s);
        await axios.post(`/api/products/${product.id}/save`).catch(() => setSaved(s => !s));
    };

    const handleBuy = (e) => {
        e.preventDefault();
        e.stopPropagation();
        router.visit(`/@${product.seller?.username}/products/${product.slug}`);
    };

    const imgSrc       = !imgErr && product.primary_image ? product.primary_image : null;
    const sellerAvatar = product.seller?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(product.seller?.name ?? 'S')}&background=1a1a1a&size=32`;
    const sellerHandle = product.seller?.username ? `@${product.seller.username}` : product.seller?.name ?? null;
    const avgRating    = parseFloat(product.seller?.avg_rating ?? 0);
    const totalReviews = Number(product.seller?.total_reviews ?? 0);
    const showRating   = avgRating > 0 && totalReviews > 0;

    if (layout === 'list') {
        return (
            <Link
                href={`/@${product.seller?.username}/products/${product.slug}`}
                className="bg-flockr-card rounded-flockr relative group flex gap-4 border border-white/[0.06] p-3 transition-all hover:border-white/[0.12]"
                style={{ overflow: 'hidden' }}
            >
                <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0, borderRadius: 12, overflow: 'hidden', background: 'var(--flockr-surface)' }}>
                    {imgSrc
                        ? <img src={imgSrc} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={() => setImgErr(true)} />
                        : <Placeholder />
                    }
                </div>
                <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm leading-snug font-medium text-white">{product.name}</p>
                    {sellerHandle && <p className="text-flockr-muted mt-0.5 text-xs">{sellerHandle}</p>}
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-flockr-orange font-bold">₦{Number(product.price).toLocaleString()}</span>
                        {product.is_in_stock && (
                            <button onClick={handleBuy} className="btn-primary px-3 py-1.5 text-xs">Buy</button>
                        )}
                    </div>
                </div>
                {!product.is_in_stock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <span className="font-display text-sm font-bold tracking-widest text-white uppercase">Sold Out</span>
                    </div>
                )}
            </Link>
        );
    }

    return (
        <Link
            href={`/@${product.seller?.username}/products/${product.slug}`}
            style={{
                display: 'block',
                textDecoration: 'none',
                borderRadius: 16,
                overflow: 'hidden',           // ← fixes the edge bleed on mobile
                background: 'var(--flockr-card)',
                border: '1px solid rgba(255,255,255,0.06)',
                position: 'relative',
            }}
        >
            {/* Image container */}
            <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', background: 'var(--flockr-surface)' }}>
                {imgSrc ? (
                    <img
                        src={imgSrc}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }}
                        onError={() => setImgErr(true)}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                ) : (
                    <Placeholder />
                )}

                {/* Discount badge */}
                {product.discount_percent && (
                    <div style={{ position: 'absolute', top: 8, left: 8, background: '#ff5c00', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                        -{product.discount_percent}%
                    </div>
                )}

                {/* Sold out overlay */}
                {!product.is_in_stock && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sold Out</span>
                    </div>
                )}

                {/*
                    Save button — always visible on mobile (touch devices can't hover).
                    On desktop it fades in on hover via CSS class.
                    We use inline style for the base state + a className for the
                    hover behaviour so both work without JS detection.
                */}
                <button
                    onClick={handleSave}
                    className="product-save-btn"
                    style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        // Always visible — desktop hover handled by CSS below
                    }}
                >
                    {saved
                        ? <RiBookmarkFill size={15} color="#FBBF24" />
                        : <RiBookmarkLine size={15} color="#fff" />
                    }
                </button>
            </div>

            {/* Info */}
            <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, lineHeight: 1.35, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {product.name}
                </p>

                {/* Seller row */}
                {product.seller && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <img
                            src={sellerAvatar}
                            alt={product.seller.name}
                            style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                        {sellerHandle && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sellerHandle}</span>}
                        {product.seller.is_verified && <RiVerifiedBadgeLine size={11} color="#FF6B35" style={{ flexShrink: 0 }} />}
                    </div>
                )}

                {/* Price row */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#FF6B35', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>
                            ₦{Number(product.price).toLocaleString()}
                        </div>
                        {product.compare_price && (
                            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textDecoration: 'line-through', marginTop: 2 }}>
                                ₦{Number(product.compare_price).toLocaleString()}
                            </div>
                        )}
                    </div>
                    {product.is_in_stock && (
                        <button
                            onClick={handleBuy}
                            style={{ padding: '6px 12px', background: '#ff5c00', border: 'none', borderRadius: 999, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                        >
                            Buy
                        </button>
                    )}
                </div>

                {/* Sold + rating */}
                {(product.orders_count > 0 || showRating) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        {product.orders_count > 0
                            ? <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{product.orders_count > 50 ? '50+' : product.orders_count} sold</span>
                            : <span />
                        }
                        {showRating && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                                <RiStarFill size={10} color="#FBBF24" />
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600, lineHeight: 1 }}>{avgRating.toFixed(1)}</span>
                                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, lineHeight: 1 }}>({totalReviews > 99 ? '99+' : totalReviews})</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* CSS: on desktop, save button fades in on card hover. On mobile it's always visible. */}
            <style>{`
                @media (hover: hover) {
                    .product-save-btn {
                        opacity: 0;
                        transition: opacity 0.2s ease;
                    }
                    a:hover .product-save-btn,
                    div:hover .product-save-btn {
                        opacity: 1;
                    }
                }
                @media (hover: none) {
                    .product-save-btn {
                        opacity: 1 !important;
                    }
                }
            `}</style>
        </Link>
    );
}

function Placeholder() {
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)' }}>
            <RiImageLine size={36} color="rgba(255,255,255,0.1)" />
        </div>
    );
}