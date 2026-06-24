import * as THREE from "three";

export type FufuCatRig = {
  group: THREE.Group;
  visual: THREE.Group;
  head: THREE.Object3D;
  tail: THREE.Object3D;
  frontLeftLeg: THREE.Object3D;
  frontRightLeg: THREE.Object3D;
  rearLeftLeg: THREE.Object3D;
  rearRightLeg: THREE.Object3D;
};

function makeMaterial(color: number, roughness = 0.72, metalness = 0.03, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity: emissive ? 0.28 : 0,
    flatShading: true,
  });
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material) {
  const item = new THREE.Mesh(geometry, material);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function ellipsoid(radius: number, material: THREE.Material, scale: THREE.Vector3Tuple) {
  const item = mesh(new THREE.SphereGeometry(radius, 10, 8), material);
  item.scale.set(scale[0], scale[1], scale[2]);
  return item;
}

function capsule(radius: number, length: number, material: THREE.Material) {
  return mesh(new THREE.CapsuleGeometry(radius, length, 5, 8), material);
}

function whisker(points: THREE.Vector3[], material: THREE.Material) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}

export function createFufuCat(): FufuCatRig {
  const group = new THREE.Group();
  group.name = "Fufu cat controller";

  const visual = new THREE.Group();
  visual.name = "Fufu cat visual";
  group.add(visual);

  const black = makeMaterial(0x101214, 0.82, 0.04);
  const white = makeMaterial(0xf4efe6, 0.78, 0.02);
  const suitWhite = makeMaterial(0xe9edf0, 0.62, 0.06);
  const graphite = makeMaterial(0x24282c, 0.55, 0.18);
  const pink = makeMaterial(0xc77a70, 0.82, 0.02);
  const yellow = makeMaterial(0xf4e44a, 0.38, 0.04, 0xb0a114);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xc8f4ff,
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    flatShading: true,
  });
  const cyan = new THREE.LineBasicMaterial({ color: 0x9ff7ff, transparent: true, opacity: 0.92 });

  const body = ellipsoid(1, suitWhite, [0.34, 0.23, 0.68]);
  body.position.y = 0.42;
  visual.add(body);

  const chest = ellipsoid(1, white, [0.2, 0.18, 0.34]);
  chest.position.set(0, 0.44, -0.3);
  visual.add(chest);

  const chestPanel = ellipsoid(1, graphite, [0.09, 0.055, 0.03]);
  chestPanel.position.set(0, 0.5, -0.52);
  visual.add(chestPanel);

  const head = new THREE.Group();
  head.position.set(0, 0.73, -0.55);
  visual.add(head);

  const skull = ellipsoid(1, black, [0.25, 0.24, 0.23]);
  head.add(skull);

  const muzzle = ellipsoid(1, white, [0.2, 0.13, 0.13]);
  muzzle.position.set(0, -0.05, -0.15);
  head.add(muzzle);

  const faceStripe = ellipsoid(1, white, [0.07, 0.2, 0.04]);
  faceStripe.position.set(0, 0.08, -0.2);
  head.add(faceStripe);

  const nose = ellipsoid(1, black, [0.035, 0.024, 0.02]);
  nose.position.set(0, -0.03, -0.265);
  head.add(nose);

  for (const side of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.105, 0.26, 4), black);
    ear.position.set(side * 0.14, 0.24, -0.015);
    ear.rotation.z = side * -0.2;
    head.add(ear);

    const innerEar = mesh(new THREE.ConeGeometry(0.066, 0.16, 4), pink);
    innerEar.position.set(side * 0.14, 0.235, -0.035);
    innerEar.rotation.z = side * -0.2;
    head.add(innerEar);

    const eye = ellipsoid(1, yellow, [0.045, 0.06, 0.018]);
    eye.position.set(side * 0.088, 0.06, -0.22);
    head.add(eye);
  }

  const whiskerSets = [
    [-0.05, -0.19, -0.38],
    [-0.04, -0.12, -0.4],
    [-0.04, -0.25, -0.35],
  ];
  for (const [y, endY, endZ] of whiskerSets) {
    head.add(whisker([new THREE.Vector3(-0.07, y, -0.2), new THREE.Vector3(-0.34, endY, endZ)], cyan));
    head.add(whisker([new THREE.Vector3(0.07, y, -0.2), new THREE.Vector3(0.34, endY, endZ)], cyan));
  }

  const helmet = mesh(new THREE.SphereGeometry(0.42, 14, 10), glass);
  helmet.position.set(0, 0.03, -0.02);
  helmet.scale.set(1.04, 1, 1.02);
  helmet.castShadow = false;
  head.add(helmet);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.035, 8, 18), graphite);
  collar.position.set(0, 0.62, -0.5);
  collar.rotation.x = Math.PI / 2;
  collar.castShadow = true;
  visual.add(collar);

  const frontLeftLeg = makeLeg(-0.16, -0.32, suitWhite, graphite);
  const frontRightLeg = makeLeg(0.16, -0.32, suitWhite, graphite);
  const rearLeftLeg = makeLeg(-0.18, 0.28, suitWhite, graphite);
  const rearRightLeg = makeLeg(0.18, 0.28, suitWhite, graphite);
  visual.add(frontLeftLeg, frontRightLeg, rearLeftLeg, rearRightLeg);

  const tail = new THREE.Group();
  tail.position.set(0, 0.48, 0.58);
  const tailMesh = capsule(0.048, 0.62, suitWhite);
  tailMesh.position.set(0.04, 0.03, 0.3);
  tailMesh.rotation.x = Math.PI / 2.25;
  tailMesh.rotation.z = -0.34;
  const tailTip = ellipsoid(1, black, [0.055, 0.055, 0.085]);
  tailTip.position.set(0.08, -0.23, 0.55);
  tail.add(tailMesh);
  tail.add(tailTip);
  visual.add(tail);

  const backPack = ellipsoid(1, graphite, [0.18, 0.14, 0.12]);
  backPack.position.set(0, 0.48, 0.46);
  visual.add(backPack);

  group.scale.setScalar(1.38);
  return { group, visual, head, tail, frontLeftLeg, frontRightLeg, rearLeftLeg, rearRightLeg };
}

