import { type TravelGrid } from './TravelGrid';
import { CameraController } from './CameraController';
import { SolarSystem } from './SolarSystem';
import { LIGHT_SPEED } from './data/celestialBodies';
import { duration, number, KM_PER_WORLD_UNIT } from './utils/units';
import { surfaceDistanceKm } from './utils/navigation';
export class HUD {
  constructor(public element: HTMLElement) {}
  update(controller: CameraController, system: SolarSystem, grid: TravelGrid) {
    const destinations = system.bodies.filter((body) => body.name !== 'Sun');
    let nearest = destinations[0],
      remaining = Infinity;
    destinations.forEach((b) => {
      const d = surfaceDistanceKm(
        controller.position,
        system.scale.position(b),
        system.scale.radius(b),
      );
      if (d < remaining) {
        nearest = b;
        remaining = d;
      }
    });
    const lightSpeedRatio = (controller.speed / LIGHT_SPEED).toLocaleString('en-US', {
      maximumFractionDigits: 2,
      ...(controller.speed < LIGHT_SPEED
        ? { minimumSignificantDigits: 1, maximumSignificantDigits: 3 }
        : {}),
    });
    this.element.innerHTML = /* HTML */ `<span class="eyebrow">FLIGHT TELEMETRY</span>
      <div class="metric">
        <label>現在速度 / SPEED</label
        ><strong>${number(controller.speed)} <small>km/s</small></strong
        ><span
          >光速の ${lightSpeedRatio} 倍
          ${controller.speed > LIGHT_SPEED ? '· 体験用の超光速' : ''}</span
        >
      </div>
      <div class="metric">
        <label>太陽からの距離</label
        ><strong
          >${number(controller.position.length() * KM_PER_WORLD_UNIT)} <small>km</small></strong
        >
      </div>
      <div class="metric">
        <label>最寄りの惑星 / 衛星</label
        ><strong>${nearest.name} <small>${nearest.ja}</small></strong
        ><span
          >表面まで ${number(remaining)} km ·
          直進で約${duration(remaining / controller.speed)}</span
        >
      </div>
      <div class="telemetry-foot">
        TRUE SIZE · TRUE DISTANCE<br />1 world unit = ${number(KM_PER_WORLD_UNIT)} km
        <div class="grid-readout">
          G · グリッド ${grid.visible ? `ON · 1マス = ${number(grid.spacingKm)} km` : 'OFF'}<br />移動の補助目盛り
          / 天体ではありません
        </div>
      </div>`;
  }
}
