import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { RiArrowLeftLine, RiFileMusicLine, RiMicFill, RiStopFill } from 'react-icons/ri'
import { fmtTime } from '../../lib/media'
import AudioWave from './AudioWave'
import { S, Spinner } from './ui'

const MAX = 600            // recording limit in seconds (10:00); uploaded files have no length limit
const MAX_MB = 200

function pickAudioMime() {
    if (typeof MediaRecorder === 'undefined') return ''
    return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported(t)) || ''
}

/**
 * Panel inside the sound sheet: a seller records their own voice/sound or uploads an audio file,
 * names it, and saves it to "My sounds". Sharing it with everyone needs a rights confirmation.
 * Admins can also add a licensed track straight to the library.
 */
export default function CreateSound({ isAdmin, onBack, onSaved }) {
    const [mode, setMode] = useState('record')            // record | file
    const [blob, setBlob] = useState(null)
    const [fileName, setFileName] = useState('')
    const [previewUrl, setPreviewUrl] = useState(null)
    const [recording, setRecording] = useState(false)
    const [elapsed, setElapsed] = useState(0)
    const [title, setTitle] = useState('')
    const [isPublic, setIsPublic] = useState(false)
    const [rights, setRights] = useState(false)
    const [library, setLibrary] = useState(false)
    const [license, setLicense] = useState('')
    const [licenseUrl, setLicenseUrl] = useState('')
    const [attribution, setAttribution] = useState('')
    const [artist, setArtist] = useState('')
    const [batch, setBatch] = useState([])          // admin: several files at once for the Library
    const [progress, setProgress] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    const recRef = useRef(null)
    const streamRef = useRef(null)
    const chunks = useRef([])
    const t0 = useRef(0)
    const tick = useRef(null)
    const fileRef = useRef(null)

    useEffect(() => () => {
        clearInterval(tick.current)
        streamRef.current?.getTracks().forEach(t => t.stop())
    }, [])

    useEffect(() => {
        if (!blob) { setPreviewUrl(null); return undefined }
        const u = URL.createObjectURL(blob)
        setPreviewUrl(u)
        return () => URL.revokeObjectURL(u)
    }, [blob])

    const startRec = async () => {
        setError(null)
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            setError('Recording is not supported in this browser. Upload an audio file instead.')
            setMode('file')
            return
        }
        try {
            // Raw sound (music, ambience): no echo cancel / noise suppression so it isn't mangled
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
            streamRef.current = stream
            const mime = pickAudioMime()
            const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
            chunks.current = []
            rec.ondataavailable = e => { if (e.data?.size) chunks.current.push(e.data) }
            rec.onstop = () => {
                clearInterval(tick.current)
                stream.getTracks().forEach(t => t.stop())
                setRecording(false)
                const b = new Blob(chunks.current, { type: rec.mimeType || mime || 'audio/webm' })
                if (b.size < 1500) { setError('That was too short. Try again.'); return }
                setBlob(b)
                setFileName('')
            }
            recRef.current = rec
            rec.start(250)
            t0.current = Date.now()
            setElapsed(0)
            setRecording(true)
            tick.current = setInterval(() => {
                const s = (Date.now() - t0.current) / 1000
                setElapsed(s)
                if (s >= MAX) rec.stop()
            }, 100)
        } catch (e) {
            setError(e?.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow it in your browser settings, or upload a file.' : 'We could not start the microphone.')
        }
    }
    const stopRec = () => { if (recRef.current?.state === 'recording') recRef.current.stop() }

    const pickFile = (e) => {
        const list = [...(e.target.files || [])]
        e.target.value = ''
        const f = list[0]
        if (!f) return
        if (isAdmin && library && list.length > 1) {
            if (list.some(x => x.size > MAX_MB * 1024 * 1024)) { setError('Every file must be under 200MB.'); return }
            setError(null); setBatch(list); setBlob(null); setFileName(`${list.length} files selected`)
            return
        }
        setBatch([])
        if (f.size > MAX_MB * 1024 * 1024) { setError('Audio must be under 200MB.'); return }
        setError(null)
        setBlob(f)
        setFileName(f.name)
        if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').slice(0, 80))
    }

    const canSave = (batch.length > 0 || (!!blob && title.trim().length > 0)) && !saving && (!isPublic || library || rights)

    const saveBatch = async () => {
        setSaving(true)
        setError(null)
        let ok = 0
        let last = null
        const failed = []
        for (let i = 0; i < batch.length; i++) {
            const f = batch[i]
            setProgress(`Uploading ${i + 1} of ${batch.length}…`)
            try {
                const fd = new FormData()
                fd.append('audio', f)
                fd.append('title', f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 80) || 'Untitled')
                if (artist.trim()) fd.append('artist', artist.trim())
                fd.append('library', '1')
                if (license) fd.append('license', license)
                if (licenseUrl) fd.append('license_url', licenseUrl)
                if (attribution) fd.append('attribution', attribution)
                const { data } = await axios.post('/api/sounds', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                last = data.sound
                ok++
            } catch {
                failed.push(f.name)
            }
        }
        setProgress('')
        setSaving(false)
        if (failed.length) setError(`${ok} added. These failed: ${failed.join(', ')}`)
        if (ok && !failed.length) onSaved(last)
    }

    const save = async () => {
        if (batch.length) { saveBatch(); return }
        setSaving(true)
        setError(null)
        try {
            const fd = new FormData()
            const ext = (blob.type || '').includes('mp4') ? 'm4a' : (blob.type || '').includes('ogg') ? 'ogg' : (blob.type || '').includes('mpeg') ? 'mp3' : (blob.type || '').includes('wav') ? 'wav' : 'webm'
            fd.append('audio', blob instanceof File ? blob : new File([blob], `sound.${ext}`, { type: blob.type }))
            fd.append('title', title.trim())
            if (isAdmin && library && artist.trim()) fd.append('artist', artist.trim())
            fd.append('is_public', isPublic ? '1' : '0')
            fd.append('rights', rights ? '1' : '0')
            if (isAdmin && library) {
                fd.append('library', '1')
                if (license) fd.append('license', license)
                if (licenseUrl) fd.append('license_url', licenseUrl)
                if (attribution) fd.append('attribution', attribution)
            }
            const { data } = await axios.post('/api/sounds', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
            onSaved(data.sound)
        } catch (e) {
            setError(e?.response?.data?.errors ? Object.values(e.response.data.errors).flat()[0] : (e?.response?.data?.message || 'Could not save the sound. Try again.'))
        } finally {
            setSaving(false)
        }
    }

    const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }
    const toggle = (on, set, label) => (
        <button onClick={() => set(v => !v)} role="switch" aria-checked={on} aria-label={label} style={{ width: 44, height: 24, borderRadius: 999, background: on ? '#10B981' : 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
        </button>
    )

    return (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 18px calc(env(safe-area-inset-bottom) + 18px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <button onClick={onBack} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
                <RiArrowLeftLine size={16} /> Back to sounds
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
                {[['record', 'Record'], ['file', 'Upload audio']].map(([m, l]) => (
                    <button key={m} onClick={() => { if (!recording) setMode(m) }} aria-pressed={mode === m} style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: mode === m ? '#fff' : 'rgba(255,255,255,0.07)', color: mode === m ? '#000' : 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700 }}>{l}</button>
                ))}
            </div>

            {mode === 'record' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '14px 0' }}>
                    <button onClick={recording ? stopRec : startRec} aria-label={recording ? 'Stop recording' : 'Start recording'} style={{ width: 84, height: 84, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.85)', background: recording ? '#EF4444' : 'rgba(239,68,68,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        {recording ? <RiStopFill size={32} /> : <RiMicFill size={34} color="#EF4444" />}
                    </button>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                        {recording ? `Recording… ${fmtTime(elapsed)} / ${fmtTime(MAX)}` : blob && !fileName ? 'Recorded. Tap to record again.' : `Tap to record (up to ${fmtTime(MAX)})`}
                    </span>
                </div>
            ) : (
                <button onClick={() => fileRef.current?.click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '26px 16px', borderRadius: 16, border: '1.5px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13 }}>
                    <RiFileMusicLine size={28} color="#FF6B35" />
                    {fileName || (isAdmin && library ? 'Choose one or many MP3 files (max 200MB each)' : 'Choose an MP3, M4A, WAV or OGG file (max 200MB)')}
                </button>
            )}
            <input ref={fileRef} type="file" multiple={isAdmin && library} accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac" onChange={pickFile} style={{ display: 'none' }} />

            {previewUrl && <AudioWave src={previewUrl} seed={title.length + 3} skipDecode={(blob?.size || 0) > 40 * 1024 * 1024} />}

            {batch.length === 0 && <input value={title} onChange={e => setTitle(e.target.value.slice(0, 80))} placeholder="Name your sound" style={S.inp} />}
            {batch.length > 0 && <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Each file is named from its file name (dashes become spaces). The same artist and licence below are applied to all of them.</p>}

            {!library && (
                <>
                    <div style={row}>
                        <div>
                            <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 700 }}>Let other creators use it</p>
                            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Otherwise it stays in “My sounds”.</p>
                        </div>
                        {toggle(isPublic, setIsPublic, 'Share sound')}
                    </div>
                    {isPublic && (
                        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 1.5, cursor: 'pointer' }}>
                            <input type="checkbox" checked={rights} onChange={e => setRights(e.target.checked)} style={{ marginTop: 2, accentColor: '#FF6B35' }} />
                            I made this sound or I have the right to share it. I understand it can be removed if someone reports it.
                        </label>
                    )}
                </>
            )}

            {isAdmin && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={row}>
                        <p style={{ margin: 0, color: '#FBBF24', fontSize: 13, fontWeight: 700 }}>Admin: add to the Library</p>
                        {toggle(library, setLibrary, 'Add to library')}
                    </div>
                    {library && (
                        <>
                            <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist (e.g. the name shown on Pixabay)" style={S.inp} />
                            <input value={license} onChange={e => setLicense(e.target.value)} placeholder="Licence (e.g. Pixabay Content License, CC0)" style={S.inp} />
                            <input value={licenseUrl} onChange={e => setLicenseUrl(e.target.value)} placeholder="Licence / source URL" style={S.inp} />
                            <input value={attribution} onChange={e => setAttribution(e.target.value)} placeholder="Credit line, if the licence requires one" style={S.inp} />
                        </>
                    )}
                </div>
            )}

            {error && <div style={S.errBanner}>{error}</div>}

            <button onClick={save} disabled={!canSave} style={{ ...S.primaryBtn, padding: '13px 0', fontSize: 14, opacity: canSave ? 1 : 0.4 }}>
                {saving ? <><Spinner size={16} /> {progress}</> : batch.length ? `Add ${batch.length} sounds` : 'Save sound'}
            </button>
        </div>
    )
}
