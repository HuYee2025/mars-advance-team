import * as THREE from "three";

export type StarlinkSatellite = {
  id: string;
  object: THREE.Group;
  light: THREE.PointLight;
  orbitAxis: THREE.Vector3;
  orbitRight: THREE.Vector3;
  orbitForward: THREE.Vector3;
  orbitRadius: number;
  phase: number;
  angularSpeed: number;
  layer: "coverage" | "polar" | "relay";
};

export type StarlinkConstellation = {
  group: THREE.Group;
  anchor: THREE.Object3D;
  satellites: StarlinkSatellite[];
  planetRadius: number;
  trainCount: number;
  satellitesPerTrain: number;
  initialized: boolean;
  renderBatches?: StarlinkRenderBatches;
};

type StarlinkRenderBatches = {
  buses: THREE.InstancedMesh;
  antennas: THREE.InstancedMesh;
  panels: THREE.InstancedMesh;
  glints: THREE.Points;
  glintPositions: THREE.BufferAttribute;
};

const STARLINK_BASE_ALTITUDE = 190;
const STARLINK_TRAIN_COUNT = 5;
const SATELLITES_PER_TRAIN = 7;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const scratchPosition = new THREE.Vector3();
const scratchForward = new THREE.Vector3();
const scratchMatrix = new THREE.Matrix4();
const scratchLocalMatrix = new THREE.Matrix4();
const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
let starlinkGlintTexture: THREE.CanvasTexture | null = null;

export function createStarlinkConstellation(planetRadius: number) {
  const group = new THREE.Group();
  group.name = "ARES Starlink-M Constellation";

  const anchor = new THREE.Object3D();
  anchor.name = "Starlink-M orbital link anchor";
  anchor.position.set(0, planetRadius + STARLINK_BASE_ALTITUDE, 0);
  group.add(anchor);

  const constellation: StarlinkConstellation = {
    group,
    anchor,
    satellites: [],
    planetRadius,
    trainCount: STARLINK_TRAIN_COUNT,
    satellitesPerTrain: SATELLITES_PER_TRAIN,
    initialized: false,
  };

  generateFixedStarlinkTrains(constellation);
  constellation.renderBatches = createStarlinkRenderBatches(constellation);
  group.add(
    constellation.renderBatches.buses,
    constellation.renderBatches.antennas,
    constellation.renderBatches.panels,
    constellation.renderBatches.glints,
  );
  constellation.initialized = true;
  return constellation;
}

export function updateStarlinkConstellation(constellation: StarlinkConstellation, elapsedSeconds: number, stormStrength: number) {
  const stormDimming = THREE.MathUtils.lerp(1, 0.34, THREE.MathUtils.clamp(stormStrength, 0, 1));
  constellation.satellites.forEach((satellite, index) => {
    const angle = satellite.phase + elapsedSeconds * satellite.angularSpeed;
    scratchPosition
      .copy(satellite.orbitRight)
      .multiplyScalar(Math.cos(angle) * satellite.orbitRadius)
      .addScaledVector(satellite.orbitForward, Math.sin(angle) * satellite.orbitRadius);
    satellite.object.position.copy(scratchPosition);

    scratchForward.copy(satellite.orbitForward).multiplyScalar(Math.cos(angle)).addScaledVector(satellite.orbitRight, -Math.sin(angle)).normalize();
    satellite.object.quaternion.setFromUnitVectors(WORLD_UP, scratchPosition.clone().normalize());
    satellite.object.rotateY(Math.atan2(scratchForward.x, scratchForward.z));

    const glint = 0.82 + Math.sin(elapsedSeconds * 1.45 + index * 0.83) * 0.18;
    satellite.light.intensity = (satellite.layer === "relay" ? 0.34 : 0.26) * stormDimming * glint;
    satellite.object.userData.renderVisible = stormStrength < 0.97 || index % 2 === 0;
  });
  updateStarlinkRenderBatches(constellation, stormDimming);
}

