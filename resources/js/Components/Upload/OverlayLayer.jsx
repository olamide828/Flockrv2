import { useEffect, useRef, useState } from 'react'
import { RiDeleteBin6Line } from 'react-icons/ri'
import OverlayBlock from './OverlayBlock'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const SNAP = 4   // degrees

/**
 * Text layers on top of the preview, with the gestures people expect:
 *   drag to move · pinch to resize + rotate · tap to edit · drag onto the bin to delete.
 * Rotation snaps to 0° / 90° like Instagram.
 */
export default function OverlayLayer({ overlays, frameRef, hiddenId, onUpdate, onRemove, onEdit, onGesture }) {
    const g = useRef(null)
    const trashRef = useRef(null)
    const overlaysRef = useRef(overlays)
    overlaysRef.current = overlays
    const cb = useRef({})
    cb.current = { onUpdate, onRemove, onEdit, onGesture }

    const [dragging, setDragging] = useState(false)
    const [overTrash, setOverTrash] = useState(false)
    const [activeId, setActiveId] = useState(null)

    const snapshot = (id) => {
        const o = overlaysRef.current.find(x => x.id === id)
        return o ? { cx: o.cx, cy: o.cy, scale: o.scale, rotation: o.rotation } : null
    }

    const hitTrash = (x, y) => {
        const r = trashRef.current?.getBoundingClientRect()
        if (!r) return false
        return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) < 70
    }

    // The handlers live in a ref, and the listeners attached to window are created once,
    // so adding and removing them always refers to the same function objects.
    const h = useRef({})
    const stable = useRef(null)
    if (!stable.current) {
        stable.current = {
            move: (e) => h.current.move(e),
            up: (e) => h.current.up(e),
            down: (e) => h.current.down(e),
        }
    }
    const stableMove = stable.current.move
    const stableUp = stable.current.up
    const stableDown = stable.current.down
    h.current.move = (e) => {
        const s = g.current
        if (!s || !s.ptrs.has(e.pointerId)) return
        if (e.cancelable) e.preventDefault()
        s.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const pts = [...s.ptrs.values()]
        const { rect } = s

        if (pts.length >= 2 && s.two) {
            const [a, b] = pts
            const dist = Math.hypot(a.x - b.x, a.y - b.y)
            const angle = Math.atan2(b.y - a.y, b.x - a.x)
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
            let rot = s.base.rotation + ((angle - s.two.angle) * 180) / Math.PI
            const snapped = Math.round(rot / 90) * 90
            if (Math.abs(rot - snapped) < SNAP) rot = snapped
            cb.current.onUpdate(s.id, {
                scale: clamp(s.base.scale * (dist / s.two.dist), 0.3, 6),
                rotation: rot,
                cx: clamp(s.base.cx + ((mid.x - s.two.mid.x) / rect.width) * 100, 0, 100),
                cy: clamp(s.base.cy + ((mid.y - s.two.mid.y) / rect.height) * 100, 0, 100),
            })
            return
        }

        const p = pts[0]
        const dx = p.x - s.start.x
        const dy = p.y - s.start.y
        if (!s.moved && Math.hypot(dx, dy) > 6) {
            s.moved = true
            setDragging(true)
            cb.current.onGesture?.(true)
        }
        if (s.moved) {
            cb.current.onUpdate(s.id, {
                cx: clamp(s.base.cx + (dx / rect.width) * 100, 0, 100),
                cy: clamp(s.base.cy + (dy / rect.height) * 100, 0, 100),
            })
            const over = hitTrash(p.x, p.y)
            s.over = over
            setOverTrash(over)
        }
    }

    h.current.down = (e) => {                       // a second finger landing anywhere
        const s = g.current
        if (!s || s.ptrs.has(e.pointerId) || s.ptrs.size >= 2) return
        s.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const [a, b] = [...s.ptrs.values()]
        s.base = snapshot(s.id) || s.base
        s.two = { dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), angle: Math.atan2(b.y - a.y, b.x - a.x), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
        if (!s.moved) { s.moved = true; setDragging(true); cb.current.onGesture?.(true) }
    }

    h.current.up = (e) => {
        const s = g.current
        if (!s || !s.ptrs.has(e.pointerId)) return
        s.ptrs.delete(e.pointerId)

        if (s.ptrs.size >= 1) {                     // went from two fingers to one: carry on dragging without a jump
            const p = [...s.ptrs.values()][0]
            s.base = snapshot(s.id) || s.base
            s.start = { x: p.x, y: p.y, t: s.start.t }
            s.two = null
            return
        }

        const wasTap = !s.moved && performance.now() - s.start.t < 400
        const { id, over } = s
        window.removeEventListener('pointermove', stableMove)
        window.removeEventListener('pointerup', stableUp)
        window.removeEventListener('pointercancel', stableUp)
        window.removeEventListener('pointerdown', stableDown)
        g.current = null
        setDragging(false)
        setOverTrash(false)
        setActiveId(null)
        cb.current.onGesture?.(false)
        if (over && e.type !== 'pointercancel') cb.current.onRemove(id)
        else if (wasTap) cb.current.onEdit(id)
    }

    const begin = (e, id) => {
        if (g.current) return
        e.stopPropagation()
        const frame = frameRef.current
        const base = snapshot(id)
        if (!frame || !base) return
        g.current = {
            id,
            rect: frame.getBoundingClientRect(),
            ptrs: new Map([[e.pointerId, { x: e.clientX, y: e.clientY }]]),
            base,
            start: { x: e.clientX, y: e.clientY, t: performance.now() },
            moved: false,
            two: null,
            over: false,
        }
        setActiveId(id)
        window.addEventListener('pointermove', stableMove, { passive: false })
        window.addEventListener('pointerup', stableUp)
        window.addEventListener('pointercancel', stableUp)
        window.addEventListener('pointerdown', stableDown)
    }

    useEffect(() => () => {
        window.removeEventListener('pointermove', stableMove)
        window.removeEventListener('pointerup', stableUp)
        window.removeEventListener('pointercancel', stableUp)
        window.removeEventListener('pointerdown', stableDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', overflow: 'hidden' }}>
            {overlays.map(o => (
                <div
                    key={o.id}
                    data-overlay={o.id}
                    onPointerDown={e => begin(e, o.id)}
                    style={{
                        position: 'absolute',
                        left: `${o.cx}%`,
                        top: `${o.cy}%`,
                        width: o.block_w,
                        height: o.block_h,
                        transform: `translate(-50%, -50%) rotate(${o.rotation}deg) scale(${o.scale})`,
                        pointerEvents: 'auto',
                        touchAction: 'none',
                        cursor: 'grab',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        visibility: hiddenId === o.id ? 'hidden' : 'visible',
                        opacity: activeId === o.id && overTrash ? 0.45 : 1,
                        outline: activeId === o.id && dragging ? '1.5px dashed rgba(255,255,255,0.6)' : 'none',
                        outlineOffset: 10,
                    }}
                >
                    {/* generous touch target around small text */}
                    <div style={{ position: 'absolute', inset: -14 }} />
                    <OverlayBlock overlay={o} />
                </div>
            ))}

            {dragging && (
                <div
                    ref={trashRef}
                    style={{
                        position: 'absolute', left: '50%', bottom: 'calc(env(safe-area-inset-bottom) + 30px)',
                        width: overTrash ? 72 : 56, height: overTrash ? 72 : 56, marginLeft: overTrash ? -36 : -28,
                        borderRadius: '50%', background: overTrash ? '#EF4444' : 'rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease',
                    }}
                >
                    <RiDeleteBin6Line size={overTrash ? 30 : 24} color="#fff" />
                </div>
            )}
        </div>
    )
}
