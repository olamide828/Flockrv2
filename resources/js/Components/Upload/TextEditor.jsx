import { useEffect, useMemo, useRef, useState } from 'react'
import { RiAlignCenter, RiAlignLeft, RiAlignRight, RiCloseLine } from 'react-icons/ri'
import {
    LINE_HEIGHT, MAX_SIZE, MIN_SIZE, PILL_PAD_X, TEXT_COLORS, TEXT_FONTS, TEXT_MAX_WIDTH_RATIO, TEXT_STYLES,
    createOverlay, ensureTextFonts, fontFamilyCss, layoutText, relayout,
} from '../../lib/textOverlays'
import OverlayBlock from './OverlayBlock'

const ALIGNS = [
    { id: 'left',   Icon: RiAlignLeft },
    { id: 'center', Icon: RiAlignCenter },
    { id: 'right',  Icon: RiAlignRight },
]

/** Vertical size slider on the left edge (like Instagram / TikTok). */
function VSlider({ value, min, max, onChange }) {
    const trackRef = useRef(null)
    const pct = (value - min) / (max - min)

    const setFromEvent = (e) => {
        const r = trackRef.current.getBoundingClientRect()
        const ratio = 1 - Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
        onChange(Math.round(min + ratio * (max - min)))
    }

    return (
        <div
            ref={trackRef}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setFromEvent(e) }}
            onPointerMove={e => { if (e.buttons || e.pointerType === 'touch') setFromEvent(e) }}
            style={{ position: 'relative', width: 34, height: '100%', touchAction: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
            role="slider"
            aria-label="Text size"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
        >
            <div style={{ position: 'absolute', top: 0, bottom: 0, width: 4, borderRadius: 999, background: 'rgba(255,255,255,0.28)' }} />
            <div style={{ position: 'absolute', bottom: 0, width: 4, height: `${pct * 100}%`, borderRadius: 999, background: '#fff' }} />
            <div style={{ position: 'absolute', bottom: `calc(${pct * 100}% - 13px)`, width: 26, height: 26, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }} />
        </div>
    )
}

/**
 * Full-screen text editor in the style of Instagram / TikTok / Snapchat:
 * live preview in the real font, font chips, colour dots, style + alignment
 * toggles, a size slider, and controls that ride above the keyboard.
 */
