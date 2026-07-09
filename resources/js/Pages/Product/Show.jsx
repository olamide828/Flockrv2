import ProductCard from '@/Components/Product/ProductCard';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useToast } from '@/Components/Toast';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    RiAddLine,
    RiArrowLeftLine,
    RiArrowLeftSLine,
    RiArrowRightLine,
    RiArrowRightSLine,
    RiBookmarkFill,
    RiBookmarkLine,
    RiCheckLine,
    RiCloseLine,
    RiFlashlightLine,
    RiImageAddLine,
    RiImageLine,
    RiLoader4Line,
    RiShieldCheckLine,
    RiShoppingCart2Line,
    RiSparkling2Line,
    RiStarFill,
    RiStarLine,
    RiSubtractLine,
    RiTruckLine,
    RiVerifiedBadgeLine,
    RiVideoLine,
    RiZoomInLine,
    RiCameraLine,
    RiFilterLine,
    RiMapPinAddLine,
    RiDeleteBinLine,
    RiMapPinLine,
    RiGiftLine,
    RiSecurePaymentLine,
} from 'react-icons/ri';

// ── Star picker ───────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }) {
    const [hovered, setHovered] = useState(0);
    return (
        <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => {
                const filled = n <= (hovered || value);
                return (
                    <button
                        key={n}
                        type="button"
                        onClick={() => onChange(n)}
                        onMouseEnter={() => setHovered(n)}
                        onMouseLeave={() => setHovered(0)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, lineHeight: 1, transition: 'transform 0.1s', transform: hovered >= n ? 'scale(1.15)' : 'scale(1)' }}
                    >
                        {filled
                            ? <RiStarFill size={30} color="#FBBF24" />
                            : <RiStarLine size={30} color="rgba(255,255,255,0.15)" />
                        }
                    </button>
                );
            })}
        </div>
    );
}

// ── Stars display (read-only) ─────────────────────────────────────────────────
function StarsDisplay({ rating, size = 13 }) {
    const full    = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {[1,2,3,4,5].map(n => (
                <RiStarFill
                    key={n}
                    size={size}
                    color={n <= full ? '#FBBF24' : (n === full + 1 && hasHalf) ? '#FBBF24' : 'rgba(255,255,255,0.12)'}
                    style={n === full + 1 && hasHalf ? { opacity: 0.55 } : {}}
                />
            ))}
        </div>
    );
}

// ── Rating bar row ────────────────────────────────────────────────────────────
function RatingBar({ star, count, total, onFilter, active }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <button
            onClick={() => onFilter(star)}
            style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '3px 0', width: '100%', textAlign: 'left',
            }}
        >
            <span style={{ color: active ? '#FBBF24' : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, width: 14, flexShrink: 0 }}>{star}</span>
            <RiStarFill size={11} color={active ? '#FBBF24' : 'rgba(255,255,255,0.2)'} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: active ? '#FBBF24' : 'rgba(251,191,36,0.45)', transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, width: 24, textAlign: 'right', flexShrink: 0 }}>{count}</span>
        </button>
    );
}

