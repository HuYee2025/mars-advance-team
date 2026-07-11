import * as THREE from "three";

export const AT_AT_HEIGHT_METERS = 22.5;
export const AT_AT_REQUIRED_SCORE = 500;
export const AT_AT_RIDE_COST_COINS = 100;

export type AtAtEntryStatus = "allowed" | "score" | "coins";

export function atAtEntryStatus(score: number, coins: number): AtAtEntryStatus {
  if (score < AT_AT_REQUIRED_SCORE) return "score";
  if (coins < AT_AT_RIDE_COST_COINS) return "coins";
  return "allowed";
}

export type AtAtLeg = {
  hip: THREE.Group;
  knee: THREE.Group;
  ankle: THREE.Group;
  foot: THREE.Group;
  phaseOffset: number;
};

export type AtAtControl = {
  group: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  cockpitAnchor: THREE.Object3D;
  boardingAnchor: THREE.Object3D;
  exitAnchors: [THREE.Object3D, THREE.Object3D];
  footAnchors: THREE.Object3D[];
  legs: AtAtLeg[];
  dustPuffs: Array<{ mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>; age: number }>;
  footprints: Array<{ mesh: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>; age: number }>;
  cannonPivots: [THREE.Object3D, THREE.Object3D];
  cannonMeshes: [THREE.Mesh, THREE.Mesh];
  cannonMaterials: [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial];
  cannonLights: [THREE.PointLight, THREE.PointLight];
  cannonRecoil: [number, number];
  laserBeams: Array<{ mesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>; age: number; direction: THREE.Vector3 }>;
  cockpitLight: THREE.PointLight;
  cockpitObstruction: THREE.Object3D;
  nextCannonSide: number;
  cannonCooldown: number;
  forward: THREE.Vector3;
  normal: THREE.Vector3;
  speed: number;
  gaitPhase: number;
  lastFootCycles: number[];
  collisionRadius: number;
};

function armorMaterial(color: number, roughness = 0.76, metalness = 0.34) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
}

