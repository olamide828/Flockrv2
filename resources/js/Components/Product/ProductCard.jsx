import { Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { RiBookmarkFill, RiBookmarkLine, RiImageLine, RiStarFill, RiVerifiedBadgeLine } from 'react-icons/ri';

export default function ProductCard({ product, layout = 'grid' }) {
    // ── Null guard — prevents @undefined URLs when seller is deleted ──────────
    if (!product?.seller?.username) return null;

    const { auth } = usePage().props;
    const [saved,   setSaved]   = useState(product.is_saved ?? false);
    const [imgErr,  setImgErr]  = useState(false);

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

    const imgSrc      = !imgErr && product.primary_image ? product.primary_image : null;
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
            >
                <div className="bg-flockr-surface relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                    {imgSrc
                        ? <img src={imgSrc} alt={product.name} className="h-full w-full object-cover" onError={() => setImgErr(true)} />
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
        <Link href={`/@${product.seller?.username}/products/${product.slug}`} className="product-card group block">
            <div className="bg-flockr-surface relative aspect-square overflow-hidden">
                {imgSrc
                    ? <img src={imgSrc} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={() => setImgErr(true)} />
                    : <Placeholder />
                }

                {product.discount_percent && (
                    <span className="badge badge-orange absolute top-2 left-2">-{product.discount_percent}%</span>
                )}

                {!product.is_in_stock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <span className="font-display text-sm font-bold tracking-widest text-white uppercase">Sold Out</span>
                    </div>
                )}

                <button
                    onClick={handleSave}
                    className="glass absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full opacity-0 transition-all duration-200 group-hover:opacity-100 hover:scale-110"
                >
                    {saved ? <RiBookmarkFill size={16} color="#FBBF24" /> : <RiBookmarkLine size={16} color="#fff" />}
                </button>
            </div>

            <div className="space-y-2 p-3">
                <p className="line-clamp-2 text-sm leading-snug font-medium text-white">{product.name}</p>

                {product.seller && (
                    <div className="flex items-center gap-1.5">
                        <img
                            src={sellerAvatar}
                            alt={product.seller.name}
                            className="h-4 w-4 shrink-0 rounded-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        {sellerHandle && <span className="text-flockr-muted truncate text-xs">{sellerHandle}</span>}
                        {product.seller.is_verified && <RiVerifiedBadgeLine size={11} color="#FF6B35" className="shrink-0" />}
                    </div>
                )}

                <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-flockr-orange leading-tight font-bold">₦{Number(product.price).toLocaleString()}</div>
                        {product.compare_price && (
                            <div className="text-flockr-muted text-xs line-through">₦{Number(product.compare_price).toLocaleString()}</div>
                        )}
                    </div>
                    {product.is_in_stock && (
                        <button onClick={handleBuy} className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold whitespace-nowrap shrink-0 btn-primary">
                            Buy
                        </button>
                    )}
                </div>

                {(product.orders_count > 0 || showRating) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        {product.orders_count > 0
                            ? <p className="text-flockr-muted text-[11px]">{product.orders_count > 50 ? '50+' : product.orders_count} sold</p>
                            : <span />
                        }
                        {showRating && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                                <RiStarFill size={10} color="#FBBF24" />
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, lineHeight: 1 }}>{avgRating.toFixed(1)}</span>
                                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, lineHeight: 1 }}>({totalReviews > 99 ? '99+' : totalReviews})</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Link>
    );
}

function Placeholder() {
    return (
        <div className="bg-flockr-surface text-flockr-subtle flex h-full w-full items-center justify-center">
            <RiImageLine size={40} />
        </div>
    );
}