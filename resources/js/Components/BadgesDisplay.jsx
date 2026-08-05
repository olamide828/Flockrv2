import { useState } from 'react'
import BadgeCarouselModal from './BadgeCarouselModal'

export default function BadgesDisplay({ badges }) {
    const [openIndex, setOpenIndex] = useState(null)

    if (!badges?.length) return null

    return (
        <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {badges.map((b, i) => (
                    <img
                        key={b.key}
                        src={b.image_path}
                        alt={b.label}
                        title={`${b.label} — ${b.description}`}
                        onClick={() => setOpenIndex(i)}
                        style={{ width: 32, height: 32, objectFit: 'contain', cursor: 'pointer' }}
                    />
                ))}
            </div>

            {openIndex !== null && (
                <BadgeCarouselModal
                    badges={badges}
                    initialIndex={openIndex}
                    onClose={() => setOpenIndex(null)}
                />
            )}
        </>
    )
}