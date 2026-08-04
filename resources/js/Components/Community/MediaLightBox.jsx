import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from '@inertiajs/react'
import {
  RiCloseLine, RiHeartLine, RiHeartFill, RiChat1Line, RiShareForwardLine, RiEyeLine,
} from 'react-icons/ri'
import Av from './Av'
import FollowButton from './FollowButton'
import PostShareSheet from './PostShareSheet'
import VerifiedBadge from '@/Components/VerifiedBadge'
import { timeAgo, fmtCount } from './Helpers'

const AUTO_ADVANCE_KEY = 'flockr_lightbox_autoadvance'

function mediaFor(post) {
  return post.media?.length ? post.media : (post.media_url ? [{ media_url: post.media_url, media_type: post.media_type }] : [])
}

export default function MediaLightbox({
  posts, startPostIndex, startMediaIndex = 0, onClose,
  auth, onLike, followingMap, onFollowChange, onLoadMore, hasMore,
}) {
  const [postIndex, setPostIndex] = useState(startPostIndex)
  const [mediaIndexByPost, setMediaIndexByPost] = useState(() => ({ [posts[startPostIndex]?.id]: startMediaIndex }))
  const [autoAdvance, setAutoAdvance] = useState(() => {
    try { return localStorage.getItem(AUTO_ADVANCE_KEY) !== 'off' } catch { return true }
  })
  const [shareTarget, setShareTarget] = useState(null)

  const outerRef = useRef(null)
  const innerRefs = useRef({})   // postId -> horizontal track element
  const videoRefs = useRef({})   // `${postId}-${mediaIdx}` -> video element
  const loadingMoreRef = useRef(false)

  const activePost = posts[postIndex]
  const activeMedia = activePost ? mediaFor(activePost) : []
  const activeMediaIndex = activePost ? (mediaIndexByPost[activePost.id] ?? 0) : 0
  const hasVideoInActivePost = activeMedia.some(m => m.media_type === 'video')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    outerRef.current?.children[startPostIndex]?.scrollIntoView({ behavior: 'auto', block: 'start' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Play only the active post's active media item; pause everything else.
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([key, el]) => {
      if (!el) return
      const isActive = key === `${activePost?.id}-${activeMediaIndex}`
      if (isActive) el.play().catch(() => {})
      else el.pause()
    })
  }, [postIndex, activeMediaIndex, activePost?.id])

  const onOuterScroll = useCallback(() => {
    const el = outerRef.current
    if (!el) return
    const i = Math.round(el.scrollTop / el.clientHeight)
    if (i !== postIndex && posts[i]) setPostIndex(i)

    if (hasMore && !loadingMoreRef.current && posts.length - i <= 3) {
      loadingMoreRef.current = true
      Promise.resolve(onLoadMore?.()).finally(() => { loadingMoreRef.current = false })
    }
  }, [postIndex, posts, hasMore, onLoadMore])

  const scrollToPost = (i) => {
    if (i < 0 || i >= posts.length) return
    outerRef.current?.children[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToMediaWithin = (post, i) => {
    innerRefs.current[post.id]?.children[i]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }

  const onInnerScroll = (post) => () => {
    const track = innerRefs.current[post.id]
    if (!track) return
    const i = Math.round(track.scrollLeft / track.clientWidth)
    setMediaIndexByPost(prev => prev[post.id] === i ? prev : { ...prev, [post.id]: i })
  }

  const handleVideoEnded = (post, mediaIdx) => {
    if (!autoAdvance || post.id !== activePost?.id || mediaIdx !== activeMediaIndex) return
    const items = mediaFor(post)
    if (mediaIdx < items.length - 1) scrollToMediaWithin(post, mediaIdx + 1)
    else scrollToPost(postIndex + 1)
  }

  const toggleAutoAdvance = () => {
    setAutoAdvance(a => {
      const next = !a
      try { localStorage.setItem(AUTO_ADVANCE_KEY, next ? 'on' : 'off') } catch {}
      return next
    })
  }

  if (!activePost) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', touchAction: 'manipulation' }}>
      {shareTarget && <PostShareSheet post={shareTarget} onClose={() => setShareTarget(null)} />}

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0))' }}>
        <button onPointerDown={onClose} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <RiCloseLine size={20} />
        </button>
        {hasVideoInActivePost ? (
          <button onPointerDown={toggleAutoAdvance} style={{ padding: '6px 12px', borderRadius: 999, background: autoAdvance ? 'rgba(255,107,53,0.2)' : 'rgba(255,255,255,0.12)', border: `1px solid ${autoAdvance ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.18)'}`, color: autoAdvance ? '#FF6B35' : 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            Auto-scroll {autoAdvance ? 'On' : 'Off'}
          </button>
        ) : <div style={{ width: 38 }} />}
      </div>

      <div ref={outerRef} onScroll={onOuterScroll}
        style={{ height: '100%', overflowY: 'auto', scrollSnapType: 'y mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {posts.map((post, pIdx) => {
          const media = mediaFor(post)
          const mIdx = mediaIndexByPost[post.id] ?? 0
          const isActiveSlide = pIdx === postIndex

          return (
            <div key={post.id} style={{ height: '100%', scrollSnapAlign: 'start', position: 'relative', display: 'flex', flexDirection: 'column' }}>
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
                        autoPlay={isActiveSlide && mi === mIdx}
                        onEnded={() => handleVideoEnded(post, mi)}
                        onClick={(e) => { const v = e.currentTarget; v.paused ? v.play().catch(() => {}) : v.pause() }}
                        style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
                      />
                    ) : (
                      <img src={item.media_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} />
                    )}
                  </div>
                ))}
              </div>

              {media.length > 1 && (
                <div style={{ position: 'absolute', top: 60, right: 14, padding: '3px 9px', borderRadius: 999, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                  {mIdx + 1}/{media.length}
                </div>
              )}

              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px calc(14px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(0deg, rgba(0,0,0,0.85), rgba(0,0,0,0))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: post.content ? 8 : 12 }}>
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
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.5, margin: '0 0 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.content}</p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: -8 }}>
                  <button onPointerDown={() => onLike(post)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 999, color: post.is_liked_by_me ? '#EF4444' : 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500 }}>
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
    </div>
  )
}