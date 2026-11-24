import { Link, router } from '@inertiajs/react'
import { useState } from 'react'
import { RiArrowLeftLine } from 'react-icons/ri'

/** One wordmark for every auth page: the real logo, or text with the dot in the theme orange if the image is missing. */
export function AuthLogo({ size = 34, center = false }) {
    const [broken, setBroken] = useState(false)
    return (
        <Link href="/" className={`inline-flex items-center gap-2 ${center ? 'justify-center' : ''}`} aria-label="Flockr home">
            {!broken && <img src="/images/flockr_logo_orange.png" alt="" onError={() => setBroken(true)} style={{ height: size, width: 'auto' }} />}
            <span className="font-display font-extrabold text-white" style={{ fontSize: size * 0.85, lineHeight: 1 }}>
                flockr<span style={{ color: 'var(--flockr-orange, #FF6B35)' }}>.</span>
            </span>
        </Link>
    )
}

export function BackButton({ onClick, href, label = 'Back' }) {
    const cls = 'inline-flex items-center gap-1.5 text-sm text-flockr-muted hover:text-white transition-colors'
    const icon = <RiArrowLeftLine size={18} />
    if (href) return <Link href={href} className={cls}>{icon}{label}</Link>
    return <button type="button" onClick={onClick ?? (() => (window.history.length > 1 ? window.history.back() : router.visit('/')))} className={cls}>{icon}{label}</button>
}

export default function AuthShell({ title, subtitle, children, footer, back, progress }) {
    return (
        <div className="bg-flockr-black flex min-h-screen">
            <div className="bg-flockr-surface relative hidden w-[420px] shrink-0 flex-col items-center justify-center overflow-hidden border-r border-white/[0.06] p-10 lg:flex">
                <div className="from-flockr-orange/5 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
                <AuthLogo size={44} center />
                <p className="text-flockr-muted mt-3 max-w-xs text-center text-sm leading-relaxed">Discover products through short videos. Shop from Nigerian sellers without searching.</p>
            </div>
            <div className="flex flex-1 flex-col items-center overflow-y-auto p-6">
                <div className="w-full max-w-md py-4">
                    <div className="mb-6 flex items-center justify-between">
                        <div style={{ minWidth: 70 }}>{back}</div>
                        <div className="lg:hidden"><AuthLogo size={26} /></div>
                        <div style={{ minWidth: 70 }} />
                    </div>
                    {progress != null && (
                        <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.round(progress * 100)}%`, background: 'var(--flockr-orange, #FF6B35)' }} />
                        </div>
                    )}
                    <div className="mb-6">
                        <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
                        {subtitle && <p className="text-flockr-muted mt-1 text-sm">{subtitle}</p>}
                    </div>
                    {children}
                    {footer && <p className="text-flockr-muted mt-6 text-center text-sm">{footer}</p>}
                </div>
            </div>
        </div>
    )
}

export function Field({ label, error, hint, children }) {
    return (
        <div className="space-y-1.5">
            {label && <label className="text-flockr-muted text-xs font-medium uppercase tracking-wider">{label}</label>}
            {children}
            {hint && !error && <p className="text-flockr-muted text-xs">{hint}</p>}
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    )
}
