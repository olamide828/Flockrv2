
import { usePage, router } from '@inertiajs/react'
import { useState } from 'react'
import { RiMailLine, RiCloseLine } from 'react-icons/ri'

export default function VerifyEmailBanner() {
    const { auth } = usePage().props
    const [dismissed, setDismissed] = useState(false)

    const verified = !!auth?.user?.email_verified_at
    if (!auth?.user || verified || dismissed) return null

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(251,191,36,0.08)', borderBottom: '1px solid rgba(251,191,36,0.2)', flexShrink: 0 }}>
            <RiMailLine size={16} color="#FBBF24" style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13, color: '#FBBF24', flex: 1 }}>
                Verify your email to unlock checkout, uploads, and payouts.
                <button
                    onClick={() => router.visit('/verify-email')}
                    style={{ marginLeft: 8, background: 'none', border: 'none', color: '#FBBF24', textDecoration: 'underline', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                    Verify now
                </button>
            </p>
            <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(251,191,36,0.6)', flexShrink: 0 }}>
                <RiCloseLine size={16} />
            </button>
        </div>
    )
}