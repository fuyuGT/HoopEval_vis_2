# HoopEval_vis_2

HoopEval is a React/Vite user-study app with a small Node API for storing participant sessions.

## Local development

```bash
npm install
npm run dev
```

Run the API locally in a second terminal:

```bash
npm run build
npm run dev:api
```

Without `DATABASE_URL`, the API stores sessions in `.hoopeval-db/sessions.json` for local testing.

## Render Deployment

Use a Render Web Service plus Render Postgres. The app stores each participant session as JSONB in Postgres and keeps local JSON export as a backup/admin workflow.

Recommended Render settings:

```text
Build Command: npm install && npm run build
Start Command: npm start
```

Required environment variables:

```text
DATABASE_URL=<Render Postgres connection string>
ADMIN_API_TOKEN=<long random token>
BASE_PATH=/HoopEval_vis_2
```

Optional environment variables:

```text
CORS_ORIGIN=https://your-render-service.onrender.com
DATABASE_SSL=true
MAX_BODY_BYTES=2000000
```

You can also create the service from `render.yaml`. After deployment, open:

```text
https://your-render-service.onrender.com/HoopEval_vis_2/
```

Admin stats/export endpoints require `ADMIN_API_TOKEN`. In the UI, use participant id `admin`; the app will prompt once for the admin token and store it in browser local storage.

## Database Schema

The server creates this table automatically:

```sql
CREATE TABLE IF NOT EXISTS study_sessions (
  session_id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  session_data JSONB NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Participant sessions autosave during the study and save again on completion.

## GitHub Pages

The previous static GitHub Pages deployment can still serve the frontend, but it cannot be the main data-collection deployment unless `VITE_API_BASE_URL` points to a deployed API.

Repository Pages URL:

```text
https://mr81wx.github.io/HoopEval_vis_2/
```
