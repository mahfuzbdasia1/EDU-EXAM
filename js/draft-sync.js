// ============================================================
// Local-first autosave: answers are saved to the browser (localStorage) on every
// change — free and instant — and pushed to Firestore only every so often
// (throttled), plus on submit. This is what keeps 1000 students inside the free
// Firestore write quota (20,000 writes/day) instead of one write per click.
// ============================================================
(function () {
  function load(key) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); return true; } catch (e) { return false; }
  }
  function clear(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  // flush: async () => void (throws on failure)
  // onStatus: "dirty" | "syncing" | "synced" | "error"
  function createSyncer({ flush, intervalMs, retryMs = 30000, onStatus = () => {} }) {
    let dirty = false, timer = null, lastFlush = Date.now(), inFlight = false, stopped = false;

    function schedule(delay) {
      if (timer || stopped) return;
      timer = setTimeout(run, Math.max(0, delay));
    }

    async function run() {
      timer = null;
      if (stopped || !dirty || inFlight) return;
      inFlight = true; dirty = false; onStatus("syncing");
      try {
        await flush();
        lastFlush = Date.now();
        onStatus(dirty ? "dirty" : "synced");
        if (dirty) schedule(intervalMs);
      } catch (e) {
        console.error("cloud sync failed", e);
        dirty = true; onStatus("error"); schedule(retryMs);
      } finally { inFlight = false; }
    }

    return {
      markDirty() {
        if (stopped) return;
        dirty = true; onStatus("dirty");
        schedule(lastFlush + intervalMs - Date.now());
      },
      // Push now if there are unsynced changes and the last sync was >= minGapMs ago.
      flushIfStale(minGapMs) {
        if (stopped || !dirty || inFlight) return;
        if (Date.now() - lastFlush < minGapMs) return;
        clearTimeout(timer); timer = null; run();
      },
      stop() { stopped = true; clearTimeout(timer); timer = null; },
    };
  }

  window.EduDraft = { load, save, clear, createSyncer };
})();
