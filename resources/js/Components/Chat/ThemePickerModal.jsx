import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { RiCloseLine, RiCheckLine, RiVipDiamondLine, RiStore3Line, RiAddLine, RiImageLine } from 'react-icons/ri'

// ── Small line-art icons — one distinct motif per theme, no emoji, no flat swatch ──
const Icon = {
  off: () => <svg viewBox="0 0 24 24" width="22" height="22"><line x1="4" y1="4" x2="20" y2="20" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="8" stroke="rgba(255,255,255,0.25)" strokeWidth="1.6" fill="none"/></svg>,
  bubbles: () => <svg viewBox="0 0 24 24" width="22" height="22"><circle cx="9" cy="15" r="5" fill="none" stroke="#FF6B35" strokeWidth="1.6"/><circle cx="16" cy="8" r="3" fill="none" stroke="#FF6B35" strokeWidth="1.6"/><circle cx="17" cy="17" r="1.6" fill="#FF6B35"/></svg>,
  drift: () => <svg viewBox="0 0 24 24" width="22" height="22"><circle cx="7" cy="16" r="1.4" fill="#9CA3AF"/><circle cx="13" cy="8" r="1" fill="#9CA3AF"/><circle cx="17" cy="18" r="1.8" fill="#9CA3AF"/><circle cx="11" cy="14" r="0.8" fill="#9CA3AF"/></svg>,
  rain: () => <svg viewBox="0 0 24 24" width="22" height="22"><line x1="7" y1="5" x2="4" y2="12" stroke="#3B82F6" strokeWidth="1.6" strokeLinecap="round"/><line x1="14" y1="3" x2="11" y2="10" stroke="#3B82F6" strokeWidth="1.6" strokeLinecap="round"/><line x1="20" y1="7" x2="17" y2="14" stroke="#3B82F6" strokeWidth="1.6" strokeLinecap="round"/><line x1="11" y1="14" x2="8" y2="21" stroke="#3B82F6" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  embers: () => <svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 3c2 4-3 5-1 9 1-1 2-1 2 0 2-1 2-4 0-6 1 2-1 2-1-3z" fill="#F97316"/></svg>,
  snowfall: () => <svg viewBox="0 0 24 24" width="22" height="22"><g stroke="#E5E7EB" strokeWidth="1.4"><line x1="12" y1="3" x2="12" y2="21"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></g></svg>,
  confetti: () => <svg viewBox="0 0 24 24" width="22" height="22"><rect x="4" y="4" width="4" height="2" fill="#F472B6" transform="rotate(20 6 5)"/><rect x="15" y="6" width="4" height="2" fill="#60A5FA" transform="rotate(-15 17 7)"/><rect x="9" y="15" width="4" height="2" fill="#FBBF24" transform="rotate(35 11 16)"/><rect x="16" y="16" width="4" height="2" fill="#34D399" transform="rotate(-25 18 17)"/></svg>,
  starfield: () => <svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 4l1.4 4.6L18 10l-4.6 1.4L12 16l-1.4-4.6L6 10l4.6-1.4z" fill="#A78BFA"/><circle cx="19" cy="18" r="1" fill="#A78BFA"/><circle cx="5" cy="17" r="0.8" fill="#A78BFA"/></svg>,
  aurora: () => <svg viewBox="0 0 24 24" width="22" height="22"><path d="M2 16c3-6 6 4 9-2s7 4 11-2" stroke="#34D399" strokeWidth="1.8" fill="none" strokeLinecap="round"/><path d="M2 19c3-4 6 3 9-1s7 3 11-1" stroke="#60A5FA" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7"/></svg>,
  neonGrid: () => <svg viewBox="0 0 24 24" width="22" height="22"><g stroke="#22D3EE" strokeWidth="1.2"><line x1="4" y1="4" x2="4" y2="20"/><line x1="10" y1="4" x2="10" y2="20"/><line x1="16" y1="4" x2="16" y2="20"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/></g></svg>,
  fireflies: () => <svg viewBox="0 0 24 24" width="22" height="22"><circle cx="7" cy="14" r="1.6" fill="#FDE68A"/><circle cx="7" cy="14" r="3.2" fill="#FDE68A" opacity="0.25"/><circle cx="16" cy="8" r="1.2" fill="#FDE68A"/><circle cx="16" cy="8" r="2.6" fill="#FDE68A" opacity="0.25"/><circle cx="17" cy="17" r="1" fill="#FDE68A"/></svg>,
  meteor: () => <svg viewBox="0 0 24 24" width="22" height="22"><line x1="20" y1="4" x2="10" y2="14" stroke="#F0F9FF" strokeWidth="2" strokeLinecap="round"/><line x1="17" y1="4" x2="11" y2="10" stroke="#F0F9FF" strokeWidth="1" strokeLinecap="round" opacity="0.5"/><circle cx="6" cy="18" r="1" fill="#F0F9FF"/></svg>,
  petals: () => <svg viewBox="0 0 24 24" width="22" height="22"><ellipse cx="10" cy="10" rx="3" ry="1.8" fill="#F9A8D4" transform="rotate(30 10 10)"/><ellipse cx="16" cy="16" rx="2.4" ry="1.4" fill="#F9A8D4" transform="rotate(-20 16 16)"/><ellipse cx="6" cy="17" rx="2" ry="1.2" fill="#F9A8D4" transform="rotate(60 6 17)"/></svg>,
}

