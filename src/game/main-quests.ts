import type { Interactable } from "../world";
import type { QuestDefinition } from "../core/quest-system";

export type MainMissionStep =
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
  | "m3_steve"
  | "complete";

type TargetId = Interactable["id"];

const steps = [
  { id: "intro", questId: "main_life_support", chapter: 1, phase: "intro", next: "m1_habitat" },
  { id: "m1_habitat", questId: "main_life_support", targetId: "habitatCheck", chapter: 1, phase: "inspect", next: "m1_oxygen" },
  { id: "m1_oxygen", questId: "main_life_support", targetId: "oxygen", chapter: 1, phase: "inspect", next: "m1_solarC" },
  { id: "m1_solarC", questId: "main_life_support", targetId: "solarC", chapter: 1, phase: "repair", next: "m1_garage" },
  { id: "m1_garage", questId: "main_life_support", targetId: "garage", chapter: 1, phase: "decision", next: "m2_greenhouse" },
  { id: "m2_greenhouse", questId: "main_greenhouse_seed", targetId: "greenhouse", chapter: 2, phase: "inspect", next: "m2_storehouse" },
  { id: "m2_storehouse", questId: "main_greenhouse_seed", targetId: "storehouse", chapter: 2, phase: "inspect", next: "m2_lab" },
  { id: "m2_lab", questId: "main_greenhouse_seed", targetId: "lab", chapter: 2, phase: "repair", next: "m2_solarB" },
  { id: "m2_solarB", questId: "main_greenhouse_seed", targetId: "solarB", chapter: 2, phase: "repair", next: "m2_seed" },
  { id: "m2_seed", questId: "main_greenhouse_seed", targetId: "greenhouse", chapter: 2, phase: "decision", next: "m3_tower" },
  { id: "m3_tower", questId: "main_storm_protocol", targetId: "tower", chapter: 3, phase: "inspect", next: "m3_lab" },
  { id: "m3_lab", questId: "main_storm_protocol", targetId: "lab", chapter: 3, phase: "decision", next: "m3_methane" },
  { id: "m3_methane", questId: "main_storm_protocol", targetId: "methane", chapter: 3, phase: "repair", next: "m3_solarA" },
  { id: "m3_solarA", questId: "main_storm_protocol", targetId: "solarA", chapter: 3, phase: "repair", next: "m3_garage" },
  { id: "m3_garage", questId: "main_storm_protocol", targetId: "garage", chapter: 3, phase: "decision", next: "m3_steve" },
  { id: "m3_steve", questId: "main_storm_protocol", targetId: "habitatCheck", chapter: 3, phase: "decision", next: "complete" },
  { id: "complete", questId: "main_storm_protocol", chapter: 3, phase: "complete" },
] as const satisfies readonly import("../core/quest-system").QuestStepDefinition<MainMissionStep, TargetId>[];

export const MAIN_QUEST_DEFINITIONS: readonly QuestDefinition<MainMissionStep, TargetId>[] = [
  { id: "main_life_support", steps: steps.filter((step) => step.chapter === 1) },
  { id: "main_greenhouse_seed", steps: steps.filter((step) => step.chapter === 2) },
  { id: "main_storm_protocol", steps: steps.filter((step) => step.chapter === 3) },
];

export const MAIN_MISSION_TARGETS = Object.fromEntries(steps.filter((step) => "targetId" in step).map((step) => [step.id, step.targetId])) as Partial<
  Record<MainMissionStep, TargetId>
>;

export function isAnomalyContentUnlocked(step: MainMissionStep) {
  return step === "complete";
}


