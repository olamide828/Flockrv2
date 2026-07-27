
import { Head, router } from '@inertiajs/react'
import { VolumeOffIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { RiCompassDiscoverLine, RiVideoOffLine } from 'react-icons/ri'

// ── Alt video card — plays video on hover ─────────────────────────────────────
function AltVideoCard({ video }) {
  const videoRef      = useRef(null)
  const [hovered,    setHovered]    = useState(false)
  const [vidLoaded,  setVidLoaded]  = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (hovered) {
      el.muted  = true
      el.volume = 0
      el.play().catch(() => {})
    } else {
      el.pause()
      el.currentTime = 0
    }
  }, [hovered])

  return (
    <a
      href={`/@${video.user?.username}/video/${video.ulid}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        width: 120,
        display: 'block',
        textDecoration: 'none',
        borderRadius: 14,
        overflow: 'hidden',
        background: '#111',
        border: `1.5px solid ${hovered ? 'rgba(255,92,0,0.5)' : 'rgba(255,255,255,0.07)'}`,
        transform: hovered ? 'translateY(-3px) scale(1.03)' : 'translateY(0) scale(1)',
        transition: 'transform 0.22s ease, border-color 0.2s ease, box-shadow 0.22s ease',
        boxShadow: hovered ? '0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,92,0,0.15)' : '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      {/* 9:16 media container */}
      <div style={{ position: 'relative', aspectRatio: '9/16', background: '#0d0d0d', overflow: 'hidden' }}>

        {/* Thumbnail — always present as fallback */}
        {video.thumbnail_url_full && (
          <img
            src={video.thumbnail_url_full}
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: (hovered && vidLoaded) ? 0 : 1,
              transition: 'opacity 0.3s ease',
            }}
          />
        )}

        {/* Video — loads on hover, plays muted */}
        {video.video_stream_url && hovered && (
          <video
            ref={videoRef}
            src={video.video_stream_url}
            muted playsInline loop
            onCanPlay={() => setVidLoaded(true)}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: vidLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />
        )}

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.08) 50%, transparent 100%)',
        }} />

        {/* Mute indicator — shows while playing */}
        {hovered && (
          <div style={{
            position: 'absolute', top: 7, right: 7,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            borderRadius: 999, padding: '3px 6px',
            display: 'flex', alignItems: 'center', gap: 3,
            opacity: hovered ? 1 : 0, transition: 'opacity 0.2s',
          }}>
            <VolumeOffIcon size={10} color="rgba(255,255,255,0.7)" />
          </div>
        )}

        {/* Username pill at bottom */}
        <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>
          <p style={{
            color: '#fff', fontSize: 10, fontWeight: 700, margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>
            @{video.user?.username}
          </p>
        </div>
      </div>

      {/* Title below */}
      <div style={{ padding: '8px 9px 10px' }}>
        <p style={{
          color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 500,
          margin: 0, lineHeight: 1.4,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {video.title || 'Watch now'}
        </p>
      </div>
    </a>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VideoGone({ deletedVideo = {}, alternatives = [], categoryHint = null }) {
  const bgVideoRef = useRef(null)
  const [bgReady,  setBgReady]  = useState(false)
  const [btnHover, setBtnHover] = useState(false)

  // Autoplay the blurred background loop silently
  useEffect(() => {
    const el = bgVideoRef.current
    if (!el) return
    el.muted  = true
    el.loop   = true
    el.volume = 0
    el.play().catch(() => {})
  }, [])

  const hasBg      = !!(deletedVideo.video_stream_url || deletedVideo.thumbnail_url_full)
  const ctaLabel   = categoryHint ? `Keep Exploring ${categoryHint}` : 'Explore the Main Feed'

  return (
    <>
      <Head title="This drop has ended — Flockr" />

      {/* Full-screen — intentionally no AppLayout so the bg loop fills everything */}
      <div style={{ position: 'fixed', inset: 0, background: '#080808', overflow: 'hidden' }}>

        {/* ── Blurred background loop ──────────────────────────────────── */}
        {deletedVideo.video_stream_url ? (
          <video
            ref={bgVideoRef}
            src={deletedVideo.video_stream_url}
            playsInline muted loop
            onCanPlay={() => setBgReady(true)}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover',
              // Extra saturation makes the blurred colours pop against the dark overlay
              filter: 'blur(36px) brightness(0.28) saturate(1.6)',
              transform: 'scale(1.12)', // hides blur edge artefacts
              opacity: bgReady ? 1 : 0,
              transition: 'opacity 1s ease',
            }}
          />
        ) : deletedVideo.thumbnail_url_full ? (
          <img
            src={deletedVideo.thumbnail_url_full}
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover',
              filter: 'blur(36px) brightness(0.25) saturate(1.6)',
              transform: 'scale(1.12)',
            }}
          />
        ) : (
          // No media at all — subtle gradient so the page isn't pure black
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 50% 30%, rgba(255,92,0,0.08) 0%, transparent 70%)',
          }} />
        )}

        {/* Layered vignette — dark edges, slightly warmer centre */}
        <div style={{
          position: 'absolute', inset: 0,
          background: hasBg
            ? 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.82) 100%)'
            : 'none',
        }} />

        {/* ── Content layer ────────────────────────────────────────────── */}
        <div style={{
          position: 'relative', zIndex: 10,
          height: '100%', overflowY: 'auto', scrollbarWidth: 'none',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '32px 20px 48px',
        }}>

          {/* Glass card */}
          <div style={{
            width: '100%', maxWidth: 420,
            background: 'rgba(6,6,6,0.82)',
            backdropFilter: 'blur(48px)',
            WebkitBackdropFilter: 'blur(48px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 28,
            overflow: 'hidden',
            boxShadow: [
              '0 48px 120px rgba(0,0,0,0.75)',
              'inset 0 1px 0 rgba(255,255,255,0.05)',
              '0 0 0 1px rgba(255,255,255,0.03)',
            ].join(', '),
          }}>

            {/* Animated top accent stripe */}
            <div style={{
              height: 2.5,
              background: 'linear-gradient(90deg, transparent 0%, #ff5c00 30%, #ffaa5c 50%, #ff5c00 70%, transparent 100%)',
              backgroundSize: '300% 100%',
              animation: 'scanline 3s ease-in-out infinite',
            }} />

            <div style={{ padding: '28px 22px 26px', textAlign: 'center' }}>

              {/* Icon */}
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(255,92,0,0.16), rgba(255,92,0,0.04))',
                border: '1.5px solid rgba(255,92,0,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <RiVideoOffLine size={24} color="#ff5c00" />
              </div>

              {/* Headline */}
              <h1 style={{
                color: '#fff', fontWeight: 800, fontSize: 17,
                margin: '0 0 8px', letterSpacing: '-0.2px', lineHeight: 1.35,
              }}>
                This exclusive style loop has ended
              </h1>
              <p style={{
                color: 'rgba(255,255,255,0.38)', fontSize: 13,
                lineHeight: 1.65, margin: '0 0 22px',
              }}>
                But don't miss out on what's trending right now.
              </p>

              {/* ── Alternatives ─────────────────────────────────────── */}
              {alternatives.length > 0 && (
                <div style={{ marginBottom: 22, textAlign: 'left' }}>
                  <p style={{
                    color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    margin: '0 0 11px',
                  }}>
                    🔥 Trending now{categoryHint ? ` · ${categoryHint}` : ''}
                  </p>

                  {/* Horizontal scroll — bleeds to card edges */}
                  <div style={{
                    display: 'flex', gap: 9,
                    overflowX: 'auto', scrollbarWidth: 'none',
                    paddingBottom: 4,
                    marginLeft: -22, marginRight: -22,
                    paddingLeft: 22, paddingRight: 22,
                  }}>
                    {alternatives.slice(0, 8).map(v => (
                      <AltVideoCard key={v.ulid ?? v.id} video={v} />
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={() => router.visit('/')}
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => setBtnHover(false)}
                style={{
                  width: '100%', padding: '14px 20px',
                  background: btnHover
                    ? 'linear-gradient(135deg, #ff7a2e, #ff5c00)'
                    : 'linear-gradient(135deg, #ff5c00, #e64d00)',
                  border: 'none', borderRadius: 999,
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: btnHover
                    ? '0 0 48px rgba(255,92,0,0.6), 0 8px 24px rgba(255,92,0,0.35)'
                    : '0 0 24px rgba(255,92,0,0.28), 0 4px 12px rgba(0,0,0,0.4)',
                  transform: btnHover ? 'scale(1.01)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                }}
              >
                <RiCompassDiscoverLine size={17} />
                {ctaLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          0%   { background-position: 200% center }
          100% { background-position: -100% center }
        }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </>
  )
}