import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/dialogue/dialogues.ts", import.meta.url), "utf8");

function section(from: string, to: string) {
  return source.slice(source.indexOf(from), source.indexOf(to));
}

test("production dialogue graph has valid ids, links and entry paths", () => {
  const graphSource = section("export const dialogueNodes", "export const robotDialogueStartNodes");
  const blockMatches = [...graphSource.matchAll(/^  ([A-Za-z0-9_]+): \{([\s\S]*?)^  \},/gm)];
  const graph = new Map<string, string[]>();
  for (const [, key, body] of blockMatches) {
    const declaredId = body.match(/\bid: "([^"]+)"/)?.[1];
    assert.equal(declaredId, key, `${key} must match its declared id`);
    graph.set(key, [...body.matchAll(/\bnext: "([^"]+)"/g)].map((match) => match[1]));
  }

  const entries = [
    ...section("export const sceneStartNodes", "export const dialogueNodes").matchAll(/: "([^"]+)"/g),
    ...source.slice(source.indexOf("export const robotDialogueStartNodes")).matchAll(/: "([^"]+)"/g),
  ].map((match) => match[1]);
  entries.push("elon_intro_1", "elon_rules_1", "elon_base_1", "elon_steve_1", "elon_fufu_1", "elon_robots_1");

  for (const [id, links] of graph) {
    for (const link of links) assert.ok(graph.has(link), `${id} points to missing node ${link}`);
  }

  const visited = new Set<string>();
  const queue = [...new Set(entries)];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    assert.ok(graph.has(id), `entry node ${id} is missing`);
    visited.add(id);
    queue.push(...(graph.get(id) ?? []));
  }
  assert.deepEqual([...graph.keys()].filter((id) => !visited.has(id)), []);
});
