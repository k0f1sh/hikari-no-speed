import { Euler, PerspectiveCamera, Vector3 } from 'three';
import { LIGHT_SPEED } from './data/celestialBodies';
import { toWorld } from './utils/units';
export class CameraController {
  position = new Vector3(0, 0, 24);
  speeds = [
    1,
    10,
    100,
    1000,
    10000,
    LIGHT_SPEED,
    LIGHT_SPEED * 10,
    LIGHT_SPEED * 100,
    LIGHT_SPEED * 1000,
  ];
  speedIndex = 5;
  travelled = 0;
  private keys = new Set<string>();
  private yaw = 0;
  private pitch = 0;
  get speed() {
    return this.speeds[this.speedIndex];
  }
  constructor(
    public camera: PerspectiveCamera,
    public canvas: HTMLCanvasElement,
  ) {
    document.addEventListener('keydown', (e) => {
      if (
        document.pointerLockElement !== canvas &&
        (e.target as HTMLElement).matches('input,button,select')
      )
        return;
      if (['Space', 'ShiftLeft', 'ShiftRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code))
        e.preventDefault();
      if (document.pointerLockElement === canvas) this.keys.add(e.code);
    });
    document.addEventListener('keyup', (e) => this.keys.delete(e.code));
    document.addEventListener('pointerlockchange', () => this.keys.clear());
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.clearInput();
    });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== canvas) return;
      this.yaw -= e.movementX * 0.002;
      this.pitch = Math.max(
        -Math.PI / 2 + 0.01,
        Math.min(Math.PI / 2 - 0.01, this.pitch - e.movementY * 0.002),
      );
      camera.quaternion.setFromEuler(new Euler(this.pitch, this.yaw, 0, 'YXZ'));
    });
    canvas.addEventListener('click', () => {
      this.lock();
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.speedIndex = Math.max(
          0,
          Math.min(this.speeds.length - 1, this.speedIndex + (e.deltaY < 0 ? 1 : -1)),
        );
      },
      { passive: false },
    );
  }
  lock() {
    const result = this.canvas.requestPointerLock();
    if (result)
      result.catch(() => {
        document.dispatchEvent(new Event('flight-lock-error'));
      });
  }
  clearInput() {
    this.keys.clear();
  }
  update(dt: number) {
    const v = new Vector3(
      Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')),
      0,
      Number(this.keys.has('KeyS')) - Number(this.keys.has('KeyW')),
    );
    v.applyQuaternion(this.camera.quaternion);
    v.y +=
      Number(this.keys.has('Space')) -
      Number(this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'));
    if (v.lengthSq()) {
      const km = this.speed * dt;
      this.position.add(v.normalize().multiplyScalar(toWorld(km)));
      this.travelled += km;
    }
  }
  lookAt(target: Vector3) {
    this.camera.position.copy(this.position);
    this.camera.lookAt(target);
    const e = new Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.pitch = e.x;
    this.yaw = e.y;
    this.camera.position.set(0, 0, 0);
  }
}
