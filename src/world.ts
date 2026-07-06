import * as THREE from "three";
import marsAlbedoUrl from "./assets/mars-albedo-generated.webp";
import meteorRockUrl from "./assets/meteor-rock-generated.png";
import { createStarlinkConstellation, type StarlinkConstellation } from "./orbital-starlink";

export type Interactable = {
  id:
    | "habitatCheck"
    | "greenhouse"
    | "oxygen"
    | "methane"
    | "garage"
    | "tower"
    | "lab"
    | "storehouse"
    | "medical"
    | "solarA"
    | "solarB"
    | "solarC"
    | "cargoShip"
    | "monolith";
  label: string;
  prompt: string;
  object: THREE.Object3D;
  radius: number;
  completed: boolean;
};

type MaintenanceBotConfig = {
  centerX: number;
  centerZ: number;
  speed: number;
  offset: number;
  size: number;
  kind: "bot";
  label: string;
  facilityLabel: string;
  briefing: string;
  patrolPoints: Array<{ x: number; z: number }>;
  waitMin: number;
  waitMax: number;
};

type WheelTrackPatch = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  createdAt: number;
};

type DustParticle = {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
  baseScale: number;
};

type RoverSurfaceEffectState = {
  group: THREE.Group;
  tracks: WheelTrackPatch[];
  trackCursor: number;
  lastTrackPosition?: THREE.Vector3;
  dust: DustParticle[];
  dustCursor: number;
  dustAccumulator: number;
};

export type MarsWorld = {
  root: THREE.Group;
  interactables: Interactable[];
  landmarks: Landmark[];
  unnumberedObjects: UnnumberedObject[];
  colliders: CircleCollider[];
  rovers: THREE.Group[];
  darkSpiders: DarkSpider[];
  meteors: Meteor[];
  starlinkConstellation: StarlinkConstellation;
  solarArrays: THREE.Group[];
  elevators: ElevatorControl[];
  habitatDoor: HabitatDoorControl;
  greenhouseDoor: GreenhouseDoorControl;
  flickerLights: THREE.PointLight[];
  oxygenLight: THREE.PointLight;
  solarLight: THREE.PointLight;
  ancientTreePortal: THREE.Group;
  fufuRescueSite: FufuRescueSite;
  monolith: MonolithSite;
};

export type FufuRescueSite = {
  normal: THREE.Vector3;
  x: number;
  z: number;
  yaw: number;
};

export type MonolithSite = {
  object: THREE.Object3D;
  x: number;
  z: number;
  radius: number;
};

export type DarkSpider = {
  group: THREE.Group;
  visual: THREE.Group;
  legs: THREE.Group[];
  normal: THREE.Vector3;
  homeNormal: THREE.Vector3;
  forward: THREE.Vector3;
  tangentA: THREE.Vector3;
  tangentB: THREE.Vector3;
  phase: number;
  radius: number;
  speed: number;
};

export type SpiderLightThreat = {
  position: THREE.Vector3;
  radius: number;
  strength?: number;
};

export type ElevatorControl = {
  car: THREE.Object3D;
  surfaceObject?: THREE.Object3D;
  rocketDoorPanel?: THREE.Object3D;
  rocketDoorPortal?: THREE.Object3D;
  rocketInterior?: THREE.Object3D;
  rocketInteriorLight?: THREE.PointLight;
  rocketInteriorFillLight?: THREE.PointLight;
  rocketInteriorFloorY?: number;
  bottomY: number;
  topY: number;
  surfaceY: number;
  speed: number;
  target: "bottom" | "top";
  moving: boolean;
  label: string;
  radius: number;
  walkBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
};

export type HabitatDoorControl = {
  root: THREE.Object3D;
  doorPanels: THREE.Object3D;
  exteriorMask: THREE.Object3D;
  interiorPortal: THREE.Object3D;
  interiorDoor: THREE.Object3D;
  interiorScene: THREE.Object3D;
  interiorLight: THREE.PointLight;
  open: boolean;
  occupied: boolean;
  promptRadius: number;
  label: string;
};

export type GreenhouseDoorControl = {
  root: THREE.Object3D;
  doorPanels: THREE.Object3D;
  interiorLight: THREE.PointLight;
  treeColliders: Array<{ x: number; z: number; radius: number }>;
  occupied: boolean;
  promptRadius: number;
  label: string;
};

export type Landmark = {
  label: string;
  object: THREE.Object3D;
  x: number;
  z: number;
  labelDistance: number;
  mapRange: number;
};

export type UnnumberedObject = {
  object: THREE.Object3D;
  x: number;
  z: number;
  mapRange: number;
  label?: string;
};

export type CircleCollider = {
  center: THREE.Vector2;
  radius: number;
  label: string;
  normal?: THREE.Vector3;
  dynamicObject?: THREE.Object3D;
  enabled?: () => boolean;
};

export type Meteor = {
  head: THREE.Mesh;
  trail: THREE.Group;
  trailPuffs: THREE.Sprite[];
  trailComa: THREE.Sprite;
  starAttribute: THREE.BufferAttribute;
  starIndex: number;
  startDirection: THREE.Vector3;
  orbitAxis: THREE.Vector3;
  orbitMin: number;
  orbitMax: number;
  orbitSpeed: number;
  phase: number;
  tailAngle: number;
  tailLength: number;
  wobbleAxis: THREE.Vector3;
  wobbleSpeed: number;
  wobbleAmount: number;
  closeFlyby: boolean;
  flybyTangent: THREE.Vector3;
};

export const WORLD_EXPANSION = 1.5;
export const PLANET_RADIUS = 88 * WORLD_EXPANSION;
const LAYOUT_SPREAD = 2 * WORLD_EXPANSION;
const CLOSE_METEOR_FLYBY_SECONDS = 90;
const CLOSE_METEOR_ORBIT_ALTITUDE = 150;
const ANCIENT_TREE_ARCH_LON = 0;
const ANCIENT_TREE_ARCH_LAT = -50;
const ANCIENT_TREE_ARCH_HEIGHT = 118;
const ANCIENT_TREE_ARCH_WIDTH = 92;
const ANCIENT_TREE_ARCH_FOOTPRINT_RADIUS = 58;
const ANCIENT_TREE_ARCH_SETTLE = -10.2;
const ANCIENT_TREE_ARCH_YAW = 0.16;
const LANDER_SCALE = 2.65;
const LANDER_SURFACE_SETTLE = -0.42;
const HABITAT_SCALE = 1.78;
const GREENHOUSE_SCALE = 3.15;
const INDUSTRIAL_SCALE = 2.05;
const GARAGE_SCALE = 1.95;
const TOWER_SCALE = 1.55;
const NUMBERED_FACILITY_SCALE = 1.55;
const VEHICLE_LOOP_SPEED = 0.052;
const VEHICLE_LOOP_HEADING = THREE.MathUtils.degToRad(50);
const VEHICLE_ROUTE_STOP_SECONDS = 30;
const VEHICLE_STOP_ANGLE_THRESHOLD = 0.02;
const VEHICLE_ROUTE_TERRAIN_SAFE_RADIUS = 15;
const VEHICLE_ROUTE_ROCK_CLEARANCE = 12;
const VEHICLE_BASE_TARGET_X = expandWorldCoordinate(-18);
const VEHICLE_BASE_TARGET_Z = expandWorldCoordinate(-124);
export const CRASHED_SHIP_SITE_NORMAL = new THREE.Vector3(-0.2, -0.62, -0.76).normalize();
const ANCIENT_TREE_ARCH_NORMAL = normalFromLonLat(ANCIENT_TREE_ARCH_LON, ANCIENT_TREE_ARCH_LAT);
const SPIDER_ARRIVAL_NORMAL = ANCIENT_TREE_ARCH_NORMAL.clone().lerp(CRASHED_SHIP_SITE_NORMAL, 0.72).normalize();
const SPIDER_PATROL_RADIUS = 72;
const SPIDER_DARK_RING_DISTANCE = 54;
const SPIDER_DARK_SPREAD_ANGLE = 0.46;
const SPIDER_BODY_RADIUS = 1.65;
const TERRAIN_WIDTH_SEGMENTS = 96;
const TERRAIN_HEIGHT_SEGMENTS = 54;
const MAINTENANCE_BOT_BUILDING_CLEARANCE = 5.8;
const MAINTENANCE_BOT_BLOCKED_CLEARANCE = 5.2;

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const VEHICLE_LOOP_DIRECTION = new THREE.Vector3(Math.cos(VEHICLE_LOOP_HEADING), 0, Math.sin(VEHICLE_LOOP_HEADING)).normalize();
const VEHICLE_LOOP_PLANE_NORMAL = VEHICLE_LOOP_DIRECTION.clone().cross(WORLD_UP).normalize();
const scratchNormal = new THREE.Vector3();
const scratchTrackNormal = new THREE.Vector3();
const scratchTrackSide = new THREE.Vector3();
const scratchTrackForward = new THREE.Vector3();
const scratchTrackMatrix = new THREE.Matrix4();
const marsAlbedoTexture = new THREE.TextureLoader().load(marsAlbedoUrl);
marsAlbedoTexture.colorSpace = THREE.SRGBColorSpace;
marsAlbedoTexture.wrapS = THREE.RepeatWrapping;
marsAlbedoTexture.wrapT = THREE.ClampToEdgeWrapping;
marsAlbedoTexture.anisotropy = 8;
const meteorRockTexture = new THREE.TextureLoader().load(meteorRockUrl);
meteorRockTexture.colorSpace = THREE.SRGBColorSpace;
meteorRockTexture.wrapS = THREE.RepeatWrapping;
meteorRockTexture.wrapT = THREE.RepeatWrapping;
meteorRockTexture.anisotropy = 4;

const wheelTrackGeometry = new THREE.PlaneGeometry(0.54, 3.15);
let dustFogTexture: THREE.CanvasTexture | null = null;
let ancientTreePortalTexture: THREE.CanvasTexture | null = null;

const shaderNoise = `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm2(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 5; i++) {
    value += amp * noise2(p);
    p = rot * p * 2.03 + 17.7;
    amp *= 0.5;
  }
  return value;
}
`;

function spread(value: number) {
  return value * LAYOUT_SPREAD;
}

export function expandWorldCoordinate(value: number) {
  return value * WORLD_EXPANSION;
}

const CLOSE_METEOR_CENTER_NORMAL = planetNormal(expandWorldCoordinate(-18), expandWorldCoordinate(-124), new THREE.Vector3());
const CLOSE_METEOR_LOOK_NORMAL = planetNormal(expandWorldCoordinate(18), expandWorldCoordinate(18), new THREE.Vector3());
const CLOSE_METEOR_FORWARD = CLOSE_METEOR_LOOK_NORMAL.clone().sub(CLOSE_METEOR_CENTER_NORMAL).projectOnPlane(CLOSE_METEOR_CENTER_NORMAL).normalize();
const CLOSE_METEOR_FLYBY_TANGENT = CLOSE_METEOR_FORWARD.clone().cross(CLOSE_METEOR_CENTER_NORMAL).normalize();
const CLOSE_METEOR_WOBBLE_AXIS = CLOSE_METEOR_CENTER_NORMAL.clone().cross(CLOSE_METEOR_FLYBY_TANGENT).normalize();

function mat(color: number, roughness = 0.76, metalness = 0.08, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity: emissive ? 0.42 : 0,
    flatShading: true,
  });
}

function box(w: number, h: number, d: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function splitGeometryByLocalX(source: THREE.BufferGeometry, upperHalf: boolean) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute | undefined;
  const uvs = geometry.getAttribute("uv") as THREE.BufferAttribute | undefined;
  const nextPositions: number[] = [];
  const nextNormals: number[] = [];
  const nextUvs: number[] = [];
  const keepSign = upperHalf ? 1 : -1;
  type Vertex = { position: THREE.Vector3; normal?: THREE.Vector3; uv?: THREE.Vector2 };

  const interpolate = (a: Vertex, b: Vertex) => {
    const da = a.position.x * keepSign;
    const db = b.position.x * keepSign;
    const t = da / (da - db);
    const vertex: Vertex = {
      position: a.position.clone().lerp(b.position, t),
    };
    if (a.normal && b.normal) vertex.normal = a.normal.clone().lerp(b.normal, t).normalize();
    if (a.uv && b.uv) vertex.uv = a.uv.clone().lerp(b.uv, t);
    return vertex;
  };

  const clipTriangle = (triangle: Vertex[]) => {
    const output: Vertex[] = [];
    for (let i = 0; i < triangle.length; i += 1) {
      const current = triangle[i];
      const previous = triangle[(i + triangle.length - 1) % triangle.length];
      const currentInside = current.position.x * keepSign >= -0.000001;
      const previousInside = previous.position.x * keepSign >= -0.000001;
      if (currentInside) {
        if (!previousInside) output.push(interpolate(previous, current));
        output.push(current);
      } else if (previousInside) {
        output.push(interpolate(previous, current));
      }
    }
    return output;
  };

  const pushVertex = (vertex: Vertex) => {
    nextPositions.push(vertex.position.x, vertex.position.y, vertex.position.z);
    if (vertex.normal) nextNormals.push(vertex.normal.x, vertex.normal.y, vertex.normal.z);
    if (vertex.uv) nextUvs.push(vertex.uv.x, vertex.uv.y);
  };

  for (let i = 0; i < positions.count; i += 3) {
    const triangle: Vertex[] = [];
    for (let vertexIndex = i; vertexIndex < i + 3; vertexIndex += 1) {
      triangle.push({
        position: new THREE.Vector3(positions.getX(vertexIndex), positions.getY(vertexIndex), positions.getZ(vertexIndex)),
        normal: normals ? new THREE.Vector3(normals.getX(vertexIndex), normals.getY(vertexIndex), normals.getZ(vertexIndex)) : undefined,
        uv: uvs ? new THREE.Vector2(uvs.getX(vertexIndex), uvs.getY(vertexIndex)) : undefined,
      });
    }
    const clipped = clipTriangle(triangle);
    if (clipped.length < 3) continue;
    for (let vertexIndex = 1; vertexIndex < clipped.length - 1; vertexIndex += 1) {
      pushVertex(clipped[0]);
      pushVertex(clipped[vertexIndex]);
      pushVertex(clipped[vertexIndex + 1]);
    }
  }

  const result = new THREE.BufferGeometry();
  result.setAttribute("position", new THREE.Float32BufferAttribute(nextPositions, 3));
  if (nextNormals.length > 0) result.setAttribute("normal", new THREE.Float32BufferAttribute(nextNormals, 3));
  if (nextUvs.length > 0) result.setAttribute("uv", new THREE.Float32BufferAttribute(nextUvs, 2));
  result.computeBoundingBox();
  result.computeBoundingSphere();
  return result;
}

