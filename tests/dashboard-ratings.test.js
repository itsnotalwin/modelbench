'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'dashboard-ratings.js');
function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
  };
}

const scores = { completeness: 0, robustness: 2.5, craft: null, depth: 5, originality: 1, performance: null };

test('save, load and delete a rating by the exact run slug', () => {
  assert.ok(fs.existsSync(modulePath), 'dashboard-ratings.js must exist');
  const api = require(modulePath);
  const store = api.createStore(memoryStorage());
  assert.deepEqual(store.load('Run'), { ok: true, value: null });
  assert.deepEqual(store.save('Run', scores), { ok: true });
  assert.deepEqual(store.load('Run'), { ok: true, value: scores });
  assert.deepEqual(store.load('run'), { ok: true, value: null });
  assert.deepEqual(store.delete('Run'), { ok: true });
  assert.deepEqual(store.load('Run'), { ok: true, value: null });
});

test('rejects invalid slugs and score objects without changing stored ratings', () => {
  const api = require(modulePath);
  const store = api.createStore(memoryStorage());
  assert.deepEqual(store.save('valid', scores), { ok: true });
  for (const slug of ['', '  ', null, 1]) {
    assert.deepEqual(store.save(slug, scores), { ok: false, error: 'invalid-slug' });
    assert.deepEqual(store.load(slug), { ok: false, error: 'invalid-slug' });
    assert.deepEqual(store.delete(slug), { ok: false, error: 'invalid-slug' });
  }
  for (const bad of [null, {}, { ...scores, craft: -1 }, { ...scores, craft: 5.01 },
    { ...scores, craft: NaN }, { ...scores, craft: Infinity }, { ...scores, craft: '3' },
    { ...scores, craft: undefined }, { ...scores, unknown: 3 }]) {
    assert.deepEqual(store.save('valid', bad), { ok: false, error: 'invalid-scores' });
  }
  assert.deepEqual(store.load('valid'), { ok: true, value: scores });
});

test('refuses malformed stored data without overwriting it', () => {
  const api = require(modulePath);
  for (const raw of ['{', 'null', '{}', '{"version":1,"ratings":[{"slug":"x","scores":{}}]}']) {
    const storage = memoryStorage();
    storage.setItem(api.KEY, raw);
    const store = api.createStore(storage);
    assert.deepEqual(store.load('x'), { ok: false, error: 'malformed-data' });
    assert.deepEqual(store.save('x', scores), { ok: false, error: 'malformed-data' });
    assert.deepEqual(store.delete('x'), { ok: false, error: 'malformed-data' });
    assert.equal(storage.getItem(api.KEY), raw);
  }
});

test('reports unavailable or failing storage without throwing', () => {
  const api = require(modulePath);
  for (const storage of [null, { getItem() { throw Error('denied'); } },
    { getItem() { return null; }, setItem() { throw Error('quota'); } }]) {
    const store = api.createStore(storage);
    assert.deepEqual(store.save('run', scores), { ok: false, error: 'storage-unavailable' });
  }
});

test('preserves exact and special-property slugs independently', () => {
  const store = require(modulePath).createStore(memoryStorage());
  for (const slug of ['__proto__', 'constructor', 'Run ', 'Run']) {
    assert.deepEqual(store.save(slug, scores), { ok: true });
  }
  for (const slug of ['__proto__', 'constructor', 'Run ', 'Run']) {
    assert.deepEqual(store.load(slug), { ok: true, value: scores });
  }
  assert.deepEqual(store.delete('Run'), { ok: true });
  assert.deepEqual(store.load('Run '), { ok: true, value: scores });
});

