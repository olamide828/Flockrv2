import { useState } from 'react'
import axios from 'axios'
import { RiCloseLine, RiShieldLine } from 'react-icons/ri'

/**
 * Now used only for viewing rules (shield icon in RoomChat header) and for
 * the seller editing them. The "accept rules to join" flow lives in
 * RoomJoinModal now, so this component no longer needs an onAccept prop.
 */
export default function RulesModal({ room, auth, onClose, onSaved }) {
  const isOwner = auth?.user?.id === room.seller_id
  const [rules, setRules] = useState(room.rules ?? [])
  const [newRule, setNewRule] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try { await axios.put(`/api/community/rooms/${room.id}/rules`, { rules }); onSaved(rules); onClose() }
    catch {} finally { setSaving(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:870, background:'rgba(0,0,0,0.7)' }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(460px, 92vw)', zIndex:880, background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, overflow:'hidden', maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <RiShieldLine size={18} color="#FF6B35" />
            <p style={{ margin:0, color:'#fff', fontWeight:700, fontSize:16 }}>Room Rules</p>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}><RiCloseLine size={16} /></button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
          {rules.length === 0 && <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>No rules set yet.</p>}
          {rules.map((rule, i) => (
            <div key={i} style={{ display:'flex', gap:12, padding:'12px 14px', background:'rgba(255,255,255,0.04)', borderRadius:14, border:'1px solid rgba(255,255,255,0.07)', marginBottom:8, alignItems:'flex-start' }}>
              <span style={{ color:'#FF6B35', fontSize:13, fontWeight:800, flexShrink:0, minWidth:20 }}>{i+1}.</span>
              <p style={{ flex:1, color:'rgba(255,255,255,0.88)', fontSize:14, margin:0, lineHeight:1.5 }}>{rule}</p>
              {isOwner && (
                <button onClick={() => setRules(r => r.filter((_,j) => j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444', display:'flex', padding:0, flexShrink:0 }}>
                  <RiCloseLine size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        {isOwner && (
          <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
            <div style={{ display:'flex', gap:8, marginBottom:10 }}>
              <input value={newRule} onChange={e => setNewRule(e.target.value)} onKeyDown={e => e.key==='Enter' && newRule.trim() && (setRules(r => [...r, newRule.trim()]), setNewRule(''))} placeholder="Add rule..."
                style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'9px 12px', color:'#fff', fontSize:13, outline:'none' }} />
              <button onClick={() => newRule.trim() && (setRules(r => [...r, newRule.trim()]), setNewRule(''))} style={{ padding:'9px 16px', borderRadius:12, background:'rgba(255,255,255,0.08)', border:'none', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:600 }}>Add</button>
            </div>
            <button onClick={save} disabled={saving} style={{ width:'100%', padding:'12px', background:'#FF6B35', border:'none', borderRadius:12, color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}>
              {saving ? 'Saving...' : 'Save Rules'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}