import * as THREE from "three";

export type PlayerRig = {
  group: THREE.Group;
  visual: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  helmet: THREE.Mesh;
  visor: THREE.Mesh;
  jetpackFlames: THREE.Group;
  scaleGun: THREE.Group;
};

function makeMaterial(color: number, roughness = 0.72, metalness = 0.08, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity: emissive ? 0.32 : 0,
    flatShading: true,
  });
}

function capsule(radius: number, length: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 5, 8), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(w: number, h: number, d: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, radialSegments = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function limb(length: number, radius: number, material: THREE.Material) {
  const root = new THREE.Group();
  const segment = capsule(radius, length, material);
  segment.position.y = -length * 0.5;
  root.add(segment);
  return root;
}

export function createMarsEngineer(): PlayerRig {
  const group = new THREE.Group();
  group.name = "Mars engineer controller";

  const visual = new THREE.Group();
  visual.name = "Mars engineer visual";
  group.add(visual);

  const suit = makeMaterial(0xf3ead8);
  const hardSuit = makeMaterial(0xd8d0bf);
  const graphite = makeMaterial(0x202124, 0.62, 0.28);
  const orange = makeMaterial(0xd66a2e, 0.68, 0.08);
  const cyan = makeMaterial(0x66d9ff, 0.28, 0.36, 0x238db1);
  const visorMaterial = makeMaterial(0x101920, 0.2, 0.72, 0x1b465c);

  const torso = box(0.72, 1.02, 0.42, suit);
  torso.position.y = 1.02;
  visual.add(torso);

  const chest = box(0.44, 0.2, 0.06, graphite);
  chest.position.set(0, 1.24, -0.25);
  visual.add(chest);

  const chestLight = box(0.11, 0.08, 0.072, cyan);
  chestLight.position.set(0.13, 1.25, -0.3);
  visual.add(chestLight);

  const belt = box(0.82, 0.12, 0.5, orange);
  belt.position.y = 0.53;
  visual.add(belt);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.29, 0.22, 8), graphite);
  neck.position.y = 1.63;
  neck.castShadow = true;
  visual.add(neck);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), hardSuit);
  helmet.position.y = 1.94;
  helmet.scale.set(1.04, 0.94, 1);
  helmet.castShadow = true;
  visual.add(helmet);

  const visor = box(0.54, 0.26, 0.055, visorMaterial);
  visor.position.set(0, 1.94, -0.36);
  visual.add(visor);

  const visorGlow = box(0.2, 0.035, 0.065, cyan);
  visorGlow.position.set(0.14, 2.03, -0.4);
  visual.add(visorGlow);

  const backpack = box(0.56, 0.84, 0.26, graphite);
  backpack.position.set(0, 1.08, 0.36);
  visual.add(backpack);

  const packTankA = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.82, 8), hardSuit);
  packTankA.position.set(-0.18, 1.08, 0.52);
  packTankA.castShadow = true;
  const packTankB = packTankA.clone();
  packTankB.position.x = 0.18;
  visual.add(packTankA, packTankB);

  const jetpackFlames = new THREE.Group();
  jetpackFlames.name = "Jetpack blue flames";
  jetpackFlames.visible = false;
  const outerFlameMat = new THREE.MeshBasicMaterial({
    color: 0x2bbcff,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const innerFlameMat = new THREE.MeshBasicMaterial({
    color: 0xd7f6ff,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  for (const x of [-0.18, 0.18]) {
    const flame = new THREE.Group();
    flame.position.set(x, 0.56, 0.53);
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.48, 10), outerFlameMat);
    outer.rotation.x = Math.PI;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.32, 8), innerFlameMat);
    inner.rotation.x = Math.PI;
    inner.position.y = 0.02;
    flame.add(outer, inner);
    jetpackFlames.add(flame);
  }
  visual.add(jetpackFlames);

  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.22, 1.48, 0.41),
    new THREE.Vector3(-0.55, 1.48, 0.2),
    new THREE.Vector3(-0.46, 1.28, -0.22),
  ]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 16, 0.025, 6), graphite);
  hose.castShadow = true;
  visual.add(hose);

  const leftArm = limb(0.78, 0.11, suit);
  leftArm.position.set(-0.52, 1.34, 0);
  leftArm.rotation.z = -0.18;
  const rightArm = limb(0.78, 0.11, suit);
  rightArm.position.set(0.52, 1.34, 0);
  rightArm.rotation.z = 0.18;
  visual.add(leftArm, rightArm);

  const leftGlove = box(0.19, 0.18, 0.2, graphite);
  leftGlove.position.y = -0.88;
  const rightGlove = leftGlove.clone();
  leftArm.add(leftGlove);
  rightArm.add(rightGlove);

  const scaleGun = createScaleGun(graphite, hardSuit, orange, cyan);
  scaleGun.position.set(0.075, -0.96, -0.26);
  scaleGun.rotation.set(-0.38, 0.04, 0);
  scaleGun.visible = false;
  rightArm.add(scaleGun);

  const leftLeg = limb(0.86, 0.14, hardSuit);
  leftLeg.position.set(-0.22, 0.45, 0);
  const rightLeg = limb(0.86, 0.14, hardSuit);
  rightLeg.position.set(0.22, 0.45, 0);
  visual.add(leftLeg, rightLeg);

  const leftBoot = box(0.27, 0.18, 0.36, graphite);
  leftBoot.position.set(0, -0.96, -0.04);
  const rightBoot = leftBoot.clone();
  leftLeg.add(leftBoot);
  rightLeg.add(rightBoot);

  const shoulderA = box(0.18, 0.18, 0.28, orange);
  shoulderA.position.set(-0.49, 1.39, -0.02);
  const shoulderB = shoulderA.clone();
  shoulderB.position.x = 0.49;
  visual.add(shoulderA, shoulderB);

  return { group, visual, leftArm, rightArm, leftLeg, rightLeg, helmet, visor, jetpackFlames, scaleGun };
}

