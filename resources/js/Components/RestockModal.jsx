import axios from 'axios';
import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { RiArrowRightLine, RiCloseLine, RiFireFill, RiHeartFill } from 'react-icons/ri';

/**
 * Animated "your saved item is back" modal. Mount once in AppLayout.
 * Pulls unread wishlist restock alerts; dismissing marks them read so it never repeats.
 */
export default function RestockModal() {
    const { auth } = usePage().props;
    const [items, setItems] = useState([]);
    const [i, setI] = useState(0);
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!auth?.user) return;
        let live = true;
        // small delay so it doesn't fight with the first paint / other announcement modals
        const t = setTimeout(() => {
            axios.get('/api/restock-alerts').then(r => {
                if (!live || !r.data.items?.length) return;
                setItems(r.data.items); setI(0); setShow(true);
            }).catch(() => {});
        }, 2500);
        return () => { live = false; clearTimeout(t); };
    }, [auth?.user?.id]);

    if (!show || !items.length) return null;
    const p = items[i];

    const dismissAll = () => {
        axios.post('/api/restock-alerts/dismiss', { ids: items.map(x => x.notification_id) }).catch(() => {});
        setShow(false);
    };
    const next = () => {
        axios.post('/api/restock-alerts/dismiss', { ids: [p.notification_id] }).catch(() => {});
        if (i + 1 >= items.length) setShow(false); else setI(i + 1);
    };
    const go = () => {
        axios.post('/api/restock-alerts/dismiss', { ids: items.map(x => x.notification_id) }).catch(() => {});
        setShow(false);
        router.visit(p.url);
    };
    const low = p.stock <= 5;
    const pct = Math.min(100, Math.max(6, (p.stock / 30) * 100));

    return (
        <div className="rm-wrap" role="dialog" aria-modal="true">
            <div className="rm-scrim" onClick={dismissAll} />
            <div className="rm-card" key={p.id}>
                <div className="rm-burst">{Array.from({ length: 14 }).map((_, k) => <i key={k} style={{ '--a': `${k * (360 / 14)}deg`, '--d': `${(k % 3) * 0.08}s` }} />)}</div>
                <button className="rm-x" onClick={dismissAll} aria-label="Close"><RiCloseLine size={18} /></button>

                <div className="rm-badge"><RiHeartFill size={13} /> From your wishlist</div>
                <h2>It’s back in stock!</h2>

                <div className="rm-img">
                    {p.image ? <img src={p.image} alt="" /> : <div className="rm-ph" />}
                    <span className="rm-tag">Restocked</span>
                </div>

                <h3>{p.name}</h3>
                <div className="rm-price">₦{Number(p.price).toLocaleString('en-NG')}{p.seller && <small> · {p.seller}</small>}</div>

                <div className={'rm-urg' + (low ? ' hot' : '')}>
                    <div className="rm-urg-top"><RiFireFill size={14} />{low ? `Only ${p.stock} left` : `${p.stock} available`} — get it before it sells out again</div>
                    <div className="rm-bar"><div style={{ width: pct + '%' }} /></div>
                </div>

                <button className="rm-cta" onClick={go}>Get it now <RiArrowRightLine size={17} /></button>
                <button className="rm-later" onClick={next}>{items.length > 1 && i + 1 < items.length ? `Next (${i + 1}/${items.length})` : 'Maybe later'}</button>
            </div>
            <style>{css}</style>
        </div>
    );
}

