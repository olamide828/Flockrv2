import { useState, useRef, useEffect } from 'react'
import { Link, router } from '@inertiajs/react'
import axios from 'axios'
import {
  RiHeartLine, RiHeartFill, RiChat1Line, RiMoreLine, RiDeleteBinLine,
  RiShareForwardLine, RiEyeLine, RiAlertLine,
  RiProhibitedLine, RiInformationLine, RiFullscreenLine, RiCloseLine,
} from 'react-icons/ri'
import Av from './Av'
import FollowButton from './FollowButton'
import PostVideoPlayer from './PostVideoPlayer'
import PostMediaCarousel from './PostMediaCarousel'
import PostShareSheet from './PostShareSheet'
import PostViewersSheet from './PostViewersSheet'
import { timeAgo, fmtCount } from './Helpers'
import VerifiedBadge from '@/Components/VerifiedBadge'
import { useLikeAnimation, LikeAnimationOverlay } from '@/Components/LikeAnimation'

function PostMoreSheet({ onClose, canDelete, onDelete, notMine, onBlock, onReport, username }) {
  return (
    <>
      <div onClick={(e) => { e.stopPropagation(); onClose() }} style={{ position: 'fixed', inset: 0, zIndex: 198, background: 'rgba(0,0,0,0.55)' }} />
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 199, background: 'rgba(18,18,18,0.98)', backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 14px' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Post Options</span>
          <button onClick={(e) => { e.stopPropagation(); onClose() }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RiCloseLine size={18} />
          </button>
        </div>

        {canDelete ? (
          <button onClick={onDelete} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 14, fontWeight: 700 }}>
            <RiDeleteBinLine size={18} /> Delete post
          </button>
        ) : notMine && (
          <>
            <button onClick={onBlock} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 14, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <RiProhibitedLine size={18} /> Block @{username}
            </button>
            <button onClick={onReport} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 600 }}>
              <RiAlertLine size={18} color="rgba(255,255,255,0.5)" /> Report post
            </button>
          </>
        )}
      </div>
    </>
  )
}

