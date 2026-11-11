import { Head, Link } from '@inertiajs/react'
import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { RiCheckboxCircleFill, RiCloseCircleFill, RiTimeLine, RiMusic2Fill, RiUploadCloud2Line, RiDeleteBinLine } from 'react-icons/ri'
import Toast, { useToast } from '@/Components/Toast'
import ConfirmModal from '@/Components/Community/ConfirmModal'
import { Spinner } from '../../Components/Upload/ui'

const mute = { color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.6 }
const card = { background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 16, marginBottom: 14 }
const inp = { width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 11, color: '#fff', padding: '12px 13px', fontSize: 14, outline: 'none', fontFamily: 'inherit' }
const STATUS = {
    pending:  { label: 'In review', color: '#FBBF24', Icon: RiTimeLine },
    approved: { label: 'Live', color: '#34D399', Icon: RiCheckboxCircleFill },
    rejected: { label: 'Not approved', color: '#F87171', Icon: RiCloseCircleFill },
}

function Field({ label, hint, error, children }) {
    return (
        <label style={{ display: 'block', marginBottom: 14 }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>{label}</span>
            {children}
            {hint && !error && <span style={{ ...mute, fontSize: 12, display: 'block', marginTop: 4 }}>{hint}</span>}
            {error && <span style={{ color: '#F87171', fontSize: 12, display: 'block', marginTop: 4 }}>{error}</span>}
        </label>
    )
}

function Check({ checked, onChange, error, children }) {
    return (
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, accentColor: '#FF6B35', flexShrink: 0 }} />
            <span style={{ fontSize: 13, lineHeight: 1.55, color: error ? '#F87171' : 'rgba(255,255,255,0.8)' }}>{children}</span>
        </label>
    )
}

