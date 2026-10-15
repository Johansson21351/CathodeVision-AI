# CathodeVision AI

CathodeVision AI is a browser-based battery visual-inspection assistant. It helps battery technicians and quality-control workers document cell or pack condition, flag visible defects, read label information, and decide which items need closer human review. It is designed for EV pack assembly, battery refurbishment, second-life triage, and recycling workflows where a dedicated machine-vision line may not be available.

## Live demo

- **App:** https://cvisioai.netlify.app
- **Demo login:** username `DEMO_USERNAME` / password `DEMO_PASSWORD`. You can also create your own account with **Create account**.
- The backend runs on a free hosting tier and sleeps when idle, so the first request after a quiet period can take up to a minute. Inspections take roughly 20-60 seconds because three photos are analysed by the AI.
- Deployment steps: [DEPLOY.md](DEPLOY.md).

> **Important:** This is a visual screening and decision-support tool—not a safety certification, electrical test, or replacement for your site's inspection procedures. AI results can be wrong or incomplete. Follow your organization's safety rules and have a qualified person verify uncertain or high-risk batteries.

## Technician walkthrough

Imagine a delivery of used cells has just arrived. You are checking each cell before it is reused, placed on hold, or rejected.

1. **Sign in.** Open the CathodeVision website and log in with your technician account. If you do not have one, use **Create account** or ask your administrator for access. The dashboard and inspection records require sign-in.
2. **Choose a cell or pack.** Work on one item at a time. If your team uses lot tracking, enter its lot ID in **Optional lot ID**. Leave it blank if you do not have one.
3. **Take three clear photos.** Use a phone or camera and add one image to each guided box:
   - **Top view:** the whole cell or pack, photographed from above.
   - **Terminal / side:** the terminals and casing sides, clearly visible.
   - **Label close-up:** the printed model and label text in focus.

   Select a box to browse for an image, or drag and drop one there. JPG and PNG files up to 5 MB each are supported. The **Demo images for testing** button fills the boxes with the included sample set; use it to learn the workflow, not to evaluate a real battery.
4. **Submit the inspection.** Select **Inspect these three photos** and wait for the analysis. The dashboard shows the result, any visible defect descriptions, the image-quality assessment, label text, and detected chemistry when available.
5. **Use the result as a prompt for action—not as a substitute for judgment.** The system may return:
   - **PASS:** no defect was identified above the policy confidence threshold.
   - **MONITOR:** minor visible wear was identified.
   - **HOLD:** a major concern, low-quality image, or other condition needs a human check.
   - **QUARANTINE:** a critical visible concern was identified; follow your site's isolation and escalation procedure.

   A low-confidence observation may be shown for a human to check. Retake unclear photos when appropriate. Never handle, charge, or reuse a swollen, hot, leaking, burnt, or otherwise dangerous battery just to get a better photo.
6. **Review and keep records.** Use **Defect Log** to search and filter stored inspections or export the visible records as CSV. Use **Status & Control** to review a HOLD recommendation and record an approval or rejection. Human review is important: do not ship, reuse, or dispose of a battery based solely on an AI result.

The account dashboard also summarizes inspection counts, defect rates, recent results, and reviewer agreement. The **AI Control** page presents model information, stored inspection metrics, and the human feedback queue. These records are scoped to the signed-in account.

## What it does

- Guides a technician through a consistent three-view photo capture.
- Uses a cloud vision model to report whether each image appears to show a battery, visible defect observations, image quality, and readable label text.
- Uses local, deterministic application rules—not the language model—to map observed defects and confidence to severity and a disposition.
- Attempts rule-based chemistry identification from the label text.
- Saves inspection photos and results in the database for a searchable audit trail, dashboard metrics, and human review.
- Supports reviewer decisions and records corrections for comparison with AI predictions.
- Includes related task categorization and a public single-photo battery safety-check API in the backend. These are separate from the authenticated three-photo technician workflow.

It can help workers capture evidence consistently, spot visual issues that may deserve escalation, read labels, group work by lot, and keep inspection records. It cannot detect hidden/internal cell damage from exterior photos, perform electrical measurements, or guarantee that a battery is safe.

## Platform and operating principle

CathodeVision runs as a web application: technicians use a modern browser on a computer, tablet, or phone; no special inspection camera or conveyor is required. The current implementation is split into:

- **Frontend:** React 19 with Vite, providing the browser UI.
- **Backend:** Python 3 / Flask REST API, handling authentication, uploads, inspection orchestration, and records.
- **Database:** MySQL, storing accounts, tasks, inspection results, and human reviews.
- **AI service:** Groq-hosted vision and language models, called by the backend. An internet connection and a valid API key are required for AI analysis.

For the three-photo workflow, the browser uploads the top, terminal/side, and label images to Flask. The backend validates and stores them, asks the vision model for observations, merges visible defect observations, extracts label text for chemistry identification, and passes those observations to a Python policy function. That policy returns the severity/disposition and reasons. The result is saved and sent back to the browser. The AI model supplies visual observations; application code makes the disposition decision. See [docs/system-flow.md](docs/system-flow.md) for the request and data flow.

## Run locally (development)

### Prerequisites

- Python 3.12 (the project has been developed with this version)
- Node.js and npm
- MySQL
- A Groq API key for AI-powered analysis

### 1. Configure the database

Create the application schema using the supplied SQL files. Apply the base schema first, then additions:

```powershell
mysql -u root -p < backend/schema.sql
mysql -u root -p cathodevision-ai < backend/schema_additions.sql
```

The SQL commands may need to be adjusted for your MySQL installation. The additions script expects the database and base tables to exist.

### 2. Configure the backend

Create `backend/.env` (do not commit it) with your local database credentials and secrets:

```dotenv
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=cathodevision-ai
JWT_SECRET=replace-with-a-long-random-secret
GROQ_API_KEY=your_groq_api_key
FRONTEND_ORIGIN=http://localhost:5173
```

Install and start the backend from the repository root in PowerShell:

```powershell
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
python backend/app.py
```

The API starts at `http://localhost:5000`; its health endpoint is `http://localhost:5000/health`.

### 3. Configure and start the frontend

In a second terminal:

```powershell
cd frontend
npm install
```

Create `frontend/.env` if the API is not at the default address:

```dotenv
VITE_API_URL=http://localhost:5000
```

Then start Vite:

```powershell
npm run dev
```

Open the local URL Vite prints (normally `http://localhost:5173`). Register an account, sign in, and follow the technician walkthrough above. Use `npm run build` in `frontend` to check/build the production frontend.

## Operational notes

- The three sample demo images are stored in `frontend/public`; they are for workflow testing only.
- Inspection uploads accept JPG, PNG, or WebP at the backend, while the current technician photo picker accepts JPG and PNG.
- Inspection requires a valid account and a working MySQL database. AI analysis additionally requires outbound internet access and a valid Groq API key.
- The Flask development server and Vite development server are for local development; deploy behind production-grade hosting and security controls before operational use.
- Treat uploaded battery photos and inspection records as operational data. Restrict access and retention according to your organization's privacy and security policies.
