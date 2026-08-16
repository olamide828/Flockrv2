import { useEffect, useState } from 'react'
import axios from 'axios'
import { RiCloseLine, RiLockLine, RiCheckLine } from 'react-icons/ri'

export default function BadgeRoadmapSheet({ onClose }) {
    const [badges, setBadges] = useState(null)

    useEffect(() => {
        axios.get('/api/badges/roadmap').then(r => setBadges(r.data)).catch(() => setBadges([]))
    }, [])

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.8)' }} />
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501, maxHeight: '85vh', overflowY: 'auto', background: '#111', borderRadius: '24px 24px 0 0', padding: '20px 18px 30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: 0 }}>Badge Roadmap</h2>
                    <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <RiCloseLine size={16} />
                    </button>
                </div>

                {badges === null && <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '30px 0' }}>Loading…</p>}

                {badges?.map(b => {
                    const pct = b.progress_target ? Math.min(100, Math.round((b.progress_current / b.progress_target) * 100)) : (b.earned ? 100 : 0)
                    return (
                        <div key={b.key} style={{ display: 'flex', gap: 14, padding: '14px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: b.earned ? 1 : 0.85 }}>
                            <div style={{ position: 'relative', width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <img src={b.image_path} alt={b.label} style={{ width: 36, height: 36, objectFit: 'contain', filter: b.earned ? 'none' : 'grayscale(1) brightness(0.6)' }} />
                                {!b.earned && (
                                    <div style={{ position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#1a1a1a', border: '2px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <RiLockLine size={10} color="rgba(255,255,255,0.5)" />
                                    </div>
                                )}
                                {b.earned && (
                                    <div style={{ position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#10B981', border: '2px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <RiCheckLine size={11} color="#fff" />
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: '0 0 3px' }}>{b.label}</p>
                                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '0 0 8px' }}>{b.requirement_label}</p>
                                {b.progress_target && !b.earned && (
                                    <>
                                        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', marginBottom: 4 }}>
                                            <div style={{ height: '100%', width: `${pct}%`, background: '#FF6B35', borderRadius: 999, transition: 'width 0.4s ease' }} />
                                        </div>
                                        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{b.progress_current}/{b.progress_target}</span>
                                    </>
                                )}
                                {b.earned && <span style={{ color: '#10B981', fontSize: 11, fontWeight: 700 }}>Unlocked</span>}
                            </div>
                        </div>
                    )
                })}
            </div>
        </>
    )
}