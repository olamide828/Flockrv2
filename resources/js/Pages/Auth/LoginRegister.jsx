import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';

import { RiFlashlightLine, RiLock2Line, RiMovie2Line, RiShoppingBag3Line, RiStore2Line } from 'react-icons/ri';

export function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = async (e) => {
        e.preventDefault();
        await axios.get('/sanctum/csrf-cookie');
        post('/login');
    };

    return (
        <>
            <Head title="Log in" />
            <AuthShell
                title="Welcome back"
                subtitle="Log in to your Flockr account"
                footer={
                    <>
                        Don't have an account?{' '}
                        <Link href="/register" className="text-flockr-orange font-medium hover:underline">
                            Sign up free
                        </Link>
                    </>
                }
            >
                <form onSubmit={submit} className="space-y-4">
                    <Field label="Email" error={errors.email}>
                        <input
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="you@example.com"
                            className="input-flockr"
                            autoComplete="email"
                            required
                        />
                    </Field>

                    <Field label="Password" error={errors.password}>
                        <input
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="••••••••"
                            className="input-flockr"
                            autoComplete="current-password"
                            required
                        />
                    </Field>

                    <div className="flex items-center justify-between text-sm">
                        <label className="text-flockr-muted flex cursor-pointer items-center gap-2">
                            <input
                                type="checkbox"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="bg-flockr-card text-flockr-orange rounded border-white/20"
                            />
                            Remember me
                        </label>

                        <Link href="/forgot-password" className="text-flockr-muted transition-colors hover:text-white">
                            Forgot password?
                        </Link>
                    </div>

                    <button type="submit" disabled={processing} className="btn-primary w-full py-3.5 text-base">
                        {processing ? 'Logging in...' : 'Log In'}
                    </button>
                </form>

                <Divider />

                <SocialButtons />
            </AuthShell>
        </>
    );
}

