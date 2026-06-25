import * as THREE from "three";
import { createMarsEngineer, updateMarsEngineer, type PlayerRig } from "./player";
import {
  MULTIPLAYER_ROOM_ID,
  type ClientMessage,
  type PlayerInsideState,
  type PlayerSnapshot,
  type RemotePlayer,
  type ServerMessage,
} from "./multiplayer-protocol";

type MultiplayerClientOptions = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  labelsRoot: HTMLElement;
};

type RemoteAvatar = {
  player: RemotePlayer;
  rig: PlayerRig;
  label: HTMLDivElement;
  helmetLight: THREE.PointLight;
  targetPosition: THREE.Vector3;
  targetQuaternion: THREE.Quaternion;
  lastStateAt: number;
  hasFreshState: boolean;
};

type LocalSnapshotInput = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  speed: number;
  flying: boolean;
  lampOn: boolean;
  insideState: PlayerInsideState;
};

const PLAYER_ID_KEY = "mars.playerId";
const DISPLAY_NAME_KEY = "mars.displayName";
const STATE_SEND_INTERVAL = 1 / 12;
const PING_INTERVAL = 5;
const RECONNECT_MIN_DELAY = 1500;
const RECONNECT_MAX_DELAY = 12000;
const REMOTE_STATE_TTL = 18;
const LABEL_MAX_DISTANCE = 90;

export class MultiplayerClient {
  readonly playerId = getOrCreatePlayerId();
  readonly displayName = getOrCreateDisplayName(this.playerId);

  private readonly scene: THREE.Scene;
  private readonly camera: THREE.Camera;
  private readonly labelsRoot: HTMLElement;
  private socket: WebSocket | null = null;
  private connected = false;
  private shouldReconnect = false;
  private reconnectDelay = RECONNECT_MIN_DELAY;
  private reconnectTimer: number | null = null;
  private sendAccumulator = 0;
  private pingAccumulator = 0;
  private remotes = new Map<string, RemoteAvatar>();

  constructor(options: MultiplayerClientOptions) {
    this.scene = options.scene;
    this.camera = options.camera;
    this.labelsRoot = options.labelsRoot;
  }

  get onlineCount() {
    return 1 + this.remotes.size;
  }

  connect() {
    if (this.socket || this.connected) return;
    this.shouldReconnect = true;
    this.openSocket();
  }

