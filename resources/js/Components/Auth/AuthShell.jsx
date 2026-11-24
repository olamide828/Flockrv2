import { Link, router } from '@inertiajs/react'
import { useState } from 'react'
import { RiArrowLeftLine } from 'react-icons/ri'

const ORANGE = 'var(--flockr-orange, #FF6B35)'
const LINE = 'rgba(255,255,255,0.14)'

/** Text-only wordmark (no logo image), used on every auth page. */
export function AuthLogo({ size = 34, center = false }) {
    return (
        <Link href="/" className={`inline-flex items-center ${center ? 'justify-center' : ''}`} aria-label="Flockr home" style={{ textDecoration: 'none' }}>
            <span className="font-display font-extrabold text-white" style={{ fontSize: size, lineHeight: 1, letterSpacing: '-0.03em' }}>
                flockr<span style={{ color: ORANGE }}>.</span>
            </span>
        </Link>
    )
}

/** Round arrow-only back button (no "Back" word). Only render it when there is somewhere to go back to. */
export function BackButton({ onClick, href }) {
    const style = { width: 40, height: 40, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }
    const icon = <RiArrowLeftLine size={20} style={{ display: 'block' }} />
    if (href) return <Link href={href} aria-label="Back" style={style}>{icon}</Link>
    return <button type="button" aria-label="Back" onClick={onClick ?? (() => (window.history.length > 1 ? window.history.back() : router.visit('/')))} style={style}>{icon}</button>
}

/**
 * Instagram-style auth page: one centred column on black, wordmark on top, big friendly heading,
 * a second bordered strip underneath for the "Don't have an account? Sign up" line.
 */
export default function AuthShell({ title, subtitle, children, footer, back, wordmark = true }) {
    return (
        <div className="bg-flockr-black" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px', position: 'relative' }}>
            {back && <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 2 }}>{back}</div>}
            <div style={{ width: '100%', maxWidth: 380, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '56px 0 28px' }}>
                <div className="auth-card" style={{ padding: '30px 26px 26px', borderRadius: 14 }}>
                    {wordmark && <div style={{ textAlign: 'center', marginBottom: 18 }}><AuthLogo size={40} center /></div>}
                    <div style={{ textAlign: 'center', marginBottom: 22 }}>
                        <h1 className="font-display" style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{title}</h1>
                        {subtitle && <p style={{ margin: '8px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.45 }}>{subtitle}</p>}
                    </div>
                    {children}
                </div>
                {footer && (
                    <div className="auth-card" style={{ marginTop: 10, padding: '18px 16px', borderRadius: 14, textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{footer}</div>
                )}
            </div>
            <style>{`
              .auth-card { border: 1px solid transparent; }
              @media (min-width: 520px) { .auth-card { border-color: ${LINE}; background: rgba(255,255,255,0.02); } }
            `}</style>
        </div>
    )
}

/** Filled input with a floating label, like Instagram. `right` is an optional element (eye icon, status) shown inside on the right. */
export function IgInput({ label, error, right, value, onChange, type = 'text', ...rest }) {
    const [focus, setFocus] = useState(false)
    const up = focus || (value ?? '') !== ''
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ position: 'relative', background: 'rgba(255,255,255,0.06)', border: `1px solid ${error ? '#ef4444' : focus ? 'rgba(255,255,255,0.4)' : LINE}`, borderRadius: 10, height: 52 }}>
                <label style={{ position: 'absolute', left: 12, top: up ? 7 : 16, fontSize: up ? 11 : 14, color: 'rgba(255,255,255,0.5)', transition: 'all .12s', pointerEvents: 'none' }}>{label}</label>
                <input type={type} value={value} onChange={onChange} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 16, padding: `${up ? 20 : 8}px ${right ? 44 : 12}px 4px 12px`, boxSizing: 'border-box', borderRadius: 10 }} {...rest} />
                {right && <div style={{ position: 'absolute', right: 8, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>{right}</div>}
            </div>
            {error && <p style={{ margin: '5px 2px 0', fontSize: 12, color: '#f87171' }}>{error}</p>}
        </div>
    )
}

export function PrimaryButton({ children, disabled, ...rest }) {
    return (
        <button {...rest} disabled={disabled}
            style={{ width: '100%', height: 46, marginTop: 6, borderRadius: 12, border: 'none', background: ORANGE, color: '#fff', fontSize: 15, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1, transition: 'opacity .15s' }}>
            {children}
        </button>
    )
}

export function OrDivider() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: LINE }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: LINE }} />
        </div>
    )
}

/** Legacy field wrapper (forgot / reset password pages) */
export function Field({ label, error, hint, children }) {
    return (
        <div style={{ marginBottom: 12 }}>
            {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>{label}</label>}
            {children}
            {hint && !error && <p style={{ margin: '5px 2px 0', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{hint}</p>}
            {error && <p style={{ margin: '5px 2px 0', fontSize: 12, color: '#f87171' }}>{error}</p>}
        </div>
    )
}
