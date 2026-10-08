import assert from 'node:assert/strict';
import { Vector3, Scene, PerspectiveCamera, LineSegments } from 'three';
import { TravelGrid, gridSpacingKm } from '../src/TravelGrid';
import { celestialBodies, bodyIndex, bodyByName, LIGHT_SPEED } from '../src/data/celestialBodies';
import { ScaleManager } from '../src/ScaleManager';
import { SolarSystem } from '../src/SolarSystem';
import { toWorld, KM_PER_WORLD_UNIT, duration } from '../src/utils/units';
import {
  approach,
  safeTravelDistance,
  surfaceDistanceKm,
  observationRadius,
  observationDistanceKm,
  MovementClock,
} from '../src/utils/navigation';
import { targetBearing } from '../src/TargetHUD';
import { mapPosition } from '../src/MiniMap';
import { Flight } from '../src/Flight';
import { CameraController } from '../src/CameraController';
assert.equal(LIGHT_SPEED, 299792.458);
assert.equal(bodyByName('Sun').diameter, 1391400);
assert.equal(bodyByName('Saturn').distanceFromSun, 1432041000);
assert.equal(bodyByName('Neptune').distanceFromSun, 4514953000);
const documentHandlers = new Map<string, EventListener[]>(),
  windowHandlers = new Map<string, EventListener[]>();
const fakeCanvas = { addEventListener() {} } as unknown as HTMLCanvasElement;
const fakeDocument = {
  pointerLockElement: fakeCanvas,
  hidden: false,
  addEventListener(name: string, fn: EventListener) {
    const handlers = documentHandlers.get(name) || [];
    handlers.push(fn);
    documentHandlers.set(name, handlers);
  },
};
const fakeWindow = {
  addEventListener(name: string, fn: EventListener) {
    const handlers = windowHandlers.get(name) || [];
    handlers.push(fn);
    windowHandlers.set(name, handlers);
  },
};
Object.defineProperty(globalThis, 'document', { configurable: true, value: fakeDocument });
Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
function pressForward() {
  const event = {
    code: 'KeyW',
    preventDefault() {},
    target: {
      matches() {
        return false;
      },
    },
  } as unknown as KeyboardEvent;
  for (const handler of documentHandlers.get('keydown') ?? []) handler(event);
}
for (const fps of [60, 10, 5]) {
  const manual = new CameraController(new PerspectiveCamera(), fakeCanvas);
  const clock = new MovementClock(0),
    begin = manual.position.clone();
  pressForward();
  for (let frame = 1; frame <= fps * 2; frame++) manual.update(clock.tick((frame * 1000) / fps));
  assert.ok(
    Math.abs(manual.position.distanceTo(begin) * KM_PER_WORLD_UNIT - 2 * LIGHT_SPEED) < 1e-7,
    'Manual speed must follow wall time at ' + fps + ' FPS',
  );
  assert.deepEqual(manual.speeds.slice(5), [
    LIGHT_SPEED,
    LIGHT_SPEED * 10,
    LIGHT_SPEED * 100,
    LIGHT_SPEED * 1000,
  ]);
  const flightClock = new MovementClock(0),
    destination = new Vector3(1000, 0, 0);
  let position = new Vector3();
  for (let frame = 1; frame <= fps * 2; frame++)
    position = approach(
      position,
      destination,
      1,
      toWorld(LIGHT_SPEED * flightClock.tick((frame * 1000) / fps)),
    ).position;
  assert.ok(
    Math.abs(position.length() * KM_PER_WORLD_UNIT - 2 * LIGHT_SPEED) < 1e-7,
    'Autopilot speed must follow wall time at ' + fps + ' FPS',
  );
}
const suspended = new MovementClock(0);
assert.equal(suspended.tick(200), 0.2);
suspended.setPaused(true, 200);
assert.equal(suspended.tick(30200), 0);
suspended.setPaused(false, 50200);
assert.equal(suspended.tick(50400), 0.2, 'Resume must discard all inactive time');
const pausedController = new CameraController(new PerspectiveCamera(), fakeCanvas);
pressForward();
fakeDocument.hidden = true;
for (const handler of documentHandlers.get('visibilitychange') ?? [])
  handler(new Event('visibilitychange'));
