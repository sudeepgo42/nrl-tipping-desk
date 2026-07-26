// Vercel serverless route: fetches head-to-head odds using a key held in an
// environment variable rather than shipped to the browser.
//
// The key was previously hardcoded in client JavaScript in a public repository,
// which means anyone reading the source could spend the 500 request monthly
// allowance. Set ODDS_API_KEY in the Vercel project settings. Remember that a
// variable added after a deployment reads as undefined inside it, so redeploy
// after changing it, and scope it to Preview as well as Production or preview
// builds will report no odds.
//
// CommonJS in a .js file on purpose. See the note in fixtures.js.

module.exports = async (req, res) => {
  const key = process.env.ODDS_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "ODDS_API_KEY is not configured" });
  }

  const url = "https://api.the-odds-api.com/v4/sports/rugbyleague_nrl/odds"
    + `?regions=au&markets=h2h&oddsFormat=decimal&apiKey=${encodeURIComponent(key)}`;

  try {
    const upstream = await fetch(url);
    // Pass the quota counter through so the client can display what is left.
    const remaining = upstream.headers.get("x-requests-remaining");
    if (remaining) {
      res.setHeader("x-requests-remaining", remaining);
      res.setHeader("Access-Control-Expose-Headers", "x-requests-remaining");
    }
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `upstream ${upstream.status}` });
    }
    const data = await upstream.json();

    res.setHeader("Access-Control-Allow-Origin", "*");
    // Short edge cache: prices move, but not every second, and this stops a burst
    // of reloads from spending several requests against the monthly allowance.
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
};
