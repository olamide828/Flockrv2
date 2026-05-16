import ProductCard from '@/Components/Product/ProductCard';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import {
    RiMapPinLine,
    RiMessage2Line,
    RiMoreLine,
    RiPlayFill,
    RiSettings4Line,
    RiShareForwardLine,
    RiStoreLine,
    RiUploadCloud2Line,
    RiUserAddLine,
    RiUserFollowLine,
    RiVerifiedBadgeLine,
    RiVideoLine,
} from 'react-icons/ri';

export default function UserProfile({ profileUser, videos, products, isFollowing: initFollowing, isOwnProfile }) {
    const { auth } = usePage().props;
    const [following, setFollowing] = useState(initFollowing);
    const [followersCount, setFollowersCount] = useState(profileUser.followers_count ?? 0);
    const [activeTab, setActiveTab] = useState('videos');

    const handleFollow = async () => {
        if (!auth?.user) {
            router.visit('/login');
            return;
        }
        const next = !following;
        setFollowing(next);
        setFollowersCount((c) => c + (next ? 1 : -1));
        await axios.post(`/api/users/${profileUser.id}/follow`, {}, { withCredentials: true }).catch(() => {
            setFollowing(!next);
            setFollowersCount((c) => c + (next ? -1 : 1));
        });
    };

    const handleShare = () => {
        const url = `${window.location.origin}/@${profileUser.username}`;
        if (navigator.share) navigator.share({ title: profileUser.name, url }).catch(() => {});
        else navigator.clipboard?.writeText(url);
    };

    const copyUsername = () => {
        navigator.clipboard.writeText(`${profileUser.username}`);
        // toast.info('Link copied to clipboard');
        alert(`${profileUser.username} copied successfully`);
    };

    const tabs = [
        { key: 'videos', label: 'Videos', Icon: RiVideoLine, count: videos?.length ?? 0 },
        ...(profileUser.role === 'seller' ? [{ key: 'products', label: 'Shop', Icon: RiStoreLine, count: products?.length ?? 0 }] : []),
    ];

    const totalLikes = videos?.reduce((sum, v) => sum + (v.likes_count ?? 0), 0) ?? 0;
    const avatarSrc =
        profileUser.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.name)}&background=222&color=fff&size=200`;

    return (
        <>
            <Head title={`${profileUser.name} @${profileUser.username}`} />

            <style>{`
        .vgrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 180px));
  justify-content: center;
  gap: 12px;
  padding: 12px;
}
        @media (max-width: 640px)  { .vgrid { grid-template-columns: repeat(3,1fr); } }
        @media (min-width: 641px)  { .vgrid { grid-template-columns: repeat(4,1fr); } }
        @media (min-width: 900px)  { .vgrid { grid-template-columns: repeat(5,1fr); } }
        @media (min-width: 1100px) { .vgrid { grid-template-columns: repeat(6,1fr); } }
        .vthumb:hover .vplay { opacity: 1 !important; }
        .vthumb img { transition: transform 0.3s ease; }
        .vthumb:hover img { transform: scale(1.04); }
        .profile-stat:hover { opacity: 0.75; }
      `}</style>

            <div style={{ minHeight: '100%', background: '#121212', color: '#fff', fontFamily: 'var(--font-body)' }}>
                
                <button
            onClick={() => window.history.back()}
            className='p-4'
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          {/* ═══════════════════════════════════════════════════════════════
            DESKTOP HEADER (TikTok style — horizontal, no cover image)
        ═══════════════════════════════════════════════════════════════ */}
                <div className="hidden md:block" style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 32px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, marginBottom: 24 }}>
                        {/* Avatar */}
                        <div style={{ flexShrink: 0 }}>
                            <img
                                src={avatarSrc}
                                alt={profileUser.name}
                                style={{ width: 116, height: 116, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                            />
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Username + verified row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                                <h1
                                    onClick={copyUsername}
                                    style={{
                                        fontSize: 28,
                                        fontWeight: 700,
                                        color: '#fff',
                                        margin: 0,
                                        letterSpacing: '-0.3px',
                                        fontFamily: 'var(--font-display)',
                                    }}
                                >
                                    {profileUser.username}
                                </h1>
                                {profileUser.is_verified && <RiVerifiedBadgeLine size={20} color="#FF6B35" />}
                                {profileUser.role === 'seller' && (
                                    <span
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: '#FF6B35',
                                            background: 'rgba(255,107,53,0.12)',
                                            border: '1px solid rgba(255,107,53,0.3)',
                                            borderRadius: 4,
                                            padding: '2px 8px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}
                                    >
                                        Seller
                                    </span>
                                )}
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                                {isOwnProfile ? (
                                    <>
                                        <Link href="/settings/profile" style={outlineBtn}>
                                            Edit profile
                                        </Link>
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
                                        <button onClick={handleFollow} style={following ? followingBtn : primaryBtn}>
                                            {following ? (
                                                <>
                                                    <RiUserFollowLine size={14} /> Following
                                                </>
                                            ) : (
                                                <>
                                                    <RiUserAddLine size={14} /> Follow
                                                </>
                                            )}
                                        </button>
                                        <Link href={`/inbox?user=${profileUser.id}`} style={outlineBtn}>
                                            <RiMessage2Line size={14} /> Message
                                        </Link>
                                        <button onClick={handleShare} style={iconBtn}>
                                            <RiShareForwardLine size={16} color="#fff" />
                                        </button>
                                        <button style={iconBtn}>
                                            <RiMoreLine size={16} color="#fff" />
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Stats row — exact TikTok layout */}
                            <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
                                {[
                                    { label: 'Following', value: profileUser.following_count ?? 0, href: `/@${profileUser.username}/following` },
                                    { label: 'Followers', value: followersCount, href: `/@${profileUser.username}/followers` },
                                    { label: 'Likes', value: totalLikes },
                                ].map((s, i) => {
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

                            {/* Bio */}
                            {profileUser.name && (
                                <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>{profileUser.name}</p>
                            )}
                            {profileUser.bio && (
                                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.6, margin: '0 0 6px', maxWidth: 500 }}>
                                    {profileUser.bio}
                                </p>
                            )}
                            {profileUser.location && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <RiMapPinLine size={13} color="rgba(255,255,255,0.4)" />
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{profileUser.location}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════
            MOBILE HEADER
        ═══════════════════════════════════════════════════════════════ */}
                <div className="md:hidden" style={{ padding: '16px 16px 0' }}>
                    {/* Avatar row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                        <img
                            src={avatarSrc}
                            alt={profileUser.name}
                            style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        />

                        {/* Stats */}
                        <div style={{ display: 'flex', flex: 1, justifyContent: 'space-around' }}>
                            {[
                                { label: 'Following', value: profileUser.following_count ?? 0 },
                                { label: 'Followers', value: followersCount },
                                { label: 'Likes', value: totalLikes },
                            ].map((s) => (
                                <Link
                                    key={s.label}
                                    href={
                                        s.label === 'Following'
                                            ? `/@${profileUser.username}/following`
                                            : s.label === 'Followers'
                                              ? `/@${profileUser.username}/followers`
                                              : '#'
                                    }
                                    style={{ textAlign: 'center' }}
                                >
                                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>{fmtCount(s.value)}</p>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '2px 0 0' }}>{s.label}</p>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Name + bio */}
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0, fontFamily: 'var(--font-display)' }}>
                                {profileUser.name}
                            </p>
                            {profileUser.is_verified && <RiVerifiedBadgeLine size={14} color="#FF6B35" />}
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '0 0 6px' }}>@{profileUser.username}</p>
                        {profileUser.bio && (
                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{profileUser.bio}</p>
                        )}
                        {profileUser.location && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                                <RiMapPinLine size={12} color="rgba(255,255,255,0.35)" />
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{profileUser.location}</span>
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                        {isOwnProfile ? (
                            <>
                                <Link href="/settings/profile" style={{ ...outlineBtn, flex: 1, justifyContent: 'center' }}>
                                    Edit profile
                                </Link>
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
                                <button
                                    onClick={handleFollow}
                                    style={{
                                        ...(following ? followingBtn : primaryBtn),
                                        flex: 1,
                                        justifyContent: 'center',
                                    }}
                                >
                                    {following ? 'Following' : 'Follow'}
                                </button>
                                <Link href={`/inbox?user=${profileUser.id}`} style={{ ...outlineBtn, flex: 1, justifyContent: 'center' }}>
                                    <RiMessage2Line size={14} /> Message
                                </Link>
                                <button onClick={handleShare} style={iconBtn}>
                                    <RiShareForwardLine size={16} color="#fff" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════
            TABS
        ═══════════════════════════════════════════════════════════════ */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', marginTop: 8 }}>
                    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px', display: 'flex' }}>
                        {tabs.map(({ key, label, Icon, count }) => {
                            const active = activeTab === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key)}
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
                                    <Icon size={17} />
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════
            TAB CONTENT
        ═══════════════════════════════════════════════════════════════ */}
                <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 80 }}>
                    {/* Videos grid */}
                    {activeTab === 'videos' &&
                        (videos?.length > 0 ? (
                            <div className="vgrid">
                                {videos.map((video) => (
                                    <Link
                                        key={video.id}
                                        href={`/video/${video.id}`}
                                        className="vthumb rounded-lg"
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

                                        {/* Hover play */}
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

                                        {/* Bottom gradient */}
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

                                        {/* View count */}
                                        <div style={{ position: 'absolute', bottom: 7, left: 7, display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <RiPlayFill size={11} color="rgba(255,255,255,0.9)" />
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

                    {/* Products */}
                    {activeTab === 'products' &&
                        (products?.length > 0 ? (
                            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
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
                </div>
            </div>
        </>
    );
}

UserProfile.layout = (page) => <AppLayout>{page}</AppLayout>;

// ── Sub-components ─────────────────────────────────────────────────────────────

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

// ── Button styles ──────────────────────────────────────────────────────────────
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
    fontFamily: 'var(--font-body)',
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
    fontFamily: 'var(--font-body)',
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
    fontFamily: 'var(--font-body)',
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
