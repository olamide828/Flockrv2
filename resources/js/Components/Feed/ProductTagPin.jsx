export default function ProductTagPin({ product, pinX, pinY, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ left: `${pinX}%`, top: `${pinY}%` }}
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group"
    >
      {/* Ping ring */}
      <span className="absolute inset-0 rounded-full border border-flockr-orange animate-ping-ring" />

      {/* Dot */}
      <span className="relative flex items-center justify-center w-7 h-7 rounded-full bg-flockr-orange shadow-orange-glow">
        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
        </svg>
      </span>

      {/* Tooltip on hover */}
      <span className="absolute left-9 top-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <span className="block text-[11px] text-flockr-muted">Tap to shop</span>
        <span className="block text-xs font-semibold text-white">{product.name}</span>
        <span className="block text-xs text-flockr-orange font-medium">₦{Number(product.price).toLocaleString()}</span>
      </span>
    </button>
  )
}
