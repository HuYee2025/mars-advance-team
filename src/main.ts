import * as THREE from "three";
import backgroundMusicUrl from "./assets/audio/mars-background-light.mp3?url";
import { createFufuCat, updateFufuCat } from "./cat";
import { createMarsEngineer, updateMarsEngineer } from "./player";
import {
  characters,
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
  PLANET_RADIUS,
  createMarsWorld,
  placeObjectOnPlanetNormal,
  planetNormal,
  updateElevators,
  updateMeteors,
  updateRovers,
  updateSolarArrays,
  type ElevatorControl,
  type GreenhouseDoorControl,
  type HabitatDoorControl,
  type Interactable,
  type Landmark,
} from "./world";
import "./style.css";

type LabelAnchor = {
  object: THREE.Object3D;
  element: HTMLDivElement;
  distance: number;
};

type InteractionAction = {
  id: "elevator" | "habitat" | "greenhouse" | "fufu" | "robot" | "oxygenSupply" | "motherCall" | "mission";
  label: string;
};

const sceneRoot = must<HTMLDivElement>("#scene-root");
const labelsRoot = must<HTMLDivElement>("#labels");
const joystick = must<HTMLDivElement>("#joystick");
const joystickKnob = must<HTMLDivElement>("#joystick-knob");
const mobileBoostButton = must<HTMLButtonElement>("#mobile-boost");
const mobileLampButton = must<HTMLButtonElement>("#mobile-lamp");
const mobileJumpButton = must<HTMLButtonElement>("#mobile-jump");
const titleScreen = must<HTMLDivElement>("#title-screen");
const enterButton = must<HTMLButtonElement>("#enter-base");
const storySummaryButton = must<HTMLButtonElement>("#story-summary");
const titleActionButtons = [enterButton, storySummaryButton] as const;
const hudToggle = must<HTMLButtonElement>("#hud-toggle");
const mapToggle = must<HTMLButtonElement>("#map-toggle");
const missionText = must<HTMLDivElement>("#mission-text");
const promptBox = must<HTMLDivElement>("#interaction-prompt");
const interactionChoice = must<HTMLDivElement>("#interaction-choice");
const scaleGunOverlay = must<HTMLElement>("#scale-gun-overlay");
const scaleGunTargetLabel = must<HTMLElement>("#scale-gun-target");
const scaleGunShrinkButton = must<HTMLButtonElement>("#scale-gun-shrink");
const scaleGunGrowButton = must<HTMLButtonElement>("#scale-gun-grow");
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
const mapList = must<HTMLDivElement>("#map-list");
const oxygenReadout = document.querySelector<HTMLDivElement>("#oxygen-readout");
const suitOxygenReadout = document.querySelector<HTMLDivElement>("#suit-oxygen-readout");
const staminaReadout = document.querySelector<HTMLDivElement>("#stamina-readout");
const powerReadout = document.querySelector<HTMLDivElement>("#power-readout");
const backgroundMusic = new Audio(backgroundMusicUrl);
const BACKGROUND_MUSIC_BASE_VOLUME = 0.14;
const MUSIC_LOOP_FADE_SECONDS = 5;
backgroundMusic.loop = true;
backgroundMusic.preload = "auto";
backgroundMusic.volume = BACKGROUND_MUSIC_BASE_VOLUME;

const scene = new THREE.Scene();
const clearSkyColor = new THREE.Color(0x030713);
const stormSkyColor = new THREE.Color(0x5b2417);
scene.background = clearSkyColor.clone();
scene.fog = new THREE.FogExp2(0x120a0a, 0.0014);

const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 900);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
const EARTH_TOTAL_SOLAR_IRRADIANCE = 1361.6;
const MARS_MEAN_DISTANCE_AU = 1.524;
const MARS_SUNLIGHT_RATIO = 1 / (MARS_MEAN_DISTANCE_AU * MARS_MEAN_DISTANCE_AU);
const EARTHLIKE_KEY_LIGHT = 7.2;
const MARS_TIME_SCALE = 10;
const MARS_SOL_SECONDS = 88775;
const CLEAR_FOG_DENSITY = 0.0014;
const STORM_FOG_DENSITY = 0.012;
const STORM_PERIOD_SECONDS = 4 * 60 * 60;
const STORM_DURATION_SECONDS = 1500;
const STORM_FADE_SECONDS = 260;
let sunLight: THREE.DirectionalLight | null = null;
let sunSprite: THREE.Sprite | null = null;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
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
player.scale.setScalar(0.76);
const playerContactShadow = createPlayerContactShadow();
scene.add(playerContactShadow);
const helmetLamp = new THREE.SpotLight(0xffd36c, 0, 10.5, Math.PI / 4.4, 0.8, 1.35);
const helmetLampTarget = new THREE.Object3D();
const helmetLampSpot = createHelmetLampSpot();
helmetLamp.visible = false;
helmetLampTarget.visible = false;
helmetLampSpot.visible = false;
helmetLamp.target = helmetLampTarget;
scene.add(helmetLamp, helmetLampTarget, helmetLampSpot);

const world = createMarsWorld(scene);
const fufuRig = createFufuCat();
const fufu = fufuRig.group;
scene.add(fufu);
const labels: LabelAnchor[] = world.landmarks.map(addLabel);
labels.push(addLabel({ label: "福福", object: fufu, x: world.fufuRescueSite.x, z: world.fufuRescueSite.z, labelDistance: 18, mapRange: 80 }));

const keyState = new Set<string>();
const playerVelocity = new THREE.Vector3();
const SPAWN_X = -18;
const SPAWN_Z = -124;
const SPAWN_TARGET_X = 18;
const SPAWN_TARGET_Z = 18;
const playerNormal = new THREE.Vector3();
const playerForward = new THREE.Vector3();
const PLAYER_ALTITUDE = 0.66;
const SHADOW_SURFACE_ALTITUDE = 0.035;
const MARS_GRAVITY = 3.71;
const SUITED_JUMP_SPEED = 4.2;
const JUMP_FORWARD_BOOST = 2.2;
const SUIT_OXYGEN_MAX = 100;
const SUIT_OXYGEN_DRAIN_PER_SECOND = 0.42;
const SUIT_OXYGEN_SPRINT_MULTIPLIER = 1.35;
const STAMINA_MAX = 100;
const STAMINA_DRAIN_PER_SECOND = 8;
const STAMINA_RECOVER_PER_SECOND = 7;
const MYSTERY_CODE = "HUYEE";
const FLIGHT_ASCEND_SPEED = 8.2;
const FLIGHT_DESCEND_SPEED = 8.2;
const FLIGHT_MIN_ALTITUDE = 1.2;
const FLIGHT_MAX_ALTITUDE = 96;
const SCALE_GUN_RANGE = 96;
const SCALE_GUN_DURATION_SECONDS = 60;
const SCALE_GUN_MIN_FACTOR = 1 / 3;
const SCALE_GUN_MAX_FACTOR = 3;
const mobileStick = { active: false, pointerId: null as number | null, x: 0, y: 0 };

type ScaleGunTarget = {
  label: string;
  object: THREE.Object3D;
};

type ScaleGunEffect = {
  baseScale: THREE.Vector3;
  factor: number;
  expiresAt: number;
};

type MainMissionStep =
  | "intro"
  | "m1_habitat"
  | "m1_oxygen"
  | "m1_solarC"
  | "m1_garage"
  | "m2_greenhouse"
  | "m2_storehouse"
  | "m2_lab"
  | "m2_solarB"
  | "m2_seed"
  | "m3_tower"
  | "m3_lab"
  | "m3_methane"
  | "m3_solarA"
  | "m3_garage"
  | "m3_mother"
  | "complete";
type SideMissionStep = "available" | "medical" | "habitat" | "cargoShip" | "garage" | "lab" | "storehouse" | "solarA" | "tower" | "complete";
type SideMissionId = "fufu" | "cargo" | "patrol";
type ElonMissionStep = "available" | "cargoShip" | "solarC" | "garage" | "storehouse" | "lab" | "complete";

const mainMissionTargets: Partial<Record<MainMissionStep, Interactable["id"]>> = {
  m1_habitat: "habitatCheck",
  m1_oxygen: "oxygen",
  m1_solarC: "solarC",
  m1_garage: "garage",
  m2_greenhouse: "greenhouse",
  m2_storehouse: "storehouse",
  m2_lab: "lab",
  m2_solarB: "solarB",
  m2_seed: "greenhouse",
  m3_tower: "tower",
  m3_lab: "lab",
  m3_methane: "methane",
  m3_solarA: "solarA",
  m3_garage: "garage",
  m3_mother: "habitatCheck",
};

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

const elonMissionTargets: Partial<Record<ElonMissionStep, Interactable["id"]>> = {
  cargoShip: "cargoShip",
  solarC: "solarC",
  garage: "garage",
  storehouse: "storehouse",
  lab: "lab",
};

const elonDialogueCycle: DialogueNodeId[] = ["elon_rules_1", "elon_base_1", "elon_mother_1", "elon_fufu_1", "elon_robots_1"];