function box(width: number, height: number, depth: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(radius: number, height: number, material: THREE.Material, radialSegments = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, radialSegments), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function taperedBodyHull(material: THREE.Material) {
  const bottomWidth = 7.0;
  const bottomDepth = 12.8;
  const topWidth = 5.9;
  const topDepth = 10.55;
  const bottomY = 15.2;
  const topY = 22.3;
  const positions = new Float32Array([
    -bottomWidth / 2, bottomY, -bottomDepth / 2,
    bottomWidth / 2, bottomY, -bottomDepth / 2,
    bottomWidth / 2, bottomY, bottomDepth / 2,
    -bottomWidth / 2, bottomY, bottomDepth / 2,
    -topWidth / 2, topY, -topDepth / 2,
    topWidth / 2, topY, -topDepth / 2,
    topWidth / 2, topY, topDepth / 2,
    -topWidth / 2, topY, topDepth / 2,
  ]);
  const indices = [
    0, 5, 1, 0, 4, 5,
    1, 6, 2, 1, 5, 6,
    2, 7, 3, 2, 6, 7,
    3, 4, 0, 3, 7, 4,
    4, 6, 5, 4, 7, 6,
    3, 1, 2, 3, 0, 1,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createLeg(
  x: number,
  z: number,
  phaseOffset: number,
  armor: THREE.Material,
  dark: THREE.Material,
) {
  const hip = new THREE.Group();
  hip.position.set(x, 16.25, z);

  const hipJoint = cylinder(1.08, 0.72, dark, 14);
  hipJoint.rotation.z = Math.PI * 0.5;
  hip.add(hipJoint);

  const upper = box(1.18, 6.9, 1.36, armor);
  upper.position.y = -3.45;
  hip.add(upper);

  const knee = new THREE.Group();
  knee.position.y = -6.9;
  const kneeJoint = cylinder(0.86, 0.74, dark, 14);
  kneeJoint.rotation.z = Math.PI * 0.5;
  const kneeGuard = box(1.52, 1.55, 0.78, armor);
  kneeGuard.position.z = -0.38;
  knee.add(kneeJoint, kneeGuard);

  const lower = box(1.02, 7.15, 1.18, armor);
  lower.position.y = -3.58;
  knee.add(lower);

  const ankle = new THREE.Group();
  ankle.position.y = -7.15;
  // Enlarge the dark ankle collar so it visibly overlaps the foot armor below
  // instead of leaving a floating gap at the joint.
  const ankleJoint = cylinder(1.02, 0.82, dark, 12);
  ankleJoint.rotation.z = Math.PI * 0.5;
  ankle.add(ankleJoint);

  const foot = new THREE.Group();
  foot.position.y = -1.68;
  const sole = box(2.72, 1.22, 3.25, armor);
  sole.position.y = 0.09;
  const toe = box(2.48, 0.72, 1.18, armor);
  toe.position.set(0, 0.1, -1.82);
  foot.add(sole, toe);
  ankle.add(foot);
  knee.add(ankle);
  hip.add(knee);

  const footAnchor = new THREE.Object3D();
  footAnchor.name = "AT-AT foot collider";
  footAnchor.position.set(0, -0.52, -0.15);
  foot.add(footAnchor);

  return { leg: { hip, knee, ankle, foot, phaseOffset }, footAnchor };
}

export function createAtAt(): AtAtControl {
  const group = new THREE.Group();
  group.name = "AT-AT walker";
  group.userData.dynamicMap = true;

  const armor = armorMaterial(0x777a79, 0.72, 0.38);
  const lightArmor = armorMaterial(0x979996, 0.68, 0.32);
  const dark = armorMaterial(0x25292b, 0.58, 0.6);
  const cannonMaterial = new THREE.MeshStandardMaterial({
    color: 0x241d1f,
    emissive: 0x4b0805,
    emissiveIntensity: 0.72,
    roughness: 0.42,
    metalness: 0.72,
    flatShading: true,
  });
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x11191d,
    emissive: 0x5b1712,
    emissiveIntensity: 0.42,
    roughness: 0.18,
    metalness: 0.72,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });

  const body = new THREE.Group();
  body.name = "AT-AT armored transport body";
  const hull = taperedBodyHull(armor);
  const upperSlab = box(5.55, 0.42, 9.85, lightArmor);
  upperSlab.position.set(0, 22.18, 0.1);
  const dorsalCap = box(3.8, 0.3, 5.6, dark);
  dorsalCap.position.set(0, 22.35, 0.45);
  const belly = box(5.2, 0.7, 8.8, dark);
  belly.position.set(0, 15.15, 0.45);
  body.add(hull, upperSlab, dorsalCap, belly);

  for (const side of [-1, 1]) {
    const panel = box(0.3, 4.5, 7.15, lightArmor);
    panel.position.set(side * 3.3, 18.7, 0.25);
    panel.rotation.z = side * 0.075;
    body.add(panel);
    for (const z of [-3.3, 0, 3.3]) {
      const brace = box(0.48, 0.42, 2.0, dark);
      brace.position.set(side * 3.48, 18.45, z);
      body.add(brace);
    }
  }

  const neck = new THREE.Group();
  neck.name = "AT-AT neck";
  neck.position.set(0, 17.1, -6.65);
  for (let index = 0; index < 4; index += 1) {
    const collar = cylinder(1.42 - index * 0.08, 0.72, index % 2 === 0 ? dark : armor, 12);
    collar.rotation.x = Math.PI * 0.5;
    collar.position.set(0, -index * 0.3, -index * 0.9);
    neck.add(collar);
  }

  const head = new THREE.Group();
  head.name = "AT-AT command head";
  head.position.set(0, 15.35, -11.15);
  head.scale.set(1.18, 1.12, 1.16);
  // Keep the command head intentionally simple: one readable rectangular
  // shell, a single red viewport, and the paired under-slung laser cannons.
  const commandHull = box(5.05, 2.85, 4.15, armor);
  commandHull.position.set(0, -0.05, -0.1);
  head.add(commandHull);

  const windshield = box(3.65, 0.58, 0.08, windowMaterial);
  windshield.name = "AT-AT cockpit red windshield";
  windshield.position.set(0, 0.3, -2.2);
  head.add(windshield);

  const cannonPivots: [THREE.Object3D, THREE.Object3D] = [] as unknown as [THREE.Object3D, THREE.Object3D];
  const cannonMeshes: [THREE.Mesh, THREE.Mesh] = [] as unknown as [THREE.Mesh, THREE.Mesh];
  const cannonMaterials: [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial] = [] as unknown as [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial];
  const cannonLights: [THREE.PointLight, THREE.PointLight] = [] as unknown as [THREE.PointLight, THREE.PointLight];
  for (const x of [-1.15, 1.15]) {
    const cannonPivot = new THREE.Group();
    cannonPivot.position.set(x, -1.55, -2.55);
    const cannonIndex = cannonPivots[0] ? 1 : 0;
    const cannonMat = cannonMaterial.clone();
    const cannon = cylinder(0.22, 3.4, cannonMat, 10);
    cannon.rotation.x = Math.PI * 0.5;
    cannon.position.z = -1.55;
    cannon.name = `AT-AT laser cannon ${cannonIndex === 0 ? "left" : "right"}`;
    const muzzleRing = cylinder(0.29, 0.18, cannonMat, 10);
    muzzleRing.rotation.x = Math.PI * 0.5;
    muzzleRing.position.z = -3.22;
    const cannonLight = new THREE.PointLight(0xff3328, 0.36, 3.8, 2);
    cannonLight.position.set(0, 0, -3.12);
    cannonPivot.add(cannon, muzzleRing, cannonLight);
    head.add(cannonPivot);
    cannonPivots.push(cannonPivot);
    cannonMeshes.push(cannon);
    cannonMaterials.push(cannonMat);
    cannonLights.push(cannonLight);
  }

  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0x4bdcff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const laserBeams = Array.from({ length: 4 }, () => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 1, 8), beamMaterial.clone());
    mesh.name = "AT-AT blue laser beam";
    mesh.scale.y = 0;
    mesh.visible = false;
    group.add(mesh);
    return { mesh, age: Infinity, direction: new THREE.Vector3() };
  });
  const cockpitLight = new THREE.PointLight(0x45d9ff, 0, 15, 2);
  cockpitLight.position.set(0, 14.7, -10.9);
  group.add(cockpitLight);

  body.add(neck, head);
  group.add(body);

  const legSpecs: Array<[number, number, number]> = [
    [-3.15, -4.25, 0],
    [3.15, -4.25, Math.PI],
    [-3.15, 4.25, Math.PI * 1.5],
    [3.15, 4.25, Math.PI * 0.5],
  ];
  const legs: AtAtLeg[] = [];
  const footAnchors: THREE.Object3D[] = [];
  for (const [x, z, phase] of legSpecs) {
    const { leg, footAnchor } = createLeg(x, z, phase, armor, dark);
    legs.push(leg);
    footAnchors.push(footAnchor);
    group.add(leg.hip);
  }

  const cockpitAnchor = new THREE.Object3D();
  cockpitAnchor.name = "AT-AT cockpit camera";
  cockpitAnchor.position.set(0, 15.78, -12.18);
  group.add(cockpitAnchor);

  const boardingAnchor = new THREE.Object3D();
  boardingAnchor.name = "AT-AT boarding point";
  boardingAnchor.position.set(-4.4, 0.7, -5.1);
  group.add(boardingAnchor);

  const leftExit = new THREE.Object3D();
  leftExit.position.set(-6.5, 0.7, -0.8);
  const rightExit = new THREE.Object3D();
  rightExit.position.set(6.5, 0.7, -0.8);
  group.add(leftExit, rightExit);

  const dustMaterial = new THREE.MeshBasicMaterial({ color: 0xb45b38, transparent: true, opacity: 0, depthWrite: false });
  const dustPuffs = Array.from({ length: 12 }, () => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 6, 4), dustMaterial.clone());
    mesh.name = "AT-AT dust puff";
    mesh.position.y = 0.55;
    mesh.visible = false;
    group.add(mesh);
    return { mesh, age: Infinity };
  });
  const footprints = Array.from({ length: 28 }, () => {
    const material = new THREE.MeshBasicMaterial({
      color: 0x211310,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1.55, 8), material);
    mesh.name = "AT-AT giant footprint";
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.scale.set(1.05, 1.55, 1);
    mesh.visible = false;
    group.add(mesh);
    return { mesh, age: Infinity };
  });

  return {
    group,
    body,
    head,
    cockpitAnchor,
    boardingAnchor,
    exitAnchors: [leftExit, rightExit],
    footAnchors,
    legs,
    dustPuffs,
    footprints,
    cannonPivots,
    cannonMeshes,
    cannonMaterials,
    cannonLights,
    cannonRecoil: [0, 0],
    laserBeams,
    cockpitLight,
    cockpitObstruction: windshield,
    nextCannonSide: 0,
    cannonCooldown: 0,
    forward: new THREE.Vector3(0, 0, -1),
    normal: new THREE.Vector3(0, 1, 0),
    speed: 0,
    gaitPhase: 0,
    lastFootCycles: [0, 0, 0, 0],
    collisionRadius: 7.2,
  };
}

