// Draws a photo (or a video frame) together with the creator's text overlays into one JPEG.
// Used so a photo post's pictures, and a video's thumbnail, show the text exactly as it was placed in the editor.
import { ensureTextFonts, renderOverlayBlob } from './textOverlays'

async function bitmapOf(file) {
    try { return await createImageBitmap(file) } catch { /* older browsers */ }
    return new Promise((res, rej) => {
        const img = new Image()
        img.onload = () => res(img)
        img.onerror = rej
        img.src = URL.createObjectURL(file)
    })
}

const toJpeg = (canvas, q = 0.88) => new Promise(res => canvas.toBlob(res, 'image/jpeg', q))

async function drawOverlays(ctx, overlays, outW, outH, frame) {
    await ensureTextFonts()
    for (const o of overlays) {
        const r = await renderOverlayBlob(o, outW / frame.w)
        if (!r.blob) continue
        const bmp = await createImageBitmap(r.blob)
        ctx.drawImage(bmp, (o.cx / 100) * outW - r.width / 2, (o.cy / 100) * outH - r.height / 2)
        bmp.close?.()
    }
}

/** A photo as an upload-ready file: shrunk, and with text burned in when it has any. */
export async function composePhotoFile(file, overlays = [], frame = { w: 390, h: 844 }) {
    const name = file.name.replace(/\.\w+$/, '') + '.jpg'
    try {
        const bmp = await bitmapOf(file)
        const bw = bmp.width, bh = bmp.height
        let cv
        if (overlays.length) {
            const outW = 1080, outH = Math.round(1080 * frame.h / frame.w)
            cv = document.createElement('canvas'); cv.width = outW; cv.height = outH
            const ctx = cv.getContext('2d')
            ctx.fillStyle = '#000'; ctx.fillRect(0, 0, outW, outH)
            const k = Math.min(outW / bw, outH / bh)                      // "contain", same as the preview
            ctx.drawImage(bmp, (outW - bw * k) / 2, (outH - bh * k) / 2, bw * k, bh * k)
            await drawOverlays(ctx, overlays, outW, outH, frame)
        } else {
            if (file.type === 'image/gif') return file
            const k = Math.min(1, 1600 / Math.max(bw, bh))
            cv = document.createElement('canvas'); cv.width = Math.round(bw * k); cv.height = Math.round(bh * k)
            cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height)
        }
        bmp.close?.()
        const blob = await toJpeg(cv)
        return blob ? new File([blob], name, { type: 'image/jpeg' }) : file
    } catch {
        return file
    }
}

/**
 * Thumbnail for a video: a frame near the start, cover-fitted into the editor frame (like the preview),
 * with the creator's text on top. Resolves to a JPEG Blob, or null if the browser can't decode the video.
 */
export async function composeVideoCover(videoUrl, overlays, frame, duration) {
    if (!overlays.length) return null
    return new Promise(resolve => {
        const v = document.createElement('video')
        v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'
        let settled = false
        const done = (b) => { if (settled) return; settled = true; try { v.removeAttribute('src'); v.load() } catch {} resolve(b) }
        const timer = setTimeout(() => done(null), 9000)
        v.onerror = () => { clearTimeout(timer); done(null) }
        v.onloadeddata = () => { try { v.currentTime = Math.min(0.6, Math.max(0.05, (duration || v.duration || 1) / 4)) } catch { clearTimeout(timer); done(null) } }
        v.onseeked = async () => {
            try {
                const vw = v.videoWidth, vh = v.videoHeight
                if (!vw || !vh) throw new Error('no size')
                const outW = 720, outH = Math.round(720 * frame.h / frame.w)
                const cv = document.createElement('canvas'); cv.width = outW; cv.height = outH
                const ctx = cv.getContext('2d')
                const k = Math.max(outW / vw, outH / vh)                      // "cover", same as the preview
                ctx.drawImage(v, (outW - vw * k) / 2, (outH - vh * k) / 2, vw * k, vh * k)
                await drawOverlays(ctx, overlays, outW, outH, frame)
                const blob = await toJpeg(cv, 0.86)
                clearTimeout(timer); done(blob)
            } catch { clearTimeout(timer); done(null) }
        }
        v.src = videoUrl
    })
}
