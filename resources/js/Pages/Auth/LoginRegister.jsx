import { Head, Link, useForm } from '@inertiajs/react'
import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { RiCheckLine, RiCloseLine, RiEyeLine, RiEyeOffLine, RiLoader4Line, RiMovie2Line, RiShoppingBag3Line } from 'react-icons/ri'
import AuthShell, { BackButton, Field } from '@/Components/Auth/AuthShell'

const orange = 'var(--flockr-orange, #FF6B35)'

function PasswordInput({ value, onChange, placeholder = '••••••••', autoComplete, autoFocus }) {
    const [show, setShow] = useState(false)
    return (
        <div className="relative">
            <input type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} className="input-flockr pr-11" autoComplete={autoComplete} autoFocus={autoFocus} required />
            <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-flockr-muted hover:text-white" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 0, padding: 4 }}>
                {show ? <RiEyeOffLine size={18} /> : <RiEyeLine size={18} />}
            </button>
        </div>
    )
}

export function Login() {
    const { data, setData, post, processing, errors } = useForm({ email: '', password: '', remember: false })
    const submit = async (e) => {
        e.preventDefault()
        await axios.get('/sanctum/csrf-cookie')
        post('/login')
    }
    return (
        <>
            <Head title="Log in" />
            <AuthShell title="Welcome back" subtitle="Log in to your Flockr account" back={<BackButton href="/" />}
                footer={<>Don't have an account? <Link href="/register" className="text-flockr-orange font-medium hover:underline">Sign up free</Link></>}>
                <form onSubmit={submit} className="space-y-4">
                    <Field label="Email" error={errors.email}>
                        <input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} placeholder="you@example.com" className="input-flockr" autoComplete="email" required />
                    </Field>
                    <Field label="Password" error={errors.password}>
                        <PasswordInput value={data.password} onChange={(e) => setData('password', e.target.value)} autoComplete="current-password" />
                    </Field>
                    <div className="flex items-center justify-between text-sm">
                        <label className="text-flockr-muted flex cursor-pointer items-center gap-2">
                            <input type="checkbox" checked={data.remember} onChange={(e) => setData('remember', e.target.checked)} className="bg-flockr-card text-flockr-orange rounded border-white/20" />
                            Remember me
                        </label>
                        <Link href="/forgot-password" className="text-flockr-muted transition-colors hover:text-white">Forgot password?</Link>
                    </div>
                    <button type="submit" disabled={processing} className="btn-primary w-full py-3.5 text-base">{processing ? 'Logging in...' : 'Log In'}</button>
                </form>
            </AuthShell>
        </>
    )
}