function createSleepPodCutCapGeometry(radius: number, length: number, segments = 28) {
  const yRadius = length * 0.5 + radius;
  const positions: number[] = [];
  const normals: number[] = [];

  for (let i = 0; i < segments; i += 1) {
    const current = (i / segments) * Math.PI * 2;
    const next = ((i + 1) / segments) * Math.PI * 2;
    positions.push(
      0, 0, 0,
      0, Math.cos(current) * yRadius, Math.sin(current) * radius,
      0, Math.cos(next) * yRadius, Math.sin(next) * radius,
    );
    normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function foundation(w: number, d: number, material = mat(0x6f4530, 0.92, 0.04)) {
  const mesh = box(w, 0.28, d, material);
  mesh.position.y = -0.06;
  return mesh;
}

export function terrainHeight(x: number, z: number) {
  return sphereHeightFromNormal(planetNormal(x, z, scratchNormal));
}

function sphereHeightFromNormal(normal: THREE.Vector3) {
  const duneA = Math.sin(normal.x * 11.2 + normal.z * 6.4) * 0.74;
  const duneB = Math.cos(normal.z * 13.8 - normal.y * 5.1) * 0.46;
  const duneC = Math.sin((normal.x + normal.y - normal.z) * 22.0) * 0.16;
  const baseElevation = duneA + duneB + duneC;
  const darkSide = THREE.MathUtils.smoothstep(-normal.y, 0.18, 0.82);
  const darkRidges =
    (Math.sin(normal.x * 25.0 - normal.z * 13.0) * 0.62 + Math.cos((normal.x + normal.z) * 31.0 + normal.y * 6.0) * 0.42) *
    darkSide;
  const roughElevation = baseElevation + darkRidges;
  const routeSmooth = vehicleRouteTerrainSmoothFactor(normal);
  return THREE.MathUtils.lerp(roughElevation, baseElevation * 0.35, routeSmooth);
}

function vehicleLoopSurfaceDistance(normal: THREE.Vector3) {
  const planeDot = THREE.MathUtils.clamp(normal.dot(VEHICLE_LOOP_PLANE_NORMAL), -1, 1);
  return Math.asin(Math.abs(planeDot)) * PLANET_RADIUS;
}

function vehicleRouteTerrainSmoothFactor(normal: THREE.Vector3) {
  const distance = vehicleLoopSurfaceDistance(normal);
  return 1 - THREE.MathUtils.smoothstep(distance, 5, VEHICLE_ROUTE_TERRAIN_SAFE_RADIUS);
}

function isInsideVehicleRouteRockClearance(normal: THREE.Vector3) {
  return vehicleLoopSurfaceDistance(normal) < VEHICLE_ROUTE_ROCK_CLEARANCE;
}

export function planetSurfacePointFromNormal(normal: THREE.Vector3, altitude = 0, target = new THREE.Vector3()) {
  return target.copy(normal).normalize().multiplyScalar(PLANET_RADIUS + sphereHeightFromNormal(normal) + altitude);
}

export function planetNormal(x: number, z: number, target = new THREE.Vector3()) {
  return target.set(x, PLANET_RADIUS, z).normalize();
}

export function planetSurfacePoint(x: number, z: number, altitude = 0, target = new THREE.Vector3()) {
  const normal = planetNormal(x, z, target);
  return planetSurfacePointFromNormal(normal, altitude, target);
}

export function placeObjectOnPlanetNormal(object: THREE.Object3D, normal: THREE.Vector3, altitude = 0, yaw = 0) {
  object.position.copy(planetSurfacePointFromNormal(normal, altitude));
  object.quaternion.setFromUnitVectors(WORLD_UP, scratchNormal.copy(normal).normalize());
  object.rotateY(yaw);
}

export function placeObjectOnPlanet(object: THREE.Object3D, x: number, z: number, altitude = 0, yaw = 0) {
  const normal = planetNormal(x, z, scratchNormal);
  placeObjectOnPlanetNormal(object, normal, altitude, yaw);
  object.userData.planetX = x;
  object.userData.planetZ = z;
}

export function createMarsWorld(scene: THREE.Scene): MarsWorld {
  const root = new THREE.Group();
  root.name = "Mars world root";
  scene.add(root);
  const interactables: Interactable[] = [];
  const landmarks: Landmark[] = [];
  const unnumberedObjects: UnnumberedObject[] = [];
  const colliders: CircleCollider[] = [];
  const rovers: THREE.Group[] = [];
  const darkSpiders: DarkSpider[] = [];
  const maintenanceBots: MaintenanceBotConfig[] = [];
  const solarArrays: THREE.Group[] = [];
  const elevators: ElevatorControl[] = [];
  const flickerLights: THREE.PointLight[] = [];

  root.add(createTerrain());
  const skyDust = createSkyDust();
  root.add(skyDust.object);
  const meteors = skyDust.meteors;
  const starlinkConstellation = createStarlinkConstellation(PLANET_RADIUS);
  root.add(starlinkConstellation.group);
  addRockField(root, colliders);

  const base = new THREE.Group();
  base.name = "ARES Base Alpha";
  root.add(base);
  addNasaPerseveranceRover(base, colliders, landmarks);

  addDarkSideRockField(root, colliders);
  for (let i = 0; i < 3; i += 1) {
    const spider = createDarkSpider(i);
    darkSpiders.push(spider);
    root.add(spider.group);
    colliders.push({
      center: new THREE.Vector2(),
      radius: 1.55,
      label: "暗面蜘蛛",
      dynamicObject: spider.group,
    });
  }

  addLanderSite("01 飞船 登陆飞船", spread(132), spread(78), 0.18, true);
  addLanderSite("02 飞船 货运飞船", spread(142), spread(18), -0.55, true);
  addLanderSite("03 飞船 返回飞船", spread(-118), spread(82), 0.94, true);

  const ancientTreeArchNormal = normalFromLonLat(ANCIENT_TREE_ARCH_LON, ANCIENT_TREE_ARCH_LAT);
  const ancientTreeArchX = (ancientTreeArchNormal.x / Math.abs(ancientTreeArchNormal.y)) * PLANET_RADIUS;
  const ancientTreeArchZ = (ancientTreeArchNormal.z / Math.abs(ancientTreeArchNormal.y)) * PLANET_RADIUS;
  const ancientTreeArchYaw = ANCIENT_TREE_ARCH_YAW;
  const ancientTreeArch = createAncientTreeArch();
  const ancientTreePortal = createAncientTreePortal();
  ancientTreeArch.add(ancientTreePortal);
  placeObjectOnPlanetNormal(ancientTreeArch, ancientTreeArchNormal, ANCIENT_TREE_ARCH_SETTLE, ancientTreeArchYaw);
  ancientTreeArch.userData.planetX = ancientTreeArchX;
  ancientTreeArch.userData.planetZ = ancientTreeArchZ;
  base.add(ancientTreeArch);
  landmarks.push(landmark("远古巨树拱门", ancientTreeArch, ancientTreeArchX, ancientTreeArchZ, 82, ANCIENT_TREE_ARCH_FOOTPRINT_RADIUS * 9));
  addAncientTreeArchColliders(colliders, ancientTreeArchYaw);

  const monolithX = expandWorldCoordinate(-360);
  const monolithZ = expandWorldCoordinate(-300);
  const monolith = createBlackMonolith();
  placeObjectOnPlanet(monolith, monolithX, monolithZ, 0.05, -0.38);
  base.add(monolith);
  landmarks.push(landmark("黑色方碑", monolith, monolithX, monolithZ, 46, 420));
  colliders.push(circle(monolithX, monolithZ, 1.9, "黑色方碑"));
  interactables.push({
    id: "monolith",
    label: "黑色方碑",
    prompt: "按 E 触碰 黑色方碑",
    object: monolith,
    radius: 8.2,
    completed: false,
  });

  const wreckNormal = CRASHED_SHIP_SITE_NORMAL.clone();
  const wreckX = (wreckNormal.x / Math.abs(wreckNormal.y)) * PLANET_RADIUS;
  const wreckZ = (wreckNormal.z / Math.abs(wreckNormal.y)) * PLANET_RADIUS;
  const wreckYaw = 0.52;
  const wreckRight = new THREE.Vector3(0, 1, 0).cross(wreckNormal).normalize();
  const fufuRescueNormal = wreckNormal.clone().addScaledVector(wreckRight, 3.4 / PLANET_RADIUS).normalize();
  const fufuRescueX = (fufuRescueNormal.x / Math.abs(fufuRescueNormal.y)) * PLANET_RADIUS;
  const fufuRescueZ = (fufuRescueNormal.z / Math.abs(fufuRescueNormal.y)) * PLANET_RADIUS;
  const crashedShip = createCrashedShip();
  crashedShip.scale.setScalar(LANDER_SCALE);
  crashedShip.userData.dynamicMap = true;
  crashedShip.userData.planetX = wreckX;
  crashedShip.userData.planetZ = wreckZ;
  placeObjectOnPlanetNormal(crashedShip, wreckNormal, -1.72, wreckYaw);
  base.add(crashedShip);
  unnumberedObjects.push({ object: crashedShip, x: wreckX, z: wreckZ, mapRange: 340 });
  addCrashedShipColliders(colliders, wreckX, wreckZ, wreckYaw);

  const habitat = createHabitatModule();
  habitat.scale.setScalar(HABITAT_SCALE);
  const habitatDoor = habitat.userData.door as HabitatDoorControl;
  const habitatX = spread(0);
  const habitatZ = spread(18);
  const habitatYaw = -0.22;
  placeObjectOnPlanet(habitat, habitatX, habitatZ, 2.0, habitatYaw);
  base.add(habitat);
  landmarks.push(landmark("01 建筑 居住舱", habitat, habitatX, habitatZ, 34, 220));
  addMaintenanceBot("01 机器人 居住舱维修工", habitatX, habitatZ, habitatYaw, 0, -8.6, "01 建筑 居住舱", "居住舱是亚历克斯的生活、睡眠和基础生命维持中心。我负责舱门密封、空气循环、温湿度和睡眠舱状态。");
  interactables.push({
    id: "habitatCheck",
    label: "01 建筑 居住舱",
    prompt: "按 E 检查 01 建筑 居住舱",
    object: habitat,
    radius: 11.5,
    completed: false,
  });
  addFootprintColliders(
    colliders,
    habitatX,
    habitatZ,
    habitatYaw,
    [-9.6, -6.4, -3.2, 0, 3.2, 6.4, 9.6],
    [-3.2, 0.2, 3.6],
    2.35,
    "居住舱外壳",
    () => !habitatDoor.occupied
  );
  colliders.push({ ...offsetCircle(habitatX, habitatZ, habitatYaw, -10.8, 0.2, 2.75, "居住舱左端盖"), enabled: () => !habitatDoor.occupied });
  colliders.push({ ...offsetCircle(habitatX, habitatZ, habitatYaw, 10.8, 0.2, 2.75, "居住舱右端盖"), enabled: () => !habitatDoor.occupied });

  const greenhouse = createGreenhouse(flickerLights);
  greenhouse.scale.setScalar(GREENHOUSE_SCALE);
  const greenhouseDoor = greenhouse.userData.door as GreenhouseDoorControl;
  const greenhouseX = spread(-24);
  const greenhouseZ = spread(18);
  const greenhouseYaw = 0.3;
  placeObjectOnPlanet(greenhouse, greenhouseX, greenhouseZ, -0.86, greenhouseYaw);
  base.add(greenhouse);
  landmarks.push(landmark("02 建筑 温室生态舱", greenhouse, greenhouseX, greenhouseZ, 46, 260));
  addMaintenanceBot("02 机器人 温室维修工", greenhouseX, greenhouseZ, greenhouseYaw, 0, -18.8, "02 建筑 温室生态舱", "温室生态舱提供作物试验、湿度调节和部分氧气缓冲。我负责透明穹顶、培养槽、补光灯和水循环管线。");
  interactables.push({
    id: "greenhouse",
    label: "02 建筑 温室生态舱",
    prompt: "按 E 启动 02 建筑 温室生态舱",
    object: greenhouse,
    radius: 17,
    completed: false,
  });
  colliders.push({
    ...circle(greenhouseX, greenhouseZ, 15.4, "温室生态舱整体外壳"),
    enabled: () => !greenhouseDoor.occupied,
  });
  addFootprintColliders(
    colliders,
    greenhouseX,
    greenhouseZ,
    greenhouseYaw,
    [-9.2, -6.9, -4.6, -2.3, 0, 2.3, 4.6, 6.9, 9.2],
    [-5.8, -3.5, -1.2, 1.1, 3.4, 5.7, 7.4],
    2.25,
    "温室生态舱外壳",
    () => !greenhouseDoor.occupied
  );

  const oxygenX = spread(24);
  const oxygenZ = spread(18);
  const oxygenYaw = -0.18;
  const oxygenPlant = createIndustrialPlant(0xff3d2f, "O2", true);
  oxygenPlant.scale.setScalar(INDUSTRIAL_SCALE);
  placeObjectOnPlanet(oxygenPlant, oxygenX, oxygenZ, 0, oxygenYaw);
  base.add(oxygenPlant);
  landmarks.push(landmark("03 建筑 氧气生产站", oxygenPlant, oxygenX, oxygenZ, 38, 240));
  addMaintenanceBot("03 机器人 制氧站维修工", oxygenX, oxygenZ, oxygenYaw, 6.8, -5.8, "03 建筑 氧气生产站", "氧气生产站压缩火星大气中的 CO2，再分离出可用氧气。我负责进气口、压缩机、储氧罐和外部管线。");
  addFootprintColliders(colliders, oxygenX, oxygenZ, oxygenYaw, [-4.6, 0, 4.6], [-2.4, 2.6], 2.45, "氧气生产站外壳");
  const oxygenLight = new THREE.PointLight(0xff3d2f, 2.2, 13);
  oxygenLight.position.copy(planetSurfacePoint(oxygenX, oxygenZ - 2.2, 8.5));
  base.add(oxygenLight);
  flickerLights.push(oxygenLight);
  interactables.push({
    id: "oxygen",
    label: "03 建筑 氧气生产站",
    prompt: "按 E 检查 03 建筑 氧气生产站",
    object: oxygenPlant,
    radius: 11.5,
    completed: false,
  });

  const methanePlant = createIndustrialPlant(0xffba66, "CH4");
  methanePlant.scale.setScalar(INDUSTRIAL_SCALE);
  const methaneX = spread(24);
  const methaneZ = spread(-16);
  placeObjectOnPlanet(methanePlant, methaneX, methaneZ, 0, 0.8);
  base.add(methanePlant);
  landmarks.push(landmark("04 建筑 甲烷燃料厂", methanePlant, methaneX, methaneZ, 34, 230));
  addMaintenanceBot("04 机器人 燃料厂维修工", methaneX, methaneZ, 0.8, -6.2, -5.4, "04 建筑 甲烷燃料厂", "甲烷燃料厂把 CO2 和氢反应生成 CH4，为返回飞船和基地备用发电储备燃料。我负责反应器、冷凝管和安全阀。");
  addFootprintColliders(colliders, methaneX, methaneZ, 0.8, [-4.8, 0, 4.8], [-3.2, 2.8], 2.75, "甲烷燃料厂外壳");
  interactables.push({
    id: "methane",
    label: "04 建筑 甲烷燃料厂",
    prompt: "按 E 预启动 04 建筑 甲烷燃料厂",
    object: methanePlant,
    radius: 10.5,
    completed: false,
  });

  const garage = createGarage();
  garage.scale.setScalar(GARAGE_SCALE);
  const garageX = spread(-22);
  const garageZ = spread(-16);
  placeObjectOnPlanet(garage, garageX, garageZ, 0, -0.7);
  base.add(garage);
  landmarks.push(landmark("05 建筑 机器人车库", garage, garageX, garageZ, 34, 230));
  addMaintenanceBot("05 机器人 车库维修工", garageX, garageZ, -0.7, 6.4, -6.2, "05 建筑 机器人车库", "机器人车库是维修队列的调度和充电中心。我负责机械臂、备件架、充电桩和低速搬运平台。");
  addFootprintColliders(colliders, garageX, garageZ, -0.7, [-5.2, 0, 5.2], [-3.6, 2.8], 2.85, "机器人车库外壳");
  interactables.push({
    id: "garage",
    label: "05 建筑 机器人车库",
    prompt: "按 E 呼叫 01 机器人维修组",
    object: garage,
    radius: 8.2,
    completed: false,
  });

  const tower = createCommTower(flickerLights);
  tower.scale.setScalar(TOWER_SCALE);
  const towerX = spread(46);
  const towerZ = spread(24);
  placeObjectOnPlanet(tower, towerX, towerZ, 0, 0.2);
  base.add(tower);
  landmarks.push(landmark("06 建筑 通信塔", tower, towerX, towerZ, 34, 220));
  addMaintenanceBot("06 机器人 通信塔维修工", towerX, towerZ, 0.2, -5.4, -4.4, "06 建筑 通信塔", "通信塔负责基地内网、轨道中继和地球方向的延迟通信。我负责天线姿态、电源冗余和风暴后的信号校准。");
  colliders.push(circle(towerX, towerZ, 3.2, "通信塔"));
  interactables.push({
    id: "tower",
    label: "06 建筑 通信塔",
    prompt: "按 E 校准 06 建筑 通信塔",
    object: tower,
    radius: 9.5,
    completed: false,
  });

  const lab04 = createNumberedFacility("04", 0x75d7ff, "lab");
  lab04.scale.setScalar(NUMBERED_FACILITY_SCALE);
  const lab04X = spread(-42);
  const lab04Z = spread(-6);
  placeObjectOnPlanet(lab04, lab04X, lab04Z, 0, -0.38);
  base.add(lab04);
  landmarks.push(landmark("07 建筑 科研舱", lab04, lab04X, lab04Z, 34, 230));
  addMaintenanceBot("07 机器人 科研舱维修工", lab04X, lab04Z, -0.38, 5.8, -5.6, "07 建筑 科研舱", "科研舱用于岩石样本、辐射数据和基地环境记录。我负责样本锁、分析台、传感器阵列和数据备份。");
  addFootprintColliders(colliders, lab04X, lab04Z, -0.38, [-4.6, 0, 4.6], [-3.2, 2.8], 2.65, "科研舱外壳");
  interactables.push({
    id: "lab",
    label: "07 建筑 科研舱",
    prompt: "按 E 使用 07 建筑 科研舱",
    object: lab04,
    radius: 10.5,
    completed: false,
  });

  const store07 = createNumberedFacility("07", 0xffc36d, "depot");
  store07.scale.setScalar(NUMBERED_FACILITY_SCALE);
  const store07X = spread(-42);
  const store07Z = spread(-28);
  placeObjectOnPlanet(store07, store07X, store07Z, 0, 0.72);
  base.add(store07);
  landmarks.push(landmark("08 建筑 物资仓", store07, store07X, store07Z, 34, 230));
  addMaintenanceBot("08 机器人 物资仓维修工", store07X, store07Z, 0.72, -5.8, -5.4, "08 建筑 物资仓", "物资仓保存食品、密封件、氧气背包、工具和备用电子模块。我负责货架固定、库存扫描和气闸门维护。");
  addFootprintColliders(colliders, store07X, store07Z, 0.72, [-4.8, 0, 4.8], [-3.2, 2.8], 2.75, "物资仓外壳");
  interactables.push({
    id: "storehouse",
    label: "08 建筑 物资仓",
    prompt: "按 E 清点 08 建筑 物资仓",
    object: store07,
    radius: 10.5,
    completed: false,
  });

  const med09 = createNumberedFacility("09", 0x9ff28b, "clinic");
  med09.scale.setScalar(NUMBERED_FACILITY_SCALE);
  const med09X = spread(44);
  const med09Z = spread(-8);
  placeObjectOnPlanet(med09, med09X, med09Z, 0, -0.86);
  base.add(med09);
  landmarks.push(landmark("09 建筑 医疗舱", med09, med09X, med09Z, 34, 230));
  addMaintenanceBot("09 机器人 医疗舱维修工", med09X, med09Z, -0.86, -2.6, -8.8, "09 建筑 医疗舱", "医疗舱用于低重力适应监测、创伤处理和隔离观察。我负责诊断床、药品冷柜和空气过滤模块。");
  addFootprintColliders(colliders, med09X, med09Z, -0.86, [-4.4, 0, 4.4], [-3.0, 2.6], 2.55, "医疗舱外壳");
  interactables.push({
    id: "medical",
    label: "09 建筑 医疗舱",
    prompt: "按 E 使用 09 建筑 医疗舱",
    object: med09,
    radius: 10.5,
    completed: false,
  });

  const solarAX = spread(-22);
  const solarAZ = spread(52);
  const solarA = createSolarArray(solarAX, solarAZ, -0.36, base);
  solarArrays.push(solarA);
  landmarks.push(landmark("01 能源 太阳能阵列 A", solarA, solarAX, solarAZ, 30, 220));
  addMaintenanceBot("10 机器人 阵列 A 维修工", solarAX, solarAZ, -0.36, 0, -11.8, "01 能源 太阳能阵列 A", "太阳能阵列 A 是基地常规供电的一部分。我负责支架锁定、面板除尘、功率回传和线路接头。");
  colliders.push(circle(solarAX, solarAZ, 8.6, "太阳能阵列 A"));
  interactables.push({
    id: "solarA",
    label: "01 能源 太阳能阵列 A",
    prompt: "按 E 检查 01 能源 太阳能阵列 A",
    object: solarA,
    radius: 12.5,
    completed: false,
  });
  const solarBX = spread(-4);
  const solarBZ = spread(52);
  const solarB = createSolarArray(solarBX, solarBZ, -0.36, base);
  solarArrays.push(solarB);
  landmarks.push(landmark("02 能源 太阳能阵列 B", solarB, solarBX, solarBZ, 30, 220));
  addMaintenanceBot("11 机器人 阵列 B 维修工", solarBX, solarBZ, -0.36, 0, -11.8, "02 能源 太阳能阵列 B", "太阳能阵列 B 给温室和物资仓提供稳定功率。我负责风暴后的角度校准、裂纹检查和灰尘覆盖率。");
  colliders.push(circle(solarBX, solarBZ, 8.6, "太阳能阵列 B"));
  interactables.push({
    id: "solarB",
    label: "02 能源 太阳能阵列 B",
    prompt: "按 E 分配 02 能源 太阳能阵列 B",
    object: solarB,
    radius: 12.5,
    completed: false,
  });
  const solarCX = spread(14);
  const solarCZ = spread(52);
  const solarNode = createSolarArray(solarCX, solarCZ, -0.36, base);
  solarArrays.push(solarNode);
  landmarks.push(landmark("03 能源 太阳能阵列 C", solarNode, solarCX, solarCZ, 30, 220));
  addMaintenanceBot("12 机器人 阵列 C 维修工", solarCX, solarCZ, 0.18, 0, -11.8, "03 能源 太阳能阵列 C", "太阳能阵列 C 是当前任务的异常点。它负责给氧气生产站和外部通信冗余供电，我负责锁扣、汇流箱和低压线路。");
  colliders.push(circle(solarCX, solarCZ, 8.8, "太阳能阵列 C"));
  const solarLight = new THREE.PointLight(0xff3d2f, 1.8, 11);
  solarLight.position.copy(planetSurfacePoint(solarCX, solarCZ, 3.4));
  base.add(solarLight);
  flickerLights.push(solarLight);
  interactables.push({
    id: "solarC",
    label: "03 能源 太阳能阵列 C",
    prompt: "按 E 重启 03 能源 太阳能阵列 C",
    object: solarNode,
    radius: 12.5,
    completed: false,
  });

  createPipes(base);
  createRovers(base, rovers, colliders, landmarks, maintenanceBots);

  return {
    root,
    interactables,
    landmarks,
    unnumberedObjects,
    colliders,
    rovers,
    darkSpiders,
    meteors,
    starlinkConstellation,
    solarArrays,
    elevators,
    habitatDoor,
    greenhouseDoor,
    flickerLights,
    oxygenLight,
    solarLight,
    ancientTreePortal,
    fufuRescueSite: {
      normal: fufuRescueNormal,
      x: fufuRescueX,
      z: fufuRescueZ,
      yaw: wreckYaw + Math.PI * 0.62,
    },
    monolith: {
      object: monolith,
      x: monolithX,
      z: monolithZ,
      radius: 24,
    },
  };

  function addLanderSite(label: string, x: number, z: number, yaw: number, interactive: boolean) {
    const lander = createLander();
    lander.scale.setScalar(LANDER_SCALE);
    const shipId = label.match(/^\d+/)?.[0];
    if (interactive && lander.userData.elevator) {
      const elevator = lander.userData.elevator as ElevatorControl;
      elevator.label = shipId ? `${shipId} 飞船升降梯` : "飞船升降梯";
      if (label.includes("返回飞船")) {
        addElonAvatar(elevator.car.parent ?? elevator.car, x, z);
        elevator.rocketInterior = undefined;
        elevator.rocketInteriorLight = undefined;
        elevator.rocketInteriorFillLight = undefined;
      }
      elevators.push(elevator);
    }
    placeObjectOnPlanet(lander, x, z, LANDER_SURFACE_SETTLE, yaw);
    base.add(lander);
    landmarks.push(landmark(label, lander, x, z, 42, 260));
    addShipMaintenanceBot(`${shipId ?? "飞船"} 机器人 飞船维护工`, x, z, yaw, label, shipBriefing(label));
    if (label.includes("货运飞船")) {
      interactables.push({
        id: "cargoShip",
        label,
        prompt: "按 E 检查 02 飞船 货运飞船",
        object: lander,
        radius: 13.5,
        completed: false,
      });
    }
    colliders.push(circle(x, z, 8.6, `${label}主体`));
    addFootprintColliders(
      colliders,
      x,
      z,
      yaw,
      [-4.7 * LANDER_SCALE, 0, 4.7 * LANDER_SCALE],
      [-4.3 * LANDER_SCALE, 0, 4.3 * LANDER_SCALE],
      3.0,
      `${label}外壳`
    );
    colliders.push(offsetCircle(x, z, yaw, -3.25 * LANDER_SCALE, -2.36 * LANDER_SCALE, 2.1, `${label}升降梯塔`));
    for (const angle of [Math.PI / 2, Math.PI / 2 + (Math.PI * 2) / 3, Math.PI / 2 + (Math.PI * 4) / 3]) {
      colliders.push(
        offsetCircle(
          x,
          z,
          yaw,
          Math.cos(angle) * 4.62 * LANDER_SCALE,
          Math.sin(angle) * 4.62 * LANDER_SCALE,
          2.5,
          `${label}支脚`
        )
      );
    }
  }

  function addShipMaintenanceBot(label: string, x: number, z: number, yaw: number, facilityLabel: string, briefing: string) {
    const radial = new THREE.Vector2(x, z);
    if (radial.lengthSq() < 0.0001) radial.set(Math.cos(yaw), Math.sin(yaw));
    radial.normalize();
    const tangent = new THREE.Vector2(-radial.y, radial.x);
    const side = label.includes("02 ") ? 1 : -1;
    const worldOffset = radial.multiplyScalar(42).add(tangent.multiplyScalar(side * 16));
    const local = worldOffsetToLocal(yaw, worldOffset.x, worldOffset.y);
    addMaintenanceBot(label, x, z, yaw, local.x, local.z, facilityLabel, briefing);
  }

  function addMaintenanceBot(
    label: string,
    x: number,
    z: number,
    yaw: number,
    localX: number,
    localZ: number,
    facilityLabel: string,
    briefing: string
  ) {
    const point = offsetPoint(x, z, yaw, localX, localZ);
    const patrolSpread = facilityLabel.includes("太阳能阵列") ? 2.25 : 1.55;
    const outwardSpread = facilityLabel.includes("太阳能阵列") ? 0.75 : 0.55;
    const radialLength = Math.hypot(localX, localZ) || 1;
    const radialX = localX / radialLength;
    const radialZ = localZ / radialLength;
    const tangentX = -radialZ;
    const tangentZ = radialX;
    const localPatrolPoints = [
      [localX, localZ],
      [localX + tangentX * patrolSpread, localZ + tangentZ * patrolSpread],
      [localX - tangentX * patrolSpread, localZ - tangentZ * patrolSpread],
      [localX + radialX * outwardSpread + tangentX * patrolSpread * 0.42, localZ + radialZ * outwardSpread + tangentZ * patrolSpread * 0.42],
      [localX + radialX * outwardSpread - tangentX * patrolSpread * 0.42, localZ + radialZ * outwardSpread - tangentZ * patrolSpread * 0.42],
    ] as Array<[number, number]>;
    maintenanceBots.push({
      centerX: point.x,
      centerZ: point.z,
      speed: 1.65 + (maintenanceBots.length % 4) * 0.12,
      offset: maintenanceBots.length * 0.74,
      size: 0.76,
      kind: "bot",
      label,
      facilityLabel,
      briefing,
      patrolPoints: localPatrolPoints.map(([px, pz]) => offsetPoint(x, z, yaw, px, pz)),
      waitMin: 1.7 + (maintenanceBots.length % 3) * 0.35,
      waitMax: 4.2 + (maintenanceBots.length % 4) * 0.45,
    });
  }

  function shipBriefing(label: string) {
    if (label.includes("登陆飞船")) {
      return "登陆飞船把第一位人类居民送到阿瑞斯阿尔法基地。我负责升降梯、舱门密封、姿态支架和登陆后电力接口。";
    }
    if (label.includes("货运飞船")) {
      return "货运飞船运输备件、补给、工具和可展开设备。我负责货舱锁定、升降梯、电池包和外部固定点。";
    }
    return "返回飞船是基地的应急撤离与样本返回载具。我负责舱体保温、推进剂接口、导航校验和待命电源。";
  }

  function addElonAvatar(platform: THREE.Object3D, shipX: number, shipZ: number) {
    const elon = new THREE.Group();
    elon.name = "Elon machine-dog astronaut avatar";

    const suit = mat(0xd8d0c0, 0.58, 0.16);
    const dark = mat(0x14181c, 0.72, 0.34);
    const rubber = mat(0x202327, 0.86, 0.24);
    const glow = mat(0x66d9ff, 0.16, 0.1, 0x66d9ff);
    const amber = mat(0xff8f2d, 0.38, 0.12, 0xff8f2d);

    const add = (object: THREE.Object3D, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
      object.position.set(x, y, z);
      object.scale.set(sx, sy, sz);
      elon.add(object);
      return object;
    };
    const capsule = (radius: number, length: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, 10), material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    const boots = [
      add(box(0.36, 0.18, 0.64, dark), -0.22, 0.1, 0.02),
      add(box(0.36, 0.18, 0.64, dark), 0.22, 0.1, 0.02),
    ];
    boots.forEach((boot) => (boot.rotation.x = 0.02));

    const legL = add(capsule(0.13, 0.72, suit), -0.22, 0.56, 0, 0.85, 1, 0.85);
    const legR = add(capsule(0.13, 0.72, suit), 0.22, 0.56, 0, 0.85, 1, 0.85);
    legL.rotation.z = 0.05;
    legR.rotation.z = -0.05;
    add(box(0.24, 0.22, 0.08, dark), -0.22, 0.56, -0.13);
    add(box(0.24, 0.22, 0.08, dark), 0.22, 0.56, -0.13);

    add(box(0.72, 0.18, 0.32, dark), 0, 0.98, 0);
    add(box(0.14, 0.2, 0.12, amber), 0, 1.0, -0.18);
    const torso = add(capsule(0.26, 0.82, suit), 0, 1.46, 0, 0.9, 1, 0.72);
    const chest = add(box(0.42, 0.38, 0.1, suit), 0, 1.57, -0.24);
    chest.rotation.x = -0.08;
    add(box(0.2, 0.2, 0.04, glow), 0, 1.58, -0.37);
    add(box(0.1, 0.08, 0.05, amber), 0.22, 1.71, -0.31);

    const backpack = add(box(0.42, 0.78, 0.2, dark), 0, 1.58, 0.29);
    backpack.rotation.x = 0.04;
    const hose = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 6, 18, Math.PI * 1.12), rubber);
    hose.position.set(0.38, 1.78, 0.18);
    hose.rotation.set(0.45, 1.15, 0.24);
    hose.castShadow = true;
    elon.add(hose);

    for (const side of [-1, 1]) {
      const shoulder = add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), suit), side * 0.48, 1.75, -0.02, 1.1, 0.82, 0.9);
      shoulder.castShadow = true;
      shoulder.receiveShadow = true;
      const upperArm = add(capsule(0.1, 0.45, suit), side * 0.61, 1.36, -0.02, 0.8, 1, 0.8);
      upperArm.rotation.z = side * 0.16;
      const forearm = add(capsule(0.09, 0.4, suit), side * 0.66, 0.98, -0.03, 0.78, 1, 0.78);
      forearm.rotation.z = side * -0.08;
      add(box(0.18, 0.12, 0.16, dark), side * 0.66, 0.68, -0.02);
      add(box(0.08, 0.08, 0.035, glow), side * 0.68, 1.08, -0.15);
      add(box(0.12, 0.1, 0.06, amber), side * 0.39, 1.82, -0.22);
    }

    const neck = add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.28, 12), dark), 0, 2.0, 0);
    neck.castShadow = true;
    add(new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 6, 18), dark), 0, 1.88, 0).rotation.x = Math.PI / 2;

    const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), suit), 0, 2.28, -0.03, 1.08, 0.92, 0.82);
    head.castShadow = true;
    head.receiveShadow = true;
    const muzzle = add(box(0.34, 0.2, 0.5, suit), 0, 2.22, -0.36);
    muzzle.rotation.x = -0.06;
    const nose = add(box(0.2, 0.11, 0.08, dark), 0, 2.18, -0.64);
    nose.rotation.x = -0.02;
    add(box(0.46, 0.08, 0.05, dark), 0, 2.32, -0.45);
    add(box(0.1, 0.1, 0.035, glow), -0.12, 2.33, -0.49);
    add(box(0.1, 0.1, 0.035, glow), 0.12, 2.33, -0.49);
    add(box(0.18, 0.04, 0.035, glow), 0, 2.12, -0.66);

    for (const side of [-1, 1]) {
      const ear = add(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.44, 4), dark), side * 0.2, 2.72, -0.02, 0.72, 1, 0.72);
      ear.rotation.z = side * -0.16;
      ear.castShadow = true;
      add(box(0.035, 0.18, 0.025, glow), side * 0.2, 2.72, -0.08);
      const audioDisc = add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12), dark), side * 0.33, 2.29, 0.02);
      audioDisc.rotation.z = Math.PI / 2;
      audioDisc.castShadow = true;
    }

    const namePlate = createTextPlate("ELON", glow);
    namePlate.position.set(0, 1.26, -0.34);
    namePlate.scale.setScalar(0.16);
    namePlate.rotation.x = -0.08;
    elon.add(namePlate);

    elon.scale.setScalar(0.72);
    elon.position.set(2.26, 10.17, 0.03);
    elon.rotation.y = 0.42;
    platform.add(elon);
    unnumberedObjects.push({ object: elon, x: shipX, z: shipZ, mapRange: 260, label: "未知智能体" });
  }
}

