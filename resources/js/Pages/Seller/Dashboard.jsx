import { useState } from "react"
import { Head, Link } from "@inertiajs/react"
import AppLayout from "@/Layouts/AppLayout"

import {
  RiMoneyDollarCircleLine,
  RiShoppingBagLine,
  RiEyeLine,
  RiUserFollowLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiUploadCloud2Line,
  RiVideoLine,
  RiStoreLine,
  RiBankCardLine,
  RiSettings4Line,
  RiAddLine,
  RiArrowRightLine,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiTruckLine,
  RiGiftLine,
  RiCloseCircleLine,
  RiRefreshLine,
  RiPlayCircleLine,
  RiHeartLine,
  RiLoader4Line,
} from "react-icons/ri"

import { MdOutlineStorefront } from "react-icons/md"

export default function SellerDashboard({
  stats,
  recentOrders,
  topProducts,
  recentVideos,
}) {
  const [period, setPeriod] = useState("30d")

  const kpis = [
    {
      label: "Revenue",
      value: `₦${Number(stats?.revenue ?? 0).toLocaleString()}`,
      icon: RiMoneyDollarCircleLine,
      change: stats?.revenue_change,
      highlight: true,
    },
    {
      label: "Orders",
      value: stats?.orders_count ?? 0,
      icon: RiShoppingBagLine,
      change: stats?.orders_change,
    },
    {
      label: "Views",
      value: formatCount(stats?.views_count ?? 0),
      icon: RiEyeLine,
      change: stats?.views_change,
    },
    {
      label: "Followers",
      value: formatCount(stats?.followers_count ?? 0),
      icon: RiUserFollowLine,
      change: stats?.followers_change,
    },
  ]

  const quickActions = [
    {
      href: "/seller/products/create",
      icon: RiAddLine,
      label: "Add Product",
    },
    {
      href: "/seller/upload",
      icon: RiUploadCloud2Line,
      label: "Upload Video",
    },
    {
      href: "/seller/payouts",
      icon: RiBankCardLine,
      label: "Payouts",
    },
    {
      href: "/seller/settings",
      icon: RiSettings4Line,
      label: "Settings",
    },
  ]

  return (
    <>
      <Head title="Seller Dashboard" />

      <div className="seller-dashboard">

        {/* HEADER */}
        <header className="dashboard-header">
          <div className="dashboard-header-inner">

            <div className="dashboard-brand">
              <div className="dashboard-logo">
                <MdOutlineStorefront size={18} />
              </div>

              <div>
                <h1>Dashboard</h1>
                <p>Seller Studio</p>
              </div>
            </div>

            <div className="dashboard-header-actions">

              <div className="period-switcher">
                {["7d", "30d", "90d"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={period === p ? "active" : ""}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>

              <Link href="/seller/upload" className="upload-btn">
                <RiUploadCloud2Line size={16} />
                Upload
              </Link>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="dashboard-content">

          {/* HERO */}
          <section className="hero-section">
            <div>
              <p className="hero-subtitle">Welcome back</p>
              <h2>Your store is growing</h2>
            </div>

            <div className="hero-stat-card">
              <span>This Month</span>
              <strong>+24% Sales</strong>
            </div>
          </section>

          {/* KPI GRID */}
          <section className="kpi-grid">
            {kpis.map((kpi) => {
              const Icon = kpi.icon
              const up = (kpi.change ?? 0) >= 0

              return (
                <div className="kpi-card" key={kpi.label}>

                  <div className="kpi-top">
                    <div className="kpi-icon">
                      <Icon size={20} />
                    </div>

                    {kpi.change != null && (
                      <div className={`kpi-change ${up ? "up" : "down"}`}>
                        {up ? (
                          <RiArrowUpLine size={12} />
                        ) : (
                          <RiArrowDownLine size={12} />
                        )}

                        <span>{Math.abs(kpi.change)}%</span>
                      </div>
                    )}
                  </div>

                  <h3 className={kpi.highlight ? "highlight" : ""}>
                    {kpi.value}
                  </h3>

                  <p>{kpi.label}</p>
                </div>
              )
            })}
          </section>

          {/* MAIN GRID */}
          <section className="main-grid">

            {/* RECENT ORDERS */}
            <div className="dashboard-card">

              <div className="card-header">
                <div className="card-title">
                  <RiShoppingBagLine />
                  <h3>Recent Orders</h3>
                </div>

                <Link href="/seller/orders">
                  View all
                  <RiArrowRightLine />
                </Link>
              </div>

              {!recentOrders?.length ? (
                <div className="empty-state">
                  <RiShoppingBagLine size={34} />
                  <h4>No orders yet</h4>
                  <p>Share your videos to drive sales.</p>
                </div>
              ) : (
                <div className="orders-list">
                  {recentOrders.map((order) => (
                    <div className="order-row" key={order.id}>

                      <div
                        className="order-icon"
                        style={{
                          background: statusColor(order.status).bg,
                          color: statusColor(order.status).text,
                        }}
                      >
                        {statusIcon(order.status)}
                      </div>

                      <div className="order-meta">
                        <h4>{order.reference}</h4>

                        <p>
                          {order.buyer?.name} • {order.items_count} item
                          {order.items_count !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="order-right">
                        <strong>
                          ₦{Number(order.total).toLocaleString()}
                        </strong>

                        <span
                          className="status-pill"
                          style={{
                            background: statusColor(order.status).bg,
                            color: statusColor(order.status).text,
                          }}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TOP PRODUCTS */}
            <div className="dashboard-card">

              <div className="card-header">
                <div className="card-title">
                  <RiStoreLine />
                  <h3>Top Products</h3>
                </div>

                <Link href="/seller/products">
                  Manage
                  <RiArrowRightLine />
                </Link>
              </div>

              {!topProducts?.length ? (
                <div className="empty-state">
                  <RiStoreLine size={34} />

                  <h4>No products yet</h4>

                  <Link href="/seller/products/create" className="empty-btn">
                    <RiAddLine />
                    Add Product
                  </Link>
                </div>
              ) : (
                <div className="products-list">
                  {topProducts.map((product, index) => (
                    <div className="product-row" key={product.id}>

                      <span className="product-rank">
                        {index + 1}
                      </span>

                      <div className="product-thumb">
                        {product.primary_image ? (
                          <img
                            src={product.primary_image}
                            alt={product.name}
                          />
                        ) : (
                          <RiStoreLine />
                        )}
                      </div>

                      <div className="product-meta">
                        <h4>{product.name}</h4>
                        <p>{product.orders_count} sold</p>
                      </div>

                      <strong className="product-price">
                        ₦{Number(product.price).toLocaleString()}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* VIDEOS */}
          <section className="dashboard-card">

            <div className="card-header">
              <div className="card-title">
                <RiVideoLine />
                <h3>Your Videos</h3>
              </div>

              <Link href="/seller/videos">
                View all
                <RiArrowRightLine />
              </Link>
            </div>

            <div className="video-grid">

              {/* Upload Tile */}
              <Link href="/seller/upload" className="upload-tile">
                <div>
                  <div className="upload-circle">
                    <RiAddLine size={22} />
                  </div>

                  <span>New Video</span>
                </div>
              </Link>

              {recentVideos?.map((video) => (
                <Link
                  key={video.id}
                  href={`/video/${video.id}`}
                  className="video-tile"
                >
                  {video.thumbnail_url_full ? (
                    <img
                      src={video.thumbnail_url_full}
                      alt={video.title}
                    />
                  ) : (
                    <div className="video-empty">
                      <RiPlayCircleLine size={28} />
                    </div>
                  )}

                  <div className="video-overlay">
                    <div className="video-stats">
                      <span>
                        <RiEyeLine />
                        {formatCount(video.views_count)}
                      </span>

                      <span>
                        <RiHeartLine />
                        {formatCount(video.likes_count)}
                      </span>
                    </div>
                  </div>

                  {video.status !== "active" && (
                    <div className="video-badge">
                      {video.status === "processing" && (
                        <RiLoader4Line size={10} />
                      )}

                      <span>{video.status}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>

          {/* QUICK ACTIONS */}
          <section className="quick-grid">
            {quickActions.map((action) => {
              const Icon = action.icon

              return (
                <Link
                  href={action.href}
                  key={action.href}
                  className="quick-card"
                >
                  <div className="quick-icon">
                    <Icon size={22} />
                  </div>

                  <span>{action.label}</span>
                </Link>
              )
            })}
          </section>

        </main>
      </div>

      {/* VANILLA CSS */}
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body,
        #app {
          min-height: 100%;
          overflow-x: hidden;
          overflow-y: auto;
          background: #0a0a0a;
        }

        .seller-dashboard {
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  background: #0a0a0a;
  color: white;
  font-family: "DM Sans", sans-serif;

  scrollbar-width: none;
  -ms-overflow-style: none;
}

.seller-dashboard::-webkit-scrollbar {
  display: none;
}

        .dashboard-header {
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(20px);
          background: rgba(10,10,10,0.8);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .dashboard-header-inner {
          max-width: 1200px;
          height: 72px;
          margin: auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dashboard-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .dashboard-logo {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff6b35;
        }

        .dashboard-brand h1 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
        }

        .dashboard-brand p {
          margin: 2px 0 0;
          font-size: 12px;
          color: rgba(255,255,255,0.45);
        }

        .dashboard-header-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .period-switcher {
          display: flex;
          background: #111111;
          padding: 4px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .period-switcher button {
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.5);
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .period-switcher button.active {
          background: white;
          color: black;
        }

        .upload-btn {
          height: 42px;
          padding: 0 18px;
          border-radius: 999px;
          background: white;
          color: black;
          display: flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        .dashboard-content {
          max-width: 1200px;
          margin: auto;
          padding: 28px 24px 100px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .hero-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .hero-subtitle {
          margin: 0;
          font-size: 13px;
          color: rgba(255,255,255,0.45);
        }

        .hero-section h2 {
          margin: 4px 0 0;
          font-size: 38px;
          line-height: 1;
          letter-spacing: -2px;
        }

        .hero-stat-card {
          background: #111111;
          border: 1px solid rgba(255,255,255,0.05);
          padding: 16px 20px;
          border-radius: 22px;
        }

        .hero-stat-card span {
          display: block;
          font-size: 12px;
          color: rgba(255,255,255,0.45);
          margin-bottom: 4px;
        }

        .hero-stat-card strong {
          font-size: 20px;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit,minmax(220px,1fr));
          gap: 16px;
        }

        .kpi-card,
        .dashboard-card,
        .quick-card {
          background: #111111;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .kpi-card {
          padding: 24px;
          border-radius: 26px;
        }

        .kpi-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .kpi-icon {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          background: rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kpi-change {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 700;
        }

        .kpi-change.up {
          color: #22c55e;
        }

        .kpi-change.down {
          color: #ef4444;
        }

        .kpi-card h3 {
          margin: 22px 0 6px;
          font-size: 34px;
          letter-spacing: -1px;
        }

        .kpi-card h3.highlight {
          color: #ff6b35;
        }

        .kpi-card p {
          margin: 0;
          color: rgba(255,255,255,0.45);
          font-size: 13px;
        }

        .main-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit,minmax(340px,1fr));
          gap: 18px;
        }

        .dashboard-card {
          border-radius: 28px;
          overflow: hidden;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 22px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .card-title h3 {
          margin: 0;
          font-size: 15px;
        }

        .card-header a {
          color: #ff6b35;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
        }

        .empty-state {
          padding: 60px 24px;
          text-align: center;
          color: rgba(255,255,255,0.4);
        }

        .empty-state h4 {
          margin: 16px 0 8px;
        }

        .empty-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 14px;
          padding: 10px 18px;
          border-radius: 999px;
          background: white;
          color: black;
          text-decoration: none;
          font-weight: 700;
        }

        .order-row,
        .product-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 22px;
        }

        .order-row:not(:last-child),
        .product-row:not(:last-child) {
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        .order-icon,
        .product-thumb {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .product-thumb {
          overflow: hidden;
          background: rgba(255,255,255,0.05);
        }

        .product-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .order-meta,
        .product-meta {
          flex: 1;
          min-width: 0;
        }

        .order-meta h4,
        .product-meta h4 {
          margin: 0;
          font-size: 14px;
        }

        .order-meta p,
        .product-meta p {
          margin: 4px 0 0;
          font-size: 12px;
          color: rgba(255,255,255,0.45);
        }

        .order-right {
          text-align: right;
        }

        .status-pill {
          display: inline-block;
          margin-top: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .product-price {
          color: #ff6b35;
        }

        .product-rank {
          color: rgba(255,255,255,0.3);
          font-size: 12px;
          width: 18px;
        }

        .video-grid {
          padding: 18px;
          display: grid;
          grid-template-columns: repeat(auto-fill,minmax(140px,1fr));
          gap: 12px;
        }

        .upload-tile,
        .video-tile {
          position: relative;
          aspect-ratio: 9/16;
          border-radius: 24px;
          overflow: hidden;
          text-decoration: none;
        }

        .upload-tile {
          border: 1.5px dashed rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .upload-circle {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: auto auto 10px;
        }

        .video-tile {
          background: #181818;
          transition: transform 0.2s ease;
        }

        .video-tile:hover {
          transform: scale(1.02);
        }

        .video-tile img,
        .video-empty {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.3);
        }

        .video-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent 55%);
          display: flex;
          align-items: flex-end;
          padding: 10px;
        }

        .video-stats {
          display: flex;
          gap: 10px;
        }

        .video-stats span {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: white;
        }

        .video-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: white;
        }

        .quick-grid {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 14px;
        }

        .quick-card {
          padding: 22px;
          border-radius: 24px;
          text-decoration: none;
          color: white;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: transform 0.2s ease;
        }

        .quick-card:hover {
          transform: translateY(-2px);
        }

        .quick-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 900px) {
          .hero-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 18px;
          }

          .quick-grid {
            grid-template-columns: repeat(2,1fr);
          }
        }

        @media (max-width: 640px) {
          .dashboard-header-inner {
            padding: 0 16px;
          }

          .dashboard-content {
            padding: 20px 16px 100px;
          }

          .period-switcher {
            display: none;
          }

          .hero-section h2 {
            font-size: 30px;
          }

          .quick-grid {
            grid-template-columns: 1fr;
          }

          .video-grid {
            grid-template-columns: repeat(2,1fr);
          }
        }
      `}</style>
    </>
  )
}

SellerDashboard.layout = (page) => <AppLayout>{page}</AppLayout>

function formatCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return String(n)
}

function statusColor(status) {
  const map = {
    pending: {
      bg: "rgba(234,179,8,0.12)",
      text: "#EAB308",
    },

    paid: {
      bg: "rgba(16,185,129,0.12)",
      text: "#10B981",
    },

    confirmed: {
      bg: "rgba(59,130,246,0.12)",
      text: "#3B82F6",
    },

    processing: {
      bg: "rgba(139,92,246,0.12)",
      text: "#8B5CF6",
    },

    shipped: {
      bg: "rgba(59,130,246,0.12)",
      text: "#3B82F6",
    },

    delivered: {
      bg: "rgba(16,185,129,0.12)",
      text: "#10B981",
    },

    cancelled: {
      bg: "rgba(239,68,68,0.12)",
      text: "#EF4444",
    },

    refunded: {
      bg: "rgba(156,163,175,0.12)",
      text: "#9CA3AF",
    },
  }

  return (
    map[status] ?? {
      bg: "rgba(255,255,255,0.08)",
      text: "#fff",
    }
  )
}

function statusIcon(status) {
  const size = 14

  const map = {
    pending: <RiTimeLine size={size} />,
    paid: <RiCheckboxCircleLine size={size} />,
    confirmed: <RiCheckboxCircleLine size={size} />,
    processing: <RiLoader4Line size={size} />,
    shipped: <RiTruckLine size={size} />,
    delivered: <RiGiftLine size={size} />,
    cancelled: <RiCloseCircleLine size={size} />,
    refunded: <RiRefreshLine size={size} />,
  }

  return map[status] ?? <RiShoppingBagLine size={size} />
}