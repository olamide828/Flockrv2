import { useState, useEffect } from 'react'
import axios from 'axios'
import { RiCloseLine, RiCheckLine, RiVipCrownLine, RiLoader4Line } from 'react-icons/ri'

export default function ProPlansSheet({ onClose }) {
    const [plans, setPlans] = useState(null)
    const [loading, setLoading] = useState(true)
    const [checkingOut, setCheckingOut] = useState(null)

    useEffect(() => {
        axios.get('/subscriptions/plans').then(r => setPlans(r.data)).finally(() => setLoading(false))
    }, [])

    const subscribe = async (planKey) => {
        setCheckingOut(planKey)
        try {
            const { data } = await axios.post('/subscriptions/checkout', { plan: planKey })
            window.location.href = data.authorization_url
        } catch {
            setCheckingOut(null)
        }
    }

    const FEATURES = {
        free:    ['Upload & sell videos', 'Basic profile'],
        monthly: ['Everything in Free', 'Blue verification badge', 'Seller analytics dashboard', 'Video engagement boost', 'Reduced 3% commission', 'Background chat animations'],
        yearly:  ['Everything in Monthly', '2 months free'],
    }

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.75)' }} />
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301, maxHeight: '88vh', overflowY: 'auto', background: '#111', borderRadius: '24px 24px 0 0', padding: '20px 20px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <RiVipCrownLine size={20} color="#FBBF24" />
                        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>Flockr Pro</h2>
                    </div>
                    <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <RiCloseLine size={16} />
                    </button>
                </div>

                {loading && <div style={{ textAlign: 'center', padding: '40px 0' }}><RiLoader4Line size={24} color="#FF6B35" style={{ animation: 'spin 0.8s linear infinite' }} /></div>}

                {!loading && plans && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Free */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 18 }}>
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>Free</p>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 12px' }}>Your current plan</p>
                            {FEATURES.free.map(f => <FeatureRow key={f} label={f} />)}
                        </div>

                        {['monthly', 'yearly'].map(key => {
                            const p = plans.plans[key]
                            return (
                                <div key={key} style={{ position: 'relative', background: key === 'yearly' ? 'linear-gradient(135deg, rgba(255,107,53,0.12), rgba(255,140,0,0.06))' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${key === 'yearly' ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 18, padding: 18 }}>
                                    {key === 'yearly' && (
                                        <span style={{ position: 'absolute', top: -10, right: 16, background: '#FF6B35', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 999 }}>BEST VALUE</span>
                                    )}
                                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>{p.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '0 0 12px' }}>
                                        <span style={{ color: '#FF6B35', fontWeight: 800, fontSize: 22 }}>₦{p.amount.toLocaleString()}</span>
                                        {p.discount_applied && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textDecoration: 'line-through' }}>₦{p.original_amount.toLocaleString()}</span>}
                                        {p.discount_applied && <span style={{ color: '#10B981', fontSize: 11, fontWeight: 700 }}>5% off first sub</span>}
                                    </div>
                                    {FEATURES[key].map(f => <FeatureRow key={f} label={f} />)}
                                    <button onClick={() => subscribe(key)} disabled={checkingOut === key}
                                        style={{ width: '100%', marginTop: 14, padding: 13, background: '#FF6B35', border: 'none', borderRadius: 999, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: checkingOut === key ? 0.6 : 1 }}>
                                        {checkingOut === key ? 'Redirecting…' : `Subscribe ${p.label}`}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </>
    )
}

function FeatureRow({ label }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <RiCheckLine size={13} color="#10B981" style={{ flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{label}</span>
        </div>
    )
}