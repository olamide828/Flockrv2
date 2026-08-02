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

const STATUS_LABEL = {
    active:     'Live',
    processing: 'Processing',
    draft:      'Draft',
    failed:     'Failed',
    inactive:   'Inactive',
}

function Pagination({ pagination, onNavigate }) {
    if (!pagination?.links || pagination.last_page <= 1) return null
    return (
        <div className="vv-pg-row">
            {pagination.links.map((link, i) => (
                <button
                    key={i}
                    type="button"
                    disabled={!link.url}
                    onClick={() => link.url && onNavigate(link.url)}
                    className={`vv-pg-btn ${link.active ? 'vv-pg-active' : ''}`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>
    )
}

function DeleteModal({ video, onConfirm, onCancel, deleting }) {
    return (
        <>
            <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', animation: 'vvFadeIn 0.2s ease' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(400px, 90vw)', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 26, zIndex: 101, animation: 'vvSlideUp 0.25s ease' }}>

                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                    <RiDeleteBinLine size={22} color="#EF4444" />
                </div>

                <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>Delete Video?</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 20px', textAlign: 'center', lineHeight: 1.5 }}>
                    This will permanently delete <strong style={{ color: '#fff' }}>"{video.title ?? 'Untitled'}"</strong> and all its data. This cannot be undone.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 22 }}>
                    {[
                        { Icon: RiEyeLine,   value: formatCount(video.views_count),   label: 'Views'    },
                        { Icon: RiHeartLine, value: formatCount(video.likes_count),   label: 'Likes'    },
                        { Icon: RiChat1Line, value: formatCount(video.comments_count), label: 'Comments' },
                    ].map(s => (
                        <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                            <s.Icon size={13} color="rgba(255,255,255,0.3)" style={{ display: 'block', margin: '0 auto 4px' }} />
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>{s.value}</p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: '2px 0 0' }}>{s.label}</p>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onCancel} disabled={deleting} style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#EF4444', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: deleting ? 0.7 : 1 }}>
                        {deleting ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'vvSpin 0.8s linear infinite' }} />Deleting…</> : <><RiDeleteBinLine size={14} /> Delete</>}
                    </button>
                </div>
            </div>
        </>
    )
}

// ── Video row (management-list style, not a grid card) ────────────────────────
function VideoRow({ video, onDeleteClick }) {
    const label = STATUS_LABEL[video.status] ?? 'Inactive'
    const isLive = video.status === 'active'
    const isFailed = video.status === 'failed'

    return (
        <div className="vv-row">
            <Link href={`/@${video.user?.username}/video/${video.ulid}`} className="vv-thumb">
                {video.thumbnail_url_full
                    ? <img src={video.thumbnail_url_full} alt={video.title} />
                    : <div className="vv-thumb-empty"><RiPlayCircleLine size={20} color="rgba(255,255,255,0.25)" /></div>
                }
                <div className="vv-thumb-play"><RiPlayCircleLine size={18} color="#fff" /></div>
            </Link>

            <div className="vv-row-main">
                <p className="vv-row-title">{video.title ?? 'Untitled'}</p>
                <div className="vv-row-stats">
                    <span><RiEyeLine size={12} /> {formatCount(video.views_count)}</span>
                    <span><RiHeartLine size={12} /> {formatCount(video.likes_count)}</span>
                    <span><RiChat1Line size={12} /> {formatCount(video.comments_count)}</span>
                    <span className="vv-row-time">{timeAgo(video.published_at ?? video.created_at)}</span>
                </div>
            </div>

            <span className={`vv-status-chip ${isLive ? 'vv-chip-live' : isFailed ? 'vv-chip-failed' : 'vv-chip-neutral'}`}>
                {video.status === 'processing' && <RiLoader4Line size={10} className="vv-spin" />}
                {label}
            </span>

            <div className="vv-row-actions">
                <Link href={`/seller/videos/${video.ulid}/edit`} className="vv-icon-btn" title="Edit">
                    <RiEditLine size={15} />
                </Link>
                <button onClick={() => onDeleteClick(video)} className="vv-icon-btn vv-icon-danger" title="Delete">
                    <RiDeleteBinLine size={15} />
                </button>
            </div>
        </div>
    )
}

