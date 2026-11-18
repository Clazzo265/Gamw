import React, { useState } from 'react';
import { Lock, Play, Star, Crown, X } from 'lucide-react';
import { GAMES_METADATA, getLevelsForGame } from '../data/campaigns';
import { isLevelUnlocked } from '../state/store';
import { GameId, PlayerSaveData } from '../types/game';
import { soundEngine } from '../engine/audio';

interface CampaignModalProps {
  gameId: GameId;
  saveData: PlayerSaveData;
  onSelectLevel: (levelId: string) => void;
  onClose: () => void;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({
  gameId,
  saveData,
  onSelectLevel,
  onClose,
}) => {
  const game = GAMES_METADATA.find((g) => g.id === gameId)!;
  const levels = getLevelsForGame(gameId);
  const [selectedWorld, setSelectedWorld] = useState<number>(1);

  const worldLevels = levels.filter((l) => l.worldIndex === selectedWorld);

  return (
    <div className="fixed inset-0 z-50 bg-[#090d16]/90 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#11192b] border border-slate-700 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 p-4 sm:p-5 border-b border-slate-800">
          <div>
            <div className="text-xs font-semibold text-amber-400">
              {game.genre} · 5 Worlds · 25 Levels
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
              {game.title} Campaign
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            aria-label="Close Campaign Selector"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* World Selector Tabs */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 overflow-x-auto no-scrollbar">
          {game.worlds.map((worldName, idx) => {
            const wNum = idx + 1;
            const active = selectedWorld === wNum;
            const wLevels = levels.filter((l) => l.worldIndex === wNum);
            const wStars = wLevels.reduce((acc, l) => acc + (saveData.levelProgress[l.id]?.stars ?? 0), 0);
            return (
              <button
                key={worldName}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedWorld(wNum);
                }}
                className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-[#0b1120] text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                W{wNum}: {worldName} ({wStars}/15)
              </button>
            );
          })}
        </div>

        {/* Level List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {worldLevels.map((lvl) => {
            const unlocked = isLevelUnlocked(saveData, lvl.id);
            const prog = saveData.levelProgress[lvl.id];
            const stars = prog?.stars ?? 0;
            return (
              <div
                key={lvl.id}
                className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  unlocked
                    ? 'bg-[#0b1120] border-slate-800 hover:border-amber-500/50'
                    : 'bg-[#090d16] border-slate-900 opacity-60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-semibold text-amber-400">Level {lvl.levelIndex}</span>
                    <span>·</span>
                    <span>{lvl.difficulty}</span>
                    {lvl.isBoss && (
                      <>
                        <span>·</span>
                        <span className="text-rose-400 font-semibold inline-flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5" /> Boss Stage
                        </span>
                      </>
                    )}
                    {prog?.bestScore ? (
                      <>
                        <span>·</span>
                        <span className="font-mono-num text-slate-300">Best {prog.bestScore}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="text-base font-bold text-white font-display">{lvl.title}</div>
                  <div className="text-xs text-slate-300">{lvl.primaryMission}</div>
                  <div className="text-[11px] text-emerald-400/90">Bonus: {lvl.bonusMission}</div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="flex items-center gap-1" aria-label={`${stars} of 3 stars`}>
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      soundEngine.playClick();
                      onSelectLevel(lvl.id);
                    }}
                    className={`min-h-[44px] px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                      unlocked
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {unlocked ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{prog?.completed ? 'Replay' : 'Play'}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Locked</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
