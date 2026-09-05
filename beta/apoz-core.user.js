// ==UserScript==
// @name         Apoz Core
// @namespace    apoz-core
// @author       Apoz
// @version      5.0.0-beta
// @description  The shell every Apoz module plugs into: the nav launcher, the module and tool registries, shared number handling for the game's per-character decimal convention, and update checking. Install this first — on its own it adds a menu and nothing else.
// @match        https://v2.queslar.com/*
// @match        https://*.queslar.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/Apoz-dv/apoz-core-releases/main/beta/apoz-core.user.js
// @downloadURL  https://raw.githubusercontent.com/Apoz-dv/apoz-core-releases/main/beta/apoz-core.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ==== GENERATED — release identity ====
  const APOZ_RELEASE = {
    "channel": "beta",
    "version": "5.0.0-beta",
    "manifestUrl": "https://raw.githubusercontent.com/Apoz-dv/apoz-core-releases/main/beta/manifest.json"
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

  const APOZ_CORE_VERSION = 5; // bump on API change (5 = standalone Core, claim(), bus, toast, updates)

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
    function walkFiber(visit) {
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
        while (stack.length && steps++ < 30000) {
          const f = stack.pop();
          if (!f || typeof f !== 'object' || seen.has(f)) continue;
          seen.add(f);
          for (const bag of [f.memoizedProps, f.memoizedState]) {
            if (!bag || typeof bag !== 'object') continue;
            for (const cand of [bag, bag.value, bag.memoizedState]) {
              if (cand && typeof cand === 'object' && visit(cand)) return true;
            }
          }
          if (f.child) stack.push(f.child);
          if (f.sibling) stack.push(f.sibling);
        }
      } catch (e) { /* fiber shape changed - callers fall back */ }
      return false;
    }

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

    function findGameLogLink() {
      const byHref = document.querySelector('a[href="/game/log"]');
      if (byHref) return byHref;
      for (const a of document.querySelectorAll('header a')) {
        if (a.textContent.trim().toLowerCase() === 'game log') return a;
      }
      return null;
    }

    function anchorGroup() {
      if (!coreUi || document.body.contains(coreUi.group)) return;
      const link = findGameLogLink();
      if (link) link.insertAdjacentElement('afterend', coreUi.group);
    }

    function buildUi() {
      const CORE_FONT = "Lato, 'Open Sans', Nunito, 'Segoe UI', system-ui, sans-serif";
      const STYLE_ID = 'apoz-core-style';
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        #apoz-core-group { display: inline-flex; align-items: stretch; border: 2px solid var(--border);
          border-radius: 5px; overflow: hidden; vertical-align: middle; font-family: ${CORE_FONT}; }
        #apoz-core-btn { background: transparent; color: var(--primary); border: none;
          font-weight: 600; letter-spacing: .01em; padding: 3px 8px; cursor: pointer; font-size: 12px;
          -webkit-font-smoothing: antialiased; }
        #apoz-core-btn:hover { background: var(--input); }
        #apoz-core-quick-row { display: flex; }
        .apoz-core-quick-btn { background: none; border: none; border-left: 1px solid var(--border);
          color: var(--foreground); opacity: .75; padding: 3px 7px; cursor: pointer; font-size: 11px;
          font-weight: 500; position: relative; -webkit-font-smoothing: antialiased; }
        .apoz-core-quick-btn:hover { opacity: 1; background: var(--input); }
        .apoz-core-quick-btn-open { opacity: 1; background: var(--input); }
        @keyframes apoz-core-blink { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
        .apoz-core-quick-badge::after { content: ''; position: absolute; top: 1px; right: 1px;
          width: 5px; height: 5px; border-radius: 50%; background: #e0483e;
          animation: apoz-core-blink 1.1s ease-in-out infinite; }
        #apoz-core-dropdown { position: fixed; z-index: 999999; background: var(--card);
          color: var(--popover-foreground); border: 2px solid var(--border); border-radius: 6px;
          min-width: 200px; box-shadow: 0 8px 24px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.04);
          padding: 4px; font: 12px ${CORE_FONT}; }
        .apoz-core-section-label { font-size: 9px; text-transform: uppercase; opacity: .5;
          letter-spacing: .05em; padding: 5px 8px 3px; display: flex; align-items: center; gap: 4px; }
        .apoz-core-info-icon { display: inline-flex; align-items: center; opacity: .8; cursor: help;
          position: relative; text-transform: none; letter-spacing: normal; }
        .apoz-core-info-icon svg { width: 11px; height: 11px; display: block; }
        .apoz-core-info-icon[data-tooltip]::after { content: attr(data-tooltip); position: absolute;
          top: 130%; left: 0; background: var(--popover); color: var(--popover-foreground);
          border: 1px solid var(--border); border-radius: 4px; padding: 5px 7px; font-size: 10px;
          line-height: 1.35; width: 230px; white-space: normal; opacity: 0; pointer-events: none;
          transition: opacity .08s ease .05s; box-shadow: 0 4px 12px rgba(0,0,0,.35); z-index: 20; }
        .apoz-core-info-icon[data-tooltip]:hover::after { opacity: 1; }
        .apoz-core-separator { height: 1px; background: var(--border); margin: 4px 2px; }
        .apoz-core-row { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 5px;
          cursor: pointer; }
        .apoz-core-row:hover { background: var(--input); }
        .apoz-core-row-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: #e0483e; }
        .apoz-core-row-enabled .apoz-core-row-dot { background: #3ecf6a; }
        .apoz-core-row-enabled { font-weight: 600; }
        .apoz-core-row:not(.apoz-core-row-enabled) { opacity: .55; }
        .apoz-core-settings-icons { display: flex; gap: 4px; padding: 2px 8px 4px; }
        .apoz-core-icon-btn { background: var(--input); border: 1px solid var(--border); border-radius: 4px;
          color: var(--foreground); font-size: 12px; padding: 4px 9px; cursor: not-allowed; opacity: .4; }
        .apoz-core-icon-active { opacity: 1; cursor: pointer; }
        .apoz-core-icon-active:hover { background: var(--popover); }
        .apoz-core-numfmt { display: flex; align-items: center; justify-content: space-between;
          gap: 8px; padding: 4px 8px 5px; font-size: 10px; opacity: .55; }
        .apoz-core-numfmt-btn { background: var(--input); border: 1px solid var(--border);
          border-radius: 4px; color: var(--foreground); font: inherit; font-size: 10px;
          padding: 2px 6px; cursor: pointer; }
        .apoz-core-numfmt-btn:hover { background: var(--popover); }
        .apoz-core-update-row { display: flex; align-items: center; gap: 6px; padding: 5px 8px;
          border-radius: 5px; font-size: 11px; }
        .apoz-core-update-row.apoz-core-update-has { cursor: pointer; color: var(--primary); font-weight: 600; }
        .apoz-core-update-row.apoz-core-update-has:hover { background: var(--input); }
        .apoz-core-update-row.apoz-core-update-none { opacity: .5; }
        .apoz-core-update-btn { margin-left: auto; background: var(--input); border: 1px solid var(--border);
          border-radius: 4px; color: var(--foreground); font: inherit; font-size: 10px; padding: 2px 6px;
          cursor: pointer; }
        .apoz-core-update-btn:hover { background: var(--popover); }
        .apoz-core-update-btn:disabled { opacity: .5; cursor: default; }
        #apoz-core-toasts { position: fixed; right: 14px; bottom: 14px; z-index: 1000000;
          display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
          pointer-events: none; font: 12px ${CORE_FONT}; }
        .apoz-core-toast { pointer-events: auto; display: flex; align-items: center; gap: 8px;
          max-width: 320px; background: var(--card); color: var(--popover-foreground);
          border: 1px solid var(--border); border-left-width: 3px; border-radius: 6px;
          padding: 8px 10px; box-shadow: 0 8px 24px rgba(0,0,0,.45);
          opacity: 0; transform: translateY(6px); transition: opacity .18s, transform .18s; }
        .apoz-core-toast.apoz-core-toast-in { opacity: 1; transform: none; }
        .apoz-core-toast-info { border-left-color: var(--primary); }
        .apoz-core-toast-success { border-left-color: #3ecf6a; }
        .apoz-core-toast-warn { border-left-color: #e0a23e; }
        .apoz-core-toast-error { border-left-color: #e0483e; }
        .apoz-core-toast-msg { flex: 1; line-height: 1.35; }
        .apoz-core-toast-action { background: var(--primary); color: var(--primary-foreground);
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
        <div class="apoz-core-section-label">Modules<span class="apoz-core-info-icon"
          data-tooltip="ON/OFF lives here, and only here: disabling a module stops it running. The buttons in the top bar next to &quot;Apoz Core&quot; only SHOW or HIDE that module's window - a hidden module keeps running, keeps tracking and still rings its alarm."
          ><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6.3"/><line x1="8" y1="7.2" x2="8" y2="11.3" stroke-linecap="round"/><circle cx="8" cy="4.9" r="0.9" fill="currentColor" stroke="none"/></svg></span></div>
        <div id="apoz-core-module-rows"></div>
        <div id="apoz-core-tools-block" style="display:none">
          <div class="apoz-core-separator"></div>
          <div class="apoz-core-section-label">Tools<span class="apoz-core-info-icon"
            data-tooltip="Standalone calculators and references. These open in a new tab and have no on/off state - there is nothing running to disable."
            ><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6.3"/><line x1="8" y1="7.2" x2="8" y2="11.3" stroke-linecap="round"/><circle cx="8" cy="4.9" r="0.9" fill="currentColor" stroke="none"/></svg></span></div>
          <div id="apoz-core-tool-rows"></div>
        </div>
        <div class="apoz-core-separator"></div>
        <div class="apoz-core-section-label">Settings</div>
        <div class="apoz-core-settings-icons">
          <button class="apoz-core-icon-btn" type="button" disabled title="Open settings (coming soon)">⚙</button>
          <button class="apoz-core-icon-btn apoz-core-icon-active" type="button" id="apoz-core-disable-all"
            title="Disable all modules">⏹</button>
          <button class="apoz-core-icon-btn" type="button" disabled
            title="Restart core script - not implemented yet; a page reload does this today">⟳</button>
          <button class="apoz-core-icon-btn apoz-core-icon-active" type="button" id="apoz-core-reset-positions"
            title="Reset positions of open module windows">⇱</button>
        </div>
        <div class="apoz-core-numfmt" id="apoz-core-numfmt">
          <span>Numbers</span>
          <button class="apoz-core-numfmt-btn" type="button" id="apoz-core-numfmt-btn"></button>
        </div>
        <div class="apoz-core-update-row" id="apoz-core-update-row"></div>
      `;
      document.body.appendChild(dropdown);
      const moduleRows = dropdown.querySelector('#apoz-core-module-rows');
      const toolRows = dropdown.querySelector('#apoz-core-tool-rows');
      const toolsBlock = dropdown.querySelector('#apoz-core-tools-block');
      const disableAllBtn = dropdown.querySelector('#apoz-core-disable-all');
      const resetPositionsBtn = dropdown.querySelector('#apoz-core-reset-positions');
      disableAllBtn.addEventListener('click', (e) => { e.stopPropagation(); disableAll(); });
      resetPositionsBtn.addEventListener('click', (e) => { e.stopPropagation(); resetPositions(); });

      // click cycles: auto-detect -> force 1.000,00 -> force 1,000.00 -> auto
      const numFmtBtn = dropdown.querySelector('#apoz-core-numfmt-btn');
      numFmtBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let stored = null;
        try { stored = localStorage.getItem(OVERRIDE_KEY); } catch (err) { /* ignore */ }
        const next = stored === null ? '1.000,00' : (stored === '1.000,00' ? '1,000.00' : null);
        setNumberLocaleOverride(next);
      });

      function openDropdown() {
        const rect = coreBtn.getBoundingClientRect();
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.display = 'block';
      }
      function closeDropdown() {
        dropdown.style.display = 'none';
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

      const updateRow = dropdown.querySelector('#apoz-core-update-row');
      coreUi = { group, coreBtn, quickRow, dropdown, moduleRows, toolRows, toolsBlock, numFmtBtn, updateRow };
      renderNumberFormatRow();
      renderUpdateRow();
      anchorGroup();
      watchForAnchor();
    }

    // The nav is client-rendered, so it usually does not exist when this runs.
    // Waiting on the 3s heartbeat made the bar visibly late; this injects on
    // the very mutation that produces the anchor, then stops watching.
    let anchorObserver = null;
    function watchForAnchor() {
      if (anchorObserver || !document.body) return;
      if (coreUi && document.body.contains(coreUi.group)) return;
      anchorObserver = new MutationObserver(() => {
        anchorGroup();
        if (coreUi && document.body.contains(coreUi.group)) {
          anchorObserver.disconnect();
          anchorObserver = null;
          // the character settings are loaded by now - re-read the real convention
          probeCharacter(true); // same moment the character data is finally live
          if (refreshConvention()) {
            renderNumberFormatRow();
            for (const id of Object.keys(modules)) safely(id, 'onConventionChange');
          }
        }
      });
      anchorObserver.observe(document.body, { childList: true, subtree: true });
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

    function renderNumberFormatRow() {
      if (!coreUi || !coreUi.numFmtBtn) return;
      const c = getConvention();
      const sample = formatNumber(1234567.8);
      const auto = c.source !== 'override';
      coreUi.numFmtBtn.textContent = `${sample}${auto ? '' : ' (forced)'}`;
      coreUi.numFmtBtn.title = auto
        ? `Auto-detected from ${c.source === 'setting' ? "the game's own numberLocale setting"
            : c.source === 'sample' ? 'a number rendered on this page' : 'your browser locale'}`
            + ` — decimal "${c.decimal}", thousands "${c.group}". Click to force a format.`
        : `Forced to decimal "${c.decimal}", thousands "${c.group}". Click to cycle / return to auto.`;
    }

    // One row, three states. The manual button reports "up to date" out loud
    // on purpose — a check button that produces no visible change when there
    // is nothing to report is indistinguishable from a broken one.
    function renderUpdateRow() {
      if (!coreUi || !coreUi.updateRow) return;
      const row = coreUi.updateRow;
      row.innerHTML = '';
      const label = document.createElement('span');
      const n = updateState.available.length;
      row.className = 'apoz-core-update-row' + (n ? ' apoz-core-update-has' : ' apoz-core-update-none');
      label.textContent = updateState.checking ? 'Checking…'
        : n ? (n === 1
            ? `${updateState.available[0].label} ${updateState.available[0].to} available`
            : `${n} updates available`)
        : updateState.error ? `Updates: ${updateState.error}`
        : updateState.checkedAt ? 'Up to date' : 'Updates not checked yet';
      if (n === 1 && updateState.available[0].notes) label.title = updateState.available[0].notes;
      row.appendChild(label);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'apoz-core-update-btn';
      btn.textContent = 'Check';
      btn.disabled = updateState.checking;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        checkForUpdates(true).then(() => {
          if (!updateState.available.length && !updateState.error) {
            toast('Everything is up to date.', { type: 'success', duration: 3000 });
          }
        });
      });
      row.appendChild(btn);

      if (n) {
        // Clicking the row hands the .user.js URL to Tampermonkey, which is
        // the only thing that can actually perform the update.
        row.addEventListener('click', (e) => {
          if (e.target === btn) return;
          e.stopPropagation();
          openUpdate(updateState.available[0]);
        });
      }
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
        const w = window.open(target, '_blank', 'noopener');
        // A blocked popup returns null. Say so rather than failing silently —
        // the user clicked and nothing happened, which reads as a broken tool.
        if (!w) console.warn(`[ApozCore] "${tool.label}" was blocked by the popup blocker. Allow popups for this site, or use the fallback link.`);
      } catch (err) {
        console.error(`[ApozCore] tool "${id}" failed to open:`, err);
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
        if (mod.description || mod.version) {
          row.title = [mod.description, mod.version ? `v${mod.version}` : null]
            .filter(Boolean).join(' · ');
        }
        row.appendChild(dot);
        row.appendChild(label);
        row.addEventListener('click', (e) => { e.stopPropagation(); setEnabled(id, !mod.enabled); });
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

    function resetPositions() {
      for (const id of Object.keys(modules)) {
        const mod = modules[id];
        if (mod.enabled && mod.open) safely(id, 'onResetPosition');
      }
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
      renderQuickRow();
      renderDropdown();
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
      for (const entry of queue) {
        if (!entry || entry.claimed) continue;
        entry.claimed = true;
        try {
          entry.descriptor = entry.factory(Core) || null;
        } catch (err) {
          entry.failed = true;
          console.error(`[ApozCore] module "${entry.id}" threw while starting; the rest are unaffected:`, err);
        }
      }
    }

    // NOT TAKEN from the Apoz Core Framework: its event bus. It is good code,
    // and with separate module scripts it would be the only channel between
    // modules — but there is one module, so it would carry nothing. Core's API
    // only ever gains fields, so adding it the day a second module needs to
    // talk to the first costs a version bump and nothing else. Shipping it now
    // would be building a boundary from zero examples.

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
      requestAnimationFrame(() => el.classList.add('apoz-core-toast-in'));

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
    const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;
    let updateState = { checkedAt: 0, available: [], error: null, checking: false };

    try {
      const savedUpd = JSON.parse(localStorage.getItem(UPDATE_KEY) || 'null');
      if (savedUpd && typeof savedUpd.checkedAt === 'number') {
        updateState.checkedAt = savedUpd.checkedAt;
        updateState.available = Array.isArray(savedUpd.available) ? savedUpd.available : [];
      }
    } catch (e) { /* first run, or storage blocked */ }

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

    // safety net only - the observer above is the fast path. This catches the
    // case where an SPA re-render detaches the group after we anchored.
    setInterval(() => {
      if (!coreUi) return;
      anchorGroup();
      if (!document.body.contains(coreUi.group)) watchForAnchor();
    }, 3000);
    setInterval(updateTitleBadge, 5000);

    // Update check rides the existing 5s badge tick rather than owning a timer:
    // checkForUpdates() is a no-op until 6h have passed since the last one, so
    // this costs an integer comparison every 5s and one ~1KB fetch twice a day.
    // The first check is deferred 30s so it never competes with page load.
    setTimeout(() => {
      checkForUpdates(false);
      setInterval(() => checkForUpdates(false), 5000);
    }, 30000);

    return {
      version: APOZ_CORE_VERSION,
      release: RELEASE,
      registerModule, registerLink, setEnabled, setBadge, setOpen,
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
      // shared number handling - modules must use these, never their own parser
      parseNumber, formatNumber,
      // live-state probes. Both refuse (return null / false) rather than guess.
      walkFiber, probeCharacter,
      getNumberConvention: getConvention,
      numberProvenance,
      setNumberLocaleOverride,
      get maxQuickButtons() { return maxQuickButtons; },
      set maxQuickButtons(v) { maxQuickButtons = v; if (coreUi) renderQuickRow(); },
    };
  })();
  window.__ApozCore = Core;
  Core.claim(); // pick up any module that loaded before this script did

})();
