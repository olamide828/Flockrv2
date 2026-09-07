import { useEffect, useRef } from 'react'

let HlsLib = null
async function loadHls() {
  if (HlsLib) return HlsLib
  const mod = await import('hls.js')
  HlsLib = mod.default
  return HlsLib
}

export function useHlsVideo(videoRef, src) {
  const hlsRef = useRef(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el || !src) return

    const isHls = src.includes('.m3u8')

    if (!isHls) {
      el.src = src
      return () => { el.removeAttribute('src') }
    }

    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = src
      return () => { el.removeAttribute('src') }
    }

    let cancelled = false

    loadHls().then(Hls => {
      if (cancelled || !videoRef.current) return
      if (!Hls.isSupported()) { el.src = src; return }
      const hls = new Hls({ maxBufferLength: 15 })
      hls.loadSource(src)
      hls.attachMedia(el)
      hlsRef.current = hls
    })

    return () => {
      cancelled = true
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    }
  }, [videoRef, src])
}