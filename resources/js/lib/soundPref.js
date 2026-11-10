import { useSyncExternalStore } from 'react'

/**
 * One "sound on" preference for every video on the page (VideoCard, Video/Show, ...).
 * Unmute once -> every video that plays after that starts with sound. Mute again -> they all start muted.
 * Kept for the browser session (sessionStorage), so a reload during the same visit keeps your choice.
 */
const KEY = 'flockr.soundOn'
let on = false
try { on = sessionStorage.getItem(KEY) === '1' } catch { /* private mode */ }
const subs = new Set()

export const wantsSound = () => on

export function setWantsSound(v) {
    if (on === v) return
    on = v
    try { sessionStorage.setItem(KEY, v ? '1' : '0') } catch { /* optional */ }
    subs.forEach(fn => fn())
}

const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn) }
export const useWantsSound = () => useSyncExternalStore(subscribe, () => on, () => false)
