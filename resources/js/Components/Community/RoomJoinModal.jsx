import { useState } from 'react'
import { RiCloseLine, RiCheckLine, RiLockLine, RiGlobalLine, RiGroupLine, RiShieldLine, RiArrowLeftLine, RiTimeLine } from 'react-icons/ri'

/**
 * Two-step Discord-style join flow:
 *  Step 1 ("info")    — avatar, name, description, member count, a Continue button
 *  Step 2 ("confirm")  — shown whenever there's something to confirm before
 *                        joining: the room's rules (if any) with an accept
 *                        checkbox, OR — for a private room with no rules —
 *                        a plain "this needs approval" notice. Either way,
 *                        joining a private room ALWAYS requires this second
 *                        tap; it never joins straight from step 1.
 * Public rooms with no rules skip straight from step 1 to joining, since
 * there's nothing to confirm.
 */
export default function RoomJoinModal({ room, onClose, onConfirm }) {
  const hasRules = room.rules?.length > 0
  const needsConfirmStep = hasRules || room.is_private
  const [step, setStep] = useState('info')
  const [agreed, setAgreed] = useState(!hasRules) // nothing to agree to if there are no rules
  const [joining, setJoining] = useState(false)

  const handleContinueClick = () => {
    if (needsConfirmStep) { setStep('confirm'); return }
    confirm()
  }

  const confirm = async () => {
    if (!agreed) return
    if (joining) return
    setJoining(true)
    try { await onConfirm(room) }
    finally { setJoining(false); onClose() }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.75)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(420px,92vw)', zIndex: 901, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

        {step === 'confirm' ? (
          <button onClick={() => setStep('info')} style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 2 }}>
            <RiArrowLeftLine size={16} />
          </button>
        ) : null}
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 2 }}>
          <RiCloseLine size={16} />
        </button>

        {step === 'info' && (
          <>
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
              {room.description ? (
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.6, margin: 0, textAlign: 'center' }}>{room.description}</p>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0, textAlign: 'center', fontStyle: 'italic' }}>No description yet.</p>
              )}
              {room.is_private && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                  <RiTimeLine size={13} />
                  <span>The host will need to approve your request</span>
                </div>
              )}
              {hasRules && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: room.is_private ? 6 : 16, color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                  <RiShieldLine size={13} />
                  <span>This room has {room.rules.length} rule{room.rules.length !== 1 ? 's' : ''} you'll need to accept</span>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              <button onClick={handleContinueClick} style={{ width: '100%', padding: 14, background: '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                Continue to {room.is_private ? 'Request' : 'Join'}
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div style={{ padding: '48px 24px 16px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {hasRules ? <RiShieldLine size={17} color="#FF6B35" /> : <RiTimeLine size={17} color="#FF6B35" />}
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 17, margin: 0 }}>{hasRules ? 'Room Rules' : 'Request to Join'}</p>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
                {hasRules ? `Read and accept to join ${room.name}` : `The host of ${room.name} will need to approve you`}
              </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 18px' }}>
              {hasRules ? (
                room.rules.map((rule, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 }}>
                    <span style={{ color: '#FF6B35', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i + 1}.</span>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.5 }}>{rule}</p>
                  </div>
                ))
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.6, textAlign: 'center', margin: '10px 0' }}>
                  You won't see messages in this room until the host approves your request.
                </p>
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
          </>
        )}
      </div>
    </>
  )
}