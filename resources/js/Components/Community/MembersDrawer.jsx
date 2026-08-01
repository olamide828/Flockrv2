import { useState, useEffect } from 'react'
import axios from 'axios'
import { RiCloseLine, RiVerifiedBadgeLine, RiGroupLine, RiCheckLine } from 'react-icons/ri'
import Av from './Av'
import VerifiedBadge from '@/Components/VerifiedBadge';

export default function MembersDrawer({ room, auth, onClose, onKick, showToast }) {
  const [tab, setTab] = useState('members')
  const [members, setMembers] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(null)
  const isOwner = auth?.user?.id === room.seller_id
  const showRequestsTab = isOwner && room.is_private

  useEffect(() => {
    axios.get(`/api/community/rooms/${room.id}/members`)
      .then(r => setMembers(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [room.id])

  useEffect(() => {
    if (!showRequestsTab) return
    axios.get(`/api/community/rooms/${room.id}/requests`)
      .then(r => setRequests(r.data)).catch(() => {})
  }, [room.id, showRequestsTab])

  const resolve = async (req, action) => {
    setResolving(req.request_id)
    try {
      await axios.post(`/api/community/rooms/${room.id}/requests/${req.request_id}`, { action })
      setRequests(prev => prev.filter(r => r.request_id !== req.request_id))
      if (action === 'approve') {
        setMembers(prev => [...prev, { id: req.id, name: req.name, username: req.username, avatar_url: req.avatar_url, role: 'member' }])
        showToast?.(`${req.name} approved`)
      } else {
        showToast?.('Request declined')
      }
    } catch {
      showToast?.('Something went wrong', 'error')
    } finally {
      setResolving(null)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:850, background:'rgba(0,0,0,0.6)' }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'min(340px, 88vw)', zIndex:860, background:'#111', borderLeft:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 0' }}>
          <p style={{ margin:0, color:'#fff', fontWeight:700, fontSize:15 }}>
            {tab === 'members' ? `Members · ${members.length}` : `Requests · ${requests.length}`}
          </p>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}><RiCloseLine size={16} /></button>
        </div>

        {showRequestsTab && (
          <div style={{ display:'flex', margin:'14px 16px 0', background:'rgba(255,255,255,0.05)', borderRadius:12, padding:3 }}>
            {[{ key:'members', label:'Members' }, { key:'requests', label:`Requests${requests.length ? ` (${requests.length})` : ''}` }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ flex:1, padding:'8px 0', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background: tab===t.key ? '#FF6B35' : 'transparent', color: tab===t.key ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:6 }}>
          {tab === 'members' && (
            <>
              {loading && <div style={{ display:'flex', justifyContent:'center', padding:24 }}><div style={{ width:22, height:22, border:'2px solid rgba(255,255,255,0.1)', borderTopColor:'#FF6B35', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} /></div>}
              {!loading && members.map(m => (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0' }}>
                  <Av user={m} size={38} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <p style={{ color:'#fff', fontSize:13, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</p>
                      {m.role === 'moderator' && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:999, background:'rgba(255,107,53,0.15)', color:'#FF6B35', flexShrink:0 }}>Host</span>}
                      <VerifiedBadge type={m.verification_type} size={11} />
                    </div>
                    <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, margin:0 }}>@{m.username}</p>
                  </div>
                  {isOwner && m.id !== auth?.user?.id && (
                    <button onClick={() => onKick(m)} style={{ padding:'5px 10px', borderRadius:8, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0 }}>Kick</button>
                  )}
                </div>
              ))}
            </>
          )}

          {tab === 'requests' && (
            <>
              {requests.length === 0 && (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'50px 12px', textAlign:'center' }}>
                  <RiGroupLine size={28} color="rgba(255,255,255,0.15)" />
                  <p style={{ color:'rgba(255,255,255,0.35)', fontSize:13, margin:0 }}>No pending requests</p>
                </div>
              )}
              {requests.map(req => (
                <div key={req.request_id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <Av user={req} size={38} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:'#fff', fontSize:13, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{req.name}</p>
                    <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, margin:0 }}>@{req.username}</p>
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button onClick={() => resolve(req, 'reject')} disabled={resolving === req.request_id}
                      style={{ width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <RiCloseLine size={15} />
                    </button>
                    <button onClick={() => resolve(req, 'approve')} disabled={resolving === req.request_id}
                      style={{ width:30, height:30, borderRadius:'50%', background:'#FF6B35', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <RiCheckLine size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}