const css = `
.rm-wrap{position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;padding:20px}
.rm-scrim{position:absolute;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(10px);animation:rmfade .25s ease}
.rm-card{position:relative;width:100%;max-width:360px;background:linear-gradient(180deg,#1b1410,#111 45%);border:1px solid rgba(255,107,53,.3);border-radius:28px;padding:26px 22px 20px;text-align:center;color:#fff;animation:rmpop .5s cubic-bezier(.2,1.4,.4,1);box-shadow:0 30px 80px rgba(255,107,53,.18);overflow:hidden}
.rm-x{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;border:0;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2}
.rm-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;letter-spacing:.04em;color:#ff7a8a;background:rgba(255,90,110,.1);border:1px solid rgba(255,90,110,.25);padding:4px 11px;border-radius:999px;animation:rmslide .5s .15s both}
.rm-card h2{margin:12px 0 14px;font-size:24px;font-weight:900;letter-spacing:-.02em;background:linear-gradient(90deg,#fff,#ffb48f);-webkit-background-clip:text;background-clip:text;color:transparent;animation:rmslide .5s .2s both}
.rm-img{position:relative;width:150px;height:150px;margin:0 auto 14px;border-radius:22px;overflow:visible;animation:rmfloat 3s ease-in-out infinite}
.rm-img img,.rm-ph{width:100%;height:100%;object-fit:cover;border-radius:22px;background:#222;box-shadow:0 12px 30px rgba(0,0,0,.5)}
.rm-tag{position:absolute;top:-8px;right:-14px;background:#10B981;color:#fff;font-size:10.5px;font-weight:900;padding:4px 10px;border-radius:999px;transform:rotate(8deg);animation:rmstamp .5s .55s both;box-shadow:0 4px 14px rgba(16,185,129,.5)}
.rm-card h3{margin:0;font-size:16px;font-weight:700;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;animation:rmslide .5s .3s both}
.rm-price{margin-top:4px;font-size:18px;font-weight:800;color:#FF6B35;animation:rmslide .5s .35s both}.rm-price small{font-size:12px;font-weight:500;color:rgba(255,255,255,.4)}
.rm-urg{margin:16px 0;padding:11px 12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);animation:rmslide .5s .4s both}
.rm-urg.hot{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.3)}
.rm-urg-top{display:flex;gap:6px;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;color:rgba(255,255,255,.8)}.rm-urg.hot .rm-urg-top{color:#ff8a8a}
.rm-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.08);margin-top:9px;overflow:hidden}
.rm-bar div{height:100%;border-radius:99px;background:linear-gradient(90deg,#FF6B35,#ef4444);animation:rmgrow 1s .6s both;transform-origin:left}
.rm-cta{width:100%;padding:15px;border:0;border-radius:15px;background:#FF6B35;color:#fff;font-size:15px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;animation:rmslide .5s .45s both,rmpulse 1.8s 1.2s infinite}
.rm-later{margin-top:10px;background:none;border:0;color:rgba(255,255,255,.45);font-size:13px;cursor:pointer;padding:6px}
.rm-burst{position:absolute;top:150px;left:50%;width:0;height:0;pointer-events:none}
.rm-burst i{position:absolute;width:7px;height:7px;border-radius:50%;background:#FF6B35;opacity:0;animation:rmburst 1s var(--d) .3s ease-out;transform:rotate(var(--a))}
.rm-burst i:nth-child(3n){background:#10B981}.rm-burst i:nth-child(3n+1){background:#F5B93B}
@keyframes rmfade{from{opacity:0}}
@keyframes rmpop{from{opacity:0;transform:scale(.7) translateY(30px)}}
@keyframes rmslide{from{opacity:0;transform:translateY(14px)}}
@keyframes rmfloat{50%{transform:translateY(-6px)}}
@keyframes rmstamp{from{opacity:0;transform:rotate(8deg) scale(2.2)}}
@keyframes rmgrow{from{transform:scaleX(0)}}
@keyframes rmpulse{0%,100%{box-shadow:0 0 0 0 rgba(255,107,53,.5)}50%{box-shadow:0 0 0 10px rgba(255,107,53,0)}}
@keyframes rmburst{0%{opacity:1;transform:rotate(var(--a)) translateY(0)}100%{opacity:0;transform:rotate(var(--a)) translateY(-120px)}}
@media(prefers-reduced-motion:reduce){.rm-card *,.rm-card{animation:none!important}}
`;
