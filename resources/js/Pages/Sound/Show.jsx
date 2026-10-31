import { Head, router } from '@inertiajs/react'
import SoundDetailsSheet from '@/Components/Sound/SoundDetailsSheet'

/**
 * Direct links to a sound (/sound/12 or /sound/from-video/ULID, e.g. shared links) open the same sheet over a blank
 * page. A removed sound shows "removed" inside the sheet instead of a 404.
 */
export default function SoundShow({ soundId, fromVideo }) {
    const back = () => (window.history.length > 1 ? window.history.back() : router.visit('/'))
    return (
        <div style={{ minHeight: '100dvh', background: '#050505' }}>
            <Head title="Sound" />
            <SoundDetailsSheet soundId={soundId} fromVideo={fromVideo} onClose={back} />
        </div>
    )
}

SoundShow.layout = page => page
