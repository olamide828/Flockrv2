import { useState, useRef, useCallback } from 'react'
import { Head, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'

const MAX_SIZE_MB    = 500
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/x-matroska', 'video/mkv']
export default function VideoUpload({ products = [] }) {
  const fileRef       = useRef(null)
  const [file,        setFile]        = useState(null)
  const [preview,     setPreview]     = useState(null)
  const [dragging,    setDragging]    = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [stage,       setStage]       = useState('idle') // idle | uploading | processing | done | error
  const [error,       setError]       = useState(null)
  const [videoId,     setVideoId]     = useState(null)

  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [hashtags,    setHashtags]    = useState('')
  const [tagInput,    setTagInput]    = useState('')
  const [selectedProducts, setSelectedProducts] = useState([])

  // ── File selection ───────────────────────────────────────────────────────
  const handleFile = useCallback((f) => {
    if (!f) return
    setError(null)

    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('Please upload an MP4, MOV, AVI, MKV or WebM file.')
      return
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`)
      return
    }

    setFile(f)
    setPreview(URL.createObjectURL(f))
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  // ── Upload ───────────────────────────────────────────────────────────────
  const handleUpload = async () => {
  if (!file) return
  setUploading(true)
  setStage('uploading')
  setError(null)

  const formData = new FormData()
  formData.append('video',       file)
  formData.append('title',       title)
  formData.append('description', description)
  formData.append(
  'hashtags',
  JSON.stringify(
    hashtags
      .split(' ')
      .filter(t => t.startsWith('#'))
      .slice(0, 10)
  )
)

  if (selectedProducts.length > 0) {
    formData.append('product_ids', JSON.stringify(selectedProducts));  // Backend expects this
  }

  try {
    // Get Sanctum CSRF cookie first (sets XSRF-TOKEN)
    await axios.get('/sanctum/csrf-cookie');
    
    const { data } = await axios.post('/api/videos/upload', formData, {
      headers: { 
        // Let browser set boundary automatically
        // 'Content-Type': 'multipart/form-data',  // Remove this line
      },
      withCredentials: true,  // Critical: sends auth cookies
      onUploadProgress: (e) => {
        setProgress(Math.round((e.loaded * 100) / e.total));
      },
    });

    setVideoId(data.video_id);
    setStage('processing');
    setStage('done');  // Skip processing UI if no job
  } catch (err) {
    console.error(err);  // Debug
    console.error('Full error:', err.response?.data.errors)
    setError(err.response?.data?.message ?? 'Upload failed.');
    setStage('error');
  } finally {
    setUploading(false);
  }
};

  const toggleProduct = (id) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  // ── Done state ───────────────────────────────────────────────────────────
  if (stage === 'done') {
    return (
      <>
        <Head title="Video Uploaded!" />
        <div className="h-screen flex items-center justify-center bg-flockr-black">
          <div className="text-center space-y-5 max-w-sm px-6 animate-slide-up">
            <div className="w-20 h-20 rounded-full bg-flockr-green/10 border border-flockr-green/30 flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-flockr-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="font-display font-bold text-white text-2xl">Video Uploaded! 🎉</h2>
            <p className="text-flockr-muted text-sm leading-relaxed">
              Your video is being processed — captions and AI embeddings are being generated in the background. It will go live shortly.
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <button onClick={() => router.visit(`/video/${videoId}`)} className="btn-primary py-3">
                View Video
              </button>
              <button onClick={() => { setStage('idle'); setFile(null); setPreview(null); setProgress(0) }} className="btn-ghost py-3">
                Upload Another
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head title="Upload Video" />

      <div className="h-screen overflow-y-auto scroll-hidden bg-flockr-black">
        <div className="sticky top-0 z-20 bg-flockr-black/90 backdrop-blur-md border-b border-white/[0.06] px-6 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-white/[0.06] text-flockr-muted hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="font-display font-bold text-white text-xl">Upload Video</h1>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8 pb-24 space-y-8">

          {/* ── Drop zone ────────────────────────────────────────────── */}
          {!file ? (
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-4 rounded-flockr-lg border-2 border-dashed p-16 cursor-pointer transition-all duration-200 ${
                dragging
                  ? 'border-flockr-orange bg-flockr-orange/5'
                  : 'border-white/[0.12] hover:border-white/[0.25] hover:bg-white/[0.02]'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mkv,.avi"
                onChange={e => handleFile(e.target.files[0])}
                className="hidden"
              />
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${dragging ? 'bg-flockr-orange/20' : 'bg-flockr-card'}`}>
                <svg className={`w-10 h-10 transition-colors ${dragging ? 'text-flockr-orange' : 'text-flockr-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-base">
                  {dragging ? 'Drop it here!' : 'Drag & drop your video'}
                </p>
                <p className="text-flockr-muted text-sm mt-1">or <span className="text-flockr-orange">click to browse</span></p>
                <p className="text-flockr-subtle text-xs mt-2">MP4, MOV, WebM, AVI, MKV · Max {MAX_SIZE_MB}MB · Up to 3 minutes</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Preview */}
              <div className="w-full md:w-48 shrink-0">
                <div className="relative aspect-[9/16] rounded-flockr overflow-hidden bg-flockr-card border border-white/[0.08]">
                  <video src={preview} className="w-full h-full object-cover" muted playsInline />
                  <div className="video-overlay absolute inset-0" />
                  <button
                    onClick={() => { setFile(null); setPreview(null) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="absolute bottom-2 left-2">
                    <p className="text-white text-xs font-medium">{file.name}</p>
                    <p className="text-white/60 text-[10px]">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div className="flex-1 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-flockr-muted uppercase tracking-wider">Title (optional)</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your video a catchy title..." className="input-flockr" maxLength={100} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-flockr-muted uppercase tracking-wider">Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe what's in your video. Include relevant details to help buyers find it..."
                    rows={3}
                    className="input-flockr resize-none"
                    maxLength={500}
                  />
                  <p className="text-flockr-subtle text-xs text-right">{description.length}/500</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-flockr-muted uppercase tracking-wider">Hashtags</label>
                  <input
                    value={hashtags}
                    onChange={e => setHashtags(e.target.value)}
                    placeholder="#fashion #lagos #ankara — separate with spaces"
                    className="input-flockr"
                  />
                  <p className="text-flockr-subtle text-xs">AI will also suggest hashtags from your video's audio automatically.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Tag products ──────────────────────────────────────────── */}
          {file && products.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-display font-bold text-white text-base">Tag Products</h3>
                  <p className="text-flockr-muted text-xs mt-0.5">Select products shown in this video so viewers can buy them</p>
                </div>
                {selectedProducts.length > 0 && (
                  <span className="badge badge-orange">{selectedProducts.length} selected</span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`flex items-center gap-3 p-3 rounded-flockr border-2 text-left transition-all ${
                      selectedProducts.includes(product.id)
                        ? 'border-flockr-orange bg-flockr-orange/10'
                        : 'border-white/[0.06] bg-flockr-card hover:border-white/20'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-flockr-surface shrink-0">
                      {product.primary_image
                        ? <img src={product.primary_image} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-flockr-subtle" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-medium line-clamp-2 leading-snug">{product.name}</p>
                      <p className="text-flockr-orange text-xs font-bold mt-1 naira">₦{Number(product.price).toLocaleString()}</p>
                    </div>
                    {selectedProducts.includes(product.id) && (
                      <div className="ml-auto shrink-0">
                        <div className="w-5 h-5 rounded-full bg-flockr-orange flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Error ─────────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-flockr p-4">
              <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* ── Upload progress ───────────────────────────────────────── */}
          {stage === 'uploading' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white font-medium">Uploading...</span>
                <span className="text-flockr-orange font-bold">{progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-flockr-muted text-xs">Please don't close this page.</p>
            </div>
          )}

          {stage === 'processing' && (
            <div className="flex items-center gap-4 bg-flockr-card rounded-flockr p-4 border border-white/[0.06]">
              <div className="w-10 h-10 border-2 border-white/20 border-t-flockr-orange rounded-full animate-spin shrink-0" />
              <div>
                <p className="text-white font-medium text-sm">Processing your video...</p>
                <p className="text-flockr-muted text-xs mt-0.5">Generating captions, thumbnails, and AI tags. This takes 1–2 minutes.</p>
              </div>
            </div>
          )}

          {/* ── Submit ────────────────────────────────────────────────── */}
          {file && stage === 'idle' && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Publish Video
            </button>
          )}
        </div>
      </div>
    </>
  )
}

VideoUpload.layout = page => <AppLayout>{page}</AppLayout>