export function starlinkStatusText(constellation: StarlinkConstellation) {
  return `Starlink-M ${constellation.trainCount}组 x ${constellation.satellitesPerTrain}｜${constellation.satellites.length}颗在轨`;
}

export function starlinkStatusTextEn(constellation: StarlinkConstellation) {
  return `Starlink-M ${constellation.trainCount} groups x ${constellation.satellitesPerTrain} | ${constellation.satellites.length} in orbit`;
}

function generateFixedStarlinkTrains(constellation: StarlinkConstellation) {
  const trainConfigs: Array<{ layer: StarlinkSatellite["layer"]; altitude: number; inclination: number; raan: number; direction: 1 | -1 }> = [
    { layer: "coverage", altitude: STARLINK_BASE_ALTITUDE, inclination: THREE.MathUtils.degToRad(18), raan: THREE.MathUtils.degToRad(8), direction: 1 },
    { layer: "coverage", altitude: STARLINK_BASE_ALTITUDE + 14, inclination: THREE.MathUtils.degToRad(36), raan: THREE.MathUtils.degToRad(78), direction: -1 },
    { layer: "polar", altitude: STARLINK_BASE_ALTITUDE + 28, inclination: THREE.MathUtils.degToRad(66), raan: THREE.MathUtils.degToRad(148), direction: 1 },
    { layer: "coverage", altitude: STARLINK_BASE_ALTITUDE + 42, inclination: THREE.MathUtils.degToRad(42), raan: THREE.MathUtils.degToRad(224), direction: -1 },
    { layer: "relay", altitude: STARLINK_BASE_ALTITUDE + 68, inclination: THREE.MathUtils.degToRad(58), raan: THREE.MathUtils.degToRad(304), direction: 1 },
  ];

  trainConfigs.forEach((config, trainIndex) => {
    const raan = config.raan;
    const orbitAxis = orbitAxisFromInclination(config.inclination, raan);
    const orbitRight = new THREE.Vector3(Math.cos(raan), 0, Math.sin(raan)).normalize();
    const orbitForward = orbitAxis.clone().cross(orbitRight).normalize();
    const trainPhase = trainIndex * 1.17;
    Array.from({ length: constellation.satellitesPerTrain }, (_, memberIndex) => {
      const absoluteIndex = trainIndex * constellation.satellitesPerTrain + memberIndex;
      const satellite = createStarlinkSatellite({
        id: `starlink-m-${String(absoluteIndex + 1).padStart(3, "0")}`,
        layer: config.layer,
        orbitAxis,
        orbitRight,
        orbitForward,
        orbitRadius: constellation.planetRadius + config.altitude,
        phase: trainPhase + memberIndex * 0.044,
        angularSpeed: (config.layer === "relay" ? 0.012 : 0.017) * config.direction,
      });
      constellation.satellites.push(satellite);
      constellation.group.add(satellite.object);
    });
  });
}

function createStarlinkSatellite(data: Omit<StarlinkSatellite, "object" | "light">): StarlinkSatellite {
  const object = new THREE.Group();
  object.name = data.id;
  object.userData.starlinkId = data.id;

  const visibleScale = data.layer === "relay" ? 1.7 : 1.55;
  const hitArea = new THREE.Mesh(
    new THREE.SphereGeometry(4.1, 8, 6),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      colorWrite: false,
      depthWrite: false,
    })
  );
  hitArea.name = `${data.id} scale gun hit area`;
  hitArea.layers.set(2);

  object.add(hitArea);
  object.scale.setScalar(visibleScale);
  object.userData.renderVisible = true;

  const light = new THREE.PointLight(0xffffff, data.layer === "relay" ? 0.58 : 0.46, 42);
  return { ...data, object, light };
}

