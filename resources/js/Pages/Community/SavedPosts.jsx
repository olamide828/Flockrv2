import { useEffect, useState, useCallback } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import axios from 'axios'
import AppLayout from '@/Layouts/AppLayout'
import { RiArrowLeftLine, RiBookmarkLine } from 'react-icons/ri'
import PostCard from '@/Components/Community/PostCard'
import { useToast } from '@/Components/Toast'

/** Community posts you bookmarked. Un-saving a post (bookmark icon) takes it off this list on the next visit. */
export default function SavedPosts() {
  const { auth } = usePage().props
  const { showToast, ToastComponent } = useToast()
  const [posts, setPosts] = useState(null)

  useEffect(() => { axios.get('/api/community/saved').then(r => setPosts(r.data ?? [])).catch(() => setPosts([])) }, [])

  const like = useCallback(async (post) => {
    const was = post.is_liked_by_me
    setPosts(p => p.map(x => x.id === post.id ? { ...x, is_liked_by_me: !was, likes_count: Math.max(0, x.likes_count + (was ? -1 : 1)) } : x))
    try { const { data } = await axios.post(`/api/community/posts/${post.id}/like`); setPosts(p => p.map(x => x.id === post.id ? { ...x, is_liked_by_me: data.liked, likes_count: data.likes_count } : x)) }
    catch { setPosts(p => p.map(x => x.id === post.id ? { ...x, is_liked_by_me: was } : x)) }
  }, [])

  const remove = useCallback(async (post) => {
    try { await axios.delete(`/api/community/posts/${post.id}`); setPosts(p => p.filter(x => x.id !== post.id)); showToast('Post deleted') }
    catch { showToast('Could not delete that post', 'error') }
  }, [showToast])

  return (
    <>
      <Head title="Saved posts" />
      {ToastComponent}
      <div style={{ minHeight: '100%', background: '#050505', color: '#fff' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'rgba(5,5,5,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => window.history.back()} aria-label="Back" style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', padding: 0, lineHeight: 0 }}>
              <RiArrowLeftLine size={18} style={{ display: 'block' }} />
            </button>
            <span style={{ fontWeight: 800, fontSize: 18 }}>Saved posts</span>
          </div>

          {posts === null && <p style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>Loading…</p>}
          {posts?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '70px 24px', color: 'rgba(255,255,255,0.35)' }}>
              <RiBookmarkLine size={40} style={{ opacity: 0.5 }} />
              <p style={{ margin: '12px 0 4px', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Nothing saved yet</p>
              <p style={{ margin: 0, fontSize: 13 }}>Tap the bookmark on a post to keep it here.</p>
            </div>
          )}
          {posts?.map(post => (
            <PostCard key={post.id} post={post} auth={auth} showToast={showToast} isFollowingAuthor={!!post.is_following_author}
              onLike={like} onDelete={remove} onBlockAuthor={() => {}} onReport={() => router.visit(`/community/posts/${post.id}`)}
              onFollowChange={() => {}} onViewed={() => {}} onPollChange={(id, poll) => setPosts(p => p.map(x => x.id === id ? { ...x, poll } : x))} />
          ))}
        </div>
      </div>
    </>
  )
}

SavedPosts.layout = page => <AppLayout>{page}</AppLayout>
