import * as THREE from "three";

export type ColliderShape =
  | { kind: "circle"; radius: number }
  | { kind: "capsule"; radius: number; halfLength: number; heading: number }
  | { kind: "obb"; halfWidth: number; halfDepth: number; heading: number }
  | { kind: "convex2d"; points: readonly THREE.Vector2[] };

export type SphericalCollider<TSource = unknown> = {
  id: string;
  normal: THREE.Vector3;
  shape: ColliderShape;
  source: TSource;
};

export class SphericalCollisionWorld<TSource = unknown> {
  private readonly buckets = new Map<string, SphericalCollider<TSource>[]>();
  private readonly latitudeBins: number;
  private readonly longitudeBins: number;

  constructor(private readonly planetRadius: number, cellDegrees = 12) {
    this.latitudeBins = Math.ceil(180 / cellDegrees);
    this.longitudeBins = Math.ceil(360 / cellDegrees);
  }

  clear() {
    this.buckets.clear();
  }

  add(collider: SphericalCollider<TSource>) {
    const key = this.keyForNormal(collider.normal);
    const bucket = this.buckets.get(key) ?? [];
    bucket.push(collider);
    this.buckets.set(key, bucket);
  }

  query(normal: THREE.Vector3, radius: number): SphericalCollider<TSource>[] {
    const { latitudeIndex, longitudeIndex } = this.indexForNormal(normal);
    const angularRadius = radius / Math.max(1, this.planetRadius);
    const latitudeStep = Math.PI / this.latitudeBins;
    const longitudeStep = (Math.PI * 2) / this.longitudeBins;
    const latitudeRange = Math.max(1, Math.ceil(angularRadius / latitudeStep) + 1);
    const longitudeRange = Math.max(1, Math.ceil(angularRadius / longitudeStep) + 1);
    const result = new Set<SphericalCollider<TSource>>();

    for (let latOffset = -latitudeRange; latOffset <= latitudeRange; latOffset += 1) {
      const lat = Math.min(this.latitudeBins - 1, Math.max(0, latitudeIndex + latOffset));
      for (let lonOffset = -longitudeRange; lonOffset <= longitudeRange; lonOffset += 1) {
        const lon = (longitudeIndex + lonOffset + this.longitudeBins) % this.longitudeBins;
        for (const collider of this.buckets.get(`${lat}:${lon}`) ?? []) result.add(collider);
      }
    }
    return [...result];
  }

  get size() {
    let total = 0;
    for (const bucket of this.buckets.values()) total += bucket.length;
    return total;
  }

  private keyForNormal(normal: THREE.Vector3) {
    const index = this.indexForNormal(normal);
    return `${index.latitudeIndex}:${index.longitudeIndex}`;
  }

  private indexForNormal(normal: THREE.Vector3) {
    const unit = normal.clone().normalize();
    const latitude = Math.asin(THREE.MathUtils.clamp(unit.y, -1, 1));
    const longitude = Math.atan2(unit.x, unit.z);
    const latitudeIndex = Math.min(this.latitudeBins - 1, Math.max(0, Math.floor(((latitude + Math.PI / 2) / Math.PI) * this.latitudeBins)));
    const longitudeIndex = Math.min(
      this.longitudeBins - 1,
      Math.max(0, Math.floor(((longitude + Math.PI) / (Math.PI * 2)) * this.longitudeBins))
    );
    return { latitudeIndex, longitudeIndex };
  }
}

export function colliderBoundingRadius(shape: ColliderShape) {
  if (shape.kind === "circle") return shape.radius;
  if (shape.kind === "capsule") return shape.radius + shape.halfLength;
  if (shape.kind === "obb") return Math.hypot(shape.halfWidth, shape.halfDepth);
  return shape.points.reduce((largest, point) => Math.max(largest, point.length()), 0);
}

