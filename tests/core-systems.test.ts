import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { resolveGameMode } from "../src/core/game-state";
import { rankInteractionCandidates } from "../src/core/interaction-system";
import { validateQuestDefinitions } from "../src/core/quest-system";
import { MAIN_QUEST_DEFINITIONS } from "../src/game/main-quests";
import { SphericalCollisionWorld } from "../src/core/collision-world";
import { validateDialogueGraph } from "../src/core/dialogue-graph";
import { validateCoreModelSpecs } from "../src/core/model-assets";
import { isSpiderInShade } from "../src/core/spider-visibility";
import { applySpiderBladeDamage, SPIDER_MAX_HEALTH } from "../src/core/spider-combat";

test("game mode priority prevents overlapping control states", () => {
  assert.equal(resolveGameMode({ started: true, dialogueOpen: true, insideInterior: false, ridingVehicle: true, ridingElevator: false, cameraMode: false, scaleGunAiming: false, wormholeActive: false }), "dialogue");
  assert.equal(resolveGameMode({ started: true, dialogueOpen: false, insideInterior: false, ridingVehicle: false, ridingElevator: false, cameraMode: true, scaleGunAiming: true, wormholeActive: false }), "camera");
});

test("interactions rank mission first and cap visible actions", () => {
  const ranked = rankInteractionCandidates([
    { id: "oxygen", label: "oxygen", priority: "oxygen", distance: 1 },
    { id: "mission", label: "mission", priority: "mission", distance: 4 },
    { id: "door", label: "door", priority: "traversal", distance: 2 },
  ]);
  assert.deepEqual(ranked.map((item) => item.id), ["mission", "door"]);
});

test("main quest graph has no duplicate or dangling steps", () => {
  assert.deepEqual(validateQuestDefinitions(MAIN_QUEST_DEFINITIONS), []);
});

test("spherical collision world returns nearby buckets only", () => {
  const world = new SphericalCollisionWorld<string>(132);
  world.add({ id: "near", normal: new THREE.Vector3(0, 1, 0), shape: { kind: "circle", radius: 2 }, source: "near" });
  world.add({ id: "far", normal: new THREE.Vector3(0, -1, 0), shape: { kind: "circle", radius: 2 }, source: "far" });
  assert.deepEqual(world.query(new THREE.Vector3(0, 1, 0), 10).map((item) => item.id), ["near"]);
});

test("dialogue graph catches dangling and unreachable nodes", () => {
  const result = validateDialogueGraph(
    {
      start: { id: "start", scene: "intro", speaker: "steve", listener: "alex", next: "end" },
      end: { id: "end", scene: "intro", speaker: "alex", listener: "steve" },
      orphan: { id: "orphan", scene: "intro", speaker: "steve", listener: "alex", next: "missing" },
    },
    ["start"],
  );
  assert.deepEqual(result.errors, ["orphan: missing next node missing"]);
  assert.deepEqual(result.unreachable, ["orphan"]);
});

test("core model pipeline stays inside material and LOD budgets", () => {
  assert.deepEqual(validateCoreModelSpecs(), []);
});

test("spiders stay on the night side of the terminator", () => {
  const sun = new THREE.Vector3(0, 1, 0);
  assert.equal(isSpiderInShade(new THREE.Vector3(0, -1, 0), sun), true);
  assert.equal(isSpiderInShade(new THREE.Vector3(0, 1, 0), sun), false);
  assert.equal(isSpiderInShade(new THREE.Vector3(1, -0.25, 0), sun), true);
});

test("laser sword damage defeats a spider after four strikes", () => {
  let health = SPIDER_MAX_HEALTH;
  for (let strike = 0; strike < 3; strike += 1) {
    const result = applySpiderBladeDamage(health);
    health = result.health;
    assert.equal(result.defeated, false);
  }
  const final = applySpiderBladeDamage(health);
  assert.equal(final.health, 0);
  assert.equal(final.defeated, true);
});