export default function PostCard({
  post, auth, onDelete, onLike, onBlockAuthor, onReport, showToast,
  isFollowingAuthor, onFollowChange, onViewed, onOpenLightbox,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showViewers, setShowViewers] = useState(false)
  const [showInfoTip, setShowInfoTip] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const canDelete  = auth?.user?.id === post.user_id || auth?.user?.role === 'admin'
  const notMine    = auth?.user?.id !== post.user_id
  const isOwnPost  = auth?.user?.id === post.user_id
  const isSeller   = post.user?.role === 'seller'

  const cardRef = useRef(null)
  const viewedRef = useRef(false)
  const lastMediaTapRef = useRef(0)
  const { burst, trigger: triggerLikeAnim } = useLikeAnimation()

  useEffect(() => {
    if (viewedRef.current || !cardRef.current) return
    let dwellTimer = null
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        dwellTimer = setTimeout(() => {
          if (viewedRef.current) return
          viewedRef.current = true
          axios.post(`/api/community/posts/${post.id}/view`)
            .then(({ data }) => onViewed?.(post.id, data.views_count))
            .catch(() => {})
        }, 1000)
      } else if (dwellTimer) {
        clearTimeout(dwellTimer)
      }
    }, { threshold: 0.5 })
    obs.observe(cardRef.current)
    return () => { if (dwellTimer) clearTimeout(dwellTimer); obs.disconnect() }
  }, [post.id, onViewed])

  const handleLikeClick = (e) => { e.stopPropagation(); e.preventDefault(); onLike(post) }
  const handleMenuClick = (e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(true) }
  const handleDelClick  = () => { setMenuOpen(false); onDelete(post) }
  const handleShareClick = (e) => { e.stopPropagation(); e.preventDefault(); setShowShare(true) }

  const openViewers = (e) => {
    if (!isOwnPost) return
    e.stopPropagation()
    e.preventDefault()
    setShowViewers(true)
  }

  const handleMediaTap = (e) => {
    e.stopPropagation()
    const now = Date.now()
    if (now - lastMediaTapRef.current < 300) {
      if (!post.is_liked_by_me) onLike(post)
      triggerLikeAnim(e.clientX, e.clientY)
    }
    lastMediaTapRef.current = now
  }

  const media = post.media?.length ? post.media : (post.media_url ? [{ media_url: post.media_url, media_type: post.media_type }] : [])

  return (
    <div ref={cardRef} onClick={() => router.visit(`/community/posts/${post.id}`)}
      style={{ display:'flex', gap:12, padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', cursor:'pointer' }}>
      {showShare && <PostShareSheet post={post} onClose={() => setShowShare(false)} />}
      {showViewers && <PostViewersSheet postId={post.id} onClose={() => setShowViewers(false)} />}
      {menuOpen && (
        <PostMoreSheet
          onClose={() => setMenuOpen(false)}
          canDelete={canDelete}
          onDelete={handleDelClick}
          notMine={notMine}
          username={post.user?.username}
          onBlock={() => { setMenuOpen(false); onBlockAuthor(post) }}
          onReport={() => { setMenuOpen(false); onReport(post) }}
        />
      )}
      <LikeAnimationOverlay burst={burst} />

      <Link href={`/@${post.user?.username}`} onClick={e => e.stopPropagation()} style={{ display:'block', flexShrink:0 }}>
        <Av user={post.user} size={40} />
      </Link>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:3 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
              <Link href={`/@${post.user?.username}`} onClick={e => e.stopPropagation()} style={{ textDecoration:'none' }}>
                <span style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{post.user?.name}</span>
              </Link>
              <VerifiedBadge type={post.user?.verification_type} size={13} />
              {isSeller && (
                <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:999, background:'rgba(255,107,53,0.15)', color:'#FF6B35', border:'1px solid rgba(255,107,53,0.25)' }}>Seller</span>
              )}
              {notMine && (
                <span onClick={e => e.stopPropagation()}>
                  <FollowButton userId={post.user_id} isOwner={false} isFollowing={isFollowingAuthor} onChange={onFollowChange} auth={auth} />
                </span>
              )}
            </div>
            <span style={{ color:'rgba(255,255,255,0.35)', fontSize:12 }}>@{post.user?.username} · {timeAgo(post.created_at)}</span>
          </div>

          {(canDelete || notMine) && (
            <button onClick={handleMenuClick} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', padding:4, borderRadius:'50%', display:'flex' }}>
              <RiMoreLine size={18} />
            </button>
          )}
        </div>

        {post.content && (
          <div style={{ margin:'6px 0 10px' }}>
            <p style={{
              color:'rgba(255,255,255,0.92)', fontSize:15, lineHeight:1.55, margin:0, whiteSpace:'pre-wrap', wordBreak:'break-word',
              ...(expanded ? {} : { display:'-webkit-box', WebkitLineClamp:6, WebkitBoxOrient:'vertical', overflow:'hidden' }),
            }}>{post.content}</p>
            {post.content.length > 300 && (
              <button onClick={e => { e.stopPropagation(); e.preventDefault(); setExpanded(x => !x) }}
                style={{ background:'none', border:'none', color:'#FF6B35', fontSize:13, fontWeight:700, cursor:'pointer', padding:'4px 0 0', display:'block' }}>
                {expanded ? 'Show less' : 'See more'}
              </button>
            )}
          </div>
        )}

        {media.length > 0 && (
          <div onClick={handleMediaTap}
            style={{ position:'relative', borderRadius:18, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)', marginBottom:10, background:'#000', height:460 }}>
            {media.length === 1 ? (
              media[0].media_type === 'video'
                ? <PostVideoPlayer src={media[0].media_url} poster={media[0].thumbnail_url} onExpand={onOpenLightbox ? () => onOpenLightbox(0) : undefined} />
                : (
                  <div style={{ position:'relative', width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <img src={media[0].media_url} alt="" style={{ maxWidth:'100%', maxHeight:'100%', width:'auto', height:'auto', objectFit:'contain', display:'block' }} />
                    {onOpenLightbox && (
                      <button onPointerDown={(e) => { e.stopPropagation(); onOpenLightbox(0) }} style={{ position:'absolute', top:10, left:10, width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
                        <RiFullscreenLine size={15} />
                      </button>
                    )}
                  </div>
                )
            ) : (
              <PostMediaCarousel media={media} height={460} onExpand={onOpenLightbox} />
            )}
          </div>
        )}

        <div style={{ display:'flex', alignItems:'center', gap:2, marginTop:4, marginLeft:-8 }}>
          <button onClick={handleLikeClick} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', padding:'8px', borderRadius:999, color: post.is_liked_by_me ? '#EF4444' : 'rgba(255,255,255,0.45)', fontSize:13, fontWeight:500 }}>
            {post.is_liked_by_me ? <RiHeartFill size={20} /> : <RiHeartLine size={20} />}
            {post.likes_count > 0 && <span>{fmtCount(post.likes_count)}</span>}
          </button>

          <Link href={`/community/posts/${post.id}`} onClick={e => e.stopPropagation()}
            style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', padding:'8px', borderRadius:999, color:'rgba(255,255,255,0.45)', fontSize:13, fontWeight:500, textDecoration:'none' }}>
            <RiChat1Line size={20} />
            {post.comments_count > 0 && <span>{fmtCount(post.comments_count)}</span>}
          </Link>

          <button onClick={handleShareClick} title="Share"
            style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', padding:'8px', borderRadius:999, color:'rgba(255,255,255,0.45)', fontSize:13, fontWeight:500 }}>
            <RiShareForwardLine size={19} />
          </button>

          <button
            onClick={openViewers}
            style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', padding:'8px', borderRadius:999, color:'rgba(255,255,255,0.45)', fontSize:13, fontWeight:500, cursor: isOwnPost ? 'pointer' : 'default' }}
          >
            <RiEyeLine size={20} />
            {post.views_count > 0 && <span>{fmtCount(post.views_count)}</span>}
          </button>

          {isOwnPost && (
            <div style={{ position:'relative' }}>
              <button onClick={e => { e.stopPropagation(); e.preventDefault(); setShowInfoTip(t => !t) }}
                style={{ display:'flex', alignItems:'center', background:'none', border:'none', padding:'8px 4px', cursor:'pointer', color:'rgba(255,255,255,0.3)' }}>
                <RiInformationLine size={15} />
              </button>
              {showInfoTip && (
                <>
                  <div onClick={e => { e.stopPropagation(); setShowInfoTip(false) }} style={{ position:'fixed', inset:0, zIndex:98 }} />
                  <div style={{ position:'absolute', bottom:'100%', right:0, zIndex:99, width:220, maxWidth:'calc(100vw - 48px)', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, padding:'10px 12px', marginBottom:6, boxShadow:'0 8px 24px rgba(0,0,0,0.6)' }}>
                    <p style={{ margin:0, color:'rgba(255,255,255,0.75)', fontSize:11.5, lineHeight:1.5 }}>
                      Click the eye icon to see who viewed this post. Only you can see this — other people just see the view count.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}