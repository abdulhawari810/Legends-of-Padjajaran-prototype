// Batch G: SFX prosedural WebAudio, tanpa asset eksternal.
// Autoplay policy: context dibuat/di-resume saat gesture pertama.
const MUTE_KEY = 'mmorpg-muted-v1';
const VOL_KEY = 'mmorpg-vol-v1';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let vol = 0.22;

try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  // abaikan
}

try {
  const v = parseFloat(localStorage.getItem(VOL_KEY) ?? '');
  if (!Number.isNaN(v)) vol = Math.min(1, Math.max(0, v));
} catch {
  // abaikan
}

export function isMuted(): boolean {
  return muted;
}

export function getVolume(): number {
  return vol;
}

export function setVolume(v: number) {
  vol = Math.min(1, Math.max(0, v));
  try {
    localStorage.setItem(VOL_KEY, `${vol}`);
  } catch {
    // abaikan
  }
  if (master && ctx && !muted) {
    master.gain.value = vol;
  }
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    // abaikan
  }
  if (master && ctx) {
    master.gain.value = m ? 0 : vol;
  }
}

function ensure(): boolean {
  try {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
      return true;
    }
    const AC =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : vol;
    master.connect(ctx.destination);
    return true;
  } catch {
    return false;
  }
}

export function unlockAudio() {
  ensure();
}

export function initAudio() {
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio);
}

function tone(
  f0: number,
  f1: number,
  dur: number,
  type: OscillatorType = 'square',
  vol = 0.7,
  delay = 0
) {
  if (muted) return;
  if (!ensure() || !ctx || !master) return;
  try {
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(30, f0), t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * 0.5), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  } catch {
    // abaikan
  }
}

export const sfxHit = () => tone(220, 90, 0.08, 'square', 0.6);
export const sfxSwing = () => tone(520, 200, 0.07, 'sawtooth', 0.4);
export const sfxShootArrow = () => tone(820, 420, 0.06, 'square', 0.45);
export const sfxShootFire = () => tone(280, 620, 0.12, 'sawtooth', 0.5);
export const sfxMonsterDie = () => tone(300, 55, 0.25, 'square', 0.7);
export const sfxPlayerHurt = () => tone(200, 75, 0.15, 'sawtooth', 0.7);
export const sfxPlayerDie = () => tone(320, 45, 0.45, 'sawtooth', 0.8);
export const sfxCoin = () => {
  tone(1245, 1245, 0.06, 'sine', 0.55);
  tone(1868, 1868, 0.12, 'sine', 0.55, 0.06);
};
export const sfxPotion = () => tone(420, 840, 0.15, 'sine', 0.6);
export const sfxLevelUp = () => {
  tone(523, 523, 0.1, 'triangle', 0.7);
  tone(784, 784, 0.16, 'triangle', 0.7, 0.09);
};
export const sfxQuest = () => tone(620, 920, 0.15, 'triangle', 0.6);
export const sfxBoom = () => tone(130, 40, 0.3, 'square', 0.8);
export const sfxClick = () => tone(700, 700, 0.035, 'square', 0.3);

export function sfxSkill(jobId: string) {
  if (jobId === 'warrior') tone(180, 720, 0.22, 'sawtooth', 0.65);
  else if (jobId === 'mage') tone(160, 540, 0.2, 'sawtooth', 0.65);
  else tone(950, 480, 0.06, 'square', 0.5);
}
