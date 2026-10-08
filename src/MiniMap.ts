import { Vector3 } from 'three';
import { ScaleManager } from './ScaleManager';
import { celestialBodies } from './data/celestialBodies';

// Compress radial distances so the inner and outer planets are both readable.
export function mapPosition(position: Vector3, extent: number) {
  const radius = Math.hypot(position.x, position.z);
  const mapped = 82 * Math.sqrt(radius / extent);
  return radius === 0
    ? { x: 100, y: 100, outside: false }
    : {
        x: 100 + (position.x / radius) * Math.min(mapped, 89),
        y: 100 - (position.z / radius) * Math.min(mapped, 89),
        outside: mapped > 89,
      };
}

export class MiniMap {
  private orbits: SVGCircleElement[];
  private planets: SVGCircleElement[];
  private player: SVGGElement;
  private note: HTMLElement;
  private initialized = false;
  constructor(element: HTMLElement) {
    const planets = celestialBodies
      .map((body, index) => ({ body, index }))
      .filter(({ body }) => body.name !== 'Sun' && !body.orbit);
    element.innerHTML = /* HTML */ `<span class="eyebrow">SOLAR SYSTEM</span
      ><svg
        viewBox="0 0 200 200"
        role="img"
        aria-label="太陽系を上から見た地図。点滅する点が現在位置です"
      >
        <circle class="minimap-boundary" cx="100" cy="100" r="91" />
        <path class="minimap-axis" d="M9 100H191M100 9V191" />
        ${planets.map(() => '<circle class="minimap-orbit" cx="100" cy="100"/>').join('')}
        <circle cx="100" cy="100" r="3" fill="#ffd387"><title>太陽</title></circle>
        ${planets.map(({ body, index }) => `<circle class="minimap-planet" data-index="${index}" r="2" fill="#${body.color.toString(16).padStart(6, '0')}"><title>${body.ja}</title></circle>`).join('')}
        <g class="minimap-player">
          <circle class="minimap-pulse" r="7" />
          <circle class="minimap-player-dot" r="2.5" />
          <title>現在位置</title>
        </g>
      </svg>
      <div class="minimap-legend">
        <span class="minimap-key"></span>現在位置 <small>上面図 · 距離圧縮</small>
      </div>
      <small class="minimap-note"></small>`;
    this.orbits = Array.from(element.querySelectorAll<SVGCircleElement>('.minimap-orbit'));
    this.planets = Array.from(element.querySelectorAll<SVGCircleElement>('.minimap-planet'));
    this.player = element.querySelector('.minimap-player')!;
    this.note = element.querySelector('.minimap-note')!;
  }
  update(position: Vector3, scale: ScaleManager, target: number) {
    const extent = Math.max(
      ...celestialBodies.map((body) => (body.orbit ? 0 : scale.position(body).length())),
    );
    if (!this.initialized) {
      this.planets.forEach((planet, i) => {
        const index = Number(planet.dataset.index);
        const mapped = mapPosition(scale.position(celestialBodies[index]), extent);
        planet.setAttribute('cx', String(mapped.x));
        planet.setAttribute('cy', String(mapped.y));
        this.orbits[i].setAttribute('r', String(mapped.x - 100));
      });
      this.initialized = true;
    }
    const selected = celestialBodies[target].orbit?.parent;
    this.planets.forEach((planet) => {
      const index = Number(planet.dataset.index);
      planet.classList.toggle(
        'selected',
        index === target || celestialBodies[index].name === selected,
      );
    });
    const mapped = mapPosition(position, extent);
    this.player.setAttribute('transform', `translate(${mapped.x} ${mapped.y})`);
    this.note.textContent = mapped.outside ? '現在位置は地図の外側 · 縁に表示' : '太陽を中心に表示';
  }
}