function emitFootDust(control: AtAtControl, legIndex: number, intensity: number) {
  const puff = control.dustPuffs.find((candidate) => !candidate.mesh.visible) ?? control.dustPuffs[0];
  const foot = control.legs[legIndex].foot;
  foot.getWorldPosition(puff.mesh.position);
  control.group.worldToLocal(puff.mesh.position);
  puff.mesh.position.y = Math.max(0.24, puff.mesh.position.y + 0.12);
  puff.mesh.scale.setScalar(0.55 + intensity * 0.45);
  puff.mesh.material.opacity = 0.32 + intensity * 0.18;
  puff.mesh.visible = true;
  puff.age = 0;
}

function emitFootprint(control: AtAtControl, legIndex: number, intensity: number) {
  const footprint = control.footprints.find((candidate) => !candidate.mesh.visible) ?? control.footprints[0];
  const foot = control.legs[legIndex].foot;
  foot.getWorldPosition(footprint.mesh.position);
  control.group.worldToLocal(footprint.mesh.position);
  footprint.mesh.position.y = Math.max(0.42, footprint.mesh.position.y - 0.04);
  footprint.mesh.rotation.y = (legIndex % 2 === 0 ? -1 : 1) * 0.08;
  footprint.mesh.scale.set(1.05, 1.55 + intensity * 0.18, 1);
  footprint.mesh.material.opacity = 0.22 + intensity * 0.08;
  footprint.mesh.visible = true;
  footprint.age = 0;
}

