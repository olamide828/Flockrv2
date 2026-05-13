import { useState } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import ProductCard from '@/Components/Product/ProductCard'
import axios from 'axios'

export default function UserProfile({ profileUser, videos, products, isFollowing: initFollowing, isOwnProfile }) {
  const { auth } = usePage().props
  const [following,        setFollowing]        = useState(initFollowing)
  const [followersCount,   setFollowersCount]   = useState(profileUser.followers_count)
  const [activeTab,        setActiveTab]        = useState('videos')

  const handleFollow = async () => {
    if (!auth?.user) { router.visit('/login'); return }
    const next = !following
    setFollowing(next)
    setFollowersCount(c => c + (next ? 1 : -1))
    await axios.post(`/api/users/${profileUser.id}/follow`).catch(() => {
      setFollowing(!next)
      setFollowersCount(c => c + (next ? -1 : 1))
    })
  }

  const tabs = [
    { key: 'videos',   label: '🎬 Videos',   count: videos?.length },
    { key: 'products', label: '🛍 Products',  count: products?.length, show: profileUser.role === 'seller' },
  ].filter(t => t.show !== false)

  return (
    <>
      <Head title={`@${profileUser.username}`} />

      <div className="h-screen overflow-y-auto scroll-hidden bg-flockr-black">

        {/* Cover image */}
        <div className="relative h-40 md:h-56 bg-gradient-to-br from-flockr-orange/20 via-flockr-card to-flockr-surface overflow-hidden">
          {profileUser.cover_image && (
            <img src={profileUser.cover_image} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-flockr-black via-transparent to-transparent" />
        </div>

        {/* Profile info */}
        <div className="px-4 md:px-8 -mt-16 relative z-10">
          <div className="flex items-end justify-between mb-4">
            <div className="relative">
              <img
                src={profileUser.avatar_url ?? `https://ui-avatars.com/api/?name=${profileUser.name}&background=1a1a1a&size=128`}
                alt={profileUser.name}
                className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover ring-4 ring-flockr-black border border-white/10"
              />
              {profileUser.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-flockr-orange border-2 border-flockr-black flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pb-2">
              {isOwnProfile ? (
                <Link href="/settings/profile" className="btn-ghost text-sm py-2 px-5">Edit Profile</Link>
              ) : (
                <>
                  <button
                    onClick={handleFollow}
                    className={following ? 'btn-ghost text-sm py-2 px-5' : 'btn-primary text-sm py-2 px-5'}
                  >
                    {following ? 'Following' : 'Follow'}
                  </button>
                  <Link href={`/inbox?user=${profileUser.id}`} className="btn-ghost p-2.5">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Name / bio */}
          <div className="space-y-2">
            <div>
              <h1 className="font-display font-bold text-white text-xl">{profileUser.name}</h1>
              <p className="text-flockr-muted text-sm">@{profileUser.username}</p>
            </div>
            {profileUser.bio && (
              <p className="text-white/80 text-sm leading-relaxed max-w-md">{profileUser.bio}</p>
            )}
            {profileUser.location && (
              <p className="text-flockr-muted text-xs flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {profileUser.location}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-5 pb-5 border-b border-white/[0.06]">
            {[
              { label: 'Following',  value: profileUser.following_count },
              { label: 'Followers',  value: followersCount },
              { label: 'Videos',     value: videos?.length ?? 0 },
              ...(profileUser.role === 'seller' ? [{ label: 'Sales', value: profileUser.total_sales }] : []),
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="font-display font-bold text-white text-lg leading-tight">{formatCount(stat.value)}</p>
                <p className="text-flockr-muted text-xs">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mt-1 border-b border-white/[0.06]">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key ? 'tab-active text-white' : 'text-flockr-muted hover:text-white'
                }`}
              >
                {tab.label}
                {tab.count > 0 && <span className="ml-1.5 text-flockr-subtle text-xs">({tab.count})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-4 md:px-8 pt-4 pb-28 md:pb-8">
          {/* Videos grid */}
          {activeTab === 'videos' && (
            videos?.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                {videos.map(video => (
                  <Link key={video.id} href={`/video/${video.id}`} className="relative aspect-[9/16] rounded-lg overflow-hidden group bg-flockr-card">
                    {video.thumbnail_url_full
                      ? <img src={video.thumbnail_url_full} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="w-full h-full flex items-center justify-center text-flockr-subtle"><span className="text-2xl">🎬</span></div>
                    }
                    <div className="video-overlay absolute inset-0" />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-white/80 text-[10px]">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {formatCount(video.views_count)}
                    </div>
                    {video.is_for_sale && (
                      <div className="absolute top-1.5 right-1.5">
                        <span className="text-[9px] font-bold bg-flockr-orange rounded-full px-1.5 py-0.5 text-white">🛍</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                emoji="🎬"
                title={isOwnProfile ? "No videos yet" : "No videos yet"}
                sub={isOwnProfile ? "Upload your first video to start selling" : `${profileUser.name} hasn't uploaded any videos yet.`}
                cta={isOwnProfile ? { label: 'Upload Video', href: '/seller/upload' } : null}
              />
            )
          )}

          {/* Products grid */}
          {activeTab === 'products' && (
            products?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <EmptyState
                emoji="🛍"
                title="No products listed"
                sub={isOwnProfile ? "Add your first product to start selling" : `${profileUser.name} hasn't listed any products yet.`}
                cta={isOwnProfile ? { label: 'Add Product', href: '/seller/products/create' } : null}
              />
            )
          )}
        </div>
      </div>
    </>
  )
}

UserProfile.layout = page => <AppLayout>{page}</AppLayout>

function EmptyState({ emoji, title, sub, cta }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <span className="text-5xl">{emoji}</span>
      <p className="text-white font-display font-bold text-lg">{title}</p>
      <p className="text-flockr-muted text-sm text-center max-w-xs">{sub}</p>
      {cta && <Link href={cta.href} className="btn-primary text-sm py-2.5 px-6 mt-2">{cta.label}</Link>}
    </div>
  )
}

function formatCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n ?? 0)
}
