import ProductCard from '@/Components/Product/ProductCard';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import ProPlansSheet from '@/Components/ProPlansSheet';
import BadgeRoadmapSheet from '@/Components/BadgeRoadmapSheet';
import TrustScoreModal from '@/Components/TrustScoreModal'
import MutualFriendsRow from '@/Components/MutualFriendsRow'
import { useState, useEffect } from 'react';
import { FiLink } from 'react-icons/fi';
import {
    RiAlertLine,
    RiCheckLine,
    RiMapPinLine,
    RiMessage2Line,
    RiMoreLine,
    RiPlayFill,
    RiPlayLine,
    RiProhibitedLine,
    RiSettings4Line,
    RiShareForwardLine,
    RiStoreLine,
    RiUploadCloud2Line,
    RiUserAddLine,
    RiUserFollowLine,
    RiVerifiedBadgeLine,
    RiVideoLine,
    RiNewspaperLine,
    RiVipCrownLine,
    RiShieldCheckLine
} from 'react-icons/ri';
import PostCard from '@/Components/Community/PostCard';
import BadgesDisplay from '@/Components/BadgesDisplay';
import LevelStreakChip from '@/Components/LevelStreakChip';
import VerifiedBadge from '@/Components/VerifiedBadge';
import SubscriptionSuccessSheet from '@/Components/SubscriptionSuccessSheet';
import ConfirmModal from '@/Components/Community/ConfirmModal'

