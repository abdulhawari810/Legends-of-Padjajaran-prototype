import { scopedKey, loadJSON, saveJSON } from './persistence';

// Batch L: pengaturan kualitas partikel (HP kentang).
export type Quality = 'high' | 'low';

const KEY = (): string => scopedKey('mmorpg-settings-v1');

export function getQuality(): Quality {
  const s = loadJSON<{ quality?: Quality }>(KEY(), {});
  return s.quality === 'low' ? 'low' : 'high';
}

export function setQuality(q: Quality) {
  saveJSON(KEY(), { quality: q });
  window.dispatchEvent(new CustomEvent('quality-changed', { detail: q }));
}
