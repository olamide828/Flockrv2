import { useState } from 'react'
import { RiCheckLine } from 'react-icons/ri'

const REASONS = [
  'Spam or misleading',
  'Harassment or bullying',
  'Hate speech or discrimination',
  'Scam or fraud',
  'Inappropriate content',
  'Other',
]

export default function PostReportModal({ post, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!reason) return
    setSubmitting(true)
    try { await onSubmit(reason); onClose() }
    catch { setSubmitting(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:920, background:'rgba(0,0,0,0.7)' }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(400px,92vw)', zIndex:921, background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:20 }}>
        <p style={{ color:'#fff', fontWeight:700, fontSize:16, margin:'0 0 4px' }}>Report Post</p>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12, margin:'0 0 16px' }}>Your report is anonymous.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {REASONS.map(r => (
            <button key={r} onClick={() => setReason(r)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:12, cursor:'pointer', background: reason === r ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.04)', border:`1px solid ${reason === r ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.08)'}`, color: reason === r ? '#FF6B35' : '#fff', fontSize:13, textAlign:'left' }}>
              {r}
              {reason === r && <RiCheckLine size={14} />}
            </button>
          ))}
        </div>
        <button onClick={submit} disabled={!reason || submitting}
          style={{ width:'100%', marginTop:16, padding:13, background: reason ? '#FF6B35' : 'rgba(255,255,255,0.06)', border:'none', borderRadius:999, color: reason ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight:700, fontSize:14, cursor: reason ? 'pointer' : 'default' }}>
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
      </div>
    </>
  )
}