// ── Review lightbox ───────────────────────────────────────────────────────────
function ReviewLightbox({ photos, startIdx, onClose }) {
    const [idx, setIdx] = useState(startIdx);
    const prev = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + photos.length) % photos.length); };
    const next = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % photos.length); };

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft')  setIdx(i => (i - 1 + photos.length) % photos.length);
            if (e.key === 'ArrowRight') setIdx(i => (i + 1) % photos.length);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [photos.length, onClose]);

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 1 }}>
                <RiCloseLine size={22} />
            </button>
            {photos.length > 1 && (
                <span style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: 999 }}>
                    {idx + 1} / {photos.length}
                </span>
            )}
            <img src={photos[idx]} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '88vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: 14, userSelect: 'none', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }} />
            {photos.length > 1 && (
                <>
                    <button onClick={prev} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><RiArrowLeftSLine size={24} /></button>
                    <button onClick={next} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><RiArrowRightSLine size={24} /></button>
                </>
            )}
            {photos.length > 1 && (
                <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
                    {photos.map((url, i) => (
                        <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }} style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', border: `2px solid ${i === idx ? '#FF6B35' : 'rgba(255,255,255,0.2)'}`, padding: 0, cursor: 'pointer', background: 'none', flexShrink: 0, transition: 'border-color 0.15s' }}>
                            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Review card ───────────────────────────────────────────────────────────────
function ReviewCard({ review, onPhotoClick }) {
    const stars  = parseFloat(review.rating);
    const photos = Array.isArray(review.photo_urls) && review.photo_urls.length > 0
        ? review.photo_urls
        : (review.photo_url ? [review.photo_url] : []);

    return (
        <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <img
                    src={review.buyer?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(review.buyer?.name ?? 'U')}&background=1a1a1a&size=32`}
                    alt={review.buyer?.name}
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{review.buyer?.name ?? 'Buyer'}</span>
                        {/* Verified purchase badge */}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 999, fontSize: 10, fontWeight: 600, color: '#10B981', flexShrink: 0 }}>
                            <RiCheckLine size={9} /> Verified Purchase
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        <StarsDisplay rating={stars} size={12} />
                        <span style={{ color: '#FBBF24', fontSize: 11, fontWeight: 700 }}>{stars.toFixed(1)}</span>
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>·</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                            {new Date(review.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Review body */}
            {review.body && (
                <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.65 }}>
                    {review.body}
                </p>
            )}

            {/* Photos grid */}
            {photos.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {photos.map((url, i) => (
                        <button
                            key={i}
                            onClick={() => onPhotoClick(photos, i)}
                            style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', padding: 0, border: '1px solid rgba(255,255,255,0.08)', cursor: 'zoom-in', background: 'rgba(255,255,255,0.04)', flexShrink: 0, position: 'relative' }}
                        >
                            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            {photos.length > 1 && i === 2 && photos.length > 3 && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                                    +{photos.length - 3}
                                </div>
                            )}
                        </button>
                    )).slice(0, 3)}
                </div>
            )}
        </div>
    );
}

// ── Review form ───────────────────────────────────────────────────────────────
function ReviewForm({ orderId, onSubmitted }) {
    const [rating,        setRating]        = useState(0);
    const [body,          setBody]          = useState('');
    const [photoFiles,    setPhotoFiles]    = useState([]);
    const [photoPreviews, setPhotoPreviews] = useState([]);
    const [submitting,    setSubmitting]    = useState(false);
    const [error,         setError]         = useState('');
    const fileRef = useRef(null);

    const ratingLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

    const handlePhoto = (e) => {
        const files = Array.from(e.target.files ?? []).slice(0, 3 - photoFiles.length);
        if (!files.length) return;
        setPhotoFiles(prev => [...prev, ...files]);
        setPhotoPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
        e.target.value = '';
    };

    const removePhoto = (i) => {
        URL.revokeObjectURL(photoPreviews[i]);
        setPhotoFiles(prev  => prev.filter((_, idx) => idx !== i));
        setPhotoPreviews(prev => prev.filter((_, idx) => idx !== i));
    };

    const handleSubmit = async () => {
        if (rating === 0) { setError('Please select a star rating.'); return; }
        setError('');
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('rating', rating);
            if (body.trim()) fd.append('body', body.trim());
            photoFiles.forEach(f => fd.append('photos[]', f));
            const { data } = await axios.post(`/api/orders/${orderId}/review`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onSubmitted(data);
        } catch (err) {
            setError(err.response?.data?.message ?? 'Failed to submit review.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Star rating */}
            <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Overall Rating *</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <StarPicker value={rating} onChange={setRating} />
                    {rating > 0 && (
                        <span style={{ color: '#FBBF24', fontSize: 14, fontWeight: 700 }}>{ratingLabels[rating]}</span>
                    )}
                </div>
                {rating === 5 && photoFiles.length === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '8px 12px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 10 }}>
                        <RiCameraLine size={14} color="#FBBF24" />
                        <span style={{ color: 'rgba(255,193,7,0.8)', fontSize: 12 }}>Add a photo to keep your full 5★ rating</span>
                    </div>
                )}
            </div>

            {/* Review text */}
            <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Review <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></p>
                <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Share your experience — product quality, packaging, delivery speed…"
                    rows={4}
                    style={{
                        width: '100%', padding: '13px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 14, color: '#fff', fontSize: 14,
                        outline: 'none', resize: 'none', lineHeight: 1.65,
                        fontFamily: 'inherit', boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(255,107,53,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'right' }}>{body.length}/1000</p>
            </div>

            {/* Photos */}
            <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Photos <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(up to 3)</span>
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {photoPreviews.map((url, i) => (
                        <div key={i} style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                            <img src={url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 12, display: 'block', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <button
                                onClick={() => removePhoto(i)}
                                style={{ position: 'absolute', top: -7, right: -7, width: 22, height: 22, borderRadius: '50%', background: '#0a0a0a', border: '1.5px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 0 }}
                            >
                                <RiCloseLine size={12} />
                            </button>
                        </div>
                    ))}
                    {photoFiles.length < 3 && (
                        <button
                            onClick={() => fileRef.current?.click()}
                            style={{ width: 80, height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: 12, cursor: 'pointer', color: 'rgba(255,255,255,0.3)', flexShrink: 0, transition: 'border-color 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,107,53,0.4)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                        >
                            <RiImageAddLine size={22} color="rgba(255,255,255,0.25)" />
                            <span style={{ fontSize: 10, fontWeight: 600 }}>
                                {photoFiles.length === 0 ? 'Add photo' : `${3 - photoFiles.length} more`}
                            </span>
                        </button>
                    )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhoto} style={{ display: 'none' }} />
            </div>

            {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
                    <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{error}</p>
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                style={{ padding: '14px', background: rating === 0 || submitting ? 'rgba(255,107,53,0.3)' : '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: rating === 0 || submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}
            >
                {submitting
                    ? <><RiLoader4Line size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Submitting…</>
                    : <><RiCheckLine size={16} /> Submit Review</>
                }
            </button>
        </div>
    );
}

// ── Reviews section ───────────────────────────────────────────────────────────
function ReviewsSection({ product, reviews: initialReviews, userOrderId, auth }) {
    const avgRating    = parseFloat(product.avg_rating ?? 0);        // this product's rating
const totalReviews = Number(product.total_reviews ?? 0);          // this product's review count
const sellerAvg    = parseFloat(product.seller?.avg_rating ?? 0); // seller overall rating
const showRating   = avgRating > 0 && totalReviews > 0;
    const [reviewList,      setReviewList]      = useState(initialReviews ?? []);
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    const [earnedCoupon,    setEarnedCoupon]    = useState(null);
    const [filterStar,      setFilterStar]      = useState(null); // null = all
    const [filterPhoto,     setFilterPhoto]     = useState(false);
    const [page,            setPage]            = useState(1);
    const [hasMore,         setHasMore]         = useState(initialReviews?.length >= 10);
    const [loadingMore,     setLoadingMore]     = useState(false);
    const [reviewLightbox,  setReviewLightbox]  = useState(null);

    const canReview = !!userOrderId && !reviewSubmitted && auth?.user;

    // star breakdown from loaded reviews (approximate — for full accuracy backend should return counts)
    const starCounts = [5,4,3,2,1].map(s => ({
        star: s,
        count: reviewList.filter(r => Math.round(parseFloat(r.rating)) === s).length,
    }));

    const filtered = reviewList.filter(r => {
        if (filterStar !== null && Math.round(parseFloat(r.rating)) !== filterStar) return false;
        if (filterPhoto) {
            const photos = Array.isArray(r.photo_urls) ? r.photo_urls : (r.photo_url ? [r.photo_url] : []);
            if (photos.length === 0) return false;
        }
        return true;
    });

    const handleReviewSubmitted = (data) => {
        setReviewSubmitted(true);
        if (data.coupon) setEarnedCoupon(data.coupon);
        axios.get(`/api/products/${product.slug}/reviews`, { params: { page: 1, per_page: 10 } })
            .then(r => {
                setReviewList(r.data.reviews ?? []);
                setPage(1);
                setHasMore((r.data.reviews ?? []).length >= 10);
            }).catch(() => {});
    };

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const { data } = await axios.get(`/api/products/${product.slug}/reviews`, {
                params: { page: nextPage, per_page: 10 }
            });
            const newReviews = data.reviews ?? [];
            setReviewList(prev => [...prev, ...newReviews]);
            setPage(nextPage);
            setHasMore(newReviews.length >= 10);
        } catch {}
        finally { setLoadingMore(false); }
    };

    const clearFilters = () => { setFilterStar(null); setFilterPhoto(false); };
    const hasFilters = filterStar !== null || filterPhoto;

    return (
        <>
            {/* Review lightbox */}
            {reviewLightbox && (
                <ReviewLightbox
                    photos={reviewLightbox.photos}
                    startIdx={reviewLightbox.idx}
                    onClose={() => setReviewLightbox(null)}
                />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* ── Rating overview ────────────────────────────────────────── */}
                {showRating && (
                    <div style={{ display: 'flex', gap: 20, padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, marginBottom: 20 }}>
                        {/* Big number */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minWidth: 80 }}>
                            <p style={{ margin: 0, color: '#FBBF24', fontSize: 44, fontWeight: 900, lineHeight: 1, letterSpacing: '-2px' }}>{avgRating.toFixed(1)}</p>
                            <StarsDisplay rating={avgRating} size={14} />
                            <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center' }}>
                                {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                            </p>
                        </div>

                        {/* Bar breakdown */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center' }}>
                            {starCounts.map(({ star, count }) => (
                                <RatingBar
                                    key={star}
                                    star={star}
                                    count={count}
                                    total={reviewList.length}
                                    onFilter={s => setFilterStar(filterStar === s ? null : s)}
                                    active={filterStar === star}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Coupon earned ──────────────────────────────────────────── */}
                {earnedCoupon && (
                    <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, marginBottom: 16 }}>
                        <p style={{ margin: '0 0 4px', color: '#10B981', fontWeight: 700, fontSize: 15 }}>🎉 You earned a ₦200 coupon!</p>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                            Code: <strong style={{ color: '#fff', fontFamily: 'monospace', letterSpacing: 1 }}>{earnedCoupon.code}</strong>
                            {' '}· Use on orders of ₦{Number(earnedCoupon.min_order).toLocaleString()}+
                            · Expires {earnedCoupon.expires_at}
                        </p>
                    </div>
                )}

                {/* Review submitted success */}
                {reviewSubmitted && !earnedCoupon && (
                    <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <RiCheckLine size={15} color="#10B981" />
                        <p style={{ margin: 0, color: '#10B981', fontWeight: 600, fontSize: 13 }}>Review submitted — thank you!</p>
                    </div>
                )}

                {/* ── Write a review ─────────────────────────────────────────── */}
                {canReview && !reviewSubmitted && (
                    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '20px 18px', marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                            <div style={{ width: 3, height: 18, borderRadius: 2, background: '#FF6B35' }} />
                            <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>Write a Review</p>
                        </div>
                        <ReviewForm orderId={userOrderId} onSubmitted={handleReviewSubmitted} />
                    </div>
                )}

                {/* ── Filters ────────────────────────────────────────────────── */}
                {reviewList.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                            <RiFilterLine size={13} />
                            <span style={{ fontSize: 12 }}>Filter:</span>
                        </div>

                        {[5,4,3,2,1].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStar(filterStar === s ? null : s)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '5px 10px', borderRadius: 999,
                                    background: filterStar === s ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${filterStar === s ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                    color: filterStar === s ? '#FBBF24' : 'rgba(255,255,255,0.45)',
                                    fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                                }}
                            >
                                <RiStarFill size={11} color={filterStar === s ? '#FBBF24' : 'rgba(255,255,255,0.3)'} />
                                {s}
                            </button>
                        ))}

                        <button
                            onClick={() => setFilterPhoto(v => !v)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '5px 10px', borderRadius: 999,
                                background: filterPhoto ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${filterPhoto ? 'rgba(255,107,53,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                color: filterPhoto ? '#FF6B35' : 'rgba(255,255,255,0.45)',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                            }}
                        >
                            <RiCameraLine size={12} /> With photo
                        </button>

                        {hasFilters && (
                            <button onClick={clearFilters} style={{ padding: '5px 10px', borderRadius: 999, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                                Clear
                            </button>
                        )}

                        <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
                            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}

                {/* ── Reviews list ───────────────────────────────────────────── */}
                {filtered.length > 0 ? (
                    <div>
                        {filtered.map(r => (
                            <ReviewCard
                                key={r.id}
                                review={r}
                                onPhotoClick={(photos, idx) => setReviewLightbox({ photos, idx })}
                            />
                        ))}

                        {/* Load more */}
                        {hasMore && !hasFilters && (
                            <div style={{ paddingTop: 20, textAlign: 'center' }}>
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: loadingMore ? 'not-allowed' : 'pointer', opacity: loadingMore ? 0.6 : 1 }}
                                >
                                    {loadingMore
                                        ? <><RiLoader4Line size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading…</>
                                        : 'Load more reviews'
                                    }
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: hasFilters ? '30px 0' : '50px 0' }}>
                        <RiStarLine size={40} color="rgba(255,255,255,0.1)" style={{ display: 'block', margin: '0 auto 12px' }} />
                        <p style={{ margin: '0 0 4px', color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 600 }}>
                            {hasFilters ? 'No reviews match this filter' : 'No reviews yet'}
                        </p>
                        {hasFilters && (
                            <button onClick={clearFilters} style={{ marginTop: 10, color: '#FF6B35', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                Clear filters
                            </button>
                        )}
                        {!hasFilters && canReview && !reviewSubmitted && (
                            <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Be the first to review this seller!</p>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

const NG_STATES = [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
    'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
    'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
    'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
    'Yobe','Zamfara',
];

function AddressFormModal({ onClose, onSaved, editing = null }) {
    const [form, setForm] = useState({
        label:          editing?.label          ?? 'Home',
        recipient_name: editing?.recipient_name ?? '',
        phone:          editing?.phone          ?? '',
        street:         editing?.street         ?? '',
        city:           editing?.city           ?? '',
        state:          editing?.state          ?? '',
        postal_code:    editing?.postal_code    ?? '',
        is_default:     editing?.is_default     ?? false,
    });
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState('');

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.recipient_name || !form.phone || !form.street || !form.city || !form.state) {
            setError('Please fill in all required fields.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            if (editing) {
                const { data } = await axios.put(`/api/addresses/${editing.id}`, form);
                onSaved(data.address, 'update');
            } else {
                const { data } = await axios.post('/api/addresses', form);
                onSaved(data.address, 'add');
            }
            onClose();
        } catch (err) {
            setError(err.response?.data?.message ?? 'Failed to save address.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} />
            <div style={{ position: 'relative', width: '100%', maxWidth: 560, background: '#111', borderRadius: '24px 24px 0 0', padding: '0 0 40px', maxHeight: '90vh', overflowY: 'auto', zIndex: 1 }}>
                {/* Handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
                </div>

                <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 700 }}>
                        {editing ? 'Edit Address' : 'Add New Address'}
                    </h3>
                    <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <RiCloseLine size={18} />
                    </button>
                </div>

                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Label */}
                    <div>
                        <p style={labelStyle}>Address Label</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {['Home', 'Work', 'Other'].map(l => (
                                <button key={l} onClick={() => set('label', l)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: form.label === l ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${form.label === l ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.08)'}`, color: form.label === l ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <AddrField label="Recipient Name *">
                        <input value={form.recipient_name} onChange={e => set('recipient_name', e.target.value)} placeholder="Full name of recipient" style={inp} />
                    </AddrField>

                    <AddrField label="Phone Number *">
                        <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="080xxxxxxxx" type="tel" style={inp} />
                    </AddrField>

                    <AddrField label="Street Address *">
                        <input value={form.street} onChange={e => set('street', e.target.value)} placeholder="House number, street name" style={inp} />
                    </AddrField>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <AddrField label="City *">
                            <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Ikeja" style={inp} />
                        </AddrField>
                        <AddrField label="State *">
                            <select value={form.state} onChange={e => set('state', e.target.value)} style={{ ...inp, appearance: 'none' }}>
                                <option value="">Select state</option>
                                {NG_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </AddrField>
                    </div>

                    {/* Default toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                        <div onClick={() => set('is_default', !form.is_default)} style={{ width: 42, height: 24, borderRadius: 999, background: form.is_default ? '#FF6B35' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}>
                            <div style={{ position: 'absolute', top: 3, left: form.is_default ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Set as default address</span>
                    </label>

                    {error && <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{error}</p>}

                    <button onClick={handleSave} disabled={saving} style={{ padding: '14px', background: saving ? 'rgba(255,107,53,0.4)' : '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
                        {saving ? <><RiLoader4Line size={16} style={{ animation: 'spin 0.8s linear infinite' }} />Saving…</> : <><RiCheckLine size={16} />{editing ? 'Update Address' : 'Save Address'}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CheckoutModal({ items, addresses, subtotal, onClose, onSuccess, showToast }) {
    const STEPS = ['address', 'delivery', 'confirm'];
    const [step,            setStep]            = useState('address');
    const [selectedAddr,    setSelectedAddr]    = useState(addresses.find(a => a.is_default) ?? addresses[0] ?? null);
    const [addrList,        setAddrList]        = useState(addresses);
    const [showAddrForm,    setShowAddrForm]    = useState(addresses.length === 0);
    const [editingAddr,     setEditingAddr]     = useState(null);
    const [rates,           setRates]           = useState([]);
    const [loadingRates,    setLoadingRates]    = useState(false);
    const [selectedRate,    setSelectedRate]    = useState(null);
    const [couponCode,      setCouponCode]      = useState('');
    const [couponOpen,      setCouponOpen]      = useState(false);
    const [couponApplied,   setCouponApplied]   = useState(null);
    const [couponError,     setCouponError]     = useState('');
    const [couponLoading,   setCouponLoading]   = useState(false);
    const [checking,        setChecking]        = useState(false);
  

    // Primary seller ID (for rate lookup — first seller in cart)
    const primarySellerId = items[0]?.product?.seller?.id;

    const fetchRates = async (addr) => {
        if (!addr || !primarySellerId) return;
        setLoadingRates(true);
        setRates([]);
        setSelectedRate(null);
        try {
            const { data } = await axios.post('/api/shipping/rates', {
                address_id: addr.id,
                seller_id:  primarySellerId,
                items:      items.map(i => i.id),
            });
            setRates(data.rates ?? []);
            if (data.rates?.length > 0) setSelectedRate(data.rates[0]);
        } catch (err) {
            showToast(err.response?.data?.message ?? 'Could not load shipping rates.', 'error');
        } finally {
            setLoadingRates(false);
        }
    };

    const goToDelivery = () => {
        setStep('delivery');
        fetchRates(selectedAddr);
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        setCouponError('');
        try {
            const { data } = await axios.post('/api/cart/validate-coupon', { code: couponCode });
            setCouponApplied(data.coupon);
            setCouponError('');
        } catch (err) {
            setCouponError(err.response?.data?.message ?? 'Invalid coupon.');
            setCouponApplied(null);
        } finally {
            setCouponLoading(false);
        }
    };

    const handleRemoveCoupon = () => {
        setCouponApplied(null);
        setCouponCode('');
        setCouponError('');
    };

    const courierFee    = selectedRate ? selectedRate.amount : 0;
    const discount      = couponApplied ? Math.min(couponApplied.amount, subtotal) : 0;
    const grandTotal    = subtotal + courierFee - discount;

   const handleCheckout = async () => {
    if (!selectedAddr || !selectedRate) return;
    setChecking(true);
    try {
        let data;
        if (singleProductMode) {
            // Direct product checkout (Buy Now from product page)
            const res = await axios.post('/api/orders/checkout', {
                product_id:   productId,
                quantity:     productQuantity,
                address_id:   selectedAddr.id,
                rate_id:      selectedRate.rate_id,
                carrier:      selectedRate.carrier,
                courier_fee:  selectedRate.amount,
                coupon_code:  couponApplied?.code ?? null,
            });
            data = res.data;
        } else {
            // Cart checkout
            const res = await axios.post('/api/cart/checkout', {
                address_id:  selectedAddr.id,
                rate_id:     selectedRate.rate_id,
                carrier:     selectedRate.carrier,
                courier_fee: selectedRate.amount,
                coupon_code: couponApplied?.code ?? null,
            });
            data = res.data;
        }
        window.location.href = data.authorization_url;
    } catch (err) {
        showToast(err.response?.data?.message ?? 'Checkout failed.', 'error');
        setChecking(false);
    }
};

    const handleAddrSaved = (addr, type) => {
        if (type === 'add') {
            setAddrList(prev => [addr, ...prev]);
            setSelectedAddr(addr);
        } else {
            setAddrList(prev => prev.map(a => a.id === addr.id ? addr : a));
            if (selectedAddr?.id === addr.id) setSelectedAddr(addr);
        }
        setShowAddrForm(false);
        setEditingAddr(null);
    };

    const handleDeleteAddr = async (addr) => {
        if (!confirm('Remove this address?')) return;
        try {
            await axios.delete(`/api/addresses/${addr.id}`);
            const updated = addrList.filter(a => a.id !== addr.id);
            setAddrList(updated);
            if (selectedAddr?.id === addr.id) setSelectedAddr(updated[0] ?? null);
        } catch {}
    };

    return (
        <>
            {showAddrForm && (
                <AddressFormModal
                    editing={editingAddr}
                    onClose={() => { setShowAddrForm(false); setEditingAddr(null); }}
                    onSaved={handleAddrSaved}
                />
            )}

            <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />

                <div style={{ position: 'relative', width: '100%', maxWidth: 560, background: '#0f0f0f', borderRadius: '28px 28px 0 0', maxHeight: '92vh', overflowY: 'auto', zIndex: 1, paddingBottom: 32 }}>
                    {/* Handle bar */}
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
                        <div style={{ width: 44, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
                    </div>

                    {/* Header */}
                    <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                        {step !== 'address' && (
                            <button onClick={() => setStep(step === 'confirm' ? 'delivery' : 'address')} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                                <RiArrowLeftLine size={17} />
                            </button>
                        )}
                        <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 700, flex: 1 }}>
                            {step === 'address'  ? 'Delivery Address'   : ''}
                            {step === 'delivery' ? 'Choose Courier'     : ''}
                            {step === 'confirm'  ? 'Order Summary'      : ''}
                        </h3>
                        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <RiCloseLine size={18} />
                        </button>
                    </div>

                    {/* Step indicator */}
                    <div style={{ display: 'flex', gap: 4, padding: '10px 20px 16px' }}>
                        {STEPS.map((s, i) => (
                            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: STEPS.indexOf(step) >= i ? '#FF6B35' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                        ))}
                    </div>

                    <div style={{ padding: '0 20px' }}>

                        {/* ── STEP 1: Address ──────────────────────────────── */}
                        {step === 'address' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {addrList.map(addr => (
                                    <div
                                        key={addr.id}
                                        onClick={() => setSelectedAddr(addr)}
                                        style={{ padding: '14px 16px', borderRadius: 16, background: selectedAddr?.id === addr.id ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${selectedAddr?.id === addr.id ? 'rgba(255,107,53,0.35)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', transition: 'all 0.15s' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                            {/* Radio */}
                                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selectedAddr?.id === addr.id ? '#FF6B35' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                                {selectedAddr?.id === addr.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6B35' }} />}
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{addr.label}</span>
                                                    {addr.is_default && <span style={{ padding: '1px 8px', background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.2)', borderRadius: 999, color: '#FF6B35', fontSize: 10, fontWeight: 700 }}>DEFAULT</span>}
                                                </div>
                                                <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{addr.recipient_name}</p>
                                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{addr.phone}</p>
                                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{addr.street}, {addr.city}, {addr.state}</p>
                                            </div>

                                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                <button onClick={e => { e.stopPropagation(); setEditingAddr(addr); setShowAddrForm(true); }} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>✏️</button>
                                                <button onClick={e => { e.stopPropagation(); handleDeleteAddr(addr); }} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                                                    <RiDeleteBinLine size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {addrList.length < 5 && (
                                    <button onClick={() => { setEditingAddr(null); setShowAddrForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 16, background: 'none', border: '1.5px dashed rgba(255,255,255,0.12)', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600, transition: 'border-color 0.15s' }}>
                                        <RiMapPinAddLine size={18} color="#FF6B35" />
                                        Add new address
                                    </button>
                                )}

                                <button
                                    onClick={goToDelivery}
                                    disabled={!selectedAddr}
                                    style={{ padding: '14px', background: !selectedAddr ? 'rgba(255,107,53,0.3)' : '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: !selectedAddr ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}
                                >
                                    <RiTruckLine size={16} /> Choose Delivery Method
                                </button>
                            </div>
                        )}

                        {/* ── STEP 2: Courier rates ─────────────────────── */}
                        {step === 'delivery' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {/* Selected address chip */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                                    <RiMapPinLine size={14} color="#FF6B35" />
                                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, flex: 1 }}>
                                        Delivering to: {selectedAddr?.street}, {selectedAddr?.city}
                                    </span>
                                    <button onClick={() => setStep('address')} style={{ color: '#FF6B35', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Change</button>
                                </div>

                                {loadingRates && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', justifyContent: 'center' }}>
                                        <RiLoader4Line size={20} color="#FF6B35" style={{ animation: 'spin 0.8s linear infinite' }} />
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Getting shipping rates…</span>
                                    </div>
                                )}

                              

                                {!loadingRates && rates.map(rate => (
                                    <div
                                        key={rate.rate_id}
                                        onClick={() => setSelectedRate(rate)}
                                        style={{ padding: '14px 16px', borderRadius: 16, background: selectedRate?.rate_id === rate.rate_id ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${selectedRate?.rate_id === rate.rate_id ? 'rgba(255,107,53,0.35)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s' }}
                                    >
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selectedRate?.rate_id === rate.rate_id ? '#FF6B35' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {selectedRate?.rate_id === rate.rate_id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6B35' }} />}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: 0, color: '#fff', fontSize: 14, fontWeight: 700 }}>{rate.carrier}</p>
                                            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{rate.service} · {rate.estimated_days}</p>
                                        </div>

                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <p style={{ margin: 0, color: '#FF6B35', fontWeight: 800, fontSize: 15 }}>₦{Number(rate.amount).toLocaleString()}</p>
                                            {rate.pickup_eta && <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Pickup: {rate.pickup_eta}</p>}
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setStep('confirm')}
                                    disabled={!selectedRate || loadingRates}
                                    style={{ padding: '14px', background: (!selectedRate || loadingRates) ? 'rgba(255,107,53,0.3)' : '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: (!selectedRate || loadingRates) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}
                                >
                                    Continue
                                </button>
                            </div>
                        )}

                        {/* ── STEP 3: Confirm ──────────────────────────── */}
                        {step === 'confirm' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {/* Delivery summary */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <RiMapPinLine size={14} color="#FF6B35" />
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivering to</span>
                                    </div>
                                    <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{selectedAddr?.recipient_name} · {selectedAddr?.phone}</p>
                                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{selectedAddr?.street}, {selectedAddr?.city}, {selectedAddr?.state}</p>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <RiTruckLine size={18} color="#FF6B35" />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{selectedRate?.carrier} · {selectedRate?.service}</p>
                                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{selectedRate?.estimated_days}</p>
                                    </div>
                                    <span style={{ color: '#FF6B35', fontWeight: 700, fontSize: 14 }}>₦{Number(selectedRate?.amount ?? 0).toLocaleString()}</span>
                                </div>

                                {/* Coupon field */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
                                    <button
                                        onClick={() => setCouponOpen(v => !v)}
                                        style={{ width: '100%', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
                                    >
                                        <RiGiftLine size={16} color={couponApplied ? '#10B981' : '#FF6B35'} />
                                        <span style={{ color: couponApplied ? '#10B981' : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, flex: 1 }}>
                                            {couponApplied ? `${couponApplied.code} — ₦${Number(couponApplied.amount).toLocaleString()} off` : 'Have a promo code?'}
                                        </span>
                                        {couponApplied
                                            ? <button onClick={e => { e.stopPropagation(); handleRemoveCoupon(); }} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                                            : <RiArrowRightLine size={14} color="rgba(255,255,255,0.3)" style={{ transform: couponOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                        }
                                    </button>

                                    {couponOpen && !couponApplied && (
                                        <div style={{ padding: '0 14px 14px', display: 'flex', gap: 8 }}>
                                            <input
                                                value={couponCode}
                                                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                                placeholder="Enter code e.g. FLKRATE-XXXX-XXXX"
                                                onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                                                style={{ ...inp, flex: 1, padding: '10px 12px', fontSize: 13, fontFamily: 'monospace', letterSpacing: 1 }}
                                            />
                                            <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode} style={{ padding: '10px 14px', background: '#FF6B35', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, opacity: (!couponCode || couponLoading) ? 0.5 : 1 }}>
                                                {couponLoading ? '…' : 'Apply'}
                                            </button>
                                        </div>
                                    )}
                                    {couponError && <p style={{ color: '#EF4444', fontSize: 12, margin: '0 14px 12px', padding: '8px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>{couponError}</p>}
                                </div>

                                {/* Price breakdown */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <SummaryRow label="Subtotal"  value={`₦${subtotal.toLocaleString()}`} />
                                    <SummaryRow label="Delivery"  value={`₦${Number(selectedRate?.amount ?? 0).toLocaleString()}`} />
                                    {couponApplied && (
                                        <SummaryRow label={`Promo (${couponApplied.code})`} value={`-₦${Number(discount).toLocaleString()}`} valueColor="#10B981" />
                                    )}
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
                                    <SummaryRow label="Total" value={`₦${Math.max(0, grandTotal).toLocaleString()}`} bold />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12 }}>
                                    <RiShieldCheckLine size={14} color="#10B981" />
                                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Secure payment via Paystack. Buyer protection included.</span>
                                </div>

                                

                                <button
                                    onClick={handleCheckout}
                                    disabled={checking}
                                    style={{ padding: '15px', background: checking ? 'rgba(255,107,53,0.5)' : '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: checking ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                                >
                                    {checking
                                        ? <><RiLoader4Line size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Redirecting to payment…</>
                                        : <><RiSecurePaymentLine size={18} /> Pay ₦{Math.max(0, grandTotal).toLocaleString()}</>
                                    }
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProductShow({ product, similarProducts = [], reviews = [], userOrderId = null }) {
    const { auth } = usePage().props;
    const [activeImg,      setActiveImg]      = useState(0);
    const [quantity,       setQuantity]       = useState(1);
    const [buying,         setBuying]         = useState(false);
    const [saved,          setSaved]          = useState(product.is_saved ?? false);
    const [activeTab,      setActiveTab]      = useState('description');
    const [sellerProducts, setSellerProducts] = useState([]);
    const [lightboxOpen,   setLightboxOpen]   = useState(false);
    const [lightboxIdx,    setLightboxIdx]    = useState(0);
    const [summary,        setSummary]        = useState(product.ai_description ?? '');
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError,   setSummaryError]   = useState('');
    const [descExpanded,   setDescExpanded]   = useState(false);
    const [addingToCart,   setAddingToCart]   = useState(false);
    const [addedToCart,    setAddedToCart]    = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
const [addresses,    setAddresses]    = useState([]);

const { showToast, ToastComponent } = useToast();

   const avgRating    = parseFloat(product.avg_rating ?? 0);           // this product only
const totalReviews = Number(product.total_reviews ?? 0);             // this product only
const sellerAvg    = parseFloat(product.seller?.avg_rating ?? 0);   // seller overall
const sellerTotal  = Number(product.seller?.total_reviews ?? 0);     // seller overall
const showRating   = avgRating > 0 && totalReviews > 0;

    const r2Base = typeof window !== 'undefined' && window.flockrConfig?.r2Url
        ? window.flockrConfig.r2Url.replace(/\/$/, '') : '';

    const allImages = (() => {
        if (Array.isArray(product.image_urls) && product.image_urls.length > 0) return product.image_urls;
        if (product.primary_image) return [product.primary_image];
        const raw = product.images ?? [];
        if (raw.length) return raw.map(img => (img.startsWith('http') ? img : `${r2Base}/${img}`));
        return [];
    })();

    const totalPrice = (Number(product.price) * quantity).toLocaleString();

    useEffect(() => {
        if (!product.seller?.id) return;
        axios.get('/api/shop/products', { params: { seller_id: product.seller.id, per_page: 9 } })
            .then(r => {
                const others = (r.data.data ?? []).filter(p => p.id !== product.id);
                setSellerProducts(others.slice(0, 8));
            }).catch(() => {});
    }, [product.id]);

    useEffect(() => {
    if (!showCheckout || !auth?.user) return;
    axios.get('/api/addresses').then(r => setAddresses(r.data.addresses ?? [])).catch(() => {});
}, [showCheckout, auth?.user]);



    const generateSummary = useCallback(async () => {
        if (summary) return;
        setSummaryLoading(true); setSummaryError('');
        try {
            const firstVideo = product.videos?.[0];
            if (firstVideo?.ulid) {
                const { data } = await axios.post(`/api/videos/${firstVideo.ulid}/summary`);
                setSummary(data.summary ?? '');
            } else {
                const { data } = await axios.post('/api/products/summary', { product_id: product.id });
                setSummary(data.summary ?? '');
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || '';
            if (msg.includes('timeout') || msg.includes('cURL error 28')) setSummaryError('Network error. Try again.');
            else if (msg.includes('429') || msg.includes('quota')) setSummaryError('AI limit reached. Try again later.');
            else setSummaryError('Failed to generate summary.');
        } finally { setSummaryLoading(false); }
    }, [product.id, product.videos, summary]);

    const handleTabClick = (key) => {
        setActiveTab(key);
        if (key === 'ai_description' && !summary && !summaryLoading) generateSummary();
    };

    const handleBuy = async () => {
    if (!auth?.user) { router.visit('/login'); return; }
    setShowCheckout(true);
};

    const handleSave = async () => {
        if (!auth?.user) { router.visit('/login'); return; }
        setSaved(s => !s);
        await axios.post(`/api/products/${product.id}/save`).catch(() => setSaved(s => !s));
    };

    const handleAddToCart = async () => {
        if (!auth?.user) { router.visit('/login'); return; }
        setAddingToCart(true);
        try {
            await axios.post('/api/cart', { product_id: product.id, quantity });
            setAddedToCart(true);
            setTimeout(() => setAddedToCart(false), 2500);
            window.dispatchEvent(new CustomEvent('flockr:cart'));
        } catch (err) {
            showToast(err.response?.data?.message ?? 'Failed to add to cart.', 'error')

        } finally { setAddingToCart(false); }
    };

    const prevImg = () => setActiveImg(i => (i - 1 + allImages.length) % allImages.length);
    const nextImg = () => setActiveImg(i => (i + 1) % allImages.length);
    const openLightbox  = idx => { setLightboxIdx(idx); setLightboxOpen(true); };
    const closeLightbox = ()  => setLightboxOpen(false);
    const lbPrev = e => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + allImages.length) % allImages.length); };
    const lbNext = e => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % allImages.length); };

    useEffect(() => {
        if (!lightboxOpen) return;
        const onKey = e => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft')  setLightboxIdx(i => (i - 1 + allImages.length) % allImages.length);
            if (e.key === 'ArrowRight') setLightboxIdx(i => (i + 1) % allImages.length);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [lightboxOpen, allImages.length]);

    const isReviewsTab = activeTab === 'reviews';

    return (
        <>
            <Head title={product.name} />

            {/* Product image lightbox */}
            {lightboxOpen && allImages.length > 0 && (
                <div onClick={closeLightbox} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button onClick={closeLightbox} style={{ position: 'absolute', top: 18, right: 18, width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 1 }}><RiCloseLine size={22} /></button>
                    <span style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600 }}>{lightboxIdx + 1} / {allImages.length}</span>
                    <img src={allImages[lightboxIdx]} alt={product.name} onClick={e => e.stopPropagation()} style={{ maxWidth: '88vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: 14, userSelect: 'none', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }} />
                    {allImages.length > 1 && (<>
                        <button onClick={lbPrev} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><RiArrowLeftSLine size={26} /></button>
                        <button onClick={lbNext} style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><RiArrowRightSLine size={26} /></button>
                        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
                            {allImages.map((img, i) => (
                                <button key={i} onClick={e => { e.stopPropagation(); setLightboxIdx(i); }} style={{ width: 50, height: 50, borderRadius: 10, overflow: 'hidden', border: `2px solid ${i === lightboxIdx ? '#FF6B35' : 'rgba(255,255,255,0.2)'}`, padding: 0, cursor: 'pointer', background: 'none', flexShrink: 0 }}>
                                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </button>
                            ))}
                        </div>
                    </>)}
                </div>
            )}

            <div className="scroll-hidden bg-flockr-black h-screen overflow-y-auto">
                {/* Top bar */}
                <div className="bg-flockr-black/90 sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 backdrop-blur-md">
                    <button onClick={() => window.history.back()} className="text-flockr-muted rounded-full p-2 transition-colors hover:bg-white/[0.06] hover:text-white">
                        <RiArrowLeftLine size={20} />
                    </button>
                    <h1 className="font-display flex-1 truncate text-sm font-bold text-white">{product.name}</h1>
                    <button onClick={handleSave} className="rounded-full p-2 transition-colors hover:bg-white/[0.06]">
                        {saved ? <RiBookmarkFill size={20} color="#FBBF24" /> : <RiBookmarkLine size={20} className="text-flockr-muted" />}
                    </button>
                </div>

                <div className="mx-auto max-w-5xl px-4 py-6 pb-32 md:pb-8">
                    <div className="md:grid md:grid-cols-2 md:gap-10">
                        {/* Images */}
                        <div className="space-y-3">
                            <div className="bg-flockr-card relative aspect-square overflow-hidden rounded-2xl border border-white/[0.06]">
                                {allImages.length > 0 && allImages[activeImg] ? (
                                    <img src={allImages[activeImg]} alt={product.name} className="h-full w-full cursor-zoom-in object-cover" onClick={() => openLightbox(activeImg)} />
                                ) : (
                                    <div className="text-flockr-subtle flex h-full w-full items-center justify-center"><RiImageLine size={64} /></div>
                                )}
                                {allImages.length > 0 && (
                                    <button onClick={() => openLightbox(activeImg)} style={{ position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', backdropFilter: 'blur(4px)' }}><RiZoomInLine size={16} /></button>
                                )}
                                {product.discount_percent && <span className="badge badge-orange absolute top-3 left-3 text-sm">-{product.discount_percent}% OFF</span>}
                                {allImages.length > 1 && (<>
                                    <button onClick={prevImg} className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"><RiArrowLeftSLine size={22} /></button>
                                    <button onClick={nextImg} className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"><RiArrowRightSLine size={22} /></button>
                                    <div className="absolute right-0 bottom-3 left-0 flex justify-center gap-1.5">
                                        {allImages.map((_, i) => <button key={i} onClick={() => setActiveImg(i)} style={{ width: i === activeImg ? 18 : 6, height: 6, borderRadius: 3, padding: 0, border: 'none', cursor: 'pointer', background: i === activeImg ? '#FF6B35' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }} />)}
                                    </div>
                                </>)}
                            </div>
                            {allImages.length > 1 && (
                                <div className="scroll-hidden flex gap-2 overflow-x-auto">
                                    {allImages.map((img, i) => (
                                        <button key={i} onClick={() => setActiveImg(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${activeImg === i ? 'border-flockr-orange' : 'border-white/[0.08] hover:border-white/20'}`}>
                                            {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <div className="bg-flockr-card h-full w-full" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Product info */}
                        <div className="mt-5 space-y-5 md:mt-0">
                            {product.category && (
                                <div className="text-flockr-muted flex items-center gap-1.5 text-xs">
                                    <Link href="/shop" className="transition-colors hover:text-white">Shop</Link>
                                    <span>/</span>
                                    <span className="text-white">{product.category.name}</span>
                                </div>
                            )}

                            <h1 className="font-display lg:text-2xl text-xl leading-snug font-bold text-white">{product.name}</h1>

                            {/* Price + inline rating */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                                    <span className="text-flockr-orange font-display text-3xl font-bold">₦{Number(product.price).toLocaleString()}</span>
                                    {product.compare_price && <span className="text-flockr-muted mb-0.5 text-lg line-through">₦{Number(product.compare_price).toLocaleString()}</span>}
                                </div>
                                {showRating && (
                                    <button
                                        onClick={() => handleTabClick('reviews')}
                                        style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        <StarsDisplay rating={avgRating} size={13} />
<span style={{ color: '#FBBF24', fontSize: 13, fontWeight: 700 }}>{avgRating.toFixed(1)}</span>
<span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>({totalReviews})</span>
                                    </button>
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
                                                {Array.isArray(val)
                                                    ? val.map(v => <span key={v} className="hover:border-flockr-orange cursor-pointer rounded-xl border border-white/[0.1] px-3 py-1.5 text-sm text-white transition-colors">{v}</span>)
                                                    : <span className="rounded-xl border border-white/[0.1] px-3 py-1.5 text-sm text-white">{val}</span>
                                                }
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {product.is_in_stock && (
                                <div className="flex items-center gap-3">
                                    <span className="text-flockr-muted text-sm">Qty</span>
                                    <div className="bg-flockr-card flex items-center gap-1 rounded-xl border border-white/[0.08]">
                                        <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-flockr-muted flex items-center px-3 py-2.5 transition-colors hover:text-white"><RiSubtractLine size={16} /></button>
                                        <span className="min-w-[2ch] px-3 text-center text-sm font-semibold text-white">{quantity}</span>
                                        <button onClick={() => setQuantity(q => Math.min(product.stock_quantity, q + 1))} className="text-flockr-muted flex items-center px-3 py-2.5 transition-colors hover:text-white"><RiAddLine size={16} /></button>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button onClick={handleAddToCart} disabled={!product.is_in_stock || addingToCart} className="btn-ghost flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-60">
                                    {addingToCart ? 'Adding...' : addedToCart ? '✓ Added' : `Cart · ₦${totalPrice}`}
                                </button>
                                <button onClick={handleBuy} disabled={!product.is_in_stock || buying} className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-60">
                                    {buying ? (<><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Processing...</>) : product.is_in_stock ? (<><RiFlashlightLine size={18} /> Buy Now</>) : 'Out of Stock'}
                                </button>
                                <button onClick={handleSave} className="btn-ghost flex items-center gap-1.5 rounded-2xl px-4 py-3.5">
                                    {saved ? <RiBookmarkFill size={17} color="#FBBF24" /> : <RiBookmarkLine size={17} />}
                                </button>
                            </div>

                            <div className="bg-flockr-card space-y-3 rounded-2xl border border-white/[0.06] p-4">
                                <div className="flex items-start gap-3 text-sm">
                                    <RiTruckLine size={18} color="#FF6B35" className="mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-medium text-white">{Number(product.shipping_fee) === 0 ? 'Free Shipping' : `₦${Number(product.shipping_fee).toLocaleString()} delivery`}</p>
                                        <p className="text-flockr-muted mt-0.5 text-xs">{product.ships_nationwide ? 'Ships nationwide across Nigeria' : `Ships from ${product.location ?? 'Nigeria'}`}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-sm">
                                    <RiShieldCheckLine size={18} color="#10B981" className="mt-0.5 shrink-0" />
                                    <p className="text-flockr-muted text-xs">Secure payment via Paystack. Buyer protection included.</p>
                                </div>
                            </div>

                            <Link href={`/@${product.seller?.username}`} className="bg-flockr-card group flex items-center gap-3 rounded-2xl border border-white/[0.06] p-3.5 transition-all hover:border-white/[0.14]">
                                <img src={product.seller?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(product.seller?.name ?? 'S')}&background=1a1a1a`} alt={product.seller?.name} className="h-11 w-11 shrink-0 rounded-full object-cover" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-semibold text-white">{product.seller?.name}</p>
                                        {product.seller?.is_verified && <RiVerifiedBadgeLine size={14} color="#FF6B35" />}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                        <p className="text-flockr-muted text-xs">@{product.seller?.username}{product.seller?.total_sales > 0 && ` · ${Number(product.seller.total_sales).toLocaleString()} sales`}</p>
                                        {sellerAvg > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                <RiStarFill size={11} color="#FBBF24" />
<span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>{sellerAvg.toFixed(1)}</span>
<span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>({sellerTotal > 99 ? '99+' : sellerTotal})</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <RiArrowRightLine size={16} className="text-flockr-muted transition-colors group-hover:text-white" />
                            </Link>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="mt-8 border-b border-white/[0.06]">
                        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
                            {[
                                { key: 'description',    label: 'Description' },
                                { key: 'ai_description', label: 'AI Summary',  Icon: RiSparkling2Line },
                                { key: 'videos',         label: 'Videos',      Icon: RiVideoLine      },
                                { key: 'reviews',        label: totalReviews > 0 ? `Reviews (${totalReviews})` : 'Reviews' },
                            ].map(({ key, label, Icon }) => (
                                <button key={key} onClick={() => handleTabClick(key)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 16px 12px 0', background: 'none', border: 'none', borderBottom: activeTab === key ? '2px solid #FF6B35' : '2px solid transparent', color: activeTab === key ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: activeTab === key ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s', marginBottom: -1 }}>
                                    {Icon && <Icon size={13} />}{label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab content */}
                    <div className="mt-4">

                        {activeTab === 'description' && (() => {
                            const text   = product.description || 'No description provided.';
                            const isLong = text.length > 500;
                            const shown  = isLong && !descExpanded ? text.slice(0, 500) + '…' : text;
                            return (
                                <div className="text-flockr-muted text-sm leading-relaxed">
                                    <p style={{ whiteSpace: 'pre-line' }}>{shown}</p>
                                    {isLong && <button onClick={() => setDescExpanded(e => !e)} style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontSize: 13, fontWeight: 600, padding: 0 }}>{descExpanded ? 'See less ↑' : 'See more ↓'}</button>}
                                </div>
                            );
                        })()}

                        {activeTab === 'ai_description' && (
                            <div className="text-flockr-muted text-sm leading-relaxed">
                                {summaryLoading && <div className="flex items-center gap-3 py-6"><RiLoader4Line size={18} style={{ animation: 'spin 0.8s linear infinite', color: '#FF6B35' }} /><span>Generating AI summary…</span></div>}
                                {summaryError && !summaryLoading && <div className="flex items-center gap-3 py-4"><p style={{ color: '#EF4444' }}>{summaryError}</p><button onClick={generateSummary} style={{ color: '#FF6B35', fontSize: 12, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button></div>}
                                {summary && !summaryLoading && <div className="space-y-2"><div className="text-flockr-orange mb-3 flex items-center gap-2"><RiSparkling2Line size={14} /><span className="text-xs font-medium">AI-generated summary</span></div><p>{summary}</p></div>}
                                {!summary && !summaryLoading && !summaryError && <p className="italic">No summary available.</p>}
                            </div>
                        )}

                        {activeTab === 'videos' && (
                            <div className="text-flockr-muted text-sm">
                                {product.videos?.length > 0 ? (
                                    <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3">
                                        {product.videos.map(v => (
                                            <a key={v.id} href={`/@${v.user?.username}/video/${v.ulid}`} className="group relative aspect-[9/16] overflow-hidden rounded-2xl">
                                                {v.thumbnail_url_full && <img src={v.thumbnail_url_full} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                                                <div className="video-overlay absolute inset-0" />
                                            </a>
                                        ))}
                                    </div>
                                ) : <p className="italic">No videos yet for this product.</p>}
                            </div>
                        )}

                        {activeTab === 'reviews' && (
                            <ReviewsSection
                                product={product}
                                reviews={reviews}
                                userOrderId={userOrderId}
                                auth={auth}
                            />
                        )}
                    </div>

                    {/* More from seller + similar — hidden on reviews tab */}
                    {!isReviewsTab && (
                        <>
                            {sellerProducts.length > 0 && (
                                <div className="mt-10">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h2 className="font-display text-lg font-bold text-white">More from @{product.seller?.username}</h2>
                                        <Link href={`/@${product.seller?.username}`} className="text-flockr-orange flex items-center gap-1 text-sm hover:underline">View all <RiArrowRightLine size={14} /></Link>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                                        {sellerProducts.slice(0, 15).map(p => <div key={p.id} style={{ flexShrink: 0, width: 160 }}><ProductCard product={p} /></div>)}
                                    </div>
                                </div>
                            )}

                            {similarProducts.length > 0 && (
                                <div className="mt-10">
                                    <h2 className="font-display mb-4 text-lg font-bold text-white">You might also like</h2>
                                    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                                        {similarProducts.slice(0, 15).map(p => <div key={p.id} style={{ flexShrink: 0, width: 160 }}><ProductCard product={p} /></div>)}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Mobile sticky buy bar */}
                <div className="glass-dark fixed right-0 bottom-16 left-0 z-30 border-t border-white/[0.06] p-4 md:hidden">
                    <div className="flex items-center gap-3">
                        <div>
                            <p className="text-flockr-orange text-lg font-bold">₦{Number(product.price).toLocaleString()}</p>
                            {product.compare_price && <p className="text-flockr-muted text-xs line-through">₦{Number(product.compare_price).toLocaleString()}</p>}
                        </div>
                        <button onClick={handleAddToCart} disabled={!product.is_in_stock || addingToCart} className="btn-ghost flex items-center justify-center gap-2 rounded-2xl px-4 py-3 disabled:opacity-60">
                            {addedToCart ? '✓' : <RiShoppingCart2Line size={18} />}
                        </button>
                        <button onClick={handleBuy} disabled={!product.is_in_stock || buying} className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 disabled:opacity-60">
                            {buying ? 'Processing...' : product.is_in_stock ? `Buy Now · ₦${totalPrice}` : 'Out of Stock'}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {showCheckout && (
    <CheckoutModal
        items={[{ id: null, product: { ...product, seller: product.seller }, quantity }]}
        addresses={addresses}
        subtotal={Number(product.price) * quantity}
        onClose={() => setShowCheckout(false)}
        onSuccess={() => setShowCheckout(false)}
        showToast={showToast}
        singleProductMode
        productId={product.id}
        productQuantity={quantity}
    />
)}
{ToastComponent}
        </>
    );
}

ProductShow.layout = page => <AppLayout>{page}</AppLayout>;

function SummaryRow({ label, value, bold, valueColor }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: bold ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: bold ? 15 : 13, fontWeight: bold ? 700 : 400 }}>{label}</span>
            <span style={{ color: valueColor ?? (bold ? '#FF6B35' : '#fff'), fontSize: bold ? 16 : 13, fontWeight: bold ? 800 : 500 }}>{value}</span>
        </div>
    );
}

const labelStyle = { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 7px' };

function AddrField({ label, children }) {
    return (
        <div>
            <p style={labelStyle}>{label}</p>
            {children}
        </div>
    );
}

const inp = {
    width: '100%', padding: '12px 13px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#fff', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
};