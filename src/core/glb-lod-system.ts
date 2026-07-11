import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CORE_MODEL_SPECS, type CoreModelId } from "./model-assets";

const loader = new GLTFLoader();
const sourceCache = new Map<CoreModelId, Promise<THREE.Group>>();

export type AttachCoreLodOptions = {
  scale?: number;
  hideFallback?: (anchor: THREE.Object3D) => void;
};

export async function attachCoreLodModel(
  anchor: THREE.Object3D,
  modelId: CoreModelId,
  options: AttachCoreLodOptions = {},
) {
  const spec = CORE_MODEL_SPECS.find((item) => item.id === modelId);
  if (!spec) throw new Error(`Missing core model spec: ${modelId}`);
  const source = await loadSource(modelId, spec.url);
  const clone = source.clone(true);
  const lod = new THREE.LOD();
  lod.name = `${modelId} GLB LOD`;
  for (let index = 0; index < 3; index += 1) {
    const level = clone.getObjectByName(`LOD${index}`);
    if (!level) throw new Error(`${modelId}: GLB is missing LOD${index}`);
    level.removeFromParent();
    level.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (modelId === "habitat") {
        // The habitat is viewed from both sides: the shell must remain sealed
        // when the camera is inside, otherwise the skybox leaks through the
        // outward-facing GLB normals.
        for (const material of materials) {
          material.side = THREE.DoubleSide;
          material.needsUpdate = true;
        }
      }
      const isGlass = materials.some((material) => {
        const name = material.name.toLowerCase();
        return material.transparent || name.includes("glass") || name.includes("window");
      }) || object.name.toLowerCase().includes("glass") || object.name.toLowerCase().includes("window");
      object.castShadow = !isGlass;
      object.receiveShadow = !isGlass;
    });
    lod.addLevel(level, spec.lodDistances[index]);
  }
  lod.scale.setScalar(options.scale ?? 1);
  anchor.add(lod);
  options.hideFallback?.(anchor);
  return lod;
}

export function hideMarkedCoreFallback(anchor: THREE.Object3D) {
  anchor.traverse((object) => {
    if (object.userData.coreLodFallback === true) object.visible = false;
  });
}

function loadSource(id: CoreModelId, url: string) {
  const cached = sourceCache.get(id);
  if (cached) return cached;
  const request = loader.loadAsync(url).then((gltf) => gltf.scene);
  sourceCache.set(id, request);
  return request;
}