function createStarlinkRenderBatches(constellation: StarlinkConstellation): StarlinkRenderBatches {
  const count = constellation.satellites.length;
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0.08,
    emissive: 0xffffff,
    emissiveIntensity: 1.5,
  });
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2fbff,
    roughness: 0.32,
    metalness: 0.06,
    emissive: 0xffffff,
    emissiveIntensity: 1.18,
  });
  const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0x252a2d, roughness: 0.56, metalness: 0.32 });
  const buses = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.035, 0.15), bodyMaterial, count);
  const antennas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.19, 0.012, 0.12), antennaMaterial, count);
  const panels = new THREE.InstancedMesh(new THREE.BoxGeometry(0.48, 0.012, 0.17), panelMaterial, count * 2);
  for (const mesh of [buses, antennas, panels]) {
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = 4;
  }
  buses.name = "Starlink instanced buses";
  antennas.name = "Starlink instanced antennas";
  panels.name = "Starlink instanced solar panels";

  const glintGeometry = new THREE.BufferGeometry();
  const glintPositions = new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3);
  glintPositions.setUsage(THREE.DynamicDrawUsage);
  glintGeometry.setAttribute("position", glintPositions);
  const glints = new THREE.Points(glintGeometry, new THREE.PointsMaterial({
    color: 0xffffff,
    size: 7,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
    map: getStarlinkGlintTexture(),
    alphaTest: 0.04,
  }));
  glints.name = "Starlink instanced glints";
  glints.frustumCulled = false;
  glints.renderOrder = 4;
  return { buses, antennas, panels, glints, glintPositions };
}

function updateStarlinkRenderBatches(constellation: StarlinkConstellation, stormDimming: number) {
  const batches = constellation.renderBatches;
  if (!batches) return;
  constellation.satellites.forEach((satellite, index) => {
    const visible = satellite.object.userData.renderVisible !== false;
    satellite.object.updateMatrix();
    const rootMatrix = visible ? satellite.object.matrix : hiddenMatrix;
    batches.buses.setMatrixAt(index, rootMatrix);
    scratchLocalMatrix.makeTranslation(0, -0.026, 0);
    batches.antennas.setMatrixAt(index, scratchMatrix.copy(rootMatrix).multiply(scratchLocalMatrix));
    scratchLocalMatrix.makeTranslation(-0.36, 0, 0);
    batches.panels.setMatrixAt(index * 2, scratchMatrix.copy(rootMatrix).multiply(scratchLocalMatrix));
    scratchLocalMatrix.makeTranslation(0.36, 0, 0);
    batches.panels.setMatrixAt(index * 2 + 1, scratchMatrix.copy(rootMatrix).multiply(scratchLocalMatrix));
    const position = visible ? satellite.object.position : scratchPosition.set(0, -100000, 0);
    batches.glintPositions.setXYZ(index, position.x, position.y, position.z);
  });
  batches.buses.instanceMatrix.needsUpdate = true;
  batches.antennas.instanceMatrix.needsUpdate = true;
  batches.panels.instanceMatrix.needsUpdate = true;
  batches.glintPositions.needsUpdate = true;
  (batches.glints.material as THREE.PointsMaterial).opacity = 0.94 * stormDimming;
}

function getStarlinkGlintTexture() {
  if (starlinkGlintTexture) return starlinkGlintTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    starlinkGlintTexture = new THREE.CanvasTexture(canvas);
    return starlinkGlintTexture;
  }
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.34, "rgba(255,255,255,0.86)");
  gradient.addColorStop(0.72, "rgba(255,255,255,0.22)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  starlinkGlintTexture = new THREE.CanvasTexture(canvas);
  starlinkGlintTexture.colorSpace = THREE.SRGBColorSpace;
  return starlinkGlintTexture;
}

function orbitAxisFromInclination(inclination: number, raan: number) {
  return new THREE.Vector3(
    Math.sin(inclination) * Math.sin(raan),
    Math.cos(inclination),
    -Math.sin(inclination) * Math.cos(raan)
  ).normalize();
}
