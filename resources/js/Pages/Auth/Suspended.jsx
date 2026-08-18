import { useState } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import { RiLockLine, RiTimeLine, RiMailLine, RiCheckboxCircleLine, RiLogoutBoxLine } from 'react-icons/ri'

function fmtDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Suspended({ suspendedAt, reason, appeal }) {
    const { flash } = usePage().props
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const submitAppeal = (e) => {
        e.preventDefault()
        if (!message.trim() || submitting) return
        setSubmitting(true)
        router.post('/suspended/appeal', { message: message.trim() }, {
            onFinish: () => setSubmitting(false),
            onSuccess: () => setMessage(''),
        })
    }

    return (
        <>
            <Head title="Account Suspended" />
            <div className="sp-page">
                <div className="sp-card">
                    <div className="sp-icon"><RiLockLine size={26} /></div>
                    <h1>Account Suspended</h1>
                    <p className="sp-sub">Your Flockr account has been temporarily suspended.</p>

                    {reason && (
                        <div className="sp-reason">
                            <p className="sp-reason-label">Reason given</p>
                            <p className="sp-reason-text">{reason}</p>
                        </div>
                    )}

                    {suspendedAt && (
                        <div className="sp-meta">
                            <RiTimeLine size={13} /> Suspended on {fmtDate(suspendedAt)}
                        </div>
                    )}

                    <div className="sp-divider" />

                    {flash?.success && <div className="sp-flash sp-flash-success">{flash.success}</div>}
                    {flash?.error && <div className="sp-flash sp-flash-error">{flash.error}</div>}

                    {appeal?.status === 'pending' ? (
                        <div className="sp-appeal-status">
                            <RiCheckboxCircleLine size={18} color="#FF6B35" />
                            <div>
                                <p className="sp-appeal-status-title">Appeal under review</p>
                                <p className="sp-appeal-status-sub">Submitted {fmtDate(appeal.submitted_at)}. Our team will get back to you.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={submitAppeal} className="sp-form">
                            <label className="sp-label">Request a review</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Explain why you believe this suspension should be reviewed..."
                                rows={4}
                                maxLength={1000}
                            />
                            <button type="submit" disabled={!message.trim() || submitting}>
                                {submitting ? 'Submitting…' : 'Submit for Review'}
                            </button>
                        </form>
                    )}

                    <div className="sp-footer">
                        <a href="mailto:support@flockr.ng" className="sp-contact"><RiMailLine size={13} /> support@flockr.ng</a>
                        <button onClick={() => router.post('/logout')} className="sp-logout"><RiLogoutBoxLine size={13} /> Log Out</button>
                    </div>
                </div>
            </div>

            <style>{`
                * { box-sizing: border-box; }
                .sp-page { min-height: 100vh; background: #0a0a0a; display: flex; align-items: center; justify-content: center; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
                .sp-card { width: 100%; max-width: 440px; background: #121212; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 36px 32px; }
                .sp-icon { width: 56px; height: 56px; border-radius: 16px; background: rgba(255,107,53,0.1); border: 1px solid rgba(255,107,53,0.2); display: flex; align-items: center; justify-content: center; color: #FF6B35; margin-bottom: 20px; }
                .sp-card h1 { color: #fff; font-size: 22px; font-weight: 800; margin: 0 0 8px; letter-spacing: -0.4px; }
                .sp-sub { color: rgba(255,255,255,0.5); font-size: 14px; line-height: 1.6; margin: 0 0 20px; }
                .sp-reason { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; }
                .sp-reason-label { color: rgba(255,255,255,0.35); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 5px; }
                .sp-reason-text { color: rgba(255,255,255,0.75); font-size: 13px; line-height: 1.6; margin: 0; }
                .sp-meta { display: flex; align-items: center; gap: 6; gap: 6px; color: rgba(255,255,255,0.35); font-size: 12px; margin-bottom: 20px; }
                .sp-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 4px 0 20px; }
                .sp-flash { padding: 10px 14px; border-radius: 12px; font-size: 12.5px; margin-bottom: 16px; }
                .sp-flash-success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: #10B981; }
                .sp-flash-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #EF4444; }
                .sp-appeal-status { display: flex; gap: 10px; padding: 14px 16px; background: rgba(255,107,53,0.06); border: 1px solid rgba(255,107,53,0.18); border-radius: 14px; }
                .sp-appeal-status-title { color: #fff; font-weight: 700; font-size: 13.5px; margin: 0 0 3px; }
                .sp-appeal-status-sub { color: rgba(255,255,255,0.45); font-size: 12px; margin: 0; line-height: 1.5; }
                .sp-form { display: flex; flex-direction: column; gap: 10px; }
                .sp-label { color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
                .sp-form textarea { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 13px 14px; color: #fff; font-size: 13.5px; font-family: inherit; line-height: 1.6; resize: none; outline: none; }
                .sp-form textarea:focus { border-color: rgba(255,107,53,0.4); }
                .sp-form button { padding: 13px; border-radius: 999px; background: #FF6B35; border: none; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }
                .sp-form button:disabled { opacity: 0.4; cursor: not-allowed; }
                .sp-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 22px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.06); }
                .sp-contact, .sp-logout { display: flex; align-items: center; gap: 5px; background: none; border: none; color: rgba(255,255,255,0.4); font-size: 12px; text-decoration: none; cursor: pointer; }
                .sp-logout:hover, .sp-contact:hover { color: rgba(255,255,255,0.7); }
            `}</style>
        </>
    )
}