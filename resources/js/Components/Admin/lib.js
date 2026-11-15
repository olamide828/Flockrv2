// Shared helpers for every admin page.
import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'

export const naira = (n, dec = 0) =>
  '₦' + Number(n ?? 0).toLocaleString('en-NG', { minimumFractionDigits: dec, maximumFractionDigits: dec })

export const num = (n) => Number(n ?? 0).toLocaleString('en-NG')

export const compact = (n) => {
  n = Number(n ?? 0)
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(Math.round(n))
}

export const nairaCompact = (n) => '₦' + compact(n)

export const fmtDate = (d, withTime = false) => {
  if (!d) return '—'
  const o = { day: 'numeric', month: 'short', year: 'numeric' }
  if (withTime) Object.assign(o, { hour: '2-digit', minute: '2-digit' })
  return new Date(d).toLocaleString('en-NG', o)
}

export const timeAgo = (d) => {
  if (!d) return '—'
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return fmtDate(d)
}

export const errMsg = (e, fallback = 'Something went wrong.') => {
  const d = e?.response?.data
  if (d?.errors) return Object.values(d.errors).flat()[0]
  return d?.message || e?.message || fallback
}

export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

/**
 * Server-driven list. GETs `url` with params (filters + page), expects a Laravel
 * paginator ({data, current_page, last_page, total}) optionally wrapped as
 * { data: paginator, stats: {...} } or { rows: paginator, ...extra }.
 */
export function useAdminList(url, initial = {}, { debounceKeys = ['search', 'q'] } = {}) {
  const [params, setParams] = useState({ page: 1, ...initial })
  const [state, setState] = useState({ rows: [], meta: null, extra: {}, loading: true, error: null })
  const debounced = useDebounced(params.search ?? params.q ?? '', 350)
  const reqId = useRef(0)

  const effective = { ...params }
  debounceKeys.forEach((k) => { if (k in effective) effective[k] = debounced })

  const load = useCallback(async () => {
    const id = ++reqId.current
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const clean = Object.fromEntries(Object.entries(effective).filter(([, v]) => v !== '' && v != null && v !== 'all'))
      const { data } = await axios.get(url, { params: clean })
      if (id !== reqId.current) return
      const pg = data?.rows && data.rows.data ? data.rows : data?.data && Array.isArray(data.data) ? data : data?.items ?? data
      const rows = Array.isArray(pg) ? pg : pg?.data ?? []
      const { data: _d, rows: _r, items: _i, ...extra } = data && !Array.isArray(data) ? data : {}
      setState({ rows, meta: Array.isArray(pg) ? null : pg, extra, loading: false, error: null })
    } catch (e) {
      if (id !== reqId.current) return
      setState((s) => ({ ...s, loading: false, error: errMsg(e) }))
    }
  }, [url, JSON.stringify(effective)]) // eslint-disable-line

  useEffect(() => { load() }, [load])

  const setParam = (k, v) => setParams((p) => ({ ...p, [k]: v, page: k === 'page' ? v : 1 }))
  const setPage = (n) => setParams((p) => ({ ...p, page: n }))
  return { ...state, params, setParam, setPage, reload: load }
}

export function useAdminFetch(url, params, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const { data } = await axios.get(url, { params })
      setState({ data, loading: false, error: null })
    } catch (e) {
      setState({ data: null, loading: false, error: errMsg(e) })
    }
  }, [url, JSON.stringify(params), ...deps]) // eslint-disable-line
  useEffect(() => { load() }, [load])
  return { ...state, reload: load }
}

export const STATUS_TONE = {
  // orders
  pending: 'warn', paid: 'good', confirmed: 'info', processing: 'info', shipped: 'violet', delivered: 'good',
  cancelled: 'bad', refunded: 'mute', disputed: 'warn', pickup_failed: 'bad', delivery_failed: 'bad', returned: 'bad',
  // payouts / generic
  approved: 'good', failed: 'bad', rejected: 'bad', succeeded: 'good', active: 'good', inactive: 'mute',
  expired: 'mute', draft: 'mute', archived: 'mute', live: 'good', scheduled: 'info', ended: 'mute',
  // disputes
  open: 'warn', awaiting_admin: 'warn', awaiting_seller: 'info', resolved_buyer: 'good', resolved_seller: 'good', closed: 'mute',
  // reports / tickets
  actioned: 'good', dismissed: 'mute', resolved: 'good',
}
