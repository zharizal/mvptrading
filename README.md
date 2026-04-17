# Trading Terminal MVP

Balanced MVP for a web-based AI trading terminal focused on **BTC/USDT**.

## Stack
- Frontend: Next.js + TailwindCSS + TypeScript
- Backend: FastAPI + Pydantic
- Realtime: WebSocket scaffold
- Chart: TradingView embed placeholder/component

## Project Structure
```
trading-terminal-mvp/
├── frontend/
└── backend/
```

## Run Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. uvicorn app.main:app --reload
```

## Run Frontend
```bash
cd frontend
npm install
npm run dev
```

## MVP Features in this scaffold
- three-column terminal layout
- typed snapshot state
- mock watchlist/signal/sentiment panels
- FastAPI `/health` and `/snapshot`
- backend tests for health and snapshot
