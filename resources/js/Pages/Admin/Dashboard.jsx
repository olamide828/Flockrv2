import { Head } from '@inertiajs/react'
import AdminShell from '@/Components/Admin/AdminShell'
import { Card, Stat, StatGrid, Grid, PageHeader, StatusPill, Empty, Skeleton, ErrorBox, UserCell } from '@/Components/Admin/ui'
import { LineChart, Sparkline, SERIES } from '@/Components/Admin/charts'
import { useAdminFetch, naira, nairaCompact, num, timeAgo } from '@/Components/Admin/lib'

const chg = (v) => (v == null ? '—' : `${v > 0 ? '▲' : v < 0 ? '▼' : ''} ${Math.abs(v)}% vs previous 30d`)
const TONE = { bad: 'var(--bad)', warn: 'var(--warn)', info: 'var(--info)' }

export default function Dashboard() {
  const { data, loading, error, reload } = useAdminFetch('/api/admin/overview', {})
  const s = data?.stats

  return (
    <>
      <Head title="Dashboard · Admin" />
      <PageHeader title="Dashboard" sub="How Flockr is doing over the last 30 days" />
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Skeleton rows={8} /> : data && (
        <>
          <StatGrid>
            <Stat label="Sales (GMV)" value={nairaCompact(s.gmv)} sub={chg(s.gmv_change)} spark={<Sparkline data={data.series.map((d) => d.gmv)} color={SERIES[0]} />} />
            <Stat label="Flockr fees earned" value={nairaCompact(s.fees)} sub={`${nairaCompact(s.commission)} commission + ${nairaCompact(s.delivery_fee)} delivery fee`} spark={<Sparkline data={data.series.map((d) => d.fees)} color={SERIES[2]} />} />
            <Stat label="Courier fees paid by buyers" value={nairaCompact(s.courier_fees)} sub="Goes to the courier, not Flockr income" />
            <Stat label="Orders" value={num(s.orders)} sub={chg(s.orders_change)} spark={<Sparkline data={data.series.map((d) => d.orders)} color={SERIES[1]} />} />
            <Stat label="New users" value={num(s.new_users)} sub={chg(s.users_change)} spark={<Sparkline data={data.signups.map((d) => d.users)} color={SERIES[6]} />} />
            <Stat label="Held in escrow" value={nairaCompact(s.escrow)} sub="Owed to sellers, not yet released" tone="warn" />
            <Stat label="Today" value={`${num(s.orders_today)} orders`} sub={`${num(s.users_today)} new users`} />
          </StatGrid>

          <Grid cols="21">
            <Card title="Sales and fees" sub="Per day, last 30 days">
              <LineChart
                height={260}
                yFormat={(v) => nairaCompact(v)}
                series={[
                  { name: 'Sales', data: data.series.map((d) => ({ x: d.label, y: d.gmv })) },
                  { name: 'Flockr fees', data: data.series.map((d) => ({ x: d.label, y: d.fees })) },
                ]}
              />
            </Card>

            <Card title="Needs your attention" pad={false}>
              {data.attention.length === 0 ? (
                <Empty title="All clear" sub="Nothing is waiting for you." />
              ) : (
                <div>
                  {data.attention.map((a) => (
                    <a key={a.key} href={a.href} className="dash-att">
                      <span style={{ color: TONE[a.tone] }}>●</span>
                      <span style={{ flex: 1 }}>{a.label}</span>
                      <b>{a.count}</b>
                    </a>
                  ))}
                </div>
              )}
            </Card>
          </Grid>

          <Grid cols={2}>
            <Card title="Latest orders" actions={<a className="a-btn sm" href="/admin/orders">All orders</a>} pad={false}>
              {data.recent_orders.length === 0 ? <Empty title="No orders yet" /> : data.recent_orders.map((o) => (
                <a key={o.id} href={`/admin/orders/${o.id}`} className="dash-row">
                  <span style={{ width: 40, height: 40, borderRadius: 10, background: '#1a1d25', overflow: 'hidden', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {o.items?.[0]?.product?.primary_image ? <img src={o.items[0].product.primary_image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ opacity: .3 }}>🛍</span>}
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <b>{o.reference}</b>
                    <small>{o.buyer?.name ?? 'Buyer'} → {o.seller?.name ?? 'Seller'} · {timeAgo(o.created_at)}</small>
                  </span>
                  <span style={{ textAlign: 'right' }}><b>{naira(o.total)}</b><br /><StatusPill status={o.status} /></span>
                </a>
              ))}
            </Card>

            <Card title="Recent admin activity" actions={<a className="a-btn sm" href="/admin/audit">Audit log</a>} pad={false}>
              {data.recent_activity.length === 0 ? <Empty title="No activity yet" sub="Admin actions will be listed here." /> : data.recent_activity.map((l) => (
                <div key={l.id} className="dash-row">
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <b>{l.action}</b>
                    <small>{l.admin?.name ?? 'System'}{l.target_type ? ` · ${l.target_type} #${l.target_id}` : ''}</small>
                  </span>
                  <small>{timeAgo(l.created_at)}</small>
                </div>
              ))}
            </Card>
          </Grid>

          <StatGrid>
            <Stat label="Total users" value={num(s.total_users)} sub={`${num(s.sellers)} sellers`} onClick={() => (window.location = '/admin/users')} />
            <Stat label="Live videos" value={num(s.live_videos)} onClick={() => (window.location = '/admin/videos')} />
            <Stat label="Live products" value={num(s.live_products)} onClick={() => (window.location = '/admin/products')} />
          </StatGrid>
          <style>{`.dash-att,.dash-row{display:flex;gap:12px;align-items:center;padding:13px 18px;border-bottom:1px solid var(--line)}.dash-att:last-child,.dash-row:last-child{border-bottom:0}.dash-att:hover,a.dash-row:hover{background:rgba(255,255,255,.03)}.dash-row small{display:block;color:var(--mute);font-size:12px}.dash-att b{background:rgba(255,255,255,.08);border-radius:99px;padding:1px 10px;font-size:12.5px}`}</style>
        </>
      )}
    </>
  )
}
Dashboard.layout = (page) => <AdminShell>{page}</AdminShell>