export function updateAtAtVisual(control: AtAtControl, delta: number, elapsed: number) {
  const speedRatio = THREE.MathUtils.clamp(Math.abs(control.speed) / 7, 0, 1);
  const direction = control.speed < -0.05 ? -1 : 1;
  control.gaitPhase += delta * THREE.MathUtils.lerp(1.1, 3.0, speedRatio) * direction;

  for (let index = 0; index < control.legs.length; index += 1) {
    const leg = control.legs[index];
    const phase = control.gaitPhase + leg.phaseOffset;
    const stride = Math.sin(phase) * 0.28 * speedRatio;
    const lift = Math.max(0, Math.sin(phase)) * 0.42 * speedRatio;
    leg.hip.rotation.x = stride;
    leg.knee.rotation.x = -stride * 0.92 + lift * 1.28;
    leg.ankle.rotation.x = -leg.hip.rotation.x - leg.knee.rotation.x;
    leg.foot.rotation.x = -leg.ankle.rotation.x * 0.35;

    const cycle = Math.floor((phase - Math.PI) / (Math.PI * 2));
    if (speedRatio > 0.18 && cycle !== control.lastFootCycles[index]) {
      control.lastFootCycles[index] = cycle;
      emitFootDust(control, index, speedRatio);
      emitFootprint(control, index, speedRatio);
    }
  }

  control.body.position.y = Math.sin(control.gaitPhase * 2) * 0.08 * speedRatio;
  control.body.rotation.x = Math.cos(control.gaitPhase * 0.72) * 0.016 * speedRatio;
  control.body.rotation.z = Math.sin(control.gaitPhase * 0.86) * 0.028 * speedRatio;

  for (const puff of control.dustPuffs) {
    if (!puff.mesh.visible) continue;
    puff.age += delta;
    const life = 0.85;
    const progress = THREE.MathUtils.clamp(puff.age / life, 0, 1);
    puff.mesh.scale.multiplyScalar(1 + delta * 1.7);
    puff.mesh.position.y += delta * 0.28;
    puff.mesh.material.opacity = (1 - progress) * 0.34;
    puff.mesh.rotation.y = elapsed * 0.35;
    if (progress >= 1) puff.mesh.visible = false;
  }
  for (const footprint of control.footprints) {
    if (!footprint.mesh.visible) continue;
    footprint.age += delta;
    const progress = THREE.MathUtils.clamp(footprint.age / 28, 0, 1);
    footprint.mesh.material.opacity = (1 - progress) * 0.28;
    if (progress >= 1) footprint.mesh.visible = false;
  }
}

