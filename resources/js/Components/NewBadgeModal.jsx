import { RiCloseLine, RiTrophyLine } from 'react-icons/ri'

export default function NewBadgeModal({ badge, onClose }) {
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 601, width: 'min(340px,90vw)', background: '#111', border: '1px solid rgba(255,107,53,0.25)', borderRadius: 24, padding: '32px 24px 24px', textAlign: 'center' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <RiCloseLine size={15} />
                </button>
                <p style={{ color: '#FF6B35', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>
                    <RiTrophyLine size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> New Badge Earned
                </p>
                <div style={{ width: 120, height: 120, borderRadius: 28, background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 12px 40px rgba(255,107,53,0.2)' }}>
                    <img src={badge.image_path} alt={badge.label} style={{ width: 84, height: 84, objectFit: 'contain' }} />
                </div>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '0 0 8px' }}>{badge.label}</p>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.5, margin: '0 0 20px' }}>{badge.description}</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: '0 0 20px' }}>Find all your badges on your profile</p>
                <button onClick={onClose} style={{ width: '100%', padding: 13, background: '#FF6B35', border: 'none', borderRadius: 999, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    Nice!
                </button>
            </div>
        </>
    )
}