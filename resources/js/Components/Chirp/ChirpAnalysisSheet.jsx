import { useState, useEffect } from 'react'
import { usePage } from '@inertiajs/react'
import axios from 'axios'
import { RiCloseLine } from 'react-icons/ri'
import ProductCard from '@/Components/ProductCard'

function TypingLoader() {
    return (
        <div style={{ display: 'flex', gap: 4, padding: '10px 4px' }}>
            {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: `cDot 1.2s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }} />
            ))}
        </div>
    )
}

export default function ChirpAnalysisSheet({ video, mode, onClose }) {
    const { chirp } = usePage().props
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')
    const [products, setProducts] = useState([])
    const [expanded, setExpanded] = useState(false)

    useEffect(() => {
        axios.post('/api/chirp/video-insight', { video_id: video.id, mode })
            .then(({ data }) => { setMessage(data.message); setProducts(data.products ?? []) })
            .catch(() => setMessage("Sorry, I couldn't take a look just now — try again in a moment."))
            .finally(() => setLoading(false))
    }, [video.id, mode])

    const isLong = message.length > 180
    const displayText = !expanded && isLong ? message.slice(0, 180) + '…' : message

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 960, background: 'rgba(0,0,0,0.6)' }} />
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 961, maxWidth: 480, margin: '0 auto', height: '82vh', display: 'flex', flexDirection: 'column', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', borderRadius: '22px 22px 0 0' }}>
                <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)', margin: '10px auto 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {chirp?.avatar_url && <img src={chirp.avatar_url} alt="Chirp" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />}
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 14 }}>{mode === 'style' ? 'Style with Chirp' : 'Ask Chirp'}</p>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>About this product</p>
                    </div>
                    <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer' }}><RiCloseLine size={16} /></button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                    {loading ? (
                        <TypingLoader />
                    ) : (
                        <>
                            <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{displayText}</p>
                            {isLong && (
                                <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', color: '#FF6B35', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: '6px 0' }}>
                                    {expanded ? 'Show less' : 'See more'}
                                </button>
                            )}

                            {products.length > 0 && (
                                <div style={{ marginTop: 18 }}>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                                        {mode === 'style' ? 'Pairs well with' : 'Similar products'}
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                                        {products.map(p => <ProductCard key={p.id} product={p} />)}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            <style>{`@keyframes cDot { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }`}</style>
        </>
    )
}