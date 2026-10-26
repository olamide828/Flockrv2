// ─────────────────────────────────────────────────────────────────────────────
// Text overlays: the single source of truth for how creator text looks.
//
// Used by:
//   • Seller/Upload      – editing + preview
//   • VideoCard / Show   – rendering published overlays (next step)
//   • downloads          – the editor exports each overlay as a transparent PNG
//                          (renderOverlayBlob) drawn with these same fonts and
//                          constants, and the server just places it on the video.
//
// The fonts live in public/fonts (served at /fonts) and are loaded with
// ensureTextFonts(), so editing, the feed and downloads all use the same glyphs.
//
// Overlay shape (v2). Everything in "editor px" is measured at scale 1 in the
// frame the creator edited in (frame_w x frame_h):
//   { v: 2, id, text, font, color, style, align,
//     size,               // font size in editor px
//     scale, rotation,    // pinch scale and degrees (clockwise)
//     cx, cy,             // centre of the block, % of the frame
//     lines: [{ t, x, w }], block_w, block_h, pad_x,   // from layoutText()
//     frame_w, frame_h }
// ─────────────────────────────────────────────────────────────────────────────

export const TEXT_FONTS = [
    { id: 'modern',  label: 'Modern',  family: 'Flockr Modern',  file: 'Poppins-Bold.ttf' },
    { id: 'classic', label: 'Classic', family: 'Flockr Classic', file: 'PlayfairDisplay-Bold.ttf' },
    { id: 'script',  label: 'Script',  family: 'Flockr Script',  file: 'Caveat-Bold.ttf' },
]

export const FONT_BY_ID = Object.fromEntries(TEXT_FONTS.map(f => [f.id, f]))

export const TEXT_COLORS = [
    '#FFFFFF', '#000000', '#FF6B35', '#EF4444', '#FBBF24', '#A3E635',
    '#10B981', '#22D3EE', '#3B82F6', '#8B5CF6', '#EC4899',
]

export const TEXT_STYLES = [
    { id: 'plain',     label: 'Plain'     },
    { id: 'outline',   label: 'Outline'   },
    { id: 'highlight', label: 'Highlight' },
]

// Layout constants (in em). The PHP job uses the same numbers.
export const LINE_HEIGHT  = 1.25
export const PILL_PAD_X   = 0.34
export const PILL_RADIUS  = 0.3
export const OUTLINE_W    = 0.09   // visible outline thickness outside the glyph
export const SHADOW_Y     = 0.04
export const SHADOW_ALPHA = 0.45

export const TEXT_MAX_WIDTH_RATIO = 0.82   // widest a text block may be, as a share of the frame
export const MIN_SIZE = 16
export const MAX_SIZE = 72
export const DEFAULT_SIZE = 32

