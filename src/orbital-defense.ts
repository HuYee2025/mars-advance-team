import * as THREE from "three";
import { PLANET_RADIUS, placeObjectOnPlanetNormal, planetNormal, type CircleCollider } from "./world";

export type OrbitalDefensePhase = "idle" | "launch" | "combat" | "patrol" | "success" | "failed" | "return";

export type OrbitalDefenseEvent =
  | { type: "launched" }
  | { type: "combatStarted" }
  | { type: "hit"; integrity: number; remaining: number }
  | { type: "destroyed"; remaining: number }
  | { type: "asteroidDestroyed" }
  | { type: "crashed"; cause: "planet" | "asteroid" | "surface" }
  | { type: "failed" }
  | { type: "returned"; crashed?: boolean };

type LaserBolt = {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  age: number;
};

type ThreatState = {
  group: THREE.Group;
  start: THREE.Vector3;
  impact: THREE.Vector3;
  progress: number;
  integrity: number;
  active: boolean;
};

export type OrbitalDefenseSystem = {
  parkedShip: THREE.Group;
  parkedShips: THREE.Group[];
  parkedNormal: THREE.Vector3;
  selectedShipIndex: number;
  phase: OrbitalDefensePhase;
  active: boolean;
  unlocked: boolean;
  completed: boolean;
  ship: THREE.Group;
  threats: THREE.Group[];
  threatIntegrity: number;
  threatDistance: number;
  totalThreats: number;
  remainingThreats: number;
  missionTimeRemaining: number;
  missionTimeLimit: number;
  locked: boolean;
  speed: number;
  firstPerson: boolean;
  heavyLaserCooldown: number;
  aimCandidate: boolean;
  healthTarget: THREE.Group | null;
  start: (camera?: THREE.PerspectiveCamera) => void;
  fire: () => void;
  fireHeavyLaser: () => void;
  lockTarget: () => void;
  selectParkedShip: (index: number) => void;
  requestReturn: () => void;
  toggleCameraView: () => void;
  addLookDelta: (movementX: number, movementY: number) => void;
  update: (delta: number, elapsed: number, keys: ReadonlySet<string>, camera: THREE.Camera) => OrbitalDefenseEvent[];
  updateCamera: (delta: number, camera: THREE.PerspectiveCamera) => void;
  reset: () => void;
  setUnlocked: (unlocked: boolean) => void;
};

// 轨道高度以火星地表为基准。飞行器在无输入时会维持在此高度的环形轨道上。
const ORBIT_ALTITUDE = 500;
const ORBIT_LAUNCH_ARC_ANGLE = 1.05;
const LAUNCH_SLIDE_SECONDS = 1.5;
const LAUNCH_TOTAL_SECONDS = 7.2;
const LAUNCH_CAMERA_HANDOFF_SECONDS = 0.7;
const SHIP_FLIGHT_SCALE = 0.74;
export const ORBITAL_MISSION_TIME_LIMIT = 115;
const SHIP_CRUISE_SPEED = 34;
const SHIP_BOOST_SPEED = 76;
const SHIP_SLOW_SPEED = 16;
const SHIP_TURN_SPEED = 1.15;
const MAX_FLIGHT_PITCH = THREE.MathUtils.degToRad(34);
const ORBIT_RETURN_SPEED = 24;
const MAX_STRAFE_ROLL = THREE.MathUtils.degToRad(14);
const CRASH_RESPAWN_SECONDS = 0.9;
const THREAT_MAX_INTEGRITY = 8;
const AIM_LOCK_DOT = Math.cos(THREE.MathUtils.degToRad(7));
const HEAVY_LASER_COOLDOWN_SECONDS = 10;

const localForward = new THREE.Vector3(0, 0, -1);
const localUp = new THREE.Vector3(0, 1, 0);
const localRight = new THREE.Vector3(1, 0, 0);

