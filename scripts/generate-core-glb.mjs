import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

globalThis.FileReader ??= class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
};

const outputDir = resolve("public/models/core");
mkdirSync(outputDir, { recursive: true });

const palettes = {
  alex: [material("suit", 0xf1e7d4, 0.7, 0.08), material("graphite", 0x242527, 0.58, 0.26), material("visor", 0x183743, 0.2, 0.5, 0x164654)],
  repairRobot: [material("steel", 0xc9c4b8, 0.4, 0.65), material("graphite", 0x44484a, 0.58, 0.48), material("sensor", 0x64d9ef, 0.24, 0.2, 0x2596b3)],
  rover: [material("steel", 0xc5c8c4, 0.34, 0.62), material("graphite", 0x111416, 0.68, 0.3), material("glass", 0x18343e, 0.2, 0.5, 0x0c3442)],
  habitat: [material("hull", 0xf1e6d2, 0.62, 0.1), material("trim", 0xc96d3c, 0.64, 0.06), material("glass", 0x1a4654, 0.18, 0.44, 0x174d5e)],
};

const builders = {
  alex: buildAlex,
  repairRobot: buildRepairRobot,
  rover: buildRover,
  habitat: buildHabitat,
};

for (const [id, builder] of Object.entries(builders)) {
  const scene = new THREE.Group();
  scene.name = `${id}-core-lod`;
  for (let level = 0; level < 3; level += 1) scene.add(collapseParts(`LOD${level}`, builder(level), palettes[id]));
  const binary = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: false });
  const bytes = binary instanceof ArrayBuffer ? new Uint8Array(binary) : new TextEncoder().encode(JSON.stringify(binary));
  writeFileSync(resolve(outputDir, `${id}.glb`), bytes);
  console.log(`${id}.glb ${bytes.byteLength} bytes`);
}

function material(name, color, roughness, metalness, emissive = 0x000000) {
  const value = new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: emissive ? 0.42 : 0 });
  value.name = name;
  return value;
}

function part(geometry, materialIndex, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const object = new THREE.Object3D();
  object.position.fromArray(position);
  object.rotation.set(...rotation);
  object.scale.fromArray(scale);
  object.updateMatrix();
  return { geometry: geometry.clone().applyMatrix4(object.matrix), materialIndex };
}