  disconnect() {
    this.shouldReconnect = false;
    this.connected = false;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.close();
      this.socket = null;
    }
    for (const playerId of [...this.remotes.keys()]) this.removeRemote(playerId);
  }

  update(delta: number, elapsed: number, local: LocalSnapshotInput) {
    this.sendAccumulator += delta;
    this.pingAccumulator += delta;

    if (this.connected && this.sendAccumulator >= STATE_SEND_INTERVAL) {
      this.sendAccumulator = 0;
      this.send({
        type: "state",
        playerId: this.playerId,
        snapshot: toSnapshot(local),
      });
    }

    if (this.connected && this.pingAccumulator >= PING_INTERVAL) {
      this.pingAccumulator = 0;
      this.send({ type: "ping", playerId: this.playerId });
    }

    for (const [playerId, remote] of this.remotes) {
      if (elapsed - remote.lastStateAt > REMOTE_STATE_TTL) {
        this.removeRemote(playerId);
        continue;
      }
      const localCanSeeRemote = local.insideState === "surface" || local.insideState === "elevator";
      const remoteCanBeShown = remote.player.snapshot.insideState === "surface" || remote.player.snapshot.insideState === "elevator";
      const visible = localCanSeeRemote && remoteCanBeShown && remote.hasFreshState;
      remote.rig.group.visible = visible;
      remote.helmetLight.visible = visible && remote.player.snapshot.lampOn;
      remote.label.classList.toggle("is-visible", visible && this.updateLabel(remote, local.position));
      if (!visible) continue;

      remote.rig.group.position.lerp(remote.targetPosition, 1 - Math.pow(0.0002, delta));
      remote.rig.group.quaternion.slerp(remote.targetQuaternion, 1 - Math.pow(0.00008, delta));
      remote.helmetLight.position.copy(remote.rig.group.position).addScaledVector(remote.rig.group.position.clone().normalize(), 1.72);
      updateMarsEngineer(remote.rig, remote.player.snapshot.speed, elapsed, remote.player.snapshot.flying, remote.player.snapshot.flying);
    }
  }

  private openSocket() {
    if (!this.shouldReconnect || this.socket) return;
    try {
      this.socket = new WebSocket(multiplayerUrl());
    } catch {
      this.socket = null;
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.connected = true;
      this.reconnectDelay = RECONNECT_MIN_DELAY;
      this.send({
        type: "join",
        playerId: this.playerId,
        displayName: this.displayName,
        roomId: MULTIPLAYER_ROOM_ID,
      });
    };

    this.socket.onmessage = (event) => {
      const message = parseServerMessage(event.data);
      if (message) this.handleMessage(message);
    };

    this.socket.onclose = () => {
      this.socket = null;
      this.connected = false;
      this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || this.reconnectTimer) return;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(RECONNECT_MAX_DELAY, this.reconnectDelay * 1.7);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private handleMessage(message: ServerMessage) {
    if (message.type === "welcome") {
      for (const peer of message.peers) this.upsertRemote(peer, false);
      return;
    }
    if (message.type === "player_joined") {
      this.upsertRemote(message.player, false);
      return;
    }
    if (message.type === "player_state") {
      const remote = this.remotes.get(message.playerId);
      if (!remote) {
        this.upsertRemote({
          playerId: message.playerId,
          displayName: `巡检员 ${message.playerId.slice(-4).toUpperCase()}`,
          roomId: MULTIPLAYER_ROOM_ID,
          snapshot: message.snapshot,
          updatedAt: Date.now(),
        }, true);
        return;
      }
      remote.player.snapshot = message.snapshot;
      remote.player.updatedAt = Date.now();
      remote.targetPosition.fromArray(message.snapshot.position);
      remote.targetQuaternion.fromArray(message.snapshot.quaternion);
      remote.lastStateAt = performance.now() / 1000;
      remote.hasFreshState = true;
      return;
    }
    if (message.type === "player_left") this.removeRemote(message.playerId);
  }

  private upsertRemote(player: RemotePlayer, hasFreshState: boolean) {
    if (player.playerId === this.playerId) return;
    const existing = this.remotes.get(player.playerId);
    if (existing) {
      existing.player = player;
      existing.targetPosition.fromArray(player.snapshot.position);
      existing.targetQuaternion.fromArray(player.snapshot.quaternion);
      existing.hasFreshState ||= hasFreshState;
      return;
    }

    const rig = createMarsEngineer();
    rig.group.name = player.displayName;
    rig.group.scale.setScalar(0.76);
    rig.group.position.fromArray(player.snapshot.position);
    rig.group.quaternion.fromArray(player.snapshot.quaternion);
    rig.group.visible = false;

    tintRemoteSuit(rig.visual, colorFromPlayerId(player.playerId));

    const helmetLight = new THREE.PointLight(0xffd36c, 0.95, 6.5);
    helmetLight.visible = false;
    this.scene.add(rig.group, helmetLight);

    const label = document.createElement("div");
    label.className = "label multiplayer-label";
    label.textContent = player.displayName;
    this.labelsRoot.appendChild(label);

    this.remotes.set(player.playerId, {
      player,
      rig,
      label,
      helmetLight,
      targetPosition: new THREE.Vector3().fromArray(player.snapshot.position),
      targetQuaternion: new THREE.Quaternion().fromArray(player.snapshot.quaternion),
      lastStateAt: performance.now() / 1000,
      hasFreshState,
    });
  }

  private removeRemote(playerId: string) {
    const remote = this.remotes.get(playerId);
    if (!remote) return;
    this.scene.remove(remote.rig.group, remote.helmetLight);
    remote.label.remove();
    disposeObject(remote.rig.group);
    remote.helmetLight.dispose();
    this.remotes.delete(playerId);
  }

  private updateLabel(remote: RemoteAvatar, localPosition: THREE.Vector3) {
    const worldPosition = remote.rig.group.position.clone().addScaledVector(remote.rig.group.position.clone().normalize(), 3.2);
    const distance = worldPosition.distanceTo(localPosition);
    if (distance > LABEL_MAX_DISTANCE) return false;
    const projected = worldPosition.project(this.camera);
    if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.15 || Math.abs(projected.y) > 1.15) return false;
    remote.label.style.left = `${((projected.x + 1) / 2) * window.innerWidth}px`;
    remote.label.style.top = `${((-projected.y + 1) / 2) * window.innerHeight}px`;
    return true;
  }

  private send(message: ClientMessage) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }
}

function toSnapshot(local: LocalSnapshotInput): PlayerSnapshot {
  return {
    position: local.position.toArray() as [number, number, number],
    quaternion: local.quaternion.toArray() as [number, number, number, number],
    speed: Number(local.speed.toFixed(3)),
    flying: local.flying,
    lampOn: local.lampOn,
    insideState: local.insideState,
  };
}

function multiplayerUrl() {
  const explicit = import.meta.env.VITE_MULTIPLAYER_WS_URL;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  if (import.meta.env.DEV) return "ws://127.0.0.1:8787/ws";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

function parseServerMessage(raw: unknown): ServerMessage | null {
  try {
    const text = typeof raw === "string" ? raw : "";
    const message = JSON.parse(text) as ServerMessage;
    return message && typeof message.type === "string" ? message : null;
  } catch {
    return null;
  }
}

function getOrCreatePlayerId() {
  const stored = safeLocalStorageGet(PLAYER_ID_KEY);
  if (stored) return stored;
  const generated = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  safeLocalStorageSet(PLAYER_ID_KEY, generated);
  return generated;
}

function getOrCreateDisplayName(playerId: string) {
  const stored = safeLocalStorageGet(DISPLAY_NAME_KEY);
  if (stored) return stored;
  const generated = `巡检员 ${playerId.slice(-4).toUpperCase()}`;
  safeLocalStorageSet(DISPLAY_NAME_KEY, generated);
  return generated;
}

function safeLocalStorageGet(key: string) {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function safeLocalStorageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing or blocked storage should not prevent single-player use.
  }
}

function colorFromPlayerId(playerId: string) {
  let hash = 0;
  for (const char of playerId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const palette = [0x66d9ff, 0x66ff9b, 0xffb15d, 0xe99cff, 0xff6f61, 0xb9f27c];
  return palette[hash % palette.length];
}

function tintRemoteSuit(object: THREE.Object3D, color: number) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const material = child.material;
    if (Array.isArray(material)) return;
    if (!(material instanceof THREE.MeshStandardMaterial)) return;
    if (material.emissiveIntensity > 0 || material.metalness > 0.25) return;
    const clone = material.clone();
    clone.color.lerp(new THREE.Color(color), 0.22);
    child.material = clone;
  });
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) material.dispose();
  });
}