export function createOrbitalDefenseSystem(
  scene: THREE.Scene,
  parkedNormals: readonly THREE.Vector3[],
  parkedYaw = -0.4,
  surfaceColliders: readonly CircleCollider[] = [],
): OrbitalDefenseSystem {
  const root = new THREE.Group();
  root.name = "ARES orbital defense mission";
  root.visible = false;
  scene.add(root);

  const accentConfigs = [
    { name: "Red", color: 0xa6382e, emissive: 0x240604 },
    { name: "Blue", color: 0x315f92, emissive: 0x06162b },
    { name: "Yellow", color: 0xb8882a, emissive: 0x2a1803 },
  ] as const;
  const parkedShips = parkedNormals.map((normal, index) => {
    const config = accentConfigs[index % accentConfigs.length];
    const parked = createAresXWing(config.color, config.emissive);
    parked.name = `ARES X-Wing ${config.name} parked`;
    parked.userData.colorName = config.name;
    parked.scale.setScalar(0.74);
    placeObjectOnPlanetNormal(parked, normal, 1.55, parkedYaw);
    setSFoilDeployment(parked, 0);
    setEngineGlowVisible(parked, false);
    scene.add(parked);
    return parked;
  });
  let selectedShipIndex = 0;
  let parkedShip = parkedShips[selectedShipIndex];
  const parkedNormal = parkedNormals[selectedShipIndex].clone();

  const ship = createAresXWing(accentConfigs[0].color, accentConfigs[0].emissive);
  ship.name = "ARES X-Wing orbital craft";
  ship.scale.setScalar(1.28);
  root.add(ship);

  const belt = createAsteroidBelt();
  root.add(belt);

  const threatStates: ThreatState[] = Array.from({ length: 7 }, (_, index) => {
    const group = createThreatAsteroid(index + 41);
    root.add(group);
    return {
      group,
      start: new THREE.Vector3(),
      impact: new THREE.Vector3(),
      progress: 0,
      integrity: THREAT_MAX_INTEGRITY,
      active: false,
    };
  });

  const boltRoot = new THREE.Group();
  boltRoot.name = "X-Wing laser bolts";
  root.add(boltRoot);

  const explosionRoot = new THREE.Group();
  explosionRoot.name = "Threat explosion";
  root.add(explosionRoot);

  const heavyBeamRoot = new THREE.Group();
  heavyBeamRoot.name = "X-Wing high-energy laser beam";
  root.add(heavyBeamRoot);

  const bolts: LaserBolt[] = [];
  const events: OrbitalDefenseEvent[] = [];
  const orbitStart = new THREE.Vector3();
  const scratchForward = new THREE.Vector3();
  const scratchUp = new THREE.Vector3();
  const scratchRight = new THREE.Vector3();
  const scratchTravelDirection = new THREE.Vector3();
  const scratchToTarget = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  const flightDirection = new THREE.Vector3();
  const returnStart = new THREE.Vector3();
  const returnStartNormal = new THREE.Vector3();
  const returnNormal = new THREE.Vector3();
  const launchGroundStart = new THREE.Vector3();
  const launchSlideEnd = new THREE.Vector3();
  const launchForward = new THREE.Vector3();
  const launchNormal = new THREE.Vector3();
  const launchTangent = new THREE.Vector3();
  const launchCameraPosition = new THREE.Vector3();
  const launchCameraUp = new THREE.Vector3();
  const flightUp = new THREE.Vector3(0, 1, 0);
  const previousShipPosition = new THREE.Vector3();
  const scratchAsteroidPosition = new THREE.Vector3();
  const scratchColliderNormal = new THREE.Vector3();
  const scratchScreenPosition = new THREE.Vector3();
  let phase: OrbitalDefensePhase = "idle";
  let unlocked = false;
  let phaseElapsed = 0;
  let threatIntegrity = THREAT_MAX_INTEGRITY;
  let totalThreats = 0;
  let remainingThreats = 0;
  let missionTimeRemaining = ORBITAL_MISSION_TIME_LIMIT;
  let fireCooldown = 0;
  let heavyLaserCooldown = 0;
  let heavyBeamAge = Infinity;
  let lookYaw = 0;
  let turnControl = 0;
  let pitchControl = 0;
  let strafeControl = 0;
  let crashRespawnPending = false;
  let speed = 0;
  let returnDuration = 5;
  let firstPerson = false;
  let launchSlideAngle = 0;
  let launchCameraFov = 54;
  let aimCandidateState: ThreatState | null = null;
  let lockedTargetState: ThreatState | null = null;

  const api: OrbitalDefenseSystem = {
    parkedShip,
    parkedShips,
    parkedNormal: parkedNormal.clone(),
    selectedShipIndex,
    phase,
    active: false,
    unlocked,
    completed: false,
    ship,
    threats: threatStates.map((state) => state.group),
    threatIntegrity,
    threatDistance: 0,
    totalThreats,
    remainingThreats,
    missionTimeRemaining,
    missionTimeLimit: ORBITAL_MISSION_TIME_LIMIT,
    locked: false,
    speed: 0,
    firstPerson,
    heavyLaserCooldown,
    aimCandidate: false,
    healthTarget: null,
    start,
    fire,
    fireHeavyLaser,
    lockTarget,
    selectParkedShip(index) {
      if (api.active || parkedShips.length === 0) return;
      selectedShipIndex = THREE.MathUtils.clamp(Math.round(index), 0, parkedShips.length - 1);
      parkedShip = parkedShips[selectedShipIndex];
      parkedNormal.copy(parkedNormals[selectedShipIndex]);
      api.parkedShip = parkedShip;
      api.parkedNormal.copy(parkedNormal);
      api.selectedShipIndex = selectedShipIndex;
    },
    requestReturn() {
      if (!api.active || (phase !== "combat" && phase !== "patrol")) return;
      phase = "return";
      phaseElapsed = 0;
      returnStart.copy(ship.position);
      returnStartNormal.copy(ship.position).normalize();
      returnDuration = THREE.MathUtils.clamp(ship.position.distanceTo(parkedShip.position) / 115, 5, 12);
      lockedTargetState = null;
      api.locked = false;
      api.healthTarget = null;
      for (const state of threatStates) state.group.visible = false;
      syncApi();
    },
    toggleCameraView() {
      if (!api.active || (phase !== "combat" && phase !== "patrol")) return;
      firstPerson = !firstPerson;
      api.firstPerson = firstPerson;
    },
    addLookDelta(movementX, movementY) {
      if (!api.active || (phase !== "combat" && phase !== "patrol")) return;
      lookYaw = THREE.MathUtils.clamp(lookYaw - movementX * 0.0019, -0.09, 0.09);
      // 纵向鼠标不直接翻转机身；上下飞行由 W/S 控制，避免屏幕稳定构图与鼠标姿态互相冲突。
      void movementY;
    },
    update,
    updateCamera,
    reset,
    setUnlocked(nextUnlocked) {
      unlocked = nextUnlocked;
      api.unlocked = unlocked;
      for (const parked of parkedShips) parked.visible = unlocked && (!api.active || parked !== parkedShip);
    },
  };

  reset();
  return api;

  function start(camera?: THREE.PerspectiveCamera) {
    if (api.active || !unlocked) return;
    phase = "launch";
    phaseElapsed = 0;
    threatIntegrity = THREAT_MAX_INTEGRITY;
    totalThreats = THREE.MathUtils.randInt(2, 7);
    remainingThreats = totalThreats;
    missionTimeRemaining = ORBITAL_MISSION_TIME_LIMIT;
    fireCooldown = 0;
    heavyLaserCooldown = 0;
    heavyBeamAge = Infinity;
    speed = 0;
    lookYaw = 0;
    turnControl = 0;
    pitchControl = 0;
    strafeControl = 0;
    crashRespawnPending = false;
    firstPerson = false;
    api.firstPerson = false;
    api.active = true;
    api.completed = false;
    api.locked = false;
    lockedTargetState = null;
    aimCandidateState = null;
    if (camera) {
      launchCameraPosition.copy(camera.position);
      launchCameraUp.copy(camera.up);
      launchCameraFov = camera.fov;
      flightUp.copy(camera.up).normalize();
    } else {
      flightUp.set(0, 1, 0);
    }
    for (const parked of parkedShips) parked.visible = false;
    applyShipAccent(ship, parkedShip);
    ship.visible = true;
    ship.scale.setScalar(SHIP_FLIGHT_SCALE);
    setSFoilDeployment(ship, 0);
    setEngineGlowVisible(ship, true);
    root.visible = true;
    clearBolts();
    clearExplosion(explosionRoot);
    clearHeavyLaserBeam(heavyBeamRoot);

    launchForward.copy(localForward).applyQuaternion(parkedShip.quaternion).projectOnPlane(parkedNormal).normalize();
    if (launchForward.lengthSq() < 0.001) launchForward.set(1, 0, 0).projectOnPlane(parkedNormal).normalize();
    launchSlideAngle = 16 / PLANET_RADIUS;
    launchNormal.copy(parkedNormal).multiplyScalar(Math.cos(launchSlideAngle)).addScaledVector(launchForward, Math.sin(launchSlideAngle)).normalize();
    launchGroundStart.copy(parkedShip.position);
    launchSlideEnd.copy(launchNormal).multiplyScalar(PLANET_RADIUS + 4.2);
    orbitStart.copy(parkedNormal)
      .multiplyScalar(Math.cos(ORBIT_LAUNCH_ARC_ANGLE))
      .addScaledVector(launchForward, Math.sin(ORBIT_LAUNCH_ARC_ANGLE))
      .normalize()
      .multiplyScalar(PLANET_RADIUS + ORBIT_ALTITUDE);
    for (const child of belt.children) {
      child.visible = true;
      child.userData.integrity = child.userData.maxIntegrity;
      const baseScale = child.userData.baseScale as THREE.Vector3 | undefined;
      if (baseScale) child.scale.copy(baseScale);
    }
    for (const [index, state] of threatStates.entries()) {
      state.active = index < totalThreats;
      state.integrity = THREAT_MAX_INTEGRITY;
      state.group.userData.integrity = THREAT_MAX_INTEGRITY;
      state.group.userData.maxIntegrity = THREAT_MAX_INTEGRITY;
      state.progress = 0;
      state.group.visible = false;
      if (!state.active) continue;
      const bearingAngle = 0.92 + (index / totalThreats) * Math.PI * 2 + THREE.MathUtils.randFloatSpread(0.38);
      const threatBearing = launchForward.clone().applyAxisAngle(parkedNormal, bearingAngle);
      state.start.copy(orbitStart)
        .addScaledVector(threatBearing, THREE.MathUtils.randFloat(148, 218))
        .addScaledVector(parkedNormal, THREE.MathUtils.randFloat(-48, -24));
      const impactDirection = launchForward.clone().applyAxisAngle(parkedNormal, bearingAngle * 0.73 + 0.35);
      const impactAngle = THREE.MathUtils.randFloat(7, 20) / PLANET_RADIUS;
      const impactNormal = parkedNormal.clone().multiplyScalar(Math.cos(impactAngle)).addScaledVector(impactDirection, Math.sin(impactAngle)).normalize();
      state.impact.copy(impactNormal).multiplyScalar(PLANET_RADIUS + 2.5);
      state.group.position.copy(state.start);
      state.group.scale.setScalar(THREE.MathUtils.randFloat(0.86, 1.16));
    }
    ship.position.copy(launchGroundStart);
    flightDirection.copy(launchForward);
    orientShip(ship, flightDirection, parkedNormal);
    events.push({ type: "launched" });
    syncApi();
  }

  function fire() {
    if (phase !== "combat" || fireCooldown > 0) return;
    fireCooldown = 0.16;
    const forward = scratchForward.copy(localForward).applyQuaternion(ship.quaternion).normalize();
    const right = scratchRight.copy(localRight).applyQuaternion(ship.quaternion).normalize();

    let bestTarget: ThreatState | null = null;
    let bestAsteroid: THREE.Mesh | null = null;
    let bestAim = firstPerson ? Math.cos(THREE.MathUtils.degToRad(1.8)) : AIM_LOCK_DOT;
    let aimDistance = 800;
    for (const state of threatStates) {
      if (!state.active || !state.group.visible) continue;
      scratchToTarget.copy(state.group.position).sub(ship.position);
      const distance = scratchToTarget.length();
      const aim = distance > 0 ? forward.dot(scratchToTarget.normalize()) : -1;
      if (distance < 800 && aim > bestAim) {
        bestAim = aim;
        aimDistance = distance;
        bestTarget = state;
        bestAsteroid = null;
      }
    }
    for (const child of belt.children) {
      if (!(child instanceof THREE.Mesh) || !child.visible || !child.userData.destructibleAsteroid) continue;
      child.getWorldPosition(scratchAsteroidPosition);
      scratchToTarget.copy(scratchAsteroidPosition).sub(ship.position);
      const distance = scratchToTarget.length();
      const aim = distance > 0 ? forward.dot(scratchToTarget.normalize()) : -1;
      if (distance < 800 && aim > bestAim) {
        bestAim = aim;
        aimDistance = distance;
        bestTarget = null;
        bestAsteroid = child;
      }
    }
    const aimPoint = ship.position.clone().addScaledVector(forward, aimDistance);
    for (const side of [-1, 1]) {
      const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.13, 2.4, 3, 6),
        new THREE.MeshBasicMaterial({ color: 0xff4f48, toneMapped: false }),
      );
      mesh.position.copy(ship.position).addScaledVector(forward, 4.6).addScaledVector(right, side * 3.15);
      const boltDirection = aimPoint.clone().sub(mesh.position).normalize();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), boltDirection);
      boltRoot.add(mesh);
      bolts.push({ mesh, velocity: boltDirection.multiplyScalar(210), age: 0 });
    }
    if (bestTarget) damageThreat(bestTarget);
    else if (bestAsteroid) damageBeltAsteroid(bestAsteroid);
  }

  function lockTarget() {
    if (phase !== "combat" || !aimCandidateState) return;
    lockedTargetState = aimCandidateState;
    api.locked = true;
    threatIntegrity = lockedTargetState.integrity;
    syncApi();
  }

  function fireHeavyLaser() {
    if (phase !== "combat" || !lockedTargetState || !lockedTargetState.active || heavyLaserCooldown > 0) return;
    heavyLaserCooldown = HEAVY_LASER_COOLDOWN_SECONDS;
    createHeavyLaserBeam(heavyBeamRoot, ship.position, lockedTargetState.group.position);
    heavyBeamAge = 0;
    damageThreat(lockedTargetState, lockedTargetState.integrity);
  }

  function damageThreat(state: ThreatState, damage = 1) {
    state.integrity = Math.max(0, state.integrity - damage);
    state.group.userData.integrity = state.integrity;
    threatIntegrity = state.integrity;
    events.push({ type: "hit", integrity: state.integrity, remaining: remainingThreats });
    pulseThreat(state.group);
    if (state.integrity > 0) return;
    state.active = false;
    state.group.visible = false;
    remainingThreats = Math.max(0, remainingThreats - 1);
    if (lockedTargetState === state) {
      lockedTargetState = null;
      api.locked = false;
    }
    createExplosion(explosionRoot, state.group.position);
    events.push({ type: "destroyed", remaining: remainingThreats });
    if (remainingThreats === 0) {
      phase = "patrol";
      phaseElapsed = 0;
      api.completed = true;
      api.locked = false;
    }
    syncApi();
  }

  function damageBeltAsteroid(asteroid: THREE.Mesh) {
    const integrity = Math.max(0, Number(asteroid.userData.integrity ?? 1) - 1);
    asteroid.userData.integrity = integrity;
    pulseBeltAsteroid(asteroid);
    if (integrity > 0) return;
    asteroid.getWorldPosition(scratchAsteroidPosition);
    root.worldToLocal(scratchAsteroidPosition);
    asteroid.visible = false;
    createExplosion(explosionRoot, scratchAsteroidPosition);
    events.push({ type: "asteroidDestroyed" });
  }

  function update(delta: number, elapsed: number, keys: ReadonlySet<string>, camera: THREE.Camera) {
    if (!api.active) return drainEvents();
    phaseElapsed += delta;
    fireCooldown = Math.max(0, fireCooldown - delta);
    heavyLaserCooldown = Math.max(0, heavyLaserCooldown - delta);
    if (phase === "combat" && (keys.has("Space") || keys.has("KeyJ"))) fire();
    belt.rotation.y += delta * 0.018;
    belt.rotation.z += delta * 0.006;
    updateBolts(delta);
    updateExplosion(explosionRoot, delta);
    if (heavyBeamAge !== Infinity) {
      heavyBeamAge += delta;
      updateHeavyLaserBeam(heavyBeamRoot, heavyBeamAge);
      if (heavyBeamAge > 0.34) heavyBeamAge = Infinity;
    }

    if (phase === "launch") {
      let launchArcAngle = launchSlideAngle;
      if (phaseElapsed <= LAUNCH_SLIDE_SECONDS) {
        const slideT = THREE.MathUtils.smoothstep(phaseElapsed, 0, LAUNCH_SLIDE_SECONDS);
        ship.position.lerpVectors(launchGroundStart, launchSlideEnd, slideT);
        flightDirection.copy(launchForward);
      } else {
        const climbT = THREE.MathUtils.smootherstep(phaseElapsed, LAUNCH_SLIDE_SECONDS, LAUNCH_TOTAL_SECONDS);
        launchArcAngle = THREE.MathUtils.lerp(launchSlideAngle, ORBIT_LAUNCH_ARC_ANGLE, climbT);
        const altitude = THREE.MathUtils.lerp(4.2, ORBIT_ALTITUDE, climbT);
        launchNormal.copy(parkedNormal)
          .multiplyScalar(Math.cos(launchArcAngle))
          .addScaledVector(launchForward, Math.sin(launchArcAngle))
          .normalize();
        ship.position.copy(launchNormal).multiplyScalar(PLANET_RADIUS + altitude);
        // 位置可以沿弧线爬升，但机体始终以火星外法线为上方；不让爬升导数把战机滚成侧翻姿态。
        launchTangent.copy(launchForward)
          .multiplyScalar(Math.cos(launchArcAngle))
          .addScaledVector(parkedNormal, -Math.sin(launchArcAngle))
          .projectOnPlane(launchNormal)
          .normalize();
        flightDirection.copy(launchTangent);
      }
      // 起飞阶段就采用与战斗阶段相同的屏幕水平航向，避免状态切换首帧再投影一次而产生跳帧。
      flightDirection.projectOnPlane(flightUp).normalize();
      orientShip(ship, flightDirection, flightUp);
      const deployment = THREE.MathUtils.smoothstep(phaseElapsed, 4.35, LAUNCH_TOTAL_SECONDS);
      setSFoilDeployment(ship, deployment);
      ship.scale.setScalar(SHIP_FLIGHT_SCALE);
      speed = THREE.MathUtils.lerp(8, SHIP_CRUISE_SPEED, THREE.MathUtils.smoothstep(phaseElapsed, 0, LAUNCH_TOTAL_SECONDS));
      if (phaseElapsed >= LAUNCH_TOTAL_SECONDS) {
        phase = "combat";
        phaseElapsed = 0;
        for (const state of threatStates) state.group.visible = state.active;
        flightDirection.projectOnPlane(flightUp).normalize();
        setSFoilDeployment(ship, 1);
        ship.scale.setScalar(SHIP_FLIGHT_SCALE);
        events.push({ type: "combatStarted" });
      }
    } else if (phase === "combat" || phase === "patrol") {
      updateFlight(delta, keys);
      let timedOut = false;
      if (phase === "combat") {
        missionTimeRemaining = Math.max(0, missionTimeRemaining - delta);
        for (const state of threatStates) {
          if (!state.active) continue;
          state.progress = 1 - missionTimeRemaining / ORBITAL_MISSION_TIME_LIMIT;
          const fallT = THREE.MathUtils.smootherstep(state.progress, 0, 1);
          state.group.position.lerpVectors(state.start, state.impact, fallT);
          state.group.rotation.x += delta * 0.62;
          state.group.rotation.y += delta * 0.38;
        }
        timedOut = missionTimeRemaining <= 0;
      }
      const collisionCause = getCollisionCause();
      if (collisionCause) {
        crashShip(collisionCause);
      } else if (timedOut) {
        phase = "failed";
        phaseElapsed = 0;
        for (const state of threatStates) state.group.visible = false;
        const missedThreat = threatStates.find((state) => state.active);
        if (missedThreat) createExplosion(explosionRoot, missedThreat.impact);
        events.push({ type: "failed" });
      }
    } else if (phase === "success" || phase === "failed") {
      speed *= Math.exp(-delta * 2.2);
      if (crashRespawnPending && phaseElapsed >= CRASH_RESPAWN_SECONDS) {
        finishOrbitalMission(true);
      } else if (phaseElapsed >= 3.2) {
        phase = "return";
        phaseElapsed = 0;
        returnStart.copy(ship.position);
        returnStartNormal.copy(ship.position).normalize();
        returnDuration = THREE.MathUtils.clamp(ship.position.distanceTo(parkedShip.position) / 115, 5, 12);
      }
    } else if (phase === "return") {
      const returnT = THREE.MathUtils.smootherstep(phaseElapsed, 0, returnDuration);
      returnNormal.copy(returnStartNormal).lerp(parkedNormal, returnT).normalize();
      const descentT = THREE.MathUtils.smoothstep(returnT, 0.38, 1);
      const radius = THREE.MathUtils.lerp(returnStart.length(), PLANET_RADIUS + 3, descentT);
      previousShipPosition.copy(ship.position);
      ship.position.copy(returnNormal).multiplyScalar(radius);
      // Q 返航沿同一飞行镜头连续导航；不播放另一段机翼收拢或镜头/姿态切换动画。
      void previousShipPosition;
      orientShip(ship, flightDirection, flightUp);
      if (phaseElapsed >= returnDuration) {
        finishOrbitalMission(false);
      }
    }

    scratchForward.copy(localForward).applyQuaternion(ship.quaternion).normalize();
    api.threatDistance = Infinity;
    aimCandidateState = null;
    let bestAim = AIM_LOCK_DOT;
    for (const state of threatStates) {
      if (!state.active || !state.group.visible) continue;
      scratchToTarget.copy(state.group.position).sub(ship.position);
      const distance = scratchToTarget.length();
      api.threatDistance = Math.min(api.threatDistance, distance);
      const aim = distance > 0 ? scratchForward.dot(scratchToTarget.normalize()) : -1;
      if (phase === "combat" && aim > bestAim) {
        bestAim = aim;
        aimCandidateState = state;
      }
    }
    if (lockedTargetState && !isThreatVisibleOnScreen(lockedTargetState, camera)) lockedTargetState = null;
    api.aimCandidate = Boolean(aimCandidateState);
    api.locked = Boolean(lockedTargetState);
    api.healthTarget = firstPerson && phase === "combat" ? (lockedTargetState ?? aimCandidateState)?.group ?? null : null;
    threatIntegrity = lockedTargetState?.integrity ?? aimCandidateState?.integrity ?? THREAT_MAX_INTEGRITY;
    if (!Number.isFinite(api.threatDistance)) api.threatDistance = 0;
    const engineGlow = ship.userData.engineGlow as THREE.Group | undefined;
    if (engineGlow) {
      const pulse = 1 + Math.sin(elapsed * 24) * 0.08 + speed / SHIP_BOOST_SPEED * 0.38;
      engineGlow.scale.set(1, 1, pulse);
    }
    syncApi();
    return drainEvents();
  }

  function updateFlight(delta: number, keys: ReadonlySet<string>) {
    const yawInput = (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) - (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0);
    const pitchInput = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
    const strafeInput = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const turnBlend = 1 - Math.pow(0.0008, delta);
    turnControl = THREE.MathUtils.lerp(turnControl, yawInput * 0.72, turnBlend);
    pitchControl = THREE.MathUtils.lerp(pitchControl, pitchInput * MAX_FLIGHT_PITCH, turnBlend);
    strafeControl = THREE.MathUtils.lerp(strafeControl, strafeInput, turnBlend);
    if (flightDirection.lengthSq() < 0.000001) flightDirection.copy(launchForward);
    // 鼠标和 A/D 都控制水平航向；A/D 同时提供侧移和侧身反馈，按住即可连续转向。
    flightDirection.projectOnPlane(flightUp).normalize();
    flightDirection.applyAxisAngle(flightUp, ((lookYaw + turnControl) * SHIP_TURN_SPEED) * delta).projectOnPlane(flightUp).normalize();
    lookYaw *= Math.pow(0.022, delta);

    const targetSpeed = keys.has("ShiftLeft") || keys.has("ShiftRight")
      ? SHIP_BOOST_SPEED
      : (keys.has("ControlLeft") || keys.has("ControlRight")
        ? SHIP_SLOW_SPEED
        : SHIP_CRUISE_SPEED);
    speed = THREE.MathUtils.lerp(speed, targetSpeed, 1 - Math.pow(0.045, delta));
    // 机头和镜头继续保持水平；W/S、A/D 只改变世界相对战机的移动向量。
    scratchRight.crossVectors(flightDirection, flightUp).normalize();
    scratchTravelDirection.copy(flightDirection)
      .multiplyScalar(Math.cos(pitchControl))
      .addScaledVector(flightUp, Math.sin(pitchControl))
      .addScaledVector(scratchRight, strafeControl * 0.62)
      .normalize();
    ship.position.addScaledVector(scratchTravelDirection, speed * delta);
    // 只有没有垂直/侧移输入时才以限速方式回归默认轨道，避免远距离时比例校正造成瞬移感。
    if (Math.abs(pitchControl) < 0.008 && Math.abs(strafeControl) < 0.008) {
      const currentRadius = ship.position.length();
      const correction = THREE.MathUtils.clamp(PLANET_RADIUS + ORBIT_ALTITUDE - currentRadius, -ORBIT_RETURN_SPEED * delta, ORBIT_RETURN_SPEED * delta);
      ship.position.setLength(Math.max(0.001, currentRadius + correction));
    }
    orientShip(ship, flightDirection, flightUp);
    ship.rotateZ(strafeControl * MAX_STRAFE_ROLL);
  }

  function updateCamera(delta: number, camera: THREE.PerspectiveCamera) {
    if (!api.active) return;
    const forward = scratchForward.copy(localForward).applyQuaternion(ship.quaternion).normalize();
    const up = scratchUp.copy(flightUp);
    if (firstPerson) {
      desiredCamera.copy(ship.position).addScaledVector(forward, 4.8).addScaledVector(up, 1.85);
      camera.position.lerp(desiredCamera, 1 - Math.pow(0.000004, delta));
      camera.up.lerp(up, 1 - Math.pow(0.000004, delta)).normalize();
      cameraTarget.copy(camera.position).addScaledVector(forward, 260);
      camera.lookAt(cameraTarget);
      camera.fov = THREE.MathUtils.lerp(camera.fov, speed > SHIP_CRUISE_SPEED + 8 ? 76 : 70, 1 - Math.pow(0.004, delta));
      camera.updateProjectionMatrix();
      return;
    }
    // 起飞、战斗和返航使用同一套追尾构图；起飞第一段从地面镜头连续过渡，不换远景或另一个相机状态。
    const distance = 23;
    const height = 7.6;
    const lookAhead = 132;
    const lookDown = 8;
    desiredCamera.copy(ship.position).addScaledVector(forward, -distance).addScaledVector(flightUp, height);
    if (phase === "launch" && phaseElapsed < LAUNCH_CAMERA_HANDOFF_SECONDS) {
      const handoff = THREE.MathUtils.smootherstep(phaseElapsed, 0, LAUNCH_CAMERA_HANDOFF_SECONDS);
      camera.position.lerpVectors(launchCameraPosition, desiredCamera, handoff);
      camera.up.lerpVectors(launchCameraUp, flightUp, handoff).normalize();
    } else {
      camera.position.lerp(desiredCamera, 1 - Math.pow(0.00002, delta));
      camera.up.lerp(flightUp, 1 - Math.pow(0.00002, delta)).normalize();
    }
    cameraTarget.copy(ship.position).addScaledVector(forward, lookAhead).addScaledVector(flightUp, -lookDown);
    camera.lookAt(cameraTarget);
    const targetFov = speed > SHIP_CRUISE_SPEED + 8 ? 64 : 60;
    camera.fov = phase === "launch"
      ? THREE.MathUtils.lerp(launchCameraFov, targetFov, THREE.MathUtils.smootherstep(phaseElapsed, 0, LAUNCH_CAMERA_HANDOFF_SECONDS))
      : THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.pow(0.005, delta));
    camera.updateProjectionMatrix();
  }

  function isThreatVisibleOnScreen(state: ThreatState, camera: THREE.Camera) {
    if (!state.active || !state.group.visible) return false;
    scratchScreenPosition.copy(state.group.position).project(camera);
    return scratchScreenPosition.z >= -1
      && scratchScreenPosition.z <= 1
      && Math.abs(scratchScreenPosition.x) <= 0.96
      && Math.abs(scratchScreenPosition.y) <= 0.96;
  }

  function getCollisionCause(): "planet" | "asteroid" | "surface" | null {
    const shipRadius = 3.1;
    if (ship.position.length() <= PLANET_RADIUS + shipRadius) return "planet";
    for (const state of threatStates) {
      const scale = Math.max(state.group.scale.x, state.group.scale.y, state.group.scale.z);
      if (state.active && state.group.visible && ship.position.distanceTo(state.group.position) < shipRadius + Number(state.group.userData.collisionRadius ?? 5.4) * scale) return "asteroid";
    }
    for (const child of belt.children) {
      if (!child.visible) continue;
      const collisionRadius = Number(child.userData.collisionRadius ?? 0);
      if (collisionRadius <= 0) continue;
      child.getWorldPosition(scratchAsteroidPosition);
      if (ship.position.distanceTo(scratchAsteroidPosition) < shipRadius + collisionRadius) return "asteroid";
    }
    const altitude = ship.position.length() - PLANET_RADIUS;
    if (altitude > 24) return null;
    for (const collider of surfaceColliders) {
      if (collider.enabled && !collider.enabled()) continue;
      if (collider.dynamicObject) scratchColliderNormal.copy(collider.dynamicObject.getWorldPosition(scratchColliderNormal)).normalize();
      else if (collider.normal) scratchColliderNormal.copy(collider.normal).normalize();
      else planetNormal(collider.center.x, collider.center.y, scratchColliderNormal);
      scratchAsteroidPosition.copy(scratchColliderNormal).multiplyScalar(PLANET_RADIUS + 2.5);
      const solidRadius = collider.radius + 2.4;
      if (ship.position.distanceTo(scratchAsteroidPosition) < shipRadius + solidRadius) return "surface";
    }
    return null;
  }

  function crashShip(cause: "planet" | "asteroid" | "surface") {
    phase = "failed";
    phaseElapsed = 0;
    crashRespawnPending = true;
    speed = 0;
    ship.visible = false;
    createExplosion(explosionRoot, ship.position);
    events.push({ type: "crashed", cause });
    syncApi();
  }

  function finishOrbitalMission(crashed: boolean) {
    api.active = false;
    root.visible = false;
    for (const parked of parkedShips) parked.visible = unlocked;
    setEngineGlowVisible(ship, false);
    ship.visible = true;
    phase = "idle";
    crashRespawnPending = false;
    events.push({ type: "returned", crashed });
  }

  function reset() {
    phase = "idle";
    unlocked = false;
    phaseElapsed = 0;
    threatIntegrity = THREAT_MAX_INTEGRITY;
    totalThreats = 0;
    remainingThreats = 0;
    missionTimeRemaining = ORBITAL_MISSION_TIME_LIMIT;
    fireCooldown = 0;
    heavyLaserCooldown = 0;
    heavyBeamAge = Infinity;
    speed = 0;
    lookYaw = 0;
    turnControl = 0;
    pitchControl = 0;
    strafeControl = 0;
    crashRespawnPending = false;
    firstPerson = false;
    api.active = false;
    api.unlocked = false;
    api.completed = false;
    api.firstPerson = false;
    api.locked = false;
    api.aimCandidate = false;
    api.healthTarget = null;
    selectedShipIndex = 0;
    parkedShip = parkedShips[0];
    parkedNormal.copy(parkedNormals[0]);
    api.parkedShip = parkedShip;
    api.parkedNormal.copy(parkedNormal);
    api.selectedShipIndex = selectedShipIndex;
    root.visible = false;
    for (const parked of parkedShips) {
      parked.visible = false;
      setSFoilDeployment(parked, 0);
      setEngineGlowVisible(parked, false);
    }
    setSFoilDeployment(ship, 0);
    setEngineGlowVisible(ship, false);
    for (const state of threatStates) {
      state.active = false;
      state.group.visible = false;
      state.integrity = THREAT_MAX_INTEGRITY;
      state.group.userData.integrity = THREAT_MAX_INTEGRITY;
      state.group.userData.maxIntegrity = THREAT_MAX_INTEGRITY;
      state.progress = 0;
    }
    clearBolts();
    clearExplosion(explosionRoot);
    clearHeavyLaserBeam(heavyBeamRoot);
    aimCandidateState = null;
    lockedTargetState = null;
    events.length = 0;
    syncApi();
  }

  function updateBolts(delta: number) {
    for (let index = bolts.length - 1; index >= 0; index -= 1) {
      const bolt = bolts[index];
      bolt.age += delta;
      bolt.mesh.position.addScaledVector(bolt.velocity, delta);
      if (bolt.age <= 3.2) continue;
      bolt.mesh.removeFromParent();
      bolt.mesh.geometry.dispose();
      (bolt.mesh.material as THREE.Material).dispose();
      bolts.splice(index, 1);
    }
  }

  function clearBolts() {
    for (const bolt of bolts) {
      bolt.mesh.geometry.dispose();
      (bolt.mesh.material as THREE.Material).dispose();
    }
    bolts.length = 0;
    boltRoot.clear();
  }

  function syncApi() {
    api.phase = phase;
    api.threatIntegrity = threatIntegrity;
    api.totalThreats = totalThreats;
    api.remainingThreats = remainingThreats;
    api.missionTimeRemaining = missionTimeRemaining;
    api.missionTimeLimit = ORBITAL_MISSION_TIME_LIMIT;
    api.speed = speed;
    api.heavyLaserCooldown = heavyLaserCooldown;
    api.aimCandidate = Boolean(aimCandidateState);
  }

  function drainEvents() {
    return events.splice(0, events.length);
  }
}

