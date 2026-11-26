import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme.js';
import * as I from './Icons.js';
import FixtureRow from './FixtureRow.js';
import { SectionHead } from './ui.js';
import { TextLink } from './LiveCard.js';
import { useContent } from '../lib/content.js';
import { isLiveFixture } from '../lib/fixtures.js';
import { upcomingFixtures } from '../lib/selectors.js';

export default function NextForNepal({ onSeeAll, saved = [], toggleSaved = () => {}, onOpenRecord }) {
  const { today, loadState, fixtures: allFixtures, liveMatches } = useContent();
  const fixtures = upcomingFixtures(allFixtures, today)
    .filter((fixture) => fixture.nepal === true && !isLiveFixture(fixture, liveMatches, today))
    .slice(0, 3);

  return (
    <View style={{ marginTop: 4 }}>
      <SectionHead title="Next for Nepal" right={<TextLink onPress={onSeeAll}>All fixtures →</TextLink>} />
      <View>
        {fixtures.map((fixture) => (
          <FixtureRow key={fixture.id} fixture={fixture} today={today} saved={saved} toggleSaved={toggleSaved} onOpenRecord={onOpenRecord} />
        ))}
        {!fixtures.length && (
          <Text style={styles.empty}>{loadState === 'loading' ? 'Checking confirmed fixtures…' : loadState === 'error' ? 'Fixtures could not refresh. Please try again later.' : 'No confirmed upcoming Nepal fixtures are listed yet.'}</Text>
        )}
      </View>
      {fixtures.length > 0 && (
        <View style={styles.footnote}>
          <I.Calendar size={11} color={colors.faint} />
          <Text style={styles.footnoteText}>All times NPT</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.muted, fontSize: 13, paddingVertical: 10 },
  footnote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  footnoteText: { color: colors.faint, fontSize: 11 },
});
