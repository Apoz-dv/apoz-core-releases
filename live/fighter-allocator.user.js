// ==UserScript==
// @name         Apoz Core: Fighter Allocator
// @namespace    apoz-core
// @author       Apoz
// @version      1.7.0
// @description  Apoz Core module (requires "Apoz Core"). Allocates gold-purchased fighter stats (Health/Damage/Hit/Dodge/Defense/Crit Damage) across your 6 fighters. Class-keyed profiles with a full table (category, classes, date, source), World Boss-aware math (Hit target from boss level, exact Damage/Crit Damage split), and two-way import/export with the community "Fighter Optimizer" gold-plan format. Fills the game's own stat inputs; never auto-clicks Save Preset.
// @match        https://v2.queslar.com/*
// @match        https://*.queslar.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/Apoz-dv/apoz-core-releases/main/live/fighter-allocator.user.js
// @downloadURL  https://raw.githubusercontent.com/Apoz-dv/apoz-core-releases/main/live/fighter-allocator.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ==== GENERATED — DO NOT EDIT ====
  // Produced by userscripts/build.mjs from data/. Edit the FACT,
  // then rebuild; editing this block is overwritten and, worse,
  // silently diverges from the core it was supposed to mirror.

  // constants/fighters.json :: fighters.perPointScale  [CODE]
  const FIGHTER_PER_POINT_SCALE = {"health":100,"defense":10,"damage":25,"critDamage":0.0025,"hit":50,"dodge":50};

  // constants/fighters.json :: fighters.flatBase  [CODE]
  const FIGHTER_FLAT_BASE = {"health":500,"defense":25,"damage":100,"critDamage":0,"hit":50,"dodge":50};

  // constants/fighters.json :: fighters.monsterStatBreakpointScale  [CODE]
  function monsterStatBreakpointScale(level, linearMult, chunkMult) { const linear = level * linearMult; let bonus = 0; let chunkCount = 0; if (level > 600) { let remaining = level; for (; remaining > 600 && chunkCount < 5; ) { bonus += (remaining - 600) * chunkMult; remaining -= 300; chunkCount++; } if (remaining > 3000) { bonus += (remaining - 3000) * chunkMult; remaining -= 3000; chunkCount++; for (; remaining > 600; ) { bonus += (remaining - 600) * chunkMult; remaining -= chunkCount >= 10 ? 200 : 300; chunkCount++; } } } return linear + bonus; }

  // constants/fighters.json :: fighters.statPurchase.costFormula  [CODE]
  function fighterStatPurchaseCost(fromLevel, toLevel) { const count = toLevel - fromLevel; return (fromLevel + toLevel) * count / 2 * 10000; }

  // tables/modifier-tiers.json :: tiers.equipment.boostPercent  [CODE]
  const EQUIPMENT_TIER_BOOST_PERCENT = [10,20,30,40,50,75,100,125,150,175,200,250,275,300,325,350];

  // PROVENANCE — generated from this module's facts manifest.
  const PROVENANCE = [
    { file: "constants/fighters.json", fact: "fighters.perPointScale" },
    { file: "constants/fighters.json", fact: "fighters.flatBase" },
    { file: "constants/fighters.json", fact: "fighters.monsterStatBreakpointScale" },
    { file: "constants/fighters.json", fact: "fighters.statPurchase.costFormula" },
    { file: "tables/modifier-tiers.json", fact: "tiers.equipment.boostPercent" },
  ];
  void PROVENANCE; // declaration only — never read at runtime

  // ==== END GENERATED ====

  // ---- Core intake shim (generated) ----
  // Requires the "Apoz Core" userscript. Without it this module does nothing.
  (function (id, version, factory) {
    var host = (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version) || null;
    var q = (window.__apozModules = window.__apozModules || []);
    q.push({ id: id, version: version, hostVersion: host, factory: factory, claimed: false, descriptor: null });
    if (window.__ApozCore && window.__ApozCore.claim) { window.__ApozCore.claim(); return; }
    setTimeout(function () {
      if (!window.__ApozCore) console.warn('[Apoz] "' + id + '" is installed but the Apoz Core script is not. Install Apoz Core and reload.');
    }, 8000);
  })("fighter-allocator", "1.7.0-dev", function (Core) {


  const MODULE_ID = 'fighter-allocator';
  const STORAGE_KEY = `apoz:${MODULE_ID}:v1`;

  // ==== domain constants ====

  // The 6 raw, gold-purchased stats — same 6 the game's own slider UI shows.
  const STATS = ['Health', 'Damage', 'Hit', 'Dodge', 'Defense', 'Crit Damage'];
  // display name -> fighters.perPointScale/flatBase key (camelCase, no space)
  const STAT_KEY = { Health: 'health', Damage: 'damage', Hit: 'hit', Dodge: 'dodge', Defense: 'defense', 'Crit Damage': 'critDamage' };

  // Fuller than the community script's own 11-class dropdown (battle-fighters.md
  // documents 18) — no reason to limit OUR class-matching to a subset that
  // happens to be all one other script recognises.
  const ALL_CLASSES = [
    'Warrior', 'Brawler', 'Priest', 'Assassin', 'Mage', 'Shadow Dancer',
    'Berserker', 'Paladin', 'Crusader', 'Sentinel', 'Bastion', 'Tank',
    'Knight', 'Wizard', 'Cavalry', 'Healer', 'Synchronizer', 'Hunter',
  ];

  const POSITIONS = ['Left Top', 'Left Middle', 'Left Bottom', 'Right Top', 'Right Middle', 'Right Bottom'];

  const CATEGORIES = ['World Boss', 'Dungeon Pushing', 'Caves', 'Other'];

  // ==== pure allocation math (Node-testable — see fighter-allocator-math.mjs) ====

  // bossDodge(level) = 50*level below 600; the breakpoint formula (promoted
  // to a data/ fact this session, see fighters.monsterStatBreakpointScale)
  // keeps this exact past 600 too, instead of silently going wrong there the
  // way a hand-derived linear shortcut would.
  function bossDodgeAtLevel(level) {
    const raw = monsterStatBreakpointScale(level, 1, 1) - 1; // generateRawMonster's dodge offset
    return raw * FIGHTER_PER_POINT_SCALE.dodge + FIGHTER_FLAT_BASE.dodge;
  }

  // hitChance = clamp(0.25 + 0.75*hit/(hit+bossDodge), 0.25, 0.95); the 0.95
  // ceiling is reached exactly at hit = 14*bossDodge. Past this, a Hit point
  // is worth exactly zero — CONFIDENCE NOTE: contingent on
  // worldBoss.fighterBossStatGeneration (data/formulas/worldboss.json),
  // still INFER-tier, not yet HAR-confirmed. Surface that in the UI, not just
  // here — see the info-icon on the Boss level field in buildOptimizerContent().
  function hitTargetForBossLevel(level) {
    return 14 * bossDodgeAtLevel(level);
  }

  function statFinalFromRaw(stat, points) {
    const key = STAT_KEY[stat] || stat;
    return points * FIGHTER_PER_POINT_SCALE[key] + FIGHTER_FLAT_BASE[key];
  }

  // Inverts statFinalFromRaw for a TARGET final value. `gearBonus` is however
  // much of that final stat the caller already knows comes from gear/base
  // (0 if unknown) — absent a live read, this is a reasonable default, not a
  // guess dressed as one: the caller is choosing not to supply it, not us
  // failing to find it.
  function rawPointsForFinalStat(stat, targetFinal, gearBonus) {
    const key = STAT_KEY[stat] || stat;
    const needed = targetFinal - (gearBonus || 0) - FIGHTER_FLAT_BASE[key];
    return Math.max(0, Math.round(needed / FIGHTER_PER_POINT_SCALE[key]));
  }

  // ==== gold <-> raw-points, from the VERIFIED cost formula ====
  //
  // fighterStatPurchaseCost (the emitted fact) is cost(fromLevel,toLevel) =
  // (from+to)*(to-from)/2*10000, checked exactly against all 6 stats on a
  // real account's live allocation screenshot (see the fact's own
  // verifiedBy note). Cost to buy N points from level e simplifies to
  // 5000*((e+N)^2 - e^2) — the SAME coefficient for every one of the 6
  // stats, which is what makes a gold budget and a raw-point budget
  // proportional via one shared curve rather than needing a per-stat
  // conversion.
  function goldCostForPoints(currentRaw, addPoints) {
    currentRaw = currentRaw || 0;
    addPoints = Math.max(0, addPoints || 0);
    return fighterStatPurchaseCost(currentRaw, currentRaw + addPoints);
  }

  // Inverts the cost formula for a SINGLE stat: the highest raw level
  // reachable from currentRaw given goldBudget. (e+t)(t-e)/2*10000<=budget
  // => t <= sqrt(budget/5000 + e^2).
  function maxLevelForBudget(currentRaw, goldBudget) {
    currentRaw = currentRaw || 0;
    if (!(goldBudget > 0)) return currentRaw;
    return Math.sqrt(goldBudget / 5000 + currentRaw * currentRaw);
  }

  // Maximises damage * (1 + critChance*critDamage) over a GOLD budget split
  // between the two stats. Because both stats share the identical quadratic
  // cost curve (fighters.statPurchase.costFormula), a fixed gold budget
  // traces a CIRCLE in (Damage-raw-level, CritDamage-raw-level) space —
  // D^2 + C^2 = goldBudget/5000 + D0^2 + C0^2 — not a straight line the way
  // a fixed RAW-POINT budget would. This supersedes an earlier, wrong
  // assumption in this project that the split converges to 50/50 raw
  // points: that was only true under a linear (points-budget) constraint,
  // and the real constraint is this circle. Solved numerically (ternary
  // search over the circle's angle) rather than forcing a closed form — the
  // Lagrange condition here doesn't reduce to one cleanly once the flatBase/
  // "+1" baseline terms are included, and this is cheap arithmetic either way.
  function splitDamageCritDamageByGold({ goldBudget, currentDamageRaw, currentCritDamageRaw, critChance }) {
    const D0 = currentDamageRaw || 0, C0 = currentCritDamageRaw || 0;
    if (!(goldBudget > 0)) return { damageRaw: D0, critDamageRaw: C0, damagePoints: 0, critDamagePoints: 0 };
    const a = FIGHTER_PER_POINT_SCALE.damage, b = FIGHTER_FLAT_BASE.damage;
    const p = (critChance || 0) * FIGHTER_PER_POINT_SCALE.critDamage;
    const K = goldBudget / 5000 + D0 * D0 + C0 * C0;
    const sqrtK = Math.sqrt(Math.max(0, K));

    let D, C;
    if (!(p > 0)) {
      // No crit chance at all -> Crit Damage is worth literally zero; every
      // point of the budget goes to Damage. C cannot go BELOW its current
      // level (points aren't un-spent), so the circle degenerates to that.
      D = Math.sqrt(Math.max(D0 * D0, K - C0 * C0));
      C = C0;
    } else {
      const f = (theta) => {
        const d = sqrtK * Math.cos(theta), c = sqrtK * Math.sin(theta);
        return (a * d + b) * (p * c + 1);
      };
      let lo = 0, hi = Math.PI / 2;
      for (let i = 0; i < 60; i++) {
        const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
        if (f(m1) < f(m2)) lo = m1; else hi = m2;
      }
      const theta = (lo + hi) / 2;
      D = sqrtK * Math.cos(theta);
      C = sqrtK * Math.sin(theta);
    }
    D = Math.max(D, D0);
    C = Math.max(C, C0);
    return {
      damageRaw: Math.round(D), critDamageRaw: Math.round(C),
      damagePoints: Math.max(0, Math.round(D - D0)), critDamagePoints: Math.max(0, Math.round(C - C0)),
    };
  }

  // The chance an attack lands. The 0.95 ceiling is why "buy Hit to the cap"
  // was ever tempting — and, as it turns out, exactly why it is wrong.
  function hitChanceAt(hitRaw, bossLevel, gearHitBonus) {
    const hf = statFinalFromRaw('Hit', hitRaw) + (gearHitBonus || 0);
    const dodge = bossDodgeAtLevel(bossLevel);
    if (!(hf > 0)) return 0.25;
    return Math.min(0.95, Math.max(0.25, 0.25 + 0.75 * hf / (hf + dodge)));
  }

  // Expected damage per attack — the thing actually being maximised.
  //
  // EVERY TERM IS A TOTAL: gear + implicits + flat base + points bought. The
  // first version of this used only the purchased part, which is not a smaller
  // version of the same problem — it is a different one. Because the three
  // terms MULTIPLY, a gear bonus on one of them changes the marginal value of
  // buying more of the OTHERS, so ignoring gear does not merely under-report
  // the damage, it moves the optimal split.
  function expectedDamage({ hitRaw, damageRaw, critDamageRaw, bossLevel, critChance, gearHitBonus, gearDamageBonus, gearCritDamageBonus }) {
    return hitChanceAt(hitRaw, bossLevel, gearHitBonus)
      * (statFinalFromRaw('Damage', damageRaw) + (gearDamageBonus || 0))
      * (1 + (critChance || 0) * (statFinalFromRaw('Crit Damage', critDamageRaw) + (gearCritDamageBonus || 0)));
  }

  // ONE JOINT OPTIMISATION OVER ALL THREE STATS — corrected 2026-09-08.
  //
  // ── WHAT WAS WRONG, AND BY HOW MUCH ──────────────────────────────────────
  //
  // The previous version bought Hit FIRST, all the way to its saturation
  // target, and only then split whatever was left between Damage and Crit
  // Damage. Its stated justification was that "past the cap a Hit level is
  // worth literally zero while Damage/Crit Damage never stop paying off".
  // That argument is sound and proves only that you must not go PAST the cap.
  // It says nothing about whether you should go TO it — and the answer is no.
  //
  // **At the cap, the marginal value of Hit is exactly zero** (that is what a
  // cap means), while Damage and Crit Damage still have strictly positive
  // marginal value. So the last gold spent reaching the cap always buys less
  // than the same gold spent elsewhere: the optimum is strictly BELOW it.
  // Measured at boss L400 with a covering budget: **+7.2% expected damage**
  // from stopping at ~91% hit chance instead of 95%.
  //
  // The shortfall case was far worse, and was not a rounding error. When the
  // budget could not reach the cap, the old code put the ENTIRE budget into
  // Hit and left Damage and Crit Damage at zero — a fighter with a good chance
  // to land an attack that does nothing. Measured at the same boss level:
  // **78x worse at a 1b budget, 1479x worse at 100b.** The old comment called
  // this "reasonable since Hit multiplies the whole attack", which confuses
  // multiplying with mattering: 0.65 x 0 is not better than 0.52 x 384.
  //
  // ── THE STRUCTURE, WHICH IS THE SAME ONE, ONE DIMENSION UP ───────────────
  //
  // All six stats share the identical quadratic cost curve, so a gold budget
  // is a SPHERE in (Hit, Damage, CritDamage) raw-level space:
  //   H^2 + D^2 + C^2 = goldBudget/5000 + H0^2 + D0^2 + C0^2
  // The old Damage/CritDamage split already used exactly this insight in 2D (a
  // circle). Fixing Hit first is what flattened a sphere into a circle and
  // threw away the dimension that mattered most.
  //
  // Solved numerically — coarse spherical grid, then ternary refinement on
  // each angle. Not closed-form on purpose: the hit-chance term is a saturating
  // rational function, and forcing a closed form would mean linearising the
  // one part of this whose curvature IS the finding.
  function allocateFighterForWorldBoss({ goldBudget, bossLevel, currentHitRaw, currentDamageRaw, currentCritDamageRaw, critChance, gearHitBonus, gearDamageBonus, gearCritDamageBonus }) {
    const H0 = Math.max(0, currentHitRaw || 0);
    const D0 = Math.max(0, currentDamageRaw || 0);
    const C0 = Math.max(0, currentCritDamageRaw || 0);
    const hitTargetFinal = hitTargetForBossLevel(bossLevel);
    const hitTargetRaw = Math.max(H0, rawPointsForFinalStat('Hit', hitTargetFinal, gearHitBonus || 0));
    const hitCostToCap = goldCostForPoints(H0, hitTargetRaw - H0);

    const K = Math.max(0, goldBudget || 0) / 5000 + H0 * H0 + D0 * D0 + C0 * C0;
    const R = Math.sqrt(K);

    // Points already bought cannot be un-bought, so every candidate is floored
    // at the current level. (H0,D0,C0) is always inside the sphere by
    // construction, so a feasible point always exists.
    const at = (phi, theta) => {
      const H = Math.max(H0, R * Math.sin(phi) * Math.cos(theta));
      const D = Math.max(D0, R * Math.sin(phi) * Math.sin(theta));
      const C = Math.max(C0, R * Math.cos(phi));
      return { H, D, C };
    };
    const score = (phi, theta) => {
      const p = at(phi, theta);
      return expectedDamage({
        hitRaw: p.H, damageRaw: p.D, critDamageRaw: p.C, bossLevel, critChance,
        gearHitBonus, gearDamageBonus, gearCritDamageBonus,
      });
    };

    // Coarse grid first. The product of a saturating term and two increasing
    // ones is well-behaved here but not provably unimodal, and seeding the
    // refinement from a grid costs ~1600 evaluations of pure arithmetic.
    const HALF_PI = Math.PI / 2;
    let bestPhi = HALF_PI / 2, bestTheta = HALF_PI / 2, bestVal = -Infinity;
    const G = 40;
    for (let i = 0; i <= G; i++) {
      for (let j = 0; j <= G; j++) {
        const phi = HALF_PI * i / G, theta = HALF_PI * j / G;
        const v = score(phi, theta);
        if (v > bestVal) { bestVal = v; bestPhi = phi; bestTheta = theta; }
      }
    }
    // Then ternary-refine each angle in turn, around the grid cell that won.
    const cell = HALF_PI / G;
    for (let pass = 0; pass < 4; pass++) {
      let lo = Math.max(0, bestPhi - cell), hi = Math.min(HALF_PI, bestPhi + cell);
      for (let k = 0; k < 40; k++) {
        const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
        if (score(m1, bestTheta) < score(m2, bestTheta)) lo = m1; else hi = m2;
      }
      bestPhi = (lo + hi) / 2;
      lo = Math.max(0, bestTheta - cell); hi = Math.min(HALF_PI, bestTheta + cell);
      for (let k = 0; k < 40; k++) {
        const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
        if (score(bestPhi, m1) < score(bestPhi, m2)) lo = m1; else hi = m2;
      }
      bestTheta = (lo + hi) / 2;
    }

    const best = at(bestPhi, bestTheta);
    const hitRaw = Math.round(best.H);
    const damageRaw = Math.round(best.D);
    const critDamageRaw = Math.round(best.C);
    const achievedHitChance = hitChanceAt(hitRaw, bossLevel, gearHitBonus);

    return {
      hitRaw, hitPoints: Math.max(0, hitRaw - H0),
      damageRaw, damagePoints: Math.max(0, damageRaw - D0),
      critDamageRaw, critDamagePoints: Math.max(0, critDamageRaw - C0),
      // Reported so the UI can SAY what it chose rather than implying a cap was
      // aimed for. `hitFullyCovered` is kept for the existing log line but now
      // means "the budget could have reached the cap", not "we spent it there".
      achievedHitChance,
      stoppedBelowCap: hitRaw < hitTargetRaw,
      hitTargetFinal, hitTargetRaw, hitCostGold: hitCostToCap,
      hitFullyCovered: hitCostToCap <= (goldBudget || 0),
      expectedDamage: expectedDamage({
        hitRaw, damageRaw, critDamageRaw, bossLevel, critChance,
        gearHitBonus, gearDamageBonus, gearCritDamageBonus,
      }),
      gearHitBonus: gearHitBonus || 0, gearDamageBonus: gearDamageBonus || 0, gearCritDamageBonus: gearCritDamageBonus || 0,
    };
  }

  // ==== legacy sqrt-budget scaling — for friend-format compatibility, and for ====
  // ==== re-scaling any non-World-Boss profile against a new live budget      ====
  const BUDGET_SAFETY = 0.9995; // matches the community script's own constant, so a shared profile scales identically in both tools
  function scaleLevel(level, playerBudgetB, sourceBudgetB) {
    if (!(sourceBudgetB > 0) || !(playerBudgetB > 0)) return Math.max(0, Math.round(level || 0));
    return Math.max(0, Math.round((level || 0) * Math.sqrt((playerBudgetB * BUDGET_SAFETY) / sourceBudgetB)));
  }

  // ==== profile schema ====
  //
  // Class-keyed, not position-keyed (the community script's format keys by
  // grid position) — this is what makes "apply even if my class order is
  // different" fall out of the data model instead of needing a special case.
  // { id, name, category, createdAt, updatedAt, source, archived,
  //   classLayout: [6 class names, position order at save time — display/export only],
  //   stats: { className: { Health, Damage, Hit, Dodge, Defense, "Crit Damage" } },
  //   sourceBudgetB, meta: { bossLevel? } }

  function newProfileId() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function emptyStatBlock() {
    const s = {};
    for (const stat of STATS) s[stat] = 0;
    return s;
  }

  function makeProfile(partial) {
    const now = Date.now();
    return Object.assign({
      id: newProfileId(),
      name: 'Untitled plan',
      category: 'Other',
      createdAt: now,
      updatedAt: now,
      source: 'You',
      archived: false,
      classLayout: [],
      stats: {},
      sourceBudgetB: null,
      meta: {},
    }, partial);
  }

  // ==== profile store — dirty-flag + debounced flush, exactly eta-tracker's ====
  // ==== pattern (INSTRUMENTATION.md §5 S1): no per-change synchronous write  ====
  let profiles = [];
  let storeDirty = false;
  function markDirty() { storeDirty = true; }

  function flushStore() {
    if (!storeDirty) return;
    storeDirty = false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ profiles, savedAt: Date.now() }));
    } catch (e) { /* storage unavailable, ignore */ }
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && Array.isArray(saved.profiles)) profiles = saved.profiles;
    } catch (e) { profiles = []; }
  }

  function upsertProfile(profile) {
    const i = profiles.findIndex((p) => p.id === profile.id);
    profile.updatedAt = Date.now();
    if (i === -1) profiles.push(profile); else profiles[i] = profile;
    markDirty();
    return profile;
  }
  function deleteProfileHard(id) {
    profiles = profiles.filter((p) => p.id !== id);
    markDirty();
  }
  function setArchived(id, archived) {
    const p = profiles.find((x) => x.id === id);
    if (p) { p.archived = archived; p.updatedAt = Date.now(); markDirty(); }
  }
  // For the table's inline Edit — only ever touches name/category/source/
  // updatedAt (the columns the user asked to be editable there; the stat
  // allocation itself is not). updatedAt defaults to now UNLESS the caller
  // explicitly supplied one (editing the Updated date itself is one of the
  // four editable fields, so a save must be able to set it deliberately,
  // not just always overwrite it with "now").
  function updateProfileFields(id, fields) {
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    Object.assign(p, fields);
    if (!('updatedAt' in fields)) p.updatedAt = Date.now();
    markDirty();
  }
  function duplicateProfile(id, newName) {
    const p = profiles.find((x) => x.id === id);
    if (!p) return null;
    const copy = makeProfile(Object.assign({}, JSON.parse(JSON.stringify(p)), {
      id: newProfileId(), name: newName || (p.name + ' (copy)'), createdAt: Date.now(),
    }));
    profiles.push(copy);
    markDirty();
    return copy;
  }

  // ==== import: auto-detect the community script's two shapes, plus our own ====
  //
  // Mirrors normalizeImportedPlan's branch logic (the community Tampermonkey
  // "Fighter Optimizer" script) as the reference mapping, ported rather than
  // copied: proper Error messages surfaced in-panel instead of alert()/thrown
  // strings, and no client-side mutation of global state mid-parse.
  function detectAndNormalizeImport(raw, defaultName) {
    if (!raw || typeof raw !== 'object') throw new Error('That is not a valid plan (not a JSON object).');

    if (raw.format === 'apoz-fighter-allocator-v1') {
      return normalizeNativeExport(raw);
    }
    if (Array.isArray(raw.allocations)) {
      return normalizeFriendPlanRows(raw, defaultName);
    }
    if (Array.isArray(raw.layout) && raw.stats && typeof raw.stats === 'object') {
      return normalizeFriendSetupShape(raw, defaultName);
    }
    throw new Error('Unrecognised plan format — expected a Fighter Optimizer gold-plan export, '
      + 'a class/layout setup object, or a plan exported from this tool.');
  }

  function normalizePositionName(name) {
    const idx = POSITIONS.findIndex((p) => p.toLowerCase() === String(name || '').trim().toLowerCase());
    if (idx !== -1) return idx;
    const n = parseInt(name, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 6) return n - 1;
    return -1;
  }

  function findSourceBudgetB(data) {
    if (!data || typeof data !== 'object') return null;
    const aliases = new Set(['budgetb', 'budgetbillions', 'sourcebudgetb', 'additionalbudgetb',
      'additionalbudgetbillions', 'budget', 'additionalbudget', 'goldbudget', 'totalbudget',
      'usablegold', 'usablegoldb']);
    for (const [key, value] of Object.entries(data)) {
      if (aliases.has(String(key).toLowerCase().replace(/[^a-z0-9]/g, ''))) {
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
      }
    }
    for (const value of Object.values(data)) {
      if (value && typeof value === 'object') {
        const found = findSourceBudgetB(value);
        if (found) return found;
      }
    }
    return null;
  }

  // { allocations: [{position, fighter, stat, recommended}, ...], sourceBudgetB|budgetB, name }
  function normalizeFriendPlanRows(raw, defaultName) {
    const layout = new Array(6).fill(null);
    const stats = {};
    for (const row of raw.allocations) {
      const fighter = row.fighter || row.Fighter;
      const posIdx = normalizePositionName(row.position ?? row.Position ?? row.slot ?? row.Slot);
      const stat = STATS.find((s) => s.toLowerCase() === String(row.stat || row.Stat || '').toLowerCase());
      const level = Number(row.recommended ?? row.Recommended ?? row.level ?? row.Level);
      if (!fighter || posIdx === -1 || !stat || !Number.isFinite(level)) {
        throw new Error('Each row needs a recognisable Position, Fighter, Stat and Recommended level.');
      }
      layout[posIdx] = fighter;
      if (!stats[fighter]) stats[fighter] = emptyStatBlock();
      stats[fighter][stat] = Math.max(0, Math.round(level));
    }
    if (layout.some((c) => !c)) throw new Error('Imported plan is missing one or more fighter positions.');
    const sourceBudgetB = findSourceBudgetB(raw);
    return makeProfile({
      name: raw.name || defaultName || 'Imported plan',
      classLayout: layout,
      stats,
      sourceBudgetB,
      source: 'Imported (Fighter Optimizer)',
    });
  }

  // { layout: [6 class names], stats: { className: { Health, Damage, ... } } }
  function normalizeFriendSetupShape(raw, defaultName) {
    const layout = raw.layout.slice(0, 6);
    if (layout.length !== 6 || layout.some((c) => !c)) {
      throw new Error('layout must name exactly 6 fighter classes.');
    }
    const stats = {};
    for (const cls of layout) {
      const src = raw.stats[cls] || {};
      stats[cls] = emptyStatBlock();
      for (const stat of STATS) {
        const v = Number(src[stat]);
        if (Number.isFinite(v)) stats[cls][stat] = Math.max(0, Math.round(v));
      }
    }
    return makeProfile({
      name: raw.label || raw.name || defaultName || 'Imported setup',
      classLayout: layout,
      stats,
      sourceBudgetB: findSourceBudgetB(raw),
      source: 'Imported (Fighter Optimizer)',
    });
  }

  function normalizeNativeExport(raw) {
    if (!raw.stats || typeof raw.stats !== 'object') throw new Error('Missing "stats".');
    return makeProfile({
      name: raw.name || 'Imported plan',
      category: CATEGORIES.includes(raw.category) ? raw.category : 'Other',
      classLayout: Array.isArray(raw.classLayout) ? raw.classLayout : [],
      stats: raw.stats,
      sourceBudgetB: raw.sourceBudgetB || null,
      source: raw.source || 'Imported',
      meta: raw.meta || {},
    });
  }

  // ==== export ====

  function exportNative(profile) {
    return JSON.stringify({
      format: 'apoz-fighter-allocator-v1',
      name: profile.name,
      category: profile.category,
      classLayout: profile.classLayout,
      stats: profile.stats,
      sourceBudgetB: profile.sourceBudgetB,
      source: profile.source,
      meta: profile.meta,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  // Reconstructs a queslar-scaled-gold-plan-v2-shaped JSON — the community
  // script's own import format — so a profile built here can be handed back
  // unchanged. Requires the profile's classLayout (position order); a
  // class-keyed profile with no recorded layout cannot be position-exported.
  function exportFriendFormat(profile) {
    if (!profile.classLayout || profile.classLayout.length !== 6) {
      throw new Error('This profile has no recorded 6-position layout to export against — '
        + 'load it once against a live formation, then export.');
    }
    const budgetB = profile.sourceBudgetB || 100;
    const allocations = [];
    profile.classLayout.forEach((cls, i) => {
      const stats = profile.stats[cls] || emptyStatBlock();
      for (const stat of STATS) {
        allocations.push({
          position: POSITIONS[i], fighter: cls, stat, current: 0,
          recommended: stats[stat] || 0, add: stats[stat] || 0,
        });
      }
    });
    return JSON.stringify({
      format: 'queslar-scaled-gold-plan-v2', version: '2.1.11',
      name: profile.name, savedAt: new Date().toISOString(),
      sourceBudgetB: budgetB, budgetB, allocations,
    }, null, 2);
  }

  // ==== class-order-independent resolution ====
  //
  // Resolves a profile's class-keyed stats against whatever the LIVE
  // position->class layout currently is — the actual fix for "allocate even
  // if my class order is wrong". Never assumes; reports exactly what did and
  // did not match so the caller can put a real warning in front of the user
  // rather than silently skipping or silently guessing.
  function resolveProfileAgainstLayout(profile, liveLayout) {
    const classCounts = {};
    for (const cls of liveLayout) classCounts[cls] = (classCounts[cls] || 0) + 1;
    const duplicatesOnPage = Object.keys(classCounts).filter((c) => classCounts[c] > 1);

    const matched = [];
    const unmatched = [];
    for (const cls of Object.keys(profile.stats)) {
      const index = liveLayout.indexOf(cls);
      if (index === -1) unmatched.push(cls);
      else matched.push({ class: cls, index });
    }
    return { matched, unmatched, duplicatesOnPage };
  }

  // ==== DOM read/assist layer ====
  //
  // BEST-EFFORT PORT of the community "Fighter Optimizer" script's own DOM
  // probing, hardened where practical — NOT yet smoke-tested against a live
  // page (no browser access from where this was written). Per CONVENTIONS.md's
  // write-inversion rule, verify every selector below against
  // test.v2.queslar.com before this ever touches the live account; treat
  // this section as the one part of the module still owed that pass.

  function text(el) {
    return (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function getClassFromButton(btn) {
    const t = text(btn);
    return ALL_CLASSES.find((cls) => t === cls || t.includes(cls)) || null;
  }

  // Same visual-geometry heuristic the community script uses to find the 6
  // formation buttons (no stable id/data-attribute observed on this page) —
  // flagged here, not hidden, because a geometry heuristic is exactly the
  // kind of thing a page redesign silently breaks.
  function getClassButtons() {
    const buttons = [...document.querySelectorAll('button')].filter((btn) => {
      const rect = btn.getBoundingClientRect();
      const cls = getClassFromButton(btn);
      const style = getComputedStyle(btn);
      return cls && rect.width >= 70 && rect.width <= 240 && rect.height >= 28 && rect.height <= 70
        && rect.top > 150 && style.display !== 'none' && style.visibility !== 'hidden'
        && Number(style.opacity || 1) > 0;
    });
    const seen = new Set();
    const unique = [];
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      const key = `${Math.round(rect.left)}-${Math.round(rect.top)}-${getClassFromButton(btn)}`;
      if (!seen.has(key)) { seen.add(key); unique.push(btn); }
    }
    if (unique.length < 6) return unique;
    const byX = [...unique].sort((a, b) => {
      const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
      return (ar.left + ar.width / 2) - (br.left + br.width / 2);
    });
    const bestSix = byX.length > 6 ? byX.slice(0, 6) : byX;
    const centers = bestSix.map((btn) => { const r = btn.getBoundingClientRect(); return r.left + r.width / 2; });
    let splitIndex = 3, largestGap = -Infinity;
    for (let i = 1; i < centers.length; i++) {
      const gap = centers[i] - centers[i - 1];
      if (gap > largestGap) { largestGap = gap; splitIndex = i; }
    }
    let front = bestSix.slice(0, splitIndex), back = bestSix.slice(splitIndex);
    if (front.length !== 3 || back.length !== 3) { front = bestSix.slice(0, 3); back = bestSix.slice(-3); }
    front.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    back.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    return [...front, ...back];
  }

  function getLiveClassLayout() {
    return getClassButtons().map((btn) => getClassFromButton(btn));
  }

  // "PRESET ALLOCATED 0 / 236.49b" — Core.parseNumber handles the k/m/b/t/…
  // ladder AND the account's own decimal/thousands convention, so this reads
  // the number after the slash without any hand-rolled suffix parsing.
  function getTotalBudget() {
    const pageText = document.body.innerText || '';
    const idx = pageText.toUpperCase().indexOf('PRESET ALLOCATED');
    if (idx === -1) return null;
    const section = pageText.slice(idx, idx + 300);
    const m = section.match(/\/\s*([\d.,]+\s*[a-z]{0,2})/i);
    if (!m) return null;
    const v = Core.parseNumber(m[1].replace(/\s+/g, ''));
    return (v && v > 0) ? v : null;
  }

  function findStatCard(statName) {
    const cards = [...document.querySelectorAll('div')].filter((el) => text(el).startsWith(statName) && el.querySelector('input'));
    return cards[0] || null;
  }

  function findStatInput(statName) {
    return findStatCard(statName)?.querySelector('input') || null;
  }

  // THE GAME'S OWN TOTAL FOR A STAT, read off the allocation screen.
  //
  // Reported by the user 2026-09-08 and it is the best source available: the
  // number beside each slider shows the GEAR TOTAL when the allocation is 0,
  // and rises as points are added. So it already folds in gear, implicits,
  // enchants and anything else — including sources nobody here has enumerated,
  // which is precisely the failure mode of adding up items by hand.
  //
  // Preferred over the fiber walk for exactly that reason. The fiber read
  // stays as a fallback because this one depends on the card's rendered text,
  // and text layout is the least stable thing on a page we do not own.
  //
  // Parsed by taking the largest number in the card that is NOT the input's
  // own value: the card also contains the allocation number itself, and on a
  // fresh preset both can be present. Uses Core.parseNumber, so it honours the
  // account's decimal convention rather than assuming a locale.
  function readStatTotalFromCard(statName) {
    const card = findStatCard(statName);
    if (!card) return null;
    const input = card.querySelector('input');
    const own = input ? Core.parseNumber(input.value) : null;
    // THE MAGNITUDE SUFFIX MUST TRAVEL WITH THE NUMBER. `Core.parseNumber`
    // understands "744,70k"; a `[\d.,]+` match hands it "744,70" and loses the
    // k — a 1000x error that produces a plausible-looking small number rather
    // than an obvious failure. That is exactly how the first version read a
    // gear Crit Damage of 5,380 against a true value near 10, and then planned
    // 9 Crit Damage points off it.
    const nums = (text(card).match(/\d[\d.,]*\s*[a-z]{0,2}/gi) || [])
      .map((s) => Core.parseNumber(s))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!nums.length) return null;
    const candidates = nums.filter((n) => own == null || n !== own);
    if (!candidates.length) return null;
    return Math.max(...candidates);
  }

  // Gear contribution = the displayed total minus what the bought points
  // contribute. Floored at 0: negative would mean the two reads disagree, and
  // carrying that into the objective would bias every allocation for that
  // fighter rather than failing visibly.
  // Returns null — REFUSES — rather than clamping, when the displayed total
  // cannot be what it claims to be.
  //
  // The total must at least cover what the bought points alone contribute; a
  // smaller number means the read grabbed some other number on the card, not
  // the total. The first version clamped that case to 0, so a failed read
  // arrived at the optimiser as "this fighter has no gear" — indistinguishable
  // from a true zero, and acted on with full confidence. Wrong gear data is
  // worse than none, because none is at least the plan we already had.
  function gearFromDisplayedTotal(stat, displayedTotal, boughtPoints) {
    if (!Number.isFinite(displayedTotal)) return null;
    const fromPoints = statFinalFromRaw(stat, boughtPoints || 0) - FIGHTER_FLAT_BASE[STAT_KEY[stat] || stat];
    if (displayedTotal < fromPoints) return null;
    return displayedTotal - fromPoints;
  }

  // The one write this module performs — Assist, not Act (INSTRUMENTATION.md
  // §7): fills a value into a real input the game already renders. It never
  // clicks Save; the player commits their own allocation. Ported from the
  // community script's setReactInput, same mechanism (React's own value
  // setter, then input+change events) since it's the part already proven to
  // work reliably against this page.
  function setReactInput(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Fills every matched position's 6 stat inputs. Non-World-Boss profiles
  // (or a World-Boss profile applied at a different budget than it was
  // saved at) are rescaled via the same sqrt relationship the community
  // script uses, so a shared plan behaves identically in both tools.
  // shouldAbort() is checked once per fighter — the Stop button during an
  // allocation; the whole thing is quick, so a per-fighter grain is enough,
  // it never leaves a fighter half-filled.
  async function applyResolved(matched, profile, liveButtons, budgetB, log, shouldAbort) {
    for (const { class: cls, index } of matched) {
      if (shouldAbort && shouldAbort()) throw new Error('Stopped.');
      const fighterStats = profile.stats[cls];
      liveButtons[index].closest('div')?.click();
      if (log) log(`Selecting ${cls}…`);
      await sleep(700);
      for (const stat of STATS) {
        const input = findStatInput(stat);
        if (!input) throw new Error(`Could not find the ${stat} input for ${cls} — the page layout may have changed.`);
        const target = scaleLevel(fighterStats[stat], budgetB, profile.sourceBudgetB || budgetB);
        setReactInput(input, target);
        await sleep(250);
      }
      await sleep(400);
    }
  }

  // ==== UI ====

  const ui = {};
  let windowHandle = null;
  let panelOpen = false;
  let liveBudgetB = null;
  let liveLayout = [];

  function refreshLiveReads() {
    liveBudgetB = getTotalBudget();
    liveLayout = getLiveClassLayout();
  }

  function categoryBadge(category) {
    const span = document.createElement('span');
    span.textContent = category;
    span.style.cssText = 'font-size:10px; opacity:.7; border:1px solid var(--apoz-border, var(--border)); border-radius:3px; padding:1px 5px;';
    return span;
  }

  // "7 Sept" — day + abbreviated month, no year (a saved-plans list doesn't
  // span years in practice, and the fuller date is one hover away via the
  // title attribute set where this is used).
  function formatShortDate(ms) {
    if (!ms) return '—';
    const d = new Date(ms);
    return `${d.getDate()} ${d.toLocaleDateString(undefined, { month: 'short' })}`;
  }

  const INLINE_EDIT_INPUT_CSS = 'width:100%; font: inherit; font-size:11px; box-sizing:border-box; '
    + 'background: var(--apoz-input, var(--input)); color: var(--apoz-foreground, var(--foreground)); '
    + 'border: 1px solid var(--apoz-border, var(--border)); border-radius:4px; padding:3px 5px;';

  // A square icon action button for the table's actions column — Allocate/
  // Share stay as their own labelled/icon buttons (feedback: "Allocate is
  // good", "share is good"); this is for Archive/Delete/Edit/Save/Cancel,
  // which read as too heavy as a third/fourth/fifth text label in a row.
  // Always carries a hover tooltip (data-tooltip, not native title) per
  // "all buttons need hover-over info, especially condensed text or icons".
  function buildIconBtn({ svg, tooltip, danger, onClick }) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'apoz-ui-icon-btn' + (danger ? ' apoz-ui-btn-danger' : '');
    btn.setAttribute('data-tooltip', tooltip);
    btn.setAttribute('data-tooltip-right', '');
    btn.innerHTML = svg;
    btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    return btn;
  }
  const ICON = {
    archive: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="12" height="3" rx="0.6"/><path d="M3 6v6.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V6"/><path d="M6.5 8.5h3"/></svg>',
    unarchive: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="12" height="3" rx="0.6"/><path d="M3 6v6.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V6"/><path d="M8 11.5V8m0 0 1.6 1.6M8 8 6.4 9.6"/></svg>',
    trash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5h10M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M4.5 4.5 5 13a1.2 1.2 0 0 0 1.2 1.1h3.6A1.2 1.2 0 0 0 11 13l.5-8.5"/><path d="M6.7 7v4.3M9.3 7v4.3"/></svg>',
    edit: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2.5 13.5 5 5.8 12.7 2.5 13.5l0.8-3.3Z"/></svg>',
    save: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.3 6.3 11.5 13 4"/></svg>',
    cancel: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  };

  // Two shared configs (columns/actions), used for BOTH the active-plans
  // table and the archived one below it — same shape, so they read as one
  // consistent list split by a divider, not two different tables.
  function buildTableColumns() {
    return [
      { key: 'name', label: 'Name', render: (p) => {
        if (ui.editingProfileId === p.id) {
          const input = document.createElement('input');
          input.type = 'text'; input.value = p.name; input.style.cssText = INLINE_EDIT_INPUT_CSS;
          input.addEventListener('input', () => { ui.editDraft.name = input.value; });
          input.addEventListener('click', (e) => e.stopPropagation());
          return input;
        }
        const span = document.createElement('span');
        span.textContent = p.name;
        if (p.archived) span.style.opacity = '.55';
        return span;
      } },
      { key: 'category', label: 'Type', render: (p) => {
        if (ui.editingProfileId === p.id) {
          const select = document.createElement('select');
          select.style.cssText = INLINE_EDIT_INPUT_CSS;
          for (const c of CATEGORIES) {
            const opt = document.createElement('option');
            opt.value = c; opt.textContent = c; opt.selected = c === p.category;
            select.appendChild(opt);
          }
          select.addEventListener('change', () => { ui.editDraft.category = select.value; });
          select.addEventListener('click', (e) => e.stopPropagation());
          return select;
        }
        return categoryBadge(p.category);
      } },
      { key: 'classLayout', label: 'Classes (1→6)', info: 'Left Top → Left Middle → Left Bottom → Right Top → Right Middle → Right Bottom, the order fighters are attacked in.',
        render: (p) => (p.classLayout && p.classLayout.length ? p.classLayout.join(', ') : Object.keys(p.stats).join(', ')) },
      { key: 'source', label: 'Source', render: (p) => {
        if (ui.editingProfileId === p.id) {
          const input = document.createElement('input');
          input.type = 'text'; input.value = p.source || ''; input.style.cssText = INLINE_EDIT_INPUT_CSS;
          input.addEventListener('input', () => { ui.editDraft.source = input.value; });
          input.addEventListener('click', (e) => e.stopPropagation());
          return input;
        }
        const span = document.createElement('span');
        span.textContent = p.source || '';
        return span;
      } },
      { key: 'updatedAt', label: 'Updated', render: (p) => {
        if (ui.editingProfileId === p.id) {
          const input = document.createElement('input');
          input.type = 'date';
          input.value = p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : '';
          input.style.cssText = INLINE_EDIT_INPUT_CSS;
          input.addEventListener('input', () => {
            ui.editDraft.updatedAt = input.value ? new Date(input.value).getTime() : undefined;
          });
          input.addEventListener('click', (e) => e.stopPropagation());
          return input;
        }
        const span = document.createElement('span');
        span.textContent = formatShortDate(p.updatedAt);
        span.title = p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '';
        return span;
      } },
    ];
  }

  function saveProfileEdit(p) {
    const draft = ui.editDraft || {};
    const fields = {
      name: (draft.name !== undefined ? draft.name : p.name).trim() || p.name,
      category: draft.category !== undefined ? draft.category : p.category,
      source: draft.source !== undefined ? draft.source : p.source,
    };
    if (draft.updatedAt !== undefined) fields.updatedAt = draft.updatedAt;
    updateProfileFields(p.id, fields);
    ui.editingProfileId = null;
    ui.editDraft = null;
    rerenderProfiles();
    Core.toast('Plan updated.', { type: 'success', duration: 2500 });
  }

  function buildRowActions() {
    return [
      { render: (p) => {
        if (ui.editingProfileId === p.id) {
          return buildIconBtn({ svg: ICON.save, tooltip: 'Save changes', onClick: () => saveProfileEdit(p) });
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'apoz-ui-btn apoz-ui-btn-primary';
        btn.textContent = 'Allocate';
        btn.addEventListener('click', () => loadProfileFlow(p));
        return btn;
      } },
      { render: (p) => {
        if (ui.editingProfileId === p.id) {
          return buildIconBtn({
            svg: ICON.cancel, tooltip: 'Cancel',
            onClick: () => { ui.editingProfileId = null; ui.editDraft = null; rerenderProfiles(); },
          });
        }
        return buildIconBtn({
          svg: ICON.edit, tooltip: 'Edit name / type / source / date',
          onClick: () => { ui.editingProfileId = p.id; ui.editDraft = {}; rerenderProfiles(); },
        });
      } },
      { render: (p) => {
        if (ui.editingProfileId === p.id) return document.createElement('span'); // keeps column count stable while editing
        return buildIconBtn({
          svg: p.archived ? ICON.unarchive : ICON.archive,
          tooltip: p.archived ? 'Unarchive' : 'Archive',
          onClick: () => { setArchived(p.id, !p.archived); rerenderProfiles(); },
        });
      } },
      { render: (p) => {
        if (ui.editingProfileId === p.id) return document.createElement('span');
        return buildIconBtn({
          svg: ICON.trash, tooltip: 'Delete', danger: true,
          onClick: async () => {
            const ok = await Core.ui.confirmDialog({
              title: 'Delete plan', danger: true, confirmLabel: 'Delete',
              message: `Delete "${p.name}" permanently? This cannot be undone.`,
            });
            if (ok) { deleteProfileHard(p.id); rerenderProfiles(); }
          },
        });
      } },
      // Far-right, deliberately an icon not a label: sharing one plan out is
      // a much rarer action than Allocate/Edit/Archive/Delete.
      { render: (p) => (ui.editingProfileId === p.id ? document.createElement('span') : buildShareButton(p)) },
    ];
  }

  // Archived plans are visually distinct (dimmed name, above) AND physically
  // separated — their own table below a divider, not interleaved with active
  // plans, per explicit feedback.
  function renderProfileTable() {
    const wrap = document.createElement('div');
    const active = profiles.filter((p) => !p.archived);
    const archived = profiles.filter((p) => p.archived);
    const columns = buildTableColumns();
    const rowActions = buildRowActions();
    wrap.appendChild(Core.ui.table({ columns, rows: active, rowActions }));
    if (ui.showArchived && archived.length) {
      const divider = document.createElement('div');
      divider.style.cssText = 'border-top:1px solid var(--apoz-border, var(--border)); margin:10px 0 6px; '
        + 'padding-top:6px; font-size:9.5px; text-transform:uppercase; letter-spacing:.05em; opacity:.5;';
      divider.textContent = `Archived (${archived.length})`;
      wrap.appendChild(divider);
      wrap.appendChild(Core.ui.table({ columns, rows: archived, rowActions }));
    }
    return wrap;
  }

  function rerenderProfiles() {
    if (!ui.profileTableContainer) return;
    ui.profileTableContainer.innerHTML = '';
    ui.profileTableContainer.appendChild(renderProfileTable());
  }

  // ==== status bar — the bottom-of-window progress/result line for Allocate ====
  function setStatus(message, level) {
    if (!ui.statusBar) return;
    ui.statusBar.textContent = message;
    ui.statusBar.dataset.level = level || 'info';
  }

  let allocateAbort = false;

  // "Allocate" — the ONE action that touches the game page. Verifies it's on
  // the right page, resolves classes against the LIVE formation (order-
  // independent), fills every slider, then RE-READS each one to confirm the
  // page actually reflects the target — an internal check that doesn't
  // depend on guessing the shape of the game's own save-confirmation toast —
  // plus a best-effort watch for that toast too, since a real "the game
  // itself agrees" signal is worth having when it's there.
  async function loadProfileFlow(profile) {
    refreshLiveReads();
    setStatus(`Loading "${profile.name}"…`, 'info');
    if (!liveBudgetB) {
      setStatus('Could not read your usable preset gold — open the Fighters page first.', 'error');
      return;
    }
    const buttons = getClassButtons();
    if (buttons.length !== 6) {
      setStatus(`Expected 6 fighter slots, found ${buttons.length} — open the Fighters page first.`, 'error');
      return;
    }
    const resolution = resolveProfileAgainstLayout(profile, liveLayout);
    if (resolution.duplicatesOnPage.length) {
      const ok = await Core.ui.confirmDialog({
        title: 'Duplicate class detected',
        message: `Your formation has more than one ${resolution.duplicatesOnPage.join(', ')} — class-based matching is `
          + `ambiguous here. Continue anyway (first match wins), or cancel and fix your formation?`,
        confirmLabel: 'Continue anyway', danger: true,
      });
      if (!ok) { setStatus('Cancelled — duplicate class in your formation.', 'error'); return; }
    }
    if (resolution.unmatched.length) {
      const ok = await Core.ui.confirmDialog({
        title: 'Some classes not found',
        message: `This plan includes ${resolution.unmatched.join(', ')}, not present in your current formation. `
          + `Load anyway, skipping those?`,
        confirmLabel: 'Load anyway',
      });
      if (!ok) { setStatus('Cancelled — some classes were not in your formation.', 'error'); return; }
    }
    if (!resolution.matched.length) {
      setStatus('Nothing to load — no classes in this plan matched your current formation.', 'error');
      return;
    }
    allocateAbort = false;
    if (ui.stopAllocateBtn) ui.stopAllocateBtn.hidden = false;
    try {
      setStatus(`Filling sliders for ${resolution.matched.length} fighter(s)…`, 'info');
      await applyResolved(resolution.matched, profile, buttons, liveBudgetB,
        (msg) => setStatus(msg, 'info'), () => allocateAbort);

      setStatus('Verifying every slider landed on target…', 'info');
      const mismatches = await verifyAppliedValues(resolution.matched, profile, buttons, liveBudgetB);
      if (mismatches.length) {
        setStatus(`Filled, but ${mismatches.length} value(s) don't match what was requested — `
          + `${mismatches.slice(0, 3).map((m) => `${m.class} ${m.stat}: wanted ${m.want}, page shows ${m.got}`).join('; ')}. `
          + `Check before pressing Save Preset.`, 'error');
        return;
      }
      setStatus('All sliders confirmed on target. Press Save Preset in-game to commit — watching for confirmation…', 'success');
      const sawSaveToast = await watchForSaveConfirmation(15000);
      setStatus(sawSaveToast
        ? '✓ Successfully saved — the game confirmed it.'
        : 'Sliders are set and verified — press Save Preset in-game if you haven\'t yet (no in-game confirmation seen within 15s, but the values on the page are correct).',
      sawSaveToast ? 'success' : 'info');
    } catch (err) {
      console.error('[fighter-allocator]', err);
      setStatus(err.message === 'Stopped.' ? 'Stopped — some fighters may be partly filled, check before Save Preset.'
        : String(err.message || err), 'error');
    } finally {
      if (ui.stopAllocateBtn) ui.stopAllocateBtn.hidden = true;
    }
  }

  // Re-reads every filled stat input's CURRENT value and compares against
  // what applyResolved was asked to set — independent of trusting the fill
  // mechanism worked, and independent of the game's own toast wording.
  // FIXED 2026-09-08 — this was reporting mismatches that were not real.
  //
  // It clicked a fighter and read the inputs IMMEDIATELY. The page is an SPA:
  // the click schedules a re-render, it does not perform one. So the read
  // landed on whatever was still on screen — the PREVIOUS fighter's values —
  // and every fighter after the first was compared against its neighbour.
  //
  // The user's report is the proof: "Bastion Damage: wanted 3256, page shows
  // 3250" while Berserker's Damage was 3250, and "Bastion Crit Damage: wanted
  // 2278, page shows 2287" while Berserker's was 2287. Neighbouring fighters
  // have near-identical allocations, which is exactly why this looked like a
  // rounding problem rather than a stale read — and why the allocation was
  // always correct when checked by hand afterwards.
  //
  // The fix is not a fixed sleep. It POLLS until the field reaches the value
  // just written, with a timeout, so a genuine mismatch is still reported —
  // a fixed delay would only make the race less likely, and this check exists
  // precisely to be trusted before someone presses Save Preset.
  async function verifyAppliedValues(matched, profile, liveButtons, budgetB) {
    const mismatches = [];
    for (const { class: cls, index } of matched) {
      const fighterStats = profile.stats[cls];
      liveButtons[index].closest('div')?.click();

      for (const stat of STATS) {
        const want = scaleLevel(fighterStats[stat], budgetB, profile.sourceBudgetB || budgetB);
        let got = null;
        let input = null;
        // ~1.2s of patience, checked often. Settles in one or two ticks in the
        // normal case, so this costs nothing when the page is keeping up.
        for (let attempt = 0; attempt < 24; attempt++) {
          input = findStatInput(stat);
          if (input) {
            got = Core.parseNumber(input.value);
            if (got === want) break;
          }
          // eslint-disable-next-line no-await-in-loop
          await sleep(50);
        }
        if (!input) continue;
        if (got !== want) mismatches.push({ class: cls, stat, want, got });
      }
    }
    return mismatches;
  }

  // Best-effort, short-lived watch for the game's OWN save-confirmation
  // toast — scans newly-added elements for wording like "saved"/"success".
  // Not load-bearing: verifyAppliedValues() above is the real confirmation,
  // this is a bonus signal when the game's own UI happens to say so too.
  function watchForSaveConfirmation(timeoutMs) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (done) return; done = true; obs.disconnect(); clearTimeout(timer); resolve(v); };
      const obs = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            const t = (node.textContent || '').toLowerCase();
            if (/\b(saved|success)/.test(t) && t.length < 200) { finish(true); return; }
          }
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      const timer = setTimeout(() => finish(false), timeoutMs);
    });
  }

  // REWORKED: was a flat form (boss level / crit chance / gold-per-fighter,
  // all typed in by hand, one "Generate" button) sitting inline in the main
  // panel. Reported as confusing ("Gold/fighter still doesn't make sense to
  // me... everything should be calculated automatically") and it was
  // crowding the profile table, which should be what this window is mostly
  // about. Now: one button here, a dedicated window does the actual work —
  // scan every fighter's gear, compute, ready a profile — and the main
  // panel goes back to being the profile table front and center.
  function buildWorldBossLauncher() {
    const wrap = document.createElement('div');
    wrap.className = 'apoz-fa-group';
    wrap.style.cssText += 'flex-direction:row; align-items:center; justify-content:space-between; gap:10px;';

    const label = document.createElement('div');
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:bold; font-size:11px;';
    title.textContent = 'World Boss';
    const lastRun = document.createElement('div');
    lastRun.style.cssText = 'font-size:10px; opacity:.6;';
    lastRun.textContent = 'Not run yet this session.';
    label.appendChild(title);
    label.appendChild(lastRun);
    wrap.appendChild(label);
    ui.wbLastRunLine = lastRun;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'apoz-ui-btn apoz-ui-btn-primary';
    btn.textContent = 'Optimize for World Boss';
    btn.title = 'Scans every fighter\'s equipped Crit Chance, then computes the exact Hit target and '
      + 'Damage/Crit Damage split for the current World Boss level — no manual fields to fill in.';
    btn.addEventListener('click', () => openWorldBossOptimizer());
    wrap.appendChild(btn);

    return wrap;
  }

  // Best-effort: scans the page's own rendered text for "Fighter World Boss
  // Level N" (the exact Archive wording) and takes the FIRST match, which is
  // the most recent entry in a list that renders newest-first. Absent rather
  // than defaulted if the Archive isn't the current page/panel — the level
  // field is left for manual entry, never silently guessed.
  function readLatestFighterWorldBossLevel() {
    const text = document.body.innerText || '';
    const m = text.match(/Fighter World Boss Level\s+(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  // REPORTED BUG: the level was only ever read once, at panel-build time —
  // navigating TO the archive page afterwards did nothing. UNVERIFIED against
  // the real page — the archive route path and the "Fighter World Boss Level N"
  // wording it matches on are both taken from earlier session notes, not
  // re-confirmed live.
  let lastKnownBossLevel = null;
  function checkArchivePageForBossLevel() {
    if (!location.pathname.includes('/world-boss/archive')) return;
    const level = readLatestFighterWorldBossLevel();
    if (level) {
      lastKnownBossLevel = level;
      if (ui.optLevelInput && !ui.optLevelInput.value) ui.optLevelInput.value = String(level);
    }
  }
  // Route detection belongs to Core (v9's onNavigate), not here. This used to
  // wrap history.pushState/replaceState a SECOND time — Core already wraps
  // both — and run a 2s setInterval beside Core's own 3s heartbeat, so the page
  // carried two independent monkey-patches of the same two globals and this
  // module carried two timers. Core sees every signal this did (its history
  // hook, popstate, and the heartbeat that covers router internals bypassing
  // pushState), so subscribing gets the same coverage with none of the
  // duplication.
  //
  // The old local mechanism survives only as a fallback for an OLDER installed
  // Core: Tampermonkey updates each script separately, so a v8 Core with this
  // module is a real state, and it must degrade rather than go silent.
  function watchForArchivePage() {
    const onNav = () => setTimeout(checkArchivePageForBossLevel, 400); // let the SPA finish rendering the new route first

    if (typeof Core.onNavigate === 'function') {
      Core.onNavigate(onNav);
    } else {
      let lastPath = location.pathname;
      const onNavLegacy = () => {
        if (location.pathname === lastPath) return;
        lastPath = location.pathname;
        onNav();
      };
      try {
        const origPush = history.pushState.bind(history);
        history.pushState = function (...args) { const r = origPush(...args); onNavLegacy(); return r; };
        const origReplace = history.replaceState.bind(history);
        history.replaceState = function (...args) { const r = origReplace(...args); onNavLegacy(); return r; };
      } catch (e) { /* read-only history in some contexts — the poll below still covers it */ }
      window.addEventListener('popstate', onNavLegacy);
      setInterval(onNavLegacy, 2000);
    }

    checkArchivePageForBossLevel(); // covers a fresh load landing directly on the archive page
  }

  // REPLACES a broken page-text scan (confirmed live 2026-09-07: every
  // fighter came back "could not read" — clicking a formation slot shows
  // the stat-allocation panel, not gear text, exactly as HANDOFF.md's own
  // unverified-DOM-layer note predicted). Traced the REAL data shape from
  // the client bundle instead of guessing again (capture/raw bundle chunks
  // FighterEquipmentHoverCard-DCxqO59W.js / EquipmentCard-BTjWQlQe.js /
  // CharacterDataProvider-CoFUkJx8.js, 2026-09-07): an equipped item is
  // `{ _id, stats: [{type, value, tier, placement}, ...], ... }`, and Crit
  // Chance is just one array entry with `type === "fighterCritChance"` — no
  // dedicated field, no page text guaranteed to exist at all.
  //
  // Reads it via the SAME React-fiber-walk technique already used elsewhere
  // in this codebase (Core.walkFiber/probeCharacter) rather than a new
  // mechanism — `Core.walkFiberAll` (visits every match, doesn't stop at the
  // first) so multiple equipped items each contributing Crit Chance are
  // summed, not just the first one found. De-duplicates by the item's own
  // `_id` so re-scanning after another click can never double-count the
  // same item still resolved in the tree from before.
  //
  // UNVERIFIED end to end: the bundle confirms the SHAPE, not that this
  // data is actually reachable in the fiber tree from a plain formation-slot
  // click with nothing hovered (per the bundle trace, it may only resolve
  // while a specific item is being hovered, or a gear-selection modal is
  // open) — needs a live pass to confirm whether clicking alone is enough,
  // or whether hovering each equipped item first will be needed too.
  // ── THE WHOLE ASSEMBLED FIGHTER STAT BLOCK, NOT JUST CRIT CHANCE ────────
  //
  // Added 2026-09-08 after the user asked whether the optimiser accounts for
  // gear. It did not — and worse, it passed `currentHitRaw/Damage/CritDamage:
  // 0` hardcoded, so it planned every fighter as if they were naked with zero
  // purchased points. That is wrong in a way that changes the ANSWER, not just
  // the reported numbers: expected damage is
  //   hit(H_total) x D_total x (1 + critChance x CD_total)
  // and each total is gear + base + purchased. A fighter already carrying a
  // large gear Damage bonus gets proportionally less from buying more Damage,
  // which shifts the optimal split toward Crit Damage — and vice versa. Gear
  // Hit likewise reduces how many Hit points buy a given hit chance.
  //
  // SHAPE, traced from the shipped bundle (CODE-tier, 2026-09-07 capture):
  // `simulator.worker-B9yF9GIb.js` and `page-c4WAz33r.js` both carry the
  // fighter object's schema —
  //   { class, placement:{row,column}, stats: { health, healthMax, defense,
  //     damage, dodge, hit, critDamage, fighterMultistrike?,
  //     fighterCritChance?, fighterThorns?, fighterLifesteal?, fighterRegen?,
  //     fighterHealing? } }
  // Note which names are which: the BASE stats are plain (`hit`, `damage`,
  // `critDamage`); only the fighter-specific percentage stats carry the
  // `fighter` prefix. Looking for `fighterDamage` or `fighterHit` finds
  // nothing, because they do not exist.
  //
  // This is the fighter's TOTAL, already including gear, implicits and
  // purchased points — which is better than summing individual items, because
  // it cannot miss a source nobody thought to enumerate.
  // CORRECTED 2026-09-08, ON LIVE OUTPUT. The first version of this looked for
  // the fighter's ASSEMBLED stat block — `{ class, stats: { health, damage,
  // hit, critDamage, ... } }` — a shape that genuinely exists in the bundle
  // (`simulator.worker`, `page-c4WAz33r.js`). It reported "gear NOT read" for
  // all six fighters on a real account: that object is BUILT when submitting to
  // the simulator, it does not sit in React state waiting to be walked.
  //
  // What demonstrably IS reachable is the equipped ITEM, because the Crit
  // Chance read has been doing it successfully on this account all along.
  // So this generalises the mechanism already proven to work rather than
  // guessing at a third shape.
  //
  // ITEM SHAPE, from the bundle:
  //   { _id, name, rarity, iLevel, virtue,
  //     stats:     [{ type, tier, value }],
  //     implicits: [{ type, tier, value }] }
  // `value` is the RESOLVED amount, so item level and tier are already baked
  // into it — reading `value` is reading the gear's real contribution, which
  // is what the question "does it account for equipment level?" is asking.
  //
  // Base stat types are plain (`hit`, `damage`, `critDamage`); only the
  // fighter-specific percentage stats carry the `fighter` prefix. There is no
  // `fighterDamage` or `fighterHit` — grepping the bundle for them finds
  // nothing.
  const GEAR_STAT_TYPES = Object.freeze(['hit', 'damage', 'critDamage', 'fighterCritChance']);

  // THE TIER MULTIPLIER, WITHOUT WHICH EVERY GEAR READ IS SILENTLY TOO SMALL.
  //
  // An item's fiber `value` is the BASE ROLL, not what the game shows. The
  // displayed number is `value x (1 + boostPercent[tier]/100)`. Confirmed
  // three independent ways against one live item, 2026-09-08 — the user
  // supplied the rendered equipment card and the fiber dump for the same gear:
  //
  //   Damage      T16   267,668  x 4.50  = 1,204,506   card: "1,20m"
  //   Hit         T16   641,654  x 4.50  = 2,887,443   card: "2,89m"
  //   CritChance  T12   0.07127  x 3.50  = 0.24945     card: "24,95%"
  //
  // Three stats, two different tiers, all matching to display precision. That
  // is what makes this CROSS-tier rather than a plausible-looking guess.
  //
  // The consequence is not cosmetic: the scan had been reporting this account's
  // Crit Chance as 17.13% when it is ~34.95%, and every gear Hit/Damage figure
  // at between a fifth and a quarter of its real value.
  function equipmentTierMultiplier(tier) {
    const pct = EQUIPMENT_TIER_BOOST_PERCENT[(tier || 1) - 1];
    // Unknown tier -> 1x rather than 0x or a guess: an unrecognised tier should
    // under-report by the multiplier, never erase the stat entirely.
    return pct == null ? 1 : 1 + pct / 100;
  }

  // A PASTE-BACK PROBE, in the same spirit as `__apozDiag()` and
  // `__apozWhereIsTheNav()`. Two attempts at reading gear have now been made
  // from bundle-traced shapes, and one of them found nothing live. Rather than
  // guess a third time, this reports what the fiber walk ACTUALLY contains so
  // the next attempt is aimed at something real.
  //
  // Deliberately plain text and deliberately global: it is for pasting back,
  // not for programs. Open a fighter first so their gear is rendered.
  window.__apozFighterProbe = function () {
    const out = ['--- Apoz Fighter Allocator: gear probe ---'];
    if (!Core.walkFiberAll) {
      out.push('Core.walkFiberAll is missing — update Apoz Core.');
      const t = out.join('\n'); console.log(t); return t;
    }
    const shapes = new Map();
    let objects = 0;
    Core.walkFiberAll((cand) => {
      if (!cand || typeof cand !== 'object') return false;
      objects++;
      if (!Array.isArray(cand.stats)) return false;
      // Summarise by the SET of stat types it carries, so a hundred items
      // collapse into a handful of distinct shapes.
      const types = [...new Set(cand.stats.map((s) => s && s.type).filter(Boolean))].sort();
      const key = types.join(',') || '(no typed stats)';
      const rec = shapes.get(key) || { count: 0, sample: null };
      rec.count++;
      if (!rec.sample) {
        rec.sample = {
          keys: Object.keys(cand).slice(0, 12),
          firstStat: cand.stats[0] || null,
          implicits: Array.isArray(cand.implicits) ? cand.implicits.length : 'absent',
          iLevel: cand.iLevel ?? 'absent',
        };
      }
      shapes.set(key, rec);
      return false; // never stop; we want the whole picture
    });
    out.push(`objects visited: ${objects}`);
    out.push(`distinct stat-array shapes: ${shapes.size}`);
    for (const [types, rec] of shapes) {
      out.push(`\n  x${rec.count}  types: ${types}`);
      out.push(`      keys: ${rec.sample.keys.join(', ')}`);
      out.push(`      iLevel: ${rec.sample.iLevel}  implicits: ${rec.sample.implicits}`);
      out.push(`      first stat entry: ${JSON.stringify(rec.sample.firstStat)}`);
    }
    const scan = scanEquippedStatsViaFiber();
    out.push(`\nwhat the fiber item-scan makes of it: ${scan ? JSON.stringify(scan) : 'NOTHING FOUND'}`);
    if (scan && scan.items <= 2) {
      out.push('  NOTE: that is one or two ITEMS, not the whole loadout. The fiber only');
      out.push('  holds the card currently rendered, so this is a floor, never a total.');
    }

    // The allocation cards, verbatim. This is the half that decides whether
    // gear can be read at all, and every failure so far has been a parsing
    // failure rather than a missing element — so show the raw text, what was
    // tokenised out of it, and what each step concluded.
    out.push('\n--- allocation cards (the "page totals" source) ---');
    for (const stat of ['Hit', 'Damage', 'Crit Damage']) {
      const card = findStatCard(stat);
      if (!card) { out.push(`\n  ${stat}: NO CARD FOUND`); continue; }
      const input = card.querySelector('input');
      const raw = text(card);
      const tokens = raw.match(/\d[\d.,]*\s*[a-z]{0,2}/gi) || [];
      out.push(`\n  ${stat}:`);
      out.push(`    raw text: ${JSON.stringify(raw.slice(0, 220))}`);
      out.push(`    input value: ${JSON.stringify(input ? input.value : null)}`
        + ` -> parsed ${input ? Core.parseNumber(input.value) : 'n/a'}`);
      out.push(`    tokens -> parsed: ${tokens.map((t) => `${JSON.stringify(t)}=${Core.parseNumber(t)}`).join(', ') || '(none)'}`);
      const total = readStatTotalFromCard(stat);
      const bought = input ? Core.parseNumber(input.value) : 0;
      out.push(`    chosen total: ${total}`);
      out.push(`    points contribute: ${statFinalFromRaw(stat, bought || 0) - FIGHTER_FLAT_BASE[STAT_KEY[stat] || stat]}`);
      out.push(`    => gear: ${gearFromDisplayedTotal(stat, total, bought || 0) ?? 'REFUSED (total is below what the points alone contribute)'}`);
    }
    out.push('--- end ---');
    const text = out.join('\n');
    console.log(text);
    return text;
  };

  function scanEquippedStatsViaFiber() {
    if (!Core.walkFiberAll) return null;
    const seenItemIds = new Set();
    const sums = { hit: 0, damage: 0, critDamage: 0, fighterCritChance: 0 };
    let items = 0;
    Core.walkFiberAll((cand) => {
      if (!cand || !Array.isArray(cand.stats)) return false;
      const id = cand._id;
      if (id != null && seenItemIds.has(id)) return false;
      // Implicits count too: they are on the same item and contribute the same
      // way. Reading only `stats` would silently undercount every item that
      // carries one.
      const rows = cand.stats.concat(Array.isArray(cand.implicits) ? cand.implicits : []);
      let matched = false;
      for (const s of rows) {
        if (!s || typeof s.value !== 'number' || !GEAR_STAT_TYPES.includes(s.type)) continue;
        sums[s.type] += s.value * equipmentTierMultiplier(s.tier);
        matched = true;
      }
      if (!matched) return false;
      if (id != null) seenItemIds.add(id);
      items++;
      return true;
    });
    return items ? { ...sums, items } : null;
  }

  function scanEquippedCritChanceViaFiber() {
    if (!Core.walkFiberAll) return null;
    const seenItemIds = new Set();
    let sum = 0;
    let found = false;
    Core.walkFiberAll((cand) => {
      if (!cand || !Array.isArray(cand.stats)) return false;
      const id = cand._id;
      if (id != null && seenItemIds.has(id)) return false;
      const entry = cand.stats.find((s) => s && s.type === 'fighterCritChance');
      if (!entry || typeof entry.value !== 'number') return false;
      if (id != null) seenItemIds.add(id);
      sum += entry.value;
      found = true;
      return true;
    });
    if (!found) return null;
    // UNVERIFIED UNIT ASSUMPTION: treating entry.value as a decimal fraction
    // (0.125 = 12.5%), matching how this repo represents Crit Chance
    // everywhere else (fighters.critChance.base = 0.1). If the raw API
    // value turns out to be percent-scaled instead (12.5, not 0.125), this
    // undercounts by 100x — the sanity check below at least surfaces that
    // rather than silently trusting an implausible total.
    const total = 0.1 + sum; // fighters.critChance.base
    if (total > 5) {
      console.warn(`[fighter-allocator] scanned Crit Chance ${total} looks implausibly high — `
        + `entry.value may be percent-scaled, not a fraction. Treating as unreliable.`);
      return null;
    }
    return total;
  }

  // Best-effort FALLBACK, kept because it's cheap and harmless even though
  // it was confirmed broken from the formation view specifically: scans the
  // page's rendered text for every "Critical hit chance" row and sums the
  // percentages that follow it, plus the 0.1 base. Only ever reached if the
  // fiber-based reader above finds nothing.
  function scanEquippedCritChanceViaPageText() {
    const text = document.body.innerText || '';
    const matches = [...text.matchAll(/Critical hit chance[^%\d]*(\d[\d.,]*)\s*%/gi)];
    if (!matches.length) return null;
    let sum = 0.1; // fighters.critChance.base
    for (const m of matches) {
      const plain = Core.parseNumber(m[1]); // Core.parseNumber has no % handling - the % was stripped by the regex, scale here
      if (plain !== null) sum += plain / 100;
    }
    return sum;
  }

  function scanEquippedCritChance() {
    return scanEquippedCritChanceViaFiber() ?? scanEquippedCritChanceViaPageText();
  }

  // ==== the World Boss optimizer window ====
  //
  // UNVERIFIED DOM LAYER, flagged rather than hidden: this clicks each of
  // the 6 formation buttons in turn (the SAME click already proven to work
  // in applyResolved/verifyAppliedValues, reused rather than a new
  // mechanism), waits for the page to react, then runs the existing
  // page-text Crit Chance scan against whatever that click revealed. It
  // assumes clicking a fighter's slot shows enough of their equipped-gear
  // text to match "Critical hit chance" rows — that assumption is carried
  // over from the ORIGINAL single-fighter manual scan, never confirmed
  // against a page where every fighter was visited automatically this way.
  // Needs a live pass on test.v2.queslar.com before trusting the numbers
  // for a real allocation.
  let optimizerHandle = null;
  let optimizerAbort = false;
  let optimizerRunning = false;
  // A finished calculation, waiting on the user's explicit "Add to profile
  // list" — set by runWorldBossOptimization(), consumed (and cleared) by
  // the Add button in buildOptimizerContent(). Cleared on abort too, so a
  // stopped run never leaves a stale pending result sitting behind an Add
  // button that would push the WRONG (incomplete) plan.
  let pendingOptimizerResult = null;

  function openWorldBossOptimizer() {
    if (!optimizerHandle) {
      optimizerHandle = Core.createWindow({
        id: 'fighter-allocator-optimizer', title: 'Optimize for World Boss',
        resizable: false, alwaysOnTop: true, minSize: { w: 420, h: 440 }, persistGeometry: false,
      });
      optimizerHandle.setContent(buildOptimizerContent());
    }
    refreshLiveReads();
    renderOptimizerBudgetLine();
    if (ui.optLevelInput && !ui.optLevelInput.value) {
      const level = lastKnownBossLevel || readLatestFighterWorldBossLevel();
      if (level) ui.optLevelInput.value = String(level);
    }
    optimizerHandle.open();
  }

  function buildOptimizerContent() {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex; flex-direction:column; gap:10px;';

    const intro = document.createElement('div');
    intro.style.cssText = 'font-size:11px; opacity:.8; line-height:1.4;';
    intro.textContent = 'Opens each fighter in turn to read their equipped Crit Chance, then computes '
      + 'the exact Hit target for this boss level and the optimal Damage/Crit Damage split with '
      + 'whatever gold remains — automatic, split evenly across your 6 fighters. Needs the Fighters '
      + 'page open.';
    wrap.appendChild(intro);

    const levelRow = Core.ui.inputRow({
      label: 'Boss level', type: 'number', value: '',
      info: 'bossDodge(level) = 50×level below level 600 (exact past that too, via the same '
        + 'breakpoint formula the game uses for monster generation). Contingent on an INFER-tier '
        + 'assumption that the Fighter World Boss reuses that generation pipeline — not yet '
        + 'HAR-confirmed. Auto-filled from the World Boss Archive page; edit freely.',
      onChange: () => {},
    });
    wrap.appendChild(levelRow);
    ui.optLevelInput = levelRow._input;

    const budgetLine = document.createElement('div');
    budgetLine.style.cssText = 'font-size:11px; opacity:.8;';
    wrap.appendChild(budgetLine);
    ui.optBudgetLine = budgetLine;

    const log = document.createElement('div');
    log.style.cssText = 'font-size:11px; border:1px solid var(--apoz-border, var(--border)); '
      + 'border-radius:5px; padding:6px 8px; min-height:130px; max-height:190px; overflow-y:auto; '
      + 'background: var(--apoz-input, var(--input)); white-space:pre-wrap;';
    log.textContent = 'Ready.';
    wrap.appendChild(log);
    ui.optLog = log;

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:8px;';
    const startBtn = document.createElement('button');
    startBtn.type = 'button'; startBtn.className = 'apoz-ui-btn apoz-ui-btn-primary';
    startBtn.textContent = 'Start';
    startBtn.addEventListener('click', () => runWorldBossOptimization());
    const stopBtn = document.createElement('button');
    stopBtn.type = 'button'; stopBtn.className = 'apoz-ui-btn apoz-ui-btn-danger';
    stopBtn.textContent = 'Stop';
    stopBtn.disabled = true;
    stopBtn.title = 'Stops after the fighter currently being scanned — nothing is generated from a stopped run.';
    stopBtn.addEventListener('click', () => { optimizerAbort = true; });
    btnRow.appendChild(startBtn);
    btnRow.appendChild(stopBtn);
    wrap.appendChild(btnRow);
    ui.optStartBtn = startBtn;
    ui.optStopBtn = stopBtn;

    // The "add to profile list" step — hidden until a run finishes, so
    // nothing gets pushed into the table without a deliberate confirm. Name
    // is editable here (category/source/classes match the profile table's
    // own columns, but only name makes sense to change before it even
    // exists — the others are set from what was actually detected).
    const resultRow = document.createElement('div');
    resultRow.hidden = true;
    resultRow.className = 'apoz-fa-group';
    resultRow.style.cssText += 'flex-direction:row; align-items:center; gap:8px;';
    const resultNameInput = document.createElement('input');
    resultNameInput.type = 'text';
    resultNameInput.style.cssText = 'flex:1; font: inherit; font-size:11.5px; background: var(--apoz-input, var(--input)); '
      + 'color: var(--apoz-foreground, var(--foreground)); border: 1px solid var(--apoz-border, var(--border)); '
      + 'border-radius:4px; padding:4px 7px;';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'apoz-ui-btn apoz-ui-btn-primary';
    addBtn.textContent = 'Add to profile list';
    addBtn.addEventListener('click', () => {
      if (!pendingOptimizerResult) return;
      const name = resultNameInput.value.trim() || 'World Boss plan';
      const draft = makeProfile({
        name, category: 'World Boss',
        classLayout: pendingOptimizerResult.classLayout,
        stats: pendingOptimizerResult.stats,
        sourceBudgetB: pendingOptimizerResult.sourceBudgetB,
        source: 'You',
        meta: pendingOptimizerResult.meta,
      });
      upsertProfile(draft);
      rerenderProfiles();
      optLog(`Added "${draft.name}" to your plans below. Press Allocate on it when ready.`);
      if (ui.wbLastRunLine) ui.wbLastRunLine.textContent = `Last run: ${draft.name}`;
      Core.toast(`Added "${draft.name}".`, { type: 'success', duration: 5000 });
      pendingOptimizerResult = null;
      resultRow.hidden = true;
    });
    resultRow.appendChild(resultNameInput);
    resultRow.appendChild(addBtn);
    wrap.appendChild(resultRow);
    ui.optResultRow = resultRow;
    ui.optResultName = resultNameInput;

    return wrap;
  }

  function renderOptimizerBudgetLine() {
    if (!ui.optBudgetLine) return;
    ui.optBudgetLine.textContent = liveBudgetB
      ? `Usable preset gold: ${Core.formatNumber(liveBudgetB)} (${Core.formatNumber(liveBudgetB / 6)} / fighter, split evenly)`
      : 'Usable preset gold: not read — open the Fighters page first.';
  }

  function optLog(msg) {
    if (!ui.optLog) return;
    ui.optLog.textContent += '\n' + msg;
    ui.optLog.scrollTop = ui.optLog.scrollHeight;
  }

  async function runWorldBossOptimization() {
    if (optimizerRunning) return;
    refreshLiveReads();
    renderOptimizerBudgetLine();
    const level = Number(ui.optLevelInput && ui.optLevelInput.value);
    if (!Number.isFinite(level) || level <= 0) { Core.toast('Enter a boss level first.', { type: 'error' }); return; }
    if (!liveLayout.length || liveLayout.length !== 6 || liveLayout.some((c) => !c)) {
      Core.toast('Could not read your current 6-fighter formation. Open the Fighters page first.', { type: 'error' });
      return;
    }
    if (!(liveBudgetB > 0)) {
      Core.toast('Could not read your usable preset gold. Open the Fighters page first.', { type: 'error' });
      return;
    }
    const buttons = getClassButtons();
    if (buttons.length !== 6) {
      Core.toast(`Expected 6 fighter slots, found ${buttons.length}.`, { type: 'error' });
      return;
    }

    optimizerRunning = true;
    optimizerAbort = false;
    pendingOptimizerResult = null;
    if (ui.optResultRow) ui.optResultRow.hidden = true;
    ui.optStartBtn.disabled = true;
    ui.optStopBtn.disabled = false;
    ui.optLog.textContent = 'Scanning 6 fighters for equipped Crit Chance…';

    const perFighterGold = liveBudgetB / 6;
    const critByClass = {};
    const gearByClass = {};
    const boughtByClass = {};
    let stopped = false;
    for (let i = 0; i < 6; i++) {
      if (optimizerAbort) { stopped = true; break; }
      const cls = liveLayout[i];
      optLog(`Opening ${cls} (${i + 1}/6)…`);
      buttons[i].closest('div')?.click();
      await sleep(700);
      if (optimizerAbort) { stopped = true; break; }
      // The whole assembled stat block, which includes gear, implicits and
      // whatever is already bought — not just Crit Chance. See
      // scanEquippedStatsViaFiber for the bundle-traced item shape and why
      // ignoring gear changes the ANSWER rather than only the reported totals.
      // Points already bought, read from the game's own allocation inputs —
      // the same boxes the allocator later fills. Reported so a run says what
      // it actually saw rather than implying it started from nothing.
      const bought = {};
      for (const stat of ['Hit', 'Damage', 'Crit Damage']) {
        const input = findStatInput(stat);
        const v = input ? Core.parseNumber(input.value) : null;
        bought[stat] = Number.isFinite(v) ? v : 0;
      }
      boughtByClass[cls] = bought;

      // TWO SOURCES, EACH FOR WHAT IT IS ACTUALLY GOOD AT. Not a preference
      // order — a division of labour, and the reason is structural.
      //
      //  * BASE STATS (Hit, Damage, Crit Damage) come from the number the game
      //    displays beside each allocation slider. At 0 allocation that number
      //    IS the gear total, and it rises as points are added. It therefore
      //    already folds in gear, implicits, enchants and any source nobody
      //    here has enumerated — which is the exact failure mode of adding up
      //    items by hand.
      //
      //  * FIGHTER-PREFIXED STATS (fighterCritChance, and multistrike/thorns/
      //    lifesteal if they ever matter here) CANNOT come from that number,
      //    and this is the correction the user supplied: a slider total can
      //    only show a stat that HAS a slider. An implicit granting thorns or
      //    crit chance is real, contributes, and appears nowhere on the
      //    allocation screen. Those must come from the item scan, which is
      //    also the read already proven to work live.
      //
      // So the fiber scan runs ALWAYS, not just as a fallback — an earlier
      // draft only ran it when the card read failed, which would have silently
      // dropped Crit Chance on every account where the cards read fine.
      const viaFiber = scanEquippedStatsViaFiber();

      const fromCards = {};
      let cardsOk = true;
      for (const [stat, key] of [['Hit', 'hit'], ['Damage', 'damage'], ['Crit Damage', 'critDamage']]) {
        const total = readStatTotalFromCard(stat);
        const g = gearFromDisplayedTotal(stat, total, bought[stat]);
        if (g == null) { cardsOk = false; break; }
        fromCards[key] = g;
      }

      // FIBER FIRST, reversed 2026-09-08 on evidence. The card-text read was
      // preferred for one build because it is the game's own total — but on a
      // live account it produced a gear Crit Damage of 5,380 against a true
      // value near 48, by picking the wrong number out of the card's text.
      // The fiber read, once the tier multiplier is applied, reproduces the
      // rendered card to display precision on three stats across two tiers.
      //
      // Structure beats text scraping when the structure is verified: the card
      // read stays as a fallback, but it is the one that has been wrong.
      if (viaFiber) gearByClass[cls] = { ...viaFiber, source: `${viaFiber.items} item(s) via fiber` };
      else if (cardsOk) gearByClass[cls] = { ...fromCards, source: 'page totals (fiber found nothing)' };

      const found = viaFiber && viaFiber.fighterCritChance
        ? 0.1 + viaFiber.fighterCritChance    // fighters.critChance.base + gear
        : scanEquippedCritChance();
      critByClass[cls] = found;

      const g = gearByClass[cls];
      optLog(found !== null
        ? `  ${cls}: ${(found * 100).toFixed(2)}% Crit Chance`
          + (g
            ? `, gear (${g.source}): Hit ${Core.formatNumber(Math.round(g.hit))} / Damage ${Core.formatNumber(Math.round(g.damage))} / Crit Dmg ${Core.formatNumber(Math.round(g.critDamage))}`
            : ', gear NOT read')
          + (bought.Hit || bought.Damage || bought['Crit Damage']
            ? `, already bought H${Core.formatNumber(bought.Hit)}/D${Core.formatNumber(bought.Damage)}/C${Core.formatNumber(bought['Crit Damage'])}` : '')
        : `  ${cls}: could not read Crit Chance — assuming the 0.1 base only.`);
    }

    if (stopped) {
      optLog('Stopped — no plan generated.');
      optimizerRunning = false;
      ui.optStartBtn.disabled = false;
      ui.optStopBtn.disabled = true;
      return;
    }

    optLog('Computing optimal allocation…');
    const stats = {};
    for (const cls of liveLayout) {
      const critChance = critByClass[cls] != null ? critByClass[cls] : 0.1;
      const gear = gearByClass[cls] || { hit: 0, damage: 0, critDamage: 0 };
      // A World Boss plan REPLACES an allocation rather than adding to it, so
      // the starting point is zero bought points — the preset is reset before
      // it is filled. Gear is different: it is not spendable and is always
      // there, so it belongs in the objective as a fixed offset.
      const alloc = allocateFighterForWorldBoss({
        goldBudget: perFighterGold, bossLevel: level,
        currentHitRaw: 0, currentDamageRaw: 0, currentCritDamageRaw: 0, critChance,
        gearHitBonus: gear.hit || 0,
        gearDamageBonus: gear.damage || 0,
        gearCritDamageBonus: gear.critDamage || 0,
      });
      stats[cls] = Object.assign(emptyStatBlock(), {
        Hit: alloc.hitRaw, Damage: alloc.damageRaw, 'Crit Damage': alloc.critDamageRaw,
      });
      // Show the actual reasoning per fighter, not just the final numbers —
      // which target it aimed for, whether the budget covered it, and what
      // crit chance the split was computed against.
      // REWRITTEN 2026-09-08 — the old line described an algorithm that no
      // longer exists. It said "Hit target X (fully covered) -> Y raw Hit.
      // Remainder: ...", which is the buy-Hit-first-then-split strategy that
      // was replaced precisely because it was wrong. A log that narrates a
      // superseded method is worse than no log: it reads as confirmation.
      optLog(`  ${cls}: ${Core.formatNumber(alloc.hitRaw)} Hit / ${Core.formatNumber(alloc.damageRaw)} Damage / `
        + `${Core.formatNumber(alloc.critDamageRaw)} Crit Damage `
        + `→ ${(alloc.achievedHitChance * 100).toFixed(1)}% hit chance`
        + (alloc.stoppedBelowCap
          ? ` (deliberately below the ${(0.95 * 100).toFixed(0)}% cap — a Hit point there is worth zero, damage still pays)`
          : ' (at the cap)')
        + `. Crit Chance ${(critChance * 100).toFixed(2)}%${critByClass[cls] == null ? ' (assumed, not scanned)' : ''}`
        + `, gear ${gearByClass[cls] ? 'included' : 'NOT read — plan assumes none'}.`);
    }
    // Pending, not pushed yet — the calculation is done, but "add to profile
    // list" is now its own explicit step rather than happening automatically.
    // The date already shows in the table's own Updated column, so the
    // default name doesn't repeat it.
    pendingOptimizerResult = {
      classLayout: liveLayout.slice(), stats, sourceBudgetB: liveBudgetB,
      meta: { bossLevel: level, critByClass, gearByClass },
    };
    if (ui.optResultName) ui.optResultName.value = `World Boss L${level}`;
    if (ui.optResultRow) ui.optResultRow.hidden = false;
    optLog('Done. Review the plan above, then "Add to profile list" when you\'re happy with it.');

    optimizerRunning = false;
    ui.optStartBtn.disabled = false;
    ui.optStopBtn.disabled = true;
  }

  function copyOrPrompt(build) {
    let text;
    try { text = build(); } catch (err) { Core.toast(String(err.message || err), { type: 'error' }); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => Core.toast('Copied to clipboard.', { type: 'success', duration: 2500 }),
        () => prompt('Copy this:', text),
      );
    } else {
      prompt('Copy this:', text);
    }
  }

  // The table row's far-right action: a small square icon button instead of
  // a third text label next to Allocate/Archive/Delete — sharing one plan
  // out is rarer than those three and doesn't need equal visual weight.
  // Opens a tiny anchored menu (Core.ui.menu) rather than the full Import/
  // Export window, since from a row the only thing this SPECIFIC plan needs
  // is exporting it, in one format or the other — importing a new plan
  // stays on the toolbar button (openImportExportModal(null)), and "Import
  // OVER this profile" is still reachable from there too.
  function buildShareButton(profile) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'apoz-ui-icon-btn';
    btn.setAttribute('data-tooltip', 'Export / share this plan');
    btn.setAttribute('data-tooltip-right', '');
    btn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" '
      + 'stroke-linecap="round" stroke-linejoin="round"><circle cx="12.5" cy="3.5" r="1.8"/>'
      + '<circle cx="3.5" cy="8" r="1.8"/><circle cx="12.5" cy="12.5" r="1.8"/>'
      + '<path d="M5.1 7 11 4.3M5.1 9 11 11.7"/></svg>';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      Core.ui.menu(btn, [
        { label: 'Export — Apoz format', onClick: () => copyOrPrompt(() => exportNative(profile)) },
        { label: 'Export — community format', onClick: () => copyOrPrompt(() => exportFriendFormat(profile)) },
        { label: 'Import over this plan…', onClick: () => openImportExportModal(profile) },
      ]);
    });
    return btn;
  }

  // ONE entry point for both directions and both formats, per-profile when
  // opened from a table row (Export enabled) or general when opened from
  // the toolbar (Export disabled — nothing to export yet, Import creates a
  // new plan). Always-on-top: it's a small dialog meant to sit over the
  // main window, not compete with it for focus/z-order.
  let importExportHandle = null;
  function openImportExportModal(profile) {
    if (!importExportHandle) {
      importExportHandle = Core.createWindow({
        id: 'fighter-allocator-import-export',
        title: 'Import / Export',
        resizable: false,
        alwaysOnTop: true,
        minSize: { w: 380, h: 300 },
        persistGeometry: false,
      });
    }
    const body = document.createElement('div');
    body.style.cssText = 'display:flex; flex-direction:column; gap:10px;';

    function section(label, formatBadge, doImport, doExport, exportDisabledReason) {
      const box = document.createElement('div');
      box.className = 'apoz-fa-group';
      const head = document.createElement('div');
      head.className = 'apoz-fa-group-label';
      head.textContent = label;
      const badge = document.createElement('span');
      badge.style.cssText = 'margin-left:6px; opacity:.6; font-weight:normal; text-transform:none;';
      badge.textContent = formatBadge;
      head.appendChild(badge);
      box.appendChild(head);
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; gap:6px;';
      const importBtn = document.createElement('button');
      importBtn.type = 'button'; importBtn.className = 'apoz-ui-btn';
      importBtn.textContent = 'Import…';
      importBtn.addEventListener('click', doImport);
      row.appendChild(importBtn);
      const exportBtn = document.createElement('button');
      exportBtn.type = 'button'; exportBtn.className = 'apoz-ui-btn';
      exportBtn.textContent = 'Export';
      if (exportDisabledReason) { exportBtn.disabled = true; exportBtn.title = exportDisabledReason; }
      else exportBtn.addEventListener('click', doExport);
      row.appendChild(exportBtn);
      box.appendChild(row);
      return box;
    }

    const exportDisabled = profile ? null : 'Open this from a row in the table to export that plan.';
    const promptAndImport = (parse, label) => () => {
      const raw = prompt(`Paste ${label} JSON:`);
      if (!raw) return;
      try {
        const imported = parse(JSON.parse(raw));
        upsertProfile(imported);
        rerenderProfiles();
        Core.toast(`Imported "${imported.name}".`, { type: 'success' });
        importExportHandle.close();
      } catch (err) {
        Core.toast(`Import failed: ${err.message}`, { type: 'error', duration: 8000 });
      }
    };

    body.appendChild(section(
      'Fighter Optimizer', '(community script format)',
      promptAndImport((raw) => detectAndNormalizeImport(raw, 'Imported plan'), 'a Fighter Optimizer gold-plan export'),
      () => copyOrPrompt(() => exportFriendFormat(profile)),
      exportDisabled,
    ));
    body.appendChild(section(
      'Apoz Fighter Allocator', '(this tool\'s own format)',
      promptAndImport((raw) => detectAndNormalizeImport(raw, 'Imported plan'), 'a plan exported from this tool'),
      () => copyOrPrompt(() => exportNative(profile)),
      exportDisabled,
    ));

    if (profile) {
      const label = document.createElement('div');
      label.style.cssText = 'font-size:11px; opacity:.7;';
      label.textContent = `Scoped to: ${profile.name}`;
      body.insertBefore(label, body.firstChild);
    }

    importExportHandle.setContent(body);
    importExportHandle.open();
  }

  function buildPanelContent() {
    const content = document.createElement('div');

    const style = document.createElement('style');
    style.textContent = `
      /* Uses the --apoz-* namespaced tokens (with a raw-var fallback), the
         SAME source Core's own chrome draws from — not the game's raw
         --border/--input/etc directly. REPORTED: the export menu's colors
         "didn't match the theme somehow" — root cause was exactly this
         mismatch: Core's shared components already followed the (once-
         placeholder, now real) snapshot, while this module's own CSS still
         read the game's LIVE variables regardless of the liveAdaptTheme
         setting, so the two could disagree any time they weren't
         coincidentally equal. */
      .apoz-fa-group { border: 1px solid var(--apoz-border, var(--border)); border-radius: 6px; padding: 8px 10px;
        display: flex; flex-direction: column; gap: 5px; }
      .apoz-fa-group-label { font-weight: bold; opacity: .7; text-transform: uppercase; font-size: 10px;
        letter-spacing: .04em; }
      /* Subtler by default — this is ambient state (page detected? gold read?
         which plan is mid-allocation?), not a persistent alert box. Only
         gains a border/color once there is something to actually flag. */
      #apoz-fa-status { font-size: 10.5px; padding: 5px 8px; border-radius: 5px; border: 1px solid transparent;
        opacity: .65; min-height: 13px; margin-top: 4px; }
      #apoz-fa-status[data-level="error"] { border-color: #9b2c2c; color: #e0483e; opacity: 1; }
      #apoz-fa-status[data-level="success"] { border-color: #2f855a; color: #3ecf6a; opacity: 1; }
      #apoz-fa-status[data-level="info"] { opacity: .9; }
    `;
    document.head.appendChild(style);

    // The profile table is what this window is predominantly FOR — it comes
    // first and gets the bulk of the space; the World Boss launcher above it
    // is a single compact action row, not a form competing for room.
    content.appendChild(buildWorldBossLauncher());

    const tableWrap = document.createElement('div');
    tableWrap.className = 'apoz-fa-group';
    const tableHeading = document.createElement('div');
    tableHeading.className = 'apoz-fa-group-label';
    tableHeading.style.cssText += 'display:flex; justify-content:space-between; align-items:center;';
    const tableHeadingLeft = document.createElement('span');
    tableHeadingLeft.textContent = 'Fighter Plans';
    tableHeading.appendChild(tableHeadingLeft);

    const tableHeadingRight = document.createElement('span');
    tableHeadingRight.style.cssText = 'display:flex; align-items:center; gap:8px;';

    // A button, not a checkbox — subtler color than Import (this is a view
    // filter, not a primary action), text swaps with state instead of a
    // separate label.
    const archivedToggleBtn = document.createElement('button');
    archivedToggleBtn.type = 'button';
    archivedToggleBtn.className = 'apoz-ui-btn';
    archivedToggleBtn.style.cssText = 'opacity:.7; font-weight:normal;';
    function renderArchivedToggleBtn() {
      archivedToggleBtn.textContent = ui.showArchived ? 'Hide archived' : 'Show archived';
    }
    renderArchivedToggleBtn();
    archivedToggleBtn.addEventListener('click', () => {
      ui.showArchived = !ui.showArchived;
      renderArchivedToggleBtn();
      rerenderProfiles();
    });
    tableHeadingRight.appendChild(archivedToggleBtn);

    // Export now lives per-row (the share icon in the far-right column) —
    // this is ONLY for bringing a new plan in, hence "Import" not
    // "Import / Export". A plain text button, not an icon: this button's
    // location was fine, it just read heavier than the table's own text at
    // the dropdown's larger icon-button font.
    const importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.className = 'apoz-ui-btn';
    importBtn.textContent = 'Import';
    importBtn.title = 'Import a plan — Fighter Optimizer format or this tool\'s own';
    importBtn.addEventListener('click', () => openImportExportModal(null));
    tableHeadingRight.appendChild(importBtn);

    const newBtn = document.createElement('button');
    newBtn.type = 'button';
    newBtn.className = 'apoz-ui-icon-btn';
    newBtn.textContent = '+';
    newBtn.disabled = true;
    newBtn.setAttribute('data-tooltip', 'Create new — coming soon (needs relative/current-allocation editing support)');
    newBtn.setAttribute('data-tooltip-right', '');
    newBtn.setAttribute('data-tooltip-wide', '');
    tableHeadingRight.appendChild(newBtn);
    tableHeading.appendChild(tableHeadingRight);
    tableWrap.appendChild(tableHeading);

    const tableContainer = document.createElement('div');
    tableContainer.style.overflowX = 'auto';
    tableWrap.appendChild(tableContainer);
    ui.profileTableContainer = tableContainer;
    content.appendChild(tableWrap);
    rerenderProfiles();

    const statusRow = document.createElement('div');
    statusRow.style.cssText = 'display:flex; align-items:center; gap:8px;';
    const statusBar = document.createElement('div');
    statusBar.id = 'apoz-fa-status';
    statusBar.style.flex = '1';
    statusRow.appendChild(statusBar);
    ui.statusBar = statusBar;

    const stopAllocateBtn = document.createElement('button');
    stopAllocateBtn.type = 'button';
    stopAllocateBtn.className = 'apoz-ui-btn apoz-ui-btn-danger';
    stopAllocateBtn.textContent = 'Stop';
    stopAllocateBtn.hidden = true;
    stopAllocateBtn.title = 'Stops after the fighter currently being filled — check its sliders before Save Preset.';
    stopAllocateBtn.addEventListener('click', () => { allocateAbort = true; });
    statusRow.appendChild(stopAllocateBtn);
    ui.stopAllocateBtn = stopAllocateBtn;

    content.appendChild(statusRow);
    updateAmbientStatus();

    return content;
  }

  // The status bar's IDLE content — page/gold detection, not an action
  // result. setStatus() (used by loadProfileFlow) overwrites this during an
  // actual allocation and callers restore it afterward via this function.
  function updateAmbientStatus() {
    if (!ui.statusBar) return;
    const onFightersPage = liveLayout.length === 6 && !liveLayout.some((c) => !c);
    if (!onFightersPage) {
      setStatus('Fighters page not detected — open it to allocate a plan.', 'ambient');
      return;
    }
    setStatus(liveBudgetB
      ? `Fighters page detected · ${Core.formatNumber(liveBudgetB)} usable gold.`
      : 'Fighters page detected, but usable gold could not be read.', 'ambient');
  }

  function togglePanel(force) {
    const show = force !== undefined ? force : windowHandle.el.hidden;
    if (show) {
      refreshLiveReads();
      updateAmbientStatus();
      windowHandle.open();
    } else {
      windowHandle.close();
    }
    panelOpen = show;
    Core.setOpen(MODULE_ID, show);
  }

  function whenBodyReady(fn) {
    if (document.body) return fn();
    const obs = new MutationObserver(() => { if (document.body) { obs.disconnect(); fn(); } });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  whenBodyReady(bootstrap);

  function bootstrap() {
    loadStore();
    watchForArchivePage();
    const content = buildPanelContent();
    windowHandle = Core.createWindow({
      id: MODULE_ID,
      title: 'Fighter Allocator',
      // REPORTED: vertical-only read as "broken" (drag handle looked
      // draggable in both directions but width never moved) — was originally
      // vertical-only on the theory that the table should drive width, not a
      // drag, but the actions column has grown since (Allocate/Archive/
      // Delete/share-icon) so a user drag is a legitimate way to get more
      // room now too. Capped at the viewport size either way (applyMaxSize).
      resizable: 'both',
      minSize: { w: 640, h: 640 },
      content,
      onClose: () => togglePanel(false),
    });

    Core.registerModule({
      id: MODULE_ID,
      label: 'Fighter Allocator',
      shortLabel: 'Fighters',
      description: 'Allocate gold-purchased fighter stats — class-keyed profiles, World Boss math, '
        + 'two-way Fighter Optimizer import/export. Fills sliders; never auto-clicks Save Preset.',
      needsCore: 8, // uses Core.ui.menu (v7) and Core.walkFiberAll (v8)
      // Enabling always shows the window right away, matching eta-tracker.
      // Nothing to gate on reload here yet — this module doesn't persist
      // panelOpen the way eta-tracker does, so there's no prior-session
      // state to restore either way.
      onToggle: (enabled) => togglePanel(enabled),
      onQuickClick: () => togglePanel(),
      onResetPosition: () => windowHandle.resetPosition(),
      onConventionChange: () => { rerenderProfiles(); },
      __forTest: {
        profiles: () => profiles,
        upsertProfile, deleteProfileHard, setArchived, duplicateProfile,
        detectAndNormalizeImport, exportNative, exportFriendFormat,
        resolveProfileAgainstLayout,
        bossDodgeAtLevel, hitTargetForBossLevel, hitChanceAt, expectedDamage,
        scanEquippedStatsViaFiber, readStatTotalFromCard, gearFromDisplayedTotal, equipmentTierMultiplier,
        statFinalFromRaw, rawPointsForFinalStat, scaleLevel,
        goldCostForPoints, maxLevelForBudget, splitDamageCritDamageByGold, allocateFighterForWorldBoss,
      },
    });

    setInterval(flushStore, 10000);
    window.addEventListener('pagehide', flushStore);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushStore();
    });
  }

  });
})();
