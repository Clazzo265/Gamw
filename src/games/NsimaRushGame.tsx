import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Flame, Droplets, Sparkles, Utensils, ChefHat } from 'lucide-react';
import { GameShellHUD } from '../components/GameShellHUD';
import { CUSTOMIZATION_ITEMS } from '../data/campaigns';
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
  applyAddWater,
  applyPourFlour,
  applyStirStroke,
  createInitialPotState,
  evaluateOrderScore,
  NsimaPotState,
  stepPotPhysics,
} from '../gameLogic/nsimaRules';
import { calculateStarsForScore } from '../state/store';
import { CharacterAnimState, GraphicsQuality, LevelConfig, LevelOutcome } from '../types/game';

interface NsimaRushGameProps {
  level: LevelConfig;
  graphicsQuality: GraphicsQuality;
  chitenjeId: string;
  musicEnabled: boolean;
  autostart: boolean;
  hasNextLevel: boolean;
  onToggleAudio: () => void;
  onComplete: (outcome: LevelOutcome) => void;
  onExitToLobby: () => void;
  onNextLevel: () => void;
}

const RELISH_OPTIONS = ['Chambo & Tomato', 'Bonongwe & Onion', 'Village Stew'] as const;

export const NsimaRushGame: React.FC<NsimaRushGameProps> = ({
  level,
  graphicsQuality,
  chitenjeId,
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

  const targetOrders = level.isBoss ? level.worldIndex + 2 : Math.min(5, 1 + Math.ceil((level.worldIndex + level.levelIndex) / 2));
  const [ordersDone, setOrdersDone] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(level.timeLimitSec);
  const [potState, setPotState] = useState<NsimaPotState>(createInitialPotState);
  const [wantedRelish, setWantedRelish] = useState<string>(RELISH_OPTIONS[0]);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('Add water & fan the charcoal stove!');
  const [outcome, setOutcome] = useState<LevelOutcome | null>(null);

  // Mutable simulation refs so Three.js canvas never remounts
  const potRef = useRef<NsimaPotState>(createInitialPotState());
  const fanActiveRef = useRef(false);
  const chefAnimRef = useRef<CharacterAnimState>('idle');
  const chefAnimTimerRef = useRef(0);
  const scoreRef = useRef(0);
  const ordersRef = useRef(0);
  const burntCountRef = useRef(0);
  const comboRef = useRef(1);
  const timeLeftRef = useRef(level.timeLimitSec);
  const orderPatienceRef = useRef(26);
  const maxOrderPatienceRef = useRef(26);
  const particlesRef = useRef<PooledParticles | null>(null);
  const potContentsMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const potContentsMeshRef = useRef<THREE.Mesh | null>(null);
  const emberMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  const resetSimulation = useCallback(() => {
    const freshPot = createInitialPotState();
    potRef.current = freshPot;
    setPotState(freshPot);
    scoreRef.current = 0;
    ordersRef.current = 0;
    burntCountRef.current = 0;
    comboRef.current = 1;
    timeLeftRef.current = level.timeLimitSec;
    orderPatienceRef.current = Math.max(16, 28 - level.worldIndex * 2);
    maxOrderPatienceRef.current = orderPatienceRef.current;
    setScore(0);
    setOrdersDone(0);
    setTimeLeft(level.timeLimitSec);
    setWantedRelish(RELISH_OPTIONS[0]);
    setFeedbackMsg('Add water & fan the charcoal stove!');
    setOutcome(null);
    chefAnimRef.current = 'idle';
  }, [level]);

  useEffect(() => {
    resetSimulation();
    setPhase(autostart ? 'playing' : 'intro');
  }, [level.id, autostart, resetSimulation]);

  const finishGame = useCallback(
    (victory: boolean) => {
      if (phaseRef.current === 'gameover') return;
      const finalScore = scoreRef.current;
      const stars = calculateStarsForScore(finalScore, level.starThresholds, victory);
      const bonusAchieved = victory && burntCountRef.current === 0;
      const result: LevelOutcome = {
        levelId: level.id,
        gameId: 'nsima-rush',
        victory,
        score: finalScore,
        stars,
        bonusAchieved,
        durationSec: Math.max(1, level.timeLimitSec - timeLeftRef.current),
        metrics: [
          { label: 'Orders Served', value: `${ordersRef.current}/${targetOrders}` },
          { label: 'Burnt Pots', value: `${burntCountRef.current}` },
        ],
      };
      if (victory) {
        chefAnimRef.current = 'victory';
        soundEngine.playVictory();
      } else {
        chefAnimRef.current = 'defeat';
        soundEngine.playDefeat();
      }
      setOutcome(result);
      setPhase('gameover');
      onComplete(result);
    },
    [level, targetOrders, onComplete],
  );

  // Actions
  const handleAddWater = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const next = applyAddWater(potRef.current, 28);
    potRef.current = next;
    setPotState(next);
    chefAnimRef.current = 'pour';
    chefAnimTimerRef.current = 0.6;
    soundEngine.playPickup();
    particlesRef.current?.burst(0, 1.32, 0.25, 8, 0x38bdf8, 1.8, -5, 0.45, 0.6);
    setFeedbackMsg(next.waterLevel >= 75 ? 'Water ready! Heat to 55°+ then pour ufa!' : 'Water added to the pot!');
  }, []);

  const handleFanStove = useCallback((active: boolean) => {
    fanActiveRef.current = active;
    if (active && phaseRef.current === 'playing') {
      soundEngine.playSizzle();
      particlesRef.current?.burst(0, 0.85, 0.25, 5, 0xf97316, 1.4, 1.2, 0.4, 0.5);
    }
  }, []);

  const handlePourFlour = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    if (potRef.current.phase !== 'pour') {
      setFeedbackMsg('Wait until water >= 75% and heat >= 55° before pouring ufa!');
      return;
    }
    const next = applyPourFlour(potRef.current, 25);
    potRef.current = next;
    setPotState(next);
    chefAnimRef.current = 'pour';
    chefAnimTimerRef.current = 0.55;
    soundEngine.playPickup();
    particlesRef.current?.burst(0, 1.4, 0.25, 10, 0xfef3c7, 1.6, -4.5, 0.5, 0.55);
    setFeedbackMsg(next.phase === 'stir' ? 'Ufa added! Stir briskly with the mthiko!' : 'Pouring maize flour smoothly...');
  }, []);

  const handleStir = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    if (potRef.current.phase !== 'stir' && potRef.current.phase !== 'pour') {
      setFeedbackMsg('Pour ufa flour first before stirring!');
      return;
    }
    const next = applyStirStroke(potRef.current, 22);
    potRef.current = next;
    setPotState(next);
    chefAnimRef.current = 'stir';
    chefAnimTimerRef.current = 0.45;
    soundEngine.playStir();
    particlesRef.current?.burst(0, 1.32, 0.25, 5, 0xfde68a, 1.5, 0.8, 0.35, 0.45);
    if (next.phase === 'relish') {
      setFeedbackMsg('Smooth velvety nsima! Select the matching relish!');
    }
  }, []);

  const handleSelectRelish = useCallback(
    (relish: string) => {
      if (phaseRef.current !== 'playing') return;
      if (potRef.current.phase !== 'relish') {
        setFeedbackMsg('Finish stirring the nsima before plating relish!');
        return;
      }
      const match = relish === wantedRelish;
      const next = { ...potRef.current, relishAdded: true, phase: 'ready' as const };
      potRef.current = next;
      setPotState(next);
      chefAnimRef.current = 'celebrate';
      chefAnimTimerRef.current = 0.6;
      soundEngine.playPickup();
      if (!match) {
        comboRef.current = 1;
        setFeedbackMsg('Wrong relish! Served anyway, combo reset.');
      } else {
        setFeedbackMsg('Platter ready! Tap Serve Platter now!');
      }
    },
    [wantedRelish],
  );

  const handleServe = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    if (potRef.current.phase !== 'ready') {
      setFeedbackMsg('Finish cooking & plating relish before serving!');
      return;
    }
    const patienceRatio = orderPatienceRef.current / maxOrderPatienceRef.current;
    const pts = evaluateOrderScore(potRef.current, patienceRatio, comboRef.current);
    scoreRef.current += pts;
    ordersRef.current += 1;
    comboRef.current = Math.min(2.5, comboRef.current + 0.25);

    setScore(scoreRef.current);
    setOrdersDone(ordersRef.current);
    soundEngine.playVictory();
    particlesRef.current?.burst(1.1, 1.4, 0.3, 18, 0xf5a623, 3.0, -5.0, 0.7, 0.8);

    if (ordersRef.current >= targetOrders) {
      finishGame(true);
      return;
    }

    const fresh = createInitialPotState();
    potRef.current = fresh;
    setPotState(fresh);
    orderPatienceRef.current = maxOrderPatienceRef.current;
    setWantedRelish(RELISH_OPTIONS[ordersRef.current % RELISH_OPTIONS.length]);
    setFeedbackMsg(`Order served (+${pts})! Next platter started!`);
  }, [targetOrders, finishGame]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return;
      if (e.key === '1') handleFanStove(true);
      if (e.key === '2') handleAddWater();
      if (e.key === '3') handlePourFlour();
      if (e.key === '4' || e.key.toLowerCase() === 's') handleStir();
      if (e.key === '5') handleSelectRelish(wantedRelish);
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleServe();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === '1') handleFanStove(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleFanStove, handleAddWater, handlePourFlour, handleStir, handleSelectRelish, handleServe, wantedRelish]);

  // Three.js 3D Malawian Kitchen Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { renderer, isSoftwareGl, setupEnvironment } = createStudioRenderer(container, graphicsQuality);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1f140e);
    scene.fog = new THREE.FogExp2(0x1f140e, 0.05);
    const envTex = setupEnvironment(scene);

    const camera = new THREE.PerspectiveCamera(
      46,
      (container.clientWidth || 800) / (container.clientHeight || 500),
      0.1,
      60,
    );
    camera.position.set(0.35, 2.45, 4.15);
    camera.lookAt(0, 1.2, 0);

    // Warm Kitchen Lighting
    scene.add(new THREE.HemisphereLight(0xfde68a, 0x451a03, 0.8));
    const sunLight = new THREE.DirectionalLight(0xffedd5, 1.85);
    sunLight.position.set(3, 5, 4);
    if (!isSoftwareGl && graphicsQuality !== 'LOW') {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(1024, 1024);
      sunLight.shadow.bias = -0.0005;
    }
    scene.add(sunLight);

    // Floor & Terracotta Kitchen Walls
    const floorMat = new THREE.MeshStandardMaterial({
      map: createGroundTexture('#5c341d', '#3e2010'),
      color: 0xffffff,
      roughness: 0.88,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x7c4627, roughness: 0.85 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 0.3), wallMat);
    backWall.position.set(0, 2.5, -2.1);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Sunlit Kitchen Window with Wooden Frame & Shutters + Wall Shelf
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const windowSky = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.2),
      new THREE.MeshBasicMaterial({ color: 0xfde68a }),
    );
    windowSky.position.set(-2.3, 2.45, -1.94);
    scene.add(windowSky);
    const shutterL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.28, 0.08), windowFrameMat);
    shutterL.position.set(-3.1, 2.45, -1.92);
    scene.add(shutterL);
    const shutterR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.28, 0.08), windowFrameMat);
    shutterR.position.set(-1.5, 2.45, -1.92);
    scene.add(shutterR);

    // Wooden Wall Shelf with Clay Mtsuko Water Pot & Bowls
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.42), windowFrameMat);
    shelf.position.set(1.4, 2.35, -1.8);
    scene.add(shelf);
    const clayPotMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.72 });
    const mtsuko = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), clayPotMat);
    mtsuko.position.set(2.1, 2.62, -1.8);
    scene.add(mtsuko);
    const bowlMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    const stackBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.18, 16), bowlMat);
    stackBowl.position.set(0.95, 2.5, -1.8);
    scene.add(stackBowl);

    // Mud-Brick Kitchen Counter + Charcoal Mbawula Stove
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x9a5b34, roughness: 0.82 });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 1.2), counterMat);
    counter.position.set(0.2, 0.45, 0.25);
    counter.receiveShadow = true;
    counter.castShadow = true;
    scene.add(counter);

    // Mbawula charcoal stove (shifted slightly right so Chef stands clearly beside it!)
    const stoveMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7, metalness: 0.45 });
    const stove = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.36, 18), stoveMat);
    stove.position.set(0.25, 1.06, 0.25);
    scene.add(stove);

    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      emissive: 0xf97316,
      emissiveIntensity: 1.4,
      roughness: 0.6,
    });
    emberMatRef.current = emberMat;
    const embers = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 14), emberMat);
    embers.position.set(0.25, 1.22, 0.25);
    scene.add(embers);

    // Cooking Pot + Dynamic Nsima Surface
    const potMetalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.28, metalness: 0.82 });
    const potBody = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.38, 0.34, 24, 1, true), potMetalMat);
    potBody.material.side = THREE.DoubleSide;
    potBody.position.set(0.25, 1.38, 0.25);
    potBody.castShadow = true;
    scene.add(potBody);

    const potRim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.025, 10, 28), potMetalMat);
    potRim.rotation.x = Math.PI / 2;
    potRim.position.set(0.25, 1.55, 0.25);
    scene.add(potRim);

    const potContentsMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.35,
      metalness: 0.1,
    });
    potContentsMatRef.current = potContentsMat;
    const potContents = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.38, 0.16, 20), potContentsMat);
    potContents.position.set(0.25, 1.35, 0.25);
    potContentsMeshRef.current = potContents;
    scene.add(potContents);

    // Props: Maize Flour Sack, Tomatoes, Bonongwe Greens, Serving Platter
    const sackMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.9 });
    const flourSack = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.48, 12), sackMat);
    flourSack.position.set(-1.35, 1.14, 0.25);
    scene.add(flourSack);

    const tomatoMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.25 });
    for (let i = 0; i < 4; i++) {
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), tomatoMat);
      t.position.set(-0.75 + (i % 2) * 0.15, 0.97, 0.15 + Math.floor(i / 2) * 0.14);
      scene.add(t);
    }

    const greensMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const greens = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), greensMat);
    greens.scale.set(1.2, 0.6, 1.1);
    greens.position.set(-0.45, 0.97, 0.48);
    scene.add(greens);

    const platterMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 0.05, 22), platterMat);
    platter.position.set(1.5, 0.93, 0.25);
    scene.add(platter);

    // Chef Chimwemwe beside the stove so her full animated upper body & apron are clearly visible!
    const chitenjeItem = CUSTOMIZATION_ITEMS.find((c) => c.id === chitenjeId);
    const chefRig: CharacterRig = buildStylizedCharacter(
      'chef_chimwemwe',
      chitenjeItem
        ? { primaryColor: chitenjeItem.primaryColor, secondaryColor: chitenjeItem.secondaryColor }
        : undefined,
    );
    chefRig.root.position.set(-0.68, 0.08, -0.58);
    chefRig.root.rotation.y = 0.42;
    scene.add(chefRig.root);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.72 });
    const mthiko = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.72, 10), woodMat);
    mthiko.position.set(0, -0.18, 0.2);
    mthiko.rotation.x = Math.PI / 2.6;
    chefRig.rightHandAnchor.add(mthiko);

    const particles = new PooledParticles(scene, 70, 0xf8fafc);
    particlesRef.current = particles;

    let uiSyncAcc = 0;
    let steamAcc = 0;

    const stopLoop = startPacedLoop(renderer, isSoftwareGl, (dt, elapsed) => {
      if (phaseRef.current === 'playing') {
        timeLeftRef.current = Math.max(0, timeLeftRef.current - dt);
        orderPatienceRef.current = Math.max(0, orderPatienceRef.current - dt);

        if (timeLeftRef.current <= 0) {
          finishGame(ordersRef.current >= targetOrders);
        }

        const nextPot = stepPotPhysics(potRef.current, dt, level.worldIndex, fanActiveRef.current);
        if (nextPot.phase === 'burnt') {
          burntCountRef.current += 1;
          comboRef.current = 1;
          chefAnimRef.current = 'reactFail';
          chefAnimTimerRef.current = 1.0;
          soundEngine.playHit(true);
          particles.burst(0, 1.5, 0.25, 16, 0x334155, 2.2, 1.2, 0.8, 1.0);
          const fresh = createInitialPotState();
          potRef.current = fresh;
          setPotState(fresh);
          setFeedbackMsg('Pot burnt! Resetting pot — keep heat below 85°!');
        } else {
          potRef.current = nextPot;
        }

        if (orderPatienceRef.current <= 0) {
          comboRef.current = 1;
          orderPatienceRef.current = maxOrderPatienceRef.current;
          setFeedbackMsg('Customer lost patience! Combo reset — hurry!');
        }

        uiSyncAcc += dt;
        if (uiSyncAcc >= 0.12) {
          uiSyncAcc = 0;
          setPotState({ ...potRef.current });
          setTimeLeft(Math.ceil(timeLeftRef.current));
        }
      }

      // Visual updates for pot liquid/nsima & stove glow
      if (potContentsMatRef.current && potContentsMeshRef.current) {
        const p = potRef.current;
        const flourRatio = p.flourAdded / 100;
        if (p.burnMeter > 35) {
          potContentsMatRef.current.color.setHex(0x78350f);
        } else if (flourRatio > 0.2) {
          potContentsMatRef.current.color.lerpColors(
            new THREE.Color(0xbae6fd),
            new THREE.Color(0xfefce8),
            flourRatio,
          );
        } else {
          potContentsMatRef.current.color.setHex(0x38bdf8);
        }
        const levelScale = 0.35 + (p.waterLevel / 100) * 0.65;
        potContentsMeshRef.current.scale.y = levelScale;
      }

      if (emberMatRef.current) {
        emberMatRef.current.emissiveIntensity = 0.6 + (potRef.current.temperature / 100) * 1.8;
      }

      steamAcc += dt;
      if (steamAcc > 0.22 && potRef.current.temperature > 50) {
        steamAcc = 0;
        particles.burst(
          (Math.random() - 0.5) * 0.3,
          1.52,
          0.25,
          1,
          potRef.current.burnMeter > 40 ? 0x475569 : 0xf1f5f9,
          0.6,
          0.9,
          0.9,
          0.55,
        );
      }

      if (chefAnimTimerRef.current > 0) {
        chefAnimTimerRef.current -= dt;
        if (chefAnimTimerRef.current <= 0 && phaseRef.current === 'playing') {
          chefAnimRef.current = 'idle';
        }
      }
      updateCharacterAnimation(chefRig, chefAnimRef.current, elapsed, dt, 1);
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
  }, [graphicsQuality, chitenjeId, level, targetOrders, finishGame]);

  const tempColor =
    potState.temperature > 85
      ? 'bg-rose-500'
      : potState.temperature >= 55
        ? 'bg-emerald-500'
        : 'bg-sky-500';

  return (
    <GameShellHUD
      level={level}
      phase={phase}
      outcome={outcome}
      musicEnabled={musicEnabled}
      onStartLevel={() => setPhase('playing')}
      onPauseToggle={() => setPhase((p) => (p === 'playing' ? 'paused' : 'playing'))}
      onRestart={() => {
        resetSimulation();
        setPhase('playing');
      }}
      onExitToLobby={onExitToLobby}
      onToggleAudio={onToggleAudio}
      onNextLevel={onNextLevel}
      hasNextLevel={hasNextLevel}
      topHudContent={
        <div className="bg-[#090d16]/90 border border-slate-700/80 rounded-xl px-4 py-1.5 flex items-center gap-4 text-xs font-mono-num">
          <div>
            <span className="text-slate-400">ORDERS </span>
            <span className="text-amber-400 font-bold" data-testid="nsima-orders">
              {ordersDone}/{targetOrders}
            </span>
          </div>
          <div>
            <span className="text-slate-400">SCORE </span>
            <span className="text-white font-bold" data-testid="nsima-score">
              {score}
            </span>
          </div>
          <div>
            <span className="text-slate-400">TIME </span>
            <span className={`${timeLeft <= 15 ? 'text-rose-400' : 'text-emerald-400'} font-bold`}>
              {timeLeft}s
            </span>
          </div>
        </div>
      }
    >
      {/* Isolated WebGL Mount */}
      <div ref={mountRef} className="w-full h-full" data-testid="nsima-3d-canvas" />

      {/* Active Order + Cooking Meters */}
      {phase === 'playing' && (
        <>
          <div className="pointer-events-none absolute top-16 left-3 right-3 flex flex-wrap items-start justify-between gap-2 z-10">
            <div className="bg-[#090d16]/90 border border-amber-500/40 rounded-xl px-3.5 py-2.5 max-w-xs">
              <div className="text-[11px] text-amber-400 font-semibold">
                Order #{ordersDone + 1} · {wantedRelish}
              </div>
              <div className="text-xs text-slate-200 mt-0.5">{feedbackMsg}</div>
            </div>

            <div className="bg-[#090d16]/90 border border-slate-700/80 rounded-xl p-3 w-56 space-y-2 text-[11px]">
              <div>
                <div className="flex justify-between text-slate-300 mb-0.5">
                  <span>Heat (Target 55–82°)</span>
                  <span className="font-mono-num font-bold">{Math.round(potState.temperature)}°</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all ${tempColor}`}
                    style={{ width: `${Math.round(potState.temperature)}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center font-mono-num">
                <div className="bg-slate-900 rounded-lg py-1">
                  <div className="text-[10px] text-slate-400">Water</div>
                  <div className="text-sky-400 font-bold">{Math.round(potState.waterLevel)}%</div>
                </div>
                <div className="bg-slate-900 rounded-lg py-1">
                  <div className="text-[10px] text-slate-400">Ufa</div>
                  <div className="text-amber-300 font-bold">{Math.round(potState.flourAdded)}%</div>
                </div>
                <div className="bg-slate-900 rounded-lg py-1">
                  <div className="text-[10px] text-slate-400">Stir</div>
                  <div className="text-emerald-400 font-bold">{Math.round(potState.stirProgress)}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Touch Kitchen Control Dock */}
          <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-col items-center gap-2 pointer-events-none">
            {potState.phase === 'relish' && (
              <div className="pointer-events-auto flex flex-wrap justify-center gap-2 bg-[#090d16]/95 border border-amber-500/50 rounded-xl p-2">
                {RELISH_OPTIONS.map((rel) => (
                  <button
                    key={rel}
                    type="button"
                    onClick={() => handleSelectRelish(rel)}
                    className={`min-h-[42px] px-3 rounded-lg text-xs font-bold transition-colors ${
                      rel === wantedRelish
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    Plate {rel}
                  </button>
                ))}
              </div>
            )}

            <div className="pointer-events-auto w-full max-w-2xl bg-[#090d16]/92 border border-slate-700/80 rounded-2xl p-2 grid grid-cols-5 gap-1.5 sm:gap-2">
              <button
                type="button"
                onPointerDown={() => handleFanStove(true)}
                onPointerUp={() => handleFanStove(false)}
                onPointerLeave={() => handleFanStove(false)}
                onClick={() => {
                  handleFanStove(true);
                  window.setTimeout(() => handleFanStove(false), 320);
                }}
                className="min-h-[52px] rounded-xl bg-orange-600/90 hover:bg-orange-500 active:scale-95 text-white flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-transform"
              >
                <Flame className="w-4 h-4" />
                <span>Fan [1]</span>
              </button>

              <button
                type="button"
                onClick={handleAddWater}
                className={`min-h-[52px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold active:scale-95 transition-all ${
                  potState.phase === 'boil'
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Droplets className="w-4 h-4" />
                <span>Water [2]</span>
              </button>

              <button
                type="button"
                onClick={handlePourFlour}
                className={`min-h-[52px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold active:scale-95 transition-all ${
                  potState.phase === 'pour'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <ChefHat className="w-4 h-4" />
                <span>Pour Ufa [3]</span>
              </button>

              <button
                type="button"
                onClick={handleStir}
                className={`min-h-[52px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold active:scale-95 transition-all ${
                  potState.phase === 'stir'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span>Stir [4]</span>
              </button>

              <button
                type="button"
                onClick={handleServe}
                className={`min-h-[52px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold active:scale-95 transition-all ${
                  potState.phase === 'ready'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Serve [Space]</span>
              </button>
            </div>
          </div>
        </>
      )}
    </GameShellHUD>
  );
};
