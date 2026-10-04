import './HomePage.css'
import Header from '../components/Header'
import Card from '../components/cards'
import { useEffect, useRef, useState } from 'react'
import { getDashboard, inspectImage } from '../api/inspect'

function HomePage() {
  const [stats, setStats] = useState({
    totalInspected: 0,
    defectsFound: 0,
    defectRate: 0,
    yieldRate: 0,
    criticalAlerts: 0,
    criticalBreakdown: { critical: 0, major: 0, minor: 0, none: 0 },
    liveDetections: 0,
    liveItems: [],
    defectFrequency: [],
    currentStatus: 'NORMAL',
  })

  const [inspecting, setInspecting] = useState(false)
  const [inspectResult, setInspectResult] = useState(null)
  const [inspectError, setInspectError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    getDashboard().then(setStats).catch(() => {})
    // Live counters: poll instead of only refreshing after an upload.
    const poll = setInterval(() => {
      getDashboard().then(setStats).catch(() => {})
    }, 5000)
    return () => clearInterval(poll)
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFileSelected = async (file) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setInspectError('รองรับเฉพาะ JPG, PNG และ WebP')
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    setInspectError('')
    setInspectResult(null)
    setInspecting(true)
    try {
      const result = await inspectImage(file)
      setInspectResult(result)
      getDashboard().then(setStats).catch(() => {})
    } catch (e) {
      setInspectError(e.message)
    } finally {
      setInspecting(false)
    }
  }

  return (
    <>
      <Header />

      <div className="dashboard-shell">

      <div className={`status-alert ${stats.currentStatus === 'NORMAL' ? 'normal' : 'alert'}`}>
        {stats.currentStatus === 'NORMAL' ? '● NORMAL' : `● ${stats.currentStatus === 'REJECT' ? 'DEFECT DETECTED — REJECT' : 'DEFECT DETECTED — HOLD'}`}
      </div>

      <div className="dashboard-cards">
        <Card title="TOTAL INSPECTED" value={stats.totalInspected} note="stored inspections" />

        <Card title="DEFECTS FOUND" value={stats.defectsFound} note={`${stats.defectRate}% defect rate`} />

        <Card title="YIELD RATE" value={`${stats.yieldRate}%`} note="based on stored inspections" />

        <Card title="CRITICAL ALERTS" value={stats.criticalAlerts} note={`High: ${stats.criticalBreakdown?.major} · Mid: ${stats.criticalBreakdown?.minor}`} />
      </div>

      <div className="dashboard-main-grid">
        <section className="upload-card card">
          <div className="card-title">
            <strong>UPLOAD IMAGE</strong>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={e => handleFileSelected(e.target.files[0])}
          />

          <div
            className="upload-drop"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              handleFileSelected(e.dataTransfer.files[0])
            }}
          >
            {previewUrl ? (
              <img className="upload-preview" src={previewUrl} alt="Selected inspection" />
            ) : (
              <>
                <span>{inspecting ? 'กำลังตรวจสอบ...' : 'Drag & Drop Image'}</span>
                <small>or click to browse</small>
              </>
            )}
          </div>
          <div className="upload-hints">{inspecting ? 'AIกำลังวิเคราะห์ภาพ...' : 'PNG · JPG · WebP · up to 5MB'}</div>

          {inspectError && <div className="error">{inspectError}</div>}

          {inspectResult && (
            <div className="inspect-result">
              <strong>{inspectResult.has_defect ? '⚠️ พบตำหนิ' : '✓ ไม่พบตำหนิ'}</strong>
              <div>ชนิด: {inspectResult.defect_type}</div>
              <div>{inspectResult.description}</div>
              <div>ความมั่นใจ: {(inspectResult.confidence * 100).toFixed(0)}%</div>

              <div className="label-check">
                <div>ข้อความบนฉลาก: {inspectResult.label_text || '— ไม่พบ/อ่านไม่ออก —'}</div>
                <div>
                  สารเคมี: <strong>{inspectResult.detected_chemistry || 'unknown'}</strong>
                  {inspectResult.is_high_value && <span className="chemistry-badge">HIGH VALUE · NMC</span>}
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="side-panel">
          <section className="live-panel card">
            <div className="panel-header">
              <strong>RECENT INSPECTIONS</strong>
              <span className="meta">{stats.liveDetections} detections</span>
            </div>

            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Conf</th>
                    <th>Inspected At</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.liveItems.length > 0 ? (
                    stats.liveItems.map((item, index) => (
                      <tr key={item.id}>
                        <td>{stats.liveItems.length - index}</td>
                        <td>{item.type || 'No defect'}</td>
                        <td className={`status ${item.severity.toLowerCase()}`}>{item.severity}</td>
                        <td>{(item.confidence * 100).toFixed(0)}%</td>
                        <td>{new Date(item.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5">No inspections stored yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="breakdown-card card">
            <div className="card-title">
              <strong>SESSION SEVERITY BREAKDOWN</strong>
            </div>

            <div className="breakdown-list">
              <div className="breakdown-item critical">
                <span>Critical</span>
                <small>{stats.criticalBreakdown.critical}</small>
                <div className="breakdown-bar"><span /></div>
              </div>
              <div className="breakdown-item high">
                <span>High</span>
                <small>{stats.criticalBreakdown.major}</small>
                <div className="breakdown-bar"><span /></div>
              </div>
              <div className="breakdown-item medium">
                <span>Mid</span>
                <small>{stats.criticalBreakdown.minor}</small>
                <div className="breakdown-bar"><span /></div>
              </div>
              <div className="breakdown-item low">
                <span>Low</span>
                <small>{stats.criticalBreakdown.none}</small>
                <div className="breakdown-bar"><span /></div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="dashboard-bottom-row">
        <section className="chart-card card">
          <div className="card-title">
            <strong>DEFECT TYPE FREQUENCY</strong>
          </div>
          <div className="chart-body">
            <div className="bar-list">
              {stats.defectFrequency.length > 0 ? stats.defectFrequency.map(item => (
                <div className="bar-item" key={item.label}>
                  <div className="bar" style={{ height: `${Math.max(item.count, 1) * 10}px` }} />
                  <label>{item.label}</label>
                </div>
              )) : <p>No defect data stored yet</p>}
            </div>
          </div>
        </section>

        <section className="chart-card card">
          <div className="card-title">
            <strong>YIELD RATE TREND</strong>
          </div>
          <div className="trend-chart">
            <p>Yield trend is available after multiple inspections.</p>
          </div>
        </section>
      </div>
      </div>
    </>
  )
}

export default HomePage