export default function SellerVideos({ videos: initialVideos = { data: [] } }) {
    const [pagination, setPagination] = useState(initialVideos)
    const videos = pagination.data ?? []
    const [deleteTarget,  setDeleteTarget]  = useState(null)
    const [deleting,      setDeleting]      = useState(false)
    const [filter,        setFilter]        = useState('all')
    const { showToast, ToastComponent } = useToast()

    const filteredVideos = filter === 'all' ? videos : videos.filter(v => v.status === filter)

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
        { value: 'active',     label: 'Live',        count: videos.filter(v => v.status === 'active').length },
        { value: 'processing', label: 'Processing', count: videos.filter(v => v.status === 'processing').length },
        { value: 'draft',      label: 'Draft',       count: videos.filter(v => v.status === 'draft').length },
    ]

    const totalViews    = videos.reduce((s, v) => s + (v.views_count ?? 0), 0)
    const totalLikes    = videos.reduce((s, v) => s + (v.likes_count ?? 0), 0)
    const totalComments = videos.reduce((s, v) => s + (v.comments_count ?? 0), 0)
    const liveCount     = videos.filter(v => v.status === 'active').length

    return (
        <>
            <Head title="My Videos" />

            <div className="vv-page">
                <header className="vv-header">
                    <div className="vv-header-inner">
                        <button type="button" onClick={() => window.history.back()} className="vv-back" aria-label="Go back"><RiArrowLeftLine size={18} /></button>
                        <div style={{ flex: 1 }}>
                            <h1>My Videos</h1>
                            <p>{pagination.total ?? videos.length} video{(pagination.total ?? videos.length) !== 1 ? 's' : ''}</p>
                        </div>
                        <Link href="/seller/upload" className="vv-upload-btn">
                            <RiAddLine size={16} /> Upload
                        </Link>
                    </div>
                </header>

                <main className="vv-content">

                    {videos.length > 0 && (
                        <div className="vv-stat-strip">
                            <div className="vv-stat"><strong>{formatCount(totalViews)}</strong><span>Views</span></div>
                            <div className="vv-stat-divider" />
                            <div className="vv-stat"><strong>{formatCount(totalLikes)}</strong><span>Likes</span></div>
                            <div className="vv-stat-divider" />
                            <div className="vv-stat"><strong>{formatCount(totalComments)}</strong><span>Comments</span></div>
                            <div className="vv-stat-divider" />
                            <div className="vv-stat"><strong>{liveCount}</strong><span>Live</span></div>
                        </div>
                    )}

                    {videos.length > 0 && (
                        <div className="vv-filter-row">
                            {FILTERS.filter(f => f.count > 0 || f.value === 'all').map(f => (
                                <button key={f.value} onClick={() => setFilter(f.value)} className={filter === f.value ? 'vv-filter-active' : ''}>
                                    {f.label}
                                    <span>{f.count}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {filteredVideos.length === 0 && (
                        <div className="vv-empty">
                            <div className="vv-empty-icon"><RiVideoLine size={26} /></div>
                            <p className="vv-empty-title">{filter === 'all' ? 'No videos yet' : `No ${filter} videos`}</p>
                            <p className="vv-empty-sub">Upload your first video to grow your audience.</p>
                            {filter === 'all' && (
                                <Link href="/seller/upload" className="vv-upload-btn">
                                    <RiUploadCloud2Line size={16} /> Upload first video
                                </Link>
                            )}
                        </div>
                    )}

                    {filteredVideos.length > 0 && (
                        <div className="vv-list">
                            {filteredVideos.map(video => (
                                <VideoRow key={video.id} video={video} onDeleteClick={setDeleteTarget} />
                            ))}
                        </div>
                    )}

                    {filter === 'all' && <Pagination pagination={pagination} onNavigate={goToPage} />}
                </main>
            </div>

            {deleteTarget && (
                <DeleteModal video={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />
            )}

            {ToastComponent}

            <style>{`
                * { box-sizing: border-box; }
                .vv-spin { animation: vvSpin 1s linear infinite; }
                @keyframes vvSpin    { to { transform: rotate(360deg); } }
                @keyframes vvFadeIn  { from { opacity: 0; } to { opacity: 1; } }
                @keyframes vvSlideUp { from { opacity: 0; transform: translate(-50%, -44%); } to { opacity: 1; transform: translate(-50%, -50%); } }
                .vv-page { min-height: 100vh; background: #0a0a0a; color: #fff; font-family: "DM Sans", sans-serif; }
                .vv-header { position: sticky; top: 0; z-index: 40; background: rgba(10,10,10,0.92); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); padding: 0 24px; }
                .vv-header-inner { max-width: 900px; margin: 0 auto; height: 64px; display: flex; align-items: center; gap: 14px; }
                .vv-back { width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,0.06); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
                .vv-back:hover { background: rgba(255,255,255,0.1); }
                .vv-header h1 { margin: 0; font-size: 16px; font-weight: 700; }
                .vv-header p { margin: 1px 0 0; font-size: 11px; color: rgba(255,255,255,0.35); }
                .vv-upload-btn { display: flex; align-items: center; gap: 6px; padding: 0 18px; height: 40px; border-radius: 10px; background: #FF6B35; color: #fff; text-decoration: none; font-size: 13px; font-weight: 700; border: none; cursor: pointer; }
                .vv-upload-btn:hover { background: #ff7a4a; }
                .vv-content { max-width: 900px; margin: 0 auto; padding: 22px 24px 90px; }
                .vv-stat-strip { display: flex; align-items: center; background: #111; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 16px 8px; margin-bottom: 18px; }
                .vv-stat { flex: 1; text-align: center; }
                .vv-stat strong { display: block; font-size: 17px; font-weight: 800; color: #fff; }
                .vv-stat span { font-size: 11px; color: rgba(255,255,255,0.4); }
                .vv-stat-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.07); }
                .vv-filter-row { display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; scrollbar-width: none; background: #111; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 5px; }
                .vv-filter-row button { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 9px; border: none; background: transparent; color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
                .vv-filter-row button span { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.45); border-radius: 999px; font-size: 10px; font-weight: 700; padding: 1px 6px; }
                .vv-filter-active { background: #FF6B35 !important; color: #fff !important; }
                .vv-filter-active span { background: rgba(255,255,255,0.25) !important; color: #fff !important; }
                .vv-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 70px 24px; text-align: center; background: #111; border: 1px dashed rgba(255,255,255,0.1); border-radius: 18px; }
                .vv-empty-icon { width: 60px; height: 60px; border-radius: 16px; background: rgba(255,107,53,0.1); display: flex; align-items: center; justify-content: center; color: #FF6B35; }
                .vv-empty-title { color: #fff; font-weight: 700; font-size: 16px; margin: 0; }
                .vv-empty-sub { color: rgba(255,255,255,0.4); font-size: 13px; margin: 0; }
                .vv-list { display: flex; flex-direction: column; background: #111; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; }
                .vv-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.05); transition: background 0.15s; }
                .vv-row:first-child { border-top: none; }
                .vv-row:hover { background: rgba(255,255,255,0.02); }
                .vv-thumb { position: relative; width: 52px; height: 78px; border-radius: 10px; overflow: hidden; background: #1a1a1a; flex-shrink: 0; display: block; }
                .vv-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .vv-thumb-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
                .vv-thumb-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.25); opacity: 0; transition: opacity 0.15s; }
                .vv-thumb:hover .vv-thumb-play { opacity: 1; }
                .vv-row-main { flex: 1; min-width: 0; }
                .vv-row-title { color: #fff; font-weight: 600; font-size: 13px; margin: 0 0 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .vv-row-stats { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
                .vv-row-stats span { display: flex; align-items: center; gap: 4px; color: rgba(255,255,255,0.4); font-size: 11px; }
                .vv-row-time { color: rgba(255,255,255,0.25) !important; }
                .vv-status-chip { flex-shrink: 0; display: flex; align-items: center; gap: 4px; padding: 5px 11px; border-radius: 999px; font-size: 10px; font-weight: 700; }
                .vv-chip-live { background: rgba(255,107,53,0.12); color: #FF6B35; }
                .vv-chip-neutral { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); }
                .vv-chip-failed { background: rgba(239,68,68,0.1); color: #EF4444; }
                .vv-row-actions { display: flex; gap: 6px; flex-shrink: 0; }
                .vv-icon-btn { width: 32px; height: 32px; border-radius: 9px; background: rgba(255,255,255,0.05); border: none; color: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none; }
                .vv-icon-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
                .vv-icon-danger:hover { background: rgba(239,68,68,0.12); color: #EF4444; }
                .vv-pg-row { display: flex; justify-content: center; flex-wrap: wrap; gap: 6px; padding: 20px 0 4px; }
                .vv-pg-btn { min-width: 34px; height: 34px; padding: 0 10px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.08); background: #111; color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 700; cursor: pointer; }
                .vv-pg-btn:disabled { opacity: 0.25; cursor: not-allowed; }
                .vv-pg-active { background: #FF6B35 !important; border-color: transparent !important; color: #fff !important; }
                @media (max-width: 640px) { .vv-header-inner, .vv-content { padding-left: 16px; padding-right: 16px; } .vv-row-stats span:nth-child(3) { display: none; } }
            `}</style>
        </>
    )
}

SellerVideos.layout = page => <AppLayout>{page}</AppLayout>