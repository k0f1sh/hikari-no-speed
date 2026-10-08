import * as THREE from 'three';
import { toWorld } from './utils/units';

/** About 1–10 seconds per cell, rounded to familiar powers of ten. */
export function gridSpacingKm(speedKmPerSecond: number): number {
  return 10 ** Math.round(Math.log10(Math.max(1, speedKmPerSecond) * 3));
}

interface GridLayer {
  spacingKm: number;
  opacity: number;
  mesh: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
}

/**
 * An optional navigation reference, not physical objects.
 * X/Z lines belong to a world-fixed lattice. The reference plane follows
 * camera altitude so it remains below the viewer during free flight.
 */
export class TravelGrid {
  visible = true;
  spacingKm: number;
  private layers = new Map<number, GridLayer>();
  private readonly halfCells = 16;
  constructor(
    private scene: THREE.Scene,
    speed: number,
  ) {
    this.spacingKm = gridSpacingKm(speed);
    const layer = this.createLayer(this.spacingKm);
    layer.opacity = 1;
    layer.mesh.material.opacity = 0.24;
  }
  private createLayer(spacingKm: number): GridLayer {
    const size = this.halfCells * 2;
    // Short segments allow gradual per-vertex fading in every direction.
    const vertexCount = (size + 1) * size * 4;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3),
    );
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
    const material = new THREE.LineBasicMaterial({
      color: 0x7e9fb9,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.LineSegments(geometry, material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    const layer = { spacingKm, opacity: 0, mesh };
    this.layers.set(spacingKm, layer);
    return layer;
  }
  update(origin: THREE.Vector3, speed: number, dt: number) {
    this.spacingKm = gridSpacingKm(speed);
    if (this.visible && !this.layers.has(this.spacingKm)) this.createLayer(this.spacingKm);
    for (const [spacing, layer] of this.layers) {
      const desired = this.visible && spacing === this.spacingKm ? 1 : 0;
      layer.opacity += (desired - layer.opacity) * (1 - Math.exp(-dt * 7));
      if (desired === 0 && layer.opacity < 0.002) {
        this.scene.remove(layer.mesh);
        layer.mesh.geometry.dispose();
        layer.mesh.material.dispose();
        this.layers.delete(spacing);
        continue;
      }
      // OFF is immediate. Spacing transitions cross-fade without moving lines.
      layer.mesh.visible = this.visible;
      if (!this.visible) continue;
      layer.mesh.material.opacity = layer.opacity * 0.24;
      this.updateVertices(layer, origin);
    }
  }
  private updateVertices(layer: GridLayer, origin: THREE.Vector3) {
    const cell = toWorld(layer.spacingKm);
    // Compute phase in double precision before writing camera-relative Float32.
    // A new patch entering at an edge is invisible due to the distance fade.
    const phaseX = ((origin.x % cell) + cell) % cell;
    const phaseZ = ((origin.z % cell) + cell) % cell;
    const positions = layer.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = layer.mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    let vertex = 0;
    const write = (x: number, z: number, major: boolean) => {
      positions.setXYZ(vertex, x, -cell * 1.2, z);
      const radius = Math.hypot(x, z) / cell;
      const fade = 1 - THREE.MathUtils.smoothstep(radius, 6, 15);
      const intensity = fade * (major ? 1 : 0.5);
      colors.setXYZ(vertex, intensity, intensity, intensity);
      vertex++;
    };
    const majorX = Math.round((origin.x - phaseX) / cell);
    const majorZ = Math.round((origin.z - phaseZ) / cell);
    for (let line = -this.halfCells; line <= this.halfCells; line++) {
      const x = line * cell - phaseX,
        z = line * cell - phaseZ;
      for (let segment = -this.halfCells; segment < this.halfCells; segment++) {
        const start = segment * cell,
          end = (segment + 1) * cell;
        write(x, start - phaseZ, (majorX + line) % 5 === 0);
        write(x, end - phaseZ, (majorX + line) % 5 === 0);
        write(start - phaseX, z, (majorZ + line) % 5 === 0);
        write(end - phaseX, z, (majorZ + line) % 5 === 0);
      }
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  }
}