function landmark(label: string, object: THREE.Object3D, x: number, z: number, labelDistance: number, mapRange: number): Landmark {
  return { label, object, x, z, labelDistance, mapRange };
}

function circle(x: number, z: number, radius: number, label: string): CircleCollider {
  return { center: new THREE.Vector2(x, z), radius, label };
}

function offsetPoint(x: number, z: number, yaw: number, localX: number, localZ: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return {
    x: x + localX * c - localZ * s,
    z: z + localX * s + localZ * c,
  };
}

function normalFromLonLat(lonDegrees: number, latDegrees: number) {
  const lon = THREE.MathUtils.degToRad(lonDegrees);
  const lat = THREE.MathUtils.degToRad(latDegrees);
  return new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)).normalize();
}

function worldOffsetToLocal(yaw: number, worldX: number, worldZ: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return {
    x: worldX * c + worldZ * s,
    z: -worldX * s + worldZ * c,
  };
}

function offsetCircle(x: number, z: number, yaw: number, localX: number, localZ: number, radius: number, label: string): CircleCollider {
  const point = offsetPoint(x, z, yaw, localX, localZ);
  return circle(point.x, point.z, radius, label);
}

function addFootprintColliders(
  colliders: CircleCollider[],
  x: number,
  z: number,
  yaw: number,
  xs: number[],
  zs: number[],
  radius: number,
  label: string,
  enabled?: () => boolean
) {
  for (const localX of xs) {
    for (const localZ of zs) {
      const collider = offsetCircle(x, z, yaw, localX, localZ, radius, label);
      if (enabled) collider.enabled = enabled;
      colliders.push(collider);
    }
  }
}

function addCrashedShipColliders(colliders: CircleCollider[], x: number, z: number, yaw: number) {
  const scale = LANDER_SCALE;
  const label = "坠毁飞船残骸主体";
  const hullXs = [-12.7, -9.3, -5.2, 5.2, 9.3, 12.4].map((value) => value * scale);
  const hullZs = [-0.92, 0.92].map((value) => value * scale);
  addFootprintColliders(colliders, x, z, yaw, hullXs, hullZs, 1.08 * scale, label);

  for (const localX of [-13.8, 13.0]) {
    colliders.push(offsetCircle(x, z, yaw, localX * scale, 0, 1.32 * scale, label));
  }
}

function ancientTreeArchLocalNormal(localX: number, localZ: number, yaw: number) {
  const centerNormal = normalFromLonLat(ANCIENT_TREE_ARCH_LON, ANCIENT_TREE_ARCH_LAT);
  const right = new THREE.Vector3(0, 1, 0).cross(centerNormal).normalize();
  const forward = centerNormal.clone().cross(right).normalize();
  const point = offsetPoint(0, 0, yaw, localX, localZ);
  return centerNormal
    .clone()
    .addScaledVector(right, point.x / PLANET_RADIUS)
    .addScaledVector(forward, point.z / PLANET_RADIUS)
    .normalize();
}

function addAncientTreeArchColliders(colliders: CircleCollider[], yaw: number) {
  function colliderAt(localX: number, localZ: number, radius: number, label: string) {
    const normal = ancientTreeArchLocalNormal(localX, localZ, yaw);
    const projectedY = Math.max(Math.abs(normal.y), 0.001);
    return {
      center: new THREE.Vector2((normal.x / projectedY) * PLANET_RADIUS, (normal.z / projectedY) * PLANET_RADIUS),
      normal,
      radius,
      label,
    };
  }

  const rows = [
    { z: -38, halfWidth: 48, radius: 7.8 },
    { z: -31, halfWidth: 39, radius: 8.4 },
    { z: -24, halfWidth: 37, radius: 8.2 },
    { z: -18, halfWidth: 35, radius: 8.1 },
    { z: -11, halfWidth: 33, radius: 8.0 },
    { z: -4, halfWidth: 31, radius: 7.8 },
    { z: 3, halfWidth: 30, radius: 7.7 },
    { z: 10, halfWidth: 29, radius: 7.5 },
    { z: 17, halfWidth: 28.5, radius: 7.3 },
    { z: 24, halfWidth: 28, radius: 7.1 },
    { z: 31, halfWidth: 27.5, radius: 6.9 },
    { z: 38, halfWidth: 27, radius: 6.7 },
    { z: 48, halfWidth: 25, radius: 6.2 },
    { z: 58, halfWidth: 22, radius: 5.8 },
  ];

  for (const row of rows) {
    for (const side of [-1, 1]) {
      colliders.push(colliderAt(side * row.halfWidth, row.z, row.radius, "远古巨树拱门实体"));
    }
  }

  for (const localX of [-50, -41, -32, 32, 41, 50]) {
    colliders.push(colliderAt(localX, -43, 6.4, "远古巨树拱门根部"));
  }
}

function createTerrain() {
  const geometry = new THREE.SphereGeometry(PLANET_RADIUS, TERRAIN_WIDTH_SEGMENTS, TERRAIN_HEIGHT_SEGMENTS);
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const colors: number[] = [];
  const color = new THREE.Color();

  for (let i = 0; i < positions.count; i += 1) {
    const normal = new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i)).normalize();
    const elevation = sphereHeightFromNormal(normal);
    positions.setXYZ(i, normal.x * (PLANET_RADIUS + elevation), normal.y * (PLANET_RADIUS + elevation), normal.z * (PLANET_RADIUS + elevation));

    const shade = 0.5 + elevation * 0.11 + 0.1 * Math.sin(normal.x * 17.0);
    color.setHSL(0.045, 0.68, THREE.MathUtils.clamp(shade, 0.28, 0.68));
    colors.push(color.r, color.g, color.b);
  }

  positions.needsUpdate = true;
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const terrain = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      map: marsAlbedoTexture,
      vertexColors: true,
      roughness: 0.98,
      metalness: 0.01,
      flatShading: false,
    })
  );
  terrain.receiveShadow = true;

  const group = new THREE.Group();
  group.add(terrain);
  return group;
}

function createCrashedShip() {
  const group = new THREE.Group();
  group.name = "Unmarked crashed ship";

  const hullMat = mat(0xa79e91, 0.58, 0.44);
  const darkMat = mat(0x151211, 0.86, 0.22);
  const scorchedMat = mat(0x2b1711, 0.92, 0.08);
  const rustMat = mat(0xa64e2a, 0.78, 0.05);
  const dustMat = mat(0x9e4624, 0.96, 0.02);
  const glassMat = mat(0x22333b, 0.36, 0.34, 0x10222d);
  const hullCenterY = 1.32;
  const hullTopRadius = 2.25;
  const hullBottomRadius = 2.46;
  const hullRingRadius = 2.38;

  const addShadow = (mesh: THREE.Mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const makeHullHalf = (centerX: number, length: number, innerSign: -1 | 1) => {
    const half = new THREE.Group();
    const hull = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(hullTopRadius, hullBottomRadius, length, 12, 1, true), hullMat));
    hull.rotation.z = Math.PI / 2;
    hull.position.set(centerX, hullCenterY, 0);
    half.add(hull);

    const outerCap = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(hullTopRadius, hullTopRadius, 0.18, 12), darkMat));
    outerCap.rotation.z = Math.PI / 2;
    outerCap.position.set(centerX - innerSign * length * 0.5, hullCenterY, 0);
    half.add(outerCap);

    const tornRing = addShadow(new THREE.Mesh(new THREE.TorusGeometry(hullRingRadius, 0.1, 6, 18), scorchedMat));
    tornRing.rotation.y = Math.PI / 2;
    tornRing.position.set(centerX + innerSign * length * 0.5, hullCenterY, 0);
    half.add(tornRing);

    for (const localX of [-0.34, -0.12, 0.12, 0.34]) {
      const ringX = centerX + localX * length;
      if (Math.abs(ringX) < 3.25) continue;
      const rib = addShadow(new THREE.Mesh(new THREE.TorusGeometry(hullRingRadius + 0.04, 0.03, 5, 18), rustMat));
      rib.rotation.y = Math.PI / 2;
      rib.position.set(ringX, hullCenterY, 0);
      half.add(rib);
    }

    for (const localX of [-0.18, 0.14]) {
      const windowX = centerX + localX * length;
      if (Math.abs(windowX) < 3.25) continue;
      const window = box(1.02, 0.22, 0.08, glassMat);
      window.position.set(windowX, hullCenterY + 1.65, -1.95);
      window.rotation.x = -0.22;
      half.add(window);
    }

    for (let i = 0; i < 4; i += 1) {
      const shard = box(0.72 + i * 0.1, 0.08, 0.2, i % 2 ? rustMat : scorchedMat);
      shard.position.set(centerX + innerSign * (length * 0.52 + i * 0.18), hullCenterY + 0.08 + i * 0.12, -1.02 + i * 0.42);
      shard.rotation.set(0.25 * i, 0.15 * innerSign, -0.42 * innerSign + i * 0.18);
      half.add(shard);
    }

    return half;
  };

  const leftHalf = makeHullHalf(-7.9, 8.7, 1);
  const rightHalf = makeHullHalf(7.9, 8.7, -1);
  rightHalf.rotation.z = 0.04;
  group.add(leftHalf, rightHalf);

  const nose = addShadow(new THREE.Mesh(new THREE.ConeGeometry(hullTopRadius, 3.7, 12), hullMat));
  nose.rotation.z = Math.PI / 2;
  nose.position.set(-13.55, hullCenterY, 0);
  group.add(nose);

  for (const z of [-0.92, 0.92]) {
    const nozzle = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.76, 0.92, 10), darkMat));
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.set(12.7, hullCenterY, z);
    group.add(nozzle);
  }

  for (const x of [-11.5, -5.6, 5.6, 11.3]) {
    const buriedSkirt = box(3.4, 0.22, 2.9, dustMat);
    buriedSkirt.position.set(x, -0.08, x < 0 ? 0.28 : -0.24);
    buriedSkirt.rotation.y = x < 0 ? 0.18 : -0.12;
    group.add(buriedSkirt);
  }

  const crackMarker = box(6.8, 0.05, 1.8, scorchedMat);
  crackMarker.position.set(0, 0.02, 0);
  crackMarker.rotation.y = -0.08;
  group.add(crackMarker);

  group.rotation.z = -0.08;
  return group;
}

function createLander() {
  const group = new THREE.Group();
  const steel = mat(0xd0c6b5, 0.46, 0.62);
  const dark = mat(0x18191a, 0.62, 0.38);
  const orange = mat(0xd56d31, 0.7, 0.04);
  const glass = mat(0x66d9ff, 0.24, 0.36, 0x238db1);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.46, 13.5, 12), steel);
  body.position.y = 8;
  body.castShadow = true;
  body.receiveShadow = true;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(2.25, 3.7, 12), steel);
  nose.position.y = 16.85;
  nose.castShadow = true;
  nose.receiveShadow = true;
  const engine = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.95, 1.5, 12), dark);
  engine.position.y = 1.2;
  engine.castShadow = true;
  group.add(body, nose, engine);

  const heatShield = new THREE.Mesh(new THREE.CylinderGeometry(2.28, 2.48, 13.35, 12, 1, true, Math.PI * 0.86, Math.PI * 0.72), dark);
  heatShield.position.y = 8.02;
  heatShield.castShadow = true;
  heatShield.receiveShadow = true;
  group.add(heatShield);

  for (const y of [3.4, 5.55, 7.7, 9.85, 12.0, 14.15]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.31, 0.025, 5, 24), mat(0xb8afa2, 0.5, 0.58));
    ring.position.y = y;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }

  for (const angle of [0.28, 1.84, 3.42, 4.98]) {
    const seam = box(0.035, 12.6, 0.06, mat(0xf3ead8, 0.42, 0.5));
    seam.position.set(Math.cos(angle) * 2.34, 8.1, Math.sin(angle) * 2.34);
    seam.rotation.y = -angle;
    group.add(seam);
  }

  const hatchY = 10.56;
  const hatchFrame = box(1.22, 1.62, 0.1, steel);
  hatchFrame.position.set(0, hatchY, -2.36);
  const hatchDoorPanel = box(0.9, 1.22, 0.08, dark);
  hatchDoorPanel.position.set(0, hatchY - 0.02, -2.45);
  const hatchPortal = box(0.9, 1.2, 0.09, mat(0x0d0d0d, 0.82, 0.28));
  hatchPortal.position.set(0, hatchY - 0.02, -2.48);
  hatchPortal.visible = false;
  const hatchLight = box(0.18, 0.12, 0.1, mat(0xffe0a6, 0.3, 0.18, 0xffb15d));
  hatchLight.position.set(0.7, hatchY + 0.66, -2.44);

  const rocketInterior = new THREE.Group();
  rocketInterior.visible = false;
  const rocketInteriorFloorY = hatchY - 1.15;
  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x4d524e,
    roughness: 0.82,
    metalness: 0.36,
    emissive: 0x080d0d,
    emissiveIntensity: 0.03,
    flatShading: true,
    side: THREE.BackSide,
  });
  const ribMat = mat(0x89918c, 0.62, 0.34);
  const interiorPanel = new THREE.MeshStandardMaterial({
    color: 0xd0a66a,
    roughness: 0.48,
    metalness: 0.18,
    emissive: 0xffb15d,
    emissiveIntensity: 0.22,
    side: THREE.DoubleSide,
  });
  const barrelCenterY = rocketInteriorFloorY + 1.72;
  const barrelShell = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.72, 6.1, 18, 1, true), barrelMat);
  barrelShell.rotation.x = Math.PI / 2;
  barrelShell.position.set(0, barrelCenterY, -0.34);
  barrelShell.receiveShadow = true;
  const barrelRibs = [-2.84, -1.62, -0.4, 0.82, 2.04].map((z) => {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.025, 6, 24), ribMat);
    rib.position.set(0, barrelCenterY, z);
    rib.castShadow = true;
    return rib;
  });
  const innerDeck = box(2.38, 0.12, 5.9, mat(0x282d2b, 0.76, 0.24));
  innerDeck.position.set(0, rocketInteriorFloorY, -0.34);
  const ceilingStrip = box(1.65, 0.06, 0.1, interiorPanel);
  ceilingStrip.position.set(0, rocketInteriorFloorY + 3.34, 0.3);
  const rocketInteriorLight = new THREE.PointLight(0xffe6bf, 4.2, 14);
  rocketInteriorLight.position.set(0, rocketInteriorFloorY + 2.18, -0.18);
  rocketInteriorLight.visible = false;
  const rocketInteriorFillLight = new THREE.PointLight(0xffc276, 2.2, 12);
  rocketInteriorFillLight.position.set(0, rocketInteriorFloorY + 2.6, -2.45);
  rocketInteriorFillLight.visible = false;
  const rocketInteriorBackLight = new THREE.PointLight(0x8fdcff, 1.6, 10);
  rocketInteriorBackLight.position.set(0, rocketInteriorFloorY + 2.45, 2.05);
  rocketInterior.add(
    barrelShell,
    ...barrelRibs,
    innerDeck,
    ceilingStrip,
    rocketInteriorLight,
    rocketInteriorFillLight,
    rocketInteriorBackLight
  );
  group.add(hatchFrame, hatchDoorPanel, hatchPortal, hatchLight, rocketInterior);

  for (const y of [11.35, 12.05]) {
    for (const x of [-0.42, 0.42]) {
      const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.18, 8), dark);
      thruster.position.set(x, y, -2.35);
      thruster.rotation.x = Math.PI / 2;
      thruster.castShadow = true;
      group.add(thruster);
    }
  }

  for (let i = 0; i < 3; i += 1) {
    const angle = Math.PI / 2 + (i / 3) * Math.PI * 2;
    const fin = box(0.5, 4.45, 1.52, orange);
    fin.position.set(Math.cos(angle) * 2.34, 3.55, Math.sin(angle) * 2.34);
    fin.rotation.y = -angle;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6.4, 6), dark);
    leg.position.set(Math.cos(angle) * 3.72, 1.38, Math.sin(angle) * 3.72);
    leg.rotation.z = Math.cos(angle) * 0.42;
    leg.rotation.x = -Math.sin(angle) * 0.42;
    leg.castShadow = true;
    const foot = box(0.72, 0.18, 0.62, dark);
    foot.position.set(Math.cos(angle) * 4.72, -0.08, Math.sin(angle) * 4.72);
    foot.rotation.y = -angle;
    group.add(fin, leg, foot);
  }

  const elevatorRoot = new THREE.Group();
  elevatorRoot.position.set(-3.25, 0.02, -2.36);
  const railMat = mat(0xc2b8aa, 0.44, 0.55);
  const railA = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 10.16, 6), railMat);
  railA.position.set(-0.32, 5.08, 0);
  const railB = railA.clone();
  railB.position.x = 0.32;
  const towerBase = box(1.2, 0.16, 1.0, dark);
  towerBase.position.set(0, -0.08, 0);
  const platformTop = box(1.02, 0.12, 0.86, dark);
  platformTop.position.set(0, 10.08, 0);
  const bridge = box(3.08, 0.1, 0.58, railMat);
  bridge.position.set(1.27, 10.08, 0);
  const bridgeRailL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.62, 6), railMat);
  bridgeRailL.rotation.z = Math.PI / 2;
  bridgeRailL.position.set(1.27, 10.44, -0.36);
  bridgeRailL.castShadow = true;
  const bridgeRailR = bridgeRailL.clone();
  bridgeRailR.position.z = 0.36;
  const elevatorCar = new THREE.Group();
  elevatorCar.position.y = -0.04;
  const carFloor = box(0.9, 0.12, 0.78, orange);
  carFloor.position.y = 0;
  const carBack = box(0.82, 0.18, 0.08, dark);
  carBack.position.set(0, 0.16, 0.36);
  elevatorCar.add(carFloor, carBack);
  elevatorRoot.add(railA, railB, towerBase, platformTop, bridge, bridgeRailL, bridgeRailR, elevatorCar);
  group.add(elevatorRoot);
  group.userData.elevator = {
    car: elevatorCar,
    surfaceObject: carFloor,
    rocketDoorPanel: hatchDoorPanel,
    rocketDoorPortal: hatchPortal,
    rocketInterior,
    rocketInteriorLight,
    rocketInteriorFillLight,
    rocketInteriorFloorY,
    bottomY: -0.04,
    topY: 10.02,
    surfaceY: 0.14,
    speed: 3.1,
    target: "bottom",
    moving: false,
    label: "飞船升降梯",
    radius: 1.85,
    walkBounds: {
      minX: -0.5,
      maxX: 2.72,
      minZ: -0.43,
      maxZ: 0.43,
    },
  } satisfies ElevatorControl;
  return group;
}

