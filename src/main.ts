import * as THREE from "three";
import backgroundMusicUrl from "./assets/audio/mars-background-light.mp3?url";
import sunCloseDetailTextureUrl from "./assets/sun-close-detail-texture.png?url";
import { createFufuCat, updateFufuCat } from "./cat";
import { MultiplayerClient } from "./multiplayer";
import type { PlayerInsideState } from "./multiplayer-protocol";
import {
  starlinkStatusText,
  starlinkStatusTextEn,
  updateStarlinkConstellation,
} from "./orbital-starlink";
import { computeMarsSunState, type MarsSunState } from "./mars-sun-model";
import { createMarsEngineer, updateMarsEngineer } from "./player";
import { createOrbitalDefenseSystem, type OrbitalDefenseEvent } from "./orbital-defense";
import { resolveGameMode } from "./core/game-state";
import { validateDialogueGraph } from "./core/dialogue-graph";
import { rankInteractionCandidates, type InteractionPriority } from "./core/interaction-system";
import { QUALITY_PROFILES, QUALITY_TIER_ORDER, type QualityTier } from "./core/quality";
import { SphericalCollisionWorld } from "./core/collision-world";
import {
  applySpiderBladeDamage,
  SPIDER_BLADE_COOLDOWN_SECONDS,
  SPIDER_BLADE_FORWARD_DOT,
  SPIDER_BLADE_RANGE,
  SPIDER_MAX_HEALTH,
} from "./core/spider-combat";
import { batchStaticMeshes } from "./core/static-batching";
import {
  classifyRadarContact,
  getRadarContactSignature,
  layoutRadarContact,
  selectRadarContacts,
  shouldShowParkedXWing,
  type RadarContact,
  type RadarContactKind,
  type RadarMode,
} from "./core/radar";
import { MAIN_MISSION_TARGETS, isAnomalyContentUnlocked, type MainMissionStep } from "./game/main-quests";
import { englishPhrasePairs, exactEnglishTexts, i18n, runtimeEnglishTexts, type LanguageCode } from "./i18n/catalog";
import {
  characters,
  dialogueEntryNodes,
  dialogueNodes,
  robotDialogueStartNodes,
  sceneStartNodes,
  type DialogueChoice,
  type DialogueEffect,
  type DialogueNode,
  type DialogueNodeId,
  type DialogueSceneId,
} from "./dialogue/dialogues";
import {
  AT_AT_SPAWN_X,
  AT_AT_SPAWN_Z,
  CRASHED_SHIP_SITE_NORMAL,
  PLANET_RADIUS,
  PLAYER_SPAWN_TARGET_X,
  PLAYER_SPAWN_TARGET_Z,
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Z,
  expandWorldCoordinate,
  createMarsWorld,
  placeObjectOnPlanetNormal,
  planetSurfacePointFromNormal,
  planetNormal,
  updateElevators,
  updateAncientTreePortal,
  updateDarkSpiders,
  updateMeteors,
  updateRovers,
  updateSolarArrays,
  type DarkSpider,
  type CircleCollider,
  type ElevatorControl,
  type GreenhouseDoorControl,
  type HabitatDoorControl,
  type Interactable,
  type Landmark,
} from "./world";
import {
  AT_AT_REQUIRED_SCORE,
  AT_AT_RIDE_COST_COINS,
  atAtEntryStatus,
  fireAtAtCannon,
  resetAtAtPose,
  updateAtAtWeapons,
  updateAtAtVisual,
} from "./world/at-at";
import "./style.css";

if (import.meta.env.DEV) {
  const dialogueValidation = validateDialogueGraph(dialogueNodes, dialogueEntryNodes);
  if (dialogueValidation.errors.length > 0 || dialogueValidation.unreachable.length > 0) {
    console.warn("Dialogue graph validation failed", dialogueValidation);
  }
}

type LabelAnchor = {
  object: THREE.Object3D;
  element: HTMLDivElement;
  distance: number;
};

type SpiderHealthHud = {
  root: HTMLDivElement;
  fill: HTMLSpanElement;
  value: HTMLSpanElement;
};

type InteractionAction = {
  id:
    | "elevator"
    | "habitat"
    | "greenhouse"
    | "ancientPortalConsider"
    | "ancientPortalPay"
    | "fufu"
    | "footballPickup"
    | "robot"
    | "robotOxygen"
    | "mission"
    | "photoWall"
    | "hitchRide"
    | "atAt"
    | "xWing"
    | "elonStatue";
  label: string;
};

type WormholeFallState = {
  startedAt: number;
  elapsed: number;
  paused: boolean;
  lastTriggerAt: number;
  drift: THREE.Vector2;
  velocity: THREE.Vector2;
  depth: number;
  depthVelocity: number;
  spawnNormal: THREE.Vector3;
  spawnForward: THREE.Vector3;
};

type WormholeOrganicSegment = {
  group: THREE.Group;
  z: number;
  seed: number;
  baseRotation: number;
  twist: number;
};

type WormholeWhiteoutParticle = {
  element: HTMLSpanElement;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  size: number;
  opacity: number;
  shrink: number;
};

type JetpackSource = "temporary" | "equipment" | null;

const sceneRoot = must<HTMLDivElement>("#scene-root");
const solarOverexposure = must<HTMLElement>("#solar-overexposure");
const spiderDamageVignette = must<HTMLElement>("#spider-damage-vignette");
const labelsRoot = must<HTMLDivElement>("#labels");
const wormholeWhiteoutOverlay = must<HTMLElement>("#wormhole-whiteout");
const wormholeWhiteoutParticlesRoot = must<HTMLDivElement>("#wormhole-whiteout-particles");
const joystick = must<HTMLDivElement>("#joystick");
const joystickKnob = must<HTMLDivElement>("#joystick-knob");
const mobileBoostButton = must<HTMLButtonElement>("#mobile-boost");
const mobileJumpButton = must<HTMLButtonElement>("#mobile-jump");
const visitorCounter = must<HTMLDivElement>("#visitor-counter");
const visitorCountReadout = must<HTMLElement>("#visitor-count");
const titleScreen = must<HTMLDivElement>("#title-screen");
const titleDateReadout = must<HTMLElement>("[data-i18n='title.eyebrow']");
const enterButton = must<HTMLButtonElement>("#enter-base");
const storySummaryButton = must<HTMLButtonElement>("#story-summary");
const titleActionButtons = [enterButton, storySummaryButton] as const;
const languageToggle = must<HTMLButtonElement>("#language-toggle");
const hudToggle = must<HTMLButtonElement>("#hud-toggle");
const missionToggle = must<HTMLButtonElement>("#mission-toggle");
const mapToggle = must<HTMLButtonElement>("#map-toggle");
const coinReadout = must<HTMLElement>("#coin-readout");
const scoreReadout = must<HTMLElement>("#score-readout");
const rankReadout = must<HTMLElement>("#rank-readout");
const missionText = must<HTMLDivElement>("#mission-text");
const orbitalDefenseHud = must<HTMLElement>("#orbital-defense-hud");
const orbitalThreatReadout = must<HTMLElement>("#orbital-threat-readout");
const orbitalTimeReadout = must<HTMLElement>("#orbital-time-readout");
const orbitalSpeedReadout = must<HTMLElement>("#orbital-speed-readout");
const orbitalViewReadout = must<HTMLElement>("#orbital-view-readout");
const orbitalTargetReadout = must<HTMLElement>("#orbital-target-readout");
const orbitalRadar = must<HTMLElement>("#orbital-radar");
const orbitalRadarThreats = must<HTMLElement>("#orbital-radar-threats");
const orbitalHeavyReadout = must<HTMLElement>("#orbital-heavy-readout");
const orbitalHealthBars = must<HTMLElement>("#orbital-health-bars");
const xWingColliderDebugReadout = must<HTMLElement>("#xwing-collider-debug");
const orbitalRadarForward = new THREE.Vector3();
const orbitalRadarRight = new THREE.Vector3();
const orbitalRadarToThreat = new THREE.Vector3();
const orbitalHealthBarPosition = new THREE.Vector3();
const promptBox = must<HTMLDivElement>("#interaction-prompt");
const interactionChoice = must<HTMLDivElement>("#interaction-choice");
const scaleGunOverlay = must<HTMLElement>("#scale-gun-overlay");
const scaleGunTargetLabel = must<HTMLElement>("#scale-gun-target");
const scaleGunSummary = must<HTMLElement>("#scale-gun-summary");
const scaleGunShrinkButton = must<HTMLButtonElement>("#scale-gun-shrink");
const scaleGunGrowButton = must<HTMLButtonElement>("#scale-gun-grow");
const cameraOverlay = must<HTMLElement>("#camera-overlay");
const cameraZoomReadout = must<HTMLElement>("#camera-zoom-readout");
const photoViewer = must<HTMLElement>("#photo-viewer");
const photoViewerTitle = must<HTMLElement>("#photo-viewer-title");
const photoViewerImage = must<HTMLImageElement>("#photo-viewer-image");
const dialogueBox = must<HTMLDivElement>("#dialogue-box");
const dialogueStage = must<HTMLElement>("#dialogue-stage");
const dialogueLeftSlot = must<HTMLDivElement>(".dialogue-portrait-left");
const dialogueRightSlot = must<HTMLDivElement>(".dialogue-portrait-right");
const dialogueLeftTag = must<HTMLDivElement>(".dialogue-character-tag-left");
const dialogueRightTag = must<HTMLDivElement>(".dialogue-character-tag-right");
const dialogueLeftPortrait = must<HTMLImageElement>("#dialogue-left-portrait");
const dialogueRightPortrait = must<HTMLImageElement>("#dialogue-right-portrait");
const dialogueLeftName = must<HTMLElement>("#dialogue-left-name");
const dialogueRightName = must<HTMLElement>("#dialogue-right-name");
const dialogueLeftCallsign = must<HTMLElement>("#dialogue-left-callsign");
const dialogueRightCallsign = must<HTMLElement>("#dialogue-right-callsign");
const dialogueSpeaker = must<HTMLElement>("#dialogue-speaker");
const dialogueStats = must<HTMLElement>("#dialogue-stats");
const dialogueItemImage = must<HTMLImageElement>("#dialogue-item-image");
const dialogueText = must<HTMLParagraphElement>("#dialogue-text");
const dialogueChoices = must<HTMLDivElement>("#dialogue-choices");
const dialogueContinue = must<HTMLButtonElement>("#dialogue-continue");
const exitConfirm = must<HTMLElement>("#exit-confirm");
const exitResumeButton = must<HTMLButtonElement>("#exit-resume");
const exitTitleButton = must<HTMLButtonElement>("#exit-title");
const exitConfirmButtons = [exitResumeButton, exitTitleButton] as const;
const controlsGuide = must<HTMLElement>("#controls-guide");
const mapOverlay = must<HTMLElement>("#map-overlay");
const mapRadar = must<HTMLDivElement>("#map-radar");
const mapCoordinates = must<HTMLDivElement>("#map-coordinates");
const mapHeading = must<HTMLDivElement>("#map-heading");
const radarSummary = must<HTMLDivElement>("#radar-summary");
const radarLegend = must<HTMLDivElement>("#radar-legend");
const fpsValue = must<HTMLElement>("#fps-value");
const mapList = must<HTMLDivElement>("#map-list");
const oxygenReadout = document.querySelector<HTMLDivElement>("#oxygen-readout");
const suitOxygenReadout = document.querySelector<HTMLDivElement>("#suit-oxygen-readout");
const staminaReadout = document.querySelector<HTMLDivElement>("#stamina-readout");
const jetpackStatusRow = document.querySelector<HTMLDivElement>("#jetpack-status-row");
const jetpackReadout = document.querySelector<HTMLDivElement>("#jetpack-readout");
const powerReadout = document.querySelector<HTMLDivElement>("#power-readout");
const onlineCountReadout = document.querySelector<HTMLDivElement>("#online-count-readout");
const backgroundMusic = new Audio(backgroundMusicUrl);
const BACKGROUND_MUSIC_BASE_VOLUME = 0.14;
const MUSIC_LOOP_FADE_SECONDS = 5;
backgroundMusic.loop = true;
backgroundMusic.preload = "none";
backgroundMusic.volume = BACKGROUND_MUSIC_BASE_VOLUME;
let backgroundMusicEnabled = true;

const scene = new THREE.Scene();
const clearSkyColor = new THREE.Color(0x030713);
const stormSkyColor = new THREE.Color(0x5b2417);
scene.background = clearSkyColor.clone();
scene.fog = new THREE.FogExp2(0x120a0a, 0.0014);

const QUALITY_PRESETS = QUALITY_PROFILES;
let activeQualityTier: QualityTier = isTouchLike() ? "balanced" : "high";
let manualQualityUntil = 0;

// X 翼默认轨道高出火星地表 500，远景星幕必须位于更远处而不被摄影机裁掉。
const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 3600);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
const EARTHLIKE_KEY_LIGHT = 7.2;
const CLEAR_FOG_DENSITY = 0.0014;
const STORM_FOG_DENSITY = 0.012;
const STORM_TIME_SCALE = 10;
const STORM_PERIOD_SECONDS = 4 * 60 * 60;
const STORM_DURATION_SECONDS = 1500;
const STORM_FADE_SECONDS = 260;
const TITLE_PLANET_VIEW_SCALE = 0.7;
const TITLE_CAMERA_DISTANCE = 230 / TITLE_PLANET_VIEW_SCALE;
const MARS_SOL_MILLISECONDS = 88775.244 * 1000;
const ARES_CALENDAR_EPOCH_UTC = Date.UTC(2026, 5, 26, 16, 0, 0);
const ARES_CALENDAR_BASE_YEAR = 2050;
const ARES_CALENDAR_BASE_SOL = 30;
const ARES_SOLS_PER_YEAR = 669;
const WORMHOLE_ORGANIC_SEGMENT_COUNT = 42;
const WORMHOLE_ORGANIC_SEGMENT_SPACING = 2.15;
const WORMHOLE_ORGANIC_FRONT_Z = -8.8;
const WORMHOLE_ORGANIC_LOOP_LENGTH = WORMHOLE_ORGANIC_SEGMENT_COUNT * WORMHOLE_ORGANIC_SEGMENT_SPACING;
const WORMHOLE_ORGANIC_BACK_Z = WORMHOLE_ORGANIC_FRONT_Z - WORMHOLE_ORGANIC_LOOP_LENGTH;
let sunLight: THREE.DirectionalLight | null = null;
let sunLightTarget: THREE.Object3D | null = null;
let sunBody: THREE.Group | null = null;
const SUN_VISUAL_SCALE = 1.48;
const sunWorldScaleVector = new THREE.Vector3();
const solarShadowTargetPosition = new THREE.Vector3();
let currentMarsSunState: MarsSunState = computeMarsSunState();
let solarOverexposureStrength = 0;
let solarHeatStaminaMultiplier = 1;
renderer.setPixelRatio(renderPixelRatio());
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = QUALITY_PRESETS[activeQualityTier].shadowsEnabled;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
sceneRoot.appendChild(renderer.domElement);

buildLighting();

const playerRig = createMarsEngineer();
const player = playerRig.group;
player.name = "X";
player.userData.trueName = "X";
player.userData.callsign = "022号巡检员";
scene.add(player);
const PLAYER_BASE_SCALE = 0.76;
player.scale.setScalar(PLAYER_BASE_SCALE);
const wormholeVisual = createWormholeFallVisual();
scene.add(wormholeVisual.group);

const PHOTO_WALL_CAPACITY = 36;
const CAMERA_MIN_ZOOM = 1;
const CAMERA_MAX_ZOOM = 4;
const cameraPhotos: Array<{ dataUrl: string; texture: THREE.Texture; takenAt: number }> = [];
let photoWallScreen: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
let photoWallScreenPhotoIndex = -2;
let photoWallStandbyTexture: THREE.CanvasTexture | null = null;
const world = createMarsWorld(scene);
const marsBaseRoot = world.root.getObjectByName("ARES Base Alpha");
const xWingParkingConfigs = [
  { x: expandWorldCoordinate(-9), z: expandWorldCoordinate(-48), color: "红色" },
  { x: expandWorldCoordinate(0), z: expandWorldCoordinate(-48), color: "蓝色" },
  { x: expandWorldCoordinate(9), z: expandWorldCoordinate(-48), color: "黄色" },
] as const;
const orbitalDefense = createOrbitalDefenseSystem(
  scene,
  xWingParkingConfigs.map((config) => planetNormal(config.x, config.z, new THREE.Vector3())),
  0,
  world.colliders,
);
let xWingColliderScale = 1;
const xWingColliderParts = orbitalDefense.parkedShips.flatMap((parkedShip, shipIndex) => [
  { name: "nose", local: new THREE.Vector3(0, 0, -3.7), baseRadius: 1.7 },
  { name: "body", local: new THREE.Vector3(0, 0, -0.4), baseRadius: 1.9 },
  { name: "tail", local: new THREE.Vector3(0, 0, 2.45), baseRadius: 1.65 },
  { name: "port-wing", local: new THREE.Vector3(-3.9, 0, 0.65), baseRadius: 1.5 },
  { name: "starboard-wing", local: new THREE.Vector3(3.9, 0, 0.65), baseRadius: 1.5 },
].map((part) => {
  const anchor = new THREE.Object3D();
  anchor.name = `ARES X-Wing ${shipIndex + 1} collider ${part.name}`;
  anchor.position.copy(part.local);
  parkedShip.add(anchor);
  const collider = {
    center: new THREE.Vector2(),
    radius: part.baseRadius,
    label: `ARES X-Wing ${shipIndex + 1} ${part.name}`,
    dynamicObject: anchor,
    enabled: () => orbitalDefense.unlocked && parkedShip.visible,
  };
  world.colliders.push(collider);
  return { ...part, shipIndex, anchor, collider };
}));
const xWingColliderDebugRings = xWingColliderParts.map(() => createXWingColliderDebugRing());
for (const ring of xWingColliderDebugRings) scene.add(ring);
const staticBatchExclusions = new Set<THREE.Object3D>([
  world.habitatDoor.doorPanels,
  world.habitatDoor.exteriorMask,
  world.habitatDoor.interiorPortal,
  world.habitatDoor.interiorDoor,
  world.habitatDoor.interiorScene,
  world.greenhouseDoor.doorPanels,
  world.ancientTreePortal,
]);
for (const elevator of world.elevators) {
  for (const object of [elevator.car, elevator.rocketDoorPanel, elevator.rocketDoorPortal, elevator.rocketInterior]) {
    if (object) staticBatchExclusions.add(object);
  }
}
for (const array of world.solarArrays) {
  for (const tracker of (array.userData.trackers as THREE.Object3D[] | undefined) ?? []) staticBatchExclusions.add(tracker);
}
const staticBatchRoots = world.landmarks
  .map((landmark) => landmark.object)
  .filter((object) => object.userData.dynamicMap !== true);
const staticBatchStats = batchStaticMeshes(staticBatchRoots, staticBatchExclusions);
void loadCoreLodModels();
const worldShadowCasters: THREE.Mesh[] = [];
world.root.traverse((object) => {
  if (!(object instanceof THREE.Mesh) || !object.castShadow) return;
  object.userData.qualityCastShadow = true;
  worldShadowCasters.push(object);
});
applyWorldShadowQuality(activeQualityTier);
const staticCollisionWorld = new SphericalCollisionWorld<CircleCollider>(PLANET_RADIUS);
const dynamicWorldColliders = world.colliders.filter((collider) => Boolean(collider.dynamicObject));
for (const collider of world.colliders) {
  if (collider.label === "黑色方碑") {
    collider.enabled = () => isAnomalySceneAccessible();
  }
}
for (const [index, collider] of world.colliders.entries()) {
  if (collider.dynamicObject) continue;
  staticCollisionWorld.add({
    id: `static-${index}`,
    normal: normalForCollider(collider, new THREE.Vector3()),
    shape: { kind: "circle", radius: collider.radius },
    source: collider,
  });
}
const photoWall = createPhotoWall();
world.habitatDoor.interiorScene.add(photoWall);
const multiplayer = new MultiplayerClient({ scene, camera, labelsRoot });
const fufuRig = createFufuCat();
const fufu = fufuRig.group;
scene.add(fufu);
const labels: LabelAnchor[] = world.landmarks.map(addLabel);
labels.push(addLabel({ label: "福福", object: fufu, x: world.fufuRescueSite.x, z: world.fufuRescueSite.z, labelDistance: 18, mapRange: 80 }));
const spiderHealthHuds = new Map<DarkSpider, SpiderHealthHud>();
for (const spider of world.darkSpiders) {
  const root = document.createElement("div");
  root.className = "spider-health-hud";
  root.hidden = true;
  const value = document.createElement("span");
  value.className = "spider-health-value";
  const track = document.createElement("span");
  track.className = "spider-health-track";
  const fill = document.createElement("span");
  fill.className = "spider-health-fill";
  track.appendChild(fill);
  root.append(value, track);
  labelsRoot.appendChild(root);
  spiderHealthHuds.set(spider, { root, fill, value });
}
for (const [index, parkedShip] of orbitalDefense.parkedShips.entries()) {
  const config = xWingParkingConfigs[index];
  labels.push(addLabel({
    label: `ARES X-Wing · ${config.color}`,
    object: parkedShip,
    x: config.x,
    z: config.z,
    labelDistance: 42,
    mapRange: 260,
  }));
}
const ancientTreeArchObject = world.landmarks.find((landmark) => landmark.label.includes("远古巨树拱门"))?.object ?? null;

const keyState = new Set<string>();
const playerVelocity = new THREE.Vector3();
const SPAWN_X = PLAYER_SPAWN_X;
const SPAWN_Z = PLAYER_SPAWN_Z;
const SPAWN_TARGET_X = PLAYER_SPAWN_TARGET_X;
const SPAWN_TARGET_Z = PLAYER_SPAWN_TARGET_Z;
const playerNormal = new THREE.Vector3();
const playerForward = new THREE.Vector3();
// 工程师程序化靴底在视觉根节点下约 0.46 单位；根节点过高会让人物悬空，
// 并在低角度阳光下产生与脚底脱离的长投影。
const PLAYER_ALTITUDE = 0.47;
const MARS_GRAVITY = 3.71;
const SUITED_JUMP_SPEED = 4.2;
const JUMP_FORWARD_BOOST = 2.2;
const WORMHOLE_FALL_DURATION = 30;
const WORMHOLE_START_ALTITUDE = 420;
const WORMHOLE_SAFE_LANDING_ALTITUDE = 0;
const WORMHOLE_DRIFT_LIMIT = 3.8;
const WORMHOLE_DRIFT_CONTROL_STRENGTH = 5.6;
const WORMHOLE_DRIFT_CENTER_PULL = 8.2;
const WORMHOLE_DRIFT_DAMPING = 7.4;
const WORMHOLE_TRIGGER_COOLDOWN = 6;
const WORMHOLE_TRIGGER_STRENGTH = 0.12;
const WORMHOLE_ORGANIC_RAMP_END = 0.66;
const WORMHOLE_INITIAL_SPEED_FACTOR = 0.42;
const WORMHOLE_PLAYER_SCALE_MULTIPLIER = 0.43;
const WORMHOLE_DRIFT_VISUAL_MULTIPLIER = 2;
const WORMHOLE_PLAYER_SCREEN_UP_OFFSET = 0.36;
const WORMHOLE_DEPTH_CONTROL_STRENGTH = 2.35;
const WORMHOLE_DEPTH_DAMPING = 2.55;
const WORMHOLE_DEPTH_MAX_SPEED = 0.72;
const WORMHOLE_FLOAT_CENTER_RADIUS = 0.18;
const WORMHOLE_FLOAT_CENTER_FORCE = 0.62;
const WORMHOLE_VISUAL_SPEED_MULTIPLIER = 2;
const WORMHOLE_DEPTH_BACK_DOLLY_MULTIPLIER = 1.42;
const WORMHOLE_WHITEOUT_PARTICLE_COUNT = 190;
const ANCIENT_PORTAL_PROMPT_SCALE = 1.2;
const ANCIENT_PORTAL_FLIGHT_PROMPT_MAX_HEIGHT = 230;
const ANCIENT_PORTAL_CORE_HALF_WIDTH = 10.8;
const ANCIENT_PORTAL_CORE_HALF_DEPTH = 9.5;
const WORMHOLE_WHITEOUT_HOLD_SECONDS = 3;
const WORMHOLE_WHITEOUT_SCATTER_SECONDS = 0.75;
const WORMHOLE_WHITEOUT_SECONDS = WORMHOLE_WHITEOUT_HOLD_SECONDS + WORMHOLE_WHITEOUT_SCATTER_SECONDS;
const ANCIENT_TREE_ARCH_DISCOVERY_RADIUS = 76;
const FUFU_SURFACE_ALTITUDE = 0.13;
const MOBILE_FLIGHT_CODE = "UUDDLLRR";
const SUIT_OXYGEN_MAX = 100;
const SUIT_OXYGEN_WALK_DRAIN_PER_SECOND = 0.294;
const SUIT_OXYGEN_SPRINT_MULTIPLIER = 1.5;
const FUFU_OXYGEN_DRAIN_MULTIPLIER = 0.75;
const JETPACK_MAX_ENERGY = 100;
const JETPACK_DRAIN_PER_SECOND = SUIT_OXYGEN_WALK_DRAIN_PER_SECOND * 1.25;
const JETPACK_RECOVERY_SECONDS = 10;
const JETPACK_JUMP_DOUBLE_TAP_MS = 360;
const OXYGEN_SUPPLY_RADAR_THRESHOLD = 35;
const SUIT_OXYGEN_WARNING_THRESHOLD = 20;
const STAMINA_MAX = 100;
const STAMINA_DRAIN_TUNING_MULTIPLIER = 1.75;
const STAMINA_WALK_DRAIN_PER_SECOND = (0.42 / 2) * STAMINA_DRAIN_TUNING_MULTIPLIER;
const STAMINA_SPRINT_DRAIN_PER_SECOND = STAMINA_WALK_DRAIN_PER_SECOND * 2;
const STAMINA_JUMP_DRAIN_PER_SECOND = STAMINA_WALK_DRAIN_PER_SECOND * 0.5;
const STAMINA_JUMP_COST = STAMINA_WALK_DRAIN_PER_SECOND * 0.5;
const STAMINA_STAND_RECOVERY_PER_SECOND = 1.35;
const STAMINA_LOW_THRESHOLD = 20;
const SCORE_MAIN_TASK = 100;
const SCORE_SIDE_TASK = 40;
const SCORE_BUILDING_EXPLORE = 10;
const SCORE_HIDDEN_DISCOVERY = 30;
const SCORE_ALL_BUILDINGS_EXPLORED = 100;
const SCORE_FUNNY_DEFAULT = 10;
const SCORE_FUNNY_PENALTY = -10;
const SCORE_FUFU_RESCUE = SCORE_SIDE_TASK;
const ROVER_RIDE_COST_COINS = 10;
const SCORE_ROVER_RIDE = 10;
const ANCIENT_PORTAL_COST_COINS = 50;
const SCORE_WORMHOLE_TRAVERSAL = 200;
// 所有已完成场景从开局可访问；装备仍通过对应玩法获得。
const ENABLE_TEST_TOOLS = import.meta.env.DEV;
const ALL_PLAYABLE_CONTENT_UNLOCKED = true;
const ANCIENT_PORTAL_ACTIVE_SECONDS = 28.5;
const ELEVATOR_FOOT_CLEARANCE = 0.045;
const CAMERA_OBSTRUCTION_MARGIN = 0.9;
const CAMERA_OBSTRUCTION_MAX_LIFT = 7.4;
const FOOTBALL_RADIUS = 0.44;
const FOOTBALL_REST_ALTITUDE = FOOTBALL_RADIUS + 0.035;
const FOOTBALL_PLAYER_RADIUS = 0.82;
const FOOTBALL_GROUND_FRICTION = 0.31;
const FOOTBALL_AIR_DRAG = 0.035;
const FOOTBALL_STATIC_RESTITUTION = 0.58;
const FOOTBALL_DYNAMIC_RESTITUTION = 0.72;
const FOOTBALL_KICK_VERTICAL_MIN = 0.42;
const FOOTBALL_KICK_VERTICAL_SCALE = 0.16;
const FOOTBALL_KICK_POWER = 2.0;
const FOOTBALL_MAX_SPEED = 33;
const FOOTBALL_SPAWN_X = expandWorldCoordinate(23);
const FOOTBALL_SPAWN_Z = expandWorldCoordinate(49);
const FOOTBALL_GOAL_COOLDOWN_SECONDS = 1.2;
const FOOTBALL_PICKUP_RADIUS = 2.4;
const FOOTBALL_CARRY_FORWARD_DISTANCE = 1.35;
const FOOTBALL_CARRY_ALTITUDE = FOOTBALL_REST_ALTITUDE + 1.05;
const SCORE_FOOTBALL_GOAL = 100;
const COIN_GROUP_COUNT = 3;
const COIN_GROUP_SIZE = 10;
const COIN_REFRESH_SECONDS = 2 * 60;
const COIN_COLLECT_RADIUS = 1.45;
const COIN_SAFE_MARGIN = 3.2;
const COIN_LINE_SPACING = 2.05;
const COIN_GROUP_SAFE_DISTANCE = 36;
const ROVER_RIDE_PROMPT_RADIUS = 5.4;
const ROVER_RIDE_SEAT_HEIGHT = 2.28;
const ROVER_RIDE_EXIT_DISTANCE = 4.7;
const AT_AT_PROMPT_RADIUS = 6.8;
const AT_AT_WALK_SPEED = 4.2;
const AT_AT_FAST_SPEED = 7;
const AT_AT_REVERSE_SPEED = 2.4;
const MYSTERY_CODE = "HUYEE";
const XWING_COLLIDER_DEBUG_CODE = "HUYEE-U";
const MONEY_CODE = "MONEY";
const TEST_MODE_SCORE = 9999;
const FLIGHT_ASCEND_SPEED = 8.2;
const FLIGHT_DESCEND_SPEED = 8.2;
const FLIGHT_MIN_ALTITUDE = 1.2;
const FLIGHT_MAX_ALTITUDE = 96;
const FLIGHT_LANDING_SURFACE_CLEARANCE = 0.82;
const FLIGHT_LANDING_SURFACE_MARGIN = 0.28;
const SCALE_GUN_RANGE = 620;
const SCALE_GUN_DURATION_SECONDS = 60;
const SCALE_GUN_MIN_FACTOR = 1 / 4;
const SCALE_GUN_MAX_FACTOR = 4;
const SCALE_GUN_AIM_YAW_SPEED = 1.75;
const SCALE_GUN_AIM_PITCH_SPEED = 1.18;
const SCALE_GUN_AIM_PITCH_MIN = -1.05;
const SCALE_GUN_AIM_PITCH_MAX = 1.18;
const SPIDER_TOUCH_DAMAGE = 20;
const SPIDER_TOUCH_COOLDOWN_SECONDS = 1.15;
const SPIDER_DAMAGE_GLOBAL_COOLDOWN_SECONDS = 0.78;
const SPIDER_TOUCH_DISTANCE = 3.8;
const SPIDER_KNOCKBACK_DISTANCE = 5.4;
const LASER_SWORD_LIGHT_INTENSITY = 6.76;
const LASER_SWORD_LIGHT_DISTANCE = 20;
const LASER_SWORD_RAISED_LIGHT_INTENSITY = LASER_SWORD_LIGHT_INTENSITY * 2;
const LASER_SWORD_RAISED_LIGHT_DISTANCE = LASER_SWORD_LIGHT_DISTANCE * 2;
const laserSwordWorldLight = new THREE.PointLight(0xbfeaff, 0, LASER_SWORD_RAISED_LIGHT_DISTANCE, 1.65);
laserSwordWorldLight.visible = false;
scene.add(laserSwordWorldLight);
const laserSwordLightWorldPosition = new THREE.Vector3();
const laserSwordViewDirection = new THREE.Vector3();
const mobileStick = { active: false, pointerId: null as number | null, x: 0, y: 0 };

type ScaleGunTarget = {
  label: string;
  object: THREE.Object3D;
  kind?: "starlink" | "meteor" | "spider";
};

type ScaleGunEffect = {
  baseScale: THREE.Vector3;
  factor: number;
  expiresAt: number;
};

type CoinPickup = {
  group: THREE.Group;
  normal: THREE.Vector3;
  owner: CoinGroup | null;
  collected: boolean;
};

type CoinGroup = {
  coins: CoinPickup[];
  centerNormal: THREE.Vector3;
  centerX: number;
  centerZ: number;
  expiresAt: number;
};

type PlayerRankId =
  | "internPatrol"
  | "juniorAstronaut"
  | "astronaut"
  | "seniorAstronaut"
  | "marsMissionSpecialist"
  | "deputyCommander"
  | "firstResident";

type FootballState = {
  group: THREE.Group;
  ball: THREE.Mesh;
  shadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  normal: THREE.Vector3;
  velocity: THREE.Vector3;
  altitude: number;
  verticalVelocity: number;
  lastPlayerKickAt: number;
};

type FootballGoalState = {
  goals: number;
  lastScoredAt: number;
};

type MapItem = {
  id: string;
  label: string;
  object: THREE.Object3D | null;
  x: number;
  z: number;
  mapRange: number;
  type: RadarContactKind;
  unknown: boolean;
  missionTarget: boolean;
  oxygenSupplyTarget: boolean;
  coinTarget: boolean;
  heading: number;
  moving: boolean;
  priority: number;
};

type SideMissionStep = "available" | "medical" | "habitat" | "cargoShip" | "garage" | "lab" | "storehouse" | "solarA" | "tower" | "complete";
type SideMissionId = "fufu" | "cargo" | "patrol";

const mainMissionTargets = MAIN_MISSION_TARGETS;

const sideMissionTargets: Record<SideMissionId, Partial<Record<SideMissionStep, Interactable["id"]>>> = {
  fufu: {
    medical: "medical",
    habitat: "habitatCheck",
  },
  cargo: {
    cargoShip: "cargoShip",
    garage: "garage",
    lab: "lab",
    storehouse: "storehouse",
  },
  patrol: {
    solarA: "solarA",
    tower: "tower",
    lab: "lab",
  },
};


const explorableBuildingIds = new Set<Interactable["id"]>([
  "habitatCheck",
  "greenhouse",
  "oxygen",
  "methane",
  "garage",
  "tower",
  "lab",
  "storehouse",
  "medical",
]);

const colliderExplorationRules: Array<{ key: string; match: string; label?: string; interactableId?: Interactable["id"] }> = [
  { key: "habitat", match: "居住舱", interactableId: "habitatCheck" },
  { key: "greenhouse", match: "温室", interactableId: "greenhouse" },
  { key: "oxygen", match: "氧气生产站", interactableId: "oxygen" },
  { key: "methane", match: "甲烷燃料厂", interactableId: "methane" },
  { key: "garage", match: "机器人车库", interactableId: "garage" },
  { key: "tower", match: "通信塔", interactableId: "tower" },
  { key: "lab", match: "科研舱", interactableId: "lab" },
  { key: "storehouse", match: "物资仓", interactableId: "storehouse" },
  { key: "medical", match: "医疗舱", interactableId: "medical" },
  { key: "solar_a", match: "太阳能阵列 A", interactableId: "solarA" },
  { key: "solar_b", match: "太阳能阵列 B", interactableId: "solarB" },
  { key: "solar_c", match: "太阳能阵列 C", interactableId: "solarC" },
  { key: "lander_01", match: "登陆飞船", label: "01 飞船 登陆飞船" },
  { key: "lander_02", match: "货运飞船", label: "02 飞船 货运飞船" },
  { key: "lander_03", match: "返回飞船", label: "03 飞船 返回飞船" },
];

const rankRules: Array<{ id: PlayerRankId; score: number; taskRequired?: boolean; storyOnly?: boolean }> = [
  { id: "internPatrol", score: 0 },
  { id: "juniorAstronaut", score: 100, taskRequired: true },
  { id: "astronaut", score: 300 },
  { id: "seniorAstronaut", score: 700 },
  { id: "marsMissionSpecialist", score: 1500 },
  { id: "deputyCommander", score: 3000 },
  { id: "firstResident", score: Infinity, storyOnly: true },
];

const elonDialogueCycle: DialogueNodeId[] = ["elon_rules_1", "elon_base_1", "elon_steve_1", "elon_fufu_1", "elon_robots_1"];

const LANG_STORAGE_KEY = "mars.language";
let currentLanguage: LanguageCode = readInitialLanguage();
let visitorTotal: number | null = null;
let visitorCounterStatus: "loading" | "ready" | "unavailable" = "loading";

let yaw = Math.PI * 0.15;
let pitch = 0.34;
let orbitYawOffset = 0;
const DEFAULT_THIRD_PERSON_CAMERA_DISTANCE = 10;
let cameraDistance = DEFAULT_THIRD_PERSON_CAMERA_DISTANCE;
let exitFrontCamera: { origin: THREE.Vector3; releaseDistance: number; lift: number; distance: number; mode: "front" | "rear" } | null = null;
let cameraObstructionLift = 0;
const CAMERA_MIN_DISTANCE = 0.08;
const CAMERA_MAX_DISTANCE = 280;
const PERFORMANCE_SAMPLE_INTERVAL_MS = 500;
const QUALITY_CHANGE_COOLDOWN_MS = 3_000;
const QUALITY_RECOVERY_COOLDOWN_MS = 8_000;
const PHOTO_CAPTURE_MAX_EDGE = 1600;
let lastQualityTierChangeAt = -Infinity;
let lastInterfaceUpdateAt = -Infinity;
let lastMapUpdateAt = -Infinity;
const radarMarkerNodes = new Map<string, HTMLDivElement>();
let radarContactSignature = "";
let lastFrameTime = performance.now();
let performanceSampleStartedAt = lastFrameTime;
let performanceSampleFrames = 0;
let performanceSampleFrameMsTotal = 0;
let averageFrameDurationMs = 0;
let elapsedTime = 0;
let started = false;
let activeInteractable: Interactable | null = null;
let activeExplorable: Interactable | null = null;
let activeElevator: ElevatorControl | null = null;
let activeHabitatDoor: HabitatDoorControl | null = null;
let ridingElevator: ElevatorControl | null = null;
let activeRideRover: THREE.Group | null = null;
let ridingRover: THREE.Group | null = null;
let activeAtAt = false;
let ridingAtAt = false;
let atAtFirstPerson = true;
let atAtExitPromptUntil = -Infinity;
let missionStep: MainMissionStep = "intro";
let anomalyContentVisible = true;
let messageUntil = 0;
let scorePoints = 0;
let coins = 0;
let currentRank: PlayerRankId = "internPatrol";
let completedAnyTask = false;
let hudCollapsed = false;
let missionPanelOpen = false;
let missionUnread = false;
let missionIntroTimer: ReturnType<typeof window.setTimeout> | null = null;
let mapOpen = false;
let mapExpanded = false;
let selectedTitleActionIndex = 0;
let exitConfirmOpen = false;
let selectedExitConfirmIndex = 0;
let mapHoldTimer: ReturnType<typeof window.setTimeout> | null = null;
let mapHoldTriggered = false;
let mapHoldPreviousOpen = false;
let mapZoom = 1;
let playerAltitudeOffset = 0;
let verticalVelocity = 0;
let lastSpiderDamageAt = -Infinity;
let grounded = true;
let rocketDoorOpen = false;
let insideRocket = false;
let stormStrength = 0;
let activeGreenhouseDoor: GreenhouseDoorControl | null = null;
let activeAncientPortal = false;
let activeRobot: THREE.Group | null = null;
let activeElonStatue: Interactable | null = null;
let activeFufu = false;
let activeFootball = false;
let activeOrbitalDefense = false;
let activeXWingIndex = -1;
let suitOxygen = SUIT_OXYGEN_MAX;
let stamina = STAMINA_MAX;
let oxygenWarningShown = false;
let staminaWarningShown = false;
let fufuRescued = false;
let footballCarried = false;
let mysteryCodeProgress = "";
let testModeEnabled = false;
let xWingCollisionDebugEnabled = false;
let moneyCodeProgress = "";
let moneyCheatCoinsRemaining = 0;
let moneyCheatTimer: ReturnType<typeof window.setInterval> | null = null;
let mobileFlightCodeProgress = "";
let flightModeEnabled = false;
let jetpackUnlocked = false;
let jetpackEnergy = JETPACK_MAX_ENERGY;
let jetpackActiveSource: JetpackSource = null;
let jetpackRecoveryStartedAt = -Infinity;
let jetpackRecoveryStartEnergy = JETPACK_MAX_ENERGY;
let keyboardFlightCodeProgress = "";
let lastJumpPressAt = -Infinity;
let lastCanvasTapAt = 0;
let lastCanvasTapX = 0;
let lastCanvasTapY = 0;
let hasScaleGun = false;
let scaleGunAiming = false;
let scaleGunTarget: ScaleGunTarget | null = null;
let lastScaleGunTargetUuid: string | null = null;
let scaleGunCameraDistanceBefore = DEFAULT_THIRD_PERSON_CAMERA_DISTANCE;
let hasLaserSword = false;
let laserSwordActive = false;
let laserSwordRaised = false;
let lastLaserSwordAttackAt = -Infinity;
let lastLaserSwordLockedPromptAt = -Infinity;
let hasCamera = false;
let cameraMode = false;
let cameraZoom = 1;
let cameraDistanceBeforeCamera = DEFAULT_THIRD_PERSON_CAMERA_DISTANCE;
let photoViewerOpen = false;
let photoViewerIndex = 0;
let photoViewerZoom = 1;
let fufuSideStep: SideMissionStep = "available";
let cargoSideStep: SideMissionStep = "available";
let patrolSideStep: SideMissionStep = "available";
let elonMet = false;
let elonDialogueIndex = 0;
let fufuSpeed = 0;
let fufuAlert = 0;
let fufuWanderAngle = -2.25;
let fufuWanderDistance = 3.1;
let fufuNextWanderAt = 0;
let insideGreenhouse = false;
let lastRobotGreetingAt = -Infinity;
let controlsGuideOpen = false;
let controlsGuideUsed = false;
let activeDialogueNode: DialogueNodeId | null = null;
let dialogueOpen = false;
let pendingSteveCall: DialogueSceneId | null = null;
const STEVE_CALL_IDLE_DISMISS_SECONDS = 30;
const STEVE_CALL_IDLE_RETRY_SECONDS = 60;
let steveCallRetryAt = 0;
let pendingSteveCallQueuedAt = -Infinity;
let gameStartElapsed = 0;
let introMovementConfirmed = false;
let introIdlePromptShown = false;
let introMissionReminderShown = false;
let introCallQueued = false;
const shownOperationHelpIds = new Set<string>();
let interactionActions: InteractionAction[] = [];
let selectedInteractionIndex = 0;
let interactionChoiceOpen = false;
let interactionChoiceSignature = "";
let selectedDialogueChoiceIndex = 0;
let dialogueTextPages: string[] = [];
let dialogueTextPageIndex = 0;
const dialogueHistory: Array<{ nodeId: DialogueNodeId; pageIndex: number }> = [];
const appliedDialogueChoiceEffects = new Set<string>();
const currentCoinGroups: CoinGroup[] = [];
let nextCoinRefreshAt = 0;
let coinSymbolMaterial: THREE.MeshBasicMaterial | null = null;
let wormholeFall: WormholeFallState | null = null;
let wormholeWhiteoutUntil = -Infinity;
let wormholeWhiteoutStartedAt = -Infinity;
let wormholeTriggerArmed = true;
let lastWormholeTriggerAt = -Infinity;
let ancientPortalPromptDismissedInZone = false;
const wormholeWhiteoutParticles: WormholeWhiteoutParticle[] = [];
const awardedEvents = new Set<string>();
const exploredBuildings = new Set<Interactable["id"]>();
const hiddenDiscoveries = new Set<string>();
const talkedRobotIds = new Set<string>();
const ANCIENT_TREE_ARCH_DISCOVERY_ID = "unknown:ancient-tree-arch";
const dialogueState = {
  steveTrust: 0,
  baseIntegrity: 0,
  humanAutonomy: 0,
};
const ROCKET_HATCH_STOP_X = 2.56;
const ROCKET_PLATFORM_SPLIT_X = 1.1;
const habitatHiddenObjects = new Map<THREE.Object3D, boolean>();
const rocketHiddenObjects = new Map<THREE.Object3D, boolean>();
const elevatorRideLocal = new THREE.Vector3();
const habitatLocal = new THREE.Vector3(0, -0.76, -1.55);
const greenhouseLocal = new THREE.Vector3(0, 0.62, -2.65);
const fufuNormal = new THREE.Vector3();
const fufuForward = new THREE.Vector3();
const fufuRestForward = new THREE.Vector3();
let monolithAudioContext: AudioContext | null = null;
let nextMonolithBeepAt = 0;
let uiAudioContext: AudioContext | null = null;
const scaleGunRaycaster = new THREE.Raycaster();
scaleGunRaycaster.layers.enable(2);
const scaleGunEffects = new Map<string, ScaleGunEffect>();
const elevatorSurfaceBoxes = new WeakMap<THREE.Object3D, THREE.Box3>();
const roverPreviousPositions = new WeakMap<THREE.Object3D, THREE.Vector3>();
const staticTextSources = new WeakMap<Text, string>();
const football = createFootball();
const footballGoal: FootballGoalState = { goals: 0, lastScoredAt: -Infinity };
scene.add(football.group, football.shadow);

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    __marsDebug?: {
      teleportTo: (id: Interactable["id"]) => void;
      mission: () => string;
      mode: () => string;
      setQuality: (tier: QualityTier) => void;
      performance: () => {
        frameMs: number;
        quality: QualityTier;
        drawCalls: number;
        triangles: number;
        staticColliders: number;
        staticBatchSources: number;
        staticBatchMeshes: number;
        visibleMeshes: number;
        visibleStaticBatches: number;
        meshBreakdown: Array<{ name: string; meshes: number }>;
        baseMeshBreakdown: Array<{ name: string; meshes: number }>;
      };
      wormhole: () => { portalStrength: number; inDoorway: boolean; local: { x: number; y: number; z: number }; armed: boolean; falling: boolean };
    };
  }
}

if (import.meta.env.DEV) {
  window.__marsDebug = {
    teleportTo(id) {
      const target = world.interactables.find((item) => item.id === id);
      if (!target) return;
      playerNormal.copy(planetNormal((target.object.userData.planetX ?? 0) + 2.4, (target.object.userData.planetZ ?? 0) + 1.2));
      playerForward.projectOnPlane(playerNormal).normalize();
      placePlayerOnPlanet();
      playerVelocity.set(0, 0, 0);
      updateMissionState();
    },
    mission: () => missionStep,
    mode: () => currentGameMode(),
    setQuality: (tier) => {
      manualQualityUntil = performance.now() + 30_000;
      applyQualityTier(tier, performance.now());
    },
    performance: () => {
      let visibleMeshes = 0;
      let visibleStaticBatches = 0;
      scene.traverseVisible((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        visibleMeshes += 1;
        if (object.userData.staticBatch === true) visibleStaticBatches += 1;
      });
      const meshBreakdown = world.root.children.map((rootChild, index) => {
        let meshes = 0;
        rootChild.traverseVisible((object) => { if (object instanceof THREE.Mesh) meshes += 1; });
        return { name: rootChild.name || rootChild.type || `child-${index}`, meshes };
      }).filter((item) => item.meshes > 0).sort((a, b) => b.meshes - a.meshes).slice(0, 8);
      const baseRoot = world.root.children.find((child) => child.name === "ARES Base Alpha");
      const baseMeshBreakdown = (baseRoot?.children ?? []).map((rootChild, index) => {
        let meshes = 0;
        rootChild.traverseVisible((object) => { if (object instanceof THREE.Mesh) meshes += 1; });
        return { name: rootChild.name || String(rootChild.userData.label ?? rootChild.type ?? `base-child-${index}`), meshes };
      }).filter((item) => item.meshes > 0).sort((a, b) => b.meshes - a.meshes).slice(0, 12);
      return {
        frameMs: Number(averageFrameDurationMs.toFixed(2)),
        quality: activeQualityTier,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        staticColliders: staticCollisionWorld.size,
        staticBatchSources: staticBatchStats.sourceMeshes,
        staticBatchMeshes: staticBatchStats.batchMeshes,
        visibleMeshes,
        visibleStaticBatches,
        meshBreakdown,
        baseMeshBreakdown,
      };
    },
    wormhole: () => {
      const local = ancientTreeArchObject ? ancientTreeArchObject.worldToLocal(player.position.clone()) : new THREE.Vector3();
      return {
        portalStrength: Number(world.ancientTreePortal.userData.portalStrength ?? 0),
        inDoorway: ancientTreeArchObject ? isInsideAncientTreeDoorway(local) : false,
        inPaymentZone: ancientTreeArchObject ? isInsideAncientTreePortalPaymentZone() : false,
        inPortalCore: ancientTreeArchObject ? isInsideAncientTreePortalCore(local) : false,
        local: {
          x: Number(local.x.toFixed(2)),
          y: Number(local.y.toFixed(2)),
          z: Number(local.z.toFixed(2)),
        },
        armed: wormholeTriggerArmed,
        falling: Boolean(wormholeFall),
      };
    },
  };
}

resetPlayerToSpawn();
resetFufu();
bindInput();
reportVisitorStats();
onResize();
setMission("点击 ENTER BASE 进入《火星先遣队》。");
updateTitleDateReadout();
window.setInterval(updateTitleDateReadout, 60_000);
startBackgroundMusic();
animate();

function must<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing DOM node: ${selector}`);
  return node;
}

function buildLighting() {
  scene.add(new THREE.HemisphereLight(0xf7dcc2, 0x3f130b, 0.78));

  const sun = new THREE.DirectionalLight(0xffd2a3, EARTHLIKE_KEY_LIGHT * currentMarsSunState.irradianceRatio);
  sun.position.set(-36, 54, 28);
  sun.castShadow = true;
  const shadowMapSize = QUALITY_PRESETS[activeQualityTier].shadowMapSize;
  const shadowDistance = QUALITY_PRESETS[activeQualityTier].shadowDistance;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.035;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = shadowDistance * 3.5;
  sun.shadow.camera.left = -shadowDistance;
  sun.shadow.camera.right = shadowDistance;
  sun.shadow.camera.top = shadowDistance;
  sun.shadow.camera.bottom = -shadowDistance;
  sun.shadow.camera.updateProjectionMatrix();
  const target = new THREE.Object3D();
  target.name = "Solar shadow target";
  scene.add(target);
  sun.target = target;
  scene.add(sun);
  sunLight = sun;
  sunLightTarget = target;
  sunBody = createVisibleSun(sun.position);
  scene.add(sunBody);

  const rim = new THREE.DirectionalLight(0x8fc7ff, 0.48);
  rim.position.set(28, 16, -44);
  scene.add(rim);
}

function updateSolarLighting() {
  if (!sunLight || !sunBody) return;
  currentMarsSunState = computeMarsSunState();
  const direction = currentMarsSunState.direction;
  const visibleSunScale = THREE.MathUtils.clamp(sunBody.getWorldScale(sunWorldScaleVector).x, 0.35, 4);
  const stormDim = THREE.MathUtils.lerp(1, 0.42, stormStrength);
  const scaleLightBoost = THREE.MathUtils.clamp(visibleSunScale, 0.45, 4);
  solarHeatStaminaMultiplier = visibleSunScale >= 3 ? visibleSunScale : 1;
  const shadowTargetPosition = solarShadowTargetPosition.copy(player.position.lengthSq() > 0.001 ? player.position : scene.position);
  if (sunLightTarget) {
    sunLightTarget.position.copy(shadowTargetPosition);
    sunLightTarget.updateMatrixWorld();
  }
  sunLight.position.copy(shadowTargetPosition).addScaledVector(direction, 260);
  sunLight.intensity = EARTHLIKE_KEY_LIGHT * currentMarsSunState.irradianceRatio * stormDim * scaleLightBoost;
  sunBody.position.copy(direction).multiplyScalar(540);
  const occluded = isSunOccludedByPlanet(sunBody.position);
  sunBody.visible = !occluded;
  solarOverexposureStrength = !occluded ? THREE.MathUtils.smoothstep(visibleSunScale, 2.2, 4) : 0;
  const overexposureOpacity = solarOverexposureStrength * THREE.MathUtils.lerp(0.78, 0.28, stormStrength);
  solarOverexposure.style.setProperty("--solar-overexposure-opacity", overexposureOpacity.toFixed(3));
  setVisibleSunOpacity(sunBody, THREE.MathUtils.lerp(1, 0.28, stormStrength));
  updateVisibleSunFire(sunBody);
}

function isSunOccludedByPlanet(sunPosition: THREE.Vector3) {
  const toSun = sunPosition.clone().sub(camera.position);
  const distanceToSun = toSun.length();
  if (distanceToSun <= 0.001) return false;
  const direction = toSun.multiplyScalar(1 / distanceToSun);
  const closestT = -camera.position.dot(direction);
  if (closestT <= 0 || closestT >= distanceToSun) return false;
  const closest = camera.position.clone().addScaledVector(direction, closestT);
  return closest.lengthSq() < (PLANET_RADIUS + 1.2) * (PLANET_RADIUS + 1.2);
}

function createVisibleSun(direction: THREE.Vector3) {
  const group = new THREE.Group();
  const sunDiscTexture = createSunDiscTexture();
  const rayTexture = createSunRayTexture();
  const haloTexture = createSunHaloTexture();
  const closeDetailTexture = createSunCloseDetailTexture();
  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunDiscTexture,
    transparent: true,
    opacity: 1.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }));
  sunDisc.scale.setScalar(15 * SUN_VISUAL_SCALE);
  const rays = new THREE.Sprite(new THREE.SpriteMaterial({
    map: rayTexture,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }));
  rays.scale.setScalar(94 * SUN_VISUAL_SCALE);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloTexture,
    transparent: true,
    opacity: 0.66,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }));
  halo.scale.setScalar(118 * SUN_VISUAL_SCALE);
  const closeBacklight = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunDiscTexture,
    color: new THREE.Color(1.18, 1.12, 0.98),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }));
  closeBacklight.scale.setScalar(48 * SUN_VISUAL_SCALE);
  const closeDetail = new THREE.Sprite(new THREE.SpriteMaterial({
    map: closeDetailTexture,
    color: new THREE.Color(1.24, 1.16, 1.02),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }));
  closeDetail.scale.setScalar(46 * SUN_VISUAL_SCALE);
  const orderedSunSprites = [halo, rays, sunDisc, closeBacklight, closeDetail];
  orderedSunSprites.forEach((sprite, index) => {
    sprite.renderOrder = 60 + index;
    sprite.material.depthTest = true;
  });
  sunDisc.userData.baseOpacity = 1.45;
  sunDisc.userData.sunPart = "disc";
  sunDisc.userData.baseScale = 15 * SUN_VISUAL_SCALE;
  rays.userData.baseOpacity = 0.36;
  rays.userData.sunPart = "rays";
  rays.userData.baseScale = 94 * SUN_VISUAL_SCALE;
  halo.userData.baseOpacity = 0.66;
  halo.userData.sunPart = "halo";
  halo.userData.baseScale = 118 * SUN_VISUAL_SCALE;
  closeBacklight.userData.baseOpacity = 1.08;
  closeBacklight.userData.sunPart = "detailBacklight";
  closeBacklight.userData.baseScale = 48 * SUN_VISUAL_SCALE;
  closeDetail.userData.baseOpacity = 1.12;
  closeDetail.userData.sunPart = "detail";
  closeDetail.userData.baseScale = 46 * SUN_VISUAL_SCALE;
  group.add(halo, rays, sunDisc, closeBacklight, closeDetail);
  group.position.copy(direction.clone().normalize().multiplyScalar(540));
  return group;
}

function updateVisibleSunFire(sun: THREE.Group) {
  const pulse = 1 + Math.sin(elapsedTime * 1.7) * 0.012 + Math.sin(elapsedTime * 3.1) * 0.006;
  const sceneOpacity = Number(sun.userData.sceneOpacity ?? 1);
  const worldScale = sun.getWorldScale(sunWorldScaleVector).x;
  const closeDetail = worldScale >= 3.75 ? 1 : 0;
  sun.traverse((object) => {
    if (object.userData.sunPart === "disc" || object.userData.sunPart === "rays" || object.userData.sunPart === "halo" || object.userData.sunPart === "detail" || object.userData.sunPart === "detailBacklight") {
      const baseScale = object.userData.baseScale ?? 1;
      const detailScale = object.userData.sunPart === "detail" || object.userData.sunPart === "detailBacklight" ? 1 + closeDetail * 0.12 : 1;
      object.scale.setScalar(baseScale * pulse * detailScale);
      const material = object instanceof THREE.Sprite ? object.material : null;
      if (material instanceof THREE.SpriteMaterial) {
        const baseOpacity = Number(object.userData.baseOpacity ?? 1);
        if (object.userData.sunPart === "disc") {
          material.opacity = baseOpacity * sceneOpacity * (1 - closeDetail);
        } else if (object.userData.sunPart === "rays") {
          material.opacity = baseOpacity * sceneOpacity * (1 - closeDetail);
        } else if (object.userData.sunPart === "detail" || object.userData.sunPart === "detailBacklight") {
          material.opacity = baseOpacity * sceneOpacity * closeDetail;
        } else {
          material.opacity = baseOpacity * sceneOpacity * (1 - closeDetail);
        }
        const speed = object.userData.sunPart === "rays" ? -0.003 : 0;
        material.rotation = elapsedTime * speed;
      }
    }
  });
}

function createSunDiscTexture() {
  const size = 384;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create sun texture");
  const center = size / 2;
  const base = ctx.createRadialGradient(center, center, size * 0.015, center, center, size * 0.5);
  base.addColorStop(0, "rgba(255, 255, 255, 1)");
  base.addColorStop(0.24, "rgba(255, 255, 255, 1)");
  base.addColorStop(0.38, "rgba(255, 252, 218, 0.96)");
  base.addColorStop(0.58, "rgba(255, 210, 92, 0.62)");
  base.addColorStop(0.78, "rgba(255, 147, 38, 0.2)");
  base.addColorStop(1, "rgba(255, 124, 30, 0)");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createSunRayTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create sun ray texture");
  const center = size / 2;
  ctx.globalCompositeOperation = "lighter";
  const radial = ctx.createRadialGradient(center, center, size * 0.02, center, center, size * 0.5);
  radial.addColorStop(0, "rgba(255, 255, 255, 0.56)");
  radial.addColorStop(0.16, "rgba(255, 244, 188, 0.28)");
  radial.addColorStop(0.46, "rgba(255, 188, 92, 0.09)");
  radial.addColorStop(1, "rgba(255, 175, 88, 0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, size, size);
  const rayAngles = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4];
  for (const angle of rayAngles) {
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);
    const gradient = ctx.createLinearGradient(-size * 0.48, 0, size * 0.48, 0);
    gradient.addColorStop(0, "rgba(255, 210, 126, 0)");
    gradient.addColorStop(0.47, "rgba(255, 244, 198, 0.13)");
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.32)");
    gradient.addColorStop(0.53, "rgba(255, 244, 198, 0.13)");
    gradient.addColorStop(1, "rgba(255, 210, 126, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(-size * 0.48, -size * 0.012, size * 0.96, size * 0.024);
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createSunHaloTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create sun halo texture");
  const center = size / 2;
  const glow = ctx.createRadialGradient(center, center, size * 0.03, center, center, size * 0.5);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.72)");
  glow.addColorStop(0.22, "rgba(255, 244, 176, 0.34)");
  glow.addColorStop(0.5, "rgba(255, 190, 92, 0.16)");
  glow.addColorStop(1, "rgba(255, 175, 86, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function setVisibleSunOpacity(sun: THREE.Group, opacity: number) {
  sun.userData.sceneOpacity = opacity;
  sun.traverse((object) => {
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Sprite)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!(material instanceof THREE.Material)) continue;
      material.opacity = (object.userData.baseOpacity ?? 1) * opacity;
      if (material instanceof THREE.ShaderMaterial && material.uniforms.uSceneOpacity) {
        material.uniforms.uSceneOpacity.value = opacity;
      }
    }
  });
}

function createSunCloseDetailTexture() {
  const texture = new THREE.TextureLoader().load(sunCloseDetailTextureUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function createRadialShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 58);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.74)");
    gradient.addColorStop(0.42, "rgba(0, 0, 0, 0.34)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function seededNoise(seed: number, salt: number) {
  return THREE.MathUtils.clamp(Math.sin(seed * 12.9898 + salt) * 43758.5453 % 1, -1, 1) * 0.5 + 0.5;
}

function createWormholeWhiteoutParticles() {
  if (wormholeWhiteoutParticles.length > 0) return;
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < WORMHOLE_WHITEOUT_PARTICLE_COUNT; i += 1) {
    const angle = seededNoise(i, 2.7) * Math.PI * 2;
    const radius = Math.pow(seededNoise(i, 5.4), 1.8);
    const startX = Math.cos(angle) * radius * 56;
    const startY = Math.sin(angle) * radius * 42;
    const driftRadius = 34 + seededNoise(i, 9.8) * 92;
    const driftAngle = angle + (seededNoise(i, 12.3) - 0.5) * 0.9;
    const element = document.createElement("span");
    element.className = "wormhole-whiteout-particle";
    const size = 9 + Math.pow(seededNoise(i, 15.2), 0.62) * 28;
    element.style.width = `${size.toFixed(1)}px`;
    element.style.height = `${size.toFixed(1)}px`;
    fragment.appendChild(element);
    wormholeWhiteoutParticles.push({
      element,
      startX,
      startY,
      driftX: Math.cos(driftAngle) * driftRadius,
      driftY: Math.sin(driftAngle) * driftRadius,
      size,
      opacity: 0.72 + seededNoise(i, 18.6) * 0.28,
      shrink: 0.58 + seededNoise(i, 21.9) * 0.34,
    });
  }
  wormholeWhiteoutParticlesRoot.appendChild(fragment);
}

createWormholeWhiteoutParticles();

function createWormholeFallVisual() {
  const group = new THREE.Group();
  group.name = "Wormhole fall visual";
  group.visible = false;
  group.renderOrder = 30;

  const particleCount = 360;
  const positions = new Float32Array(particleCount * 3);
  const seeds = new Float32Array(particleCount * 4);
  for (let i = 0; i < particleCount; i += 1) {
    const angle = seededNoise(i, 4.11) * Math.PI * 2;
    const radius = 3 + Math.pow(seededNoise(i, 8.31), 0.74) * 48;
    seeds[i * 4] = Math.cos(angle) * radius;
    seeds[i * 4 + 1] = Math.sin(angle) * radius;
    seeds[i * 4 + 2] = seededNoise(i, 13.91);
    seeds[i * 4 + 3] = 0.42 + seededNoise(i, 19.2) * 1.05;
    positions[i * 3] = seeds[i * 4];
    positions[i * 3 + 1] = seeds[i * 4 + 1];
    positions[i * 3 + 2] = -14 - seeds[i * 4 + 2] * 210;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    map: createWormholeParticleTexture(),
    color: 0xffffff,
    size: 1.08,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    alphaTest: 0.02,
    toneMapped: false,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.renderOrder = 32;
  group.add(particles);

  const voidMaterial = new THREE.SpriteMaterial({
    map: createWormholeVoidTexture(),
    color: 0x02040a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
  });
  const voidBackdrop = new THREE.Sprite(voidMaterial);
  voidBackdrop.position.set(0, 0, -52);
  voidBackdrop.scale.set(240, 150, 1);
  voidBackdrop.renderOrder = 28;
  group.add(voidBackdrop);

  const marsMaterial = new THREE.SpriteMaterial({
    map: createWormholeMarsTexture(),
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.NormalBlending,
    toneMapped: false,
  });
  const mars = new THREE.Sprite(marsMaterial);
  mars.position.set(0, 0, -240);
  mars.scale.setScalar(1);
  mars.renderOrder = 33;
  group.add(mars);

  const veilMaterial = new THREE.SpriteMaterial({
    map: createWormholeVeilTexture(),
    color: 0xf1e4c8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const veil = new THREE.Sprite(veilMaterial);
  veil.position.set(0, 0, -46);
  veil.scale.set(130, 80, 1);
  veil.renderOrder = 29;
  group.add(veil);

  const organicTunnel = createWormholeOrganicTunnel();
  organicTunnel.group.renderOrder = 30;
  group.add(organicTunnel.group);

  return {
    group,
    particles,
    particlePositions: positions,
    particleSeeds: seeds,
    particleMaterial,
    voidMaterial,
    mars,
    marsMaterial,
    veilMaterial,
    organicTunnel: organicTunnel.group,
    organicSegments: organicTunnel.segments,
    organicMaterials: organicTunnel.materials,
  };
}

function createWormholeOrganicTunnel() {
  const group = new THREE.Group();
  group.name = "Organic loop tunnel";
  group.visible = false;

  const materials = [
    createOrganicTunnelMaterial(0xe8dfca, 0.68, 0.04, 1),
    createOrganicTunnelMaterial(0xb9b29d, 0.84, 0.02, 0.92),
    createOrganicTunnelMaterial(0x151511, 0.9, 0.12, 0.94),
    createOrganicTunnelMaterial(0x2f3028, 0.78, 0.18, 0.78),
    createOrganicTunnelMaterial(0xf8f2df, 0.42, 0.08, 1),
  ];
  materials[4].emissive.set(0x342d20);

  const geometries = {
    rib: new THREE.TorusGeometry(6.85, 0.085, 7, 128),
    innerRib: new THREE.TorusGeometry(4.05, 0.052, 6, 96),
    panel: new THREE.BoxGeometry(1, 1, 1),
    inset: new THREE.BoxGeometry(1, 1, 1),
    strut: new THREE.BoxGeometry(1, 1, 1),
    tooth: new THREE.BoxGeometry(1, 1, 1),
  };

  const segments = Array.from({ length: WORMHOLE_ORGANIC_SEGMENT_COUNT }, (_, index) => {
    const segment = createWormholeOrganicSegment(index, geometries, materials);
    group.add(segment.group);
    return segment;
  });

  return { group, segments, materials };
}

function createOrganicTunnelMaterial(color: number, roughness: number, metalness: number, baseOpacity: number) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent: true,
    opacity: 0,
    depthWrite: true,
  });
  material.userData.baseOpacity = baseOpacity;
  return material;
}

function createWormholeOrganicSegment(
  index: number,
  geometries: {
    rib: THREE.BufferGeometry;
    innerRib: THREE.BufferGeometry;
    panel: THREE.BufferGeometry;
    inset: THREE.BufferGeometry;
    strut: THREE.BufferGeometry;
    tooth: THREE.BufferGeometry;
  },
  materials: THREE.MeshStandardMaterial[],
): WormholeOrganicSegment {
  const group = new THREE.Group();
  const seed = index * 19.73 + 3.1;
  const z = WORMHOLE_ORGANIC_FRONT_Z - index * WORMHOLE_ORGANIC_SEGMENT_SPACING;
  const baseRotation = seededNoise(seed, 0.37) * Math.PI * 2;
  const radiusPulse = 0.72 + seededNoise(seed, 0.4) * 0.7;
  const ovalX = 1 + (seededNoise(seed, 1.2) - 0.5) * 0.16;
  const ovalY = 1 + (seededNoise(seed, 2.2) - 0.5) * 0.18;

  const rib = new THREE.Mesh(geometries.rib, index % 4 === 0 ? materials[4] : materials[1]);
  rib.scale.set(ovalX * (1 + radiusPulse * 0.025), ovalY, 1);
  rib.rotation.z = baseRotation * 0.35;
  group.add(rib);

  if (index % 2 === 0) {
    const innerRib = new THREE.Mesh(geometries.innerRib, materials[2]);
    innerRib.position.z = -0.18;
    innerRib.scale.set(ovalY * 1.06, ovalX * 0.96, 1);
    innerRib.rotation.z = baseRotation * -0.52;
    group.add(innerRib);
  }

  const panelCount = 10 + Math.floor(seededNoise(seed, 3.6) * 6);
  for (let i = 0; i < panelCount; i += 1) {
    const localSeed = seed + i * 5.217;
    const angle = baseRotation + (i / panelCount) * Math.PI * 2 + (seededNoise(localSeed, 0.1) - 0.5) * 0.08;
    const radial = 5.9 + seededNoise(localSeed, 1) * 2.05;
    const tangential = 0.54 + seededNoise(localSeed, 2) * 1.2;
    const depth = 0.32 + seededNoise(localSeed, 3) * 0.94;
    const height = 0.16 + seededNoise(localSeed, 4) * 0.54;
    const x = Math.cos(angle) * radial * ovalX;
    const y = Math.sin(angle) * radial * ovalY;
    const material = seededNoise(localSeed, 5) > 0.42 ? materials[0] : materials[2];

    const panel = createWormholeOrganicBlock(
      geometries.panel,
      material,
      new THREE.Vector3(x, y, (seededNoise(localSeed, 6) - 0.5) * 0.44),
      angle,
      new THREE.Vector3(height, tangential, depth),
    );
    panel.rotation.x = (seededNoise(localSeed, 7) - 0.5) * 0.15;
    panel.rotation.y = (seededNoise(localSeed, 8) - 0.5) * 0.18;
    group.add(panel);

    if (seededNoise(localSeed, 9) > 0.36) {
      const insetRadius = radial - 0.32 - seededNoise(localSeed, 10) * 0.55;
      group.add(createWormholeOrganicBlock(
        geometries.inset,
        seededNoise(localSeed, 11) > 0.58 ? materials[3] : materials[2],
        new THREE.Vector3(Math.cos(angle) * insetRadius * ovalX, Math.sin(angle) * insetRadius * ovalY, 0.27),
        angle,
        new THREE.Vector3(0.05, tangential * 0.54, 0.08),
      ));
    }

    if (i % 3 === 0) {
      const strutRadius = 4.78 + seededNoise(localSeed, 12) * 0.65;
      const strut = createWormholeOrganicBlock(
        geometries.strut,
        materials[3],
        new THREE.Vector3(Math.cos(angle) * strutRadius * ovalX, Math.sin(angle) * strutRadius * ovalY, -0.18),
        angle + Math.PI * 0.5,
        new THREE.Vector3(0.035, 0.96 + seededNoise(localSeed, 13) * 1.52, 0.04),
      );
      strut.rotation.y = 0.2 + seededNoise(localSeed, 14) * 0.38;
      group.add(strut);
    }
  }

  const toothCount = 7 + Math.floor(seededNoise(seed, 20.4) * 5);
  for (let i = 0; i < toothCount; i += 1) {
    const localSeed = seed + i * 9.33;
    const angle = baseRotation * 1.7 + (i / toothCount) * Math.PI * 2;
    const radius = 3.12 + seededNoise(localSeed, 1) * 0.84;
    const tooth = createWormholeOrganicBlock(
      geometries.tooth,
      seededNoise(localSeed, 2) > 0.52 ? materials[0] : materials[2],
      new THREE.Vector3(Math.cos(angle) * radius * ovalX, Math.sin(angle) * radius * ovalY, 0.08),
      angle,
      new THREE.Vector3(0.22 + seededNoise(localSeed, 3) * 0.48, 0.1, 0.48 + seededNoise(localSeed, 4) * 0.48),
    );
    tooth.rotation.x = Math.PI * 0.5 + (seededNoise(localSeed, 5) - 0.5) * 0.14;
    group.add(tooth);
  }

  group.position.z = z;
  return {
    group,
    z,
    seed,
    baseRotation,
    twist: (seededNoise(seed, 40.1) - 0.5) * 1.8,
  };
}

function createWormholeOrganicBlock(
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

function createWormholeVoidTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 6, 128, 128, 156);
    gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(0.45, "rgba(0, 2, 8, 0.98)");
    gradient.addColorStop(0.78, "rgba(3, 10, 25, 0.96)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.92)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createWormholeParticleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.28, "rgba(255,255,255,0.82)");
    gradient.addColorStop(0.62, "rgba(255,255,255,0.22)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createWormholeMarsTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const center = 256;
    ctx.clearRect(0, 0, 512, 512);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, 244, 0, Math.PI * 2);
    ctx.clip();

    const base = ctx.createRadialGradient(220, 204, 8, center, center, 276);
    base.addColorStop(0, "rgba(231, 117, 72, 1)");
    base.addColorStop(0.42, "rgba(188, 67, 39, 1)");
    base.addColorStop(0.76, "rgba(126, 36, 27, 0.96)");
    base.addColorStop(1, "rgba(42, 8, 8, 0.9)");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);

    ctx.globalCompositeOperation = "multiply";
    for (let i = 0; i < 42; i += 1) {
      const angle = seededNoise(i, 3.12) * Math.PI * 2;
      const radius = Math.sqrt(seededNoise(i, 7.44)) * 220;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      const size = 18 + seededNoise(i, 12.9) * 72;
      const patch = ctx.createRadialGradient(x, y, 0, x, y, size);
      patch.addColorStop(0, `rgba(103, 32, 24, ${0.08 + seededNoise(i, 22.4) * 0.14})`);
      patch.addColorStop(1, "rgba(103, 32, 24, 0)");
      ctx.fillStyle = patch;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 54; i += 1) {
      const angle = seededNoise(i, 41.2) * Math.PI * 2;
      const radius = Math.sqrt(seededNoise(i, 73.1)) * 226;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      const size = 10 + seededNoise(i, 91.7) * 38;
      const dust = ctx.createRadialGradient(x, y, 0, x, y, size);
      dust.addColorStop(0, `rgba(255, 171, 100, ${0.04 + seededNoise(i, 8.6) * 0.08})`);
      dust.addColorStop(1, "rgba(255, 171, 100, 0)");
      ctx.fillStyle = dust;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < 1600; i += 1) {
      const angle = seededNoise(i, 110.3) * Math.PI * 2;
      const radius = Math.sqrt(seededNoise(i, 212.4)) * 238;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      const alpha = 0.03 + seededNoise(i, 319.2) * 0.05;
      ctx.fillStyle = seededNoise(i, 18.5) > 0.5
        ? `rgba(255, 180, 112, ${alpha})`
        : `rgba(72, 18, 14, ${alpha})`;
      ctx.fillRect(x, y, 1.2, 1.2);
    }

    const limb = ctx.createRadialGradient(center, center, 142, center, center, 248);
    limb.addColorStop(0, "rgba(0, 0, 0, 0)");
    limb.addColorStop(0.78, "rgba(0, 0, 0, 0.14)");
    limb.addColorStop(1, "rgba(0, 0, 0, 0.55)");
    ctx.fillStyle = limb;
    ctx.fillRect(0, 0, 512, 512);
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createWormholeVeilTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 12, 128, 128, 128);
    gradient.addColorStop(0, "rgba(80, 210, 255, 0.1)");
    gradient.addColorStop(0.48, "rgba(20, 76, 180, 0.22)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function updateWormholeFallVisual(progress: number, drift: THREE.Vector2, delta: number) {
  wormholeVisual.group.visible = true;
  wormholeVisual.group.position.copy(camera.position);
  wormholeVisual.group.quaternion.copy(camera.quaternion);

  const paused = Boolean(wormholeFall?.paused);
  const fallSeconds = wormholeFall ? wormholeElapsed() : progress * WORMHOLE_FALL_DURATION;
  const fallSpeedFactor = paused ? 0 : wormholeFallSpeedFactor(progress);
  const perspectiveSpeedFactor = fallSpeedFactor * WORMHOLE_VISUAL_SPEED_MULTIPLIER;
  const visualTime = elapsedTime * Math.max(0.1, WORMHOLE_VISUAL_SPEED_MULTIPLIER);
  const marsPhase = THREE.MathUtils.smoothstep(progress, 0.66, 1);
  const pulse = 0.86 + Math.sin(visualTime * 18.4) * 0.18 + Math.sin(visualTime * 37.7) * 0.11;
  const particleFade = 1 - THREE.MathUtils.smoothstep(progress, 0.88, 1);
  const particleOpacity = THREE.MathUtils.lerp(0.7, 0.42, marsPhase) * particleFade;
  wormholeVisual.particleMaterial.opacity = particleOpacity;
  wormholeVisual.particleMaterial.size = THREE.MathUtils.lerp(0.95, 1.16, pulse);

  const wrapDistance = 220;
  for (let i = 0; i < wormholeVisual.particleSeeds.length / 4; i += 1) {
    const seedIndex = i * 4;
    const positionIndex = i * 3;
    const baseX = wormholeVisual.particleSeeds[seedIndex];
    const baseY = wormholeVisual.particleSeeds[seedIndex + 1];
    const seedZ = wormholeVisual.particleSeeds[seedIndex + 2];
    const speed = wormholeVisual.particleSeeds[seedIndex + 3];
    const zTravel = ((seedZ * wrapDistance - fallSeconds * (4.6 + speed * 3.2) * Math.max(0.22, perspectiveSpeedFactor)) % wrapDistance + wrapDistance) % wrapDistance;
    const z = -10 - zTravel;
    const depthT = 1 - zTravel / wrapDistance;
    const floatPhase = visualTime * (0.62 + speed * 0.32) + seedZ * Math.PI * 2;
    const tunnelScale = THREE.MathUtils.lerp(0.26, 1.16, depthT);
    const sway = THREE.MathUtils.lerp(0.16, 1.05, depthT);
    wormholeVisual.particlePositions[positionIndex] = baseX * tunnelScale + Math.sin(floatPhase + baseY * 0.03) * sway + drift.x * 0.04;
    wormholeVisual.particlePositions[positionIndex + 1] = baseY * tunnelScale + Math.cos(floatPhase * 1.17 + baseX * 0.02) * sway + drift.y * 0.04;
    wormholeVisual.particlePositions[positionIndex + 2] = z;
  }
  const particlePosition = wormholeVisual.particles.geometry.getAttribute("position") as THREE.BufferAttribute;
  particlePosition.needsUpdate = true;

  wormholeVisual.voidMaterial.opacity = THREE.MathUtils.lerp(1, 0.84, marsPhase);

  const organicOpacity = THREE.MathUtils.smoothstep(progress, 0, 0.04) * (1 - THREE.MathUtils.smoothstep(progress, 0.62, 0.74));
  wormholeVisual.organicTunnel.visible = organicOpacity > 0.01;
  wormholeVisual.organicTunnel.position.set(drift.x * 0.035, drift.y * 0.035, 0);
  wormholeVisual.organicMaterials.forEach((material) => {
    material.opacity = Number(material.userData.baseOpacity ?? 1) * organicOpacity;
  });
  for (const segment of wormholeVisual.organicSegments) {
    segment.z += (3.2 + Math.sin(segment.seed) * 0.24) * perspectiveSpeedFactor * delta;
    if (segment.z > WORMHOLE_ORGANIC_FRONT_Z) {
      segment.z -= WORMHOLE_ORGANIC_LOOP_LENGTH;
      segment.baseRotation += Math.PI * 0.618;
    }
    segment.group.position.z = segment.z;
    const depthFactor = THREE.MathUtils.clamp((segment.z - WORMHOLE_ORGANIC_BACK_Z) / WORMHOLE_ORGANIC_LOOP_LENGTH, 0, 1);
    const segmentPulse = 1 + Math.sin(visualTime * 1.4 + segment.seed) * 0.016;
    const nearScale = THREE.MathUtils.lerp(0.72, 1.18, depthFactor);
    segment.group.scale.setScalar(nearScale * segmentPulse);
    segment.group.rotation.z =
      segment.baseRotation * 0.08 +
      visualTime * 0.16 +
      segment.twist * Math.sin(visualTime * 0.4 + segment.seed);
  }

  const finalRush = THREE.MathUtils.smoothstep(progress, 0.94, 1);
  const marsScale = THREE.MathUtils.lerp(0.12, 24, Math.pow(marsPhase, 1.7)) + finalRush * 134;
  wormholeVisual.mars.position.set(0, 0, THREE.MathUtils.lerp(-238, -30, Math.pow(marsPhase, 1.3)));
  wormholeVisual.mars.scale.setScalar(marsScale);
  wormholeVisual.marsMaterial.opacity = marsPhase * THREE.MathUtils.lerp(0.18, 0.98, marsPhase);

  wormholeVisual.veilMaterial.opacity = THREE.MathUtils.lerp(0.02, 0.08, pulse) * (1 - THREE.MathUtils.smoothstep(progress, 0.9, 1));
  wormholeVisual.group.scale.setScalar(THREE.MathUtils.lerp(1, 1.05, Math.min(delta * 12, 1)));
}

function readInitialLanguage(): LanguageCode {
  return localStorage.getItem(LANG_STORAGE_KEY) === "en-US" ? "en-US" : "zh-CN";
}

function isEnglish() {
  return currentLanguage === "en-US";
}

function tr(key: string, params: Record<string, string | number> = {}) {
  const value = i18n[currentLanguage][key] ?? i18n["zh-CN"][key] ?? key;
  return Object.entries(params).reduce((text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)), value);
}

function currentAresCalendarDate(now = Date.now()) {
  const absoluteSol = currentAresAbsoluteSol(now);
  const yearOffset = Math.floor((absoluteSol - 1) / ARES_SOLS_PER_YEAR);
  return {
    year: ARES_CALENDAR_BASE_YEAR + yearOffset,
    sol: ((absoluteSol - 1) % ARES_SOLS_PER_YEAR) + 1,
  };
}

function currentAresAbsoluteSol(now = Date.now()) {
  const elapsedSols = Math.max(0, Math.floor((now - ARES_CALENDAR_EPOCH_UTC) / MARS_SOL_MILLISECONDS));
  return ARES_CALENDAR_BASE_SOL + elapsedSols;
}

function titleDateText() {
  const date = currentAresCalendarDate();
  return tr("title.eyebrow", date);
}

function updateTitleDateReadout() {
  titleDateReadout.textContent = titleDateText();
}

function localizeText(text: string) {
  if (!isEnglish()) return text;
  let translated = runtimeEnglishTexts[text] ?? exactEnglishTexts[text] ?? i18n["en-US"][text] ?? text;
  for (const [source, target] of englishPhrasePairs) translated = translated.replaceAll(source, target);
  translated = translated
    .replace(/(\d+)号/g, "No. $1")
    .replace(/(\d+) 人/g, "$1 players")
    .replace(/(\d+)人/g, "$1 players")
    .replace(/第\s*(\d+)\s*火星日/g, "Sol $1")
    .replace(/(\d+)\s*秒后恢复/g, "restores in $1 seconds");
  return translated;
}

function localizeLabel(label: string) {
  return localizeText(label);
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  document.title = isEnglish() ? "Mars Advance Team: The First Human" : "火星先遣队 第一位人类";
  const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (metaDescription) {
    metaDescription.content = isEnglish()
      ? "A browser-based 3D Mars base demo with a red planet outpost, ISRU plant, greenhouse, robots, and landers."
      : "火星殖民浏览器 3D Demo：红色星球基地、ISRU 工厂、温室、机器人与登陆器。";
  }
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (key) element.textContent = tr(key);
  });
  updateTitleDateReadout();
  document.querySelectorAll<HTMLElement>("[data-i18n-attr]").forEach((element) => {
    const attrConfig = element.dataset.i18nAttr ?? "";
    for (const pair of attrConfig.split(",")) {
      const [attr, key] = pair.split(":");
      if (attr && key) element.setAttribute(attr, tr(key));
    }
  });
  localizeStaticUiText();
  languageToggle.textContent = "";
  languageToggle.dataset.flag = isEnglish() ? "cn" : "us";
  languageToggle.setAttribute("aria-label", tr("language.button"));
  languageToggle.setAttribute("title", tr("language.button"));
  updateRewardReadouts();
  updateRankReadout();
  updateMapButtonState();
  updateTitleActionSelection();
  updateMissionAfterLanguageChange();
  updateScaleGunOverlay();
  updateMobileFlightButtons();
  updateVisitorCounter();
  for (const item of labels) item.element.textContent = localizeLabel(item.element.dataset.labelSource ?? item.element.textContent);
  interactionChoiceSignature = "";
  updateInteractionPrompts();
  if (activeDialogueNode) renderDialogueNode();
}

async function reportVisitorStats() {
  if (visitorCounter.dataset.status === "ready") return;
  visitorCounterStatus = "loading";
  updateVisitorCounter();
  try {
    const response = await fetch("/api/visitors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      keepalive: true,
    });
    if (!response.ok) throw new Error(`Visitor stats failed: ${response.status}`);
    const payload = (await response.json()) as { total?: unknown };
    if (typeof payload.total !== "number" || !Number.isFinite(payload.total)) throw new Error("Visitor stats returned invalid total");
    visitorTotal = Math.max(0, Math.floor(payload.total));
    visitorCounterStatus = "ready";
  } catch {
    visitorCounterStatus = "unavailable";
  }
  updateVisitorCounter();
}

function updateVisitorCounter() {
  visitorCounter.dataset.status = visitorCounterStatus;
  if (visitorCounterStatus === "ready" && visitorTotal !== null) {
    renderVisitorDigits(formatVisitorCount(visitorTotal));
    return;
  }
  renderVisitorDigits("0000");
}

function formatVisitorCount(total: number) {
  return String(Math.min(Math.max(total, 0), 9999)).padStart(4, "0");
}

function renderVisitorDigits(value: string) {
  visitorCountReadout.replaceChildren(
    ...value.slice(0, 4).split("").map((digit) => {
      const element = document.createElement("span");
      element.className = "visitor-digit";
      element.textContent = digit;
      return element;
    })
  );
}

function localizeStaticUiText() {
  const roots = ["#title-screen", ".hud", ".hud-buttons", "#mission-banner", "#scale-gun-overlay", "#exit-confirm", ".mobile-actions", "#controls-guide"];
  for (const selector of roots) {
    const root = document.querySelector(selector);
    if (!root) continue;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const textNode = node as Text;
      if (textNode.parentElement?.closest("[data-i18n]")) {
        node = walker.nextNode();
        continue;
      }
      const source = staticTextSources.get(textNode) ?? textNode.textContent ?? "";
      if (!staticTextSources.has(textNode)) staticTextSources.set(textNode, source);
      const trimmed = source.trim();
      if (trimmed) textNode.textContent = source.replace(trimmed, localizeText(trimmed));
      node = walker.nextNode();
    }
  }
}

function setLanguage(language: LanguageCode) {
  currentLanguage = language;
  localStorage.setItem(LANG_STORAGE_KEY, language);
  applyLanguage();
}

function toggleLanguage() {
  if (started) return;
  setLanguage(isEnglish() ? "zh-CN" : "en-US");
}

function createFootball(): FootballState {
  const texture = createFootballTexture();
  const bumpTexture = createFootballTexture();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture,
    bumpMap: bumpTexture,
    bumpScale: 0.018,
    roughness: 0.46,
    metalness: 0.02,
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(FOOTBALL_RADIUS, 48, 32), material);
  ball.castShadow = true;
  ball.receiveShadow = true;

  const group = new THREE.Group();
  group.name = "Mars football";
  group.add(ball);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(FOOTBALL_RADIUS * 1.15, 32),
    new THREE.MeshBasicMaterial({
      map: createRadialShadowTexture(),
      color: 0x140805,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })
  );
  shadow.renderOrder = 2;

  const normal = planetNormal(FOOTBALL_SPAWN_X, FOOTBALL_SPAWN_Z, new THREE.Vector3());
  const state: FootballState = {
    group,
    ball,
    shadow,
    normal,
    velocity: new THREE.Vector3(),
    altitude: FOOTBALL_REST_ALTITUDE,
    verticalVelocity: 0,
    lastPlayerKickAt: -Infinity,
  };
  updateFootballVisual(state, 0);
  return state;
}

function createFootballTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#f8f6ee";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(32, 32, 32, 0.28)";
    ctx.lineWidth = 3;
    for (const v of [0.18, 0.34, 0.5, 0.66, 0.82]) {
      ctx.beginPath();
      ctx.moveTo(0, v * canvas.height);
      ctx.bezierCurveTo(canvas.width * 0.25, (v + 0.035) * canvas.height, canvas.width * 0.75, (v - 0.035) * canvas.height, canvas.width, v * canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i += 1) {
      const x = (i / 12) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 34, canvas.height * 0.24, x - 34, canvas.height * 0.76, x, canvas.height);
      ctx.stroke();
    }

    const patches: Array<[number, number, number, number]> = [
      [0.5, 0.5, 52, -Math.PI / 2],
      [0.16, 0.24, 42, -0.4],
      [0.37, 0.22, 42, 0.5],
      [0.63, 0.22, 42, -0.5],
      [0.84, 0.24, 42, 0.4],
      [0.17, 0.76, 42, 0.4],
      [0.38, 0.78, 42, -0.5],
      [0.62, 0.78, 42, 0.5],
      [0.83, 0.76, 42, -0.4],
      [0.03, 0.5, 38, -Math.PI / 2],
      [0.97, 0.5, 38, -Math.PI / 2],
    ];
    for (const [u, v, radius, rotation] of patches) drawFootballPentagon(ctx, u * canvas.width, v * canvas.height, radius, rotation);

    ctx.strokeStyle = "rgba(12, 12, 12, 0.44)";
    ctx.lineWidth = 2;
    for (const [u, v, radius] of patches) {
      drawFootballHexSeams(ctx, u * canvas.width, v * canvas.height, radius * 1.55);
    }

    const gradient = ctx.createRadialGradient(canvas.width * 0.42, canvas.height * 0.34, 20, canvas.width * 0.42, canvas.height * 0.34, canvas.width * 0.55);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.28)");
    gradient.addColorStop(0.55, "rgba(255, 255, 255, 0)");
    gradient.addColorStop(1, "rgba(80, 61, 45, 0.16)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function drawFootballPentagon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rotation: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const angle = rotation + (i / 5) * Math.PI * 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = "#111111";
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.72)";
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawFootballHexSeams(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI / 6 + (i / 6) * Math.PI * 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius * 0.78;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function bindInput() {
  applyLanguage();
  languageToggle.addEventListener("click", toggleLanguage);
  updateTitleActionSelection();
  enterButton.addEventListener("click", startGame);
  enterButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startGame();
  });
  storySummaryButton.addEventListener("click", openStorySummary);
  titleActionButtons.forEach((button, index) => {
    button.addEventListener("pointerenter", () => {
      selectTitleAction(index, false, true);
    });
    button.addEventListener("focus", () => {
      selectTitleAction(index, false, false);
    });
  });
  titleScreen.addEventListener("pointerup", (event) => {
    if (started) return;
    const target = event.target;
    if (target === enterButton || (target instanceof Element && target.closest("#enter-base"))) startGame();
  });
  hudToggle.addEventListener("click", toggleHud);
  missionToggle.addEventListener("click", toggleMissionPanel);
  mapToggle.addEventListener("click", toggleMap);
  dialogueContinue.addEventListener("click", advanceDialogue);
  dialogueChoices.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest<HTMLButtonElement>("button[data-choice-index]");
    if (!button) return;
    chooseDialogue(Number(button.dataset.choiceIndex ?? 0));
  });
  interactionChoice.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("[data-close-interactions]")) {
      event.preventDefault();
      event.stopPropagation();
      closeTouchInteractionDrawer();
      return;
    }
    if (target.closest("[data-open-interactions]")) {
      event.preventDefault();
      event.stopPropagation();
      interactionChoiceOpen = true;
      selectedInteractionIndex = 0;
      resetStick();
      keyState.delete("ShiftLeft");
      renderInteractionChoice();
      return;
    }
    if (target === interactionChoice && interactionChoiceOpen && isSmallScreenMapTouch()) {
      event.preventDefault();
      event.stopPropagation();
      closeTouchInteractionDrawer();
      return;
    }
    const button = target.closest<HTMLButtonElement>("button[data-choice-index]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    selectedInteractionIndex = Number(button.dataset.choiceIndex ?? 0);
    renderInteractionChoice();
    executeSelectedInteraction();
  });
  exitResumeButton.addEventListener("click", closeExitConfirm);
  exitTitleButton.addEventListener("click", confirmExitToTitle);
  exitConfirmButtons.forEach((button, index) => {
    button.addEventListener("pointerenter", () => selectExitConfirmAction(index, false, true));
    button.addEventListener("focus", () => selectExitConfirmAction(index, false, false));
  });
  scaleGunShrinkButton.addEventListener("click", () => fireScaleGun("shrink"));
  scaleGunGrowButton.addEventListener("click", () => fireScaleGun("grow"));
	  window.addEventListener("keydown", (event) => {
	    if (!started && handleTitleScreenKey(event)) return;
	    if (!started) return;
	    if (orbitalDefense.active) {
      event.preventDefault();
      if (event.code === "Space" || event.code === "KeyJ") {
        keyState.add(event.code);
        if (!event.repeat) orbitalDefense.fire();
        return;
      }
      if (event.code === "KeyI" && !event.repeat) {
        orbitalDefense.lockTarget();
        updateOrbitalDefenseHud();
        return;
      }
      if (event.code === "KeyK" && !event.repeat) {
        orbitalDefense.fireHeavyLaser();
        updateOrbitalDefenseHud();
        return;
      }
      if (event.code === "KeyQ" && !event.repeat) {
        orbitalDefense.requestReturn();
        updateOrbitalDefenseHud();
        return;
      }
      if (event.code === "KeyC" && !event.repeat) {
        orbitalDefense.toggleCameraView();
        updateOrbitalDefenseHud();
      }
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight"].includes(event.code)) {
        keyState.add(event.code);
      }
      return;
    }
	    if (isWormholeWhiteoutActive()) {
	      event.preventDefault();
	      return;
	    }
	    if (wormholeFall) {
      event.preventDefault();
      if (event.code === "KeyC") {
        toggleFirstThirdPersonCamera();
        return;
      }
      if (event.code === "KeyE") {
        setWormholeFallPaused(true);
        return;
      }
      if (event.code === "KeyQ") {
        setWormholeFallPaused(false);
        return;
      }
      if (isWormholeControlKey(event.code)) keyState.add(event.code);
      return;
    }
    if (handleMysteryCodeKey(event)) return;
    if (handleKeyboardFlightCodeKey(event)) return;
    if (started && exitConfirmOpen) {
      handleExitConfirmKey(event);
      return;
    }
    if (event.code === "Backquote") {
      event.preventDefault();
      showControlsGuide(true);
      return;
    }
    if (dialogueOpen) {
      handleDialogueKey(event);
      return;
    }
    if (photoViewerOpen) {
      handlePhotoViewerKey(event);
      return;
    }
    if (handleExpandedMapKey(event)) return;
    if (cameraMode && handleCameraModeKey(event)) return;
    if (scaleGunAiming && (event.code === "KeyQ" || event.code === "KeyE")) {
      event.preventDefault();
      fireScaleGun(event.code === "KeyE" ? "grow" : "shrink");
      return;
    }
    if (scaleGunAiming && isScaleGunAimControlKey(event.code)) {
      event.preventDefault();
      keyState.add(event.code);
      return;
    }
    if (ridingAtAt && (event.code === "KeyJ" || event.code === "Space")) {
      event.preventDefault();
      keyState.add(event.code);
      if (!event.repeat) fireAtAtCannon(world.atAt);
      return;
    }
    if (ridingAtAt && event.code === "KeyQ") {
      event.preventDefault();
      exitAtAtRide();
      return;
    }
    if (ridingRover && event.code === "KeyQ") {
      event.preventDefault();
      exitRoverRide();
      return;
    }
    if (!ridingRover && footballCarried && event.code === "KeyQ") {
      event.preventDefault();
      dropFootball();
      return;
    }
    if ((interactionChoiceOpen || hasInfoChoiceActions()) && interactionActions.length > 1 && (event.code === "KeyQ" || event.code === "KeyE")) {
      event.preventDefault();
      if (interactionActions.length === 2) {
        selectedInteractionIndex = event.code === "KeyQ" ? 0 : 1;
      }
      executeSelectedInteraction();
      return;
    }
    if (isFlightActive() && (event.code === "KeyE" || event.code === "KeyQ")) {
      event.preventDefault();
      keyState.add(event.code);
      return;
    }
    if (interactionChoiceOpen && interactionActions.length > 1 && (event.code === "ArrowLeft" || event.code === "ArrowRight" || event.code === "ArrowUp" || event.code === "ArrowDown")) {
      event.preventDefault();
      const direction = event.code === "ArrowLeft" || event.code === "ArrowUp" ? -1 : 1;
      selectedInteractionIndex = (selectedInteractionIndex + direction + interactionActions.length) % interactionActions.length;
      renderInteractionChoice();
      return;
    }
    if (event.code === "Escape") {
      openExitConfirm();
      return;
    }
    if (event.code === "KeyV") {
      toggleHud();
      return;
    }
    if (event.code === "KeyF") {
      handleMapKeyDown(event);
      return;
    }
    if (event.code === "KeyR") {
      event.preventDefault();
      toggleMissionPanel();
      return;
    }
    if (event.code === "KeyB") {
      event.preventDefault();
      toggleBackgroundMusic();
      return;
    }
    if (event.code === "KeyX") {
      event.preventDefault();
      if (ridingAtAt) {
        scaleGunAiming = false;
        updateScaleGunOverlay();
        return;
      }
      toggleScaleGunAiming();
      return;
    }
    if (event.code === "KeyI") {
      event.preventDefault();
      toggleLaserSword();
      return;
    }
    if (event.code === "KeyJ" && !hasLaserSword) {
      event.preventDefault();
      showLaserSwordLockedPrompt();
      return;
    }
    if (event.code === "KeyJ" && laserSwordActive) {
      event.preventDefault();
      laserSwordRaised = true;
      keyState.add(event.code);
      tryLaserSwordAttack();
      return;
    }
    if (event.code === "KeyG") {
      event.preventDefault();
      toggleCameraMode();
      return;
    }
    if (event.code === "KeyC") {
      event.preventDefault();
      if (ridingAtAt) {
        atAtFirstPerson = !atAtFirstPerson;
        orbitYawOffset = 0;
        pitch = 0.34;
        return;
      }
      toggleFirstThirdPersonCamera();
      return;
    }
    if (event.code === "Digit0" || event.code === "Numpad0") {
      event.preventDefault();
      resetDefaultThirdPersonCamera();
      return;
    }
    if ((event.code === "Enter" || event.code === "NumpadEnter") && interactionChoiceOpen && interactionActions.length > 1) {
      event.preventDefault();
      executeSelectedInteraction();
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (scaleGunAiming) return;
      if (!isFlightActive()) handleJumpPress();
      return;
    }
    if (event.code === "Equal" || event.code === "NumpadAdd") {
      if (isXWingColliderDebugActive() && !scaleGunAiming) {
        event.preventDefault();
        adjustXWingColliderScale(1);
        return;
      }
      if (scaleGunAiming) {
        event.preventDefault();
        fireScaleGun("grow");
        return;
      }
      if (mapOpen) {
        adjustMapZoom(1);
        return;
      }
      adjustCameraDistance(-1);
      return;
    }
    if (event.code === "Minus" || event.code === "NumpadSubtract") {
      if (isXWingColliderDebugActive() && !scaleGunAiming) {
        event.preventDefault();
        adjustXWingColliderScale(-1);
        return;
      }
      if (scaleGunAiming) {
        event.preventDefault();
        fireScaleGun("shrink");
        return;
      }
      if (mapOpen) {
        adjustMapZoom(-1);
        return;
      }
      adjustCameraDistance(1);
      return;
    }
    keyState.add(event.code);
    if (event.code === "KeyE") interact();
  });
  window.addEventListener("keyup", (event) => {
    if (event.code === "Backquote") {
      event.preventDefault();
      showControlsGuide(false);
      return;
    }
    if (event.code === "KeyF") {
      handleMapKeyUp(event);
      return;
    }
    if (event.code === "KeyJ") {
      laserSwordRaised = false;
      keyState.delete(event.code);
      event.preventDefault();
      return;
    }
    keyState.delete(event.code);
  });
  window.addEventListener("blur", () => {
    keyState.clear();
    laserSwordRaised = false;
    clearMapHoldTimer();
    if (mapHoldTriggered && !mapHoldPreviousOpen) closeMapUi();
    setMapExpanded(false);
    mapHoldTriggered = false;
    mapHoldPreviousOpen = false;
    resetStick();
  });
  window.addEventListener("resize", onResize);

  renderer.domElement.addEventListener("pointerdown", (event) => {
    if (!started) return;
    if (orbitalDefense.active) {
      orbitalDefense.fire();
      if (!isTouchLike() && document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock();
      return;
    }
    if (isTouchLike()) {
      handleCanvasDoubleTap(event);
      return;
    }
    if (!isMapFocusActive()) renderer.domElement.requestPointerLock();
  });
  window.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== renderer.domElement) return;
    if (orbitalDefense.active) {
      orbitalDefense.addLookDelta(event.movementX, event.movementY);
      return;
    }
    if (isMapFocusActive()) return;
    if (scaleGunAiming) {
      orbitYawOffset = wrapSignedAngle(orbitYawOffset - event.movementX * 0.0026);
      pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.0018, 0.34 + SCALE_GUN_AIM_PITCH_MIN, 0.34 + SCALE_GUN_AIM_PITCH_MAX);
      return;
    }
    if (cameraMode) {
      orbitYawOffset = wrapSignedAngle(orbitYawOffset - event.movementX * 0.0022);
      pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.0015, 0.16, 0.88);
      return;
    }
    orbitYawOffset = THREE.MathUtils.clamp(orbitYawOffset - event.movementX * 0.0022, -0.85, 0.85);
    pitch = insideRocket
      ? THREE.MathUtils.clamp(pitch - event.movementY * 0.0015, 0.02, 1.68)
      : THREE.MathUtils.clamp(pitch - event.movementY * 0.0015, 0.12, 0.92);
  });
  window.addEventListener("wheel", (event) => {
    if (!started || exitConfirmOpen) return;
    if (photoViewerOpen) {
      event.preventDefault();
      adjustPhotoViewerZoom(event.deltaY < 0 ? 1 : -1);
      return;
    }
    if (cameraMode) {
      event.preventDefault();
      adjustCameraZoom(event.deltaY < 0 ? 1 : -1);
      return;
    }
    if (mapOpen) {
      event.preventDefault();
      adjustMapZoom(-Math.sign(event.deltaY));
      return;
    }
    adjustCameraDistance(Math.sign(event.deltaY));
  }, { passive: false });

  joystick.addEventListener("pointerdown", (event) => {
    if (!started || exitConfirmOpen || isMapFocusActive() || cameraMode || photoViewerOpen) return;
    mobileStick.active = true;
    mobileStick.pointerId = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    updateStick(event);
  });
  joystick.addEventListener("pointermove", (event) => {
    if (!mobileStick.active || mobileStick.pointerId !== event.pointerId) return;
    updateStick(event);
  });
  joystick.addEventListener("pointerup", (event) => {
    handleMobileFlightCodeGesture();
    resetStick(event);
  });
  joystick.addEventListener("pointercancel", resetStick);

  mobileBoostButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (!started || exitConfirmOpen || dialogueOpen) return;
    keyState.add(isFlightActive() ? "KeyQ" : "ShiftLeft");
    mobileBoostButton.setPointerCapture(event.pointerId);
  });
  mobileBoostButton.addEventListener("pointerup", (event) => {
    event.preventDefault();
    keyState.delete("ShiftLeft");
    keyState.delete("KeyQ");
  });
  mobileBoostButton.addEventListener("pointercancel", (event) => {
    event.preventDefault();
    keyState.delete("ShiftLeft");
    keyState.delete("KeyQ");
  });
  mobileBoostButton.addEventListener("lostpointercapture", () => {
    keyState.delete("ShiftLeft");
    keyState.delete("KeyQ");
  });
  mobileJumpButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (!started || exitConfirmOpen || dialogueOpen) return;
    if (ridingAtAt) {
      atAtFirstPerson = !atAtFirstPerson;
      orbitYawOffset = 0;
      pitch = 0.34;
      return;
    }
    if (isFlightActive()) {
      keyState.add("KeyE");
      mobileJumpButton.setPointerCapture(event.pointerId);
      return;
    }
    handleJumpPress();
  });
  mobileJumpButton.addEventListener("pointerup", (event) => {
    event.preventDefault();
    keyState.delete("KeyE");
  });
  mobileJumpButton.addEventListener("pointercancel", (event) => {
    event.preventDefault();
    keyState.delete("KeyE");
  });
  mobileJumpButton.addEventListener("lostpointercapture", () => {
    keyState.delete("KeyE");
  });
  mapRadar.addEventListener("pointerdown", (event) => {
    if (!started || exitConfirmOpen || !mapOpen || dialogueOpen || !isSmallScreenMapTouch()) return;
    event.preventDefault();
    event.stopPropagation();
    setMapExpanded(true);
  });

  window.addEventListener("pointerdown", startBackgroundMusic, { once: true, passive: true });
  window.addEventListener("keydown", startBackgroundMusic, { once: true });
}

function handleMysteryCodeKey(event: KeyboardEvent) {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return false;
  const key = event.key.toUpperCase();
  const isLetter = /^[A-Z]$/.test(key);
  const isColliderDebugSuffix = ENABLE_TEST_TOOLS && key === "-" && mysteryCodeProgress === MYSTERY_CODE;
  if (!isLetter && !isColliderDebugSuffix) return false;

  const nextMystery = `${mysteryCodeProgress}${key}`;
  const nextMoney = `${moneyCodeProgress}${key}`;
  const mysteryCodeTarget = ENABLE_TEST_TOOLS ? XWING_COLLIDER_DEBUG_CODE : MYSTERY_CODE;
  const matchesMystery = mysteryCodeTarget.startsWith(nextMystery);
  const matchesMoney = isLetter && MONEY_CODE.startsWith(nextMoney);

  if (matchesMystery || matchesMoney) {
    mysteryCodeProgress = matchesMystery ? nextMystery : "";
    moneyCodeProgress = matchesMoney ? nextMoney : "";
    event.preventDefault();
    if (mysteryCodeProgress === XWING_COLLIDER_DEBUG_CODE) {
      mysteryCodeProgress = "";
      activateXWingCollisionDebug();
    } else if (mysteryCodeProgress === MYSTERY_CODE) {
      activateHuyeeCheat();
    }
    if (moneyCodeProgress === MONEY_CODE) {
      moneyCodeProgress = "";
      activateMoneyCheat();
    }
    return true;
  }

  mysteryCodeProgress = MYSTERY_CODE.startsWith(key) ? key : "";
  moneyCodeProgress = MONEY_CODE.startsWith(key) ? key : "";
  if (mysteryCodeProgress || moneyCodeProgress) event.preventDefault();
  return mysteryCodeProgress.length > 0 || moneyCodeProgress.length > 0;
}

function handleKeyboardFlightCodeKey(event: KeyboardEvent) {
  if (!ENABLE_TEST_TOOLS) return false;
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return false;
  const direction = keyboardFlightCodeDirection(event.code);
  if (!direction) return false;

  const next = `${keyboardFlightCodeProgress}${direction}`;
  if (MOBILE_FLIGHT_CODE.startsWith(next)) {
    keyboardFlightCodeProgress = next;
    if (keyboardFlightCodeProgress === MOBILE_FLIGHT_CODE) {
      keyboardFlightCodeProgress = "";
      event.preventDefault();
      unlockEquipmentJetpack(true);
      return true;
    }
    return false;
  }

  keyboardFlightCodeProgress = MOBILE_FLIGHT_CODE.startsWith(direction) ? direction : "";
  return false;
}

function keyboardFlightCodeDirection(code: string) {
  if (code === "ArrowUp" || code === "KeyW") return "U";
  if (code === "ArrowDown" || code === "KeyS") return "D";
  if (code === "ArrowLeft" || code === "KeyA") return "L";
  if (code === "ArrowRight" || code === "KeyD") return "R";
  return "";
}

function setFlightModeEnabled(enabled: boolean, source: JetpackSource) {
  flightModeEnabled = enabled;
  jetpackActiveSource = enabled ? source : null;
  if (enabled) jetpackRecoveryStartedAt = -Infinity;
  playDingDong();
  if (enabled && started && canUseFlightMode()) {
    grounded = false;
    verticalVelocity = 0;
    playerAltitudeOffset = Math.max(playerAltitudeOffset, FLIGHT_MIN_ALTITUDE);
  }
  if (!enabled) {
    clearFlightControlKeys();
  }
  updateMobileFlightButtons();
  if (enabled) showJetpackControlsHint(source);
}

function activateTemporaryJetpack() {
  setFlightModeEnabled(true, "temporary");
}

function activateHuyeeCheat() {
  testModeEnabled = true;
  jetpackUnlocked = true;
  setScaleGunOwned(true);
  setLaserSwordOwned(true);
  hasCamera = true;
  orbitalDefense.setUnlocked(true);
  coins = Math.max(coins, 999);
  scorePoints = Math.max(scorePoints, TEST_MODE_SCORE);
  completedAnyTask = true;
  suitOxygen = SUIT_OXYGEN_MAX;
  stamina = STAMINA_MAX;
  jetpackEnergy = JETPACK_MAX_ENERGY;
  updateRewardReadouts();
  updatePlayerRank(true);
  updateAnomalyContentState();
  setCurrentMissionText();
  activateEquipmentJetpack();
  if (!started) return;
  showDialogue(
    localizeText("装备已开放"),
    localizeText("HUYEE 已启动：已获得全部装备、金币和经验值；所有场景均可自由体验。"),
    8.2,
  );
}

function activateXWingCollisionDebug() {
  xWingCollisionDebugEnabled = true;
  updateXWingColliderDebug();
  if (!started) return;
  showDialogue(
    localizeText("碰撞调试"),
    localizeText("HUYEE-U 已启动：X 翼碰撞范围已显示，可用 + / - 调整大小。"),
    6.2,
  );
}

function unlockEquipmentJetpack(startFlight: boolean) {
  jetpackUnlocked = true;
  jetpackEnergy = JETPACK_MAX_ENERGY;
  if (startFlight) {
    if (!activateEquipmentJetpack()) {
      playDingDong();
      updateMobileFlightButtons();
    }
  } else {
    playDingDong();
    updateMobileFlightButtons();
  }
}

function activateEquipmentJetpack() {
  if (!jetpackUnlocked || jetpackEnergy <= 0 || !canUseFlightMode()) return false;
  setFlightModeEnabled(true, "equipment");
  return true;
}

function showJetpackControlsHint(source: JetpackSource) {
  if (!started || !canUseFlightMode()) return;
  const equipmentHint = source === "equipment";
  showOneTimeOperationHelp("jetpack.controls", "飞行背包", jetpackControlsHintText(equipmentHint), 5.6);
}

function showOneTimeOperationHelp(id: string, speaker: string, text: string, seconds: number) {
  if (shownOperationHelpIds.has(id)) return false;
  shownOperationHelpIds.add(id);
  showDialogue(speaker, text, seconds);
  return true;
}

function jetpackControlsHintText(equipmentHint: boolean) {
  const touch = isSmallScreenMapTouch();
  if (isEnglish()) {
    if (touch) {
      return equipmentHint
        ? "Use the lower-left stick to steer. Use the right-side Ascend/Descend buttons for altitude. After landing, double-tap Jump to take off again."
        : "Use the lower-left stick to steer. Use the right-side Ascend/Descend buttons for altitude. Landing exits flight.";
    }
    return equipmentHint
      ? "Use W/S/A/D to steer, E to ascend, and Q to descend. Landing exits flight. Double-tap Space to take off again."
      : "Use W/S/A/D to steer, E to ascend, and Q to descend. Landing exits flight.";
  }
  if (touch) {
    return equipmentHint
      ? "左下角摇杆控制飞行方向；右侧“上升/下降”按钮控制高度，落地后双击“跳”可再次起飞。"
      : "左下角摇杆控制飞行方向；右侧“上升/下降”按钮控制高度，落地后退出飞行。";
  }
  return equipmentHint
    ? "W/S/A/D 控制飞行方向，E 上升，Q 下降；落地后退出飞行。双击空格可再次起飞。"
    : "W/S/A/D 控制飞行方向，E 上升，Q 下降；落地后退出飞行。";
}

function landFromFlight() {
  const landingSource = jetpackActiveSource;
  flightModeEnabled = false;
  jetpackActiveSource = null;
  if (landingSource === "equipment" && jetpackUnlocked && jetpackEnergy < JETPACK_MAX_ENERGY) {
    jetpackRecoveryStartedAt = elapsedTime;
    jetpackRecoveryStartEnergy = jetpackEnergy;
  }
  grounded = true;
  verticalVelocity = 0;
  playerVelocity.set(0, 0, 0);
  clearFlightControlKeys();
  updateMobileFlightButtons();
}

function canUseFlightMode() {
  return started && !wormholeFall && !world.habitatDoor.occupied && !insideGreenhouse && !insideRocket && !ridingElevator && !ridingRover && !ridingAtAt;
}

function isFlightActive() {
  return flightModeEnabled && canUseFlightMode();
}

function clearFlightControlKeys() {
  keyState.delete("KeyE");
  keyState.delete("KeyQ");
  keyState.delete("Space");
  keyState.delete("ControlLeft");
  keyState.delete("ControlRight");
}

function resetJetpackState() {
  flightModeEnabled = false;
  jetpackUnlocked = false;
  jetpackEnergy = JETPACK_MAX_ENERGY;
  jetpackActiveSource = null;
  jetpackRecoveryStartedAt = -Infinity;
  jetpackRecoveryStartEnergy = JETPACK_MAX_ENERGY;
  keyboardFlightCodeProgress = "";
  mobileFlightCodeProgress = "";
  lastJumpPressAt = -Infinity;
  clearFlightControlKeys();
  updateMobileFlightButtons();
}

function disableActiveJetpackForRespawn() {
  flightModeEnabled = false;
  jetpackActiveSource = null;
  jetpackRecoveryStartedAt = -Infinity;
  lastJumpPressAt = -Infinity;
  clearFlightControlKeys();
  updateMobileFlightButtons();
}

function handleCanvasDoubleTap(event: PointerEvent) {
  if (event.pointerType === "mouse") return;
  if (exitConfirmOpen || dialogueOpen || isMapFocusActive() || cameraMode || photoViewerOpen || scaleGunAiming) return;
  const now = performance.now();
  const distance = Math.hypot(event.clientX - lastCanvasTapX, event.clientY - lastCanvasTapY);
  if (now - lastCanvasTapAt < 360 && distance < 74) {
    event.preventDefault();
    lastCanvasTapAt = 0;
    if (ridingAtAt) {
      atAtFirstPerson = !atAtFirstPerson;
      orbitYawOffset = 0;
      pitch = 0.34;
      return;
    }
    toggleFirstThirdPersonCamera();
    return;
  }
  lastCanvasTapAt = now;
  lastCanvasTapX = event.clientX;
  lastCanvasTapY = event.clientY;
}

function handleMobileFlightCodeGesture() {
  if (!ENABLE_TEST_TOOLS) return;
  if (!started || exitConfirmOpen || dialogueOpen || wormholeFall) return;
  const direction = mobileStickDirection();
  if (!direction) return;
  const next = `${mobileFlightCodeProgress}${direction}`;
  if (MOBILE_FLIGHT_CODE.startsWith(next)) {
    mobileFlightCodeProgress = next;
    if (mobileFlightCodeProgress === MOBILE_FLIGHT_CODE) {
      mobileFlightCodeProgress = "";
      unlockEquipmentJetpack(true);
    }
    return;
  }
  mobileFlightCodeProgress = MOBILE_FLIGHT_CODE.startsWith(direction) ? direction : "";
}

function mobileStickDirection() {
  const absX = Math.abs(mobileStick.x);
  const absY = Math.abs(mobileStick.y);
  if (Math.max(absX, absY) < 0.62) return "";
  if (absY >= absX) return mobileStick.y < 0 ? "U" : "D";
  return mobileStick.x < 0 ? "L" : "R";
}

function updateMobileFlightButtons() {
  if (ridingAtAt) {
    const boostLabel = localizeText("快速行进");
    const viewLabel = localizeText("切换视角");
    mobileBoostButton.textContent = boostLabel;
    mobileBoostButton.setAttribute("aria-label", boostLabel);
    mobileJumpButton.textContent = viewLabel;
    mobileJumpButton.setAttribute("aria-label", viewLabel);
    return;
  }
  const flightActive = isFlightActive();
  const boostLabel = localizeText(flightActive ? "下降" : "加速");
  const jumpLabel = localizeText(flightActive ? "上升" : "跳");
  mobileBoostButton.textContent = boostLabel;
  mobileBoostButton.setAttribute("aria-label", boostLabel);
  mobileJumpButton.textContent = jumpLabel;
  mobileJumpButton.setAttribute("aria-label", jumpLabel);
}

function updateJetpackEnergy(delta: number) {
  if (!started || wormholeFall || !jetpackUnlocked) return;
  if (jetpackActiveSource === "equipment" && isFlightActive()) {
    jetpackEnergy = Math.max(0, jetpackEnergy - JETPACK_DRAIN_PER_SECOND * delta);
    if (jetpackEnergy <= 0) {
      playerAltitudeOffset = 0;
      landFromFlight();
      placePlayerOnPlanet();
      showDialogue("飞行背包", "飞行背包能量耗尽，已安全降落。", 3);
    }
    return;
  }
  if (!isFlightActive() && grounded && playerAltitudeOffset <= 0) {
    if (jetpackEnergy >= JETPACK_MAX_ENERGY) {
      jetpackRecoveryStartedAt = -Infinity;
      jetpackEnergy = JETPACK_MAX_ENERGY;
      return;
    }
    if (!Number.isFinite(jetpackRecoveryStartedAt)) {
      jetpackRecoveryStartedAt = elapsedTime;
      jetpackRecoveryStartEnergy = jetpackEnergy;
    }
    const recoveryT = THREE.MathUtils.clamp((elapsedTime - jetpackRecoveryStartedAt) / JETPACK_RECOVERY_SECONDS, 0, 1);
    jetpackEnergy = THREE.MathUtils.lerp(jetpackRecoveryStartEnergy, JETPACK_MAX_ENERGY, recoveryT);
    if (recoveryT >= 1) {
      jetpackEnergy = JETPACK_MAX_ENERGY;
      jetpackRecoveryStartedAt = -Infinity;
    }
  }
}

function currentPlayerInsideState(): PlayerInsideState {
  if (world.habitatDoor.occupied) return "habitat";
  if (insideGreenhouse) return "greenhouse";
  if (insideRocket) return "rocket";
  if (ridingElevator) return "elevator";
  return "surface";
}

function handleTitleScreenKey(event: KeyboardEvent) {
  if (event.code === "ArrowUp" || event.code === "ArrowDown" || event.code === "KeyW" || event.code === "KeyS") {
    event.preventDefault();
    const direction = event.code === "ArrowUp" || event.code === "KeyW" ? -1 : 1;
    const nextIndex = (selectedTitleActionIndex + direction + titleActionButtons.length) % titleActionButtons.length;
    selectTitleAction(nextIndex, true, true);
    return true;
  }
  if (event.code === "KeyQ") {
    event.preventDefault();
    selectTitleAction(1, false, selectedTitleActionIndex !== 1);
    openStorySummary();
    return true;
  }
  if (event.code === "KeyE") {
    event.preventDefault();
    selectTitleAction(0, false, selectedTitleActionIndex !== 0);
    startGame();
    return true;
  }
  return false;
}

function selectTitleAction(index: number, shouldFocus = false, shouldBeep = false) {
  const changed = selectedTitleActionIndex !== index;
  selectedTitleActionIndex = index;
  updateTitleActionSelection(shouldFocus);
  if (changed && shouldBeep) playUiBeep();
}

function updateTitleActionSelection(shouldFocus = false) {
  titleActionButtons.forEach((button, index) => {
    const selected = index === selectedTitleActionIndex;
    button.classList.toggle("is-title-selected", selected);
    button.setAttribute("aria-current", selected ? "true" : "false");
  });
  if (shouldFocus) titleActionButtons[selectedTitleActionIndex]?.focus();
}

function activateSelectedTitleAction() {
  if (selectedTitleActionIndex === 0) {
    startGame();
    return;
  }
  openStorySummary();
}

function openStorySummary() {
  playUiBeep();
  window.setTimeout(() => {
    window.location.href = `/story-overview.html?lang=${encodeURIComponent(currentLanguage)}`;
  }, 110);
}

function openExitConfirm() {
  if (exitConfirmOpen) return;
  exitConfirmOpen = true;
  selectedExitConfirmIndex = 0;
  keyState.clear();
  resetStick();
  clearMapHoldTimer();
  playUiBeep();
  if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
  exitConfirm.classList.add("is-visible");
  exitConfirm.setAttribute("aria-hidden", "false");
  document.body.classList.add("exit-confirm-open");
  updateExitConfirmSelection(true);
}

function closeExitConfirm() {
  if (!exitConfirmOpen) return;
  exitConfirmOpen = false;
  keyState.clear();
  playUiBeep();
  exitConfirm.classList.remove("is-visible");
  exitConfirm.setAttribute("aria-hidden", "true");
  document.body.classList.remove("exit-confirm-open");
  renderer.domElement.focus();
}

function confirmExitToTitle() {
  if (!exitConfirmOpen) return;
  playUiBeep();
  exitConfirmOpen = false;
  exitConfirm.classList.remove("is-visible");
  exitConfirm.setAttribute("aria-hidden", "true");
  document.body.classList.remove("exit-confirm-open");
  returnToTitle();
}

function handleExitConfirmKey(event: KeyboardEvent) {
  event.preventDefault();
  if (event.code === "Escape") {
    closeExitConfirm();
    return;
  }
  if (event.code === "ArrowLeft" || event.code === "ArrowUp" || event.code === "ArrowRight" || event.code === "ArrowDown") {
    const direction = event.code === "ArrowLeft" || event.code === "ArrowUp" ? -1 : 1;
    const nextIndex = (selectedExitConfirmIndex + direction + exitConfirmButtons.length) % exitConfirmButtons.length;
    selectExitConfirmAction(nextIndex, true, true);
    return;
  }
  if (event.code === "Enter" || event.code === "NumpadEnter" || event.code === "Space") {
    if (selectedExitConfirmIndex === 0) closeExitConfirm();
    else confirmExitToTitle();
  }
}

function selectExitConfirmAction(index: number, shouldFocus = false, shouldBeep = false) {
  const changed = selectedExitConfirmIndex !== index;
  selectedExitConfirmIndex = index;
  updateExitConfirmSelection(shouldFocus);
  if (changed && shouldBeep) playUiBeep();
}

function updateExitConfirmSelection(shouldFocus = false) {
  exitConfirmButtons.forEach((button, index) => {
    const selected = index === selectedExitConfirmIndex;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-current", selected ? "true" : "false");
  });
  if (shouldFocus) exitConfirmButtons[selectedExitConfirmIndex]?.focus();
}

function toggleHud() {
  if (!started) return;
  hudCollapsed = !hudCollapsed;
  document.body.classList.toggle("hud-collapsed", hudCollapsed);
  hudToggle.setAttribute("aria-pressed", String(!hudCollapsed));
  hudToggle.setAttribute("aria-label", hudCollapsed ? "显示界面信息" : "隐藏界面信息");
}

function toggleMissionPanel() {
  if (!started) return;
  if (pendingSteveCall) {
    acceptPendingSteveCall();
    return;
  }
  setMissionPanelOpen(!missionPanelOpen, true);
}

function setMissionPanelOpen(open: boolean, userInitiated = false) {
  if (open && isSmallScreenMapTouch() && mapOpen) closeMapUi();
  missionPanelOpen = open;
  document.body.classList.toggle("mission-panel-open", missionPanelOpen);
  missionToggle.setAttribute("aria-pressed", String(missionPanelOpen));
  missionToggle.setAttribute("aria-label", missionPanelOpen ? tr("missionToggle.hide") : tr("missionToggle.show"));
  if (missionPanelOpen || userInitiated) {
    missionUnread = false;
    if (!pendingSteveCall) missionToggle.classList.remove("has-mission-update");
  }
}

function acceptPendingSteveCall() {
  if (!pendingSteveCall) return;
  const scene = pendingSteveCall;
  pendingSteveCall = null;
  pendingSteveCallQueuedAt = -Infinity;
  missionUnread = false;
  missionToggle.classList.remove("has-mission-update");
  setMissionPanelOpen(false);
  openDialogueScene(scene);
}

function clearMissionIntroTimer() {
  if (!missionIntroTimer) return;
  window.clearTimeout(missionIntroTimer);
  missionIntroTimer = null;
}

function previewMissionPanel() {
  clearMissionIntroTimer();
  setMissionPanelOpen(true);
  missionIntroTimer = window.setTimeout(() => {
    setMissionPanelOpen(false);
    missionIntroTimer = null;
  }, 4200);
}

function showControlsGuide(visible: boolean) {
  controlsGuideOpen = visible;
  if (visible && !controlsGuideUsed) controlsGuideUsed = true;
  controlsGuide.classList.toggle("is-visible", controlsGuideOpen);
  controlsGuide.setAttribute("aria-hidden", String(!controlsGuideOpen));
}

function closeMapUi() {
  mapOpen = false;
  mapExpanded = false;
  mapHoldTriggered = false;
  mapHoldPreviousOpen = false;
  clearMapHoldTimer();
  document.body.classList.remove("map-open", "map-expanded");
  mapOverlay.setAttribute("aria-hidden", "true");
  radarContactSignature = "";
  updateMapButtonState();
}

function toggleMap() {
  if (!started) return;
  setMapOpen(!mapOpen);
}

function setMapOpen(open: boolean, closeMissionOnSmall = true) {
  if (open && closeMissionOnSmall && isSmallScreenMapTouch()) setMissionPanelOpen(false);
  mapOpen = open;
  radarContactSignature = "";
  if (!mapOpen) setMapExpanded(false);
  document.body.classList.toggle("map-open", mapOpen);
  mapOverlay.setAttribute("aria-hidden", String(!mapOpen));
  updateMapButtonState();
  if (mapOpen) updateMap();
}

function handleMapKeyDown(event: KeyboardEvent) {
  event.preventDefault();
  if (event.repeat || mapHoldTimer || mapHoldTriggered) return;
  mapHoldTriggered = false;
  mapHoldPreviousOpen = mapOpen;
  mapHoldTimer = window.setTimeout(() => {
    mapHoldTimer = null;
    mapHoldTriggered = true;
    if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
    openMap();
    setMapExpanded(true);
  }, 320);
}

function handleMapKeyUp(event: KeyboardEvent) {
  event.preventDefault();
  if (mapHoldTimer) {
    clearMapHoldTimer();
    if (!mapHoldTriggered) toggleMap();
    return;
  }
  if (mapHoldTriggered) {
    setMapExpanded(false);
    if (!mapHoldPreviousOpen) closeMapUi();
    mapHoldTriggered = false;
    mapHoldPreviousOpen = false;
  }
}

function openMap() {
  if (!started || mapOpen) return;
  setMapOpen(true);
}

function updateMapButtonState() {
  mapToggle.setAttribute("aria-pressed", String(mapOpen));
  mapToggle.setAttribute("aria-label", mapOpen ? tr("map.close") : tr("map.open"));
}

function setMapExpanded(expanded: boolean) {
  if (mapExpanded === expanded) return;
  mapExpanded = expanded;
  radarContactSignature = "";
  document.body.classList.toggle("map-expanded", mapExpanded);
  if (mapOpen) updateMap();
}

function handleExpandedMapKey(event: KeyboardEvent) {
  if (!mapExpanded || !mapHoldTriggered) return false;
  if (event.code === "KeyQ") {
    event.preventDefault();
    adjustMapZoom(-1);
    return true;
  }
  if (event.code === "KeyE") {
    event.preventDefault();
    adjustMapZoom(1);
    return true;
  }
  if (isScaleGunAimControlKey(event.code) || event.code === "Space" || event.code === "ShiftLeft" || event.code === "ShiftRight") {
    event.preventDefault();
    return true;
  }
  return false;
}

function clearMapHoldTimer() {
  if (!mapHoldTimer) return;
  window.clearTimeout(mapHoldTimer);
  mapHoldTimer = null;
}

function toggleScaleGunAiming(force?: boolean) {
  if (!started) return;
  if (ridingAtAt) {
    scaleGunAiming = false;
    updateScaleGunOverlay();
    return;
  }
  if (!hasScaleGun) {
    showDialogue("缩放枪", "尚未获得。去黑色方碑处取得它。", 2.4);
    return;
  }
  if (!canUseScaleGun()) {
    showDialogue("缩放枪", "当前空间太窄，无法展开瞄准镜。", 2.4);
    return;
  }
  const next = force ?? !scaleGunAiming;
  if (next === scaleGunAiming) return;
  if (next && laserSwordActive) toggleLaserSword(false);
  scaleGunAiming = next;
  if (scaleGunAiming) {
    suppressTransientInfoWindows();
    scaleGunCameraDistanceBefore = cameraDistance;
    cameraDistance = CAMERA_MIN_DISTANCE;
    pitch = 0.34;
    orbitYawOffset = 0;
    exitFrontCamera = null;
    clearMovementInputState();
    resetStick();
    playerVelocity.set(0, 0, 0);
    camera.fov = 46;
    showControlsGuide(false);
    closeMapUi();
  } else {
    cameraDistance = Math.max(scaleGunCameraDistanceBefore, 1.2);
    pitch = 0.34;
    orbitYawOffset = 0;
    camera.fov = 54;
    scaleGunTarget = null;
    lastScaleGunTargetUuid = null;
  }
  camera.updateProjectionMatrix();
  updateLaserSwordVisual();
  updateScaleGunOverlay();
}

function toggleLaserSword(force?: boolean) {
  if (!started) return;
  if (!hasLaserSword) {
    showLaserSwordLockedPrompt();
    return;
  }
  if (dialogueOpen || exitConfirmOpen || photoViewerOpen || world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator || ridingRover || ridingAtAt) return;
  const next = force ?? !laserSwordActive;
  if (next === laserSwordActive) return;
  if (next && scaleGunAiming) toggleScaleGunAiming(false);
  laserSwordActive = next;
  if (!laserSwordActive) laserSwordRaised = false;
  updateLaserSwordVisual();
}

function showLaserSwordLockedPrompt() {
  if (!started || dialogueOpen || exitConfirmOpen || photoViewerOpen) return;
  if (elapsedTime - lastLaserSwordLockedPromptAt < 2.2) return;
  lastLaserSwordLockedPromptAt = elapsedTime;
  showDialogue("激光剑", localizeText("尚未获得激光剑。驾驶 X 翼成功清除全部危险陨石、完成一次基地防卫后即可获得。"), 4.2);
}

function canUseLaserSword() {
  return hasLaserSword && started && !dialogueOpen && !exitConfirmOpen && !photoViewerOpen && !world.habitatDoor.occupied && !insideGreenhouse && !insideRocket && !ridingElevator && !ridingRover && !ridingAtAt && !wormholeFall && !isWormholeWhiteoutActive();
}

function updateLaserSwordVisual() {
  if (laserSwordActive && !canUseLaserSword()) {
    laserSwordActive = false;
    laserSwordRaised = false;
  }
  if (!laserSwordActive) laserSwordRaised = false;
  playerRig.laserSword.visible = laserSwordActive;
  playerRig.laserSwordLight.visible = false;
  playerRig.laserSwordLight.intensity = 0;
  playerRig.laserSwordLight.distance = laserSwordActive && laserSwordRaised ? LASER_SWORD_RAISED_LIGHT_DISTANCE : LASER_SWORD_LIGHT_DISTANCE;
  playerRig.scaleGun.visible = hasScaleGun && scaleGunAiming && !laserSwordActive;
}

function laserSwordLightDistance() {
  return laserSwordRaised ? LASER_SWORD_RAISED_LIGHT_DISTANCE : LASER_SWORD_LIGHT_DISTANCE;
}

function laserSwordLightIntensity() {
  return laserSwordRaised ? LASER_SWORD_RAISED_LIGHT_INTENSITY : LASER_SWORD_LIGHT_INTENSITY;
}

function currentLaserSwordLightPosition(target: THREE.Vector3) {
  if (cameraDistance <= 0.9) {
    camera.getWorldDirection(laserSwordViewDirection);
    return target
      .copy(camera.position)
      .addScaledVector(laserSwordViewDirection, laserSwordRaised ? 1.45 : 0.95)
      .addScaledVector(playerNormal, -0.12);
  }
  playerRig.laserSwordLight.getWorldPosition(target);
  return target;
}

function updateLaserSwordWorldLight() {
  if (!laserSwordActive || !canUseLaserSword()) {
    laserSwordWorldLight.visible = false;
    laserSwordWorldLight.intensity = 0;
    return;
  }
  currentLaserSwordLightPosition(laserSwordWorldLight.position);
  laserSwordWorldLight.visible = true;
  laserSwordWorldLight.intensity = laserSwordLightIntensity();
  laserSwordWorldLight.distance = laserSwordLightDistance();
}

function currentLaserSwordThreat() {
  if (!laserSwordActive || !laserSwordWorldLight.visible) return null;
  return {
    position: laserSwordWorldLight.position,
    radius: laserSwordLightDistance() * (laserSwordRaised ? 1.35 : 1.15),
    strength: laserSwordRaised ? 1.8 : 1,
  };
}

function currentSpiderPlayerThreat() {
  // A normal jump is not flight: spiders can still track the astronaut while
  // airborne. Only an active equipment jetpack at real flight altitude hides
  // the player from detection.
  const jetpackEvasion = isFlightActive()
    && jetpackActiveSource === "equipment"
    && playerAltitudeOffset >= FLIGHT_MIN_ALTITUDE * 0.5;
  const canBeHunted =
    started &&
    !wormholeFall &&
    !dialogueOpen &&
    !world.habitatDoor.occupied &&
    !insideGreenhouse &&
    !insideRocket &&
    !ridingElevator &&
    !ridingRover &&
    !ridingAtAt &&
    !jetpackEvasion;
  return { normal: playerNormal, active: canBeHunted };
}

function tryLaserSwordAttack() {
  if (!laserSwordActive || !laserSwordRaised || !canUseLaserSword()) return;
  if (elapsedTime < lastLaserSwordAttackAt + SPIDER_BLADE_COOLDOWN_SECONDS) return;
  lastLaserSwordAttackAt = elapsedTime;

  let target: DarkSpider | null = null;
  let nearestDistance = Infinity;
  for (const spider of world.darkSpiders) {
    if (spider.defeated || !spider.group.visible) continue;
    const distance = surfaceDistanceBetween(playerNormal, spider.normal);
    if (distance > SPIDER_BLADE_RANGE || distance >= nearestDistance) continue;
    const direction = spider.normal.clone().addScaledVector(playerNormal, -playerNormal.dot(spider.normal));
    if (direction.lengthSq() > 0.000001 && direction.normalize().dot(playerForward) < SPIDER_BLADE_FORWARD_DOT) continue;
    target = spider;
    nearestDistance = distance;
  }
  if (!target) return;

  const result = applySpiderBladeDamage(target.health);
  target.health = result.health;
  target.hitUntil = elapsedTime + 2.4;
  target.attacking = false;
  target.eyeMaterial.color.set(0xffe6a0);
  playScaleGunLockBeep();
  if (!result.defeated) return;

  defeatSpider(target);
}

function defeatSpider(spider: DarkSpider) {
  if (spider.defeated) return;
  spider.defeated = true;
  spider.health = 0;
  spider.attacking = false;
  spider.deathStartedAt = elapsedTime;
  spider.group.visible = true;
  spider.visual.visible = true;
  const deathStartedAt = spider.deathStartedAt;
  window.setTimeout(() => {
    if (!spider.defeated || spider.deathStartedAt !== deathStartedAt) return;
    spider.group.visible = false;
    spider.visual.visible = false;
  }, 3300);
  spider.visual.rotation.set(Math.PI, 0, 0);
  spider.eyeMaterial.color.set(0x596064);
  awardSpiderDefeatReward();
}

function updateSpiderDeathStates() {
  for (const spider of world.darkSpiders) {
    if (!spider.defeated || spider.deathStartedAt === -Infinity) continue;
    const age = elapsedTime - spider.deathStartedAt;
    if (age >= 3.2) {
      spider.group.visible = false;
      spider.visual.visible = false;
      continue;
    }
    spider.group.visible = true;
    spider.visual.visible = true;
    spider.visual.rotation.x = Math.PI;
    spider.visual.rotation.z = Math.sin(age * 4.2 + spider.phase) * 0.045;
    spider.eyeMaterial.color.set(0x596064);
  }
}

function updateAtAtSpiderCollisions() {
  if (!ridingAtAt) return;
  const footPosition = new THREE.Vector3();
  for (const spider of world.darkSpiders) {
    if (spider.defeated || !spider.group.visible) continue;
    let crushed = false;
    for (const footAnchor of world.atAt.footAnchors) {
      footAnchor.getWorldPosition(footPosition);
      if (surfaceDistanceBetween(footPosition.normalize(), spider.normal) <= 2.75) {
        crushed = true;
        break;
      }
    }
    if (crushed) defeatSpider(spider);
  }
}

function awardSpiderDefeatReward() {
  coins += 50;
  scorePoints += 100;
  updateRewardReadouts();
  updatePlayerRank();
  pulseRewardReadout(coinReadout, false);
  pulseRewardReadout(scoreReadout, false);
  showRewardFloat(localizeText("+50 金币 · +100 经验值"), false);
  playCoinDing();
  playScoreRewardSound(4);
}

function updateSpiderTouchDamage() {
  if (!started || wormholeFall || !grounded || playerAltitudeOffset > 0.06 || (laserSwordActive && canUseLaserSword())) return;
  if (world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator || ridingRover || ridingAtAt) return;
  if (elapsedTime < lastSpiderDamageAt + SPIDER_DAMAGE_GLOBAL_COOLDOWN_SECONDS) return;
  for (const spider of world.darkSpiders) {
    if (!spider.group.visible) continue;
    if (!spider.attacking) continue;
    const distance = surfaceDistanceBetween(playerNormal, spider.normal);
    if (distance > SPIDER_TOUCH_DISTANCE) continue;
    if (elapsedTime < spider.lastDamageAt + SPIDER_TOUCH_COOLDOWN_SECONDS) continue;
    spider.lastDamageAt = elapsedTime;
    lastSpiderDamageAt = elapsedTime;
    const damage = SPIDER_TOUCH_DAMAGE * THREE.MathUtils.clamp(spider.damageFactor, SCALE_GUN_MIN_FACTOR, SCALE_GUN_MAX_FACTOR);
    stamina = Math.max(0, stamina - damage);
    triggerSpiderDamageFeedback(spider);
    if (stamina <= 0) {
      respawnAfterStaminaDepleted();
      return;
    }
    showDialogue("火星蜘蛛", `红眼蜘蛛触碰了宇航服，体能 -${Math.round(damage)}。`, 2);
  }
}

function updateSpiderHealthHuds() {
  const worldPosition = new THREE.Vector3();
  for (const spider of world.darkSpiders) {
    const hud = spiderHealthHuds.get(spider);
    if (!hud) continue;
    const visible = !spider.defeated
      && spider.group.visible
      && elapsedTime < spider.hitUntil
      && started
      && !dialogueOpen
      && !world.habitatDoor.occupied
      && !insideGreenhouse
      && !insideRocket
      && !ridingElevator
      && !ridingRover
      && !ridingAtAt;
    hud.root.hidden = !visible;
    if (!visible) continue;
    spider.group.getWorldPosition(worldPosition);
    worldPosition.addScaledVector(spider.normal, 3.1).project(camera);
    if (worldPosition.z < -1 || worldPosition.z > 1) {
      hud.root.hidden = true;
      continue;
    }
    hud.root.style.left = `${(worldPosition.x * 0.5 + 0.5) * window.innerWidth}px`;
    hud.root.style.top = `${(-worldPosition.y * 0.5 + 0.5) * window.innerHeight}px`;
    const ratio = THREE.MathUtils.clamp(spider.health / Math.max(spider.maxHealth, 1), 0, 1);
    hud.fill.style.width = `${ratio * 100}%`;
    hud.value.textContent = `${Math.ceil(spider.health)} / ${SPIDER_MAX_HEALTH}`;
  }
}

function triggerSpiderDamageFeedback(spider: DarkSpider) {
  spiderDamageVignette.classList.remove("is-active");
  void spiderDamageVignette.offsetWidth;
  spiderDamageVignette.classList.add("is-active");

  const previousNormal = playerNormal.clone();
  let away = playerNormal.clone().addScaledVector(spider.normal, -playerNormal.dot(spider.normal)).projectOnPlane(playerNormal);
  if (away.lengthSq() < 0.000001) away = playerForward.clone().negate().projectOnPlane(playerNormal);
  if (away.lengthSq() < 0.000001) return;
  away.normalize();
  const angularDistance = SPIDER_KNOCKBACK_DISTANCE / PLANET_RADIUS;
  playerNormal.multiplyScalar(Math.cos(angularDistance)).addScaledVector(away, Math.sin(angularDistance)).normalize();
  playerForward.projectOnPlane(playerNormal).normalize();
  resolveCollisions(previousNormal);
  playerVelocity.copy(away).multiplyScalar(5.6);
  placePlayerOnPlanet();
}

function updateHeldGearPose() {
  updateLaserSwordVisual();
  if (!laserSwordActive) return;
  const normalArmX = -0.78 + Math.sin(elapsedTime * 2.1) * 0.025;
  playerRig.rightArm.rotation.x = laserSwordRaised ? Math.PI / 2 : normalArmX;
  playerRig.rightArm.rotation.z = laserSwordRaised ? 0.22 : 0.34;
}

function canUseScaleGun() {
  return started && hasScaleGun && !dialogueOpen && !exitConfirmOpen && !world.habitatDoor.occupied && !insideGreenhouse && !insideRocket && !ridingElevator;
}

function isScaleGunAimControlKey(code: string) {
  return code === "KeyW" || code === "KeyA" || code === "KeyS" || code === "KeyD" || code === "ArrowUp" || code === "ArrowLeft" || code === "ArrowDown" || code === "ArrowRight";
}

function clearMovementInputState() {
  keyState.delete("KeyW");
  keyState.delete("KeyA");
  keyState.delete("KeyS");
  keyState.delete("KeyD");
  keyState.delete("ArrowUp");
  keyState.delete("ArrowLeft");
  keyState.delete("ArrowDown");
  keyState.delete("ArrowRight");
  keyState.delete("ShiftLeft");
  keyState.delete("ShiftRight");
  keyState.delete("Space");
}

function wrapSignedAngle(angle: number) {
  return THREE.MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2) - Math.PI;
}

function updateScaleGunAimInput(delta: number) {
  let yawInput = 0;
  let pitchInput = 0;
  if (keyState.has("KeyA") || keyState.has("ArrowLeft")) yawInput += 1;
  if (keyState.has("KeyD") || keyState.has("ArrowRight")) yawInput -= 1;
  if (keyState.has("KeyW") || keyState.has("ArrowUp")) pitchInput += 1;
  if (keyState.has("KeyS") || keyState.has("ArrowDown")) pitchInput -= 1;

  yawInput -= mobileStick.x;
  pitchInput += -mobileStick.y;

  if (Math.abs(yawInput) > 0.001) {
    orbitYawOffset = wrapSignedAngle(orbitYawOffset + THREE.MathUtils.clamp(yawInput, -1, 1) * SCALE_GUN_AIM_YAW_SPEED * delta);
  }
  if (Math.abs(pitchInput) > 0.001) {
    pitch = THREE.MathUtils.clamp(
      pitch + THREE.MathUtils.clamp(pitchInput, -1, 1) * SCALE_GUN_AIM_PITCH_SPEED * delta,
      0.34 + SCALE_GUN_AIM_PITCH_MIN,
      0.34 + SCALE_GUN_AIM_PITCH_MAX
    );
  }
}

function updateScaleGun() {
  restoreExpiredScaleGunEffects();
  if (scaleGunAiming && !canUseScaleGun()) {
    toggleScaleGunAiming(false);
    return;
  }
  if (!scaleGunAiming) {
    lastScaleGunTargetUuid = null;
    updateScaleGunOverlay();
    return;
  }
  scaleGunTarget = findScaleGunTarget();
  const targetUuid = scaleGunTarget?.object.uuid ?? null;
  if (targetUuid && targetUuid !== lastScaleGunTargetUuid) playScaleGunLockBeep();
  lastScaleGunTargetUuid = targetUuid;
  updateScaleGunOverlay();
}

function updateScaleGunOverlay() {
  const visible = started && scaleGunAiming && hasScaleGun;
  scaleGunOverlay.classList.toggle("is-visible", visible);
  scaleGunOverlay.setAttribute("aria-hidden", String(!visible));
  scaleGunTargetLabel.textContent = visible && scaleGunTarget ? localizeLabel(scaleGunTarget.label) : tr("scale.noTarget");
  scaleGunSummary.textContent = visible && scaleGunTarget ? scaleGunTargetSummary(scaleGunTarget) : "";
}

function scaleGunTargetSummary(target: ScaleGunTarget) {
  return currentLanguage === "zh-CN" ? scaleGunTargetSummaryZh(target) : scaleGunTargetSummaryEn(target);
}

function scaleGunTargetSummaryZh(target: ScaleGunTarget) {
  const label = target.label;
  if (label === "太阳") return "直径约 139 万公里，表面约 5,500°C。\n火星平均距太阳约 2.28 亿公里，是基地昼夜与能源的源头。";
  if (target.kind === "starlink") return "参考 Starlink 低轨通信星座，用密集小卫星提供宽带链路。\nARES 版本负责火星基地与轨道中继通信。";
  if (target.kind === "meteor") return "石质近火流星，参考火星上常见的外来陨石发现。\n它沿近火轨道掠过，是雷达里的高速异常目标。";
  if (target.kind === "spider") return "红眼状态表示火星蜘蛛正在攻击。\n缩放倍率会同步改变它触碰宇航员时造成的体能伤害。";
  if (label.includes("NASA") || label.includes("火星车")) return "参考 NASA Perseverance：六轮、桅杆相机、机械臂和样本缓存系统。\n它代表真实火星探测留下的工程遗产。";
  if (label.includes("太阳能阵列")) return "太阳能阵列把日照转成基地电力，沙尘会降低输出。\n当前基地靠它给氧气站、温室和通信系统供电。";
  if (label.includes("居住舱")) return "参考火星模拟栖息舱，是巡检员生活、休整和照片展示区。\n它维持气压、温度和基础生存环境。";
  if (label.includes("温室")) return "受控生态舱，用补光、水循环和密封环境培育植物。\n它是基地从工程系统走向生态系统的第一步。";
  if (label.includes("氧气生产站")) return "氧气站从火星稀薄 CO2 大气中维持可呼吸储备。\n它和太阳能阵列耦合，是当前主线故障核心。";
  if (label.includes("甲烷燃料厂")) return "参考火星原位资源利用，把 CO2 与氢源转成甲烷燃料。\n它决定基地未来能否返航和扩建。";
  if (label.includes("机器人车库")) return "维修机器人调度点，负责外部管线、阵列和阀门巡检。\n基地无人值守时期主要靠它维持运行。";
  if (label.includes("通信塔")) return "基地到轨道与地球的通信节点，信号存在分钟级延迟。\n它把火星巡检数据传回任务控制。";
  if (label.includes("科研舱")) return "样本分析和材料打印区域，可复检密封件与地质样本。\n它把现场故障转成可执行维修方案。";
  if (label.includes("物资仓")) return "存放备件、密封环、食物和外勤消耗品。\n它是基地长期运行的缓冲库存。";
  if (label.includes("医疗舱")) return "生命体征监测与应急处理舱，参考远征医疗站。\n在火星上，小伤病也会变成任务风险。";
  if (label.includes("登陆飞船")) return "载人登陆器，负责把第一位居民送到基地附近。\n它是地球任务链和火星地表生活的连接点。";
  if (label.includes("货运飞船")) return "自动货运飞船，提前投送基地模块、备件和补给。\n多数火星基地建设都要先靠货运窗口铺底。";
  if (label.includes("返回飞船")) return "返程飞船，依赖燃料、导航和生命保障全部达标。\n它提醒玩家：定居之前，撤离能力同样重要。";
  if (label.includes("黑色方碑")) return "未知方碑，外形参考科幻中的单体遗迹符号。\n它是缩放枪与异常科技线索的入口。";
  if (label.includes("足球")) return "火星低重力下的娱乐物件。\n它让基地不只是工程设施，也有人类生活痕迹。";
  if (label === "福福") return "获救伙伴，来自坠毁飞船附近的意外生命迹象。\n当前跟随亚历克斯巡检，是基地里的温情变量。";
  if (label.includes("未知生命")) return "未归档生命迹象，行为和火星已知生态不匹配。\n靠近后才能确认它和古树门洞的关系。";
  if (label.includes("坠毁") || label.includes("残骸")) return "坠毁飞船残骸，参考薄壁不锈钢航天器破损形态。\n它记录了一次失败降落，也藏着救援线索。";
  if (label.includes("远古巨树") || label.includes("拱门")) return "远古巨树拱门，火星暗面的异常巨构。\n它内部的时空之门连接虫洞坠落事件。";
  if (label.includes("未知")) return "未归档目标，传感器只能确认轮廓和位置。\n靠近、对话或拍照后可补全身份。";
  return "可缩放实体，缩放效果 60 秒后恢复。\n观察尺寸变化时，留意它和基地系统的关系。";
}

function scaleGunTargetSummaryEn(target: ScaleGunTarget) {
  const label = target.label;
  if (label === "太阳") return "Diameter about 1.39 million km; surface about 5,500°C.\nMars orbits about 228 million km from it on average.";
  if (target.kind === "starlink") return "Inspired by Starlink low-orbit broadband constellations.\nARES uses it as a Mars orbital relay mesh.";
  if (target.kind === "meteor") return "A rocky near-Mars meteor inspired by real meteorite finds.\nIt is a fast radar anomaly crossing local orbit.";
  if (target.kind === "spider") return "Red eyes mean the Mars spider is attacking.\nScale changes also change its stamina damage on contact.";
  if (label.includes("NASA") || label.includes("火星车")) return "Inspired by NASA Perseverance: six wheels, mast cameras, arm, and sample cache.\nIt marks the engineering legacy of real Mars exploration.";
  if (label.includes("太阳能阵列")) return "Solar arrays convert sunlight into base power; dust reduces output.\nThey feed oxygen, greenhouse, and communication systems.";
  if (label.includes("居住舱")) return "A Mars habitat-style living and recovery module.\nIt keeps pressure, temperature, and survival basics stable.";
  if (label.includes("温室")) return "A controlled greenhouse for plants, water loops, and grow lights.\nIt is the base's first step toward an ecology.";
  if (label.includes("氧气生产站")) return "The oxygen plant maintains breathable reserves from the CO2-rich air.\nIts power link is central to the current failure.";
  if (label.includes("甲烷燃料厂")) return "Inspired by Mars in-situ fuel production.\nIt turns local resources into future return and expansion capacity.";
  if (label.includes("机器人车库")) return "Maintenance robot dispatch hub for pipes, arrays, and valves.\nIt kept the base alive before human arrival.";
  if (label.includes("通信塔")) return "Surface-to-orbit and Earth relay node with minutes of delay.\nIt carries patrol data back to mission control.";
  if (label.includes("科研舱")) return "Lab and fabrication module for samples, seals, and materials.\nIt turns field faults into repair plans.";
  if (label.includes("物资仓")) return "Stores spares, seal rings, food, and field consumables.\nIt is the base's operational buffer.";
  if (label.includes("医疗舱")) return "Expedition medical bay for monitoring and emergency care.\nOn Mars, small injuries can become mission risks.";
  if (label.includes("登陆飞船")) return "Crew lander linking the Earth mission chain to the surface base.\nIt delivered the first resident nearby.";
  if (label.includes("货运飞船")) return "Autonomous cargo lander for modules, spares, and supplies.\nMars bases depend on cargo windows before crew arrival.";
  if (label.includes("返回飞船")) return "Return vehicle requiring fuel, navigation, and life support readiness.\nSettlement still needs an escape path.";
  if (label.includes("黑色方碑")) return "Unknown monolith inspired by classic sci-fi artifact imagery.\nIt opens the scale-gun and anomaly technology thread.";
  if (label.includes("足球")) return "A low-gravity recreation object.\nIt makes the base feel lived in, not only engineered.";
  if (label === "福福") return "Rescued companion from the crash site life-sign anomaly.\nNow follows Alex as a warmer variable in the base.";
  if (label.includes("未知生命")) return "Uncatalogued life sign outside known Martian ecology.\nApproach to learn its tie to the ancient portal.";
  if (label.includes("坠毁") || label.includes("残骸")) return "Crashed ship wreckage inspired by thin-wall stainless spacecraft failure.\nIt records a hard landing and hides rescue clues.";
  if (label.includes("远古巨树") || label.includes("拱门")) return "Ancient tree arch, an anomalous megastructure on the dark side.\nIts portal connects to the wormhole fall event.";
  if (label.includes("未知")) return "Uncatalogued target; sensors confirm only outline and position.\nApproach, talk, or photograph it to identify.";
  return "Scalable object. The effect restores after 60 seconds.\nWatch how its size relates to nearby base systems.";
}

function awardCamera() {
  hasCamera = true;
  showDialogue("相机", "恭喜！你获得了一台相机\n随时按 G 键可以使用相机\n照片会展示在居住舱的墙上", 5.2);
  showRewardFloat(localizeText("相机已解锁"), false);
  playScoreRewardSound(2);
}

function canUseCamera() {
  return started && hasCamera && !dialogueOpen && !exitConfirmOpen && !world.habitatDoor.occupied && !insideGreenhouse && !insideRocket && !ridingElevator && !photoViewerOpen;
}

function toggleCameraMode(force?: boolean) {
  if (!started) return;
  if (!hasCamera) {
    showDialogue("相机", "相机功能尚未解锁。", 2.4);
    return;
  }
  if (!cameraMode && !canUseCamera()) {
    showDialogue("相机", "当前空间太窄，无法使用相机。", 2.4);
    return;
  }
  const next = force ?? !cameraMode;
  if (next === cameraMode) return;
  cameraMode = next;
  if (cameraMode) {
    suppressTransientInfoWindows();
    if (scaleGunAiming) toggleScaleGunAiming(false);
    cameraDistanceBeforeCamera = cameraDistance;
    cameraDistance = CAMERA_MIN_DISTANCE;
    cameraZoom = 1;
    pitch = 0.34;
    orbitYawOffset = 0;
    exitFrontCamera = null;
    clearMovementInputState();
    resetStick();
    playerVelocity.set(0, 0, 0);
    closeMapUi();
    showControlsGuide(false);
  } else {
    cameraDistance = Math.max(cameraDistanceBeforeCamera, 1.2);
    cameraZoom = 1;
    pitch = 0.34;
    orbitYawOffset = 0;
  }
  updateCameraZoomProjection();
  updateCameraOverlay();
}

function handleCameraModeKey(event: KeyboardEvent) {
  if (!cameraMode) return false;
  if (event.code === "KeyG" || event.code === "KeyQ" || event.code === "Escape") {
    event.preventDefault();
    toggleCameraMode(false);
    return true;
  }
  if (event.code === "KeyE" || event.code === "Enter" || event.code === "NumpadEnter") {
    event.preventDefault();
    captureCameraPhoto();
    return true;
  }
  if (event.code === "KeyW" || event.code === "ArrowUp") {
    event.preventDefault();
    adjustCameraZoom(1);
    return true;
  }
  if (event.code === "KeyS" || event.code === "ArrowDown") {
    event.preventDefault();
    adjustCameraZoom(-1);
    return true;
  }
  if (event.code === "KeyA" || event.code === "KeyD" || event.code === "ArrowLeft" || event.code === "ArrowRight") {
    event.preventDefault();
    keyState.add(event.code);
    return true;
  }
  return true;
}

function updateCameraModePlayer(delta: number) {
  playerVelocity.set(0, 0, 0);
  let turnInput = 0;
  if (keyState.has("KeyA") || keyState.has("ArrowLeft")) turnInput += 1;
  if (keyState.has("KeyD") || keyState.has("ArrowRight")) turnInput -= 1;
  if (Math.abs(turnInput) > 0.001) {
    playerForward.applyAxisAngle(playerNormal, turnInput * 1.18 * delta).projectOnPlane(playerNormal).normalize();
  }
  return 0;
}

function adjustCameraZoom(direction: number) {
  if (!cameraMode) return;
  const factor = direction > 0 ? 1.18 : 1 / 1.18;
  cameraZoom = THREE.MathUtils.clamp(cameraZoom * factor, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
  updateCameraZoomProjection();
  updateCameraOverlay();
}

function updateCameraZoomProjection() {
  camera.fov = cameraMode ? 54 / cameraZoom : 54;
  camera.updateProjectionMatrix();
}

function updateCameraOverlay() {
  const visible = started && cameraMode && hasCamera;
  cameraOverlay.classList.toggle("is-visible", visible);
  cameraOverlay.setAttribute("aria-hidden", String(!visible));
  cameraZoomReadout.textContent = `CAM ${cameraZoom.toFixed(1)}x`;
}

function updateCameraSystem() {
  if (cameraMode && !canUseCamera()) {
    toggleCameraMode(false);
    return;
  }
  updateCameraOverlay();
}

function captureCameraPhoto() {
  if (!cameraMode) return;
  const dataUrl = captureSceneToPngDataUrl();
  const texture = new THREE.TextureLoader().load(dataUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  cameraPhotos.push({ dataUrl, texture, takenAt: Date.now() });
  while (cameraPhotos.length > PHOTO_WALL_CAPACITY) {
    const removed = cameraPhotos.shift();
    removed?.texture.dispose();
  }
  updatePhotoWallFrames();
  showDialogue("相机", "照片已保存到居住舱电子屏", 2.2);
}

function captureSceneToPngDataUrl() {
  const drawingBufferSize = renderer.getDrawingBufferSize(new THREE.Vector2());
  const captureScale = Math.min(1, PHOTO_CAPTURE_MAX_EDGE / Math.max(drawingBufferSize.x, drawingBufferSize.y));
  const width = Math.max(1, Math.round(drawingBufferSize.x * captureScale));
  const height = Math.max(1, Math.round(drawingBufferSize.y * captureScale));
  const target = new THREE.WebGLRenderTarget(width, height, { depthBuffer: true });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const pixels = new Uint8Array(width * height * 4);
  const previousTarget = renderer.getRenderTarget();

  try {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
  } finally {
    renderer.setRenderTarget(previousTarget);
    target.dispose();
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建照片导出画布。");
  const imageData = context.createImageData(width, height);
  const rowLength = width * 4;
  for (let row = 0; row < height; row += 1) {
    const sourceOffset = row * rowLength;
    const targetOffset = (height - row - 1) * rowLength;
    imageData.data.set(pixels.subarray(sourceOffset, sourceOffset + rowLength), targetOffset);
  }
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

function createPhotoWall() {
  const group = new THREE.Group();
  group.name = "Habitat photo screen";
  group.position.set(5.58, -0.08, 0);
  group.rotation.y = -Math.PI / 2;

  const screenWidth = 3.06;
  const screenHeight = 1.54;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e2b31, roughness: 0.46, metalness: 0.52, emissive: 0x07161e, emissiveIntensity: 0.34 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x6fe7ff, transparent: true, opacity: 0.42, toneMapped: false });
  const screenMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: getPhotoWallStandbyTexture(),
    transparent: true,
    opacity: 1,
    toneMapped: false,
  });

  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(screenWidth + 0.22, screenHeight + 0.2, 0.08), frameMat);
  backPanel.position.set(0, 0.16, -0.02);
  backPanel.castShadow = true;
  group.add(backPanel);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenWidth, screenHeight), screenMat);
  screen.position.set(0, 0.16, 0.035);
  screen.renderOrder = 4;
  group.add(screen);
  photoWallScreen = screen;

  const borderTop = new THREE.Mesh(new THREE.BoxGeometry(screenWidth + 0.16, 0.035, 0.035), glowMat);
  const borderBottom = borderTop.clone();
  const borderLeft = new THREE.Mesh(new THREE.BoxGeometry(0.035, screenHeight + 0.14, 0.035), glowMat);
  const borderRight = borderLeft.clone();
  borderTop.position.set(0, screenHeight * 0.5 + 0.245, 0.052);
  borderBottom.position.set(0, -screenHeight * 0.5 + 0.075, 0.052);
  borderLeft.position.set(-screenWidth * 0.5 - 0.085, 0.16, 0.052);
  borderRight.position.set(screenWidth * 0.5 + 0.085, 0.16, 0.052);
  group.add(borderTop, borderBottom, borderLeft, borderRight);

  return group;
}

function updatePhotoWallFrames() {
  if (!photoWallScreen) return;
  const nextIndex = cameraPhotos.length === 0 ? -1 : Math.floor(elapsedTime / 4) % cameraPhotos.length;
  const nextTexture = nextIndex >= 0 ? cameraPhotos[nextIndex]?.texture ?? null : getPhotoWallStandbyTexture();
  if (nextIndex === photoWallScreenPhotoIndex && photoWallScreen.material.map === nextTexture) return;
  photoWallScreenPhotoIndex = nextIndex;
  const material = photoWallScreen.material;
  material.map = nextTexture;
  material.color.set(0xffffff);
  material.opacity = 1;
  material.needsUpdate = true;
}

function getPhotoWallStandbyTexture() {
  if (photoWallStandbyTexture) return photoWallStandbyTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    photoWallStandbyTexture = new THREE.CanvasTexture(canvas);
    return photoWallStandbyTexture;
  }

  ctx.fillStyle = "#061014";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(111,231,255,0.24)";
  ctx.lineWidth = 5;
  ctx.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);
  ctx.fillStyle = "rgba(111,231,255,0.09)";
  for (let y = 62; y < canvas.height - 54; y += 22) {
    ctx.fillRect(56, y, canvas.width - 112, 2);
  }
  ctx.fillStyle = "rgba(255,103,64,0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 42px ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
  ctx.fillText("Happy birthday to Mr. Elon Musk! 🎂🥳", canvas.width / 2, 180);
  ctx.font = "700 30px ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
  ctx.fillText("May all your dreams come true", canvas.width / 2, 246);
  ctx.fillText("and wish you good health and longevity!", canvas.width / 2, 292);
  ctx.font = "700 34px ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
  ctx.fillText("June 29, 2026", canvas.width / 2, 372);

  photoWallStandbyTexture = new THREE.CanvasTexture(canvas);
  photoWallStandbyTexture.colorSpace = THREE.SRGBColorSpace;
  return photoWallStandbyTexture;
}

function openPhotoViewer() {
  if (cameraPhotos.length === 0) {
    showDialogue("照片电子屏", "照片电子屏暂无照片", 2);
    return;
  }
  if (cameraMode) toggleCameraMode(false);
  photoViewerOpen = true;
  suppressTransientInfoWindows();
  photoViewerIndex = THREE.MathUtils.clamp(photoViewerIndex, 0, cameraPhotos.length - 1);
  photoViewerZoom = 1;
  clearMovementInputState();
  resetStick();
  updatePhotoViewer();
}

function closePhotoViewer() {
  photoViewerOpen = false;
  photoViewer.classList.remove("is-visible");
  photoViewer.setAttribute("aria-hidden", "true");
  photoViewerImage.removeAttribute("src");
  photoViewerZoom = 1;
}

function handlePhotoViewerKey(event: KeyboardEvent) {
  event.preventDefault();
  if (event.code === "KeyQ" || event.code === "Escape") {
    closePhotoViewer();
    return;
  }
  if (event.code === "KeyA" || event.code === "ArrowLeft") {
    photoViewerIndex = (photoViewerIndex - 1 + cameraPhotos.length) % cameraPhotos.length;
    photoViewerZoom = 1;
    updatePhotoViewer();
    return;
  }
  if (event.code === "KeyD" || event.code === "ArrowRight") {
    photoViewerIndex = (photoViewerIndex + 1) % cameraPhotos.length;
    photoViewerZoom = 1;
    updatePhotoViewer();
    return;
  }
  if (event.code === "KeyW" || event.code === "ArrowUp") {
    adjustPhotoViewerZoom(1);
    return;
  }
  if (event.code === "KeyS" || event.code === "ArrowDown") {
    photoViewerZoom = 1;
    updatePhotoViewer();
    return;
  }
  if (event.code === "KeyE" || event.code === "Enter" || event.code === "NumpadEnter") {
    downloadCurrentPhoto();
  }
}

function updatePhotoViewer() {
  const photo = cameraPhotos[photoViewerIndex];
  if (!photo) {
    closePhotoViewer();
    return;
  }
  photoViewer.classList.add("is-visible");
  photoViewer.setAttribute("aria-hidden", "false");
  photoViewerTitle.textContent = `PHOTO ${String(photoViewerIndex + 1).padStart(2, "0")} / ${String(cameraPhotos.length).padStart(2, "0")}`;
  photoViewerImage.src = photo.dataUrl;
  photoViewerImage.style.transform = `scale(${photoViewerZoom.toFixed(2)})`;
}

function adjustPhotoViewerZoom(direction: number) {
  if (!photoViewerOpen) return;
  const factor = direction > 0 ? 1.22 : 1 / 1.22;
  photoViewerZoom = THREE.MathUtils.clamp(photoViewerZoom * factor, 1, 3.4);
  updatePhotoViewer();
}

function downloadCurrentPhoto() {
  const photo = cameraPhotos[photoViewerIndex];
  if (!photo) return;
  const link = document.createElement("a");
  link.href = photo.dataUrl;
  link.download = `ares-photo-${new Date(photo.takenAt).toISOString().replace(/[:.]/g, "-")}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  showRewardFloat(localizeText("已触发当前照片下载"), false);
}

function resetCameraSystem() {
  hasCamera = false;
  cameraMode = false;
  cameraZoom = 1;
  photoViewerOpen = false;
  photoViewerIndex = 0;
  photoViewerZoom = 1;
  for (const photo of cameraPhotos) photo.texture.dispose();
  cameraPhotos.length = 0;
  updatePhotoWallFrames();
  cameraOverlay.classList.remove("is-visible");
  cameraOverlay.setAttribute("aria-hidden", "true");
  closePhotoViewer();
  updateCameraZoomProjection();
}

function findScaleGunTarget(): ScaleGunTarget | null {
  const targets = getScaleGunTargets();
  if (targets.length === 0) return null;
  scaleGunRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  scaleGunRaycaster.far = SCALE_GUN_RANGE;
  const roots = new Map<string, ScaleGunTarget>();
  for (const target of targets) roots.set(target.object.uuid, target);
  const intersections = scaleGunRaycaster.intersectObjects(targets.map((target) => target.object), true);
  for (const intersection of intersections) {
    const target = findScaleGunRoot(intersection.object, roots);
    if (target) return target;
  }
  return null;
}

function getScaleGunTargets() {
  const targets: ScaleGunTarget[] = [];
  const seen = new Set<string>();
  const addTarget = (label: string, object: THREE.Object3D, kind?: ScaleGunTarget["kind"]) => {
    if (!object.visible || seen.has(object.uuid)) return;
    seen.add(object.uuid);
    targets.push({ label, object, kind });
  };

  for (const landmark of world.landmarks) addTarget(landmark.label, landmark.object);
  for (const object of world.unnumberedObjects) addTarget("未知物体", object.object);
  for (const satellite of world.starlinkConstellation.satellites) addTarget(satellite.id.toUpperCase(), satellite.object, "starlink");
  for (const meteor of world.meteors) {
    if (meteor.closeFlyby) addTarget("近火流星", meteor.head, "meteor");
  }
  for (const spider of world.darkSpiders) {
    if (spider.attacking) addTarget("红眼火星蜘蛛", spider.group, "spider");
  }
  if (sunBody) addTarget("太阳", sunBody);
  if (fufu.visible) addTarget("福福", fufu);
  return targets;
}

function findScaleGunRoot(object: THREE.Object3D, roots: Map<string, ScaleGunTarget>) {
  let cursor: THREE.Object3D | null = object;
  while (cursor) {
    const target = roots.get(cursor.uuid);
    if (target) return target;
    cursor = cursor.parent;
  }
  return null;
}

function fireScaleGun(mode: "shrink" | "grow") {
  if (!scaleGunAiming) return;
  if (!scaleGunTarget) {
    showDialogue("缩放枪", "未锁定可缩放目标。", 1.8);
    return;
  }
  const effect = getScaleGunEffect(scaleGunTarget.object);
  const multiplier = mode === "grow" ? 1.5 : 1 / 1.5;
  const nextFactor = THREE.MathUtils.clamp(effect.factor * multiplier, SCALE_GUN_MIN_FACTOR, SCALE_GUN_MAX_FACTOR);
  effect.factor = nextFactor;
  effect.expiresAt = elapsedTime + SCALE_GUN_DURATION_SECONDS;
  if (scaleGunTarget.kind === "meteor") scaleGunTarget.object.userData.meteorScaleFactor = nextFactor;
  if (scaleGunTarget.kind === "spider") {
    const spider = darkSpiderForObject(scaleGunTarget.object);
    if (spider) spider.damageFactor = nextFactor;
  }
  scaleGunTarget.object.scale.copy(effect.baseScale).multiplyScalar(nextFactor);
  showDialogue("缩放枪", `${scaleGunTarget.label} ${mode === "grow" ? "放大" : "缩小"}到 ${nextFactor.toFixed(2)}x，60 秒后恢复。`, 2.2);
  playUiBeep();
  if (scaleGunTarget.label === "太阳") awardFunnyScore(`scale_sun_${mode}`, mode === "grow" ? "放大太阳" : "缩小太阳");
  if (scaleGunTarget.kind === "starlink") awardHiddenDiscovery(`starlink:${scaleGunTarget.object.userData.starlinkId ?? scaleGunTarget.object.uuid}`, "星链卫星命中");
  if (scaleGunTarget.kind === "meteor") awardHiddenDiscovery(`meteor:${scaleGunTarget.object.userData.meteorId ?? scaleGunTarget.object.uuid}`, "流星命中");
}

function darkSpiderForObject(object: THREE.Object3D): DarkSpider | undefined {
  return world.darkSpiders.find((spider) => spider.group === object);
}

function getScaleGunEffect(object: THREE.Object3D) {
  let effect = scaleGunEffects.get(object.uuid);
  if (!effect) {
    effect = {
      baseScale: object.scale.clone(),
      factor: 1,
      expiresAt: 0,
    };
    scaleGunEffects.set(object.uuid, effect);
  }
  return effect;
}

function restoreExpiredScaleGunEffects() {
  for (const [uuid, effect] of scaleGunEffects) {
    if (elapsedTime < effect.expiresAt) continue;
    const object = scene.getObjectByProperty("uuid", uuid);
    if (object) {
      if (object.userData.scaleGunKind === "meteor") object.userData.meteorScaleFactor = 1;
      if (object.userData.scaleGunKind === "spider") {
        const spider = darkSpiderForObject(object);
        if (spider) spider.damageFactor = 1;
      }
      object.scale.copy(effect.baseScale);
    }
    scaleGunEffects.delete(uuid);
  }
}

function clearScaleGunEffects() {
  for (const [uuid, effect] of scaleGunEffects) {
    const object = scene.getObjectByProperty("uuid", uuid);
    if (object) {
      if (object.userData.scaleGunKind === "meteor") object.userData.meteorScaleFactor = 1;
      if (object.userData.scaleGunKind === "spider") {
        const spider = darkSpiderForObject(object);
        if (spider) spider.damageFactor = 1;
      }
      object.scale.copy(effect.baseScale);
    }
  }
  scaleGunEffects.clear();
}

function adjustCameraDistance(direction: number) {
  const step = THREE.MathUtils.clamp(cameraDistance * 0.16, 0.18, 12);
  cameraDistance = THREE.MathUtils.clamp(cameraDistance + direction * step, CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE);
}

function setFirstPersonCamera() {
  if (!started || exitConfirmOpen || dialogueOpen) return;
  cameraDistance = CAMERA_MIN_DISTANCE;
  orbitYawOffset = 0;
  pitch = 0.34;
}

function toggleFirstThirdPersonCamera() {
  if (!started || exitConfirmOpen || dialogueOpen) return;
  if (scaleGunAiming) return;
  if (cameraDistance <= 0.9) {
    resetDefaultThirdPersonCamera();
    return;
  }
  setFirstPersonCamera();
}

function resetDefaultThirdPersonCamera() {
  if (!started || exitConfirmOpen || dialogueOpen) return;
  if (scaleGunAiming) return;
  cameraDistance = DEFAULT_THIRD_PERSON_CAMERA_DISTANCE;
  orbitYawOffset = 0;
  pitch = 0.34;
  camera.fov = 54;
  camera.updateProjectionMatrix();
}

function createXWingColliderDebugRing() {
  const group = new THREE.Group();
  group.name = "X-Wing collider debug ring";
  const fill = new THREE.Mesh(
    new THREE.CircleGeometry(1, 48),
    new THREE.MeshBasicMaterial({ color: 0x35d9ff, transparent: true, opacity: 0.1, depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
  );
  fill.rotation.x = -Math.PI / 2;
  const outline = new THREE.Mesh(
    new THREE.RingGeometry(0.94, 1, 48),
    new THREE.MeshBasicMaterial({ color: 0x78ecff, transparent: true, opacity: 0.92, depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
  );
  outline.rotation.x = -Math.PI / 2;
  group.add(fill, outline);
  group.visible = false;
  group.renderOrder = 200;
  return group;
}

function isXWingColliderDebugActive() {
  return started && xWingCollisionDebugEnabled && orbitalDefense.unlocked && !orbitalDefense.active;
}

function updateXWingColliderDebug() {
  const visible = isXWingColliderDebugActive();
  xWingColliderDebugReadout.hidden = !visible;
  for (const [index, part] of xWingColliderParts.entries()) {
    const radius = part.baseRadius * xWingColliderScale;
    part.collider.radius = radius;
    const ring = xWingColliderDebugRings[index];
    ring.visible = visible;
    if (!visible) continue;
    const normal = part.anchor.getWorldPosition(new THREE.Vector3()).normalize();
    placeObjectOnPlanetNormal(ring, normal, 0.16, 0);
    ring.scale.setScalar(radius);
  }
  if (visible) {
    const largestRadius = Math.max(...xWingColliderParts.map((part) => part.collider.radius));
    xWingColliderDebugReadout.textContent = `X-WING COLLIDER ${Math.round(xWingColliderScale * 100)}% · 最大 ${largestRadius.toFixed(2)}m · + / - 调整`;
  }
}

function adjustXWingColliderScale(direction: number) {
  xWingColliderScale = THREE.MathUtils.clamp(xWingColliderScale + Math.sign(direction) * 0.05, 0.65, 1.45);
  updateXWingColliderDebug();
  playUiBeep();
}

function resetXWingColliderScale() {
  xWingColliderScale = 1;
  updateXWingColliderDebug();
}

function adjustMapZoom(direction: number) {
  const factor = direction > 0 ? 1.18 : 1 / 1.18;
  mapZoom = THREE.MathUtils.clamp(mapZoom * factor, 0.65, 3.2);
  updateMap();
}

function jump() {
  if (!grounded) return;
  stamina = Math.max(0, stamina - STAMINA_JUMP_COST * currentSolarHeatStaminaMultiplier());
  if (stamina <= 0) {
    respawnAfterStaminaDepleted();
    return;
  }
  grounded = false;
  verticalVelocity = SUITED_JUMP_SPEED;
  playerVelocity.addScaledVector(playerForward, JUMP_FORWARD_BOOST);
}

function handleJumpPress() {
  const now = performance.now();
  const isDoubleTap = now - lastJumpPressAt <= JETPACK_JUMP_DOUBLE_TAP_MS;
  lastJumpPressAt = now;
  if (isDoubleTap && activateEquipmentJetpack()) {
    lastJumpPressAt = -Infinity;
    return;
  }
  jump();
}

export function startGame() {
  if (started) return;
  playUiBeep();
  started = true;
  backgroundMusicEnabled = true;
  resetQuestState();
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("xwing-preview")) {
    orbitalDefense.setUnlocked(true);
  }
  resetDialogueState();
  gameStartElapsed = elapsedTime;
  introCallQueued = false;
  introMovementConfirmed = false;
  introIdlePromptShown = false;
  introMissionReminderShown = false;
  cameraDistance = DEFAULT_THIRD_PERSON_CAMERA_DISTANCE;
  camera.fov = 54;
  camera.updateProjectionMatrix();
  pitch = 0.34;
  orbitYawOffset = 0;
  exitFrontCamera = null;
  exitConfirmOpen = false;
  activeHabitatDoor = null;
  activeGreenhouseDoor = null;
  activeAncientPortal = false;
  resetAncientPortal();
  world.habitatDoor.open = false;
  world.habitatDoor.occupied = false;
  world.habitatDoor.doorPanels.visible = true;
  world.habitatDoor.exteriorMask.visible = true;
  world.habitatDoor.interiorPortal.visible = false;
  world.habitatDoor.interiorDoor.visible = false;
  world.habitatDoor.interiorScene.visible = false;
  world.habitatDoor.interiorLight.visible = false;
  setHabitatInteriorMode(false);
  insideGreenhouse = false;
  world.greenhouseDoor.occupied = false;
  world.greenhouseDoor.doorPanels.visible = true;
  rocketDoorOpen = false;
  insideRocket = false;
  setRocketInteriorMode(false);
  setRocketDoorVisual(false);
  setMapOpen(false, false);
  playerAltitudeOffset = 0;
  verticalVelocity = 0;
  grounded = true;
  resetVitals();
  resetJetpackState();
  setScaleGunOwned(false);
  clearScaleGunEffects();
  resetCameraSystem();
  resetPlayerToSpawn();
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("xwing-preview")) {
    const previewShip = orbitalDefense.parkedShips[1] ?? orbitalDefense.parkedShips[0];
    if (previewShip) {
      const shipNormal = previewShip.getWorldPosition(new THREE.Vector3()).normalize();
      const shipForward = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(previewShip.getWorldQuaternion(new THREE.Quaternion()))
        .projectOnPlane(shipNormal)
        .normalize();
      playerNormal.copy(shipNormal).addScaledVector(shipForward, -10.2 / PLANET_RADIUS).normalize();
      playerForward.copy(shipNormal).sub(playerNormal).projectOnPlane(playerNormal).normalize();
      placePlayerOnPlanet();
    }
  }
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("atat-preview")) {
    scorePoints = Math.max(scorePoints, AT_AT_REQUIRED_SCORE);
    coins = Math.max(coins, AT_AT_RIDE_COST_COINS * 2);
    updateRewardReadouts();
    updatePlayerRank(true);
    const boardingNormal = world.atAt.boardingAnchor.getWorldPosition(new THREE.Vector3()).normalize();
    const walkerNormal = world.atAt.group.getWorldPosition(new THREE.Vector3()).normalize();
    playerNormal.copy(boardingNormal);
    playerForward.copy(walkerNormal).sub(playerNormal).projectOnPlane(playerNormal).normalize();
    placePlayerOnPlanet();
  }
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("cybertruck-preview")) {
    const rover = world.rovers.find((candidate) => candidate.userData.kind === "rover");
    if (rover) {
      rover.userData.stationPauseUntil = Number.POSITIVE_INFINITY;
      const roverPosition = rover.getWorldPosition(new THREE.Vector3());
      const roverNormal = roverPosition.clone().normalize();
      const roverForward = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(rover.getWorldQuaternion(new THREE.Quaternion()))
        .projectOnPlane(roverNormal)
        .normalize();
      const roverRight = new THREE.Vector3(1, 0, 0)
        .applyQuaternion(rover.getWorldQuaternion(new THREE.Quaternion()))
        .projectOnPlane(roverNormal)
        .normalize();
      const previewOffset = roverRight.multiplyScalar(8).addScaledVector(roverForward, 2.5);
      playerNormal.copy(roverNormal).addScaledVector(previewOffset, 1 / PLANET_RADIUS).normalize();
      playerForward.copy(roverNormal).sub(playerNormal).projectOnPlane(playerNormal).normalize();
      placePlayerOnPlanet();
    }
  }
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("spider-preview")) {
    const spider = world.darkSpiders[0];
    if (spider) {
      const tangent = new THREE.Vector3(0, 1, 0).cross(spider.normal).normalize();
      if (tangent.lengthSq() < 0.001) tangent.set(1, 0, 0);
      const angle = 11 / PLANET_RADIUS;
      playerNormal.copy(spider.normal).multiplyScalar(Math.cos(angle)).addScaledVector(tangent, Math.sin(angle)).normalize();
      playerForward.copy(spider.normal).sub(playerNormal).projectOnPlane(playerNormal).normalize();
      placePlayerOnPlanet();
    }
  }
  respawnFootball();
  resetFufu();
  resetAncientPortal();
  resetStick();
  multiplayer.connect();
  startBackgroundMusic();
  titleScreen.classList.add("is-hidden");
  document.body.classList.add("is-playing");
  setMapOpen(!isSmallScreenMapTouch(), false);
  hudToggle.setAttribute("aria-pressed", "true");
  hudToggle.setAttribute("aria-label", "隐藏界面信息");
  setCurrentMissionText();
  previewMissionPanel();
}

function returnToTitle() {
  if (!started) return;
  started = false;
  multiplayer.disconnect();
  resetQuestState();
  hudCollapsed = false;
  missionPanelOpen = false;
  missionUnread = false;
  clearMissionIntroTimer();
  mapOpen = false;
  mapExpanded = false;
  exitFrontCamera = null;
  exitConfirmOpen = false;
  selectedExitConfirmIndex = 0;
  pendingSteveCall = null;
  pendingSteveCallQueuedAt = -Infinity;
  introCallQueued = false;
  introMovementConfirmed = false;
  introIdlePromptShown = false;
  introMissionReminderShown = false;
  controlsGuideOpen = false;
  messageUntil = 0;
  resetVitals();
  resetJetpackState();
  setScaleGunOwned(false);
  clearScaleGunEffects();
  resetCameraSystem();
  closeDialogue();
  clearMapHoldTimer();
  keyState.clear();
  resetPlayerToSpawn();
  respawnFootball();
  resetFufu();
  resetStick();
  document.body.classList.remove("is-playing", "hud-collapsed", "mission-panel-open", "map-open", "map-expanded");
  exitConfirm.classList.remove("is-visible");
  exitConfirm.setAttribute("aria-hidden", "true");
  document.body.classList.remove("exit-confirm-open");
  controlsGuide.classList.remove("is-visible");
  controlsGuide.setAttribute("aria-hidden", "true");
  hudToggle.setAttribute("aria-pressed", "true");
  hudToggle.setAttribute("aria-label", "隐藏界面信息");
  missionToggle.classList.remove("has-mission-update");
  missionToggle.setAttribute("aria-pressed", "false");
  missionToggle.setAttribute("aria-label", tr("missionToggle.show"));
  updateMapButtonState();
  mapOverlay.setAttribute("aria-hidden", "true");
  selectedTitleActionIndex = 0;
  updateTitleActionSelection();
  titleScreen.classList.remove("is-hidden");
  dialogueBox.innerHTML = "";
  promptBox.textContent = "";
  setMission("点击 ENTER BASE 进入《火星先遣队》。");
  if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
}

function updateStick(event: PointerEvent) {
  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  const length = Math.max(1, Math.hypot(dx, dy));
  const max = rect.width * 0.32;
  const clamped = Math.min(max, length);
  mobileStick.x = (dx / length) * (clamped / max);
  mobileStick.y = (dy / length) * (clamped / max);
  joystickKnob.style.transform = `translate(${mobileStick.x * max}px, ${mobileStick.y * max}px)`;
}

function resetStick(_event?: PointerEvent) {
  mobileStick.active = false;
  mobileStick.pointerId = null;
  mobileStick.x = 0;
  mobileStick.y = 0;
  joystickKnob.style.transform = "translate(0, 0)";
}

function animate() {
  const now = performance.now();
  const frameDurationMs = now - lastFrameTime;
  updatePerformanceReadout(now, frameDurationMs);
  const delta = Math.min(frameDurationMs / 1000, 0.033);
  lastFrameTime = now;
  elapsedTime += delta;

  updateWeather();
  updateAnomalyContentState();
  updateScheduledCalls();
  updateSolarLighting();
  if (sunLight) updateSolarArrays(world.solarArrays, sunLight.position);
  updateElevators(world.elevators, delta);
  updateAncientTreePortal(world.ancientTreePortal, elapsedTime);
  updateWormholeWhiteout();
  const orbitalEvents = started && orbitalDefense.active
    ? orbitalDefense.update(delta, elapsedTime, keyState, camera)
    : [];
  if (orbitalEvents.length > 0) handleOrbitalDefenseEvents(orbitalEvents);
  const speed = started ? (orbitalDefense.active ? orbitalDefense.speed : updatePlayer(delta)) : 0;
  document.body.classList.toggle("is-wormhole", Boolean(wormholeFall));
  document.body.classList.toggle("is-wormhole-whiteout", isWormholeWhiteoutActive());
  if (!orbitalDefense.active) {
    updateIntroOperationFeedback(speed);
    updateSuitOxygen(delta);
    updateJetpackEnergy(delta);
  }
  updateCamera(delta);
  updatePhotoWallFrames();
  updateRovers(world.rovers, elapsedTime, world.colliders);
  if (ridingRover) updateRoverRide(ridingRover, 0);
  updateAtAtVisual(world.atAt, delta, elapsedTime);
  if (ridingAtAt && (keyState.has("KeyJ") || keyState.has("Space"))) {
    fireAtAtCannon(world.atAt);
  }
  updateAtAtWeapons(world.atAt, delta);
  updateFootball(delta);
  updateFufu(delta);
  updateMeteors(world.meteors, elapsedTime);
  updateStarlink();
  updateCoinGroup(delta);
  updateHiddenDiscoveries();
  updateHabitatOccupancy();
  updateInterface(now);
  updateMissionState();
  const playerFlying = isFlightActive();
  updateMarsEngineer(playerRig, wormholeFall ? 0 : speed, elapsedTime, playerFlying, isFlightAscending() || isFlightDescending());
  updateHeldGearPose();
  if (laserSwordRaised && keyState.has("KeyJ")) tryLaserSwordAttack();
  updateLaserSwordWorldLight();
  updateAtAtSpiderCollisions();
  updateDarkSpiders(world.darkSpiders, elapsedTime, delta, world.colliders, sunLight?.position ?? null, currentLaserSwordThreat(), currentSpiderPlayerThreat());
  updateSpiderDeathStates();
  updateSpiderTouchDamage();
  updateSpiderHealthHuds();
  updateWormholePlayerPose(delta);
  updateFufuCat(fufuRig, fufuSpeed, elapsedTime, fufuAlert);
  if (started && !orbitalDefense.active) {
    multiplayer.update(delta, elapsedTime, {
      position: player.position,
      quaternion: player.quaternion,
      speed,
      flying: playerFlying,
      insideState: currentPlayerInsideState(),
    });
  }
  updateScaleGun();
  updateCameraSystem();
  updateBackgroundMusicFade();
  updateMonolithSignal();

  world.flickerLights.forEach((light, index) => {
    const base = light === world.oxygenLight && missionStep === "m1_oxygen" ? 2.3 : 1.25;
    light.intensity *= 0.96;
    light.intensity += (base + Math.sin(elapsedTime * 2.7 + index) * 0.26) * 0.04;
  });

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function updatePerformanceReadout(now: number, frameDurationMs: number) {
  performanceSampleFrames += 1;
  performanceSampleFrameMsTotal += frameDurationMs;
  const sampleDuration = now - performanceSampleStartedAt;
  if (sampleDuration < PERFORMANCE_SAMPLE_INTERVAL_MS) return;
  const averageFrameMs = performanceSampleFrames > 0 ? performanceSampleFrameMsTotal / performanceSampleFrames : sampleDuration;
  averageFrameDurationMs = averageFrameMs;
  updateAdaptiveQuality(now, averageFrameMs);
  performanceSampleStartedAt = now;
  performanceSampleFrames = 0;
  performanceSampleFrameMsTotal = 0;
}

function updateInterface(now: number) {
  const interval = QUALITY_PRESETS[activeQualityTier].interfaceIntervalMs;
  if (now - lastInterfaceUpdateAt >= interval) {
    lastInterfaceUpdateAt = now;
    updateLabels();
    updateNavigationReadout();
    updateReadouts();
    updateMobileFlightButtons();
    updateWorldLodVisibility();
    updateXWingColliderDebug();
  }
  if (mapOpen && now - lastMapUpdateAt >= interval) {
    lastMapUpdateAt = now;
    updateMap();
  }
}

function updateAdaptiveQuality(now: number, averageFrameMs: number) {
  if (now < manualQualityUntil) return;
  const currentIndex = QUALITY_TIER_ORDER.indexOf(activeQualityTier);
  const highestAllowedIndex = isTouchLike() ? 1 : 0;
  const canReduceQuality = currentIndex < QUALITY_TIER_ORDER.length - 1;
  const canRestoreQuality = currentIndex > highestAllowedIndex;
  const cooldown = averageFrameMs >= 33 ? QUALITY_CHANGE_COOLDOWN_MS : QUALITY_RECOVERY_COOLDOWN_MS;
  if (now - lastQualityTierChangeAt < cooldown) return;

  if (averageFrameMs >= 33 && canReduceQuality) {
    applyQualityTier(QUALITY_TIER_ORDER[currentIndex + 1], now);
  } else if (averageFrameMs <= 22 && canRestoreQuality) {
    applyQualityTier(QUALITY_TIER_ORDER[currentIndex - 1], now);
  }
}

function applyQualityTier(nextTier: QualityTier, now: number) {
  if (nextTier === activeQualityTier) return;
  const shadowsChanged = renderer.shadowMap.enabled !== QUALITY_PRESETS[nextTier].shadowsEnabled;
  activeQualityTier = nextTier;
  lastQualityTierChangeAt = now;
  renderer.setPixelRatio(renderPixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = QUALITY_PRESETS[nextTier].shadowsEnabled;
  if (shadowsChanged) {
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => { material.needsUpdate = true; });
    });
  }
  applyWorldShadowQuality(nextTier);
  updateWorldLodVisibility();

  if (!sunLight) return;
  const profile = QUALITY_PRESETS[nextTier];
  const shadowDistance = profile.shadowDistance;
  sunLight.shadow.camera.far = shadowDistance * 3.5;
  sunLight.shadow.camera.left = -shadowDistance;
  sunLight.shadow.camera.right = shadowDistance;
  sunLight.shadow.camera.top = shadowDistance;
  sunLight.shadow.camera.bottom = -shadowDistance;
  sunLight.shadow.camera.updateProjectionMatrix();
  world.flickerLights.forEach((light, index) => {
    light.visible = light === world.oxygenLight || light === world.solarLight || index < profile.dynamicLightLimit;
  });
  const shadowMapSize = profile.shadowMapSize;
  if (sunLight.shadow.mapSize.x !== shadowMapSize) {
    sunLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    sunLight.shadow.map?.dispose();
    sunLight.shadow.map = null;
    sunLight.shadow.needsUpdate = true;
  }
}

function applyWorldShadowQuality(tier: QualityTier) {
  for (const mesh of worldShadowCasters) {
    if (tier === "high") {
      mesh.castShadow = mesh.userData.qualityCastShadow === true;
      continue;
    }
    if (tier === "low") {
      mesh.castShadow = false;
      continue;
    }
    const geometry = mesh.geometry as THREE.BufferGeometry;
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    mesh.castShadow = mesh.userData.qualityCastShadow === true && (geometry.boundingSphere?.radius ?? 0) >= 1.35;
  }
}

function reportCoreModelLoadFailure(error: unknown) {
  if (import.meta.env.DEV) console.warn("Core GLB LOD load failed; procedural fallback remains active.", error);
}

async function loadCoreLodModels() {
  const { attachCoreLodModel, hideMarkedCoreFallback } = await import("./core/glb-lod-system");
  const habitatModelRoot = world.landmarks.find((landmark) => landmark.label === "01 建筑 居住舱")?.object;
  if (habitatModelRoot) {
    void attachCoreLodModel(habitatModelRoot, "habitat", {
      hideFallback: (anchor) => anchor.traverse((object) => {
        if (object instanceof THREE.Mesh && hasLodAncestor(object)) {
          // Thin habitat details should never cast a detached shadow across the hull.
          object.castShadow = false;
          object.receiveShadow = false;
          return;
        }
        if (!(object instanceof THREE.Mesh)) return;
        if (![world.habitatDoor.doorPanels, world.habitatDoor.exteriorMask, world.habitatDoor.interiorPortal, world.habitatDoor.interiorDoor, world.habitatDoor.interiorScene]
          .some((branch) => isObjectWithinBranch(object, branch))) object.visible = false;
      }),
    }).catch(reportCoreModelLoadFailure);
  }
  void attachCoreLodModel(playerRig.visual, "alex", { hideFallback: hideMarkedCoreFallback }).catch(reportCoreModelLoadFailure);
  for (const rover of world.rovers) {
    const modelId = rover.userData.kind === "bot" ? "repairRobot" : "rover";
    void attachCoreLodModel(rover, modelId, {
      scale: typeof rover.userData.size === "number" ? rover.userData.size : 1,
      hideFallback: hideMarkedCoreFallback,
    }).catch(reportCoreModelLoadFailure);
  }
}

function hasLodAncestor(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current instanceof THREE.LOD) return true;
    current = current.parent;
  }
  return false;
}

function isObjectWithinBranch(object: THREE.Object3D, branch: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current === branch) return true;
    current = current.parent;
  }
  return false;
}

function updateWorldLodVisibility() {
  if (!started) return;
  const visibleDistance = QUALITY_PRESETS[activeQualityTier].visibleDistance;
  const missionTarget = mainMissionTargets[missionStep];
  const worldPosition = new THREE.Vector3();
  for (const landmark of world.landmarks) {
    if (!isAnomalySceneAccessible() && (landmark.object === world.monolith.object || landmark.label === "远古巨树拱门")) continue;
    landmark.object.getWorldPosition(worldPosition);
    const targetNormal = landmark.object.userData.dynamicMap && worldPosition.lengthSq() > 1
      ? worldPosition.clone().normalize()
      : planetNormal(landmark.x, landmark.z, new THREE.Vector3());
    const surfaceDistance = Math.acos(THREE.MathUtils.clamp(playerNormal.dot(targetNormal), -1, 1)) * PLANET_RADIUS;
    const objectDistanceLimit = landmark.object.userData.kind === "bot"
      ? Math.min(visibleDistance, 32)
      : landmark.object.userData.dynamicMap === true
        ? Math.min(visibleDistance, 96)
        : visibleDistance;
    const mustRemainVisible = world.interactables.some((item) => item.id === missionTarget && item.object === landmark.object);
    landmark.object.visible = mustRemainVisible || surfaceDistance <= objectDistanceLimit;
    const surfaceEffects = landmark.object.userData.surfaceEffects as { group?: THREE.Group } | undefined;
    landmark.object.userData.surfaceEffectsEnabled = activeQualityTier === "high";
    if (surfaceEffects?.group) surfaceEffects.group.visible = landmark.object.visible && landmark.object.userData.surfaceEffectsEnabled === true;
  }
  for (const item of world.unnumberedObjects) {
    const targetNormal = planetNormal(item.x, item.z, new THREE.Vector3());
    const surfaceDistance = Math.acos(THREE.MathUtils.clamp(playerNormal.dot(targetNormal), -1, 1)) * PLANET_RADIUS;
    item.object.visible = surfaceDistance <= visibleDistance;
  }
}

function startBackgroundMusic() {
  if (!started || !backgroundMusicEnabled || wormholeFall) return;
  if (!backgroundMusic.paused) return;
  backgroundMusic.volume = BACKGROUND_MUSIC_BASE_VOLUME;
  backgroundMusic.play().catch(() => {
    // Browser audio policies can still block playback in unusual cases.
  });
}

function toggleBackgroundMusic() {
  if (!started) return;
  playUiBeep();
  backgroundMusicEnabled = !backgroundMusicEnabled;
  if (!backgroundMusicEnabled) {
    backgroundMusic.pause();
    return;
  }
  startBackgroundMusic();
}

function updateMonolithSignal() {
  if (!started || dialogueOpen || world.habitatDoor.occupied || insideGreenhouse || insideRocket) return;
  const monolithWorldPosition = new THREE.Vector3();
  world.monolith.object.getWorldPosition(monolithWorldPosition);
  const distance = player.position.distanceTo(monolithWorldPosition);
  if (distance > world.monolith.radius) return;

  const proximity = 1 - THREE.MathUtils.clamp(distance / world.monolith.radius, 0, 1);
  const interval = THREE.MathUtils.lerp(1.35, 0.38, proximity);
  if (elapsedTime < nextMonolithBeepAt) return;
  nextMonolithBeepAt = elapsedTime + interval;
  playMonolithBeep(THREE.MathUtils.lerp(0.035, 0.12, proximity));
}

function playMonolithBeep(volume: number) {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;
  monolithAudioContext ??= new AudioContextClass();
  const context = monolithAudioContext;
  if (context.state === "suspended") context.resume().catch(() => undefined);

  const now = context.currentTime;
  for (const offset of [0, 0.13]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now + offset);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + offset + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.075);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.09);
  }
}

function playUiBeep() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;
  uiAudioContext ??= new AudioContextClass();
  const context = uiAudioContext;
  if (context.state === "suspended") context.resume().catch(() => undefined);

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(1040, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.075, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.1);
}

function playScaleGunLockBeep() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;
  uiAudioContext ??= new AudioContextClass();
  const context = uiAudioContext;
  if (context.state === "suspended") context.resume().catch(() => undefined);

  const now = context.currentTime;
  const playTone = (frequency: number, start: number) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.052, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.064);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.078);
  };
  playTone(1320, now);
  playTone(1760, now + 0.092);
}

function playDingDong() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;
  uiAudioContext ??= new AudioContextClass();
  const context = uiAudioContext;
  if (context.state === "suspended") context.resume().catch(() => undefined);

  const playTone = (frequency: number, start: number, duration: number, volume: number) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  };

  const now = context.currentTime;
  playTone(1174.66, now, 0.15, 0.09);
  playTone(783.99, now + 0.17, 0.22, 0.08);
}

function updateBackgroundMusicFade() {
  if (!backgroundMusicEnabled) {
    backgroundMusic.volume = 0;
    return;
  }
  if (wormholeFall || isWormholeWhiteoutActive()) {
    backgroundMusic.volume = 0;
    return;
  }
  if (backgroundMusic.paused || !Number.isFinite(backgroundMusic.duration) || backgroundMusic.duration <= MUSIC_LOOP_FADE_SECONDS) {
    return;
  }
  const remaining = backgroundMusic.duration - backgroundMusic.currentTime;
  const fade = remaining <= MUSIC_LOOP_FADE_SECONDS ? THREE.MathUtils.clamp(remaining / MUSIC_LOOP_FADE_SECONDS, 0, 1) : 1;
  backgroundMusic.volume = BACKGROUND_MUSIC_BASE_VOLUME * fade;
}

function updateWeather() {
  const cycle = (elapsedTime * STORM_TIME_SCALE + 13200) % STORM_PERIOD_SECONDS;
  const fadeIn = THREE.MathUtils.smoothstep(cycle, 0, STORM_FADE_SECONDS);
  const fadeOut = 1 - THREE.MathUtils.smoothstep(cycle, STORM_DURATION_SECONDS - STORM_FADE_SECONDS, STORM_DURATION_SECONDS);
  stormStrength = cycle < STORM_DURATION_SECONDS ? Math.min(fadeIn, fadeOut) : 0;

  const fog = scene.fog as THREE.FogExp2;
  if (orbitalDefense.active) {
    fog.density = 0.00012;
    fog.color.set(0x02040a);
    if (scene.background instanceof THREE.Color) scene.background.set(0x010207);
    renderer.toneMappingExposure = 1.02;
    return;
  }
  fog.density = THREE.MathUtils.lerp(CLEAR_FOG_DENSITY, STORM_FOG_DENSITY, stormStrength);
  fog.color.copy(new THREE.Color(0x120a0a).lerp(new THREE.Color(0x8d3a20), stormStrength));
  if (scene.background instanceof THREE.Color) scene.background.copy(clearSkyColor).lerp(stormSkyColor, stormStrength * 0.82);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(1.08, 0.72, stormStrength) * THREE.MathUtils.lerp(1, 1.72, solarOverexposureStrength);
}

function updateStarlink() {
  updateStarlinkConstellation(world.starlinkConstellation, elapsedTime, stormStrength);
}

function starlinkDisplayStatus() {
  return isEnglish() ? starlinkStatusTextEn(world.starlinkConstellation) : starlinkStatusText(world.starlinkConstellation);
}

function isInsideInteriorSpace() {
  return world.habitatDoor.occupied || insideGreenhouse || insideRocket;
}

function updateScheduledCalls() {
  if (!started || isFocusOverlayActive() || isInsideInteriorSpace()) return;
  if (pendingSteveCall) {
    return;
  }
  if (introCallQueued) return;
  if (missionStep !== "intro") return;
  if (elapsedTime < steveCallRetryAt) return;
  if (elapsedTime - gameStartElapsed < 30) return;
  introCallQueued = true;
  queueSteveCall("intro");
}

function updatePendingSteveCallTimeout() {
  if (!pendingSteveCall) return;
  if (elapsedTime - pendingSteveCallQueuedAt < STEVE_CALL_IDLE_DISMISS_SECONDS) return;
  deferPendingSteveCall(STEVE_CALL_IDLE_RETRY_SECONDS);
}

function canShowIntroOperationToast() {
  return !dialogueOpen && !exitConfirmOpen && !pendingSteveCall && performance.now() > messageUntil + 250;
}

function updateIntroOperationFeedback(speed: number) {
  if (!started || missionStep !== "intro" || introCallQueued) return;
  const sinceStart = elapsedTime - gameStartElapsed;

  if (!introMovementConfirmed && sinceStart > 1.2 && speed > 0.45 && canShowIntroOperationToast()) {
    introMovementConfirmed = true;
    showOneTimeOperationHelp("intro.movementConfirmed", "操作确认", "W/S/A/D 自由探索；空格键跳跃，Shift 键冲刺。", 4.2);
    return;
  }

  if (!introIdlePromptShown && !introMovementConfirmed && sinceStart > 8 && canShowIntroOperationToast()) {
    introIdlePromptShown = true;
    showOneTimeOperationHelp("intro.idleMove", "操作提示", isSmallScreenMapTouch() ? "拖动左下角摇杆，先向前走几步。" : "按 W 向前走几步，按 A/D 调整方向。", 4.2);
    return;
  }

  if (!introMissionReminderShown && sinceStart > 16 && !missionPanelOpen && canShowIntroOperationToast()) {
    introMissionReminderShown = true;
    showOneTimeOperationHelp("intro.missionReminder", "操作提示", isSmallScreenMapTouch() ? "点 R 可再次查看任务；点 F 打开雷达。" : "按 R 可再次查看任务；按 F 打开雷达。", 4.2);
  }
}

function updateRobotEncounters() {
  if (!started || world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator || ridingRover || ridingAtAt) return;
  if (elapsedTime - lastRobotGreetingAt < 8) return;

  let nearestRobot: THREE.Group | null = null;
  let nearestDistance = Infinity;
  const robotPosition = new THREE.Vector3();
  for (const rover of world.rovers) {
    if (rover.userData.kind !== "bot") continue;
    rover.getWorldPosition(robotPosition);
    const distance = robotPosition.distanceTo(player.position);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestRobot = rover;
    }
  }

  if (!nearestRobot || nearestDistance > 3.8) return;
  nearestRobot.userData.pauseUntil = elapsedTime + 4.5;
  lastRobotGreetingAt = elapsedTime;
  showDialogue(nearestRobot.userData.label ?? "机器人", "你好！请问需要什么帮助吗？", 3.6);
}

function isMapFocusActive() {
  return mapExpanded && mapHoldTriggered;
}

function updatePlayer(delta: number) {
  if (isWormholeWhiteoutActive()) {
    playerVelocity.set(0, 0, 0);
    return 0;
  }
  if (wormholeFall) {
    return updateWormholeFall(delta);
  }
  if (isMapFocusActive()) {
    playerVelocity.set(0, 0, 0);
    return 0;
  }
  if (dialogueOpen) {
    playerVelocity.set(0, 0, 0);
    return 0;
  }
  if (world.habitatDoor.occupied) {
    return updateHabitatInterior(delta);
  }
  if (insideGreenhouse) {
    return updateGreenhouseInterior(delta);
  }
  if (ridingElevator) {
    return updateElevatorRide(delta, ridingElevator);
  }
  if (ridingAtAt) {
    return updateAtAtDrive(delta);
  }
  if (ridingRover) {
    return updateRoverRide(ridingRover, delta);
  }
  if (cameraMode) {
    return updateCameraModePlayer(delta);
  }
  if (scaleGunAiming) {
    return updateScaleGunAimingPlayer(delta);
  }
  if (isFlightActive()) {
    return updateFlightPlayer(delta);
  }

  const surfaceNormal = playerNormal.clone();
  const { turnInput, forwardInput } = readMovementInput();

  const turnRate = keyState.has("ShiftLeft") || keyState.has("ShiftRight") ? 2.0 : 1.55;
  if (Math.abs(turnInput) > 0.001) {
    playerForward.applyAxisAngle(surfaceNormal, turnInput * turnRate * delta).projectOnPlane(surfaceNormal).normalize();
  }

  const speed = (keyState.has("ShiftLeft") || keyState.has("ShiftRight") ? 7.5 : 4.8) * (grounded ? 1 : 1.12);
  const desired = playerForward.clone().multiplyScalar(speed * forwardInput);
  playerVelocity.lerp(desired, 1 - Math.pow(grounded ? 0.0008 : 0.08, delta));
  playerVelocity.projectOnPlane(surfaceNormal);

  const previousNormal = playerNormal.clone();
  const angularDistance = playerVelocity.length() * delta / PLANET_RADIUS;
  if (angularDistance > 0.00001) {
    const moveDirection = playerVelocity.clone().normalize();
    playerNormal.addScaledVector(moveDirection, angularDistance).normalize();
    playerForward.projectOnPlane(playerNormal).normalize();
  }
  resolveCollisions(previousNormal);
  if (!grounded || playerAltitudeOffset > 0) {
    verticalVelocity -= MARS_GRAVITY * delta;
    playerAltitudeOffset += verticalVelocity * delta;
    if (playerAltitudeOffset <= 0) {
      playerAltitudeOffset = 0;
      verticalVelocity = 0;
      grounded = true;
    }
  }
  placePlayerOnPlanet();
  maybeTriggerWormholeFall();
  return playerVelocity.length();
}

function isWormholeControlKey(code: string) {
  return code === "KeyW" || code === "KeyA" || code === "KeyS" || code === "KeyD" || code === "ArrowUp" || code === "ArrowLeft" || code === "ArrowDown" || code === "ArrowRight";
}

function wormholeInputVector() {
  const x = (keyState.has("KeyD") || keyState.has("ArrowRight") ? 1 : 0) - (keyState.has("KeyA") || keyState.has("ArrowLeft") ? 1 : 0);
  const vector = new THREE.Vector2(x, 0);
  if (vector.lengthSq() > 1) vector.normalize();
  return vector;
}

function wormholeDepthInput() {
  return (keyState.has("KeyS") || keyState.has("ArrowDown") ? 1 : 0) - (keyState.has("KeyW") || keyState.has("ArrowUp") ? 1 : 0);
}

function maybeTriggerWormholeFall() {
  if (!isAnomalySceneAccessible()) return;
  if (!ancientTreeArchObject || wormholeFall || isWormholeWhiteoutActive()) return;
  if (elapsedTime < lastWormholeTriggerAt + WORMHOLE_TRIGGER_COOLDOWN) return;
  if (world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator || ridingRover || ridingAtAt || dialogueOpen || exitConfirmOpen) return;

  const local = ancientTreeArchObject.worldToLocal(player.position.clone());
  const inPortalCore = isInsideAncientTreePortalCore(local);
  if (!inPortalCore) {
    wormholeTriggerArmed = true;
    return;
  }

  const portalStrength = Number(world.ancientTreePortal.userData.portalStrength ?? 0);
  if (portalStrength <= WORMHOLE_TRIGGER_STRENGTH) {
    wormholeTriggerArmed = true;
    return;
  }
  if (!wormholeTriggerArmed) return;
  startWormholeWhiteout();
}

function isInsideAncientTreeDoorway(local: THREE.Vector3, scale = 1) {
  const lowerDoorWidth = THREE.MathUtils.lerp(34, 24, THREE.MathUtils.smoothstep(local.y, -8, 18));
  const upperDoorWidth = THREE.MathUtils.lerp(24, 19, THREE.MathUtils.smoothstep(local.y, 50, 92));
  const doorwayWidth = Math.max(upperDoorWidth, lowerDoorWidth) * scale;
  return Math.abs(local.x) < doorwayWidth && local.y > -16 * scale && local.y < 122 * scale && Math.abs(local.z) < 42 * scale;
}

function isInsideAncientTreePortalCore(local: THREE.Vector3) {
  const verticalFade = THREE.MathUtils.smoothstep(local.y, 8, 34);
  const topFade = 1 - THREE.MathUtils.smoothstep(local.y, 62, 92);
  const coreWidth = THREE.MathUtils.lerp(7.2, ANCIENT_PORTAL_CORE_HALF_WIDTH, Math.min(verticalFade, topFade));
  return Math.abs(local.x) < coreWidth
    && local.y > 2
    && local.y < 96
    && Math.abs(local.z) < ANCIENT_PORTAL_CORE_HALF_DEPTH;
}

function startWormholeWhiteout() {
  if (isWormholeWhiteoutActive() || wormholeFall) return;
  lastWormholeTriggerAt = elapsedTime;
  wormholeTriggerArmed = false;
  wormholeWhiteoutStartedAt = elapsedTime;
  wormholeWhiteoutUntil = elapsedTime + WORMHOLE_WHITEOUT_SECONDS;
  wormholeWhiteoutOverlay.setAttribute("aria-hidden", "false");
  updateWormholeWhiteoutOverlay(0);
  closeTouchInteractionDrawer();
  interactionChoiceOpen = false;
  interactionActions = [];
  interactionChoiceSignature = "";
  promptBox.textContent = "";
  promptBox.classList.remove("is-visible");
  interactionChoice.classList.remove("is-visible", "is-touch-entry", "is-drawer-open");
  interactionChoice.setAttribute("aria-hidden", "true");
  document.body.classList.remove("interaction-drawer-open");
  keyState.clear();
  playerVelocity.set(0, 0, 0);
  verticalVelocity = 0;
  disableActiveJetpackForRespawn();
  backgroundMusic.volume = 0;
  startWormholeFall({ fromWhiteout: true });
}

function isWormholeWhiteoutActive() {
  return elapsedTime < wormholeWhiteoutUntil;
}

function updateWormholeWhiteout() {
  if (wormholeWhiteoutUntil === -Infinity) return;
  const progress = THREE.MathUtils.clamp((elapsedTime - wormholeWhiteoutStartedAt) / WORMHOLE_WHITEOUT_SECONDS, 0, 1);
  updateWormholeWhiteoutOverlay(progress);
  if (elapsedTime < wormholeWhiteoutUntil) return;
  wormholeWhiteoutUntil = -Infinity;
  wormholeWhiteoutStartedAt = -Infinity;
  wormholeWhiteoutOverlay.setAttribute("aria-hidden", "true");
  if (!wormholeFall) startWormholeFall();
}

function updateWormholeWhiteoutCamera(delta: number) {
  cameraObstructionLift = 0;
  world.root.visible = false;
  playerRig.visual.visible = false;
  if (scene.background instanceof THREE.Color) scene.background.set(0x000000);
  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.color.set(0x000003);
    scene.fog.density = 0.00015;
  }
  const progress = wormholeWhiteoutStartedAt === -Infinity
    ? 0
    : THREE.MathUtils.clamp((elapsedTime - wormholeWhiteoutStartedAt) / WORMHOLE_WHITEOUT_SECONDS, 0, 1);
  const previewProgress = THREE.MathUtils.lerp(0.004, 0.075, THREE.MathUtils.smoothstep(progress, 0.28, 1));
  updateWormholeFallVisual(previewProgress, new THREE.Vector2(), delta);
}

function updateWormholeWhiteoutOverlay(progress: number) {
  const holdRatio = WORMHOLE_WHITEOUT_HOLD_SECONDS / WORMHOLE_WHITEOUT_SECONDS;
  const scatter = THREE.MathUtils.smoothstep(progress, holdRatio, 1);
  const hazeOpacity = THREE.MathUtils.lerp(0.78, 0, THREE.MathUtils.smoothstep(progress, holdRatio, 1));
  wormholeWhiteoutOverlay.style.setProperty("--wormhole-whiteout-opacity", hazeOpacity.toFixed(3));
  const pulse = 1 + Math.sin(elapsedTime * 18) * 0.035;
  for (const particle of wormholeWhiteoutParticles) {
    const x = particle.startX + particle.driftX * scatter;
    const y = particle.startY + particle.driftY * scatter;
    const scale = Math.max(0.05, (1 - particle.shrink * scatter) * pulse);
    const holdFlicker = 0.78 + Math.sin(elapsedTime * (5.5 + particle.shrink * 2.2) + particle.startX) * 0.12;
    const opacity = particle.opacity * holdFlicker * Math.pow(1 - scatter, 1.35);
    particle.element.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}vw, ${y.toFixed(2)}vh) scale(${scale.toFixed(3)})`;
    particle.element.style.opacity = opacity.toFixed(3);
  }
}

function startWormholeFall(options: { fromWhiteout?: boolean } = {}) {
  const spawnNormal = planetNormal(SPAWN_X, SPAWN_Z, new THREE.Vector3());
  const spawnForward = planetNormal(SPAWN_TARGET_X, SPAWN_TARGET_Z, new THREE.Vector3()).sub(spawnNormal).projectOnPlane(spawnNormal).normalize();
  if (!options.fromWhiteout) wormholeWhiteoutUntil = -Infinity;
  lastWormholeTriggerAt = elapsedTime;
  wormholeFall = {
    startedAt: elapsedTime,
    elapsed: 0,
    paused: false,
    lastTriggerAt: lastWormholeTriggerAt,
    drift: new THREE.Vector2(),
    velocity: new THREE.Vector2(),
    depth: 0,
    depthVelocity: 0,
    spawnNormal,
    spawnForward,
  };
  wormholeTriggerArmed = false;
  backgroundMusic.volume = 0;
  cameraDistance = DEFAULT_THIRD_PERSON_CAMERA_DISTANCE;
  orbitYawOffset = 0;
  pitch = 0.34;
  closeTouchInteractionDrawer();
  interactionChoiceOpen = false;
  interactionActions = [];
  activeInteractable = null;
  activeExplorable = null;
  activeElevator = null;
  activeHabitatDoor = null;
  activeGreenhouseDoor = null;
  activeAncientPortal = false;
  activeRobot = null;
  activeFufu = false;
  activeFootball = false;
  activeRideRover = null;
  ridingRover = null;
  activeAtAt = false;
  ridingAtAt = false;
  resetAncientPortal();
  disableActiveJetpackForRespawn();
  scaleGunAiming = false;
  cameraMode = false;
  photoViewerOpen = false;
  playerVelocity.set(0, 0, 0);
  verticalVelocity = 0;
  grounded = false;
  playerRig.visual.visible = true;
  playerNormal.copy(spawnNormal);
  playerForward.copy(spawnForward);
  playerAltitudeOffset = 0;
  placePlayerOnPlanet();
  updateWormholeFallVisual(0, wormholeFall.drift, 0);
  if (!options.fromWhiteout) showDialogue("远古巨树拱门", "门洞中的无尽结构吞没了你。火星在远处变成一个红色的点。", 4.2);
}

function wormholeElapsed() {
  return wormholeFall ? wormholeFall.elapsed : 0;
}

function wormholeProgress() {
  return THREE.MathUtils.clamp(wormholeElapsed() / WORMHOLE_FALL_DURATION, 0, 1);
}

function wormholeFallSpeedFactor(progress: number) {
  const organicRamp = THREE.MathUtils.smoothstep(progress, 0.02, WORMHOLE_ORGANIC_RAMP_END);
  const finalRush = THREE.MathUtils.smoothstep(progress, 0.56, WORMHOLE_ORGANIC_RAMP_END);
  return THREE.MathUtils.lerp(WORMHOLE_INITIAL_SPEED_FACTOR, 2.85, organicRamp) + finalRush * 1.15;
}

function setWormholeFallPaused(paused: boolean) {
  if (!wormholeFall || wormholeFall.paused === paused) return;
  wormholeFall.paused = paused;
  showDialogue("远古巨树拱门", paused ? "黑洞下落暂停。按 Q 继续。" : "黑洞继续下落。", 1.5);
}

function updateWormholeFall(delta: number) {
  if (!wormholeFall) return 0;
  if (!wormholeFall.paused) {
    wormholeFall.elapsed = Math.min(WORMHOLE_FALL_DURATION, wormholeFall.elapsed + delta);
  }
  const progress = wormholeProgress();
  const input = wormholeInputVector();
  const targetDepth = wormholeDepthInput();
  const depthPull = targetDepth - wormholeFall.depth;
  const pushingDepthOutward = Math.sign(depthPull) === Math.sign(wormholeFall.depth) && Math.abs(targetDepth) > Math.abs(wormholeFall.depth);
  const depthResistance = pushingDepthOutward ? 1 - THREE.MathUtils.smoothstep(Math.abs(wormholeFall.depth), 0.55, 1) : 1;
  wormholeFall.depthVelocity += depthPull * WORMHOLE_DEPTH_CONTROL_STRENGTH * depthResistance * delta;
  wormholeFall.depthVelocity *= Math.exp(-WORMHOLE_DEPTH_DAMPING * delta);
  wormholeFall.depthVelocity = THREE.MathUtils.clamp(wormholeFall.depthVelocity, -WORMHOLE_DEPTH_MAX_SPEED, WORMHOLE_DEPTH_MAX_SPEED);
  wormholeFall.depth = THREE.MathUtils.clamp(wormholeFall.depth + wormholeFall.depthVelocity * delta, -1, 1);
  if (Math.abs(targetDepth) < 0.001 && Math.abs(wormholeFall.depth) < 0.004 && Math.abs(wormholeFall.depthVelocity) < 0.02) {
    wormholeFall.depth = 0;
    wormholeFall.depthVelocity = 0;
  }

  const floatCenter = wormholeFloatingCenter();
  const targetDrift = input
    .multiplyScalar(WORMHOLE_DRIFT_LIMIT)
    .addScaledVector(floatCenter, WORMHOLE_DRIFT_LIMIT);
  const boundaryResistance = 1 - THREE.MathUtils.smoothstep(wormholeFall.drift.length(), WORMHOLE_DRIFT_LIMIT * 0.55, WORMHOLE_DRIFT_LIMIT);
  wormholeFall.velocity.addScaledVector(targetDrift.clone().sub(wormholeFall.drift), WORMHOLE_DRIFT_CONTROL_STRENGTH * boundaryResistance * delta);
  wormholeFall.velocity.addScaledVector(wormholeFall.drift.clone().sub(floatCenter.multiplyScalar(WORMHOLE_DRIFT_LIMIT * 0.45)), -WORMHOLE_DRIFT_CENTER_PULL * delta);
  wormholeFall.velocity.addScaledVector(wormholeFloatingTurbulence(), WORMHOLE_FLOAT_CENTER_FORCE * delta);
  wormholeFall.velocity.multiplyScalar(Math.exp(-WORMHOLE_DRIFT_DAMPING * delta));
  wormholeFall.drift.addScaledVector(wormholeFall.velocity, delta);
  const driftLength = wormholeFall.drift.length();
  if (driftLength > WORMHOLE_DRIFT_LIMIT) wormholeFall.drift.multiplyScalar(WORMHOLE_DRIFT_LIMIT / driftLength);

  playerNormal.copy(wormholeFall.spawnNormal);
  playerForward.copy(wormholeFall.spawnForward);
  playerAltitudeOffset = 0;
  placePlayerOnPlanet();

  if (progress >= 1) {
    finishWormholeFall();
    return 0;
  }
  return THREE.MathUtils.lerp(35, 10, progress);
}

function wormholeFloatingCenter() {
  if (!wormholeFall) return new THREE.Vector2();
  const t = elapsedTime - wormholeFall.startedAt;
  return new THREE.Vector2(
    Math.sin(t * 0.74 + 0.8) * WORMHOLE_FLOAT_CENTER_RADIUS + Math.sin(t * 1.31 + 2.2) * WORMHOLE_FLOAT_CENTER_RADIUS * 0.34,
    Math.cos(t * 0.61 + 1.4) * WORMHOLE_FLOAT_CENTER_RADIUS * 0.82 + Math.sin(t * 1.08 + 3.6) * WORMHOLE_FLOAT_CENTER_RADIUS * 0.28,
  );
}

function wormholeFloatingTurbulence() {
  if (!wormholeFall) return new THREE.Vector2();
  const t = elapsedTime - wormholeFall.startedAt;
  return new THREE.Vector2(
    Math.sin(t * 1.9 + 0.35) + Math.sin(t * 3.7 + 1.8) * 0.34,
    Math.cos(t * 1.6 + 2.15) + Math.sin(t * 3.2 + 0.4) * 0.28,
  );
}

function finishWormholeFall() {
  if (!wormholeFall) return;
  wormholeFall = null;
  wormholeTriggerArmed = false;
  wormholeVisual.group.visible = false;
  world.root.visible = true;
  playerNormal.copy(planetNormal(SPAWN_X, SPAWN_Z, new THREE.Vector3()));
  playerForward.copy(planetNormal(SPAWN_TARGET_X, SPAWN_TARGET_Z, new THREE.Vector3()).sub(playerNormal).projectOnPlane(playerNormal).normalize());
  playerVelocity.set(0, 0, 0);
  disableActiveJetpackForRespawn();
  playerAltitudeOffset = 0;
  verticalVelocity = 0;
  grounded = true;
  player.scale.setScalar(PLAYER_BASE_SCALE);
  placePlayerOnPlanet();
  cameraDistance = Math.max(cameraDistance, DEFAULT_THIRD_PERSON_CAMERA_DISTANCE);
  pitch = 0.34;
  orbitYawOffset = 0;
  camera.fov = 54;
  camera.updateProjectionMatrix();
  awardRepeatableScore(SCORE_WORMHOLE_TRAVERSAL, localizeText("穿越时空之门"));
  messageUntil = Math.max(messageUntil, performance.now() + 2200);
  const xWingUnlocked = awardXWingAfterWormhole();
  if (!xWingUnlocked) showDialogue("火星", "你从高空安全落回出生点。虫洞关闭了。", 3.2);
  window.setTimeout(() => {
    if (elapsedTime > lastWormholeTriggerAt + WORMHOLE_TRIGGER_COOLDOWN) wormholeTriggerArmed = true;
  }, WORMHOLE_TRIGGER_COOLDOWN * 1000);
}

function updateScaleGunAimingPlayer(delta: number) {
  updateScaleGunAimInput(delta);
  playerVelocity.set(0, 0, 0);
  playerForward.projectOnPlane(playerNormal).normalize();
  if (!grounded || playerAltitudeOffset > 0) {
    verticalVelocity -= MARS_GRAVITY * delta;
    playerAltitudeOffset += verticalVelocity * delta;
    if (playerAltitudeOffset <= 0) {
      playerAltitudeOffset = 0;
      verticalVelocity = 0;
      grounded = true;
    }
  }
  placePlayerOnPlanet();
  return 0;
}

function updateFlightPlayer(delta: number) {
  const surfaceNormal = playerNormal.clone();
  const { turnInput, forwardInput } = readMovementInput();

  const turnRate = keyState.has("ShiftLeft") || keyState.has("ShiftRight") ? 2.15 : 1.65;
  if (Math.abs(turnInput) > 0.001) {
    playerForward.applyAxisAngle(surfaceNormal, turnInput * turnRate * delta).projectOnPlane(surfaceNormal).normalize();
  }

  const flightSpeed = keyState.has("ShiftLeft") || keyState.has("ShiftRight") ? 18 : 11.5;
  const desired = playerForward.clone().multiplyScalar(flightSpeed * forwardInput);
  playerVelocity.lerp(desired, 1 - Math.pow(0.035, delta));
  playerVelocity.projectOnPlane(surfaceNormal);

  const angularDistance = playerVelocity.length() * delta / Math.max(PLANET_RADIUS + playerAltitudeOffset, 1);
  if (angularDistance > 0.00001) {
    playerNormal.addScaledVector(playerVelocity.clone().normalize(), angularDistance).normalize();
    playerForward.projectOnPlane(playerNormal).normalize();
  }

  const verticalInput = (isFlightAscending() ? 1 : 0) - (isFlightDescending() ? 1 : 0);
  if (verticalInput > 0) {
    playerAltitudeOffset = Math.min(FLIGHT_MAX_ALTITUDE, playerAltitudeOffset + FLIGHT_ASCEND_SPEED * delta);
  } else if (verticalInput < 0) {
    playerAltitudeOffset = Math.max(0, playerAltitudeOffset - FLIGHT_DESCEND_SPEED * delta);
  } else {
    playerAltitudeOffset = Math.max(FLIGHT_MIN_ALTITUDE, playerAltitudeOffset);
  }
  grounded = false;
  verticalVelocity = 0;
  placePlayerOnPlanet();
  maybeTriggerWormholeFall();
  if (wormholeFall) return 0;
  if (verticalInput < 0 && tryLandFlightOnWalkableSurface()) return 0;
  if (playerAltitudeOffset <= 0) {
    playerAltitudeOffset = 0;
    landFromFlight();
    placePlayerOnPlanet();
    return 0;
  }
  return playerVelocity.length() + (verticalInput !== 0 ? FLIGHT_ASCEND_SPEED : 0);
}

function tryLandFlightOnWalkableSurface() {
  for (const elevator of world.elevators) {
    if (elevator.moving || elevator.target !== "top") continue;
    const scale = new THREE.Vector3();
    elevator.car.getWorldScale(scale);
    const landingY = getElevatorPlayerLocalY(elevator, scale);
    const local = elevator.car.worldToLocal(player.position.clone());
    const withinX = local.x >= elevator.walkBounds.minX - FLIGHT_LANDING_SURFACE_MARGIN && local.x <= elevator.walkBounds.maxX + FLIGHT_LANDING_SURFACE_MARGIN;
    const withinZ = local.z >= elevator.walkBounds.minZ - FLIGHT_LANDING_SURFACE_MARGIN && local.z <= elevator.walkBounds.maxZ + FLIGHT_LANDING_SURFACE_MARGIN;
    if (!withinX || !withinZ) continue;
    const heightAboveSurface = local.y - landingY;
    if (heightAboveSurface < -0.12 || heightAboveSurface > FLIGHT_LANDING_SURFACE_CLEARANCE) continue;
    elevatorRideLocal.set(
      THREE.MathUtils.clamp(local.x, elevator.walkBounds.minX, elevator.walkBounds.maxX),
      landingY,
      THREE.MathUtils.clamp(local.z, elevator.walkBounds.minZ, elevator.walkBounds.maxZ),
    );
    ridingElevator = elevator;
    landFromFlight();
    placePlayerOnElevator(elevator);
    return true;
  }
  return false;
}

function isFlightAscending() {
  return keyState.has("KeyE");
}

function isFlightDescending() {
  return keyState.has("KeyQ");
}

function updateHabitatInterior(delta: number) {
  const { turnInput, forwardInput } = readMovementInput();
  const up = new THREE.Vector3(0, 1, 0).transformDirection(world.habitatDoor.root.matrixWorld).normalize();
  playerNormal.copy(up);
  playerForward.projectOnPlane(playerNormal).normalize();

  const turnRate = keyState.has("ShiftLeft") || keyState.has("ShiftRight") ? 2.0 : 1.55;
  if (Math.abs(turnInput) > 0.001) {
    playerForward.applyAxisAngle(playerNormal, turnInput * turnRate * delta).projectOnPlane(playerNormal).normalize();
  }

  const walkSpeed = keyState.has("ShiftLeft") || keyState.has("ShiftRight") ? 3.6 : 2.35;
  if (Math.abs(forwardInput) > 0.001) {
    const proposedWorld = player.position.clone().addScaledVector(playerForward, walkSpeed * forwardInput * delta);
    const proposedLocal = world.habitatDoor.root.worldToLocal(proposedWorld);
    habitatLocal.x = THREE.MathUtils.clamp(proposedLocal.x, -5.1, 5.1);
    habitatLocal.z = THREE.MathUtils.clamp(proposedLocal.z, -1.78, 1.62);
  }

  habitatLocal.y = -0.76;
  player.position.copy(world.habitatDoor.root.localToWorld(habitatLocal.clone()));
  player.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), playerNormal);
  player.rotateY(headingFromForward(playerNormal, playerForward));
  playerVelocity.set(0, 0, 0);
  grounded = true;
  playerAltitudeOffset = 0;
  verticalVelocity = 0;
  return Math.abs(forwardInput) * walkSpeed;
}

function updateGreenhouseInterior(delta: number) {
  const door = world.greenhouseDoor;
  const { turnInput, forwardInput } = readMovementInput();
  const up = new THREE.Vector3(0, 1, 0).transformDirection(door.root.matrixWorld).normalize();
  playerNormal.copy(up);
  playerForward.projectOnPlane(playerNormal).normalize();

  const turnRate = keyState.has("ShiftLeft") || keyState.has("ShiftRight") ? 2.0 : 1.55;
  if (Math.abs(turnInput) > 0.001) {
    playerForward.applyAxisAngle(playerNormal, turnInput * turnRate * delta).projectOnPlane(playerNormal).normalize();
  }

  const walkSpeed = keyState.has("ShiftLeft") || keyState.has("ShiftRight") ? 3.8 : 2.45;
  if (Math.abs(forwardInput) > 0.001) {
    const proposedWorld = player.position.clone().addScaledVector(playerForward, walkSpeed * forwardInput * delta);
    const proposedLocal = door.root.worldToLocal(proposedWorld);
    proposedLocal.y = 0.62;
    const flat = new THREE.Vector2(proposedLocal.x, proposedLocal.z);
    resolveGreenhouseLocalMovement(flat, door);
    greenhouseLocal.set(flat.x, 0.62, flat.y);
  }

  player.position.copy(door.root.localToWorld(greenhouseLocal.clone()));
  player.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), playerNormal);
  player.rotateY(headingFromForward(playerNormal, playerForward));
  playerVelocity.set(0, 0, 0);
  grounded = true;
  playerAltitudeOffset = 0;
  verticalVelocity = 0;
  return Math.abs(forwardInput) * walkSpeed;
}

function resolveGreenhouseLocalMovement(flat: THREE.Vector2, door: GreenhouseDoorControl) {
  const greenhouseRadius = 3.26;
  const playerRadius = 0.34;
  flat.y = THREE.MathUtils.clamp(flat.y, -3.18, 3.02);
  if (flat.length() > greenhouseRadius) flat.setLength(greenhouseRadius);

  for (let pass = 0; pass < 4; pass += 1) {
    let adjusted = false;
    for (const tree of door.treeColliders) {
      const away = flat.clone().sub(new THREE.Vector2(tree.x, tree.z));
      const distance = away.length();
      const minDistance = tree.radius + playerRadius;
      if (distance >= minDistance) continue;
      if (distance < 0.0001) away.set(1, 0);
      else away.multiplyScalar(1 / distance);
      flat.set(tree.x, tree.z).addScaledVector(away, minDistance);
      adjusted = true;
    }
    flat.y = THREE.MathUtils.clamp(flat.y, -3.18, 3.02);
    if (flat.length() > greenhouseRadius) flat.setLength(greenhouseRadius);
    if (!adjusted) break;
  }
}

function updateElevatorRide(delta: number, elevator: ElevatorControl) {
  const normal = new THREE.Vector3(0, 1, 0).transformDirection(elevator.car.matrixWorld).normalize();
  playerNormal.copy(normal);
  playerForward.projectOnPlane(playerNormal).normalize();
  grounded = true;
  playerAltitudeOffset = 0;
  verticalVelocity = 0;

  if (insideRocket) {
    return updateRocketInteriorLook(delta, elevator);
  }

  if (!elevator.moving && elevator.target === "top") {
    const { turnInput, forwardInput } = readMovementInput();
    const turnRate = keyState.has("ShiftLeft") || keyState.has("ShiftRight") ? 2.0 : 1.55;
    if (Math.abs(turnInput) > 0.001) {
      playerForward.applyAxisAngle(playerNormal, turnInput * turnRate * delta).projectOnPlane(playerNormal).normalize();
    }

    const walkSpeed = keyState.has("ShiftLeft") || keyState.has("ShiftRight") ? 4.0 : 2.6;
    if (Math.abs(forwardInput) > 0.001) {
      const proposedWorld = player.position.clone().addScaledVector(playerForward, walkSpeed * forwardInput * delta);
      const proposedLocal = elevator.car.worldToLocal(proposedWorld);
      elevatorRideLocal.x = THREE.MathUtils.clamp(proposedLocal.x, elevator.walkBounds.minX, ROCKET_HATCH_STOP_X);
      elevatorRideLocal.z = THREE.MathUtils.clamp(proposedLocal.z, elevator.walkBounds.minZ, elevator.walkBounds.maxZ);
    }
    placePlayerOnElevator(elevator);
    return Math.abs(forwardInput) * walkSpeed;
  }

  playerVelocity.set(0, 0, 0);
  placePlayerOnElevator(elevator);
  return 0;
}

function updateRocketInteriorLook(delta: number, elevator: ElevatorControl) {
  const { turnInput, forwardInput } = readMovementInput();
  orbitYawOffset = THREE.MathUtils.clamp(orbitYawOffset - turnInput * 1.45 * delta, -1.18, 1.18);
  pitch = THREE.MathUtils.clamp(pitch + forwardInput * 0.65 * delta, 0.02, 1.68);
  playerVelocity.set(0, 0, 0);
  placePlayerInRocketInterior(elevator);
  return 0;
}

function readMovementInput() {
  let turnInput = 0;
  let forwardInput = 0;
  if (keyState.has("KeyW") || keyState.has("ArrowUp")) forwardInput += 1;
  if (keyState.has("KeyS") || keyState.has("ArrowDown")) forwardInput -= 1;
  if (keyState.has("KeyA") || keyState.has("ArrowLeft")) turnInput += 1;
  if (keyState.has("KeyD") || keyState.has("ArrowRight")) turnInput -= 1;
  turnInput -= mobileStick.x * 0.85;
  forwardInput += -mobileStick.y;
  return {
    turnInput: THREE.MathUtils.clamp(turnInput, -1, 1),
    forwardInput: THREE.MathUtils.clamp(forwardInput, -1, 1),
  };
}

function updateFootball(delta: number) {
  if (!started || wormholeFall || world.habitatDoor.occupied || insideGreenhouse || insideRocket) {
    updateFootballVisual(football, 0);
    rememberRoverPositions();
    return;
  }

  if (footballCarried) {
    updateCarriedFootball(delta);
    rememberRoverPositions();
    return;
  }

  applyPlayerFootballCollision();
  applyRoverFootballCollisions(delta);
  integrateFootballMotion(delta);
  resolveFootballStaticCollisions();
  checkFootballGoal();
  updateFootballVisual(football, delta);
}

function updateCarriedFootball(delta: number) {
  const carryNormal = playerNormal.clone().addScaledVector(playerForward, FOOTBALL_CARRY_FORWARD_DISTANCE / PLANET_RADIUS).normalize();
  football.normal.copy(carryNormal);
  football.velocity.set(0, 0, 0);
  football.altitude = FOOTBALL_CARRY_ALTITUDE;
  football.verticalVelocity = 0;
  football.lastPlayerKickAt = elapsedTime;
  updateFootballVisual(football, delta);
}

function applyPlayerFootballCollision() {
  const distance = surfaceDistanceBetween(playerNormal, football.normal);
  if (distance > FOOTBALL_PLAYER_RADIUS + FOOTBALL_RADIUS) return;
  awardHiddenDiscovery("football", "火星足球");

  const away = tangentDirectionBetween(playerNormal, football.normal, football.normal);
  if (away.lengthSq() < 0.000001) return;
  const playerTowardBall = playerVelocity.dot(away);
  const ballTowardPlayer = football.velocity.dot(away.clone().negate());
  const cooldownActive = elapsedTime - football.lastPlayerKickAt < 0.18;
  if (playerTowardBall <= 0.15 && ballTowardPlayer <= 0.15 && cooldownActive) return;

  const movingKick = Math.max(playerTowardBall, 0);
  const ballBounce = Math.max(ballTowardPlayer, 0) * 0.42;
  const impulse =
    THREE.MathUtils.clamp(Math.max(movingKick * 1.08, ballBounce, movingKick > 0.15 ? 1.15 : 0), 0, FOOTBALL_MAX_SPEED) *
    FOOTBALL_KICK_POWER;
  if (impulse > 0) {
    football.velocity.addScaledVector(away, impulse);
    football.verticalVelocity = Math.max(
      football.verticalVelocity,
      FOOTBALL_KICK_VERTICAL_MIN + THREE.MathUtils.clamp(impulse * FOOTBALL_KICK_VERTICAL_SCALE, 0, 1.45)
    );
    football.altitude = Math.max(football.altitude, FOOTBALL_REST_ALTITUDE + 0.02);
    football.lastPlayerKickAt = elapsedTime;
  }
  separateFootballFromNormal(playerNormal, FOOTBALL_PLAYER_RADIUS + FOOTBALL_RADIUS);
}

function applyRoverFootballCollisions(delta: number) {
  const minDelta = Math.max(delta, 0.001);
  for (const rover of world.rovers) {
    const previous = roverPreviousPositions.get(rover);
    const current = new THREE.Vector3();
    rover.getWorldPosition(current);
    roverPreviousPositions.set(rover, current.clone());
    if (!previous) continue;

    const roverNormal = current.clone().normalize();
    const kind = rover.userData.kind;
    const size = typeof rover.userData.size === "number" ? rover.userData.size : typeof rover.userData.botSize === "number" ? rover.userData.botSize : 1;
    const colliderRadius = kind === "bot" ? 0.78 * size : kind === "cargo" ? 2.45 * size : 2.15 * size;
    if (surfaceDistanceBetween(roverNormal, football.normal) > colliderRadius + FOOTBALL_RADIUS) continue;

    const roverVelocity = current.sub(previous).multiplyScalar(1 / minDelta).projectOnPlane(roverNormal);
    const away = tangentDirectionBetween(roverNormal, football.normal, football.normal);
    if (away.lengthSq() < 0.000001) continue;
    const objectPush = Math.max(roverVelocity.dot(away), 0);
    const ballIntoObject = Math.max(football.velocity.dot(away.clone().negate()), 0);
    const minimumPush = objectPush > 0.1 ? (kind === "bot" ? 0.65 : 1.6) : 0;
    const impulse =
      THREE.MathUtils.clamp(Math.max(objectPush * (kind === "bot" ? 0.86 : 1.18), ballIntoObject * 0.5, minimumPush), 0, FOOTBALL_MAX_SPEED) *
      FOOTBALL_KICK_POWER;
    if (impulse > 0) {
      football.velocity.addScaledVector(away, impulse);
      football.verticalVelocity = Math.max(football.verticalVelocity, 0.28 + Math.min(1.8, impulse * (kind === "bot" ? 0.09 : 0.14)));
      football.altitude = Math.max(football.altitude, FOOTBALL_REST_ALTITUDE + 0.015);
    }
    bounceFootballAwayFrom(away, FOOTBALL_DYNAMIC_RESTITUTION, roverVelocity);
    separateFootballFromNormal(roverNormal, colliderRadius + FOOTBALL_RADIUS);
  }
}

function integrateFootballMotion(delta: number) {
  const airborne = football.altitude > FOOTBALL_REST_ALTITUDE + 0.01 || football.verticalVelocity > 0.001;
  const drag = airborne ? FOOTBALL_AIR_DRAG : FOOTBALL_GROUND_FRICTION;
  football.velocity.multiplyScalar(Math.exp(-drag * delta));
  if (football.velocity.length() > FOOTBALL_MAX_SPEED) football.velocity.setLength(FOOTBALL_MAX_SPEED);
  football.velocity.projectOnPlane(football.normal);

  const distance = football.velocity.length() * delta;
  if (distance > 0.0001) {
    football.normal.addScaledVector(football.velocity.clone().normalize(), distance / Math.max(PLANET_RADIUS + football.altitude, 1)).normalize();
    football.velocity.projectOnPlane(football.normal);
  }

  if (airborne) {
    football.verticalVelocity -= MARS_GRAVITY * delta;
    football.altitude += football.verticalVelocity * delta;
    if (football.altitude <= FOOTBALL_REST_ALTITUDE) {
      football.altitude = FOOTBALL_REST_ALTITUDE;
      if (football.verticalVelocity < -0.85) {
        football.verticalVelocity = Math.abs(football.verticalVelocity) * 0.26;
        football.velocity.multiplyScalar(0.86);
      } else {
        football.verticalVelocity = 0;
      }
    }
  }

  if (football.velocity.lengthSq() < 0.0009) football.velocity.set(0, 0, 0);
}

function resolveFootballStaticCollisions() {
  const nearbyColliders = staticCollisionWorld.query(football.normal, 24).map((entry) => entry.source);
  for (const collider of nearbyColliders) {
    if (collider.enabled && !collider.enabled()) continue;
    const colliderNormal = normalForCollider(collider, new THREE.Vector3());
    const minimumDistance = collider.radius + FOOTBALL_RADIUS;
    if (surfaceDistanceBetween(colliderNormal, football.normal) >= minimumDistance) continue;
    const away = tangentDirectionBetween(colliderNormal, football.normal, football.normal);
    if (away.lengthSq() < 0.000001) continue;
    bounceFootballAwayFrom(away, FOOTBALL_STATIC_RESTITUTION);
    separateFootballFromNormal(colliderNormal, minimumDistance);
  }
}

function bounceFootballAwayFrom(away: THREE.Vector3, restitution: number, extraVelocity = new THREE.Vector3()) {
  const relativeVelocity = football.velocity.clone().sub(extraVelocity).projectOnPlane(football.normal);
  const inward = relativeVelocity.dot(away);
  if (inward < -0.05) {
    football.velocity.addScaledVector(away, -(1 + restitution) * inward);
  } else if (inward < 0.4) {
    football.velocity.addScaledVector(away, 0.45);
  }
  football.velocity.projectOnPlane(football.normal);
}

function separateFootballFromNormal(obstacleNormal: THREE.Vector3, minimumDistance: number) {
  const dot = THREE.MathUtils.clamp(football.normal.dot(obstacleNormal), -1, 1);
  const currentDistance = Math.acos(dot) * PLANET_RADIUS;
  if (currentDistance >= minimumDistance) return;
  let away = football.normal.clone().addScaledVector(obstacleNormal, -dot);
  if (away.lengthSq() < 0.000001) away = football.velocity.clone().projectOnPlane(obstacleNormal);
  if (away.lengthSq() < 0.000001) away = new THREE.Vector3(1, 0, 0).projectOnPlane(obstacleNormal);
  if (away.lengthSq() < 0.000001) away = new THREE.Vector3(0, 0, 1).projectOnPlane(obstacleNormal);
  away.normalize();
  const targetAngle = minimumDistance / PLANET_RADIUS;
  football.normal.copy(obstacleNormal).multiplyScalar(Math.cos(targetAngle)).addScaledVector(away, Math.sin(targetAngle)).normalize();
  football.velocity.projectOnPlane(football.normal);
}

function updateFootballVisual(state: FootballState, delta: number) {
  const rollDistance = state.velocity.length() * delta;
  if (rollDistance > 0.0001) {
    const rollAxis = state.normal.clone().cross(state.velocity).normalize();
    if (rollAxis.lengthSq() > 0.000001) state.ball.rotateOnWorldAxis(rollAxis, rollDistance / FOOTBALL_RADIUS);
  }
  state.group.position.copy(planetSurfacePointFromNormal(state.normal, state.altitude));
  placeObjectOnPlanetNormal(state.shadow, state.normal, 0.046, 0);
  state.shadow.rotateX(-Math.PI / 2);
  const lift = THREE.MathUtils.clamp((state.altitude - FOOTBALL_REST_ALTITUDE) / 3.2, 0, 1);
  state.shadow.scale.setScalar(THREE.MathUtils.lerp(1.0, 0.46, lift));
  state.shadow.material.opacity = THREE.MathUtils.lerp(0.34, 0.1, lift);
}

function checkFootballGoal() {
  if (elapsedTime - footballGoal.lastScoredAt < FOOTBALL_GOAL_COOLDOWN_SECONDS) return;
  if (!isFootballInsideAncientTreeDoorway()) return;

  footballGoal.goals += 1;
  footballGoal.lastScoredAt = elapsedTime;
  awardRepeatableScore(SCORE_FOOTBALL_GOAL, "火星足球穿过古树拱门");
  showDialogue("火星足球", "足球穿过古树拱门门洞，获得 +100 经验值。足球已回到出生点。", 2.4);
  respawnFootball();
}

function isFootballInsideAncientTreeDoorway() {
  if (!ancientTreeArchObject) return false;
  const position = planetSurfacePointFromNormal(football.normal, football.altitude, new THREE.Vector3());
  const local = ancientTreeArchObject.worldToLocal(position);
  return isInsideAncientTreeDoorway(local, 0.82);
}

function respawnFootball() {
  footballCarried = false;
  activeFootball = false;
  football.normal.copy(planetNormal(FOOTBALL_SPAWN_X, FOOTBALL_SPAWN_Z, new THREE.Vector3()));
  football.velocity.set(0, 0, 0);
  football.altitude = FOOTBALL_REST_ALTITUDE;
  football.verticalVelocity = 0;
  football.lastPlayerKickAt = elapsedTime + 0.35;
  football.ball.quaternion.identity();
  updateFootballVisual(football, 0);
}

function findActiveFootball() {
  if (!started || footballCarried || wormholeFall || dialogueOpen || world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator || ridingRover || ridingAtAt) {
    return false;
  }
  return surfaceDistanceBetween(playerNormal, football.normal) < FOOTBALL_PICKUP_RADIUS;
}

function pickupFootball() {
  if (footballCarried || !activeFootball) return;
  footballCarried = true;
  activeFootball = false;
  updateCarriedFootball(0);
  closeTouchInteractionDrawer();
  interactionChoiceOpen = false;
  showDialogue("火星足球", "已拾取。按 Q 放下。", 1.8);
}

function dropFootball(showMessage = true) {
  if (!footballCarried) return;
  const dropNormal = playerNormal.clone().addScaledVector(playerForward, FOOTBALL_CARRY_FORWARD_DISTANCE / PLANET_RADIUS).normalize();
  footballCarried = false;
  activeFootball = false;
  football.normal.copy(dropNormal);
  football.velocity.set(0, 0, 0);
  football.altitude = FOOTBALL_REST_ALTITUDE;
  football.verticalVelocity = 0;
  football.lastPlayerKickAt = elapsedTime + 0.25;
  updateFootballVisual(football, 0);
  if (showMessage) showDialogue("火星足球", "已放下。", 1.4);
}

function rememberRoverPositions() {
  for (const rover of world.rovers) {
    const position = new THREE.Vector3();
    rover.getWorldPosition(position);
    roverPreviousPositions.set(rover, position);
  }
}

function surfaceDistanceBetween(a: THREE.Vector3, b: THREE.Vector3) {
  return Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1)) * PLANET_RADIUS;
}

function normalForCollider(collider: CircleCollider, target = new THREE.Vector3()) {
  if (collider.dynamicObject) {
    collider.dynamicObject.getWorldPosition(target).normalize();
    return target;
  }
  if (collider.normal) return target.copy(collider.normal).normalize();
  return planetNormal(collider.center.x, collider.center.y, target);
}

function tangentDirectionBetween(from: THREE.Vector3, to: THREE.Vector3, tangentAt: THREE.Vector3) {
  const dot = THREE.MathUtils.clamp(from.dot(to), -1, 1);
  return to.clone().multiplyScalar(dot).sub(from).projectOnPlane(tangentAt).normalize();
}

function directionTowardNormal(from: THREE.Vector3, to: THREE.Vector3) {
  return to.clone().addScaledVector(from, -to.dot(from)).projectOnPlane(from).normalize();
}

function updateWormholeCamera(delta: number) {
  if (!wormholeFall) return;
  cameraObstructionLift = 0;
  world.root.visible = false;
  const progress = wormholeProgress();
  const depth = wormholeFall.depth;
  const normal = playerNormal.clone();
  const right = playerForward.clone().cross(normal).normalize();
  const driftOffset = right
    .clone()
    .multiplyScalar(wormholeFall.drift.x * 0.24 * WORMHOLE_DRIFT_VISUAL_MULTIPLIER)
    .addScaledVector(playerForward, wormholeFall.drift.y * 0.24 * WORMHOLE_DRIFT_VISUAL_MULTIPLIER);
  const isFirstPerson = cameraDistance <= 0.9;

  if (scene.background instanceof THREE.Color) {
    scene.background.set(0x000000).lerp(new THREE.Color(0x03010a), THREE.MathUtils.smoothstep(progress, 0.74, 1));
  }
  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.color.set(0x000003);
    scene.fog.density = THREE.MathUtils.lerp(0.00015, 0.00055, THREE.MathUtils.smoothstep(progress, 0.74, 1));
  }
  camera.fov = THREE.MathUtils.lerp(camera.fov, isFirstPerson ? 70 : 42, 1 - Math.pow(0.0008, delta));
  camera.updateProjectionMatrix();

  if (isFirstPerson) {
    const eye = player.position.clone().addScaledVector(normal, 1.62);
    const lookTarget = player.position.clone().addScaledVector(normal, -90).addScaledVector(playerForward, 1.2).add(driftOffset);
    camera.position.lerp(eye, 1 - Math.pow(0.00003, delta));
    camera.up.copy(playerForward);
    camera.lookAt(lookTarget);
    playerRig.visual.visible = false;
  } else {
    const distanceT = THREE.MathUtils.smoothstep(progress, 0, 0.68);
    const forwardDepth = THREE.MathUtils.clamp(-depth, 0, 1);
    const backDepth = THREE.MathUtils.clamp(depth, 0, 1);
    const cameraDolly = THREE.MathUtils.lerp(1, 1.55, forwardDepth) * THREE.MathUtils.lerp(1, 1 - 0.41 * WORMHOLE_DEPTH_BACK_DOLLY_MULTIPLIER, backDepth);
    const desired = player.position
      .clone()
      .addScaledVector(normal, THREE.MathUtils.lerp(3.14, 2.88, distanceT) * cameraDolly)
      .addScaledVector(playerForward, -THREE.MathUtils.lerp(5.72, 5.06, distanceT) * cameraDolly);
    const lookTarget = player.position
      .clone()
      .addScaledVector(normal, THREE.MathUtils.lerp(0.72, 0.52, distanceT))
      .addScaledVector(playerForward, WORMHOLE_PLAYER_SCREEN_UP_OFFSET)
      .add(driftOffset.clone().multiplyScalar(1.18));
    const initialSnap = elapsedTime - wormholeFall.startedAt < 0.12;
    camera.position.lerp(desired, initialSnap ? 1 : 1 - Math.pow(0.00004, delta));
    camera.up.copy(playerForward);
    camera.lookAt(lookTarget);
    playerRig.visual.visible = true;
  }
  orbitYawOffset *= Math.pow(0.03, delta);
  updateWormholeFallVisual(progress, wormholeFall.drift, delta);
}

function updateWormholePlayerPose(delta: number) {
  const targetRotation = wormholeFall ? -Math.PI / 2 : 0;
  playerRig.visual.rotation.x = THREE.MathUtils.lerp(playerRig.visual.rotation.x, targetRotation, 1 - Math.pow(0.0004, delta));
  const depth = wormholeFall?.depth ?? 0;
  const perspectiveScale = depth < 0
    ? THREE.MathUtils.lerp(1, 0.7, THREE.MathUtils.clamp(-depth, 0, 1))
    : THREE.MathUtils.lerp(1, 1.3, THREE.MathUtils.clamp(depth, 0, 1));
  player.scale.lerp(new THREE.Vector3().setScalar(wormholeFall ? PLAYER_BASE_SCALE * WORMHOLE_PLAYER_SCALE_MULTIPLIER * perspectiveScale : PLAYER_BASE_SCALE), 1 - Math.pow(0.0005, delta));
  if (wormholeFall) {
    playerRig.visual.position.y = 1.05 + Math.sin(elapsedTime * 9.5) * 0.035;
    playerRig.leftArm.rotation.x = 0.42 + Math.sin(elapsedTime * 6.7) * 0.04;
    playerRig.rightArm.rotation.x = 0.42 - Math.sin(elapsedTime * 6.7) * 0.04;
    playerRig.leftLeg.rotation.x = 0.18 + Math.sin(elapsedTime * 7.1) * 0.035;
    playerRig.rightLeg.rotation.x = 0.18 - Math.sin(elapsedTime * 7.1) * 0.035;
    playerRig.jetpackFlames.visible = false;
  }
}

function updateCamera(delta: number) {
  if (!started) {
    cameraObstructionLift = 0;
    const distance = TITLE_CAMERA_DISTANCE;
    const titleYaw = yaw;
    const target = new THREE.Vector3(0, 0, 0);
    const desired = new THREE.Vector3(
      Math.sin(titleYaw) * Math.cos(0.44) * distance,
      Math.sin(0.44) * distance,
      Math.cos(titleYaw) * Math.cos(0.44) * distance
    );
    camera.position.lerp(desired, 1 - Math.pow(0.0002, delta));
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    yaw += delta * 0.08;
    return;
  }

  if (orbitalDefense.active) {
    orbitalDefense.updateCamera(delta, camera);
    playerRig.visual.visible = false;
    return;
  }

  if (wormholeFall) {
    updateWormholeCamera(delta);
    return;
  }

  if (isWormholeWhiteoutActive()) {
    updateWormholeWhiteoutCamera(delta);
    return;
  }

  if (ridingAtAt) {
    updateAtAtCamera(delta);
    playerRig.visual.visible = false;
    return;
  }

  world.root.visible = true;
  const normal = playerNormal.clone();
  if (cameraDistance <= 0.9 || world.habitatDoor.occupied || insideGreenhouse || insideRocket) {
    cameraObstructionLift = 0;
    const eye = player.position.clone().addScaledVector(normal, insideRocket ? 1.38 : 1.78);
    const lookForward = playerForward
      .clone()
      .applyAxisAngle(normal, orbitYawOffset)
      .projectOnPlane(normal)
      .normalize();
    const pitchOffset = scaleGunAiming
      ? THREE.MathUtils.clamp(pitch - 0.34, SCALE_GUN_AIM_PITCH_MIN, SCALE_GUN_AIM_PITCH_MAX)
      : insideRocket
        ? THREE.MathUtils.clamp(pitch - 0.24, -0.46, 1.28)
        : THREE.MathUtils.clamp(pitch - 0.34, -0.22, 0.36);
    const lookDirection = lookForward.clone().multiplyScalar(Math.cos(pitchOffset)).addScaledVector(normal, Math.sin(pitchOffset)).normalize();
    const desired = eye
      .clone()
      .addScaledVector(lookForward, insideRocket ? -0.92 : 0)
      .addScaledVector(normal, insideRocket ? -0.12 : 0.03);
    camera.position.lerp(desired, 1 - Math.pow(0.00002, delta));
    camera.up.copy(normal);
    camera.lookAt(eye.clone().addScaledVector(lookDirection, 24));
    playerRig.visual.visible = false;
    if (!scaleGunAiming) orbitYawOffset *= Math.pow(0.03, delta);
    return;
  }

  if (exitFrontCamera) {
    const exitDistance = player.position.distanceTo(exitFrontCamera.origin);
    const holdUntilElevatorLands = Boolean(ridingElevator && ridingElevator.target === "bottom");
    if (exitDistance >= exitFrontCamera.releaseDistance && !holdUntilElevatorLands) {
      exitFrontCamera = null;
    } else {
      if (exitFrontCamera.mode === "front") {
        const distance = Math.max(cameraDistance, exitFrontCamera.distance);
        const target = player.position.clone().addScaledVector(normal, 1.45);
        const frontDirection = playerForward.clone().applyAxisAngle(normal, orbitYawOffset).projectOnPlane(normal).normalize();
        const desired = target.clone().addScaledVector(frontDirection, distance * 0.82).addScaledVector(normal, exitFrontCamera.lift);
        camera.position.lerp(desired, 1 - Math.pow(0.00004, delta));
        camera.up.copy(normal);
        camera.lookAt(target);
        playerRig.visual.visible = true;
        orbitYawOffset *= Math.pow(0.03, delta);
        return;
      }
      cameraObstructionLift = exitFrontCamera.lift * (1 - THREE.MathUtils.smoothstep(exitDistance, 0, exitFrontCamera.releaseDistance));
    }
  }

  const closeT = 1 - THREE.MathUtils.smoothstep(cameraDistance, 0.08, 2.2);
  const targetHeight = THREE.MathUtils.lerp(1.35, 1.55, closeT);
  const target = player.position.clone().addScaledVector(normal, targetHeight);
  const distance = cameraDistance;
  const activePitch = pitch;
  const cameraForward = playerForward.clone().applyAxisAngle(normal, orbitYawOffset).projectOnPlane(normal).normalize();
  const backDistance = Math.cos(activePitch) * distance * (1 - closeT * 0.92);
  const upDistance = Math.sin(activePitch) * distance + THREE.MathUtils.lerp(2.4, 0.03, closeT) + cameraObstructionLift;
  const offset = cameraForward.multiplyScalar(-backDistance).addScaledVector(normal, upDistance);
  const desired = target.clone().add(offset);
  cameraObstructionLift = 0;
  camera.position.lerp(desired, 1 - Math.pow(0.00005, delta));
  camera.up.copy(normal);
  camera.lookAt(closeT > 0.85 ? target.clone().addScaledVector(cameraForward, 20) : target);
  playerRig.visual.visible = cameraDistance > 1.15;
  orbitYawOffset *= Math.pow(0.03, delta);
}

function getThirdPersonCameraObstructionLift(target: THREE.Vector3, desiredCameraPosition: THREE.Vector3) {
  if (scaleGunAiming) return 0;

  let lift = 0;
  const targetNormal = target.clone().normalize();
  const nearbyStatic = staticCollisionWorld.query(targetNormal, Math.min(CAMERA_MAX_DISTANCE, cameraDistance) + 18).map((entry) => entry.source);
  for (const collider of [...nearbyStatic, ...dynamicWorldColliders]) {
    if (collider.enabled && !collider.enabled()) continue;
    const obstruction = getColliderSightlineObstruction(collider, target, desiredCameraPosition);
    if (obstruction <= 0) continue;
    lift = Math.max(lift, THREE.MathUtils.clamp(2.6 + obstruction * 0.82, 3.2, CAMERA_OBSTRUCTION_MAX_LIFT));
  }
  return lift;
}

function getColliderSightlineObstruction(collider: CircleCollider, target: THREE.Vector3, desiredCameraPosition: THREE.Vector3) {
  const colliderNormal = normalForCollider(collider, new THREE.Vector3());

  const center = colliderNormal.clone().multiplyScalar(PLANET_RADIUS);
  const right = new THREE.Vector3(0, 1, 0).cross(colliderNormal);
  if (right.lengthSq() < 0.000001) right.set(1, 0, 0).cross(colliderNormal);
  right.normalize();
  const forward = colliderNormal.clone().cross(right).normalize();
  const targetLocal = new THREE.Vector2(target.clone().sub(center).dot(right), target.clone().sub(center).dot(forward));
  const cameraLocal = new THREE.Vector2(
    desiredCameraPosition.clone().sub(center).dot(right),
    desiredCameraPosition.clone().sub(center).dot(forward)
  );
  const segment = cameraLocal.clone().sub(targetLocal);
  const segmentLengthSq = segment.lengthSq();
  if (segmentLengthSq < 0.000001) return 0;

  const closestT = THREE.MathUtils.clamp(-targetLocal.dot(segment) / segmentLengthSq, 0, 1);
  const closest = targetLocal.clone().add(segment.multiplyScalar(closestT));
  const clearance = collider.radius + CAMERA_OBSTRUCTION_MARGIN;
  const lateralDepth = clearance - closest.length();
  if (lateralDepth <= 0) return 0;

  const cameraHeight = desiredCameraPosition.clone().sub(center).dot(colliderNormal);
  if (cameraHeight > CAMERA_OBSTRUCTION_MAX_LIFT + 2.2) return 0;
  const endpointPenalty = closestT < 0.08 || closestT > 0.98 ? 0.45 : 1;
  return lateralDepth * endpointPenalty;
}

function placePlayerOnPlanet() {
  placeObjectOnPlanetNormal(player, playerNormal, PLAYER_ALTITUDE + playerAltitudeOffset, headingFromForward(playerNormal, playerForward));
}

function startExitFrontCamera(origin: THREE.Vector3, releaseDistance: number, lift = 2.2, distance = 8, mode: "front" | "rear" = "front") {
  exitFrontCamera = { origin: origin.clone(), releaseDistance, lift, distance, mode };
  cameraDistance = Math.max(cameraDistance, DEFAULT_THIRD_PERSON_CAMERA_DISTANCE, distance);
  orbitYawOffset = 0;
}

function resetPlayerToSpawn() {
  exitFrontCamera = null;
  ridingElevator = null;
  ridingRover = null;
  activeRideRover = null;
  activeAtAt = false;
  ridingAtAt = false;
  resetAtAtForRun();
  activeElevator = null;
  activeHabitatDoor = null;
  activeGreenhouseDoor = null;
  activeAncientPortal = false;
  activeFootball = false;
  footballCarried = false;
  world.habitatDoor.occupied = false;
  world.habitatDoor.interiorScene.visible = false;
  setHabitatInteriorMode(false);
  habitatLocal.set(0, -0.76, -1.55);
  insideGreenhouse = false;
  world.greenhouseDoor.occupied = false;
  world.greenhouseDoor.doorPanels.visible = true;
  greenhouseLocal.set(0, 0.62, -2.65);
  insideRocket = false;
  rocketDoorOpen = false;
  setRocketDoorVisual(false);
  playerNormal.copy(planetNormal(SPAWN_X, SPAWN_Z));
  playerForward.copy(planetNormal(SPAWN_TARGET_X, SPAWN_TARGET_Z).sub(playerNormal).projectOnPlane(playerNormal).normalize());
  playerVelocity.set(0, 0, 0);
  disableActiveJetpackForRespawn();
  playerAltitudeOffset = 0;
  verticalVelocity = 0;
  grounded = true;
  playerRig.visual.visible = true;
  camera.fov = 54;
  camera.updateProjectionMatrix();
  placePlayerOnPlanet();
}

function respawnInsideHabitat() {
  exitFrontCamera = null;
  ridingElevator = null;
  ridingRover = null;
  activeRideRover = null;
  activeAtAt = false;
  ridingAtAt = false;
  activeElevator = null;
  activeHabitatDoor = null;
  activeGreenhouseDoor = null;
  activeFootball = false;
  footballCarried = false;
  insideGreenhouse = false;
  world.greenhouseDoor.occupied = false;
  world.greenhouseDoor.doorPanels.visible = true;
  greenhouseLocal.set(0, 0.62, -2.65);
  insideRocket = false;
  rocketDoorOpen = false;
  setRocketDoorVisual(false);

  const door = world.habitatDoor;
  door.occupied = true;
  door.open = false;
  door.doorPanels.visible = true;
  door.exteriorMask.visible = true;
  door.interiorPortal.visible = false;
  door.interiorDoor.visible = true;
  door.interiorScene.visible = true;
  door.interiorLight.visible = true;
  setHabitatInteriorMode(true);
  habitatLocal.set(0, -0.76, -1.46);
  player.position.copy(door.root.localToWorld(habitatLocal.clone()));
  playerNormal.copy(new THREE.Vector3(0, 1, 0).transformDirection(door.root.matrixWorld).normalize());
  const inward = door.root.localToWorld(new THREE.Vector3(0, -0.76, -0.4)).sub(player.position).projectOnPlane(playerNormal);
  if (inward.lengthSq() > 0.0001) playerForward.copy(inward.normalize());
  playerVelocity.set(0, 0, 0);
  playerAltitudeOffset = 0;
  verticalVelocity = 0;
  grounded = true;
  playerRig.visual.visible = false;
  cameraDistance = Math.min(cameraDistance, 0.72);
  pitch = 0.34;
  orbitYawOffset = 0;
  camera.fov = 54;
  camera.updateProjectionMatrix();
}

function resetFufu() {
  fufuRescued = false;
  activeFufu = false;
  fufuSpeed = 0;
  fufuAlert = 0;
  fufuWanderAngle = -2.25;
  fufuWanderDistance = 3.1;
  fufuNextWanderAt = 0;
  fufu.visible = true;
  fufuNormal.copy(world.fufuRescueSite.normal);
  placeObjectOnPlanetNormal(fufu, fufuNormal, FUFU_SURFACE_ALTITUDE, world.fufuRescueSite.yaw);
  fufuForward.copy(new THREE.Vector3(0, 0, -1).applyQuaternion(fufu.quaternion).projectOnPlane(fufuNormal).normalize());
  fufuRestForward.copy(fufuForward);
}

function updateFufu(delta: number) {
  if (!started) {
    settleFufuAnimation(delta);
    return;
  }

  if (!fufuRescued) {
    updateWaitingFufu(delta);
    return;
  }

  if (world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator || ridingRover || ridingAtAt) {
    fufu.visible = false;
    settleFufuAnimation(delta);
    return;
  }

  fufu.visible = true;
  fufuAlert = THREE.MathUtils.lerp(fufuAlert, 0, 1 - Math.pow(0.04, delta));
  if (elapsedTime > fufuNextWanderAt) {
    const playerMoving = playerVelocity.length() > 0.5;
    fufuWanderAngle = playerMoving ? Math.PI + THREE.MathUtils.randFloatSpread(1.7) : THREE.MathUtils.randFloat(-Math.PI, Math.PI);
    fufuWanderDistance = THREE.MathUtils.randFloat(2.2, playerMoving ? 4.0 : 5.2);
    fufuNextWanderAt = elapsedTime + THREE.MathUtils.randFloat(2.6, 5.2);
  }

  const side = playerForward.clone().cross(playerNormal).normalize();
  const wanderDirection = playerForward
    .clone()
    .multiplyScalar(Math.cos(fufuWanderAngle))
    .addScaledVector(side, Math.sin(fufuWanderAngle))
    .projectOnPlane(playerNormal)
    .normalize();
  const targetNormal = playerNormal
    .clone()
    .addScaledVector(wanderDirection, fufuWanderDistance / PLANET_RADIUS)
    .normalize();
  const dot = THREE.MathUtils.clamp(fufuNormal.dot(targetNormal), -1, 1);
  const targetDistance = Math.acos(dot) * PLANET_RADIUS;
  const playerDot = THREE.MathUtils.clamp(fufuNormal.dot(playerNormal), -1, 1);
  const playerDistance = Math.acos(playerDot) * PLANET_RADIUS;

  if (playerDistance > 28) {
    fufuNormal.copy(targetNormal);
    fufuForward.copy(playerForward);
    placeObjectOnPlanetNormal(fufu, fufuNormal, FUFU_SURFACE_ALTITUDE, headingFromForward(fufuNormal, fufuForward));
    settleFufuAnimation(delta);
    return;
  }

  if (targetDistance < 1.15 && playerDistance < 7.5) {
    const relaxedForward = playerForward.clone().projectOnPlane(fufuNormal).normalize();
    turnFufuToward(relaxedForward, delta, 0.7);
    placeObjectOnPlanetNormal(fufu, fufuNormal, FUFU_SURFACE_ALTITUDE, headingFromForward(fufuNormal, fufuForward));
    settleFufuAnimation(delta);
    return;
  }

  const tangent = targetNormal.clone().addScaledVector(fufuNormal, -dot);
  if (tangent.lengthSq() < 0.000001) {
    settleFufuAnimation(delta);
    return;
  }
  tangent.normalize();
  const targetSpeed = playerDistance > 10 ? 7.2 : targetDistance > 4.2 ? 4.8 : 2.8;
  const stepAngle = Math.min((targetSpeed * delta) / PLANET_RADIUS, Math.acos(dot));
  fufuNormal.multiplyScalar(Math.cos(stepAngle)).addScaledVector(tangent, Math.sin(stepAngle)).normalize();
  turnFufuToward(tangent, delta, 1.8);
  placeObjectOnPlanetNormal(fufu, fufuNormal, FUFU_SURFACE_ALTITUDE, headingFromForward(fufuNormal, fufuForward));
  fufuSpeed = THREE.MathUtils.lerp(fufuSpeed, targetSpeed, 1 - Math.pow(0.002, delta));
}

function updateWaitingFufu(delta: number) {
  fufu.visible = true;
  const dot = THREE.MathUtils.clamp(fufuNormal.dot(playerNormal), -1, 1);
  const distance = Math.acos(dot) * PLANET_RADIUS;
  const seesPlayer = distance < 10.5;
  fufuAlert = THREE.MathUtils.lerp(fufuAlert, seesPlayer ? 1 : 0, 1 - Math.pow(0.03, delta));

  const lookDirection = seesPlayer
    ? playerNormal.clone().addScaledVector(fufuNormal, -dot).projectOnPlane(fufuNormal)
    : fufuRestForward.clone().applyAxisAngle(fufuNormal, Math.sin(elapsedTime * 0.48) * 0.82 + Math.sin(elapsedTime * 1.05) * 0.16);
  if (lookDirection.lengthSq() > 0.000001) turnFufuToward(lookDirection.normalize(), delta, seesPlayer ? 1.2 : 0.48);

  placeObjectOnPlanetNormal(fufu, fufuNormal, FUFU_SURFACE_ALTITUDE, headingFromForward(fufuNormal, fufuForward));
  settleFufuAnimation(delta);
}

function turnFufuToward(direction: THREE.Vector3, delta: number, responsiveness: number) {
  const desired = direction.clone().projectOnPlane(fufuNormal);
  if (desired.lengthSq() < 0.000001) return;
  desired.normalize();
  fufuForward.lerp(desired, 1 - Math.pow(0.0015, delta * responsiveness)).projectOnPlane(fufuNormal).normalize();
}

function settleFufuAnimation(delta: number) {
  fufuSpeed = THREE.MathUtils.lerp(fufuSpeed, 0, 1 - Math.pow(0.02, delta));
}

function headingFromForward(normal: THREE.Vector3, forward: THREE.Vector3) {
  const base = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal.clone().normalize());
  const localForward = forward.clone().normalize().applyQuaternion(base.invert());
  return Math.atan2(-localForward.x, -localForward.z);
}

function resolveCollisions(previousNormal: THREE.Vector3) {
  const playerRadius = 0.34;
  const current = playerNormal.clone();
  const nearbyStatic = staticCollisionWorld.query(current, 24).map((entry) => entry.source);

  for (const collider of [...nearbyStatic, ...dynamicWorldColliders]) {
    if (collider.enabled && !collider.enabled()) continue;
    if (collider.dynamicObject) {
      collider.center.set(collider.dynamicObject.userData.planetX ?? 0, collider.dynamicObject.userData.planetZ ?? 0);
    }
    const colliderNormal = normalForCollider(collider, new THREE.Vector3());

    const minDistance = playerRadius + collider.radius;
    const dot = THREE.MathUtils.clamp(current.dot(colliderNormal), -1, 1);
    const distance = Math.acos(dot) * PLANET_RADIUS;
    if (distance < minDistance) {
      awardColliderExploration(collider.label);
      let away = current.clone().addScaledVector(colliderNormal, -dot);
      if (away.lengthSq() < 0.000001) {
        const previousDot = THREE.MathUtils.clamp(previousNormal.dot(colliderNormal), -1, 1);
        away = previousNormal.clone().addScaledVector(colliderNormal, -previousDot);
      }
      if (away.lengthSq() < 0.000001) {
        away = new THREE.Vector3(1, 0, 0).projectOnPlane(colliderNormal);
        if (away.lengthSq() < 0.000001) away.set(0, 0, 1).projectOnPlane(colliderNormal);
      }
      away.normalize();
      const minAngle = minDistance / PLANET_RADIUS;
      current.copy(colliderNormal).multiplyScalar(Math.cos(minAngle)).addScaledVector(away, Math.sin(minAngle)).normalize();
    }
  }

  playerNormal.copy(current);
  playerForward.projectOnPlane(playerNormal).normalize();
}

function updateMissionState() {
  if (orbitalDefense.active) {
    activeAtAt = false;
    activeInteractable = null;
    activeExplorable = null;
    activeElevator = null;
    activeHabitatDoor = null;
    activeGreenhouseDoor = null;
    activeAncientPortal = false;
    activeRobot = null;
    activeElonStatue = null;
    activeFufu = false;
    activeFootball = false;
    activeRideRover = null;
    activeOrbitalDefense = false;
    activeXWingIndex = -1;
    interactionActions = [];
    interactionChoiceOpen = false;
    promptBox.textContent = "";
    promptBox.classList.remove("is-visible");
    interactionChoice.classList.remove("is-visible", "is-touch-entry", "is-drawer-open");
    interactionChoice.setAttribute("aria-hidden", "true");
    updateOrbitalDefenseHud();
    return;
  }
  if (wormholeFall || isWormholeWhiteoutActive()) {
    activeAtAt = false;
    activeInteractable = null;
    activeExplorable = null;
    activeElevator = null;
    activeHabitatDoor = null;
    activeGreenhouseDoor = null;
    activeAncientPortal = false;
    activeRobot = null;
    activeElonStatue = null;
    activeFufu = false;
    activeFootball = false;
    activeRideRover = null;
    interactionActions = [];
    interactionChoiceOpen = false;
    interactionChoiceSignature = "";
    promptBox.textContent = "";
    promptBox.classList.remove("is-visible");
    interactionChoice.classList.remove("is-visible", "is-touch-entry", "is-drawer-open");
    interactionChoice.setAttribute("aria-hidden", "true");
    document.body.classList.remove("interaction-drawer-open");
    dialogueBox.classList.toggle("is-visible", performance.now() < messageUntil);
    return;
  }
  if (isFocusOverlayActive()) {
    activeAtAt = false;
    activeInteractable = null;
    activeExplorable = null;
    activeElevator = null;
    activeHabitatDoor = null;
    activeGreenhouseDoor = null;
    activeAncientPortal = false;
    activeRobot = null;
    activeElonStatue = null;
    activeFufu = false;
    activeFootball = false;
    activeRideRover = null;
    interactionActions = [];
    interactionChoiceOpen = false;
    interactionChoiceSignature = "";
    promptBox.textContent = "";
    promptBox.classList.remove("is-visible");
    interactionChoice.classList.remove("is-visible", "is-touch-entry", "is-drawer-open");
    interactionChoice.setAttribute("aria-hidden", "true");
    document.body.classList.remove("interaction-drawer-open");
    if (dialogueOpen) {
      suppressTransientInfoWindows();
    }
    dialogueBox.classList.remove("is-visible");
    return;
  }
  if (world.habitatDoor.occupied) {
    activeAtAt = false;
    activeInteractable = null;
    activeExplorable = null;
    activeElevator = null;
    activeHabitatDoor = findActiveHabitatDoor();
    activeGreenhouseDoor = null;
    activeAncientPortal = false;
    activeRobot = null;
    activeElonStatue = null;
    activeFufu = false;
    activeFootball = false;
    activeRideRover = null;
    interactionActions = buildInteractionActions();
    if (selectedInteractionIndex < 0 || selectedInteractionIndex >= interactionActions.length) selectedInteractionIndex = 0;
    updateInteractionPrompts();
    dialogueBox.classList.toggle("is-visible", performance.now() < messageUntil);
    return;
  }
  activeInteractable = null;
  activeExplorable = null;
  activeElevator = findActiveElevator();
  activeHabitatDoor = findActiveHabitatDoor();
  activeGreenhouseDoor = findActiveGreenhouseDoor();
  activeAncientPortal = findActiveAncientPortal();
  activeRobot = null;
  activeElonStatue = null;
  activeFufu = false;
  activeFootball = false;
  activeOrbitalDefense = false;
  activeXWingIndex = -1;
  activeRideRover = ridingRover;
  activeAtAt = ridingAtAt;
  let bestDistance = Infinity;
  let bestExploreDistance = Infinity;
  let bestStatueDistance = Infinity;
  for (const item of world.interactables) {
    const pos = new THREE.Vector3();
    item.object.getWorldPosition(pos);
    const distance = pos.distanceTo(player.position);
    const matchesMission = isActiveMissionInteractable(item.id);
    if (matchesMission && distance < item.radius && distance < bestDistance) {
      bestDistance = distance;
      activeInteractable = item;
    }
    if (isExplorableBuilding(item) && distance < item.radius && distance < bestExploreDistance) {
      bestExploreDistance = distance;
      activeExplorable = item;
    }
    if (item.id === "elonStatue" && distance < item.radius && distance < bestStatueDistance) {
      bestStatueDistance = distance;
      activeElonStatue = item;
    }
  }
  if (activeExplorable && !hasExploredBuilding(activeExplorable.id)) {
    awardBuildingExploration(activeExplorable);
  }
  activeFufu = findActiveFufu();
  activeFootball = findActiveFootball();
  activeRobot = findActiveRobot();
  activeXWingIndex = findActiveOrbitalDefenseIndex();
  activeOrbitalDefense = activeXWingIndex >= 0;
  if (!activeRideRover) activeRideRover = findActiveRideRover();
  if (!activeAtAt) activeAtAt = findActiveAtAt();
  interactionActions = buildInteractionActions();
  if (hasAncientPortalPaymentActions()) selectedInteractionIndex = interactionActions.findIndex((action) => action.id === "ancientPortalPay");
  if (selectedInteractionIndex < 0 || selectedInteractionIndex >= interactionActions.length) selectedInteractionIndex = 0;
  updateInteractionPrompts();
  dialogueBox.classList.toggle("is-visible", performance.now() < messageUntil);
}

function buildInteractionActions(): InteractionAction[] {
  const actions: InteractionAction[] = [];
  if (wormholeFall || isWormholeWhiteoutActive()) return actions;
  if (isFlightActive()) {
    if (activeAncientPortal) {
      actions.push({ id: "ancientPortalConsider", label: localizeText("考虑一下") });
      actions.push({ id: "ancientPortalPay", label: localizeText("支付") });
    }
    return actions;
  }
  if (activeRobot) {
    actions.push({ id: "robot", label: localizeText("对话") });
    actions.push({ id: "robotOxygen", label: localizeText("加氧气") });
  }
  if (activeElevator) actions.push({ id: "elevator", label: localizeText(elevatorPrompt(activeElevator).replace(/^按 E /, "")) });
  if (activeHabitatDoor) actions.push({ id: "habitat", label: localizeText(world.habitatDoor.occupied ? "离开居住舱" : "进入居住舱") });
  if (world.habitatDoor.occupied && cameraPhotos.length > 0 && isNearHabitatPhotoWall()) actions.push({ id: "photoWall", label: localizeText("查看美好瞬间") });
  if (activeGreenhouseDoor) actions.push({ id: "greenhouse", label: localizeText(insideGreenhouse ? "离开温室生态舱" : "进入温室生态舱") });
  if (activeAncientPortal) {
    actions.push({ id: "ancientPortalConsider", label: localizeText("考虑一下") });
    actions.push({ id: "ancientPortalPay", label: localizeText("支付") });
  }
  if (activeInteractable && activeInteractable.id !== "habitatCheck") actions.push({ id: "mission", label: localizeText(activeInteractable.prompt.replace(/^按 E /, "")) });
  if (activeRideRover) actions.push({ id: "hitchRide", label: localizeText(ridingRover ? "下车" : "要不要搭便车？") });
  if (activeAtAt && (!ridingAtAt || elapsedTime < atAtExitPromptUntil)) {
    actions.push({ id: "atAt", label: localizeText(ridingAtAt ? "离开 AT-AT" : "驾驶 AT-AT（100 金币）") });
  }
  if (activeFufu) actions.push({ id: "fufu", label: localizeText("安抚 福福") });
  if (activeElonStatue) actions.push({ id: "elonStatue", label: localizeText("与 ELON 纪念雕塑互动") });
  if (activeFootball) actions.push({ id: "footballPickup", label: localizeText("拾取足球") });
  if (activeOrbitalDefense) {
    const color = xWingParkingConfigs[activeXWingIndex]?.color ?? "红色";
    actions.push({ id: "xWing", label: localizeText(orbitalDefense.completed ? `驾驶${color}战机再次出动` : `驾驶${color} X 翼战机`) });
  }
  const prioritized = prioritizeInteractionActions(actions);
  const hasTwoButtonChoice = prioritized.some((action) => action.id === "ancientPortalConsider" || action.id === "ancientPortalPay");
  const visibleActionLimit = isSmallScreenMapTouch() && !hasTwoButtonChoice ? 1 : 2;
  return prioritized.slice(0, visibleActionLimit);
}

function prioritizeInteractionActions(actions: InteractionAction[]) {
  return rankInteractionCandidates(
    actions.map((action, order) => ({
      ...action,
      priority: interactionActionPriority(action),
      distance: order / 1000,
    })),
    actions.length,
  ).map(({ id, label }) => ({ id, label }));
}

function interactionActionPriority(action: InteractionAction): InteractionPriority {
  const priority: Record<InteractionAction["id"], InteractionPriority> = {
    mission: "mission",
    habitat: "traversal",
    greenhouse: "traversal",
    elevator: "traversal",
    ancientPortalConsider: "traversal",
    ancientPortalPay: "traversal",
    hitchRide: "traversal",
    atAt: "traversal",
    xWing: "mission",
    robot: "character",
    robotOxygen: "oxygen",
    photoWall: "exploration",
    fufu: "exploration",
    footballPickup: "exploration",
    elonStatue: "character",
  };
  return priority[action.id];
}

function updateInteractionPrompts() {
  const touchMenu = isSmallScreenMapTouch();
  if (touchMenu && interactionActions.length > 0) {
    promptBox.textContent = "";
    promptBox.classList.remove("is-visible");
    const nextSignature = getInteractionChoiceSignature();
    if (nextSignature !== interactionChoiceSignature) renderInteractionChoice();
    return;
  }
  if (interactionActions.length > 1) {
    promptBox.textContent = "";
    promptBox.classList.remove("is-visible");
    if (interactionActions.length === 2 && interactionChoiceSignature === "") selectedInteractionIndex = 1;
    interactionChoiceOpen = true;
    const nextSignature = getInteractionChoiceSignature();
    if (nextSignature !== interactionChoiceSignature) renderInteractionChoice();
    return;
  }
  interactionChoiceOpen = false;
  interactionChoiceSignature = "";
  interactionChoice.classList.remove("is-visible", "is-touch-entry", "is-drawer-open");
  interactionChoice.setAttribute("aria-hidden", "true");
  document.body.classList.remove("interaction-drawer-open");
  promptBox.textContent = interactionActions.length === 1 ? singleInteractionPromptText(interactionActions[0]) : "";
  promptBox.classList.toggle("is-visible", interactionActions.length === 1);
}

function singleInteractionPromptText(action: InteractionAction) {
  if (action.id === "photoWall") return localizeText("这里保存着你拍下的火星瞬间，按 E 查看。");
  if (action.id === "hitchRide" && ridingRover) return `Q ${action.label}`;
  if (action.id === "atAt" && ridingAtAt) return `Q ${action.label}`;
  return `E ${action.label}`;
}

function isAncientPortalPaymentAction(action: InteractionAction) {
  return action.id === "ancientPortalConsider" || action.id === "ancientPortalPay";
}

function hasAncientPortalPaymentActions() {
  return interactionActions.some(isAncientPortalPaymentAction);
}

function isInfoChoiceAction(action: InteractionAction) {
  return isAncientPortalPaymentAction(action);
}

function hasInfoChoiceActions() {
  return interactionActions.some(isInfoChoiceAction);
}

function infoChoiceCopy() {
  if (hasAncientPortalPaymentActions()) {
    return { title: localizeText("时空之门"), detail: localizeText("你是否愿意为穿越时空之门支付50个火星币？") };
  }
  return { title: "", detail: "" };
}

function renderInteractionChoice() {
  interactionChoice.innerHTML = "";
  if (interactionActions.length === 0) {
    interactionChoiceSignature = "";
    interactionChoice.classList.remove("is-visible", "is-touch-entry", "is-drawer-open", "is-info-choice");
    interactionChoice.setAttribute("aria-hidden", "true");
    document.body.classList.remove("interaction-drawer-open");
    return;
  }
  const touchMenu = isSmallScreenMapTouch();
  if (touchMenu) {
    renderTouchInteractionChoice();
    return;
  }
  document.body.classList.remove("interaction-drawer-open");
  const isInfoChoice = hasInfoChoiceActions();
  interactionChoice.classList.remove("is-touch-entry", "is-drawer-open");
  interactionChoice.classList.toggle("is-info-choice", isInfoChoice);
  if (isInfoChoice) {
    const infoHeader = document.createElement("div");
    infoHeader.className = "info-choice-head";
    const copy = infoChoiceCopy();
    const title = document.createElement("strong");
    title.textContent = copy.title;
    const detail = document.createElement("span");
    detail.textContent = copy.detail;
    infoHeader.append(title, detail);
    interactionChoice.appendChild(infoHeader);
  }
  for (const [index, action] of interactionActions.entries()) {
    const button = document.createElement("button");
    button.className = "interaction-option";
    button.type = "button";
    button.dataset.choiceIndex = String(index);
    const label = document.createElement("strong");
    label.textContent = action.label;
    button.appendChild(label);
    button.classList.toggle("is-selected", index === selectedInteractionIndex);
    interactionChoice.appendChild(button);
  }
  interactionChoiceSignature = getInteractionChoiceSignature();
  interactionChoice.classList.add("is-visible");
  interactionChoice.setAttribute("aria-hidden", "false");
}

function renderTouchInteractionChoice() {
  if (hasInfoChoiceActions()) {
    renderInfoChoice();
    return;
  }
  interactionChoice.classList.remove("is-info-choice");
  interactionChoice.classList.toggle("is-touch-entry", !interactionChoiceOpen);
  interactionChoice.classList.toggle("is-drawer-open", interactionChoiceOpen);
  document.body.classList.toggle("interaction-drawer-open", interactionChoiceOpen);

  if (!interactionChoiceOpen) {
    const entryButton = document.createElement("button");
    entryButton.className = "interaction-entry-button";
    entryButton.type = "button";
    const actionCount = interactionActions.length;
    entryButton.dataset.openInteractions = "true";
    const label = actionCount === 1 ? interactionActions[0].label : tr("interaction.count", { count: actionCount });
    const title = document.createElement("strong");
    title.textContent = tr("interaction.title");
    const detail = document.createElement("span");
    detail.textContent = label;
    entryButton.append(title, detail);
    interactionChoice.appendChild(entryButton);
  } else {
    const header = document.createElement("div");
    header.className = "interaction-sheet-head";
    const title = document.createElement("span");
    title.textContent = tr("interaction.choose");
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.dataset.closeInteractions = "true";
    closeButton.textContent = tr("interaction.close");
    header.append(title, closeButton);
    interactionChoice.appendChild(header);

    const list = document.createElement("div");
    list.className = "interaction-sheet-list";
    for (const [index, action] of interactionActions.entries()) {
      const button = document.createElement("button");
      button.className = "interaction-option";
      button.type = "button";
      button.dataset.choiceIndex = String(index);
      const label = document.createElement("strong");
      label.textContent = action.label;
      button.appendChild(label);
      button.classList.toggle("is-selected", index === selectedInteractionIndex);
      list.appendChild(button);
    }
    interactionChoice.appendChild(list);
  }
  interactionChoiceSignature = getInteractionChoiceSignature();
  interactionChoice.classList.add("is-visible");
  interactionChoice.setAttribute("aria-hidden", "false");
}

function renderInfoChoice() {
  interactionChoice.classList.remove("is-drawer-open");
  interactionChoice.classList.add("is-touch-entry", "is-info-choice");
  document.body.classList.remove("interaction-drawer-open");

  const infoHeader = document.createElement("div");
  infoHeader.className = "info-choice-head";
  const copy = infoChoiceCopy();
  const title = document.createElement("strong");
  title.textContent = copy.title;
  const detail = document.createElement("span");
  detail.textContent = copy.detail;
  infoHeader.append(title, detail);
  interactionChoice.appendChild(infoHeader);

  for (const [index, action] of interactionActions.entries()) {
    const button = document.createElement("button");
    button.className = "interaction-option";
    button.type = "button";
    button.dataset.choiceIndex = String(index);
    const label = document.createElement("strong");
    label.textContent = action.label;
    button.appendChild(label);
    button.classList.toggle("is-selected", index === selectedInteractionIndex);
    interactionChoice.appendChild(button);
  }
  interactionChoiceSignature = getInteractionChoiceSignature();
  interactionChoice.classList.add("is-visible");
  interactionChoice.setAttribute("aria-hidden", "false");
}

function closeTouchInteractionDrawer() {
  if (!isSmallScreenMapTouch()) return;
  interactionChoiceOpen = false;
  renderInteractionChoice();
}

function getInteractionChoiceSignature() {
  const menuState = isSmallScreenMapTouch() ? (interactionChoiceOpen ? "drawer" : "entry") : "desktop";
  return `${menuState}|${interactionActions.map((action, index) => `${index === selectedInteractionIndex ? "*" : ""}${action.id}:${action.label}`).join("|")}`;
}

function interact() {
  if (ridingRover || ridingAtAt) {
    return;
  }
  if (wormholeFall || isFlightActive()) return;
  if (interactionActions.length > 1) {
    if (!interactionChoiceOpen) {
      interactionChoiceOpen = true;
      renderInteractionChoice();
      return;
    }
    executeSelectedInteraction();
    return;
  }
  if (interactionActions.length === 1) {
    executeSelectedInteraction();
    return;
  }
}

function executeSelectedInteraction() {
  const action = interactionActions[Math.min(selectedInteractionIndex, interactionActions.length - 1)];
  if (!action) return;
  if (isSmallScreenMapTouch()) {
    interactionChoiceOpen = false;
    document.body.classList.remove("interaction-drawer-open");
    interactionChoice.classList.remove("is-drawer-open");
  }
  if (action.id === "elevator") {
    interactElevator();
    return;
  }
  if (action.id === "habitat" && activeHabitatDoor) {
    openHabitatDoor(activeHabitatDoor);
    return;
  }
  if (action.id === "greenhouse" && activeGreenhouseDoor) {
    if (insideGreenhouse) exitGreenhouse(activeGreenhouseDoor);
    else enterGreenhouse(activeGreenhouseDoor);
    return;
  }
  if (action.id === "ancientPortalConsider") {
    dismissAncientPortalPrompt();
    return;
  }
  if (action.id === "ancientPortalPay") {
    payAncientPortal();
    return;
  }
  if (action.id === "photoWall") {
    openPhotoViewer();
    return;
  }
  if (action.id === "fufu") {
    rescueFufu();
    return;
  }
  if (action.id === "elonStatue") {
    openElonDialogue();
    return;
  }
  if (action.id === "footballPickup") {
    pickupFootball();
    return;
  }
  if (action.id === "robot" && activeRobot) {
    activeRobot.userData.pauseUntil = elapsedTime + 6;
    openRobotBriefing(activeRobot);
    return;
  }
  if (action.id === "robotOxygen" && activeRobot) {
    refillSuitOxygen(activeRobot);
    return;
  }
  if (action.id === "hitchRide" && activeRideRover) {
    if (ridingRover) exitRoverRide();
    else enterRoverRide(activeRideRover);
    return;
  }
  if (action.id === "atAt" && activeAtAt) {
    if (ridingAtAt) exitAtAtRide();
    else enterAtAtRide();
    return;
  }
  if (action.id === "xWing") {
    startOrbitalDefenseMission();
    return;
  }
  if (action.id === "mission" && activeInteractable) {
    interactMission(activeInteractable);
  }
}

function interactElevator() {
  if (activeElevator) {
    if (insideRocket) {
      exitRocketInterior();
      return;
    }
    if (isAtRocketHatch()) {
      enterRocketInterior();
      return;
    }
    toggleElevator(activeElevator);
    return;
  }
}

function openRobotBriefing(robot: THREE.Group) {
  markRobotTalked(robot);
  const label = typeof robot.userData.label === "string" ? robot.userData.label : "维修机器人";
  const facilityLabel = typeof robot.userData.facilityLabel === "string" ? robot.userData.facilityLabel : "基地设施";
  const briefing =
    typeof robot.userData.briefing === "string"
      ? robot.userData.briefing
      : "A-12 在线。当前服从史蒂夫维修队列。可执行：管线检查、密封、阵列固定、低速搬运。";
  characters.repairRobot.name = label;
  characters.repairRobot.callsign = facilityLabel;
  dialogueNodes.robot_status.text = `${label} 在线。我负责 ${facilityLabel}。${briefing}`;
  openDialogueScene("robot", robotDialogueStartNodes[label] ?? "robot_status");
}

function interactMission(interactable: Interactable) {
  awardBuildingExploration(interactable);
  if (interactable.id === "monolith") {
    awardHiddenDiscovery("monolith", "黑色方碑");
    openDialogueScene("monolith");
  } else if (missionStep === "m1_oxygen" && interactable.id === "oxygen") {
    openDialogueScene("oxygen");
  } else if (missionStep === "m1_solarC" && interactable.id === "solarC") {
    openDialogueScene("solar");
  } else if (missionStep === "m1_garage" && interactable.id === "garage") {
    openDialogueScene("garage");
  } else {
    advanceWorldQuest(interactable.id);
  }
}

function findActiveAncientPortal() {
  if (!isAnomalySceneAccessible()) return false;
  if (!started || wormholeFall || isWormholeWhiteoutActive() || dialogueOpen || world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator || ridingRover || ridingAtAt) {
    return false;
  }
  if (!ancientTreeArchObject || isAncientPortalOpen()) return false;
  const inPaymentZone = isInsideAncientTreePortalPaymentZone();
  if (!inPaymentZone) {
    ancientPortalPromptDismissedInZone = false;
    return false;
  }
  return !ancientPortalPromptDismissedInZone;
}

function isInsideAncientTreePortalPaymentZone() {
  if (!ancientTreeArchObject) return false;
  const local = ancientTreeArchObject.worldToLocal(player.position.clone());
  if (isInsideAncientTreeDoorway(local, ANCIENT_PORTAL_PROMPT_SCALE)) return true;
  if (!isFlightActive()) return false;
  const doorwayFootprint = Math.max(34, 24) * ANCIENT_PORTAL_PROMPT_SCALE;
  return Math.abs(local.x) < doorwayFootprint
    && local.y > -16 * ANCIENT_PORTAL_PROMPT_SCALE
    && local.y < ANCIENT_PORTAL_FLIGHT_PROMPT_MAX_HEIGHT
    && Math.abs(local.z) < 42 * ANCIENT_PORTAL_PROMPT_SCALE;
}

function isInsideAncientTreeArchDiscoveryRange() {
  if (!ancientTreeArchObject) return false;
  const position = new THREE.Vector3();
  ancientTreeArchObject.getWorldPosition(position);
  return position.distanceTo(player.position) <= ANCIENT_TREE_ARCH_DISCOVERY_RADIUS;
}

function isAncientPortalOpen() {
  const openedAt = Number(world.ancientTreePortal.userData.openedAt ?? -Infinity);
  return elapsedTime - openedAt >= 0 && elapsedTime - openedAt < ANCIENT_PORTAL_ACTIVE_SECONDS;
}

function dismissAncientPortalPrompt(showFeedback = true) {
  ancientPortalPromptDismissedInZone = true;
  activeAncientPortal = false;
  interactionChoiceOpen = false;
  interactionActions = [];
  interactionChoiceSignature = "";
  interactionChoice.classList.remove("is-visible", "is-touch-entry", "is-drawer-open", "is-info-choice");
  interactionChoice.setAttribute("aria-hidden", "true");
  document.body.classList.remove("interaction-drawer-open");
  if (showFeedback) showDialogue("时空之门", "已取消。离开门洞区域后可再次选择。", 1.8);
}

function payAncientPortal() {
  if (!activeAncientPortal || isAncientPortalOpen()) return;
  if (!spendCoins(ANCIENT_PORTAL_COST_COINS)) {
    dismissAncientPortalPrompt(false);
    return;
  }
  world.ancientTreePortal.userData.openedAt = elapsedTime;
  world.ancientTreePortal.userData.portalStrength = 0.2;
  world.ancientTreePortal.visible = true;
  ancientPortalPromptDismissedInZone = true;
  activeAncientPortal = false;
  closeTouchInteractionDrawer();
  interactionChoiceOpen = false;
  interactionActions = [];
  interactionChoiceSignature = "";
  showDialogue("时空之门", "已支付 50 金币。时空之门已开启。", 2.6);
}

function resetAncientPortal() {
  world.ancientTreePortal.userData.openedAt = -Infinity;
  world.ancientTreePortal.userData.portalStrength = 0;
  world.ancientTreePortal.visible = false;
  activeAncientPortal = false;
  ancientPortalPromptDismissedInZone = false;
}

function findActiveFufu() {
  if (!started || fufuRescued || world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator || ridingRover || ridingAtAt) return false;
  return fufu.position.distanceTo(player.position) < 2.6;
}

function findActiveOrbitalDefenseIndex() {
  if (!started || !orbitalDefense.unlocked || orbitalDefense.active || world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator || ridingRover || ridingAtAt || isFlightActive()) {
    return -1;
  }
  let nearestIndex = -1;
  let nearestDistance = 11.5;
  for (const [index, parkedShip] of orbitalDefense.parkedShips.entries()) {
    const distance = parkedShip.position.distanceTo(player.position);
    if (distance >= nearestDistance) continue;
    nearestDistance = distance;
    nearestIndex = index;
  }
  return nearestIndex;
}

function startOrbitalDefenseMission() {
  if (orbitalDefense.active || activeXWingIndex < 0) return;
  orbitalDefense.selectParkedShip(activeXWingIndex);
  closeMapUi();
  closeTouchInteractionDrawer();
  interactionActions = [];
  interactionChoiceOpen = false;
  keyState.clear();
  resetStick();
  if (scaleGunAiming) toggleScaleGunAiming(false);
  if (cameraMode) toggleCameraMode(false);
  laserSwordActive = false;
  laserSwordRaised = false;
  updateLaserSwordVisual();
  playerVelocity.set(0, 0, 0);
  playerRig.visual.visible = false;
  document.body.classList.add("is-orbital-defense");
  orbitalDefenseHud.setAttribute("aria-hidden", "false");
  orbitalDefense.start(camera);
  setMissionPanelOpen(false);
  showDialogue("史蒂夫", "撞击轨迹已确认。任选一架 X 翼起飞：115 秒内清除红色危险陨石；Space / J 连发，I 锁定，K 高能炮，Q 自动返航。", 5.6);
  updateOrbitalDefenseHud();
}

function handleOrbitalDefenseEvents(events: OrbitalDefenseEvent[]) {
  for (const event of events) {
    if (event.type === "launched") {
      showDialogue("ARES X-Wing", "引擎点火。战机将沿上升弧线连续进入自由飞行；进入战斗状态后 S 翼自动展开。", 5.2);
    } else if (event.type === "combatStarted") {
      showDialogue("史蒂夫", "计时已启动：115 秒。战机默认前飞；鼠标转向，A / D 左右飞行并持续转向，W / S 上下飞行，Shift 加速，Ctrl 减速。观察雷达寻找红色陨石；I 锁定，K 高能炮。", 6.8);
    } else if (event.type === "hit" && event.integrity > 0) {
      showDialogue("史蒂夫", isEnglish() ? `Hit. Structural integrity: ${event.integrity}/8.` : `命中。目标结构完整度剩余 ${event.integrity}/8。`, 1.1);
    } else if (event.type === "destroyed") {
      awardOrbitalDefenseReward();
      const laserSwordUnlocked = event.remaining === 0 && awardLaserSwordAfterOrbitalDefense();
      showDialogue(
        "史蒂夫",
        event.remaining > 0
          ? isEnglish()
            ? `Dangerous asteroid destroyed. Reward: 10 coins and 50 score. ${event.remaining} remaining.`
            : `已击毁一颗危险陨石。奖励 10 金币、50 积分；剩余 ${event.remaining} 颗。`
          : laserSwordUnlocked
            ? localizeText("全部危险陨石已清除，基地安全。你获得了激光剑：按 I 展开或收回，按住 J 举剑攻击；可继续在轨道自由飞行，按 Q 自动返航。")
            : "全部危险陨石已清除。可继续在轨道自由飞行；按 Q 启动自动返航。",
        event.remaining > 0 ? 2.8 : 5.2,
      );
    } else if (event.type === "asteroidDestroyed") {
      awardOrbitalAsteroidReward();
    } else if (event.type === "crashed") {
      showDialogue(
        "史蒂夫",
        event.cause === "asteroid"
          ? "战机与陨石发生碰撞，机体已爆炸。本轮拦截失败。"
          : event.cause === "surface"
            ? "战机撞上火星地表实体，机体已爆炸。本轮拦截失败。"
            : "战机撞上火星地表，机体已爆炸。本轮拦截失败。",
        3.2,
      );
    } else if (event.type === "failed") {
      showDialogue("史蒂夫", "115 秒防御时限归零。危险陨石未能全部清除，本轮拦截失败。", 3.2);
    } else if (event.type === "returned") {
      document.body.classList.remove("is-orbital-defense");
      orbitalDefenseHud.setAttribute("aria-hidden", "true");
      orbitalRadar.hidden = true;
      if (event.crashed) resetPlayerToSpawn();
      playerRig.visual.visible = true;
      if (marsBaseRoot) marsBaseRoot.visible = true;
      camera.fov = 54;
      camera.updateProjectionMatrix();
      cameraDistance = DEFAULT_THIRD_PERSON_CAMERA_DISTANCE;
      orbitYawOffset = 0;
      pitch = 0.34;
      if (event.crashed) {
        const respawnTarget = player.position.clone().addScaledVector(playerNormal, 1.55);
        const respawnOffset = playerForward.clone()
          .multiplyScalar(-Math.cos(pitch) * cameraDistance)
          .addScaledVector(playerNormal, Math.sin(pitch) * cameraDistance + 2.4);
        camera.position.copy(respawnTarget).add(respawnOffset);
        camera.up.copy(playerNormal);
        camera.lookAt(respawnTarget);
      }
      keyState.clear();
      showDialogue(
        "ARES X-Wing",
        event.crashed
          ? "战机已毁。你已重新部署到基地重生点。"
          : orbitalDefense.completed
            ? "返航完成。战机已停回基地外环防御起降点。"
            : "返航完成。战机已重新装填，可再次出动。",
        3.2,
      );
    }
  }
  updateOrbitalDefenseHud();
}

function awardOrbitalDefenseReward() {
  scorePoints += 50;
  coins += 10;
  completedAnyTask = true;
  updateRewardReadouts();
  updatePlayerRank();
  pulseRewardReadout(scoreReadout, false);
  pulseRewardReadout(coinReadout, false);
  showRewardFloat(localizeText("+10 金币 · +50 积分"), false);
  playScoreRewardSound(4);
  playCoinDing();
}

function awardOrbitalAsteroidReward() {
  scorePoints += 50;
  completedAnyTask = true;
  updateRewardReadouts();
  updatePlayerRank();
  pulseRewardReadout(scoreReadout, false);
  showRewardFloat(localizeText("+50 积分"), false);
  playScoreRewardSound(3);
}

function updateOrbitalDefenseHud() {
  const visible = orbitalDefense.active;
  orbitalDefenseHud.classList.toggle("is-visible", visible);
  orbitalDefenseHud.classList.toggle("is-first-person", visible && orbitalDefense.firstPerson);
  orbitalDefenseHud.setAttribute("aria-hidden", String(!visible));
  if (!visible) {
    orbitalHeavyReadout.hidden = true;
    for (const bar of Array.from(orbitalHealthBars.children)) (bar as HTMLElement).hidden = true;
    return;
  }
  const phaseCopy: Record<typeof orbitalDefense.phase, string> = {
    idle: "待命",
    launch: "引擎点火 · 滑跑升空",
    combat: orbitalDefense.locked ? "目标已锁定" : orbitalDefense.aimCandidate ? "按 I 锁定" : "搜索撞击目标",
    patrol: "威胁已清除 · Q 返回地面",
    success: "威胁已清除",
    failed: "拦截失败",
    return: "自动返航",
  };
  orbitalTargetReadout.textContent = localizeText(phaseCopy[orbitalDefense.phase]);
  orbitalTargetReadout.classList.toggle("is-locked", orbitalDefense.locked);
  const heavyStatusVisible = orbitalDefense.phase === "combat"
    && (orbitalDefense.locked || orbitalDefense.aimCandidate || orbitalDefense.heavyLaserCooldown > 0);
  orbitalHeavyReadout.hidden = !heavyStatusVisible;
  if (heavyStatusVisible) {
    orbitalHeavyReadout.textContent = orbitalDefense.heavyLaserCooldown > 0
      ? isEnglish()
        ? `HIGH-ENERGY CHARGING ${orbitalDefense.heavyLaserCooldown.toFixed(1)}s`
        : `高能炮充能 ${orbitalDefense.heavyLaserCooldown.toFixed(1)}s`
      : orbitalDefense.locked
        ? localizeText("K 高能炮就绪")
        : localizeText("I 锁定目标");
  }
  orbitalThreatReadout.textContent = `${orbitalDefense.remainingThreats}/${orbitalDefense.totalThreats}`;
  orbitalTimeReadout.textContent = orbitalDefense.phase === "combat"
    ? `${Math.ceil(orbitalDefense.missionTimeRemaining)}s`
    : orbitalDefense.completed ? "∞" : "--";
  orbitalTimeReadout.classList.toggle("is-low", orbitalDefense.phase === "combat" && orbitalDefense.missionTimeRemaining <= 20);
  orbitalSpeedReadout.textContent = `${Math.round(orbitalDefense.speed)} u/s`;
  orbitalViewReadout.textContent = orbitalDefense.firstPerson ? "1P" : "3P";
  const radarVisible = orbitalDefense.phase === "combat" && orbitalDefense.remainingThreats > 0;
  orbitalRadar.hidden = !radarVisible;
  if (radarVisible) {
    orbitalRadarForward.set(0, 0, -1).applyQuaternion(orbitalDefense.ship.quaternion).normalize();
    orbitalRadarRight.set(1, 0, 0).applyQuaternion(orbitalDefense.ship.quaternion).normalize();
    const activeThreats = orbitalDefense.threats.filter((threat) => threat.visible);
    while (orbitalRadarThreats.children.length < activeThreats.length) {
      const marker = document.createElement("i");
      marker.className = "orbital-radar-threat";
      orbitalRadarThreats.appendChild(marker);
    }
    for (const [index, marker] of Array.from(orbitalRadarThreats.children).entries()) {
      const threat = activeThreats[index];
      const element = marker as HTMLElement;
      element.hidden = !threat;
      if (!threat) continue;
      orbitalRadarToThreat.copy(threat.position).sub(orbitalDefense.ship.position);
      const threatDistance = orbitalRadarToThreat.length();
      orbitalRadarToThreat.normalize();
      const bearing = Math.atan2(orbitalRadarToThreat.dot(orbitalRadarRight), orbitalRadarToThreat.dot(orbitalRadarForward));
      const distanceScale = THREE.MathUtils.clamp(threatDistance / 220, 0.35, 1);
      const radarRadius = Math.max(28, orbitalRadar.clientWidth * 0.38) * distanceScale;
      const radarX = Math.sin(bearing) * radarRadius;
      const radarY = -Math.cos(bearing) * radarRadius;
      element.style.transform = `translate(-50%, -50%) translate(${radarX.toFixed(1)}px, ${radarY.toFixed(1)}px)`;
    }
  } else {
    for (const marker of Array.from(orbitalRadarThreats.children)) (marker as HTMLElement).hidden = true;
  }
  updateOrbitalThreatHealthBars();
}

function updateOrbitalThreatHealthBars() {
  const visibleThreat = orbitalDefense.firstPerson && orbitalDefense.phase === "combat"
    ? orbitalDefense.healthTarget
    : null;
  while (orbitalHealthBars.children.length < 1) {
    const bar = document.createElement("div");
    bar.className = "orbital-integrity-bar";
    const track = document.createElement("span");
    const fill = document.createElement("i");
    track.appendChild(fill);
    bar.append(track);
    orbitalHealthBars.appendChild(bar);
  }
  for (const [index, node] of Array.from(orbitalHealthBars.children).entries()) {
    const threat = index === 0 ? visibleThreat : null;
    const element = node as HTMLElement;
    element.hidden = !threat;
    if (!threat) continue;
    orbitalHealthBarPosition.copy(threat.position).addScaledVector(camera.up, 7.6).project(camera);
    const onScreen = orbitalHealthBarPosition.z >= -1
      && orbitalHealthBarPosition.z <= 1
      && Math.abs(orbitalHealthBarPosition.x) <= 1.08
      && Math.abs(orbitalHealthBarPosition.y) <= 1.08;
    element.hidden = !onScreen;
    if (!onScreen) continue;
    element.style.left = `${(orbitalHealthBarPosition.x * 0.5 + 0.5) * 100}%`;
    element.style.top = `${(-orbitalHealthBarPosition.y * 0.5 + 0.5) * 100}%`;
    const integrity = Number(threat.userData.integrity ?? 8);
    const maxIntegrity = Math.max(1, Number(threat.userData.maxIntegrity ?? 8));
    const fill = element.querySelector<HTMLElement>("i");
    if (fill) fill.style.width = `${THREE.MathUtils.clamp(integrity / maxIntegrity, 0, 1) * 100}%`;
  }
}

function rescueFufu() {
  fufuRescued = true;
  activeFufu = false;
  fufuForward.copy(playerForward);
  fufuSideStep = "medical";
  awardTaskScore("side_fufu_rescue", "找到福福", SCORE_FUFU_RESCUE);
  showDialogue("福福", "喵。它从残骸保温层旁钻出来，绕着你的靴子转了一圈。史蒂夫标记：未登记小型生命体，请先执行医疗舱隔离扫描。生命支持系统同步福福体征后，氧气消耗降低25%。", 6.4);
  setCurrentMissionText();
}

function resetSuitOxygen() {
  suitOxygen = SUIT_OXYGEN_MAX;
  oxygenWarningShown = false;
}

function resetStamina() {
  stamina = STAMINA_MAX;
  staminaWarningShown = false;
}

function resetVitals() {
  resetSuitOxygen();
  resetStamina();
}

function resetRunUiAfterRespawn() {
  pendingSteveCall = null;
  introCallQueued = missionStep !== "intro";
  if (missionStep === "intro") gameStartElapsed = elapsedTime;
  hudCollapsed = false;
  messageUntil = 0;
  selectedInteractionIndex = 0;
  interactionChoiceOpen = false;
  interactionActions = [];
  interactionChoiceSignature = "";
  document.body.classList.remove("interaction-drawer-open");
  activeInteractable = null;
  activeElevator = null;
  activeHabitatDoor = null;
  activeGreenhouseDoor = null;
  activeRobot = null;
  activeFufu = false;
  activeFootball = false;
  activeRideRover = null;
  ridingRover = null;
  activeAtAt = false;
  ridingAtAt = false;
  resetDialogueState();
  closeMapUi();
  showControlsGuide(false);
  keyState.clear();
  resetStick();
  missionPanelOpen = false;
  missionUnread = false;
  clearMissionIntroTimer();
  document.body.classList.remove("hud-collapsed", "mission-panel-open");
  hudToggle.setAttribute("aria-pressed", "true");
  hudToggle.setAttribute("aria-label", "隐藏界面信息");
  missionToggle.classList.remove("has-mission-update");
  missionToggle.setAttribute("aria-pressed", "false");
  missionToggle.setAttribute("aria-label", tr("missionToggle.show"));
  promptBox.textContent = "";
  promptBox.classList.remove("is-visible");
  interactionChoice.classList.remove("is-visible");
  interactionChoice.setAttribute("aria-hidden", "true");
  dialogueBox.innerHTML = "";
  dialogueBox.classList.remove("is-visible");
  setCurrentMissionText();
}

function refillSuitOxygen(robot: THREE.Group) {
  resetSuitOxygen();
  const label = typeof robot.userData.label === "string" ? robot.userData.label : "维修机器人";
  showDialogue(label, "氧气已补满。剩余氧气 100%。", 2.2);
}

function currentSolarHeatStaminaMultiplier() {
  return solarHeatStaminaMultiplier > 1.01 ? solarHeatStaminaMultiplier : 1;
}

function warnAndHandleVitalFailure() {
  if (stamina <= STAMINA_LOW_THRESHOLD && !staminaWarningShown) {
    staminaWarningShown = true;
    showDialogue("生命维持", "体能低于 20%。回到居住舱休整即可恢复。", 4);
  }
  if (suitOxygen <= 0) respawnAfterOxygenDepleted();
  else if (stamina <= 0) respawnAfterStaminaDepleted();
}

function updateSuitOxygen(delta: number) {
  if (!started || wormholeFall) return;
  const solarHeatMultiplier = currentSolarHeatStaminaMultiplier();
  const solarHeatActive = solarHeatMultiplier > 1;
  const vitalsPaused = dialogueOpen || world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator || ridingRover || ridingAtAt;
  if (vitalsPaused) {
    if (solarHeatActive) {
      stamina = Math.max(0, stamina - STAMINA_WALK_DRAIN_PER_SECOND * solarHeatMultiplier * delta);
      warnAndHandleVitalFailure();
    }
    return;
  }
  const moving = playerVelocity.length() > 0.6;
  const sprinting = moving && (keyState.has("ShiftLeft") || keyState.has("ShiftRight"));
  const fufuOxygenBonus = fufuRescued ? FUFU_OXYGEN_DRAIN_MULTIPLIER : 1;
  const oxygenDrain = SUIT_OXYGEN_WALK_DRAIN_PER_SECOND * (sprinting ? SUIT_OXYGEN_SPRINT_MULTIPLIER : 1) * fufuOxygenBonus;
  suitOxygen = Math.max(0, suitOxygen - oxygenDrain * delta);
  if (moving) {
    const staminaDrain = !grounded ? STAMINA_JUMP_DRAIN_PER_SECOND : sprinting ? STAMINA_SPRINT_DRAIN_PER_SECOND : STAMINA_WALK_DRAIN_PER_SECOND;
    stamina = Math.max(0, stamina - staminaDrain * solarHeatMultiplier * delta);
  } else if (solarHeatActive) {
    stamina = Math.max(0, stamina - STAMINA_WALK_DRAIN_PER_SECOND * solarHeatMultiplier * delta);
  } else if (grounded) {
    stamina = Math.min(STAMINA_MAX, stamina + STAMINA_STAND_RECOVERY_PER_SECOND * delta);
    if (stamina > STAMINA_LOW_THRESHOLD + 5) staminaWarningShown = false;
  }
  if (suitOxygen <= SUIT_OXYGEN_WARNING_THRESHOLD && !oxygenWarningShown) {
    oxygenWarningShown = true;
    showDialogue("生命维持", "氧气背包低于 20%。寻找补给点更换。", 4);
  }
  warnAndHandleVitalFailure();
}

function respawnAfterOxygenDepleted() {
  resetVitals();
  resetPlayerToSpawn();
  resetRunUiAfterRespawn();
  showDialogue("生命维持", "氧气耗尽。已从出发点重新同步。", 4);
}

function respawnAfterStaminaDepleted() {
  resetVitals();
  respawnInsideHabitat();
  resetRunUiAfterRespawn();
  showDialogue("生命维持", "体能耗尽。已在居住舱内重新同步，体能和氧气已恢复。", 4);
}

function findActiveHabitatDoor() {
  const door = world.habitatDoor;
  if (door.occupied) {
    const localPlayer = door.root.worldToLocal(player.position.clone());
    return localPlayer.z < -1.12 && Math.abs(localPlayer.x) < 1.34 ? door : null;
  }
  const doorWorld = door.root.localToWorld(new THREE.Vector3(0, -0.48, -2.76));
  const distance = doorWorld.distanceTo(player.position);
  return distance < door.promptRadius ? door : null;
}

function isNearHabitatPhotoWall() {
  if (!world.habitatDoor.occupied) return false;
  const localPlayer = world.habitatDoor.root.worldToLocal(player.position.clone());
  return localPlayer.x > 3.75 && Math.abs(localPlayer.z) < 1.55;
}

function findActiveRobot() {
  if (!started || world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator || ridingRover || ridingAtAt) return null;
  let nearestRobot: THREE.Group | null = null;
  let nearestDistance = Infinity;
  const robotPosition = new THREE.Vector3();
  for (const rover of world.rovers) {
    if (rover.userData.kind !== "bot") continue;
    if (hasTalkedToRobot(rover)) continue;
    rover.getWorldPosition(robotPosition);
    const distance = robotPosition.distanceTo(player.position);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestRobot = rover;
    }
  }
  return nearestRobot && nearestDistance < 2.35 ? nearestRobot : null;
}

function robotConversationId(robot: THREE.Group) {
  return typeof robot.userData.label === "string" ? robot.userData.label : robot.uuid;
}

function hasTalkedToRobot(robot: THREE.Group) {
  return talkedRobotIds.has(robotConversationId(robot));
}

function markRobotTalked(robot: THREE.Group) {
  talkedRobotIds.add(robotConversationId(robot));
}

function findActiveRideRover() {
  if (!started || wormholeFall || dialogueOpen || world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator || isFlightActive()) return null;
  if (ridingRover) return ridingRover;
  let nearestRover: THREE.Group | null = null;
  let nearestDistance = Infinity;
  const roverPosition = new THREE.Vector3();
  for (const rover of world.rovers) {
    if (!isRideableRover(rover)) continue;
    rover.getWorldPosition(roverPosition);
    const distance = roverPosition.distanceTo(player.position);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestRover = rover;
    }
  }
  return nearestRover && nearestDistance < ROVER_RIDE_PROMPT_RADIUS ? nearestRover : null;
}

function isRideableRover(rover: THREE.Group) {
  return rover.userData.kind === "rover" || rover.userData.kind === "cargo";
}

function enterRoverRide(rover: THREE.Group) {
  if (!isRideableRover(rover)) return;
  if (coins < ROVER_RIDE_COST_COINS) {
    showDialogue("车辆", "金币不足，搭便车需要 10 个金币。", 2.4);
    pulseRewardReadout(coinReadout, true);
    playPenaltySound();
    return;
  }
  if (footballCarried) dropFootball(false);
  if (!spendCoins(ROVER_RIDE_COST_COINS)) return;
  awardRepeatableScore(SCORE_ROVER_RIDE, localizeText("搭便车"));
  ridingRover = rover;
  activeRideRover = rover;
  resetVitals();
  exitFrontCamera = null;
  cameraMode = false;
  scaleGunAiming = false;
  disableActiveJetpackForRespawn();
  playerVelocity.set(0, 0, 0);
  playerAltitudeOffset = 0;
  verticalVelocity = 0;
  grounded = true;
  setFirstPersonCamera();
  updateRoverRide(rover, 0);
  closeTouchInteractionDrawer();
  interactionChoiceOpen = false;
  showDialogue("车辆", "已支付 10 金币搭上巡检车辆。乘车期间不消耗氧气和体能，按 Q 可随时下车。", 3.2);
}

function exitRoverRide() {
  if (!ridingRover) return;
  const rover = ridingRover;
  const roverNormal = new THREE.Vector3();
  rover.getWorldPosition(roverNormal).normalize();
  const roverRight = new THREE.Vector3(1, 0, 0).transformDirection(rover.matrixWorld).projectOnPlane(roverNormal);
  if (roverRight.lengthSq() < 0.000001) roverRight.copy(playerForward).cross(roverNormal).projectOnPlane(roverNormal);
  roverRight.normalize();
  const exitNormal = roverNormal.clone().addScaledVector(roverRight, ROVER_RIDE_EXIT_DISTANCE / PLANET_RADIUS).normalize();
  const roverForward = new THREE.Vector3(0, 0, -1).transformDirection(rover.matrixWorld).projectOnPlane(exitNormal);
  ridingRover = null;
  activeRideRover = null;
  playerNormal.copy(exitNormal);
  if (roverForward.lengthSq() > 0.000001) playerForward.copy(roverForward.normalize());
  playerVelocity.set(0, 0, 0);
  playerAltitudeOffset = 0;
  verticalVelocity = 0;
  grounded = true;
  cameraDistance = Math.max(cameraDistance, DEFAULT_THIRD_PERSON_CAMERA_DISTANCE);
  pitch = 0.34;
  orbitYawOffset = 0;
  playerRig.visual.visible = true;
  placePlayerOnPlanet();
  showDialogue("车辆", "已下车。", 1.8);
}

function updateRoverRide(rover: THREE.Group, delta = 0) {
  if (!rover.parent || !isRideableRover(rover)) {
    ridingRover = null;
    activeRideRover = null;
    placePlayerOnPlanet();
    return 0;
  }
  const size = typeof rover.userData.size === "number" ? rover.userData.size : 1;
  const seatWorld = rover.localToWorld(new THREE.Vector3(0, ROVER_RIDE_SEAT_HEIGHT * size, -0.34 * size));
  const roverUp = new THREE.Vector3(0, 1, 0).transformDirection(rover.matrixWorld).normalize();
  const roverForward = new THREE.Vector3(0, 0, -1).transformDirection(rover.matrixWorld).projectOnPlane(roverUp);
  player.position.copy(seatWorld);
  playerNormal.copy(roverUp);
  let fallbackForward = roverForward.lengthSq() > 0.000001 ? roverForward.normalize() : new THREE.Vector3(0, 0, -1).projectOnPlane(roverUp);
  if (fallbackForward.lengthSq() < 0.000001) fallbackForward = new THREE.Vector3(1, 0, 0).projectOnPlane(roverUp);
  fallbackForward.normalize();
  playerForward.projectOnPlane(playerNormal);
  if (playerForward.lengthSq() < 0.000001) playerForward.copy(fallbackForward);
  else playerForward.normalize();
  if (scaleGunAiming) {
    updateScaleGunAimInput(delta);
  } else {
    updateRoverPassengerLook(delta);
  }
  player.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), playerNormal);
  player.rotateY(headingFromForward(playerNormal, playerForward));
  playerVelocity.set(0, 0, 0);
  playerAltitudeOffset = 0;
  verticalVelocity = 0;
  grounded = true;
  return 0;
}

function updateRoverPassengerLook(delta: number) {
  let turnInput = 0;
  if (keyState.has("KeyA") || keyState.has("ArrowLeft")) turnInput += 1;
  if (keyState.has("KeyD") || keyState.has("ArrowRight")) turnInput -= 1;
  if (Math.abs(turnInput) > 0.001) {
    playerForward.applyAxisAngle(playerNormal, turnInput * 1.35 * delta).projectOnPlane(playerNormal).normalize();
  }
  if (cameraMode) return;
  let pitchInput = 0;
  if (keyState.has("KeyW") || keyState.has("ArrowUp")) pitchInput += 1;
  if (keyState.has("KeyS") || keyState.has("ArrowDown")) pitchInput -= 1;
  if (Math.abs(pitchInput) > 0.001) {
    pitch = THREE.MathUtils.clamp(pitch + pitchInput * 0.72 * delta, 0.12, 0.92);
  }
}

function resetAtAtForRun() {
  const atAt = world.atAt;
  resetAtAtPose(atAt);
  atAt.normal.copy(planetNormal(AT_AT_SPAWN_X, AT_AT_SPAWN_Z));
  placeObjectOnPlanetNormal(atAt.group, atAt.normal, 0, 0.48);
  atAt.forward
    .set(0, 0, -1)
    .applyQuaternion(atAt.group.quaternion)
    .projectOnPlane(atAt.normal)
    .normalize();
  atAt.group.userData.planetX = AT_AT_SPAWN_X;
  atAt.group.userData.planetZ = AT_AT_SPAWN_Z;
  atAtFirstPerson = true;
}

function findActiveAtAt() {
  if (!started || wormholeFall || dialogueOpen || world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator || ridingRover || isFlightActive()) return false;
  if (ridingAtAt) return true;
  const boardingPosition = world.atAt.boardingAnchor.getWorldPosition(new THREE.Vector3());
  return boardingPosition.distanceTo(player.position) < AT_AT_PROMPT_RADIUS;
}

function enterAtAtRide() {
  if (ridingAtAt) return;
  const entryStatus = atAtEntryStatus(scorePoints, coins);
  if (entryStatus === "score") {
    showDialogue("AT-AT", "驾驶权限不足，需要达到 500 经验。", 3.2);
    pulseRewardReadout(scoreReadout, true);
    playPenaltySound();
    return;
  }
  if (entryStatus === "coins") {
    showDialogue("AT-AT", "金币不足，本次驾驶需要 100 金币。", 3.2);
    pulseRewardReadout(coinReadout, true);
    playPenaltySound();
    return;
  }
  if (!spendCoins(AT_AT_RIDE_COST_COINS)) return;
  if (footballCarried) dropFootball(false);
  ridingAtAt = true;
  activeAtAt = true;
  atAtFirstPerson = true;
  activeRideRover = null;
  cameraMode = false;
  scaleGunAiming = false;
  laserSwordActive = false;
  laserSwordRaised = false;
  disableActiveJetpackForRespawn();
  playerVelocity.set(0, 0, 0);
  playerAltitudeOffset = 0;
  verticalVelocity = 0;
  grounded = true;
  cameraDistance = CAMERA_MIN_DISTANCE;
  orbitYawOffset = 0;
  pitch = 0.34;
  atAtExitPromptUntil = elapsedTime + 5;
  camera.fov = 54;
  camera.updateProjectionMatrix();
  updateAtAtDriverTransform();
  playerRig.visual.visible = false;
  closeTouchInteractionDrawer();
  interactionChoiceOpen = false;
  updateMobileFlightButtons();
  showDialogue("AT-AT", "已支付 100 金币进入驾驶舱。W/S 行进，A/D 转向，Shift 快速行进，C 切换视角，Q 下车。", 5.2);
}

function exitAtAtRide() {
  if (!ridingAtAt) return;
  world.atAt.speed = 0;
  const exitNormal = findSafeAtAtExitNormal();
  ridingAtAt = false;
  activeAtAt = false;
  atAtFirstPerson = true;
  playerNormal.copy(exitNormal);
  playerForward.copy(world.atAt.forward).projectOnPlane(playerNormal).normalize();
  playerVelocity.set(0, 0, 0);
  playerAltitudeOffset = 0;
  verticalVelocity = 0;
  grounded = true;
  cameraDistance = DEFAULT_THIRD_PERSON_CAMERA_DISTANCE;
  orbitYawOffset = 0;
  pitch = 0.34;
  playerRig.visual.visible = true;
  placePlayerOnPlanet();
  updateMobileFlightButtons();
  atAtExitPromptUntil = -Infinity;
  showDialogue("AT-AT", "已离开 AT-AT。再次驾驶仍需支付 100 金币。", 5);
}

function findSafeAtAtExitNormal() {
  for (const anchor of world.atAt.exitAnchors) {
    const candidate = anchor.getWorldPosition(new THREE.Vector3()).normalize();
    if (isAtAtExitNormalSafe(candidate)) return candidate;
  }
  const side = world.atAt.forward.clone().cross(world.atAt.normal).normalize();
  return world.atAt.normal.clone().addScaledVector(side, 9 / PLANET_RADIUS).normalize();
}

function isAtAtExitNormalSafe(candidate: THREE.Vector3) {
  for (const collider of world.colliders) {
    if (collider.label.startsWith("AT-AT") || collider.label === "红色岩石") continue;
    if (collider.enabled && !collider.enabled()) continue;
    const colliderNormal = normalForCollider(collider, new THREE.Vector3());
    if (surfaceDistanceBetween(candidate, colliderNormal) < collider.radius + 0.8) return false;
  }
  return true;
}

function updateAtAtDrive(delta: number) {
  const atAt = world.atAt;
  const { turnInput, forwardInput } = readMovementInput();
  const fast = keyState.has("ShiftLeft") || keyState.has("ShiftRight");
  const forwardSpeed = fast ? AT_AT_FAST_SPEED : AT_AT_WALK_SPEED;
  const targetSpeed = forwardInput >= 0 ? forwardInput * forwardSpeed : forwardInput * AT_AT_REVERSE_SPEED;
  const response = Math.abs(targetSpeed) > Math.abs(atAt.speed) ? 1.55 : 2.45;
  atAt.speed = THREE.MathUtils.lerp(atAt.speed, targetSpeed, 1 - Math.pow(0.02, delta * response));
  if (Math.abs(targetSpeed) < 0.02 && Math.abs(atAt.speed) < 0.04) atAt.speed = 0;

  const movingRatio = THREE.MathUtils.clamp(Math.abs(atAt.speed) / AT_AT_WALK_SPEED, 0, 1);
  if (Math.abs(turnInput) > 0.001 && movingRatio > 0.04) {
    const reverseTurn = atAt.speed < 0 ? -0.62 : 1;
    const turnRate = fast ? 0.22 : 0.32;
    atAt.forward
      .applyAxisAngle(atAt.normal, turnInput * turnRate * reverseTurn * movingRatio * delta)
      .projectOnPlane(atAt.normal)
      .normalize();
  }

  const previousNormal = atAt.normal.clone();
  const angularDistance = Math.abs(atAt.speed) * delta / PLANET_RADIUS;
  if (angularDistance > 0.000001) {
    const direction = atAt.forward.clone().multiplyScalar(Math.sign(atAt.speed));
    atAt.normal.addScaledVector(direction, angularDistance).normalize();
    atAt.forward.projectOnPlane(atAt.normal).normalize();
    resolveAtAtMovementCollision(previousNormal);
  }

  placeObjectOnPlanetNormal(atAt.group, atAt.normal, 0, headingFromForward(atAt.normal, atAt.forward));
  const projectedY = Math.max(Math.abs(atAt.normal.y), 0.001);
  atAt.group.userData.planetX = (atAt.normal.x / projectedY) * PLANET_RADIUS;
  atAt.group.userData.planetZ = (atAt.normal.z / projectedY) * PLANET_RADIUS;
  updateAtAtDriverTransform();
  return Math.abs(atAt.speed);
}

function resolveAtAtMovementCollision(previousNormal: THREE.Vector3) {
  const atAt = world.atAt;
  for (const collider of world.colliders) {
    if (collider.label.startsWith("AT-AT") || collider.label === "红色岩石" || collider.label === "暗面蜘蛛") continue;
    if (collider.enabled && !collider.enabled()) continue;
    const colliderNormal = normalForCollider(collider, new THREE.Vector3());
    const minDistance = atAt.collisionRadius + collider.radius;
    if (surfaceDistanceBetween(atAt.normal, colliderNormal) >= minDistance) continue;
    atAt.normal.copy(previousNormal);
    atAt.forward.projectOnPlane(atAt.normal).normalize();
    atAt.speed = 0;
    return;
  }
}

function updateAtAtDriverTransform() {
  const atAt = world.atAt;
  player.position.copy(atAt.cockpitAnchor.getWorldPosition(new THREE.Vector3()));
  playerNormal.copy(atAt.normal);
  playerForward.copy(atAt.forward).projectOnPlane(playerNormal).normalize();
  player.quaternion.copy(atAt.group.getWorldQuaternion(new THREE.Quaternion()));
  playerVelocity.copy(atAt.forward).multiplyScalar(atAt.speed);
  playerAltitudeOffset = 0;
  verticalVelocity = 0;
  grounded = true;
}

function updateAtAtCamera(delta: number) {
  world.root.visible = true;
  const atAt = world.atAt;
  const normal = atAt.normal;
  const lookForward = atAt.forward.clone().applyAxisAngle(normal, orbitYawOffset).projectOnPlane(normal).normalize();
  const pitchOffset = THREE.MathUtils.clamp(pitch - 0.34, -0.18, 0.28);
  const atAtLookPitch = atAtFirstPerson ? Math.min(-0.16, pitchOffset - 0.16) : pitchOffset;
  const lookDirection = lookForward.clone().multiplyScalar(Math.cos(atAtLookPitch)).addScaledVector(normal, Math.sin(atAtLookPitch)).normalize();
  if (atAtFirstPerson) {
    atAt.cockpitObstruction.visible = false;
    const eye = atAt.cockpitAnchor.getWorldPosition(new THREE.Vector3()).addScaledVector(normal, 0.08);
    camera.position.lerp(eye, 1 - Math.pow(0.00001, delta));
    camera.up.copy(normal);
    camera.lookAt(eye.clone().addScaledVector(lookDirection, 80));
    return;
  }
  atAt.cockpitObstruction.visible = true;
  const target = atAt.group.position.clone().addScaledVector(normal, 15.2).addScaledVector(atAt.forward, 3.5);
  const cameraSide = atAt.forward.clone().cross(normal).normalize();
  const desired = target.clone().addScaledVector(atAt.forward, -29).addScaledVector(cameraSide, 21).addScaledVector(normal, 8.2);
  camera.position.lerp(desired, 1 - Math.pow(0.00004, delta));
  camera.up.copy(normal);
  camera.lookAt(target);
}

function findActiveGreenhouseDoor() {
  const door = world.greenhouseDoor;
  if (insideGreenhouse) {
    const local = door.root.worldToLocal(player.position.clone());
    return local.z < -2.35 ? door : null;
  }
  const doorWorld = door.root.localToWorld(new THREE.Vector3(0, 0.62, -4.55));
  const distance = doorWorld.distanceTo(player.position);
  return distance < door.promptRadius ? door : null;
}

function openHabitatDoor(door: HabitatDoorControl) {
  if (door.occupied) {
    exitHabitatDoor(door);
    return;
  }
  enterHabitatInterior(door);
}

function isInsideHabitat() {
  if (!world.habitatDoor.occupied && !world.habitatDoor.open) return false;
  const local = world.habitatDoor.root.worldToLocal(player.position.clone());
  return Math.abs(local.x) < 5.7 && local.z > -2.25 && local.z < 2.35;
}

function updateHabitatOccupancy() {
  return;
}

function enterHabitatInterior(door: HabitatDoorControl) {
  exitFrontCamera = null;
  door.occupied = true;
  door.open = false;
  door.doorPanels.visible = true;
  door.exteriorMask.visible = true;
  door.interiorPortal.visible = false;
  door.interiorDoor.visible = true;
  door.interiorScene.visible = true;
  door.interiorLight.visible = true;
  setHabitatInteriorMode(true);
  habitatLocal.set(0, -0.76, -1.46);
  player.position.copy(door.root.localToWorld(habitatLocal.clone()));
  // Entering from outside usually leaves the avatar facing the sealed door.
  // Re-orient the indoor camera toward the habitat aisle so the first view is
  // the room and its sleep pods, never the skybox through the doorway.
  playerNormal.copy(new THREE.Vector3(0, 1, 0).transformDirection(door.root.matrixWorld).normalize());
  const inward = door.root.localToWorld(new THREE.Vector3(0, -0.76, -0.4)).sub(player.position).projectOnPlane(playerNormal);
  if (inward.lengthSq() > 0.0001) playerForward.copy(inward.normalize());
  resetVitals();
  cameraDistance = Math.min(cameraDistance, 0.72);
  pitch = 0.34;
  orbitYawOffset = 0;
  if (!maybeAdvanceHabitatQuestOnEntry()) {
    showDialogue("史蒂夫", "022号巡检员，已进入 01 建筑居住舱。环境安全，氧气背包和体能已恢复。先把生活模块做成真正可靠的第一屏。", 4.4);
  }
}

function maybeAdvanceHabitatQuestOnEntry() {
  if (!isActiveMissionInteractable("habitatCheck")) return false;
  advanceWorldQuest("habitatCheck");
  return true;
}

function setHabitatDoorExteriorOpen(door: HabitatDoorControl) {
  door.open = true;
  door.doorPanels.visible = false;
  door.exteriorMask.visible = false;
  door.interiorPortal.visible = true;
  door.interiorDoor.visible = false;
  door.interiorScene.visible = false;
  door.interiorLight.visible = true;
}

function exitHabitatDoor(door: HabitatDoorControl) {
  door.occupied = false;
  door.open = false;
  habitatLocal.set(0, -0.76, -1.55);
  door.doorPanels.visible = true;
  door.exteriorMask.visible = true;
  door.interiorPortal.visible = false;
  door.interiorDoor.visible = false;
  door.interiorScene.visible = false;
  door.interiorLight.visible = false;
  setHabitatInteriorMode(false);
  resetVitals();
  const exitWorld = door.root.localToWorld(new THREE.Vector3(0, -0.18, -6.85));
  playerNormal.copy(exitWorld.normalize());
  const faceAway = door.root.localToWorld(new THREE.Vector3(0, -0.18, -8.2)).normalize().sub(playerNormal).projectOnPlane(playerNormal).normalize();
  if (faceAway.lengthSq() > 0.0001) playerForward.copy(faceAway);
  cameraDistance = Math.max(cameraDistance, DEFAULT_THIRD_PERSON_CAMERA_DISTANCE);
  playerRig.visual.visible = true;
  placePlayerOnPlanet();
  startExitFrontCamera(player.position, 15, 1.8, DEFAULT_THIRD_PERSON_CAMERA_DISTANCE, "rear");
  showDialogue("居住舱", "外舱门已打开。氧气背包与体能 100%。", 2.8);
}

function enterGreenhouse(door: GreenhouseDoorControl) {
  exitFrontCamera = null;
  insideGreenhouse = true;
  door.occupied = true;
  resetVitals();
  door.doorPanels.visible = true;
  door.interiorLight.visible = true;
  greenhouseLocal.set(0, 0.62, -2.62);
  player.position.copy(door.root.localToWorld(greenhouseLocal.clone()));
  playerNormal.copy(new THREE.Vector3(0, 1, 0).transformDirection(door.root.matrixWorld).normalize());
  const inward = door.root.localToWorld(new THREE.Vector3(0, 0.62, -1.6)).sub(player.position).projectOnPlane(playerNormal);
  if (inward.lengthSq() > 0.0001) playerForward.copy(inward.normalize());
  cameraDistance = Math.min(cameraDistance, 0.72);
  pitch = 0.34;
  orbitYawOffset = 0;
  showDialogue("史蒂夫", "022号巡检员，已进入 02 建筑温室生态舱。检查舱压与水培床状态。这里不是装饰品，是基地变成生活的证据。", 4.8);
}

function exitGreenhouse(door: GreenhouseDoorControl) {
  insideGreenhouse = false;
  door.occupied = false;
  greenhouseLocal.set(0, 0.62, -2.62);
  const exitWorld = door.root.localToWorld(new THREE.Vector3(0, 0.28, -5.08));
  playerNormal.copy(exitWorld.normalize());
  const faceAway = door.root.localToWorld(new THREE.Vector3(0, 0.28, -6.0)).normalize().sub(playerNormal).projectOnPlane(playerNormal).normalize();
  if (faceAway.lengthSq() > 0.0001) playerForward.copy(faceAway);
  cameraDistance = Math.max(cameraDistance, DEFAULT_THIRD_PERSON_CAMERA_DISTANCE);
  playerRig.visual.visible = true;
  placePlayerOnPlanet();
  startExitFrontCamera(exitWorld, 16);
  showDialogue("史蒂夫", "022号巡检员，温室外舱门已重新密封。很好，边界干净。", 3.6);
}

function setHabitatInteriorMode(active: boolean) {
  if (!active) {
    habitatHiddenObjects.forEach((visible, object) => {
      object.visible = visible;
    });
    habitatHiddenObjects.clear();
    return;
  }
  if (habitatHiddenObjects.size > 0) return;

  const habitat = world.habitatDoor.root;
  const base = habitat.parent;
  for (const object of scene.children) {
    if (object === player || object instanceof THREE.Light) continue;
    if (object === base) {
      for (const child of object.children) {
        if (child === habitat) continue;
        habitatHiddenObjects.set(child, child.visible);
        child.visible = false;
      }
      continue;
    }
    habitatHiddenObjects.set(object, object.visible);
    object.visible = false;
  }
}

function findActiveElevator() {
  if (ridingElevator) return ridingElevator;

  let nearest: ElevatorControl | null = null;
  let nearestDistance = Infinity;
  for (const elevator of world.elevators) {
    const carWorld = new THREE.Vector3();
    const carScale = new THREE.Vector3();
    elevator.car.getWorldPosition(carWorld);
    elevator.car.getWorldScale(carScale);
    const distance = carWorld.distanceTo(player.position);
    const radius = elevator.radius * Math.max(carScale.x, carScale.z) + 0.9;
    if (distance < radius && distance < nearestDistance) {
      nearest = elevator;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function elevatorPrompt(elevator: ElevatorControl) {
  if (insideRocket) return "按 E 离开飞船内舱";
  if (isAtRocketHatch()) return "按 E 进入飞船内部观察";
  if (elevator.moving) return `${elevator.label}运行中`;
  return elevator.target === "top" ? "按 E 乘坐升降梯" : "按 E 启动飞船升降梯";
}

function toggleElevator(elevator: ElevatorControl) {
  if (elevator.moving) return;
  const scale = new THREE.Vector3();
  elevator.car.getWorldScale(scale);
  elevatorRideLocal.set(0, getElevatorPlayerLocalY(elevator, scale), 0);
  ridingElevator = elevator;
  elevator.target = elevator.target === "top" ? "bottom" : "top";
  elevator.moving = true;
  playerVelocity.set(0, 0, 0);
  if (elevator.target === "bottom") {
    insideRocket = false;
    rocketDoorOpen = false;
    setRocketInteriorMode(false);
    setRocketDoorVisual(false);
  }
  showDialogue("飞船升降梯", elevator.target === "top" ? "升降梯上行，前往飞船舱门。" : "升降梯下行，返回地面。", 3.4);
}

function isAtRocketHatch() {
  if (!ridingElevator || activeElevator !== ridingElevator) return false;
  if (ridingElevator.moving || ridingElevator.target !== "top") return false;
  return elevatorRideLocal.x >= ROCKET_PLATFORM_SPLIT_X;
}

function openElonDialogue() {
  if (!elonMet) {
    elonMet = true;
    const elonLandmark = world.landmarks.find((landmark) => landmark.label.includes("埃隆") || landmark.label.toLowerCase().includes("elon"));
    if (elonLandmark) awardHiddenDiscovery(`unknown:${elonLandmark.label}`, elonLandmark.label);
    openDialogueScene("elon", "elon_intro_1");
    return;
  }
  const node = elonDialogueCycle[elonDialogueIndex % elonDialogueCycle.length];
  elonDialogueIndex += 1;
  openDialogueScene("elon", node);
}

function missionLabel(id: Interactable["id"]) {
  const item = world.interactables.find((interactable) => interactable.id === id);
  return item?.label ?? id;
}

function openRocketDoor() {
  rocketDoorOpen = true;
  setRocketDoorVisual(true);
  showDialogue("登陆飞船", "飞船舱门已开启。可以进入内舱检查生命维持系统。", 3.8);
}

function enterRocketInterior() {
  if (!ridingElevator) return;
  elevatorRideLocal.x = ROCKET_HATCH_STOP_X;
  elevatorRideLocal.z = 0;
  exitFrontCamera = null;
  insideRocket = true;
  rocketDoorOpen = true;
  setRocketDoorVisual(true, true);
  setRocketInteriorMode(true, ridingElevator);
  placePlayerInRocketInterior(ridingElevator);
  cameraDistance = CAMERA_MIN_DISTANCE;
  camera.fov = 84;
  camera.updateProjectionMatrix();
  pitch = 0.3;
  orbitYawOffset = 0;
  showDialogue("登陆飞船", "已进入飞船内舱。", 2.8);
}

function exitRocketInterior() {
  insideRocket = false;
  rocketDoorOpen = false;
  setRocketInteriorMode(false);
  setRocketDoorVisual(false);
  if (ridingElevator) {
    elevatorRideLocal.x = ROCKET_HATCH_STOP_X - 0.1;
    elevatorRideLocal.z = 0;
    alignPlayerWithElevator(ridingElevator, -1);
    placePlayerOnElevator(ridingElevator);
    const hatchWorld = ridingElevator.car.localToWorld(elevatorRideLocal.clone());
    startExitFrontCamera(hatchWorld, 12);
  }
  cameraDistance = Math.max(cameraDistance, DEFAULT_THIRD_PERSON_CAMERA_DISTANCE);
  camera.fov = 54;
  camera.updateProjectionMatrix();
  pitch = 0.34;
  orbitYawOffset = 0;
  playerRig.visual.visible = true;
  showDialogue("登陆飞船", "已离开飞船内舱。", 2.8);
}

function setRocketDoorVisual(open: boolean, showInterior = open, targetElevator: ElevatorControl | null = ridingElevator ?? activeElevator) {
  for (const elevator of world.elevators) {
    const selected = !targetElevator || elevator === targetElevator;
    const doorOpen = selected && open;
    const interiorVisible = selected && showInterior;
    if (elevator.rocketDoorPanel) elevator.rocketDoorPanel.visible = !doorOpen;
    if (elevator.rocketDoorPortal) elevator.rocketDoorPortal.visible = doorOpen;
    if (elevator.rocketInterior) elevator.rocketInterior.visible = interiorVisible;
    if (elevator.rocketInteriorLight) elevator.rocketInteriorLight.visible = interiorVisible;
    if (elevator.rocketInteriorFillLight) elevator.rocketInteriorFillLight.visible = interiorVisible;
  }
}

function setRocketInteriorMode(active: boolean, elevator?: ElevatorControl | null) {
  if (!active) {
    rocketHiddenObjects.forEach((visible, object) => {
      object.visible = visible;
    });
    rocketHiddenObjects.clear();
    return;
  }
  if (rocketHiddenObjects.size > 0 || !elevator?.rocketInterior) return;

  const interior = elevator.rocketInterior;
  const lander = interior.parent;
  const base = lander?.parent;

  for (const object of scene.children) {
    if (object === player || object instanceof THREE.Light || object === base) continue;
    rocketHiddenObjects.set(object, object.visible);
    object.visible = false;
  }

  if (base) {
    for (const child of base.children) {
      if (child === lander) continue;
      rocketHiddenObjects.set(child, child.visible);
      child.visible = false;
    }
  }

  if (lander) {
    for (const child of lander.children) {
      if (child === interior) continue;
      rocketHiddenObjects.set(child, child.visible);
      child.visible = false;
    }
  }

  interior.visible = true;
  if (elevator.rocketInteriorLight) elevator.rocketInteriorLight.visible = true;
  if (elevator.rocketInteriorFillLight) elevator.rocketInteriorFillLight.visible = true;
}

function placePlayerInRocketInterior(elevator: ElevatorControl) {
  if (!elevator.rocketInterior) {
    placePlayerOnElevator(elevator);
    return;
  }
  const interior = elevator.rocketInterior;
  const floorY = elevator.rocketInteriorFloorY ?? 9.41;
  const localFeet = new THREE.Vector3(0, floorY + PLAYER_ALTITUDE, -2.42);
  const localForward = new THREE.Vector3(0, floorY + PLAYER_ALTITUDE, 1.62);
  const worldFeet = interior.localToWorld(localFeet);
  const worldForward = interior.localToWorld(localForward);
  playerNormal.copy(new THREE.Vector3(0, 1, 0).transformDirection(interior.matrixWorld).normalize());
  const forward = worldForward.sub(worldFeet).projectOnPlane(playerNormal);
  if (forward.lengthSq() > 0.0001) playerForward.copy(forward.normalize());
  player.position.copy(worldFeet);
  player.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), playerNormal);
  player.rotateY(headingFromForward(playerNormal, playerForward));
  grounded = true;
  playerAltitudeOffset = 0;
  verticalVelocity = 0;
}

function alignPlayerWithElevator(elevator: ElevatorControl, localXDirection: 1 | -1) {
  const origin = elevator.car.localToWorld(new THREE.Vector3(0, 0, 0));
  const target = elevator.car.localToWorld(new THREE.Vector3(localXDirection, 0, 0));
  const forward = target.sub(origin).projectOnPlane(playerNormal);
  if (forward.lengthSq() > 0.0001) playerForward.copy(forward.normalize());
}

function placePlayerOnElevator(elevator: ElevatorControl) {
  const scale = new THREE.Vector3();
  elevator.car.getWorldScale(scale);
  elevatorRideLocal.y = getElevatorPlayerLocalY(elevator, scale);
  const worldPosition = elevator.car.localToWorld(elevatorRideLocal.clone());
  const up = new THREE.Vector3(0, 1, 0).transformDirection(elevator.car.matrixWorld).normalize();
  playerNormal.copy(up);
  playerForward.projectOnPlane(playerNormal).normalize();
  player.position.copy(worldPosition);
  player.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), playerNormal);
  player.rotateY(headingFromForward(playerNormal, playerForward));

  if (!elevator.moving && elevator.target === "bottom") {
    ridingElevator = null;
    playerNormal.copy(player.position.clone().normalize());
    playerForward.projectOnPlane(playerNormal).normalize();
    placePlayerOnPlanet();
  }
}

function getElevatorPlayerLocalY(elevator: ElevatorControl, worldScale = new THREE.Vector3()) {
  if (worldScale.lengthSq() === 0) elevator.car.getWorldScale(worldScale);
  return getElevatorSurfaceLocalY(elevator) + (PLAYER_ALTITUDE + ELEVATOR_FOOT_CLEARANCE) / Math.max(worldScale.y, 0.001);
}

function getElevatorSurfaceLocalY(elevator: ElevatorControl) {
  const surface = elevator.surfaceObject;
  if (!surface) return elevator.surfaceY;
  const mesh = surface as THREE.Mesh<THREE.BufferGeometry>;
  const geometry = mesh.geometry;
  if (!geometry) return elevator.surfaceY;
  let localBox = elevatorSurfaceBoxes.get(surface);
  if (!localBox) {
    geometry.computeBoundingBox();
    if (!geometry.boundingBox) return elevator.surfaceY;
    localBox = geometry.boundingBox.clone();
    elevatorSurfaceBoxes.set(surface, localBox);
  }
  surface.updateWorldMatrix(true, false);
  elevator.car.updateWorldMatrix(true, false);
  const top = new THREE.Vector3(0, localBox.max.y, 0);
  surface.localToWorld(top);
  elevator.car.worldToLocal(top);
  return top.y;
}

function addLabel(landmark: Landmark): LabelAnchor {
  const element = document.createElement("div");
  element.className = "label";
  element.dataset.labelSource = landmark.label;
  element.textContent = landmark.label;
  labelsRoot.appendChild(element);
  return { object: landmark.object, element, distance: landmark.labelDistance };
}

function updateLabels() {
  labels.forEach((anchor) => {
    anchor.element.classList.remove("is-visible");
  });
}

function updateMap() {
  if (!mapOpen || !started) return;
  lastMapUpdateAt = performance.now();
  const radarSize = mapRadar.clientWidth || 280;
  const radarRadius = radarSize * 0.42;
  const right = playerForward.clone().cross(playerNormal).normalize();
  const showOxygenSupplyTargets = suitOxygen <= OXYGEN_SUPPLY_RADAR_THRESHOLD;
  const mode: RadarMode = mapExpanded ? "expanded" : "compact";

  const mapItems: MapItem[] = [
    ...world.landmarks.map((landmark) => {
      const missionTarget = isMissionTargetLabel(landmark.label);
      const mysteryId = missionTarget ? null : mysteryDiscoveryIdForLabel(landmark.label);
      const mysteryDiscovered = Boolean(mysteryId && hiddenDiscoveries.has(mysteryId));
      const type = classifyRadarContact({
        label: landmark.label,
        userKind: typeof landmark.object.userData.kind === "string" ? landmark.object.userData.kind : undefined,
        missionTarget,
        unknown: Boolean(mysteryId && !mysteryDiscovered),
      });
      return {
        id: `landmark:${landmark.object.uuid}`,
        label: mysteryId ? mysteryMapLabel(mysteryId, landmark.label, mysteryUnknownLabelKey(mysteryId)) : localizeLabel(landmark.label),
        object: landmark.object,
        x: typeof landmark.object.userData.planetX === "number" ? landmark.object.userData.planetX : landmark.x,
        z: typeof landmark.object.userData.planetZ === "number" ? landmark.object.userData.planetZ : landmark.z,
        mapRange: landmark.mapRange,
        type,
        unknown: Boolean(mysteryId && !mysteryDiscovered),
        missionTarget,
        oxygenSupplyTarget: false,
        coinTarget: false,
        heading: radarHeadingForObject(landmark.object, right),
        moving: isMovingRadarObject(landmark.object),
        priority: missionTarget ? 1000 : 0,
      };
    }),
    ...world.unnumberedObjects.map((item, index) => {
      const mysteryId = unnumberedMysteryDiscoveryId(item.label, index);
      const trueLabel = item.label ?? "坠毁飞船残骸";
      const mysteryDiscovered = hiddenDiscoveries.has(mysteryId);
      return {
        id: `unnumbered:${index}:${item.object.uuid}`,
        label: mysteryMapLabel(mysteryId, trueLabel),
        object: item.object,
        x: item.x,
        z: item.z,
        mapRange: item.mapRange,
        type: classifyRadarContact({ label: trueLabel, unknown: !mysteryDiscovered }),
        unknown: !mysteryDiscovered,
        missionTarget: false,
        oxygenSupplyTarget: false,
        coinTarget: false,
        heading: radarHeadingForObject(item.object, right),
        moving: false,
        priority: 0,
      };
    }),
    ...(showOxygenSupplyTargets
      ? world.rovers
          .filter((rover) => rover.userData.kind === "bot")
          .map((robot, index) => ({
            id: `oxygen:${robot.uuid}:${index}`,
            label: localizeLabel(typeof robot.userData.label === "string" ? robot.userData.label : "维修机器人"),
            object: robot,
            x: typeof robot.userData.planetX === "number" ? robot.userData.planetX : 0,
            z: typeof robot.userData.planetZ === "number" ? robot.userData.planetZ : 0,
            mapRange: 320,
            type: "oxygen" as const,
            unknown: false,
            missionTarget: false,
            oxygenSupplyTarget: true,
            coinTarget: false,
            heading: radarHeadingForObject(robot, right),
            moving: false,
            priority: 0,
          }))
      : []),
  ];

  mapItems.push({
    id: "football",
    label: mysteryMapLabel("football", "火星足球"),
    object: football.group,
    x: FOOTBALL_SPAWN_X,
    z: FOOTBALL_SPAWN_Z,
    mapRange: 220,
    type: hiddenDiscoveries.has("football") ? "cargo" : "unknown",
    unknown: !hiddenDiscoveries.has("football"),
    missionTarget: false,
    oxygenSupplyTarget: false,
    coinTarget: false,
    heading: 0,
    moving: false,
    priority: 0,
  });

  if (orbitalDefense.unlocked && !orbitalDefense.active) {
    for (const [index, parkedShip] of orbitalDefense.parkedShips.entries()) {
      const config = xWingParkingConfigs[index];
      if (!config || !shouldShowParkedXWing({
        unlocked: orbitalDefense.unlocked,
        active: orbitalDefense.active,
        visible: parkedShip.visible,
      })) continue;
      mapItems.push({
        id: `xwing:${index}`,
        label: radarXWingLabel(config.color),
        object: parkedShip,
        x: config.x,
        z: config.z,
        mapRange: 320,
        type: "xwing",
        unknown: false,
        missionTarget: false,
        oxygenSupplyTarget: false,
        coinTarget: false,
        heading: radarHeadingForObject(parkedShip, right),
        moving: false,
        priority: 0,
      });
    }
  }

  if (!wormholeFall) {
    for (const [index, group] of currentCoinGroups.entries()) {
      if (!group.coins.some((coin) => !coin.collected)) continue;
      mapItems.push({
        id: `coin:${index}`,
        label: currentCoinGroups.length > 1 ? `${tr("map.coin")} ${index + 1}` : tr("map.coin"),
        object: null,
        x: group.centerX,
        z: group.centerZ,
        mapRange: PLANET_RADIUS * Math.PI,
        type: "coin",
        unknown: false,
        missionTarget: false,
        oxygenSupplyTarget: false,
        coinTarget: true,
        heading: 0,
        moving: false,
        priority: 0,
      });
    }
  }

  if (sunBody) {
    mapItems.push({
      id: "sun",
      label: tr("map.sun"),
      object: sunBody,
      x: 0,
      z: 0,
      mapRange: PLANET_RADIUS * Math.PI,
      type: "sun",
      unknown: false,
      missionTarget: false,
      oxygenSupplyTarget: false,
      coinTarget: false,
      heading: 0,
      moving: false,
      priority: 0,
    });
  }

  if (!fufuRescued) {
    const fufuDiscovered = hiddenDiscoveries.has("unknown:fufu");
    mapItems.push({
      id: "fufu",
      label: mysteryMapLabel("unknown:fufu", "福福", "map.unknownLife"),
      object: fufu,
      x: world.fufuRescueSite.x,
      z: world.fufuRescueSite.z,
      mapRange: 220,
      type: fufuDiscovered ? "robot" : "unknown",
      unknown: !fufuDiscovered,
      missionTarget: false,
      oxygenSupplyTarget: false,
      coinTarget: false,
      heading: 0,
      moving: false,
      priority: 0,
    });
  }

  if (isStarlinkMapVisible()) {
    mapItems.push({
      id: "starlink",
      label: starlinkDisplayStatus(),
      object: world.starlinkConstellation.anchor,
      x: 0,
      z: 0,
      mapRange: PLANET_RADIUS * Math.PI,
      type: "orbital",
      unknown: false,
      missionTarget: false,
      oxygenSupplyTarget: false,
      coinTarget: false,
      heading: 0,
      moving: false,
      priority: 0,
    });
  }

  const closeMeteor = world.meteors.find((meteor) => meteor.closeFlyby);
  if (closeMeteor) {
    mapItems.push({
      id: "meteor",
      label: localizeLabel("近火流星"),
      object: closeMeteor.head,
      x: 0,
      z: 0,
      mapRange: PLANET_RADIUS * Math.PI,
      type: "meteor",
      unknown: false,
      missionTarget: false,
      oxygenSupplyTarget: false,
      coinTarget: false,
      heading: radarHeadingForObject(closeMeteor.head, right),
      moving: true,
      priority: 0,
    });
  }

  const nearby = mapItems
    .map((item) => {
      const landmarkNormal = new THREE.Vector3();
      if (item.object) item.object.getWorldPosition(landmarkNormal).normalize();
      else planetNormal(item.x, item.z, landmarkNormal);
      const dot = THREE.MathUtils.clamp(playerNormal.dot(landmarkNormal), -1, 1);
      const distance = Math.acos(dot) * PLANET_RADIUS;
      const tangent = landmarkNormal.clone().addScaledVector(playerNormal, -dot);
      if (tangent.lengthSq() > 0.000001) tangent.normalize();
      const lateral = tangent.dot(right);
      const forward = tangent.dot(playerForward);
      return { item, distance, lateral, forward };
    })
    .filter((entry) => entry.item.missionTarget || entry.item.oxygenSupplyTarget || entry.item.coinTarget || entry.item.type === "sun" || entry.distance <= mapRangeForItem(entry.item.mapRange))
    .map((entry) => ({
      ...entry,
      item: {
        ...entry.item,
        distance: entry.distance,
        lateral: entry.lateral,
        forward: entry.forward,
      },
    }));
  const radarContacts: RadarContact[] = nearby.map((entry) => ({
    ...entry.item,
    kind: entry.item.type,
    distance: entry.item.distance,
    lateral: entry.item.lateral,
    forward: entry.item.forward,
  }));
  const selection = selectRadarContacts(radarContacts, mode);
  const nearbyById = new Map(nearby.map((entry) => [entry.item.id, entry]));
  const selectedEntries = selection.visible
    .map((contact) => nearbyById.get(contact.id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const nextSignature = `${mode}:${mapZoom}:${selection.hiddenCount}:${getRadarContactSignature(selection.visible)}`;
  if (nextSignature === radarContactSignature) return;
  radarContactSignature = nextSignature;
  updateRadarLegend();
  radarSummary.textContent = selection.hiddenCount > 0
    ? (isEnglish() ? `+${selection.hiddenCount} contacts` : `+${selection.hiddenCount} 目标`)
    : "";
  radarSummary.classList.toggle("is-visible", selection.hiddenCount > 0);

  const entryLayouts = new Map(selectedEntries.map((entry) => [
    entry.item.id,
    layoutRadarContact(entry.item, radarRadius, mapRangeForItem(entry.item.mapRange), mode, mapZoom),
  ]));
  const labelPositions = buildRadarLabelPositions(selectedEntries, entryLayouts, radarRadius, mode);
  const visibleIds = new Set<string>();
  selectedEntries.forEach((entry, index) => {
    const item = entry.item;
    visibleIds.add(item.id);
    const layout = entryLayouts.get(item.id) ?? layoutRadarContact(item, radarRadius, mapRangeForItem(item.mapRange), mode, mapZoom);
    const marker = radarMarkerNodes.get(item.id) ?? document.createElement("div");
    radarMarkerNodes.set(item.id, marker);
    marker.className = `map-marker type-${entry.item.type}`;
    marker.classList.toggle("is-mission-target", entry.item.missionTarget);
    marker.classList.toggle("is-oxygen-supply-target", entry.item.oxygenSupplyTarget);
    marker.classList.toggle("is-coin-target", entry.item.coinTarget);
    marker.classList.toggle("is-moving", entry.item.moving);
    marker.dataset.kind = entry.item.type;
    marker.title = item.label;
    marker.setAttribute("aria-label", item.label);
    marker.textContent = entry.item.coinTarget ? "$" : entry.item.unknown ? "?" : "";
    marker.style.setProperty("--radar-heading", `${layout.heading}deg`);
    marker.style.setProperty("--radar-distance", layout.distanceRatio.toFixed(3));
    marker.style.transform = `translate(calc(-50% + ${layout.x.toFixed(1)}px), calc(-50% + ${layout.y.toFixed(1)}px)) scale(${layout.scale.toFixed(3)})`;
    if (mapExpanded && shouldShowExpandedMapLabel(entry.item, index)) {
      const label = document.createElement("span");
      label.textContent = entry.item.label;
      const labelPosition = labelPositions.get(item.id);
      if (labelPosition) {
        label.classList.toggle("is-left", labelPosition.side === "left");
        label.style.setProperty("--radar-label-y-shift", `${labelPosition.y - layout.y}px`);
      }
      marker.appendChild(label);
    }
    if (!marker.parentElement) mapRadar.appendChild(marker);
  });

  for (const [id, marker] of radarMarkerNodes) {
    if (visibleIds.has(id)) continue;
    marker.remove();
    radarMarkerNodes.delete(id);
  }

  mapList.innerHTML = "";
}

function buildRadarLabelPositions(
  entries: readonly { item: MapItem & { distance: number; lateral: number; forward: number } }[],
  layouts: ReadonlyMap<string, ReturnType<typeof layoutRadarContact>>,
  radius: number,
  mode: RadarMode,
) {
  const positions = new Map<string, { side: "left" | "right"; y: number }>();
  if (mode !== "expanded") return positions;
  const buckets: Record<"left" | "right", Array<{ id: string; y: number }>> = { left: [], right: [] };
  entries.forEach((entry, index) => {
    if (!shouldShowExpandedMapLabel(entry.item, index)) return;
    const layout = layouts.get(entry.item.id);
    if (!layout) return;
    const side = Math.abs(layout.x) < radius * 0.16 ? (index % 2 === 0 ? "right" : "left") : layout.x < 0 ? "left" : "right";
    buckets[side].push({ id: entry.item.id, y: layout.y });
  });
  for (const side of ["left", "right"] as const) {
    const sorted = buckets[side].sort((a, b) => a.y - b.y);
    let previous = -Infinity;
    for (const entry of sorted) {
      const y = Math.min(radius - 12, Math.max(-radius + 12, Math.max(entry.y, previous + 23)));
      positions.set(entry.id, { side, y });
      previous = y;
    }
  }
  return positions;
}

function mapRangeForItem(itemRange: number) {
  return mapExpanded ? PLANET_RADIUS * Math.PI * 1.08 / mapZoom : Math.min(itemRange, 320 / mapZoom);
}

function radarHeadingForObject(object: THREE.Object3D | null, right: THREE.Vector3) {
  if (!object) return 0;
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(object.getWorldQuaternion(new THREE.Quaternion()));
  direction.projectOnPlane(playerNormal).normalize();
  if (direction.lengthSq() < 0.000001) return 0;
  return THREE.MathUtils.radToDeg(Math.atan2(direction.dot(right), direction.dot(playerForward)));
}

function isMovingRadarObject(object: THREE.Object3D) {
  return object.userData.kind === "rover" || object.userData.kind === "cargo";
}

function radarXWingLabel(color: string) {
  if (isEnglish()) {
    const colors: Record<string, string> = { 红色: "Red", 蓝色: "Blue", 黄色: "Yellow" };
    return `${colors[color] ?? color} X-Wing`;
  }
  return `${color} X 翼`;
}

function updateRadarLegend() {
  const labels: Record<string, [string, string]> = {
    rover: ["火星车", "Rover"],
    xwing: ["X 翼", "X-Wing"],
    mission: ["任务", "Mission"],
    building: ["设施", "Facility"],
  };
  radarLegend.classList.toggle("is-visible", mapExpanded);
  radarLegend.setAttribute("aria-label", isEnglish() ? "Radar legend" : "雷达图例");
  radarLegend.querySelectorAll<HTMLElement>("[data-radar-legend-label]").forEach((node) => {
    const key = node.dataset.radarLegendLabel ?? "";
    const value = labels[key];
    if (value) node.textContent = value[isEnglish() ? 1 : 0];
  });
}

function shouldShowExpandedMapLabel(item: { type?: RadarContactKind; missionTarget: boolean; unknown: boolean; oxygenSupplyTarget?: boolean; coinTarget?: boolean; moving?: boolean }, index: number) {
  if (item.missionTarget) return true;
  if (item.oxygenSupplyTarget) return true;
  if (item.coinTarget) return true;
  if (item.type === "sun") return true;
  if (item.type === "rover" || item.type === "cargo" || item.type === "xwing") return true;
  if (item.type === "meteor" || item.type === "ancient") return true;
  if (item.unknown) return index < 4;
  return false;
}

function playerMapCoordinate() {
  const projectedY = Math.max(Math.abs(playerNormal.y), 0.001);
  return {
    x: (playerNormal.x / projectedY) * PLANET_RADIUS,
    z: (playerNormal.z / projectedY) * PLANET_RADIUS,
  };
}

function formatMapCoordinate(value: number) {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "+";
  return `${sign}${Math.abs(rounded).toString().padStart(3, "0")}`;
}

function updateNavigationReadout() {
  if (!started) return;
  const { x: playerMapX, z: playerMapZ } = playerMapCoordinate();
  mapCoordinates.textContent = `${tr("map.positionLabel")} ${formatMapCoordinate(playerMapX)} / ${formatMapCoordinate(playerMapZ)}`;
  const heading = normalizedHeadingDegrees();
  const roundedHeading = Math.round(heading) % 360;
  mapHeading.textContent = `${tr("map.headingLabel")} ${roundedHeading.toString().padStart(3, "0")}°`;
}

function normalizedHeadingDegrees() {
  return (THREE.MathUtils.radToDeg(headingFromForward(playerNormal, playerForward)) + 360) % 360;
}

function mapTypeForLabel(label: string) {
  if (label.includes("飞船")) return "ship";
  if (label.includes("能源") || label.includes("太阳能")) return "energy";
  if (label.includes("车辆")) return "vehicle";
  if (label.includes("机器人")) return "robot";
  if (label.includes("远古巨树拱门")) return "ancient";
  return "building";
}

function mysteryDiscoveryIdForLabel(label: string) {
  if (label.includes("远古巨树拱门")) return ANCIENT_TREE_ARCH_DISCOVERY_ID;
  if (label.includes("黑色方碑")) return "monolith";
  if (label.includes("机遇号火星车") || label.includes("Opportunity")) return `unknown:${label}`;
  if (label.includes("埃隆") || label.includes("Elon")) return `unknown:${label}`;
  return null;
}

function mysteryUnknownLabelKey(mysteryId: string) {
  if (mysteryId === ANCIENT_TREE_ARCH_DISCOVERY_ID) return "map.unknownMegaStructure";
  return "map.unknownObject";
}

function unnumberedMysteryDiscoveryId(label: string | undefined, index: number) {
  return label ? `unknown:${label}` : `unknown:wreck:${index}`;
}

function mysteryMapLabel(mysteryId: string, trueLabel: string, unknownKey = "map.unknownObject") {
  return hiddenDiscoveries.has(mysteryId) ? localizeLabel(trueLabel) : tr(unknownKey);
}

function isMissionTargetLabel(label: string) {
  const currentTarget = mainMissionTargets[missionStep];
  if (currentTarget && labelMatchesInteractableId(label, currentTarget)) return true;
  if (fufuSideStep !== "available" && fufuSideStep !== "complete") {
    const target = sideMissionTargets.fufu[fufuSideStep];
    if (target && labelMatchesInteractableId(label, target)) return true;
  }
  if (isCargoAvailable() && cargoSideStep !== "complete") {
    const target = sideMissionTargets.cargo[cargoSideStep === "available" ? "cargoShip" : cargoSideStep];
    if (target && labelMatchesInteractableId(label, target)) return true;
  }
  if (isPatrolAvailable() && patrolSideStep !== "complete") {
    const target = sideMissionTargets.patrol[patrolSideStep === "available" ? "solarA" : patrolSideStep];
    if (target && labelMatchesInteractableId(label, target)) return true;
  }
  return false;
}

function labelMatchesInteractableId(label: string, id: Interactable["id"]) {
  if (id === "habitatCheck") return label.includes("01 建筑 居住舱");
  if (id === "greenhouse") return label.includes("02 建筑 温室生态舱");
  if (id === "oxygen") return label.includes("03 建筑 氧气生产站");
  if (id === "methane") return label.includes("04 建筑 甲烷燃料厂");
  if (id === "garage") return label.includes("05 建筑 机器人车库");
  if (id === "tower") return label.includes("06 建筑 通信塔");
  if (id === "lab") return label.includes("07 建筑 科研舱");
  if (id === "storehouse") return label.includes("08 建筑 物资仓");
  if (id === "medical") return label.includes("09 建筑 医疗舱");
  if (id === "solarA") return label.includes("01 能源 太阳能阵列 A");
  if (id === "solarB") return label.includes("02 能源 太阳能阵列 B");
  if (id === "solarC") return label.includes("03 能源 太阳能阵列 C");
  if (id === "cargoShip") return label.includes("02 飞船 货运飞船");
  return false;
}

function resetDialogueState() {
  activeDialogueNode = null;
  dialogueOpen = false;
  pendingSteveCall = null;
  pendingSteveCallQueuedAt = -Infinity;
  steveCallRetryAt = 0;
  dialogueHistory.length = 0;
  appliedDialogueChoiceEffects.clear();
  dialogueState.steveTrust = 0;
  dialogueState.baseIntegrity = 0;
  dialogueState.humanAutonomy = 0;
  dialogueStage.classList.remove("is-visible");
  dialogueLeftSlot.classList.remove("is-speaking", "is-listening");
  dialogueRightSlot.classList.remove("is-speaking", "is-listening");
  dialogueStage.setAttribute("aria-hidden", "true");
  document.body.classList.remove("dialogue-open");
}

function queueSteveCall(scene: DialogueSceneId) {
  pendingSteveCall = scene;
  pendingSteveCallQueuedAt = elapsedTime;
  missionUnread = true;
  missionToggle.classList.add("has-mission-update");
}

function deferPendingSteveCall(retrySeconds: number, feedback?: string) {
  pendingSteveCall = null;
  pendingSteveCallQueuedAt = -Infinity;
  introCallQueued = false;
  steveCallRetryAt = elapsedTime + retrySeconds;
  setCurrentMissionText();
  missionUnread = false;
  missionToggle.classList.remove("has-mission-update");
  if (missionPanelOpen) setMissionPanelOpen(false);
  void feedback;
}

function openDialogueScene(scene: DialogueSceneId, startNode: DialogueNodeId = sceneStartNodes[scene]) {
  pendingSteveCall = null;
  pendingSteveCallQueuedAt = -Infinity;
  steveCallRetryAt = 0;
  if (scene !== "robot") {
    characters.repairRobot.name = "A-12";
    characters.repairRobot.callsign = "维修执行单元";
  }
  activeDialogueNode = startNode;
  dialogueHistory.length = 0;
  dialogueOpen = true;
  suppressTransientInfoWindows();
  keyState.clear();
  resetStick();
  messageUntil = 0;
  dialogueStage.classList.add("is-visible");
  dialogueStage.setAttribute("aria-hidden", "false");
  document.body.classList.add("dialogue-open");
  if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
  renderDialogueNode();
}

function closeDialogue() {
  const closedNode = activeDialogueNode ? dialogueNodes[activeDialogueNode] : null;
  activeDialogueNode = null;
  dialogueOpen = false;
  dialogueHistory.length = 0;
  dialogueStage.classList.remove("is-visible");
  dialogueLeftSlot.classList.remove("is-speaking", "is-listening");
  dialogueRightSlot.classList.remove("is-speaking", "is-listening");
  dialogueStage.setAttribute("aria-hidden", "true");
  document.body.classList.remove("dialogue-open");
  if (closedNode?.scene === "intro" && missionStep === "intro") startOxygenMission();
}

function dialogueTextWeight(text: string) {
  let weight = 0;
  for (const char of text) {
    if (char.trim() === "") weight += 0.35;
    else if ("，,。.!！?？；;、：:".includes(char)) weight += 0.45;
    else weight += char.charCodeAt(0) > 255 ? 1 : 0.56;
  }
  return weight;
}

function splitDialogueTextIntoPages(text: string) {
  const normalized = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  if (!normalized) return [""];
  if (!isSmallScreenMapTouch()) return [normalized];

  const maxWeight = 48;
  if (dialogueTextWeight(normalized) <= maxWeight) return [normalized];

  const pages: string[] = [];
  let remaining = normalized;
  while (dialogueTextWeight(remaining) > maxWeight) {
    let weight = 0;
    let cutIndex = 0;
    let preferredCutIndex = 0;
    for (const [index, char] of Array.from(remaining).entries()) {
      weight += dialogueTextWeight(char);
      cutIndex = index + char.length;
      if ("。.!！?？；;，,、 ".includes(char)) preferredCutIndex = cutIndex;
      if (weight >= maxWeight) break;
    }

    const finalCutIndex = preferredCutIndex > 0 && preferredCutIndex >= cutIndex * 0.58 ? preferredCutIndex : cutIndex;
    const page = remaining.slice(0, finalCutIndex).trim();
    if (!page) break;
    pages.push(page);
    remaining = remaining.slice(finalCutIndex).trim();
  }
  if (remaining) pages.push(remaining);
  return pages.length ? pages : [normalized];
}

function dialogueChoiceLetter(index: number) {
  return String.fromCharCode(65 + index);
}

function dialogueTextWithCompactChoices(text: string, choices: DialogueChoice[]) {
  if (!isSmallScreenMapTouch() || choices.length !== 2) return text;
  const choiceLines = choices.map((choice, index) => `${dialogueChoiceLetter(index)}. ${localizeText(choice.label)}`);
  return `${text}\n${choiceLines.join("\n")}`;
}

function renderDialogueNode(resetPage = true) {
  if (!activeDialogueNode) return;
  const node = dialogueNodes[activeDialogueNode];
  const leftCharacter = characters.alex;
  const rightCharacter = characters[node.speaker === "alex" ? node.listener : node.speaker];
  const speaker = characters[node.speaker];

  dialogueLeftPortrait.src = leftCharacter.portrait;
  dialogueLeftName.textContent = localizeText(leftCharacter.name);
  dialogueLeftCallsign.textContent = localizeText(leftCharacter.callsign);

  dialogueRightPortrait.src = rightCharacter.portrait;
  dialogueRightPortrait.classList.toggle("is-mirrored", node.speaker === "elon" || node.listener === "elon");
  dialogueRightName.textContent = localizeText(rightCharacter.name);
  dialogueRightCallsign.textContent = localizeText(rightCharacter.callsign);

  const leftIsSpeaking = node.speaker === "alex";
  dialogueLeftSlot.classList.toggle("is-speaking", leftIsSpeaking);
  dialogueLeftSlot.classList.toggle("is-listening", !leftIsSpeaking);
  dialogueRightSlot.classList.toggle("is-speaking", !leftIsSpeaking);
  dialogueRightSlot.classList.toggle("is-listening", leftIsSpeaking);
  dialogueLeftTag.classList.toggle("is-speaking", leftIsSpeaking);
  dialogueLeftTag.classList.toggle("is-listening", !leftIsSpeaking);
  dialogueRightTag.classList.toggle("is-speaking", !leftIsSpeaking);
  dialogueRightTag.classList.toggle("is-listening", leftIsSpeaking);

  dialogueSpeaker.textContent = `${localizeText(speaker.name)} / ${localizeText(speaker.callsign)}`;
  dialogueStats.textContent = "";
  dialogueStats.hidden = true;
  dialogueItemImage.hidden = !node.image;
  if (node.image) dialogueItemImage.src = node.image;
  const choices = node.choices ?? [];
  const useCompactChoiceButtons = isSmallScreenMapTouch() && choices.length === 2;
  if (resetPage) dialogueTextPageIndex = 0;
  dialogueTextPages = splitDialogueTextIntoPages(dialogueTextWithCompactChoices(localizeText(node.text), choices));
  dialogueTextPageIndex = Math.min(dialogueTextPageIndex, dialogueTextPages.length - 1);
  dialogueText.textContent = dialogueTextPages[dialogueTextPageIndex] ?? "";
  dialogueChoices.innerHTML = "";

  const hasMorePages = dialogueTextPageIndex < dialogueTextPages.length - 1;
  dialogueChoices.classList.toggle("is-compact-binary", useCompactChoiceButtons);
  selectedDialogueChoiceIndex = choices.length === 2 ? 1 : 0;
  dialogueChoices.hidden = hasMorePages || choices.length === 0;
  dialogueContinue.hidden = !hasMorePages && choices.length > 0;
  for (const [index, choice] of choices.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.choiceIndex = String(index);
    const choiceLabel = localizeText(choice.label);
    button.textContent = useCompactChoiceButtons ? dialogueChoiceLetter(index) : choiceLabel;
    if (useCompactChoiceButtons) button.setAttribute("aria-label", `${dialogueChoiceLetter(index)}. ${choiceLabel}`);
    button.classList.toggle("is-selected", !useCompactChoiceButtons && index === selectedDialogueChoiceIndex);
    dialogueChoices.appendChild(button);
  }
}

function handleDialogueKey(event: KeyboardEvent) {
  event.preventDefault();
  if (!activeDialogueNode) return;
  const node = dialogueNodes[activeDialogueNode];
  const choices = node.choices ?? [];
  if (event.code === "KeyQ" && dialogueTextPageIndex > 0) {
    playUiBeep();
    dialogueTextPageIndex -= 1;
    renderDialogueNode(false);
    return;
  }
  if (dialogueTextPageIndex < dialogueTextPages.length - 1) {
    if (event.code === "KeyE" || event.code === "Enter" || event.code === "NumpadEnter") advanceDialogue();
    return;
  }
  if (choices.length > 0) {
    if (event.code === "KeyQ") {
      if (choices.length === 1) returnToPreviousDialogueLine();
      else if (choices.length === 2) chooseDialogue(0);
      else {
        selectedDialogueChoiceIndex = Math.max(0, selectedDialogueChoiceIndex - 1);
        renderDialogueChoiceSelection();
      }
      return;
    }
    if (event.code === "KeyE") {
      if (choices.length === 2) chooseDialogue(1);
      else chooseDialogue(selectedDialogueChoiceIndex);
      return;
    }
    if (event.code === "ArrowLeft") {
      selectedDialogueChoiceIndex = Math.max(0, selectedDialogueChoiceIndex - 1);
      renderDialogueChoiceSelection();
      return;
    }
    if (event.code === "ArrowRight") {
      selectedDialogueChoiceIndex = Math.min(choices.length - 1, selectedDialogueChoiceIndex + 1);
      renderDialogueChoiceSelection();
      return;
    }
    if (event.code === "Enter" || event.code === "NumpadEnter") chooseDialogue(selectedDialogueChoiceIndex);
    return;
  }
  if (event.code === "KeyQ") returnToPreviousDialogueLine();
  if (event.code === "KeyE" || event.code === "Enter" || event.code === "NumpadEnter") advanceDialogue();
}

function renderDialogueChoiceSelection() {
  const options = dialogueChoices.querySelectorAll<HTMLElement>("button[data-choice-index]");
  options.forEach((option, index) => option.classList.toggle("is-selected", index === selectedDialogueChoiceIndex));
}

function chooseDialogue(index: number) {
  if (!activeDialogueNode) return;
  const node = dialogueNodes[activeDialogueNode];
  const choice = node.choices?.[index];
  if (!choice) return;
  playUiBeep();
  pushDialogueHistory();
  const effectKey = `${activeDialogueNode}:${index}:${choice.next}`;
  if (!appliedDialogueChoiceEffects.has(effectKey)) {
    applyDialogueEffects(choice);
    appliedDialogueChoiceEffects.add(effectKey);
  }
  activeDialogueNode = choice.next;
  renderDialogueNode();
}

function advanceDialogue() {
  if (!activeDialogueNode) return;
  const node = dialogueNodes[activeDialogueNode];
  if (dialogueTextPageIndex < dialogueTextPages.length - 1) {
    playUiBeep();
    dialogueTextPageIndex += 1;
    renderDialogueNode(false);
    return;
  }
  if (node.choices?.length) return;
  if (node.next) {
    playUiBeep();
    pushDialogueHistory();
    activeDialogueNode = node.next;
    renderDialogueNode();
    return;
  }
  playUiBeep();
  closeDialogue();
}

function pushDialogueHistory() {
  if (!activeDialogueNode) return;
  dialogueHistory.push({ nodeId: activeDialogueNode, pageIndex: dialogueTextPageIndex });
}

function returnToPreviousDialogueLine() {
  const previous = dialogueHistory.pop();
  if (!previous) return;
  playUiBeep();
  activeDialogueNode = previous.nodeId;
  renderDialogueNode();
  dialogueTextPageIndex = THREE.MathUtils.clamp(previous.pageIndex, 0, Math.max(0, dialogueTextPages.length - 1));
  renderDialogueNode(false);
}

function applyDialogueEffects(choice: DialogueChoice) {
  if (choice.effects?.includes("completeSeedDecision") && missionStep !== "m2_seed") return;
  if (choice.effects?.includes("completeStormDecision") && missionStep !== "m3_lab") return;
  if (choice.effects?.includes("completeDispatchDecision") && missionStep !== "m3_garage") return;
  for (const effect of choice.effects ?? []) {
    applyDialogueEffect(effect);
  }
  if (choice.next === "oxygen_fast") applyScorePenalty("funny_oxygen_fast_restart", "压缩机暴躁重启");
  if (choice.next === "solar_comms") applyScorePenalty("funny_solar_comms_priority", "氧气站余量被借走");
}

function applyDialogueEffect(effect: DialogueEffect) {
  if (effect === "trustUp") dialogueState.steveTrust += 1;
  if (effect === "trustDown") dialogueState.steveTrust -= 1;
  if (effect === "integrityUp") dialogueState.baseIntegrity += 1;
  if (effect === "integrityDown") dialogueState.baseIntegrity -= 1;
  if (effect === "autonomyUp") dialogueState.humanAutonomy += 1;
  if (effect === "completeOxygen") completeOxygenMission();
  if (effect === "completeSolar") completeSolarMission();
  if (effect === "completeGarage") completeGarageMission();
  if (effect === "completeSeedDecision") completeSeedDecision();
  if (effect === "completeStormDecision") completeStormDecision();
  if (effect === "completeDispatchDecision") completeDispatchDecision();
  if (effect === "acquireScaleGun") setScaleGunOwned(true);
}

function awardTaskScore(eventId: string, label: string, points = SCORE_MAIN_TASK) {
  if (awardScore(`task:${eventId}`, points, label, "task")) {
    completedAnyTask = true;
    updatePlayerRank();
  }
}

function awardSideTaskScore(eventId: string, label: string) {
  awardTaskScore(eventId, label, SCORE_SIDE_TASK);
}

function awardExplorationScore(eventId: string, label: string, points = SCORE_BUILDING_EXPLORE) {
  awardScore(`explore:${eventId}`, points, label, "explore");
}

function awardHiddenDiscovery(eventId: string, label: string, points = SCORE_HIDDEN_DISCOVERY) {
  if (hiddenDiscoveries.has(eventId)) return;
  hiddenDiscoveries.add(eventId);
  awardExplorationScore(`hidden:${eventId}`, tr("score.discovery", { label: localizeLabel(label) }), points);
}

function awardFunnyScore(eventId: string, label: string, points = SCORE_FUNNY_DEFAULT) {
  awardScore(`funny:${eventId}`, points, label, "funny");
}

function applyScorePenalty(eventId: string, label: string, points = SCORE_FUNNY_PENALTY) {
  awardScore(`penalty:${eventId}`, points, label, "penalty");
}

function awardScore(eventId: string, points: number, label: string, kind: "task" | "explore" | "funny" | "penalty") {
  if (awardedEvents.has(eventId)) return false;
  awardedEvents.add(eventId);
  if (points === 0) return true;
  scorePoints += points;
  updateRewardReadouts();
  updatePlayerRank();
  pulseRewardReadout(scoreReadout, points < 0);
  if (kind !== "explore") {
    showRewardFloat(`${points > 0 ? "+" : ""}${points} 积分`, points < 0);
    if (points > 0) playScoreRewardSound(kind === "task" ? 4 : 2);
    else playPenaltySound();
  }
  return true;
}

function awardRepeatableScore(points: number, label: string) {
  if (points === 0) return;
  scorePoints += points;
  updateRewardReadouts();
  updatePlayerRank();
  pulseRewardReadout(scoreReadout, points < 0);
  showRewardFloat(`${points > 0 ? "+" : ""}${points} 积分 · ${label}`, points < 0);
  if (points > 0) playScoreRewardSound(3);
  else playPenaltySound();
}

function awardCoins(amount: number) {
  if (amount <= 0) return;
  coins += amount;
  updateRewardReadouts();
  pulseRewardReadout(coinReadout, false);
}

function activateMoneyCheat() {
  moneyCheatCoinsRemaining += 100;
  showRewardFloat(`+100 ${tr("reward.coins")}`, false);
  playCoinDing();
  if (moneyCheatTimer) return;
  moneyCheatTimer = window.setInterval(() => {
    if (moneyCheatCoinsRemaining <= 0) {
      if (moneyCheatTimer) window.clearInterval(moneyCheatTimer);
      moneyCheatTimer = null;
      return;
    }
    moneyCheatCoinsRemaining -= 1;
    awardCoins(1);
    if (moneyCheatCoinsRemaining % 10 === 0) playCoinDing();
  }, 10);
}

function spendCoins(amount: number) {
  if (amount <= 0) return false;
  if (coins < amount) return false;
  coins -= amount;
  updateRewardReadouts();
  pulseRewardReadout(coinReadout, true);
  showRewardFloat(`-${amount} ${tr("reward.coins")}`, true);
  return true;
}

function updateRewardReadouts() {
  coinReadout.textContent = formatRewardCount(coins, "$");
  scoreReadout.textContent = scorePoints > 0 ? formatRewardCount(scorePoints, "0") : "0";
}

function formatRewardCount(value: number, zeroLabel: string) {
  if (value <= 0) return zeroLabel;
  return String(value).padStart(3, "0");
}

function updateRankReadout() {
  rankReadout.textContent = tr(`rank.${currentRank}`);
}

function updatePlayerRank(silent = false) {
  const nextRank = determinePlayerRank();
  if (rankIndex(nextRank) <= rankIndex(currentRank)) {
    updateRankReadout();
    return;
  }
  currentRank = nextRank;
  updateRankReadout();
  if (silent || !started) return;
  const rankLabel = tr(`rank.${currentRank}`);
  showRewardFloat(tr("rank.promoted", { rank: rankLabel }), false);
  pulseRewardReadout(rankReadout, false);
  playScoreRewardSound(3);
}

function determinePlayerRank(): PlayerRankId {
  if (isFirstResidentRankUnlocked()) return "firstResident";
  let nextRank: PlayerRankId = "internPatrol";
  for (const rule of rankRules) {
    if (rule.storyOnly) continue;
    if (rule.taskRequired && !(completedAnyTask || scorePoints >= rule.score)) continue;
    if (scorePoints >= rule.score || rule.taskRequired && completedAnyTask) nextRank = rule.id;
  }
  return nextRank;
}

function isFirstResidentRankUnlocked() {
  return missionStep === "complete" && dialogueState.steveTrust >= 5 && dialogueState.baseIntegrity >= 4;
}

function rankIndex(rank: PlayerRankId) {
  return rankRules.findIndex((rule) => rule.id === rank);
}

function pulseRewardReadout(element: HTMLElement, penalty: boolean) {
  element.classList.remove("is-burst", "is-penalty");
  void element.offsetWidth;
  element.classList.add(penalty ? "is-penalty" : "is-burst");
}

function showRewardFloat(text: string, penalty: boolean) {
  const node = document.createElement("div");
  node.className = `reward-float${penalty ? " is-penalty" : ""}`;
  node.textContent = text;
  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), 1050);
}

function awardBuildingExploration(interactable: Interactable) {
  if (!isExplorableBuilding(interactable)) return;
  if (hasExploredBuilding(interactable.id)) return;
  exploredBuildings.add(interactable.id);
  awardExplorationScore(`building:${interactable.id}`, interactable.label, SCORE_BUILDING_EXPLORE);
  if (exploredBuildings.size >= explorableBuildingIds.size) {
    awardExplorationScore("building:all", "全部建筑探索完成", SCORE_ALL_BUILDINGS_EXPLORED);
  }
}

function isExplorableBuilding(interactable: Interactable) {
  return explorableBuildingIds.has(interactable.id);
}

function hasExploredBuilding(id: Interactable["id"]) {
  return exploredBuildings.has(id);
}

function awardColliderExploration(colliderLabel: string) {
  if (!canUseFlightMode()) return;
  const rule = colliderExplorationRules.find((item) => colliderLabel.includes(item.match));
  if (!rule) return;

  if (rule.interactableId) {
    const interactable = world.interactables.find((item) => item.id === rule.interactableId);
    if (!interactable) return;
    if (isExplorableBuilding(interactable)) {
      awardBuildingExploration(interactable);
      return;
    }
    awardExplorationScore(`facility:${interactable.id}`, interactable.label, SCORE_BUILDING_EXPLORE);
    return;
  }

  if (rule.label) {
    awardExplorationScore(`collider:${rule.key}`, rule.label, SCORE_BUILDING_EXPLORE);
  }
}

function updateHiddenDiscoveries() {
  if (!started || world.habitatDoor.occupied || insideGreenhouse || insideRocket) return;
  const targets: Array<{ id: string; label: string; object: THREE.Object3D; radius: number; points?: number }> = [
    { id: "monolith", label: "黑色方碑", object: world.monolith.object, radius: 22 },
  ];
  for (const [index, item] of world.unnumberedObjects.entries()) {
    targets.push({
      id: unnumberedMysteryDiscoveryId(item.label, index),
      label: item.label ?? "坠毁飞船残骸",
      object: item.object,
      radius: item.label ? 18 : 34,
    });
  }
  const nasaRover = world.landmarks.find((landmark) => landmark.label.includes("机遇号火星车") || landmark.label.includes("Opportunity"));
  if (nasaRover) {
    targets.push({
      id: `unknown:${nasaRover.label}`,
      label: nasaRover.label,
      object: nasaRover.object,
      radius: 16,
      points: 50,
    });
  }
  const ancientTreeArch = world.landmarks.find((landmark) => landmark.label.includes("远古巨树拱门"));
  if (ancientTreeArch) {
    targets.push({
      id: ANCIENT_TREE_ARCH_DISCOVERY_ID,
      label: ancientTreeArch.label,
      object: ancientTreeArch.object,
      radius: ANCIENT_TREE_ARCH_DISCOVERY_RADIUS,
    });
  }
  targets.push({ id: "football", label: "火星足球", object: football.group, radius: FOOTBALL_PLAYER_RADIUS + FOOTBALL_RADIUS + 3.5 });
  if (!fufuRescued) targets.push({ id: "unknown:fufu", label: "福福", object: fufu, radius: 13 });

  for (const target of targets) {
    if (hiddenDiscoveries.has(target.id)) continue;
    const position = new THREE.Vector3();
    target.object.getWorldPosition(position);
    if (position.distanceTo(player.position) <= target.radius) awardHiddenDiscovery(target.id, target.label, target.points);
  }
}

function updateCoinGroup(delta: number) {
  if (!started) return;
  if (wormholeFall) {
    setCoinGroupsVisible(false);
    return;
  }
  setCoinGroupsVisible(true);
  if (currentCoinGroups.length === 0) {
    if (elapsedTime >= nextCoinRefreshAt) spawnCoinGroups();
    return;
  }
  if (elapsedTime >= nextCoinRefreshAt) {
    spawnCoinGroups();
    return;
  }

  for (const group of currentCoinGroups) {
    for (const coin of group.coins) {
      if (coin.collected) continue;
      coin.group.rotateY(delta * 2.6);
      if (coin.group.position.distanceTo(player.position) <= COIN_COLLECT_RADIUS) collectCoin(coin);
    }
  }
}

function setCoinGroupsVisible(visible: boolean) {
  for (const group of currentCoinGroups) {
    for (const coin of group.coins) {
      if (!coin.collected) coin.group.visible = visible;
    }
  }
}

function spawnCoinGroups() {
  clearCoinGroups();
  for (let index = 0; index < COIN_GROUP_COUNT; index += 1) {
    const group = createSafeCoinGroup(currentCoinGroups);
    if (!group) break;
    currentCoinGroups.push(group);
  }
  nextCoinRefreshAt = elapsedTime + COIN_REFRESH_SECONDS;
  if (currentCoinGroups.length < COIN_GROUP_COUNT) {
    nextCoinRefreshAt = elapsedTime + 60;
  }
}

function createSafeCoinGroup(existingGroups: CoinGroup[]): CoinGroup | null {
  for (let attempt = 0; attempt < 260; attempt += 1) {
    const centerNormal = randomCoinSurfaceNormal();
    const center = mapCoordinatesFromNormal(centerNormal);
    if (!isSafeCoinNormal(centerNormal, COIN_SAFE_MARGIN + 2.6)) continue;
    if (!isCoinGroupCenterSafe(centerNormal, existingGroups)) continue;

    const tangentA = new THREE.Vector3(-centerNormal.z, 0, centerNormal.x);
    if (tangentA.lengthSq() < 0.0001) tangentA.set(1, 0, 0);
    tangentA.normalize();
    const tangentB = tangentA.clone().cross(centerNormal).normalize();
    const lineAngle = Math.random() * Math.PI * 2;
    const lineDirection = tangentA.clone().multiplyScalar(Math.cos(lineAngle)).addScaledVector(tangentB, Math.sin(lineAngle)).normalize();
    const lineYaw = Math.atan2(lineDirection.x, lineDirection.z);
    const coinsForGroup: CoinPickup[] = [];
    let safe = true;

    for (let index = 0; index < COIN_GROUP_SIZE; index += 1) {
      const offset = (index - (COIN_GROUP_SIZE - 1) / 2) * COIN_LINE_SPACING;
      const coinNormal = centerNormal
        .clone()
        .addScaledVector(lineDirection, offset / PLANET_RADIUS)
        .normalize();
      if (!isSafeCoinNormal(coinNormal, COIN_SAFE_MARGIN)) {
        safe = false;
        break;
      }
      if (!isCoinNormalAwayFromGroups(coinNormal, existingGroups)) {
        safe = false;
        break;
      }
      const coin = createCoinPickup(coinNormal, lineYaw);
      coinsForGroup.push(coin);
    }

    if (!safe) {
      for (const coin of coinsForGroup) scene.remove(coin.group);
      continue;
    }

    const group: CoinGroup = {
      coins: coinsForGroup,
      centerNormal,
      centerX: center.x,
      centerZ: center.z,
      expiresAt: elapsedTime + COIN_REFRESH_SECONDS,
    };
    for (const coin of coinsForGroup) coin.owner = group;
    return group;
  }
  return null;
}

function randomCoinSurfaceNormal() {
  const y = THREE.MathUtils.randFloat(0.22, 0.98);
  const radial = Math.sqrt(Math.max(0, 1 - y * y));
  const angle = Math.random() * Math.PI * 2;
  return new THREE.Vector3(Math.cos(angle) * radial, y, Math.sin(angle) * radial).normalize();
}

function createCoinPickup(normal: THREE.Vector3, yaw: number): CoinPickup {
  const group = createCoinVisual();
  placeObjectOnPlanetNormal(group, normal, 0.82, yaw);
  scene.add(group);
  return { group, normal: normal.clone(), owner: null, collected: false };
}

function createCoinVisual() {
  const group = new THREE.Group();
  const coinMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd84f,
    roughness: 0.28,
    metalness: 0.78,
    emissive: 0x8a4e00,
    emissiveIntensity: 0.28,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.16, 32), coinMaterial);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  const markGeometry = new THREE.PlaneGeometry(1.56, 1.56);
  const markFront = new THREE.Mesh(markGeometry, createCoinSymbolMaterial());
  markFront.position.z = 0.091;
  const markBack = new THREE.Mesh(markGeometry, createCoinSymbolMaterial());
  markBack.position.z = -0.091;
  markBack.rotation.y = Math.PI;
  group.add(body, markFront, markBack);
  group.userData.label = "金币";
  return group;
}

function createCoinSymbolMaterial() {
  if (coinSymbolMaterial) return coinSymbolMaterial;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "900 150px 'SF Mono', 'Roboto Mono', ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(91, 45, 2, 0.44)";
    ctx.fillStyle = "#fff0a6";
    ctx.shadowColor = "rgba(255, 182, 48, 0.72)";
    ctx.shadowBlur = 12;
    ctx.strokeText("$", 128, 132);
    ctx.fillText("$", 128, 132);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  coinSymbolMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  return coinSymbolMaterial;
}

function isSafeCoinNormal(normal: THREE.Vector3, margin: number) {
  if (Math.abs(normal.y) < 0.16) return false;
  const point = mapCoordinatesFromNormal(normal);
  for (const collider of world.colliders) {
    if (collider.enabled && !collider.enabled()) continue;
    if (collider.normal) {
      const dot = THREE.MathUtils.clamp(normal.dot(collider.normal), -1, 1);
      if (Math.acos(dot) * PLANET_RADIUS < collider.radius + margin) return false;
      continue;
    }
    if (Math.hypot(point.x - collider.center.x, point.z - collider.center.y) < collider.radius + margin) return false;
  }
  if (!isNormalAwayFromObject(normal, football.group, FOOTBALL_RADIUS + margin + 2.4)) return false;
  if (!isNormalAwayFromObject(normal, fufu, margin + 3.2)) return false;
  return true;
}

function isCoinGroupCenterSafe(centerNormal: THREE.Vector3, existingGroups: CoinGroup[]) {
  return existingGroups.every((group) => surfaceDistanceBetweenNormals(centerNormal, group.centerNormal) >= COIN_GROUP_SAFE_DISTANCE);
}

function isCoinNormalAwayFromGroups(normal: THREE.Vector3, existingGroups: CoinGroup[]) {
  for (const group of existingGroups) {
    for (const coin of group.coins) {
      if (surfaceDistanceBetweenNormals(normal, coin.normal) < COIN_SAFE_MARGIN + COIN_LINE_SPACING) return false;
    }
  }
  return true;
}

function isNormalAwayFromObject(normal: THREE.Vector3, object: THREE.Object3D, minDistance: number) {
  const objectNormal = new THREE.Vector3();
  object.getWorldPosition(objectNormal);
  if (objectNormal.lengthSq() < 0.000001) return true;
  objectNormal.normalize();
  return surfaceDistanceBetweenNormals(normal, objectNormal) >= minDistance;
}

function surfaceDistanceBetweenNormals(a: THREE.Vector3, b: THREE.Vector3) {
  return Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1)) * PLANET_RADIUS;
}

function mapCoordinatesFromNormal(normal: THREE.Vector3) {
  const projectedY = Math.max(Math.abs(normal.y), 0.001);
  return {
    x: (normal.x / projectedY) * PLANET_RADIUS,
    z: (normal.z / projectedY) * PLANET_RADIUS,
  };
}

function collectCoin(coin: CoinPickup) {
  if (coin.collected) return;
  coin.collected = true;
  const worldPosition = new THREE.Vector3();
  coin.group.getWorldPosition(worldPosition);
  scene.remove(coin.group);
  playCoinDing();
  animateCoinToReadout(worldPosition, () => awardCoins(1));

  const owner = coin.owner;
  if (owner && owner.coins.every((item) => item.collected)) clearCoinGroup(owner);
}

function animateCoinToReadout(worldPosition: THREE.Vector3, onArrive: () => void) {
  const projected = worldPosition.clone().project(camera);
  const startX = (projected.x * 0.5 + 0.5) * window.innerWidth;
  const startY = (-projected.y * 0.5 + 0.5) * window.innerHeight;
  const targetRect = coinReadout.getBoundingClientRect();
  const targetX = targetRect.left + targetRect.width / 2;
  const targetY = targetRect.top + targetRect.height / 2;
  const node = document.createElement("div");
  node.className = "coin-fly";
  node.style.transform = `translate(${startX}px, ${startY}px) translate(-50%, -50%) scale(1.45) rotateY(0deg)`;
  document.body.appendChild(node);
  const animation = node.animate(
    [
      { transform: `translate(${startX}px, ${startY}px) translate(-50%, -50%) scale(1.45) rotateY(0deg)`, opacity: 1 },
      { transform: `translate(${(startX + targetX) / 2}px, ${Math.min(startY, targetY) - 82}px) translate(-50%, -50%) scale(1.05) rotateY(210deg)`, opacity: 1 },
      { transform: `translate(${targetX}px, ${targetY}px) translate(-50%, -50%) scale(0.22) rotateY(420deg)`, opacity: 0.24 },
    ],
    { duration: 680, easing: "cubic-bezier(0.16, 0.9, 0.22, 1)", fill: "forwards" }
  );
  animation.onfinish = () => {
    node.remove();
    onArrive();
  };
}

function clearCoinGroup(group: CoinGroup) {
  for (const coin of group.coins) scene.remove(coin.group);
  const index = currentCoinGroups.indexOf(group);
  if (index >= 0) currentCoinGroups.splice(index, 1);
}

function clearCoinGroups() {
  for (const group of currentCoinGroups) {
    for (const coin of group.coins) scene.remove(coin.group);
  }
  currentCoinGroups.length = 0;
}

function playScoreRewardSound(notes = 4) {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;
  uiAudioContext ??= new AudioContextClass();
  const context = uiAudioContext;
  if (context.state === "suspended") context.resume().catch(() => undefined);
  const now = context.currentTime;
  const frequencies = [523.25, 659.25, 783.99, 1046.5, 1318.51];
  for (let index = 0; index < notes; index += 1) {
    const start = now + index * 0.085;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequencies[index % frequencies.length], start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.088, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.14);
  }
}

function playCoinDing() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;
  uiAudioContext ??= new AudioContextClass();
  const context = uiAudioContext;
  if (context.state === "suspended") context.resume().catch(() => undefined);
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(1480, now);
  oscillator.frequency.exponentialRampToValueAtTime(1975, now + 0.055);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.095, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.18);
}

function playPenaltySound() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;
  uiAudioContext ??= new AudioContextClass();
  const context = uiAudioContext;
  if (context.state === "suspended") context.resume().catch(() => undefined);
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(220, now);
  oscillator.frequency.exponentialRampToValueAtTime(138, now + 0.18);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.22);
}

function resetQuestState() {
  orbitalDefense.reset();
  if (marsBaseRoot) marsBaseRoot.visible = true;
  document.body.classList.remove("is-orbital-defense");
  orbitalDefenseHud.classList.remove("is-visible");
  orbitalDefenseHud.setAttribute("aria-hidden", "true");
  missionStep = "intro";
  testModeEnabled = false;
  xWingCollisionDebugEnabled = false;
  resetXWingColliderScale();
  fufuSideStep = "available";
  cargoSideStep = "available";
  patrolSideStep = "available";
  elonMet = false;
  elonDialogueIndex = 0;
  scorePoints = 0;
  coins = 0;
  moneyCheatCoinsRemaining = 0;
  if (moneyCheatTimer) {
    window.clearInterval(moneyCheatTimer);
    moneyCheatTimer = null;
  }
  currentRank = "internPatrol";
  steveCallRetryAt = 0;
  pendingSteveCallQueuedAt = -Infinity;
  completedAnyTask = false;
  awardedEvents.clear();
  exploredBuildings.clear();
  hiddenDiscoveries.clear();
  talkedRobotIds.clear();
  shownOperationHelpIds.delete("laserSword.unlock");
  lastLaserSwordLockedPromptAt = -Infinity;
  lastLaserSwordAttackAt = -Infinity;
  lastSpiderDamageAt = -Infinity;
  for (const spider of world.darkSpiders) {
    spider.health = spider.maxHealth;
    spider.defeated = false;
    spider.attacking = false;
    spider.hitUntil = -Infinity;
    spider.deathStartedAt = -Infinity;
    spider.group.visible = true;
    spider.visual.visible = true;
    spider.visual.rotation.set(0, 0, 0);
    spider.eyeMaterial.color.set(0x8cff66);
  }
  setLaserSwordOwned(false);
  clearCoinGroups();
  nextCoinRefreshAt = elapsedTime;
  updateRewardReadouts();
  updatePlayerRank(true);
  for (const item of world.interactables) item.completed = false;
  world.oxygenLight.color.set(0xff3d2f);
  world.solarLight.color.set(0xff3d2f);
}

function setScaleGunOwned(owned: boolean) {
  hasScaleGun = owned;
  playerRig.scaleGun.visible = owned && scaleGunAiming && !laserSwordActive;
  if (!owned && scaleGunAiming) {
    scaleGunAiming = false;
    scaleGunTarget = null;
    camera.fov = 54;
    camera.updateProjectionMatrix();
    updateScaleGunOverlay();
  }
  const item = world.interactables.find((interactable) => interactable.id === "monolith");
  if (item) item.completed = owned;
}

function setLaserSwordOwned(owned: boolean) {
  hasLaserSword = owned;
  if (!owned) {
    laserSwordActive = false;
    laserSwordRaised = false;
    lastLaserSwordAttackAt = -Infinity;
    laserSwordWorldLight.visible = false;
    laserSwordWorldLight.intensity = 0;
  }
  updateLaserSwordVisual();
}

function awardLaserSwordAfterOrbitalDefense() {
  if (hasLaserSword) return false;
  setLaserSwordOwned(true);
  return true;
}

function awardXWingAfterWormhole() {
  if (orbitalDefense.unlocked) return false;
  orbitalDefense.setUnlocked(true);
  showOneTimeOperationHelp(
    "xWing.unlock",
    localizeText("装备解锁"),
    localizeText("你获得了「X 翼战机」。战机已停在出生点附近；靠近后按 E 登机。"),
    7.2,
  );
  return true;
}

function startOxygenMission() {
  missionStep = "m1_habitat";
  setCurrentMissionText();
}

function completeOxygenMission() {
  missionStep = "m1_solarC";
  world.oxygenLight.color.set(0x66d9ff);
  const item = world.interactables.find((interactable) => interactable.id === "oxygen");
  if (item) item.completed = true;
  awardTaskScore("main_m1_oxygen", "氧气生产站稳定");
  setCurrentMissionText();
}

function completeSolarMission() {
  missionStep = "m1_garage";
  world.solarLight.color.set(0x66ff9b);
  const item = world.interactables.find((interactable) => interactable.id === "solarC");
  if (item) item.completed = true;
  awardTaskScore("main_m1_solarC", "太阳能阵列 C 校准");
  setCurrentMissionText();
}

function completeGarageMission() {
  if (missionStep === "m1_garage") {
    missionStep = "m2_greenhouse";
    const item = world.interactables.find((interactable) => interactable.id === "garage");
    if (item) item.completed = true;
    awardTaskScore("main_m1_garage", "生命支持验收完成");
    showDialogue("史蒂夫", "生命支持验收完成。下一项：启动温室生态舱。底线做对了，现在开始让基地像生活。", 5.2);
    setCurrentMissionText();
    return;
  }
  const item = world.interactables.find((interactable) => interactable.id === "garage");
  if (item) item.completed = true;
  missionStep = "complete";
  awardTaskScore("main_garage_final", "机器人调度完成");
  setCurrentMissionText();
}

function completeSeedDecision() {
  if (missionStep !== "m2_seed") return;
  completeInteractable("greenhouse");
  missionStep = "m3_tower";
  awardTaskScore("main_m2_seed", missionLabel("greenhouse"));
  setCurrentMissionText();
}

function completeStormDecision() {
  if (missionStep !== "m3_lab") return;
  completeInteractable("lab");
  missionStep = "m3_methane";
  awardTaskScore("main_m3_lab", missionLabel("lab"));
  setCurrentMissionText();
}

function completeDispatchDecision() {
  if (missionStep !== "m3_garage") return;
  completeInteractable("garage");
  missionStep = "m3_steve";
  awardTaskScore("main_m3_garage", missionLabel("garage"));
  setCurrentMissionText();
}

function advanceWorldQuest(id: Interactable["id"]) {
  if (advanceSideQuest(id)) return;
  if (mainMissionTargets[missionStep] !== id) return;
  const previousStep = missionStep;

  if (missionStep === "m1_habitat") {
    completeInteractable(id);
    missionStep = "m1_oxygen";
    showDialogue("史蒂夫", "居住舱空气循环正常。氧气生产站仍有压降，请前往 03 建筑氧气生产站。先找原因，别急着重启。", 5.2);
  } else if (missionStep === "m2_greenhouse") {
    missionStep = "m2_storehouse";
    showDialogue("温室生态舱", "水循环处于保护模式。缺少密封环，请前往物资仓清点货箱。", 4.8);
  } else if (missionStep === "m2_storehouse") {
    missionStep = "m2_lab";
    showDialogue("A-01", "货箱 07-B 外壳破损。可用密封件无法确认，请前往科研舱做材料检测。", 4.8);
  } else if (missionStep === "m2_lab") {
    missionStep = "m2_solarB";
    showDialogue("科研舱", "临时密封环打印完成。温室补光功率不足，请调整太阳能阵列 B。", 4.8);
  } else if (missionStep === "m2_solarB") {
    missionStep = "m2_seed";
    showDialogue("史蒂夫", "阵列 B 已分配温室补光。回到温室，决定火星第一批种植方案。让第一批植物值得这点电。", 5.2);
  } else if (missionStep === "m2_seed") {
    openDialogueScene("greenhouseDecision");
    return;
  } else if (missionStep === "m3_tower") {
    missionStep = "m3_lab";
    showDialogue("P-03", "风暴提前。通信塔只收到半段地球指令。请到科研舱比对本地气象数据。", 5.2);
  } else if (missionStep === "m3_lab") {
    openDialogueScene("stormDecision");
    return;
  } else if (missionStep === "m3_methane") {
    missionStep = "m3_solarA";
    showDialogue("甲烷燃料厂", "第一轮低功率试生产完成。风暴加强，请固定太阳能阵列 A。", 4.8);
  } else if (missionStep === "m3_solarA") {
    missionStep = "m3_garage";
    showDialogue("史蒂夫", "阵列 A 锁定。A-12 与 A-01 同时请求调度，请前往机器人车库分配优先级。只能选一个优先级，聚焦。", 5.6);
  } else if (missionStep === "m3_garage") {
    openDialogueScene("dispatchDecision");
    return;
  } else if (missionStep === "m3_steve") {
    missionStep = "complete";
    dialogueState.steveTrust += 1;
    const ending = dialogueState.steveTrust >= 5 && dialogueState.baseIntegrity >= 4 ? "协作协议已建立。欢迎来到火星，X。现在把它做成一个真正能住人的地方。" : "协作协议已建立。亚历克斯拥有现场判断权，史蒂夫保留风险限制。";
    showDialogue("史蒂夫", ending, 6);
  }
  completeInteractable(id);
  awardTaskScore(`main_${previousStep}`, missionLabel(id));
  setCurrentMissionText();
}

function advanceSideQuest(id: Interactable["id"]) {
  if (fufuSideStep !== "available" && fufuSideStep !== "complete" && sideMissionTargets.fufu[fufuSideStep] === id) {
    const previousStep = fufuSideStep;
    if (fufuSideStep === "medical") {
      fufuSideStep = "habitat";
      dialogueState.steveTrust += 1;
      showDialogue("医疗舱", "扫描完成。福福体温偏低，无污染风险。隔离不是拒绝，是确认安全前的保护。请带它回居住舱观察。", 5.6);
    } else if (fufuSideStep === "habitat") {
      fufuSideStep = "complete";
      dialogueState.humanAutonomy += 1;
      showDialogue("史蒂夫", "未登记生命体已进入观察名单。记录：非效率陪伴对象可能提高长期任务稳定性。暂不构成基地风险，可继续观察。奇怪，但有用。", 6.2);
    }
    awardSideTaskScore(`side_fufu_${previousStep}`, missionLabel(id));
    setCurrentMissionText();
    return true;
  }

  const cargoStep = cargoSideStep === "available" ? "cargoShip" : cargoSideStep;
  if (cargoSideStep !== "complete" && isCargoAvailable() && sideMissionTargets.cargo[cargoStep] === id) {
    const previousStep = cargoStep;
    if (cargoSideStep === "available") cargoSideStep = "cargoShip";
    if (cargoSideStep === "cargoShip") {
      cargoSideStep = "garage";
      showDialogue("A-01", "卸载轨迹异常。一个货箱被临时送往机器人车库。", 4.4);
    } else if (cargoSideStep === "garage") {
      cargoSideStep = "lab";
      showDialogue("机器人车库", "错位货箱已找到，外壳变形。请送科研舱检测内部模块。", 4.6);
    } else if (cargoSideStep === "lab") {
      cargoSideStep = "storehouse";
      showDialogue("科研舱", "密封件可用，电子模块需降级使用。请回物资仓登记保留方案。", 4.8);
    } else if (cargoSideStep === "storehouse") {
      cargoSideStep = "complete";
      dialogueState.baseIntegrity += 1;
      showDialogue("物资仓", "错位货箱归档完成。后续温室与通信维修获得备用密封件。", 5);
    }
    awardSideTaskScore(`side_cargo_${previousStep}`, missionLabel(id));
    setCurrentMissionText();
    return true;
  }

  const patrolStep = patrolSideStep === "available" ? "solarA" : patrolSideStep;
  if (patrolSideStep !== "complete" && isPatrolAvailable() && sideMissionTargets.patrol[patrolStep] === id) {
    const previousStep = patrolStep;
    if (patrolSideStep === "available") patrolSideStep = "solarA";
    if (patrolSideStep === "solarA") {
      patrolSideStep = "tower";
      showDialogue("P-03", "阵列 A 外侧旧传感器被沙尘遮挡。请同步通信塔外侧回波。", 4.8);
    } else if (patrolSideStep === "tower") {
      patrolSideStep = "lab";
      showDialogue("通信塔", "异常回波确认。需要科研舱重建风暴路径。", 4.6);
    } else if (patrolSideStep === "lab") {
      patrolSideStep = "complete";
      dialogueState.baseIntegrity += 1;
      showDialogue("科研舱", "外围巡逻数据完成。主线风暴协议获得提前预警。", 5);
    }
    awardSideTaskScore(`side_patrol_${previousStep}`, missionLabel(id));
    setCurrentMissionText();
    return true;
  }

  return false;
}

function completeInteractable(id: Interactable["id"]) {
  const item = world.interactables.find((interactable) => interactable.id === id);
  if (item) item.completed = true;
}

function isCargoAvailable() {
  return ALL_PLAYABLE_CONTENT_UNLOCKED || testModeEnabled || ["m2_storehouse", "m2_lab", "m2_solarB", "m2_seed", "m3_tower", "m3_lab", "m3_methane", "m3_solarA", "m3_garage", "m3_steve", "complete"].includes(missionStep);
}

function isPatrolAvailable() {
  return ALL_PLAYABLE_CONTENT_UNLOCKED || testModeEnabled || ["m3_tower", "m3_lab", "m3_methane", "m3_solarA", "m3_garage", "m3_steve", "complete"].includes(missionStep);
}

function isStarlinkMapVisible() {
  return ALL_PLAYABLE_CONTENT_UNLOCKED || testModeEnabled || ["m3_lab", "m3_methane", "m3_solarA", "m3_garage", "m3_steve", "complete"].includes(missionStep);
}

function isAnomalySceneAccessible() {
  return ALL_PLAYABLE_CONTENT_UNLOCKED || testModeEnabled || isAnomalyContentUnlocked(missionStep);
}

function isActiveMissionInteractable(id: Interactable["id"]) {
  if (id === "monolith") return isAnomalySceneAccessible() && (testModeEnabled || !hasScaleGun);
  if (mainMissionTargets[missionStep] === id) return true;
  if (fufuSideStep !== "available" && fufuSideStep !== "complete" && sideMissionTargets.fufu[fufuSideStep] === id) return true;
  if (isCargoAvailable() && cargoSideStep !== "complete") {
    const cargoStep = cargoSideStep === "available" ? "cargoShip" : cargoSideStep;
    if (sideMissionTargets.cargo[cargoStep] === id) return true;
  }
  if (isPatrolAvailable() && patrolSideStep !== "complete") {
    const patrolStep = patrolSideStep === "available" ? "solarA" : patrolSideStep;
    if (sideMissionTargets.patrol[patrolStep] === id) return true;
  }
  return false;
}

function setCurrentMissionText() {
  updateAnomalyContentState();
  const textByStep: Record<MainMissionStep, string> = {
    intro: "等待基地中央 AI 史蒂夫建立通信，随后开始基地验收。",
    m1_habitat: "主线一：前往 01 建筑居住舱，检查空气循环与补给柜。",
    m1_oxygen: "主线一：前往 03 建筑氧气生产站，确认舱压、CO2 进气和功率。",
    m1_solarC: "主线一：前往 03 能源太阳能阵列 C，清理沙尘并校准角度。",
    m1_garage: "主线一：前往 05 建筑机器人车库，授权 A-12 生成维修单。",
    m2_greenhouse: "主线二：前往 02 建筑温室生态舱，检查水循环、补光和舱压。",
    m2_storehouse: "主线二：前往 08 建筑物资仓，清点可用密封件。",
    m2_lab: "主线二：前往 07 建筑科研舱，制作临时密封环。",
    m2_solarB: "主线二：前往 02 能源太阳能阵列 B，给温室分配补光功率。",
    m2_seed: "主线二：回到 02 建筑温室生态舱，决定火星第一批种植方案。",
    m3_tower: "主线三：前往 06 建筑通信塔，校准风暴中的延迟通信。",
    m3_lab: "主线三：前往 07 建筑科研舱，比对地球旧指令和本地气象数据。",
    m3_methane: "主线三：前往 04 建筑甲烷燃料厂，完成低功率试生产。",
    m3_solarA: "主线三：前往 01 能源太阳能阵列 A，固定风暴锁扣。",
    m3_garage: "主线三：前往 05 建筑机器人车库，分配 A-12 与 A-01 的调度顺序。",
    m3_steve: "主线三：回到 01 建筑居住舱史蒂夫终端，签署人机协作协议。",
    complete: "主线完成：阿瑞斯阿尔法基地达到最低生存标准。可继续完成剩余支线。",
  };

  const sideHints: string[] = [];
  if (fufuSideStep === "medical") sideHints.push("支线：带福福去医疗舱扫描");
  if (fufuSideStep === "habitat") sideHints.push("支线：带福福回居住舱");
  if (isCargoAvailable() && cargoSideStep !== "complete") sideHints.push("支线：调查 A-01 的错位货箱");
  if (isPatrolAvailable() && patrolSideStep !== "complete") sideHints.push("支线：跟进 P-03 的外围异常");
  if (isStarlinkMapVisible()) sideHints.push(`轨道链路：${starlinkDisplayStatus()}`);
  setMission(sideHints.length ? `${textByStep[missionStep]} ｜ ${sideHints.join("；")}` : textByStep[missionStep]);
}

function updateAnomalyContentState() {
  const visible = isAnomalySceneAccessible();
  for (const spider of world.darkSpiders) {
    if (!spider.defeated) {
      spider.group.visible = true;
      spider.visual.visible = true;
    }
  }
  if (visible === anomalyContentVisible) return;
  anomalyContentVisible = visible;
  world.ancientTreePortal.visible = visible;
  world.monolith.object.visible = visible;
}

function setMission(text: string) {
  const previous = missionText.dataset.sourceText;
  missionText.dataset.sourceText = text;
  missionText.textContent = localizeText(text);
  if (started && previous && previous !== text) {
    missionUnread = true;
    missionToggle.classList.add("has-mission-update");
    if (isSmallScreenMapTouch()) setMissionPanelOpen(false);
  }
}

function updateMissionAfterLanguageChange() {
  if (missionText.dataset.sourceText) missionText.textContent = localizeText(missionText.dataset.sourceText);
  else setCurrentMissionText();
  missionToggle.setAttribute("aria-label", missionPanelOpen ? tr("missionToggle.hide") : tr("missionToggle.show"));
}

function showDialogue(speaker: string, text: string, seconds: number) {
  if (isFocusOverlayActive()) return;
  dialogueBox.innerHTML = `<strong>${localizeText(speaker)}</strong><span>${localizeText(text)}</span>`;
  messageUntil = performance.now() + seconds * 1000;
}

function isFocusOverlayActive() {
  const mode = currentGameMode();
  return mode === "dialogue" || mode === "camera" || mode === "scaleGun" || photoViewerOpen;
}

function currentGameMode() {
  return resolveGameMode({
    started,
    dialogueOpen,
    insideInterior: isInsideInteriorSpace(),
    ridingVehicle: Boolean(ridingRover || ridingAtAt),
    ridingElevator: Boolean(ridingElevator),
    cameraMode,
    scaleGunAiming,
    wormholeActive: Boolean(wormholeFall) || isWormholeWhiteoutActive(),
  });
}

function suppressTransientInfoWindows() {
  messageUntil = 0;
  dialogueBox.innerHTML = "";
  dialogueBox.classList.remove("is-visible");
}

function updateReadouts() {
  if (oxygenReadout) {
    const value = missionStep === "m1_oxygen" ? 58 + Math.sin(elapsedTime * 3) * 4 : 78 + Math.sin(elapsedTime * 0.36) * 2;
    oxygenReadout.textContent = `${Math.round(value)}%`;
  }
  if (suitOxygenReadout) {
    suitOxygenReadout.textContent = `${Math.ceil(suitOxygen)}%`;
    suitOxygenReadout.classList.toggle("is-low", suitOxygen <= SUIT_OXYGEN_WARNING_THRESHOLD);
    suitOxygenReadout.classList.toggle("is-critical", suitOxygen <= SUIT_OXYGEN_WARNING_THRESHOLD);
  }
  if (staminaReadout) {
    staminaReadout.textContent = `${Math.round(stamina)}%`;
    staminaReadout.classList.toggle("is-low", stamina <= 20);
  }
  if (jetpackStatusRow) {
    jetpackStatusRow.hidden = !jetpackUnlocked;
  }
  if (jetpackReadout) {
    const displayedJetpackEnergy = jetpackEnergy >= JETPACK_MAX_ENERGY ? JETPACK_MAX_ENERGY : Math.max(0, Math.floor(jetpackEnergy));
    jetpackReadout.textContent = `${displayedJetpackEnergy}%`;
    jetpackReadout.classList.toggle("is-low", jetpackUnlocked && jetpackEnergy <= 20);
    jetpackReadout.classList.toggle("is-critical", jetpackUnlocked && jetpackEnergy <= 10);
  }
  if (powerReadout) {
    const value = missionStep === "m1_solarC" ? 61 + Math.sin(elapsedTime * 3.2) * 4 : 89 + Math.sin(elapsedTime * 0.22 + 1.8) * 4;
    powerReadout.textContent = `${Math.round(value)}%`;
  }
  if (onlineCountReadout) {
    onlineCountReadout.textContent = isEnglish() ? `${multiplayer.onlineCount} players` : `${multiplayer.onlineCount}人`;
  }
  // HUD 叙事上称为“信号延迟”，底层取本机实际渲染帧率，单人离线也必须有数值。
  const fps = averageFrameDurationMs > 0 ? Math.round(1000 / averageFrameDurationMs) : null;
  fpsValue.textContent = fps === null ? "--" : `${Math.min(fps, 240)} FPS`;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(renderPixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function renderPixelRatio() {
  return Math.min(window.devicePixelRatio || 1, QUALITY_PRESETS[activeQualityTier].pixelRatioLimit);
}

function isTouchLike() {
  return matchMedia("(hover: none), (pointer: coarse)").matches;
}

function isSmallScreenMapTouch() {
  return window.innerWidth <= 700 || isTouchLike();
}
