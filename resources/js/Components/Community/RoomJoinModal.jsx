import { useState } from 'react'
import { RiCloseLine, RiCheckLine, RiLockLine, RiGlobalLine, RiGroupLine, RiShieldLine } from 'react-icons/ri'

/**
 * Discord-style "you're about to join a server" confirmation.
 * Always shows avatar / name / description / member count.
 * If the room has rules, they're listed and the accept toggle is required
 * before the button activates. If there are no rules, the button is active
 * immediately — no empty toggle for nothing to agree to.
 */
export default function RoomJoinModal({ room, onClose, onConfirm }) {
  const hasRules = room.rules?.length > 0
  const [agreed, setAgreed] = useState(!hasRules)
  const [joining, setJoining] = useState(false)

  const confirm = async () => {
    if (!agreed || joining) return
    setJoining(true)
    try { await onConfirm(room) }
    finally { setJoining(false); onClose() }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.75)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(420px,92vw)', zIndex: 901, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 2 }}>
          <RiCloseLine size={16} />
        </button>

        {/* Banner / avatar */}
        <div style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.25), rgba(255,107,53,0.05))', padding: '32px 24px 20px', textAlign: 'center', flexShrink: 0 }}>
          <img src={room.avatar_url} alt="" style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid #111', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }} />
          <p style={{ color: '#fff', fontWeight: 800, fontSize: 20, margin: '14px 0 4px' }}>{room.name}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {room.is_private ? <RiLockLine size={12} color="rgba(255,255,255,0.5)" /> : <RiGlobalLine size={12} color="rgba(255,255,255,0.5)" />}
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{room.is_private ? 'Private room' : 'Public room'}</span>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
            <RiGroupLine size={12} color="rgba(255,255,255,0.5)" />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{room.members_count} members</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
          {room.description && (
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.6, margin: '0 0 18px', textAlign: 'center' }}>{room.description}</p>
          )}

          {hasRules && (
            <div style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <RiShieldLine size={15} color="#FF6B35" />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Room Rules</span>
              </div>
              {room.rules.map((rule, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 }}>
                  <span style={{ color: '#FF6B35', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i + 1}.</span>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.5 }}>{rule}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          {hasRules && (
            <button onClick={() => setAgreed(a => !a)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 14, padding: 0 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${agreed ? '#FF6B35' : 'rgba(255,255,255,0.25)'}`, background: agreed ? '#FF6B35' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                {agreed && <RiCheckLine size={13} color="#fff" />}
              </div>
              <span style={{ color: agreed ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'left' }}>
                I've read and agree to follow these rules
              </span>
            </button>
          )}
          <button onClick={confirm} disabled={!agreed || joining}
            style={{ width: '100%', padding: 14, background: agreed ? '#FF6B35' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 14, color: agreed ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: 15, cursor: agreed ? 'pointer' : 'default', transition: 'all 0.2s' }}>
            {joining ? '...' : (room.is_private ? 'Request to Join' : 'Join Room')}
          </button>
        </div>
      </div>
    </>
  )
}