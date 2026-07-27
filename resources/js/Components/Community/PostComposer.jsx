import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { RiCloseLine, RiImage2Line } from 'react-icons/ri'
import Av from './Av'

const MAX_ITEMS = 10
const MAX_UPLOAD_MB = 100

export default function PostComposer({ auth, onClose, onPosted, showToast }) {
  const [content, setContent] = useState('')
  const [items, setItems] = useState([]) // [{ preview, type, file }]
  const [posting, setPosting] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null) // "Uploading 2/4..." while posting
  const textRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => { setTimeout(() => textRef.current?.focus(), 100) }, [])
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  const handleFiles = (e) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const room = MAX_ITEMS - items.length
    if (files.length > room) {
      showToast?.(`You can attach up to ${MAX_ITEMS} items — only adding the first ${room}.`, 'error')
    }

    const accepted = files.slice(0, room).filter(file => {
      if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        showToast?.(`${file.name} is too big — max ${MAX_UPLOAD_MB}MB.`, 'error')
        return false
      }
      return true
    })

    const newItems = accepted.map(file => ({
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      file,
    }))
    setItems(prev => [...prev, ...newItems])
    e.target.value = ''
  }

  const removeItem = (index) => {
    setItems(prev => {
      const item = prev[index]
      if (item?.preview?.startsWith('blob:')) URL.revokeObjectURL(item.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const submit = async () => {
    if ((!content.trim() && items.length === 0) || posting) return
    setPosting(true)

    try {
      const uploaded = []
      for (let i = 0; i < items.length; i++) {
        setUploadStatus(items.length > 1 ? `Uploading ${i + 1}/${items.length}...` : 'Uploading...')
        const form = new FormData()
        form.append('file', items[i].file)
        form.append('type', items[i].type)
        try {
          const { data } = await axios.post('/api/upload/media', form, { headers: { 'Content-Type': 'multipart/form-data' } })
          if (!data?.url) throw new Error('Upload succeeded but no media URL was returned.')
          uploaded.push({ url: data.url, type: items[i].type })
        } catch (err) {
          showToast?.(err.response?.data?.message ?? 'Failed to upload media. Please try again.', 'error')
          setPosting(false)
          setUploadStatus(null)
          return
        }
      }
      setUploadStatus(null)

      const { data } = await axios.post('/api/community/posts', {
        content: content.trim() || null,
        media: uploaded.length ? uploaded : undefined,
      })

      onPosted(data)
      items.forEach(item => { if (item.preview?.startsWith('blob:')) URL.revokeObjectURL(item.preview) })
      onClose()
    } catch (err) {
      showToast?.(err.response?.data?.message ?? 'Something went wrong while creating your post.', 'error')
    } finally {
      setPosting(false)
      setUploadStatus(null)
    }
  }

  const canPost = !posting && (content.trim().length > 0 || items.length > 0)

  return (
    <div style={{ position:'fixed', inset:0, zIndex:900, background:'#0a0a0a', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
          <RiCloseLine size={18} />
        </button>
        <span style={{ color:'#fff', fontWeight:700, fontSize:16 }}>New Post</span>
        <button onClick={submit} disabled={!canPost} style={{ padding:'8px 22px', borderRadius:999, background: canPost ? '#FF6B35' : 'rgba(255,255,255,0.08)', border:'none', cursor: canPost ? 'pointer' : 'default', color: canPost ? '#fff' : 'rgba(255,255,255,0.3)', fontSize:14, fontWeight:700 }}>
          {posting ? (uploadStatus ?? 'Posting...') : 'Post'}
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

        {items.length > 0 && (
          <div style={{ marginTop:16, display:'grid', gridTemplateColumns: items.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap:8 }}>
            {items.map((item, i) => (
              <div key={i} style={{ position:'relative', borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)', background:'#000' }}>
                {item.type === 'video'
                  ? <video src={item.preview} controls style={{ width:'100%', maxHeight: items.length === 1 ? 320 : 180, display:'block', objectFit:'cover' }} />
                  : <img src={item.preview} alt="" style={{ width:'100%', maxHeight: items.length === 1 ? 400 : 180, objectFit:'cover', display:'block' }} />}
                <button onClick={() => removeItem(i)} disabled={posting} style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', border:'none', borderRadius:'50%', width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
                  <RiCloseLine size={14} />
                </button>
                <span style={{ position:'absolute', bottom:6, left:6, padding:'2px 7px', borderRadius:999, background:'rgba(0,0,0,0.6)', color:'#fff', fontSize:10, fontWeight:700 }}>{i + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', padding:'12px 16px', display:'flex', alignItems:'center', gap:20, flexShrink:0 }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display:'none' }} />
        <button onClick={() => fileRef.current?.click()} disabled={items.length >= MAX_ITEMS} style={{ display:'flex', alignItems:'center', gap:7, background:'none', border:'none', cursor: items.length >= MAX_ITEMS ? 'default' : 'pointer', color: items.length >= MAX_ITEMS ? 'rgba(255,107,53,0.4)' : '#FF6B35', fontSize:14, fontWeight:600, padding:0 }}>
          <RiImage2Line size={22} /> Photo/Video {items.length > 0 && `(${items.length}/${MAX_ITEMS})`}
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