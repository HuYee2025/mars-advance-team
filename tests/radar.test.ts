import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyRadarContact,
  getRadarContactSignature,
  layoutRadarContact,
  selectRadarContacts,
  shouldShowParkedXWing,
  type RadarContact,
} from "../src/core/radar";

function contact(overrides: Partial<RadarContact> = {}): RadarContact {
  return {
    id: "contact",
    label: "目标",
    kind: "building",
    distance: 40,
    lateral: 0,
    forward: 1,
    heading: 0,
    priority: 0,
    moving: false,
    missionTarget: false,
    unknown: false,
    ...overrides,
  };
}

test("radar classification separates patrol rover, cargo rover, and X-wing", () => {
  assert.equal(classifyRadarContact({ label: "01 车辆 电动巡检车", userKind: "rover" }), "rover");
  assert.equal(classifyRadarContact({ label: "02 车辆 运输车", userKind: "cargo" }), "cargo");
  assert.equal(classifyRadarContact({ label: "Red X-Wing", typeHint: "xwing" }), "xwing");
  assert.equal(classifyRadarContact({ label: "01 能源 太阳能阵列 A" }), "energy");
  assert.equal(classifyRadarContact({ label: "太阳" }), "sun");
});

test("compact radar keeps mission and moving contacts before static clutter", () => {
  const selection = selectRadarContacts([
    ...Array.from({ length: 14 }, (_, index) => contact({ id: `building-${index}`, distance: index + 1 })),
    contact({ id: "mission", kind: "mission", missionTarget: true, priority: 1000 }),
    contact({ id: "rover", kind: "rover", moving: true, distance: 120 }),
    contact({ id: "xwing", kind: "xwing", distance: 140 }),
  ], "compact");
  assert.equal(selection.visible.length, 12);
  assert.deepEqual(selection.visible.slice(0, 3).map((item) => item.id), ["mission", "rover", "xwing"]);
  assert.equal(selection.hiddenCount, 5);
});

test("expanded radar has a larger cap and stable layout", () => {
  const contacts = Array.from({ length: 34 }, (_, index) => contact({ id: `item-${index}`, distance: index + 1 }));
  const selection = selectRadarContacts(contacts, "expanded");
  assert.equal(selection.visible.length, 32);
  assert.equal(selection.hiddenCount, 2);
  const layout = layoutRadarContact(contact({ distance: 50, lateral: 0.4, forward: 0.7, heading: 35 }), 100, 100, "expanded", 1);
  assert.ok(layout.x > 0);
  assert.ok(layout.y < 0);
  assert.equal(layout.heading, 35);
});

test("radar signatures change when a contact moves or changes kind", () => {
  const first = getRadarContactSignature([contact({ id: "rover", kind: "rover", lateral: 0.1 })]);
  const moved = getRadarContactSignature([contact({ id: "rover", kind: "rover", lateral: 0.2 })]);
  const changed = getRadarContactSignature([contact({ id: "rover", kind: "xwing", lateral: 0.1 })]);
  assert.notEqual(first, moved);
  assert.notEqual(first, changed);
});

test("parked X-wings only enter the ground radar after unlock and outside orbital combat", () => {
  assert.equal(shouldShowParkedXWing({ unlocked: false, active: false, visible: true }), false);
  assert.equal(shouldShowParkedXWing({ unlocked: true, active: true, visible: true }), false);
  assert.equal(shouldShowParkedXWing({ unlocked: true, active: false, visible: false }), false);
  assert.equal(shouldShowParkedXWing({ unlocked: true, active: false, visible: true }), true);
});
