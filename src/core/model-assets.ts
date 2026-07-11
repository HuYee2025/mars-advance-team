import type { ColliderShape } from "./collision-world";

export type CoreModelId = "alex" | "repairRobot" | "rover" | "habitat";

export type CoreModelSpec = {
  id: CoreModelId;
  source: "glb-with-procedural-fallback";
  url: string;
  maxMaterials: 3;
  lodTriangleRatios: readonly [1, number, number];
  lodDistances: readonly [0, number, number];
  collision: ColliderShape;
  scaleMeters: number;
};

export const CORE_MODEL_SPECS: readonly CoreModelSpec[] = [
  { id: "alex", source: "glb-with-procedural-fallback", url: "/models/core/alex.glb", maxMaterials: 3, lodTriangleRatios: [1, 0.45, 0.16], lodDistances: [0, 22, 52], collision: { kind: "capsule", radius: 0.42, halfLength: 0.58, heading: 0 }, scaleMeters: 1.78 },
  { id: "repairRobot", source: "glb-with-procedural-fallback", url: "/models/core/repairRobot.glb", maxMaterials: 3, lodTriangleRatios: [1, 0.42, 0.14], lodDistances: [0, 24, 58], collision: { kind: "capsule", radius: 0.38, halfLength: 0.42, heading: 0 }, scaleMeters: 1.42 },
  { id: "rover", source: "glb-with-procedural-fallback", url: "/models/core/rover.glb", maxMaterials: 3, lodTriangleRatios: [1, 0.38, 0.12], lodDistances: [0, 45, 105], collision: { kind: "obb", halfWidth: 1.15, halfDepth: 2.25, heading: 0 }, scaleMeters: 4.5 },
  { id: "habitat", source: "glb-with-procedural-fallback", url: "/models/core/habitat.glb", maxMaterials: 3, lodTriangleRatios: [1, 0.32, 0.08], lodDistances: [0, 70, 150], collision: { kind: "obb", halfWidth: 5.8, halfDepth: 9.4, heading: 0 }, scaleMeters: 18.8 },
];

export function validateCoreModelSpecs(specs = CORE_MODEL_SPECS): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const spec of specs) {
    if (ids.has(spec.id)) errors.push(`${spec.id}: duplicate model id`);
    ids.add(spec.id);
    if (spec.maxMaterials > 3) errors.push(`${spec.id}: material budget exceeded`);
    const [high, medium, low] = spec.lodTriangleRatios;
    if (high !== 1 || medium >= high || low >= medium || low <= 0) errors.push(`${spec.id}: invalid LOD ratios`);
    if (spec.scaleMeters <= 0) errors.push(`${spec.id}: invalid scale`);
  }
  return errors;
}
