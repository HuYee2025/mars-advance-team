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
  laserSword: THREE.Group;
  laserSwordLight: THREE.PointLight;
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
  // 参考 NASA EVA 头盔的外置太阳面罩：这是一整块不透明的反光防护层，
  // 不显示人脸或独立“眼睛”。微弱自发光只保证暗面也能读出金色反射面。
  const visorMaterial = makeMaterial(0x8a6725, 0.16, 0.88, 0x1a1204);
  const visorRimMaterial = makeMaterial(0x2a2113, 0.36, 0.78);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.38, 7, 12), suit);
  torso.position.y = 1.08;
  torso.scale.set(1.12, 1, 0.72);
  torso.castShadow = true;
  torso.receiveShadow = true;
  visual.add(torso);

  const hip = box(0.68, 0.26, 0.42, hardSuit);
  hip.position.y = 0.58;
  visual.add(hip);

  const chest = box(0.5, 0.3, 0.075, graphite);
  chest.position.set(0, 1.22, -0.31);
  visual.add(chest);

  const chestLight = box(0.11, 0.08, 0.072, cyan);
  chestLight.position.set(0.13, 1.25, -0.3);
  visual.add(chestLight);

  const belt = box(0.76, 0.12, 0.46, orange);
  belt.position.y = 0.53;
  visual.add(belt);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.29, 0.22, 8), graphite);
  neck.position.y = 1.63;
  neck.castShadow = true;
  visual.add(neck);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), hardSuit);
  helmet.position.y = 1.94;
  helmet.scale.set(1.04, 0.94, 1);
  helmet.castShadow = true;
  visual.add(helmet);

  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 12), visorMaterial);
  visor.name = "Gold reflective EVA visor";
  visor.position.set(0, 1.94, -0.245);
  visor.scale.set(1, 0.76, 0.48);
  visor.castShadow = true;
  visual.add(visor);

  const visorRim = new THREE.Mesh(new THREE.TorusGeometry(0.348, 0.034, 8, 28), visorRimMaterial);
  visorRim.position.set(0, 1.94, -0.405);
  visorRim.scale.y = 0.76;
  visorRim.castShadow = true;
  visual.add(visorRim);

  const backpack = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.38, 6, 10), graphite);
  backpack.position.set(0, 1.08, 0.36);
  backpack.scale.set(1.2, 1, 0.62);
  backpack.castShadow = true;
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
  // 背包软管的细碎投影在火星低角度太阳下会被放大成跟随人物的“链条”阴影。
  hose.castShadow = false;
  visual.add(hose);

  const leftArm = limb(0.78, 0.11, suit);
  leftArm.position.set(-0.52, 1.34, 0);
  leftArm.rotation.z = -0.18;
  const rightArm = limb(0.78, 0.11, suit);
  rightArm.position.set(0.52, 1.34, 0);
  rightArm.rotation.z = 0.18;
  visual.add(leftArm, rightArm);

  for (const side of [-1, 1]) {
    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), hardSuit);
    shoulderCap.position.set(side * 0.5, 1.39, 0);
    shoulderCap.scale.set(1, 0.84, 0.9);
    shoulderCap.castShadow = true;
    visual.add(shoulderCap);
  }

  const leftGlove = box(0.19, 0.18, 0.2, graphite);
  leftGlove.position.y = -0.88;
  const rightGlove = leftGlove.clone();
  leftArm.add(leftGlove);
  rightArm.add(rightGlove);

  const leftCuff = cylinder(0.145, 0.13, 0.12, orange, 10);
  leftCuff.position.y = -0.7;
  const rightCuff = leftCuff.clone();
  leftArm.add(leftCuff);
  rightArm.add(rightCuff);

  const scaleGun = createScaleGun(graphite, hardSuit, orange, cyan);
  scaleGun.position.set(0.075, -0.96, -0.26);
  scaleGun.rotation.set(-0.38, 0.04, 0);
  scaleGun.visible = false;
  rightArm.add(scaleGun);

  const { sword: laserSword, light: laserSwordLight } = createLaserSword(graphite);
  laserSword.visible = false;
  rightArm.add(laserSword);

  const leftLeg = limb(0.86, 0.14, hardSuit);
  leftLeg.position.set(-0.22, 0.45, 0);
  const rightLeg = limb(0.86, 0.14, hardSuit);
  rightLeg.position.set(0.22, 0.45, 0);
  visual.add(leftLeg, rightLeg);

  const leftKnee = box(0.24, 0.2, 0.08, graphite);
  leftKnee.position.set(0, -0.5, -0.14);
  const rightKnee = leftKnee.clone();
  leftLeg.add(leftKnee);
  rightLeg.add(rightKnee);

  const leftBoot = box(0.27, 0.18, 0.36, graphite);
  leftBoot.position.set(0, -0.96, -0.04);
  const rightBoot = leftBoot.clone();
  leftLeg.add(leftBoot);
  rightLeg.add(rightBoot);

  const leftToe = box(0.25, 0.11, 0.18, hardSuit);
  leftToe.position.set(0, -0.98, -0.23);
  const rightToe = leftToe.clone();
  leftLeg.add(leftToe);
  rightLeg.add(rightToe);

  const shoulderA = box(0.2, 0.16, 0.3, orange);
  shoulderA.position.set(-0.49, 1.39, -0.02);
  const shoulderB = shoulderA.clone();
  shoulderB.position.x = 0.49;
  visual.add(shoulderA, shoulderB);

  const animatedRoots = [leftArm, rightArm, leftLeg, rightLeg, jetpackFlames, scaleGun, laserSword];
  visual.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (!animatedRoots.some((root) => isWithinBranch(object, root))) object.userData.coreLodFallback = true;
  });

  return { group, visual, leftArm, rightArm, leftLeg, rightLeg, helmet, visor, jetpackFlames, scaleGun, laserSword, laserSwordLight };
}

