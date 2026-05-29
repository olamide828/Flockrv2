import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    // RiAddCircleLine,
    RiBarChart2Line,
    RiHome5Line,
    RiLogoutBoxLine,
    RiMessage2Line,
    RiSearchLine,
    RiSettings4Line,
    RiShoppingBag2Line,
    RiUploadCloud2Line,
    // RiUserFill,
    RiUserLine,
} from 'react-icons/ri';

const NAV_ITEMS = [
    { href: '/', Icon: RiHome5Line, label: 'For You' },
    { href: '/explore', Icon: RiSearchLine, label: 'Explore' },
    { href: '/shop', Icon: RiShoppingBag2Line, label: 'Shop' },
    { href: '/inbox', Icon: RiMessage2Line, label: 'Inbox' },
];

export default function AppLayout({ children }) {
    const { auth } = usePage().props;
    const currentUrl = usePage().url;
    const [search, setSearch] = useState('');
    const [showUserMenu, setShowUserMenu] = useState(false);

    // Feed and single video pages need full-screen (no chrome)
    const isFeed = currentUrl === '/';
    const isVideoPage = currentUrl.startsWith('/video/');
    const isFullScreen = isFeed || isVideoPage;
    const handleLogout = () => router.post('/logout');
    const handleSearch = (e) => {
        e.preventDefault();
        if (search.trim()) router.get('/explore', { q: search.trim() });
    };

    const profileHref = auth?.user ? `/@${auth.user.username}` : '/login';
    const profileActive = auth?.user ? currentUrl.startsWith(`/@${auth.user.username}`) : currentUrl === '/login';
    const isActive = (href) => {
        return currentUrl === href || (href !== '/' && currentUrl.startsWith(href));
    };
    return (
        <div
            style={{
                display: 'flex',
                height: '100dvh',
                background: 'var(--flockr-black)',
                // KEY FIX: overflow hidden on the root so children control their own scroll
                overflow: 'hidden',
            }}
        >
            {/* ── Desktop sidebar ─────────────────────────────────────────── */}
            <aside
                style={{
                    display: 'none',
                    width: 240,
                    flexDirection: 'column',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    background: 'var(--flockr-surface)',
                    overflowY: 'auto',
                    flexShrink: 0,
                }}
                className="md-sidebar"
            >
                {/* Logo */}
                <div style={{ padding: '24px 20px 16px' }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: '#fff', letterSpacing: '-0.02em' }}>
                            flockr<span style={{ color: 'var(--flockr-orange)' }}>.</span>
                        </span>
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
                            }}
                        />
                    </form>
                </div>

                {/* Nav links */}
                <nav style={{ flex: 1, padding: '0 8px' }}>
                    {NAV_ITEMS.map(({ href, Icon, label }) => {
                        const active = currentUrl === href || (href !== '/' && currentUrl.startsWith(href));
                        return (
                            <Link
                                key={href}
                                href={href}
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
                                <Icon size={20} />
                                {label}
                            </Link>
                        );
                    })}

                    {/* Profile */}
                    <Link
                        href={profileHref}
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

                    {/* Seller upload */}
                    {auth?.user?.role === 'seller' && (
                        <Link
                            href="/seller/upload"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                margin: '8px 0',
                                padding: '11px',
                                background: 'var(--flockr-orange)',
                                borderRadius: 999,
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: 13,
                                fontFamily: 'var(--font-display)',
                                textDecoration: 'none',
                            }}
                        >
                            <RiUploadCloud2Line size={16} /> Upload Video
                        </Link>
                    )}
                </nav>

                {/* User section */}
                <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                    {auth?.user ? (
                        <>
                            <button
                                onClick={() => setShowUserMenu((m) => !m)}
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

                            {showUserMenu && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: '110%',
                                        left: 8,
                                        right: 8,
                                        background: 'var(--flockr-card)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 12,
                                        overflow: 'hidden',
                                        zIndex: 100,
                                        boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                                    }}
                                >
                                    <MenuItem
                                        Icon={RiUserLine}
                                        label="View Profile"
                                        onClick={() => {
                                            router.visit(`/@${auth.user.username}`);
                                            setShowUserMenu(false);
                                        }}
                                    />
                                    <MenuItem
                                        Icon={RiSettings4Line}
                                        label="Settings"
                                        onClick={() => {
                                            router.visit('/settings/profile');
                                            setShowUserMenu(false);
                                        }}
                                    />
                                    {auth.user.role === 'seller' && (
                                        <MenuItem
                                            Icon={RiBarChart2Line}
                                            label="Seller Dashboard"
                                            onClick={() => {
                                                router.visit('/seller/dashboard');
                                                setShowUserMenu(false);
                                            }}
                                        />
                                    )}
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
                                    <MenuItem Icon={RiLogoutBoxLine} label="Log Out" onClick={handleLogout} danger />
                                </div>
                            )}
                        </>
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

            {/* ── Main ────────────────────────────────────────────────────── */}
            {/*
        KEY FIX: main is flex:1, overflow:hidden.
        Each child page controls its OWN scroll.
        Full-screen pages (feed, video) get no padding.
        Other pages get top padding for mobile topbar.
      */}
            <main
                style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden', // ← children scroll themselves
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    // Only add top/bottom padding on mobile for non-fullscreen pages
                }}
                className={isFullScreen ? 'main-full' : 'main-paged'}
            >
                {/* Mobile top bar — only on non-fullscreen pages */}
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
                        <Link
                            href="/"
                            style={{
                                textDecoration: 'none',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 800,
                                fontSize: 22,
                                color: '#fff',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            flockr<span style={{ color: '#ff5c00' }}>.</span>
                        </Link>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Link href="/explore" style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 4 }}>
                                <RiSearchLine size={20} />
                            </Link>
                            {/* Upload button on mobile for sellers */}
                            {auth?.user?.role === 'seller' && (
                                <Link
                                    href="/seller/upload"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '7px 14px',
                                        background: '#ff5c00',
                                        borderRadius: 999,
                                        color: '#fff',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                    }}
                                >
                                    <RiUploadCloud2Line size={14} /> Upload
                                </Link>
                            )}
                            {auth?.user ? (
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setShowUserMenu((m) => !m)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                                    >
                                        <AvatarImage user={auth.user} size={30} />
                                    </button>
                                    {showUserMenu && (
                                        <div
                                        className='z-[999px]'
                                            style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 8px)',
                                                right: 0,
                                                width: 210,
                                                background: '#1a1a1a',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: 14,
                                                overflow: 'hidden',
                                                // zIndex: 999,
                                                boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                                            }}
                                        >
                                            <MenuItem
                                                Icon={RiUserLine}
                                                label="View Profile"
                                                onClick={() => {
                                                    router.visit(`/@${auth.user.username}`);
                                                    setShowUserMenu(false);
                                                }}
                                            />
                                            <MenuItem
                                                Icon={RiSettings4Line}
                                                label="Settings"
                                                onClick={() => {
                                                    router.visit('/settings/profile');
                                                    setShowUserMenu(false);
                                                }}
                                            />
                                            <MenuItem
                                                Icon={RiBarChart2Line}
                                                label="Dashboard"
                                                onClick={() => {
                                                    router.visit('/dashboard');
                                                    setShowUserMenu(false);
                                                }}
                                            />
                                            {auth.user.role === 'seller' && (
                                                <MenuItem
                                                    Icon={RiBarChart2Line}
                                                    label="Seller Dashboard"
                                                    onClick={() => {
                                                        router.visit('/seller/dashboard');
                                                        setShowUserMenu(false);
                                                    }}
                                                />
                                            )}
                                            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
                                            <MenuItem Icon={RiLogoutBoxLine} label="Log Out" onClick={handleLogout} danger />
                                        </div>
                                    )}
                                </div>
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

                {/* Page content — fills remaining height, scrolls itself */}
                <div style={{ flex: 1, overflow: isFullScreen ? 'hidden' : 'auto', minHeight: 0 }} className="page-content">
                    {children}
                </div>

                {/* Mobile bottom nav — only on non-fullscreen pages */}
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
                        }}
                    >
                        {/* Regular nav items */}
                        {NAV_ITEMS.map(({ href, label, Icon }) => {
                            const active = isActive(href);

                            return (
                                <Link
                                    key={href}
                                    href={href}
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
                                    }}
                                >
                                    <Icon size={23} />
                                    <span
                                        style={{
                                            fontSize: 10,
                                            fontWeight: active ? 700 : 400,
                                            letterSpacing: '0.02em',
                                        }}
                                    >
                                        {label}
                                    </span>
                                </Link>
                            );
                        })}

                        {/* Upload button in middle of nav for sellers, Profile for others */}
                        
                            <Link
                                href={profileHref}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 3,
                                    padding: '8px 4px 6px',
                                    textDecoration: 'none',
                                    color: profileActive ? '#ff5c00' : 'rgba(255,255,255,0.4)',
                                    transition: 'color 0.15s',
                                }}
                            >
                                {profileActive ? <RiUserLine size={23} /> : <RiUserLine size={23} />}
                                <span style={{ fontSize: 10, fontWeight: 400 }}>Profile</span>
                            </Link>
                        
                    </nav>
                )}
            </main>

            <style>{`
        @media (min-width: 768px) {
          .md-sidebar { display: flex !important; }
          .mobile-topbar { display: none !important; }
          .mobile-bottom-nav { display: none !important; }
        }
        .main-paged .page-content { padding-bottom: 0; }
        input:focus { border-color: var(--flockr-orange) !important; outline: none; }
        * { box-sizing: border-box; }
        /* Remove scrollbar on webkit for clean look */
        ::-webkit-scrollbar { display: none; }
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

function MenuItem({ Icon, label, onClick, danger }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 16px',
                color: danger ? 'var(--flockr-red, #ef4444)' : '#fff',
                fontSize: 13,
                fontWeight: 500,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
            }}
        >
            <Icon size={15} />
            {label}
        </button>
    );
}
