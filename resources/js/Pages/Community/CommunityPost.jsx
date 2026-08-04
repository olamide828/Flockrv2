import { useState, useEffect, useRef, useCallback } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'
import { useToast } from '@/Components/Toast'
import {
  RiArrowLeftLine, RiHeartLine, RiHeartFill, RiChat1Line,
  RiEyeLine, RiSendPlaneFill, RiVerifiedBadgeLine, RiShareForwardLine,
  RiMoreLine, RiCloseLine, RiInformationLine, RiFullscreenLine,
} from 'react-icons/ri'
import Av from '@/Components/Community/Av'
import FollowButton from '@/Components/Community/FollowButton'
import PostVideoPlayer from '@/Components/Community/PostVideoPlayer'
import PostMediaCarousel from '@/Components/Community/PostMediaCarousel'
import PostShareSheet from '@/Components/Community/PostShareSheet'
import PostViewersSheet from '@/Components/Community/PostViewersSheet'
import PostReportModal from '@/Components/Community/PostReportModal'
import { timeAgo, fmtCount } from '@/Components/Community/Helpers'
import VerifiedBadge from '@/Components/VerifiedBadge';
import MediaLightbox from '../../Components/Community/MediaLightBox';


// ── Comment like button ──────────────────────────────────────────────────────
function LikeBtn({ commentId, initialCount = 0, initialLiked = false, size = 13 }) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    if (busy) return
    const was = liked
    setLiked(!was)
    setCount(c => was ? Math.max(0, c - 1) : c + 1)
    setBusy(true)
    try {
      const { data } = await axios.post(`/api/community/comments/${commentId}/like`)
      setLiked(data.liked)
      setCount(data.likes_count)
    } catch {
      setLiked(was)
      setCount(c => was ? c + 1 : Math.max(0, c - 1))
    } finally { setBusy(false) }
  }

  return (
    <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: liked ? '#EF4444' : 'rgba(255,255,255,0.35)', fontSize: size - 1, fontWeight: 600 }}>
      {liked ? <RiHeartFill size={size} /> : <RiHeartLine size={size} />}
      {count > 0 && count}
    </button>
  )
}

