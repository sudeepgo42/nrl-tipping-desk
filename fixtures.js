// Vercel serverless route: relays the fixture feed so the browser is not
// dependent on free public CORS proxies, which were all failing.
//
// fixturedownload.com sends no Access-Control-Allow-Origin header, so a browser
// cannot read it directly. This runs server side, where CORS does not apply, and
// returns the payload with the header the browser needs.
//
// Written as CommonJS in a .js file deliberately. That is the combination Vercel
// builds without any package.json present: a .js file defaults to CommonJS, and
// .js is unambiguously recognised as a function. Using `export default` here, or
// renaming this to .mjs, reintroduces the risk of the file being served as a
// static asset so that /api/fixtures returns 404.

const ALLOWED_SEASONS = ["nrl-2026", "nrl-2025", "nrl-2024"];

module.exports = async (req, res) => {
  const season = String((req.query && req.query.season) || "nrl-2026");
  if (ALLOWED_SEASONS.indexOf(season) === -1) {
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
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(502).json({ error: "empty upstream payload" });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    // Cache at the edge for 5 minutes, serve stale for an hour while revalidating.
    // Results change only a few times a week, so this keeps load off the origin
    // without ever showing scores that are meaningfully behind.
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
};
