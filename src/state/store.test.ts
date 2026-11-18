import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyLevelOutcome,
  calculateStarsForScore,
  computeLevelFromXp,
  createDefaultSaveData,
  isLevelUnlocked,
  purchaseCustomization,
} from './store';
import {
  applyAddWater,
  applyPourFlour,
  applyStirStroke,
  createInitialPotState,
  evaluateOrderScore,
  stepPotPhysics,
} from '../gameLogic/nsimaRules';
import {
  createInitialChipereganyuState,
  stepFinancialWeek,
} from '../gameLogic/chipereganyuRules';
import { createFighter, resolveStrike } from '../gameLogic/combatRules';
import { getLevelsForGame } from '../data/campaigns';

test('campaign has 25 levels across 5 worlds for each of the 5 games', () => {
  const games = ['nsima-rush', 'minibus-race', 'chipereganyu-box', 'zuri-vs-amara', 'malawi-adventure'] as const;
  for (const g of games) {
    const levels = getLevelsForGame(g);
    assert.equal(levels.length, 25);
    assert.equal(levels.filter((l) => l.isBoss).length, 5);
  }
});

test('XP leveling and 3-star scoring compute deterministically', () => {
  const lvl1 = computeLevelFromXp(100);
  assert.equal(lvl1.level, 1);
  const lvl2 = computeLevelFromXp(250);
  assert.equal(lvl2.level, 2);

  assert.equal(calculateStarsForScore(1000, [400, 600, 900], true), 3);
  assert.equal(calculateStarsForScore(650, [400, 600, 900], true), 2);
  assert.equal(calculateStarsForScore(200, [400, 600, 900], true), 1);
  assert.equal(calculateStarsForScore(1200, [400, 600, 900], false), 0);
});

test('winning level 1 unlocks level 2 and awards coins, XP, and first-victory achievement', () => {
  const save = createDefaultSaveData();
  assert.equal(isLevelUnlocked(save, 'nsima-rush-w1-l1'), true);
  assert.equal(isLevelUnlocked(save, 'nsima-rush-w1-l2'), false);

  const result = applyLevelOutcome(save, {
    levelId: 'nsima-rush-w1-l1',
    gameId: 'nsima-rush',
    victory: true,
    score: 1200,
    stars: 3,
    bonusAchieved: true,
    durationSec: 42,
    metrics: [{ label: 'Orders', value: '2/2' }],
  });

  assert.equal(isLevelUnlocked(result.nextSave, 'nsima-rush-w1-l2'), true);
  assert.ok(result.nextSave.coins > save.coins);
  assert.ok(result.newlyUnlockedAchievements.includes('first-victory'));
  assert.ok(result.newlyUnlockedAchievements.includes('nsima-velvet'));
});

test('customization purchase deducts coins and equips skin', () => {
  const save = { ...createDefaultSaveData(), coins: 500 };
  const updated = purchaseCustomization(save, 'chitenje-sunrise');
  assert.equal(updated.coins, 320);
  assert.equal(updated.selectedChitenjeId, 'chitenje-sunrise');
  assert.ok(updated.unlockedCustomizations.includes('chitenje-sunrise'));
});

test('Nsima Rush pot state progresses cleanly from boil -> pour -> stir -> relish -> ready', () => {
  let pot = createInitialPotState();
  pot = applyAddWater(pot, 60);
  pot = stepPotPhysics(pot, 1.0, 1, true);
  assert.equal(pot.phase, 'pour');

  for (let i = 0; i < 5; i++) pot = applyPourFlour(pot, 20);
  assert.equal(pot.phase, 'stir');

  for (let i = 0; i < 6; i++) pot = applyStirStroke(pot, 20);
  assert.equal(pot.phase, 'relish');

  pot = { ...pot, relishAdded: true };
  pot = stepPotPhysics(pot, 0.1, 1, false);
  assert.equal(pot.phase, 'ready');
  assert.ok(evaluateOrderScore(pot, 0.8, 1.5) > 400);
});

test('Chipereganyu Box savings simulation compounds group interest and tracks emergency reserve', () => {
  let state = createInitialChipereganyuState(1, 1);
  const startSavings = state.savingsBox;
  state = stepFinancialWeek(
    state,
    { savingsPct: 40, businessPct: 25, householdPct: 25, emergencyPct: 10 },
    1,
  );
  assert.ok(state.savingsBox > startSavings);
  assert.equal(state.week, 2);
});

test('Combat rules resolve hits, blocks, and dodge i-frames accurately', () => {
  const p1 = createFighter(-1.0, 1, 100);
  const p2 = createFighter(0.5, -1, 100);

  const hitRes = resolveStrike(p1, p2, 'punch');
  assert.equal(hitRes.hit, true);
  assert.equal(hitRes.damageDealt, 10);
  assert.equal(hitRes.defenderNext.hp, 90);

  const blockingP2 = { ...p2, action: 'block' as const };
  const blockRes = resolveStrike(p1, blockingP2, 'kick');
  assert.equal(blockRes.blocked, true);
  assert.ok(blockRes.damageDealt < 16);

  const dodgingP2 = { ...p2, action: 'dodge' as const };
  const dodgeRes = resolveStrike(p1, dodgingP2, 'special');
  assert.equal(dodgeRes.dodged, true);
  assert.equal(dodgeRes.damageDealt, 0);
});
