import type { Env } from "../lib/d1-client";
import { getWatchlists, recordHit, logAlert } from "../lib/d1-client";
import { sendWatchlistAlert } from "../lib/email";
import { loadSignalWire } from "../lib/csv-loader";
import type { Watchlist, WatchlistCriteria, SignalWireItem } from "../../lib/types";

// Single-user hardcoded alert destination for Phase 7.
// Wire to a real user preference store in a future phase.
const ALERT_EMAIL = "cam.s.rigby@gmail.com";

function signalMatchesWatchlist(signal: SignalWireItem, watchlist: Watchlist): boolean {
  if (signal.signal < watchlist.signalThreshold) return false;

  const c = watchlist.criteria as WatchlistCriteria;

  switch (watchlist.type) {
    case "Geography": {
      const { jurisdictions } = c as Extract<WatchlistCriteria, { type: "Geography" }>;
      if (!jurisdictions.length) return true; // no filter = all geographies
      return jurisdictions.some((j) => signal.jurisdiction.toLowerCase().includes(j.toLowerCase()));
    }
    case "Applicant": {
      const { developerName } = c as Extract<WatchlistCriteria, { type: "Applicant" }>;
      if (!developerName) return false;
      return signal.headline.toLowerCase().includes(developerName.toLowerCase());
    }
    case "Parcel Set": {
      const { apns } = c as Extract<WatchlistCriteria, { type: "Parcel Set" }>;
      if (!apns.length) return false;
      return apns.some(
        (apn) =>
          signal.headline.includes(apn) ||
          (signal.agendaId != null && signal.agendaId.includes(apn)),
      );
    }
    case "Saved Search": {
      // signalTypes filter deferred until signal wire carries a signalType field
      const { jurisdictions, minScore } = c as Extract<WatchlistCriteria, { type: "Saved Search" }>;
      if (minScore !== undefined && signal.signal < minScore) return false;
      if (jurisdictions?.length && !jurisdictions.some((j) => signal.jurisdiction.toLowerCase().includes(j.toLowerCase()))) return false;
      return true;
    }
    default:
      return false;
  }
}

export async function runWatchlistCheck(env: Env): Promise<{ checked: number; newHits: number; emailsSent: number }> {
  if (!env.DB) return { checked: 0, newHits: 0, emailsSent: 0 };

  const watchlists = await getWatchlists(env.DB);
  if (!watchlists.length) return { checked: watchlists.length, newHits: 0, emailsSent: 0 };

  const signalResult = await loadSignalWire();
  const signals = signalResult.data;

  // Only evaluate signals from the last 2 hours so the hourly cron doesn't re-process old data.
  // Use date-prefix comparison (signal.date is YYYY-MM-DD) — signals from today are always included.
  const todayStr = new Date().toISOString().slice(0, 10);
  const recentSignals = signals.filter((s) => s.date >= todayStr);

  let totalNewHits = 0;
  let emailsSent = 0;

  for (const watchlist of watchlists) {
    const matches = recentSignals.filter((s) => signalMatchesWatchlist(s, watchlist));
    if (!matches.length) continue;

    for (const m of matches) {
      await recordHit(env.DB, watchlist.id, {
        id: m.id,
        headline: m.headline,
        source: m.source,
        signal: m.signal,
      });
      totalNewHits++;
    }

    if (watchlist.alerts.email && env.RESEND_API_KEY) {
      try {
        await sendWatchlistAlert(
          env.RESEND_API_KEY,
          ALERT_EMAIL,
          watchlist.name,
          matches.map((m) => ({ headline: m.headline, source: m.source, signal: m.signal })),
        );
        for (const m of matches) {
          await logAlert(env.DB, watchlist.id, watchlist.name, m.id, ALERT_EMAIL, "email");
        }
        emailsSent++;
      } catch {
        // Non-fatal: log the failure but continue processing other watchlists
        console.error(`Failed to send alert email for watchlist ${watchlist.id}`);
      }
    }
  }

  return { checked: watchlists.length, newHits: totalNewHits, emailsSent };
}