export const CHAT_THEMES = [
  { key: 'off', label: 'Off', free: true },
  { key: 'bubbles', label: 'Bubbles', free: true },
  { key: 'drift', label: 'Drift', free: true },
  { key: 'rain', label: 'Neon Rain', free: false },
  { key: 'embers', label: 'Embers', free: false },
  { key: 'snowfall', label: 'Snowfall', free: false },
  { key: 'confetti', label: 'Confetti', free: false },
  { key: 'starfield', label: 'Starfield', free: false },
  { key: 'aurora', label: 'Aurora', free: false },
  { key: 'neonGrid', label: 'Neon Grid', free: false },
  { key: 'fireflies', label: 'Fireflies', free: false },
  { key: 'meteor', label: 'Meteor Shower', free: false },
  { key: 'petals', label: 'Sakura Petals', free: false },
]

export default function ChatBackgroundAnimation({ theme, wallpaperUrl }) {
  if (wallpaperUrl) {
    return (
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `url(${wallpaperUrl})`, backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
      </div>
    )
  }

export default function ThemePickerModal({ conversationId, currentTheme, canUsePro, userRole, onSelectTheme, onUpgrade, onBecomeSeller, onClose, currentWallpaperId, onSelectWallpaper }) {
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState(currentTheme)
  const [wallpapers, setWallpapers] = useState([])
const [uploading, setUploading] = useState(false)
const [activeWallpaperId, setActiveWallpaperId] = useState(currentWallpaperId ?? null)
const fileInputRef = useRef(null)


useEffect(() => {
    if (!canUsePro) return
    axios.get('/api/chat-wallpapers').then(({ data }) => setWallpapers(data)).catch(() => {})
}, [canUsePro])

  const select = async (theme) => {
    if (!theme.free && !canUsePro) { onUpgrade(); return }
    setSaving(theme.key); setError('')
    try {
      await axios.patch(`/api/conversations/${conversationId}/theme`, { theme: theme.key })
      setApplied(theme.key)
      onSelectTheme(theme.key)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not update theme.')
    } finally { setSaving(null) }
  }

  const uploadWallpaper = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
        const fd = new FormData()
        fd.append('image', file)
        const { data } = await axios.post('/api/chat-wallpapers', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setWallpapers(prev => [data, ...prev])
        await selectWallpaper(data.id)
    } catch (err) {
        setError(err.response?.data?.message ?? 'Upload failed.')
    } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }
}

