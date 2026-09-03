import { useEffect, useRef } from 'react'

const THEME_CONFIG = {
  bubbles:  { count: 22, colors: ['rgba(255,107,53,0.18)'], shape: 'circle', size: [4, 16], speed: [0.3, 0.9], dir: 'up', sway: true, stroke: 'rgba(255,107,53,0.22)' },
  drift:    { count: 18, colors: ['rgba(255,255,255,0.14)'], shape: 'circle', size: [1.5, 3], speed: [0.15, 0.4], dir: 'up', sway: false },
  rain:     { count: 65, colors: ['rgba(120,170,255,0.4)'], shape: 'streak', size: [10, 22], speed: [4.5, 8.5], dir: 'down-diag' },
  embers:   { count: 28, colors: ['rgba(255,140,60,0.55)', 'rgba(255,90,30,0.4)'], shape: 'circle', size: [1.5, 4], speed: [0.4, 1.1], dir: 'up', sway: true, glow: true },
  snowfall: { count: 42, colors: ['rgba(255,255,255,0.6)'], shape: 'circle', size: [2, 5], speed: [0.3, 0.8], dir: 'down', sway: true },
  confetti: { count: 30, colors: ['#FF6B35', '#FBBF24', '#34D399', '#60A5FA', '#F472B6'], shape: 'rect', size: [4, 8], speed: [0.9, 1.9], dir: 'down', sway: true, spin: true },
  starfield:{ count: 60, colors: ['rgba(255,255,255,0.85)'], shape: 'star', size: [0.6, 1.8], speed: [0.02, 0.06], dir: 'up', twinkle: true, glow: true },
    fireflies: { count: 20, colors: ['rgba(253,230,138,0.7)'], shape: 'circle', size: [1.5, 3.5], speed: [0.08, 0.2], dir: 'up', sway: true, glow: true, twinkle: true },
meteor:    { count: 8,  colors: ['rgba(240,249,255,0.85)'], shape: 'streak', size: [40, 70], speed: [7, 12], dir: 'down-diag', glow: true },
petals:    { count: 20, colors: ['rgba(249,168,212,0.55)', 'rgba(244,114,182,0.4)'], shape: 'rect', size: [5, 9], speed: [0.5, 1.1], dir: 'down', sway: true, spin: true },
}

function rand(min, max) { return Math.random() * (max - min) + min }

export default function ChatBackgroundAnimation({ theme, wallpaperUrl }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const config = THEME_CONFIG[theme]
    if (!config) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let w, h

    const resize = () => {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio
      h = canvas.height = canvas.offsetHeight * devicePixelRatio
    }
    resize()
    window.addEventListener('resize', resize)

    const spawn = () => ({
      x: rand(0, w),
      y: config.dir === 'up' ? h + rand(0, 40) : -rand(0, 40),
      size: rand(...config.size) * devicePixelRatio,
      speed: rand(...config.speed) * devicePixelRatio,
      swayOffset: rand(0, Math.PI * 2),
      rotation: rand(0, Math.PI * 2),
      spin: rand(-0.02, 0.02),
      color: config.colors[Math.floor(rand(0, config.colors.length))],
      twinklePhase: rand(0, Math.PI * 2),
    })

    let particles = Array.from({ length: config.count }, spawn)
    let t = 0

    const draw = () => {
      t += 1
      ctx.clearRect(0, 0, w, h)

      particles.forEach(p => {
        const swayX = config.sway ? Math.sin(t * 0.02 + p.swayOffset) * 12 * devicePixelRatio : 0

        if (config.dir === 'up') p.y -= p.speed
        else if (config.dir === 'down') p.y += p.speed
        else if (config.dir === 'down-diag') { p.y += p.speed; p.x += p.speed * 0.3 }

        if (config.spin) p.rotation += p.spin
        if (p.y < -40 && config.dir === 'up') Object.assign(p, spawn(), { y: h + 20 })
        if (p.y > h + 40 && config.dir !== 'up') Object.assign(p, spawn(), { y: -20 })

        ctx.globalAlpha = config.twinkle ? (Math.sin(t * 0.03 + p.twinklePhase) + 1) / 2 : 1
        ctx.shadowBlur = config.glow ? 8 * devicePixelRatio : 0
        ctx.shadowColor = p.color
        ctx.fillStyle = p.color

        const dx = p.x + swayX

        if (config.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(dx, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
          if (config.stroke) { ctx.strokeStyle = config.stroke; ctx.lineWidth = 1; ctx.stroke() }
        } else if (config.shape === 'streak') {
          ctx.strokeStyle = p.color
          ctx.lineWidth = 1.4 * devicePixelRatio
          ctx.beginPath(); ctx.moveTo(dx, p.y); ctx.lineTo(dx - 6, p.y - p.size); ctx.stroke()
        } else if (config.shape === 'rect') {
          ctx.save(); ctx.translate(dx, p.y); ctx.rotate(p.rotation)
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5)
          ctx.restore()
        } else if (config.shape === 'star') {
          ctx.beginPath(); ctx.arc(dx, p.y, p.size, 0, Math.PI * 2); ctx.fill()
        }
      })

      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [theme])

  if (wallpaperUrl) {
      return (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `url(${wallpaperUrl})`, backgroundSize: 'cover', backgroundPosition: 'center',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
        </div>
      )
    }

  if (theme === 'off') return null

  if (theme === 'aurora') {
  return (
    <div aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <span className="cba-aurora cba-aurora-1" /><span className="cba-aurora cba-aurora-2" /><span className="cba-aurora cba-aurora-3" />
      <style>{`
        .cba-aurora { position: absolute; width: 60%; height: 60%; border-radius: 50%; filter: blur(70px); opacity: 0.22; z-index: 0; pointer-events: none; }
        .cba-aurora-1 { background: #34D399; top: -15%; left: -10%; animation: cbaA1 16s ease-in-out infinite; }
        .cba-aurora-2 { background: #60A5FA; top: 20%; right: -15%; animation: cbaA2 20s ease-in-out infinite; }
        .cba-aurora-3 { background: #A78BFA; bottom: -20%; left: 20%; animation: cbaA3 18s ease-in-out infinite; }
        @keyframes cbaA1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,40px) scale(1.15); } }
        @keyframes cbaA2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,60px) scale(1.1); } }
        @keyframes cbaA3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-50px) scale(1.2); } }
      `}</style>
    </div>
  )
}

  if (theme === 'neonGrid') {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
      backgroundImage: 'linear-gradient(rgba(34,211,238,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.14) 1px, transparent 1px)',
      backgroundSize: '42px 42px',
      animation: 'cbaNeonPulse 5s ease-in-out infinite, cbaNeonDrift 22s linear infinite',
      maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, #000 40%, transparent 90%)',
      WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, #000 40%, transparent 90%)',
    }}>
      <style>{`
        @keyframes cbaNeonPulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes cbaNeonDrift { from { background-position: 0 0; } to { background-position: 84px 84px; } }
      `}</style>
    </div>
  )
}
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />
}