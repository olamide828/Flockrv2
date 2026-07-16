export default function RoomTrayAvatar({ room, isActive, onClick }) {
  return (
    <button onClick={onClick} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0, width:68 }}>
      <div style={{ position:'relative' }}>
        {room.has_unread && !isActive && (
          <div style={{ position:'absolute', inset:-3, borderRadius:'50%', background:'conic-gradient(from 0deg, #FF6B35, #FFD700, #FF6B35)', animation:'spin 2s linear infinite', zIndex:0 }} />
        )}
        <div style={{ position:'relative', zIndex:1, width:54, height:54, borderRadius:'50%', overflow:'hidden', border: isActive ? '2.5px solid #FF6B35' : room.has_unread ? '2.5px solid #050505' : '2px solid rgba(255,255,255,0.1)' }}>
          <img src={room.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        </div>
        {isActive && <div style={{ position:'absolute', bottom:1, right:1, width:13, height:13, borderRadius:'50%', background:'#10B981', border:'2.5px solid #050505', zIndex:2 }} />}
      </div>
      <span style={{ color: isActive ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontSize:10, fontWeight: isActive ? 700 : 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%', textAlign:'center' }}>{room.name}</span>
    </button>
  )
}