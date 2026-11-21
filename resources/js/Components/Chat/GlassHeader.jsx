import { RiArrowLeftLine } from 'react-icons/ri'
import { GLASS, glassCircle } from './glass'

/**
 * Floating glass header, WhatsApp-style: [back] [avatar + name + status] [actions].
 * It sits ON TOP of the messages (position absolute) so they scroll underneath and get blurred.
 * `below` is for banners / the in-chat search bar; they float under the header.
 */
export default function GlassHeader({ headerRef, onBack, avatar, title, subtitle, subtitleColor, onTitleClick, actions, below }) {
    return (
        <div ref={headerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, padding: 'calc(env(safe-area-inset-top) + 10px) 12px 8px', display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
                <button type="button" onClick={onBack} aria-label="Back" style={{ ...glassCircle(44), pointerEvents: 'auto' }}>
                    <RiArrowLeftLine size={22} />
                </button>

                <button type="button" onClick={onTitleClick} style={{ ...GLASS, pointerEvents: 'auto', flex: 1, minWidth: 0, height: 44, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px 0 5px', cursor: onTitleClick ? 'pointer' : 'default', textAlign: 'left', color: '#fff' }}>
                    {avatar}
                    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>{title}</span>
                        {subtitle ? <span style={{ fontSize: 11, lineHeight: 1.2, marginTop: 1, color: subtitleColor ?? 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</span> : null}
                    </span>
                </button>

                {actions ? (
                    <div style={{ ...GLASS, pointerEvents: 'auto', height: 44, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 2, padding: '0 6px', flexShrink: 0 }}>
                        {actions}
                    </div>
                ) : null}
            </div>
            {below ? <div style={{ pointerEvents: 'auto' }}>{below}</div> : null}
        </div>
    )
}

/** A plain icon button for use inside the glass actions capsule. */
export const GlassIconBtn = ({ children, onClick, active, label }) => (
    <button type="button" onClick={onClick} aria-label={label}
        style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer', background: active ? 'rgba(255,92,0,0.25)' : 'transparent', color: active ? '#ff8a4d' : 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
        {children}
    </button>
)
