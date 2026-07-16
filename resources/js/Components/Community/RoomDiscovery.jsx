import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { RiArrowLeftLine, RiSearchLine, RiGroupLine, RiLockLine } from 'react-icons/ri'
import { useToast } from '@/Components/Toast'

/**
 * onJoin(room)         — called when the person taps Join/Request on a
 *                         browsable room; parent opens RoomJoinModal.
 * onPreviewInvite(room) — called after a successful invite-code lookup;
 *                         parent opens the SAME RoomJoinModal (info + rules)
 *                         instead of joining blind. The room object carries
 *                         a _inviteCode field so the parent's confirm
 *                         handler knows to call the invite-join endpoint.
 */
export default function RoomDiscovery({ auth, onClose, onJoin, onPreviewInvite, joinedIds, initialInvite = '' }) {
  const [q, setQ] = useState('')
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState(initialInvite)
  const [joining, setJoining] = useState(null)
  const debRef = useRef(null)
  const inputRef = useRef(null)
  const { showToast, ToastComponent } = useToast()

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  useEffect(() => {
    clearTimeout(debRef.current)
    debRef.current = setTimeout(async () => {
      setLoading(true)
      try { const { data } = await axios.get('/api/community/rooms/discover', { params: { q } }); setRooms(data) }
      catch {} finally { setLoading(false) }
    }, q ? 300 : 0)
  }, [q])

  const previewInvite = async () => {
    if (!invite.trim()) return
    setJoining('invite')
    try {
      const { data } = await axios.get('/api/community/rooms/lookup-invite', { params: { invite_code: invite.trim() } })
      if (data.already_joined) {
        showToast('You are already a member of this room')
        onClose()
        return
      }
      onPreviewInvite({ ...data, _inviteCode: invite.trim().toUpperCase() })
      onClose()
    } catch (e) { showToast(e.response?.data?.message ?? 'Invalid invite code', 'error') }
    finally { setJoining(null) }
  }

  const handleRoomJoin = async (room) => {
    setJoining(room.id)
    try { onJoin(room) } // parent opens RoomJoinModal; discovery just hands off
    finally { setJoining(null) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:810, background:'#0a0a0a', display:'flex', flexDirection:'column' }}>
      {ToastComponent}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
          <RiArrowLeftLine size={18} />
        </button>
        <div style={{ flex:1, position:'relative' }}>
          <RiSearchLine size={16} color="rgba(255,255,255,0.3)" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search rooms..."
            style={{ width:'100%', height:42, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:999, paddingLeft:40, paddingRight:14, color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box' }} />
        </div>
      </div>

      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,107,53,0.04)', flexShrink:0 }}>
        <p style={{ margin:'0 0 8px', color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:600 }}>HAVE AN INVITE CODE?</p>
        <div style={{ display:'flex', gap:8 }}>
          <input value={invite} onChange={e => setInvite(e.target.value.toUpperCase())} placeholder="Enter 8-character code..."
            style={{ flex:1, height:40, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'0 14px', color:'#fff', fontSize:14, outline:'none', fontFamily:'monospace', letterSpacing:'0.1em' }} />
          <button onClick={previewInvite} disabled={!invite.trim() || joining === 'invite'}
            style={{ padding:'0 18px', borderRadius:12, background: invite.trim() ? '#FF6B35' : 'rgba(255,255,255,0.07)', border:'none', cursor: invite.trim() ? 'pointer' : 'default', color: invite.trim() ? '#fff' : 'rgba(255,255,255,0.3)', fontSize:14, fontWeight:700 }}>
            {joining === 'invite' ? '...' : 'Join'}
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
        {loading && <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}><div style={{ width:24, height:24, border:'2px solid rgba(255,255,255,0.1)', borderTopColor:'#FF6B35', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} /></div>}

        {!loading && rooms.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 24px' }}>
            <RiGroupLine size={36} color="rgba(255,255,255,0.1)" style={{ margin:'0 auto 12px', display:'block' }} />
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, margin:0 }}>{q ? `No rooms matching "${q}"` : 'No public rooms yet'}</p>
          </div>
        )}

        {rooms.map(room => {
          const already = room.already_joined || joinedIds.includes(room.id)
          return (
            <div key={room.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <img src={room.avatar_url} alt="" style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'1px solid rgba(255,255,255,0.1)' }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <p style={{ color:'#fff', fontSize:15, fontWeight:700, margin:0 }}>{room.name}</p>
                  {room.is_private && <RiLockLine size={12} color="rgba(255,255,255,0.4)" />}
                </div>
                {room.description && <p style={{ color:'rgba(255,255,255,0.45)', fontSize:13, margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{room.description}</p>}
                <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, margin:'3px 0 0' }}>by @{room.seller?.username} · {room.members_count} members</p>
              </div>
              {already ? (
                <span style={{ padding:'7px 16px', borderRadius:999, background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', fontSize:13, fontWeight:600, flexShrink:0 }}>Joined</span>
              ) : (
                <button onClick={() => handleRoomJoin(room)} disabled={joining === room.id}
                  style={{ padding:'7px 18px', borderRadius:999, background:'#FF6B35', border:'none', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:700, flexShrink:0, opacity: joining === room.id ? 0.6 : 1 }}>
                  {joining === room.id ? '...' : (room.is_private ? 'Request' : 'Join')}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}