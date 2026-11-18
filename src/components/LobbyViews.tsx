import React, { useState } from 'react';
import {
  Home,
  Gamepad2,
  Target,
  User,
  Settings,
  Star,
  Coins,
  Play,
  Trophy,
  CheckCircle2,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  Layers,
  X,
} from 'lucide-react';
import {
  ACHIEVEMENTS,
  CHALLENGES,
  CUSTOMIZATION_ITEMS,
  GAMES_METADATA,
  getLevelById,
} from '../data/campaigns';
import { CHARACTER_PROFILES } from '../engine/characters3d';
import { soundEngine } from '../engine/audio';
import {
  computeLevelFromXp,
  getGameCompletionSummary,
  getNextPlayableLevelId,
} from '../state/store';
import {
  CharacterId,
  GameId,
  GraphicsQuality,
  LobbyTab,
  PlayerSaveData,
  PlayerSettings,
} from '../types/game';
import { LobbyStage3D } from './LobbyStage3D';

interface LobbyViewsProps {
  saveData: PlayerSaveData;
  activeTab: LobbyTab;
  achievementBanner: string | null;
  onChangeTab: (tab: LobbyTab) => void;
  onLaunchLevel: (levelId: string) => void;
  onOpenCampaign: (gameId: GameId) => void;
  onSelectAvatar: (charId: CharacterId) => void;
  onPurchaseItem: (itemId: string) => void;
  onClaimChallenge: (challengeId: string) => void;
  onUpdateSettings: (partial: Partial<PlayerSettings>) => void;
  onUpdatePlayerName: (name: string) => void;
}

