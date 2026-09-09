import { RiCloseLine, RiShareForwardLine } from 'react-icons/ri'

export default function MediaLightbox({ url, type, onClose }) {
    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 990, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer' }}><RiCloseLine size={20} /></button>
            {type === 'video' ? (
                <video src={url} controls autoPlay onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '75vh', borderRadius: 12 }} />
            ) : (
                <img src={url} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '75vh', borderRadius: 12, objectFit: 'contain' }} />
            )}
            <a href={url} download onClick={e => e.stopPropagation()} style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)', fontSize: 12, textDecoration: 'none' }}>
                <RiShareForwardLine size={14} /> Download
            </a>
        </div>
    )
}