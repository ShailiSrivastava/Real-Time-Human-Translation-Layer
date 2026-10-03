 Check my project here :  real-time-human-translation-layer.vercel.app
# Real-Time Human Translation Layer

A browser-based real-time speech translation prototype.

## Architecture

Browser microphone
→ Web Speech API
→ React
→ `/api/translate`
→ Vite proxy
→ FastAPI
→ Gemini 3.8 Flash
→ React
→ Browser Speech Synthesis

## Requirements

- Node.js
- Python 3.11+ recommended
- Chrome or Edge for Web Speech API
- A Gemini API key

## 1. Frontend install

From the project root:

```powershell
npm install
```

## 2. Backend setup

Open a terminal:

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` from `backend/.env.example`:

```env
GEMINI_API_KEY=YOUR_KEY
```

Never commit `.env`.

## 3. Start FastAPI

Keep this terminal running:

```powershell
cd backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

Verify:

- http://127.0.0.1:8000/
- http://127.0.0.1:8000/health

## 4. Start React

Open a second terminal in the project root:

```powershell
npm run dev
```

Open the Vite URL, normally:

```text
http://localhost:5173
```

## 5. Test

Try:

- English → Hindi: `Hello, how are you?`
- Hindi → English: `आप कैसे हैं?`
- Hindi → English: `मेरा नाम शैलि है।`

Auto-Speak is enabled by default.

## Important

The app uses the browser Web Speech API for speech recognition and speech synthesis. Chrome/Edge support can vary by platform. The microphone must be allowed for the site.

The Gemini API key must stay in `backend/.env`. Do not put it in React code or commit it to GitHub.
