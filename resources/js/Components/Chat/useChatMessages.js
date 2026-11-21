import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Helpers that keep "I just sent it" (optimistic) bubbles and the server's copy from ever showing twice.
 * Duplicates used to happen because the realtime event, the POST reply and the optimistic bubble each
 * tried to replace one another and could disagree about what counts as "the same message"
 * (null vs undefined, a missing sender_id, etc).
 */
export const isOpt = (m) => String(m?.id).startsWith('opt-')
export const senderOf = (m) => m?.sender_id ?? m?.sender?.id ?? m?.user_id ?? m?.user?.id ?? null
const norm = (v) => (v === undefined || v === '' ? null : v)

/** A message arrived from the server/realtime: update it, adopt a matching optimistic bubble, or append it. */
export function mergeIncoming(prev, msg) {
    const i = prev.findIndex((m) => m.id === msg.id)
    if (i !== -1) { const c = [...prev]; c[i] = { ...prev[i], ...msg }; return c }

    const sid = senderOf(msg)
    const oi = prev.findIndex((m) =>
        isOpt(m) && !m._failed && senderOf(m) === sid &&
        norm(m.body) === norm(msg.body) && !!m.media_url === !!msg.media_url)
    if (oi !== -1) { const c = [...prev]; c[oi] = msg; return c }

    const dupe = prev.some((m) =>
        !isOpt(m) && senderOf(m) === sid && norm(m.body) === norm(msg.body) &&
        norm(m.media_url) === norm(msg.media_url) &&
        Math.abs(new Date(m.created_at) - new Date(msg.created_at)) < 3000)
    return dupe ? prev : [...prev, msg]
}

/** The POST finished: swap our optimistic bubble for the real one, unless the realtime event already added it. */
export function settleOptimistic(prev, optId, data) {
    if (prev.some((m) => m.id === data.id)) return prev.filter((m) => m.id !== optId)
    return prev.map((m) => (m.id === optId ? data : m))
}

export const markFailed = (prev, optId) => prev.map((m) => (m.id === optId ? { ...m, _failed: true, _optimistic: false } : m))
export const markSending = (prev, optId) => prev.map((m) => (m.id === optId ? { ...m, _failed: false, _optimistic: true } : m))

/** Is this error a "couldn't reach the server / timed out / server broke" one (worth a Retry), or a real refusal (403/422)? */
export function isNetworkFailure(err) {
    const s = err?.response?.status
    return !err?.response || err.code === 'ECONNABORTED' || s === 408 || s === 429 || (s >= 500 && s < 600)
}

/** Live height of an element (so the scroll area can leave room for the floating header / composer). */
export function useElementHeight() {
    const ref = useRef(null)
    const [h, setH] = useState(0)
    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return undefined
        const update = () => setH(Math.ceil(el.getBoundingClientRect().height))
        update()
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
        ro?.observe(el)
        return () => ro?.disconnect()
    })
    return [ref, h]
}

/** Re-runs `fn` every `ms` while `on` is true (and once when the tab regains focus). */
export function usePolling(on, fn, ms = 20000) {
    const ref = useRef(fn)
    ref.current = fn
    useEffect(() => {
        if (!on) return undefined
        const tick = () => ref.current()
        const t = setInterval(tick, ms)
        window.addEventListener('focus', tick)
        return () => { clearInterval(t); window.removeEventListener('focus', tick) }
    }, [on, ms])
}
