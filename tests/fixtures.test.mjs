import test from 'node:test';
import assert from 'node:assert/strict';
import { isLiveFixture } from '../src/lib/fixtures.js';

const live = [{ batting: { name: 'Nepal' }, bowling: { name: 'UAE' } }];

test('today\'s fixture between the live teams counts as live, either order', () => {
  assert.equal(isLiveFixture({ date: '2026-11-22', title: 'UAE v Nepal' }, live, '2026-11-22'), true);
  assert.equal(isLiveFixture({ date: '2026-11-22', title: 'Nepal v UAE' }, live, '2026-11-22'), true);
});

test('other days, other teams and no live matches are not live', () => {
  assert.equal(isLiveFixture({ date: '2026-11-24', title: 'UAE v Nepal' }, live, '2026-11-22'), false);
  assert.equal(isLiveFixture({ date: '2026-11-22', title: 'Pakistan A v Nepal' }, live, '2026-11-22'), false);
  assert.equal(isLiveFixture({ date: '2026-11-22', title: 'UAE v Nepal' }, [], '2026-11-22'), false);
});
