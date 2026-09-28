import { useRef, useState, useCallback, useMemo } from 'react'
import { RiHeartFill, RiSparklingFill } from 'react-icons/ri'

const MAX_CONCURRENT = 3

export function useLikeAnimation() {
  const [bursts, setBursts] = useState([])
  const idRef = useRef(0)

  const trigger = useCallback((x, y) => {
    const id = ++idRef.current
    const randomRotation = Math.floor(Math.random() * 24) - 12 // Easter egg: Slight organic angle jitter
    
    setBursts(prev => {
      const next = [...prev, { id, x, y, rotation: randomRotation }]
      return next.length > MAX_CONCURRENT ? next.slice(next.length - MAX_CONCURRENT) : next
    })

    setTimeout(() => {
      setBursts(prev => prev.filter(b => b.id !== id))
    }, 850)
  }, [])

  return { burst: bursts[bursts.length - 1] ?? null, bursts, trigger }
}

function SingleBurst({ x, y, rotation = 0 }) {
  // Generate high-density particle burst configuration
  const particles = useMemo(() => {
    const colors = ['#ff2d55', '#ff6b35', '#ffd700', '#ff3b30', '#ffffff']
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * 360 + (i % 2 === 0 ? 5 : -5)
      const distance = 70 + (i % 3) * 22
      const color = colors[i % colors.length]
      const size = i % 2 === 0 ? 7 : 5
      return { angle, distance, color, size, delay: (i % 4) * 25 }
    })
  }, [])

  // Orbiting micro-hearts (Easter egg detail)
  const miniHearts = useMemo(() => {
    return [
      { angle: 35, dist: 85, delay: 0 },
      { angle: 145, dist: 95, delay: 40 },
      { angle: 225, dist: 80, delay: 20 },
      { angle: 315, dist: 90, delay: 60 }
    ]
  }, [])

  return (
    <div style={{ position: 'fixed', left: x, top: y, transform: `translate(-50%, -50%) rotate(${rotation}deg)`, pointerEvents: 'none', zIndex: 9999, willChange: 'transform' }}>
      {/* Shockwave expanding ring */}
      <div className="like-anim-ring-outer" />
      <div className="like-anim-ring-inner" />
      
      {/* Flash pulse halo */}
      <div className="like-anim-glow-pulse" />

      {/* Burst Particles */}
      {particles.map((p, i) => (
        <span
          key={`p-${i}`}
          className="like-anim-particle"
          style={{
            '--angle': `${p.angle}deg`,
            '--dist': `${p.distance}px`,
            '--bg': p.color,
            '--size': `${p.size}px`,
            animationDelay: `${p.delay}ms`
          }}
        />
      ))}

      {/* Floating Sparkles */}
      <div className="like-sparkle-container s-1"><RiSparklingFill size={18} color="#ffd700" /></div>
      <div className="like-sparkle-container s-2"><RiSparklingFill size={14} color="#ffffff" /></div>

      {/* Floating Micro-Hearts */}
      {miniHearts.map((m, i) => (
        <div
          key={`mh-${i}`}
          className="like-anim-mini-heart"
          style={{
            '--angle': `${m.angle}deg`,
            '--dist': `${m.dist}px`,
            animationDelay: `${m.delay}ms`
          }}
        >
          <RiHeartFill size={16} color="#ff2d55" />
        </div>
      ))}

      {/* Core Elastic Heart */}
      <div className="like-anim-heart-wrapper">
        <RiHeartFill size={110} color="#ff2d55" className="like-anim-heart" style={{ display: 'block' }} />
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
        /* --- Outer Shockwave --- */
        @keyframes likeAnimRingOuter {
          0%   { width: 20px; height: 20px; opacity: 0.9; border-width: 4px; }
          100% { width: 240px; height: 240px; opacity: 0; border-width: 1px; }
        }
        .like-anim-ring-outer {
          position: absolute; top: 0; left: 0; transform: translate(-50%, -50%);
          border-radius: 50%; border: 4px solid #ff2d55;
          animation: likeAnimRingOuter 0.65s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
          will-change: width, height, opacity;
        }

        /* --- Inner Ring --- */
        @keyframes likeAnimRingInner {
          0%   { width: 10px; height: 10px; opacity: 1; border-width: 5px; }
          100% { width: 170px; height: 170px; opacity: 0; border-width: 1px; }
        }
        .like-anim-ring-inner {
          position: absolute; top: 0; left: 0; transform: translate(-50%, -50%);
          border-radius: 50%; border: 4px solid #ffd700;
          animation: likeAnimRingInner 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) 0.05s forwards;
          will-change: width, height, opacity;
        }

        /* --- Center Glow Pulse --- */
        @keyframes likeGlowPulse {
          0%   { transform: translate(-50%, -50%) scale(0.2); opacity: 0.8; }
          50%  { transform: translate(-50%, -50%) scale(1.4); opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
        .like-anim-glow-pulse {
          position: absolute; top: 0; left: 0; width: 100px; height: 100px;
          border-radius: 50%; background: radial-gradient(circle, rgba(255,45,85,0.6) 0%, rgba(255,107,53,0) 70%);
          animation: likeGlowPulse 0.6s ease-out forwards;
          will-change: transform, opacity;
        }

        /* --- Main Elastic Heart --- */
        @keyframes likeAnimHeartWrapper {
          0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
          22%  { transform: scale(1.35) rotate(4deg); opacity: 1; }
          38%  { transform: scale(0.92) rotate(-2deg); opacity: 1; }
          52%  { transform: scale(1.08) rotate(1deg); opacity: 1; }
          70%  { transform: scale(1) rotate(0deg); opacity: 1; }
          100% { transform: scale(0.85) translateY(-35px); opacity: 0; }
        }
        .like-anim-heart-wrapper {
          animation: likeAnimHeartWrapper 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          filter: drop-shadow(0 10px 22px rgba(255, 45, 85, 0.55));
          will-change: transform, opacity;
        }

        /* --- Multi-colored Burst Particles --- */
        @keyframes likeAnimParticle {
          0%   { transform: rotate(var(--angle)) translateX(0) scale(0); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: rotate(var(--angle)) translateX(var(--dist)) scale(1.2); opacity: 0; }
        }
        .like-anim-particle {
          position: absolute; top: 0; left: 0;
          width: var(--size); height: var(--size);
          border-radius: 50%; background: var(--bg);
          animation: likeAnimParticle 0.65s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
          box-shadow: 0 0 6px var(--bg);
          will-change: transform, opacity;
        }

        /* --- Floating Mini Hearts --- */
        @keyframes likeAnimMiniHeart {
          0%   { transform: rotate(var(--angle)) translateX(0) scale(0); opacity: 0; }
          30%  { opacity: 1; }
          100% { transform: rotate(var(--angle)) translateX(var(--dist)) scale(1.1) rotate(15deg); opacity: 0; }
        }
        .like-anim-mini-heart {
          position: absolute; top: 0; left: 0;
          animation: likeAnimMiniHeart 0.75s cubic-bezier(0.15, 0.85, 0.35, 1.2) forwards;
          filter: drop-shadow(0 2px 6px rgba(255,45,85,0.4));
          will-change: transform, opacity;
        }

        /* --- Sparkles --- */
        @keyframes likeSparkle1 {
          0%   { transform: translate(-30px, -10px) scale(0) rotate(0deg); opacity: 0; }
          40%  { transform: translate(-65px, -50px) scale(1.3) rotate(90deg); opacity: 1; }
          100% { transform: translate(-85px, -75px) scale(0) rotate(180deg); opacity: 0; }
        }
        @keyframes likeSparkle2 {
          0%   { transform: translate(10px, -10px) scale(0) rotate(0deg); opacity: 0; }
          40%  { transform: translate(55px, -60px) scale(1.2) rotate(-90deg); opacity: 1; }
          100% { transform: translate(75px, -85px) scale(0) rotate(-180deg); opacity: 0; }
        }
        .like-sparkle-container.s-1 {
          position: absolute; top: 0; left: 0;
          animation: likeSparkle1 0.75s ease-out forwards;
        }
        .like-sparkle-container.s-2 {
          position: absolute; top: 0; left: 0;
          animation: likeSparkle2 0.75s ease-out 0.08s forwards;
        }
      `}</style>
    </>
  )
}