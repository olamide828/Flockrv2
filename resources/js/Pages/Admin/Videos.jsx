import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import {
  RiSearchLine, RiVideoLine, RiCheckboxCircleLine, RiCloseLine,
  RiEyeLine, RiHeartLine, RiChat1Line, RiLoader4Line,
  RiGroupLine, RiShoppingBagLine, RiBankCardLine, RiAlertLine,
  RiBarChartLine, RiArrowRightLine, RiPlayCircleLine,
} from 'react-icons/ri'

function AdminLayout({ children, active }) {
  const links = [
    { href: '/admin',           icon: RiBarChartLine,    label: 'Overview'  },
    { href: '/admin/users',     icon: RiGroupLine,       label: 'Users'     },
    { href: '/admin/videos',    icon: RiVideoLine,       label: 'Videos'    },
    { href: '/admin/orders',    icon: RiShoppingBagLine, label: 'Orders'    },
    { href: '/admin/payouts',   icon: RiBankCardLine,    label: 'Payouts'   },
    { href: '/admin/reports',   icon: RiAlertLine,       label: 'Reports'   },
    { href: '/admin/analytics', icon: RiBarChartLine,    label: 'Analytics' },
  ]
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: '"DM Sans", sans-serif', display: 'flex' }}>
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '8px 14px 20px' }}>
          <p style={{ margin: 0, color: '#FF6B35', fontWeight: 800, fontSize: 18 }}>Flockr</p>
          <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Admin Panel</p>
        </div>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, textDecoration: 'none', background: active === l.href ? 'rgba(255,107,53,0.12)' : 'transparent', color: active === l.href ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontWeight: active === l.href ? 600 : 400, fontSize: 14 }}>
            <l.icon size={18} />{l.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, textDecoration: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            <RiArrowRightLine size={18} /> Back to App
          </Link>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '32px' }}>{children}</div>
    </div>
  )
}

const STATUS_COLOR = {
  active:     { bg: 'rgba(16,185,129,0.12)',  text: '#10B981' },
  pending:    { bg: 'rgba(234,179,8,0.12)',   text: '#EAB308' },
  processing: { bg: 'rgba(139,92,246,0.12)', text: '#8B5CF6' },
  failed:     { bg: 'rgba(239,68,68,0.12)',   text: '#EF4444' },
  archived:   { bg: 'rgba(156,163,175,0.12)', text: '#9CA3AF' },
}

function fmt(n) {
  const num = Number(n ?? 0)
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'K'
  return String(num)
}

