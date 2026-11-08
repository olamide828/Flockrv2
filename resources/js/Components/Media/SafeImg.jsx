import { useEffect, useRef, useState } from 'react'

const CSS = `@keyframes fkSkel{0%{opacity:.55}50%{opacity:1}100%{opacity:.55}}`

/**
 * <img> that never shows a broken-image icon or alt text.
 *  - lazy + async decoding
 *  - soft skeleton until the bitmap arrives (stays visible on slow networks)
 *  - on error / stall: retries with backoff (cache-busting query), then shows `fallback`
 *  - re-tries automatically when the device comes back online
 * Use it anywhere a network image can fail: avatars, thumbnails, product images.
 */
export default function SafeImg({ src, alt = '', fallback = null, retries = 3, stallMs = 12000, style, className, eager = false, ...rest }) {
    const [state, setState] = useState(src ? 'loading' : 'failed')   // loading | ok | failed
    const [attempt, setAttempt] = useState(0)
    const timer = useRef(null)
    const imgRef = useRef(null)

    useEffect(() => { setState(src ? 'loading' : 'failed'); setAttempt(0) }, [src])

    const retry = () => {
        clearTimeout(timer.current)
        if (attempt >= retries) { setState('failed'); return }
        timer.current = setTimeout(() => { setAttempt(a => a + 1); setState('loading') }, 800 * 2 ** attempt)
    }

    // A request that hangs forever never fires onError: treat it as failed after stallMs.
    useEffect(() => {
        if (state !== 'loading' || !src) return
        const t = setTimeout(() => { if (!imgRef.current?.complete) retry() }, stallMs)
        return () => clearTimeout(t)
    }, [state, attempt, src]) // eslint-disable-line

    useEffect(() => {
        const online = () => { if (state === 'failed' && src) { setAttempt(0); setState('loading') } }
        window.addEventListener('online', online)
        return () => { window.removeEventListener('online', online); clearTimeout(timer.current) }
    }, [state, src])

    const url = src ? (attempt ? `${src}${src.includes('?') ? '&' : '?'}_r=${attempt}` : src) : null

    return (
        <>
            <style>{CSS}</style>
            {state !== 'failed' && url && (
                <img
                    key={url}
                    ref={imgRef}
                    src={url}
                    alt={alt}
                    loading={eager ? 'eager' : 'lazy'}
                    decoding="async"
                    className={className}
                    onLoad={() => setState('ok')}
                    onError={retry}
                    style={{ ...style, opacity: state === 'ok' ? 1 : 0, transition: 'opacity .25s ease' }}
                    {...rest}
                />
            )}
            {state === 'loading' && (
                <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.07)', animation: 'fkSkel 1.3s ease-in-out infinite', pointerEvents: 'none' }} />
            )}
            {state === 'failed' && fallback}
        </>
    )
}
