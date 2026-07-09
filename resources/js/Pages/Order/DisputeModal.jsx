import { useState } from 'react'
import axios from 'axios'
import { RiArrowLeftLine, RiCheckLine, RiAlertLine } from 'react-icons/ri'

// ─────────────────────────────────────────────────────────────────────────────
// DisputeModal — drop this anywhere in OrderShow.jsx and render it when the
// user clicks "Report a Problem" on a paid/shipped order.
//
// Usage in OrderShow.jsx:
//   const [showDispute, setShowDispute] = useState(false)
//   ...
//   {showDispute && <DisputeModal order={order} onClose={() => setShowDispute(false)} />}
//   ...
//   <button onClick={() => setShowDispute(true)}>Report a Problem</button>
// ─────────────────────────────────────────────────────────────────────────────

const DISPUTE_REASONS = [
  'Item not received',
  'Item is damaged or defective',
  'Item is not as described',
  'Wrong item sent',
  'Seller is unresponsive',
  'I want a refund',
  'Other issue',
]

export default function DisputeModal({ order, onClose }) {
  const [reason,      setReason]      = useState('')
  const [description, setDescription] = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState(null)

  const handleSubmit = async () => {
    if (!reason) return
    setSubmitting(true)
    setError(null)
    try {
      await axios.post(`/api/orders/${order.id}/dispute`, { reason, description })
      setDone(true)
    } catch (e) {
      setError(e.response?.data?.message ?? 'Failed to submit. Please try again.')
    } finally { setSubmitting(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
          <RiArrowLeftLine size={18} />
        </button>
        <div>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Report a Problem</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '2px 0 0', fontFamily: 'monospace' }}>{order.reference}</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 16px', maxWidth: 520, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {done ? (
          /* Success state */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 340, gap: 16, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RiCheckLine size={32} color="#10B981" />
            </div>
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>Dispute Submitted</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6, margin: 0, maxWidth: 320 }}>
              Our team will review your case and get back to you within 24–48 hours. The order status has been updated to "Disputed".
            </p>
            <button onClick={onClose} style={{ marginTop: 8, padding: '12px 32px', background: '#FF6B35', border: 'none', borderRadius: 999, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Back to Order
            </button>
          </div>
        ) : (
          <>
            {/* Order summary */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '14px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <RiAlertLine size={20} color="#EAB308" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>Order from @{order.seller?.username}</p>
                <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>₦{Number(order.total).toLocaleString()} · {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Reason selector */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>What's the problem?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DISPUTE_REASONS.map(r => (
                  <button key={r} onClick={() => setReason(r)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 14, cursor: 'pointer', background: reason === r ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${reason === r ? 'rgba(255,107,53,0.35)' : 'rgba(255,255,255,0.07)'}`, color: reason === r ? '#FF6B35' : '#fff', fontSize: 14, fontWeight: reason === r ? 600 : 400, textAlign: 'left', transition: 'all 0.15s' }}>
                    {r}
                    {reason === r && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <RiCheckLine size={12} color="#fff" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Additional Details <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></p>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what happened in detail. This helps us resolve your case faster."
                maxLength={1000}
                rows={4}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px', color: '#fff', fontSize: 14, lineHeight: 1.5, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: '"DM Sans", sans-serif' }}
              />
              <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'right' }}>{description.length}/1000</p>
            </div>

            {error && (
              <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, marginBottom: 16 }}>
                <p style={{ margin: 0, color: '#EF4444', fontSize: 13 }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              style={{ width: '100%', padding: '15px', background: reason && !submitting ? '#FF6B35' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 16, color: reason ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: 700, cursor: reason && !submitting ? 'pointer' : 'default', transition: 'all 0.2s' }}
            >
              {submitting ? 'Submitting...' : 'Submit Dispute'}
            </button>

            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>
              Our team reviews disputes within 24–48 hours. Both buyer and seller will be contacted.
            </p>
          </>
        )}
      </div>
    </div>
  )
}