import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GraphicsQuality } from '../types/game';

let cachedSoftwareGl: boolean | null = null;

export function detectSoftwareGl(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedSoftwareGl;
  } catch {
    cachedSoftwareGl = true;
    return true;
  }
}

export function createStudioRenderer(
  container: HTMLElement,
  quality: GraphicsQuality,
): {
  renderer: THREE.WebGLRenderer;
  isSoftwareGl: boolean;
  setupEnvironment: (scene: THREE.Scene) => THREE.Texture;
} {
  const isSoftwareGl = detectSoftwareGl();
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl && quality !== 'LOW',
    powerPreference: 'high-performance',
    alpha: false,
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const targetDpr =
    isSoftwareGl || quality === 'LOW'
      ? 1
      : quality === 'MEDIUM'
        ? Math.min(window.devicePixelRatio || 1, 1.5)
        : Math.min(window.devicePixelRatio || 1, 2);

  renderer.setPixelRatio(targetDpr);
  renderer.setSize(container.clientWidth || 800, container.clientHeight || 500);
  renderer.shadowMap.enabled = !isSoftwareGl && quality !== 'LOW';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const setupEnvironment = (scene: THREE.Scene) => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();
    return envTex;
  };

  return { renderer, isSoftwareGl, setupEnvironment };
}

export function startPacedLoop(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
  onTick: (dt: number, elapsed: number) => void,
): () => void {
  let stopped = false;
  let frameId = 0;
  let timerId = 0;
  const clock = new THREE.Clock();

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      timerId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (stopped) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        timerId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        timerId = window.setTimeout(cb, 80);
      }
    };
    timerId = window.setTimeout(poll, 5);
  }

  function tick() {
    if (stopped) return;
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const elapsed = clock.elapsedTime;
    onTick(dt, elapsed);
    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = window.requestAnimationFrame(tick);
    }
  }

  frameId = window.requestAnimationFrame(tick);

  return () => {
    stopped = true;
    window.cancelAnimationFrame(frameId);
    window.clearTimeout(timerId);
  };
}

export function createChitenjeTexture(
  primaryHex: string,
  secondaryHex: string,
  accentHex = '#FDF4E3',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle dark wax-print crosshatch grain
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let i = 0; i < 256; i += 8) {
    ctx.fillRect(i, 0, 2, 256);
    ctx.fillRect(0, i, 256, 2);
  }

  // Authentic Malawian chitenje sunburst medallions
  for (let y = 0; y < 256; y += 64) {
    for (let x = 0; x < 256; x += 64) {
      ctx.strokeStyle = secondaryHex;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x + 32, y + 32, 20, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x + 32, y + 32, 13, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = accentHex;
      ctx.beginPath();
      ctx.moveTo(x + 32, y + 21);
      ctx.lineTo(x + 43, y + 32);
      ctx.lineTo(x + 32, y + 43);
      ctx.lineTo(x + 21, y + 32);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = secondaryHex;
      ctx.beginPath();
      ctx.arc(x + 32, y + 32, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

export function createRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#272c38';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle asphalt grain
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect((i * 73) % 256, (i * 137) % 256, 3, 3);
  }

  // Shoulders
  ctx.fillStyle = '#d97706';
  ctx.fillRect(8, 0, 6, 256);
  ctx.fillRect(242, 0, 6, 256);

  // Dashed lane lines
  ctx.fillStyle = '#f8fafc';
  for (let y = 16; y < 256; y += 64) {
    ctx.fillRect(84, y, 5, 34);
    ctx.fillRect(167, y, 5, 34);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 14);
  return tex;
}

export function createGroundTexture(baseHex: string, grainHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = grainHex;
  for (let i = 0; i < 450; i++) {
    const x = (i * 53) % 256;
    const y = (i * 97) % 256;
    ctx.globalAlpha = 0.14;
    ctx.fillRect(x, y, 4 + (i % 5), 3 + (i % 4));
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

export function createContactShadowDisc(radius = 0.65): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,0.52)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  const geo = new THREE.CircleGeometry(radius, 24);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.015;
  return mesh;
}

interface ParticleSlot {
  active: boolean;
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
  gravity: number;
}

export class PooledParticles {
  public mesh: THREE.InstancedMesh;
  private slots: ParticleSlot[] = [];
  private cursor = 0;
  private dummy = new THREE.Object3D();
  private colorObj = new THREE.Color();

  constructor(scene: THREE.Scene, count = 80, baseColor = 0xf5a623) {
    const geo = new THREE.DodecahedronGeometry(0.08, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1,
      emissive: baseColor,
      emissiveIntensity: 0.35,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false;

    for (let i = 0; i < count; i++) {
      this.slots.push({
        active: false,
        life: 0,
        maxLife: 1,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        scale: 0,
        gravity: 0,
      });
      this.dummy.position.set(0, -999, 0);
      this.dummy.scale.set(0.001, 0.001, 0.001);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, this.colorObj.setHex(baseColor));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    scene.add(this.mesh);
  }

  public burst(
    x: number,
    y: number,
    z: number,
    count: number,
    hexColor: number,
    speed = 3.2,
    gravity = -6.0,
    maxLife = 0.65,
    scale = 1.0,
  ) {
    for (let i = 0; i < count; i++) {
      const slot = this.slots[this.cursor];
      this.cursor = (this.cursor + 1) % this.slots.length;
      const angle = Math.random() * Math.PI * 2;
      const elev = Math.random() * Math.PI * 0.6;
      const spd = speed * (0.4 + Math.random() * 0.7);
      slot.active = true;
      slot.life = maxLife * (0.7 + Math.random() * 0.5);
      slot.maxLife = slot.life;
      slot.x = x;
      slot.y = y;
      slot.z = z;
      slot.vx = Math.cos(angle) * Math.cos(elev) * spd;
      slot.vy = Math.abs(Math.sin(elev)) * spd + 0.8;
      slot.vz = Math.sin(angle) * Math.cos(elev) * spd;
      slot.scale = scale;
      slot.gravity = gravity;
      this.mesh.setColorAt(this.cursor === 0 ? this.slots.length - 1 : this.cursor - 1, this.colorObj.setHex(hexColor));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  public update(dt: number) {
    let anyChanged = false;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (!s.active) continue;
      anyChanged = true;
      s.life -= dt;
      if (s.life <= 0) {
        s.active = false;
        this.dummy.position.set(0, -999, 0);
        this.dummy.scale.set(0.001, 0.001, 0.001);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      s.vy += s.gravity * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      const t = Math.max(0.01, s.life / s.maxLife) * s.scale;
      this.dummy.position.set(s.x, s.y, s.z);
      this.dummy.scale.set(t, t, t);
      this.dummy.rotation.set(s.life * 4, s.life * 3, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (anyChanged) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
