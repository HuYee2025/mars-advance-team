import * as THREE from "three";
import marsAlbedoUrl from "./assets/mars-albedo-generated.png";

export type Interactable = {
  id: "oxygen" | "solar" | "garage";
  label: string;
  prompt: string;
  object: THREE.Object3D;
  radius: number;
  completed: boolean;
};

export type MarsWorld = {
  interactables: Interactable[];
  landmarks: Landmark[];
  unnumberedObjects: UnnumberedObject[];
  colliders: CircleCollider[];
  rovers: THREE.Group[];
  meteors: Meteor[];
  solarArrays: THREE.Group[];
  elevators: ElevatorControl[];
  habitatDoor: HabitatDoorControl;
  greenhouseDoor: GreenhouseDoorControl;
  flickerLights: THREE.PointLight[];
  oxygenLight: THREE.PointLight;
  solarLight: THREE.PointLight;
  fufuRescueSite: FufuRescueSite;
};

export type FufuRescueSite = {
  normal: THREE.Vector3;
  x: number;
  z: number;
  yaw: number;
};

export type ElevatorControl = {
  car: THREE.Object3D;
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
};

export type CircleCollider = {
  center: THREE.Vector2;
  radius: number;
  label: string;
  dynamicObject?: THREE.Object3D;
  enabled?: () => boolean;
};

export type Meteor = {
  head: THREE.Mesh;
  trail: THREE.Line;
  starAttribute: THREE.BufferAttribute;
  starIndex: number;
  startDirection: THREE.Vector3;
  orbitAxis: THREE.Vector3;
  orbitMin: number;
  orbitMax: number;
  orbitSpeed: number;
  phase: number;
  tailAngle: number;
  wobbleAxis: THREE.Vector3;
  wobbleSpeed: number;
  wobbleAmount: number;
};

export const PLANET_RADIUS = 88;
const LAYOUT_SPREAD = 2;
const LANDER_SCALE = 2.65;
const LANDER_SURFACE_SETTLE = -0.42;
const HABITAT_SCALE = 1.78;
const GREENHOUSE_SCALE = 3.15;
const INDUSTRIAL_SCALE = 2.05;
const GARAGE_SCALE = 1.95;
const TOWER_SCALE = 1.55;
const NUMBERED_FACILITY_SCALE = 1.55;

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const scratchNormal = new THREE.Vector3();
const marsAlbedoTexture = new THREE.TextureLoader().load(marsAlbedoUrl);
marsAlbedoTexture.colorSpace = THREE.SRGBColorSpace;
marsAlbedoTexture.wrapS = THREE.RepeatWrapping;
marsAlbedoTexture.wrapT = THREE.ClampToEdgeWrapping;
marsAlbedoTexture.anisotropy = 8;

