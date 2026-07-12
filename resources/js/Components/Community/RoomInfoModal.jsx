import { RiCloseLine, RiLockLine, RiGlobalLine, RiGroupLine } from 'react-icons/ri'

export default function RoomInfoModal({ room, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.7)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(400px,92vw)', zIndex: 901, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, padding: 24, textAlign: 'center' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
          <RiCloseLine size={16} />
        </button>

        <img src={room.avatar_url} alt="" style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.12)', margin: '8px auto 14px' }} />

        <p style={{ color: '#fff', fontWeight: 800, fontSize: 19, margin: '0 0 4px' }}>{room.name}</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
          {room.is_private ? <RiLockLine size={13} color="rgba(255,255,255,0.4)" /> : <RiGlobalLine size={13} color="rgba(255,255,255,0.4)" />}
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{room.is_private ? 'Private room' : 'Public room'}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <RiGroupLine size={13} color="rgba(255,255,255,0.4)" />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{room.members_count} members</span>
        </div>

        {room.description ? (
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6, margin: '0 0 8px' }}>{room.description}</p>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: '0 0 8px', fontStyle: 'italic' }}>No description yet.</p>
        )}

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: '10px 0 0' }}>Hosted by @{room.seller?.username}</p>
      </div>
    </>
  )
}