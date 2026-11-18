import * as THREE from 'three';
import { CharacterAnimState, CharacterId } from '../types/game';
import { createChitenjeTexture, createContactShadowDisc } from './threeUtils';

export interface CharacterProfile {
  id: CharacterId;
  displayName: string;
  role: string;
  skinHex: number;
  chitenjePrimary: string;
  chitenjeSecondary: string;
  topHex: number;
  hairStyle: 'braids' | 'afro' | 'duku' | 'hat' | 'elder' | 'visor';
  hasApron?: boolean;
  hasBackpack?: boolean;
  hasBeard?: boolean;
  buildScale?: number;
}

export const CHARACTER_PROFILES: Record<CharacterId, CharacterProfile> = {
  chef_chimwemwe: {
    id: 'chef_chimwemwe',
    displayName: 'Chef Chimwemwe',
    role: 'Master of the Mbawula',
    skinHex: 0x6b3e26,
    chitenjePrimary: '#0EA5E9',
    chitenjeSecondary: '#F59E0B',
    topHex: 0x0284c7,
    hairStyle: 'braids',
    hasApron: true,
    buildScale: 1.0,
  },
  zuri: {
    id: 'zuri',
    displayName: 'Zuri Banda',
    role: 'Swift Scholar',
    skinHex: 0x5c331c,
    chitenjePrimary: '#4F46E5',
    chitenjeSecondary: '#FACC15',
    topHex: 0x3730a3,
    hairStyle: 'braids',
    buildScale: 0.96,
  },
  amara: {
    id: 'amara',
    displayName: 'Amara Phiri',
    role: 'Executive Striker',
    skinHex: 0x73442a,
    chitenjePrimary: '#DC2626',
    chitenjeSecondary: '#F59E0B',
    topHex: 0x991b1b,
    hairStyle: 'afro',
    buildScale: 1.05,
  },
  farmer_byson: {
    id: 'farmer_byson',
    displayName: 'Farmer Byson',
    role: 'Highland Powerhouse',
    skinHex: 0x4f2b17,
    chitenjePrimary: '#15803D',
    chitenjeSecondary: '#FDE047',
    topHex: 0x166534,
    hairStyle: 'hat',
    buildScale: 1.14,
  },
  market_queen: {
    id: 'market_queen',
    displayName: 'Mayi Chikondi',
    role: 'Market Queen',
    skinHex: 0x62371f,
    chitenjePrimary: '#DB2777',
    chitenjeSecondary: '#FBBF24',
    topHex: 0xbe185d,
    hairStyle: 'duku',
    buildScale: 1.02,
  },
  village_elder: {
    id: 'village_elder',
    displayName: 'Gogo Mtendere',
    role: 'Village Elder',
    skinHex: 0x59321c,
    chitenjePrimary: '#7C3AED',
    chitenjeSecondary: '#EAB308',
    topHex: 0x5b21b6,
    hairStyle: 'elder',
    hasBeard: true,
    buildScale: 1.0,
  },
  street_legend: {
    id: 'street_legend',
    displayName: 'Kondwani Turbo',
    role: 'Lilongwe Street Legend',
    skinHex: 0x693b23,
    chitenjePrimary: '#EA580C',
    chitenjeSecondary: '#38BDF8',
    topHex: 0x1e293b,
    hairStyle: 'visor',
    buildScale: 1.04,
  },
  explorer_talandira: {
    id: 'explorer_talandira',
    displayName: 'Talandira',
    role: 'Mulanje Pathfinder',
    skinHex: 0x6b3e26,
    chitenjePrimary: '#059669',
    chitenjeSecondary: '#F59E0B',
    topHex: 0xb45309,
    hairStyle: 'braids',
    hasBackpack: true,
    buildScale: 0.98,
  },
  savings_leader: {
    id: 'savings_leader',
    displayName: 'Mayi Chisomo',
    role: 'Chipereganyu Leader',
    skinHex: 0x5e341e,
    chitenjePrimary: '#0D9488',
    chitenjeSecondary: '#F59E0B',
    topHex: 0x0f766e,
    hairStyle: 'duku',
    buildScale: 1.02,
  },
};