function createHabitatModule() {
  const group = new THREE.Group();
  const hull = mat(0xf4ead8, 0.6, 0.1);
  const trim = mat(0xc56d3d, 0.68, 0.04);
  const glass = mat(0x162b36, 0.2, 0.48, 0x1d5c6d);
  const dark = mat(0x191715, 0.78, 0.2);
  const interior = mat(0xded4bf, 0.66, 0.12);
  const floorMat = mat(0x2b2926, 0.78, 0.22);
  const sleepShell = mat(0xd8d0c0, 0.58, 0.12);
  const sleepGlass = new THREE.MeshPhysicalMaterial({
    color: 0x8ee6ff,
    transparent: true,
    opacity: 0.3,
    roughness: 0.08,
    metalness: 0.04,
    flatShading: true,
    depthWrite: false,
  });
  hull.side = THREE.DoubleSide;
  interior.side = THREE.DoubleSide;

  const interiorScene = new THREE.Group();
  interiorScene.visible = false;
  group.add(interiorScene);

  const skid = foundation(13.8, 5.4);
  skid.position.y = -2.46;
  group.add(skid);

  const tube = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 12.5, 14), hull);
  tube.rotation.z = Math.PI / 2;
  tube.castShadow = true;
  tube.receiveShadow = true;
  group.add(tube);

  const innerShell = new THREE.Mesh(new THREE.CylinderGeometry(2.16, 2.16, 11.6, 18, 1, true), interior);
  innerShell.rotation.z = Math.PI / 2;
  innerShell.position.y = -0.04;
  innerShell.castShadow = true;
  innerShell.receiveShadow = true;
  group.add(innerShell);

  const floor = box(11.2, 0.18, 3.72, floorMat);
  floor.position.set(0, -1.42, 0);
  const centerAisle = box(10.2, 0.08, 0.74, mat(0x1f1e1d, 0.84, 0.18));
  centerAisle.position.set(0, -1.27, 0);
  group.add(floor, centerAisle);

  const sealedFloor = box(11.9, 0.16, 4.68, mat(0x272521, 0.84, 0.18));
  sealedFloor.position.set(0, -1.16, 0);
  const ceilingPanel = box(10.9, 0.12, 3.68, mat(0xd5c9b4, 0.68, 0.12));
  ceilingPanel.position.set(0, 1.46, 0);
  const rearWall = box(0.2, 2.58, 4.42, interior);
  rearWall.position.set(5.72, -0.04, 0);
  const leftEndWall = rearWall.clone();
  leftEndWall.position.x = -5.72;
  const frontLeftWall = box(4.78, 2.5, 0.2, interior);
  frontLeftWall.position.set(-3.18, -0.1, -2.06);
  const frontRightWall = frontLeftWall.clone();
  frontRightWall.position.x = 3.18;
  const rearLowerSkirt = box(11.5, 1.0, 0.16, interior);
  rearLowerSkirt.position.set(0, -0.8, 2.12);
  interiorScene.add(sealedFloor, ceilingPanel, rearWall, leftEndWall, frontLeftWall, frontRightWall, rearLowerSkirt);

  for (const x of [-4.2, 4.2]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.1, 6, 18), trim);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = x * 1.22;
    group.add(ring);
  }

  for (let i = -2; i <= 2; i += 1) {
    const window = box(1.05, 0.42, 0.06, glass);
    window.position.set(i * 1.85, 0.68, -2.38);
    group.add(window);
  }

  const doorFrame = box(1.5, 2.28, 0.14, trim);
  doorFrame.position.set(0, -0.2, -2.46);
  const exteriorMask = box(1.04, 1.86, 0.16, hull);
  exteriorMask.position.set(0, -0.28, -2.52);
  const interiorPortal = box(1.08, 1.86, 0.12, mat(0x171513, 0.86, 0.18));
  interiorPortal.position.set(0, -0.28, -2.56);
  interiorPortal.visible = false;
  const doorLight = box(0.18, 0.12, 0.08, mat(0xffd98b, 0.28, 0.2, 0xffb15d));
  doorLight.position.set(0.76, 0.78, -2.56);
  const doorPanels = new THREE.Group();
  const doorPanelL = box(0.5, 1.8, 0.08, hull);
  doorPanelL.position.set(-0.27, -0.3, -2.58);
  const doorPanelR = doorPanelL.clone();
  doorPanelR.position.x = 0.27;
  doorPanels.add(doorPanelL, doorPanelR);
  const interiorDoor = new THREE.Group();
  const interiorDoorPanelMat = mat(0xf5f0e6, 0.52, 0.12);
  const interiorDoorLeft = box(0.49, 1.78, 0.08, interiorDoorPanelMat);
  interiorDoorLeft.position.set(-0.26, -0.3, -2.0);
  const interiorDoorRight = interiorDoorLeft.clone();
  interiorDoorRight.position.x = 0.26;
  const interiorDoorSeam = box(0.035, 1.78, 0.09, mat(0xbfc4c7, 0.58, 0.16));
  interiorDoorSeam.position.set(0, -0.3, -1.995);
  interiorDoor.add(interiorDoorLeft, interiorDoorRight, interiorDoorSeam);
  interiorDoor.visible = false;
  const step = box(1.35, 0.12, 0.82, mat(0x6a4b38, 0.9, 0.04));
  step.position.set(0, -1.98, -2.82);
  step.rotation.x = -0.08;
  group.add(doorFrame, exteriorMask, interiorPortal, doorLight, doorPanels, interiorDoor, step);

  const podXs = [-4.45, -2.95, -1.45, 0.05, 1.55, 3.05, 4.55];
  const sleepPodGeometry = new THREE.CapsuleGeometry(0.34, 1.22, 5, 10);
  const sleepPodLowerGeometry = splitGeometryByLocalX(sleepPodGeometry, false);
  const sleepPodUpperGeometry = splitGeometryByLocalX(sleepPodGeometry, true);
  const sleepPodCutCapGeometry = createSleepPodCutCapGeometry(0.34, 1.22);
  podXs.forEach((x, index) => {
    const z = index % 2 === 0 ? 1.24 : -1.22;
    const pod = new THREE.Group();
    pod.position.set(x, -0.94, z);
    const lowerShell = new THREE.Mesh(sleepPodLowerGeometry, sleepShell);
    const lowerCutCap = new THREE.Mesh(sleepPodCutCapGeometry, sleepShell);
    const upperGlass = new THREE.Mesh(sleepPodUpperGeometry, sleepGlass);
    lowerShell.rotation.z = Math.PI / 2;
    lowerCutCap.rotation.z = Math.PI / 2;
    upperGlass.rotation.z = Math.PI / 2;
    lowerShell.castShadow = true;
    lowerShell.receiveShadow = true;
    lowerCutCap.receiveShadow = true;
    upperGlass.castShadow = false;
    upperGlass.receiveShadow = false;
    pod.add(lowerShell, lowerCutCap, upperGlass);
    const status = box(0.12, 0.08, 0.08, mat(index === 6 ? 0xffb15d : 0x8cffaa, 0.28, 0.2, index === 6 ? 0xff9d3d : 0x44ff88));
    status.position.set(x + 0.45, -0.72, z - Math.sign(z) * 0.36);
    group.add(pod, status);
  });

  const ceilingLightA = box(0.16, 0.08, 2.0, sleepGlass);
  ceilingLightA.position.set(-2.4, 1.46, 0);
  const ceilingLightB = ceilingLightA.clone();
  ceilingLightB.position.x = 2.4;
  const interiorLight = new THREE.PointLight(0xffe4b8, 3.1, 12);
  interiorLight.position.set(0, 1.05, 0);
  interiorLight.visible = false;
  group.add(ceilingLightA, ceilingLightB, interiorLight);
  group.userData.door = {
    root: group,
    doorPanels,
    exteriorMask,
    interiorPortal,
    interiorDoor,
    interiorScene,
    interiorLight,
    open: false,
    occupied: false,
    promptRadius: 3.15,
    label: "居住舱舱门",
  } satisfies HabitatDoorControl;
  return group;
}

function createGreenhouse(flickerLights: THREE.PointLight[]) {
  const group = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(4.65, 4.85, 0.32, 18), mat(0x5d4031, 0.94, 0.04));
  slab.position.y = -0.04;
  slab.castShadow = true;
  slab.receiveShadow = true;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.45, 18), mat(0x4e392b, 0.82));
  base.position.y = 0.26;
  base.castShadow = true;
  base.receiveShadow = true;

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(4.1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0xa8e7dd,
      transparent: true,
      opacity: 0.38,
      roughness: 0.08,
      metalness: 0,
      flatShading: true,
    })
  );
  dome.position.y = 0.45;
  dome.castShadow = true;

  const airlockMat = mat(0xd9d0bf, 0.54, 0.12);
  const sensorMat = mat(0xd1c2ae, 0.46, 0.2);
  const doorPad = box(1.9, 0.08, 0.82, mat(0x6a4b38, 0.9, 0.04));
  doorPad.position.set(0, 0.09, -4.45);
  doorPad.rotation.x = -0.04;
  const leftPost = box(0.15, 1.12, 0.2, airlockMat);
  leftPost.position.set(-0.56, 0.82, -4.02);
  const rightPost = leftPost.clone();
  rightPost.position.x = 0.56;
  const lintel = box(1.35, 0.18, 0.2, airlockMat);
  lintel.position.set(0, 1.42, -4.02);
  const sensorA = box(0.14, 0.1, 0.065, sensorMat);
  sensorA.position.set(-0.34, 1.18, -4.18);
  const sensorB = sensorA.clone();
  sensorB.position.x = 0.34;
  const doorPanels = new THREE.Group();
  const doorLeft = box(0.48, 0.92, 0.08, sensorMat);
  doorLeft.position.set(-0.25, 0.76, -4.14);
  const doorRight = doorLeft.clone();
  doorRight.position.x = 0.25;
  const doorSeal = box(0.06, 0.96, 0.09, mat(0x594034, 0.82, 0.12));
  doorSeal.position.set(0, 0.76, -4.16);
  doorPanels.add(doorLeft, doorRight, doorSeal);

  const leaf = mat(0x4f9a53, 0.78);
  const leafDark = mat(0x2f6f43, 0.88);
  const trunk = mat(0x6b4b2d, 0.82, 0.05);
  const shrub = mat(0x376d3f, 0.9);
  const treeColliders = [
    { x: -2.38, z: -1.95, radius: 0.48, height: 1.35 },
    { x: -1.45, z: -2.28, radius: 0.38, height: 1.05 },
    { x: 1.96, z: -2.12, radius: 0.44, height: 1.28 },
    { x: 2.72, z: -1.18, radius: 0.5, height: 1.58 },
    { x: -2.7, z: -0.72, radius: 0.54, height: 1.7 },
    { x: -1.72, z: -0.22, radius: 0.34, height: 0.95 },
    { x: 1.24, z: -0.78, radius: 0.38, height: 1.12 },
    { x: 2.18, z: 0.06, radius: 0.48, height: 1.45 },
    { x: -2.32, z: 0.72, radius: 0.44, height: 1.3 },
    { x: -1.18, z: 1.2, radius: 0.36, height: 1.02 },
    { x: 1.45, z: 0.86, radius: 0.52, height: 1.62 },
    { x: 2.48, z: 1.35, radius: 0.4, height: 1.18 },
    { x: -2.05, z: 2.28, radius: 0.5, height: 1.54 },
    { x: -0.82, z: 2.62, radius: 0.34, height: 1.0 },
    { x: 1.22, z: 2.2, radius: 0.46, height: 1.38 },
    { x: 2.48, z: 2.36, radius: 0.36, height: 1.05 },
    { x: 0.14, z: -1.78, radius: 0.24, height: 0.72, shrub: true },
    { x: -0.48, z: -0.58, radius: 0.22, height: 0.66, shrub: true },
    { x: 0.34, z: 0.48, radius: 0.24, height: 0.7, shrub: true },
    { x: -0.08, z: 1.58, radius: 0.22, height: 0.62, shrub: true },
  ];

  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.625, -2.95),
    new THREE.Vector3(0.92, 0.626, -1.72),
    new THREE.Vector3(-0.42, 0.626, -0.42),
    new THREE.Vector3(0.72, 0.626, 0.92),
    new THREE.Vector3(0.02, 0.626, 2.62),
  ]);
  const pathPoints = path.getPoints(48);
  const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
  const pathLine = new THREE.Line(
    pathGeometry,
    new THREE.LineBasicMaterial({ color: 0x9ccf8c, transparent: true, opacity: 0.34 })
  );
  group.add(pathLine);

  for (const [index, tree] of treeColliders.entries()) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(tree.x, 0.62, tree.z);
    if (tree.shrub) {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(tree.radius * 0.9, 0), shrub);
      crown.position.y = tree.height * 0.42;
      crown.scale.set(1, 0.72, 1);
      crown.castShadow = true;
      treeGroup.add(crown);
    } else {
      const trunkMesh = new THREE.Mesh(new THREE.CylinderGeometry(tree.radius * 0.16, tree.radius * 0.22, tree.height * 0.42, 5), trunk);
      trunkMesh.position.y = tree.height * 0.21;
      trunkMesh.castShadow = true;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(tree.radius * 0.92, tree.height * 0.78, 7), index % 3 === 0 ? leafDark : leaf);
      crown.position.y = tree.height * 0.72;
      crown.castShadow = true;
      const crownTop = new THREE.Mesh(new THREE.ConeGeometry(tree.radius * 0.68, tree.height * 0.54, 7), leaf);
      crownTop.position.y = tree.height * 1.02;
      crownTop.castShadow = true;
      treeGroup.add(trunkMesh, crown, crownTop);
    }
    group.add(treeGroup);
  }

  const light = new THREE.PointLight(0x8cffaa, 1.4, 14);
  light.position.set(0, 3.6, 0);
  flickerLights.push(light);
  group.add(slab, base, dome, doorPad, leftPost, rightPost, lintel, sensorA, sensorB, doorPanels, light);
  group.userData.door = {
    root: group,
    doorPanels,
    interiorLight: light,
    treeColliders: treeColliders.map(({ x, z, radius }) => ({ x, z, radius })),
    occupied: false,
    promptRadius: 15,
    label: "02 建筑 温室生态舱",
  } satisfies GreenhouseDoorControl;
  return group;
}

function createIndustrialPlant(accent: number, mark: string, openBay = false) {
  const group = new THREE.Group();
  const baseMat = mat(0xd7d0c2, 0.56, 0.14);
  const dark = mat(0x262321, 0.74, 0.32);
  const accentMat = mat(accent, 0.32, 0.24, accent);

  group.add(foundation(6.2, 4.1));

  if (openBay) {
    const leftWall = box(0.78, 2.25, 3.2, baseMat);
    leftWall.position.set(-2.26, 1.35, 0);
    const rightWall = leftWall.clone();
    rightWall.position.x = 2.26;
    const backWall = box(5.3, 2.25, 0.44, baseMat);
    backWall.position.set(0, 1.35, 1.38);
    const roof = box(5.3, 0.38, 3.2, baseMat);
    roof.position.set(0, 2.66, 0);
    const lintel = box(5.3, 0.46, 0.34, baseMat);
    lintel.position.set(0, 2.18, -1.44);
    const interior = box(3.6, 0.1, 2.45, dark);
    interior.position.set(0, 0.22, -0.18);
    const ramp = box(2.5, 0.12, 1.25, mat(0x6a4b38, 0.88, 0.04));
    ramp.position.set(0, 0.12, -2.02);
    ramp.rotation.x = -0.12;
    const doorFrame = box(2.9, 1.9, 0.08, accentMat);
    doorFrame.position.set(0, 1.16, -1.64);
    const doorway = box(2.35, 1.58, 0.1, dark);
    doorway.position.set(0, 1.02, -1.69);
    group.add(leftWall, rightWall, backWall, roof, lintel, interior, ramp, doorFrame, doorway);
  } else {
    const block = box(5.3, 2.2, 3.2, baseMat);
    block.position.y = 1.35;
    group.add(block);
  }

  for (let i = 0; i < 3; i += 1) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 3.2, 10), baseMat);
    tank.position.set(-1.7 + i * 1.65, 3.15, 1.35);
    tank.castShadow = true;
    group.add(tank);
  }

  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 4.2, 8), dark);
  stack.position.set(2.25, 4.0, -0.95);
  stack.castShadow = true;
  const sign = box(2.8, 0.24, 0.08, accentMat);
  sign.position.set(0, openBay ? 2.58 : 2.1, -1.64);
  group.add(stack, sign);

  const marker = createTextPlate(mark, accentMat);
  marker.position.set(0, openBay ? 2.96 : 2.52, -1.69);

  const roofRailA = box(5.7, 0.08, 0.08, dark);
  roofRailA.position.set(0, 3.92, -1.92);
  const roofRailB = roofRailA.clone();
  roofRailB.position.z = 1.92;
  const servicePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.8, 8), dark);
  servicePipe.rotation.z = Math.PI / 2;
  servicePipe.position.set(0, 2.24, 1.82);
  servicePipe.castShadow = true;
  const ventA = box(0.52, 0.32, 0.12, accentMat);
  ventA.position.set(-2.2, 1.72, -1.71);
  const ventB = ventA.clone();
  ventB.position.x = -1.48;
  const floodLight = box(0.22, 0.14, 0.12, mat(0xffe0a6, 0.32, 0.12, 0xffb15d));
  floodLight.position.set(2.12, 2.18, -1.72);
  group.add(marker, roofRailA, roofRailB, servicePipe, ventA, ventB, floodLight);
  return group;
}

function createTextPlate(text: string, material: THREE.Material) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#171717";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffe7c2";
    let fontSize = 56;
    do {
      ctx.font = `bold ${fontSize}px monospace`;
      fontSize -= 2;
    } while (ctx.measureText(text).width > canvas.width - 44 && fontSize > 20);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.68), new THREE.MeshBasicMaterial({ map: texture }));
}

function createBlackMonolith() {
  const group = new THREE.Group();
  group.name = "Black monolith";

  const monolithMat = new THREE.MeshStandardMaterial({
    color: 0x010101,
    roughness: 0.42,
    metalness: 0.36,
    emissive: 0x000000,
    flatShading: true,
  });
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x111315,
    roughness: 0.38,
    metalness: 0.48,
    emissive: 0x02080a,
    emissiveIntensity: 0.08,
    flatShading: true,
  });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(2.18, 5.9, 0.36), monolithMat);
  slab.position.y = 2.95;
  slab.castShadow = true;
  slab.receiveShadow = true;
  const bevelLineA = box(0.035, 5.82, 0.045, edgeMat);
  bevelLineA.position.set(-1.11, 2.96, -0.2);
  const bevelLineB = bevelLineA.clone();
  bevelLineB.position.x = 1.11;

  group.add(slab, bevelLineA, bevelLineB);
  return group;
}

function createAncientTreeArch() {
  const group = new THREE.Group();
  group.name = "Ancient petrified tree arch";

  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d3333,
    roughness: 0.94,
    metalness: 0.04,
    emissive: 0x020303,
    emissiveIntensity: 0.04,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const darkCreviceMaterial = new THREE.MeshStandardMaterial({
    color: 0x070909,
    roughness: 1,
    metalness: 0.02,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const wornEdgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x747872,
    roughness: 0.9,
    metalness: 0.03,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  const halfWidth = ANCIENT_TREE_ARCH_WIDTH * 0.5;
  const rootHalfWidth = ANCIENT_TREE_ARCH_FOOTPRINT_RADIUS;
  const depth = 46;
  const shape = new THREE.Shape();
  shape.moveTo(-rootHalfWidth, -6);
  shape.bezierCurveTo(-52, -3, -46, 0, -39, 7);
  shape.bezierCurveTo(-43, 34, -38, 72, -27, 104);
  shape.bezierCurveTo(-21, 116, -11, ANCIENT_TREE_ARCH_HEIGHT, 0, ANCIENT_TREE_ARCH_HEIGHT);
  shape.bezierCurveTo(11, ANCIENT_TREE_ARCH_HEIGHT, 21, 116, 27, 104);
  shape.bezierCurveTo(38, 72, 43, 34, 39, 7);
  shape.bezierCurveTo(46, 0, 52, -3, rootHalfWidth, -6);
  shape.bezierCurveTo(48, -4.2, 38, -1.8, 30, -1.2);
  shape.lineTo(22, -1.2);
  shape.lineTo(22, 45);
  shape.bezierCurveTo(22, 67, 12, 80, 0, 80);
  shape.bezierCurveTo(-12, 80, -22, 67, -22, 45);
  shape.lineTo(-22, -1.2);
  shape.lineTo(-30, -1.2);
  shape.bezierCurveTo(-38, -1.8, -48, -4.2, -rootHalfWidth, -6);

  const trunkGeometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 1.6,
    bevelSize: 1.2,
    bevelSegments: 2,
    curveSegments: 20,
    steps: 1,
  });
  trunkGeometry.translate(0, 0, -depth * 0.5);
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  for (let i = 0; i < 34; i += 1) {
    const t = i / 33;
    const x = THREE.MathUtils.lerp(-halfWidth + 3, halfWidth - 3, t);
    if (Math.abs(x) < 23) continue;
    const h = THREE.MathUtils.lerp(82, 115, seededNoise(i + 1, 8.7));
    const y = h * 0.5 + THREE.MathUtils.lerp(1.4, 5.6, seededNoise(i + 2, 4.1));
    const z = depth * 0.5 + 0.18;
    const groove = box(0.16 + seededNoise(i, 2.8) * 0.12, h, 0.26, darkCreviceMaterial);
    groove.position.set(x + Math.sin(i * 1.7) * 0.9, y, z);
    groove.rotation.z = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(-3.5, 3.5, seededNoise(i, 5.3)));
    group.add(groove);
    const backGroove = groove.clone();
    backGroove.position.z = -z;
    group.add(backGroove);
  }

  for (const [x, y, w, h] of [
    [-34, 82, 3.8, 13],
    [35, 69, 4.6, 17],
    [-42, 34, 3.2, 11],
    [29, 25, 5.8, 18],
  ] as const) {
    const scar = box(w, h, 0.34, darkCreviceMaterial);
    scar.position.set(x, y, depth * 0.5 + 0.34);
    scar.rotation.z = THREE.MathUtils.degToRad(x < 0 ? -5 : 4);
    group.add(scar);
  }

  for (const side of [-1, 1]) {
    const edge = box(1.1, 79, 0.48, wornEdgeMaterial);
    edge.position.set(side * 21.8, 39.4, depth * 0.5 + 0.42);
    edge.rotation.z = side * THREE.MathUtils.degToRad(-3);
    group.add(edge);
  }

  return group;
}

function createAncientTreePortal() {
  const group = new THREE.Group();
  group.name = "Ancient tree stargate energy";
  group.visible = false;
  group.renderOrder = 8;

  const portalMaterial = createPortalEnergyMaterial(0xffffff, 0.84, 1);
  const portal = new THREE.Mesh(new THREE.CircleGeometry(1, 96), portalMaterial);
  portal.position.set(0, 39.5, 0);
  portal.scale.set(22.4, 39.2, 1);
  portal.renderOrder = 8;
  group.add(portal);

  const haloMaterial = createPortalEnergyMaterial(0x43bfff, 0.42, 1.55);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(1, 96), haloMaterial);
  halo.position.set(0, 39.5, -0.16);
  halo.scale.set(25.8, 42.6, 1);
  halo.renderOrder = 7;
  group.add(halo);

  const depthMaterial = createPortalEnergyMaterial(0x74eaff, 0.34, 2.4);
  const depthVeil = new THREE.Mesh(new THREE.CircleGeometry(1, 96), depthMaterial);
  depthVeil.position.set(0, 39.5, -1.25);
  depthVeil.scale.set(18.8, 33.5, 1);
  depthVeil.renderOrder = 6;
  group.add(depthVeil);

  const particleCount = 120;
  const positions = new Float32Array(particleCount * 3);
  const particleSeeds: number[] = [];
  for (let i = 0; i < particleCount; i += 1) {
    particleSeeds.push(seededNoise(i + 71, 13.7));
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 39.5;
    positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(2.2);
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xc8f7ff,
    size: 1.18,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.renderOrder = 9;
  group.add(particles);

  const lightningGeometry = new THREE.BufferGeometry();
  const lightningPositions = new Float32Array(14 * 2 * 3);
  lightningGeometry.setAttribute("position", new THREE.BufferAttribute(lightningPositions, 3));
  const lightningMaterial = new THREE.LineBasicMaterial({
    color: 0xe8fbff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const lightning = new THREE.LineSegments(lightningGeometry, lightningMaterial);
  lightning.renderOrder = 10;
  group.add(lightning);

  const reflectedLightMaterial = new THREE.MeshBasicMaterial({
    color: 0x67d9ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  for (const side of [-1, 1]) {
    const pillarGlow = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 70, 1, 1), reflectedLightMaterial.clone());
    pillarGlow.position.set(side * 23.4, 38.5, 22.95);
    pillarGlow.rotation.z = side * THREE.MathUtils.degToRad(-5);
    pillarGlow.renderOrder = 11;
    group.add(pillarGlow);
  }
  const groundGlowMaterial = new THREE.MeshBasicMaterial({
    map: getDustFogTexture(),
    color: 0x8eeaff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const groundGlow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), groundGlowMaterial);
  groundGlow.position.set(0, 0.34, 17.5);
  groundGlow.rotation.x = -Math.PI / 2;
  groundGlow.scale.set(25, 12, 1);
  groundGlow.renderOrder = 11;
  group.add(groundGlow);

  const coreLight = new THREE.PointLight(0xb8f6ff, 0, 128, 0.82);
  coreLight.position.set(0, 36, 18);
  group.add(coreLight);
  const archLight = new THREE.PointLight(0x66cfff, 0, 98, 0.95);
  archLight.position.set(0, 66, 22);
  group.add(archLight);
  const groundLight = new THREE.PointLight(0x79ddff, 0, 92, 1.05);
  groundLight.position.set(0, 7.5, 24);
  group.add(groundLight);

  group.userData.portalMaterial = portalMaterial;
  group.userData.haloMaterial = haloMaterial;
  group.userData.depthMaterial = depthMaterial;
  group.userData.particleMaterial = particleMaterial;
  group.userData.reflectedLightMaterials = group.children
    .filter((child): child is THREE.Mesh => child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial && child.renderOrder === 11)
    .map((mesh) => mesh.material as THREE.MeshBasicMaterial);
  group.userData.particleSeeds = particleSeeds;
  group.userData.lightningMaterial = lightningMaterial;
  group.userData.lightningPositions = lightningPositions;
  group.userData.lightningAttribute = lightningGeometry.getAttribute("position");
  group.userData.coreLight = coreLight;
  group.userData.archLight = archLight;
  group.userData.groundLight = groundLight;
  group.userData.lastLightningTick = -1;
  return group;
}

function createPortalEnergyMaterial(color: number, baseOpacity: number, depthScale: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uStrength: { value: 0 },
      uPulse: { value: 1 },
      uColor: { value: new THREE.Color(color) },
      uBaseOpacity: { value: baseOpacity },
      uDepthScale: { value: depthScale },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform float uStrength;
      uniform float uPulse;
      uniform vec3 uColor;
      uniform float uBaseOpacity;
      uniform float uDepthScale;
      varying vec2 vUv;
      ${shaderNoise}

      void main() {
        vec2 centered = vUv - 0.5;
        centered.x *= 1.42;
        float r = length(centered) * 2.0;
        float angle = atan(centered.y, centered.x);
        float edge = smoothstep(1.02, 0.78, r);
        float rim = smoothstep(0.98, 0.74, r) - smoothstep(0.7, 0.42, r);
        float rings = sin((1.05 - r) * 24.0 * uDepthScale - uTime * 3.4 + fbm2(centered * 5.0 + uTime * 0.08) * 3.2);
        float stream = fbm2(vec2(angle * 1.8 + uTime * 0.18, r * 5.5 - uTime * 0.36));
        float core = smoothstep(0.82, 0.08, r) * (0.38 + stream * 0.4);
        float depth = smoothstep(-0.12, 0.9, rings) * smoothstep(1.04, 0.18, r) * 0.36;
        float alpha = (core + depth + rim * 0.9) * edge * uStrength * uBaseOpacity * uPulse;
        vec3 whiteHot = vec3(0.92, 1.0, 1.0);
        vec3 color = mix(uColor, whiteHot, clamp(core + depth * 0.7, 0.0, 1.0));
        color += uColor * rim * 0.8;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
}

function getAncientTreePortalTexture() {
  if (ancientTreePortalTexture) return ancientTreePortalTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 4, 128, 128, 126);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.26, "rgba(255,255,255,0.96)");
    gradient.addColorStop(0.48, "rgba(128,228,255,0.74)");
    gradient.addColorStop(0.72, "rgba(22,104,255,0.54)");
    gradient.addColorStop(0.92, "rgba(7,33,138,0.22)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 42; i += 1) {
      const angle = seededNoise(i, 9.13) * Math.PI * 2;
      const radius = 18 + seededNoise(i, 3.31) * 94;
      const cx = 128 + Math.cos(angle) * radius * 0.34;
      const cy = 128 + Math.sin(angle) * radius * 0.34;
      ctx.beginPath();
      ctx.arc(cx, cy, 10 + seededNoise(i, 5.17) * 28, angle, angle + Math.PI * (0.35 + seededNoise(i, 7.71) * 0.9));
      ctx.stroke();
    }
  }
  ancientTreePortalTexture = new THREE.CanvasTexture(canvas);
  ancientTreePortalTexture.colorSpace = THREE.SRGBColorSpace;
  return ancientTreePortalTexture;
}

