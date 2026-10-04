import { Link } from 'react-router-dom'
import './LandingPage.css'
import eyeLogo from '../assets/eye_logo.png'
import auth from '../api/auth'

const AUDIENCE = [
  {
    title: 'EV conversion & pack assembly shops',
    body: 'Small teams building or converting battery packs without a dedicated inspection line.',
    icon: IconWrench,
  },
  {
    title: 'E-bike / e-scooter battery builders',
    body: 'Fast-growing, safety-critical builds where a swollen or damaged cell is a fire risk.',
    icon: IconBolt,
  },
  {
    title: 'Battery refurbishment & second-life',
    body: 'Operations triaging used cells and packs that need a quick condition check before reuse.',
    icon: IconRecycle,
  },
  {
    title: 'Independent QC technicians',
    body: "Anyone doing visual inspection by eye today, with no budget for machine-vision hardware.",
    icon: IconEyeCheck,
  },
]

const PROS = [
  {
    title: 'No special hardware',
    body: 'A phone camera and a browser is the entire rig — no conveyor, no fixed camera, no lighting booth.',
    icon: IconCamera,
  },
  {
    title: 'Confidence-scored severity',
    body: '4-level severity (Critical / Major / Minor / None) with a confidence score on every call.',
    icon: IconGauge,
  },
  {
    title: 'Label & chemistry OCR',
    body: 'Reads the printed label and flags the chemistry (NMC, LFP, NCA...) straight off the cell.',
    icon: IconTag,
  },
  {
    title: 'Human-in-the-loop',
    body: 'Every AI call can be reviewed and corrected — and the correction is logged, not discarded.',
    icon: IconPeople,
  },
  {
    title: 'Full audit trail',
    body: 'Searchable defect log, exportable CSV, and transparent model configuration.',
    icon: IconLog,
  },
  {
    title: 'Pass / Hold / Reject',
    body: 'A real decision-support workflow, not just a raw "defect: yes/no" label.',
    icon: IconCheckShield,
  },
]

const STEPS = [
  { title: 'Upload a photo', body: 'Snap the cell or pack with any camera and upload it.' },
  { title: 'AI vision analysis', body: 'Defect type, severity, and confidence are returned in seconds.' },
  { title: 'Label & chemistry check', body: 'OCR reads the label and cross-checks the chemistry.' },
  { title: 'Dashboard verdict', body: 'The result lands as Pass, Hold, or Reject on a live dashboard.' },
  { title: 'Human review', body: 'An operator confirms or corrects the call — nothing ships unchecked.' },
  { title: 'Logged for good', body: 'Every inspection and correction is kept for traceability and retraining.' },
]

