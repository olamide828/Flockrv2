import { useRef, useState } from 'react'
import { RiFullscreenLine } from 'react-icons/ri'
import PostVideoPlayer from './PostVideoPlayer'

export default function PostMediaCarousel({ media, onReport, height = 460, onExpand }) {
  const trackRef = useRef(null)
  const [active, setActive] = useState(0)

  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== active) setActive(i)
  }

  return (
    <div style={{ position: 'relative', height }}>
      <div ref={trackRef} onScroll={onScroll} style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', height: '100%' }}>
        {media.map((item, i) => (
          <div key={i} style={{ flex: '0 0 100%', scrollSnapAlign: 'start', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
            {item.media_type === 'video' ? (
              <PostVideoPlayer src={item.media_url} poster={item.thumbnail_url} onReport={onReport} onExpand={onExpand ? () => onExpand(i) : undefined} />
            ) : (
              <>
                <img src={item.media_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} />
                {onExpand && (
                  <button onPointerDown={(e) => { e.stopPropagation(); onExpand(i) }} style={{ position: 'absolute', top: 10, left: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 2 }}>
                    <RiFullscreenLine size={15} />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {media.length > 1 && (
        <>
          <div style={{ position: 'absolute', top: 10, right: 10, padding: '3px 9px', borderRadius: 999, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 700 }}>{active + 1}/{media.length}</div>
          <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
            {media.map((_, i) => (
              <div key={i} style={{ width: i === active ? 14 : 6, height: 6, borderRadius: 999, background: i === active ? '#FF6B35' : 'rgba(255,255,255,0.4)', transition: 'width 0.15s' }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}