export function Register() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        role: 'buyer',
    });

    const [usernameEdited, setUsernameEdited] = useState(false);

    // Auto username suggestion
    useEffect(() => {
        if (usernameEdited) return;

        const generated = data.name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_');

        setData('username', generated);
    }, [data.name]);

    const submit = async (e) => {
        e.preventDefault();
        await axios.get('/sanctum/csrf-cookie');
        post('/register');
    };

    return (
        <>
            <Head title="Sign up" />

            <AuthShell
                title="Join Flockr"
                subtitle="Nigeria's video-first marketplace"
                footer={
                    <>
                        Already have an account?{' '}
                        <Link href="/login" className="text-flockr-orange font-medium hover:underline">
                            Log in
                        </Link>
                    </>
                }
            >
                <form onSubmit={submit} className="space-y-4">
                    {/* Role toggle */}
                    <div className="bg-flockr-card grid grid-cols-2 gap-2 rounded-xl border border-white/[0.06] p-1.5">
                        {[
                            {
                                value: 'buyer',
                                label: 'Buyer',
                                sub: 'Discover & shop',
                                icon: RiShoppingBag3Line,
                            },
                            {
                                value: 'seller',
                                label: 'Seller',
                                sub: 'Sell with videos',
                                icon: RiMovie2Line,
                            },
                        ].map((r) => {
                            const active = data.role === r.value;
                            const Icon = r.icon;

                            return (
                                <button
                                    key={r.value}
                                    type="button"
                                    onClick={() => setData('role', r.value)}
                                    className={`relative rounded-lg border px-3 py-2.5 text-center transition-all duration-200 ${
                                        active
                                            ? 'bg-flockr-orange border-flockr-orange shadow-orange-glow text-white'
                                            : 'text-flockr-muted border-transparent hover:text-white'
                                    }`}
                                >
                                    {active && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-white" />}

                                    <div className="flex items-center justify-center gap-1.5">
                                        <Icon className="text-base" />

                                        <p className="text-sm font-semibold">{r.label}</p>
                                    </div>

                                    <p className="mt-0.5 text-[11px] opacity-70">{r.sub}</p>
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Full Name" error={errors.name}>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Full Name"
                                className="input-flockr"
                                required
                            />
                        </Field>

                        <Field label="Username" error={errors.username}>
                            <div className="relative">
                                {/* <span className="absolute left-3 top-1/2 -translate-y-1/2 text-flockr-muted text-sm">
                  @
                </span> */}

                                <input
                                    type="text"
                                    value={data.username}
                                    onChange={(e) => {
                                        setUsernameEdited(true);

                                        setData('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                                    }}
                                    placeholder="@yourusername"
                                    className="input-flockr pl-3"
                                    required
                                />
                            </div>
                        </Field>
                    </div>

                    <Field label="Email" error={errors.email}>
                        <input
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="you@example.com"
                            className="input-flockr"
                            required
                        />
                    </Field>

                    <Field label="Phone Number" error={errors.phone}>
                        <div className="relative">
                            {/* <span className="absolute left-3 top-1/2 -translate-y-1/2 text-flockr-muted text-sm">
                +234
              </span> */}

                            <input
                                type="tel"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                placeholder="+234 Your Number Here"
                                className="input-flockr pl-12"
                            />
                        </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Password" error={errors.password}>
                            <input
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="••••••••"
                                className="input-flockr"
                                required
                            />
                        </Field>

                        <Field label="Confirm Password" error={errors.password_confirmation}>
                            <input
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                placeholder="••••••••"
                                className="input-flockr"
                                required
                            />
                        </Field>
                    </div>

                    <p className="text-flockr-muted text-xs leading-relaxed">
                        By signing up, you agree to our{' '}
                        <Link href="/terms" className="text-flockr-orange hover:underline">
                            Terms
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-flockr-orange hover:underline">
                            Privacy Policy
                        </Link>
                        .
                    </p>

                    <button type="submit" disabled={processing} className="btn-primary w-full py-3.5 text-base">
                        {processing ? 'Creating account...' : `Create ${data.role === 'seller' ? 'Seller' : ''} Account`}
                    </button>
                </form>
            </AuthShell>
        </>
    );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function AuthShell({ title, subtitle, footer, children }) {
    return (
        <div className="bg-flockr-black flex min-h-screen">
            {/* Left panel — brand (desktop) */}
            <div className="bg-flockr-surface relative hidden w-[420px] shrink-0 flex-col items-center justify-center overflow-hidden border-r border-white/[0.06] p-10 lg:flex">
                <div className="from-flockr-orange/5 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />

                <Link href="/" className="font-display font-800 mb-3 text-5xl text-white">
                    flockr<span className="text-flockr-orange">.</span>
                </Link>

                <p className="text-flockr-muted max-w-xs text-center text-sm leading-relaxed">
                    Discover products through short videos. Shop from Nigerian sellers without searching.
                </p>

                <div className="mt-10 grid w-full max-w-xs grid-cols-2 gap-3">
                    {[
                        {
                            icon: RiMovie2Line,
                            label: 'Video-first shopping',
                        },
                        {
                            icon: RiStore2Line,
                            label: 'Built for Nigeria',
                        },
                        {
                            icon: RiFlashlightLine,
                            label: 'Instant checkout',
                        },
                        {
                            icon: RiLock2Line,
                            label: 'Paystack secured',
                        },
                    ].map((f) => {
                        const Icon = f.icon;

                        return (
                            <div key={f.label} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                                <Icon className="text-flockr-orange shrink-0 text-lg" />

                                <p className="text-xs font-medium text-white">{f.label}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right panel — form */}
            <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <Link href="/" className="font-display font-800 mb-8 block text-center text-3xl text-white lg:hidden">
                        flockr<span className="text-flockr-orange">.</span>
                    </Link>

                    <div className="mb-6">
                        <h1 className="font-display text-2xl font-bold text-white">{title}</h1>

                        <p className="text-flockr-muted mt-1 text-sm">{subtitle}</p>
                    </div>

                    {children}

                    {footer && <p className="text-flockr-muted mt-6 text-center text-sm">{footer}</p>}
                </div>
            </div>
        </div>
    );
}

function Field({ label, error, children }) {
    return (
        <div className="space-y-1.5">
            <label className="text-flockr-muted text-xs font-medium tracking-wider uppercase">{label}</label>

            {children}

            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}

function Divider() {
    return (
        <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.08]" />

            <span className="text-flockr-muted text-xs">or continue with</span>

            <div className="h-px flex-1 bg-white/[0.08]" />
        </div>
    );
} 

function SocialButtons() {
    return (
        <div className="grid grid-cols-2 gap-3">
            {' '}
            <a href="/auth/google" className="btn-ghost flex items-center justify-center gap-2 py-2.5 text-sm">
                {' '}
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                </svg>{' '}
                Google{' '}
            </a>{' '}
            <a href="/auth/facebook" className="btn-ghost flex items-center justify-center gap-2 py-2.5 text-sm">
                {' '}
                <svg className="h-4 w-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>{' '}
                Facebook{' '}
            </a>{' '}
        </div>
    );
}
