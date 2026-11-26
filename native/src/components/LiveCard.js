// Live scoreboard + Live right now section.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme.js';
import * as I from './Icons.js';
import { SectionHead } from './ui.js';
import { TeamMark } from './TeamMark.js';
import { overMarkers } from '../lib/innings.js';

function OverBar({ team, limit, active }) {
  const markers = overMarkers(team, limit, active);
  return (
    <View style={styles.ovbarRow}>
      <View style={styles.ovbar}>
        {markers.map((marker) => (
          <View key={marker.over} style={[styles.ovSeg,
            marker.state === 'completed' && styles.ovSegDone,
            marker.state === 'current' && styles.ovSegNow]} />
        ))}
      </View>
      <Text style={styles.ovbarLabel}>{team.overs ?? '—'}{limit ? `/${limit}` : ''}</Text>
    </View>
  );
}

function ScoreRow({ team, active }) {
  return (
    <View style={styles.liveRow}>
      <View style={styles.liveTeam}>
        <TeamMark name={team.name} size={22} />
        <Text style={styles.tname}>{team.name}</Text>
        {active ? <Text style={styles.batDot}>·</Text> : null}
      </View>
      <Text style={styles.num}>{team.runs}<Text style={styles.numW}>{team.wickets != null ? `/${team.wickets}` : ''}</Text></Text>
      <Text style={styles.ov}>{team.overs ?? '—'}</Text>
    </View>
  );
}

