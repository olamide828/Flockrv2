import { Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    RiBookmarkFill,
    RiBookmarkLine,
    RiChat1Line,
    RiCloseLine,
    RiHeartFill,
    RiHeartLine,
    RiMapPinLine,
    RiSendPlaneFill,
    RiShareForwardLine,
    RiShoppingBag2Line,
    RiUserAddLine,
    RiUserFollowLine,
    RiVerifiedBadgeLine,
    RiVolumeMuteLine,
    RiVolumeUpLine,
} from 'react-icons/ri';

export default function VideoCard({ video, isActive }) {
    const { auth } = usePage().props;
    const videoRef = useRef(null);
    const watchStartRef = useRef(null);
    const commentInputRef = useRef(null);

    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(true);
    const [progress, setProgress] = useState(0);

    // ── Optimistic state — never reset to server values after user action ──────
    const [liked, setLiked] = useState(video.is_liked ?? false);
    const [likesCount, setLikesCount] = useState(Number(video.likes_count ?? 0));
    const [saved, setSaved] = useState(video.is_saved ?? false);
    const [followed, setFollowed] = useState(false); // local follow state for this card

    const [showComments, setShowComments] = useState(false);
    const [showProducts, setShowProducts] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentBody, setCommentBody] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingCmts, setLoadingCmts] = useState(false);
    const [tapFlash, setTapFlash] = useState(false);
    const [loading, setLoading] = useState(true);

    // ── Autoplay / pause on scroll ─────────────────────────────────────────────
    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        if (isActive) {
            el.muted = true; // required for autoplay unlock
            setMuted(true);

            el.play()
                .then(() => {
                    // try enabling sound AFTER playback starts
                    setTimeout(() => {
                        el.muted = false;
                        setMuted(false);
                    }, 300);
                })
                .catch(() => {});

            watchStartRef.current = Date.now();
        } else {
            el.pause();
            el.currentTime = 0;
            setShowComments(false);
            setShowProducts(false);
            if (watchStartRef.current) {
                const secs = Math.round((Date.now() - watchStartRef.current) / 1000);
                if (secs > 1) {
                    axios.post(`/api/videos/${video.id}/view`, { watch_seconds: secs, session_id: null }, { withCredentials: true }).catch(() => {});
                }
                watchStartRef.current = null;
            }
        }
    }, [isActive]);

    // ── Progress bar ───────────────────────────────────────────────────────────
    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        const onTime = () => {
            if (el.duration) setProgress((el.currentTime / el.duration) * 100);
        };
        el.addEventListener('timeupdate', onTime);
        return () => el.removeEventListener('timeupdate', onTime);
    }, []);

    // ── Load comments when sheet opens ────────────────────────────────────────
    useEffect(() => {
        if (!showComments) return;
        setLoadingCmts(true);
        axios
            .get(`/api/videos/${video.id}/comments`)
            .then((r) => setComments(r.data.data ?? r.data))
            .catch(() => {})
            .finally(() => setLoadingCmts(false));
        setTimeout(() => commentInputRef.current?.focus(), 400);
    }, [showComments]);

    // ── Double-tap to like ────────────────────────────────────────────────────
    const lastTap = useRef(0);
    const handleVideoTap = useCallback(() => {
        if (showComments || showProducts) return;
        const now = Date.now();
        if (now - lastTap.current < 300) {
            if (!liked) handleLike(); // only like on double-tap, not unlike
            setTapFlash(true);
            setTimeout(() => setTapFlash(false), 700);
        } else {
            videoRef.current?.paused ? videoRef.current.play().catch(() => {}) : videoRef.current?.pause();
        }
        lastTap.current = now;
    }, [liked, showComments, showProducts]);

    // ── Like — fully optimistic, no rollback flicker ──────────────────────────
    const handleLike = useCallback(async () => {
        if (!auth?.user) {
            router.visit('/login');
            return;
        }
        const wasLiked = liked;
        const newLiked = !wasLiked;
        // Update UI immediately and keep it
        setLiked(newLiked);
        setLikesCount((c) => Math.max(0, c + (newLiked ? 1 : -1)));
        try {
            const { data } = await axios.post(`/api/videos/${video.id}/like`, {}, { withCredentials: true });
            // Only sync count from server, keep liked state as user set it
            setLikesCount(Number(data.likes_count ?? 0));
        } catch {
            // Revert only on actual failure
            setLiked(wasLiked);
            setLikesCount((c) => Math.max(0, c + (wasLiked ? 1 : -1)));
        }
    }, [liked, auth, video.id]);

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (!auth?.user) {
            router.visit('/login');
            return;
        }
        const wasSaved = saved;
        setSaved(!wasSaved);
        try {
            await axios.post(`/api/videos/${video.id}/save`, {}, { withCredentials: true });
        } catch {
            setSaved(wasSaved);
        }
    }, [saved, auth, video.id]);

    // ── Follow — optimistic, icon disappears immediately ─────────────────────
    const handleFollow = useCallback(async () => {
        if (!auth?.user) {
            router.visit('/login');
            return;
        }
        if (followed) return; // already followed from this session
        setFollowed(true);
        try {
            await axios.post(`/api/users/${video.user?.id}/follow`, {}, { withCredentials: true });
        } catch {
            setFollowed(false);
        }
    }, [followed, auth, video.user?.id]);

    // ── Mute ──────────────────────────────────────────────────────────────────
    const toggleMute = useCallback(() => {
        const el = videoRef.current;
        if (!el) return;

        el.muted = !el.muted;
        setMuted(el.muted);
    }, []);

    // ── Share ─────────────────────────────────────────────────────────────────
    const handleShare = useCallback(() => {
        const url = `${window.location.origin}/video/${video.id}`;
        if (navigator.share) navigator.share({ title: video.title, url }).catch(() => {});
        else navigator.clipboard?.writeText(url);
    }, [video]);

    // ── Send comment ──────────────────────────────────────────────────────────
    const sendComment = useCallback(
        async (e) => {
            e.preventDefault();
            if (!commentBody.trim() || !auth?.user || sending) return;
            setSending(true);
            const text = commentBody.trim();
            const optimistic = {
                id: `opt-${Date.now()}`,
                body: text,
                user: auth.user,
                created_at: new Date().toISOString(),
                _opt: true,
            };
            setComments((prev) => [optimistic, ...prev]);
            setCommentBody('');
            try {
                const { data } = await axios.post(`/api/videos/${video.id}/comments`, { body: text }, { withCredentials: true });
                setComments((prev) => prev.map((c) => (c.id === optimistic.id ? data : c)));
            } catch {
                setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
                setCommentBody(text);
            } finally {
                setSending(false);
            }
        },
        [commentBody, auth, sending, video.id],
    );

    const videoSrc = video.video_stream_url ?? video.hls_url ?? video.video_url;

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
            {/* ── Video ─────────────────────────────────────────────────────── */}
            <video
                ref={videoRef}
                src={videoSrc}
                poster={video.thumbnail_url_full}
                muted
                playsInline
                preload="metadata"
                onCanPlay={() => setLoading(false)}
                onWaiting={() => {
                    if (!videoRef.current?.ended) {
                        setLoading(true);
                    }
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => {
                    if (!videoRef.current?.ended) {
                        setPlaying(false);
                    }
                }}
                onEnded={() => {
                    const el = videoRef.current;
                    if (!el) return;

                    el.currentTime = 0;
                    el.play().catch(() => {});
                }}
                onClick={handleVideoTap}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    cursor: 'pointer',
                }}
                className="rounded-lg"
            />

            {/* Gradient overlays */}
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
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 20%)',
                    pointerEvents: 'none',
                }}
            />

            {/* Ah no vex baami! I just dey see ur message ni! How E be nau? How market? */}

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

            {/* Pause indicator */}
            {!playing && !loading && (
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
                            backdropFilter: 'blur(4px)',
                        }}
                    >
                        <svg width={22} height={22} fill="white" viewBox="0 0 24 24">
                            <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Progress bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.12)', zIndex: 10 }}>
                <div
                    className="rounded-b-lg"
                    style={{ height: '100%', background: '#FF6B35', width: `${progress}%`, transition: 'width 0.1s linear' }}
                />
            </div>

            {/* ── Right action buttons ───────────────────────────────────────── */}
            <div
                style={{
                    position: 'absolute',
                    right: 10,
                    bottom: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 20,
                    zIndex: 10,
                }}
            >
                {/* Avatar + follow button — follow disappears once followed */}
                <div style={{ position: 'relative', marginBottom: 4 }}>
                    <Link href={`/@${video.user?.username}`}>
                        <img
                            src={
                                video.user?.avatar_url ??
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(video.user?.name ?? 'U')}&background=222&color=fff`
                            }
                            alt={video.user?.name}
                            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', display: 'block' }}
                        />
                    </Link>
                    {/* Only show follow button if not already following and not own video */}
                    {!followed && auth?.user?.id !== video.user?.id && (
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
                                transition: 'opacity 0.2s',
                            }}
                        >
                            <RiUserAddLine size={11} color="#fff" />
                        </button>
                    )}
                    {/* Show checkmark when followed */}
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

                {/* Like */}
                <SideBtn onClick={handleLike} label={fmtCount(likesCount)}>
                    {liked ? <RiHeartFill size={28} color="#EF4444" /> : <RiHeartLine size={28} color="#fff" />}
                </SideBtn>

                {/* Comment */}
                <SideBtn
                    onClick={() => {
                        if (!auth?.user) {
                            router.visit('/login');
                            return;
                        }
                        setShowComments((s) => !s);
                        setShowProducts(false);
                    }}
                    label={fmtCount(video.comments_count)}
                >
                    <RiChat1Line size={28} color={showComments ? '#FF6B35' : '#fff'} />
                </SideBtn>

                {/* Save */}
                <SideBtn onClick={handleSave} label={fmtCount(video.saves_count)}>
                    {saved ? <RiBookmarkFill size={28} color="#FBBF24" /> : <RiBookmarkLine size={28} color="#fff" />}
                </SideBtn>

                {/* Share */}
                <SideBtn onClick={handleShare} label="Share">
                    <RiShareForwardLine size={28} color="#fff" />
                </SideBtn>

                {/* Mute */}
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

            {/* ── Bottom info overlay ────────────────────────────────────────── */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    right: 68,
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                }}
            >
                {/* Username */}
                <Link
                    href={`/@${video.user?.username}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none', width: 'fit-content' }}
                >
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>{video.user?.name}</span>
                    {video.user?.is_verified && <RiVerifiedBadgeLine size={13} color="#FF6B35" />}
                </Link>

                {/* Title */}
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

                {/* Description */}
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

                {/* Hashtags — always show under description */}
                {video.hashtags?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {video.hashtags.slice(0, 5).map((tag, i) => (
                            <span key={i} style={{ color: '#FF6B35', fontSize: 13, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                                {tag.startsWith('#') ? tag : `#${tag}`}
                            </span>
                        ))}
                    </div>
                )}

                {/* Location */}
                {video.user?.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <RiMapPinLine size={11} color="rgba(255,255,255,0.55)" />
                        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{video.user.location}</span>
                    </div>
                )}

                {/* Shop pill */}
                {video.is_for_sale && video.products?.length > 0 && (
                    <button
                        onClick={() => {
                            setShowProducts((s) => !s);
                            setShowComments(false);
                        }}
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

            {/* ── Comments bottom sheet ─────────────────────────────────────── */}
            {showComments && (
                <>
                    <div
                        onClick={() => setShowComments(false)}
                        style={{ position: 'absolute', inset: 0, zIndex: 19, background: 'rgba(0,0,0,0.4)' }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '55%',
                            background: 'rgba(16,16,16,0.98)',
                            backdropFilter: 'blur(24px)',
                            borderRadius: '20px 20px 0 0',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            zIndex: 20,
                            display: 'flex',
                            flexDirection: 'column',
                            animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
                        }}
                    >
                        {/* Handle */}
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
                            <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
                        </div>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 10px' }}>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
                                Comments{video.comments_count > 0 ? ` (${fmtCount(video.comments_count)})` : ''}
                            </span>
                            <button
                                onClick={() => setShowComments(false)}
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
                        {/* List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                                <div key={c.id} style={{ display: 'flex', gap: 10, opacity: c._opt ? 0.6 : 1 }}>
                                    <img
                                        src={
                                            c.user?.avatar_url ??
                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user?.name ?? 'U')}&background=222&color=fff`
                                        }
                                        alt=""
                                        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                            <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>@{c.user?.username}</span>
                                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{timeAgo(c.created_at)}</span>
                                        </div>
                                        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: '3px 0 0', lineHeight: 1.4 }}>{c.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Input */}
                        <div style={{ padding: '10px 14px 18px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                            {auth?.user ? (
                                <form onSubmit={sendComment} style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                                    <img
                                        src={
                                            auth.user.avatar_url ??
                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(auth.user.name)}&background=222&color=fff`
                                        }
                                        alt=""
                                        style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                    />
                                    <input
                                        ref={commentInputRef}
                                        value={commentBody}
                                        onChange={(e) => setCommentBody(e.target.value)}
                                        placeholder="Add a comment..."
                                        maxLength={500}
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
                                        type="submit"
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
                                        <RiSendPlaneFill size={15} color="#fff" />
                                    </button>
                                </form>
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
                    </div>
                </>
            )}

            {/* ── Products bottom sheet ──────────────────────────────────────── */}
            {showProducts && video.products?.length > 0 && (
                <>
                    <div
                        onClick={() => setShowProducts(false)}
                        style={{ position: 'absolute', inset: 0, zIndex: 19, background: 'rgba(0,0,0,0.4)' }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(16,16,16,0.98)',
                            backdropFilter: 'blur(24px)',
                            borderRadius: '20px 20px 0 0',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            zIndex: 20,
                            maxHeight: '55%',
                            overflowY: 'auto',
                            animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
                            <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 12px' }}>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Products in this video</span>
                            <button
                                onClick={() => setShowProducts(false)}
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
                        <div style={{ padding: '0 16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {video.products.map((p) => (
                                <Link
                                    key={p.id}
                                    href={`/products/${p.slug ?? p.id}`}
                                    style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none' }}
                                >
                                    <div
                                        style={{
                                            width: 58,
                                            height: 58,
                                            borderRadius: 12,
                                            background: 'rgba(255,255,255,0.06)',
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {p.primary_image && (
                                            <img src={p.primary_image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                            {p.name}
                                        </p>
                                        <p style={{ color: '#FF6B35', fontWeight: 700, fontSize: 14, margin: '3px 0 0' }}>
                                            ₦{Number(p.price).toLocaleString()}
                                        </p>
                                    </div>
                                    <div
                                        style={{
                                            padding: '7px 14px',
                                            background: '#FF6B35',
                                            borderRadius: 999,
                                            color: '#fff',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            flexShrink: 0,
                                        }}
                                    >
                                        Buy
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes heartPop { 0%{transform:scale(0);opacity:1} 50%{transform:scale(1.2)} 100%{transform:scale(1);opacity:0} }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
        </div>
    );
}

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
            {label !== undefined && (
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.9)', marginTop: 1 }}>{label}</span>
            )}
        </button>
    );
}

function fmtCount(n) {
    const num = Number(n ?? 0);
    if (isNaN(num)) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return String(num);
}

function timeAgo(d) {
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return new Date(d).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}
