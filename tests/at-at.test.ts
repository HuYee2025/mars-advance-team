import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  AT_AT_HEIGHT_METERS,
  atAtEntryStatus,
  createAtAt,
} from "../src/world/at-at";

test("AT-AT model keeps the official 22.5 meter visual height", () => {
  const atAt = createAtAt();
  atAt.group.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  atAt.group.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object.name === "AT-AT dust puff") return;
    object.geometry.computeBoundingBox();
    if (!object.geometry.boundingBox) return;
    bounds.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });
  assert.ok(Math.abs(bounds.max.y - bounds.min.y - AT_AT_HEIGHT_METERS) < 0.02);
  assert.ok(Math.abs(AT_AT_HEIGHT_METERS / 1.8 - 12.5) < 0.001);
});

test("AT-AT entry requires 500 score before checking the 100 coin fee", () => {
  assert.equal(atAtEntryStatus(499, 101), "score");
  assert.equal(atAtEntryStatus(500, 99), "coins");
  assert.equal(atAtEntryStatus(500, 100), "allowed");
  assert.equal(atAtEntryStatus(501, 101), "allowed");
});
