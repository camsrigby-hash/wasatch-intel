import type { Watchlist, WatchlistHit, WatchlistCriteria } from "../../lib/types";

export interface Env {
  DB?: D1Database;
  RESEND_API_KEY?: string;
}

interface WatchlistRow {
  id: string;
  name: string;
  type: string;
  criteria: string;
  signal_threshold: number;
  alert_in_app: number;
  alert_email: number;
  created_at: string;
  updated_at: string;
  hit_count: number;
  last_hit: string | null;
}

function rowToWatchlist(row: WatchlistRow): Watchlist {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Watchlist["type"],
    criteria: JSON.parse(row.criteria) as WatchlistCriteria,
    signalThreshold: row.signal_threshold,
    alerts: { inApp: row.alert_in_app === 1, email: row.alert_email === 1 },
    hits: row.hit_count ?? 0,
    lastHit: row.last_hit ?? null,
    createdAt: row.created_at,
  };
}

export async function getWatchlists(db: D1Database): Promise<Watchlist[]> {
  const rows = await db
    .prepare(
      `SELECT w.*, COUNT(h.id) as hit_count, MAX(h.fired_at) as last_hit
       FROM watchlists w
       LEFT JOIN watchlist_hits h ON h.watchlist_id = w.id
       WHERE w.owner_user_id = 'default'
       GROUP BY w.id
       ORDER BY w.updated_at DESC`,
    )
    .all<WatchlistRow>();
  return (rows.results ?? []).map(rowToWatchlist);
}

export async function getWatchlist(db: D1Database, id: string): Promise<Watchlist | null> {
  const row = await db
    .prepare(
      `SELECT w.*, COUNT(h.id) as hit_count, MAX(h.fired_at) as last_hit
       FROM watchlists w
       LEFT JOIN watchlist_hits h ON h.watchlist_id = w.id
       WHERE w.id = ? AND w.owner_user_id = 'default'
       GROUP BY w.id`,
    )
    .bind(id)
    .first<WatchlistRow>();
  return row ? rowToWatchlist(row) : null;
}

export async function createWatchlist(
  db: D1Database,
  payload: {
    name: string;
    type: Watchlist["type"];
    criteria: WatchlistCriteria;
    signalThreshold?: number;
    alerts?: { inApp: boolean; email: boolean };
  },
): Promise<Watchlist> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const threshold = payload.signalThreshold ?? 60;
  const inApp = payload.alerts?.inApp !== false ? 1 : 0;
  const email = payload.alerts?.email ? 1 : 0;
  await db
    .prepare(
      `INSERT INTO watchlists
         (id, name, type, criteria, signal_threshold, alert_in_app, alert_email, owner_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'default', ?, ?)`,
    )
    .bind(id, payload.name, payload.type, JSON.stringify(payload.criteria), threshold, inApp, email, now, now)
    .run();
  return {
    id,
    name: payload.name,
    type: payload.type,
    criteria: payload.criteria,
    signalThreshold: threshold,
    alerts: { inApp: inApp === 1, email: email === 1 },
    hits: 0,
    lastHit: null,
    createdAt: now,
  };
}

export async function updateWatchlist(
  db: D1Database,
  id: string,
  patch: Partial<{
    name: string;
    criteria: WatchlistCriteria;
    signalThreshold: number;
    alerts: { inApp: boolean; email: boolean };
  }>,
): Promise<Watchlist | null> {
  const current = await getWatchlist(db, id);
  if (!current) return null;
  const now = new Date().toISOString();
  const name = patch.name ?? current.name;
  const criteria = patch.criteria ?? current.criteria;
  const threshold = patch.signalThreshold ?? current.signalThreshold;
  const inApp = patch.alerts !== undefined ? (patch.alerts.inApp ? 1 : 0) : (current.alerts.inApp ? 1 : 0);
  const email = patch.alerts !== undefined ? (patch.alerts.email ? 1 : 0) : (current.alerts.email ? 1 : 0);
  await db
    .prepare(
      `UPDATE watchlists
       SET name=?, criteria=?, signal_threshold=?, alert_in_app=?, alert_email=?, updated_at=?
       WHERE id=? AND owner_user_id='default'`,
    )
    .bind(name, JSON.stringify(criteria), threshold, inApp, email, now, id)
    .run();
  return { ...current, name, criteria, signalThreshold: threshold, alerts: { inApp: inApp === 1, email: email === 1 } };
}

export async function deleteWatchlist(db: D1Database, id: string): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM watchlists WHERE id = ? AND owner_user_id = 'default'`)
    .bind(id)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function getWatchlistHits(db: D1Database, watchlistId: string, limit = 50): Promise<WatchlistHit[]> {
  const rows = await db
    .prepare(`SELECT * FROM watchlist_hits WHERE watchlist_id = ? ORDER BY fired_at DESC LIMIT ?`)
    .bind(watchlistId, limit)
    .all<{
      id: string;
      watchlist_id: string;
      signal_id: string;
      signal_headline: string | null;
      signal_source: string | null;
      signal_score: number | null;
      fired_at: string;
    }>();
  return (rows.results ?? []).map((r) => ({
    id: r.id,
    watchlistId: r.watchlist_id,
    signalId: r.signal_id,
    signalHeadline: r.signal_headline,
    signalSource: r.signal_source,
    signalScore: r.signal_score,
    firedAt: r.fired_at,
  }));
}

export async function recordHit(
  db: D1Database,
  watchlistId: string,
  signal: { id: string; headline: string; source: string; signal: number },
): Promise<void> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT OR IGNORE INTO watchlist_hits
         (id, watchlist_id, signal_id, signal_headline, signal_source, signal_score)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, watchlistId, signal.id, signal.headline, signal.source, signal.signal)
    .run();
}

export async function logAlert(
  db: D1Database,
  watchlistId: string,
  watchlistName: string,
  signalId: string,
  deliveredTo: string,
  channel: "email" | "in_app",
): Promise<void> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO alert_log (id, watchlist_id, watchlist_name, signal_id, delivered_to, channel)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, watchlistId, watchlistName, signalId, deliveredTo, channel)
    .run();
}