// ── Colour helpers ───────────────────────────────────────────────────────────
export function luminance(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
    if (!m) return 1
    const n = parseInt(m[1], 16)
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrastColor = (hex) => (luminance(hex) > 0.45 ? '#000000' : '#FFFFFF')

/** { fill, bg, stroke } actually painted for an overlay */
export function resolveColors(o) {
    const color = o.color || '#FFFFFF'
    if (o.style === 'highlight') return { fill: contrastColor(color), bg: color, stroke: null }
    if (o.style === 'outline')   return { fill: color, bg: null, stroke: contrastColor(color) }
    return { fill: color, bg: null, stroke: null }
}

// ── Fonts ────────────────────────────────────────────────────────────────────
let fontsPromise = null

/** Injects the @font-face rules (once) and resolves when the fonts are usable. */
export function ensureTextFonts(base = '/fonts') {
    if (typeof document === 'undefined') return Promise.resolve()
    if (!document.getElementById('flockr-text-fonts')) {
        const style = document.createElement('style')
        style.id = 'flockr-text-fonts'
        style.textContent = TEXT_FONTS.map(f =>
            `@font-face{font-family:'${f.family}';src:url('${base}/${f.file}') format('truetype');font-weight:700;font-style:normal;font-display:swap}`
        ).join('\n')
        document.head.appendChild(style)
    }
    if (!fontsPromise) {
        fontsPromise = Promise.all(TEXT_FONTS.map(f => document.fonts.load(`700 40px "${f.family}"`)))
            .catch(() => { /* fall back to system fonts; the server falls back too */ })
    }
    return fontsPromise
}

export const fontFamilyCss = (fontId) => {
    const f = FONT_BY_ID[fontId] || FONT_BY_ID.modern
    const generic = f.id === 'classic' ? 'serif' : f.id === 'script' ? 'cursive' : 'sans-serif'
    return `"${f.family}", ${generic}`
}

// ── Layout (pure maths + canvas text metrics; no DOM layout needed) ──────────
let _ctx = null
function ctx() {
    if (!_ctx) _ctx = document.createElement('canvas').getContext('2d')
    return _ctx
}

function wrapText(text, o, maxW) {
    const c = ctx()
    c.font = `700 ${o.size}px ${fontFamilyCss(o.font)}`
    const width = s => c.measureText(s).width
    const out = []

    for (const para of String(text).replace(/\r/g, '').split('\n')) {
        const words = para.split(/\s+/).filter(Boolean)
        if (!words.length) { out.push(''); continue }
        let line = ''
        for (let w of words) {
            while (width(w) > maxW && w.length > 1) {            // a single word wider than the box
                let i = 1
                while (i < w.length - 1 && width(w.slice(0, i + 1)) <= maxW) i++
                if (line) { out.push(line); line = '' }
                out.push(w.slice(0, i))
                w = w.slice(i)
            }
            const t = line ? `${line} ${w}` : w
            if (width(t) <= maxW) line = t
            else { out.push(line); line = w }
        }
        out.push(line)
    }
    return out
}

/**
 * Breaks the text into lines for the given width (editor px, at scale 1) and
 * measures them. The result is stored on the overlay so the server draws exactly
 * the same lines in exactly the same places.
 */
export function layoutText(o, maxWidth) {
    const size = o.size
    const padX = o.style === 'highlight' ? PILL_PAD_X * size : 0
    const rawLines = wrapText(o.text, o, Math.max(size, maxWidth - 2 * padX))

    const c = ctx()
    c.font = `700 ${size}px ${fontFamilyCss(o.font)}`
    const outer = rawLines.map(t => (t ? c.measureText(t).width + 2 * padX : 0))
    const blockW = Math.max(1, ...outer)
    const align = o.align || 'center'

    const lines = rawLines.map((t, i) => ({
        t,
        w: r2(outer[i]),
        x: r2(align === 'left' ? 0 : align === 'right' ? blockW - outer[i] : (blockW - outer[i]) / 2),
    }))

    return { lines, block_w: r2(blockW), block_h: r2(rawLines.length * LINE_HEIGHT * size), pad_x: r2(padX) }
}

const r2 = (n) => Math.round(n * 100) / 100

/** Re-measures an overlay after any change to its text / size / font / style / align. */
export function relayout(o, frameW) {
    return { ...o, ...layoutText(o, Math.round(frameW * TEXT_MAX_WIDTH_RATIO)) }
}

/** New overlay with sensible defaults, already laid out. */
export function createOverlay(partial, frameW, frameH) {
    const o = {
        v: 2,
        id: Date.now() + Math.floor(Math.random() * 1000),
        text: '',
        font: 'modern',
        color: '#FFFFFF',
        style: 'plain',
        align: 'center',
        size: DEFAULT_SIZE,
        scale: 1,
        rotation: 0,
        cx: 50,
        cy: 42,
        frame_w: Math.round(frameW),
        frame_h: Math.round(frameH),
        ...partial,
    }
    return relayout(o, frameW)
}

/** CSS for the text itself (shared by every renderer). `k` converts editor px to screen px. */
export function textCss(o, k = 1) {
    const size = o.size * k
    const { fill, stroke } = resolveColors(o)
    const css = {
        fontFamily: fontFamilyCss(o.font),
        fontWeight: 700,
        fontStyle: 'normal',
        fontSize: size,
        lineHeight: `${LINE_HEIGHT * size}px`,
        height: LINE_HEIGHT * size,
        color: fill,
        whiteSpace: 'pre',
        fontKerning: 'normal',
    }
    if (o.style === 'outline' && stroke) {
        const w = OUTLINE_W * size
        const shadows = []
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2
            shadows.push(`${(Math.cos(a) * w).toFixed(2)}px ${(Math.sin(a) * w).toFixed(2)}px 0 ${stroke}`)
        }
        css.textShadow = shadows.join(',')
    } else if (o.style !== 'highlight') {
        css.textShadow = `0 ${(SHADOW_Y * size).toFixed(2)}px 0 rgba(0,0,0,${SHADOW_ALPHA})`
    }
    return css
}

