import React, { useEffect, useMemo, useState } from 'react'
import './AIControls.css'
import Header from '../components/Header'
import { listInspections, reviewInspection, getModelConfig } from '../api/inspect'

function ConfBar({ value }) {
  return (
    <div className="conf-bar ai-conf-bar">
      <div className="conf-fill" style={{ width: `${value}%` }} />
    </div>
  )
}

function CorrectionRow({ row, onReviewed }) {
  const [submitting, setSubmitting] = useState(false)

  const submit = async (decision) => {
    setSubmitting(true)
    try {
      await reviewInspection(row.id, decision)
      onReviewed()
    } catch {
      // apiFetch already surfaces a message via thrown error; keep this row usable to retry
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <tr>
      <td>{new Date(row.created_at).toLocaleString()}</td>
      <td className="mono">#{row.id} {row.filename || ''}</td>
      <td>
        <span className="prediction">{row.defect_type || 'NO DEFECT'}</span>
        <div className="small">{((row.confidence || 0) * 100).toFixed(0)}% conf.</div>
      </td>
      <td>{row.reviewed_by ? <span className="human">{row.reviewed_by}</span> : <span className="small">not reviewed</span>}</td>
      <td>
        <ConfBar value={(row.confidence || 0) * 100} />
        <div className="conf-num">{((row.confidence || 0) * 100).toFixed(0)}%</div>
      </td>
      <td>
        <button className="status saved" disabled={submitting} onClick={() => submit('APPROVED')}>APPROVE</button>
      </td>
      <td>
        <button className="edit" disabled={submitting} onClick={() => submit('REJECTED')}>REJECT</button>
      </td>
    </tr>
  )
}

export default function AIControls() {
  const [rows, setRows] = useState([])
  const [modelConfig, setModelConfig] = useState(null)
  const [tab, setTab] = useState('queue')

  const refresh = () => listInspections().then(setRows).catch(() => setRows([]))

  useEffect(() => {
    refresh()
    getModelConfig().then(setModelConfig).catch(() => setModelConfig(null))
  }, [])

  const totals = {
    inspections: rows.length,
    defects: rows.filter(row => row.has_defect).length,
    averageConfidence: rows.length
      ? `${(rows.reduce((sum, row) => sum + (row.confidence || 0), 0) / rows.length * 100).toFixed(1)}%`
      : '0%',
    corrections: rows.filter(row => row.corrected_type && row.corrected_type !== row.defect_type).length,
  }

  const distribution = useMemo(() => {
    const counts = {}
    for (const r of rows) {
      const key = r.defect_type || 'NO DEFECT'
      counts[key] = (counts[key] || 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [rows])

  const reviewed = rows.filter(r => r.review_status === 'APPROVED' || r.review_status === 'REJECTED')
  const acceptedAsIs = reviewed.length - totals.corrections

  return (
    <div>
      <Header />
      <main className="ai-page">
        <section className="ai-header">
          <div className="ai-title">
            <h2>AI MODEL CONTROL PANEL</h2>
            <div className="ai-meta">Metrics are calculated from your stored inspections.</div>
          </div>

          <div className="ai-metrics">
            <div className="metric">
              <div className="metric-title">INSPECTIONS</div>
              <div className="metric-value">{totals.inspections}</div>
            </div>
            <div className="metric">
              <div className="metric-title">DEFECTS</div>
              <div className="metric-value">{totals.defects}</div>
            </div>
            <div className="metric">
              <div className="metric-title">AVG CONFIDENCE</div>
              <div className="metric-value">{totals.averageConfidence}</div>
            </div>
            <div className="metric">
              <div className="metric-title">CORRECTIONS</div>
              <div className="metric-value">{totals.corrections}</div>
            </div>
          </div>

          <nav className="ai-tabs">
            <button className={`tab ${tab === 'queue' ? 'active' : ''}`} onClick={() => setTab('queue')}>HUMAN FEEDBACK QUEUE</button>
            <button className={`tab ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>MODEL CONFIG</button>
            <button className={`tab ${tab === 'dist' ? 'active' : ''}`} onClick={() => setTab('dist')}>DEFECT DISTRIBUTION</button>
            <div className="ai-actions">
              <button className="trigger" disabled title="Corrections are stored, but the export-to-training-data pipeline isn't built yet">
                RETRAINING PIPELINE NOT BUILT YET
              </button>
            </div>
          </nav>
        </section>
        {/* Tab content */}
        {tab === 'queue' && (
          <section className="ai-table-wrap">
            <table className="ai-table" cellSpacing={0}>
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>RECORD</th>
                  <th>AI PREDICTION</th>
                  <th>REVIEWED BY</th>
                  <th>CONF.</th>
                  <th>APPROVE</th>
                  <th>REJECT</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <CorrectionRow key={r.id} row={r} onReviewed={refresh} />
                ))}
                {rows.length === 0 && <tr><td colSpan="7">No inspection records stored yet</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {tab === 'config' && (
          <section className="model-config">
            {!modelConfig && <p className="help">Loading model configuration…</p>}
            {modelConfig && (
              <div className="config-grid config-grid--single">
                <div className="config-card">
                  <h3>AI MODEL</h3>
                  <div className="version active">
                    <span className="mono">{modelConfig.groq.vision_model}</span>
                    <span className="badge">ACTIVE</span>
                  </div>
                  <p className="help">Groq cloud vision + text model. Used for /inspect, /safety-check, task categorization, and hold-recommendations.</p>
                </div>
              </div>
            )}
          </section>
        )}

        {tab === 'dist' && (
          <section className="defect-distribution">
            <div className="dist-grid">
              <div className="dist-card">
                <h3>DEFECT TYPE FREQUENCY</h3>
                <div className="dist-list">
                  {distribution.length === 0 && <p className="help">No inspection records stored yet.</p>}
                  {distribution.map(([label, count]) => (
                    <div className="dist-row" key={label}>
                      <div className="dist-label">{label}</div>
                      <div className="dist-bar-wrap">
                        <div className="dist-bar" style={{
                          width: `${(count / Math.max(...distribution.map(d => d[1]))) * 100}%`,
                          background: 'linear-gradient(90deg,#10b981,#06b6d4)',
                        }} />
                      </div>
                      <div className="dist-count">{count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dist-card">
                <h3>AI vs HUMAN CORRECTION DELTA</h3>
                <div className="delta-list">
                  <div className="delta-row">
                    <span className="delta-meta">Reviewed total</span>
                    <span className="delta-num">{reviewed.length}</span>
                  </div>
                  <div className="delta-row">
                    <span className="delta-meta">AI prediction accepted as-is</span>
                    <span className="delta-num positive">{acceptedAsIs}</span>
                  </div>
                  <div className="delta-row">
                    <span className="delta-meta">Human overrode AI</span>
                    <span className="delta-num negative">{totals.corrections}</span>
                  </div>
                  <div className="delta-row">
                    <span className="delta-meta">Still pending review</span>
                    <span className="delta-num">{rows.length - reviewed.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
