import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    RiArrowLeftLine,
    RiBookmarkFill,
    RiBookmarkLine,
    RiChat1Line,
    RiCheckLine,
    RiCloseFill,
    RiCloseLine,
    RiDeleteBinLine,
    RiDownload2Line,
    RiFacebookCircleLine,
    RiHeartFill,
    RiHeartLine,
    RiInstagramLine,
    RiLink,
    RiLoader4Line,
    RiMapPinLine,
    RiMoreLine,
    RiReplyLine,
    RiSearchLine,
    RiSendPlaneFill,
    RiShareForwardLine,
    RiShoppingBag2Line,
    RiTelegramLine,
    RiTwitterXLine,
    RiUserAddLine,
    RiUserFollowLine,
    RiVerifiedBadgeLine,
    RiVolumeMuteLine,
    RiVolumeUpLine,
    RiWhatsappLine,
    RiRedditLine,
    RiFlag2Line,
} from 'react-icons/ri';
import ReportVideoModal from './ReportVideoModal';
import CommentSheet from '../../Components/Video/CommentSheet';
import Toast from '@/Components/Toast'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
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

function MoreSheet({ onClose, onReport, videoRef }) {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
    const [currentSpeed, setCurrentSpeed] = useState(videoRef.current?.playbackRate ?? 1)

    const setSpeed = (s) => {
        if (videoRef.current) videoRef.current.playbackRate = s
        setCurrentSpeed(s)
    }

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(18,18,18,0.98)', backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 14px' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Video Options</span>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RiCloseLine size={18} />
                    </button>
                </div>
                <div style={{ padding: '0 16px 18px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Playback Speed</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {speeds.map(s => (
                            <button key={s} onClick={() => setSpeed(s)}
                                style={{ padding: '8px 16px', borderRadius: 999, border: `1px solid ${currentSpeed === s ? '#FF6B35' : 'rgba(255,255,255,0.1)'}`, background: currentSpeed === s ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.04)', color: currentSpeed === s ? '#FF6B35' : '#fff', fontSize: 13, fontWeight: currentSpeed === s ? 700 : 400, cursor: 'pointer' }}>
                                {s === 1 ? 'Normal' : `${s}x`}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '4px 0' }}>
                    <button onClick={() => { onClose(); onReport(); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 14, fontWeight: 600 }}>
                        <RiFlag2Line size={18} /> Report video
                    </button>
                </div>
            </div>
        </>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// useVideoDownload — server-side watermark download hook
// ─────────────────────────────────────────────────────────────────────────────
function useVideoDownload(video) {
    const [dlState, setDlState] = useState('idle'); // idle | preparing | processing | done | error
    const pollTimer = useRef(null);

    const stopPolling = () => {
        if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
    };

    const triggerBrowserDownload = useCallback(async (url, jobKey) => {
        try {
            const res  = await fetch(url, { mode: 'cors' });
            const blob = await res.blob();
            const burl = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = burl;
            a.download = `flockr-${video.user?.username ?? 'video'}-${video.ulid ?? Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(burl), 10_000);
            setDlState('done');
            setTimeout(() => setDlState('idle'), 4000);
            axios.delete(`/api/videos/download/cleanup?job_key=${encodeURIComponent(jobKey)}`).catch(() => {});
        } catch {
            setDlState('error');
            setTimeout(() => setDlState('idle'), 4000);
        }
    }, [video.user?.username, video.ulid]);

    const download = useCallback(async () => {
        if (dlState !== 'idle' && dlState !== 'error') return;
        setDlState('preparing');
        stopPolling();
        try {
            const { data } = await axios.post(
                `/api/videos/${video.ulid}/download/prepare`,
                {},
                { withCredentials: true }
            );
            const jobKey = data.job_key;
            if (data.status === 'done' && data.url) {
                await triggerBrowserDownload(data.url, jobKey);
                return;
            }
            setDlState('processing');
            pollTimer.current = setInterval(async () => {
                try {
                    const { data: poll } = await axios.get(
                        `/api/videos/download/status?job_key=${encodeURIComponent(jobKey)}`,
                        { withCredentials: true }
                    );
                    if (poll.status === 'done' && poll.url) {
                        stopPolling();
                        await triggerBrowserDownload(poll.url, jobKey);
                    } else if (poll.status === 'error') {
                        stopPolling();
                        setDlState('error');
                        setTimeout(() => setDlState('idle'), 4000);
                    }
                } catch {
                    stopPolling();
                    setDlState('error');
                    setTimeout(() => setDlState('idle'), 4000);
                }
            }, 2000);
            // Timeout after 5 minutes
            setTimeout(() => {
                if (pollTimer.current) {
                    stopPolling();
                    setDlState('error');
                    setTimeout(() => setDlState('idle'), 4000);
                }
            }, 300_000);
        } catch {
            setDlState('error');
            setTimeout(() => setDlState('idle'), 4000);
        }
    }, [dlState, video.ulid, triggerBrowserDownload]);

    return { download, dlState };
}

// ─────────────────────────────────────────────────────────────────────────────
// SideBtn
// ─────────────────────────────────────────────────────────────────────────────
const SideBtn = ({ onClick, children, label }) => (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))' }}>{children}</div>
        {label !== undefined && label !== '' && <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.9)', marginTop: 1 }}>{label}</span>}
    </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// ExpandableDescription
// ─────────────────────────────────────────────────────────────────────────────
const ExpandableDescription = ({ text, maxLines = 2 }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text) return null;
    const isLong = text.length > 100;
    if (!isLong || expanded) {
        return (
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: 0, lineHeight: 1.4 }}>
                {text}
                {expanded && isLong && (
                    <button onClick={e => { e.stopPropagation(); setExpanded(false); }} style={{ background: 'none', border: 'none', color: '#FF6B35', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '0 0 0 4px' }}>less</button>
                )}
            </p>
        );
    }
    return (
        <div>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: maxLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{text}</p>
            <button onClick={e => { e.stopPropagation(); setExpanded(true); }} style={{ background: 'none', border: 'none', color: '#FF6B35', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '2px 0 0', display: 'block' }}>see more</button>
        </div>
    );
};

const DescriptionPanel = ({ text }) => {
    const [expanded, setExpanded] = useState(false)
    const isLong = text.length > 150

    return (
        <div>
            <div style={{
                maxHeight: expanded ? 120 : 'auto',
                overflowY: expanded ? 'auto' : 'visible',
                paddingRight: expanded ? 4 : 0,
            }}>
                <p style={{
                    color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.5, margin: 0,
                    whiteSpace: 'pre-wrap',
                    display: !expanded && isLong ? '-webkit-box' : 'block',
                    WebkitLineClamp: !expanded && isLong ? 3 : 'unset',
                    WebkitBoxOrient: 'vertical',
                    overflow: !expanded && isLong ? 'hidden' : 'visible',
                }}>
                    {text}
                </p>
            </div>
            {isLong && (
                <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', color: '#FF6B35', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0 0', display: 'block' }}>
                    {expanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </div>
    )
}

// ProductRow
// ─────────────────────────────────────────────────────────────────────────────
const ProductRow = ({ product }) => {
    const sellerUsername = product.seller?.username
    const href = sellerUsername
        && `/@${sellerUsername}/products/${product.slug ?? product.id}`
     
    return (
        <Link href={href}>
            <button style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                <div style={{ width: 52, height: 52, borderRadius: 10, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0 }}>
                    {product.primary_image && <img src={product.primary_image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                    <p style={{ color: '#FF6B35', fontWeight: 700, fontSize: 14, margin: '3px 0 0' }}>₦{Number(product.price).toLocaleString()}</p>
                </div>
                <div style={{ padding: '7px 14px', background: '#FF6B35', borderRadius: 999, color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Buy</div>
            </button>
        </Link>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// ShareSheet — all original options + Download button
// ─────────────────────────────────────────────────────────────────────────────
const ShareSheet = ({ videoUrl, videoTitle, onClose, onDownload, dlState }) => {
    const [copied, setCopied] = useState(false);
    const encodedUrl   = encodeURIComponent(videoUrl);
    const encodedTitle = encodeURIComponent(videoTitle || 'Check this out on Flockr');

    const handleCopy = async () => {
        await navigator.clipboard.writeText(videoUrl).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

    // Download button appearance based on dlState
    const dlLabel = { idle: 'Download', preparing: 'Preparing…', processing: 'Processing…', done: '✓ Saved!', error: 'Retry' }[dlState] ?? 'Download';
    const dlColor = { idle: '#fff', preparing: 'rgba(255,255,255,0.4)', processing: 'rgba(255,255,255,0.4)', done: '#10B981', error: '#EF4444' }[dlState] ?? '#fff';
    const dlBg    = { idle: 'rgba(255,255,255,0.06)', preparing: 'rgba(255,255,255,0.04)', processing: 'rgba(255,255,255,0.04)', done: 'rgba(16,185,129,0.12)', error: 'rgba(239,68,68,0.12)' }[dlState] ?? 'rgba(255,255,255,0.06)';
    const dlBusy  = dlState === 'preparing' || dlState === 'processing';

    const opts = [
        { label: 'WhatsApp',   Icon: RiWhatsappLine,       color: '#25D366', bg: 'rgba(37,211,102,0.12)',  href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
        { label: 'Facebook',   Icon: RiFacebookCircleLine, color: '#1877F2', bg: 'rgba(24,119,242,0.12)',  href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
        { label: 'Telegram',   Icon: RiTelegramLine,       color: '#26A5E4', bg: 'rgba(38,165,228,0.12)',  href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
        { label: 'X (Twitter)',Icon: RiTwitterXLine,       color: '#fff',    bg: 'rgba(255,255,255,0.08)', href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
        { label: 'Reddit',     Icon: RiRedditLine,         color: '#FF4500', bg: 'rgba(255,69,0,0.12)',    href: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}` },
        { label: 'Instagram',  Icon: RiInstagramLine,      color: '#E1306C', bg: 'rgba(225,48,108,0.12)', href: null, onClick: handleCopy },
        ...(canNativeShare ? [{ label: 'More', Icon: RiShareForwardLine, color: '#FF6B35', bg: 'rgba(255,107,53,0.12)', href: null, onClick: () => navigator.share({ title: videoTitle || 'Flockr', url: videoUrl }).catch(() => {}) }] : []),
        // ── Download (server-side watermarked) ────────────────────────────────
        { label: dlLabel, Icon: RiDownload2Line, color: dlColor, bg: dlBg, href: null, onClick: dlBusy ? undefined : onDownload, busy: dlBusy },
    ];

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(18,18,18,0.98)', backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 16px' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Share</span>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiCloseLine size={18} /></button>
                </div>
                <div style={{ display: 'flex', gap: 20, padding: '0 20px 24px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {opts.map(o => {
                        const { Icon } = o;
                        return (
                            <button key={o.label}
                                onClick={() => { if (o.onClick) { o.onClick(); return; } if (o.href) window.open(o.href, '_blank', 'noopener,noreferrer'); }}
                                disabled={o.busy}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: o.busy ? 'default' : 'pointer', flexShrink: 0, opacity: o.busy ? 0.6 : 1 }}>
                                <div style={{ width: 56, height: 56, borderRadius: 16, background: o.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${o.color}22` }}>
                                    {o.busy
                                        ? <RiLoader4Line size={26} color={o.color} style={{ animation: 'spin 0.8s linear infinite' }} />
                                        : <Icon size={26} color={o.color} />
                                    }
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, whiteSpace: 'nowrap' }}>{o.label}</span>
                            </button>
                        );
                    })}
                </div>
                <div style={{ margin: '0 16px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <RiLink size={18} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{videoUrl}</span>
                    <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, background: copied ? 'rgba(16,185,129,0.15)' : '#FF6B35', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0, transition: 'background 0.2s' }}>
                        {copied ? <><RiCheckLine size={13} /> Copied!</> : 'Copy link'}
                    </button>
                </div>
            </div>
        </>
    );
};



// ─────────────────────────────────────────────────────────────────────────────
// VideoSlide — one full-screen slide
// ─────────────────────────────────────────────────────────────────────────────
function VideoSlide({ video, isActive, showBackBtn = false, onBack }) {
    const { auth } = usePage().props;
    const videoRef        = useRef(null);
    const progressBarRef  = useRef(null);
    const watchStartRef   = useRef(null);
    const commentInputRef = useRef(null);
    const viewTimerRef = useRef(null);

    const [playing,       setPlaying]       = useState(false);
    const [muted,         setMuted]         = useState(false);
    const [progress,      setProgress]      = useState(0);
    const [loading,       setLoading]       = useState(true);
    const [tapFlash,      setTapFlash]      = useState(false);
    const [showPP,        setShowPP]        = useState(false);
    const [liked,         setLiked]         = useState(video.is_liked ?? false);
    const [likesCount,    setLikesCount]    = useState(Number(video.likes_count ?? 0));
    const [saved,         setSaved]         = useState(video.is_saved ?? false);
    const [savesCount,    setSavesCount]    = useState(Number(video.saves_count ?? 0));
    const [followed,      setFollowed]      = useState(video.is_following ?? false);
    const [commentsCount, setCommentsCount] = useState(Number(video.comments_count ?? 0));
    const [tab,           setTab]           = useState('comments');
    const [mobileSheet,   setMobileSheet]   = useState(null);
    const [showSearch,    setShowSearch]    = useState(false);
    const [toast,    setToast]    = useState(null)
const [duration, setDuration] = useState(0)  // only if not already present
    const [searchQuery,   setSearchQuery]   = useState('');
    const searchInputRef = useRef(null);

    const [moreSheetOpen, setMoreSheetOpen] = useState(false);
const [reportOpen, setReportOpen] = useState(false);


    // ── Download hook ─────────────────────────────────────────────────────────
    const { download, dlState } = useVideoDownload(video);

    const isOwner     = auth?.user?.id === video.user_id;
    const isAdmin     = auth?.user?.role === 'admin';
    const hasProducts = video.is_for_sale && video.products?.length > 0;
    const avatarSrc   = video.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(video.user?.name || 'U')}&background=222&color=fff`;
    const videoSrc    = video.video_stream_url ?? video.hls_url ?? video.video_url;
    const videoUrl    = typeof window !== 'undefined' ? `${window.location.origin}/@${video.user?.username}/video/${video.ulid}` : '';

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (isActive) {
        el.muted = true
        el.play().then(() => { setPlaying(true); setTimeout(() => { el.muted = false; setMuted(false) }, 300) }).catch(() => {})
        watchStartRef.current = Date.now()

        // Fire view after 5 seconds of watching — catches users who never scroll away
        viewTimerRef.current = setTimeout(() => {
            const secs = Math.round((Date.now() - watchStartRef.current) / 1000)
            if (secs >= 3) {
                axios.post(`/api/videos/${video.ulid}/view`, { watch_seconds: secs, session_id: null }, { withCredentials: true }).catch(() => {})
                watchStartRef.current = null // prevent double-firing on scroll away
            }
        }, 5000)
    } else {
        clearTimeout(viewTimerRef.current)
        el.pause(); el.currentTime = 0
        // setShowComments(false);
        //  setShowProducts(false); setShowShare(false)
        if (watchStartRef.current) {
            const secs = Math.round((Date.now() - watchStartRef.current) / 1000)
            if (secs >= 3) axios.post(`/api/videos/${video.ulid}/view`, { watch_seconds: secs, session_id: null }, { withCredentials: true }).catch(() => {})
            watchStartRef.current = null
        }
    }
}, [isActive])


    useEffect(() => {
        const el = videoRef.current; if (!el) return;
        const onTime = () => { if (el.duration) setProgress((el.currentTime / el.duration) * 100); };
        el.addEventListener('timeupdate', onTime);
        return () => el.removeEventListener('timeupdate', onTime);
    }, []);

    useEffect(() => {
    const handleKey = (e) => {
        const el = videoRef.current
        if (!el) return
        if (e.key === 'ArrowRight') { e.preventDefault(); el.currentTime = Math.min(el.duration, el.currentTime + 5) }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); el.currentTime = Math.max(0, el.currentTime - 5) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
}, [])

    
    useEffect(() => { if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 100); }, [showSearch]);

    const lastTap = useRef(0);
    const handleVideoTap = useCallback(() => {
        if (mobileSheet || showSearch) return;
        const now = Date.now();
        if (now - lastTap.current < 300) {
            if (!liked) handleLike();
            setTapFlash(true); setTimeout(() => setTapFlash(false), 700);
        } else {
            videoRef.current?.paused ? videoRef.current.play().catch(() => {}) : videoRef.current?.pause();
setShowPP(true);
        }
        lastTap.current = now;
    }, [liked, mobileSheet, showSearch]);

  const handleSeek = useCallback((e) => {
    e.stopPropagation();
    const el = videoRef.current;
    const bar = progressBarRef.current;
    if (!el?.duration || !bar) return;

    const updateSeek = (clientX) => {
        const rect = bar.getBoundingClientRect();
        const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        el.currentTime = pct * el.duration;
        setProgress(pct * 100);
    };

    // Handle initial click/touch point
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    updateSeek(clientX);

    // Track dragging
    const handleMove = (moveEvent) => {
        const moveX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
        updateSeek(moveX);
    };

    const handleEnd = () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleEnd);
}, []);

    const handleLike = useCallback(async () => {
        if (!auth?.user) return router.visit('/login');
        const was = liked; setLiked(!was); setLikesCount(c => Math.max(0, c + (was ? -1 : 1)));
        try { const { data } = await axios.post(`/api/videos/${video.ulid}/like`, {}, { withCredentials: true }); setLiked(data.liked); setLikesCount(Number(data.likes_count ?? 0)); }
        catch { setLiked(was); setLikesCount(c => Math.max(0, c + (was ? 1 : -1))); }
    }, [liked, auth, video.id]);

    const handleSave = useCallback(async () => {
        if (!auth?.user) return router.visit('/login');
        const was = saved; setSaved(!was); setSavesCount(c => Math.max(0, c + (was ? -1 : 1)));
        showToast(was ? 'Removed from saved' : 'Video Saved', was ? 'error' : 'success')
        try { const { data } = await axios.post(`/api/videos/${video.ulid}/save`, {}, { withCredentials: true }); setSaved(data.saved); if (data.saves_count !== undefined) setSavesCount(Number(data.saves_count)); }
        catch { setSaved(was); setSavesCount(c => Math.max(0, c + (was ? 1 : -1))); }
    }, [saved, auth, video.id]);

    const handleFollow = useCallback(async () => {
        if (!auth?.user) return router.visit('/login');
        if (followed) return; setFollowed(true);
        try { await axios.post(`/api/users/${video.user?.id}/follow`, {}, { withCredentials: true }); }
        catch { setFollowed(false); }
    }, [followed, auth, video.user?.id]);

    const toggleMute = useCallback(() => { setMuted(m => { if (videoRef.current) videoRef.current.muted = !m; return !m; }); }, []);
    const handleSearch = (e) => { e.preventDefault(); if (searchQuery.trim()) router.visit(`/explore?q=${encodeURIComponent(searchQuery.trim())}`); };
    const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
}





 const openSheet = (sheet) => { setMobileSheet(sheet); };

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', background: '#000', overflow: 'hidden' }}>

            {/* ShareSheet — passes download props */}
          {mobileSheet === 'share' && (
    <ShareSheet videoUrl={videoUrl} videoTitle={video.title} onClose={() => setMobileSheet(null)} onDownload={download} dlState={dlState} />
)}
{moreSheetOpen && (
    <MoreSheet
        onClose={() => setMoreSheetOpen(false)}
        onReport={() => setReportOpen(true)}
        videoRef={videoRef}
    />
)}
{reportOpen && (
    <ReportVideoModal
        video={video}
        onClose={() => setReportOpen(false)}
    />
)}

            

            {/* VIDEO COLUMN */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden', minWidth: 0 }}>
                <video ref={videoRef} src={videoSrc} poster={video.thumbnail_url_full} muted playsInline preload="metadata"
                    onCanPlay={() => setLoading(false)} onWaiting={() => setLoading(true)}
                    onPlay={() => { setPlaying(true); setShowPP(false) }} onPause={() => setPlaying(false)}
                    onClick={handleVideoTap}
                    onEnded={() => { const el = videoRef.current; if (el) { el.currentTime = 0; el.play().catch(() => {}) } }}
                    onLoadedMetadata={e => setDuration(e.target.duration)}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                />
                {/* Text overlays */}
{Array.isArray(video.text_overlays) && video.text_overlays.map(overlay => (
    <span
        key={overlay.id}
        style={{
            position: 'absolute',
            top: `${overlay.top}%`,
            left: `${overlay.left}%`,
            zIndex: 8,
            color: overlay.textColor ?? '#fff',
            fontSize: overlay.fontSize ?? 18,
            fontWeight: overlay.fontStyle === 'bold' ? 800 : 600,
            fontStyle: overlay.fontStyle === 'italic' ? 'italic' : 'normal',
            textShadow: overlay.showOutline ? 'none' : '0 2px 8px rgba(0,0,0,0.9)',
            border: overlay.showOutline ? `2px solid ${overlay.outlineColor ?? '#fff'}` : 'none',
            borderRadius: overlay.showOutline ? 8 : 0,
            padding: overlay.showOutline ? '3px 10px' : 0,
            pointerEvents: 'none',
            userSelect: 'none',
            maxWidth: '80%',
            wordBreak: 'break-word',
            lineHeight: 1.3,
            display: 'inline-block',
        }}
    >
        {overlay.text}
    </span>
))}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.1) 45%, transparent 70%)', pointerEvents: 'none', zIndex: 1 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 25%)', pointerEvents: 'none', zIndex: 1 }} />

                {/* Top bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                    <button onClick={showBackBtn ? onBack : () => window.history.back()} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                        <RiArrowLeftLine size={20} />
                    </button>
                    <div className="flex flex-row gap-3">
                        {showSearch ? (
                        <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products, sellers..." onKeyDown={e => e.key === 'Escape' && setShowSearch(false)} style={{ flex: 1, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 999, padding: '8px 16px', color: '#fff', fontSize: 13, outline: 'none' }} />
                            <button type="button" onClick={() => { setShowSearch(false); setSearchQuery(''); }} style={{ background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', borderRadius: 999, backdropFilter: 'blur(8px)', flexShrink: 0, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="text-center">
                                <RiCloseFill size={20} />
                            </button>
                        </form>
                    ) : (
                        <button onClick={() => setShowSearch(true)} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <RiSearchLine size={20} />
                        </button>
                        
                    )}
       <button onClick={() => setMoreSheetOpen(true)} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', color: '#fff' }} className="lg:hidden flex text-center">
    <RiMoreLine size={20} />
</button>
                    </div>
                </div>

                {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}><div style={{ width: 36, height: 36, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>}
                {tapFlash && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}><RiHeartFill size={90} color="#EF4444" style={{ filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.5))', animation: 'heartPop 0.7s ease forwards' }} /></div>}
                {showPP && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {playing
                                ? <svg width={22} height={22} fill="white" viewBox="0 0 24 24"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>
                                : <svg width={22} height={22} fill="white" viewBox="0 0 24 24"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
                            }
                        </div>
                    </div>
                )}

                {/* Improved progress bar with active pointer handling */}
