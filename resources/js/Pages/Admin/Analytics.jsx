import { Head } from '@inertiajs/react'
import { useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import { Card, Stat, StatGrid, Grid, PageHeader, Segmented, ErrorBox, Skeleton, Btn } from '@/Components/Admin/ui'
import { LineChart, BarChart, Donut, Funnel, Heatmap, SERIES } from '@/Components/Admin/charts'
import { useAdminFetch, naira, nairaCompact, num } from '@/Components/Admin/lib'

const STATUS_COLOR = { delivered: '#199e70', paid: '#3987e5', confirmed: '#3987e5', processing: '#9085e9', shipped: '#9085e9', pending: '#c98500', cancelled: '#e66767', refunded: '#d55181', disputed: '#d95926' }
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HRS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))

function TableView({ cols, rows }) {
  return (
    <div className="a-tw"><table className="a-table">
      <thead><tr>{cols.map(([k, l]) => <th key={k}>{l}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{cols.map(([k, , f]) => <td key={k}>{f ? f(r[k]) : r[k]}</td>)}</tr>)}</tbody>
    </table></div>
  )
}

export default function Analytics() {
  const [days, setDays] = useState('30')
  const [view, setView] = useState('charts')
  const { data, loading, error, reload } = useAdminFetch('/api/admin/overview/analytics', { days })
  const t = data?.totals

  return (
    <>
      <Head title="Analytics · Admin" />
      <PageHeader
        title="Analytics" sub="Sales, people and delivery performance"
        actions={<>
          <Segmented options={[['7', '7 days'], ['30', '30 days'], ['90', '90 days']]} value={days} onChange={setDays} />
          <Segmented options={[['charts', 'Charts'], ['table', 'Table']]} value={view} onChange={setView} />
        </>}
      />
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Skeleton rows={8} /> : data && (
        <div style={{ opacity: loading ? 0.6 : 1 }}>
          <StatGrid>
            <Stat label="Sales (GMV)" value={nairaCompact(t.gmv)} />
            <Stat label="Flockr fees" value={nairaCompact(t.fees)} />
            <Stat label="Orders" value={num(t.orders)} sub={`Avg ${naira(t.aov)}`} />
            <Stat label="New users" value={num(t.new_users)} />
            <Stat label="Cancel / refund rate" value={`${t.cancel_rate}%`} tone={t.cancel_rate > 15 ? 'bad' : undefined} />
          </StatGrid>

          {view === 'table' ? (
            <>
              <Card title="Daily totals" pad={false}><TableView cols={[['label', 'Day'], ['orders', 'Orders', num], ['gmv', 'Sales', naira], ['fees', 'Fees', naira]]} rows={data.series} /></Card>
              <Card title="Signups" pad={false}><TableView cols={[['label', 'Day'], ['users', 'New users', num], ['sellers', 'New sellers', num]]} rows={data.signups} /></Card>
              <Grid cols={2}>
                <Card title="Top sellers" pad={false}><TableView cols={[['name', 'Seller'], ['orders', 'Orders', num], ['gmv', 'Sales', naira]]} rows={data.top_sellers} /></Card>
                <Card title="Top products" pad={false}><TableView cols={[['name', 'Product'], ['units', 'Units', num], ['gmv', 'Sales', naira]]} rows={data.top_products} /></Card>
              </Grid>
              <Card title="Order funnel" pad={false}><TableView cols={[['label', 'Stage'], ['value', 'Orders', num]]} rows={data.funnel} /></Card>
            </>
          ) : (
            <>
              <Card title="Sales and fees per day">
                <LineChart height={260} yFormat={nairaCompact} series={[
                  { name: 'Sales', data: data.series.map((d) => ({ x: d.label, y: d.gmv })) },
                  { name: 'Flockr fees', data: data.series.map((d) => ({ x: d.label, y: d.fees })) },
                ]} />
              </Card>
              <Grid cols={2}>
                <Card title="Orders per day"><LineChart height={220} series={[{ name: 'Orders', data: data.series.map((d) => ({ x: d.label, y: d.orders })) }]} /></Card>
                <Card title="Signups per day">
                  <LineChart height={220} series={[
                    { name: 'All users', data: data.signups.map((d) => ({ x: d.label, y: d.users })) },
                    { name: 'Sellers', data: data.signups.map((d) => ({ x: d.label, y: d.sellers })) },
                  ]} />
                </Card>
              </Grid>
              <Grid cols={2}>
                <Card title="Top sellers" sub="By sales"><BarChart horizontal data={data.top_sellers.map((s) => ({ label: s.name, value: s.gmv, sub: `${s.orders} orders · @${s.username}` }))} valueFormat={nairaCompact} /></Card>
                <Card title="Top products" sub="By sales"><BarChart horizontal color={SERIES[2]} data={data.top_products.map((p) => ({ label: p.name, value: p.gmv, sub: `${num(p.units)} sold` }))} valueFormat={nairaCompact} /></Card>
              </Grid>
              <Grid cols={2}>
                <Card title="Order status"><Donut data={Object.entries(data.status_mix).map(([k, v]) => ({ label: k, value: v, color: STATUS_COLOR[k] }))} center={{ label: 'Orders' }} /></Card>
                <Card title="Order funnel" sub="Where orders drop off"><Funnel stages={data.funnel} /></Card>
              </Grid>
              <Card title="When people buy" sub="Orders by day and hour (Lagos time)">
                <Heatmap rowLabels={DOW} colLabels={HRS} values={data.heatmap} unit=" orders" />
              </Card>
            </>
          )}
        </div>
      )}
    </>
  )
}
Analytics.layout = (page) => <AdminShell>{page}</AdminShell>