function createAresXWing(accentColor = 0xa6382e, accentEmissive = 0x240604) {
  const group = new THREE.Group();
  group.name = "T-65 inspired X-wing starfighter";
  const hull = material(0xc9c6b8, 0.72, 0.34);
  const hullLight = material(0xe2ded0, 0.65, 0.28);
  const weathered = material(0x77776f, 0.86, 0.24);
  const dark = material(0x25292b, 0.62, 0.56);
  const engineMetal = material(0x565d60, 0.48, 0.72);
  const accent = material(accentColor, 0.68, 0.26, accentEmissive);
  const glass = material(0x163342, 0.16, 0.72, 0x0b3348);
  const blue = material(0x2b5b8a, 0.58, 0.34, 0x07172a);
  const redEmitter = new THREE.MeshBasicMaterial({ color: 0xff4b42, toneMapped: false });

  const centerBody = new THREE.Mesh(new THREE.CylinderGeometry(1.04, 0.76, 5.2, 8), hull);
  centerBody.rotation.x = Math.PI / 2;
  centerBody.position.z = 0.25;
  group.add(centerBody);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.79, 6.6, 6), hullLight);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -4.45;
  group.add(nose);

  const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.18, 2.35), weathered);
  rearDeck.position.set(0, 0.02, 2.55);
  group.add(rearDeck);

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), glass);
  cockpit.scale.set(0.78, 0.68, 1.55);
  cockpit.position.set(0, 0.5, -1.7);
  group.add(cockpit);
  const canopySpine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 2.45), dark);
  canopySpine.position.set(0, 1.08, -1.62);
  canopySpine.rotation.x = -0.12;
  group.add(canopySpine);
  for (const x of [-0.62, 0.62]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 2.12), dark);
    frame.position.set(x, 0.86, -1.62);
    frame.rotation.z = x > 0 ? -0.24 : 0.24;
    group.add(frame);
  }

  const astromechBody = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.48, 12), hullLight);
  astromechBody.position.set(0.48, 0.86, 0.55);
  group.add(astromechBody);
  const astromechHead = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.56), blue);
  astromechHead.position.set(0.48, 1.1, 0.55);
  group.add(astromechHead);
  const astromechEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 5), redEmitter);
  astromechEye.position.set(0.48, 1.2, 0.25);
  group.add(astromechEye);

  for (const x of [-0.56, 0.56]) {
    const torpedoTube = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.52, 8), dark);
    torpedoTube.rotation.x = Math.PI / 2;
    torpedoTube.position.set(x, -0.28, -3.35);
    group.add(torpedoTube);
  }

  const noseStripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 3.15), accent);
  noseStripe.position.set(-0.45, 0.55, -4.35);
  noseStripe.rotation.z = -0.08;
  group.add(noseStripe);

  const wingGeometry = createXWingPanelGeometry();
  const engineGlow = new THREE.Group();
  const sFoilPivots: Array<{ foil: THREE.Group; glow: THREE.Group; openRotation: number }> = [];
  for (const side of [-1, 1]) {
    for (const vertical of [-1, 1]) {
      const sFoil = new THREE.Group();
      sFoil.name = `${vertical > 0 ? "upper" : "lower"} ${side > 0 ? "starboard" : "port"} S-foil`;
      sFoil.scale.x = side;
      const openRotation = side * vertical * 0.3;
      sFoil.rotation.z = 0;

      const wing = new THREE.Mesh(wingGeometry, hull);
      sFoil.add(wing);
      const wingInset = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 0.66), accent);
      wingInset.position.set(3.5, vertical * 0.12, 0.82);
      sFoil.add(wingInset);
      const panelLine = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.07, 0.08), dark);
      panelLine.position.set(3.15, vertical * 0.13, 1.72);
      panelLine.rotation.y = -0.09;
      sFoil.add(panelLine);

      const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 3.35, 12), engineMetal);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(1.7, 0, 0.82);
      sFoil.add(engine);
      const intakeRing = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.12, 6, 16), dark);
      intakeRing.position.set(1.7, 0, -0.88);
      sFoil.add(intakeRing);
      const intakeCore = new THREE.Mesh(new THREE.CircleGeometry(0.48, 16), blue);
      intakeCore.position.set(1.7, 0, -0.9);
      sFoil.add(intakeCore);
      const rearNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.6, 0.5, 12), dark);
      rearNozzle.rotation.x = Math.PI / 2;
      rearNozzle.position.set(1.7, 0, 2.68);
      sFoil.add(rearNozzle);

      const cannonMount = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 1.0, 8), engineMetal);
      cannonMount.rotation.x = Math.PI / 2;
      cannonMount.position.set(5.8, 0, -0.25);
      sFoil.add(cannonMount);
      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 5.5, 8), dark);
      cannon.rotation.x = Math.PI / 2;
      cannon.position.set(5.8, 0, -3.05);
      sFoil.add(cannon);
      const emitterCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.45, 8), accent);
      emitterCollar.rotation.x = Math.PI / 2;
      emitterCollar.position.set(5.8, 0, -5.62);
      sFoil.add(emitterCollar);
      const emitter = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), redEmitter);
      emitter.position.set(5.8, 0, -5.9);
      sFoil.add(emitter);
      group.add(sFoil);

      const glowPivot = new THREE.Group();
      glowPivot.scale.x = side;
      glowPivot.rotation.z = 0;
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.38, 2.35, 10),
        new THREE.MeshBasicMaterial({ color: 0x70eaff, transparent: true, opacity: 0.8, toneMapped: false }),
      );
      flame.rotation.x = Math.PI / 2;
      flame.position.set(1.7, 0, 4.0);
      glowPivot.add(flame);
      engineGlow.add(glowPivot);
      sFoilPivots.push({ foil: sFoil, glow: glowPivot, openRotation });
    }
  }
  group.add(engineGlow);
  group.userData.engineGlow = engineGlow;
  group.userData.sFoilPivots = sFoilPivots;
  group.userData.accentMaterial = accent;
  group.userData.accentColor = accentColor;
  group.userData.accentEmissive = accentEmissive;

  const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.72, 0.24), dark);
  rearPlate.position.set(0, 0, 3.7);
  group.add(rearPlate);
  for (const x of [-0.72, 0, 0.72]) {
    const rearLight = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), new THREE.MeshBasicMaterial({ color: 0xff6b4d, toneMapped: false }));
    rearLight.position.set(x, 0, 3.83);
    rearLight.rotation.y = Math.PI;
    group.add(rearLight);
  }

  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return group;
}

