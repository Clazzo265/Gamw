export interface NsimaPotState {
  phase: 'boil' | 'pour' | 'stir' | 'relish' | 'ready' | 'burnt';
  temperature: number; // 0..100 (ideal 55..82)
  waterLevel: number; // 0..100
  flourAdded: number; // 0..100
  stirProgress: number; // 0..100
  lumps: number; // 0..100 (lower is better)
  relishAdded: boolean;
  burnMeter: number; // 0..100
}

export function createInitialPotState(): NsimaPotState {
  return {
    phase: 'boil',
    temperature: 45,
    waterLevel: 20,
    flourAdded: 0,
    stirProgress: 0,
    lumps: 0,
    relishAdded: false,
    burnMeter: 0,
  };
}

export function stepPotPhysics(
  pot: NsimaPotState,
  dt: number,
  worldIndex: number,
  fanActive: boolean,
): NsimaPotState {
  if (pot.phase === 'burnt' || pot.phase === 'ready') return pot;

  const next = { ...pot };
  const volatility = 1 + (worldIndex - 1) * 0.18;

  // Stove cools slowly when not fanned, heats up when fanned
  if (fanActive) {
    next.temperature = Math.min(100, next.temperature + 24 * dt);
  } else {
    next.temperature = Math.max(20, next.temperature - 6.5 * volatility * dt);
  }

  // Overheat causes burn meter rise
  if (next.temperature > 85) {
    next.burnMeter = Math.min(100, next.burnMeter + (next.temperature - 82) * 1.15 * volatility * dt);
  } else {
    next.burnMeter = Math.max(0, next.burnMeter - 10 * dt);
  }

  if (next.burnMeter >= 100) {
    next.phase = 'burnt';
    return next;
  }

  // Phase progression checks
  if (next.phase === 'boil' && next.waterLevel >= 75 && next.temperature >= 55) {
    next.phase = 'pour';
  } else if (next.phase === 'pour' && next.flourAdded >= 100) {
    next.phase = 'stir';
  } else if (next.phase === 'stir' && next.stirProgress >= 100) {
    next.phase = 'relish';
  } else if (next.phase === 'relish' && next.relishAdded) {
    next.phase = 'ready';
  }

  return next;
}

export function applyAddWater(pot: NsimaPotState, amount = 28): NsimaPotState {
  if (pot.phase !== 'boil') return pot;
  const waterLevel = Math.min(100, pot.waterLevel + amount);
  const temperature = Math.max(25, pot.temperature - 5);
  return {
    ...pot,
    waterLevel,
    temperature,
    phase: waterLevel >= 75 && temperature >= 55 ? 'pour' : 'boil',
  };
}

export function applyPourFlour(pot: NsimaPotState, amount = 20): NsimaPotState {
  if (pot.phase !== 'pour') return pot;
  const tooCold = pot.temperature < 50;
  const tooFast = amount > 25;
  const lumpPenalty = (tooCold ? 12 : 0) + (tooFast ? 8 : 2);
  const flourAdded = Math.min(100, pot.flourAdded + amount);
  return {
    ...pot,
    flourAdded,
    lumps: Math.min(100, pot.lumps + lumpPenalty),
    phase: flourAdded >= 100 ? 'stir' : 'pour',
  };
}

export function applyStirStroke(pot: NsimaPotState, power = 18): NsimaPotState {
  if (pot.phase !== 'stir' && pot.phase !== 'pour') return pot;
  const stirProgress = Math.min(100, pot.stirProgress + power);
  const lumps = Math.max(0, pot.lumps - 9);
  return {
    ...pot,
    stirProgress,
    lumps,
    phase: pot.phase === 'stir' && stirProgress >= 100 ? 'relish' : pot.phase,
  };
}

export function evaluateOrderScore(
  pot: NsimaPotState,
  remainingPatienceRatio: number,
  comboMultiplier: number,
): number {
  if (pot.phase !== 'ready') return 0;
  const smoothnessBonus = Math.max(0, 100 - pot.lumps) * 1.8;
  const heatAccuracy = pot.temperature >= 55 && pot.temperature <= 82 ? 120 : 60;
  const speedBonus = Math.round(Math.max(0, remainingPatienceRatio) * 160);
  return Math.round((150 + smoothnessBonus + heatAccuracy + speedBonus) * comboMultiplier);
}
