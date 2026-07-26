// Diagnostic only. Delete once /api/odds is confirmed working.
//
// Reports whether ODDS_API_KEY is visible to the function at runtime, which
// environment is serving the request, and the NAMES of any environment variables
// that look related. Names only, never values, so a typo can be spotted without
// exposing the key itself.

module.exports = (req, res) => {
  const key = process.env.ODDS_API_KEY;

  // Names of custom variables that look relevant. Deliberately narrow: this
  // avoids dumping unrelated project configuration onto a public URL.
  const related = Object.keys(process.env)
    .filter(n => /odds|api|key|token/i.test(n))
    .filter(n => !n.startsWith("VERCEL_") && !n.startsWith("AWS_"))
    .sort();

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    // Is the variable the code actually reads present, and does it look sane?
    oddsKeyPresent: Boolean(key),
    oddsKeyLength: key ? key.length : 0,          // the-odds-api keys are 32 chars
    oddsKeyLooksValid: Boolean(key && /^[a-f0-9]{32}$/i.test(key.trim())),
    oddsKeyHasWhitespace: Boolean(key && key !== key.trim()),
    // If oddsKeyPresent is false but a near-miss name appears here, it is a typo.
    relatedVariableNames: related,
    // Which environment answered. A variable scoped only to Production reads as
    // undefined in preview, so this distinguishes a scope problem from a typo.
    environment: process.env.VERCEL_ENV || "unknown",
    node: process.version,
    time: new Date().toISOString()
  });
};
