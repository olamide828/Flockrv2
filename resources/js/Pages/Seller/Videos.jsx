import AppLayout from '@/Layouts/AppLayout'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import Toast, { useToast } from '@/Components/Toast'
import {
    RiAddLine, RiArrowLeftLine, RiDeleteBinLine, RiEditLine,
    RiEyeLine, RiHeartLine, RiChat1Line, RiLoader4Line,
    RiPlayCircleLine, RiUploadCloud2Line, RiVideoLine, RiSparklingLine,
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

const STATUS_META = {
    active:     { grad: 'linear-gradient(135deg,#10B981,#34D399)', label: 'Live' },
    processing: { grad: 'linear-gradient(135deg,#8B5CF6,#A78BFA)', label: 'Processing' },
    draft:      { grad: 'linear-gradient(135deg,#F59E0B,#FBBF24)', label: 'Draft' },
    failed:     { grad: 'linear-gradient(135deg,#EF4444,#F87171)', label: 'Failed' },
    inactive:   { grad: 'linear-gradient(135deg,#6B7280,#9CA3AF)', label: 'Inactive' },
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
            <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', animation: 'vvFadeIn 0.2s ease' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(400px, 90vw)', background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 28, padding: 28, zIndex: 101, animation: 'vvSlideUp 0.25s ease' }}>

                <div style={{ width: 60, height: 60, borderRadius: 22, background: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(249,115,22,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <RiDeleteBinLine size={26} color="#F87171" />
                </div>

                <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 8px', textAlign: 'center' }}>Delete Video?</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 20px', textAlign: 'center', lineHeight: 1.5 }}>
                    This will permanently delete <strong style={{ color: '#fff' }}>"{video.title ?? 'Untitled'}"</strong> and all its data. This cannot be undone.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                    {[
                        { Icon: RiEyeLine,   value: formatCount(video.views_count),   label: 'Views'    },
                        { Icon: RiHeartLine, value: formatCount(video.likes_count),   label: 'Likes'    },
                        { Icon: RiChat1Line, value: formatCount(video.comments_count), label: 'Comments' },
                    ].map(s => (
                        <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '12px 8px', textAlign: 'center' }}>
                            <s.Icon size={14} color="rgba(255,255,255,0.3)" style={{ display: 'block', margin: '0 auto 4px' }} />
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{s.value}</p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: '2px 0 0' }}>{s.label}</p>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onCancel} disabled={deleting} style={{ flex: 1, padding: '13px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: '13px', borderRadius: 999, background: deleting ? 'rgba(239,68,68,0.3)' : 'linear-gradient(135deg,#EF4444,#F97316)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {deleting ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'vvSpin 0.8s linear infinite' }} />Deleting…</> : <><RiDeleteBinLine size={14} /> Delete</>}
                    </button>
                </div>
            </div>
        </>
    )
}

function VideoCard({ video, onDeleteClick }) {
    const meta = STATUS_META[video.status] ?? STATUS_META.inactive

    return (
        <div className="vv-card">
            <div className="vv-thumb">
                {video.thumbnail_url_full
                    ? <img src={video.thumbnail_url_full} alt={video.title} />
                    : <div className="vv-thumb-empty"><RiPlayCircleLine size={32} color="rgba(255,255,255,0.2)" /></div>
                }
                <div className="vv-thumb-shade" />

                <span className="vv-status-chip" style={{ background: meta.grad }}>
                    {video.status === 'processing' && <RiLoader4Line size={10} style={{ animation: 'vvSpin 1s linear infinite' }} />}
                    {meta.label}
                </span>

                <div className="vv-views-pill">
                    <RiEyeLine size={11} />
                    <span>{formatCount(video.views_count)}</span>
                </div>

                <Link href={`/@${video.user?.username}/video/${video.ulid}`} className="vv-play-overlay">
                    <div className="vv-play-btn"><RiPlayCircleLine size={22} color="#fff" /></div>
                </Link>
            </div>

            <div className="vv-info">
                <p className="vv-title">{video.title ?? 'Untitled'}</p>

                <div className="vv-stats-row">
                    <span><RiHeartLine size={12} /> {formatCount(video.likes_count)}</span>
                    <span><RiChat1Line size={12} /> {formatCount(video.comments_count)}</span>
                    <span className="vv-time">{timeAgo(video.published_at ?? video.created_at)}</span>
                </div>

                <div className="vv-actions">
                    <Link href={`/seller/videos/${video.ulid}/edit`} className="vv-btn-edit">
                        <RiEditLine size={13} /> Edit
                    </Link>
                    <button onClick={() => onDeleteClick(video)} className="vv-btn-delete">
                        <RiDeleteBinLine size={13} /> Delete
                    </button>
                </div>
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

    return (
        <>
            <Head title="My Videos" />

            <div className="vv-page">
                <div className="vv-blob vv-blob-a" />
                <div className="vv-blob vv-blob-b" />

                <header className="vv-header">
                    <div className="vv-header-inner">
                        <button type="button" onClick={() => window.history.back()} className="vv-back" aria-label="Go back"><RiArrowLeftLine size={18} /></button>
                        <div style={{ flex: 1 }}>
                            <h1>My Videos <span>🎬</span></h1>
                            <p>{pagination.total ?? videos.length} video{(pagination.total ?? videos.length) !== 1 ? 's' : ''} live on your profile</p>
                        </div>
                        <Link href="/seller/upload" className="vv-upload-btn">
                            <RiAddLine size={16} /> Upload
                        </Link>
                    </div>
                </header>

                <main className="vv-content">

                    {videos.length > 0 && (
                        <div className="vv-stats-grid">
                            {[
                                { label: 'Total Views',    value: formatCount(videos.reduce((s, v) => s + (v.views_count ?? 0), 0)),    Icon: RiEyeLine,   grad: 'linear-gradient(135deg,#3B82F6,#06B6D4)' },
                                { label: 'Total Likes',    value: formatCount(videos.reduce((s, v) => s + (v.likes_count ?? 0), 0)),    Icon: RiHeartLine, grad: 'linear-gradient(135deg,#EF4444,#F97316)' },
                                { label: 'Total Comments', value: formatCount(videos.reduce((s, v) => s + (v.comments_count ?? 0), 0)), Icon: RiChat1Line, grad: 'linear-gradient(135deg,#8B5CF6,#EC4899)' },
                                { label: 'Live Videos',    value: videos.filter(v => v.status === 'active').length,                     Icon: RiSparklingLine, grad: 'linear-gradient(135deg,#FF6B35,#FF3D71)' },
                            ].map(s => (
                                <div key={s.label} className="vv-stat-card">
                                    <div className="vv-stat-icon" style={{ background: s.grad }}><s.Icon size={17} /></div>
                                    <div>
                                        <p className="vv-stat-value">{s.value}</p>
                                        <p className="vv-stat-label">{s.label}</p>
                                    </div>
                                </div>
                            ))}
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
                            <div className="vv-empty-blob"><RiVideoLine size={30} /></div>
                            <p className="vv-empty-title">{filter === 'all' ? 'No videos yet' : `No ${filter} videos`}</p>
                            <p className="vv-empty-sub">Upload your first video to grow your audience 🚀</p>
                            {filter === 'all' && (
                                <Link href="/seller/upload" className="vv-upload-btn">
                                    <RiUploadCloud2Line size={16} /> Upload first video
                                </Link>
                            )}
                        </div>
                    )}

                    {filteredVideos.length > 0 && (
                        <div className="vv-grid">
                            {filteredVideos.map(video => (
                                <VideoCard key={video.id} video={video} onDeleteClick={setDeleteTarget} />
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
                @keyframes vvSpin    { to { transform: rotate(360deg); } }
                @keyframes vvFadeIn  { from { opacity: 0; } to { opacity: 1; } }
                @keyframes vvSlideUp { from { opacity: 0; transform: translate(-50%, -44%); } to { opacity: 1; transform: translate(-50%, -50%); } }
                .vv-page { position: relative; min-height: 100vh; background: #0a0a0a; color: #fff; font-family: "DM Sans", sans-serif; overflow-x: hidden; }
                .vv-blob { position: fixed; border-radius: 50%; filter: blur(90px); opacity: 0.16; pointer-events: none; z-index: 0; }
                .vv-blob-a { width: 420px; height: 420px; background: #8B5CF6; top: -140px; left: -100px; }
                .vv-blob-b { width: 360px; height: 360px; background: #FF6B35; bottom: -120px; right: -100px; }
                .vv-header { position: sticky; top: 0; z-index: 40; background: rgba(10,10,10,0.75); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); padding: 0 24px; }
                .vv-header-inner { max-width: 1100px; margin: 0 auto; height: 76px; display: flex; align-items: center; gap: 14px; }
                .vv-back { width: 42px; height: 42px; border-radius: 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; transition: transform 0.15s, background 0.15s; }
                .vv-back:hover { background: rgba(255,255,255,0.12); transform: translateX(-2px); }
                .vv-header h1 { margin: 0; font-size: 19px; font-weight: 800; }
                .vv-header p { margin: 2px 0 0; font-size: 11px; color: rgba(255,255,255,0.35); }
                .vv-upload-btn { display: flex; align-items: center; gap: 6px; padding: 0 20px; height: 44px; border-radius: 999px; background: linear-gradient(135deg,#FF6B35,#FF3D71); color: #fff; text-decoration: none; font-size: 13px; font-weight: 800; box-shadow: 0 8px 22px rgba(255,107,53,0.35); transition: transform 0.15s; }
                .vv-upload-btn:hover { transform: translateY(-2px); }
                .vv-content { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; padding: 24px 24px 90px; }
                .vv-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 22px; }
                .vv-stat-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 22px; padding: 16px 14px; display: flex; align-items: center; gap: 12px; }
                .vv-stat-icon { width: 42px; height: 42px; border-radius: 15px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; box-shadow: 0 6px 14px rgba(0,0,0,0.3); }
                .vv-stat-value { color: #fff; font-weight: 800; font-size: 18px; margin: 0; }
                .vv-stat-label { color: rgba(255,255,255,0.35); font-size: 11px; margin: 1px 0 0; }
                .vv-filter-row { display: flex; gap: 8px; margin-bottom: 22px; overflow-x: auto; scrollbar-width: none; }
                .vv-filter-row button { display: flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
                .vv-filter-row button span { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); border-radius: 999px; font-size: 10px; font-weight: 800; padding: 1px 7px; }
                .vv-filter-active { background: linear-gradient(135deg,#FF6B35,#FF3D71) !important; color: #fff !important; border-color: transparent !important; }
                .vv-filter-active span { background: rgba(255,255,255,0.25) !important; color: #fff !important; }
                .vv-empty { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 90px 24px; text-align: center; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.12); border-radius: 32px; }
                .vv-empty-blob { width: 76px; height: 76px; border-radius: 26px; background: linear-gradient(135deg, rgba(139,92,246,0.25), rgba(255,107,53,0.15)); display: flex; align-items: center; justify-content: center; color: #C4B5FD; }
                .vv-empty-title { color: #fff; font-weight: 800; font-size: 18px; margin: 0; }
                .vv-empty-sub { color: rgba(255,255,255,0.4); font-size: 13px; margin: 0; }
                .vv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 18px; }
                .vv-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 28px; overflow: hidden; transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; }
                .vv-card:hover { transform: translateY(-4px); border-color: rgba(255,107,53,0.35); box-shadow: 0 16px 32px rgba(0,0,0,0.4); }
                .vv-thumb { position: relative; aspect-ratio: 9/16; max-height: 260px; background: #1a1a1a; overflow: hidden; }
                .vv-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.35s; }
                .vv-card:hover .vv-thumb img { transform: scale(1.06); }
                .vv-thumb-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
                .vv-thumb-shade { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%); }
                .vv-status-chip { position: absolute; top: 10px; left: 10px; padding: 5px 11px; border-radius: 999px; font-size: 10px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
                .vv-views-pill { position: absolute; bottom: 10px; left: 10px; display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); padding: 4px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; }
                .vv-play-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; background: rgba(0,0,0,0.25); }
                .vv-thumb:hover .vv-play-overlay { opacity: 1; }
                .vv-play-btn { width: 46px; height: 46px; border-radius: 50%; background: rgba(255,255,255,0.2); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; }
                .vv-info { padding: 14px 14px 12px; }
                .vv-title { color: #fff; font-weight: 700; font-size: 13px; margin: 0 0 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .vv-stats-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
                .vv-stats-row span { display: flex; align-items: center; gap: 4px; color: rgba(255,255,255,0.5); font-size: 11px; }
                .vv-time { margin-left: auto; color: rgba(255,255,255,0.25) !important; }
                .vv-actions { display: flex; gap: 8px; }
                .vv-btn-edit, .vv-btn-delete { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 9px; border-radius: 12px; font-size: 12px; font-weight: 700; cursor: pointer; text-decoration: none; border: none; transition: transform 0.15s; }
                .vv-btn-edit:hover, .vv-btn-delete:hover { transform: translateY(-2px); }
                .vv-btn-edit { background: rgba(139,92,246,0.15); color: #A78BFA; }
                .vv-btn-delete { background: rgba(239,68,68,0.15); color: #F87171; }
                .vv-pg-row { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; padding: 24px 0 4px; }
                .vv-pg-btn { min-width: 38px; height: 38px; padding: 0 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.55); font-size: 12px; font-weight: 700; cursor: pointer; }
                .vv-pg-btn:disabled { opacity: 0.25; cursor: not-allowed; }
                .vv-pg-active { background: linear-gradient(135deg,#FF6B35,#FF3D71) !important; border-color: transparent !important; color: #fff !important; }
            `}</style>
        </>
    )
}

SellerVideos.layout = page => <AppLayout>{page}</AppLayout>