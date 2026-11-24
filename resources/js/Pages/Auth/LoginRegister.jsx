import { Head, Link, useForm } from '@inertiajs/react'
import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { RiCheckLine, RiCloseLine, RiEyeLine, RiEyeOffLine, RiLoader4Line, RiMovie2Line, RiShoppingBag3Line } from 'react-icons/ri'
import AuthShell, { BackButton, IgInput, PrimaryButton } from '@/Components/Auth/AuthShell'

const orange = 'var(--flockr-orange, #FF6B35)'
const link = { color: orange, fontWeight: 700, textDecoration: 'none' }

function EyeToggle({ show, onToggle }) {
    return (
        <button type="button" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'}
            style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 0, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
            {show ? <RiEyeOffLine size={18} style={{ display: 'block' }} /> : <RiEyeLine size={18} style={{ display: 'block' }} />}
        </button>
    )
}

/** Password box with its own show/hide eye */
function PasswordField({ label, value, onChange, error, ...rest }) {
    const [show, setShow] = useState(false)
    return <IgInput label={label} type={show ? 'text' : 'password'} value={value} onChange={onChange} error={error}
        right={<EyeToggle show={show} onToggle={() => setShow(s => !s)} />} {...rest} />
}

export function Login() {
    const { data, setData, post, processing, errors } = useForm({ email: '', password: '', remember: true })
    const submit = (e) => { e.preventDefault(); post('/login') }
    return (
        <>
            <Head title="Log in" />
            <AuthShell title="Log in to see videos and shop from sellers you love"
                footer={<>Don't have an account? <Link href="/register" style={link}>Sign up</Link></>}>
                <form onSubmit={submit} noValidate>
                    <IgInput label="Email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} autoComplete="email" autoCapitalize="none" />
                    <PasswordField label="Password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} autoComplete="current-password" />
                    <PrimaryButton type="submit" disabled={processing || !data.email || !data.password}>{processing ? <RiLoader4Line className="animate-spin" size={18} style={{ display: 'inline-block' }} /> : 'Log in'}</PrimaryButton>
                    <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13 }}>
                        <Link href="/forgot-password" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Forgot password?</Link>
                    </p>
                </form>
            </AuthShell>
        </>
    )
}

// Instagram order: email -> password -> name -> username -> (how will you use it)
const STEPS = ['email', 'password', 'name', 'username', 'role']
// which step owns which server error
const FIELD_STEP = { email: 0, phone: 0, password: 1, password_confirmation: 1, name: 2, username: 3, role: 4 }