export function fireAtAtCannon(control: AtAtControl): boolean {
  if (control.cannonCooldown > 0) return false;
  const side = control.nextCannonSide;
  control.nextCannonSide = side === 0 ? 1 : 0;
  const pivot = control.cannonPivots[side];
  control.cannonRecoil[side] = 0.34;
  pivot.position.z = -2.55 + control.cannonRecoil[side];
  const beam = control.laserBeams.find((candidate) => !candidate.mesh.visible) ?? control.laserBeams[0];
  const start = new THREE.Vector3();
  pivot.getWorldPosition(start);
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(pivot.getWorldQuaternion(new THREE.Quaternion())).normalize();
  // The cannon fires a short, visible laser bolt that travels forward like an
  // aircraft weapon. It is deliberately not a full-length beam from muzzle to
  // horizon, so the projectile remains readable while moving away.
  const end = start.clone().addScaledVector(direction, 8.5);
  const localStart = control.group.worldToLocal(start.clone());
  const localEnd = control.group.worldToLocal(end.clone());
  const localDirection = localEnd.clone().sub(localStart);
  const length = localDirection.length();
  beam.mesh.position.copy(localStart.clone().add(localDirection.multiplyScalar(0.5)));
  beam.mesh.scale.set(1, length, 1);
  beam.direction.copy(localDirection).normalize();
  beam.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beam.direction);
  beam.mesh.material.opacity = 0.92;
  beam.mesh.visible = true;
  beam.age = 0;
  control.cannonMaterials[side].emissiveIntensity = 2.8;
  control.cannonLights[side].intensity = 2.4;
  control.cockpitLight.intensity = 2.8;
  control.cannonCooldown = 0.28;
  return true;
}

export function updateAtAtWeapons(control: AtAtControl, delta: number) {
  control.cannonCooldown = Math.max(0, control.cannonCooldown - delta);
  for (let i = 0; i < control.cannonMaterials.length; i += 1) {
    control.cannonRecoil[i] = THREE.MathUtils.lerp(control.cannonRecoil[i], 0, 1 - Math.pow(0.001, delta));
    control.cannonPivots[i].position.z = -2.55 + control.cannonRecoil[i];
    control.cannonMaterials[i].emissiveIntensity = THREE.MathUtils.lerp(control.cannonMaterials[i].emissiveIntensity, 0.72, 1 - Math.pow(0.01, delta));
    control.cannonLights[i].intensity = THREE.MathUtils.lerp(control.cannonLights[i].intensity, 0.36, 1 - Math.pow(0.01, delta));
  }
  control.cockpitLight.intensity = THREE.MathUtils.lerp(control.cockpitLight.intensity, 0, 1 - Math.pow(0.001, delta));
  for (const beam of control.laserBeams) {
    if (!beam.mesh.visible) continue;
    beam.age += delta;
    beam.mesh.position.addScaledVector(beam.direction, delta * 42);
    const progress = THREE.MathUtils.clamp(beam.age / 1.35, 0, 1);
    beam.mesh.material.opacity = (1 - progress) * 0.92;
    if (progress >= 1) beam.mesh.visible = false;
  }
}

export function resetAtAtPose(control: AtAtControl) {
  control.speed = 0;
  control.gaitPhase = 0;
  control.body.position.y = 0;
  control.body.rotation.set(0, 0, 0);
  control.head.rotation.set(0, 0, 0);
  for (const leg of control.legs) {
    leg.hip.rotation.set(0, 0, 0);
    leg.knee.rotation.set(0, 0, 0);
    leg.ankle.rotation.set(0, 0, 0);
    leg.foot.rotation.set(0, 0, 0);
  }
  for (const puff of control.dustPuffs) puff.mesh.visible = false;
  for (const footprint of control.footprints) footprint.mesh.visible = false;
  for (const beam of control.laserBeams) {
    beam.mesh.visible = false;
    beam.mesh.scale.y = 0;
  }
  control.cannonCooldown = 0;
  control.nextCannonSide = 0;
  control.cannonRecoil[0] = 0;
  control.cannonRecoil[1] = 0;
  control.cannonPivots[0].position.z = -2.55;
  control.cannonPivots[1].position.z = -2.55;
  control.cockpitLight.intensity = 0;
  for (let i = 0; i < control.cannonMaterials.length; i += 1) {
    control.cannonMaterials[i].emissiveIntensity = 0.72;
    control.cannonLights[i].intensity = 0.36;
  }
}
