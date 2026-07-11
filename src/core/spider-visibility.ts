import type { Vector3 } from "three";

// Keep a small negative margin so the terminator does not flicker between lit
// and shaded frames while a spider is moving along the night-side boundary.
export const SPIDER_SHADE_DOT_MAX = -0.02;

export function isSpiderInShade(normal: Vector3, sunDirection?: Vector3 | null) {
  if (!sunDirection || sunDirection.lengthSq() < 0.000001) return true;
  return normal.clone().normalize().dot(sunDirection.clone().normalize()) <= SPIDER_SHADE_DOT_MAX;
}
