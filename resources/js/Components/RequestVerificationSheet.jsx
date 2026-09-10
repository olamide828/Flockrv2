// RequestVerificationSheet.jsx — full rewrite, adds the checklist fetch + render
import { useState, useEffect } from 'react'
import axios from 'axios'
import { RiCloseLine, RiShieldCheckLine, RiCheckLine, RiCloseCircleLine } from 'react-icons/ri'

export default function RequestVerificationSheet({ onClose, showToast }) {
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState(false)
    const [eligibility, setEligibility] = useState(null)

    useEffect(() => {
        axios.get('/api/verification-eligibility').then(({ data }) => setEligibility(data)).catch(() => {})
    }, [])

    const submit = async () => {
        if (!message.trim()) return
        setSubmitting(true)
        try {
            await axios.post('/api/self-reports', { type: 'verification', message: message.trim() })
            setDone(true)
        } catch { showToast?.('Could not submit request.', 'error') }
        finally { setSubmitting(false) }
    }

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 980, background: 'rgba(0,0,0,0.7)' }} />
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 981, maxWidth: 420, margin: '0 auto', maxHeight: '85vh', overflowY: 'auto', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', borderRadius: '22px 22px 0 0', padding: '10px 20px calc(20px + env(safe-area-inset-bottom,0px))' }}>
                <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)', margin: '4px auto 16px' }} />
                <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, width: 28, height: 28, borderRadius: '50%', border: 'none', color: '#fff', cursor: 'pointer' }}><RiCloseLine size={18} /></button>
                {done ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Request submitted</p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Our team will review your account for verification.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <RiShieldCheckLine size={20} color="#FF6B35" />
                            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Request Verification</span>
                        </div>

                        {eligibility && (
                            <div style={{ marginBottom: 16 }}>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 8 }}>Eligibility criteria</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {eligibility.criteria.map(c => (
                                        <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                                            {c.met ? <RiCheckLine size={15} color="#10B981" /> : <RiCloseCircleLine size={15} color="#EF4444" />}
                                            <span style={{ flex: 1, color: c.met ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 12.5 }}>{c.label}</span>
                                            {c.value && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{c.value}</span>}
                                        </div>
                                    ))}
                                </div>
                                {!eligibility.all_met && (
                                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11.5, marginTop: 8 }}>You can still submit — meeting all criteria just strengthens your case.</p>
                                )}
                            </div>
                        )}

                        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} maxLength={1000} placeholder="Explain your case..." style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 13, resize: 'none', outline: 'none', marginBottom: 14 }} />
                        <button onClick={submit} disabled={!message.trim() || submitting} style={{ width: '100%', padding: 13, borderRadius: 999, background: '#FF6B35', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: !message.trim() || submitting ? 0.5 : 1 }}>{submitting ? 'Submitting…' : 'Submit Request'}</button>
                    </>
                )}
            </div>
        </>
    )
}