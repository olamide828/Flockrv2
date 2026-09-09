import { router } from '@inertiajs/react'
import { RiNotificationLine, RiInboxUnarchiveLine, RiUserAddLine, RiSearchLine } from 'react-icons/ri'

export default function InboxSidebarHeader({ notifCount, requestsCount, search, onSearchChange, onOpenNewMessage }) {
    return (
        <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>Messages</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { router.visit('/notifications'); }} style={iconBtnStyle}>
                        <RiNotificationLine size={18} color={notifCount > 0 ? '#FF6B35' : 'rgba(255,255,255,0.5)'} />
                        {notifCount > 0 && <span style={badgeStyle}>{notifCount > 9 ? '9+' : notifCount}</span>}
                    </button>
                    <button onClick={() => router.visit('/inbox/requests')} style={iconBtnStyle}>
                        <RiInboxUnarchiveLine size={18} color={requestsCount > 0 ? '#FF6B35' : 'rgba(255,255,255,0.5)'} />
                        {requestsCount > 0 && <span style={badgeStyle}>{requestsCount > 9 ? '9+' : requestsCount}</span>}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <RiSearchLine size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder="Search for a user"
                        className="search-inp"
                    />
                </div>
                <button onClick={onOpenNewMessage} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.25)', color: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <RiUserAddLine size={16} />
                </button>
            </div>
        </div>
    )
}

const iconBtnStyle = { position: 'relative', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
const badgeStyle = { position: 'absolute', top: -3, right: -3, minWidth: 15, height: 15, borderRadius: 999, background: '#ff5c00', border: '2px solid #0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#fff', padding: '0 3px' }