const STEPS = ['role', 'name', 'email', 'username', 'password']
// which step owns which server error
const FIELD_STEP = { role: 0, name: 1, email: 2, phone: 2, username: 3, password: 4, password_confirmation: 4 }

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
    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        name: '', username: '', email: '', phone: '', password: '', password_confirmation: '', role: 'buyer',
    })
    const [usernameEdited, setUsernameEdited] = useState(false)
    const [status, setStatus] = useState(null) // checking | available | taken
    const [suggestions, setSuggestions] = useState([])
    const reqRef = useRef(0)

    // Start from the name, like Instagram does, until they type their own
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
        if (!u || u.length < 3) { setStatus(null) }
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

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    const pwScore = strength(data.password)
    const valid = [
        true,
        data.name.trim().length >= 2,
        emailOk,
        data.username.length >= 3 && status !== 'taken' && status !== 'checking',
        data.password.length >= 8 && data.password === data.password_confirmation,
    ]

    const next = () => { if (valid[step] && step < STEPS.length - 1) { clearErrors(); setStep(step + 1) } }
    const back = () => setStep(s => Math.max(0, s - 1))

    const submit = async (e) => {
        e.preventDefault()
        if (step < STEPS.length - 1) return next()
        if (!valid[step]) return
        await axios.get('/sanctum/csrf-cookie')
        post('/register', {
            onError: (errs) => {
                const first = Math.min(...Object.keys(errs).map(k => FIELD_STEP[k] ?? 4))
                setStep(first)
            },
        })
    }

    const titles = [
        ['What brings you to Flockr?', 'You can change this later'],
        ["What's your name?", 'This is how people will see you'],
        ["What's your email?", "We'll send a 6-digit code to confirm it"],
        ['Pick a username', 'Up to 15 characters: letters, numbers, _ and .'],
        ['Create a password', 'At least 8 characters'],
    ]

    return (
        <>
            <Head title="Sign up" />
            <AuthShell title={titles[step][0]} subtitle={titles[step][1]} progress={(step + 1) / STEPS.length}
                back={step === 0 ? <BackButton href="/login" label="Log in" /> : <BackButton onClick={back} />}
                footer={step === 0 ? <>Already have an account? <Link href="/login" className="text-flockr-orange font-medium hover:underline">Log in</Link></> : null}>
                <form onSubmit={submit} className="space-y-4">
                    {step === 0 && (
                        <div className="grid gap-3">
                            {[{ v: 'buyer', l: 'I want to shop', s: 'Discover & buy from Nigerian sellers', I: RiShoppingBag3Line }, { v: 'seller', l: 'I want to sell', s: 'Sell with videos and a store page', I: RiMovie2Line }].map(r => {
                                const on = data.role === r.v
                                return (
                                    <button key={r.v} type="button" onClick={() => setData('role', r.v)}
                                        className="flex items-center gap-3 rounded-2xl border p-4 text-left transition-all"
                                        style={{ borderColor: on ? orange : 'rgba(255,255,255,0.1)', background: on ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.03)' }}>
                                        <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: on ? orange : 'rgba(255,255,255,0.08)', color: '#fff' }}><r.I size={22} /></span>
                                        <span><span className="block font-semibold text-white">{r.l}</span><span className="text-flockr-muted text-xs">{r.s}</span></span>
                                        {on && <RiCheckLine className="ml-auto" size={20} color={orange} />}
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {step === 1 && (
                        <Field label="Full name" error={errors.name}>
                            <input autoFocus type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Full name" className="input-flockr" maxLength={100} autoComplete="name" />
                        </Field>
                    )}

                    {step === 2 && (
                        <>
                            <Field label="Email" error={errors.email}>
                                <input autoFocus type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} placeholder="you@example.com" className="input-flockr" autoComplete="email" />
                            </Field>
                            <Field label="Phone (optional)" error={errors.phone}>
                                <input type="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} placeholder="+234XXXXXXXXXX" className="input-flockr" autoComplete="tel" />
                            </Field>
                        </>
                    )}

                    {step === 3 && (
                        <Field label="Username" error={errors.username}>
                            <div className="relative">
                                <span className="text-flockr-muted absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">@</span>
                                <input autoFocus type="text" value={data.username} maxLength={15} className="input-flockr pl-8 pr-10" placeholder="yourusername"
                                    onChange={(e) => { setUsernameEdited(true); setData('username', e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 15)) }} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ display: 'flex' }}>
                                    {status === 'checking' && <RiLoader4Line className="animate-spin text-flockr-muted" size={16} />}
                                    {status === 'available' && <RiCheckLine className="text-emerald-400" size={16} />}
                                    {status === 'taken' && <RiCloseLine className="text-red-400" size={16} />}
                                </span>
                            </div>
                            <p className="text-flockr-muted text-right text-[11px]">{data.username.length}/15</p>
                            {status === 'taken' && <p className="text-xs text-red-400">That username is taken.</p>}
                            {suggestions.length > 0 && (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="text-flockr-muted text-xs">{status === 'taken' ? 'Try:' : 'Ideas:'}</span>
                                    {suggestions.map(s => (
                                        <button key={s} type="button" onClick={() => { setUsernameEdited(true); setData('username', s) }}
                                            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-flockr-orange hover:bg-white/[0.08]">{s}</button>
                                    ))}
                                </div>
                            )}
                        </Field>
                    )}

                    {step === 4 && (
                        <>
                            <Field label="Password" error={errors.password}>
                                <PasswordInput value={data.password} onChange={(e) => setData('password', e.target.value)} autoComplete="new-password" autoFocus />
                                <div className="mt-2 flex gap-1">
                                    {[0, 1, 2, 3].map(i => <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i < pwScore ? (pwScore <= 1 ? '#EF4444' : pwScore === 2 ? '#EAB308' : '#10B981') : 'rgba(255,255,255,0.1)' }} />)}
                                </div>
                                <p className="text-flockr-muted text-xs">{data.password ? ['Too weak', 'Weak', 'Okay', 'Good', 'Strong'][pwScore] : 'Use 8+ characters with numbers and a symbol'}</p>
                            </Field>
                            <Field label="Confirm password" error={errors.password_confirmation || (data.password_confirmation && data.password !== data.password_confirmation ? "Passwords don't match" : null)}>
                                <PasswordInput value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} autoComplete="new-password" />
                            </Field>
                            <p className="text-flockr-muted text-xs leading-relaxed">
                                By signing up, you agree to our <Link href="/terms" className="text-flockr-orange hover:underline">Terms</Link> and <Link href="/privacy" className="text-flockr-orange hover:underline">Privacy Policy</Link>.
                            </p>
                        </>
                    )}

                    <button type="submit" disabled={!valid[step] || processing} className="btn-primary w-full py-3.5 text-base" style={{ opacity: valid[step] ? 1 : 0.5 }}>
                        {step < STEPS.length - 1 ? 'Continue' : processing ? 'Creating account...' : `Create ${data.role === 'seller' ? 'seller ' : ''}account`}
                    </button>
                </form>
            </AuthShell>
        </>
    )
}