let yaw = Math.PI * 0.15;
let pitch = 0.34;
let orbitYawOffset = 0;
let cameraDistance = 10;
const CAMERA_MIN_DISTANCE = 0.08;
const CAMERA_MAX_DISTANCE = 280;
let lastFrameTime = performance.now();
let elapsedTime = 0;
let started = false;
let activeInteractable: Interactable | null = null;
let activeElevator: ElevatorControl | null = null;
let activeHabitatDoor: HabitatDoorControl | null = null;
let ridingElevator: ElevatorControl | null = null;
let missionStep: MainMissionStep = "intro";
let messageUntil = 0;
let hudCollapsed = false;
let mapOpen = false;
let mapExpanded = false;
let selectedTitleActionIndex = 0;
let exitConfirmOpen = false;
let selectedExitConfirmIndex = 0;
let mapHoldTimer: ReturnType<typeof window.setTimeout> | null = null;
let mapHoldTriggered = false;
let mapZoom = 1;
let playerAltitudeOffset = 0;
let verticalVelocity = 0;
let grounded = true;
let rocketDoorOpen = false;
let insideRocket = false;
let stormStrength = 0;
let activeGreenhouseDoor: GreenhouseDoorControl | null = null;
let activeRobot: THREE.Group | null = null;
let activeFufu = false;
let activeOxygenSupply: string | null = null;
let suitOxygen = SUIT_OXYGEN_MAX;
let stamina = STAMINA_MAX;
let oxygenWarningShown = false;
let fufuRescued = false;
let mysteryCodeProgress = "";
let flightModeEnabled = false;
let hasScaleGun = false;
let scaleGunAiming = false;
let scaleGunTarget: ScaleGunTarget | null = null;
let scaleGunCameraDistanceBefore = 10;
let fufuSideStep: SideMissionStep = "available";
let cargoSideStep: SideMissionStep = "available";
let patrolSideStep: SideMissionStep = "available";
let elonSideStep: ElonMissionStep = "available";
let elonElevatorRepaired = false;
let elonMet = false;
let elonDialogueIndex = 0;
let fufuSpeed = 0;
let fufuAlert = 0;
let fufuWanderAngle = -2.25;
let fufuWanderDistance = 3.1;
let fufuNextWanderAt = 0;
let insideGreenhouse = false;
let lastRobotGreetingAt = -Infinity;
let helmetLampOn = false;
let controlsGuideOpen = false;
let controlsGuideUsed = false;
let activeDialogueNode: DialogueNodeId | null = null;
let dialogueOpen = false;
let pendingMotherCall: DialogueSceneId | null = null;
let gameStartElapsed = 0;
let introCallQueued = false;
let interactionActions: InteractionAction[] = [];
let selectedInteractionIndex = 0;
let interactionChoiceOpen = false;
let interactionChoiceSignature = "";
let selectedDialogueChoiceIndex = 0;
const dialogueState = {
  motherTrust: 0,
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
const scaleGunEffects = new Map<string, ScaleGunEffect>();

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    __marsDebug?: {
      teleportTo: (id: Interactable["id"]) => void;
      mission: () => string;
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
  };
}

resetPlayerToSpawn();
resetFufu();
bindInput();
onResize();
setMission("点击 ENTER BASE 进入《火星先遣队》。");
startBackgroundMusic();
animate();

