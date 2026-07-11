export type QuestId = "main_life_support" | "main_greenhouse_seed" | "main_storm_protocol";

export type QuestStepDefinition<TStepId extends string = string, TTargetId extends string = string> = {
  id: TStepId;
  questId: QuestId;
  targetId?: TTargetId;
  chapter: 1 | 2 | 3;
  phase: "intro" | "inspect" | "repair" | "decision" | "complete";
  next?: TStepId;
};

export type QuestDefinition<TStepId extends string = string, TTargetId extends string = string> = {
  id: QuestId;
  steps: readonly QuestStepDefinition<TStepId, TTargetId>[];
};

export type QuestRuntimeState<TStepId extends string = string> = {
  activeQuestId: QuestId;
  activeStepId: TStepId;
  completedStepIds: Set<TStepId>;
};

export function validateQuestDefinitions(definitions: readonly QuestDefinition[]): string[] {
  const errors: string[] = [];
  const allStepIds = new Set<string>();
  for (const definition of definitions) {
    if (definition.steps.length === 0) errors.push(`${definition.id}: no steps`);
    for (const step of definition.steps) {
      if (step.questId !== definition.id) errors.push(`${step.id}: questId does not match ${definition.id}`);
      if (allStepIds.has(step.id)) errors.push(`${step.id}: duplicate step id`);
      allStepIds.add(step.id);
    }
  }
  for (const definition of definitions) {
    for (const step of definition.steps) {
      if (step.next && !allStepIds.has(step.next)) errors.push(`${step.id}: missing next step ${step.next}`);
    }
  }
  return errors;
}

