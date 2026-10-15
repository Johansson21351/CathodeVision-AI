import './HomePage.css'
import Header from '../components/Header'
import Card from '../components/Cards'
import { useEffect, useRef, useState } from 'react'
import { getDashboard, inspectImage } from '../api/inspect'

const CAPTURE_SLOTS = [
  { role: 'top', title: '1. Top view', hint: 'Full cell or pack from above' },
  { role: 'terminal_side', title: '2. Terminal / side', hint: 'Show terminals and casing sides' },
  { role: 'label_closeup', title: '3. Label close-up', hint: 'Keep model and label text in focus' },
]

const DEMO_CAPTURE_IMAGES = [
  { role: 'top', path: '/Screenshot%202026-10-12%20163022.png', filename: 'healthy-top.png' },
  { role: 'terminal_side', path: '/Screenshot%202026-10-12%20163038.png', filename: 'healthy-terminal-side.png' },
  { role: 'label_closeup', path: '/Screenshot%202026-10-12%20163049.png', filename: 'healthy-label-closeup.png' },
]

const IMAGE_MIME_BY_EXTENSION = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' }

const getImageMime = async blob => {
  const bytes = new Uint8Array(await blob.slice(0, 8).arrayBuffer())
  const isPng = bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (isPng) return 'image/png'
  if (isJpeg) return 'image/jpeg'
  return null
}

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
    reviewAgreement: {
      reviewedInspections: 0,
      agreements: 0,
      agreementRate: 0,
      byDefectType: [],
    },
  })

  const [inspecting, setInspecting] = useState(false)
  const [inspectResult, setInspectResult] = useState(null)
  const [inspectError, setInspectError] = useState('')
  const [dashboardError, setDashboardError] = useState('')
  const [photos, setPhotos] = useState({ top: null, terminal_side: null, label_closeup: null })
  const [lotId, setLotId] = useState('')
  const previewUrlsRef = useRef({})

  useEffect(() => {
    const refreshDashboard = () => getDashboard()
      .then(data => {
        setStats(data)
        setDashboardError('')
      })
      .catch(error => setDashboardError(error.message || 'Unable to load inspection history'))

    refreshDashboard()
    // Live counters: poll instead of only refreshing after an upload.
    // 30 s keeps load low on the free-tier backend/database.
    const poll = setInterval(refreshDashboard, 30000)
    return () => clearInterval(poll)
  }, [])

  useEffect(() => () => {
    Object.values(previewUrlsRef.current).forEach(url => URL.revokeObjectURL(url))
  }, [])

  const handlePhotoSelected = (role, file) => {
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    const inferredMime = IMAGE_MIME_BY_EXTENSION[extension]
    const mimeType = file.type === 'image/jpg' ? 'image/jpeg' : file.type
    const normalizedMime = ['image/jpeg', 'image/png'].includes(mimeType)
      ? mimeType
      : ['', 'application/octet-stream', 'image/jpg'].includes(file.type) ? inferredMime : null
    if (!normalizedMime) {
      setInspectError('Please choose a JPG or PNG image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setInspectError('แต่ละภาพต้องมีขนาดไม่เกิน 5 MB')
      return
    }
    if (previewUrlsRef.current[role]) URL.revokeObjectURL(previewUrlsRef.current[role])
    const normalizedFile = file.type === normalizedMime
      ? file
      : new File([file], file.name, { type: normalizedMime })
    const url = URL.createObjectURL(normalizedFile)
    previewUrlsRef.current[role] = url
    setPhotos(previous => ({ ...previous, [role]: { file: normalizedFile, url } }))
    setInspectError('')
    setInspectResult(null)
  }

  const loadDemoImages = async () => {
    setInspectError('')
    setInspectResult(null)
    try {
      const demoPhotos = await Promise.all(DEMO_CAPTURE_IMAGES.map(async image => {
        const response = await fetch(image.path)
        if (!response.ok) throw new Error('Demo photo file not found')
        const blob = await response.blob()
        const mimeType = await getImageMime(blob)
        if (!mimeType || blob.size > 5 * 1024 * 1024) throw new Error('Invalid demo photo')
        const filename = image.filename.replace(/\.png$/i, mimeType === 'image/jpeg' ? '.jpg' : '.png')
        return { role: image.role, file: new File([blob], filename, { type: mimeType }) }
      }))

      demoPhotos.forEach(({ role, file }) => handlePhotoSelected(role, file))
    } catch {
      setPhotos(previous => {
        const next = { ...previous }
        DEMO_CAPTURE_IMAGES.forEach(image => {
          if (next[image.role]?.file.name === image.filename) {
            URL.revokeObjectURL(next[image.role].url)
            delete next[image.role]
          }
        })
        return next
      })
      setInspectError('Could not load the demo photos. Make sure the three PNG files in frontend/public are available.')
    }
  }

  const submitInspection = async () => {
    const missing = CAPTURE_SLOTS.find(slot => !photos[slot.role])
    if (missing) {
      setInspectError(`Add the required photo: ${missing.title}`)
      return
    }
    setInspecting(true)
    setInspectError('')
    setInspectResult(null)
    try {
      const files = Object.fromEntries(CAPTURE_SLOTS.map(slot => [slot.role, photos[slot.role].file]))
      const result = await inspectImage(files, lotId)
      setInspectResult(result)
      getDashboard()
        .then(data => {
          setStats(data)
          setDashboardError('')
        })
        .catch(error => setDashboardError(error.message || 'Unable to load inspection history'))
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
            <strong>GUIDED 3-SHOT CAPTURE</strong>
          </div>

          <button className="demo-images-button" type="button" onClick={loadDemoImages} disabled={inspecting}>
            Demo images for testing
          </button>

          <div className="capture-grid">
            {CAPTURE_SLOTS.map(slot => (
              <div className="capture-slot" key={slot.role}>
                <strong>{slot.title}</strong>
                <small>{slot.hint}</small>
                <label
                  className="upload-drop capture-drop"
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => {
                    event.preventDefault()
                    handlePhotoSelected(slot.role, event.dataTransfer.files[0])
                  }}
                >
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    disabled={inspecting}
                    onChange={event => {
                      handlePhotoSelected(slot.role, event.target.files[0])
                      event.target.value = ''
                    }}
                  />
                  {photos[slot.role] ? (
                    <img className="upload-preview" src={photos[slot.role].url} alt={`${slot.title} preview`} />
                  ) : (
                    <span>{inspecting ? 'Analyzing...' : 'Drop photo here or click to browse'}</span>
                  )}
                </label>
              </div>
            ))}
          </div>
          <label className="lot-id-field">
            Optional lot ID
            <input
              value={lotId}
              onChange={event => setLotId(event.target.value)}
              maxLength={50}
              placeholder="e.g. DEMO-NMC-21700-001"
              disabled={inspecting}
            />
          </label>
          <div className="upload-hints">
            {inspecting ? 'AIกำลังวิเคราะห์ภาพทั้งสามมุม...' : 'JPG · PNG · up to 5MB per photo'}
          </div>
          <button className="capture-submit" type="button" onClick={submitInspection} disabled={inspecting}>
            {inspecting ? 'ANALYZING THREE PHOTOS...' : 'INSPECT THESE THREE PHOTOS'}
          </button>

          {inspectError && <div className="error">{inspectError}</div>}

          {inspectResult && (
            <div className="inspect-result">
              <strong>{inspectResult.defects?.length ? '⚠️ พบตำหนิ' : '✓ ไม่พบตำหนิ'}</strong>
              <div>Disposition: {inspectResult.disposition}</div>
              <div>
                {inspectResult.defects?.length
                  ? inspectResult.defects.map((defect, index) => (
                    <div key={`${defect.type}-${defect.location}-${index}`}>
                      {defect.type} · {defect.location} · {(defect.visible_confidence * 100).toFixed(0)}%
                    </div>
                  ))
                  : 'ไม่พบตำหนิที่มองเห็น'}
              </div>
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
              {stats.liveItems.length > 0 && <span className="meta">{stats.liveDetections} detections</span>}
            </div>
            {dashboardError && <div className="error">Recent inspections could not be refreshed: {dashboardError}</div>}
            {stats.liveItems.length > 0 ? (
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
                    {stats.liveItems.map(item => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.type || 'No defect'}</td>
                        <td className={`status ${(item.severity || 'none').toLowerCase()}`}>{item.severity || 'none'}</td>
                        <td>{((item.confidence || 0) * 100).toFixed(0)}%</td>
                        <td>{new Date(item.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="recent-inspections-empty">No recent batteries inspected</div>
            )}
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
            <strong>AI VS. REVIEWER AGREEMENT</strong>
          </div>
          <div className="agreement-summary">
            <strong>{stats.reviewAgreement?.agreementRate || 0}%</strong>
            <span>
              {stats.reviewAgreement?.agreements || 0} of {stats.reviewAgreement?.reviewedInspections || 0} reviewed inspections agree
            </span>
          </div>
          <div className="agreement-breakdown">
            {stats.reviewAgreement?.byDefectType?.length ? stats.reviewAgreement.byDefectType.map(item => (
              <div className="agreement-row" key={item.defect_type}>
                <span>{item.defect_type}</span>
                <div className="agreement-meter"><i style={{ width: `${item.agreement_rate}%` }} /></div>
                <strong>{item.agreement_rate}%</strong>
              </div>
            )) : <p>No reviewed inspections yet</p>}
          </div>
        </section>
      </div>
      </div>
    </>
  )
}

export default HomePage
