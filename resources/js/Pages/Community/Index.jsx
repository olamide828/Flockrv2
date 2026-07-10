import { useState, useEffect, useRef, useCallback } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'
import {
  RiAddLine, RiCloseLine, RiSendPlaneFill, RiHeartLine, RiHeartFill,
  RiChat1Line, RiMoreLine, RiImageLine, RiGlobalLine, RiLockLine,
  RiUserAddLine, RiSettings4Line, RiDeleteBinLine, RiShieldLine,
  RiVerifiedBadgeLine, RiArrowLeftLine, RiLoader4Line, RiGroupLine,
  RiAlertLine, RiCheckLine, RiEditLine,
} from 'react-icons/ri'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(d) {
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60)     return 'now'
  if (s < 3600)   return `${Math.floor(s / 60)}m`
  if (s < 86400)  return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(d).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}

function Avatar({ user, size = 36, ring = false }) {
  const [err, setErr] = useState(false)
  const src = (!err && user?.avatar_url) ? user.avatar_url
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'U')}&background=1a1a1a&color=fff`
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      {ring && (
        <div style={{
          position: 'absolute', inset: -2.5, borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF6B35, #FF8C00, #FFD700, #FF6B35)',
          backgroundSize: '300% 300%',
          animation: 'gradientSpin 2s linear infinite',
          zIndex: 0,
        }} />
      )}
      <img src={src} alt={user?.name ?? ''} onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', position: 'relative', zIndex: 1, border: ring ? '2px solid #050505' : 'none' }} />
    </div>
  )
}

function fmtCount(n) {
  const num = Number(n ?? 0)
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'K'
  return String(num)
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState(null)
  const show = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  const el = toast ? (
    <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: toast.type === 'error' ? '#EF4444' : '#10B981', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
      {toast.msg}
    </div>
  ) : null
  return { show, el }
}

// ─────────────────────────────────────────────────────────────────────────────
// Post Card
// ─────────────────────────────────────────────────────────────────────────────
function PostCard({ post, currentUserId, isAdmin, onDelete, onLike }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const canDelete = currentUserId && (post.user_id === currentUserId || isAdmin)

  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 10px' }}>
        <Link href={`/@${post.user?.username}`} style={{ flexShrink: 0 }}>
          <Avatar user={post.user} size={38} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link href={`/@${post.user?.username}`} style={{ textDecoration: 'none' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{post.user?.name}</span>
            </Link>
            {post.user?.is_verified && <RiVerifiedBadgeLine size={13} color="#FF6B35" />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{timeAgo(post.created_at)}</span>
            {post.room && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>·</span>
                <span style={{ color: '#FF6B35', fontSize: 11, fontWeight: 600 }}>{post.room.name}</span>
              </>
            )}
          </div>
        </div>
        {canDelete && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', padding: 4 }}>
              <RiMoreLine size={18} />
            </button>
            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                <div style={{ position: 'absolute', top: 28, right: 0, zIndex: 99, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', minWidth: 130, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                  <button onClick={() => { setMenuOpen(false); onDelete(post) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 13, fontWeight: 600 }}>
                    <RiDeleteBinLine size={14} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px 12px' }}>
        <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.content}</p>
      </div>

      {/* Media */}
      {post.media_url && (
        <div style={{ margin: '0 0 0' }}>
          {post.media_type === 'video'
            ? <video src={post.media_url} controls style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block', background: '#000' }} />
            : <img src={post.media_url} alt="" style={{ width: '100%', maxHeight: 420, objectFit: 'cover', display: 'block' }} />
          }
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '10px 16px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: post.media_url ? 0 : 0 }}>
        <button onClick={() => onLike(post)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: post.is_liked_by_me ? '#EF4444' : 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600 }}>
          {post.is_liked_by_me ? <RiHeartFill size={18} /> : <RiHeartLine size={18} />}
          {post.likes_count > 0 && fmtCount(post.likes_count)}
        </button>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600 }}>
          <RiChat1Line size={18} />
          {post.comments_count > 0 && fmtCount(post.comments_count)}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Post Box
// ─────────────────────────────────────────────────────────────────────────────
function CreatePostBox({ auth, roomId, onCreated }) {
  const [body,    setBody]    = useState('')
  const [posting, setPosting] = useState(false)
  const [focused, setFocused] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!body.trim() || posting) return
    setPosting(true)
    try {
      const { data } = await axios.post('/api/community/posts', {
        content: body.trim(),
        room_id: roomId ?? null,
      })
      setBody('')
      setFocused(false)
      onCreated(data)
    } catch {} finally { setPosting(false) }
  }

  if (!auth?.user) return null

  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '14px 16px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Avatar user={auth.user} size={38} />
        <div style={{ flex: 1 }}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={roomId ? "Share something with the room..." : "What's on your mind?"}
            maxLength={2000}
            rows={focused ? 3 : 1}
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 14px', color: '#fff', fontSize: 14, lineHeight: 1.5, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: '"DM Sans", sans-serif', transition: 'height 0.15s' }}
          />
          {focused && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>{2000 - body.length} chars left</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setFocused(false); setBody('') }} style={{ padding: '7px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600 }}>Cancel</button>
                <button onClick={submit} disabled={!body.trim() || posting} style={{ padding: '7px 18px', borderRadius: 999, background: body.trim() ? '#FF6B35' : 'rgba(255,255,255,0.08)', border: 'none', cursor: body.trim() ? 'pointer' : 'default', color: body.trim() ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {posting ? <RiLoader4Line size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <RiSendPlaneFill size={14} />}
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Room Tray Item
// ─────────────────────────────────────────────────────────────────────────────
function RoomTrayItem({ room, isActive, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, width: 68 }}>
      <div style={{ position: 'relative' }}>
        {/* Glowing animated ring for unread */}
        {room.has_unread && !isActive && (
          <div style={{
            position: 'absolute', inset: -3, borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF6B35 0%, #FFD700 50%, #FF6B35 100%)',
            backgroundSize: '300% 300%',
            animation: 'gradientSpin 2s linear infinite',
            zIndex: 0,
          }} />
        )}
        <div style={{
          position: 'relative', zIndex: 1,
          width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
          border: isActive ? '2.5px solid #FF6B35' : room.has_unread ? '2.5px solid #050505' : '2px solid rgba(255,255,255,0.1)',
        }}>
          <img
            src={room.avatar_url}
            alt={room.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        {isActive && (
          <div style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: '#FF6B35', border: '2px solid #050505', zIndex: 2 }} />
        )}
      </div>
      <span style={{ color: isActive ? '#FF6B35' : 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: isActive ? 700 : 500, textAlign: 'center', lineHeight: 1.2, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {room.name}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Members Drawer
// ─────────────────────────────────────────────────────────────────────────────
function MembersDrawer({ room, currentUserId, onClose, onKick }) {
  const [members,  setMembers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const isOwner = currentUserId === room.seller_id

  useEffect(() => {
    axios.get(`/api/community/rooms/${room.id}/members`)
      .then(r => setMembers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [room.id])

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 320, zIndex: 101, background: '#111', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>Members · {members.length}</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <RiCloseLine size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}><div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>}
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar user={m} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{m.name}</p>
                  {m.pivot?.role === 'moderator' && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(255,107,53,0.15)', color: '#FF6B35' }}>Host</span>}
                  {m.is_verified && <RiVerifiedBadgeLine size={12} color="#FF6B35" />}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>@{m.username}</p>
              </div>
              {/* Kick button — seller only, can't kick themselves */}
              {isOwner && m.id !== currentUserId && (
                <button onClick={() => onKick(m)} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  Kick
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Rules Editor
// ─────────────────────────────────────────────────────────────────────────────
function RulesEditor({ room, onClose, onSaved }) {
  const [rules,   setRules]   = useState(room.rules ?? [])
  const [saving,  setSaving]  = useState(false)
  const [newRule, setNewRule] = useState('')

  const addRule = () => {
    if (!newRule.trim()) return
    setRules(r => [...r, newRule.trim()])
    setNewRule('')
  }

  const save = async () => {
    setSaving(true)
    try {
      await axios.put(`/api/community/rooms/${room.id}/rules`, { rules })
      onSaved(rules)
      onClose()
    } catch {} finally { setSaving(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(460px, 94vw)', zIndex: 101, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>Room Rules</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><RiCloseLine size={16} /></button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '50vh', overflowY: 'auto' }}>
          {rules.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0 }}>No rules yet. Add some below.</p>}
          {rules.map((rule, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ color: '#FF6B35', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              <p style={{ flex: 1, color: '#fff', fontSize: 13, margin: 0 }}>{rule}</p>
              <button onClick={() => setRules(r => r.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex', padding: 0 }}>
                <RiCloseLine size={15} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8 }}>
          <input value={newRule} onChange={e => setNewRule(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRule()} placeholder="Add a rule..." maxLength={200}
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '9px 14px', color: '#fff', fontSize: 13, outline: 'none' }} />
          <button onClick={addRule} style={{ padding: '9px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: 13 }}>Add</button>
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          <button onClick={save} disabled={saving} style={{ width: '100%', padding: '13px', background: '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save Rules'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Room Modal
// ─────────────────────────────────────────────────────────────────────────────
function CreateRoomModal({ onClose, onCreated }) {
  const [name,      setName]      = useState('')
  const [desc,      setDesc]      = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [creating,  setCreating]  = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || creating) return
    setCreating(true)
    try {
      const { data } = await axios.post('/api/community/rooms', { name: name.trim(), description: desc.trim(), is_private: isPrivate })
      onCreated(data)
      onClose()
    } catch {} finally { setCreating(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(440px, 94vw)', zIndex: 101, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>Create a Room</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><RiCloseLine size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Room Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nike Drops, Skincare Insiders..." maxLength={80}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What's this room about?" rows={3} maxLength={500}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: '"DM Sans", sans-serif' }} />
          </div>
          <button type="button" onClick={() => setIsPrivate(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, background: isPrivate ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isPrivate ? 'rgba(255,107,53,0.3)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer' }}>
            {isPrivate ? <RiLockLine size={16} color="#FF6B35" /> : <RiGlobalLine size={16} color="rgba(255,255,255,0.4)" />}
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, color: isPrivate ? '#FF6B35' : '#fff', fontSize: 13, fontWeight: 600 }}>{isPrivate ? 'Private Room' : 'Public Room'}</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{isPrivate ? 'Only invited members can join' : 'Anyone can discover and join'}</p>
            </div>
            <div style={{ marginLeft: 'auto', width: 36, height: 20, borderRadius: 999, background: isPrivate ? '#FF6B35' : 'rgba(255,255,255,0.15)', position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 2, left: isPrivate ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
            </div>
          </button>
          <button type="submit" disabled={!name.trim() || creating} style={{ padding: '13px', background: name.trim() ? '#FF6B35' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 14, color: name.trim() ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: 14, cursor: name.trim() ? 'pointer' : 'default' }}>
            {creating ? 'Creating...' : 'Create Room'}
          </button>
        </form>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty State — no joined rooms
// ─────────────────────────────────────────────────────────────────────────────
function EmptyRoomsState({ discoverRooms, onJoin, onShowDiscover }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', textAlign: 'center', gap: 16 }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RiGroupLine size={32} color="#FF6B35" />
      </div>
      <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>Join your first Room</h3>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6, margin: 0, maxWidth: 300 }}>
        Rooms are exclusive spaces by sellers — get early drops, insider info, and direct access to your favourite vendors.
      </p>

      {/* Glassmorphic CTA */}
      <button onClick={onShowDiscover} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 28px', background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: 999, backdropFilter: 'blur(12px)', cursor: 'pointer' }}>
        <RiGlobalLine size={18} color="#FF6B35" />
        <span style={{ color: '#FF6B35', fontWeight: 700, fontSize: 15 }}>Explore Rooms</span>
      </button>

      {/* Quick join suggested rooms */}
      {discoverRooms.length > 0 && (
        <div style={{ width: '100%', marginTop: 8 }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: '0 0 12px', fontWeight: 600 }}>SUGGESTED ROOMS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {discoverRooms.slice(0, 4).map(room => (
              <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
                <img src={room.avatar_url} alt={room.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{room.name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '2px 0 0' }}>{room.members_count} members</p>
                </div>
                <button onClick={() => onJoin(room)} style={{ padding: '6px 14px', borderRadius: 999, background: '#FF6B35', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Join</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Community Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Community({ joinedRooms: initJoined = [], discoverRooms: initDiscover = [] }) {
  const { auth } = usePage().props
  const isSeller = auth?.user?.role === 'seller' || auth?.user?.role === 'admin'
  const { show: showToast, el: toastEl } = useToast()

  // View state
  const [view,          setView]          = useState('general')   // 'general' | 'rooms'
  const [currentRoomId, setCurrentRoomId] = useState(null)
  const [joinedRooms,   setJoinedRooms]   = useState(initJoined)
  const [discoverRooms, setDiscoverRooms] = useState(initDiscover)
  const [showDiscover,  setShowDiscover]  = useState(false)

  // Feed
  const [posts,    setPosts]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [page,     setPage]     = useState(1)
  const [hasMore,  setHasMore]  = useState(true)
  const loaderRef = useRef(null)

  // Modals
  const [createRoomOpen, setCreateRoomOpen] = useState(false)
  const [membersRoom,    setMembersRoom]    = useState(null)
  const [rulesRoom,      setRulesRoom]      = useState(null)

  const activeRoom = currentRoomId ? joinedRooms.find(r => r.id === currentRoomId) : null

  // ── Load feed ─────────────────────────────────────────────────────────────
  const loadFeed = useCallback(async (reset = false) => {
    const p = reset ? 1 : page
    setLoading(true)
    try {
      const type = view === 'general' ? 'general' : currentRoomId ? 'room' : 'rooms'
      const { data } = await axios.get('/api/community/feed', {
        params: { type, room_id: currentRoomId, page: p }
      })
      const incoming = data.data ?? []
      if (reset) {
        setPosts(incoming)
      } else {
        setPosts(prev => [...prev, ...incoming])
      }
      setHasMore(data.current_page < data.last_page)
      if (reset) setPage(2); else setPage(p + 1)
    } catch {} finally { setLoading(false) }
  }, [view, currentRoomId, page])

  useEffect(() => { loadFeed(true) }, [view, currentRoomId])

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && !loading) loadFeed() }, { threshold: 0.1 })
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [loadFeed, hasMore, loading])

  // ── Mark room as read when opened ────────────────────────────────────────
  useEffect(() => {
    if (!currentRoomId) return
    setJoinedRooms(prev => prev.map(r => r.id === currentRoomId ? { ...r, has_unread: false } : r))
  }, [currentRoomId])

  // ── Actions ───────────────────────────────────────────────────────────────
  const handlePostCreated = (post) => {
    setPosts(prev => [post, ...prev])
  }

  const handleLike = async (post) => {
    if (!auth?.user) { router.visit('/login'); return }
    const wasLiked = post.is_liked_by_me
    setPosts(prev => prev.map(p => p.id === post.id
      ? { ...p, is_liked_by_me: !wasLiked, likes_count: wasLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1 }
      : p
    ))
    try {
      const { data } = await axios.post(`/api/community/posts/${post.id}/like`)
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_liked_by_me: data.liked, likes_count: data.likes_count } : p))
    } catch {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_liked_by_me: wasLiked, likes_count: post.likes_count } : p))
    }
  }

  const handleDelete = async (post) => {
    setPosts(prev => prev.filter(p => p.id !== post.id))
    try { await axios.delete(`/api/community/posts/${post.id}`) }
    catch { loadFeed(true) }
  }

  const handleJoin = async (room) => {
    if (!auth?.user) { router.visit('/login'); return }
    try {
      const { data } = await axios.post(`/api/community/rooms/${room.id}/join`)
      if (data.joined) {
        const joined = { ...room, has_unread: false, pivot_role: 'member' }
        setJoinedRooms(prev => [joined, ...prev])
        setDiscoverRooms(prev => prev.filter(r => r.id !== room.id))
        showToast(`Joined ${room.name}!`)
        setCurrentRoomId(room.id)
        setView('rooms')
      }
    } catch { showToast('Failed to join', 'error') }
  }

  const handleKick = async (member) => {
    if (!membersRoom) return
    try {
      await axios.delete(`/api/community/rooms/${membersRoom.id}/kick`, { data: { user_id: member.id } })
      showToast(`${member.name} removed`)
    } catch { showToast('Failed', 'error') }
  }

  const handleRoomCreated = (room) => {
    setJoinedRooms(prev => [room, ...prev])
    setCurrentRoomId(room.id)
    setView('rooms')
    showToast(`Room "${room.name}" created!`)
  }

  return (
    <>
      <Head title="Community" />
      {toastEl}
      {createRoomOpen && <CreateRoomModal onClose={() => setCreateRoomOpen(false)} onCreated={handleRoomCreated} />}
      {membersRoom    && <MembersDrawer room={membersRoom} currentUserId={auth?.user?.id} onClose={() => setMembersRoom(null)} onKick={handleKick} />}
      {rulesRoom      && <RulesEditor room={rulesRoom} onClose={() => setRulesRoom(null)} onSaved={rules => setJoinedRooms(prev => prev.map(r => r.id === rulesRoom.id ? { ...r, rules } : r))} />}

      <div style={{ height: '100%', overflowY: 'auto', background: '#050505', color: '#fff', fontFamily: '"DM Sans", sans-serif' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

          {/* ── HEADER ─────────────────────────────────────────────────── */}
          <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(5,5,5,0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px' }}>Community</h1>
              <div style={{ display: 'flex', gap: 8 }}>
                {isSeller && (
                  <button onClick={() => setCreateRoomOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, background: '#FF6B35', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                    <RiAddLine size={16} /> Room
                  </button>
                )}
              </div>
            </div>

            {/* General / Rooms toggle */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { key: 'general', label: 'General Feed' },
                { key: 'rooms',   label: `Rooms${joinedRooms.length > 0 ? ` (${joinedRooms.length})` : ''}` },
              ].map(t => (
                <button key={t.key} onClick={() => { setView(t.key); setCurrentRoomId(null) }}
                  style={{ flex: 1, padding: '11px 0', background: 'none', border: 'none', cursor: 'pointer', color: view === t.key ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: view === t.key ? 700 : 500, borderBottom: view === t.key ? '2px solid #FF6B35' : '2px solid transparent', marginBottom: -1, transition: 'all 0.15s', position: 'relative' }}>
                  {t.label}
                  {/* Unread dot on Rooms tab */}
                  {t.key === 'rooms' && joinedRooms.some(r => r.has_unread) && (
                    <span style={{ position: 'absolute', top: 8, right: 'calc(50% - 28px)', width: 7, height: 7, borderRadius: '50%', background: '#FF6B35', border: '1.5px solid #050505' }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── ROOM TRAY ──────────────────────────────────────────────── */}
          {view === 'rooms' && joinedRooms.length > 0 && (
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 16px 4px', background: '#0a0a0a' }}>
              {/* Active room header */}
              {activeRoom && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setCurrentRoomId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 2 }}>
                      <RiArrowLeftLine size={18} />
                    </button>
                    <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>{activeRoom.name}</p>
                    {activeRoom.rules?.length > 0 && (
                      <button onClick={() => setRulesRoom(activeRoom)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: '3px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <RiShieldLine size={12} /> Rules
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setMembersRoom(activeRoom)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <RiGroupLine size={13} /> Members
                    </button>
                    {activeRoom.seller_id === auth?.user?.id && (
                      <button onClick={() => setRulesRoom(activeRoom)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <RiEditLine size={13} /> Rules
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Room tray */}
              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 12 }}>
                {/* All rooms option */}
                <button onClick={() => setCurrentRoomId(null)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, width: 68 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: `2px solid ${!currentRoomId ? '#FF6B35' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RiGroupLine size={22} color={!currentRoomId ? '#FF6B35' : 'rgba(255,255,255,0.4)'} />
                  </div>
                  <span style={{ color: !currentRoomId ? '#FF6B35' : 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: !currentRoomId ? 700 : 500 }}>All</span>
                </button>

                {joinedRooms.map(room => (
                  <RoomTrayItem key={room.id} room={room} isActive={currentRoomId === room.id} onClick={() => setCurrentRoomId(room.id)} />
                ))}
              </div>
            </div>
          )}

          {/* ── BODY ───────────────────────────────────────────────────── */}
          <div style={{ flex: 1, padding: '16px' }}>

            {/* Rooms tab — no joined rooms */}
            {view === 'rooms' && joinedRooms.length === 0 && (
              <EmptyRoomsState
                discoverRooms={discoverRooms}
                onJoin={handleJoin}
                onShowDiscover={() => setShowDiscover(true)}
              />
            )}

            {/* Feed */}
            {(view === 'general' || (view === 'rooms' && joinedRooms.length > 0)) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Create post */}
                <CreatePostBox
                  auth={auth}
                  roomId={currentRoomId}
                  onCreated={handlePostCreated}
                />

                {/* Posts */}
                {loading && posts.length === 0 && (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '16px', opacity: 1 - i * 0.2 }}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ width: 100, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.07)', marginBottom: 6 }} />
                          <div style={{ width: 60,  height: 9,  borderRadius: 999, background: 'rgba(255,255,255,0.04)' }} />
                        </div>
                      </div>
                      <div style={{ width: '100%', height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.05)', marginBottom: 6 }} />
                      <div style={{ width: '80%',  height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.04)' }} />
                    </div>
                  ))
                )}

                {!loading && posts.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: 0 }}>
                      {view === 'general' ? 'No posts yet. Be the first!' : 'No posts in this room yet.'}
                    </p>
                  </div>
                )}

                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={auth?.user?.id}
                    isAdmin={auth?.user?.role === 'admin'}
                    onDelete={handleDelete}
                    onLike={handleLike}
                  />
                ))}

                {/* Infinite scroll sentinel */}
                {hasMore && <div ref={loaderRef} style={{ height: 1 }} />}
                {loading && posts.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                    <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin         { to { transform: rotate(360deg); } }
        @keyframes gradientSpin { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  )
}

Community.layout = page => <AppLayout>{page}</AppLayout>