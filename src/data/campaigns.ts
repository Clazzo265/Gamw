import {
  AchievementDef,
  ChallengeDef,
  CustomizationItem,
  DifficultyTier,
  GameId,
  GameMetadata,
  LevelConfig,
} from '../types/game';

export const GAMES_METADATA: GameMetadata[] = [
  {
    id: 'nsima-rush',
    title: 'Nsima Rush',
    subtitle: 'Malawian Kitchen Mastery',
    description:
      'Command the charcoal mbawula stove, balance boiling water, pour ufa flour smoothly, and stir velvety nsima with chambo & therere relish.',
    artwork: '/src/assets/images/art_nsima_rush_1795010900178.jpg',
    accentColor: '#F5A623',
    genre: '3D Culinary Action',
    defaultDifficulty: 'Progressive',
    featuredCharacter: 'chef_chimwemwe',
    worlds: [
      'The Beginner Chef',
      'Family Kitchen',
      'Market Challenge',
      'Village Cooking Championship',
      'Master Chef Tournament',
    ],
  },
  {
    id: 'minibus-race',
    title: 'Minibus Race',
    subtitle: 'Malawi Highway Rush',
    description:
      'Drift customized minibuses from Area 25 to Mzuzu, dodge potholes and kabaza bikes, chain nitro drifts, and challenge the King of the Road.',
    artwork: '/src/assets/images/art_minibus_race_1795010901155.jpg',
    accentColor: '#0EA5E9',
    genre: '3D Arcade Racing',
    defaultDifficulty: 'High Speed',
    featuredCharacter: 'street_legend',
    worlds: [
      'Area 25',
      'Lilongwe City Centre',
      'Old Town',
      'Blantyre',
      'Mzuzu',
    ],
  },
  {
    id: 'chipereganyu-box',
    title: 'Chipereganyu Box',
    subtitle: 'Community Wealth Strategy',
    description:
      'Lead a Malawian village savings circle, grow micro-enterprises, weather unexpected shocks, and unlock collective prosperity in virtual Kwacha.',
    artwork: '/src/assets/images/art_chipereganyu_box_1795010901212.jpg',
    accentColor: '#10B981',
    genre: '3D Financial Strategy',
    defaultDifficulty: 'Tactical',
    featuredCharacter: 'savings_leader',
    worlds: [
      'First Savings',
      'Smart Spending',
      'Business Startup',
      'Unexpected Expenses',
      'Financial Champions',
    ],
  },
  {
    id: 'zuri-vs-amara',
    title: 'Zuri vs Amara',
    subtitle: 'Lake Malawi Arena Fighter',
    description:
      'Master timing, dodges, blocks, and signature combos with six stylized 3D Malawian fighters across five lakeside championship tournaments.',
    artwork: '/src/assets/images/art_zuri_vs_amara_1795010901326.jpg',
    accentColor: '#EF4444',
    genre: '3D Arena Combat',
    defaultDifficulty: 'Competitive',
    featuredCharacter: 'zuri',
    worlds: [
      'Campus Sparring Grounds',
      'Lilongwe Night Courtyard',
      'Market Queen Arena',
      'Mulanje Granite Ring',
      'Grand Lake Championship',
    ],
  },
  {
    id: 'malawi-adventure',
    title: 'Malawi Adventure',
    subtitle: 'Warm Heart Exploration',
    description:
      'Traverse Lake Malawi shores, Zomba pine forests, and Mount Mulanje peaks, leaping chasms, solving stone rune puzzles, and discovering heritage relics.',
    artwork: '/src/assets/images/art_malawi_adventure_1795010902444.jpg',
    accentColor: '#A855F7',
    genre: '3D Action Adventure',
    defaultDifficulty: 'Exploration',
    featuredCharacter: 'explorer_talandira',
    worlds: [
      'Lake Malawi',
      'Lilongwe',
      'Zomba Plateau',
      'Mount Mulanje',
      'Northern Malawi',
    ],
  },
];

