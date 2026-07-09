import AppLayout from '@/Layouts/AppLayout'
import { Head, Link } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import {
    RiArrowLeftLine, RiChat1Line, RiCheckLine,
    RiCloseCircleLine, RiDeleteBinLine, RiEyeLine,
    RiHeartLine, RiLoader4Line, RiPlayCircleLine,
    RiSearchLine, RiShieldCheckLine, RiVideoLine,
    RiUserLine, RiTimeLine,
} from 'react-icons/ri'

function formatCount(n) {
    if (!n) return '0'
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
    return String(n)
}

function timeAgo(dateStr) {
    if (!dateStr) return ''
    const diff = (Date.now() - new Date(dateStr)) / 1000
    if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_STYLE = {
    active:     { bg: 'rgba(16,185,129,0.12)',  text: '#10B981', label: 'Active'     },
    processing: { bg: 'rgba(139,92,246,0.12)',  text: '#8B5CF6', label: 'Processing' },
    draft:      { bg: 'rgba(234,179,8,0.12)',   text: '#EAB308', label: 'Draft'      },
    failed:     { bg: 'rgba(239,68,68,0.12)',   text: '#EF4444', label: 'Failed'     },
    inactive:   { bg: 'rgba(156,163,175,0.12)', text: '#9CA3AF', label: 'Inactive'   },
}

// ── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({ video, onConfirm, onCancel, deleting }) {
    return (
        <>
            <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(400px, 90vw)', background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 28, zIndex: 101, animation: 'slideUp 0.25s ease' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <RiDeleteBinLine size={24} color="#EF4444" />
                </div>
                <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>Delete Video?</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 20px', textAlign: 'center', lineHeight: 1.5 }}>
                    Permanently delete <strong style={{ color: '#fff' }}>"{video.title ?? 'Untitled'}"</strong> by <strong style={{ color: '#fff' }}>@{video.user?.username}</strong>?
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                    {[
                        { Icon: RiEyeLine,   value: formatCount(video.views_count),    label: 'Views'    },
                        { Icon: RiHeartLine, value: formatCount(video.likes_count),    label: 'Likes'    },
                        { Icon: RiChat1Line, value: formatCount(video.comments_count), label: 'Comments' },
                    ].map(s => (
                        <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                            <s.Icon size={14} color="rgba(255,255,255,0.3)" style={{ display: 'block', margin: '0 auto 4px' }} />
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{s.value}</p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: '2px 0 0' }}>{s.label}</p>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onCancel} disabled={deleting} style={{ flex: 1, padding: '13px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: '13px', borderRadius: 999, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 14, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {deleting ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(239,68,68,0.3)', borderTopColor: '#EF4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Deleting…</> : <><RiDeleteBinLine size={14} /> Delete</>}
                    </button>
                </div>
            </div>
        </>
    )
}

// ── Video Row ─────────────────────────────────────────────────────────────────
function VideoRow({ video, onDelete, onToggleStatus }) {
    const status = STATUS_STYLE[video.status] ?? STATUS_STYLE.inactive

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
            {/* Thumbnail */}
            <div style={{ width: 60, height: 84, borderRadius: 10, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0 }}>
                {video.thumbnail_url_full
                    ? <img src={video.thumbnail_url_full} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiPlayCircleLine size={20} color="rgba(255,255,255,0.2)" /></div>
                }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {video.title ?? 'Untitled'}
                    </p>
                    <span style={{ background: status.bg, color: status.text, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{status.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <img src={video.user?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(video.user?.name ?? 'U')}&background=111`} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>@{video.user?.username}</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>·</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{timeAgo(video.published_at ?? video.created_at)}</span>
                </div>
                <div style={{ display: 'flex', gap: 14 }}>
                    {[
                        { Icon: RiEyeLine,   v: formatCount(video.views_count)    },
                        { Icon: RiHeartLine, v: formatCount(video.likes_count)    },
                        { Icon: RiChat1Line, v: formatCount(video.comments_count) },
                    ].map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <s.Icon size={12} color="rgba(255,255,255,0.3)" />
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{s.v}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                    onClick={() => onToggleStatus(video)}
                    title={video.status === 'active' ? 'Deactivate' : 'Activate'}
                    style={{ width: 34, height: 34, borderRadius: 10, background: video.status === 'active' ? 'rgba(234,179,8,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${video.status === 'active' ? 'rgba(234,179,8,0.25)' : 'rgba(16,185,129,0.25)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: video.status === 'active' ? '#EAB308' : '#10B981' }}
                >
                    {video.status === 'active' ? <RiCloseCircleLine size={15} /> : <RiCheckLine size={15} />}
                </button>
                <Link href={`/@${video.user?.username}/video/${video.ulid}`} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                    <RiEyeLine size={15} />
                </Link>
                <button
                    onClick={() => onDelete(video)}
                    style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}
                >
                    <RiDeleteBinLine size={15} />
                </button>
            </div>
        </div>
    )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminVideos({ videos: initialVideos = [] }) {
    const [videos, setVideos] = useState(initialVideos.data ?? [])
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting,     setDeleting]     = useState(false)
    const [search,       setSearch]       = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    const filtered = videos.filter(v => {
        const matchSearch = !search.trim() ||
            v.title?.toLowerCase().includes(search.toLowerCase()) ||
            v.user?.username?.toLowerCase().includes(search.toLowerCase()) ||
            v.user?.name?.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || v.status === statusFilter
        return matchSearch && matchStatus
    })

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await axios.delete(`/api/admin/videos/${deleteTarget.ulid}`)
            setVideos(prev => prev.filter(v => v.id !== deleteTarget.id))
            setDeleteTarget(null)
        } catch {
            alert('Failed to delete. Try again.')
        } finally {
            setDeleting(false)
        }
    }

    const handleToggleStatus = async (video) => {
        const newStatus = video.status === 'active' ? 'inactive' : 'active'
        try {
            await axios.patch(`/api/admin/videos/${video.ulid}/status`, { status: newStatus })
            setVideos(prev => prev.map(v => v.id === video.id ? { ...v, status: newStatus } : v))
        } catch {
            alert('Failed to update status.')
        }
    }

    const globalStats = [
        { label: 'Total Videos',  value: videos.length,                                               Icon: RiVideoLine,  color: '#FF6B35' },
        { label: 'Total Views',   value: formatCount(videos.reduce((s, v) => s + (v.views_count ?? 0), 0)),    Icon: RiEyeLine,    color: '#3B82F6' },
        { label: 'Total Likes',   value: formatCount(videos.reduce((s, v) => s + (v.likes_count ?? 0), 0)),    Icon: RiHeartLine,  color: '#EF4444' },
        { label: 'Active Videos', value: videos.filter(v => v.status === 'active').length,            Icon: RiCheckLine,  color: '#10B981' },
    ]

    const FILTERS = ['all', 'active', 'processing', 'draft', 'failed', 'inactive']

    return (
        <>
            <Head title="Admin · Videos" />

            <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>

                {/* Header */}
                <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px' }}>
                    <div style={{ maxWidth: 1100, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <Link href="/admin/dashboard" style={iconBtn}><RiArrowLeftLine size={18} /></Link>
                        <div style={{ flex: 1 }}>
                            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Video Management</h1>
                            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{filtered.length} of {videos.length} videos</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '0 12px', height: 38, width: 220 }}>
                            <RiSearchLine size={14} color="rgba(255,255,255,0.3)" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search videos or users…" style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, width: '100%' }} />
                        </div>
                    </div>
                </header>

                <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 80px' }}>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                        {globalStats.map(s => (
                            <div key={s.label} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 11, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <s.Icon size={17} color={s.color} />
                                </div>
                                <div>
                                    <p style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: 0 }}>{s.value}</p>
                                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '1px 0 0' }}>{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Filter chips */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
                        {FILTERS.map(f => {
                            const count = f === 'all' ? videos.length : videos.filter(v => v.status === f).length
                            if (count === 0 && f !== 'all') return null
                            return (
                                <button key={f} onClick={() => setStatusFilter(f)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, border: `1px solid ${statusFilter === f ? 'rgba(255,107,53,0.5)' : 'rgba(255,255,255,0.08)'}`, background: statusFilter === f ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.03)', color: statusFilter === f ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                                    {f}
                                    <span style={{ background: statusFilter === f ? '#FF6B35' : 'rgba(255,255,255,0.08)', color: statusFilter === f ? '#fff' : 'rgba(255,255,255,0.4)', borderRadius: 999, fontSize: 10, padding: '1px 6px' }}>{count}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Table */}
                    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
                        {filtered.length === 0 ? (
                            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                                <RiVideoLine size={32} color="rgba(255,255,255,0.15)" style={{ display: 'block', margin: '0 auto 12px' }} />
                                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, margin: 0 }}>No videos found</p>
                            </div>
                        ) : filtered.map(video => (
                            <VideoRow
                                key={video.id}
                                video={video}
                                onDelete={setDeleteTarget}
                                onToggleStatus={handleToggleStatus}
                            />
                        ))}
                    </div>
                </main>
            </div>

            {deleteTarget && (
                <DeleteModal
                    video={deleteTarget}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                    deleting={deleting}
                />
            )}

            <style>{`
                @keyframes spin    { to { transform: rotate(360deg); } }
                @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translate(-50%, -44%); } to { opacity: 1; transform: translate(-50%, -50%); } }
            `}</style>
        </>
    )
}

AdminVideos.layout = page => <AppLayout>{page}</AppLayout>

const iconBtn = {
    width: 36, height: 36, borderRadius: 10,
    background: 'rgba(255,255,255,0.06)', border: 'none',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#fff', flexShrink: 0,
    textDecoration: 'none',
}