export function updateAncientTreePortal(portal: THREE.Group, elapsed: number) {
  const activeDuration = 28.5;
  const openedAt = Number(portal.userData.openedAt ?? -Infinity);
  const activeAge = elapsed - openedAt;
  const active = activeAge >= 0 && activeAge < activeDuration;
  const fadeIn = THREE.MathUtils.smoothstep(activeAge, 0.2, 1.2);
  const fadeOut = 1 - THREE.MathUtils.smoothstep(activeAge, activeDuration - 4.8, activeDuration);
  const strength = active ? Math.max(0, Math.min(fadeIn, fadeOut)) : 0;
  portal.userData.portalStrength = strength;
  portal.visible = strength > 0.01;
  if (!portal.visible) return;

  const pulse = 0.74 + Math.sin(elapsed * 5.2) * 0.12 + Math.sin(elapsed * 13.1) * 0.06;
  const portalMaterial = portal.userData.portalMaterial as THREE.ShaderMaterial;
  const haloMaterial = portal.userData.haloMaterial as THREE.ShaderMaterial;
  const depthMaterial = portal.userData.depthMaterial as THREE.ShaderMaterial;
  const particleMaterial = portal.userData.particleMaterial as THREE.PointsMaterial;
  const lightningMaterial = portal.userData.lightningMaterial as THREE.LineBasicMaterial;
  const coreLight = portal.userData.coreLight as THREE.PointLight;
  const archLight = portal.userData.archLight as THREE.PointLight;
  const groundLight = portal.userData.groundLight as THREE.PointLight;
  const reflectedLightMaterials = portal.userData.reflectedLightMaterials as THREE.MeshBasicMaterial[];
  portalMaterial.uniforms.uTime.value = elapsed;
  portalMaterial.uniforms.uStrength.value = strength;
  portalMaterial.uniforms.uPulse.value = pulse;
  haloMaterial.uniforms.uTime.value = elapsed * 0.86 + 17.0;
  haloMaterial.uniforms.uStrength.value = strength;
  haloMaterial.uniforms.uPulse.value = 0.78 + Math.sin(elapsed * 3.1) * 0.08;
  depthMaterial.uniforms.uTime.value = elapsed * 0.72 + 41.0;
  depthMaterial.uniforms.uStrength.value = strength;
  depthMaterial.uniforms.uPulse.value = 0.86 + Math.sin(elapsed * 2.3 + 1.2) * 0.08;
  particleMaterial.opacity = strength * 0.92;
  lightningMaterial.opacity = strength * (0.28 + Math.max(0, Math.sin(elapsed * 19.0)) * 0.72);
  coreLight.intensity = strength * (42 + Math.max(0, Math.sin(elapsed * 5.2)) * 13);
  archLight.intensity = strength * (24 + Math.max(0, Math.sin(elapsed * 4.1 + 0.8)) * 8);
  groundLight.intensity = strength * (20 + Math.max(0, Math.sin(elapsed * 3.7 + 1.4)) * 7);
  for (const material of reflectedLightMaterials) {
    material.opacity = strength * (0.24 + Math.max(0, Math.sin(elapsed * 4.4)) * 0.1);
  }

  const particles = portal.children.find((child): child is THREE.Points => child instanceof THREE.Points);
  const positionAttribute = particles?.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  const particleSeeds = portal.userData.particleSeeds as number[];
  if (positionAttribute) {
    for (let i = 0; i < positionAttribute.count; i += 1) {
      const seed = particleSeeds[i] ?? 0;
      const orbit = elapsed * (0.34 + seed * 0.72) + seed * Math.PI * 2;
      const band = 0.18 + ((seed * 7.19 + elapsed * 0.04) % 1) * 0.8;
      const rx = 21.2 * band;
      const ry = 36.4 * band;
      const jitter = Math.sin(elapsed * 9.2 + seed * 40) * 0.55;
      positionAttribute.setXYZ(
        i,
        Math.cos(orbit) * rx + Math.sin(elapsed * 2.3 + seed * 19) * 0.8,
        39.5 + Math.sin(orbit) * ry + jitter,
        Math.sin(elapsed * 6.1 + seed * 33) * 1.35
      );
    }
    positionAttribute.needsUpdate = true;
  }

  const lightningTick = Math.floor(elapsed * 8);
  if (portal.userData.lastLightningTick !== lightningTick) {
    portal.userData.lastLightningTick = lightningTick;
    const lightningPositions = portal.userData.lightningPositions as Float32Array;
    const attribute = portal.userData.lightningAttribute as THREE.BufferAttribute;
    for (let i = 0; i < lightningPositions.length; i += 6) {
      const seed = seededNoise(lightningTick + i, 5.41);
      const angle = seed * Math.PI * 2;
      const inner = 0.18 + seededNoise(lightningTick + i, 8.9) * 0.45;
      const outer = 0.66 + seededNoise(lightningTick + i, 2.2) * 0.3;
      const bend = (seededNoise(lightningTick + i, 11.8) - 0.5) * 0.24;
      lightningPositions[i] = Math.cos(angle) * 21.5 * inner;
      lightningPositions[i + 1] = 39.5 + Math.sin(angle) * 36.5 * inner;
      lightningPositions[i + 2] = 0.9 + seededNoise(lightningTick + i, 4.4) * 1.2;
      lightningPositions[i + 3] = Math.cos(angle + bend) * 21.5 * outer;
      lightningPositions[i + 4] = 39.5 + Math.sin(angle + bend) * 36.5 * outer;
      lightningPositions[i + 5] = 0.9 + seededNoise(lightningTick + i, 6.6) * 1.2;
    }
    attribute.needsUpdate = true;
  }
}

function createGarage() {
  const group = new THREE.Group();
  group.add(foundation(7.1, 5.2));
  const body = box(6.2, 2.8, 4.4, mat(0x6f675d, 0.86, 0.08));
  body.position.y = 1.6;
  const door = box(3.4, 1.7, 0.08, mat(0x191a1a, 0.55, 0.45));
  door.position.set(0, 1.2, -2.24);
  const lamp = box(0.36, 0.18, 0.1, mat(0x66d9ff, 0.35, 0.2, 0x66d9ff));
  lamp.position.set(2.2, 2.55, -2.28);
  group.add(body, door, lamp);
  return group;
}

function createNumberedFacility(mark: string, accent: number, variant: "lab" | "depot" | "clinic") {
  const group = new THREE.Group();
  const hull = mat(0xd8d0c0, 0.62, 0.12);
  const dark = mat(0x22201e, 0.72, 0.28);
  const trim = mat(0x8b5234, 0.84, 0.06);
  const accentMat = mat(accent, 0.3, 0.24, accent);
  const glass = mat(0x66d9ff, 0.25, 0.36, 0x238db1);

  group.add(foundation(7.6, 5.6));

  const body = box(6.7, 2.7, 4.7, hull);
  body.position.y = 1.52;
  const roof = box(7.1, 0.32, 5.0, trim);
  roof.position.y = 3.05;
  const baseSkirt = box(7.4, 0.34, 5.3, trim);
  baseSkirt.position.y = 0.24;
  const door = box(1.05, 1.55, 0.08, dark);
  door.position.set(-2.15, 1.05, -2.4);
  const doorGlow = box(0.18, 0.14, 0.1, accentMat);
  doorGlow.position.set(-1.45, 1.58, -2.46);
  group.add(body, roof, baseSkirt, door, doorGlow);

  for (const x of [-0.5, 1.15, 2.45]) {
    const window = box(0.74, 0.44, 0.075, glass);
    window.position.set(x, 1.75, -2.43);
    group.add(window);
  }

  for (const x of [-3.25, 3.25]) {
    for (const z of [-2.25, 2.25]) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.58, 6), dark);
      foot.position.set(x, 0.16, z);
      foot.castShadow = true;
      group.add(foot);
    }
  }

  const roofPipeA = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 4.6, 8), dark);
  roofPipeA.rotation.x = Math.PI / 2;
  roofPipeA.position.set(-2.65, 3.42, 0);
  roofPipeA.castShadow = true;
  const roofBox = box(1.1, 0.42, 0.8, dark);
  roofBox.position.set(0.2, 3.45, 1.52);
  const beacon = box(0.22, 0.16, 0.22, accentMat);
  beacon.position.set(-2.88, 3.52, -2.02);
  group.add(roofPipeA, roofBox, beacon);

  const sign = createTextPlate(mark, accentMat);
  sign.position.set(1.85, 2.48, -2.48);
  sign.scale.setScalar(0.92);
  group.add(sign);

  if (variant === "lab") {
    const sensorMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6), dark);
    sensorMast.position.set(2.5, 4.3, 1.55);
    sensorMast.castShadow = true;
    const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), accentMat);
    sensor.position.set(2.5, 5.72, 1.55);
    sensor.castShadow = true;
    const sidePanel = box(1.2, 0.12, 1.4, glass);
    sidePanel.rotation.x = -0.42;
    sidePanel.position.set(-2.35, 3.38, 1.62);
    group.add(sensorMast, sensor, sidePanel);
  } else if (variant === "depot") {
    for (const x of [-2.2, -0.65, 0.9]) {
      const crate = box(1.2, 0.74, 1.1, mat(0x9c7446, 0.88, 0.06));
      crate.position.set(x, 0.5, 2.7);
      group.add(crate);
    }
    const loadingRail = box(5.2, 0.16, 0.18, dark);
    loadingRail.position.set(0, 0.62, 3.35);
    const canopy = box(3.8, 0.12, 1.1, trim);
    canopy.position.set(-0.72, 2.42, -2.92);
    canopy.rotation.x = -0.16;
    group.add(loadingRail, canopy);
  } else {
    const sidePod = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 3.2, 12), hull);
    sidePod.rotation.z = Math.PI / 2;
    sidePod.position.set(0.85, 1.58, 2.45);
    sidePod.castShadow = true;
    sidePod.receiveShadow = true;
    const crossA = box(1.04, 0.18, 0.08, accentMat);
    crossA.position.set(1.85, 2.42, -2.5);
    const crossB = box(0.18, 1.04, 0.08, accentMat);
    crossB.position.copy(crossA.position);
    const oxygenBottleA = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.1, 8), accentMat);
    oxygenBottleA.position.set(-2.86, 1.05, 2.22);
    oxygenBottleA.castShadow = true;
    const oxygenBottleB = oxygenBottleA.clone();
    oxygenBottleB.position.x = -2.42;
    group.add(sidePod, crossA, crossB, oxygenBottleA, oxygenBottleB);
  }

  return group;
}

function createCommTower(flickerLights: THREE.PointLight[]) {
  const group = new THREE.Group();
  const metal = mat(0xb8b2a6, 0.42, 0.66);
  const dark = mat(0x2a2521, 0.72, 0.24);
  const warm = mat(0x9a5c36, 0.86, 0.06);
  const glass = mat(0x66d9ff, 0.28, 0.34, 0x238db1);
  const red = mat(0xff4e2e, 0.36, 0.16, 0xff2b12);

  group.add(foundation(3.9, 3.5, warm));

  const equipment = box(2.8, 1.05, 2.45, dark);
  equipment.position.y = 0.62;
  const door = box(0.68, 0.72, 0.08, mat(0x171514, 0.72, 0.22));
  door.position.set(-0.72, 0.6, -1.25);
  const doorTrim = box(0.88, 0.92, 0.07, warm);
  doorTrim.position.set(-0.72, 0.68, -1.29);
  const status = box(0.42, 0.18, 0.08, glass);
  status.position.set(0.72, 0.88, -1.29);
  group.add(equipment, doorTrim, door, status);

  const legPoints = [
    new THREE.Vector3(-0.9, 1.05, -0.72),
    new THREE.Vector3(0.9, 1.05, -0.72),
    new THREE.Vector3(-0.72, 1.05, 0.72),
    new THREE.Vector3(0.72, 1.05, 0.72),
  ];
  const topPoints = [
    new THREE.Vector3(-0.46, 7.0, -0.36),
    new THREE.Vector3(0.46, 7.0, -0.36),
    new THREE.Vector3(-0.36, 7.0, 0.36),
    new THREE.Vector3(0.36, 7.0, 0.36),
  ];

  for (let i = 0; i < 4; i += 1) {
    group.add(cylinderBetween(legPoints[i], topPoints[i], 0.045, metal));
  }

  for (const y of [2.45, 3.9, 5.35, 6.65]) {
    const width = THREE.MathUtils.lerp(1.7, 0.78, (y - 1.05) / 5.95);
    const depth = THREE.MathUtils.lerp(1.36, 0.68, (y - 1.05) / 5.95);
    const front = new THREE.Vector3(0, y, -depth / 2);
    const back = new THREE.Vector3(0, y, depth / 2);
    const left = new THREE.Vector3(-width / 2, y, 0);
    const right = new THREE.Vector3(width / 2, y, 0);
    group.add(cylinderBetween(new THREE.Vector3(-width / 2, y, -depth / 2), new THREE.Vector3(width / 2, y, -depth / 2), 0.035, metal));
    group.add(cylinderBetween(new THREE.Vector3(-width / 2, y, depth / 2), new THREE.Vector3(width / 2, y, depth / 2), 0.035, metal));
    group.add(cylinderBetween(left, front, 0.032, metal));
    group.add(cylinderBetween(right, back, 0.032, metal));
    group.add(cylinderBetween(left, back, 0.032, metal));
    group.add(cylinderBetween(right, front, 0.032, metal));
  }

  const platform = box(1.55, 0.16, 1.28, dark);
  platform.position.y = 7.12;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.85, 8), metal);
  neck.position.y = 7.65;
  neck.castShadow = true;

  const dishMount = new THREE.Group();
  dishMount.position.set(0.2, 8.1, -0.14);
  dishMount.rotation.x = -0.18;
  dishMount.rotation.y = 0.32;
  const dishMaterial = mat(0xb8b2a6, 0.38, 0.72);
  dishMaterial.side = THREE.DoubleSide;
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 0.28, 0.42, 28, 1, true), dishMaterial);
  dish.rotation.x = Math.PI / 2;
  dish.castShadow = true;
  dish.receiveShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.045, 6, 28), metal);
  rim.rotation.x = Math.PI / 2;
  rim.position.z = -0.21;
  rim.castShadow = true;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.16, 12), dark);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.24;
  hub.castShadow = true;
  const feedArm = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 1.15, 6), dark);
  feedArm.rotation.x = Math.PI / 2;
  feedArm.position.z = -0.62;
  feedArm.castShadow = true;
  const receiver = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.24, 8), glass);
  receiver.rotation.x = -Math.PI / 2;
  receiver.position.z = -1.18;
  receiver.castShadow = true;
  dishMount.add(dish, rim, hub, feedArm, receiver);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.05, 6), metal);
  antenna.position.set(0, 9.1, 0);
  antenna.castShadow = true;
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), red);
  beacon.position.set(0, 9.72, 0);
  beacon.castShadow = true;
  const light = new THREE.PointLight(0xff5533, 2.1, 20);
  light.position.copy(beacon.position);
  flickerLights.push(light);

  group.add(platform, neck, dishMount, antenna, beacon, light);
  return group;
}

function cylinderBetween(from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material) {
  const direction = to.clone().sub(from);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 6), material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createSolarArray(x: number, z: number, rotationY: number, parent: THREE.Group) {
  const group = new THREE.Group();
  placeObjectOnPlanet(group, x, z, 0, rotationY);
  const panelMat = mat(0x15232b, 0.34, 0.42, 0x0a2536);
  const frameMat = mat(0xc2b8aa, 0.4, 0.48);
  const trackers: THREE.Object3D[] = [];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const panel = box(1.7, 0.08, 2.1, panelMat);
      panel.position.set((col - 2.5) * 1.9, 1.35, (row - 1.5) * 2.28);
      panel.rotation.x = -0.45;
      trackers.push(panel);
      const anchor = box(0.26, 0.08, 0.26, frameMat);
      anchor.position.set(panel.position.x, 0.04, panel.position.z + 0.3);
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.82, 6), frameMat);
      stand.position.set(panel.position.x, 0.44, panel.position.z + 0.3);
      stand.castShadow = true;
      group.add(anchor, panel, stand);
    }
  }
  group.userData.trackers = trackers;
  parent.add(group);
  return group;
}

function createPipes(parent: THREE.Group) {
  const pipeMat = mat(0x8c7f72, 0.48, 0.54);
  const runs = [
    [planetSurfacePoint(spread(24), spread(18), 0.28), planetSurfacePoint(spread(0), spread(18), 0.28)],
    [planetSurfacePoint(spread(24), spread(-16), 0.28), planetSurfacePoint(spread(0), spread(18), 0.28)],
    [planetSurfacePoint(spread(-24), spread(18), 0.28), planetSurfacePoint(spread(0), spread(18), 0.28)],
    [planetSurfacePoint(spread(132), spread(78), 0.28), planetSurfacePoint(spread(-22), spread(-16), 0.28)],
    [planetSurfacePoint(spread(14), spread(52), 0.28), planetSurfacePoint(spread(-24), spread(18), 0.28)],
  ];
  for (const [from, to] of runs) {
    const mid = from.clone().lerp(to, 0.5);
    const distance = from.distanceTo(to);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, distance, 8), pipeMat);
    pipe.position.copy(mid);
    pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    pipe.castShadow = true;
    parent.add(pipe);
  }
}

function createRovers(
  parent: THREE.Group,
  rovers: THREE.Group[],
  colliders: CircleCollider[],
  landmarks: Landmark[],
  maintenanceBots: MaintenanceBotConfig[]
) {
  const configs = [
    { centerX: 0, centerZ: 0, patrolRadius: 0, speed: VEHICLE_LOOP_SPEED, offset: 0.25, size: 1.08, kind: "rover", route: "greatCircleLoop", routeHeading: VEHICLE_LOOP_HEADING, label: "01 车辆 电动巡检车" },
    { centerX: 0, centerZ: 0, patrolRadius: 0, speed: VEHICLE_LOOP_SPEED, offset: 0.25 + Math.PI, size: 1.08, kind: "cargo", route: "greatCircleLoop", routeHeading: VEHICLE_LOOP_HEADING, label: "02 车辆 运输车" },
    ...maintenanceBots,
  ];
  configs.forEach((config) => {
    const rover = config.kind === "bot" ? createUtilityBot(config.size) : createRover(config.size);
    const userData: Record<string, unknown> = { ...config };
    if (config.kind === "bot" && "patrolPoints" in config) {
      const safePatrolPoints = buildSafeBotPatrolPoints(config.patrolPoints, colliders);
      userData.patrolPoints = safePatrolPoints;
      userData.centerX = safePatrolPoints[0]?.x ?? config.centerX;
      userData.centerZ = safePatrolPoints[0]?.z ?? config.centerZ;
    }
    rover.userData = { ...rover.userData, ...userData, dynamicMap: true };
    rovers.push(rover);
    landmarks.push(landmark(config.label, rover, 0, 0, config.kind === "bot" ? 24 : 32, 140));
    colliders.push({
      center: new THREE.Vector2(),
      radius: config.kind === "bot" ? 0.62 * config.size : 1.85 * config.size,
      label: config.label,
      dynamicObject: rover,
    });
    parent.add(rover);
  });
}

function addNasaPerseveranceRover(parent: THREE.Group, colliders: CircleCollider[], landmarks: Landmark[]) {
  const x = expandWorldCoordinate(-200);
  const z = expandWorldCoordinate(0);
  const yaw = 1.08;
  const rover = createPerseveranceRover(0.82);
  rover.userData.dynamicMap = true;
  rover.userData.planetX = x;
  rover.userData.planetZ = z;
  placeObjectOnPlanet(rover, x, z, -0.16, yaw);
  parent.add(rover);
  landmarks.push(landmark("NASA 机遇号火星车遗迹 / Meridiani Planum", rover, x, z, 30, 190));
  colliders.push(circle(x, z, 2.2, "NASA 机遇号火星车遗迹"));
}

function createRover(size: number) {
  return createCybertruckRover(size);
}

function createPerseveranceRover(size: number) {
  const group = new THREE.Group();
  const bodyMat = mat(0xd7d0bf, 0.46, 0.24);
  const deckMat = mat(0x7a766f, 0.58, 0.18);
  const darkMat = mat(0x161718, 0.78, 0.22);
  const wheelMat = mat(0x3d3a35, 0.86, 0.12);
  const goldMat = mat(0xc59a4a, 0.42, 0.32);
  const cameraMat = mat(0x0d161b, 0.34, 0.36, 0x061923);

  const body = box(2.65 * size, 0.66 * size, 2.05 * size, bodyMat);
  body.position.set(0, 1.05 * size, 0);
  const topDeck = box(2.3 * size, 0.16 * size, 1.72 * size, deckMat);
  topDeck.position.set(0.05 * size, 1.45 * size, 0);
  const warmBox = box(0.72 * size, 0.42 * size, 0.78 * size, goldMat);
  warmBox.position.set(0.74 * size, 1.74 * size, -0.3 * size);
  const rearRtg = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * size, 0.28 * size, 1.08 * size, 10), darkMat);
  rearRtg.rotation.z = Math.PI / 2;
  rearRtg.position.set(1.62 * size, 1.1 * size, 0.04 * size);
  group.add(body, topDeck, warmBox, rearRtg);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * size, 0.055 * size, 1.15 * size, 8), darkMat);
  mast.position.set(-0.55 * size, 2.0 * size, -0.26 * size);
  const cameraHead = box(0.62 * size, 0.22 * size, 0.26 * size, cameraMat);
  cameraHead.position.set(-0.55 * size, 2.62 * size, -0.26 * size);
  const leftEye = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * size, 0.055 * size, 0.035 * size, 10), cameraMat);
  leftEye.rotation.x = Math.PI / 2;
  leftEye.position.set(-0.72 * size, 2.63 * size, -0.4 * size);
  const rightEye = leftEye.clone();
  rightEye.position.x = -0.38 * size;
  group.add(mast, cameraHead, leftEye, rightEye);

  const armRoot = new THREE.Vector3(-1.18 * size, 1.2 * size, 0.66 * size);
  const armElbow = new THREE.Vector3(-1.86 * size, 0.88 * size, 1.14 * size);
  const armTip = new THREE.Vector3(-2.24 * size, 0.58 * size, 1.54 * size);
  group.add(cylinderBetween(armRoot, armElbow, 0.045 * size, darkMat));
  group.add(cylinderBetween(armElbow, armTip, 0.04 * size, darkMat));
  const drill = box(0.16 * size, 0.16 * size, 0.28 * size, cameraMat);
  drill.position.copy(armTip);
  drill.rotation.y = 0.6;
  group.add(drill);

  const wheels: THREE.Mesh[] = [];
  for (const sx of [-1.18, 0, 1.18]) {
    for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * size, 0.32 * size, 0.28 * size, 16), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * size, 0.52 * size, side * 1.08 * size);
      wheel.castShadow = true;
      wheel.receiveShadow = true;
      wheels.push(wheel);
      const strutStart = new THREE.Vector3(sx * 0.82 * size, 0.98 * size, side * 0.72 * size);
      const strutEnd = wheel.position.clone();
      group.add(cylinderBetween(strutStart, strutEnd, 0.032 * size, darkMat));
      group.add(wheel);
    }
  }

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * size, 0.16 * size, 0.055 * size, 18), bodyMat);
  antenna.position.set(0.1 * size, 1.78 * size, 0.6 * size);
  antenna.rotation.x = 0.18;
  group.add(antenna);
  group.userData.wheels = wheels;
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}

