import * as THREE from "three";

function mat(color: number, roughness = 0.76, metalness = 0.08, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: emissive ? 0.42 : 0, flatShading: true });
}

function box(w: number, h: number, d: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createCybertruckRover(size: number) {
  const group = new THREE.Group();
  group.name = "Cybertruck-inspired stainless patrol rover";
  const steel = mat(0xc5c8c4, 0.34, 0.62);
  const steelShade = mat(0x8f9693, 0.42, 0.54);
  const dark = mat(0x090b0d, 0.68, 0.32);
  const glass = mat(0x071016, 0.18, 0.52, 0x0a2833);
  const light = mat(0xf8f0df, 0.18, 0.22, 0xffe9b0);
  const glassMaterial = glass as THREE.MeshStandardMaterial;
  glassMaterial.side = THREE.DoubleSide;

  const body = createCybertruckPrism(
    [
      [-3.35, 0.56],
      [-3.3, 1.12],
      [-2.38, 1.3],
      [-0.58, 2.16],
      [3.34, 1.17],
      [3.34, 0.56],
    ],
    2.5,
    steel
  );
  body.castShadow = true;
  body.receiveShadow = true;

  const rocker = box(2.6 * size, 0.28 * size, 6.3 * size, dark);
  rocker.position.set(0, 0.48 * size, 0);

  const windshield = box(2.34 * size, 0.055 * size, 1.91 * size, glass);
  windshield.position.set(0, 1.72 * size, -1.48 * size);
  windshield.rotation.x = -0.45;
  const frontLight = box(2.18 * size, 0.075 * size, 0.055 * size, light);
  frontLight.position.set(0, 1.12 * size, -3.37 * size);

  group.add(body, rocker, windshield, frontLight);
  for (const side of [-1, 1] as const) {
    group.add(
      createCybertruckSidePanel(side, [[-2.3, 1.34], [-0.62, 2.1], [-0.08, 2.08], [-0.18, 1.36]]),
      createCybertruckSidePanel(side, [[0.02, 1.36], [0.02, 2.07], [1.24, 1.7], [1.34, 1.31]]),
    );
    const beltLine = box(0.055 * size, 0.055 * size, 4.95 * size, steelShade);
    beltLine.position.set(side * 1.27 * size, 1.27 * size, 0.25 * size);
    group.add(beltLine);
  }

  const wheels: THREE.Mesh[] = [];
  for (const sx of [-1.28, 1.28]) {
    for (const sz of [-2.18, 2.04]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.58 * size, 0.58 * size, 0.36 * size, 16), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * size, 0.36 * size, sz * size);
      wheel.castShadow = true;
      wheel.receiveShadow = true;
      wheels.push(wheel);
      const fender = new THREE.Mesh(new THREE.TorusGeometry(0.65 * size, 0.09 * size, 5, 12), dark);
      fender.rotation.y = Math.PI / 2;
      fender.position.set(sx * size, 0.56 * size, sz * size);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * size, 0.22 * size, 0.39 * size, 10), steelShade);
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position);
      group.add(wheel, fender, hub);
    }
  }

  group.userData.wheels = wheels;
  markCoreLodFallback(group, wheels);
  return group;

  function createCybertruckPrism(profile: Array<[number, number]>, width: number, material: THREE.Material) {
    const halfWidth = (width * size) / 2;
    const vertices: number[] = [];
    for (const x of [-halfWidth, halfWidth]) {
      for (const [z, y] of profile) vertices.push(x, y * size, z * size);
    }
    const faces: number[] = [];
    for (let i = 1; i < profile.length - 1; i += 1) faces.push(0, i, i + 1);
    const offset = profile.length;
    for (let i = 1; i < profile.length - 1; i += 1) faces.push(offset, offset + i + 1, offset + i);
    for (let i = 0; i < profile.length; i += 1) {
      const next = (i + 1) % profile.length;
      faces.push(i, next, offset + next, i, offset + next, offset + i);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(faces);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, material);
  }

  function createCybertruckSidePanel(side: -1 | 1, profile: Array<[number, number]>) {
    const x = side * 1.28 * size;
    const vertices = profile.flatMap(([z, y]) => [x, y * size, z * size]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(side < 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
    geometry.computeVertexNormals();
    const panel = new THREE.Mesh(geometry, glass);
    panel.castShadow = true;
    return panel;
  }
}

export function createUtilityBot(size: number) {
  const group = new THREE.Group();
  const steel = mat(0xc9c4b8, 0.36, 0.72);
  const shadedSteel = mat(0x8f938f, 0.42, 0.68);
  const brightSteel = mat(0xe2ded3, 0.28, 0.76);
  const sensorGlow = mat(0x72def3, 0.2, 0.18, 0x2ca7c4);
  const walkParts: {
    leftArm: THREE.Object3D[];
    rightArm: THREE.Object3D[];
    leftLeg: THREE.Object3D[];
    rightLeg: THREE.Object3D[];
  } = { leftArm: [], rightArm: [], leftLeg: [], rightLeg: [] };

  const pelvis = box(0.48 * size, 0.18 * size, 0.32 * size, shadedSteel);
  pelvis.position.y = 0.66 * size;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28 * size, 0.28 * size, 6, 10), steel);
  torso.position.y = 1.12 * size;
  torso.scale.set(1.08, 1, 0.76);
  const chest = box(0.5 * size, 0.36 * size, 0.04 * size, shadedSteel);
  chest.position.set(0, 1.15 * size, -0.23 * size);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * size, 0.12 * size, 0.12 * size, 8), shadedSteel);
  neck.position.y = 1.58 * size;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3 * size, 12, 8), brightSteel);
  head.position.y = 1.86 * size;
  head.scale.set(1.08, 0.82, 0.9);
  const visor = box(0.4 * size, 0.13 * size, 0.04 * size, shadedSteel);
  visor.position.set(0, 1.85 * size, -0.28 * size);
  const leftEye = box(0.085 * size, 0.055 * size, 0.025 * size, sensorGlow);
  leftEye.position.set(-0.1 * size, 1.86 * size, -0.315 * size);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.1 * size;
  const chestStatus = box(0.18 * size, 0.045 * size, 0.025 * size, sensorGlow);
  chestStatus.position.set(0.11 * size, 1.18 * size, -0.275 * size);
  group.add(pelvis, torso, chest, neck, head, visor, leftEye, rightEye, chestStatus);

  for (const side of [-1, 1]) {
    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.13 * size, 8, 6), brightSteel);
    shoulderCap.position.set(side * 0.43 * size, 1.42 * size, 0);
    shoulderCap.scale.set(1, 0.86, 0.92);
    const shoulder = box(0.18 * size, 0.2 * size, 0.28 * size, brightSteel);
    shoulder.position.set(side * 0.43 * size, 1.42 * size, 0);
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * size, 0.06 * size, 0.46 * size, 6), steel);
    upperArm.position.set(side * 0.58 * size, 1.12 * size, 0);
    upperArm.rotation.z = side * 0.18;
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.052 * size, 0.064 * size, 0.42 * size, 6), steel);
    forearm.position.set(side * 0.62 * size, 0.78 * size, -0.02 * size);
    forearm.rotation.z = side * -0.08;
    const hand = box(0.12 * size, 0.1 * size, 0.14 * size, shadedSteel);
    hand.position.set(side * 0.62 * size, 0.51 * size, -0.02 * size);
    group.add(shoulderCap, shoulder, upperArm, forearm, hand);
    (side < 0 ? walkParts.leftArm : walkParts.rightArm).push(upperArm, forearm, hand);
  }

  for (const side of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * size, 0.075 * size, 0.48 * size, 6), steel);
    thigh.position.set(side * 0.18 * size, 0.42 * size, 0);
    thigh.rotation.z = side * -0.04;
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * size, 0.07 * size, 0.42 * size, 6), steel);
    shin.position.set(side * 0.19 * size, 0.14 * size, 0);
    const foot = box(0.2 * size, 0.08 * size, 0.32 * size, shadedSteel);
    foot.position.set(side * 0.19 * size, -0.1 * size, -0.08 * size);
    group.add(thigh, shin, foot);
    (side < 0 ? walkParts.leftLeg : walkParts.rightLeg).push(thigh, shin, foot);
  }
  group.userData.walkParts = walkParts;
  group.userData.botSize = size;
  markCoreLodFallback(group, [
    ...walkParts.leftArm,
    ...walkParts.rightArm,
    ...walkParts.leftLeg,
    ...walkParts.rightLeg,
  ]);
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}

function markCoreLodFallback(root: THREE.Object3D, animatedBranches: readonly THREE.Object3D[]) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    let current: THREE.Object3D | null = object;
    let animated = false;
    while (current && current !== root) {
      if (animatedBranches.includes(current)) {
        animated = true;
        break;
      }
      current = current.parent;
    }
    if (!animated) object.userData.coreLodFallback = true;
  });
}
