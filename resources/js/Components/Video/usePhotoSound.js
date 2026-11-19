import { useCallback, useEffect, useRef } from 'react'

/**
 * Plays a photo post's sound (the part the creator chose, looped) while that post is the active one.
 *
 * Returns { hasSound, toggle } — toggle() is what a tap on the photo calls:
 *   • first tap after the browser blocked autoplay just starts the sound
 *   • otherwise pauses / resumes it, and returns true when it is now PAUSED (so the caller can show the right icon)
 */
export default function usePhotoSound(video, active) {
    const audio = useRef(null)
    const userPaused = useRef(false)
    const unlockedAt = useRef(0)
    const info = video?.media_type === 'photos' ? video.photo_sound_info : null
    const url = info?.url

    useEffect(() => {
        userPaused.current = false
        if (!url || !active) return undefined
        const a = new Audio(url)
        audio.current = a
        a.preload = 'auto'
        a.volume = Math.min(1, Math.max(0, info.volume ?? 0.7))
        const start = info.start || 0
        const end = info.end || null
        const restart = () => { try { a.currentTime = start } catch { /* not seekable yet */ } }
        const onMeta = () => restart()
        const onTime = () => { if (end && a.currentTime >= end) restart() }
        const onEnded = () => { restart(); if (!userPaused.current) a.play().catch(() => {}) }
        a.addEventListener('loadedmetadata', onMeta, { once: true })
        a.addEventListener('timeupdate', onTime)
        a.addEventListener('ended', onEnded)
        a.play().catch(() => { /* the browser wants a tap first */ })

        // Browsers block sound until the person touches the page; the first touch starts it
        const unlock = () => {
            if (userPaused.current || !a.paused) return
            unlockedAt.current = Date.now()
            a.play().catch(() => {})
        }
        window.addEventListener('pointerdown', unlock, { once: true })
        return () => {
            window.removeEventListener('pointerdown', unlock)
            a.removeEventListener('timeupdate', onTime)
            a.removeEventListener('ended', onEnded)
            a.pause(); a.src = ''; audio.current = null
        }
    }, [url, active])

    const toggle = useCallback(() => {
        const a = audio.current
        if (!a) return false
        // This same tap just started the sound (it was blocked): don't pause it straight away
        if (Date.now() - unlockedAt.current < 500) return false
        if (a.paused) {
            userPaused.current = false
            a.play().catch(() => {})
            return false
        }
        userPaused.current = true
        a.pause()
        return true
    }, [])

    return { hasSound: !!url, toggle }
}
