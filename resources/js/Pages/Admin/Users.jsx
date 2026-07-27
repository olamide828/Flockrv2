import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import {
  RiSearchLine, RiUserLine, RiShieldLine, RiProhibitedLine,
  RiCheckboxCircleLine, RiDeleteBinLine, RiArrowLeftLine,
  RiStoreLine, RiGroupLine, RiVideoLine, RiShoppingBagLine,
  RiBankCardLine, RiAlertLine, RiBarChartLine, RiArrowRightLine,
} from 'react-icons/ri'

function AdminLayout({ children, active }) {
  const links = [
    { href: '/admin/dashboard',           icon: RiBarChartLine,    label: 'Overview'   },
    { href: '/admin/users',     icon: RiGroupLine,       label: 'Users'      },
    { href: '/admin/videos',    icon: RiVideoLine,       label: 'Videos'     },
    { href: '/admin/orders',    icon: RiShoppingBagLine, label: 'Orders'     },
    { href: '/admin/payouts',   icon: RiBankCardLine,    label: 'Payouts'    },
    { href: '/admin/reports',   icon: RiAlertLine,       label: 'Reports'    },
    { href: '/admin/analytics', icon: RiBarChartLine,    label: 'Analytics'  },
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

export default function AdminUsers({ users, filters = {} }) {
  const [search, setSearch]   = useState(filters.search ?? '')
  const [role,   setRole]     = useState(filters.role ?? '')
  const [loading, setLoading] = useState(null)
  const [toast,   setToast]   = useState(null)
  const [detail,        setDetail]        = useState(null)
const [detailLoading, setDetailLoading] = useState(false)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const doFilter = () => router.get('/admin/users', { search, role }, { preserveState: true })

  const toggleSuspend = async (user) => {
    setLoading(`suspend-${user.id}`)
    try {
      const { data } = await axios.post(`/api/admin/users/${user.id}/suspend`)
      showToast(data.message)
      router.reload()
    } catch { showToast('Failed', 'error') } finally { setLoading(null) }
  }

  const toggleVerify = async (user) => {
    setLoading(`verify-${user.id}`)
    try {
      const { data } = await axios.post(`/api/admin/users/${user.id}/verify`)
      showToast(data.message)
      router.reload()
    } catch { showToast('Failed', 'error') } finally { setLoading(null) }
  }

  const openDetail = async (user) => {
    setDetail({ ...user, login_history: [] }) // show basics immediately
    setDetailLoading(true)
    try {
        const { data } = await axios.get(`/api/admin/users/${user.id}/details`)
        setDetail({ ...data.user, login_history: data.login_history })
    } catch {
        showToast('Failed to load user details', 'error')
    } finally {
        setDetailLoading(false)
    }
}

  const changeRole = async (user, newRole) => {
    setLoading(`role-${user.id}`)
    try {
      const { data } = await axios.post(`/api/admin/users/${user.id}/role`, { role: newRole })
      showToast(data.message)
      router.reload()
    } catch { showToast('Failed', 'error') } finally { setLoading(null) }
  }

  const deleteUser = async (user) => {
    if (!confirm(`Delete @${user.username}? This cannot be undone.`)) return
    setLoading(`delete-${user.id}`)
    try {
      await axios.delete(`/api/admin/users/${user.id}`)
      showToast('User deleted')
      router.reload()
    } catch { showToast('Failed', 'error') } finally { setLoading(null) }
  }

  const list = users?.data ?? users ?? []

  return (
    <AdminLayout active="/admin/users">
      <Head title="Admin · Users" />
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: toast.type === 'error' ? '#EF4444' : '#10B981', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600, pointerEvents: 'none' }}>
          {toast.msg}
        </div>
      )}

      {detail && (
    <>
        <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)' }} />
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, zIndex: 101, background: '#111', borderLeft: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>User Details</h3>
                <button onClick={() => setDetail(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>✕</button>
            </div>

            {/* Profile header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: 14, marginBottom: 16 }}>
                <img src={detail.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(detail.name ?? 'U')}&background=222`} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{detail.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>@{detail.username}</p>
                </div>
                <Link href={`/@${detail.username}`} target="_blank" style={{ color: '#FF6B35', fontSize: 12, textDecoration: 'none', flexShrink: 0 }}>Profile →</Link>
            </div>

            {detailLoading && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Loading details…</p>}

            {!detailLoading && (
                <>
                    {/* Status badges */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: detail.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: detail.is_active ? '#10B981' : '#EF4444' }}>
                            {detail.is_active ? 'Active' : 'Banned'}
                        </span>
                        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>{detail.role}</span>
                        {detail.is_verified && <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>Verified badge</span>}
                        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: detail.email_verified_at ? 'rgba(16,185,129,0.12)' : 'rgba(234,179,8,0.12)', color: detail.email_verified_at ? '#10B981' : '#EAB308' }}>
                            {detail.email_verified_at ? 'Email verified' : 'Email unverified'}
                        </span>
                    </div>

                    {/* Contact info */}
                    <div style={{ marginBottom: 16 }}>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Contact</p>
                        <DetailRow label="Email" value={detail.email} />
                        <DetailRow label="Phone" value={detail.phone ?? '—'} />
                        <DetailRow label="Location" value={detail.location ?? '—'} />
                        {detail.bio && <DetailRow label="Bio" value={detail.bio} />}
                    </div>

                    {/* Stats */}
                    <div style={{ marginBottom: 16 }}>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Account Stats</p>
                        <DetailRow label="Followers" value={detail.followers_count ?? 0} />
                        <DetailRow label="Following" value={detail.following_count ?? 0} />
                        {detail.role === 'seller' && <DetailRow label="Total sales" value={`₦${Number(detail.total_sales ?? 0).toLocaleString()}`} />}
                        <DetailRow label="Wallet balance" value={`₦${Number(detail.wallet_balance ?? 0).toLocaleString()}`} />
                        <DetailRow label="Joined" value={new Date(detail.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })} />
                        <DetailRow label="Last seen" value={detail.last_seen_at ? new Date(detail.last_seen_at).toLocaleString('en-NG') : '—'} />
                    </div>

                    {/* Bank info — sellers only, no full account number ever shown */}
                    {detail.bank_name && (
                        <div style={{ marginBottom: 16 }}>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Bank Details</p>
                            <DetailRow label="Bank" value={detail.bank_name} />
                            <DetailRow label="Account name" value={detail.account_name ?? '—'} />
                            <DetailRow label="Account" value={detail.account_last4 ? `••••${detail.account_last4}` : '—'} />
                        </div>
                    )}

                    {/* Login history / devices */}
                    <div style={{ marginBottom: 16 }}>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Recent Logins</p>
                        {detail.login_history?.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {detail.login_history.map(h => (
                                    <div key={h.id} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, fontSize: 12 }}>
                                        <p style={{ margin: 0, color: '#fff', fontWeight: 600 }}>
                                            {h.browser ?? 'Unknown'} · {h.platform ?? 'Unknown OS'} · {h.device_type ?? 'unknown'}
                                        </p>
                                        <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.4)' }}>
                                            {[h.city, h.region, h.country].filter(Boolean).join(', ') || 'Unknown location'} · {h.ip_address}
                                        </p>
                                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
                                            {new Date(h.created_at).toLocaleString('en-NG')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>No login history recorded.</p>
                        )}
                    </div>

                    {/* Quick actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button onClick={() => toggleVerify(detail)} disabled={loading === `verify-${detail.id}`}
                            style={{ padding: '11px', borderRadius: 12, background: detail.is_verified ? 'rgba(234,179,8,0.1)' : 'rgba(59,130,246,0.1)', border: `1px solid ${detail.is_verified ? 'rgba(234,179,8,0.25)' : 'rgba(59,130,246,0.25)'}`, color: detail.is_verified ? '#EAB308' : '#3B82F6', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                            {detail.is_verified ? 'Remove verified badge' : 'Grant verified badge'}
                        </button>
                        <button onClick={() => toggleSuspend(detail)} disabled={loading === `suspend-${detail.id}`}
                            style={{ padding: '11px', borderRadius: 12, background: detail.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${detail.is_active ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`, color: detail.is_active ? '#EF4444' : '#10B981', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                            {detail.is_active ? 'Ban this user' : 'Unban this user'}
                        </button>
                    </div>
                </>
            )}
        </div>
    </>
)}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>User Management</h1>
        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{users?.total ?? list.length} users</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <RiSearchLine size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doFilter()} placeholder="Search name, email, username..." style={{ width: '100%', height: 40, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, paddingLeft: 36, paddingRight: 12, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={role} onChange={e => { setRole(e.target.value); setTimeout(doFilter, 50) }} style={{ height: 40, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '0 14px', color: '#fff', fontSize: 13, outline: 'none' }}>
          <option value="">All roles</option>
          <option value="buyer">Buyers</option>
          <option value="seller">Sellers</option>
          <option value="admin">Admins</option>
        </select>
        <button onClick={doFilter} style={{ height: 40, padding: '0 18px', background: '#FF6B35', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Search</button>
      </div>

      {/* Table */}
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < list.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={u.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=222`} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{u.name}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <select value={u.role} onChange={e => changeRole(u, e.target.value)} disabled={loading === `role-${u.id}`} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 8px', color: '#fff', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
                      <option value="buyer">buyer</option>
                      <option value="seller">seller</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: u.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: u.is_active ? '#10B981' : '#EF4444' }}>
                        {u.is_active ? 'Active' : 'Banned'}
                      </span>
                      {u.is_verified && <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>Verified</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                    {new Date(u.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      
<button onClick={() => openDetail(u)} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>View</button>
                      <button onClick={() => toggleVerify(u)} disabled={loading === `verify-${u.id}`} style={{ padding: '5px 10px', borderRadius: 8, background: u.is_verified ? 'rgba(234,179,8,0.1)' : 'rgba(59,130,246,0.1)', border: `1px solid ${u.is_verified ? 'rgba(234,179,8,0.25)' : 'rgba(59,130,246,0.25)'}`, color: u.is_verified ? '#EAB308' : '#3B82F6', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        {u.is_verified ? 'Unverify' : 'Verify'}
                      </button>
                      <button onClick={() => toggleSuspend(u)} disabled={loading === `suspend-${u.id}`} style={{ padding: '5px 10px', borderRadius: 8, background: u.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${u.is_active ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`, color: u.is_active ? '#EF4444' : '#10B981', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        {u.is_active ? 'Ban' : 'Unban'}
                      </button>
                      <button onClick={() => deleteUser(u)} disabled={loading === `delete-${u.id}`} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {users?.last_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px' }}>
            {Array.from({ length: users.last_page }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => router.get('/admin/users', { ...filters, page: p })} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: users.current_page === p ? '#FF6B35' : 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function DetailRow({ label, value }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{label}</span>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
        </div>
    )
}