import * as THREE from "three";

export type StaticBatchResult = {
  sourceMeshes: number;
  batchMeshes: number;
  skippedMeshes: number;
};

type BatchBucket = {
  material: THREE.Material;
  renderOrder: number;
  castShadow: boolean;
  receiveShadow: boolean;
  geometries: THREE.BufferGeometry[];
  sources: THREE.Mesh[];
};

export function batchStaticMeshes(
  roots: readonly THREE.Object3D[],
  excludedBranches: ReadonlySet<THREE.Object3D> = new Set(),
): StaticBatchResult {
  const uniqueRoots = [...new Set(roots)];
  const result: StaticBatchResult = { sourceMeshes: 0, batchMeshes: 0, skippedMeshes: 0 };
  for (const root of uniqueRoots) batchRoot(root, excludedBranches, result);
  return result;
}

function batchRoot(root: THREE.Object3D, excludedBranches: ReadonlySet<THREE.Object3D>, result: StaticBatchResult) {
  root.updateWorldMatrix(true, true);
  const inverseRootWorld = root.matrixWorld.clone().invert();
  const buckets = new Map<string, BatchBucket>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || object instanceof THREE.SkinnedMesh) return;
    if (isExcluded(object, root, excludedBranches) || object.userData.noStaticBatch === true || Array.isArray(object.material)) {
      result.skippedMeshes += 1;
      return;
    }
    const geometry = object.geometry;
    if (!geometry?.getAttribute("position") || geometry.morphAttributes.position?.length) {
      result.skippedMeshes += 1;
      return;
    }
    const material = object.material;
    const key = `${material.uuid}:${object.renderOrder}:${Number(object.castShadow)}:${Number(object.receiveShadow)}`;
    const bucket: BatchBucket = buckets.get(key) ?? {
      material,
      renderOrder: object.renderOrder,
      castShadow: object.castShadow,
      receiveShadow: object.receiveShadow,
      geometries: [],
      sources: [],
    };
    const relativeMatrix = inverseRootWorld.clone().multiply(object.matrixWorld);
    const transformed = geometry.clone().applyMatrix4(relativeMatrix);
    const bakedGeometry = transformed.index ? transformed.toNonIndexed() : transformed;
    if (bakedGeometry !== transformed) transformed.dispose();
    for (const name of Object.keys(bakedGeometry.attributes)) {
      if (!['position', 'normal', 'uv', 'color', 'tangent'].includes(name)) bakedGeometry.deleteAttribute(name);
    }
    bucket.geometries.push(bakedGeometry);
    bucket.sources.push(object);
    buckets.set(key, bucket);
  });

  let batchIndex = 0;
  for (const bucket of buckets.values()) {
    if (bucket.geometries.length < 2) {
      bucket.geometries.forEach((geometry) => geometry.dispose());
      result.skippedMeshes += bucket.sources.length;
      continue;
    }
    const normalized = normalizeGeometryAttributes(bucket.geometries);
    const merged = mergeNonIndexedGeometries(normalized);
    normalized.forEach((geometry) => {
      if (geometry !== merged) geometry.dispose();
    });
    if (!merged) {
      result.skippedMeshes += bucket.sources.length;
      continue;
    }
    const mesh = new THREE.Mesh(merged, bucket.material);
    mesh.name = `${root.name || "static-root"} batch ${batchIndex + 1}`;
    mesh.renderOrder = bucket.renderOrder;
    mesh.castShadow = bucket.castShadow;
    mesh.receiveShadow = bucket.receiveShadow;
    mesh.userData.staticBatch = true;
    root.add(mesh);
    for (const source of bucket.sources) source.visible = false;
    result.sourceMeshes += bucket.sources.length;
    result.batchMeshes += 1;
    batchIndex += 1;
  }
}

function mergeNonIndexedGeometries(geometries: THREE.BufferGeometry[]) {
  if (geometries.length === 0) return null;
  const merged = new THREE.BufferGeometry();
  for (const name of Object.keys(geometries[0].attributes)) {
    const attributes = geometries.map((geometry) => geometry.getAttribute(name)).filter((attribute): attribute is THREE.BufferAttribute => attribute instanceof THREE.BufferAttribute);
    if (attributes.length !== geometries.length) return null;
    const first = attributes[0];
    const ArrayType = first.array.constructor as { new(length: number): THREE.TypedArray };
    const length = attributes.reduce((total, attribute) => total + attribute.array.length, 0);
    const array = new ArrayType(length);
    let offset = 0;
    for (const attribute of attributes) {
      array.set(attribute.array, offset);
      offset += attribute.array.length;
    }
    merged.setAttribute(name, new THREE.BufferAttribute(array, first.itemSize, first.normalized));
  }
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function isExcluded(object: THREE.Object3D, root: THREE.Object3D, excludedBranches: ReadonlySet<THREE.Object3D>) {
  let current: THREE.Object3D | null = object;
  while (current && current !== root) {
    if (excludedBranches.has(current)) return true;
    current = current.parent;
  }
  return excludedBranches.has(root);
}

function normalizeGeometryAttributes(geometries: THREE.BufferGeometry[]) {
  const common = new Set(Object.keys(geometries[0]?.attributes ?? {}));
  for (const geometry of geometries.slice(1)) {
    for (const name of [...common]) {
      if (!geometry.getAttribute(name)) common.delete(name);
    }
  }
  return geometries.map((geometry) => {
    for (const name of Object.keys(geometry.attributes)) {
      if (!common.has(name)) geometry.deleteAttribute(name);
    }
    return geometry;
  });
}
