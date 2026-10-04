import { useEffect, useState } from 'react'
import Header from '../components/Header'
import { getDashboard, getHoldRecommendation, reviewInspection } from '../api/inspect'
import './Status.css'

function Status() {
  const [dashboard, setDashboard] = useState(null)
  const [recommendation, setRecommendation] = useState(null)
  const [recommendationError, setRecommendationError] = useState('')
  const [decision, setDecision] = useState('')
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    getDashboard().then(setDashboard).catch(() => setDashboard(null))
  }, [])

  useEffect(() => {
    if (dashboard?.currentStatus !== 'HOLD') {
      setRecommendation(null)
      setRecommendationError('')
      return
    }

    setRecommendationError('')
    getHoldRecommendation()
      .then(setRecommendation)
      .catch(error => setRecommendationError(error.message))
  }, [dashboard?.currentStatus])

  const total = dashboard?.totalInspected || 0
  const defects = dashboard?.defectsFound || 0
  const passed = total - defects
  const statusDisplay = {
    normal: {
      title: 'NORMAL',
      subtitle: 'Inspection line ready',
      mark: '✓',
      className: 'status-good',
    },
    hold: {
      title: 'HOLD',
      subtitle: 'Awaiting review',
      mark: '!',
      className: 'status-hold',
    },
    reject: {
      title: 'REJECT',
      subtitle: 'Defective battery',
      mark: '✕',
      className: 'status-reject',
    },
  }[(dashboard?.currentStatus || 'NORMAL').toLowerCase() === 'reject'
    ? 'reject'
    : (dashboard?.currentStatus || 'NORMAL').toLowerCase() === 'hold'
      ? 'hold'
      : 'normal']
  const activeStatus = statusDisplay.title.toLowerCase()

  const handleDecision = async (nextDecision) => {
    if (!recommendation?.inspection_id) return
    setReviewing(true)
    setRecommendationError('')
    try {
      await reviewInspection(recommendation.inspection_id, nextDecision)
      setDecision(nextDecision)
    } catch (error) {
      setRecommendationError(error.message)
    } finally {
      setReviewing(false)
    }
  }

  return (
    <>
      <Header />
      <main className="status-shell">
        <section className="status-top-row">
          <div className={`status-card status-display ${statusDisplay.className}`} aria-live="polite">
            <div className="status-mark">{statusDisplay.mark}</div>
            <div><div className="status-title">{statusDisplay.title}</div><div className="status-subtitle">{statusDisplay.subtitle}</div></div>
          </div>
          <div className={`status-card status-active status-control ${activeStatus === 'normal' ? 'is-selected' : ''}`}>
            <div className="status-mark">✓</div>
            <div><div className="status-title">NORMAL</div><div className="status-subtitle">Battery inspection active</div>{activeStatus === 'normal' && <span className="pill active-pill">ACTIVE</span>}</div>
          </div>
          <div className={`status-card status-hold status-control ${activeStatus === 'hold' ? 'is-selected' : ''}`}>
            <div className="status-mark">!</div>
            <div><div className="status-title">HOLD</div><div className="status-subtitle">Awaiting review</div></div>
          </div>
          <div className={`status-card status-reject status-control ${activeStatus === 'reject' ? 'is-selected' : ''}`}>
            <div className="status-mark">✕</div>
            <div><div className="status-title">REJECT</div><div className="status-subtitle">Defective battery</div></div>
          </div>
          <aside className="diagnostics-panel">
            <div className="panel-header"><span>System diagnostics</span></div>
            <div className="diagnostic-row"><span>Inspection records</span><strong>{total}</strong></div>
            <div className="diagnostic-row"><span>Defective records</span><strong>{defects}</strong></div>
            <div className="diagnostic-row"><span>Yield rate</span><strong className="running">{dashboard?.yieldRate || 0}%</strong></div>
            <div className="diagnostic-row"><span>Database status</span><strong className="running">CONNECTED</strong></div>
          </aside>
        </section>

        <section className="summary-row">
          <article className="summary-card summary-large"><div className="summary-label">TOTAL INSPECTED</div><div className="summary-value">{total}</div><div className="summary-note">stored inspection records</div></article>
          <article className="summary-card summary-medium"><div className="summary-label">DEFECTIVE ITEMS</div><div className="summary-value defect-value">{defects}</div><div className="summary-note">stored defect results</div></article>
          <article className="summary-card summary-large summary-pass"><div className="summary-label">TOTAL PASSED</div><div className="summary-value passed-value">{passed}</div><div className="summary-note">records without defects</div></article>
        </section>

        <section className="action-grid">
          <article className="action-panel">
            <div className="panel-heading"><span>AI RECOMMENDED ACTION &amp; AUTHORIZATION</span><small>HOLD ITEMS ONLY</small></div>
            {activeStatus === 'hold' && recommendation ? (
              <>
                <div className="recommendation-block">
                  <div className="recommendation-heading">AI RECOMMENDATION</div>
                  <p>{recommendation.recommendation}</p>
                  <div className="recommendation-meta">
                    <span>Reason: {recommendation.reason}</span>
                    <span>Model confidence: {((recommendation.confidence || 0) * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="review-actions">
                  <button type="button" className="review-button approve" disabled={reviewing} onClick={() => handleDecision('APPROVED')}>
                    {reviewing ? 'PROCESSING...' : 'APPROVE RECOMMENDATION'}
                  </button>
                  <button type="button" className="review-button reject" disabled={reviewing} onClick={() => handleDecision('REJECTED')}>
                    REJECT RECOMMENDATION
                  </button>
                </div>
                {decision && <div className="review-result">Decision saved: {decision}</div>}
              </>
            ) : (
              <div className="action-note">
                {activeStatus === 'hold'
                  ? recommendationError || 'Generating a recommendation for the HOLD inspection...'
                  : 'AI recommendations are shown only for items currently on HOLD.'}
              </div>
            )}
          </article>
          <aside className="rootcause-panel"><div className="panel-heading small-heading"><span>DEFECT SEVERITY</span></div><div className="rootcause-list"><div className="root-item critical"><div><strong>Critical</strong><small>stored severity</small></div><span>{dashboard?.criticalBreakdown?.critical || 0}</span></div><div className="root-item high"><div><strong>High</strong><small>stored severity</small></div><span>{dashboard?.criticalBreakdown?.major || 0}</span></div><div className="root-item medium"><div><strong>Mid</strong><small>stored severity</small></div><span>{dashboard?.criticalBreakdown?.minor || 0}</span></div><div className="root-item low"><div><strong>Low</strong><small>stored severity</small></div><span>{dashboard?.criticalBreakdown?.none || 0}</span></div></div></aside>
        </section>
      </main>
    </>
  )
}

export default Status
