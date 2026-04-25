import type { Watchlist, WatchlistHit, WatchlistCriteria, Deal, DealNote, DealContact, CreateDealPayload } from "../../lib/types";

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

// ── Deal CRUD (Phase 8) ───────────────────────────────────────────────────────

interface DealRow {
  id: string;
  parcel_apn: string;
  jurisdiction: string;
  stage: string;
  acres: number | null;
  residual_land_value: number | null;
  next_action: string;
  contact: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

function rowToDeal(row: DealRow): Deal {
  return {
    id:                row.id,
    parcelApn:         row.parcel_apn,
    jurisdiction:      row.jurisdiction,
    stage:             row.stage as Deal["stage"],
    acres:             row.acres,
    residualLandValue: row.residual_land_value,
    nextAction:        row.next_action,
    contact:           row.contact,
    notes:             row.notes,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

export async function getDeals(db: D1Database): Promise<Deal[]> {
  const rows = await db
    .prepare(
      `SELECT * FROM deals WHERE owner_user_id = 'default' AND stage != 'Closed/Dead'
       ORDER BY updated_at DESC`,
    )
    .all<DealRow>();
  return (rows.results ?? []).map(rowToDeal);
}

export async function getDeal(db: D1Database, id: string): Promise<Deal | null> {
  const row = await db
    .prepare(`SELECT * FROM deals WHERE id = ? AND owner_user_id = 'default'`)
    .bind(id)
    .first<DealRow>();
  return row ? rowToDeal(row) : null;
}

export async function createDeal(db: D1Database, payload: CreateDealPayload): Promise<Deal> {
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO deals
         (id, parcel_apn, jurisdiction, stage, acres, residual_land_value,
          next_action, contact, notes, owner_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'default', ?, ?)`,
    )
    .bind(
      id,
      payload.parcelApn,
      payload.jurisdiction,
      payload.stage ?? "Prospect",
      payload.acres ?? null,
      payload.residualLandValue ?? null,
      payload.nextAction ?? "",
      payload.contact ?? "",
      payload.notes ?? "",
      now,
      now,
    )
    .run();
  return {
    id,
    parcelApn:         payload.parcelApn,
    jurisdiction:      payload.jurisdiction,
    stage:             payload.stage ?? "Prospect",
    acres:             payload.acres ?? null,
    residualLandValue: payload.residualLandValue ?? null,
    nextAction:        payload.nextAction ?? "",
    contact:           payload.contact ?? "",
    notes:             payload.notes ?? "",
    createdAt:         now,
    updatedAt:         now,
  };
}

export async function updateDeal(
  db: D1Database,
  id: string,
  patch: Partial<Omit<Deal, "id" | "createdAt">>,
): Promise<Deal | null> {
  const current = await getDeal(db, id);
  if (!current) return null;
  const now  = new Date().toISOString();
  const next = { ...current, ...patch, updatedAt: now };
  await db
    .prepare(
      `UPDATE deals
       SET parcel_apn=?, jurisdiction=?, stage=?, acres=?, residual_land_value=?,
           next_action=?, contact=?, notes=?, updated_at=?
       WHERE id=? AND owner_user_id='default'`,
    )
    .bind(
      next.parcelApn, next.jurisdiction, next.stage,
      next.acres, next.residualLandValue,
      next.nextAction, next.contact, next.notes,
      now, id,
    )
    .run();
  return next;
}

export async function deleteDeal(db: D1Database, id: string): Promise<boolean> {
  // Soft delete: move to Closed/Dead
  const result = await db
    .prepare(`UPDATE deals SET stage='Closed/Dead', updated_at=? WHERE id=? AND owner_user_id='default'`)
    .bind(new Date().toISOString(), id)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function getDealNotes(db: D1Database, dealId: string): Promise<DealNote[]> {
  const rows = await db
    .prepare(`SELECT * FROM deal_notes WHERE deal_id = ? ORDER BY created_at DESC`)
    .bind(dealId)
    .all<{ id: string; deal_id: string; body: string; created_at: string }>();
  return (rows.results ?? []).map((r) => ({
    id: r.id, dealId: r.deal_id, body: r.body, createdAt: r.created_at,
  }));
}

export async function createDealNote(db: D1Database, dealId: string, body: string): Promise<DealNote> {
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(`INSERT INTO deal_notes (id, deal_id, body, created_at) VALUES (?, ?, ?, ?)`)
    .bind(id, dealId, body, now)
    .run();
  return { id, dealId, body, createdAt: now };
}

export async function getDealContacts(db: D1Database, dealId: string): Promise<DealContact[]> {
  const rows = await db
    .prepare(`SELECT * FROM deal_contacts WHERE deal_id = ? ORDER BY created_at ASC`)
    .bind(dealId)
    .all<{ id: string; deal_id: string; name: string; role: string; phone: string | null; email: string | null; created_at: string }>();
  return (rows.results ?? []).map((r) => ({
    id: r.id, dealId: r.deal_id, name: r.name, role: r.role,
    phone: r.phone, email: r.email, createdAt: r.created_at,
  }));
}

export async function createDealContact(
  db: D1Database,
  dealId: string,
  data: { name: string; role?: string; phone?: string; email?: string },
): Promise<DealContact> {
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO deal_contacts (id, deal_id, name, role, phone, email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, dealId, data.name, data.role ?? "", data.phone ?? null, data.email ?? null, now)
    .run();
  return { id, dealId, name: data.name, role: data.role ?? "", phone: data.phone ?? null, email: data.email ?? null, createdAt: now };
}
