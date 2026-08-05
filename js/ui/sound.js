/* Keypress feedback, synthesised with WebAudio.
 *
 * Generating the click rather than shipping an audio file keeps the project to
 * zero binary assets, so it still works opened straight from the filesystem. */
(function (TT) {
  'use strict';

  var ctx = null;
  var enabled = false;

  function supported() {
    return typeof window.AudioContext === 'function' ||
           typeof window.webkitAudioContext === 'function';
  }

  function ensure() {
    if (!supported()) return null;
    if (!ctx) {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      ctx = new Ctor();
    }
    // Browsers start the context suspended until a user gesture.
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    return ctx;
  }

  function setEnabled(on) {
    enabled = !!on;
    if (enabled) ensure();
  }

  /* A short filtered blip. `kind` shifts the pitch so errors are distinguishable
   * without being annoying. */
  function play(kind) {
    if (!enabled) return;
    var ac = ensure();
    if (!ac) return;

    var now = ac.currentTime;
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    var filter = ac.createBiquadFilter();

    var freq = kind === 'error' ? 180 : kind === 'space' ? 340 : 520;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.03);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === 'error' ? 0.09 : 0.05, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  TT.sound = {
    setEnabled: setEnabled,
    play: play,
    supported: supported
  };
})(window.TT = window.TT || {});
