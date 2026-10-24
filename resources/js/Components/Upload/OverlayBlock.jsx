import { LINE_HEIGHT, PILL_PAD_X, PILL_RADIUS, resolveColors, textCss } from '../../lib/textOverlays'

/**
 * Draws one laid-out overlay (see layoutText). Lines are placed absolutely at the
 * measured positions, so what you see equals what the server renders.
 *
 *   k – converts editor px → screen px (1 inside the editor)
 */
export default function OverlayBlock({ overlay: o, k = 1 }) {
    const size = o.size * k
    const { bg } = resolveColors(o)
    const text = textCss(o, k)
    const padX = o.style === 'highlight' ? PILL_PAD_X * size : 0

    return (
        <div style={{ position: 'relative', width: o.block_w * k, height: o.block_h * k, pointerEvents: 'none' }}>
            {o.lines.map((l, i) => l.t ? (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: l.x * k,
                        top: i * LINE_HEIGHT * size,
                        width: l.w * k,
                        height: LINE_HEIGHT * size,
                        boxSizing: 'border-box',
                        paddingLeft: padX,
                        background: bg || 'transparent',
                        borderRadius: bg ? PILL_RADIUS * size : 0,
                        ...text,
                    }}
                >
                    {l.t}
                </div>
            ) : null)}
        </div>
    )
}
