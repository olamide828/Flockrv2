// Double-tap like: "Pop & Spark".
// A glossy gradient heart springs in, a shockwave ring and soft glow ripple out, and a spray of mini hearts and
// sparks flies off with a little gravity. Everything is drawn straight into the DOM with the Web Animations API
// (transform + opacity only, so it runs on the GPU) and React is never involved, so a double-tap does NOT re-render
// the video card. The exports are unchanged, so VideoCard / Show need no edits.
import { useRef } from 'react'

const HEART = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
const COLORS = ['#FF3D6E', '#FF6B35', '#FFD166', '#FFFFFF', '#FF8FB1']
const MAX_LIVE = 4

let layer = null
let live = []

function getLayer() {
    if (typeof document === 'undefined') return null
    if (layer && layer.isConnected) return layer
    layer = document.createElement('div')
    layer.setAttribute('aria-hidden', 'true')
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;contain:layout paint style;'
    // One shared gradient for every heart (defined once, referenced by id).
    layer.innerHTML = '<svg width="0" height="0" style="position:absolute"><defs>'
        + '<linearGradient id="flockrLikeGrad" x1="15%" y1="0%" x2="85%" y2="100%"><stop offset="0" stop-color="#FF7A59"/><stop offset=".5" stop-color="#FF3D6E"/><stop offset="1" stop-color="#D6246E"/></linearGradient>'
        + '<linearGradient id="flockrLikeGloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
        + '</defs></svg>'
    document.body.appendChild(layer)
    return layer
}

const rand = (a, b) => a + Math.random() * (b - a)

function heartSvg(size, fill) {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="display:block;overflow:visible"><path d="${HEART}" fill="${fill}"/></svg>`
}

function box(parent, size, css = '') {
    const el = document.createElement('div')
    el.style.cssText = `position:absolute;left:${-size / 2}px;top:${-size / 2}px;width:${size}px;height:${size}px;will-change:transform,opacity;${css}`
    parent.appendChild(el)
    return el
}

function burst(x, y) {
    const host = getLayer()
    if (!host) return
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

    // Keep at most a few bursts alive so rapid tapping never piles up.
    while (live.length >= MAX_LIVE) { const old = live.shift(); old?.remove() }

    const root = document.createElement('div')
    root.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:0;height:0;`
    host.appendChild(root)
    live.push(root)

    const tilt = rand(-12, 12)

    // Soft glow behind everything
    const glow = box(root, 240, 'border-radius:50%;background:radial-gradient(circle,rgba(255,61,110,.55) 0%,rgba(255,107,53,.18) 45%,rgba(255,61,110,0) 70%);')
    glow.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: .25 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 650, easing: 'ease-out', fill: 'forwards' })

    // Shockwave ring
    const ring = box(root, 110, 'border-radius:50%;border:3px solid rgba(255,255,255,.9);box-sizing:border-box;')
    ring.animate([{ transform: 'scale(.35)', opacity: .95 }, { transform: 'scale(2.1)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.1,.7,.2,1)', fill: 'forwards' })

    if (!reduce) {
        // Spray of mini hearts + sparks, each with a little gravity
        const n = 9
        for (let i = 0; i < n; i++) {
            const isHeart = i % 3 !== 2
            const size = isHeart ? rand(14, 24) : rand(5, 8)
            const p = box(root, size)
            const color = COLORS[(Math.random() * COLORS.length) | 0]
            p.innerHTML = isHeart ? heartSvg(size, color) : `<div style="width:100%;height:100%;border-radius:50%;background:${color};box-shadow:0 0 6px ${color}"></div>`
            const ang = (-90 + rand(-80, 80)) * Math.PI / 180            // mostly upward fan
            const dist = rand(70, 150)
            const dx = Math.cos(ang) * dist
            const dy = Math.sin(ang) * dist
            const spin = rand(-70, 70)
            p.animate([
                { transform: 'translate3d(0,0,0) scale(0) rotate(0deg)', opacity: 0 },
                { transform: `translate3d(${dx * .6}px,${dy * .6}px,0) scale(1) rotate(${spin * .5}deg)`, opacity: 1, offset: .35 },
                { transform: `translate3d(${dx}px,${dy + 55}px,0) scale(.5) rotate(${spin}deg)`, opacity: 0 },
            ], { duration: rand(650, 900), delay: rand(0, 70), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' })
        }
    }

    // The heart
    const heart = box(root, 104, `filter:drop-shadow(0 10px 18px rgba(255,61,110,.5));`)
    heart.innerHTML = `<svg viewBox="0 0 24 24" width="104" height="104" style="display:block;overflow:visible"><path d="${HEART}" fill="url(#flockrLikeGrad)"/><path d="M6.2 5.4c1.2-.9 2.9-.9 4.1.2.5.5.9 1 1.2 1.6-1.7-.5-3.4-.2-4.8 1-.9.8-1.4 1.9-1.5 3.1-1-1.9-.7-4.8 1-5.9z" fill="url(#flockrLikeGloss)"/></svg>`
    const t = `rotate(${tilt}deg)`
    heart.animate(reduce
        ? [{ transform: `scale(.8) ${t}`, opacity: 0 }, { transform: `scale(1) ${t}`, opacity: 1, offset: .2 }, { transform: `scale(1) ${t}`, opacity: 1, offset: .7 }, { transform: `scale(1) ${t}`, opacity: 0 }]
        : [
            { transform: `translateY(8px) scale(0) rotate(${tilt - 18}deg)`, opacity: 0, easing: 'cubic-bezier(.2,1.6,.4,1)' },
            { transform: `translateY(0) scale(1.28) ${t}`, opacity: 1, offset: .2, easing: 'ease-in-out' },
            { transform: `translateY(0) scale(.94) ${t}`, offset: .36, easing: 'ease-in-out' },
            { transform: `translateY(0) scale(1.04) ${t}`, offset: .5, easing: 'ease-out' },
            { transform: `translateY(0) scale(1) ${t}`, opacity: 1, offset: .68, easing: 'cubic-bezier(.5,0,.9,.5)' },
            { transform: `translateY(-70px) scale(.8) ${t}`, opacity: 0 },
        ],
        { duration: 900, fill: 'forwards' })

    try { navigator.vibrate?.(8) } catch { /* not supported */ }

    setTimeout(() => {
        root.remove()
        live = live.filter(r => r !== root)
    }, 1000)
}

// Stable object: the hook never changes state, so the component using it never re-renders because of a tap.
const API = { burst: null, bursts: [], trigger: burst }

export function useLikeAnimation() {
    return useRef(API).current
}

// Kept so existing <LikeAnimationOverlay burst={...} /> usages keep working. The animation is drawn into its own layer.
export function LikeAnimationOverlay() {
    return null
}