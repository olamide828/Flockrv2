import AppLayout from '@/Layouts/AppLayout'
import { Head, router } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import { RiAlertLine, RiShieldCheckLine, RiUserForbidLine } from 'react-icons/ri'

function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function FlaggedSellers({ sellers }) {
    const [busyId, setBusyId] = useState(null)

    const clearFlag = async (user) => {
        setBusyId(user.id)
        try {
            await axios.post(`/api/admin/users/${user.id}/clear-flag`)
            router.reload({ only: ['sellers'] })
        } catch {}
        finally { setBusyId(null) }
    }

    const suspend = async (user) => {
        const reason = prompt(`Reason for suspending @${user.username}:`)
        if (reason === null) return
        setBusyId(user.id)
        try {
            await axios.post(`/api/admin/users/${user.id}/suspend`, { reason })
            router.reload({ only: ['sellers'] })
        } catch {}
        finally { setBusyId(null) }
    }

    return (
        <>
            <Head title="Flagged Sellers" />
            <div className="fs-page">
                <header className="fs-header">
                    <RiAlertLine size={20} color="#EF4444" />
                    <div>
                        <h1>Flagged Sellers</h1>
                        <p>{sellers.total} account{sellers.total !== 1 ? 's' : ''} flagged for repeated off-platform payment warnings</p>
                    </div>
                </header>

                <div className="fs-list">
                    {sellers.data.length === 0 && (
                        <div className="fs-empty">
                            <RiShieldCheckLine size={32} color="rgba(255,255,255,0.15)" />
                            <p>No flagged sellers right now.</p>
                        </div>
                    )}
                    {sellers.data.map(s => (
                        <div key={s.id} className="fs-row">
                            <img src={s.avatar_url} alt={s.name} className="fs-avatar" />
                            <div className="fs-info">
                                <p className="fs-name">{s.name} <span className="fs-username">@{s.username}</span></p>
                                <p className="fs-meta">Flagged {fmtDate(s.flagged_at)} · {s.continued_count} continued / {s.shown_count} shown warnings</p>
                            </div>
                            <div className="fs-actions">
                                <button onClick={() => clearFlag(s)} disabled={busyId === s.id} className="fs-btn fs-btn-clear">Clear Flag</button>
                                <button onClick={() => suspend(s)} disabled={busyId === s.id} className="fs-btn fs-btn-suspend"><RiUserForbidLine size={13} /> Suspend</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                * { box-sizing: border-box; }
                .fs-page { min-height: 100vh; background: #0a0a0a; color: #fff; font-family: "DM Sans", sans-serif; padding: 28px 24px 60px; max-width: 900px; margin: 0 auto; }
                .fs-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
                .fs-header h1 { margin: 0; font-size: 19px; font-weight: 800; }
                .fs-header p { margin: 2px 0 0; font-size: 12.5px; color: rgba(255,255,255,0.4); }
                .fs-list { background: #111; border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; overflow: hidden; }
                .fs-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 0; color: rgba(255,255,255,0.3); font-size: 13px; }
                .fs-row { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.05); }
                .fs-row:first-child { border-top: none; }
                .fs-avatar { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
                .fs-info { flex: 1; min-width: 0; }
                .fs-name { margin: 0; color: #fff; font-weight: 700; font-size: 13.5px; }
                .fs-username { color: rgba(255,255,255,0.35); font-weight: 500; margin-left: 6px; }
                .fs-meta { margin: 3px 0 0; color: rgba(255,255,255,0.4); font-size: 12px; }
                .fs-actions { display: flex; gap: 8px; flex-shrink: 0; }
                .fs-btn { padding: 8px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; display: flex; align-items: center; gap: 5px; }
                .fs-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .fs-btn-clear { background: rgba(16,185,129,0.1); color: #10B981; }
                .fs-btn-suspend { background: rgba(239,68,68,0.1); color: #EF4444; }
            `}</style>
        </>
    )
}

FlaggedSellers.layout = page => <AppLayout>{page}</AppLayout>