import * as THREE from 'three';
import './style.css';
import { layout, destinationMarkup } from './ui';
import { SolarSystem } from './SolarSystem';
import { ScaleManager } from './ScaleManager';
import { Flight } from './Flight';
import { CameraController } from './CameraController';
import { HUD } from './HUD';
import { TargetHUD } from './TargetHUD';
import { MiniMap } from './MiniMap';
import { TravelGrid } from './TravelGrid';
import { celestialBodies, bodyIndex, LIGHT_SPEED } from './data/celestialBodies';
import { distance, duration, number } from './utils/units';
import { surfaceDistanceKm, MovementClock } from './utils/navigation';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = layout;
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
app.prepend(renderer.domElement);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.000001, 1e9);
const scale = new ScaleManager();
const system = new SolarSystem(scale);
const controller = new CameraController(camera, renderer.domElement);
const flight = new Flight(controller, scale);
const grid = new TravelGrid(system.scene, controller.speed);
const hud = new HUD(document.querySelector('#hud')!);
const targetHud = new TargetHUD(document.querySelector('#target-hud')!);
const miniMap = new MiniMap(document.querySelector('#minimap')!);
const intro = document.querySelector<HTMLElement>('#intro')!;
const select = document.querySelector<HTMLSelectElement>('#speed')!;
const markersLayer = document.querySelector<HTMLElement>('#markers')!;
let markersVisible = true,
  messageUntil = 0;
