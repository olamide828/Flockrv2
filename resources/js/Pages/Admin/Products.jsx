import { Head } from '@inertiajs/react'
import axios from 'axios'
import AdminShell from '@/Components/Admin/AdminShell'
import { Btn, Card, DataTable, Empty, PageHeader, Pager, Pill, SearchInput, Select, Stat, StatGrid, Toolbar, UserCell, useAdmin } from '@/Components/Admin/ui'
import { errMsg, fmtDate, naira, num, useAdminList } from '@/Components/Admin/lib'

const API = '/api/admin/products'
const TONE = { active: 'good', hidden: 'warn', draft: 'mute', deleted: 'bad' }

export default function Products() {
  const list = useAdminList(API, { search: '', status: '', stock: '', seller: '' })
  const counts = list.extra.counts || {}
  const { toast, confirm } = useAdmin()

  const act = async (p, action) => {
    let reason
    if (action === 'hide') {
      const f = await confirm({ title: 'Hide this product?', message: 'It disappears from the shop and feed. The seller keeps the listing.', confirmLabel: 'Hide', fields: [{ key: 'reason', label: 'Reason', multiline: true, required: true }] })
      if (!f?.reason) return
      reason = f.reason
    }
    try { const r = await axios.post(`${API}/${p.id}/moderate`, { action, reason }); toast(r.data.message || 'Done'); list.reload() } catch (e) { toast(errMsg(e), 'error') }
  }
  const del = async (p) => {
    const f = await confirm({ title: 'Delete product?', message: 'Removes it from the platform. Existing orders are not affected.', confirmLabel: 'Delete', fields: [{ key: 'reason', label: 'Reason', multiline: true, required: true }] })
    if (!f?.reason) return
    try { await axios.delete(`${API}/${p.id}`, { data: { reason: f.reason } }); toast('Product deleted'); list.reload() } catch (e) { toast(errMsg(e), 'error') }
  }

  return (
    <>
      <Head title="Products · Admin" />
      <PageHeader title="Products" sub="Every listing on Flockr" />
      <StatGrid>
        {Object.entries(counts).slice(0, 4).map(([k, v]) => <Stat key={k} label={k[0].toUpperCase() + k.slice(1)} value={num(v)} onClick={() => list.setParam('status', list.params.status === k ? '' : k)} />)}
      </StatGrid>
      <Toolbar>
        <SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Search product name or slug…" />
        <SearchInput value={list.params.seller} onChange={(v) => list.setParam('seller', v)} placeholder="Seller…" />
        <Select value={list.params.stock} onChange={(v) => list.setParam('stock', v)} options={[['', 'Any stock'], ['in', 'In stock'], ['low', 'Low (1–5)'], ['out', 'Sold out']]} />
      </Toolbar>
      <Card pad={false}>
        <DataTable {...list} onRetry={list.reload} empty={<Empty title="No products" sub="Nothing matches these filters." />}
          columns={[
            { key: 'p', label: 'Product', mobile: 'title', render: (p) => (
              <a href={p.seller ? `/@${p.seller.username}/products/${p.slug}` : '#'} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
                {p.image ? <img src={p.image} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }} /> : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(255,255,255,.06)' }} />}
                <span>{p.name}{p.is_featured && <> <Pill tone="violet">Pinned</Pill></>}</span>
              </a>) },
            { key: 's', label: 'Seller', render: (p) => p.seller ? <UserCell user={p.seller} /> : '—' },
            { key: 'st', label: 'Status', render: (p) => <Pill tone={TONE[p.status] || 'mute'}>{p.status}</Pill> },
            { key: 'pr', label: 'Price', render: (p) => naira(p.price) },
            { key: 'sk', label: 'Stock', render: (p) => p.stock <= 0 ? <Pill tone="bad">Sold out</Pill> : p.stock <= 5 ? <Pill tone="warn">{p.stock} left</Pill> : p.stock },
            { key: 'o', label: 'Orders', mobile: 'hide', render: (p) => num(p.orders_count) },
            { key: 'c', label: 'Listed', mobile: 'hide', render: (p) => fmtDate(p.created_at) },
            { key: 'a', label: '', render: (p) => (
              <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                {p.status === 'deleted' ? <Btn size="sm" onClick={() => act(p, 'restore')}>Restore</Btn> : (<>
                  <Btn size="sm" onClick={() => act(p, p.status === 'hidden' ? 'unhide' : 'hide')}>{p.status === 'hidden' ? 'Unhide' : 'Hide'}</Btn>
                  <Btn size="sm" onClick={() => act(p, p.is_featured ? 'unfeature' : 'feature')}>{p.is_featured ? 'Unpin' : 'Pin'}</Btn>
                  <Btn size="sm" kind="danger" onClick={() => del(p)}>Delete</Btn></>)}
              </span>) },
          ]} />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>
    </>
  )
}
Products.layout = (page) => <AdminShell>{page}</AdminShell>