<div 
    ref={progressBarRef} 
    onMouseDown={handleSeek}
    onTouchStart={handleSeek}
    style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: 24, // slightly larger touch target
        zIndex: 40, // high z-index to clear overlay overlaps
        cursor: 'pointer', 
        display: 'flex', 
        alignItems: 'flex-end',
        paddingBottom: 4,
        pointerEvents: 'auto' // ensures it intercepts events
    }}
>
    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.15)' }}>
        <div style={{ height: '100%', background: '#FF6B35', width: `${progress}%` }} />
    </div>
</div>

                {/* Right actions */}
                <div style={{ position: 'absolute', right: 10, bottom: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, zIndex: 10 }}>
                    <div style={{ position: 'relative', marginBottom: 4 }}>
    <button onClick={() => router.visit(`/@${video.user?.username}`)}><img src={avatarSrc} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', display: 'block' }} /></button>
</div>
                    <SideBtn onClick={handleLike} label={fmt(likesCount)}>{liked ? <RiHeartFill size={28} color="#EF4444" /> : <RiHeartLine size={28} color="#fff" />}</SideBtn>
                    <SideBtn onClick={() => { if (!auth?.user) return router.visit('/login'); if (window.innerWidth < 768) openSheet('comments'); else setTab('comments'); }} label={fmt(commentsCount)}>
                        <RiChat1Line size={28} color={'#fff'} />
                    </SideBtn>
                    <SideBtn onClick={handleSave} label={fmt(savesCount)}>{saved ? <RiBookmarkFill size={28} color="#FBBF24" /> : <RiBookmarkLine size={28} color="#fff" />}</SideBtn>
                    {hasProducts && <SideBtn onClick={() => { if (window.innerWidth < 768) openSheet('products'); else setTab('products'); }} label={video.products.length}><RiShoppingBag2Line size={28} color={tab === 'products' ? '#FF6B35' : '#fff'} /></SideBtn>}
                    <SideBtn onClick={() => openSheet('share')} label="Share"><RiShareForwardLine size={28} color="#fff" /></SideBtn>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
    <button onClick={toggleMute} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {muted ? <RiVolumeMuteLine size={17} color="#fff" /> : <RiVolumeUpLine size={17} color="#fff" />}
    </button>
    {duration > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
            <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, fontFamily: 'monospace', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {(() => { const cur = (progress / 100) * duration; const f = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`; return f(cur) })()}
            </span>
            <div style={{ width: 14, height: 1, background: 'rgba(255,255,255,0.3)', margin: '1px 0' }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontFamily: 'monospace', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {(() => { const f = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`; return f(duration) })()}
            </span>
        </div>
    )}
