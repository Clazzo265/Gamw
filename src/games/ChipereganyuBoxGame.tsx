import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ShieldCheck, TrendingUp, Home, PiggyBank, ArrowRight } from 'lucide-react';
import { GameShellHUD } from '../components/GameShellHUD';
import { soundEngine } from '../engine/audio';
import {
  buildStylizedCharacter,
  CharacterRig,
  updateCharacterAnimation,
} from '../engine/characters3d';
import {
  createGroundTexture,
  createStudioRenderer,
  PooledParticles,
  startPacedLoop,
} from '../engine/threeUtils';
import {
  ChipereganyuState,
  createInitialChipereganyuState,
  FinancialAllocation,
  stepFinancialWeek,
} from '../gameLogic/chipereganyuRules';
import { calculateStarsForScore } from '../state/store';
import { CharacterAnimState, GraphicsQuality, LevelConfig, LevelOutcome } from '../types/game';

interface ChipereganyuBoxGameProps {
  level: LevelConfig;
  graphicsQuality: GraphicsQuality;
  musicEnabled: boolean;
  autostart: boolean;
  hasNextLevel: boolean;
  onToggleAudio: () => void;
  onComplete: (outcome: LevelOutcome) => void;
  onExitToLobby: () => void;
  onNextLevel: () => void;
}

