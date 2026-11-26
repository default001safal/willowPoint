import * as I from './Icons.jsx';
import FixtureRow from './FixtureRow.jsx';
import { SectionHead } from './ui.jsx';
import { useContent } from '../lib/content.jsx';
import { isLiveFixture } from '../lib/fixtures.js';
import { upcomingFixtures } from '../lib/selectors.js';

export default function NextForNepal({ onSeeAll, saved = [], toggleSaved = () => {}, onOpenRecord }) {
  const { today, loadState, fixtures: allFixtures, liveMatches } = useContent();
  const fixtures = upcomingFixtures(allFixtures, today)
    .filter((fixture) => fixture.nepal === true && !isLiveFixture(fixture, liveMatches, today))
    .slice(0, 3);

  return (
    <section className="next-section" aria-label="Nepal's next matches">
      <SectionHead title="Next for Nepal" className="between">
        <button type="button" className="seclink" onClick={onSeeAll}>All fixtures →</button>
      </SectionHead>
      <div className="fixture-list" aria-live="polite">
        {fixtures.map((fixture) => (
          <FixtureRow key={fixture.id} fixture={fixture} today={today} saved={saved} toggleSaved={toggleSaved} onOpenRecord={onOpenRecord} />
        ))}
        {!fixtures.length && (
          <p className="empty-state">{loadState === 'loading' ? 'Checking confirmed fixtures…' : loadState === 'error' ? 'Fixtures could not refresh. Please try again later.' : 'No confirmed upcoming Nepal fixtures are listed yet.'}</p>
        )}
      </div>
      {fixtures.length > 0 && <p className="section-footnote"><I.Calendar size={11} />All times NPT</p>}
    </section>
  );
}
