import { RiTrophyLine, RiFireLine } from 'react-icons/ri'

export default function LevelStreakChip({ gamification }) {
    if (!gamification) return null
    const { level, streak_days } = gamification

    return (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', borderRadius: 999, color: '#FF6B35', fontSize: 11, fontWeight: 700 }}>
                <RiTrophyLine size={12} /> Level {level}
            </span>
            {streak_days > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 999, color: '#FB923C', fontSize: 11, fontWeight: 700 }}>
                    <RiFireLine size={12} /> {streak_days} day{streak_days !== 1 ? 's' : ''}
                </span>
            )}
        </div>
    )
}