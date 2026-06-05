import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import {
    RiArrowLeftLine,
    RiBellLine,
    RiChat1Line,
    RiCheckDoubleLine,
    RiHeartLine,
    RiShoppingBagLine,
    RiStoreLine,
    RiUserAddLine,
    RiVideoLine,
} from 'react-icons/ri';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

function notifIcon(type) {
    const s = 16;
    const map = {
        new_like: <RiHeartLine size={s} color="#EF4444" />,
        new_comment: <RiChat1Line size={s} color="#3B82F6" />,
        new_follower: <RiUserAddLine size={s} color="#FF6B35" />,
        new_video: <RiVideoLine size={s} color="#8B5CF6" />,
        new_order: <RiShoppingBagLine size={s} color="#10B981" />,
        new_product: <RiStoreLine size={s} color="#F59E0B" />,
    };
    return map[type] ?? <RiBellLine size={s} color="rgba(255,255,255,0.4)" />;
}

// ── Notification row ──────────────────────────────────────────────────────────
function NotifRow({ notif, onRead }) {
    const unread = !notif.read_at;

    const handleClick = async () => {
        if (unread) await onRead(notif.id);
        if (notif.url) router.visit(notif.url);
    };

    return (
        <button
            onClick={handleClick}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '14px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                position: 'relative',
                transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
            {/* Unread dot */}
            {unread && (
                <span
                    style={{
                        position: 'absolute',
                        left: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#FF6B35',
                        flexShrink: 0,
                    }}
                />
            )}

            {/* Avatar or icon */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
                {notif.image ? (
                    <img src={notif.image} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {notifIcon(notif.type)}
                    </div>
                )}
                {/* Type badge over avatar */}
                {notif.image && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: -2,
                            right: -2,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: '#0a0a0a',
                            border: '1.5px solid #0a0a0a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {notifIcon(notif.type)}
                    </div>
                )}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p
                    style={{
                        color: unread ? '#fff' : 'rgba(255,255,255,0.6)',
                        fontSize: 14,
                        fontWeight: unread ? 600 : 400,
                        margin: '0 0 3px',
                        lineHeight: 1.4,
                    }}
                >
                    {notif.body}
                </p>
                <p style={{ color: unread ? '#FF6B35' : 'rgba(255,255,255,0.3)', fontSize: 12, margin: 0, fontWeight: unread ? 600 : 400 }}>
                    {timeAgo(notif.created_at)}
                </p>
            </div>
        </button>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function NotificationsIndex({ notifications: initialNotifs = [] }) {
    const [notifications, setNotifications] = useState(initialNotifs);
    const [tab, setTab] = useState('all');
    const [markingAll, setMarkingAll] = useState(false);

    const unreadCount = notifications.filter((n) => !n.read_at).length;

    const filtered = notifications.filter((n) => {
        if (tab === 'all') return true;
        if (tab === 'social') return n.category === 'social';
        if (tab === 'shop') return n.category === 'shop';
        return true;
    });

    const handleRead = async (id) => {
        await axios.post(`/api/notifications/${id}/read`).catch(() => {});
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    };

    const handleMarkAll = async () => {
        setMarkingAll(true);
        await axios.post('/api/notifications/read-all').catch(() => {});
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
        setMarkingAll(false);
    };

    const tabs = [
        { key: 'all', label: 'All', count: notifications.filter((n) => !n.read_at).length },
        { key: 'social', label: 'Social', count: notifications.filter((n) => !n.read_at && n.category === 'social').length },
        { key: 'shop', label: 'Shop', count: notifications.filter((n) => !n.read_at && n.category === 'shop').length },
    ];

    return (
        <>
            <Head title="Notifications" />

            <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
                {/* Header */}
                <div
                    style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 40,
                        background: 'rgba(10,10,10,0.96)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 20px', height: 58, display: 'flex', alignItems: 'center', gap: 14 }}>
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
                        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, flex: 1 }}>
                            Notifications
                            {unreadCount > 0 && (
                                <span
                                    style={{
                                        marginLeft: 8,
                                        padding: '2px 8px',
                                        borderRadius: 999,
                                        background: 'rgba(255,107,53,0.15)',
                                        color: '#FF6B35',
                                        fontSize: 12,
                                        fontWeight: 700,
                                    }}
                                >
                                    {unreadCount}
                                </span>
                            )}
                        </h1>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAll}
                                disabled={markingAll}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '7px 12px',
                                    borderRadius: 999,
                                    background: 'none',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.5)',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                            >
                                <RiCheckDoubleLine size={14} />
                                {markingAll ? 'Marking…' : 'Mark all read'}
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div
                        style={{
                            maxWidth: 640,
                            margin: '0 auto',
                            padding: '0 20px',
                            display: 'flex',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                        }}
                    >
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                style={{
                                    flex: 1,
                                    padding: '10px 8px',
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: tab === t.key ? '2px solid #FF6B35' : '2px solid transparent',
                                    color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.4)',
                                    fontSize: 13,
                                    fontWeight: tab === t.key ? 700 : 400,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                }}
                            >
                                {t.label}
                                {t.count > 0 && (
                                    <span
                                        style={{
                                            background: tab === t.key ? '#FF6B35' : 'rgba(255,255,255,0.08)',
                                            color: '#fff',
                                            borderRadius: 999,
                                            fontSize: 10,
                                            fontWeight: 700,
                                            padding: '1px 6px',
                                        }}
                                    >
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 80 }}>
                    {filtered.length === 0 ? (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '80px 24px',
                                gap: 14,
                                textAlign: 'center',
                            }}
                        >
                            <div
                                style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <RiBellLine size={28} color="rgba(255,255,255,0.2)" />
                            </div>
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: 0 }}>No notifications yet</p>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>
                                {tab === 'shop' ? 'Order and product updates will appear here.' : 'Likes, comments and follows will appear here.'}
                            </p>
                        </div>
                    ) : (
                        <div>
                            {filtered.map((n) => (
                                <NotifRow key={n.id} notif={n} onRead={handleRead} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

NotificationsIndex.layout = (page) => <AppLayout>{page}</AppLayout>;
