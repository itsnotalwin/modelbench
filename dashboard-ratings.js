/* Device-local ratings. This script neither fetches nor uploads data. */
(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DashboardRatings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const KEY = 'modelbench.ratings.v1';
  const AXES = Object.freeze(['completeness', 'robustness', 'craft', 'depth', 'originality', 'performance']);
  const success = (value) => ({ ok: true, value });
  const failure = (error) => ({ ok: false, error });
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const hasKeys = (value, keys) => object(value) && Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
  const validSlug = (slug) => typeof slug === 'string' && slug.trim().length > 0;
  const validScores = (scores) => hasKeys(scores, AXES) && AXES.every((axis) => {
    const value = scores[axis];
    return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5);
  });
  function validData(data) {
    if (!hasKeys(data, ['version', 'ratings']) || data.version !== 1 || !Array.isArray(data.ratings)) return false;
    const seen = new Set();
    for (const item of data.ratings) {
      if (!hasKeys(item, ['slug', 'scores']) || !validSlug(item.slug) || !validScores(item.scores) || seen.has(item.slug)) return false;
      seen.add(item.slug);
    }
    return true;
  }

  function createStore(storage) {
    function getStorage() { return storage === undefined ? root.localStorage : storage; }
    function read() {
      let raw;
      try { raw = getStorage().getItem(KEY); }
      catch (_) { return failure('storage-unavailable'); }
      if (raw === null) return success({ version: 1, ratings: [] });
      try {
        const data = JSON.parse(raw);
        return validData(data) ? success(data) : failure('malformed-data');
      } catch (_) { return failure('malformed-data'); }
    }
    function write(data) {
      try { getStorage().setItem(KEY, JSON.stringify(data)); return { ok: true }; }
      catch (_) { return failure('storage-unavailable'); }
    }
    return {
      load(slug) {
        if (!validSlug(slug)) return failure('invalid-slug');
        const result = read();
        if (!result.ok) return result;
        const entry = result.value.ratings.find((item) => item.slug === slug);
        return success(entry ? entry.scores : null);
      },
      save(slug, scores) {
        if (!validSlug(slug)) return failure('invalid-slug');
        let snapshot;
        try {
          if (!hasKeys(scores, AXES)) return failure('invalid-scores');
          snapshot = Object.fromEntries(AXES.map((axis) => [axis, scores[axis]]));
          if (!validScores(snapshot)) return failure('invalid-scores');
        } catch (_) { return failure('invalid-scores'); }
        const result = read();
        if (!result.ok) return result;
        const ratings = result.value.ratings.filter((item) => item.slug !== slug);
        ratings.push({ slug, scores: snapshot });
        return write({ version: 1, ratings });
      },
      delete(slug) {
        if (!validSlug(slug)) return failure('invalid-slug');
        const result = read();
        if (!result.ok) return result;
        return write({ version: 1, ratings: result.value.ratings.filter((item) => item.slug !== slug) });
      },
      exportJSON() {
        const result = read();
        return result.ok ? success(JSON.stringify(result.value, null, 2)) : result;
      },
      importJSON(text) {
        let data;
        try {
          if (typeof text !== 'string') return failure('invalid-import');
          data = JSON.parse(text);
          if (!validData(data)) return failure('invalid-import');
        } catch (_) { return failure('invalid-import'); }
        const result = read();
        if (!result.ok) return result;
        const incoming = new Set(data.ratings.map((item) => item.slug));
        const ratings = result.value.ratings.filter((item) => !incoming.has(item.slug)).concat(data.ratings);
        const saved = write({ version: 1, ratings });
        return saved.ok ? success({ imported: data.ratings.length }) : saved;
      },
    };
  }
  return Object.freeze({ KEY, AXES, createStore });
});
