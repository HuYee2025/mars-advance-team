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
};

const MARS_RADIUS_KM = 3390;
const LOW_ORBIT_KM = 360;
const RELAY_ORBIT_KM = 525;
const STARLINK_TRAIN_COUNT = 5;
const SATELLITES_PER_TRAIN = 7;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const scratchPosition = new THREE.Vector3();
const scratchForward = new THREE.Vector3();
let starlinkGlintTexture: THREE.CanvasTexture | null = null;

export function createStarlinkConstellation(planetRadius: number) {
  const lowOrbitAltitude = LOW_ORBIT_KM * (planetRadius / MARS_RADIUS_KM);
  const group = new THREE.Group();
  group.name = "ARES Starlink-M Constellation";

  const anchor = new THREE.Object3D();
  anchor.name = "Starlink-M orbital link anchor";
  anchor.position.set(0, planetRadius + lowOrbitAltitude, 0);
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
    satellite.object.visible = stormStrength < 0.97 || index % 2 === 0;
  });
}

export function starlinkStatusText(constellation: StarlinkConstellation) {
  return `Starlink-M ${constellation.trainCount}组 x ${constellation.satellitesPerTrain}｜${constellation.satellites.length}颗在轨`;
}

export function starlinkStatusTextEn(constellation: StarlinkConstellation) {
  return `Starlink-M ${constellation.trainCount} groups x ${constellation.satellitesPerTrain} | ${constellation.satellites.length} in orbit`;
}

function generateFixedStarlinkTrains(constellation: StarlinkConstellation) {
  const orbitUnitPerKm = constellation.planetRadius / MARS_RADIUS_KM;
  const lowOrbitAltitude = LOW_ORBIT_KM * orbitUnitPerKm;
  const relayOrbitAltitude = RELAY_ORBIT_KM * orbitUnitPerKm;
  const trainConfigs: Array<{ layer: StarlinkSatellite["layer"]; altitude: number; inclination: number; raan: number; direction: 1 | -1 }> = [
    { layer: "coverage", altitude: lowOrbitAltitude, inclination: THREE.MathUtils.degToRad(18), raan: THREE.MathUtils.degToRad(8), direction: 1 },
    { layer: "coverage", altitude: lowOrbitAltitude * 1.08, inclination: THREE.MathUtils.degToRad(36), raan: THREE.MathUtils.degToRad(78), direction: -1 },
    { layer: "polar", altitude: lowOrbitAltitude * 1.16, inclination: THREE.MathUtils.degToRad(66), raan: THREE.MathUtils.degToRad(148), direction: 1 },
    { layer: "coverage", altitude: lowOrbitAltitude * 1.24, inclination: THREE.MathUtils.degToRad(42), raan: THREE.MathUtils.degToRad(224), direction: -1 },
    { layer: "relay", altitude: relayOrbitAltitude, inclination: THREE.MathUtils.degToRad(58), raan: THREE.MathUtils.degToRad(304), direction: 1 },
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

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9dde0,
    roughness: 0.42,
    metalness: 0.44,
    emissive: 0x07111c,
    emissiveIntensity: 0.24,
  });
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c2630,
    roughness: 0.68,
    metalness: 0.18,
    emissive: 0x061627,
    emissiveIntensity: 0.18,
  });
  const antennaMaterial = new THREE.MeshStandardMaterial({
    color: 0x252a2d,
    roughness: 0.56,
    metalness: 0.32,
  });

  const visibleScale = data.layer === "relay" ? 0.34 : 0.31;
  const bus = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.15), bodyMaterial);
  const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.012, 0.12), antennaMaterial);
  antenna.position.y = -0.026;
  const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.012, 0.17), panelMaterial);
  leftPanel.position.x = -0.36;
  const rightPanel = leftPanel.clone();
  rightPanel.position.x = 0.36;
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({
    map: getStarlinkGlintTexture(),
    color: data.layer === "relay" ? 0xb8e8ff : 0xf4fbff,
    transparent: true,
    opacity: data.layer === "relay" ? 0.9 : 0.82,
    depthWrite: false,
  }));
  glint.scale.setScalar(data.layer === "relay" ? 0.72 : 0.64);

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

  object.add(bus, antenna, leftPanel, rightPanel, glint, hitArea);
  object.scale.setScalar(visibleScale);
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = false;
      child.receiveShadow = false;
      child.renderOrder = 4;
    }
  });

  const light = new THREE.PointLight(data.layer === "relay" ? 0x9fe2ff : 0xf7fbff, data.layer === "relay" ? 0.24 : 0.18, 26);
  object.add(light);
  return { ...data, object, light };
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
  gradient.addColorStop(0.32, "rgba(224,246,255,0.74)");
  gradient.addColorStop(0.7, "rgba(154,220,255,0.16)");
  gradient.addColorStop(1, "rgba(154,220,255,0)");
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