// ── Report Modal ──────────────────────────────────────────────────────────────
function ReportModal({ user, onClose, onSubmit }) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const REASONS = [
        'Spam or misleading content',
        'Harassment or bullying',
        'Hate speech or discrimination',
        'Scam or fraud',
        'Inappropriate content',
        'Other',
    ];

    const handleSubmit = async () => {
        if (!reason) return;
        setSubmitting(true);
        try {
            await onSubmit(reason);
            setDone(true);
        } catch {
            alert('Failed to submit report. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    flexShrink: 0,
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: 'none',
                        borderRadius: '50%',
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#fff',
                        flexShrink: 0,
                    }}
                >
                    <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <div>
                    <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: 0 }}>Report Account</h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '2px 0 0' }}>@{user?.username}</p>
                </div>
            </div>
            <div style={{ flex: 1, padding: '24px 20px', maxWidth: 480, width: '100%', margin: '0 auto' }}>
                {done ? (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 300,
                            gap: 16,
                            textAlign: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: '50%',
                                background: 'rgba(16,185,129,0.15)',
                                border: '1px solid rgba(16,185,129,0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <RiCheckLine size={28} color="#10B981" />
                        </div>
                        <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>Report Submitted</h3>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                            Thank you. Our team will review this report and take appropriate action.
                        </p>
                        <button
                            onClick={onClose}
                            style={{
                                marginTop: 8,
                                padding: '12px 32px',
                                background: '#FF6B35',
                                border: 'none',
                                borderRadius: 999,
                                color: '#fff',
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                            Your report is anonymous and will be reviewed by our team.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {REASONS.map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setReason(r)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '14px 16px',
                                        borderRadius: 14,
                                        cursor: 'pointer',
                                        background: reason === r ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${reason === r ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                        color: reason === r ? '#FF6B35' : '#fff',
                                        fontSize: 14,
                                        fontWeight: reason === r ? 600 : 400,
                                        textAlign: 'left',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {r}
                                    {reason === r && (
                                        <div
                                            style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: '50%',
                                                background: '#FF6B35',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <RiCheckLine size={12} color="#fff" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={!reason || submitting}
                            style={{
                                width: '100%',
                                marginTop: 28,
                                padding: '15px',
                                background: reason ? '#FF6B35' : 'rgba(255,255,255,0.06)',
                                border: 'none',
                                borderRadius: 999,
                                color: reason ? '#fff' : 'rgba(255,255,255,0.3)',
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: reason ? 'pointer' : 'default',
                                opacity: submitting ? 0.7 : 1,
                            }}
                        >
                            {submitting ? 'Submitting…' : 'Submit Report'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

// ── 3-dot context menu (block + report) ───────────────────────────────────────
function ProfileMenu({ iBlocked, onBlock, onReport, onClose }) {
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
            <div
                style={{
                    position: 'absolute',
                    top: 44,
                    right: 0,
                    width: 190,
                    background: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    zIndex: 99,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}
            >
                <button
                    onClick={onReport}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '13px 16px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 500,
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <RiAlertLine size={16} color="rgba(255,255,255,0.5)" /> Report account
                </button>
                <button
                    onClick={onBlock}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '13px 16px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: iBlocked ? '#10B981' : '#EF4444',
                        fontSize: 13,
                        fontWeight: 600,
                    }}
                >
                    <RiProhibitedLine size={16} color={iBlocked ? '#10B981' : '#EF4444'} />
                    {iBlocked ? 'Unblock' : 'Block'} @{undefined}
                </button>
            </div>
        </>
    );
}

// ── Blocked profile banner ────────────────────────────────────────────────────
function BlockedBanner({ iBlockedThem, theyBlockedMe, username, onUnblock }) {
    if (theyBlockedMe && !iBlockedThem) {
        return (
            <div
                style={{
                    margin: '24px 16px',
                    padding: '20px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    textAlign: 'center',
                }}
            >
                <RiProhibitedLine size={32} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 15, margin: '0 0 6px' }}>Content unavailable</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>You can't view @{username}'s content.</p>
            </div>
        );
    }
    if (iBlockedThem) {
        return (
            <div
                style={{
                    margin: '24px 16px',
                    padding: '20px',
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: 16,
                    textAlign: 'center',
                }}
            >
                <RiProhibitedLine size={32} color="rgba(239,68,68,0.4)" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 15, margin: '0 0 6px' }}>You've blocked @{username}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
                    Unblock to see their content and interact with their account.
                </p>
                <button
                    onClick={onUnblock}
                    style={{
                        padding: '10px 24px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 999,
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    Unblock
                </button>
            </div>
        );
    }
    return null;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UserProfile({
    profileUser,
    videos,
    products,
    isFollowing: initFollowing,
    isOwnProfile,
    iBlockedThem: initIBlocked = false,
    theyBlockedMe = false,
}) {
    const { auth, flash } = usePage().props;

    const [following, setFollowing] = useState(initFollowing);
    const [followersCount, setFollowersCount] = useState(profileUser.followers_count ?? 0);
    const [activeTab, setActiveTab] = useState('videos');
    const [iBlockedThem, setIBlockedThem] = useState(initIBlocked);
    const [showMenu, setShowMenu] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [showProSheet, setShowProSheet] = useState(false);
    const [showSubSuccess, setShowSubSuccess] = useState(!!flash?.subscription);
    const [showBadgeRoadmap, setShowBadgeRoadmap] = useState(false);
    const [showTrust, setShowTrust] = useState(false)
    const [followsMe, setFollowsMe] = useState(false)
    const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false)
const [showUnblockConfirm, setShowUnblockConfirm] = useState(false)

    // ── Community posts tab state ─────────────────────────────────────────
    const [communityPosts, setCommunityPosts] = useState([]);
    const [communityLoading, setCommunityLoading] = useState(false);
    const [communityLoaded, setCommunityLoaded] = useState(false);
    const [communityPage, setCommunityPage] = useState(1);
    const [communityHasMore, setCommunityHasMore] = useState(true);
    

    // ── Fixed toast — position:fixed so it doesn't shift layout ──────────────
    const [toast, setToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const anyBlock = iBlockedThem || theyBlockedMe;

    const showToast = (msg) => {
        setToastMessage(msg);
        setToast(true);
        setTimeout(() => setToast(false), 2500);
    };

    const handleFollow = async () => {
        if (!auth?.user) {
            router.visit('/login');
            return;
        }
        if (anyBlock) return;
        const next = !following;
        setFollowing(next);
        setFollowersCount((c) => c + (next ? 1 : -1));
        await axios.post(`/api/users/${profileUser.id}/follow`, {}, { withCredentials: true }).catch(() => {
            setFollowing(!next);
            setFollowersCount((c) => c + (next ? -1 : 1));
        });
    };

    const handleFollowClick = () => {
    if (!auth?.user) { router.visit('/login'); return }
    if (anyBlock) return
    if (following) { setShowUnfollowConfirm(true); return }
    handleFollow()
}

const requestBlockToggle = () => {
    setShowMenu(false)
    if (iBlockedThem) setShowUnblockConfirm(true)
    else handleBlock()
}

    // Passed into PostCard so following/unfollowing from a post in the
    // community tab stays in sync with the main profile Follow button —
    // they're literally the same person, so it's the same state.
    const handleCommunityFollowChange = (userId, next) => {
        setFollowing(next);
        setFollowersCount((c) => c + (next ? 1 : -1));
    };

    const loadCommunityPosts = async (reset = false) => {
        if (communityLoading) return;
        if (!reset && !communityHasMore) return;
        setCommunityLoading(true);
        const page = reset ? 1 : communityPage;
        try {
            const { data } = await axios.get(`/api/community/users/${profileUser.id}/posts`, { params: { page } });
            const incoming = data.data ?? [];
            setCommunityPosts((prev) => (reset ? incoming : [...prev, ...incoming]));
            setCommunityHasMore(data.current_page < data.last_page);
            setCommunityPage(reset ? 2 : page + 1);
        } catch {
            // leave whatever was already loaded in place
        } finally {
            setCommunityLoading(false);
            setCommunityLoaded(true);
        }
    };

    const handleTabClick = (key) => {
        setActiveTab(key);
        if (key === 'community' && !communityLoaded) {
            loadCommunityPosts(true);
        }
    };

    const handleCommunityLike = async (post) => {
        const was = post.is_liked_by_me;
        setCommunityPosts((p) =>
            p.map((q) =>
                q.id === post.id
                    ? { ...q, is_liked_by_me: !was, likes_count: was ? Math.max(0, q.likes_count - 1) : q.likes_count + 1 }
                    : q,
            ),
        );
        try {
            const { data } = await axios.post(`/api/community/posts/${post.id}/like`);
            setCommunityPosts((p) => p.map((q) => (q.id === post.id ? { ...q, is_liked_by_me: data.liked, likes_count: data.likes_count } : q)));
        } catch {
            setCommunityPosts((p) => p.map((q) => (q.id === post.id ? { ...q, is_liked_by_me: was, likes_count: post.likes_count } : q)));
        }
    };

    const handleCommunityDelete = async (post) => {
        setCommunityPosts((p) => p.filter((q) => q.id !== post.id));
        try {
            await axios.delete(`/api/community/posts/${post.id}`);
        } catch {
            loadCommunityPosts(true);
        }
    };

    const handleCommunityDismiss = (post) => {
        setCommunityPosts((p) => p.filter((q) => q.id !== post.id));
        axios.post(`/api/community/posts/${post.id}/dismiss`).catch(() => {});
    };

    const handleCommunityBlockAuthor = async () => {
        // Blocking the profile you're currently viewing — reuse the page's
        // own block handler so both stay consistent.
        await handleBlock();
    };

    const handleCommunityReport = (post) => {
        setShowReport(true);
    };

    const handleCommunityViewed = (postId, viewsCount) => {
        setCommunityPosts((p) => p.map((q) => (q.id === postId ? { ...q, views_count: viewsCount } : q)));
    };

    const handleShare = () => {
        const url = `${window.location.origin}/@${profileUser.username}`;
        if (navigator.share) navigator.share({ title: `Check out (@${profileUser.username}) on Flockr  \n Share and dicover quality products on Flockr`, url }).catch(() => {});
        else navigator.clipboard?.writeText(url);
    };

    const copyUsername = () => {
        navigator.clipboard?.writeText(profileUser.username);
        showToast('Username copied!');
    };

    const handleBlock = async () => {
        setShowMenu(false);
        try {
            const { data } = await axios.post(`/api/users/${profileUser.id}/block`);
            setIBlockedThem(data.blocked);
            // If blocking, remove follow state
            if (data.blocked && following) {
                setFollowing(false);
                setFollowersCount((c) => Math.max(0, c - 1));
            }
            // The community feed caches its posts client-side (so returning
            // from a post doesn't refetch) — that cache doesn't know about
            // a block that just happened on THIS page, so without clearing
            // it the blocked person's posts would keep showing there until
            // a hard refresh. Server-side filtering is already correct; this
            // just makes sure the next feed visit actually asks it again.
            if (data.blocked) {
                sessionStorage.removeItem('flockr_community_feed_cache');
            }
        } catch {
            showToast('Failed to update block status. Try again.');
        }
    };

    const handleReport = async (reason) => {
        await axios.post(`/api/users/${profileUser.id}/report`, { reason });
    };

    const tabs = [
        { key: 'videos', label: 'Videos', Icon: RiVideoLine, count: videos?.length ?? 0 },
        ...(profileUser.role === 'seller' ? [{ key: 'products', label: 'Shop', Icon: RiStoreLine, count: products?.length ?? 0 }] : []),
        { key: 'community', label: 'Posts', Icon: RiNewspaperLine, count: null },
    ];

    const totalLikes = videos?.reduce((sum, v) => sum + (v.likes_count ?? 0), 0) ?? 0;
    const avatarSrc =
        profileUser.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.name)}&background=222&color=fff&size=200`;


    useEffect(() => {
    if (isOwnProfile || !auth?.user) return
    axios.get(`/api/users/${profileUser.id}/relationship`)
        .then(({ data }) => setFollowsMe(data.they_follow_me))
        .catch(() => {})
}, [profileUser.id])

    return (
        <>
            <Head title={`${profileUser.name} (@${profileUser.username})`} />

        {showReport && <ReportModal user={profileUser} onClose={() => setShowReport(false)} onSubmit={handleReport} />}

        {showSubSuccess && flash?.subscription && (
             <SubscriptionSuccessSheet subscription={flash.subscription} onClose={() => setShowSubSuccess(false)} />
        )}

        {showProSheet && <ProPlansSheet onClose={() => setShowProSheet(false)} />}

        {showBadgeRoadmap && <BadgeRoadmapSheet onClose={() => setShowBadgeRoadmap(false)} />}

        {showTrust && <TrustScoreModal sellerId={profileUser.id} onClose={() => setShowTrust(false)} />}

 
{showUnfollowConfirm && (
    <ConfirmModal
        title={`Unfollow @${profileUser.username}?`}
        message="You'll stop seeing their videos and posts in your feed. And you won't be able to purchase or send them messages."
        confirmLabel="Unfollow"
        cancelLabel="Cancel"
        danger
        onConfirm={() => { setShowUnfollowConfirm(false); handleFollow() }}
        onClose={() => setShowUnfollowConfirm(false)}
    />
)}
{showUnblockConfirm && (
    <ConfirmModal
        title={`Unblock @${profileUser.username}?`}
        message="They'll be able to see your profile, follow you, and message you again."
        confirmLabel="Unblock"
        cancelLabel="Cancel"
        onConfirm={() => { setShowUnblockConfirm(false); handleBlock() }}
        onClose={() => setShowUnblockConfirm(false)}
    />
)}

            {/* ── Fixed toast — does NOT shift layout ────────────────────── */}
            <div
                style={{
                    position: 'fixed',
                    bottom: 80,
                    left: '50%',
                    transform: `translateX(-50%) translateY(${toast ? 0 : 20}px)`,
                    zIndex: 500,
                    pointerEvents: 'none',
                    opacity: toast ? 1 : 0,
                    transition: 'opacity 0.25s ease, transform 0.25s ease',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 999,
                        padding: '10px 18px',
                        whiteSpace: 'nowrap',
                    }}
                >
                    <FiLink size={13} color="#FF6B35" />
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{toastMessage}</span>
                </div>
            </div>

            <style>{`
                .vgrid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 2px;
                }
                @media (min-width: 641px)  { .vgrid { grid-template-columns: repeat(4, 1fr); } }
                @media (min-width: 900px)  { .vgrid { grid-template-columns: repeat(5, 1fr); } }
                @media (min-width: 1100px) { .vgrid { grid-template-columns: repeat(6, 1fr); } }
                .vthumb:hover .vplay { opacity: 1 !important; }
                .vthumb img { transition: transform 0.3s ease; }
                .vthumb:hover img { transform: scale(1.04); }
                .profile-stat:hover { opacity: 0.75; }
            `}</style>

            <div style={{ minHeight: '100%', background: '#121212', color: '#fff', fontFamily: 'var(--font-body)' }}>
                {/* Back button */}
                <button onClick={() => window.history.back()} className="p-4" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>

                {/* ═══ DESKTOP HEADER ════════════════════════════════════════ */}
                <div className="hidden md:block" style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 32px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, marginBottom: 24 }}>
                        {/* Avatar */}
                        <div style={{ flexShrink: 0, position: 'relative' }}>
                           <div style={{ border: "1px solid var(--flockr-subtle)" }} className='h-[120px] w-[120px] block rounded-full'>
                             <img
                                src={avatarSrc}
                                alt={profileUser.name}
                                style={{
                                    width: 116,
                                    height: 116,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    display: 'block',
                                    filter: anyBlock ? 'grayscale(1) opacity(0.5)' : 'none',
                                }}
                            />
                           </div>
                            {anyBlock && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <RiProhibitedLine size={36} color="rgba(255,255,255,0.5)" />
                                </div>
                            )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                        {profileUser.name && (
                                            <p style={{ color: '#fff', fontSize: 28, fontWeight: 600, margin: '0 0 4px' }}>{profileUser.name}</p>
                                        )}
                                      
<VerifiedBadge type={profileUser.verification_type} size={20} />
                                        {isOwnProfile && profileUser.role === 'seller' && (
    profileUser.has_active_subscription ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 999, color: '#3B82F6', fontSize: 12, fontWeight: 700 }}>
            <RiVerifiedBadgeLine size={13} /> Verified Pro
        </span>
    ) : (
        <button onClick={() => setShowProSheet(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 999, color: '#3B82F6', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <RiVerifiedBadgeLine size={13} /> Get Verified
        </button>
    )
)}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '0 0 6px' }}>
    <p onClick={copyUsername} style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0, cursor: 'pointer' }}>
        @{profileUser.username}
    </p>

    {!isOwnProfile && profileUser.role === 'seller' && !anyBlock && (
        <button
            onClick={() => setShowTrust(true)}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(255,107,53,0.1)',
                border: '1px solid rgba(255,107,53,0.3)',
                color: '#FF6B35',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
            }}
        >
            <RiShieldCheckLine size={12} /> Trust Score
        </button>
    )}
</div>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                                {isOwnProfile ? (
                                    <>
                                        <Link href="/settings/profile" style={outlineBtn}>
                                            Edit profile
                                        </Link>
                                        {isOwnProfile && profileUser.role === 'buyer' && (
    <Link href="/become-seller" method="post" as="button" style={outlineBtn}>
        <RiStoreLine size={14} /> Start Selling
    </Link>
)}
                                        {profileUser.role === 'seller' && (
                                            <Link href="/seller/upload" style={outlineBtn}>
                                                <RiUploadCloud2Line size={14} /> Upload
                                            </Link>
                                        )}
                                        <Link href="/settings/profile" style={iconBtn}>
                                            <RiSettings4Line size={16} color="#fff" />
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        {!anyBlock && auth?.user?.role !== 'admin' && (
                                            <button onClick={handleFollowClick} style={following ? followingBtn : primaryBtn}>
    {following ? (
    followsMe
        ? <><RiUserFollowLine size={14} /> Flock Mate</>
        : <><RiUserFollowLine size={14} /> Following</>
) : followsMe ? (
    <><RiUserFollowLine size={14} /> Follow Back</>
) : (
    <><RiUserAddLine size={14} /> Follow</>
)}
</button>
                                        )}
                                        {!anyBlock && (
                                            <Link href={`/inbox?user=${profileUser.id}`} style={outlineBtn}>
                                                <RiMessage2Line size={14} /> Message
                                            </Link>
                                        )}
                                        <button onClick={handleShare} style={iconBtn}>
                                            <RiShareForwardLine size={16} color="#fff" />
                                        </button>
                                        
                                        {/* 3-dot menu with block + report */}
                                        {auth?.user && (
                                            <div style={{ position: 'relative' }}>
                                                <button onClick={() => setShowMenu((m) => !m)} style={iconBtn}>
                                                    <RiMoreLine size={16} color="#fff" />
                                                </button>
                                                {showMenu && (
                                                    <ProfileMenu
                                                        iBlocked={iBlockedThem}
                                                        onBlock={requestBlockToggle}
                                                        onReport={() => {
                                                            setShowMenu(false);
                                                            setShowReport(true);
                                                        }}
                                                        onClose={() => setShowMenu(false)}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Stats */}
                            <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
                                {[
                                    {
                                        label: 'Following',
                                        value: profileUser.following_count ?? 0,
                                        href: anyBlock ? null : `/@${profileUser.username}/following`,
                                    },
                                    { label: 'Followers', value: followersCount, href: anyBlock ? null : `/@${profileUser.username}/followers` },
                                    { label: 'Likes', value: totalLikes },
                                ].map((s) => {
                                    const el = (
                                        <div style={{ marginRight: 20 }}>
                                            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', display: 'block', letterSpacing: '-0.3px' }}>
                                                {fmtCount(s.value)}
                                            </span>
                                            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{s.label}</span>
                                        </div>
                                    );
                                    return s.href ? (
                                        <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }} className="profile-stat">
                                            {el}
                                        </Link>
                                    ) : (
                                        <div key={s.label} className="profile-stat">
                                            {el}
                                        </div>
                                    );
                                })}
                            </div>

                            {!anyBlock && profileUser.bio && (
                                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.6, margin: '0 0 6px', maxWidth: 500 }}>
                                    {profileUser.bio}
                                </p>
                            )}
                            {!anyBlock && profileUser.location && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <RiMapPinLine size={13} color="rgba(255,255,255,0.4)" />
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{profileUser.location}</span>
                                </div>
                            )}
                            {!isOwnProfile && !anyBlock && <MutualFriendsRow profileUserId={profileUser.id} />}
                            <BadgesDisplay badges={profileUser.badges} />
                            {isOwnProfile && (
                                    <button onClick={() => setShowBadgeRoadmap(true)} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontSize: 12, fontWeight: 600, padding: 0 }}>
                                 View all badges & progress →
                                    </button>
                            )}
                            <LevelStreakChip gamification={profileUser.gamification} />
                        </div>
                    </div>
                </div>

                {/* ═══ MOBILE HEADER ═════════════════════════════════════════ */}
                <div className="md:hidden" style={{ padding: '0 16px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{ border: "2px solid var(--flockr-subtle)" }} className='h-[84px] w-[84px] block rounded-full'>
                             <img
                                src={avatarSrc}
                                alt={profileUser.name}
                                style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    display: 'block',
                                    filter: anyBlock ? 'grayscale(1) opacity(0.5)' : 'none',
                                }}
                            />
                           </div>
                            {anyBlock && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <RiProhibitedLine size={28} color="rgba(255,255,255,0.5)" />
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', flex: 1, justifyContent: 'space-around' }}>
                           {[
    {
        label: 'Following',
        value: profileUser.following_count ?? 0,
        href: anyBlock ? null : `/@${profileUser.username}/following`,
    },
    {
        label: 'Followers',
        value: followersCount,
        href: anyBlock ? null : `/@${profileUser.username}/followers`,
    },
    {
        label: 'Likes',
        value: totalLikes,
        href: null,
    },
].map((s) => {
    const content = (
        <div style={{ textAlign: 'center' }}>
            <p
                style={{
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 16,
                    margin: 0,
                }}
            >
                {fmtCount(s.value)}
            </p>

            <p
                style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 12,
                    margin: '2px 0 0',
                }}
            >
                {s.label}
            </p>
        </div>
    );

    return s.href ? (
        <Link
            key={s.label}
            href={s.href}
            style={{
                textDecoration: 'none',
                flex: 1,
            }}
        >
            {content}
        </Link>
    ) : (
        <div
            key={s.label}
            style={{
                flex: 1,
            }}
        >
            {content}
        </div>
    );
})}
                        </div>
                    </div>

                    {!anyBlock && (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{profileUser.name}</p>
                                
<VerifiedBadge type={profileUser.verification_type} size={14} />
                                {isOwnProfile && profileUser.role === 'seller' && (
    profileUser.has_active_subscription ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 999, color: '#3B82F6', fontSize: 12, fontWeight: 700 }}>
            <RiVerifiedBadgeLine size={13} /> Verified Pro
        </span>
    ) : (
        <button onClick={() => setShowProSheet(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 999, color: '#3B82F6', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <RiVerifiedBadgeLine size={13} /> Get Verified
        </button>
    )
)}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '0 0 6px' }}>
    <p onClick={copyUsername} style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0, cursor: 'pointer' }}>
        @{profileUser.username}
    </p>

    {!isOwnProfile && profileUser.role === 'seller' && !anyBlock && (
        <button
            onClick={() => setShowTrust(true)}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(255,107,53,0.1)',
                border: '1px solid rgba(255,107,53,0.3)',
                color: '#FF6B35',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
            }}
        >
            <RiShieldCheckLine size={12} /> Trust Score
        </button>
    )}
</div>
                            {profileUser.bio && (
                                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{profileUser.bio}</p>
                            )}
                            {profileUser.location && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                                    <RiMapPinLine size={12} color="rgba(255,255,255,0.35)" />
                                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{profileUser.location}</span>
                                </div>
                            )}
                            {!isOwnProfile && !anyBlock && <MutualFriendsRow profileUserId={profileUser.id} />}
                            <BadgesDisplay badges={profileUser.badges} />
                            {isOwnProfile && (
                                <button onClick={() => setShowBadgeRoadmap(true)} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B35', fontSize: 12, fontWeight: 600, padding: 0 }}>
                                    View all badges & progress →
                                </button>
                            )}
                            <LevelStreakChip gamification={profileUser.gamification} />
                        </div>
                    )}

                    {/* Mobile action buttons */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                        {isOwnProfile ? (
                            <>
                                <Link href="/settings/profile" style={{ ...outlineBtn, flex: 1, justifyContent: 'center' }}>
                                    Edit profile
                                </Link>
                                {isOwnProfile && profileUser.role === 'buyer' && (
                                <Link href="/become-seller" method="post" as="button" style={outlineBtn}>
                                <RiStoreLine size={14} /> Start Selling
                                </Link>
                                )}
                                {profileUser.role === 'seller' && (
                                    <Link href="/seller/upload" style={iconBtn}>
                                        <RiUploadCloud2Line size={16} color="#fff" />
                                    </Link>
                                )}
                                
                                <Link href="/settings/profile" style={iconBtn}>
                                    <RiSettings4Line size={16} color="#fff" />
                                </Link>
                            </>
                        ) : (
                            <>
                                {!anyBlock && (
                                  
<button onClick={handleFollowClick} style={{ ...(following ? followingBtn : primaryBtn), flex: 1, justifyContent: 'center' }}>
    {following ? (followsMe ? 'Flock Mate' : 'Following') : followsMe ? 'Follow Back' : 'Follow'}
</button>
                                )}
                                {!anyBlock && (
                                    <Link href={`/inbox?user=${profileUser.id}`} style={{ ...outlineBtn, flex: 1, justifyContent: 'center' }}>
                                        <RiMessage2Line size={14} /> Message
                                    </Link>
                                )}
                                <button onClick={handleShare} style={iconBtn}>
                                    <RiShareForwardLine size={16} color="#fff" />
                                </button>
                                
                                {/* Mobile 3-dot menu */}
                                {auth?.user && (
                                    <div style={{ position: 'relative' }}>
                                        <button onClick={() => setShowMenu((m) => !m)} style={iconBtn}>
                                            <RiMoreLine size={16} color="#fff" />
                                        </button>
                                        {showMenu && (
                                            <ProfileMenu
                                                iBlocked={iBlockedThem}
                                                onBlock={requestBlockToggle}
                                                onReport={() => {
                                                    setShowMenu(false);
                                                    setShowReport(true);
                                                }}
                                                onClose={() => setShowMenu(false)}
                                            />
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* ═══ BLOCKED STATE BANNER ══════════════════════════════════ */}
                <BlockedBanner iBlockedThem={iBlockedThem} theyBlockedMe={theyBlockedMe} username={profileUser.username} onUnblock={() => setShowUnblockConfirm(true)} />

                {/* ═══ TABS (only show when not blocked) ════════════════════ */}
                {!anyBlock && (
                    <>
                        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', marginTop: 8 }}>
                            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px', display: 'flex' }}>
                                {tabs.map(({ key, label, Icon }) => {
                                    const active = activeTab === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => handleTabClick(key)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                padding: '14px 16px 13px 0',
                                                marginRight: 8,
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: active ? '#fff' : 'rgba(255,255,255,0.35)',
                                                fontSize: 15,
                                                fontWeight: active ? 700 : 500,
                                                borderBottom: active ? '2px solid #fff' : '2px solid transparent',
                                                marginBottom: -1,
                                                transition: 'color 0.15s',
                                            }}
                                        >
                                            <Icon size={17} /> {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ═══ TAB CONTENT ═══════════════════════════════════ */}
                        <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 80 }}>
                            {activeTab === 'videos' &&
                                (videos?.length > 0 ? (
                                    <div className="vgrid">
                                        {videos.map((video) => (
                                            <Link
                                                key={video.id}
                                                href={`/@${video.user?.username}/video/${video.ulid}`}
                                                className="vthumb"
                                                style={{
                                                    position: 'relative',
                                                    aspectRatio: '9/16',
                                                    display: 'block',
                                                    background: '#1a1a1a',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                {video.thumbnail_url_full ? (
                                                    <img
                                                        src={video.thumbnail_url_full}
                                                        alt={video.title}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: '#1a1a1a',
                                                        }}
                                                    >
                                                        <RiVideoLine size={24} color="rgba(255,255,255,0.1)" />
                                                    </div>
                                                )}
                                                <div
                                                    className="vplay"
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        background: 'rgba(0,0,0,0.25)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        opacity: 0,
                                                        transition: 'opacity 0.2s',
                                                    }}
                                                >
                                                    <RiPlayFill size={36} color="rgba(255,255,255,0.9)" />
                                                </div>
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: '40%',
                                                        background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                                                        pointerEvents: 'none',
                                                    }}
                                                />
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: 7,
                                                        left: 7,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 2,
                                                    }}
                                                >
                                                    <RiPlayLine size={14} color="rgba(255,255,255,0.9)" />
                                                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 700 }}>
                                                        {fmtCount(video.views_count)}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        Icon={RiVideoLine}
                                        title={isOwnProfile ? 'No videos yet' : `${profileUser.name} hasn't uploaded yet`}
                                        sub={isOwnProfile ? 'Upload your first video to start selling' : 'Check back later'}
                                        cta={isOwnProfile && profileUser.role === 'seller' ? { label: 'Upload Video', href: '/seller/upload' } : null}
                                    />
                                ))}

                            {activeTab === 'products' &&
                                (products?.length > 0 ? (
                                    <div
                                        style={{
                                            padding: '16px',
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                            gap: 12,
                                        }}
                                    >
                                        {products.map((p) => (
                                            <ProductCard key={p.id} product={p} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        Icon={RiStoreLine}
                                        title="No products listed"
                                        sub={isOwnProfile ? 'Add your first product' : `${profileUser.name} hasn't listed products yet`}
                                        cta={isOwnProfile ? { label: 'Add Product', href: '/seller/products/create' } : null}
                                    />
                                ))}

                            {activeTab === 'community' && (
                                <div>
                                    {communityLoading && communityPosts.length === 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                                            <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'profileSpin 0.8s linear infinite' }} />
                                        </div>
                                    )}

                                    {!communityLoading && communityLoaded && communityPosts.length === 0 && (
                                        <EmptyState
                                            Icon={RiNewspaperLine}
                                            title={isOwnProfile ? "You haven't posted yet" : `${profileUser.name} hasn't posted yet`}
                                            sub={isOwnProfile ? 'Share something with the community' : 'Check back later'}
                                            cta={isOwnProfile ? { label: 'Go to Community', href: '/community' } : null}
                                        />
                                    )}

                                    {communityPosts.map((post) => (
                                        <PostCard
                                            key={post.id}
                                            post={post}
                                            auth={auth}
                                            showToast={showToast}
                                            onDelete={handleCommunityDelete}
                                            onLike={handleCommunityLike}
                                            onDismiss={handleCommunityDismiss}
                                            onBlockAuthor={handleCommunityBlockAuthor}
                                            onReport={handleCommunityReport}
                                            isFollowingAuthor={following}
                                            onFollowChange={handleCommunityFollowChange}
                                            onViewed={handleCommunityViewed}
                                        />
                                    ))}

                                    {communityHasMore && communityPosts.length > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                                            <button
                                                onClick={() => loadCommunityPosts(false)}
                                                disabled={communityLoading}
                                                style={{ padding: '8px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}
                                            >
                                                {communityLoading ? 'Loading…' : 'Load more'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <style>{`@keyframes profileSpin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
}

UserProfile.layout = (page) => <AppLayout>{page}</AppLayout>;

// ── Sub-components ────────────────────────────────────────────────────────────
function EmptyState({ Icon, title, sub, cta }) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px 32px',
                gap: 12,
                textAlign: 'center',
            }}
        >
            <div
                style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Icon size={26} color="rgba(255,255,255,0.2)" />
            </div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{title}</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0, maxWidth: 240, lineHeight: 1.6 }}>{sub}</p>
            {cta && (
                <Link
                    href={cta.href}
                    style={{
                        marginTop: 8,
                        padding: '10px 24px',
                        background: '#FF6B35',
                        borderRadius: 999,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        textDecoration: 'none',
                    }}
                >
                    {cta.label}
                </Link>
            )}
        </div>
    );
}

function fmtCount(n) {
    const num = Number(n ?? 0);
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return String(num);
}

const primaryBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 20px',
    borderRadius: 4,
    background: '#FF6B35',
    border: 'none',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
};
const followingBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 20px',
    borderRadius: 4,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
};
const outlineBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 4,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
};
const iconBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 4,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.25)',
    cursor: 'pointer',
    textDecoration: 'none',
    flexShrink: 0,
};