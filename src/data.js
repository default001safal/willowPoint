// Content snapshot from the current willowPoint build (updated 21 Nov, NPT).
// Swap these for live feeds when the data layer is ready.

export const TODAY = '2026-11-21';

export const liveMatches = [
  {
    id: 'nep-uae-tri',
    series: 'Himalayan T20I Tri-Series',
    short: 'Himalayan T20I', // shown on the Home live card
    venue: 'Kirtipur',
    batting: {
      code: 'NEP', name: 'Nepal', color: '#DC143C',
      runs: 131, wickets: 3, overs: '14.2',
    },
    bowling: {
      code: 'UAE', name: 'UAE', color: '#00732F',
      runs: 169, wickets: 7, overs: '20',
    },
    target: 170,
    runRate: '9.14',
    requiredRate: '6.88',
    ballsLeft: 34,
  },
];

export const fixtures = [
  { id: 'uae-nep', date: '2026-11-22', title: 'UAE v Nepal', time: '11:45 NPT', venue: 'Doha', competition: 'Nepal', nepal: true },
  { id: 'pka-nep', date: '2026-11-24', title: 'Pakistan A v Nepal', time: '15:45 NPT', venue: 'Doha', competition: 'Nepal', nepal: true },
  { id: 'nep-ita', date: '2026-12-04', title: 'Nepal v Italy', time: 'Time TBC', venue: 'Kirtipur', competition: 'Nepal', nepal: true },
];

export const nplFinal = {
  home: 'Lumbini Lions',
  away: 'Sudurpaschim Royals',
  date: '2026-11-21',
  time: '17:00',
  venue: 'Kirtipur',
  note: 'Q1 rematch',
};

export const results = [
  {
    id: 'ind-nz-t1', competition: 'World', label: '1st Test · Wellington · Day 3', status: 'Stumps',
    lines: [{ team: 'India', score: '486/4' }, { team: 'New Zealand', score: '368' }],
    summary: 'India lead by 118 runs', source: 'BCCI',
  },
  {
    id: 'inda-nep', competition: 'Nepal', label: 'Asia Cup Rising Stars · Doha · 20 Nov',
    lines: [{ team: 'India A', score: '332/9' }, { team: 'Nepal', score: '26', overs: '11.3' }],
    summary: 'India A won by 306 runs', source: 'BCCI',
  },
  {
    id: 'npl-q2', competition: 'NPL', label: 'NPL Qualifier 2 · Kirtipur · 19 Nov',
    lines: [{ team: 'Sudurpaschim Royals', score: '136/7' }, { team: 'Chitwan Rhinos', score: '133/9' }],
    summary: 'Royals won by 3 wickets', source: 'Cricbuzz',
  },
  {
    id: 'npl-q1', competition: 'NPL', label: 'NPL Qualifier 1 · Kirtipur · 17 Nov',
    lines: [{ team: 'Lumbini Lions', score: '108/4' }, { team: 'Sudurpaschim Royals', score: '105/8' }],
    summary: 'Lions won by 6 wickets', source: 'Cricbuzz',
  },
];

export const stories = [
  { id: 's1', title: 'Lions. Royals. One final.', source: 'The Kathmandu Post', art: 'final' },
  { id: 's2', title: "Nepal are heading to Lord's", source: 'MCC', art: 'lords' },
  { id: 's3', title: 'A difficult start in Doha', source: 'BCCI', art: 'doha' },
];

export const worldNews = [
  { id: 'w1', title: 'India take charge in Wellington', blurb: 'India 486/4 at stumps on day three, 118 ahead of New Zealand.', source: 'Reuters', date: '21 Nov' },
  { id: 'w2', title: 'Today: Australia v England, 1st T20I', blurb: 'Melbourne opens the five-match series.', source: 'ICC', date: '21 Nov' },
  { id: 'w3', title: 'Pakistan reset central contracts', blurb: "38 men's players covered through June 2027.", source: 'ICC', date: '21 Nov' },
];

export const cuePrompts = [
  { id: 'q1', title: 'Set the scene for the NPL final', hint: 'Finalists, the route there, start time' },
  { id: 'q2', title: 'When do Nepal play next?', hint: 'Confirmed fixtures in Nepal time' },
  { id: 'q3', title: 'What happened in Doha?', hint: "Nepal's latest result, explained" },
];

export const followables = [
  { id: 'nepal', name: 'Nepal', kind: 'National team', default: true },
  { id: 'npl', name: 'NPL', kind: 'Domestic league', default: true },
  { id: 'women', name: 'Nepal Women', kind: "Women's cricket", default: true },
  { id: 'u19', name: 'U19', kind: 'Youth cricket', default: false },
  { id: 'world', name: 'World', kind: 'International cricket', default: false },
];

// Temporary UI-only over totals. Supplied team.overRuns takes priority.
export const mockOverRuns = {
  'nep-uae-tri': {
    batting: [8, 12, 9, 13, 6, 4, 7, 5, 10, 9, 11, 8, 12, 15, 2],
    bowling: [6, 8, 7, 10, 5, 9, 6, 12, 8, 7, 9, 11, 5, 10, 8, 6, 9, 7, 12, 14],
  },
};
