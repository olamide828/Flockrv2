import { useEffect, useState } from 'react'

const SPLASH_KEY = 'flockr_splash_shown'

export default function SplashScreen({ onFinish }) {
    const [phase, setPhase] = useState('in')  // 'in' | 'hold' | 'out'

    useEffect(() => {
        // Phase 1: animate in (800ms)
        const holdTimer = setTimeout(() => {
            setPhase('hold')
        }, 800)

        // Phase 2: hold (1400ms total)
        const outTimer = setTimeout(() => {
            setPhase('out')
        }, 1800)

        // Phase 3: fade out complete, call onFinish
        const finishTimer = setTimeout(() => {
            sessionStorage.setItem(SPLASH_KEY, '1')
            onFinish?.()
        }, 2500)

        return () => {
            clearTimeout(holdTimer)
            clearTimeout(outTimer)
            clearTimeout(finishTimer)
        }
    }, [onFinish])

    return (
        <>
            <div style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: '#0A0A0A',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                opacity: phase === 'out' ? 0 : 1,
                transition: phase === 'out' ? 'opacity 0.6s ease' : 'none',
            }}>
                {/* Icon — same layout as Instagram: just the logo, centered */}
                <div style={{
                    width: 96, height: 96,
                    borderRadius: 28,
                    background: '#ff5c00',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 0 0 rgba(255,92,0,0.4)',
                    animation: 'iconPop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
                }}>
                    <img
                        src="/images/flockr_logo_white.png"
                        alt="Flockr"
                        style={{ width: 52, height: 52, objectFit: 'contain' }}
                    />
                </div>

                {/* Animated letters — below the icon, smaller */}
                <div style={{
                    display: 'flex', alignItems: 'center', marginTop: 28,
                    overflow: 'hidden',
                }}>
                    {['f','l','o','c','k','r'].map((char, i) => (
                        <span
                            key={i}
                            style={{
                                color: '#fff',
                                fontSize: 26,
                                fontWeight: 900,
                                letterSpacing: '0.2em',
                                fontFamily: 'var(--font-display)',
                                display: 'inline-block',
                                opacity: 0,
                                animation: `letterSlide 0.5s cubic-bezier(0.22,1,0.36,1) forwards`,
                                animationDelay: `${0.08 + i * 0.07}s`,
                            }}
                        >
                            {char}
                        </span>
                    ))}
                </div>

                {/* Bottom credit — like "from Meta" */}
                <div style={{
                    position: 'absolute', bottom: 36,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    opacity: 0,
                    animation: 'fadeIn 0.5s ease forwards',
                    animationDelay: '0.8s',
                }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
                        Shop What You Watch
                    </span>
                </div>
            </div>

            <style>{`
                @keyframes iconPop {
                    0%   { opacity: 0; transform: scale(0.6); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes letterSlide {
                    0%   { opacity: 0; transform: translateY(16px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    0%   { opacity: 0; }
                    100% { opacity: 1; }
                }
            `}</style>
        </>
    )
}