function applyShipAccent(target: THREE.Group, source: THREE.Group) {
  const targetMaterial = target.userData.accentMaterial as THREE.MeshStandardMaterial | undefined;
  if (!targetMaterial) return;
  const accentColor = Number(source.userData.accentColor ?? 0xa6382e);
  const accentEmissive = Number(source.userData.accentEmissive ?? 0x240604);
  targetMaterial.color.setHex(accentColor);
  targetMaterial.emissive.setHex(accentEmissive);
}

function setSFoilDeployment(ship: THREE.Group, amount: number) {
  const deployment = THREE.MathUtils.clamp(amount, 0, 1);
  const pivots = ship.userData.sFoilPivots as Array<{ foil: THREE.Group; glow: THREE.Group; openRotation: number }> | undefined;
  if (!pivots) return;
  for (const pivot of pivots) {
    const rotation = pivot.openRotation * deployment;
    pivot.foil.rotation.z = rotation;
    pivot.glow.rotation.z = rotation;
  }
}

function setEngineGlowVisible(ship: THREE.Group, visible: boolean) {
  const glow = ship.userData.engineGlow as THREE.Group | undefined;
  if (glow) glow.visible = visible;
}

function createXWingPanelGeometry() {
  const points = [
    [0.72, -1.55],
    [6.15, -0.62],
    [5.72, 2.62],
    [0.76, 2.18],
  ] as const;
  const positions: number[] = [];
  const thickness = 0.1;
  for (const y of [-thickness, thickness]) {
    for (const [x, z] of points) positions.push(x, y, z);
  }
  const indices = [
    0, 2, 1, 0, 3, 2,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6,
    3, 0, 4, 3, 4, 7,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createAsteroidBelt() {
  const belt = new THREE.Group();
  belt.name = "Mars outer asteroid ring";
  const rockMaterial = createMarsRockMaterial(0xaeb7bd);
  for (let index = 0; index < 174; index += 1) {
    const angle = seeded(index * 13.7) * Math.PI * 2;
    const radius = PLANET_RADIUS + 270 + seeded(index * 7.31 + 4) * 310;
    const height = (seeded(index * 9.17 + 8) - 0.5) * 168;
    const rock = new THREE.Mesh(createIrregularAsteroidGeometry(index * 17.41 + 7, 1, 2), rockMaterial);
    const scale = 0.48 + Math.pow(seeded(index * 4.63 + 11), 3.1) * 13.2;
    rock.scale.set(scale, scale * (0.5 + seeded(index + 2) * 0.95), scale * (0.56 + seeded(index + 7) * 0.82));
    rock.userData.collisionRadius = scale * Number(rock.geometry.boundingSphere?.radius ?? 1.15);
    rock.userData.maxIntegrity = Math.max(1, Math.ceil(scale / 2.4));
    rock.userData.integrity = rock.userData.maxIntegrity;
    rock.userData.baseScale = rock.scale.clone();
    rock.userData.destructibleAsteroid = true;
    rock.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    rock.rotation.set(seeded(index) * 6, seeded(index + 1) * 6, seeded(index + 2) * 6);
    belt.add(rock);
  }
  belt.rotation.x = 0.42;
  belt.rotation.z = -0.22;
  return belt;
}

function createThreatAsteroid(seed: number) {
  const group = new THREE.Group();
  group.name = "Base impact threat asteroid";
  const core = new THREE.Mesh(createIrregularAsteroidGeometry(seed, 5.2, 1), createMarsRockMaterial(0xa6382e, 0x2a0503));
  core.scale.set(1, 0.82 + seeded(seed + 1) * 0.24, 0.98 + seeded(seed + 2) * 0.32);
  group.add(core);
  const warningLight = new THREE.PointLight(0xff493f, 5.5, 34);
  group.add(warningLight);
  group.userData.integrity = THREAT_MAX_INTEGRITY;
  group.userData.maxIntegrity = THREAT_MAX_INTEGRITY;
  group.userData.collisionRadius = 6.5;
  return group;
}

/** Deterministic Mars-like boulder: broad faceted mass, no spiky or decorative petals. */
export function createIrregularAsteroidGeometry(seed: number, radius: number, detail: number) {
  const geometry = new THREE.IcosahedronGeometry(radius, Math.min(1, detail));
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const colors: number[] = [];
  const vertex = new THREE.Vector3();
  const base = new THREE.Color();
  const dark = new THREE.Color();
  const light = new THREE.Color();
  const stretchX = 0.78 + seeded(seed * 2.13 + 1) * 0.62;
  const stretchY = 0.72 + seeded(seed * 3.71 + 2) * 0.48;
  const stretchZ = 0.78 + seeded(seed * 5.29 + 3) * 0.62;
  const grayLevel = 0.36 + seeded(seed + 4) * 0.12;
  base.setRGB(grayLevel, grayLevel * 1.02, grayLevel * 1.04);
  dark.copy(base).multiplyScalar(0.58);
  light.copy(base).lerp(new THREE.Color(0xc3ccd0), 0.38);
  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    const unit = vertex.normalize();
    const broadNoise = Math.sin(unit.x * 3.1 + seed * 1.7) * 0.075
      + Math.cos(unit.y * 2.7 - seed * 1.3) * 0.065
      + Math.sin(unit.z * 3.8 + seed * 0.9) * 0.055;
    const faceNoise = seeded(seed * 31.7 + unit.x * 17.3 + unit.y * 29.1 + unit.z * 43.7) * 0.13 - 0.065;
    const radialScale = 0.91 + broadNoise + faceNoise;
    vertex.set(
      unit.x * radius * stretchX * radialScale,
      unit.y * radius * stretchY * radialScale,
      unit.z * radius * stretchZ * radialScale,
    );
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
    const shade = THREE.MathUtils.clamp((unit.y + 1) * 0.38 + seeded(seed * 7.7 + index * 0.91) * 0.24, 0, 1);
    const color = dark.clone().lerp(light, shade);
    colors.push(color.r, color.g, color.b);
  }
  positions.needsUpdate = true;
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.deleteAttribute("normal");
  geometry.computeBoundingSphere();
  return geometry;
}

function createMarsRockMaterial(color: number, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: emissive === 0x000000 ? 0 : 0.28,
    roughness: 0.96,
    metalness: 0,
    vertexColors: true,
    flatShading: true,
  });
}

