import * as THREE from 'three';
import { celestialBodies, bodyByName, type CelestialBody } from './data/celestialBodies';
import { toWorld } from './utils/units';
import { ScaleManager } from './ScaleManager';
export class SolarSystem {
  scene = new THREE.Scene();
  meshes: THREE.Mesh[] = [];
  orbits: THREE.LineLoop[] = [];
  orbitsVisible = true;
  private sunlight = new THREE.DirectionalLight(0xffead4, 2);
  private orbitBodies: CelestialBody[] = [];
  constructor(
    public scale: ScaleManager,
    public bodies = celestialBodies,
  ) {
    this.scene.background = new THREE.Color('#05070a');
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.18));
    bodies.forEach((b) => {
      const material =
        b.name === 'Sun'
          ? new THREE.MeshStandardMaterial({
              color: b.color,
              emissive: b.color,
              emissiveIntensity: 1,
            })
          : new THREE.MeshStandardMaterial({ color: b.color, roughness: 1 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(scale.radius(b), 48, 32), material);
      this.meshes.push(mesh);
      this.scene.add(mesh);
      if (b.name !== 'Sun') {
        this.orbitBodies.push(b);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(1024 * 3), 3));
        const orbit = new THREE.LineLoop(
          geometry,
          new THREE.LineBasicMaterial({ color: 0x718092, transparent: true, opacity: 0.12 }),
        );
        orbit.frustumCulled = false;
        this.orbits.push(orbit);
        this.scene.add(orbit);
      }
    });
    this.scene.add(this.sunlight, this.sunlight.target);
  }
  update(origin: THREE.Vector3) {
    this.meshes.forEach((mesh, i) =>
      mesh.position.copy(this.scale.position(this.bodies[i])).sub(origin),
    );
    // A directional sunlight approximation avoids artificially dimming distant planets.
    const direction = origin.clone().normalize();
    if (direction.lengthSq() === 0) direction.set(0, 0, 1);
    this.sunlight.position.copy(direction.negate().multiplyScalar(100));
    this.sunlight.target.position.set(0, 0, 0);
    this.orbits.forEach((orbit, i) => {
      orbit.visible = this.orbitsVisible;
      if (!orbit.visible) return;
      const body = this.orbitBodies[i];
      const center = body.orbit
        ? this.scale.position(bodyByName(body.orbit.parent))
        : new THREE.Vector3();
      const radius = body.orbit ? toWorld(body.orbit.distance) : this.scale.position(body).x;
      const attribute = orbit.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let j = 0; j < attribute.count; j++) {
        const angle = (j / attribute.count) * Math.PI * 2;
        // Subtract the double-precision origin before conversion to GPU Float32.
        attribute.setXYZ(
          j,
          center.x + Math.cos(angle) * radius - origin.x,
          center.y - origin.y,
          center.z + Math.sin(angle) * radius - origin.z,
        );
      }
      attribute.needsUpdate = true;
    });
  }
}
