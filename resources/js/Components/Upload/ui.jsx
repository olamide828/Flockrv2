// Shared bits for the uploader screens: keyframes, tiny components and styles.

export const KEYFRAMES = `
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pop{0%{transform:scale(0.3);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes fill{0%{width:0}100%{width:100%}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}
@keyframes sheetUp{0%{transform:translateY(100%)}100%{transform:translateY(0)}}
@keyframes countPop{0%{transform:scale(1.6);opacity:0}30%{opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes shutterFlash{0%{opacity:0.85}100%{opacity:0}}
@keyframes fadeIn{0%{opacity:0}100%{opacity:1}}
`

export function Spinner({ dark, size = 14 }) {
    return (
        <div style={{ width: size, height: size, border: `2px solid ${dark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)'}`, borderTopColor: dark ? '#000' : '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
    )
}

export function SCard({ title, badge, action, children }) {
    return (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, flex: 1 }}>{title}</h3>
                {badge && <span style={{ color: '#FF6B35', fontSize: 11, fontWeight: 700 }}>{badge}</span>}
                {action}
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
        </div>
    )
}

export function CHint({ n, max }) {
    return <div style={{ textAlign: 'right', marginTop: 3 }}><span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>{n}/{max}</span></div>
}

export const S = {
    inp:        { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'DM Sans, sans-serif' },
    iconBtn:    { width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 },
    glassBtn:   { width: 42, height: 42, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 },
    toolBtn:    { width: 46, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, textShadow: '0 1px 4px rgba(0,0,0,0.6)' },
    toolLabel:  { fontSize: 10, fontWeight: 700, opacity: 0.9 },
    hintPill:   { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,107,53,0.5)', color: '#FFB08F', fontSize: 11, fontWeight: 700, cursor: 'pointer', textAlign: 'left', lineHeight: 1.3 },
    primaryBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '14px 26px', borderRadius: 999, background: '#FF6B35', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
    outlineBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '14px 22px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
    errBanner:  { padding: '11px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, color: '#EF4444', fontSize: 13, textAlign: 'center' },
    errTxt:     { color: '#EF4444', fontSize: 12, margin: '5px 0 0' },
    smallLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 },
}
