// Template for a permitted live-score provider (licensed API or owner-approved feed).
//
// Usage:
//   1. Copy this file to scripts/providers/custom.mjs (gitignored — keep keys in env vars).
//   2. Implement collect() to return fully-formed liveMatches records:
//        id          stable doc id, e.g. 'nep-uae-tri'
//        status      'live'
//        batting     { name, runs, wickets, overs }   ← team currently batting
//        bowling     { name, runs, wickets, overs }
//        series, venue, competition ('Nepal' | 'World')
//        source      display name, e.g. 'Entitysport'
//        sourceUrl   https:// page proving the score (the UI links it)
//        verifiedAt  set automatically by the ingest script
//      Optional: target, ballsLeft, runRate, requiredRate, short.
//   3. Set LIVE_PROVIDER_MODULE=scripts/providers/custom.mjs (or an absolute path)
//      in the ingest Action's env.
//
// The ingest script stamps verifiedAt on every record and publishes it with the
// cross-checked public-source scores; the frontend freshness gate (8 minutes) applies
// to provider records exactly like any other.
export async function collect(/* fetchHtml */) {
  const apiKey = process.env.CRICKET_API_KEY;
  if (!apiKey) return [];
  // const res = await fetch(`https://example-cricket-api/matches/live?key=${apiKey}`);
  // const data = await res.json();
  // return data.matches.map((m) => ({ id: …, status: 'live', batting: …, bowling: …, … }));
  return [];
}
