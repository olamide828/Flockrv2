import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useEffect, useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import { Btn, Card, Empty, Grid, PageHeader, Pill, Stat, StatGrid, useAdmin } from '@/Components/Admin/ui'
import { Donut, SERIES } from '@/Components/Admin/charts'
import { errMsg, num } from '@/Components/Admin/lib'

export default function Feed() {
  const { toast } = useAdmin()
  const [d, setD] = useState(null)
  const [ratio, setRatio] = useState(0.3)
  const [tags, setTags] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    axios.get('/api/admin/feed/settings').then((r) => { setD(r.data); setRatio(r.data.shop_ratio) }).catch((e) => toast(errMsg(e), 'error'))
    axios.get('/api/admin/feed/hashtags').then((r) => setTags(r.data.rows || [])).catch(() => {})
  }, [])

  const save = async () => {
    setBusy(true)
    try { await axios.post('/api/admin/feed/settings', { shop_ratio: ratio }); toast('Feed mix saved') } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(false) }
  }
  const s = d?.stats

  return (
    <>
      <Head title="Feed controls · Admin" />
      <PageHeader title="Feed controls" sub="Entertainment gets you discovered. Shopping gets you paid." />
      <StatGrid>
        <Stat label="Videos" value={s ? num(s.videos_total) : '—'} />
        <Stat label="Shopping" value={s ? num(s.shopping_videos) : '—'} />
        <Stat label="Entertainment" value={s ? num(s.fun_videos) : '—'} />
        <Stat label="Hauls + reviews" value={s ? num(s.hauls + s.reviews) : '—'} />
      </StatGrid>
      <Grid>
        <Card title="Shopping share of “For You”" sub="Product videos are slipped in between entertainment, never back to back. New users automatically get half of this.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <input type="range" min="0" max="0.5" step="0.05" value={ratio} onChange={(e) => setRatio(Number(e.target.value))} style={{ flex: 1 }} />
            <b style={{ minWidth: 90 }}>{Math.round(ratio * 100)}% shop</b>
          </div>
          <p style={{ opacity: .6, fontSize: 13 }}>{Math.round((1 - ratio) * 100)}% entertainment · default is 30%. Max 50%.</p>
          <Btn kind="primary" busy={busy} onClick={save}>Save mix</Btn>
        </Card>
        {s && (
          <Card title="Content on the platform">
            <Donut data={[
              { label: 'Shopping', value: s.shopping_videos, color: SERIES[1] }, { label: 'Entertainment', value: s.fun_videos, color: SERIES[0] },
              { label: 'Hauls', value: s.hauls, color: SERIES[2] }, { label: 'Reviews', value: s.reviews, color: SERIES[3] },
            ]} center={{ value: num(s.videos_total), label: 'Videos' }} />
          </Card>
        )}
      </Grid>
      <Card title="Top hashtags" sub="Most used across videos and products">
        {tags.length === 0 ? <Empty title="No hashtags yet" sub="Run php artisan hashtags:recount once to backfill." /> : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tags.map((t) => <Pill key={t.id} tone="info">#{t.tag} · {num(t.videos_count)} videos · {num(t.products_count)} products</Pill>)}
          </div>
        )}
      </Card>
    </>
  )
}
Feed.layout = (page) => <AdminShell>{page}</AdminShell>
