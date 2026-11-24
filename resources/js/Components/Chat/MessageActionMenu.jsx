import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import EmojiSheet from './EmojiSheet'
import { RiReplyLine, RiFileCopyLine, RiEdit2Line, RiDeleteBinLine, RiAddLine } from 'react-icons/ri'

export const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

/** [{emoji, user_id}] -> [{emoji, count, mine}] sorted by count */
export function groupReactions(reactions = [], myId) {
    const map = new Map()
    for (const r of reactions) {
        const g = map.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false }
        g.count += 1
        if (r.user_id === myId) g.mine = true
        map.set(r.emoji, g)
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
}

/** Replace my reaction locally (same emoji = remove). Mirrors what the server does. */
export function toggleMyReaction(reactions = [], myId, emoji) {
    const mine = reactions.find(r => r.user_id === myId)
    const rest = reactions.filter(r => r.user_id !== myId)
    return mine?.emoji === emoji ? rest : [...rest, { emoji, user_id: myId }]
}

/** Small pills under a bubble, e.g. 👍 2  ❤️ */
export function ReactionChips({ reactions, myId, mine, onToggle }) {
    const groups = groupReactions(reactions, myId)
    if (!groups.length) return null
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: -6, justifyContent: mine ? 'flex-end' : 'flex-start', position: 'relative', zIndex: 1 }}>
            {groups.map(g => (
                <button key={g.emoji} type="button" onClick={(e) => { e.stopPropagation(); onToggle?.(g.emoji) }}
                    onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 7px', borderRadius: 999, cursor: 'pointer', lineHeight: 1, fontSize: 12, color: '#fff',
                        background: g.mine ? 'rgba(255,107,53,0.30)' : 'rgba(30,30,32,0.85)', border: g.mine ? '1px solid rgba(255,140,90,0.7)' : '1px solid rgba(255,255,255,0.14)',
                        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                    <span style={{ fontSize: 13 }}>{g.emoji}</span>{g.count > 1 && <span style={{ fontSize: 11, fontWeight: 700 }}>{g.count}</span>}
                </button>
            ))}
        </div>
    )
}

/**
 * WhatsApp-style long-press menu: a pill of emojis above a small card of actions, floating next to the message.
 * `rect` = the pressed bubble's getBoundingClientRect(). Items that do not apply are simply not shown.
 */
export default function MessageActionMenu({ msg, rect, mine, myReaction, canReply = true, canCopy, canEdit, canDelete, onReact, onReply, onCopy, onEdit, onDelete, onClose }) {
    const [more, setMore] = useState(false)
    // The finger that did the long press is still lifting when the menu appears; that lift (and Android's
    // contextmenu event) must NOT count as 'tap outside', or the menu vanishes instantly.
    const openedAt = useRef(Date.now())
    const outside = () => { if (Date.now() - openedAt.current > 600) onClose() }
    const cardRef = useRef(null)
    const [pos, setPos] = useState({ top: 0, left: 0, ready: false })

    const items = useMemo(() => [
        canReply && { key: 'reply', label: 'Reply', Icon: RiReplyLine, run: onReply },
        canCopy && { key: 'copy', label: 'Copy', Icon: RiFileCopyLine, run: onCopy },
        canEdit && { key: 'edit', label: 'Edit', Icon: RiEdit2Line, run: onEdit },
        canDelete && { key: 'delete', label: 'Delete', Icon: RiDeleteBinLine, run: onDelete, danger: true },
    ].filter(Boolean), [canReply, canCopy, canEdit, canDelete, onReply, onCopy, onEdit, onDelete])

    // Place the whole stack (emoji pill + card) beside the message, kept inside the screen
    useLayoutEffect(() => {
        const el = cardRef.current
        if (!el) return
        const vw = window.innerWidth, vh = window.innerHeight
        const w = el.offsetWidth, h = el.offsetHeight
        const r = rect ?? { top: vh / 2, bottom: vh / 2, left: vw / 2, right: vw / 2 }
        let top = r.top - h - 8
        if (top < 12) top = Math.min(r.bottom + 8, vh - h - 12)
        top = Math.max(12, Math.min(top, vh - h - 12))
        let left = mine ? r.right - w : r.left
        left = Math.max(12, Math.min(left, vw - w - 12))
        setPos({ top, left, ready: true })
    }, [rect, mine, more])

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
    }, [onClose])

    const run = (fn) => () => { onClose(); fn?.(msg) }

    return createPortal(
        <div onClick={outside} onContextMenu={e => { e.preventDefault(); outside() }}
            style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
            <div ref={cardRef} onClick={e => e.stopPropagation()}
                style={{ position: 'fixed', top: pos.top, left: pos.left, opacity: pos.ready ? 1 : 0, transition: 'opacity .12s', display: 'flex', flexDirection: 'column', gap: 8, alignItems: mine ? 'flex-end' : 'flex-start', width: 'max-content', maxWidth: 'calc(100vw - 24px)' }}>

                {/* emoji pill */}
                <div style={{ background: 'rgba(32,32,36,0.92)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, padding: '6px 8px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', maxWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {QUICK_EMOJIS.map(e => (
                            <button key={e} type="button" onClick={run(() => onReact?.(e))} aria-label={`React ${e}`}
                                style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 24, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: myReaction === e ? 'rgba(255,107,53,0.35)' : 'transparent', transition: 'transform .12s' }}>
                                {e}
                            </button>
                        ))}
                        <button type="button" onClick={() => setMore(m => !m)} aria-label="More emojis"
                            style={{ width: 34, height: 34, marginLeft: 2, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 0 }}>
                            <RiAddLine size={20} style={{ display: 'block' }} />
                        </button>
                    </div>
                </div>

                {/* actions */}
                {items.length > 0 && (
                    <div style={{ minWidth: 210, background: 'rgba(32,32,36,0.92)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
                        {items.map((it, i) => (
                            <button key={it.key} type="button" onClick={run(it.run)}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '13px 16px', background: 'none', border: 'none', borderTop: i ? '1px solid rgba(255,255,255,0.07)' : 'none', cursor: 'pointer', color: it.danger ? '#f87171' : '#fff', fontSize: 15, fontWeight: 500, textAlign: 'left' }}>
                                <span>{it.label}</span>
                                <it.Icon size={18} style={{ display: 'block', flexShrink: 0 }} />
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {more && <EmojiSheet onClose={() => setMore(false)} onPick={(e) => { onClose(); onReact?.(e) }} />}
        </div>,
        document.body
    )
}
