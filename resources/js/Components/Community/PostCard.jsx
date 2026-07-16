import { useState, useRef, useEffect } from 'react'
import { Link, router } from '@inertiajs/react'
import axios from 'axios'
import {
  RiHeartLine, RiHeartFill, RiChat1Line, RiMoreLine, RiDeleteBinLine,
  RiVerifiedBadgeLine, RiShareForwardLine, RiEyeLine, RiAlertLine, RiProhibitedLine,
} from 'react-icons/ri'
import Av from './Av'
import FollowButton from './FollowButton'
import PostVideoPlayer from './PostVideoPlayer'
import PostShareSheet from './PostShareSheet'
import PostViewersSheet from './PostViewersSheet'
import { timeAgo, fmtCount } from './helpers'

export default function PostCard({
  post, auth, onDelete, onLike, onDismiss, onBlockAuthor, onReport, showToast,
  isFollowingAuthor, onFollowChange, onViewed, standalone = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showViewers, setShowViewers] = useState(false)
  const canDelete  = auth?.user?.id === post.user_id || auth?.user?.role === 'admin'
  const notMine    = auth?.user?.id !== post.user_id
  const isOwnPost  = auth?.user?.id === post.user_id
  const isSeller   = post.user?.role === 'seller'

  const cardRef = useRef(null)
  const viewedRef = useRef(false)

  // ── Record a view once this card has been visible for ~1s while scrolling,
  // same as X/Instagram — no click-through required. ──────────────────────
  useEffect(() => {
    if (standalone || viewedRef.current || !cardRef.current) return
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
  }, [post.id, standalone, onViewed])

  const handleLikeClick = (e) => { e.stopPropagation(); e.preventDefault(); onLike(post) }
  const handleMenuClick = (e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(o => !o) }
  const handleDelClick  = (e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(false); onDelete(post) }
  const handleShareClick = (e) => { e.stopPropagation(); e.preventDefault(); setShowShare(true) }

  const openViewers = (e) => {
    if (!isOwnPost) return
    e.stopPropagation()
    e.preventDefault()
    setShowViewers(true)
  }

  const inner = (
    <>
    {showShare && <PostShareSheet post={post} onClose={() => setShowShare(false)} />}
    {showViewers && <PostViewersSheet postId={post.id} onClose={() => setShowViewers(false)} />}
    <div ref={cardRef} style={{ display:'flex', gap:12, padding: standalone ? '16px' : '14px 16px', borderBottom: standalone ? 'none' : '1px solid rgba(255,255,255,0.06)', cursor: standalone ? 'default' : 'pointer' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
        <Link href={`/@${post.user?.username}`} onClick={e => e.stopPropagation()} style={{ display:'block' }}>
          <Av user={post.user} size={40} />
        </Link>
        {standalone && <div style={{ width:2, flex:1, background:'rgba(255,255,255,0.07)', marginTop:8, borderRadius:1 }} />}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:3 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              <Link href={`/@${post.user?.username}`} onClick={e => e.stopPropagation()} style={{ textDecoration:'none' }}>
                <span style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{post.user?.name}</span>
              </Link>
              {post.user?.is_verified && <RiVerifiedBadgeLine size={13} color="#FF6B35" />}
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
            <div style={{ position:'relative' }}>
              <button onClick={handleMenuClick} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', padding:4, borderRadius:'50%', display:'flex' }}>
                <RiMoreLine size={18} />
              </button>
              {menuOpen && (
                <>
                  <div onClick={e => { e.stopPropagation(); setMenuOpen(false) }} style={{ position:'fixed', inset:0, zIndex:98 }} />
                  <div style={{ position:'absolute', top:28, right:0, zIndex:99, background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, overflow:'hidden', minWidth:170, boxShadow:'0 8px 32px rgba(0,0,0,0.7)' }}>
                    {canDelete && (
                      <button onClick={handleDelClick} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'#EF4444', fontSize:13, fontWeight:600 }}>
                        <RiDeleteBinLine size={16} /> Delete post
                      </button>
                    )}
                    {!canDelete && notMine && (
                      <>
                        <button onClick={e => { e.stopPropagation(); e.preventDefault(); setMenuOpen(false); onDismiss(post) }}
                          style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:600, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                          <RiEyeLine size={16} color="rgba(255,255,255,0.5)" /> Not interested
                        </button>
                        <button onClick={e => { e.stopPropagation(); e.preventDefault(); setMenuOpen(false); onBlockAuthor(post) }}
                          style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'#EF4444', fontSize:13, fontWeight:600, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                          <RiProhibitedLine size={16} /> Block @{post.user?.username}
                        </button>
                        <button onClick={e => { e.stopPropagation(); e.preventDefault(); setMenuOpen(false); onReport(post) }}
                          style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:600 }}>
                          <RiAlertLine size={16} color="rgba(255,255,255,0.5)" /> Report post
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {post.content && (
          <p style={{ color:'rgba(255,255,255,0.92)', fontSize:15, lineHeight:1.55, margin:'6px 0 10px', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{post.content}</p>
        )}

        {post.media_url && (
          <div style={{ borderRadius:18, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)', marginBottom:10, background:'#000' }}>
            {post.media_type === 'video'
              // Video needs its own click for play/pause, so it must swallow
              // the click rather than letting it navigate.
              ? <div onClick={e => e.stopPropagation()}><PostVideoPlayer src={post.media_url} poster={post.thumbnail_url} /></div>
              // Images have no interaction of their own — let the click
              // bubble up and navigate to the post, same as tapping anywhere
              // else on the card. (Previously this was wrapped in a
              // stopPropagation div, which silently ate every image click.)
              : <img src={post.media_url} alt="" style={{ width:'100%', maxHeight:520, objectFit:'cover', display:'block' }} />
            }
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
            style={{ position:'relative', display:'flex', alignItems:'center', gap:6, background:'none', border:'none', padding:'8px', borderRadius:999, color:'rgba(255,255,255,0.45)', fontSize:13, cursor: isOwnPost ? 'pointer' : 'default' }}
            title={isOwnPost && post.views_count > 0 ? 'Click to see who viewed this' : undefined}
          >
            <RiEyeLine size={20} />
            {post.views_count > 0 && <span>{fmtCount(post.views_count)}</span>}
            {isOwnPost && post.views_count > 0 && (
              <span style={{ position:'absolute', top:4, right:2, width:7, height:7, borderRadius:'50%', background:'#FF6B35', boxShadow:'0 0 0 rgba(255,107,53,0.6)', animation:'viewHintPulse 2s infinite' }} />
            )}
          </button>
        </div>

        <style>{`@keyframes viewHintPulse { 0% { box-shadow: 0 0 0 0 rgba(255,107,53,0.55); } 70% { box-shadow: 0 0 0 6px rgba(255,107,53,0); } 100% { box-shadow: 0 0 0 0 rgba(255,107,53,0); } }`}</style>
      </div>
    </div>
    </>
  )

  if (standalone) return <div>{inner}</div>

  return (
    <div onClick={() => router.visit(`/community/posts/${post.id}`)} style={{ background:'transparent' }}>
      {inner}
    </div>
  )
}