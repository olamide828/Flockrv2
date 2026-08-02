import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import Toast, { useToast } from '@/Components/Toast';
import ConfirmModal from '@/Components/ConfirmModal';
import {
    RiAddLine,
    RiArrowLeftLine,
    RiCheckLine,
    RiCloseLine,
    RiDeleteBinLine,
    RiEditLine,
    RiEyeLine,
    RiImageLine,
    RiSearchLine,
    RiStore3Line,
    RiPriceTag3Line,
    RiSparklingLine,
    RiFireLine,
} from 'react-icons/ri';

const CONDITION_LABEL = { new: 'New', used: 'Used', refurbished: 'Refurb' };

const STATUS_META = {
    active:   { grad: 'linear-gradient(135deg,#10B981,#34D399)', label: 'Live' },
    archived: { grad: 'linear-gradient(135deg,#6B7280,#9CA3AF)', label: 'Archived' },
    draft:    { grad: 'linear-gradient(135deg,#F59E0B,#FBBF24)', label: 'Draft' },
};

function Pagination({ pagination, onNavigate }) {
    if (!pagination?.links || pagination.last_page <= 1) return null;
    return (
        <div className="pg-row">
            {pagination.links.map((link, i) => (
                <button
                    key={i}
                    type="button"
                    disabled={!link.url}
                    onClick={() => link.url && onNavigate(link.url)}
                    className={`pg-btn ${link.active ? 'pg-active' : ''}`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>
    );
}

export default function SellerProducts({ products: initialProducts = { data: [] } }) {
    const { auth } = usePage().props;

    const [pagination, setPagination] = useState(initialProducts);
    const products = pagination.data ?? [];
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [deleting, setDeleting] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const { showToast, ToastComponent } = useToast();

    const filtered = products.filter((p) => {
        const matchStatus = status === 'all' || p.status === status;
        const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const totalValue = filtered.reduce((sum, p) => sum + Number(p.price ?? 0) * Number(p.stock_quantity ?? 0), 0);
    const inStock = filtered.filter((p) => p.stock_quantity > 0).length;
    const outOfStock = filtered.filter((p) => p.stock_quantity === 0).length;

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(deleteTarget.id);
        try {
            await axios.delete(`/api/products/${deleteTarget.id}`);
            setPagination((prev) => ({ ...prev, data: (prev.data ?? []).filter((p) => p.id !== deleteTarget.id) }));
            showToast('Product deleted.', 'success');
        } catch {
            showToast('Failed to delete product.', 'error');
        } finally {
            setDeleting(null);
            setDeleteTarget(null);
        }
    };

    const handleToggleStatus = async (product) => {
        const newStatus = product.status === 'active' ? 'archived' : 'active';
        try {
            await axios.put(`/api/products/${product.id}`, { status: newStatus });
            setPagination((prev) => ({
                ...prev,
                data: (prev.data ?? []).map((p) => (p.id === product.id ? { ...p, status: newStatus } : p)),
            }));
            showToast(newStatus === 'active' ? 'Product is live again 🎉' : 'Product archived.', 'success');
        } catch {
            showToast('Failed to update product.', 'error');
        }
    };

    const goToPage = (url) => {
        router.get(url, {}, {
            preserveState: true,
            preserveScroll: true,
            only: ['products'],
            onSuccess: (page) => setPagination(page.props.products),
        });
    };

    return (
        <>
            <Head title="Products" />

            <div className="pp-page">
                <div className="pp-blob pp-blob-a" />
                <div className="pp-blob pp-blob-b" />

                <header className="pp-header">
                    <div className="pp-header-inner">
                        <div className="pp-header-left">
                            <button type="button" onClick={() => window.history.back()} className="pp-back" aria-label="Go back">
                                <RiArrowLeftLine size={18} />
                            </button>
                            <div>
                                <h1>Your Products <span className="pp-emoji">🛍️</span></h1>
                                <p>{pagination.total ?? filtered.length} product{(pagination.total ?? filtered.length) !== 1 ? 's' : ''} in your shop</p>
                            </div>
                        </div>
                        <Link href="/seller/products/create" className="pp-primary-btn">
                            <RiAddLine size={17} /> New Product
                        </Link>
                    </div>
                </header>

                <main className="pp-content">
                    {/* STAT PILLS */}
                    <div className="pp-stats">
                        <div className="pp-stat">
                            <div className="pp-stat-icon" style={{ background: 'linear-gradient(135deg,#10B981,#34D399)' }}>
                                <RiStore3Line size={19} />
                            </div>
                            <div>
                                <strong>{inStock}</strong>
                                <p>In Stock</p>
                            </div>
                        </div>
                        <div className="pp-stat">
                            <div className="pp-stat-icon" style={{ background: 'linear-gradient(135deg,#EF4444,#F97316)' }}>
                                <RiFireLine size={19} />
                            </div>
                            <div>
                                <strong>{outOfStock}</strong>
                                <p>Out of Stock</p>
                            </div>
                        </div>
                        <div className="pp-stat pp-stat-hero">
                            <div className="pp-stat-icon" style={{ background: 'linear-gradient(135deg,#FF6B35,#FF3D71)' }}>
                                <RiPriceTag3Line size={19} />
                            </div>
                            <div>
                                <strong>₦{totalValue.toLocaleString()}</strong>
                                <p>Stock value (this page)</p>
                            </div>
                        </div>
                    </div>

                    {/* FILTERS */}
                    <div className="pp-filters">
                        <div className="pp-search">
                            <RiSearchLine size={16} />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products on this page..." />
                        </div>
                        <div className="pp-tabs">
                            {['all', 'active', 'archived', 'draft'].map((s) => (
                                <button key={s} onClick={() => setStatus(s)} className={status === s ? 'pp-tab-active' : ''}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* GRID */}
                    {!filtered.length ? (
                        <div className="pp-empty">
                            <div className="pp-empty-blob"><RiStore3Line size={34} /></div>
                            <h4>Nothing here yet</h4>
                            <p>Add your first product and start selling ✨</p>
                            <Link href="/seller/products/create" className="pp-primary-btn">
                                <RiAddLine /> Add Product
                            </Link>
                        </div>
                    ) : (
                        <div className="pp-grid">
                            {filtered.map((product) => {
                                const meta = STATUS_META[product.status] ?? STATUS_META.draft;
                                return (
                                    <div key={product.id} className="pp-card">
                                        <div className="pp-card-image">
                                            {product.primary_image ? (
                                                <img src={product.primary_image} alt={product.name} />
                                            ) : (
                                                <div className="pp-card-placeholder"><RiImageLine size={28} /></div>
                                            )}
                                            <span className="pp-status-chip" style={{ background: meta.grad }}>{meta.label}</span>
                                            {product.orders_count > 0 && (
                                                <span className="pp-sold-chip"><RiSparklingLine size={11} /> {product.orders_count} sold</span>
                                            )}
                                        </div>

                                        <div className="pp-card-body">
                                            <h4>{product.name}</h4>
                                            <div className="pp-price-row">
                                                <span className="pp-price">₦{Number(product.price).toLocaleString()}</span>
                                                {product.compare_price && (
                                                    <span className="pp-compare">₦{Number(product.compare_price).toLocaleString()}</span>
                                                )}
                                            </div>
                                            <div className="pp-tags">
                                                <span className="pp-tag">{product.stock_quantity ?? 0} left</span>
                                                {product.condition && <span className="pp-tag">{CONDITION_LABEL[product.condition] ?? product.condition}</span>}
                                            </div>
                                        </div>

                                        <div className="pp-actions">
                                            <a href={`/@${auth.user?.username}/products/${product.slug}`} target="_blank" className="pp-icon-btn pp-icon-blue" title="View">
                                                <RiEyeLine size={15} />
                                            </a>
                                            <Link href={`/seller/products/${product.id}/edit`} className="pp-icon-btn pp-icon-purple" title="Edit">
                                                <RiEditLine size={15} />
                                            </Link>
                                            <button onClick={() => handleToggleStatus(product)} className="pp-icon-btn pp-icon-orange" title={product.status === 'active' ? 'Archive' : 'Activate'}>
                                                {product.status === 'active' ? <RiCloseLine size={15} /> : <RiCheckLine size={15} />}
                                            </button>
                                            <button onClick={() => setDeleteTarget(product)} className="pp-icon-btn pp-icon-red" disabled={deleting === product.id} title="Delete">
                                                <RiDeleteBinLine size={15} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {status === 'all' && !search && <Pagination pagination={pagination} onNavigate={goToPage} />}
                </main>
            </div>

            {deleteTarget && (
                <ConfirmModal
                    title="Delete Product?"
                    message={`This will permanently delete "${deleteTarget.name}". This cannot be undone.`}
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    danger
                    onConfirm={handleDelete}
                    onClose={() => setDeleteTarget(null)}
                />
            )}

            {ToastComponent}

            <style>{`
        * { box-sizing: border-box; }
        .pp-page { position: relative; min-height: 100vh; background: #0a0a0a; color: white; font-family: "DM Sans", sans-serif; overflow-x: hidden; }
        .pp-blob { position: fixed; border-radius: 50%; filter: blur(90px); opacity: 0.16; pointer-events: none; z-index: 0; }
        .pp-blob-a { width: 420px; height: 420px; background: #FF6B35; top: -140px; right: -100px; }
        .pp-blob-b { width: 360px; height: 360px; background: #8B5CF6; bottom: -120px; left: -100px; }
        .pp-header { position: sticky; top: 0; z-index: 40; background: rgba(10,10,10,0.75); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .pp-header-inner { max-width: 1200px; margin: auto; padding: 0 24px; height: 76px; display: flex; align-items: center; justify-content: space-between; }
        .pp-header-left { display: flex; align-items: center; gap: 14px; }
        .pp-back { width: 42px; height: 42px; border-radius: 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s, background 0.15s; }
        .pp-back:hover { background: rgba(255,255,255,0.12); transform: translateX(-2px); }
        .pp-header h1 { margin: 0; font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 6px; }
        .pp-emoji { font-size: 17px; }
        .pp-header p { margin: 2px 0 0; font-size: 12px; color: rgba(255,255,255,0.4); }
        .pp-primary-btn { display: flex; align-items: center; gap: 7px; padding: 0 20px; height: 44px; border-radius: 999px; background: linear-gradient(135deg,#FF6B35,#FF3D71); color: white; font-weight: 800; font-size: 13px; text-decoration: none; box-shadow: 0 8px 22px rgba(255,107,53,0.35); transition: transform 0.15s; }
        .pp-primary-btn:hover { transform: translateY(-2px); }
        .pp-content { position: relative; z-index: 1; max-width: 1200px; margin: auto; padding: 28px 24px 100px; display: flex; flex-direction: column; gap: 22px; }
        .pp-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
        .pp-stat { display: flex; align-items: center; gap: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 24px; padding: 18px 20px; }
        .pp-stat-hero { background: linear-gradient(135deg, rgba(255,107,53,0.12), rgba(255,61,113,0.08)); border-color: rgba(255,107,53,0.25); }
        .pp-stat-icon { width: 44px; height: 44px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; box-shadow: 0 6px 16px rgba(0,0,0,0.3); }
        .pp-stat strong { display: block; font-size: 20px; font-weight: 800; }
        .pp-stat p { margin: 2px 0 0; font-size: 11px; color: rgba(255,255,255,0.4); }
        .pp-filters { display: flex; flex-direction: column; gap: 12px; }
        .pp-search { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 999px; padding: 13px 20px; color: rgba(255,255,255,0.4); }
        .pp-search input { flex: 1; background: none; border: none; outline: none; color: white; font-size: 14px; }
        .pp-tabs { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
        .pp-tabs button { padding: 9px 18px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: all 0.15s; }
        .pp-tab-active { background: linear-gradient(135deg,#FF6B35,#FF3D71) !important; color: white !important; border-color: transparent !important; }
        .pp-empty { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 80px 24px; text-align: center; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.12); border-radius: 32px; }
        .pp-empty-blob { width: 76px; height: 76px; border-radius: 26px; background: linear-gradient(135deg, rgba(255,107,53,0.25), rgba(255,61,113,0.15)); display: flex; align-items: center; justify-content: center; color: #FF9D6B; }
        .pp-empty h4 { margin: 0; font-size: 18px; font-weight: 800; }
        .pp-empty p { margin: 0; font-size: 13px; color: rgba(255,255,255,0.4); }
        .pp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; }
        .pp-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 28px; overflow: hidden; transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; }
        .pp-card:hover { transform: translateY(-4px); border-color: rgba(255,107,53,0.35); box-shadow: 0 16px 32px rgba(0,0,0,0.4); }
        .pp-card-image { position: relative; aspect-ratio: 1; background: #181818; overflow: hidden; }
        .pp-card-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.35s; }
        .pp-card:hover .pp-card-image img { transform: scale(1.06); }
        .pp-card-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.2); }
        .pp-status-chip { position: absolute; top: 12px; left: 12px; padding: 5px 12px; border-radius: 999px; font-size: 10px; font-weight: 800; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        .pp-sold-chip { position: absolute; top: 12px; right: 12px; display: flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); color: #FFD37A; }
        .pp-card-body { padding: 16px 16px 12px; }
        .pp-card-body h4 { margin: 0 0 8px; font-size: 14px; font-weight: 700; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .pp-price-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
        .pp-price { background: linear-gradient(135deg,#FF6B35,#FF3D71); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 800; font-size: 17px; }
        .pp-compare { color: rgba(255,255,255,0.3); font-size: 12px; text-decoration: line-through; }
        .pp-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .pp-tag { padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.06); font-size: 11px; color: rgba(255,255,255,0.55); }
        .pp-actions { display: flex; gap: 8px; padding: 12px 16px 16px; }
        .pp-icon-btn { flex: 1; height: 38px; border-radius: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: transform 0.15s, opacity 0.15s; color: white; }
        .pp-icon-btn:hover { transform: translateY(-2px); }
        .pp-icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .pp-icon-blue { background: rgba(59,130,246,0.15); color: #60A5FA; }
        .pp-icon-purple { background: rgba(139,92,246,0.15); color: #A78BFA; }
        .pp-icon-orange { background: rgba(255,107,53,0.15); color: #FF9D6B; }
        .pp-icon-red { background: rgba(239,68,68,0.15); color: #F87171; }
        .pg-row { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; padding: 10px 0; }
        .pg-btn { min-width: 38px; height: 38px; padding: 0 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.55); font-size: 12px; font-weight: 700; cursor: pointer; }
        .pg-btn:disabled { opacity: 0.25; cursor: not-allowed; }
        .pg-active { background: linear-gradient(135deg,#FF6B35,#FF3D71) !important; border-color: transparent !important; color: white !important; }
        @media (max-width: 640px) { .pp-header-inner, .pp-content { padding-left: 16px; padding-right: 16px; } .pp-grid { grid-template-columns: repeat(2, 1fr); } .pp-stats { grid-template-columns: 1fr 1fr; } .pp-stat-hero { grid-column: span 2; } }
      `}</style>
        </>
    );
}

SellerProducts.layout = (page) => <AppLayout>{page}</AppLayout>;