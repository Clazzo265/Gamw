import {
  ACHIEVEMENTS,
  CHALLENGES,
  CUSTOMIZATION_ITEMS,
  getLevelById,
  getLevelsForGame,
} from '../data/campaigns';
import {
  CharacterId,
  GameId,
  LevelOutcome,
  PlayerSaveData,
  PlayerSettings,
} from '../types/game';

const STORAGE_KEY = 'malawi_arcade_save_v1';

export function xpRequiredForLevel(level: number): number {
  return 200 + (level - 1) * 140;
}

export function computeLevelFromXp(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
} {
  let remaining = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (remaining >= xpRequiredForLevel(level)) {
    remaining -= xpRequiredForLevel(level);
    level++;
  }
  return {
    level,
    currentLevelXp: remaining,
    nextLevelXp: xpRequiredForLevel(level),
  };
}

export function calculateStarsForScore(
  score: number,
  thresholds: [number, number, number],
  victory: boolean,
): number {
  if (!victory) return 0;
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  return 1;
}

export function isLevelUnlocked(save: PlayerSaveData, levelId: string): boolean {
  const level = getLevelById(levelId);
  if (!level) return false;
  if (level.globalIndex === 1) return true;
  const allGameLevels = getLevelsForGame(level.gameId);
  const prev = allGameLevels.find((l) => l.globalIndex === level.globalIndex - 1);
  if (!prev) return true;
  return Boolean(save.levelProgress[prev.id]?.completed);
}

export function getNextPlayableLevelId(save: PlayerSaveData, gameId: GameId): string {
  const levels = getLevelsForGame(gameId);
  for (const lvl of levels) {
    if (!save.levelProgress[lvl.id]?.completed && isLevelUnlocked(save, lvl.id)) {
      return lvl.id;
    }
  }
  return levels[levels.length - 1].id;
}

export function getGameCompletionSummary(save: PlayerSaveData, gameId: GameId): {
  completedCount: number;
  totalLevels: number;
  starsEarned: number;
  maxStars: number;
  bestScore: number;
} {
  const levels = getLevelsForGame(gameId);
  let completedCount = 0;
  let starsEarned = 0;
  let bestScore = 0;
  for (const lvl of levels) {
    const p = save.levelProgress[lvl.id];
    if (p) {
      if (p.completed) completedCount++;
      starsEarned += p.stars;
      if (p.bestScore > bestScore) bestScore = p.bestScore;
    }
  }
  return {
    completedCount,
    totalLevels: levels.length,
    starsEarned,
    maxStars: levels.length * 3,
    bestScore,
  };
}

export function createDefaultSaveData(): PlayerSaveData {
  return {
    playerName: 'Malawi Champion',
    selectedAvatar: 'chef_chimwemwe',
    selectedChitenjeId: 'chitenje-lake',
    selectedMinibusId: 'minibus-express',
    xp: 120,
    level: 1,
    coins: 350,
    totalStars: 0,
    unlockedCharacters: ['chef_chimwemwe', 'zuri', 'amara', 'explorer_talandira', 'savings_leader'],
    unlockedCustomizations: ['chitenje-lake', 'minibus-express'],
    levelProgress: {},
    unlockedAchievements: [],
    challengeProgress: {},
    claimedChallenges: [],
    lastPlayedGame: 'nsima-rush',
    lastPlayedLevelId: 'nsima-rush-w1-l1',
    settings: {
      musicEnabled: true,
      sfxEnabled: true,
      hapticsEnabled: true,
      graphicsQuality: 'MEDIUM',
    },
  };
}