function createHeavyLaserBeam(root: THREE.Group, start: THREE.Vector3, end: THREE.Vector3) {
  clearHeavyLaserBeam(root);
  const direction = end.clone().sub(start);
  const length = direction.length();
  const material = new THREE.MeshBasicMaterial({
    color: 0xff1e18,
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.58, length, 12), material);
  beam.position.copy(start).lerp(end, 0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  beam.userData.core = true;
  root.add(beam);
  const glow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 1.06, length, 12),
    new THREE.MeshBasicMaterial({
      color: 0xff3028,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  glow.position.copy(beam.position);
  glow.quaternion.copy(beam.quaternion);
  root.add(glow);
}

function updateHeavyLaserBeam(root: THREE.Group, age: number) {
  const opacity = Math.max(0, 1 - age / 0.34);
  for (const child of root.children) {
    if (!(child instanceof THREE.Mesh)) continue;
    const beamMaterial = child.material as THREE.MeshBasicMaterial;
    beamMaterial.opacity = opacity * (child.userData.core ? 0.96 : 0.22);
  }
  if (age > 0.34) clearHeavyLaserBeam(root);
}

function clearHeavyLaserBeam(root: THREE.Group) {
  for (const child of root.children) {
    if (!(child instanceof THREE.Mesh)) continue;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const beamMaterial of materials) beamMaterial.dispose();
  }
  root.clear();
}

function createExplosion(root: THREE.Group, position: THREE.Vector3) {
  clearExplosion(root);
  root.position.copy(position);
  root.userData.age = 0;
  for (let index = 0; index < 22; index += 1) {
    const fragment = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.35 + seeded(index * 2.3) * 0.8, 0),
      new THREE.MeshBasicMaterial({
        color: index % 3 === 0 ? 0xffd06a : 0xff5a32,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    const direction = new THREE.Vector3(seeded(index) - 0.5, seeded(index + 18) - 0.5, seeded(index + 37) - 0.5).normalize();
    fragment.userData.velocity = direction.multiplyScalar(7 + seeded(index + 90) * 18);
    root.add(fragment);
  }
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 12),
    new THREE.MeshBasicMaterial({
      color: 0xffc05f,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  flash.userData.flash = true;
  root.add(flash);
  const light = new THREE.PointLight(0xff5a32, 18, 86, 2);
  light.userData.explosionLight = true;
  root.add(light);
}

function updateExplosion(root: THREE.Group, delta: number) {
  if (root.children.length === 0) return;
  const age = Number(root.userData.age ?? 0) + delta;
  root.userData.age = age;
  for (const child of root.children) {
    if (child instanceof THREE.PointLight && child.userData.explosionLight) {
      child.intensity = Math.max(0, 18 * (1 - age / 0.7));
      continue;
    }
    if (!(child instanceof THREE.Mesh)) continue;
    const material = child.material as THREE.MeshBasicMaterial;
    if (child.userData.flash) {
      child.scale.setScalar(1 + age * 18);
      material.opacity = Math.max(0, 0.92 - age * 1.35);
    } else {
      child.position.addScaledVector(child.userData.velocity as THREE.Vector3, delta);
      child.rotation.x += delta * 3;
      child.rotation.y += delta * 2;
      material.opacity = Math.max(0, 1 - age * 0.42);
    }
  }
  if (age > 2.6) clearExplosion(root);
}

function clearExplosion(root: THREE.Group) {
  for (const child of root.children) {
    if (!(child instanceof THREE.Mesh)) continue;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const explosionMaterial of materials) explosionMaterial.dispose();
  }
  root.clear();
}

function pulseThreat(threat: THREE.Group) {
  threat.scale.setScalar(1.18);
  globalThis.setTimeout(() => {
    if (threat.visible) threat.scale.setScalar(1);
  }, 90);
}

function pulseBeltAsteroid(asteroid: THREE.Mesh) {
  const baseScale = asteroid.userData.baseScale as THREE.Vector3 | undefined;
  if (!baseScale) return;
  asteroid.scale.copy(baseScale).multiplyScalar(1.12);
  globalThis.setTimeout(() => {
    if (asteroid.visible) asteroid.scale.copy(baseScale);
  }, 90);
}

function orientShip(ship: THREE.Object3D, forward: THREE.Vector3, up: THREE.Vector3) {
  const matrix = new THREE.Matrix4().lookAt(new THREE.Vector3(), forward, up);
  ship.quaternion.setFromRotationMatrix(matrix);
}

function material(color: number, roughness = 0.72, metalness = 0.12, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity: emissive ? 0.72 : 0,
    flatShading: true,
  });
}

function seeded(value: number) {
  return Math.abs(Math.sin(value * 12.9898 + 78.233) * 43758.5453) % 1;
}