const idlePosition = pausedController.position.clone();
pausedController.update(10);
assert.ok(
  pausedController.position.equals(idlePosition),
  'Hidden page must clear held movement keys',
);
fakeDocument.hidden = false;
pressForward();
for (const handler of windowHandlers.get('blur') ?? []) handler(new Event('blur'));
pausedController.update(10);
assert.ok(pausedController.position.equals(idlePosition), 'Blur must clear held movement keys');
Reflect.deleteProperty(globalThis, 'document');
Reflect.deleteProperty(globalThis, 'window');
console.log(
  'PASS: exact light speed; corrected data; manual/autopilot wall time at 60/10/5 FPS; inactive time and held input reset.',
);
assert.deepEqual(mapPosition(new Vector3(), 100), { x: 100, y: 100, outside: false });
assert.deepEqual(mapPosition(new Vector3(100, 0, 0), 100), { x: 182, y: 100, outside: false });
assert.deepEqual(mapPosition(new Vector3(0, 10, 100), 100), { x: 100, y: 18, outside: false });
assert.equal(
  mapPosition(new Vector3(10000, 0, 0), 100).x,
  189,
  'Distant positions stay at the map edge',
);
assert.equal(mapPosition(new Vector3(10000, 0, 0), 100).outside, true);
assert.ok(mapPosition(new Vector3(1, 0, 0), 100).x > 108, 'Inner planets remain readable');
console.log('PASS: minimap center, top-down axes, radial compression and outside boundary.');
assert.equal(targetBearing(new Vector3(0, 0, -10)).status, '正面');
assert.equal(targetBearing(new Vector3(0, 0, 10)).status, '背後');
assert.equal(targetBearing(new Vector3(1, 0, -10)).angle, Math.PI / 2);
assert.equal(targetBearing(new Vector3(-1, 0, -10)).angle, -Math.PI / 2);
assert.equal(targetBearing(new Vector3(0, 1, -10)).angle, 0);
assert.equal(targetBearing(new Vector3(0, -1, -10)).angle, Math.PI);
assert.equal(
  targetBearing(new Vector3(1, 0, 10)).angle,
  Math.PI / 2,
  'Behind-camera targets must retain their actual bearing',
);
assert.equal(targetBearing(new Vector3()).status, '到達');
console.log(
  'PASS: target HUD bearings; front, behind, left, right, up, down and coincident target.',
);
const scale = new ScaleManager();
for (const b of celestialBodies) {
  assert.equal(scale.radius(b) * 2, toWorld(b.diameter));
  if (!b.orbit) assert.equal(scale.position(b).x, toWorld(b.distanceFromSun));
}
const sun = bodyByName('Sun'),
  earth = bodyByName('Earth');
const earthIndex = bodyIndex('Earth');
const moonIndex = bodyIndex('Moon');
const moon = celestialBodies[moonIndex];
assert.equal(moon.diameter, 3474.8);
assert.equal(moon.orbit!.distance, 384400);
assert.equal(scale.position(moon).distanceTo(scale.position(earth)), toWorld(384400));
assert.ok(Math.abs(scale.position(moon).length() - toWorld(moon.distanceFromSun)) < 1e-9);
const lunarAngle =
  (2 * Math.atan(scale.radius(moon) / toWorld(moon.orbit!.distance)) * 180) / Math.PI;
assert.ok(
  lunarAngle > 0.51 && lunarAngle < 0.53,
  'Moon must appear about half a degree from Earth',
);
const lunarSystem = new SolarSystem(scale);
lunarSystem.update(scale.position(earth));
const lunarOrbit = lunarSystem.orbits.at(-1)!.geometry.getAttribute('position');
assert.ok(
  Math.abs(lunarOrbit.getX(0) - toWorld(moon.orbit!.distance)) < 1e-6,
  'Lunar orbit is centered on Earth',
);
assert.ok(Math.abs(lunarOrbit.getZ(256) - toWorld(moon.orbit!.distance)) < 1e-6);
assert.ok(
  Math.abs(lunarSystem.meshes[moonIndex].position.z - toWorld(moon.orbit!.distance)) < 1e-9,
);
const angle = (2 * Math.atan(scale.radius(sun) / scale.position(earth).length()) * 180) / Math.PI;
assert.ok(angle > 0.53 && angle < 0.54, 'Sun must be approximately 0.53 degrees from Earth');
assert.equal(duration(earth.distanceFromSun / LIGHT_SPEED), '8m 19s');
const destination = scale.position(earth),
  standOff = observationRadius(scale.radius(earth));
