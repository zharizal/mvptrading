"""Journal repository + API tests."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal, init_db
from app.db.models import Trade
from app.domain.journal import TradeClose, TradeCreate, TradeUpdate
from app.main import app
from app.services.journal import repository
from app.services.journal.service import close_trade, compute_pnl, compute_r_multiple


@pytest.fixture(autouse=True)
def _clean_trades_table():
    init_db()
    with SessionLocal() as db:
        for row in db.query(Trade).all():
            db.delete(row)
        db.commit()
    yield
    with SessionLocal() as db:
        for row in db.query(Trade).all():
            db.delete(row)
        db.commit()


# ------------------- Pure functions ------------------- #

def test_compute_pnl_buy_positive_when_exit_above_entry():
    pnl = compute_pnl("BUY", entry_price=100.0, exit_price=110.0, size=1000.0)
    # qty = 10, pnl = (110-100)*10 = 100
    assert pnl == pytest.approx(100.0)


def test_compute_pnl_sell_positive_when_exit_below_entry():
    pnl = compute_pnl("SELL", entry_price=100.0, exit_price=90.0, size=1000.0)
    # qty = 10, pnl = (100-90)*10 = 100
    assert pnl == pytest.approx(100.0)


def test_compute_r_multiple_buy_hits_2r():
    r = compute_r_multiple("BUY", entry_price=100.0, exit_price=110.0, stop_loss=95.0)
    # risk=5, reward=10 → 2R
    assert r == pytest.approx(2.0)


def test_compute_r_multiple_returns_none_when_stop_loss_missing():
    assert compute_r_multiple("BUY", 100.0, 110.0, None) is None


def test_compute_r_multiple_returns_none_when_risk_degenerate():
    # BUY with SL above entry is invalid; risk would be negative
    assert compute_r_multiple("BUY", 100.0, 110.0, 105.0) is None


# ------------------- Repository ------------------- #

def test_create_then_get_round_trip():
    payload = TradeCreate(
        symbol="btc/usdt",
        direction="BUY",
        entry_price=50000.0,
        size=500.0,
        stop_loss=49500.0,
        take_profit=51000.0,
        notes="morning breakout",
        tags=["breakout", "asia"],
        setup_quality=4,
        emotion="confident",
    )
    with SessionLocal() as db:
        row = repository.create(db, payload)
        fetched = repository.get(db, row.id)

    assert fetched is not None
    assert fetched.symbol == "BTC/USDT"  # upper-normalized by validator
    read = repository.row_to_read(fetched)
    assert read.tags == ["breakout", "asia"]
    assert read.status == "open"
    assert read.exit_price is None


def test_close_trade_computes_pnl_and_r_multiple():
    with SessionLocal() as db:
        row = repository.create(db, TradeCreate(
            symbol="BTC/USDT",
            direction="BUY",
            entry_price=100.0,
            size=1000.0,
            stop_loss=95.0,
            take_profit=115.0,
        ))
        closed = close_trade(db, row.id, TradeClose(exit_price=110.0))

    assert closed is not None
    assert closed.exit_price == 110.0
    assert closed.pnl == pytest.approx(100.0)
    assert closed.r_multiple == pytest.approx(2.0)


def test_list_filters_by_status_and_symbol():
    with SessionLocal() as db:
        t1 = repository.create(db, TradeCreate(
            symbol="BTC/USDT", direction="BUY", entry_price=100, size=100, stop_loss=95,
        ))
        repository.create(db, TradeCreate(
            symbol="ETH/USDT", direction="SELL", entry_price=3000, size=100, stop_loss=3050,
        ))
        close_trade(db, t1.id, TradeClose(exit_price=110))

        closed_btc, _ = repository.list_trades(db, status="closed", symbol="BTC/USDT")
        open_all, total_open = repository.list_trades(db, status="open")

    assert len(closed_btc) == 1 and closed_btc[0].symbol == "BTC/USDT"
    assert len(open_all) == 1 and total_open == 1


def test_update_patch_fields():
    with SessionLocal() as db:
        row = repository.create(db, TradeCreate(
            symbol="BTC/USDT", direction="BUY", entry_price=100, size=100,
        ))
        updated = repository.update(db, row.id, TradeUpdate(
            notes="updated", tags=["a", "b"], setup_quality=5,
        ))

    assert updated is not None
    read = repository.row_to_read(updated)
    assert read.notes == "updated"
    assert read.tags == ["a", "b"]
    assert read.setup_quality == 5


# ------------------- API ------------------- #

def test_api_create_list_close_delete_round_trip():
    with TestClient(app) as client:
        # Create
        r = client.post("/journal/trades", json={
            "symbol": "btc/usdt",
            "direction": "BUY",
            "entry_price": 100.0,
            "size": 100.0,
            "stop_loss": 95.0,
            "take_profit": 110.0,
        })
        assert r.status_code == 201, r.text
        trade = r.json()
        assert trade["symbol"] == "BTC/USDT"
        assert trade["status"] == "open"
        trade_id = trade["id"]

        # List — should include this trade as 'open'
        r = client.get("/journal/trades?status=open")
        assert r.status_code == 200
        items = r.json()["items"]
        assert any(t["id"] == trade_id for t in items)

        # Close
        r = client.post(f"/journal/trades/{trade_id}/close", json={"exit_price": 105.0})
        assert r.status_code == 200
        closed = r.json()
        assert closed["status"] == "closed"
        assert closed["pnl"] == pytest.approx(5.0)
        assert closed["r_multiple"] == pytest.approx(1.0)

        # Delete
        r = client.delete(f"/journal/trades/{trade_id}")
        assert r.status_code == 204
        r = client.get(f"/journal/trades/{trade_id}")
        assert r.status_code == 404
