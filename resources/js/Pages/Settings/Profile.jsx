import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useRef, useState } from 'react';
import {
    FiAlertTriangle,
    FiCheckCircle,
    FiFileText,
    FiGift,
    FiHeart,
    FiInfo,
    FiMail,
    FiMapPin,
    FiMessageCircle,
    FiPackage,
    FiPhone,
    FiTruck,
    FiUsers,
} from 'react-icons/fi';

export default function ProfileSettings({ banks = [] }) {
    const { auth } = usePage().props;
    const [tab, setTab] = useState('profile');
    const [editing, setEditing] = useState(false);
    const [editingBank, setEditingBank] = useState(false);
    const [avatarPrev, setAvatarPrev] = useState(auth?.user?.avatar_url ?? null);
    const fileRef = useRef(null);

    const { data, setData, post, processing, errors, recentlySuccessful, reset } = useForm({
        name: auth?.user?.name ?? '',
        username: auth?.user?.username ?? '',
        bio: auth?.user?.bio ?? '',
        location: auth?.user?.location ?? '',
        phone: auth?.user?.phone ?? '',
        avatar: null,
    });

    const bankForm = useForm({ bank_code: '', account_number: '' });
    const pwForm = useForm({ current_password: '', password: '', password_confirmation: '' });

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setData('avatar', file);
        setAvatarPrev(URL.createObjectURL(file));
    };

    const submitProfile = (e) => {
        e.preventDefault();
        post('/settings/profile', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    };

    const cancelEdit = () => {
        setEditing(false);
        setAvatarPrev(auth?.user?.avatar_url ?? null);
        reset();
    };

    const TABS = [
        { key: 'profile', label: 'Profile', icon: PersonIcon },
        { key: 'security', label: 'Security', icon: LockIcon },
        ...(auth?.user?.role === 'seller' ? [{ key: 'payouts', label: 'Payouts', icon: CardIcon }] : []),
        { key: 'notifications', label: 'Notifications', icon: BellIcon },
    ];

    return (
        <>
            <Head title="Settings" />
            <div className="scroll-hidden h-screen overflow-y-auto" style={{ background: 'var(--flockr-black)' }}>
                {/* ── Top bar ─────────────────────────────────────────────────── */}
                <div
                    style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 30,
                        width: '100%',
                        boxSizing: 'border-box',
                        background: 'rgba(10,10,10,0.92)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                        padding: '14px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--flockr-text)' }}>Settings</span>
                    {tab === 'profile' && !editing && (
                        <button
                            onClick={() => setEditing(true)}
                            style={{
                                background: 'rgba(255,92,0,0.12)',
                                border: '1px solid rgba(255,92,0,0.35)',
                                color: 'var(--flockr-orange)',
                                borderRadius: 999,
                                padding: '7px 18px',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Edit Profile
                        </button>
                    )}
                    {tab === 'profile' && editing && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={cancelEdit}
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'var(--flockr-muted)',
                                    borderRadius: 999,
                                    padding: '7px 16px',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitProfile}
                                disabled={processing}
                                style={{
                                    background: 'var(--flockr-orange)',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: 999,
                                    padding: '7px 18px',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    opacity: processing ? 0.7 : 1,
                                }}
                            >
                                {processing ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Tab strip ───────────────────────────────────────────────── */}
                <div
                    style={{
                        display: 'flex',
                        overflowX: 'auto',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                        scrollbarWidth: 'none',
                    }}
                >
                    {TABS.map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => {
                                    setTab(t.key);
                                    setEditing(false);
                                }}
                                style={{
                                    flex: '1 0 auto',
                                    minWidth: 80,
                                    padding: '14px 10px 12px',
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: active ? '2px solid var(--flockr-orange)' : '2px solid transparent',
                                    color: active ? 'var(--flockr-text)' : 'var(--flockr-muted)',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: active ? 600 : 400,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4,
                                    transition: 'all 0.15s',
                                }}
                            >
                                <Icon size={18} color={active ? 'var(--flockr-orange)' : 'var(--flockr-muted)'} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 0 100px' }}>
                    {/* ════════════════════════════════════════════════════════════
              PROFILE TAB
          ════════════════════════════════════════════════════════════ */}
                    {tab === 'profile' && (
                        <div>
                            {/* Success banner */}
                            {recentlySuccessful && (
                                <div
                                    style={{
                                        margin: '16px 16px 0',
                                        background: 'rgba(0,217,126,0.1)',
                                        border: '1px solid rgba(0,217,126,0.3)',
                                        borderRadius: 12,
                                        padding: '12px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                    }}
                                >
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--flockr-green)" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                    <span style={{ color: 'var(--flockr-green)', fontSize: 13, fontWeight: 500 }}>Profile updated!</span>
                                </div>
                            )}

                            {/* ── Avatar + name block ─────────────────────────────── */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    padding: '28px 20px 20px',
                                    gap: 14,
                                }}
                            >
                                {/* Avatar */}
                                <div style={{ position: 'relative' }}>
                                    {avatarPrev ? (
                                        <img
                                            src={avatarPrev}
                                            alt={auth?.user?.name}
                                            style={{
                                                width: 96,
                                                height: 96,
                                                borderRadius: '50%',
                                                objectFit: 'cover',
                                                border: '3px solid rgba(255,255,255,0.1)',
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                width: 96,
                                                height: 96,
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, var(--flockr-orange), #ff8c00)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 34,
                                                fontWeight: 700,
                                                color: '#fff',
                                                fontFamily: 'var(--font-display)',
                                                border: '3px solid rgba(255,255,255,0.1)',
                                            }}
                                        >
                                            {(auth?.user?.name ?? 'U')[0].toUpperCase()}
                                        </div>
                                    )}

                                    {editing && (
                                        <button
                                            type="button"
                                            onClick={() => fileRef.current?.click()}
                                            style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                right: 0,
                                                width: 30,
                                                height: 30,
                                                borderRadius: '50%',
                                                background: 'var(--flockr-orange)',
                                                border: '2px solid var(--flockr-black)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}>
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                                                />
                                            </svg>
                                        </button>
                                    )}
                                    <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                                </div>

                                {/* Name + username (view mode) */}
                                {!editing && (
                                    <div style={{ textAlign: 'center' }}>
                                        <p
                                            style={{
                                                color: 'var(--flockr-text)',
                                                fontWeight: 700,
                                                fontSize: 20,
                                                fontFamily: 'var(--font-display)',
                                                margin: 0,
                                            }}
                                        >
                                            {auth?.user?.name}
                                        </p>
                                        <p style={{ color: 'var(--flockr-muted)', fontSize: 14, margin: '4px 0 0' }}>@{auth?.user?.username}</p>
                                        {auth?.user?.role && (
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    marginTop: 8,
                                                    background: 'rgba(255,92,0,0.12)',
                                                    border: '1px solid rgba(255,92,0,0.3)',
                                                    color: 'var(--flockr-orange)',
                                                    borderRadius: 999,
                                                    padding: '3px 12px',
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                }}
                                            >
                                                {auth?.user?.role}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Followers / following — shown for ALL users */}
                                {!editing && (
                                    <div style={{ display: 'flex', gap: 32, marginTop: 4 }}>
                                        {[
                                            { label: 'Following', value: auth?.user?.following_count ?? 0 },
                                            { label: 'Followers', value: auth?.user?.followers_count ?? 0 },
                                            ...(auth?.user?.role === 'seller' ? [{ label: 'Sales', value: auth?.user?.total_sales ?? 0 }] : []),
                                        ].map((s) => (
                                            <div key={s.label} style={{ textAlign: 'center' }}>
                                                <p
                                                    style={{
                                                        color: 'var(--flockr-text)',
                                                        fontWeight: 700,
                                                        fontSize: 18,
                                                        fontFamily: 'var(--font-display)',
                                                        margin: 0,
                                                    }}
                                                >
                                                    {Number(s.value).toLocaleString()}
                                                </p>
                                                <p style={{ color: 'var(--flockr-muted)', fontSize: 12, margin: '2px 0 0' }}>{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── View mode — profile info ────────────────────────── */}
                            {!editing && (
                                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {[
                                        { icon: FiFileText, label: 'Bio', value: auth?.user?.bio },
                                        { icon: FiMapPin, label: 'Location', value: auth?.user?.location },
                                        { icon: FiPhone, label: 'Phone', value: auth?.user?.phone },
                                        { icon: FiMail, label: 'Email', value: auth?.user?.email },
                                    ].map((row) => {
                                        const RowIcon = row.icon;
                                        return (
                                            <div
                                                key={row.label}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 12,
                                                    padding: '14px 16px',
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                }}
                                            >
                                                <RowIcon size={16} color="var(--flockr-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p
                                                        style={{
                                                            color: 'var(--flockr-muted)',
                                                            fontSize: 11,
                                                            fontWeight: 500,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.06em',
                                                            margin: '0 0 3px',
                                                        }}
                                                    >
                                                        {row.label}
                                                    </p>
                                                    <p
                                                        style={{
                                                            color: row.value ? 'var(--flockr-text)' : 'var(--flockr-subtle)',
                                                            fontSize: 14,
                                                            margin: 0,
                                                            lineHeight: 1.5,
                                                        }}
                                                    >
                                                        {row.value || `No ${row.label.toLowerCase()} added`}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* ── Edit mode — form fields ─────────────────────────── */}
                            {editing && (
                                <form onSubmit={submitProfile} style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <FormField label="Full Name" error={errors.name}>
                                        <input
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="Your full name"
                                            style={inputStyle}
                                        />
                                    </FormField>

                                    <FormField label="Username" error={errors.username}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                background: 'var(--flockr-card)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: 12,
                                            }}
                                        >
                                            <span style={{ padding: '0 0 0 14px', color: 'var(--flockr-muted)', fontSize: 14, flexShrink: 0 }}>
                                                @
                                            </span>
                                            <input
                                                value={data.username}
                                                onChange={(e) => setData('username', e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                                                placeholder="username"
                                                style={{ ...inputStyle, border: 'none', background: 'none', paddingLeft: 6, borderRadius: 0 }}
                                            />
                                        </div>
                                    </FormField>

                                    <FormField label="Bio" error={errors.bio}>
                                        <textarea
                                            value={data.bio}
                                            onChange={(e) => setData('bio', e.target.value)}
                                            placeholder="Tell people about yourself..."
                                            maxLength={200}
                                            rows={3}
                                            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                                        />
                                        <p style={{ textAlign: 'right', color: 'var(--flockr-subtle)', fontSize: 11, margin: '4px 0 0' }}>
                                            {data.bio.length}/200
                                        </p>
                                    </FormField>

                                    <FormField label="Location" error={errors.location}>
                                        <input
                                            value={data.location}
                                            onChange={(e) => setData('location', e.target.value)}
                                            placeholder="Lagos, Nigeria"
                                            style={inputStyle}
                                        />
                                    </FormField>

                                    <FormField label="Phone Number" error={errors.phone}>
                                        <input
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.target.value)}
                                            placeholder="08012345678"
                                            type="tel"
                                            style={inputStyle}
                                        />
                                    </FormField>

                                    {/* Mobile save button (also in top bar) */}
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        style={{
                                            width: '100%',
                                            padding: '15px',
                                            borderRadius: 999,
                                            background: 'var(--flockr-orange)',
                                            border: 'none',
                                            color: '#fff',
                                            fontSize: 15,
                                            fontWeight: 700,
                                            fontFamily: 'var(--font-display)',
                                            cursor: 'pointer',
                                            opacity: processing ? 0.7 : 1,
                                            marginTop: 8,
                                        }}
                                    >
                                        {processing ? 'Saving…' : 'Save Changes'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* ════════════════════════════════════════════════════════════
              SECURITY TAB
          ════════════════════════════════════════════════════════════ */}
                    {tab === 'security' && (
                        <div style={{ padding: 16 }}>
                            <SectionCard title="Change Password">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        pwForm.post('/settings/password');
                                    }}
                                    style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                                >
                                    <FormField label="Current Password" error={pwForm.errors.current_password}>
                                        <input
                                            type="password"
                                            value={pwForm.data.current_password}
                                            onChange={(e) => pwForm.setData('current_password', e.target.value)}
                                            placeholder="••••••••"
                                            style={inputStyle}
                                        />
                                    </FormField>
                                    <FormField label="New Password" error={pwForm.errors.password}>
                                        <input
                                            type="password"
                                            value={pwForm.data.password}
                                            onChange={(e) => pwForm.setData('password', e.target.value)}
                                            placeholder="••••••••"
                                            style={inputStyle}
                                        />
                                    </FormField>
                                    <FormField label="Confirm New Password" error={pwForm.errors.password_confirmation}>
                                        <input
                                            type="password"
                                            value={pwForm.data.password_confirmation}
                                            onChange={(e) => pwForm.setData('password_confirmation', e.target.value)}
                                            placeholder="••••••••"
                                            style={inputStyle}
                                        />
                                    </FormField>
                                    <button type="submit" disabled={pwForm.processing} style={primaryBtnStyle}>
                                        {pwForm.processing ? 'Updating…' : 'Update Password'}
                                    </button>
                                </form>
                            </SectionCard>

                            <div style={{ height: 20 }} />

                            <SectionCard title="Danger Zone" style={{ marginTop: 16 }}>
                                <p style={{ color: 'var(--flockr-muted)', fontSize: 13, margin: '0 0 14px' }}>
                                    Once you delete your account, there is no going back.
                                </p>
                                <button
    onClick={async () => {
        if (!confirm('Are you sure? This permanently deletes your account and cannot be undone.')) return
        try {
            await axios.delete('/api/users/me')
            window.location.href = '/'
        } catch {
            alert('Failed to delete account. Please try again.')
        }
    }}
    style={{ width: '100%', padding: '13px', borderRadius: 999, background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.3)', color: 'var(--flockr-red)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
>
    Delete Account
</button>
                            </SectionCard>
                        </div>
                    )}

                    {/* ════════════════════════════════════════════════════════════
              PAYOUTS TAB
          ════════════════════════════════════════════════════════════ */}
                    {tab === 'payouts' && (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {auth?.user?.paystack_subaccount_code && !editingBank ? (
            <>
                {/* CONNECTED STATE */}
                <div
                    style={{
                        position: 'relative',
                        overflow: 'hidden',
                        borderRadius: 28,
                        padding: 24,
                        minHeight: 220,
                        background:
                            'linear-gradient(135deg, #ff5c00 0%, #ff8c00 45%, #ffb347 100%)',
                        boxShadow: '0 20px 60px rgba(255,92,0,0.25)',
                        color: '#fff',
                    }}
                >
                    {/* Glow */}
                    <div
                        style={{
                            position: 'absolute',
                            top: -80,
                            right: -80,
                            width: 220,
                            height: 220,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.12)',
                            filter: 'blur(10px)',
                        }}
                    />

                    <div
                        style={{
                            position: 'relative',
                            zIndex: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                        }}
                    >
                        {/* Top */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <div>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 12,
                                        opacity: 0.8,
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Flockr Payout Card
                                </p>

                                <h3
                                    style={{
                                        margin: '6px 0 0',
                                        fontSize: 22,
                                        fontWeight: 700,
                                        fontFamily: 'var(--font-display)',
                                    }}
                                >
                                    {auth?.user?.name}
                                </h3>
                            </div>

                            <div
                                style={{
                                    width: 54,
                                    height: 54,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backdropFilter: 'blur(10px)',
                                }}
                            >
                                <CardIcon size={24} color="#fff" />
                            </div>
                        </div>

                        {/* Middle */}
                        <div style={{ marginTop: 38 }}>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 11,
                                    opacity: 0.75,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Bank Account
                            </p>

                            <div
                                style={{
                                    marginTop: 10,
                                    fontSize: 28,
                                    fontWeight: 700,
                                    letterSpacing: '0.12em',
                                    fontFamily: 'monospace',
                                }}
                            >
                                **** **** {auth?.user?.account_last4 ?? '4582'}
                            </div>
                        </div>

                        {/* Bottom */}
                        <div
                            style={{
                                marginTop: 'auto',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-end',
                                gap: 12,
                                flexWrap: 'wrap',
                            }}
                        >
                            <div>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 11,
                                        opacity: 0.7,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Bank
                                </p>

                                <p
                                    style={{
                                        margin: '4px 0 0',
                                        fontSize: 15,
                                        fontWeight: 600,
                                    }}
                                >
                                    {auth?.user?.bank_name ?? 'Nigerian Bank'}
                                </p>
                            </div>

                            <div>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 11,
                                        opacity: 0.7,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Status
                                </p>

                                <div
                                    style={{
                                        marginTop: 5,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        background: 'rgba(255,255,255,0.16)',
                                        padding: '6px 12px',
                                        borderRadius: 999,
                                        fontSize: 12,
                                        fontWeight: 600,
                                    }}
                                >
                                    <FiCheckCircle size={13} />
                                    Active
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                <div
    style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
    }}
>
    <button
        onClick={() => {
            setEditingBank(true);
        }}
        style={{
            height: 52,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'var(--flockr-card)',
            color: 'var(--flockr-text)',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
        }}
    >
        Edit Account
    </button>

    <button
        onClick={async () => {
            const confirmed = confirm(
                'Remove your payout account?'
            );

            if (!confirmed) return;

            try {
                await axios.delete('/settings/bank');

                window.location.reload();
            } catch (error) {
                alert('Failed to remove bank account.');
            }
        }}
        style={{
            height: 52,
            borderRadius: 16,
            border: '1px solid rgba(255,59,92,0.25)',
            background: 'rgba(255,59,92,0.08)',
            color: 'var(--flockr-red)',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
        }}
    >
        Remove
    </button>
</div>

                {/* INFO */}
                <div
                    style={{
                        background: 'rgba(0,217,126,0.08)',
                        border: '1px solid rgba(0,217,126,0.18)',
                        borderRadius: 16,
                        padding: 16,
                    }}
                >
                    <p
                        style={{
                            color: 'var(--flockr-green)',
                            fontSize: 13,
                            margin: 0,
                            lineHeight: 1.6,
                        }}
                    >
                        Your payouts are enabled and will be transferred automatically
                        after successful order delivery.
                    </p>
                </div>
            </>
        ) : (
            <>
                {/* EMPTY STATE */}
                <div
                    style={{
                        background: 'rgba(14, 165, 233, 0.12)',
                        border: '1px solid rgba(255,179,0,0.2)',
                        borderRadius: 14,
                        padding: '14px 16px',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                    }}
                >
                    <FiInfo size={22} color="var(--flockr-amber)" style={{ flexShrink: 0 }} />

                    <p style={{ color: 'var(--flockr-amber)', fontSize: 13, margin: 0 }}>
                        Connect a bank account to receive your earnings.
                    </p>
                </div>

                <SectionCard title="Bank Account">

                    {editingBank && (
    <button
        onClick={() => setEditingBank(false)}
        style={{
            marginBottom: 12,
            background: 'none',
            border: 'none',
            color: 'var(--flockr-muted)',
            cursor: 'pointer',
            fontSize: 13,
        }}
    >
        Cancel Editing
    </button>
)}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            bankForm.post('/settings/bank', { preserveScroll: true });
                        }}
                    >
                        <FormField label="Bank" error={bankForm.errors.bank_code}>
                            <select
                                value={bankForm.data.bank_code}
                                onChange={(e) => bankForm.setData('bank_code', e.target.value)}
                                style={{ ...inputStyle, appearance: 'none' }}
                                required
                            >
                                <option value="">Select your bank</option>

                                {banks.map((b) => (
                                    <option key={b.code} value={b.code}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Account Number" error={bankForm.errors.account_number}>
                            <input
                                type="text"
                                value={bankForm.data.account_number}
                                onChange={(e) =>
                                    bankForm.setData(
                                        'account_number',
                                        e.target.value.replace(/\D/g, '')
                                    )
                                }
                                placeholder="0123456789"
                                maxLength={10}
                                style={inputStyle}
                                required
                            />
                        </FormField>

                        <button
                            type="submit"
                            disabled={bankForm.processing}
                            style={primaryBtnStyle}
                        >
                            {bankForm.processing
                                ? 'Connecting…'
                                : 'Connect Bank Account'}
                        </button>
                    </form>
                </SectionCard>
            </>
        )}
    </div>
)}
                    {/* ════════════════════════════════════════════════════════════
              NOTIFICATIONS TAB
          ════════════════════════════════════════════════════════════ */}
                    {tab === 'notifications' && (
                        <div style={{ padding: 16 }}>
                            <SectionCard title="Push Notifications">
                                {[
                                    { key: 'new_order', label: 'New Orders', sub: 'When someone buys your product', icon: FiPackage },
                                    { key: 'new_follower', label: 'New Followers', sub: 'When someone follows you', icon: FiUsers },
                                    { key: 'new_comment', label: 'Comments', sub: 'When someone comments on your video', icon: FiMessageCircle },
                                    { key: 'new_like', label: 'Likes', sub: 'When someone likes your video', icon: FiHeart },
                                    { key: 'order_update', label: 'Order Updates', sub: 'Delivery and status changes', icon: FiTruck },
                                    { key: 'promotions', label: 'Promotions', sub: 'Deals and special offers from Flockr', icon: FiGift },
                                ].map((item, i, arr) => {
                                    const ItemIcon = item.icon;
                                    return (
                                        <div
                                            key={item.key}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 14,
                                                padding: '14px 0',
                                                borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 38,
                                                    height: 38,
                                                    borderRadius: 10,
                                                    flexShrink: 0,
                                                    background: 'rgba(255,255,255,0.06)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <ItemIcon size={18} color="var(--flockr-muted)" />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ color: 'var(--flockr-text)', fontSize: 14, fontWeight: 500, margin: 0 }}>{item.label}</p>
                                                <p style={{ color: 'var(--flockr-muted)', fontSize: 12, margin: '2px 0 0' }}>{item.sub}</p>
                                            </div>
                                            <ToggleSwitch
                                                defaultOn={auth?.user?.notification_preferences?.[item.key] !== false}
                                                onChange={(val) => axios.patch('/settings/notifications', { [item.key]: val }).catch(() => {})}
                                            />
                                        </div>
                                    );
                                })}
                            </SectionCard>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

ProfileSettings.layout = (page) => <AppLayout>{page}</AppLayout>;

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, children }) {
    return (
        <div
            style={{
                background: 'var(--flockr-card)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16,
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}
            >
                <p style={{ color: 'var(--flockr-text)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, margin: 0 }}>{title}</p>
            </div>
            <div style={{ padding: '16px' }}>{children}</div>
        </div>
    );
}

function FormField({ label, error, children }) {
    return (
        <div>
            <p
                style={{
                    color: 'var(--flockr-muted)',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    margin: '0 0 7px',
                }}
            >
                {label}
            </p>
            {children}
            {error && <p style={{ color: 'var(--flockr-red)', fontSize: 12, margin: '5px 0 0' }}>{error}</p>}
        </div>
    );
}

function ToggleSwitch({ defaultOn, onChange }) {
    const [on, setOn] = useState(defaultOn);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span
                style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: on ? 'var(--flockr-green)' : 'var(--flockr-muted)',
                    minWidth: 22,
                    textAlign: 'right',
                    transition: 'color 0.2s',
                }}
            >
                {on ? 'ON' : 'OFF'}
            </span>
            <button
                type="button"
                onClick={() => {
                    const next = !on;
                    setOn(next);
                    onChange(next);
                }}
                aria-pressed={on}
                style={{
                    width: 50,
                    height: 28,
                    borderRadius: 999,
                    border: 'none',
                    background: on ? 'var(--flockr-green)' : 'rgba(255,255,255,0.12)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.25s',
                    flexShrink: 0,
                }}
            >
                <span
                    style={{
                        position: 'absolute',
                        top: 3,
                        left: on ? 25 : 3,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                        transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                />
            </button>
        </div>
    );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle = {
    width: '100%',
    padding: '13px 14px',
    background: 'var(--flockr-card)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: 'var(--flockr-text)',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
};

const primaryBtnStyle = {
    width: '100%',
    padding: '14px',
    background: 'var(--flockr-orange)',
    border: 'none',
    borderRadius: 999,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function PersonIcon({ size = 20, color = 'currentColor' }) {
    return (
        <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.8}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
        </svg>
    );
}
function LockIcon({ size = 20, color = 'currentColor' }) {
    return (
        <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.8}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
        </svg>
    );
}
function CardIcon({ size = 20, color = 'currentColor' }) {
    return (
        <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.8}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
            />
        </svg>
    );
}
function BellIcon({ size = 20, color = 'currentColor' }) {
    return (
        <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.8}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
        </svg>
    );
}
