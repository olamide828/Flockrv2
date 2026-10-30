import { Head, Link } from '@inertiajs/react'
import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Spinner } from '../../Components/Upload/ui'

const API = '/api/admin/music'
const TABS = [['claims', 'Copyright claims'], ['sounds', 'Sounds'], ['strikes', 'Repeat sellers'], ['videos', 'Processing'], ['system', 'System check']]

const card = { background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 14, marginBottom: 10 }
const btn = (c = 'rgba(255,255,255,0.08)', fg = '#fff') => ({ background: c, color: fg, border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' })
const inp = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', padding: '8px 11px', fontSize: 13, outline: 'none' }
const mute = { color: 'rgba(255,255,255,0.5)', fontSize: 12 }

/** Admin: copyright claims, sounds, repeat sellers, stuck videos and a system check. Every takedown can be undone. */
export default function AdminMusic({ counts }) {
    const [tab, setTab] = useState('claims')
    const [msg, setMsg] = useState('')
    const say = (m) => { setMsg(m); setTimeout(() => setMsg(''), 5000) }
    const call = async (method, url, data) => {
        try { const r = await axios({ method, url: API + url, data }); say(r.data?.message || 'Done'); return r.data }
        catch (e) { say(e.response?.data?.message || 'Something went wrong'); return null }
    }

    return (
        <div style={{ minHeight: '100dvh', background: '#0a0a0a', color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
            <Head title="Music & copyright · Admin" />
            <div style={{ maxWidth: 980, margin: '0 auto', padding: '20px 16px 60px' }}>
                <Link href="/admin" style={{ ...mute, textDecoration: 'none' }}>← Admin</Link>
                <h1 style={{ margin: '8px 0 14px', fontSize: 22, fontWeight: 800 }}>Music &amp; copyright</h1>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14 }}>
                    {TABS.map(([id, label]) => (
                        <button key={id} onClick={() => setTab(id)} style={{ ...btn(tab === id ? '#fff' : 'rgba(255,255,255,0.07)', tab === id ? '#000' : '#fff'), whiteSpace: 'nowrap', padding: '9px 14px' }}>
                            {label}{id === 'claims' && counts?.open_claims ? ` (${counts.open_claims})` : ''}{id === 'videos' && counts?.stuck_videos ? ` (${counts.stuck_videos})` : ''}
                        </button>
                    ))}
                </div>
                {msg && <div style={{ ...card, borderColor: 'rgba(255,107,53,0.4)', color: '#FFB08F', fontSize: 13 }}>{msg}</div>}
                {tab === 'claims' && <Claims call={call} />}
                {tab === 'sounds' && <Sounds call={call} />}
                {tab === 'strikes' && <Strikes call={call} say={say} />}
                {tab === 'videos' && <Processing call={call} />}
                {tab === 'system' && <System call={call} />}
            </div>
        </div>
    )
}

function useList(url, params) {
    const [rows, setRows] = useState(null)
    const key = JSON.stringify(params || {})
    const load = useCallback(async () => {
        try { const { data } = await axios.get(API + url, { params }); setRows(data.data ?? data) } catch { setRows([]) }
    }, [url, key]) // eslint-disable-line
    useEffect(() => { setRows(null); load() }, [load])
    return [rows, load]
}

function Claims({ call }) {
    const [status, setStatus] = useState('open')
    const [rows, reload] = useList('/claims', { status })
    const act = async (fn) => { await fn(); reload() }
    return (
        <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {['open', 'actioned', 'rejected', 'all'].map(s => <button key={s} onClick={() => setStatus(s)} style={btn(status === s ? '#FF6B35' : undefined)}>{s}</button>)}
            </div>
            {rows === null ? <Spinner /> : rows.length === 0 ? <p style={mute}>No claims here.</p> : rows.map(c => (
                <div key={c.id} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <b>#{c.id} · {c.claimant_name}</b><span style={mute}>{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <div style={mute}>{c.claimant_email}</div>
                    <p style={{ margin: '8px 0', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.details}</p>
                    <div style={mute}>
                        {c.sound && <>Sound: <b style={{ color: '#fff' }}>{c.sound.title}</b> ({c.sound.source}){c.sound.is_active ? '' : ' · OFF'} · {c.videos_using_sound} live video(s) use it<br /></>}
                        {c.video && <>Video: <a href={`/@${c.owner?.username}/video/${c.video.ulid}`} target="_blank" rel="noreferrer" style={{ color: '#FF6B35' }}>{c.video.title || c.video.ulid}</a>{c.video.deleted_at ? ' · HIDDEN' : ''}<br /></>}
                        {c.owner && <>Seller: @{c.owner.username}{c.owner.is_active === false ? ' (suspended)' : ''}</>}
                    </div>
                    {c.status !== 'open' && <div style={{ ...mute, marginTop: 6 }}>Status: <b style={{ color: '#fff' }}>{c.status}</b>{c.action_taken ? ` (${c.action_taken})` : ''}{c.admin_note ? ` · ${c.admin_note}` : ''}</div>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                        {c.status === 'open' && <>
                            {c.sound_id && <button style={btn('#DC2626')} onClick={() => confirm('Switch off this sound and hide every video that uses it?') && act(() => call('post', `/claims/${c.id}/takedown`, { scope: 'sound' }))}>Take down sound + videos</button>}
                            {c.video_id && <button style={btn('#B45309')} onClick={() => confirm('Hide this video?') && act(() => call('post', `/claims/${c.id}/takedown`, { scope: 'video' }))}>Hide this video only</button>}
                            <button style={btn()} onClick={() => { const note = prompt('Why is this claim not valid? (optional)') ; if (note !== null) act(() => call('post', `/claims/${c.id}/reject`, { note })) }}>Reject claim</button>
                        </>}
                        {c.status === 'actioned' && <button style={btn('#047857')} onClick={() => { const note = prompt('Reason for restoring (counter-notice, withdrawn claim…)'); if (note !== null) act(() => call('post', `/claims/${c.id}/restore`, { note })) }}>Restore</button>}
                        {c.owner && <button style={btn()} onClick={() => { const reason = prompt('Suspend @' + c.owner.username + '? Reason shown to them:'); if (reason) axios.post(`/api/admin/users/${c.owner.id}/suspend`, { reason }).then(r => alert(r.data.message)).then(reload).catch(() => alert('Could not suspend.')) }}>Suspend seller</button>}
                    </div>
                </div>
            ))}
        </>
    )
}

function Sounds({ call }) {
    const [f, setF] = useState({ search: '', source: '', state: '' })
    const [rows, setRows] = useState(null)
    const [open, setOpen] = useState(null)
    const [vids, setVids] = useState([])
    const load = useCallback(async () => {
        try { const { data } = await axios.get(API + '/sounds', { params: Object.fromEntries(Object.entries(f).filter(([, v]) => v)) }); setRows(data.data) } catch { setRows([]) }
    }, [f])
    useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])
    const act = async (fn) => { await fn(); load() }
    const show = async (s) => { if (open === s.id) return setOpen(null); setOpen(s.id); const { data } = await axios.get(`${API}/sounds/${s.id}/videos`); setVids(data.data) }
    const edit = (s) => {
        const title = prompt('Title', s.title); if (title === null) return
        const artist = prompt('Artist', s.artist); if (artist === null) return
        const attribution = prompt('Credit line shown under videos (needed for CC BY)', s.attribution || ''); if (attribution === null) return
        act(() => call('patch', `/sounds/${s.id}`, { title, artist, attribution }))
    }
    return (
        <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <input style={{ ...inp, flex: 1, minWidth: 160 }} placeholder="Search title or artist" value={f.search} onChange={e => setF({ ...f, search: e.target.value })} />
                <select style={inp} value={f.source} onChange={e => setF({ ...f, source: e.target.value })}>
                    <option value="">All sources</option>{['library', 'original', 'custom', 'epidemic', 'openverse'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select style={inp} value={f.state} onChange={e => setF({ ...f, state: e.target.value })}>
                    <option value="">Any state</option><option value="active">On</option><option value="disabled">Off</option>
                </select>
            </div>
            {rows === null ? <Spinner /> : rows.length === 0 ? <p style={mute}>No sounds.</p> : rows.map(s => (
                <div key={s.id} style={{ ...card, opacity: s.is_active ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                            <b>{s.title}</b> <span style={mute}>· {s.artist}</span>
                            <div style={mute}>{s.source} · {s.videos_count} video(s) · {s.license || 'no licence recorded'}{s.is_active ? '' : ' · OFF'}</div>
                            {s.attribution && <div style={{ ...mute, fontSize: 11 }}>{s.attribution}</div>}
                        </div>
                        {s.url && <audio controls preload="none" src={s.url} style={{ height: 32, maxWidth: 220 }} />}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                        <button style={btn()} onClick={() => show(s)}>{open === s.id ? 'Hide videos' : 'Videos using it'}</button>
                        <button style={btn()} onClick={() => edit(s)}>Edit</button>
                        <button style={btn()} onClick={() => act(() => call('post', `/sounds/${s.id}/toggle`))}>{s.is_active ? 'Switch off' : 'Switch on'}</button>
                        <button style={btn('#DC2626')} onClick={() => confirm('Switch off and hide every video using this sound?') && act(() => call('post', `/sounds/${s.id}/takedown`))}>Take down + hide videos</button>
                        <button style={btn('#7F1D1D')} onClick={() => confirm('Delete this sound and its file for good? Videos keep playing.') && act(() => call('delete', `/sounds/${s.id}`))}>Delete</button>
                    </div>
                    {open === s.id && (
                        <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8 }}>
                            {vids.length === 0 ? <span style={mute}>No videos use this sound.</span> : vids.map(v => (
                                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', fontSize: 12 }}>
                                    <span>@{v.user?.username} · {v.title || v.ulid} {v.deleted_at ? <b style={{ color: '#F87171' }}>(hidden)</b> : ''}</span>
                                    {v.deleted_at
                                        ? <button style={btn('#047857')} onClick={async () => { await call('post', `/videos/${v.id}/restore`); const { data } = await axios.get(`${API}/sounds/${s.id}/videos`); setVids(data.data) }}>Restore</button>
                                        : <button style={btn('#B45309')} onClick={async () => { await call('post', `/videos/${v.id}/hide`); const { data } = await axios.get(`${API}/sounds/${s.id}/videos`); setVids(data.data) }}>Hide</button>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </>
    )
}

function Strikes({ say }) {
    const [rows] = useList('/strikes')
    const suspend = async (u) => {
        const reason = prompt(`Suspend @${u.username}? This reason is shown to them:`, 'Repeated copyright infringement')
        if (!reason) return
        try { const r = await axios.post(`/api/admin/users/${u.id}/suspend`, { reason }); say(r.data.message) } catch { say('Could not suspend.') }
    }
    return rows === null ? <Spinner /> : rows.length === 0 ? <p style={mute}>No takedowns yet.</p> : (
        <>
            <p style={mute}>Sellers with videos removed after a copyright claim. Suggested policy: suspend at 3.</p>
            {rows.map(r => r.user && (
                <div key={r.user.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><b>@{r.user.username}</b> <span style={mute}>· {r.strikes} strike(s){r.user.is_active === false ? ' · suspended' : ''}</span></span>
                    <span style={{ display: 'flex', gap: 8 }}>
                        <Link href={`/admin/users/${r.user.id}`} style={{ ...btn(), textDecoration: 'none' }}>Open user</Link>
                        {r.user.is_active !== false && <button style={btn(r.strikes >= 3 ? '#DC2626' : undefined)} onClick={() => suspend(r.user)}>Suspend</button>}
                    </span>
                </div>
            ))}
        </>
    )
}

function Processing({ call }) {
    const [rows, reload] = useList('/stuck')
    const act = async (fn) => { await fn(); reload() }
    return (
        <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button style={btn('#047857')} onClick={() => act(() => call('post', '/heal'))}>Publish all stuck videos now</button>
                <button style={btn()} onClick={reload}>Refresh</button>
            </div>
            <p style={mute}>Videos that are pending, processing or failed. They play from the original upload; "Reprocess" re-runs the optimise / HLS step.</p>
            {rows === null ? <Spinner /> : rows.length === 0 ? <p style={mute}>Nothing is stuck.</p> : rows.map(v => (
                <div key={v.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>@{v.user?.username} · {v.title || v.ulid}<br /><span style={mute}>{v.status} · updated {new Date(v.updated_at).toLocaleString()}</span></span>
                    <button style={btn()} onClick={() => act(() => call('post', `/videos/${v.id}/reprocess`))}>Reprocess</button>
                </div>
            ))}
        </>
    )
}

function System({ call }) {
    const [out, setOut] = useState('')
    const [busy, setBusy] = useState(false)
    const run = async () => { setBusy(true); const d = await call('get', '/diag'); setOut(d?.output || ''); setBusy(false) }
    return (
        <>
            <p style={mute}>Checks queue, cache, ffmpeg and direct-upload settings. Send me this output if uploads or downloads misbehave.</p>
            <button style={btn('#FF6B35')} onClick={run} disabled={busy}>{busy ? 'Running…' : 'Run system check'}</button>
            {out && <pre style={{ ...card, marginTop: 12, whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.5, color: '#D1D5DB' }}>{out}</pre>}
        </>
    )
}