test('exports portable JSON and imports by merging exact slugs', () => {
  const api = require(modulePath);
  const source = api.createStore(memoryStorage());
  source.save('Run', scores);
  source.save('__proto__', { ...scores, craft: 5 });
  const exported = source.exportJSON();
  assert.equal(exported.ok, true);
  assert.deepEqual(JSON.parse(exported.value), { version: 1, ratings: [
    { slug: 'Run', scores }, { slug: '__proto__', scores: { ...scores, craft: 5 } },
  ] });
  const dest = api.createStore(memoryStorage());
  dest.save('Run', { ...scores, depth: 0 });
  dest.save('run', scores);
  assert.deepEqual(dest.importJSON(exported.value), { ok: true, value: { imported: 2 } });
  assert.deepEqual(dest.load('Run'), { ok: true, value: scores });
  assert.deepEqual(dest.load('run'), { ok: true, value: scores });
  assert.deepEqual(dest.load('__proto__'), { ok: true, value: { ...scores, craft: 5 } });
});

test('rejects invalid imports atomically and preserves existing data', () => {
  const api = require(modulePath);
  const storage = memoryStorage();
  const store = api.createStore(storage);
  store.save('existing', scores);
  const before = storage.getItem(api.KEY);
  const item = { slug: 'x', scores };
  const bad = ['{', 'null', 123, JSON.stringify({ version: 2, ratings: [item] }),
    JSON.stringify({ version: 1, ratings: [item, item] }),
    JSON.stringify({ version: 1, ratings: [item, { slug: 'y', scores: { ...scores, craft: 8 } }] }),
    JSON.stringify({ version: 1, ratings: [item], extra: 1 })];
  for (const text of bad) {
    assert.deepEqual(store.importJSON(text), { ok: false, error: 'invalid-import' });
    assert.equal(storage.getItem(api.KEY), before);
  }
});

test('import and export surface storage failures and refuse malformed saved data', () => {
  const api = require(modulePath);
  const store = api.createStore(null);
  assert.deepEqual(store.exportJSON(), { ok: false, error: 'storage-unavailable' });
  assert.deepEqual(store.importJSON('{"version":1,"ratings":[]}'), { ok: false, error: 'storage-unavailable' });
  const storage = memoryStorage();
  storage.setItem(api.KEY, 'broken');
  const corrupt = api.createStore(storage);
  assert.deepEqual(corrupt.exportJSON(), { ok: false, error: 'malformed-data' });
  assert.deepEqual(corrupt.importJSON('{"version":1,"ratings":[]}'), { ok: false, error: 'malformed-data' });
  assert.equal(storage.getItem(api.KEY), 'broken');
});

test('browser script exposes a global and handles denied localStorage getters', () => {
  const sandbox = {};
  Object.defineProperty(sandbox, 'localStorage', { get() { throw Error('denied'); } });
  vm.runInNewContext(fs.readFileSync(modulePath, 'utf8'), sandbox);
  assert.equal(typeof sandbox.DashboardRatings.createStore, 'function');
  const result = sandbox.DashboardRatings.createStore().load('run');
  assert.equal(result.ok, false);
  assert.equal(result.error, 'storage-unavailable');
});

test('browser default storage persists ratings', () => {
  const sandbox = { localStorage: memoryStorage() };
  vm.runInNewContext(fs.readFileSync(modulePath, 'utf8'), sandbox);
  const store = sandbox.DashboardRatings.createStore();
  assert.equal(store.save('Run', scores).ok, true);
  assert.equal(store.load('Run').value.completeness, 0);
  assert.equal(store.load('Run').value.craft, null);
});

test('score serialization cannot be changed by inherited toJSON', () => {
  const store = require(modulePath).createStore(memoryStorage());
  const input = Object.assign(Object.create({ toJSON() { return 'bad'; } }), scores);
  assert.deepEqual(store.save('run', input), { ok: true });
  assert.deepEqual(store.load('run'), { ok: true, value: scores });
});

test('failed import writes leave previous ratings intact', () => {
  const api = require(modulePath);
  const storage = memoryStorage();
  const store = api.createStore(storage);
  store.save('existing', scores);
  const before = storage.getItem(api.KEY);
  storage.setItem = () => { throw Error('quota'); };
  const data = JSON.stringify({ version: 1, ratings: [{ slug: 'new', scores }] });
  assert.deepEqual(store.importJSON(data), { ok: false, error: 'storage-unavailable' });
  assert.equal(storage.getItem(api.KEY), before);
});
