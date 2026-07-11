export type DialogueGraphNode = {
  id: string;
  scene: string;
  speaker: string;
  listener: string;
  next?: string;
  choices?: Array<{ next: string }>;
};

export type DialogueGraphValidation = {
  errors: string[];
  unreachable: string[];
};

export function validateDialogueGraph(
  nodes: Record<string, DialogueGraphNode>,
  entryNodeIds: readonly string[],
): DialogueGraphValidation {
  const errors: string[] = [];
  for (const [key, node] of Object.entries(nodes)) {
    if (key !== node.id) errors.push(`${key}: node id is ${node.id}`);
    if (node.speaker === node.listener) errors.push(`${key}: speaker and listener are identical`);
    for (const next of [node.next, ...(node.choices?.map((choice) => choice.next) ?? [])]) {
      if (next && !nodes[next]) errors.push(`${key}: missing next node ${next}`);
    }
  }

  const visited = new Set<string>();
  const queue = [...entryNodeIds];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    const node = nodes[current];
    if (!node) {
      errors.push(`missing entry node ${current}`);
      continue;
    }
    visited.add(current);
    if (node.next) queue.push(node.next);
    for (const choice of node.choices ?? []) queue.push(choice.next);
  }

  return {
    errors,
    unreachable: Object.keys(nodes).filter((id) => !visited.has(id)),
  };
}
