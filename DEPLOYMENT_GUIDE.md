**Deployment Guide (quick)**

- Backend (recommended: Render / Heroku / DigitalOcean / VPS)
  - Set environment variables from `Backend/.env.example` in your host's env settings (never commit `.env`).
  - Build the frontend and copy the `dist` output into `Frontend/dist` (or deploy frontend separately and set `CLIENT_URL` accordingly).
  - IMPORTANT: This repository previously contained a committed `Backend/.env` file with secrets — that file has been removed. Create a local `.env` from `Backend/.env.example` and set values in your host's environment settings instead.
  - Start the server with `npm start` in the `Backend` folder (ensure `NODE_ENV=production`).
  - Note: This project uses `socket.io` and long-running processes (schedulers). Serverless platforms (Vercel functions, Netlify functions) are NOT suitable for the backend.

- Frontend (recommended: Vercel / Netlify / static host)
  - In `Frontend`, run `npm run build` to create `dist`.
  - Deploy the site to any static host and set `VITE_BACKEND_URL` to your backend origin.

- Deployment options
  - Option A (single host): Build frontend, place `Frontend/dist` adjacent to `Backend` on the server and run the backend process — server will serve static files (server.js looks for `Frontend/dist`).
  - Option B (separate hosts): Deploy frontend to Vercel/Netlify and backend to a container/VM; set `VITE_BACKEND_URL` to backend origin and `CLIENT_URL` to frontend origin.

- Common checks
  - Ensure `CLIENT_URL` env matches frontend origin so CORS allows requests.
  - Ensure `JWT_SECRET` is a long random string in production.
  - Ensure `MONGO_URI` uses a production database and network access is allowed from your host.
  - Do not commit `.env` files. Use host environment variable configuration.

- If you want me to prepare deployment scripts for a specific host (Render, Heroku, Dockerfile + Compose), tell me which provider and I will add them.
