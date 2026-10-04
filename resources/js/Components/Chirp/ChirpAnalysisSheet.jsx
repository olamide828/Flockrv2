import { useState, useEffect } from 'react'
import { usePage } from '@inertiajs/react'
import axios from 'axios'
import { RiCloseLine } from 'react-icons/ri'
import ProductCard from '@/Components/Product/ProductCard'

function Skeleton({ width = '100%', height = 14, radius = 6, style = {} }) {
    return <div className="cs-skel" style={{ width, height, borderRadius: radius, ...style }} />
}

function ProductCardSkeleton() {
    return (
        <div style={{ borderRadius: 14, overflow: 'hidden' }}>
            <Skeleton height={140} radius={14} />
            <div style={{ padding: '8px 2px' }}>
                <Skeleton height={11} width="80%" style={{ marginBottom: 6 }} />
                <Skeleton height={11} width="40%" />
            </div>
        </div>
    )
}

export default function ChirpAnalysisSheet({ video, mode, onClose }) {
    const { chirp } = usePage().props
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')
    const [products, setProducts] = useState([])
    const [expanded, setExpanded] = useState(false)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true))
        axios.post('/api/chirp/video-insight', { video_id: video.id, mode })
            .then(({ data }) => { setMessage(data.message); setProducts(data.products ?? []) })
            .catch(() => setMessage("Sorry, I couldn't take a look just now — try again in a moment."))
            .finally(() => setLoading(false))
    }, [video.id, mode])

    const close = () => { setVisible(false); setTimeout(onClose, 220) }
    const isLong = message.length > 180
    const displayText = !expanded && isLong ? message.slice(0, 180) + '…' : message

    return (
        <>
            <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 960, background: 'rgba(0,0,0,0.65)', opacity: visible ? 1 : 0, transition: 'opacity 0.22s ease' }} />
            <div style={{
                position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 961, maxWidth: 480, margin: '0 auto',
                height: '90vh', display: 'flex', flexDirection: 'column',
                background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none',
                borderRadius: '24px 24px 0 0',
                transform: visible ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
            }}>
                <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)', margin: '10px auto 0', flexShrink: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                    {chirp?.avatar_url && <img src={chirp.avatar_url} alt="Chirp" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />}
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 14 }}>{mode === 'style' ? 'Style with Chirp' : 'Ask Chirp'}</p>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{loading ? 'Watching the video…' : 'About this product'}</p>
                    </div>
                    <button onClick={close} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer' }}><RiCloseLine size={16} /></button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
                    {loading ? (
                        <>
                            <Skeleton height={13} width="95%" style={{ marginBottom: 8 }} />
                            <Skeleton height={13} width="88%" style={{ marginBottom: 8 }} />
                            <Skeleton height={13} width="60%" style={{ marginBottom: 22 }} />
                            <Skeleton height={11} width={120} style={{ marginBottom: 12 }} />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                                {[0, 1, 2, 3].map(i => <ProductCardSkeleton key={i} />)}
                            </div>
                        </>
                    ) : (
                        <>
                            <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{displayText}</p>
                            {isLong && (
                                <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', color: '#FF6B35', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: '6px 0' }}>
                                    {expanded ? 'Show less' : 'See more'}
                                </button>
                            )}

                            <div style={{ marginTop: 18 }}>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                                    {mode === 'style' ? 'Pairs well with' : 'Similar products'}
                                </p>
                                {products.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                                        {products.map(p => <ProductCard key={p.id} product={p} />)}
                                    </div>
                                ) : (
                                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                                        I couldn't find anything similar on Flockr right now — check back soon!
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
            <style>{`
                .cs-skel { background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 37%, rgba(255,255,255,0.05) 63%); background-size: 400% 100%; animation: csShimmer 1.4s ease infinite; }
                @keyframes csShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
            `}</style>
        </>
    )
}