export interface CharacterRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftBrow: THREE.Mesh;
  rightBrow: THREE.Mesh;
  leftEyelid: THREE.Mesh;
  rightEyelid: THREE.Mesh;
  mouth: THREE.Mesh;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  rightHandAnchor: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  blinkTimer: number;
  talkPhase: number;
  bodyParts: THREE.Mesh[];
}

export function buildStylizedCharacter(
  characterId: CharacterId,
  customChitenje?: { primaryColor: string; secondaryColor: string },
): CharacterRig {
  const profile = CHARACTER_PROFILES[characterId] ?? CHARACTER_PROFILES.chef_chimwemwe;
  const chitenjeTex = createChitenjeTexture(
    customChitenje?.primaryColor ?? profile.chitenjePrimary,
    customChitenje?.secondaryColor ?? profile.chitenjeSecondary,
  );

  const skinMat = new THREE.MeshStandardMaterial({
    color: profile.skinHex,
    roughness: 0.48,
    metalness: 0.04,
  });

  const topMat = new THREE.MeshStandardMaterial({
    color: profile.topHex,
    roughness: 0.65,
    metalness: 0.05,
  });

  const chitenjeMat = new THREE.MeshStandardMaterial({
    map: chitenjeTex,
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.0,
  });

  const accentGoldMat = new THREE.MeshStandardMaterial({
    color: 0xf5a623,
    roughness: 0.25,
    metalness: 0.85,
  });

  const darkHairMat = new THREE.MeshStandardMaterial({
    color: profile.hairStyle === 'elder' ? 0xcbd5e1 : 0x171210,
    roughness: 0.78,
    metalness: 0.05,
  });

  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.55,
    metalness: 0.15,
  });

  const bodyParts: THREE.Mesh[] = [];
  const register = (mesh: THREE.Mesh, cast = true) => {
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    bodyParts.push(mesh);
    return mesh;
  };

  const root = new THREE.Group();
  const s = profile.buildScale ?? 1.0;
  root.scale.set(s, s, s);

  const shadowDisc = createContactShadowDisc(0.58);
  root.add(shadowDisc);

  // Hips (bottom-center grounded around y = 0.85)
  const hips = new THREE.Group();
  hips.position.y = 0.88;
  root.add(hips);

  const pelvis = register(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.22, 16), chitenjeMat));
  hips.add(pelvis);

  // Chitenje wrap skirt / lower garment
  const wrapGeo = new THREE.CylinderGeometry(0.225, 0.29, 0.44, 18);
  const wrap = register(new THREE.Mesh(wrapGeo, chitenjeMat));
  wrap.position.y = -0.18;
  hips.add(wrap);

  // Torso
  const torso = new THREE.Group();
  torso.position.y = 0.12;
  hips.add(torso);

  const chestMesh = register(new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.185, 0.46, 18), topMat));
  chestMesh.position.y = 0.23;
  torso.add(chestMesh);

  // Rounded shoulder yoke for smooth animated silhouette
  const shoulderYoke = register(new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 12), topMat));
  shoulderYoke.scale.set(1.18, 0.42, 0.85);
  shoulderYoke.position.y = 0.42;
  torso.add(shoulderYoke);

  // Collar / Gold necklace detail
  const collar = register(new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.02, 10, 24), accentGoldMat));
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.46, 0.02);
  torso.add(collar);

  // Optional Cooking Apron (earthy linen with chitenje pocket)
  if (profile.hasApron) {
    const apronMat = new THREE.MeshStandardMaterial({ color: 0x44352c, roughness: 0.88 });
    const apronBib = register(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.36, 0.04), apronMat));
    apronBib.position.set(0, 0.23, 0.2);
    torso.add(apronBib);
    const apronSkirt = register(new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.295, 0.36, 16, 1, false, -0.9, 1.8), apronMat));
    apronSkirt.position.set(0, -0.25, 0.01);
    hips.add(apronSkirt);
    const apronPocket = register(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.045), chitenjeMat));
    apronPocket.position.set(0, 0.14, 0.21);
    torso.add(apronPocket);
  }

  // Optional Explorer Backpack
  if (profile.hasBackpack) {
    const packMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });
    const pack = register(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.18), packMat));
    pack.position.set(0, 0.25, -0.24);
    torso.add(pack);
    const bedroll = register(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 12), chitenjeMat));
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 0.46, -0.24);
    torso.add(bedroll);
  }

  // Head & Expressive Face
  const head = new THREE.Group();
  head.position.y = 0.52;
  torso.add(head);

  const neck = register(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.12, 14), skinMat));
  neck.position.y = 0.02;
  head.add(neck);

  const cranium = register(new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 20), skinMat));
  cranium.scale.set(0.95, 1.06, 0.98);
  cranium.position.y = 0.22;
  head.add(cranium);

  // Ears
  const earGeo = new THREE.SphereGeometry(0.045, 10, 10);
  const leftEar = register(new THREE.Mesh(earGeo, skinMat));
  leftEar.position.set(-0.2, 0.21, 0);
  head.add(leftEar);
  const rightEar = register(new THREE.Mesh(earGeo, skinMat));
  rightEar.position.set(0.2, 0.21, 0);
  head.add(rightEar);

  // Gold earrings for expressiveness
  if (characterId === 'chef_chimwemwe' || characterId === 'market_queen' || characterId === 'zuri') {
    const hoopGeo = new THREE.TorusGeometry(0.032, 0.007, 8, 16);
    const lHoop = register(new THREE.Mesh(hoopGeo, accentGoldMat));
    lHoop.position.set(-0.21, 0.16, 0);
    lHoop.rotation.y = Math.PI / 2;
    head.add(lHoop);
    const rHoop = register(new THREE.Mesh(hoopGeo, accentGoldMat));
    rHoop.position.set(0.21, 0.16, 0);
    rHoop.rotation.y = Math.PI / 2;
    head.add(rHoop);
  }

  // Eyes (sclera + dark iris + bright specular dot)
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xfefefe, roughness: 0.15 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x24130a, roughness: 0.1, metalness: 0.1 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const makeEye = (side: -1 | 1) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.075, 0.24, 0.175);
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 12), scleraMat);
    sclera.scale.set(1.05, 0.92, 0.65);
    eyeGroup.add(sclera);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), irisMat);
    iris.position.z = 0.018;
    eyeGroup.add(iris);

    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 6), glintMat);
    glint.position.set(0.008, 0.009, 0.034);
    eyeGroup.add(glint);

    const eyelid = new THREE.Mesh(new THREE.SphereGeometry(0.039, 10, 10), skinMat);
    eyelid.scale.set(1.1, 0.15, 0.8);
    eyelid.position.set(0, 0.028, 0.004);
    eyeGroup.add(eyelid);

    head.add(eyeGroup);
    return eyelid;
  };

  const leftEyelid = makeEye(-1);
  const rightEyelid = makeEye(1);

  // Eyebrows
  const browGeo = new THREE.BoxGeometry(0.075, 0.018, 0.02);
  const leftBrow = new THREE.Mesh(browGeo, darkHairMat);
  leftBrow.position.set(-0.075, 0.305, 0.195);
  head.add(leftBrow);
  const rightBrow = new THREE.Mesh(browGeo, darkHairMat);
  rightBrow.position.set(0.075, 0.305, 0.195);
  head.add(rightBrow);

  // Sculpted Nose & Mouth
  const nose = register(new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10), skinMat));
  nose.scale.set(1.1, 0.9, 1.15);
  nose.position.set(0, 0.195, 0.21);
  head.add(nose);

  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x3b1814, roughness: 0.4 });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.011, 8, 16, Math.PI), mouthMat);
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, 0.135, 0.192);
  head.add(mouth);

  // Hairstyles & Headwear (tilted back behind forehead so eyes & brows are 100% clear)
  if (profile.hairStyle === 'braids') {
    const cap = register(new THREE.Mesh(new THREE.SphereGeometry(0.215, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.46), darkHairMat));
    cap.position.set(0, 0.24, -0.02);
    cap.rotation.x = -0.28;
    head.add(cap);
    for (let i = -3; i <= 3; i++) {
      const braid = register(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.02, 0.26, 8), darkHairMat));
      braid.position.set(i * 0.052, 0.23, -0.18);
      braid.rotation.x = 0.35;
      head.add(braid);
    }
    const bun = register(new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), darkHairMat));
    bun.position.set(0, 0.33, -0.19);
    head.add(bun);
  } else if (profile.hairStyle === 'afro') {
    const puff = register(new THREE.Mesh(new THREE.SphereGeometry(0.255, 18, 16), darkHairMat));
    puff.position.set(0, 0.35, -0.07);
    head.add(puff);
    const band = register(new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.02, 8, 22), accentGoldMat));
    band.rotation.x = Math.PI / 2.6;
    band.position.set(0, 0.33, -0.01);
    head.add(band);
  } else if (profile.hairStyle === 'duku') {
    const wrapBase = register(new THREE.Mesh(new THREE.SphereGeometry(0.232, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), chitenjeMat));
    wrapBase.position.set(0, 0.26, -0.03);
    wrapBase.rotation.x = -0.28;
    head.add(wrapBase);
    const knot = register(new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 12), chitenjeMat));
    knot.scale.set(1.2, 0.9, 1);
    knot.position.set(0.06, 0.44, 0.04);
    head.add(knot);
  } else if (profile.hairStyle === 'hat') {
    const brimMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 });
    const brim = register(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.03, 22), brimMat));
    brim.position.set(0, 0.39, -0.02);
    brim.rotation.x = -0.1;
    head.add(brim);
    const crown = register(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.14, 18), brimMat));
    crown.position.set(0, 0.46, -0.03);
    head.add(crown);
  } else if (profile.hairStyle === 'visor') {
    const cap = register(new THREE.Mesh(new THREE.SphereGeometry(0.215, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.46), darkHairMat));
    cap.position.set(0, 0.24, -0.02);
    cap.rotation.x = -0.28;
    head.add(cap);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.1, metalness: 0.9 });
    const visor = register(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.08), visorMat));
    visor.position.set(0, 0.25, 0.19);
    head.add(visor);
  } else {
    const hair = register(new THREE.Mesh(new THREE.SphereGeometry(0.215, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.46), darkHairMat));
    hair.position.set(0, 0.24, -0.02);
    hair.rotation.x = -0.28;
    head.add(hair);
  }

  if (profile.hasBeard) {
    const beard = register(new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), darkHairMat));
    beard.position.set(0, 0.15, 0.05);
    head.add(beard);
  }

  // Arms
  const makeArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.29, 0.41, 0);
    torso.add(shoulder);

    const sleeve = register(new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), topMat));
    shoulder.add(sleeve);

    const upperArm = register(new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.05, 0.26, 12), skinMat));
    upperArm.position.y = -0.14;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.27;
    shoulder.add(elbow);

    const forearm = register(new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.04, 0.24, 12), skinMat));
    forearm.position.y = -0.12;
    elbow.add(forearm);

    const bracelet = register(new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 8, 14), accentGoldMat));
    bracelet.rotation.x = Math.PI / 2;
    bracelet.position.y = -0.21;
    elbow.add(bracelet);

    const handAnchor = new THREE.Group();
    handAnchor.position.y = -0.26;
    elbow.add(handAnchor);

    const hand = register(new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), skinMat));
    handAnchor.add(hand);

    return { shoulder, elbow, handAnchor };
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Legs
  const makeLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.12, -0.05, 0);
    hips.add(hip);

    const thigh = register(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.062, 0.36, 12), skinMat));
    thigh.position.y = -0.18;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.36;
    hip.add(knee);

    const shin = register(new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.046, 0.36, 12), skinMat));
    shin.position.y = -0.18;
    knee.add(shin);

    const shoe = register(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.19), shoeMat));
    shoe.position.set(0, -0.39, 0.04);
    knee.add(shoe);

    return { hip, knee };
  };

  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  return {
    root,
    hips,
    torso,
    head,
    leftBrow,
    rightBrow,
    leftEyelid,
    rightEyelid,
    mouth,
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    rightHandAnchor: rightArm.handAnchor,
    leftHip: leftLeg.hip,
    leftKnee: leftLeg.knee,
    rightHip: rightLeg.hip,
    rightKnee: rightLeg.knee,
    blinkTimer: Math.random() * 3,
    talkPhase: 0,
    bodyParts,
  };
}

