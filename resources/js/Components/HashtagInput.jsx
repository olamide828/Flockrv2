import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { RiHashtag } from 'react-icons/ri';

const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : String(n));

/**
 * Text input that suggests popular hashtags (with post counts) while typing.
 *  value / onChange  – the raw string the page already keeps
 *  separator         – ' ' (videos) or ', ' (products)
 *  kind              – 'videos' | 'products' | 'all'  (which counter to show)
 */
export default function HashtagInput({ value, onChange, separator = ' ', kind = 'all', placeholder, style, inputStyle }) {
    const [list, setList] = useState([]);
    const [open, setOpen] = useState(false);
    const [hi, setHi] = useState(0);
    const wrap = useRef(null);
    const timer = useRef(null);

    const splitter = separator.trim() === ',' ? /,\s*/ : /[\s,]+/;
    const parts = (value ?? '').split(splitter);
    const current = (parts[parts.length - 1] ?? '').replace(/^#/, '');

    useEffect(() => {
        if (!open) return;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            axios.get('/api/hashtags/suggest', { params: { q: current, type: kind } })
                .then((r) => { setList(r.data.tags ?? []); setHi(0); })
                .catch(() => setList([]));
        }, 180);
        return () => clearTimeout(timer.current);
    }, [current, open, kind]);

    useEffect(() => {
        const close = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        document.addEventListener('touchstart', close);
        return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close); };
    }, []);

    const used = new Set(parts.slice(0, -1).map((t) => t.replace(/^#/, '').toLowerCase()));
    const shown = list.filter((t) => !used.has(t.tag));

    const pick = (tag) => {
        const head = parts.slice(0, -1).filter(Boolean);
        onChange([...head, tag].join(separator) + separator);
        setOpen(true);
    };

    const onKey = (e) => {
        if (!open || shown.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => (h + 1) % shown.length); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => (h - 1 + shown.length) % shown.length); }
        else if ((e.key === 'Enter' || e.key === 'Tab') && current) { e.preventDefault(); pick(shown[hi].tag); }
        else if (e.key === 'Escape') setOpen(false);
    };

    return (
        <div ref={wrap} style={{ position: 'relative', ...style }}>
            <input
                value={value}
                onChange={(e) => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKey}
                placeholder={placeholder}
                autoComplete="off"
                autoCapitalize="none"
                style={inputStyle}
            />
            {open && shown.length > 0 && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 6, zIndex: 60, background: '#1a1a1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,0.55)', maxHeight: 260, overflowY: 'auto' }}>
                    <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
                        {current ? 'Matching tags' : 'Trending now'}
                    </div>
                    {shown.map((t, i) => {
                        const n = kind === 'videos' ? t.videos : kind === 'products' ? t.products : t.count;
                        return (
                            <button
                                key={t.tag}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pick(t.tag)}
                                onMouseEnter={() => setHi(i)}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: i === hi ? 'rgba(255,107,53,0.1)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                            >
                                <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B35', flexShrink: 0 }}><RiHashtag size={14} /></span>
                                <span style={{ flex: 1, color: '#fff', fontSize: 14, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.tag}</span>
                                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, flexShrink: 0 }}>{fmt(n)} {n === 1 ? 'post' : 'posts'}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
