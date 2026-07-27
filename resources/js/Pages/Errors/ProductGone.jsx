// resources/js/Pages/Errors/ProductGone.jsx
import { Head, Link, router } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import axios from 'axios'
import AppLayout from '@/Layouts/AppLayout'
import ProductCard from '@/Components/Product/ProductCard'
import { RiArrowRightLine, RiCompassDiscoverLine, RiShoppingBag3Line } from 'react-icons/ri'

export default function ProductGone({ categoryName = null, categoryId = null }) {
  const [alternatives, setAlternatives] = useState([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    const params = { per_page: 12, sort: 'popular' }
    if (categoryId) params.category_id = categoryId

    axios.get('/api/shop/products', { params })
      .then(r => setAlternatives(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [categoryId])

  return (
    <>
      <Head title="This drop has ended" />

      <div className="scroll-hidden bg-flockr-black h-screen overflow-y-auto">

        {/* ── Top banner ─────────────────────────────────────────────── */}
        <div style={{ padding: '48px 20px 36px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Tag icon */}
          <div style={{ width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg, rgba(255,92,0,0.15), rgba(255,92,0,0.04))', border: '1.5px solid rgba(255,92,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <RiShoppingBag3Line size={32} color="#ff5c00" style={{ opacity: 0.8 }} />
          </div>

          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 22, margin: '0 0 10px', letterSpacing: '-0.3px' }}>
            🏷️ This exclusive drop has ended
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0, lineHeight: 1.6, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
            This item has been removed by the merchant. But there's plenty more waiting for you.
          </p>
        </div>

        {/* ── Alternatives ────────────────────────────────────────────── */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 100px' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
                🔥 Don't miss out
              </p>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: 0, letterSpacing: '-0.2px' }}>
                Hot alternatives{categoryName ? ` in ${categoryName}` : ''}
              </h2>
            </div>
            <Link
              href="/shop"
              style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ff5c00', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}
            >
              View all <RiArrowRightLine size={14} />
            </Link>
          </div>

          {/* Horizontal scroll — same pattern as ProductShow */}
          {loading ? (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 8 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ flexShrink: 0, width: 156 }}>
                  <div className="bg-flockr-card rounded-flockr border border-white/[0.06]" style={{ overflow: 'hidden' }}>
                    <div className="skeleton" style={{ aspectRatio: '1' }} />
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="skeleton" style={{ height: 11, borderRadius: 5, width: '75%' }} />
                      <div className="skeleton" style={{ height: 14, borderRadius: 5, width: '40%' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : alternatives.length > 0 ? (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 8 }}>
              {alternatives.map(p => (
                <div key={p.id} style={{ flexShrink: 0, width: 156 }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          ) : null}

          {/* CTA */}
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <button
              onClick={() => router.visit('/')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', background: '#ff5c00', border: 'none', borderRadius: 999, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 30px rgba(255,92,0,0.3)' }}
            >
              <RiCompassDiscoverLine size={17} />
              Explore the Main Feed
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

ProductGone.layout = page => <AppLayout>{page}</AppLayout>