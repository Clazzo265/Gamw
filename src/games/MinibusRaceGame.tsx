import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ChevronLeft, ChevronRight, Zap, Flame } from 'lucide-react';
import { GameShellHUD } from '../components/GameShellHUD';
import { CUSTOMIZATION_ITEMS } from '../data/campaigns';
import { soundEngine } from '../engine/audio';
import {
  createContactShadowDisc,
  createGroundTexture,
  createRoadTexture,
  createStudioRenderer,
  PooledParticles,
  startPacedLoop,
} from '../engine/threeUtils';
import { calculateStarsForScore } from '../state/store';
import { GraphicsQuality, LevelConfig, LevelOutcome } from '../types/game';

interface MinibusRaceGameProps {
  level: LevelConfig;
  graphicsQuality: GraphicsQuality;
  minibusId: string;
  musicEnabled: boolean;
  autostart: boolean;
  hasNextLevel: boolean;
  onToggleAudio: () => void;
  onComplete: (outcome: LevelOutcome) => void;
  onExitToLobby: () => void;
  onNextLevel: () => void;
}

function buildMalawianMinibus(primaryHex: string, stripeHex: string, isBoss = false): {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Mesh[];
} {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  group.add(createContactShadowDisc(1.4));

  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(primaryHex),
    roughness: 0.25,
    metalness: 0.35,
  });
  const stripeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(stripeHex),
    roughness: 0.3,
    metalness: 0.5,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.85,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.2,
    metalness: 0.9,
  });

  // Lower hull
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.78, 3.2), bodyMat);
  hull.position.y = 0.65;
  hull.castShadow = true;
  bodyGroup.add(hull);

  // Upper cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.64, 2.75), bodyMat);
  cabin.position.set(0, 1.32, -0.1);
  cabin.castShadow = true;
  bodyGroup.add(cabin);

  // Iconic Malawian Side Stripes
  const stripeL = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.14, 3.1), stripeMat);
  stripeL.position.y = 0.82;
  bodyGroup.add(stripeL);

  // Windshield + Side Windows
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.46, 0.08), glassMat);
  windshield.position.set(0, 1.32, 1.28);
  windshield.rotation.x = -0.16;
  bodyGroup.add(windshield);

  const sideWin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.38, 2.2), glassMat);
  sideWin.position.set(0, 1.34, -0.15);
  bodyGroup.add(sideWin);

  // Roof Rack + Luggage / Boss Crown
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.08, 1.8), chromeMat);
  rack.position.set(0, 1.68, -0.2);
  bodyGroup.add(rack);

  const luggage = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.26, 0.8),
    new THREE.MeshStandardMaterial({ color: isBoss ? 0xf59e0b : 0x78350f, roughness: 0.75 }),
  );
  luggage.position.set(0, 1.82, -0.2);
  bodyGroup.add(luggage);

  // Bumpers + Headlights + Taillights
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.16), chromeMat);
  frontBumper.position.set(0, 0.34, 1.62);
  bodyGroup.add(frontBumper);

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.5,
  });
  const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.08), headlightMat);
  hlL.position.set(-0.5, 0.62, 1.6);
  bodyGroup.add(hlL);
  const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.08), headlightMat);
  hlR.position.set(0.5, 0.62, 1.6);
  bodyGroup.add(hlR);

  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.2,
  });
  const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.08), tailMat);
  tlL.position.set(-0.54, 0.62, -1.6);
  bodyGroup.add(tlL);
  const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.08), tailMat);
  tlR.position.set(0.54, 0.62, -1.6);
  bodyGroup.add(tlR);

  // 4 Animated Wheels
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 16);
  wheelGeo.rotateZ(Math.PI / 2);

  const wheelPositions: [number, number, number][] = [
    [-0.78, 0.32, 1.0],
    [0.78, 0.32, 1.0],
    [-0.78, 0.32, -1.0],
    [0.78, 0.32, -1.0],
  ];
  const wheels = wheelPositions.map(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(x, y, z);
    w.castShadow = true;
    group.add(w);
    return w;
  });

  return { group, bodyGroup, wheels };
}