export const LobbyViews: React.FC<LobbyViewsProps> = ({
  saveData,
  activeTab,
  achievementBanner,
  onChangeTab,
  onLaunchLevel,
  onOpenCampaign,
  onSelectAvatar,
  onPurchaseItem,
  onClaimChallenge,
  onUpdateSettings,
  onUpdatePlayerName,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const xpInfo = computeLevelFromXp(saveData.xp);
  const xpPct = Math.round((xpInfo.currentLevelXp / xpInfo.nextLevelXp) * 100);
  const continueLevel = getLevelById(saveData.lastPlayedLevelId) ?? getLevelById('nsima-rush-w1-l1')!;
  const continueGame = GAMES_METADATA.find((g) => g.id === continueLevel.gameId)!;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 pb-20 md:pb-8 flex flex-col">
      {/* Top Console Header (Single Row, Clean Hierarchy) */}
      <header className="sticky top-0 z-30 bg-[#090d16]/95 border-b border-slate-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Lockup */}
          <div className="flex items-center gap-3 shrink-0">
            <svg viewBox="0 0 36 36" className="w-9 h-9 shrink-0" aria-hidden="true">
              <rect width="36" height="36" rx="10" fill="#151e30" stroke="#f5a623" strokeWidth="1.5" />
              <path d="M8 25L15 11L20 19L24 13L29 25H8Z" fill="#f5a623" />
              <circle cx="24" cy="10" r="3" fill="#0ea5e9" />
            </svg>
            <div>
              <div className="text-base sm:text-lg font-extrabold text-white font-display leading-none tracking-wide">
                MALAWI ARCADE
              </div>
              <div className="text-[11px] text-amber-400 font-medium hidden sm:block mt-0.5">
                Play Malawi. Live the Adventure.
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold" aria-label="Main navigation">
            {(
              [
                { id: 'home', label: 'Home' },
                { id: 'games', label: 'Games' },
                { id: 'challenges', label: 'Challenges' },
                { id: 'profile', label: 'Profile' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onChangeTab(item.id);
                }}
                className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === item.id
                    ? 'border-amber-400 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Player Metrics & Settings */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2.5 text-xs font-mono-num">
              <div className="hidden sm:block text-right">
                <div className="text-white font-bold">Lv {xpInfo.level}</div>
                <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                  <div className="h-full bg-amber-400" style={{ width: `${xpPct}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400 font-bold bg-[#151e30] border border-slate-800 rounded-xl px-2.5 sm:px-3 py-1.5">
                <Coins className="w-4 h-4" />
                <span>{saveData.coins.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSettingsOpen(true);
              }}
              aria-label="Open Settings"
              className="min-h-[42px] min-w-[42px] rounded-xl bg-[#151e30] border border-slate-800 hover:border-amber-500/60 text-slate-200 flex items-center justify-center transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Achievement Toast */}
      {achievementBanner && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 w-full">
          <div className="rounded-xl bg-amber-500/15 border border-amber-500/50 px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-amber-200">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Achievement Unlocked: {achievementBanner}</span>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-8">
        {activeTab === 'home' && (
          <>
            {/* Hero 3D Stage + Continue / Featured Campaign */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
              <div className="lg:col-span-7 h-[240px] sm:h-[360px] lg:h-auto lg:min-h-[360px]">
                <LobbyStage3D
                  characterId={saveData.selectedAvatar}
                  chitenjeId={saveData.selectedChitenjeId}
                  graphicsQuality={saveData.settings.graphicsQuality}
                />
              </div>

              <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-[#11192b] border border-slate-800 p-5 sm:p-6 space-y-5">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-amber-400">
                    Continue Adventure · {continueGame.title}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display leading-tight text-balance">
                    {continueLevel.title}
                  </h1>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {continueLevel.primaryMission}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono-num pt-1">
                    <span>World {continueLevel.worldIndex}: {continueLevel.worldName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{saveData.totalStars} Total Stars</span>
                    <span aria-hidden="true">·</span>
                    <span>{saveData.coins.toLocaleString()} Coins</span>
                  </div>
                </div>

                {/* Quick Character Switcher */}
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <div className="text-xs font-semibold text-slate-400">Featured 3D Hero</div>
                  <div className="flex flex-wrap gap-1.5">
                    {saveData.unlockedCharacters.map((cid) => (
                      <button
                        key={cid}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onSelectAvatar(cid);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          saveData.selectedAvatar === cid
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-[#0b1120] text-slate-300 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        {CHARACTER_PROFILES[cid].displayName.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    data-start="true"
                    onClick={() => {
                      soundEngine.playClick();
                      onLaunchLevel(continueLevel.id);
                    }}
                    className="flex-1 min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Continue Playing</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onOpenCampaign(continueLevel.gameId);
                    }}
                    className="min-h-[48px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm whitespace-nowrap shrink-0"
                  >
                    Worlds
                  </button>
                </div>
              </div>
            </section>

            {/* Game Collection Grid */}
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
                    Malawi Arcade Worlds
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Five complete 3D campaigns · 25 levels per game · Real gameplay & boss duels
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onChangeTab('games');
                  }}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 whitespace-nowrap shrink-0"
                >
                  View All Games
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {GAMES_METADATA.map((game) => {
                  const summary = getGameCompletionSummary(saveData, game.id);
                  const nextLvl = getNextPlayableLevelId(saveData, game.id);
                  return (
                    <article
                      key={game.id}
                      className="rounded-2xl bg-[#11192b] border border-slate-800 overflow-hidden flex flex-col hover:border-slate-700 transition-colors"
                    >
                      <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
                        <img
                          src={game.artwork}
                          alt={game.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#11192b] via-transparent to-transparent" />
                      </div>

                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span style={{ color: game.accentColor }} className="font-semibold">
                              {game.genre}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{game.defaultDifficulty}</span>
                          </div>
                          <h3 className="text-lg font-extrabold text-white font-display">
                            {game.title}
                          </h3>
                          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                            {game.description}
                          </p>
                        </div>

                        <div className="space-y-3 pt-1">
                          <div className="flex items-center justify-between text-xs font-mono-num text-slate-400 border-t border-slate-800 pt-3">
                            <span>
                              Progress {summary.completedCount}/{summary.totalLevels}
                            </span>
                            <span className="text-amber-400 inline-flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400" /> {summary.starsEarned}/{summary.maxStars}
                            </span>
                            <span>Best {summary.bestScore}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                onLaunchLevel(nextLvl);
                              }}
                              className="flex-1 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>{summary.completedCount > 0 ? 'Continue' : 'Play'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                onOpenCampaign(game.id);
                              }}
                              className="min-h-[44px] px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs whitespace-nowrap shrink-0"
                            >
                              25 Levels
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {activeTab === 'games' && (
          <section className="space-y-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                All 5 Game Worlds
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                125 playable campaign levels across cooking, racing, financial strategy, combat, and exploration.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {GAMES_METADATA.map((game) => {
                const summary = getGameCompletionSummary(saveData, game.id);
                const nextLvl = getNextPlayableLevelId(saveData, game.id);
                return (
                  <div
                    key={game.id}
                    className="rounded-2xl bg-[#11192b] border border-slate-800 overflow-hidden flex flex-col sm:flex-row"
                  >
                    <div className="sm:w-52 aspect-[4/3] sm:aspect-auto shrink-0 bg-slate-900">
                      <img
                        src={game.artwork}
                        alt={game.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="text-xs text-amber-400 font-semibold">{game.subtitle}</div>
                        <h2 className="text-xl font-extrabold text-white font-display">{game.title}</h2>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{game.description}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-mono-num text-slate-400">
                          {summary.completedCount}/25 Levels · {summary.starsEarned}/75 Stars · Best {summary.bestScore}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              onLaunchLevel(nextLvl);
                            }}
                            className="flex-1 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                          >
                            {summary.completedCount > 0 ? 'Continue' : 'Play Now'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              onOpenCampaign(game.id);
                            }}
                            className="min-h-[44px] px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
                          >
                            Select Level
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'challenges' && (
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                Daily Missions & Achievements
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Complete gameplay goals to earn extra Virtual Coins and XP.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white font-display">Active Missions</h2>
                {CHALLENGES.map((ch) => {
                  const prog = Math.min(ch.targetCount, saveData.challengeProgress[ch.id] ?? 0);
                  const ready = prog >= ch.targetCount;
                  const claimed = saveData.claimedChallenges.includes(ch.id);
                  return (
                    <div
                      key={ch.id}
                      className="rounded-xl bg-[#11192b] border border-slate-800 p-4 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="text-[11px] font-semibold text-amber-400 uppercase">
                          {ch.cadence} · +{ch.rewardCoins} Coins · +{ch.rewardXp} XP
                        </div>
                        <div className="text-sm font-bold text-white">{ch.title}</div>
                        <div className="text-xs text-slate-400">{ch.description}</div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                          <div
                            className="h-full bg-emerald-400"
                            style={{ width: `${Math.round((prog / ch.targetCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!ready || claimed}
                        onClick={() => {
                          soundEngine.playPickup();
                          onClaimChallenge(ch.id);
                        }}
                        className={`min-h-[42px] px-4 rounded-xl text-xs font-bold shrink-0 ${
                          claimed
                            ? 'bg-slate-800 text-emerald-400'
                            : ready
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                              : 'bg-slate-900 border border-slate-800 text-slate-500 font-mono-num'
                        }`}
                      >
                        {claimed ? 'Claimed' : ready ? 'Claim' : `${prog}/${ch.targetCount}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white font-display">
                  Achievements ({saveData.unlockedAchievements.length}/{ACHIEVEMENTS.length})
                </h2>
                {ACHIEVEMENTS.map((ach) => {
                  const unlocked = saveData.unlockedAchievements.includes(ach.id);
                  return (
                    <div
                      key={ach.id}
                      className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${
                        unlocked
                          ? 'bg-[#11192b] border-amber-500/40'
                          : 'bg-[#0b1120] border-slate-800/70 opacity-75'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold text-white">{ach.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{ach.description}</div>
                      </div>
                      <div className="text-right shrink-0">
                        {unlocked ? (
                          <CheckCircle2 className="w-5 h-5 text-amber-400 ml-auto" />
                        ) : (
                          <span className="text-xs font-mono-num text-slate-500">
                            +{ach.rewardCoins} Coins
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="space-y-6">
            <div className="rounded-2xl bg-[#11192b] border border-slate-800 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-amber-400">Player Profile</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={saveData.playerName}
                    maxLength={22}
                    aria-label="Player Name"
                    onChange={(e) => onUpdatePlayerName(e.target.value)}
                    className="bg-[#0b1120] border border-slate-700 rounded-xl px-3 py-1.5 text-lg font-bold text-white font-display focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="text-xs text-slate-400 font-mono-num">
                  Level {xpInfo.level} · {saveData.xp} Total XP · {saveData.totalStars} Stars ·{' '}
                  {saveData.coins.toLocaleString()} Virtual Coins
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="min-h-[44px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs inline-flex items-center gap-2 self-start sm:self-center"
              >
                <Settings className="w-4 h-4" /> Audio & Graphics Settings
              </button>
            </div>

            {/* Character & Customization Workshop */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white font-display">
                Chitenje & Minibus Customization Workshop
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {CUSTOMIZATION_ITEMS.map((item) => {
                  const owned = saveData.unlockedCustomizations.includes(item.id);
                  const equipped =
                    saveData.selectedChitenjeId === item.id ||
                    saveData.selectedMinibusId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl bg-[#11192b] border border-slate-800 p-4 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl border border-slate-700 shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${item.primaryColor} 50%, ${item.secondaryColor} 50%)`,
                          }}
                        />
                        <div>
                          <div className="text-sm font-bold text-white">{item.name}</div>
                          <div className="text-xs text-slate-400 capitalize">{item.category}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!owned && saveData.coins < item.costCoins}
                        onClick={() => {
                          soundEngine.playPickup();
                          onPurchaseItem(item.id);
                        }}
                        className={`min-h-[40px] px-3 rounded-xl text-xs font-bold shrink-0 ${
                          equipped
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : owned
                              ? 'bg-slate-800 hover:bg-slate-700 text-white'
                              : saveData.coins >= item.costCoins
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                : 'bg-slate-900 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {equipped ? 'Equipped' : owned ? 'Equip' : `${item.costCoins} Coins`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 border-t border-slate-800 grid grid-cols-4 h-16"
        aria-label="Mobile navigation"
      >
        {(
          [
            { id: 'home', label: 'Home', icon: Home },
            { id: 'games', label: 'Games', icon: Gamepad2 },
            { id: 'challenges', label: 'Challenges', icon: Target },
            { id: 'profile', label: 'Profile', icon: User },
          ] as const
        ).map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onChangeTab(id);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                active ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Settings Drawer Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-[#090d16]/88 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#11192b] border border-slate-700 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-white font-display">
                Audio, Haptics & Graphics
              </h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close Settings"
                className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ musicEnabled: !saveData.settings.musicEnabled })
                }
                className="w-full min-h-[48px] px-4 rounded-xl bg-[#0b1120] border border-slate-800 flex items-center justify-between text-sm font-semibold"
              >
                <span className="inline-flex items-center gap-2">
                  {saveData.settings.musicEnabled ? (
                    <Volume2 className="w-4 h-4 text-amber-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-500" />
                  )}
                  Ambient Music
                </span>
                <span className={saveData.settings.musicEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                  {saveData.settings.musicEnabled ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ sfxEnabled: !saveData.settings.sfxEnabled })}
                className="w-full min-h-[48px] px-4 rounded-xl bg-[#0b1120] border border-slate-800 flex items-center justify-between text-sm font-semibold"
              >
                <span className="inline-flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-sky-400" /> Sound Effects
                </span>
                <span className={saveData.settings.sfxEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                  {saveData.settings.sfxEnabled ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ hapticsEnabled: !saveData.settings.hapticsEnabled })
                }
                className="w-full min-h-[48px] px-4 rounded-xl bg-[#0b1120] border border-slate-800 flex items-center justify-between text-sm font-semibold"
              >
                <span className="inline-flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-400" /> Haptic Vibration
                </span>
                <span className={saveData.settings.hapticsEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                  {saveData.settings.hapticsEnabled ? 'ON' : 'OFF'}
                </span>
              </button>

              <div className="rounded-xl bg-[#0b1120] border border-slate-800 p-3.5 space-y-2">
                <div className="text-xs font-semibold text-slate-300 inline-flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" /> 3D Graphics Quality
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as GraphicsQuality[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onUpdateSettings({ graphicsQuality: q });
                      }}
                      className={`min-h-[40px] rounded-lg text-xs font-bold ${
                        saveData.settings.graphicsQuality === q
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