const NSIMA_TITLES = [
  ['Warming the Mbawula', 'First Smooth Pot', 'Tomato & Onion Ndiwo', 'Guest at Sundown', 'Stove Apprentice Test'],
  ['Morning Porridge Rush', 'Twin Family Pots', 'Bonongwe Harvest', 'Sunday Kin Feast', 'Kitchen Matriarch Trial'],
  ['Area 23 Lunch Hour', 'Scarce Maize Flour', 'Spicy Chambo Combo', 'Flare-Up Charcoal', 'Market Stall Boss'],
  ['Village Festival Prep', 'Windy Courtyard Fire', 'Three-Order Medley', 'Golden Crust Avoid', 'Village Champion Cookoff'],
  ['Royal Pot Precision', 'Split-Second Plating', 'Ember Storm Finale', 'Banquet Endurance', 'The Master Chef'],
];

const MINIBUS_TITLES = [
  ['Area 25 Dawn Run', 'First Passengers', 'Dusty Market Curve', 'Kabaza Alley', 'Area 25 Express Boss'],
  ['Kamuzu Procession', 'Roundabout Drift', 'Midday Traffic Weave', 'Parliament Straight', 'Capital City Champion'],
  ['Old Town Cobbles', 'Spice Stall Chicane', 'River Bridge Dash', 'Tight Minibus Alley', 'Old Town Legend'],
  ['Chichiri Climb', 'Ndirande Switchbacks', 'Rain-Slick Asphalt', 'Clocktower Sprint', 'Blantyre Hill King'],
  ['Mzuzu Mist Ascent', 'Tea Estate Corners', 'Timber Truck Dodge', 'Highland Hairpins', 'The King of the Road'],
];

const CHIPEREGANYU_TITLES = [
  ['Opening the Wooden Box', 'First Harvest Deposit', 'Balancing Household Needs', 'Avoiding Impulse Traps', 'Circle Leader Audit'],
  ['Market Day Budget', 'School Fees Milestone', 'Smart Bulk Buying', 'Lean Season Stretch', 'Thrift Steward Trial'],
  ['Tomato Stall Launch', 'Maize Mill Partnership', 'Tailoring Shop Upgrade', 'Reinvesting Dividends', 'Entrepreneur Guild Boss'],
  ['Sudden Roof Repair', 'Drought Price Spike', 'Clinic Emergency Fund', 'Transport Breakdown', 'Resilience Master Test'],
  ['Cooperative Harvest', 'Solar Cold-Store Venture', 'Regional Trade Network', 'Village Endowment', 'Financial Champions'],
];

const FIGHTER_TITLES = [
  ['Scholar Warmup', 'Agility Footwork', 'Guard Breaker Drill', 'Campus Semi-Final', 'Boss: Farmer Byson'],
  ['Courtyard Ambush', 'Counter-Strike Timing', 'Combo Chain Trial', 'Boardroom Rival', 'Boss: Amara Executive'],
  ['Stall Square Brawl', 'Unpredictable Feints', 'Speed vs Power', 'Crowd Roar Clash', 'Boss: Market Queen'],
  ['Granite Footing', 'Patience & Parry', 'Highland Wind Clash', 'Ancient Kata Duel', 'Boss: Village Elder'],
  ['Lakeside Qualifiers', 'Shadow Style Mirror', 'Champions Semi-Final', 'Golden Sunset Bout', 'Boss: Street Legend'],
];

const ADVENTURE_TITLES = [
  ['Mangochi Shoreline', 'Fisherman Pier Relics', 'Cape Maclear Cove', 'Sunlit Sandbar Leap', 'Guardian of the Lake'],
  ['Lilongwe River Trail', 'Sanctuary Canopy', 'Heritage Monument', 'Capital Stone Switches', 'Spirit of the Capital'],
  ['Zomba Pine Mist', 'Williams Falls Ascent', 'Chingwe Cliff Walk', 'Plateau Rune Gate', 'Watcher of Zomba'],
  ['Mulanje Foothills', 'Cedar Valley Bridge', 'Sapitwa Mist Ridge', 'Granite Boulder Pass', 'Titan of Mulanje'],
  ['Nyika Rolling Downs', 'Livingstonia Escarpment', 'Karonga Fossil Ridge', 'Viphya Summit Path', 'Crown of Northern Malawi'],
];

