import { useEffect, useMemo, useRef, useState } from 'react'
import { ensureTextFonts, normalizeOverlay } from '../../lib/textOverlays'
import OverlayBlock from '../Upload/OverlayBlock'

/**
 * Creator text on a playing video (feed card and video page).
 *
 * The creator placed the text on an editor frame that showed the video "cover"-fitted. Here the video is
 * usually "contain"-fitted, so the saved position is first mapped onto the part of the video the creator
 * saw, then onto wherever that video sits on screen. Fonts, line breaks and sizing are the editor's own,
 * so text looks the same here, in the editor and in the downloaded file. Old (v1) overlays are converted.
 *
 *   overlays   video.text_overlays
 *   videoSize  { w, h } = videoWidth / videoHeight from onLoadedMetadata (optional but best)
 */
export default function TextOverlays({ overlays, videoSize }) {
    const wrap = useRef(null)
    const [box, setBox] = useState({ w: 0, h: 0 })
    const [fontsReady, setFontsReady] = useState(false)
    const has = Array.isArray(overlays) && overlays.length > 0

    useEffect(() => {
        if (!has) return undefined
        let on = true
        ensureTextFonts().then(() => { if (on) setFontsReady(true) })
        return () => { on = false }
    }, [has])

    useEffect(() => {
        const el = wrap.current
        if (!el || !has) return undefined
        const update = () => setBox({ w: el.clientWidth, h: el.clientHeight })
        update()
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
        ro?.observe(el)
        return () => ro?.disconnect()
    }, [has])

    const items = useMemo(() => {
        if (!has || !fontsReady) return []
        return overlays.map(o => { try { return normalizeOverlay(o) } catch { return null } }).filter(o => o && o.text && Array.isArray(o.lines) && o.lines.length)
    }, [overlays, has, fontsReady])

    if (!has) return null

    return (
        <div ref={wrap} aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none', overflow: 'hidden' }}>
            {box.w > 0 && items.map((o, i) => {
                const fa = o.frame_w / o.frame_h
                // Until the real size is known, assume the video has the editor frame's shape
                const vw = videoSize?.w || fa * 1000
                const vh = videoSize?.h || 1000
                // part of the video the creator could see (cover fit, centred)
                let visW, visH
                if (vw / vh > fa) { visH = vh; visW = vh * fa } else { visW = vw; visH = vw / fa }
                const offX = (vw - visW) / 2
                const offY = (vh - visH) / 2
                // where the video sits in this box (contain fit, centred)
                const s = Math.min(box.w / vw, box.h / vh)
                const left0 = (box.w - vw * s) / 2
                const top0 = (box.h - vh * s) / 2
                const x = left0 + (offX + (o.cx / 100) * visW) * s
                const y = top0 + (offY + (o.cy / 100) * visH) * s
                const total = (o.scale || 1) * (visW / o.frame_w) * s
                return (
                    <div
                        key={o.id ?? i}
                        style={{
                            position: 'absolute',
                            left: x,
                            top: y,
                            width: o.block_w,
                            height: o.block_h,
                            transform: `translate(-50%, -50%) rotate(${o.rotation || 0}deg) scale(${total})`,
                            transformOrigin: 'center',
                        }}
                    >
                        <OverlayBlock overlay={o} />
                    </div>
                )
            })}
        </div>
    )
}
