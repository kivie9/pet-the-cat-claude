// Âm thanh tổng hợp bằng WebAudio (không tải file): tiếng gừ gừ (purr) + tiếng meo.
// Trình duyệt chỉ cho phát sau khi người dùng bấm/chạm lần đầu -> gọi unlock() trong sự kiện đó.

export function createAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx, master, muted = false, vol = 0;

  function apply() {
    if (master) master.gain.setTargetAtTime(muted ? 0 : vol * 0.9, ctx.currentTime, 0.2);
  }

  function build() {
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * 2, sr);
    const d = buf.getChannelData(0);
    let l = 0;
    for (let i = 0; i < d.length; i++) { l = (l + 0.03 * (Math.random() * 2 - 1)) / 1.03; d[i] = l * 6; }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
    const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 120; pk.gain.value = 8;
    const am = ctx.createGain(); am.gain.value = 0.55;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 25;
    const lg = ctx.createGain(); lg.gain.value = 0.45;
    lfo.connect(lg).connect(am.gain);
    master = ctx.createGain(); master.gain.value = 0;
    src.connect(lp).connect(pk).connect(am).connect(master).connect(ctx.destination);
    src.start(); lfo.start();
    apply();
  }

  return {
    get supported() { return !!AC; },
    get ready() { return !!ctx && ctx.state === 'running'; },
    unlock() {
      if (!AC) return;
      if (!ctx) { ctx = new AC(); build(); }
      if (ctx.state === 'suspended') ctx.resume();
    },
    setVolume(v) { vol = v; apply(); },
    setMuted(m) { muted = m; apply(); },
    mew(p = 1, level = 1) {
      if (!ctx || muted || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
      const g = ctx.createGain();
      o.frequency.setValueAtTime(430 * p, t);
      o.frequency.exponentialRampToValueAtTime(780 * p, t + 0.16);
      o.frequency.exponentialRampToValueAtTime(520 * p, t + 0.48);
      f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(1900, t + 0.18);
      f.frequency.exponentialRampToValueAtTime(1100, t + 0.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32 * level, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.52);
      o.connect(f).connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.56);
    },
    suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume() { if (ctx && !document.hidden && ctx.state === 'suspended') ctx.resume(); },
  };
}