const start = new Vector3(0, 0, 24);
const arrived = approach(start, destination, standOff, 1e10);
assert.equal(arrived.arrived, true);
assert.ok(Math.abs(arrived.position.distanceTo(destination) - standOff) < 1e-9);
assert.equal(approach(arrived.position, destination, standOff, 10).step, 0);
for (const body of [earth, moon]) {
  const center = scale.position(body),
    radius = scale.radius(body);
  const stopPosition = approach(start, center, observationRadius(radius), 1e10).position;
  assert.equal(
    observationDistanceKm(stopPosition, center, radius),
    0,
    'Arrival ETA must be zero for ' + body.name,
  );
  assert.ok(
    Math.abs(surfaceDistanceKm(stopPosition, center, radius) - body.diameter * 2) < 1e-6,
    'Surface distance stays separate at observation position',
  );
  assert.equal(duration(observationDistanceKm(stopPosition, center, radius) / LIGHT_SPEED), '0s');
  assert.equal(observationDistanceKm(center, center, radius), 0);
}
console.log(
  'PASS: Earth/Moon observation arrival distance and ETA are zero; surface distance remains correct.',
);
const small = approach(start, destination, standOff, toWorld(LIGHT_SPEED));
assert.ok(Math.abs(small.step * KM_PER_WORLD_UNIT - LIGHT_SPEED) < 1e-8);
assert.equal(small.arrived, false);
const hit = safeTravelDistance(new Vector3(-100, 0, 0), new Vector3(100, 0, 0), [
  { center: new Vector3(), radius: 1 },
]);
assert.ok(Math.abs(hit - 99) < 1e-6, 'Fast travel cannot tunnel through a body');
assert.equal(
  safeTravelDistance(new Vector3(-100, 2, 0), new Vector3(100, 2, 0), [
    { center: new Vector3(), radius: 1 },
  ]),
  200,
);
assert.equal(gridSpacingKm(LIGHT_SPEED), 1000000);
for (const speed of [
  1,
  10,
  100,
  1000,
  10000,
  LIGHT_SPEED,
  LIGHT_SPEED * 10,
  LIGHT_SPEED * 100,
  LIGHT_SPEED * 1000,
]) {
  const seconds = gridSpacingKm(speed) / speed;
  assert.ok(seconds >= 0.9 && seconds <= 10, 'Grid crossing time must remain readable');
}
const gridScene = new Scene();
const grid = new TravelGrid(gridScene, LIGHT_SPEED);
grid.update(new Vector3(), LIGHT_SPEED, 0.016);
const mesh = gridScene.children[0];
assert.ok(mesh instanceof LineSegments);
const positions = mesh.geometry.getAttribute('position');
const initialX = positions.getX(0);
grid.update(new Vector3(2.5, 0, 0), LIGHT_SPEED, 0.016);
assert.equal(
  positions.getX(0),
  initialX - 2.5,
  'Grid lines must stay in world space during movement',
);
for (const value of positions.array) assert.ok(Number.isFinite(value));
grid.update(new Vector3(44950, 0, 0), LIGHT_SPEED, 0.016);
for (let i = 0; i < positions.count; i++) {
  assert.ok(
    Math.abs(positions.getX(i)) <= 170,
    'Grid geometry must stay camera-relative near Neptune',
  );
}
grid.update(new Vector3(), 1e7, 0.05);
assert.equal(gridScene.children.length, 2, 'Spacing changes must cross-fade');
assert.equal(grid.spacingKm, 1e7);
grid.visible = false;
grid.update(new Vector3(), 1e7, 0.016);
assert.ok(
  gridScene.children.every((mesh) => !mesh.visible),
  'OFF must hide every grid layer immediately',
);
grid.update(new Vector3(), 1e7, 2);
assert.equal(gridScene.children.length, 0, 'Faded layers must be removed');
console.log(
  'PASS: adaptive grid spacing; world anchoring; camera-relative geometry; cross-fade; OFF; cleanup.',
);
console.log(
  'PASS: 10 bodies share a scale; Moon size, Earth distance and orbit; solar angular size; light ETA; autopilot arrival; high-speed collision.',
);

// Exercise the same Flight object used by the app, including collision policy.
function flightFixture(scale: ScaleManager) {
  const direction = new Vector3();
  const controller = {
    position: new Vector3(0, 0, 24),
    speed: LIGHT_SPEED * 1000,
    travelled: 0,
    update(dt: number) {
      const km = this.speed * dt;
      this.position.addScaledVector(direction, toWorld(km));
      this.travelled += km;
    },
  };
  return { controller, direction, flight: new Flight(controller, scale) };
}