</div>
                </div>

                {/* Bottom info */}
                <div className='lg:w-[50%]' style={{ position: 'absolute', bottom: 36, left: 12, right: 68, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {!isOwner && (
        <button onClick={handleFollow} style={{ display: 'block', marginBottom: 4, padding: '5px 14px', background: 'transparent', border: '1px solid #FF6B35', borderRadius: 999, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', width: 'fit-content' }}>
            {followed ? 'Following' : 'Follow'}
        </button>
    )}
                    <button onClick={() => router.visit(`/@${video.user?.username}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: 'fit-content' }}>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>{video.user?.name}</span>
                        {video.user?.is_verified && <RiVerifiedBadgeLine size={13} color="#FF6B35" />}
                    </button>
                    {video.title && <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.35, textShadow: '0 1px 4px rgba(0,0,0,0.7)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{video.title}</p>}
                    {video.description && <ExpandableDescription text={video.description} />}
{video.hashtags?.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{video.hashtags.slice(0, 5).map((tag, i) => (
   <Link href={`/explore?q=${encodeURIComponent(tag.replace(/^#/, ''))}`}
    onClick={e => e.stopPropagation()}
    prefetch="hover"
    style={{ color: '#FF6B35', fontSize: 13, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.7)', textDecoration: 'none' }}>
    {tag.startsWith('#') ? tag : `#${tag}`}
</Link>
))}</div>}                    
                    {video.user?.location && <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><RiMapPinLine size={11} color="rgba(255,255,255,0.55)" /><span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{video.user.location}</span></div>}
                    {hasProducts && <button onClick={() => window.innerWidth < 768 ? openSheet('products') : setTab('products')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,107,53,0.18)', border: '1px solid rgba(255,107,53,0.45)', borderRadius: 999, padding: '6px 13px', backdropFilter: 'blur(8px)', cursor: 'pointer', width: 'fit-content', marginTop: 2 }}><RiShoppingBag2Line size={13} color="#FF6B35" /><span style={{ color: '#FF6B35', fontSize: 12, fontWeight: 700 }}>{video.products.length} Product{video.products.length > 1 ? 's' : ''} · Tap to shop</span></button>}
                </div>
            </div>

            {/* DESKTOP RIGHT PANEL */}
            <div style={{ display: 'none', flexDirection: 'column', width: 340, flexShrink: 0, background: 'rgba(16,16,16,0.98)', borderLeft: '1px solid rgba(255,255,255,0.08)', height: '100%', overflowY: 'auto' }} className="video-show-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                    <button onClick={() => router.visit(`/@${video.user?.username}`)}><img src={avatarSrc} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} /></button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <button onClick={() => router.visit(`/@${video.user?.username}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 14, padding: 0 }} className='truncate' title={video.user?.name ?? video.user?.username}>{video.user?.name ?? video.user?.username}</button>
                            {video.user?.is_verified && <RiVerifiedBadgeLine size={13} color="#FF6B35" />}
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '2px 0 0' }}>@{video.user?.username}</p>
                    </div>
                    {!isOwner && <button onClick={auth?.user ? handleFollow : () => router.visit('/login')} style={{ padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, border: 'none', background: followed ? 'rgba(255,255,255,0.08)' : '#FF6B35', color: followed ? 'rgba(255,255,255,0.5)' : '#fff' }}>{followed ? 'Following' : 'Follow'}</button>}
          <button onClick={() => setMoreSheetOpen(true)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
    <RiMoreLine size={16} color="rgba(255,255,255,0.5)" />
</button>
                </div>
                {(video.title || video.description) && (
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                        {video.title && <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>{video.title}</p>}
                        {video.description && (
            <DescriptionPanel text={video.description} />
        )}
{video.hashtags?.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>{video.hashtags.map((tag, i) => (
    <Link href={`/explore?q=${encodeURIComponent(tag.replace(/^#/, ''))}`}
    onClick={e => e.stopPropagation()}
    prefetch="hover"
    style={{ color: '#FF6B35', fontSize: 13, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.7)', textDecoration: 'none' }}>
    {tag.startsWith('#') ? tag : `#${tag}`}
</Link>
))}</div>}                       
                         {/* Desktop share/download button row */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <button onClick={() => openSheet('share')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                <RiShareForwardLine size={14} /> Share
                            </button>
                            <button onClick={download} disabled={dlState !== 'idle' && dlState !== 'error'}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: dlState === 'done' ? 'rgba(16,185,129,0.12)' : dlState === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, color: dlState === 'done' ? '#10B981' : dlState === 'error' ? '#EF4444' : '#fff', fontSize: 12, fontWeight: 600, cursor: (dlState === 'preparing' || dlState === 'processing') ? 'default' : 'pointer', opacity: (dlState === 'preparing' || dlState === 'processing') ? 0.5 : 1 }}>
                                {(dlState === 'preparing' || dlState === 'processing') ? <RiLoader4Line size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <RiDownload2Line size={14} />}
                                {{ idle: 'Download', preparing: 'Preparing…', processing: 'Processing…', done: '✓ Saved!', error: 'Retry' }[dlState]}
                            </button>
                        </div>
                    </div>
                )}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                    {[{ key: 'comments', label: `Comments (${fmt(commentsCount)})` }, ...(hasProducts ? [{ key: 'products', label: `Shop (${video.products.length})` }] : [])].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: '12px 8px', background: 'none', border: 'none', cursor: 'pointer', color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: tab === t.key ? 700 : 400, borderBottom: tab === t.key ? '2px solid #FF6B35' : '2px solid transparent', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>{t.label}</button>
                    ))}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {tab === 'products' && hasProducts && <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>{video.products.map(p => <ProductRow key={p.id} product={p} />)}</div>}
                    {tab === 'comments' && (
    <CommentSheet
        videoId={video.ulid}
        videoOwnerId={video.user_id}
        onClose={() => setTab('products')}  // or whatever default tab fallback you want
        onCountChange={(delta) => setCommentsCount(c => Math.max(0, c + delta))}
    />
)}
                </div>
            </div>

            {/* Mobile bottom sheets */}
            {mobileSheet && mobileSheet !== 'share' && (
                <>
                    <div onClick={() => setMobileSheet(null)} style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.4)' }} />
                    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: mobileSheet === 'comments' ? '55%' : 'auto', maxHeight: '60%', background: 'rgba(16,16,16,0.98)', backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', zIndex: 50, display: 'flex', flexDirection: 'column', animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}><div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} /></div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 10px' }}>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{mobileSheet === 'comments' ? `Comments (${fmt(commentsCount)})` : `Products (${video.products?.length})`}</span>
                            <button onClick={() => setMobileSheet(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiCloseLine size={18} /></button>
                        </div>
                        {mobileSheet === 'products' && <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>{video.products?.map(p => <ProductRow key={p.id} product={p} />)}</div>}
                        {mobileSheet === 'comments' && (
    <CommentSheet
        videoId={video.ulid}
        videoOwnerId={video.user_id}
        onClose={() => setTab('products')}  // or whatever default tab fallback you want
        onCountChange={(delta) => setCommentsCount(c => Math.max(0, c + delta))}
    />
)}
                    </div>
                </>
            )}

            {toast && (
    <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', zIndex: 60, pointerEvents: 'none' }}>
        <Toast toast={toast ? { message: toast.msg, type: toast.type } : null} onDismiss={() => setToast(null)} />
    </div>
)}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoShow — scroll container
// ─────────────────────────────────────────────────────────────────────────────
export default function VideoShow({ video, isLiked, isSaved, isFollowing, initialSellerVideos = [] }) {
    const [sellerVideos,  setSellerVideos]  = useState(initialSellerVideos);
    const [sellerCursor,  setSellerCursor]  = useState(initialSellerVideos.length);
    const [sellerHasMore, setSellerHasMore] = useState(true);
    const [loadingMore,   setLoadingMore]   = useState(false);
    const [activeIdx,     setActiveIdx]     = useState(0);
    const sentinelRef = useRef(null);
    const slideRefs   = useRef([]);

    const mainVideo = { ...video, is_liked: isLiked, is_saved: isSaved, is_following: isFollowing };
    const allVideos = [mainVideo, ...sellerVideos];

    useEffect(() => {
        const observers = [];
        slideRefs.current.forEach((el, i) => {
            if (!el) return;
            const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setActiveIdx(i); }, { threshold: 0.6 });
            obs.observe(el);
            observers.push(obs);
        });
        return () => observers.forEach(o => o.disconnect());
    }, [allVideos.length]);

    const loadMore = useCallback(async () => {
        if (loadingMore || !sellerHasMore) return;
        setLoadingMore(true);
        try {
            const { data } = await axios.get('/api/feed', { params: { type: 'seller', seller_id: video.user_id, exclude_ulid: video.ulid, cursor: sellerCursor, limit: 10 }, withCredentials: true });
            const incoming = data.data ?? [];
            setSellerVideos(prev => { const seen = new Set(prev.map(v => v.ulid)); return [...prev, ...incoming.filter(v => !seen.has(v.ulid))]; });
            setSellerCursor(c => c + incoming.length);
            setSellerHasMore(data.has_more ?? false);
        } catch {} finally { setLoadingMore(false); }
    }, [loadingMore, sellerHasMore, sellerCursor, video.user_id, video.ulid]);

    useEffect(() => { if (activeIdx >= allVideos.length - 2 && sellerHasMore && !loadingMore) loadMore(); }, [activeIdx, allVideos.length]);

    useEffect(() => {
        if (!sentinelRef.current) return;
        const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadMore(); }, { threshold: 0.1 });
        obs.observe(sentinelRef.current);
        return () => obs.disconnect();
    }, [loadMore]);

    return (
        <>
            <Head title={video.title || `${video.user?.name} on Flockr`} />
            <div style={{ width: '100%', height: '100dvh', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none', background: '#000' }}>
                {allVideos.map((v, i) => (
                    <div key={v.ulid} ref={el => slideRefs.current[i] = el} style={{ width: '100%', height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always', overflow: 'hidden', position: 'relative' }}>
                        <VideoSlide video={v} isActive={activeIdx === i} showBackBtn={i > 0} onBack={() => window.history.back()} />
                    </div>
                ))}
                {loadingMore && (
                    <div style={{ width: '100%', padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, scrollSnapAlign: 'start' }}>
                        <div style={{ width: 36, height: 36, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>Loading more videos…</p>
                    </div>
                )}
                <div ref={sentinelRef} style={{ height: 1 }} />
            </div>
            <style>{`
                @media (min-width: 768px) { .video-show-panel { display: flex !important; } }
                ::-webkit-scrollbar { display: none; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes heartPop { 0%{transform:scale(0);opacity:1} 50%{transform:scale(1.2)} 100%{transform:scale(1);opacity:0} }
                @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
            `}</style>
        </>
    );
}