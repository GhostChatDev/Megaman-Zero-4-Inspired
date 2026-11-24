const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise the game's own save and menu functions without a browser dependency.
const html = fs.readFileSync('index.html', 'utf8');
const line = prefix => {
  const result = html.split('\n').find(value => value.startsWith(prefix));
  if (!result) throw new Error(`Missing game code: ${prefix}`);
  return result;
};
const menu = html.slice(html.indexOf('function menu(){'), html.indexOf('function newCampaign(){'));
const source = [line('const defaults='), line('function cleanSave('), menu,
  line('function newCampaign('), line('function story(')].join('\n');

function openGame(storage = {}) {
  const state = { storage, panel: null };
  const context = {
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    catalog: kind => [{ key: kind === 'hero' ? 'kip' : 'cyclone' }],
    setPanel: (title, body, buttons) => { state.panel = { title, buttons }; },
    persist: () => { storage.save = JSON.stringify(context.save); },
    intro: n => { state.panel = { title: `INTRO ${n}`, buttons: [] }; },
    loadoutChips: () => '', notify: () => {}, storageOK: true,
    level: null, player: null, game: {}, storyStart: ['story'],
    escapeHTML: text => text,
    stageSelect: () => {}, shop: () => {}, help: () => {}, settingsMenu: () => {},
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  context.save = context.cleanSave(storage.save ? JSON.parse(storage.save) : null);
  state.click = label => {
    const button = state.panel.buttons.find(b => b.label.startsWith(label));
    assert.ok(button, `Button ${label} not found on ${state.panel.title}`);
    button.run();
  };
  state.openMenu = () => context.menu();
  return state;
}

test('opening story is remembered across a return to menu and refresh, but resets for a new campaign', () => {
  const storage = {};
  let game = openGame(storage);
  game.openMenu();
  game.click('PLAY');
  assert.match(game.panel.title, /^TRANSMISSION/);
  game.click('SKIP');
  assert.equal(game.panel.title, 'INTRO 1');
  game.openMenu();
  game.click('PLAY');
  assert.equal(game.panel.title, 'INTRO 1');
  game = openGame(storage);
  game.openMenu();
  game.click('PLAY');
  assert.equal(game.panel.title, 'INTRO 1');
  game.openMenu();
  game.click('NEW CAMPAIGN');
  game.click('BEGIN');
  assert.match(game.panel.title, /^TRANSMISSION/);
  game.click('DEPLOY');
  game = openGame(storage);
  game.openMenu();
  game.click('PLAY');
  assert.equal(game.panel.title, 'INTRO 1');
});

test('existing campaigns with cleared stages continue without replaying the introduction', () => {
  const storage = { save: JSON.stringify({ version: 2, unlocked: 2, stage: 2, cleared: [1] }) };
  const game = openGame(storage);
  game.openMenu();
  game.click('CONTINUE');
  assert.equal(game.panel.title, 'INTRO 2');
});
