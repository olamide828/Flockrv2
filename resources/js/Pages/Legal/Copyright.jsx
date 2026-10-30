import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import { S, Spinner } from '../../Components/Upload/ui'

/** Public copyright policy + takedown form. No account needed to report. */
export default function Copyright({ email, target }) {
    const [f, setF] = useState({ claimant_name: '', claimant_email: '', details: '', link: '', confirm: false })
    const [busy, setBusy] = useState(false)
    const [done, setDone] = useState(false)
    const [errs, setErrs] = useState({})
    const [err, setErr] = useState('')
    const set = k => e => setF(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

    // Accept a pasted link: .../video/ULID or .../sound/ID
    const parseLink = (l) => {
        const v = l.match(/video\/([0-9A-Za-z]{20,})/); if (v) return { video: v[1] }
        const s = l.match(/sound\/(\d+)/); if (s) return { sound_id: Number(s[1]) }
        return {}
    }

    const submit = async () => {
        setBusy(true); setErrs({}); setErr('')
        try {
            const body = { claimant_name: f.claimant_name, claimant_email: f.claimant_email, details: f.details, confirm: f.confirm ? 1 : 0, ...(target?.sound_id ? { sound_id: target.sound_id } : {}), ...(target?.video ? { video: target.video } : {}), ...parseLink(f.link) }
            await axios.post('/api/copyright-claim', body)
            setDone(true)
        } catch (e) {
            const d = e.response?.data
            if (d?.errors) setErrs(Object.fromEntries(Object.entries(d.errors).map(([k, v]) => [k, v[0]])))
            else setErr(d?.message || 'Could not send. Please try again.')
        } finally { setBusy(false) }
    }

    const p = { margin: '0 0 12px', color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.6 }
    const lbl = { ...S.smallLabel, margin: '12px 0 6px' }

    return (
        <div style={{ minHeight: '100dvh', background: '#0a0a0a', color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
            <Head title="Copyright & takedowns" />
            <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 18px 60px' }}>
                <h1 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800 }}>Copyright &amp; takedowns</h1>
                <p style={p}>Flockr sellers confirm they own or have permission to use everything they post, music included. If something on Flockr uses your work without permission, tell us below. We review every report, remove infringing content quickly, and suspend sellers who repeatedly infringe.</p>
                <p style={p}>You do not need an account to report.{email ? <> You can also email <a href={`mailto:${email}`} style={{ color: '#FF6B35' }}>{email}</a>.</> : null}</p>

                {done ? (
                    <div style={{ padding: 18, borderRadius: 14, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#6EE7B7', fontSize: 14 }}>Thank you. We have your report and will act on it quickly.</div>
                ) : (
                    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 16 }}>
                        {target?.label && <p style={{ margin: 0, color: '#FFB08F', fontSize: 13, fontWeight: 700 }}>Reporting: {target.label}</p>}
                        {!target?.label && (<>
                            <p style={lbl}>Link to the video or sound *</p>
                            <input value={f.link} onChange={set('link')} placeholder="https://…/video/… or …/sound/…" style={S.inp} />
                        </>)}
                        <p style={lbl}>Your name *</p>
                        <input value={f.claimant_name} onChange={set('claimant_name')} style={S.inp} />
                        {errs.claimant_name && <p style={S.errTxt}>{errs.claimant_name}</p>}
                        <p style={lbl}>Your email *</p>
                        <input type="email" value={f.claimant_email} onChange={set('claimant_email')} style={S.inp} />
                        {errs.claimant_email && <p style={S.errTxt}>{errs.claimant_email}</p>}
                        <p style={lbl}>What is the problem? Which work is yours? *</p>
                        <textarea value={f.details} onChange={set('details')} rows={5} maxLength={4000} style={{ ...S.inp, resize: 'vertical', lineHeight: 1.5 }} />
                        {errs.details && <p style={S.errTxt}>{errs.details}</p>}
                        <label style={{ display: 'flex', gap: 9, marginTop: 14, color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.45, cursor: 'pointer' }}>
                            <input type="checkbox" checked={f.confirm} onChange={set('confirm')} style={{ marginTop: 2, accentColor: '#FF6B35', flexShrink: 0 }} />
                            <span>I am the rights holder or authorised to act for them, and the information above is accurate.</span>
                        </label>
                        {errs.confirm && <p style={S.errTxt}>{errs.confirm}</p>}
                        {err && <div style={{ ...S.errBanner, marginTop: 12 }}>{err}</div>}
                        <button onClick={submit} disabled={busy} style={{ ...S.primaryBtn, width: '100%', marginTop: 16, opacity: busy ? 0.7 : 1 }}>{busy ? <Spinner /> : 'Send report'}</button>
                    </div>
                )}
            </div>
        </div>
    )
}

Copyright.layout = page => page
