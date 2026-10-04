import React, { useEffect, useMemo, useState } from 'react'
import './defectLog.css'
import Header from '../components/Header'
import { listInspections, getInspectionImageUrl } from '../api/inspect'

function Badge({ children, variant }) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}

function StatusBadge({ status }) {
  const variant = status === 'APPROVED' ? 'confirmed' : status === 'REJECTED' ? 'rejected' : 'pending'
  return <span className={`badge ${variant}`}>{status}</span>
}

function DefectLog() {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (query.trim()) params.q = query.trim()
    if (statusFilter !== 'ALL') params.status = statusFilter
    const timer = setTimeout(() => {
      listInspections(params)
        .then(setRows)
        .catch(() => setRows([]))
        .finally(() => setLoading(false))
    }, 250) // debounce search typing
    return () => clearTimeout(timer)
  }, [query, statusFilter])

  const defectTypeOptions = useMemo(
    () => Array.from(new Set(rows.map(r => r.defect_type).filter(Boolean))),
    [rows]
  )

  const filtered = typeFilter === 'ALL' ? rows : rows.filter(r => r.defect_type === typeFilter)

  const totals = {
    total: filtered.length,
    critical: filtered.filter(r => r.severity === 'critical').length,
    pending: filtered.filter(r => r.review_status === 'PENDING').length,
    confirmed: filtered.filter(r => r.review_status === 'APPROVED' || r.review_status === 'REJECTED').length,
  }

  const exportCsv = () => {
    const headers = ['id', 'created_at', 'defect_type', 'severity', 'confidence', 'review_status', 'corrected_type', 'reviewed_by', 'description']
    const lines = [headers.join(',')]
    for (const r of filtered) {
      const row = headers.map(h => {
        const value = r[h] ?? ''
        return `"${String(value).replace(/"/g, '""')}"`
      })
      lines.push(row.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `defect-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <Header />
      <div className="defect-page">
      <div className="defect-header">
        <div className="metrics">
          <div className="metric">
            <div className="metric-title">TOTAL DEFECTS</div>
            <div className="metric-value">{totals.total}</div>
          </div>
          <div className="metric">
            <div className="metric-title">CRITICAL</div>
            <div className="metric-value critical">{totals.critical}</div>
          </div>
          <div className="metric">
            <div className="metric-title">PENDING REVIEW</div>
            <div className="metric-value pending">{totals.pending}</div>
          </div>
          <div className="metric">
            <div className="metric-title">CONFIRMED</div>
            <div className="metric-value confirmed">{totals.confirmed}</div>
          </div>
        </div>

        <div className="controls">
          <input className="search" placeholder="Search ID or defect type" value={query} onChange={e => setQuery(e.target.value)} />
          <div className="filters">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="ALL">TYPE: ALL</option>
              {defectTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">STATUS: ALL</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <button className="export" onClick={exportCsv} disabled={filtered.length === 0}>EXPORT CSV</button>
          </div>
        </div>
      </div>

      <div className="defect-table">
        <div className="table-row table-head">
          <div className="col ts">TIMESTAMP</div>
          <div className="col board">RECORD ID</div>
          <div className="col img">IMAGE</div>
          <div className="col type">DEFECT TYPE</div>
          <div className="col severity">SEVERITY</div>
          <div className="col conf">CONFIDENCE</div>
          <div className="col status">STATUS</div>
          <div className="col confirmed">CORRECTED BY</div>
          <div className="col actions">REVIEW NOTE</div>
        </div>

        {loading && <div className="table-row">Loading…</div>}

        {!loading && filtered.map(r => (
          <div className="table-row" key={r.id}>
            <div className="col ts">{new Date(r.created_at).toLocaleString()}</div>
            <div className="col board">#{r.id}</div>
            <div className="col img">
              {r.image_path
                ? <img src={getInspectionImageUrl(r.id)} alt={`Inspection #${r.id}`} />
                : '-'}
            </div>
            <div className="col type"><Badge variant="type">{r.defect_type || 'NO DEFECT'}</Badge></div>
            <div className="col severity">{r.severity}</div>
            <div className="col conf">
              <div className="conf-bar"><div className="conf-fill" style={{width: `${(r.confidence || 0) * 100}%`}}></div></div>
              <div className="conf-num">{((r.confidence || 0) * 100).toFixed(0)}%</div>
            </div>
            <div className="col status"><StatusBadge status={r.review_status} /></div>
            <div className="col confirmed">
              {r.reviewed_by || '—'}
              {r.corrected_type && r.corrected_type !== r.defect_type && (
                <div className="small">corrected to: {r.corrected_type}</div>
              )}
            </div>
            <div className="col actions">{r.description ? r.description.slice(0, 60) + (r.description.length > 60 ? '…' : '') : '-'}</div>
          </div>
        ))}
        {!loading && filtered.length === 0 && <div className="table-row">No inspection records found</div>}
      </div>
      </div>
    </div>
  )
}

export default DefectLog
