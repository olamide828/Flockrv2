import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import {
    RiArrowLeftLine,
    RiChat1Line,
    RiCheckboxCircleLine,
    RiDeleteBinLine,
    RiEyeLine,
    RiHeartLine,
    RiLoader4Line,
    RiPlayCircleLine,
    RiSearchLine,
    RiShoppingBag2Line,
    RiTimeLine,
    RiUploadCloud2Line,
    RiVideoLine,
} from 'react-icons/ri';

const STATUS_COLOR = {
    active: { bg: 'rgba(16,185,129,0.15)', text: '#10B981' },
    pending: { bg: 'rgba(234,179,8,0.15)', text: '#EAB308' },
    processing: { bg: 'rgba(139,92,246,0.15)', text: '#8B5CF6' },
    failed: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' },
    archived: { bg: 'rgba(156,163,175,0.15)', text: '#9CA3AF' },
};

function fmt(n) {
    const num = Number(n ?? 0);
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return String(num);
}

export default function SellerVideos({ videos: initialVideos = { data: [] } }) {
    const [videos, setVideos] = useState(initialVideos.data ?? []);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [view, setView] = useState('grid'); // grid | list
    const [deleting, setDeleting] = useState(null);

    const { auth } = usePage().props;

    const filtered = videos.filter((v) => {
        const matchStatus = status === 'all' || v.status === status;
        const matchSearch =
            !search || v.title?.toLowerCase().includes(search.toLowerCase()) || v.description?.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const totalViews = videos.reduce((s, v) => s + Number(v.views_count ?? 0), 0);
    const totalLikes = videos.reduce((s, v) => s + Number(v.likes_count ?? 0), 0);

    const handleDelete = async (video) => {
        if (!confirm(`Delete "${video.title || 'this video'}"? This cannot be undone.`)) return;
        setDeleting(video.id);
        try {
            await axios.delete(`/api/videos/${video.id}`);
            setVideos((prev) => prev.filter((v) => v.id !== video.id));
        } catch {
            alert('Failed to delete video.');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <>
            <Head title="Videos" />

            <div className="seller-page">
                <header className="page-header">
                    <div className="page-header-inner">
                        <div className="page-header-left">
                            <Link href="/seller/dashboard" className="back-btn">
                                <RiArrowLeftLine size={18} />
                            </Link>
                            <div>
                                <h1>Videos</h1>
                                <p>
                                    {filtered.length} video{filtered.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        <Link href="/seller/upload" className="primary-btn">
                            <RiUploadCloud2Line size={16} /> Upload
                        </Link>
                    </div>
                </header>

                <main className="page-content">
                    {/* SUMMARY */}
                    <div className="summary-strip">
                        <div className="summary-card">
                            <RiVideoLine size={18} />
                            <div>
                                <span>{videos.length}</span>
                                <p>Total Videos</p>
                            </div>
                        </div>
                        <div className="summary-card">
                            <RiEyeLine size={18} />
                            <div>
                                <span>{fmt(totalViews)}</span>
                                <p>Total Views</p>
                            </div>
                        </div>
                        <div className="summary-card highlight">
                            <RiHeartLine size={18} />
                            <div>
                                <span>{fmt(totalLikes)}</span>
                                <p>Total Likes</p>
                            </div>
                        </div>
                    </div>

                    {/* FILTERS */}
                    <div className="filters-row">
                        <div className="search-wrap">
                            <RiSearchLine size={15} />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search videos..." />
                            <div className="view-toggle">
                                <button onClick={() => setView('grid')} className={view === 'grid' ? 'active' : ''}>
                                    Grid
                                </button>
                                <button onClick={() => setView('list')} className={view === 'list' ? 'active' : ''}>
                                    List
                                </button>
                            </div>
                        </div>
                        <div className="status-tabs">
                            {['all', 'active', 'pending', 'processing', 'failed', 'archived'].map((s) => (
                                <button key={s} onClick={() => setStatus(s)} className={status === s ? 'active' : ''}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CONTENT */}
                    {!filtered.length ? (
                        <div className="table-card">
                            <div className="empty-state">
                                <RiVideoLine size={40} />
                                <h4>No videos found</h4>
                                <p>Upload your first video to start selling.</p>
                                <Link href="/seller/upload" className="empty-btn">
                                    <RiUploadCloud2Line /> Upload Video
                                </Link>
                            </div>
                        </div>
                    ) : view === 'grid' ? (
                        <div className="video-grid">
                            {filtered.map((video) => (
                                <div key={video.id} className="video-card">
                                    <Link href={`/@${auth.user?.username}/video/${video.ulid}`} className="video-thumb">
                                        {video.thumbnail_url_full ? (
                                            <img src={video.thumbnail_url_full} alt={video.title} />
                                        ) : (
                                            <div className="thumb-empty">
                                                <RiPlayCircleLine size={32} />
                                            </div>
                                        )}
                                        <div className="thumb-overlay">
                                            <div className="thumb-stats">
                                                <span>
                                                    <RiEyeLine size={11} />
                                                    {fmt(video.views_count)}
                                                </span>
                                                <span>
                                                    <RiHeartLine size={11} />
                                                    {fmt(video.likes_count)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="video-status-badge" style={STATUS_COLOR[video.status] ?? {}}>
                                            {video.status === 'processing' && <RiLoader4Line size={9} />}
                                            {video.status === 'active' && <RiCheckboxCircleLine size={9} />}
                                            {video.status === 'pending' && <RiTimeLine size={9} />}
                                            {video.status}
                                        </div>
                                        {video.is_for_sale && (
                                            <div className="shop-badge">
                                                <RiShoppingBag2Line size={10} />
                                            </div>
                                        )}
                                    </Link>
                                    <div className="video-info">
                                        <p className="video-title">{video.title || 'Untitled'}</p>
                                        <div className="video-meta">
                                            <span>
                                                <RiChat1Line size={11} />
                                                {fmt(video.comments_count)}
                                            </span>
                                            <button onClick={() => handleDelete(video)} className="del-btn" disabled={deleting === video.id}>
                                                <RiDeleteBinLine size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="table-card">
                            {filtered.map((video, i) => (
                                <div key={video.id} className="list-row" style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.04)' } : {}}>
                                    <Link href={`/@${auth.user?.username}/video/${video.ulid}`} className="list-thumb">
                                        {video.thumbnail_url_full ? (
                                            <img src={video.thumbnail_url_full} alt={video.title} />
                                        ) : (
                                            <div className="list-thumb-empty">
                                                <RiPlayCircleLine size={20} />
                                            </div>
                                        )}
                                    </Link>
                                    <div className="list-meta">
                                        <h4>{video.title || 'Untitled'}</h4>
                                        <p className="list-desc">{video.description?.slice(0, 80) ?? ''}</p>
                                        <div className="list-stats">
                                            <span>
                                                <RiEyeLine size={12} />
                                                {fmt(video.views_count)}
                                            </span>
                                            <span>
                                                <RiHeartLine size={12} />
                                                {fmt(video.likes_count)}
                                            </span>
                                            <span>
                                                <RiChat1Line size={12} />
                                                {fmt(video.comments_count)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="list-status" style={{ color: (STATUS_COLOR[video.status] ?? {}).text }}>
                                        {video.status}
                                    </div>
                                    <button onClick={() => handleDelete(video)} className="del-btn-lg" disabled={deleting === video.id}>
                                        <RiDeleteBinLine size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* <style>{pageStyles}</style> */}
            <style>{`
        .summary-strip { display: flex; gap: 14px; }
        .summary-card { flex: 1; background: #111; border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 18px 20px; display: flex; align-items: center; gap: 14px; color: rgba(255,255,255,0.4); }
        .summary-card.highlight { color: #ff6b35; }
        .summary-card div span { display: block; font-size: 22px; font-weight: 800; color: white; }
        .summary-card.highlight div span { color: #ff6b35; }
        .summary-card div p { margin: 2px 0 0; font-size: 12px; }
        .filters-row { display: flex; flex-direction: column; gap: 12px; }
        .search-wrap { display: flex; align-items: center; gap: 10px; background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 12px 16px; color: rgba(255,255,255,0.4); }
        .search-wrap input { flex: 1; background: none; border: none; outline: none; color: white; font-size: 14px; }
        .view-toggle { display: flex; background: rgba(255,255,255,0.06); border-radius: 8px; padding: 3px; gap: 2px; }
        .view-toggle button { padding: 4px 10px; border-radius: 6px; border: none; background: transparent; color: rgba(255,255,255,0.4); font-size: 12px; cursor: pointer; }
        .view-toggle button.active { background: rgba(255,255,255,0.12); color: white; }
        .status-tabs { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
        .status-tabs button { padding: 7px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.07); background: #111; color: rgba(255,255,255,0.45); font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: all 0.15s; }
        .status-tabs button.active { background: white; color: black; border-color: white; }
        .video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
        .video-card { background: #111; border: 1px solid rgba(255,255,255,0.05); border-radius: 22px; overflow: hidden; transition: border-color 0.15s; }
        .video-card:hover { border-color: rgba(255,255,255,0.1); }
        .video-thumb { position: relative; aspect-ratio: 9/16; display: block; background: #181818; overflow: hidden; text-decoration: none; }
        .video-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .thumb-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.25); }
        .thumb-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%); display: flex; align-items: flex-end; padding: 10px; }
        .thumb-stats { display: flex; gap: 8px; }
        .thumb-stats span { display: flex; align-items: center; gap: 3px; font-size: 11px; color: rgba(255,255,255,0.8); }
        .video-status-badge { position: absolute; top: 8px; left: 8px; display: flex; align-items: center; gap: 3px; padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; background: rgba(0,0,0,0.65); text-transform: capitalize; }
        .shop-badge { position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border-radius: 50%; background: rgba(255,107,53,0.9); display: flex; align-items: center; justify-content: center; color: white; }
        .video-info { padding: 10px 12px 12px; }
        .video-title { margin: 0 0 6px; font-size: 12px; font-weight: 600; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .video-meta { display: flex; align-items: center; justify-content: space-between; }
        .video-meta span { display: flex; align-items: center; gap: 3px; font-size: 11px; color: rgba(255,255,255,0.4); }
        .del-btn { background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; padding: 4px; border-radius: 6px; display: flex; transition: color 0.15s; }
        .del-btn:hover { color: #ef4444; }
        .list-row { display: flex; align-items: center; gap: 16px; padding: 14px 20px; }
        .list-thumb { width: 72px; height: 128px; border-radius: 12px; overflow: hidden; background: #181818; flex-shrink: 0; display: block; }
        .list-thumb img, .list-thumb-empty { width: 100%; height: 100%; object-fit: cover; }
        .list-thumb-empty { display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.25); }
        .list-meta { flex: 1; min-width: 0; }
        .list-meta h4 { margin: 0 0 4px; font-size: 14px; font-weight: 600; }
        .list-desc { margin: 0 0 8px; font-size: 12px; color: rgba(255,255,255,0.4); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .list-stats { display: flex; gap: 12px; }
        .list-stats span { display: flex; align-items: center; gap: 4px; font-size: 12px; color: rgba(255,255,255,0.45); }
        .list-status { font-size: 12px; font-weight: 700; text-transform: capitalize; flex-shrink: 0; }
        .del-btn-lg { background: none; border: none; color: rgba(255,255,255,0.25); cursor: pointer; padding: 8px; border-radius: 8px; display: flex; transition: color 0.15s; flex-shrink: 0; }
        .del-btn-lg:hover { color: #ef4444; }
        .empty-btn { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; padding: 10px 18px; border-radius: 999px; background: white; color: black; text-decoration: none; font-weight: 700; font-size: 13px; }
        @media (max-width: 640px) { .video-grid { grid-template-columns: repeat(2, 1fr); } .summary-strip { flex-wrap: wrap; } }
      `}</style>
        </>
    );
}

SellerVideos.layout = (page) => <AppLayout>{page}</AppLayout>;