function spread(value: number) {
  return value * LAYOUT_SPREAD;
}

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
  return duneA + duneB + duneC;
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
  const interactables: Interactable[] = [];
  const landmarks: Landmark[] = [];
  const unnumberedObjects: UnnumberedObject[] = [];
  const colliders: CircleCollider[] = [];
  const rovers: THREE.Group[] = [];
  const solarArrays: THREE.Group[] = [];
  const elevators: ElevatorControl[] = [];
  const flickerLights: THREE.PointLight[] = [];

  scene.add(createTerrain());
  const skyDust = createSkyDust();
  scene.add(skyDust.object);
  const meteors = skyDust.meteors;
  addRockField(scene, colliders);

  const base = new THREE.Group();
  base.name = "ARES Base Alpha";
  scene.add(base);

  addLanderSite("01 飞船 登陆飞船", spread(29.5), spread(10.7), 0.18, true);
  addLanderSite("02 飞船 货运飞船", spread(124.1), spread(0), -0.55, true);
  addLanderSite("03 飞船 返回飞船", spread(-62), spread(107.4), 0.94, false);

  const wreckNormal = new THREE.Vector3(-0.2, -0.62, -0.76).normalize();
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

  const habitat = createHabitatModule();
  habitat.scale.setScalar(HABITAT_SCALE);
  const habitatDoor = habitat.userData.door as HabitatDoorControl;
  const habitatX = spread(5.5);
  const habitatZ = spread(30.9);
  const habitatYaw = -0.22;
  placeObjectOnPlanet(habitat, habitatX, habitatZ, 2.0, habitatYaw);
  base.add(habitat);
  landmarks.push(landmark("01 建筑 居住舱", habitat, habitatX, habitatZ, 34, 220));
  for (const x of [-8.2, -5.4, -2.7, 0, 2.7, 5.4, 8.2]) {
    colliders.push({ ...offsetCircle(habitatX, habitatZ, habitatYaw, x, 0.2, 3.05, "关闭的居住舱"), enabled: () => !habitatDoor.occupied });
  }
  colliders.push({ ...offsetCircle(habitatX, habitatZ, habitatYaw, 0, -1.45, 1.65, "关闭的居住舱舱门"), enabled: () => !habitatDoor.occupied });
  colliders.push({ ...offsetCircle(habitatX, habitatZ, habitatYaw, -8.2, 0.2, 2.6, "居住舱左端盖"), enabled: () => habitatDoor.open && !habitatDoor.occupied });
  colliders.push({ ...offsetCircle(habitatX, habitatZ, habitatYaw, 8.2, 0.2, 2.6, "居住舱右端盖"), enabled: () => habitatDoor.open && !habitatDoor.occupied });
  colliders.push({ ...offsetCircle(habitatX, habitatZ, habitatYaw, -3.8, 3.35, 2.2, "居住舱后舱壁"), enabled: () => habitatDoor.open && !habitatDoor.occupied });
  colliders.push({ ...offsetCircle(habitatX, habitatZ, habitatYaw, 0, 3.35, 2.2, "居住舱后舱壁"), enabled: () => habitatDoor.open && !habitatDoor.occupied });
  colliders.push({ ...offsetCircle(habitatX, habitatZ, habitatYaw, 3.8, 3.35, 2.2, "居住舱后舱壁"), enabled: () => habitatDoor.open && !habitatDoor.occupied });

  const greenhouse = createGreenhouse(flickerLights);
  greenhouse.scale.setScalar(GREENHOUSE_SCALE);
  const greenhouseDoor = greenhouse.userData.door as GreenhouseDoorControl;
  const greenhouseX = spread(-29.5);
  const greenhouseZ = spread(-10.7);
  const greenhouseYaw = 0.3;
  placeObjectOnPlanet(greenhouse, greenhouseX, greenhouseZ, -0.86, greenhouseYaw);
  base.add(greenhouse);
  landmarks.push(landmark("02 建筑 温室生态舱", greenhouse, greenhouseX, greenhouseZ, 46, 260));
  colliders.push(offsetCircle(greenhouseX, greenhouseZ, greenhouseYaw, -8.6, 0.2, 5.0, "温室左舱壁"));
  colliders.push(offsetCircle(greenhouseX, greenhouseZ, greenhouseYaw, 8.6, 0.2, 5.0, "温室右舱壁"));
  colliders.push(offsetCircle(greenhouseX, greenhouseZ, greenhouseYaw, 0, 9.2, 6.6, "温室后舱壁"));
  colliders.push({ ...offsetCircle(greenhouseX, greenhouseZ, greenhouseYaw, 0, -4.2, 6.2, "密封的温室生态舱"), enabled: () => !greenhouseDoor.occupied });

  const oxygenX = spread(-24.1);
  const oxygenZ = spread(20.2);
  const oxygenYaw = -0.18;
  const oxygenPlant = createIndustrialPlant(0xff3d2f, "O2", true);
  oxygenPlant.scale.setScalar(INDUSTRIAL_SCALE);
  placeObjectOnPlanet(oxygenPlant, oxygenX, oxygenZ, 0, oxygenYaw);
  base.add(oxygenPlant);
  landmarks.push(landmark("03 建筑 氧气生产站", oxygenPlant, oxygenX, oxygenZ, 38, 240));
  colliders.push(offsetCircle(oxygenX, oxygenZ, oxygenYaw, -4.4, -0.2, 2.8, "氧气生产站左墙"));
  colliders.push(offsetCircle(oxygenX, oxygenZ, oxygenYaw, 4.4, -0.2, 2.8, "氧气生产站右墙"));
  colliders.push(offsetCircle(oxygenX, oxygenZ, oxygenYaw, 0, 3.8, 3.8, "氧气生产站后墙"));
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
  const methaneX = spread(24.1);
  const methaneZ = spread(-20.2);
  placeObjectOnPlanet(methanePlant, methaneX, methaneZ, 0, 0.8);
  base.add(methanePlant);
  landmarks.push(landmark("04 建筑 甲烷燃料厂", methanePlant, methaneX, methaneZ, 34, 230));
  colliders.push(circle(methaneX, methaneZ, 6.4, "甲烷燃料厂"));

  const garage = createGarage();
  garage.scale.setScalar(GARAGE_SCALE);
  const garageX = spread(-5.5);
  const garageZ = spread(-30.9);
  placeObjectOnPlanet(garage, garageX, garageZ, 0, -0.7);
  base.add(garage);
  landmarks.push(landmark("05 建筑 机器人车库", garage, garageX, garageZ, 34, 230));
  colliders.push(circle(garageX, garageZ, 6.8, "机器人车库"));
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
  const towerX = spread(21.5);
  const towerZ = spread(122.2);
  placeObjectOnPlanet(tower, towerX, towerZ, 0, 0.2);
  base.add(tower);
  landmarks.push(landmark("06 建筑 通信塔", tower, towerX, towerZ, 34, 220));
  colliders.push(circle(towerX, towerZ, 3.2, "通信塔"));

  const lab04 = createNumberedFacility("04", 0x75d7ff, "lab");
  lab04.scale.setScalar(NUMBERED_FACILITY_SCALE);
  const lab04X = spread(-116.6);
  const lab04Z = spread(-42.4);
  placeObjectOnPlanet(lab04, lab04X, lab04Z, 0, -0.38);
  base.add(lab04);
  landmarks.push(landmark("07 建筑 科研舱", lab04, lab04X, lab04Z, 34, 230));
  colliders.push(circle(lab04X, lab04Z, 6.2, "04 科研舱"));

  const store07 = createNumberedFacility("07", 0xffc36d, "depot");
  store07.scale.setScalar(NUMBERED_FACILITY_SCALE);
  const store07X = spread(-62);
  const store07Z = spread(-107.4);
  placeObjectOnPlanet(store07, store07X, store07Z, 0, 0.72);
  base.add(store07);
  landmarks.push(landmark("08 建筑 物资仓", store07, store07X, store07Z, 34, 230));
  colliders.push(circle(store07X, store07Z, 6.5, "07 物资仓"));

  const med06 = createNumberedFacility("06", 0x9ff28b, "clinic");
  med06.scale.setScalar(NUMBERED_FACILITY_SCALE);
  const med06X = spread(95);
  const med06Z = spread(-79.8);
  placeObjectOnPlanet(med06, med06X, med06Z, 0, -0.86);
  base.add(med06);
  landmarks.push(landmark("09 建筑 医疗舱", med06, med06X, med06Z, 34, 230));
  colliders.push(circle(med06X, med06Z, 6.0, "06 医疗舱"));

  const solarAX = spread(95);
  const solarAZ = spread(79.8);
  const solarA = createSolarArray(solarAX, solarAZ, -0.36, base);
  solarArrays.push(solarA);
  landmarks.push(landmark("01 能源 太阳能阵列 A", solarA, solarAX, solarAZ, 30, 220));
  colliders.push(circle(solarAX, solarAZ, 8.6, "太阳能阵列 A"));
  const solarBX = spread(-116.6);
  const solarBZ = spread(42.4);
  const solarB = createSolarArray(solarBX, solarBZ, -0.36, base);
  solarArrays.push(solarB);
  landmarks.push(landmark("02 能源 太阳能阵列 B", solarB, solarBX, solarBZ, 30, 220));
  colliders.push(circle(solarBX, solarBZ, 8.6, "太阳能阵列 B"));
  const solarCX = spread(21.5);
  const solarCZ = spread(-122.2);
  const solarNode = createSolarArray(solarCX, solarCZ, 0.18, base);
  solarArrays.push(solarNode);
  landmarks.push(landmark("03 能源 太阳能阵列 C", solarNode, solarCX, solarCZ, 30, 220));
  colliders.push(circle(solarCX, solarCZ, 8.8, "太阳能阵列 C"));
  const solarLight = new THREE.PointLight(0xff3d2f, 1.8, 11);
  solarLight.position.copy(planetSurfacePoint(solarCX, solarCZ, 3.4));
  base.add(solarLight);
  flickerLights.push(solarLight);
  interactables.push({
    id: "solar",
    label: "03 能源 太阳能阵列 C",
    prompt: "按 E 重启 03 能源 太阳能阵列 C",
    object: solarNode,
    radius: 12.5,
    completed: false,
  });

  createPipes(base);
  createRovers(base, rovers, colliders, landmarks);

  return {
    interactables,
    landmarks,
    unnumberedObjects,
    colliders,
    rovers,
    meteors,
    solarArrays,
    elevators,
    habitatDoor,
    greenhouseDoor,
    flickerLights,
    oxygenLight,
    solarLight,
    fufuRescueSite: {
      normal: fufuRescueNormal,
      x: fufuRescueX,
      z: fufuRescueZ,
      yaw: wreckYaw + Math.PI * 0.62,
    },
  };

  function addLanderSite(label: string, x: number, z: number, yaw: number, interactive: boolean) {
    const lander = createLander();
    lander.scale.setScalar(LANDER_SCALE);
    if (interactive && lander.userData.elevator) {
      const elevator = lander.userData.elevator as ElevatorControl;
      const shipId = label.match(/^\d+/)?.[0];
      elevator.label = shipId ? `${shipId} 飞船升降梯` : "飞船升降梯";
      elevators.push(elevator);
    }
    placeObjectOnPlanet(lander, x, z, LANDER_SURFACE_SETTLE, yaw);
    base.add(lander);
    landmarks.push(landmark(label, lander, x, z, 42, 260));
    colliders.push(circle(x, z, 8.6, `${label}主体`));
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
}

