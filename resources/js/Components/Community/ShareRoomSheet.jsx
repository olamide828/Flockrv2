import { useState } from 'react'
import {
  RiCloseLine, RiWhatsappLine, RiFacebookCircleLine, RiTelegramLine,
  RiTwitterXLine, RiLink, RiCheckLine, RiShareForwardLine,
} from 'react-icons/ri'

/**
 * Reusable share sheet for a room's invite link.
 * Public rooms: rendered for any member.
 * Private rooms: only rendered for the seller (gated by the caller).
 */
export default function ShareRoomSheet({ room, onClose }) {
  const [copied, setCopied] = useState(false)
  const url      = `${window.location.origin}/community/rooms/join/${room.invite_code}`
  const enc      = encodeURIComponent(url)
  const encTitle = encodeURIComponent(`Join ${room.name} on Flockr`)
  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const opts = [
    { label: 'WhatsApp', Icon: RiWhatsappLine, color: '#25D366', bg: 'rgba(37,211,102,0.12)', href: `https://wa.me/?text=${encTitle}%20${enc}` },
    { label: 'Facebook', Icon: RiFacebookCircleLine, color: '#1877F2', bg: 'rgba(24,119,242,0.12)', href: `https://www.facebook.com/sharer/sharer.php?u=${enc}` },
    { label: 'Telegram', Icon: RiTelegramLine, color: '#26A5E4', bg: 'rgba(38,165,228,0.12)', href: `https://t.me/share/url?url=${enc}&text=${encTitle}` },
    { label: 'X (Twitter)', Icon: RiTwitterXLine, color: '#fff', bg: 'rgba(255,255,255,0.08)', href: `https://twitter.com/intent/tweet?text=${encTitle}&url=${enc}` },
    ...(canShare ? [{ label: 'More', Icon: RiShareForwardLine, color: '#FF6B35', bg: 'rgba(255,107,53,0.12)', href: null, onClick: () => navigator.share({ title: room.name, url }).catch(() => {}) }] : []),
  ]

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 951, background: 'rgba(18,18,18,0.98)', backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', animation: 'shareSlideUp 0.28s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 14px' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Share {room.name}</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RiCloseLine size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 20, padding: '0 20px 24px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {opts.map(o => (
            <button key={o.label}
              onClick={() => { if (o.onClick) { o.onClick(); return } if (o.href) window.open(o.href, '_blank', 'noopener,noreferrer') }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: o.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${o.color}22` }}>
                <o.Icon size={26} color={o.color} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, whiteSpace: 'nowrap' }}>{o.label}</span>
            </button>
          ))}
        </div>
        {room.is_private && (
          <div style={{ margin: '0 16px 8px', padding: '10px 14px', background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)', borderRadius: 12 }}>
            <p style={{ margin: 0, color: '#FF6B35', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>INVITE CODE</p>
            <p style={{ margin: '2px 0 0', color: '#fff', fontSize: 18, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.15em' }}>{room.invite_code}</p>
          </div>
        )}
        <div style={{ margin: '0 16px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <RiLink size={18} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
          <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, background: copied ? 'rgba(16,185,129,0.15)' : '#FF6B35', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {copied ? <><RiCheckLine size={13} /> Copied!</> : 'Copy link'}
          </button>
        </div>
      </div>
      <style>{`@keyframes shareSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </>
  )
}