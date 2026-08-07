import { RiCloseLine, RiAlarmWarningLine, RiShieldCheckLine } from 'react-icons/ri'

function fmtJoinDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
}

export default function OffPlatformWarningSheet({ seller, onContinue, onPayFlockr, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 980, background: 'rgba(0,0,0,0.75)' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 981, maxWidth: 480, margin: '0 auto', background: '#141414', border: '1px solid rgba(239,68,68,0.25)', borderBottom: 'none', borderRadius: '24px 24px 0 0', padding: '10px 20px calc(20px + env(safe-area-inset-bottom,0px))', animation: 'owSlideUp 0.24s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)', margin: '4px auto 14px' }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <RiCloseLine size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <RiAlarmWarningLine size={20} color="#EF4444" />
          <span style={{ color: '#EF4444', fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em' }}>Scam Warning</span>
        </div>

        {seller && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, marginBottom: 18 }}>
            {seller.avatar_url
              ? <img src={seller.avatar_url} alt={seller.name} style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#ff5c00,#ff8c00)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>{(seller.name ?? 'U')[0].toUpperCase()}</div>
            }
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 14 }}>{seller.name}</p>
              <p style={{ margin: '1px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>@{seller.username}</p>
              {seller.joined_at && <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Joined {fmtJoinDate(seller.joined_at)}</p>}
            </div>
          </div>
        )}

        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.6, margin: '0 0 12px' }}>
          It looks like you're discussing payment outside Flockr.
        </p>

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Risks of paying directly</p>
        <ol style={{ margin: '0 0 18px', paddingLeft: 20, color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.8 }}>
          <li>Flockr can't protect you if you don't get your item.</li>
          <li>Flockr can't refund you.</li>
          <li>Your money could be lost.</li>
        </ol>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, marginBottom: 20 }}>
          <RiShieldCheckLine size={17} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, color: '#fff', fontSize: 13, lineHeight: 1.5 }}>
            <strong>We recommend:</strong> Pay with Flockr checkout. Your money is safe until you confirm delivery.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onPayFlockr} style={{ width: '100%', padding: 15, borderRadius: 999, background: '#FF6B35', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            Pay safely with Flockr
          </button>
          <button onClick={onContinue} style={{ width: '100%', padding: 14, borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            I understand, continue chat
          </button>
        </div>
      </div>
      <style>{`@keyframes owSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </>
  )
}