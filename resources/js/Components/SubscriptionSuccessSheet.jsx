import { useMemo } from 'react'
import { RiCloseLine, RiVerifiedBadgeLine, RiCalendarCheckLine } from 'react-icons/ri'

const CONFETTI_COLORS = ['#3B82F6', '#60A5FA', '#93C5FD', '#FBBF24', '#FF6B35']

function ConfettiBurst() {
    const pieces = useMemo(() => Array.from({ length: 50 }, (_, i) => {
        const angle = Math.random() * 360
        const distance = 100 + Math.random() * 200
        const dx = Math.cos(angle * Math.PI / 180) * distance
        const dy = Math.sin(angle * Math.PI / 180) * distance
        return {
            id: i,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            dx, dy,
            delay: Math.random() * 0.15,
            duration: 1 + Math.random() * 0.6,
            size: 6 + Math.random() * 8,
            rotate: Math.random() * 720 - 360,
            round: Math.random() > 0.5,
        }
    }), [])

    return (
        <div style={{ position: 'absolute', top: '18%', left: '50%', width: 0, height: 0, zIndex: 1, pointerEvents: 'none' }}>
            {pieces.map(p => (
                <span key={p.id} style={{
                    position: 'absolute', top: 0, left: 0,
                    width: p.size, height: p.size,
                    background: p.color,
                    borderRadius: p.round ? '50%' : 2,
                    animation: `subConfetti ${p.duration}s ease-out ${p.delay}s forwards`,
                    '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': `${p.rotate}deg`,
                }} />
            ))}
            <style>{`
                @keyframes subConfetti {
                    0%   { transform: translate(0,0) rotate(0deg); opacity: 1; }
                    100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; }
                }
            `}</style>
        </div>
    )
}

export default function SubscriptionSuccessSheet({ subscription, onClose }) {
    const expiresDate = new Date(subscription.expires_at).toLocaleDateString('en-NG', {
        day: 'numeric', month: 'long', year: 'numeric',
    })
    const planLabel = subscription.plan === 'yearly' ? 'Yearly' : 'Monthly'

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.75)' }} />
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401, background: '#111', borderRadius: '24px 24px 0 0', padding: '28px 22px 32px', textAlign: 'center', overflow: 'hidden' }}>
                <ConfettiBurst />

                <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 2 }}>
                    <RiCloseLine size={16} />
                </button>

                <div style={{ position: 'relative', zIndex: 2, width: 64, height: 64, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                    <RiVerifiedBadgeLine size={30} color="#3B82F6" />
                </div>

                <p style={{ position: 'relative', zIndex: 2, color: '#fff', fontSize: 19, fontWeight: 800, margin: '0 0 6px' }}>You're verified! 🎉</p>
                <p style={{ position: 'relative', zIndex: 2, color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
                    Thank you for subscribing to Flockr Pro. Your blue verification badge is now live on your profile.
                </p>

                <div style={{ position: 'relative', zIndex: 2, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px', marginBottom: 22, textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Plan</span>
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{planLabel}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <RiCalendarCheckLine size={13} /> Active until
                        </span>
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{expiresDate}</span>
                    </div>
                </div>

                <button onClick={onClose} style={{ position: 'relative', zIndex: 2, width: '100%', padding: 14, background: '#3B82F6', border: 'none', borderRadius: 999, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                    Okay
                </button>
            </div>
        </>
    )
}