function createScaleGun(graphite: THREE.Material, hardSuit: THREE.Material, orange: THREE.Material, cyan: THREE.Material) {
  const gun = new THREE.Group();
  gun.name = "Scale gun";

  const body = box(0.18, 0.16, 0.56, hardSuit);
  body.position.set(0, 0.02, -0.2);
  const grip = box(0.12, 0.32, 0.12, graphite);
  grip.position.set(0, -0.18, -0.02);
  grip.rotation.x = -0.28;
  const spine = box(0.11, 0.08, 0.68, graphite);
  spine.position.set(0, 0.1, -0.22);
  const emitter = cylinder(0.105, 0.075, 0.22, cyan, 12);
  emitter.position.set(0, 0.02, -0.55);
  emitter.rotation.x = Math.PI / 2;
  const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.116, 0.014, 6, 16), orange);
  lensRing.position.set(0, 0.02, -0.67);
  lensRing.rotation.x = Math.PI / 2;
  lensRing.castShadow = true;
  const rearCap = box(0.16, 0.13, 0.1, graphite);
  rearCap.position.set(0, 0.02, 0.11);
  const scaleDial = cylinder(0.05, 0.05, 0.035, cyan, 10);
  scaleDial.position.set(0.095, 0.12, -0.2);
  scaleDial.rotation.z = Math.PI / 2;
  const safety = box(0.055, 0.04, 0.16, orange);
  safety.position.set(0, 0.13, -0.02);

  gun.add(body, grip, spine, emitter, lensRing, rearCap, scaleDial, safety);
  gun.scale.setScalar(1.18);
  return gun;
}

export function updateMarsEngineer(rig: PlayerRig, speed: number, elapsed: number, flying = false, thrusting = false) {
  const moving = speed > 0.2;
  const stride = moving ? Math.sin(elapsed * 8.6) : Math.sin(elapsed * 1.8) * 0.12;
  const amount = moving ? 0.42 : 0.06;

  rig.visual.position.y = flying ? Math.sin(elapsed * 9.0) * 0.018 : moving ? Math.abs(Math.sin(elapsed * 8.6)) * 0.035 : Math.sin(elapsed * 1.5) * 0.012;
  rig.leftArm.rotation.x = stride * amount;
  rig.rightArm.rotation.x = -stride * amount;
  rig.leftLeg.rotation.x = -stride * amount * 0.92;
  rig.rightLeg.rotation.x = stride * amount * 0.92;
  rig.helmet.rotation.y = moving ? stride * 0.035 : Math.sin(elapsed * 0.9) * 0.035;
  rig.jetpackFlames.visible = flying;
  rig.jetpackFlames.children.forEach((flame, index) => {
    const pulse = 0.9 + Math.sin(elapsed * 22 + index * 1.7) * 0.12;
    const thrustScale = thrusting ? 1.2 : 0.84;
    flame.scale.set(0.86 + pulse * 0.1, thrustScale * pulse, 0.86 + pulse * 0.1);
  });
}
