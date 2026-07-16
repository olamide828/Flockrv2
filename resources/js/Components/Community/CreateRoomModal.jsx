import { useState } from 'react'
import axios from 'axios'
import { RiCloseLine, RiLockLine, RiGlobalLine, RiShieldLine } from 'react-icons/ri'

export default function CreateRoomModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [rules, setRules] = useState([])
  const [newRule, setNewRule] = useState('')
  const [creating, setCreating] = useState(false)

  const addRule = () => {
    if (!newRule.trim()) return
    setRules(r => [...r, newRule.trim()])
    setNewRule('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || creating) return
    setCreating(true)
    try {
      const { data } = await axios.post('/api/community/rooms', {
        name: name.trim(),
        description: desc.trim(),
        is_private: isPrivate,
        rules,
      })
      onCreated(data)
      onClose()
    } catch {} finally { setCreating(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:850, background:'rgba(0,0,0,0.7)' }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(440px, 94vw)', zIndex:860, background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:22, overflow:'hidden', maxHeight:'88vh', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
          <p style={{ margin:0, color:'#fff', fontWeight:700, fontSize:16 }}>Create a Room</p>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}><RiCloseLine size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ padding:'20px', display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>
          <div>
            <label style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:7 }}>Room Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. VIP Drops, Skincare Insiders..." maxLength={80}
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'12px 14px', color:'#fff', fontSize:15, outline:'none', boxSizing:'border-box' }} />
          </div>
          <div>
            <label style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:7 }}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What's this room for?" rows={3} maxLength={500}
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'12px 14px', color:'#fff', fontSize:14, outline:'none', resize:'none', boxSizing:'border-box', fontFamily:'"DM Sans", sans-serif' }} />
          </div>

          <button type="button" onClick={() => setIsPrivate(p => !p)}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:16, background: isPrivate ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.04)', border:`1px solid ${isPrivate ? 'rgba(255,107,53,0.3)' : 'rgba(255,255,255,0.08)'}`, cursor:'pointer' }}>
            {isPrivate ? <RiLockLine size={20} color="#FF6B35" /> : <RiGlobalLine size={20} color="rgba(255,255,255,0.4)" />}
            <div style={{ textAlign:'left', flex:1 }}>
              <p style={{ margin:0, color: isPrivate ? '#FF6B35' : '#fff', fontSize:14, fontWeight:600 }}>{isPrivate ? 'Private Room' : 'Public Room'}</p>
              <p style={{ margin:0, color:'rgba(255,255,255,0.35)', fontSize:12 }}>{isPrivate ? 'Invite link, or requests you approve' : 'Anyone can discover and join'}</p>
            </div>
            <div style={{ width:40, height:22, borderRadius:999, background: isPrivate ? '#FF6B35' : 'rgba(255,255,255,0.15)', position:'relative', flexShrink:0 }}>
              <div style={{ position:'absolute', top:3, left: isPrivate ? 21 : 3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.15s' }} />
            </div>
          </button>

          {/* Rules editor */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
              <RiShieldLine size={14} color="#FF6B35" />
              <label style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>Room Rules (optional)</label>
            </div>

            {rules.map((rule, i) => (
              <div key={i} style={{ display:'flex', gap:10, padding:'9px 12px', background:'rgba(255,255,255,0.04)', borderRadius:12, border:'1px solid rgba(255,255,255,0.07)', marginBottom:6, alignItems:'center' }}>
                <span style={{ color:'#FF6B35', fontSize:12, fontWeight:800, flexShrink:0 }}>{i + 1}.</span>
                <p style={{ flex:1, margin:0, color:'rgba(255,255,255,0.85)', fontSize:13 }}>{rule}</p>
                <button type="button" onClick={() => setRules(r => r.filter((_, j) => j !== i))} style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444', display:'flex', flexShrink:0 }}>
                  <RiCloseLine size={14} />
                </button>
              </div>
            ))}

            <div style={{ display:'flex', gap:8 }}>
              <input value={newRule} onChange={e => setNewRule(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRule() } }}
                placeholder="e.g. No spam or self-promotion" maxLength={200}
                style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'9px 12px', color:'#fff', fontSize:13, outline:'none' }} />
              <button type="button" onClick={addRule} disabled={!newRule.trim()}
                style={{ padding:'9px 16px', borderRadius:12, background:'rgba(255,255,255,0.08)', border:'none', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:600 }}>
                Add
              </button>
            </div>
          </div>

          <button type="submit" disabled={!name.trim() || creating}
            style={{ padding:'14px', background: name.trim() ? '#FF6B35' : 'rgba(255,255,255,0.06)', border:'none', borderRadius:14, color: name.trim() ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight:700, fontSize:15, cursor: name.trim() ? 'pointer' : 'default' }}>
            {creating ? 'Creating...' : 'Create Room'}
          </button>
        </form>
      </div>
    </>
  )
}