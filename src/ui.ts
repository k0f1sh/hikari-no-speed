import { celestialBodies } from './data/celestialBodies';

export const layout = /* HTML */ `<header>
    <a class="brand" href="./"
      >Hikari no Speed<span class="brand-sub">AT THE SPEED OF LIGHT</span></a
    >
    <div class="top-note">光速で旅する太陽系 <span>EXPERIENCE 01 / SOLAR SYSTEM</span></div>
    <button id="help">操作説明 ↗</button>
  </header>
  <aside id="hud"></aside>
  <div class="crosshair"></div>
  <aside id="target-hud" aria-label="選択中の目的地の方向と距離"></aside>
  <aside id="minimap" aria-label="太陽系ミニマップ"></aside>
  <div id="markers" aria-hidden="true"></div>
  <div id="flight-indicator" role="status" hidden>
    <span class="flight-dot" aria-hidden="true"></span><strong>自由飛行中</strong
    ><span class="flight-exit"><kbd>Esc</kbd> で解除</span>
    <div class="flight-speed">
      <span>移動速度</span><strong id="flight-speed-value"></strong
      ><span id="flight-speed-km"></span>
    </div>
    <small class="flight-scroll">スクロール ↑ で加速 / ↓ で減速</small
    ><small>WASD で移動 · マウスで視点</small>
  </div>
  <div id="scene-caption" class="scene-caption">
    <span>01 / THE SUN</span>
    <h1>いま、<br />光の速さで。</h1>
    <p>地球まで約1億5,000万km。<br />光なら、約8分20秒の旅。</p>
  </div>
  <aside class="navigation">
    <span class="eyebrow">DESTINATIONS / 目的地</span>
    <p class="nav-hint">
      各天体の「向く」「進む」で操作。<br />進む＝自動移動 · Esc で停止 · ↗＝ジャンプ<br />自動移動は途中の天体を通過します
    </p>
    <div id="destinations"></div>
    <div class="navigation-controls">
      <label for="speed">移動速度</label
      ><select id="speed"></select
      ><button id="light">光速にする · 1c</button>
      <button id="markers-toggle" aria-pressed="true">M · マーカー ON</button
      ><button id="orbits-toggle" aria-pressed="true">O · 軌道 ON</button
      ><button id="grid-toggle" aria-pressed="true">G · グリッド ON</button>
    </div>
  </aside>
  <div id="message" role="status">光速でも、太陽から地球までは約8分20秒。</div>
  <footer>
    <span>W A S D <small>移動</small>　 MOUSE <small>視点</small>　 WHEEL <small>速度</small></span
    ><span id="flight-state">画面をクリックで自由飛行 · ESC でカーソルに戻る</span>
  </footer>
  <div id="intro" class="overlay">
    <div class="intro-card">
      <span class="eyebrow">AN EXPERIENCE IN REAL SCALE</span>
      <h2>光速で太陽系を移動</h2>
      <p>
        天体の大きさと距離は同じ縮尺です。<br />太陽から地球まで、光速で約8分20秒かかります。<br />天体の位置は平均距離で固定しています。
      </p>
      <p>右の一覧の「向く」で視点を合わせ、「進む」で自動移動。<br />「↗」でジャンプできます。</p>
      <div class="instructions">
        <span>WASD / Mouse</span><span>自由移動 / 視点回転</span><span>Wheel</span
        ><span>速度変更（超光速も可）</span><span>Space / Shift</span><span>上 / 下へ移動</span
        ><span>M / O / G</span><span>マーカー / 軌道 / グリッド</span><span>Esc</span
        ><span>飛行解除 / 自動移動停止</span>
      </div>
      <button id="start">光速の旅を始める <span>→</span></button
      ><small>PC 推奨 · 自由飛行は画面をクリック</small>
    </div>
  </div>`;

export function destinationMarkup(order: number[], target: number): string {
  return order
    .map((i) => {
      const b = celestialBodies[i];
      return /* HTML */ `<div class="destination" data-destination="${i}">
        <div class="destination-heading">
          <button data-target="${i}" aria-pressed="${i === target}">
            <span
              class="body-dot"
              style="background:#${b.color.toString(16).padStart(6, '0')}"
            ></span
            ><span>${b.name}<small>${b.ja}</small></span></button
          ><button data-jump="${i}" aria-label="${b.ja}へジャンプ" title="瞬間移動">↗</button>
        </div>
        <div class="destination-actions">
          <button data-aim="${i}" aria-label="${b.ja}の方を向く">向く ↗</button
          ><button data-travel="${i}" aria-label="${b.ja}へ自動で進む" aria-pressed="false">
            進む →
          </button>
        </div>
        <div class="destination-readout" data-readout="${i}" hidden></div>
      </div>`;
    })
    .join('');
}
