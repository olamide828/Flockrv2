import { useState } from 'react'
import { Link, router } from '@inertiajs/react'
import {
  RiHeartLine, RiHeartFill, RiChat1Line, RiMoreLine, RiDeleteBinLine,
  RiVerifiedBadgeLine, RiRepeatLine, RiEyeLine, RiAlertLine, RiProhibitedLine,
} from 'react-icons/ri'
import Av from './Av'
import FollowButton from './FollowButton'
import PostVideoPlayer from './PostVideoPlayer'
import { timeAgo, fmtCount } from './helpers'

export default function PostCard({ post, auth, onDelete, onLike, onDismiss, onBlockAuthor, onReport, showToast, standalone = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const canDelete  = auth?.user?.id === post.user_id || auth?.user?.role === 'admin'
  const notMine    = auth?.user?.id !== post.user_id
  const isSeller   = post.user?.role === 'seller'

  const handleLikeClick = (e) => { e.stopPropagation(); e.preventDefault(); onLike(post) }
  const handleMenuClick = (e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(o => !o) }
  const handleDelClick  = (e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(false); onDelete(post) }

  const handleCopyLink = async (e) => {
    e.stopPropagation()
    e.preventDefault()
    const url = `${window.location.origin}/community/posts/${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      showToast?.('Link copied!')
    } catch {
      showToast?.('Could not copy link', 'error')
    }
  }

  const inner = (
    <div style={{ display:'flex', gap:12, padding: standalone ? '16px' : '14px 16px', borderBottom: standalone ? 'none' : '1px solid rgba(255,255,255,0.06)', cursor: standalone ? 'default' : 'pointer' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
        <Link href={`/@${post.user?.username}`} onClick={e => e.stopPropagation()} style={{ display:'block' }}>
          <Av user={post.user} size={40} />
        </Link>
        {standalone && <div style={{ width:2, flex:1, background:'rgba(255,255,255,0.07)', marginTop:8, borderRadius:1 }} />}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:3 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
              <Link href={`/@${post.user?.username}`} onClick={e => e.stopPropagation()} style={{ textDecoration:'none' }}>
                <span style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{post.user?.name}</span>
              </Link>
              {post.user?.is_verified && <RiVerifiedBadgeLine size={13} color="#FF6B35" />}
              {isSeller && (
                <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:999, background:'rgba(255,107,53,0.15)', color:'#FF6B35', border:'1px solid rgba(255,107,53,0.25)' }}>Seller</span>
              )}
              {notMine && (
                <span onClick={e => e.stopPropagation()}>
                  <FollowButton userId={post.user_id} isOwner={false} isFollowing={post.is_following_author} auth={auth} size="sm" />
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
          <div style={{ borderRadius:18, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)', marginBottom:10, background:'#000' }}
            onClick={e => e.stopPropagation()}>
            {post.media_type === 'video'
              ? <PostVideoPlayer src={post.media_url} poster={post.thumbnail_url} />
              : <img src={post.media_url} alt="" style={{ width:'100%', maxHeight:520, objectFit:'cover', display:'block' }} />
            }
          </div>
        )}

        {/* Action row — all icons grouped together, eye/views included */}
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

          <button onClick={handleCopyLink} title="Copy link"
            style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', padding:'8px', borderRadius:999, color:'rgba(255,255,255,0.45)', fontSize:13, fontWeight:500 }}>
            <RiRepeatLine size={20} />
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px', color:'rgba(255,255,255,0.45)', fontSize:13 }}>
            <RiEyeLine size={20} />
            {post.views_count > 0 && <span>{fmtCount(post.views_count)}</span>}
          </div>
        </div>
      </div>
    </div>
  )

  if (standalone) return <div>{inner}</div>

  return (
    <div onClick={() => router.visit(`/community/posts/${post.id}`)} style={{ background:'transparent' }}>
      {inner}
    </div>
  )
}