function createCargoRover(size: number) {
  const group = new THREE.Group();
  const steel = mat(0xa69a8c, 0.34, 0.64);
  const dark = mat(0x141414, 0.72, 0.28);
  const glass = mat(0x101c22, 0.18, 0.52, 0x0b2e3a);
  const light = mat(0xf5f1df, 0.2, 0.2, 0xffe2a8);

  const sideProfile: Array<[number, number]> = [
    [-3.15, 0.52],
    [-2.74, 1.14],
    [-1.35, 2.12],
    [0.78, 2.02],
    [3.15, 1.47],
    [3.22, 0.62],
  ];
  const body = createSideProfilePrism(sideProfile, 2.24, steel, size);
  body.castShadow = true;
  body.receiveShadow = true;

  const lowerCladding = box(5.95 * size, 0.34 * size, 2.36 * size, dark);
  lowerCladding.position.set(0.05 * size, 0.62 * size, 0);
  const frontBumper = box(0.42 * size, 0.36 * size, 2.4 * size, dark);
  frontBumper.position.set(-3.06 * size, 0.58 * size, 0);
  frontBumper.rotation.z = 0.16;
  const rearBumper = box(0.5 * size, 0.3 * size, 2.35 * size, dark);
  rearBumper.position.set(3.05 * size, 0.58 * size, 0);

  const sideGlassL = box(3.42 * size, 0.42 * size, 0.055 * size, glass);
  sideGlassL.position.set(-0.52 * size, 1.72 * size, -1.15 * size);
  sideGlassL.rotation.z = -0.16;
  const sideGlassR = sideGlassL.clone();
  sideGlassR.position.z = 1.15 * size;
  const windshield = box(1.15 * size, 0.12 * size, 1.86 * size, glass);
  windshield.position.set(-1.82 * size, 1.76 * size, 0);
  windshield.rotation.z = -0.58;

  const frontLight = box(1.55 * size, 0.07 * size, 0.05 * size, light);
  frontLight.position.set(-3.22 * size, 1.03 * size, 0);
  frontLight.rotation.y = Math.PI / 2;
  const rearLight = box(1.42 * size, 0.06 * size, 0.05 * size, mat(0xff3d2f, 0.2, 0.18, 0xff3d2f));
  rearLight.position.set(3.28 * size, 1.02 * size, 0);
  rearLight.rotation.y = Math.PI / 2;

  const rockerL = box(5.3 * size, 0.16 * size, 0.16 * size, dark);
  rockerL.position.set(0, 0.74 * size, -1.18 * size);
  const rockerR = rockerL.clone();
  rockerR.position.z = 1.18 * size;
  group.add(body, lowerCladding, frontBumper, rearBumper, windshield, sideGlassL, sideGlassR, frontLight, rearLight, rockerL, rockerR);

  const hubMat = mat(0xbab3a7, 0.42, 0.58);
  for (const sx of [-1.9, 1.85]) {
    for (const sz of [-1.22, 1.22]) {
      const wheel = new THREE.Mesh(new THREE.DodecahedronGeometry(0.56 * size, 1), dark);
      wheel.scale.set(1, 0.72, 1);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(sx * size, 0.5 * size, sz * size);
      wheel.castShadow = true;
      wheel.receiveShadow = true;
      const arch = box(0.95 * size, 0.2 * size, 0.18 * size, dark);
      arch.position.set(sx * size, 0.98 * size, sz * size);
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.22 * size, 8, 6), hubMat);
      hub.position.copy(wheel.position);
      hub.position.z -= Math.sign(sz) * 0.12 * size;
      hub.castShadow = true;
      group.add(wheel, hub, arch);
    }
  }

  const sensor = box(0.34 * size, 0.16 * size, 0.26 * size, glass);
  sensor.position.set(-2.66 * size, 1.48 * size, 0);
  group.add(sensor);
  return group;
}

function createCybertruckRover(size: number) {
  const group = new THREE.Group();
  const steel = mat(0xbfc3c1, 0.24, 0.78);
  const dark = mat(0x090b0d, 0.68, 0.32);
  const glass = mat(0x071016, 0.18, 0.52, 0x0a2833);
  const light = mat(0xf8f0df, 0.18, 0.22, 0xffe9b0);
  const glassMaterial = glass as THREE.MeshStandardMaterial;
  glassMaterial.side = THREE.DoubleSide;

  const lowerBody = box(2.52 * size, 0.78 * size, 6.9 * size, steel);
  lowerBody.position.set(0, 0.74 * size, 0);

  const upperBody = createCybertruckPrism(
    [
      [-3.45, 1.1],
      [-1.28, 2.15],
      [3.45, 1.42],
      [3.45, 1.1],
    ],
    2.52,
    steel
  );
  upperBody.castShadow = true;
  upperBody.receiveShadow = true;

  const leftWindow = createCybertruckSidePanel(-1);
  const rightWindow = createCybertruckSidePanel(1);
  const frontLight = box(1.96 * size, 0.08 * size, 0.06 * size, light);
  frontLight.position.set(0, 1.06 * size, -3.48 * size);
  group.add(lowerBody, upperBody, leftWindow, rightWindow, frontLight);

  const wheels: THREE.Mesh[] = [];
  for (const sx of [-1.28, 1.28]) {
    for (const sz of [-2.18, 2.04]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.58 * size, 0.58 * size, 0.36 * size, 16), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * size, 0.36 * size, sz * size);
      wheel.castShadow = true;
      wheel.receiveShadow = true;
      wheels.push(wheel);
      group.add(wheel);
    }
  }

  group.userData.wheels = wheels;
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

  function createCybertruckSidePanel(side: -1 | 1) {
    const x = side * 1.28 * size;
    const vertices = [
      x,
      1.2 * size,
      -2.9 * size,
      x,
      1.92 * size,
      -1.28 * size,
      x,
      1.66 * size,
      1.6 * size,
      x,
      1.26 * size,
      2.06 * size,
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(side < 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
    geometry.computeVertexNormals();
    const panel = new THREE.Mesh(geometry, glass);
    panel.castShadow = true;
    return panel;
  }
}

function createCybertruckBody(points: Array<[number, number]>, width: number, material: THREE.Material, scale: number) {
  const base = createSideProfilePrism(points, width, material, scale);
  base.rotation.y = Math.PI / 2;
  return base;
}

function createSideProfilePrism(points: Array<[number, number]>, depth: number, material: THREE.Material, scale: number) {
  const halfDepth = (depth * scale) / 2;
  const vertices: number[] = [];
  for (const z of [-halfDepth, halfDepth]) {
    for (const [x, y] of points) vertices.push(x * scale, y * scale, z);
  }
  const faces: number[] = [];
  for (let i = 1; i < points.length - 1; i += 1) faces.push(0, i, i + 1);
  const offset = points.length;
  for (let i = 1; i < points.length - 1; i += 1) faces.push(offset, offset + i + 1, offset + i);
  for (let i = 0; i < points.length; i += 1) {
    const next = (i + 1) % points.length;
    faces.push(i, next, offset + next, i, offset + next, offset + i);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function createUtilityBot(size: number) {
  const group = new THREE.Group();
  const steel = mat(0xc9c4b8, 0.36, 0.72);
  const shadedSteel = mat(0x8f938f, 0.42, 0.68);
  const brightSteel = mat(0xe2ded3, 0.28, 0.76);
  const walkParts: {
    leftArm: THREE.Object3D[];
    rightArm: THREE.Object3D[];
    leftLeg: THREE.Object3D[];
    rightLeg: THREE.Object3D[];
  } = { leftArm: [], rightArm: [], leftLeg: [], rightLeg: [] };

  const pelvis = box(0.48 * size, 0.18 * size, 0.32 * size, shadedSteel);
  pelvis.position.y = 0.66 * size;
  const torso = box(0.62 * size, 0.76 * size, 0.42 * size, steel);
  torso.position.y = 1.12 * size;
  const chest = box(0.5 * size, 0.36 * size, 0.04 * size, shadedSteel);
  chest.position.set(0, 1.15 * size, -0.23 * size);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * size, 0.12 * size, 0.12 * size, 8), shadedSteel);
  neck.position.y = 1.58 * size;
  const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32 * size, 1), brightSteel);
  head.position.y = 1.86 * size;
  head.scale.set(1, 0.82, 0.9);
  const visor = box(0.36 * size, 0.1 * size, 0.035 * size, shadedSteel);
  visor.position.set(0, 1.85 * size, -0.28 * size);
  group.add(pelvis, torso, chest, neck, head, visor);

  for (const side of [-1, 1]) {
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
    group.add(shoulder, upperArm, forearm, hand);
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
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}

function createSkyDust() {
  const group = new THREE.Group();
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const colors: number[] = [];
  const starDirections: THREE.Vector3[] = [];
  const color = new THREE.Color();
  for (let i = 0; i < 3600; i += 1) {
    const shell = PLANET_RADIUS + 260 + Math.random() * 520;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    const direction = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).normalize();
    starDirections.push(direction);
    positions.push(direction.x * shell, direction.y * shell, direction.z * shell);
    const starType = Math.random();
    if (starType < 0.66) {
      color.setHSL(0.11, 0.08, 0.86 + Math.random() * 0.14);
    } else if (starType < 0.87) {
      color.setHSL(0.6, 0.42, 0.78 + Math.random() * 0.16);
    } else {
      color.setHSL(0.08, 0.62, 0.78 + Math.random() * 0.16);
    }
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const starField = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 1.85,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    })
  );
  group.add(starField);

  const selectedStars = pickMeteorStarIndexes(starDirections.length, 3);
  const starAttribute = geometry.getAttribute("position") as THREE.BufferAttribute;
  const colorAttribute = geometry.getAttribute("color") as THREE.BufferAttribute;
  const meteors = selectedStars.map((starIndex, index) => {
    const meteor = createMeteorFromStar(starDirections[starIndex], starAttribute, starIndex, index);
    colorAttribute.setXYZ(starIndex, 1, 0.9, 0.56);
    group.add(meteor.head, meteor.trail);
    return meteor;
  });
  colorAttribute.needsUpdate = true;

  return { object: group, meteors };
}

function pickMeteorStarIndexes(total: number, count: number) {
  const selected = new Set<number>();
  while (selected.size < count && selected.size < total) {
    selected.add(Math.floor(Math.random() * total));
  }
  return Array.from(selected);
}

function createMeteorFromStar(direction: THREE.Vector3, starAttribute: THREE.BufferAttribute, starIndex: number, order: number): Meteor {
  const randomA = seededNoise(starIndex, 17.13);
  const randomB = seededNoise(starIndex, 41.77);
  const randomC = seededNoise(starIndex, 89.31);
  const isCloseFlyby = order === 0;
  const flybyCenterDirection = isCloseFlyby ? CLOSE_METEOR_CENTER_NORMAL.clone() : direction.clone();
  const meteorColor = isCloseFlyby ? 0x5f5b55 : order === 1 ? 0x6f6d68 : 0x79746e;
  const headRadius = isCloseFlyby ? 13.2 : 0.62 + randomA * 0.32;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(headRadius, isCloseFlyby ? 24 : 14, isCloseFlyby ? 16 : 10),
    new THREE.MeshStandardMaterial({
      color: meteorColor,
      map: meteorRockTexture,
      bumpMap: meteorRockTexture,
      bumpScale: isCloseFlyby ? 0.16 : 0.08,
      roughness: 0.94,
      metalness: 0.03,
      transparent: !isCloseFlyby,
      opacity: isCloseFlyby ? 1 : 0.78 + randomB * 0.12,
    })
  );
  head.userData.meteorId = `meteor-${order + 1}`;
  head.userData.scaleGunKind = "meteor";
  head.userData.meteorScaleFactor = 1;
  head.rotation.set(randomA * Math.PI, randomB * Math.PI, randomC * Math.PI);
  head.castShadow = true;
  head.renderOrder = isCloseFlyby ? 5 : 3;

  const trail = new THREE.Group();
  const trailPuffs: THREE.Sprite[] = [];
  const puffCount = isCloseFlyby ? 0 : 7;
  for (let i = 0; i < puffCount; i += 1) {
    const t = i / Math.max(puffCount - 1, 1);
    const puff = new THREE.Sprite(new THREE.SpriteMaterial({
      map: getDustFogTexture(),
      color: isCloseFlyby ? 0x9fb6c5 : order === 1 ? 0x8e8075 : 0x9a7b68,
      transparent: true,
      opacity: (isCloseFlyby ? 0.22 : 0.18) * Math.pow(1 - t, isCloseFlyby ? 1.35 : 1.08),
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
    }));
    const scale = (isCloseFlyby ? 4.2 : 1.15) * (1.05 + t * (isCloseFlyby ? 2.45 : 2.65));
    puff.scale.set(scale, scale * (isCloseFlyby ? 0.82 : 0.72), scale);
    puff.userData.baseOpacity = puff.material.opacity;
    puff.renderOrder = isCloseFlyby ? 1 : 2;
    trailPuffs.push(puff);
    trail.add(puff);
  }
  const coma = new THREE.Sprite(new THREE.SpriteMaterial({
    map: getDustFogTexture(),
    color: isCloseFlyby ? 0x53cfff : 0x7c726b,
    transparent: true,
    opacity: isCloseFlyby ? 0 : 0.08,
    depthWrite: false,
    depthTest: !isCloseFlyby,
    blending: isCloseFlyby ? THREE.AdditiveBlending : THREE.NormalBlending,
  }));
  coma.scale.set(isCloseFlyby ? 24 : 1.8, isCloseFlyby ? 17 : 1.25, 1);
  coma.userData.baseOpacity = coma.material.opacity;
  coma.visible = !isCloseFlyby;
  coma.renderOrder = 2;
  trail.add(coma);
  trail.renderOrder = 2;

  const seed = new THREE.Vector3(Math.sin(starIndex * 12.9898), Math.cos(starIndex * 78.233), Math.sin(starIndex * 37.719)).normalize();
  let orbitAxis = flybyCenterDirection.clone().cross(seed);
  if (orbitAxis.lengthSq() < 0.0001) {
    orbitAxis = flybyCenterDirection.clone().cross(WORLD_UP);
  }
  if (orbitAxis.lengthSq() < 0.0001) {
    orbitAxis = flybyCenterDirection.clone().cross(new THREE.Vector3(1, 0, 0));
  }
  orbitAxis.normalize();
  const wobbleAxis = isCloseFlyby ? CLOSE_METEOR_WOBBLE_AXIS.clone() : orbitAxis.clone().cross(flybyCenterDirection).normalize();
  const flybyTangent = isCloseFlyby ? CLOSE_METEOR_FLYBY_TANGENT.clone() : orbitAxis.clone().cross(flybyCenterDirection).normalize();

  return {
    head,
    trail,
    starAttribute,
    starIndex,
    startDirection: flybyCenterDirection,
    orbitAxis,
    orbitMin: isCloseFlyby ? PLANET_RADIUS + CLOSE_METEOR_ORBIT_ALTITUDE : PLANET_RADIUS + 980 + randomA * 460,
    orbitMax: isCloseFlyby ? PLANET_RADIUS + CLOSE_METEOR_ORBIT_ALTITUDE : PLANET_RADIUS + 1460 + randomB * 820,
    orbitSpeed: (isCloseFlyby ? (Math.PI * 2) / CLOSE_METEOR_FLYBY_SECONDS : (Math.PI * 2) / (420 + randomC * 260)) * (order === 1 ? -1 : 1),
    phase: isCloseFlyby ? 0 : (randomA - 0.5) * 0.46,
    tailAngle: isCloseFlyby ? 0.12 : 0.035 + randomB * 0.055,
    tailLength: isCloseFlyby ? 195 : 18 + randomB * 24,
    wobbleAxis,
    wobbleSpeed: isCloseFlyby ? 0.08 : 0.27 + randomC * 0.42,
    wobbleAmount: isCloseFlyby ? 0.02 : 0.08 + randomA * 0.22,
    trailPuffs,
    trailComa: coma,
    closeFlyby: isCloseFlyby,
    flybyTangent,
  };
}

function seededNoise(seed: number, salt: number) {
  return THREE.MathUtils.clamp(Math.sin(seed * 12.9898 + salt) * 43758.5453 % 1, -1, 1) * 0.5 + 0.5;
}

function mapCoordinatesFromNormal(normal: THREE.Vector3) {
  const projectedY = Math.max(Math.abs(normal.y), 0.001);
  return {
    x: (normal.x / projectedY) * PLANET_RADIUS,
    z: (normal.z / projectedY) * PLANET_RADIUS,
  };
}

function normalOffset(base: THREE.Vector3, tangentA: THREE.Vector3, tangentB: THREE.Vector3, offsetA: number, offsetB: number) {
  return base
    .clone()
    .addScaledVector(tangentA, offsetA / PLANET_RADIUS)
    .addScaledVector(tangentB, offsetB / PLANET_RADIUS)
    .normalize();
}

function tangentBasis(normal: THREE.Vector3) {
  const tangentA = new THREE.Vector3(0, 1, 0).cross(normal);
  if (tangentA.lengthSq() < 0.000001) tangentA.set(1, 0, 0).cross(normal);
  tangentA.normalize();
  const tangentB = normal.clone().cross(tangentA).normalize();
  return { tangentA, tangentB };
}

function headingFromForward(normal: THREE.Vector3, forward: THREE.Vector3) {
  const base = new THREE.Quaternion().setFromUnitVectors(WORLD_UP, normal.clone().normalize());
  const localForward = forward.clone().normalize().applyQuaternion(base.invert());
  return Math.atan2(-localForward.x, -localForward.z);
}

function addRockField(scene: THREE.Object3D, colliders: CircleCollider[]) {
  const rockMat = mat(0x8d4228, 1);
  for (let i = 0; i < 95; i += 1) {
    const radius = spread(6 + Math.random() * 31);
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (isInsideVehicleRouteRockClearance(planetNormal(x, z, scratchNormal))) continue;
    if (Math.abs(x) < spread(30) && Math.abs(z) < spread(24) && Math.random() < 0.72) continue;
    const rockRadius = 0.35 + Math.random() * 1.15;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockRadius, 0), rockMat);
    placeObjectOnPlanet(rock, x, z, 0.15, Math.random() * Math.PI * 2);
    rock.rotateX(Math.random() * Math.PI);
    rock.rotateZ(Math.random() * Math.PI);
    rock.scale.y = 0.45 + Math.random() * 0.9;
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    colliders.push(circle(x, z, Math.max(0.42, rockRadius * 0.86), "红色岩石"));
  }
}

function addRockAtNormal(scene: THREE.Object3D, colliders: CircleCollider[], normal: THREE.Vector3, radius: number, label: string, dark = false) {
  void dark;
  if (isInsideVehicleRouteRockClearance(normal)) return;
  const rockMat = mat(0x8d4228, 1);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), rockMat);
  placeObjectOnPlanetNormal(rock, normal, 0.12, Math.random() * Math.PI * 2);
  rock.rotateX(Math.random() * Math.PI);
  rock.rotateZ(Math.random() * Math.PI);
  rock.scale.y = 0.48 + Math.random() * 1.15;
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
  colliders.push({
    center: new THREE.Vector2(),
    normal: normal.clone(),
    radius: Math.max(0.42, radius * 0.86),
    label,
  });
}

function addDarkSideRockField(scene: THREE.Object3D, colliders: CircleCollider[]) {
  const { tangentA, tangentB } = tangentBasis(SPIDER_ARRIVAL_NORMAL);
  for (let i = 0; i < 32; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 24 + Math.random() * 58;
    const normal = normalOffset(SPIDER_ARRIVAL_NORMAL, tangentA, tangentB, Math.cos(angle) * distance, Math.sin(angle) * distance);
    addRockAtNormal(scene, colliders, normal, 0.42 + Math.random() * 1.55, "红色岩石");
  }
  for (let i = 0; i < 46; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 46 + Math.random() * 84;
    const normal = normalOffset(SPIDER_ARRIVAL_NORMAL, tangentA, tangentB, Math.cos(angle) * distance, Math.sin(angle) * distance);
    addRockAtNormal(scene, colliders, normal, 0.32 + Math.random() * 1.15, "红色岩石");
  }
}

function createDarkSpider(index: number): DarkSpider {
  const group = new THREE.Group();
  group.name = `Dark-side spider ${index + 1}`;
  const visual = new THREE.Group();
  group.add(visual);

  const shell = mat(0x111317, 0.76, 0.12, 0x05050a);
  const abdomenMat = mat(0x1f1726, 0.68, 0.08, 0x120a22);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x8cff66, toneMapped: false });
  const glowDotMat = new THREE.MeshBasicMaterial({ color: 0x6eff5f, toneMapped: false });
  const legMat = mat(0x17191d, 0.82, 0.08);

  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), shell);
  body.position.y = 0.92;
  body.scale.set(0.9, 0.46, 1.25);
  body.castShadow = true;
  visual.add(body);

  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), abdomenMat);
  abdomen.position.set(0, 0.84, 0.92);
  abdomen.scale.set(1.04, 0.56, 1.34);
  abdomen.castShadow = true;
  visual.add(abdomen);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i += 1) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.076, 8, 5), eyeMat);
      eye.position.set(side * (0.16 + i * 0.1), 1.075 + i * 0.015, -1.07);
      visual.add(eye);
    }
  }

  const abdomenDots = [
    [0, 1.25, 1.18, 0.072],
    [-0.24, 1.18, 1.04, 0.058],
    [0.24, 1.18, 1.04, 0.058],
    [-0.34, 1.08, 1.32, 0.052],
    [0.34, 1.08, 1.32, 0.052],
    [-0.15, 1.1, 1.54, 0.05],
    [0.15, 1.1, 1.54, 0.05],
  ] as const;
  abdomenDots.forEach(([x, y, z, radius]) => {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 5), glowDotMat);
    dot.position.set(x, y, z);
    visual.add(dot);
  });

  const legs: THREE.Group[] = [];
  const zSlots = [-0.78, -0.28, 0.28, 0.78];
  for (const side of [-1, 1]) {
    for (const z of zSlots) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.54, 0.78, z);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.1, 6), legMat);
      upper.rotation.z = side * 1.08;
      upper.position.set(side * 0.38, -0.16, 0);
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.044, 1.05, 6), legMat);
      lower.rotation.z = side * 0.72;
      lower.position.set(side * 0.94, -0.53, 0);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), legMat);
      foot.position.set(side * 1.42, -0.95, 0);
      leg.add(upper, lower, foot);
      visual.add(leg);
      legs.push(leg);
    }
  }

  const { tangentA, tangentB } = tangentBasis(ANCIENT_TREE_ARCH_NORMAL);
  const angle = (index / 3) * Math.PI * 2 + 0.45;
  const homeDistance = 12 + index * 7;
  const homeNormal = normalOffset(ANCIENT_TREE_ARCH_NORMAL, tangentA, tangentB, Math.cos(angle) * homeDistance, Math.sin(angle) * homeDistance);
  const forward = tangentA.clone().applyAxisAngle(homeNormal, angle).projectOnPlane(homeNormal).normalize();
  group.scale.setScalar(1.15);
  return {
    group,
    visual,
    legs,
    normal: homeNormal.clone(),
    homeNormal,
    forward,
    tangentA: tangentA.clone(),
    tangentB: tangentB.clone(),
    phase: index * 1.9,
    radius: 14 + index * 5,
    speed: 1.75 + index * 0.22,
  };
}

