import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { RiCloseLine, RiImage2Line } from 'react-icons/ri'
import Av from './Av'

export default function PostComposer({ auth, onClose, onPosted }) {
  const [content, setContent] = useState('')
  const [media, setMedia] = useState(null) // { preview, type, file }
  const [posting, setPosting] = useState(false)
  const textRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => { setTimeout(() => textRef.current?.focus(), 100) }, [])
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isVideo = file.type.startsWith('video/')
    setMedia({ preview: URL.createObjectURL(file), type: isVideo ? 'video' : 'image', file })
  }

  const submit = async () => {
    if ((!content.trim() && !media) || posting) return
    setPosting(true)

    try {
      let mediaUrl = null, mediaType = null

      if (media?.file) {
        const form = new FormData()
        form.append('file', media.file)
        form.append('type', media.type)
        try {
          const { data } = await axios.post('/api/upload/media', form, { headers: { 'Content-Type': 'multipart/form-data' } })
          if (!data?.url) throw new Error('Upload succeeded but no media URL was returned.')
          mediaUrl = data.url
          mediaType = media.type
        } catch (err) {
          alert(err.response?.data?.message ?? 'Failed to upload media. Please try again.')
          setPosting(false)
          return
        }
      }

      const { data } = await axios.post('/api/community/posts', {
        content: content.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
      })

      onPosted(data)
      if (media?.preview?.startsWith('blob:')) URL.revokeObjectURL(media.preview)
      onClose()
    } catch (err) {
      alert(err.response?.data?.message ?? 'Something went wrong while creating your post.')
    } finally {
      setPosting(false)
    }
  }

  const canPost = !posting && (content.trim().length > 0 || !!media)

  return (
    <div style={{ position:'fixed', inset:0, zIndex:900, background:'#0a0a0a', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
          <RiCloseLine size={18} />
        </button>
        <span style={{ color:'#fff', fontWeight:700, fontSize:16 }}>New Post</span>
        <button onClick={submit} disabled={!canPost} style={{ padding:'8px 22px', borderRadius:999, background: canPost ? '#FF6B35' : 'rgba(255,255,255,0.08)', border:'none', cursor: canPost ? 'pointer' : 'default', color: canPost ? '#fff' : 'rgba(255,255,255,0.3)', fontSize:14, fontWeight:700 }}>
          {posting ? 'Posting...' : 'Post'}
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        <div style={{ display:'flex', gap:12 }}>
          <Av user={auth?.user} size={42} />
          <div style={{ flex:1 }}>
            <p style={{ margin:'0 0 10px', color:'rgba(255,255,255,0.6)', fontSize:13 }}>{auth?.user?.name}</p>
            <textarea
              ref={textRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What's the latest? Share a product drop, update or story with your community..."
              maxLength={2000}
              rows={5}
              style={{ width:'100%', background:'none', border:'none', outline:'none', color:'rgba(255,255,255,0.92)', fontSize:17, lineHeight:1.6, resize:'none', boxSizing:'border-box', fontFamily:'"DM Sans", sans-serif', letterSpacing:'-0.1px' }}
            />
            {content.length > 1800 && (
              <p style={{ color: content.length >= 2000 ? '#EF4444' : 'rgba(255,255,255,0.3)', fontSize:11, margin:'4px 0 0', textAlign:'right' }}>{2000 - content.length}</p>
            )}
          </div>
        </div>

        {media && (
          <div style={{ marginTop:16, position:'relative', borderRadius:18, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)' }}>
            {media.type === 'video'
              ? <video src={media.preview} controls style={{ width:'100%', maxHeight:320, display:'block', background:'#000' }} />
              : <img src={media.preview} alt="" style={{ width:'100%', maxHeight:400, objectFit:'cover', display:'block' }} />}
            <button onClick={() => setMedia(null)} style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
              <RiCloseLine size={16} />
            </button>
          </div>
        )}
      </div>

      <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', padding:'12px 16px', display:'flex', alignItems:'center', gap:20, flexShrink:0 }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }} />
        <button onClick={() => fileRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:7, background:'none', border:'none', cursor:'pointer', color:'#FF6B35', fontSize:14, fontWeight:600, padding:0 }}>
          <RiImage2Line size={22} /> Photo/Video
        </button>
        <div style={{ marginLeft:'auto', position:'relative', width:28, height:28 }}>
          <svg width={28} height={28} style={{ transform:'rotate(-90deg)' }}>
            <circle cx={14} cy={14} r={11} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2.5} />
            <circle cx={14} cy={14} r={11} fill="none" stroke={content.length > 1800 ? '#EF4444' : '#FF6B35'} strokeWidth={2.5}
              strokeDasharray={`${(content.length / 2000) * 69.1} 69.1`} strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}