// ── Flat reply row ────────────────────────────────────────────────────────────
function ReplyItem({ reply, postOwnerId, currentUserId, onReply, onDelete }) {
  const isCreator = reply.user?.id === postOwnerId
  const canDel = currentUserId && reply.user?.id === currentUserId

  return (
    <div style={{ display: 'flex', gap: 8, opacity: reply._opt ? 0.55 : 1 }}>
      <Link href={`/@${reply.user?.username}`} style={{ flexShrink: 0 }}>
        <Av user={reply.user} size={28} />
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Link href={`/@${reply.user?.username}`} style={{ textDecoration: 'none' }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{reply.user?.name}</span>
          </Link>
          {isCreator && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(255,107,53,0.18)', border: '1px solid rgba(255,107,53,0.35)', color: '#FF6B35' }}>Creator</span>}
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{timeAgo(reply.created_at)}</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, margin: '4px 0 6px', lineHeight: 1.45, wordBreak: 'break-word' }}>
          {reply.reply_to_username && <span style={{ color: '#FF6B35', fontWeight: 600, marginRight: 4 }}>@{reply.reply_to_username}</span>}
          {reply.body}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LikeBtn commentId={reply.id} initialCount={reply.likes_count ?? 0} initialLiked={reply.is_liked_by_me ?? false} size={12} />
          <button onClick={() => onReply(reply)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600 }}>Reply</button>
          {canDel && (
            <button onClick={() => onDelete(reply, true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: 600 }}>Delete</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Top-level comment ─────────────────────────────────────────────────────────
function CommentItem({ comment, postOwnerId, currentUserId, onReply, onDelete, onPin }) {
  const [showReplies, setShowReplies] = useState(false)
  const isCreator = comment.user?.id === postOwnerId
  const canDel = currentUserId && comment.user?.id === currentUserId
  const isPostOwner = currentUserId === postOwnerId
  const replies = comment.replies ?? []

  const handleReplyToReply = (reply) => {
    setShowReplies(true)
    onReply({ rootId: comment.id, tagUsername: reply.user?.username })
  }

  return (
    <div style={{ display: 'flex', gap: 10, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: comment._opt ? 0.55 : 1 }}>
      <Link href={`/@${comment.user?.username}`} style={{ flexShrink: 0 }}>
        <Av user={comment.user} size={36} />
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Link href={`/@${comment.user?.username}`} style={{ textDecoration: 'none' }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{comment.user?.name}</span>
          </Link>
          {isCreator && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(255,107,53,0.18)', border: '1px solid rgba(255,107,53,0.35)', color: '#FF6B35' }}>Creator</span>}
          {comment.is_pinned && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>📌 Pinned</span>}
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{timeAgo(comment.created_at)}</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14, margin: '5px 0 8px', lineHeight: 1.45, wordBreak: 'break-word' }}>{comment.body}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <LikeBtn commentId={comment.id} initialCount={comment.likes_count ?? 0} initialLiked={comment.is_liked_by_me ?? false} size={13} />
          <button onClick={() => onReply({ rootId: comment.id, tagUsername: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 600 }}>Reply</button>
          {isPostOwner && (
            <button onClick={() => onPin(comment)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: comment.is_pinned ? '#FF6B35' : 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 600 }}>
              {comment.is_pinned ? 'Unpin' : 'Pin'}
            </button>
          )}
          {canDel && (
            <button onClick={() => onDelete(comment, false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 600 }}>Delete</button>
          )}
        </div>

        {replies.length > 0 && (
          <button onClick={() => setShowReplies(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#FF6B35', fontSize: 12, fontWeight: 700 }}>
            <div style={{ width: 22, height: 1.5, background: 'rgba(255,107,53,0.45)', borderRadius: 1 }} />
            {showReplies ? 'Hide replies' : `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
          </button>
        )}

        {showReplies && replies.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {replies.map(reply => (
              <ReplyItem key={reply.id} reply={reply} postOwnerId={postOwnerId} currentUserId={currentUserId}
                onReply={handleReplyToReply} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function CommunityPost({ post: initPost, comments: initComments }) {
  const { auth } = usePage().props
  const { showToast, ToastComponent } = useToast()

  const [post, setPost] = useState(initPost)
  const [comments, setComments] = useState(initComments)
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState(null) // { rootId, tagUsername }
  const [sending, setSending] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showViewers, setShowViewers] = useState(false)
  const [showInfoTip, setShowInfoTip] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef(null)
  const viewedRef = useRef(false)

  const isFollowingAuthor = post.is_following_author ?? false
  const isOwnPost = auth?.user?.id === post.user_id

  useEffect(() => {
    if (viewedRef.current) return
    viewedRef.current = true
    axios.post(`/api/community/posts/${post.id}/view`)
      .then(({ data }) => setPost(p => ({ ...p, views_count: data.views_count })))
      .catch(() => {})
  }, [post.id])

  useEffect(() => { if (replyTo) setTimeout(() => inputRef.current?.focus(), 80) }, [replyTo])

  const handleFollowChange = (userId, following) => {
    setPost(p => ({ ...p, is_following_author: following }))
  }

  const handleLike = async () => {
    if (!auth?.user) { router.visit('/login'); return }
    const was = post.is_liked_by_me
    setPost(p => ({ ...p, is_liked_by_me: !was, likes_count: was ? Math.max(0, p.likes_count - 1) : p.likes_count + 1 }))
    try {
      const { data } = await axios.post(`/api/community/posts/${post.id}/like`)
      setPost(p => ({ ...p, is_liked_by_me: data.liked, likes_count: data.likes_count }))
    } catch { setPost(p => ({ ...p, is_liked_by_me: was })) }
  }

  const handlePin = useCallback(async (comment) => {
    try {
      const { data } = await axios.post(`/api/community/comments/${comment.id}/pin`)
      setComments(prev => prev.map(c => ({
        ...c,
        is_pinned: c.id === comment.id ? data.is_pinned : false, // only one pin at a time, mirrors backend
      })))
    } catch { showToast('Failed to pin comment', 'error') }
  }, [showToast])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!auth?.user) { router.visit('/login'); return }
    if (!body.trim() || sending) return
    setSending(true)

    const text = body.trim()
    const parentId = replyTo?.rootId ?? null
    const tagUser = replyTo?.tagUsername ?? null

    const optimistic = {
      id: `opt-${Date.now()}`, body: text, user: auth.user,
      created_at: new Date().toISOString(), likes_count: 0, replies: [],
      reply_to_username: tagUser, is_pinned: false, _opt: true,
    }

    if (parentId) {
      setComments(prev => prev.map(c => c.id === parentId ? { ...c, replies: [...(c.replies ?? []), optimistic] } : c))
    } else {
      setComments(prev => [optimistic, ...prev])
      setPost(p => ({ ...p, comments_count: p.comments_count + 1 }))
    }
    setBody(''); setReplyTo(null)

    try {
      const { data } = await axios.post(`/api/community/posts/${post.id}/comments`, {
        body: text, parent_id: parentId, reply_to_username: tagUser ?? undefined,
      })
      if (parentId) {
        setComments(prev => prev.map(c => c.id === parentId
          ? { ...c, replies: (c.replies ?? []).map(r => r.id === optimistic.id ? { ...data, reply_to_username: tagUser } : r) }
          : c))
      } else {
        setComments(prev => prev.map(c => c.id === optimistic.id ? data : c))
      }
    } catch {
      if (parentId) {
        setComments(prev => prev.map(c => c.id === parentId ? { ...c, replies: (c.replies ?? []).filter(r => r.id !== optimistic.id) } : c))
      } else {
        setComments(prev => prev.filter(c => c.id !== optimistic.id))
        setPost(p => ({ ...p, comments_count: Math.max(0, p.comments_count - 1) }))
      }
      setBody(text)
      showToast('Failed to post comment', 'error')
    } finally { setSending(false) }
  }

  const handleDelete = useCallback(async (comment, isReply) => {
    if (isReply) {
      setComments(prev => prev.map(c => ({ ...c, replies: (c.replies ?? []).filter(r => r.id !== comment.id) })))
    } else {
      setComments(prev => prev.filter(c => c.id !== comment.id))
    }
    setPost(p => ({ ...p, comments_count: Math.max(0, p.comments_count - 1) }))
    try { await axios.delete(`/api/community/comments/${comment.id}`) }
    catch {
      const r = await axios.get(`/api/community/posts/${post.id}/comments`).catch(() => null)
      if (r) setComments(r.data)
    }
  }, [post.id])

  const replyingToComment = replyTo ? comments.find(c => c.id === replyTo.rootId) : null

  const back = () => {
    window.history.back()
  }

  return (
    <>
      <Head title={`${post.user?.name}'s post`} />
      {ToastComponent}
      {showShare && <PostShareSheet post={post} onClose={() => setShowShare(false)} />}
      {showViewers && <PostViewersSheet postId={post.id} onClose={() => setShowViewers(false)} />}
      {showReportModal && (
        <PostReportModal
          post={post}
          onClose={() => setShowReportModal(false)}
          onSubmit={async (reason) => {
            await axios.post(`/api/users/${post.user_id}/report`, { reason, post_id: post.id })
            showToast('Report submitted')
          }}
        />
      )}

      <div style={{ minHeight: '100%', background: '#050505', color: '#fff', fontFamily: '"DM Sans", sans-serif' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: 'rgba(5,5,5,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={back} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
              <RiArrowLeftLine size={18} />
            </button>
            <span style={{ fontWeight: 800, fontSize: 18 }}>Post</span>
          </div>

          {/* Post */}
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link href={`/@${post.user?.username}`}><Av user={post.user} size={44} /></Link>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{post.user?.name}</span>
                    <VerifiedBadge type={post.user?.verification_type} size={14} />
                    {!isOwnPost && (
                      <FollowButton userId={post.user_id} isOwner={false} isFollowing={isFollowingAuthor} onChange={handleFollowChange} auth={auth} />
                    )}
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>@{post.user?.username}</span>
                </div>
              </div>
              {isOwnPost && (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setMenuOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}>
                    <RiMoreLine size={18} />
                  </button>
                  {menuOpen && (
                    <>
                      <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                      <div style={{ position: 'absolute', top: 28, right: 0, zIndex: 99, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, overflow: 'hidden', minWidth: 150, boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
                        <button onClick={async () => {
                          setMenuOpen(false)
                          try { await axios.delete(`/api/community/posts/${post.id}`); router.visit('/community') }
                          catch { showToast('Failed to delete post', 'error') }
                        }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 13, fontWeight: 600 }}>
                          Delete post
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {!isOwnPost && (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setMenuOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}>
                    <RiMoreLine size={18} />
                  </button>
                  {menuOpen && (
                    <>
                      <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                      <div style={{ position: 'absolute', top: 28, right: 0, zIndex: 99, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, overflow: 'hidden', minWidth: 170, boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
                        <button onClick={async () => {
                          setMenuOpen(false)
                          try { await axios.post(`/api/users/${post.user_id}/block`); showToast(`Blocked @${post.user?.username}`); router.visit('/community') }
                          catch { showToast('Failed to block', 'error') }
                        }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 13, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          Block @{post.user?.username}
                        </button>
                        <button onClick={() => { setMenuOpen(false); setShowReportModal(true) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                          Report post
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {post.content && <p style={{ fontSize: 18, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '0 0 14px' }}>{post.content}</p>}

   {(post.media?.length > 0 || post.media_url) && (
  <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14, background: '#000', height: 560 }}>
    {(() => {
      const media = post.media?.length ? post.media : [{ media_url: post.media_url, media_type: post.media_type, thumbnail_url: post.thumbnail_url }]
      if (media.length === 1) {
        return media[0].media_type === 'video'
          ? <PostVideoPlayer src={media[0].media_url} poster={media[0].thumbnail_url} onReport={() => setShowReportModal(true)} onExpand={() => setLightboxIndex(0)} />
          : (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={media[0].media_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} />
              <button onPointerDown={(e) => { e.stopPropagation(); setLightboxIndex(0) }} style={{ position: 'absolute', top: 10, left: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <RiFullscreenLine size={15} />
              </button>
            </div>
          )
      }
      return <PostMediaCarousel media={media} onReport={() => setShowReportModal(true)} height={560} onExpand={setLightboxIndex} />
    })()}
  </div>
)}

{lightboxIndex !== null && (
  <MediaLightbox
    posts={[post]}
    startPostIndex={0}
    startMediaIndex={lightboxIndex}
    onClose={() => setLightboxIndex(null)}
    auth={auth}
    onLike={handleLike}
    followingMap={{ [post.user_id]: isFollowingAuthor }}
    onFollowChange={handleFollowChange}
    onLoadMore={() => {}}
    hasMore={false}
  />
)}

            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '0 0 14px' }}>{timeAgo(post.created_at)}</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', marginLeft: -10 }}>
              <button onClick={handleLike} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: 999, color: post.is_liked_by_me ? '#EF4444' : 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500 }}>
                {post.is_liked_by_me ? <RiHeartFill size={19} /> : <RiHeartLine size={19} />}
                <span>{fmtCount(post.likes_count)}</span>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px', color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500 }}>
                <RiChat1Line size={19} /><span>{fmtCount(post.comments_count)}</span>
              </div>
              <button onClick={() => setShowShare(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: 999, color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500 }}>
                <RiShareForwardLine size={18} />
              </button>
              <button
                onClick={isOwnPost ? () => setShowViewers(true) : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: '8px', borderRadius: 999, color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500, cursor: isOwnPost ? 'pointer' : 'default' }}
              >
                <RiEyeLine size={19} /><span>{fmtCount(post.views_count)}</span>
              </button>
              {isOwnPost && (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowInfoTip(t => !t)}
                    style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
                    <RiInformationLine size={15} />
                  </button>
                  {showInfoTip && (
                    <>
                      <div onClick={() => setShowInfoTip(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                      <div style={{ position: 'absolute', bottom: '100%', right: 0, zIndex: 99, width: 220, maxWidth: 'calc(100vw - 48px)', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px', marginBottom: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: 11.5, lineHeight: 1.5 }}>
                          Click the eye icon to see who viewed this post. Only you can see this — other people just see the view count.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Comment composer */}
          {auth?.user && (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {replyTo && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '7px 11px', background: 'rgba(255,107,53,0.08)', borderRadius: 10, border: '1px solid rgba(255,107,53,0.2)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    Replying to <span style={{ color: '#FF6B35', fontWeight: 600 }}>@{replyTo.tagUsername ?? replyingToComment?.user?.username}</span>
                  </span>
                  <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', padding: 2 }}>
                    <RiCloseLine size={14} />
                  </button>
                </div>
              )}
              <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Av user={auth.user} size={36} />
                <input ref={inputRef} value={body} onChange={e => setBody(e.target.value)}
                  placeholder={replyTo ? `Reply to @${replyTo.tagUsername ?? replyingToComment?.user?.username}...` : 'Post your reply'}
                  maxLength={500}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '10px 16px', color: '#fff', fontSize: 14, outline: 'none' }} />
                <button type="submit" disabled={!body.trim() || sending} style={{ width: 40, height: 40, borderRadius: '50%', background: body.trim() ? '#FF6B35' : 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <RiSendPlaneFill size={16} color={body.trim() ? '#fff' : 'rgba(255,255,255,0.25)'} />
                </button>
              </form>
            </div>
          )}

          {/* Comments — flat-thread, matches your video CommentSheet exactly */}
          {comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} postOwnerId={post.user_id} currentUserId={auth?.user?.id}
              onReply={setReplyTo} onDelete={handleDelete} onPin={handlePin} />
          ))}
          {comments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No replies yet — be the first.</div>
          )}
        </div>
      </div>
    </>
  )
}

CommunityPost.layout = page => <AppLayout>{page}</AppLayout>