import { useState, useEffect, useRef } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'
import {
  RiArrowLeftLine, RiHeartLine, RiHeartFill, RiChat1Line,
  RiEyeLine, RiSendPlaneFill, RiVerifiedBadgeLine, RiRepeatLine,
} from 'react-icons/ri'

function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60) return `${Math.floor(s)}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(d).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}
function fmtCount(n) {
  const num = Number(n ?? 0)
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace('.0', '') + 'K'
  return String(num)
}
function Av({ user, size = 40 }) {
  const [err, setErr] = useState(false)
  const src = (!err && user?.avatar_url) ? user.avatar_url
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'U')}&background=1a1a1a&color=fff`
  return <img src={src} alt="" onError={() => setErr(true)}
    style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
}

function CommentRow({ comment, auth, onReply }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <Av user={comment.user} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{comment.user?.name}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>@{comment.user?.username} · {timeAgo(comment.created_at)}</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.5, margin: '4px 0 6px', whiteSpace: 'pre-wrap' }}>{comment.body}</p>
        <button onClick={() => onReply(comment)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Reply</button>

        {comment.replies?.length > 0 && (
          <div style={{ marginTop: 10, paddingLeft: 14, borderLeft: '2px solid rgba(255,255,255,0.06)' }}>
            {comment.replies.map(r => (
              <div key={r.id} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <Av user={r.user} size={28} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{r.user?.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{timeAgo(r.created_at)}</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: '2px 0 0' }}>{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CommunityPost({ post: initPost, comments: initComments }) {
  const { auth } = usePage().props
  const [post, setPost] = useState(initPost)
  const [comments, setComments] = useState(initComments)
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [sending, setSending] = useState(false)
  const inputRef = useRef(null)
  const viewedRef = useRef(false)

  useEffect(() => {
    if (viewedRef.current) return
    viewedRef.current = true
    axios.post(`/api/community/posts/${post.id}/view`)
      .then(({ data }) => setPost(p => ({ ...p, views_count: data.views_count })))
      .catch(() => {})
  }, [post.id])

  const handleLike = async () => {
    if (!auth?.user) { router.visit('/login'); return }
    const was = post.is_liked_by_me
    setPost(p => ({ ...p, is_liked_by_me: !was, likes_count: was ? Math.max(0, p.likes_count - 1) : p.likes_count + 1 }))
    try {
      const { data } = await axios.post(`/api/community/posts/${post.id}/like`)
      setPost(p => ({ ...p, is_liked_by_me: data.liked, likes_count: data.likes_count }))
    } catch { setPost(p => ({ ...p, is_liked_by_me: was })) }
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!body.trim() || sending) return
    if (!auth?.user) { router.visit('/login'); return }
    setSending(true)
    try {
      const { data } = await axios.post(`/api/community/posts/${post.id}/comments`, {
        body: body.trim(),
        parent_id: replyTo?.id ?? null,
      })
      if (replyTo) {
        setComments(prev => prev.map(c => c.id === replyTo.id ? { ...c, replies: [...(c.replies ?? []), data] } : c))
      } else {
        setComments(prev => [data, ...prev])
      }
      setPost(p => ({ ...p, comments_count: p.comments_count + 1 }))
      setBody(''); setReplyTo(null)
    } catch {} finally { setSending(false) }
  }

  const back = () => {
    window.history.back()
  }

  return (
    <>
      <Head title={`${post.user?.name}'s post`} />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Link href={`/@${post.user?.username}`}><Av user={post.user} size={44} /></Link>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{post.user?.name}</span>
                  {post.user?.is_verified && <RiVerifiedBadgeLine size={14} color="#FF6B35" />}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>@{post.user?.username}</span>
              </div>
            </div>

            {post.content && <p style={{ fontSize: 18, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '0 0 14px' }}>{post.content}</p>}

            {post.media_url && (
              <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14, background: '#000' }}>
                {post.media_type === 'video'
                  ? <video src={post.media_url} controls style={{ width: '100%', maxHeight: 480, display: 'block' }} />
                  : <img src={post.media_url} alt="" style={{ width: '100%', maxHeight: 560, objectFit: 'cover', display: 'block' }} />}
              </div>
            )}

            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '0 0 14px' }}>{timeAgo(post.created_at)}</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={handleLike} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: post.is_liked_by_me ? '#EF4444' : 'rgba(255,255,255,0.5)' }}>
                {post.is_liked_by_me ? <RiHeartFill size={20} /> : <RiHeartLine size={20} />}
                <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtCount(post.likes_count)}</span>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)' }}>
                <RiChat1Line size={20} /><span style={{ fontSize: 13, fontWeight: 600 }}>{fmtCount(post.comments_count)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)' }}>
                <RiEyeLine size={20} /><span style={{ fontSize: 13, fontWeight: 600 }}>{fmtCount(post.views_count)}</span>
              </div>
              <button onClick={() => navigator.clipboard?.writeText(window.location.href)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
                <RiRepeatLine size={20} />
              </button>
            </div>
          </div>

          {/* Comment composer */}
          {auth?.user && (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {replyTo && (
                <div style={{ marginBottom: 8, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  Replying to <span style={{ color: '#FF6B35' }}>@{replyTo.user?.username}</span>
                  <button onClick={() => setReplyTo(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>✕</button>
                </div>
              )}
              <form onSubmit={submitComment} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Av user={auth.user} size={36} />
                <input ref={inputRef} value={body} onChange={e => setBody(e.target.value)} placeholder="Post your reply"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '10px 16px', color: '#fff', fontSize: 14, outline: 'none' }} />
                <button type="submit" disabled={!body.trim() || sending} style={{ width: 40, height: 40, borderRadius: '50%', background: body.trim() ? '#FF6B35' : 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <RiSendPlaneFill size={16} color={body.trim() ? '#fff' : 'rgba(255,255,255,0.25)'} />
                </button>
              </form>
            </div>
          )}

          {/* Comments */}
          {comments.map(c => <CommentRow key={c.id} comment={c} auth={auth} onReply={(cm) => { setReplyTo(cm); inputRef.current?.focus() }} />)}
          {comments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No replies yet — be the first.</div>
          )}
        </div>
      </div>
    </>
  )
}

CommunityPost.layout = page => <AppLayout>{page}</AppLayout>