/** Legacy (v1) overlays → v2 so every renderer can treat them the same way. */
export function normalizeOverlay(o, frameW = 260, frameH = 462) {
    if (!o || o.v === 2) return o
    const base = {
        v: 2,
        id: o.id,
        text: o.text || '',
        font: 'modern',
        color: o.textColor || '#FFFFFF',
        style: o.showOutline ? 'outline' : 'plain',
        align: 'left',
        size: o.fontSize || 20,
        scale: 1,
        rotation: 0,
        frame_w: o.frame_w || frameW,
        frame_h: o.frame_h || frameH,
    }
    const laid = layoutText(base, Math.round(base.frame_w * 0.77))
    return {
        ...base,
        ...laid,
        cx: Math.min(100, (o.left ?? 10) + (laid.block_w / base.frame_w) * 50),
        cy: Math.min(100, (o.top ?? 20) + (laid.block_h / base.frame_h) * 50),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export: render an overlay to a transparent PNG (used for downloads)
//
// The PNG is drawn with the exact same fonts, line breaks and constants the
// editor uses, at the final pixel size it will have in the video, rotation
// included. The server only has to place it.
// ─────────────────────────────────────────────────────────────────────────────
function roundRectPath(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2)
    c.beginPath()
    c.moveTo(x + r, y)
    c.arcTo(x + w, y, x + w, y + h, r)
    c.arcTo(x + w, y + h, x, y + h, r)
    c.arcTo(x, y + h, x, y, r)
    c.arcTo(x, y, x + w, y, r)
    c.closePath()
}

function paintOverlay(c, o, S, pad) {
    const size = o.size * S
    const { fill, bg, stroke } = resolveColors(o)
    const padX = (o.pad_x || 0) * S
    const lh = LINE_HEIGHT * size

    c.font = `700 ${size}px ${fontFamilyCss(o.font)}`
    c.textBaseline = 'alphabetic'
    c.textAlign = 'left'
    c.lineJoin = 'round'
    const m = c.measureText('Hg')
    const asc = m.fontBoundingBoxAscent ?? size * 0.95
    const desc = m.fontBoundingBoxDescent ?? size * 0.3
    const baseline = (lh - (asc + desc)) / 2 + asc     // same placement CSS uses inside a fixed line-height

    o.lines.forEach((l, i) => {
        if (!l.t) return
        const top = pad + i * lh
        const x = pad + l.x * S
        if (bg) {
            c.fillStyle = bg
            roundRectPath(c, x, top, l.w * S, lh, PILL_RADIUS * size)
            c.fill()
        }
        const tx = x + padX
        const ty = top + baseline
        if (stroke) {
            c.lineWidth = 2 * OUTLINE_W * size
            c.strokeStyle = stroke
            c.strokeText(l.t, tx, ty)
        } else if (!bg) {
            c.fillStyle = `rgba(0,0,0,${SHADOW_ALPHA})`
            c.fillText(l.t, tx, ty + SHADOW_Y * size)
        }
        c.fillStyle = fill
        c.fillText(l.t, tx, ty)
    })
}

/**
 * @param o  a laid-out v2 overlay
 * @param k  video pixels per editor pixel (visible video width / frame_w)
 * @returns { blob, width, height, scale }  scale = k * o.scale, i.e. video px per editor px
 */
export async function renderOverlayBlob(o, k) {
    await ensureTextFonts()
    let S = k * (o.scale || 1)
    const MAX = 4096
    const probe = (S) => {
        const pad = Math.ceil(0.45 * o.size * S) + 4
        return { pad, W: Math.ceil(o.block_w * S + 2 * pad), H: Math.ceil(o.block_h * S + 2 * pad) }
    }
    let g = probe(S)
    while (Math.max(g.W, g.H) > MAX && S > 0.1) { S *= 0.9; g = probe(S) }

    const base = document.createElement('canvas')
    base.width = g.W
    base.height = g.H
    paintOverlay(base.getContext('2d'), o, S, g.pad)

    let out = base
    const rot = ((o.rotation || 0) * Math.PI) / 180
    if (Math.abs(rot) > 0.001) {
        const cos = Math.abs(Math.cos(rot))
        const sin = Math.abs(Math.sin(rot))
        out = document.createElement('canvas')
        out.width = Math.ceil(g.W * cos + g.H * sin)
        out.height = Math.ceil(g.W * sin + g.H * cos)
        const c = out.getContext('2d')
        c.translate(out.width / 2, out.height / 2)
        c.rotate(rot)
        c.drawImage(base, -g.W / 2, -g.H / 2)
    }

    const blob = await new Promise(res => out.toBlob(res, 'image/png'))
    return { blob, width: out.width, height: out.height, scale: S }
}