export default function AdminVideos({ videos, filters = {} }) {
  const [search,   setSearch]   = useState(filters.search ?? '')
  const [status,   setStatus]   = useState(filters.status ?? '')
  const [loading,  setLoading]  = useState(null)
  const [toast,    setToast]    = useState(null)
  const [selected, setSelected] = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const doFilter = () => router.get('/admin/videos', { search, status }, { preserveState: true })

  const approve = async (id) => {
    setLoading(`approve-${id}`)
    try {
      const { data } = await axios.post(`/api/admin/videos/${id}/approve`)
      showToast(data.message)
      router.reload()
    } catch { showToast('Failed', 'error') } finally { setLoading(null) }
  }

  const reject = async (id) => {
    const reason = prompt('Rejection reason (shown to seller):')
    if (!reason) return
    setLoading(`reject-${id}`)
    try {
      const { data } = await axios.post(`/api/admin/videos/${id}/reject`, { reason })
      showToast(data.message)
      router.reload()
    } catch { showToast('Failed', 'error') } finally { setLoading(null) }
  }

  const feature = async (id) => {
    setLoading(`feature-${id}`)
    try {
      const { data } = await axios.post(`/api/admin/videos/${id}/feature`)
      showToast(data.message)
      router.reload()
    } catch { showToast('Failed', 'error') } finally { setLoading(null) }
  }

  const list = videos?.data ?? videos ?? []

  return (
    <AdminLayout active="/admin/videos">
      <Head title="Admin · Videos" />

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: toast.type === 'error' ? '#EF4444' : '#10B981', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600, pointerEvents: 'none' }}>
          {toast.msg}
        </div>
      )}

      {/* Video preview modal */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 101, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, overflow: 'hidden', width: 340 }}>
            <div style={{ position: 'relative', aspectRatio: '9/16' }}>
              <video src={selected.video_stream_url ?? selected.video_url} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ padding: '14px 16px' }}>
              <p style={{ margin: 0, fontWeight: 700 }}>{selected.title || 'Untitled'}</p>
              <p style={{ margin: '4px 0 8px', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>@{selected.user?.username}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { approve(selected.id); setSelected(null) }} style={{ flex: 1, padding: '10px', borderRadius: 12, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Approve</button>
                <button onClick={() => { reject(selected.id); setSelected(null) }} style={{ flex: 1, padding: '10px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Reject</button>
                <button onClick={() => setSelected(null)} style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer' }}><RiCloseLine size={16} /></button>
              </div>
            </div>
          </div>
        </>
      )}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Video Moderation</h1>
        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{videos?.total ?? list.length} videos</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <RiSearchLine size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doFilter()} placeholder="Search title or username..." style={{ width: '100%', height: 40, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, paddingLeft: 36, paddingRight: 12, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setTimeout(doFilter, 50) }} style={{ height: 40, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '0 14px', color: '#fff', fontSize: 13, outline: 'none' }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
          <option value="archived">Archived</option>
        </select>
        <button onClick={doFilter} style={{ height: 40, padding: '0 18px', background: '#FF6B35', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Filter</button>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {list.map(v => {
          const sc = STATUS_COLOR[v.status] ?? {}
          return (
            <div key={v.id} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, overflow: 'hidden' }}>
              {/* Thumbnail */}
              <div style={{ position: 'relative', aspectRatio: '9/16', cursor: 'pointer' }} onClick={() => setSelected(v)}>
                {v.thumbnail_url_full
                  ? <img src={v.thumbnail_url_full} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiPlayCircleLine size={32} color="rgba(255,255,255,0.2)" /></div>
                }
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent 50%)' }} />
                <div style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.text }}>{v.status}</div>
                {v.is_featured && <div style={{ position: 'absolute', top: 8, right: 8, padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(255,107,53,0.9)', color: '#fff' }}>Featured</div>}
                <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#fff', fontSize: 11 }}><RiEyeLine size={12} />{fmt(v.views_count)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#fff', fontSize: 11 }}><RiHeartLine size={12} />{fmt(v.likes_count)}</span>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: '10px 12px' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title || 'Untitled'}</p>
                <p style={{ margin: '2px 0 8px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>@{v.user?.username}</p>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {v.status === 'pending' && (
                    <>
                      <button onClick={() => approve(v.id)} disabled={loading === `approve-${v.id}`} style={{ flex: 1, padding: '6px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        {loading === `approve-${v.id}` ? '...' : '✓ Approve'}
                      </button>
                      <button onClick={() => reject(v.id)} disabled={loading === `reject-${v.id}`} style={{ flex: 1, padding: '6px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        ✕ Reject
                      </button>
                    </>
                  )}
                  {v.status === 'active' && (
                    <button onClick={() => reject(v.id)} style={{ flex: 1, padding: '6px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Remove</button>
                  )}
                  <button onClick={() => feature(v.id)} disabled={loading === `feature-${v.id}`} style={{ padding: '6px 10px', borderRadius: 8, background: v.is_featured ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${v.is_featured ? 'rgba(255,107,53,0.3)' : 'rgba(255,255,255,0.08)'}`, color: v.is_featured ? '#FF6B35' : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {v.is_featured ? '★ Unfeature' : '☆ Feature'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
          <RiVideoLine size={40} style={{ marginBottom: 12 }} />
          <p>No videos found</p>
        </div>
      )}

      {/* Pagination */}
      {videos?.last_page > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '24px 0' }}>
          {Array.from({ length: Math.min(videos.last_page, 10) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => router.get('/admin/videos', { ...filters, page: p })} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: videos.current_page === p ? '#FF6B35' : 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>{p}</button>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}