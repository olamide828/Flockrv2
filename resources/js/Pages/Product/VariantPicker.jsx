import { useEffect, useState } from "react"

export default function VariantPicker({ skus, onSkuSelected }) {
    const allOptions   = skus[0]?.variant_options ?? {}
    const variantTypes = Object.keys(allOptions)

    const optionsByType = variantTypes.reduce((acc, type) => {
        acc[type] = [...new Set(skus.map(s => s.variant_options[type]).filter(Boolean))]
        return acc
    }, {})

    const [selectedOptions, setSelectedOptions] = useState({})

    const allSelected = variantTypes.every(t => selectedOptions[t])
    const matchedSku  = allSelected
        ? skus.find(s => variantTypes.every(t => s.variant_options[t] === selectedOptions[t])) ?? null
        : null

    useEffect(() => { onSkuSelected(matchedSku) }, [matchedSku?.id])

    const isAvailable = (type, value) => {
        const test = { ...selectedOptions, [type]: value }
        return skus.some(s =>
            Object.entries(test).every(([t, v]) => !v || s.variant_options[t] === v) &&
            s.is_active && s.stock_quantity > 0
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {variantTypes.map(type => (
                <div key={type}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>{type}</p>
                        {selectedOptions[type] && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{selectedOptions[type]}</span>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {optionsByType[type].map(option => {
                            const isSelected = selectedOptions[type] === option
                            const avail      = isAvailable(type, option)
                            return (
                                <button key={option}
                                    onClick={() => avail && setSelectedOptions(prev =>
                                        prev[type] === option ? { ...prev, [type]: null } : { ...prev, [type]: option }
                                    )}
                                    style={{
                                        padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                                        cursor: avail ? 'pointer' : 'not-allowed',
                                        border:      isSelected ? '1.5px solid #FF6B35' : avail ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
                                        background:  isSelected ? 'rgba(255,107,53,0.12)' : avail ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                                        color:       isSelected ? '#FF6B35' : avail ? '#fff' : 'rgba(255,255,255,0.2)',
                                        position: 'relative', transition: 'all 0.15s',
                                    }}
                                >
                                    {option}
                                    {!avail && <span style={{ position: 'absolute', top: '50%', left: 8, right: 8, height: 1, background: 'rgba(255,255,255,0.15)', transform: 'rotate(-8deg)' }} />}
                                </button>
                            )
                        })}
                    </div>
                </div>
            ))}

            {matchedSku && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                        {matchedSku.stock_quantity > 0 ? `${matchedSku.stock_quantity} left` : 'Out of stock'}
                    </span>
                    <span style={{ color: '#FF6B35', fontSize: 16, fontWeight: 800 }}>
                        ₦{Number(matchedSku.price ?? 0).toLocaleString()}
                    </span>
                </div>
            )}

            {!allSelected && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: 0 }}>
                    Select {variantTypes.filter(t => !selectedOptions[t]).join(' and ')} to continue
                </p>
            )}
        </div>
    )
}