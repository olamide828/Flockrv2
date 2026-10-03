import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { router } from '@inertiajs/react'
import { RiCloseLine, RiVipDiamondLine, RiLoader4Line } from 'react-icons/ri'
import ProPlansSheet from '@/Components/ProPlansSheet'

function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ProSubscriptionSheet({ onClose }) {
    const [data, setData] = useState(null)
    const [showPlans, setShowPlans] = useState(false)
    useEffect(() => { axios.get('/api/subscriptions/me').then(({ data }) => setData(data)).catch(() => setData({})) }, [])

    if (showPlans) {
    return <ProPlansSheet onClose={() => setShowPlans(false)} />
}

    return createPortal(
        (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 980, background: 'rgba(0,0,0,0.7)' }} />
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 981, maxWidth: 420, margin: '0 auto', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', borderRadius: '22px 22px 0 0', padding: '10px 20px calc(20px + env(safe-area-inset-bottom,0px))' }}>
                <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)', margin: '4px auto 16px' }} />
                <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, width: 28, height: 28, borderRadius: '50%', border: 'none', color: '#fff', cursor: 'pointer' }}><RiCloseLine size={17} /></button>

                {!data ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><RiLoader4Line size={22} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 0.8s linear infinite' }} /></div>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                            <RiVipDiamondLine size={20} color="#FF6B35" />
                            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Flockr Pro</span>
                        </div>

                        {data.has_active ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {[
                                    ['Plan', data.plan === 'yearly' ? 'Yearly' : 'Monthly'],
                                    ['Amount Paid', `₦${Number(data.amount_paid ?? 0).toLocaleString()}`],
                                    ['Platform Fee', `${data.fee_percent}%`],
                                    ['Started', fmtDate(data.starts_at)],
                                    ['Expires', fmtDate(data.expires_at)],
                                ].map(([label, value]) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{label}</span>
                                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{value}</span>
                                    </div>
                                ))}
                                <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 11.5 }}>Subscriptions don't auto-renew — resubscribe before it expires to keep your Pro perks.</p>
                                {(() => {
                             const daysLeft = data.expires_at ? Math.ceil((new Date(data.expires_at) - new Date()) / 86400000) : null
                             const nearExpiry = daysLeft !== null && daysLeft <= 7
                             return nearExpiry ? (
                             <button onClick={() => setShowPlans(true)} style={{ marginTop: 8, width: '100%', padding: 13, borderRadius: 999, background: '#FF6B35', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                             {daysLeft <= 0 ? 'Renew Now' : `Renew — expires in ${daysLeft}d`}
                                </button>
                                ) : null
                             })()}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 18 }}>You're not currently subscribed to Flockr Pro.</p>
                                <button onClick={() => setShowPlans(true)} style={{ width: '100%', padding: 13, borderRadius: 999, background: '#FF6B35', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>View Plans</button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showPlans && <ProPlansSheet onClose={() => setShowPlans(false)} />}
        </>
        ),
    document.body
    )
}