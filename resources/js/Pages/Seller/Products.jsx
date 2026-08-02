import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import Toast, { useToast } from '@/Components/Toast';
import ConfirmModal from '@/Components/Community/ConfirmModal';
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
} from 'react-icons/ri';

const CONDITION_LABEL = { new: 'New', used: 'Used', refurbished: 'Refurb' };
const STATUS_LABEL = { active: 'Live', archived: 'Archived', draft: 'Draft' };

function Pagination({ pagination, onNavigate }) {
    if (!pagination?.links || pagination.last_page <= 1) return null;
    return (
        <div className="ppr-pg-row">
            {pagination.links.map((link, i) => (
                <button
                    key={i}
                    type="button"
                    disabled={!link.url}
                    onClick={() => link.url && onNavigate(link.url)}
                    className={`ppr-pg-btn ${link.active ? 'ppr-pg-active' : ''}`}
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
            showToast(newStatus === 'active' ? 'Product is live again.' : 'Product archived.', 'success');
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

            <div className="ppr-page">
                <header className="ppr-header">
                    <div className="ppr-header-inner">
                        <button type="button" onClick={() => window.history.back()} className="ppr-back" aria-label="Go back">
                            <RiArrowLeftLine size={18} />
                        </button>
                        <div style={{ flex: 1 }}>
                            <h1>Products</h1>
                            <p>{pagination.total ?? filtered.length} product{(pagination.total ?? filtered.length) !== 1 ? 's' : ''}</p>
                        </div>
                        <Link href="/seller/products/create" className="ppr-primary-btn">
                            <RiAddLine size={16} /> Add Product
                        </Link>
                    </div>
                </header>

                <main className="ppr-content">
                    <div className="ppr-stat-strip">
                        <div className="ppr-stat"><strong>{inStock}</strong><span>In Stock</span></div>
                        <div className="ppr-stat-divider" />
                        <div className="ppr-stat"><strong>{outOfStock}</strong><span>Out of Stock</span></div>
                        <div className="ppr-stat-divider" />
                        <div className="ppr-stat"><strong>₦{totalValue.toLocaleString()}</strong><span>Stock value (page)</span></div>
                    </div>

                    <div className="ppr-filters">
                        <div className="ppr-search">
                            <RiSearchLine size={15} />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products on this page..." />
                        </div>
                        <div className="ppr-tabs">
                            {['all', 'active', 'archived', 'draft'].map((s) => (
                                <button key={s} onClick={() => setStatus(s)} className={status === s ? 'ppr-tab-active' : ''}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!filtered.length ? (
                        <div className="ppr-empty">
                            <div className="ppr-empty-icon"><RiStore3Line size={26} /></div>
                            <h4>No products yet</h4>
                            <p>Add your first product to start selling.</p>
                            <Link href="/seller/products/create" className="ppr-primary-btn">
                                <RiAddLine /> Add Product
                            </Link>
                        </div>
                    ) : (
                        <div className="ppr-list">
                            {filtered.map((product) => (
                                <div key={product.id} className="ppr-row">
                                    <div className="ppr-row-image">
                                        {product.primary_image ? (
                                            <img src={product.primary_image} alt={product.name} />
                                        ) : (
                                            <div className="ppr-row-placeholder"><RiImageLine size={18} /></div>
                                        )}
                                    </div>

                                    <div className="ppr-row-main">
                                        <p className="ppr-row-name">{product.name}</p>
                                        <div className="ppr-row-meta">
                                            <span className="ppr-row-price">₦{Number(product.price).toLocaleString()}</span>
                                            {product.compare_price && <span className="ppr-row-compare">₦{Number(product.compare_price).toLocaleString()}</span>}
                                            <span className="ppr-row-dot">·</span>
                                            <span>{product.stock_quantity ?? 0} left</span>
                                            {product.condition && <><span className="ppr-row-dot">·</span><span>{CONDITION_LABEL[product.condition] ?? product.condition}</span></>}
                                            {product.orders_count > 0 && <><span className="ppr-row-dot">·</span><span className="ppr-row-sold">{product.orders_count} sold</span></>}
                                        </div>
                                    </div>

                                    <span className={`ppr-status-chip ${product.status === 'active' ? 'ppr-chip-live' : 'ppr-chip-neutral'}`}>
                                        {STATUS_LABEL[product.status] ?? product.status}
                                    </span>

                                    <div className="ppr-row-actions">
                                        <a href={`/@${auth.user?.username}/products/${product.slug}`} target="_blank" className="ppr-icon-btn" title="View">
                                            <RiEyeLine size={15} />
                                        </a>
                                        <Link href={`/seller/products/${product.id}/edit`} className="ppr-icon-btn" title="Edit">
                                            <RiEditLine size={15} />
                                        </Link>
                                        <button onClick={() => handleToggleStatus(product)} className="ppr-icon-btn" title={product.status === 'active' ? 'Archive' : 'Activate'}>
                                            {product.status === 'active' ? <RiCloseLine size={15} /> : <RiCheckLine size={15} />}
                                        </button>
                                        <button onClick={() => setDeleteTarget(product)} className="ppr-icon-btn ppr-icon-danger" disabled={deleting === product.id} title="Delete">
                                            <RiDeleteBinLine size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
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
        .ppr-page { min-height: 100vh; background: #0a0a0a; color: white; font-family: "DM Sans", sans-serif; }
        .ppr-header { position: sticky; top: 0; z-index: 40; background: rgba(10,10,10,0.92); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .ppr-header-inner { max-width: 980px; margin: auto; padding: 0 24px; height: 64px; display: flex; align-items: center; gap: 14px; }
        .ppr-back { width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,0.06); border: none; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
        .ppr-back:hover { background: rgba(255,255,255,0.1); }
        .ppr-header h1 { margin: 0; font-size: 16px; font-weight: 700; }
        .ppr-header p { margin: 1px 0 0; font-size: 11px; color: rgba(255,255,255,0.35); }
        .ppr-primary-btn { display: flex; align-items: center; gap: 6px; padding: 0 16px; height: 40px; border-radius: 10px; background: #FF6B35; color: white; font-weight: 700; font-size: 13px; text-decoration: none; border: none; cursor: pointer; flex-shrink: 0; }
        .ppr-primary-btn:hover { background: #ff7a4a; }
        .ppr-content { max-width: 980px; margin: auto; padding: 22px 24px 90px; display: flex; flex-direction: column; gap: 16px; }
        .ppr-stat-strip { display: flex; align-items: center; background: #111; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 16px 8px; }
        .ppr-stat { flex: 1; text-align: center; }
        .ppr-stat strong { display: block; font-size: 17px; font-weight: 800; color: white; }
        .ppr-stat span { font-size: 11px; color: rgba(255,255,255,0.4); }
        .ppr-stat-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.07); }
        .ppr-filters { display: flex; flex-direction: column; gap: 10px; }
        .ppr-search { display: flex; align-items: center; gap: 10px; background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 12px 16px; color: rgba(255,255,255,0.4); }
        .ppr-search input { flex: 1; background: none; border: none; outline: none; color: white; font-size: 14px; }
        .ppr-tabs { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; background: #111; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 5px; }
        .ppr-tabs button { padding: 8px 14px; border-radius: 9px; border: none; background: transparent; color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
        .ppr-tab-active { background: #FF6B35 !important; color: white !important; }
        .ppr-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 70px 24px; text-align: center; background: #111; border: 1px dashed rgba(255,255,255,0.1); border-radius: 18px; }
        .ppr-empty-icon { width: 60px; height: 60px; border-radius: 16px; background: rgba(255,107,53,0.1); display: flex; align-items: center; justify-content: center; color: #FF6B35; }
        .ppr-empty h4 { margin: 0; font-size: 16px; font-weight: 700; color: white; }
        .ppr-empty p { margin: 0; font-size: 13px; color: rgba(255,255,255,0.4); }
        .ppr-list { display: flex; flex-direction: column; background: #111; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; }
        .ppr-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.05); }
        .ppr-row:first-child { border-top: none; }
        .ppr-row:hover { background: rgba(255,255,255,0.02); }
        .ppr-row-image { width: 52px; height: 52px; border-radius: 12px; overflow: hidden; background: #1a1a1a; flex-shrink: 0; }
        .ppr-row-image img { width: 100%; height: 100%; object-fit: cover; }
        .ppr-row-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.2); }
        .ppr-row-main { flex: 1; min-width: 0; }
        .ppr-row-name { color: #fff; font-weight: 600; font-size: 13px; margin: 0 0 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ppr-row-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 11px; color: rgba(255,255,255,0.4); }
        .ppr-row-price { color: #FF6B35; font-weight: 700; font-size: 13px; }
        .ppr-row-compare { text-decoration: line-through; color: rgba(255,255,255,0.25); }
        .ppr-row-dot { color: rgba(255,255,255,0.2); }
        .ppr-row-sold { color: rgba(255,255,255,0.5); }
        .ppr-status-chip { flex-shrink: 0; padding: 5px 11px; border-radius: 999px; font-size: 10px; font-weight: 700; }
        .ppr-chip-live { background: rgba(255,107,53,0.12); color: #FF6B35; }
        .ppr-chip-neutral { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); }
        .ppr-row-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .ppr-icon-btn { width: 32px; height: 32px; border-radius: 9px; background: rgba(255,255,255,0.05); border: none; color: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none; }
        .ppr-icon-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .ppr-icon-danger:hover { background: rgba(239,68,68,0.12); color: #EF4444; }
        .ppr-icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .ppr-pg-row { display: flex; justify-content: center; flex-wrap: wrap; gap: 6px; padding: 8px 0 4px; }
        .ppr-pg-btn { min-width: 34px; height: 34px; padding: 0 10px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.08); background: #111; color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 700; cursor: pointer; }
        .ppr-pg-btn:disabled { opacity: 0.25; cursor: not-allowed; }
        .ppr-pg-active { background: #FF6B35 !important; border-color: transparent !important; color: #fff !important; }
        @media (max-width: 640px) { .ppr-header-inner, .ppr-content { padding-left: 16px; padding-right: 16px; } .ppr-row-meta span:not(:first-child):not(:nth-child(2)) { display: none; } }
      `}</style>
        </>
    );
}

SellerProducts.layout = (page) => <AppLayout>{page}</AppLayout>;