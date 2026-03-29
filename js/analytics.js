// ===== analytics.js =====
// Sends anonymised run data to Supabase after every run ends.
// Outcome values: 'win' | 'loss' | 'abandoned'
// Fails silently — analytics must never crash the game.

const _ANALYTICS_URL = 'https://wflupykrwlegzekxorzo.supabase.co/rest/v1/run_analytics';
const _ANALYTICS_KEY = 'sb_publishable_hRMWH3gdJYE82tDKzWaWyw_2Yli8vN9';

function sendRunAnalytics(outcome) {
  try {
    // Skip dev/testing contexts
    const isLocalhost   = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const isFullUnlock  = playerName === 'Full Unlock';
    if (isLocalhost || sandboxMode || isFullUnlock) return;

    // Collect spell IDs from every spellbook, skip internal built-ins (_basic_attack etc.)
    const spells = (player.spellbooks || [])
      .flatMap(b => (b.spells || []).map(s => s.id))
      .filter(id => id && !id.startsWith('_'));

    const meta = (typeof getMeta === 'function') ? getMeta() : {};

    const payload = {
      element:   playerElement              || null,
      archetype: playerCharId               || null,
      outcome,
      battles:   battleNumber               || 0,
      rooms:     _runRoomsCompleted         || 0,
      zone:      _runZoneReached || playerElement || null,
      dmg_dealt: _runDmgDealt               || 0,
      dmg_taken: _runDmgTaken               || 0,
      gold:      player.gold                || 0,
      spells,
      artifact:  meta.activeArtifactId      || null,
    };

    fetch(_ANALYTICS_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        _ANALYTICS_KEY,
        'Authorization': 'Bearer ' + _ANALYTICS_KEY,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(payload),
    }).catch(() => {}); // ignore network errors
  } catch(e) {
    // never let analytics bubble up into the game
  }
}
