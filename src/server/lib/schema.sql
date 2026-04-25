-- Phase 7: Watchlists + D1 persistence
-- Run via: wrangler d1 execute wasatch-intel-db --file src/server/lib/schema.sql

CREATE TABLE IF NOT EXISTS watchlists (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL CHECK(type IN ('Geography','Applicant','Parcel Set','Saved Search')),
  criteria         TEXT NOT NULL DEFAULT '{}',
  signal_threshold INTEGER NOT NULL DEFAULT 60,
  alert_in_app     INTEGER NOT NULL DEFAULT 1,
  alert_email      INTEGER NOT NULL DEFAULT 0,
  owner_user_id    TEXT NOT NULL DEFAULT 'default',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS watchlist_hits (
  id              TEXT PRIMARY KEY,
  watchlist_id    TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  signal_id       TEXT NOT NULL,
  signal_headline TEXT,
  signal_source   TEXT,
  signal_score    INTEGER,
  fired_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- UNIQUE on (watchlist_id, signal_id) so the cron won't double-fire on the same signal
CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_hits_unique ON watchlist_hits(watchlist_id, signal_id);

CREATE TABLE IF NOT EXISTS alert_log (
  id             TEXT PRIMARY KEY,
  watchlist_id   TEXT NOT NULL,
  watchlist_name TEXT,
  signal_id      TEXT,
  delivered_to   TEXT,
  channel        TEXT NOT NULL CHECK(channel IN ('email','in_app')),
  sent_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_watchlist_hits_wid   ON watchlist_hits(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_hits_fired ON watchlist_hits(fired_at);
CREATE INDEX IF NOT EXISTS idx_alert_log_wid        ON alert_log(watchlist_id);
