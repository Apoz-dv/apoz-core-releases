// ==UserScript==
// @name         Apoz Core — Combat Slot ETA Tracker
// @namespace    apoz-core
// @author       Apoz
// @version      4.0.0
// @description  Read-only overlay: estimates time until the Combat pet slot upgrade is affordable from your live gold and the exact upgrade-cost formula (no need to sit on the Pets page), rings a gentle alarm - and optionally a desktop notification - when it is, and stays accurate in a backgrounded tab. Ships the Party Gold ROI calculator. No auto-clicking.
// @match        https://v2.queslar.com/*
// @match        https://*.queslar.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/Apoz-dv/apoz-core-releases/main/live/eta-tracker.user.js
// @downloadURL  https://raw.githubusercontent.com/Apoz-dv/apoz-core-releases/main/live/eta-tracker.user.js
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
  const APOZ_TOOL_PARTY_GOLD_ROI = "<meta charset=\"utf-8\">\n<title>Party Gold ROI</title>\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap\">\n<style>\n:root{\n  --bg:#eef0ea; --surface:#fff; --surface-2:#f4f5f0; --border:#d7dbd0;\n  --text:#1b2420; --text-muted:#5c655d; --text-faint:#8a9189;\n  --blue:#1f5fa8; --blue-soft:#3987e5; --orange:#b8501f; --orange-soft:#eb6834;\n  --success:#2f8f5b; --rail:#c7cdc0; --band:#fbf3e2; --current:#e6f0ee; --warnbg:#fbf1de; --warnborder:#c98500;\n  --mono:'IBM Plex Mono',ui-monospace,monospace;\n  --sans:'IBM Plex Sans',system-ui,sans-serif;\n  --display:'Big Shoulders Display','Arial Narrow',sans-serif;\n}\n@media (prefers-color-scheme:dark){\n  :root:not([data-theme=\"light\"]){\n    --bg:#10151a; --surface:#171e25; --surface-2:#1c242c; --border:#2a343d;\n    --text:#e7ecef; --text-muted:#97a3ad; --text-faint:#616f79;\n    --blue:#5b9de3; --blue-soft:#3987e5; --orange:#e8935f; --orange-soft:#d95926;\n    --success:#6fcf97; --rail:#33404a; --band:#241f14; --current:#152522; --warnbg:#241f14; --warnborder:#c98500;\n  }\n}\n:root[data-theme=\"dark\"]{\n  --bg:#10151a; --surface:#171e25; --surface-2:#1c242c; --border:#2a343d;\n  --text:#e7ecef; --text-muted:#97a3ad; --text-faint:#616f79;\n  --blue:#5b9de3; --blue-soft:#3987e5; --orange:#e8935f; --orange-soft:#d95926;\n  --success:#6fcf97; --rail:#33404a; --band:#241f14; --current:#152522; --warnbg:#241f14; --warnborder:#c98500;\n}\n*{box-sizing:border-box}\n/* `hidden` must beat the display:flex/grid rules below it - otherwise a\n   toggled-off row (the calibration line, the live-import actions) keeps\n   rendering because its own class re-declares display. */\n[hidden]{display:none!important}\nhtml,body{margin:0;background:var(--bg)}\nbody{color:var(--text);font-family:var(--sans);line-height:1.5;font-size:.92rem}\na{color:inherit}\n\n/* ---- layout shell ---- */\n.app{display:grid;grid-template-columns:300px minmax(0,1fr);gap:1.75rem;max-width:1360px;margin:0 auto;padding:1.75rem 1.5rem 5rem}\n@media (max-width:980px){.app{grid-template-columns:1fr;padding:1.5rem 1.1rem 5rem}}\n\n.eyebrow{font-family:var(--mono);font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--blue-soft);margin-bottom:.4rem}\nh1{font-family:var(--display);font-weight:700;font-size:1.55rem;margin:0 0 .35rem;line-height:1.05;text-wrap:balance}\n.sub{color:var(--text-muted);font-size:.82rem;margin:0 0 1.1rem;line-height:1.45}\n\n/* ---- sidebar ---- */\n.sidebar-inner{display:flex;flex-direction:column;gap:1rem}\n@media (min-width:981px){.sidebar-inner{position:sticky;top:1.5rem;max-height:calc(100vh - 3rem);overflow-y:auto;padding-right:.3rem}}\n\n.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:.95rem 1.1rem}\n\n.label-sm{font-size:.68rem;letter-spacing:.04em;text-transform:uppercase;color:var(--text-faint)}\n\n.input-stack{display:flex;flex-direction:column;gap:.7rem}\n.field{display:flex;flex-direction:column;gap:.3rem}\n.field label{display:flex;align-items:center;gap:.3rem;font-family:var(--mono);font-size:.68rem;letter-spacing:.04em;text-transform:uppercase;color:var(--text-faint)}\ninput[type=number],input[type=text]{font-family:var(--mono);font-size:1rem;font-weight:600;color:var(--text);background:var(--surface-2);border:1px solid var(--border);border-radius:7px;padding:.45rem .6rem;width:100%;font-variant-numeric:tabular-nums}\ninput[type=number]:focus,input[type=text]:focus{outline:2px solid var(--blue-soft);outline-offset:1px}\n.field-row{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}\n.field-row-3{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem}\n\n.btnrow{display:flex;gap:.5rem;margin-top:.2rem}\n.reset-btn,.more-btn{font-family:var(--mono);font-size:.72rem;color:var(--text-muted);background:none;border:1px solid var(--border);border-radius:100px;padding:.32rem .75rem;cursor:pointer;flex:1}\n.reset-btn:hover{border-color:var(--orange-soft);color:var(--orange-soft)}\n.more-btn{color:var(--blue-soft);border-color:var(--blue-soft)}\n.more-btn:hover{background:color-mix(in srgb, var(--blue-soft) 12%, transparent)}\n.more-btn:disabled{opacity:.4;cursor:default}\n.toggle-btn{display:block;width:100%;text-align:center;font-family:var(--mono);font-size:.72rem;color:var(--blue-soft);background:none;border:1px solid var(--blue-soft);border-radius:100px;padding:.32rem .75rem;cursor:pointer;margin-top:.8rem}\n.toggle-btn:hover{background:color-mix(in srgb, var(--blue-soft) 12%, transparent)}\n\n.result-card{padding-top:.85rem}\n.result-row-item{display:flex;justify-content:space-between;align-items:baseline;padding:.3rem 0;gap:.6rem}\n.result-row-item + .result-row-item{border-top:1px dashed var(--border)}\n.result-label{font-family:var(--mono)}\n.result-value{font-family:var(--display);font-size:1.3rem;font-weight:700;font-variant-numeric:tabular-nums;color:var(--orange-soft)}\n.result-value-sm{font-family:var(--mono);font-size:.85rem;font-weight:600;font-variant-numeric:tabular-nums;color:var(--blue-soft)}\n.result-value-sm.ok{color:var(--success)}\n.result-value-sm.off{color:var(--orange-soft)}\n\n.quicklinks{display:flex;flex-direction:column;gap:.15rem}\n.quicklinks a{font-family:var(--mono);font-size:.72rem;color:var(--text-muted);text-decoration:none;padding:.35rem .5rem;border-radius:6px}\n.quicklinks a:hover{color:var(--blue-soft);background:var(--surface-2)}\n\n.advanced-panel{margin-top:.9rem;padding-top:.9rem;border-top:1px solid var(--border)}\n.advanced-panel[hidden]{display:none}\n.adv-group{margin-bottom:1rem}\n.adv-group:last-child{margin-bottom:0}\n.adv-group h4{font-family:var(--sans);margin:0 0 .55rem;display:flex;align-items:center;gap:.35rem}\n.checkfield{display:flex;align-items:center;gap:.5rem;font-family:var(--sans);font-size:.84rem;color:var(--text);cursor:pointer;user-select:none}\n.checkfield input[type=checkbox]{width:1.05rem;height:1.05rem;accent-color:var(--blue-soft);cursor:pointer}\n.adv-note{font-size:.72rem;color:var(--text-faint);margin-top:.4rem;line-height:1.4}\n\n/* ---- live import ---- */\n.live-card{border-left:3px solid var(--success)}\n.live-card.stale{border-left-color:var(--warnborder)}\n.live-card.absent{border-left-color:var(--rail)}\n.live-head{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.5rem}\n.live-title{font-family:var(--mono);font-size:.68rem;letter-spacing:.04em;text-transform:uppercase;color:var(--success);display:flex;align-items:center;gap:.35rem}\n.live-card.absent .live-title{color:var(--text-faint)}\n.live-when{font-family:var(--mono);font-size:.65rem;color:var(--text-faint)}\n.live-list{display:flex;flex-direction:column;gap:.18rem;margin-bottom:.6rem}\n.live-row{display:flex;justify-content:space-between;gap:.6rem;font-size:.75rem;padding:.12rem 0}\n.live-row .k{color:var(--text-muted)}\n.live-row .v{font-family:var(--mono);font-weight:600;font-variant-numeric:tabular-nums}\n.live-row .src{font-size:.62rem;color:var(--text-faint);font-family:var(--mono)}\n.live-empty{font-size:.75rem;color:var(--text-muted);line-height:1.45}\n\n/* ---- tooltip / info icon ---- */\n.tip{position:relative;border-bottom:1px dotted var(--text-faint);cursor:help}\n.bubble{position:absolute;left:50%;bottom:calc(100% + 7px);transform:translateX(-50%) translateY(3px);min-width:max-content;max-width:22rem;background:var(--text);color:var(--bg);font-family:var(--mono);font-size:.7rem;line-height:1.4;padding:.4rem .6rem;border-radius:6px;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .12s,transform .12s;z-index:20;white-space:normal}\n.bubble::after{content:\"\";position:absolute;top:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:var(--text)}\n.tip:hover .bubble,.tip:focus .bubble,.tip:focus-within .bubble,\n.info-icon:hover .bubble,.info-icon:focus .bubble{opacity:1;visibility:visible;transform:translateX(-50%) translateY(0)}\n.info-icon{position:relative;display:inline-flex;align-items:center;justify-content:center;width:1rem;height:1rem;border-radius:50%;border:1px solid var(--text-faint);color:var(--text-faint);font-family:var(--sans);font-size:.62rem;font-style:italic;font-weight:600;cursor:help;flex:none}\n.info-icon:hover,.info-icon:focus{border-color:var(--blue-soft);color:var(--blue-soft)}\n\n/* ---- collapsibles ---- */\ndetails.panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:.95rem 1.1rem;margin-bottom:1.1rem}\ndetails.panel summary{cursor:pointer;font-family:var(--sans);font-weight:600;font-size:.86rem;color:var(--text);list-style:none;display:flex;align-items:center;gap:.45rem}\ndetails.panel summary::-webkit-details-marker{display:none}\ndetails.panel summary::before{content:'\\25B8';font-family:var(--mono);color:var(--blue-soft);transition:transform .15s;font-size:.8rem}\ndetails.panel[open] summary::before{transform:rotate(90deg)}\ndetails.panel summary .sub{font-weight:400;color:var(--text-muted);font-size:.76rem;margin:0}\n.panel-body{margin-top:.8rem}\n\n/* condensed calc-steps ledger */\n.calc-ledger{position:relative;padding-left:1.65rem}\n.calc-ledger::before{content:\"\";position:absolute;left:.58rem;top:.5rem;bottom:.9rem;width:1px;background:var(--rail)}\n.calc-step{position:relative;margin-bottom:.55rem;display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap;font-size:.82rem}\n.calc-step-n{position:absolute;left:-1.65rem;top:.05rem;width:1.15rem;height:1.15rem;border-radius:50%;background:var(--surface);border:1.5px solid var(--rail);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-weight:600;font-size:.62rem;color:var(--text-muted)}\n.calc-step .step-label{color:var(--text);font-weight:600;flex:0 0 auto}\n.calc-step .step-expr{font-family:var(--mono);font-size:.72rem;color:var(--text-faint);flex:1 1 auto}\n.calc-step .step-val{font-family:var(--mono);font-weight:700;white-space:nowrap;margin-left:auto;color:var(--orange-soft)}\n.calc-step.final .step-val{color:var(--success);font-size:.92rem}\n\n.panel-body h4{font-family:var(--sans);font-size:.68rem;letter-spacing:.04em;text-transform:uppercase;color:var(--text-faint);margin:1rem 0 .45rem}\n.panel-body h4:first-child{margin-top:0}\n.panel-body ul{margin:0;padding-left:1.1rem;color:var(--text-muted);font-size:.8rem}\n.panel-body li{margin-bottom:.4rem}\ncode{font-family:var(--mono);background:var(--surface-2);padding:.05rem .3rem;border-radius:4px;color:var(--text);font-size:.9em}\n\n/* ---- main sections ---- */\nh3.sec{font-family:var(--display);font-weight:700;font-size:1.25rem;margin:2rem 0 .25rem}\nh3.sec:first-child{margin-top:0}\n.sec-sub{color:var(--text-muted);font-size:.8rem;margin:0 0 .8rem;max-width:70ch}\n\n/* ---- verdict ---- */\n.verdict{background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--orange-soft);border-radius:12px;padding:1rem 1.15rem;margin-bottom:1.2rem}\n.verdict-head{display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap;margin-bottom:.5rem}\n.verdict-kicker{font-family:var(--mono);font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--text-faint)}\n.verdict-answer{font-family:var(--display);font-weight:800;font-size:1.7rem;line-height:1;color:var(--orange-soft)}\n.verdict-answer.util{color:var(--blue-soft)}\n.verdict-body{font-size:.84rem;color:var(--text-muted);margin:0}\n.verdict-body strong{color:var(--text)}\n.verdict-body + .verdict-body{margin-top:.45rem}\n\n.compare{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:0 0 1.2rem}\n@media (max-width:640px){.compare{grid-template-columns:1fr}}\n.compare .box{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:.95rem 1.1rem}\n.compare .box.win{border-color:var(--success);box-shadow:inset 3px 0 0 var(--success)}\n.compare .box h5{margin:0 0 .3rem;font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:var(--text-faint);display:flex;align-items:center;gap:.35rem}\n.compare .box .big{font-family:var(--display);font-size:1.6rem;color:var(--orange-soft);line-height:1.1}\n.compare .box .unit{font-family:var(--mono);font-size:.66rem;color:var(--text-faint);text-transform:uppercase;letter-spacing:.04em}\n.compare .box p{margin:.3rem 0 0;font-size:.78rem;color:var(--text-muted)}\n.compare .box dl{display:grid;grid-template-columns:auto 1fr;gap:.1rem .7rem;margin:.55rem 0 0;font-size:.74rem}\n.compare .box dt{color:var(--text-faint)}\n.compare .box dd{margin:0;font-family:var(--mono);text-align:right;font-variant-numeric:tabular-nums}\n\n/* ---- greedy plan strip ---- */\n.plan{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:.95rem 1.1rem;margin-bottom:1.2rem}\n.plan h5{margin:0 0 .55rem;font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:var(--text-faint)}\n.plan-strip{display:flex;gap:3px;flex-wrap:wrap;margin-bottom:.6rem}\n.plan-cell{width:1.55rem;height:1.55rem;border-radius:4px;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:.58rem;font-weight:600;color:#fff;position:relative}\n.plan-cell.c{background:var(--orange-soft)}\n.plan-cell.u{background:var(--blue-soft)}\n.plan-cell.flip{outline:2px solid var(--success);outline-offset:1px}\n.plan-legend{display:flex;gap:1rem;flex-wrap:wrap;font-size:.73rem;color:var(--text-muted);margin-bottom:.5rem}\n.plan-legend span{display:flex;align-items:center;gap:.35rem}\n.plan-note{font-size:.8rem;color:var(--text-muted);margin:0}\n.plan-note strong{color:var(--text)}\n\n.tbl-wrap{overflow-x:auto;max-height:520px;overflow-y:auto;border:1px solid var(--border);border-radius:12px;background:var(--surface)}\n.tbl-wrap.short{max-height:none}\ntable.roi{width:100%;border-collapse:collapse;font-size:.78rem}\ntable.roi thead th{position:sticky;top:0;z-index:2;background:var(--surface-2);text-align:right;font-family:var(--mono);font-weight:500;font-size:.68rem;letter-spacing:.04em;text-transform:uppercase;color:var(--text-faint);padding:.45rem .55rem;border-bottom:1px solid var(--border);white-space:nowrap}\ntable.roi thead tr.grp th{font-size:.6rem;letter-spacing:.08em;color:var(--text-muted);padding-bottom:.2rem;border-bottom:none}\ntable.roi thead th:first-child{text-align:left}\ntable.roi tbody td{text-align:right;padding:.32rem .55rem;font-family:var(--mono);font-variant-numeric:tabular-nums;border-top:1px solid var(--border);white-space:nowrap}\ntable.roi tbody td.lvl{text-align:left;color:var(--text-muted)}\ntable.roi tbody td.sep{border-left:1px solid var(--border)}\ntable.roi thead th.sep{border-left:1px solid var(--border)}\ntable.roi tbody td.wk{color:var(--text)}\ntable.roi tbody tr.boundary td{color:var(--success)}\ntable.roi tbody tr.band{background:var(--band)}\ntable.roi tbody tr.current{background:var(--current);font-weight:600}\ntable.roi tbody tr.current td{border-top:2px solid var(--blue-soft);border-bottom:2px solid var(--blue-soft)}\n.tag{font-family:var(--sans);font-size:.58rem;letter-spacing:.06em;text-transform:uppercase;color:var(--blue-soft);border:1px solid currentColor;border-radius:3px;padding:0 .25rem;margin-left:.25rem}\n.tag.win{color:var(--success)}\n.legend{display:flex;gap:1.1rem;flex-wrap:wrap;margin-top:.6rem;font-size:.73rem;color:var(--text-muted)}\n.legend span{display:flex;align-items:center;gap:.35rem}\n.sw{width:.8rem;height:.8rem;border-radius:3px;border:1px solid var(--border);display:inline-block}\n.tblfoot{display:flex;justify-content:center;align-items:center;gap:.4rem;padding:.6rem 0;flex-wrap:wrap}\n.tblfoot .more-btn{flex:0 0 auto}\n.jump{display:flex;align-items:center;gap:.3rem}\n.jump input{width:5.5rem;font-size:.75rem;padding:.28rem .45rem;font-weight:500}\n.rowcount{font-family:var(--mono);font-size:.68rem;color:var(--text-faint)}\n\n/* ---- back to top ---- */\n#backToTop{position:fixed;right:1.1rem;bottom:1.1rem;width:2.6rem;height:2.6rem;border-radius:50%;background:var(--surface);border:1px solid var(--border);color:var(--blue-soft);font-size:1.1rem;cursor:pointer;display:none;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.15);opacity:0;transition:opacity .2s;z-index:30}\n#backToTop.show{display:flex;opacity:.85}\n#backToTop:hover{opacity:1;border-color:var(--blue-soft)}\n</style>\n\n<div class=\"app\">\n  <aside class=\"sidebar\">\n    <div class=\"sidebar-inner\">\n      <div>\n        <div class=\"eyebrow\">Combat vs Utility pet slot</div>\n        <h1>Party Gold ROI</h1>\n        <p class=\"sub\">Every multiplier that reaches your party-action gold, in the order it applies &mdash; and which pet slot is the better buy right now.</p>\n      </div>\n\n      <div class=\"card live-card absent\" id=\"liveCard\">\n        <div class=\"live-head\">\n          <span class=\"live-title\">Live import<span class=\"info-icon\" tabindex=\"0\">i<span class=\"bubble\">Filled in by the Apoz Core userscript when you open this page from the in-game menu. Nothing is sent anywhere &mdash; the values are handed over in-page.</span></span></span>\n          <span class=\"live-when\" id=\"liveWhen\"></span>\n        </div>\n        <div class=\"live-list\" id=\"liveList\"></div>\n        <div class=\"live-empty\" id=\"liveEmpty\">Not opened from the game. Open <strong>Apoz Core &rsaquo; Tools &rsaquo; Party Gold ROI</strong> inside Queslar and your slot levels, character level and party are filled in automatically.</div>\n        <div class=\"btnrow\" id=\"liveActions\" hidden>\n          <button type=\"button\" class=\"more-btn\" id=\"liveApplyBtn\">Apply live values</button>\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"input-stack\">\n          <div class=\"field\">\n            <label for=\"combatInput\">Combat pet slot level</label>\n            <input type=\"number\" id=\"combatInput\" min=\"0\" max=\"5000\" value=\"50\">\n          </div>\n          <div class=\"field\">\n            <label for=\"utilityInput\">Utility pet slot level</label>\n            <input type=\"number\" id=\"utilityInput\" min=\"0\" max=\"5000\" value=\"30\">\n          </div>\n        </div>\n\n        <div class=\"btnrow\">\n          <button type=\"button\" class=\"reset-btn\" id=\"resetBtn\">Reset</button>\n          <button type=\"button\" class=\"more-btn\" id=\"saveDefaultBtn\">Save as default</button>\n        </div>\n\n        <div class=\"result-card\">\n          <div class=\"result-row-item\">\n            <span class=\"result-label label-sm tip\">Gold / action<span class=\"bubble\">gold.base &times; level multiplier &times; party gold multiplier</span></span>\n            <span class=\"result-value\" id=\"headlineGold\">&mdash;</span>\n          </div>\n          <div class=\"result-row-item\">\n            <span class=\"result-label label-sm\">Combat slot boost</span>\n            <span class=\"result-value-sm\" id=\"combatBoostOut\">&mdash;</span>\n          </div>\n          <div class=\"result-row-item\">\n            <span class=\"result-label label-sm\">Utility slot boost</span>\n            <span class=\"result-value-sm\" id=\"utilityBoostOut\">&mdash;</span>\n          </div>\n          <div class=\"result-row-item\" id=\"calibRow\" hidden>\n            <span class=\"result-label label-sm tip\">vs observed<span class=\"bubble\">Difference between this model and the gold/action you actually measured in game. Set it under More inputs &rsaquo; Calibration.</span></span>\n            <span class=\"result-value-sm\" id=\"calibOut\">&mdash;</span>\n          </div>\n        </div>\n\n        <button type=\"button\" class=\"toggle-btn\" id=\"toggleAdvanced\">More inputs</button>\n        <div class=\"advanced-panel\" id=\"advancedPanel\" hidden>\n\n          <div class=\"adv-group\">\n            <h4 class=\"label-sm\">Personal Gold Boost <span style=\"text-transform:none;letter-spacing:0;font-weight:400\">(per member, pre-pool)</span></h4>\n            <div class=\"field-row\">\n              <div class=\"field\"><label for=\"enchantsInput\">Enchants %</label><input type=\"number\" id=\"enchantsInput\" min=\"0\" max=\"100000\" value=\"518\"></div>\n              <div class=\"field\"><label for=\"sculpturesInput\">Sculpture grid %</label><input type=\"number\" id=\"sculpturesInput\" min=\"0\" max=\"100000\" value=\"500\"></div>\n            </div>\n            <div class=\"field-row\" style=\"margin-top:.6rem\">\n              <div class=\"field\"><label for=\"skillTreeInput\">Skill tree %</label><input type=\"number\" id=\"skillTreeInput\" min=\"0\" max=\"100000\" value=\"0\"></div>\n              <div class=\"field\"><label for=\"petGoldModInput\">Pet \"Gold\" mod %</label><input type=\"number\" id=\"petGoldModInput\" min=\"0\" max=\"100000\" value=\"0\"></div>\n            </div>\n            <p class=\"adv-note\">These four plus Village below are the additive <em>Base</em> category on your Character &rsaquo; Boosts &ldquo;Gold Boost&rdquo; card. Two used to be hardcoded at 0 &mdash; if your card reads higher than this model's step&nbsp;1, they are where the difference lives.</p>\n          </div>\n\n          <div class=\"adv-group\">\n            <h4 class=\"label-sm\">Village</h4>\n            <div class=\"field-row\">\n              <div class=\"field\"><label for=\"marketInput\">Market %</label><input type=\"number\" id=\"marketInput\" min=\"0\" max=\"100000\" value=\"320\"></div>\n              <div class=\"field\"><label for=\"villageInput\">Exploration/Potent %</label><input type=\"number\" id=\"villageInput\" min=\"0\" max=\"10000\" value=\"40\"></div>\n            </div>\n            <p class=\"adv-note\">One shared field for Exploration + Potent &mdash; both feed different boosts but cluster near the same value on a normalized profile.</p>\n          </div>\n\n          <div class=\"adv-group\">\n            <h4 class=\"label-sm\">PvP tiles <span style=\"text-transform:none;letter-spacing:0;font-weight:400\">(Village map)</span></h4>\n            <div class=\"field-row\">\n              <div class=\"field\"><label for=\"pvpGoldTileInput\">Gold Tile %</label><input type=\"number\" id=\"pvpGoldTileInput\" min=\"0\" max=\"10000\" value=\"20\"></div>\n              <div class=\"field\"><label for=\"pvpPotionTileInput\">Potion Tile %</label><input type=\"number\" id=\"pvpPotionTileInput\" min=\"0\" max=\"10000\" value=\"4\"></div>\n            </div>\n          </div>\n\n          <div class=\"adv-group\">\n            <h4 class=\"label-sm\">Party<span class=\"info-icon\" tabindex=\"0\">i<span class=\"bubble\">Pooled Base is the SUM of every member's own fully-stacked Gold Boost, not an average. At exactly 5 members the combined total takes a &times;0.8 penalty (1-4 members: no penalty).</span></span></h4>\n            <div class=\"field-row\">\n              <div class=\"field\"><label for=\"partyMembersInput\">Members</label><input type=\"number\" id=\"partyMembersInput\" min=\"1\" max=\"5\" value=\"4\"></div>\n              <div class=\"field\"><label for=\"othersGoldBoostInput\">Others' Gold Boost %</label><input type=\"number\" id=\"othersGoldBoostInput\" min=\"0\" max=\"1000000\" value=\"0\"></div>\n            </div>\n            <label class=\"checkfield\" style=\"margin-top:.55rem\"><input type=\"checkbox\" id=\"othersSameInput\" checked><span>Other members match me</span></label>\n            <p class=\"adv-note\" id=\"partyNote\" hidden></p>\n            <p class=\"adv-note\">Untick to use the &ldquo;Others' Gold Boost %&rdquo; figure for each of the other members (their own Gold Boost card value, averaged). Assuming everyone matches you is the single biggest reason a modelled gold/action drifts from the real one.</p>\n          </div>\n\n          <div class=\"adv-group\">\n            <h4 class=\"label-sm\">Premium &amp; Event</h4>\n            <label class=\"checkfield\"><input type=\"checkbox\" id=\"vipInput\" checked><span>VIP active (+10%)</span></label>\n            <div class=\"field-row\" style=\"margin-top:.6rem\">\n              <div class=\"field\"><label for=\"goldPotionInput\">Gold potion base %</label><input type=\"number\" id=\"goldPotionInput\" min=\"0\" max=\"10000\" value=\"10\"></div>\n              <div class=\"field\"><label for=\"eventInput\">Event %</label><input type=\"number\" id=\"eventInput\" min=\"0\" max=\"100000\" value=\"0\"></div>\n            </div>\n            <p class=\"adv-note\">Premium (VIP + amplified gold potion) applies after party pooling and is personal to you. Event is its own multiplicative category &mdash; zero unless an event is live.</p>\n          </div>\n\n          <div class=\"adv-group\">\n            <h4 class=\"label-sm\">Combat context</h4>\n            <div class=\"field\"><label for=\"monsterLevelInput\">Monster level</label><input type=\"number\" id=\"monsterLevelInput\" min=\"1\" max=\"10000000\" value=\"230000\"></div>\n            <div class=\"field\" style=\"margin-top:.6rem\"><label for=\"characterLevelInput\">Character level</label><input type=\"number\" id=\"characterLevelInput\" min=\"1\" max=\"1000000\" value=\"11500\"></div>\n            <div class=\"field\" style=\"margin-top:.6rem\"><label for=\"actionsPerWeekInput\">Actions / week</label><input type=\"number\" id=\"actionsPerWeekInput\" min=\"1\" max=\"200000\" value=\"6000\"></div>\n          </div>\n\n          <div class=\"adv-group\">\n            <h4 class=\"label-sm\">Pet roll <span style=\"text-transform:none;letter-spacing:0;font-weight:400\">(shared, both pets)</span></h4>\n            <div class=\"field-row-3\">\n              <div class=\"field\"><label for=\"petILevelInput\">iLevel</label><input type=\"number\" id=\"petILevelInput\" min=\"101\" max=\"10000000\" value=\"11000\"></div>\n              <div class=\"field\"><label for=\"petTierInput\">Tier</label><input type=\"number\" id=\"petTierInput\" min=\"1\" max=\"16\" value=\"16\"></div>\n              <div class=\"field\"><label for=\"petRollPercentileInput\">Roll %</label><input type=\"number\" id=\"petRollPercentileInput\" min=\"0\" max=\"100\" value=\"75\"></div>\n            </div>\n            <p class=\"adv-note\">Tier sets the tierMultiplier (T1=1.10&times; up to T16=3.30&times;). Roll percentile picks where in the &plusmn;3% roll band to assume.</p>\n          </div>\n\n          <div class=\"adv-group\">\n            <h4 class=\"label-sm\">Monster gold from elsewhere<span class=\"info-icon\" tabindex=\"0\">i<span class=\"bubble\">monsterGoldFlat / monsterGoldPercentage are MERGED multipliers &mdash; the pet is usually the biggest contributor but rarely the only one. Anything not coming from this pet goes here, where the slot-level sweep correctly leaves it alone.</span></span></h4>\n            <div class=\"field-row\">\n              <div class=\"field\"><label for=\"otherGoldFlatInput\">Added base gold</label><input type=\"number\" id=\"otherGoldFlatInput\" min=\"0\" max=\"1000\" step=\"0.01\" value=\"0\"></div>\n              <div class=\"field\"><label for=\"otherGoldPctInput\">Increased base gold %</label><input type=\"number\" id=\"otherGoldPctInput\" min=\"0\" max=\"100000\" step=\"0.1\" value=\"0\"></div>\n            </div>\n            <p class=\"adv-note\">Non-pet sources only (equipment, relics, implicits &hellip;). Leave at 0 if the pet is your only source. <strong>If the model reads low by a stable amount at every slot level, this is the first place to look</strong> &mdash; the pet slot boost does not scale these, so a missing chunk here shows up as a constant offset rather than a percentage one.</p>\n          </div>\n\n          <div class=\"adv-group\">\n            <h4 class=\"label-sm\">Calibration<span class=\"info-icon\" tabindex=\"0\">i<span class=\"bubble\">Enter the gold/action you actually see in game. The sidebar then shows the gap, and the Formulas panel lists which unexposed term could account for it.</span></span></h4>\n            <div class=\"field\"><label for=\"observedGoldInput\">Observed gold / action (B)</label><input type=\"number\" id=\"observedGoldInput\" min=\"0\" max=\"1000000000\" step=\"0.001\" value=\"0\"></div>\n            <p class=\"adv-note\">0 = off. A stable percentage gap points at a missing multiplier (party members' real boosts, event, skill tree); a stable absolute gap points at the monster level or the flat term.</p>\n          </div>\n\n        </div>\n      </div>\n\n      <nav class=\"quicklinks\">\n        <a href=\"#verdict\">Which to buy next</a>\n        <a href=\"#breakpoint\">Breakpoint comparison</a>\n        <a href=\"#combat-table\">Combat ROI table</a>\n        <a href=\"#utility-table\">Utility ROI table</a>\n        <a href=\"#steps\">Calculation steps</a>\n        <a href=\"#notes\">Formulas &amp; notes</a>\n      </nav>\n    </div>\n  </aside>\n\n  <main class=\"main\">\n\n    <div class=\"verdict\" id=\"verdict\">\n      <div class=\"verdict-head\">\n        <span class=\"verdict-kicker\">Buy next</span>\n        <span class=\"verdict-answer\" id=\"verdictAnswer\">&mdash;</span>\n      </div>\n      <p class=\"verdict-body\" id=\"verdictWhy\">&mdash;</p>\n      <p class=\"verdict-body\" id=\"verdictBreak\">&mdash;</p>\n    </div>\n\n    <h3 class=\"sec\" id=\"breakpoint\">Breakpoint comparison</h3>\n    <p class=\"sec-sub\">Both slots share the <em>identical</em> cost curve <code>floor(500,000 &times; L&sup3;)</code> keyed on their own next level, so the only fair comparison is gold/action gained per gold spent. Whichever number is bigger is the correct next purchase.</p>\n\n    <div class=\"compare\">\n      <div class=\"box\" id=\"combatBox\">\n        <h5>Combat slot <span id=\"combatNextLbl\"></span><span class=\"tag win\" id=\"combatWinTag\" hidden>better</span></h5>\n        <div class=\"big\" id=\"combatComparBig\">&mdash;</div>\n        <div class=\"unit\">gold/action gained per 1B spent</div>\n        <dl>\n          <dt>Level cost</dt><dd id=\"combatStepCost\">&mdash;</dd>\n          <dt>Gold/action gained</dt><dd id=\"combatStepGain\">&mdash;</dd>\n          <dt>Pays back in</dt><dd id=\"combatStepBack\">&mdash;</dd>\n        </dl>\n        <p>Multiplies the dominant <code>gold.base</code> term directly.</p>\n      </div>\n      <div class=\"box\" id=\"utilityBox\">\n        <h5>Utility slot <span id=\"utilNextLbl\"></span><span class=\"tag win\" id=\"utilWinTag\" hidden>better</span></h5>\n        <div class=\"big\" id=\"utilComparBig\">&mdash;</div>\n        <div class=\"unit\">gold/action gained per 1B spent</div>\n        <dl>\n          <dt>Level cost</dt><dd id=\"utilStepCost\">&mdash;</dd>\n          <dt>Gold/action gained</dt><dd id=\"utilStepGain\">&mdash;</dd>\n          <dt>Pays back in</dt><dd id=\"utilStepBack\">&mdash;</dd>\n        </dl>\n        <p>Boosts one nested additive term three layers deep &mdash; much weaker leverage.</p>\n      </div>\n    </div>\n\n    <div class=\"plan\">\n      <h5>Where the two slots break even</h5>\n      <div class=\"tbl-wrap short\"><table class=\"roi\" id=\"crossTable\">\n        <thead>\n          <tr><th>If combat slot is</th><th>Utility is worth buying up to</th><th>Utility boost there</th><th>Cost of that utility level</th><th>Cost of the combat level</th></tr>\n        </thead>\n        <tbody id=\"crossTbody\"></tbody>\n      </table></div>\n      <p class=\"plan-note\" style=\"margin-top:.6rem\">Read a row as: <strong>at that combat slot level, every utility level up to the second column returns more gold per gold spent than the next combat level does</strong> &mdash; past it, combat wins and stays winning. The utility column climbs in steps because a pet slot's rate steps up every 30 levels, so a utility level just past a 30-boundary can briefly out-earn combat again.</p>\n    </div>\n\n    <div class=\"plan\">\n      <h5>Next 24 purchases, buying the better slot each time</h5>\n      <div class=\"plan-strip\" id=\"planStrip\"></div>\n      <div class=\"plan-legend\">\n        <span><i class=\"sw\" style=\"background:var(--orange-soft);border:none\"></i> combat</span>\n        <span><i class=\"sw\" style=\"background:var(--blue-soft);border:none\"></i> utility</span>\n        <span><i class=\"sw\" style=\"background:var(--surface);border-color:var(--success)\"></i> the flip</span>\n      </div>\n      <p class=\"plan-note\" id=\"planNote\">&mdash;</p>\n    </div>\n\n    <h3 class=\"sec\" id=\"combat-table\">Combat pet slot ROI</h3>\n    <p class=\"sec-sub\">Utility pet held at your current input. Cumulative measured from your current combat slot level.</p>\n    <div class=\"tbl-wrap\"><table class=\"roi\" id=\"combatTable\">\n      <thead>\n        <tr class=\"grp\"><th colspan=\"4\"></th><th colspan=\"2\">this level alone</th><th colspan=\"3\" class=\"sep\">cumulative from current</th></tr>\n        <tr><th>Slot</th><th>Boost</th><th>Gold / action</th><th>Level cost</th><th>Payback (actions)</th><th>Weeks</th><th class=\"sep\">Total cost</th><th>Payback (actions)</th><th>Weeks</th></tr>\n      </thead>\n      <tbody id=\"combatTbody\"></tbody>\n    </table></div>\n    <div class=\"tblfoot\">\n      <span class=\"rowcount\" id=\"combatRowCount\"></span>\n      <button type=\"button\" class=\"more-btn\" id=\"combatMoreBtn\">+60 levels</button>\n      <button type=\"button\" class=\"more-btn\" id=\"combatMore500Btn\">+500</button>\n      <span class=\"jump\"><input type=\"number\" id=\"combatJumpInput\" min=\"0\" max=\"5000\" placeholder=\"to level\"><button type=\"button\" class=\"more-btn\" id=\"combatJumpBtn\">Go</button></span>\n    </div>\n\n    <h3 class=\"sec\" id=\"utility-table\">Utility pet slot ROI</h3>\n    <p class=\"sec-sub\">Combat pet held at your current input. Only Potion Effect% changes with this pet's slot &mdash; same cost curve, much weaker leverage on gold/action.</p>\n    <div class=\"tbl-wrap\"><table class=\"roi\" id=\"utilityTable\">\n      <thead>\n        <tr class=\"grp\"><th colspan=\"4\"></th><th colspan=\"2\">this level alone</th><th colspan=\"3\" class=\"sep\">cumulative from current</th></tr>\n        <tr><th>Slot</th><th>Boost</th><th>Gold / action</th><th>Level cost</th><th>Payback (actions)</th><th>Weeks</th><th class=\"sep\">Total cost</th><th>Payback (actions)</th><th>Weeks</th></tr>\n      </thead>\n      <tbody id=\"utilityTbody\"></tbody>\n    </table></div>\n    <div class=\"tblfoot\">\n      <span class=\"rowcount\" id=\"utilityRowCount\"></span>\n      <button type=\"button\" class=\"more-btn\" id=\"utilityMoreBtn\">+60 levels</button>\n      <button type=\"button\" class=\"more-btn\" id=\"utilityMore500Btn\">+500</button>\n      <span class=\"jump\"><input type=\"number\" id=\"utilityJumpInput\" min=\"0\" max=\"5000\" placeholder=\"to level\"><button type=\"button\" class=\"more-btn\" id=\"utilityJumpBtn\">Go</button></span>\n    </div>\n\n    <div class=\"legend\" style=\"margin-bottom:2rem\">\n      <span><i class=\"sw\" style=\"background:var(--current)\"></i> your current slot level</span>\n      <span><i class=\"sw\" style=\"background:var(--band)\"></i> this level pays back in 2&ndash;4 weeks</span>\n      <span><i class=\"sw\" style=\"background:var(--surface);border-color:var(--success)\"></i> <span style=\"color:var(--success)\">green</span> = block boundary (31/61/91) &mdash; rate steps up, cost barely moves</span>\n    </div>\n\n    <details class=\"panel\" id=\"steps\">\n      <summary>Calculation steps <span class=\"sub\">&mdash; how gold/action was derived, in order</span></summary>\n      <div class=\"panel-body\">\n        <div class=\"calc-ledger\" id=\"ledger\"></div>\n      </div>\n    </details>\n\n    <details class=\"panel\" id=\"notes\">\n      <summary>Formulas &amp; notes <span class=\"sub\">&mdash; assumptions, fixed values, sources</span></summary>\n      <div class=\"panel-body\">\n        <h4>Where a gap between this model and your real gold/action comes from</h4>\n        <ul>\n          <li><strong>Party members' own boosts.</strong> Pooled Base is the <em>sum</em> of every member's fully-stacked Gold Boost. If they are not clones of you, tick off &ldquo;Other members match me&rdquo; and enter their real average. This is usually the largest single source of drift.</li>\n          <li><strong>Party size.</strong> At exactly 5 members the combined total is multiplied by 0.8; 1&ndash;4 members take no penalty. Set Members correctly.</li>\n          <li><strong>Categories that used to be pinned at 0</strong> and are now editable: Skill-tree Gold, the pets' own separate &ldquo;Gold&rdquo; modifier, Event, and the gold potion's base value.</li>\n          <li><strong>Monster gold from non-pet sources.</strong> <code>monsterGoldFlat</code> and <code>monsterGoldPercentage</code> are merged multipliers; this page derives the pet's share from your roll inputs and assumes nothing else contributes. If something does, enter it under &ldquo;Monster gold from elsewhere&rdquo;. A gap that stays the same size at every slot level points here.</li>\n          <li><strong>Monster level</strong> multiplies <code>gold.base</code> linearly, so a stale monster level moves the answer proportionally, not by a fixed amount.</li>\n          <li>Use the Calibration field to make the gap explicit. A stable <em>percentage</em> gap is a missing multiplier; a stable <em>absolute</em> gap points at the base terms.</li>\n        </ul>\n        <h4>Assumptions</h4>\n        <ul>\n          <li><strong>Level costs are cumulative to reach a level, individual to buy one.</strong> Each level has its own price &mdash; <code>floor(500,000 &times; L&sup3;)</code> for the level you're buying into. The ROI tables' \"cumulative\" columns sum every level's price from your current slot up to that row.</li>\n          <li><strong>Use the per-level column to decide where to stop.</strong> It's the correct marginal-decision rule &mdash; keep buying while the level in front of you clears your bar. Cumulative is the budgeting view: \"what's the total damage to reach level N from here.\"</li>\n          <li>Both pet slot upgrades share the identical cost formula (confirmed: the same client component drives all three pet types &mdash; combat/utility/gathering), and the identical 30-level accelerating boost curve.</li>\n          <li>Pet iLevel/tier/roll-percentile are shared by both pets (one roll-strength profile, two independent slot levels).</li>\n          <li>Village tax ignored per instruction; all figures are pre-tax.</li>\n          <li>Every field is remembered in this browser only. \"Save as default\" stores your current numbers as the new baseline; \"Reset\" restores whatever you last saved (or this normalized profile, if you haven't saved one yet).</li>\n        </ul>\n        <h4>Generated from the core, not retyped here</h4>\n        <ul id=\"provenanceList\"></ul>\n        <h4>Why the utility pet is so much weaker</h4>\n        <ul>\n          <li>The combat pet's slot level multiplies <strong>monsterGoldFlat / monsterGoldPercentage directly</strong> &mdash; the dominant term in <code>gold.base</code>, which then gets multiplied again by the party multiplier. Every point of combat slot boost compounds through the whole chain.</li>\n          <li>The utility pet's slot level only boosts its own <strong>raw Potion Effect roll</strong> &mdash; one additive term inside Potion Effect's Base, which then feeds a small Premium sub-term (Gold Potion) dwarfed by the pooled party Base it multiplies against. The signal is diluted at every layer before it reaches gold/action.</li>\n        </ul>\n      </div>\n    </details>\n\n  </main>\n</div>\n\n<button type=\"button\" id=\"backToTop\" aria-label=\"Back to top\">&uarr;</button>\n\n<script>\n/* GENERATED from data/ by userscripts/build.mjs — do not edit. */\nwindow.APOZ_FACTS = (function () {\n  /* formulas/pets.json :: pets.slotUpgrade.costFormula  [CODE] */\n  function petSlotUpgradeCost(currentLevel, newLevel) { let total = 0; for (let r = currentLevel + 1; r <= newLevel; r++) total += Math.floor(500000 * r**3); return { currency: 'gold', value: total }; } // per-level marginal cost at level L->L+1 is floor(500000*(L+1)^3)\n  /* formulas/equipment.json :: equipment.slotUpgrade.boostFormula  [CODE] */\n  function slotBoostPercent(slotLevel) { let block = Math.floor(slotLevel / 30); let intoBlock = slotLevel % 30; return 0.3*block*(block+1)/2 + intoBlock*0.01*(block+1); }\n  /* formulas/party.json :: party.fifthMemberPenalty.formula  [CODE] */\n  function partySizeMultiplier(memberCount) { return memberCount === 5 ? 0.8 : 1; }\n  /* formulas/economy.json :: gold.levelMultiplier  [LIVE] */\n  function goldLevelMultiplier(characterLevel) { return 1 + 0.0001 * characterLevel; }\n  /* tables/modifier-tiers.json :: tiers.pet.boostPercent  [CODE] */\n  const petTierBoostPercent = [10,20,30,40,50,60,70,80,90,100,125,150,170,190,210,230];\n  return { petSlotUpgradeCost, slotBoostPercent, partySizeMultiplier, goldLevelMultiplier, petTierBoostPercent };\n})();\n</script>\n<script>\n(function(){\n  \"use strict\";\n\n  var STORAGE_KEY = 'petSlotROI.inputs.v3';\n  var DEFAULTS_KEY = 'petSlotROI.defaults.v2';\n  var LEGACY_STORAGE_KEY = 'petSlotROI.inputs.v2';\n  var LEGACY_DEFAULTS_KEY = 'petSlotROI.defaults.v1';\n\n  var ORIGINAL_DEFAULTS = {\n    combat: 50, utility: 30,\n    enchants: 518, sculptures: 500, skillTree: 0, petGoldMod: 0,\n    market: 320, village: 40,\n    pvpGoldTile: 20, pvpPotionTile: 4,\n    partyMembers: 4, othersGoldBoost: 0,\n    goldPotion: 10, event: 0,\n    monsterLevel: 230000, characterLevel: 11500, actionsPerWeek: 6000,\n    petILevel: 11000, petTier: 16, petRollPercentile: 75,\n    otherGoldFlat: 0, otherGoldPct: 0,\n    observedGold: 0\n  };\n  var DEFAULTS = Object.assign({}, ORIGINAL_DEFAULTS);\n  var VIP_DEFAULT_CHECKED = true;\n  var OTHERS_SAME_DEFAULT_CHECKED = true;\n\n  var FIELD_IDS = {\n    combat: 'combatInput', utility: 'utilityInput',\n    enchants: 'enchantsInput', sculptures: 'sculpturesInput',\n    skillTree: 'skillTreeInput', petGoldMod: 'petGoldModInput',\n    market: 'marketInput', village: 'villageInput',\n    pvpGoldTile: 'pvpGoldTileInput', pvpPotionTile: 'pvpPotionTileInput',\n    partyMembers: 'partyMembersInput', othersGoldBoost: 'othersGoldBoostInput',\n    goldPotion: 'goldPotionInput', event: 'eventInput',\n    monsterLevel: 'monsterLevelInput', characterLevel: 'characterLevelInput', actionsPerWeek: 'actionsPerWeekInput',\n    petILevel: 'petILevelInput', petTier: 'petTierInput', petRollPercentile: 'petRollPercentileInput',\n    otherGoldFlat: 'otherGoldFlatInput', otherGoldPct: 'otherGoldPctInput',\n    observedGold: 'observedGoldInput'\n  };\n  var CHECK_IDS = { vip: 'vipInput', othersSame: 'othersSameInput' };\n  var CHECK_DEFAULTS = { vip: VIP_DEFAULT_CHECKED, othersSame: OTHERS_SAME_DEFAULT_CHECKED };\n\n  var VIP_PCT_WHEN_ON = 0.10;\n\n  // ---- the core facts, all generated into window.APOZ_FACTS by the build ----\n  //\n  // slotBoostPercent is emitted from equipment.slotUpgrade.boostFormula, which\n  // pets.slotBoostFormula states is the identical function for pet slots.\n  // Despite the name it returns a FRACTION (0.3*block..., 0.01*intoBlock...),\n  // so *100 happens here at the one call site and nowhere else.\n  // *100 + round: the emitted fraction is 0.3*block*(block+1)/2 + intoBlock*0.01*(block+1),\n  // whose percent form is always a whole number - so rounding is exact and it is\n  // the only thing standing between the UI and \"+70.00000000000001%\".\n  function slotBoostPct(L){ return Math.round(APOZ_FACTS.slotBoostPercent(L) * 100); }\n  // cost of buying INTO level L (i.e. L-1 -> L)\n  function stepCost(L){ return APOZ_FACTS.petSlotUpgradeCost(L - 1, L).value; }\n\n  function petTierMultiplier(tier){\n    var t = APOZ_FACTS.petTierBoostPercent;\n    tier = Math.max(1, Math.min(t.length, Math.round(tier)));\n    return 1 + t[tier-1]/100;\n  }\n  function petVariance(percentile){\n    var pct = Math.max(0, Math.min(100, percentile))/100;\n    return 0.97 + pct*(1.03-0.97);\n  }\n  // pre-slot-boost raw rolls - depend on the live pet-roll inputs (iLevel/tier/percentile)\n  function petRawRolls(p){\n    var iL = Math.max(p.petILevel, 101);\n    var tm = petTierMultiplier(p.petTier);\n    var v = petVariance(p.petRollPercentile);\n    var base = Math.pow(iL-100, 0.49);\n    return {\n      iL: iL, tm: tm, v: v,\n      rawFlat: Math.log(base+1) * 0.1 * v * tm,\n      rawPct: base * 0.005 * v * tm,\n      rawPotionEffect: base * 0.0025 * v * tm\n    };\n  }\n\n  // ---- formatting ----\n  function fmt(n){\n    if (!isFinite(n)) return '—';\n    var u=[['Qa',1e15],['T',1e12],['B',1e9],['M',1e6],['K',1e3]];\n    for(var k=0;k<u.length;k++){ if (Math.abs(n)>=u[k][1]) return (n/u[k][1]).toFixed(2)+u[k][0]; }\n    return n.toFixed(0);\n  }\n  function fmtInt(n){ return isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—'; }\n  function P(x){ return (x*100).toFixed(2)+'%'; }\n  function weeks(w){ return !isFinite(w) ? '—' : w < 1 ? (w*7).toFixed(1)+' d' : w.toFixed(1)+' wk'; }\n\n  function clampLevel(v){\n    v = parseInt(v, 10);\n    if (isNaN(v) || v < 0) v = 0;\n    if (v > 5000) v = 5000;\n    return v;\n  }\n  function num(v, fallback){\n    v = parseFloat(v);\n    return isNaN(v) ? fallback : v;\n  }\n\n  // ---- profile ----\n  //\n  // buildProfile() is pure: raw percentages and levels in, a normalized profile\n  // out. readInputs() is the only part that touches the DOM. Splitting them is\n  // what lets tests/userscript-roi-math.mjs exercise the actual shipped\n  // arithmetic instead of a re-typed copy of it.\n  function buildProfile(raw){\n    raw = Object.assign({}, ORIGINAL_DEFAULTS, { vipChecked: true, othersSame: true }, raw);\n    raw.combat = clampLevel(raw.combat);\n    raw.utility = clampLevel(raw.utility);\n    if (raw.actionsPerWeek <= 0) raw.actionsPerWeek = 1;\n    if (raw.petILevel < 101) raw.petILevel = 101;\n    raw.partyMembers = Math.max(1, Math.min(5, Math.round(raw.partyMembers)));\n\n    var p = {\n      combat: raw.combat, utility: raw.utility,\n      partyMembers: raw.partyMembers,\n      othersSameAsMe: !!raw.othersSame,\n      othersGoldBoost: raw.othersGoldBoost/100,\n      vip: raw.vipChecked ? VIP_PCT_WHEN_ON : 0,\n      goldPotionBase: raw.goldPotion/100,\n      event: raw.event/100,\n      enchants: raw.enchants/100, sculptures: raw.sculptures/100,\n      skillTree: raw.skillTree/100, petGoldMod: raw.petGoldMod/100,\n      market: raw.market/100, pvpGoldTile: raw.pvpGoldTile/100,\n      village: raw.village/100, pvpPotionTile: raw.pvpPotionTile/100,\n      monsterLevel: raw.monsterLevel, characterLevel: raw.characterLevel,\n      actionsPerWeek: raw.actionsPerWeek,\n      petILevel: raw.petILevel, petTier: raw.petTier, petRollPercentile: raw.petRollPercentile,\n      otherGoldFlat: raw.otherGoldFlat, otherGoldPct: raw.otherGoldPct/100,\n      observedGold: raw.observedGold > 0 ? raw.observedGold * 1e9 : null\n    };\n    p.rolls = petRawRolls(p);\n    p.pooled = pooledBase(p);\n    p.levelMult = APOZ_FACTS.goldLevelMultiplier(p.characterLevel);\n    return p;\n  }\n\n  function readInputs(){\n    var raw = {}, key;\n    for (key in FIELD_IDS){\n      raw[key] = num(document.getElementById(FIELD_IDS[key]).value, DEFAULTS[key]);\n    }\n    raw.vipChecked = document.getElementById(CHECK_IDS.vip).checked;\n    raw.othersSame = document.getElementById(CHECK_IDS.othersSame).checked;\n    return buildProfile(raw);\n  }\n\n  // ---- formula chain, parameterized on the live profile `p` ----\n  function personalGoldTotal(p){\n    var base = p.enchants + p.market + p.village + p.sculptures + p.skillTree + p.petGoldMod;\n    return (1+base)*(1+p.pvpGoldTile) - 1;\n  }\n  // party.gold.rewardBoostFormula: PooledBase is the SUM across members of each\n  // member's OWN fully-stacked personal gold total - not an average, and not\n  // your own value scaled. party.fifthMemberPenalty.formula then applies x0.8\n  // at exactly 5 members.\n  function pooledBase(p){\n    var mine = personalGoldTotal(p);\n    var others = (p.partyMembers - 1) * (p.othersSameAsMe ? mine : p.othersGoldBoost);\n    return (mine + others) * APOZ_FACTS.partySizeMultiplier(p.partyMembers);\n  }\n\n  // The hot path. A crossover scan evaluates gold/action ~1,600 times per\n  // combat level examined, so this allocates nothing and reads `p.pooled` /\n  // `p.levelMult`, both computed once per render in readInputs().\n  function partyMultAt(p, U){\n    var pe = p.rolls.rawPotionEffect * (1 + slotBoostPct(U)/100);\n    var potionEffectTotal = (1 + pe + 2*p.village)*(1+p.pvpPotionTile) - 1;\n    var premium = p.vip + p.goldPotionBase*(1+potionEffectTotal);\n    return (1+p.pooled)*(1+premium)*(1+p.event);\n  }\n\n  // Same arithmetic, itemised - for the calculation-steps ledger only.\n  function potionMix(p, U){\n    var petPotionEffect = p.rolls.rawPotionEffect * (1 + slotBoostPct(U)/100);\n    var potionEffectBase = petPotionEffect + p.village + p.village; // Potent + Explorations\n    var potionEffectTotal = (1+potionEffectBase)*(1+p.pvpPotionTile) - 1;\n    var goldPotionBonus = p.goldPotionBase*(1+potionEffectTotal);\n    return { petPotionEffect: petPotionEffect, potionEffectBase: potionEffectBase,\n             potionEffectTotal: potionEffectTotal, goldPotionBonus: goldPotionBonus,\n             premium: p.vip + goldPotionBonus, mult: partyMultAt(p, U) };\n  }\n\n  // gold.base = (3 + monsterGoldFlat) * (1 + monsterGoldPercentage) * monsterLevel,\n  // where both are MERGED multipliers. The pet's own contribution is the part\n  // the slot level boosts; everything else is added outside the boost, which is\n  // what keeps the slot-level sweep honest.\n  function goldBaseAt(p, C){\n    var boost = 1 + slotBoostPct(C)/100;\n    return (3 + p.rolls.rawFlat*boost + p.otherGoldFlat)\n         * (1 + p.rolls.rawPct*boost + p.otherGoldPct)\n         * p.monsterLevel;\n  }\n  function goldPerAction(p, C, U){ return goldBaseAt(p, C) * p.levelMult * partyMultAt(p, U); }\n\n  // ---- marginal economics: the one comparison that is actually fair ----\n  //\n  // Both slots share the identical cost curve keyed on their OWN next level, so\n  // the decision rule is gold/action gained per gold spent. Neither \"boost %\"\n  // nor \"payback weeks at a fixed level\" is comparable across the two channels\n  // when the two current levels differ - which is exactly the case that matters.\n  function marginal(p, C, U, channel){\n    var next = (channel === 'combat' ? C : U) + 1;\n    var cost = stepCost(next);\n    var gain = channel === 'combat'\n      ? goldPerAction(p, C+1, U) - goldPerAction(p, C, U)\n      : goldPerAction(p, C, U+1) - goldPerAction(p, C, U);\n    return { level: next, cost: cost, gain: gain, eff: cost > 0 ? gain/cost : Infinity,\n             paybackActions: gain > 0 ? cost/gain : Infinity };\n  }\n\n  // Largest utility level at which utility still beats combat, for a fixed\n  // combat level. NOT solved by early-exit search: a pet slot's per-level rate\n  // steps up every 30 levels, so utility efficiency JUMPS at 30/60/90 and the\n  // winning set is not contiguous. Scanning the whole range is O(cap) cheap\n  // arithmetic and is the only way to get this right.\n  var CROSS_SCAN_CAP = 400;\n  function crossoverUtility(p, C, cap){\n    cap = cap || CROSS_SCAN_CAP;\n    if (!p._cross) p._cross = {};\n    if (p._cross[C] !== undefined) return p._cross[C];\n    var best = -1;\n    for (var U = 0; U <= cap; U++){\n      if (marginal(p, C, U, 'utility').eff >= marginal(p, C, U, 'combat').eff) best = U;\n    }\n    p._cross[C] = best;\n    return best;\n  }\n\n  // Greedy forward simulation from the real current state: always buy whichever\n  // slot returns more gold/action per gold right now. Reports the flip.\n  function greedyPlan(p, steps){\n    var C = p.combat, U = p.utility, seq = [], total = 0, flipAt = -1, prev = null;\n    for (var i = 0; i < steps; i++){\n      var mc = marginal(p, C, U, 'combat');\n      var mu = marginal(p, C, U, 'utility');\n      var pick = mu.eff > mc.eff ? 'utility' : 'combat';\n      var m = pick === 'combat' ? mc : mu;\n      if (prev !== null && pick !== prev && flipAt < 0) flipAt = i;\n      prev = pick;\n      total += m.cost;\n      seq.push({ channel: pick, level: m.level, cost: m.cost });\n      if (pick === 'combat') C++; else U++;\n    }\n    return { seq: seq, total: total, flipAt: flipAt, endC: C, endU: U };\n  }\n\n  // ---- condensed calc-steps ledger ----\n  function tip(label, techName){\n    return '<span class=\"tip\">' + label + '<span class=\"bubble\">' + techName + '</span></span>';\n  }\n  function buildLedger(p){\n    var C = p.combat, U = p.utility;\n    var mix = potionMix(p, U);\n    var gb = goldBaseAt(p, C);\n    var lm = p.levelMult;\n    var gpa = gb * lm * mix.mult;\n    var incomeGoldBaseSum = p.enchants + p.market + p.village + p.sculptures + p.skillTree + p.petGoldMod;\n    var penalty = APOZ_FACTS.partySizeMultiplier(p.partyMembers);\n\n    document.getElementById('headlineGold').textContent = fmt(gpa) + ' gold';\n    document.getElementById('combatBoostOut').textContent = '+' + slotBoostPct(C) + '%';\n    document.getElementById('utilityBoostOut').textContent = '+' + slotBoostPct(U) + '%';\n\n    // 5 x 0.8 = 4, exactly. A 5th member who matches you is worth precisely\n    // nothing to pooled gold - which is not obvious from either the penalty or\n    // the pooling rule on its own, so the page says it rather than leaving the\n    // number to be noticed.\n    var partyNote = document.getElementById('partyNote');\n    if (p.partyMembers === 5){\n      var four = (4 * (p.othersSameAsMe ? personalGoldTotal(p) : (personalGoldTotal(p) + 3*p.othersGoldBoost)/4));\n      var fifthWorth = pooledBase(p) - (p.othersSameAsMe ? 4*personalGoldTotal(p) : personalGoldTotal(p) + 3*p.othersGoldBoost);\n      partyNote.innerHTML = fifthWorth > 1e-9\n        ? '5th member adds <strong>+' + P(fifthWorth) + '</strong> to Pooled Base after the &times;0.8 penalty.'\n        : (Math.abs(fifthWorth) < 1e-9\n            ? '<strong>The 5th member is exactly break-even for gold</strong> &mdash; 5 &times; 0.8 = 4, so a member who matches you adds nothing here. They only pay for themselves if their own Gold Boost beats a quarter of the other four’s total. (Battle stats are a separate question.)'\n            : '5th member <strong>costs</strong> you ' + P(-fifthWorth) + ' of Pooled Base &mdash; the &times;0.8 penalty outweighs what they bring.');\n      partyNote.hidden = false;\n      void four;\n    } else {\n      partyNote.hidden = true;\n    }\n\n    var calibRow = document.getElementById('calibRow');\n    if (p.observedGold){\n      var d = gpa - p.observedGold;\n      var el = document.getElementById('calibOut');\n      el.textContent = (d >= 0 ? '+' : '−') + fmt(Math.abs(d)) + '  (' + (d/p.observedGold*100).toFixed(1) + '%)';\n      el.className = 'result-value-sm ' + (Math.abs(d/p.observedGold) < 0.01 ? 'ok' : 'off');\n      calibRow.hidden = false;\n    } else {\n      calibRow.hidden = true;\n    }\n\n    document.getElementById('ledger').innerHTML =\n      '<div class=\"calc-step\"><span class=\"calc-step-n\">1</span>' +\n        '<span class=\"step-label\">' + tip('Personal Gold Boost', 'mirrors: Character &rsaquo; Boosts &rsaquo; &quot;Gold Boost&quot; &middot; per member, pre-pool') + '</span>' +\n        '<span class=\"step-expr\">(1+' + P(incomeGoldBaseSum) + ')&times;(1+' + P(p.pvpGoldTile) + ' PvP)&minus;1</span>' +\n        '<span class=\"step-val\">' + P(personalGoldTotal(p)) + '</span></div>' +\n      '<div class=\"calc-step\"><span class=\"calc-step-n\">2</span>' +\n        '<span class=\"step-label\">' + tip('Party Pooling', 'mirrors: Party &rsaquo; Overview &rsaquo; &quot;Combined Party&quot; &middot; sum of each member’s own total') + '</span>' +\n        '<span class=\"step-expr\">' + (p.othersSameAsMe\n            ? P(personalGoldTotal(p)) + '&times;' + p.partyMembers\n            : 'me ' + P(personalGoldTotal(p)) + ' + ' + (p.partyMembers-1) + '&times;' + P(p.othersGoldBoost)) +\n          (penalty !== 1 ? ' &times;' + penalty + ' (5-member penalty)' : '') + '</span>' +\n        '<span class=\"step-val\">' + P(pooledBase(p)) + '</span></div>' +\n      '<div class=\"calc-step\"><span class=\"calc-step-n\">3</span>' +\n        '<span class=\"step-label\">' + tip('Potion Effect', 'mirrors: &quot;Potion Effect&quot; card &middot; Utility pet, slot ' + U) + '</span>' +\n        '<span class=\"step-expr\">rawPotionEffect&times;boost + village&times;2, &times;(1+pvpPotionTile)</span>' +\n        '<span class=\"step-val\">' + P(mix.potionEffectTotal) + '</span></div>' +\n      '<div class=\"calc-step\"><span class=\"calc-step-n\">4</span>' +\n        '<span class=\"step-label\">' + tip('Gold Potion &rarr; Premium', 'goldPotionBase &times; (1+potionEffectTotal), feeds Premium with VIP') + '</span>' +\n        '<span class=\"step-expr\">' + p.goldPotionBase.toFixed(2) + '&times;(1+' + P(mix.potionEffectTotal) + ') + VIP ' + P(p.vip) + '</span>' +\n        '<span class=\"step-val\">' + P(mix.premium) + '</span></div>' +\n      '<div class=\"calc-step\"><span class=\"calc-step-n\">5</span>' +\n        '<span class=\"step-label\">' + tip('Party Gold Multiplier', 'party.gold.rewardBoostFormula &middot; (1+Pooled)(1+Premium)(1+Event)') + '</span>' +\n        '<span class=\"step-expr\">(1+' + P(pooledBase(p)) + ')&times;(1+' + P(mix.premium) + ')&times;(1+' + P(p.event) + ')</span>' +\n        '<span class=\"step-val\">&times;' + mix.mult.toFixed(2) + '</span></div>' +\n      '<div class=\"calc-step\"><span class=\"calc-step-n\">6</span>' +\n        '<span class=\"step-label\">' + tip('Monster Gold Base', 'mirrors: kill reward &rsaquo; gold formula-viewer &middot; Combat pet, slot ' + C) + '</span>' +\n        '<span class=\"step-expr\">(3+rawFlat&times;boost' + (p.otherGoldFlat ? '+' + p.otherGoldFlat.toFixed(2) : '') +\n          ')&times;(1+rawPct&times;boost' + (p.otherGoldPct ? '+' + P(p.otherGoldPct) : '') +\n          ')&times;' + fmtInt(p.monsterLevel) + '</span>' +\n        '<span class=\"step-val\">' + fmt(gb) + '</span></div>' +\n      '<div class=\"calc-step final\"><span class=\"calc-step-n\">7</span>' +\n        '<span class=\"step-label\">' + tip('Gold / Party Action', 'gold.base &times; level mult (1+0.0001&times;characterLevel) &times; party mult') + '</span>' +\n        '<span class=\"step-expr\">' + fmt(gb) + '&times;' + lm.toFixed(2) + '&times;' + mix.mult.toFixed(2) + '</span>' +\n        '<span class=\"step-val\">' + fmt(gpa) + '</span></div>';\n  }\n\n  // ---- breakpoint comparison ----\n  function buildBreakpoint(p){\n    var mc = marginal(p, p.combat, p.utility, 'combat');\n    var mu = marginal(p, p.combat, p.utility, 'utility');\n    var combatWins = mc.eff >= mu.eff;\n\n    function fill(prefix, m, box, tag){\n      document.getElementById(prefix + 'ComparBig').textContent = (m.eff * 1e9).toFixed(m.eff*1e9 < 10 ? 2 : 0);\n      document.getElementById(prefix + 'StepCost').textContent = fmt(m.cost);\n      document.getElementById(prefix + 'StepGain').textContent = fmt(m.gain);\n      document.getElementById(prefix + 'StepBack').textContent =\n        weeks(m.paybackActions / p.actionsPerWeek) + ' (' + fmtInt(m.paybackActions) + ' actions)';\n      document.getElementById(box).classList.toggle('win', (prefix === 'combat') === combatWins);\n      document.getElementById(tag).hidden = (prefix === 'combat') !== combatWins;\n    }\n    document.getElementById('combatNextLbl').textContent = '→ ' + mc.level;\n    document.getElementById('utilNextLbl').textContent = '→ ' + mu.level;\n    fill('combat', mc, 'combatBox', 'combatWinTag');\n    fill('util', mu, 'utilityBox', 'utilWinTag');\n\n    // verdict\n    var ratio = combatWins\n      ? (mu.eff > 0 ? mc.eff/mu.eff : Infinity)\n      : (mc.eff > 0 ? mu.eff/mc.eff : Infinity);\n    var ans = document.getElementById('verdictAnswer');\n    ans.textContent = combatWins ? 'COMBAT → ' + mc.level : 'UTILITY → ' + mu.level;\n    ans.classList.toggle('util', !combatWins);\n    document.getElementById('verdictWhy').innerHTML =\n      'At combat <strong>' + p.combat + '</strong> / utility <strong>' + p.utility + '</strong>, the next <strong>' +\n      (combatWins ? 'combat' : 'utility') + '</strong> level returns <strong>' +\n      (isFinite(ratio) ? ratio.toFixed(1) + '×' : '∞') +\n      '</strong> more gold/action per gold spent than the other slot. It costs ' + fmt((combatWins?mc:mu).cost) +\n      ' and pays itself back in ' + weeks((combatWins?mc:mu).paybackActions / p.actionsPerWeek) + '.';\n\n    var bp = crossoverUtility(p, p.combat);\n    document.getElementById('verdictBreak').innerHTML = bp < 0\n      ? 'The break-even point is already behind you: with combat at <strong>' + p.combat +\n        '</strong>, no utility level beats the next combat level — combat is the buy until it gets much more expensive.'\n      : 'Break-even: with combat at <strong>' + p.combat + '</strong>, utility levels are worth buying up to <strong>' +\n        bp + '</strong>' + (p.utility <= bp\n          ? ' — you are at ' + p.utility + ', so utility still has ' + (bp - p.utility) + ' worthwhile level' + (bp-p.utility===1?'':'s') + ' in it.'\n          : ' — you are already past it at ' + p.utility + '.');\n\n    // equivalence table\n    var ladder = [0,30,60,90,120,150,180,210,240];\n    if (ladder.indexOf(p.combat) < 0) ladder.push(p.combat);\n    ladder.sort(function(a,b){ return a-b; });\n    var rows = '';\n    for (var i = 0; i < ladder.length; i++){\n      var C = ladder[i];\n      var u = crossoverUtility(p, C);\n      var isCur = C === p.combat;\n      rows += '<tr class=\"' + (isCur ? 'current' : '') + '\">' +\n        '<td class=\"lvl\">' + C + (isCur ? ' <span class=\"tag\">you</span>' : '') + '</td>' +\n        '<td>' + (u < 0 ? 'none — combat always wins' : u) + '</td>' +\n        '<td>' + (u < 0 ? '—' : '+' + slotBoostPct(u) + '%') + '</td>' +\n        '<td>' + (u < 1 ? '—' : fmt(stepCost(u))) + '</td>' +\n        '<td>' + fmt(stepCost(C+1)) + '</td>' +\n        '</tr>';\n    }\n    document.getElementById('crossTbody').innerHTML = rows;\n\n    // greedy plan\n    var PLAN_STEPS = 24;\n    var plan = greedyPlan(p, PLAN_STEPS);\n    var strip = '';\n    for (var j = 0; j < plan.seq.length; j++){\n      var s = plan.seq[j];\n      strip += '<div class=\"plan-cell ' + (s.channel === 'combat' ? 'c' : 'u') +\n        (j === plan.flipAt ? ' flip' : '') + '\" title=\"#' + (j+1) + ' — ' + s.channel +\n        ' slot level ' + s.level + ', ' + fmt(s.cost) + ' gold\">' + s.level + '</div>';\n    }\n    document.getElementById('planStrip').innerHTML = strip;\n    var nC = plan.seq.filter(function(s){ return s.channel === 'combat'; }).length;\n    var goldNow = goldPerAction(p, p.combat, p.utility);\n    var fundWeeks = plan.total / goldNow / p.actionsPerWeek;\n    document.getElementById('planNote').innerHTML =\n      '<strong>' + nC + ' combat</strong> and <strong>' + (PLAN_STEPS - nC) + ' utility</strong> levels, ending at combat ' +\n      plan.endC + ' / utility ' + plan.endU + '. Total ' + fmt(plan.total) + ' gold — about ' +\n      weeks(fundWeeks) + ' of income at your current ' + fmt(goldNow) + '/action and ' +\n      fmtInt(p.actionsPerWeek) + ' actions a week. ' +\n      (plan.flipAt < 0\n        ? 'No flip inside this window: the same slot wins all 24 times.'\n        : 'The first flip happens at purchase <strong>#' + (plan.flipAt + 1) + '</strong>.');\n  }\n\n  // ---- ROI tables ----\n  function buildTableRows(p, sweepFn, currentLevel, maxLevel){\n    var rows = [];\n    var cur = clampLevel(currentLevel);\n    var gAtCur = sweepFn(cur);\n    var cum = 0;\n    var topLevel = Math.max(maxLevel, cur);\n    var prevGold = null;\n    for (var L = 0; L <= topLevel; L++){\n      var gold = sweepFn(L);\n      var cost = L === 0 ? 0 : stepCost(L);\n      var marg = L === 0 ? 0 : gold - prevGold;\n      prevGold = gold;\n      var margAct = L === 0 ? null : cost/marg;\n      var cumCost = null, cumAct = null;\n      if (L > cur){ cum += cost; cumCost = cum; cumAct = cum/(gold - gAtCur); }\n      var cls = [];\n      if (L === cur) cls.push('current');\n      if (L > 0 && L % 30 === 1) cls.push('boundary');\n      var mw = margAct ? margAct/p.actionsPerWeek : null;\n      if (mw !== null && mw >= 2 && mw <= 4) cls.push('band');\n      rows.push(\n        '<tr class=\"'+cls.join(' ')+'\">' +\n        '<td class=\"lvl\">'+L+(L===cur?' <span class=\"tag\">current</span>':'')+'</td>' +\n        '<td>'+slotBoostPct(L)+'%</td>' +\n        '<td>'+fmt(gold)+'</td>' +\n        '<td>'+(L===0?'—':fmt(cost))+'</td>' +\n        '<td>'+(margAct===null?'—':fmtInt(margAct))+'</td>' +\n        '<td class=\"wk\">'+(mw===null?'—':mw.toFixed(2))+'</td>' +\n        '<td class=\"sep\">'+(cumCost===null?'—':fmt(cumCost))+'</td>' +\n        '<td>'+(cumAct===null?'—':fmtInt(cumAct))+'</td>' +\n        '<td class=\"wk\">'+(cumAct===null?'—':(cumAct/p.actionsPerWeek).toFixed(2))+'</td>' +\n        '</tr>'\n      );\n    }\n    return { html: rows.join(''), count: rows.length, top: topLevel };\n  }\n\n  var combatMaxLevel = 120, utilityMaxLevel = 120;\n  var MAX_LEVEL_CAP = 5000;\n\n  // ---- render ----\n  //\n  // Coalesced through rAF: typing in an input fires `input` per keystroke, and a\n  // full render rebuilds two tables plus a 400-step crossover scan. One frame's\n  // worth of work per frame, never more. Persistence is debounced separately -\n  // localStorage.setItem is synchronous and does not belong on a keystroke.\n  var renderQueued = false;\n  function requestRender(){\n    if (renderQueued) return;\n    renderQueued = true;\n    var run = function(){ renderQueued = false; render(); };\n    // requestAnimationFrame never fires in a hidden tab. This page can legitimately\n    // be opened into one (window.open from the game, or a background restore), and\n    // an rAF-only path would leave it queued and blank until it was looked at.\n    if (document.hidden) setTimeout(run, 0); else requestAnimationFrame(run);\n  }\n\n  var saveTimer = null;\n  function requestSave(){\n    clearTimeout(saveTimer);\n    saveTimer = setTimeout(function(){\n      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collectRawValues())); }\n      catch (e) { /* private mode or blocked storage - ignore */ }\n    }, 800);\n  }\n\n  function render(){\n    var p = readInputs();\n\n    buildLedger(p);\n    buildBreakpoint(p);\n\n    var c = buildTableRows(p, function(L){ return goldPerAction(p, L, p.utility); }, p.combat, combatMaxLevel);\n    var u = buildTableRows(p, function(L){ return goldPerAction(p, p.combat, L); }, p.utility, utilityMaxLevel);\n    document.getElementById('combatTbody').innerHTML = c.html;\n    document.getElementById('utilityTbody').innerHTML = u.html;\n    document.getElementById('combatRowCount').textContent = 'levels 0–' + c.top;\n    document.getElementById('utilityRowCount').textContent = 'levels 0–' + u.top;\n    document.getElementById('combatMoreBtn').disabled = combatMaxLevel >= MAX_LEVEL_CAP;\n    document.getElementById('combatMore500Btn').disabled = combatMaxLevel >= MAX_LEVEL_CAP;\n    document.getElementById('utilityMoreBtn').disabled = utilityMaxLevel >= MAX_LEVEL_CAP;\n    document.getElementById('utilityMore500Btn').disabled = utilityMaxLevel >= MAX_LEVEL_CAP;\n\n    requestSave();\n  }\n\n  // ---- persistence ----\n  function collectRawValues(){\n    var out = {}, key;\n    for (key in FIELD_IDS) out[key] = document.getElementById(FIELD_IDS[key]).value;\n    for (key in CHECK_IDS) out['chk_' + key] = document.getElementById(CHECK_IDS[key]).checked;\n    return out;\n  }\n  function applyRawValues(vals){\n    var key;\n    for (key in FIELD_IDS){\n      if (vals[key] !== undefined) document.getElementById(FIELD_IDS[key]).value = vals[key];\n    }\n    for (key in CHECK_IDS){\n      if (vals['chk_' + key] !== undefined) document.getElementById(CHECK_IDS[key]).checked = !!vals['chk_' + key];\n      else if (key === 'vip' && vals.vipChecked !== undefined) document.getElementById(CHECK_IDS[key]).checked = !!vals.vipChecked;\n    }\n  }\n  function applyDefaults(){\n    var key;\n    for (key in FIELD_IDS) document.getElementById(FIELD_IDS[key]).value = DEFAULTS[key];\n    for (key in CHECK_IDS) document.getElementById(CHECK_IDS[key]).checked = CHECK_DEFAULTS[key];\n    combatMaxLevel = 120; utilityMaxLevel = 120;\n  }\n  function loadPersistedDefaults(){\n    try {\n      var raw = localStorage.getItem(DEFAULTS_KEY) || localStorage.getItem(LEGACY_DEFAULTS_KEY);\n      if (raw){ var parsed = JSON.parse(raw); for (var key in DEFAULTS){ if (parsed[key]!==undefined) DEFAULTS[key] = parsed[key]; } }\n    } catch(e){}\n  }\n  function saveAsDefault(){\n    var raw = collectRawValues();\n    for (var key in FIELD_IDS) DEFAULTS[key] = num(raw[key], DEFAULTS[key]);\n    try { localStorage.setItem(DEFAULTS_KEY, JSON.stringify(DEFAULTS)); } catch(e){}\n    flash(document.getElementById('saveDefaultBtn'), 'Saved ✓');\n  }\n  function flash(btn, text){\n    var original = btn.textContent;\n    btn.textContent = text;\n    setTimeout(function(){ btn.textContent = original; }, 1500);\n  }\n\n  // ---- live import from the userscript ----\n  //\n  // The Apoz Core module injects `window.APOZ_LIVE` into this page before\n  // opening it. Every entry is optional and carries its own source string; a\n  // field that could not be read is simply absent. Nothing is guessed and\n  // nothing is substituted - a missing reading stays missing, because a\n  // plausible wrong number here is worse than no number.\n  var LIVE_MAP = {\n    combat:         { label: 'Combat slot level',   field: 'combat' },\n    utility:        { label: 'Utility slot level',  field: 'utility' },\n    characterLevel: { label: 'Character level',     field: 'characterLevel' },\n    monsterLevel:   { label: 'Monster level',       field: 'monsterLevel' },\n    partyMembers:   { label: 'Party members',       field: 'partyMembers' },\n    othersGoldBoost:{ label: \"Others' Gold Boost\",  field: 'othersGoldBoost', suffix: '%' },\n    observedGold:   { label: 'Observed gold/action',field: 'observedGold', scale: 1e-9, suffix: 'B' }\n  };\n  var liveData = null;\n\n  function initLive(){\n    var card = document.getElementById('liveCard');\n    var list = document.getElementById('liveList');\n    var empty = document.getElementById('liveEmpty');\n    var actions = document.getElementById('liveActions');\n    var when = document.getElementById('liveWhen');\n\n    var src = (typeof window !== 'undefined' && window.APOZ_LIVE) || null;\n    if (!src || !src.fields) return;\n    var keys = Object.keys(src.fields).filter(function(k){\n      return LIVE_MAP[k] && src.fields[k] && typeof src.fields[k].value === 'number' && isFinite(src.fields[k].value);\n    });\n    if (!keys.length) return;\n\n    liveData = src;\n    card.classList.remove('absent');\n    var ageMin = src.ts ? Math.round((Date.now() - src.ts)/60000) : null;\n    if (ageMin !== null && ageMin > 30) card.classList.add('stale');\n    when.textContent = ageMin === null ? '' : (ageMin < 1 ? 'just now' : ageMin + 'm ago');\n    empty.hidden = true;\n    actions.hidden = false;\n\n    list.innerHTML = keys.map(function(k){\n      var m = LIVE_MAP[k], f = src.fields[k];\n      var v = f.value * (m.scale || 1);\n      return '<div class=\"live-row\"><span class=\"k\">' + m.label + '</span>' +\n        '<span><span class=\"v\">' + (Math.abs(v) >= 1000 ? fmtInt(v) : (Math.round(v*100)/100)) +\n        (m.suffix || '') + '</span> <span class=\"src\">' + (f.from || '') + '</span></span></div>';\n    }).join('');\n\n    document.getElementById('liveApplyBtn').addEventListener('click', function(){\n      applyLive();\n      flash(document.getElementById('liveApplyBtn'), 'Applied ✓');\n    });\n  }\n\n  function applyLive(){\n    if (!liveData) return;\n    for (var k in liveData.fields){\n      var m = LIVE_MAP[k];\n      if (!m) continue;\n      var f = liveData.fields[k];\n      if (!f || typeof f.value !== 'number' || !isFinite(f.value)) continue;\n      var el = document.getElementById(FIELD_IDS[m.field]);\n      if (el) el.value = String(Math.round(f.value * (m.scale || 1) * 1000) / 1000);\n    }\n    if (liveData.fields.othersGoldBoost) document.getElementById(CHECK_IDS.othersSame).checked = false;\n    requestRender();\n  }\n\n  // ---- provenance list (which core facts this page was built from) ----\n  function initProvenance(){\n    var ul = document.getElementById('provenanceList');\n    var names = (window.APOZ_FACTS && Object.keys(window.APOZ_FACTS)) || [];\n    ul.innerHTML = names.length\n      ? names.map(function(n){ return '<li><code>' + n + '</code></li>'; }).join('') +\n        '<li>Emitted into this page by <code>userscripts/build.mjs</code> from <code>data/</code>. Correct the fact in the core and rebuild &mdash; nothing here is retyped.</li>'\n      : '<li>This copy was opened without the generated facts block.</li>';\n  }\n\n  function initBackToTop(){\n    var btn = document.getElementById('backToTop');\n    function update(){\n      btn.classList.toggle('show', window.innerWidth <= 980 && window.scrollY > 420);\n    }\n    window.addEventListener('scroll', update, { passive: true });\n    window.addEventListener('resize', update);\n    btn.addEventListener('click', function(){ window.scrollTo({ top: 0, behavior: 'smooth' }); });\n    update();\n  }\n\n  function extendTable(which, by, to){\n    var cap = MAX_LEVEL_CAP;\n    if (which === 'combat'){\n      combatMaxLevel = Math.min(cap, to !== undefined ? to : combatMaxLevel + by);\n    } else {\n      utilityMaxLevel = Math.min(cap, to !== undefined ? to : utilityMaxLevel + by);\n    }\n    requestRender();\n  }\n\n  function init(){\n    loadPersistedDefaults();\n    var saved = null;\n    try {\n      var raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);\n      if (raw) saved = JSON.parse(raw);\n    } catch (e) { /* ignore */ }\n    applyDefaults();\n    if (saved) applyRawValues(saved);\n\n    for (var key in FIELD_IDS){\n      document.getElementById(FIELD_IDS[key]).addEventListener('input', requestRender);\n    }\n    for (var ckey in CHECK_IDS){\n      document.getElementById(CHECK_IDS[ckey]).addEventListener('change', requestRender);\n    }\n\n    var panel = document.getElementById('advancedPanel');\n    var toggle = document.getElementById('toggleAdvanced');\n    toggle.addEventListener('click', function(){\n      var isHidden = panel.hasAttribute('hidden');\n      if (isHidden) { panel.removeAttribute('hidden'); toggle.textContent = 'Fewer inputs'; }\n      else { panel.setAttribute('hidden', ''); toggle.textContent = 'More inputs'; }\n    });\n\n    document.getElementById('resetBtn').addEventListener('click', function(){ applyDefaults(); requestRender(); });\n    document.getElementById('saveDefaultBtn').addEventListener('click', saveAsDefault);\n\n    document.getElementById('combatMoreBtn').addEventListener('click', function(){ extendTable('combat', 60); });\n    document.getElementById('combatMore500Btn').addEventListener('click', function(){ extendTable('combat', 500); });\n    document.getElementById('utilityMoreBtn').addEventListener('click', function(){ extendTable('utility', 60); });\n    document.getElementById('utilityMore500Btn').addEventListener('click', function(){ extendTable('utility', 500); });\n    function jump(which, inputId){\n      var v = clampLevel(document.getElementById(inputId).value);\n      if (v > 0) extendTable(which, 0, v);\n    }\n    document.getElementById('combatJumpBtn').addEventListener('click', function(){ jump('combat', 'combatJumpInput'); });\n    document.getElementById('utilityJumpBtn').addEventListener('click', function(){ jump('utility', 'utilityJumpInput'); });\n    document.getElementById('combatJumpInput').addEventListener('keydown', function(e){ if (e.key === 'Enter') jump('combat', 'combatJumpInput'); });\n    document.getElementById('utilityJumpInput').addEventListener('keydown', function(e){ if (e.key === 'Enter') jump('utility', 'utilityJumpInput'); });\n\n    initLive();\n    initProvenance();\n    initBackToTop();\n    render();\n  }\n\n  // Named so it is obvious at any call site that this is a test seam, not an\n  // API - same reasoning as Core's __modulesForTest. Nothing in this page\n  // reads it; tests/userscript-roi-math.mjs does, so the arithmetic that is\n  // asserted is the arithmetic that ships rather than a copy of it.\n  window.__PARTY_GOLD_ROI_FOR_TEST = {\n    buildProfile: buildProfile, goldPerAction: goldPerAction, marginal: marginal,\n    crossoverUtility: crossoverUtility, greedyPlan: greedyPlan,\n    slotBoostPct: slotBoostPct, stepCost: stepCost,\n    personalGoldTotal: personalGoldTotal, pooledBase: pooledBase,\n  };\n\n  if (document.readyState === 'loading') {\n    document.addEventListener('DOMContentLoaded', init);\n  } else {\n    init();\n  }\n})();\n</script>\n";

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
  const ALARM_REPEAT_MS = 30_000;
  const AMBIENT_POLL_MS = 8_000;
  const SLOT_LABEL = 'combat';
  const MODULE_ID = 'eta-tracker';
  const STORAGE_KEY = `apoz:${MODULE_ID}:v3`;
  const LEGACY_STORAGE_KEY = 'qett-progress-v3'; // pre-namespace, migrated on load
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

  function findSlotCard(label) {
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

  function checkTrackerReady() {
    if (trackerEtaMs === null) return;
    const remaining = trackerEtaMs - Date.now();
    if (remaining > 0) {
      trackerAlarmFired = false;
      trackerAcknowledged = false;
      nextAlarmAtMs = null;
      return;
    }
    if (trackerAcknowledged) return;
    const now = Date.now();
    if (!trackerAlarmFired || now >= nextAlarmAtMs) {
      const first = !trackerAlarmFired;
      trackerAlarmFired = true;
      playGentleAlarm();
      if (first) notifyReady();
      nextAlarmAtMs = now + ALARM_REPEAT_MS;
    }
  }

  function snoozeAlarm() {
    trackerAcknowledged = true;
    render();
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
      gain.gain.linearRampToValueAtTime(0.32, start + 0.04);
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
        keepAwake, notifyOnReady,
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

    const gold = goldSnapshot();
    setText(ui.detailGoldSource, gold ? `(${gold.from}, ${formatAgo(gold.atMs)})` : '(not read yet)');

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
        if (onChange) onChange();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
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
    onToggle: (enabled) => { if (!enabled) togglePanel(false); },
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
