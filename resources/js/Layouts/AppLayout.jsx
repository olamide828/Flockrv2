import { Link, usePage } from '@inertiajs/react'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/',          icon: HomeIcon,     label: 'For You'  },
  { href: '/explore',   icon: SearchIcon,   label: 'Explore'  },
  { href: '/shop',      icon: ShopIcon,     label: 'Shop'     },
  { href: '/inbox',     icon: InboxIcon,    label: 'Inbox'    },
  { href: '/profile',   icon: ProfileIcon,  label: 'Profile'  },
]

export default function AppLayout({ children }) {
  const { auth }     = usePage().props
  const { url }      = usePage()
  const [search, setSearch] = useState('')

  return (
    <div className="flex h-screen bg-flockr-black overflow-hidden">

      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-[240px] border-r border-white/[0.06] bg-flockr-surface shrink-0 overflow-y-auto scroll-hidden">

        {/* Logo */}
        <div className="px-6 pt-7 pb-4 shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-display font-800 tracking-tight text-white group-hover:text-flockr-orange transition-colors">
              flockr
            </span>
            <span className="w-2 h-2 rounded-full bg-flockr-orange animate-pulse" />
          </Link>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-flockr-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search && (window.location.href = `/explore?q=${search}`)}
              placeholder="Search..."
              className="input-flockr pl-9 py-2.5 text-sm"
            />
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = url === href || (href !== '/' && url.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-medium transition-all duration-150 ${
                  active
                    ? 'bg-flockr-orange/10 text-flockr-orange font-semibold'
                    : 'text-flockr-muted hover:text-flockr-text hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Sell / Upload CTA */}
        {auth?.user?.role === 'seller' && (
          <div className="px-4 py-4 border-t border-white/[0.06]">
            <Link href="/seller/upload" className="btn-primary w-full text-center text-sm py-2.5 block">
              + Upload Video
            </Link>
          </div>
        )}

        {/* Auth / User */}
        <div className="px-4 py-4 border-t border-white/[0.06]">
          {auth?.user ? (
            <Link href="/profile" className="flex items-center gap-3 group">
              <img
                src={auth.user.avatar_url}
                alt={auth.user.name}
                className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-flockr-text truncate leading-tight">{auth.user.name}</p>
                <p className="text-xs text-flockr-muted truncate">@{auth.user.username}</p>
              </div>
            </Link>
          ) : (
            <div className="space-y-2">
              <Link href="/login"    className="btn-ghost w-full text-center text-sm py-2 block">Log in</Link>
              <Link href="/register" className="btn-primary w-full text-center text-sm py-2.5 block">Sign up</Link>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-hidden">
        {children}
      </main>

      {/* ── Mobile Top Bar ───────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 glass-dark">
        <Link href="/" className="font-display font-800 text-xl text-white">
          flockr<span className="text-flockr-orange">.</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/explore" className="p-2 text-flockr-muted hover:text-flockr-text">
            <SearchIcon className="w-5 h-5" />
          </Link>
          {auth?.user ? (
            <Link href="/profile">
              <img src={auth.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
            </Link>
          ) : (
            <Link href="/login" className="btn-primary text-xs py-1.5 px-4">Log in</Link>
          )}
        </div>
      </div>

      {/* ── Mobile Bottom Nav ────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-dark flex items-center justify-around px-2 py-2 safe-area-pb">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = url === href || (href !== '/' && url.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                active ? 'text-flockr-orange' : 'text-flockr-muted'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? '' : ''}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

// ── Icons ────────────────────────────────────────────────────────────────────
function HomeIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}
function SearchIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
    </svg>
  )
}
function ShopIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}
function InboxIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  )
}
function ProfileIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}
