export const KM_PER_WORLD_UNIT = 100000;
export const toWorld = (km: number) => km / KM_PER_WORLD_UNIT;
export const number = (n: number) => Math.round(n).toLocaleString('en-US');
export function distance(km: number): string {
  return km >= 1e9
    ? (km / 1e9).toFixed(2) + ' billion km'
    : km >= 1e6
      ? (km / 1e6).toFixed(1) + ' million km'
      : number(km) + ' km';
}
export function duration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  if (seconds < 60) return Math.ceil(seconds) + 's';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + Math.floor(seconds % 60) + 's';
  if (seconds < 86400)
    return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
  return (seconds / 86400).toFixed(1) + ' days';
}
