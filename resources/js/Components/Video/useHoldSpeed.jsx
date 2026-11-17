import { useCallback, useEffect, useRef, useState } from 'react'
import { RiSpeedUpLine, RiLockLine } from 'react-icons/ri'

const HOLD_MS = 320       // press this long on a side to start 2x
const LOCK_SLIDE = 56     // slide up this many px while holding to lock 2x
const EDGE = 0.35         // left/right 35% of the screen are the hold zones

/**
 * Hold the left/right side of a video to play at 2x. Release = back to normal.
 * While holding, slide up (or keep holding ~1.2s more) to LOCK 2x so you can let go.
 * Tap anywhere while locked to go back to normal.
 *
 * const hs = useHoldSpeed(videoRef)
 * <div {...hs.handlers} onClick={e => { if (hs.consumeClick()) return; ... }} />
 * {hs.indicator}
 */
export default function useHoldSpeed(videoRef) {
    const [state, setState] = useState('off') // off | hold | locked
    const timer = useRef(null)
    const lockTimer = useRef(null)
    const start = useRef(null)
    const active = useRef(false)
    const suppressClick = useRef(false)
    const stateRef = useRef('off')

    const set = (s) => { stateRef.current = s; setState(s) }
    const rate = (r) => { const el = videoRef.current; if (el) el.playbackRate = r }

    const end = useCallback(() => {
        clearTimeout(timer.current); clearTimeout(lockTimer.current)
        timer.current = lockTimer.current = null
        if (active.current && stateRef.current === 'hold') { rate(1); set('off') }
        active.current = false
        start.current = null
    }, [])

    useEffect(() => () => { clearTimeout(timer.current); clearTimeout(lockTimer.current) }, [])

    const onPointerDown = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        // locked: the next tap exits (handled in consumeClick)
        if (stateRef.current === 'locked') return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        if (x > EDGE && x < 1 - EDGE) return // centre keeps tap/double-tap behaviour
        start.current = { x: e.clientX, y: e.clientY }
        timer.current = setTimeout(() => {
            active.current = true
            suppressClick.current = true
            rate(2); set('hold')
            try { navigator.vibrate?.(12) } catch {}
            lockTimer.current = setTimeout(() => {
                if (active.current) { set('locked'); active.current = false; try { navigator.vibrate?.(18) } catch {} }
            }, 1200)
        }, HOLD_MS)
    }

    const onPointerMove = (e) => {
        const s = start.current
        if (!s) return
        if (!active.current) {
            // finger moved before the hold started = it's a swipe, not a hold
            if (Math.abs(e.clientX - s.x) > 12 || Math.abs(e.clientY - s.y) > 12) { clearTimeout(timer.current); start.current = null }
            return
        }
        if (s.y - e.clientY > LOCK_SLIDE && stateRef.current === 'hold') {
            clearTimeout(lockTimer.current)
            set('locked'); active.current = false
            try { navigator.vibrate?.(18) } catch {}
        }
    }

    const onPointerUp = () => { end(); setTimeout(() => { suppressClick.current = false }, 60) }

    /** Call at the top of onClick. Returns true when the click should be ignored. */
    const consumeClick = () => {
        if (stateRef.current === 'locked') { rate(1); set('off'); suppressClick.current = false; return true }
        if (suppressClick.current) { suppressClick.current = false; return true }
        return false
    }

    const indicator = state === 'off' ? null : (
        <div style={{ position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 25, pointerEvents: 'none', animation: 'hs-pop .18s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, background: 'rgba(0,0,0,.62)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.14)', color: '#fff', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                {state === 'locked' ? <RiLockLine size={14} color="#FF6B35" /> : <RiSpeedUpLine size={14} color="#FF6B35" />}
                {state === 'locked' ? '2x locked · tap to exit' : '2x · slide up to lock'}
            </div>
            <style>{'@keyframes hs-pop{from{opacity:0;transform:translateX(-50%) translateY(-6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}'}</style>
        </div>
    )

    return {
        state, indicator, consumeClick,
        handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onContextMenu: e => e.preventDefault() },
    }
}
