const APP_URL = "https://wasatch-intel.cam-s-rigby.workers.dev";
const ALERT_FROM = "Wasatch Intel <onboarding@resend.dev>";

export async function sendWatchlistAlert(
  apiKey: string,
  to: string,
  watchlistName: string,
  hits: Array<{ headline: string; source: string; signal: number }>,
): Promise<void> {
  const hitRows = hits
    .map(
      (h) =>
        `<tr>
          <td style="padding:6px 0;border-bottom:1px solid #f0f0f0">${h.headline}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#888;white-space:nowrap">${h.source}</td>
          <td style="padding:6px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${h.signal}</td>
        </tr>`,
    )
    .join("");

  const plural = hits.length !== 1;
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;color:#111">
  <p style="font-size:11px;color:#888;margin-bottom:16px;text-transform:uppercase;letter-spacing:0.05em">Wasatch Intel</p>
  <h2 style="font-size:17px;margin:0 0 4px">Watchlist match: ${watchlistName}</h2>
  <p style="font-size:13px;color:#555;margin:0 0 20px">
    ${hits.length} new signal${plural ? "s" : ""} crossed your threshold.
  </p>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead>
      <tr style="border-bottom:2px solid #111">
        <th style="text-align:left;padding:4px 0">Signal</th>
        <th style="text-align:left;padding:4px 8px">Source</th>
        <th style="text-align:right;padding:4px 0">Score</th>
      </tr>
    </thead>
    <tbody>${hitRows}</tbody>
  </table>
  <p style="margin-top:24px">
    <a href="${APP_URL}/watchlists"
       style="display:inline-block;background:#111;color:#fff;padding:9px 18px;text-decoration:none;border-radius:5px;font-size:13px;font-weight:500">
      View on Wasatch Intel →
    </a>
  </p>
  <p style="font-size:11px;color:#aaa;margin-top:20px">
    You're receiving this because watchlist "${watchlistName}" has email alerts enabled.
  </p>
</div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: ALERT_FROM,
      to,
      subject: `Watchlist "${watchlistName}" — ${hits.length} new signal${plural ? "s" : ""}`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}
