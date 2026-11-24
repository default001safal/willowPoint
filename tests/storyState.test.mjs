import test from 'node:test';
import assert from 'node:assert/strict';
import { currentStories } from '../src/lib/storyState.js';

test('news needs a recent date and a source URL', () => {
  const now = Date.parse('2026-11-24T08:00:00Z');
  const good = { title: 'Latest', sourceUrl: 'https://example.org/news', publishedAt: '2026-11-24T07:00:00Z' };
  assert.deepEqual(currentStories([good, { title: 'Undated' }, { ...good, publishedAt: '2026-11-01T07:00:00Z' }], now), [good]);
});
