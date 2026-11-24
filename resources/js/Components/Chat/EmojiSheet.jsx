import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { RiSearchLine, RiCloseLine } from 'react-icons/ri'
import { EMOJI_CATEGORIES, ALL_EMOJIS } from '@/lib/emojiData'

const RECENT_KEY = 'flockr_recent_emojis'
const getRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]').slice(0, 16) } catch { return [] } }
const pushRecent = (e) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify([e, ...getRecent().filter(x => x !== e)].slice(0, 16))) } catch {} }

/**
 * Bottom sheet full of emojis with a search box. Works on phones (no native emoji keyboard needed).
 * onPick(emoji) is called when one is tapped.
 */
export default function EmojiSheet({ onPick, onClose }) {
    const [q, setQ] = useState('')
    const [recent] = useState(getRecent)
    const scrollRef = useRef(null)
    const openedAt = useRef(Date.now())

    const results = useMemo(() => {
        const s = q.trim().toLowerCase()
        if (!s) return null
        return ALL_EMOJIS.filter(x => x.k.includes(s) || x.e === s)
    }, [q])

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    const pick = (e) => { pushRecent(e); onPick?.(e) }
    const jump = (name) => { const el = scrollRef.current?.querySelector(`[data-cat="${name}"]`); el?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }

    const grid = (items) => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2 }}>
            {items.map((x, i) => {
                const e = typeof x === 'string' ? x : x.e
                return <button key={e + i} type="button" onClick={() => pick(e)}
                    style={{ height: 42, border: 'none', background: 'none', cursor: 'pointer', fontSize: 25, lineHeight: 1, borderRadius: 10, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{e}</button>
            })}
        </div>
    )

    return createPortal(
        <div onClick={(e) => { e.stopPropagation(); if (Date.now() - openedAt.current > 300) onClose() }}
            style={{ position: 'fixed', inset: 0, zIndex: 3500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div onClick={e => e.stopPropagation()}
                style={{ width: '100%', maxWidth: 520, height: '62vh', background: '#141416', borderTopLeftRadius: 22, borderTopRightRadius: 22, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -12px 40px rgba(0,0,0,0.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}><div style={{ width: 38, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} /></div>
                <div style={{ padding: '10px 14px 8px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <RiSearchLine size={16} color="rgba(255,255,255,0.35)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'block' }} />
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search emoji (e.g. love, fire, laugh)"
                            style={{ width: '100%', height: 40, borderRadius: 999, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 16, paddingLeft: 36, paddingRight: q ? 34 : 14, outline: 'none', boxSizing: 'border-box' }} />
                        {q && <button type="button" onClick={() => setQ('')} aria-label="Clear" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><RiCloseLine size={14} /></button>}
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#FF6B35', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Done</button>
                </div>

                {!results && (
                    <div style={{ display: 'flex', gap: 4, padding: '0 10px 6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                        {EMOJI_CATEGORIES.map(c => (
                            <button key={c.name} type="button" onClick={() => jump(c.name)}
                                style={{ flexShrink: 0, padding: '5px 11px', borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{c.name}</button>
                        ))}
                    </div>
                )}

                <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 20px', WebkitOverflowScrolling: 'touch' }}>
                    {results ? (
                        results.length ? grid(results) : <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 40 }}>No emoji found</p>
                    ) : (
                        <>
                            {recent.length > 0 && (<div><p style={lbl}>Recent</p>{grid(recent)}</div>)}
                            {EMOJI_CATEGORIES.map(c => (
                                <div key={c.name} data-cat={c.name}><p style={lbl}>{c.name}</p>{grid(c.items)}</div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
const lbl = { margin: '12px 4px 6px', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }
