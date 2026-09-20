import { useState } from 'react'
import axios from 'axios'
import { RiArrowLeftLine, RiCheckLine } from 'react-icons/ri'

const PRODUCT_REPORT_REASONS = [
  'Counterfeit or fake item',
  'Item not as described',
  'Prohibited or unsafe item',
  'Misleading price',
  'Scam or fraud',
  'Other',
]

export default function ReportProductModal({ product, onClose }) {
  const [reason, setReason]           = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState(false)
  const [error, setError]             = useState(null)

  const handleSubmit = async () => {
    if (!reason) return
    setSubmitting(true)
    setError(null)
    try {
      await axios.post(`/api/products/${product.id}/report`, { reason, description: description.trim() || undefined })
      setDone(true)
    } catch (e) {
      setError(e.response?.data?.message ?? 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
          <RiArrowLeftLine size={18} />
        </button>
        <div>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Report Product</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '2px 0 0' }}>{product.name}</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 16px', maxWidth: 520, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 340, gap: 16, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RiCheckLine size={32} color="#10B981" />
            </div>
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>Report Submitted</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6, margin: 0, maxWidth: 300 }}>Thanks — our team will review this listing.</p>
            <button onClick={onClose} style={{ marginTop: 8, padding: '12px 32px', background: '#FF6B35', border: 'none', borderRadius: 999, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Why are you reporting this?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PRODUCT_REPORT_REASONS.map(r => (
                  <button key={r} onClick={() => setReason(r)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 14, cursor: 'pointer', background: reason === r ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${reason === r ? '#FF6B35' : 'rgba(255,255,255,0.07)'}`, color: reason === r ? '#FF6B35' : '#fff', fontSize: 14 }}>
                    {r}
                    {reason === r && <RiCheckLine size={14} color="#FF6B35" />}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Additional details (optional)" maxLength={500} rows={3}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px', color: '#fff', fontSize: 14, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 20 }} />
            {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{error}</p>}
            <button onClick={handleSubmit} disabled={!reason || submitting}
              style={{ width: '100%', padding: '15px', background: reason ? '#FF6B35' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 16, color: reason ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: 700, cursor: reason ? 'pointer' : 'default' }}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}