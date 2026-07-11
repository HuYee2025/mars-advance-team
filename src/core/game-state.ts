export type GameMode =
  | "title"
  | "explore"
  | "dialogue"
  | "interior"
  | "vehicle"
  | "elevator"
  | "camera"
  | "scaleGun"
  | "wormhole";

export type GameModeSnapshot = {
  started: boolean;
  dialogueOpen: boolean;
  insideInterior: boolean;
  ridingVehicle: boolean;
  ridingElevator: boolean;
  cameraMode: boolean;
  scaleGunAiming: boolean;
  wormholeActive: boolean;
};

export type GameEvent =
  | { type: "mode.changed"; mode: GameMode }
  | { type: "quest.advanced"; questId: string; stepId: string }
  | { type: "interaction.executed"; interactionId: string }
  | { type: "equipment.unlocked"; equipmentId: string }
  | { type: "vitals.depleted"; vital: "oxygen" | "stamina" }
  | { type: "score.awarded"; eventId: string; points: number };

export function resolveGameMode(state: GameModeSnapshot): GameMode {
  if (!state.started) return "title";
  if (state.wormholeActive) return "wormhole";
  if (state.dialogueOpen) return "dialogue";
  if (state.cameraMode) return "camera";
  if (state.scaleGunAiming) return "scaleGun";
  if (state.ridingElevator) return "elevator";
  if (state.ridingVehicle) return "vehicle";
  if (state.insideInterior) return "interior";
  return "explore";
}

