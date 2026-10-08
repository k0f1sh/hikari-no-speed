import { Vector3 } from 'three';
import { KM_PER_WORLD_UNIT } from './units';

export function surfaceDistanceKm(position: Vector3, destination: Vector3, radius: number) {
  return Math.max(0, position.distanceTo(destination) - radius) * KM_PER_WORLD_UNIT;
}

export function observationRadius(radius: number) {
  return radius * 5;
}

export function observationDistanceKm(position: Vector3, destination: Vector3, radius: number) {
  const remaining = position.distanceTo(destination) - observationRadius(radius);
  return remaining <= 1e-8 ? 0 : remaining * KM_PER_WORLD_UNIT;
}

/** Movement uses wall time; lifecycle changes discard the inactive interval. */
export class MovementClock {
  private previous: number;
  private paused = false;
  constructor(now: number) {
    this.previous = now;
  }
  setPaused(paused: boolean, now: number) {
    this.paused = paused;
    this.previous = now;
  }
  tick(now: number) {
    const elapsed = Math.max(0, (now - this.previous) / 1000);
    this.previous = now;
    return this.paused ? 0 : elapsed;
  }
}

/** Return a non-overshooting step, leaving room to view the destination. */
export function approach(
  position: Vector3,
  destination: Vector3,
  standOff: number,
  budget: number,
) {
  const direction = destination.clone().sub(position);
  const remaining = direction.length() - standOff;
  const available = remaining <= 1e-8 ? 0 : remaining;
  const step = Math.min(Math.max(0, budget), available);
  return {
    position: position.clone().addScaledVector(direction.normalize(), step),
    step,
    arrived: available <= step + 1e-8,
  };
}

/** First collision along the entire segment, not just at the end of a frame. */
export function safeTravelDistance(
  previous: Vector3,
  next: Vector3,
  spheres: { center: Vector3; radius: number }[],
) {
  const movement = next.clone().sub(previous),
    length = movement.length();
  if (length === 0) return 0;
  const direction = movement.normalize();
  let nearestHit = length;
  spheres.forEach(({ center, radius }) => {
    const offset = previous.clone().sub(center);
    const b = offset.dot(direction),
      c = offset.lengthSq() - radius * radius,
      discriminant = b * b - c;
    if (c >= 0 && discriminant >= 0) {
      const hit = -b - Math.sqrt(discriminant);
      if (hit >= 0 && hit < nearestHit) nearestHit = Math.max(0, hit - 1e-7);
    }
  });
  return nearestHit;
}
