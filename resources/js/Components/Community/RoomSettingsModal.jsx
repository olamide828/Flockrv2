import { useState, useRef } from 'react'
import axios from 'axios'
import { RiCloseLine, RiShareLine } from 'react-icons/ri'

export default function RoomSettingsModal({ room, onClose, onSaved, onShare, showToast }) {
  const [name, setName] = useState(room.name)
  const [desc, setDesc] = useState(room.description ?? '')
  const [isPrivate, setIsPrivate] = useState(room.is_private)
  const [avatarPreview, setAvatarPreview] = useState(room.avatar_url)
  const [avatarFile, setAvatarFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const pickAvatar = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      let avatar_url
      if (avatarFile) {
        const form = new FormData()
        form.append('file', avatarFile)
        form.append('type', 'image')
        const { data } = await axios.post('/api/upload/media', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        avatar_url = data.url
      }
      const { data } = await axios.put(`/api/community/rooms/${room.id}`, {
        name: name.trim(), description: desc.trim(), is_private: isPrivate,
        ...(avatar_url ? { avatar_url } : {}),
      })
      onSaved(data)
      showToast?.('Room updated')
      onClose()
    } catch { showToast?.('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:900, background:'rgba(0,0,0,0.7)' }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(420px,92vw)', zIndex:901, background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:22, padding:20, maxHeight:'85vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <p style={{ color:'#fff', fontWeight:700, fontSize:16, margin:0 }}>Room Settings</p>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}><RiCloseLine size={16} /></button>
        </div>

        <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
          <button onClick={() => fileRef.current?.click()} style={{ position:'relative', border:'none', background:'none', cursor:'pointer', padding:0 }}>
            <img src={avatarPreview} alt="" style={{ width:76, height:76, borderRadius:'50%', objectFit:'cover', border:'1px solid rgba(255,255,255,0.15)' }} />
            <div style={{ position:'absolute', bottom:0, right:0, width:24, height:24, borderRadius:'50%', background:'#FF6B35', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#fff' }}>✎</div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={pickAvatar} style={{ display:'none' }} />
        </div>

        <label style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, textTransform:'uppercase' }}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={80}
          style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'10px 12px', color:'#fff', margin:'6px 0 14px', boxSizing:'border-box' }} />

        <label style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, textTransform:'uppercase' }}>Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={500}
          style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'10px 12px', color:'#fff', margin:'6px 0 14px', boxSizing:'border-box', resize:'none', fontFamily:'"DM Sans", sans-serif' }} />

        <button onClick={() => setIsPrivate(p => !p)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', padding:'10px 0', background:'none', border:'none', cursor:'pointer', marginBottom:10 }}>
          <span style={{ color:'#fff', fontSize:14 }}>Private room</span>
          <div style={{ width:40, height:22, borderRadius:999, background: isPrivate ? '#FF6B35' : 'rgba(255,255,255,0.15)', position:'relative' }}>
            <div style={{ position:'absolute', top:3, left: isPrivate ? 21 : 3, width:16, height:16, borderRadius:'50%', background:'#fff' }} />
          </div>
        </button>

        {room.is_private && (
          <button onClick={() => onShare?.(room)} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'12px 0', background:'none', border:'none', borderTop:'1px solid rgba(255,255,255,0.06)', cursor:'pointer', color:'#FF6B35', fontSize:13, fontWeight:600, marginBottom:6 }}>
            <RiShareLine size={16} /> Share invite link
          </button>
        )}

        <div style={{ display:'flex', gap:10, marginTop:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:12, borderRadius:12, background:'rgba(255,255,255,0.06)', border:'none', color:'#fff', cursor:'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()} style={{ flex:1, padding:12, borderRadius:12, background:'#FF6B35', border:'none', color:'#fff', fontWeight:700, cursor:'pointer' }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </>
  )
}