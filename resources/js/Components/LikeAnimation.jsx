import { useRef, useState, useCallback, useMemo } from 'react'
import { RiHeartFill } from 'react-icons/ri'

const MAX_CONCURRENT = 3

export function useLikeAnimation() {
  const [bursts, setBursts] = useState([])
  const idRef = useRef(0)

  const trigger = useCallback((x, y) => {
    const id = ++idRef.current
    const randomRotation = Math.floor(Math.random() * 16) - 8 // Subtle organic tilt
    
    setBursts(prev => {
      const next = [...prev, { id, x, y, rotation: randomRotation }]
      return next.length > MAX_CONCURRENT ? next.slice(next.length - MAX_CONCURRENT) : next
    })

    setTimeout(() => {
      setBursts(prev => prev.filter(b => b.id !== id))
    }, 800)
  }, [])

  return { burst: bursts[bursts.length - 1] ?? null, bursts, trigger }
}

function SingleBurst({ x, y, rotation = 0 }) {
  // Elegant minimal stardust points
  const stardust = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (i / 6) * 360 + (i % 2 === 0 ? 15 : -15)
      const distance = 45 + (i % 3) * 15
      const size = i % 2 === 0 ? 4 : 3
      return { angle, distance, size, delay: i * 35 }
    })
  }, [])

  return (
    <div style={{ position: 'fixed', left: x, top: y, transform: `translate(-50%, -50%) rotate(${rotation}deg)`, pointerEvents: 'none', zIndex: 9999, willChange: 'transform' }}>
      {/* Soft Ambient Aura Glow */}
      <div className="like-ambient-glow" />

      {/* Minimal Stardust Dots */}
      {stardust.map((s, i) => (
        <span
          key={`sd-${i}`}
          className="like-stardust"
          style={{
            '--angle': `${s.angle}deg`,
            '--dist': `${s.dist}px`,
            '--size': `${s.size}px`,
            animationDelay: `${s.delay}ms`
          }}
        />
      ))}

      {/* Core Premium Glass Heart */}
      <div className="like-heart-container">
        <div className="like-heart-inner">
          <RiHeartFill size={88} className="like-heart-svg" />
        </div>
      </div>
    </div>
  )
}

export function LikeAnimationOverlay({ burst, bursts }) {
  const list = bursts && bursts.length ? bursts : (burst ? [burst] : [])
  if (list.length === 0) return null

  return (
    <>
      {list.map(b => <SingleBurst key={b.id} x={b.x} y={b.y} rotation={b.rotation} />)}
      <style>{`
        /* --- Ambient Glow Aura --- */
        @keyframes likeAmbientGlow {
          0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0.9; }
          50%  { transform: translate(-50%, -50%) scale(1.3); opacity: 0.35; }
          100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
        }
        .like-ambient-glow {
          position: absolute; top: 0; left: 0; width: 120px; height: 120px;
          border-radius: 50%; 
          background: radial-gradient(circle, rgba(255, 45, 85, 0.45) 0%, rgba(255, 107, 107, 0.05) 70%, transparent 100%);
          animation: likeAmbientGlow 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
        }

        /* --- Minimal Stardust --- */
        @keyframes likeStardustAnim {
          0%   { transform: rotate(var(--angle)) translateX(0) scale(0); opacity: 1; }
          50%  { opacity: 0.8; }
          100% { transform: rotate(var(--angle)) translateX(var(--dist)) scale(1); opacity: 0; }
        }
        .like-stardust {
          position: absolute; top: 0; left: 0;
          width: var(--size); height: var(--size);
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 8px rgba(255, 45, 85, 0.8), 0 0 3px #fff;
          animation: likeStardustAnim 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          will-change: transform, opacity;
        }

        /* --- Core Heart Motion & Spring --- */
        @keyframes likeHeartMotion {
          0%   { transform: scale(0.2) translateY(10px) rotate(-12deg); opacity: 0; }
          25%  { transform: scale(1.22) translateY(-4px) rotate(4deg); opacity: 1; }
          45%  { transform: scale(0.92) translateY(2deg) rotate(-2deg); opacity: 1; }
          65%  { transform: scale(1.05) translateY(-1px) rotate(1deg); opacity: 1; }
          80%  { transform: scale(1) translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: scale(0.9) translateY(-45px) rotate(0deg); opacity: 0; }
        }
        .like-heart-container {
          animation: likeHeartMotion 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          will-change: transform, opacity;
        }

        /* --- Glassmorphism Gradient & Drop Shadow --- */
        .like-heart-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 8px 20px rgba(255, 45, 85, 0.45));
        }

        .like-heart-svg {
          fill: url(#likeGradient);
          color: #ff2d55; /* Fallback */
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }
      `}</style>
      
      {/* SVG Gradient definition for the heart fill */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="likeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff3366" />
            <stop offset="50%" stopColor="#ff2d55" />
            <stop offset="100%" stopColor="#ff6b35" />
          </linearGradient>
        </defs>
      </svg>
    </>
  )
}