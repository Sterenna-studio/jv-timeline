import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const games = JSON.parse(readFileSync(new URL('../public/data/games_2016.json', import.meta.url)));

test('catalogue: dates 2016 valides, titres uniques par date et liens HTTPS', () => {
  assert.ok(games.length > 0);
  const keys = new Set();
  for (const game of games) {
    assert.match(game.d, /^2016-\d{2}-\d{2}$/);
    assert.equal(new Date(game.d).toISOString().slice(0, 10), game.d);
    assert.equal(typeof game.t, 'string');
    assert.ok(game.t.trim());
    assert.ok(Array.isArray(game.p) && Array.isArray(game.g));
    const key = `${game.d}:${game.t}`;
    assert.ok(!keys.has(key), key);
    keys.add(key);
    if (game.steam_appid) assert.ok(Number.isInteger(game.steam_appid) && game.steam_appid > 0);
    if (game.steam_url) assert.equal(new URL(game.steam_url).protocol, 'https:');
  }
});

test('le JavaScript de la page compile', () => {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  new vm.Script(scripts[0][1]);
});

test('la projection reste sur 2016 apres 2026, y compris le 29 fevrier', () => {
  const projection = html.match(/const timelineNow=([^;]+);/)[1];
  for (const date of [[2027, 0, 15], [2028, 1, 29], [2030, 11, 31]]) {
    const realNow = new Date(...date);
    const projected = vm.runInNewContext(projection, { realNow, Date });
    assert.equal(projected.getFullYear(), 2016);
    assert.equal(projected.getMonth(), realNow.getMonth());
    assert.equal(projected.getDate(), realNow.getDate());
  }
});
