import * as THREE from "three";

type TunnelSegment = {
  group: THREE.Group;
  seed: number;
  z: number;
  baseRotation: number;
  twist: number;
};

const root = document.querySelector<HTMLDivElement>("#scene-root");

if (!root) {
  throw new Error("Missing #scene-root");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050504);
scene.fog = new THREE.FogExp2(0x050504, 0.035);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 170);
camera.position.set(0, 0, 15.5);
camera.lookAt(0, 0, -40);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xd8ccb8, 0.72);
scene.add(ambient);

const keyLight = new THREE.PointLight(0xfff4d0, 85, 64, 1.65);
keyLight.position.set(-4.5, 5.5, 7);
scene.add(keyLight);

const innerGlow = new THREE.PointLight(0x8fb7ff, 42, 88, 1.35);
innerGlow.position.set(0, 0, -42);
scene.add(innerGlow);

const farGlow = new THREE.PointLight(0xffffff, 18, 72, 1.8);
farGlow.position.set(0, 0, -86);
scene.add(farGlow);

const ivoryMaterial = new THREE.MeshStandardMaterial({
  color: 0xe8dfca,
  roughness: 0.68,
  metalness: 0.04,
});

const boneMaterial = new THREE.MeshStandardMaterial({
  color: 0xb9b29d,
  roughness: 0.84,
  metalness: 0.02,
});

const shadowMaterial = new THREE.MeshStandardMaterial({
  color: 0x151511,
  roughness: 0.9,
  metalness: 0.12,
});

const lineMaterial = new THREE.MeshStandardMaterial({
  color: 0x2f3028,
  roughness: 0.78,
  metalness: 0.18,
});

const glintMaterial = new THREE.MeshStandardMaterial({
  color: 0xf8f2df,
  emissive: 0x342d20,
  roughness: 0.42,
  metalness: 0.08,
});

const ribGeometry = new THREE.TorusGeometry(7.15, 0.09, 7, 144);
const innerRibGeometry = new THREE.TorusGeometry(4.35, 0.055, 6, 112);
const panelGeometry = new THREE.BoxGeometry(1, 1, 1);
const insetGeometry = new THREE.BoxGeometry(1, 1, 1);
const strutGeometry = new THREE.BoxGeometry(1, 1, 1);
const toothGeometry = new THREE.BoxGeometry(1, 1, 1);

const SEGMENT_COUNT = 52;
const SEGMENT_SPACING = 2.05;
const LOOP_LENGTH = SEGMENT_COUNT * SEGMENT_SPACING;
const FRONT_Z = 9.5;
const BACK_Z = FRONT_Z - LOOP_LENGTH;

let tunnelSpeed = 13.5;
let twistEnabled = true;
let paused = false;

const seeded = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

function createBlock(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: THREE.Vector3,
  rotationZ: number,
  scale: THREE.Vector3,
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.z = rotationZ;
  mesh.scale.copy(scale);
  return mesh;
}

