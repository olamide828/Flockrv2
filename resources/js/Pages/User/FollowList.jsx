import { useState } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'
import { RiVerifiedBadgeLine } from 'react-icons/ri'

export default function FollowList({ profileUser, followers = [], following = [], activeTab: initTab = 'followers' }) {
  const { auth } = usePage().props
  const [tab, setTab] = useState(initTab)
  const [followStates, setFollowStates] = useState({})

  const list = tab === 'followers' ? followers : following

  const handleFollow = async (userId) => {
    if (!auth?.user) { router.visit('/login'); return }
    const current = followStates[userId] ?? null // null means use server state
    // We'll toggle optimistically
    setFollowStates(prev => ({ ...prev, [userId]: !prev[userId] }))
    try {
      await axios.post(`/api/users/${userId}/follow`)
    } catch {
      setFollowStates(prev => ({ ...prev, [userId]: !prev[userId] }))
    }
  }

  return (
    <>
      <Head title={`@${profileUser.username} · ${tab === 'followers' ? 'Followers' : 'Following'}`} />
      <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>

        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button
            onClick={() => window.history.back()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0, fontFamily: 'var(--font-display)' }}>
              @{profileUser.username}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {[
            { key: 'followers', label: followers.length === 1 ? 'Follower' : 'Followers', count: profileUser.followers_count ?? followers.length },
            { key: 'following', label: 'Following', count: profileUser.following_count ?? following.length },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '14px 8px', background: 'none', border: 'none',
                borderBottom: tab === t.key ? '2px solid #ff5c00' : '2px solid transparent',
                color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: 14, fontWeight: tab === t.key ? 700 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {Number(t.count).toLocaleString()} {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ padding: '8px 0', paddingBottom: 80 }}>
          {list.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 40, margin: '0 0 12px' }}>👥</p>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>
                {tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
                {tab === 'followers'
                  ? 'When people follow this account they will show up here.'
                  : 'When this account follows people they will show up here.'
                }
              </p>
            </div>
          ) : (
            list.map(user => {
              const isMe = auth?.user?.id === user.id
              const isFollowing = followStates[user.id] ?? user.is_followed_by_me
              return (
                <div key={user.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  {/* Avatar */}
                  <Link href={`/@${user.username}`} style={{ flexShrink: 0, textDecoration: 'none' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #ff5c00, #ff8c00)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{user.name?.[0]?.toUpperCase()}</span>
                      }
                    </div>
                  </Link>

                  {/* Info */}
                  <Link href={`/@${user.username}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>{user.name}</p>
                      {user.is_verified && (
                        <RiVerifiedBadgeLine size={15} color="#FF6B35" />
                      )}
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '2px 0 0' }}>@{user.username}</p>
                    {user.bio && (
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.bio}
                      </p>
                    )}
                  </Link>

                  {/* Follow button — hide for own account */}
                  {!isMe && auth?.user && (
                    <button
                      onClick={() => handleFollow(user.id)}
                      style={{
                        padding: '8px 18px', borderRadius: 999, flexShrink: 0,
                        background: isFollowing ? 'transparent' : '#ff5c00',
                        border: `1px solid ${isFollowing ? 'rgba(255,255,255,0.2)' : '#ff5c00'}`,
                        color: isFollowing ? 'rgba(255,255,255,0.6)' : '#fff',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}

FollowList.layout = page => <AppLayout>{page}</AppLayout>