# Deploying CathodeVision AI (free tier)

Netlify (frontend) + Render (Flask API) + TiDB Cloud Serverless or Aiven (MySQL) + Groq (AI).

## 1. Database
Create a free MySQL-compatible cluster and note host, port, user, password. Then run, in this order:

```bash
mysql -h HOST -P PORT -u USER -p --ssl-mode=VERIFY_IDENTITY < backend/schema.sql
for f in schema_additions schema_three_shot schema_image_blob; do
  mysql -h HOST -P PORT -u USER -p --ssl-mode=VERIFY_IDENTITY cathodevision-ai < backend/$f.sql
done
# optional demo data: backend/schema_seed_demo.sql
```
Hosted providers may not let you create a database named `cathodevision-ai`; if so, use the provided DB name and edit the `CREATE DATABASE` / `USE` lines in the SQL files to match.

## 2. Backend on Render
New Web Service from the GitHub repo:
- Root directory: `backend`
- Build: `pip install -r requirements.txt`
- Start: `gunicorn app:app --timeout 180 --workers 1 --threads 4` (an inspection makes three sequential AI calls; gunicorn's default 30 s timeout kills it)
- Health check path: `/health`

Environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`,
`JWT_SECRET` (long random string), `GROQ_API_KEY`, `FRONTEND_ORIGIN` (the Netlify URL, no trailing slash).

## 3. Frontend on Netlify
Set env var `VITE_API_URL` to the Render URL, then redeploy (Vite bakes it in at build time).

## 4. Keep it awake
Render's free tier sleeps after ~15 min idle (~50 s cold start). Add a free UptimeRobot HTTP monitor
on `<render-url>/health` every 5 minutes.
