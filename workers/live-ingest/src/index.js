import { collectVerifiedLive, DEFAULT_LIVE_URLS } from '../../../scripts/live-core.mjs';
import { commitOperations, listLiveMatchIds } from './firestore.js';
import { emptyLiveCache, planFeedError, planLiveWrites } from './planner.js';

const LIVE_INTERVAL_MS = 15_000;
const IDLE_INTERVAL_MS = 60_000;
const MAX_HTML_BYTES = 8 * 1024 * 1024;
const json = (value, status = 200) => new Response(JSON.stringify(value, null, 2), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

async function fetchHtml(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(12_000),
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  if (Number(response.headers.get('Content-Length')) > MAX_HTML_BYTES) {
    await response.body?.cancel();
    throw new Error('Response exceeds 8 MiB');
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let html = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error('Response exceeds 8 MiB');
    }
    html += decoder.decode(value, { stream: true });
  }
  return html + decoder.decode();
}

export class LiveCoordinator extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.active = false;
  }

  async cache() {
    const existing = await this.ctx.storage.get('liveCache');
    return existing || emptyLiveCache(await listLiveMatchIds(this.env));
  }

  async runOnce() {
    const now = Date.now();
    const urls = {
      ...DEFAULT_LIVE_URLS,
      ...(this.env.WILLOWPOINT_SOURCE_URLS ? JSON.parse(this.env.WILLOWPOINT_SOURCE_URLS) : {}),
    };
    const outcome = await collectVerifiedLive({ fetchHtml, now, urls, detailGapMs: 250 });
    if (outcome.state !== 'ok') {
      throw new Error(`Live verification degraded: ${outcome.degradedSources.join('; ') || 'sources disagree'}`);
    }
    const plan = planLiveWrites(outcome, await this.cache(), now);
    await commitOperations(this.env, plan.operations);
    await this.ctx.storage.put('liveCache', plan.cache);
    this.active = outcome.matches.length > 0;
    const result = {
      state: 'ok', checkedAt: new Date(now).toISOString(), writes: plan.operations.length,
      matches: outcome.matches.map((match) => match.id), sourceCounts: outcome.sourceCounts,
      enabledSources: outcome.enabledSources, degradedSources: outcome.degradedSources,
    };
    await this.ctx.storage.put('lastResult', result);
    return result;
  }

  async markError(error) {
    const previous = await this.ctx.storage.get('lastResult');
    const cache = await this.cache();
    const plan = planFeedError(cache, Date.now(), error.message, previous?.state !== 'error');
    try {
      await commitOperations(this.env, plan.operations);
      await this.ctx.storage.put('liveCache', plan.cache);
    } finally {
      this.active = false;
      await this.ctx.storage.put('lastResult', {
        state: 'error', checkedAt: new Date().toISOString(), detail: error.message.slice(0, 300),
      });
    }
  }

  async alarm() {
    if (!await this.ctx.storage.get('enabled')) return;
    const startedAt = Date.now();
    try {
      await this.runOnce();
    } catch (error) {
      try { await this.markError(error); } catch { /* stale/missing feed also fails closed */ }
    }
    if (await this.ctx.storage.get('enabled')) {
      const interval = this.active ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
      const next = Math.max(Date.now() + 2_000, startedAt + interval);
      await this.ctx.storage.setAlarm(next);
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/watchdog') {
      let enabled = await this.ctx.storage.get('enabled');
      if (enabled == null) {
        enabled = true;
        await this.ctx.storage.put('enabled', true);
      }
      const alarm = await this.ctx.storage.getAlarm();
      if (enabled && !alarm) await this.ctx.storage.setAlarm(Date.now() + 1_000);
      return json({ ok: true, enabled, alarm: await this.ctx.storage.getAlarm() });
    }
    if (url.pathname === '/start' && request.method === 'POST') {
      await this.ctx.storage.put('enabled', true);
      await this.ctx.storage.setAlarm(Date.now() + 1_000);
      return json({ ok: true, enabled: true });
    }
    if (url.pathname === '/stop' && request.method === 'POST') {
      await this.ctx.storage.put('enabled', false);
      await this.ctx.storage.deleteAlarm();
      return json({ ok: true, enabled: false });
    }
    if (url.pathname === '/status') {
      return json({
        enabled: Boolean(await this.ctx.storage.get('enabled')),
        alarm: await this.ctx.storage.getAlarm(),
        lastResult: await this.ctx.storage.get('lastResult') || null,
      });
    }
    if (url.pathname === '/run' && request.method === 'POST') {
      try { return json(await this.runOnce()); }
      catch (error) {
        try { await this.markError(error); } catch { /* reported below */ }
        return json({ state: 'error', detail: error.message }, 503);
      }
    }
    return json({ error: 'Not found' }, 404);
  }
}

function coordinator(env) {
  return env.LIVE_COORDINATOR.getByName('willowpoint-production');
}

function authorized(request, env) {
  const token = env.INGEST_ADMIN_TOKEN;
  return Boolean(token && request.headers.get('Authorization') === `Bearer ${token}`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, service: 'willowpoint-live-ingest' });
    }
    if (!['/start', '/stop', '/status', '/run'].includes(url.pathname)) {
      return json({ error: 'Not found' }, 404);
    }
    if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401);
    return coordinator(env).fetch(new Request(`https://coordinator${url.pathname}`, request));
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(coordinator(env).fetch('https://coordinator/watchdog'));
  },
};
