// Fixture helpers shared by Home and Discover.

const norm = (s = '') => s.trim().toLowerCase();

// A fixture is "live" when it is today and a live match has both of its teams.
// Live matches already have their own card, so lists skip these to avoid showing the game twice.
export function isLiveFixture(fixture, liveMatches, today) {
  if (!fixture || fixture.date !== today) return false;
  const teams = fixture.title.split(/\s+v\s+/i).map(norm);
  if (teams.length !== 2) return false;
  return liveMatches.some((m) => {
    const playing = [norm(m.batting?.name), norm(m.bowling?.name)];
    return teams.every((t) => playing.includes(t));
  });
}