export const MinibusRaceGame: React.FC<MinibusRaceGameProps> = ({
  level,
  graphicsQuality,
  minibusId,
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

  const targetDistance = 650 + level.worldIndex * 180 + (level.isBoss ? 250 : 0);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [distance, setDistance] = useState(0);
  const [nitro, setNitro] = useState(40);
  const [positionRank, setPositionRank] = useState(2);
  const [timeLeft, setTimeLeft] = useState(level.timeLimitSec);
  const [outcome, setOutcome] = useState<LevelOutcome | null>(null);

  const inputRef = useRef({ left: false, right: false, brake: false, drift: false, boost: false });
  const playerXRef = useRef(0);
  const speedRef = useRef(26);
  const distRef = useRef(0);
  const rivalDistRef = useRef(24);
  const nitroRef = useRef(40);
  const boostsUsedRef = useRef(0);
  const crashesRef = useRef(0);
  const timeLeftRef = useRef(level.timeLimitSec);
  const shakeRef = useRef(0);

  const resetRace = useCallback(() => {
    playerXRef.current = 0;
    speedRef.current = 26;
    distRef.current = 0;
    rivalDistRef.current = 22 + level.worldIndex * 4;
    nitroRef.current = 45;
    boostsUsedRef.current = 0;
    crashesRef.current = 0;
    timeLeftRef.current = level.timeLimitSec;
    shakeRef.current = 0;
    setSpeedKmh(0);
    setDistance(0);
    setNitro(45);
    setPositionRank(2);
    setTimeLeft(level.timeLimitSec);
    setOutcome(null);
  }, [level]);

  useEffect(() => {
    resetRace();
    setPhase(autostart ? 'playing' : 'intro');
  }, [level.id, autostart, resetRace]);

  const finishRace = useCallback(
    (victory: boolean) => {
      if (phaseRef.current === 'gameover') return;
      const rank = distRef.current >= rivalDistRef.current ? 1 : 2;
      const timeBonus = Math.round(timeLeftRef.current * 14);
      const score = Math.max(
        100,
        Math.round(distRef.current * 1.1 + timeBonus + boostsUsedRef.current * 80 - crashesRef.current * 60 + (rank === 1 ? 250 : 0)),
      );
      const stars = calculateStarsForScore(score, level.starThresholds, victory);
      const bonusAchieved = victory && boostsUsedRef.current >= 3 && crashesRef.current < 2;
      const result: LevelOutcome = {
        levelId: level.id,
        gameId: 'minibus-race',
        victory,
        score,
        stars,
        bonusAchieved,
        durationSec: Math.max(1, level.timeLimitSec - timeLeftRef.current),
        metrics: [
          { label: 'Finish Rank', value: `#${rank} / 2` },
          { label: 'Collisions', value: `${crashesRef.current}` },
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

  // Keyboard bindings
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') inputRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') inputRef.current.right = true;
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') inputRef.current.brake = true;
      if (e.key === 'Shift') inputRef.current.drift = true;
      if (e.key === ' ') {
        e.preventDefault();
        inputRef.current.boost = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') inputRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') inputRef.current.right = false;
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') inputRef.current.brake = false;
      if (e.key === 'Shift') inputRef.current.drift = false;
      if (e.key === ' ') inputRef.current.boost = false;
    };
    const clearKeys = () => {
      inputRef.current = { left: false, right: false, brake: false, drift: false, boost: false };
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, []);

  // Three.js Highway World
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { renderer, isSoftwareGl, setupEnvironment } = createStudioRenderer(container, graphicsQuality);
    const skyColors = [0xf97316, 0x0ea5e9, 0xd97706, 0x334155, 0x1e293b];
    const skyHex = skyColors[(level.worldIndex - 1) % skyColors.length];

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(skyHex);
    scene.fog = new THREE.FogExp2(skyHex, 0.015);
    const envTex = setupEnvironment(scene);

    const camera = new THREE.PerspectiveCamera(
      58,
      (container.clientWidth || 800) / (container.clientHeight || 500),
      0.1,
      140,
    );
    camera.position.set(0, 3.4, 6.2);

    scene.add(new THREE.HemisphereLight(0xfef3c7, 0x451a03, 0.9));
    const sun = new THREE.DirectionalLight(0xfffbeb, 1.8);
    sun.position.set(12, 20, 8);
    if (!isSoftwareGl && graphicsQuality !== 'LOW') {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
    }
    scene.add(sun);

    // Terrain & Animated Road
    const terrainMat = new THREE.MeshStandardMaterial({
      map: createGroundTexture(level.worldIndex === 5 ? '#1e3a2f' : '#784826', '#4a2b13'),
      color: 0xffffff,
      roughness: 0.92,
    });
    const terrain = new THREE.Mesh(new THREE.PlaneGeometry(140, 220), terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.z = -60;
    scene.add(terrain);

    const roadTex = createRoadTexture();
    const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, color: 0xffffff, roughness: 0.72 });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 220), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, -60);
    road.receiveShadow = true;
    scene.add(road);

    // Roadside Buildings, Market Stalls & Jacaranda Trees
    const propsGroup = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c341d, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({
      color: level.worldIndex === 2 || level.worldIndex === 3 ? 0x7c3aed : 0x15803d,
      roughness: 0.85,
    });
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 });
    const stallRoofMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.7 });

    const roadsideObjects: THREE.Group[] = [];
    for (let i = 0; i < 18; i++) {
      const obj = new THREE.Group();
      const side = i % 2 === 0 ? -1 : 1;
      obj.position.set(side * (7.2 + (i % 3) * 1.4), 0, -i * 11);

      if (i % 3 === 0) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4 + (i % 3) * 2, 4), buildingMat);
        b.position.y = 2;
        obj.add(b);
      } else if (i % 3 === 1) {
        const stall = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.2), stallRoofMat);
        stall.position.y = 0.7;
        obj.add(stall);
      } else {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 2.2, 8), trunkMat);
        trunk.position.y = 1.1;
        obj.add(trunk);
        const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3, 1), foliageMat);
        canopy.position.y = 2.9;
        obj.add(canopy);
      }
      propsGroup.add(obj);
      roadsideObjects.push(obj);
    }
    scene.add(propsGroup);

    // Player Minibus
    const livery = CUSTOMIZATION_ITEMS.find((c) => c.id === minibusId);
    const playerBus = buildMalawianMinibus(
      livery?.primaryColor ?? '#0284C7',
      livery?.secondaryColor ?? '#F5A623',
    );
    playerBus.group.rotation.y = Math.PI;
    scene.add(playerBus.group);

    // Rival Minibus (King of the Road on Boss)
    const rivalBus = buildMalawianMinibus(
      level.isBoss ? '#DC2626' : '#059669',
      '#FDE047',
      level.isBoss,
    );
    rivalBus.group.rotation.y = Math.PI;
    scene.add(rivalBus.group);

    // Obstacles (Potholes & Traffic Cones / Carts)
    const obstacleMeshes: { mesh: THREE.Mesh; laneX: number; z: number; type: 'pothole' | 'cart' }[] = [];
    const potholeGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.05, 16);
    const potholeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 });
    const cartGeo = new THREE.BoxGeometry(1.1, 0.9, 1.3);
    const cartMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });

    for (let i = 0; i < 6; i++) {
      const isPothole = i % 2 === 0;
      const m = new THREE.Mesh(isPothole ? potholeGeo : cartGeo, isPothole ? potholeMat : cartMat);
      const laneX = ((i % 3) - 1) * 2.8;
      const z = -28 - i * 22;
      m.position.set(laneX, isPothole ? 0.04 : 0.45, z);
      scene.add(m);
      obstacleMeshes.push({ mesh: m, laneX, z, type: isPothole ? 'pothole' : 'cart' });
    }

    const particles = new PooledParticles(scene, 70, 0xf5a623);

    let uiTimer = 0;
    let boostCooldown = 0;

    const stopLoop = startPacedLoop(renderer, isSoftwareGl, (dt, elapsed) => {
      if (phaseRef.current === 'playing') {
        timeLeftRef.current = Math.max(0, timeLeftRef.current - dt);
        if (timeLeftRef.current <= 0) {
          finishRace(distRef.current >= targetDistance * 0.85);
        }

        // Speed & Boost physics
        const maxBaseSpeed = 38 + level.worldIndex * 3.5;
        let targetSpeed = inputRef.current.brake ? 14 : maxBaseSpeed;

        if (boostCooldown > 0) boostCooldown -= dt;
        const boosting = inputRef.current.boost && nitroRef.current > 4;
        if (boosting) {
          if (boostCooldown <= 0) {
            boostsUsedRef.current += 1;
            boostCooldown = 0.8;
            soundEngine.playBoost();
          }
          targetSpeed += 18;
          nitroRef.current = Math.max(0, nitroRef.current - 26 * dt);
          particles.burst(playerXRef.current, 0.45, 1.8, 2, 0x38bdf8, 4.0, 0, 0.35, 0.7);
        } else {
          nitroRef.current = Math.min(100, nitroRef.current + (inputRef.current.drift ? 18 : 5) * dt);
        }

        speedRef.current = THREE.MathUtils.damp(speedRef.current, targetSpeed, 4.5, dt);

        // Steering
        const steerInput = (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0);
        const steerSpeed = inputRef.current.drift ? 8.2 : 6.4;
        playerXRef.current = THREE.MathUtils.clamp(
          playerXRef.current + steerInput * steerSpeed * dt,
          -3.9,
          3.9,
        );

        playerBus.group.position.x = playerXRef.current;
        playerBus.bodyGroup.rotation.z = THREE.MathUtils.damp(
          playerBus.bodyGroup.rotation.z,
          steerInput * (inputRef.current.drift ? 0.16 : 0.08),
          10,
          dt,
        );
        playerBus.group.rotation.y = Math.PI - steerInput * (inputRef.current.drift ? 0.18 : 0.07);

        if (inputRef.current.drift && Math.abs(steerInput) > 0) {
          particles.burst(playerXRef.current, 0.2, 1.3, 1, 0xd6d3d1, 1.8, 0.5, 0.4, 0.6);
        }

        const stepDist = speedRef.current * dt;
        distRef.current += stepDist;
        roadTex.offset.y -= stepDist * 0.065;

        // Rival AI movement
        const rivalBase = (34 + level.worldIndex * 3.4 + (level.isBoss ? 3.5 : 0)) * dt;
        rivalDistRef.current += rivalBase + Math.sin(elapsed * 1.4) * 1.5 * dt;
        const relZ = distRef.current - rivalDistRef.current;
        rivalBus.group.position.set(
          Math.sin(elapsed * 0.9) * 2.3,
          0,
          THREE.MathUtils.clamp(relZ, -45, 25),
        );

        // Spin wheels
        for (const w of playerBus.wheels) w.rotation.x -= stepDist * 0.8;
        for (const w of rivalBus.wheels) w.rotation.x -= stepDist * 0.8;

        // Scroll roadside props & obstacles
        for (const p of roadsideObjects) {
          p.position.z += stepDist;
          if (p.position.z > 14) p.position.z -= 198;
        }

        for (const obs of obstacleMeshes) {
          obs.z += stepDist;
          if (obs.z > 12) {
            obs.z = -125 - Math.random() * 25;
            obs.laneX = (Math.floor(Math.random() * 3) - 1) * 2.8;
          }
          obs.mesh.position.set(obs.laneX, obs.type === 'pothole' ? 0.04 : 0.45, obs.z);

          if (Math.abs(obs.z) < 1.65 && Math.abs(obs.laneX - playerXRef.current) < 1.15) {
            obs.z = -130;
            crashesRef.current += 1;
            speedRef.current *= 0.52;
            shakeRef.current = 0.45;
            soundEngine.playHit(true);
            particles.burst(playerXRef.current, 0.8, 0, 14, 0xef4444, 4.0, -7, 0.55, 0.9);
          }
        }

        if (distRef.current >= targetDistance) {
          finishRace(true);
        }

        uiTimer += dt;
        if (uiTimer >= 0.1) {
          uiTimer = 0;
          setSpeedKmh(Math.round(speedRef.current * 2.4));
          setDistance(Math.min(targetDistance, Math.round(distRef.current)));
          setNitro(Math.round(nitroRef.current));
          setPositionRank(distRef.current >= rivalDistRef.current ? 1 : 2);
          setTimeLeft(Math.ceil(timeLeftRef.current));
        }
      }

      // Dynamic chase camera + FOV boost + trauma shake
      const targetFov = inputRef.current.boost && nitroRef.current > 4 ? 68 : 58;
      camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 8, dt);
      camera.updateProjectionMatrix();

      if (shakeRef.current > 0) shakeRef.current = Math.max(0, shakeRef.current - dt * 1.4);
      const s = shakeRef.current * shakeRef.current;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, playerXRef.current * 0.65, 8, dt) + (Math.random() - 0.5) * s;
      camera.position.y = 3.25 + (Math.random() - 0.5) * s;
      camera.lookAt(playerXRef.current * 0.5, 1.0, -8);

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
  }, [graphicsQuality, minibusId, level, targetDistance, finishRace]);

  return (
    <GameShellHUD
      level={level}
      phase={phase}
      outcome={outcome}
      musicEnabled={musicEnabled}
      onStartLevel={() => setPhase('playing')}
      onPauseToggle={() => setPhase((p) => (p === 'playing' ? 'paused' : 'playing'))}
      onRestart={() => {
        resetRace();
        setPhase('playing');
      }}
      onExitToLobby={onExitToLobby}
      onToggleAudio={onToggleAudio}
      onNextLevel={onNextLevel}
      hasNextLevel={hasNextLevel}
      topHudContent={
        <div className="bg-[#090d16]/90 border border-slate-700/80 rounded-xl px-4 py-1.5 flex items-center gap-4 text-xs font-mono-num">
          <div>
            <span className="text-slate-400">POS </span>
            <span className="text-amber-400 font-bold">#{positionRank}</span>
          </div>
          <div>
            <span className="text-slate-400">DIST </span>
            <span className="text-white font-bold">
              {distance}/{targetDistance}m
            </span>
          </div>
          <div>
            <span className="text-slate-400">SPD </span>
            <span className="text-sky-400 font-bold">{speedKmh} km/h</span>
          </div>
          <div>
            <span className="text-slate-400">TIME </span>
            <span className="text-emerald-400 font-bold">{timeLeft}s</span>
          </div>
        </div>
      }
    >
      <div ref={mountRef} className="w-full h-full" data-testid="minibus-3d-canvas" />

      {phase === 'playing' && (
        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-end justify-between gap-3 pointer-events-none">
          {/* Steering Touch Cluster */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              aria-label="Steer Left"
              onPointerDown={() => (inputRef.current.left = true)}
              onPointerUp={() => (inputRef.current.left = false)}
              onPointerLeave={() => (inputRef.current.left = false)}
              className="w-16 h-16 rounded-2xl bg-[#090d16]/90 border border-slate-700 active:bg-amber-500 active:text-slate-950 text-white flex items-center justify-center"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              type="button"
              aria-label="Steer Right"
              onPointerDown={() => (inputRef.current.right = true)}
              onPointerUp={() => (inputRef.current.right = false)}
              onPointerLeave={() => (inputRef.current.right = false)}
              className="w-16 h-16 rounded-2xl bg-[#090d16]/90 border border-slate-700 active:bg-amber-500 active:text-slate-950 text-white flex items-center justify-center"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>

          {/* Nitro Bar */}
          <div className="bg-[#090d16]/90 border border-slate-700/80 rounded-xl px-3 py-2 w-36 sm:w-48">
            <div className="flex justify-between text-[11px] font-semibold mb-1">
              <span className="text-sky-400">NITRO</span>
              <span className="font-mono-num text-white">{nitro}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-sky-400 transition-all" style={{ width: `${nitro}%` }} />
            </div>
          </div>

          {/* Drift & Boost Buttons */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onPointerDown={() => (inputRef.current.drift = true)}
              onPointerUp={() => (inputRef.current.drift = false)}
              onPointerLeave={() => (inputRef.current.drift = false)}
              className="min-h-[56px] px-4 rounded-2xl bg-[#090d16]/90 border border-slate-700 active:bg-amber-500 active:text-slate-950 text-amber-300 font-bold text-xs flex flex-col items-center justify-center"
            >
              <Flame className="w-4 h-4" />
              <span>Drift</span>
            </button>
            <button
              type="button"
              onPointerDown={() => (inputRef.current.boost = true)}
              onPointerUp={() => (inputRef.current.boost = false)}
              onPointerLeave={() => (inputRef.current.boost = false)}
              className="min-h-[56px] px-4 rounded-2xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-extrabold text-xs flex flex-col items-center justify-center"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Nitro</span>
            </button>
          </div>
        </div>
      )}
    </GameShellHUD>
  );
};