export const ChipereganyuBoxGame: React.FC<ChipereganyuBoxGameProps> = ({
  level,
  graphicsQuality,
  musicEnabled,
  autostart,
  hasNextLevel,
  onToggleAudio,
  onComplete,
  onExitToLobby,
  onNextLevel,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'intro' | 'playing' | 'paused' | 'gameover'>(
    autostart ? 'playing' : 'intro',
  );
  const [sim, setSim] = useState<ChipereganyuState>(() =>
    createInitialChipereganyuState(level.worldIndex, level.levelIndex),
  );
  const [alloc, setAlloc] = useState<FinancialAllocation>({
    savingsPct: 35,
    businessPct: 25,
    householdPct: 25,
    emergencyPct: 15,
  });
  const [outcome, setOutcome] = useState<LevelOutcome | null>(null);

  const circleAnimRef = useRef<CharacterAnimState>('idle');
  const circleTimerRef = useRef(0);
  const particlesRef = useRef<PooledParticles | null>(null);

  const resetGame = useCallback(() => {
    setSim(createInitialChipereganyuState(level.worldIndex, level.levelIndex));
    setAlloc({ savingsPct: 35, businessPct: 25, householdPct: 25, emergencyPct: 15 });
    setOutcome(null);
    circleAnimRef.current = 'idle';
  }, [level]);

  useEffect(() => {
    resetGame();
    setPhase(autostart ? 'playing' : 'intro');
  }, [level.id, autostart, resetGame]);

  const handleConfirmWeek = () => {
    if (phase !== 'playing' || sim.status !== 'playing') return;
    const next = stepFinancialWeek(sim, alloc, level.worldIndex);
    setSim(next);
    soundEngine.playPickup();
    particlesRef.current?.burst(0, 0.7, 0, 14, 0xf5a623, 2.5, -5, 0.6, 0.8);

    if (next.status === 'playing') {
      circleAnimRef.current = next.currentEvent.shockCost > 0 ? 'talk' : 'celebrate';
      circleTimerRef.current = 1.4;
      return;
    }

    const victory = next.status === 'won';
    const rawScore = Math.round(
      (next.savingsBox / Math.max(1, next.targetSavings)) * 650 +
        next.householdWelfare * 4 +
        next.emergencyReserve * 0.04,
    );
    const stars = calculateStarsForScore(rawScore, level.starThresholds, victory);
    const bonusAchieved = victory && next.minReservePctObserved >= 15;

    const result: LevelOutcome = {
      levelId: level.id,
      gameId: 'chipereganyu-box',
      victory,
      score: rawScore,
      stars,
      bonusAchieved,
      durationSec: next.week * 8,
      metrics: [
        { label: 'Savings Box', value: `MK ${next.savingsBox.toLocaleString()}` },
        { label: 'Welfare', value: `${next.householdWelfare}%` },
      ],
    };

    circleAnimRef.current = victory ? 'victory' : 'defeat';
    if (victory) soundEngine.playVictory();
    else soundEngine.playDefeat();
    setOutcome(result);
    setPhase('gameover');
    onComplete(result);
  };

  // Three.js Baobab Village Savings Circle Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { renderer, isSoftwareGl, setupEnvironment } = createStudioRenderer(container, graphicsQuality);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1f1916);
    scene.fog = new THREE.FogExp2(0x1f1916, 0.04);
    const envTex = setupEnvironment(scene);

    const camera = new THREE.PerspectiveCamera(
      42,
      (container.clientWidth || 800) / (container.clientHeight || 500),
      0.1,
      60,
    );
    camera.position.set(0, 3.1, 6.4);
    camera.lookAt(0, 0.9, 0);

    scene.add(new THREE.HemisphereLight(0xfef08a, 0x451a03, 0.85));
    const sun = new THREE.DirectionalLight(0xffedd5, 1.85);
    sun.position.set(4, 7, 5);
    if (!isSoftwareGl && graphicsQuality !== 'LOW') {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
    }
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(14, 42),
      new THREE.MeshStandardMaterial({
        map: createGroundTexture('#854d27', '#5c341d'),
        color: 0xffffff,
        roughness: 0.9,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Woven Chitenje Mat + Carved Wooden Chipereganyu Cash Box
    const mat = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.75, 0.03, 28),
      new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.85 }),
    );
    mat.position.y = 0.02;
    scene.add(mat);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c2e14, roughness: 0.55 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf5a623, roughness: 0.25, metalness: 0.85 });
    const boxGroup = new THREE.Group();
    const boxBody = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.44, 0.52), woodMat);
    boxBody.position.y = 0.24;
    boxBody.castShadow = true;
    boxGroup.add(boxBody);
    const boxLid = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.82, 12, 1, false, 0, Math.PI), woodMat);
    boxLid.rotation.z = Math.PI / 2;
    boxLid.rotation.x = -Math.PI / 2;
    boxLid.position.y = 0.46;
    boxGroup.add(boxLid);
    const padlock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.08), brassMat);
    padlock.position.set(0, 0.34, 0.27);
    boxGroup.add(padlock);
    scene.add(boxGroup);

    // Background Baobab Trunk
    const baobabMat = new THREE.MeshStandardMaterial({ color: 0x6b4c35, roughness: 0.92 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.15, 4.2, 14), baobabMat);
    trunk.position.set(0, 2.1, -3.5);
    scene.add(trunk);
    const canopy = new THREE.Mesh(
      new THREE.DodecahedronGeometry(2.6, 1),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 }),
    );
    canopy.scale.set(1.6, 0.65, 1.1);
    canopy.position.set(0, 4.4, -3.4);
    scene.add(canopy);

    // Circle of 4 Animated Characters
    const memberIds = ['savings_leader', 'farmer_byson', 'market_queen', 'explorer_talandira'] as const;
    const memberRigs: CharacterRig[] = memberIds.map((id, i) => {
      const rig = buildStylizedCharacter(id);
      const angle = (i - 1.5) * 0.85;
      rig.root.position.set(Math.sin(angle) * 2.1, 0, Math.cos(angle) * -0.9 - 0.3);
      rig.root.lookAt(0, 0.4, 0.4);
      scene.add(rig.root);
      return rig;
    });

    const particles = new PooledParticles(scene, 50, 0xf5a623);
    particlesRef.current = particles;

    const stopLoop = startPacedLoop(renderer, isSoftwareGl, (dt, elapsed) => {
      if (circleTimerRef.current > 0) {
        circleTimerRef.current -= dt;
        if (circleTimerRef.current <= 0) circleAnimRef.current = 'idle';
      }
      memberRigs.forEach((rig, idx) => {
        const anim: CharacterAnimState =
          circleAnimRef.current === 'idle'
            ? idx === 0
              ? 'talk'
              : 'idle'
            : circleAnimRef.current;
        updateCharacterAnimation(rig, anim, elapsed + idx * 0.7, dt, 1);
      });
      particles.update(dt);
      renderer.render(scene, camera);
    });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      stopLoop();
      ro.disconnect();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [graphicsQuality]);

  const applyPreset = (preset: 'balanced' | 'growth' | 'shield') => {
    soundEngine.playClick();
    if (preset === 'balanced') {
      setAlloc({ savingsPct: 35, businessPct: 25, householdPct: 25, emergencyPct: 15 });
    } else if (preset === 'growth') {
      setAlloc({ savingsPct: 30, businessPct: 40, householdPct: 20, emergencyPct: 10 });
    } else {
      setAlloc({ savingsPct: 30, businessPct: 15, householdPct: 25, emergencyPct: 30 });
    }
  };

  return (
    <GameShellHUD
      level={level}
      phase={phase}
      outcome={outcome}
      musicEnabled={musicEnabled}
      onStartLevel={() => setPhase('playing')}
      onPauseToggle={() => setPhase((p) => (p === 'playing' ? 'paused' : 'playing'))}
      onRestart={() => {
        resetGame();
        setPhase('playing');
      }}
      onExitToLobby={onExitToLobby}
      onToggleAudio={onToggleAudio}
      onNextLevel={onNextLevel}
      hasNextLevel={hasNextLevel}
      topHudContent={
        <div className="bg-[#090d16]/90 border border-slate-700/80 rounded-xl px-4 py-1.5 flex items-center gap-4 text-xs font-mono-num">
          <div>
            <span className="text-slate-400">WEEK </span>
            <span className="text-amber-400 font-bold">
              {sim.week}/{sim.maxWeeks}
            </span>
          </div>
          <div>
            <span className="text-slate-400">BOX </span>
            <span className="text-emerald-400 font-bold">
              MK {sim.savingsBox.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400">GOAL </span>
            <span className="text-white font-bold">MK {sim.targetSavings.toLocaleString()}</span>
          </div>
        </div>
      }
    >
      <div ref={mountRef} className="w-full h-full" data-testid="chipereganyu-3d-canvas" />

      {phase === 'playing' && (
        <div className="absolute inset-x-0 bottom-0 top-16 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
          {/* Top Event Banner + Metrics */}
          <div className="flex flex-col sm:flex-row justify-between gap-2">
            <div className="pointer-events-auto bg-[#090d16]/92 border border-amber-500/40 rounded-xl p-3 max-w-md">
              <div className="text-[11px] font-semibold text-amber-400">
                {sim.currentEvent.speaker} · {sim.currentEvent.title}
              </div>
              <div className="text-xs text-slate-200 mt-0.5">{sim.currentEvent.description}</div>
              {sim.currentEvent.shockCost > 0 && (
                <div className="text-xs text-rose-400 font-semibold mt-1 font-mono-num">
                  Shock Cost: MK {sim.currentEvent.shockCost.toLocaleString()}
                </div>
              )}
            </div>

            <div className="bg-[#090d16]/92 border border-slate-700/80 rounded-xl p-3 grid grid-cols-3 gap-3 text-center font-mono-num">
              <div>
                <div className="text-[10px] text-slate-400">Income</div>
                <div className="text-xs font-bold text-amber-300">MK {sim.cashOnHand.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Reserve</div>
                <div className="text-xs font-bold text-sky-400">MK {sim.emergencyReserve.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Welfare</div>
                <div className={`text-xs font-bold ${sim.householdWelfare >= 60 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {sim.householdWelfare}%
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Financial Allocation Controls */}
          <div className="pointer-events-auto w-full max-w-3xl mx-auto bg-[#090d16]/94 border border-slate-700/80 rounded-2xl p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-300">
                Allocate Weekly Budget (MK {sim.cashOnHand.toLocaleString()} · Virtual Currency Only)
              </div>
              <div className="flex items-center gap-1.5">
                {(['balanced', 'growth', 'shield'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 capitalize"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { key: 'savingsPct' as const, label: 'Savings Box', icon: PiggyBank, color: 'text-emerald-400' },
                { key: 'businessPct' as const, label: 'Business', icon: TrendingUp, color: 'text-amber-400' },
                { key: 'householdPct' as const, label: 'Household', icon: Home, color: 'text-sky-400' },
                { key: 'emergencyPct' as const, label: 'Emergency', icon: ShieldCheck, color: 'text-purple-400' },
              ].map(({ key, label, icon: Icon, color }) => (
                <div key={key} className="bg-[#0b1120] border border-slate-800 rounded-xl p-2.5">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`font-semibold inline-flex items-center gap-1 ${color}`}>
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </span>
                    <span className="font-mono-num text-white font-bold">{alloc[key]}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={70}
                    step={5}
                    aria-label={label}
                    value={alloc[key]}
                    onChange={(e) => setAlloc((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="w-full accent-amber-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-[11px] text-slate-400 truncate max-w-md">{sim.history[0]}</div>
              <button
                type="button"
                onClick={handleConfirmWeek}
                className="w-full sm:w-auto min-h-[46px] px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shrink-0"
              >
                <span>Commit Week {sim.week}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </GameShellHUD>
  );
};
