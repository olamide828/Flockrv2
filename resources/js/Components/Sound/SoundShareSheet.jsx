import { useState } from 'react'
import { createPortal } from 'react-dom'
import { RiCheckLine, RiCloseLine, RiFacebookCircleLine, RiInstagramLine, RiLink, RiRedditLine, RiShareForwardLine, RiTelegramLine, RiTwitterXLine, RiWhatsappLine } from 'react-icons/ri'

/** Share sheet for a sound. Same look as the video share sheet: app icons row + copy-link bar. */
export default function SoundShareSheet({ sound, onClose }) {
    const [copied, setCopied] = useState(false)
    const url = `${window.location.origin}${sound.path || `/sound/${sound.id}`}`
    const text = `${sound.title} · ${sound.artist} on Flockr`
    const enc = encodeURIComponent(url)
    const encText = encodeURIComponent(text)
    const canShare = typeof navigator !== 'undefined' && !!navigator.share

    const copy = async () => {
        try { await navigator.clipboard.writeText(url) } catch { /* ignore */ }
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const opts = [
        { label: 'WhatsApp', Icon: RiWhatsappLine, color: '#25D366', bg: 'rgba(37,211,102,0.12)', href: `https://wa.me/?text=${encText}%20${enc}` },
        { label: 'Facebook', Icon: RiFacebookCircleLine, color: '#1877F2', bg: 'rgba(24,119,242,0.12)', href: `https://www.facebook.com/sharer/sharer.php?u=${enc}` },
        { label: 'Telegram', Icon: RiTelegramLine, color: '#26A5E4', bg: 'rgba(38,165,228,0.12)', href: `https://t.me/share/url?url=${enc}&text=${encText}` },
        { label: 'X (Twitter)', Icon: RiTwitterXLine, color: '#fff', bg: 'rgba(255,255,255,0.08)', href: `https://twitter.com/intent/tweet?text=${encText}&url=${enc}` },
        { label: 'Reddit', Icon: RiRedditLine, color: '#FF4500', bg: 'rgba(255,69,0,0.12)', href: `https://reddit.com/submit?url=${enc}&title=${encText}` },
        { label: 'Instagram', Icon: RiInstagramLine, color: '#E1306C', bg: 'rgba(225,48,108,0.12)', onClick: copy },
        ...(canShare ? [{ label: 'More', Icon: RiShareForwardLine, color: '#FF6B35', bg: 'rgba(255,107,53,0.12)', onClick: () => navigator.share({ title: sound.title, url }).catch(() => {}) }] : []),
    ]

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200 }} onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
            <style>{`@keyframes ssUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxWidth: 560, margin: '0 auto', background: 'rgba(18,18,18,0.98)', backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', animation: 'ssUp 0.28s cubic-bezier(0.32,0.72,0,1)', fontFamily: 'DM Sans, sans-serif' }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}><div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} /></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 14px' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Share sound</span>
                    <button onClick={onClose} aria-label="Close" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiCloseLine size={18} /></button>
                </div>
                <div style={{ display: 'flex', gap: 20, padding: '0 20px 24px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {opts.map(o => (
                        <button key={o.label} onClick={() => { if (o.onClick) { o.onClick(); return } window.open(o.href, '_blank', 'noopener,noreferrer') }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                            <div style={{ width: 56, height: 56, borderRadius: 16, background: o.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${o.color}22` }}><o.Icon size={26} color={o.color} /></div>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, whiteSpace: 'nowrap' }}>{o.label}</span>
                        </button>
                    ))}
                </div>
                <div style={{ margin: '0 16px calc(env(safe-area-inset-bottom) + 20px)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <RiLink size={18} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                    <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, background: copied ? 'rgba(16,185,129,0.15)' : '#FF6B35', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0, transition: 'background 0.2s' }}>
                        {copied ? <><RiCheckLine size={13} /> Copied!</> : 'Copy link'}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    )
}
