import { useRef, useState, useEffect } from 'react'
import PostVideoPlayer from './PostVideoPlayer'

export default function PostMediaCarousel({ media }) {
  const trackRef = useRef(null)
  const [active, setActive] = useState(0)

  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    if (index !== active) setActive(index)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={trackRef}
        onScroll={onScroll}
        style={{
          display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
        }}
      >
        {media.map((item, i) => (
          <div key={i} style={{ flex: '0 0 100%', scrollSnapAlign: 'start' }}>
            {item.media_type === 'video'
              ? <PostVideoPlayer src={item.media_url} poster={item.thumbnail_url} />
              : <img src={item.media_url} alt="" style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block' }} />
            }
          </div>
        ))}
      </div>

      {media.length > 1 && (
        <>
          <div style={{ position: 'absolute', top: 10, right: 10, padding: '3px 9px', borderRadius: 999, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 700 }}>
            {active + 1}/{media.length}
          </div>
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