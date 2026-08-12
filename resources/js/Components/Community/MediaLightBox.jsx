import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link } from '@inertiajs/react'
import {
  RiCloseLine, RiHeartLine, RiHeartFill, RiChat1Line, RiShareForwardLine, RiEyeLine,
  RiMoreLine, RiVolumeMuteLine, RiVolumeUpLine, RiScanLine,
  RiAlertLine, RiProhibitedLine,
} from 'react-icons/ri'
import Av from './Av'
import FollowButton from './FollowButton'
import PostShareSheet from './PostShareSheet'
import VerifiedBadge from '@/Components/VerifiedBadge'
import { timeAgo, fmtCount } from './Helpers'
import { hasUserInteracted, onFirstInteraction } from '@/lib/videoAutoplay'
import { useLikeAnimation, LikeAnimationOverlay } from '@/Components/LikeAnimation'
import { useVideoSeek } from '@/lib/useVideoSeek'
import { ensurePlaying } from '@/lib/ensurePlaying'

const AUTO_ADVANCE_KEY = 'flockr_lightbox_autoadvance'

function mediaFor(post) {
  return post.media?.length ? post.media : (post.media_url ? [{ media_url: post.media_url, media_type: post.media_type }] : [])
}

function MoreSheet({ onClose, autoAdvance, onToggleAutoAdvance, speed, onSetSpeed, hasVideo, onReport, onBlock }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1009, background: 'rgba(0,0,0,0.55)' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1010, background: 'rgba(18,18,18,0.98)', backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 14px' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Options</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RiCloseLine size={18} />
          </button>
        </div>

        {hasVideo && (
          <>
            <button onClick={onToggleAutoAdvance} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', fontSize: 14, fontWeight: 600 }}>
                <RiScanLine size={18} color="#FF6B35" /> Auto-scroll to next
              </span>
              <span style={{ padding: '4px 10px', borderRadius: 999, background: autoAdvance ? 'rgba(255,107,53,0.2)' : 'rgba(255,255,255,0.08)', color: autoAdvance ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700 }}>
                {autoAdvance ? 'On' : 'Off'}
              </span>
            </button>

            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Playback Speed</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                  <button key={s} onClick={() => onSetSpeed(s)}
                    style={{ padding: '6px 13px', borderRadius: 999, border: `1px solid ${speed === s ? '#FF6B35' : 'rgba(255,255,255,0.1)'}`, background: speed === s ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.04)', color: speed === s ? '#FF6B35' : '#fff', fontSize: 12, fontWeight: speed === s ? 700 : 400, cursor: 'pointer' }}>
                    {s === 1 ? 'Normal' : `${s}x`}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <button onClick={onReport} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 600, borderBottom: onBlock ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
          <RiAlertLine size={18} color="rgba(255,255,255,0.5)" /> Report post
        </button>
        {onBlock && (
          <button onClick={onBlock} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 14, fontWeight: 700 }}>
            <RiProhibitedLine size={18} /> Block author
          </button>
        )}
      </div>
    </>
  )
}

