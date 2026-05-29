import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    RiArrowLeftLine,
    RiBookmarkFill,
    RiBookmarkLine,
    RiChat1Line,
    RiCheckLine,
    RiCloseLine,
    RiDeleteBinLine,
    RiFacebookCircleLine,
    RiHeartFill,
    RiHeartLine,
    RiInstagramLine,
    RiLinksLine,
    RiLoader4Line,
    RiMapPinLine,
    RiReplyLine,
    RiSearchLine,
    RiSendPlaneFill,
    RiShareForwardLine,
    RiShoppingBag2Line,
    RiTiktokLine,
    RiUserAddLine,
    RiUserFollowLine,
    RiVerifiedBadgeLine,
    RiVolumeMuteLine,
    RiVolumeUpLine,
    RiWhatsappLine,
} from 'react-icons/ri';

const fmt = (n) => {
    const num = Number(n ?? 0);
    if (isNaN(num)) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return String(num);
};

const timeAgo = (d) => {
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return new Date(d).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
};

// ── Comment item with reply + delete ─────────────────────────────────────────
function CommentItem({ comment, onReply, onDelete, currentUserId, isAdmin }) {
    const avatar =
        comment.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.name || 'U')}&background=222&color=fff`;

    const canDelete = currentUserId && (comment.user?.id === currentUserId || isAdmin);

    return (
        <div style={{ display: 'flex', gap: 10, padding: '10px 0', opacity: comment._opt ? 0.6 : 1 }}>
            <img src={avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>@{comment.user?.username}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{timeAgo(comment.created_at)}</span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: '3px 0 6px', lineHeight: 1.4 }}>{comment.body}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button
                        onClick={() => onReply(comment)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.4)',
                            fontSize: 11,
                            padding: 0,
                        }}
                    >
                        <RiReplyLine size={13} /> Reply
                    </button>
                    {canDelete && (
                        <button
                            onClick={() => onDelete(comment)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'rgba(239,68,68,0.6)',
                                fontSize: 11,
                                padding: 0,
                            }}
                        >
                            <RiDeleteBinLine size={13} /> Delete
                        </button>
                    )}
                </div>

                {/* Nested replies */}
                {comment.replies?.length > 0 && (
                    <div
                        style={{
                            marginTop: 10,
                            paddingLeft: 12,
                            borderLeft: '2px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                        }}
                    >
                        {comment.replies.map((reply) => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                onReply={onReply}
                                onDelete={onDelete}
                                currentUserId={currentUserId}
                                isAdmin={isAdmin}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Product row ───────────────────────────────────────────────────────────────
function ProductRow({ product }) {
    return (
        <button
            onClick={() => router.visit(`/products/${product.slug ?? product.id}`)}
            style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
            }}
        >
            <div style={{ width: 52, height: 52, borderRadius: 10, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0 }}>
                {product.primary_image && (
                    <img src={product.primary_image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p
                    style={{
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 13,
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {product.name}
                </p>
                <p style={{ color: '#FF6B35', fontWeight: 700, fontSize: 14, margin: '3px 0 0' }}>₦{Number(product.price).toLocaleString()}</p>
            </div>
            <div
                style={{ padding: '7px 14px', background: '#FF6B35', borderRadius: 999, color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}
            >
                Buy
            </div>
        </button>
    );
}

// ── Side action button ────────────────────────────────────────────────────────
function SideBtn({ onClick, children, label }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))' }}>
                {children}
            </div>
            {label !== undefined && label !== '' && (
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.9)', marginTop: 1 }}>{label}</span>
            )}
        </button>
    );
}

// ── Share sheet ───────────────────────────────────────────────────────────────
function ShareSheet({ videoUrl, videoTitle, onClose }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(videoUrl).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const encodedUrl = encodeURIComponent(videoUrl);
    const encodedTitle = encodeURIComponent(videoTitle || 'Check this out on Flockr');

    const shareOptions = [
        {
            label: 'WhatsApp',
            Icon: RiWhatsappLine,
            color: '#25D366',
            bg: 'rgba(37,211,102,0.12)',
            href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
        },
        {
            label: 'Facebook',
            Icon: RiFacebookCircleLine,
            color: '#1877F2',
            bg: 'rgba(24,119,242,0.12)',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        },
        {
            label: 'Instagram',
            Icon: RiInstagramLine,
            color: '#E1306C',
            bg: 'rgba(225,48,108,0.12)',
            // Instagram doesn't support direct URL sharing — open app store/app
            href: null,
            onClick: () => {
                handleCopy();
                alert('Link copied! Open Instagram and paste in your story or bio.');
            },
        },
        {
            label: 'TikTok',
            Icon: RiTiktokLine,
            color: '#fff',
            bg: 'rgba(255,255,255,0.08)',
            href: null,
            onClick: () => {
                handleCopy();
                alert('Link copied! Open TikTok and paste in your bio or DM.');
            },
        },
    ];

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.5)' }} />
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    background: 'rgba(18,18,18,0.98)',
                    backdropFilter: 'blur(24px)',
                    borderRadius: '20px 20px 0 0',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
                    paddingBottom: 'env(safe-area-inset-bottom, 16px)',
                }}
            >
                {/* Handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
                </div>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 16px' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Share</span>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#fff',
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <RiCloseLine size={18} />
                    </button>
                </div>

                {/* Share options */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, padding: '0 24px 24px' }}>
                    {shareOptions.map((opt) => {
                        const { Icon } = opt;
                        const handleClick = () => {
                            if (opt.onClick) {
                                opt.onClick();
                                return;
                            }
                            if (opt.href) window.open(opt.href, '_blank', 'noopener');
                        };
                        return (
                            <button
                                key={opt.label}
                                onClick={handleClick}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 8,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                <div
                                    style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 16,
                                        background: opt.bg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${opt.color}22`,
                                    }}
                                >
                                    <Icon size={26} color={opt.color} />
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{opt.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Copy link row */}
                <div
                    style={{
                        margin: '0 16px 20px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 14,
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
                    <RiLinksLine size={18} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
                    <span
                        style={{
                            flex: 1,
                            color: 'rgba(255,255,255,0.4)',
                            fontSize: 12,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {videoUrl}
                    </span>
                    <button
                        onClick={handleCopy}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 14px',
                            borderRadius: 999,
                            background: copied ? 'rgba(16,185,129,0.15)' : '#FF6B35',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                            transition: 'background 0.2s',
                        }}
                    >
                        {copied ? (
                            <>
                                <RiCheckLine size={13} /> Copied!
                            </>
                        ) : (
                            <>Copy link</>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}

// ── Main VideoShow component ──────────────────────────────────────────────────
export default function VideoShow({ video, isLiked: initLiked, isSaved: initSaved, isFollowing: initFollowing }) {
    const { auth } = usePage().props;
    const videoRef = useRef(null);
    const progressBarRef = useRef(null);
    const watchStartRef = useRef(null);
    const commentInputRef = useRef(null);

    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(true);
    const [tapFlash, setTapFlash] = useState(false);
    const [showPP, setShowPP] = useState(false);

    const [liked, setLiked] = useState(initLiked);
    const [likesCount, setLikesCount] = useState(Number(video.likes_count ?? 0));
    const [saved, setSaved] = useState(initSaved);
    const [savesCount, setSavesCount] = useState(Number(video.saves_count ?? 0));
    const [followed, setFollowed] = useState(initFollowing);
    const [commentsCount, setCommentsCount] = useState(Number(video.comments_count ?? 0));

    const [tab, setTab] = useState('comments');
    const [comments, setComments] = useState([]);
    const [cmtsLoaded, setCmtsLoaded] = useState(false);
    const [loadingCmts, setLoadingCmts] = useState(false);
    const [commentBody, setCommentBody] = useState('');
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState(null);

    // Mobile sheets
    const [mobileSheet, setMobileSheet] = useState(null); // 'comments' | 'products' | 'share'

    // Search overlay
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef(null);

    const isOwner = auth?.user?.id === video.user?.id;
    const isAdmin = auth?.user?.role === 'admin';
    const hasProducts = video.is_for_sale && video.products?.length > 0;
    const avatarSrc =
        video.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(video.user?.name || 'U')}&background=222&color=fff`;
    const videoUrl = typeof window !== 'undefined' ? window.location.href : '';

    // ── Auto-play ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        el.muted = true;
        el.play()
            .then(() => {
                setPlaying(true);
                setTimeout(() => {
                    el.muted = false;
                    setMuted(false);
                }, 300);
            })
            .catch(() => {});
        watchStartRef.current = Date.now();
        return () => {
            if (watchStartRef.current && auth?.user) {
                const secs = Math.round((Date.now() - watchStartRef.current) / 1000);
                if (secs > 1) {
                    axios.post(`/api/videos/${video.ulid}/view`, { watch_seconds: secs, session_id: null }, { withCredentials: true }).catch(() => {});
                }
            }
        };
    }, []);

    useEffect(() => {
        loadComments();
    }, []);

    // ── Progress bar ──────────────────────────────────────────────────────────
    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        const onTime = () => {
            if (el.duration) setProgress((el.currentTime / el.duration) * 100);
        };
        el.addEventListener('timeupdate', onTime);
        return () => el.removeEventListener('timeupdate', onTime);
    }, []);

    // ── Focus search input ────────────────────────────────────────────────────
    useEffect(() => {
        if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 100);
    }, [showSearch]);

    // ── Double-tap to like ────────────────────────────────────────────────────
    const lastTap = useRef(0);
    const handleVideoTap = useCallback(() => {
        if (mobileSheet || showSearch) return;
        const now = Date.now();
        if (now - lastTap.current < 300) {
            if (!liked) handleLike();
            setTapFlash(true);
            setTimeout(() => setTapFlash(false), 700);
        } else {
            videoRef.current?.paused ? videoRef.current.play().catch(() => {}) : videoRef.current?.pause();
            setShowPP(true);
            setTimeout(() => setShowPP(false), 700);
        }
        lastTap.current = now;
    }, [liked, mobileSheet, showSearch]);

    // ── Seek — FIXED: use ref on the bar element ──────────────────────────────
    const handleSeek = useCallback((e) => {
        const el = videoRef.current;
        const bar = progressBarRef.current;
        if (!el?.duration || !bar) return;
        const rect = bar.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        el.currentTime = pct * el.duration;
        // Also update progress immediately so it doesn't snap back
        setProgress(pct * 100);
    }, []);

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleLike = useCallback(async () => {
        if (!auth?.user) return router.visit('/login');
        const was = liked;
        setLiked(!was);
        setLikesCount((c) => Math.max(0, c + (was ? -1 : 1)));
        try {
            const { data } = await axios.post(`/api/videos/${video.ulid}/like`, {}, { withCredentials: true });
            setLiked(data.liked);
            setLikesCount(Number(data.likes_count ?? 0));
        } catch {
            setLiked(was);
            setLikesCount((c) => Math.max(0, c + (was ? 1 : -1)));
        }
    }, [liked, auth, video.id]);

    const handleSave = useCallback(async () => {
        if (!auth?.user) return router.visit('/login');
        const was = saved;
        setSaved(!was);
        setSavesCount((c) => Math.max(0, c + (was ? -1 : 1)));
        try {
            const { data } = await axios.post(`/api/videos/${video.ulid}/save`, {}, { withCredentials: true });
            setSaved(data.saved);
            setSavesCount(Number(data.saves_count ?? 0));
        } catch {
            setSaved(was);
            setSavesCount((c) => Math.max(0, c + (was ? 1 : -1)));
        }
    }, [saved, auth, video.id]);

    const handleFollow = useCallback(async () => {
        if (!auth?.user) return router.visit('/login');
        if (followed) return;
        setFollowed(true);
        try {
            await axios.post(`/api/users/${video.user?.id}/follow`, {}, { withCredentials: true });
        } catch {
            setFollowed(false);
        }
    }, [followed, auth, video.user?.id]);

    const toggleMute = useCallback(() => {
        setMuted((m) => {
            if (videoRef.current) videoRef.current.muted = !m;
            return !m;
        });
    }, []);

    // ── Search ────────────────────────────────────────────────────────────────
    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.visit(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    // ── Comments ──────────────────────────────────────────────────────────────
    const loadComments = useCallback(async () => {
        if (cmtsLoaded) return;
        setLoadingCmts(true);
        try {
            const { data } = await axios.get(`/api/videos/${video.ulid}/comments`);
            setComments(data.data ?? data);
            setCmtsLoaded(true);
        } catch {
        } finally {
            setLoadingCmts(false);
        }
    }, [cmtsLoaded, video.id]);

    const sendComment = useCallback(
        async (e) => {
            e?.preventDefault();
            if (!commentBody.trim() || !auth?.user || sending) return;
            setSending(true);
            const text = commentBody.trim();
            const optimistic = {
                id: `opt-${Date.now()}`,
                body: text,
                user: auth.user,
                created_at: new Date().toISOString(),
                _opt: true,
                parent_id: replyTo?.id ?? null,
            };
            if (replyTo) {
                // Add as reply inside parent
                setComments((prev) => prev.map((c) => (c.id === replyTo.id ? { ...c, replies: [optimistic, ...(c.replies ?? [])] } : c)));
            } else {
                setComments((prev) => [optimistic, ...prev]);
                setCommentsCount((c) => c + 1);
            }
            setCommentBody('');
            setReplyTo(null);
            try {
                const { data } = await axios.post(
                    `/api/videos/${video.ulid}/comments`,
                    {
                        body: text,
                        parent_id: replyTo?.id ?? null,
                    },
                    { withCredentials: true },
                );
                if (replyTo) {
                    setComments((prev) =>
                        prev.map((c) =>
                            c.id === replyTo.id ? { ...c, replies: (c.replies ?? []).map((r) => (r.id === optimistic.id ? data : r)) } : c,
                        ),
                    );
                } else {
                    setComments((prev) => prev.map((c) => (c.id === optimistic.id ? data : c)));
                }
            } catch {
                if (replyTo) {
                    setComments((prev) =>
                        prev.map((c) => (c.id === replyTo.id ? { ...c, replies: (c.replies ?? []).filter((r) => r.id !== optimistic.id) } : c)),
                    );
                } else {
                    setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
                    setCommentsCount((c) => Math.max(0, c - 1));
                }
                setCommentBody(text);
            } finally {
                setSending(false);
            }
        },
        [commentBody, auth, sending, replyTo, video.id],
    );

    const handleDeleteComment = useCallback(
        async (comment) => {
            if (!confirm('Delete this comment?')) return;
            // Remove optimistically
            setComments((prev) => {
                // Check if it's a top-level comment
                const isTop = prev.some((c) => c.id === comment.id);
                if (isTop) {
                    setCommentsCount((c) => Math.max(0, c - 1));
                    return prev.filter((c) => c.id !== comment.id);
                }
                // It's a reply — remove from parent's replies
                return prev.map((c) => ({
                    ...c,
                    replies: (c.replies ?? []).filter((r) => r.id !== comment.id),
                }));
            });
            try {
                await axios.delete(`/api/comments/${comment.id}`, { withCredentials: true });
            } catch {
                loadComments();
            } // re-load on failure
        },
        [loadComments],
    );

    const handleReply = useCallback((comment) => {
        setReplyTo(comment);
        setTimeout(() => commentInputRef.current?.focus(), 100);
    }, []);

    const openSheet = (sheet) => {
        setMobileSheet(sheet);
        if (sheet === 'comments') loadComments();
    };

    // ── Comment input ─────────────────────────────────────────────────────────
    const CommentInput = () => (
        <div style={{ padding: '10px 14px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {replyTo && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                        padding: '6px 10px',
                        background: 'rgba(255,107,53,0.08)',
                        borderRadius: 8,
                        border: '1px solid rgba(255,107,53,0.2)',
                    }}
                >
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                        Replying to <span style={{ color: '#FF6B35' }}>@{replyTo.user?.username}</span>
                    </span>
                    <button
                        onClick={() => setReplyTo(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex' }}
                    >
                        <RiCloseLine size={14} />
                    </button>
                </div>
            )}
            {auth?.user ? (
                <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                    <img
                        src={auth.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(auth.user.name)}&background=222`}
                        alt=""
                        style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <input
                        ref={commentInputRef}
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                        placeholder={replyTo ? `Reply to @${replyTo.user?.username}...` : 'Add a comment...'}
                        maxLength={500}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 999,
                            padding: '9px 16px',
                            color: '#fff',
                            fontSize: 13,
                            outline: 'none',
                        }}
                    />
                    <button
                        onClick={sendComment}
                        disabled={!commentBody.trim() || sending}
                        style={{
                            background: commentBody.trim() ? '#FF6B35' : 'rgba(255,255,255,0.08)',
                            border: 'none',
                            borderRadius: '50%',
                            width: 36,
                            height: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: commentBody.trim() ? 'pointer' : 'default',
                            flexShrink: 0,
                            transition: 'background 0.2s',
                        }}
                    >
                        {sending ? (
                            <RiLoader4Line size={15} color="#fff" style={{ animation: 'spin 0.8s linear infinite' }} />
                        ) : (
                            <RiSendPlaneFill size={15} color="#fff" />
                        )}
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => router.visit('/login')}
                    style={{
                        width: '100%',
                        padding: '11px',
                        background: 'rgba(255,107,53,0.12)',
                        border: '1px solid rgba(255,107,53,0.3)',
                        borderRadius: 12,
                        color: '#FF6B35',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    Log in to comment
                </button>
            )}
        </div>
    );

    const videoSrc = video.video_stream_url ?? video.hls_url ?? video.video_url;

    return (
        <>
            <Head title={video.title || `${video.user?.name} on Flockr`} />

            {/* Share sheet */}
            {mobileSheet === 'share' && <ShareSheet videoUrl={videoUrl} videoTitle={video.title} onClose={() => setMobileSheet(null)} />}

            <div style={{ display: 'flex', height: '100%', minHeight: '100dvh', background: '#000', overflow: 'hidden' }}>
                {/* ── VIDEO COLUMN ─────────────────────────────────────────── */}
                <div
                    style={{
                        flex: 1,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#000',
                        overflow: 'hidden',
                        minWidth: 0,
                    }}
                >
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        poster={video.thumbnail_url_full}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onCanPlay={() => setLoading(false)}
                        onWaiting={() => setLoading(true)}
                        onPlay={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        onClick={handleVideoTap}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                    />

                    {/* Gradients */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.1) 45%, transparent 70%)',
                            pointerEvents: 'none',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 25%)',
                            pointerEvents: 'none',
                        }}
                    />

                    {/* ── Top bar ─────────────────────────────────────────── */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            zIndex: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                        }}
                    >
                        <button
                            onClick={() => window.history.back()}
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: '50%',
                                background: 'rgba(0,0,0,0.45)',
                                backdropFilter: 'blur(8px)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                            }}
                        >
                            <RiArrowLeftLine size={20} />
                        </button>

                        {/* Search overlay or search icon */}
                        {showSearch ? (
                            <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, margin: '0 10px' }}>
                                <input
                                    ref={searchInputRef}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search products, sellers..."
                                    onKeyDown={(e) => e.key === 'Escape' && setShowSearch(false)}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(0,0,0,0.6)',
                                        backdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: 999,
                                        padding: '8px 16px',
                                        color: '#fff',
                                        fontSize: 13,
                                        outline: 'none',
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        setShowSearch(false);
                                        setSearchQuery('');
                                    }}
                                    style={{
                                        background: 'rgba(0,0,0,0.45)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'rgba(255,255,255,0.6)',
                                        fontSize: 13,
                                        padding: '8px 12px',
                                        borderRadius: 999,
                                        backdropFilter: 'blur(8px)',
                                        flexShrink: 0,
                                    }}
                                >
                                    Cancel
                                </button>
                            </form>
                        ) : (
                            <button
                                onClick={() => setShowSearch(true)}
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.45)',
                                    backdropFilter: 'blur(8px)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                }}
                            >
                                <RiSearchLine size={20} />
                            </button>
                        )}
                    </div>

                    {/* Spinner */}
                    {loading && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                zIndex: 5,
                            }}
                        >
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    border: '2px solid rgba(255,255,255,0.2)',
                                    borderTopColor: '#FF6B35',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite',
                                }}
                            />
                        </div>
                    )}

                    {/* Double-tap heart */}
                    {tapFlash && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                zIndex: 5,
                            }}
                        >
                            <RiHeartFill
                                size={90}
                                color="#EF4444"
                                style={{ filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.5))', animation: 'heartPop 0.7s ease forwards' }}
                            />
                        </div>
                    )}

                    {/* Play/pause flash */}
                    {showPP && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                zIndex: 5,
                            }}
                        >
                            <div
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {playing ? (
                                    <svg width={22} height={22} fill="white" viewBox="0 0 24 24">
                                        <path
                                            fillRule="evenodd"
                                            d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                ) : (
                                    <svg width={22} height={22} fill="white" viewBox="0 0 24 24">
                                        <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── FIXED Progress bar — taller hit area, ref attached ─ */}
                    <div
                        ref={progressBarRef}
                        onClick={handleSeek}
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            // 24px tall hit area so it's easy to tap/click
                            height: 24,
                            zIndex: 10,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-end',
                        }}
                    >
                        {/* Visual bar — only 4px, sits at the bottom */}
                        <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.15)' }}>
                            <div style={{ height: '100%', background: '#FF6B35', width: `${progress}%`, transition: 'width 0.1s linear' }} />
                        </div>
                    </div>

                    {/* ── Right action buttons ─────────────────────────────── */}
                    <div
                        style={{
                            position: 'absolute',
                            right: 10,
                            bottom: 32,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 20,
                            zIndex: 10,
                        }}
                    >
                        {/* Avatar + follow */}
                        <div style={{ position: 'relative', marginBottom: 4 }}>
                            <button onClick={() => router.visit(`/@${video.user?.username}`)}>
                                <img
                                    src={avatarSrc}
                                    alt=""
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '2px solid #fff',
                                        display: 'block',
                                    }}
                                />
                            </button>
                            {!followed && !isOwner && auth?.user && (
                                <button
                                    onClick={handleFollow}
                                    style={{
                                        position: 'absolute',
                                        bottom: -10,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        background: '#FF6B35',
                                        border: '2px solid #000',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        zIndex: 2,
                                    }}
                                >
                                    <RiUserAddLine size={11} color="#fff" />
                                </button>
                            )}
                            {followed && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: -10,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        background: 'rgba(0,0,0,0.6)',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <RiUserFollowLine size={11} color="#fff" />
                                </div>
                            )}
                        </div>

                        <SideBtn onClick={handleLike} label={fmt(likesCount)}>
                            {liked ? <RiHeartFill size={28} color="#EF4444" /> : <RiHeartLine size={28} color="#fff" />}
                        </SideBtn>

                        <SideBtn
                            onClick={() => {
                                if (!auth?.user) return router.visit('/login');
                                if (window.innerWidth < 768) openSheet('comments');
                                else setTab('comments');
                            }}
                            label={fmt(commentsCount)}
                        >
                            <RiChat1Line size={28} color={tab === 'comments' ? '#FF6B35' : '#fff'} />
                        </SideBtn>

                        <SideBtn onClick={handleSave} label={fmt(savesCount)}>
                            {saved ? <RiBookmarkFill size={28} color="#FBBF24" /> : <RiBookmarkLine size={28} color="#fff" />}
                        </SideBtn>

                        {hasProducts && (
                            <SideBtn
                                onClick={() => {
                                    if (window.innerWidth < 768) openSheet('products');
                                    else setTab('products');
                                }}
                                label={video.products.length}
                            >
                                <RiShoppingBag2Line size={28} color={tab === 'products' ? '#FF6B35' : '#fff'} />
                            </SideBtn>
                        )}

                        {/* Share — opens share sheet on mobile, or native share */}
                        <SideBtn
                            onClick={() => {
                                if (window.innerWidth < 768) openSheet('share');
                                else {
                                    if (navigator.share) navigator.share({ title: video.title, url: videoUrl }).catch(() => {});
                                    else openSheet('share');
                                }
                            }}
                            label="Share"
                        >
                            <RiShareForwardLine size={28} color="#fff" />
                        </SideBtn>

                        <button
                            onClick={toggleMute}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: 'rgba(0,0,0,0.45)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {muted ? <RiVolumeMuteLine size={16} color="#fff" /> : <RiVolumeUpLine size={16} color="#fff" />}
                        </button>
                    </div>

                    {/* ── Bottom info overlay ───────────────────────────────── */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 36,
                            left: 12,
                            right: 68,
                            zIndex: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 5,
                        }}
                    >
                        <button
                            onClick={() => router.visit(`/@${video.user?.username}`)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                width: 'fit-content',
                            }}
                        >
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                                {video.user?.name}
                            </span>
                            {video.user?.is_verified && <RiVerifiedBadgeLine size={13} color="#FF6B35" />}
                        </button>
                        {video.title && (
                            <p
                                style={{
                                    color: '#fff',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    margin: 0,
                                    lineHeight: 1.35,
                                    textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                }}
                            >
                                {video.title}
                            </p>
                        )}
                        {video.description && (
                            <p
                                style={{
                                    color: 'rgba(255,255,255,0.85)',
                                    fontSize: 12,
                                    margin: 0,
                                    lineHeight: 1.4,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                }}
                            >
                                {video.description}
                            </p>
                        )}
                        {video.hashtags?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {video.hashtags.slice(0, 5).map((tag, i) => (
                                    <span
                                        key={i}
                                        style={{ color: '#FF6B35', fontSize: 13, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
                                    >
                                        {tag.startsWith('#') ? tag : `#${tag}`}
                                    </span>
                                ))}
                            </div>
                        )}
                        {video.user?.location && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <RiMapPinLine size={11} color="rgba(255,255,255,0.55)" />
                                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{video.user.location}</span>
                            </div>
                        )}
                        {hasProducts && (
                            <button
                                onClick={() => (window.innerWidth < 768 ? openSheet('products') : setTab('products'))}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'rgba(255,107,53,0.18)',
                                    border: '1px solid rgba(255,107,53,0.45)',
                                    borderRadius: 999,
                                    padding: '6px 13px',
                                    backdropFilter: 'blur(8px)',
                                    cursor: 'pointer',
                                    width: 'fit-content',
                                    marginTop: 2,
                                }}
                            >
                                <RiShoppingBag2Line size={13} color="#FF6B35" />
                                <span style={{ color: '#FF6B35', fontSize: 12, fontWeight: 700 }}>
                                    {video.products.length} Product{video.products.length > 1 ? 's' : ''} · Tap to shop
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ── RIGHT PANEL (desktop) ────────────────────────────────── */}
                <div
                    style={{
                        display: 'none',
                        flexDirection: 'column',
                        width: 340,
                        flexShrink: 0,
                        background: 'rgba(16,16,16,0.98)',
                        borderLeft: '1px solid rgba(255,255,255,0.08)',
                        height: '100%',
                        minHeight: '100dvh',
                        overflowY: 'auto',
                    }}
                    className="video-show-panel"
                >
                    {/* Creator header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '16px',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            flexShrink: 0,
                        }}
                    >
                        <button onClick={() => router.visit(`/@${video.user?.username}`)}>
                            <img
                                src={avatarSrc}
                                alt=""
                                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }}
                            />
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <button
                                    onClick={() => router.visit(`/@${video.user?.username}`)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: 14,
                                        padding: 0,
                                    }}
                                >
                                    {video.user?.name ?? video.user?.username}
                                </button>
                                {video.user?.is_verified && <RiVerifiedBadgeLine size={13} color="#FF6B35" />}
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '2px 0 0' }}>@{video.user?.username}</p>
                        </div>
                        {!isOwner && (
                            <button
                                onClick={auth?.user ? handleFollow : () => router.visit('/login')}
                                style={{
                                    padding: '7px 16px',
                                    borderRadius: 999,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    border: 'none',
                                    background: followed ? 'rgba(255,255,255,0.08)' : '#FF6B35',
                                    color: followed ? 'rgba(255,255,255,0.5)' : '#fff',
                                }}
                            >
                                {followed ? 'Following' : 'Follow'}
                            </button>
                        )}
                    </div>

                    {/* Caption */}
                    {(video.title || video.description || video.hashtags?.length > 0) && (
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                            {video.title && <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>{video.title}</p>}
                            {video.description && (
                                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{video.description}</p>
                            )}
                            {video.hashtags?.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                                    {video.hashtags.map((tag, i) => (
                                        <span key={i} style={{ color: '#FF6B35', fontSize: 12, fontWeight: 600 }}>
                                            {tag.startsWith('#') ? tag : `#${tag}`}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                        {[
                            { key: 'comments', label: `Comments (${fmt(commentsCount)})` },
                            ...(hasProducts ? [{ key: 'products', label: `Shop (${video.products.length})` }] : []),
                        ].map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                style={{
                                    flex: 1,
                                    padding: '12px 8px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.35)',
                                    fontSize: 12,
                                    fontWeight: tab === t.key ? 700 : 400,
                                    borderBottom: tab === t.key ? '2px solid #FF6B35' : '2px solid transparent',
                                    transition: 'all 0.15s',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                        {/* Desktop share button */}
                        <button
                            onClick={() => openSheet('share')}
                            style={{
                                padding: '12px 16px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'rgba(255,255,255,0.35)',
                                fontSize: 12,
                                borderBottom: '2px solid transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <RiShareForwardLine size={14} /> Share
                        </button>
                    </div>

                    {/* Tab content */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        {tab === 'products' && hasProducts && (
                            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {video.products.map((p) => (
                                    <ProductRow key={p.id} product={p} />
                                ))}
                            </div>
                        )}

                        {tab === 'comments' && (
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
                                    {loadingCmts && (
                                        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '24px 0' }}>
                                            Loading...
                                        </p>
                                    )}
                                    {!loadingCmts && comments.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: 0 }}>No comments yet</p>
                                        </div>
                                    )}
                                    {comments.map((c) => (
                                        <CommentItem
                                            key={c.id}
                                            comment={c}
                                            onReply={handleReply}
                                            onDelete={handleDeleteComment}
                                            currentUserId={auth?.user?.id}
                                            isAdmin={isAdmin}
                                        />
                                    ))}
                                </div>
                                <CommentInput />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Mobile bottom sheets ──────────────────────────────────── */}
                {mobileSheet && mobileSheet !== 'share' && (
                    <>
                        <div
                            onClick={() => setMobileSheet(null)}
                            style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.4)' }}
                        />
                        <div
                            style={{
                                position: 'fixed',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: mobileSheet === 'comments' ? '55%' : 'auto',
                                maxHeight: '60%',
                                background: 'rgba(16,16,16,0.98)',
                                backdropFilter: 'blur(24px)',
                                borderRadius: '20px 20px 0 0',
                                borderTop: '1px solid rgba(255,255,255,0.08)',
                                zIndex: 50,
                                display: 'flex',
                                flexDirection: 'column',
                                animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
                                <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 10px' }}>
                                <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
                                    {mobileSheet === 'comments' ? `Comments (${fmt(commentsCount)})` : `Products (${video.products?.length})`}
                                </span>
                                <button
                                    onClick={() => setMobileSheet(null)}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#fff',
                                        width: 30,
                                        height: 30,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <RiCloseLine size={18} />
                                </button>
                            </div>

                            {mobileSheet === 'products' && (
                                <div
                                    style={{ flex: 1, overflowY: 'auto', padding: '0 16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}
                                >
                                    {video.products?.map((p) => (
                                        <ProductRow key={p.id} product={p} />
                                    ))}
                                </div>
                            )}

                            {mobileSheet === 'comments' && (
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                    <div
                                        style={{
                                            flex: 1,
                                            overflowY: 'auto',
                                            padding: '0 16px 8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 2,
                                        }}
                                    >
                                        {loadingCmts && (
                                            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                                                <div
                                                    style={{
                                                        width: 24,
                                                        height: 24,
                                                        border: '2px solid rgba(255,255,255,0.1)',
                                                        borderTopColor: '#FF6B35',
                                                        borderRadius: '50%',
                                                        animation: 'spin 0.8s linear infinite',
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {!loadingCmts && comments.length === 0 && (
                                            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: '32px 0' }}>
                                                No comments yet. Be the first!
                                            </p>
                                        )}
                                        {comments.map((c) => (
                                            <CommentItem
                                                key={c.id}
                                                comment={c}
                                                onReply={handleReply}
                                                onDelete={handleDeleteComment}
                                                currentUserId={auth?.user?.id}
                                                isAdmin={isAdmin}
                                            />
                                        ))}
                                    </div>
                                    <CommentInput />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @media (min-width: 768px) { .video-show-panel { display: flex !important; } }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes heartPop { 0%{transform:scale(0);opacity:1} 50%{transform:scale(1.2)} 100%{transform:scale(1);opacity:0} }
                @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
            `}</style>
        </>
    );
}

// VideoShow.layout = (page) => <AppLayout>{page}</AppLayout>;
