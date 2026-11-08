import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Keeps a <video> from sitting dead on a bad network.
 *  - 'waiting'/'stalled' for longer than `stallMs`, or an 'error', triggers an automatic reload (backoff, `maxTries`).
 *  - `reloading` is true for a moment: pass `src && !reloading ? src : null` to your source hook (useHlsVideo) so
 *    it tears the stream down and attaches it again. Works for mp4 and HLS alike.
 *  - `failed` is true after the last try; show a "Tap to retry" overlay and call `retry()`.
 *  - going back online retries immediately.
 */
export function useVideoWatchdog(videoRef, active, { stallMs = 9000, maxTries = 4 } = {}) {
    const [reloading, setReloading] = useState(false)
    const [failed, setFailed] = useState(false)
    const tries = useRef(0)
    const stallTimer = useRef(null)
    const backoff = useRef(null)

    const reload = useCallback(() => {
        clearTimeout(stallTimer.current)
        if (tries.current >= maxTries) { setFailed(true); return }
        const wait = Math.min(1000 * 2 ** tries.current, 8000)
        tries.current += 1
        clearTimeout(backoff.current)
        backoff.current = setTimeout(() => {
            setReloading(true)
            setTimeout(() => setReloading(false), 120)
        }, wait)
    }, [maxTries])

    const retry = useCallback(() => { tries.current = 0; setFailed(false); reload() }, [reload])

    useEffect(() => {
        const el = videoRef.current
        if (!el || !active) return
        const arm = () => { clearTimeout(stallTimer.current); stallTimer.current = setTimeout(reload, stallMs) }
        const ok = () => { clearTimeout(stallTimer.current); tries.current = 0; setFailed(false) }
        const online = () => { if (el.readyState < 3) retry() }
        el.addEventListener('waiting', arm)
        el.addEventListener('stalled', arm)
        el.addEventListener('error', reload)
        el.addEventListener('playing', ok)
        el.addEventListener('canplay', ok)
        window.addEventListener('online', online)
        return () => {
            clearTimeout(stallTimer.current); clearTimeout(backoff.current)
            el.removeEventListener('waiting', arm); el.removeEventListener('stalled', arm); el.removeEventListener('error', reload)
            el.removeEventListener('playing', ok); el.removeEventListener('canplay', ok)
            window.removeEventListener('online', online)
        }
    }, [videoRef, active, reload, retry, stallMs])

    useEffect(() => { tries.current = 0; setFailed(false) }, [active])

    return { reloading, failed, retry }
}