export function updateDarkSpiders(
  spiders: DarkSpider[],
  elapsed: number,
  delta: number,
  colliders: CircleCollider[] = [],
  sunPosition?: THREE.Vector3 | null,
  lightThreat?: SpiderLightThreat | null,
) {
  const sunDirection = sunPosition && sunPosition.lengthSq() > 0.000001 ? sunPosition.clone().normalize() : null;
  const lightThreatNormal = lightThreat && lightThreat.radius > 0 ? lightThreat.position.clone().normalize() : null;
  for (const spider of spiders) {
    const lit = sunDirection ? spider.normal.dot(sunDirection) > -0.02 : false;
    spider.homeNormal.copy(spiderDarkActivityCenter(spider, sunDirection));
    const orbitSpeed = lit ? 0.34 : 0.22;
    const orbitA = Math.cos(elapsed * orbitSpeed + spider.phase) * spider.radius + Math.sin(elapsed * 0.67 + spider.phase) * 3.2;
    const orbitB = Math.sin(elapsed * (orbitSpeed * 1.12) + spider.phase * 0.7) * spider.radius * 0.62 + Math.cos(elapsed * 0.51 + spider.phase * 1.3) * 2.4;
    const patrolNormal = keepSpiderInShade(normalOffset(spider.homeNormal, spider.tangentA, spider.tangentB, orbitA, orbitB), sunDirection);
    const shelterNormal = keepSpiderInShade(spider.homeNormal, sunDirection);
    let desiredNormal = lit ? shelterNormal : patrolNormal;
    let avoidingLaser = false;
    if (lightThreat && lightThreatNormal) {
      const lightDot = THREE.MathUtils.clamp(spider.normal.dot(lightThreatNormal), -1, 1);
      const lightDistance = Math.acos(lightDot) * PLANET_RADIUS;
      if (lightDistance < lightThreat.radius) {
        avoidingLaser = true;
        const urgency = 1 - THREE.MathUtils.smoothstep(lightDistance, 0, lightThreat.radius);
        let away = spider.normal.clone().addScaledVector(lightThreatNormal, -lightDot);
        if (away.lengthSq() < 0.000001) {
          away = spider.normal.clone().addScaledVector(SPIDER_ARRIVAL_NORMAL, -spider.normal.dot(SPIDER_ARRIVAL_NORMAL));
        }
        if (away.lengthSq() > 0.000001) {
          away.normalize();
          const retreatMeters = (10 + (lightThreat.strength ?? 1) * 10) * (0.35 + urgency);
          desiredNormal = spider.normal.clone().addScaledVector(away, retreatMeters / PLANET_RADIUS).normalize();
          desiredNormal.lerp(shelterNormal, 0.45 + urgency * 0.32).normalize();
        } else {
          desiredNormal = shelterNormal;
        }
      }
    }
    const targetNormal = avoidSpiderObstacles(constrainSpiderTerritory(desiredNormal), colliders, SPIDER_BODY_RADIUS + 0.35);
    const dot = THREE.MathUtils.clamp(spider.normal.dot(targetNormal), -1, 1);
    const tangent = targetNormal.clone().addScaledVector(spider.normal, -dot);
    const distance = Math.acos(dot);
    let moving = false;
    if (tangent.lengthSq() > 0.000001 && distance > 0.00002) {
      tangent.normalize();
      const speedScale = avoidingLaser ? 2.05 : lit ? 1.45 : 1;
      const step = Math.min((spider.speed * speedScale * delta) / PLANET_RADIUS, distance);
      spider.normal.multiplyScalar(Math.cos(step)).addScaledVector(tangent, Math.sin(step)).normalize();
      spider.forward.lerp(tangent, 0.08).projectOnPlane(spider.normal).normalize();
      moving = step > 0.000001;
    }
    const collisionState = resolveSpiderObstacleContact(spider.normal, colliders, SPIDER_BODY_RADIUS);
    spider.normal.copy(collisionState.normal);
    spider.forward.projectOnPlane(spider.normal).normalize();

    const legWave = elapsed * (moving ? (avoidingLaser ? 11.5 : lit ? 8.4 : 6.8) : 1.6) + spider.phase;
    const climbLift = collisionState.climbHeight;
    for (let i = 0; i < spider.legs.length; i += 1) {
      const leg = spider.legs[i];
      const side = i < 4 ? -1 : 1;
      const slot = i % 4;
      const tripodPhase = (side < 0 ? slot % 2 : 1 - (slot % 2)) * Math.PI;
      const phase = legWave + tripodPhase + slot * 0.18;
      const stride = moving ? 1 : 0.18;
      const lift = Math.max(0, Math.sin(phase)) * (0.34 + climbLift * 0.12) * stride;
      const reach = Math.cos(phase) * (0.34 + climbLift * 0.08) * stride;
      const stance = [-0.34, -0.12, 0.12, 0.34][slot] ?? 0;
      leg.rotation.x = stance + reach;
      leg.rotation.y = side * (0.18 + lift * 0.58);
      leg.rotation.z = side * (0.28 + Math.sin(phase + 0.7) * 0.18 * stride + climbLift * 0.06);
    }
    spider.visual.position.y = Math.max(0.02, Math.sin(legWave * 2.0) * 0.035) + climbLift * 0.16;
    spider.visual.rotation.x = Math.sin(legWave + spider.phase) * (moving ? 0.055 : 0.018) + climbLift * 0.02;
    spider.visual.rotation.z = Math.sin(legWave * 0.72 + spider.phase) * (moving ? 0.075 : 0.025);
    placeObjectOnPlanetNormal(spider.group, spider.normal, 0.34 + climbLift, headingFromForward(spider.normal, spider.forward));
  }
}

function constrainSpiderTerritory(normal: THREE.Vector3) {
  const dot = THREE.MathUtils.clamp(ANCIENT_TREE_ARCH_NORMAL.dot(normal), -1, 1);
  const distance = Math.acos(dot) * PLANET_RADIUS;
  if (distance <= SPIDER_PATROL_RADIUS) return normal.clone();
  const tangent = normal.clone().addScaledVector(ANCIENT_TREE_ARCH_NORMAL, -dot);
  if (tangent.lengthSq() < 0.000001) return ANCIENT_TREE_ARCH_NORMAL.clone();
  tangent.normalize();
  return ANCIENT_TREE_ARCH_NORMAL.clone().multiplyScalar(Math.cos(SPIDER_PATROL_RADIUS / PLANET_RADIUS)).addScaledVector(tangent, Math.sin(SPIDER_PATROL_RADIUS / PLANET_RADIUS)).normalize();
}

function spiderDarkActivityCenter(spider: DarkSpider, sunDirection: THREE.Vector3 | null) {
  const { tangentA, tangentB } = tangentBasis(ANCIENT_TREE_ARCH_NORMAL);
  let darkVector = CRASHED_SHIP_SITE_NORMAL
    .clone()
    .addScaledVector(ANCIENT_TREE_ARCH_NORMAL, -CRASHED_SHIP_SITE_NORMAL.dot(ANCIENT_TREE_ARCH_NORMAL));
  if (sunDirection) {
    const sunTangent = sunDirection.clone().addScaledVector(ANCIENT_TREE_ARCH_NORMAL, -sunDirection.dot(ANCIENT_TREE_ARCH_NORMAL));
    if (sunTangent.lengthSq() > 0.000001) darkVector = sunTangent.multiplyScalar(-1);
  }
  if (darkVector.lengthSq() < 0.000001) darkVector = tangentA.clone();
  darkVector.normalize();
  const baseAngle = Math.atan2(darkVector.dot(tangentB), darkVector.dot(tangentA));
  const phaseSpread = ((spider.phase / 1.9) - 1) * SPIDER_DARK_SPREAD_ANGLE;
  for (const distance of [SPIDER_DARK_RING_DISTANCE, SPIDER_DARK_RING_DISTANCE + 12, SPIDER_DARK_RING_DISTANCE + 22]) {
    const angle = baseAngle + phaseSpread;
    const candidate = normalOffset(ANCIENT_TREE_ARCH_NORMAL, tangentA, tangentB, Math.cos(angle) * distance, Math.sin(angle) * distance);
    if (!sunDirection || candidate.dot(sunDirection) < -0.035) return candidate;
  }
  const fallback = normalOffset(
    ANCIENT_TREE_ARCH_NORMAL,
    tangentA,
    tangentB,
    Math.cos(baseAngle + phaseSpread) * (SPIDER_DARK_RING_DISTANCE + 28),
    Math.sin(baseAngle + phaseSpread) * (SPIDER_DARK_RING_DISTANCE + 28)
  );
  return fallback;
}

function keepSpiderInShade(normal: THREE.Vector3, sunDirection: THREE.Vector3 | null) {
  const constrained = constrainSpiderTerritory(normal);
  if (!sunDirection || constrained.dot(sunDirection) < -0.015) return constrained;
  const { tangentA, tangentB } = tangentBasis(ANCIENT_TREE_ARCH_NORMAL);
  const sunTangent = sunDirection.clone().addScaledVector(ANCIENT_TREE_ARCH_NORMAL, -sunDirection.dot(ANCIENT_TREE_ARCH_NORMAL));
  if (sunTangent.lengthSq() < 0.000001) return constrained;
  const darkVector = sunTangent.normalize().multiplyScalar(-1);
  const angle = Math.atan2(darkVector.dot(tangentB), darkVector.dot(tangentA));
  return normalOffset(ANCIENT_TREE_ARCH_NORMAL, tangentA, tangentB, Math.cos(angle) * (SPIDER_DARK_RING_DISTANCE + 16), Math.sin(angle) * (SPIDER_DARK_RING_DISTANCE + 16));
}

function avoidSpiderObstacles(normal: THREE.Vector3, colliders: CircleCollider[], spiderRadius: number) {
  const adjusted = normal.clone();
  for (const collider of colliders) {
    if (collider.dynamicObject || isSpiderClimbableCollider(collider)) continue;
    if (collider.enabled && !collider.enabled()) continue;
    const colliderNormal = colliderSurfaceNormal(collider);
    const dot = THREE.MathUtils.clamp(adjusted.dot(colliderNormal), -1, 1);
    const distance = Math.acos(dot) * PLANET_RADIUS;
    const steerDistance = collider.radius + spiderRadius + 8;
    if (distance >= steerDistance) continue;
    const away = adjusted.clone().addScaledVector(colliderNormal, -dot);
    if (away.lengthSq() < 0.000001) continue;
    away.normalize();
    const urgency = 1 - THREE.MathUtils.smoothstep(distance, collider.radius + spiderRadius, steerDistance);
    adjusted.addScaledVector(away, ((steerDistance - distance) / PLANET_RADIUS) * urgency * 0.85).normalize();
  }
  return constrainSpiderTerritory(adjusted);
}

function resolveSpiderObstacleContact(normal: THREE.Vector3, colliders: CircleCollider[], spiderRadius: number) {
  const adjusted = normal.clone();
  let climbHeight = 0;
  for (let pass = 0; pass < 3; pass += 1) {
    for (const collider of colliders) {
      if (collider.dynamicObject) continue;
      if (collider.enabled && !collider.enabled()) continue;
      const colliderNormal = colliderSurfaceNormal(collider);
      const dot = THREE.MathUtils.clamp(adjusted.dot(colliderNormal), -1, 1);
      const distance = Math.acos(dot) * PLANET_RADIUS;
      const minDistance = collider.radius + spiderRadius;
      if (isSpiderClimbableCollider(collider)) {
        const climbDistance = collider.radius + spiderRadius * 0.85;
        if (distance < climbDistance) {
          const climb = 1 - THREE.MathUtils.smoothstep(distance, 0, climbDistance);
          climbHeight = Math.max(climbHeight, Math.min(1.25, collider.radius * 0.36) * climb);
        }
        continue;
      }
      if (distance >= minDistance) continue;
      let away = adjusted.clone().addScaledVector(colliderNormal, -dot);
      if (away.lengthSq() < 0.000001) {
        away = spiderTangentAwayFromArrival(colliderNormal);
      }
      away.normalize();
      adjusted.copy(colliderNormal).multiplyScalar(Math.cos(minDistance / PLANET_RADIUS)).addScaledVector(away, Math.sin(minDistance / PLANET_RADIUS)).normalize();
    }
  }
  return { normal: constrainSpiderTerritory(adjusted), climbHeight };
}

function colliderSurfaceNormal(collider: CircleCollider) {
  if (collider.normal) return collider.normal.clone().normalize();
  return planetNormal(collider.center.x, collider.center.y, new THREE.Vector3());
}

function isSpiderClimbableCollider(collider: CircleCollider) {
  return collider.label.includes("岩石") || collider.label.includes("玄武岩") || collider.label.includes("散落");
}

function spiderTangentAwayFromArrival(normal: THREE.Vector3) {
  const away = normal.clone().addScaledVector(ANCIENT_TREE_ARCH_NORMAL, -normal.dot(ANCIENT_TREE_ARCH_NORMAL));
  if (away.lengthSq() > 0.000001) return away;
  const fallback = new THREE.Vector3(1, 0, 0).projectOnPlane(normal);
  if (fallback.lengthSq() > 0.000001) return fallback;
  return new THREE.Vector3(0, 0, 1).projectOnPlane(normal);
}

export function updateRovers(rovers: THREE.Group[], elapsed: number, colliders: CircleCollider[] = []) {
  rovers.forEach((rover) => {
    const { centerX, centerZ, patrolRadius, speed, offset, kind, route, routeHeading } = rover.userData as {
      centerX: number;
      centerZ: number;
      patrolRadius: number;
      speed: number;
      offset: number;
      kind?: string;
      route?: string;
      routeHeading?: number;
      pauseUntil?: number;
    };
    if (kind === "bot" && (rover.userData.pauseUntil ?? -Infinity) > elapsed) return;
    const previousRouteElapsed = typeof rover.userData.routeElapsed === "number" ? rover.userData.routeElapsed : elapsed;
    const delta = THREE.MathUtils.clamp(elapsed - previousRouteElapsed, 0, 0.05);
    rover.userData.routeElapsed = elapsed;
    if (kind === "bot" && Array.isArray(rover.userData.patrolPoints)) {
      updateMaintenanceBotPatrol(rover, elapsed, delta, colliders);
      return;
    }
    const angle = route === "greatCircleLoop" && kind !== "bot"
      ? updateVehicleLoopAngle(rover, elapsed, delta, speed, offset, routeHeading ?? 0)
      : elapsed * speed + offset;
    if (route === "meridianLoop" || route === "latitudeLoop" || route === "greatCircleLoop") {
      const directionSign = speed >= 0 ? 1 : -1;
      const vehicleRadius = kind === "cargo" ? 3.6 : 3.2;
      const targetNormal = avoidFixedColliders(vehicleRouteNormal(route, angle, routeHeading), colliders, vehicleRadius);
      const storedNormal = rover.userData.routeNormal as THREE.Vector3 | undefined;
      let normal = storedNormal
        ? steerNormalAtConstantRate(storedNormal, targetNormal, Math.max(Math.abs(speed) * delta * 2.4, 0.0016))
        : targetNormal.clone();
      normal = keepVehicleNormalOutsideFixedColliders(normal, colliders, vehicleRadius);
      rover.userData.routeNormal = normal.clone();
      const nextTargetNormal = avoidFixedColliders(vehicleRouteNormal(route, angle + directionSign * 0.035, routeHeading), colliders, vehicleRadius);
      const nextNormal = steerNormalAtConstantRate(normal, nextTargetNormal, Math.max(Math.abs(speed) * 0.035 * 2.4, 0.002));
      let forward = nextNormal.clone().addScaledVector(normal, -normal.dot(nextNormal));
      if (forward.lengthSq() < 0.000001) {
        const fallbackNormal = vehicleRouteNormal(route, angle + directionSign * 0.035, routeHeading);
        forward = fallbackNormal.addScaledVector(normal, -normal.dot(fallbackNormal));
      }
      forward.normalize();
      const yaw = yawFromForward(normal, forward);
      placeObjectOnPlanetNormal(rover, normal, 0.08, yaw);
      setDynamicObjectPlanetCoordinate(rover, normal);
      const parked = route === "greatCircleLoop" && (rover.userData.stationPauseUntil ?? -Infinity) > elapsed;
      updateRoverWheelSpin(rover, elapsed, parked ? 0 : speed);
      updateRoverSurfaceEffects(rover, elapsed, delta, parked ? 0 : speed);
      return;
    }

    const x = route === "planetLoop" ? Math.cos(angle) * patrolRadius : centerX + Math.cos(angle) * patrolRadius;
    const z = route === "planetLoop" ? Math.sin(angle) * patrolRadius : centerZ + Math.sin(angle) * patrolRadius;
    const directionSign = speed >= 0 ? 1 : -1;
    const tangentX = -Math.sin(angle) * directionSign;
    const tangentZ = Math.cos(angle) * directionSign;
    const yaw = kind === "bot" || route === "planetLoop" ? Math.atan2(-tangentX, -tangentZ) : -angle + (speed > 0 ? Math.PI / 2 : -Math.PI / 2);
    if (kind === "bot") {
      placeObjectOnPlanet(rover, x, z, route === "planetLoop" ? 0.08 : 0.0, yaw);
    } else {
      const vehicleRadius = kind === "cargo" ? 3.6 : 3.2;
      const safeNormal = keepVehicleNormalOutsideFixedColliders(planetNormal(x, z, new THREE.Vector3()), colliders, vehicleRadius);
      placeObjectOnPlanetNormal(rover, safeNormal, route === "planetLoop" ? 0.08 : 0.0, yaw);
      setDynamicObjectPlanetCoordinate(rover, safeNormal);
    }
    if (kind === "bot") updateUtilityBotWalk(rover, elapsed, speed);
    if (kind !== "bot") {
      updateRoverWheelSpin(rover, elapsed, speed);
      updateRoverSurfaceEffects(rover, elapsed, delta, speed);
    }
  });
}

function updateMaintenanceBotPatrol(rover: THREE.Group, elapsed: number, delta: number, colliders: CircleCollider[]) {
  const data = rover.userData as {
    patrolPoints: Array<{ x: number; z: number }>;
    speed: number;
    offset: number;
    waitMin: number;
    waitMax: number;
    botTargetIndex?: number;
    botWaitingUntil?: number;
    botYaw?: number;
    planetX?: number;
    planetZ?: number;
  };
  const points = data.patrolPoints;
  if (points.length === 0) return;

  if (typeof data.botTargetIndex !== "number" || typeof data.planetX !== "number" || typeof data.planetZ !== "number") {
    const startIndex = Math.abs(Math.floor(data.offset ?? 0)) % points.length;
    const start = points[startIndex];
    const safeStart = keepBotPointOutsideFixedColliders(start.x, start.z, colliders);
    data.planetX = safeStart.x;
    data.planetZ = safeStart.z;
    data.botTargetIndex = (startIndex + 1) % points.length;
    data.botWaitingUntil = elapsed + botWaitSeconds(data, startIndex);
    data.botYaw = data.botYaw ?? 0;
    placeObjectOnPlanet(rover, safeStart.x, safeStart.z, 0, data.botYaw);
    updateUtilityBotWalk(rover, elapsed, 0);
    return;
  }

  if ((data.botWaitingUntil ?? 0) > elapsed) {
    const safeCurrent = keepBotPointOutsideFixedColliders(data.planetX, data.planetZ, colliders);
    data.planetX = safeCurrent.x;
    data.planetZ = safeCurrent.z;
    placeObjectOnPlanet(rover, data.planetX, data.planetZ, 0, data.botYaw ?? 0);
    updateUtilityBotWalk(rover, elapsed, 0);
    return;
  }

  const targetIndex = data.botTargetIndex ?? 0;
  const target = points[targetIndex];
  const current = new THREE.Vector2(data.planetX, data.planetZ);
  const toTarget = new THREE.Vector2(target.x - current.x, target.z - current.y);
  const distance = toTarget.length();
  const step = Math.max(0.02, data.speed * delta);

  let nextX = target.x;
  let nextZ = target.z;
  if (distance > step) {
    toTarget.multiplyScalar(step / distance);
    nextX = current.x + toTarget.x;
    nextZ = current.y + toTarget.y;
  }
  const safeNext = keepBotPointOutsideFixedColliders(nextX, nextZ, colliders);
  nextX = safeNext.x;
  nextZ = safeNext.z;
  if (isBotPointInsideFixedCollider(nextX, nextZ, colliders)) {
    data.botTargetIndex = chooseNextBotPatrolIndex(points.length, targetIndex, data.offset);
    data.botWaitingUntil = elapsed + botWaitSeconds(data, targetIndex) * 0.55;
    placeObjectOnPlanet(rover, data.planetX, data.planetZ, 0, data.botYaw ?? 0);
    updateUtilityBotWalk(rover, elapsed, 0);
    return;
  }

  data.planetX = nextX;
  data.planetZ = nextZ;

  const normal = planetNormal(nextX, nextZ, new THREE.Vector3());
  const targetNormal = planetNormal(target.x, target.z, new THREE.Vector3());
  const forward = targetNormal.addScaledVector(normal, -targetNormal.dot(normal));
  if (forward.lengthSq() > 0.000001) data.botYaw = yawFromForward(normal, forward.normalize());

  placeObjectOnPlanet(rover, nextX, nextZ, 0, data.botYaw ?? 0);
  updateUtilityBotWalk(rover, elapsed, data.speed);

  if (distance <= step + 0.05) {
    data.botTargetIndex = chooseNextBotPatrolIndex(points.length, targetIndex, data.offset);
    data.botWaitingUntil = elapsed + botWaitSeconds(data, targetIndex);
  }
}

function buildSafeBotPatrolPoints(points: Array<{ x: number; z: number }>, colliders: CircleCollider[]) {
  const safePoints = points.map((point) => keepBotPointOutsideFixedColliders(point.x, point.z, colliders));
  const uniquePoints: Array<{ x: number; z: number }> = [];
  for (const point of safePoints) {
    if (uniquePoints.every((existing) => Math.hypot(existing.x - point.x, existing.z - point.z) > 0.45)) uniquePoints.push(point);
  }
  return uniquePoints.length > 1 ? uniquePoints : safePoints;
}

function keepBotPointOutsideFixedColliders(x: number, z: number, colliders: CircleCollider[]) {
  const point = new THREE.Vector2(x, z);
  for (let pass = 0; pass < 3; pass += 1) {
    for (const collider of colliders) {
      if (collider.normal) continue;
      if (collider.dynamicObject || collider.radius < 1.4) continue;
      if (collider.enabled && !collider.enabled()) continue;
      const away = point.clone().sub(collider.center);
      let distance = away.length();
      const minDistance = collider.radius + MAINTENANCE_BOT_BUILDING_CLEARANCE;
      if (distance >= minDistance) continue;
      if (distance < 0.0001) {
        away.set(1, 0);
        distance = 1;
      }
      point.copy(collider.center).add(away.multiplyScalar(minDistance / distance));
    }
  }
  return { x: point.x, z: point.y };
}

function isBotPointInsideFixedCollider(x: number, z: number, colliders: CircleCollider[]) {
  for (const collider of colliders) {
    if (collider.normal) continue;
    if (collider.dynamicObject || collider.radius < 1.4) continue;
    if (collider.enabled && !collider.enabled()) continue;
    if (Math.hypot(x - collider.center.x, z - collider.center.y) < collider.radius + MAINTENANCE_BOT_BLOCKED_CLEARANCE) return true;
  }
  return false;
}

