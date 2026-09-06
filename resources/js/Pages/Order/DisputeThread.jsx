import { useState } from 'react'
import axios from 'axios'
import {
  RiCloseLine, RiAlertLine, RiImageAddLine, RiLoader4Line, RiSendPlaneFill,
} from 'react-icons/ri'

export default function DisputeThread({ dispute: initialDispute, currentUserId, onClose }) {
  const [dispute,       setDispute]       = useState(initialDispute)
  const [message,       setMessage]       = useState('')
  const [photoFiles,    setPhotoFiles]    = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [sending,       setSending]       = useState(false)

  const resolved = ['resolved_buyer', 'resolved_seller', 'closed'].includes(dispute.status)

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

  const handleSend = async () => {
    if (!message.trim() && photoFiles.length === 0) return
    setSending(true)
    try {
      const fd = new FormData()
      if (message.trim()) fd.append('message', message.trim())
      photoFiles.forEach(f => fd.append('photos[]', f))
      const { data } = await axios.post(`/api/disputes/${dispute.id}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setDispute(prev => ({ ...prev, messages: [...(prev.messages ?? []), data], status: 'awaiting_admin' }))
      setMessage('')
      photoPreviews.forEach(url => URL.revokeObjectURL(url))
      setPhotoFiles([])
      setPhotoPreviews([])
    } catch {
      // silent — sending a reply failing isn't catastrophic, just leave the draft in place
    } finally {
      setSending(false)
    }
  }

  const statusLabel = {
    open:            'Awaiting seller response',
    awaiting_admin:  'Under review by Flockr',
    resolved_buyer:  'Resolved — refunded',
    resolved_seller: 'Resolved — released to seller',
    closed:          'Closed',
  }[dispute.status] ?? dispute.status

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 560, height: '85vh', background: '#0f0f0f', borderRadius: '28px 28px 0 0', zIndex: 1, display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <RiAlertLine size={18} color="#F59E0B" />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>Dispute — {dispute.order?.reference}</p>
            <p style={{ margin: '2px 0 0', color: '#F59E0B', fontSize: 12, fontWeight: 600 }}>{statusLabel}</p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <RiCloseLine size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(dispute.messages ?? []).map(m => {
            const mine   = m.user_id === currentUserId
            const isAdmin = m.message?.startsWith('[Admin resolution')
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    {isAdmin ? 'Flockr Support' : m.user?.name} · {new Date(m.created_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: 14, background: isAdmin ? 'rgba(59,130,246,0.12)' : mine ? '#FF6B35' : 'rgba(255,255,255,0.06)', border: isAdmin ? '1px solid rgba(59,130,246,0.25)' : 'none', color: '#fff', fontSize: 13, lineHeight: 1.5 }}>
                  {m.message}
                </div>
                {m.attachment_urls?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {m.attachment_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!resolved ? (
          <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            {photoPreviews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {photoPreviews.map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: 56, height: 56 }}>
                    <img src={url} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10 }} />
                    <button onClick={() => removePhoto(i)} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <label style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: photoFiles.length >= 3 ? 'not-allowed' : 'pointer', opacity: photoFiles.length >= 3 ? 0.4 : 1 }}>
                <RiImageAddLine size={17} color="rgba(255,255,255,0.5)" />
                <input type="file" accept="image/*" multiple disabled={photoFiles.length >= 3} onChange={handlePhoto} style={{ display: 'none' }} />
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Reply with more detail…"
                rows={1}
                style={{ flex: 1, padding: '11px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
              />
              <button onClick={handleSend} disabled={sending} style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 12, background: '#FF6B35', border: 'none', cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: sending ? 0.6 : 1 }}>
                {sending ? <RiLoader4Line size={16} color="#fff" style={{ animation: 'spin 0.8s linear infinite' }} /> : <RiSendPlaneFill size={15} color="#fff" />}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>This dispute has been resolved.</p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}