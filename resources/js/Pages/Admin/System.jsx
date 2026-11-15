import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import { Card, Grid, PageHeader, Pill, Btn, Tabs, DataTable, Pager, StatGrid, Stat, useAdmin, ErrorBox, Skeleton } from '@/Components/Admin/ui'
import { useAdminFetch, useAdminList, errMsg, fmtDate } from '@/Components/Admin/lib'

const TONE = { ok: 'good', warn: 'warn', fail: 'bad' }

function FailedJobs() {
  const { toast, confirm, refreshBadges } = useAdmin()
  const list = useAdminList('/api/admin/system/failed-jobs', {})
  const [busy, setBusy] = useState(null)

  const run = async (key, fn, msg) => {
    setBusy(key)
    try { await fn(); toast(msg); list.reload(); refreshBadges() } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(null) }
  }
  const forget = async (j) => {
    const ok = await confirm({ title: 'Remove this failed job?', message: 'It will not be retried.', confirmLabel: 'Remove' })
    if (ok) run(j.uuid, () => axios.delete(`/api/admin/system/failed-jobs/${j.uuid}`), 'Removed.')
  }
  const retryAll = async () => {
    const ok = await confirm({ title: 'Retry all failed jobs?', message: 'They go back on the queue.', confirmLabel: 'Retry all', danger: false })
    if (ok) run('all', () => axios.post('/api/admin/system/failed-jobs/retry-all'), 'All jobs queued.')
  }
  return (
    <Card
      title="Failed background jobs" sub="Video processing, emails, escrow release and other queued work"
      actions={list.rows.length > 0 && <Btn size="sm" kind="primary" busy={busy === 'all'} onClick={retryAll}>Retry all</Btn>} pad={false}
    >
      <DataTable
        {...list} onRetry={list.reload}
        columns={[
          { key: 'job', label: 'Job', mobile: 'title', render: (j) => <b>{j.job}</b> },
          { key: 'queue', label: 'Queue' },
          { key: 'error', label: 'Error', render: (j) => <span style={{ color: 'var(--bad)', fontSize: 12.5 }}>{j.error}</span> },
          { key: 'failed_at', label: 'Failed', render: (j) => fmtDate(j.failed_at, true) },
        ]}
        rowKey={(j) => j.uuid}
        rowActions={(j) => <>
          <Btn size="sm" busy={busy === j.uuid} onClick={() => run(j.uuid, () => axios.post(`/api/admin/system/failed-jobs/${j.uuid}/retry`), 'Job queued to retry.')}>Retry</Btn>
          <Btn size="sm" kind="danger" onClick={() => forget(j)}>Remove</Btn>
        </>}
      />
      <Pager meta={list.meta} onPage={list.setPage} />
    </Card>
  )
}

export default function System() {
  const [tab, setTab] = useState('health')
  const { data, loading, error, reload } = useAdminFetch('/api/admin/system/health', {})
  const bad = data?.checks.filter((c) => c.status === 'fail').length ?? 0
  const warn = data?.checks.filter((c) => c.status === 'warn').length ?? 0

  return (
    <>
      <Head title="System health · Admin" />
      <PageHeader title="System health" sub="Is everything running? Check here first when something feels off." actions={<Btn onClick={reload}>Re-check</Btn>} />
      <Tabs tabs={[['health', 'Health'], ['jobs', 'Failed jobs']]} value={tab} onChange={setTab} />
      {tab === 'jobs' ? <FailedJobs /> : (
        <>
          <ErrorBox error={error} onRetry={reload} />
          {loading && !data ? <Skeleton /> : data && (
            <>
              <StatGrid>
                <Stat label="Overall" value={bad ? 'Problem' : warn ? 'Check' : 'Healthy'} tone={bad ? 'bad' : warn ? 'warn' : 'good'} sub={`${bad} failing · ${warn} warnings`} />
                <Stat label="Environment" value={data.app.env} sub={`Laravel ${data.app.laravel} · PHP ${data.app.php}`} />
              </StatGrid>
              <Grid cols={2}>
                <Card title="Services" pad={false}>
                  {data.checks.map((c) => (
                    <div key={c.name} className="sys-row">
                      <span><b>{c.name}</b><small>{c.detail}</small></span>
                      <Pill tone={TONE[c.status]}>{c.status}</Pill>
                    </div>
                  ))}
                </Card>
                <Card title="Configuration" sub="Whether the important settings exist (values are never shown)" pad={false}>
                  {data.env.map((e) => (
                    <div key={e.name} className="sys-row"><b>{e.name}</b><Pill tone={e.ok ? 'good' : 'bad'}>{e.ok ? 'set' : 'missing'}</Pill></div>
                  ))}
                </Card>
              </Grid>
              <Card title="Scheduled commands" sub="These must be registered for escrow release, events and cleanup to run" pad={false}>
                {data.scheduled.map((s) => (
                  <div key={s.command} className="sys-row"><code>{s.command}</code><Pill tone={s.registered ? 'good' : 'bad'}>{s.registered ? 'registered' : 'not found'}</Pill></div>
                ))}
              </Card>
            </>
          )}
        </>
      )}
      <style>{`.sys-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid var(--line)}.sys-row:last-child{border-bottom:0}.sys-row small{display:block;color:var(--mute);font-size:12px}.sys-row code{font-size:12.5px}`}</style>
    </>
  )
}
System.layout = (page) => <AdminShell>{page}</AdminShell>
