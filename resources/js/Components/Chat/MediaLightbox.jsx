import { useState, useRef, useEffect } from 'react'
import { RiCloseLine, RiMoreLine, RiVolumeMuteLine, RiVolumeUpLine } from 'react-icons/ri'
import MessageActionSheet from './MessageActionSheet'

export default function MediaLightbox({ mediaMessages, startIndex = 0, senderName, canDeleteMsg, fmtTime, onReply, onDelete, onClose }) {
    const [index, setIndex] = useState(startIndex)
    const [muted, setMuted] = useState(true)
    const [progress, setProgress] = useState(0)
    const [showMore, setShowMore] = useState(false)

    const outerRef = useRef(null)
    const slideRefs = useRef(new Map())
    const videoRefs = useRef({})
    const activeMsg = mediaMessages[index]

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [])

    useEffect(() => { if (!mediaMessages[index]) onClose() }, [mediaMessages, index, onClose])

    useEffect(() => {
        const root = outerRef.current
        if (!root) return
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                    setIndex(prev => (prev !== Number(entry.target.dataset.index) ? Number(entry.target.dataset.index) : prev))
                }
            })
        }, { root, threshold: [0.6] })
        slideRefs.current.forEach(el => el && observer.observe(el))
        return () => observer.disconnect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mediaMessages.length])

    useEffect(() => {
        const el = slideRefs.current.get(mediaMessages[startIndex]?.id)
        el?.scrollIntoView({ behavior: 'auto', block: 'start' })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        Object.entries(videoRefs.current).forEach(([id, el]) => {
            if (!el) return
            if (activeMsg && id === String(activeMsg.id)) { el.muted = muted; el.play().catch(() => {}) }
            else el.pause()
        })
    }, [activeMsg?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        let raf
        const tick = () => {
            const el = videoRefs.current[activeMsg?.id]
            if (el?.duration) setProgress((el.currentTime / el.duration) * 100)
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [activeMsg?.id])

    const togglePlay = () => {
        const el = videoRefs.current[activeMsg?.id]
        if (!el) return
        if (el.muted) { el.muted = false; setMuted(false) }
        if (el.paused) el.play().catch(() => {}); else el.pause()
    }

    if (!activeMsg) return null
    const isVideo = activeMsg.media_type === 'video'

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: '#000', touchAction: 'manipulation' }}>
            {showMore && (
                <MessageActionSheet
                    msg={activeMsg}
                    canDelete={canDeleteMsg(activeMsg)}
                    onReply={() => { setShowMore(false); onReply(activeMsg); onClose() }}
                    onDelete={() => { setShowMore(false); onDelete(activeMsg); onClose() }}
                    onClose={() => setShowMore(false)}
                />
            )}

            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0))' }}>
                <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <RiCloseLine size={20} />
                </button>
                <div style={{ padding: '5px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 600 }}>
                    {senderName}
                </div>
                <button onClick={() => setShowMore(true)} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <RiMoreLine size={20} />
                </button>
            </div>

            <div ref={outerRef} style={{ height: '100%', overflowY: 'auto', scrollSnapType: 'y mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                {mediaMessages.map((msg, i) => (
                    <div key={msg.id} data-index={i}
                        ref={el => { if (el) slideRefs.current.set(msg.id, el); else slideRefs.current.delete(msg.id) }}
                        style={{ height: '100%', scrollSnapAlign: 'start', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {msg.media_type === 'video' ? (
                            <video ref={el => { videoRefs.current[msg.id] = el }} src={msg.media_url} playsInline preload="metadata" muted={muted} autoPlay={index === i} onClick={togglePlay}
                                style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} />
                        ) : (
                            <img src={msg.media_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} />
                        )}
                    </div>
                ))}
            </div>

            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 16px calc(14px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(0deg, rgba(0,0,0,0.7), rgba(0,0,0,0.2) 65%, transparent)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {isVideo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={() => setMuted(m => !m)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                            {muted ? <RiVolumeMuteLine size={14} /> : <RiVolumeUpLine size={14} />}
                        </button>
                        <div style={{ flex: 1, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.25)' }}>
                            <div style={{ height: '100%', borderRadius: 999, background: '#FF6B35', width: `${progress}%`, transition: 'width 0.08s linear' }} />
                        </div>
                    </div>
                )}
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{fmtTime(activeMsg.created_at)}</span>
            </div>
        </div>
    )
}