const strength = (p) => {
    let s = 0
    if (p.length >= 8) s++
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
    if (/\d/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
}

export function Register() {
    const [step, setStep] = useState(0)
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        name: '', username: '', email: '', phone: '', password: '', password_confirmation: '', role: 'buyer',
    })
    const [usernameEdited, setUsernameEdited] = useState(false)
    const [status, setStatus] = useState(null) // checking | available | taken
    const [suggestions, setSuggestions] = useState([])
    const reqRef = useRef(0)

    // Suggest a username from the name until they type their own
    useEffect(() => {
        if (usernameEdited) return
        const g = data.name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').slice(0, 15)
        setData('username', g)
    }, [data.name])

    // Live availability + ideas (only while on the username step)
    useEffect(() => {
        if (step !== 3) return
        const u = data.username
        const id = ++reqRef.current
        if (!u || u.length < 3) setStatus(null)
        else setStatus('checking')
        const t = setTimeout(async () => {
            try {
                const { data: res } = await axios.get('/api/auth/check-username', { params: { username: u, name: data.name, ideas: 1 } })
                if (id !== reqRef.current) return
                setStatus(res.available === null ? null : res.available ? 'available' : 'taken')
                setSuggestions(res.suggestions ?? [])
            } catch { if (id === reqRef.current) setStatus(null) }
        }, 350)
        return () => clearTimeout(t)
    }, [data.username, step])

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
    const pwScore = strength(data.password)
    const valid = [
        emailOk,
        data.password.length >= 8 && data.password === data.password_confirmation,
        data.name.trim().length >= 2,
        data.username.length >= 3 && status !== 'taken' && status !== 'checking',
        true,
    ]

    const next = () => { if (valid[step] && step < STEPS.length - 1) { clearErrors(); setStep(step + 1) } }
    const back = () => { clearErrors(); setStep(s => Math.max(0, s - 1)) }

    const submit = (e) => {
        e.preventDefault()
        if (step < STEPS.length - 1) return next()
        if (!valid.every(Boolean)) return
        post('/register', {
            onError: (errs) => {
                const keys = Object.keys(errs)
                if (keys.length) setStep(Math.min(...keys.map(k => FIELD_STEP[k] ?? 4)))
            },
        })
    }

    const titles = [
        ['Sign up to shop and sell on Flockr', "We'll send a 6-digit code to confirm your email"],
        ['Create a password', 'Use at least 8 characters'],
        ["What's your name?", 'This is how people will see you'],
        ['Pick a username', 'Up to 15 characters: letters, numbers, _ and .'],
        ['How will you use Flockr?', 'You can change this later'],
    ]

    return (
        <>
            <Head title="Sign up" />
            <AuthShell title={titles[step][0]} subtitle={titles[step][1]}
                back={step > 0 ? <BackButton onClick={back} /> : null}
                footer={step === 0 ? <>Have an account? <Link href="/login" style={link}>Log in</Link></> : null}>
                <form onSubmit={submit} noValidate>
                    {step === 0 && (
                        <>
                            <IgInput label="Email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} autoComplete="email" autoCapitalize="none" autoFocus />
                            <IgInput label="Phone (optional)" type="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} error={errors.phone} autoComplete="tel" />
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <PasswordField label="Password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} autoComplete="new-password" autoFocus />
                            <div style={{ display: 'flex', gap: 4, margin: '0 2px 4px' }}>
                                {[0, 1, 2, 3].map(i => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < pwScore ? (pwScore <= 1 ? '#EF4444' : pwScore === 2 ? '#EAB308' : '#10B981') : 'rgba(255,255,255,0.1)' }} />)}
                            </div>
                            <p style={{ margin: '0 2px 12px', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{data.password ? ['Too weak', 'Weak', 'Okay', 'Good', 'Strong'][pwScore] : 'Tip: mix letters, numbers and a symbol'}</p>
                            <PasswordField label="Confirm password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)}
                                error={errors.password_confirmation || (data.password_confirmation && data.password !== data.password_confirmation ? "Passwords don't match" : null)} autoComplete="new-password" />
                        </>
                    )}

                    {step === 2 && (
                        <IgInput label="Full name" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} maxLength={100} autoComplete="name" autoFocus />
                    )}

                    {step === 3 && (
                        <>
                            <IgInput label="Username" value={data.username} maxLength={15} error={errors.username || (status === 'taken' ? 'That username is taken.' : null)} autoCapitalize="none" autoFocus
                                onChange={(e) => { setUsernameEdited(true); setData('username', e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 15)) }}
                                right={<span style={{ display: 'flex' }}>
                                    {status === 'checking' && <RiLoader4Line className="animate-spin" size={18} color="rgba(255,255,255,0.5)" />}
                                    {status === 'available' && <RiCheckLine size={18} color="#34d399" />}
                                    {status === 'taken' && <RiCloseLine size={18} color="#f87171" />}
                                </span>} />
                            {suggestions.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, margin: '4px 0 6px' }}>
                                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{status === 'taken' ? 'Try:' : 'Ideas:'}</span>
                                    {suggestions.map(s => (
                                        <button key={s} type="button" onClick={() => { setUsernameEdited(true); setData('username', s) }}
                                            style={{ borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', padding: '5px 11px', fontSize: 12, color: orange, cursor: 'pointer' }}>{s}</button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {step === 4 && (
                        <div style={{ display: 'grid', gap: 10, marginBottom: 6 }}>
                            {[{ v: 'buyer', l: 'I want to shop', s: 'Discover & buy from Nigerian sellers', I: RiShoppingBag3Line }, { v: 'seller', l: 'I want to sell', s: 'Sell with videos and a store page', I: RiMovie2Line }].map(r => {
                                const on = data.role === r.v
                                return (
                                    <button key={r.v} type="button" onClick={() => setData('role', r.v)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, textAlign: 'left', cursor: 'pointer', border: `1px solid ${on ? orange : 'rgba(255,255,255,0.14)'}`, background: on ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.03)' }}>
                                        <span style={{ width: 42, height: 42, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: on ? orange : 'rgba(255,255,255,0.08)', color: '#fff', flexShrink: 0 }}><r.I size={21} style={{ display: 'block' }} /></span>
                                        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', color: '#fff', fontWeight: 700, fontSize: 15 }}>{r.l}</span><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{r.s}</span></span>
                                        {on && <RiCheckLine size={20} color="#FF6B35" style={{ flexShrink: 0 }} />}
                                    </button>
                                )
                            })}
                            <p style={{ margin: '6px 2px 0', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                                By signing up you agree to our <Link href="/terms" style={link}>Terms</Link> and <Link href="/privacy" style={link}>Privacy Policy</Link>.
                            </p>
                        </div>
                    )}

                    <PrimaryButton type="submit" disabled={!valid[step] || processing}>
                        {processing ? <RiLoader4Line className="animate-spin" size={18} style={{ display: 'inline-block' }} /> : step < STEPS.length - 1 ? 'Next' : `Create ${data.role === 'seller' ? 'seller ' : ''}account`}
                    </PrimaryButton>
                </form>
            </AuthShell>
        </>
    )
}
