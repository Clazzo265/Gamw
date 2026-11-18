export type AttackType = 'punch' | 'kick' | 'special';

export interface FighterState {
  x: number;
  vx: number;
  hp: number;
  maxHp: number;
  energy: number; // 0..100 for Special
  facing: 1 | -1;
  action: 'idle' | 'walk' | 'punch' | 'kick' | 'block' | 'dodge' | 'special' | 'hit' | 'ko' | 'victory';
  actionTimer: number;
  actionDuration: number;
  hitDealtThisAttack: boolean;
  comboCount: number;
  maxCombo: number;
}

export function createFighter(x: number, facing: 1 | -1, maxHp = 100): FighterState {
  return {
    x,
    vx: 0,
    hp: maxHp,
    maxHp,
    energy: 30,
    facing,
    action: 'idle',
    actionTimer: 0,
    actionDuration: 0,
    hitDealtThisAttack: false,
    comboCount: 0,
    maxCombo: 0,
  };
}

export function getAttackSpec(type: AttackType): {
  damage: number;
  range: number;
  windup: number;
  duration: number;
  knockback: number;
  energyGain: number;
} {
  switch (type) {
    case 'punch':
      return { damage: 10, range: 1.85, windup: 0.08, duration: 0.28, knockback: 1.6, energyGain: 14 };
    case 'kick':
      return { damage: 16, range: 2.25, windup: 0.14, duration: 0.42, knockback: 3.1, energyGain: 20 };
    case 'special':
      return { damage: 28, range: 2.8, windup: 0.16, duration: 0.56, knockback: 4.8, energyGain: 0 };
  }
}

export function resolveStrike(
  attacker: FighterState,
  defender: FighterState,
  type: AttackType,
): {
  hit: boolean;
  blocked: boolean;
  dodged: boolean;
  damageDealt: number;
  attackerNext: FighterState;
  defenderNext: FighterState;
} {
  const spec = getAttackSpec(type);
  const dist = Math.abs(attacker.x - defender.x);
  const facingTarget =
    (attacker.facing === 1 && defender.x >= attacker.x - 0.3) ||
    (attacker.facing === -1 && defender.x <= attacker.x + 0.3);

  if (dist > spec.range || !facingTarget) {
    return {
      hit: false,
      blocked: false,
      dodged: false,
      damageDealt: 0,
      attackerNext: { ...attacker, hitDealtThisAttack: true },
      defenderNext: defender,
    };
  }

  // Dodge grants i-frames during active window
  if (defender.action === 'dodge') {
    return {
      hit: false,
      blocked: false,
      dodged: true,
      damageDealt: 0,
      attackerNext: { ...attacker, hitDealtThisAttack: true, comboCount: 0 },
      defenderNext: { ...defender, energy: Math.min(100, defender.energy + 12) },
    };
  }

  const isBlocking = defender.action === 'block';
  const comboBonus = 1 + Math.min(0.45, attacker.comboCount * 0.1);
  const rawDamage = Math.round(spec.damage * comboBonus);
  const damageDealt = isBlocking ? Math.max(2, Math.round(rawDamage * 0.22)) : rawDamage;

  const nextHp = Math.max(0, defender.hp - damageDealt);
  const nextCombo = isBlocking ? 0 : attacker.comboCount + 1;

  return {
    hit: !isBlocking,
    blocked: isBlocking,
    dodged: false,
    damageDealt,
    attackerNext: {
      ...attacker,
      hitDealtThisAttack: true,
      energy: Math.min(100, attacker.energy + spec.energyGain),
      comboCount: nextCombo,
      maxCombo: Math.max(attacker.maxCombo, nextCombo),
    },
    defenderNext: {
      ...defender,
      hp: nextHp,
      vx: attacker.facing * (isBlocking ? spec.knockback * 0.35 : spec.knockback),
      action: nextHp <= 0 ? 'ko' : isBlocking ? 'block' : 'hit',
      actionTimer: 0,
      actionDuration: nextHp <= 0 ? 1.2 : isBlocking ? 0.18 : 0.24,
      energy: Math.min(100, defender.energy + (isBlocking ? 10 : 6)),
      comboCount: 0,
    },
  };
}