export function updateCharacterAnimation(
  rig: CharacterRig,
  state: CharacterAnimState,
  time: number,
  dt: number,
  speedRatio = 1,
) {
  const damp = (cur: number, target: number, lambda = 12) =>
    THREE.MathUtils.damp(cur, target, lambda, dt);

  // Natural blinking
  rig.blinkTimer -= dt;
  let eyeClose = 0.15;
  if (rig.blinkTimer <= 0) {
    if (rig.blinkTimer > -0.12) {
      eyeClose = 1.05;
    } else {
      rig.blinkTimer = 2.2 + Math.random() * 2.8;
    }
  }
  rig.leftEyelid.scale.y = eyeClose;
  rig.rightEyelid.scale.y = eyeClose;

  // Target joint angles
  let hipY = 0.88;
  let torsoRx = 0;
  let torsoRy = 0;
  let torsoRz = 0;
  let headRx = 0;
  let headRy = 0;
  let lShRx = 0;
  let lShRz = 0.16;
  let lElRx = -0.2;
  let rShRx = 0;
  let rShRz = -0.16;
  let rElRx = -0.2;
  let lHipRx = 0;
  let lKneeRx = 0;
  let rHipRx = 0;
  let rKneeRx = 0;
  let browTilt = 0;
  let mouthScaleY = 1;

  switch (state) {
    case 'idle': {
      hipY = 0.88 + Math.sin(time * 2.4) * 0.015;
      torsoRx = Math.sin(time * 2.4) * 0.025;
      headRy = Math.sin(time * 0.9) * 0.1;
      lShRz = 0.16 + Math.sin(time * 2.4) * 0.03;
      rShRz = -0.16 - Math.sin(time * 2.4) * 0.03;
      break;
    }
    case 'walk':
    case 'run': {
      const freq = state === 'run' ? 11 : 7;
      const amp = (state === 'run' ? 0.72 : 0.42) * Math.min(1.2, speedRatio);
      const phase = time * freq;
      hipY = 0.88 + Math.abs(Math.sin(phase)) * (state === 'run' ? 0.08 : 0.035);
      torsoRx = state === 'run' ? 0.18 : 0.06;
      torsoRy = Math.sin(phase) * 0.12;
      lHipRx = Math.sin(phase) * amp;
      rHipRx = -Math.sin(phase) * amp;
      lKneeRx = Math.max(0, -Math.sin(phase) * amp * 1.1);
      rKneeRx = Math.max(0, Math.sin(phase) * amp * 1.1);
      lShRx = -Math.sin(phase) * amp * 0.85;
      rShRx = Math.sin(phase) * amp * 0.85;
      lElRx = state === 'run' ? -1.1 : -0.45;
      rElRx = state === 'run' ? -1.1 : -0.45;
      break;
    }
    case 'jump': {
      hipY = 0.95;
      torsoRx = -0.08;
      lShRx = -2.2;
      rShRx = -2.2;
      lHipRx = -0.45;
      lKneeRx = 0.7;
      rHipRx = 0.2;
      rKneeRx = 0.4;
      break;
    }
    case 'turn': {
      torsoRy = Math.sin(time * 4) * 0.45;
      headRy = Math.sin(time * 4) * 0.35;
      break;
    }
    case 'lookAround': {
      headRy = Math.sin(time * 1.9) * 0.55;
      headRx = Math.cos(time * 1.4) * 0.12;
      break;
    }
    case 'talk': {
      rig.talkPhase += dt * 14;
      mouthScaleY = 1 + Math.abs(Math.sin(rig.talkPhase)) * 1.4;
      rShRx = -0.65 + Math.sin(time * 5) * 0.15;
      rElRx = -0.8;
      headRx = Math.sin(time * 4) * 0.08;
      break;
    }
    case 'laugh': {
      hipY = 0.88 + Math.abs(Math.sin(time * 12)) * 0.05;
      torsoRx = -0.15 + Math.sin(time * 12) * 0.06;
      headRx = -0.18;
      mouthScaleY = 2.0;
      lShRx = -0.9;
      rShRx = -0.9;
      lElRx = -1.2;
      rElRx = -1.2;
      break;
    }
    case 'celebrate':
    case 'victory': {
      hipY = 0.88 + Math.abs(Math.sin(time * 6.5)) * 0.14;
      lShRx = -2.55 + Math.sin(time * 7) * 0.2;
      rShRx = -2.55 - Math.sin(time * 7) * 0.2;
      lShRz = 0.45;
      rShRz = -0.45;
      mouthScaleY = 1.8;
      break;
    }
    case 'reactFail':
    case 'defeat': {
      hipY = 0.72;
      torsoRx = 0.35;
      headRx = 0.28;
      lShRx = -0.4;
      rShRx = -0.4;
      lElRx = -1.4;
      rElRx = -1.4;
      browTilt = 0.25;
      mouthScaleY = 0.4;
      break;
    }
    case 'stir': {
      torsoRx = 0.16;
      rShRx = -1.05 + Math.sin(time * 11) * 0.24;
      rShRz = -0.25 + Math.cos(time * 11) * 0.24;
      rElRx = -0.85;
      lShRx = -0.5;
      break;
    }
    case 'pour': {
      torsoRx = 0.12;
      rShRx = -1.35;
      rElRx = -0.45;
      lShRx = -0.7;
      break;
    }
    case 'punch': {
      torsoRy = -0.5;
      rShRx = -1.55;
      rElRx = -0.05;
      lShRx = -0.8;
      lElRx = -1.3;
      browTilt = -0.3;
      break;
    }
    case 'kick': {
      torsoRx = -0.22;
      rHipRx = -1.45;
      rKneeRx = 0.15;
      lShRx = -0.8;
      rShRx = 0.5;
      browTilt = -0.35;
      break;
    }
    case 'block': {
      hipY = 0.8;
      torsoRx = 0.1;
      lShRx = -1.15;
      rShRx = -1.15;
      lElRx = -1.55;
      rElRx = -1.55;
      browTilt = -0.25;
      break;
    }
    case 'dodge': {
      hipY = 0.75;
      torsoRz = 0.28;
      torsoRx = 0.25;
      lHipRx = -0.5;
      rHipRx = -0.5;
      break;
    }
    case 'special': {
      hipY = 0.98;
      torsoRx = -0.15;
      lShRx = -2.2;
      rShRx = -2.2;
      lShRz = 0.65;
      rShRz = -0.65;
      browTilt = -0.4;
      mouthScaleY = 2.1;
      break;
    }
    case 'drive': {
      hipY = 0.72;
      lShRx = -1.1;
      rShRx = -1.1;
      lElRx = -0.6;
      rElRx = -0.6;
      lHipRx = -1.2;
      rHipRx = -1.2;
      break;
    }
  }

  rig.hips.position.y = damp(rig.hips.position.y, hipY, 14);
  rig.torso.rotation.x = damp(rig.torso.rotation.x, torsoRx, 14);
  rig.torso.rotation.y = damp(rig.torso.rotation.y, torsoRy, 14);
  rig.torso.rotation.z = damp(rig.torso.rotation.z, torsoRz, 14);
  rig.head.rotation.x = damp(rig.head.rotation.x, headRx, 12);
  rig.head.rotation.y = damp(rig.head.rotation.y, headRy, 12);

  rig.leftShoulder.rotation.x = damp(rig.leftShoulder.rotation.x, lShRx, 16);
  rig.leftShoulder.rotation.z = damp(rig.leftShoulder.rotation.z, lShRz, 16);
  rig.leftElbow.rotation.x = damp(rig.leftElbow.rotation.x, lElRx, 16);

  rig.rightShoulder.rotation.x = damp(rig.rightShoulder.rotation.x, rShRx, 16);
  rig.rightShoulder.rotation.z = damp(rig.rightShoulder.rotation.z, rShRz, 16);
  rig.rightElbow.rotation.x = damp(rig.rightElbow.rotation.x, rElRx, 16);

  rig.leftHip.rotation.x = damp(rig.leftHip.rotation.x, lHipRx, 16);
  rig.leftKnee.rotation.x = damp(rig.leftKnee.rotation.x, lKneeRx, 16);
  rig.rightHip.rotation.x = damp(rig.rightHip.rotation.x, rHipRx, 16);
  rig.rightKnee.rotation.x = damp(rig.rightKnee.rotation.x, rKneeRx, 16);

  rig.leftBrow.rotation.z = damp(rig.leftBrow.rotation.z, browTilt, 14);
  rig.rightBrow.rotation.z = damp(rig.rightBrow.rotation.z, -browTilt, 14);
  rig.mouth.scale.y = damp(rig.mouth.scale.y, mouthScaleY, 16);
}
