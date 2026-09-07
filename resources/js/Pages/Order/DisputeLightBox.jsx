import { useState, useEffect } from 'react'
import { RiCloseLine, RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri'

export default function DisputeLightbox({ items, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx)
  const prev = e => { e.stopPropagation(); setIdx(i => (i - 1 + items.length) % items.length) }
  const next = e => { e.stopPropagation(); setIdx(i => (i + 1) % items.length) }

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft')  setIdx(i => (i - 1 + items.length) % items.length)
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % items.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items.length, onClose])

  const current = items[idx]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 1 }}>
        <RiCloseLine size={22} />
      </button>
      {items.length > 1 && (
        <span style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: 999 }}>
          {idx + 1} / {items.length}
        </span>
      )}

      {current.type === 'video' ? (
        <video src={current.url} controls autoPlay onClick={e => e.stopPropagation()} style={{ maxWidth: '88vw', maxHeight: '82vh', borderRadius: 14 }} />
      ) : (
        <img src={current.url} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '88vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: 14, userSelect: 'none' }} />
      )}

      {items.length > 1 && (
        <>
          <button onClick={prev} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><RiArrowLeftSLine size={24} /></button>
          <button onClick={next} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><RiArrowRightSLine size={24} /></button>
        </>
      )}
    </div>
  )
}