export default function TextEditor({ initial, defaults, frameW, frameH, onDone, onCancel }) {
    const [text, setText] = useState(initial?.text ?? '')
    const [font, setFont] = useState(initial?.font ?? defaults?.font ?? 'modern')
    const [color, setColor] = useState(initial?.color ?? defaults?.color ?? '#FFFFFF')
    const [style, setStyle] = useState(initial?.style ?? defaults?.style ?? 'plain')
    const [align, setAlign] = useState(initial?.align ?? defaults?.align ?? 'center')
    const [size, setSize] = useState(initial?.size ?? defaults?.size ?? 32)
    const [fontsReady, setFontsReady] = useState(false)
    const [vv, setVv] = useState({ top: 0, height: typeof window === 'undefined' ? 800 : window.innerHeight })
    const inputRef = useRef(null)

    useEffect(() => { ensureTextFonts().then(() => setFontsReady(true)) }, [])

    // Keep everything above the on-screen keyboard
    useEffect(() => {
        const v = window.visualViewport
        const update = () => setVv({ top: v ? v.offsetTop : 0, height: v ? v.height : window.innerHeight })
        update()
        v?.addEventListener('resize', update)
        v?.addEventListener('scroll', update)
        window.addEventListener('resize', update)
        return () => {
            v?.removeEventListener('resize', update)
            v?.removeEventListener('scroll', update)
            window.removeEventListener('resize', update)
        }
    }, [])

    useEffect(() => {
        const t = setTimeout(() => inputRef.current?.focus(), 80)
        return () => clearTimeout(t)
    }, [])

    const maxW = Math.round(frameW * TEXT_MAX_WIDTH_RATIO)

    const draft = useMemo(() => {
        const base = { v: 2, text, font, color, style, align, size }
        return { ...base, ...layoutText(base, maxW) }
        // fontsReady makes us re-measure once the real fonts are in
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, font, color, style, align, size, maxW, fontsReady])

    const padX = style === 'highlight' ? PILL_PAD_X * size : 0
    const boxH = Math.max(draft.block_h, LINE_HEIGHT * size)

    const cycle = (list, cur) => list[(list.findIndex(x => x.id === cur) + 1) % list.length].id
    const AlignIcon = ALIGNS.find(a => a.id === align).Icon

    const done = () => {
        if (!text.trim()) { onDone(null); return }
        const base = { text: text.trim(), font, color, style, align, size }
        const o = initial
            ? relayout({ ...initial, ...base }, frameW)
            : createOverlay(base, frameW, frameH)
        onDone(o, { font, color, style, align, size })
    }

    const stylePreview = (id) => ({
        plain:     { color: '#fff' },
        outline:   { color: '#fff', WebkitTextStroke: '0.6px #000', textShadow: '0 0 3px #000' },
        highlight: { color: '#000', background: '#fff', borderRadius: 6, padding: '0 5px' },
    }[id])

    return (
        <div style={{ position: 'fixed', left: 0, right: 0, top: vv.top, height: vv.height, zIndex: 100, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.66)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', animation: 'fadeIn 0.15s ease' }}>
            <style>{`.flockr-text-input::placeholder{color:rgba(255,255,255,0.45);-webkit-text-fill-color:rgba(255,255,255,0.45)}`}</style>

            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'calc(env(safe-area-inset-top) + 10px) 14px 8px' }}>
                <button onClick={onCancel} aria-label="Cancel" style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <RiCloseLine size={22} />
                </button>
                <div style={{ flex: 1 }} />
                <button onClick={() => setStyle(cycle(TEXT_STYLES, style))} aria-label={`Style: ${style}`} style={{ height: 40, minWidth: 40, padding: '0 10px', borderRadius: 12, background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span style={{ fontFamily: fontFamilyCss('modern'), fontWeight: 700, fontSize: 18, lineHeight: '24px', ...stylePreview(style) }}>A</span>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{style}</span>
                </button>
                <button onClick={() => setAlign(cycle(ALIGNS, align))} aria-label={`Align ${align}`} style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <AlignIcon size={20} />
                </button>
                <button onClick={done} style={{ height: 40, padding: '0 18px', borderRadius: 999, background: '#FF6B35', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                    Done
                </button>
            </div>

            {/* Middle: size slider + live text */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'stretch' }}>
                <div style={{ width: 52, padding: '18px 0 18px 12px', boxSizing: 'border-box' }}>
                    <VSlider value={size} min={MIN_SIZE} max={MAX_SIZE} onChange={setSize} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: 52, overflow: 'hidden' }}>
                    <div style={{ position: 'relative', width: maxW, maxWidth: '100%', height: boxH }}>
                        <div style={{ position: 'absolute', top: 0, ...(align === 'left' ? { left: 0 } : align === 'right' ? { right: 0 } : { left: '50%', transform: 'translateX(-50%)' }) }}>
                            <OverlayBlock overlay={draft} />
                        </div>
                        <textarea
                            ref={inputRef}
                            className="flockr-text-input"
                            value={text}
                            onChange={e => setText(e.target.value.slice(0, 140))}
                            placeholder="Type something…"
                            rows={Math.max(1, draft.lines.length)}
                            spellCheck={false}
                            autoCapitalize="sentences"
                            aria-label="Text"
                            style={{
                                position: 'absolute', inset: 0, width: '100%', height: boxH, margin: 0, padding: `0 ${padX}px`, border: 0, outline: 'none', resize: 'none', overflow: 'hidden',
                                background: 'transparent', color: 'transparent', WebkitTextFillColor: 'transparent', caretColor: '#fff',
                                fontFamily: fontFamilyCss(font), fontWeight: 700, fontSize: size, lineHeight: `${LINE_HEIGHT * size}px`,
                                textAlign: align, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', boxSizing: 'border-box',
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Fonts + colours */}
            <div style={{ padding: '8px 0 calc(env(safe-area-inset-bottom) + 12px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, padding: '0 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {TEXT_FONTS.map(f => {
                        const active = f.id === font
                        return (
                            <button key={f.id} onClick={() => setFont(f.id)} aria-pressed={active} style={{ flexShrink: 0, height: 38, padding: '0 18px', borderRadius: 999, border: active ? 'none' : '1px solid rgba(255,255,255,0.25)', background: active ? '#fff' : 'rgba(255,255,255,0.08)', color: active ? '#000' : '#fff', fontFamily: fontFamilyCss(f.id), fontWeight: 700, fontSize: f.id === 'script' ? 22 : 16, cursor: 'pointer' }}>
                                {f.label}
                            </button>
                        )
                    })}
                </div>
                <div style={{ display: 'flex', gap: 10, padding: '0 14px', overflowX: 'auto', scrollbarWidth: 'none', alignItems: 'center' }}>
                    {TEXT_COLORS.map(c => {
                        const active = c.toLowerCase() === color.toLowerCase()
                        return (
                            <button key={c} onClick={() => setColor(c)} aria-label={`Colour ${c}`} aria-pressed={active} style={{ flexShrink: 0, width: active ? 34 : 28, height: active ? 34 : 28, borderRadius: '50%', background: c, border: active ? '3px solid #fff' : '2px solid rgba(255,255,255,0.55)', boxShadow: active ? '0 0 0 2px rgba(0,0,0,0.4)' : 'none', cursor: 'pointer', transition: 'all 0.12s' }} />
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
