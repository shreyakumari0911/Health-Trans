<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# HealthTrans – Medical Interpreter

This contains everything you need to run your app locally.

This contains everything you need to run the app locally and deploy it.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Vercel

1) Prepare repository
- Ensure `.env.local` is NOT committed (already ignored by `.gitignore`).
- Commit source code to GitHub.

2) Set environment variable in Vercel
- In Vercel Project Settings → Environment Variables, add:
   - `GEMINI_API_KEY` = your Gemini API key
- Trigger a new deployment.

3) Build settings
- Framework preset: Vite (auto-detected)
- Install Command: `npm ci` (or `npm install`)
- Build Command: `npm run build`
- Output Directory: `dist`

Notes on API key security
- This prototype currently injects the key at build time for client use (Vite define). For production security, proxy AI calls through a Vercel Serverless Function and keep the key server-side.

---

Developed by Shreya Kumari