function chooseNextBotPatrolIndex(count: number, current: number, offset: number) {
  if (count <= 1) return 0;
  const stride = Math.abs(Math.floor(offset * 10)) % 2 === 0 ? 1 : 2;
  return (current + stride) % count;
}

function botWaitSeconds(data: { waitMin: number; waitMax: number; offset: number }, index: number) {
  const t = seededNoise(index + 1, data.offset * 19.17 + 3.4);
  return THREE.MathUtils.lerp(data.waitMin, data.waitMax, t);
}

function vehicleRouteNormal(route: string, angle: number, routeHeading = 0) {
  if (route === "greatCircleLoop") {
    const direction = new THREE.Vector3(Math.cos(routeHeading), 0, Math.sin(routeHeading));
    return direction.multiplyScalar(Math.sin(angle)).addScaledVector(WORLD_UP, Math.cos(angle)).normalize();
  }
  if (route === "meridianLoop") {
    return new THREE.Vector3(Math.sin(angle) * 0.92, Math.cos(angle), Math.sin(angle) * 0.38).normalize();
  }
  return new THREE.Vector3(Math.cos(angle), 0.34, Math.sin(angle)).normalize();
}

function updateVehicleLoopAngle(rover: THREE.Group, elapsed: number, delta: number, speed: number, offset: number, routeHeading: number) {
  if (typeof rover.userData.routeAngle !== "number") {
    rover.userData.routeAngle = normalizeRouteAngle(elapsed * speed + offset);
    rover.userData.lastStationStopIndex = null;
  }
  if ((rover.userData.stationPauseUntil ?? -Infinity) > elapsed) {
    return Number(rover.userData.routeAngle);
  }

  let angle = Number(rover.userData.routeAngle);
  angle = normalizeRouteAngle(angle + speed * delta);
  const stopAngles = vehicleStopAnglesForGreatCircle(routeHeading);
  const stopIndex = vehicleStopIndexForAngle(angle, stopAngles);
  if (stopIndex !== null && rover.userData.lastStationStopIndex !== stopIndex) {
    angle = stopAngles[stopIndex];
    rover.userData.stationPauseUntil = elapsed + VEHICLE_ROUTE_STOP_SECONDS;
    rover.userData.lastStationStopIndex = stopIndex;
  }
  if (stopIndex === null) rover.userData.lastStationStopIndex = null;
  rover.userData.routeAngle = angle;
  return angle;
}

function vehicleStopIndexForAngle(angle: number, stopAngles: number[]) {
  const normalized = normalizeRouteAngle(angle);
  for (let index = 0; index < stopAngles.length; index += 1) {
    if (routeAngleDistance(normalized, stopAngles[index]) < VEHICLE_STOP_ANGLE_THRESHOLD) return index;
  }
  return null;
}

function vehicleStopAnglesForGreatCircle(routeHeading: number) {
  return [
    nearestGreatCircleLoopAngle(vehicleAncientTreeStopNormal(), routeHeading),
    nearestGreatCircleLoopAngle(vehicleBaseTargetNormal(), routeHeading),
    nearestGreatCircleLoopAngle(vehicleCrashedShipTargetNormal(), routeHeading),
  ];
}

function nearestGreatCircleLoopAngle(targetNormal: THREE.Vector3, routeHeading = 0) {
  const direction = new THREE.Vector3(Math.cos(routeHeading), 0, Math.sin(routeHeading));
  return normalizeRouteAngle(Math.atan2(targetNormal.dot(direction), targetNormal.dot(WORLD_UP)));
}

function normalizeRouteAngle(angle: number) {
  return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

function routeAngleDistance(a: number, b: number) {
  const distance = Math.abs(normalizeRouteAngle(a) - normalizeRouteAngle(b));
  return Math.min(distance, Math.PI * 2 - distance);
}

function vehicleBaseTargetNormal() {
  return planetNormal(VEHICLE_BASE_TARGET_X, VEHICLE_BASE_TARGET_Z, new THREE.Vector3());
}

function vehicleCrashedShipTargetNormal() {
  return CRASHED_SHIP_SITE_NORMAL.clone();
}

function vehicleAncientTreeStopNormal() {
  const centerNormal = normalFromLonLat(ANCIENT_TREE_ARCH_LON, ANCIENT_TREE_ARCH_LAT);
  const archForward = new THREE.Vector3(0, 0, -1).applyAxisAngle(centerNormal, ANCIENT_TREE_ARCH_YAW).projectOnPlane(centerNormal);
  if (archForward.lengthSq() < 0.000001) {
    return centerNormal.clone().addScaledVector(WORLD_UP, -centerNormal.dot(WORLD_UP)).normalize();
  }
  return centerNormal.clone().addScaledVector(archForward.normalize(), (ANCIENT_TREE_ARCH_FOOTPRINT_RADIUS + 11) / PLANET_RADIUS).normalize();
}

function avoidFixedColliders(normal: THREE.Vector3, colliders: CircleCollider[], vehicleRadius: number) {
  const adjusted = normal.clone();
  for (const collider of colliders) {
    if (isVehicleRouteIgnoredCollider(collider)) continue;
    if (collider.dynamicObject || collider.radius < 2.4) continue;
    if (collider.enabled && !collider.enabled()) continue;
    const colliderNormal = collider.normal?.clone() ?? planetNormal(collider.center.x, collider.center.y, new THREE.Vector3());
    const dot = THREE.MathUtils.clamp(adjusted.dot(colliderNormal), -1, 1);
    const distance = Math.acos(dot) * PLANET_RADIUS;
    const minDistance = collider.radius + vehicleRadius + 2.8;
    const steerDistance = minDistance + 12;
    if (distance >= steerDistance) continue;
    const away = adjusted.clone().addScaledVector(colliderNormal, -dot);
    if (away.lengthSq() < 0.000001) continue;
    away.normalize();
    const urgency = 1 - THREE.MathUtils.smoothstep(distance, minDistance, steerDistance);
    adjusted.addScaledVector(away, ((steerDistance - distance) / PLANET_RADIUS) * urgency * 0.62).normalize();
  }
  return adjusted;
}

function keepVehicleNormalOutsideFixedColliders(normal: THREE.Vector3, colliders: CircleCollider[], vehicleRadius: number) {
  const adjusted = normal.clone();
  for (let pass = 0; pass < 3; pass += 1) {
    for (const collider of colliders) {
      if (isVehicleRouteIgnoredCollider(collider)) continue;
      if (collider.dynamicObject || collider.radius < 2.4) continue;
      if (collider.enabled && !collider.enabled()) continue;
      const colliderNormal = collider.normal?.clone() ?? planetNormal(collider.center.x, collider.center.y, new THREE.Vector3());
      const dot = THREE.MathUtils.clamp(adjusted.dot(colliderNormal), -1, 1);
      const distance = Math.acos(dot) * PLANET_RADIUS;
      const minDistance = collider.radius + vehicleRadius + 0.9;
      if (distance >= minDistance) continue;
      let away = adjusted.clone().addScaledVector(colliderNormal, -dot);
      if (away.lengthSq() < 0.000001) {
        away = new THREE.Vector3(1, 0, 0).projectOnPlane(colliderNormal);
        if (away.lengthSq() < 0.000001) away.set(0, 0, 1).projectOnPlane(colliderNormal);
      }
      away.normalize();
      adjusted.copy(colliderNormal).multiplyScalar(Math.cos(minDistance / PLANET_RADIUS)).addScaledVector(away, Math.sin(minDistance / PLANET_RADIUS)).normalize();
    }
  }
  return adjusted;
}

function isVehicleRouteIgnoredCollider(collider: CircleCollider) {
  return collider.label.startsWith("远古巨树拱门");
}

function setDynamicObjectPlanetCoordinate(object: THREE.Object3D, normal: THREE.Vector3) {
  const projectedY = Math.abs(normal.y) < 0.08 ? Math.sign(normal.y || 1) * 0.08 : normal.y;
  object.userData.planetX = (normal.x / projectedY) * PLANET_RADIUS;
  object.userData.planetZ = (normal.z / projectedY) * PLANET_RADIUS;
}

function steerNormalAtConstantRate(current: THREE.Vector3, target: THREE.Vector3, maxAngle: number) {
  const dot = THREE.MathUtils.clamp(current.dot(target), -1, 1);
  const angle = Math.acos(dot);
  if (angle <= maxAngle || angle < 0.000001) return target.clone();
  const tangent = target.clone().addScaledVector(current, -dot);
  if (tangent.lengthSq() < 0.000001) return target.clone();
  tangent.normalize();
  return current.clone().multiplyScalar(Math.cos(maxAngle)).addScaledVector(tangent, Math.sin(maxAngle)).normalize();
}

function yawFromForward(normal: THREE.Vector3, forward: THREE.Vector3) {
  const base = new THREE.Quaternion().setFromUnitVectors(WORLD_UP, normal.clone().normalize());
  const localForward = forward.clone().normalize().applyQuaternion(base.invert());
  return Math.atan2(-localForward.x, -localForward.z);
}

function updateRoverWheelSpin(rover: THREE.Group, elapsed: number, speed: number) {
  const wheels = rover.userData.wheels as THREE.Object3D[] | undefined;
  if (!wheels) return;
  const spin = elapsed * Math.abs(speed) * 36;
  for (const wheel of wheels) wheel.rotation.x = spin;
}

function updateRoverSurfaceEffects(rover: THREE.Group, elapsed: number, delta: number, speed: number) {
  if (!rover.parent || Math.abs(speed) < 0.001) return;
  const effects = getRoverSurfaceEffects(rover);
  const normal = scratchTrackNormal.copy(rover.position).normalize();
  const side = scratchTrackSide.set(1, 0, 0).applyQuaternion(rover.quaternion).addScaledVector(normal, -scratchTrackSide.dot(normal));
  const forward = scratchTrackForward.set(0, 0, -1).applyQuaternion(rover.quaternion).addScaledVector(normal, -scratchTrackForward.dot(normal));
  if (side.lengthSq() < 0.000001 || forward.lengthSq() < 0.000001) return;
  side.normalize();
  forward.normalize();

  const routeDirection = speed >= 0 ? 1 : -1;
  const trackAnchor = rover.position.clone().addScaledVector(forward, -routeDirection * 0.7);
  if (!effects.lastTrackPosition || effects.lastTrackPosition.distanceTo(trackAnchor) > 2.35) {
    emitWheelTrackPair(effects, elapsed, normal, side, forward, routeDirection);
    effects.lastTrackPosition = trackAnchor;
  }

  effects.dustAccumulator += delta * (Math.abs(speed) > 0.05 ? 18 : 12);
  while (effects.dustAccumulator >= 1) {
    emitFineDust(effects, normal, side, forward, routeDirection, Math.abs(speed));
    effects.dustAccumulator -= 1;
  }
  updateFineDust(effects, delta);
  fadeWheelTracks(effects, elapsed);
}

function getRoverSurfaceEffects(rover: THREE.Group) {
  const existing = rover.userData.surfaceEffects as RoverSurfaceEffectState | undefined;
  if (existing) return existing;

  const group = new THREE.Group();
  group.name = `${rover.userData.label ?? "rover"} surface trail`;
  rover.parent?.add(group);

  const tracks: WheelTrackPatch[] = [];
  for (let i = 0; i < 168; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: 0x35160e,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const mesh = new THREE.Mesh(wheelTrackGeometry, material);
    mesh.visible = false;
    mesh.renderOrder = 1;
    group.add(mesh);
    tracks.push({ mesh, createdAt: -Infinity });
  }

  const fogTexture = getDustFogTexture();
  const dust: DustParticle[] = [];
  for (let i = 0; i < 58; i += 1) {
    const material = new THREE.SpriteMaterial({
      map: fogTexture,
      color: 0xc77a4d,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    sprite.renderOrder = 2;
    group.add(sprite);
    dust.push({
      sprite,
      material,
      velocity: new THREE.Vector3(),
      age: 0,
      lifetime: 1,
      baseScale: 1,
    });
  }

  const state: RoverSurfaceEffectState = {
    group,
    tracks,
    trackCursor: 0,
    dust,
    dustCursor: 0,
    dustAccumulator: 0,
  };
  rover.userData.surfaceEffects = state;
  return state;
}

function emitWheelTrackPair(
  effects: RoverSurfaceEffectState,
  elapsed: number,
  normal: THREE.Vector3,
  side: THREE.Vector3,
  forward: THREE.Vector3,
  routeDirection: number
) {
  const orientedForward = forward.clone().multiplyScalar(routeDirection);
  for (const lateral of [-1.38, 1.38]) {
    const trackNormal = normal.clone().addScaledVector(side, lateral / PLANET_RADIUS).normalize();
    const patch = effects.tracks[effects.trackCursor];
    effects.trackCursor = (effects.trackCursor + 1) % effects.tracks.length;
    patch.createdAt = elapsed;
    patch.mesh.position.copy(planetSurfacePointFromNormal(trackNormal, 0.09));
    patch.mesh.quaternion.setFromRotationMatrix(scratchTrackMatrix.makeBasis(side, orientedForward, trackNormal));
    patch.mesh.scale.set(1, 0.95 + Math.random() * 0.18, 1);
    patch.mesh.material.opacity = 0.5;
    patch.mesh.visible = true;
  }
}

function fadeWheelTracks(effects: RoverSurfaceEffectState, elapsed: number) {
  for (const patch of effects.tracks) {
    if (!patch.mesh.visible) continue;
    const age = elapsed - patch.createdAt;
    if (age > 42) {
      patch.mesh.visible = false;
      patch.mesh.material.opacity = 0;
    } else if (age > 32) {
      patch.mesh.material.opacity = THREE.MathUtils.lerp(0.5, 0.12, (age - 32) / 10);
    }
  }
}

function emitFineDust(
  effects: RoverSurfaceEffectState,
  normal: THREE.Vector3,
  side: THREE.Vector3,
  forward: THREE.Vector3,
  routeDirection: number,
  speedMagnitude: number
) {
  const particle = effects.dust[effects.dustCursor];
  effects.dustCursor = (effects.dustCursor + 1) % effects.dust.length;

  const rearDirection = forward.clone().multiplyScalar(-routeDirection);
  const lateral = (Math.random() - 0.5) * 2.7;
  const rearOffset = 2.2 + Math.random() * 1.9;
  const spawnNormal = normal.clone().addScaledVector(side, lateral / PLANET_RADIUS).addScaledVector(rearDirection, rearOffset / PLANET_RADIUS).normalize();
  particle.sprite.position.copy(planetSurfacePointFromNormal(spawnNormal, 0.62 + Math.random() * 0.62));
  particle.velocity
    .copy(rearDirection)
    .multiplyScalar(0.18 + speedMagnitude * 1.1)
    .addScaledVector(side, (Math.random() - 0.5) * 0.36)
    .addScaledVector(normal, 0.16 + Math.random() * 0.18);
  particle.age = 0;
  particle.lifetime = 1.75 + Math.random() * 0.85;
  particle.baseScale = 1.04 + Math.random() * 0.9;
  particle.material.opacity = 0.18 + Math.random() * 0.06;
  particle.sprite.scale.setScalar(particle.baseScale);
  particle.sprite.visible = true;
}

function updateFineDust(effects: RoverSurfaceEffectState, delta: number) {
  for (const particle of effects.dust) {
    if (!particle.sprite.visible) continue;
    particle.age += delta;
    const progress = particle.age / particle.lifetime;
    if (progress >= 1) {
      particle.sprite.visible = false;
      particle.material.opacity = 0;
      continue;
    }
    particle.sprite.position.addScaledVector(particle.velocity, delta);
    particle.velocity.multiplyScalar(0.985);
    const scale = particle.baseScale * (1 + progress * 1.85);
    particle.sprite.scale.set(scale, scale * 0.72, scale);
    particle.material.opacity = (1 - THREE.MathUtils.smoothstep(progress, 0.2, 1)) * 0.24;
  }
}

function getDustFogTexture() {
  if (dustFogTexture) return dustFogTexture;
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.55)");
    gradient.addColorStop(0.34, "rgba(255, 255, 255, 0.22)");
    gradient.addColorStop(0.72, "rgba(255, 255, 255, 0.06)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  dustFogTexture = new THREE.CanvasTexture(canvas);
  dustFogTexture.colorSpace = THREE.SRGBColorSpace;
  return dustFogTexture;
}

function updateUtilityBotWalk(bot: THREE.Group, elapsed: number, speed: number) {
  const parts = bot.userData.walkParts as
    | {
        leftArm: THREE.Object3D[];
        rightArm: THREE.Object3D[];
        leftLeg: THREE.Object3D[];
        rightLeg: THREE.Object3D[];
      }
    | undefined;
  if (!parts) return;
  const stride = Math.sin(elapsed * (5.4 + Math.abs(speed) * 12) + (bot.userData.offset ?? 0) * 1.7) * 0.24;
  const bob = Math.abs(Math.sin(elapsed * 5.4 + (bot.userData.offset ?? 0))) * 0.025;
  bot.children[0].position.y = 0.66 * (bot.userData.botSize ?? 1) + bob;
  for (const part of parts.leftLeg) part.rotation.x = stride;
  for (const part of parts.rightLeg) part.rotation.x = -stride;
  for (const part of parts.leftArm) part.rotation.x = -stride * 0.75;
  for (const part of parts.rightArm) part.rotation.x = stride * 0.75;
}

export function updateMeteors(meteors: Meteor[], elapsed: number) {
  meteors.forEach((meteor) => {
    const angle = meteor.phase + elapsed * meteor.orbitSpeed;
    const headPosition = meteorPositionAtAngle(meteor, angle, elapsed);
    const orbitDirection = Math.sign(meteor.orbitSpeed) || 1;
    const aheadPosition = meteorPositionAtAngle(meteor, angle + orbitDirection * 0.006, elapsed);
    const motionDirection = aheadPosition.sub(headPosition).normalize();
    const radialDirection = headPosition.clone().normalize();
    const closeness = 1;
    const scaleGunFactor = typeof meteor.head.userData.meteorScaleFactor === "number" ? meteor.head.userData.meteorScaleFactor : 1;
    const headScale = (meteor.closeFlyby ? THREE.MathUtils.lerp(0.1, 1, closeness) : 1) * scaleGunFactor;

    meteor.head.position.copy(headPosition);
    meteor.head.scale.setScalar(headScale);
    meteor.head.rotation.y += 0.0025;
    meteor.head.rotation.x += 0.0013;
    const headMaterial = meteor.head.material;
    if (meteor.closeFlyby && headMaterial instanceof THREE.MeshStandardMaterial) {
      headMaterial.opacity = 1;
      headMaterial.emissive.setHex(0x000000);
      headMaterial.emissiveIntensity = 0;
    }
    meteor.trail.position.copy(headPosition);
    meteor.trail.visible = !meteor.closeFlyby || closeness > 0.08;
    meteor.trailPuffs.forEach((puff, index) => {
      const rawT = (index + 1) / (meteor.trailPuffs.length + 1);
      const t = meteor.closeFlyby ? THREE.MathUtils.lerp(0.18, 1, rawT) : rawT;
      const curl = Math.sin(elapsed * 1.7 + meteor.phase * 4 + index * 0.9) * t * 1.8;
      puff.position
        .copy(motionDirection)
        .multiplyScalar(-meteor.tailLength * t - (meteor.closeFlyby ? 16 : 0))
        .addScaledVector(radialDirection, meteor.closeFlyby ? -4.5 * t : -2.2 * t)
        .addScaledVector(meteor.wobbleAxis, curl * (meteor.closeFlyby ? 1.15 : 1));
      const base = meteor.closeFlyby ? 4.2 : meteor.tailLength > 40 ? 2.8 : 1.15;
      const scale = base * (1.05 + t * (meteor.closeFlyby ? 2.2 : 2.15)) * (0.92 + Math.sin(elapsed * 2.1 + index) * 0.06) * (meteor.closeFlyby ? THREE.MathUtils.lerp(0.28, 1, closeness) : 1);
      puff.scale.set(scale, scale * (meteor.closeFlyby ? 0.82 : 0.72), scale);
      const puffMaterial = puff.material;
      if (meteor.closeFlyby && puffMaterial instanceof THREE.SpriteMaterial) {
        const baseOpacity = puff.userData.baseOpacity ?? puffMaterial.opacity;
        puff.userData.baseOpacity = baseOpacity;
        puffMaterial.opacity = baseOpacity * THREE.MathUtils.lerp(0.08, 0.72, closeness);
      }
    });
    if (meteor.closeFlyby) {
      meteor.trailComa.visible = false;
      meteor.trailComa.position
        .copy(motionDirection)
        .multiplyScalar(-18)
        .addScaledVector(radialDirection, -6)
        .addScaledVector(meteor.wobbleAxis, Math.sin(elapsed * 2.4 + meteor.phase) * 3.2);
      meteor.trailComa.scale.setScalar(THREE.MathUtils.lerp(16, 26, closeness));
      meteor.trailComa.scale.y *= 0.68;
      const comaMaterial = meteor.trailComa.material;
      if (comaMaterial instanceof THREE.SpriteMaterial) {
        const baseOpacity = meteor.trailComa.userData.baseOpacity ?? comaMaterial.opacity;
        meteor.trailComa.userData.baseOpacity = baseOpacity;
        comaMaterial.opacity = baseOpacity * THREE.MathUtils.lerp(0.1, 1, closeness);
      }
    }

    meteor.starAttribute.setXYZ(meteor.starIndex, headPosition.x, headPosition.y, headPosition.z);
    meteor.starAttribute.needsUpdate = true;
  });
}

function meteorPositionAtAngle(meteor: Meteor, angle: number, elapsed: number) {
  if (meteor.closeFlyby) {
    const trackNormal = meteor.startDirection
      .clone()
      .multiplyScalar(Math.cos(angle))
      .addScaledVector(meteor.flybyTangent, Math.sin(angle))
      .normalize();
    return trackNormal.multiplyScalar(meteor.orbitMin);
  }
  const radius = THREE.MathUtils.lerp(meteor.orbitMin, meteor.orbitMax, 0.5 + Math.sin(angle * 0.47 + meteor.phase) * 0.5);
  const center = meteor.startDirection.clone().multiplyScalar(radius);
  const driftA = Math.sin(angle) * (120 + meteor.tailLength * 1.8);
  const driftB = Math.cos(angle * 0.63 + meteor.phase) * (70 + meteor.tailLength);
  const wobble = Math.sin(elapsed * meteor.wobbleSpeed + meteor.phase * 3.1) * meteor.wobbleAmount * 24;
  return center.addScaledVector(meteor.flybyTangent, driftA).addScaledVector(meteor.wobbleAxis, driftB + wobble);
}

export function updateSolarArrays(arrays: THREE.Group[], sunPosition: THREE.Vector3) {
  const sunDirection = sunPosition.clone().normalize();
  for (const array of arrays) {
    const trackers = array.userData.trackers as THREE.Object3D[] | undefined;
    if (!trackers) continue;
    const inverse = new THREE.Quaternion();
    array.getWorldQuaternion(inverse).invert();
    const localSun = sunDirection.clone().applyQuaternion(inverse).normalize();
    const targetTilt = THREE.MathUtils.clamp(Math.atan2(localSun.z, Math.max(0.16, localSun.y)), -1.1, 1.1);
    for (const panel of trackers) {
      panel.rotation.x = THREE.MathUtils.lerp(panel.rotation.x, targetTilt, 0.05);
    }
  }
}

export function updateElevators(elevators: ElevatorControl[], delta: number) {
  elevators.forEach((elevator) => {
    const destination = elevator.target === "top" ? elevator.topY : elevator.bottomY;
    const current = elevator.car.position.y;
    const distance = destination - current;
    const step = elevator.speed * delta;
    if (Math.abs(distance) <= step) {
      elevator.car.position.y = destination;
      elevator.moving = false;
      return;
    }
    elevator.car.position.y += Math.sign(distance) * step;
    elevator.moving = true;
  });
}
