/** Enkel «pour»-klang uten eksterne filer — respekter mute/redusert bevegelse utenfor. */
export function playPourChime(): void {
  try {
    const AudioContextCtor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 370;
    g.gain.value = 0.0001;
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    const t = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.22);
    osc.stop(t + 0.32);
    const waitMs = 420;
    window.setTimeout(() => {
      void ctx.close();
    }, waitMs);
  } catch {
    /* autoplay-policy etc. */
  }
}