const element = (id: string) => document.getElementById(id)!;
function message(text: string) {
  element('message').textContent = text;
  messageUntil = performance.now() + 9000;
}
function stop() {
  flight.stop();
  updateButtons();
}
function updateButtons() {
  document
    .querySelectorAll<HTMLButtonElement>('[data-target]')
    .forEach((b) =>
      b.setAttribute('aria-pressed', String(Number(b.dataset.target) === flight.target)),
    );
  document.querySelectorAll<HTMLButtonElement>('[data-travel]').forEach((b) => {
    const moving = flight.active && Number(b.dataset.travel) === flight.target;
    b.textContent = moving ? '停止 ■' : '進む →';
    b.setAttribute(
      'aria-label',
      moving ? '自動移動を停止' : celestialBodies[Number(b.dataset.travel)].ja + 'へ自動で進む',
    );
    b.setAttribute('aria-pressed', String(moving));
  });
  document.querySelectorAll<HTMLElement>('[data-destination]').forEach((row) => {
    const selected = Number(row.dataset.destination) === flight.target;
    row.classList.toggle('selected', selected);
    row.querySelector<HTMLElement>('.destination-readout')!.hidden = !selected;
  });
}
function aim() {
  controller.lookAt(scale.position(celestialBodies[flight.target]));
}
function remaining(index: number) {
  return surfaceDistanceKm(
    controller.position,
    scale.position(celestialBodies[index]),
    scale.radius(celestialBodies[index]),
  );
}
function referenceDistance(index: number) {
  const body = celestialBodies[index];
  return body.orbit
    ? distance(body.orbit.distance) + ' FROM ' + body.orbit.parent.toUpperCase()
    : distance(body.distanceFromSun) + ' FROM SUN';
}
const labels = celestialBodies.map((b, i) => {
  const label = document.createElement('div');
  label.className = 'body-marker';
  label.innerHTML =
    '<span>◇</span><b>' + b.name.toUpperCase() + '</b><small>' + referenceDistance(i) + '</small>';
  markersLayer.append(label);
  return { label, index: i };
});
// Display the Moon alongside Earth while preserving planet indices.
const destinationOrder = celestialBodies.map((_, i) => i);
const moonIndex = celestialBodies.findIndex((body) => body.name === 'Moon');
if (moonIndex >= 0) {
  destinationOrder.splice(destinationOrder.indexOf(moonIndex), 1);
  destinationOrder.splice(destinationOrder.indexOf(bodyIndex('Earth')) + 1, 0, moonIndex);
}
element('destinations').innerHTML = destinationMarkup(destinationOrder, flight.target);
element('destinations').addEventListener('click', (e) => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button) return;
  if (button.dataset.travel !== undefined) {
    const nextTarget = Number(button.dataset.travel);
    if (flight.active && flight.target === nextTarget) {
      stop();
      return;
    }
    flight.start(nextTarget);
    aim();
    document.exitPointerLock();
    element('scene-caption').classList.add('dismissed');
    updateButtons();
    message(celestialBodies[flight.target].ja + 'へ自動移動中。速度変更可 · Esc で停止。');
    return;
  }
  stop();
  if (button.dataset.target !== undefined || button.dataset.aim !== undefined) {
    flight.target = Number(button.dataset.target ?? button.dataset.aim);
    updateButtons();
    aim();
    element('scene-caption').classList.add('dismissed');
    message(
      celestialBodies[flight.target].ja +
        'の方を向きました。「進む」で自動移動、画面をクリックして自由飛行。',
    );
  } else if (button.dataset.jump !== undefined) {
    const skipped = flight.jump(Number(button.dataset.jump));
    aim();
    updateButtons();
    element('scene-caption').classList.add('dismissed');
    message('You skipped ' + distance(skipped) + '.');
  }
});
controller.speeds.forEach((speed, i) => {
  const option = document.createElement('option');
  option.value = String(i);
  option.textContent =
    speed >= LIGHT_SPEED
      ? `${number(speed / LIGHT_SPEED)}c · 光速の${number(speed / LIGHT_SPEED)}倍 (${number(speed)} km/s)`
      : number(speed) + ' km/s';
  select.append(option);
});
function updateFlightSpeed() {
  element('flight-speed-value').textContent =
    controller.speed >= LIGHT_SPEED
      ? `${number(controller.speed / LIGHT_SPEED)}c · 光速の${number(controller.speed / LIGHT_SPEED)}倍`
      : `${number(controller.speed)} km/s`;
  element('flight-speed-km').textContent =
    controller.speed >= LIGHT_SPEED ? `${number(controller.speed)} km/s` : '';
}
updateFlightSpeed();
select.value = String(controller.speedIndex);
select.addEventListener('change', () => {
  controller.speedIndex = Number(select.value);
});
element('light').addEventListener('click', () => {
  controller.speedIndex = controller.speeds.indexOf(LIGHT_SPEED);
});
function toggleMarkers() {
  markersVisible = !markersVisible;
  markersLayer.hidden = !markersVisible;
  element('markers-toggle').textContent = 'M · マーカー ' + (markersVisible ? 'ON' : 'OFF');
  element('markers-toggle').setAttribute('aria-pressed', String(markersVisible));
  message(
    markersVisible
      ? '点線の目印は実寸ではありません。'
      : 'マーカー OFF。見える球体はすべて実寸です。',
  );
}
function toggleOrbits() {
  system.orbitsVisible = !system.orbitsVisible;
  element('orbits-toggle').textContent = 'O · 軌道 ' + (system.orbitsVisible ? 'ON' : 'OFF');
  element('orbits-toggle').setAttribute('aria-pressed', String(system.orbitsVisible));
}
function toggleGrid() {
  grid.visible = !grid.visible;
  element('grid-toggle').textContent = 'G · グリッド ' + (grid.visible ? 'ON' : 'OFF');
  element('grid-toggle').setAttribute('aria-pressed', String(grid.visible));
  message(
    grid.visible
      ? 'グリッドは距離の目盛りです。速度に合わせて1マスの間隔が変わります。'
      : 'グリッド OFF。M と O も OFF にすると実寸の天体だけになります。',
  );
}
element('grid-toggle').addEventListener('click', toggleGrid);
element('markers-toggle').addEventListener('click', toggleMarkers);
element('orbits-toggle').addEventListener('click', toggleOrbits);
element('start').addEventListener('click', () => {
  intro.hidden = true;
  message('右の地球の「向く」で視点を合わせ、「進む」で光速の旅へ。地球まで約1億5,000万km。');
});
element('help').addEventListener('click', () => {
  stop();
  document.exitPointerLock();
  intro.hidden = false;
});
document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    stop();
    return;
  }
  if ((e.target as HTMLElement).matches('select,input') || e.repeat || !intro.hidden) return;
  if (e.code === 'KeyG') toggleGrid();
  if (e.code === 'KeyM') toggleMarkers();
  if (e.code === 'KeyO') toggleOrbits();
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) stop();
});
document.addEventListener('flight-lock-error', () =>
  message('自由飛行を開始できませんでした。各天体の「進む」から移動できます。'),
);
document.addEventListener('pointerlockchange', () => {
  const flying = document.pointerLockElement === renderer.domElement;
  updateFlightSpeed();
  app.classList.toggle('is-flying', flying);
  element('flight-indicator').hidden = !flying;
  if (flying) {
    stop();
    element('scene-caption').classList.add('dismissed');
  }
  element('flight-state').textContent = flying
    ? '自由飛行中 · ESC でカーソルに戻る'
    : '画面をクリックで自由飛行 · ESC で自動移動停止';
});
const movementClock = new MovementClock(performance.now());
function pauseMovement(paused: boolean) {
  movementClock.setPaused(paused, performance.now());
  if (paused) {
    stop();
    controller.clearInput();
  }
}
document.addEventListener('visibilitychange', () =>
  pauseMovement(document.hidden || !document.hasFocus()),
);
window.addEventListener('blur', () => pauseMovement(true));
window.addEventListener('focus', () => pauseMovement(document.hidden));
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
function updateMarkers() {
  if (!markersVisible) return;
  camera.updateMatrixWorld();
  labels.forEach(({ label, index }) => {
    const relative = scale.position(celestialBodies[index]).sub(controller.position);
    const view = relative.clone().applyQuaternion(camera.quaternion.clone().invert());
    const projected = relative.clone().project(camera);
    const onScreen = view.z < 0 && Math.abs(projected.x) < 0.85 && Math.abs(projected.y) < 0.78;
    label.classList.toggle('selected', index === flight.target);
    if (!onScreen && index !== flight.target) {
      label.hidden = true;
      return;
    }
    label.hidden = false;
    let x = projected.x,
      y = projected.y;
    if (!onScreen) {
      const length = Math.hypot(view.x, view.y) || 1;
      x = (view.x / length) * 0.77;
      y = (view.y / length) * 0.72;
      if (Math.hypot(view.x, view.y) < 0.001) {
        x = 0.77;
        y = 0;
      }
    }
    label.style.left = ((x + 1) * innerWidth) / 2 + 'px';
    label.style.top = ((1 - y) * innerHeight) / 2 + 'px';
    label.querySelector('span')!.textContent = onScreen ? '◇' : '↗';
    label.querySelector('small')!.textContent =
      index === flight.target && !onScreen
        ? '画面外 · 「方を向く」で案内'
        : referenceDistance(index);
  });
}
let hudTime = 0,
  lastMilestone = 0;
