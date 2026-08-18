import { useState } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import { RiLockLine, RiMailLine, RiCheckboxCircleLine, RiLogoutBoxLine } from 'react-icons/ri'

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
            <div className="sp-screen">
                <div className="sp-inner">
                    <div className="sp-icon"><RiLockLine size={30} /></div>

                    <h1>Your account has been suspended</h1>
                    <p className="sp-sub">
                        You can't access Flockr right now. This usually happens when we detect
                        something that goes against our Terms of Service.
                        {suspendedAt && <> Suspended on <strong>{fmtDate(suspendedAt)}</strong>.</>}
                    </p>

                    {reason && (
                        <div className="sp-reason">
                            <span className="sp-reason-label">Reason given</span>
                            <p>{reason}</p>
                        </div>
                    )}

                    {flash?.success && <div className="sp-flash sp-flash-success">{flash.success}</div>}
                    {flash?.error && <div className="sp-flash sp-flash-error">{flash.error}</div>}

                    {appeal?.status === 'pending' ? (
                        <div className="sp-pending">
                            <RiCheckboxCircleLine size={20} color="#FF6B35" />
                            <div>
                                <p className="sp-pending-title">Your appeal is being reviewed</p>
                                <p className="sp-pending-sub">Submitted {fmtDate(appeal.submitted_at)}. We'll notify you once there's a decision.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={submitAppeal} className="sp-form">
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Tell us why you think this was a mistake…"
                                rows={4}
                                maxLength={1000}
                            />
                            <button type="submit" disabled={!message.trim() || submitting}>
                                {submitting ? 'Submitting…' : 'Request a Review'}
                            </button>
                        </form>
                    )}

                    <div className="sp-links">
                        <a href="mailto:support@flockr.ng"><RiMailLine size={13} /> support@flockr.ng</a>
                        <span className="sp-dot">·</span>
                        <button onClick={() => router.post('/logout')}><RiLogoutBoxLine size={13} /> Log Out</button>
                    </div>
                </div>
            </div>

            <style>{`
                * { box-sizing: border-box; }
                .sp-screen {
                    min-height: 100vh; width: 100%;
                    background: #0a0a0a;
                    display: flex; align-items: center; justify-content: center;
                    padding: 32px 20px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }
                .sp-inner { width: 100%; max-width: 380px; text-align: center; }
                .sp-icon {
                    width: 64px; height: 64px; margin: 0 auto 24px;
                    border-radius: 50%;
                    background: rgba(255,107,53,0.08);
                    display: flex; align-items: center; justify-content: center;
                    color: #FF6B35;
                }
                .sp-inner h1 { color: #fff; font-size: 21px; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.3px; line-height: 1.3; }
                .sp-sub { color: rgba(255,255,255,0.45); font-size: 13.5px; line-height: 1.65; margin: 0 0 24px; }
                .sp-sub strong { color: rgba(255,255,255,0.7); font-weight: 700; }
                .sp-reason { text-align: left; margin-bottom: 24px; }
                .sp-reason-label { display: block; color: rgba(255,255,255,0.3); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
                .sp-reason p { color: rgba(255,255,255,0.65); font-size: 13.5px; line-height: 1.6; margin: 0; }
                .sp-flash { padding: 10px 14px; border-radius: 10px; font-size: 12.5px; margin-bottom: 20px; text-align: left; }
                .sp-flash-success { background: rgba(16,185,129,0.08); color: #10B981; }
                .sp-flash-error { background: rgba(239,68,68,0.08); color: #EF4444; }
                .sp-pending { display: flex; gap: 10px; text-align: left; align-items: flex-start; }
                .sp-pending-title { color: #fff; font-weight: 700; font-size: 13.5px; margin: 0 0 3px; }
                .sp-pending-sub { color: rgba(255,255,255,0.4); font-size: 12px; margin: 0; line-height: 1.5; }
                .sp-form { display: flex; flex-direction: column; gap: 10px; }
                .sp-form textarea {
                    width: 100%; background: none;
                    border: 1px solid rgba(255,255,255,0.14);
                    border-radius: 12px; padding: 12px 14px;
                    color: #fff; font-size: 13.5px; font-family: inherit;
                    line-height: 1.6; resize: none; outline: none;
                }
                .sp-form textarea::placeholder { color: rgba(255,255,255,0.25); }
                .sp-form textarea:focus { border-color: rgba(255,107,53,0.5); }
                .sp-form button {
                    padding: 13px; border-radius: 999px;
                    background: #FF6B35; border: none;
                    color: #fff; font-size: 14px; font-weight: 700; cursor: pointer;
                }
                .sp-form button:disabled { opacity: 0.35; cursor: not-allowed; }
                .sp-links { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 32px; }
                .sp-links a, .sp-links button {
                    display: flex; align-items: center; gap: 5px;
                    background: none; border: none;
                    color: rgba(255,255,255,0.35); font-size: 12px;
                    text-decoration: none; cursor: pointer;
                }
                .sp-links a:hover, .sp-links button:hover { color: rgba(255,255,255,0.6); }
                .sp-dot { color: rgba(255,255,255,0.15); }
            `}</style>
        </>
    )
}