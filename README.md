# ARYA

Personal optimization tracker. Next.js PWA, deploys to Vercel, installs to iPhone home screen.

## Deploy to Vercel (10 min)

### 1. Create GitHub repo
- Go to github.com → New repository → name it `arya` → Private → Create
- Click **"uploading an existing file"**
- Drag every file from this folder into the browser (including `public/` and `src/`)
- Commit

### 2. Deploy to Vercel
- Go to vercel.com → sign in with GitHub
- New Project → import your `arya` repo → **Deploy**
- 60 seconds later you get a URL like `arya-xxxx.vercel.app`

### 3. Install on iPhone
- Open the Vercel URL in **Safari** on your phone
- Tap Share → **Add to Home Screen**
- Icon appears on home screen, launches fullscreen

## Weekly sync with Claude
1. Tap the download icon (top right) → file saves to your phone
2. Open the Claude project on desktop or in Claude app
3. Attach the `arya_sync_YYYY-MM-DD.json` file to a new message
4. Ask: "Analyze this sync and update the protocol"

## Local development
```bash
npm install
npm run dev
```
