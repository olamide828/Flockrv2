import { useState, useEffect } from 'react'
import { Link } from '@inertiajs/react'
import axios from 'axios'
import { RiCloseLine, RiVerifiedBadgeLine, RiEyeLine } from 'react-icons/ri'
import Av from './Av'
import VerifiedBadge from '@/Components/VerifiedBadge';

function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60) return `${Math.floor(s)}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(d).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}

export default function PostViewersSheet({ postId, onClose }) {
  const [viewers, setViewers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`/api/community/posts/${postId}/viewers`)
      .then(r => setViewers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [postId])

  return (
    <>
      <div onClick={e => { e.stopPropagation(); onClose() }} style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'rgba(0,0,0,0.6)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 951, background: 'rgba(18,18,18,0.98)', backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', maxHeight: '70vh', display: 'flex', flexDirection: 'column', animation: 'viewersSlideUp 0.28s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <RiEyeLine size={16} color="#FF6B35" />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Viewed by</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RiCloseLine size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px' }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
              <div style={{ width: 22, height: 22, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'viewersSpin 0.8s linear infinite' }} />
            </div>
          )}
          {!loading && viewers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>No one has viewed this yet.</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, margin: '4px 0 0' }}>Anonymous/guest views aren't shown here individually.</p>
            </div>
          )}
          {viewers.map(v => (
            <Link key={v.id} href={`/@${v.username}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', textDecoration: 'none' }}>
              <Av user={v} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
                  <VerifiedBadge type={v.verification_type} size={11} />
                </div>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>@{v.username}</p>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, flexShrink: 0 }}>{timeAgo(v.viewed_at)}</span>
            </Link>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes viewersSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes viewersSpin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}