function landmark(label: string, object: THREE.Object3D, x: number, z: number, labelDistance: number, mapRange: number): Landmark {
  return { label, object, x, z, labelDistance, mapRange };
}

function circle(x: number, z: number, radius: number, label: string): CircleCollider {
  return { center: new THREE.Vector2(x, z), radius, label };
}

function offsetCircle(x: number, z: number, yaw: number, localX: number, localZ: number, radius: number, label: string): CircleCollider {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return circle(x + localX * c - localZ * s, z + localX * s + localZ * c, radius, label);
}

function createTerrain() {
  const geometry = new THREE.SphereGeometry(PLANET_RADIUS, 96, 54);
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
      flatShading: true,
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
  const interiorSteel = new THREE.MeshStandardMaterial({
    color: 0x6b6f68,
    roughness: 0.72,
    metalness: 0.42,
    emissive: 0x121715,
    emissiveIntensity: 0.06,
    flatShading: true,
    side: THREE.DoubleSide,
  });
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
  const innerBack = new THREE.Mesh(new THREE.CylinderGeometry(1.68, 1.68, 0.08, 18), interiorSteel);
  innerBack.rotation.x = Math.PI / 2;
  innerBack.position.set(0, barrelCenterY, 2.54);
  const innerLightA = box(0.16, 1.42, 0.08, interiorPanel);
  innerLightA.position.set(-0.92, rocketInteriorFloorY + 1.9, -2.76);
  const innerLightB = innerLightA.clone();
  innerLightB.position.x = 0.92;
  const ceilingStrip = box(1.65, 0.06, 0.1, interiorPanel);
  ceilingStrip.position.set(0, rocketInteriorFloorY + 3.34, 0.3);
  const consolePanel = box(1.7, 0.48, 0.08, mat(0x5edcff, 0.2, 0.18, 0x238db1));
  consolePanel.position.set(0, rocketInteriorFloorY + 1.35, 2.29);
  const sideConsoleA = box(0.08, 0.52, 1.3, mat(0x36332e, 0.48, 0.44));
  sideConsoleA.position.set(-1.22, rocketInteriorFloorY + 0.64, -0.1);
  const sideConsoleB = sideConsoleA.clone();
  sideConsoleB.position.x = 1.22;
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
    innerBack,
    innerLightA,
    innerLightB,
    ceilingStrip,
    consolePanel,
    sideConsoleA,
    sideConsoleB,
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
    opacity: 0.46,
    roughness: 0.08,
    metalness: 0.04,
    flatShading: true,
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

  const sealedFloor = box(11.65, 0.12, 4.24, mat(0x272521, 0.84, 0.18));
  sealedFloor.position.set(0, -1.18, 0);
  const ceilingPanel = box(10.9, 0.12, 3.68, mat(0xd5c9b4, 0.68, 0.12));
  ceilingPanel.position.set(0, 1.46, 0);
  const rearWall = box(0.18, 2.58, 4.04, interior);
  rearWall.position.set(5.72, -0.04, 0);
  const leftEndWall = rearWall.clone();
  leftEndWall.position.x = -5.72;
  const frontLeftWall = box(4.78, 2.5, 0.16, interior);
  frontLeftWall.position.set(-3.18, -0.1, -2.06);
  const frontRightWall = frontLeftWall.clone();
  frontRightWall.position.x = 3.18;
  const rearAccent = box(0.08, 1.2, 2.35, mat(0x302a25, 0.72, 0.18));
  rearAccent.position.set(5.58, -0.1, 0);
  interiorScene.add(sealedFloor, ceilingPanel, rearWall, leftEndWall, frontLeftWall, frontRightWall, rearAccent);

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
  const interiorDoor = box(1.0, 1.78, 0.08, hull);
  interiorDoor.position.set(0, -0.3, -2.0);
  interiorDoor.visible = false;
  const step = box(1.35, 0.12, 0.82, mat(0x6a4b38, 0.9, 0.04));
  step.position.set(0, -1.98, -2.82);
  step.rotation.x = -0.08;
  group.add(doorFrame, exteriorMask, interiorPortal, doorLight, doorPanels, interiorDoor, step);

  const podXs = [-4.45, -2.95, -1.45, 0.05, 1.55, 3.05, 4.55];
  podXs.forEach((x, index) => {
    const z = index % 2 === 0 ? 1.24 : -1.22;
    const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.22, 5, 10), sleepShell);
    pod.rotation.z = Math.PI / 2;
    pod.position.set(x, -0.94, z);
    pod.castShadow = true;
    pod.receiveShadow = true;
    const lid = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.88, 5, 10), sleepGlass);
    lid.rotation.z = Math.PI / 2;
    lid.position.set(x, -0.62, z);
    lid.scale.set(1, 0.5, 0.72);
    lid.castShadow = true;
    const status = box(0.12, 0.08, 0.08, mat(index === 6 ? 0xffb15d : 0x8cffaa, 0.28, 0.2, index === 6 ? 0xff9d3d : 0x44ff88));
    status.position.set(x + 0.45, -0.72, z - Math.sign(z) * 0.36);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), trim);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(x, -0.62, z - Math.sign(z) * 0.42);
    rail.castShadow = true;
    group.add(pod, lid, status, rail);
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
    promptRadius: 7.2,
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

  const soil = mat(0x2c2118, 1);
  const leaf = mat(0x5fa45e, 0.8);
  for (let i = 0; i < 7; i += 1) {
    const bed = box(0.5, 0.18, 2.5, soil);
    bed.position.set(-2.25 + i * 0.75, 0.62, 0);
    const plant = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.65, 6), leaf);
    plant.position.set(bed.position.x, 1.0, 0.26);
    plant.castShadow = true;
    group.add(bed, plant);
  }

  const light = new THREE.PointLight(0x8cffaa, 1.4, 14);
  light.position.set(0, 3.6, 0);
  flickerLights.push(light);
  group.add(slab, base, dome, doorPad, leftPost, rightPost, lintel, sensorA, sensorB, doorPanels, light);
  group.userData.door = {
    root: group,
    doorPanels,
    interiorLight: light,
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
    [planetSurfacePoint(spread(-24.1), spread(20.2), 0.28), planetSurfacePoint(spread(5.5), spread(30.9), 0.28)],
    [planetSurfacePoint(spread(24.1), spread(-20.2), 0.28), planetSurfacePoint(spread(5.5), spread(30.9), 0.28)],
    [planetSurfacePoint(spread(-29.5), spread(-10.7), 0.28), planetSurfacePoint(spread(5.5), spread(30.9), 0.28)],
    [planetSurfacePoint(spread(29.5), spread(10.7), 0.28), planetSurfacePoint(spread(-5.5), spread(-30.9), 0.28)],
    [planetSurfacePoint(spread(21.5), spread(-122.2), 0.28), planetSurfacePoint(spread(-29.5), spread(-10.7), 0.28)],
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

function createRovers(parent: THREE.Group, rovers: THREE.Group[], colliders: CircleCollider[], landmarks: Landmark[]) {
  const configs = [
    { centerX: 0, centerZ: 0, patrolRadius: spread(174), speed: 0.058, offset: 0.25, size: 1.08, kind: "rover", route: "meridianLoop", label: "01 车辆 电动巡检车" },
    { centerX: spread(-118), centerZ: spread(132), patrolRadius: spread(8), speed: -0.3, offset: 1.7, size: 0.82, kind: "bot", label: "01 机器人 维修单元" },
    { centerX: spread(6), centerZ: spread(52), patrolRadius: spread(9), speed: 0.225, offset: 3.2, size: 0.78, kind: "bot", label: "02 机器人 巡逻单元" },
    { centerX: 0, centerZ: 0, patrolRadius: spread(174), speed: -0.0464, offset: 4.6, size: 1.08, kind: "cargo", route: "latitudeLoop", label: "02 车辆 运输车" },
    { centerX: spread(74), centerZ: spread(-116), patrolRadius: spread(8), speed: 0.156, offset: 5.7, size: 0.76, kind: "bot", label: "03 机器人 地质单元" },
    { centerX: spread(-154), centerZ: spread(158), patrolRadius: spread(8), speed: -0.144, offset: 0.9, size: 0.8, kind: "bot", label: "04 机器人 能源单元" },
    { centerX: spread(-170), centerZ: spread(-76), patrolRadius: spread(7), speed: 0.129, offset: 2.4, size: 0.74, kind: "bot", label: "05 机器人 货运单元" },
    { centerX: spread(62), centerZ: spread(-186), patrolRadius: spread(8), speed: -0.117, offset: 3.9, size: 0.78, kind: "bot", label: "06 机器人 温室单元" },
    { centerX: spread(68), centerZ: spread(178), patrolRadius: spread(7), speed: 0.102, offset: 5.1, size: 0.72, kind: "bot", label: "07 机器人 通信单元" },
    { centerX: spread(136), centerZ: spread(128), patrolRadius: spread(7), speed: -0.093, offset: 0.35, size: 0.76, kind: "bot", label: "08 机器人 医疗单元" },
  ];
  configs.forEach((config) => {
    const rover = config.kind === "bot" ? createUtilityBot(config.size) : createRover(config.size);
    rover.userData = { ...rover.userData, ...config, dynamicMap: true };
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

function createRover(size: number) {
  return createCybertruckRover(size);
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
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3 + randomA * 0.22, 10, 8),
    new THREE.MeshBasicMaterial({
      color: order === 1 ? 0xfff3c2 : 0xffd28a,
      transparent: true,
      opacity: 0.72 + randomB * 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  head.renderOrder = 3;

  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Array(9).fill(0), 3));
  const trail = new THREE.Line(
    trailGeometry,
    new THREE.LineBasicMaterial({
      color: order === 1 ? 0xfff5d0 : 0xffb86c,
      transparent: true,
      opacity: 0.36 + randomC * 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  trail.renderOrder = 2;

  const seed = new THREE.Vector3(Math.sin(starIndex * 12.9898), Math.cos(starIndex * 78.233), Math.sin(starIndex * 37.719)).normalize();
  let orbitAxis = direction.clone().cross(seed);
  if (orbitAxis.lengthSq() < 0.0001) {
    orbitAxis = direction.clone().cross(WORLD_UP);
  }
  if (orbitAxis.lengthSq() < 0.0001) {
    orbitAxis = direction.clone().cross(new THREE.Vector3(1, 0, 0));
  }
  orbitAxis.normalize();
  const wobbleAxis = orbitAxis.clone().cross(direction).normalize();

  return {
    head,
    trail,
    starAttribute,
    starIndex,
    startDirection: direction.clone(),
    orbitAxis,
    orbitMin: PLANET_RADIUS + 132 + randomA * 46,
    orbitMax: PLANET_RADIUS + 620 + randomB * 580,
    orbitSpeed: (0.018 + randomC * 0.056) * (order === 1 ? -1 : 1),
    phase: (randomA - 0.5) * 0.46,
    tailAngle: 0.018 + randomB * 0.05,
    wobbleAxis,
    wobbleSpeed: 0.27 + randomC * 0.42,
    wobbleAmount: 0.08 + randomA * 0.22,
  };
}

function seededNoise(seed: number, salt: number) {
  return THREE.MathUtils.clamp(Math.sin(seed * 12.9898 + salt) * 43758.5453 % 1, -1, 1) * 0.5 + 0.5;
}

function addRockField(scene: THREE.Scene, colliders: CircleCollider[]) {
  const rockMat = mat(0x8d4228, 1);
  for (let i = 0; i < 95; i += 1) {
    const radius = spread(6 + Math.random() * 31);
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
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

export function updateRovers(rovers: THREE.Group[], elapsed: number, colliders: CircleCollider[] = []) {
  rovers.forEach((rover) => {
    const { centerX, centerZ, patrolRadius, speed, offset, kind, route } = rover.userData as {
      centerX: number;
      centerZ: number;
      patrolRadius: number;
      speed: number;
      offset: number;
      kind?: string;
      route?: string;
      pauseUntil?: number;
    };
    if (kind === "bot" && (rover.userData.pauseUntil ?? -Infinity) > elapsed) return;
    const previousRouteElapsed = typeof rover.userData.routeElapsed === "number" ? rover.userData.routeElapsed : elapsed;
    const delta = THREE.MathUtils.clamp(elapsed - previousRouteElapsed, 0, 0.05);
    rover.userData.routeElapsed = elapsed;
    const angle = elapsed * speed + offset;
    if (route === "meridianLoop" || route === "latitudeLoop") {
      const directionSign = speed >= 0 ? 1 : -1;
      const vehicleRadius = kind === "cargo" ? 3.6 : 3.2;
      const targetNormal = avoidFixedColliders(vehicleRouteNormal(route, angle), colliders, vehicleRadius);
      const storedNormal = rover.userData.routeNormal as THREE.Vector3 | undefined;
      const normal = storedNormal
        ? steerNormalAtConstantRate(storedNormal, targetNormal, Math.max(Math.abs(speed) * delta * 2.4, 0.0016))
        : targetNormal.clone();
      rover.userData.routeNormal = normal.clone();
      const nextTargetNormal = avoidFixedColliders(vehicleRouteNormal(route, angle + directionSign * 0.035), colliders, vehicleRadius);
      const nextNormal = steerNormalAtConstantRate(normal, nextTargetNormal, Math.max(Math.abs(speed) * 0.035 * 2.4, 0.002));
      let forward = nextNormal.clone().addScaledVector(normal, -normal.dot(nextNormal));
      if (forward.lengthSq() < 0.000001) forward = vehicleRouteNormal(route, angle + directionSign * 0.035).addScaledVector(normal, -normal.dot(vehicleRouteNormal(route, angle + directionSign * 0.035)));
      forward.normalize();
      const yaw = yawFromForward(normal, forward);
      placeObjectOnPlanetNormal(rover, normal, 0.08, yaw);
      const projectedY = Math.abs(normal.y) < 0.08 ? Math.sign(normal.y || 1) * 0.08 : normal.y;
      rover.userData.planetX = (normal.x / projectedY) * PLANET_RADIUS;
      rover.userData.planetZ = (normal.z / projectedY) * PLANET_RADIUS;
      updateRoverWheelSpin(rover, elapsed, speed);
      return;
    }

    const x = route === "planetLoop" ? Math.cos(angle) * patrolRadius : centerX + Math.cos(angle) * patrolRadius;
    const z = route === "planetLoop" ? Math.sin(angle) * patrolRadius : centerZ + Math.sin(angle) * patrolRadius;
    const directionSign = speed >= 0 ? 1 : -1;
    const tangentX = -Math.sin(angle) * directionSign;
    const tangentZ = Math.cos(angle) * directionSign;
    const yaw = kind === "bot" || route === "planetLoop" ? Math.atan2(-tangentX, -tangentZ) : -angle + (speed > 0 ? Math.PI / 2 : -Math.PI / 2);
    placeObjectOnPlanet(rover, x, z, route === "planetLoop" ? 0.08 : 0.0, yaw);
    if (kind === "bot") updateUtilityBotWalk(rover, elapsed, speed);
    if (route === "planetLoop") updateRoverWheelSpin(rover, elapsed, speed);
  });
}

function vehicleRouteNormal(route: string, angle: number) {
  if (route === "meridianLoop") {
    return new THREE.Vector3(Math.sin(angle) * 0.92, Math.cos(angle), Math.sin(angle) * 0.38).normalize();
  }
  return new THREE.Vector3(Math.cos(angle), 0.34, Math.sin(angle)).normalize();
}

function avoidFixedColliders(normal: THREE.Vector3, colliders: CircleCollider[], vehicleRadius: number) {
  const adjusted = normal.clone();
  for (const collider of colliders) {
    if (collider.dynamicObject || collider.radius < 2.4) continue;
    if (collider.enabled && !collider.enabled()) continue;
    const colliderNormal = planetNormal(collider.center.x, collider.center.y, new THREE.Vector3());
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
    const halfTail = meteor.tailAngle * 0.5;
    const headPosition = meteorPositionAtAngle(meteor, angle, elapsed);
    const midPosition = meteorPositionAtAngle(meteor, angle - halfTail, elapsed);
    const tailPosition = meteorPositionAtAngle(meteor, angle - meteor.tailAngle, elapsed);
    const tailAttribute = meteor.trail.geometry.getAttribute("position") as THREE.BufferAttribute;

    meteor.head.position.copy(headPosition);
    tailAttribute.setXYZ(0, headPosition.x, headPosition.y, headPosition.z);
    tailAttribute.setXYZ(1, midPosition.x, midPosition.y, midPosition.z);
    tailAttribute.setXYZ(2, tailPosition.x, tailPosition.y, tailPosition.z);
    tailAttribute.needsUpdate = true;

    meteor.starAttribute.setXYZ(meteor.starIndex, headPosition.x, headPosition.y, headPosition.z);
    meteor.starAttribute.needsUpdate = true;
  });
}

function meteorPositionAtAngle(meteor: Meteor, angle: number, elapsed: number) {
  const distanceT = (1 - Math.cos(angle)) * 0.5;
  const radius = THREE.MathUtils.lerp(meteor.orbitMin, meteor.orbitMax, distanceT);
  const wobble = Math.sin(elapsed * meteor.wobbleSpeed + meteor.phase * 3.1) * meteor.wobbleAmount;
  return meteor.startDirection
    .clone()
    .applyAxisAngle(meteor.orbitAxis, angle)
    .applyAxisAngle(meteor.wobbleAxis, wobble)
    .normalize()
    .multiplyScalar(radius);
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
