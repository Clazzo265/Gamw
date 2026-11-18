import React, { useEffect } from 'react';
import { Pause, Play, RotateCcw, Star, Trophy, Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { LevelConfig, LevelOutcome } from '../types/game';
import { soundEngine } from '../engine/audio';

interface GameShellHUDProps {
  level: LevelConfig;
  phase: 'intro' | 'playing' | 'paused' | 'gameover';
  outcome: LevelOutcome | null;
  musicEnabled: boolean;
  onStartLevel: () => void;
  onPauseToggle: () => void;
  onRestart: () => void;
  onExitToLobby: () => void;
  onToggleAudio: () => void;
  onNextLevel?: () => void;
  hasNextLevel?: boolean;
  topHudContent?: React.ReactNode;
  children: React.ReactNode;
}

export const GameShellHUD: React.FC<GameShellHUDProps> = ({
  level,
  phase,
  outcome,
  musicEnabled,
  onStartLevel,
  onPauseToggle,
  onRestart,
  onExitToLobby,
  onToggleAudio,
  onNextLevel,
  hasNextLevel,
  topHudContent,
  children,
}) => {
  // Mirror game state to document.body.dataset.state for deterministic accessibility & testing
  useEffect(() => {
    if (phase === 'intro') {
      document.body.dataset.state = 'title';
    } else if (phase === 'playing') {
      document.body.dataset.state = 'playing';
    } else if (phase === 'paused') {
      document.body.dataset.state = 'paused';
    } else {
      document.body.dataset.state = 'gameover';
    }
  }, [phase]);

  // Keyboard bindings: Enter/Space to start in intro, P/Escape to pause, R to restart, M to mute
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase === 'intro' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onStartLevel();
      } else if ((e.key === 'Escape' || e.key.toLowerCase() === 'p') && (phase === 'playing' || phase === 'paused')) {
        e.preventDefault();
        onPauseToggle();
      } else if (e.key.toLowerCase() === 'm') {
        onToggleAudio();
      } else if (e.key.toLowerCase() === 'r' && phase === 'paused') {
        onRestart();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, onStartLevel, onPauseToggle, onToggleAudio, onRestart]);

  return (
    <div className="relative w-full h-screen min-h-[560px] bg-[#090d16] overflow-hidden select-none">
      {/* 3D / Interactive Game Viewport */}
      <div className="absolute inset-0">{children}</div>

      {/* Top Perimeter Utility HUD (No backdrop-blur over WebGL) */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 p-3 flex items-start justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              soundEngine.playClick();
              onExitToLobby();
            }}
            aria-label="Back to Lobby"
            className="min-h-[42px] min-w-[42px] px-3 rounded-xl bg-[#090d16]/90 border border-slate-700 text-slate-200 hover:text-white hover:border-amber-400 flex items-center gap-1.5 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Lobby</span>
          </button>

          <div className="bg-[#090d16]/90 border border-slate-700/80 rounded-xl px-3 py-1.5">
            <div className="text-[11px] text-amber-400 font-semibold leading-tight">
              World {level.worldIndex} · Level {level.levelIndex} · {level.difficulty}
            </div>
            <div className="text-xs sm:text-sm font-bold text-white leading-tight font-display truncate max-w-[180px] sm:max-w-xs">
              {level.title}
            </div>
          </div>
        </div>

        {/* Game-Specific Compact Readout */}
        {topHudContent && <div className="pointer-events-none flex-1 flex justify-center">{topHudContent}</div>}

        {/* Right Utility Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleAudio();
            }}
            aria-label={musicEnabled ? 'Mute Audio' : 'Unmute Audio'}
            className="min-h-[42px] min-w-[42px] rounded-xl bg-[#090d16]/90 border border-slate-700 text-slate-200 hover:border-amber-400 flex items-center justify-center transition-colors"
          >
            {musicEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              soundEngine.playClick();
              onRestart();
            }}
            aria-label="Restart Level"
            className="min-h-[42px] min-w-[42px] rounded-xl bg-[#090d16]/90 border border-slate-700 text-slate-200 hover:border-amber-400 flex items-center justify-center transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              soundEngine.playClick();
              onPauseToggle();
            }}
            aria-label="Pause Game"
            className="min-h-[42px] min-w-[42px] rounded-xl bg-[#090d16]/90 border border-slate-700 text-slate-200 hover:border-amber-400 flex items-center justify-center transition-colors"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cinematic Opening Briefing Modal */}
      {phase === 'intro' && (
        <div className="absolute inset-0 z-30 bg-[#090d16]/88 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#11192b] border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="text-xs font-semibold text-amber-400">
              World {level.worldIndex}: {level.worldName} · Level {level.levelIndex} of 5
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display leading-tight">
              {level.isBoss ? `Boss Battle: ${level.bossName ?? level.title}` : level.title}
            </h2>
            <div className="space-y-2 text-sm text-slate-300 border-t border-slate-800 pt-3">
              <div>
                <span className="text-slate-400 font-medium">Primary Mission: </span>
                <span className="text-white font-semibold">{level.primaryMission}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Bonus Challenge: </span>
                <span className="text-emerald-300">{level.bonusMission}</span>
              </div>
              {level.tutorialHint && (
                <div className="bg-[#0b1120] border border-sky-500/30 rounded-xl p-3 text-xs text-sky-200 leading-relaxed">
                  {level.tutorialHint}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono-num pt-1">
              <span>Target Score: {level.targetScore}</span>
              <span>Reward: +{level.rewardCoins} Coins · +{level.rewardXp} XP</span>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                data-start="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  soundEngine.playClick();
                  onStartLevel();
                }}
                className="flex-1 min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Level</span>
              </button>
              <button
                type="button"
                onClick={onExitToLobby}
                className="min-h-[48px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {phase === 'paused' && (
        <div className="absolute inset-0 z-30 bg-[#090d16]/88 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#11192b] border border-slate-700 p-6 shadow-2xl space-y-4 text-center">
            <h2 className="text-2xl font-extrabold text-white font-display">Game Paused</h2>
            <p className="text-sm text-slate-400">
              World {level.worldIndex} · {level.title}
            </p>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onPauseToggle();
                }}
                className="w-full min-h-[46px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm"
              >
                Resume Play
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onRestart();
                }}
                className="w-full min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm"
              >
                Restart Level
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onExitToLobby();
                }}
                className="w-full min-h-[46px] rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-sm"
              >
                Return to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory / Defeat Modal */}
      {phase === 'gameover' && outcome && (
        <div className="absolute inset-0 z-30 bg-[#090d16]/90 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#11192b] border border-slate-700 p-6 shadow-2xl space-y-4 text-center">
            <div className="flex justify-center">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  outcome.victory ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                <Trophy className="w-7 h-7" />
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400">
                {level.worldName} · Level {level.levelIndex}
              </div>
              <h2 className="text-2xl font-extrabold text-white font-display mt-0.5">
                {outcome.victory ? (level.isBoss ? 'Boss Defeated!' : 'Level Complete!') : 'Try Again'}
              </h2>
            </div>

            {outcome.victory && (
              <div className="flex items-center justify-center gap-2 py-1" aria-label={`Earned ${outcome.stars} of 3 stars`}>
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`w-8 h-8 ${
                      s <= outcome.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 text-left">
              <div className="rounded-xl bg-[#0b1120] border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400">Score</div>
                <div className="text-lg font-bold text-white font-mono-num">{outcome.score}</div>
              </div>
              <div className="rounded-xl bg-[#0b1120] border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400">Duration</div>
                <div className="text-lg font-bold text-white font-mono-num">{Math.round(outcome.durationSec)}s</div>
              </div>
              {outcome.metrics.slice(0, 2).map((m) => (
                <div key={m.label} className="rounded-xl bg-[#0b1120] border border-slate-800 p-3">
                  <div className="text-[11px] text-slate-400">{m.label}</div>
                  <div className="text-sm font-bold text-amber-300 font-mono-num">{m.value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              {outcome.victory && hasNextLevel && onNextLevel && (
                <button
                  type="button"
                  data-start="true"
                  onClick={() => {
                    soundEngine.playClick();
                    onNextLevel();
                  }}
                  className="flex-1 min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm"
                >
                  Next Level
                </button>
              )}
              <button
                type="button"
                data-start={!outcome.victory || !hasNextLevel ? 'true' : undefined}
                onClick={() => {
                  soundEngine.playClick();
                  onRestart();
                }}
                className="flex-1 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm"
              >
                {outcome.victory ? 'Replay' : 'Try Again'}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onExitToLobby();
                }}
                className="min-h-[48px] px-4 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-sm"
              >
                Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
