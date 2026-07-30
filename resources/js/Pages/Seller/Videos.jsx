import AppLayout from '@/Layouts/AppLayout'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import Toast, { useToast } from '@/Components/Toast'
import {
    RiAddLine, RiArrowLeftLine, RiDeleteBinLine, RiEditLine,
    RiEyeLine, RiHeartLine, RiChat1Line, RiLoader4Line,
    RiPlayCircleLine, RiUploadCloud2Line, RiVideoLine,
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
    active:     { bg: 'rgba(16,185,129,0.12)',  text: '#10B981', label: 'Active'      },
    processing: { bg: 'rgba(139,92,246,0.12)',  text: '#8B5CF6', label: 'Processing'  },
    draft:      { bg: 'rgba(234,179,8,0.12)',   text: '#EAB308', label: 'Draft'       },
    failed:     { bg: 'rgba(239,68,68,0.12)',   text: '#EF4444', label: 'Failed'      },
    inactive:   { bg: 'rgba(156,163,175,0.12)', text: '#9CA3AF', label: 'Inactive'    },
}

function Pagination({ pagination, onNavigate }) {
    if (!pagination?.links || pagination.last_page <= 1) return null
    return (
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6, padding: '24px 0 4px' }}>
            {pagination.links.map((link, i) => (
                <button
                    key={i}
                    type="button"
                    disabled={!link.url}
                    onClick={() => link.url && onNavigate(link.url)}
                    style={{
                        minWidth: 34, height: 34, padding: '0 10px', borderRadius: 10,
                        border: link.active ? '1px solid rgba(255,107,53,0.4)' : '1px solid rgba(255,255,255,0.08)',
                        background: link.active ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.03)',
                        color: link.active ? '#FF6B35' : (link.url ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)'),
                        fontSize: 12, fontWeight: 700, cursor: link.url ? 'pointer' : 'not-allowed',
                    }}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>
    )
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────
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
                    This will permanently delete <strong style={{ color: '#fff' }}>"{video.title ?? 'Untitled'}"</strong> and all its data. This cannot be undone.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                    {[
                        { Icon: RiEyeLine,   value: formatCount(video.views_count),   label: 'Views'    },
                        { Icon: RiHeartLine, value: formatCount(video.likes_count),   label: 'Likes'    },
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
                    <button onClick={onCancel} disabled={deleting} style={{ flex: 1, padding: '13px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: '13px', borderRadius: 999, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 14, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: deleting ? 0.7 : 1 }}>
                        {deleting ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(239,68,68,0.3)', borderTopColor: '#EF4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Deleting…</> : <><RiDeleteBinLine size={14} /> Delete</>}
                    </button>
                </div>
            </div>
        </>
    )
}

// ── Video Card ────────────────────────────────────────────────────────────────
function VideoCard({ video, onDeleteClick }) {
    const status = STATUS_STYLE[video.status] ?? STATUS_STYLE.inactive

    return (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
        >
            <div style={{ position: 'relative', aspectRatio: '9/16', maxHeight: 240, background: '#1a1a1a', overflow: 'hidden' }}>
                {video.thumbnail_url_full
                    ? <img src={video.thumbnail_url_full} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiPlayCircleLine size={32} color="rgba(255,255,255,0.2)" /></div>
                }
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)' }} />

                <div style={{ position: 'absolute', top: 10, left: 10 }}>
                    <span style={{ background: status.bg, color: status.text, borderRadius: 999, padding: '3px 8px', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {video.status === 'processing' && <RiLoader4Line size={10} style={{ animation: 'spin 1s linear infinite' }} />}
                        {status.label}
                    </span>
                </div>

                <div style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RiEyeLine size={11} color="rgba(255,255,255,0.7)" />
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>{formatCount(video.views_count)}</span>
                </div>

                <Link href={`/@${video.user?.username}/video/${video.ulid}`} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', background: 'rgba(0,0,0,0.3)' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                >
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RiPlayCircleLine size={22} color="#fff" />
                    </div>
                </Link>
            </div>

            <div style={{ padding: '14px 14px 12px' }}>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {video.title ?? 'Untitled'}
                </p>

                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    {[
                        { Icon: RiHeartLine, value: formatCount(video.likes_count)    },
                        { Icon: RiChat1Line, value: formatCount(video.comments_count) },
                    ].map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <s.Icon size={12} color="rgba(255,255,255,0.35)" />
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{s.value}</span>
                        </div>
                    ))}
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginLeft: 'auto' }}>{timeAgo(video.published_at ?? video.created_at)}</span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <Link
                        href={`/seller/videos/${video.ulid}/edit`}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s' }}
                    >
                        <RiEditLine size={13} /> Edit
                    </Link>
                    <button
                        onClick={() => onDeleteClick(video)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                    >
                        <RiDeleteBinLine size={13} /> Delete
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SellerVideos({ videos: initialVideos = { data: [] } }) {
    const [pagination, setPagination] = useState(initialVideos)
    const videos = pagination.data ?? []
    const [deleteTarget,  setDeleteTarget]  = useState(null)
    const [deleting,      setDeleting]      = useState(false)
    const [filter,        setFilter]        = useState('all')
    const { showToast, ToastComponent } = useToast()

    const filteredVideos = filter === 'all'
        ? videos
        : videos.filter(v => v.status === filter)

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await axios.delete(`/api/videos/${deleteTarget.ulid}`)
            setPagination(prev => ({ ...prev, data: (prev.data ?? []).filter(v => v.id !== deleteTarget.id) }))
            showToast('Video deleted.', 'success')
            setDeleteTarget(null)
        } catch {
            showToast('Failed to delete video. Please try again.', 'error')
        } finally {
            setDeleting(false)
        }
    }

    const goToPage = (url) => {
        router.get(url, {}, {
            preserveState: true,
            preserveScroll: true,
            only: ['videos'],
            onSuccess: (page) => setPagination(page.props.videos),
        })
    }

    const FILTERS = [
        { value: 'all',        label: 'All',        count: videos.length },
        { value: 'active',     label: 'Active',     count: videos.filter(v => v.status === 'active').length },
        { value: 'processing', label: 'Processing', count: videos.filter(v => v.status === 'processing').length },
        { value: 'draft',      label: 'Draft',      count: videos.filter(v => v.status === 'draft').length },
    ]

    return (
        <>
            <Head title="My Videos" />

            <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>

                <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px' }}>
                    <div style={{ maxWidth: 1100, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button type="button" onClick={() => window.history.back()} style={iconBtn} aria-label="Go back"><RiArrowLeftLine size={18} /></button>
                        <div style={{ flex: 1 }}>
                            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>My Videos</h1>
                            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{pagination.total ?? videos.length} video{(pagination.total ?? videos.length) !== 1 ? 's' : ''}</p>
                        </div>
                        <Link href="/seller/upload" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 999, background: '#FF6B35', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                            <RiAddLine size={16} /> Upload
                        </Link>
                    </div>
                </header>

                <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 80px' }}>

                    {videos.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
                            {[
                                { label: 'Total Views',    value: formatCount(videos.reduce((s, v) => s + (v.views_count ?? 0), 0)),    Icon: RiEyeLine,        color: '#3B82F6' },
                                { label: 'Total Likes',    value: formatCount(videos.reduce((s, v) => s + (v.likes_count ?? 0), 0)),    Icon: RiHeartLine,      color: '#EF4444' },
                                { label: 'Total Comments', value: formatCount(videos.reduce((s, v) => s + (v.comments_count ?? 0), 0)), Icon: RiChat1Line,      color: '#10B981' },
                                { label: 'Active Videos',  value: videos.filter(v => v.status === 'active').length,                     Icon: RiVideoLine,      color: '#FF6B35' },
                            ].map(s => (
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
                    )}

                    {videos.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', scrollbarWidth: 'none' }}>
                            {FILTERS.filter(f => f.count > 0 || f.value === 'all').map(f => (
                                <button key={f.value} onClick={() => setFilter(f.value)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, border: `1px solid ${filter === f.value ? 'rgba(255,107,53,0.5)' : 'rgba(255,255,255,0.08)'}`, background: filter === f.value ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.03)', color: filter === f.value ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    {f.label}
                                    <span style={{ background: filter === f.value ? '#FF6B35' : 'rgba(255,255,255,0.08)', color: filter === f.value ? '#fff' : 'rgba(255,255,255,0.4)', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{f.count}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {filteredVideos.length === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16, textAlign: 'center' }}>
                            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <RiVideoLine size={30} color="rgba(255,255,255,0.2)" />
                            </div>
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: 0 }}>{filter === 'all' ? 'No videos yet' : `No ${filter} videos`}</p>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>Upload your first video to grow your audience.</p>
                            {filter === 'all' && (
                                <Link href="/seller/upload" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '11px 24px', borderRadius: 999, background: '#FF6B35', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
                                    <RiUploadCloud2Line size={16} /> Upload first video
                                </Link>
                            )}
                        </div>
                    )}

                    {filteredVideos.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                            {filteredVideos.map(video => (
                                <VideoCard
                                    key={video.id}
                                    video={video}
                                    onDeleteClick={setDeleteTarget}
                                />
                            ))}
                        </div>
                    )}

                    {filter === 'all' && <Pagination pagination={pagination} onNavigate={goToPage} />}
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

            {ToastComponent}

            <style>{`
                @keyframes spin    { to { transform: rotate(360deg); } }
                @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translate(-50%, -44%); } to { opacity: 1; transform: translate(-50%, -50%); } }
            `}</style>
        </>
    )
}

SellerVideos.layout = page => <AppLayout>{page}</AppLayout>

const iconBtn = {
    width: 36, height: 36, borderRadius: 10,
    background: 'rgba(255,255,255,0.06)', border: 'none',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#fff', flexShrink: 0,
    textDecoration: 'none',
}