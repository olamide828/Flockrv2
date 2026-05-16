import AppLayout from '@/Layouts/AppLayout'
import { Head, router } from '@inertiajs/react'
import { useEffect } from 'react'

export default function Processing({ video }) {
  useEffect(() => {
    // optional: poll for status updates
    const interval = setInterval(() => {
      router.reload({ only: ['video'] })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const isDone = video.status === 'active'

  return (
    <>
      <Head title="Processing Video" />

      <div className="min-h-screen bg-black flex items-center justify-center text-white px-6">
        <div className="max-w-md w-full text-center space-y-6">

          <div className="w-14 h-14 mx-auto border-4 border-white/20 border-t-[#ff5c00] rounded-full animate-spin" />

          <h1 className="text-xl font-bold">
            {isDone ? 'Video Ready' : 'Processing your video'}
          </h1>

          <p className="text-sm text-white/60">
            {isDone
              ? 'Your video is now live on the feed.'
              : 'We are optimizing, encoding, and doing the stuff computers pretend is simple.'}
          </p>

          <div className="bg-[#111] border border-white/10 rounded-xl p-4 text-left text-xs text-white/60 space-y-2">
            <p><span className="text-white">Title:</span> {video.title || 'Untitled'}</p>
            <p><span className="text-white">Status:</span> {video.status}</p>
            <p><span className="text-white">Video ID:</span> {video.id}</p>
          </div>

          {isDone && (
            <button
              onClick={() => router.visit(`/video/${video.id}`)}
              className="w-full py-3 rounded-full bg-[#ff5c00] font-bold"
            >
              Watch Video
            </button>
          )}

          {!isDone && (
            <p className="text-xs text-white/40">
              This page will auto-update every few seconds.
            </p>
          )}
        </div>
      </div>
    </>
  )
}

Processing.layout = page => <AppLayout>{page}</AppLayout>