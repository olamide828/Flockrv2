import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import {
    RiAlertLine,
    RiArrowRightLine,
    RiBarChart2Line,
    RiCheckboxCircleLine,
    RiCloseCircleLine,
    RiCloseLine,
    RiEyeLine,
    RiGroupLine,
    RiLoader4Line,
    RiMoneyDollarCircleLine,
    RiPlayCircleLine,
    RiProhibitedLine,
    RiShieldLine,
    RiShoppingBagLine,
    RiStarLine,
    RiStoreLine,
    RiTimeLine,
    RiUserLine,
    RiVerifiedBadgeLine,
    RiVideoLine,
} from 'react-icons/ri';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
}

function statusColor(status) {
    const map = {
        pending: { bg: 'rgba(234,179,8,0.12)', text: '#EAB308' },
        paid: { bg: 'rgba(16,185,129,0.12)', text: '#10B981' },
        processing: { bg: 'rgba(139,92,246,0.12)', text: '#8B5CF6' },
        shipped: { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6' },
        delivered: { bg: 'rgba(16,185,129,0.12)', text: '#10B981' },
        cancelled: { bg: 'rgba(239,68,68,0.12)', text: '#EF4444' },
        refunded: { bg: 'rgba(156,163,175,0.12)', text: '#9CA3AF' },
        disputed: { bg: 'rgba(249,115,22,0.12)', text: '#F97316' },
    };
    return map[status] ?? { bg: 'rgba(255,255,255,0.08)', text: '#fff' };
}

function StatusPill({ status }) {
    const { bg, text } = statusColor(status);
    return (
        <span
            style={{
                background: bg,
                color: text,
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
            }}
        >
            {status}
        </span>
    );
}

// ── Reject modal ──────────────────────────────────────────────────────────────
function RejectModal({ video, onClose, onConfirm }) {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!reason.trim()) return;
        setLoading(true);
        await onConfirm(video, reason);
        setLoading(false);
        onClose();
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
            }}
        >
            <div
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 440 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Reject Video</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: 'none',
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                            cursor: 'pointer',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <RiCloseLine size={18} />
                    </button>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 16 }}>
                    Rejecting <strong style={{ color: '#fff' }}>{video?.title || 'this video'}</strong> by{' '}
                    <strong style={{ color: '#fff' }}>@{video?.user?.username}</strong>. Please provide a reason — this will be visible to the seller.
                </p>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Content violates community guidelines..."
                    rows={3}
                    style={{
                        width: '100%',
                        background: '#0a0a0a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        color: '#fff',
                        fontSize: 14,
                        padding: '12px 14px',
                        resize: 'none',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 999,
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: 13,
                            cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={!reason.trim() || loading}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'rgba(239,68,68,0.9)',
                            border: 'none',
                            borderRadius: 999,
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            opacity: !reason.trim() || loading ? 0.5 : 1,
                        }}
                    >
                        {loading ? 'Rejecting…' : 'Reject Video'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminDashboard({ stats, recentUsers, pendingVideos, flaggedOrders, recentOrders }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [rejectTarget, setRejectTarget] = useState(null);
    const [toastMsg, setToastMsg] = useState(null);
    const [userList, setUserList] = useState(recentUsers ?? []);
    const [videoList, setVideoList] = useState(pendingVideos ?? []);

    const toast = (msg, type = 'success') => {
        setToastMsg({ msg, type });
        setTimeout(() => setToastMsg(null), 3000);
    };

    const apiCall = async (fn, successMsg) => {
        try {
            await fn();
            toast(successMsg);
            router.reload({ only: ['stats', 'recentUsers', 'pendingVideos', 'flaggedOrders', 'recentOrders'] });
        } catch (err) {
            toast(err.response?.data?.message ?? 'Something went wrong.', 'error');
        }
    };

    const verifyUser = (user) =>
        apiCall(() => axios.post(`/api/admin/users/${user.id}/verify`), `@${user.username} ${user.is_verified ? 'unverified' : 'verified'}.`);

    const suspendUser = (user) =>
        apiCall(() => axios.post(`/api/admin/users/${user.id}/suspend`), `@${user.username} ${user.is_active ? 'suspended' : 'unsuspended'}.`);

    const approveVideo = (video) => apiCall(() => axios.post(`/api/admin/videos/${video.ulid}/approve`), 'Video approved and published.');

    const rejectVideo = async (video, reason) => {
        await apiCall(() => axios.post(`/api/admin/videos/${video.ulid}/reject`, { reason }), 'Video rejected.');
    };

    const TABS = [
        { key: 'overview', label: 'Overview', Icon: RiBarChart2Line },
        { key: 'users', label: 'Users', Icon: RiGroupLine },
        { key: 'videos', label: 'Videos', Icon: RiVideoLine, badge: pendingVideos?.length },
        { key: 'orders', label: 'Orders', Icon: RiShoppingBagLine, badge: flaggedOrders?.length },
    ];

    return (
        <>
            <Head title="Admin Panel" />

            {/* Toast */}
            {toastMsg && (
                <div
                    style={{
                        position: 'fixed',
                        top: 20,
                        right: 20,
                        zIndex: 99999,
                        background: toastMsg.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(16,185,129,0.95)',
                        color: '#fff',
                        padding: '12px 20px',
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 600,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        animation: 'slideIn 0.2s ease',
                    }}
                >
                    {toastMsg.msg}
                </div>
            )}

            {/* Reject modal */}
            {rejectTarget && <RejectModal video={rejectTarget} onClose={() => setRejectTarget(null)} onConfirm={rejectVideo} />}

            <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', overflowY: 'auto' }}>
                {/* Header */}
                <div
                    style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 30,
                        background: 'rgba(10,10,10,0.92)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        padding: '0 24px',
                    }}
                >
                    <div
                        style={{
                            maxWidth: 1200,
                            margin: '0 auto',
                            height: 64,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 12,
                                    background: 'rgba(255,92,0,0.15)',
                                    border: '1px solid rgba(255,92,0,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <RiShieldLine size={18} color="#ff5c00" />
                            </div>
                            <div>
                                <h1 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Admin Panel</h1>
                                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>Flockr Platform Management</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'rgba(16,185,129,0.12)',
                                    border: '1px solid rgba(16,185,129,0.25)',
                                    borderRadius: 999,
                                    padding: '5px 12px',
                                }}
                            >
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
                                <span style={{ color: '#10B981', fontSize: 12, fontWeight: 600 }}>Platform Healthy</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab strip */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
                        {TABS.map(({ key, label, Icon, badge }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 7,
                                    padding: '14px 16px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: activeTab === key ? '#fff' : 'rgba(255,255,255,0.4)',
                                    fontSize: 13,
                                    fontWeight: activeTab === key ? 600 : 400,
                                    borderBottom: activeTab === key ? '2px solid #ff5c00' : '2px solid transparent',
                                    marginBottom: -1,
                                    whiteSpace: 'nowrap',
                                    transition: 'color 0.15s',
                                    flexShrink: 0,
                                }}
                            >
                                <Icon size={16} color={activeTab === key ? '#ff5c00' : 'rgba(255,255,255,0.4)'} />
                                {label}
                                {badge > 0 && (
                                    <span
                                        style={{
                                            background: '#ff5c00',
                                            color: '#fff',
                                            fontSize: 10,
                                            fontWeight: 800,
                                            borderRadius: 999,
                                            padding: '1px 6px',
                                            minWidth: 18,
                                            textAlign: 'center',
                                        }}
                                    >
                                        {badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 100px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* ══ OVERVIEW ══════════════════════════════════════════════ */}
                    {activeTab === 'overview' && (
                        <>
                            {/* KPI grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                                {[
                                    { label: 'Total Users', value: fmt(stats?.total_users), Icon: RiGroupLine, color: '#3B82F6' },
                                    { label: 'Active Sellers', value: fmt(stats?.total_sellers), Icon: RiStoreLine, color: '#ff5c00' },
                                    {
                                        label: 'GMV (30d)',
                                        value: `₦${Number(stats?.gmv_30d ?? 0).toLocaleString()}`,
                                        Icon: RiMoneyDollarCircleLine,
                                        color: '#10B981',
                                    },
                                    { label: 'Active Videos', value: fmt(stats?.total_videos), Icon: RiVideoLine, color: '#8B5CF6' },
                                    { label: 'Total Orders', value: fmt(stats?.total_orders), Icon: RiShoppingBagLine, color: '#F59E0B' },
                                    {
                                        label: 'Total Revenue',
                                        value: `₦${Number(stats?.revenue_total ?? 0).toLocaleString()}`,
                                        Icon: RiBarChart2Line,
                                        color: '#10B981',
                                    },
                                    { label: 'Products Live', value: fmt(stats?.total_products), Icon: RiStarLine, color: '#EC4899' },
                                    {
                                        label: 'Queue Size',
                                        value: stats?.queue_size ?? 0,
                                        Icon: RiLoader4Line,
                                        color: stats?.queue_size > 50 ? '#EF4444' : 'rgba(255,255,255,0.5)',
                                    },
                                ].map(({ label, value, Icon, color }) => (
                                    <div
                                        key={label}
                                        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 20 }}
                                    >
                                        <div
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 12,
                                                background: `${color}18`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginBottom: 14,
                                            }}
                                        >
                                            <Icon size={20} color={color} />
                                        </div>
                                        <p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
                                            {value}
                                        </p>
                                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0 }}>{label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Today's activity */}
                            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, overflow: 'hidden' }}>
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>Today's Activity</p>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                                    {[
                                        { label: 'New Users', value: stats?.new_users_today ?? 0, Icon: RiUserLine, color: '#3B82F6' },
                                        { label: 'Videos Uploaded', value: stats?.videos_today ?? 0, Icon: RiVideoLine, color: '#8B5CF6' },
                                        { label: 'Orders Placed', value: stats?.orders_today ?? 0, Icon: RiShoppingBagLine, color: '#F59E0B' },
                                        { label: 'Pending Videos', value: stats?.pending_videos ?? 0, Icon: RiTimeLine, color: '#EAB308' },
                                        {
                                            label: 'Failed Jobs',
                                            value: stats?.failed_video_jobs ?? 0,
                                            Icon: RiAlertLine,
                                            color: stats?.failed_video_jobs > 0 ? '#EF4444' : 'rgba(255,255,255,0.3)',
                                        },
                                        { label: 'New Users (7d)', value: stats?.new_users_7d ?? 0, Icon: RiGroupLine, color: '#10B981' },
                                    ].map(({ label, value, Icon, color }) => (
                                        <div
                                            key={label}
                                            style={{
                                                padding: '16px 20px',
                                                borderRight: '1px solid rgba(255,255,255,0.04)',
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                            }}
                                        >
                                            <Icon size={18} color={color} />
                                            <div>
                                                <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>{value}</p>
                                                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '2px 0 0' }}>{label}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent orders */}
                            {recentOrders?.length > 0 && (
                                <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, overflow: 'hidden' }}>
                                    <div
                                        style={{
                                            padding: '16px 20px',
                                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>Recent Orders</p>
                                        <button
                                            onClick={() => setActiveTab('orders')}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#ff5c00',
                                                fontSize: 13,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                            }}
                                        >
                                            View all <RiArrowRightLine size={14} />
                                        </button>
                                    </div>
                                    <div>
                                        {recentOrders.slice(0, 6).map((order, i) => (
                                            <div
                                                key={order.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 14,
                                                    padding: '14px 20px',
                                                    borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                                }}
                                            >
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{order.reference}</p>
                                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '2px 0 0' }}>
                                                        {order.buyer?.name} → {order.seller?.name}
                                                    </p>
                                                </div>
                                                <strong style={{ color: '#ff5c00', fontSize: 14 }}>₦{Number(order.total).toLocaleString()}</strong>
                                                <StatusPill status={order.status} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ══ USERS ═════════════════════════════════════════════════ */}
                    {activeTab === 'users' && (
                        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, overflow: 'hidden' }}>
                            <div
                                style={{
                                    padding: '16px 20px',
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>Recent Users</p>
                                <Link
                                    href="/admin/users"
                                    style={{ color: '#ff5c00', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                                >
                                    View all <RiArrowRightLine size={14} />
                                </Link>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                            {['User', 'Role', 'Joined', 'Status', 'Actions'].map((h) => (
                                                <th
                                                    key={h}
                                                    style={{
                                                        padding: '10px 20px',
                                                        textAlign: 'left',
                                                        color: 'rgba(255,255,255,0.35)',
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.06em',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userList.map((user, i) => (
                                            <tr
                                                key={user.id}
                                                style={{ borderBottom: i < userList.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                                            >
                                                <td style={{ padding: '12px 20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <img
                                                            src={
                                                                user.avatar_url ??
                                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1a1a1a`
                                                            }
                                                            alt={user.name}
                                                            style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                                        />
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                                <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{user.name}</p>
                                                                {user.is_verified && <RiVerifiedBadgeLine size={13} color="#ff5c00" />}
                                                            </div>
                                                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '2px 0 0' }}>
                                                                @{user.username}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 20px' }}>
                                                    <span
                                                        style={{
                                                            background:
                                                                user.role === 'seller'
                                                                    ? 'rgba(255,92,0,0.12)'
                                                                    : user.role === 'admin'
                                                                      ? 'rgba(139,92,246,0.12)'
                                                                      : 'rgba(255,255,255,0.06)',
                                                            color:
                                                                user.role === 'seller'
                                                                    ? '#ff5c00'
                                                                    : user.role === 'admin'
                                                                      ? '#8B5CF6'
                                                                      : 'rgba(255,255,255,0.5)',
                                                            padding: '3px 10px',
                                                            borderRadius: 999,
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            textTransform: 'capitalize',
                                                        }}
                                                    >
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td
                                                    style={{
                                                        padding: '12px 20px',
                                                        color: 'rgba(255,255,255,0.4)',
                                                        fontSize: 12,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {new Date(user.created_at).toLocaleDateString('en-NG', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </td>
                                                <td style={{ padding: '12px 20px' }}>
                                                    <span
                                                        style={{
                                                            background: user.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                                            color: user.is_active ? '#10B981' : '#EF4444',
                                                            padding: '3px 10px',
                                                            borderRadius: 999,
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {user.is_active ? (user.is_verified ? 'Verified' : 'Active') : 'Suspended'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        {!user.is_verified && user.role === 'seller' && (
                                                            <button
                                                                onClick={() => verifyUser(user)}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    color: '#10B981',
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 3,
                                                                }}
                                                            >
                                                                <RiCheckboxCircleLine size={14} /> Verify
                                                            </button>
                                                        )}
                                                        {user.is_verified && (
                                                            <button
                                                                onClick={() => verifyUser(user)}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    color: 'rgba(255,255,255,0.35)',
                                                                    fontSize: 12,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 3,
                                                                }}
                                                            >
                                                                <RiCloseCircleLine size={14} /> Unverify
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => suspendUser(user)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                color: user.is_active ? '#EF4444' : '#10B981',
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 3,
                                                            }}
                                                        >
                                                            <RiProhibitedLine size={14} /> {user.is_active ? 'Suspend' : 'Unsuspend'}
                                                        </button>
                                                        <Link
                                                            href={`/admin/users/${user.id}`}
                                                            style={{
                                                                color: 'rgba(255,255,255,0.35)',
                                                                fontSize: 12,
                                                                textDecoration: 'none',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 3,
                                                            }}
                                                        >
                                                            <RiEyeLine size={14} /> View
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ══ VIDEOS ════════════════════════════════════════════════ */}
                    {activeTab === 'videos' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
                                    {videoList?.length ?? 0} videos pending review
                                </p>
                            </div>

                            {!videoList || videoList.length === 0 ? (
                                <div
                                    style={{
                                        textAlign: 'center',
                                        padding: '80px 24px',
                                        background: '#111',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: 18,
                                    }}
                                >
                                    <RiCheckboxCircleLine size={48} color="rgba(16,185,129,0.4)" style={{ margin: '0 auto 16px' }} />
                                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>All clear!</p>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>No videos pending moderation.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                                    {videoList.map((video) => (
                                        <div
                                            key={video.id}
                                            style={{
                                                background: '#111',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                borderRadius: 18,
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {/* Thumbnail */}
                                            <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0a0a0a' }}>
                                                {video.thumbnail_url_full ? (
                                                    <img
                                                        src={video.thumbnail_url_full}
                                                        alt=""
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
                                                        <RiPlayCircleLine size={40} color="rgba(255,255,255,0.2)" />
                                                    </div>
                                                )}
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        top: 8,
                                                        left: 8,
                                                        background: 'rgba(0,0,0,0.7)',
                                                        borderRadius: 6,
                                                        padding: '3px 8px',
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        color: '#EAB308',
                                                    }}
                                                >
                                                    PENDING
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div style={{ padding: 16 }}>
                                                <p
                                                    style={{
                                                        color: '#fff',
                                                        fontSize: 13,
                                                        fontWeight: 600,
                                                        margin: '0 0 4px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {video.title || 'Untitled Video'}
                                                </p>
                                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 12px' }}>
                                                    @{video.user?.username}
                                                    {video.duration_seconds > 0 && ` · ${(video.duration_seconds / 60).toFixed(1)}min`}
                                                </p>

                                                {video.description && (
                                                    <p
                                                        style={{
                                                            color: 'rgba(255,255,255,0.35)',
                                                            fontSize: 12,
                                                            margin: '0 0 12px',
                                                            lineHeight: 1.5,
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                        }}
                                                    >
                                                        {video.description}
                                                    </p>
                                                )}

                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button
                                                        onClick={() => approveVideo(video)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px',
                                                            background: 'rgba(16,185,129,0.15)',
                                                            border: '1px solid rgba(16,185,129,0.3)',
                                                            borderRadius: 10,
                                                            color: '#10B981',
                                                            fontSize: 13,
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: 6,
                                                        }}
                                                    >
                                                        <RiCheckboxCircleLine size={15} /> Approve
                                                    </button>
                                                    <button
                                                        onClick={() => setRejectTarget(video)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px',
                                                            background: 'rgba(239,68,68,0.1)',
                                                            border: '1px solid rgba(239,68,68,0.3)',
                                                            borderRadius: 10,
                                                            color: '#EF4444',
                                                            fontSize: 13,
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: 6,
                                                        }}
                                                    >
                                                        <RiCloseCircleLine size={15} /> Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══ ORDERS ════════════════════════════════════════════════ */}
                    {activeTab === 'orders' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, overflow: 'hidden' }}>
                                <div
                                    style={{
                                        padding: '16px 20px',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>Flagged Orders</p>
                                    <Link
                                        href="/admin/orders"
                                        style={{
                                            color: '#ff5c00',
                                            fontSize: 13,
                                            textDecoration: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                        }}
                                    >
                                        All orders <RiArrowRightLine size={14} />
                                    </Link>
                                </div>

                                {!flaggedOrders || flaggedOrders.length === 0 ? (
                                    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                                        <RiCheckboxCircleLine size={40} color="rgba(16,185,129,0.4)" style={{ margin: '0 auto 12px' }} />
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>No flagged orders.</p>
                                    </div>
                                ) : (
                                    <div>
                                        {flaggedOrders.map((order, i) => (
                                            <div
                                                key={order.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 14,
                                                    padding: '14px 20px',
                                                    borderBottom: i < flaggedOrders.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                                }}
                                            >
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '0 0 3px' }}>
                                                        {order.reference}
                                                    </p>
                                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
                                                        {order.buyer?.name} → {order.seller?.name}
                                                    </p>
                                                </div>
                                                <strong style={{ color: '#ff5c00', fontSize: 14, flexShrink: 0 }}>
                                                    ₦{Number(order.total).toLocaleString()}
                                                </strong>
                                                <StatusPill status={order.status} />
                                                <Link
                                                    href={`/admin/orders/${order.id}`}
                                                    style={{
                                                        color: 'rgba(255,255,255,0.35)',
                                                        fontSize: 12,
                                                        textDecoration: 'none',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 3,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <RiEyeLine size={14} /> Review
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse   { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        ::-webkit-scrollbar { display: none; }
      `}</style>
        </>
    );
}

AdminDashboard.layout = (page) => <AppLayout>{page}</AppLayout>;