function getDifficulty(worldIdx: number, levelIdx: number): DifficultyTier {
  if (levelIdx === 5) return 'BOSS';
  if (worldIdx === 1 && levelIdx <= 2) return 'BEGINNER';
  if (worldIdx === 1 || (worldIdx === 2 && levelIdx <= 2)) return 'EASY';
  if (worldIdx === 2 || worldIdx === 3) return 'INTERMEDIATE';
  if (worldIdx === 4) return 'HARD';
  return 'EXPERT';
}

function buildLevelsForGame(
  gameId: GameId,
  worlds: string[],
  titles: string[][],
  missionFactory: (worldIdx: number, levelIdx: number, isBoss: boolean) => {
    primary: string;
    bonus: string;
    tutorial?: string;
    bossName?: string;
  },
): LevelConfig[] {
  const levels: LevelConfig[] = [];
  for (let w = 1; w <= 5; w++) {
    for (let l = 1; l <= 5; l++) {
      const globalIndex = (w - 1) * 5 + l;
      const isBoss = l === 5;
      const difficulty = getDifficulty(w, l);
      const baseScore = 400 + globalIndex * 110 + (isBoss ? 300 : 0);
      const missions = missionFactory(w, l, isBoss);
      levels.push({
        id: `${gameId}-w${w}-l${l}`,
        gameId,
        worldIndex: w,
        levelIndex: l,
        globalIndex,
        worldName: worlds[w - 1],
        title: titles[w - 1][l - 1],
        difficulty,
        isBoss,
        tutorialHint: missions.tutorial,
        primaryMission: missions.primary,
        bonusMission: missions.bonus,
        targetScore: baseScore,
        starThresholds: [baseScore, Math.round(baseScore * 1.35), Math.round(baseScore * 1.75)],
        timeLimitSec: gameId === 'chipereganyu-box' ? 0 : 75 + w * 10 + (isBoss ? 25 : 0),
        rewardCoins: 60 + globalIndex * 12 + (isBoss ? 120 : 0),
        rewardXp: 80 + globalIndex * 18 + (isBoss ? 150 : 0),
        environmentTheme: worlds[w - 1],
        bossName: missions.bossName,
      });
    }
  }
  return levels;
}

