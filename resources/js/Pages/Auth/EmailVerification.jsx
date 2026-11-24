import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import AuthShell from '@/Components/Auth/AuthShell'

export function VerifyEmail({ email, cooldown = 0 }) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(cooldown)
  const refs = useRef([])

  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(w => w - 1), 1000); return () => clearTimeout(t) }, [wait])
  useEffect(() => { refs.current[0]?.focus() }, [])

  const submit = async (code) => {
    if (busy) return
    setBusy(true); setError('')
    try {
      const { data } = await axios.post('/email/verify-code', { code })
      router.visit(data.redirect || '/')
    } catch (e) {
      setError(e.response?.data?.message || 'Could not verify the code. Please try again.')
      setDigits(['', '', '', '', '', '']); refs.current[0]?.focus()
    } finally { setBusy(false) }
  }

  const setAt = (i, v) => {
    const d = v.replace(/\D/g, '')
    if (!d) { setDigits(p => p.map((x, k) => k === i ? '' : x)); return }
    if (d.length > 1) { // paste or autofill
      const arr = d.slice(0, 6).split('')
      const next = ['', '', '', '', '', ''].map((_, k) => arr[k] ?? '')
      setDigits(next)
      refs.current[Math.min(arr.length, 5)]?.focus()
      if (arr.length === 6) submit(arr.join(''))
      return
    }
    const next = digits.map((x, k) => k === i ? d : x)
    setDigits(next)
    if (i < 5) refs.current[i + 1]?.focus()
    if (next.every(Boolean)) submit(next.join(''))
  }

  const onKey = (i, e) => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus() }

  const resend = async () => {
    if (wait > 0) return
    setError(''); setInfo('')
    try {
      const { data } = await axios.post('/email/verification-code')
      setWait(data.cooldown ?? 60)
      if (data.ok) setInfo(data.message); else setError(data.message)
    } catch { setError('Could not send a new code. Please try again shortly.') }
  }

  return (
    <>
      <Head title="Verify Email" />
      <AuthShell title="Enter your code" subtitle={email ? `We sent a 6-digit code to ${email}` : 'We sent a 6-digit code to your email'}
        back={<Link href="/logout" method="post" as="button" className="text-flockr-muted hover:text-white text-sm">Log out</Link>}>
        <div className="flex justify-between gap-2" onPaste={(e) => { e.preventDefault(); setAt(0, e.clipboardData.getData('text')) }}>
          {digits.map((d, i) => (
            <input key={i} ref={el => (refs.current[i] = el)} value={d} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={6}
              onChange={e => setAt(i, e.target.value)} onKeyDown={e => onKey(i, e)} aria-label={`Digit ${i + 1}`}
              className="input-flockr text-center font-display text-xl font-bold" style={{ width: 'calc((100% - 40px) / 6)', padding: '14px 0' }} />
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {info && !error && <p className="mt-3 text-sm text-emerald-400">{info}</p>}
        <button onClick={() => submit(digits.join(''))} disabled={busy || digits.some(x => !x)} className="btn-primary mt-5 w-full py-3.5" style={{ opacity: digits.every(Boolean) ? 1 : 0.5 }}>
          {busy ? 'Checking...' : 'Verify'}
        </button>
        <p className="text-flockr-muted mt-5 text-center text-sm">
          Didn't get it?{' '}
          <button onClick={resend} disabled={wait > 0} className="font-medium" style={{ background: 'none', border: 0, color: wait > 0 ? 'rgba(255,255,255,0.35)' : 'var(--flockr-orange, #FF6B35)', cursor: wait > 0 ? 'default' : 'pointer' }}>
            {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
          </button>
        </p>
        <p className="text-flockr-muted mt-2 text-center text-xs">The code expires in 10 minutes. Check your spam folder too.</p>
      </AuthShell>
    </>
  )
}