export default function MediaLightbox({
  posts: rawPosts, startPostIndex, startMediaIndex = 0, onClose,
  auth, onLike, followingMap, onFollowChange, onLoadMore, hasMore,
  onReport, onBlockAuthor,
}) {
  const posts = useMemo(() => rawPosts.filter(p => mediaFor(p).length > 0), [rawPosts])

  const [postIndex, setPostIndex] = useState(Math.min(startPostIndex, Math.max(posts.length - 1, 0)))
  const [mediaIndexByPost, setMediaIndexByPost] = useState(() => ({ [posts[startPostIndex]?.id]: startMediaIndex }))
  const [autoAdvance, setAutoAdvance] = useState(() => {
    try { return localStorage.getItem(AUTO_ADVANCE_KEY) !== 'off' } catch { return true }
  })
  const [muted, setMuted] = useState(() => !hasUserInteracted())
  const [speed, setSpeed] = useState(1)
  const [progress, setProgress] = useState(0)
  const [shareTarget, setShareTarget] = useState(null)
  const [showMore, setShowMore] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [showPPIcon, setShowPPIcon] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)

  const outerRef = useRef(null)
  const slideRefs = useRef(new Map())
  const innerRefs = useRef({})
  const videoRefs = useRef({})
  const seekBarRef = useRef(null)
  const loadingMoreRef = useRef(false)
  const likeBtnRefs = useRef({})
  const lastTapRef = useRef(0)
  const tapTimerRef = useRef(null)
  const userPausedRef = useRef(false)

  const { burst, trigger: triggerLikeAnim } = useLikeAnimation()

  const activePost = posts[postIndex]
  const activeMedia = activePost ? mediaFor(activePost) : []
  const activeMediaIndex = activePost ? (mediaIndexByPost[activePost.id] ?? 0) : 0
  const hasVideoInActivePost = activeMedia.some(m => m.media_type === 'video')
  const activeVideoKey = activePost ? `${activePost.id}-${activeMediaIndex}` : null
  const activeVideoEl = activeVideoKey ? videoRefs.current[activeVideoKey] : null
  const activeItemIsVideo = activeMedia[activeMediaIndex]?.media_type === 'video'

  const getActiveVideoEl = useCallback(() => videoRefs.current[activeVideoKey], [activeVideoKey])
  const { seekingRef, handleSeekDown, handleSeekMove, handleSeekUp } = useVideoSeek(
    getActiveVideoEl, seekBarRef, { onSeeking: setProgress }
  )

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (!posts[postIndex]) onClose()
  }, [posts, postIndex, onClose])

  useEffect(() => {
    if (hasUserInteracted()) return
    return onFirstInteraction(() => setMuted(false))
  }, [])

  useEffect(() => {
    setPlaying(true)
    setShowPPIcon(false)
    setVideoLoading(false)
  }, [activeVideoKey])

  useEffect(() => {
    const root = outerRef.current
    if (!root) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          const idx = Number(entry.target.dataset.index)
          setPostIndex(prev => (prev !== idx ? idx : prev))
          if (hasMore && !loadingMoreRef.current && posts.length - idx <= 3) {
            loadingMoreRef.current = true
            Promise.resolve(onLoadMore?.()).finally(() => { loadingMoreRef.current = false })
          }
        }
      })
    }, { root, threshold: [0.6] })
    slideRefs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.length])

  useEffect(() => {
    const el = slideRefs.current.get(posts[startPostIndex]?.id)
    el?.scrollIntoView({ behavior: 'auto', block: 'start' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    userPausedRef.current = false
    Object.entries(videoRefs.current).forEach(([key, el]) => {
      if (!el) return
      if (key === activeVideoKey) { el.muted = muted; el.playbackRate = speed; el.play().catch(() => {}) }
      else el.pause()
    })
  }, [postIndex, activeMediaIndex, activePost?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (activeVideoEl) activeVideoEl.muted = muted }, [muted, activeVideoEl])
  useEffect(() => { if (activeVideoEl) activeVideoEl.playbackRate = speed }, [speed, activeVideoEl])

useEffect(() => {
    let raf
    const tick = () => {
      const el = videoRefs.current[activeVideoKey]
      if (el?.duration && !seekingRef.current) setProgress((el.currentTime / el.duration) * 100)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [activeVideoKey])

  const scrollToPost = (i) => {
    if (i < 0 || i >= posts.length) return
    slideRefs.current.get(posts[i]?.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToMediaWithin = (post, i) => {
    innerRefs.current[post.id]?.children[i]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }

  const onInnerScroll = (post) => () => {
    const track = innerRefs.current[post.id]
    if (!track || !track.clientWidth) return
    const i = Math.round(track.scrollLeft / track.clientWidth)
    setMediaIndexByPost(prev => prev[post.id] === i ? prev : { ...prev, [post.id]: i })
  }

  const handleVideoEnded = (post, mediaIdx) => {
    if (post.id !== activePost?.id || mediaIdx !== activeMediaIndex) return
    const el = videoRefs.current[`${post.id}-${mediaIdx}`]
    const items = mediaFor(post)

    if (!autoAdvance) {
      if (el) { el.currentTime = 0; el.play().catch(() => {}) }
      return
    }

    if (mediaIdx < items.length - 1) { scrollToMediaWithin(post, mediaIdx + 1); return }
    if (postIndex < posts.length - 1) { scrollToPost(postIndex + 1); return }

    if (el) { el.currentTime = 0; el.play().catch(() => {}) }
  }

  const toggleAutoAdvance = () => {
    setAutoAdvance(a => {
      const next = !a
      try { localStorage.setItem(AUTO_ADVANCE_KEY, next ? 'on' : 'off') } catch {}
      return next
    })
  }

 const handleVideoTapClick = (e, post, mi) => {
    const v = e.currentTarget
    const clientX = e.clientX, clientY = e.clientY
    const now = Date.now()
    const dt = now - lastTapRef.current
    if (dt > 0 && dt < 300) {
      clearTimeout(tapTimerRef.current)
      tapTimerRef.current = null
      lastTapRef.current = 0
      if (!post.is_liked_by_me) onLike(post)
      triggerLikeAnim(clientX, clientY)
    } else {
      lastTapRef.current = now
      tapTimerRef.current = setTimeout(() => {
        tapTimerRef.current = null
        if (v.paused) { userPausedRef.current = false; v.play().catch(() => {}) }
        else { userPausedRef.current = true; v.pause() }
        setShowPPIcon(true)
        setTimeout(() => setShowPPIcon(false), 500)
      }, 300)
    }
  }

  const handleImageTapClick = (e, post) => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      if (!post.is_liked_by_me) onLike(post)
      triggerLikeAnim(clientX, clientY)
    }
    lastTapRef.current = now
  }

  if (!activePost) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', touchAction: 'manipulation' }}>
      {shareTarget && <PostShareSheet post={shareTarget} onClose={() => setShareTarget(null)} />}
      {showMore && (
        <MoreSheet
          onClose={() => setShowMore(false)}
          autoAdvance={autoAdvance}
          onToggleAutoAdvance={toggleAutoAdvance}
          speed={speed}
          onSetSpeed={setSpeed}
          hasVideo={hasVideoInActivePost}
          onReport={() => { setShowMore(false); onReport?.(activePost) }}
          onBlock={onBlockAuthor && auth?.user?.id !== activePost.user_id
            ? () => { setShowMore(false); onBlockAuthor(activePost) }
            : null}
        />
      )}

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0))' }}>
        <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <RiCloseLine size={20} />
        </button>
        <button onPointerDown={() => setShowMore(true)} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <RiMoreLine size={20} />
        </button>
      </div>

      <div ref={outerRef}
        style={{ height: '100%', overflowY: 'auto', scrollSnapType: 'y mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {posts.map((post, pIdx) => {
          const media = mediaFor(post)
          const mIdx = mediaIndexByPost[post.id] ?? 0
          const isActiveSlide = pIdx === postIndex
          const slideActiveItemIsVideo = isActiveSlide && media[mIdx]?.media_type === 'video'

          return (
            <div key={post.id} data-index={pIdx}
              ref={el => { if (el) slideRefs.current.set(post.id, el); else slideRefs.current.delete(post.id) }}
              style={{ height: '100%', scrollSnapAlign: 'start', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <div ref={el => { innerRefs.current[post.id] = el }} onScroll={onInnerScroll(post)}
                style={{ flex: 1, display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                {media.map((item, mi) => (
                  <div key={mi} style={{ flex: '0 0 100%', scrollSnapAlign: 'start', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    {item.media_type === 'video' ? (
                      <video
                        ref={el => { videoRefs.current[`${post.id}-${mi}`] = el }}
                        src={item.media_url}
                        poster={item.thumbnail_url}
                        playsInline
                        preload="metadata"
                        muted={muted}
                        autoPlay={isActiveSlide && mi === mIdx}
                        onEnded={() => handleVideoEnded(post, mi)}
                        onPlay={() => { if (isActiveSlide && mi === mIdx) setPlaying(true) }}
                        onPause={() => {
                          if (isActiveSlide && mi === mIdx) {
                            setPlaying(false)
                            if (!userPausedRef.current) ensurePlaying(videoRefs.current[`${post.id}-${mi}`])
                          }
                        }}
                        onStalled={() => { if (isActiveSlide && mi === mIdx) ensurePlaying(videoRefs.current[`${post.id}-${mi}`]) }}
                        onWaiting={() => { if (isActiveSlide && mi === mIdx) setVideoLoading(true) }}
                        onCanPlay={() => { if (isActiveSlide && mi === mIdx) setVideoLoading(false) }}
                        onPlaying={() => { if (isActiveSlide && mi === mIdx) setVideoLoading(false) }}
                        onClick={(e) => handleVideoTapClick(e, post, mi)}
                        style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
                      />
                    ) : (
                      <img src={item.media_url} alt="" onClick={(e) => handleImageTapClick(e, post)}
                        style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} />
                    )}
                  </div>
                ))}
              </div>

              {media.length > 1 && (
                <div style={{ position: 'absolute', top: 60, right: 14, padding: '3px 9px', borderRadius: 999, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                  {mIdx + 1}/{media.length}
                </div>
              )}

              {slideActiveItemIsVideo && (showPPIcon || !playing) && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 3 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {playing
                      ? <svg width={22} height={22} fill="white" viewBox="0 0 24 24"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>
                      : <svg width={22} height={22} fill="white" viewBox="0 0 24 24"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
                    }
                  </div>
                </div>
              )}

              {slideActiveItemIsVideo && videoLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 4 }}>
                  <div style={{ width: 36, height: 36, border: '2.5px solid rgba(255,255,255,0.15)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'lb-spin 0.8s linear infinite' }} />
                </div>
              )}

              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 16px calc(14px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(0deg, rgba(0,0,0,0.88), rgba(0,0,0,0.35) 65%, transparent)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {slideActiveItemIsVideo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onPointerDown={() => setMuted(m => !m)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
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

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Link href={`/@${post.user?.username}`}><Av user={post.user} size={34} /></Link>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{post.user?.name}</span>
                      <VerifiedBadge type={post.user?.verification_type} size={12} />
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>@{post.user?.username} · {timeAgo(post.created_at)}</span>
                  </div>
                  {auth?.user?.id !== post.user_id && (
                    <FollowButton userId={post.user_id} isOwner={false} isFollowing={followingMap?.[post.user_id] ?? !!post.is_following_author} onChange={onFollowChange} auth={auth} />
                  )}
                </div>

                {post.content && (
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 66, overflow: 'hidden' }}>{post.content}</p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: -8 }}>
                  <button ref={el => { likeBtnRefs.current[post.id] = el }} onPointerDown={() => onLike(post)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 999, color: post.is_liked_by_me ? '#EF4444' : 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500 }}>
                    {post.is_liked_by_me ? <RiHeartFill size={21} /> : <RiHeartLine size={21} />}
                    {post.likes_count > 0 && <span>{fmtCount(post.likes_count)}</span>}
                  </button>
                  <Link href={`/community/posts/${post.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 8, borderRadius: 999, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                    <RiChat1Line size={21} />
                    {post.comments_count > 0 && <span>{fmtCount(post.comments_count)}</span>}
                  </Link>
                  <button onPointerDown={() => setShareTarget(post)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 999, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500 }}>
                    <RiShareForwardLine size={20} />
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 8, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500 }}>
                    <RiEyeLine size={21} />
                    {post.views_count > 0 && <span>{fmtCount(post.views_count)}</span>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Lives once, outside the per-slide loop — the burst state carries its
          own screen coordinates so it renders correctly regardless of which
          slide triggered it. */}
      <LikeAnimationOverlay burst={burst} />

      <style>{`@keyframes lb-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}