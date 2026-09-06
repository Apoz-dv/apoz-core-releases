// ==UserScript==
// @name         Apoz Core: Combat Slot ETA Tracker
// @namespace    apoz-core
// @author       Apoz
// @version      4.2.0-beta
// @description  Apoz Core module (requires "Apoz Core"). Read-only overlay: estimates time until the Combat pet slot upgrade is affordable from your live gold and the exact upgrade-cost formula (no need to sit on the Pets page), rings a gentle alarm - and optionally a desktop notification - when it is, and stays accurate in a backgrounded tab. Ships the Party Gold ROI calculator. No auto-clicking.
// @match        https://v2.queslar.com/*
// @match        https://*.queslar.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/Apoz-dv/apoz-core-releases/main/beta/eta-tracker.user.js
// @downloadURL  https://raw.githubusercontent.com/Apoz-dv/apoz-core-releases/main/beta/eta-tracker.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ==== GENERATED — DO NOT EDIT ====
  // Produced by userscripts/build.mjs from data/. Edit the FACT,
  // then rebuild; editing this block is overwritten and, worse,
  // silently diverges from the core it was supposed to mirror.

  // formulas/pets.json :: pets.slotUpgrade.costFormula  [CODE]
  function petSlotUpgradeCost(currentLevel, newLevel) { let total = 0; for (let r = currentLevel + 1; r <= newLevel; r++) total += Math.floor(500000 * r**3); return { currency: 'gold', value: total }; } // per-level marginal cost at level L->L+1 is floor(500000*(L+1)^3)

  // PROVENANCE — generated from this module's facts manifest.
  const PROVENANCE = [
    { file: "formulas/pets.json", fact: "pets.slotUpgrade.costFormula" },
  ];
  void PROVENANCE; // declaration only — never read at runtime

  // ==== END GENERATED ====

  // ==== GENERATED TOOL PAYLOADS — DO NOT EDIT ====
  // Tool payload: userscripts/src/tools/party-gold-roi.html (generated facts inlined)
  const APOZ_TOOL_PARTY_GOLD_ROI = "<meta charset=\"utf-8\">\n<title>Party Gold ROI</title>\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap\">\n<style>\n/* ---------------------------------------------------------------------------\n   THEME. Light is a warm beach/sand palette, not white - soft on the eyes but\n   unambiguously light mode. Dark is its own design, not an inversion. Every\n   colour is a token declared on bare :root first, so the un-stamped \"system\"\n   state resolves correctly.\n--------------------------------------------------------------------------- */\n:root{\n  --bg:#efe7d7; --surface:#faf5ec; --surface-2:#f1e8d8; --surface-3:#e7dcc7;\n  --border:#d8cbb2; --border-strong:#c3b193;\n  --text:#33291d; --text-muted:#6b5c48; --text-faint:#94836c;\n  --accent:#1d6f6a; --accent-soft:#2a8f88;\n  --warm:#b5541f; --warm-soft:#d2691e;\n  --success:#3f7d4e; --band:#f6e9cd; --current:#dcebe6;\n  --shadow:0 1px 2px rgba(80,60,35,.07), 0 4px 14px rgba(80,60,35,.06);\n  --mono:'IBM Plex Mono',ui-monospace,monospace;\n  --sans:'IBM Plex Sans',system-ui,sans-serif;\n  --display:'Big Shoulders Display','Arial Narrow',sans-serif;\n}\n@media (prefers-color-scheme:dark){\n  :root:not([data-theme=\"light\"]){\n    --bg:#141a1e; --surface:#1c242a; --surface-2:#222c33; --surface-3:#2a353d;\n    --border:#33414a; --border-strong:#465862;\n    --text:#e8eef0; --text-muted:#9aabb4; --text-faint:#6b7c86;\n    --accent:#5ec5bc; --accent-soft:#7ad6cd;\n    --warm:#e79055; --warm-soft:#f0a771;\n    --success:#6fcf97; --band:#2a2418; --current:#17322f;\n    --shadow:0 1px 2px rgba(0,0,0,.3), 0 6px 18px rgba(0,0,0,.28);\n  }\n}\n:root[data-theme=\"dark\"]{\n  --bg:#141a1e; --surface:#1c242a; --surface-2:#222c33; --surface-3:#2a353d;\n  --border:#33414a; --border-strong:#465862;\n  --text:#e8eef0; --text-muted:#9aabb4; --text-faint:#6b7c86;\n  --accent:#5ec5bc; --accent-soft:#7ad6cd;\n  --warm:#e79055; --warm-soft:#f0a771;\n  --success:#6fcf97; --band:#2a2418; --current:#17322f;\n  --shadow:0 1px 2px rgba(0,0,0,.3), 0 6px 18px rgba(0,0,0,.28);\n}\n\n*{box-sizing:border-box}\n[hidden]{display:none!important}\nhtml,body{margin:0;background:var(--bg)}\n/* No sideways scrolling, ever. A separately-scrolling sidebar is wanted; a\n   horizontal bar never is. */\nbody{color:var(--text);font-family:var(--sans);line-height:1.5;font-size:.9rem;overflow-x:hidden}\na{color:inherit}\n\n/* ---- shell: sized for 1440p at the default window width ---- */\n.app{display:grid;grid-template-columns:340px minmax(0,1fr);gap:1.5rem;\n     max-width:1680px;margin:0 auto;padding:1.5rem 1.5rem 4rem}\n@media (max-width:1100px){.app{grid-template-columns:1fr;padding:1.25rem 1rem 4rem}}\n\n.eyebrow{font-family:var(--mono);font-size:.63rem;letter-spacing:.11em;text-transform:uppercase;color:var(--accent);margin-bottom:.3rem}\nh1{font-family:var(--display);font-weight:700;font-size:1.7rem;margin:0 0 .3rem;line-height:1;text-wrap:balance}\n.sub{color:var(--text-muted);font-size:.78rem;margin:0 0 1rem;line-height:1.45}\n\n/* ---- sidebar ---- */\n.sidebar-inner{display:flex;flex-direction:column;gap:.7rem}\n@media (min-width:1101px){\n  .sidebar-inner{position:sticky;top:1.25rem;max-height:calc(100vh - 2.5rem);\n    overflow-y:auto;overflow-x:hidden;padding-right:.45rem;scrollbar-width:thin}\n  .sidebar-inner::-webkit-scrollbar{width:8px}\n  .sidebar-inner::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:4px}\n}\n.card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.7rem .8rem;box-shadow:var(--shadow)}\n\n.sec-label{font-family:var(--mono);font-size:.61rem;letter-spacing:.09em;text-transform:uppercase;\n  color:var(--text-faint);display:flex;align-items:center;gap:.3rem;margin:0 0 .5rem}\n.sec-label .rule{flex:1;height:1px;background:var(--border)}\n\n/* ---- compact, aligned inputs ---- */\n.fields{display:grid;grid-template-columns:1fr 5.6rem;align-items:center;gap:.3rem .5rem}\n.fields label{font-size:.75rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;\n  display:flex;align-items:center;gap:.25rem;min-width:0}\n.fields input[type=number],.fields input[type=text]{\n  font-family:var(--mono);font-size:.8rem;font-weight:600;color:var(--text);\n  background:var(--surface-2);border:1px solid var(--border);border-radius:5px;\n  padding:.22rem .35rem;width:100%;min-width:0;font-variant-numeric:tabular-nums;text-align:right}\n.fields input:focus{outline:2px solid var(--accent);outline-offset:1px}\n.fields input:disabled{opacity:.45;cursor:not-allowed;background:var(--surface-3)}\n.checkrow{grid-column:1 / -1;display:flex;align-items:center;gap:.4rem;font-size:.75rem;color:var(--text-muted);cursor:pointer;user-select:none}\n.checkrow input{width:.85rem;height:.85rem;accent-color:var(--accent);margin:0;cursor:pointer}\n.note{grid-column:1 / -1;font-size:.68rem;color:var(--text-faint);line-height:1.35;margin:.2rem 0 0}\n\n/* ---- buttons, one family ---- */\n.btn{font-family:var(--sans);font-size:.72rem;font-weight:500;color:var(--text-muted);\n  background:var(--surface-2);border:1px solid var(--border);border-radius:6px;\n  padding:.28rem .6rem;cursor:pointer;white-space:nowrap;transition:background .12s,border-color .12s,color .12s}\n.btn:hover{border-color:var(--accent);color:var(--accent);background:var(--surface-3)}\n.btn:disabled{opacity:.4;cursor:default}\n.btn:disabled:hover{border-color:var(--border);color:var(--text-muted);background:var(--surface-2)}\n.btn-primary{color:var(--surface);background:var(--accent);border-color:var(--accent)}\n.btn-primary:hover{background:var(--accent-soft);border-color:var(--accent-soft);color:var(--surface)}\n.btnrow{display:flex;gap:.35rem;margin-top:.5rem}\n.btnrow .btn{flex:1}\n\n/* ---- results ---- */\n.result{display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;padding:.22rem 0;font-size:.78rem}\n.result + .result{border-top:1px dashed var(--border)}\n.result .k{color:var(--text-muted)}\n.result .v{font-family:var(--mono);font-weight:600;font-variant-numeric:tabular-nums}\n.result.hero .v{font-family:var(--display);font-size:1.5rem;font-weight:700;color:var(--warm);line-height:1}\n.result .v.good{color:var(--success)} .result .v.off{color:var(--warm)}\n\n/* ---- live import ---- */\n.live{border-left:3px solid var(--border-strong)}\n.live.on{border-left-color:var(--success)}\n.live-head{display:flex;justify-content:space-between;align-items:center;gap:.4rem;margin-bottom:.4rem}\n.live-when{font-family:var(--mono);font-size:.62rem;color:var(--text-faint)}\n.live-list{display:grid;grid-template-columns:1fr auto;gap:.1rem .5rem;font-size:.72rem;margin-bottom:.4rem}\n.live-list .k{color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.live-list .v{font-family:var(--mono);font-weight:600;text-align:right;font-variant-numeric:tabular-nums}\n.live-empty{font-size:.72rem;color:var(--text-muted);line-height:1.45}\n\n/* ---- tooltips: fixed-position, so a scroll container cannot clip them ---- */\n.tip{border-bottom:1px dotted var(--text-faint);cursor:help}\n.ico{display:inline-flex;align-items:center;justify-content:center;width:.85rem;height:.85rem;\n  border-radius:50%;border:1px solid var(--text-faint);color:var(--text-faint);\n  font-size:.55rem;font-weight:700;cursor:help;flex:none;font-style:normal}\n.ico:hover,.ico:focus{border-color:var(--accent);color:var(--accent);outline:none}\n#tip{position:fixed;z-index:200;max-width:22rem;background:var(--text);color:var(--surface);\n  font-family:var(--sans);font-size:.73rem;font-weight:400;line-height:1.45;\n  padding:.45rem .6rem;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.28);\n  opacity:0;visibility:hidden;transition:opacity .1s;pointer-events:none;left:0;top:0}\n#tip.on{opacity:1;visibility:visible}\n\n/* ---- main ---- */\nh3.sec{font-family:var(--display);font-weight:700;font-size:1.25rem;margin:1.6rem 0 .2rem}\nh3.sec:first-child{margin-top:0}\n.sec-sub{color:var(--text-muted);font-size:.78rem;margin:0 0 .7rem;max-width:74ch}\n\n.verdict{background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--warm);\n  border-radius:10px;padding:.85rem 1rem;margin-bottom:1rem;box-shadow:var(--shadow)}\n.verdict-head{display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap;margin-bottom:.4rem}\n.verdict-kicker{font-family:var(--mono);font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--text-faint)}\n.verdict-answer{font-family:var(--display);font-weight:800;font-size:1.6rem;line-height:1;color:var(--warm)}\n.verdict-answer.util{color:var(--accent)}\n.verdict p{font-size:.8rem;color:var(--text-muted);margin:0}\n.verdict p + p{margin-top:.35rem}\n.verdict strong{color:var(--text)}\n\n.compare{display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-bottom:1rem}\n@media (max-width:820px){.compare{grid-template-columns:1fr}}\n.box{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.75rem .9rem;box-shadow:var(--shadow)}\n.box.win{border-color:var(--success);box-shadow:inset 3px 0 0 var(--success),var(--shadow)}\n.box h5{margin:0 0 .2rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-faint);display:flex;align-items:center;gap:.35rem}\n.box .big{font-family:var(--display);font-size:1.5rem;color:var(--warm);line-height:1.05}\n.box .unit{font-family:var(--mono);font-size:.6rem;color:var(--text-faint);text-transform:uppercase;letter-spacing:.05em}\n.box dl{display:grid;grid-template-columns:auto 1fr;gap:.05rem .6rem;margin:.45rem 0 0;font-size:.72rem}\n.box dt{color:var(--text-faint)} .box dd{margin:0;font-family:var(--mono);text-align:right;font-variant-numeric:tabular-nums}\n.box p{margin:.35rem 0 0;font-size:.72rem;color:var(--text-muted)}\n.tag{font-family:var(--sans);font-size:.55rem;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);border:1px solid currentColor;border-radius:3px;padding:0 .22rem}\n.tag.win{color:var(--success)}\n\n.panel{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.75rem .9rem;margin-bottom:1rem;box-shadow:var(--shadow)}\n.panel h5{margin:0 0 .5rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-faint)}\n.panel .note{font-size:.78rem;color:var(--text-muted);margin:.5rem 0 0}\n.panel .note strong{color:var(--text)}\n\n.strip{display:flex;gap:2px;flex-wrap:wrap;margin-bottom:.5rem}\n.cell{width:1.5rem;height:1.5rem;border-radius:4px;display:flex;align-items:center;justify-content:center;\n  font-family:var(--mono);font-size:.55rem;font-weight:600;color:#fff}\n.cell.c{background:var(--warm)} .cell.u{background:var(--accent)}\n.cell.flip{outline:2px solid var(--success);outline-offset:1px}\n.legend{display:flex;gap:.9rem;flex-wrap:wrap;font-size:.7rem;color:var(--text-muted);margin-top:.4rem}\n.legend span{display:flex;align-items:center;gap:.3rem}\n.sw{width:.75rem;height:.75rem;border-radius:3px;border:1px solid var(--border);display:inline-block}\n\n/* ---- tables ---- */\n.tbl-wrap{overflow:auto;max-height:480px;border:1px solid var(--border);border-radius:10px;background:var(--surface);box-shadow:var(--shadow)}\n.tbl-wrap.tall{max-height:calc(100vh - 11rem)}\n.tbl-wrap.auto{max-height:none}\ntable.roi{width:100%;border-collapse:collapse;font-size:.75rem}\ntable.roi thead th{position:sticky;background:var(--surface-2);text-align:right;font-family:var(--mono);\n  font-weight:500;font-size:.63rem;letter-spacing:.04em;text-transform:uppercase;color:var(--text-faint);\n  padding:.32rem .5rem;white-space:nowrap;z-index:2}\ntable.roi thead tr.grp th{top:0;font-size:.58rem;letter-spacing:.09em;color:var(--text-muted);\n  border-bottom:1px solid var(--border);background:var(--surface-3)}\ntable.roi thead tr.cols th{top:1.4rem;border-bottom:1px solid var(--border)}\ntable.roi thead th:first-child{text-align:left}\ntable.roi tbody td{text-align:right;padding:.24rem .5rem;font-family:var(--mono);font-variant-numeric:tabular-nums;\n  border-top:1px solid var(--border);white-space:nowrap}\ntable.roi tbody td.lvl{text-align:left;color:var(--text-muted)}\ntable.roi tbody td.sep,table.roi thead th.sep{border-left:1px solid var(--border)}\ntable.roi tbody tr.boundary td{color:var(--success)}\ntable.roi tbody tr.band{background:var(--band)}\ntable.roi tbody tr.current{background:var(--current);font-weight:600}\ntable.roi tbody tr.current td{border-top:2px solid var(--accent);border-bottom:2px solid var(--accent)}\n.tblfoot{display:flex;justify-content:flex-end;align-items:center;gap:.35rem;padding:.45rem .1rem 0;flex-wrap:wrap}\n.tblfoot .count{margin-right:auto;font-family:var(--mono);font-size:.66rem;color:var(--text-faint)}\n.tblfoot input{font-family:var(--mono);font-size:.72rem;width:5rem;padding:.25rem .35rem;text-align:right;\n  background:var(--surface-2);border:1px solid var(--border);border-radius:6px;color:var(--text)}\n\ndetails.panel summary{cursor:pointer;font-weight:600;font-size:.82rem;list-style:none;display:flex;align-items:center;gap:.4rem}\ndetails.panel summary::-webkit-details-marker{display:none}\ndetails.panel summary::before{content:'\\25B8';font-family:var(--mono);color:var(--accent);transition:transform .15s;font-size:.75rem}\ndetails.panel[open] summary::before{transform:rotate(90deg)}\ndetails.panel summary .s{font-weight:400;color:var(--text-muted);font-size:.73rem}\n.panel-body{margin-top:.7rem}\n.panel-body h4{font-size:.63rem;letter-spacing:.05em;text-transform:uppercase;color:var(--text-faint);margin:.9rem 0 .35rem}\n.panel-body h4:first-child{margin-top:0}\n.panel-body ul{margin:0;padding-left:1rem;color:var(--text-muted);font-size:.77rem}\n.panel-body li{margin-bottom:.3rem}\ncode{font-family:var(--mono);background:var(--surface-2);padding:.03rem .25rem;border-radius:3px;color:var(--text);font-size:.9em}\n\n.calc{position:relative;padding-left:1.5rem}\n.calc::before{content:\"\";position:absolute;left:.52rem;top:.4rem;bottom:.8rem;width:1px;background:var(--border-strong)}\n.step{position:relative;margin-bottom:.45rem;display:flex;align-items:baseline;gap:.5rem;flex-wrap:wrap;font-size:.78rem}\n.step-n{position:absolute;left:-1.5rem;top:.05rem;width:1.05rem;height:1.05rem;border-radius:50%;\n  background:var(--surface);border:1.5px solid var(--border-strong);display:flex;align-items:center;justify-content:center;\n  font-family:var(--mono);font-weight:600;font-size:.58rem;color:var(--text-muted)}\n.step .l{color:var(--text);font-weight:600}\n.step .e{font-family:var(--mono);font-size:.68rem;color:var(--text-faint);flex:1 1 auto}\n.step .v{font-family:var(--mono);font-weight:700;margin-left:auto;color:var(--warm);white-space:nowrap}\n.step.final .v{color:var(--success);font-size:.88rem}\n\n#theme{position:fixed;right:.9rem;bottom:.9rem;width:2.2rem;height:2.2rem;border-radius:50%;\n  background:var(--surface);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;\n  display:flex;align-items:center;justify-content:center;font-size:.9rem;box-shadow:var(--shadow);z-index:60}\n#theme:hover{color:var(--accent);border-color:var(--accent)}\n@media (prefers-reduced-motion:reduce){*{transition:none!important}}\n</style>\n\n<div class=\"app\">\n  <aside>\n    <div class=\"sidebar-inner\">\n      <div>\n        <div class=\"eyebrow\">Combat vs Utility pet slot</div>\n        <h1>Party Gold ROI</h1>\n        <p class=\"sub\">Every multiplier that reaches your party-action gold, and which pet slot is the better buy right now.</p>\n      </div>\n\n      <div class=\"card live\" id=\"liveCard\">\n        <div class=\"live-head\">\n          <span class=\"sec-label\" style=\"margin:0\">Live import<span class=\"ico\" tabindex=\"0\" data-tip=\"Filled in by the Apoz Core userscript when you open this page from the in-game menu. Nothing is sent anywhere - the values are handed over in-page.\">i</span></span>\n          <span class=\"live-when\" id=\"liveWhen\"></span>\n        </div>\n        <div class=\"live-list\" id=\"liveList\"></div>\n        <div class=\"live-empty\" id=\"liveEmpty\">Not opened from the game. Open <strong>Apoz Core &rsaquo; Tools &rsaquo; Party Gold ROI</strong> inside Queslar to fill this in automatically.</div>\n        <div class=\"btnrow\" id=\"liveActions\" hidden>\n          <button type=\"button\" class=\"btn btn-primary\" id=\"liveApplyBtn\">Apply live values</button>\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Pet slots<span class=\"rule\"></span></div>\n        <div class=\"fields\">\n          <label for=\"combatInput\">Combat slot level</label>\n          <input type=\"number\" id=\"combatInput\" min=\"0\" max=\"5000\" value=\"50\">\n          <label for=\"utilityInput\">Utility slot level</label>\n          <input type=\"number\" id=\"utilityInput\" min=\"0\" max=\"5000\" value=\"30\">\n        </div>\n        <div style=\"margin-top:.55rem\">\n          <div class=\"result hero\"><span class=\"k\">Gold / action</span><span class=\"v\" id=\"headlineGold\">&mdash;</span></div>\n          <div class=\"result\" id=\"keptRow\" hidden><span class=\"k\">After village tax</span><span class=\"v\" id=\"keptGold\">&mdash;</span></div>\n          <div class=\"result\"><span class=\"k\">Combat boost</span><span class=\"v\" id=\"combatBoostOut\">&mdash;</span></div>\n          <div class=\"result\"><span class=\"k\">Utility boost</span><span class=\"v\" id=\"utilityBoostOut\">&mdash;</span></div>\n          <div class=\"result\" id=\"calibRow\" hidden><span class=\"k tip\" data-tip=\"Difference between this model and the gold/action you actually measured in game. Set it under Calibration.\">vs observed</span><span class=\"v\" id=\"calibOut\">&mdash;</span></div>\n        </div>\n        <div class=\"btnrow\">\n          <button type=\"button\" class=\"btn\" id=\"resetBtn\">Reset</button>\n          <button type=\"button\" class=\"btn\" id=\"saveDefaultBtn\">Save as default</button>\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Combat context<span class=\"rule\"></span><span class=\"ico\" tabindex=\"0\" data-tip=\"The values that change most often between sessions, so they sit near the top. Monster level multiplies gold.base linearly.\">i</span></div>\n        <div class=\"fields\">\n          <label for=\"monsterLevelInput\">Monster level</label>\n          <input type=\"number\" id=\"monsterLevelInput\" min=\"1\" max=\"10000000\" value=\"230000\">\n          <label for=\"characterLevelInput\">Character level</label>\n          <input type=\"number\" id=\"characterLevelInput\" min=\"1\" max=\"1000000\" value=\"11500\">\n          <label for=\"actionsPerWeekInput\">Actions / week</label>\n          <input type=\"number\" id=\"actionsPerWeekInput\" min=\"1\" max=\"200000\" value=\"6000\">\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Pet modifiers<span class=\"rule\"></span><span class=\"ico\" tabindex=\"0\" data-tip=\"If the userscript imported your pets' actual rolled modifiers, those are used and the normalisation inputs grey out. Untick to model a pet from iLevel / tier / roll instead.\">i</span></div>\n        <div class=\"fields\">\n          <label class=\"checkrow\"><input type=\"checkbox\" id=\"useLivePetInput\"><span>Use imported pet modifiers</span></label>\n          <label for=\"petILevelInput\">Pet iLevel</label>\n          <input type=\"number\" id=\"petILevelInput\" min=\"101\" max=\"10000000\" value=\"11000\">\n          <label for=\"petTierInput\">Tier</label>\n          <input type=\"number\" id=\"petTierInput\" min=\"1\" max=\"16\" value=\"16\">\n          <label for=\"petRollPercentileInput\">Roll percentile</label>\n          <input type=\"number\" id=\"petRollPercentileInput\" min=\"0\" max=\"100\" value=\"75\">\n        </div>\n        <div style=\"margin-top:.45rem\">\n          <div class=\"result\"><span class=\"k\">Added base gold</span><span class=\"v\" id=\"rollFlatOut\">&mdash;</span></div>\n          <div class=\"result\"><span class=\"k\">Increased base gold</span><span class=\"v\" id=\"rollPctOut\">&mdash;</span></div>\n          <div class=\"result\"><span class=\"k\">Potion effect</span><span class=\"v\" id=\"rollPotionOut\">&mdash;</span></div>\n        </div>\n        <p class=\"note\" id=\"petSourceNote\"></p>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Character boosts<span class=\"rule\"></span></div>\n        <div class=\"fields\">\n          <label for=\"enchantsInput\">Enchants %</label>\n          <input type=\"number\" id=\"enchantsInput\" min=\"0\" max=\"100000\" value=\"518\">\n          <label for=\"sculpturesInput\">Sculpture grid %</label>\n          <input type=\"number\" id=\"sculpturesInput\" min=\"0\" max=\"100000\" value=\"500\">\n          <label for=\"skillTreeInput\">Skill tree %</label>\n          <input type=\"number\" id=\"skillTreeInput\" min=\"0\" max=\"100000\" value=\"0\">\n          <label for=\"petGoldModInput\">Pet &quot;Gold&quot; mod %</label>\n          <input type=\"number\" id=\"petGoldModInput\" min=\"0\" max=\"100000\" value=\"0\">\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Village<span class=\"rule\"></span></div>\n        <div class=\"fields\">\n          <label for=\"marketInput\">Market %</label>\n          <input type=\"number\" id=\"marketInput\" min=\"0\" max=\"100000\" value=\"320\">\n          <label for=\"villageInput\">Exploration / Potent %</label>\n          <input type=\"number\" id=\"villageInput\" min=\"0\" max=\"10000\" value=\"40\">\n          <label for=\"pvpGoldTileInput\">PvP gold tile %</label>\n          <input type=\"number\" id=\"pvpGoldTileInput\" min=\"0\" max=\"10000\" value=\"20\">\n          <label for=\"pvpPotionTileInput\">PvP potion tile %</label>\n          <input type=\"number\" id=\"pvpPotionTileInput\" min=\"0\" max=\"10000\" value=\"4\">\n          <label for=\"taxInput\">Tax %<span class=\"ico\" tabindex=\"0\" data-tip=\"Taken from party-action gold before you keep it. The game shows BOTH: a pre-tax gold-gained figure and the amount KEPT after tax. Set this and the sidebar shows both too, so you always compare like with like. Not a recorded fact in the core, so it starts at 0 and you enter your party's rate.\">i</span></label>\n          <input type=\"number\" id=\"taxInput\" min=\"0\" max=\"100\" step=\"0.1\" value=\"0\">\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Party<span class=\"rule\"></span><span class=\"ico\" tabindex=\"0\" data-tip=\"Pooled Base is the SUM of every member's own fully-stacked Gold Boost, not an average. At exactly 5 members the combined total takes a x0.8 penalty; 1-4 members take none.\">i</span></div>\n        <div class=\"fields\">\n          <label for=\"partyMembersInput\">Members</label>\n          <input type=\"number\" id=\"partyMembersInput\" min=\"1\" max=\"5\" value=\"4\">\n          <label class=\"checkrow\"><input type=\"checkbox\" id=\"othersSameInput\" checked><span>Others match me</span></label>\n          <label for=\"othersGoldBoostInput\">Others' boost %</label>\n          <input type=\"number\" id=\"othersGoldBoostInput\" min=\"0\" max=\"1000000\" value=\"0\">\n          <p class=\"note\" id=\"partyNote\" hidden></p>\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Premium &amp; event<span class=\"rule\"></span></div>\n        <div class=\"fields\">\n          <label class=\"checkrow\"><input type=\"checkbox\" id=\"vipInput\" checked><span>VIP active (+10%)</span></label>\n          <label for=\"goldPotionInput\">Gold potion base %</label>\n          <input type=\"number\" id=\"goldPotionInput\" min=\"0\" max=\"10000\" value=\"10\">\n          <label for=\"eventInput\">Event %</label>\n          <input type=\"number\" id=\"eventInput\" min=\"0\" max=\"100000\" value=\"0\">\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Calibration<span class=\"rule\"></span><span class=\"ico\" tabindex=\"0\" data-tip=\"Enter the gold/action you actually see in game. The sidebar shows the gap; the Formulas panel lists what each shape of gap points at.\">i</span></div>\n        <div class=\"fields\">\n          <label for=\"observedGoldInput\">Observed / action (B)</label>\n          <input type=\"number\" id=\"observedGoldInput\" min=\"0\" max=\"1000000000\" step=\"0.001\" value=\"0\">\n          <p class=\"note\">0 = off. Compared against the after-tax figure &mdash; the gold you actually keep, which is the honest measure of income.</p>\n        </div>\n      </div>\n    </div>\n  </aside>\n\n  <main>\n    <div class=\"verdict\" id=\"verdict\">\n      <div class=\"verdict-head\">\n        <span class=\"verdict-kicker\">Buy next</span>\n        <span class=\"verdict-answer\" id=\"verdictAnswer\">&mdash;</span>\n      </div>\n      <p id=\"verdictWhy\">&mdash;</p>\n      <p id=\"verdictBreak\">&mdash;</p>\n    </div>\n\n    <h3 class=\"sec\" id=\"breakpoint\">Breakpoint comparison</h3>\n    <p class=\"sec-sub\">Both slots share the <em>identical</em> cost curve <code>floor(500,000 &times; L&sup3;)</code> keyed on their own next level, so the only fair comparison is gold/action gained per gold spent.</p>\n\n    <div class=\"compare\">\n      <div class=\"box\" id=\"combatBox\">\n        <h5>Combat slot <span id=\"combatNextLbl\"></span><span class=\"tag win\" id=\"combatWinTag\" hidden>better</span></h5>\n        <div class=\"big\" id=\"combatComparBig\">&mdash;</div>\n        <div class=\"unit\">gold/action gained per 1B spent</div>\n        <dl>\n          <dt>Level cost</dt><dd id=\"combatStepCost\">&mdash;</dd>\n          <dt>Gold/action gained</dt><dd id=\"combatStepGain\">&mdash;</dd>\n          <dt>Pays back in</dt><dd id=\"combatStepBack\">&mdash;</dd>\n        </dl>\n        <p>Multiplies the dominant <code>gold.base</code> term directly.</p>\n      </div>\n      <div class=\"box\" id=\"utilityBox\">\n        <h5>Utility slot <span id=\"utilNextLbl\"></span><span class=\"tag win\" id=\"utilWinTag\" hidden>better</span></h5>\n        <div class=\"big\" id=\"utilComparBig\">&mdash;</div>\n        <div class=\"unit\">gold/action gained per 1B spent</div>\n        <dl>\n          <dt>Level cost</dt><dd id=\"utilStepCost\">&mdash;</dd>\n          <dt>Gold/action gained</dt><dd id=\"utilStepGain\">&mdash;</dd>\n          <dt>Pays back in</dt><dd id=\"utilStepBack\">&mdash;</dd>\n        </dl>\n        <p>Boosts one nested additive term three layers deep &mdash; much weaker leverage.</p>\n      </div>\n    </div>\n\n    <div class=\"panel\">\n      <h5>Where the two slots break even</h5>\n      <div class=\"tbl-wrap auto\"><table class=\"roi\">\n        <thead>\n          <tr class=\"cols\"><th>If combat slot is</th><th>Utility worth buying up to</th><th>Utility boost there</th><th>Cost of that utility level</th><th>Cost of the combat level</th></tr>\n        </thead>\n        <tbody id=\"crossTbody\"></tbody>\n      </table></div>\n      <p class=\"note\">Read a row as: <strong>at that combat level, every utility level up to the second column returns more gold per gold spent than the next combat level does</strong>. The column climbs in steps because a slot's rate steps up every 30 levels, so a utility level just past a boundary can briefly out-earn combat again.</p>\n    </div>\n\n    <div class=\"panel\">\n      <h5>Next 24 purchases, buying the better slot each time</h5>\n      <div class=\"strip\" id=\"planStrip\"></div>\n      <div class=\"legend\">\n        <span><i class=\"sw\" style=\"background:var(--warm);border:none\"></i> combat</span>\n        <span><i class=\"sw\" style=\"background:var(--accent);border:none\"></i> utility</span>\n        <span><i class=\"sw\" style=\"background:var(--surface);border-color:var(--success)\"></i> the flip</span>\n      </div>\n      <p class=\"note\" id=\"planNote\">&mdash;</p>\n    </div>\n\n    <h3 class=\"sec\" id=\"combat-table\">Combat pet slot ROI</h3>\n    <p class=\"sec-sub\">Utility pet held at your current input. Cumulative measured from your current combat slot level.</p>\n    <div class=\"tbl-wrap\" id=\"combatWrap\"><table class=\"roi\">\n      <thead>\n        <tr class=\"grp\"><th colspan=\"4\"></th><th colspan=\"2\">this level alone</th><th colspan=\"3\" class=\"sep\">cumulative from current</th></tr>\n        <tr class=\"cols\"><th>Slot</th><th>Boost</th><th>Gold / action</th><th>Level cost</th><th>Payback (actions)</th><th>Weeks</th><th class=\"sep\">Total cost</th><th>Payback (actions)</th><th>Weeks</th></tr>\n      </thead>\n      <tbody id=\"combatTbody\"></tbody>\n    </table></div>\n    <div class=\"tblfoot\">\n      <span class=\"count\" id=\"combatRowCount\"></span>\n      <button type=\"button\" class=\"btn\" id=\"combatExpandBtn\">Expand</button>\n      <button type=\"button\" class=\"btn\" id=\"combatMoreBtn\">+30</button>\n      <input type=\"number\" id=\"combatJumpInput\" min=\"0\" max=\"5000\" placeholder=\"to level\">\n      <button type=\"button\" class=\"btn\" id=\"combatJumpBtn\">Go</button>\n    </div>\n\n    <h3 class=\"sec\" id=\"utility-table\">Utility pet slot ROI</h3>\n    <p class=\"sec-sub\">Combat pet held at your current input. Only Potion Effect% changes with this slot &mdash; same cost curve, much weaker leverage.</p>\n    <div class=\"tbl-wrap\" id=\"utilityWrap\"><table class=\"roi\">\n      <thead>\n        <tr class=\"grp\"><th colspan=\"4\"></th><th colspan=\"2\">this level alone</th><th colspan=\"3\" class=\"sep\">cumulative from current</th></tr>\n        <tr class=\"cols\"><th>Slot</th><th>Boost</th><th>Gold / action</th><th>Level cost</th><th>Payback (actions)</th><th>Weeks</th><th class=\"sep\">Total cost</th><th>Payback (actions)</th><th>Weeks</th></tr>\n      </thead>\n      <tbody id=\"utilityTbody\"></tbody>\n    </table></div>\n    <div class=\"tblfoot\">\n      <span class=\"count\" id=\"utilityRowCount\"></span>\n      <button type=\"button\" class=\"btn\" id=\"utilityExpandBtn\">Expand</button>\n      <button type=\"button\" class=\"btn\" id=\"utilityMoreBtn\">+30</button>\n      <input type=\"number\" id=\"utilityJumpInput\" min=\"0\" max=\"5000\" placeholder=\"to level\">\n      <button type=\"button\" class=\"btn\" id=\"utilityJumpBtn\">Go</button>\n    </div>\n\n    <div class=\"legend\" style=\"margin:.6rem 0 1.5rem\">\n      <span><i class=\"sw\" style=\"background:var(--current)\"></i> your current slot level</span>\n      <span><i class=\"sw\" style=\"background:var(--band)\"></i> pays back in 2&ndash;4 weeks</span>\n      <span><i class=\"sw\" style=\"background:var(--surface);border-color:var(--success)\"></i> <span style=\"color:var(--success)\">green</span> = block boundary (31/61/91), rate steps up</span>\n    </div>\n\n    <details class=\"panel\" id=\"steps\">\n      <summary>Calculation steps <span class=\"s\">&mdash; how gold/action was derived, in order</span></summary>\n      <div class=\"panel-body\"><div class=\"calc\" id=\"ledger\"></div></div>\n    </details>\n\n    <details class=\"panel\" id=\"notes\">\n      <summary>Formulas &amp; notes <span class=\"s\">&mdash; assumptions, sources, where a gap comes from</span></summary>\n      <div class=\"panel-body\">\n        <h4>Where a gap between this model and your real gold/action comes from</h4>\n        <ul>\n          <li><strong>Compare the same figure.</strong> The game shows gold two ways &mdash; the pre-tax amount gained, and the amount <em>kept</em> after village tax. Both are correct; they are just not the same number. Set Tax% and this page shows both, so a mismatch is a real mismatch rather than a units problem. Tax is not a recorded fact in the core, so it defaults to 0.</li>\n          <li><strong>Party members' own boosts.</strong> Pooled Base is the <em>sum</em> of every member's fully-stacked Gold Boost. If they are not clones of you, untick &ldquo;Others match me&rdquo;. Usually the largest single source of drift.</li>\n          <li><strong>Party size.</strong> At exactly 5 members the combined total is multiplied by 0.8; 1&ndash;4 take no penalty.</li>\n          <li><strong>Categories once pinned at 0</strong> and editable now: skill-tree gold, the pets' own &ldquo;Gold&rdquo; modifier, event, and the gold potion's base value.</li>\n          <li>A stable <em>percentage</em> gap is a missing multiplier; a stable <em>absolute</em> gap points at the base terms or the monster level.</li>\n        </ul>\n        <h4>Assumptions</h4>\n        <ul>\n          <li><strong>Level costs are cumulative to reach a level, individual to buy one.</strong> Each level has its own price &mdash; <code>floor(500,000 &times; L&sup3;)</code> for the level you are buying into.</li>\n          <li><strong>Use the per-level column to decide where to stop.</strong> It is the correct marginal rule; cumulative is the budgeting view.</li>\n          <li>Both pet slots share the identical cost formula and the identical 30-level accelerating boost curve.</li>\n          <li>Every field is remembered in this browser only.</li>\n        </ul>\n        <h4>Generated from the core, not retyped here</h4>\n        <ul id=\"provenanceList\"></ul>\n        <h4>Why the utility pet is so much weaker</h4>\n        <ul>\n          <li>The combat pet's slot level multiplies <strong>monsterGoldFlat / monsterGoldPercentage directly</strong> &mdash; the dominant term in <code>gold.base</code>, which is then multiplied again by the party multiplier.</li>\n          <li>The utility pet's slot level only boosts its own <strong>raw Potion Effect roll</strong> &mdash; one additive term inside Potion Effect's Base, feeding a small Premium sub-term dwarfed by the pooled party Base it multiplies against.</li>\n        </ul>\n      </div>\n    </details>\n  </main>\n</div>\n\n<div id=\"tip\" role=\"tooltip\"></div>\n<button type=\"button\" id=\"theme\" aria-label=\"Toggle light and dark\">&#9789;</button>\n\n<script>\n/* GENERATED from data/ by userscripts/build.mjs — do not edit. */\nwindow.APOZ_FACTS = (function () {\n  /* formulas/pets.json :: pets.slotUpgrade.costFormula  [CODE] */\n  function petSlotUpgradeCost(currentLevel, newLevel) { let total = 0; for (let r = currentLevel + 1; r <= newLevel; r++) total += Math.floor(500000 * r**3); return { currency: 'gold', value: total }; } // per-level marginal cost at level L->L+1 is floor(500000*(L+1)^3)\n  /* formulas/equipment.json :: equipment.slotUpgrade.boostFormula  [CODE] */\n  function slotBoostPercent(slotLevel) { let block = Math.floor(slotLevel / 30); let intoBlock = slotLevel % 30; return 0.3*block*(block+1)/2 + intoBlock*0.01*(block+1); }\n  /* formulas/party.json :: party.fifthMemberPenalty.formula  [CODE] */\n  function partySizeMultiplier(memberCount) { return memberCount === 5 ? 0.8 : 1; }\n  /* formulas/economy.json :: gold.levelMultiplier  [LIVE] */\n  function goldLevelMultiplier(characterLevel) { return 1 + 0.0001 * characterLevel; }\n  /* tables/modifier-tiers.json :: tiers.pet.boostPercent  [CODE] */\n  const petTierBoostPercent = [10,20,30,40,50,60,70,80,90,100,125,150,170,190,210,230];\n  return { petSlotUpgradeCost, slotBoostPercent, partySizeMultiplier, goldLevelMultiplier, petTierBoostPercent };\n})();\n</script>\n<script>\n(function(){\n  \"use strict\";\n\n  var STORAGE_KEY = 'petSlotROI.inputs.v4';\n  var DEFAULTS_KEY = 'petSlotROI.defaults.v3';\n  var THEME_KEY = 'petSlotROI.theme';\n  var LEGACY_STORAGE = ['petSlotROI.inputs.v3','petSlotROI.inputs.v2'];\n  var LEGACY_DEFAULTS = ['petSlotROI.defaults.v2','petSlotROI.defaults.v1'];\n\n  var ORIGINAL_DEFAULTS = {\n    combat: 50, utility: 30,\n    enchants: 518, sculptures: 500, skillTree: 0, petGoldMod: 0,\n    market: 320, village: 40,\n    pvpGoldTile: 20, pvpPotionTile: 4, tax: 0,\n    partyMembers: 4, othersGoldBoost: 0,\n    goldPotion: 10, event: 0,\n    monsterLevel: 230000, characterLevel: 11500, actionsPerWeek: 6000,\n    petILevel: 11000, petTier: 16, petRollPercentile: 75,\n    observedGold: 0\n  };\n  var DEFAULTS = Object.assign({}, ORIGINAL_DEFAULTS);\n  var CHECK_DEFAULTS = { vip: true, othersSame: true, useLivePet: false };\n\n  var FIELD_IDS = {\n    combat: 'combatInput', utility: 'utilityInput',\n    enchants: 'enchantsInput', sculptures: 'sculpturesInput',\n    skillTree: 'skillTreeInput', petGoldMod: 'petGoldModInput',\n    market: 'marketInput', village: 'villageInput',\n    pvpGoldTile: 'pvpGoldTileInput', pvpPotionTile: 'pvpPotionTileInput', tax: 'taxInput',\n    partyMembers: 'partyMembersInput', othersGoldBoost: 'othersGoldBoostInput',\n    goldPotion: 'goldPotionInput', event: 'eventInput',\n    monsterLevel: 'monsterLevelInput', characterLevel: 'characterLevelInput', actionsPerWeek: 'actionsPerWeekInput',\n    petILevel: 'petILevelInput', petTier: 'petTierInput', petRollPercentile: 'petRollPercentileInput',\n    observedGold: 'observedGoldInput'\n  };\n  var CHECK_IDS = { vip: 'vipInput', othersSame: 'othersSameInput', useLivePet: 'useLivePetInput' };\n  var VIP_PCT_WHEN_ON = 0.10;\n\n  // ---- core facts, all generated into window.APOZ_FACTS by the build ----\n  // slotBoostPercent is emitted from equipment.slotUpgrade.boostFormula, which\n  // pets.slotBoostFormula states is the identical function for pet slots.\n  // Despite the name it returns a FRACTION, so *100 happens here and nowhere\n  // else. The percent form is always a whole number, so rounding is exact and\n  // is the only thing between the UI and \"+70.00000000000001%\".\n  function slotBoostPct(L){ return Math.round(APOZ_FACTS.slotBoostPercent(L) * 100); }\n  function stepCost(L){ return APOZ_FACTS.petSlotUpgradeCost(L - 1, L).value; }\n\n  function petTierMultiplier(tier){\n    var t = APOZ_FACTS.petTierBoostPercent;\n    tier = Math.max(1, Math.min(t.length, Math.round(tier)));\n    return 1 + t[tier-1]/100;\n  }\n  function petVariance(pct){ return 0.97 + Math.max(0, Math.min(100, pct))/100 * (1.03-0.97); }\n\n  // The pet's rolled modifiers. Either MODELLED from iLevel/tier/roll, or taken\n  // straight from what the userscript read off your actual pets. The modelled\n  // path is for normalised comparisons; the live path is your real answer, and\n  // when it is in use the modelling inputs grey out rather than being left to\n  // look as though they still matter.\n  function petRawRolls(p){\n    if (p.useLivePet && p.livePet) {\n      return { source: 'live',\n        rawFlat: p.livePet.flat, rawPct: p.livePet.pct, rawPotionEffect: p.livePet.potion };\n    }\n    var iL = Math.max(p.petILevel, 101);\n    var tm = petTierMultiplier(p.petTier);\n    var v = petVariance(p.petRollPercentile);\n    var base = Math.pow(iL-100, 0.49);\n    return { source: 'modelled',\n      rawFlat: Math.log(base+1) * 0.1 * v * tm,\n      rawPct: base * 0.005 * v * tm,\n      rawPotionEffect: base * 0.0025 * v * tm };\n  }\n\n  // ---- formatting ----\n  function fmt(n){\n    if (!isFinite(n)) return '—';\n    var u=[['Qa',1e15],['T',1e12],['B',1e9],['M',1e6],['K',1e3]];\n    for(var k=0;k<u.length;k++){ if (Math.abs(n)>=u[k][1]) return (n/u[k][1]).toFixed(2)+u[k][0]; }\n    return n.toFixed(0);\n  }\n  function fmtInt(n){ return isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—'; }\n  function P(x){ return (x*100).toFixed(2)+'%'; }\n  function weeks(w){ return !isFinite(w) ? '—' : w < 1 ? (w*7).toFixed(1)+' d' : w.toFixed(1)+' wk'; }\n  function clampLevel(v){ v = parseInt(v,10); if (isNaN(v)||v<0) v=0; return v>5000?5000:v; }\n  function num(v, fb){ v = parseFloat(v); return isNaN(v) ? fb : v; }\n\n  // ---- profile ----\n  // buildProfile() is pure: raw values in, normalised profile out. readInputs()\n  // is the only part that touches the DOM. That split is what lets\n  // tests/userscript-roi-math.mjs exercise the shipped arithmetic rather than a\n  // re-typed copy of it.\n  function buildProfile(raw){\n    raw = Object.assign({}, ORIGINAL_DEFAULTS,\n      { vipChecked: true, othersSame: true, useLivePet: false, livePet: null }, raw);\n    raw.combat = clampLevel(raw.combat);\n    raw.utility = clampLevel(raw.utility);\n    if (raw.actionsPerWeek <= 0) raw.actionsPerWeek = 1;\n    if (raw.petILevel < 101) raw.petILevel = 101;\n    raw.partyMembers = Math.max(1, Math.min(5, Math.round(raw.partyMembers)));\n\n    var p = {\n      combat: raw.combat, utility: raw.utility,\n      partyMembers: raw.partyMembers,\n      othersSameAsMe: !!raw.othersSame,\n      othersGoldBoost: raw.othersGoldBoost/100,\n      vip: raw.vipChecked ? VIP_PCT_WHEN_ON : 0,\n      goldPotionBase: raw.goldPotion/100,\n      event: raw.event/100,\n      enchants: raw.enchants/100, sculptures: raw.sculptures/100,\n      skillTree: raw.skillTree/100, petGoldMod: raw.petGoldMod/100,\n      market: raw.market/100, pvpGoldTile: raw.pvpGoldTile/100,\n      village: raw.village/100, pvpPotionTile: raw.pvpPotionTile/100,\n      tax: Math.max(0, Math.min(100, raw.tax))/100,\n      monsterLevel: raw.monsterLevel, characterLevel: raw.characterLevel,\n      actionsPerWeek: raw.actionsPerWeek,\n      petILevel: raw.petILevel, petTier: raw.petTier, petRollPercentile: raw.petRollPercentile,\n      useLivePet: !!raw.useLivePet, livePet: raw.livePet || null,\n      observedGold: raw.observedGold > 0 ? raw.observedGold * 1e9 : null\n    };\n    p.rolls = petRawRolls(p);\n    p.pooled = pooledBase(p);\n    p.levelMult = APOZ_FACTS.goldLevelMultiplier(p.characterLevel);\n    return p;\n  }\n\n  function readInputs(){\n    var raw = {}, key;\n    for (key in FIELD_IDS) raw[key] = num(document.getElementById(FIELD_IDS[key]).value, DEFAULTS[key]);\n    raw.vipChecked = document.getElementById(CHECK_IDS.vip).checked;\n    raw.othersSame = document.getElementById(CHECK_IDS.othersSame).checked;\n    raw.useLivePet = document.getElementById(CHECK_IDS.useLivePet).checked;\n    raw.livePet = livePetModifiers;\n    return buildProfile(raw);\n  }\n\n  // ---- formula chain ----\n  function personalGoldTotal(p){\n    var base = p.enchants + p.market + p.village + p.sculptures + p.skillTree + p.petGoldMod;\n    return (1+base)*(1+p.pvpGoldTile) - 1;\n  }\n  // party.gold.rewardBoostFormula: PooledBase is the SUM across members of each\n  // member's OWN fully-stacked personal total. party.fifthMemberPenalty.formula\n  // then applies x0.8 at exactly 5.\n  function pooledBase(p){\n    var mine = personalGoldTotal(p);\n    var others = (p.partyMembers - 1) * (p.othersSameAsMe ? mine : p.othersGoldBoost);\n    return (mine + others) * APOZ_FACTS.partySizeMultiplier(p.partyMembers);\n  }\n\n  // The hot path. A crossover scan evaluates this ~1,600 times per combat level\n  // examined, so it allocates nothing and reads values hoisted in buildProfile.\n  function partyMultAt(p, U){\n    var pe = p.rolls.rawPotionEffect * (1 + slotBoostPct(U)/100);\n    var potionEffectTotal = (1 + pe + 2*p.village)*(1+p.pvpPotionTile) - 1;\n    var premium = p.vip + p.goldPotionBase*(1+potionEffectTotal);\n    return (1+p.pooled)*(1+premium)*(1+p.event);\n  }\n  function potionMix(p, U){\n    var pe = p.rolls.rawPotionEffect * (1 + slotBoostPct(U)/100);\n    var potionEffectBase = pe + p.village + p.village;\n    var potionEffectTotal = (1+potionEffectBase)*(1+p.pvpPotionTile) - 1;\n    var goldPotionBonus = p.goldPotionBase*(1+potionEffectTotal);\n    return { petPotionEffect: pe, potionEffectBase: potionEffectBase,\n             potionEffectTotal: potionEffectTotal, goldPotionBonus: goldPotionBonus,\n             premium: p.vip + goldPotionBonus, mult: partyMultAt(p, U) };\n  }\n  function goldBaseAt(p, C){\n    var boost = 1 + slotBoostPct(C)/100;\n    return (3 + p.rolls.rawFlat*boost) * (1 + p.rolls.rawPct*boost) * p.monsterLevel;\n  }\n  function goldPerAction(p, C, U){ return goldBaseAt(p, C) * p.levelMult * partyMultAt(p, U); }\n  // What you actually keep. A flat tax scales both channels equally, so it never\n  // changes WHICH slot to buy - it only makes the number comparable to the\n  // game's own \"kept\" figure.\n  function keptPerAction(p, C, U){ return goldPerAction(p, C, U) * (1 - p.tax); }\n\n  // ---- marginal economics ----\n  function marginal(p, C, U, channel){\n    var next = (channel === 'combat' ? C : U) + 1;\n    var cost = stepCost(next);\n    var gain = channel === 'combat'\n      ? goldPerAction(p, C+1, U) - goldPerAction(p, C, U)\n      : goldPerAction(p, C, U+1) - goldPerAction(p, C, U);\n    return { level: next, cost: cost, gain: gain, eff: cost > 0 ? gain/cost : Infinity,\n             paybackActions: gain > 0 ? cost/gain : Infinity };\n  }\n\n  // Largest utility level at which utility still beats combat, for a fixed\n  // combat level. NOT an early-exit search: a slot's per-level rate steps up\n  // every 30 levels, so efficiency JUMPS at 30/60/90 and the winning set is not\n  // contiguous. Scanning the whole range is cheap and is the only correct way.\n  var CROSS_SCAN_CAP = 400;\n  function crossoverUtility(p, C, cap){\n    cap = cap || CROSS_SCAN_CAP;\n    if (!p._cross) p._cross = {};\n    if (p._cross[C] !== undefined) return p._cross[C];\n    var best = -1;\n    for (var U = 0; U <= cap; U++){\n      if (marginal(p, C, U, 'utility').eff >= marginal(p, C, U, 'combat').eff) best = U;\n    }\n    p._cross[C] = best;\n    return best;\n  }\n\n  function greedyPlan(p, steps){\n    var C = p.combat, U = p.utility, seq = [], total = 0, flipAt = -1, prev = null;\n    for (var i = 0; i < steps; i++){\n      var mc = marginal(p, C, U, 'combat'), mu = marginal(p, C, U, 'utility');\n      var pick = mu.eff > mc.eff ? 'utility' : 'combat';\n      var m = pick === 'combat' ? mc : mu;\n      if (prev !== null && pick !== prev && flipAt < 0) flipAt = i;\n      prev = pick; total += m.cost;\n      seq.push({ channel: pick, level: m.level, cost: m.cost });\n      if (pick === 'combat') C++; else U++;\n    }\n    return { seq: seq, total: total, flipAt: flipAt, endC: C, endU: U };\n  }\n\n  // ---- tooltips ----\n  // ONE fixed-position element, not a bubble inside each trigger. The old\n  // per-element bubbles were clipped by the sidebar's scroll container, which\n  // is unavoidable for an absolutely-positioned child of an overflow:auto\n  // ancestor. Fixed positioning escapes the container entirely.\n  var tipEl = null, tipFor = null;\n  function showTip(el){\n    var text = el.getAttribute('data-tip');\n    if (!text) return;\n    tipFor = el;\n    tipEl.textContent = text;\n    tipEl.classList.add('on');\n    var r = el.getBoundingClientRect();\n    var t = tipEl.getBoundingClientRect();\n    var left = Math.min(Math.max(8, r.left + r.width/2 - t.width/2), window.innerWidth - t.width - 8);\n    var top = r.top - t.height - 8;\n    if (top < 8) top = r.bottom + 8;   // flip below when there is no room above\n    tipEl.style.left = Math.round(left) + 'px';\n    tipEl.style.top = Math.round(top) + 'px';\n  }\n  function hideTip(){ tipFor = null; tipEl.classList.remove('on'); }\n  function initTips(){\n    tipEl = document.getElementById('tip');\n    document.addEventListener('mouseover', function(e){\n      var el = e.target && e.target.closest && e.target.closest('[data-tip]');\n      if (el) showTip(el);\n    });\n    document.addEventListener('mouseout', function(e){\n      var el = e.target && e.target.closest && e.target.closest('[data-tip]');\n      if (el && el === tipFor) hideTip();\n    });\n    document.addEventListener('focusin', function(e){\n      var el = e.target && e.target.closest && e.target.closest('[data-tip]');\n      if (el) showTip(el);\n    });\n    document.addEventListener('focusout', hideTip);\n    // A tooltip pinned to viewport coordinates is wrong the moment anything\n    // scrolls, and re-measuring on every scroll frame is not worth it.\n    window.addEventListener('scroll', hideTip, true);\n  }\n\n  // ---- calculation steps ----\n  function tipAttr(technical){ return technical.replace(/&/g,'&amp;').replace(/\"/g,'&quot;').replace(/</g,'&lt;'); }\n  function tipSpan(label, technical){\n    return '<span class=\"tip\" data-tip=\"' + tipAttr(technical) + '\">' + label + '</span>';\n  }\n  function buildLedger(p){\n    var C = p.combat, U = p.utility;\n    var mix = potionMix(p, U);\n    var gb = goldBaseAt(p, C);\n    var lm = p.levelMult;\n    var gpa = gb * lm * mix.mult;\n    var kept = gpa * (1 - p.tax);\n    var baseSum = p.enchants + p.market + p.village + p.sculptures + p.skillTree + p.petGoldMod;\n    var penalty = APOZ_FACTS.partySizeMultiplier(p.partyMembers);\n\n    document.getElementById('headlineGold').textContent = fmt(gpa);\n    var keptRow = document.getElementById('keptRow');\n    keptRow.hidden = !p.tax;\n    if (p.tax) document.getElementById('keptGold').textContent = fmt(kept);\n    document.getElementById('combatBoostOut').textContent = '+' + slotBoostPct(C) + '%';\n    document.getElementById('utilityBoostOut').textContent = '+' + slotBoostPct(U) + '%';\n\n    document.getElementById('rollFlatOut').textContent = p.rolls.rawFlat.toFixed(3);\n    document.getElementById('rollPctOut').textContent = P(p.rolls.rawPct);\n    document.getElementById('rollPotionOut').textContent = P(p.rolls.rawPotionEffect);\n    document.getElementById('petSourceNote').textContent = p.rolls.source === 'live'\n      ? 'From your imported pets, before the slot boost.'\n      : 'Modelled from iLevel / tier / roll, before the slot boost.';\n\n    // 5 x 0.8 = 4 exactly, so a 5th member who matches you is worth precisely\n    // nothing to pooled gold - not obvious from either rule on its own.\n    var partyNote = document.getElementById('partyNote');\n    if (p.partyMembers === 5){\n      var withoutFifth = p.othersSameAsMe ? 4*personalGoldTotal(p) : personalGoldTotal(p) + 3*p.othersGoldBoost;\n      var fifthWorth = p.pooled - withoutFifth;\n      partyNote.innerHTML = Math.abs(fifthWorth) < 1e-9\n        ? '<strong>The 5th member is exactly break-even for gold</strong> — 5 &times; 0.8 = 4. They only pay for themselves if their own Gold Boost beats a quarter of the other four’s total.'\n        : fifthWorth > 0\n          ? '5th member adds <strong>+' + P(fifthWorth) + '</strong> to Pooled Base after the &times;0.8 penalty.'\n          : '5th member <strong>costs</strong> ' + P(-fifthWorth) + ' of Pooled Base — the penalty outweighs them.';\n      partyNote.hidden = false;\n    } else { partyNote.hidden = true; }\n\n    var calibRow = document.getElementById('calibRow');\n    if (p.observedGold){\n      var d = kept - p.observedGold;\n      var el = document.getElementById('calibOut');\n      el.textContent = (d >= 0 ? '+' : '−') + fmt(Math.abs(d)) + ' (' + (d/p.observedGold*100).toFixed(1) + '%)';\n      el.className = 'v ' + (Math.abs(d/p.observedGold) < 0.01 ? 'good' : 'off');\n      calibRow.hidden = false;\n    } else { calibRow.hidden = true; }\n\n    var steps = [\n      ['Personal Gold Boost', 'mirrors Character > Boosts > \"Gold Boost\" - per member, pre-pool',\n       '(1+' + P(baseSum) + ')x(1+' + P(p.pvpGoldTile) + ' PvP)-1', P(personalGoldTotal(p))],\n      ['Party Pooling', 'party.gold.rewardBoostFormula - the sum of each member’s own total',\n       (p.othersSameAsMe ? P(personalGoldTotal(p)) + 'x' + p.partyMembers\n                         : 'me ' + P(personalGoldTotal(p)) + ' + ' + (p.partyMembers-1) + 'x' + P(p.othersGoldBoost))\n       + (penalty !== 1 ? ' x' + penalty + ' (5-member penalty)' : ''), P(p.pooled)],\n      ['Potion Effect', 'Utility pet, slot ' + U,\n       'rawPotionEffect x boost + village x2, x(1+pvpPotionTile)', P(mix.potionEffectTotal)],\n      ['Gold Potion to Premium', 'goldPotionBase x (1+potionEffectTotal), feeds Premium with VIP',\n       p.goldPotionBase.toFixed(2) + 'x(1+' + P(mix.potionEffectTotal) + ') + VIP ' + P(p.vip), P(mix.premium)],\n      ['Party Gold Multiplier', '(1+Pooled)(1+Premium)(1+Event)',\n       '(1+' + P(p.pooled) + ')x(1+' + P(mix.premium) + ')x(1+' + P(p.event) + ')', 'x' + mix.mult.toFixed(2)],\n      ['Monster Gold Base', 'Combat pet, slot ' + C,\n       '(3+rawFlat x boost)x(1+rawPct x boost)x' + fmtInt(p.monsterLevel), fmt(gb)]\n    ];\n    var html = '';\n    for (var i = 0; i < steps.length; i++){\n      html += '<div class=\"step\"><span class=\"step-n\">' + (i+1) + '</span>'\n        + '<span class=\"l\">' + tipSpan(steps[i][0], steps[i][1]) + '</span>'\n        + '<span class=\"e\">' + steps[i][2] + '</span>'\n        + '<span class=\"v\">' + steps[i][3] + '</span></div>';\n    }\n    html += '<div class=\"step final\"><span class=\"step-n\">' + (steps.length+1) + '</span>'\n      + '<span class=\"l\">' + tipSpan('Gold / Party Action', 'gold.base x level mult (1+0.0001 x characterLevel) x party mult') + '</span>'\n      + '<span class=\"e\">' + fmt(gb) + 'x' + lm.toFixed(2) + 'x' + mix.mult.toFixed(2) + '</span>'\n      + '<span class=\"v\">' + fmt(gpa) + '</span></div>';\n    if (p.tax) {\n      html += '<div class=\"step final\"><span class=\"step-n\">' + (steps.length+2) + '</span>'\n        + '<span class=\"l\">' + tipSpan('Kept after tax', 'true income - what reaches your gold after the village takes its share') + '</span>'\n        + '<span class=\"e\">' + fmt(gpa) + ' x (1-' + P(p.tax) + ')</span>'\n        + '<span class=\"v\">' + fmt(kept) + '</span></div>';\n    }\n    document.getElementById('ledger').innerHTML = html;\n  }\n\n  // ---- breakpoint ----\n  function buildBreakpoint(p){\n    var mc = marginal(p, p.combat, p.utility, 'combat');\n    var mu = marginal(p, p.combat, p.utility, 'utility');\n    var combatWins = mc.eff >= mu.eff;\n\n    function fill(prefix, m, boxId, tagId){\n      document.getElementById(prefix + 'ComparBig').textContent = (m.eff*1e9).toFixed(m.eff*1e9 < 10 ? 2 : 0);\n      document.getElementById(prefix + 'StepCost').textContent = fmt(m.cost);\n      document.getElementById(prefix + 'StepGain').textContent = fmt(m.gain);\n      document.getElementById(prefix + 'StepBack').textContent =\n        weeks(m.paybackActions / p.actionsPerWeek) + ' (' + fmtInt(m.paybackActions) + ')';\n      document.getElementById(boxId).classList.toggle('win', (prefix === 'combat') === combatWins);\n      document.getElementById(tagId).hidden = (prefix === 'combat') !== combatWins;\n    }\n    document.getElementById('combatNextLbl').textContent = '→ ' + mc.level;\n    document.getElementById('utilNextLbl').textContent = '→ ' + mu.level;\n    fill('combat', mc, 'combatBox', 'combatWinTag');\n    fill('util', mu, 'utilityBox', 'utilWinTag');\n\n    var ratio = combatWins ? (mu.eff > 0 ? mc.eff/mu.eff : Infinity) : (mc.eff > 0 ? mu.eff/mc.eff : Infinity);\n    var ans = document.getElementById('verdictAnswer');\n    ans.textContent = combatWins ? 'COMBAT → ' + mc.level : 'UTILITY → ' + mu.level;\n    ans.classList.toggle('util', !combatWins);\n    document.getElementById('verdictWhy').innerHTML =\n      'At combat <strong>' + p.combat + '</strong> / utility <strong>' + p.utility + '</strong>, the next <strong>' +\n      (combatWins ? 'combat' : 'utility') + '</strong> level returns <strong>' +\n      (isFinite(ratio) ? ratio.toFixed(1) + '×' : '∞') + '</strong> more gold/action per gold spent. It costs ' +\n      fmt((combatWins?mc:mu).cost) + ' and pays back in ' + weeks((combatWins?mc:mu).paybackActions / p.actionsPerWeek) + '.';\n\n    var bp = crossoverUtility(p, p.combat);\n    document.getElementById('verdictBreak').innerHTML = bp < 0\n      ? 'Break-even is behind you: at combat <strong>' + p.combat + '</strong>, no utility level beats the next combat level.'\n      : 'Break-even: at combat <strong>' + p.combat + '</strong>, utility is worth buying up to <strong>' + bp + '</strong>' +\n        (p.utility <= bp ? ' — you are at ' + p.utility + ', so ' + (bp - p.utility) + ' worthwhile level' + (bp-p.utility===1?'':'s') + ' remain.'\n                         : ' — you are already past it at ' + p.utility + '.');\n\n    var ladder = [0,30,60,90,120,150,180,210,240];\n    if (ladder.indexOf(p.combat) < 0) ladder.push(p.combat);\n    ladder.sort(function(a,b){ return a-b; });\n    var rows = '';\n    for (var i = 0; i < ladder.length; i++){\n      var C = ladder[i], u = crossoverUtility(p, C), isCur = C === p.combat;\n      rows += '<tr class=\"' + (isCur ? 'current' : '') + '\">' +\n        '<td class=\"lvl\">' + C + (isCur ? ' <span class=\"tag\">you</span>' : '') + '</td>' +\n        '<td>' + (u < 0 ? 'none — combat always wins' : u) + '</td>' +\n        '<td>' + (u < 0 ? '—' : '+' + slotBoostPct(u) + '%') + '</td>' +\n        '<td>' + (u < 1 ? '—' : fmt(stepCost(u))) + '</td>' +\n        '<td>' + fmt(stepCost(C+1)) + '</td></tr>';\n    }\n    document.getElementById('crossTbody').innerHTML = rows;\n\n    var PLAN_STEPS = 24, plan = greedyPlan(p, PLAN_STEPS), strip = '';\n    for (var j = 0; j < plan.seq.length; j++){\n      var s = plan.seq[j];\n      strip += '<div class=\"cell ' + (s.channel === 'combat' ? 'c' : 'u') + (j === plan.flipAt ? ' flip' : '') +\n        '\" data-tip=\"#' + (j+1) + ' — ' + s.channel + ' slot level ' + s.level + ', ' + fmt(s.cost) + ' gold\">' + s.level + '</div>';\n    }\n    document.getElementById('planStrip').innerHTML = strip;\n    var nC = plan.seq.filter(function(s){ return s.channel === 'combat'; }).length;\n    var goldNow = keptPerAction(p, p.combat, p.utility);\n    document.getElementById('planNote').innerHTML =\n      '<strong>' + nC + ' combat</strong> and <strong>' + (PLAN_STEPS - nC) + ' utility</strong> levels, ending at combat ' +\n      plan.endC + ' / utility ' + plan.endU + '. Total ' + fmt(plan.total) + ' gold — about ' +\n      weeks(plan.total / goldNow / p.actionsPerWeek) + ' of income at ' + fmt(goldNow) + '/action kept and ' +\n      fmtInt(p.actionsPerWeek) + ' actions a week. ' +\n      (plan.flipAt < 0 ? 'No flip inside this window.' : 'First flip at purchase <strong>#' + (plan.flipAt + 1) + '</strong>.');\n  }\n\n  // ---- ROI tables ----\n  function buildTableRows(p, sweepFn, currentLevel, maxLevel){\n    var rows = [], cur = clampLevel(currentLevel), gAtCur = sweepFn(cur), cum = 0;\n    var topLevel = Math.max(maxLevel, cur), prevGold = null;\n    for (var L = 0; L <= topLevel; L++){\n      var gold = sweepFn(L);\n      var cost = L === 0 ? 0 : stepCost(L);\n      var marg = L === 0 ? 0 : gold - prevGold;\n      prevGold = gold;\n      var margAct = L === 0 ? null : cost/marg, cumCost = null, cumAct = null;\n      if (L > cur){ cum += cost; cumCost = cum; cumAct = cum/(gold - gAtCur); }\n      var cls = [];\n      if (L === cur) cls.push('current');\n      if (L > 0 && L % 30 === 1) cls.push('boundary');\n      var mw = margAct ? margAct/p.actionsPerWeek : null;\n      if (mw !== null && mw >= 2 && mw <= 4) cls.push('band');\n      rows.push('<tr class=\"'+cls.join(' ')+'\"'+(L===cur?' data-current=\"1\"':'')+'>' +\n        '<td class=\"lvl\">'+L+(L===cur?' <span class=\"tag\">current</span>':'')+'</td>' +\n        '<td>'+slotBoostPct(L)+'%</td><td>'+fmt(gold)+'</td>' +\n        '<td>'+(L===0?'—':fmt(cost))+'</td>' +\n        '<td>'+(margAct===null?'—':fmtInt(margAct))+'</td>' +\n        '<td>'+(mw===null?'—':mw.toFixed(2))+'</td>' +\n        '<td class=\"sep\">'+(cumCost===null?'—':fmt(cumCost))+'</td>' +\n        '<td>'+(cumAct===null?'—':fmtInt(cumAct))+'</td>' +\n        '<td>'+(cumAct===null?'—':(cumAct/p.actionsPerWeek).toFixed(2))+'</td></tr>');\n    }\n    return { html: rows.join(''), count: rows.length, top: topLevel };\n  }\n\n  // Put the user's current level where they can see it, with a few rows of\n  // context above and the rest - the levels they might actually buy - below.\n  function scrollToCurrent(wrapId){\n    var wrap = document.getElementById(wrapId);\n    if (!wrap) return;\n    var row = wrap.querySelector('tr[data-current]');\n    if (!row) return;\n    var head = wrap.querySelector('thead');\n    var headH = head ? head.getBoundingClientRect().height : 0;\n    wrap.scrollTop = Math.max(0, row.offsetTop - headH - row.offsetHeight * 4);\n  }\n\n  var combatMaxLevel = 120, utilityMaxLevel = 120;\n  var MAX_LEVEL_CAP = 5000;\n  var pendingScroll = true;\n\n  // Coalesced through rAF: typing fires `input` per keystroke and a full render\n  // rebuilds two tables plus a 400-step crossover scan. rAF never fires in a\n  // hidden tab, so a page opened into the background falls back to a timeout\n  // rather than sitting blank until it is looked at.\n  var renderQueued = false;\n  function requestRender(){\n    if (renderQueued) return;\n    renderQueued = true;\n    var run = function(){ renderQueued = false; render(); };\n    if (document.hidden) setTimeout(run, 0); else requestAnimationFrame(run);\n  }\n  var saveTimer = null;\n  function requestSave(){\n    clearTimeout(saveTimer);\n    saveTimer = setTimeout(function(){\n      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collectRawValues())); } catch(e){}\n    }, 800);\n  }\n\n  function render(){\n    var p = readInputs();\n    syncPetInputsEnabled();\n    buildLedger(p);\n    buildBreakpoint(p);\n\n    var c = buildTableRows(p, function(L){ return goldPerAction(p, L, p.utility); }, p.combat, combatMaxLevel);\n    var u = buildTableRows(p, function(L){ return goldPerAction(p, p.combat, L); }, p.utility, utilityMaxLevel);\n    document.getElementById('combatTbody').innerHTML = c.html;\n    document.getElementById('utilityTbody').innerHTML = u.html;\n    document.getElementById('combatRowCount').textContent = 'levels 0–' + c.top;\n    document.getElementById('utilityRowCount').textContent = 'levels 0–' + u.top;\n    document.getElementById('combatMoreBtn').disabled = combatMaxLevel >= MAX_LEVEL_CAP;\n    document.getElementById('utilityMoreBtn').disabled = utilityMaxLevel >= MAX_LEVEL_CAP;\n\n    // Only on load and on apply - re-scrolling on every keystroke would fight\n    // the user while they read.\n    if (pendingScroll){ pendingScroll = false; scrollToCurrent('combatWrap'); scrollToCurrent('utilityWrap'); }\n    requestSave();\n  }\n\n  // ---- persistence ----\n  function collectRawValues(){\n    var out = {}, key;\n    for (key in FIELD_IDS) out[key] = document.getElementById(FIELD_IDS[key]).value;\n    for (key in CHECK_IDS) out['chk_' + key] = document.getElementById(CHECK_IDS[key]).checked;\n    return out;\n  }\n  function applyRawValues(vals){\n    var key;\n    for (key in FIELD_IDS) if (vals[key] !== undefined) document.getElementById(FIELD_IDS[key]).value = vals[key];\n    for (key in CHECK_IDS){\n      if (vals['chk_' + key] !== undefined) document.getElementById(CHECK_IDS[key]).checked = !!vals['chk_' + key];\n      else if (key === 'vip' && vals.vipChecked !== undefined) document.getElementById(CHECK_IDS[key]).checked = !!vals.vipChecked;\n    }\n  }\n  function applyDefaults(){\n    var key;\n    for (key in FIELD_IDS) document.getElementById(FIELD_IDS[key]).value = DEFAULTS[key];\n    for (key in CHECK_IDS) document.getElementById(CHECK_IDS[key]).checked = CHECK_DEFAULTS[key];\n    combatMaxLevel = 120; utilityMaxLevel = 120; pendingScroll = true;\n  }\n  function readStored(keys){\n    for (var i = 0; i < keys.length; i++){\n      try { var raw = localStorage.getItem(keys[i]); if (raw) return JSON.parse(raw); } catch(e){}\n    }\n    return null;\n  }\n  function saveAsDefault(){\n    var raw = collectRawValues();\n    for (var key in FIELD_IDS) DEFAULTS[key] = num(raw[key], DEFAULTS[key]);\n    try { localStorage.setItem(DEFAULTS_KEY, JSON.stringify(DEFAULTS)); } catch(e){}\n    flash(document.getElementById('saveDefaultBtn'), 'Saved ✓');\n  }\n  function flash(btn, text){\n    var original = btn.textContent;\n    btn.textContent = text;\n    setTimeout(function(){ btn.textContent = original; }, 1400);\n  }\n\n  // ---- live import ----\n  // Every entry is optional and carries its own source string; a field that\n  // could not be read is ABSENT rather than defaulted. Nothing is guessed - a\n  // plausible wrong input changes the recommendation without looking like it.\n  var LIVE_MAP = {\n    combat:          { label: 'Combat slot',       field: 'combat' },\n    utility:         { label: 'Utility slot',      field: 'utility' },\n    characterLevel:  { label: 'Character level',   field: 'characterLevel' },\n    monsterLevel:    { label: 'Monster level',     field: 'monsterLevel' },\n    partyMembers:    { label: 'Party members',     field: 'partyMembers' },\n    othersGoldBoost: { label: 'Others’ boost', field: 'othersGoldBoost', suffix: '%' },\n    goldBoost:       { label: 'Your gold boost',   field: 'enchants', suffix: '%' },\n    actionsPerWeek:  { label: 'Actions / week',    field: 'actionsPerWeek' },\n    tax:             { label: 'Village tax',       field: 'tax', suffix: '%' },\n    observedGold:    { label: 'Observed gold/act', field: 'observedGold', scale: 1e-9, suffix: 'B' }\n  };\n  var liveData = null;\n  var livePetModifiers = null;\n\n  function initLive(){\n    var card = document.getElementById('liveCard');\n    var src = (typeof window !== 'undefined' && window.APOZ_LIVE) || null;\n    if (!src || !src.fields) return;\n\n    if (src.pet && typeof src.pet.flat === 'number' && typeof src.pet.pct === 'number') {\n      livePetModifiers = { flat: src.pet.flat, pct: src.pet.pct, potion: src.pet.potion || 0 };\n    }\n    var keys = Object.keys(src.fields).filter(function(k){\n      return LIVE_MAP[k] && src.fields[k] && typeof src.fields[k].value === 'number' && isFinite(src.fields[k].value);\n    });\n    if (!keys.length && !livePetModifiers) return;\n\n    liveData = src;\n    card.classList.add('on');\n    var ageMin = src.ts ? Math.round((Date.now() - src.ts)/60000) : null;\n    document.getElementById('liveWhen').textContent = ageMin === null ? '' : (ageMin < 1 ? 'just now' : ageMin + 'm ago');\n    document.getElementById('liveEmpty').hidden = true;\n    document.getElementById('liveActions').hidden = false;\n\n    var html = keys.map(function(k){\n      var m = LIVE_MAP[k], f = src.fields[k], v = f.value * (m.scale || 1);\n      return '<span class=\"k\" data-tip=\"' + tipAttr(f.from || '') + '\">' + m.label + '</span>' +\n        '<span class=\"v\">' + (Math.abs(v) >= 1000 ? fmtInt(v) : (Math.round(v*100)/100)) + (m.suffix || '') + '</span>';\n    }).join('');\n    if (livePetModifiers) html += '<span class=\"k\">Pet modifiers</span><span class=\"v\">imported</span>';\n    document.getElementById('liveList').innerHTML = html;\n\n    document.getElementById('liveApplyBtn').addEventListener('click', function(){\n      applyLive();\n      flash(document.getElementById('liveApplyBtn'), 'Applied ✓');\n    });\n  }\n\n  function applyLive(){\n    if (!liveData) return;\n    for (var k in liveData.fields){\n      var m = LIVE_MAP[k];\n      if (!m) continue;\n      var f = liveData.fields[k];\n      if (!f || typeof f.value !== 'number' || !isFinite(f.value)) continue;\n      var el = document.getElementById(FIELD_IDS[m.field]);\n      if (el) el.value = String(Math.round(f.value * (m.scale || 1) * 1000) / 1000);\n    }\n    if (liveData.fields.othersGoldBoost) document.getElementById(CHECK_IDS.othersSame).checked = false;\n    if (livePetModifiers) document.getElementById(CHECK_IDS.useLivePet).checked = true;\n    pendingScroll = true;\n    requestRender();\n  }\n\n  // Greying out is the honest signal: when real pet data is in use, the\n  // normalisation inputs are not contributing and should not look as if they are.\n  function syncPetInputsEnabled(){\n    var live = document.getElementById(CHECK_IDS.useLivePet);\n    live.disabled = !livePetModifiers;\n    var on = live.checked && !!livePetModifiers;\n    ['petILevel','petTier','petRollPercentile'].forEach(function(k){\n      document.getElementById(FIELD_IDS[k]).disabled = on;\n    });\n  }\n\n  function initProvenance(){\n    var ul = document.getElementById('provenanceList');\n    var names = (window.APOZ_FACTS && Object.keys(window.APOZ_FACTS)) || [];\n    ul.innerHTML = names.length\n      ? names.map(function(n){ return '<li><code>' + n + '</code></li>'; }).join('') +\n        '<li>Emitted into this page by <code>userscripts/build.mjs</code> from <code>data/</code>. Correct the fact in the core and rebuild — nothing here is retyped.</li>'\n      : '<li>This copy was opened without the generated facts block.</li>';\n  }\n\n  function initTheme(){\n    var btn = document.getElementById('theme');\n    var stored = null;\n    try { stored = localStorage.getItem(THEME_KEY); } catch(e){}\n    if (stored) document.documentElement.setAttribute('data-theme', stored);\n    function label(){\n      var t = document.documentElement.getAttribute('data-theme');\n      var dark = t === 'dark' || (!t && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);\n      btn.textContent = dark ? '☼' : '☽';\n      btn.title = dark ? 'Switch to light' : 'Switch to dark';\n    }\n    btn.addEventListener('click', function(){\n      var cur = document.documentElement.getAttribute('data-theme');\n      // No stamp yet means we are following the OS; the first click flips away\n      // from whatever the OS is currently giving us.\n      if (!cur) cur = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';\n      var next = cur === 'dark' ? 'light' : 'dark';\n      document.documentElement.setAttribute('data-theme', next);\n      try { localStorage.setItem(THEME_KEY, next); } catch(e){}\n      label();\n    });\n    label();\n  }\n\n  function extend(which, by, to){\n    if (which === 'combat') combatMaxLevel = Math.min(MAX_LEVEL_CAP, to !== undefined ? to : combatMaxLevel + by);\n    else utilityMaxLevel = Math.min(MAX_LEVEL_CAP, to !== undefined ? to : utilityMaxLevel + by);\n    requestRender();\n  }\n\n  function init(){\n    var savedDefaults = readStored([DEFAULTS_KEY].concat(LEGACY_DEFAULTS));\n    if (savedDefaults) for (var dk in DEFAULTS) if (savedDefaults[dk] !== undefined) DEFAULTS[dk] = savedDefaults[dk];\n\n    applyDefaults();\n    var saved = readStored([STORAGE_KEY].concat(LEGACY_STORAGE));\n    if (saved) applyRawValues(saved);\n\n    for (var key in FIELD_IDS) document.getElementById(FIELD_IDS[key]).addEventListener('input', requestRender);\n    for (var ckey in CHECK_IDS) document.getElementById(CHECK_IDS[ckey]).addEventListener('change', requestRender);\n\n    document.getElementById('resetBtn').addEventListener('click', function(){ applyDefaults(); requestRender(); });\n    document.getElementById('saveDefaultBtn').addEventListener('click', saveAsDefault);\n\n    [['combat','combatWrap'],['utility','utilityWrap']].forEach(function(pair){\n      var which = pair[0], wrapId = pair[1];\n      document.getElementById(which + 'MoreBtn').addEventListener('click', function(){ extend(which, 30); });\n      document.getElementById(which + 'JumpBtn').addEventListener('click', function(){\n        var v = clampLevel(document.getElementById(which + 'JumpInput').value);\n        if (v > 0) extend(which, 0, v);\n      });\n      document.getElementById(which + 'JumpInput').addEventListener('keydown', function(e){\n        if (e.key === 'Enter') document.getElementById(which + 'JumpBtn').click();\n      });\n      // One-time expansion to fit the viewport, leaving room for the header and\n      // the controls. Not a drag handle, not incremental steps.\n      var btn = document.getElementById(which + 'ExpandBtn');\n      btn.addEventListener('click', function(){\n        var wrap = document.getElementById(wrapId);\n        var tall = wrap.classList.toggle('tall');\n        btn.textContent = tall ? 'Shrink' : 'Expand';\n        scrollToCurrent(wrapId);\n      });\n    });\n\n    initTips();\n    initLive();\n    initProvenance();\n    initTheme();\n    render();\n  }\n\n  // Named so it is obvious at any call site that this is a test seam, not an\n  // API - same reasoning as Core's __modulesForTest.\n  window.__PARTY_GOLD_ROI_FOR_TEST = {\n    buildProfile: buildProfile, goldPerAction: goldPerAction, keptPerAction: keptPerAction,\n    marginal: marginal, crossoverUtility: crossoverUtility, greedyPlan: greedyPlan,\n    slotBoostPct: slotBoostPct, stepCost: stepCost,\n    personalGoldTotal: personalGoldTotal, pooledBase: pooledBase\n  };\n\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);\n  else init();\n})();\n</script>\n";

  // ---- Core intake shim (generated) ----
  // Requires the "Apoz Core" userscript. Without it this module does nothing.
  (function (id, factory) {
    var v = (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version) || null;
    var q = (window.__apozModules = window.__apozModules || []);
    q.push({ id: id, version: v, factory: factory, claimed: false, descriptor: null });
    if (window.__ApozCore && window.__ApozCore.claim) { window.__ApozCore.claim(); return; }
    setTimeout(function () {
      if (!window.__ApozCore) console.warn('[Apoz] "' + id + '" is installed but the Apoz Core script is not. Install Apoz Core and reload.');
    }, 8000);
  })("eta-tracker", function (Core) {


  const ACTION_MS = 10_000;
  const AMBIENT_POLL_MS = 8_000;
  const SLOT_LABEL = 'combat';
  const MODULE_ID = 'eta-tracker';
  const STORAGE_KEY = `apoz:${MODULE_ID}:v3`;
  const LEGACY_STORAGE_KEY = 'qett-progress-v3'; // pre-namespace, migrated on load

  // ---- alarm cadence ----
  //
  // A REPORTED BUG SHAPED THIS. A user hit "ready", bought the upgrade, and
  // navigated away in the same second; the tracker never got to re-read the
  // slot card, so it kept believing the OLD level was still unaffordable-then-
  // affordable, and chimed every 30s. Disabling the module did not stop it
  // (D1 below), and disabling the SCRIPT does not unload already-running code
  // from an open page, so the only thing that worked was killing the browser.
  //
  // The cadence is now: quick at first, decelerating, and it GIVES UP. An
  // alarm that cannot stop on its own is not a safety feature, it is a
  // hostage situation.
  const ALARM_DEFAULTS = {
    firstMs: 10_000,     // gap before the second chime
    maxMs: 120_000,      // never slower than this
    growth: 1.35,        // each gap this much longer than the last
    maxRepeats: 25,      // then auto-silence, with a way back
    volume: 0.32,
  };
  let alarmCfg = Object.assign({}, ALARM_DEFAULTS);
  let alarmRepeats = 0;
  // ---- number parsing/formatting: delegated to Core ----
  // A module must NEVER carry its own separator logic. The user's decimal /
  // thousands convention is a per-character game setting (see Core), so a
  // local guess is wrong for half the player base - "1.234" is 1234 under one
  // convention and 1.234 under the other.

  function parseGoldString(str) {
    if (!str) return null;
    return Core.parseNumber(String(str).replace(/gold/gi, ''));
  }

  function formatGold(value) {
    return Core.formatNumber(value);
  }

  function formatMsRemaining(ms) {
    if (ms === null) return { actionsStr: '∞', timeStr: 'unlimited' };
    const clamped = Math.max(0, ms);
    const totalSeconds = Math.ceil(clamped / 1000);
    const actionsLeft = Math.max(0, Math.ceil(clamped / ACTION_MS));
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    return { actionsStr: `${actionsLeft}`, timeStr: `${hh}:${String(mm).padStart(2, '0')}` };
  }

  function formatAgo(atMs) {
    if (atMs === null) return 'never';
    const s = Math.max(0, Math.floor((Date.now() - atMs) / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  }

  // ---- pet slot upgrade cost ----
  // The formula itself is GENERATED into this file from
  // data/formulas/pets.json by userscripts/build.mjs — see the generated
  // block at the top. That is INSTRUMENTATION.md §6's option 1: the fact is
  // not copied here, it is emitted, so a correction in data/ arrives on the
  // next build rather than needing someone to notice. This wrapper is the
  // only local part: the generated function returns a cumulative cost across
  // a level RANGE, and what this module wants is the next single step.
  function nextUpgradeCost(currentLevel) {
    return petSlotUpgradeCost(currentLevel, currentLevel + 1).value;
  }

  // ---- Pets page: slot card read ----

  // REPORTED 2026-09-06: the live import picked up somebody else's slot levels.
  //
  // The card selectors are generic, so they match just as happily on another
  // player's profile as on your own pets page — and a wrong slot level silently
  // changes both the alarm's cost target and the ROI tool's recommendation.
  //
  // The gate is a pathname allowlist rather than anything cleverer, because the
  // failure has to be conservative: on any page we are not sure about, we read
  // NOTHING and keep the value we already had. A missing reading is visible in
  // the panel ("not read yet"); a wrong one is not.
  //
  // NEEDS ONE LIVE CONFIRMATION: that your own pets live at /game/pets and every
  // other-player view is on a different path. If some profile view also renders
  // under /game/pets, tighten this — do not widen it.
  function isOwnPetsPage() {
    const path = location.pathname;
    if (!/^\/game\/pets(\/|$)/.test(path)) return false;
    // Anything that looks like it is scoped to a named someone-else is out.
    return !/\/(profile|player|character|user|view)\//i.test(path);
  }

  function findSlotCard(label) {
    if (!isOwnPetsPage()) return null;
    const want = (label || SLOT_LABEL).toLowerCase();
    const titles = document.querySelectorAll('[data-slot="card-title"]');
    for (const title of titles) {
      if (title.textContent.trim().toLowerCase() === want) {
        return title.closest('[data-slot="card"]');
      }
    }
    return null;
  }

  function findUpgradeButton(card) {
    for (const btn of card.querySelectorAll('button')) {
      if (btn.textContent.trim().toLowerCase() === 'upgrade slot') return btn;
    }
    return null;
  }

  function readSlotLevel(card) {
    for (const el of card.querySelectorAll('.text-muted-foreground')) {
      const m = el.textContent.match(/slot level:\s*(\d+)/i);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  }

  function readCurrentGold(card) {
    const el = card.querySelector('.text-red-500, .text-green-500');
    return el ? parseGoldString(el.textContent) : null;
  }

  const boundUpgradeButtons = new WeakSet();
  function bindUpgradeButtonListener(btn) {
    if (!btn || boundUpgradeButtons.has(btn)) return;
    boundUpgradeButtons.add(btn);
    btn.addEventListener('click', () => {
      // D3 — the level we hold is now WRONG, and the cost of a wrong level is
      // a permanently-satisfied "ready" test. Treat it as unknown rather than
      // stale: recomputeEta() refuses without a level, so no alarm can fire on
      // a belief we know is out of date. If the re-read below never lands
      // (the user navigated away in the same second, which is exactly what
      // happened), it stays unknown and stays quiet until the Pets page is
      // seen again.
      lastSync = { atMs: Date.now(), level: null, current: null };
      trackerEtaMs = null;
      trackerAlarmFired = false;
      trackerAcknowledged = false;
      nextAlarmAtMs = null;
      alarmRepeats = 0;
      render();
      // the page may take a moment to reflect the purchase; check twice
      setTimeout(refreshFromLiveData, 400);
      setTimeout(refreshFromLiveData, 1200);
    });
  }

  // ---- Party Battle page: automatic one-shot gold/action grab ----
  // Purely reads what the page already rendered from its own battle-result
  // card - no extra requests beyond normal play, and only tried once per
  // visit to that page (not a continuous poll).

  function isPartyBattlePage() {
    return location.pathname.startsWith('/game/party/battle');
  }

  let lastPathname = location.pathname;
  let partyRateGrabbedThisVisit = false;
  function checkRouteChange() {
    const path = location.pathname;
    if (path !== lastPathname) {
      lastPathname = path;
      if (isPartyBattlePage()) partyRateGrabbedThisVisit = false;
    }
  }

  function scanPartyGoldPerAction() {
    const root = document.querySelector('main') || document.body;
    for (const span of root.querySelectorAll('.font-semibold')) {
      if (!/gold$/i.test(span.textContent.trim())) continue;
      const muted = span.parentElement && span.parentElement.querySelector('.text-muted-foreground');
      if (!muted) continue;
      const lines = muted.querySelectorAll('div');
      if (!lines.length) continue;
      const last = lines[lines.length - 1].textContent.trim();
      // suffix set matches the game's own ladder (k..ud), not just k/m/b/t
      const m = last.match(/^([\d.,]+\s*(?:[a-z]{1,2})?)\s*kept/i);
      if (m) {
        const val = parseGoldString(m[1]);
        if (val !== null) return val;
      }
    }
    return null;
  }

  // ---- Ambient sidebar stat (party actions remaining) ----
  // Polled slowly and scoped to the sidebar - this is "nice to have" context,
  // not latency-sensitive, so it stays off the fast debounced refresh path.

  // The persistent gold counter, wherever the shell renders it.
  //
  // THIS IS WHAT LETS THE ALARM WORK WITHOUT THE PETS PAGE. The upgrade cost is
  // a formula we already carry (generated from data/formulas/pets.json), and the
  // slot level changes only when you buy one - so the single value that has to
  // stay fresh is your gold, and the game shows that on every screen. Requiring
  // a visit to Pets > Combat just to learn "can I afford it yet" was the tracker
  // asking the page a question it could answer itself.
  //
  // Two passes, strict first. Nothing is inferred: if neither pass finds a
  // labelled gold figure, the answer is null and the panel says so.
  function readGlobalGold(root) {
    for (const el of root.querySelectorAll('div, span, p')) {
      if (el.children.length > 0) continue;
      const m = el.textContent.trim().match(/^([\d.,]+\s*[a-z]{0,2})\s*gold$/i);
      if (m) {
        const val = parseGoldString(m[1]);
        if (val !== null) return val;
      }
    }
    // Split markup: the number and the word "gold" in sibling nodes. Only
    // accepted when the PARENT's own text is nothing but that pair, which is
    // what keeps a random number next to the word "gold" in a sentence out.
    for (const el of root.querySelectorAll('div, span, p')) {
      if (el.children.length > 0) continue;
      const raw = el.textContent.trim();
      if (!/^[\d.,]+\s*[a-z]{0,2}$/i.test(raw)) continue;
      const parent = el.parentElement;
      if (!parent) continue;
      if (!/^[\d.,]+\s*[a-z]{0,2}\s*gold$/i.test(parent.textContent.trim())) continue;
      const val = parseGoldString(raw);
      if (val !== null) return val;
    }
    return null;
  }

  function readPartyActionsRemaining(root) {
    for (const el of root.querySelectorAll('div, span')) {
      if (el.children.length > 0) continue;
      const m = el.textContent.trim().match(/^([\d.,]+)\s*party$/i);
      if (m) {
        const val = parseGoldString(m[1]);
        if (val !== null) return Math.round(val);
      }
    }
    return null;
  }

  let partyActionsRemaining = null;
  let partyActionsAtMs = null;
  let goldNow = null;      // gold read off the persistent counter
  let goldAtMs = null;
  let goldFrom = null;     // 'sidebar' | 'pets card' - shown, never guessed

  function pollAmbientStats() {
    const root = document.getElementById('sidebar-left') || document.body;
    const remaining = readPartyActionsRemaining(root);
    if (remaining !== null) { partyActionsRemaining = remaining; partyActionsAtMs = Date.now(); }

    const gold = readGlobalGold(root);
    if (gold !== null) { goldNow = gold; goldAtMs = Date.now(); goldFrom = 'sidebar'; recomputeEta(); }

    // The ambient poll is now on the alarm's critical path: on most pages it is
    // the ONLY thing that learns your gold changed, so it has to be allowed to
    // ring. checkTrackerReady() is idempotent and cheap.
    if (runState === 'running') checkTrackerReady();
    render();
  }

  // ---- session (Start/Stop/Reset - controls whether the alarm is armed) ----

  let runState = 'idle'; // idle | running
  let runEndsAtMs = null; // absolute Date.now() deadline; null = unlimited
  let configuredRunActions = null; // null = unlimited

  // WALL CLOCK, NOT TICK COUNTING. The old code did `runRemainingMs -= 1000`
  // once per timer callback, which silently assumed the callback fires once a
  // second. It does not: a backgrounded tab clamps timers to roughly once a
  // MINUTE, so a session left running in the background counted down ~60x too
  // slowly and the "actions remaining" number was simply wrong on return.
  // Deriving remaining time from a stored deadline makes the display correct
  // no matter how often - or how rarely - anything actually runs.
  function runRemaining() {
    return runEndsAtMs === null ? null : runEndsAtMs - Date.now();
  }

  function startTracking() {
    if (runState === 'running') return;
    runEndsAtMs = configuredRunActions !== null ? Date.now() + configuredRunActions * ACTION_MS : null;
    trackerAlarmFired = false;
    trackerAcknowledged = false;
    nextAlarmAtMs = null;
    runState = 'running';
    const ctx = ensureAudioCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    applyKeepAwake();
    refreshFromLiveData();
  }

  function stopTracking() {
    runState = 'idle';
    runEndsAtMs = null;
    applyKeepAwake();
    render();
  }

  function resetSession() {
    runEndsAtMs = configuredRunActions !== null ? Date.now() + configuredRunActions * ACTION_MS : null;
    trackerAlarmFired = false;
    trackerAcknowledged = false;
    nextAlarmAtMs = null;
    refreshFromLiveData();
  }

  function commitDuration() {
    const raw = ui.durationInput.value.trim();
    if (raw === '') {
      configuredRunActions = null;
    } else {
      const n = parseInt(raw, 10);
      configuredRunActions = (Number.isFinite(n) && n > 0) ? n : null;
    }
    ui.durationInput.value = configuredRunActions !== null ? String(configuredRunActions) : '';
    if (runState === 'running') {
      runEndsAtMs = configuredRunActions !== null ? Date.now() + configuredRunActions * ACTION_MS : null;
    }
    render();
  }

  // ---- ETA computation ----

  let trackerEtaMs = null; // absolute Date.now()-based timestamp, or null = unknown
  let trackerAlarmFired = false;
  let trackerAcknowledged = false;
  let nextAlarmAtMs = null;
  let lastSync = { atMs: null, level: null, current: null };
  // Both pet slot levels, remembered across pages. The tracker itself only
  // needs `combat`; `utility` exists so the ROI tool can be handed a real
  // starting position instead of a placeholder.
  let slotLevels = { combat: null, utility: null };
  let autoRateRaw = null; // gold/action grabbed from the Party Battle page
  let autoRateAtMs = null;
  let customRateRaw = null; // manual override for the ETA test, null = use auto

  function effectiveRate() {
    return customRateRaw !== null ? customRateRaw : autoRateRaw;
  }

  // Freshest gold reading available, whatever produced it. The Pets card is
  // exact but only exists on that page; the sidebar counter is everywhere.
  function goldSnapshot() {
    const fromCard = (lastSync.current !== null && lastSync.atMs !== null)
      ? { value: lastSync.current, atMs: lastSync.atMs, from: 'pets card' } : null;
    const fromBar = (goldNow !== null && goldAtMs !== null)
      ? { value: goldNow, atMs: goldAtMs, from: goldFrom || 'sidebar' } : null;
    if (!fromCard) return fromBar;
    if (!fromBar) return fromCard;
    return fromBar.atMs >= fromCard.atMs ? fromBar : fromCard;
  }

  // What your gold is BY NOW, not when the page last rendered it.
  //
  // A backgrounded tab stops re-rendering, so the DOM figure goes stale exactly
  // when you most want it. The ETA was already estimate-based, so the alarm was
  // always right; it was the DISPLAY that lied. Projecting forward at the known
  // rate makes the panel agree with the alarm.
  //
  // Capped at the point it would cover the upgrade: past that, the projection
  // is unfalsifiable and there is nothing useful to claim.
  function projectedGold() {
    const gold = goldSnapshot();
    if (!gold) return null;
    const rate = effectiveRate();
    if (!rate) return { value: gold.value, from: gold.from, projected: false, atMs: gold.atMs };
    const actions = Math.floor((Date.now() - gold.atMs) / ACTION_MS);
    if (actions <= 0) return { value: gold.value, from: gold.from, projected: false, atMs: gold.atMs };
    const need = lastSync.level !== null ? nextUpgradeCost(lastSync.level) : Infinity;
    const projected = Math.min(gold.value + actions * rate, Math.max(gold.value, need));
    return { value: projected, from: gold.from, projected: true, atMs: gold.atMs };
  }

  function recomputeEta() {
    const gold = goldSnapshot();
    if (lastSync.level === null || !gold) { trackerEtaMs = null; return; }
    const deficit = nextUpgradeCost(lastSync.level) - gold.value;
    // Affordable as of that reading - the formula said so, no page visit needed.
    if (deficit <= 0) { trackerEtaMs = gold.atMs; return; }
    const rate = effectiveRate();
    if (!rate) { trackerEtaMs = null; return; }
    trackerEtaMs = gold.atMs + Math.ceil(deficit / rate) * ACTION_MS;
  }

  function commitCustomRate() {
    const raw = ui.goldRateInput.value.trim();
    if (raw === '') {
      customRateRaw = null;
    } else {
      const billions = parseFloat(raw.replace(',', '.'));
      customRateRaw = (Number.isFinite(billions) && billions > 0) ? billions * 1e9 : null;
    }
    recomputeEta();
    render();
  }

  function refreshFromLiveData() {
    checkRouteChange();

    if (isPartyBattlePage() && !partyRateGrabbedThisVisit) {
      const raw = scanPartyGoldPerAction();
      if (raw !== null) {
        autoRateRaw = raw;
        autoRateAtMs = Date.now();
        partyRateGrabbedThisVisit = true;
      }
    }

    for (const label of ['combat', 'utility']) {
      const c = findSlotCard(label);
      if (!c) continue;
      const lv = readSlotLevel(c);
      if (lv !== null) slotLevels[label] = lv;
    }

    const card = findSlotCard();
    if (card) {
      const level = readSlotLevel(card);
      const current = readCurrentGold(card);
      const btn = findUpgradeButton(card);
      bindUpgradeButtonListener(btn);
      lastSync = { atMs: Date.now(), level, current };
      if (btn && !btn.disabled) {
        trackerEtaMs = Date.now();
      } else {
        recomputeEta();
      }
    } else if (autoRateRaw !== null || customRateRaw !== null) {
      recomputeEta();
    }

    render();
  }

  function nextAlarmGap() {
    const gap = alarmCfg.firstMs * Math.pow(alarmCfg.growth, Math.max(0, alarmRepeats - 1));
    return Math.min(alarmCfg.maxMs, Math.round(gap));
  }

  function checkTrackerReady() {
    if (trackerEtaMs === null) return;
    const remaining = trackerEtaMs - Date.now();
    if (remaining > 0) {
      trackerAlarmFired = false;
      trackerAcknowledged = false;
      nextAlarmAtMs = null;
      alarmRepeats = 0;
      return;
    }
    if (trackerAcknowledged) return;
    const now = Date.now();
    if (!trackerAlarmFired || now >= nextAlarmAtMs) {
      const first = !trackerAlarmFired;
      trackerAlarmFired = true;
      alarmRepeats++;
      playGentleAlarm();
      if (first) notifyReady();

      // D2 — THE CAP. Without it the only way out of a wrongly-latched ready
      // state is closing the browser, which is what actually happened to
      // someone. Silencing is not "giving up on telling you": the panel, the
      // badge and the title marker all stay lit.
      if (alarmRepeats >= alarmCfg.maxRepeats) {
        trackerAcknowledged = true;
        Core.toast(`Alarm silenced after ${alarmRepeats} chimes — still ready.`, {
          type: 'warn', duration: 12000,
          action: 'Ring again', onAction: () => { trackerAcknowledged = false; alarmRepeats = 0; render(); },
        });
      }
      nextAlarmAtMs = now + nextAlarmGap();
    }
  }

  function snoozeAlarm() {
    trackerAcknowledged = true;
    render();
  }

  // Everything that can make noise, stopped, from one call. Used by the
  // module's own disable path and safe to call at any time.
  function silenceAlarm() {
    trackerAcknowledged = true;
    trackerAlarmFired = false;
    nextAlarmAtMs = null;
    alarmRepeats = 0;
    if (keepAwakeNodes) { keepAwake = false; applyKeepAwake(); }
    saveProgress();
  }

  // ---- alarm (Web Audio, self-contained) ----

  let audioCtx = null;
  function ensureAudioCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
    }
    return audioCtx;
  }

  function playGentleAlarm() {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = now + i * 0.16;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(alarmCfg.volume, start + 0.04);
      gain.gain.linearRampToValueAtTime(0, start + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  // ---- the snapshot handed to the Party Gold ROI tool ----
  //
  // Everything here is read from what the page already rendered (or from the
  // React tree the page already built). Each field carries WHERE it came from,
  // and a field that could not be read is ABSENT rather than defaulted - the
  // tool then leaves that input alone. A plausible wrong slot level in a
  // "which should I buy" tool is worse than an empty one, because it changes
  // the answer without looking like it did.
  function partyMemberCountFromFiber() {
    if (!Core.walkFiber) return null;
    let out = null;
    Core.walkFiber((cand) => {
      const m = cand.members;
      if (!Array.isArray(m) || m.length < 1 || m.length > 5) return false;
      if (!m.every((x) => x && typeof x === 'object' && typeof x.name === 'string')) return false;
      out = m.length;
      return true;
    });
    return out;
  }

  function collectLiveSnapshot() {
    const fields = {};
    const add = (key, value, from) => {
      if (typeof value === 'number' && isFinite(value) && value >= 0) fields[key] = { value, from };
    };

    add('combat', slotLevels.combat, 'Pets page');
    add('utility', slotLevels.utility, 'Pets page');

    const ch = Core.probeCharacter ? Core.probeCharacter() : null;
    if (ch) add('characterLevel', ch.level, 'character data');

    add('partyMembers', partyMemberCountFromFiber(), 'party data');

    const rate = effectiveRate();
    add('observedGold', rate, customRateRaw !== null ? 'your custom rate' : 'party battle reward');

    return {
      ts: Date.now(),
      source: 'Apoz Core · Combat Slot ETA Tracker',
      numberProvenance: Core.numberProvenance ? Core.numberProvenance() : null,
      fields,
    };
  }

  // ---- running in the background ----
  //
  // THE PROBLEM. A hidden tab is not a slow tab, it is a stopped one: Chrome
  // clamps a background page's timers to roughly once a minute, and stops
  // requestAnimationFrame entirely. For an idle game that is the normal case,
  // not the edge case - the tab you are waiting on is the tab you are not
  // looking at.
  //
  // THREE LAYERS, in order of how much they are relied on:
  //
  //   1. CORRECTNESS, unconditional: every value here is derived from
  //      Date.now(), never accumulated per tick (see runRemaining()). However
  //      rarely anything runs, what it computes when it does run is right.
  //      This layer is the one that matters and it needs no permission,
  //      no toggle and no browser cooperation.
  //   2. PROMPTNESS, best effort: the 1s heartbeat moves into a dedicated
  //      Worker, whose timers a hidden page throttles on a different and less
  //      aggressive schedule than its own. Plus an immediate re-check the
  //      moment the tab is looked at again. If the Worker fails to start, the
  //      setInterval fallback is used and nothing else changes.
  //   3. ESCALATION, opt-in: a desktop notification (survives a hidden tab by
  //      design) and a near-silent audio keepalive (a tab that is playing
  //      audio is exempted from the harshest throttling tier). Both default
  //      OFF - one needs a permission prompt, the other burns a little CPU,
  //      and neither should be spent without being asked for.
  let keepAwake = false;    // near-silent tone while armed
  let notifyOnReady = false; // desktop notification when the alarm first fires
  let keepAwakeNodes = null;
  let tickWorker = null;
  let tickFallback = null;

  function applyKeepAwake() {
    const want = keepAwake && runState === 'running';
    if (want === !!keepAwakeNodes) return;
    if (!want) {
      try { keepAwakeNodes.osc.stop(); } catch (e) { /* already stopped */ }
      try { keepAwakeNodes.gain.disconnect(); } catch (e) { /* ignore */ }
      keepAwakeNodes = null;
      return;
    }
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 40;         // below where a laptop speaker reproduces anything
      gain.gain.value = 0.0008;         // non-zero so the tab counts as playing audio
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      keepAwakeNodes = { osc, gain };
    } catch (e) { keepAwakeNodes = null; }
  }

  function notifyReady() {
    if (!notifyOnReady) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible') return; // you are already looking at it
    try {
      const n = new Notification('Queslar — combat slot upgrade ready', {
        body: lastSync.level !== null
          ? `Slot ${lastSync.level} → ${lastSync.level + 1} is affordable.`
          : 'The next combat pet slot level is affordable.',
        tag: 'apoz-eta-tracker', // replaces its own previous one instead of stacking
      });
      n.onclick = () => { try { window.focus(); n.close(); } catch (e) { /* ignore */ } };
    } catch (e) { /* notifications unavailable - the sound already played */ }
  }

  function requestNotifyPermission() {
    if (typeof Notification === 'undefined') return Promise.resolve('denied');
    if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
    try { return Promise.resolve(Notification.requestPermission()); }
    catch (e) { return Promise.resolve('denied'); }
  }

  function startHeartbeat() {
    // Worker timers are on a different throttling schedule to the page's own.
    // Best effort only - correctness never depends on the cadence.
    let url = null;
    try {
      const src = 'let id=null;onmessage=function(e){if(e.data==="start"){if(id)return;'
        + 'id=setInterval(function(){postMessage(0);},1000);}else{clearInterval(id);id=null;}};';
      url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      tickWorker = new Worker(url);
      tickWorker.onmessage = () => { try { masterTick(); } catch (e) { /* never kill the worker */ } };
      tickWorker.onerror = () => { tickWorker = null; if (!tickFallback) tickFallback = setInterval(masterTick, 1000); };
      tickWorker.postMessage('start');
    } catch (e) {
      tickWorker = null;
    } finally {
      // Revoked whether or not the Worker constructed. On the failure path the
      // URL would otherwise be held for the life of the page for nothing - the
      // browsers most likely to reject a blob Worker are exactly the ones where
      // that leak goes unnoticed.
      if (url) { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } }
    }
    if (!tickWorker) tickFallback = setInterval(masterTick, 1000);
  }

  // ---- persistence ----
  //
  // localStorage.setItem is SYNCHRONOUS and touches disk. render() runs every
  // second, so writing from there was ~86k blocking writes/day for a value that
  // meaningfully changes about once a minute. Instead: mark dirty, flush on a
  // slow timer, and always flush before the page goes away so nothing is lost.

  let storeDirty = false;
  function saveProgress() { storeDirty = true; }

  function flushProgress() {
    if (!storeDirty) return;
    storeDirty = false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        runState, runEndsAtMs, configuredRunActions,
        keepAwake, notifyOnReady, alarmCfg,
        customRateValue: ui.goldRateInput.value, customRateRaw,
        autoRateRaw, autoRateAtMs,
        lastSync, slotLevels, trackerEtaMs, trackerAlarmFired, trackerAcknowledged, nextAlarmAtMs,
        partyActionsRemaining, partyActionsAtMs,
        panelOpen, windowGeometry,
        savedAt: Date.now(),
      }));
    } catch (e) { /* storage unavailable, ignore */ }
  }

  function loadProgress() {
    let saved = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
      // one-time migration off the pre-namespace key
      if (saved && !localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, raw);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch (e) { saved = null; }
    if (!saved) return;

    configuredRunActions = typeof saved.configuredRunActions === 'number' ? saved.configuredRunActions : null;
    ui.durationInput.value = configuredRunActions !== null ? String(configuredRunActions) : '';

    if (typeof saved.customRateValue === 'string') ui.goldRateInput.value = saved.customRateValue;
    customRateRaw = typeof saved.customRateRaw === 'number' ? saved.customRateRaw : null;

    autoRateRaw = typeof saved.autoRateRaw === 'number' ? saved.autoRateRaw : null;
    autoRateAtMs = typeof saved.autoRateAtMs === 'number' ? saved.autoRateAtMs : null;

    if (saved.lastSync) lastSync = saved.lastSync;
    if (saved.slotLevels) slotLevels = Object.assign({ combat: null, utility: null }, saved.slotLevels);
    trackerEtaMs = typeof saved.trackerEtaMs === 'number' ? saved.trackerEtaMs : null;
    trackerAlarmFired = !!saved.trackerAlarmFired;
    trackerAcknowledged = !!saved.trackerAcknowledged;
    nextAlarmAtMs = typeof saved.nextAlarmAtMs === 'number' ? saved.nextAlarmAtMs : null;

    partyActionsRemaining = typeof saved.partyActionsRemaining === 'number' ? saved.partyActionsRemaining : null;
    partyActionsAtMs = typeof saved.partyActionsAtMs === 'number' ? saved.partyActionsAtMs : null;

    panelOpen = !!saved.panelOpen;
    if (saved.windowGeometry) {
      windowGeometry = saved.windowGeometry;
      const g = windowGeometry;
      if (g.left) ui.panel.style.left = g.left;
      if (g.top) ui.panel.style.top = g.top;
      if (g.right) ui.panel.style.right = g.right;
      if (g.width) ui.panel.style.width = g.width;
      if (g.height) ui.panel.style.height = g.height;
    }

    keepAwake = !!saved.keepAwake;
    notifyOnReady = !!saved.notifyOnReady;
    // Merged over the defaults, not replaced by them: a saved config from an
    // older version is missing whatever was added since, and a missing volume
    // reading as 0 would be a silently mute alarm.
    if (saved.alarmCfg && typeof saved.alarmCfg === 'object') {
      alarmCfg = Object.assign({}, ALARM_DEFAULTS, saved.alarmCfg);
    }

    if (saved.runState === 'running') {
      // v3 stored a REMAINING duration plus the save time; v4 stores the
      // deadline itself. Convert the old shape once so an armed session
      // survives the upgrade instead of silently disarming.
      const deadline = typeof saved.runEndsAtMs === 'number' ? saved.runEndsAtMs
        : (typeof saved.runRemainingMs === 'number'
            ? (saved.savedAt || Date.now()) + saved.runRemainingMs
            : null);
      if (deadline !== null && deadline <= Date.now()) {
        runState = 'idle';
        runEndsAtMs = null;
      } else {
        runState = 'running';
        runEndsAtMs = deadline;
      }
    }
  }

  // ---- rendering ----

  // Assigning .textContent replaces the text node and dirties layout even when
  // the string is identical, so compare first. ~15 writes/sec become ~0 at idle.
  function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }
  function setAttr(el, prop, value) {
    if (el && el[prop] !== value) el[prop] = value;
  }

  // Writes the config INTO the inputs, plus a plain-language preview of the
  // resulting cadence. Four numbers do not tell you what the alarm will
  // actually do; "10s, 14s, 18s... stopping after ~9m" does.
  // NEVER write into a control the user is currently using. render() runs once
  // a second while the panel is open, so the previous version overwrote the
  // volume slider mid-drag and replaced half-typed numbers with the stored
  // value - the field fought back on every keystroke.
  function setFieldUnlessEditing(el, value) {
    if (!el || el === document.activeElement) return;
    setAttr(el, 'value', value);
  }

  // The preview is a 25-iteration loop and a string build, and it only changes
  // when the config does - which is on a click, not on a tick. Recomputing it
  // every second was work whose output was already on screen.
  let alarmPreviewKey = null;
  function renderAlarmSettings() {
    if (!ui.alarmVolume) return;
    setFieldUnlessEditing(ui.alarmVolume, String(Math.round(alarmCfg.volume * 100)));
    setText(ui.alarmVolumeOut, `${Math.round(alarmCfg.volume * 100)}%`);
    setFieldUnlessEditing(ui.alarmFirst, String(Math.round(alarmCfg.firstMs / 1000)));
    setFieldUnlessEditing(ui.alarmMax, String(Math.round(alarmCfg.maxMs / 1000)));
    setFieldUnlessEditing(ui.alarmRepeats, String(alarmCfg.maxRepeats));

    const key = `${alarmCfg.firstMs}|${alarmCfg.maxMs}|${alarmCfg.growth}|${alarmCfg.maxRepeats}`;
    if (key === alarmPreviewKey) return;
    alarmPreviewKey = key;

    let total = 0;
    const gaps = [];
    for (let i = 1; i < alarmCfg.maxRepeats; i++) {
      const gap = Math.min(alarmCfg.maxMs, alarmCfg.firstMs * Math.pow(alarmCfg.growth, i - 1));
      total += gap;
      if (gaps.length < 3) gaps.push(`${Math.round(gap / 1000)}s`);
    }
    const mins = Math.round(total / 60000);
    setText(ui.alarmPreview, alarmCfg.maxRepeats <= 1
      ? 'One chime, then silence.'
      : `Gaps: ${gaps.join(', ')}… then silence after ~${mins < 1 ? '<1' : mins}m.`);
  }

  function render() {
    // Marking dirty must happen BEFORE the visibility bail: state keeps changing
    // while the panel is hidden (the countdown, the ETA), and skipping this
    // would silently stop persisting it.
    saveProgress();

    // The badge drives the top bar, so it must stay live even when the panel is
    // hidden. Everything below it is panel DOM and is skipped while invisible.
    const isReady = trackerEtaMs !== null && trackerEtaMs <= Date.now();
    Core.setBadge(MODULE_ID, isReady);
    if (!panelOpen) return;

    if (runState === 'running') {
      const left = runRemaining();
      setText(ui.heroActions, left === null ? '∞' : formatMsRemaining(left).actionsStr);
      setText(ui.heroLabel, 'actions remaining · alarm armed');
      setText(ui.heroTime, left === null ? 'unlimited' : formatMsRemaining(left).timeStr);
    } else {
      setText(ui.heroActions, 'OFF');
      setText(ui.heroLabel, configuredRunActions !== null
        ? `press Start to arm for ${configuredRunActions} actions`
        : 'press Start to arm (unlimited)');
      setText(ui.heroTime, '');
    }
    setAttr(ui.startBtn, 'disabled', runState === 'running');
    setAttr(ui.stopBtn, 'disabled', runState === 'idle');

    if (trackerEtaMs === null) {
      setText(ui.alarmHeadline, 'No estimate yet');
      if (ui.alarmHeadline.style.color !== '') ui.alarmHeadline.style.color = '';
      setText(ui.alarmSub, lastSync.level === null
        ? 'Open the Pets page once to learn your slot level — after that it tracks anywhere.'
        : goldSnapshot() === null
          ? 'Waiting to read your gold from the sidebar.'
          : 'Need a gold/action rate (auto-grabbed or custom).');
    } else if (isReady) {
      setText(ui.alarmHeadline, '🔔 Upgrade ready!');
      if (ui.alarmHeadline.style.color !== 'rgb(62, 207, 106)') ui.alarmHeadline.style.color = '#3ecf6a';
      setText(ui.alarmSub, runState !== 'running'
        ? 'Press Start for an audible alarm.'
        : (trackerAcknowledged ? 'Snoozed until the next upgrade.' : 'Alarm repeating every 30s.'));
    } else {
      setText(ui.alarmHeadline, 'Estimating…');
      if (ui.alarmHeadline.style.color !== '') ui.alarmHeadline.style.color = '';
      const eta = formatMsRemaining(Math.max(0, trackerEtaMs - Date.now()));
      setText(ui.alarmSub, `~${eta.actionsStr} actions (${eta.timeStr}) to go`);
    }

    setText(ui.detailLevel, lastSync.level !== null ? `${lastSync.level} → ${lastSync.level + 1}` : '—');
    const requiredGold = lastSync.level !== null ? nextUpgradeCost(lastSync.level) : null;
    setText(ui.detailGold, (gold || requiredGold !== null)
      ? `${gold ? formatGold(gold.value) : '—'} / ${formatGold(requiredGold)}` : '—');

    const gold = projectedGold();
    setText(ui.detailGoldSource, gold
      ? `(${gold.from}${gold.projected ? ', projected' : ''}, read ${formatAgo(gold.atMs)})`
      : '(not read yet)');

    setAttr(ui.notifyCheck, 'checked', notifyOnReady);
    setAttr(ui.keepAwakeCheck, 'checked', keepAwake);
    ui.notifyRow = ui.notifyRow || ui.panel.querySelector('#qett-notify-row');
    const notifyBlocked = typeof Notification === 'undefined' || Notification.permission === 'denied';
    ui.notifyRow.classList.toggle('qett-check-off', notifyBlocked);
    setAttr(ui.notifyCheck, 'disabled', notifyBlocked);
    setText(ui.bgNote, notifyBlocked
      ? 'Notifications are blocked for this site — the sound still plays.'
      : (keepAwake && runState === 'running')
        ? 'Playing a near-silent tone so this tab keeps full timer speed.'
        : 'The countdown is clock-based, so it stays correct while hidden either way.');

    const rate = effectiveRate();
    setText(ui.detailRate, rate ? `${formatGold(rate)}/action` : '—');
    setText(ui.detailRateSource, rate === null ? ''
      : customRateRaw !== null ? '(custom)'
      : autoRateAtMs !== null ? `(auto, ${formatAgo(autoRateAtMs)})` : '(auto)');
    setText(ui.detailSynced, formatAgo(lastSync.atMs));

    setText(ui.headerParty, partyActionsRemaining !== null ? `⚡${partyActionsRemaining}` : '');
    setAttr(ui.headerParty, 'title', partyActionsRemaining !== null
      ? `Party actions remaining (synced ${formatAgo(partyActionsAtMs)})` : 'Party actions remaining - not synced yet');

    setAttr(ui.snoozeBtn, 'disabled', !(runState === 'running' && isReady && !trackerAcknowledged));
    renderAlarmSettings();
  }

  function masterTick() {
    if (runState === 'running') {
      const left = runRemaining();
      if (left !== null && left <= 0) { stopTracking(); return; }
      checkTrackerReady();
    }
    render();
  }

