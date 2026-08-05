import { useEffect, useRef, useState, useCallback } from 'react'
import { RiCloseLine } from 'react-icons/ri'

const CARD_WIDTH = 220
const CARD_GAP = 16

export default function BadgeCarouselModal({ badges, initialIndex = 0, onClose }) {
    const scrollRef = useRef(null)
    const cardRefs = useRef([])
    const [scales, setScales] = useState(badges.map(() => 0.8))
    const rafRef = useRef(null)

    const updateScales = useCallback(() => {
        const container = scrollRef.current
        if (!container) return
        const containerCenter = container.scrollLeft + container.clientWidth / 2

        const next = cardRefs.current.map(el => {
            if (!el) return 0.8
            const cardCenter = el.offsetLeft + el.offsetWidth / 2
            const distance = Math.abs(cardCenter - containerCenter)
            const maxDistance = CARD_WIDTH + CARD_GAP
            const ratio = Math.min(1, distance / maxDistance)
            return 1 - ratio * 0.28 // 1.0 at center, down to ~0.72 at the edges
        })
        setScales(next)
    }, [])

    const handleScroll = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(updateScales)
    }, [updateScales])

    useEffect(() => {
        const container = scrollRef.current
        if (!container) return

        // Scroll the initially-clicked badge to center on open
        const target = cardRefs.current[initialIndex]
        if (target) {
            container.scrollLeft = target.offsetLeft + target.offsetWidth / 2 - container.clientWidth / 2
        }
        updateScales()

        container.addEventListener('scroll', handleScroll, { passive: true })
        return () => container.removeEventListener('scroll', handleScroll)
    }, [initialIndex, handleScroll, updateScales])

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }} />
            <div style={{ position: 'fixed', inset: 0, zIndex: 501, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 24, right: 24, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', pointerEvents: 'auto' }}>
                    <RiCloseLine size={18} />
                </button>

                <div
                    ref={scrollRef}
                    style={{
                        display: 'flex', gap: CARD_GAP,
                        overflowX: 'auto', overflowY: 'visible',
                        scrollSnapType: 'x mandatory',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none',
                        width: '100%',
                        padding: `40px calc(50% - ${CARD_WIDTH / 2}px)`,
                        pointerEvents: 'auto',
                    }}
                    className="badge-carousel-scroll"
                >
                    {badges.map((b, i) => {
                        const scale = scales[i] ?? 0.8
                        return (
                            <div
                                key={b.key}
                                ref={el => (cardRefs.current[i] = el)}
                                style={{
                                    flexShrink: 0,
                                    width: CARD_WIDTH,
                                    scrollSnapAlign: 'center',
                                    transform: `scale(${scale})`,
                                    opacity: 0.5 + scale * 0.5,
                                    transition: 'transform 0.05s linear',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                }}
                            >
                                <div style={{
                                    width: 140, height: 140, borderRadius: 28,
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 18,
                                    boxShadow: scale > 0.95 ? '0 12px 40px rgba(255,107,53,0.25)' : 'none',
                                    transition: 'box-shadow 0.15s ease',
                                }}>
                                    <img src={b.image_path} alt={b.label} style={{ width: 100, height: 100, objectFit: 'contain' }} />
                                </div>
                                <p style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: '0 0 6px' }}>{b.label}</p>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.5, margin: 0, maxWidth: 200 }}>{b.description}</p>
                            </div>
                        )
                    })}
                </div>
            </div>

            <style>{`.badge-carousel-scroll::-webkit-scrollbar { display: none; }`}</style>
        </>
    )
}