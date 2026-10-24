// ─────────────────────────────────────────────────────────────────────────────
// Media helpers for the uploader (recording, photos, probing)
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_SECONDS   = 60   // longest recording
export const PHOTO_SECONDS = 5    // a photo is posted as a short video of this length

/** Best recording format this browser can do: H.264 MP4 first (plays everywhere), then VP9/VP8 WebM. */
export function pickMime() {
    if (typeof MediaRecorder === 'undefined') return ''
    const candidates = [
        'video/mp4;codecs=avc1.640028,mp4a.40.2',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
    ]
    return candidates.find(t => MediaRecorder.isTypeSupported(t)) || ''
}

export function blobToFile(blob, mime) {
    const isMp4 = (mime || blob.type || '').includes('mp4')
    return new File([blob], `flockr-${Date.now()}.${isMp4 ? 'mp4' : 'webm'}`, { type: isMp4 ? 'video/mp4' : 'video/webm' })
}

export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Resolves { duration, width, height } (any may be null) or null if the browser can't read the file. */
export function probeVideo(url, timeoutMs = 6000) {
    return new Promise(resolve => {
        const v = document.createElement('video')
        let done = false
        const finish = (val) => { if (done) return; done = true; clearTimeout(t); v.removeAttribute('src'); v.load(); resolve(val) }
        const t = setTimeout(() => finish(null), timeoutMs)
        v.preload = 'metadata'
        v.muted = true
        v.playsInline = true
        v.onloadedmetadata = () => finish({
            duration: Number.isFinite(v.duration) ? Math.max(1, Math.round(v.duration)) : null,
            width: v.videoWidth || null,
            height: v.videoHeight || null,
        })
        v.onerror = () => finish(null)
        v.src = url
    })
}

function loadImage(url) {
    return new Promise((res, rej) => {
        const i = new Image()
        i.onload = () => res(i)
        i.onerror = rej
        i.src = url
    })
}

/**
 * Turns a still image into a short silent 9:16 video so it can be posted like any
 * other video. Photos that aren't already portrait are fitted on a blurred copy of
 * themselves (the Instagram look) instead of being cropped.
 */
export async function photoToVideoFile(blob, seconds = PHOTO_SECONDS) {
    const mime = pickMime()
    if (!mime) throw new Error('unsupported')

    const url = URL.createObjectURL(blob)
    try {
        const img = await loadImage(url)
        const W = 1080
        const H = 1920
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')

        const imgAspect = img.naturalWidth / img.naturalHeight
        const nearPortrait = Math.abs(imgAspect - W / H) < 0.06

        const draw = () => {
            if (nearPortrait) {
                const s = Math.max(W / img.naturalWidth, H / img.naturalHeight)
                const w = img.naturalWidth * s
                const h = img.naturalHeight * s
                ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
            } else {
                ctx.drawImage(bg, 0, 0, W, H)
                ctx.fillStyle = 'rgba(0,0,0,0.25)'
                ctx.fillRect(0, 0, W, H)
                const s = Math.min(W / img.naturalWidth, H / img.naturalHeight)
                const w = img.naturalWidth * s
                const h = img.naturalHeight * s
                ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
            }
        }

        // Blurred backdrop built once: shrink hard, then scale back up with smoothing
        let bg = null
        if (!nearPortrait) {
            bg = document.createElement('canvas')
            bg.width = W
            bg.height = H
            const bctx = bg.getContext('2d')
            const tiny = document.createElement('canvas')
            tiny.width = 24
            tiny.height = Math.round(24 * (H / W))
            const s = Math.max(tiny.width / img.naturalWidth, tiny.height / img.naturalHeight)
            tiny.getContext('2d').drawImage(img, (tiny.width - img.naturalWidth * s) / 2, (tiny.height - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s)
            bctx.imageSmoothingQuality = 'high'
            bctx.drawImage(tiny, 0, 0, W, H)
        }

        const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: mime, videoBitsPerSecond: 6_000_000 })
        const chunks = []
        rec.ondataavailable = e => { if (e.data?.size) chunks.push(e.data) }
        const stopped = new Promise(r => { rec.onstop = r })

        draw()
        rec.start(250)
        const t0 = performance.now()
        await new Promise(resolve => {
            const tick = () => {
                draw()
                if (performance.now() - t0 < seconds * 1000) requestAnimationFrame(tick)
                else resolve()
            }
            tick()
        })
        rec.stop()
        await stopped

        return blobToFile(new Blob(chunks, { type: mime }), mime)
    } finally {
        URL.revokeObjectURL(url)
    }
}