// ---- overlay UI ----

  const ui = {};
  let panelOpen = false;
  let windowGeometry = null; // { left, top, right, width, height }, only set once the user drags/resizes

  function buildPanel() {
    const style = document.createElement('style');
    style.textContent = `
      #qett-panel { position: fixed; top: 60px; right: 20px; width: 300px; z-index: 999999;
        background: var(--card); color: var(--popover-foreground); border: 2px solid var(--border);
        border-radius: 8px; font: 12px system-ui, sans-serif;
        box-shadow: 0 8px 24px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.04); }
      #qett-panel.qett-resizable { resize: both; overflow: auto; }
      #qett-header { padding: 6px 8px; display: flex; justify-content: space-between; align-items: center;
        cursor: move; border-bottom: 1px solid var(--border); font-weight: bold; }
      #qett-header-actions { display: flex; align-items: center; gap: 6px; }
      #qett-header-party { font-size: 11px; opacity: .75; font-weight: 500; cursor: default; }
      #qett-header button { background: none; border: none; color: inherit; cursor: pointer; font-size: 13px;
        border-radius: 4px; padding: 2px 4px; }
      #qett-header button.qett-header-btn-active { color: var(--primary); }
      #qett-body { padding: 10px; display: flex; flex-direction: column; gap: 10px; }

      #qett-hero { text-align: center; }
      #qett-hero-actions { font-size: 24px; font-weight: 800; line-height: 1.1; }
      #qett-hero-label { font-size: 10px; text-transform: uppercase; opacity: .65; letter-spacing: .04em; margin-top: 3px; }
      #qett-hero-time { font-size: 12px; opacity: .8; margin-top: 3px; }

      .qett-buttons { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px; }
      .qett-buttons.qett-two { grid-template-columns: 1fr auto; align-items: center; }

      .qett-group { border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; display: flex;
        flex-direction: column; gap: 5px; }
      .qett-group-label { font-weight: bold; opacity: .7; text-transform: uppercase; font-size: 10px;
        letter-spacing: .04em; }

      #qett-alarm-headline { font-weight: bold; font-size: 13px; }
      #qett-alarm-sub { opacity: .85; }
      .qett-detail-grid { display: grid; grid-template-columns: auto 1fr; column-gap: 10px; row-gap: 3px;
        font-size: 11px; margin-top: 6px; }
      .qett-detail-label { opacity: .55; }
      .qett-detail-value { text-align: right; }
      .qett-hint-inline { opacity: .55; font-size: 10px; }
      .qett-check { display: flex; align-items: center; gap: 7px; font-size: 11px; cursor: pointer;
        user-select: none; }
      .qett-check input[type="checkbox"] { width: 13px; height: 13px; accent-color: var(--primary);
        cursor: pointer; margin: 0; }
      .qett-check.qett-check-off { opacity: .5; }
      .qett-setting-grid { display: grid; grid-template-columns: auto 1fr auto; align-items: center;
        column-gap: 8px; row-gap: 5px; font-size: 11px; }
      .qett-setting-grid label { opacity: .7; white-space: nowrap; }
      .qett-setting-grid input[type="number"] { background: var(--input); color: inherit;
        border: 1px solid var(--border); border-radius: 4px; padding: 2px 5px; width: 100%;
        box-sizing: border-box; font: inherit; }
      .qett-setting-grid input[type="range"] { width: 100%; accent-color: var(--primary); margin: 0; }

      .qett-setter { display: flex; align-items: center; gap: 6px; font-size: 11px; opacity: .85; }
      .qett-setter input[type="number"], .qett-setter input[type="text"] {
        background: var(--input); color: inherit; border: 1px solid var(--border);
        border-radius: 4px; padding: 3px 5px; width: 70px; box-sizing: border-box; }
      #qett-gold-rate { width: 130px; }
      .qett-info-icon { display: inline-flex; align-items: center; justify-content: center;
        opacity: .55; cursor: help; margin-left: 4px; position: relative; }
      .qett-info-icon:hover { opacity: 1; }
      .qett-info-icon svg { width: 13px; height: 13px; display: block; }
      .qett-info-icon[data-tooltip]::after { content: attr(data-tooltip); position: absolute; bottom: 140%;
        left: 50%; transform: translateX(-50%); background: var(--popover); color: var(--popover-foreground);
        border: 1px solid var(--border); border-radius: 4px; padding: 5px 7px; font-size: 10px;
        line-height: 1.3; width: 170px; white-space: normal; opacity: 0; pointer-events: none;
        transition: opacity .08s ease .05s; box-shadow: 0 4px 12px rgba(0,0,0,.35); z-index: 20; }
      .qett-info-icon[data-tooltip]:hover::after { opacity: 1; }
      #qett-header button svg { width: 13px; height: 13px; display: block; }

      button { font-family: inherit; }
      .qett-body-btn { background: var(--primary); color: var(--primary-foreground); border: none;
        border-radius: 4px; padding: 6px 8px; cursor: pointer; font-weight: bold; }
      .qett-body-btn:disabled { opacity: .4; cursor: not-allowed; }
      .qett-small-btn { background: var(--primary); color: var(--primary-foreground); border: none;
        border-radius: 4px; padding: 3px 8px; cursor: pointer; font-weight: bold; font-size: 10px; }
      .qett-small-btn:disabled { opacity: .4; cursor: not-allowed; }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'qett-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div id="qett-header">
        <span>Combat Slot ETA Tracker</span>
        <div id="qett-header-actions">
          <span id="qett-header-party"></span>
          <button id="qett-resize-toggle" type="button" title="Toggle window resizing (drag bottom-right corner)"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13 13 3M9 3h4v4M7 13H3V9"/></svg></button>
          <button id="qett-close" type="button">×</button>
        </div>
      </div>
      <div id="qett-body">
        <div id="qett-hero">
          <div id="qett-hero-actions">OFF</div>
          <div id="qett-hero-label">press Start to arm</div>
          <div id="qett-hero-time"></div>
        </div>
        <div class="qett-buttons">
          <button id="qett-start" class="qett-body-btn" type="button">Start</button>
          <button id="qett-stop" class="qett-body-btn" type="button">Stop</button>
          <button id="qett-reset" class="qett-body-btn" type="button">Reset</button>
        </div>
        <div class="qett-setter">
          Run for
          <input id="qett-duration" type="number" min="0" placeholder="∞" />
          actions
          <button id="qett-duration-set" class="qett-small-btn" type="button">Set</button>
        </div>

        <div class="qett-group">
          <div class="qett-group-label">Alarm</div>
          <div id="qett-alarm-headline">Idle</div>
          <div id="qett-alarm-sub">—</div>
          <div class="qett-detail-grid">
            <div class="qett-detail-label">Level</div>
            <div class="qett-detail-value"><span id="qett-detail-level">—</span></div>
            <div class="qett-detail-label">Gold</div>
            <div class="qett-detail-value"><span id="qett-detail-gold">—</span>
              <span id="qett-detail-gold-source" class="qett-hint-inline"></span></div>
            <div class="qett-detail-label">Rate</div>
            <div class="qett-detail-value"><span id="qett-detail-rate">—</span>
              <span id="qett-detail-rate-source" class="qett-hint-inline"></span></div>
            <div class="qett-detail-label">Synced</div>
            <div class="qett-detail-value"><span id="qett-detail-synced">never</span></div>
          </div>
          <div class="qett-buttons qett-two">
            <button id="qett-snooze" class="qett-body-btn" type="button">Snooze</button>
            <button id="qett-test-alarm" class="qett-small-btn" type="button">Test</button>
          </div>
        </div>

        <div class="qett-group">
          <div class="qett-group-label">Alarm settings<span class="qett-info-icon"
            data-tooltip="The chime starts quick and slows down, then stops on its own so a wrong reading can never trap you. Everything here is adjustable; Defaults puts it all back."
            ><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6.3"/><line x1="8" y1="7.2" x2="8" y2="11.3" stroke-linecap="round"/><circle cx="8" cy="4.9" r="0.9" fill="currentColor" stroke="none"/></svg></span></div>
          <div class="qett-setting-grid">
            <label for="qett-alarm-volume">Volume</label>
            <input id="qett-alarm-volume" type="range" min="0" max="100" step="5" />
            <span id="qett-alarm-volume-out" class="qett-hint-inline"></span>

            <label for="qett-alarm-first">First gap</label>
            <input id="qett-alarm-first" type="number" min="2" max="600" step="1" />
            <span class="qett-hint-inline">s</span>

            <label for="qett-alarm-max">Slowest gap</label>
            <input id="qett-alarm-max" type="number" min="5" max="3600" step="5" />
            <span class="qett-hint-inline">s</span>

            <label for="qett-alarm-repeats">Stop after</label>
            <input id="qett-alarm-repeats" type="number" min="1" max="999" step="1" />
            <span class="qett-hint-inline">chimes</span>
          </div>
          <div id="qett-alarm-preview" class="qett-hint-inline"></div>
          <div class="qett-buttons qett-two">
            <button id="qett-alarm-silence" class="qett-body-btn" type="button">Silence now</button>
            <button id="qett-alarm-defaults" class="qett-small-btn" type="button">Defaults</button>
          </div>
        </div>

        <div class="qett-group">
          <div class="qett-group-label">Background<span class="qett-info-icon"
            data-tooltip="A hidden tab has its timers slowed to roughly once a minute. The countdown stays correct anyway - it reads the clock rather than counting ticks. These two make the ALARM arrive on time too."
            ><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6.3"/><line x1="8" y1="7.2" x2="8" y2="11.3" stroke-linecap="round"/><circle cx="8" cy="4.9" r="0.9" fill="currentColor" stroke="none"/></svg></span></div>
          <label class="qett-check" id="qett-notify-row">
            <input id="qett-notify" type="checkbox" /><span>Desktop notification when ready</span></label>
          <label class="qett-check" id="qett-keepawake-row">
            <input id="qett-keepawake" type="checkbox" /><span>Keep tab awake while armed</span></label>
          <div id="qett-bg-note" class="qett-hint-inline"></div>
        </div>

        <div class="qett-group">
          <div class="qett-group-label">Custom ETA<span class="qett-info-icon"
            data-tooltip="Overrides the auto-grabbed rate for a hypothetical estimate. Press Auto to go back to automatic."
            ><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6.3"/><line x1="8" y1="7.2" x2="8" y2="11.3" stroke-linecap="round"/><circle cx="8" cy="4.9" r="0.9" fill="currentColor" stroke="none"/></svg></span></div>
          <div class="qett-setter">
            <input id="qett-gold-rate" type="text" placeholder="e.g. 12,34 (B/action)" />
            <button id="qett-gold-rate-set" class="qett-small-btn" type="button">Set</button>
            <button id="qett-gold-rate-auto" class="qett-small-btn" type="button">Auto</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    ui.panel = panel;
    ui.heroActions = panel.querySelector('#qett-hero-actions');
    ui.heroLabel = panel.querySelector('#qett-hero-label');
    ui.heroTime = panel.querySelector('#qett-hero-time');
    ui.startBtn = panel.querySelector('#qett-start');
    ui.stopBtn = panel.querySelector('#qett-stop');
    ui.resetBtn = panel.querySelector('#qett-reset');
    ui.durationInput = panel.querySelector('#qett-duration');
    ui.durationSetBtn = panel.querySelector('#qett-duration-set');

    ui.alarmHeadline = panel.querySelector('#qett-alarm-headline');
    ui.alarmSub = panel.querySelector('#qett-alarm-sub');
    ui.detailLevel = panel.querySelector('#qett-detail-level');
    ui.detailGold = panel.querySelector('#qett-detail-gold');
    ui.detailRate = panel.querySelector('#qett-detail-rate');
    ui.detailRateSource = panel.querySelector('#qett-detail-rate-source');
    ui.detailSynced = panel.querySelector('#qett-detail-synced');
    ui.headerParty = panel.querySelector('#qett-header-party');
    ui.snoozeBtn = panel.querySelector('#qett-snooze');
    ui.testAlarmBtn = panel.querySelector('#qett-test-alarm');

    ui.detailGoldSource = panel.querySelector('#qett-detail-gold-source');
    ui.notifyCheck = panel.querySelector('#qett-notify');
    ui.keepAwakeCheck = panel.querySelector('#qett-keepawake');
    ui.bgNote = panel.querySelector('#qett-bg-note');

    ui.notifyCheck.addEventListener('change', () => {
      if (!ui.notifyCheck.checked) { notifyOnReady = false; saveProgress(); render(); return; }
      // The permission prompt must come from the click itself, so it is
      // requested here rather than lazily at alarm time - when the tab is
      // hidden and a prompt would be both blocked and useless.
      requestNotifyPermission().then((perm) => {
        notifyOnReady = perm === 'granted';
        ui.notifyCheck.checked = notifyOnReady;
        saveProgress();
        render();
      });
    });
    ui.keepAwakeCheck.addEventListener('change', () => {
      keepAwake = ui.keepAwakeCheck.checked;
      applyKeepAwake();
      saveProgress();
      render();
    });

    ui.alarmVolume = panel.querySelector('#qett-alarm-volume');
    ui.alarmVolumeOut = panel.querySelector('#qett-alarm-volume-out');
    ui.alarmFirst = panel.querySelector('#qett-alarm-first');
    ui.alarmMax = panel.querySelector('#qett-alarm-max');
    ui.alarmRepeats = panel.querySelector('#qett-alarm-repeats');
    ui.alarmPreview = panel.querySelector('#qett-alarm-preview');

    function readAlarmSettings() {
      const num = (el, lo, hi, fallback) => {
        const v = parseFloat(el.value);
        return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
      };
      alarmCfg.volume = num(ui.alarmVolume, 0, 100, 32) / 100;
      alarmCfg.firstMs = num(ui.alarmFirst, 2, 600, 10) * 1000;
      alarmCfg.maxMs = num(ui.alarmMax, 5, 3600, 120) * 1000;
      // A slowest-gap below the first gap would make the cadence run backwards.
      if (alarmCfg.maxMs < alarmCfg.firstMs) alarmCfg.maxMs = alarmCfg.firstMs;
      alarmCfg.maxRepeats = Math.round(num(ui.alarmRepeats, 1, 999, 25));
      saveProgress();
      renderAlarmSettings();
    }
    for (const el of [ui.alarmVolume, ui.alarmFirst, ui.alarmMax, ui.alarmRepeats]) {
      el.addEventListener('change', readAlarmSettings);
    }
    ui.alarmVolume.addEventListener('input', () => {
      ui.alarmVolumeOut.textContent = `${ui.alarmVolume.value}%`;
    });
    panel.querySelector('#qett-alarm-silence').addEventListener('click', () => {
      silenceAlarm();
      Core.toast('Alarm silenced.', { type: 'success', duration: 3000 });
      render();
    });
    panel.querySelector('#qett-alarm-defaults').addEventListener('click', () => {
      alarmCfg = Object.assign({}, ALARM_DEFAULTS);
      renderAlarmSettings();
      saveProgress();
    });

    ui.goldRateInput = panel.querySelector('#qett-gold-rate');
    ui.goldRateSetBtn = panel.querySelector('#qett-gold-rate-set');
    ui.goldRateAutoBtn = panel.querySelector('#qett-gold-rate-auto');

    ui.startBtn.addEventListener('click', startTracking);
    ui.stopBtn.addEventListener('click', stopTracking);
    ui.resetBtn.addEventListener('click', resetSession);

    ui.durationSetBtn.addEventListener('click', commitDuration);
    ui.durationInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') commitDuration(); });

    ui.goldRateSetBtn.addEventListener('click', commitCustomRate);
    ui.goldRateInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') commitCustomRate(); });
    ui.goldRateAutoBtn.addEventListener('click', () => {
      ui.goldRateInput.value = '';
      commitCustomRate();
    });

    ui.snoozeBtn.addEventListener('click', snoozeAlarm);
    ui.testAlarmBtn.addEventListener('click', () => {
      const ctx = ensureAudioCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      playGentleAlarm();
      // also flash the top-bar badge/title so Test previews the whole signal,
      // not just the sound - settles back to the real state after a couple seconds
      Core.setBadge(MODULE_ID, true);
      setTimeout(() => {
        Core.setBadge(MODULE_ID, trackerEtaMs !== null && trackerEtaMs <= Date.now());
      }, 2000);
    });

    ui.resizeToggleBtn = panel.querySelector('#qett-resize-toggle');
    ui.resizeToggleBtn.addEventListener('click', () => {
      const on = panel.classList.toggle('qett-resizable');
      ui.resizeToggleBtn.classList.toggle('qett-header-btn-active', on);
    });

    panel.querySelector('#qett-close').addEventListener('click', () => togglePanel(false));
    makeDraggable(panel, panel.querySelector('#qett-header'), saveWindowGeometry);

    // native CSS `resize` fires no JS event of its own - ResizeObserver is the
    // cheap, standard way to notice a user-driven size change and persist it
    let resizeSaveTimer = null;
    new ResizeObserver(() => {
      clearTimeout(resizeSaveTimer);
      resizeSaveTimer = setTimeout(saveWindowGeometry, 300);
    }).observe(panel);
  }

  // Document-level listeners exist only for the duration of a drag. Leaving them
  // attached meant every module kept 2 always-live handlers firing on every
  // mouse move anywhere on the page, for the whole session.
  function makeDraggable(panel, handle, onChange) {
    handle.addEventListener('mousedown', (e) => {
      const rect = panel.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      const onMove = (ev) => {
        panel.style.left = `${ev.clientX - offsetX}px`;
        panel.style.top = `${ev.clientY - offsetY}px`;
        panel.style.right = 'auto';
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        window.removeEventListener('blur', onUp);
        if (onChange) onChange();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      // Release the button outside the window and mouseup never reaches the
      // document, so the move handler stayed attached for the rest of the
      // session - S3 coming back in through a different door. The blur event
      // is the one that does arrive.
      window.addEventListener('blur', onUp);
    });
  }

  function saveWindowGeometry() {
    windowGeometry = {
      left: ui.panel.style.left || null,
      top: ui.panel.style.top || null,
      right: ui.panel.style.right || null,
      width: ui.panel.style.width || null,
      height: ui.panel.style.height || null,
    };
    saveProgress();
  }

  function togglePanel(force) {
    const show = force !== undefined ? force : ui.panel.style.display === 'none';
    ui.panel.style.display = show ? 'block' : 'none';
    panelOpen = show;
    Core.setOpen(MODULE_ID, show);
    // render() skips panel DOM while hidden, so repaint on the way back up
    // rather than showing a stale frame until the next tick
    if (show) render();
    saveProgress();
  }

  // @run-at is document-start so we are live before the SPA paints; body may
  // not exist yet, so gate the DOM-touching bootstrap on it.
  function whenBodyReady(fn) {
    if (document.body) return fn();
    const obs = new MutationObserver(() => {
      if (document.body) { obs.disconnect(); fn(); }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  whenBodyReady(bootstrap);

  function bootstrap() {
  buildPanel();
  loadProgress();
  applyKeepAwake(); // a session restored as still-armed keeps its keepalive
  renderAlarmSettings();
  render();
  pollAmbientStats();

  // ---- tools: standalone pages, opened in their own tab ----
  //
  // NOT a module. There is nothing running and nothing to persist, so an
  // enable/disable switch would be a dead control — see Core's `tools`
  // registry comment. It appears under "Tools" in the dropdown.
  //
  // WHY A NEW TAB IS THE RIGHT SHAPE, not a compromise: a second tab gets its
  // own main thread, so a heavy interactive page costs the game page nothing.
  // INSTRUMENTATION.md §2's throttling constraint is about BACKGROUND work —
  // and a calculator the user is looking at is by definition in the
  // foreground, while a backgrounded one being throttled is exactly what you
  // want. This is the one place where "run it in the browser" is strictly
  // better than routing through the core.
  //
  // The payload is embedded by the build (no network, no hosting, versioned
  // with the script) and turned into a blob URL at click time rather than at
  // load, so the ~40KB string is only ever materialised as a URL if the user
  // actually opens it.
  //
  // The payload is REBUILT on each open rather than cached, because a live
  // snapshot of your slot levels / character level / party is prepended to it
  // and a cached URL would hand over whatever was true the first time. The
  // previous blob is revoked first, so exactly one is ever alive - which was
  // the reason the URL was cached in the first place.
  let roiUrl = null;
  Core.registerLink({
    id: 'party-gold-roi',
    label: 'Party Gold ROI',
    open() {
      if (roiUrl) { try { URL.revokeObjectURL(roiUrl); } catch (e) { /* ignore */ } }
      // `</` inside a JSON string would close the script element early; the
      // escape is what makes injecting data into a <script> block safe.
      const live = JSON.stringify(collectLiveSnapshot()).replace(/</g, '\\u003c');
      const html = '<script>window.APOZ_LIVE=' + live + ';<' + '/script>' + APOZ_TOOL_PARTY_GOLD_ROI;
      roiUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      return roiUrl;
    },
  });

  Core.registerModule({
    id: MODULE_ID,
    label: 'Combat Slot ETA Tracker',
    shortLabel: 'Alarm',
    description: 'Estimates time to the next combat pet slot upgrade and rings when it is affordable',
    // The Core API this was written against. A Core older than this refuses
    // the registration and says which version is needed, instead of the module
    // half-working and failing somewhere unrelated. See DISTRIBUTION.md §1.2.
    needsCore: 5,
    // enabling in the dropdown just adds the quick button - it does NOT open
    // the window; disabling always force-closes it though
    // D1 — disabling must DISARM, not just hide. Hiding the panel while the
    // heartbeat kept running is how a user ended up with an alarm they could
    // not reach: the panel was gone, so Stop and Snooze were gone with it.
    // stopTracking() also drops the keep-awake tone.
    //
    // Note for anyone debugging this: disabling the SCRIPT in Tampermonkey
    // does not unload code from a page that is already open — only a reload
    // does. Disabling the MODULE here is the thing that stops it live.
    onToggle: (enabled) => {
      if (!enabled) { stopTracking(); silenceAlarm(); togglePanel(false); }
    },
    onQuickClick: () => togglePanel(),
    // the number convention resolves late (needs React) and can be overridden -
    // everything previously parsed under a wrong guess must be re-read
    onConventionChange: () => {
      autoRateRaw = null;
      autoRateAtMs = null;
      partyRateGrabbedThisVisit = false;
      lastSync = { atMs: null, level: null, current: null };
      slotLevels = { combat: null, utility: null };
      goldNow = null; goldAtMs = null; goldFrom = null;
      refreshFromLiveData();
    },
    // Test seam, same pattern and same naming deterrent as Core's
    // __modulesForTest: the alarm bug this pins was reported by a real user,
    // and its whole nature is internal state that no DOM assertion can see.
    __forTest: {
      state: () => ({ runState, trackerEtaMs, trackerAcknowledged, alarmRepeats,
        level: lastSync.level, keepAwake, alarmCfg }),
      arm: (etaMs, level) => { runState = 'running'; lastSync = { atMs: Date.now(), level, current: 0 };
        trackerEtaMs = etaMs; trackerAcknowledged = false; trackerAlarmFired = false;
        nextAlarmAtMs = null; alarmRepeats = 0; },
      tick: () => checkTrackerReady(),
      silence: () => silenceAlarm(),
      simulatePurchaseClick: () => {
        lastSync = { atMs: Date.now(), level: null, current: null };
        trackerEtaMs = null; trackerAlarmFired = false; trackerAcknowledged = false;
        nextAlarmAtMs = null; alarmRepeats = 0;
      },
      recomputeEta: () => { recomputeEta(); return trackerEtaMs; },
    },
    onResetPosition: () => {
      ui.panel.style.left = '';
      ui.panel.style.top = '';
      ui.panel.style.right = '';
      ui.panel.style.width = '';
      ui.panel.style.height = '';
      saveWindowGeometry();
    },
  });

  if (panelOpen) togglePanel(true); // restore last session's open/closed state

  // debounced: an unthrottled observer here fired on every DOM change (chat
  // scrolling, ticking progress bars, hover cards) and could hang the tab -
  // coalesce bursts into at most ~2.5 checks/sec. Ambient sidebar stats are
  // deliberately NOT read here - they're on their own slow interval below.
  let refreshTimer = null;
  function scheduleRefresh() {
    if (refreshTimer) return;
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      refreshFromLiveData();
    }, 400);
  }
  new MutationObserver(scheduleRefresh).observe(document.body, { childList: true, subtree: true });

  startHeartbeat();
  setInterval(pollAmbientStats, AMBIENT_POLL_MS);

  // one write per 10s at most, and always one before the page goes away.
  // pagehide covers tab close/navigation; visibilitychange covers backgrounding,
  // which is when a throttled timer might not fire again at all.
  setInterval(flushProgress, 10000);
  window.addEventListener('pagehide', flushProgress);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { flushProgress(); return; }
    // Coming back: whatever the throttled heartbeat missed is caught up here in
    // one pass, so the panel is never showing a minute-old frame on return.
    pollAmbientStats();
    refreshFromLiveData();
    if (runState === 'running') checkTrackerReady();
  });
  }

  });
})();
