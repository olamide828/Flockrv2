import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  RiCloseLine, RiMoreLine, RiReplyLine, RiDeleteBinLine, RiShareForwardLine,
  RiVolumeMuteLine, RiVolumeUpLine, RiCheckLine, RiWhatsappLine, RiTelegramLine, RiLink,
  RiHeartLine, RiHeartFill,
} from 'react-icons/ri'
import { useLikeAnimation, LikeAnimationOverlay } from '@/Components/LikeAnimation'
import { hasUserInteracted, onFirstInteraction } from '@/lib/videoAutoplay'
import { useVideoSeek } from '@/lib/useVideoSeek'
import { ensurePlaying } from '@/lib/ensurePlaying'
import { fmtTime } from './Helpers'

function ShareOptions({ mediaUrl, onClose }) {
  const [copied, setCopied] = useState(false)
  const enc = encodeURIComponent(mediaUrl)
  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mediaUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <button onClick={() => window.open(`https://wa.me/?text=${enc}`, '_blank', 'noopener,noreferrer')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(37,211,102,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RiWhatsappLine size={22} color="#25D366" />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>WhatsApp</span>
        </button>
        <button onClick={() => window.open(`https://t.me/share/url?url=${enc}`, '_blank', 'noopener,noreferrer')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(38,165,228,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RiTelegramLine size={22} color="#26A5E4" />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Telegram</span>
        </button>
        {canShare && (
          <button onClick={() => navigator.share({ url: mediaUrl }).catch(() => {})}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,107,53,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RiShareForwardLine size={22} color="#FF6B35" />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>More</span>
          </button>
        )}
      </div>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 12px' }}>
        <RiLink size={16} color="rgba(255,255,255,0.4)" />
        <span style={{ flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mediaUrl}</span>
        <button onClick={handleCopy} style={{ padding: '6px 12px', borderRadius: 999, background: copied ? 'rgba(16,185,129,0.15)' : '#FF6B35', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          {copied ? <RiCheckLine size={12} /> : 'Copy'}
        </button>
      </div>
    </div>
  )
}

function MoreSheet({ onClose, onReply, onDelete, canDelete, mediaUrl }) {
  const [showShare, setShowShare] = useState(false)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1109, background: 'rgba(0,0,0,0.55)' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1110, background: 'rgba(24,24,26,0.85)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.12)', borderBottom: 'none', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.25)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 12px' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{showShare ? 'Share' : 'Options'}</span>
          <button onClick={showShare ? () => setShowShare(false) : onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RiCloseLine size={18} />
          </button>
        </div>

        {showShare ? (
          <ShareOptions mediaUrl={mediaUrl} onClose={onClose} />
        ) : (
          <>
            <button onClick={onReply} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <RiReplyLine size={18} color="#FF6B35" /> Reply
            </button>
            <button onClick={() => setShowShare(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 600, borderBottom: canDelete ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
              <RiShareForwardLine size={18} color="rgba(255,255,255,0.6)" /> Share
            </button>
            {canDelete && (
              <button onClick={onDelete} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 14, fontWeight: 700 }}>
                <RiDeleteBinLine size={18} /> Delete message
              </button>
            )}
          </>
        )}
      </div>
    </>
  )
}

export default function RoomMediaLightbox({ room, mediaMessages, startIndex, onClose, onReply, onDelete, canDeleteMsg, onLike }) {
  const [index, setIndex] = useState(startIndex)
  const [muted, setMuted] = useState(() => !hasUserInteracted())
  const [progress, setProgress] = useState(0)
  const [showMore, setShowMore] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const { burst, trigger: triggerLikeAnim } = useLikeAnimation()

  const outerRef = useRef(null)
  const slideRefs = useRef(new Map())
  const videoRefs = useRef({})
  const seekBarRef = useRef(null)
  const userPausedRef = useRef(false)

  const activeMsg = mediaMessages[index]
  const activeVideoEl = activeMsg ? videoRefs.current[activeMsg.id] : null
  const getActiveVideoEl = useCallback(() => videoRefs.current[activeMsg?.id], [activeMsg?.id])
  const { seekingRef, handleSeekDown, handleSeekMove, handleSeekUp } = useVideoSeek(
    getActiveVideoEl, seekBarRef, { onSeeking: setProgress }
  )

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (!mediaMessages[index]) onClose()
  }, [mediaMessages, index, onClose])

  useEffect(() => {
    if (hasUserInteracted()) return
    return onFirstInteraction(() => setMuted(false))
  }, [])

  useEffect(() => {
    userPausedRef.current = false
    setUserPaused(false)
  }, [activeMsg?.id])

  useEffect(() => {
    const root = outerRef.current
    if (!root) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          const idx = Number(entry.target.dataset.index)
          setIndex(prev => (prev !== idx ? idx : prev))
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

  useEffect(() => { if (activeVideoEl) activeVideoEl.muted = muted }, [muted, activeVideoEl])

  useEffect(() => {
    const el = activeVideoEl
    if (!el) { setProgress(0); return }
    let raf
    const tick = () => {
      if (el.duration && !seekingRef.current) setProgress((el.currentTime / el.duration) * 100)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [activeVideoEl, seekingRef])

  const togglePlay = () => {
    const el = activeVideoEl
    if (!el) return
    if (el.paused) { userPausedRef.current = false; setUserPaused(false); el.play().catch(() => {}) }
    else { userPausedRef.current = true; setUserPaused(true); el.pause() }
  }

  if (!activeMsg) return null

  const isVideo = activeMsg.media_type === 'video'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: '#000', touchAction: 'manipulation' }}>
     {showMore && (
        <MoreSheet
          onClose={() => setShowMore(false)}
          mediaUrl={`${window.location.origin}/${room.slug}/@${activeMsg.user?.username}/media/${activeMsg.id}`}
          canDelete={canDeleteMsg(activeMsg)}
          onReply={() => { setShowMore(false); onReply(activeMsg); onClose() }}
          onDelete={() => { setShowMore(false); onDelete(activeMsg); }}
        />
      )}

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0))' }}>
        <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <RiCloseLine size={20} />
        </button>
        <div style={{ padding: '5px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 600 }}>
          {activeMsg.user?.name}
        </div>
        <button onPointerDown={() => setShowMore(true)} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <RiMoreLine size={20} />
        </button>
      </div>

      <div ref={outerRef} style={{ height: '100%', overflowY: 'auto', scrollSnapType: 'y mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {mediaMessages.map((msg, i) => (
          <div key={msg.id} data-index={i}
            ref={el => { if (el) slideRefs.current.set(msg.id, el); else slideRefs.current.delete(msg.id) }}
            style={{ height: '100%', scrollSnapAlign: 'start', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {msg.media_type === 'video' ? (
              <video
                ref={el => { videoRefs.current[msg.id] = el }}
                src={msg.media_url}
                playsInline
                preload="metadata"
                muted={muted}
                autoPlay={index === i}
                onClick={togglePlay}
                onPause={() => { if (index === i && !userPausedRef.current) ensurePlaying(videoRefs.current[msg.id]) }}
                onStalled={() => { if (index === i) ensurePlaying(videoRefs.current[msg.id]) }}
                style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <img src={msg.media_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} />
            )}
          </div>
        ))}
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 16px calc(14px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(0deg, rgba(0,0,0,0.7), rgba(0,0,0,0.2) 65%, transparent)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isVideo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onPointerDown={() => setMuted(m => !m)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
              {muted ? <RiVolumeMuteLine size={14} /> : <RiVolumeUpLine size={14} />}
            </button>
            <div ref={seekBarRef}
              onPointerDown={handleSeekDown} onPointerMove={handleSeekMove} onPointerUp={handleSeekUp}
              style={{ flex: 1, height: 18, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none' }}>
              <div style={{ width: '100%', height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.25)' }}>
                <div style={{ height: '100%', borderRadius: 999, background: '#FF6B35', width: `${progress}%`, transition: 'width 0.08s linear' }} />
              </div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{fmtTime(activeMsg.created_at)}</span>
          <button onClick={(e) => { onLike?.(activeMsg); triggerLikeAnim(e.clientX, e.clientY) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', color: activeMsg.is_liked_by_me ? '#ff2d55' : '#fff' }}>
            {activeMsg.is_liked_by_me ? <RiHeartFill size={16} /> : <RiHeartLine size={16} />}
            {activeMsg.likes_count > 0 && <span style={{ fontSize: 12, fontWeight: 700 }}>{activeMsg.likes_count}</span>}
          </button>
        </div>
      </div>
      <LikeAnimationOverlay burst={burst} />
    </div>
  )
}