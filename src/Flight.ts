import { Vector3 } from 'three';
import { bodyIndex, celestialBodies } from './data/celestialBodies';
import { ScaleManager } from './ScaleManager';
import { approach, observationRadius, safeTravelDistance } from './utils/navigation';
import { KM_PER_WORLD_UNIT, toWorld } from './utils/units';

interface FlightController {
  position: Vector3;
  speed: number;
  travelled: number;
  update(dt: number): void;
}

/** Shared movement behavior for the render loop and regression checks. */
export class Flight {
  target = bodyIndex('Earth');
  active = false;

  constructor(
    private controller: FlightController,
    private scale: ScaleManager,
  ) {}

  start(target: number): void {
    this.target = target;
    this.active = true;
  }

  stop(): void {
    this.active = false;
  }

  jump(target: number): number {
    this.stop();
    this.target = target;
    const previous = this.controller.position.clone();
    const body = celestialBodies[target];
    this.controller.position
      .copy(this.scale.position(body))
      .add(new Vector3(0, 0, observationRadius(this.scale.radius(body))));
    return previous.distanceTo(this.controller.position) * KM_PER_WORLD_UNIT;
  }

  update(dt: number): { arrived: boolean; blocked: boolean; moved: boolean } {
    const controller = this.controller;
    if (this.active) {
      const body = celestialBodies[this.target];
      const result = approach(
        controller.position,
        this.scale.position(body),
        observationRadius(this.scale.radius(body)),
        toWorld(controller.speed * dt),
      );
      controller.position.copy(result.position);
      controller.travelled += result.step * KM_PER_WORLD_UNIT;
      if (result.arrived) {
        this.stop();
      }
      // Guided travel passes through intervening bodies; only its destination stops it.
      return { arrived: result.arrived, blocked: false, moved: result.step > 0 };
    }

    const previous = controller.position.clone();
    controller.update(dt);
    const movement = controller.position.clone().sub(previous);
    const length = movement.length();
    if (length === 0) return { arrived: false, blocked: false, moved: false };
    const allowed = safeTravelDistance(
      previous,
      controller.position,
      celestialBodies.map((body) => ({
        center: this.scale.position(body),
        radius: this.scale.radius(body) * 1.05,
      })),
    );
    const blocked = allowed < length;
    if (blocked) {
      controller.position.copy(previous).addScaledVector(movement.normalize(), allowed);
      controller.travelled -= (length - allowed) * KM_PER_WORLD_UNIT;
    }
    return { arrived: false, blocked, moved: allowed > 0 };
  }
}