function profilePrismGeometry(profile, width) {
  const halfWidth = width / 2;
  const vertices = [];
  for (const x of [-halfWidth, halfWidth]) {
    for (const [z, y] of profile) vertices.push(x, y, z);
  }
  const faces = [];
  for (let index = 1; index < profile.length - 1; index += 1) faces.push(0, index, index + 1);
  const offset = profile.length;
  for (let index = 1; index < profile.length - 1; index += 1) faces.push(offset, offset + index + 1, offset + index);
  for (let index = 0; index < profile.length; index += 1) {
    const next = (index + 1) % profile.length;
    faces.push(index, next, offset + next, index, offset + next, offset + index);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return geometry;
}

function collapseParts(name, parts, materials) {
  const group = new THREE.Group();
  group.name = name;
  for (let materialIndex = 0; materialIndex < materials.length; materialIndex += 1) {
    const geometries = parts.filter((item) => item.materialIndex === materialIndex).map((item) => item.geometry.index ? item.geometry.toNonIndexed() : item.geometry);
    if (geometries.length === 0) continue;
    const merged = mergeGeometries(normalizeAttributes(geometries), false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, materials[materialIndex]);
    mesh.name = `${name}-${materials[materialIndex].name}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

function normalizeAttributes(geometries) {
  const common = new Set(Object.keys(geometries[0].attributes));
  for (const geometry of geometries.slice(1)) {
    for (const name of [...common]) if (!geometry.getAttribute(name)) common.delete(name);
  }
  for (const geometry of geometries) {
    for (const name of Object.keys(geometry.attributes)) if (!common.has(name)) geometry.deleteAttribute(name);
  }
  return geometries;
}

function buildAlex(level) {
  const radial = level === 0 ? 14 : level === 1 ? 10 : 7;
  const parts = [
    part(new THREE.CapsuleGeometry(0.34, 0.38, level === 0 ? 7 : 4, radial), 0, [0, 1.08, 0], [0, 0, 0], [1.12, 1, 0.72]),
    part(new THREE.BoxGeometry(0.68, 0.26, 0.42), 0, [0, 0.58, 0]),
    part(new THREE.SphereGeometry(0.42, radial, Math.max(6, radial - 3)), 0, [0, 1.94, 0], [0, 0, 0], [1.04, 0.94, 1]),
    part(new THREE.CylinderGeometry(0.25, 0.29, 0.22, radial), 1, [0, 1.63, 0]),
    part(new THREE.CapsuleGeometry(0.22, 0.38, 4, radial), 1, [0, 1.08, 0.36], [0, 0, 0], [1.2, 1, 0.62]),
    part(new THREE.BoxGeometry(0.5, 0.3, 0.075), 1, [0, 1.22, -0.31]),
    part(new THREE.SphereGeometry(0.34, radial, Math.max(5, radial - 4)), 2, [0, 1.94, -0.21], [0, 0, 0], [0.92, 0.68, 0.58]),
    part(new THREE.SphereGeometry(0.18, Math.max(7, radial - 2), 6), 0, [-0.5, 1.39, 0], [0, 0, 0], [1, 0.84, 0.9]),
    part(new THREE.SphereGeometry(0.18, Math.max(7, radial - 2), 6), 0, [0.5, 1.39, 0], [0, 0, 0], [1, 0.84, 0.9]),
  ];
  if (level < 2) {
    parts.push(part(new THREE.CylinderGeometry(0.09, 0.09, 0.82, 8), 0, [-0.18, 1.08, 0.52]));
    parts.push(part(new THREE.CylinderGeometry(0.09, 0.09, 0.82, 8), 0, [0.18, 1.08, 0.52]));
    parts.push(part(new THREE.BoxGeometry(0.76, 0.12, 0.46), 1, [0, 0.53, 0]));
  }
  return parts;
}

function buildRepairRobot(level) {
  const radial = level === 0 ? 12 : level === 1 ? 8 : 6;
  const parts = [
    part(new THREE.CapsuleGeometry(0.28, 0.28, level === 0 ? 6 : 4, radial), 0, [0, 1.12, 0], [0, 0, 0], [1.08, 1, 0.76]),
    part(new THREE.SphereGeometry(0.3, radial, Math.max(5, radial - 3)), 0, [0, 1.86, 0], [0, 0, 0], [1.08, 0.82, 0.9]),
    part(new THREE.SphereGeometry(0.13, Math.max(6, radial - 2), Math.max(5, radial - 3)), 0, [-0.43, 1.42, 0], [0, 0, 0], [1, 0.86, 0.92]),
    part(new THREE.SphereGeometry(0.13, Math.max(6, radial - 2), Math.max(5, radial - 3)), 0, [0.43, 1.42, 0], [0, 0, 0], [1, 0.86, 0.92]),
    part(new THREE.BoxGeometry(0.18, 0.2, 0.28), 0, [-0.43, 1.42, 0]),
    part(new THREE.BoxGeometry(0.18, 0.2, 0.28), 0, [0.43, 1.42, 0]),
    part(new THREE.BoxGeometry(0.48, 0.18, 0.32), 1, [0, 0.66, 0]),
    part(new THREE.BoxGeometry(0.5, 0.36, 0.04), 1, [0, 1.15, -0.23]),
    part(new THREE.BoxGeometry(0.4, 0.13, 0.04), 1, [0, 1.85, -0.28]),
    part(new THREE.BoxGeometry(0.24, 0.07, 0.03), 2, [0, 1.86, -0.315]),
  ];
  if (level === 0) parts.push(part(new THREE.BoxGeometry(0.18, 0.045, 0.025), 2, [0.11, 1.18, -0.275]));
  return parts;
}

function buildRover(level) {
  const bodyProfile = [
    [-3.35, 0.56],
    [-3.3, 1.12],
    [-2.38, 1.3],
    [-0.58, 2.16],
    [3.34, 1.17],
    [3.34, 0.56],
  ];
  const parts = [
    part(profilePrismGeometry(bodyProfile, 2.5), 0),
    part(new THREE.BoxGeometry(2.62, 0.28, 6.28), 1, [0, 0.48, 0]),
    part(new THREE.BoxGeometry(2.34, 0.055, 1.91), 2, [0, 1.72, -1.48], [-0.45, 0, 0]),
    part(new THREE.BoxGeometry(2.18, 0.075, 0.055), 2, [0, 1.12, -3.37]),
  ];
  if (level < 2) {
    const frontWindow = [[-2.3, 1.34], [-0.62, 2.1], [-0.08, 2.08], [-0.18, 1.36]];
    const rearWindow = [[0.02, 1.36], [0.02, 2.07], [1.24, 1.7], [1.34, 1.31]];
    for (const side of [-1, 1]) {
      parts.push(part(profilePrismGeometry(frontWindow, 0.04), 2, [side * 1.27, 0, 0]));
      parts.push(part(profilePrismGeometry(rearWindow, 0.04), 2, [side * 1.27, 0, 0]));
      parts.push(part(new THREE.BoxGeometry(0.055, 0.055, 4.95), 1, [side * 1.29, 1.27, 0.25]));
      for (const z of [-2.18, 2.04]) {
        parts.push(part(new THREE.TorusGeometry(0.65, 0.09, level === 0 ? 6 : 4, level === 0 ? 14 : 9), 1, [side * 1.3, 0.56, z], [0, Math.PI / 2, 0]));
      }
    }
  }
  return parts;
}

function buildHabitat(level) {
  const radial = level === 0 ? 18 : level === 1 ? 12 : 8;
  const parts = [
    part(new THREE.CylinderGeometry(2.35, 2.35, 12.5, radial), 0, [0, 0, 0], [0, 0, Math.PI / 2]),
    part(new THREE.BoxGeometry(13.8, 0.42, 5.4), 1, [0, -2.46, 0]),
    part(new THREE.BoxGeometry(1.5, 2.28, 0.14), 1, [0, -0.2, -2.46]),
  ];
  if (level < 2) {
    for (const x of [-5.12, 5.12]) parts.push(part(new THREE.TorusGeometry(2.4, 0.1, 6, radial), 1, [x, 0, 0], [0, Math.PI / 2, 0]));
    const windows = level === 0 ? [-3.7, -1.85, 0, 1.85, 3.7] : [-2.2, 0, 2.2];
    for (const x of windows) parts.push(part(new THREE.BoxGeometry(1.05, 0.42, 0.06), 2, [x, 0.68, -2.38]));
  }
  return parts;
}
