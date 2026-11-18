import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Shield, Zap, ChevronLeft, ChevronRight, Swords } from 'lucide-react';
import { GameShellHUD } from '../components/GameShellHUD';
import { soundEngine } from '../engine/audio';
import {
  buildStylizedCharacter,
  CHARACTER_PROFILES,
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
  AttackType,
  createFighter,
  FighterState,
  getAttackSpec,
  resolveStrike,
} from '../gameLogic/combatRules';
import { calculateStarsForScore } from '../state/store';
import {
  CharacterAnimState,
  CharacterId,
  GraphicsQuality,
  LevelConfig,
  LevelOutcome,
} from '../types/game';

interface ZuriVsAmaraGameProps {
  level: LevelConfig;
  graphicsQuality: GraphicsQuality;
  playerCharacter: CharacterId;
  musicEnabled: boolean;
  autostart: boolean;
  hasNextLevel: boolean;
  onToggleAudio: () => void;
  onComplete: (outcome: LevelOutcome) => void;
  onExitToLobby: () => void;
  onNextLevel: () => void;
}

const OPPONENT_BY_WORLD: CharacterId[] = [
  'farmer_byson',
  'amara',
  'market_queen',
  'village_elder',
  'street_legend',
];

export const ZuriVsAmaraGame: React.FC<ZuriVsAmaraGameProps> = ({
  level,
  graphicsQuality,
  playerCharacter,
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
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const heroId: CharacterId =
    playerCharacter === 'zuri' || playerCharacter === 'amara' ? playerCharacter : 'zuri';
  const opponentId: CharacterId = OPPONENT_BY_WORLD[(level.worldIndex - 1) % OPPONENT_BY_WORLD.length];

  const [p1Hud, setP1Hud] = useState({ hp: 100, energy: 30, combo: 0, wins: 0 });
  const [p2Hud, setP2Hud] = useState({ hp: 100, wins: 0 });
  const [roundNum, setRoundNum] = useState(1);
  const [timeLeft, setTimeLeft] = useState(level.timeLimitSec);
  const [bannerText, setBannerText] = useState('Round 1 — Fight!');
  const [outcome, setOutcome] = useState<LevelOutcome | null>(null);

  const p1Ref = useRef<FighterState>(createFighter(-2.2, 1, 100));
  const p2Ref = useRef<FighterState>(createFighter(2.2, -1, 90 + level.worldIndex * 12));
  const winsRef = useRef({ p1: 0, p2: 0 });
  const roundRef = useRef(1);
  const timeRef = useRef(level.timeLimitSec);
  const hitstopRef = useRef(0);
  const shakeRef = useRef(0);
  const specialUsedRef = useRef(false);
  const maxComboRef = useRef(0);
  const inputRef = useRef({ left: false, right: false, block: false });
  const particlesRef = useRef<PooledParticles | null>(null);

  const resetMatch = useCallback(() => {
    const enemyMaxHp = 85 + level.worldIndex * 14 + (level.isBoss ? 25 : 0);
    p1Ref.current = createFighter(-2.2, 1, 100);
    p2Ref.current = createFighter(2.2, -1, enemyMaxHp);
    winsRef.current = { p1: 0, p2: 0 };
    roundRef.current = 1;
    timeRef.current = level.timeLimitSec;
    specialUsedRef.current = false;
    maxComboRef.current = 0;
    setP1Hud({ hp: 100, energy: 30, combo: 0, wins: 0 });
    setP2Hud({ hp: enemyMaxHp, wins: 0 });
    setRoundNum(1);
    setTimeLeft(level.timeLimitSec);
    setBannerText('Round 1 — Fight!');
    setOutcome(null);
  }, [level]);

  useEffect(() => {
    resetMatch();
    setPhase(autostart ? 'playing' : 'intro');
  }, [level.id, autostart, resetMatch]);

  const finishMatch = useCallback(
    (victory: boolean) => {
      if (phaseRef.current === 'gameover') return;
      const score = Math.round(
        (victory ? 550 : 120) +
          p1Ref.current.hp * 5 +
          maxComboRef.current * 90 +
          winsRef.current.p1 * 220,
      );
      const stars = calculateStarsForScore(score, level.starThresholds, victory);
      const bonusAchieved = victory && maxComboRef.current >= 3 && specialUsedRef.current;

      const result: LevelOutcome = {
        levelId: level.id,
        gameId: 'zuri-vs-amara',
        victory,
        score,
        stars,
        bonusAchieved,
        durationSec: Math.max(1, level.timeLimitSec - timeRef.current),
        metrics: [
          { label: 'Rounds Won', value: `${winsRef.current.p1} - ${winsRef.current.p2}` },
          { label: 'Max Combo', value: `${maxComboRef.current}x` },
        ],
      };
      if (victory) soundEngine.playVictory();
      else soundEngine.playDefeat();
      setOutcome(result);
      setPhase('gameover');
      onComplete(result);
    },
    [level, onComplete],
  );

  const triggerAttack = useCallback((type: AttackType) => {
    if (phaseRef.current !== 'playing') return;
    const p1 = p1Ref.current;
    if (p1.action === 'ko' || p1.action === 'hit') return;
    if (p1.action === 'punch' || p1.action === 'kick' || p1.action === 'special') return;
    if (type === 'special' && p1.energy < 100) return;

    const spec = getAttackSpec(type);
    p1Ref.current = {
      ...p1,
      action: type,
      actionTimer: 0,
      actionDuration: spec.duration,
      hitDealtThisAttack: false,
      energy: type === 'special' ? 0 : p1.energy,
    };
    if (type === 'special') {
      specialUsedRef.current = true;
      soundEngine.playBoost();
    }
  }, []);

  const triggerDodge = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const p1 = p1Ref.current;
    if (p1.action !== 'idle' && p1.action !== 'walk') return;
    p1Ref.current = {
      ...p1,
      action: 'dodge',
      actionTimer: 0,
      actionDuration: 0.3,
      vx: -p1.facing * 5.2,
    };
    soundEngine.playJump();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') inputRef.current.left = true;
      if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') inputRef.current.right = true;
      if (e.key.toLowerCase() === 'l') inputRef.current.block = true;
      if (e.key.toLowerCase() === 'j') triggerAttack('punch');
      if (e.key.toLowerCase() === 'k') triggerAttack('kick');
      if (e.key.toLowerCase() === 'u') triggerAttack('special');
      if (e.key === ' ') {
        e.preventDefault();
        triggerDodge();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') inputRef.current.left = false;
      if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') inputRef.current.right = false;
      if (e.key.toLowerCase() === 'l') inputRef.current.block = false;
    };
    const clear = () => {
      inputRef.current = { left: false, right: false, block: false };
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clear);
    };
  }, [triggerAttack, triggerDodge]);

  // Three.js Arena Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { renderer, isSoftwareGl, setupEnvironment } = createStudioRenderer(container, graphicsQuality);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x161224);
    scene.fog = new THREE.FogExp2(0x161224, 0.035);
    const envTex = setupEnvironment(scene);

    const camera = new THREE.PerspectiveCamera(
      42,
      (container.clientWidth || 800) / (container.clientHeight || 500),
      0.1,
      80,
    );
    camera.position.set(0, 2.35, 7.6);
    camera.lookAt(0, 1.15, 0);

    scene.add(new THREE.HemisphereLight(0xfde68a, 0x1e1b4b, 0.85));
    const key = new THREE.DirectionalLight(0xffedd5, 2.0);
    key.position.set(4, 7, 5);
    if (!isSoftwareGl && graphicsQuality !== 'LOW') {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
    }
    scene.add(key);

    // Stone Lakeside Arena Stage + Lake Malawi Horizon
    const arenaFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(5.5, 6.0, 0.4, 36),
      new THREE.MeshStandardMaterial({
        map: createGroundTexture('#475569', '#1e293b'),
        color: 0xffffff,
        roughness: 0.78,
      }),
    );
    arenaFloor.position.y = -0.2;
    arenaFloor.receiveShadow = true;
    scene.add(arenaFloor);

    const lake = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.2, metalness: 0.65 }),
    );
    lake.rotation.x = -Math.PI / 2;
    lake.position.y = -0.45;
    scene.add(lake);

    const p1Rig: CharacterRig = buildStylizedCharacter(heroId);
    const p2Rig: CharacterRig = buildStylizedCharacter(opponentId);
    scene.add(p1Rig.root);
    scene.add(p2Rig.root);

    const particles = new PooledParticles(scene, 70, 0xf5a623);
    particlesRef.current = particles;

    let aiDecisionTimer = 0.4;
    let uiTimer = 0;

    const mapToCharAnim = (a: FighterState['action']): CharacterAnimState => {
      if (a === 'ko') return 'defeat';
      if (a === 'hit') return 'reactFail';
      return a;
    };

    const stopLoop = startPacedLoop(renderer, isSoftwareGl, (dt, elapsed) => {
      if (hitstopRef.current > 0) {
        hitstopRef.current -= dt;
      } else if (phaseRef.current === 'playing') {
        timeRef.current = Math.max(0, timeRef.current - dt);
        if (timeRef.current <= 0) {
          finishMatch(p1Ref.current.hp >= p2Ref.current.hp);
        }

        const p1 = p1Ref.current;
        const p2 = p2Ref.current;

        // Player Movement & Block
        if (p1.action === 'idle' || p1.action === 'walk' || p1.action === 'block') {
          p1.facing = p2.x >= p1.x ? 1 : -1;
          if (inputRef.current.block) {
            p1.action = 'block';
            p1.vx = 0;
          } else {
            const move = (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0);
            p1.vx = move * 4.4;
            p1.action = move !== 0 ? 'walk' : 'idle';
          }
        }

        // AI Policy
        aiDecisionTimer -= dt;
        if (aiDecisionTimer <= 0 && (p2.action === 'idle' || p2.action === 'walk')) {
          aiDecisionTimer = Math.max(0.22, 0.72 - level.worldIndex * 0.08);
          p2.facing = p1.x >= p2.x ? 1 : -1;
          const dist = Math.abs(p1.x - p2.x);
          const roll = Math.random();
          if (dist > 2.15) {
            p2.vx = p2.facing * (3.2 + level.worldIndex * 0.35);
            p2.action = 'walk';
          } else if (p1.action === 'punch' || p1.action === 'kick') {
            p2.action = roll < 0.45 ? 'block' : 'dodge';
            p2.actionTimer = 0;
            p2.actionDuration = 0.3;
            p2.vx = p2.action === 'dodge' ? -p2.facing * 4.0 : 0;
          } else if (p2.energy >= 100 && roll < 0.4) {
            const spec = getAttackSpec('special');
            p2.action = 'special';
            p2.actionTimer = 0;
            p2.actionDuration = spec.duration;
            p2.hitDealtThisAttack = false;
            p2.energy = 0;
          } else if (roll < 0.78) {
            const atk: AttackType = roll < 0.45 ? 'punch' : 'kick';
            const spec = getAttackSpec(atk);
            p2.action = atk;
            p2.actionTimer = 0;
            p2.actionDuration = spec.duration;
            p2.hitDealtThisAttack = false;
          } else {
            p2.action = 'idle';
            p2.vx = 0;
          }
        }

        // Step Fighters & Resolve Attacks
        const stepFighter = (f: FighterState, isP1: boolean) => {
          f.x = THREE.MathUtils.clamp(f.x + f.vx * dt, -4.3, 4.3);
          if (f.action !== 'walk' && f.action !== 'dodge') {
            f.vx = THREE.MathUtils.damp(f.vx, 0, 12, dt);
          }

          if (f.actionDuration > 0 && f.action !== 'idle' && f.action !== 'walk' && f.action !== 'block') {
            f.actionTimer += dt;
            if (
              (f.action === 'punch' || f.action === 'kick' || f.action === 'special') &&
              !f.hitDealtThisAttack
            ) {
              const spec = getAttackSpec(f.action);
              if (f.actionTimer >= spec.windup) {
                const defender = isP1 ? p2Ref.current : p1Ref.current;
                const res = resolveStrike(f, defender, f.action);
                if (isP1) {
                  p1Ref.current = res.attackerNext;
                  p2Ref.current = res.defenderNext;
                  maxComboRef.current = Math.max(maxComboRef.current, res.attackerNext.comboCount);
                } else {
                  p2Ref.current = res.attackerNext;
                  p1Ref.current = res.defenderNext;
                }
                if (res.hit) {
                  hitstopRef.current = f.action === 'special' ? 0.08 : 0.04;
                  shakeRef.current = f.action === 'special' ? 0.45 : 0.25;
                  soundEngine.playHit(f.action !== 'punch');
                  particles.burst(defender.x, 1.25, 0, 14, 0xf5a623, 3.6, -6, 0.45, 0.8);
                } else if (res.blocked) {
                  soundEngine.playBlock();
                  particles.burst(defender.x, 1.25, 0, 8, 0x38bdf8, 2.5, -4, 0.35, 0.6);
                }
              }
            }
            if (f.actionTimer >= f.actionDuration && f.action !== 'ko') {
              f.action = 'idle';
              f.actionTimer = 0;
              f.actionDuration = 0;
            }
          }
        };

        stepFighter(p1Ref.current, true);
        stepFighter(p2Ref.current, false);

        // Check Round End
        if (p1Ref.current.hp <= 0 || p2Ref.current.hp <= 0) {
          if (p2Ref.current.hp <= 0) winsRef.current.p1 += 1;
          else winsRef.current.p2 += 1;

          if (winsRef.current.p1 >= 2) {
            finishMatch(true);
          } else if (winsRef.current.p2 >= 2) {
            finishMatch(false);
          } else {
            roundRef.current += 1;
            const enemyMaxHp = 85 + level.worldIndex * 14 + (level.isBoss ? 25 : 0);
            p1Ref.current = createFighter(-2.2, 1, 100);
            p2Ref.current = createFighter(2.2, -1, enemyMaxHp);
            setRoundNum(roundRef.current);
            setBannerText(`Round ${roundRef.current} — Fight!`);
          }
        }

        uiTimer += dt;
        if (uiTimer >= 0.08) {
          uiTimer = 0;
          setP1Hud({
            hp: p1Ref.current.hp,
            energy: Math.round(p1Ref.current.energy),
            combo: p1Ref.current.comboCount,
            wins: winsRef.current.p1,
          });
          setP2Hud({ hp: p2Ref.current.hp, wins: winsRef.current.p2 });
          setTimeLeft(Math.ceil(timeRef.current));
        }
      }

      // Sync 3D fighter positions & skeletal animation
      p1Rig.root.position.x = p1Ref.current.x;
      p1Rig.root.rotation.y = p1Ref.current.facing * (Math.PI / 2);
      p2Rig.root.position.x = p2Ref.current.x;
      p2Rig.root.rotation.y = p2Ref.current.facing * (Math.PI / 2);

      updateCharacterAnimation(p1Rig, mapToCharAnim(p1Ref.current.action), elapsed, dt, 1);
      updateCharacterAnimation(p2Rig, mapToCharAnim(p2Ref.current.action), elapsed + 0.5, dt, 1);

      if (shakeRef.current > 0) shakeRef.current = Math.max(0, shakeRef.current - dt * 1.8);
      const s = shakeRef.current * shakeRef.current;
      const midX = (p1Ref.current.x + p2Ref.current.x) * 0.4;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, midX, 6, dt) + (Math.random() - 0.5) * s;
      camera.position.y = 2.3 + (Math.random() - 0.5) * s;
      camera.lookAt(midX, 1.1, 0);

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
  }, [graphicsQuality, heroId, opponentId, level, finishMatch]);

  const enemyMaxHp = 85 + level.worldIndex * 14 + (level.isBoss ? 25 : 0);

  return (
    <GameShellHUD
      level={level}
      phase={phase}
      outcome={outcome}
      musicEnabled={musicEnabled}
      onStartLevel={() => setPhase('playing')}
      onPauseToggle={() => setPhase((p) => (p === 'playing' ? 'paused' : 'playing'))}
      onRestart={() => {
        resetMatch();
        setPhase('playing');
      }}
      onExitToLobby={onExitToLobby}
      onToggleAudio={onToggleAudio}
      onNextLevel={onNextLevel}
      hasNextLevel={hasNextLevel}
      topHudContent={
        <div className="bg-[#090d16]/90 border border-slate-700/80 rounded-xl px-4 py-1.5 text-xs font-mono-num flex items-center gap-3">
          <span className="text-amber-400 font-bold">R{roundNum}</span>
          <span className="text-white font-bold">{timeLeft}s</span>
        </div>
      }
    >
      <div ref={mountRef} className="w-full h-full" data-testid="fighter-3d-canvas" />

      {phase === 'playing' && (
        <>
          {/* Fighting Health Bars */}
          <div className="pointer-events-none absolute top-16 left-3 right-3 z-10 grid grid-cols-2 gap-3 max-w-4xl mx-auto">
            <div className="bg-[#090d16]/90 border border-slate-700/80 rounded-xl p-2.5">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-sky-400">{CHARACTER_PROFILES[heroId].displayName}</span>
                <span className="font-mono-num text-white">{p1Hud.hp} HP · {p1Hud.wins}W</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-sky-400 transition-all" style={{ width: `${p1Hud.hp}%` }} />
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${p1Hud.energy}%` }} />
              </div>
            </div>

            <div className="bg-[#090d16]/90 border border-slate-700/80 rounded-xl p-2.5">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="font-mono-num text-white">{p2Hud.wins}W · {p2Hud.hp} HP</span>
                <span className="text-rose-400">{CHARACTER_PROFILES[opponentId].displayName}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all ml-auto"
                  style={{ width: `${Math.round((p2Hud.hp / enemyMaxHp) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-right text-slate-400 mt-1">
                {p1Hud.combo > 1 ? `${p1Hud.combo}x COMBO!` : bannerText}
              </div>
            </div>
          </div>

          {/* Touch Fighting Controls */}
          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-end justify-between gap-2 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                aria-label="Move Left"
                onPointerDown={() => (inputRef.current.left = true)}
                onPointerUp={() => (inputRef.current.left = false)}
                onPointerLeave={() => (inputRef.current.left = false)}
                className="w-14 h-14 rounded-2xl bg-[#090d16]/90 border border-slate-700 text-white active:bg-sky-500 flex items-center justify-center"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button
                type="button"
                aria-label="Move Right"
                onPointerDown={() => (inputRef.current.right = true)}
                onPointerUp={() => (inputRef.current.right = false)}
                onPointerLeave={() => (inputRef.current.right = false)}
                className="w-14 h-14 rounded-2xl bg-[#090d16]/90 border border-slate-700 text-white active:bg-sky-500 flex items-center justify-center"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </div>

            <div className="pointer-events-auto flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                onPointerDown={() => (inputRef.current.block = true)}
                onPointerUp={() => (inputRef.current.block = false)}
                onPointerLeave={() => (inputRef.current.block = false)}
                className="min-h-[50px] px-3 rounded-xl bg-[#090d16]/90 border border-slate-700 text-sky-300 font-bold text-xs flex items-center gap-1"
              >
                <Shield className="w-4 h-4" /> Block [L]
              </button>
              <button
                type="button"
                onClick={triggerDodge}
                className="min-h-[50px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Dodge [Space]
              </button>
              <button
                type="button"
                onClick={() => triggerAttack('punch')}
                className="min-h-[50px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1"
              >
                <Swords className="w-4 h-4" /> Punch [J]
              </button>
              <button
                type="button"
                onClick={() => triggerAttack('kick')}
                className="min-h-[50px] px-3.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs"
              >
                Kick [K]
              </button>
              <button
                type="button"
                disabled={p1Hud.energy < 100}
                onClick={() => triggerAttack('special')}
                className={`min-h-[50px] px-3.5 rounded-xl font-bold text-xs flex items-center gap-1 ${
                  p1Hud.energy >= 100
                    ? 'bg-purple-500 hover:bg-purple-400 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-500'
                }`}
              >
                <Zap className="w-4 h-4" /> Special [U]
              </button>
            </div>
          </div>
        </>
      )}
    </GameShellHUD>
  );
};
