import * as Ri from 'react-icons/ri'

export default function BadgesDisplay({ badges }) {
    if (!badges?.length) return null
    return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {badges.map(b => {
                const Icon = Ri[b.icon] ?? Ri.RiMedalLine
                return (
                    <div key={b.key} title={b.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, background: `${b.color}18`, border: `1px solid ${b.color}40` }}>
                        <Icon size={13} color={b.color} />
                        <span style={{ color: b.color, fontSize: 11, fontWeight: 700 }}>{b.label}</span>
                    </div>
                )
            })}
        </div>
    )
}