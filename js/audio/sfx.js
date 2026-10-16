(function (HH) {
  'use strict';
  // Synthesized sound effects (Web Audio). No audio files. Safe when AudioContext is unavailable.
  // HH.audio = { init(), bind(game), play(name), setMuted(bool) }

  var MASTER_VOL = 0.35, MIN_GAP = 0.06, MAX_VOICES = 12;
  var ctx = null, master = null, noiseBuf = null, muted = false, inited = false, failed = false;
  var lastPlay = {}, voices = 0;

  function ensure() {
    if (failed) return false;
    try {
      if (!ctx) {
        var AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
        if (!AC) { failed = true; return false; }
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : MASTER_VOL;
        master.connect(ctx.destination);
        var len = ctx.sampleRate | 0, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        noiseBuf = buf;
      }
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      return true;
    } catch (e) { failed = true; ctx = null; return false; }
  }

  // ---- building blocks ----
  function env(gainNode, t0, dur, vol, attack) {
    var gp = gainNode.gain, a = attack || 0.006;
    gp.setValueAtTime(0.0001, t0);
    gp.linearRampToValueAtTime(vol, t0 + a);
    gp.exponentialRampToValueAtTime(0.0001, t0 + Math.max(dur, a + 0.01));
  }
  // oscillator with optional frequency glide f0 -> f1
  function tone(type, f0, f1, t0, dur, vol, attack, detune) {
    var o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    if (detune) o.detune.value = detune;
    env(gn, t0, dur, vol, attack);
    o.connect(gn); gn.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
    return gn;
  }
  // filtered noise burst with optional filter sweep
  function noise(t0, dur, vol, ftype, f0, f1, q, attack) {
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), gn = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    fl.type = ftype; fl.Q.value = q || 1;
    fl.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    env(gn, t0, dur, vol, attack);
    s.connect(fl); fl.connect(gn); gn.connect(master);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05);
  }
  // soft chord/horn voice through a lowpass
  function horn(type, f, t0, dur, vol, cutoff) {
    var o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), gn = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    fl.type = 'lowpass'; fl.frequency.value = cutoff || 1200; fl.Q.value = 0.7;
    env(gn, t0, dur, vol, 0.03);
    o.connect(fl); fl.connect(gn); gn.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function bell(f, t0, dur, vol) {
    tone('sine', f, 0, t0, dur, vol, 0.004);
    tone('sine', f * 2.76, 0, t0, dur * 0.5, vol * 0.35, 0.004);
    tone('sine', f * 5.4, 0, t0, dur * 0.25, vol * 0.12, 0.004);
  }

  // note frequencies
  var N = { G3: 196, A3: 220, B3: 247, C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784, A5: 880, C6: 1046.5, D6: 1174.7, E6: 1318.5, G6: 1568, C7: 2093 };

  // Each sound: function(t) -> approx duration (s)
  var SOUNDS = {
    click: function (t) { tone('triangle', 900, 560, t, 0.05, 0.22); return 0.06; },
    place: function (t) {
      tone('sine', 240, 90, t, 0.16, 0.45); noise(t, 0.08, 0.25, 'bandpass', 900, 300, 1);
      tone('triangle', 520, 780, t + 0.07, 0.1, 0.12); return 0.2;
    },
    sell: function (t) {
      tone('triangle', N.E6, 0, t, 0.09, 0.2); tone('triangle', N.C7, 0, t + 0.07, 0.22, 0.2);
      noise(t, 0.05, 0.1, 'highpass', 4000, 0, 1); return 0.3;
    },
    shoot_fire: function (t) {
      noise(t, 0.26, 0.4, 'bandpass', 450, 1700, 1.2, 0.03);
      tone('sawtooth', 150, 70, t, 0.2, 0.1); return 0.28;
    },
    shoot_frost: function (t) {
      tone('sine', 1760, 2640, t, 0.14, 0.2, 0.004); tone('sine', 3520, 4200, t, 0.1, 0.08, 0.004);
      tone('triangle', 2637, 0, t + 0.04, 0.12, 0.08); return 0.2;
    },
    shoot_venom: function (t) {
      var o = ctx.createOscillator(), gn = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(240, t);
      o.frequency.exponentialRampToValueAtTime(680, t + 0.06); o.frequency.exponentialRampToValueAtTime(300, t + 0.15);
      env(gn, t, 0.17, 0.32, 0.01); o.connect(gn); gn.connect(master); o.start(t); o.stop(t + 0.22);
      noise(t, 0.08, 0.1, 'highpass', 2500, 0, 1); return 0.2;
    },
    hit: function (t) { tone('sine', 160, 70, t, 0.09, 0.28); noise(t, 0.05, 0.12, 'lowpass', 900, 300, 1); return 0.1; },
    kill: function (t) {
      noise(t, 0.28, 0.4, 'lowpass', 1800, 200, 0.8, 0.01); tone('sine', 300, 80, t, 0.2, 0.25);
      tone('triangle', N.B4 * 2, 0, t + 0.1, 0.1, 0.16); tone('triangle', N.E6, 0, t + 0.18, 0.2, 0.16); return 0.42;
    },
    leak: function (t) {
      var seq = [N.A5, N.F5, N.D5, N.A4];
      for (var i = 0; i < seq.length; i++) { tone('triangle', seq[i], seq[i] * 0.97, t + i * 0.11, 0.2, 0.2); }
      tone('sine', 120, 60, t + 0.3, 0.3, 0.2); return 0.7;
    },
    freeze: function (t) {
      for (var i = 0; i < 6; i++) noise(t + i * 0.035 + Math.random() * 0.02, 0.03, 0.22, 'highpass', 3500 + Math.random() * 3000, 0, 2);
      tone('sine', 2400, 1300, t, 0.25, 0.1); return 0.35;
    },
    combo: function (t) {
      var ch = [N.C6, N.E6, N.G6, N.C7];
      for (var i = 0; i < ch.length; i++) { tone('sine', ch[i], 0, t + i * 0.035, 0.45, 0.14, 0.004); tone('triangle', ch[i] * 2, 0, t + i * 0.035, 0.2, 0.04); }
      for (var j = 0; j < 4; j++) tone('sine', 3000 + Math.random() * 2500, 0, t + 0.05 + j * 0.06, 0.07, 0.06);
      return 0.55;
    },
    stageUp: function (t) {
      var a = [N.C5, N.E5, N.G5, N.C6, N.E6];
      for (var i = 0; i < a.length; i++) { tone('triangle', a[i], 0, t + i * 0.075, 0.25, 0.2); tone('sine', a[i] * 2, 0, t + i * 0.075, 0.18, 0.05); }
      return 0.65;
    },
    choice: function (t) { bell(N.E6, t, 0.55, 0.2); bell(N.A5 * 2, t + 0.09, 0.6, 0.17); return 0.7; },
    waveStart: function (t) {
      horn('sawtooth', N.G3, t, 0.28, 0.3, 900); horn('sawtooth', N.G3 * 1.5, t, 0.28, 0.15, 900);
      horn('sawtooth', N.C4, t + 0.3, 0.6, 0.32, 1100); horn('sawtooth', N.C4 * 1.5, t + 0.3, 0.6, 0.15, 1100); return 0.95;
    },
    waveCleared: function (t) {
      var n = [N.G4, N.C5, N.E5, N.G5];
      for (var i = 0; i < 3; i++) horn('square', n[i], t + i * 0.1, 0.12, 0.1, 2200);
      horn('square', n[3], t + 0.3, 0.4, 0.12, 2200); horn('triangle', N.C5, t + 0.3, 0.4, 0.14, 2000);
      horn('triangle', N.E5, t + 0.3, 0.4, 0.12, 2000); return 0.75;
    },
    win: function (t) {
      var n = [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6, N.E6];
      var ts = [0, 0.12, 0.24, 0.36, 0.52, 0.64, 0.78];
      for (var i = 0; i < n.length; i++) { horn('square', n[i], t + ts[i], 0.2, 0.1, 2400); horn('triangle', n[i], t + ts[i], 0.22, 0.14, 2000); }
      var c = [N.C5, N.E5, N.G5, N.C6];
      for (var j = 0; j < c.length; j++) horn('triangle', c[j], t + 0.95, 0.9, 0.14, 2200);
      for (var k = 0; k < 5; k++) tone('sine', 2500 + Math.random() * 2500, 0, t + 1 + k * 0.1, 0.1, 0.06);
      return 1.9;
    },
    lose: function (t) {
      var n = [N.E4, N.D4, N.C4, N.B3];
      var ts = [0, 0.28, 0.56, 0.9];
      for (var i = 0; i < 4; i++) { horn('sawtooth', n[i], t + ts[i], i === 3 ? 1.0 : 0.3, 0.2, 700); horn('triangle', n[i] / 2, t + ts[i], i === 3 ? 1.0 : 0.3, 0.2, 600); }
      return 2;
    },
    feed: function (t) {
      for (var i = 0; i < 3; i++) {
        var s = t + i * 0.11;
        noise(s, 0.07, 0.3, 'bandpass', 500 + i * 80, 250, 2); tone('sine', 220 - i * 20, 110, s, 0.08, 0.2);
      }
      return 0.4;
    },
    gold: function (t) { tone('square', N.E6, 0, t, 0.05, 0.1, 0.002); tone('square', N.A5 * 2 * 1.19, 0, t + 0.05, 0.28, 0.1, 0.002); tone('sine', N.C7, 0, t + 0.05, 0.2, 0.05); return 0.4; }
  };

  function play(name) {
    try {
      if (muted) return;
      var fn = SOUNDS[name];
      if (!fn) return;
      if (!ensure() || !ctx || ctx.state === 'closed') return;
      if (ctx.state !== 'running') return; // not unlocked yet by a user gesture
      var now = ctx.currentTime;
      if (lastPlay[name] !== undefined && now - lastPlay[name] < MIN_GAP) return;
      if (voices >= MAX_VOICES) return;
      lastPlay[name] = now;
      var dur = fn(now + 0.005) || 0.3;
      voices++;
      setTimeout(function () { voices = Math.max(0, voices - 1); }, Math.min(dur, 2.2) * 1000);
    } catch (e) { /* audio must never break the game */ }
  }

  function setMuted(m) {
    muted = !!m;
    try {
      if (master) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(muted ? 0 : MASTER_VOL, ctx.currentTime);
      }
    } catch (e) { }
  }

  function init() {
    if (inited) return;
    inited = true;
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    var unlock = function () { ensure(); };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  function bind(game) {
    if (!game || !game.events) return;
    var on = function (name, fn) { try { game.events.on(name, fn); } catch (e) { } };
    on('dragonAttack', function (e) {
      var el = e && e.dragon && ((e.dragon.def && e.dragon.def.element) || (HH.data.dragons && e.dragon.type && HH.data.dragons[e.dragon.type] && HH.data.dragons[e.dragon.type].element));
      play('shoot_' + (el || 'fire'));
    });
    on('enemyKilled', function () { play('kill'); });
    on('enemyLeaked', function () { play('leak'); });
    on('projectileHit', function () { play('hit'); });
    on('freeze', function () { play('freeze'); });
    on('combo', function () { play('combo'); });
    on('stageUp', function () { play('stageUp'); });
    on('choiceReady', function () { play('choice'); });
    on('waveStart', function () { play('waveStart'); });
    on('waveCleared', function () { play('waveCleared'); });
    on('gameWon', function () { play('win'); });
    on('gameLost', function () { play('lose'); });
    on('dragonPlaced', function () { play('place'); });
    on('dragonSold', function () { play('sell'); });
    on('feed', function () { play('feed'); });
  }

  HH.audio = { init: init, bind: bind, play: play, setMuted: setMuted, names: Object.keys(SOUNDS) };
})(globalThis.HH);
