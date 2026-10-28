/**
 * Short alert tones made with Web Audio (no sound files to download), plus a vibration on phones.
 * Browsers only play sound after the person has touched the page once; if they haven't, this stays
 * silent and the pop-up still shows.
 */
let ctx: AudioContext | null = null;

function audio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// Unlock audio on the first touch or click, so a later alert can sound.
if (typeof window !== 'undefined') {
  const unlock = () => {
    audio();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

function tone(c: AudioContext, freq: number, start: number, length: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

/** `arrived`: a friendly two-note chime. `booking`: a brighter three-note ring for riders. */
export function playAlert(kind: 'arrived' | 'booking') {
  try {
    navigator.vibrate?.(kind === 'booking' ? [300, 150, 300, 150, 300] : [200, 100, 200]);
  } catch {
    /* vibration is a bonus */
  }
  const c = audio();
  if (!c || c.state !== 'running') return;
  const t = c.currentTime;
  if (kind === 'arrived') {
    tone(c, 784, t, 0.35);
    tone(c, 1047, t + 0.22, 0.5);
  } else {
    tone(c, 880, t, 0.18);
    tone(c, 1175, t + 0.2, 0.18);
    tone(c, 1568, t + 0.4, 0.35);
  }
}
