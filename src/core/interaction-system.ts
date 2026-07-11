export type InteractionPriority = "mission" | "traversal" | "character" | "oxygen" | "exploration";

export type InteractionCandidate<TId extends string = string> = {
  id: TId;
  label: string;
  priority: InteractionPriority;
  distance: number;
  available?: boolean;
};

const PRIORITY_WEIGHT: Record<InteractionPriority, number> = {
  mission: 500,
  traversal: 400,
  character: 300,
  oxygen: 200,
  exploration: 100,
};

export function rankInteractionCandidates<T extends InteractionCandidate>(candidates: T[], limit = 2): T[] {
  return candidates
    .filter((candidate) => candidate.available !== false)
    .sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || a.distance - b.distance || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, limit));
}

