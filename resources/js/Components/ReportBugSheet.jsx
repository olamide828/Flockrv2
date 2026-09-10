import { useState } from 'react'
import axios from 'axios'
import { RiCloseLine, RiBugLine } from 'react-icons/ri'

export default function ReportBugSheet({ onClose, showToast }) {
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState(false)

    const submit = async () => {
        if (!message.trim()) return
        setSubmitting(true)
        try {
            await axios.post('/api/self-reports', { type: 'bug', message: message.trim() })
            setDone(true)
        } catch { showToast?.('Could not submit report.', 'error') }
        finally { setSubmitting(false) }
    }

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 980, background: 'rgba(0,0,0,0.7)' }} />
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 981, maxWidth: 420, margin: '0 auto', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', borderRadius: '22px 22px 0 0', padding: '10px 20px calc(20px + env(safe-area-inset-bottom,0px))' }}>
                <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)', margin: '4px auto 16px' }} />
                <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, width: 28, height: 28, borderRadius: '50%', border: 'none', color: '#fff', cursor: 'pointer' }}><RiCloseLine size={18} /></button>
                {done ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Thanks for reporting this</p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Our team will take a look.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <RiBugLine size={20} color="#FF6B35" />
                            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Report a Bug</span>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12.5, marginBottom: 14 }}>Describe what went wrong — include what you were doing when it happened.</p>
                        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} maxLength={1000} placeholder="What happened?" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 13, resize: 'none', outline: 'none', marginBottom: 14 }} />
                        <button onClick={submit} disabled={!message.trim() || submitting} style={{ width: '100%', padding: 13, borderRadius: 999, background: '#FF6B35', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: !message.trim() || submitting ? 0.5 : 1 }}>{submitting ? 'Submitting…' : 'Submit Report'}</button>
                    </>
                )}
            </div>
        </>
    )
}