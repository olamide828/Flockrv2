import { useRef } from 'react'
import { RiHeartFill } from 'react-icons/ri'

export default function HeartBurst() {
  const particles = useRef(Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * 360 + (Math.random() * 20 - 10)
    const distance = 55 + Math.random() * 25
    return { angle, distance, delay: Math.random() * 80, size: 10 + Math.random() * 8 }
  })).current

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 7 }}>
      <div className="hb-ring" />
      {particles.map((p, i) => (
        <span key={i} className="hb-particle" style={{ '--angle': `${p.angle}deg`, '--dist': `${p.distance}px`, animationDelay: `${p.delay}ms`, fontSize: p.size }}>❤</span>
      ))}
      <RiHeartFill size={92} className="hb-core" style={{ color: '#ff2d55', filter: 'drop-shadow(0 0 18px rgba(255,45,85,0.65))' }} />
      <style>{`
        @keyframes hbCore { 0%{transform:scale(0);opacity:0} 35%{transform:scale(1.25);opacity:1} 55%{transform:scale(0.92)} 70%{transform:scale(1.06)} 100%{transform:scale(1);opacity:0} }
        .hb-core { animation: hbCore 0.85s cubic-bezier(0.22,1,0.36,1) forwards; }
        @keyframes hbRing { 0%{width:20px;height:20px;opacity:0.9;border-width:3px} 100%{width:190px;height:190px;opacity:0;border-width:0.5px} }
        .hb-ring { position:absolute; border-radius:50%; border:3px solid rgba(255,107,53,0.8); animation: hbRing 0.7s ease-out forwards; }
        @keyframes hbParticle { 0%{transform:rotate(var(--angle)) translateX(0) scale(0);opacity:1} 20%{transform:rotate(var(--angle)) translateX(calc(var(--dist) * 0.3)) scale(1.1);opacity:1} 100%{transform:rotate(var(--angle)) translateX(var(--dist)) scale(0.3);opacity:0} }
        .hb-particle { position:absolute; color:#ff6b35; animation: hbParticle 0.75s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>
    </div>
  )
}