import { useState } from 'react'
import axios from 'axios'
import {
  RiCloseLine, RiAlertLine, RiImageAddLine, RiLoader4Line, RiCheckLine,
} from 'react-icons/ri'

const REASONS = [
  'Item not received',
  'Item damaged or defective',
  'Wrong item received',
  'Item not as described',
  'Seller is unresponsive',
  'Other',
]

export default function DisputeModal({ order, onClose, onSubmitted }) {
  const [reason,       setReason]       = useState('')
  const [description,  setDescription]  = useState('')
  const [photoFiles,   setPhotoFiles]   = useState([])
  const [photoPreviews,setPhotoPreviews]= useState([])
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState('')

  const handlePhoto = e => {
    const files = Array.from(e.target.files ?? []).slice(0, 3 - photoFiles.length)
    if (!files.length) return
    setPhotoFiles(prev => [...prev, ...files])
    setPhotoPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
    e.target.value = ''
  }
  const removePhoto = i => {
    URL.revokeObjectURL(photoPreviews[i])
    setPhotoFiles(prev => prev.filter((_, idx) => idx !== i))
    setPhotoPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async () => {
    if (!reason)              { setError('Please select a reason.'); return }
    if (!description.trim())  { setError('Please describe what went wrong.'); return }
    setError('')
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('reason', reason)
      fd.append('description', description.trim())
      photoFiles.forEach(f => fd.append('photos[]', f))
      const { data } = await axios.post(`/api/orders/${order.id}/disputes`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onSubmitted?.(data.dispute)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to submit dispute.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 560, background: '#0f0f0f', borderRadius: '28px 28px 0 0', maxHeight: '90vh', overflowY: 'auto', zIndex: 1, paddingBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
          <div style={{ width: 44, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RiAlertLine size={18} color="#F59E0B" />
          </div>
          <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 700, flex: 1 }}>Report a Problem</h3>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <RiCloseLine size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            Order <strong style={{ color: '#fff' }}>{order.reference}</strong> — our team reviews disputes within 24–48 hours.
          </p>

          <div>
            <p style={lbSt}>What went wrong? *</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {REASONS.map(r => (
                <button key={r} type="button" onClick={() => setReason(r)}
                  style={{ textAlign: 'left', padding: '11px 14px', borderRadius: 12, background: reason === r ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${reason === r ? 'rgba(255,107,53,0.35)' : 'rgba(255,255,255,0.08)'}`, color: reason === r ? '#FF6B35' : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={lbSt}>Tell us more *</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what happened — the more detail, the faster we can resolve this."
              rows={4}
              style={{ width: '100%', padding: '13px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, color: '#fff', fontSize: 14, outline: 'none', resize: 'none', lineHeight: 1.6, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'right' }}>{description.length}/1000</p>
          </div>

          <div>
            <p style={lbSt}>Photo evidence <span style={{ fontWeight: 400, textTransform: 'none' }}>(up to 3, optional)</span></p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {photoPreviews.map((url, i) => (
                <div key={i} style={{ position: 'relative', width: 80, height: 80 }}>
                  <img src={url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
                  <button onClick={() => removePhoto(i)} style={{ position: 'absolute', top: -7, right: -7, width: 22, height: 22, borderRadius: '50%', background: '#0a0a0a', border: '1.5px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 0 }}>
                    <RiCloseLine size={12} />
                  </button>
                </div>
              ))}
              {photoFiles.length < 3 && (
                <label style={{ width: 80, height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: 12, cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
                  <RiImageAddLine size={22} color="rgba(255,255,255,0.25)" />
                  <span style={{ fontSize: 10, fontWeight: 600 }}>Add photo</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhoto} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
              <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ padding: '14px', background: submitting ? 'rgba(255,107,53,0.4)' : '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {submitting ? <><RiLoader4Line size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Submitting…</> : <><RiCheckLine size={16} /> Submit Dispute</>}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const lbSt = {
  color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px',
}