function makeLeg(x: number, z: number, upperMaterial: THREE.Material, pawMaterial = upperMaterial) {
  const leg = new THREE.Group();
  leg.position.set(x, 0.34, z);
  const upper = capsule(0.045, 0.22, upperMaterial);
  upper.position.y = -0.12;
  const paw = ellipsoid(1, pawMaterial, [0.055, 0.035, 0.095]);
  paw.position.set(0, -0.26, -0.035);
  leg.add(upper, paw);
  return leg;
}

export function updateFufuCat(rig: FufuCatRig, speed: number, elapsed: number, alert = 0) {
  const moveAmount = THREE.MathUtils.smoothstep(speed, 0.18, 6.8);
  const moving = moveAmount > 0.02;
  const gaitFrequency = THREE.MathUtils.lerp(2.4, 8.8, moveAmount);
  const gait = Math.sin(elapsed * gaitFrequency);
  const legAmount = THREE.MathUtils.lerp(0.06, 0.42, moveAmount);
  const idleLook = Math.sin(elapsed * 0.72) * 0.36 + Math.sin(elapsed * 1.55 + 0.8) * 0.08;

  rig.visual.position.y = moving ? Math.abs(Math.sin(elapsed * gaitFrequency)) * 0.018 : Math.sin(elapsed * 1.2) * 0.01;
  rig.visual.rotation.x = moving ? -0.045 - moveAmount * 0.035 : 0;
  rig.head.rotation.y = moving ? gait * 0.035 : THREE.MathUtils.lerp(idleLook, 0, alert);
  rig.head.rotation.x = moving ? -0.02 : Math.sin(elapsed * 0.58 + 1.1) * 0.035 - alert * 0.035;
  rig.tail.rotation.y = Math.sin(elapsed * THREE.MathUtils.lerp(2.4, 5.8, moveAmount)) * THREE.MathUtils.lerp(0.16, 0.28, moveAmount);
  rig.tail.rotation.x = moving ? 0.2 + Math.abs(gait) * 0.08 : 0.32 + Math.sin(elapsed * 1.1) * 0.05;

  rig.frontLeftLeg.rotation.x = gait * legAmount;
  rig.rearRightLeg.rotation.x = gait * legAmount * 0.85;
  rig.frontRightLeg.rotation.x = -gait * legAmount;
  rig.rearLeftLeg.rotation.x = -gait * legAmount * 0.85;
}