function isWithinBranch(object: THREE.Object3D, branch: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current === branch) return true;
    current = current.parent;
  }
  return false;
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

function createLaserSword(graphite: THREE.Material) {
  const sword = new THREE.Group();
  sword.name = "Laser sword";

  const hilt = box(0.12, 0.36, 0.12, graphite);
  hilt.position.set(0, -0.08, -0.02);
  const pommel = cylinder(0.065, 0.065, 0.055, graphite, 10);
  pommel.position.set(0, -0.28, -0.02);
  const guard = box(0.28, 0.06, 0.1, graphite);
  guard.position.set(0, 0.12, -0.02);

  const bladeMaterial = new THREE.MeshBasicMaterial({
    color: 0xf8fdff,
    transparent: true,
    opacity: 0.94,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x7ccfff,
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 1.42, 16), bladeMaterial);
  blade.position.set(0, 0.86, -0.02);
  blade.castShadow = false;
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.115, 1.5, 16), glowMaterial);
  glow.position.copy(blade.position);
  glow.castShadow = false;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 8), bladeMaterial);
  tip.position.set(0, 1.58, -0.02);
  const light = new THREE.PointLight(0xbfeaff, 0, 20, 1.65);
  light.position.set(0, 0.85, -0.02);
  light.visible = false;

  sword.add(hilt, pommel, guard, glow, blade, tip, light);
  sword.position.set(0.08, -0.92, -0.08);
  sword.rotation.set(-1.06, 0.08, 0.02);
  sword.scale.setScalar(1.05);
  return { sword, light };
}

export function updateMarsEngineer(rig: PlayerRig, speed: number, elapsed: number, flying = false, thrusting = false) {
  if (flying) {
    const sway = Math.sin(elapsed * 5.2) * 0.045;
    rig.visual.position.y = Math.sin(elapsed * 9.0) * 0.018;
    rig.visual.rotation.x = -0.08;
    rig.visual.rotation.z = sway * 0.18;
    rig.leftArm.rotation.x = 0.18 + sway;
    rig.rightArm.rotation.x = 0.18 - sway;
    rig.leftLeg.rotation.x = 0.26 - sway;
    rig.rightLeg.rotation.x = 0.26 + sway;
    rig.helmet.rotation.y = Math.sin(elapsed * 1.2) * 0.025;
    rig.jetpackFlames.visible = true;
    rig.jetpackFlames.children.forEach((flame, index) => {
      const pulse = 0.9 + Math.sin(elapsed * 22 + index * 1.7) * 0.12;
      const thrustScale = thrusting ? 1.2 : 0.84;
      flame.scale.set(0.86 + pulse * 0.1, thrustScale * pulse, 0.86 + pulse * 0.1);
    });
    return;
  }

  const moving = speed > 0.2;
  const stride = moving ? Math.sin(elapsed * 8.6) : Math.sin(elapsed * 1.8) * 0.12;
  const amount = moving ? 0.42 : 0.06;

  rig.visual.position.y = moving ? Math.abs(Math.sin(elapsed * 8.6)) * 0.035 : Math.sin(elapsed * 1.5) * 0.012;
  rig.visual.rotation.x = moving ? 0.025 : 0;
  rig.visual.rotation.z = moving ? stride * 0.022 : Math.sin(elapsed * 0.75) * 0.004;
  rig.leftArm.rotation.x = stride * amount;
  rig.rightArm.rotation.x = -stride * amount;
  rig.leftLeg.rotation.x = -stride * amount * 0.92;
  rig.rightLeg.rotation.x = stride * amount * 0.92;
  rig.helmet.rotation.y = moving ? stride * 0.035 : Math.sin(elapsed * 0.9) * 0.035;
  rig.jetpackFlames.visible = false;
  rig.jetpackFlames.children.forEach((flame, index) => {
    const pulse = 0.9 + Math.sin(elapsed * 22 + index * 1.7) * 0.12;
    const thrustScale = thrusting ? 1.2 : 0.84;
    flame.scale.set(0.86 + pulse * 0.1, thrustScale * pulse, 0.86 + pulse * 0.1);
  });
}
