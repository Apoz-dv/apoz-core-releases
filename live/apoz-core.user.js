// ==UserScript==
// @name         Apoz Core
// @namespace    apoz-core
// @author       Apoz
// @version      6.8.1
// @description  The shell every Apoz Core module plugs into: nav launcher, module + tool registries, shared number handling for the game's per-character decimal convention, and update checking. INSTALL THIS FIRST - on its own it adds a menu and nothing else. Every script in this family is named "Apoz Core..." so they sort together in your dashboard.
// @match        https://v2.queslar.com/*
// @match        https://*.queslar.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/Apoz-dv/apoz-core-releases/main/live/apoz-core.user.js
// @downloadURL  https://raw.githubusercontent.com/Apoz-dv/apoz-core-releases/main/live/apoz-core.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ==== GENERATED — release identity ====
  const APOZ_RELEASE = {
    "channel": "live",
    "version": "6.8.1",
    "manifestUrl": "https://raw.githubusercontent.com/Apoz-dv/apoz-core-releases/main/live/manifest.json"
  };
  // ==== END GENERATED ====

  // NO-PROVENANCE: Core consumes no data/ facts - see build.mjs buildCore().

  // ---- Apoz Core — the shell every module plugs into ----
  //
  // CHANGED 2026-09-05: this is its OWN userscript now, and it is the only
  // place the Core exists. Modules used to carry a verbatim copy each, which
  // worked for one module and breaks quietly for several — a module arriving
  // with a newer Core copy replaced window.__ApozCore, and every module
  // already registered against the old one silently vanished from the menu.
  // See DISTRIBUTION.md §1.1.
  //
  // Modules now ship ~12 lines instead of ~30KB: they push a factory onto
  // window.__apozModules and call claim(). Load order does not matter in
  // either direction — a module that loads first waits in the queue, and a
  // module that loads later claims itself on arrival.
  //
  // DOM work stays a one-time build plus cheap incremental re-renders; the
  // only self-owned timers are a 3s nav-anchor heartbeat and a 5s title-badge
  // check, both unchanged.

  // FLAG (2026-08-30): no cap for now, per explicit request - revisit if a lot
  // of modules ever makes the top bar too wide/unwieldy.
  const APOZ_CORE_MAX_QUICK_BUTTONS = Infinity;

  // Bump on API change. What each version ADDED, so a module can tell what it
  // may rely on: 5 = standalone Core, claim(), toast, updates; 6 =
  // createWindow/ui.* shared window framework; 7 = ui.menu, ui.icon-btn/
  // primary-btn classes, windowResizingEnabled setting; 8 = walkFiberAll,
  // resetPosition/resetFull split, real theme presets, generalized
  // [data-tooltip]; 9 = onNavigate; 10 = createScope/ui.write/ui.dom — the
  // framework layer (userscripts/FRAMEWORK.md); 11 = jobs (the local job-host
  // client — see server/README.md).
  //
  // CORRECTED 2026-09-07: this list claimed v5 shipped a "bus". It never did —
  // see the "NOT TAKEN from the Apoz Core Framework" note further down, which
  // is the actual decision. A version history is the first thing a module
  // author reads to decide what exists, so a phantom entry in it is worse than
  // no list at all.
  const APOZ_CORE_VERSION = 11;

  // Exactly one Core per page. Two installed Core scripts is a user
  // misconfiguration, not a state to negotiate — first one wins and the second
  // says so, loudly enough to be findable and quietly enough not to break the
  // page. (Version negotiation lived here when every module carried a copy;
  // with one Core script there is nothing to negotiate.)
  if (window.__ApozCore) {
    console.warn('[ApozCore] A Core (v' + window.__ApozCore.version + ') is already running; this copy is standing down. '
      + 'You have two Apoz Core scripts installed — keep one.');
    if (window.__ApozCore.claim) window.__ApozCore.claim();
    return;
  }

  // Release identity. build.mjs injects APOZ_RELEASE; the fallback keeps this
  // file runnable on its own (tests, and a hand-loaded copy) with updates off.
  const RELEASE = (typeof APOZ_RELEASE !== 'undefined')
    ? APOZ_RELEASE
    : { channel: 'dev', manifestUrl: null, version: '0.0.0' };

  const Core = (function () {
    const REG_KEY = 'apoz:core:registry';
    const LEGACY_REG_KEY = 'apoz-core-registry-v1';
    const BADGE_PREFIX = '🔔 ';
    // Hoisted out of buildUi() (v6): the window framework's own injected
    // stylesheet needs the same font, and duplicating the string was how the
    // two chromes would have quietly drifted apart.
    const CORE_FONT = "Lato, 'Open Sans', Nunito, 'Segoe UI', system-ui, sans-serif";

    // ---- settings (v6.1) ----
    //
    // One small persisted blob, not one key per setting — a module reading
    // Core.getSetting() never has to know how many keys exist.
    const SETTINGS_KEY = 'apoz:core:settings';
    const SETTINGS_DEFAULTS = {
      // Enabling a module always shows its window immediately (that part is
      // not a setting — see onToggle in registerModule callers). This is
      // specifically about a page RELOAD restoring a window that happened to
      // be open last session: OFF by default per explicit request, so a
      // reload doesn't clutter the screen with everything that was open
      // last time.
      autoShowOnReload: false,
      // OFF by default: the chrome renders from a fixed snapshot of this
      // game's own theme (liveAdaptTheme:false) rather than live var()
      // lookups, so it looks right even before the game's CSS has painted
      // and never shifts if the game's own theme changes underneath it.
      // Flip this on to go back to inheriting var(--apoz-card) etc. live, the
      // behaviour this Core always had before v6.1.
      liveAdaptTheme: false,
      // ON by default. OFF removes the resize handle from every window
      // (Settings is never resizable regardless of this setting — see
      // openSettingsWindow) for anyone who would rather every window just
      // kept its default/reset size than risk dragging one into an odd shape.
      windowResizingEnabled: true,
    };
    let settings = Object.assign({}, SETTINGS_DEFAULTS);
    try {
      const rawSettings = localStorage.getItem(SETTINGS_KEY);
      if (rawSettings) Object.assign(settings, JSON.parse(rawSettings));
    } catch (e) { /* ignore, defaults stand */ }
    function getSetting(key) { return settings[key]; }
    function setSetting(key, value) {
      settings[key] = value;
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
      if (key === 'liveAdaptTheme') applyThemeMode();
      // Every already-open window picks up an on/off flip immediately, not
      // only the next time it happens to be opened fresh.
      if (key === 'windowResizingEnabled') {
        for (const id in windowRegistry) windowRegistry[id].applyResizability();
      }
    }

    // ---- theming: named presets, static snapshot by default, live var() adaptation opt-in ----
    //
    // "Apoz Turquoise" is the user's own real `.dark{}` theme block (given
    // 2026-09-07), replacing the earlier placeholder guesses — oklch() and
    // hex are mixed here exactly as supplied; every browser this runs in
    // already renders oklch() natively (the game's own CSS uses it too).
    const THEME_PRESETS = {
      apozTurquoise: {
        card: 'oklch(0.19 0.012 215)', border: '#392e22', primary: '#3e959a',
        'primary-foreground': 'oklch(0.98 0.01 200)', input: '#4e4137',
        foreground: 'oklch(0.92 0.018 55)', popover: 'oklch(0.18 0.012 215)',
        'popover-foreground': 'oklch(0.92 0.015 215)',
      },
    };
    const THEME_SNAPSHOT = THEME_PRESETS.apozTurquoise;
    const THEME_TOKENS = Object.keys(THEME_SNAPSHOT);
    function applyThemeMode() {
      const root = document.documentElement;
      if (!root || !root.style || typeof root.style.setProperty !== 'function') return;
      for (const key of THEME_TOKENS) {
        if (getSetting('liveAdaptTheme')) root.style.setProperty(`--apoz-${key}`, `var(--${key}, ${THEME_SNAPSHOT[key]})`);
        else root.style.setProperty(`--apoz-${key}`, THEME_SNAPSHOT[key]);
        // REPORTED BUG: floating tooltips rendered see-through while live-adapt
        // is on. Root cause: the game's own --card/--popover are likely rgba()
        // with alpha < 1, meant to sit over a backdrop-blur the game itself
        // provides — a tooltip has no such ancestor, so it shows whatever is
        // behind it instead of a solid panel. A floating overlay can never
        // safely inherit a translucent theme color, live-adapted or not, so it
        // always gets the guaranteed-opaque snapshot value here regardless of
        // the liveAdaptTheme setting.
        root.style.setProperty(`--apoz-solid-${key}`, THEME_SNAPSHOT[key]);
      }
    }

    // ---- number format — shared, because every module must parse identically ----
    //
    // How the GAME does it (bundle: NumberDisplay-*.js + utils-*.js, v1.2.3.11):
    // it formats through `Intl.NumberFormat(LOCALE_MAP[numberLocale])`, where
    // `numberLocale` is a per-character server setting with exactly three values.
    // A separate `numberFormatting` setting picks standard | exponential | letters.
    //
    // So separators are DERIVED from Intl exactly as the game derives them —
    // never assumed, and never inferred from a single ambiguous string. This is
    // the whole reason "1.234" is safe: we know the convention before we parse.
    const NUMBER_LOCALE_MAP = {
      'Local': navigator.language || 'en-US',
      '1.000,00': 'de-DE',
      '1,000.00': 'en-US',
    };
    // full suffix ladder from the game's own array — not just k/m/b/t
    const SUFFIX_POW = {
      k: 1, m: 2, b: 3, t: 4, qa: 5, qi: 6, sx: 7, sp: 8, oc: 9, no: 10, dc: 11, ud: 12,
    };
    const OVERRIDE_KEY = 'apoz:core:numberLocale';

    function separatorsFor(locale) {
      try {
        const parts = new Intl.NumberFormat(locale).formatToParts(1234567.8);
        const group = (parts.find((p) => p.type === 'group') || {}).value || ',';
        const decimal = (parts.find((p) => p.type === 'decimal') || {}).value || '.';
        return { locale, group, decimal };
      } catch (e) {
        return { locale: 'en-US', group: ',', decimal: '.' };
      }
    }

    // ---- shared UI geometry (v6) ----
    //
    // ROOT CAUSE of a reported bug: nothing anywhere re-checked a window's or
    // the dropdown's position against the CURRENT viewport. A position computed
    // once (at open time, or at the end of a drag) was trusted forever, so a
    // small browser window or an edge-anchored default silently produced a
    // panel that opens partially or wholly off-screen — the dropdown's own
    // bug (opens right-anchored, no width check, overflows the right edge)
    // was one symptom of this, not a dropdown-specific defect. Fixed once,
    // here, and reused by every window, the dropdown, and the browser-resize
    // re-clamp pass below — not patched at each call site.
    //
    // Pure, no DOM: unit-testable directly (userscripts/tests/core-ui-geometry.mjs).
    function viewportRect() {
      return { w: window.innerWidth, h: window.innerHeight };
    }

    // Keeps at least `minVisible` px of `rect` reachable inside `viewport` on
    // every edge it could be dragged past. The header must never go ABOVE the
    // top edge (there would be nothing left to grab to pull it back), so `y`
    // never goes negative; left/right/bottom may partially overflow down to
    // `minVisible` px remaining on-screen, matching how most window managers
    // behave and giving a drag somewhere to rest short of a hard stop.
    function clampRectToViewport(rect, viewport, opts) {
      opts = opts || {};
      const minVisible = opts.minVisible == null ? 72 : opts.minVisible;
      const margin = opts.margin == null ? 4 : opts.margin;
      const w = Math.min(rect.w, Math.max(minVisible, viewport.w - margin * 2));
      const h = Math.min(rect.h, Math.max(minVisible, viewport.h - margin * 2));
      const minX = margin - (w - minVisible);
      const maxX = Math.max(minX, viewport.w - margin - minVisible);
      const minY = margin;
      const maxY = Math.max(minY, viewport.h - margin - minVisible);
      return {
        x: Math.max(minX, Math.min(maxX, rect.x)),
        y: Math.max(minY, Math.min(maxY, rect.y)),
        w, h,
      };
    }

    // The dropdown-off-screen fix, generalised: prefer left-aligned-below the
    // anchor; flip to right-aligned/grow-leftward if the preferred rect would
    // overflow the right edge, and flip upward if it would overflow the
    // bottom. A final clampRectToViewport is a safety net for a viewport
    // smaller than the menu itself, not the primary mechanism.
    function positionDropdownNearAnchor(anchorRect, size, viewport, margin) {
      margin = margin == null ? 8 : margin;
      let x = anchorRect.left;
      if (x + size.w > viewport.w - margin) x = anchorRect.right - size.w;
      let y = anchorRect.bottom + 4;
      if (y + size.h > viewport.h - margin) y = anchorRect.top - size.h - 4;
      return clampRectToViewport({ x, y, w: size.w, h: size.h }, viewport,
        { minVisible: size.w, margin });
    }

    // ================================================================
    // ---- SCOPES — the framework's one stability primitive (v10) ----
    // ================================================================
    //
    // WHAT THIS REPLACES. INSTRUMENTATION.md §4.4 states a browser budget:
    // at most one MutationObserver per module, debounced >= 250ms; no
    // document-level listener outliving the interaction that needed it; no DOM
    // writes while hidden. Until now every clause of that was DISCIPLINE — a
    // thing a reviewer had to notice. A repo-wide audit on 2026-09-07 found
    // four separate violations in shipped code, every one of them the same
    // shape: something created and never released. `ui.menu` orphaned one
    // document listener per open, forever. `createWindow().destroy()` left its
    // ResizeObserver connected. Two modules ran timers nobody could enumerate.
    //
    // None of those were sloppiness. They are what happens when teardown is a
    // separate act of memory from setup, performed at a distance, in a
    // different function, often written weeks later.
    //
    // A SCOPE MAKES TEARDOWN THE SAME ACT AS SETUP. Everything with a lifetime
    // is registered through one, and `dispose()` releases all of it at once, in
    // reverse order, without the caller enumerating anything. A module that
    // owns exactly one scope cannot leak, because there is nowhere for a
    // registration to hide.
    //
    // AND IT ENFORCES THE BUDGET RATHER THAN DOCUMENTING IT. A second
    // MutationObserver in one scope throws. An undebounced one throws. A
    // debounce under 250ms throws. The rule and its check are the same object,
    // so a new module cannot reintroduce a trap merely by not having read §4.4.
    //
    // DESIGNED TO BE SITE-AGNOSTIC. Nothing here knows what game this is, what
    // the page looks like, or that a page has a nav bar. It is the portable
    // half — see userscripts/FRAMEWORK.md for the layer boundary and the
    // adapter contract that carries the site-specific half.
    const SCOPE_MIN_OBSERVER_DEBOUNCE_MS = 250;

    function createScope(name, { maxObservers = 1 } = {}) {
      const teardowns = [];
      let observerCount = 0;
      let disposed = false;
      const children = new Set();

      function guard(what) {
        if (disposed) {
          throw new Error(`[ApozCore] scope "${name}" is disposed; cannot ${what}. `
            + 'Registering against a dead scope is how a "cleaned up" module keeps running — '
            + 'create a new scope instead of reviving this one.');
        }
      }
      function add(fn) { guard('add a teardown'); teardowns.push(fn); return fn; }

      const scope = {
        name,
        get disposed() { return disposed; },
        // Counts, for tests and for __apozDiag. A number nobody can produce is
        // a budget nobody can check.
        get size() { return teardowns.length; },
        get observers() { return observerCount; },

        add,

        on(target, type, handler, opts) {
          guard(`listen for "${type}"`);
          target.addEventListener(type, handler, opts);
          return add(() => target.removeEventListener(type, handler, opts));
        },

        interval(fn, ms) {
          guard('start an interval');
          const id = setInterval(fn, ms);
          return add(() => clearInterval(id));
        },

        // Returns a canceller as well as registering one, because a timeout is
        // the one thing callers routinely want to cancel EARLY — a debounce
        // restarted on every keystroke, say.
        timeout(fn, ms) {
          guard('start a timeout');
          let id = setTimeout(() => { id = null; fn(); }, ms);
          const cancel = () => { if (id !== null) { clearTimeout(id); id = null; } };
          add(cancel);
          return cancel;
        },

        raf(fn) {
          guard('request a frame');
          const id = requestAnimationFrame(fn);
          return add(() => cancelAnimationFrame(id));
        },

        // §4.4's observer clause, enforced. `debounceMs` is REQUIRED and has no
        // default on purpose: an unthrottled body-wide observer was measured
        // hanging the tab, and a default would let the next module inherit the
        // measurement without inheriting the lesson.
        mutation(target, options, handler, { debounceMs } = {}) {
          guard('observe mutations');
          if (typeof MutationObserver !== 'function') return () => {};
          if (observerCount >= maxObservers) {
            throw new Error(`[ApozCore] scope "${name}" already owns ${observerCount} MutationObserver(s) `
              + `(limit ${maxObservers}). INSTRUMENTATION.md §4.4 budgets one per module: a second one is almost `
              + 'always the first one wanted for a different reason, and merging them costs one branch in a '
              + 'callback that already runs. If two really are needed, say why and raise maxObservers explicitly.');
          }
          if (!Number.isFinite(debounceMs) || debounceMs < SCOPE_MIN_OBSERVER_DEBOUNCE_MS) {
            throw new Error(`[ApozCore] scope "${name}": a MutationObserver needs debounceMs >= `
              + `${SCOPE_MIN_OBSERVER_DEBOUNCE_MS}, got ${JSON.stringify(debounceMs)}. This is not a style rule — `
              + 'an unthrottled childList+subtree observer on a busy page was MEASURED hanging the tab.');
          }
          if (options && options.attributes) {
            throw new Error(`[ApozCore] scope "${name}": attribute observation is refused (§4.4). `
              + 'childList + subtree only — attributes fire on animations and hover states, orders of magnitude '
              + 'more often, for information a module has never yet actually needed.');
          }
          observerCount++;
          let pending = null;
          const obs = new MutationObserver(() => {
            if (pending) return;             // coalesce a burst into one call
            pending = setTimeout(() => { pending = null; handler(); }, debounceMs);
          });
          obs.observe(target, options);
          return add(() => {
            obs.disconnect();
            if (pending) clearTimeout(pending);
            observerCount--;
          });
        },

        resize(target, handler) {
          guard('observe resizes');
          if (typeof ResizeObserver !== 'function') return () => {};
          const ro = new ResizeObserver(handler);
          ro.observe(target);
          return add(() => ro.disconnect());
        },

        // A nested scope disposed by its parent. This is what makes a window,
        // a modal or a menu — anything with a lifetime shorter than its
        // module's — safe: dispose the child when it closes, or let the parent
        // take it when the module goes.
        child(childName, opts) {
          guard('create a child scope');
          const c = createScope(`${name}/${childName}`, opts);
          children.add(c);
          add(() => { children.delete(c); c.dispose(); });
          return c;
        },

        dispose() {
          if (disposed) return;              // idempotent: double-dispose is not an error
          disposed = true;
          // REVERSE order, so a teardown can rely on anything registered before
          // it still existing — the same reason a stack unwinds the way it does.
          for (let i = teardowns.length - 1; i >= 0; i--) {
            // One throwing teardown must not strand the rest. A half-disposed
            // scope is worse than either outcome, because the leak it leaves is
            // invisible and unrepeatable.
            try { teardowns[i](); } catch (err) { console.error(`[ApozCore] teardown failed in scope "${name}":`, err); }
          }
          teardowns.length = 0;
          observerCount = 0;
        },
      };
      return scope;
    }

    // Core's own lifetime. Page-lifetime work still goes through a scope, so
    // `__apozDiag()` can report one honest number for "things this page is
    // holding open" rather than a count that stops at whatever was remembered.
    // maxObservers is 1, the same budget every module gets. Core is the
    // framework, which would be the obvious excuse for granting itself more —
    // and it needs exactly one (the nav anchor watcher), so taking more would
    // be unearned slack in the one place it would be least noticed.
    const coreScope = createScope('core', { maxObservers: 1 });

    // ================================================================
    // ---- THE WRITE SCHEDULER — the framework's performance half ----
    // ================================================================
    //
    // THE PROBLEM IT SOLVES, and it gets worse with every module: N modules
    // each writing to the DOM on their own cadence is N independent chances to
    // force a layout, and they interleave. One module's read after another's
    // write is a synchronous reflow neither author can see in their own file.
    // With one module that is invisible; §4.4 already records `renderQuickRow`
    // rebuilding the nav bar per registration being VISIBLE as jitter at three.
    //
    // THREE RULES, all of which only work if writes go through one door:
    //
    //   1. **Coalesce by key, last write wins.** A value that changes five
    //      times before the next frame is written once. Keying by string
    //      rather than by element is deliberate — it lets a module coalesce
    //      "the whole countdown row" as one unit.
    //   2. **One frame, all modules.** Every queued write lands in a single
    //      requestAnimationFrame callback, so the browser lays out once.
    //   3. **Nothing while hidden.** A background tab gets no DOM writes at
    //      all; queued work is HELD, not dropped, and flushed on the way back.
    //      Held, because §5's S2 trap is exactly this: the state must keep
    //      advancing while hidden even though the pixels must not.
    //
    // The compare-before-write helpers below are the other half. §5's S6 found
    // ~15 unguarded textContent writes per second, each one a potential style
    // invalidation for a string that had not changed.
    const scheduler = (() => {
      const queued = new Map();       // key -> fn, insertion-ordered
      let frame = null;
      let flushes = 0;
      let coalesced = 0;

      function flush() {
        frame = null;
        if (!queued.size) return;
        const batch = [...queued.values()];
        queued.clear();
        flushes++;
        for (const fn of batch) {
          // One throwing write must not lose the rest of the frame — the
          // others are unrelated modules.
          try { fn(); } catch (err) { console.error('[ApozCore] a scheduled DOM write threw:', err); }
        }
      }

      function schedule() {
        if (frame !== null) return;
        if (typeof document !== 'undefined' && document.hidden) return; // held; visibilitychange flushes
        frame = requestAnimationFrame(flush);
      }

      return {
        write(key, fn) {
          if (queued.has(key)) coalesced++;
          queued.set(key, fn);
          schedule();
        },
        // Called when the tab becomes visible again, and by tests that need a
        // deterministic frame instead of waiting for a real one.
        flushNow() { if (frame !== null) { cancelAnimationFrame(frame); frame = null; } flush(); },
        wake() { if (queued.size) schedule(); },
        get stats() { return { pending: queued.size, flushes, coalesced }; },
      };
    })();

    // Compare before writing. Every one of these is a no-op when the value is
    // unchanged, which is the common case on a per-second render.
    const domWrite = {
      text(el, value) { const v = String(value); if (el && el.textContent !== v) el.textContent = v; },
      attr(el, name, value) {
        if (!el) return;
        if (value === null || value === false) { if (el.getAttribute(name) !== null) el.removeAttribute(name); return; }
        const v = String(value);
        if (el.getAttribute(name) !== v) el.setAttribute(name, v);
      },
      style(el, prop, value) { const v = String(value); if (el && el.style[prop] !== v) el.style[prop] = v; },
      toggle(el, cls, on) { if (el && el.classList.contains(cls) !== !!on) el.classList.toggle(cls, !!on); },
    };

    // ---- React fiber walk ----
    //
    // ONE bounded traversal, shared by every probe that needs live state the
    // DOM does not render as text. `visit(candidateObject)` returns true to
    // stop. Never call this on a render path - it is a whole-tree walk, and
    // that is exactly why it is capped at 30k nodes and why every caller
    // caches its result.
    //
    // Every probe built on it MUST refuse rather than guess (CONVENTIONS §9.4):
    // if the shape it expects is not found, the answer is null, not a
    // plausible substitute.
    // stopAtFirst=true (default, unchanged from before): visit() returning
    // truthy stops the whole walk — for "find the one thing." Pass false
    // (walkFiberAll below) to keep visiting every candidate to the bound
    // instead — for "sum every match" (e.g. several equipped items each
    // contributing to the same stat), where stopping at the first would
    // silently under-count.
    function walkFiber(visit, stopAtFirst) {
      if (stopAtFirst === undefined) stopAtFirst = true;
      try {
        const host = document.getElementById('root');
        if (!host) return false;
        let rootFiber = null;
        for (const k in host) {
          if (k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$')) {
            rootFiber = host[k];
            break;
          }
        }
        if (!rootFiber) return false;
        const seen = new Set();
        const stack = [rootFiber];
        let steps = 0;
        let matched = false;
        while (stack.length && steps++ < 30000) {
          const f = stack.pop();
          if (!f || typeof f !== 'object' || seen.has(f)) continue;
          seen.add(f);
          for (const bag of [f.memoizedProps, f.memoizedState]) {
            if (!bag || typeof bag !== 'object') continue;
            for (const cand of [bag, bag.value, bag.memoizedState]) {
              if (cand && typeof cand === 'object' && visit(cand)) {
                if (stopAtFirst) return true;
                matched = true;
              }
            }
          }
          if (f.child) stack.push(f.child);
          if (f.sibling) stack.push(f.sibling);
        }
        return matched;
      } catch (e) { /* fiber shape changed - callers fall back */ }
      return false;
    }
    // Same traversal, but never stops early — visit() is called for every
    // candidate found (return true from it just to record "I used this one",
    // the walk continues regardless). Use when several fiber nodes could
    // each hold a piece of the same total.
    function walkFiberAll(visit) { return walkFiber(visit, false); }

    // Authoritative source: the character's own setting, read off the React tree.
    // Bounded and cached - never runs on a render path.
    function probeNumberLocaleFromFiber() {
      let out = null;
      walkFiber((cand) => {
        if (typeof cand.numberLocale === 'string') { out = cand.numberLocale; return true; }
        const s = cand.characterSettingsGeneral;
        if (s && typeof s.numberLocale === 'string') { out = s.numberLocale; return true; }
        return false;
      });
      return out;
    }

    // The character's MERGED MULTIPLIERS — the ~80-key object the game itself
    // computes and the REST API exposes as /api/character/merged-multipliers.
    //
    // Worth a probe of its own because it is the single richest live source in
    // the page: monsterGoldFlat and monsterGoldPercentage (the two terms that
    // dominate gold.base), potionEffect, and the stacked income boosts. Reading
    // them beats modelling them from an assumed pet roll.
    //
    // The predicate is two co-occurring, specifically-named numeric keys. That
    // is deliberately narrow: 'gold' or 'level' alone match a dozen unrelated
    // objects in this tree, and a wrong object here would feed plausible
    // rubbish into a calculator that recommends what to spend a week of income
    // on. Fewer than both keys present = no answer.
    //
    // SHAPE SOURCE: data/formulas/economy.json (gold.base, cross-confirmed
    // against the REST endpoint) and data/formulas/party.json
    // (party.mergedMultipliers.pools captured the whole object).
    let mergedProbe;
    function probeMergedMultipliers(force) {
      if (mergedProbe !== undefined && !force) return mergedProbe;
      let out = null;
      walkFiber((cand) => {
        if (typeof cand.monsterGoldFlat !== 'number') return false;
        if (typeof cand.monsterGoldPercentage !== 'number') return false;
        if (!isFinite(cand.monsterGoldFlat) || !isFinite(cand.monsterGoldPercentage)) return false;
        out = cand;
        return true;
      });
      mergedProbe = out;
      return out;
    }

    // The character object, for facts the page shows only inside a hover card
    // or not at all (character level is the one a module needs today).
    //
    // The predicate is deliberately over-specified: `level` alone matches a
    // dozen unrelated objects in this tree (pets, party members, village
    // buildings), so a match also has to look like a CHARACTER. Fewer than two
    // corroborating fields = no answer.
    let characterProbe;
    function probeCharacter(force) {
      if (characterProbe !== undefined && !force) return characterProbe;
      let out = null;
      walkFiber((cand) => {
        if (typeof cand.level !== 'number' || !(cand.level > 0)) return false;
        let score = 0;
        if (typeof cand.experience === 'number') score++;
        if (typeof cand.name === 'string') score++;
        if (typeof cand.gold === 'number' || typeof cand.gold === 'string') score++;
        if (cand.characterSettingsGeneral && typeof cand.characterSettingsGeneral === 'object') score += 2;
        if (score < 2) return false;
        out = {
          level: Math.round(cand.level),
          name: typeof cand.name === 'string' ? cand.name : null,
          confidence: score,
        };
        return true;
      });
      characterProbe = out;
      return out;
    }

    // Unambiguous only when a rendered number carries BOTH separators:
    // whichever appears last is the decimal separator.
    function probeFromPageSample() {
      const root = document.querySelector('main') || document.body;
      if (!root) return null;
      const text = root.textContent || '';
      const m = text.match(/\d{1,3}([.,])\d{3}([.,])\d{1,2}(?!\d)/);
      if (!m) return null;
      const decimal = m[2];
      const group = m[1];
      if (decimal === group) return null;
      return { locale: null, group, decimal };
    }

    let convention = null;

    function resolveConvention() {
      let stored = null;
      try { stored = localStorage.getItem(OVERRIDE_KEY); } catch (e) { /* ignore */ }
      if (stored && NUMBER_LOCALE_MAP[stored]) {
        return Object.assign(separatorsFor(NUMBER_LOCALE_MAP[stored]),
          { source: 'override', numberLocale: stored });
      }
      const fromFiber = probeNumberLocaleFromFiber();
      if (fromFiber && NUMBER_LOCALE_MAP[fromFiber]) {
        return Object.assign(separatorsFor(NUMBER_LOCALE_MAP[fromFiber]),
          { source: 'setting', numberLocale: fromFiber });
      }
      const fromSample = probeFromPageSample();
      if (fromSample) return Object.assign(fromSample, { source: 'sample', numberLocale: null });
      return Object.assign(separatorsFor(navigator.language || 'en-US'),
        { source: 'browser', numberLocale: 'Local' });
    }

    function getConvention() {
      if (!convention) convention = resolveConvention();
      return convention;
    }
    // re-probe: the setting can only be read once React has rendered
    function refreshConvention() {
      const next = resolveConvention();
      const changed = !convention || next.decimal !== convention.decimal
        || next.group !== convention.group || next.source !== convention.source;
      convention = next;
      return changed;
    }
    function setNumberLocaleOverride(key) {
      try {
        if (key) localStorage.setItem(OVERRIDE_KEY, key);
        else localStorage.removeItem(OVERRIDE_KEY);
      } catch (e) { /* ignore */ }
      convention = null;
      renderNumberFormatRow();
      for (const id of Object.keys(modules)) safely(id, 'onConventionChange');
    }

    // Returns null rather than a wrong number. An unparseable string is a
    // refusal, never a guess - a silently mis-scaled value is worse than none.
    function parseNumber(str) {
      if (typeof str !== 'string') return null;
      const c = getConvention();
      let s = str.trim().toLowerCase().replace(/[+\s  ]/g, '');
      if (!s) return null;
      let sign = 1;
      if (s.startsWith('-')) { sign = -1; s = s.slice(1); }
      // exponential formatting (numberFormatting === 'exponential')
      const exp = s.match(/^([\d.,]+)e([+-]?\d+)$/);
      let mult = 1;
      if (exp) {
        s = exp[1];
        mult = Math.pow(10, parseInt(exp[2], 10));
      } else {
        const suf = s.match(/^([\d.,]+)\s*([a-z]{1,2})$/);
        if (suf) {
          const p = SUFFIX_POW[suf[2]];
          if (p === undefined) return null;
          s = suf[1];
          mult = Math.pow(1000, p);
        }
      }
      if (!/^[\d.,]+$/.test(s)) return null;
      // split off the decimal part first, then validate thousands grouping.
      // Malformed grouping ("1.2.3") must refuse, not silently become 123 -
      // a plausible wrong number is worse than none.
      const decParts = s.split(c.decimal);
      if (decParts.length > 2) return null;
      const intPart = decParts[0];
      const fracPart = decParts.length === 2 ? decParts[1] : null;
      if (fracPart !== null && (fracPart === '' || fracPart.indexOf(c.group) !== -1)) return null;
      const groups = intPart.split(c.group);
      if (groups.length > 1) {
        if (groups[0].length < 1 || groups[0].length > 3) return null;
        for (let i = 1; i < groups.length; i++) {
          if (!/^\d{3}$/.test(groups[i])) return null;
        }
      }
      s = groups.join('') + (fracPart !== null ? '.' + fracPart : '');
      if (!/^\d+(\.\d+)?$/.test(s)) return null;
      const v = parseFloat(s);
      if (!Number.isFinite(v)) return null;
      return sign * v * mult;
    }

    // Render in the user's own convention, so our UI matches the game's.
    function formatNumber(value, decimals = 2) {
      if (value === null || value === undefined || !Number.isFinite(value)) return '—';
      const c = getConvention();
      const abs = Math.abs(value);
      let scaled = value;
      let suffix = '';
      if (abs >= 1000) {
        const i = Math.min(Math.floor(Math.log(abs) / Math.log(1000)), 12);
        scaled = value / Math.pow(1000, i);
        suffix = ['k', 'm', 'b', 't', 'qa', 'qi', 'sx', 'sp', 'oc', 'no', 'dc', 'ud'][i - 1] || '';
      }
      const fixed = scaled.toFixed(abs >= 1000 ? decimals : 0);
      return (c.decimal === '.' ? fixed : fixed.split('.').join(c.decimal)) + suffix;
    }

    // Everything a module exports to the core backend must carry this, so a
    // number can be re-derived if the convention was ever detected wrong.
    function numberProvenance() {
      const c = getConvention();
      return {
        numberLocale: c.numberLocale, locale: c.locale,
        group: c.group, decimal: c.decimal, detectedVia: c.source,
      };
    }
    let maxQuickButtons = APOZ_CORE_MAX_QUICK_BUTTONS;
    const modules = {};

    // TOOLS ARE NOT MODULES, and the distinction is deliberate rather than
    // cosmetic. A module has state, a panel, storage, and a lifecycle, so
    // "enabled" is a meaningful axis for it. A tool is a standalone page the
    // user opens in another tab — there is nothing running, nothing to
    // persist, and therefore nothing to enable or disable. Modelling one as
    // a permanently-enabled module would put a dead on/off switch in the UI
    // and give it a storage namespace it never writes to.
    //
    // A tool therefore has no onToggle/onQuickClick/onResetPosition, gets no
    // quick-row button, and is not touched by disableAll() or
    // resetPositions().
    const tools = {};
    // Modules that asked for a Core newer than this one. Kept so the dropdown
    // can say "install the update" instead of the module simply not appearing.
    const incompatible = {};
    // Modules installed more than once - see claim().
    const duplicates = {};
    let enabledOrder = [];
    let coreUi = null;

    // Every module-supplied callback goes through here. One module throwing
    // must never take down the launcher or its neighbours.
    function safely(id, hook, ...args) {
      const mod = modules[id];
      if (!mod || typeof mod[hook] !== 'function') return undefined;
      try {
        return mod[hook](...args);
      } catch (err) {
        mod.errored = true;
        console.error(`[Apoz Core] module "${id}" threw in ${hook}()`, err);
        return undefined;
      }
    }

    try {
      const raw = localStorage.getItem(REG_KEY) || localStorage.getItem(LEGACY_REG_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && Array.isArray(saved.enabledOrder)) enabledOrder = saved.enabledOrder;
      if (raw && !localStorage.getItem(REG_KEY)) {
        localStorage.setItem(REG_KEY, raw);
        localStorage.removeItem(LEGACY_REG_KEY);
      }
    } catch (e) { /* ignore */ }

    function saveState() {
      try { localStorage.setItem(REG_KEY, JSON.stringify({ enabledOrder })); } catch (e) { /* ignore */ }
    }

    // WHERE THE BUTTON GOES, in descending order of preference.
    //
    // REPORTED 2026-09-06: "the script still doesn't load". It was loading. It
    // had no anchor: the old code looked for exactly one link, and if that link
    // was not there it inserted the group NOWHERE and returned silently. Core
    // running perfectly while being invisible is indistinguishable, from the
    // outside, from Core not running at all - and it is a worse failure,
    // because everything that reports health says it is fine.
    //
    // The rule now: ALWAYS end up somewhere. A button in a slightly wrong place
    // is a cosmetic problem; a button nowhere is a broken script.
    // STRUCTURAL, not tag-based. The previous version asked for <header>/<nav>
    // and got neither: this game's top bar is divs, so every candidate missed
    // and the menu fell back to floating. Tag names are a guess about how
    // someone built their markup; "the element containing the most in-game nav
    // links" is a fact about the page, and survives a redesign.
    function findAnchor() {
      const log = document.querySelector('a[href="/game/log"]');
      if (log) return { el: log, how: 'after the Game Log link', mode: 'after' };

      // Group every in-game link by its parent and take the busiest group -
      // that is the nav bar, whatever it is built from.
      const links = [...document.querySelectorAll('a[href^="/game/"], a[href*="/game/"]')]
        .filter((a) => a.offsetParent !== null);   // visible only; menus can be duplicated offscreen
      if (links.length) {
        const byParent = new Map();
        for (const a of links) {
          const parent = a.parentElement;
          if (!parent) continue;
          if (!byParent.has(parent)) byParent.set(parent, []);
          byParent.get(parent).push(a);
        }
        let best = null;
        for (const [parent, group] of byParent) {
          // Prefer the group that is both largest and highest on the page: the
          // top bar, not a sidebar or a footer list.
          const top = parent.getBoundingClientRect().top;
          const score = group.length * 1000 - top;
          if (!best || score > best.score) best = { parent, group, score, top };
        }
        if (best && best.group.length >= 2) {
          const last = best.group[best.group.length - 1];
          return { el: last, how: `after the last of ${best.group.length} nav links`, mode: 'after' };
        }
        if (best) return { el: best.group[0], how: 'after the only nav link found', mode: 'after' };
      }

      for (const a of document.querySelectorAll('header a, nav a')) {
        if (a.textContent.trim().toLowerCase() === 'game log') {
          return { el: a, how: 'after a link labelled Game Log', mode: 'after' };
        }
      }
      const bar = document.querySelector('header, nav');
      if (bar) return { el: bar, how: 'appended to the nav bar', mode: 'append' };
      return null;
    }


    let anchorHow = null;
    // REPORTED BUG, fixed here: `document.body.contains(coreUi.group)` is
    // true whether the group is properly anchored in the nav OR merely
    // floating (the fallback is also appended to document.body) — so the
    // old guard made the FIRST float permanent, skipping every later retry
    // even though the whole point of the floating fallback is "the observer
    // will move it into the bar the moment one appears" (see the comment
    // where floating is set, below). A floating group must keep retrying;
    // only a genuinely anchored one is done.
    function anchorGroup() {
      if (!coreUi || !document.body) return;
      const isFloating = coreUi.group.classList.contains('apoz-core-floating');
      if (document.body.contains(coreUi.group) && !isFloating) return;
      const found = findAnchor();
      if (found) {
        if (found.mode === 'append') found.el.appendChild(coreUi.group);
        else found.el.insertAdjacentElement('afterend', coreUi.group);
        coreUi.group.classList.remove('apoz-core-floating');
      } else {
        // LAST RESORT, and the whole point of this function: float it. The nav
        // may not have rendered yet, or may have changed shape entirely. Either
        // way the menu stays reachable, and the observer will move it into the
        // bar the moment one appears.
        document.body.appendChild(coreUi.group);
        coreUi.group.classList.add('apoz-core-floating');
      }
      const how = found ? found.how : 'floating (no nav bar found)';
      if (how !== anchorHow) {
        anchorHow = how;
        console.info(`[ApozCore] menu anchored: ${how}`);
      }
    }

    // ---- window manager (v6) — shared draggable/resizable panel chrome ----
    //
    // Generalised from eta-tracker's hand-rolled panel/drag/style code (the
    // first module), not invented ahead of a second one. Every module's
    // window is built from this, so INSTRUMENTATION.md's S3/S17 drag-listener
    // fix and the viewport-clamping guarantee above get fixed exactly once,
    // for every present and future module, instead of re-derived per module.
    const windowRegistry = {}; // id -> { reclamp() }, so a viewport resize can sweep every open window
    const WINDOW_GEOMETRY_PREFIX = 'apoz:windowGeometry:';

    // ALL FOUR fields are checked, not just `x`. A blob missing w/h — an older
    // format, a hand-edited key, a half-written value — used to pass the `x`
    // test and then flow into `Math.max(undefined, minW)` => NaN =>
    // `style.width = "NaNpx"`, which CSS silently discards, leaving a window
    // sized by its content with no explanation anywhere. Non-finite is treated
    // as "nothing saved" so the caller falls back to computeDefaultRect().
    function loadWindowGeometry(id) {
      try {
        const raw = localStorage.getItem(WINDOW_GEOMETRY_PREFIX + id);
        const parsed = raw ? JSON.parse(raw) : null;
        if (!parsed) return null;
        const ok = ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(parsed[k]));
        return ok ? { x: parsed.x, y: parsed.y, w: parsed.w, h: parsed.h } : null;
      } catch (e) { return null; }
    }
    function saveWindowGeometry(id, rect) {
      try { localStorage.setItem(WINDOW_GEOMETRY_PREFIX + id, JSON.stringify(rect)); } catch (e) { /* ignore */ }
    }

    let windowStyleInjected = false;
    function injectWindowStyleOnce() {
      applyThemeMode(); // may run before buildUi() — createWindow is often called before registerModule
      if (windowStyleInjected || document.getElementById('apoz-window-style')) { windowStyleInjected = true; return; }
      windowStyleInjected = true;
      const style = document.createElement('style');
      style.id = 'apoz-window-style';
      style.textContent = `
        .apoz-window { position: fixed; z-index: 999997; display: flex; flex-direction: column;
          background: var(--apoz-card); color: var(--apoz-popover-foreground); border: 1px solid var(--apoz-border);
          border-radius: 8px; box-shadow: 0 12px 32px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.04);
          font: 12px ${CORE_FONT}; overflow: hidden; }
        .apoz-window[hidden] { display: none; }
        .apoz-window[data-resizable="true"] { resize: both; min-width: 260px; min-height: 160px; }
        .apoz-window-header { display: flex; align-items: center; gap: 6px; padding: 7px 9px;
          background: color-mix(in srgb, var(--apoz-card) 88%, #000); border-bottom: 1px solid var(--apoz-border);
          cursor: move; user-select: none; flex: none; }
        .apoz-window-title { font-weight: 600; font-size: 12px; flex: 1; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap; }
        .apoz-window-close { background: none; border: none; color: inherit; opacity: .6; cursor: pointer;
          font-size: 16px; line-height: 1; padding: 0 3px; }
        .apoz-window-close:hover { opacity: 1; }
        .apoz-window-body { flex: 1; overflow: auto; padding: 10px 11px;
          display: flex; flex-direction: column; gap: 10px; }
        .apoz-ui-input-row { display: grid; grid-template-columns: minmax(88px,1fr) minmax(0,1.5fr);
          align-items: center; gap: 8px; margin: 5px 0; }
        .apoz-ui-input-row label { display: flex; align-items: center; gap: 4px; font-size: 11.5px; opacity: .85; }
        .apoz-ui-input-row input, .apoz-ui-input-row select { font: inherit; font-size: 12px;
          background: var(--apoz-input); color: var(--apoz-foreground); border: 1px solid var(--apoz-border);
          border-radius: 4px; padding: 3px 6px; width: 100%; box-sizing: border-box; }
        .apoz-ui-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
        .apoz-ui-table th { text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase;
          letter-spacing: .03em; opacity: .55; padding: 4px 6px; border-bottom: 1px solid var(--apoz-border);
          white-space: nowrap; }
        .apoz-ui-table td { padding: 5px 6px; vertical-align: middle;
          border-bottom: 1px solid color-mix(in srgb, var(--apoz-border) 60%, transparent); }
        .apoz-ui-table tr:hover td { background: var(--apoz-input); }
        .apoz-ui-actions { display: flex; gap: 4px; white-space: nowrap; }
        .apoz-ui-btn { background: var(--apoz-input); border: 1px solid var(--apoz-border); border-radius: 4px;
          color: var(--apoz-foreground); font: inherit; font-size: 11px; padding: 3px 8px; cursor: pointer; }
        .apoz-ui-btn:hover { background: var(--apoz-popover); }
        .apoz-ui-btn-danger { color: #e0483e; border-color: color-mix(in srgb, #e0483e 55%, var(--apoz-border)); }
        .apoz-ui-btn-primary { background: var(--apoz-primary); color: var(--apoz-primary-foreground);
          border: 1px solid var(--apoz-primary); font-weight: 600; }
        .apoz-ui-btn-primary:hover { filter: brightness(1.08); }
        .apoz-ui-btn-primary:disabled { opacity: .5; cursor: not-allowed; filter: none; }
        /* Square icon-only button — a table row's rightmost action (share/
           export), or anywhere a full-width labelled button would be too
           heavy next to compact table text. */
        .apoz-ui-icon-btn { background: var(--apoz-input); border: 1px solid var(--apoz-border);
          border-radius: 4px; color: var(--apoz-foreground); width: 24px; height: 24px; padding: 0;
          display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex: none; }
        .apoz-ui-icon-btn svg { width: 13px; height: 13px; display: block; }
        .apoz-ui-icon-btn:hover { background: var(--apoz-popover); }
        /* A small anchored menu (share/export options) — position is set
           inline per-open via getBoundingClientRect, same anchoring approach
           as the main dropdown, just for a two-or-three-item list instead of
           the whole Core menu. */
        .apoz-ui-menu { position: fixed; z-index: 1000050; background: var(--apoz-solid-card);
          color: var(--apoz-solid-popover-foreground); border: 1px solid var(--apoz-solid-border);
          border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.45); padding: 4px; min-width: 170px;
          font: 12px ${CORE_FONT}; }
        .apoz-ui-menu-item { display: block; width: 100%; text-align: left; background: none; border: none;
          color: inherit; font: inherit; font-size: 11.5px; padding: 6px 8px; border-radius: 4px; cursor: pointer; }
        .apoz-ui-menu-item:hover { background: var(--apoz-input); }
        .apoz-ui-modal-overlay { position: fixed; inset: 0; z-index: 1000001; background: rgba(0,0,0,.45);
          display: flex; align-items: center; justify-content: center; font: 12px ${CORE_FONT}; }
        .apoz-ui-modal { background: var(--apoz-card); color: var(--apoz-popover-foreground);
          border: 1px solid var(--apoz-border); border-radius: 8px; box-shadow: 0 16px 48px rgba(0,0,0,.5);
          padding: 16px; max-width: 360px; }
        .apoz-ui-modal-title { font-weight: 700; font-size: 13px; margin-bottom: 8px; }
        .apoz-ui-modal-msg { opacity: .85; line-height: 1.4; margin-bottom: 14px; white-space: pre-wrap; }
        .apoz-ui-modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
        .apoz-ui-group { border: 1px solid var(--apoz-border); border-radius: 6px; padding: 8px 10px; }
      `;
      document.head.appendChild(style);
    }

    // mousedown on the header -> mousemove/mouseup on document AND blur on
    // window (S17: releasing outside the window never delivers a mouseup to
    // document, but blur always fires) -> live-clamp on every mousemove, not
    // only on drop, which is what actually stops a window from ever becoming
    // unreachable rather than merely correcting it after the fact.
    function attachDrag(headerEl, panelEl, onSettle) {
      let startX, startY, startLeft, startTop;
      function onMove(e) {
        const w = panelEl.offsetWidth, h = panelEl.offsetHeight;
        const rect = clampRectToViewport(
          { x: startLeft + (e.clientX - startX), y: startTop + (e.clientY - startY), w, h },
          viewportRect(), { minVisible: 72, margin: 4 },
        );
        panelEl.style.left = rect.x + 'px';
        panelEl.style.top = rect.y + 'px';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        window.removeEventListener('blur', onUp);
        if (onSettle) onSettle();
      }
      headerEl.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || e.target.closest('button')) return;
        startX = e.clientX; startY = e.clientY;
        const r = panelEl.getBoundingClientRect();
        startLeft = r.left; startTop = r.top;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        window.addEventListener('blur', onUp);
        e.preventDefault();
      });
    }

    // Core.createWindow(spec) -> handle. Every module's panel is one of these;
    // there is no module-local panel/drag/style code left to write.
    // Regular windows share one incrementing z-index band so clicking one
    // brings it above its siblings; spec.alwaysOnTop windows (a small
    // import/export-style dialog opened over a module's main window, say)
    // live in a permanently higher band instead of merely a higher CURRENT
    // value, so a later click on a regular window can never climb above one.
    let topZIndex = 999997;
    let topZIndexOnTop = 1000100;
    function bringToFront(el, alwaysOnTop) {
      if (alwaysOnTop) { topZIndexOnTop += 1; el.style.zIndex = String(topZIndexOnTop); }
      else { topZIndex += 1; el.style.zIndex = String(topZIndex); }
    }

    function applyMaxSize(el, opts) {
      const vp = viewportRect();
      const margin = 8;
      const mode = (opts && opts.resizable) || 'none';
      if (mode === 'both' || mode === 'vertical') el.style.maxHeight = Math.max(160, vp.h - margin * 2) + 'px';
      if (mode === 'both' || mode === 'horizontal') el.style.maxWidth = Math.max(260, vp.w - margin * 2) + 'px';
    }

    function createWindow(spec) {
      if (!spec || !spec.id) { console.error('[ApozCore] createWindow needs { id }'); return null; }
      injectWindowStyleOnce();
      const el = document.createElement('div');
      el.className = 'apoz-window';
      el.id = 'apoz-window-' + spec.id;
      el.hidden = true;
      // resizable: false/undefined (none) | true (both) | 'vertical' | 'horizontal'.
      // A table-heavy window wants vertical-only — more rows, not a wider
      // window than its content needs — capped so it can never be dragged
      // taller than the viewport itself (applyMaxSize, kept current by the
      // shared resize listener alongside the position reclamp).
      //
      // This is the window's OWN intended mode, from its spec — separate from
      // whether resizing is currently allowed at all (the windowResizingEnabled
      // setting, applyResizability below), so a global off/on doesn't have to
      // know or guess what each window would otherwise have supported.
      const specResizeMode = spec.resizable === true ? 'both' : (spec.resizable || 'none');
      function effectiveResizeMode() {
        return getSetting('windowResizingEnabled') ? specResizeMode : 'none';
      }
      function applyResizability() {
        const mode = effectiveResizeMode();
        el.dataset.resizable = mode !== 'none' ? 'true' : 'false';
        el.style.resize = mode;
      }
      applyResizability();
      applyMaxSize(el, { resizable: specResizeMode });
      bringToFront(el, spec.alwaysOnTop);

      const header = document.createElement('div');
      header.className = 'apoz-window-header';
      const title = document.createElement('span');
      title.className = 'apoz-window-title';
      title.textContent = spec.title || spec.id;
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'apoz-window-close';
      closeBtn.textContent = '×';
      closeBtn.title = 'Close';
      header.appendChild(title);
      header.appendChild(closeBtn);

      const body = document.createElement('div');
      body.className = 'apoz-window-body';
      el.appendChild(header);
      el.appendChild(body);
      document.body.appendChild(el);

      const persist = spec.persistGeometry !== false;
      const minW = (spec.minSize && spec.minSize.w) || 360;
      const minH = (spec.minSize && spec.minSize.h) || 240;

      function computeDefaultRect() {
        if (spec.defaultRect && spec.defaultRect !== 'auto') return spec.defaultRect;
        const vp = viewportRect();
        const w = Math.min(minW, vp.w - 32);
        const h = Math.min(minH, vp.h - 32);
        return { x: Math.round((vp.w - w) / 2), y: Math.round((vp.h - h) / 3), w, h };
      }
      function applyRect(rect) {
        el.style.left = rect.x + 'px';
        el.style.top = rect.y + 'px';
        // Width/height are always set from the default/persisted rect, resizable
        // or not — a non-resizable window still needs a DEFINED size (previously
        // it had none at all and just shrank/grew to fit content, which is how
        // the Settings window ended up with no real control over its own
        // height). The CSS `resize` handle, when present, still lets a
        // resizable window's box grow past this starting point by dragging.
        el.style.height = rect.h + 'px';
        el.style.width = rect.w + 'px';
      }
      function currentRect() {
        return {
          x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0,
          w: el.offsetWidth, h: el.offsetHeight,
        };
      }
      // The detached check is not defensive noise: a destroyed window's pending
      // resize debounce used to fire 300ms later against an element already out
      // of the document, where offsetWidth/offsetHeight are both 0 — persisting
      // a 0x0 rect over a perfectly good saved one. (The minSize floor on the
      // next open hid the damage; the saved size was still lost.)
      function persistNow() {
        if (!persist || !el.isConnected) return;
        saveWindowGeometry(spec.id, currentRect());
      }

      let rect = (persist && loadWindowGeometry(spec.id)) || computeDefaultRect();
      // REPORTED BUG: windows "start very small and always have to be
      // expanded." A persisted rect is trusted verbatim once saved — if it
      // predates a later minSize increase, or the user (or a stray drag)
      // shrank it below minSize, nothing ever floors it back up. Every open
      // must honor the CURRENT minSize, not whatever happened to get saved.
      rect = { ...rect, w: Math.max(rect.w, minW), h: Math.max(rect.h, minH) };
      rect = clampRectToViewport(rect, viewportRect(), { minVisible: 72, margin: 4 });
      applyRect(rect);

      attachDrag(header, el, persistNow);
      // Click-to-focus: any interaction with an already-open window brings
      // it above its siblings, not just the moment it first opens.
      el.addEventListener('mousedown', () => bringToFront(el, spec.alwaysOnTop));

      // EVERY window owns a scope (v10). Before this, teardown was a list of
      // things destroy() had to remember, and it had already forgotten two of
      // them — the ResizeObserver and its in-flight debounce, which then fired
      // against a detached element and persisted a 0x0 rect over a good one.
      // Now destroy() disposes a scope and the list maintains itself: anything
      // registered here is released, including by code added later that never
      // reads destroy().
      const winScope = coreScope.child(`window:${spec.id}`);

      if (specResizeMode !== 'none') {
        winScope.resize(el, () => {
          clearTimeout(el._apozResizeTimer);
          el._apozResizeTimer = setTimeout(persistNow, 300); // same 300ms debounce eta-tracker already used
        });
        winScope.add(() => clearTimeout(el._apozResizeTimer));
      }

      // Two DIFFERENT reset strengths, deliberately not one — the main
      // dropdown's reset button is meant for "I dragged this off-screen,
      // just get it back" (position only, keep whatever size I set), while
      // Settings' "Reset window sizes" is the deliberate, occasional full
      // reset (position AND size, every window). Before this they were the
      // same operation reachable from two places, which is a real overlap:
      // one of them was surprising the other by quietly resetting size too.
      function resetPositionOnly() {
        applyMaxSize(el, { resizable: specResizeMode });
        const current = currentRect();
        const def = computeDefaultRect();
        const rect = { x: def.x, y: def.y, w: current.w, h: current.h };
        applyRect(clampRectToViewport(rect, viewportRect(), { minVisible: 72, margin: 4 }));
        persistNow();
      }
      function resetFull() {
        applyMaxSize(el, { resizable: specResizeMode });
        applyRect(clampRectToViewport(computeDefaultRect(), viewportRect(), { minVisible: 72, margin: 4 }));
        persistNow();
      }

      windowRegistry[spec.id] = {
        reclamp() {
          if (el.hidden) return; // a hidden window has nothing on-screen to reclamp
          applyMaxSize(el, { resizable: specResizeMode });
          applyRect(clampRectToViewport(currentRect(), viewportRect(), { minVisible: 72, margin: 4 }));
        },
        // Called when the windowResizingEnabled setting flips, so every
        // already-open window picks up the change immediately rather than
        // only on its next fresh open.
        applyResizability,
        // Exposed so Settings' "Reset window sizes" can reach EVERY
        // registered window directly, whether or not its module is
        // currently enabled/open and without depending on that module having
        // wired up onResetPosition correctly.
        resetFull,
      };

      const handle = {
        el,
        open() { el.hidden = false; bringToFront(el, spec.alwaysOnTop); },
        // Plain hide — no side effects, so a module can call this from its
        // OWN close logic (e.g. togglePanel(false)) without ever recursing
        // back into itself through onClose.
        close() { el.hidden = true; },
        toggle() { el.hidden = !el.hidden; return !el.hidden; },
        setContent(node) { body.innerHTML = ''; body.appendChild(node); },
        // Two lines, and it stays two lines however much this window grows —
        // that is the whole point of the scope. The registry entry is explicit
        // because it is not a subscription, it is a shared map the resize
        // sweep reads.
        destroy() {
          delete windowRegistry[spec.id];
          winScope.dispose();
          el.remove();
        },
        // Exposed so a module can attach its OWN listeners to this window's
        // lifetime rather than to its own — a panel's controls should die with
        // the panel, not with the module.
        scope: winScope,
        // Recovers a lost window regardless of the CURRENT viewport size —
        // the whole point of a reset button is that it must not depend on the
        // thing that got the window lost in the first place. POSITION only —
        // see resetFull() for the size-included version.
        resetPosition: resetPositionOnly,
        resetFull,
      };
      // A module supplying onClose owns what "close" means (e.g. it may also
      // need to update its own open/closed state or persist something) — the
      // X button defers to it rather than hiding unconditionally, so there is
      // exactly one code path for closing, not two that can drift apart.
      closeBtn.addEventListener('click', () => { if (spec.onClose) spec.onClose(); else handle.close(); });
      if (spec.content) handle.setContent(spec.content);
      return handle;
    }

    // Core.ui.* — small reusable builders, not a component library. Every
    // module reaches for these instead of hand-rolling its own table/modal/
    // tooltip, which is what made three modules' worth of fonts/spacing drift
    // apart before there was a second module to notice it.

    // At most one anchored ui.menu is open at a time, and this is the handle
    // that can actually tear the open one down (see ui.menu below).
    let activeMenu = null;
    const ui = {
      // Generalises the existing dropdown info-icon (buildUi()'s
      // .apoz-core-info-icon) into something any module can use, rather than
      // duplicating the same hover-tooltip markup a second time.
      infoIcon(text) {
        const span = document.createElement('span');
        span.className = 'apoz-core-info-icon';
        span.setAttribute('data-tooltip', text);
        span.setAttribute('data-tooltip-wide', '');
        span.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">'
          + '<circle cx="8" cy="8" r="6.3"/><line x1="8" y1="7.2" x2="8" y2="11.3" stroke-linecap="round"/>'
          + '<circle cx="8" cy="4.9" r="0.9" fill="currentColor" stroke="none"/></svg>';
        return span;
      },
      // Replaces native confirm()/alert() — a blocking native dialog was an
      // explicit complaint about the tool this module was compared against.
      confirmDialog(opts) {
        opts = opts || {};
        injectWindowStyleOnce();
        return new Promise((resolve) => {
          const overlay = document.createElement('div');
          overlay.className = 'apoz-ui-modal-overlay';
          const modal = document.createElement('div');
          modal.className = 'apoz-ui-modal';
          const title = document.createElement('div');
          title.className = 'apoz-ui-modal-title';
          title.textContent = opts.title || 'Confirm';
          const msg = document.createElement('div');
          msg.className = 'apoz-ui-modal-msg';
          msg.textContent = opts.message || '';
          const actions = document.createElement('div');
          actions.className = 'apoz-ui-modal-actions';
          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button'; cancelBtn.className = 'apoz-ui-btn'; cancelBtn.textContent = 'Cancel';
          const okBtn = document.createElement('button');
          okBtn.type = 'button';
          okBtn.className = 'apoz-ui-btn' + (opts.danger ? ' apoz-ui-btn-danger' : '');
          okBtn.textContent = opts.confirmLabel || 'Confirm';
          function finish(v) {
            overlay.remove();
            document.removeEventListener('keydown', onKey, true);
            resolve(v);
          }
          function onKey(e) { if (e.key === 'Escape') finish(false); }
          cancelBtn.addEventListener('click', () => finish(false));
          okBtn.addEventListener('click', () => finish(true));
          overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });
          document.addEventListener('keydown', onKey, true);
          actions.appendChild(cancelBtn); actions.appendChild(okBtn);
          modal.appendChild(title); modal.appendChild(msg); modal.appendChild(actions);
          overlay.appendChild(modal);
          document.body.appendChild(overlay);
          okBtn.focus();
        });
      },
      // {columns:[{key,label,info?,render?(row)}], rows:[...], rowActions?:[{label,onClick(row),danger?}]}
      table(spec) {
        injectWindowStyleOnce();
        const table = document.createElement('table');
        table.className = 'apoz-ui-table';
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        for (const col of spec.columns) {
          const th = document.createElement('th');
          th.textContent = col.label;
          if (col.info) th.appendChild(ui.infoIcon(col.info));
          headRow.appendChild(th);
        }
        if (spec.rowActions) headRow.appendChild(document.createElement('th'));
        thead.appendChild(headRow);
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        for (const row of spec.rows) {
          const tr = document.createElement('tr');
          for (const col of spec.columns) {
            const td = document.createElement('td');
            const v = typeof col.render === 'function' ? col.render(row) : row[col.key];
            if (v instanceof Node) td.appendChild(v); else td.textContent = v == null ? '' : String(v);
            tr.appendChild(td);
          }
          if (spec.rowActions) {
            const td = document.createElement('td');
            td.className = 'apoz-ui-actions';
            for (const action of spec.rowActions) {
              // An escape hatch for an action that isn't a plain labelled
              // button — an icon button opening its own small menu, say.
              // Keeps that kind of one-off row control out of this shared
              // component instead of growing a second mini-API here for it.
              if (typeof action.render === 'function') { td.appendChild(action.render(row)); continue; }
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'apoz-ui-btn' + (action.danger ? ' apoz-ui-btn-danger' : '') + (action.primary ? ' apoz-ui-btn-primary' : '');
              // label may be a function of the row (e.g. "Archive"/"Unarchive"
              // depending on that row's own state) — a static string is the
              // common case and works unchanged.
              btn.textContent = typeof action.label === 'function' ? action.label(row) : action.label;
              btn.addEventListener('click', () => action.onClick(row));
              td.appendChild(btn);
            }
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        return table;
      },
      // A small anchored dropdown — icon-button-opens-a-menu, not the whole
      // Core dropdown. items: [{label, onClick(), danger?}]. Opens BELOW the
      // anchor, flips ABOVE if there's no room, exactly the same two-step
      // clamp logic already proven for the main Core dropdown
      // (positionDropdownNearAnchor) rather than a second one invented here.
      menu(anchorEl, items) {
        injectWindowStyleOnce();
        // CLOSE the previous menu, don't just delete its element. Removing the
        // node left its capture-phase document `mousedown` listener attached
        // forever, holding a closure over a detached element and running
        // el.contains() on every mousedown on the page for the rest of the
        // session — one more each time a menu was opened. INSTRUMENTATION.md
        // §4.4: "no document-level listener outlives the interaction that
        // needed it." A DOM id cannot carry a teardown function, so the live
        // handle is tracked here instead of re-found from the document.
        if (activeMenu) activeMenu.close();
        const el = document.createElement('div');
        el.className = 'apoz-ui-menu';
        el.id = 'apoz-ui-menu-active';
        for (const item of items) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'apoz-ui-menu-item';
          if (item.danger) btn.style.color = '#e0483e';
          btn.textContent = item.label;
          btn.addEventListener('click', (e) => { e.stopPropagation(); close(); item.onClick(); });
          el.appendChild(btn);
        }
        document.body.appendChild(el);
        const anchor = anchorEl.getBoundingClientRect();
        el.style.visibility = 'hidden';
        const size = { w: el.offsetWidth || 170, h: el.offsetHeight || 80 };
        const rect = positionDropdownNearAnchor(anchor, size, viewportRect(), 6);
        el.style.left = rect.x + 'px';
        el.style.top = rect.y + 'px';
        el.style.visibility = '';
        // A menu's whole lifetime in one object (v10). The pending arm-timeout
        // and the document listener are both registered here, so `close()` is
        // one call and cannot half-tear-down — which is exactly how the
        // original leak happened: the element was removed and the listener was
        // not, because they were released in two different places.
        const menuScope = coreScope.child('ui-menu');
        function close() {
          if (activeMenu === handle) activeMenu = null;
          menuScope.dispose();
          el.remove();
        }
        function onOutside(e) { if (!el.contains(e.target) && e.target !== anchorEl) close(); }
        // Captured, not bubbled — the anchor button's own click handler
        // (which opened this) fires on mouseup/click, after mousedown, so a
        // capture-phase listener here can never close a menu the very click
        // that opened it. Registered from inside the timeout so that a menu
        // closed within the same tick never attaches one at all.
        menuScope.timeout(() => menuScope.on(document, 'mousedown', onOutside, true), 0);
        const handle = { close, scope: menuScope };
        activeMenu = handle;
        return handle;
      },
      // ---- the write path (v10) ----
      //
      // Every module's DOM writes go through `write`, so N modules cost one
      // layout per frame instead of N. `dom.*` compare before writing, so an
      // unchanged value costs nothing at all. See the scheduler's own header
      // for the three rules and why "hidden" holds rather than drops.
      write(key, fn) { scheduler.write(key, fn); },
      flushWrites() { scheduler.flushNow(); },
      get writeStats() { return scheduler.stats; },
      dom: domWrite,
      // {label, type?, value?, options?:[{value,label}], onChange?(value), info?} -> row element,
      // with row._input left as an escape hatch for a caller that needs to read/focus it later.
      inputRow(spec) {
        injectWindowStyleOnce();
        const row = document.createElement('div');
        row.className = 'apoz-ui-input-row';
        const label = document.createElement('label');
        label.textContent = spec.label;
        if (spec.info) label.appendChild(ui.infoIcon(spec.info));
        const input = document.createElement(spec.type === 'select' ? 'select' : 'input');
        if (spec.type && spec.type !== 'select') input.type = spec.type;
        if (spec.type === 'select' && spec.options) {
          for (const opt of spec.options) {
            const o = document.createElement('option');
            o.value = opt.value; o.textContent = opt.label;
            input.appendChild(o);
          }
        }
        if (spec.value !== undefined) input.value = spec.value;
        if (spec.onChange) input.addEventListener('input', () => spec.onChange(input.value));
        row.appendChild(label);
        row.appendChild(input);
        row._input = input;
        return row;
      },
    };

    function buildUi() {
      applyThemeMode(); // sets --apoz-* on :root before anything below references them
      const STYLE_ID = 'apoz-core-style';
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        /* Flat, not a raised gradient — closer to the game's own flat control
           style — and shorter (20px) to sit comfortably in the nav's own
           row height instead of setting it. */
        #apoz-core-group { display: inline-flex; align-items: stretch; vertical-align: middle;
          border-radius: 5px; overflow: hidden; font-family: ${CORE_FONT}; line-height: 1;
          height: 20px; align-self: center; margin: 0 4px;
          border: 1px solid var(--apoz-border); background: var(--apoz-card); }
        #apoz-core-group:hover { border-color: var(--apoz-primary); }
        #apoz-core-group:active { box-shadow: inset 0 1px 2px rgba(0,0,0,.3); }
        /* Only when no nav bar could be found - see anchorGroup(). */
        #apoz-core-group.apoz-core-floating { position: fixed; top: 8px; right: 8px; z-index: 999998;
          background: var(--apoz-card); box-shadow: 0 4px 16px rgba(0,0,0,.4); }
        #apoz-core-btn { background: transparent; color: var(--apoz-primary); border: none;
          font-weight: 600; letter-spacing: .01em; padding: 0 8px; cursor: pointer; font-size: 11px;
          height: 100%; -webkit-font-smoothing: antialiased; }
        #apoz-core-btn:hover { background: var(--apoz-input); }
        #apoz-core-quick-row { display: flex; }
        .apoz-core-quick-btn { background: none; border: none; border-left: 1px solid var(--apoz-border);
          color: var(--apoz-foreground); opacity: .45; padding: 0 7px; cursor: pointer; font-size: 11px;
          height: 100%; font-weight: 500; position: relative; -webkit-font-smoothing: antialiased;
          transition: opacity .1s ease, color .1s ease; }
        .apoz-core-quick-btn:hover { opacity: .85; background: var(--apoz-input); }
        /* REVISED (was an underline via inset box-shadow): reads as an on/off
           LIGHT rather than a decoration — closed sits dim/greyed among its
           siblings, open reads brighter/whiter, exactly the "which of these
           do I have open right now" scan a busy row of several buttons needs,
           without adding a filled background per-button (that got busy fast
           with more than one or two open). */
        .apoz-core-quick-btn-open { opacity: 1; color: var(--apoz-popover-foreground, #fff); font-weight: 700; }
        .apoz-core-quick-btn-open:hover { opacity: 1; }
        @keyframes apoz-core-blink { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
        .apoz-core-quick-badge::after { content: ''; position: absolute; top: 1px; right: 1px;
          width: 5px; height: 5px; border-radius: 50%; background: #e0483e;
          animation: apoz-core-blink 1.1s ease-in-out infinite; }
        #apoz-core-dropdown { position: fixed; z-index: 999999; background: var(--apoz-card);
          color: var(--apoz-popover-foreground); border: 2px solid var(--apoz-border); border-radius: 6px;
          min-width: 220px; box-shadow: 0 8px 24px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.04);
          padding: 4px; font: 12px ${CORE_FONT}; }
        /* Tighter than before (was taking too much visual space for what it
           says) with more separation FROM its neighbours instead, via the
           section's own top margin rather than internal padding. */
        .apoz-core-section-label { font-size: 9px; text-transform: uppercase; opacity: .45;
          letter-spacing: .05em; padding: 2px 6px; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
        .apoz-core-section-label:first-child { margin-top: 0; }
        .apoz-core-info-icon { display: inline-flex; align-items: center; opacity: .8; cursor: help;
          position: relative; text-transform: none; letter-spacing: normal; }
        .apoz-core-info-icon svg { width: 11px; height: 11px; display: block; }
        /* GENERALIZED (was scoped to .apoz-core-info-icon only): "all buttons
           need hover-over info, especially condensed text or icons" — any
           element carrying data-tooltip gets the same styled bubble now,
           not just the dedicated info-icon SVG. Kept off native title attrs
           on these deliberately: two overlapping tooltips (one native, one
           custom) is worse than one. */
        [data-tooltip] { position: relative; }
        [data-tooltip]::after { content: attr(data-tooltip); position: absolute;
          top: 130%; left: 0; background: var(--apoz-solid-card); color: var(--apoz-solid-popover-foreground);
          border: 1px solid var(--apoz-solid-border); border-radius: 4px; padding: 5px 7px; font-size: 10px;
          line-height: 1.35; width: 200px; white-space: normal; opacity: 0; pointer-events: none;
          transition: opacity .08s ease .05s; box-shadow: 0 4px 12px rgba(0,0,0,.5); z-index: 1000002; }
        [data-tooltip][data-tooltip-wide]::after { width: 230px; }
        [data-tooltip][data-tooltip-right]::after { left: auto; right: 0; }
        [data-tooltip]:hover::after { opacity: 1; }
        .apoz-core-separator { height: 1px; background: var(--apoz-border); margin: 6px 2px; }
        .apoz-core-row { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 5px;
          cursor: pointer; }
        .apoz-core-row:hover { background: var(--apoz-input); }
        .apoz-core-row-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: #e0483e; }
        .apoz-core-row-enabled .apoz-core-row-dot { background: #3ecf6a; }
        .apoz-core-row-enabled { font-weight: 600; }
        .apoz-core-row-ver { margin-left: 6px; font-size: 9px; opacity: .45; font-weight: 400; }
        .apoz-core-row:not(.apoz-core-row-enabled) { opacity: .55; }
        /* Revealed on hover only — a row you're not looking at shouldn't
           carry an extra button's worth of visual noise. */
        .apoz-core-row-update-btn { display: none; margin-left: auto; background: var(--apoz-primary);
          color: var(--apoz-primary-foreground); border: none; border-radius: 4px; font: inherit;
          font-size: 9px; font-weight: 600; padding: 2px 6px; cursor: pointer; flex: none; }
        .apoz-core-row:hover .apoz-core-row-update-btn { display: inline-block; }
        .apoz-core-row-update-btn:hover { filter: brightness(1.1); }
        .apoz-core-modules-head { display: flex; align-items: center; justify-content: space-between; }
        .apoz-core-subtle-icon-btn { background: none; border: none; color: var(--apoz-foreground);
          opacity: .4; cursor: pointer; font-size: 11px; padding: 2px 4px; border-radius: 3px;
          display: inline-flex; align-items: center; }
        .apoz-core-subtle-icon-btn:hover { opacity: .9; background: var(--apoz-input); }
        .apoz-core-subtle-icon-btn svg { width: 12px; height: 12px; display: block; }
        .apoz-core-bottom-icons { display: flex; justify-content: flex-end; gap: 4px; padding: 4px 4px 2px; }
        .apoz-core-icon-btn { background: var(--apoz-input); border: 1px solid var(--apoz-border); border-radius: 4px;
          color: var(--apoz-foreground); font-size: 12px; padding: 4px 8px; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; }
        .apoz-core-icon-btn svg { width: 13px; height: 13px; display: block; }
        .apoz-core-icon-btn:hover { background: var(--apoz-popover); }
        .apoz-core-icon-btn:disabled { opacity: .4; cursor: not-allowed; }
        .apoz-core-version-row { display: flex; align-items: center; justify-content: space-between;
          padding: 2px 8px 4px; font-size: 9px; opacity: .55; }
        .apoz-core-self-update-btn { background: none; border: none; color: var(--apoz-primary);
          font: inherit; font-size: 9px; font-weight: 700; cursor: pointer; padding: 0; }
        .apoz-core-self-update-btn:hover { text-decoration: underline; }
        #apoz-core-toasts { position: fixed; right: 14px; bottom: 14px; z-index: 1000000;
          display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
          pointer-events: none; font: 12px ${CORE_FONT}; }
        .apoz-core-toast { pointer-events: auto; display: flex; align-items: center; gap: 8px;
          max-width: 320px; background: var(--apoz-card); color: var(--apoz-popover-foreground);
          border: 1px solid var(--apoz-border); border-left-width: 3px; border-radius: 6px;
          padding: 8px 10px; box-shadow: 0 8px 24px rgba(0,0,0,.45);
          opacity: 0; transform: translateY(6px); transition: opacity .18s, transform .18s; }
        .apoz-core-toast.apoz-core-toast-in { opacity: 1; transform: none; }
        .apoz-core-toast-info { border-left-color: var(--apoz-primary); }
        .apoz-core-toast-success { border-left-color: #3ecf6a; }
        .apoz-core-toast-warn { border-left-color: #e0a23e; }
        .apoz-core-toast-error { border-left-color: #e0483e; }
        .apoz-core-toast-msg { flex: 1; line-height: 1.35; }
        .apoz-core-toast-action { background: var(--apoz-primary); color: var(--apoz-primary-foreground);
          border: none; border-radius: 4px; font: inherit; font-size: 11px; font-weight: 600;
          padding: 3px 8px; cursor: pointer; flex: none; }
        .apoz-core-toast-close { background: none; border: none; color: inherit; opacity: .5;
          cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px; flex: none; }
        .apoz-core-toast-close:hover { opacity: 1; }
        @media (prefers-reduced-motion: reduce) {
          .apoz-core-toast { transition: none; }
        }
      `;
      // Injected once, keyed by id: during a Core update Tampermonkey can
      // briefly have two copies live, and two identical <style> blocks double
      // every rule that stacks (borders, padding) rather than replacing it.
      if (!document.getElementById(STYLE_ID)) document.head.appendChild(style);

      const group = document.createElement('div');
      group.id = 'apoz-core-group';
      const coreBtn = document.createElement('button');
      coreBtn.id = 'apoz-core-btn';
      coreBtn.type = 'button';
      coreBtn.textContent = 'Apoz Core ▾';
      const quickRow = document.createElement('div');
      quickRow.id = 'apoz-core-quick-row';
      group.appendChild(coreBtn);
      group.appendChild(quickRow);

      const dropdown = document.createElement('div');
      dropdown.id = 'apoz-core-dropdown';
      dropdown.style.display = 'none';
      dropdown.innerHTML = `
        <div class="apoz-core-modules-head">
          <div class="apoz-core-section-label">Modules<span class="apoz-core-info-icon"
            data-tooltip="ON/OFF lives here, and only here: disabling a module stops it running. The buttons in the top bar next to &quot;Apoz Core&quot; only SHOW or HIDE that module's window - a hidden module keeps running, keeps tracking and still rings its alarm."
            ><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6.3"/><line x1="8" y1="7.2" x2="8" y2="11.3" stroke-linecap="round"/><circle cx="8" cy="4.9" r="0.9" fill="currentColor" stroke="none"/></svg></span></div>
          <button class="apoz-core-subtle-icon-btn" type="button" id="apoz-core-disable-all" data-tooltip="Disable all modules" data-tooltip-right
            ><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="4" y="4" width="8" height="8" rx="1"/></svg></button>
        </div>
        <div id="apoz-core-module-rows"></div>
        <div id="apoz-core-tools-block" style="display:none">
          <div class="apoz-core-separator"></div>
          <div class="apoz-core-section-label">Tools<span class="apoz-core-info-icon"
            data-tooltip="Standalone calculators and references. These open in a new tab and have no on/off state - there is nothing running to disable."
            ><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6.3"/><line x1="8" y1="7.2" x2="8" y2="11.3" stroke-linecap="round"/><circle cx="8" cy="4.9" r="0.9" fill="currentColor" stroke="none"/></svg></span></div>
          <div id="apoz-core-tool-rows"></div>
        </div>
        <div class="apoz-core-separator"></div>
        <div class="apoz-core-bottom-icons">
          <button class="apoz-core-icon-btn" type="button" id="apoz-core-open-settings" data-tooltip="Settings">⚙</button>
          <button class="apoz-core-icon-btn" type="button" id="apoz-core-open-jobs" data-tooltip="Background jobs — progress and results from the local job host, if one is running. Set it up in Settings." data-tooltip-wide>⧗</button>
          <button class="apoz-core-icon-btn" type="button" id="apoz-core-check-updates" data-tooltip="Check for updates">⟳</button>
          <button class="apoz-core-icon-btn" type="button" id="apoz-core-reset-positions" data-tooltip="Reset window POSITIONS (not sizes) back on-screen — for a full reset including size, use Settings instead" data-tooltip-wide data-tooltip-right
            ><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 8A5 5 0 1 1 11.3 4.5"/><path d="M13 3.2v3.3h-3.3"/></svg></button>
        </div>
        <div class="apoz-core-version-row">
          <span id="apoz-core-self-update"></span>
          <span id="apoz-core-self-ver" style="margin-left:auto"></span>
        </div>
      `;
      document.body.appendChild(dropdown);
      const moduleRows = dropdown.querySelector('#apoz-core-module-rows');
      const toolRows = dropdown.querySelector('#apoz-core-tool-rows');
      const toolsBlock = dropdown.querySelector('#apoz-core-tools-block');
      const disableAllBtn = dropdown.querySelector('#apoz-core-disable-all');
      const resetPositionsBtn = dropdown.querySelector('#apoz-core-reset-positions');
      const openSettingsBtn = dropdown.querySelector('#apoz-core-open-settings');
      const checkUpdatesBtn = dropdown.querySelector('#apoz-core-check-updates');
      disableAllBtn.addEventListener('click', (e) => { e.stopPropagation(); disableAll(); });
      resetPositionsBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeDropdown();
        const ok = await ui.confirmDialog({
          title: 'Reset window positions',
          message: 'Moves every open window (and Settings) back on-screen at its default position. '
            + 'Sizes are left alone — for a full reset including size, use "Reset window sizes" in Settings instead.',
          confirmLabel: 'Reset positions',
        });
        if (ok) resetPositions();
      });
      openSettingsBtn.addEventListener('click', (e) => { e.stopPropagation(); closeDropdown(); openSettingsWindow(); });
      // Beside Settings rather than in the tools list: a tool row is labelled
      // "opens in a new tab" and this is an in-page window, so listing it there
      // would promise the wrong thing.
      dropdown.querySelector('#apoz-core-open-jobs')
        .addEventListener('click', (e) => { e.stopPropagation(); closeDropdown(); openJobsWindow(); });
      checkUpdatesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        checkForUpdates(true).then(() => {
          if (!updateState.available.length && !updateState.error) {
            toast('Everything is up to date.', { type: 'success', duration: 3000 });
          }
        });
      });

      // Number-format cycling moved into the Settings window (openSettingsWindow) —
      // it needs room to show the decimal/thousands separators and the
      // detected-vs-forced state clearly, which the compact dropdown doesn't have.

      // REPORTED BUG, fixed here rather than worked around: this used to place
      // the dropdown at coreBtn's left edge with no width check at all, so a
      // button sitting near the right edge of the viewport (the floating
      // fallback in particular — see .apoz-core-floating, top:8/right:8)
      // opened a menu that ran straight off the screen. positionDropdownNearAnchor
      // measures the button's LIVE rect and the menu's real size, then flips
      // alignment instead of overflowing.
      function computeDropdownRect() {
        const anchor = coreBtn.getBoundingClientRect();
        const wasHidden = dropdown.style.display === 'none';
        // Measure at natural size. If currently hidden, show off-screen-invisibly
        // just long enough to read real dimensions rather than a stale 0x0.
        if (wasHidden) { dropdown.style.visibility = 'hidden'; dropdown.style.display = 'block'; }
        const size = { w: dropdown.offsetWidth || 220, h: dropdown.offsetHeight || 200 };
        if (wasHidden) { dropdown.style.display = 'none'; dropdown.style.visibility = ''; }
        return positionDropdownNearAnchor(anchor, size, viewportRect(), 8);
      }
      function placeDropdown() {
        const rect = computeDropdownRect();
        dropdown.style.left = rect.x + 'px';
        dropdown.style.top = rect.y + 'px';
      }
      function openDropdown() {
        // Cheap and local: never show a row the user has already acted on.
        dropAlreadyInstalled();
        renderUpdateRow();
        placeDropdown();
        dropdown.style.display = 'block';
      }
      function closeDropdown() {
        dropdown.style.display = 'none';
      }
      // Exposed so the shared browser-resize listener (below) can keep an
      // OPEN dropdown correctly placed too — a resize while it's open is
      // exactly the moment the old bug would have shown up mid-session.
      function repositionDropdownIfOpen() {
        if (dropdown.style.display !== 'none') placeDropdown();
      }
      coreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropdown.style.display === 'none') openDropdown(); else closeDropdown();
      });
      document.addEventListener('click', (e) => {
        if (dropdown.style.display === 'none') return;
        if (dropdown.contains(e.target) || group.contains(e.target)) return;
        closeDropdown();
      });

      const selfVer = dropdown.querySelector('#apoz-core-self-ver');
      const selfUpdate = dropdown.querySelector('#apoz-core-self-update');
      coreUi = {
        group, coreBtn, quickRow, dropdown, moduleRows, toolRows, toolsBlock, selfVer, selfUpdate,
        // reachable from the shared browser-resize listener outside buildUi()'s closure
        repositionDropdownIfOpen,
      };
      if (selfVer) selfVer.textContent = 'Core v' + RELEASE.version;
      renderNumberFormatRow();
      renderUpdateRow();
      anchorGroup();
      watchForAnchor();
    }

    // The nav is client-rendered, so it usually does not exist when this runs.
    // Waiting on the 3s heartbeat made the bar visibly late; this injects on
    // the very mutation that produces the anchor, then stops watching.
    //
    // REPORTED 2026-09-06: "the script sometimes doesn't load". Recovery after
    // the SPA re-renders the nav and detaches our group was the 3s interval —
    // and a HIDDEN TAB clamps that to roughly once a minute. Open the game in a
    // background tab, or leave it while it re-routes, and the button can be
    // missing for a minute with nothing wrong. Same failure family as S8: work
    // that only happens on a timer stops happening when the tab is not looked
    // at. Three cheap non-timer paths now cover it.
    let anchorObserving = false;
    let anchoredOnce = false;
    function watchForAnchor() {
      if (anchorObserving || !document.body) return;
      // STAYS ARMED for the life of the page, rather than disconnecting once
      // anchored. Disconnecting meant an SPA nav swap had no fast recovery at
      // all - only the 3s heartbeat, which is the throttled path this whole
      // change exists to stop depending on.
      //
      // ON coreScope (v10), which is the framework's own observer budget being
      // spent on the one observer Core actually needs. The hand-rolled 250ms
      // debounce that used to live here is gone — scope.mutation() owns it, and
      // refuses anything faster. Core's rule and Core's compliance are now the
      // same code, which is the whole argument for the scope existing.
      anchorObserving = true;
      coreScope.mutation(document.body, { childList: true, subtree: true }, () => {
        if (!coreUi) return;
        const wasAttached = document.body.contains(coreUi.group);
        anchorGroup();
        if (!wasAttached && document.body.contains(coreUi.group) && !anchoredOnce) {
          anchoredOnce = true;
          // the character settings are loaded by now - re-read the real convention
          probeCharacter(true);
          probeMergedMultipliers(true); // same moment: the tree is finally populated
          if (refreshConvention()) {
            renderNumberFormatRow();
            for (const id of Object.keys(modules)) safely(id, 'onConventionChange');
          }
        }
      }, { debounceMs: 250 });
    }

    // ---- route changes, detected ONCE and shared (v9) ----
    //
    // Core already has to know when the SPA re-routes — that is when its own
    // nav group gets detached — so it already wraps history.pushState/
    // replaceState, listens on popstate, and re-checks on its 3s heartbeat.
    // Every one of those is a page-global side effect, and a module needing
    // the same signal was duplicating all three: fighter-allocator wrapped
    // history a SECOND time and ran its own 2s poll beside Core's heartbeat,
    // which is exactly the "ONE heartbeat, not three" argument one layer up.
    //
    // So the detection stays in one place and modules subscribe. Returns an
    // unsubscribe function; a throwing subscriber is logged and skipped rather
    // than taking the re-anchor path down with it (same contract as safely()).
    const navSubscribers = [];
    let lastNavPath = location.pathname;
    function onNavigate(fn) {
      if (typeof fn !== 'function') return () => {};
      navSubscribers.push(fn);
      return () => {
        const i = navSubscribers.indexOf(fn);
        if (i >= 0) navSubscribers.splice(i, 1);
      };
    }
    function notifyNavigation() {
      if (location.pathname === lastNavPath) return;
      const from = lastNavPath;
      lastNavPath = location.pathname;
      for (const fn of navSubscribers.slice()) {
        try { fn(location.pathname, from); }
        catch (err) { console.error('[ApozCore] an onNavigate subscriber threw; the rest are unaffected:', err); }
      }
    }

    // Re-attach immediately, without waiting for the next tick of anything.
    // The nav notification comes FIRST and is not gated on coreUi: a module can
    // subscribe before the launcher has finished building, and a route change
    // it misses is one it never hears about.
    function reanchorNow() {
      notifyNavigation();
      if (!coreUi || !document.body) return;
      anchorGroup();
      if (!document.body.contains(coreUi.group)) watchForAnchor();
    }

    // INCREMENTAL, not rebuild-every-time. With one module the difference was
    // invisible; with modules as separate scripts they register over a spread
    // of tens of milliseconds, and a full innerHTML rebuild per registration is
    // one layout pass each with the nav bar visibly resizing under the cursor.
    // The common cases — a module registering, a badge lighting up, a panel
    // opening — now touch one button's class and nothing else.
    let quickRowIds = [];
    function renderQuickRow() {
      const shown = enabledOrder.filter((id) => modules[id]).slice(0, maxQuickButtons);
      const sameOrder = shown.length >= quickRowIds.length
        && quickRowIds.every((id, i) => shown[i] === id);

      if (!sameOrder) {
        coreUi.quickRow.innerHTML = '';
        quickRowIds = [];
      }
      for (let i = quickRowIds.length; i < shown.length; i++) {
        const id = shown[i];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.apozId = id;
        // this only shows/hides the module's own GUI - enabling/disabling the
        // module itself happens exclusively via the dropdown rows below
        btn.addEventListener('click', (e) => { e.stopPropagation(); safely(id, 'onQuickClick'); });
        coreUi.quickRow.appendChild(btn);
        quickRowIds.push(id);
      }
      // Update in place. setText/setAttr-style guards: assigning an identical
      // className or textContent still dirties layout.
      for (let i = 0; i < shown.length; i++) {
        const mod = modules[shown[i]];
        const btn = coreUi.quickRow.children[i];
        const cls = 'apoz-core-quick-btn'
          + (mod.badge ? ' apoz-core-quick-badge' : '')
          + (mod.open ? ' apoz-core-quick-btn-open' : '');
        if (btn.className !== cls) btn.className = cls;
        const text = mod.shortLabel || mod.label;
        if (btn.textContent !== text) btn.textContent = text;
        if (btn.title !== mod.label) btn.title = mod.label;
      }
    }

    // Kept minimal now that the compact dropdown no longer has a number-
    // format row of its own — the Settings window (openSettingsWindow) is
    // the detailed view; this just re-renders it if it happens to be open.
    function renderNumberFormatRow() {
      if (settingsUi) settingsUi.renderNumberFormat();
    }

    // ---- Settings window (v6.1) ----
    //
    // A real window, not dropdown icons — number formatting needs room to
    // show BOTH separators and whether detection actually worked, and more
    // settings are coming (see the note in openSettingsWindow's body).
    let settingsHandle = null;
    let settingsUi = null;
    // ---- the jobs window (v11) ----
    //
    // The visualisation half of "the browser is the interface". Everything it
    // shows comes from the host; nothing is computed here.
    //
    // It polls only WHILE OPEN, on its own scope, so closing it stops the
    // traffic — a dashboard that keeps polling a local server after you have
    // stopped looking at it is exactly the kind of background cost §4.4 budgets
    // against, and it is invisible precisely because it is cheap per request.
    let jobsHandle = null;
    let jobsScope = null;

    function openJobsWindow() {
      if (!jobsHandle) {
        jobsHandle = createWindow({
          id: 'apoz-core-jobs', title: 'Apoz Core Jobs',
          resizable: 'vertical', minSize: { w: 520, h: 380 },
          onClose: () => { stopJobsPolling(); jobsHandle.close(); },
        });
      }
      const body = document.createElement('div');

      const status = document.createElement('div');
      status.style.cssText = 'font-size:11px; margin-bottom:8px; line-height:1.45;';
      body.appendChild(status);

      const listHost = document.createElement('div');
      body.appendChild(listHost);

      jobsHandle.setContent(body);
      jobsHandle.open();

      stopJobsPolling();
      // Owned by the WINDOW's scope, not Core's: the poll must die with the
      // window even if nothing remembers to stop it.
      jobsScope = jobsHandle.scope.child('jobs-poll');

      const refresh = async () => {
        if (jobs.state.state !== HOST_STATES.READY) await jobs.check();
        if (jobs.state.state !== HOST_STATES.READY) {
          status.textContent = `${jobs.state.state}: ${jobs.state.detail}`;
          listHost.innerHTML = '';
          return;
        }
        let live = { jobs: [] };
        let durable = { runs: [], resumable: [] };
        try {
          live = await (await hostFetch('/jobs')).json();
          durable = await jobs.runs();
        } catch (err) {
          status.textContent = `lost contact with the host: ${err.message}`;
          return;
        }

        const cap = jobs.state.health && jobs.state.health.capacity;
        const store = jobs.state.health && jobs.state.health.storage;
        status.textContent = `Connected — ${cap ? `${cap.busy}/${cap.workers} workers busy` : 'capacity unknown'}`
          + `${cap && cap.queued ? `, ${cap.queued} queued` : ''}`
          + `${store ? ` · ${store.knownFindings.toLocaleString()} simulations banked` : ''}`;

        // A resumable run is the one row that offers an ACTION, so it goes
        // first: it is the only thing here that is waiting on a decision.
        const rows = [
          ...durable.resumable.map((r) => ({ ...r, group: 'interrupted' })),
          ...live.jobs.map((j) => ({ ...j, group: j.status === 'running' || j.status === 'queued' ? 'active' : 'done' })),
          ...durable.runs.filter((r) => r.status !== 'interrupted' && !live.jobs.some((j) => j.jobId === r.jobId))
            .slice(0, 20).map((r) => ({ ...r, group: 'done' })),
        ];

        listHost.innerHTML = '';
        if (!rows.length) {
          const empty = document.createElement('div');
          empty.style.cssText = 'opacity:.7; font-size:11px; padding:12px 0;';
          empty.textContent = 'No jobs yet. Nothing has been submitted to this host.';
          listHost.appendChild(empty);
          return;
        }

        listHost.appendChild(ui.table({
          columns: [
            { key: 'jobId', label: 'Job' },
            { key: 'type', label: 'Type' },
            {
              key: 'status',
              label: 'Status',
              render: (r) => {
                if (r.group === 'interrupted') return `interrupted at ${r.completed ?? '?'}/${r.total ?? '?'}`;
                if (r.progress) return `${r.status} — ${r.progress.completed}${r.progress.total ? `/${r.progress.total}` : ''}`;
                return r.status;
              },
            },
            { key: 'durationMs', label: 'Took', render: (r) => (r.durationMs != null ? `${(r.durationMs / 1000).toFixed(1)}s` : '') },
          ],
          rows,
          rowActions: [
            {
              label: (r) => (r.group === 'interrupted' ? 'Resume' : 'Cancel'),
              onClick: async (r) => {
                if (r.group === 'interrupted') { toast('Resume is submitted by the module that owns this job type.'); return; }
                if (r.group === 'done') return;
                await jobs.cancel(r.jobId);
                refresh();
              },
            },
          ],
        }));
      };

      refresh();
      const loop = () => { refresh().finally(() => { if (jobsScope && !jobsScope.disposed) jobsScope.timeout(loop, 3000); }); };
      jobsScope.timeout(loop, 3000);
    }

    function stopJobsPolling() {
      if (jobsScope) { jobsScope.dispose(); jobsScope = null; }
    }

    function openSettingsWindow() {
      if (!settingsHandle) {
        settingsHandle = createWindow({
          // Deliberately NOT resizable: a settings panel's job is to lay out
          // cleanly at one size, not to be fought with — the content itself
          // is sized to fit within this, and the body only scrolls once a
          // future tab genuinely overflows it.
          id: 'apoz-core-settings', title: 'Apoz Core Settings',
          resizable: false, minSize: { w: 460, h: 560 },
        });
        settingsUi = buildSettingsContent();
        settingsHandle.setContent(settingsUi.root);
      }
      settingsUi.renderNumberFormat();
      settingsUi.renderHostStatus();
      settingsHandle.open();
    }

    function buildSettingsContent() {
      const root = document.createElement('div');

      // ---- number format ----
      const numGroup = document.createElement('div');
      numGroup.className = 'apoz-ui-group';
      const numLabel = document.createElement('div');
      numLabel.style.cssText = 'font-weight:bold; opacity:.7; text-transform:uppercase; font-size:10px; letter-spacing:.04em;';
      numLabel.textContent = 'Number format';
      numGroup.appendChild(numLabel);
      const numStatus = document.createElement('div');
      numStatus.style.cssText = 'font-size:11px; opacity:.85; margin:4px 0;';
      numGroup.appendChild(numStatus);
      const numBtnRow = document.createElement('div');
      numBtnRow.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap;';
      const numOptions = [
        { key: null, label: 'Auto-detect' },
        { key: '1.000,00', label: '1.000,00 (EU)' },
        { key: '1,000.00', label: '1,000.00 (US)' },
      ];
      const numBtns = numOptions.map((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'apoz-ui-btn';
        btn.textContent = opt.label;
        btn.addEventListener('click', () => { setNumberLocaleOverride(opt.key); settingsUi.renderNumberFormat(); });
        numBtnRow.appendChild(btn);
        return { key: opt.key, btn };
      });
      numGroup.appendChild(numBtnRow);
      root.appendChild(numGroup);

      // ---- appearance ----
      // A dropdown, not a checkbox — "liveAdaptTheme" is still the only
      // setting underneath it (2 real states today), but this is the shape a
      // future third state (another named preset, then a custom saved
      // theme — explicitly asked for, explicitly deferred) slots into
      // without another rebuild of this section.
      const themeGroup = document.createElement('div');
      themeGroup.className = 'apoz-ui-group';
      themeGroup.style.cssText = 'margin-top:10px;';
      const themeLabel = document.createElement('div');
      themeLabel.style.cssText = 'font-weight:bold; opacity:.7; text-transform:uppercase; font-size:10px; letter-spacing:.04em; margin-bottom:4px;';
      themeLabel.textContent = 'Appearance';
      themeGroup.appendChild(themeLabel);

      const themeSelectRow = document.createElement('div');
      themeSelectRow.style.cssText = 'display:flex; align-items:center; gap:8px; font-size:11.5px;';
      const themeSelectLabel = document.createElement('span');
      themeSelectLabel.textContent = 'Theme';
      themeSelectLabel.style.opacity = '.85';
      const themeSelect = document.createElement('select');
      themeSelect.style.cssText = 'font: inherit; font-size:11px; background: var(--apoz-input); '
        + 'color: var(--apoz-foreground); border: 1px solid var(--apoz-border); border-radius:4px; '
        + 'padding:3px 6px; margin-left:auto;';
      const optApoz = document.createElement('option');
      optApoz.value = 'apozTurquoise';
      optApoz.textContent = 'Apoz Turquoise';
      const optAuto = document.createElement('option');
      optAuto.value = 'auto';
      optAuto.textContent = 'Auto-adapt to live game CSS';
      themeSelect.appendChild(optApoz);
      themeSelect.appendChild(optAuto);
      themeSelect.value = getSetting('liveAdaptTheme') ? 'auto' : 'apozTurquoise';
      themeSelect.addEventListener('change', () => setSetting('liveAdaptTheme', themeSelect.value === 'auto'));
      themeSelectRow.appendChild(themeSelectLabel);
      themeSelectRow.appendChild(themeSelect);
      themeSelectRow.appendChild(ui.infoIcon(
        '"Apoz Turquoise" (default): a fixed snapshot, so it looks right immediately and never shifts. '
        + '"Auto-adapt": colors are read live from the game\'s own CSS variables instead.',
      ));
      themeGroup.appendChild(themeSelectRow);
      root.appendChild(themeGroup);

      // ---- windows ----
      const windowsGroup = document.createElement('div');
      windowsGroup.className = 'apoz-ui-group';
      windowsGroup.style.cssText = 'margin-top:10px;';
      const windowsLabel = document.createElement('div');
      windowsLabel.style.cssText = 'font-weight:bold; opacity:.7; text-transform:uppercase; font-size:10px; letter-spacing:.04em; margin-bottom:4px;';
      windowsLabel.textContent = 'Windows';
      windowsGroup.appendChild(windowsLabel);

      const resizeRow = document.createElement('div');
      resizeRow.style.cssText = 'display:flex; align-items:center; gap:8px; margin:4px 0;';
      const resizeToggle = Core_ui_toggleRow({
        label: 'Enable window resizing',
        info: 'ON (default): every window (except this one) can be dragged by its bottom-right corner to '
          + 'resize it. OFF removes the resize handle entirely, for anyone who would rather every window '
          + 'just kept its default size.',
        checked: !!getSetting('windowResizingEnabled'),
        onChange: (v) => setSetting('windowResizingEnabled', v),
      });
      resizeToggle.style.margin = '0';
      const resetSizesBtn = document.createElement('button');
      resetSizesBtn.type = 'button';
      resetSizesBtn.className = 'apoz-ui-btn';
      resetSizesBtn.textContent = 'Reset window sizes';
      resetSizesBtn.title = 'Resets EVERY window\'s position AND size back to default, including this one — '
        + 'not the same as the dropdown\'s reset button, which only nudges position and leaves size alone.';
      resetSizesBtn.style.marginLeft = 'auto';
      resetSizesBtn.addEventListener('click', () => resetAllWindowSizes());
      resizeRow.appendChild(resizeToggle);
      resizeRow.appendChild(resetSizesBtn);
      windowsGroup.appendChild(resizeRow);

      const reloadRow = Core_ui_toggleRow({
        label: 'Reopen module windows automatically on page reload',
        info: 'OFF (default): a module always opens its window the moment you enable it, but a page '
          + 'reload does NOT re-show windows that merely happened to be open last session — keeps a '
          + 'reload from cluttering the screen with everything you had open before.',
        checked: !!getSetting('autoShowOnReload'),
        onChange: (v) => setSetting('autoShowOnReload', v),
      });
      reloadRow.style.marginTop = '6px';
      windowsGroup.appendChild(reloadRow);
      root.appendChild(windowsGroup);

      // ---- job host (v11) ----
      //
      // The client existed for a version before this did, which was a real gap:
      // `Core.jobs` could connect, submit and drive the capacity dial, and there
      // was no way to reach any of it. A settings API with no settings UI is a
      // feature nobody has.
      //
      // WHY THE STATUS LINE IS THE BIGGEST THING HERE. There are four ways this
      // can be not-working and each has a different fix — nothing listening,
      // wrong token, a host from another build, or never checked. Collapsing
      // them into a red dot would leave the user guessing which of four things
      // to try, so the line says the fix rather than the symptom.
      const hostGroup = document.createElement('div');
      hostGroup.className = 'apoz-ui-group';
      hostGroup.style.cssText = 'margin-top:10px;';
      const hostLabel = document.createElement('div');
      hostLabel.style.cssText = 'font-weight:bold; opacity:.7; text-transform:uppercase; font-size:10px; letter-spacing:.04em; margin-bottom:4px;';
      hostLabel.textContent = 'Job host';
      hostLabel.appendChild(ui.infoIcon(
        'An optional local program that runs long simulations outside the browser, so they keep going '
        + 'when this tab is closed. Everything here works without it — this only unlocks the long jobs. '
        + 'Start it with: node server/host.mjs',
      ));
      hostGroup.appendChild(hostLabel);

      const hostStatusLine = document.createElement('div');
      hostStatusLine.style.cssText = 'font-size:11px; margin:4px 0 8px; line-height:1.45;';
      hostGroup.appendChild(hostStatusLine);

      const hostUrlRow = ui.inputRow({
        label: 'Address',
        value: jobs.config.url,
        onChange: (v) => setHostConfig({ url: v.trim() }),
      });
      hostGroup.appendChild(hostUrlRow);

      const hostTokenRow = ui.inputRow({
        label: 'Token',
        value: '',
        info: 'The host prints this when it starts. It is regenerated every run and written nowhere, '
          + 'so it has to be pasted again after restarting the host.',
        onChange: (v) => setHostConfig({ token: v.trim() }),
      });
      hostTokenRow._input.placeholder = jobs.config.hasToken ? '•••••••• (saved)' : 'paste from the host';
      hostGroup.appendChild(hostTokenRow);

      // ---- capacity ----
      //
      // Hidden until connected, because "how many cores" is a meaningless
      // control when there is nothing to apply it to, and a disabled input with
      // no explanation is worse than an absent one.
      const capRow = document.createElement('div');
      capRow.style.cssText = 'display:flex; align-items:center; gap:8px; margin-top:8px;';
      capRow.hidden = true;
      const capLabel = document.createElement('label');
      capLabel.style.cssText = 'font-size:11px; flex:1;';
      capLabel.textContent = 'Workers';
      capLabel.appendChild(ui.infoIcon(
        'How many CPU cores the host may use. Safe to change while jobs are running: more takes effect '
        + 'immediately, fewer lets running jobs finish first and never throws work away.',
      ));
      const capInput = document.createElement('input');
      capInput.type = 'number';
      capInput.min = '1';
      capInput.style.cssText = 'width:64px;';
      const capApply = document.createElement('button');
      capApply.type = 'button';
      capApply.className = 'apoz-ui-btn';
      capApply.textContent = 'Apply';
      capRow.appendChild(capLabel);
      capRow.appendChild(capInput);
      capRow.appendChild(capApply);
      hostGroup.appendChild(capRow);

      const hostBtnRow = document.createElement('div');
      hostBtnRow.style.cssText = 'display:flex; gap:6px; margin-top:8px;';
      const hostCheckBtn = document.createElement('button');
      hostCheckBtn.type = 'button';
      hostCheckBtn.className = 'apoz-ui-btn apoz-ui-btn-primary';
      hostCheckBtn.textContent = 'Connect';
      const hostJobsBtn = document.createElement('button');
      hostJobsBtn.type = 'button';
      hostJobsBtn.className = 'apoz-ui-btn';
      hostJobsBtn.textContent = 'View jobs';
      hostJobsBtn.addEventListener('click', () => openJobsWindow());
      hostBtnRow.appendChild(hostCheckBtn);
      hostBtnRow.appendChild(hostJobsBtn);
      hostGroup.appendChild(hostBtnRow);

      const HOST_COPY = {
        [HOST_STATES.UNKNOWN]: ['', 'Not checked yet — press Connect.'],
        [HOST_STATES.READY]: ['#4caf50', 'Connected.'],
        [HOST_STATES.NO_HOST]: ['#e0a33e', 'Not running.'],
        [HOST_STATES.UNAUTHORIZED]: ['#e0a33e', 'Token not accepted.'],
        [HOST_STATES.MISMATCH]: ['#e0483e', 'Version mismatch — do not use.'],
      };

      function renderHostStatus() {
        const s = jobs.state;
        const [color, headline] = HOST_COPY[s.state] || HOST_COPY[HOST_STATES.UNKNOWN];
        hostStatusLine.innerHTML = '';
        const strong = document.createElement('div');
        strong.style.cssText = `font-weight:bold;${color ? ` color:${color};` : ''}`;
        strong.textContent = headline;
        const detail = document.createElement('div');
        detail.style.cssText = 'opacity:.75; margin-top:2px;';
        detail.textContent = s.detail || '';
        hostStatusLine.appendChild(strong);
        if (s.detail) hostStatusLine.appendChild(detail);

        const cap = s.health && s.health.capacity;
        capRow.hidden = !(s.state === HOST_STATES.READY && cap);
        if (cap) {
          capLabel.firstChild.nodeValue = `Workers (${cap.busy} busy, up to ${cap.maxUseful} useful) `;
          if (document.activeElement !== capInput) capInput.value = String(cap.workers);
          capInput.max = String(cap.maxUseful);
        }
      }

      hostCheckBtn.addEventListener('click', async () => {
        hostCheckBtn.disabled = true;
        hostCheckBtn.textContent = 'Checking…';
        try { await jobs.check(); } finally {
          hostCheckBtn.disabled = false;
          hostCheckBtn.textContent = 'Connect';
          renderHostStatus();
        }
      });

      capApply.addEventListener('click', async () => {
        const n = parseInt(capInput.value, 10);
        if (!Number.isInteger(n) || n < 1) { toast('Workers must be a whole number, 1 or more.'); return; }
        capApply.disabled = true;
        try {
          await jobs.setCapacity(n);
          await jobs.check();
          toast(`Host is now using ${n} worker${n === 1 ? '' : 's'}.`);
        } catch (err) {
          toast(`Could not change capacity: ${err.message}`);
        } finally {
          capApply.disabled = false;
          renderHostStatus();
        }
      });

      root.appendChild(hostGroup);

      // ---- reset (settings, separate from "Reset window sizes" above —
      // one resets WHERE/HOW BIG things are, this resets the settings
      // THEMSELVES: number format override, theme, reload behaviour,
      // window-resizing-enabled) ----
      const resetSettingsRow = document.createElement('div');
      resetSettingsRow.style.cssText = 'margin-top:10px; display:flex; justify-content:flex-end;';
      const resetSettingsBtn = document.createElement('button');
      resetSettingsBtn.type = 'button';
      resetSettingsBtn.className = 'apoz-ui-btn';
      resetSettingsBtn.textContent = 'Reset settings to default';
      resetSettingsBtn.title = 'Resets number format, theme, and the toggles above back to default — '
        + 'does NOT touch window positions/sizes (use "Reset window sizes" above for that).';
      resetSettingsBtn.addEventListener('click', () => {
        setNumberLocaleOverride(null);
        for (const key of Object.keys(SETTINGS_DEFAULTS)) setSetting(key, SETTINGS_DEFAULTS[key]);
        themeSelect.value = getSetting('liveAdaptTheme') ? 'auto' : 'apozTurquoise';
        const resizeInput = resizeToggle.querySelector('input[type="checkbox"]');
        if (resizeInput) resizeInput.checked = !!getSetting('windowResizingEnabled');
        const reloadInput = reloadRow.querySelector('input[type="checkbox"]');
        if (reloadInput) reloadInput.checked = !!getSetting('autoShowOnReload');
        settingsUi.renderNumberFormat();
        toast('Settings reset to default.', { type: 'success', duration: 3000 });
      });
      resetSettingsRow.appendChild(resetSettingsBtn);
      root.appendChild(resetSettingsRow);

      // ---- more settings, not yet built ----
      const futureNote = document.createElement('div');
      futureNote.style.cssText = 'margin-top:10px; font-size:10px; opacity:.5; line-height:1.4;';
      futureNote.textContent = 'More settings are planned (see INSTRUMENTATION.md/HANDOFF.md for the running list) — this panel will grow.';
      root.appendChild(futureNote);

      return {
        root,
        renderHostStatus,
        renderNumberFormat() {
          const c = getConvention();
          const auto = c.source !== 'override';
          const sourceLabel = c.source === 'setting' ? "the game's own numberLocale setting"
            : c.source === 'sample' ? 'a number rendered on this page'
            : c.source === 'browser' ? 'your browser locale' : 'a manual override';
          numStatus.innerHTML = '';
          const line1 = document.createElement('div');
          line1.textContent = `Sample: ${formatNumber(1234567.8)}  (decimal "${c.decimal}", thousands "${c.group}")`;
          const line2 = document.createElement('div');
          line2.style.cssText = auto ? 'color:#3ecf6a;' : 'color:#e0a23e;';
          line2.textContent = auto ? `✓ Auto-detected from ${sourceLabel}.` : `Forced by you (not auto-detected).`;
          numStatus.appendChild(line1);
          numStatus.appendChild(line2);
          for (const { key, btn } of numBtns) {
            let stored = null;
            try { stored = localStorage.getItem(OVERRIDE_KEY); } catch (e) { /* ignore */ }
            const active = key === stored || (key === null && stored === null);
            btn.style.cssText = active ? 'font-weight:700; border-color: var(--apoz-primary); color: var(--apoz-primary);' : '';
          }
        },
      };
    }

    // A labelled checkbox with Core.ui's own info-icon — small enough not to
    // route through the full Core.ui object (defined further down this same
    // closure) while staying visually consistent with it.
    function Core_ui_toggleRow({ label, info, checked, onChange }) {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex; align-items:center; gap:7px; font-size:11.5px; cursor:pointer; margin:4px 0;';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = checked;
      input.style.cssText = 'width:13px; height:13px; accent-color: var(--apoz-primary); margin:0;';
      input.addEventListener('change', () => onChange(input.checked));
      const text = document.createElement('span');
      text.textContent = label;
      row.appendChild(input);
      row.appendChild(text);
      if (info) row.appendChild(ui.infoIcon(info));
      return row;
    }

    // ONE ROW PER AVAILABLE UPDATE, plus a status line.
    //
    // The first version summarised "2 updates available" into a single row and
    // opened available[0] — so a user with a Core AND a module update was sent
    // to one of them and had no way to reach the other. Tampermonkey installs
    // one script per visit to one .user.js URL; there is no combined install,
    // so the UI has to offer each one.
    // REWORKED (v6.1): a module's own update now shows as a button that
    // only appears while hovering that module's row (renderDropdown), and
    // Core's own update shows as a small subtle button beside the version
    // number instead of a separate always-visible list — both were true
    // "show me only when it's actually relevant" simplifications of what
    // used to be one persistent block regardless of whether anything was
    // pending. This function now just refreshes the Core-update badge and
    // asks renderDropdown to pick up any per-module change.
    function renderUpdateRow() {
      if (!coreUi) return;
      if (coreUi.selfUpdate) {
        const entry = updateState.available.find((e) => e.id === 'apoz-core');
        coreUi.selfUpdate.innerHTML = '';
        if (entry) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'apoz-core-self-update-btn';
          btn.textContent = `Core ${entry.to} available ↗`;
          btn.title = entry.notes || `${entry.from} → ${entry.to}. Opens the script so Tampermonkey can install it.`;
          btn.addEventListener('click', (e) => { e.stopPropagation(); openUpdate(entry); });
          coreUi.selfUpdate.appendChild(btn);
        }
      }
      if (coreUi.moduleRows) renderDropdown();
    }

    function renderToolRows() {
      const ids = Object.keys(tools);
      coreUi.toolsBlock.style.display = ids.length ? 'block' : 'none';
      coreUi.toolRows.innerHTML = '';
      for (const id of ids) {
        const tool = tools[id];
        const row = document.createElement('div');
        row.className = 'apoz-core-row';
        const dot = document.createElement('span');
        dot.className = 'apoz-core-row-dot';
        dot.style.visibility = 'hidden'; // keeps label alignment with module rows
        const label = document.createElement('span');
        label.textContent = tool.label;
        const arrow = document.createElement('span');
        arrow.textContent = '↗';
        arrow.style.cssText = 'margin-left:auto;opacity:.55;font-size:11px';
        arrow.title = 'Opens in a new tab';
        row.appendChild(dot);
        row.appendChild(label);
        row.appendChild(arrow);
        row.addEventListener('click', (e) => { e.stopPropagation(); openTool(id); });
        coreUi.toolRows.appendChild(row);
      }
    }

    // Opening is wrapped like a module callback (§4.1 rule 3): a tool that
    // throws while building its payload must not take the launcher down.
    function openTool(id) {
      const tool = tools[id];
      if (!tool) return;
      try {
        const target = typeof tool.open === 'function' ? tool.open() : tool.href;
        if (!target) throw new Error('tool.open() returned nothing to open');

        // A synthesised anchor click, not window.open. Chrome's popup blocker
        // treats window.open from a handler that did work first (building a
        // ~76KB blob) as suspicious, and blocks it; a real link activation is
        // the gesture browsers are built to allow. This was blocking the ROI
        // tool for at least one user.
        const a = document.createElement('a');
        a.href = target;
        a.target = '_blank';
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();

        // Belt and braces: if it was still blocked, put a clickable way out in
        // front of the user rather than only in the console, which nobody has
        // open at the moment they click a menu item.
        setTimeout(() => {
          if (document.hasFocus()) return;   // a new tab took focus: it worked
          toast(`"${tool.label}" may have been blocked by the popup blocker.`, {
            type: 'warn', duration: 12000, action: 'Open here',
            onAction: () => { location.href = target; },
          });
        }, 400);
      } catch (err) {
        console.error(`[ApozCore] tool "${id}" failed to open:`, err);
        toast(`Could not open "${tool.label}" — see the console.`, { type: 'error' });
      }
    }

    function renderDropdown() {
      renderToolRows();
      coreUi.moduleRows.innerHTML = '';
      for (const id of Object.keys(modules)) {
        const mod = modules[id];
        const row = document.createElement('div');
        row.className = 'apoz-core-row' + (mod.enabled ? ' apoz-core-row-enabled' : '');
        const dot = document.createElement('span');
        dot.className = 'apoz-core-row-dot';
        const label = document.createElement('span');
        label.textContent = mod.label;
        if (mod.description) row.title = mod.description;
        // Visible, not just in a tooltip. Putting the version in the script's
        // @name would have been the obvious way to surface it and is a trap:
        // Tampermonkey identifies a script by @namespace + @name, so a name
        // that changes every release installs a new script every release and
        // updating stops working entirely.
        if (mod.version) {
          const ver = document.createElement('span');
          ver.className = 'apoz-core-row-ver';
          ver.textContent = 'v' + mod.version;
          label.appendChild(ver);
        }
        row.appendChild(dot);
        row.appendChild(label);
        // Revealed on hover only (see the CSS rule) — the row itself still
        // toggles enabled/disabled on click, so the update button has to
        // catch its own click and stop it from reaching that handler.
        const updateEntry = updateState.available.find((e) => e.id === id);
        if (updateEntry) {
          const updateBtn = document.createElement('button');
          updateBtn.type = 'button';
          updateBtn.className = 'apoz-core-row-update-btn';
          updateBtn.textContent = `Update ${updateEntry.to}`;
          updateBtn.title = updateEntry.notes || `${updateEntry.from} → ${updateEntry.to}`;
          updateBtn.addEventListener('click', (e) => { e.stopPropagation(); openUpdate(updateEntry); });
          row.appendChild(updateBtn);
        }
        row.addEventListener('click', (e) => { e.stopPropagation(); setEnabled(id, !mod.enabled); });
        coreUi.moduleRows.appendChild(row);
      }
      for (const id of Object.keys(duplicates)) {
        const row = document.createElement('div');
        row.className = 'apoz-core-row';
        row.style.cssText = 'opacity:.6;cursor:default';
        row.title = 'Two copies of this module are installed. One is running; '
          + 'delete the older script in the Tampermonkey dashboard.';
        const dot = document.createElement('span');
        dot.className = 'apoz-core-row-dot';
        dot.style.background = '#e0a23e';
        const label = document.createElement('span');
        label.textContent = `${(modules[id] && modules[id].label) || id} - installed twice`;
        row.appendChild(dot);
        row.appendChild(label);
        coreUi.moduleRows.appendChild(row);
      }

      // A module that refused to register is worse than a missing one: the
      // user installed something and the menu shows no trace of it. Say why.
      for (const id of Object.keys(incompatible)) {
        const info = incompatible[id];
        const row = document.createElement('div');
        row.className = 'apoz-core-row';
        row.style.cssText = 'opacity:.55;cursor:default';
        row.title = `This module needs Apoz Core v${info.needsCore}. Update Core from the row below.`;
        const dot = document.createElement('span');
        dot.className = 'apoz-core-row-dot';
        dot.style.background = '#e0a23e';
        const label = document.createElement('span');
        label.textContent = `${info.label} — needs Core v${info.needsCore}`;
        row.appendChild(dot);
        row.appendChild(label);
        coreUi.moduleRows.appendChild(row);
      }
    }

    function disableAll() {
      for (const id of Object.keys(modules)) {
        if (modules[id].enabled) setEnabled(id, false);
      }
    }

    // The dropdown's quick-recovery button — POSITION only, keeps whatever
    // size a window is currently at. Settings is reset in FULL here
    // regardless (position AND size): it has no on/off "module" state of its
    // own to gate on, and it needs to always be reachable from this one
    // always-available button — that's the whole point of routing "reset
    // everything else" through Settings' OWN reset button instead (below).
    function resetPositions() {
      for (const id of Object.keys(modules)) {
        const mod = modules[id];
        if (mod.enabled && mod.open) safely(id, 'onResetPosition');
      }
      if (settingsHandle) settingsHandle.resetFull();
    }

    // Settings' "Reset window sizes" button — the deliberate FULL reset
    // (position AND size), every registered window, whether or not its
    // module is currently enabled or open. Goes through windowRegistry
    // directly rather than the module onResetPosition hook precisely so it
    // does not depend on a module having wired that up, unlike the
    // quick-recovery button above.
    function resetAllWindowSizes() {
      for (const id in windowRegistry) windowRegistry[id].resetFull();
    }

    function setEnabled(id, enabled) {
      const mod = modules[id];
      if (!mod || mod.enabled === enabled) return;
      mod.enabled = enabled;
      enabledOrder = enabledOrder.filter((x) => x !== id);
      if (enabled) enabledOrder.unshift(id);
      saveState();
      renderQuickRow();
      renderDropdown();
      safely(id, 'onToggle', enabled);
    }

    // registerLink({ id, label, href })  or  ({ id, label, open() })
    // `open()` is called at click time, not registration time — so a tool
    // that builds a blob URL only pays for it when actually opened, and a
    // rebuilt payload picks up any state that changed since load.
    function registerLink(tool) {
      if (!tool || !tool.id || !tool.label) {
        console.error('[ApozCore] registerLink needs at least { id, label }');
        return;
      }
      if (!tool.href && typeof tool.open !== 'function') {
        console.error(`[ApozCore] tool "${tool.id}" needs either href or open()`);
        return;
      }
      tools[tool.id] = tool;
      if (coreUi) renderToolRows();
    }

    // Returns the stored descriptor so a module's shim can hold on to it.
    //
    // `needsCore` is the module saying which Core API it was written against.
    // Refusing is the point: a module built for a newer Core would otherwise
    // call a method that does not exist and fail somewhere unrelated, and the
    // user would have no way to know an update was the fix. The reverse — a
    // new Core, an old module — must always keep working, which is why this
    // API only ever gains fields.
    function registerModule(mod) {
      if (!mod || !mod.id) {
        console.error('[ApozCore] registerModule needs at least { id, label }');
        return null;
      }
      if (mod.needsCore && mod.needsCore > APOZ_CORE_VERSION) {
        console.warn(`[ApozCore] "${mod.id}" needs Core v${mod.needsCore}; this is v${APOZ_CORE_VERSION}. Update Apoz Core.`);
        incompatible[mod.id] = { label: mod.label || mod.id, needsCore: mod.needsCore };
        if (!coreUi) buildUi();
        renderDropdown();
        return null;
      }
      const existing = modules[mod.id];
      modules[mod.id] = Object.assign(
        { enabled: enabledOrder.includes(mod.id), badge: false, open: false },
        existing || {}, mod,
      );
      // The version comes from the module's own @version header, via the shim
      // that read GM_info — looked up rather than passed, because a module
      // registers whenever <body> shows up, which is long after claim() ran.
      // Nothing to keep in sync, so nothing that can drift.
      if (!modules[mod.id].version) modules[mod.id].version = versionFromQueue(mod.id);
      if (!coreUi) buildUi();
      // A module registering is new information about what is installed, so a
      // remembered update for it may have just become stale.
      dropAlreadyInstalled();
      renderQuickRow();
      renderDropdown();
      renderUpdateRow();
      return modules[mod.id];
    }

    function updateTitleBadge() {
      const anyActive = enabledOrder.some((id) => modules[id] && modules[id].enabled && modules[id].badge);
      const hasPrefix = document.title.startsWith(BADGE_PREFIX);
      if (anyActive && !hasPrefix) document.title = BADGE_PREFIX + document.title;
      else if (!anyActive && hasPrefix) document.title = document.title.slice(BADGE_PREFIX.length);
    }

    function setBadge(id, active) {
      const mod = modules[id];
      if (!mod || mod.badge === active) return;
      mod.badge = active;
      renderQuickRow();
      updateTitleBadge();
    }

    function setOpen(id, isOpen) {
      const mod = modules[id];
      if (!mod || mod.open === isOpen) return;
      mod.open = isOpen;
      renderQuickRow();
    }

    // ---- module intake ----
    //
    // A module script pushes { id, version, factory } onto window.__apozModules
    // and calls claim(). claim() runs each factory exactly once, ever, and
    // hands it this Core. The entry keeps the descriptor the factory returned
    // so a module never has to be re-initialised - re-registering is cheap and
    // idempotent, re-running a module's setup would build a second panel.
    function versionFromQueue(id) {
      const queue = window.__apozModules;
      if (!Array.isArray(queue)) return null;
      const entry = queue.find((e) => e && e.id === id);
      return entry ? entry.version : null;
    }

    function claim() {
      const queue = window.__apozModules;
      if (!Array.isArray(queue)) return;
      const seen = new Set();
      for (const entry of queue) {
        if (!entry) continue;
        // TWO COPIES OF THE SAME MODULE is a state renaming the scripts makes
        // easy to reach: Tampermonkey identifies a script by @name + @namespace,
        // so a rename installs a SECOND copy rather than updating the first.
        // Both would push here, both factories would run, and the user would
        // get two panels and two sets of timers with no clue why. Claim the
        // first, and say so about the rest.
        if (entry.claimed || seen.has(entry.id)) {
          if (!entry.claimed && seen.has(entry.id)) {
            entry.claimed = true;
            entry.duplicate = true;
            duplicates[entry.id] = true;
            console.warn(`[ApozCore] "${entry.id}" is installed twice - only one copy is running. `
              + 'Delete the older script in the Tampermonkey dashboard.');
            if (coreUi) renderDropdown();
          }
          seen.add(entry.id);
          continue;
        }
        seen.add(entry.id);
        entry.claimed = true;
        try {
          entry.descriptor = entry.factory(Core) || null;
        } catch (err) {
          entry.failed = true;
          console.error(`[ApozCore] module "${entry.id}" threw while starting; the rest are unaffected:`, err);
        }
      }
    }

    // NOT TAKEN from the Apoz Core Framework: its general event bus. It is good
    // code, and with separate module scripts it would be the only channel
    // between modules — but no module has yet needed to talk to another one.
    // Core's API only ever gains fields, so adding it the day one does costs a
    // version bump and nothing else. Shipping it now would be building a
    // boundary from zero examples.
    //
    // STILL TRUE AT TWO MODULES (checked 2026-09-07; the original note said
    // "there is one module", which stopped being the case when
    // fighter-allocator landed). What the second module actually wanted was not
    // module-to-module messaging but a signal Core already computes for itself
    // — SPA route changes — so that shipped as one named subscription
    // (`onNavigate`, v9) rather than a generic bus. A named channel that
    // removes a duplicated global side effect is a different thing from a bus
    // built on the guess that messaging will be wanted eventually.

    // ================================================================
    // ---- THE JOB HOST CLIENT (v11) — the browser as an interface ----
    // ================================================================
    //
    // THE DIVISION OF LABOUR, stated because it is the whole architecture:
    // **the browser interacts, connects live game data, and visualises. It does
    // not compute.** Long simulations run in a local host process
    // (`server/README.md`), because a browser tab cannot do the one thing that
    // matters most — keep working when it is closed.
    //
    // That is not a preference. `tests/bench-h4-permutation-budget.mjs`
    // measures the planned workloads: the largest is ~1.7 hours single-threaded
    // and fits nowhere in a tab, and even a Web Worker dies with the page.
    //
    // WHAT THIS CLIENT REFUSES TO DO:
    //
    //   * **Guess.** No host, wrong token, or a protocol mismatch each produce
    //     a distinct, named state. A module shows the user which one; it never
    //     silently falls back to a lesser answer, because a plan computed
    //     against a different build looks exactly like a good one.
    //   * **Hold the tab open.** Submit returns a handle. Progress is polled,
    //     and the job survives the tab closing — that is the entire point.
    //   * **Store the token anywhere but this browser.** It is regenerated
    //     every time the host starts, and is pasted in by the user.
    const JOBS_KEY = 'apoz:core:host';
    const jobsCfg = { url: 'http://127.0.0.1:8787', token: '' };
    try {
      const raw = localStorage.getItem(JOBS_KEY);
      if (raw) Object.assign(jobsCfg, JSON.parse(raw));
    } catch (e) { /* defaults stand */ }

    // NOT 'ok'/'error'. Each state has a different fix, and collapsing them
    // into one means the user is told "it didn't work" and left to guess which
    // of four things to try.
    const HOST_STATES = Object.freeze({
      UNKNOWN: 'unknown',            // not checked yet
      READY: 'ready',
      NO_HOST: 'no-host',            // nothing listening — start it
      UNAUTHORIZED: 'unauthorized',  // wrong/blank token — repaste it
      MISMATCH: 'mismatch',          // different build — update one side
    });

    let hostState = { state: HOST_STATES.UNKNOWN, detail: '', health: null, at: 0 };

    function setHostConfig(next) {
      Object.assign(jobsCfg, next || {});
      try { localStorage.setItem(JOBS_KEY, JSON.stringify(jobsCfg)); } catch (e) { /* ignore */ }
      hostState = { state: HOST_STATES.UNKNOWN, detail: 'not checked since the settings changed', health: null, at: 0 };
    }

    async function hostFetch(pathname, { method = 'GET', body } = {}) {
      const res = await fetch(jobsCfg.url.replace(/\/$/, '') + pathname, {
        method,
        headers: { 'content-type': 'application/json', 'x-apoz-token': jobsCfg.token },
        body: body === undefined ? undefined : JSON.stringify(body),
        // No cookies, ever. The host authenticates by header precisely because
        // cookies are attached automatically, which is what makes cross-site
        // requests dangerous — see server/security.mjs.
        credentials: 'omit',
        cache: 'no-store',
      });
      return res;
    }

    // Cheap, and the ONLY place the two builds are compared. Doing it here
    // rather than on submit means a mismatch is found before an expensive job
    // rather than at the end of one.
    async function checkHost() {
      if (!jobsCfg.token) {
        hostState = { state: HOST_STATES.UNAUTHORIZED, detail: 'no token set — start the host and paste the one it prints', health: null, at: Date.now() };
        return hostState;
      }
      try {
        const res = await hostFetch('/health');
        if (res.status === 401 || res.status === 403) {
          hostState = { state: HOST_STATES.UNAUTHORIZED, detail: `host refused this token (${res.status})`, health: null, at: Date.now() };
          return hostState;
        }
        const health = await res.json();
        if (health.protocolVersion !== JOBS_PROTOCOL_VERSION) {
          hostState = {
            state: HOST_STATES.MISMATCH,
            detail: `host speaks protocol v${health.protocolVersion}, this script speaks v${JOBS_PROTOCOL_VERSION} — update whichever is older`,
            health, at: Date.now(),
          };
          return hostState;
        }
        hostState = { state: HOST_STATES.READY, detail: `${health.capacity ? health.capacity.workers : '?'} workers`, health, at: Date.now() };
      } catch (err) {
        // A refused connection is indistinguishable from a blocked one at this
        // layer, so the message names both rather than asserting one.
        hostState = {
          state: HOST_STATES.NO_HOST,
          detail: `nothing answered at ${jobsCfg.url} — start it with "node server/host.mjs", or check the port`,
          health: null, at: Date.now(),
        };
      }
      return hostState;
    }

    // Kept in step with engine/jobs/protocol.js BY HAND, and that is a real
    // coupling worth naming: this file is a userscript and cannot import from
    // engine/. The handshake above is what turns a drift into a clear message
    // instead of a wrong answer, which is why the check is not optional.
    const JOBS_PROTOCOL_VERSION = 1;

    async function submitJob(spec) {
      const health = hostState.state === HOST_STATES.READY ? hostState : await checkHost();
      if (health.state !== HOST_STATES.READY) {
        const e = new Error(`job host not ready: ${health.detail}`);
        e.hostState = health.state;
        throw e;
      }
      const request = {
        protocolVersion: JOBS_PROTOCOL_VERSION,
        jobId: spec.jobId || `${spec.type}-${Date.now().toString(36)}`,
        type: spec.type,
        input: spec.input || {},
        snapshot: spec.snapshot || null,
        snapshotVersion: spec.snapshot ? spec.snapshot.snapshotVersion : null,
        simulationCount: spec.simulationCount || 1000,
        timeoutMs: spec.timeoutMs || null,
        clientVersion: `apoz-core/${RELEASE.version}`,
        createdAt: new Date().toISOString(),
      };
      const res = await hostFetch('/jobs', { method: 'POST', body: { ...request, resume: spec.resume === true } });
      const body = await res.json();
      if (!res.ok) {
        const e = new Error(body.error || `host returned ${res.status}`);
        e.code = body.code;
        throw e;
      }
      return { jobId: body.jobId, resumedFrom: body.resumedFrom || null, deduplicated: !!body.deduplicated };
    }

    // Polls until terminal, reporting progress. The interval is deliberately
    // slow: these jobs run for minutes to hours, and a tight poll spends the
    // tab-wake budget §4.4 protects to learn nothing.
    function watchJob(jobId, { onProgress = null, intervalMs = 2000, scope = null } = {}) {
      let stopped = false;
      const owner = scope || coreScope;
      const stop = () => { stopped = true; };
      owner.add(stop);
      const done = new Promise((resolve, reject) => {
        const tick = async () => {
          if (stopped) return;
          try {
            const res = await hostFetch(`/jobs/${encodeURIComponent(jobId)}`);
            const body = await res.json();
            if (body.progress && onProgress) onProgress(body.progress);
            if (body.result) { resolve(body.result); return; }
          } catch (err) {
            // A host that goes away mid-job is NOT a failed job — the work is
            // still on disk and resumable. Keep polling; say so if asked.
            hostState = { state: HOST_STATES.NO_HOST, detail: 'lost contact while a job was running', health: null, at: Date.now() };
          }
          owner.timeout(tick, intervalMs);
        };
        owner.timeout(tick, 0);
        owner.add(() => reject(new Error('watch cancelled')));
      });
      return { done, stop };
    }

    const jobs = {
      STATES: HOST_STATES,
      get config() { return { url: jobsCfg.url, hasToken: !!jobsCfg.token }; },
      setConfig: setHostConfig,
      get state() { return hostState; },
      check: checkHost,
      submit: submitJob,
      watch: watchJob,
      async cancel(jobId) { await hostFetch(`/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' }); },
      async runs() { const r = await hostFetch('/runs'); return r.json(); },
      async capacity() { const r = await hostFetch('/capacity'); return r.json(); },
      // The dial, from the UI. Changing it while jobs run is safe by design —
      // growth is immediate, shrinking retires workers as they finish.
      async setCapacity(workers) {
        const r = await hostFetch('/capacity', { method: 'POST', body: { workers } });
        return r.json();
      },
    };

    // ---- toast ----
    //
    // For things worth saying once and not worth a panel: "update available",
    // "saved", "couldn't read your gold". Anything the user may want to re-read
    // belongs in a module's own window instead - a toast that has to be caught
    // is a bug report waiting to happen.
    let toastHost = null;
    function toast(message, opts) {
      opts = opts || {};
      if (!document.body) return { dismiss() {} };
      if (!toastHost) {
        toastHost = document.createElement('div');
        toastHost.id = 'apoz-core-toasts';
        document.body.appendChild(toastHost);
      }
      const el = document.createElement('div');
      el.className = 'apoz-core-toast apoz-core-toast-' + (opts.type || 'info');
      const text = document.createElement('span');
      text.className = 'apoz-core-toast-msg';
      text.textContent = message;
      el.appendChild(text);
      if (opts.action && opts.onAction) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'apoz-core-toast-action';
        btn.textContent = opts.action;
        btn.addEventListener('click', () => { try { opts.onAction(); } finally { dismiss(); } });
        el.appendChild(btn);
      }
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'apoz-core-toast-close';
      close.textContent = '×';
      close.title = 'Dismiss';
      close.addEventListener('click', () => dismiss());
      el.appendChild(close);
      toastHost.appendChild(el);
      // rAF does not fire in a hidden tab, so a toast raised while the user is
      // elsewhere would sit at opacity 0 until its own timer removed it -
      // invisible, and unrecoverable. The update notice is exactly the toast
      // most likely to be raised while nobody is looking.
      const reveal = () => el.classList.add('apoz-core-toast-in');
      if (document.hidden) setTimeout(reveal, 0); else requestAnimationFrame(reveal);

      let timer = null;
      const ms = opts.duration === undefined ? 6000 : opts.duration;
      function dismiss() {
        if (timer) clearTimeout(timer);
        el.classList.remove('apoz-core-toast-in');
        setTimeout(() => el.remove(), 200);
      }
      if (ms > 0) timer = setTimeout(dismiss, ms);
      return { dismiss };
    }

    // ---- update checking ----
    //
    // WHAT THIS IS AND IS NOT. Tampermonkey owns updating: it reads @version
    // from @updateURL on its own schedule and shows its own prompt, and a
    // script can neither trigger that check nor update itself. This is the
    // NOTIFICATION layer over that transport - it exists because TM's check is
    // slow and invisible, not because it is unreliable. Clicking through opens
    // the .user.js URL, which is what hands the actual install to TM. We never
    // fetch and eval a script ourselves. See DISTRIBUTION.md section 2.1.
    const UPDATE_KEY = 'apoz:core:updates';
    // Every 2h rather than 6h. The check is one ~1KB fetch of a static file on
    // a CDN, so the cost is not the network - it is that a stale answer makes
    // the row untrustworthy. Twice a day was too rare to be believed.
    // Deliberately NOT every page load: an idle game gets reloaded often, and
    // a request per load is a request per load whatever its size.
    const UPDATE_INTERVAL_MS = 2 * 60 * 60 * 1000;
    let updateState = { checkedAt: 0, available: [], error: null, checking: false };

    try {
      const savedUpd = JSON.parse(localStorage.getItem(UPDATE_KEY) || 'null');
      if (savedUpd && typeof savedUpd.checkedAt === 'number') {
        updateState.checkedAt = savedUpd.checkedAt;
        updateState.available = Array.isArray(savedUpd.available) ? savedUpd.available : [];
      }
    } catch (e) { /* first run, or storage blocked */ }

    // REVALIDATE WHAT WE REMEMBERED, before showing any of it.
    //
    // The list is persisted so the menu has something to say before the first
    // network check - but a remembered entry describes the world as it was
    // hours ago, and the most likely thing to have happened since is that the
    // user installed it. Showing "update available" for a version they are
    // already running, until they press Check, is worse than showing nothing:
    // it teaches them the row is untrustworthy.
    //
    // Costs no network: installedVersion() knows Core's own version, and each
    // module's comes from its @version via the shim.
    function dropAlreadyInstalled() {
      const before = updateState.available.length;
      updateState.available = updateState.available.filter((e) => {
        const have = installedVersion(e.id);
        // Keep entries for things not yet registered - a module may simply not
        // have claimed yet at this point in the boot.
        if (!have) return true;
        return cmpVersion(e.to, have) > 0;
      });
      if (updateState.available.length !== before) persistUpdateState();
      return before - updateState.available.length;
    }

    // Numeric-segment compare, prerelease-aware enough for "5.0.1" vs
    // "5.0.1-beta": a version WITH a suffix sorts below the same version
    // without one, which is what makes promoting beta -> live an increase.
    function cmpVersion(a, b) {
      const split = (v) => {
        const parts = String(v || '0').split('-');
        return { nums: parts[0].split('.').map((n) => parseInt(n, 10) || 0), pre: parts[1] || '' };
      };
      const A = split(a), B = split(b);
      for (let i = 0; i < Math.max(A.nums.length, B.nums.length); i++) {
        const d = (A.nums[i] || 0) - (B.nums[i] || 0);
        if (d) return d < 0 ? -1 : 1;
      }
      if (A.pre === B.pre) return 0;
      if (!A.pre) return 1;   // a release beats the prerelease of the same number
      if (!B.pre) return -1;
      return A.pre < B.pre ? -1 : 1;
    }

    function installedVersion(id) {
      if (id === 'apoz-core') return RELEASE.version;
      const mod = modules[id];
      return mod && mod.version ? mod.version : null;
    }

    function persistUpdateState() {
      try {
        localStorage.setItem(UPDATE_KEY, JSON.stringify({
          checkedAt: updateState.checkedAt, available: updateState.available,
        }));
      } catch (e) { /* ignore */ }
    }

    function checkForUpdates(manual) {
      if (updateState.checking) return Promise.resolve(updateState);
      if (!RELEASE.manifestUrl) {
        updateState.error = 'dev build - updates are off';
        if (coreUi) renderUpdateRow();
        return Promise.resolve(updateState);
      }
      if (!manual && Date.now() - updateState.checkedAt < UPDATE_INTERVAL_MS) {
        return Promise.resolve(updateState);
      }
      updateState.checking = true;
      updateState.error = null;
      if (coreUi) renderUpdateRow();

      return fetch(RELEASE.manifestUrl, { cache: 'no-store' })
        .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then((manifest) => {
          const entries = [];
          const consider = (id, label, published) => {
            if (!published || !published.version) return;
            const have = installedVersion(id);
            // No installed version means the script is not installed at all -
            // an update prompt for something you chose not to have is noise.
            if (!have) return;
            if (cmpVersion(published.version, have) > 0) {
              entries.push({ id, label, from: have, to: published.version, url: published.url, notes: published.notes || '' });
            }
          };
          consider('apoz-core', 'Apoz Core', manifest.core);
          for (const m of (manifest.modules || [])) {
            consider(m.id, m.label || (modules[m.id] && modules[m.id].label) || m.id, m);
          }
          updateState.available = entries;
          updateState.checkedAt = Date.now();
          persistUpdateState();
          if (entries.length && !manual) {
            toast(entries.length === 1
              ? `${entries[0].label} ${entries[0].to} is available`
              : `${entries.length} Apoz updates available`,
              { type: 'info', duration: 10000, action: 'Update', onAction: () => openUpdate(entries[0]) });
          }
          return updateState;
        })
        .catch((err) => {
          // Offline, host down, rate-limited. Back off rather than retry, and
          // never toast - an error popup on a flaky connection is worse than
          // no update check at all.
          updateState.error = String((err && err.message) || err);
          updateState.checkedAt = Date.now() - UPDATE_INTERVAL_MS + 15 * 60 * 1000;
          persistUpdateState();
          return updateState;
        })
        .finally(() => {
          updateState.checking = false;
          if (coreUi) renderUpdateRow();
        });
    }

    function openUpdate(entry) {
      if (!entry || !entry.url) return;
      window.open(entry.url, '_blank', 'noopener');
    }

    // ONE shared, debounced resize listener for every open window plus the
    // dropdown — not one per module (§4.4's "≤1 …per module" budget, applied
    // at the framework level instead of duplicated per window). This is the
    // actual gap behind the reported dropdown bug: nothing ever re-checked
    // position against a viewport that had changed size. Closed once, here,
    // for every window this framework will ever have, not just the dropdown.
    let viewportResizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(viewportResizeTimer);
      viewportResizeTimer = setTimeout(() => {
        for (const id of Object.keys(windowRegistry)) windowRegistry[id].reclamp();
        if (coreUi && coreUi.repositionDropdownIfOpen) coreUi.repositionDropdownIfOpen();
      }, 150);
    });

    // Coming back to the tab is the moment it matters, and the moment a
    // throttled timer has not fired. Costs nothing while hidden.
    coreScope.on(document, 'visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      reanchorNow();
      // Writes queued while hidden were HELD, not dropped (§5's S2 trap: state
      // must keep advancing while the pixels do not). This is where they land,
      // so coming back to the tab never shows a stale frame.
      scheduler.wake();
    });
    window.addEventListener('pageshow', reanchorNow);
    window.addEventListener('focus', reanchorNow);

    // An SPA route change replaces the nav, which is exactly when our group
    // gets detached. history.pushState fires no event of its own, so it is
    // wrapped — cheaply, once, and it still calls through.
    //
    // WHOLLY OPTIONAL, AND GUARDED AS SUCH. This is a recovery nicety; an
    // environment where history is absent, frozen, or already wrapped by
    // something protective must not take the entire Core down at init, because
    // the symptom of that is indistinguishable from the bug this is fixing.
    try {
      if (typeof history === 'object' && history) {
        for (const method of ['pushState', 'replaceState']) {
          const original = history[method];
          if (typeof original !== 'function') continue;
          history[method] = function () {
            const result = original.apply(this, arguments);
            setTimeout(reanchorNow, 0);
            return result;
          };
        }
      }
    } catch (e) {
      console.warn('[ApozCore] could not hook history for re-anchoring; the heartbeat still covers it.', e);
    }
    window.addEventListener('popstate', () => setTimeout(reanchorNow, 0));

    // ONE heartbeat, not three. Core previously owned a 3s re-anchor timer, a
    // 5s badge timer and a 5s update poll; three timers that each wake the tab
    // independently is three chances to be the thing that stops it idling, for
    // work that is a few comparisons. Everything here is a no-op in the common
    // case: reanchorNow returns immediately when the group is attached,
    // updateTitleBadge compares before touching document.title, and
    // checkForUpdates returns until 6h have elapsed.
    //
    // 3s is the fastest of the three, and the only one where latency is
    // visible to the user.
    let heartbeats = 0;
    setInterval(() => {
      reanchorNow();
      updateTitleBadge();
      // First update check after ~30s, then whenever checkForUpdates decides
      // its own 6h interval has passed.
      if (++heartbeats >= 10) checkForUpdates(false);
    }, 3000);

    return {
      version: APOZ_CORE_VERSION,
      release: RELEASE,
      registerModule, registerLink, setEnabled, setBadge, setOpen,
      // shared window framework (v6) — every module's panel and every
      // reusable table/modal/tooltip/input-row is built from these, so there
      // is one window system, not one per module.
      createWindow,
      ui,
      // shared settings (v6.1) — a module reads these rather than keeping
      // its own opinion of e.g. whether to reopen its window on reload.
      getSetting, setSetting,
      // module intake — called by every module's shim, and once by Core itself
      claim,
      // transient, non-blocking feedback. Modules should prefer their own
      // panel for anything the user needs to re-read.
      toast,
      checkForUpdates,
      // Read-only views of the two registries, for tests. Named so it is
      // obvious at a call site that anything using them is a test — a module
      // reaching into another module's state through here would be a bug,
      // and the name is the deterrent. Kept because the alternative is
      // asserting against a DOM stub, which tests the stub as much as the code.
      get __modulesForTest() { return modules; },
      get __toolsForTest() { return tools; },
      get __coreUiForTest() { return coreUi; },
      // shared number handling - modules must use these, never their own parser
      parseNumber, formatNumber,
      // SPA route changes, detected once by Core and shared (v9). A module
      // must not wrap history itself — see notifyNavigation above.
      onNavigate,
      // ---- the framework layer (v10) — userscripts/FRAMEWORK.md ----
      // A module should own exactly one scope and register EVERYTHING with a
      // lifetime through it. That is what makes "cannot leak" a structural
      // property rather than a review checklist.
      createScope,
      get __coreScopeForTest() { return coreScope; },
      // Test seams for the SETTINGS SURFACE, not for its wiring. They exist
      // because `Core.jobs` shipped correct and unreachable — every API test
      // passed while the feature had no interface at all. A test that calls the
      // API cannot, by construction, notice that a user cannot.
      __openSettingsForTest() { openSettingsWindow(); },
      __settingsRootForTest() { return settingsUi && settingsUi.root; },
      // The local job host (v11). The browser submits and visualises; the host
      // computes and survives the tab closing. server/README.md.
      jobs,
      // live-state probes. All refuse (return null / false) rather than guess.
      walkFiber, walkFiberAll, probeCharacter, probeMergedMultipliers,
      getNumberConvention: getConvention,
      numberProvenance,
      setNumberLocaleOverride,
      get maxQuickButtons() { return maxQuickButtons; },
      set maxQuickButtons(v) { maxQuickButtons = v; if (coreUi) renderQuickRow(); },
    };
  })();
  window.__ApozCore = Core;

  // One command to answer "why is it not there?", because every previous
  // round of this has been guesswork over chat. Deliberately a global and
  // deliberately plain text: it is for pasting back, not for programs.
  window.__apozDiag = function () {
    const q = Array.isArray(window.__apozModules) ? window.__apozModules : [];
    const group = document.getElementById('apoz-core-group');
    const lines = [
      '--- Apoz Core diagnostic ---',
      `Core:      v${Core.version}  release ${Core.release.channel} ${Core.release.version}`,
      // The first question when a change "did not show up" is which copy is on
      // screen. A dev build is the local one loaded off disk by the proxy and
      // updates the moment you rebuild; a live build only changes when
      // Tampermonkey runs an update check, which a page reload does not.
      Core.release.channel === 'dev'
        ? '           ^ LOCAL build via the dev proxy — rebuild + refresh the tab to see changes.'
        : '           ^ INSTALLED build — a page reload does NOT update it; use Check for updates.',
      `Menu:      ${group ? (document.body.contains(group) ? 'present in the page' : 'built but detached') : 'NOT BUILT'}`,
      // Three states, not two. This used to be a bare ternary, so a menu that
      // did not exist reported "in the nav bar" — the diagnostic contradicting
      // its own line above it, which is the fastest way to lose a reader's
      // trust in the whole output.
      `Anchor:    ${!group ? 'n/a — no menu was built' : group.classList.contains('apoz-core-floating') ? 'floating (no nav bar found)' : 'in the nav bar'}`,
      `Nav link:  ${document.querySelector('a[href="/game/log"]') ? 'found' : 'NOT FOUND'}`,
      `Modules:   ${q.length} queued`,
    ];
    for (const e of q) {
      // `hostVersion` differing from `version` means something other than this
      // module's own userscript loaded it — normally the dev proxy, which
      // `@require`s every file into ONE script so they all share its GM_info.
      // Saying so is the point: this line used to print the proxy's version as
      // if it were the module's, which is a wrong answer from the one tool
      // whose job is answering "what am I actually running".
      const loadedBy = e.hostVersion && e.hostVersion !== e.version ? `  [loaded by a v${e.hostVersion} script]` : '';
      lines.push(`  - ${e.id} v${e.version || '?'}`
        + ` ${e.claimed ? 'claimed' : 'NOT CLAIMED'}`
        + `${e.failed ? ' FAILED TO START' : ''}${e.duplicate ? ' (duplicate, not run)' : ''}${loadedBy}`);
    }
    const reg = Core.__modulesForTest;
    lines.push(`Registered: ${Object.keys(reg).join(', ') || 'none'}`);
    for (const id of Object.keys(reg)) {
      lines.push(`  - ${id}: ${reg[id].enabled ? 'enabled' : 'disabled'}`);
    }
    lines.push(`Tools:     ${Object.keys(Core.__toolsForTest).join(', ') || 'none'}`);
    lines.push(`Numbers:   ${JSON.stringify(Core.numberProvenance())}`);
    lines.push('--- end ---');
    const text = lines.join('\n');
    console.log(text);
    return text;
  };

  // Paste-and-send helper for when the menu lands in the wrong place. It
  // describes the page's real top-bar structure so the anchor can be aimed at
  // it, instead of another round of guessing at tag names from a screenshot.
  window.__apozWhereIsTheNav = function () {
    const out = [];
    const links = [...document.querySelectorAll('a')].filter((a) => a.offsetParent !== null);
    out.push(`visible <a> on the page: ${links.length}`);
    const game = links.filter((a) => (a.getAttribute('href') || '').includes('/game/'));
    out.push(`...of which contain "/game/": ${game.length}`);
    const groups = new Map();
    for (const a of game) {
      const parent = a.parentElement;
      if (!parent) continue;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(a);
    }
    const ranked = [...groups.entries()]
      .map(([el, g]) => ({ el, g, top: Math.round(el.getBoundingClientRect().top) }))
      .sort((a, b) => b.g.length - a.g.length)
      .slice(0, 3);
    for (const r of ranked) {
      out.push(`group of ${r.g.length} links, top=${r.top}px, parent=<${r.el.tagName.toLowerCase()}`
        + `${r.el.id ? ' id=' + r.el.id : ''} class="${(r.el.className || '').toString().slice(0, 80)}">`);
      out.push('   hrefs: ' + r.g.slice(0, 8).map((a) => a.getAttribute('href')).join(', '));
    }
    out.push(`<header> present: ${!!document.querySelector('header')}, <nav> present: ${!!document.querySelector('nav')}`);
    const text = out.join('\n');
    console.log(text);
    return text;
  };
  Core.claim(); // pick up any module that loaded before this script did

})();