export function applyLevelOutcome(
  save: PlayerSaveData,
  outcome: LevelOutcome,
): {
  nextSave: PlayerSaveData;
  newlyUnlockedAchievements: string[];
  coinsEarned: number;
  xpEarned: number;
} {
  const levelCfg = getLevelById(outcome.levelId);
  if (!levelCfg) {
    return { nextSave: save, newlyUnlockedAchievements: [], coinsEarned: 0, xpEarned: 0 };
  }

  const prev = save.levelProgress[outcome.levelId];
  const stars = outcome.victory
    ? Math.max(outcome.stars, calculateStarsForScore(outcome.score, levelCfg.starThresholds, true))
    : 0;

  let coinsEarned = 0;
  let xpEarned = 0;

  if (outcome.victory) {
    const firstClear = !prev?.completed;
    const starDiff = Math.max(0, stars - (prev?.stars ?? 0));
    coinsEarned = firstClear ? levelCfg.rewardCoins : Math.round(levelCfg.rewardCoins * 0.3) + starDiff * 35;
    xpEarned = firstClear ? levelCfg.rewardXp : Math.round(levelCfg.rewardXp * 0.35) + starDiff * 40;
    if (outcome.bonusAchieved && !prev?.bonusAchieved) {
      coinsEarned += 50;
      xpEarned += 60;
    }
  } else {
    // Effort XP/coins on defeat
    coinsEarned = 15;
    xpEarned = 25;
  }

  const updatedProgress = {
    ...save.levelProgress,
    [outcome.levelId]: {
      stars: Math.max(prev?.stars ?? 0, stars),
      bestScore: Math.max(prev?.bestScore ?? 0, outcome.score),
      completed: Boolean(prev?.completed || outcome.victory),
      bonusAchieved: Boolean(prev?.bonusAchieved || (outcome.victory && outcome.bonusAchieved)),
    },
  };

  let totalStars = 0;
  for (const entry of Object.values(updatedProgress)) {
    totalStars += entry.stars;
  }

  // Update challenge counters
  const challengeProgress = { ...save.challengeProgress };
  if (outcome.victory) {
    challengeProgress['daily-any-3'] = (challengeProgress['daily-any-3'] ?? 0) + 1;
    if (outcome.gameId === 'nsima-rush') {
      challengeProgress['daily-nsima-2'] = (challengeProgress['daily-nsima-2'] ?? 0) + 1;
    }
    if (outcome.gameId === 'minibus-race') {
      challengeProgress['daily-race-1'] = (challengeProgress['daily-race-1'] ?? 0) + 1;
    }
    if (levelCfg.isBoss) {
      challengeProgress['weekly-boss-2'] = (challengeProgress['weekly-boss-2'] ?? 0) + 1;
    }
    challengeProgress['weekly-stars-10'] = totalStars;
  }

  // Unlock additional characters on milestones
  const unlockedCharacters = [...save.unlockedCharacters];
  const ensureChar = (id: CharacterId) => {
    if (!unlockedCharacters.includes(id)) unlockedCharacters.push(id);
  };
  if (outcome.victory) {
    if (outcome.gameId === 'zuri-vs-amara') ensureChar('farmer_byson');
    if (outcome.gameId === 'minibus-race') ensureChar('street_legend');
    if (totalStars >= 5) ensureChar('market_queen');
    if (totalStars >= 10) ensureChar('village_elder');
  }

  // Check achievements
  const newlyUnlockedAchievements: string[] = [];
  const unlockedAchievements = [...save.unlockedAchievements];
  const tryUnlock = (achId: string) => {
    if (!unlockedAchievements.includes(achId)) {
      unlockedAchievements.push(achId);
      newlyUnlockedAchievements.push(achId);
      const def = ACHIEVEMENTS.find((a) => a.id === achId);
      if (def) {
        coinsEarned += def.rewardCoins;
        xpEarned += def.rewardXp;
      }
    }
  };

  if (outcome.victory) {
    tryUnlock('first-victory');
    if (outcome.gameId === 'nsima-rush' && stars === 3 && outcome.bonusAchieved) {
      tryUnlock('nsima-velvet');
    }
    if (outcome.gameId === 'minibus-race' && outcome.bonusAchieved) {
      tryUnlock('minibus-drift');
    }
    if (outcome.gameId === 'chipereganyu-box' && outcome.bonusAchieved) {
      tryUnlock('savings-champion');
    }
    if (outcome.gameId === 'zuri-vs-amara' && outcome.bonusAchieved) {
      tryUnlock('arena-combo');
    }
    if (outcome.gameId === 'malawi-adventure' && outcome.bonusAchieved) {
      tryUnlock('mulanje-explorer');
    }
    if (totalStars >= 15) {
      tryUnlock('star-collector-15');
    }
  }

  const nextXp = save.xp + xpEarned;
  const levelInfo = computeLevelFromXp(nextXp);

  const nextSave: PlayerSaveData = {
    ...save,
    xp: nextXp,
    level: levelInfo.level,
    coins: save.coins + coinsEarned,
    totalStars,
    unlockedCharacters,
    levelProgress: updatedProgress,
    unlockedAchievements,
    challengeProgress,
    lastPlayedGame: outcome.gameId,
    lastPlayedLevelId: outcome.levelId,
  };

  return {
    nextSave,
    newlyUnlockedAchievements,
    coinsEarned,
    xpEarned,
  };
}

export function claimChallengeReward(save: PlayerSaveData, challengeId: string): PlayerSaveData {
  if (save.claimedChallenges.includes(challengeId)) return save;
  const def = CHALLENGES.find((c) => c.id === challengeId);
  if (!def) return save;
  const progress = save.challengeProgress[challengeId] ?? 0;
  if (progress < def.targetCount) return save;
  const nextXp = save.xp + def.rewardXp;
  const levelInfo = computeLevelFromXp(nextXp);
  return {
    ...save,
    coins: save.coins + def.rewardCoins,
    xp: nextXp,
    level: levelInfo.level,
    claimedChallenges: [...save.claimedChallenges, challengeId],
  };
}

export function purchaseCustomization(save: PlayerSaveData, itemId: string): PlayerSaveData {
  const item = CUSTOMIZATION_ITEMS.find((i) => i.id === itemId);
  if (!item) return save;
  if (save.unlockedCustomizations.includes(itemId)) {
    return {
      ...save,
      selectedChitenjeId: item.category === 'chitenje' ? item.id : save.selectedChitenjeId,
      selectedMinibusId: item.category === 'minibus' ? item.id : save.selectedMinibusId,
    };
  }
  if (save.coins < item.costCoins) return save;
  return {
    ...save,
    coins: save.coins - item.costCoins,
    unlockedCustomizations: [...save.unlockedCustomizations, item.id],
    selectedChitenjeId: item.category === 'chitenje' ? item.id : save.selectedChitenjeId,
    selectedMinibusId: item.category === 'minibus' ? item.id : save.selectedMinibusId,
  };
}

export function updateSettings(save: PlayerSaveData, partial: Partial<PlayerSettings>): PlayerSaveData {
  return {
    ...save,
    settings: {
      ...save.settings,
      ...partial,
    },
  };
}

export function loadSaveData(): PlayerSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSaveData();
    const parsed = JSON.parse(raw) as Partial<PlayerSaveData>;
    const defaults = createDefaultSaveData();
    return {
      ...defaults,
      ...parsed,
      settings: {
        ...defaults.settings,
        ...(parsed.settings ?? {}),
      },
    };
  } catch {
    return createDefaultSaveData();
  }
}

export function persistSaveData(data: PlayerSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors in private browsing
  }
}
