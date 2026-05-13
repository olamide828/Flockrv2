import { useState } from 'react'

export default function ProductTagPin({ product, pinX, pinY, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pinX}%`, top: `${pinY}%` }}
    >
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full border border-flockr-orange animate-ping-ring" />

      {/* Pin dot */}
      <span className="relative flex items-center justify-center w-7 h-7 rounded-full bg-flockr-orange shadow-orange-glow">
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
        </svg>
      </span>

      {/* Tooltip preview */}
      {hovered && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-44 glass-dark rounded-xl p-2.5 shadow-card animate-fade-in pointer-events-none">
          <div className="flex items-center gap-2">
            {product.primary_image && (
              <img src={product.primary_image} alt={product.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate leading-tight">{product.name}</p>
              <p className="text-flockr-orange text-xs font-bold mt-0.5 naira">₦{Number(product.price).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </button>
  )
}
