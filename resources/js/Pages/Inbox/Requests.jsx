import { Head, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'
import { useState } from 'react'
import { RiArrowLeftLine, RiInboxUnarchiveLine } from 'react-icons/ri'

export default function MessageRequests({ requests: initial = [] }) {
    const [requests, setRequests] = useState(initial)
    const [busyId, setBusyId] = useState(null)

    const accept = async (conv) => {
        setBusyId(conv.id)
        try {
            await axios.post(`/api/conversations/${conv.id}/dismiss-request`)
            setRequests(prev => prev.filter(r => r.id !== conv.id))
            router.visit(`/inbox?user=${conv.other.id}`)
        } catch {} finally { setBusyId(null) }
    }

    const report = async (conv) => {
        setBusyId(conv.id)
        try {
            await axios.post(`/api/conversations/${conv.id}/report`, { reason: 'Spam or misleading content' })
            setRequests(prev => prev.filter(r => r.id !== conv.id))
        } catch {} finally { setBusyId(null) }
    }

    const block = async (conv) => {
        setBusyId(conv.id)
        try {
            await axios.post(`/api/users/${conv.other.id}/block`)
            setRequests(prev => prev.filter(r => r.id !== conv.id))
        } catch {} finally { setBusyId(null) }
    }

    return (
        <>
            <Head title="Message Requests" />
            <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => window.history.back()} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', cursor: 'pointer' }}><RiArrowLeftLine size={18} /></button>
                    <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Message Requests</h1>
                </div>

                <div style={{ maxWidth: 640, margin: '0 auto', padding: '10px 0' }}>
                    {requests.length === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '80px 24px', textAlign: 'center' }}>
                            <RiInboxUnarchiveLine size={32} color="rgba(255,255,255,0.2)" />
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>No pending message requests.</p>
                        </div>
                    )}
                    {requests.map(conv => (
                        <div key={conv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <img src={conv.other.avatar_url} alt={conv.other.name} style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 13.5 }}>{conv.other.name}</p>
                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.last_message?.body ?? 'Sent a message'}</p>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <button onClick={() => accept(conv)} disabled={busyId === conv.id} style={{ padding: '7px 14px', borderRadius: 999, background: '#FF6B35', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Accept</button>
                                <button onClick={() => report(conv)} disabled={busyId === conv.id} style={{ padding: '7px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Report</button>
                                <button onClick={() => block(conv)} disabled={busyId === conv.id} style={{ padding: '7px 12px', borderRadius: 999, background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Block</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}

MessageRequests.layout = page => <AppLayout>{page}</AppLayout>