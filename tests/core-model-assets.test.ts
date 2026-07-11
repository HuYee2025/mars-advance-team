import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CORE_MODEL_SPECS } from "../src/core/model-assets";

test("core GLB assets contain all three LOD nodes", () => {
  for (const spec of CORE_MODEL_SPECS) {
    const bytes = readFileSync(new URL(`../public${spec.url}`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString("utf8"), "glTF", `${spec.id} must be a binary glTF file`);
    const source = bytes.toString("latin1");
    for (const level of ["LOD0", "LOD1", "LOD2"]) assert.ok(source.includes(level), `${spec.id} is missing ${level}`);
  }
});