function frame(now: number) {
  const dt = movementClock.tick(now);
  const movement = flight.update(dt);
  if (movement.moved && flight.active) aim();
  if (movement.arrived) {
    aim();
    updateButtons();
    message(celestialBodies[flight.target].ja + 'の表面に到着しました。');
  }
  if (movement.blocked) {
    stop();
    message('天体の近くで停止しました。横・後ろへ移動できます。');
  }
  system.update(controller.position);
  grid.update(controller.position, controller.speed, Math.min(dt, 0.1));
  camera.position.set(0, 0, 0);
  renderer.render(system.scene, camera);
  updateMarkers();
  targetHud.update(
    camera,
    scale.position(celestialBodies[flight.target]).sub(controller.position),
    celestialBodies[flight.target].ja,
    remaining(flight.target),
  );
  if (now - hudTime > 100) {
    hud.update(controller, system, grid);
    select.value = String(controller.speedIndex);
    updateFlightSpeed();
    miniMap.update(controller.position, scale, flight.target);
    const travelRemaining = surfaceDistanceKm(
      controller.position,
      scale.position(celestialBodies[flight.target]),
      scale.radius(celestialBodies[flight.target]),
    );
    document.querySelector<HTMLElement>(`[data-readout="${flight.target}"]`)!.textContent =
      travelRemaining === 0
        ? '表面に到着'
        : (flight.active ? '自動移動中 · ' : '') +
          '表面まで ' +
          distance(travelRemaining) +
          ' · 到着まで約' +
          duration(travelRemaining / controller.speed);
    if (now > messageUntil) {
      const milestone = Math.floor(controller.travelled / 1e6);
      if (milestone > lastMilestone) {
        lastMilestone = milestone;
        message('You have travelled ' + distance(controller.travelled) + '.');
      } else
        element('message').textContent = markersVisible
          ? '◇ マーカーは位置を示す補助表示です。実寸ではありません。'
          : 'Most of the Solar System is empty.';
    }
    hudTime = now;
  }
  requestAnimationFrame(frame);
}
updateButtons();
requestAnimationFrame(frame);
