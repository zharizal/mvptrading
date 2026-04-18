"""Higher-level analytics reports — performance/accuracy/market/sessions.

Distinct from `app.services.analytics` (which holds the technical-indicator
calculators for the live market pipeline). This package aggregates data
from persisted tables (trades, signal_events) and live poller cache into
roll-up statistics for the Analytics tab.
"""