export function LiveScoreboard({ match, detail = false }) {
  const { batting, bowling } = match;
  const need = match.target != null ? Math.max(0, match.target - batting.runs) : null;
  const chasing = need != null && need > 0 && match.ballsLeft != null;
  const limit = Number.isInteger(match.overLimit) ? match.overLimit : Number.isInteger(match.totalOvers) ? match.totalOvers : 20;
  const hasPlayers = (match.batters?.length || match.bowlers?.length) > 0;

  if (!detail) {
    return (
      <View style={styles.scoreboard} accessibilityLabel={`${batting.name} ${batting.runs} for ${batting.wickets}, ${bowling.name} ${bowling.runs} for ${bowling.wickets}`}>
        <View>
          <ScoreRow team={batting} active />
          <ScoreRow team={bowling} active={false} />
        </View>
        <OverBar team={batting} limit={limit} active />
        {(chasing || match.runRate) ? (
          <View style={styles.liveNeed}>
            <Text style={styles.need}>{chasing ? `${need} off ${match.ballsLeft}` : 'In progress'}</Text>
            <Text style={styles.rates}>{match.runRate ? `CRR ${match.runRate}` : ''}{chasing && match.requiredRate ? ` · REQ ${match.requiredRate}` : ''}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.detailBoard}>
      <OverBar team={batting} limit={limit} active />
      <View style={styles.miniRow}><Text style={styles.miniB}>Match situation</Text><Text style={styles.miniV}>{match.venue || ''}</Text></View>
      {match.target != null && <View style={styles.miniRow}><Text style={styles.miniL}>Target</Text><Text style={[styles.miniV, styles.miniR]}>{match.target}</Text></View>}
      {match.runRate ? <View style={styles.miniRow}><Text style={styles.miniL}>Current run rate</Text><Text style={[styles.miniV, styles.miniR]}>{match.runRate}</Text></View> : null}
      {match.requiredRate ? <View style={styles.miniRow}><Text style={styles.miniL}>Required run rate</Text><Text style={[styles.miniV, styles.miniR]}>{match.requiredRate}</Text></View> : null}
      {match.batters?.length > 0 && (
        <View>
          <View style={styles.miniRow}><Text style={styles.miniB}>Batting</Text><Text /></View>
          {match.batters.map((player) => (
            <View key={player.name} style={styles.miniRow}>
              <Text style={styles.miniL}>{player.name}</Text>
              <Text style={[styles.miniV, styles.miniR]}>{player.runs}{player.notOut ? '*' : ''}{player.balls != null ? ` (${player.balls})` : ''}</Text>
            </View>
          ))}
        </View>
      )}
      {match.bowlers?.length > 0 && (
        <View>
          <View style={styles.miniRow}><Text style={styles.miniB}>Bowling</Text><Text /></View>
          {match.bowlers.map((player) => (
            <View key={player.name} style={styles.miniRow}>
              <Text style={styles.miniL}>{player.name}</Text>
              <Text style={[styles.miniV, styles.miniR]}>{player.wickets}/{player.runs}{player.overs != null ? ` (${player.overs})` : ''}</Text>
            </View>
          ))}
        </View>
      )}
      {!hasPlayers && <Text style={styles.detailNote}>Player-by-player figures appear when the verified feed supplies them.</Text>}
    </View>
  );
}

function checkedAgo(value) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return 'Recently checked';
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  return seconds < 90 ? `Checked ${seconds}s ago` : `Checked ${Math.floor(seconds / 60)}m ago`;
}

export default function LiveSection({ matches, state, loading, onSeeAll, onOpenMatch }) {
  const [selectedId, setSelectedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const match = matches.find((item) => item.id === selectedId) ?? matches[0];
  const index = Math.max(0, matches.findIndex((item) => item.id === match?.id));
  const select = (next) => {
    setSelectedId(matches[next].id);
    setExpandedId(null);
  };

  return (
    <View>
      <SectionHead
        title="Live right now"
        leading={match ? <View style={styles.pulse} /> : null}
        right={matches.length > 1 ? (
          <View style={styles.storyNav}>
            <Pressable accessibilityLabel="Previous live match" disabled={index === 0} onPress={() => select(index - 1)} style={styles.navBtn}>
              <I.Chevron size={16} color={colors.dim} style={{ transform: [{ rotate: '180deg' }] }} />
            </Pressable>
            <Pressable accessibilityLabel="Next live match" disabled={index === matches.length - 1} onPress={() => select(index + 1)} style={styles.navBtn}>
              <I.Chevron size={16} color={colors.dim} />
            </Pressable>
          </View>
        ) : <TextLink onPress={onSeeAll}>All matches →</TextLink>}
      />

      {!match ? (
        <View style={styles.liveEmpty}>
          <I.CricketBall size={19} color={colors.dim} />
          <View style={{ flex: 1 }}>
            <Text style={styles.liveEmptyStrong}>{loading ? 'Checking live scores' : state === 'none' ? 'No tracked matches are live' : 'Live scores are unavailable'}</Text>
            <Text style={styles.liveEmptySmall}>{loading ? 'Connecting to the verified score feed.' : state === 'none' ? 'Upcoming fixtures are listed below.' : 'Scores return after a fresh, independent source check.'}</Text>
          </View>
        </View>
      ) : (
        <View>
          <View style={styles.livecard}>
            <Pressable style={styles.livecardTop} onPress={() => setExpandedId(expandedId === match.id ? null : match.id)} accessibilityRole="button">
              <Text style={styles.liveMeta}>{match.series}{match.venue ? ` · ${match.venue}` : ''}</Text>
              <I.Chevron size={17} color={colors.dim} style={{ transform: [{ rotate: expandedId === match.id ? '90deg' : '0deg' }] }} />
            </Pressable>
            <Pressable onPress={() => onOpenMatch(match)} accessibilityLabel={`Open live match: ${match.batting.name} v ${match.bowling.name}`}>
              <LiveScoreboard match={match} />
            </Pressable>
            {expandedId === match.id && <LiveScoreboard match={match} detail />}
          </View>
          <View style={styles.sourceRow}>
            {match.verifiedAt ? <Text style={styles.checkedAgo}>{checkedAgo(match.verifiedAt)}</Text> : null}
            <TextLink onPress={() => onOpenMatch(match)}>Scorecard →</TextLink>
          </View>
        </View>
      )}
    </View>
  );
}

export function TextLink({ onPress, children }) {
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Text style={styles.seclink}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.crimson },
  storyNav: { flexDirection: 'row', gap: 6 },
  navBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.hairline, borderRadius: 15 },
  seclink: { color: colors.crimsonText, fontSize: 12.5 },
  liveEmpty: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 16 },
  liveEmptyStrong: { color: colors.text2, fontSize: 13.5, fontWeight: '600' },
  liveEmptySmall: { color: colors.muted, fontSize: 12, marginTop: 2 },
  livecard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, overflow: 'hidden' },
  livecardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  liveMeta: { color: colors.muted, fontSize: 12 },
  scoreboard: { padding: 14, gap: 10 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  liveTeam: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  tname: { color: colors.text, fontSize: 14, fontWeight: '600' },
  batDot: { color: colors.crimson, fontSize: 16 },
  num: { color: colors.text, fontSize: 15, fontWeight: '700', minWidth: 64, textAlign: 'right', fontVariant: ['tabular-nums'] },
  numW: { color: colors.muted, fontWeight: '500' },
  ov: { color: colors.muted, fontSize: 12, minWidth: 44, textAlign: 'right' },
  ovbarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ovbar: { flexDirection: 'row', gap: 2, flex: 1 },
  ovSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surface2 },
  ovSegDone: { backgroundColor: colors.borderStrong },
  ovSegNow: { backgroundColor: colors.crimson },
  ovbarLabel: { color: colors.faint, fontSize: 11, fontVariant: ['tabular-nums'] },
  liveNeed: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  need: { color: colors.crimsonText, fontSize: 12.5, fontWeight: '600' },
  rates: { color: colors.faint, fontSize: 11 },
  detailBoard: { padding: 14, gap: 6, borderTopWidth: 1, borderTopColor: colors.divider },
  miniRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  miniB: { color: colors.text2, fontSize: 12, fontWeight: '700' },
  miniL: { color: colors.muted, fontSize: 12.5 },
  miniV: { color: colors.text2, fontSize: 12.5 },
  miniR: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  detailNote: { color: colors.faint, fontSize: 11.5, marginTop: 6 },
  sourceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  checkedAgo: { color: colors.faint, fontSize: 11 },
});