export const ALL_LEVELS: Record<GameId, LevelConfig[]> = {
  'nsima-rush': buildLevelsForGame(
    'nsima-rush',
    GAMES_METADATA[0].worlds,
    NSIMA_TITLES,
    (w, l, isBoss) => ({
      tutorial:
        w === 1 && l === 1
          ? 'Fan the charcoal stove to stay in the green heat zone, add water, pour ufa smoothly without lumps, stir rhythmically, and serve with relish!'
          : undefined,
      primary: isBoss
        ? `Outcook ${w === 5 ? 'The Master Chef' : 'the World Rival'} by serving ${w + 2} flawless nsima platters`
        : `Serve ${Math.min(5, 1 + Math.ceil((w + l) / 2))} hot nsima & ndiwo orders before patience runs out`,
      bonus: 'Keep pot temperature balanced with zero burnt batches',
      bossName: isBoss ? (w === 5 ? 'The Master Chef' : `Kitchen Champion ${w}`) : undefined,
    }),
  ),
  'minibus-race': buildLevelsForGame(
    'minibus-race',
    GAMES_METADATA[1].worlds,
    MINIBUS_TITLES,
    (w, l, isBoss) => ({
      tutorial:
        w === 1 && l === 1
          ? 'Use A/D or Left/Right to steer, W/Up to accelerate, Shift/Space to drift & charge Nitro Boost. Avoid potholes and kabaza bikes!'
          : undefined,
      primary: isBoss
        ? `Defeat ${w === 5 ? 'The King of the Road' : `${GAMES_METADATA[1].worlds[w - 1]} Ace`} across 3 high-speed laps`
        : `Reach all checkpoints and finish top 2 through ${GAMES_METADATA[1].worlds[w - 1]}`,
      bonus: 'Execute 3 nitro boosts with fewer than 2 collisions',
      bossName: isBoss ? (w === 5 ? 'The King of the Road' : 'Road Rival Captain') : undefined,
    }),
  ),
  'chipereganyu-box': buildLevelsForGame(
    'chipereganyu-box',
    GAMES_METADATA[2].worlds,
    CHIPEREGANYU_TITLES,
    (w, l, isBoss) => ({
      tutorial:
        w === 1 && l === 1
          ? 'Allocate weekly income across your Chipereganyu Savings Box, Business Stock, Household Welfare, and Emergency Fund to hit the savings target!'
          : undefined,
      primary: isBoss
        ? `Reach MK ${(25000 + w * 18000).toLocaleString()} group wealth within ${6 + w} weeks`
        : `Grow savings to MK ${(12000 + (w * 5 + l) * 3500).toLocaleString()} while keeping household welfare above 60%`,
      bonus: 'Maintain an emergency reserve above 20% through every shock',
      bossName: isBoss ? `Grand Savings Audit ${w}` : undefined,
    }),
  ),
  'zuri-vs-amara': buildLevelsForGame(
    'zuri-vs-amara',
    GAMES_METADATA[3].worlds,
    FIGHTER_TITLES,
    (w, l, isBoss) => ({
      tutorial:
        w === 1 && l === 1
          ? 'Move with A/D, Punch [J], Kick [K], Block [L], Dodge [Space], and unleash Special [U] when your energy bar fills!'
          : undefined,
      primary: isBoss
        ? `Win 2 of 3 rounds against ${['Farmer Byson', 'Amara', 'Market Queen', 'Village Elder', 'Street Legend'][w - 1]}`
        : `Defeat your tournament challenger in ${GAMES_METADATA[3].worlds[w - 1]}`,
      bonus: 'Land a 4-hit combo and win a round with over 50% HP',
      bossName: isBoss
        ? ['Farmer Byson', 'Amara Executive', 'Market Queen', 'Village Elder', 'Street Legend'][w - 1]
        : undefined,
    }),
  ),
  'malawi-adventure': buildLevelsForGame(
    'malawi-adventure',
    GAMES_METADATA[4].worlds,
    ADVENTURE_TITLES,
    (w, l, isBoss) => ({
      tutorial:
        w === 1 && l === 1
          ? 'Move with WASD/Arrows, Jump with Space, and Interact [E] near Elders or Stone Runes. Collect all cultural relics to unlock the Summit Portal!'
          : undefined,
      primary: isBoss
        ? `Activate all ancient runes and claim the Sacred Relic of ${GAMES_METADATA[4].worlds[w - 1]}`
        : `Collect ${3 + w} Heritage Relics and reach the portal in ${GAMES_METADATA[4].worlds[w - 1]}`,
      bonus: 'Speak with the Regional Elder and finish with zero falls',
      bossName: isBoss ? `Guardian of ${GAMES_METADATA[4].worlds[w - 1]}` : undefined,
    }),
  ),
};

export function getLevelsForGame(gameId: GameId): LevelConfig[] {
  return ALL_LEVELS[gameId];
}

