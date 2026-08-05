import { useState, useEffect, useRef, useCallback } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'
import { useToast } from '@/Components/Toast'
import {
  RiAddLine, RiSearchLine, RiGroupLine, RiArrowRightSLine, RiFireLine, RiLoader4Line,
} from 'react-icons/ri'

import PostComposer from '@/Components/Community/PostComposer'
import PostCard from '@/Components/Community/PostCard'
import PostReportModal from '@/Components/Community/PostReportModal'
import RoomChat from '@/Components/Community/RoomChat'
import RoomDiscovery from '@/Components/Community/RoomDiscovery'
import RoomJoinModal from '@/Components/Community/RoomJoinModal'
import ConfirmModal from '@/Components/Community/ConfirmModal'
import RulesModal from '@/Components/Community/RulesModal'
import MembersDrawer from '@/Components/Community/MembersDrawer'
import RoomSettingsModal from '@/Components/Community/RoomSettingsModal'
import CreateRoomModal from '@/Components/Community/CreateRoomModal'
import RoomTrayAvatar from '@/Components/Community/RoomTrayAvatar'
import ShareRoomSheet from '@/Components/Community/ShareRoomSheet'
import MediaLightbox from '../../Components/Community/MediaLightBox';

const FEED_CACHE_KEY = 'flockr_community_feed_cache'

/**
 * Read the feed cache synchronously, BEFORE the component's first render —
 * used as a lazy useState initializer below. This is what actually kills
 * the loading-flash: previously `loading` always started `true` and only
 * flipped to `false` inside a useEffect (which runs AFTER the first paint),
 * so returning from CommunityPost always showed one frame — sometimes more,
 * depending on render timing — of the skeleton loader even though no
 * network request was happening. Seeding state from the cache before the
 * first render ever happens means there's nothing to flash.
 */
function readFeedCache() {
  try {
    const nav = performance.getEntriesByType?.('navigation')?.[0]
    if (nav?.type === 'reload') {
      sessionStorage.removeItem(FEED_CACHE_KEY)
      return null
    }
    const cached = sessionStorage.getItem(FEED_CACHE_KEY)
    return cached ? JSON.parse(cached) : null
  } catch { return null }
}

