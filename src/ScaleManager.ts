import { Vector3 } from 'three';
import { bodyByName, type CelestialBody } from './data/celestialBodies';
import { toWorld } from './utils/units';

/** Body positions and radii always use the same physical scale. */
export class ScaleManager {
  position(body: CelestialBody): Vector3 {
    if (body.orbit) {
      return this.position(bodyByName(body.orbit.parent)).add(
        new Vector3(0, 0, toWorld(body.orbit.distance)),
      );
    }
    // Fixed alignment, not current astronomical positions.
    return new Vector3(toWorld(body.distanceFromSun), 0, 0);
  }

  radius(body: CelestialBody): number {
    return toWorld(body.diameter / 2);
  }
}
