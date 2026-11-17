import { useEffect, useRef, useState } from 'react'

/**
 * Swipeable photo set for VideoCard / VideoShow (up to 30 photos).
 * The dot indicator never shows more than 3 dots: it slides along with you, like Instagram.
 *   - the active dot is bright and larger, dots at the edge of the window shrink to hint there is more.
 */
export function windowDots(count, active, size = 3) {
    if (count <= size) return { start: 0, end: count }
    let start = Math.max(0, Math.min(active - 1, count - size))
    return { start, end: start + size }
}

export function Dots({ count, active }) {
    if (count < 2) return null
    const { start, end } = windowDots(count, active)
    const items = []
    for (let i = start; i < end; i++) {
        const isActive = i === active
        const atEdge = (i === start && start > 0) || (i === end - 1 && end < count)
        items.push(
            <i key={i} style={{
                width: isActive ? 8 : atEdge ? 4 : 6, height: isActive ? 8 : atEdge ? 4 : 6, borderRadius: '50%',
                background: isActive ? '#fff' : 'rgba(255,255,255,.45)', transition: 'all .2s ease', display: 'block',
            }} />,
        )
    }
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 10 }} aria-label={`Photo ${active + 1} of ${count}`}>
            {items}
        </div>
    )
}

export default function PhotoCarousel({ photos = [], onIndex, onTap, style, fit = 'contain' }) {
    const ref = useRef(null)
    const [idx, setIdx] = useState(0)
    const raf = useRef(0)

    const onScroll = () => {
        cancelAnimationFrame(raf.current)
        raf.current = requestAnimationFrame(() => {
            const el = ref.current
            if (!el || !el.clientWidth) return
            const i = Math.round(el.scrollLeft / el.clientWidth)
            setIdx(prev => (prev === i ? prev : i))
        })
    }
    useEffect(() => { onIndex?.(idx) }, [idx])
    useEffect(() => () => cancelAnimationFrame(raf.current), [])

    return (
        <>
            <div
                ref={ref}
                onScroll={onScroll}
                onClick={onTap}
                // horizontal swipes belong to the carousel; vertical ones still move the feed
                style={{ position: 'absolute', inset: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y', overscrollBehaviorX: 'contain', ...style }}
            >
                {photos.map((src, i) => (
                    <div key={i} style={{ flex: '0 0 100%', height: '100%', scrollSnapAlign: 'center', scrollSnapStop: 'always', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                        <img src={src} alt="" draggable={false} loading={i < 2 ? 'eager' : 'lazy'} decoding="async"
                            style={{ width: '100%', height: '100%', objectFit: fit, userSelect: 'none', WebkitUserDrag: 'none' }} />
                    </div>
                ))}
            </div>
            {photos.length > 1 && (
                <>
                    <div style={{ position: 'absolute', top: 62, right: 14, zIndex: 8, padding: '3px 9px', borderRadius: 999, background: 'rgba(0,0,0,.5)', color: '#fff', fontSize: 11.5, fontWeight: 700, pointerEvents: 'none' }}>{idx + 1}/{photos.length}</div>
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 6, zIndex: 8, pointerEvents: 'none' }}>
                        <Dots count={photos.length} active={idx} />
                    </div>
                </>
            )}
        </>
    )
}
