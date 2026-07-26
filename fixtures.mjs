// Vercel serverless route: relays the fixture feed so the browser is not
// dependent on free public CORS proxies, which were all failing.
//
// fixturedownload.com sends no Access-Control-Allow-Origin header, so a browser
// cannot read it directly. This runs server side, where CORS does not apply, and
// returns the payload with the header the browser needs.
//
// Deploy: drop this file at api/fixtures.js in the repo root. No config needed.

const ALLOWED_SEASONS = new Set(["nrl-2026", "nrl-2025", "nrl-2024"]);

export default async function handler(req, res) {
  const season = String(req.query.season || "nrl-2026");
  if (!ALLOWED_SEASONS.has(season)) {
    return res.status(400).json({ error: "unsupported season" });
  }

  try {
    const upstream = await fetch(`https://fixturedownload.com/feed/json/${season}`, {
      headers: { "User-Agent": "nrl-tipping-desk" }
    });
    if (!upstream.ok) {
      return res.status(502).json({ error: `upstream ${upstream.status}` });
    }
    const data = await upstream.json();
    if (!Array.isArray(data) || !data.length) {
      return res.status(502).json({ error: "empty upstream payload" });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    // Cache at the edge for 5 minutes, serve stale for an hour while revalidating.
    // Results only change a few times a week, so this keeps load off the origin
    // without ever showing prices or scores that are meaningfully behind.
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
