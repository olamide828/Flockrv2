export default function BadgesDisplay({ badges }) {
    if (!badges?.length) return null
    return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {badges.map(b => (
                <img
                    key={b.key}
                    src={b.image_path}
                    alt={b.label}
                    title={`${b.label} — ${b.description}`}
                    style={{ width: 32, height: 32, objectFit: 'contain', cursor: 'default' }}
                />
            ))}
        </div>
    )
}