export function getLevelById(levelId: string): LevelConfig | undefined {
  for (const list of Object.values(ALL_LEVELS)) {
    const found = list.find((lvl) => lvl.id === levelId);
    if (found) return found;
  }
  return undefined;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-victory',
    title: 'Warm Heart Debut',
    description: 'Complete your very first level in any Malawi Arcade game.',
    rewardCoins: 150,
    rewardXp: 120,
    category: 'general',
  },
  {
    id: 'nsima-velvet',
    title: 'Velvet Mthiko',
    description: 'Earn 3 stars on a Nsima Rush level with zero burnt pots.',
    rewardCoins: 200,
    rewardXp: 180,
    category: 'nsima-rush',
  },
  {
    id: 'minibus-drift',
    title: 'Kamuzu Highway Drifter',
    description: 'Win a Minibus Race stage while triggering 3 nitro boosts.',
    rewardCoins: 200,
    rewardXp: 180,
    category: 'minibus-race',
  },
  {
    id: 'savings-champion',
    title: 'Village Treasurer',
    description: 'Complete a Chipereganyu Box world with emergency buffer intact.',
    rewardCoins: 220,
    rewardXp: 200,
    category: 'chipereganyu-box',
  },
  {
    id: 'arena-combo',
    title: 'Lake Shore Tactician',
    description: 'Defeat an opponent in Zuri vs Amara using a Special Move.',
    rewardCoins: 220,
    rewardXp: 200,
    category: 'zuri-vs-amara',
  },
  {
    id: 'mulanje-explorer',
    title: 'Sapitwa Pathfinder',
    description: 'Collect every heritage relic in a Malawi Adventure stage.',
    rewardCoins: 220,
    rewardXp: 200,
    category: 'malawi-adventure',
  },
  {
    id: 'star-collector-15',
    title: 'Rising Star of Lilongwe',
    description: 'Collect 15 total stars across Malawi Arcade campaigns.',
    rewardCoins: 350,
    rewardXp: 300,
    category: 'general',
  },
];

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'daily-nsima-2',
    title: 'Morning Kitchen Service',
    description: 'Complete 2 levels in Nsima Rush today.',
    cadence: 'daily',
    gameId: 'nsima-rush',
    targetCount: 2,
    rewardCoins: 180,
    rewardXp: 150,
  },
  {
    id: 'daily-race-1',
    title: 'Lilongwe Express Dash',
    description: 'Finish a Minibus Race stage in top 2.',
    cadence: 'daily',
    gameId: 'minibus-race',
    targetCount: 1,
    rewardCoins: 160,
    rewardXp: 140,
  },
  {
    id: 'daily-any-3',
    title: 'Warm Heart Tour',
    description: 'Win 3 levels across any Malawi Arcade games.',
    cadence: 'daily',
    gameId: 'any',
    targetCount: 3,
    rewardCoins: 240,
    rewardXp: 220,
  },
  {
    id: 'weekly-stars-10',
    title: 'Weekly Star Harvest',
    description: 'Earn 10 stars across all campaigns this week.',
    cadence: 'weekly',
    gameId: 'any',
    targetCount: 10,
    rewardCoins: 500,
    rewardXp: 450,
  },
  {
    id: 'weekly-boss-2',
    title: 'Champion Challenger',
    description: 'Defeat 2 World Boss stages in any game.',
    cadence: 'weekly',
    gameId: 'any',
    targetCount: 2,
    rewardCoins: 600,
    rewardXp: 550,
  },
];

export const CUSTOMIZATION_ITEMS: CustomizationItem[] = [
  {
    id: 'chitenje-lake',
    name: 'Lake Malawi Turquoise',
    category: 'chitenje',
    costCoins: 0,
    primaryColor: '#0EA5E9',
    secondaryColor: '#F5A623',
  },
  {
    id: 'chitenje-sunrise',
    name: 'Lilongwe Sunrise',
    category: 'chitenje',
    costCoins: 180,
    primaryColor: '#EA580C',
    secondaryColor: '#FACC15',
  },
  {
    id: 'chitenje-mulanje',
    name: 'Mulanje Emerald',
    category: 'chitenje',
    costCoins: 250,
    primaryColor: '#059669',
    secondaryColor: '#FDE047',
  },
  {
    id: 'chitenje-royal',
    name: 'Royal Indigo & Gold',
    category: 'chitenje',
    costCoins: 350,
    primaryColor: '#4F46E5',
    secondaryColor: '#F59E0B',
  },
  {
    id: 'minibus-express',
    name: 'Lilongwe Blue Express',
    category: 'minibus',
    costCoins: 0,
    primaryColor: '#0284C7',
    secondaryColor: '#F59E0B',
  },
  {
    id: 'minibus-blantyre',
    name: 'Blantyre Crimson Flyer',
    category: 'minibus',
    costCoins: 220,
    primaryColor: '#DC2626',
    secondaryColor: '#FDE047',
  },
  {
    id: 'minibus-mzuzu',
    name: 'Mzuzu Highland Emerald',
    category: 'minibus',
    costCoins: 320,
    primaryColor: '#059669',
    secondaryColor: '#F8FAFC',
  },
];
