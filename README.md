# AI Trading Terminal MVP

Realtime decision terminal untuk **BTC/USDT** (dan pair Binance lain) — chart live, scoring bias, zona support/resistance, ATR/momentum, dan reasoning AI-style.

## Stack

| Layer     | Tech                                                              |
|-----------|-------------------------------------------------------------------|
| Frontend  | Next.js 16 (App Router) · TypeScript · TailwindCSS · React 19     |
| Backend   | FastAPI · Pydantic v2 · httpx · OpenRouter (optional)              |
| Realtime  | WebSocket fan-out broadcast (1 poller → N clients)                 |
| Data feed | Binance public REST (`/ticker/24hr`, `/klines` 15m)                |
| Chart     | TradingView embed (`tv.js`)                                        |
| AI        | OpenRouter (optional, model apa saja) untuk narasi reasoning — fallback ke rule-based |

## Features

- Live BTC/USDT (dan symbol switch) price + 24h stats
- Pivot, ATR%, support/resistance dari 14 candle 15m
- Signal engine ATR-aware: BUY / SELL / WAIT dengan entry/SL/TP + RR
- Zone context (SUPPORT / RESISTANCE / BREAKOUT / BREAKDOWN / MID_RANGE)
- Momentum direction + strength dari candle sequence
- Reasoning panel (AI atau rule-based)
- Multi-symbol watchlist (backend-switchable crypto pairs)
- Reconnect WebSocket otomatis, graceful fallback ke snapshot seeded
- Persistence symbol pilihan + recent event memory di localStorage

## Quick Start

Dari root repo:

```bash
npm run install:all     # pip install backend + npm install frontend
npm run dev:all         # start backend :8000 & frontend :3000 bareng
```

Buka `http://localhost:3000` — tunggu ~2 detik → badge "Realtime live" nyala, price BTC update tiap 5 detik.

### Step-by-step manual (tanpa root script)

Backend:
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # optional: isi OPENROUTER_API_KEY kalau mau AI reasoning
python -m uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Configuration

### Backend `.env`
```
APP_HOST=127.0.0.1
APP_PORT=8000
CORS_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
SYMBOL=BTCUSDT
OPENROUTER_API_KEY=        # kosong = rule-based reasoning
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_REFERER=        # optional, attribution header
OPENROUTER_APP_NAME=mvptrading
LLM_MODEL=anthropic/claude-haiku-4.5
POLL_INTERVAL_SECONDS=5
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000/ws/market
```

## Architecture

```
 ┌─────────────────┐          HTTP /snapshot             ┌──────────────────┐
 │  Next.js App    │ ───────────────────────────────────▶│                  │
 │  (LiveTerminal) │          WS /ws/market?symbol=X     │  FastAPI backend │
 │                 │ ◀═════════════════════════════════▶│                  │
 └─────────────────┘                                     │                  │
                                                         │  MarketPoller    │
                                                         │  (single task)   │
                                                         │        │          │
                                                         │        ▼          │
                                                         │  Binance public  │
                                                         │  REST (24hr +    │
                                                         │  klines 15m)     │
                                                         └──────────────────┘
```

- Satu `MarketPoller` background task per symbol aktif; poll setiap `POLL_INTERVAL_SECONDS`.
- Snapshot yang sudah dihitung (pivot, ATR, bias, zone, momentum, signal, reasoning) di-broadcast ke semua WS client yang subscribe symbol tersebut.
- Klien baru (WS) dapat snapshot terbaru langsung dari cache poller.
- Klien pertama untuk symbol baru → poller start on-demand; client terakhir disconnect → poller stop.

## API

| Method | Path                    | Query     | Returns             |
|--------|-------------------------|-----------|---------------------|
| GET    | `/health`               | —         | `{ok: true}`        |
| GET    | `/snapshot`             | `symbol?` | `SnapshotResponse`  |
| WS     | `/ws/market`            | `symbol?` | streaming Snapshot  |

## Testing

```bash
npm run test:all
# atau:
cd backend && pytest
cd frontend && npx tsc --noEmit
```

## Docker

```bash
docker compose up --build
# frontend :3000, backend :8000
```

## Roadmap (out of scope MVP)

- Auth & user accounts
- Order execution (saat ini signal-only)
- Historical signal persistence (Postgres)
- Multi-timeframe analysis (1h, 4h)
- Mobile-optimized layout
