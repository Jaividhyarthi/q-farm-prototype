# 14 Days of You 💌

A cinematic full-stack romantic web app with a **React + Framer Motion + Tailwind** frontend and **Node.js + Express + MongoDB** backend.

## Features
- Creator mode to craft 14 letters with title/theme, rich text, emoji picker, image upload (base64), and Spotify embed links.
- Save daily drafts, then final publish to lock all letters.
- Viewer mode with shareable link, personalized intro, animated envelope opening, sequential letters, background music, and surprise ending with confetti.
- Password-protected viewer links.
- Countdown timer to April 14.
- Mobile responsive soft pastel UI.

## Local Setup

### 1) Backend (Render target)
```bash
cd backend-node
npm install
cp .env.example .env
npm run dev
```

Create `.env`:
```env
PORT=4000
MONGODB_URI=<your mongodb atlas uri>
```

### 2) Frontend (Vercel target)
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:4000/api" > .env
npm run dev
```

## Deployment

### Frontend on Vercel
- Import `frontend` as the root project.
- Build command: `npm run build`
- Output directory: `dist`
- Env var: `VITE_API_URL=https://<your-render-backend>/api`

### Backend on Render
- Create a Web Service with root `backend-node`.
- Build command: `npm install`
- Start command: `npm start`
- Env vars: `MONGODB_URI`, `PORT` (optional)

### Database on MongoDB Atlas
- Create a cluster and database user.
- Allow Render IP or 0.0.0.0/0 for development.
- Put connection string in `MONGODB_URI`.
