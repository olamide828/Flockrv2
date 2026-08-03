import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import ProPlansSheet from '@/Components/ProPlansSheet';
import {
    RiArrowLeftLine, RiMoneyDollarCircleLine, RiShoppingBagLine, RiEyeLine,
    RiTimeLine, RiUserFollowLine, RiBarChartBoxLine, RiArrowUpLine, RiArrowDownLine,
    RiPlayCircleLine, RiStore3Line, RiCheckboxCircleLine, RiFireLine,
} from 'react-icons/ri';

function fmtN(n) {
    n = Number(n ?? 0);
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
}
function fmtNaira(n) { return '₦' + Number(n ?? 0).toLocaleString(); }
function fmtChange(v) {
    const up = v >= 0;
    return { up, label: `${up ? '+' : ''}${v}%` };
}
function fmtDate(d) {
    return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ChangeTag({ value }) {
    const { up, label } = fmtChange(value);
    return (
        <span className={`az-change ${up ? 'az-up' : 'az-down'}`}>
            {up ? <RiArrowUpLine size={11} /> : <RiArrowDownLine size={11} />} {label}
        </span>
    );
}

function KpiCard({ label, value, change, icon: Icon, sub }) {
    return (
        <div className="az-kpi">
            <div className="az-kpi-top">
                <div className="az-kpi-icon"><Icon size={17} /></div>
                {change !== undefined && <ChangeTag value={change} />}
            </div>
            <strong>{value}</strong>
            <p>{label}{sub ? <span className="az-kpi-sub"> · {sub}</span> : null}</p>
        </div>
    );
}

// ── Info strip: shows a placeholder hint, then real data on hover/tap ────────
function ChartInfo({ children, placeholder }) {
    return (
        <div className="az-chart-info">
            {children ?? <span className="az-chart-info-muted">{placeholder}</span>}
        </div>
    );
}

// Daily revenue bar chart with hover/tap detail
function RevenueBars({ data }) {
    const [hovered, setHovered] = useState(null);
    if (!data?.length) return <div className="az-empty-inline">No revenue in this period yet.</div>;
    const max = Math.max(...data.map(d => Number(d.revenue)), 1);
    const active = hovered !== null ? data[hovered] : null;

    return (
        <div>
            <ChartInfo placeholder="Tap or hover a bar to see that day's revenue and order count">
                {active && (
                    <span><strong>{fmtNaira(active.revenue)}</strong> from <strong>{active.orders}</strong> order{active.orders != 1 ? 's' : ''} on {fmtDate(active.date)}</span>
                )}
            </ChartInfo>
            <div className="az-bars">
                {data.map((d, i) => {
                    const h = Math.max(4, (Number(d.revenue) / max) * 100);
                    return (
                        <div
                            key={i}
                            className="az-bar-col"
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                            onClick={(e) => {
                                e.stopPropagation();
                                setHovered(i);
                            }}
                        >
                            <div className={`az-bar ${hovered === i ? 'az-bar-active' : ''}`} style={{ height: `${h}%` }} />
                        </div>
                    );
                })}
            </div>
            <p className="az-chart-caption">
                Each bar is one day. <strong>X-axis</strong> = date, left (oldest) to right (today). <strong>Bar height</strong> = revenue earned that day — taller means you made more.
            </p>
        </div>
    );
}

// Cumulative follower count, day by day, with hover/tap detail
function FollowerGrowthChart({ data, totalFollowers }) {
    const [hovered, setHovered] = useState(null);
    if (!data?.length) return <div className="az-empty-inline">No new followers in this period yet.</div>;

    const totalNew = data.reduce((s, d) => s + Number(d.new_followers), 0);
    let running = totalFollowers - totalNew;
    const points = data.map(d => {
        running += Number(d.new_followers);
        return running;
    });
    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const range = Math.max(1, max - min);
    const active = hovered !== null ? { date: data[hovered].date, total: points[hovered], gained: data[hovered].new_followers } : null;

    return (
        <div>
            <ChartInfo placeholder="Tap or hover a bar to see your follower count that day">
                {active && (
                    <span><strong>{active.total.toLocaleString()}</strong> total followers on {fmtDate(active.date)} <span className="az-chart-info-muted">(+{active.gained} that day)</span></span>
                )}
            </ChartInfo>
            <div className="az-bars">
                {points.map((v, i) => {
                    const h = Math.max(4, ((v - min) / range) * 100);
                    return (
                        <div
                            key={i}
                            className="az-bar-col"
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                            onClick={(e) => {
                                e.stopPropagation();
                                setHovered(i);
                            }}
                        >
                            <div className={`az-bar az-bar-blue ${hovered === i ? 'az-bar-active' : ''}`} style={{ height: `${h}%` }} />
                        </div>
                    );
                })}
            </div>
            <p className="az-chart-caption">
                Each bar is one day. <strong>X-axis</strong> = date. <strong>Bar height</strong> = your total follower count on that day (running total, not just new ones).
            </p>
        </div>
    );
}

function RetentionBars({ data }) {
    const [hovered, setHovered] = useState(null);
    if (!data?.length) return <div className="az-empty-inline">No watch data yet.</div>;
    const active = hovered !== null ? data.find(r => r.threshold === hovered) : null;

    return (
        <div>
            <ChartInfo placeholder="Tap or hover a row to see the exact number of viewers">
                {active && (
                    <span><strong>{active.reached}</strong> of <strong>{active.total}</strong> views ({active.pct}%) watched to at least <strong>{active.threshold}%</strong></span>
                )}
            </ChartInfo>
            <div className="az-retention">
                {data.map(r => (
                    <div
                        key={r.threshold}
                        className={`az-retention-row ${hovered === r.threshold ? 'az-retention-row-active' : ''}`}
                        onMouseEnter={() => setHovered(r.threshold)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={(e) => {
                            e.stopPropagation();
                            setHovered(r.threshold);
                        }}
                    >
                        <span className="az-retention-label">{r.threshold}%</span>
                        <div className="az-retention-track">
                            <div className="az-retention-fill" style={{ width: `${r.pct}%` }} />
                        </div>
                        <span className="az-retention-pct">{r.pct}%</span>
                    </div>
                ))}
            </div>
            <p className="az-chart-caption">
                Each row is a watch-progress checkpoint. <strong>"50%"</strong> means: of everyone who watched, what share stuck around to at least the halfway point? It's normal for the percentage to drop as you go down — that's viewers leaving early.
            </p>
        </div>
    );
}

// Day-of-week × hour revenue heatmap with hover/tap detail
function Heatmap({ data }) {
    const [hovered, setHovered] = useState(null); // { dow, hour }
    const grid = {};
    let max = 1;
    (data ?? []).forEach(d => {
        const key = `${d.dow}-${d.hour}`;
        grid[key] = { revenue: Number(d.revenue), orders: Number(d.orders) };
        if (Number(d.revenue) > max) max = Number(d.revenue);
    });

    const activeVal = hovered ? grid[`${hovered.dow}-${hovered.hour}`] : null;

    return (
        <div>
            <ChartInfo placeholder="Tap or hover a cell to see revenue for that day and hour">
                {hovered && (
                    activeVal
                        ? <span><strong>{fmtNaira(activeVal.revenue)}</strong> from <strong>{activeVal.orders}</strong> order{activeVal.orders != 1 ? 's' : ''} — {DOW_FULL[hovered.dow]}, {hovered.hour}:00–{hovered.hour}:59</span>
                        : <span className="az-chart-info-muted">No sales — {DOW_FULL[hovered.dow]}, {hovered.hour}:00–{hovered.hour}:59</span>
                )}
            </ChartInfo>
            <div className="az-heatmap">
                <div className="az-heatmap-hours">
                    {Array.from({ length: 24 }, (_, h) => (
                        <span key={h} className="az-heatmap-hourlabel">{h % 6 === 0 ? `${h}h` : ''}</span>
                    ))}
                </div>
                {DOW_LABELS.map((label, dow) => (
                    <div key={dow} className="az-heatmap-row">
                        <span className="az-heatmap-day">{label}</span>
                        <div className="az-heatmap-cells">
                            {Array.from({ length: 24 }, (_, h) => {
                                const val = grid[`${dow}-${h}`]?.revenue ?? 0;
                                const opacity = val > 0 ? 0.15 + (val / max) * 0.85 : 0;
                                const isActive = hovered && hovered.dow === dow && hovered.hour === h;
                                return (
                                    <div
                                        key={h}
                                        className={`az-heatmap-cell ${isActive ? 'az-heatmap-cell-active' : ''}`}
                                        style={{ background: val > 0 ? `rgba(255,107,53,${opacity})` : 'rgba(255,255,255,0.03)' }}
                                        onMouseEnter={() => setHovered({ dow, hour: h })}
                                        onMouseLeave={() => setHovered(null)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setHovered({ dow, hour: h });
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <p className="az-chart-caption">
                <strong>Rows</strong> = day of the week. <strong>Columns</strong> = hour of the day (0–23). Darker orange = more revenue at that day/hour combo, based on all your orders in this period.
            </p>
        </div>
    );
}

// Reusable donut/pie chart — click or hover a segment or legend row for detail
function DonutChart({ segments, size = 132, thickness = 20 }) {
    const [hovered, setHovered] = useState(null);
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    const r = (size - thickness) / 2;
    const c = 2 * Math.PI * r;
    let cumulative = 0;
    const active = hovered !== null ? segments[hovered] : null;

    return (
        <div className="az-donut-wrap">
            <div className="az-donut-svg-wrap" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                        {segments.map((seg, i) => {
                            const frac = seg.value / total;
                            const len = frac * c;
                            const dasharray = `${len} ${c - len}`;
                            const dashoffset = -cumulative;
                            cumulative += len;
                            return (
                                <circle
                                    key={i}
                                    cx={size / 2} cy={size / 2} r={r}
                                    fill="none"
                                    stroke={seg.color}
                                    strokeWidth={thickness}
                                    strokeDasharray={dasharray}
                                    strokeDashoffset={dashoffset}
                                    style={{ cursor: 'pointer', opacity: hovered === null || hovered === i ? 1 : 0.3, transition: 'opacity 0.15s' }}
                                    onMouseEnter={() => setHovered(i)}
                                    onMouseLeave={() => setHovered(null)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setHovered(i);
                                    }}
                                />
                            );
                        })}
                    </g>
                </svg>
                <div className="az-donut-center">
                    <strong>{active ? active.displayValue ?? active.value : total.toLocaleString()}</strong>
                    <span>{active ? active.label : 'Total'}</span>
                </div>
            </div>
            <div className="az-donut-legend">
                {segments.map((seg, i) => (
                    <div
                        key={i}
                        className="az-donut-legend-row"
                        style={{ opacity: hovered === null || hovered === i ? 1 : 0.4 }}
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={(e) => {
                            e.stopPropagation();
                            setHovered(i);
                        }}
                    >
                        <i style={{ background: seg.color }} />
                        <span>{seg.label}</span>
                        <strong>{seg.displayValue ?? seg.value}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
}

const STATUS_ORDER = ['pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'disputed', 'returned'];
const NEGATIVE_STATUSES = ['cancelled', 'refunded', 'disputed', 'returned'];
function statusColor(status, index) {
    if (NEGATIVE_STATUSES.includes(status)) return 'rgba(255,255,255,0.18)';
    const shades = [0.35, 0.5, 0.65, 0.8, 1];
    const opacity = shades[Math.min(index, shades.length - 1)];
    return opacity === 1 ? '#FF6B35' : `rgba(255,107,53,${opacity})`;
}

function LockedState({ onOpenPlans }) {
    const features = [
        'Real revenue trend charts, day by day',
        'Follower growth tracked over time',
        'Video retention — see where viewers actually drop off',
        'Best day & hour to post, based on your own sales',
        'Top products ranked by real conversion rate',
        'Audience breakdown — guest vs. logged-in viewers',
    ];
    return (
        <div className="az-locked">
            <div className="az-locked-icon"><RiBarChartBoxLine size={30} /></div>
            <h2>Unlock Seller Analytics</h2>
            <p>Deep, real insight into your sales and videos — not just vanity counters.</p>
            <div className="az-locked-features">
                {features.map(f => (
                    <div key={f} className="az-locked-feature">
                        <RiCheckboxCircleLine size={15} />
                        <span>{f}</span>
                    </div>
                ))}
            </div>
            <button onClick={onOpenPlans} className="az-upgrade-btn">
                <RiFireLine size={16} /> View Plans
            </button>
        </div>
    );
}

export default function SellerAnalytics({
    locked = true, period = 30, kpis = {}, revenueTrend = [], statusBreakdown = [],
    followerGrowth = [], retention = [], audience = {}, topVideos = [], topProducts = [], salesTiming = [],
}) {
    const [activePeriod, setActivePeriod] = useState(period);
    const [showProSheet, setShowProSheet] = useState(false);

    const changePeriod = (p) => {
        setActivePeriod(p);
        router.get('/seller/analytics', { period: p }, { preserveState: true, preserveScroll: true });
    };

    if (locked) {
        return (
            <>
                <Head title="Analytics" />
                <div className="az-page">
                    <header className="az-header">
                        <div className="az-header-inner">
                            <button type="button" onClick={() => window.history.back()} className="az-back" aria-label="Go back"><RiArrowLeftLine size={18} /></button>
                            <h1>Analytics</h1>
                        </div>
                    </header>
                    <main className="az-content">
                        <LockedState onOpenPlans={() => setShowProSheet(true)} />
                    </main>
                </div>

                {showProSheet && <ProPlansSheet onClose={() => setShowProSheet(false)} />}

                <style>{AZ_STYLES}</style>
            </>
        );
    }

    const guestPct = audience.total_views > 0 ? Math.round((audience.guest_views / audience.total_views) * 100) : 0;
    const loggedInPct = 100 - guestPct;

    const audienceSegments = [
        { label: 'Logged-in viewers', value: audience.unique_logged_in ?? 0, displayValue: `${loggedInPct}%`, color: '#FF6B35' },
        { label: 'Guest viewers', value: audience.guest_views ?? 0, displayValue: `${guestPct}%`, color: 'rgba(255,255,255,0.18)' },
    ];

    const statusSegments = statusBreakdown.map((s, i) => ({
        label: s.status.charAt(0).toUpperCase() + s.status.slice(1),
        value: Number(s.revenue),
        displayValue: fmtNaira(s.revenue),
        color: statusColor(s.status, STATUS_ORDER.indexOf(s.status) >= 0 ? STATUS_ORDER.indexOf(s.status) : i),
    }));

    return (
        <>
            <Head title="Analytics" />

            <div className="az-page">
                <header className="az-header">
                    <div className="az-header-inner">
                        <button type="button" onClick={() => window.history.back()} className="az-back" aria-label="Go back"><RiArrowLeftLine size={18} /></button>
                        <div style={{ flex: 1 }}>
                            <h1>Analytics</h1>
                            <p>Deep insight into your store's performance</p>
                        </div>
                        <div className="az-period-switch">
                            {[{ v: 7, l: '7D' }, { v: 30, l: '30D' }, { v: 90, l: '90D' }, { v: 0, l: 'All' }].map(p => (
                                <button key={p.v} onClick={() => changePeriod(p.v)} className={activePeriod === p.v ? 'az-period-active' : ''}>{p.l}</button>
                            ))}
                        </div>
                    </div>
                </header>

                <main className="az-content">

                    {/* KPI GRID */}
                    <section className="az-kpi-grid">
                        <KpiCard label="Revenue" value={fmtNaira(kpis.revenue)} change={kpis.revenue_change} icon={RiMoneyDollarCircleLine} />
                        <KpiCard label="Orders" value={kpis.orders} change={kpis.orders_change} icon={RiShoppingBagLine} sub={`AOV ${fmtNaira(kpis.aov)}`} />
                        <KpiCard label="Video Views" value={fmtN(kpis.views)} change={kpis.views_change} icon={RiEyeLine} sub="unique per 30 min" />
                        <KpiCard label="Watch Time" value={`${kpis.watch_hours}h`} icon={RiTimeLine} sub="incl. rewatches" />
                        <KpiCard label="New Followers" value={kpis.new_followers} change={kpis.new_followers_change} icon={RiUserFollowLine} sub={`${kpis.total_followers} total`} />
                        <KpiCard label="Views → Orders" value={`${kpis.views_to_orders_rate}%`} icon={RiBarChartBoxLine} />
                    </section>
                    <p className="az-kpi-note">
                        "Video Views" counts a viewer once per video every 30 minutes — the same rule used for your public view count on the Dashboard and profile. "Watch Time" counts every watch session, including rewatches, so it can be higher.
                    </p>

                    {/* REVENUE TREND */}
                    <section className="az-card">
                        <div className="az-card-header"><h3>Revenue Over Time</h3></div>
                        <div className="az-card-body"><RevenueBars data={revenueTrend} /></div>
                    </section>

                    <div className="az-two-col">
                        {/* FOLLOWER GROWTH */}
                        <section className="az-card">
                            <div className="az-card-header"><h3>Follower Growth</h3></div>
                            <div className="az-card-body"><FollowerGrowthChart data={followerGrowth} totalFollowers={kpis.total_followers} /></div>
                        </section>

                        {/* RETENTION */}
                        <section className="az-card">
                            <div className="az-card-header"><h3>Video Retention</h3><span className="az-card-sub">% of viewers who reached each point</span></div>
                            <div className="az-card-body"><RetentionBars data={retention} /></div>
                        </section>
                    </div>

                    {/* AUDIENCE + STATUS BREAKDOWN — both as donut charts */}
                    <div className="az-two-col">
                        <section className="az-card">
                            <div className="az-card-header"><h3>Audience</h3><span className="az-card-sub">Who watched your videos</span></div>
                            <div className="az-card-body">
                                <DonutChart segments={audienceSegments} />
                                <p className="az-chart-caption">Tap a slice or legend row to see the exact count. "Guest" viewers aren't logged in — you can't message or see them directly, but they can still buy.</p>
                            </div>
                        </section>

                        <section className="az-card">
                            <div className="az-card-header"><h3>Order Status</h3><span className="az-card-sub">Revenue share by status</span></div>
                            <div className="az-card-body">
                                {statusSegments.length === 0
                                    ? <div className="az-empty-inline">No orders in this period yet.</div>
                                    : <DonutChart segments={statusSegments} />
                                }
                                <p className="az-chart-caption">Each slice is revenue from orders currently in that status — gray slices (cancelled/refunded/disputed) are money that didn't stick.</p>
                            </div>
                        </section>
                    </div>

                    {/* BEST TIME TO SELL */}
                    <section className="az-card">
                        <div className="az-card-header"><h3>Best Time to Sell</h3><span className="az-card-sub">Revenue by day &amp; hour</span></div>
                        <div className="az-card-body"><Heatmap data={salesTiming} /></div>
                    </section>

                    {/* TOP VIDEOS */}
                    <section className="az-card">
                        <div className="az-card-header"><h3>Top Videos</h3></div>
                        <div className="az-list">
                            {topVideos.length === 0 && <div className="az-empty-inline">No videos yet.</div>}
                            {topVideos.map(v => (
                                <div key={v.id} className="az-list-row">
                                    <div className="az-list-thumb">
                                        {v.thumbnail_url_full
                                            ? <img src={v.thumbnail_url_full} alt={v.title} />
                                            : <div className="az-list-thumb-empty"><RiPlayCircleLine size={16} /></div>
                                        }
                                    </div>
                                    <div className="az-list-main">
                                        <p className="az-list-title">{v.title ?? 'Untitled'}</p>
                                        <div className="az-list-stats">
                                            <span>{fmtN(v.views_count)} views (all-time)</span>
                                            <span>{fmtN(v.likes_count)} likes</span>
                                            <span>{v.avg_watch_percent}% avg watch</span>
                                        </div>
                                    </div>
                                    <div className="az-list-value">{fmtN(v.period_views)} <span>this period</span></div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* TOP PRODUCTS */}
                    <section className="az-card">
                        <div className="az-card-header"><h3>Top Products</h3><span className="az-card-sub">By revenue this period</span></div>
                        <div className="az-list">
                            {topProducts.length === 0 && <div className="az-empty-inline">No product sales in this period yet.</div>}
                            {topProducts.map(p => (
                                <div key={p.id} className="az-list-row">
                                    <div className="az-list-thumb">
                                        {p.primary_image
                                            ? <img src={p.primary_image} alt={p.name} />
                                            : <div className="az-list-thumb-empty"><RiStore3Line size={16} /></div>
                                        }
                                    </div>
                                    <div className="az-list-main">
                                        <p className="az-list-title">{p.name}</p>
                                        <div className="az-list-stats">
                                            <span>{p.units_sold} sold</span>
                                            <span>{fmtN(p.views_count)} views (all-time)</span>
                                            <span>{p.view_to_order_rate}% converts</span>
                                        </div>
                                    </div>
                                    <div className="az-list-value">{fmtNaira(p.revenue)}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                </main>
            </div>
            <style>{AZ_STYLES}</style>
        </>
    );
}

SellerAnalytics.layout = page => <AppLayout>{page}</AppLayout>;

const AZ_STYLES = `
* { box-sizing: border-box; }
.az-page { min-height: 100vh; background: #0a0a0a; color: #fff; font-family: "DM Sans", sans-serif; }
.az-header { position: sticky; top: 0; z-index: 40; background: rgba(10,10,10,0.92); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); padding: 0 24px; }
.az-header-inner { max-width: 1100px; margin: 0 auto; height: 64px; display: flex; align-items: center; gap: 14px; }
.az-back { width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,0.06); border: none; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
.az-back:hover { background: rgba(255,255,255,0.1); }
.az-header h1 { margin: 0; font-size: 16px; font-weight: 700; }
.az-header p { margin: 1px 0 0; font-size: 11px; color: rgba(255,255,255,0.35); }
.az-period-switch { display: flex; gap: 4px; background: #111; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 4px; }
.az-period-switch button { border: none; background: transparent; color: rgba(255,255,255,0.5); padding: 7px 12px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer; }
.az-period-active { background: #FF6B35 !important; color: #fff !important; }
.az-content { max-width: 1100px; margin: 0 auto; padding: 22px 24px 90px; display: flex; flex-direction: column; gap: 18px; }
.az-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
.az-kpi-note { margin: -8px 0 0; font-size: 11px; color: rgba(255,255,255,0.35); line-height: 1.5; }
.az-kpi { background: #111; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; }
.az-kpi-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.az-kpi-icon { width: 34px; height: 34px; border-radius: 10px; background: rgba(255,107,53,0.12); color: #FF6B35; display: flex; align-items: center; justify-content: center; }
.az-kpi strong { display: block; font-size: 20px; font-weight: 800; }
.az-kpi p { margin: 3px 0 0; font-size: 11px; color: rgba(255,255,255,0.4); }
.az-kpi-sub { color: rgba(255,255,255,0.3); }
.az-change { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; font-weight: 700; }
.az-up { color: #FF6B35; }
.az-down { color: rgba(255,255,255,0.4); }
.az-card { background: #111; border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; overflow: hidden; }
.az-card-header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: baseline; gap: 10px; }
.az-card-header h3 { margin: 0; font-size: 14px; font-weight: 700; }
.az-card-sub { font-size: 11px; color: rgba(255,255,255,0.35); }
.az-card-body { padding: 20px; }
.az-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.az-empty-inline { color: rgba(255,255,255,0.3); font-size: 12px; text-align: center; padding: 30px 0; }
.az-chart-info { min-height: 20px; margin-bottom: 12px; font-size: 12px; color: #fff; }
.az-chart-info-muted { color: rgba(255,255,255,0.3); }
.az-chart-caption { margin: 12px 0 0; font-size: 11px; color: rgba(255,255,255,0.35); line-height: 1.6; }
.az-bars { display: flex; align-items: flex-end; gap: 3px; height: 140px; }
.az-bar-col { flex: 1; height: 100%; display: flex; align-items: flex-end; cursor: pointer; }
.az-bar { width: 100%; background: rgba(255,107,53,0.55); border-radius: 3px 3px 0 0; min-height: 4px; transition: background 0.15s; }
.az-bar-col:hover .az-bar, .az-bar-active { background: #FF6B35 !important; }
.az-bar-blue { background: rgba(59,130,246,0.5); }
.az-bar-col:hover .az-bar-blue, .az-bar-blue.az-bar-active { background: #3B82F6 !important; }
.az-retention { display: flex; flex-direction: column; gap: 10px; }
.az-retention-row { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 4px 6px; margin: -4px -6px; border-radius: 8px; transition: background 0.15s; }
.az-retention-row:hover, .az-retention-row-active { background: rgba(255,107,53,0.08); }
.az-retention-label { width: 36px; font-size: 11px; color: rgba(255,255,255,0.4); flex-shrink: 0; }
.az-retention-track { flex: 1; height: 8px; background: rgba(255,255,255,0.05); border-radius: 999px; overflow: hidden; }
.az-retention-fill { height: 100%; background: #FF6B35; border-radius: 999px; }
.az-retention-pct { width: 40px; text-align: right; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; }
.az-donut-wrap { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.az-donut-svg-wrap { position: relative; flex-shrink: 0; }
.az-donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; }
.az-donut-center strong { font-size: 15px; font-weight: 800; color: #fff; }
.az-donut-center span { font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 2px; }
.az-donut-legend { flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 8px; }
.az-donut-legend-row { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; padding: 4px 0; }
.az-donut-legend-row i { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.az-donut-legend-row span { flex: 1; color: rgba(255,255,255,0.6); }
.az-donut-legend-row strong { color: #fff; font-weight: 700; }
.az-heatmap { overflow-x: auto; }
.az-heatmap-hours { display: flex; padding-left: 40px; margin-bottom: 4px; }
.az-heatmap-hourlabel { flex: 1; min-width: 10px; font-size: 9px; color: rgba(255,255,255,0.3); }
.az-heatmap-row { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
.az-heatmap-day { width: 34px; font-size: 10px; color: rgba(255,255,255,0.4); flex-shrink: 0; }
.az-heatmap-cells { display: flex; gap: 2px; flex: 1; min-width: 480px; }
.az-heatmap-cell { flex: 1; height: 16px; border-radius: 3px; min-width: 10px; cursor: pointer; border: 1px solid transparent; }
.az-heatmap-cell-active { border-color: #FF6B35 !important; }
.az-list { display: flex; flex-direction: column; }
.az-list-row { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-top: 1px solid rgba(255,255,255,0.05); }
.az-list-row:first-child { border-top: none; }
.az-list-thumb { width: 42px; height: 42px; border-radius: 10px; overflow: hidden; background: #1a1a1a; flex-shrink: 0; }
.az-list-thumb img { width: 100%; height: 100%; object-fit: cover; }
.az-list-thumb-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.25); }
.az-list-main { flex: 1; min-width: 0; }
.az-list-title { color: #fff; font-weight: 600; font-size: 13px; margin: 0 0 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.az-list-stats { display: flex; gap: 10px; flex-wrap: wrap; }
.az-list-stats span { font-size: 11px; color: rgba(255,255,255,0.4); }
.az-list-value { text-align: right; font-weight: 800; font-size: 13px; color: #FF6B35; flex-shrink: 0; }
.az-list-value span { display: block; font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.3); }
.az-locked { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; padding: 60px 24px; background: #111; border: 1px dashed rgba(255,107,53,0.25); border-radius: 24px; }
.az-locked-icon { width: 64px; height: 64px; border-radius: 18px; background: rgba(255,107,53,0.12); color: #FF6B35; display: flex; align-items: center; justify-content: center; }
.az-locked h2 { margin: 0; font-size: 20px; font-weight: 800; }
.az-locked p { margin: 0; color: rgba(255,255,255,0.45); font-size: 13px; max-width: 360px; }
.az-locked-features { display: flex; flex-direction: column; gap: 10px; text-align: left; margin: 10px 0; width: 100%; max-width: 380px; }
.az-locked-feature { display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.7); font-size: 13px; }
.az-locked-feature svg { color: #FF6B35; flex-shrink: 0; }
.az-upgrade-btn { display: flex; align-items: center; gap: 8px; padding: 0 24px; height: 44px; border-radius: 10px; background: #FF6B35; color: #fff; font-weight: 700; font-size: 14px; border: none; cursor: pointer; margin-top: 6px; }
.az-upgrade-btn:hover { background: #ff7a4a; }
@media (max-width: 800px) { .az-two-col { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .az-header-inner, .az-content { padding-left: 16px; padding-right: 16px; } .az-period-switch { display: none; } .az-donut-wrap { flex-direction: column; align-items: flex-start; } }
`;