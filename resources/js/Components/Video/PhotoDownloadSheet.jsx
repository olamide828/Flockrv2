import { useState } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { RiCheckLine, RiCloseLine, RiDownload2Line } from 'react-icons/ri'

/**
 * Bottom sheet for saving photos from a photo post. Photos sit in a row; tap to pick the ones you want
 * (all are ticked to start). Each one is downloaded with the Flockr watermark added by the server.
 */
export default function PhotoDownloadSheet({ video, onClose, showToast }) {
  const photos = video.photo_urls ?? []
  const [picked, setPicked] = useState(() => new Set(photos.map((_, i) => i)))
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(0)

  const toggle = (i) => setPicked((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })
  const allOn = picked.size === photos.length

  const save = async () => {
    const list = [...picked].sort((a, b) => a - b)
    if (!list.length || busy) return
    setBusy(true); setDone(0)
    let ok = 0
    // One photo = a .jpg. Several = ONE .zip (browsers block pages that start several downloads at once).
    try {
      const single = list.length === 1
      const res = await axios.get(single ? `/api/videos/${video.ulid}/photos/${list[0]}/download` : `/api/videos/${video.ulid}/photos/download`, {
        params: single ? undefined : { i: list.join(',') }, responseType: 'blob', timeout: 120000,
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = single ? `flockr-${video.user?.username ?? 'photo'}-${list[0] + 1}.jpg` : `flockr-${video.user?.username ?? 'photo'}-photos.zip`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 15000)
      ok = list.length; setDone(ok)
    } catch {
      showToast?.('Could not download. Please try again.', 'error')
    }
    setBusy(false)
    if (ok) { showToast?.(ok === 1 ? 'Photo saved' : `${ok} photos saved as one zip file`); onClose() }
  }

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: 'rgba(20,20,22,0.97)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '10px 0 calc(16px + env(safe-area-inset-bottom))', color: '#fff' }}>
        <div style={{ width: 38, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.2)', margin: '0 auto 12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 18px 12px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Download photos</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{picked.size} of {photos.length} selected · saved with the Flockr watermark</p>
          </div>
          <button onClick={() => setPicked(allOn ? new Set() : new Set(photos.map((_, i) => i)))} style={{ background: 'none', border: 'none', color: '#FF6B35', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginRight: 8 }}>{allOn ? 'Clear' : 'Select all'}</button>
          <button onClick={onClose} aria-label="Close" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 30, height: 30, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><RiCloseLine size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '4px 18px 14px', scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch' }}>
          {photos.map((src, i) => {
            const on = picked.has(i)
            return (
              <button key={i} onClick={() => toggle(i)} style={{ position: 'relative', flexShrink: 0, width: 108, height: 144, padding: 0, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', scrollSnapAlign: 'start', background: '#000', border: `2px solid ${on ? '#FF6B35' : 'rgba(255,255,255,0.12)'}` }}>
                <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: on ? 1 : 0.55 }} />
                <span style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: on ? '#FF6B35' : 'rgba(0,0,0,0.55)', border: on ? 'none' : '1.5px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {on && <RiCheckLine size={14} color="#fff" />}
                </span>
                <span style={{ position: 'absolute', bottom: 6, left: 6, padding: '1px 7px', borderRadius: 999, background: 'rgba(0,0,0,0.6)', fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
              </button>
            )
          })}
        </div>

        <div style={{ padding: '0 18px' }}>
          <button onClick={save} disabled={!picked.size || busy} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: picked.size ? '#FF6B35' : 'rgba(255,255,255,0.1)', color: picked.size ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: 800, cursor: picked.size && !busy ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <RiDownload2Line size={18} />
            {busy ? `Saving ${done}/${picked.size}…` : `Download ${picked.size || ''} ${picked.size === 1 ? 'photo' : 'photos'}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