for (const fps of [60, 10, 5]) {
  const flightScale = new ScaleManager();
  const { controller, direction, flight } = flightFixture(flightScale);
  flight.jump(bodyIndex('Mercury'));
  const start = controller.position.clone();
  const destination = flightScale.position(earth);
  const expectedKm = observationDistanceKm(start, destination, flightScale.radius(earth));
  flight.start(earthIndex);
  const frames = Math.ceil((expectedKm / controller.speed) * fps) + 1;
  for (let frame = 0; frame < frames && flight.active; frame++) {
    assert.equal(flight.update(1 / fps).blocked, false);
  }
  assert.equal(flight.active, false, 'Mercury → Earth must pass Venus at ' + fps + ' FPS');
  assert.equal(
    observationDistanceKm(controller.position, destination, flightScale.radius(earth)),
    0,
  );
  assert.ok(Math.abs(controller.travelled - expectedKm) < 1e-6);

  // The identical path must still stop manual flight at Venus.
  flight.jump(bodyIndex('Mercury'));
  controller.travelled = 0;
  direction.copy(destination).sub(controller.position).normalize();
  const manual = flight.update(expectedKm / controller.speed + 1);
  assert.equal(manual.blocked, true);
  const venus = bodyByName('Venus');
  assert.ok(
    Math.abs(
      controller.position.distanceTo(flightScale.position(venus)) -
        flightScale.radius(venus) * 1.05,
    ) < 1e-6,
  );
  assert.ok(
    Math.abs(controller.travelled - start.distanceTo(controller.position) * KM_PER_WORLD_UNIT) <
      1e-6,
  );
}
console.log(
  'PASS: Mercury → Earth passes Venus at 60/10/5 FPS; manual flight still stops at Venus.',
);

// All directed body pairs with an overshooting frame budget.
for (const [sourceIndex] of celestialBodies.entries()) {
  for (const [targetIndex, body] of celestialBodies.entries()) {
    if (sourceIndex === targetIndex) continue;
    const flightScale = new ScaleManager();
    const { controller, flight } = flightFixture(flightScale);
    flight.jump(sourceIndex);
    const expectedKm = observationDistanceKm(
      controller.position,
      flightScale.position(body),
      flightScale.radius(body),
    );
    flight.start(targetIndex);
    const result = flight.update(10000);
    assert.equal(result.arrived, true);
    assert.equal(result.blocked, false);
    assert.equal(flight.active, false);
    assert.ok(Math.abs(controller.travelled - expectedKm) < 1e-5);
    assert.equal(
      observationDistanceKm(
        controller.position,
        flightScale.position(body),
        flightScale.radius(body),
      ),
      0,
    );
  }
}
console.log('PASS: all 90 directed body journeys arrive, with exact distance accounting.');

const jumpScale = new ScaleManager();
const jumped = flightFixture(jumpScale);
const beforeJump = jumped.controller.position.clone();
const skippedKm = jumped.flight.jump(moonIndex);
assert.equal(skippedKm, beforeJump.distanceTo(jumped.controller.position) * KM_PER_WORLD_UNIT);
assert.equal(
  jumped.controller.travelled,
  0,
  'Jump distance must not be added to travelled distance',
);
assert.ok(
  Math.abs(
    jumped.controller.position.distanceTo(jumpScale.position(moon)) -
      observationRadius(jumpScale.radius(moon)),
  ) < 1e-9,
);
console.log('PASS: jumps preserve travelled distance and stop at the observation position.');

// Name-based references must survive a data-array reorder.
const originalOrder = celestialBodies.slice();
try {
  celestialBodies.reverse();
  const reordered = new ScaleManager();
  assert.equal(
    new Flight(flightFixture(reordered).controller, reordered).target,
    bodyIndex('Earth'),
  );
  assert.equal(reordered.position(bodyByName('Earth')).x, toWorld(earth.distanceFromSun));
  assert.equal(reordered.position(bodyByName('Sun')).length(), 0);
  assert.equal(
    reordered.position(bodyByName('Moon')).distanceTo(reordered.position(bodyByName('Earth'))),
    toWorld(384400),
  );
  const system = new SolarSystem(reordered);
  system.update(new Vector3());
  const sunMesh = system.meshes[bodyIndex('Sun')];
  assert.equal(sunMesh.position.length(), 0);
  assert.equal(system.orbits.length, celestialBodies.length - 1);
} finally {
  celestialBodies.splice(0, celestialBodies.length, ...originalOrder);
}
console.log('PASS: celestial-body identification and rendering survive array reordering.');
