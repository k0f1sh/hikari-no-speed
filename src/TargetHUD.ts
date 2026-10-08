import { PerspectiveCamera, Vector3 } from 'three';
import { distance } from './utils/units';

// Camera-relative bearing remains meaningful even when the target is behind us.
export function targetBearing(view: Vector3) {
  const lateral = Math.hypot(view.x, view.y);
  const aligned = lateral <= Math.max(view.length() * 0.001, 1e-10);
  return {
    angle: aligned ? 0 : Math.atan2(view.x, view.y),
    status: view.lengthSq() < 1e-20 ? '到達' : view.z >= 0 ? '背後' : aligned ? '正面' : '前方',
  };
}

export class TargetHUD {
  private arrow: HTMLElement;
  private name: HTMLElement;
  private readout: HTMLElement;
  private bearing: HTMLElement;
  constructor(element: HTMLElement) {
    element.innerHTML = /* HTML */ `<div class="target-compass" aria-hidden="true">
        <div class="target-bearing">
          <span class="target-arrow"
            ><svg viewBox="0 0 20 48" focusable="false">
              <path d="M10 2 19 45 10 38Z" fill="#9f7845" />
              <path d="M10 2 10 38 1 45Z" fill="#f3d7a6" />
              <path d="M1 45 10 38 19 45Z" fill="#61492f" />
              <path
                d="M10 2 19 45 10 38 1 45Z"
                fill="none"
                stroke="#e6c69b"
                stroke-width="1"
                stroke-linejoin="round"
              />
              <path d="M10 2V38" stroke="#fff0ce" stroke-width="0.8" /></svg
          ></span>
        </div>
      </div>
      <div class="target-readout">
        <span class="target-hud-name"></span><strong class="target-hud-distance"></strong
        ><small class="target-hud-status"></small>
      </div>`;
    this.arrow = element.querySelector('.target-bearing')!;
    this.name = element.querySelector('.target-hud-name')!;
    this.readout = element.querySelector('.target-hud-distance')!;
    this.bearing = element.querySelector('.target-hud-status')!;
  }
  update(camera: PerspectiveCamera, relative: Vector3, name: string, remainingKm: number) {
    const view = relative.clone().applyQuaternion(camera.quaternion.clone().invert());
    const { angle, status } = targetBearing(view);
    this.arrow.style.transform = `rotate(${angle}rad)`;
    this.name.textContent = name;
    this.readout.textContent = distance(remainingKm);
    this.bearing.textContent = status + ' · 表面まで';
  }
}