export default function LandingPage() {
  const username = auth.currentUser() // reads local state only — never logs anyone out

  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true" />

      <header className="landing-nav">
        <div className="landing-brand">
          <img src={eyeLogo} alt="" className="landing-brand-icon" aria-hidden="true" />
          <span>CATHODEVISION AI</span>
        </div>
        <div className="landing-nav-actions">
          {username ? (
            <>
              <span className="landing-welcome">Signed in as <strong>{username}</strong></span>
              <Link to="/dashboard" className="landing-btn landing-btn--primary">Go to dashboard</Link>
            </>
          ) : (
            <>
              <Link to="/login" className="landing-link">Sign in</Link>
              <Link to="/register" className="landing-btn landing-btn--ghost">Create account</Link>
            </>
          )}
        </div>
      </header>

      <section className="landing-hero">
        <div className="scan-corner tl" aria-hidden="true" />
        <div className="scan-corner tr" aria-hidden="true" />
        <div className="scan-corner bl" aria-hidden="true" />
        <div className="scan-corner br" aria-hidden="true" />

        <div className="landing-hero-copy">
          <span className="eyebrow">AI QUALITY INSPECTION · PURE SOFTWARE</span>
          <h1>CathodeVision AI</h1>
          <p className="tagline">
            Battery defect detection and quality decision support — from one uploaded photo,
            no industrial hardware required.
          </p>
        </div>

        <div className="landing-hero-art">
          <ScanningBatteryArt />
        </div>
      </section>

      <div className="poster-body">
        <nav className="poster-spine" aria-label="Page sections">
          <div className="poster-spine-line" aria-hidden="true" />
          <a href="#overview"><span className="poster-spine-num">01</span>Overview</a>
          <a href="#origin"><span className="poster-spine-num">02</span>Origin &amp; Objectives</a>
          <a href="#audience"><span className="poster-spine-num">03</span>Target Audience</a>
          <a href="#pros"><span className="poster-spine-num">04</span>Why Use It</a>
          <a href="#how"><span className="poster-spine-num">05</span>What It Does</a>

          <div className="poster-badge">
            <span>NO HARDWARE</span>
            <span>NEEDED</span>
          </div>
        </nav>

        <div className="poster-content">
          <section id="overview" className="landing-section">
            <h2 className="section-label">01 · Overview</h2>
            <p className="section-lead">
              CathodeVision AI is a web application that uses computer vision to inspect battery cells
              and packs for surface defects, verify chemistry labels, and support pass / hold / reject
              decisions — all from a single uploaded photo, running entirely in the browser and a
              lightweight backend. No conveyor belt, no fixed camera rig, no dedicated inspection line.
            </p>
          </section>

          <section id="origin" className="landing-section">
            <h2 className="section-label">02 · Origin &amp; Objectives</h2>
            <div className="origin-grid">
              <p className="origin-story">
                This project began as a plan for a full industrial inspection line — conveyor belts,
                fixed cameras, real-time bounding boxes drawn over a live feed. Without access to that
                hardware, it was redesigned from the ground up as a pure-software tool: everything a
                camera-equipped line could do, rebuilt around a photo upload and a browser instead.
              </p>
              <ul className="origin-objectives">
                <li>Catch defective cells before they move further down the line</li>
                <li>Keep a human in the loop for every uncertain or high-risk call</li>
                <li>Build an audit trail the AI can eventually learn from</li>
                <li>Work without any dedicated inspection hardware</li>
              </ul>
            </div>
          </section>

          <section id="audience" className="landing-section">
            <h2 className="section-label">03 · Target Audience</h2>
            <p className="section-lead section-lead--tight">Built for the teams industrial machine-vision systems don't reach.</p>
            <div className="card-grid card-grid--rows">
              {AUDIENCE.map(({ title, body, icon: Icon }) => (
                <div className="feature-card" key={title}>
                  <span className="feature-icon-badge"><Icon /></span>
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="pros" className="landing-section">
            <h2 className="section-label">04 · Why CathodeVision AI · จุดเด่น</h2>
            <div className="card-grid card-grid--rows card-grid--pros">
              {PROS.map(({ title, body, icon: Icon }) => (
                <div className="feature-card feature-card--pro" key={title}>
                  <span className="feature-icon-badge"><Icon /></span>
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="how" className="landing-section">
            <h2 className="section-label">05 · What It Does</h2>
            <div className="step-flow">
              {STEPS.map((step, i) => (
                <div className="step-node" key={step.title}>
                  <div className="step-index">{String(i + 1).padStart(2, '0')}</div>
                  <div className="step-body">
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                  {i < STEPS.length - 1 && <div className="step-connector" aria-hidden="true" />}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <footer className="landing-footer">
        <div>
          <strong>CathodeVision AI</strong>
          <span>A software-only battery QC assistant.</span>
        </div>
        <div className="landing-footer-stack">Built with React · Flask · Groq Vision</div>
      </footer>
    </div>
  )
}

function ScanEye({ cx, cy, r = 13, delay = '0s' }) {
  return (
    <g className="scan-eye" style={{ animationDelay: delay }} transform={`translate(${cx} ${cy})`}>
      <ellipse rx={r} ry={r * 0.6} fill="#0a0f1a" stroke="#5eead4" strokeWidth="2" />
      <circle r={r * 0.32} fill="#5eead4" />
    </g>
  )
}

function ScanningBatteryArt() {
  return (
    <svg viewBox="0 0 320 320" className="scan-battery-svg" role="img" aria-label="AI scanning a battery cell for defects">
      <defs>
        <linearGradient id="cellFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1f45" />
          <stop offset="100%" stopColor="#120a22" />
        </linearGradient>
        <clipPath id="cellClip">
          <rect x="112" y="68" width="96" height="182" rx="16" />
        </clipPath>
      </defs>

      {/* connecting rays from the eyes to the bounding box */}
      <g className="scan-rays" stroke="#5eead4" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="3 4">
        <line x1="54" y1="56" x2="96" y2="86" />
        <line x1="266" y1="160" x2="222" y2="160" />
        <line x1="60" y1="256" x2="100" y2="228" />
      </g>

      <ScanEye cx={54} cy={56} delay="0s" />
      <ScanEye cx={266} cy={160} delay="0.6s" />
      <ScanEye cx={60} cy={256} delay="1.2s" />

      {/* YOLO-style bounding box around the cell */}
      <rect x="92" y="48" width="136" height="222" rx="14" fill="none" stroke="#c084fc" strokeWidth="1.4" strokeDasharray="6 5" opacity="0.7" />
      {['tl', 'tr', 'bl', 'br'].map(corner => (
        <path
          key={corner}
          className="scan-box-corner"
          d={
            corner === 'tl' ? 'M92 70V48h22' :
            corner === 'tr' ? 'M206 48h22v22' :
            corner === 'bl' ? 'M92 248v22h22' :
                               'M206 270h22v-22'
          }
          fill="none"
          stroke="#5eead4"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}

      {/* detection label chip */}
      <g transform="translate(150 36)">
        <rect x="-38" y="-14" width="76" height="22" rx="11" fill="#0a0f1a" stroke="#5eead4" strokeOpacity="0.6" />
        <text x="0" y="1" textAnchor="middle" className="scan-chip-text">BATTERY 0.98</text>
      </g>

      {/* the battery cell itself */}
      <rect x="140" y="46" width="40" height="26" rx="6" fill="#4c3a75" stroke="#c084fc" strokeWidth="1.4" />
      <rect x="112" y="68" width="96" height="182" rx="16" fill="url(#cellFill)" stroke="#c084fc" strokeWidth="2" />
      <text x="160" y="92" textAnchor="middle" className="scan-terminal-text">+</text>
      <text x="160" y="240" textAnchor="middle" className="scan-terminal-text">−</text>

      {/* YOLO feature-grid overlay, clipped to the cell */}
      <g clipPath="url(#cellClip)" className="scan-grid" stroke="#5eead4" strokeOpacity="0.22" strokeWidth="1">
        {[0, 1, 2, 3, 4, 5].map(i => <line key={`h${i}`} x1="112" x2="208" y1={68 + i * 30.3} y2={68 + i * 30.3} />)}
        {[0, 1, 2, 3].map(i => <line key={`v${i}`} y1="68" y2="250" x1={112 + i * 32} x2={112 + i * 32} />)}
      </g>

      {/* sweeping scan line */}
      <g clipPath="url(#cellClip)">
        <rect className="scan-sweep" x="112" y="68" width="96" height="14" fill="url(#sweepGradient)" />
      </g>
      <defs>
        <linearGradient id="sweepGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5eead4" stopOpacity="0" />
          <stop offset="50%" stopColor="#5eead4" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function IconWrench() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="feature-icon">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2-2 2.7-2.7Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="feature-icon">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconRecycle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="feature-icon">
      <path d="M7 19H4.5a2 2 0 0 1-1.7-3L5 12M9 5l2.3-3.5a2 2 0 0 1 3.4 0L17 5M15 19h2.5a2 2 0 0 0 1.7-3L17 12M9 5H6m3 0 2 3.5M15 5h3m-3 0-2 3.5M7 19l2-3.5m6 3.5-2-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconEyeCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="feature-icon">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="feature-icon">
      <path d="M4 8h3l2-2h6l2 2h3v11H4V8Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  )
}
function IconGauge() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="feature-icon">
      <path d="M4 15a8 8 0 1 1 16 0M12 15l4-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconTag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="feature-icon">
      <path d="M12 3h6a2 2 0 0 1 2 2v6L10 21 3 14 12 3Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="15.5" cy="8.5" r="1.3" />
    </svg>
  )
}
function IconPeople() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="feature-icon">
      <circle cx="9" cy="8" r="3" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 9.5a3 3 0 1 1 3.5 3M14.5 14a5.5 5.5 0 0 1 7 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconLog() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="feature-icon">
      <path d="M6 3h9l4 4v14H6V3Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 11h6M9 15h6M9 7h3" strokeLinecap="round" />
    </svg>
  )
}
function IconCheckShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="feature-icon">
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
