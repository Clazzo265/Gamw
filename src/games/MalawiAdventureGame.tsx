import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Sparkles, MessageSquare } from 'lucide-react';
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
import { calculateStarsForScore } from '../state/store';
import { CharacterAnimState, GraphicsQuality, LevelConfig, LevelOutcome } from '../types/game';

interface MalawiAdventureGameProps {
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

const BIOME_PALETTES = [
  { sky: 0x0ea5e9, ground: '#d6b67c', accent: '#b48a4e', water: true }, // Lake Malawi
  { sky: 0x38bdf8, ground: '#4d7c3f', accent: '#36582a', water: false }, // Lilongwe
  { sky: 0x64748b, ground: '#2e5939', accent: '#1e3f27', water: false }, // Zomba Plateau
  { sky: 0x475569, ground: '#57534e', accent: '#3f3b37', water: false }, // Mount Mulanje
  { sky: 0x1e293b, ground: '#3b6e52', accent: '#274d38', water: false }, // Northern Malawi
];

export const MalawiAdventureGame: React.FC<MalawiAdventureGameProps> = ({
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
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const totalRelics = 3 + level.worldIndex;
  const [relicsGot, setRelicsGot] = useState(0);
  const [elderTalked, setElderTalked] = useState(false);
  const [hintText, setHintText] = useState('Collect all Golden Heritage Relics, then step into the Summit Portal!');
  const [timeLeft, setTimeLeft] = useState(level.timeLimitSec);
  const [outcome, setOutcome] = useState<LevelOutcome | null>(null);

  const inputRef = useRef({ x: 0, z: 0, jump: false, interact: false });
  const playerPosRef = useRef({ x: 0, y: 0, z: 6, vy: 0, onGround: true, facing: Math.PI });
  const relicsGotRef = useRef(0);
  const elderTalkedRef = useRef(false);
  const fallsRef = useRef(0);
  const timeRef = useRef(level.timeLimitSec);
  const particlesRef = useRef<PooledParticles | null>(null);

  const resetAdventure = useCallback(() => {
    playerPosRef.current = { x: 0, y: 0, z: 6, vy: 0, onGround: true, facing: Math.PI };
    relicsGotRef.current = 0;
    elderTalkedRef.current = false;
    fallsRef.current = 0;
    timeRef.current = level.timeLimitSec;
    setRelicsGot(0);
    setElderTalked(false);
    setHintText('Collect all Golden Heritage Relics, then step into the Summit Portal!');
    setTimeLeft(level.timeLimitSec);
    setOutcome(null);
  }, [level]);

  useEffect(() => {
    resetAdventure();
    setPhase(autostart ? 'playing' : 'intro');
  }, [level.id, autostart, resetAdventure]);

  const finishAdventure = useCallback(
    (victory: boolean) => {
      if (phaseRef.current === 'gameover') return;
      const score = Math.round(
        (victory ? 500 : 100) +
          relicsGotRef.current * 140 +
          timeRef.current * 8 +
          (elderTalkedRef.current ? 150 : 0) -
          fallsRef.current * 40,
      );
      const stars = calculateStarsForScore(score, level.starThresholds, victory);
      const bonusAchieved = victory && elderTalkedRef.current && fallsRef.current === 0;
      const result: LevelOutcome = {
        levelId: level.id,
        gameId: 'malawi-adventure',
        victory,
        score,
        stars,
        bonusAchieved,
        durationSec: Math.max(1, level.timeLimitSec - timeRef.current),
        metrics: [
          { label: 'Relics Found', value: `${relicsGotRef.current}/${totalRelics}` },
          { label: 'Elder Blessing', value: elderTalkedRef.current ? 'Yes' : 'No' },
        ],
      };
      if (victory) soundEngine.playVictory();
      else soundEngine.playDefeat();
      setOutcome(result);
      setPhase('gameover');
      onComplete(result);
    },
    [level, totalRelics, onComplete],
  );

  useEffect(() => {
    const keys = new Set<string>();
    const syncMove = () => {
      inputRef.current.x =
        (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
        (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      inputRef.current.z =
        (keys.has('s') || keys.has('arrowdown') ? 1 : 0) -
        (keys.has('w') || keys.has('arrowup') ? 1 : 0);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.add(k);
      syncMove();
      if (e.key === ' ') {
        e.preventDefault();
        inputRef.current.jump = true;
      }
      if (k === 'e') inputRef.current.interact = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
      syncMove();
    };
    const clear = () => {
      keys.clear();
      inputRef.current = { x: 0, z: 0, jump: false, interact: false };
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clear);
    };
  }, []);

  // Three.js Malawian Landscape Exploration Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const palette = BIOME_PALETTES[(level.worldIndex - 1) % BIOME_PALETTES.length];
    const { renderer, isSoftwareGl, setupEnvironment } = createStudioRenderer(container, graphicsQuality);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(palette.sky);
    scene.fog = new THREE.FogExp2(palette.sky, 0.022);
    const envTex = setupEnvironment(scene);

    const camera = new THREE.PerspectiveCamera(
      52,
      (container.clientWidth || 800) / (container.clientHeight || 500),
      0.1,
      100,
    );

    scene.add(new THREE.HemisphereLight(0xfef3c7, 0x1e293b, 0.85));
    const sun = new THREE.DirectionalLight(0xffedd5, 1.85);
    sun.position.set(10, 16, 10);
    if (!isSoftwareGl && graphicsQuality !== 'LOW') {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
    }
    scene.add(sun);

    // Main Island / Plateau Ground + Lake Malawi Surround
    const mainGround = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 18, 1.2, 40),
      new THREE.MeshStandardMaterial({
        map: createGroundTexture(palette.ground, palette.accent),
        color: 0xffffff,
        roughness: 0.9,
      }),
    );
    mainGround.position.y = -0.6;
    mainGround.receiveShadow = true;
    scene.add(mainGround);

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.65 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.35;
    scene.add(water);

    // Elevated Stone Platforms + Mountain Rocks
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
    const platforms = [
      { x: -4.2, y: 0.7, z: 1.5, w: 3.2, d: 3.2 },
      { x: 4.5, y: 0.9, z: -1.5, w: 3.2, d: 3.2 },
      { x: 0, y: 1.1, z: -7.5, w: 4.2, d: 3.6 },
    ];
    platforms.forEach((p) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.y, p.d), stoneMat);
      mesh.position.set(p.x, p.y / 2, p.z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      scene.add(mesh);
    });

    // Explorer Talandira with glowing wooden staff
    const heroRig: CharacterRig = buildStylizedCharacter('explorer_talandira');
    scene.add(heroRig.root);
    const staffMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 1.55, 8),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 }),
    );
    staffMesh.position.set(0, -0.05, 0.14);
    heroRig.rightHandAnchor.add(staffMesh);

    // Village Elder NPC near start
    const elderRig: CharacterRig = buildStylizedCharacter('village_elder');
    elderRig.root.position.set(-2.6, 0, 4.4);
    elderRig.root.lookAt(0, 0, 6);
    scene.add(elderRig.root);

    // Golden Heritage Relics
    const relicMat = new THREE.MeshStandardMaterial({
      color: 0xf5a623,
      emissive: 0xd97706,
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.9,
    });
    const relics: { mesh: THREE.Mesh; collected: boolean }[] = [];
    for (let i = 0; i < totalRelics; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), relicMat);
      const angle = (i / totalRelics) * Math.PI * 1.4 - Math.PI * 0.7;
      const dist = 4.2 + (i % 2) * 3.8;
      const rx = Math.sin(angle) * dist;
      const rz = -Math.cos(angle) * dist + 1.5;
      const ry = i === 0 ? 1.5 : i === 1 ? 1.7 : 0.85;
      m.position.set(
        i === 0 ? -4.2 : i === 1 ? 4.5 : rx,
        ry,
        i === 0 ? 1.5 : i === 1 ? -1.5 : rz,
      );
      scene.add(m);
      relics.push({ mesh: m, collected: false });
    }

    // Summit Portal
    const portalMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const portalRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.14, 12, 32), portalMat);
    portalRing.position.set(0, 2.2, -8.2);
    scene.add(portalRing);

    // Patrol Stone Guardian Hazard
    const hazard = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.65, 0),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.4 }),
    );
    hazard.position.set(0, 0.65, -2.5);
    scene.add(hazard);

    const particles = new PooledParticles(scene, 60, 0xf5a623);
    particlesRef.current = particles;

    let uiTimer = 0;

    const stopLoop = startPacedLoop(renderer, isSoftwareGl, (dt, elapsed) => {
      const p = playerPosRef.current;

      if (phaseRef.current === 'playing') {
        timeRef.current = Math.max(0, timeRef.current - dt);
        if (timeRef.current <= 0) finishAdventure(false);

        // Movement
        const mx = inputRef.current.x;
        const mz = inputRef.current.z;
        const moveLen = Math.hypot(mx, mz);
        const speed = 6.2;
        if (moveLen > 0.05) {
          const nx = mx / moveLen;
          const nz = mz / moveLen;
          p.x += nx * speed * dt;
          p.z += nz * speed * dt;
          p.facing = Math.atan2(nx, nz);
        }

        // Keep within island radius
        const rad = Math.hypot(p.x, p.z);
        if (rad > 15.0) {
          p.x *= 15.0 / rad;
          p.z *= 15.0 / rad;
        }

        // Platform floor height
        let floorY = 0;
        for (const plat of platforms) {
          if (Math.abs(p.x - plat.x) < plat.w * 0.55 && Math.abs(p.z - plat.z) < plat.d * 0.55) {
            if (p.y >= plat.y - 0.55) floorY = Math.max(floorY, plat.y);
          }
        }

        // Jump & Gravity
        if (inputRef.current.jump && p.onGround) {
          p.vy = 8.4;
          p.onGround = false;
          soundEngine.playJump();
        }
        inputRef.current.jump = false;

        p.vy -= 20 * dt;
        p.y += p.vy * dt;
        if (p.y <= floorY) {
          p.y = floorY;
          p.vy = 0;
          p.onGround = true;
        }

        // Collect Relics
        for (const r of relics) {
          if (r.collected) continue;
          r.mesh.rotation.y += dt * 2.2;
          const dist = Math.hypot(p.x - r.mesh.position.x, p.z - r.mesh.position.z);
          if (dist < 1.15 && Math.abs(p.y + 0.8 - r.mesh.position.y) < 1.5) {
            r.collected = true;
            r.mesh.visible = false;
            relicsGotRef.current += 1;
            setRelicsGot(relicsGotRef.current);
            soundEngine.playPickup();
            particles.burst(r.mesh.position.x, r.mesh.position.y, r.mesh.position.z, 16, 0xf5a623, 3.2, -5, 0.6, 0.9);
            if (relicsGotRef.current >= totalRelics) {
              setHintText('All relics found! Step through the Emerald Summit Portal!');
            }
          }
        }

        // Elder NPC interaction
        const elderDist = Math.hypot(p.x - elderRig.root.position.x, p.z - elderRig.root.position.z);
        if ((elderDist < 2.1 && inputRef.current.interact) || (elderDist < 1.5 && !elderTalkedRef.current)) {
          inputRef.current.interact = false;
          if (!elderTalkedRef.current) {
            elderTalkedRef.current = true;
            setElderTalked(true);
            soundEngine.playPickup();
            setHintText('Elder Gogo: "Blessings upon you, Pathfinder! Seek the Summit Portal!"');
          }
        }

        // Patrol Hazard
        hazard.position.x = Math.sin(elapsed * (1.2 + level.worldIndex * 0.25)) * 4.8;
        hazard.rotation.y += dt * 2.5;
        if (Math.hypot(p.x - hazard.position.x, p.z - hazard.position.z) < 1.1 && p.y < 0.9) {
          fallsRef.current += 1;
          p.x = 0;
          p.z = 6;
          p.y = 0;
          soundEngine.playHit(true);
          particles.burst(p.x, 1, p.z, 14, 0xef4444, 3.5, -6, 0.5, 0.8);
          setHintText('Knocked back by guardian boulder! Watch its patrol!');
        }

        // Portal Victory Check
        const portalDist = Math.hypot(p.x - 0, p.z - -8.2);
        if (portalDist < 1.55 && relicsGotRef.current >= totalRelics) {
          finishAdventure(true);
        }

        uiTimer += dt;
        if (uiTimer >= 0.15) {
          uiTimer = 0;
          setTimeLeft(Math.ceil(timeRef.current));
        }
      }

      heroRig.root.position.set(p.x, p.y, p.z);
      heroRig.root.rotation.y = p.facing;
      const moving = Math.hypot(inputRef.current.x, inputRef.current.z) > 0.05;
      const heroAnim: CharacterAnimState = !p.onGround ? 'jump' : moving ? 'run' : 'idle';
      updateCharacterAnimation(heroRig, heroAnim, elapsed, dt, 1);
      updateCharacterAnimation(elderRig, elderTalkedRef.current ? 'celebrate' : 'talk', elapsed, dt, 1);

      portalRing.rotation.z += dt * 1.1;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, p.x * 0.75, 6, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, p.y + 4.4, 6, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, p.z + 7.2, 6, dt);
      camera.lookAt(p.x, p.y + 1.0, p.z - 1.5);

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
  }, [graphicsQuality, level, totalRelics, finishAdventure]);

  return (
    <GameShellHUD
      level={level}
      phase={phase}
      outcome={outcome}
      musicEnabled={musicEnabled}
      onStartLevel={() => setPhase('playing')}
      onPauseToggle={() => setPhase((p) => (p === 'playing' ? 'paused' : 'playing'))}
      onRestart={() => {
        resetAdventure();
        setPhase('playing');
      }}
      onExitToLobby={onExitToLobby}
      onToggleAudio={onToggleAudio}
      onNextLevel={onNextLevel}
      hasNextLevel={hasNextLevel}
      topHudContent={
        <div className="bg-[#090d16]/90 border border-slate-700/80 rounded-xl px-4 py-1.5 flex items-center gap-4 text-xs font-mono-num">
          <div>
            <span className="text-slate-400">RELICS </span>
            <span className="text-amber-400 font-bold">
              {relicsGot}/{totalRelics}
            </span>
          </div>
          <div>
            <span className="text-slate-400">ELDER </span>
            <span className={elderTalked ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
              {elderTalked ? 'BLESSED' : 'WAITING'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">TIME </span>
            <span className="text-white font-bold">{timeLeft}s</span>
          </div>
        </div>
      }
    >
      <div ref={mountRef} className="w-full h-full" data-testid="adventure-3d-canvas" />

      {phase === 'playing' && (
        <>
          <div className="pointer-events-none absolute top-16 left-3 right-3 flex justify-center z-10">
            <div className="bg-[#090d16]/90 border border-emerald-500/40 rounded-xl px-4 py-2 text-xs text-slate-200 max-w-md text-center">
              {hintText}
            </div>
          </div>

          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-end justify-between pointer-events-none">
            {/* Touch D-Pad */}
            <div className="pointer-events-auto grid grid-cols-3 gap-1 w-36">
              <div />
              <button
                type="button"
                aria-label="Walk Forward"
                onPointerDown={() => (inputRef.current.z = -1)}
                onPointerUp={() => (inputRef.current.z = 0)}
                onPointerLeave={() => (inputRef.current.z = 0)}
                className="h-12 rounded-xl bg-[#090d16]/90 border border-slate-700 text-white active:bg-emerald-500 flex items-center justify-center"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
              <div />
              <button
                type="button"
                aria-label="Walk Left"
                onPointerDown={() => (inputRef.current.x = -1)}
                onPointerUp={() => (inputRef.current.x = 0)}
                onPointerLeave={() => (inputRef.current.x = 0)}
                className="h-12 rounded-xl bg-[#090d16]/90 border border-slate-700 text-white active:bg-emerald-500 flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                aria-label="Walk Backward"
                onPointerDown={() => (inputRef.current.z = 1)}
                onPointerUp={() => (inputRef.current.z = 0)}
                onPointerLeave={() => (inputRef.current.z = 0)}
                className="h-12 rounded-xl bg-[#090d16]/90 border border-slate-700 text-white active:bg-emerald-500 flex items-center justify-center"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
              <button
                type="button"
                aria-label="Walk Right"
                onPointerDown={() => (inputRef.current.x = 1)}
                onPointerUp={() => (inputRef.current.x = 0)}
                onPointerLeave={() => (inputRef.current.x = 0)}
                className="h-12 rounded-xl bg-[#090d16]/90 border border-slate-700 text-white active:bg-emerald-500 flex items-center justify-center"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Jump & Interact */}
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => (inputRef.current.interact = true)}
                className="min-h-[52px] px-4 rounded-2xl bg-[#090d16]/90 border border-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" /> Talk [E]
              </button>
              <button
                type="button"
                onClick={() => (inputRef.current.jump = true)}
                className="min-h-[56px] px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" /> Jump [Space]
              </button>
            </div>
          </div>
        </>
      )}
    </GameShellHUD>
  );
};
