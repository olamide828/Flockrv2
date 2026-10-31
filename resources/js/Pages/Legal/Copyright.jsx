import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import { S, Spinner } from '../../Components/Upload/ui'

const H = ({ children }) => <h2 style={{ margin: '22px 0 8px', fontSize: 16, fontWeight: 800 }}>{children}</h2>
const P = ({ children }) => <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.66)', fontSize: 14, lineHeight: 1.65 }}>{children}</p>

/** Public copyright page: "Our policy" (default) and "Request removal" (the form). No account needed. */
export default function Copyright({ email, target, tab: initialTab = 'policy' }) {
    const [tab, setTab] = useState(initialTab)
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

    const lbl = { ...S.smallLabel, margin: '12px 0 6px' }
    const tabBtn = (id, label) => (
        <button onClick={() => setTab(id)} style={{ flex: 1, padding: '11px 0', border: 'none', cursor: 'pointer', borderRadius: 12, background: tab === id ? '#fff' : 'transparent', color: tab === id ? '#000' : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 700 }}>{label}</button>
    )

    return (
        <div style={{ minHeight: '100dvh', background: '#0a0a0a', color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
            <Head title="Copyright & content removal" />
            <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 18px 60px' }}>
                <h1 style={{ margin: '0 0 14px', fontSize: 24, fontWeight: 800 }}>Copyright &amp; content removal</h1>
                <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 16, background: 'rgba(255,255,255,0.06)', marginBottom: 18 }}>
                    {tabBtn('policy', 'Our policy')}{tabBtn('report', 'Request removal')}
                </div>

                {tab === 'policy' ? (
                    <div id="policy">
                        <P>Flockr is a place for sellers and creators to show their work. We respect other people&apos;s work and expect everyone who posts here to do the same.</P>
                        <H>What you can post</H>
                        <P>Only post videos, photos, music and other content that you created, own, or have permission to use. That includes the music in your videos. Songs from the sound library and the Free music and Epidemic tabs are cleared for use in videos on Flockr; popular songs you did not license are not.</P>
                        <H>If your work is used without permission</H>
                        <P>Open the <b>Request removal</b> tab, tell us which video or sound it is and which work is yours. You do not need an account. We review every report, and we email you what we decide.</P>
                        <H>What happens next</H>
                        <P>If a report is valid we remove the content, switch off the sound if needed, and tell the seller. If it is not, we tell you why. Mistakes can be corrected: if a seller shows they have the rights, we may restore the content and let you know.</P>
                        <H>Repeat infringement</H>
                        <P>Sellers who are the subject of repeated takedowns (three by default) have their account suspended.</P>
                        <H>If your video was removed</H>
                        <P>Reply to the email we sent you{email ? <> or write to <a href={`mailto:${email}`} style={{ color: '#FF6B35' }}>{email}</a></> : null} and explain why you have the rights. We will review it.</P>
                        <button onClick={() => setTab('report')} style={{ ...S.primaryBtn, width: '100%', marginTop: 16 }}>Request content removal</button>
                    </div>
                ) : done ? (
                    <div style={{ padding: 18, borderRadius: 14, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#6EE7B7', fontSize: 14, lineHeight: 1.6 }}>Thank you. We have your report and sent a confirmation to your email. We will email you our decision.</div>
                ) : (
                    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 16 }}>
                        {target?.label && <p style={{ margin: 0, color: '#FFB08F', fontSize: 13, fontWeight: 700 }}>Reporting: {target.label}</p>}
                        {!target?.label && (<>
                            <p style={lbl}>Link to the video or sound *</p>
                            <input value={f.link} onChange={set('link')} placeholder="https://…/video/… or …/sound/…" style={S.inp} />
                            {errs.details && !f.link && <p style={S.errTxt}>Paste the link to the video or sound.</p>}
                        </>)}
                        <p style={lbl}>Your name *</p>
                        <input value={f.claimant_name} onChange={set('claimant_name')} style={S.inp} />
                        {errs.claimant_name && <p style={S.errTxt}>{errs.claimant_name}</p>}
                        <p style={lbl}>Your email (we send our decision here) *</p>
                        <input type="email" value={f.claimant_email} onChange={set('claimant_email')} style={S.inp} />
                        {errs.claimant_email && <p style={S.errTxt}>{errs.claimant_email}</p>}
                        <p style={lbl}>What is the problem? Which work is yours? *</p>
                        <textarea value={f.details} onChange={set('details')} rows={5} maxLength={4000} style={{ ...S.inp, resize: 'vertical', lineHeight: 1.5 }} />
                        {errs.details && f.link && <p style={S.errTxt}>{errs.details}</p>}
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