export default function Community({ joinedRooms: initJoined = [], discoverRooms: initDiscover = [] }) {
  const { auth } = usePage().props
  const pageUrl = usePage().url
  const isSeller = ['seller', 'admin'].includes(auth?.user?.role)
  const { showToast, ToastComponent } = useToast()

  const [view,          setView]          = useState('feed')
  const [activeRoomId,  setActiveRoomId]  = useState(null)
  const [joinedRooms,   setJoinedRooms]   = useState(initJoined)
  const [discoverRooms, setDiscoverRooms] = useState(initDiscover)

  const [showComposer,   setShowComposer]   = useState(false)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showDiscover,   setShowDiscover]   = useState(false)
  const [inviteFromUrl,  setInviteFromUrl]  = useState('')
  const [membersRoom,    setMembersRoom]    = useState(null)
  const [rulesRoom,      setRulesRoom]      = useState(null)
  const [settingsRoom,   setSettingsRoom]   = useState(null)
  const [shareRoom,      setShareRoom]      = useState(null)
  const [joinTarget,     setJoinTarget]     = useState(null) // room pending the Discord-style confirm modal
  const [reportPost,     setReportPost]     = useState(null)

  // Read once, synchronously, before the first render — every state below
  // that depends on it uses a lazy initializer so there's no in-between
  // "empty then filled" render.
  const cachedFeedRef = useRef(undefined)
  if (cachedFeedRef.current === undefined) cachedFeedRef.current = readFeedCache()
  const cachedFeed = cachedFeedRef.current

  const [lightboxState, setLightboxState] = useState(null) // { postIndex, mediaIndex } | null
  const [posts,   setPosts]   = useState(() => cachedFeed?.posts ?? [])
  const [loading, setLoading] = useState(() => !cachedFeed)
  const [page,    setPage]    = useState(() => cachedFeed?.page ?? 1)
  const [hasMore, setHasMore] = useState(() => cachedFeed?.hasMore ?? true)
  const [pullY,   setPullY]   = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [followingMap, setFollowingMap] = useState(() => {
    const map = {}
    ;(cachedFeed?.posts ?? []).forEach(post => { map[post.user_id] = !!post.is_following_author })
    return map
  })
  const [initialized, setInitialized] = useState(() => !!cachedFeed) // true once the very first load (cache or network) has settled
  const [leaveTarget, setLeaveTarget] = useState(null) // room pending the leave-confirmation modal

  const loaderRef      = useRef(null)
  const scrollElRef    = useRef(null)
  const touchStartY    = useRef(0)
  const activeRoomIdRef = useRef(activeRoomId)

  const activeRoom = activeRoomId ? joinedRooms.find(r => r.id === activeRoomId) : null

  useEffect(() => { activeRoomIdRef.current = activeRoomId }, [activeRoomId])

  useEffect(() => {
    if (activeRoom) document.body.classList.add('chat-open')
    else             document.body.classList.remove('chat-open')
    return () => document.body.classList.remove('chat-open')
  }, [activeRoom])

  // ── Auto-open Discover with a prefilled invite code from /community?invite=CODE ──
  useEffect(() => {
    const params = new URLSearchParams(pageUrl.split('?')[1] ?? '')
    const invite = params.get('invite')
    if (invite) {
      setInviteFromUrl(invite.toUpperCase())
      setShowDiscover(true)
      window.history.replaceState({}, '', '/community')
    }
  }, [])

  // ── Feed loading, with session-cached "don't refetch on back navigation" ──
  const loadFeed = useCallback(async (reset = false) => {
    const p = reset ? 1 : page
    if (!reset && !hasMore) return
    setLoading(true)
    try {
      const { data } = await axios.get('/api/community/feed', { params: { page: p } })
      const incoming = data.data ?? []
      setPosts(prev => reset ? incoming : [...prev, ...incoming])
      setHasMore(data.current_page < data.last_page)
      setPage(reset ? 2 : p + 1)
      setFollowingMap(prev => {
        const next = { ...prev }
        incoming.forEach(post => {
          if (!(post.user_id in next)) next[post.user_id] = !!post.is_following_author
        })
        return next
      })
    } catch {} finally { setLoading(false) }
  }, [page, hasMore])

  // Only need to actually fetch when there was no cache to seed from —
  // `posts`/`loading`/`page`/`hasMore`/`initialized` above are already
  // correct as of the very first render in the cache-hit case.
  useEffect(() => {
    if (cachedFeed) return
    loadFeed(true).then(() => setInitialized(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (posts.length === 0) return
    sessionStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ posts, page, hasMore }))
  }, [posts, page, hasMore])

  // Gated on `initialized` so restoring from the session cache (e.g. coming
  // back from a CommunityPost visit) never fires an immediate extra fetch —
  // this only starts watching once the very first render cycle has settled.
  useEffect(() => {
    if (!initialized || !loaderRef.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && !loading && hasMore) loadFeed() }, { threshold:0.1 })
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [initialized, loadFeed, loading, hasMore])

  // ── Pull-to-refresh ──────────────────────────────────────────────────────
  const onTouchStart = (e) => {
    if (scrollElRef.current?.scrollTop > 0) return
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchMove = (e) => {
    if (scrollElRef.current?.scrollTop > 0 || refreshing) return
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy > 0) setPullY(Math.min(dy * 0.4, 80))
  }
  const onTouchEndPull = async () => {
    if (pullY > 50) {
      setRefreshing(true)
      await loadFeed(true)
      setRefreshing(false)
    }
    setPullY(0)
  }

  // ── Realtime unread tracking for the ROOM LIST (separate from RoomChat's
  // own subscription, which only exists while a chat is open). Without
  // this, has_unread only ever updates on a hard page refresh. ──────────
  // ── Realtime unread + typing tracking for the ROOM LIST ──────────────────
  const [typingByRoom, setTypingByRoom] = useState({}) // { [roomId]: { [userId]: name } }
  const typingTimersRef = useRef({}) // { [`${roomId}-${userId}`]: timeoutId }

  useEffect(() => {
    if (!window.Echo) return
    const roomIds = joinedRooms.map(r => r.id)
    if (roomIds.length === 0) return

    const channels = roomIds.map(id => {
      const channel = window.Echo.private(`room.${id}`)
      channel.listen('.RoomMessageSent', (e) => {
        if (e.message?.user_id === auth?.user?.id) return
        const isCurrentlyOpen = activeRoomIdRef.current === id
        setJoinedRooms(prev => {
          const updated = prev.map(r => r.id === id ? { ...r, has_unread: !isCurrentlyOpen } : r)
          const found = updated.find(r => r.id === id)
          return found ? [found, ...updated.filter(r => r.id !== id)] : updated
        })
      })
      channel.listenForWhisper('typing', (e) => {
        if (e.user_id === auth?.user?.id) return
        if (activeRoomIdRef.current === id) return // RoomChat's own indicator handles this case
        setTypingByRoom(prev => ({ ...prev, [id]: { ...prev[id], [e.user_id]: e.name || 'Someone' } }))
        const key = `${id}-${e.user_id}`
        clearTimeout(typingTimersRef.current[key])
        typingTimersRef.current[key] = setTimeout(() => {
          setTypingByRoom(prev => {
            const next = { ...(prev[id] || {}) }
            delete next[e.user_id]
            return { ...prev, [id]: next }
          })
        }, 2500)
      })
      return channel
    })

    return () => {
      Object.values(typingTimersRef.current).forEach(clearTimeout)
      channels.forEach(ch => {
        ch.stopListening('.RoomMessageSent')
        ch.stopListeningForWhisper('typing')
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedRooms.map(r => r.id).sort((a, b) => a - b).join(',')]);

  // ── Post actions ─────────────────────────────────────────────────────────
  const handleLike = async (post) => {
    if (!auth?.user) { router.visit('/login'); return }
    const was = post.is_liked_by_me
    setPosts(p => p.map(q => q.id === post.id ? { ...q, is_liked_by_me:!was, likes_count: was ? Math.max(0, q.likes_count-1) : q.likes_count+1 } : q))
    try {
      const { data } = await axios.post(`/api/community/posts/${post.id}/like`)
      setPosts(p => p.map(q => q.id === post.id ? { ...q, is_liked_by_me:data.liked, likes_count:data.likes_count } : q))
    } catch {
      setPosts(p => p.map(q => q.id === post.id ? { ...q, is_liked_by_me:was, likes_count:post.likes_count } : q))
    }
  }

  const handleDelete = async (post) => {
    setPosts(p => p.filter(q => q.id !== post.id))
    try { await axios.delete(`/api/community/posts/${post.id}`) }
    catch { loadFeed(true) }
  }

  const handleDismiss = (post) => {
    setPosts(p => p.filter(q => q.id !== post.id))
    axios.post(`/api/community/posts/${post.id}/dismiss`).catch(() => {})
  }

  const handleBlockAuthor = async (post) => {
    try {
      await axios.post(`/api/users/${post.user_id}/block`)
      setPosts(p => p.filter(q => q.user_id !== post.user_id))
      showToast(`Blocked @${post.user?.username}`)
    } catch { showToast('Failed to block', 'error') }
  }

  // Single source of truth for follow state — every PostCard by the same
  // author reads from this map, so following/unfollowing from any one post
  // updates all of them immediately, no refresh needed.
  const handleFollowChange = (userId, following) => {
    setFollowingMap(prev => ({ ...prev, [userId]: following }))
  }

  const handleViewed = (postId, viewsCount) => {
    setPosts(p => p.map(q => q.id === postId ? { ...q, views_count: viewsCount } : q))
  }

  const submitPostReport = async (reason, description) => {
    if (!reportPost) return
    try {
      await axios.post(`/api/users/${reportPost.user_id}/report`, { reason, description, post_id: reportPost.id })
      showToast('Report submitted')
    } catch (e) {
      showToast('Failed to submit report', 'error')
      throw e
    }
  }

  // ── Room join flow — RoomJoinModal is now the single entry point ────────
  const handleJoin = (room) => {
    if (!auth?.user) { router.visit('/login'); return }
    setJoinTarget(room)
  }

  const doJoin = async (room) => {
    try {
      // Came from the invite-code preview flow — must go through the
      // invite endpoint specifically (it's what validates the code and
      // decides join-immediately vs pending-request for private rooms).
      if (room._inviteCode) {
        const { data } = await axios.post('/api/community/rooms/join-by-invite', { invite_code: room._inviteCode })
        if (data.joined && data.room) {
          setJoinedRooms(p => [data.room, ...p.filter(x => x.id !== data.room.id)])
          setDiscoverRooms(p => p.filter(x => x.id !== data.room.id))
          showToast(`Joined ${data.room.name}!`)
          return data.room
        }
        showToast(`Your request to join ${room.name} has been sent`)
        return null
      }

      if (room.is_private) {
        await axios.post(`/api/community/rooms/${room.id}/request-join`)
        showToast(`Your request to join ${room.name} has been sent`)
        return null
      }
      const { data } = await axios.post(`/api/community/rooms/${room.id}/join`)
      if (data.joined) {
        const r = data.room ?? { ...room, has_unread:false, pivot_role:'member' }
        setJoinedRooms(p => [r, ...p.filter(x => x.id !== r.id)])
        setDiscoverRooms(p => p.filter(x => x.id !== room.id))
        showToast(`Joined ${room.name}!`)
        return r
      }
    } catch (e) { showToast(e.response?.data?.message ?? 'Failed to join', 'error') }
  }

  const handleRoomCreated = (room) => {
    setJoinedRooms(p => [room, ...p])
    setView('rooms')
    setActiveRoomId(room.id)
    showToast(`"${room.name}" created!`)
    if (room.is_private && room.invite_code) {
      navigator.clipboard?.writeText(room.invite_code)
      showToast(`Invite code ${room.invite_code} copied to clipboard!`)
    }
  }

  const handleKick = async (member) => {
    if (!membersRoom) return
    try { await axios.delete(`/api/community/rooms/${membersRoom.id}/kick`, { data: { user_id: member.id } }); showToast(`${member.name} removed`) }
    catch { showToast('Failed', 'error') }
  }

  const handleLeaveRoom = (room) => {
    setLeaveTarget(room)
  }

  const confirmLeaveRoom = async () => {
    const room = leaveTarget
    if (!room) return
    try {
      await axios.post(`/api/community/rooms/${room.id}/join`) // toggles -> leaves since already a member
      setJoinedRooms(p => p.filter(r => r.id !== room.id))
      setActiveRoomId(null)
      showToast(`Left ${room.name}`)
    } catch { showToast('Failed to leave', 'error') }
  }

  const openRoom = (room) => {
    setActiveRoomId(room.id)
    setJoinedRooms(p => p.map(r => r.id === room.id ? { ...r, has_unread:false } : r))
  }

  // ── Full-screen room chat ────────────────────────────────────────────────
  if (view === 'rooms' && activeRoom) {
    return (
      <>
        <Head title={activeRoom.name} />
        {ToastComponent}
        {membersRoom  && <MembersDrawer room={membersRoom} auth={auth} onClose={() => setMembersRoom(null)} onKick={handleKick} showToast={showToast} />}
        {rulesRoom    && <RulesModal room={rulesRoom} auth={auth} onClose={() => setRulesRoom(null)} onSaved={rules => setJoinedRooms(p => p.map(r => r.id === rulesRoom.id ? { ...r, rules } : r))} />}
        {settingsRoom && <RoomSettingsModal room={settingsRoom} onClose={() => setSettingsRoom(null)} showToast={showToast}
          onShare={setShareRoom}
          onSaved={updated => setJoinedRooms(p => p.map(r => r.id === updated.id ? { ...r, ...updated } : r))} />}
        {shareRoom    && <ShareRoomSheet room={shareRoom} onClose={() => setShareRoom(null)} />}
        {leaveTarget  && <ConfirmModal title={`Leave ${leaveTarget.name}?`} message="You'll need to rejoin (or be re-approved, for private rooms) to see messages again." confirmLabel="Leave" onConfirm={confirmLeaveRoom} onClose={() => setLeaveTarget(null)} />}
        <div style={{ height:'100%', overflow:'hidden' }}>
          <RoomChat room={activeRoom} auth={auth} showToast={showToast}
            onBack={() => setActiveRoomId(null)}
            onOpenMembers={() => setMembersRoom(activeRoom)}
            onOpenRules={() => setRulesRoom(activeRoom)}
            onOpenSettings={() => setSettingsRoom(activeRoom)}
            onLeaveRoom={handleLeaveRoom}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <Head title="Community" />
      {ToastComponent}
      {showComposer    && <PostComposer auth={auth} showToast={showToast} onClose={() => setShowComposer(false)} onPosted={p => setPosts(prev => { const next = [p, ...prev]; sessionStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ posts: next, page, hasMore })); return next })} />}
      {showCreateRoom  && <CreateRoomModal onClose={() => setShowCreateRoom(false)} onCreated={handleRoomCreated} />}
      {showDiscover    && <RoomDiscovery auth={auth} onClose={() => { setShowDiscover(false); setInviteFromUrl('') }} onJoin={handleJoin} onPreviewInvite={(room) => setJoinTarget(room)} joinedIds={joinedRooms.map(r => r.id)} initialInvite={inviteFromUrl} />}
      {membersRoom     && <MembersDrawer room={membersRoom} auth={auth} onClose={() => setMembersRoom(null)} onKick={handleKick} showToast={showToast} />}
      {rulesRoom       && <RulesModal room={rulesRoom} auth={auth} onClose={() => setRulesRoom(null)} onSaved={rules => setJoinedRooms(p => p.map(r => r.id === rulesRoom.id ? { ...r, rules } : r))} />}
      {settingsRoom    && <RoomSettingsModal room={settingsRoom} onClose={() => setSettingsRoom(null)} showToast={showToast}
        onShare={setShareRoom}
        onSaved={updated => setJoinedRooms(p => p.map(r => r.id === updated.id ? { ...r, ...updated } : r))} />}
      {shareRoom       && <ShareRoomSheet room={shareRoom} onClose={() => setShareRoom(null)} />}
      {joinTarget      && <RoomJoinModal room={joinTarget} onClose={() => setJoinTarget(null)} onConfirm={doJoin} />}
      {reportPost      && <PostReportModal post={reportPost} onClose={() => setReportPost(null)} onSubmit={submitPostReport} />}
        {lightboxState && (
  <MediaLightbox
    posts={posts.filter(p => (p.media?.length ? p.media : (p.media_url ? [1] : [])).length > 0)}
    startPostIndex={lightboxState.postIndex}
    startMediaIndex={lightboxState.mediaIndex}
    onClose={() => setLightboxState(null)}
    auth={auth}
    onLike={handleLike}
    followingMap={followingMap}
    onFollowChange={handleFollowChange}
    onLoadMore={() => loadFeed()}
    hasMore={hasMore}
    onReport={setReportPost}
    onBlockAuthor={handleBlockAuthor}
  />
)}

      <div
        ref={scrollElRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndPull}
        style={{ height:'100%', overflowY:'auto', background:'#050505', color:'#fff', fontFamily:'"DM Sans", sans-serif', position:'relative' }}
      >
        {/* Pull-to-refresh indicator */}
        {(pullY > 0 || refreshing) && (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height: refreshing ? 44 : pullY, transition: refreshing ? 'height 0.2s' : 'none', overflow:'hidden' }}>
            <RiLoader4Line size={20} color="#FF6B35" style={{ animation: (refreshing || pullY > 50) ? 'spin 0.7s linear infinite' : 'none', opacity: refreshing ? 1 : Math.min(pullY / 50, 1) }} />
          </div>
        )}

        <div style={{ maxWidth:640, margin:'0 auto' }}>

          {/* ── HEADER ─────────────────────────────────────────────── */}
          <div style={{ position:'sticky', top:0, zIndex:40, background:'rgba(5,5,5,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 0' }}>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800, letterSpacing:'-0.4px' }}>Community</h1>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setShowDiscover(true)} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.07)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.6)' }}>
                  <RiSearchLine size={17} />
                </button>
                {isSeller && (
                  <button onClick={() => setShowCreateRoom(true)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:999, background:'#FF6B35', border:'none', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:700 }}>
                    <RiAddLine size={15} /> Room
                  </button>
                )}
              </div>
            </div>

            <div style={{ display:'flex', marginTop:12 }}>
              {[{ key:'feed', label:'Feed' }, { key:'rooms', label:`Rooms${joinedRooms.length > 0 ? ` (${joinedRooms.length})` : ''}` }].map(t => (
                <button key={t.key} onClick={() => { setView(t.key); setActiveRoomId(null) }}
                  style={{ flex:1, padding:'11px 0', background:'none', border:'none', cursor:'pointer', color: view===t.key ? '#fff' : 'rgba(255,255,255,0.4)', fontSize:14, fontWeight: view===t.key ? 700 : 500, borderBottom: view===t.key ? '2px solid #FF6B35' : '2px solid transparent', position:'relative' }}>
                  {t.label}
                  {t.key === 'rooms' && joinedRooms.some(r => r.has_unread) && (
                    <span style={{ position:'absolute', top:9, right:'calc(50% - 28px)', width:7, height:7, borderRadius:'50%', background:'#FF6B35', border:'1.5px solid #050505' }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── ROOMS VIEW ──────────────────────────────────────────── */}
          {view === 'rooms' && (
            <>
              {joinedRooms.length === 0 ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 24px', textAlign:'center', gap:20 }}>
                  <div style={{ width:80, height:80, borderRadius:24, background:'rgba(255,107,53,0.08)', border:'1px solid rgba(255,107,53,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <RiGroupLine size={36} color="#FF6B35" />
                  </div>
                  <div>
                    <h3 style={{ color:'#fff', fontSize:20, fontWeight:700, margin:'0 0 8px' }}>Join your first Room</h3>
                    <p style={{ color:'rgba(255,255,255,0.45)', fontSize:14, lineHeight:1.65, margin:0, maxWidth:300 }}>
                      Rooms are exclusive spaces by sellers. Get early drops, insider info, and direct access to your favourite vendors.
                    </p>
                  </div>
                  <button onClick={() => setShowDiscover(true)} style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 30px', background:'linear-gradient(135deg, rgba(255,107,53,0.2), rgba(255,107,53,0.08))', border:'1px solid rgba(255,107,53,0.35)', borderRadius:999, cursor:'pointer', backdropFilter:'blur(12px)' }}>
                    <RiSearchLine size={18} color="#FF6B35" />
                    <span style={{ color:'#FF6B35', fontWeight:700, fontSize:15 }}>Explore Rooms</span>
                  </button>
                  {discoverRooms.slice(0, 3).map(room => (
                    <div key={room.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'rgba(255,255,255,0.04)', borderRadius:16, border:'1px solid rgba(255,255,255,0.07)', width:'100%', maxWidth:400 }}>
                      <img src={room.avatar_url} alt="" style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0, textAlign:'left' }}>
                        <p style={{ color:'#fff', fontSize:14, fontWeight:700, margin:0 }}>{room.name}</p>
                        <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, margin:'2px 0 0' }}>{room.members_count} members</p>
                      </div>
                      <button onClick={() => handleJoin(room)} style={{ padding:'7px 16px', borderRadius:999, background:'#FF6B35', border:'none', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:700, flexShrink:0 }}>{room.is_private ? 'Request' : 'Join'}</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'16px 16px 4px', background:'rgba(8,8,8,0.5)' }}>
                    <div style={{ display:'flex', gap:14, overflowX:'auto', scrollbarWidth:'none', paddingBottom:12 }}>
                      {joinedRooms.map(room => (
                        <RoomTrayAvatar key={room.id} room={room} isActive={false} onClick={() => openRoom(room)} />
                      ))}
                      <button onClick={() => setShowDiscover(true)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', flexShrink:0, width:68 }}>
                        <div style={{ width:54, height:54, borderRadius:'50%', background:'rgba(255,255,255,0.05)', border:'1px dashed rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <RiAddLine size={22} color="rgba(255,255,255,0.4)" />
                        </div>
                        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:10 }}>Explore</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ padding:'14px 0' }}>
                    <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 8px', padding:'0 16px' }}>Your Rooms</p>
                    {joinedRooms.map(room => (
                      <button key={room.id} onClick={() => openRoom(room)}
                        style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', width:'100%', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ position:'relative', flexShrink:0 }}>
                          {room.has_unread && <div style={{ position:'absolute', inset:-2, borderRadius:'50%', background:'conic-gradient(#FF6B35, #FFD700, #FF6B35)', animation:'spin 2s linear infinite', zIndex:0 }} />}
                          <div style={{ position:'relative', zIndex:1, width:50, height:50, borderRadius:'50%', overflow:'hidden', border: room.has_unread ? '2px solid #050505' : '2px solid rgba(255,255,255,0.08)' }}>
                            <img src={room.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          </div>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                            <p style={{ color:'#fff', fontWeight: room.has_unread ? 700 : 600, fontSize:14, margin:0 }}>{room.name}</p>
                            {room.pivot_role === 'moderator' && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:999, background:'rgba(255,107,53,0.15)', color:'#FF6B35' }}>Host</span>}
                          </div>
                          {(() => {
  const names = Object.values(typingByRoom[room.id] || {})
  if (names.length > 0) {
    const text = names.length === 1
      ? `${names[0]} is typing`
      : `${names[0]} & ${names.length - 1} other${names.length - 1 > 1 ? 's' : ''} typing`
    return (
      <p style={{ color: '#FF6B35', fontSize: 12, margin: 0, fontStyle: 'italic', fontWeight: 500 }}>{text}</p>
    )
  }
  return (
    <p style={{ color: room.has_unread ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)', fontSize: 12, margin: 0, fontWeight: room.has_unread ? 500 : 400 }}>
      {room.has_unread ? 'New messages' : 'Tap to open chat'}
    </p>
  )
})()}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {room.has_unread && <div style={{ width:10, height:10, borderRadius:'50%', background:'#FF6B35' }} />}
                          <RiArrowRightSLine size={18} color="rgba(255,255,255,0.25)" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── GENERAL FEED ────────────────────────────────────────── */}
          {view === 'feed' && (
            <div>
              {loading && posts.length === 0 && (
                Array.from({ length:3 }).map((_, i) => (
                  <div key={i} style={{ display:'flex', gap:12, padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', opacity: 1 - i*0.25 }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(255,255,255,0.07)', flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ width:120, height:10, borderRadius:999, background:'rgba(255,255,255,0.07)', marginBottom:8 }} />
                      <div style={{ width:'90%', height:10, borderRadius:999, background:'rgba(255,255,255,0.05)', marginBottom:6 }} />
                      <div style={{ width:'65%', height:10, borderRadius:999, background:'rgba(255,255,255,0.04)' }} />
                    </div>
                  </div>
                ))
              )}

              {!loading && posts.length === 0 && (
                <div style={{ textAlign:'center', padding:'80px 24px' }}>
                  <RiFireLine size={40} color="rgba(255,255,255,0.1)" style={{ margin:'0 auto 12px', display:'block' }} />
                  <p style={{ color:'rgba(255,255,255,0.4)', fontSize:15, fontWeight:600, margin:'0 0 6px' }}>Nothing here yet</p>
                  <p style={{ color:'rgba(255,255,255,0.25)', fontSize:13, margin:0 }}>Be the first to post something!</p>
                </div>
              )}

              {posts.map((post, i) => (
  <PostCard key={post.id} post={post} auth={auth} showToast={showToast}
    onDelete={handleDelete} onLike={handleLike}
    onDismiss={handleDismiss} onBlockAuthor={handleBlockAuthor}
    onReport={setReportPost}
    isFollowingAuthor={followingMap[post.user_id] ?? !!post.is_following_author}
    onFollowChange={handleFollowChange}
    onViewed={handleViewed}
    onOpenLightbox={(mediaIndex) => {
      const mediaPosts = posts.filter(p => (p.media?.length ? p.media : (p.media_url ? [1] : [])).length > 0)
      const realIndex = mediaPosts.findIndex(p => p.id === post.id)
      if (realIndex !== -1) setLightboxState({ postIndex: realIndex, mediaIndex })
    }}
  />
))}

              {hasMore && <div ref={loaderRef} style={{ height:1 }} />}
              {loading && posts.length > 0 && (
                <div style={{ display:'flex', justifyContent:'center', padding:'20px 0' }}>
                  <div style={{ width:22, height:22, border:'2px solid rgba(255,255,255,0.1)', borderTopColor:'#FF6B35', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                </div>
              )}
            </div>
          )}

        </div>

        {view === 'feed' && (
          <button
            onClick={() => auth?.user ? setShowComposer(true) : router.visit('/login')}
            style={{ position:'fixed', bottom:82, right:18, width:54, height:54, borderRadius:'50%', background:'#FF6B35', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 24px rgba(255,107,53,0.5)', zIndex:50 }}
          >
            <RiAddLine size={28} color="#fff" />
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin     { to { transform:rotate(360deg); } }
        @keyframes slideUp  { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes typingDot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }
        ::-webkit-scrollbar { display:none; }
      `}</style>
    </>
  )
}

Community.layout = page => <AppLayout>{page}</AppLayout>