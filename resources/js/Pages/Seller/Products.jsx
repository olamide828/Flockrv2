import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import Toast, { useToast } from '@/Components/Toast';
import ConfirmModal from '@/Components/Community/ConfirmModal';
import {
    RiAddLine,
    RiArrowLeftLine,
    RiArrowUpLine,
    RiCheckLine,
    RiCloseLine,
    RiDeleteBinLine,
    RiEditLine,
    RiEyeLine,
    RiImageLine,
    RiSearchLine,
    RiStoreLine,
} from 'react-icons/ri';

const CONDITION_LABEL = { new: 'New', used: 'Used', refurbished: 'Refurb' };

function Pagination({ pagination, onNavigate }) {
    if (!pagination?.links || pagination.last_page <= 1) return null;
    return (
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6, padding: '20px 0 4px' }}>
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
            showToast(newStatus === 'active' ? 'Product activated.' : 'Product archived.', 'success');
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

            <div className="seller-page">
                <header className="page-header">
                    <div className="page-header-inner">
                        <div className="page-header-left">
                            <button type="button" onClick={() => window.history.back()} className="back-btn" aria-label="Go back">
                                <RiArrowLeftLine size={18} />
                            </button>
                            <div>
                                <h1>Products</h1>
                                <p>
                                    {pagination.total ?? filtered.length} product{(pagination.total ?? filtered.length) !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        <Link href="/seller/products/create" className="primary-btn">
                            <RiAddLine size={16} /> Add Product
                        </Link>
                    </div>
                </header>

                <main className="page-content">
                    {/* SUMMARY */}
                    <div className="summary-strip">
                        <div className="summary-card">
                            <RiStoreLine size={18} />
                            <div>
                                <span>{inStock}</span>
                                <p>In Stock</p>
                            </div>
                        </div>
                        <div className="summary-card">
                            <RiCloseLine size={18} />
                            <div>
                                <span>{outOfStock}</span>
                                <p>Out of Stock</p>
                            </div>
                        </div>
                        <div className="summary-card highlight">
                            <RiArrowUpLine size={18} />
                            <div>
                                <span>₦{totalValue.toLocaleString()}</span>
                                <p>Stock value (this page)</p>
                            </div>
                        </div>
                    </div>

                    {/* FILTERS */}
                    <div className="filters-row">
                        <div className="search-wrap">
                            <RiSearchLine size={15} />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products on this page..." />
                        </div>
                        <div className="status-tabs">
                            {['all', 'active', 'archived', 'draft'].map((s) => (
                                <button key={s} onClick={() => setStatus(s)} className={status === s ? 'active' : ''}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* PRODUCTS GRID */}
                    {!filtered.length ? (
                        <div className="table-card">
                            <div className="empty-state">
                                <RiStoreLine size={40} />
                                <h4>No products yet</h4>
                                <p>Add your first product to start selling.</p>
                                <Link href="/seller/products/create" className="empty-btn">
                                    <RiAddLine /> Add Product
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="products-grid">
                            {filtered.map((product) => (
                                <div key={product.id} className="product-card">
                                    <div className="product-image">
                                        {product.primary_image ? (
                                            <img src={product.primary_image} alt={product.name} />
                                        ) : (
                                            <div className="product-image-placeholder">
                                                <RiImageLine size={28} />
                                            </div>
                                        )}
                                        <div className="product-status-badge" style={statusBadgeStyle(product.status)}>
                                            {product.status}
                                        </div>
                                    </div>

                                    <div className="product-info">
                                        <h4>{product.name}</h4>
                                        <div className="product-meta-row">
                                            <span className="product-price">₦{Number(product.price).toLocaleString()}</span>
                                            {product.compare_price && (
                                                <span className="product-compare">₦{Number(product.compare_price).toLocaleString()}</span>
                                            )}
                                        </div>
                                        <div className="product-tags">
                                            <span className="tag">{product.stock_quantity ?? 0} in stock</span>
                                            {product.condition && (
                                                <span className="tag">{CONDITION_LABEL[product.condition] ?? product.condition}</span>
                                            )}
                                            {product.orders_count > 0 && <span className="tag orange">{product.orders_count} sold</span>}
                                        </div>
                                    </div>

                                    <div className="product-actions">
                                        <a href={`/@${auth.user?.username}/products/${product.slug}`} target="_blank" className="icon-btn" title="View">
                                            <RiEyeLine size={15} />
                                        </a>
                                        <Link href={`/seller/products/${product.id}/edit`} className="icon-btn" title="Edit">
                                            <RiEditLine size={15} />
                                        </Link>
                                        <button
                                            onClick={() => handleToggleStatus(product)}
                                            className="icon-btn"
                                            title={product.status === 'active' ? 'Archive' : 'Activate'}
                                        >
                                            {product.status === 'active' ? <RiCloseLine size={15} /> : <RiCheckLine size={15} />}
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(product)}
                                            className="icon-btn danger"
                                            disabled={deleting === product.id}
                                            title="Delete"
                                        >
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

            <style>{pageStyles}</style>
            <style>{`
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
        .product-card {
          background: #111; border: 1px solid rgba(255,255,255,0.05); border-radius: 24px;
          overflow: hidden; transition: border-color 0.15s;
        }
        .product-card:hover { border-color: rgba(255,255,255,0.12); }
        .product-image { position: relative; aspect-ratio: 1; background: #181818; overflow: hidden; }
        .product-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
        .product-card:hover .product-image img { transform: scale(1.04); }
        .product-image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.2); }
        .product-status-badge { position: absolute; top: 10px; left: 10px; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: capitalize; }
        .product-info { padding: 14px 16px 10px; }
        .product-info h4 { margin: 0 0 6px; font-size: 13px; font-weight: 600; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .product-meta-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
        .product-price { color: #ff6b35; font-weight: 800; font-size: 16px; }
        .product-compare { color: rgba(255,255,255,0.3); font-size: 12px; text-decoration: line-through; }
        .product-tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .tag { padding: 3px 9px; border-radius: 999px; background: rgba(255,255,255,0.06); font-size: 11px; color: rgba(255,255,255,0.5); }
        .tag.orange { background: rgba(255,107,53,0.12); color: #ff6b35; }
        .product-actions { display: flex; gap: 6px; padding: 10px 16px 14px; border-top: 1px solid rgba(255,255,255,0.04); }
        .icon-btn {
          flex: 1; height: 34px; border-radius: 10px; background: rgba(255,255,255,0.05); border: none;
          color: rgba(255,255,255,0.6); cursor: pointer; display: flex; align-items: center; justify-content: center;
          text-decoration: none; transition: all 0.15s; font-size: 13px;
        }
        .icon-btn:hover { background: rgba(255,255,255,0.1); color: white; }
        .icon-btn.danger:hover { background: rgba(239,68,68,0.15); color: #ef4444; }
        .icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .summary-strip { display: flex; gap: 14px; }
        .summary-card {
          flex: 1; background: #111; border: 1px solid rgba(255,255,255,0.05); border-radius: 20px;
          padding: 18px 20px; display: flex; align-items: center; gap: 14px; color: rgba(255,255,255,0.4);
        }
        .summary-card.highlight { color: #ff6b35; }
        .summary-card div span { display: block; font-size: 22px; font-weight: 800; color: white; }
        .summary-card.highlight div span { color: #ff6b35; }
        .summary-card div p { margin: 2px 0 0; font-size: 12px; }
        .filters-row { display: flex; flex-direction: column; gap: 12px; }
        .search-wrap {
          display: flex; align-items: center; gap: 10px; background: #111;
          border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 12px 16px; color: rgba(255,255,255,0.4);
        }
        .search-wrap input { flex: 1; background: none; border: none; outline: none; color: white; font-size: 14px; }
        .status-tabs { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
        .status-tabs button {
          padding: 7px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.07);
          background: #111; color: rgba(255,255,255,0.45); font-size: 12px; font-weight: 600;
          cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: all 0.15s;
        }
        .status-tabs button.active { background: white; color: black; border-color: white; }
        .empty-btn {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 14px;
          padding: 10px 18px; border-radius: 999px; background: white; color: black;
          text-decoration: none; font-weight: 700; font-size: 13px;
        }
        @media (max-width: 640px) { .products-grid { grid-template-columns: repeat(2, 1fr); } .summary-strip { flex-wrap: wrap; } }
      `}</style>
        </>
    );
}

SellerProducts.layout = (page) => <AppLayout>{page}</AppLayout>;

function statusBadgeStyle(status) {
    const map = {
        active: { background: 'rgba(16,185,129,0.15)', color: '#10B981' },
        archived: { background: 'rgba(156,163,175,0.15)', color: '#9CA3AF' },
        draft: { background: 'rgba(234,179,8,0.15)', color: '#EAB308' },
    };
    return map[status] ?? { background: 'rgba(255,255,255,0.08)', color: 'white' };
}

const pageStyles = `
  * { box-sizing: border-box; }
  .seller-page { min-height: 100vh; background: #0a0a0a; color: white; font-family: "DM Sans", sans-serif; }
  .page-header { position: sticky; top: 0; z-index: 40; background: rgba(10,10,10,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.05); }
  .page-header-inner { max-width: 1200px; margin: auto; padding: 0 24px; height: 68px; display: flex; align-items: center; justify-content: space-between; }
  .page-header-left { display: flex; align-items: center; gap: 14px; }
  .back-btn { width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,0.05); border: none; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none; flex-shrink: 0; }
  .primary-btn { display: flex; align-items: center; gap: 6px; padding: 0 18px; height: 40px; border-radius: 999px; background: white; color: black; font-weight: 700; font-size: 13px; text-decoration: none; }
  .page-header h1 { margin: 0; font-size: 18px; font-weight: 700; }
  .page-header p { margin: 2px 0 0; font-size: 12px; color: rgba(255,255,255,0.4); }
  .page-content { max-width: 1200px; margin: auto; padding: 28px 24px 100px; display: flex; flex-direction: column; gap: 20px; }
  .table-card { background: #111; border: 1px solid rgba(255,255,255,0.05); border-radius: 28px; overflow: hidden; }
  .empty-state { padding: 60px 24px; text-align: center; color: rgba(255,255,255,0.35); }
  .empty-state h4 { margin: 14px 0 6px; font-size: 16px; color: white; }
  .empty-state p { margin: 0; font-size: 13px; }
  @media (max-width: 640px) { .page-header-inner, .page-content { padding-left: 16px; padding-right: 16px; } }
`;