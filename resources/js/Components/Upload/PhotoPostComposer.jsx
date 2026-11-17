import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import { RiAddLine, RiArrowLeftLine, RiCloseLine, RiImageAddLine, RiLoader4Line, RiArrowLeftSLine } from 'react-icons/ri'
import HashtagInput from '@/Components/HashtagInput'

const MAX = 30

/** Shrinks a photo to max 1600px JPEG so 30 pictures upload fast on mobile data. GIFs/failed files go as-is. */
async function shrink(file) {
    if (file.type === 'image/gif' || !file.type.startsWith('image/')) return file
    try {
        const bmp = await createImageBitmap(file)
        const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
        const cv = document.createElement('canvas')
        cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k)
        cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height)
        const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.86))
        bmp.close?.()
        return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file
    } catch { return file }
}

export default function PhotoPostComposer({ onClose }) {
    const [items, setItems] = useState([])     // { id, file, url }
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [hashtags, setHashtags] = useState('')
    const [rights, setRights] = useState(false)
    const [busy, setBusy] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState('')
    const input = useRef(null)
    const urls = useRef([])

    useEffect(() => () => urls.current.forEach(u => URL.revokeObjectURL(u)), [])
    useEffect(() => { input.current?.click() }, [])

    const add = (fileList) => {
        const room = MAX - items.length
        const files = Array.from(fileList ?? []).filter(f => f.type.startsWith('image/')).slice(0, room)
        if ((fileList?.length ?? 0) > room) setError(`You can add up to ${MAX} photos per post.`); else setError('')
        const next = files.map(f => { const url = URL.createObjectURL(f); urls.current.push(url); return { id: Math.random().toString(36).slice(2), file: f, url } })
        setItems(p => [...p, ...next])
    }
    const remove = id => setItems(p => p.filter(i => i.id !== id))
    const moveLeft = id => setItems(p => { const i = p.findIndex(x => x.id === id); if (i < 1) return p; const c = [...p]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c })

    const post = async () => {
        if (!items.length) { setError('Add at least one photo.'); return }
        if (!rights) { setError('Please confirm you have the rights to these photos.'); return }
        setBusy(true); setError(''); setProgress(0)
        try {
            const fd = new FormData()
            const small = await Promise.all(items.map(i => shrink(i.file)))
            small.forEach(f => fd.append('photos[]', f))
            fd.append('title', title); fd.append('description', description); fd.append('hashtags', hashtags); fd.append('rights', '1')
            await axios.post('/api/videos/photos', fd, { onUploadProgress: e => e.total && setProgress(Math.round(e.loaded / e.total * 100)) })
            router.visit('/')
        } catch (e) {
            const errs = e.response?.data?.errors
            setError((errs && Object.values(errs)[0]?.[0]) || e.response?.data?.message || 'Could not post. Check your connection and try again.')
            setBusy(false)
        }
    }

    const field = { width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '11px 13px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit' }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#0a0a0a', color: '#fff', overflowY: 'auto' }}>
            <div style={{ maxWidth: 520, margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 14px) 16px 140px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <button onClick={onClose} disabled={busy} aria-label="Back" style={{ width: 38, height: 38, borderRadius: '50%', border: 0, background: 'rgba(255,255,255,.08)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><RiArrowLeftLine size={18} /></button>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Photo post</h1>
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{items.length}/{MAX} photos · swipeable on the feed</p>
                    </div>
                </div>

                <input ref={input} type="file" accept="image/*" multiple hidden onChange={e => { add(e.target.files); e.target.value = '' }} />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
                    {items.map((it, i) => (
                        <div key={it.id} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 12, overflow: 'hidden', background: '#161616' }}>
                            <img src={it.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <span style={{ position: 'absolute', left: 6, bottom: 6, fontSize: 10.5, fontWeight: 800, background: 'rgba(0,0,0,.6)', borderRadius: 999, padding: '2px 7px' }}>{i === 0 ? 'Cover' : i + 1}</span>
                            <button onClick={() => remove(it.id)} disabled={busy} aria-label="Remove" style={{ position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: '50%', border: 0, background: 'rgba(0,0,0,.65)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><RiCloseLine size={14} /></button>
                            {i > 0 && <button onClick={() => moveLeft(it.id)} disabled={busy} aria-label="Move earlier" style={{ position: 'absolute', top: 5, left: 5, width: 24, height: 24, borderRadius: '50%', border: 0, background: 'rgba(0,0,0,.65)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><RiArrowLeftSLine size={16} /></button>}
                        </div>
                    ))}
                    {items.length < MAX && (
                        <button onClick={() => input.current?.click()} disabled={busy} style={{ aspectRatio: '3/4', borderRadius: 12, border: '1.5px dashed rgba(255,255,255,.2)', background: 'rgba(255,255,255,.03)', color: 'rgba(255,255,255,.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                            {items.length ? <RiAddLine size={22} /> : <RiImageAddLine size={24} />}{items.length ? 'Add more' : 'Pick photos'}
                        </button>
                    )}
                </div>

                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)" maxLength={200} style={{ ...field, marginBottom: 10 }} />
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Write a caption…" maxLength={1000} rows={3} style={{ ...field, marginBottom: 10, resize: 'none' }} />
                <div style={{ position: 'relative', zIndex: 30, marginBottom: 14 }}>
                    <HashtagInput value={hashtags} onChange={setHashtags} kind="videos" placeholder="fashion trending ootd naija" inputStyle={{ ...field, paddingLeft: 30 }} />
                </div>

                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12.5, color: 'rgba(255,255,255,.65)', lineHeight: 1.5, cursor: 'pointer' }}>
                    <input type="checkbox" checked={rights} onChange={e => setRights(e.target.checked)} style={{ marginTop: 3, accentColor: '#FF6B35' }} />
                    I own these photos or have permission to use everything in them.
                </label>
                {error && <p style={{ color: '#f87171', fontSize: 13, margin: '12px 0 0' }}>{error}</p>}
            </div>

            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px calc(env(safe-area-inset-bottom) + 12px)', background: 'linear-gradient(to top,#0a0a0a 70%,transparent)' }}>
                <button onClick={post} disabled={busy || !items.length} style={{ display: 'flex', width: '100%', maxWidth: 488, margin: '0 auto', padding: 15, borderRadius: 14, border: 0, background: '#FF6B35', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: busy || !items.length ? 0.55 : 1 }}>
                    {busy ? <><RiLoader4Line size={18} style={{ animation: 'ppspin .8s linear infinite' }} /> Uploading {progress}%</> : `Post ${items.length || ''} photo${items.length === 1 ? '' : 's'}`}
                </button>
            </div>
            <style>{'@keyframes ppspin{to{transform:rotate(360deg)}}'}</style>
        </div>
    )
}
