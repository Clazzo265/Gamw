export type GameId =
  | 'nsima-rush'
  | 'minibus-race'
  | 'chipereganyu-box'
  | 'zuri-vs-amara'
  | 'malawi-adventure';

export type DifficultyTier =
  | 'BEGINNER'
  | 'EASY'
  | 'INTERMEDIATE'
  | 'HARD'
  | 'EXPERT'
  | 'BOSS';

export type GraphicsQuality = 'LOW' | 'MEDIUM' | 'HIGH';

export type LobbyTab = 'home' | 'games' | 'challenges' | 'profile';

export type CharacterId =
  | 'chef_chimwemwe'
  | 'zuri'
  | 'amara'
  | 'farmer_byson'
  | 'market_queen'
  | 'village_elder'
  | 'street_legend'
  | 'explorer_talandira'
  | 'savings_leader';

export type CharacterAnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'turn'
  | 'lookAround'
  | 'talk'
  | 'laugh'
  | 'celebrate'
  | 'reactFail'
  | 'victory'
  | 'defeat'
  | 'stir'
  | 'pour'
  | 'punch'
  | 'kick'
  | 'block'
  | 'dodge'
  | 'special'
  | 'drive';

export interface LevelConfig {
  id: string;
  gameId: GameId;
  worldIndex: number; // 1..5
  levelIndex: number; // 1..5
  globalIndex: number; // 1..25
  worldName: string;
  title: string;
  difficulty: DifficultyTier;
  isBoss: boolean;
  tutorialHint?: string;
  primaryMission: string;
  bonusMission: string;
  targetScore: number;
  starThresholds: [number, number, number];
  timeLimitSec: number;
  rewardCoins: number;
  rewardXp: number;
  environmentTheme: string;
  bossName?: string;
}

export interface GameMetadata {
  id: GameId;
  title: string;
  subtitle: string;
  description: string;
  artwork: string;
  accentColor: string;
  genre: string;
  defaultDifficulty: string;
  featuredCharacter: CharacterId;
  worlds: string[];
}

export interface LevelProgress {
  stars: number; // 0..3
  bestScore: number;
  completed: boolean;
  bonusAchieved: boolean;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  rewardXp: number;
  category: 'general' | GameId;
}

export interface ChallengeDef {
  id: string;
  title: string;
  description: string;
  cadence: 'daily' | 'weekly';
  gameId: GameId | 'any';
  targetCount: number;
  rewardCoins: number;
  rewardXp: number;
}

export interface CustomizationItem {
  id: string;
  name: string;
  category: 'avatar' | 'chitenje' | 'minibus';
  costCoins: number;
  primaryColor: string;
  secondaryColor: string;
  unlockRequirement?: string;
}

export interface PlayerSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  hapticsEnabled: boolean;
  graphicsQuality: GraphicsQuality;
}

export interface PlayerSaveData {
  playerName: string;
  selectedAvatar: CharacterId;
  selectedChitenjeId: string;
  selectedMinibusId: string;
  xp: number;
  level: number;
  coins: number;
  totalStars: number;
  unlockedCharacters: CharacterId[];
  unlockedCustomizations: string[];
  levelProgress: Record<string, LevelProgress>;
  unlockedAchievements: string[];
  challengeProgress: Record<string, number>;
  claimedChallenges: string[];
  lastPlayedGame: GameId;
  lastPlayedLevelId: string;
  settings: PlayerSettings;
}

export interface LevelOutcome {
  levelId: string;
  gameId: GameId;
  victory: boolean;
  score: number;
  stars: number; // 0..3
  bonusAchieved: boolean;
  durationSec: number;
  metrics: { label: string; value: string }[];
}