/** Artist submission programme: an artist submits a track, admin reviews it, approved tracks join the sound library with credit. */
export default function Submit({ genres = [], terms, contact, prefill }) {
    const { showToast, ToastComponent } = useToast()
    const authed = !!prefill
    const [f, setF] = useState({ title: '', artist: prefill?.stage_name || '', genre: '', artist_link: '', legal_name: '', contact_email: prefill?.contact_email || '', own_it: false, allow_use: false, can_remove: false })
    const [audio, setAudio] = useState(null)
    const [cover, setCover] = useState(null)
    const [busy, setBusy] = useState(false)
    const [errs, setErrs] = useState({})
    const [done, setDone] = useState(false)
    const [mine, setMine] = useState(null)
    const [confirm, setConfirm] = useState(null)
    const [showTerms, setShowTerms] = useState(false)
    const audioRef = useRef(null)
    const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))
    const tick = k => v => setF(p => ({ ...p, [k]: v }))

    const load = useCallback(() => {
        if (!authed) return
        axios.get('/api/artist/submissions').then(r => setMine(r.data)).catch(() => setMine([]))
    }, [authed])
    useEffect(load, [load])

    const submit = async () => {
        setErrs({})
        if (!audio) { setErrs({ audio: 'Choose your audio file.' }); return }
        const fd = new FormData()
        Object.entries(f).forEach(([k, v]) => fd.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : v))
        fd.append('audio', audio)
        if (cover) fd.append('cover', cover)
        setBusy(true)
        try {
            await axios.post('/api/artist/submissions', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
            setDone(true)
            setAudio(null); setCover(null)
            setF(p => ({ ...p, title: '', genre: '', own_it: false, allow_use: false, can_remove: false }))
            load()
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (e) {
            const d = e.response?.data
            if (d?.errors) setErrs(Object.fromEntries(Object.entries(d.errors).map(([k, v]) => [k, v[0]])))
            showToast(d?.message || (e.response?.status === 413 ? 'That file is too large.' : 'Upload failed. Check your connection and try again.'), 'error')
        } finally { setBusy(false) }
    }

    const withdraw = (s) => setConfirm({
        title: 'Withdraw this track?', message: `"${s.title}" will no longer be offered on Flockr. Videos already made with it stay up but show no playable sound.`, confirmLabel: 'Withdraw',
        onConfirm: async () => { try { await axios.delete(`/api/artist/submissions/${s.id}`); showToast('Track withdrawn', 'success'); load() } catch { showToast('Could not withdraw', 'error') } },
    })

    return (
        <div style={{ minHeight: '100dvh', background: '#0a0a0a', color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
            <Head title="Submit your music · Flockr" />
            {ToastComponent}
            <div style={{ maxWidth: 620, margin: '0 auto', padding: '22px 16px 80px' }}>
                <Link href="/" style={{ ...mute, textDecoration: 'none' }}>← Back to Flockr</Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 6px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#FF6B35,#FF3D6E)', display: 'grid', placeItems: 'center' }}><RiMusic2Fill size={22} /></div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Submit your music</h1>
                </div>
                <p style={{ ...mute, fontSize: 14 }}>Get your track into the Flockr sound library. Creators use it in their videos, and every video links back to you.</p>

                <div style={{ ...card, display: 'grid', gap: 10 }}>
                    {[['Credited every time', 'Your name and profile link show on each video that uses your track.'], ['You stay in control', 'Your music stays yours. Ask us to remove it at any time.'], ['Reviewed by a person', 'We listen and check you are the artist before anything goes live.']].map(([t, d]) => (
                        <div key={t}><b style={{ fontSize: 13 }}>{t}</b><div style={mute}>{d}</div></div>
                    ))}
                </div>

                {!authed ? (
                    <div style={card}>
                        <p style={{ margin: '0 0 12px', fontSize: 14 }}>Sign in or create a free account to submit.</p>
                        <Link href="/login" style={{ display: 'inline-block', padding: '11px 20px', borderRadius: 12, background: 'linear-gradient(135deg,#FF6B35,#FF3D6E)', color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>Sign in</Link>
                    </div>
                ) : (<>
                    {done && (
                        <div style={{ padding: 16, borderRadius: 14, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#6EE7B7', fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
                            Submitted. We sent a confirmation to your email and will write again once we have reviewed it. You can submit another track below.
                        </div>
                    )}

                    <div style={card}>
                        <Field label="Track title" error={errs.title}><input style={inp} value={f.title} onChange={set('title')} maxLength={80} placeholder="e.g. Lagos Nights" /></Field>
                        <Field label="Artist / stage name" hint="This is the name credited on videos." error={errs.artist}><input style={inp} value={f.artist} onChange={set('artist')} maxLength={80} /></Field>
                        <Field label="Genre" error={errs.genre}>
                            <select style={inp} value={f.genre} onChange={set('genre')}>
                                <option value="">Choose a genre</option>
                                {genres.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </Field>

                        <Field label="Audio file" hint="MP3, M4A, WAV or OGG, up to 200MB." error={errs.audio}>
                            <input ref={audioRef} type="file" accept="audio/*" hidden onChange={e => setAudio(e.target.files?.[0] || null)} />
                            <button type="button" onClick={() => audioRef.current?.click()} style={{ ...inp, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <RiUploadCloud2Line size={18} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{audio ? audio.name : 'Choose file'}</span>
                            </button>
                        </Field>
                        <Field label="Cover art (optional)" error={errs.cover}>
                            <input type="file" accept="image/*" onChange={e => setCover(e.target.files?.[0] || null)} style={{ ...mute, fontSize: 13 }} />
                        </Field>

                        <Field label="Proof you are the artist" hint="A link to your page where this track or your name appears: Audiomack, Spotify, Apple Music, YouTube or your Instagram." error={errs.artist_link}>
                            <input style={inp} value={f.artist_link} onChange={set('artist_link')} inputMode="url" placeholder="https://" />
                        </Field>
                        <Field label="Your legal name" hint="Kept private. Used only for our records." error={errs.legal_name}><input style={inp} value={f.legal_name} onChange={set('legal_name')} maxLength={120} /></Field>
                        <Field label="Contact email" error={errs.contact_email}><input style={inp} type="email" value={f.contact_email} onChange={set('contact_email')} /></Field>
                    </div>

                    <div style={card}>
                        <b style={{ fontSize: 14, display: 'block', marginBottom: 10 }}>Rights</b>
                        <Check checked={f.own_it} onChange={tick('own_it')} error={errs.own_it}>I wrote and own this track, including the recording, or I have written permission from everyone who does (producers, labels, co-writers, sample owners).</Check>
                        <Check checked={f.allow_use} onChange={tick('allow_use')} error={errs.allow_use}>I allow Flockr to host this track and offer it as a sound that creators can use in videos on Flockr. This is non-exclusive, so I can still release it anywhere else.</Check>
                        <Check checked={f.can_remove} onChange={tick('can_remove')} error={errs.can_remove}>I understand I can ask for the track to be removed at any time, and that Flockr may remove it if the rights turn out to be someone else's.</Check>
                        <button type="button" onClick={() => setShowTerms(s => !s)} style={{ background: 'none', border: 'none', color: '#FF6B35', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>{showTerms ? 'Hide' : 'Read'} the artist terms</button>
                        {showTerms && (
                            <div style={{ ...mute, marginTop: 10, padding: 12, borderRadius: 11, background: 'rgba(255,255,255,0.04)' }}>
                                <p style={{ margin: '0 0 8px' }}><b>Flockr artist terms (version {terms})</b></p>
                                <p style={{ margin: '0 0 8px' }}>1. You keep all rights to your track. You give Flockr a non-exclusive licence to host, stream and let users attach the track to videos on Flockr, including the copies of those videos shared or downloaded from Flockr.</p>
                                <p style={{ margin: '0 0 8px' }}>2. Flockr credits you by name and links to your profile on the sound page and on videos that use it.</p>
                                <p style={{ margin: '0 0 8px' }}>3. You confirm you have every right needed to grant this licence and that nothing in the track infringes anyone else's rights.</p>
                                <p style={{ margin: '0 0 8px' }}>4. You can ask us to remove the track at any time{contact ? ` by writing to ${contact}` : ''}, or withdraw it yourself on this page. Videos already posted will keep their picture but lose the sound.</p>
                                <p style={{ margin: 0 }}>5. Flockr does not pay for this licence. We may reject or remove any track at our discretion.</p>
                            </div>
                        )}
                    </div>

                    <button onClick={submit} disabled={busy} style={{ width: '100%', padding: '15px 0', border: 'none', borderRadius: 14, cursor: busy ? 'default' : 'pointer', background: 'linear-gradient(135deg,#FF6B35,#FF3D6E)', color: '#fff', fontSize: 15, fontWeight: 800, opacity: busy ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {busy ? <><Spinner /> Uploading…</> : 'Submit for review'}
                    </button>

                    <h2 style={{ fontSize: 17, fontWeight: 800, margin: '30px 0 10px' }}>My submissions</h2>
                    {mine === null ? <Spinner /> : mine.length === 0 ? <p style={mute}>Nothing submitted yet.</p> : mine.map(s => {
                        const st = STATUS[s.status] || STATUS.pending
                        return (
                            <div key={s.id} style={{ ...card, display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: st.color, fontSize: 12, fontWeight: 700, marginTop: 3 }}><st.Icon size={14} /> {st.label}</div>
                                    {s.status === 'rejected' && s.note && <div style={{ ...mute, fontSize: 12, marginTop: 5 }}>Reason: {s.note}</div>}
                                    {s.status === 'approved' && <Link href={s.path} style={{ color: '#FF6B35', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>View sound page</Link>}
                                </div>
                                <button onClick={() => withdraw(s)} aria-label="Withdraw" style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, width: 36, height: 36, color: '#fff', cursor: 'pointer' }}><RiDeleteBinLine size={16} /></button>
                            </div>
                        )
                    })}
                </>)}
            </div>
            {confirm && <ConfirmModal title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger onConfirm={() => { confirm.onConfirm(); setConfirm(null) }} onClose={() => setConfirm(null)} />}
        </div>
    )
}

Submit.layout = page => page
