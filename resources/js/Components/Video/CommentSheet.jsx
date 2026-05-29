import { useState, useEffect, useRef } from 'react'
import { Link, usePage, router } from '@inertiajs/react'
import axios from 'axios'

export default function CommentSheet({ videoId, onClose }) {
  const { auth } = usePage().props
  const [comments, setComments]   = useState([])
  const [loading,  setLoading]    = useState(true)
  const [body,     setBody]       = useState('')
  const [posting,  setPosting]    = useState(false)
  const [replyTo,  setReplyTo]    = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    axios.get(`/api/videos/${videoId}/comments`)
      .then(r => setComments(r.data.data))
      .finally(() => setLoading(false))
  }, [videoId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!auth?.user) { router.visit('/login'); return }
    if (!body.trim()) return
    setPosting(true)
    try {
      const { data } = await axios.post(`/api/videos/${videoId}/comments`, {
        body: body.trim(),
        parent_id: replyTo?.id ?? null,
      })
      setComments(prev => [data, ...prev])
      setBody('')
      setReplyTo(null)
    } catch {
      alert('Could not post comment.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <>
      <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 z-40 bg-flockr-surface rounded-t-2xl bottom-sheet flex flex-col" style={{ height: '72vh' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-white/[0.06] shrink-0">
          <h3 className="font-display font-bold text-white text-base">Comments</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <svg className="w-4 h-4 text-flockr-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto scroll-hidden px-4 py-3 space-y-4">
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-2/3 rounded" />
              </div>
            </div>
          ))}
          {!loading && comments.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <svg className="w-10 h-10 text-flockr-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
              </svg>
              <p className="text-flockr-muted text-sm">No comments yet. Be first!</p>
            </div>
          )}
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={() => { setReplyTo(comment); inputRef.current?.focus() }}
            />
          ))}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-white/[0.06] px-4 py-3 pb-safe">
          {replyTo && (
            <div className="flex items-center justify-between mb-2 text-xs text-flockr-muted bg-white/[0.04] rounded-lg px-3 py-1.5">
              <span>Replying to <span className="text-flockr-orange">@{replyTo.user?.username}</span></span>
              <button onClick={() => setReplyTo(null)} className="text-flockr-muted hover:text-white">✕</button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            {auth?.user
              ? <img src={auth.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
              : <div className="w-8 h-8 rounded-full bg-flockr-card shrink-0" />
            }
            <input
              ref={inputRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={auth?.user ? 'Add a comment...' : 'Log in to comment'}
              disabled={!auth?.user}
              className="input-flockr py-2 text-sm flex-1"
            />
            <button
              type="submit"
              disabled={!body.trim() || posting}
              className="btn-primary text-xs py-2 px-4 shrink-0 disabled:opacity-50"
            >
              {posting ? '...' : 'Post'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

function CommentItem({ comment, onReply }) {
  const [liked, setLiked] = useState(false)
  return (
    <div className="flex gap-3">
      <Link href={`/@${comment.user?.username}`}>
        <img
          src={comment.user?.avatar_url ?? `https://ui-avatars.com/api/?name=${comment.user?.name}&background=1a1a1a`}
          alt={comment.user?.name}
          className="w-9 h-9 rounded-full object-cover shrink-0"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href={`/@${comment.user?.username}`} className="text-white text-xs font-semibold hover:text-flockr-orange transition-colors">
            {comment.user?.name}
          </Link>
          {comment.is_pinned && (
            <span className="badge badge-orange" style={{ fontSize: '10px', padding: '1px 6px' }}>Pinned</span>
          )}
        </div>
        <p className="text-white/80 text-sm mt-0.5 leading-snug">{comment.body}</p>
        <div className="flex items-center gap-4 mt-1.5">
          <span className="text-flockr-muted text-[11px]">
            {new Date(comment.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
          </span>
          <button onClick={onReply} className="text-flockr-muted text-[11px] hover:text-white transition-colors">Reply</button>
          <button
            onClick={() => setLiked(l => !l)}
            className="flex items-center gap-1 text-[11px] text-flockr-muted hover:text-flockr-red transition-colors"
          >
            <svg className={`w-3 h-3 ${liked ? 'text-flockr-red' : ''}`} fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            {comment.likes_count > 0 && comment.likes_count}
          </button>
        </div>
        {comment.replies?.length > 0 && (
          <div className="mt-3 space-y-3 pl-3 border-l border-white/[0.06]">
            {comment.replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} onReply={onReply} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
