import { Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { ShoppingBagIcon } from 'lucide-react';
import VerifyEmailBanner from '@/Components/verifyEmailBanner';
import ProfileSheet from '@/Components/ProfileSheet';
import ConfirmModal from '@/Components/Community/ConfirmModal';
import { useEffect, useState, useCallback } from 'react';
import { IoChatboxEllipsesOutline } from 'react-icons/io5';
import {
    RiHome5Line,
    RiSearchLine,
    RiShoppingBag2Line,
    RiShoppingBasketLine,
    RiShoppingCart2Line,
    RiUploadCloud2Line,
    RiUserLine,
    RiAddLine,
} from 'react-icons/ri';

import { TiGroupOutline } from "react-icons/ti";

const NAV_ITEMS = [
    { href: '/',        Icon: RiHome5Line,              label: 'For You'   },
{ href: '/explore', Icon: RiSearchLine,              label: 'Explore'   },
{ href: '/community', Icon: TiGroupOutline,          label: 'Community' },
{ href: '/shop',    Icon: RiShoppingBag2Line,        label: 'Shop'      },
{ href: '/inbox',   Icon: IoChatboxEllipsesOutline,  label: 'Inbox'     },
];

export default function AppLayout({ children }) {
    const { auth } = usePage().props;
    const currentUrl = usePage().url;
    const [search, setSearch] = useState('');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [cartCount, setCartCount] = useState(0);

    const isFeed = currentUrl === '/';
    // Matches /@{username}/video/{ulid} — the actual route pattern.
    const isVideoPage = /^\/@[^/]+\/video\//.test(currentUrl);
    const isFullScreen = isFeed || isVideoPage;

    // ── Unread message count from shared props ────────────────────────────────
    const [unreadMessages, setUnreadMessages] = useState(auth?.user?.unread_messages ?? 0);

    useEffect(() => {
        const handler = (e) => setUnreadMessages(e.detail ?? 0);
        window.addEventListener('flockr:unread', handler);
        return () => window.removeEventListener('flockr:unread', handler);
    }, []);

    // Keep local unread count in sync when the shared auth prop changes
    // (e.g. after the focus-triggered partial reload below) — previously
    // this only updated via the custom event and could go stale.
    useEffect(() => {
        if (typeof auth?.user?.unread_messages === 'number') {
            setUnreadMessages(auth.user.unread_messages);
        }
    }, [auth?.user?.unread_messages]);

    useEffect(() => {
        const onFocus = () => router.reload({ only: ['auth'] });
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

    // ── Instant-feeling navigation ─────────────────────────────────────────────
    // 1. Optimistic active-tab highlighting — updates the moment a link is
    //    tapped, not after the server responds.
    // 2. Prefetching on hover (desktop) / touchstart (mobile, fires before the
    //    tap completes) so the page is often already cached by the time the
    //    click registers.
    // 3. A slim top progress bar tied to real navigation lifecycle instead of
    //    Inertia's default progress indicator (disable that globally by
    //    passing `progress: false` to createInertiaApp in your app entry file).
    const [optimisticHref, setOptimisticHref] = useState(null);
    const [isNavigating, setIsNavigating] = useState(false);

    useEffect(() => {
        const stopStart = router.on('start', () => setIsNavigating(true));
        const stopFinish = router.on('finish', () => { setIsNavigating(false); setOptimisticHref(null); });
        return () => { stopStart(); stopFinish(); };
    }, []);

    const handlePrefetch = useCallback((href) => {
        try {
            if (typeof router.prefetch === 'function') {
                router.prefetch(href, { method: 'get' }, { cacheFor: 30000 });
            }
        } catch {}
    }, []);

    const handleNavClick = useCallback((href) => setOptimisticHref(href), []);

    const handleLogout = () => router.post('/logout');
    const handleSearch = (e) => {
        e.preventDefault();
        if (search.trim()) router.get('/explore', { q: search.trim() });
    };

    const profileHref = auth?.user ? `/@${auth.user.username}` : '/login';
    const effectiveUrl = optimisticHref ?? currentUrl;
    const profileActive = auth?.user ? effectiveUrl.startsWith(`/@${auth.user.username}`) : effectiveUrl === '/login';
    const isActive = (href) => effectiveUrl === href || (href !== '/' && effectiveUrl.startsWith(href));

    useEffect(() => {
        if (auth?.user) {
            axios.get('/api/cart/count').then((r) => setCartCount(r.data.count)).catch(() => {});
        }
        const handler = () => {
            if (auth?.user) {
                axios.get('/api/cart/count').then((r) => setCartCount(r.data.count)).catch(() => {});
            }
        };
        window.addEventListener('flockr:cart', handler);
        return () => window.removeEventListener('flockr:cart', handler);
    }, [auth?.user]);

    const isSeller = auth?.user?.role === 'seller';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--flockr-black)', overflow: 'hidden' }}>
            {isNavigating && <div className="flockr-topbar-progress" />}
            <VerifyEmailBanner />
            <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* ── Desktop sidebar ──────────────────────────────────────────── */}
            <aside
                className="md-sidebar"
                style={{
                    display: 'none',
                    width: 240,
                    flexDirection: 'column',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    background: 'var(--flockr-surface)',
                    overflowY: 'auto',
                    flexShrink: 0,
                }}
            >
                {/* Logo */}
                <div style={{ padding: '24px 20px 16px' }}>
                    <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }} className="gap-2">
    <img
        src="/images/flockr_logo_orange.png"
        alt="Flockr"
        style={{ width: 36, height: 36, borderRadius: 12, objectFit: 'cover' }}
    />
    <h1 style={{
                                textDecoration: 'none',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 800,
                                fontSize: 22,
                                color: '#fff',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            flockr<span style={{ color: '#ff5c00' }}>.</span>
        </h1>
</Link>
                </div>

                {/* Search */}
                <div style={{ padding: '0 12px 12px' }}>
                    <form onSubmit={handleSearch} style={{ position: 'relative' }}>
                        <RiSearchLine
                            size={15}
                            color="var(--flockr-muted)"
                            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                        />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search..."
                            style={{
                                width: '100%',
                                padding: '9px 10px 9px 32px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 10,
                                color: '#fff',
                                fontSize: 13,
                                boxSizing: 'border-box',
                                outline: 'none',
                            }}
                        />
                    </form>
                </div>

                {/* Upload — moved up front so sellers see it immediately, no scrolling past 8 nav items */}
                {isSeller && (
                    <div style={{ padding: '0 12px 12px' }}>
                        <Link
                            href="/seller/upload"
                            onMouseEnter={() => handlePrefetch('/seller/upload')}
                            onClick={() => handleNavClick('/seller/upload')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                padding: '11px',
                                background: 'var(--flockr-orange)',
                                borderRadius: 12,
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: 13,
                                fontFamily: 'var(--font-display)',
                                textDecoration: 'none',
                            }}
                        >
                            <RiUploadCloud2Line size={16} /> Upload Video
                        </Link>
                    </div>
                )}

                {/* Nav */}
                <nav style={{ flex: 1, padding: '0 8px' }}>
                    {NAV_ITEMS.map(({ href, Icon, label }) => {
                        const active = isActive(href);
                        const isInbox = href === '/inbox';
                        return (
                            <Link
                                key={href}
                                href={href}
                                onMouseEnter={() => handlePrefetch(href)}
                                onClick={() => handleNavClick(href)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 12px',
                                    borderRadius: 10,
                                    marginBottom: 2,
                                    textDecoration: 'none',
                                    fontSize: 14,
                                    fontWeight: active ? 600 : 400,
                                    color: active ? 'var(--flockr-orange)' : 'var(--flockr-muted)',
                                    background: active ? 'rgba(255,92,0,0.08)' : 'transparent',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <div style={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
                                    <Icon size={20} />
                                    {isInbox && unreadMessages > 0 && (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: -5,
                                                right: -6,
                                                minWidth: 16,
                                                height: 16,
                                                borderRadius: 999,
                                                background: '#ff5c00',
                                                border: '2px solid var(--flockr-surface)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 9,
                                                fontWeight: 800,
                                                color: '#fff',
                                                padding: '0 3px',
                                                lineHeight: 1,
                                            }}
                                        >
                                            {unreadMessages > 99 ? '99+' : unreadMessages}
                                        </span>
                                    )}
                                </div>
                                {label}
                            </Link>
                        );
                    })}

                    <Link
                        href="/cart"
                        onMouseEnter={() => handlePrefetch('/cart')}
                        onClick={() => handleNavClick('/cart')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 12px',
                            borderRadius: 10,
                            marginBottom: 2,
                            textDecoration: 'none',
                            fontSize: 14,
                            fontWeight: isActive('/cart') ? 600 : 400,
                            color: isActive('/cart') ? 'var(--flockr-orange)' : 'var(--flockr-muted)',
                            background: isActive('/cart') ? 'rgba(255,92,0,0.08)' : 'transparent',
                            transition: 'all 0.15s',
                        }}
                    >
                        <div style={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
                            <RiShoppingCart2Line size={20} />
                            {cartCount > 0 && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: -7,
                                        right: -8,
                                        minWidth: 20,
                                        height: 20,
                                        borderRadius: 999,
                                        background: '#ff5c00',
                                        border: '2px solid var(--flockr-surface)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 9,
                                        fontWeight: 800,
                                        color: '#fff',
                                        padding: '0 3px',
                                        lineHeight: 1,
                                    }}
                                >
                                    {cartCount > 99 ? '99+' : cartCount}
                                </span>
                            )}
                        </div>
                        Cart
                    </Link>

                    <Link
                        href='/orders'
                        onMouseEnter={() => handlePrefetch('/orders')}
                        onClick={() => handleNavClick('/orders')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 12px',
                            borderRadius: 10,
                            marginBottom: 2,
                            textDecoration: 'none',
                            fontSize: 14,
                           fontWeight: isActive('/orders') ? 600 : 400,
                            color: isActive('/orders') ? 'var(--flockr-orange)' : 'var(--flockr-muted)',
                            background: isActive('/orders') ? 'rgba(255,92,0,0.08)' : 'transparent',
                            transition: 'all 0.15s',
                        }}
                    >
                        <RiShoppingBasketLine size={20} />
                        Orders
                    </Link>

                    {/* Profile — kept in nav list too for quick single-click access */}
                    <Link
                        href={profileHref}
                        onMouseEnter={() => handlePrefetch(profileHref)}
                        onClick={() => handleNavClick(profileHref)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 12px',
                            borderRadius: 10,
                            marginBottom: 2,
                            textDecoration: 'none',
                            fontSize: 14,
                            fontWeight: profileActive ? 600 : 400,
                            color: profileActive ? 'var(--flockr-orange)' : 'var(--flockr-muted)',
                            background: profileActive ? 'rgba(255,92,0,0.08)' : 'transparent',
                            transition: 'all 0.15s',
                        }}
                    >
                        <RiUserLine size={20} />
                        Profile
                    </Link>
                </nav>

                {/* User section — opens the ProfileSheet instead of the old dropdown */}
                <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {auth?.user ? (
                        <button
                            onClick={() => setShowUserMenu(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                width: '100%',
                                padding: 8,
                                borderRadius: 10,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                textAlign: 'left',
                            }}
                        >
                            <AvatarImage user={auth.user} size={36} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p
                                    style={{
                                        color: '#fff',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        margin: 0,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {auth.user.name}
                                </p>
                                <p style={{ color: 'var(--flockr-muted)', fontSize: 11, margin: 0 }}>@{auth.user.username}</p>
                            </div>
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <Link
                                href="/login"
                                style={{
                                    display: 'block',
                                    textAlign: 'center',
                                    padding: '10px',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: 999,
                                    color: '#fff',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    textDecoration: 'none',
                                }}
                            >
                                Log in
                            </Link>
                            <Link
                                href="/register"
                                style={{
                                    display: 'block',
                                    textAlign: 'center',
                                    padding: '11px',
                                    background: 'var(--flockr-orange)',
                                    borderRadius: 999,
                                    color: '#fff',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                }}
                            >
                                Sign up
                            </Link>
                        </div>
                    )}
                </div>
            </aside>

            {/* ── Main ─────────────────────────────────────────────────────── */}
            <main
                className={isFullScreen ? 'main-full' : 'main-paged'}
                style={{ flex: 1, minWidth: 0, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}
            >
                {/* Mobile top bar */}
                {!isFullScreen && (
                    <div
                        className="mobile-topbar"
                        style={{
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: 'rgba(10,10,10,0.94)',
                            backdropFilter: 'blur(20px)',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            zIndex: 50,
                        }}
                    >
                        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
    <img
        src="/images/flockr_logo_orange.png"
        alt="Flockr"
        style={{ width: 36, height: 36, borderRadius: 12, objectFit: 'cover' }}
    />
</Link>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Link
                                href="/explore"
                                onTouchStart={() => handlePrefetch('/explore')}
                                onClick={() => handleNavClick('/explore')}
                                style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 4 }}
                            >
        <RiSearchLine size={20} />
    </Link>
                            <Link
                                href="/orders"
                                onTouchStart={() => handlePrefetch('/orders')}
                                onClick={() => handleNavClick('/orders')}
                                style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 4 }}
                            >
                                <RiShoppingBasketLine size={20} />
                            </Link>
                            <Link
                                href="/cart"
                                onTouchStart={() => handlePrefetch('/cart')}
                                onClick={() => handleNavClick('/cart')}
                                style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 4, position: 'relative' }}
                            >
                                <RiShoppingCart2Line size={20} />
                                {cartCount > 0 && (
                                    <span
                                        className="animate-bounce"
                                        style={{
                                            position: 'absolute',
                                            top: -1,
                                            right: -2,
                                            minWidth: 20,
                                            height: 20,
                                            borderRadius: 999,
                                            background: '#ff5c00',
                                            border: '2px solid rgba(10,10,10,0.94)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 9,
                                            fontWeight: 800,
                                            color: '#fff',
                                            padding: '0 3px',
                                            lineHeight: 1,
                                        }}
                                    >
                                        {cartCount > 99 ? '99+' : cartCount}
                                    </span>
                                )}
                            </Link>
                            {auth?.user ? (
                                <button
                                    onClick={() => setShowUserMenu(true)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', position: 'relative' }}
                                >
                                    <AvatarImage user={auth.user} size={30} />
                                </button>
                            ) : (
                                <Link
                                    href="/login"
                                    style={{
                                        padding: '7px 16px',
                                        background: '#ff5c00',
                                        borderRadius: 999,
                                        color: '#fff',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                    }}
                                >
                                    Log in
                                </Link>
                            )}
                        </div>
                    </div>
                )}

                {/* Page content */}
                <div className="page-content" style={{ flex: 1, overflow: isFullScreen ? 'hidden' : 'auto', minHeight: 0 }}>
                    {children}
                </div>

                {/* Mobile bottom nav */}
                {!isVideoPage && (
                    <nav
                        className="mobile-bottom-nav"
                        style={{
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            background: 'rgba(8,8,8,0.96)',
                            backdropFilter: 'blur(24px)',
                            borderTop: '1px solid rgba(255,255,255,0.07)',
                            zIndex: 50,
                            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                            position: 'relative',
                        }}
                    >
                        {NAV_ITEMS.filter(item => item.href !== '/explore').slice(0, 2).map(({ href, label, Icon }) => {
                            const active = isActive(href);
                            const isInbox = href === '/inbox';
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    onTouchStart={() => handlePrefetch(href)}
                                    onClick={() => handleNavClick(href)}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 3,
                                        padding: '8px 4px 6px',
                                        textDecoration: 'none',
                                        color: active ? '#ff5c00' : 'rgba(255,255,255,0.4)',
                                        transition: 'color 0.15s',
                                        position: 'relative',
                                    }}
                                >
                                    <div style={{ position: 'relative' }}>
                                        <Icon size={23} />
                                        {isInbox && unreadMessages > 0 && (
                                            <span
                                                style={{
                                                    position: 'absolute',
                                                    top: -4,
                                                    right: -6,
                                                    minWidth: 16,
                                                    height: 16,
                                                    borderRadius: 999,
                                                    background: '#ff5c00',
                                                    border: '2px solid rgba(8,8,8,0.96)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 9,
                                                    fontWeight: 800,
                                                    color: '#fff',
                                                    padding: '0 3px',
                                                    lineHeight: 1,
                                                    animation: 'badgePop 0.3s ease',
                                                }}
                                            >
                                                {unreadMessages > 99 ? '99+' : unreadMessages}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: '0.02em' }}>{label}</span>
                                </Link>
                            );
                        })}

                        {/* Raised center upload FAB — sellers only, TikTok-style placement */}
                        {isSeller && (
                            <Link
                                href="/seller/upload"
                                onTouchStart={() => handlePrefetch('/seller/upload')}
                                onClick={() => handleNavClick('/seller/upload')}
                                style={{ flex: 1, display: 'flex', justifyContent: 'center', textDecoration: 'none' }}
                            >
                                <div className="upload-fab">
                                    <RiAddLine size={24} color="#fff" />
                                </div>
                            </Link>
                        )}

                        {NAV_ITEMS.filter(item => item.href !== '/explore').slice(2).map(({ href, label, Icon }) => {
                            const active = isActive(href);
                            const isInbox = href === '/inbox';
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    onTouchStart={() => handlePrefetch(href)}
                                    onClick={() => handleNavClick(href)}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 3,
                                        padding: '8px 4px 6px',
                                        textDecoration: 'none',
                                        color: active ? '#ff5c00' : 'rgba(255,255,255,0.4)',
                                        transition: 'color 0.15s',
                                        position: 'relative',
                                    }}
                                >
                                    <div style={{ position: 'relative' }}>
                                        <Icon size={23} />
                                        {isInbox && unreadMessages > 0 && (
                                            <span
                                                style={{
                                                    position: 'absolute',
                                                    top: -4,
                                                    right: -6,
                                                    minWidth: 16,
                                                    height: 16,
                                                    borderRadius: 999,
                                                    background: '#ff5c00',
                                                    border: '2px solid rgba(8,8,8,0.96)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 9,
                                                    fontWeight: 800,
                                                    color: '#fff',
                                                    padding: '0 3px',
                                                    lineHeight: 1,
                                                    animation: 'badgePop 0.3s ease',
                                                }}
                                            >
                                                {unreadMessages > 99 ? '99+' : unreadMessages}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: '0.02em' }}>{label}</span>
                                </Link>
                            );
                        })}

                        <button
                            onClick={() => setShowUserMenu(true)}
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 3,
                                padding: '8px 4px 6px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: profileActive ? '#ff5c00' : 'rgba(255,255,255,0.4)',
                                transition: 'color 0.15s',
                            }}
                        >
                            <RiUserLine size={23} />
                            <span style={{ fontSize: 10, fontWeight: profileActive ? 700 : 400 }}>Profile</span>
                        </button>
                    </nav>
                )}
            </main>
             </div>

            {showUserMenu && auth?.user && (
                <ProfileSheet
                    user={auth.user}
                    onClose={() => setShowUserMenu(false)}
                    onNavigate={(path) => router.visit(path)}
                    onLogoutClick={() => setShowLogoutConfirm(true)}
                />
            )}

            {showLogoutConfirm && (
                <ConfirmModal
                    title="Log out?"
                    message="You'll need to sign in again to access your account."
                    confirmLabel="Log Out"
                    cancelLabel="Cancel"
                    danger
                    onConfirm={handleLogout}
                    onClose={() => setShowLogoutConfirm(false)}
                />
            )}

            <style>{`
                @media (min-width: 768px) {
                    .md-sidebar { display: flex !important; }
                    .mobile-topbar { display: none !important; }
                    .mobile-bottom-nav { display: none !important; }
                }
                .main-paged .page-content { padding-bottom: 0; }
                input:focus { border-color: var(--flockr-orange) !important; outline: none; }
                * { box-sizing: border-box; }
                ::-webkit-scrollbar { display: none; }
                @keyframes badgePop {
                    0%   { transform: scale(0); }
                    70%  { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
                @media (max-width: 767px) {
                    body.chat-open .mobile-topbar     { display: none !important; }
                    body.chat-open .mobile-bottom-nav { display: none !important; }
                    body.chat-open .page-content       { overflow: hidden !important; }
                }
                .upload-fab {
                    width: 46px; height: 46px; border-radius: 16px;
                    background: var(--flockr-orange);
                    display: flex; align-items: center; justify-content: center;
                    transform: translateY(-14px);
                    box-shadow: 0 8px 20px rgba(255,92,0,0.45);
                    border: 3px solid rgba(8,8,8,0.96);
                }
                .flockr-topbar-progress {
                    position: fixed; top: 0; left: 0; right: 0; height: 2.5px; z-index: 9999;
                    background: var(--flockr-orange);
                    animation: flockrProgress 1s ease-in-out infinite;
                    transform-origin: left;
                }
                @keyframes flockrProgress {
                    0%   { transform: scaleX(0); opacity: 1; }
                    50%  { transform: scaleX(0.6); }
                    100% { transform: scaleX(0.9); opacity: 0.6; }
                }
            `}</style>
        </div>
    );
}

export function AvatarImage({ user, size = 36 }) {
    const [imgError, setImgError] = useState(false);
    const src = user?.avatar_url;
    if (src && !imgError) {
        return (
            <img
                src={src}
                alt={user?.name ?? 'User'}
                onError={() => setImgError(true)}
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid rgba(255,255,255,0.1)',
                    flexShrink: 0,
                    display: 'block',
                }}
            />
        );
    }
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                flexShrink: 0,
                background: 'linear-gradient(135deg, var(--flockr-orange), #ff8c00)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: size * 0.38,
                border: '2px solid rgba(255,255,255,0.1)',
            }}
        >
            {(user?.name ?? user?.username ?? 'U')[0].toUpperCase()}
        </div>
    );
}