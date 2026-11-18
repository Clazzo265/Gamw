export interface FinancialAllocation {
  savingsPct: number; // Chipereganyu Box
  businessPct: number; // Micro-enterprise stock
  householdPct: number; // Food, school, health
  emergencyPct: number; // Buffer reserve
}

export interface FinancialEvent {
  id: string;
  title: string;
  description: string;
  speaker: 'Savings Leader' | 'Farmer' | 'Market Seller' | 'Young Entrepreneur' | 'Family Member';
  shockCost: number;
  businessBonusMultiplier: number;
  welfareImpact: number;
}

export interface ChipereganyuState {
  week: number;
  maxWeeks: number;
  cashOnHand: number;
  savingsBox: number;
  emergencyReserve: number;
  businessCapital: number;
  householdWelfare: number; // 0..100
  targetSavings: number;
  weeklyIncome: number;
  minReservePctObserved: number;
  currentEvent: FinancialEvent;
  history: string[];
  status: 'playing' | 'won' | 'lost';
}

const FINANCIAL_EVENTS: FinancialEvent[] = [
  {
    id: 'harvest-boom',
    title: 'Peak Market Harvest',
    description: 'Fresh tomatoes and groundnuts are in high demand at Area 23 Market.',
    speaker: 'Market Seller',
    shockCost: 0,
    businessBonusMultiplier: 1.45,
    welfareImpact: 4,
  },
  {
    id: 'roof-repair',
    title: 'Rains Damaged the Roof',
    description: 'Heavy seasonal rains require urgent corrugated iron repairs.',
    speaker: 'Family Member',
    shockCost: 3500,
    businessBonusMultiplier: 1.0,
    welfareImpact: -8,
  },
  {
    id: 'group-dividend',
    title: 'Chipereganyu Dividend Week',
    description: 'The village savings circle distributes shared interest to loyal savers.',
    speaker: 'Savings Leader',
    shockCost: 0,
    businessBonusMultiplier: 1.2,
    welfareImpact: 6,
  },
  {
    id: 'fertilizer-rise',
    title: 'Farm Input Price Spike',
    description: 'Transport costs raised maize seed and fertilizer prices this week.',
    speaker: 'Farmer',
    shockCost: 2600,
    businessBonusMultiplier: 0.9,
    welfareImpact: -5,
  },
  {
    id: 'solar-fridge',
    title: 'Village Cold-Store Co-op',
    description: 'Pooling capital with young entrepreneurs cuts spoilage in half.',
    speaker: 'Young Entrepreneur',
    shockCost: 1200,
    businessBonusMultiplier: 1.55,
    welfareImpact: 5,
  },
];

export function getEventForWeek(worldIndex: number, week: number): FinancialEvent {
  const idx = (worldIndex + week) % FINANCIAL_EVENTS.length;
  const base = FINANCIAL_EVENTS[idx];
  return {
    ...base,
    shockCost: Math.round(base.shockCost * (0.75 + worldIndex * 0.3)),
  };
}

export function createInitialChipereganyuState(worldIndex: number, levelIndex: number): ChipereganyuState {
  const maxWeeks = 6 + worldIndex;
  const targetSavings =
    levelIndex === 5 ? 25000 + worldIndex * 18000 : 12000 + (worldIndex * 5 + levelIndex) * 3500;
  const weeklyIncome = 5500 + worldIndex * 1800;
  return {
    week: 1,
    maxWeeks,
    cashOnHand: weeklyIncome,
    savingsBox: 2000,
    emergencyReserve: 1500,
    businessCapital: 1500,
    householdWelfare: 80,
    targetSavings,
    weeklyIncome,
    minReservePctObserved: 100,
    currentEvent: getEventForWeek(worldIndex, 1),
    history: ['Opened the wooden Chipereganyu cash box with the community circle.'],
    status: 'playing',
  };
}

export function stepFinancialWeek(
  state: ChipereganyuState,
  alloc: FinancialAllocation,
  worldIndex: number,
): ChipereganyuState {
  if (state.status !== 'playing') return state;

  const totalPct = alloc.savingsPct + alloc.businessPct + alloc.householdPct + alloc.emergencyPct;
  const norm = totalPct > 0 ? 100 / totalPct : 1;

  const budget = state.cashOnHand;
  const toSavings = Math.round(budget * (alloc.savingsPct * norm) * 0.01);
  const toBusiness = Math.round(budget * (alloc.businessPct * norm) * 0.01);
  const toHousehold = Math.round(budget * (alloc.householdPct * norm) * 0.01);
  const toEmergency = Math.max(0, budget - toSavings - toBusiness - toHousehold);

  const event = state.currentEvent;

  // Chipereganyu compound interest (10% - 16% depending on world)
  const groupInterest = Math.round((state.savingsBox + toSavings) * 0.12);
  let nextSavings = state.savingsBox + toSavings + groupInterest;
  let nextEmergency = state.emergencyReserve + toEmergency;
  const nextBusiness = Math.round((state.businessCapital + toBusiness) * 0.45 * event.businessBonusMultiplier);
  const businessProfit = Math.round((state.businessCapital + toBusiness) * 0.35 * event.businessBonusMultiplier);

  // Pay shock out of emergency reserve first, then savings if short
  let welfarePenalty = 0;
  if (event.shockCost > 0) {
    if (nextEmergency >= event.shockCost) {
      nextEmergency -= event.shockCost;
    } else {
      const shortfall = event.shockCost - nextEmergency;
      nextEmergency = 0;
      nextSavings = Math.max(0, nextSavings - shortfall);
      welfarePenalty = -10;
    }
  }

  // Household welfare calculation
  const householdTarget = Math.round(state.weeklyIncome * 0.25);
  const householdDelta =
    toHousehold >= householdTarget
      ? 8
      : toHousehold >= householdTarget * 0.5
        ? -4
        : -16;

  const nextWelfare = Math.max(
    0,
    Math.min(100, state.householdWelfare + householdDelta + event.welfareImpact + welfarePenalty),
  );

  const totalWealth = nextSavings + nextEmergency;
  const reserveRatio = totalWealth > 0 ? Math.round((nextEmergency / totalWealth) * 100) : 0;
  const minReservePctObserved = Math.min(state.minReservePctObserved, reserveRatio);

  const nextWeek = state.week + 1;
  const nextIncome = state.weeklyIncome + businessProfit;

  let status: ChipereganyuState['status'] = 'playing';
  if (nextWelfare <= 15) {
    status = 'lost';
  } else if (nextWeek > state.maxWeeks) {
    status = nextSavings >= state.targetSavings && nextWelfare >= 55 ? 'won' : 'lost';
  }

  const logEntry = `Wk ${state.week}: Saved MK ${toSavings.toLocaleString()} (+MK ${groupInterest.toLocaleString()} div) · Business Profit MK ${businessProfit.toLocaleString()}`;

  return {
    ...state,
    week: Math.min(state.maxWeeks, nextWeek),
    cashOnHand: nextIncome,
    savingsBox: nextSavings,
    emergencyReserve: nextEmergency,
    businessCapital: nextBusiness,
    householdWelfare: nextWelfare,
    minReservePctObserved,
    currentEvent: getEventForWeek(worldIndex, nextWeek),
    history: [logEntry, ...state.history].slice(0, 5),
    status,
  };
}
