import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  buildStylizedCharacter,
  CHARACTER_PROFILES,
  CharacterRig,
  updateCharacterAnimation,
} from '../engine/characters3d';
import { soundEngine } from '../engine/audio';
import {
  createStudioRenderer,
  PooledParticles,
  startPacedLoop,
} from '../engine/threeUtils';
import { CharacterAnimState, CharacterId, GraphicsQuality } from '../types/game';
import { CUSTOMIZATION_ITEMS } from '../data/campaigns';

interface LobbyStage3DProps {
  characterId: CharacterId;
  chitenjeId: string;
  graphicsQuality: GraphicsQuality;
  onCharacterTap?: (reaction: string) => void;
}

const REACTION_CYCLE: { anim: CharacterAnimState; line: string }[] = [
  { anim: 'celebrate', line: 'Tiye! Ready for a Malawian adventure!' },
  { anim: 'laugh', line: 'Haha! Let us cook, race, and win today!' },
  { anim: 'jump', line: 'Energy high like Sapitwa Peak!' },
  { anim: 'talk', line: 'Pick any of the 5 worlds to begin!' },
];

export const LobbyStage3D: React.FC<LobbyStage3DProps> = ({
  characterId,
  chitenjeId,
  graphicsQuality,
  onCharacterTap,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const animStateRef = useRef<CharacterAnimState>('idle');
  const animTimerRef = useRef<number>(0);
  const reactionIdxRef = useRef<number>(0);
  const rigRef = useRef<CharacterRig | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const particlesRef = useRef<PooledParticles | null>(null);
  const [speechBubble, setSpeechBubble] = useState<string>(
    'Tap hero to interact · 5 Worlds Ready',
  );

  // Rebuild character mesh cleanly when characterId or chitenje changes without recreating WebGLRenderer
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (rigRef.current) {
      scene.remove(rigRef.current.root);
    }
    const item = CUSTOMIZATION_ITEMS.find((c) => c.id === chitenjeId);
    const rig = buildStylizedCharacter(
      characterId,
      item ? { primaryColor: item.primaryColor, secondaryColor: item.secondaryColor } : undefined,
    );
    rig.root.position.set(0, 0.25, 0);
    scene.add(rig.root);
    rigRef.current = rig;
  }, [characterId, chitenjeId]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { renderer, isSoftwareGl, setupEnvironment } = createStudioRenderer(
      container,
      graphicsQuality,
    );

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x162036, 0.032);
    sceneRef.current = scene;
    const envTex = setupEnvironment(scene);

    const camera = new THREE.PerspectiveCamera(
      40,
      (container.clientWidth || 600) / (container.clientHeight || 420),
      0.1,
      100,
    );
    camera.position.set(0.25, 1.85, 4.15);
    camera.lookAt(0, 1.15, 0);

    // 3-Point Warm/Cool Studio Lighting
    const hemi = new THREE.HemisphereLight(0xfde68a, 0x0c4a6e, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 1.85);
    keyLight.position.set(3.5, 5.5, 3.5);
    if (!isSoftwareGl && graphicsQuality !== 'LOW') {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.25);
    rimLight.position.set(-3.5, 3.2, -3.5);
    scene.add(rimLight);

    // Golden sunset backdrop glow behind Mount Mulanje
    const sunsetDisc = new THREE.Mesh(
      new THREE.CircleGeometry(4.5, 32),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.24 }),
    );
    sunsetDisc.position.set(0, 2.8, -14);
    scene.add(sunsetDisc);

    // Malawian Stone Pedestal + Lake Malawi water ring + Sculpted Mulanje Ridges
    const pedestalGroup = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.78,
      metalness: 0.12,
    });
    const goldRingMat = new THREE.MeshStandardMaterial({
      color: 0xf5a623,
      roughness: 0.25,
      metalness: 0.85,
    });

    const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, 0.25, 32), stoneMat);
    baseDisc.position.y = 0.125;
    baseDisc.receiveShadow = true;
    pedestalGroup.add(baseDisc);

    const trimRing = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.03, 10, 48), goldRingMat);
    trimRing.rotation.x = Math.PI / 2;
    trimRing.position.y = 0.24;
    pedestalGroup.add(trimRing);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      roughness: 0.18,
      metalness: 0.65,
    });
    const lakePlane = new THREE.Mesh(new THREE.CircleGeometry(18, 48), waterMat);
    lakePlane.rotation.x = -Math.PI / 2;
    lakePlane.position.y = -0.01;
    lakePlane.receiveShadow = true;
    pedestalGroup.add(lakePlane);

    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.92 });
    const ridgeData = [
      { x: -6.5, z: -10.5, rx: 3.6, ry: 2.8, rz: 2.4 },
      { x: -2.4, z: -12.0, rx: 4.2, ry: 3.9, rz: 2.8 },
      { x: 2.8, z: -11.8, rx: 4.0, ry: 3.4, rz: 2.6 },
      { x: 7.0, z: -10.2, rx: 3.4, ry: 2.5, rz: 2.2 },
    ];
    ridgeData.forEach((r) => {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), ridgeMat);
      m.scale.set(r.rx, r.ry, r.rz);
      m.position.set(r.x, r.ry * 0.45, r.z);
      pedestalGroup.add(m);
    });

    const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c341d, roughness: 0.9 });
    const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
    [-2.7, 2.7].forEach((px) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 2.2, 8), palmTrunkMat);
      trunk.position.set(px, 1.1, -2.5);
      trunk.rotation.z = px < 0 ? -0.14 : 0.14;
      pedestalGroup.add(trunk);
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 1), palmLeafMat);
      crown.scale.set(1.5, 0.55, 1.2);
      crown.position.set(px * 1.06, 2.25, -2.5);
      pedestalGroup.add(crown);
    });

    scene.add(pedestalGroup);

    // Initial Character
    const item = CUSTOMIZATION_ITEMS.find((c) => c.id === chitenjeId);
    const initialRig = buildStylizedCharacter(
      characterId,
      item ? { primaryColor: item.primaryColor, secondaryColor: item.secondaryColor } : undefined,
    );
    initialRig.root.position.set(0, 0.25, 0);
    scene.add(initialRig.root);
    rigRef.current = initialRig;

    const particles = new PooledParticles(scene, 40, 0xf5a623);
    particlesRef.current = particles;

    let dustTimer = 0;
    const stopLoop = startPacedLoop(renderer, isSoftwareGl, (dt, elapsed) => {
      if (animTimerRef.current > 0) {
        animTimerRef.current -= dt;
        if (animTimerRef.current <= 0) {
          animStateRef.current = 'idle';
        }
      }

      if (rigRef.current) {
        updateCharacterAnimation(rigRef.current, animStateRef.current, elapsed, dt, 1);
        rigRef.current.root.rotation.y = Math.sin(elapsed * 0.5) * 0.16;
      }

      dustTimer += dt;
      if (dustTimer > 0.45) {
        dustTimer = 0;
        particles.burst(
          (Math.random() - 0.5) * 2.4,
          0.35,
          (Math.random() - 0.5) * 1.8,
          1,
          0xf5a623,
          0.7,
          0.4,
          1.4,
          0.5,
        );
      }
      particles.update(dt);
      renderer.render(scene, camera);
    });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 420;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphicsQuality]);

  const handleStageTap = () => {
    const next = REACTION_CYCLE[reactionIdxRef.current % REACTION_CYCLE.length];
    reactionIdxRef.current++;
    animStateRef.current = next.anim;
    animTimerRef.current = 1.65;
    setSpeechBubble(next.line);
    soundEngine.playPickup();
    particlesRef.current?.burst(0, 1.3, 0.3, 12, 0xf5a623, 2.8, -4.0, 0.7, 0.9);
    onCharacterTap?.(next.line);
  };

  const profile = CHARACTER_PROFILES[characterId];

  return (
    <div className="relative w-full h-full min-h-[280px] rounded-2xl overflow-hidden bg-[#0b1220] border border-slate-800/80">
      <div
        ref={mountRef}
        data-testid="lobby-3d-canvas"
        onClick={handleStageTap}
        className="w-full h-full cursor-pointer"
        aria-label={`Interactive 3D showcase of ${profile.displayName}`}
      />
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
        <div className="bg-[#090d16]/90 border border-slate-700/70 rounded-xl px-3 py-2">
          <div className="text-sm font-bold text-white leading-tight font-display">
            {profile.displayName}
          </div>
          <div className="text-xs text-amber-400">{profile.role}</div>
        </div>
        <button
          type="button"
          onClick={handleStageTap}
          className="pointer-events-auto min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
        >
          Interact
        </button>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex justify-center">
        <div className="bg-[#090d16]/92 border border-slate-700/70 rounded-xl px-3.5 py-2 text-xs text-slate-200 text-center max-w-sm">
          {speechBubble}
        </div>
      </div>
    </div>
  );
};
