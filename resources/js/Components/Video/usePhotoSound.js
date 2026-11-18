import { useEffect, useRef } from 'react'

/** Plays a photo post's sound (the part the creator chose, looped) while that post is the active one. */
export default function usePhotoSound(video, active) {
    const ref = useRef(null)
    const info = video?.media_type === 'photos' ? video.photo_sound_info : null
    const url = info?.url

    useEffect(() => {
        if (!url || !active) return undefined
        const a = new Audio(url)
        ref.current = a
        a.volume = Math.min(1, Math.max(0, info.volume ?? 0.7))
        const start = info.start || 0
        const end = info.end || null
        const restart = () => { try { a.currentTime = start } catch { /* not seekable yet */ } }
        a.addEventListener('loadedmetadata', restart, { once: true })
        a.addEventListener('timeupdate', () => { if (end && a.currentTime >= end) restart() })
        a.addEventListener('ended', () => { restart(); a.play().catch(() => {}) })
        a.play().catch(() => { /* the browser wants a tap first: the next tap on the page starts it */ })
        const unlock = () => { if (a.paused) a.play().catch(() => {}) }
        window.addEventListener('pointerdown', unlock, { once: true })
        return () => { window.removeEventListener('pointerdown', unlock); a.pause(); a.src = ''; ref.current = null }
    }, [url, active])
}
