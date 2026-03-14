// ===== mp3audio.js =====
// ─── MP3 AUDIO SYSTEM ────────────────────────────────────────────────────────
// Loads MP3s from ./audio/ folder (relative to game.html)
// Synth keys fall through to music.js musicPlay()
//
// Public API:
//   musicPlaySmart(key)  — routes to MP3 or synth
//   musicStopAll()       — stops both systems

const _MP3_KEYS = new Set([
  'menu',
  'map',
  'battle_Fire', 'battle_Lightning',
  'battle_Plasma', 'battle_Air', 'battle_Nature', 'battle_Ice', 'battle_Water',
]);

const _MP3_PATHS = {
  menu:              'audio/menu.mp3',
  map:               'audio/map.mp3',
  battle_Fire:       'audio/fire.mp3',
  battle_Lightning:  'audio/lightning.mp3',
  battle_Plasma:     'audio/Wizard League Plasma Theme .mp3',
  battle_Air:        'audio/Wizard League Air Theme .mp3',
  battle_Nature:     'audio/Wizard League Nature Theme .mp3',
  battle_Ice:        'audio/Wizard League Ice Theme .mp3',
  battle_Water:      'audio/Wizard League Water Theme.mp3',
};

// ── State ─────────────────────────────────────────────────────────────────────
let _mp3El      = null;
let _mp3Key     = null;
let _mp3Paused  = {};
let _mp3FadeRAF = null;
const _MP3_FADE_MS = 450;
const _MP3_MAX_VOL = 0.82;

function _getAudioEl() {
  if (!_mp3El) {
    _mp3El        = new Audio();
    _mp3El.loop   = true;
    _mp3El.volume = 0;
    _mp3El.muted  = false;
  }
  return _mp3El;
}

// ── Fade helpers ──────────────────────────────────────────────────────────────
function _mp3FadeIn(el, onDone) {
  if (_mp3FadeRAF) cancelAnimationFrame(_mp3FadeRAF);
  const start = performance.now();
  const from  = el.volume;
  function tick(now) {
    const t = Math.min((now - start) / _MP3_FADE_MS, 1);
    const _targetVol = _musicEnabled ? (typeof _volumeLevel !== 'undefined' ? _volumeLevel : _MP3_MAX_VOL) : 0;
    el.volume = Math.max(0, Math.min(1, from + (_targetVol - from) * t));
    if (t < 1) { _mp3FadeRAF = requestAnimationFrame(tick); }
    else        { el.volume = _musicEnabled ? (typeof _volumeLevel !== 'undefined' ? _volumeLevel : _MP3_MAX_VOL) : 0; _mp3FadeRAF = null; if (onDone) onDone(); }
  }
  _mp3FadeRAF = requestAnimationFrame(tick);
}

function _mp3FadeOut(el, onDone) {
  if (_mp3FadeRAF) cancelAnimationFrame(_mp3FadeRAF);
  const start = performance.now();
  const from  = el.volume;
  function tick(now) {
    const t = Math.min((now - start) / _MP3_FADE_MS, 1);
    el.volume = Math.max(0, Math.min(1, from * (1 - t)));
    if (t < 1) { _mp3FadeRAF = requestAnimationFrame(tick); }
    else        { el.volume = 0; _mp3FadeRAF = null; if (onDone) onDone(); }
  }
  _mp3FadeRAF = requestAnimationFrame(tick);
}

// ── Play an MP3 key (resume if previously paused) ─────────────────────────────
function _mp3Play(key) {
  const el  = _getAudioEl();
  el.muted = false;

  if (_mp3Key !== key) {
    el.src         = _MP3_PATHS[key];
    el.currentTime = _mp3Paused[key] || 0;
    _mp3Key        = key;
  } else {
    el.currentTime = _mp3Paused[key] || el.currentTime;
  }

  el.volume = 0;
  el.play().catch(err => {
    console.warn('[mp3audio] play() blocked:', err.message, '— path:', _MP3_PATHS[key]);
  });
  _mp3FadeIn(el);
}

// ── Pause an MP3 (saves position) ─────────────────────────────────────────────
function _mp3Pause(key) {
  if (!_mp3El) return;
  _mp3Paused[key] = _mp3El.currentTime;
  _mp3FadeOut(_mp3El, () => { _mp3El.pause(); });
}

// ── Core router ───────────────────────────────────────────────────────────────
let _smartCurrentKey = null;

function musicPlaySmart(key) {
  if (_smartCurrentKey === key) return;
  const prevKey     = _smartCurrentKey;
  _smartCurrentKey  = key;

  const nextIsMP3   = _MP3_KEYS.has(key);
  const prevIsMP3   = prevKey && _MP3_KEYS.has(prevKey);
  const prevIsSynth = prevKey && !prevIsMP3;

  // MP3 → MP3
  if (prevIsMP3 && nextIsMP3) {
    _mp3FadeOut(_getAudioEl(), () => {
      _mp3Paused[prevKey] = 0;
      _mp3Play(key);
    });
    return;
  }
  // Synth → MP3
  if (prevIsSynth && nextIsMP3) {
    musicStop();
    setTimeout(() => _mp3Play(key), _MP3_FADE_MS + 80);
    return;
  }
  // MP3 → Synth
  if (prevIsMP3 && !nextIsMP3) {
    _mp3Pause(prevKey);
    setTimeout(() => musicPlay(key), _MP3_FADE_MS + 80);
    return;
  }
  // Synth → Synth
  if (!nextIsMP3) { musicPlay(key); return; }
  // Cold start
  if (nextIsMP3)  { _mp3Play(key); }
  else            { musicPlay(key); }
}

function musicStopAll() {
  musicStop();
  if (_mp3El) _mp3FadeOut(_mp3El, () => { _mp3El.pause(); });
  _smartCurrentKey = null;
}

// ── Override _tryResumeAudio stub (music.js loads first, can't reference _mp3El yet) ──
_tryResumeAudio = function() {
  if (!_mp3El || !_smartCurrentKey) return;
  if (_mp3El.paused) _mp3Play(_smartCurrentKey);
};

// ── Start audio on first user interaction of any kind ──────────────────────────
// Browsers block autoplay until a gesture; scroll/move/key all count.
(function _setupAudioUnlock() {
  let _unlocked = false;
  const _events = ['click','keydown','pointerdown','touchstart','scroll','mousemove'];
  function _onInteraction() {
    if (_unlocked) return;
    _unlocked = true;
    _tryResumeAudio();
    _events.forEach(ev => document.removeEventListener(ev, _onInteraction, true));
  }
  _events.forEach(ev => document.addEventListener(ev, _onInteraction, { capture: true, passive: true }));
})();

// musicToggle is fully defined in music.js stubs above — no override needed here.


