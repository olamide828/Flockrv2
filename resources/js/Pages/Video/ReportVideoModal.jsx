import { useState } from 'react'
import { usePage } from '@inertiajs/react'
import axios from 'axios'
import { RiArrowLeftLine, RiCheckLine } from 'react-icons/ri'

const VIDEO_REPORT_REASONS = [
  'Spam or misleading content',
  'Inappropriate or offensive content',
  'Harassment or bullying',
  'Scam or fraud',
  'Counterfeit or fake products',
  'Intellectual property violation',
  'Other',
]

export default function ReportVideoModal({ video, onClose }) {
  const { auth }      = usePage().props
  const [reason,      setReason]      = useState('')
  const [description, setDescription] = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState(null)

  const handleSubmit = async () => {
    if (!reason || !auth?.user) return
    setSubmitting(true)
    setError(null)
    try {
      await axios.post(`/api/videos/${video.ulid}/report`, {
        reason,
        description: description.trim() || undefined,
      }, { withCredentials: true })
      setDone(true)
    } catch (e) {
      setError(e.response?.data?.message ?? 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
          <RiArrowLeftLine size={18} />
        </button>
        <div>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Report Video</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '2px 0 0' }}>@{video.user?.username}</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 16px', maxWidth: 520, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 340, gap: 16, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RiCheckLine size={32} color="#10B981" />
            </div>
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>Report Submitted</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6, margin: 0, maxWidth: 300 }}>
              Thanks for letting us know. Our team will review this video and take action if it violates our guidelines.
            </p>
            <button onClick={onClose} style={{ marginTop: 8, padding: '12px 32px', background: '#FF6B35', border: 'none', borderRadius: 999, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Video preview strip */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '12px 14px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
                {video.thumbnail_url_full && <img src={video.thumbnail_url_full} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {video.title || 'Untitled video'}
                </p>
                <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>@{video.user?.username}</p>
              </div>
            </div>

            {/* Reasons */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                Why are you reporting this?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {VIDEO_REPORT_REASONS.map(r => (
                  <button key={r} onClick={() => setReason(r)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 14, cursor: 'pointer', background: reason === r ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${reason === r ? 'var(--flockr-orange)' : 'rgba(255,255,255,0.07)'}`, color: reason === r ? 'var(--flockr-orange)' : '#fff', fontSize: 14, fontWeight: reason === r ? 600 : 400, textAlign: 'left', transition: 'all 0.15s' }}>
                    {r}
                    {reason === r && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--flockr-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <RiCheckLine size={12} color="#fff" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                Additional Details <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </p>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Provide more context to help us understand the issue..."
                maxLength={500}
                rows={3}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px', color: '#fff', fontSize: 14, lineHeight: 1.5, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
              />
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'right' }}>{description.length}/500</p>
            </div>

            {error && (
              <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, marginBottom: 16 }}>
                <p style={{ margin: 0, color: '#EF4444', fontSize: 13 }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!reason || submitting || !auth?.user}
              style={{ width: '100%', padding: '15px', background: reason && !submitting ? 'var(--flockr-orange)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 16, color: reason ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: 700, cursor: reason && !submitting ? 'pointer' : 'default', transition: 'all 0.2s' }}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>

            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>
              Your report is anonymous. We review all reports within 24 hours.
            </p>
          </>
        )}
      </div>
    </div>
  )
}