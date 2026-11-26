// Optional team.overRuns contains runs per over, starting with over 1.
// Missing totals stay unknown when a match record does not supply them.
export function overMarkers(team, limit = 20, active = false) {
  const total = Number.isInteger(limit) && limit > 0 && limit <= 50 ? limit : 20;
  const [whole, balls] = String(team.overs ?? '0').split('.').map(Number);
  const inPlay = active && team.wickets !== 10;
  const partialFinished = !inPlay && balls > 0 ? 1 : 0;
  const completed = Math.min(total, Math.max(0, (whole || 0) + partialFinished));
  const current = completed < total && inPlay;
  const runs = Array.isArray(team.overRuns) ? team.overRuns : [];

  return Array.from({ length: total }, (_, index) => {
    const state = index < completed ? 'completed' : index === completed && current ? 'current' : 'upcoming';
    const value = runs[index];
    return {
      over: index + 1,
      state,
      runs: state !== 'upcoming' && Number.isInteger(value) && value >= 0 ? value : null,
    };
  });
}