const selectWallpaper = async (id) => {
    try {
        await axios.patch(`/api/conversations/${conversationId}/wallpaper`, { wallpaper_id: id })
        setActiveWallpaperId(id)
        setApplied(null) 
        onSelectWallpaper(id, wallpapers.find(w => w.id === id)?.url)
    } catch (err) {
        setError(err.response?.data?.message ?? 'Could not set wallpaper.')
    }
}

  const sellerNotPro = userRole === 'seller' && !canUsePro
  const isBuyer = userRole !== 'seller'
  const showUpsell = isBuyer || sellerNotPro

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'rgba(0,0,0,0.7)' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 951, maxWidth: 480, margin: '0 auto', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', borderRadius: '22px 22px 0 0', padding: '10px 20px calc(20px + env(safe-area-inset-bottom,0px))', maxHeight: '78vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)', margin: '4px auto 16px' }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <RiCloseLine size={16} />
        </button>

        <p style={{ margin: '0 32px 4px 0', color: '#fff', fontWeight: 800, fontSize: 16 }}>Chat Background</p>

        {showUpsell ? (
          <div style={{ textAlign: 'center', padding: '24px 8px 8px' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,107,53,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <RiVipDiamondLine size={26} color="#FF6B35" />
            </div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 8px' }}>
              {isBuyer ? 'Animations are for Pro seller accounts' : 'Upgrade to unlock chat backgrounds'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.6, margin: '0 0 20px' }}>
              {isBuyer
                ? 'Start selling and upgrade to Flockr Pro to unlock animated backgrounds for your chats.'
                : 'Flockr Pro sellers can pick a custom animated background — shown to everyone they chat with.'}
            </p>
            <button
              onClick={isBuyer ? onBecomeSeller : onUpgrade}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 26px', borderRadius: 999, background: '#FF6B35', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              {isBuyer ? <><RiStore3Line size={16} /> Start Selling</> : <><RiVipDiamondLine size={16} /> Upgrade to Pro</>}
            </button>
          </div>
        ) : (
          <>
            <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,0.4)', fontSize: 12.5 }}>This background shows to anyone you chat with here.</p>
            {error && <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {CHAT_THEMES.map(theme => {
                const active = applied === theme.key
                const IconEl = Icon[theme.key]
                return (
                  <button key={theme.key} onClick={() => select(theme)} disabled={saving === theme.key}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 6px', borderRadius: 16, background: active ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? '#FF6B35' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', position: 'relative' }}>
                    {!theme.free && (
                      <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,107,53,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RiVipDiamondLine size={10} color="#FF6B35" />
                      </div>
                    )}
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {active ? <RiCheckLine size={18} color="#FF6B35" /> : <IconEl />}
                    </div>
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>{theme.label}</span>
                  </button>
                )
              })}
            </div>

              {canUsePro && (
    <>
        <p style={{ margin: '22px 0 4px', color: '#fff', fontWeight: 700, fontSize: 14 }}>Wallpaper</p>
        <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Add a wallpaper</p>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ flexShrink: 0, width: 70, height: 96, borderRadius: 14, border: '1.5px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'not-allowed' : 'pointer' }}
            >
                {uploading
                    ? <RiImageLine size={20} color="rgba(255,255,255,0.3)" />
                    : <div style={{ width: 30, height: 30, borderRadius: 999, background: 'rgba(255,107,53,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiAddLine size={18} color="#FF6B35" /></div>
                }
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadWallpaper} style={{ display: 'none' }} />
            {wallpapers.map(w => (
                <button key={w.id} onClick={() => selectWallpaper(w.id)} style={{ flexShrink: 0, width: 70, height: 96, borderRadius: 14, padding: 0, border: `2px solid ${activeWallpaperId === w.id ? '#FF6B35' : 'transparent'}`, cursor: 'pointer', overflow: 'hidden' }}>
                    <img src={w.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
            ))}
        </div>
    </>
)}

          </>
        )}
      </div>
    </>
  )
}