function must<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing DOM node: ${selector}`);
  return node;
}

function buildLighting() {
  const marsKeyLight = EARTHLIKE_KEY_LIGHT * MARS_SUNLIGHT_RATIO;
  scene.add(new THREE.HemisphereLight(0xf7dcc2, 0x3f130b, 0.78));

  const sun = new THREE.DirectionalLight(0xffd2a3, marsKeyLight);
  sun.position.set(-36, 54, 28);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 140;
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  scene.add(sun);
  sunLight = sun;
  sunSprite = createVisibleSun(sun.position);
  scene.add(sunSprite);

  const rim = new THREE.DirectionalLight(0x8fc7ff, 0.48);
  rim.position.set(28, 16, -44);
  scene.add(rim);
}

function updateSolarLighting() {
  if (!sunLight || !sunSprite) return;
  const marsSolAngle = (elapsedTime * MARS_TIME_SCALE / MARS_SOL_SECONDS) * Math.PI * 2 + 2.26;
  const elevation = 0.42 + Math.sin(marsSolAngle * 0.37) * 0.08;
  const direction = new THREE.Vector3(
    Math.cos(marsSolAngle) * Math.cos(elevation),
    Math.sin(elevation),
    Math.sin(marsSolAngle) * Math.cos(elevation)
  ).normalize();
  sunLight.position.copy(direction).multiplyScalar(72);
  sunLight.intensity =
    EARTHLIKE_KEY_LIGHT * MARS_SUNLIGHT_RATIO * THREE.MathUtils.lerp(0.74, 1.08, Math.max(0, direction.y)) * THREE.MathUtils.lerp(1, 0.42, stormStrength);
  sunSprite.position.copy(direction).multiplyScalar(540);
  const sunMaterial = sunSprite.material as THREE.SpriteMaterial;
  const occluded = isSunOccludedByPlanet(sunSprite.position);
  sunSprite.visible = !occluded;
  sunMaterial.opacity = THREE.MathUtils.lerp(0.96, 0.2, stormStrength);
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
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 2, 128, 128, 124);
    gradient.addColorStop(0, "rgba(255, 255, 246, 1)");
    gradient.addColorStop(0.08, "rgba(255, 252, 220, 1)");
    gradient.addColorStop(0.2, "rgba(255, 224, 138, 0.9)");
    gradient.addColorStop(0.46, "rgba(255, 172, 78, 0.44)");
    gradient.addColorStop(1, "rgba(255, 164, 84, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    ctx.beginPath();
    ctx.arc(128, 128, 9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 248, 0.98)";
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    })
  );
  sprite.position.copy(direction.clone().normalize().multiplyScalar(540));
  sprite.scale.set(46, 46, 1);
  return sprite;
}

function createPlayerContactShadow() {
  const shadowTexture = createRadialShadowTexture();
  const material = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    color: 0x120906,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.72, 32), material);
  mesh.renderOrder = 2;
  return mesh;
}

function createHelmetLampSpot() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
    gradient.addColorStop(0, "rgba(255, 211, 108, 0.48)");
    gradient.addColorStop(0.48, "rgba(255, 211, 108, 0.28)");
    gradient.addColorStop(0.82, "rgba(255, 211, 108, 0.09)");
    gradient.addColorStop(1, "rgba(255, 211, 108, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.renderOrder = 2;
  return mesh;
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

function bindInput() {
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
    if (handleMysteryCodeKey(event)) return;
    if (started && exitConfirmOpen) {
      handleExitConfirmKey(event);
      return;
    }
    if (event.code === "Backquote") {
      event.preventDefault();
      showControlsGuide(true);
      return;
    }
    if (!started && handleTitleScreenKey(event)) return;
    if (!started) return;
    if (dialogueOpen) {
      handleDialogueKey(event);
      return;
    }
    if (scaleGunAiming && (event.code === "KeyQ" || event.code === "KeyE")) {
      event.preventDefault();
      fireScaleGun(event.code === "KeyE" ? "grow" : "shrink");
      return;
    }
    if (interactionChoiceOpen && interactionActions.length > 1 && (event.code === "KeyQ" || event.code === "KeyE")) {
      event.preventDefault();
      if (interactionActions.length === 2) {
        selectedInteractionIndex = event.code === "KeyQ" ? 0 : 1;
      }
      executeSelectedInteraction();
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
      toggleHelmetLamp();
      return;
    }
    if (event.code === "KeyX") {
      event.preventDefault();
      toggleScaleGunAiming();
      return;
    }
    if (event.code === "KeyC") {
      event.preventDefault();
      setFirstPersonCamera();
      return;
    }
    if ((event.code === "Enter" || event.code === "NumpadEnter") && interactionChoiceOpen && interactionActions.length > 1) {
      event.preventDefault();
      executeSelectedInteraction();
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (flightModeEnabled && canUseFlightMode()) keyState.add(event.code);
      else jump();
      return;
    }
    if (event.code === "Equal" || event.code === "NumpadAdd") {
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
    keyState.delete(event.code);
  });
  window.addEventListener("blur", () => {
    keyState.clear();
    clearMapHoldTimer();
    setMapExpanded(false);
    resetStick();
  });
  window.addEventListener("resize", onResize);

  renderer.domElement.addEventListener("pointerdown", () => {
    if (started && !isTouchLike()) renderer.domElement.requestPointerLock();
  });
  window.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== renderer.domElement) return;
    orbitYawOffset = THREE.MathUtils.clamp(orbitYawOffset - event.movementX * 0.0022, -0.85, 0.85);
    pitch = insideRocket
      ? THREE.MathUtils.clamp(pitch - event.movementY * 0.0015, 0.02, 1.68)
      : THREE.MathUtils.clamp(pitch - event.movementY * 0.0015, 0.12, 0.92);
  });
  window.addEventListener("wheel", (event) => {
    if (!started || exitConfirmOpen) return;
    if (mapOpen) {
      event.preventDefault();
      adjustMapZoom(-Math.sign(event.deltaY));
      return;
    }
    adjustCameraDistance(Math.sign(event.deltaY));
  }, { passive: false });

  joystick.addEventListener("pointerdown", (event) => {
    if (!started || exitConfirmOpen) return;
    mobileStick.active = true;
    mobileStick.pointerId = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    updateStick(event);
  });
  joystick.addEventListener("pointermove", (event) => {
    if (!mobileStick.active || mobileStick.pointerId !== event.pointerId) return;
    updateStick(event);
  });
  joystick.addEventListener("pointerup", resetStick);
  joystick.addEventListener("pointercancel", resetStick);

  mobileBoostButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (!started || exitConfirmOpen || dialogueOpen) return;
    keyState.add("ShiftLeft");
    mobileBoostButton.setPointerCapture(event.pointerId);
  });
  mobileBoostButton.addEventListener("pointerup", (event) => {
    event.preventDefault();
    keyState.delete("ShiftLeft");
  });
  mobileBoostButton.addEventListener("pointercancel", (event) => {
    event.preventDefault();
    keyState.delete("ShiftLeft");
  });
  mobileBoostButton.addEventListener("lostpointercapture", () => {
    keyState.delete("ShiftLeft");
  });
  mobileJumpButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (started && !exitConfirmOpen && !dialogueOpen) jump();
  });
  mobileLampButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (started && !exitConfirmOpen && !dialogueOpen) toggleHelmetLamp();
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
  if (!/^[A-Z]$/.test(key)) return false;

  const next = `${mysteryCodeProgress}${key}`;
  if (MYSTERY_CODE.startsWith(next)) {
    mysteryCodeProgress = next;
    event.preventDefault();
    if (mysteryCodeProgress === MYSTERY_CODE) {
      mysteryCodeProgress = "";
      setFlightModeEnabled(!flightModeEnabled);
    }
    return true;
  }

  mysteryCodeProgress = MYSTERY_CODE.startsWith(key) ? key : "";
  if (mysteryCodeProgress) event.preventDefault();
  return mysteryCodeProgress.length > 0;
}

function setFlightModeEnabled(enabled: boolean) {
  flightModeEnabled = enabled;
  playDingDong();
  if (enabled && started && canUseFlightMode()) {
    grounded = false;
    verticalVelocity = 0;
    playerAltitudeOffset = Math.max(playerAltitudeOffset, FLIGHT_MIN_ALTITUDE);
  }
  if (!enabled) {
    keyState.delete("Space");
    keyState.delete("ControlLeft");
    keyState.delete("ControlRight");
  }
}

function canUseFlightMode() {
  return started && !world.habitatDoor.occupied && !insideGreenhouse && !insideRocket && !ridingElevator;
}

function handleTitleScreenKey(event: KeyboardEvent) {
  if (event.code === "ArrowUp" || event.code === "ArrowDown") {
    event.preventDefault();
    const direction = event.code === "ArrowUp" ? -1 : 1;
    const nextIndex = (selectedTitleActionIndex + direction + titleActionButtons.length) % titleActionButtons.length;
    selectTitleAction(nextIndex, true, true);
    return true;
  }
  if (event.code === "Enter" || event.code === "NumpadEnter" || event.code === "Space") {
    event.preventDefault();
    activateSelectedTitleAction();
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
    window.location.href = "/story-overview.html";
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
  hudToggle.setAttribute("aria-pressed", String(hudCollapsed));
  hudToggle.setAttribute("aria-label", hudCollapsed ? "显示界面信息" : "隐藏界面信息");
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
  clearMapHoldTimer();
  document.body.classList.remove("map-open", "map-expanded");
  mapOverlay.setAttribute("aria-hidden", "true");
  updateMapButtonState();
}

function toggleMap() {
  if (!started) return;
  mapOpen = !mapOpen;
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
  mapHoldTimer = window.setTimeout(() => {
    mapHoldTimer = null;
    mapHoldTriggered = true;
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
    mapHoldTriggered = false;
  }
}

function openMap() {
  if (!started || mapOpen) return;
  mapOpen = true;
  document.body.classList.add("map-open");
  mapOverlay.setAttribute("aria-hidden", "false");
  updateMapButtonState();
}

function updateMapButtonState() {
  mapToggle.setAttribute("aria-pressed", String(mapOpen));
  mapToggle.setAttribute("aria-label", mapOpen ? "关闭基地地图" : "打开基地地图");
}

function setMapExpanded(expanded: boolean) {
  if (mapExpanded === expanded) return;
  mapExpanded = expanded;
  document.body.classList.toggle("map-expanded", mapExpanded);
  if (mapOpen) updateMap();
}

function clearMapHoldTimer() {
  if (!mapHoldTimer) return;
  window.clearTimeout(mapHoldTimer);
  mapHoldTimer = null;
}

function toggleHelmetLamp() {
  if (!started) return;
  helmetLampOn = !helmetLampOn;
}

function toggleScaleGunAiming(force?: boolean) {
  if (!started) return;
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
  scaleGunAiming = next;
  if (scaleGunAiming) {
    scaleGunCameraDistanceBefore = cameraDistance;
    cameraDistance = CAMERA_MIN_DISTANCE;
    camera.fov = 46;
    showControlsGuide(false);
    closeMapUi();
  } else {
    cameraDistance = Math.max(scaleGunCameraDistanceBefore, 1.2);
    camera.fov = 54;
    scaleGunTarget = null;
  }
  camera.updateProjectionMatrix();
  updateScaleGunOverlay();
}

function canUseScaleGun() {
  return started && hasScaleGun && !dialogueOpen && !exitConfirmOpen && !world.habitatDoor.occupied && !insideGreenhouse && !insideRocket && !ridingElevator;
}

function updateScaleGun() {
  restoreExpiredScaleGunEffects();
  if (scaleGunAiming && !canUseScaleGun()) {
    toggleScaleGunAiming(false);
    return;
  }
  if (!scaleGunAiming) {
    updateScaleGunOverlay();
    return;
  }
  scaleGunTarget = findScaleGunTarget();
  updateScaleGunOverlay();
}

function updateScaleGunOverlay() {
  const visible = started && scaleGunAiming && hasScaleGun;
  scaleGunOverlay.classList.toggle("is-visible", visible);
  scaleGunOverlay.setAttribute("aria-hidden", String(!visible));
  scaleGunTargetLabel.textContent = visible && scaleGunTarget ? scaleGunTarget.label : "未锁定目标";
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
  const addTarget = (label: string, object: THREE.Object3D) => {
    if (!object.visible || seen.has(object.uuid)) return;
    seen.add(object.uuid);
    targets.push({ label, object });
  };

  for (const landmark of world.landmarks) addTarget(landmark.label, landmark.object);
  for (const object of world.unnumberedObjects) addTarget("未知物体", object.object);
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
  scaleGunTarget.object.scale.copy(effect.baseScale).multiplyScalar(nextFactor);
  showDialogue("缩放枪", `${scaleGunTarget.label} ${mode === "grow" ? "放大" : "缩小"}到 ${nextFactor.toFixed(2)}x，60 秒后恢复。`, 2.2);
  playUiBeep();
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
    if (object) object.scale.copy(effect.baseScale);
    scaleGunEffects.delete(uuid);
  }
}

function clearScaleGunEffects() {
  for (const [uuid, effect] of scaleGunEffects) {
    const object = scene.getObjectByProperty("uuid", uuid);
    if (object) object.scale.copy(effect.baseScale);
  }
  scaleGunEffects.clear();
}

function updateHelmetLamp() {
  const visible = started && helmetLampOn && !world.habitatDoor.occupied && !insideGreenhouse && !insideRocket;
  helmetLamp.visible = visible;
  helmetLampTarget.visible = visible;
  helmetLampSpot.visible = visible;
  if (!visible) {
    helmetLamp.intensity = 0;
    return;
  }

  const forward = playerForward.clone().projectOnPlane(playerNormal).normalize();
  const lampNormal = playerNormal.clone().addScaledVector(forward, 0.08).normalize();
  const spotNormal = playerNormal.clone().addScaledVector(forward, 4 / PLANET_RADIUS).normalize();
  const lampPosition = lampNormal.clone().multiplyScalar(PLANET_RADIUS + PLAYER_ALTITUDE + 0.78);
  placeObjectOnPlanetNormal(helmetLampSpot, spotNormal, 0.052, 0);

  helmetLamp.position.copy(lampPosition).addScaledVector(forward, 0.22);
  helmetLampTarget.position.copy(helmetLampSpot.position).addScaledVector(spotNormal, 0.08);
  helmetLamp.intensity = 4.4;

  helmetLampSpot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), spotNormal);
  helmetLampSpot.scale.setScalar(4.2);
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

function adjustMapZoom(direction: number) {
  const factor = direction > 0 ? 1.18 : 1 / 1.18;
  mapZoom = THREE.MathUtils.clamp(mapZoom * factor, 0.65, 3.2);
  updateMap();
}

function jump() {
  if (!grounded) return;
  grounded = false;
  verticalVelocity = SUITED_JUMP_SPEED;
  playerVelocity.addScaledVector(playerForward, JUMP_FORWARD_BOOST);
}

function startGame() {
  if (started) return;
  playUiBeep();
  started = true;
  resetQuestState();
  resetDialogueState();
  gameStartElapsed = elapsedTime;
  introCallQueued = false;
  cameraDistance = 10;
  camera.fov = 54;
  camera.updateProjectionMatrix();
  pitch = 0.34;
  orbitYawOffset = 0;
  mapOpen = false;
  exitConfirmOpen = false;
  helmetLampOn = false;
  activeHabitatDoor = null;
  activeGreenhouseDoor = null;
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
  document.body.classList.remove("map-open");
  mapOverlay.setAttribute("aria-hidden", "true");
  updateMapButtonState();
  playerAltitudeOffset = 0;
  verticalVelocity = 0;
  grounded = true;
  resetSuitOxygen();
  setScaleGunOwned(false);
  clearScaleGunEffects();
  resetPlayerToSpawn();
  resetFufu();
  resetStick();
  startBackgroundMusic();
  titleScreen.classList.add("is-hidden");
  document.body.classList.add("is-playing");
  setCurrentMissionText();
}

function returnToTitle() {
  if (!started) return;
  started = false;
  resetQuestState();
  hudCollapsed = false;
  mapOpen = false;
  mapExpanded = false;
  exitConfirmOpen = false;
  selectedExitConfirmIndex = 0;
  helmetLampOn = false;
  pendingMotherCall = null;
  introCallQueued = false;
  controlsGuideOpen = false;
  messageUntil = 0;
  resetSuitOxygen();
  setScaleGunOwned(false);
  clearScaleGunEffects();
  closeDialogue();
  clearMapHoldTimer();
  keyState.clear();
  resetPlayerToSpawn();
  resetFufu();
  resetStick();
  updateHelmetLamp();
  document.body.classList.remove("is-playing", "hud-collapsed", "map-open", "map-expanded");
  exitConfirm.classList.remove("is-visible");
  exitConfirm.setAttribute("aria-hidden", "true");
  document.body.classList.remove("exit-confirm-open");
  controlsGuide.classList.remove("is-visible");
  controlsGuide.setAttribute("aria-hidden", "true");
  hudToggle.setAttribute("aria-pressed", "false");
  hudToggle.setAttribute("aria-label", "隐藏界面信息");
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

function resetStick() {
  mobileStick.active = false;
  mobileStick.pointerId = null;
  mobileStick.x = 0;
  mobileStick.y = 0;
  joystickKnob.style.transform = "translate(0, 0)";
}

function animate() {
  const now = performance.now();
  const delta = Math.min((now - lastFrameTime) / 1000, 0.033);
  lastFrameTime = now;
  elapsedTime += delta;

  updateWeather();
  updateScheduledCalls();
  updateSolarLighting();
  if (sunLight) updateSolarArrays(world.solarArrays, sunLight.position);
  updateElevators(world.elevators, delta);
  const speed = started ? updatePlayer(delta) : 0;
  updateSuitOxygen(delta);
  updateCamera(delta);
  updateRovers(world.rovers, elapsedTime, world.colliders);
  updateFufu(delta);
  updateMeteors(world.meteors, elapsedTime);
  updateHabitatOccupancy();
  updateLabels();
  updateMap();
  updateMissionState();
  updateReadouts();
  updateMarsEngineer(playerRig, speed, elapsedTime, flightModeEnabled && canUseFlightMode(), isFlightAscending() || isFlightDescending());
  updateFufuCat(fufuRig, fufuSpeed, elapsedTime, fufuAlert);
  updateScaleGun();
  updatePlayerContactShadow();
  updateHelmetLamp();
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

function startBackgroundMusic() {
  if (!started) return;
  if (!backgroundMusic.paused) return;
  backgroundMusic.volume = BACKGROUND_MUSIC_BASE_VOLUME;
  backgroundMusic.play().catch(() => {
    // Browser audio policies can still block playback in unusual cases.
  });
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
  if (backgroundMusic.paused || !Number.isFinite(backgroundMusic.duration) || backgroundMusic.duration <= MUSIC_LOOP_FADE_SECONDS) {
    return;
  }
  const remaining = backgroundMusic.duration - backgroundMusic.currentTime;
  const fade = remaining <= MUSIC_LOOP_FADE_SECONDS ? THREE.MathUtils.clamp(remaining / MUSIC_LOOP_FADE_SECONDS, 0, 1) : 1;
  backgroundMusic.volume = BACKGROUND_MUSIC_BASE_VOLUME * fade;
}

function updateWeather() {
  const cycle = (elapsedTime * MARS_TIME_SCALE + 13200) % STORM_PERIOD_SECONDS;
  const fadeIn = THREE.MathUtils.smoothstep(cycle, 0, STORM_FADE_SECONDS);
  const fadeOut = 1 - THREE.MathUtils.smoothstep(cycle, STORM_DURATION_SECONDS - STORM_FADE_SECONDS, STORM_DURATION_SECONDS);
  stormStrength = cycle < STORM_DURATION_SECONDS ? Math.min(fadeIn, fadeOut) : 0;

  const fog = scene.fog as THREE.FogExp2;
  fog.density = THREE.MathUtils.lerp(CLEAR_FOG_DENSITY, STORM_FOG_DENSITY, stormStrength);
  fog.color.copy(new THREE.Color(0x120a0a).lerp(new THREE.Color(0x8d3a20), stormStrength));
  if (scene.background instanceof THREE.Color) scene.background.copy(clearSkyColor).lerp(stormSkyColor, stormStrength * 0.82);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(1.08, 0.72, stormStrength);
}

function updateScheduledCalls() {
  if (!started || dialogueOpen || pendingMotherCall || introCallQueued) return;
  if (missionStep !== "intro") return;
  if (elapsedTime - gameStartElapsed < 60) return;
  introCallQueued = true;
  queueMotherCall("intro", "火星基地中控 AI Mother 正在呼叫。");
}

function updateRobotEncounters() {
  if (!started || world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator) return;
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

function updatePlayer(delta: number) {
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
  if (flightModeEnabled && canUseFlightMode()) {
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
  return playerVelocity.length();
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
    playerAltitudeOffset = Math.max(FLIGHT_MIN_ALTITUDE, playerAltitudeOffset - FLIGHT_DESCEND_SPEED * delta);
  } else {
    playerAltitudeOffset = Math.max(FLIGHT_MIN_ALTITUDE, playerAltitudeOffset);
  }
  grounded = false;
  verticalVelocity = 0;
  placePlayerOnPlanet();
  return playerVelocity.length() + (verticalInput !== 0 ? FLIGHT_ASCEND_SPEED : 0);
}

function isFlightAscending() {
  return keyState.has("Space");
}

function isFlightDescending() {
  return keyState.has("ControlLeft") || keyState.has("ControlRight");
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
    const radius = 3.3;
    proposedLocal.y = 0.62;
    proposedLocal.z = THREE.MathUtils.clamp(proposedLocal.z, -3.25, 3.05);
    const flat = new THREE.Vector2(proposedLocal.x, proposedLocal.z);
    if (flat.length() > radius) flat.setLength(radius);
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

function updatePlayerContactShadow() {
  if (ridingElevator || world.habitatDoor.occupied) {
    playerContactShadow.visible = false;
    return;
  }
  const shadowNormal = playerNormal.clone();
  placeObjectOnPlanetNormal(playerContactShadow, shadowNormal, SHADOW_SURFACE_ALTITUDE, headingFromForward(shadowNormal, playerForward));
  playerContactShadow.rotateX(-Math.PI / 2);
  const jumpT = THREE.MathUtils.clamp(playerAltitudeOffset / 2.8, 0, 1);
  const scale = THREE.MathUtils.lerp(1.18, 0.46, jumpT);
  playerContactShadow.scale.set(scale * 1.1, scale * 0.72, 1);
  const material = playerContactShadow.material as THREE.MeshBasicMaterial;
  material.opacity = THREE.MathUtils.lerp(0.5, 0.16, jumpT);
  playerContactShadow.visible = started;
}

function updateCamera(delta: number) {
  if (!started) {
    const distance = 230;
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

  const normal = playerNormal.clone();
  if (cameraDistance <= 0.9 || world.habitatDoor.occupied || insideGreenhouse || insideRocket) {
    const eye = player.position.clone().addScaledVector(normal, insideRocket ? 1.38 : 1.78);
    const lookForward = playerForward
      .clone()
      .applyAxisAngle(normal, orbitYawOffset)
      .projectOnPlane(normal)
      .normalize();
    const pitchOffset = insideRocket ? THREE.MathUtils.clamp(pitch - 0.24, -0.46, 1.28) : THREE.MathUtils.clamp(pitch - 0.34, -0.22, 0.36);
    const lookDirection = lookForward.clone().multiplyScalar(Math.cos(pitchOffset)).addScaledVector(normal, Math.sin(pitchOffset)).normalize();
    const desired = eye
      .clone()
      .addScaledVector(lookForward, insideRocket ? -0.92 : 0)
      .addScaledVector(normal, insideRocket ? -0.12 : 0.03);
    camera.position.lerp(desired, 1 - Math.pow(0.00002, delta));
    camera.up.copy(normal);
    camera.lookAt(eye.clone().addScaledVector(lookDirection, 24));
    playerRig.visual.visible = false;
    orbitYawOffset *= Math.pow(0.03, delta);
    return;
  }

  const closeT = 1 - THREE.MathUtils.smoothstep(cameraDistance, 0.08, 2.2);
  const targetHeight = THREE.MathUtils.lerp(1.35, 1.55, closeT);
  const target = player.position.clone().addScaledVector(normal, targetHeight);
  const distance = cameraDistance;
  const activePitch = pitch;
  const cameraForward = playerForward.clone().applyAxisAngle(normal, orbitYawOffset).projectOnPlane(normal).normalize();
  const backDistance = Math.cos(activePitch) * distance * (1 - closeT * 0.92);
  const upDistance = Math.sin(activePitch) * distance + THREE.MathUtils.lerp(2.4, 0.03, closeT);
  const offset = cameraForward.multiplyScalar(-backDistance).addScaledVector(normal, upDistance);
  const desired = target.clone().add(offset);
  camera.position.lerp(desired, 1 - Math.pow(0.00005, delta));
  camera.up.copy(normal);
  camera.lookAt(closeT > 0.85 ? target.clone().addScaledVector(cameraForward, 20) : target);
  playerRig.visual.visible = cameraDistance > 1.15;
  orbitYawOffset *= Math.pow(0.03, delta);
}

function placePlayerOnPlanet() {
  placeObjectOnPlanetNormal(player, playerNormal, PLAYER_ALTITUDE + playerAltitudeOffset, headingFromForward(playerNormal, playerForward));
}

function resetPlayerToSpawn() {
  ridingElevator = null;
  activeElevator = null;
  activeHabitatDoor = null;
  activeGreenhouseDoor = null;
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
  playerAltitudeOffset = 0;
  verticalVelocity = 0;
  grounded = true;
  playerRig.visual.visible = true;
  camera.fov = 54;
  camera.updateProjectionMatrix();
  placePlayerOnPlanet();
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
  placeObjectOnPlanetNormal(fufu, fufuNormal, 0.26, world.fufuRescueSite.yaw);
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

  if (world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator) {
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
    placeObjectOnPlanetNormal(fufu, fufuNormal, 0.26, headingFromForward(fufuNormal, fufuForward));
    settleFufuAnimation(delta);
    return;
  }

  if (targetDistance < 1.15 && playerDistance < 7.5) {
    const relaxedForward = playerForward.clone().projectOnPlane(fufuNormal).normalize();
    turnFufuToward(relaxedForward, delta, 0.7);
    placeObjectOnPlanetNormal(fufu, fufuNormal, 0.26, headingFromForward(fufuNormal, fufuForward));
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
  placeObjectOnPlanetNormal(fufu, fufuNormal, 0.26, headingFromForward(fufuNormal, fufuForward));
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

  placeObjectOnPlanetNormal(fufu, fufuNormal, 0.26, headingFromForward(fufuNormal, fufuForward));
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

  for (const collider of world.colliders) {
    if (collider.enabled && !collider.enabled()) continue;
    const colliderNormal = new THREE.Vector3();
    if (collider.dynamicObject) {
      collider.center.set(collider.dynamicObject.userData.planetX ?? 0, collider.dynamicObject.userData.planetZ ?? 0);
      collider.dynamicObject.getWorldPosition(colliderNormal).normalize();
    } else {
      planetNormal(collider.center.x, collider.center.y, colliderNormal);
    }

    const minDistance = playerRadius + collider.radius;
    const dot = THREE.MathUtils.clamp(current.dot(colliderNormal), -1, 1);
    const distance = Math.acos(dot) * PLANET_RADIUS;
    if (distance < minDistance) {
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
  if (dialogueOpen) {
    activeInteractable = null;
    activeElevator = null;
    activeHabitatDoor = null;
    activeGreenhouseDoor = null;
    activeRobot = null;
    activeFufu = false;
    activeOxygenSupply = null;
    interactionActions = [];
    interactionChoiceOpen = false;
    interactionChoiceSignature = "";
    promptBox.textContent = "";
    promptBox.classList.remove("is-visible");
    interactionChoice.classList.remove("is-visible", "is-touch-entry", "is-drawer-open");
    interactionChoice.setAttribute("aria-hidden", "true");
    document.body.classList.remove("interaction-drawer-open");
    dialogueBox.classList.remove("is-visible");
    return;
  }
  activeInteractable = null;
  activeElevator = findActiveElevator();
  activeHabitatDoor = findActiveHabitatDoor();
  activeGreenhouseDoor = findActiveGreenhouseDoor();
  activeRobot = null;
  activeFufu = false;
  activeOxygenSupply = null;
  let bestDistance = Infinity;
  for (const item of world.interactables) {
    const pos = new THREE.Vector3();
    item.object.getWorldPosition(pos);
    const distance = pos.distanceTo(player.position);
    const matchesMission = isActiveMissionInteractable(item.id);
    if (matchesMission && distance < item.radius && distance < bestDistance) {
      bestDistance = distance;
      activeInteractable = item;
    }
  }
  activeFufu = findActiveFufu();
  activeRobot = findActiveRobot();
  activeOxygenSupply = findActiveOxygenSupply();
  interactionActions = buildInteractionActions();
  if (selectedInteractionIndex >= interactionActions.length) selectedInteractionIndex = 0;
  updateInteractionPrompts();
  dialogueBox.classList.toggle("is-visible", performance.now() < messageUntil);
}

function buildInteractionActions() {
  const actions: InteractionAction[] = [];
  if (activeElevator) actions.push({ id: "elevator", label: elevatorPrompt(activeElevator).replace(/^按 E /, "") });
  if (activeHabitatDoor) actions.push({ id: "habitat", label: world.habitatDoor.occupied ? "离开居住舱" : "进入居住舱" });
  if (activeGreenhouseDoor) actions.push({ id: "greenhouse", label: insideGreenhouse ? "离开温室生态舱" : "进入温室生态舱" });
  if (activeInteractable && !(activeHabitatDoor && activeInteractable.id === "habitatCheck")) actions.push({ id: "mission", label: activeInteractable.prompt.replace(/^按 E /, "") });
  if (activeFufu) actions.push({ id: "fufu", label: "安抚 福福" });
  if (activeRobot) actions.push({ id: "robot", label: "与维修机器人通话" });
  if (activeOxygenSupply) actions.push({ id: "oxygenSupply", label: suitOxygen >= 99 ? `${activeOxygenSupply} 氧气包已满` : `更换氧气背包（${activeOxygenSupply}）` });
  if (pendingMotherCall) actions.push({ id: "motherCall", label: "接听 Mother 呼叫" });
  return actions;
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
  promptBox.textContent = interactionActions.length === 1 ? `E ${interactionActions[0].label}` : "";
  promptBox.classList.toggle("is-visible", interactionActions.length === 1);
}

function renderInteractionChoice() {
  interactionChoice.innerHTML = "";
  if (interactionActions.length === 0) {
    interactionChoiceSignature = "";
    interactionChoice.classList.remove("is-visible", "is-touch-entry", "is-drawer-open");
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
  interactionChoice.classList.remove("is-touch-entry", "is-drawer-open");
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
  interactionChoice.classList.toggle("is-touch-entry", !interactionChoiceOpen);
  interactionChoice.classList.toggle("is-drawer-open", interactionChoiceOpen);
  document.body.classList.toggle("interaction-drawer-open", interactionChoiceOpen);

  if (!interactionChoiceOpen) {
    const entryButton = document.createElement("button");
    entryButton.className = "interaction-entry-button";
    entryButton.type = "button";
    entryButton.dataset.openInteractions = "true";
    const actionCount = interactionActions.length;
    const label = actionCount === 1 ? interactionActions[0].label : `${actionCount} 个可互动项`;
    const title = document.createElement("strong");
    title.textContent = "互动";
    const detail = document.createElement("span");
    detail.textContent = label;
    entryButton.append(title, detail);
    interactionChoice.appendChild(entryButton);
  } else {
    const header = document.createElement("div");
    header.className = "interaction-sheet-head";
    const title = document.createElement("span");
    title.textContent = "选择互动";
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.dataset.closeInteractions = "true";
    closeButton.textContent = "收起";
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
  if (action.id === "fufu") {
    rescueFufu();
    return;
  }
  if (action.id === "robot" && activeRobot) {
    activeRobot.userData.pauseUntil = elapsedTime + 6;
    openRobotBriefing(activeRobot);
    return;
  }
  if (action.id === "oxygenSupply" && activeOxygenSupply) {
    refillSuitOxygen(activeOxygenSupply);
    return;
  }
  if (action.id === "motherCall" && pendingMotherCall) {
    const scene = pendingMotherCall;
    pendingMotherCall = null;
    openDialogueScene(scene);
    return;
  }
  if (action.id === "mission" && activeInteractable) {
    interactMission(activeInteractable);
  }
}

function interactElevator() {
  if (activeElevator) {
    if (isReturnShipElevator(activeElevator) && !elonElevatorRepaired) {
      startElonElevatorRepairQuest();
      return;
    }
    if (insideRocket) {
      exitRocketInterior();
      return;
    }
    if (isAtRocketHatch()) {
      if (isReturnShipElevator(activeElevator)) {
        openElonDialogue();
        return;
      }
      enterRocketInterior();
      return;
    }
    toggleElevator(activeElevator);
    return;
  }
}

function openRobotBriefing(robot: THREE.Group) {
  const label = typeof robot.userData.label === "string" ? robot.userData.label : "维修机器人";
  const facilityLabel = typeof robot.userData.facilityLabel === "string" ? robot.userData.facilityLabel : "基地设施";
  const briefing =
    typeof robot.userData.briefing === "string"
      ? robot.userData.briefing
      : "A-12 在线。当前服从 Mother 维修队列。可执行：管线检查、密封、阵列固定、低速搬运。";
  characters.repairRobot.name = label;
  characters.repairRobot.callsign = facilityLabel;
  dialogueNodes.robot_status.text = `${label} 在线。我负责 ${facilityLabel}。${briefing}`;
  openDialogueScene("robot", robotDialogueStartNodes[label] ?? "robot_status");
}

function interactMission(interactable: Interactable) {
  if (interactable.id === "monolith") {
    openDialogueScene("monolith");
  } else if (isElonSideQuestTarget(interactable.id)) {
    advanceSideQuest(interactable.id);
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

function findActiveFufu() {
  if (!started || fufuRescued || world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator) return false;
  return fufu.position.distanceTo(player.position) < 3.4;
}

function rescueFufu() {
  fufuRescued = true;
  activeFufu = false;
  fufuForward.copy(playerForward);
  fufuSideStep = "medical";
  showDialogue("福福", "喵。它从残骸保温层旁钻出来，绕着你的靴子转了一圈。Mother 标记：未登记小型生命体，请先执行医疗舱隔离扫描。", 5.6);
  setCurrentMissionText();
}

function findActiveOxygenSupply() {
  if (!started || dialogueOpen || world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator) return null;
  if (suitOxygen >= 99) return null;
  const coordinate = playerMapCoordinate();
  const supplyPoints = [
    { label: "居住舱补给柜", x: 11, z: 62, radius: 12 },
    { label: "氧气生产站", x: -48.2, z: 40.4, radius: 15 },
    { label: "登陆飞船补给舱", x: 59, z: 21.4, radius: 14 },
  ];

  let nearest: string | null = null;
  let nearestDistance = Infinity;
  for (const point of supplyPoints) {
    const distance = Math.hypot(coordinate.x - point.x, coordinate.z - point.z);
    if (distance < point.radius && distance < nearestDistance) {
      nearest = point.label;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function resetSuitOxygen() {
  suitOxygen = SUIT_OXYGEN_MAX;
  stamina = STAMINA_MAX;
  oxygenWarningShown = false;
}

function resetRunUiAfterRespawn() {
  pendingMotherCall = null;
  introCallQueued = missionStep !== "intro";
  if (missionStep === "intro") gameStartElapsed = elapsedTime;
  hudCollapsed = false;
  helmetLampOn = false;
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
  activeOxygenSupply = null;
  resetDialogueState();
  closeMapUi();
  showControlsGuide(false);
  keyState.clear();
  resetStick();
  document.body.classList.remove("hud-collapsed");
  hudToggle.setAttribute("aria-pressed", "false");
  hudToggle.setAttribute("aria-label", "隐藏界面信息");
  promptBox.textContent = "";
  promptBox.classList.remove("is-visible");
  interactionChoice.classList.remove("is-visible");
  interactionChoice.setAttribute("aria-hidden", "true");
  dialogueBox.innerHTML = "";
  dialogueBox.classList.remove("is-visible");
  setCurrentMissionText();
}

function refillSuitOxygen(label: string) {
  resetSuitOxygen();
  showDialogue(label, "氧气背包已更换。剩余氧气 100%。", 2.8);
}

function updateSuitOxygen(delta: number) {
  if (!started || dialogueOpen || world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator) return;
  const moving = playerVelocity.length() > 0.6;
  const sprinting = moving && (keyState.has("ShiftLeft") || keyState.has("ShiftRight"));
  const drain = SUIT_OXYGEN_DRAIN_PER_SECOND * (sprinting ? SUIT_OXYGEN_SPRINT_MULTIPLIER : 1);
  suitOxygen = Math.max(0, suitOxygen - drain * delta);
  if (sprinting) stamina = Math.max(0, stamina - STAMINA_DRAIN_PER_SECOND * delta);
  else stamina = Math.min(STAMINA_MAX, stamina + STAMINA_RECOVER_PER_SECOND * delta);
  if (suitOxygen <= 20 && !oxygenWarningShown) {
    oxygenWarningShown = true;
    showDialogue("生命维持", "氧气背包低于 20%。寻找补给点更换。", 4);
  }
  if (suitOxygen <= 0) respawnAfterOxygenDepleted();
}

function respawnAfterOxygenDepleted() {
  resetSuitOxygen();
  resetPlayerToSpawn();
  resetRunUiAfterRespawn();
  showDialogue("生命维持", "氧气耗尽。已从出发点重新同步。", 4);
}

function findActiveHabitatDoor() {
  const door = world.habitatDoor;
  const doorWorld = door.root.localToWorld(new THREE.Vector3(0, -0.48, door.occupied ? -2.18 : -2.76));
  const distance = doorWorld.distanceTo(player.position);
  if (door.occupied) return door;
  return distance < door.promptRadius ? door : null;
}

function findActiveRobot() {
  if (!started || world.habitatDoor.occupied || insideGreenhouse || insideRocket || ridingElevator) return null;
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
  return nearestRobot && nearestDistance < 4.2 ? nearestRobot : null;
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
  resetSuitOxygen();
  cameraDistance = Math.min(cameraDistance, 0.72);
  pitch = 0.34;
  orbitYawOffset = 0;
  if (!maybeAdvanceHabitatQuestOnEntry()) {
    showDialogue("Mother", "022号巡检员，已进入 01 建筑居住舱。环境安全，氧气背包已补满。", 4);
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
  resetSuitOxygen();
  const exitWorld = door.root.localToWorld(new THREE.Vector3(0, -1.18, -3.15));
  playerNormal.copy(exitWorld.normalize());
  const faceAway = door.root.localToWorld(new THREE.Vector3(0, -1.18, -4.3)).normalize().sub(playerNormal).projectOnPlane(playerNormal).normalize();
  if (faceAway.lengthSq() > 0.0001) playerForward.copy(faceAway);
  cameraDistance = Math.max(cameraDistance, 10);
  playerRig.visual.visible = true;
  placePlayerOnPlanet();
  showDialogue("居住舱", "外舱门已打开。氧气背包 100%。", 2.8);
}

function enterGreenhouse(door: GreenhouseDoorControl) {
  insideGreenhouse = true;
  door.occupied = true;
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
  showDialogue("Mother", "022号巡检员，已进入 02 建筑温室生态舱。检查舱压与水培床状态。", 4.2);
}

function exitGreenhouse(door: GreenhouseDoorControl) {
  insideGreenhouse = false;
  door.occupied = false;
  greenhouseLocal.set(0, 0.62, -2.62);
  const exitWorld = door.root.localToWorld(new THREE.Vector3(0, 0.28, -5.08));
  playerNormal.copy(exitWorld.normalize());
  const faceAway = door.root.localToWorld(new THREE.Vector3(0, 0.28, -6.0)).normalize().sub(playerNormal).projectOnPlane(playerNormal).normalize();
  if (faceAway.lengthSq() > 0.0001) playerForward.copy(faceAway);
  cameraDistance = Math.max(cameraDistance, 10);
  playerRig.visual.visible = true;
  placePlayerOnPlanet();
  showDialogue("Mother", "022号巡检员，温室外舱门已重新密封。", 3.2);
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
  if (isReturnShipElevator(elevator) && !elonElevatorRepaired) return "按 E 检查 03 飞船升降梯";
  if (isAtRocketHatch()) return isReturnShipElevator(elevator) ? "按 E 与 Elon 通话" : "按 E 进入飞船内部观察";
  if (elevator.moving) return `${elevator.label}运行中`;
  return elevator.target === "top" ? "按 E 乘坐升降梯" : "按 E 启动飞船升降梯";
}

function toggleElevator(elevator: ElevatorControl) {
  if (elevator.moving) return;
  const scale = new THREE.Vector3();
  elevator.car.getWorldScale(scale);
  elevatorRideLocal.set(0, elevator.surfaceY + PLAYER_ALTITUDE / Math.max(scale.y, 0.001), 0);
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

function isReturnShipElevator(elevator: ElevatorControl | null) {
  return Boolean(elevator?.label.includes("03 飞船"));
}

function startElonElevatorRepairQuest() {
  if (elonSideStep === "available") {
    elonSideStep = "cargoShip";
    showDialogue("Mother", "03 飞船升降梯处于安全锁定。状态：机械锁止、电机离线、姿态传感器缺失。先去 02 飞船货运飞船寻找执行器驱动轴。", 6);
    setCurrentMissionText();
    return;
  }
  const target = elonMissionTargets[elonSideStep];
  if (target) {
    showDialogue("Mother", `03 飞船升降梯仍处于锁定。先完成维修清单当前项：${missionLabel(target)}。`, 4.6);
    return;
  }
  if (elonSideStep === "complete" && !elonElevatorRepaired) {
    elonElevatorRepaired = true;
    showDialogue("Mother", "03 飞船升降梯校准完成。可上行至高空廊道。提示：03 飞船内舱仍不可进入。", 5.2);
  }
}

function openElonDialogue() {
  if (!elonMet) {
    elonMet = true;
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
  if (isReturnShipElevator(ridingElevator)) {
    showDialogue("Mother", "03 飞船内舱保持封存。Elon 位于升降平台到达顶端后的高空廊道，靠近舱门处。", 4.6);
    return;
  }
  elevatorRideLocal.x = ROCKET_HATCH_STOP_X;
  elevatorRideLocal.z = 0;
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
  }
  cameraDistance = Math.max(cameraDistance, 10);
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
  elevatorRideLocal.y = elevator.surfaceY + PLAYER_ALTITUDE / Math.max(scale.y, 0.001);
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

function addLabel(landmark: Landmark): LabelAnchor {
  const element = document.createElement("div");
  element.className = "label";
  element.textContent = landmark.label;
  labelsRoot.appendChild(element);
  return { object: landmark.object, element, distance: landmark.labelDistance };
}

function updateLabels() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  labels.forEach((anchor) => {
    const worldPosition = new THREE.Vector3();
    anchor.object.getWorldPosition(worldPosition);
    worldPosition.addScaledVector(worldPosition.clone().normalize(), 4.2);
    const distance = worldPosition.distanceTo(player.position);
    const projected = worldPosition.clone().project(camera);
    const screenY = ((-projected.y + 1) / 2) * height;
    const visible =
      started &&
      !(anchor.object === fufu && fufuRescued) &&
      distance < anchor.distance &&
      projected.z > -1 &&
      projected.z < 1 &&
      Math.abs(projected.x) < 1.15 &&
      Math.abs(projected.y) < 1.15 &&
      !(width < 560 && screenY < 170);
    anchor.element.style.left = `${((projected.x + 1) / 2) * width}px`;
    anchor.element.style.top = `${screenY}px`;
    anchor.element.classList.toggle("is-visible", visible);
  });
}

function updateMap() {
  if (!mapOpen || !started) return;

  const { x: playerMapX, z: playerMapZ } = playerMapCoordinate();
  mapCoordinates.textContent = `X ${formatMapCoordinate(playerMapX)} / Z ${formatMapCoordinate(playerMapZ)}`;

  mapRadar.querySelectorAll(".map-marker").forEach((node) => node.remove());
  const radarSize = mapRadar.clientWidth || 280;
  const radarRadius = radarSize * 0.42;
  const right = playerForward.clone().cross(playerNormal).normalize();

  const mapItems = [
    ...world.landmarks.map((landmark) => {
      const type = mapTypeForLabel(landmark.label);
      return {
        label: landmark.label,
        object: landmark.object,
        x: typeof landmark.object.userData.planetX === "number" ? landmark.object.userData.planetX : landmark.x,
        z: typeof landmark.object.userData.planetZ === "number" ? landmark.object.userData.planetZ : landmark.z,
        mapRange: landmark.mapRange,
        type,
        unknown: type === "unknown",
        missionTarget: isMissionTargetLabel(landmark.label),
      };
    }),
    ...world.unnumberedObjects.map((item) => ({
      label: item.label ?? "未知物体",
      object: item.object,
      x: item.x,
      z: item.z,
      mapRange: item.mapRange,
      type: "unknown",
      unknown: true,
      missionTarget: false,
    })),
  ];

  if (!fufuRescued) {
    mapItems.push({
      label: "未知生命迹象",
      object: fufu,
      x: world.fufuRescueSite.x,
      z: world.fufuRescueSite.z,
      mapRange: 220,
      type: "unknown",
      unknown: true,
      missionTarget: false,
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
    .filter((entry) => entry.item.missionTarget || entry.distance <= mapRangeForItem(entry.item.mapRange))
    .sort((a, b) => Number(b.item.missionTarget) - Number(a.item.missionTarget) || a.distance - b.distance)
    .slice(0, mapExpanded ? 80 : 24);

  nearby.forEach((entry, index) => {
    const range = mapRangeForItem(entry.item.mapRange);
    const distanceRatio = THREE.MathUtils.clamp(entry.distance / range, 0, 1);
    const spreadRatio = mapExpanded ? Math.sqrt(distanceRatio) : distanceRatio;
    const x = THREE.MathUtils.clamp(entry.lateral * spreadRatio, -1, 1) * radarRadius;
    const y = THREE.MathUtils.clamp(-entry.forward * spreadRatio, -1, 1) * radarRadius;
    const marker = document.createElement("div");
    marker.className = `map-marker type-${entry.item.type}`;
    marker.classList.toggle("is-mission-target", entry.item.missionTarget);
    if (entry.item.unknown) marker.textContent = "?";
    if (mapExpanded && shouldShowExpandedMapLabel(entry.item, index)) {
      const label = document.createElement("span");
      label.textContent = entry.item.label;
      marker.appendChild(label);
    }
    marker.style.transform = `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px))`;
    mapRadar.appendChild(marker);
  });

  mapList.innerHTML = "";
}

function mapRangeForItem(itemRange: number) {
  return mapExpanded ? PLANET_RADIUS * Math.PI * 1.08 : Math.min(itemRange, 320 / mapZoom);
}

function shouldShowExpandedMapLabel(item: { missionTarget: boolean; unknown: boolean }, index: number) {
  if (item.missionTarget) return true;
  if (item.unknown) return index < 12;
  return index < 14 && index % 2 === 0;
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

function mapTypeForLabel(label: string) {
  if (label.includes("黑色方碑") || label.includes("Elon")) return "unknown";
  if (label.includes("飞船")) return "ship";
  if (label.includes("能源") || label.includes("太阳能")) return "energy";
  if (label.includes("车辆")) return "vehicle";
  if (label.includes("机器人")) return "robot";
  return "building";
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
  pendingMotherCall = null;
  dialogueState.motherTrust = 0;
  dialogueState.baseIntegrity = 0;
  dialogueState.humanAutonomy = 0;
  dialogueStage.classList.remove("is-visible");
  dialogueLeftSlot.classList.remove("is-speaking", "is-listening");
  dialogueRightSlot.classList.remove("is-speaking", "is-listening");
  dialogueStage.setAttribute("aria-hidden", "true");
  document.body.classList.remove("dialogue-open");
}

function queueMotherCall(scene: DialogueSceneId, mission: string) {
  pendingMotherCall = scene;
  setMission(mission);
}

function openDialogueScene(scene: DialogueSceneId, startNode: DialogueNodeId = sceneStartNodes[scene]) {
  pendingMotherCall = null;
  if (scene !== "robot") {
    characters.repairRobot.name = "A-12";
    characters.repairRobot.callsign = "维修执行单元";
  }
  activeDialogueNode = startNode;
  dialogueOpen = true;
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
  dialogueStage.classList.remove("is-visible");
  dialogueLeftSlot.classList.remove("is-speaking", "is-listening");
  dialogueRightSlot.classList.remove("is-speaking", "is-listening");
  dialogueStage.setAttribute("aria-hidden", "true");
  document.body.classList.remove("dialogue-open");
  if (closedNode?.scene === "intro" && missionStep === "intro") startOxygenMission();
}

function renderDialogueNode() {
  if (!activeDialogueNode) return;
  const node = dialogueNodes[activeDialogueNode];
  const leftCharacter = characters.alex;
  const rightCharacter = characters[node.speaker === "alex" ? node.listener : node.speaker];
  const speaker = characters[node.speaker];

  dialogueLeftPortrait.src = leftCharacter.portrait;
  dialogueLeftName.textContent = leftCharacter.name;
  dialogueLeftCallsign.textContent = leftCharacter.callsign;

  dialogueRightPortrait.src = rightCharacter.portrait;
  dialogueRightName.textContent = rightCharacter.name;
  dialogueRightCallsign.textContent = rightCharacter.callsign;

  const leftIsSpeaking = node.speaker === "alex";
  dialogueLeftSlot.classList.toggle("is-speaking", leftIsSpeaking);
  dialogueLeftSlot.classList.toggle("is-listening", !leftIsSpeaking);
  dialogueRightSlot.classList.toggle("is-speaking", !leftIsSpeaking);
  dialogueRightSlot.classList.toggle("is-listening", leftIsSpeaking);
  dialogueLeftTag.classList.toggle("is-speaking", leftIsSpeaking);
  dialogueLeftTag.classList.toggle("is-listening", !leftIsSpeaking);
  dialogueRightTag.classList.toggle("is-speaking", !leftIsSpeaking);
  dialogueRightTag.classList.toggle("is-listening", leftIsSpeaking);

  dialogueSpeaker.textContent = `${speaker.name} / ${speaker.callsign}`;
  dialogueStats.textContent = `信任 ${dialogueState.motherTrust} · 基地 ${dialogueState.baseIntegrity} · 自主 ${dialogueState.humanAutonomy}`;
  dialogueItemImage.hidden = !node.image;
  if (node.image) dialogueItemImage.src = node.image;
  dialogueText.textContent = node.text;
  dialogueChoices.innerHTML = "";

  const choices = node.choices ?? [];
  selectedDialogueChoiceIndex = choices.length === 2 ? 1 : 0;
  dialogueChoices.hidden = choices.length === 0;
  dialogueContinue.hidden = choices.length > 0;
  for (const [index, choice] of choices.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.choiceIndex = String(index);
    button.textContent = choice.label;
    button.classList.toggle("is-selected", index === selectedDialogueChoiceIndex);
    dialogueChoices.appendChild(button);
  }
}

function handleDialogueKey(event: KeyboardEvent) {
  event.preventDefault();
  if (!activeDialogueNode) return;
  const node = dialogueNodes[activeDialogueNode];
  const choices = node.choices ?? [];
  if (choices.length > 0) {
    if (event.code === "KeyQ") {
      if (choices.length === 2) chooseDialogue(0);
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
  applyDialogueEffects(choice);
  activeDialogueNode = choice.next;
  renderDialogueNode();
}

function advanceDialogue() {
  if (!activeDialogueNode) return;
  const node = dialogueNodes[activeDialogueNode];
  if (node.choices?.length) return;
  if (node.next) {
    activeDialogueNode = node.next;
    renderDialogueNode();
    return;
  }
  closeDialogue();
}

function applyDialogueEffects(choice: DialogueChoice) {
  for (const effect of choice.effects ?? []) {
    applyDialogueEffect(effect);
  }
}

function applyDialogueEffect(effect: DialogueEffect) {
  if (effect === "trustUp") dialogueState.motherTrust += 1;
  if (effect === "trustDown") dialogueState.motherTrust -= 1;
  if (effect === "integrityUp") dialogueState.baseIntegrity += 1;
  if (effect === "integrityDown") dialogueState.baseIntegrity -= 1;
  if (effect === "autonomyUp") dialogueState.humanAutonomy += 1;
  if (effect === "completeOxygen") completeOxygenMission();
  if (effect === "completeSolar") completeSolarMission();
  if (effect === "completeGarage") completeGarageMission();
  if (effect === "acquireScaleGun") setScaleGunOwned(true);
}

function resetQuestState() {
  missionStep = "intro";
  fufuSideStep = "available";
  cargoSideStep = "available";
  patrolSideStep = "available";
  elonSideStep = "available";
  elonElevatorRepaired = false;
  elonMet = false;
  elonDialogueIndex = 0;
  for (const item of world.interactables) item.completed = false;
  world.oxygenLight.color.set(0xff3d2f);
  world.solarLight.color.set(0xff3d2f);
}

function setScaleGunOwned(owned: boolean) {
  hasScaleGun = owned;
  playerRig.scaleGun.visible = owned;
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

function startOxygenMission() {
  missionStep = "m1_habitat";
  setCurrentMissionText();
}

function completeOxygenMission() {
  missionStep = "m1_solarC";
  world.oxygenLight.color.set(0x66d9ff);
  const item = world.interactables.find((interactable) => interactable.id === "oxygen");
  if (item) item.completed = true;
  setCurrentMissionText();
}

function completeSolarMission() {
  missionStep = "m1_garage";
  world.solarLight.color.set(0x66ff9b);
  const item = world.interactables.find((interactable) => interactable.id === "solarC");
  if (item) item.completed = true;
  setCurrentMissionText();
}

function completeGarageMission() {
  if (missionStep === "m1_garage") {
    missionStep = "m2_greenhouse";
    const item = world.interactables.find((interactable) => interactable.id === "garage");
    if (item) item.completed = true;
    showDialogue("Mother", "生命支持验收完成。下一项：启动温室生态舱。", 4.6);
    setCurrentMissionText();
    return;
  }
  const item = world.interactables.find((interactable) => interactable.id === "garage");
  if (item) item.completed = true;
  missionStep = "complete";
  setCurrentMissionText();
}

function advanceWorldQuest(id: Interactable["id"]) {
  if (advanceSideQuest(id)) return;
  if (mainMissionTargets[missionStep] !== id) return;

  if (missionStep === "m1_habitat") {
    completeInteractable(id);
    missionStep = "m1_oxygen";
    showDialogue("Mother", "居住舱空气循环正常。氧气生产站仍有压降，请前往 03 建筑氧气生产站。", 4.8);
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
    showDialogue("Mother", "阵列 B 已分配温室补光。回到温室，决定火星第一批种植方案。", 4.8);
  } else if (missionStep === "m2_seed") {
    completeInteractable(id);
    missionStep = "m3_tower";
    dialogueState.humanAutonomy += 1;
    showDialogue("Alex", "种植方案确认。第一批纪念植物进入培养槽。火星基地不只是在维持运行，也开始生活。", 5.4);
  } else if (missionStep === "m3_tower") {
    missionStep = "m3_lab";
    showDialogue("P-03", "风暴提前。通信塔只收到半段地球指令。请到科研舱比对本地气象数据。", 5.2);
  } else if (missionStep === "m3_lab") {
    missionStep = "m3_methane";
    dialogueState.humanAutonomy += 1;
    showDialogue("科研舱", "地球旧指令已过时。本地数据支持低功率启动甲烷燃料厂。", 4.8);
  } else if (missionStep === "m3_methane") {
    missionStep = "m3_solarA";
    showDialogue("甲烷燃料厂", "第一轮低功率试生产完成。风暴加强，请固定太阳能阵列 A。", 4.8);
  } else if (missionStep === "m3_solarA") {
    missionStep = "m3_garage";
    showDialogue("Mother", "阵列 A 锁定。A-12 与 A-01 同时请求调度，请前往机器人车库分配优先级。", 5.2);
  } else if (missionStep === "m3_garage") {
    missionStep = "m3_mother";
    dialogueState.baseIntegrity += 1;
    showDialogue("机器人车库", "A-12 去封闭外部阀门，A-01 固定物资仓货架。请回到居住舱 Mother 终端签署协作协议。", 5.6);
  } else if (missionStep === "m3_mother") {
    missionStep = "complete";
    dialogueState.motherTrust += 1;
    const ending = dialogueState.motherTrust >= 5 && dialogueState.baseIntegrity >= 4 ? "协作协议已建立。欢迎来到火星，X。" : "协作协议已建立。Alex 拥有现场判断权，Mother 保留风险限制。";
    showDialogue("Mother", ending, 6);
  }
  completeInteractable(id);
  setCurrentMissionText();
}

function advanceSideQuest(id: Interactable["id"]) {
  if (isElonSideQuestTarget(id)) {
    if (elonSideStep === "cargoShip") {
      elonSideStep = "solarC";
      showDialogue("02 飞船 货运飞船", "发现备用执行器驱动轴。外壳有轻微沙尘磨损，结构完整。下一项：去太阳能阵列 C 处理高功率继电器。", 5.4);
    } else if (elonSideStep === "solarC") {
      elonSideStep = "garage";
      showDialogue("12 机器人 阵列 C 维修工", "高功率继电器已复制为低风险替代件。阵列 C 风暴恢复冗余保留。下一项：去机器人车库取得姿态锁止传感器。", 5.8);
    } else if (elonSideStep === "garage") {
      elonSideStep = "storehouse";
      showDialogue("机器人车库", "姿态锁止传感器可用。没有它，升降梯只能知道自己在移动，不能证明自己停在正确位置。下一项：去物资仓取低温润滑胶囊。", 6);
    } else if (elonSideStep === "storehouse") {
      elonSideStep = "lab";
      showDialogue("08 建筑 物资仓", "低温润滑胶囊已取出。库存剩余两枚。下一项：去科研舱生成一次性校准密钥。", 5.2);
    } else if (elonSideStep === "lab") {
      elonSideStep = "complete";
      elonElevatorRepaired = true;
      dialogueState.baseIntegrity += 1;
      showDialogue("科研舱", "校准密钥生成完成。03 飞船升降梯维修记录已写入 Mother 安全边界。可返回 03 飞船升降梯，上行至 Elon 所在高空廊道。", 6.4);
    }
    setCurrentMissionText();
    return true;
  }

  if (fufuSideStep !== "available" && fufuSideStep !== "complete" && sideMissionTargets.fufu[fufuSideStep] === id) {
    if (fufuSideStep === "medical") {
      fufuSideStep = "habitat";
      dialogueState.motherTrust += 1;
      showDialogue("医疗舱", "扫描完成。福福体温偏低，无污染风险。隔离不是拒绝，是确认安全前的保护。请带它回居住舱观察。", 5.6);
    } else if (fufuSideStep === "habitat") {
      fufuSideStep = "complete";
      dialogueState.humanAutonomy += 1;
      showDialogue("Mother", "未登记生命体已进入观察名单。记录：非效率陪伴对象可能提高长期任务稳定性。暂不构成基地风险，可继续观察。", 6);
    }
    setCurrentMissionText();
    return true;
  }

  const cargoStep = cargoSideStep === "available" ? "cargoShip" : cargoSideStep;
  if (cargoSideStep !== "complete" && isCargoAvailable() && sideMissionTargets.cargo[cargoStep] === id) {
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
    setCurrentMissionText();
    return true;
  }

  const patrolStep = patrolSideStep === "available" ? "solarA" : patrolSideStep;
  if (patrolSideStep !== "complete" && isPatrolAvailable() && sideMissionTargets.patrol[patrolStep] === id) {
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
  return ["m2_storehouse", "m2_lab", "m2_solarB", "m2_seed", "m3_tower", "m3_lab", "m3_methane", "m3_solarA", "m3_garage", "m3_mother", "complete"].includes(missionStep);
}

function isPatrolAvailable() {
  return ["m3_tower", "m3_lab", "m3_methane", "m3_solarA", "m3_garage", "m3_mother", "complete"].includes(missionStep);
}

function isElonSideQuestTarget(id: Interactable["id"]) {
  return !elonElevatorRepaired && elonSideStep !== "available" && elonSideStep !== "complete" && elonMissionTargets[elonSideStep] === id;
}

function isActiveMissionInteractable(id: Interactable["id"]) {
  if (id === "monolith") return !hasScaleGun;
  if (mainMissionTargets[missionStep] === id) return true;
  if (isElonSideQuestTarget(id)) return true;
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
  const textByStep: Record<MainMissionStep, string> = {
    intro: "先熟悉移动和视角。火星基地中控 AI Mother 会建立通信，随后开始基地验收。",
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
    m3_mother: "主线三：回到 01 建筑居住舱 Mother 终端，签署人机协作协议。",
    complete: "主线完成：ARES BASE ALPHA 达到最低生存标准。可继续完成剩余支线。",
  };

  const sideHints: string[] = [];
  if (fufuSideStep === "medical") sideHints.push("支线：带福福去医疗舱扫描");
  if (fufuSideStep === "habitat") sideHints.push("支线：带福福回居住舱");
  if (!elonElevatorRepaired && elonSideStep !== "available") {
    const target = elonMissionTargets[elonSideStep];
    sideHints.push(target ? `支线：修复 03 飞船升降梯，当前目标 ${missionLabel(target)}` : "支线：返回 03 飞船升降梯");
  }
  if (elonElevatorRepaired && !elonMet) sideHints.push("支线：乘坐 03 飞船升降梯，在高空廊道与 Elon 通话");
  if (isCargoAvailable() && cargoSideStep !== "complete") sideHints.push("支线：调查 A-01 的错位货箱");
  if (isPatrolAvailable() && patrolSideStep !== "complete") sideHints.push("支线：跟进 P-03 的外围异常");
  setMission(sideHints.length ? `${textByStep[missionStep]} ｜ ${sideHints.join("；")}` : textByStep[missionStep]);
}

function setMission(text: string) {
  missionText.textContent = text;
}

function showDialogue(speaker: string, text: string, seconds: number) {
  dialogueBox.innerHTML = `<strong>${speaker}</strong><span>${text}</span>`;
  messageUntil = performance.now() + seconds * 1000;
}

function updateReadouts() {
  if (oxygenReadout) {
    const value = missionStep === "m1_oxygen" ? 58 + Math.sin(elapsedTime * 3) * 4 : 78 + Math.sin(elapsedTime * 0.36) * 2;
    oxygenReadout.textContent = `${Math.round(value)}%`;
  }
  if (suitOxygenReadout) {
    suitOxygenReadout.textContent = `${Math.ceil(suitOxygen)}%`;
    suitOxygenReadout.classList.toggle("is-low", suitOxygen <= 20);
    suitOxygenReadout.classList.toggle("is-critical", suitOxygen <= 20);
  }
  if (staminaReadout) {
    staminaReadout.textContent = `${Math.round(stamina)}%`;
    staminaReadout.classList.toggle("is-low", stamina <= 20);
  }
  if (powerReadout) {
    const value = missionStep === "m1_solarC" ? 61 + Math.sin(elapsedTime * 3.2) * 4 : 89 + Math.sin(elapsedTime * 0.22 + 1.8) * 4;
    powerReadout.textContent = `${Math.round(value)}%`;
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function isTouchLike() {
  return matchMedia("(hover: none), (pointer: coarse)").matches;
}

function isSmallScreenMapTouch() {
  return window.innerWidth <= 700 || isTouchLike();
}
