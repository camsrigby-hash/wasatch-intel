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

-- Phase 8: Deal pipeline persistence
CREATE TABLE IF NOT EXISTS deals (
  id                  TEXT PRIMARY KEY,
  parcel_apn          TEXT NOT NULL,
  jurisdiction        TEXT NOT NULL DEFAULT '',
  stage               TEXT NOT NULL DEFAULT 'Prospect'
                        CHECK(stage IN ('Prospect','Diligence','LOI','Under Contract','Closed/Dead')),
  acres               REAL,
  residual_land_value REAL,
  next_action         TEXT NOT NULL DEFAULT '',
  contact             TEXT NOT NULL DEFAULT '',
  notes               TEXT NOT NULL DEFAULT '',
  owner_user_id       TEXT NOT NULL DEFAULT 'default',
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deal_notes (
  id         TEXT PRIMARY KEY,
  deal_id    TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deal_contacts (
  id         TEXT PRIMARY KEY,
  deal_id    TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT '',
  phone      TEXT,
  email      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_deals_stage         ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_apn           ON deals(parcel_apn);
CREATE INDEX IF NOT EXISTS idx_deal_notes_deal     ON deal_notes(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_deal  ON deal_contacts(deal_id);
