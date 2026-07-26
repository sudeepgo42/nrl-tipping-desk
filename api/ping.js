// Diagnostic only. If /api/ping returns JSON but the other routes 404, the
// problem is those files. If /api/ping ALSO 404s, no function in this folder is
// being built, which means the problem is project configuration rather than code
// (most often the Root Directory setting, or the commit landing on a branch
// other than the one Vercel deploys from).
//
// Safe to delete once the other routes are confirmed working.

module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    ok: true,
    route: "/api/ping",
    node: process.version,
    oddsKeyPresent: Boolean(process.env.ODDS_API_KEY),
    time: new Date().toISOString()
  });
};