function makeSegment(index: number): TunnelSegment {
  const group = new THREE.Group();
  const seed = index * 19.73 + 3.1;
  const z = FRONT_Z - index * SEGMENT_SPACING;
  const baseRotation = seeded(seed) * Math.PI * 2;
  const radiusPulse = 0.72 + seeded(seed + 0.4) * 0.7;
  const ovalX = 1 + (seeded(seed + 1.2) - 0.5) * 0.16;
  const ovalY = 1 + (seeded(seed + 2.2) - 0.5) * 0.18;

  const rib = new THREE.Mesh(ribGeometry, index % 4 === 0 ? glintMaterial : boneMaterial);
  rib.position.z = 0;
  rib.scale.set(ovalX * (1 + radiusPulse * 0.025), ovalY, 1);
  rib.rotation.z = baseRotation * 0.35;
  group.add(rib);

  if (index % 2 === 0) {
    const innerRib = new THREE.Mesh(innerRibGeometry, shadowMaterial);
    innerRib.position.z = -0.18;
    innerRib.scale.set(ovalY * 1.06, ovalX * 0.96, 1);
    innerRib.rotation.z = baseRotation * -0.52;
    group.add(innerRib);
  }

  const panelCount = 14 + Math.floor(seeded(seed + 3.6) * 8);
  for (let i = 0; i < panelCount; i += 1) {
    const localSeed = seed + i * 5.217;
    const angle = baseRotation + (i / panelCount) * Math.PI * 2 + (seeded(localSeed) - 0.5) * 0.08;
    const radial = 6.15 + seeded(localSeed + 1) * 2.25;
    const tangential = 0.64 + seeded(localSeed + 2) * 1.42;
    const depth = 0.35 + seeded(localSeed + 3) * 1.05;
    const height = 0.18 + seeded(localSeed + 4) * 0.65;
    const x = Math.cos(angle) * radial * ovalX;
    const y = Math.sin(angle) * radial * ovalY;
    const material = seeded(localSeed + 5) > 0.42 ? ivoryMaterial : shadowMaterial;

    const panel = createBlock(
      panelGeometry,
      material,
      new THREE.Vector3(x, y, (seeded(localSeed + 6) - 0.5) * 0.44),
      angle,
      new THREE.Vector3(height, tangential, depth),
    );
    panel.rotation.x = (seeded(localSeed + 7) - 0.5) * 0.15;
    panel.rotation.y = (seeded(localSeed + 8) - 0.5) * 0.18;
    group.add(panel);

    if (seeded(localSeed + 9) > 0.36) {
      const insetRadius = radial - 0.32 - seeded(localSeed + 10) * 0.55;
      const inset = createBlock(
        insetGeometry,
        seeded(localSeed + 11) > 0.58 ? lineMaterial : shadowMaterial,
        new THREE.Vector3(Math.cos(angle) * insetRadius * ovalX, Math.sin(angle) * insetRadius * ovalY, 0.27),
        angle,
        new THREE.Vector3(0.05, tangential * 0.54, 0.08),
      );
      group.add(inset);
    }

    if (i % 3 === 0) {
      const strutRadius = 5.05 + seeded(localSeed + 12) * 0.65;
      const strut = createBlock(
        strutGeometry,
        lineMaterial,
        new THREE.Vector3(Math.cos(angle) * strutRadius * ovalX, Math.sin(angle) * strutRadius * ovalY, -0.18),
        angle + Math.PI * 0.5,
        new THREE.Vector3(0.035, 1.1 + seeded(localSeed + 13) * 1.8, 0.04),
      );
      strut.rotation.y = 0.2 + seeded(localSeed + 14) * 0.38;
      group.add(strut);
    }
  }

  const toothCount = 9 + Math.floor(seeded(seed + 20.4) * 7);
  for (let i = 0; i < toothCount; i += 1) {
    const localSeed = seed + i * 9.33;
    const angle = baseRotation * 1.7 + (i / toothCount) * Math.PI * 2;
    const radius = 3.34 + seeded(localSeed + 1) * 0.95;
    const tooth = createBlock(
      toothGeometry,
      seeded(localSeed + 2) > 0.52 ? ivoryMaterial : shadowMaterial,
      new THREE.Vector3(Math.cos(angle) * radius * ovalX, Math.sin(angle) * radius * ovalY, 0.08),
      angle,
      new THREE.Vector3(0.28 + seeded(localSeed + 3) * 0.56, 0.1, 0.56 + seeded(localSeed + 4) * 0.58),
    );
    tooth.rotation.x = Math.PI * 0.5 + (seeded(localSeed + 5) - 0.5) * 0.14;
    group.add(tooth);
  }

  group.position.z = z;
  scene.add(group);

  return {
    group,
    seed,
    z,
    baseRotation,
    twist: (seeded(seed + 40.1) - 0.5) * 1.8,
  };
}

const segments = Array.from({ length: SEGMENT_COUNT }, (_, index) => makeSegment(index));

