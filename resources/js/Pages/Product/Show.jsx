import ProductCard from '@/Components/Product/ProductCard';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import {
    RiAddLine,
    RiArrowLeftLine,
    RiArrowLeftSLine,
    RiArrowRightLine,
    RiArrowRightSLine,
    RiBookmarkFill,
    RiBookmarkLine,
    RiCloseLine,
    RiFlashlightLine,
    RiImageLine,
    RiLoader4Line,
    RiShieldCheckLine,
    RiSparkling2Line,
    RiSubtractLine,
    RiTruckLine,
    RiVerifiedBadgeLine,
    RiVideoLine,
    RiZoomInLine,
} from 'react-icons/ri';

export default function ProductShow({ product, similarProducts = [] }) {
    const { auth } = usePage().props;
    const [activeImg, setActiveImg] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [buying, setBuying] = useState(false);
    const [saved, setSaved] = useState(product.is_saved ?? false);
    const [activeTab, setActiveTab] = useState('description');
    const [sellerProducts, setSellerProducts] = useState([]);

    // ── Lightbox state ────────────────────────────────────────────────────────
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIdx, setLightboxIdx] = useState(0);

    // ── AI Summary state ──────────────────────────────────────────────────────
    const [summary, setSummary] = useState(product.ai_description ?? '');
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState('');
    const [descExpanded, setDescExpanded] = useState(false);

    // ── Build full image URL array ────────────────────────────────────────────
    // Priority: image_urls accessor (all images, full URLs) → primary_image
    // → raw images array prepended with R2 base URL
    const r2Base = typeof window !== 'undefined' && window.flockrConfig?.r2Url ? window.flockrConfig.r2Url.replace(/\/$/, '') : '';

    const allImages = (() => {
        if (Array.isArray(product.image_urls) && product.image_urls.length > 0) return product.image_urls;
        if (product.primary_image) return [product.primary_image];
        const raw = product.images ?? [];
        if (raw.length) return raw.map((img) => (img.startsWith('http') ? img : `${r2Base}/${img}`));
        return [];
    })();

    const totalPrice = (Number(product.price) * quantity).toLocaleString();

    // ── Load seller's other products ──────────────────────────────────────────
    useEffect(() => {
        if (!product.seller?.id) return;
        axios
            .get('/api/shop/products', {
                params: {
                    seller_id: product.seller.id,
                    per_page: 9,
                },
            })
            .then((r) => {
                const others = (r.data.data ?? []).filter((p) => p.id !== product.id);
                setSellerProducts(others.slice(0, 8));
            })
            .catch(() => {});
    }, [product.id]);

    // ── AI Summary ────────────────────────────────────────────────────────────
    // Uses the linked video's summary endpoint when available.
    // Falls back to /api/products/summary (add this route — see backend note).
    const generateSummary = useCallback(async () => {
        if (summary) return;

        setSummaryLoading(true);
        setSummaryError('');

        try {
            const firstVideo = product.videos?.[0];

            if (firstVideo?.ulid) {
                const { data } = await axios.post(`/api/videos/${firstVideo.ulid}/summary`);

                setSummary(data.summary ?? '');
            } else {
                const { data } = await axios.post('/api/products/summary', {
                    product_id: product.id,
                });

                setSummary(data.summary ?? '');
            }
        } catch (err) {
            console.error(err);

            const message = err.response?.data?.message || err.message || '';

            if (message.includes('cURL error 28') || message.toLowerCase().includes('network') || message.toLowerCase().includes('timeout')) {
                setSummaryError('No internet connection. Check your network and try again.');
            } else if (
                message.includes('quota') ||
                message.includes('RESOURCE_EXHAUSTED') ||
                message.includes('429') ||
                message.toLowerCase().includes('limit')
            ) {
                setSummaryError('AI limit reached. Please try again later.');
            } else if (message.includes('OpenAI request failed') || message.includes('Gemini request failed')) {
                setSummaryError('AI service is currently unavailable.');
            } else {
                setSummaryError('Failed to generate AI summary.');
            }
        } finally {
            setSummaryLoading(false);
        }
    }, [product.id, product.videos, summary]);

    // Trigger generation when AI Summary tab is opened
    const handleTabClick = (key) => {
        setActiveTab(key);
        if (key === 'ai_description' && !summary && !summaryLoading) {
            generateSummary();
        }
    };

    // ── Checkout / Save ───────────────────────────────────────────────────────
    const handleBuy = async () => {
        if (!auth?.user) {
            router.visit('/login');
            return;
        }
        setBuying(true);
        try {
            const { data } = await axios.post('/api/orders/checkout', {
                product_id: product.id,
                quantity,
            });
            window.location.href = data.authorization_url;
        } catch (err) {
            alert(err.response?.data?.message ?? 'Checkout failed. Please try again.');
        } finally {
            setBuying(false);
        }
    };

    const handleSave = async () => {
        if (!auth?.user) {
            router.visit('/login');
            return;
        }
        setSaved((s) => !s);
        await axios.post(`/api/products/${product.id}/save`).catch(() => setSaved((s) => !s));
    };

    // ── Image navigation ──────────────────────────────────────────────────────
    const prevImg = () => setActiveImg((i) => (i - 1 + allImages.length) % allImages.length);
    const nextImg = () => setActiveImg((i) => (i + 1) % allImages.length);

    // ── Lightbox ──────────────────────────────────────────────────────────────
    const openLightbox = (idx) => {
        setLightboxIdx(idx);
        setLightboxOpen(true);
    };
    const closeLightbox = () => setLightboxOpen(false);
    const lbPrev = (e) => {
        e.stopPropagation();
        setLightboxIdx((i) => (i - 1 + allImages.length) % allImages.length);
    };
    const lbNext = (e) => {
        e.stopPropagation();
        setLightboxIdx((i) => (i + 1) % allImages.length);
    };

    useEffect(() => {
        if (!lightboxOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') setLightboxIdx((i) => (i - 1 + allImages.length) % allImages.length);
            if (e.key === 'ArrowRight') setLightboxIdx((i) => (i + 1) % allImages.length);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [lightboxOpen, allImages.length]);

    return (
        <>
            <Head title={product.name} />

            {/* ── Lightbox overlay ──────────────────────────────────────────── */}
            {lightboxOpen && allImages.length > 0 && (
                <div
                    onClick={closeLightbox}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'rgba(0,0,0,0.93)',
                        backdropFilter: 'blur(14px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={closeLightbox}
                        style={{
                            position: 'absolute',
                            top: 18,
                            right: 18,
                            width: 42,
                            height: 42,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            zIndex: 1,
                        }}
                    >
                        <RiCloseLine size={22} />
                    </button>

                    {/* Counter */}
                    <span
                        style={{
                            position: 'absolute',
                            top: 24,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            color: 'rgba(255,255,255,0.45)',
                            fontSize: 13,
                            fontWeight: 600,
                        }}
                    >
                        {lightboxIdx + 1} / {allImages.length}
                    </span>

                    {/* Main image */}
                    <img
                        src={allImages[lightboxIdx]}
                        alt={product.name}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: '88vw',
                            maxHeight: '82vh',
                            objectFit: 'contain',
                            borderRadius: 14,
                            userSelect: 'none',
                            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
                        }}
                    />

                    {/* Prev / Next arrows */}
                    {allImages.length > 1 && (
                        <>
                            <button
                                onClick={lbPrev}
                                style={{
                                    position: 'absolute',
                                    left: 18,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: 46,
                                    height: 46,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                }}
                            >
                                <RiArrowLeftSLine size={26} />
                            </button>
                            <button
                                onClick={lbNext}
                                style={{
                                    position: 'absolute',
                                    right: 18,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: 46,
                                    height: 46,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                }}
                            >
                                <RiArrowRightSLine size={26} />
                            </button>
                        </>
                    )}

                    {/* Thumbnail strip */}
                    {allImages.length > 1 && (
                        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
                            {allImages.map((img, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxIdx(i);
                                    }}
                                    style={{
                                        width: 50,
                                        height: 50,
                                        borderRadius: 10,
                                        overflow: 'hidden',
                                        border: `2px solid ${i === lightboxIdx ? '#FF6B35' : 'rgba(255,255,255,0.2)'}`,
                                        padding: 0,
                                        cursor: 'pointer',
                                        background: 'none',
                                        flexShrink: 0,
                                    }}
                                >
                                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="scroll-hidden bg-flockr-black h-screen overflow-y-auto">
                {/* Top bar */}
                <div className="bg-flockr-black/90 sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 backdrop-blur-md">
                    <button
                        onClick={() => window.history.back()}
                        className="text-flockr-muted rounded-full p-2 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                        <RiArrowLeftLine size={20} />
                    </button>
                    <h1 className="font-display flex-1 truncate text-sm font-bold text-white">{product.name}</h1>
                    <button onClick={handleSave} className="rounded-full p-2 transition-colors hover:bg-white/[0.06]">
                        {saved ? <RiBookmarkFill size={20} color="#FBBF24" /> : <RiBookmarkLine size={20} className="text-flockr-muted" />}
                    </button>
                </div>

                <div className="mx-auto max-w-5xl px-4 py-6 pb-32 md:pb-8">
                    <div className="md:grid md:grid-cols-2 md:gap-10">
                        {/* ── Images ──────────────────────────────────────── */}
                        <div className="space-y-3">
                            {/* Main image */}
                            <div className="bg-flockr-card relative aspect-square overflow-hidden rounded-2xl border border-white/[0.06]">
                                {allImages.length > 0 && allImages[activeImg] ? (
                                    <img
                                        src={allImages[activeImg]}
                                        alt={product.name}
                                        className="h-full w-full cursor-zoom-in object-cover"
                                        onClick={() => openLightbox(activeImg)}
                                    />
                                ) : (
                                    <div className="text-flockr-subtle flex h-full w-full items-center justify-center">
                                        <RiImageLine size={64} />
                                    </div>
                                )}

                                {/* Zoom hint icon */}
                                {allImages.length > 0 && (
                                    <button
                                        onClick={() => openLightbox(activeImg)}
                                        style={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            width: 34,
                                            height: 34,
                                            borderRadius: '50%',
                                            background: 'rgba(0,0,0,0.5)',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            backdropFilter: 'blur(4px)',
                                        }}
                                    >
                                        <RiZoomInLine size={16} />
                                    </button>
                                )}

                                {product.discount_percent && (
                                    <span className="badge badge-orange absolute top-3 left-3 text-sm">-{product.discount_percent}% OFF</span>
                                )}

                                {/* Prev / Next arrows — only when multiple images */}
                                {allImages.length > 1 && (
                                    <>
                                        <button
                                            onClick={prevImg}
                                            className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                                        >
                                            <RiArrowLeftSLine size={22} />
                                        </button>
                                        <button
                                            onClick={nextImg}
                                            className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                                        >
                                            <RiArrowRightSLine size={22} />
                                        </button>

                                        {/* Dot indicators */}
                                        <div className="absolute right-0 bottom-3 left-0 flex justify-center gap-1.5">
                                            {allImages.map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setActiveImg(i)}
                                                    style={{
                                                        width: i === activeImg ? 18 : 6,
                                                        height: 6,
                                                        borderRadius: 3,
                                                        padding: 0,
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        background: i === activeImg ? '#FF6B35' : 'rgba(255,255,255,0.4)',
                                                        transition: 'all 0.2s',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Thumbnail strip */}
                            {allImages.length > 1 && (
                                <div className="scroll-hidden flex gap-2 overflow-x-auto">
                                    {allImages.map((img, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setActiveImg(i)}
                                            className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                                                activeImg === i ? 'border-flockr-orange' : 'border-white/[0.08] hover:border-white/20'
                                            }`}
                                        >
                                            {img ? (
                                                <img src={img} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="bg-flockr-card h-full w-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Product info ─────────────────────────────────── */}
                        <div className="mt-5 space-y-5 md:mt-0">
                            {product.category && (
                                <div className="text-flockr-muted flex items-center gap-1.5 text-xs">
                                    <Link href="/shop" className="transition-colors hover:text-white">
                                        Shop
                                    </Link>
                                    <span>/</span>
                                    <span className="text-white">{product.category.name}</span>
                                </div>
                            )}

                            <h1 className="font-display text-2xl leading-snug font-bold text-white">{product.name}</h1>

                            <div className="flex items-end gap-3">
                                <span className="text-flockr-orange font-display text-3xl font-bold">₦{Number(product.price).toLocaleString()}</span>
                                {product.compare_price && (
                                    <span className="text-flockr-muted mb-0.5 text-lg line-through">
                                        ₦{Number(product.compare_price).toLocaleString()}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${product.is_in_stock ? 'bg-flockr-green' : 'bg-flockr-red'}`} />
                                <span className={`text-sm font-medium ${product.is_in_stock ? 'text-flockr-green' : 'text-flockr-red'}`}>
                                    {product.is_in_stock ? `In Stock (${product.stock_quantity} left)` : 'Out of Stock'}
                                </span>
                            </div>

                            {product.attributes && Object.keys(product.attributes).length > 0 && (
                                <div className="space-y-3">
                                    {Object.entries(product.attributes).map(([key, val]) => (
                                        <div key={key}>
                                            <p className="text-flockr-muted mb-1.5 text-xs tracking-wider uppercase">{key}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {Array.isArray(val) ? (
                                                    val.map((v) => (
                                                        <span
                                                            key={v}
                                                            className="hover:border-flockr-orange cursor-pointer rounded-xl border border-white/[0.1] px-3 py-1.5 text-sm text-white transition-colors"
                                                        >
                                                            {v}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="rounded-xl border border-white/[0.1] px-3 py-1.5 text-sm text-white">{val}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {product.is_in_stock && (
                                <div className="flex items-center gap-3">
                                    <span className="text-flockr-muted text-sm">Qty</span>
                                    <div className="bg-flockr-card flex items-center gap-1 rounded-xl border border-white/[0.08]">
                                        <button
                                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                            className="text-flockr-muted flex items-center px-3 py-2.5 transition-colors hover:text-white"
                                        >
                                            <RiSubtractLine size={16} />
                                        </button>
                                        <span className="min-w-[2ch] px-3 text-center text-sm font-semibold text-white">{quantity}</span>
                                        <button
                                            onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                                            className="text-flockr-muted flex items-center px-3 py-2.5 transition-colors hover:text-white"
                                        >
                                            <RiAddLine size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={handleBuy}
                                    disabled={!product.is_in_stock || buying}
                                    className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-base disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {buying ? (
                                        <>
                                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            Processing...
                                        </>
                                    ) : product.is_in_stock ? (
                                        <>
                                            <RiFlashlightLine size={18} /> Buy Now · ₦{totalPrice}
                                        </>
                                    ) : (
                                        'Out of Stock'
                                    )}
                                </button>
                                <button onClick={handleSave} className="btn-ghost flex items-center gap-1.5 rounded-2xl px-4 py-3.5">
                                    {saved ? (
                                        <>
                                            <RiBookmarkFill size={17} color="#FBBF24" /> Saved
                                        </>
                                    ) : (
                                        <>
                                            <RiBookmarkLine size={17} /> Save
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="bg-flockr-card space-y-3 rounded-2xl border border-white/[0.06] p-4">
                                <div className="flex items-start gap-3 text-sm">
                                    <RiTruckLine size={18} color="#FF6B35" className="mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-medium text-white">
                                            {Number(product.shipping_fee) === 0
                                                ? 'Free Shipping'
                                                : `₦${Number(product.shipping_fee).toLocaleString()} delivery`}
                                        </p>
                                        <p className="text-flockr-muted mt-0.5 text-xs">
                                            {product.ships_nationwide
                                                ? 'Ships nationwide across Nigeria'
                                                : `Ships from ${product.location ?? 'Nigeria'}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-sm">
                                    <RiShieldCheckLine size={18} color="#10B981" className="mt-0.5 shrink-0" />
                                    <p className="text-flockr-muted text-xs">Secure payment via Paystack. Buyer protection included.</p>
                                </div>
                            </div>

                            <Link
                                href={`/@${product.seller?.username}`}
                                className="bg-flockr-card group flex items-center gap-3 rounded-2xl border border-white/[0.06] p-3.5 transition-all hover:border-white/[0.14]"
                            >
                                <img
                                    src={
                                        product.seller?.avatar_url ??
                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(product.seller?.name ?? 'S')}&background=1a1a1a`
                                    }
                                    alt={product.seller?.name}
                                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-semibold text-white">{product.seller?.name}</p>
                                        {product.seller?.is_verified && <RiVerifiedBadgeLine size={14} color="#FF6B35" />}
                                    </div>
                                    <p className="text-flockr-muted text-xs">
                                        @{product.seller?.username}
                                        {product.seller?.total_sales > 0 && ` · ${Number(product.seller.total_sales).toLocaleString()} sales`}
                                    </p>
                                </div>
                                <RiArrowRightLine size={16} className="text-flockr-muted transition-colors group-hover:text-white" />
                            </Link>
                        </div>
                    </div>

                    {/* ── Tabs ──────────────────────────────────────────────── */}
                    <div className="mt-8 border-b border-white/[0.06]">
                        <div className="flex gap-6">
                            {[
                                { key: 'description', label: 'Description' },
                                { key: 'ai_description', label: 'AI Summary', Icon: RiSparkling2Line },
                                { key: 'videos', label: 'Videos', Icon: RiVideoLine },
                            ].map(({ key, label, Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => handleTabClick(key)}
                                    className={`flex items-center gap-1.5 pb-3 text-sm font-medium transition-colors ${
                                        activeTab === key ? 'tab-active text-white' : 'text-flockr-muted hover:text-white'
                                    }`}
                                >
                                    {Icon && <Icon size={13} />}
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="text-flockr-muted mt-4 text-sm leading-relaxed whitespace-pre-line">
                        {activeTab === 'description' &&
                            (() => {
                                const text = product.description || 'No description provided.';
                                const isLong = text.length > 500;
                                const shown = isLong && !descExpanded ? text.slice(0, 500) + '…' : text;
                                return (
                                    <div>
                                        <p style={{ whiteSpace: 'pre-line' }}>{shown}</p>
                                        {isLong && (
                                            <button
                                                onClick={() => setDescExpanded((e) => !e)}
                                                style={{
                                                    marginTop: 12,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#FF6B35',
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    padding: 0,
                                                }}
                                            >
                                                {descExpanded ? 'See less ↑' : 'See more ↓'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })()}

                        {activeTab === 'ai_description' && (
                            <>
                                {summaryLoading && (
                                    <div className="flex items-center gap-3 py-6">
                                        <RiLoader4Line size={18} style={{ animation: 'spin 0.8s linear infinite', color: '#FF6B35' }} />
                                        <span>Generating AI summary…</span>
                                    </div>
                                )}
                                {summaryError && !summaryLoading && (
                                    <div className="flex items-center gap-3 py-4">
                                        <p style={{ color: '#EF4444' }}>{summaryError}</p>
                                        <button
                                            onClick={generateSummary}
                                            style={{
                                                color: '#FF6B35',
                                                fontSize: 12,
                                                textDecoration: 'underline',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Retry
                                        </button>
                                    </div>
                                )}
                                {summary && !summaryLoading && (
                                    <div className="space-y-2">
                                        <div className="text-flockr-orange mb-3 flex items-center gap-2">
                                            <RiSparkling2Line size={14} />
                                            <span className="text-xs font-medium">AI-generated summary</span>
                                        </div>
                                        <p>{summary}</p>
                                    </div>
                                )}
                                {!summary && !summaryLoading && !summaryError && <p className="italic">No summary available.</p>}
                            </>
                        )}

                        {activeTab === 'videos' &&
                            (product.videos?.length > 0 ? (
                                <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3">
                                    {product.videos.map((v) => (
                                        <a
                                            key={v.id}
                                            href={`/@${v.user?.username}/video/${v.ulid}`}
                                            className="group relative aspect-[9/16] overflow-hidden rounded-2xl"
                                        >
                                            {v.thumbnail_url_full && (
                                                <img
                                                    src={v.thumbnail_url_full}
                                                    alt=""
                                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            )}
                                            <div className="video-overlay absolute inset-0" />
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <p className="italic">No videos yet for this product.</p>
                            ))}
                    </div>

                    {/* ── More from this seller ──────────────────────────────── */}
                    {sellerProducts.length > 0 && (
                        <div className="mt-10">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="font-display text-lg font-bold text-white">More from @{product.seller?.username}</h2>
                                <Link
                                    href={`/@${product.seller?.username}`}
                                    className="text-flockr-orange flex items-center gap-1 text-sm hover:underline"
                                >
                                    View all <RiArrowRightLine size={14} />
                                </Link>
                            </div>
                            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                                {sellerProducts.slice(0, 15).map((p) => (
                                    <div key={p.id} style={{ flexShrink: 0, width: 160 }}>
                                        <ProductCard product={p} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── You might also like ────────────────────────────────── */}
                    {similarProducts.length > 0 && (
                        <div className="mt-10">
                            <h2 className="font-display mb-4 text-lg font-bold text-white">You might also like</h2>
                            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                                {similarProducts.slice(0, 15).map((p) => (
                                    <div key={p.id} style={{ flexShrink: 0, width: 160 }}>
                                        <ProductCard product={p} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile sticky buy bar */}
                <div className="glass-dark fixed right-0 bottom-16 left-0 z-30 border-t border-white/[0.06] p-4 md:hidden">
                    <div className="flex items-center gap-3">
                        <div>
                            <p className="text-flockr-orange text-lg font-bold">₦{Number(product.price).toLocaleString()}</p>
                            {product.compare_price && (
                                <p className="text-flockr-muted text-xs line-through">₦{Number(product.compare_price).toLocaleString()}</p>
                            )}
                        </div>
                        <button
                            onClick={handleBuy}
                            disabled={!product.is_in_stock || buying}
                            className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 disabled:opacity-60"
                        >
                            {buying ? 'Processing...' : product.is_in_stock ? `Buy Now · ₦${totalPrice}` : 'Out of Stock'}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}

ProductShow.layout = (page) => <AppLayout>{page}</AppLayout>;
