import { useState, useEffect } from 'react'
import axios from 'axios'
import { RiCloseLine, RiShieldCheckLine, RiAlertLine, RiLoader4Line, RiStarFill } from 'react-icons/ri'

function fmtJoinDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
}

function Row({ label, value, valueColor }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{label}</span>
            <span style={{ color: valueColor ?? '#fff', fontSize: 13, fontWeight: 700 }}>{value}</span>
        </div>
    )
}

export default function TrustScoreModal({ sellerId, onClose }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        axios.get(`/api/sellers/${sellerId}/trust`)
            .then(({ data }) => setData(data))
            .catch(() => setError('Could not load trust info right now.'))
            .finally(() => setLoading(false))
    }, [sellerId])

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.7)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(400px,90vw)', zIndex: 901, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <RiCloseLine size={16} />
                </button>

                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}>
                        <RiLoader4Line size={22} color="rgba(255,255,255,0.3)" style={{ animation: 'tcSpin 0.8s linear infinite' }} />
                    </div>
                )}

                {error && !loading && <p style={{ color: '#EF4444', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>{error}</p>}

                {data && !loading && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                            {data.avatar_url
                                ? <img src={data.avatar_url} alt={data.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                                : <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>{(data.name ?? 'U')[0].toUpperCase()}</div>
                            }
                            <div>
                                <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>@{data.username}</p>
                                {data.is_verified
                                    ? <p style={{ margin: '1px 0 0', color: '#FF6B35', fontSize: 12, fontWeight: 700 }}>✓ Verified Seller</p>
                                    : data.is_pro
                                        ? <p style={{ margin: '1px 0 0', color: '#3B82F6', fontSize: 12, fontWeight: 700 }}>Verified Pro</p>
                                        : null
                                }
                            </div>
                        </div>

                        {data.high_risk ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, marginBottom: 18 }}>
                                <RiAlertLine size={20} color="#EF4444" style={{ flexShrink: 0 }} />
                                <div>
                                    <p style={{ margin: 0, color: '#EF4444', fontWeight: 700, fontSize: 13 }}>High Risk</p>
                                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                                        {data.reports_30d} report{data.reports_30d !== 1 ? 's' : ''} in the last 30 days. Proceed with extra caution — we recommend Flockr checkout only.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, marginBottom: 18 }}>
                                <RiShieldCheckLine size={20} color="#10B981" style={{ flexShrink: 0 }} />
                                <div>
                                    <p style={{ margin: 0, color: '#10B981', fontWeight: 700, fontSize: 13 }}>Safe to buy</p>
                                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Trust Score {data.trust_score.toFixed(1)}/10</p>
                                </div>
                            </div>
                        )}

                        <Row label="On Flockr since" value={fmtJoinDate(data.joined_at)} />
                        <Row label="Orders completed" value={data.orders_completed.toLocaleString()} />
                        <Row
                            label="Rating"
                            value={data.total_reviews > 0 ? <span><RiStarFill size={12} color="#FBBF24" style={{ verticalAlign: -1, marginRight: 3 }} />{data.avg_rating.toFixed(1)}/5 from {data.total_reviews} buyers</span> : 'No ratings yet'}
                        />
                        <Row label="Return rate" value={`${data.return_rate}%`} />
                        <Row
                            label="Reports (30 days)"
                            value={data.reports_30d}
                            valueColor={data.reports_30d > 0 ? '#EF4444' : undefined}
                        />
                        {data.sells.length > 0 && (
                            <Row label="They sell" value={data.sells.join(', ')} />
                        )}

                        <p style={{ margin: '18px 0 0', color: 'rgba(255,255,255,0.25)', fontSize: 11, lineHeight: 1.5 }}>
                            Trust score is calculated automatically from real order, review, and report data — never editable by the seller.
                        </p>
                    </>
                )}
            </div>
            <style>{`@keyframes tcSpin { to { transform: rotate(360deg); } }`}</style>
        </>
    )
}