const coreGeometry = new THREE.CircleGeometry(4.2, 96);
const coreMaterial = new THREE.MeshBasicMaterial({
  color: 0x020202,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
});
const core = new THREE.Mesh(coreGeometry, coreMaterial);
core.position.z = -92;
scene.add(core);

const haloGeometry = new THREE.RingGeometry(3.8, 8.2, 160);
const haloMaterial = new THREE.MeshBasicMaterial({
  color: 0xc8d4ff,
  transparent: true,
  opacity: 0.12,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const halo = new THREE.Mesh(haloGeometry, haloMaterial);
halo.position.z = -74;
scene.add(halo);

const starGeometry = new THREE.BufferGeometry();
const starPositions: number[] = [];
for (let i = 0; i < 900; i += 1) {
  const seed = i * 4.91;
  const angle = seeded(seed) * Math.PI * 2;
  const radius = 12 + seeded(seed + 1) * 56;
  const z = -120 + seeded(seed + 2) * 142;
  starPositions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
}
starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({
    color: 0xf6eed9,
    size: 0.035,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  }),
);
scene.add(stars);

const speedButton = document.querySelector<HTMLButtonElement>("#speed-toggle");
const twistButton = document.querySelector<HTMLButtonElement>("#twist-toggle");
const pauseButton = document.querySelector<HTMLButtonElement>("#pause-toggle");

speedButton?.addEventListener("click", () => {
  tunnelSpeed = tunnelSpeed > 16 ? 9.5 : 20.5;
  speedButton.textContent = tunnelSpeed > 16 ? "RUSH" : "SLOW";
});

twistButton?.addEventListener("click", () => {
  twistEnabled = !twistEnabled;
  twistButton.textContent = twistEnabled ? "TWIST" : "STABLE";
});

pauseButton?.addEventListener("click", () => {
  paused = !paused;
  pauseButton.textContent = paused ? "RESUME" : "PAUSE";
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const rawDelta = Math.min(clock.getDelta(), 0.045);
  const delta = paused ? 0 : rawDelta;
  const elapsed = clock.elapsedTime;

  const cameraDriftX = Math.sin(elapsed * 0.37) * 0.25 + Math.sin(elapsed * 0.91) * 0.08;
  const cameraDriftY = Math.cos(elapsed * 0.31) * 0.2;
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, cameraDriftX, 0.035);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, cameraDriftY, 0.035);
  camera.rotation.z = Math.sin(elapsed * 0.19) * 0.04;
  camera.lookAt(cameraDriftX * 0.3, cameraDriftY * 0.3, -48);

  innerGlow.intensity = 35 + Math.sin(elapsed * 1.7) * 8;
  halo.rotation.z -= delta * 0.22;
  halo.material.opacity = 0.1 + Math.sin(elapsed * 1.3) * 0.025;
  core.scale.setScalar(1 + Math.sin(elapsed * 1.1) * 0.05);
  stars.rotation.z += delta * 0.01;

  for (const segment of segments) {
    segment.z += tunnelSpeed * delta;

    if (segment.z > FRONT_Z) {
      segment.z -= LOOP_LENGTH;
      segment.baseRotation += Math.PI * 0.618;
    }

    segment.group.position.z = segment.z;
    const depthFactor = THREE.MathUtils.clamp((segment.z - BACK_Z) / LOOP_LENGTH, 0, 1);
    const pulse = 1 + Math.sin(elapsed * 1.4 + segment.seed) * 0.016;
    const nearScale = 0.74 + depthFactor * 0.38;
    segment.group.scale.setScalar(nearScale * pulse);
    segment.group.rotation.z =
      segment.baseRotation * 0.08 +
      (twistEnabled ? elapsed * 0.16 + segment.twist * Math.sin(elapsed * 0.4 + segment.seed) : 0);
  }

  renderer.render(scene, camera);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.fov = width < 720 ? 76 : 68;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 720 ? 1.15 : 1.35));
  renderer.setSize(width, height);
}

window.addEventListener("resize", resize);
resize();
animate();
