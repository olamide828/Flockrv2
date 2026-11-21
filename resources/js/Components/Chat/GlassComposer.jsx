import { RiImage2Line, RiSendPlaneFill } from 'react-icons/ri'
import { ACCENT, GLASS, glassCircle } from './glass'

/**
 * Floating glass composer: [image] [message box] [send]. No bar behind it: the three controls float over the chat.
 * ONE textarea for the Inbox and the Room chat (auto-grows up to 5 lines; 16px so iPhones don't zoom in).
 *
 * `top` renders above the row (reply chip, media preview, mention list…). `children` replaces the whole row
 * (used for "you blocked this user", "request limit reached", etc.).
 */
export default function GlassComposer({
    composerRef, value, onChange, onSubmit, onPickMedia, inputRef, mediaInputRef,
    placeholder = 'Message', sending = false, canSend, maxLength = 8000, top, children,
    onInputExtra, acceptMedia = 'image/*,video/*',
}) {
    const ready = canSend ?? value.trim().length > 0

    return (
        <div ref={composerRef} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, padding: '8px 12px calc(env(safe-area-inset-bottom) + 10px)', display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
            {top ? <div style={{ pointerEvents: 'auto' }}>{top}</div> : null}

            {children ? (
                <div style={{ pointerEvents: 'auto' }}>{children}</div>
            ) : (
                <form onSubmit={onSubmit} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, pointerEvents: 'none' }}>
                    <button type="button" aria-label="Send a photo or video" onClick={() => mediaInputRef?.current?.click()} style={{ ...glassCircle(44), pointerEvents: 'auto' }}>
                        <RiImage2Line size={22} />
                    </button>
                    <input ref={mediaInputRef} type="file" accept={acceptMedia} style={{ display: 'none' }}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickMedia?.(f); e.target.value = '' }} />

                    <div style={{ ...GLASS, pointerEvents: 'auto', flex: 1, minWidth: 0, borderRadius: 22, padding: '0 16px', display: 'flex', alignItems: 'center', minHeight: 44 }}>
                        <textarea
                            ref={inputRef}
                            value={value}
                            rows={1}
                            maxLength={maxLength}
                            placeholder={placeholder}
                            onChange={(e) => { onChange(e.target.value); onInputExtra?.(e) }}
                            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
                            style={{ flex: 1, width: '100%', background: 'none', border: 'none', outline: 'none', resize: 'none', color: '#fff', fontSize: 16, lineHeight: 1.35, padding: '11px 0', fontFamily: 'inherit', maxHeight: 120, overflowY: 'auto' }}
                        />
                    </div>

                    <button type="submit" disabled={!ready || sending} aria-label="Send"
                        style={{ ...glassCircle(44, ready ? { background: ACCENT, border: '1px solid rgba(255,255,255,0.25)', color: '#fff', boxShadow: '0 6px 22px rgba(255,92,0,0.45), inset 0 1px 0 rgba(255,255,255,0.35)', backdropFilter: 'none', WebkitBackdropFilter: 'none' } : {}), pointerEvents: 'auto', cursor: ready ? 'pointer' : 'default', opacity: sending ? 0.7 : 1 }}>
                        <RiSendPlaneFill size={20} />
                    </button>
                </form>
            )}
        </div>
    )
}

/** Glass capsule for status text in place of the composer ("You blocked this user", "request limit reached"…). */
export const GlassNotice = ({ children, tone }) => (
    <div style={{ ...GLASS, borderRadius: 20, padding: '12px 16px', textAlign: 'center', color: tone === 'bad' ? '#fca5a5' : 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.5 }}>{children}</div>
)
