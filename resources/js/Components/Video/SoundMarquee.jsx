import { Link } from '@inertiajs/react'
import { useLayoutEffect, useRef, useState } from 'react'

const CSS = `
@keyframes fkDisc{to{transform:rotate(360deg)}}
@keyframes fkMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
`

const hue = (id) => (Number(id || 0) * 47) % 360

/**
 * "♪ Song title · Artist" strip with a spinning disc, like TikTok. The text scrolls only when it is too long
 * to fit. `sound` is video.sound_credit (null = the creator's own audio, shown as "Original sound").
 * Licence credit lines (e.g. CC-BY) are included so required attribution is always visible.
 */
export default function SoundMarquee({ sound, username, href, style }) {
    const box = useRef(null)
    const txt = useRef(null)
    const [scroll, setScroll] = useState(false)

    const label = sound
        ? [sound.title, sound.artist, sound.attribution].filter(Boolean).join(' · ')
        : `Original sound${username ? ` · @${username}` : ''}`

    useLayoutEffect(() => {
        if (box.current && txt.current) setScroll(txt.current.scrollWidth > box.current.clientWidth + 2)
    }, [label])

    const h = hue(sound?.id)
    const secs = Math.max(8, label.length * 0.35)

    const Wrap = href ? Link : 'div'
    const wrapProps = href ? { href, onClick: e => e.stopPropagation(), style: { display: 'flex', alignItems: 'center', gap: 8, maxWidth: 230, textDecoration: 'none', cursor: 'pointer', ...style } } : { style: { display: 'flex', alignItems: 'center', gap: 8, maxWidth: 230, ...style } }

    return (
        <Wrap {...wrapProps}>
            <style>{CSS}</style>
            <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: '2px solid rgba(255,255,255,0.85)', background: sound?.cover_url ? `center/cover url(${sound.cover_url})` : `linear-gradient(135deg, hsl(${h} 75% 50%), hsl(${(h + 60) % 360} 70% 30%))`, animation: 'fkDisc 4s linear infinite', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#000' }} />
            </span>
            <div ref={box} style={{ overflow: 'hidden', flex: 1, minWidth: 0, whiteSpace: 'nowrap', WebkitMaskImage: scroll ? 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)' : 'none', maskImage: scroll ? 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)' : 'none' }}>
                <div style={{ display: 'inline-flex', animation: scroll ? `fkMarquee ${secs}s linear infinite` : 'none' }}>
                    <span ref={txt} style={{ color: '#fff', fontSize: 12, fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)', paddingRight: scroll ? 28 : 0 }}>♪ {label}</span>
                    {scroll && <span aria-hidden style={{ color: '#fff', fontSize: 12, fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)', paddingRight: 28 }}>♪ {label}</span>}
                </div>
            </div>
        </Wrap>
    )
}
