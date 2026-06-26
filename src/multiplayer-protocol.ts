export const MULTIPLAYER_ROOM_ID = "public-mars-alpha" as const;

export type MultiplayerRoomId = typeof MULTIPLAYER_ROOM_ID;

export type PlayerInsideState = "surface" | "habitat" | "greenhouse" | "rocket" | "elevator";

export type PlayerSnapshot = {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  speed: number;
  flying: boolean;
  insideState: PlayerInsideState;
};

export type RemotePlayer = {
  playerId: string;
  displayName: string;
  roomId: MultiplayerRoomId;
  snapshot: PlayerSnapshot;
  updatedAt: number;
};

export type ClientMessage =
  | { type: "join"; playerId: string; displayName: string; roomId: MultiplayerRoomId }
  | { type: "state"; playerId: string; snapshot: PlayerSnapshot }
  | { type: "ping"; playerId: string };

export type ServerMessage =
  | { type: "welcome"; playerId: string; peers: RemotePlayer[] }
  | { type: "player_joined"; player: RemotePlayer }
  | { type: "player_state"; playerId: string; snapshot: PlayerSnapshot }
  | { type: "player_left"; playerId: string }
  | { type: "pong" };
