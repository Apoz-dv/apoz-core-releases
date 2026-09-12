// ==UserScript==
// @name         Apoz Core: Pet Slot Alarm
// @namespace    apoz-core
// @author       Apoz
// @version      4.11.6
// @description  Apoz Core module (requires "Apoz Core"). Read-only overlay: estimates time until the Combat pet slot upgrade is affordable from your live gold and the exact upgrade-cost formula (no need to sit on the Pets page), rings a gentle alarm - and optionally a desktop notification - when it is, and stays accurate in a backgrounded tab. Ships the Party Gold ROI calculator. No auto-clicking.
// @match        https://v2.queslar.com/*
// @match        https://*.queslar.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/awoo-vibe-sniffa/apoz-core-releases/main/live/eta-tracker.user.js
// @downloadURL  https://raw.githubusercontent.com/awoo-vibe-sniffa/apoz-core-releases/main/live/eta-tracker.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ==== GENERATED — DO NOT EDIT ====
  // Produced by userscripts/build.mjs from data/. Edit the FACT,
  // then rebuild; editing this block is overwritten and, worse,
  // silently diverges from the core it was supposed to mirror.

  // formulas/pets.json :: pets.slotUpgrade.costFormula  [CODE]
  function petSlotUpgradeCost(currentLevel, newLevel) { let total = 0; for (let r = currentLevel + 1; r <= newLevel; r++) total += r <= 150 ? Math.floor(500000 * r**3) : Math.floor(500000 * 150**3 * (r/150)**15); return { currency: 'gold', value: total }; } // per-level marginal cost at level L->L+1: floor(500000*(L+1)^3) while L+1<=150, else floor(500000*150^3*((L+1)/150)^15). Exactly continuous at the seam: both branches evaluate to floor(500000*150^3) = 1,687,500,000,000 at r=150.

  // formulas/pets.json :: pets.slotUpgrade.boostFormula  [CODE]
  function petSlotBoostPercent(slotLevel) { let block = Math.floor(slotLevel / 30); let intoBlock = slotLevel % 30; if (block >= 5) return 0.3*5*6/2 + intoBlock*0.01*6; return 0.3*block*(block+1)/2 + intoBlock*0.01*(block+1); }

  // PROVENANCE — generated from this module's facts manifest.
  const PROVENANCE = [
    { file: "formulas/pets.json", fact: "pets.slotUpgrade.costFormula" },
    { file: "formulas/pets.json", fact: "pets.slotUpgrade.boostFormula" },
  ];
  void PROVENANCE; // declaration only — never read at runtime

  // ==== END GENERATED ====

  // ==== GENERATED TOOL PAYLOADS — DO NOT EDIT ====
  // Tool payload: userscripts/src/tools/party-gold-roi.html (generated facts inlined)
  const APOZ_TOOL_PARTY_GOLD_ROI = "<meta charset=\"utf-8\">\n<title>Party Gold ROI</title>\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Source+Sans+3:wght@400;500;600;700&display=swap\">\n<style>\n/* ---------------------------------------------------------------------------\n   THEME. Light is a warm beach/sand palette, not white - soft on the eyes but\n   unambiguously light mode. Dark is its own design, not an inversion. Every\n   colour is a token declared on bare :root first, so the un-stamped \"system\"\n   state resolves correctly.\n--------------------------------------------------------------------------- */\n:root{\n  --bg:#efe7d7; --surface:#faf5ec; --surface-2:#f1e8d8; --surface-3:#e7dcc7;\n  --border:#d8cbb2; --border-strong:#c3b193;\n  --text:#33291d; --text-muted:#6b5c48; --text-faint:#94836c;\n  --accent:#4a6741; --accent-soft:#5f8352;      /* matte olive - rich, not neon */\n  --warm:#a8552c; --warm-soft:#c26b3c;          /* softened terracotta */\n  --success:#5a7d3f; --band:#f4ead2; --current:#e2e8da;\n  --shadow:0 1px 2px rgba(80,60,35,.07), 0 4px 14px rgba(80,60,35,.06);\n  --mono:'IBM Plex Mono',ui-monospace,monospace;\n  --sans:'IBM Plex Sans',system-ui,sans-serif;\n  --display:'Big Shoulders Display','Arial Narrow',sans-serif;\n  /* NUMBERS. A humanist sans rather than the mono face: Source Sans 3 sits\n     close to Segoe UI, reads better than a monospace at these sizes, and has\n     real tabular figures - which is the whole reason a number face has to be\n     chosen deliberately instead of inherited. Every numeric context below\n     pairs it with font-variant-numeric: tabular-nums so columns still line up. */\n  --num:'Source Sans 3','Segoe UI','Open Sans',system-ui,sans-serif;\n}\n@media (prefers-color-scheme:dark){\n  :root:not([data-theme=\"light\"]){\n    --bg:#17181a; --surface:#1e2022; --surface-2:#25282a; --surface-3:#2e3134;\n    --border:#33373a; --border-strong:#4a4f53;\n    --text:#e6e4e0; --text-muted:#a09d97; --text-faint:#726f6a;\n    --accent:#8fa87a; --accent-soft:#a7bd93;      /* the same olive, lifted */\n    --warm:#c9805a; --warm-soft:#dc9a75;          /* the same terracotta, lifted */\n    --success:#8fa87a; --band:#2a2621; --current:#242a24;\n    --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.32);\n  }\n}\n:root[data-theme=\"dark\"]{\n  --bg:#17181a; --surface:#1e2022; --surface-2:#25282a; --surface-3:#2e3134;\n  --border:#33373a; --border-strong:#4a4f53;\n  --text:#e6e4e0; --text-muted:#a09d97; --text-faint:#726f6a;\n  --accent:#8fa87a; --accent-soft:#a7bd93;      /* the same olive, lifted */\n  --warm:#c9805a; --warm-soft:#dc9a75;          /* the same terracotta, lifted */\n  --success:#8fa87a; --band:#2a2621; --current:#242a24;\n  --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.32);\n}\n\n\n/* THREE DARK DIRECTIONS. Pick one with the theme control, bottom right.\n   Each is a whole palette, not a hue rotation of the others:\n\n   ink    near-black, warm, almost no chroma in the greys. One accent, used\n          sparingly. Reads as a document at night. The quietest.\n   slate  cool blue-grey, higher contrast type, desaturated accent. The\n          \"professional tool\" register - closest to an IDE or Linear.\n   umber  deep warm brown-black with sepia-leaning text and brass accents.\n          The same product as the beach light theme, after dark. */\n\n:root[data-theme=\"dark\"][data-dark=\"ink\"],\n:root:not([data-theme=\"light\"])[data-dark=\"ink\"]{\n  --bg:#0e0e0f; --surface:#161617; --surface-2:#1c1c1e; --surface-3:#242427;\n  --border:#2a2a2d; --border-strong:#3c3c41;\n  --text:#eceae7; --text-muted:#9d9a95; --text-faint:#6a6763;\n  --accent:#9db38c; --accent-soft:#b6c9a7;\n  --warm:#d08a63; --warm-soft:#e0a483;\n  --success:#9db38c; --band:#211f1b; --current:#1c211c;\n  --shadow:0 1px 2px rgba(0,0,0,.5), 0 10px 30px rgba(0,0,0,.4);\n}\n:root[data-theme=\"dark\"][data-dark=\"slate\"],\n:root:not([data-theme=\"light\"])[data-dark=\"slate\"]{\n  --bg:#0f1216; --surface:#171b21; --surface-2:#1e232a; --surface-3:#272d36;\n  --border:#2b323b; --border-strong:#3f4854;\n  --text:#f0f3f6; --text-muted:#9aa5b1; --text-faint:#69737f;\n  --accent:#7fb3a5; --accent-soft:#9ccabd;\n  --warm:#d79a6e; --warm-soft:#e6b391;\n  --success:#7fb3a5; --band:#221f1a; --current:#182420;\n  --shadow:0 1px 2px rgba(0,0,0,.45), 0 10px 28px rgba(0,0,0,.38);\n}\n:root[data-theme=\"dark\"][data-dark=\"umber\"],\n:root:not([data-theme=\"light\"])[data-dark=\"umber\"]{\n  --bg:#14100c; --surface:#1c1712; --surface-2:#231d16; --surface-3:#2d251c;\n  --border:#332a20; --border-strong:#4a3d2e;\n  --text:#efe6d8; --text-muted:#a89a86; --text-faint:#7a6d5c;\n  --accent:#a3ad72; --accent-soft:#bcc48f;\n  --warm:#cf8f5c; --warm-soft:#e0a97c;\n  --success:#a3ad72; --band:#241d12; --current:#20241a;\n  --shadow:0 1px 2px rgba(0,0,0,.5), 0 10px 30px rgba(0,0,0,.42);\n}\n\n*{box-sizing:border-box}\n[hidden]{display:none!important}\nhtml,body{margin:0;background:var(--bg)}\n/* No sideways scrolling, ever. A separately-scrolling sidebar is wanted; a\n   horizontal bar never is. */\nbody{color:var(--text);font-family:var(--sans);line-height:1.5;font-size:.9rem;overflow-x:hidden}\na{color:inherit}\n\n/* ---- shell: sized for 1440p at the default window width ---- */\n.app{display:grid;grid-template-columns:340px minmax(0,1fr);gap:1.5rem;\n     max-width:1680px;margin:0 auto;padding:1.5rem 1.5rem 4rem}\n@media (max-width:1100px){.app{grid-template-columns:1fr;padding:1.25rem 1rem 4rem}}\n\n.eyebrow{font-family:var(--mono);font-size:.63rem;letter-spacing:.11em;text-transform:uppercase;color:var(--accent);margin-bottom:.3rem}\nh1{font-family:var(--display);font-weight:700;font-size:1.7rem;margin:0 0 .3rem;line-height:1;text-wrap:balance}\n.sub{color:var(--text-muted);font-size:.78rem;margin:0 0 1rem;line-height:1.45}\n\n/* ---- sidebar ---- */\n.sidebar-inner{display:flex;flex-direction:column;gap:.55rem}\n@media (min-width:1101px){\n  .sidebar-inner{position:sticky;top:1.25rem;max-height:calc(100vh - 2.5rem);\n    overflow-y:auto;overflow-x:hidden;padding-right:.45rem;scrollbar-width:thin}\n  .sidebar-inner::-webkit-scrollbar{width:8px}\n  .sidebar-inner::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:4px}\n}\n.card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.55rem .7rem;box-shadow:var(--shadow)}\n\n.sec-label{font-family:var(--mono);font-size:.6rem;letter-spacing:.09em;text-transform:uppercase;\n  color:var(--text-faint);display:flex;align-items:center;gap:.3rem;margin:0 0 .5rem}\n.sec-label .rule{flex:1;height:1px;background:var(--border)}\n\n/* ---- compact, aligned inputs ---- */\n.fields{display:grid;grid-template-columns:1fr 5.2rem;align-items:center;gap:.16rem .45rem}\n.fields label{font-size:.73rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;\n  display:flex;align-items:center;gap:.25rem;min-width:0}\n.fields input[type=number],.fields input[type=text]{\n  font-family:var(--num);font-size:.8rem;font-weight:600;color:var(--text);\n  background:var(--surface-2);border:1px solid var(--border);border-radius:4px;\n  padding:.12rem .4rem;width:100%;min-width:0;font-variant-numeric:tabular-nums;\n  text-align:right;line-height:1.4;height:1.45rem}\n/* A number input reserves a spinner gutter and a text input does not, so\n   right-aligned values in the same column sat at two different x positions.\n   Removing the spinner is what lines the column up. */\n.fields input[type=number]{-moz-appearance:textfield;appearance:textfield}\n.fields input[type=number]::-webkit-outer-spin-button,\n.fields input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}\n.fields input:focus{outline:2px solid var(--accent);outline-offset:1px}\n.fields input:disabled{opacity:.45;cursor:not-allowed;background:var(--surface-3)}\n.checkrow{grid-column:1 / -1;display:flex;align-items:center;gap:.4rem;font-size:.75rem;color:var(--text-muted);cursor:pointer;user-select:none}\n.checkrow input{width:.85rem;height:.85rem;accent-color:var(--accent);margin:0;cursor:pointer}\n.note{grid-column:1 / -1;font-size:.68rem;color:var(--text-faint);line-height:1.35;margin:.2rem 0 0}\n\n/* ---- buttons, one family ---- */\n.btn{font-family:var(--sans);font-size:.72rem;font-weight:500;color:var(--text-muted);\n  background:var(--surface-2);border:1px solid var(--border);border-radius:6px;\n  padding:.28rem .6rem;cursor:pointer;white-space:nowrap;transition:background .12s,border-color .12s,color .12s}\n.btn:hover{border-color:var(--accent);color:var(--accent);background:var(--surface-3)}\n.btn:disabled{opacity:.4;cursor:default}\n.btn:disabled:hover{border-color:var(--border);color:var(--text-muted);background:var(--surface-2)}\n.btn-primary{color:var(--surface);background:var(--accent);border-color:var(--accent)}\n.btn-primary:hover{background:var(--accent-soft);border-color:var(--accent-soft);color:var(--surface)}\n.btnrow{display:flex;gap:.35rem;margin-top:.5rem}\n.btnrow .btn{flex:1}\n\n/* ---- results ---- */\n.result{display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;padding:.22rem 0;font-size:.78rem}\n.result + .result{border-top:1px dashed var(--border)}\n.result .k{color:var(--text-muted)}\n.result .v{font-family:var(--num);font-weight:600;font-variant-numeric:tabular-nums}\n.result.hero .v{font-family:var(--display);font-size:1.5rem;font-weight:700;color:var(--warm);line-height:1}\n.result .v.good{color:var(--success)} .result .v.off{color:var(--warm)}\n\n/* ---- live import ---- */\n.live{border-left:3px solid var(--border-strong)}\n.live.on{border-left-color:var(--success)}\n.live-head{display:flex;justify-content:space-between;align-items:center;gap:.4rem;margin-bottom:.4rem}\n.live-when{font-family:var(--num);font-size:.62rem;color:var(--text-faint)}\n.live-list{display:grid;grid-template-columns:1fr auto;gap:.1rem .5rem;font-size:.72rem;margin-bottom:.4rem}\n.live-list .k{color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.live-list .v{font-family:var(--num);font-weight:600;text-align:right;font-variant-numeric:tabular-nums}\n.live-empty{font-size:.72rem;color:var(--text-muted);line-height:1.45}\n\n/* ---- tooltips: fixed-position, so a scroll container cannot clip them ---- */\n.tip{border-bottom:1px dotted var(--text-faint);cursor:help}\n.ico{display:inline-flex;align-items:center;justify-content:center;width:.85rem;height:.85rem;\n  border-radius:50%;border:1px solid var(--text-faint);color:var(--text-faint);\n  font-size:.55rem;font-weight:700;cursor:help;flex:none;font-style:normal}\n.ico:hover,.ico:focus{border-color:var(--accent);color:var(--accent);outline:none}\n#tip{position:fixed;z-index:200;max-width:22rem;background:var(--text);color:var(--surface);white-space:pre-line;\n  font-family:var(--sans);font-size:.73rem;font-weight:400;line-height:1.45;\n  padding:.45rem .6rem;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.28);\n  opacity:0;visibility:hidden;transition:opacity .1s;pointer-events:none;left:0;top:0}\n#tip.on{opacity:1;visibility:visible}\n\n/* ---- main ---- */\nh3.sec{font-family:var(--display);font-weight:700;font-size:1.25rem;margin:1.6rem 0 .2rem}\nh3.sec:first-child{margin-top:0}\n.sec-sub{color:var(--text-muted);font-size:.78rem;margin:0 0 .7rem;max-width:74ch}\n\n.verdict{background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--warm);\n  border-radius:10px;padding:.85rem 1rem;margin-bottom:1rem;box-shadow:var(--shadow)}\n.verdict-head{display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap;margin-bottom:.4rem}\n.verdict-kicker{font-family:var(--mono);font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--text-faint)}\n.verdict-answer{font-family:var(--display);font-weight:800;font-size:1.6rem;line-height:1;color:var(--warm)}\n.verdict-answer.util{color:var(--accent)}\n.verdict p{font-size:.8rem;color:var(--text-muted);margin:0}\n.verdict p + p{margin-top:.35rem}\n.verdict strong{color:var(--text)}\n\n.compare{display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-bottom:1rem}\n@media (max-width:820px){.compare{grid-template-columns:1fr}}\n.box{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.75rem .9rem;box-shadow:var(--shadow)}\n.box.win{border-color:var(--success);box-shadow:inset 3px 0 0 var(--success),var(--shadow)}\n.box h5{margin:0 0 .2rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-faint);display:flex;align-items:center;gap:.35rem}\n.box .big{font-family:var(--display);font-size:1.5rem;color:var(--warm);line-height:1.05}\n.box .unit{font-family:var(--num);font-size:.6rem;color:var(--text-faint);text-transform:uppercase;letter-spacing:.05em}\n.box dl{display:grid;grid-template-columns:auto 1fr;gap:.05rem .6rem;margin:.45rem 0 0;font-size:.72rem}\n.box dt{color:var(--text-faint)} .box dd{margin:0;font-family:var(--num);text-align:right;font-variant-numeric:tabular-nums}\n.box p{margin:.35rem 0 0;font-size:.72rem;color:var(--text-muted)}\n.tag{font-family:var(--sans);font-size:.55rem;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);border:1px solid currentColor;border-radius:3px;padding:0 .22rem}\n.tag.win{color:var(--success)}\n\n.panel{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.75rem .9rem;margin-bottom:1rem;box-shadow:var(--shadow)}\n.panel h5{margin:0 0 .5rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-faint)}\n.panel .note{font-size:.78rem;color:var(--text-muted);margin:.5rem 0 0}\n.panel .note strong{color:var(--text)}\n\n.strip{display:flex;gap:2px;flex-wrap:wrap;margin-bottom:.5rem}\n.cell{width:1.5rem;height:1.5rem;border-radius:4px;display:flex;align-items:center;justify-content:center;\n  font-family:var(--num);font-size:.55rem;font-weight:600;color:#fff}\n.cell.c{background:var(--warm)} .cell.u{background:var(--accent)}\n.cell.flip{outline:2px solid var(--success);outline-offset:1px}\n.legend{display:flex;gap:.9rem;flex-wrap:wrap;font-size:.7rem;color:var(--text-muted);margin-top:.4rem}\n.legend span{display:flex;align-items:center;gap:.3rem}\n.sw{width:.75rem;height:.75rem;border-radius:3px;border:1px solid var(--border);display:inline-block}\n\n/* ---- tables ---- */\n.tbl-wrap{overflow:auto;max-height:480px;border:1px solid var(--border);border-radius:10px;background:var(--surface);box-shadow:var(--shadow)}\n.tbl-wrap.tall{max-height:calc(100vh - 11rem)}\n.tbl-wrap.auto{max-height:none}\ntable.roi{width:100%;border-collapse:collapse;font-size:.75rem}\ntable.roi thead th{position:sticky;background:var(--surface-2);text-align:right;font-family:var(--mono);\n  font-weight:500;font-size:.63rem;letter-spacing:.04em;text-transform:uppercase;color:var(--text-faint);\n  padding:.32rem .5rem;white-space:nowrap;z-index:2}\ntable.roi thead tr.grp th{top:0;font-size:.58rem;letter-spacing:.09em;color:var(--text-muted);\n  border-bottom:1px solid var(--border);background:var(--surface-3)}\ntable.roi thead tr.cols th{top:1.4rem;border-bottom:1px solid var(--border)}\ntable.roi thead th:first-child{text-align:left}\ntable.roi tbody td{text-align:right;padding:.22rem .5rem;font-family:var(--num);font-variant-numeric:tabular-nums;\n  border-top:1px solid var(--border);white-space:nowrap}\ntable.roi tbody td.lvl{text-align:left;color:var(--text-muted)}\ntable.roi tbody td.sep,table.roi thead th.sep{border-left:1px solid var(--border)}\ntable.roi tbody tr.boundary td{color:var(--success)}\ntable.roi tbody tr.band{background:var(--band)}\ntable.roi tbody tr.current{background:var(--current);font-weight:600}\ntable.roi tbody tr.current td{border-top:2px solid var(--accent);border-bottom:2px solid var(--accent)}\n.tblfoot{display:flex;justify-content:flex-end;align-items:center;gap:.35rem;padding:.45rem .1rem 0;flex-wrap:wrap}\n.tblfoot .count{margin-right:auto;font-family:var(--num);font-size:.66rem;color:var(--text-faint)}\n.tblfoot input{font-family:var(--num);font-size:.72rem;width:5rem;padding:.25rem .35rem;text-align:right;\n  background:var(--surface-2);border:1px solid var(--border);border-radius:6px;color:var(--text)}\n\ndetails.panel summary{cursor:pointer;font-weight:600;font-size:.82rem;list-style:none;display:flex;align-items:center;gap:.4rem}\ndetails.panel summary::-webkit-details-marker{display:none}\ndetails.panel summary::before{content:'\\25B8';font-family:var(--mono);color:var(--accent);transition:transform .15s;font-size:.75rem}\ndetails.panel[open] summary::before{transform:rotate(90deg)}\ndetails.panel summary .s{font-weight:400;color:var(--text-muted);font-size:.73rem}\n.panel-body{margin-top:.7rem}\n.panel-body h4{font-size:.63rem;letter-spacing:.05em;text-transform:uppercase;color:var(--text-faint);margin:.9rem 0 .35rem}\n.panel-body h4:first-child{margin-top:0}\n.panel-body ul{margin:0;padding-left:1rem;color:var(--text-muted);font-size:.77rem}\n.panel-body li{margin-bottom:.3rem}\ncode{font-family:var(--mono);background:var(--surface-2);padding:.03rem .25rem;border-radius:3px;color:var(--text);font-size:.9em}\n\n.calc{position:relative;padding-left:1.5rem}\n.calc::before{content:\"\";position:absolute;left:.52rem;top:.4rem;bottom:.8rem;width:1px;background:var(--border-strong)}\n.step{position:relative;margin-bottom:.45rem;display:flex;align-items:baseline;gap:.5rem;flex-wrap:wrap;font-size:.78rem}\n.step-n{position:absolute;left:-1.5rem;top:.05rem;width:1.05rem;height:1.05rem;border-radius:50%;\n  background:var(--surface);border:1.5px solid var(--border-strong);display:flex;align-items:center;justify-content:center;\n  font-family:var(--num);font-weight:600;font-size:.58rem;color:var(--text-muted)}\n.step .l{color:var(--text);font-weight:600}\n.step .e{font-family:var(--mono);font-size:.68rem;color:var(--text-faint);flex:1 1 auto}\n.step .v{font-family:var(--num);font-weight:700;margin-left:auto;color:var(--warm);white-space:nowrap}\n.step.final .v{color:var(--success);font-size:.88rem}\n\n#themeBar{position:fixed;right:.9rem;bottom:.9rem;display:flex;align-items:center;gap:.3rem;z-index:60}\n#themeBar button{background:var(--surface);border:1px solid var(--border);color:var(--text-muted);\n  cursor:pointer;border-radius:6px;height:1.9rem;padding:0 .5rem;font:inherit;font-size:.7rem;\n  box-shadow:var(--shadow);display:flex;align-items:center;gap:.3rem}\n#themeBar button:hover{color:var(--accent);border-color:var(--accent)}\n#themeBar button.on{color:var(--accent);border-color:var(--accent);background:var(--surface-2)}\n#themeBar .sw2{width:.65rem;height:.65rem;border-radius:50%;border:1px solid rgba(128,128,128,.35)}\n@media (prefers-reduced-motion:reduce){*{transition:none!important}}\n</style>\n\n<div class=\"app\">\n  <aside>\n    <div class=\"sidebar-inner\">\n      <div>\n        <div class=\"eyebrow\">Combat vs Utility pet slot</div>\n        <h1>Party Gold ROI</h1>\n        <p class=\"sub\">Every multiplier that reaches your party-action gold, and which pet slot is the better buy right now.</p>\n      </div>\n\n      <div class=\"card live\" id=\"liveCard\">\n        <div class=\"live-head\">\n          <span class=\"sec-label\" style=\"margin:0\">Live import<span class=\"ico\" tabindex=\"0\" data-tip=\"Filled in by the Apoz Core userscript when you open this page from the in-game menu. Nothing is sent anywhere - the values are handed over in-page.\">i</span></span>\n          <span class=\"live-when\" id=\"liveWhen\"></span>\n        </div>\n        <div class=\"live-list\" id=\"liveList\"></div>\n        <div class=\"live-empty\" id=\"liveEmpty\">Not opened from the game. Open <strong>Apoz Core &rsaquo; Tools &rsaquo; Party Gold ROI</strong> inside Queslar to fill this in automatically.</div>\n        <div class=\"btnrow\" id=\"liveActions\" hidden>\n          <button type=\"button\" class=\"btn btn-primary\" id=\"liveApplyBtn\">Apply live values</button>\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Pet slots<span class=\"rule\"></span></div>\n        <div class=\"fields\">\n          <label for=\"combatInput\">Combat slot level</label>\n          <input type=\"number\" id=\"combatInput\" min=\"0\" max=\"5000\" value=\"50\">\n          <label for=\"utilityInput\">Utility slot level</label>\n          <input type=\"number\" id=\"utilityInput\" min=\"0\" max=\"5000\" value=\"30\">\n        </div>\n        <div style=\"margin-top:.55rem\">\n          <div class=\"result hero\"><span class=\"k\">Gold / action</span><span class=\"v\" id=\"headlineGold\">&mdash;</span></div>\n          <div class=\"result\" id=\"keptRow\" hidden><span class=\"k\">After village tax</span><span class=\"v\" id=\"keptGold\">&mdash;</span></div>\n          <div class=\"result\"><span class=\"k\">Combat boost</span><span class=\"v\" id=\"combatBoostOut\">&mdash;</span></div>\n          <div class=\"result\"><span class=\"k\">Utility boost</span><span class=\"v\" id=\"utilityBoostOut\">&mdash;</span></div>\n          <div class=\"result\" id=\"calibRow\" hidden><span class=\"k tip\" data-tip=\"Difference between this model and the gold/action you actually measured in game. Set it under Calibration.\">vs observed</span><span class=\"v\" id=\"calibOut\">&mdash;</span></div>\n        </div>\n        <div class=\"btnrow\">\n          <button type=\"button\" class=\"btn\" id=\"resetBtn\">Reset</button>\n          <button type=\"button\" class=\"btn\" id=\"saveDefaultBtn\">Save as default</button>\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Combat context<span class=\"rule\"></span><span class=\"ico\" tabindex=\"0\" data-tip=\"The values that change most often between sessions, so they sit near the top. Monster level multiplies gold.base linearly.\">i</span></div>\n        <div class=\"fields\">\n          <label for=\"monsterLevelInput\">Monster level</label>\n          <input type=\"number\" id=\"monsterLevelInput\" min=\"1\" max=\"10000000\" value=\"230000\">\n          <label for=\"characterLevelInput\">Character level</label>\n          <input type=\"number\" id=\"characterLevelInput\" min=\"1\" max=\"1000000\" value=\"11500\">\n          <label for=\"actionsPerWeekInput\">Actions / week</label>\n          <input type=\"number\" id=\"actionsPerWeekInput\" min=\"1\" max=\"200000\" value=\"6000\">\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Pet modifiers<span class=\"rule\"></span><span class=\"ico\" tabindex=\"0\" data-tip=\"If the userscript imported your pets' actual rolled modifiers, those are used and the normalisation inputs grey out. Untick to model a pet from iLevel / tier / roll instead.\">i</span></div>\n        <div class=\"fields\">\n          <label class=\"checkrow\"><input type=\"checkbox\" id=\"useLivePetInput\"><span>Use imported pet modifiers</span></label>\n          <label for=\"petILevelInput\">Pet iLevel</label>\n          <input type=\"number\" id=\"petILevelInput\" min=\"101\" max=\"10000000\" value=\"11000\">\n          <label for=\"petTierInput\">Tier</label>\n          <input type=\"number\" id=\"petTierInput\" min=\"1\" max=\"16\" value=\"16\">\n          <label for=\"petRollPercentileInput\">Roll percentile</label>\n          <input type=\"number\" id=\"petRollPercentileInput\" min=\"0\" max=\"100\" value=\"75\">\n        </div>\n        <div style=\"margin-top:.45rem\">\n          <div class=\"result\"><span class=\"k\">Added base gold</span><span class=\"v\" id=\"rollFlatOut\">&mdash;</span></div>\n          <div class=\"result\"><span class=\"k\">Increased base gold</span><span class=\"v\" id=\"rollPctOut\">&mdash;</span></div>\n          <div class=\"result\"><span class=\"k\">Potion effect</span><span class=\"v\" id=\"rollPotionOut\">&mdash;</span></div>\n        </div>\n        <p class=\"note\" id=\"petSourceNote\"></p>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Character boosts<span class=\"rule\"></span><span class=\"ico\" tabindex=\"0\" data-tip=\"If the userscript imported your stacked Gold Boost, that one measured number replaces the four components below and they grey out. It is the same figure as your Character > Boosts 'Gold Boost' card.\">i</span></div>\n        <div class=\"fields\">\n          <label class=\"checkrow\"><input type=\"checkbox\" id=\"useLiveGoldBoostInput\"><span>Use measured Gold Boost</span></label>\n          <label for=\"goldBoostInput\">Measured total %</label>\n          <input type=\"number\" id=\"goldBoostInput\" min=\"0\" max=\"10000000\" step=\"0.01\" value=\"0\">\n          <label for=\"enchantsInput\">Enchants %</label>\n          <input type=\"number\" id=\"enchantsInput\" min=\"0\" max=\"100000\" value=\"518\">\n          <label for=\"sculpturesInput\">Sculpture grid %</label>\n          <input type=\"number\" id=\"sculpturesInput\" min=\"0\" max=\"100000\" value=\"500\">\n          <label for=\"skillTreeInput\">Skill tree %</label>\n          <input type=\"number\" id=\"skillTreeInput\" min=\"0\" max=\"100000\" value=\"0\">\n          <label for=\"petGoldModInput\">Pets' Gold %<span class=\"ico\" tabindex=\"0\" data-tip=\"Your pets' own income>gold modifier - the boost registry lists pets as a source of gold separately from the Added/Increased Base Gold rolls that feed gold.base. Both are real and they are not the same number.\">i</span></label>\n          <input type=\"number\" id=\"petGoldModInput\" min=\"0\" max=\"100000\" value=\"0\">\n          <p class=\"note\" id=\"goldBoostNote\"></p>\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Village<span class=\"rule\"></span><span class=\"ico\" tabindex=\"0\" data-tip=\"Which of these reaches gold and which reaches Potion Effect is not a guess - it is tables/boost-sources.json, the game's own boost registry. Market and Exploration feed gold; Potent and Exploration feed Potion Effect; the two map tiles are separate multipliers on each.\">i</span></div>\n        <div class=\"fields\">\n          <label for=\"marketInput\">Market %</label>\n          <input type=\"number\" id=\"marketInput\" min=\"0\" max=\"100000\" value=\"320\">\n          <label for=\"villageInput\">Exploration %</label>\n          <input type=\"number\" id=\"villageInput\" min=\"0\" max=\"10000\" value=\"40\">\n          <label for=\"potentInput\">Potent %</label>\n          <input type=\"number\" id=\"potentInput\" min=\"0\" max=\"10000\" value=\"40\">\n          <label for=\"pvpGoldTileInput\">Gold tile %</label>\n          <input type=\"number\" id=\"pvpGoldTileInput\" min=\"0\" max=\"10000\" value=\"20\">\n          <label for=\"pvpPotionTileInput\">Potion Effect tile %</label>\n          <input type=\"number\" id=\"pvpPotionTileInput\" min=\"0\" max=\"10000\" value=\"4\">\n          <label for=\"taxInput\">Tax %<span class=\"ico\" tabindex=\"0\" data-tip=\"The share of party gold the village takes before you keep it. Derived automatically when the tracker can see both the gross and kept figures on a battle card; otherwise type it once and it is remembered.\">i</span></label>\n          <input type=\"number\" id=\"taxInput\" min=\"0\" max=\"100\" step=\"0.1\" value=\"0\">\n          <p class=\"note\">Exploration reaches both gold and Potion Effect; Potent reaches only Potion Effect.</p>\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Party<span class=\"rule\"></span><span class=\"ico\" tabindex=\"0\" data-tip=\"Pooled Base is the SUM of every member's own fully-stacked Gold Boost, not an average. At exactly 5 members the combined total takes a x0.8 penalty; 1-4 members take none.\">i</span></div>\n        <div class=\"fields\">\n          <label for=\"partyMembersInput\">Members</label>\n          <input type=\"number\" id=\"partyMembersInput\" min=\"1\" max=\"5\" value=\"4\">\n          <label class=\"checkrow\"><input type=\"checkbox\" id=\"othersSameInput\" checked><span>Party matches me</span></label>\n          <label for=\"othersGoldBoostInput\" id=\"partyAvgLabel\">Party average %</label>\n          <input type=\"number\" id=\"othersGoldBoostInput\" min=\"0\" max=\"1000000\" value=\"0\">\n          <p class=\"note\" id=\"partyNote\" hidden></p>\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Premium &amp; event<span class=\"rule\"></span></div>\n        <div class=\"fields\">\n          <label class=\"checkrow\"><input type=\"checkbox\" id=\"vipInput\" checked><span>VIP active (+10%)</span></label>\n          <label for=\"goldPotionInput\">Gold potion base %</label>\n          <input type=\"number\" id=\"goldPotionInput\" min=\"0\" max=\"10000\" value=\"10\">\n          <label for=\"eventInput\">Event %</label>\n          <input type=\"number\" id=\"eventInput\" min=\"0\" max=\"100000\" value=\"0\">\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"sec-label\">Calibration<span class=\"rule\"></span><span class=\"ico\" tabindex=\"0\" data-tip=\"Enter the gold/action you actually see in game. The sidebar shows the gap; the Formulas panel lists what each shape of gap points at.\">i</span></div>\n        <div class=\"fields\">\n          <label for=\"observedGoldInput\">Observed / action (B)</label>\n          <input type=\"number\" id=\"observedGoldInput\" min=\"0\" max=\"1000000000\" step=\"0.001\" value=\"0\">\n          <p class=\"note\">0 = off. Compared against the after-tax figure &mdash; the gold you actually keep, which is the honest measure of income.</p>\n        </div>\n      </div>\n    </div>\n  </aside>\n\n  <main>\n    <div class=\"verdict\" id=\"verdict\">\n      <div class=\"verdict-head\">\n        <span class=\"verdict-kicker\">Buy next</span>\n        <span class=\"verdict-answer\" id=\"verdictAnswer\">&mdash;</span>\n      </div>\n      <p id=\"verdictWhy\">&mdash;</p>\n      <p id=\"verdictBreak\">&mdash;</p>\n    </div>\n\n    <h3 class=\"sec\" id=\"breakpoint\">Breakpoint comparison</h3>\n    <p class=\"sec-sub\">Both slots share the <em>identical</em> cost curve <code>floor(500,000 &times; L&sup3;)</code> keyed on their own next level, so the only fair comparison is gold/action gained per gold spent.</p>\n\n    <div class=\"compare\">\n      <div class=\"box\" id=\"combatBox\">\n        <h5>Combat slot <span id=\"combatNextLbl\"></span><span class=\"tag win\" id=\"combatWinTag\" hidden>better</span></h5>\n        <div class=\"big\" id=\"combatComparBig\">&mdash;</div>\n        <div class=\"unit\">gold/action gained per 1B spent</div>\n        <dl>\n          <dt>Level cost</dt><dd id=\"combatStepCost\">&mdash;</dd>\n          <dt>Gold/action gained</dt><dd id=\"combatStepGain\">&mdash;</dd>\n          <dt>Pays back in</dt><dd id=\"combatStepBack\">&mdash;</dd>\n        </dl>\n        <p>Multiplies the dominant <code>gold.base</code> term directly.</p>\n      </div>\n      <div class=\"box\" id=\"utilityBox\">\n        <h5>Utility slot <span id=\"utilNextLbl\"></span><span class=\"tag win\" id=\"utilWinTag\" hidden>better</span></h5>\n        <div class=\"big\" id=\"utilComparBig\">&mdash;</div>\n        <div class=\"unit\">gold/action gained per 1B spent</div>\n        <dl>\n          <dt>Level cost</dt><dd id=\"utilStepCost\">&mdash;</dd>\n          <dt>Gold/action gained</dt><dd id=\"utilStepGain\">&mdash;</dd>\n          <dt>Pays back in</dt><dd id=\"utilStepBack\">&mdash;</dd>\n        </dl>\n        <p>Boosts one nested additive term three layers deep &mdash; much weaker leverage.</p>\n      </div>\n    </div>\n\n    <div class=\"panel\">\n      <h5>Where the two slots break even</h5>\n      <div class=\"tbl-wrap auto\"><table class=\"roi\">\n        <thead>\n          <tr class=\"cols\"><th>If combat slot is</th><th>Utility worth buying up to</th><th>Utility boost there</th><th>Cost of that utility level</th><th>Cost of the combat level</th></tr>\n        </thead>\n        <tbody id=\"crossTbody\"></tbody>\n      </table></div>\n      <p class=\"note\">Read a row as: <strong>at that combat level, every utility level up to the second column returns more gold per gold spent than the next combat level does</strong>. The column climbs in steps because a slot's rate steps up every 30 levels, so a utility level just past a boundary can briefly out-earn combat again.</p>\n    </div>\n\n    <div class=\"panel\">\n      <h5>Next 100 purchases, buying the better slot each time</h5>\n      <div class=\"strip\" id=\"planStrip\"></div>\n      <div class=\"legend\">\n        <span><i class=\"sw\" style=\"background:var(--warm);border:none\"></i> combat</span>\n        <span><i class=\"sw\" style=\"background:var(--accent);border:none\"></i> utility</span>\n        <span><i class=\"sw\" style=\"background:var(--surface);border-color:var(--success)\"></i> the flip</span>\n      </div>\n      <p class=\"note\" id=\"planNote\">&mdash;</p>\n    </div>\n\n    <h3 class=\"sec\" id=\"combat-table\">Combat pet slot ROI</h3>\n    <p class=\"sec-sub\">Utility pet held at your current input. Cumulative measured from your current combat slot level.</p>\n    <div class=\"tbl-wrap\" id=\"combatWrap\"><table class=\"roi\">\n      <thead>\n        <tr class=\"grp\"><th colspan=\"4\"></th><th colspan=\"2\">this level alone</th><th colspan=\"3\" class=\"sep\">cumulative from current</th></tr>\n        <tr class=\"cols\"><th>Slot</th><th>Boost</th><th>Gold / action</th><th>Level cost</th><th>Payback (actions)</th><th>Weeks</th><th class=\"sep\">Total cost</th><th>Payback (actions)</th><th>Weeks</th></tr>\n      </thead>\n      <tbody id=\"combatTbody\"></tbody>\n    </table></div>\n    <div class=\"tblfoot\">\n      <span class=\"count\" id=\"combatRowCount\"></span>\n      <button type=\"button\" class=\"btn\" id=\"combatExpandBtn\">Expand</button>\n      <button type=\"button\" class=\"btn\" id=\"combatMoreBtn\">+50</button>\n      <input type=\"number\" id=\"combatJumpInput\" min=\"0\" max=\"5000\" placeholder=\"to level\">\n      <button type=\"button\" class=\"btn\" id=\"combatJumpBtn\">Go</button>\n    </div>\n\n    <h3 class=\"sec\" id=\"utility-table\">Utility pet slot ROI</h3>\n    <p class=\"sec-sub\">Combat pet held at your current input. Only Potion Effect% changes with this slot &mdash; same cost curve, much weaker leverage.</p>\n    <div class=\"tbl-wrap\" id=\"utilityWrap\"><table class=\"roi\">\n      <thead>\n        <tr class=\"grp\"><th colspan=\"4\"></th><th colspan=\"2\">this level alone</th><th colspan=\"3\" class=\"sep\">cumulative from current</th></tr>\n        <tr class=\"cols\"><th>Slot</th><th>Boost</th><th>Gold / action</th><th>Level cost</th><th>Payback (actions)</th><th>Weeks</th><th class=\"sep\">Total cost</th><th>Payback (actions)</th><th>Weeks</th></tr>\n      </thead>\n      <tbody id=\"utilityTbody\"></tbody>\n    </table></div>\n    <div class=\"tblfoot\">\n      <span class=\"count\" id=\"utilityRowCount\"></span>\n      <button type=\"button\" class=\"btn\" id=\"utilityExpandBtn\">Expand</button>\n      <button type=\"button\" class=\"btn\" id=\"utilityMoreBtn\">+50</button>\n      <input type=\"number\" id=\"utilityJumpInput\" min=\"0\" max=\"5000\" placeholder=\"to level\">\n      <button type=\"button\" class=\"btn\" id=\"utilityJumpBtn\">Go</button>\n    </div>\n\n    <div class=\"legend\" style=\"margin:.6rem 0 1.5rem\">\n      <span><i class=\"sw\" style=\"background:var(--current)\"></i> your current slot level</span>\n      <span><i class=\"sw\" style=\"background:var(--band)\"></i> pays back in 2&ndash;4 weeks</span>\n      <span><i class=\"sw\" style=\"background:var(--surface);border-color:var(--success)\"></i> <span style=\"color:var(--success)\">green</span> = block boundary (31/61/91), rate steps up</span>\n    </div>\n\n    <details class=\"panel\" id=\"steps\">\n      <summary>Calculation steps <span class=\"s\">&mdash; how gold/action was derived, in order</span></summary>\n      <div class=\"panel-body\"><div class=\"calc\" id=\"ledger\"></div></div>\n    </details>\n\n    <details class=\"panel\" id=\"notes\">\n      <summary>Formulas &amp; notes <span class=\"s\">&mdash; assumptions, sources, where a gap comes from</span></summary>\n      <div class=\"panel-body\">\n        <h4>Where a gap between this model and your real gold/action comes from</h4>\n        <ul>\n          <li><strong>Compare the same figure.</strong> The game shows gold two ways &mdash; the pre-tax amount gained, and the amount <em>kept</em> after village tax. Both are correct; they are just not the same number. Set Tax% and this page shows both, so a mismatch is a real mismatch rather than a units problem. Tax is not a recorded fact in the core, so it defaults to 0.</li>\n          <li><strong>Party members' own boosts.</strong> Pooled Base is the <em>sum</em> of every member's fully-stacked Gold Boost. If they are not clones of you, untick &ldquo;Others match me&rdquo;. Usually the largest single source of drift.</li>\n          <li><strong>Party size.</strong> At exactly 5 members the combined total is multiplied by 0.8; 1&ndash;4 take no penalty.</li>\n          <li><strong>Categories once pinned at 0</strong> and editable now: skill-tree gold, the pets' own &ldquo;Gold&rdquo; modifier, event, and the gold potion's base value.</li>\n          <li>A stable <em>percentage</em> gap is a missing multiplier; a stable <em>absolute</em> gap points at the base terms or the monster level.</li>\n        </ul>\n        <h4>Assumptions</h4>\n        <ul>\n          <li><strong>Level costs are cumulative to reach a level, individual to buy one.</strong> Each level has its own price &mdash; <code>floor(500,000 &times; L&sup3;)</code> for the level you are buying into.</li>\n          <li><strong>Use the per-level column to decide where to stop.</strong> It is the correct marginal rule; cumulative is the budgeting view.</li>\n          <li>Both pet slots share the identical cost formula and the identical 30-level accelerating boost curve.</li>\n          <li>Every field is remembered in this browser only.</li>\n        </ul>\n        <h4>Generated from the core, not retyped here</h4>\n        <ul id=\"provenanceList\"></ul>\n        <h4>Why the utility pet is so much weaker</h4>\n        <ul>\n          <li>The combat pet's slot level multiplies <strong>monsterGoldFlat / monsterGoldPercentage directly</strong> &mdash; the dominant term in <code>gold.base</code>, which is then multiplied again by the party multiplier.</li>\n          <li>The utility pet's slot level only boosts its own <strong>raw Potion Effect roll</strong> &mdash; one additive term inside Potion Effect's Base, feeding a small Premium sub-term dwarfed by the pooled party Base it multiplies against.</li>\n        </ul>\n      </div>\n    </details>\n  </main>\n</div>\n\n<div id=\"tip\" role=\"tooltip\"></div>\n<div id=\"themeBar\" role=\"group\" aria-label=\"Theme\">\n  <button type=\"button\" data-set=\"light\" title=\"Beach — the light theme\"><i class=\"sw2\" style=\"background:#efe7d7\"></i>Beach</button>\n  <button type=\"button\" data-set=\"ink\" title=\"Ink — near-black, warm, almost no chroma\"><i class=\"sw2\" style=\"background:#0e0e0f\"></i>Ink</button>\n  <button type=\"button\" data-set=\"slate\" title=\"Slate — cool blue-grey, higher contrast\"><i class=\"sw2\" style=\"background:#0f1216\"></i>Slate</button>\n  <button type=\"button\" data-set=\"umber\" title=\"Umber — warm brown-black, the beach theme after dark\"><i class=\"sw2\" style=\"background:#14100c\"></i>Umber</button>\n</div>\n\n<script>\n/* GENERATED from data/ by userscripts/build.mjs — do not edit. */\nwindow.APOZ_FACTS = (function () {\n  /* formulas/pets.json :: pets.slotUpgrade.costFormula  [CODE] */\n  function petSlotUpgradeCost(currentLevel, newLevel) { let total = 0; for (let r = currentLevel + 1; r <= newLevel; r++) total += r <= 150 ? Math.floor(500000 * r**3) : Math.floor(500000 * 150**3 * (r/150)**15); return { currency: 'gold', value: total }; } // per-level marginal cost at level L->L+1: floor(500000*(L+1)^3) while L+1<=150, else floor(500000*150^3*((L+1)/150)^15). Exactly continuous at the seam: both branches evaluate to floor(500000*150^3) = 1,687,500,000,000 at r=150.\n  /* formulas/pets.json :: pets.slotUpgrade.boostFormula  [CODE] */\n  function petSlotBoostPercent(slotLevel) { let block = Math.floor(slotLevel / 30); let intoBlock = slotLevel % 30; if (block >= 5) return 0.3*5*6/2 + intoBlock*0.01*6; return 0.3*block*(block+1)/2 + intoBlock*0.01*(block+1); }\n  /* formulas/party.json :: party.fifthMemberPenalty.formula  [CODE] */\n  function partySizeMultiplier(memberCount) { return memberCount === 5 ? 0.8 : 1; }\n  /* formulas/economy.json :: gold.levelMultiplier  [LIVE] */\n  function goldLevelMultiplier(characterLevel) { return 1 + 0.0001 * characterLevel; }\n  /* tables/modifier-tiers.json :: tiers.pet.boostPercent  [CODE] */\n  const petTierBoostPercent = [10,20,30,40,50,60,70,80,90,100,125,150,170,190,210,230];\n  return { petSlotUpgradeCost, petSlotBoostPercent, partySizeMultiplier, goldLevelMultiplier, petTierBoostPercent };\n})();\n</script>\n<script>\n(function(){\n  \"use strict\";\n\n  var STORAGE_KEY = 'petSlotROI.inputs.v4';\n  var DEFAULTS_KEY = 'petSlotROI.defaults.v3';\n  var THEME_KEY = 'petSlotROI.theme';\n  var LEGACY_STORAGE = ['petSlotROI.inputs.v3','petSlotROI.inputs.v2'];\n  var LEGACY_DEFAULTS = ['petSlotROI.defaults.v2','petSlotROI.defaults.v1'];\n\n  var ORIGINAL_DEFAULTS = {\n    combat: 50, utility: 30,\n    enchants: 518, sculptures: 500, skillTree: 0, petGoldMod: 0,\n    market: 320, village: 40, potent: 40,\n    pvpGoldTile: 20, pvpPotionTile: 4, tax: 0, goldBoost: 0,\n    partyMembers: 4, othersGoldBoost: 0,\n    goldPotion: 10, event: 0,\n    monsterLevel: 230000, characterLevel: 11500, actionsPerWeek: 6000,\n    petILevel: 11000, petTier: 16, petRollPercentile: 75,\n    observedGold: 0\n  };\n  var DEFAULTS = Object.assign({}, ORIGINAL_DEFAULTS);\n  var CHECK_DEFAULTS = { vip: true, othersSame: true, useLivePet: false, useLiveGoldBoost: false };\n\n  var FIELD_IDS = {\n    combat: 'combatInput', utility: 'utilityInput',\n    enchants: 'enchantsInput', sculptures: 'sculpturesInput',\n    skillTree: 'skillTreeInput', petGoldMod: 'petGoldModInput',\n    market: 'marketInput', village: 'villageInput', potent: 'potentInput',\n    pvpGoldTile: 'pvpGoldTileInput', pvpPotionTile: 'pvpPotionTileInput', tax: 'taxInput',\n    goldBoost: 'goldBoostInput',\n    partyMembers: 'partyMembersInput', othersGoldBoost: 'othersGoldBoostInput',\n    goldPotion: 'goldPotionInput', event: 'eventInput',\n    monsterLevel: 'monsterLevelInput', characterLevel: 'characterLevelInput', actionsPerWeek: 'actionsPerWeekInput',\n    petILevel: 'petILevelInput', petTier: 'petTierInput', petRollPercentile: 'petRollPercentileInput',\n    observedGold: 'observedGoldInput'\n  };\n  var CHECK_IDS = { vip: 'vipInput', othersSame: 'othersSameInput',\n                    useLivePet: 'useLivePetInput', useLiveGoldBoost: 'useLiveGoldBoostInput' };\n  var VIP_PCT_WHEN_ON = 0.10;\n\n  // ---- core facts, all generated into window.APOZ_FACTS by the build ----\n  // slotBoostPercent is emitted from pets.slotUpgrade.boostFormula -- the PET\n  // curve, which stopped being the equipment one on 2026-09-07. Every call\n  // below is a pet slot (combat or utility), so there is no equipment caller\n  // here to keep on the old curve.\n  // Despite the name it returns a FRACTION, so *100 happens here and nowhere\n  // else. The percent form is always a whole number, so rounding is exact and\n  // is the only thing between the UI and \"+70.00000000000001%\".\n  function slotBoostPct(L){ return Math.round(APOZ_FACTS.petSlotBoostPercent(L) * 100); }\n  function stepCost(L){ return APOZ_FACTS.petSlotUpgradeCost(L - 1, L).value; }\n\n  function petTierMultiplier(tier){\n    var t = APOZ_FACTS.petTierBoostPercent;\n    tier = Math.max(1, Math.min(t.length, Math.round(tier)));\n    return 1 + t[tier-1]/100;\n  }\n  function petVariance(pct){ return 0.97 + Math.max(0, Math.min(100, pct))/100 * (1.03-0.97); }\n\n  // The pet's rolled modifiers. Either MODELLED from iLevel/tier/roll, or taken\n  // straight from what the userscript read off your actual pets. The modelled\n  // path is for normalised comparisons; the live path is your real answer, and\n  // when it is in use the modelling inputs grey out rather than being left to\n  // look as though they still matter.\n  function petRawRolls(p){\n    if (p.useLivePet && p.livePet) {\n      return { source: 'live',\n        rawFlat: p.livePet.flat, rawPct: p.livePet.pct, rawPotionEffect: p.livePet.potion };\n    }\n    var iL = Math.max(p.petILevel, 101);\n    var tm = petTierMultiplier(p.petTier);\n    var v = petVariance(p.petRollPercentile);\n    var base = Math.pow(iL-100, 0.49);\n    return { source: 'modelled',\n      rawFlat: Math.log(base+1) * 0.1 * v * tm,\n      rawPct: base * 0.005 * v * tm,\n      rawPotionEffect: base * 0.0025 * v * tm };\n  }\n\n  // ---- formatting ----\n  function fmt(n){\n    if (!isFinite(n)) return '—';\n    var u=[['Qa',1e15],['T',1e12],['B',1e9],['M',1e6],['K',1e3]];\n    for(var k=0;k<u.length;k++){ if (Math.abs(n)>=u[k][1]) return (n/u[k][1]).toFixed(2)+u[k][0]; }\n    return n.toFixed(0);\n  }\n  function fmtInt(n){ return isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—'; }\n  function P(x){ return (x*100).toFixed(2)+'%'; }\n  function weeks(w){ return !isFinite(w) ? '—' : w < 1 ? (w*7).toFixed(1)+' d' : w.toFixed(1)+' wk'; }\n  function clampLevel(v){ v = parseInt(v,10); if (isNaN(v)||v<0) v=0; return v>5000?5000:v; }\n  function num(v, fb){ v = parseFloat(v); return isNaN(v) ? fb : v; }\n\n  // ---- profile ----\n  // buildProfile() is pure: raw values in, normalised profile out. readInputs()\n  // is the only part that touches the DOM. That split is what lets\n  // tests/userscript-roi-math.mjs exercise the shipped arithmetic rather than a\n  // re-typed copy of it.\n  function buildProfile(raw){\n    raw = Object.assign({}, ORIGINAL_DEFAULTS,\n      { vipChecked: true, othersSame: true, useLivePet: false, useLiveGoldBoost: false, livePet: null }, raw);\n    raw.combat = clampLevel(raw.combat);\n    raw.utility = clampLevel(raw.utility);\n    if (raw.actionsPerWeek <= 0) raw.actionsPerWeek = 1;\n    if (raw.petILevel < 101) raw.petILevel = 101;\n    raw.partyMembers = Math.max(1, Math.min(5, Math.round(raw.partyMembers)));\n\n    var p = {\n      combat: raw.combat, utility: raw.utility,\n      partyMembers: raw.partyMembers,\n      othersSameAsMe: !!raw.othersSame,\n      othersGoldBoost: raw.othersGoldBoost/100,\n      vip: raw.vipChecked ? VIP_PCT_WHEN_ON : 0,\n      goldPotionBase: raw.goldPotion/100,\n      event: raw.event/100,\n      enchants: raw.enchants/100, sculptures: raw.sculptures/100,\n      skillTree: raw.skillTree/100, petGoldMod: raw.petGoldMod/100,\n      market: raw.market/100, pvpGoldTile: raw.pvpGoldTile/100,\n      village: raw.village/100, potent: raw.potent/100, pvpPotionTile: raw.pvpPotionTile/100,\n      tax: Math.max(0, Math.min(100, raw.tax))/100,\n      goldBoost: raw.goldBoost/100,\n      useLiveGoldBoost: !!raw.useLiveGoldBoost && raw.goldBoost > 0,\n      monsterLevel: raw.monsterLevel, characterLevel: raw.characterLevel,\n      actionsPerWeek: raw.actionsPerWeek,\n      petILevel: raw.petILevel, petTier: raw.petTier, petRollPercentile: raw.petRollPercentile,\n      useLivePet: !!raw.useLivePet, livePet: raw.livePet || null,\n      observedGold: raw.observedGold > 0 ? raw.observedGold * 1e9 : null\n    };\n    p.rolls = petRawRolls(p);\n    p.pooled = pooledBase(p);\n    p.levelMult = APOZ_FACTS.goldLevelMultiplier(p.characterLevel);\n    return p;\n  }\n\n  function readInputs(){\n    var raw = {}, key;\n    for (key in FIELD_IDS) raw[key] = num(document.getElementById(FIELD_IDS[key]).value, DEFAULTS[key]);\n    raw.vipChecked = document.getElementById(CHECK_IDS.vip).checked;\n    raw.othersSame = document.getElementById(CHECK_IDS.othersSame).checked;\n    raw.useLivePet = document.getElementById(CHECK_IDS.useLivePet).checked;\n    raw.useLiveGoldBoost = document.getElementById(CHECK_IDS.useLiveGoldBoost).checked;\n    raw.livePet = livePetModifiers;\n    return buildProfile(raw);\n  }\n\n  // ---- formula chain ----\n  // Your fully-stacked income>gold total — the number on the Character >\n  // Boosts \"Gold Boost\" card.\n  //\n  // When the userscript has measured it, that ONE number replaces the whole\n  // computation. It is deliberately not folded into any single component:\n  // adding a measured total to \"Enchants\" would double-count it against\n  // Market, Village and the rest, and the result would look plausible while\n  // being wrong by whatever those contribute.\n  //\n  // Village stays live even under the override, because it feeds Potion Effect\n  // as well as gold and only the gold half is being replaced.\n  function personalGoldTotal(p){\n    if (p.useLiveGoldBoost) return p.goldBoost;\n    var base = p.enchants + p.market + p.village + p.sculptures + p.skillTree + p.petGoldMod;\n    return (1+base)*(1+p.pvpGoldTile) - 1;\n  }\n  // party.gold.rewardBoostFormula: PooledBase is the SUM across members of each\n  // member's OWN fully-stacked personal total. party.fifthMemberPenalty.formula\n  // then applies x0.8 at exactly 5.\n  function pooledBase(p){\n    var mine = personalGoldTotal(p);\n    var others = (p.partyMembers - 1) * (p.othersSameAsMe ? mine : p.othersGoldBoost);\n    return (mine + others) * APOZ_FACTS.partySizeMultiplier(p.partyMembers);\n  }\n\n  // The hot path. A crossover scan evaluates this ~1,600 times per combat level\n  // examined, so it allocates nothing and reads values hoisted in buildProfile.\n  function partyMultAt(p, U){\n    var pe = p.rolls.rawPotionEffect * (1 + slotBoostPct(U)/100);\n    var potionEffectTotal = (1 + pe + p.potent + p.village + p.skillTree)*(1+p.pvpPotionTile) - 1;\n    var premium = p.vip + p.goldPotionBase*(1+potionEffectTotal);\n    return (1+p.pooled)*(1+premium)*(1+p.event);\n  }\n  function potionMix(p, U){\n    var pe = p.rolls.rawPotionEffect * (1 + slotBoostPct(U)/100);\n    // Potent + Exploration + skill tree, per the registry's income>potionEffect\n    // base group. The old model added Exploration TWICE as a stand-in for\n    // \"Exploration and Potent are about the same\" - they are separate sources\n    // and only one of them also reaches gold.\n    var potionEffectBase = pe + p.potent + p.village + p.skillTree;\n    var potionEffectTotal = (1+potionEffectBase)*(1+p.pvpPotionTile) - 1;\n    var goldPotionBonus = p.goldPotionBase*(1+potionEffectTotal);\n    return { petPotionEffect: pe, potionEffectBase: potionEffectBase,\n             potionEffectTotal: potionEffectTotal, goldPotionBonus: goldPotionBonus,\n             premium: p.vip + goldPotionBonus, mult: partyMultAt(p, U) };\n  }\n  function goldBaseAt(p, C){\n    var boost = 1 + slotBoostPct(C)/100;\n    return (3 + p.rolls.rawFlat*boost) * (1 + p.rolls.rawPct*boost) * p.monsterLevel;\n  }\n  function goldPerAction(p, C, U){ return goldBaseAt(p, C) * p.levelMult * partyMultAt(p, U); }\n  // What you actually keep. A flat tax scales both channels equally, so it never\n  // changes WHICH slot to buy - it only makes the number comparable to the\n  // game's own \"kept\" figure.\n  function keptPerAction(p, C, U){ return goldPerAction(p, C, U) * (1 - p.tax); }\n\n  // ---- marginal economics ----\n  function marginal(p, C, U, channel){\n    var next = (channel === 'combat' ? C : U) + 1;\n    var cost = stepCost(next);\n    var gain = channel === 'combat'\n      ? goldPerAction(p, C+1, U) - goldPerAction(p, C, U)\n      : goldPerAction(p, C, U+1) - goldPerAction(p, C, U);\n    return { level: next, cost: cost, gain: gain, eff: cost > 0 ? gain/cost : Infinity,\n             paybackActions: gain > 0 ? cost/gain : Infinity };\n  }\n\n  // Largest utility level at which utility still beats combat, for a fixed\n  // combat level. NOT an early-exit search: a slot's per-level rate steps up\n  // every 30 levels, so efficiency JUMPS at 30/60/90 and the winning set is not\n  // contiguous. Scanning the whole range is cheap and is the only correct way.\n  var CROSS_SCAN_CAP = 400;\n  function crossoverUtility(p, C, cap){\n    cap = cap || CROSS_SCAN_CAP;\n    if (!p._cross) p._cross = {};\n    if (p._cross[C] !== undefined) return p._cross[C];\n    var best = -1;\n    for (var U = 0; U <= cap; U++){\n      if (marginal(p, C, U, 'utility').eff >= marginal(p, C, U, 'combat').eff) best = U;\n    }\n    p._cross[C] = best;\n    return best;\n  }\n\n  function greedyPlan(p, steps){\n    var C = p.combat, U = p.utility, seq = [], total = 0, flipAt = -1, prev = null;\n    for (var i = 0; i < steps; i++){\n      var mc = marginal(p, C, U, 'combat'), mu = marginal(p, C, U, 'utility');\n      var pick = mu.eff > mc.eff ? 'utility' : 'combat';\n      var m = pick === 'combat' ? mc : mu;\n      if (prev !== null && pick !== prev && flipAt < 0) flipAt = i;\n      prev = pick; total += m.cost;\n      seq.push({ channel: pick, level: m.level, cost: m.cost });\n      if (pick === 'combat') C++; else U++;\n    }\n    return { seq: seq, total: total, flipAt: flipAt, endC: C, endU: U };\n  }\n\n  // ---- tooltips ----\n  // ONE fixed-position element, not a bubble inside each trigger. The old\n  // per-element bubbles were clipped by the sidebar's scroll container, which\n  // is unavoidable for an absolutely-positioned child of an overflow:auto\n  // ancestor. Fixed positioning escapes the container entirely.\n  var tipEl = null, tipFor = null;\n  function showTip(el){\n    var text = el.getAttribute('data-tip');\n    if (!text) return;\n    tipFor = el;\n    tipEl.textContent = text;\n    tipEl.classList.add('on');\n    var r = el.getBoundingClientRect();\n    var t = tipEl.getBoundingClientRect();\n    var left = Math.min(Math.max(8, r.left + r.width/2 - t.width/2), window.innerWidth - t.width - 8);\n    var top = r.top - t.height - 8;\n    if (top < 8) top = r.bottom + 8;   // flip below when there is no room above\n    tipEl.style.left = Math.round(left) + 'px';\n    tipEl.style.top = Math.round(top) + 'px';\n  }\n  function hideTip(){ tipFor = null; tipEl.classList.remove('on'); }\n  function initTips(){\n    tipEl = document.getElementById('tip');\n    document.addEventListener('mouseover', function(e){\n      var el = e.target && e.target.closest && e.target.closest('[data-tip]');\n      if (el) showTip(el);\n    });\n    document.addEventListener('mouseout', function(e){\n      var el = e.target && e.target.closest && e.target.closest('[data-tip]');\n      if (el && el === tipFor) hideTip();\n    });\n    document.addEventListener('focusin', function(e){\n      var el = e.target && e.target.closest && e.target.closest('[data-tip]');\n      if (el) showTip(el);\n    });\n    document.addEventListener('focusout', hideTip);\n    // A tooltip pinned to viewport coordinates is wrong the moment anything\n    // scrolls, and re-measuring on every scroll frame is not worth it.\n    window.addEventListener('scroll', hideTip, true);\n  }\n\n  // ---- calculation steps ----\n  function tipAttr(technical){ return technical.replace(/&/g,'&amp;').replace(/\"/g,'&quot;').replace(/</g,'&lt;'); }\n  function tipSpan(label, technical){\n    return '<span class=\"tip\" data-tip=\"' + tipAttr(technical) + '\">' + label + '</span>';\n  }\n  function buildLedger(p){\n    var C = p.combat, U = p.utility;\n    var mix = potionMix(p, U);\n    var gb = goldBaseAt(p, C);\n    var lm = p.levelMult;\n    var gpa = gb * lm * mix.mult;\n    var kept = gpa * (1 - p.tax);\n    var baseSum = p.enchants + p.market + p.village + p.sculptures + p.skillTree + p.petGoldMod;\n    var penalty = APOZ_FACTS.partySizeMultiplier(p.partyMembers);\n\n    document.getElementById('headlineGold').textContent = fmt(gpa);\n    var keptRow = document.getElementById('keptRow');\n    keptRow.hidden = !p.tax;\n    if (p.tax) document.getElementById('keptGold').textContent = fmt(kept);\n    document.getElementById('combatBoostOut').textContent = '+' + slotBoostPct(C) + '%';\n    document.getElementById('utilityBoostOut').textContent = '+' + slotBoostPct(U) + '%';\n\n    document.getElementById('rollFlatOut').textContent = p.rolls.rawFlat.toFixed(3);\n    document.getElementById('rollPctOut').textContent = P(p.rolls.rawPct);\n    document.getElementById('rollPotionOut').textContent = P(p.rolls.rawPotionEffect);\n    document.getElementById('petSourceNote').textContent = p.rolls.source === 'live'\n      ? (livePetModifiers && livePetModifiers.atSlot !== undefined\n          ? 'Derived from your live merged modifiers at combat slot ' + livePetModifiers.atSlot +\n            ', with the slot boost divided back out. Exact if your pet is the only source of these.'\n          : 'From your imported pets, before the slot boost.')\n      : 'Modelled from iLevel / tier / roll, before the slot boost.';\n\n    // 5 x 0.8 = 4 exactly, so a 5th member who matches you is worth precisely\n    // nothing to pooled gold - not obvious from either rule on its own.\n    var partyNote = document.getElementById('partyNote');\n    if (p.partyMembers === 5){\n      var withoutFifth = p.othersSameAsMe ? 4*personalGoldTotal(p) : personalGoldTotal(p) + 3*p.othersGoldBoost;\n      var fifthWorth = p.pooled - withoutFifth;\n      partyNote.innerHTML = Math.abs(fifthWorth) < 1e-9\n        ? '<strong>The 5th member is exactly break-even for gold</strong> — 5 &times; 0.8 = 4. They only pay for themselves if their own Gold Boost beats a quarter of the other four’s total.'\n        : fifthWorth > 0\n          ? '5th member adds <strong>+' + P(fifthWorth) + '</strong> to Pooled Base after the &times;0.8 penalty.'\n          : '5th member <strong>costs</strong> ' + P(-fifthWorth) + ' of Pooled Base — the penalty outweighs them.';\n      partyNote.hidden = false;\n    } else { partyNote.hidden = true; }\n\n    var calibRow = document.getElementById('calibRow');\n    if (p.observedGold){\n      var d = kept - p.observedGold;\n      var el = document.getElementById('calibOut');\n      el.textContent = (d >= 0 ? '+' : '−') + fmt(Math.abs(d)) + ' (' + (d/p.observedGold*100).toFixed(1) + '%)';\n      el.className = 'v ' + (Math.abs(d/p.observedGold) < 0.01 ? 'good' : 'off');\n      calibRow.hidden = false;\n    } else { calibRow.hidden = true; }\n\n    var steps = [\n      ['Personal Gold Boost', 'mirrors Character > Boosts > \"Gold Boost\" - per member, pre-pool',\n       '(1+' + P(baseSum) + ')x(1+' + P(p.pvpGoldTile) + ' PvP)-1', P(personalGoldTotal(p))],\n      ['Party Pooling', 'party.gold.rewardBoostFormula - the sum of each member’s own total',\n       (p.othersSameAsMe ? P(personalGoldTotal(p)) + 'x' + p.partyMembers\n                         : 'me ' + P(personalGoldTotal(p)) + ' + ' + (p.partyMembers-1) + 'x' + P(p.othersGoldBoost))\n       + (penalty !== 1 ? ' x' + penalty + ' (5-member penalty)' : ''), P(p.pooled)],\n      ['Potion Effect', 'Utility pet, slot ' + U,\n       'pet + potent + exploration + skill tree, x(1+tile)', P(mix.potionEffectTotal)],\n      ['Gold Potion to Premium', 'goldPotionBase x (1+potionEffectTotal), feeds Premium with VIP',\n       p.goldPotionBase.toFixed(2) + 'x(1+' + P(mix.potionEffectTotal) + ') + VIP ' + P(p.vip), P(mix.premium)],\n      ['Party Gold Multiplier', '(1+Pooled)(1+Premium)(1+Event)',\n       '(1+' + P(p.pooled) + ')x(1+' + P(mix.premium) + ')x(1+' + P(p.event) + ')', 'x' + mix.mult.toFixed(2)],\n      ['Monster Gold Base', 'Combat pet, slot ' + C,\n       '(3+rawFlat x boost)x(1+rawPct x boost)x' + fmtInt(p.monsterLevel), fmt(gb)]\n    ];\n    var html = '';\n    for (var i = 0; i < steps.length; i++){\n      html += '<div class=\"step\"><span class=\"step-n\">' + (i+1) + '</span>'\n        + '<span class=\"l\">' + tipSpan(steps[i][0], steps[i][1]) + '</span>'\n        + '<span class=\"e\">' + steps[i][2] + '</span>'\n        + '<span class=\"v\">' + steps[i][3] + '</span></div>';\n    }\n    html += '<div class=\"step final\"><span class=\"step-n\">' + (steps.length+1) + '</span>'\n      + '<span class=\"l\">' + tipSpan('Gold / Party Action', 'gold.base x level mult (1+0.0001 x characterLevel) x party mult') + '</span>'\n      + '<span class=\"e\">' + fmt(gb) + 'x' + lm.toFixed(2) + 'x' + mix.mult.toFixed(2) + '</span>'\n      + '<span class=\"v\">' + fmt(gpa) + '</span></div>';\n    if (p.tax) {\n      html += '<div class=\"step final\"><span class=\"step-n\">' + (steps.length+2) + '</span>'\n        + '<span class=\"l\">' + tipSpan('Kept after tax', 'true income - what reaches your gold after the village takes its share') + '</span>'\n        + '<span class=\"e\">' + fmt(gpa) + ' x (1-' + P(p.tax) + ')</span>'\n        + '<span class=\"v\">' + fmt(kept) + '</span></div>';\n    }\n    document.getElementById('ledger').innerHTML = html;\n  }\n\n  // ---- breakpoint ----\n  function buildBreakpoint(p){\n    var mc = marginal(p, p.combat, p.utility, 'combat');\n    var mu = marginal(p, p.combat, p.utility, 'utility');\n    var combatWins = mc.eff >= mu.eff;\n\n    function fill(prefix, m, boxId, tagId){\n      document.getElementById(prefix + 'ComparBig').textContent = (m.eff*1e9).toFixed(m.eff*1e9 < 10 ? 2 : 0);\n      document.getElementById(prefix + 'StepCost').textContent = fmt(m.cost);\n      document.getElementById(prefix + 'StepGain').textContent = fmt(m.gain);\n      document.getElementById(prefix + 'StepBack').textContent =\n        weeks(m.paybackActions / p.actionsPerWeek) + ' (' + fmtInt(m.paybackActions) + ')';\n      document.getElementById(boxId).classList.toggle('win', (prefix === 'combat') === combatWins);\n      document.getElementById(tagId).hidden = (prefix === 'combat') !== combatWins;\n    }\n    document.getElementById('combatNextLbl').textContent = '→ ' + mc.level;\n    document.getElementById('utilNextLbl').textContent = '→ ' + mu.level;\n    fill('combat', mc, 'combatBox', 'combatWinTag');\n    fill('util', mu, 'utilityBox', 'utilWinTag');\n\n    var ratio = combatWins ? (mu.eff > 0 ? mc.eff/mu.eff : Infinity) : (mc.eff > 0 ? mu.eff/mc.eff : Infinity);\n    var ans = document.getElementById('verdictAnswer');\n    ans.textContent = combatWins ? 'COMBAT → ' + mc.level : 'UTILITY → ' + mu.level;\n    ans.classList.toggle('util', !combatWins);\n    document.getElementById('verdictWhy').innerHTML =\n      'At combat <strong>' + p.combat + '</strong> / utility <strong>' + p.utility + '</strong>, the next <strong>' +\n      (combatWins ? 'combat' : 'utility') + '</strong> level returns <strong>' +\n      (isFinite(ratio) ? ratio.toFixed(1) + '×' : '∞') + '</strong> more gold/action per gold spent. It costs ' +\n      fmt((combatWins?mc:mu).cost) + ' and pays back in ' + weeks((combatWins?mc:mu).paybackActions / p.actionsPerWeek) + '.';\n\n    var bp = crossoverUtility(p, p.combat);\n    document.getElementById('verdictBreak').innerHTML = bp < 0\n      ? 'Break-even is behind you: at combat <strong>' + p.combat + '</strong>, no utility level beats the next combat level.'\n      : 'Break-even: at combat <strong>' + p.combat + '</strong>, utility is worth buying up to <strong>' + bp + '</strong>' +\n        (p.utility <= bp ? ' — you are at ' + p.utility + ', so ' + (bp - p.utility) + ' worthwhile level' + (bp-p.utility===1?'':'s') + ' remain.'\n                         : ' — you are already past it at ' + p.utility + '.');\n\n    var ladder = [0,30,60,90,120,150,180,210,240];\n    if (ladder.indexOf(p.combat) < 0) ladder.push(p.combat);\n    ladder.sort(function(a,b){ return a-b; });\n    var rows = '';\n    for (var i = 0; i < ladder.length; i++){\n      var C = ladder[i], u = crossoverUtility(p, C), isCur = C === p.combat;\n      rows += '<tr class=\"' + (isCur ? 'current' : '') + '\">' +\n        '<td class=\"lvl\">' + C + (isCur ? ' <span class=\"tag\">you</span>' : '') + '</td>' +\n        '<td>' + (u < 0 ? 'none — combat always wins' : u) + '</td>' +\n        '<td>' + (u < 0 ? '—' : '+' + slotBoostPct(u) + '%') + '</td>' +\n        '<td>' + (u < 1 ? '—' : fmt(stepCost(u))) + '</td>' +\n        '<td>' + fmt(stepCost(C+1)) + '</td></tr>';\n    }\n    document.getElementById('crossTbody').innerHTML = rows;\n\n    var PLAN_STEPS = 100, plan = greedyPlan(p, PLAN_STEPS), strip = '';\n    for (var j = 0; j < plan.seq.length; j++){\n      var s = plan.seq[j];\n      strip += '<div class=\"cell ' + (s.channel === 'combat' ? 'c' : 'u') + (j === plan.flipAt ? ' flip' : '') +\n        '\" data-tip=\"#' + (j+1) + ' — ' + s.channel + ' slot level ' + s.level + ', ' + fmt(s.cost) + ' gold\">' + s.level + '</div>';\n    }\n    document.getElementById('planStrip').innerHTML = strip;\n    var nC = plan.seq.filter(function(s){ return s.channel === 'combat'; }).length;\n    var goldNow = keptPerAction(p, p.combat, p.utility);\n    document.getElementById('planNote').innerHTML =\n      '<strong>' + nC + ' combat</strong> and <strong>' + (PLAN_STEPS - nC) + ' utility</strong> levels, ending at combat ' +\n      plan.endC + ' / utility ' + plan.endU + '. Total ' + fmt(plan.total) + ' gold — about ' +\n      weeks(plan.total / goldNow / p.actionsPerWeek) + ' of income at ' + fmt(goldNow) + '/action kept and ' +\n      fmtInt(p.actionsPerWeek) + ' actions a week. ' +\n      (plan.flipAt < 0 ? 'No flip inside this window.' : 'First flip at purchase <strong>#' + (plan.flipAt + 1) + '</strong>.');\n  }\n\n  // ---- ROI tables ----\n  function buildTableRows(p, sweepFn, currentLevel, maxLevel){\n    var rows = [], cur = clampLevel(currentLevel), gAtCur = sweepFn(cur), cum = 0;\n    var topLevel = Math.max(maxLevel, cur), prevGold = null;\n    for (var L = 0; L <= topLevel; L++){\n      var gold = sweepFn(L);\n      var cost = L === 0 ? 0 : stepCost(L);\n      var marg = L === 0 ? 0 : gold - prevGold;\n      prevGold = gold;\n      var margAct = L === 0 ? null : cost/marg, cumCost = null, cumAct = null;\n      if (L > cur){ cum += cost; cumCost = cum; cumAct = cum/(gold - gAtCur); }\n      var cls = [];\n      if (L === cur) cls.push('current');\n      if (L > 0 && L % 30 === 1) cls.push('boundary');\n      var mw = margAct ? margAct/p.actionsPerWeek : null;\n      if (mw !== null && mw >= 2 && mw <= 4) cls.push('band');\n      rows.push('<tr class=\"'+cls.join(' ')+'\"'+(L===cur?' data-current=\"1\"':'')+'>' +\n        '<td class=\"lvl\">'+L+(L===cur?' <span class=\"tag\">current</span>':'')+'</td>' +\n        '<td>'+slotBoostPct(L)+'%</td><td>'+fmt(gold)+'</td>' +\n        '<td>'+(L===0?'—':fmt(cost))+'</td>' +\n        '<td>'+(margAct===null?'—':fmtInt(margAct))+'</td>' +\n        '<td>'+(mw===null?'—':mw.toFixed(2))+'</td>' +\n        '<td class=\"sep\">'+(cumCost===null?'—':fmt(cumCost))+'</td>' +\n        '<td>'+(cumAct===null?'—':fmtInt(cumAct))+'</td>' +\n        '<td>'+(cumAct===null?'—':(cumAct/p.actionsPerWeek).toFixed(2))+'</td></tr>');\n    }\n    return { html: rows.join(''), count: rows.length, top: topLevel };\n  }\n\n  // Put the user's current level where they can see it, with a few rows of\n  // context above and the rest - the levels they might actually buy - below.\n  function scrollToCurrent(wrapId){\n    var wrap = document.getElementById(wrapId);\n    if (!wrap) return;\n    var row = wrap.querySelector('tr[data-current]');\n    if (!row) return;\n    var head = wrap.querySelector('thead');\n    var headH = head ? head.getBoundingClientRect().height : 0;\n    wrap.scrollTop = Math.max(0, row.offsetTop - headH - row.offsetHeight * 4);\n  }\n\n  var combatMaxLevel = 200, utilityMaxLevel = 200;\n  var MAX_LEVEL_CAP = 5000;\n  var pendingScroll = true;\n\n  // Coalesced through rAF: typing fires `input` per keystroke and a full render\n  // rebuilds two tables plus a 400-step crossover scan. rAF never fires in a\n  // hidden tab, so a page opened into the background falls back to a timeout\n  // rather than sitting blank until it is looked at.\n  var renderQueued = false;\n  function requestRender(){\n    if (renderQueued) return;\n    renderQueued = true;\n    var run = function(){ renderQueued = false; render(); };\n    if (document.hidden) setTimeout(run, 0); else requestAnimationFrame(run);\n  }\n  var saveTimer = null;\n  function requestSave(){\n    clearTimeout(saveTimer);\n    saveTimer = setTimeout(function(){\n      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collectRawValues())); } catch(e){}\n    }, 800);\n  }\n\n  function render(){\n    var p = readInputs();\n    syncPetInputsEnabled();\n    buildLedger(p);\n    buildBreakpoint(p);\n\n    var c = buildTableRows(p, function(L){ return goldPerAction(p, L, p.utility); }, p.combat, combatMaxLevel);\n    var u = buildTableRows(p, function(L){ return goldPerAction(p, p.combat, L); }, p.utility, utilityMaxLevel);\n    document.getElementById('combatTbody').innerHTML = c.html;\n    document.getElementById('utilityTbody').innerHTML = u.html;\n    document.getElementById('combatRowCount').textContent = 'levels 0–' + c.top;\n    document.getElementById('utilityRowCount').textContent = 'levels 0–' + u.top;\n    document.getElementById('combatMoreBtn').disabled = combatMaxLevel >= MAX_LEVEL_CAP;\n    document.getElementById('utilityMoreBtn').disabled = utilityMaxLevel >= MAX_LEVEL_CAP;\n\n    // Only on load and on apply - re-scrolling on every keystroke would fight\n    // the user while they read.\n    if (pendingScroll){ pendingScroll = false; scrollToCurrent('combatWrap'); scrollToCurrent('utilityWrap'); }\n    requestSave();\n  }\n\n  // ---- persistence ----\n  function collectRawValues(){\n    var out = {}, key;\n    for (key in FIELD_IDS) out[key] = document.getElementById(FIELD_IDS[key]).value;\n    for (key in CHECK_IDS) out['chk_' + key] = document.getElementById(CHECK_IDS[key]).checked;\n    return out;\n  }\n  function applyRawValues(vals){\n    var key;\n    for (key in FIELD_IDS) if (vals[key] !== undefined) document.getElementById(FIELD_IDS[key]).value = vals[key];\n    for (key in CHECK_IDS){\n      if (vals['chk_' + key] !== undefined) document.getElementById(CHECK_IDS[key]).checked = !!vals['chk_' + key];\n      else if (key === 'vip' && vals.vipChecked !== undefined) document.getElementById(CHECK_IDS[key]).checked = !!vals.vipChecked;\n    }\n  }\n  function applyDefaults(){\n    var key;\n    for (key in FIELD_IDS) document.getElementById(FIELD_IDS[key]).value = DEFAULTS[key];\n    for (key in CHECK_IDS) document.getElementById(CHECK_IDS[key]).checked = CHECK_DEFAULTS[key];\n    combatMaxLevel = 200; utilityMaxLevel = 200; pendingScroll = true;\n  }\n  function readStored(keys){\n    for (var i = 0; i < keys.length; i++){\n      try { var raw = localStorage.getItem(keys[i]); if (raw) return JSON.parse(raw); } catch(e){}\n    }\n    return null;\n  }\n  function saveAsDefault(){\n    var raw = collectRawValues();\n    for (var key in FIELD_IDS) DEFAULTS[key] = num(raw[key], DEFAULTS[key]);\n    try { localStorage.setItem(DEFAULTS_KEY, JSON.stringify(DEFAULTS)); } catch(e){}\n    flash(document.getElementById('saveDefaultBtn'), 'Saved ✓');\n  }\n  function flash(btn, text){\n    var original = btn.textContent;\n    btn.textContent = text;\n    setTimeout(function(){ btn.textContent = original; }, 1400);\n  }\n\n  // ---- live import ----\n  // Every entry is optional and carries its own source string; a field that\n  // could not be read is ABSENT rather than defaulted. Nothing is guessed - a\n  // plausible wrong input changes the recommendation without looking like it.\n  var LIVE_MAP = {\n    combat:          { label: 'Combat slot',       field: 'combat' },\n    utility:         { label: 'Utility slot',      field: 'utility' },\n    characterLevel:  { label: 'Character level',   field: 'characterLevel' },\n    monsterLevel:    { label: 'Monster level',     field: 'monsterLevel' },\n    partyMembers:    { label: 'Party members',     field: 'partyMembers' },\n    othersGoldBoost: { label: 'Party average', field: 'othersGoldBoost', suffix: '%' },\n    goldBoost:       { label: 'Your gold boost',   field: 'goldBoost', suffix: '%' },\n    actionsPerWeek:  { label: 'Actions / week',    field: 'actionsPerWeek' },\n    tax:             { label: 'Village tax',       field: 'tax', suffix: '%' },\n    observedGold:    { label: 'Observed gold/act', field: 'observedGold', scale: 1e-9, suffix: 'B' }\n  };\n  var liveData = null;\n  var livePetModifiers = null;\n  var livePartyMembers = null;   // [{ name, gold }] - see renderPartyAverageTip()\n  var livePartyMe = null;        // which of them is you, so the average excludes you\n\n  function initLive(){\n    var card = document.getElementById('liveCard');\n    var src = (typeof window !== 'undefined' && window.APOZ_LIVE) || null;\n    if (!src || !src.fields) return;\n\n    if (src.pet && typeof src.pet.flat === 'number' && typeof src.pet.pct === 'number') {\n      livePetModifiers = { flat: src.pet.flat, pct: src.pet.pct, potion: src.pet.potion || 0,\n                           atSlot: src.pet.atSlot };\n    }\n    if (src.party && Array.isArray(src.party.members)) {\n      livePartyMembers = src.party.members;\n      livePartyMe = src.party.me || null;\n    }\n    var keys = Object.keys(src.fields).filter(function(k){\n      return LIVE_MAP[k] && src.fields[k] && typeof src.fields[k].value === 'number' && isFinite(src.fields[k].value);\n    });\n    if (!keys.length && !livePetModifiers) return;\n\n    liveData = src;\n    card.classList.add('on');\n    var ageMin = src.ts ? Math.round((Date.now() - src.ts)/60000) : null;\n    document.getElementById('liveWhen').textContent = ageMin === null ? '' : (ageMin < 1 ? 'just now' : ageMin + 'm ago');\n    document.getElementById('liveEmpty').hidden = true;\n    document.getElementById('liveActions').hidden = false;\n\n    var html = keys.map(function(k){\n      var m = LIVE_MAP[k], f = src.fields[k], v = f.value * (m.scale || 1);\n      return '<span class=\"k\" data-tip=\"' + tipAttr(f.from || '') + '\">' + m.label + '</span>' +\n        '<span class=\"v\">' + (Math.abs(v) >= 1000 ? fmtInt(v) : (Math.round(v*100)/100)) + (m.suffix || '') + '</span>';\n    }).join('');\n    if (livePetModifiers) html += '<span class=\"k\">Pet modifiers</span><span class=\"v\">imported</span>';\n    document.getElementById('liveList').innerHTML = html;\n\n    document.getElementById('liveApplyBtn').addEventListener('click', function(){\n      applyLive();\n      flash(document.getElementById('liveApplyBtn'), 'Applied ✓');\n    });\n  }\n\n  function applyLive(){\n    if (!liveData) return;\n    for (var k in liveData.fields){\n      var m = LIVE_MAP[k];\n      if (!m) continue;\n      var f = liveData.fields[k];\n      if (!f || typeof f.value !== 'number' || !isFinite(f.value)) continue;\n      var el = document.getElementById(FIELD_IDS[m.field]);\n      if (el) el.value = String(Math.round(f.value * (m.scale || 1) * 1000) / 1000);\n    }\n    if (liveData.fields.othersGoldBoost) document.getElementById(CHECK_IDS.othersSame).checked = false;\n    if (livePetModifiers) document.getElementById(CHECK_IDS.useLivePet).checked = true;\n    if (liveData.fields.goldBoost) document.getElementById(CHECK_IDS.useLiveGoldBoost).checked = true;\n    pendingScroll = true;\n    requestRender();\n  }\n\n  // Each member on its own line, then the average that the model actually\n  // uses. Showing only the average invites \"where did that come from\" every\n  // time it looks wrong; showing the inputs and the arithmetic answers it\n  // before it is asked.\n  function renderPartyAverageTip(){\n    var label = document.getElementById('partyAvgLabel');\n    if (!label) return;\n    if (!livePartyMembers || !livePartyMembers.length){\n      label.removeAttribute('data-tip');\n      label.classList.remove('tip');\n      return;\n    }\n    // Show the working, and show the RIGHT average. The field holds the average\n    // of the OTHER members, because this page models you from your own boosts\n    // and multiplies the rest by (members - 1) — averaging you in as well would\n    // count you twice. A tooltip that quietly showed the all-members average\n    // next to a field holding a different number is worse than none.\n    var lines = [], sum = 0, n = 0;\n    for (var i = 0; i < livePartyMembers.length; i++){\n      var m = livePartyMembers[i];\n      var pct = m.gold * 100;\n      var isMe = livePartyMe && m.name === livePartyMe;\n      if (!isMe){ sum += pct; n++; }\n      lines.push((isMe ? '• ' : '  ') + m.name + '   ' + pct.toFixed(1) + '%' + (isMe ? '   (you)' : ''));\n    }\n    lines.push('');\n    lines.push(n\n      ? 'average of the other ' + n + '   ' + (sum / n).toFixed(1) + '%'\n      : 'average   ' + (sum / livePartyMembers.length).toFixed(1) + '%');\n    if (n) lines.push('(you are modelled from your own boosts above)');\n    label.setAttribute('data-tip', lines.join('\\n'));\n    label.classList.add('tip');\n  }\n\n  // Greying out is the honest signal: when real pet data is in use, the\n  // normalisation inputs are not contributing and should not look as if they are.\n  function syncPetInputsEnabled(){\n    var live = document.getElementById(CHECK_IDS.useLivePet);\n    live.disabled = !livePetModifiers;\n    var on = live.checked && !!livePetModifiers;\n    ['petILevel','petTier','petRollPercentile'].forEach(function(k){\n      document.getElementById(FIELD_IDS[k]).disabled = on;\n    });\n\n    // Same honesty rule for the gold-boost override: when one measured number\n    // is doing the work, the components must not look as though they are.\n    var gbCheck = document.getElementById(CHECK_IDS.useLiveGoldBoost);\n    var gbValue = num(document.getElementById(FIELD_IDS.goldBoost).value, 0);\n    gbCheck.disabled = !(gbValue > 0);\n    var gbOn = gbCheck.checked && gbValue > 0;\n    ['enchants','sculptures','skillTree','petGoldMod','market','pvpGoldTile'].forEach(function(k){\n      document.getElementById(FIELD_IDS[k]).disabled = gbOn;\n    });\n    document.getElementById('goldBoostNote').textContent = gbOn\n      ? 'Measured total in use — these components are ignored. Village still feeds Potion Effect.'\n      : (gbValue > 0 ? 'A measured total is available; tick to use it instead of the components.' : '');\n  }\n\n  function initProvenance(){\n    var ul = document.getElementById('provenanceList');\n    var names = (window.APOZ_FACTS && Object.keys(window.APOZ_FACTS)) || [];\n    ul.innerHTML = names.length\n      ? names.map(function(n){ return '<li><code>' + n + '</code></li>'; }).join('') +\n        '<li>Emitted into this page by <code>userscripts/build.mjs</code> from <code>data/</code>. Correct the fact in the core and rebuild — nothing here is retyped.</li>'\n      : '<li>This copy was opened without the generated facts block.</li>';\n  }\n\n  // Four choices, one of which is light. The dark ones are separate palettes\n  // rather than shades of each other, so switching is a real comparison.\n  var DARK_DEFAULT = 'ink';\n  function initTheme(){\n    var bar = document.getElementById('themeBar');\n    var stored = null;\n    try { stored = localStorage.getItem(THEME_KEY); } catch(e){}\n    apply(stored || 'auto');\n\n    function apply(choice){\n      var root = document.documentElement;\n      if (choice === 'light'){\n        root.setAttribute('data-theme', 'light');\n        root.setAttribute('data-dark', DARK_DEFAULT);   // ready for the next dark pick\n      } else if (choice === 'auto'){\n        root.removeAttribute('data-theme');             // follow the OS\n        root.setAttribute('data-dark', DARK_DEFAULT);\n      } else {\n        root.setAttribute('data-theme', 'dark');\n        root.setAttribute('data-dark', choice);\n      }\n      mark(choice);\n    }\n    function mark(choice){\n      var osDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;\n      var effective = choice === 'auto' ? (osDark ? DARK_DEFAULT : 'light') : choice;\n      var buttons = bar.querySelectorAll('button');\n      for (var i = 0; i < buttons.length; i++){\n        buttons[i].classList.toggle('on', buttons[i].getAttribute('data-set') === effective);\n      }\n    }\n    bar.addEventListener('click', function(e){\n      var btn = e.target.closest && e.target.closest('button[data-set]');\n      if (!btn) return;\n      var choice = btn.getAttribute('data-set');\n      apply(choice);\n      try { localStorage.setItem(THEME_KEY, choice); } catch(e2){}\n    });\n  }\n\n  function extend(which, by, to){\n    if (which === 'combat') combatMaxLevel = Math.min(MAX_LEVEL_CAP, to !== undefined ? to : combatMaxLevel + by);\n    else utilityMaxLevel = Math.min(MAX_LEVEL_CAP, to !== undefined ? to : utilityMaxLevel + by);\n    requestRender();\n  }\n\n  function init(){\n    var savedDefaults = readStored([DEFAULTS_KEY].concat(LEGACY_DEFAULTS));\n    if (savedDefaults) for (var dk in DEFAULTS) if (savedDefaults[dk] !== undefined) DEFAULTS[dk] = savedDefaults[dk];\n\n    applyDefaults();\n    var saved = readStored([STORAGE_KEY].concat(LEGACY_STORAGE));\n    if (saved) applyRawValues(saved);\n\n    for (var key in FIELD_IDS) document.getElementById(FIELD_IDS[key]).addEventListener('input', requestRender);\n    for (var ckey in CHECK_IDS) document.getElementById(CHECK_IDS[ckey]).addEventListener('change', requestRender);\n\n    document.getElementById('resetBtn').addEventListener('click', function(){ applyDefaults(); requestRender(); });\n    document.getElementById('saveDefaultBtn').addEventListener('click', saveAsDefault);\n\n    [['combat','combatWrap'],['utility','utilityWrap']].forEach(function(pair){\n      var which = pair[0], wrapId = pair[1];\n      document.getElementById(which + 'MoreBtn').addEventListener('click', function(){ extend(which, 50); });\n      document.getElementById(which + 'JumpBtn').addEventListener('click', function(){\n        var v = clampLevel(document.getElementById(which + 'JumpInput').value);\n        if (v > 0) extend(which, 0, v);\n      });\n      document.getElementById(which + 'JumpInput').addEventListener('keydown', function(e){\n        if (e.key === 'Enter') document.getElementById(which + 'JumpBtn').click();\n      });\n      // One-time expansion to fit the viewport, leaving room for the header and\n      // the controls. Not a drag handle, not incremental steps.\n      var btn = document.getElementById(which + 'ExpandBtn');\n      btn.addEventListener('click', function(){\n        var wrap = document.getElementById(wrapId);\n        var tall = wrap.classList.toggle('tall');\n        btn.textContent = tall ? 'Shrink' : 'Expand';\n        scrollToCurrent(wrapId);\n      });\n    });\n\n    initTips();\n    initLive();\n    renderPartyAverageTip();\n    initProvenance();\n    initTheme();\n    render();\n  }\n\n  // Named so it is obvious at any call site that this is a test seam, not an\n  // API - same reasoning as Core's __modulesForTest.\n  window.__PARTY_GOLD_ROI_FOR_TEST = {\n    buildProfile: buildProfile, goldPerAction: goldPerAction, keptPerAction: keptPerAction,\n    marginal: marginal, crossoverUtility: crossoverUtility, greedyPlan: greedyPlan,\n    slotBoostPct: slotBoostPct, stepCost: stepCost,\n    personalGoldTotal: personalGoldTotal, pooledBase: pooledBase\n  };\n\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);\n  else init();\n})();\n</script>\n";

  // Tool payload: userscripts/src/tools/exploration-ceiling.html (generated facts inlined)
  const APOZ_TOOL_EXPLORATION_CEILING = "<title>Exploration Ceiling</title>\n<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Public+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Big+Shoulders+Display:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap\">\n<style>\n:root{\n  --ground:#EDEFEF; --surface:#FFFFFF; --surface-2:#F5F6F6; --surface-3:#EAECEC;\n  --ink:#1B2024; --ink-soft:#545C63; --ink-mute:#8B9298;\n  --border:#D7DADB; --border-strong:#C3C7C8;\n  --brass:#93641F; --brass-fill:#C08A3E; --brass-text:#6B480F; --on-brass:#241300;\n  --ember:#9B3A2A; --ember-fill:#C1503C; --bg-ember:#F7E6E2; --on-ember:#2C0A05;\n  --moss:#286651; --moss-fill:#4F8C74; --bg-moss:#E4F0EA; --on-moss:#062015;\n  --steel:#48586A; --bg-steel:#E7EAEE;\n  --violet:#5B4A8A; --bg-violet:#ECE8F5;\n  --amber:#8A5A12; --bg-amber:#F3E7D2;\n  --shadow:0 1px 2px rgba(20,24,29,.06),0 4px 14px rgba(20,24,29,.05);\n  --font-head:'Oswald',system-ui,sans-serif; --font-body:'Public Sans',system-ui,sans-serif; --font-mono:'JetBrains Mono',ui-monospace,monospace;\n}\n@media (prefers-color-scheme: dark){\n  :root:not([data-theme=\"light\"]){\n    --ground:#14181D; --surface:#1B2027; --surface-2:#20262D; --surface-3:#272F37;\n    --ink:#E8EAEB; --ink-soft:#A9B0B6; --ink-mute:#6D7680;\n    --border:#2B323A; --border-strong:#3A434C;\n    --brass:#D9A45C; --brass-fill:#C08A3E; --brass-text:#E7BC81; --on-brass:#241300;\n    --ember:#E28270; --ember-fill:#C1503C; --bg-ember:#3A211C; --on-ember:#FBE3DC;\n    --moss:#84C4AA; --moss-fill:#4F8C74; --bg-moss:#1B3128; --on-moss:#D9F1E6;\n    --steel:#9AA6B2; --bg-steel:#232B33;\n    --violet:#B4A4E0; --bg-violet:#26213A;\n    --amber:#E0B368; --bg-amber:#33290F;\n    --shadow:0 1px 2px rgba(0,0,0,.4),0 4px 18px rgba(0,0,0,.35);\n  }\n}\n:root[data-theme=\"dark\"]{\n  --ground:#14181D; --surface:#1B2027; --surface-2:#20262D; --surface-3:#272F37;\n  --ink:#E8EAEB; --ink-soft:#A9B0B6; --ink-mute:#6D7680;\n  --border:#2B323A; --border-strong:#3A434C;\n  --brass:#D9A45C; --brass-fill:#C08A3E; --brass-text:#E7BC81; --on-brass:#241300;\n  --ember:#E28270; --ember-fill:#C1503C; --bg-ember:#3A211C; --on-ember:#FBE3DC;\n  --moss:#84C4AA; --moss-fill:#4F8C74; --bg-moss:#1B3128; --on-moss:#D9F1E6;\n  --steel:#9AA6B2; --bg-steel:#232B33;\n  --violet:#B4A4E0; --bg-violet:#26213A;\n  --amber:#E0B368; --bg-amber:#33290F;\n  --shadow:0 1px 2px rgba(0,0,0,.4),0 4px 18px rgba(0,0,0,.35);\n}\n\n/* Palette variant \"ledger\" — the v4 baseline from party-gold-roi.html\n   (ARTIFACT_STYLE_GUIDE.md \"v4 baseline\"): warm sand/parchment light mode,\n   Big Shoulders Display + IBM Plex. Selected via the swatch pair in the\n   topbar; \"war room\" (above) stays the default so nothing already\n   published moves under existing viewers. Six status hues have no direct\n   source in that file (it only defines accent/warm/success) — extended\n   here within its warm-sand register rather than reusing war room's cooler\n   hues verbatim, so the two variants read as distinct skins, not a\n   recolour of one file. Selector specificity ([data-palette=\"ledger\"]\n   stacked onto :root) is deliberately higher than the plain dark-mode\n   selectors above so it wins regardless of source order. */\n:root[data-palette=\"ledger\"]{\n  --ground:#EFE7D7; --surface:#FAF5EC; --surface-2:#F1E8D8; --surface-3:#E7DCC7;\n  --ink:#33291D; --ink-soft:#6B5C48; --ink-mute:#94836C;\n  --border:#D8CBB2; --border-strong:#C3B193;\n  --brass:#8A4322; --brass-fill:#A8552C; --brass-text:#8A4322; --on-brass:#FBF0E6;\n  --ember:#8C3324; --ember-fill:#B1543F; --bg-ember:#F3E2D8; --on-ember:#2A0D07;\n  --moss:#4A6741; --moss-fill:#5F8352; --bg-moss:#E2E8DA; --on-moss:#0F1A0B;\n  --steel:#4F6B7A; --bg-steel:#E3ECEE;\n  --violet:#6B4A6E; --bg-violet:#EFE3EA;\n  --amber:#8A6A12; --bg-amber:#F3ECD4;\n  --shadow:0 1px 2px rgba(80,60,35,.07),0 4px 14px rgba(80,60,35,.06);\n  --font-head:'Big Shoulders Display','Arial Narrow',sans-serif; --font-body:'IBM Plex Sans',system-ui,sans-serif; --font-mono:'IBM Plex Mono',ui-monospace,monospace;\n}\n@media (prefers-color-scheme: dark){\n  :root:not([data-theme=\"light\"])[data-palette=\"ledger\"]{\n    --ground:#17181A; --surface:#1E2022; --surface-2:#25282A; --surface-3:#2E3134;\n    --ink:#E6E4E0; --ink-soft:#A09D97; --ink-mute:#726F6A;\n    --border:#33373A; --border-strong:#4A4F53;\n    --brass:#E0AB8C; --brass-fill:#C9805A; --brass-text:#E0AB8C; --on-brass:#241005;\n    --ember:#D98A70; --ember-fill:#B1543F; --bg-ember:#2E1A13; --on-ember:#FBE3DA;\n    --moss:#A7BD93; --moss-fill:#8FA87A; --bg-moss:#1F2A1C; --on-moss:#DCEFD4;\n    --steel:#8FA7B8; --bg-steel:#1C262C;\n    --violet:#B494B8; --bg-violet:#2A1F2B;\n    --amber:#D3AF5C; --bg-amber:#2C2311;\n    --shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.32);\n  }\n}\n:root[data-theme=\"dark\"][data-palette=\"ledger\"]{\n  --ground:#17181A; --surface:#1E2022; --surface-2:#25282A; --surface-3:#2E3134;\n  --ink:#E6E4E0; --ink-soft:#A09D97; --ink-mute:#726F6A;\n  --border:#33373A; --border-strong:#4A4F53;\n  --brass:#E0AB8C; --brass-fill:#C9805A; --brass-text:#E0AB8C; --on-brass:#241005;\n  --ember:#D98A70; --ember-fill:#B1543F; --bg-ember:#2E1A13; --on-ember:#FBE3DA;\n  --moss:#A7BD93; --moss-fill:#8FA87A; --bg-moss:#1F2A1C; --on-moss:#DCEFD4;\n  --steel:#8FA7B8; --bg-steel:#1C262C;\n  --violet:#B494B8; --bg-violet:#2A1F2B;\n  --amber:#D3AF5C; --bg-amber:#2C2311;\n  --shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.32);\n}\n*{box-sizing:border-box}\nbody{background:var(--ground);color:var(--ink);font-family:var(--font-body);font-size:13.5px;line-height:1.45}\nh1,h2,h3{font-family:var(--font-head);font-weight:600;text-transform:uppercase;letter-spacing:.03em;text-wrap:balance;margin:0}\n.num{font-family:var(--font-mono);font-variant-numeric:tabular-nums}\na{color:var(--brass-text)}\n[hidden]{display:none!important}\n.shell{max-width:1420px;margin:0 auto;padding:1.25rem 1.75rem 3rem;display:flex;flex-direction:column;gap:1.1rem}\n\n.topbar{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;flex-wrap:wrap;border-bottom:1px solid var(--border);padding-bottom:.85rem}\n.topbar .brandline{display:flex;align-items:baseline;gap:.65rem}\n.topbar h1{font-size:21px;color:var(--ink)}\n.eyebrow{font-family:var(--font-mono);font-size:11px;letter-spacing:.08em;color:var(--ink-mute);text-transform:uppercase}\n.preview-tag{font-family:var(--font-mono);font-size:11px;letter-spacing:.05em;background:var(--bg-ember);color:var(--ember);border:1px solid var(--ember);border-radius:4px;padding:2px 8px}\n.palette-pick{display:flex;align-items:center;gap:.35rem}\n.palette-pick .swatch{width:19px;height:19px;border-radius:50%;border:2px solid var(--border-strong);cursor:pointer;padding:0}\n.palette-pick .swatch.active{border-color:var(--ink);box-shadow:0 0 0 2px var(--surface),0 0 0 3px var(--ink)}\n.palette-pick .swatch[data-p=\"warroom\"]{background:linear-gradient(135deg,#C1503C 50%,#4F8C74 50%)}\n.palette-pick .swatch[data-p=\"ledger\"]{background:linear-gradient(135deg,#A8552C 50%,#4A6741 50%)}\n\n.layout{display:grid;grid-template-columns:336px minmax(0,1fr);gap:1.25rem;align-items:start}\n@media (max-width:980px){ .layout{grid-template-columns:1fr} }\n\n/* [default for artifacts] rule 8: compact, aligned inputs — smaller than a\n   default form control, consistent widths/baseline down the sidebar. */\n.sidebar{position:sticky;top:1.25rem;display:flex;flex-direction:column;gap:.6rem;max-height:calc(100vh - 2.5rem);overflow-y:auto;padding-right:2px}\n@media (max-width:980px){ .sidebar{position:static;max-height:none} }\n\n.segmented{display:grid;background:var(--surface-2);border:1px solid var(--border);border-radius:7px;padding:2px;gap:2px}\n.segmented.two{grid-template-columns:1fr 1fr}\n.segmented button{font-family:var(--font-head);font-size:11px;letter-spacing:.03em;text-transform:uppercase;font-weight:600;padding:6px 5px;border:none;border-radius:5px;background:transparent;color:var(--ink-soft);cursor:pointer}\n.segmented button.active{background:var(--surface);color:var(--brass-text);box-shadow:var(--shadow)}\n\n.panel{background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:.7rem .8rem;box-shadow:var(--shadow)}\n.panel h2{font-size:11.5px;color:var(--ink-soft);margin-bottom:.45rem}\n.field{display:flex;flex-direction:column;gap:3px;margin-bottom:.42rem}\n.field label{font-size:11px;color:var(--ink-soft);display:flex;align-items:center}\n.field .row{display:flex;gap:6px;align-items:center}\n.field input[type=number],.field select{font-family:var(--font-mono);font-size:11.5px;background:var(--surface-2);border:1px solid var(--border-strong);border-radius:5px;padding:3px 5px;color:var(--ink);width:100%;height:24px}\n.field input[type=range]{flex:1;accent-color:var(--brass-fill);height:16px}\n.field .hint{font-size:10.5px;color:var(--ink-mute);line-height:1.35}\n.basegrid{display:grid;grid-template-columns:1fr 1fr;gap:4px 6px}\n.basegrid .bf{display:flex;flex-direction:column;gap:2px}\n.basegrid .bf span{font-size:10px;color:var(--ink-mute)}\n.basegrid .bf input{font-family:var(--font-mono);font-size:11px;background:var(--surface-2);border:1px solid var(--border-strong);border-radius:5px;padding:3px 5px;color:var(--ink);height:22px}\n\n.piece-table{display:flex;flex-direction:column;gap:2px}\n.piece-head,.piece-row{display:grid;grid-template-columns:60px repeat(6,1fr);gap:2px;align-items:center}\n.piece-head span{font-size:9px;text-align:center;color:var(--ink-mute);text-transform:uppercase}\n.piece-row .pname{font-size:10.5px;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.piece-row label{display:flex;align-items:center;justify-content:center;height:20px;cursor:pointer}\n.piece-row input[type=checkbox]{accent-color:var(--brass-fill);width:13px;height:13px;margin:0}\n.piece-role{display:inline-flex;gap:4px;margin-left:4px}\n.piece-role button{font-size:9px;font-family:var(--font-mono);padding:1px 5px;border-radius:4px;border:1px solid var(--border-strong);background:var(--surface-2);color:var(--ink-mute);cursor:pointer}\n.piece-role button.active{background:var(--brass-fill);color:var(--on-brass);border-color:var(--brass-fill)}\n\n.statsum{display:flex;justify-content:space-between;align-items:baseline;margin-top:5px;font-size:10.5px;padding:4px 7px;border-radius:5px;background:var(--bg-moss);color:var(--moss)}\n.statsum.bad{background:var(--bg-ember);color:var(--ember)}\n.toggle2{display:grid;grid-template-columns:1fr 1fr;background:var(--surface-2);border:1px solid var(--border-strong);border-radius:6px;padding:2px;gap:2px}\n.toggle2 button{font-size:10.5px;font-weight:600;border:none;border-radius:4px;padding:5px 4px;background:transparent;color:var(--ink-soft);cursor:pointer;font-family:var(--font-body)}\n.toggle2 button.active{background:var(--brass-fill);color:var(--on-brass)}\n.petrow{display:flex;align-items:center;gap:6px;padding:5px 7px;background:var(--surface-2);border:1px solid var(--border-strong);border-radius:6px;font-size:11px;color:var(--ink-soft)}\n.petrow input{accent-color:var(--brass-fill);width:13px;height:13px}\n.stagger-row{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:6px;font-size:11px;padding:1px 0}\n.stagger-row .val{font-family:var(--font-mono);text-align:right;color:var(--ink-soft);width:34px}\n.stagger-row input[type=range]{height:14px}\n\n.verdict-mini{background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:.6rem .7rem;display:flex;flex-direction:column;gap:1px}\n.verdict-mini .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-mute)}\n.verdict-mini .lvl{font-family:var(--font-head);font-size:26px;color:var(--brass-text);line-height:1}\n.verdict-mini .sub{font-size:11px;color:var(--ink-soft)}\n\n.import-card{display:flex;flex-direction:column;gap:.5rem}\n.import-actions{display:flex;gap:6px}\nbutton.btn{font-family:var(--font-body);font-weight:600;font-size:11.5px;border-radius:6px;padding:6px 10px;border:1px solid var(--border-strong);background:var(--surface-2);color:var(--ink);cursor:pointer}\nbutton.btn.primary{background:var(--brass-fill);border-color:var(--brass-fill);color:var(--on-brass)}\nbutton.btn:disabled{opacity:.5;cursor:not-allowed}\n.roster-scan{max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:7px}\n.scan-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 8px;font-size:11px;border-bottom:1px solid var(--border)}\n.scan-row:last-child{border-bottom:none}\n.scan-row .nm{font-weight:500}\n.status-pill{font-family:var(--font-mono);font-size:10px;padding:1px 6px;border-radius:999px;white-space:nowrap}\n.status-pill.ok{background:var(--bg-moss);color:var(--moss)}\n.status-pill.miss{background:var(--bg-ember);color:var(--ember)}\n.import-note{font-size:10.5px;color:var(--ink-mute);border-left:2px solid var(--border-strong);padding-left:7px}\n\n.main{display:flex;flex-direction:column;gap:1.1rem;min-width:0}\n\n.verdict{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.05rem 1.3rem;box-shadow:var(--shadow);display:grid;grid-template-columns:auto 1fr;gap:1.3rem;align-items:center}\n.verdict .figure{font-family:var(--font-head);font-size:52px;line-height:.9;color:var(--brass-text)}\n.verdict .figure .unit{font-size:15px;color:var(--ink-mute);text-transform:uppercase;letter-spacing:.05em;display:block;margin-top:4px}\n.verdict .detail h3{font-size:14.5px;color:var(--ink);text-transform:none;letter-spacing:0;margin-bottom:.3rem}\n.verdict .detail p{font-size:12.5px;color:var(--ink-soft);margin:0}\n.verdict .stats{display:flex;gap:1.3rem;margin-top:.55rem;flex-wrap:wrap}\n.verdict .stat{display:flex;flex-direction:column}\n.verdict .stat .v{font-family:var(--font-mono);font-size:15.5px;color:var(--ink)}\n.verdict .stat .k{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-mute)}\n\n.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1rem 1.25rem;box-shadow:var(--shadow)}\n.card h2{font-size:12.5px;color:var(--ink-soft);margin-bottom:.7rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px}\n.card h2 .tag{font-family:var(--font-mono);font-size:10px;color:var(--ink-mute);text-transform:none;letter-spacing:0}\n\n.chartwrap{overflow-x:auto}\n#chart{cursor:crosshair}\n.inspectbar{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--ink-soft);margin-top:.5rem;padding-top:.55rem;border-top:1px solid var(--border)}\n.inspectbar button{font-family:var(--font-mono);font-size:10.5px;background:var(--surface-2);border:1px solid var(--border-strong);border-radius:5px;padding:3px 8px;color:var(--brass-text);cursor:pointer}\n.tablewrap{overflow-x:auto}\ntable{border-collapse:collapse;width:100%;font-size:12px}\nthead th{position:sticky;top:0;background:var(--surface);text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-mute);padding:5px 9px;border-bottom:1px solid var(--border-strong);cursor:pointer;white-space:nowrap}\nthead th:hover{color:var(--brass-text)}\nthead th.num,tbody td.num{text-align:right}\ntbody td{padding:4px 9px;border-bottom:1px solid var(--border)}\ntbody tr:last-child td{border-bottom:none}\ntbody tr.band-first td{border-top:2px solid var(--border-strong)}\n.band-badge{font-family:var(--font-mono);font-size:9.5px;padding:1px 6px;border-radius:999px;background:var(--bg-steel);color:var(--steel)}\n.status-chip{font-family:var(--font-mono);font-size:10px;padding:2px 7px;border-radius:5px;white-space:nowrap;display:inline-block}\n.status-chip.ember{background:var(--bg-ember);color:var(--ember)}\n.status-chip.amber{background:var(--bg-amber);color:var(--amber)}\n.status-chip.moss{background:var(--bg-moss);color:var(--moss)}\n.status-chip.steel{background:var(--bg-steel);color:var(--steel)}\n.status-chip.reserve{background:var(--surface-2);color:var(--ink-mute)}\n.risk-chip{font-family:var(--font-mono);font-size:9.5px;padding:1px 6px;border-radius:5px;background:var(--bg-violet);color:var(--violet);margin-left:5px;white-space:nowrap;display:inline-block}\n\ndetails.panel{padding:0;overflow:hidden}\ndetails.panel summary{list-style:none;cursor:pointer;padding:.7rem 1rem;font-family:var(--font-head);font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-soft);display:flex;align-items:center;justify-content:space-between}\ndetails.panel summary::-webkit-details-marker{display:none}\ndetails.panel summary::after{content:'+';font-family:var(--font-mono);font-size:15px;color:var(--ink-mute)}\ndetails.panel[open] summary::after{content:'\\2212'}\ndetails.panel .body{padding:0 1rem .9rem;border-top:1px solid var(--border)}\n.steps{display:flex;flex-direction:column;gap:0;margin-top:.6rem}\n.step{display:grid;grid-template-columns:20px 1fr;gap:9px;padding:4px 0}\n.step .dot{width:20px;height:20px;border-radius:50%;background:var(--surface-2);border:1px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:10px;color:var(--ink-soft)}\n.step .txt{font-size:12px;color:var(--ink-soft);padding-top:1px}\n.fnotes{margin-top:.6rem;display:flex;flex-direction:column;gap:.5rem}\n.fnote{display:grid;grid-template-columns:52px 1fr;gap:9px;font-size:11.5px}\n.fnote .tier{font-family:var(--font-mono);font-size:9.5px;height:fit-content;padding:2px 5px;border-radius:4px;text-align:center}\n.tier.LIVE{background:var(--bg-moss);color:var(--moss)}\n.tier.CODE{background:var(--bg-steel);color:var(--steel)}\n.tier.MOCK{background:var(--bg-ember);color:var(--ember)}\n.tier.OPEN{background:var(--bg-violet);color:var(--violet)}\n.fnote p{color:var(--ink-soft);margin:0}\n.fnote code{font-family:var(--font-mono);font-size:10.5px;background:var(--surface-2);padding:1px 4px;border-radius:3px;color:var(--ink)}\n\nfooter.pagefoot{font-size:11px;color:var(--ink-mute);border-top:1px solid var(--border);padding-top:.9rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}\n.devtoggle{display:flex;align-items:center;gap:5px;font-family:var(--font-mono);font-size:10.5px;color:var(--ink-mute);cursor:pointer;user-select:none}\n.devtoggle input{accent-color:var(--violet)}\n\n.implicit-rows{display:flex;flex-direction:column;gap:3px}\n.implicit-row{display:grid;grid-template-columns:64px 1fr 44px;gap:4px;align-items:center}\n.implicit-row .pname{font-size:10px;color:var(--ink-soft);overflow:hidden;text-overflow:ellipsis}\n.implicit-row select{font-family:var(--font-mono);font-size:10.5px;background:var(--surface-2);border:1px solid var(--border-strong);border-radius:5px;padding:2px 4px;color:var(--ink);width:100%;height:22px}\n.implicit-totals{display:flex;flex-direction:column;gap:2px;margin-top:5px;padding:5px 7px;border-radius:5px;background:var(--surface-2);font-size:10.5px;color:var(--ink-soft)}\n.implicit-totals b{color:var(--ink);font-family:var(--font-mono);font-weight:600}\n\n.info-ic{display:inline-flex;align-items:center;justify-content:center;width:12px;height:12px;border-radius:50%;background:var(--surface-2);border:1px solid var(--border-strong);color:var(--ink-mute);font-family:var(--font-mono);font-size:8.5px;font-style:normal;font-weight:700;cursor:help;margin-left:4px;line-height:1}\n.info-ic:hover,.info-ic:focus{color:var(--brass-text);border-color:var(--brass-fill)}\n#tipEl{position:fixed;z-index:999;max-width:260px;background:var(--surface);border:1px solid var(--border-strong);border-radius:7px;padding:7px 9px;font-size:11px;color:var(--ink-soft);box-shadow:var(--shadow);pointer-events:none}\n#tipEl.hasdev{border-color:var(--violet)}\n#tipEl .tip-dev{display:block;margin-top:5px;padding-top:5px;border-top:1px dashed var(--violet);color:var(--violet);font-family:var(--font-mono);font-size:10px}\n#tipEl .tip-dev[hidden]{display:none}\n</style>\n<script>\n  try {\n    if (localStorage.getItem('explCeiling.palette') === 'ledger') {\n      document.documentElement.setAttribute('data-palette', 'ledger');\n    }\n  } catch (e) {}\n</script>\n\n<div class=\"shell\">\n  <div class=\"topbar\">\n    <div class=\"brandline\">\n      <h1>Exploration ceiling</h1>\n      <span class=\"eyebrow\">village &middot; frosted virtue</span>\n    </div>\n    <div class=\"palette-pick\" role=\"group\" aria-label=\"Colour palette\">\n      <button class=\"swatch\" data-p=\"warroom\" title=\"War room palette\" data-tip=\"War room palette (default)\"></button>\n      <button class=\"swatch\" data-p=\"ledger\" title=\"Ledger palette\" data-tip=\"Ledger palette — the v4 baseline skin\"></button>\n    </div>\n    <span class=\"preview-tag\">preview &middot; profile-to-stats now real, queue engine now real</span>\n  </div>\n\n  <div class=\"layout\">\n    <aside class=\"sidebar\">\n      <div class=\"segmented two\">\n        <button id=\"modeStdBtn\" class=\"active\">Standardized</button>\n        <button id=\"modeLiveBtn\">Game live</button>\n      </div>\n\n      <div class=\"panel\">\n        <h2>Simulation depth</h2>\n        <div class=\"toggle2\">\n          <button id=\"depthMarginBtn\" class=\"active\">Dex margin only</button>\n          <button id=\"depthFullBtn\">Full run simulation</button>\n        </div>\n        <span class=\"hint\" style=\"display:block;margin-top:5px\">Full mode replays kill 0&rarr;40 per member, checking one-shot speed as well as the bleed/dex tiebreak.</span>\n      </div>\n\n      <div class=\"panel\" id=\"panelStd\">\n        <h2>Standardized profile</h2>\n        <div class=\"field\">\n          <label>Base character stats (pre-gear)<i class=\"info-ic\" tabindex=\"0\" data-tip=\"i\">Str/Health/Agility/Dex before any equipment.</i></label>\n          <div class=\"basegrid\" id=\"baseGrid\"></div>\n          <span class=\"hint\">Defaulted to Apoz's real observed base stats (Character &gt; Overview, this session) &mdash; edit freely.</span>\n        </div>\n        <div class=\"field\">\n          <label for=\"gearLevel\">Equipment level<i class=\"info-ic\" tabindex=\"0\" data-tip=\"i\">Item level fed into the stat-roll formula.</i></label>\n          <div class=\"row\"><input type=\"range\" id=\"gearLevel\" min=\"100\" max=\"20000\" step=\"50\" value=\"11000\"><input type=\"number\" class=\"num\" id=\"gearLevelN\" min=\"100\" max=\"20000\" step=\"50\" value=\"11000\" style=\"width:68px\"></div>\n        </div>\n        <div class=\"field\">\n          <label for=\"tier\">Gear tier</label>\n          <select id=\"tier\"></select>\n        </div>\n        <div class=\"field\">\n          <label>Stat mods, 3 per piece<i class=\"info-ic\" tabindex=\"0\" data-tip=\"i\">Normal + local always paired.</i></label>\n          <div class=\"piece-table\" id=\"pieceTable\"></div>\n          <div class=\"statsum\" id=\"statSum\"></div>\n        </div>\n        <div class=\"field\">\n          <label for=\"relicPts\">Relic pts &mdash; Crit/CritDmg/Multi</label>\n          <div class=\"row\"><input type=\"range\" id=\"relicPts\" min=\"0\" max=\"120000\" step=\"1000\" value=\"55000\"><input type=\"number\" class=\"num\" id=\"relicPtsN\" min=\"0\" step=\"1000\" value=\"55000\" style=\"width:68px\"></div>\n        </div>\n        <div class=\"field\" id=\"survivalBarField\">\n          <label for=\"relicPts2\">Relic pts &mdash; Heal% / Def%</label>\n          <div class=\"row\"><input type=\"range\" id=\"relicPts2\" min=\"0\" max=\"120000\" step=\"1000\" value=\"0\"><input type=\"number\" class=\"num\" id=\"relicPts2N\" min=\"0\" step=\"1000\" value=\"0\" style=\"width:68px\"></div>\n          <span class=\"hint\" id=\"survivalHint\">Only worth it with HP/DEF gear mods above.</span>\n        </div>\n        <div class=\"field\">\n          <label for=\"gemLevel\">Gem level</label>\n          <div class=\"row\"><input type=\"range\" id=\"gemLevel\" min=\"0\" max=\"600\" step=\"5\" value=\"245\"><input type=\"number\" class=\"num\" id=\"gemLevelN\" min=\"0\" step=\"5\" value=\"245\" style=\"width:68px\"></div>\n          <label class=\"petrow\" style=\"margin-top:1px\"><input type=\"checkbox\" id=\"gemAuto\" checked>auto = expl. level &minus; 5</label>\n        </div>\n        <div class=\"field\">\n          <label>Implicits, one per piece<i class=\"info-ic\" tabindex=\"0\" data-tip=\"i\">Hit% / Attack Speed / Local DMG% — one type per piece, own tier.</i></label>\n          <div class=\"implicit-rows\" id=\"implicitRows\"></div>\n          <div class=\"implicit-totals\" id=\"implicitTotals\"></div>\n        </div>\n        <div class=\"field\">\n          <label for=\"slotLevel\">Equipment slot level</label>\n          <div class=\"row\"><input type=\"range\" id=\"slotLevel\" min=\"0\" max=\"300\" step=\"5\" value=\"180\"><input type=\"number\" class=\"num\" id=\"slotLevelN\" min=\"0\" max=\"300\" step=\"5\" value=\"180\" style=\"width:68px\"></div>\n        </div>\n        <div class=\"field\">\n          <label>Pet slot levels, 0-200<i class=\"info-ic\" tabindex=\"0\" data-tip=\"i\">Combat / Utility / Gathering — each pet rolls DMG+STR only; pet modifiers (crit etc.) are out of scope here.</i></label>\n          <div id=\"petRows\"></div>\n        </div>\n        <div class=\"field\" style=\"margin-bottom:0\">\n          <label>Village stagger, 5 bands of 5</label>\n          <div class=\"toggle2\" style=\"margin-bottom:5px\">\n            <button id=\"stagScopeEquipBtn\" class=\"active\">Eq-slot only</button>\n            <button id=\"stagScopeAllBtn\">Everything</button>\n          </div>\n          <div id=\"staggerRows\"></div>\n        </div>\n      </div>\n\n      <div class=\"panel import-card\" id=\"panelLive\" hidden>\n        <h2>Game live import</h2>\n        <p class=\"hint\" style=\"margin:-2px 0 1px\">Reads each member's stat block from a fresh exploration-preview capture. Nothing applies until confirmed.</p>\n        <div class=\"import-actions\">\n          <button class=\"btn primary\" id=\"scanBtn\">Scan village</button>\n          <button class=\"btn\" id=\"applyBtn\" disabled>Apply import</button>\n        </div>\n        <div class=\"roster-scan\" id=\"scanList\" hidden></div>\n        <p class=\"import-note\" id=\"importNote\" hidden></p>\n      </div>\n\n      <div class=\"verdict-mini\">\n        <span class=\"lbl\">Ceiling &mdash; live estimate</span>\n        <span class=\"lvl num\" id=\"miniLevel\">&mdash;</span>\n        <span class=\"sub\" id=\"miniSub\">adjust inputs to recompute</span>\n        <span class=\"sub num\" id=\"perfReadout\" style=\"margin-top:3px;font-size:10px\"></span>\n      </div>\n    </aside>\n\n    <main class=\"main\">\n      <div class=\"verdict\">\n        <div class=\"figure num\" id=\"verdictLevel\">&mdash;<span class=\"unit\">exploration level</span></div>\n        <div class=\"detail\">\n          <h3 id=\"verdictHeadline\">Highest level this village profile clears all 40 monsters</h3>\n          <p id=\"verdictSub\">Waiting on first calculation&hellip;</p>\n          <div class=\"stats\">\n            <div class=\"stat\"><span class=\"v num\" id=\"statDexMargin\">&mdash;</span><span class=\"k\">Dex margin at ceiling monster</span></div>\n            <div class=\"stat\"><span class=\"v num\" id=\"statMonsterDex\">&mdash;</span><span class=\"k\">Ceiling monster dexterity</span></div>\n            <div class=\"stat\"><span class=\"v num\" id=\"statKillsAt40\">&mdash;</span><span class=\"k\">Member who lands kill 40</span></div>\n            <div class=\"stat\"><span class=\"v num\" id=\"statMode\">Standardized</span><span class=\"k\">Active mode</span></div>\n          </div>\n        </div>\n      </div>\n\n      <div class=\"card\">\n        <h2>Total village kills vs. exploration level <span class=\"tag\">the breakpoint where 25 members can no longer clear 40 monsters</span></h2>\n        <div class=\"chartwrap\"><svg id=\"chart\" viewBox=\"0 0 900 220\" width=\"100%\" style=\"min-width:560px;display:block\"></svg></div>\n        <div class=\"inspectbar\"><span id=\"inspectLabel\">Viewing the ceiling level</span><button id=\"jumpCeilingBtn\" hidden>Jump back to ceiling</button></div>\n      </div>\n\n      <div class=\"card\">\n        <h2>Roster at the viewed level <span class=\"tag\" id=\"rosterTag\">25 members &middot; 5 bands</span></h2>\n        <div class=\"tablewrap\"><table><thead id=\"rosterHead\"></thead><tbody id=\"rosterBody\"></tbody></table></div>\n      </div>\n\n      <details class=\"panel\" open>\n        <summary>How this is computed</summary>\n        <div class=\"body\"><div class=\"steps\" id=\"stepsList\"></div></div>\n      </details>\n\n      <details class=\"panel\">\n        <summary>Formulas, sources &amp; confidence</summary>\n        <div class=\"body\">\n          <div class=\"fnotes\">\n            <div class=\"fnote\"><span class=\"tier CODE\">CODE</span><p>Equipment stat rolls: <code>floor(baseValue + sqrt(itemLevel)*(itemLevel/levelDivisor)) &times; tierMult(T1-T16) &times; (1+slotBoost(slotLevel))</code> &mdash; <code>tables/roll-coefficients.json</code> + <code>character-equipment.json</code> <code>assembly.boostOrder</code>. Coefficients: STR/HP/AGI/DEX all baseValue 100 (divisor 20/3/5/5); DMG baseValue 50/divisor 20 by default but 200/10 on a weapon (Left Hand) or 100/10 on a dagger (Right Hand); DEF baseValue 50/divisor 6 by default or 100/3 on a shield (Right Hand). Local DMG% (from an implicit) multiplies the SUMMED flat damage total once, post-sum &mdash; not per piece &mdash; per <code>percentageBoosterMap</code>.</p></div>\n            <div class=\"fnote\"><span class=\"tier CODE\">CODE</span><p>Base character stats (pre-gear) default to Apoz's real observed values this session (Character &gt; Overview &gt; Base Stats): STR 1.37m, Health 1.64m, Agility 1.65m, DEX 1.63m. Editable &mdash; this is a real anchor, not an assumption.</p></div>\n            <div class=\"fnote\"><span class=\"tier LIVE\">LIVE</span><p>Bleed recurrence: <code>next = min(95, bleed + 15&times;1.25^(bleed/10))</code>. Kill 1&rarr;15%, 2&rarr;35.96%, 3&rarr;69.43%, 4&rarr;95% (capped). Margin needed for kill <code>k+1</code> is <code>1/(1&minus;bleedAfter(k))</code> &mdash; both derived from four real players' replays. <code>exploration.bleed.formula</code> / <code>.turnOrderFlip</code>.</p></div>\n            <div class=\"fnote\"><span class=\"tier CODE\">CODE</span><p>Monster dexterity = agility = defense, from a full transcription of <code>engine/kernels/characterCombat/monster.js</code>'s <code>baseStatCurve()</code> + tier/soft/deep-tier scaling &mdash; replacing an earlier calibrated power-law once this tool landed in <code>core/</code> next to the engine it demonstrates. LIVE-VALIDATED: predicts dexterity 44,275,208 for Monster 12700 (exploration level 250, the roster's first/toughest monster) against the observed 44.29m. Attack speed converts as <code>10000/(1+boost)</code> (<code>battleStats.attackSpeedIsDivided</code>) and passes into exploration unmodified by bleed (<code>exploration.attackSpeed.passesThroughUnmodified</code>) &mdash; still doesn't move THIS ceiling, since every checked kill resolves within the first tied tick before speed matters.</p></div>\n            <div class=\"fnote\"><span class=\"tier CODE\">CODE</span><p>One exploration level ships up to 40 monsters at slightly different levels (<code>exploration.monsterLevel</code>: <code>explorationLevel&times;50 + (monsterCount&minus;monsterIndex)&times;5</code>) &mdash; this tool models the roster's FIRST monster (monsterIndex 0, the toughest) as the single representative fight per exploration level, rather than replaying the full up-to-40-monster spread. The spread tops out at 200 levels on a base that reaches into the millions at this calculator's range, which is why one representative monster is a reasonable stand-in rather than a shortcut that changes the answer.</p></div>\n            <div class=\"fnote\"><span class=\"tier CODE\">CODE</span><p>Implicits (Hit%/Attack Speed/Local DMG%) use the same roll engine's 'implicit' variant, capped at the LOWER T1-T12 tier curve, with NO slot-boost term (implicits are <code>placement!=='stats'</code> — confirmed twice: the assembly code's own gate, and the user's live Attack Speed formula showing no slot term at all). Hit% rolls flat 0.5% regardless of item level.</p></div>\n            <div class=\"fnote\"><span class=\"tier LIVE\">LIVE</span><p>Attack Speed implicit CORRECTED this session from the user's own real gear (T12, iLevel 10622, observed 13.84%): baseValue 0.01 (was wrongly recorded as 0.03) and exponent 0.49 (was wrongly assumed linear). Matches <code>engine/income/profile.js characterEquipmentImplicitRoll</code> exactly, and is pinned in <code>tests/income-character-equipment-vs-known-captures.mjs</code>.</p></div>\n            <div class=\"fnote\"><span class=\"tier OPEN\">OPEN</span><p>Even corrected, the formula predicts only ~6.79% for that same real example against the observed 13.84% &mdash; a ~2.04x gap this pass could NOT explain (checked: not the tier curve, not a slot-boost term, not an iLevel offset). Recorded verbatim as <code>roll-coefficients.json</code>'s <code>attackSpeed._openDiscrepancy</code> rather than forcing a fit. A second real example at a different iLevel/tier would discriminate a wrong-exponent explanation (ratio would shift) from a missing constant multiplier (ratio would stay ~2.04x).</p></div>\n            <div class=\"fnote\"><span class=\"tier CODE\">CODE</span><p>Relic-shop Healing%/Defence% and Crit/CritDmg/Multistrike are five separate boosts (each with exactly 3 real sources: relics, gear implicits, gems &mdash; <code>boost-sources.json</code>). Sculptures/Skill Tree stay excluded: every combat-affecting key either touches is a MONSTER debuff, never a player buff.</p></div>\n            <div class=\"fnote\"><span class=\"tier OPEN\">OPEN</span><p>At item level 11000+ the Attack Speed implicit's linear term and the DMG/STR/DEX sqrt-shape terms run far past any real observed character-equipment item level (Apoz's own gear: 160-171) &mdash; mechanically consistent with the documented formula, genuinely extrapolated at this scale, not validated there.</p></div>\n            <div class=\"fnote\"><span class=\"tier CODE\">CODE</span><p>Relic-shop Crit Chance/Crit Damage/Multistrike/Healing/Defence% all convert at the SAME rate: <code>value = level/2000</code>, exactly 0.05% per point &mdash; <code>relic-boosts.json relicBoost.valuePerLevel</code>. \"Full run\" mode's turns-to-kill uses the real per-hit shape (<code>preReduced &times; (1+critDamage&times;critChance) &times; (multistrike+1)</code>, combat.js's own formula) with EXPECTED values in place of the real stochastic <code>rollCount()</code> &mdash; the one deliberate simplification left in that conversion.</p></div>\n            <div class=\"fnote\"><span class=\"tier CODE\">CODE</span><p>Pets have their OWN real T1-T16 tier curve (<code>tiers.pet.boostPercent</code>, T16 = 230% &rarr; 3.30&times;) &mdash; a genuinely different, lower curve than equipment's from T6 on, not an \"equivalent\" needing translation. Pet slot-boost DIVERGES from equipment past slot level 150: the block term freezes at its level-150 value and saw-tooths every 30 levels instead of continuing to climb (<code>pets.slotUpgrade.boostFormula</code>). Pet modifiers (crit/multistrike/etc.) are out of scope here per this session's direction &mdash; only DMG/STR are modeled.</p></div>\n            <div class=\"fnote\"><span class=\"tier OPEN\">OPEN</span><p>Pet Damage uses the weapon-equivalent roll coefficient (baseValue 200/divisor 10) per this session's direction &mdash; stated by the user, not independently re-derived from the bundle this pass. Pet Strength uses the standard coefficient (no stated exception). Pet item level reuses the shared Equipment level input; pets have no separate level input in this model, which is a stated simplification, not a real second input the user specified.</p></div>\n            <div class=\"fnote\"><span class=\"tier OPEN\">OPEN</span><p>Reading all 25 members' exact stats needs either the official per-player API or a fast, reliable scrape of the exploration-preview page's already-loaded roster data (no per-row hovering) &mdash; likely a React-fiber/query-cache read, same technique as <code>battle-normal</code>'s live validation. Not yet built &mdash; Game live mode's Scan/Apply is a stub until it is.</p></div>\n            <div class=\"fnote\"><span class=\"tier OPEN\">OPEN</span><p>The \"Relic pts &mdash; Heal% / Def%\" slider is not yet wired into any calculation: this ceiling model resolves survival purely from dex margin and bleed (<code>exploration.bleed.turnOrderFlip</code>), which has no place for incoming damage for Heal%/Defence% to mitigate. Left in as a placeholder for a future damage-taken model rather than removed, but honest that it currently does nothing to the number.</p></div>\n          </div>\n        </div>\n      </details>\n\n      <footer class=\"pagefoot\">\n        <span>Ceiling &amp; roster math sourced from <code>data/</code> facts (<code>tables/roll-coefficients.json</code>, <code>modifier-tiers.json</code>, <code>formulas/pets.json</code>, <code>equipment.json</code>, <code>relic-boosts.json</code>, <code>constants/combat.json</code>) via <code>build.mjs</code>'s generated-facts mechanism, plus hand-transcribed <code>engine/</code> mirrors for the exploration/bleed/monster-generator formulas the build cannot import directly &mdash; see the Formulas panel above for which is which.</span>\n        <label class=\"devtoggle\"><input type=\"checkbox\" id=\"devToggle\">show developer notes</label>\n      </footer>\n    </main>\n  </div>\n</div>\n<div id=\"tipEl\" hidden><span id=\"tipUser\"></span><span class=\"tip-dev\" id=\"tipDev\" hidden></span></div>\n\n<script>\n/* GENERATED from data/ by userscripts/build.mjs — do not edit. */\nwindow.APOZ_FACTS = (function () {\n  /* tables/roll-coefficients.json :: rollCoefficients.table  [CODE] */\n  const rollCoefficients = {\"gold\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.00075,\"levelExponent\":0.49}},\"damageReductionFlat\":{\"default\":{\"baseValue\":0.005,\"levelMultiplier\":0},\"implicit\":{\"baseValue\":0.005,\"levelMultiplier\":0}},\"hitChanceFlat\":{\"default\":{\"baseValue\":0.005,\"levelMultiplier\":0},\"implicit\":{\"baseValue\":0.005,\"levelMultiplier\":0}},\"dodgeChanceFlat\":{\"default\":{\"baseValue\":0.005,\"levelMultiplier\":0},\"implicit\":{\"baseValue\":0.005,\"levelMultiplier\":0}},\"fireResistance\":{\"default\":{\"baseValue\":0.04,\"levelMultiplier\":0},\"implicit\":{\"baseValue\":0.04,\"levelMultiplier\":0}},\"waterResistance\":{\"default\":{\"baseValue\":0.04,\"levelMultiplier\":0},\"implicit\":{\"baseValue\":0.04,\"levelMultiplier\":0}},\"earthResistance\":{\"default\":{\"baseValue\":0.04,\"levelMultiplier\":0},\"implicit\":{\"baseValue\":0.04,\"levelMultiplier\":0}},\"windResistance\":{\"default\":{\"baseValue\":0.04,\"levelMultiplier\":0},\"implicit\":{\"baseValue\":0.04,\"levelMultiplier\":0}},\"healing\":{\"default\":{\"baseValue\":0.04,\"levelMultiplier\":0.0001},\"implicit\":{\"baseValue\":0.04,\"levelMultiplier\":0.0001}},\"critChance\":{\"default\":{\"baseValue\":0.04,\"levelMultiplier\":0.0001},\"implicit\":{\"baseValue\":0.04,\"levelMultiplier\":0.0001}},\"attackSpeed\":{\"default\":{\"baseValue\":0.01,\"levelMultiplier\":0.0001},\"implicit\":{\"baseValue\":0.01,\"levelMultiplier\":0.0001,\"levelExponent\":0.49,\"_correction\":\"CORRECTED 2026-09-10 (LIVE, user's own real gear): baseValue was 0.03 with no levelExponent (defaulting to 1, per equipment.statRoll.unifiedRollEngine's general branch description). The user pasted the game's own in-UI 'Formula' viewer text for a real Attack Speed implicit: 'max(0.01, 0.01 + (iLevel^0.49)*0.0001) * variance(0.97-1.03) * tierMultiplier' - baseValue 0.01 (matching 'default', not the previously-recorded 'implicit' 0.03) and an explicit exponent of 0.49 (NOT the unified-engine's assumed default of 1 for this branch). This is more direct evidence than the branch-logic inference it corrects - a rendered formula string for the exact stat in question beats a general description of which branch a minified function takes.\",\"_openDiscrepancy\":\"Even with this correction, plugging the user's own real example (iLevel 10622, T12, tierMultiplier 3.5) predicts ~6.79% (variance=1) against their observed 13.84% - off by almost exactly 2.04x, a gap this correction does NOT close. Not yet explained: possibilities include a second multiplicative term not captured by the pasted formula (the user may have copied only part of a longer tooltip), a wrong tierMultiplier assumption for this specific key, or a further coefficient error. Flagged as OPEN rather than silently forcing a fit - see capture/sessions/2026-09-10_exploration-bleed-damage-formula.md's continuation for the full derivation. NEXT CHECK: a second real Attack Speed implicit example at a different iLevel/tier would let CONVENTIONS.md 1a discriminate between 'wrong exponent/baseValue' (ratio would change with iLevel) and 'missing constant multiplicative term' (ratio would stay ~2.04x regardless of iLevel).\"}},\"critDamage\":{\"default\":{\"baseValue\":0.04,\"levelMultiplier\":0.0001},\"implicit\":{\"baseValue\":0.04,\"levelMultiplier\":0.0001}},\"multistrike\":{\"default\":{\"baseValue\":0.04,\"levelMultiplier\":0.0001},\"implicit\":{\"baseValue\":0.04,\"levelMultiplier\":0.0001}},\"strength\":{\"default\":{\"baseValue\":100,\"levelMultiplier\":1,\"levelExponent\":0.5,\"levelDivisor\":20},\"implicit\":{\"baseValue\":100,\"levelMultiplier\":1,\"levelExponent\":0.5,\"levelDivisor\":20}},\"health\":{\"default\":{\"baseValue\":100,\"levelMultiplier\":1,\"levelExponent\":0.5,\"levelDivisor\":3},\"implicit\":{\"baseValue\":100,\"levelMultiplier\":1,\"levelExponent\":0.5,\"levelDivisor\":3}},\"agility\":{\"default\":{\"baseValue\":100,\"levelMultiplier\":1,\"levelExponent\":0.5,\"levelDivisor\":5},\"implicit\":{\"baseValue\":100,\"levelMultiplier\":1,\"levelExponent\":0.5,\"levelDivisor\":5}},\"dexterity\":{\"default\":{\"baseValue\":100,\"levelMultiplier\":1,\"levelExponent\":0.5,\"levelDivisor\":5},\"implicit\":{\"baseValue\":100,\"levelMultiplier\":1,\"levelExponent\":0.5,\"levelDivisor\":5}},\"damage\":{\"default\":{\"baseValue\":50,\"levelMultiplier\":1,\"levelExponent\":0.5,\"levelDivisor\":20},\"weapon\":{\"baseValue\":200,\"levelMultiplier\":1,\"levelExponent\":0.5,\"levelDivisor\":10},\"dagger\":{\"baseValue\":100,\"levelMultiplier\":1,\"levelExponent\":0.5,\"levelDivisor\":10},\"implicit\":{\"baseValue\":50,\"levelMultiplier\":1,\"levelExponent\":0.5,\"levelDivisor\":20}},\"defense\":{\"default\":{\"baseValue\":50,\"levelMultiplier\":1,\"levelExponent\":0.5,\"levelDivisor\":6},\"shield\":{\"baseValue\":100,\"levelMultiplier\":1,\"levelExponent\":0.5,\"levelDivisor\":3},\"implicit\":{\"baseValue\":50,\"levelMultiplier\":1,\"levelExponent\":0.5,\"levelDivisor\":6}},\"monsterGoldPercentage\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"monsterGoldFlat\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.1,\"levelExponent\":0.49,\"isLog\":true}},\"monsterExperiencePercentage\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"monsterExperienceFlat\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.1,\"levelExponent\":0.49,\"isLog\":true}},\"sanctumExperiencePercentage\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"sanctumExperienceFlat\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.1,\"levelExponent\":0.49,\"isLog\":true}},\"craftingExperience\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"craftingExperienceFlat\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.1,\"levelExponent\":0.49,\"isLog\":true}},\"statGainPercentage\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"statGainFlat\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.025,\"levelExponent\":0.49,\"isLog\":true}},\"stat\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.001,\"levelExponent\":0.49}},\"localIncreasedDamage\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.001,\"levelExponent\":0.49}},\"localIncreasedDefense\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.001,\"levelExponent\":0.49}},\"localIncreasedStrength\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.001,\"levelExponent\":0.49}},\"localIncreasedHealth\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.001,\"levelExponent\":0.49}},\"localIncreasedAgility\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.001,\"levelExponent\":0.49}},\"localIncreasedDexterity\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.001,\"levelExponent\":0.49}},\"statStrength\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"statAgility\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"statDexterity\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"statHealth\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeGainFlat\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.025,\"levelExponent\":0.49,\"isLog\":true}},\"drop\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.0005,\"levelExponent\":0.49}},\"dropRecipe\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.001,\"levelExponent\":0.49}},\"dropRelics\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeReroll\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeStatReroll\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeEnhance\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeInstantaneous\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeImplicit\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeSanctum\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeSculpture\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeEquipment\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeTypeReroll\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"dropVillageEssence\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeFighterGear\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeGem\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipePets\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeCopy\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeDescriptions\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeUpgrade\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeVirtue\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeLock\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeUnlock\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"recipeMerge\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"dropWootz\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49}},\"potionEffect\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.0025,\"levelExponent\":0.49}},\"questProgress\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.002,\"levelExponent\":0.49}},\"partnerSpeedFlat\":{\"default\":{\"baseValue\":5,\"levelMultiplier\":1,\"levelExponent\":0.49,\"minValue\":5,\"roundResult\":true}},\"partnerIntelligenceFlat\":{\"default\":{\"baseValue\":5,\"levelMultiplier\":1,\"levelExponent\":0.49,\"minValue\":5,\"roundResult\":true}},\"partnerExperienceFlat\":{\"default\":{\"baseValue\":15,\"levelMultiplier\":2,\"levelExponent\":0.49,\"minValue\":15,\"roundResult\":true}},\"recipeExtraAction\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.01,\"levelExponent\":0.49,\"isLog\":true}},\"questQueue\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.4,\"levelExponent\":0.49,\"isLog\":true}},\"houseQueue\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.4,\"levelExponent\":0.49,\"isLog\":true}},\"sanctumQueue\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.4,\"levelExponent\":0.49,\"isLog\":true}},\"caveQueue\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.4,\"levelExponent\":0.49,\"isLog\":true}},\"potionCount\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.4,\"levelExponent\":0.49,\"isLog\":true}},\"relicsAmountFlat\":{\"default\":{\"baseValue\":5,\"levelMultiplier\":3,\"levelExponent\":0.49,\"minValue\":5,\"roundResult\":true}},\"monsterDamage\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.015,\"levelExponent\":0.49}},\"monsterAgility\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.015,\"levelExponent\":0.49}},\"monsterDexterity\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.015,\"levelExponent\":0.49}},\"monsterStrength\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.015,\"levelExponent\":0.49}},\"monsterHealth\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.015,\"levelExponent\":0.49}},\"monsterCritChanceFlat\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.005,\"levelExponent\":0.49,\"isLog\":true}},\"monsterCritDamageFlat\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.01,\"levelExponent\":0.49,\"isLog\":true}},\"monsterMultistrikeChanceFlat\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.003,\"levelExponent\":0.49,\"isLog\":true}},\"monsterHealingChanceFlat\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.003,\"levelExponent\":0.49,\"isLog\":true}},\"monsterDefenseFlat\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.01,\"levelExponent\":0.49,\"isLog\":true}},\"wootzGainFlat\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.025,\"levelExponent\":0.49,\"isLog\":true}},\"experience\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.00075,\"levelExponent\":0.49}},\"partnerExperience\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.0005,\"levelExponent\":0.49}},\"relicsAmount\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.015,\"levelExponent\":0.49}},\"dungeon\":{\"default\":{\"baseValue\":1,\"levelMultiplier\":0.1,\"levelExponent\":0.49,\"minValue\":1,\"roundResult\":true}},\"resource\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.002,\"levelExponent\":0.49}},\"meat\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.01,\"levelExponent\":0.49}},\"iron\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.01,\"levelExponent\":0.49}},\"wood\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.01,\"levelExponent\":0.49}},\"stone\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.01,\"levelExponent\":0.49}},\"partnerAsMeat\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.015,\"levelExponent\":0.49}},\"partnerAsIron\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.015,\"levelExponent\":0.49}},\"partnerAsWood\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.015,\"levelExponent\":0.49}},\"partnerAsStone\":{\"default\":{\"baseValue\":0,\"levelMultiplier\":0.015,\"levelExponent\":0.49}}};\n  /* tables/modifier-tiers.json :: tiers.equipment.boostPercent  [CODE] */\n  const equipmentTierBoostPct = [10,20,30,40,50,75,100,125,150,175,200,250,275,300,325,350];\n  /* tables/modifier-tiers.json :: tiers.pet.boostPercent  [CODE] */\n  const petTierBoostPct = [10,20,30,40,50,60,70,80,90,100,125,150,170,190,210,230];\n  /* formulas/pets.json :: pets.slotUpgrade.boostFormula  [CODE] */\n  function petSlotBoostPercent(slotLevel) { let block = Math.floor(slotLevel / 30); let intoBlock = slotLevel % 30; if (block >= 5) return 0.3*5*6/2 + intoBlock*0.01*6; return 0.3*block*(block+1)/2 + intoBlock*0.01*(block+1); }\n  /* formulas/equipment.json :: equipment.slotUpgrade.boostFormula  [CODE] */\n  function slotBoostPercent(slotLevel) { let block = Math.floor(slotLevel / 30); let intoBlock = slotLevel % 30; return 0.3*block*(block+1)/2 + intoBlock*0.01*(block+1); }\n  /* formulas/relic-boosts.json :: relicBoost.valuePerLevel  [CODE] */\n  function boostValue(level, boostType) { if (boostType==='defenseFlat' || boostType==='damageFlat') return level * 10; if (boostType==='attackSpeed') return level / 5000; return level / 2000; }\n  /* constants/combat.json :: fight.baseLife  [CODE] */\n  const fightBaseLife = 500;\n  /* constants/combat.json :: fight.healthPerStat  [CROSS] */\n  const fightHealthPerStat = 150;\n  /* constants/combat.json :: fight.baseDamage  [CODE] */\n  const fightBaseDamage = 10;\n  /* constants/combat.json :: fight.damagePerStat  [CODE] */\n  const fightDamagePerStat = 1;\n  /* constants/combat.json :: damageReduction.defenseSoftCap  [CODE] */\n  const drDefenseSoftCap = 40000;\n  /* constants/combat.json :: damageReduction.divisor  [CODE] */\n  const drDivisor = 100000;\n  /* constants/combat.json :: damageReduction.exponent  [CODE] */\n  const drExponent = 0.25;\n  return { rollCoefficients, equipmentTierBoostPct, petTierBoostPct, petSlotBoostPercent, slotBoostPercent, boostValue, fightBaseLife, fightHealthPerStat, fightBaseDamage, fightDamagePerStat, drDefenseSoftCap, drDivisor, drExponent };\n})();\n</script>\n<script>\n(function(){\n  var TIERS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12','T13','T14','T15','T16'];\n  // tables/modifier-tiers.json tiers.equipment.boostPercent, generated into\n  // APOZ_FACTS.equipmentTierBoostPct by build.mjs — no hand-copy to drift.\n  // Implicits cap at T12 (confirmed live: implicit tier select never offers\n  // past T12) but use the SAME equipment curve, just truncated — there is\n  // no separate \"implicit tier curve\" fact anywhere in data/.\n  function tierMultEquip(tier){ return 1 + APOZ_FACTS.equipmentTierBoostPct[Math.max(0,Math.min(15,tier-1))]/100; }\n  function tierMultImplicit(tier){ return 1 + APOZ_FACTS.equipmentTierBoostPct[Math.max(0,Math.min(11,tier-1))]/100; }\n\n  var tierSel = document.getElementById('tier');\n  TIERS.forEach(function(t,i){ var o=document.createElement('option'); o.value=i+1; o.textContent=t; if(t==='T16') o.selected=true; tierSel.appendChild(o); });\n\n  var EQUIP_SLOTS = ['Left Hand','Right Hand','Head','Body','Hands','Legs','Feet'];\n  var STAT_KEYS = ['dmg','str','dex','hp','def','agi'];\n  var STAT_LABEL = { dmg:'DMG', str:'STR', dex:'DEX', hp:'HP', def:'DEF', agi:'AGI' };\n\n  // The full STAT_KEY -> statKey map (this tool's short keys -> the real\n  // roll-coefficients.json fact keys), plus dmg/def's per-role branch:\n  // Left Hand is always a weapon; Right Hand toggles dagger/shield;\n  // everything else is default. Sourced from APOZ_FACTS.rollCoefficients\n  // (tables/roll-coefficients.json rollCoefficients.table) — the exact same\n  // table engine/income/profile.js's characterEquipmentStatRoll reads, not\n  // a hand-copy of its numbers.\n  var COEF_KEY = { dmg:'damage', str:'strength', dex:'dexterity', hp:'health', def:'defense', agi:'agility' };\n  function coefFor(statKey, role){\n    var entry = APOZ_FACTS.rollCoefficients[COEF_KEY[statKey]];\n    return entry[role] || entry.default;\n  }\n  function pieceRole(pieceIndex){\n    if (pieceIndex===0) return 'weapon'; // Left Hand\n    if (pieceIndex===1) return rightHandRole; // Right Hand: dagger/shield toggle\n    return 'default';\n  }\n  var rightHandRole = 'dagger';\n\n  // characterEquipment.assembly.boostOrder: rolled -> floor -> *tier -> *slot.\n  // Slot-boost fraction is APOZ_FACTS.slotBoostPercent, generated verbatim\n  // from equipment.slotUpgrade.boostFormula (returns a FRACTION despite the\n  // name, matching engine/income/profile.js's equipmentSlotBoostPercent).\n  function pieceStatValue(statKey, pieceIndex, itemLevel, tier, slotLevel){\n    var coef = coefFor(statKey, pieceRole(pieceIndex));\n    var raw = coef.baseValue + Math.sqrt(Math.max(itemLevel,1)) * (itemLevel/coef.levelDivisor);\n    return Math.floor(raw) * tierMultEquip(tier) * (1 + APOZ_FACTS.slotBoostPercent(slotLevel));\n  }\n\n  // Default selection reproduces the user's own worked example exactly:\n  // dmg=7,str=7,dex=4,hp=1,def=1,agi=1 (every piece: dmg+str+one more).\n  var pieceStats = [\n    ['dmg','str','dex'], ['dmg','str','dex'], ['dmg','str','dex'], ['dmg','str','dex'],\n    ['dmg','str','hp'], ['dmg','str','def'], ['dmg','str','agi'],\n  ].map(function(arr){ return new Set(arr); });\n\n  function pieceTableInit(){\n    var wrap = document.getElementById('pieceTable');\n    var head = '<div class=\"piece-head\"><span></span>' + STAT_KEYS.map(function(k){ return '<span>'+STAT_LABEL[k]+'</span>'; }).join('') + '</div>';\n    var rows = EQUIP_SLOTS.map(function(slot,i){\n      var roleHtml = i===1 ? '<span class=\"piece-role\"><button data-role=\"dagger\" class=\"active\">dagger</button><button data-role=\"shield\">shield</button></span>' : '';\n      var cells = STAT_KEYS.map(function(k){\n        return '<label><input type=\"checkbox\" data-piece=\"'+i+'\" data-stat=\"'+k+'\"'+(pieceStats[i].has(k)?' checked':'')+'></label>';\n      }).join('');\n      return '<div class=\"piece-row\"><span class=\"pname\">'+slot+roleHtml+'</span>'+cells+'</div>';\n    }).join('');\n    wrap.innerHTML = head + rows;\n    wrap.addEventListener('change', function(e){\n      var t = e.target;\n      if (t.dataset.piece!==undefined){\n        var i=+t.dataset.piece, k=t.dataset.stat;\n        if (t.checked) pieceStats[i].add(k); else pieceStats[i].delete(k);\n        refreshStatSum(); recompute();\n      }\n    });\n    wrap.addEventListener('click', function(e){\n      if (e.target.dataset.role){\n        rightHandRole = e.target.dataset.role;\n        wrap.querySelectorAll('.piece-role button').forEach(function(b){ b.classList.toggle('active', b===e.target); });\n        recompute();\n      }\n    });\n    refreshStatSum();\n  }\n  function refreshStatSum(){\n    var counts = {}; STAT_KEYS.forEach(function(k){ counts[k]=0; });\n    var badRows = 0;\n    pieceStats.forEach(function(set){ set.forEach(function(k){ counts[k]++; }); if(set.size!==3) badRows++; });\n    var total = STAT_KEYS.reduce(function(a,k){ return a+counts[k]; },0);\n    var el = document.getElementById('statSum');\n    el.textContent = STAT_KEYS.map(function(k){ return STAT_LABEL[k]+' '+counts[k]; }).join(' &middot; ').replace(/&middot;/g,'·') + ' (' + total + '/21)';\n    el.className = 'statsum' + (badRows===0 && total===21 ? '' : ' bad');\n    var survivalOn = counts.hp>0 || counts.def>0;\n    document.getElementById('survivalHint').textContent = survivalOn\n      ? 'HP/DEF mods selected — note the Heal%/Def% relic bar below is not yet wired into the ceiling math either way (see Formulas panel).'\n      : 'Only worth it with HP/DEF gear mods above — and even then, not yet modeled here (see Formulas panel).';\n  }\n\n  // roll-coefficients.json 'implicit' variant (falls back to 'default' when\n  // a stat has no separate implicit entry, e.g. localIncreasedDamage) — the\n  // exact shape engine/income/profile.js's characterEquipmentImplicitRoll\n  // uses. No slot-boost (implicits are placement!=='stats', confirmed twice\n  // this session: the assembly code's own gate, and the live Attack Speed\n  // formula showing no slot term at all) — tier is applied separately by\n  // the caller here, same caller-composes convention as pieceStatValue.\n  var IMPLICIT_TYPES = ['Hit%','Attack Speed','Local DMG%'];\n  var implicits = EQUIP_SLOTS.map(function(){ return { type:'Attack Speed', tier:10 }; });\n  function implicitRoll(statKey, itemLevel){\n    var entry = APOZ_FACTS.rollCoefficients[statKey];\n    var cfg = entry.implicit || entry.default;\n    var exponent = cfg.levelExponent != null ? cfg.levelExponent : 1;\n    var raw = cfg.baseValue + Math.pow(Math.max(itemLevel,1), exponent) * cfg.levelMultiplier;\n    return Math.max(cfg.baseValue, raw);\n  }\n  function rollHitChanceFlat(itemLevel, tier){ return implicitRoll('hitChanceFlat', itemLevel) * tierMultImplicit(tier); }\n  // attackSpeed's implicit CORRECTED 2026-09-10 from the user's own real\n  // gear (T12, iLevel 10622, observed 13.84%): baseValue 0.01 (was wrongly\n  // recorded as 0.03) and exponent 0.49 (was wrongly assumed linear) — now\n  // the coefficient LIVE in tables/roll-coefficients.json itself, so this\n  // reads the corrected value with nothing to re-drift. Still predicts only\n  // ~6.79% for that same real example, a known ~2.04x OPEN gap\n  // (roll-coefficients.json attackSpeed._openDiscrepancy) — shown, not\n  // hidden, in the Formulas panel below.\n  function rollAttackSpeedPct(itemLevel, tier){ return implicitRoll('attackSpeed', itemLevel) * tierMultImplicit(tier); }\n  function rollLocalDamagePct(itemLevel, tier){ return implicitRoll('localIncreasedDamage', itemLevel) * tierMultImplicit(tier); }\n\n  function implicitRowsInit(){\n    var wrap = document.getElementById('implicitRows');\n    wrap.innerHTML = EQUIP_SLOTS.map(function(slot, i){\n      var typeOpts = IMPLICIT_TYPES.map(function(t){ return '<option'+(implicits[i].type===t?' selected':'')+'>'+t+'</option>'; }).join('');\n      var tierOpts = TIERS.slice(0,12).map(function(t,ti){ return '<option value=\"'+(ti+1)+'\"'+(implicits[i].tier===ti+1?' selected':'')+'>'+t+'</option>'; }).join('');\n      return '<div class=\"implicit-row\"><span class=\"pname\">'+slot+'</span><select data-i=\"'+i+'\" data-f=\"type\">'+typeOpts+'</select><select data-i=\"'+i+'\" data-f=\"tier\">'+tierOpts+'</select></div>';\n    }).join('');\n    wrap.addEventListener('change', function(e){\n      var i = +e.target.dataset.i, f = e.target.dataset.f;\n      if (f===undefined) return;\n      implicits[i][f] = f==='tier' ? +e.target.value : e.target.value;\n      recompute();\n    });\n  }\n  function implicitTotals(itemLevel){\n    var t = { 'Hit%':0, 'Attack Speed':0, 'Local DMG%':0 };\n    implicits.forEach(function(im){\n      if (im.type==='Hit%') t['Hit%'] += rollHitChanceFlat(itemLevel, im.tier);\n      else if (im.type==='Attack Speed') t['Attack Speed'] += rollAttackSpeedPct(itemLevel, im.tier);\n      else t['Local DMG%'] += rollLocalDamagePct(itemLevel, im.tier);\n    });\n    return t;\n  }\n  function effectiveAttackSpeedMs(totalBoost){ return 10000/(1+totalBoost); }\n  function refreshImplicitTotals(){\n    var itemLevel = +document.getElementById('gearLevel').value;\n    var t = implicitTotals(itemLevel);\n    var speedMs = effectiveAttackSpeedMs(t['Attack Speed']);\n    document.getElementById('implicitTotals').innerHTML =\n      'Hit% <b>'+(t['Hit%']*100).toFixed(2)+'%</b> &middot; Speed <b>'+(t['Attack Speed']*100).toFixed(0)+'%</b> &rarr; <b>'+speedMs.toFixed(0)+'ms</b> &middot; Local DMG% <b>'+(t['Local DMG%']*100).toFixed(1)+'%</b>'\n      + '<span style=\"display:block;margin-top:2px\">Real formulas (see Formulas panel) — Hit%/Speed are informational for this ceiling.</span>';\n  }\n\n  // Pets — tables/modifier-tiers.json tiers.pet.boostPercent (generated as\n  // APOZ_FACTS.petTierBoostPct): a REAL, separate T1-T16 curve, not an\n  // \"equivalent\" of equipment's — T16 is index 15, 230% -> 3.30x, derived\n  // from the real table rather than hardcoded. pets.slotUpgrade.boostFormula\n  // (APOZ_FACTS.petSlotBoostPercent, a FRACTION despite the name) DIVERGES\n  // from equipment's past slot level 150 (block>=5): the block term freezes\n  // at its level-150 value and the whole thing saw-tooths every 30 levels\n  // instead of continuing to climb — that divergence lives in the generated\n  // function itself now, not a second hand-copy of the curve.\n  var PET_TIER_MULT = 1 + APOZ_FACTS.petTierBoostPct[15]/100; // T16, per the standardized spec\n  // Pet damage uses the BETTER (weapon-equivalent) coefficient per this\n  // session's confirmation; strength uses the standard coefficient. iLevel\n  // reuses the Equipment level input — pets have no separate slider here,\n  // a stated simplification, not a separate real input the user gave us.\n  function petStatValue(statKey, slotLevel, itemLevel){\n    var coef = statKey==='dmg' ? APOZ_FACTS.rollCoefficients.damage.weapon : APOZ_FACTS.rollCoefficients.strength.default;\n    var raw = coef.baseValue + Math.sqrt(Math.max(itemLevel,1)) * (itemLevel/coef.levelDivisor);\n    return Math.floor(raw) * PET_TIER_MULT * (1 + APOZ_FACTS.petSlotBoostPercent(slotLevel));\n  }\n  var PET_TYPES = ['Combat','Utility','Gathering'];\n  var petSlots = { Combat:0, Utility:0, Gathering:0 };\n  function petRowsInit(){\n    var wrap = document.getElementById('petRows');\n    wrap.innerHTML = PET_TYPES.map(function(t){\n      return '<div class=\"stagger-row\"><span class=\"band-badge\" style=\"width:52px;text-align:center\">'+t+'</span><input type=\"range\" min=\"0\" max=\"200\" step=\"5\" value=\"0\" data-pet=\"'+t+'\"><span class=\"val num\" id=\"petVal'+t+'\">0</span></div>';\n    }).join('');\n    wrap.addEventListener('input', function(e){\n      var t = e.target.dataset.pet;\n      if (t===undefined) return;\n      petSlots[t] = +e.target.value;\n      document.getElementById('petVal'+t).textContent = e.target.value;\n      recompute();\n    });\n  }\n  function petTotals(itemLevel){\n    var dmg=0, str=0;\n    PET_TYPES.forEach(function(t){\n      dmg += petStatValue('dmg', petSlots[t], itemLevel);\n      str += petStatValue('str', petSlots[t], itemLevel);\n    });\n    return { dmg:dmg, str:str };\n  }\n\n  // Base character stats — defaulted to Apoz's real observed values.\n  var BASE_KEYS = [['str','STR','1370000'],['hp','Health','1640000'],['agi','Agility','1650000'],['dex','Dexterity','1630000']];\n  var baseStats = { str:1370000, hp:1640000, agi:1650000, dex:1630000 };\n  function baseGridInit(){\n    var wrap = document.getElementById('baseGrid');\n    wrap.innerHTML = BASE_KEYS.map(function(b){\n      return '<div class=\"bf\"><span>'+b[1]+'</span><input type=\"number\" data-base=\"'+b[0]+'\" value=\"'+b[2]+'\" step=\"10000\"></div>';\n    }).join('');\n    wrap.addEventListener('input', function(e){\n      if (e.target.dataset.base===undefined) return;\n      baseStats[e.target.dataset.base] = +e.target.value || 0;\n      recompute();\n    });\n  }\n\n  var REAL_NAMES = [\"Numb\",\"Weeble\",\"Infamous\",\"Gilbert\",\"Val\",\"Maloik\",\"SoreLoser\",\"MonkeyMan\",\"Apoz\",\"Dragpent\",\"F1rstTry\",\"prettyandghetto\",\"Steppa\",\"JohnGalt\",\"Pyromode\",\"Jonah\",\"DrToasty\",\"Spiritie\",\"Corab\",\"Wedgies\",\"AbuKonto\",\"Cheeya\",\"SYSTEM\",\"Tr3vor\",\"Arahaim\"];\n  var REAL_DEX = { Numb: 116760000, Apoz: 129350000 };\n\n  // exploration.monsterCount / exploration.monsterLevel (data/formulas/\n  // exploration.json — prose facts, not generatable code, hand-transcribed\n  // here with Math.min/Math.max standing in for the fact text's bare\n  // min/max). monsterIndex 0 is the FIRST (toughest) monster the roster\n  // ships — this tool treats one exploration level as facing that single\n  // representative monster rather than replaying all up-to-40 of them\n  // (the real spread across a roster is <=200 levels on top of a base that\n  // reaches into the millions, negligible at this scale) — a stated\n  // simplification, not the literal per-monster roster.\n  function explorationMonsterCount(level){ return Math.min(level + 6, 40); }\n  function explorationMonsterLevel(level){ return level * 50 + explorationMonsterCount(level) * 5; }\n\n  // engine/kernels/characterCombat/monster.js baseStatCurve() + the\n  // tier/soft/deep-tier scaling generateMonster() applies on top — the REAL\n  // monster generator, hand-transcribed (this build has no mechanism to\n  // import engine/ code into a self-contained tool page; see this tool's\n  // .facts.json header). Replaces an earlier calibrated power-law\n  // approximation once this tool landed in core/ next to the engine it's\n  // meant to demonstrate — LIVE-VALIDATED against the real Monster 12700\n  // (exploration level 250, monsterIndex 0): this transcription predicts\n  // dexterity 44,275,208 against the observed 44.29m agility=dexterity.\n  function monsterBaseStatCurve(level){\n    return 1 + Math.pow(10 * (level - 1), 1.25) *\n      Math.max(1 + Math.log(level / 250), 1) *\n      Math.max(1 + Math.log(level / 500), 1) *\n      Math.max(1 + Math.log(level / 1000), 1) *\n      Math.max(1 + Math.log(level / 100000), 1) *\n      Math.max(1 + Math.log(level / 200000), 1) *\n      Math.max(1 + Math.log(level / 300000), 1) *\n      Math.max(1 + Math.log(level / 350000), 1) *\n      Math.max(1 + Math.log(level / 400000), 1) *\n      Math.max(1 + Math.log(level / 450000), 1) *\n      Math.max(1 + Math.log(level / 500000), 1) *\n      Math.max(1 + Math.log(level / 550000), 1) *\n      Math.max(1 + Math.log(level / 600000), 1);\n  }\n  // tier = floor((level-1)/100); n caps at 50 (tier>60, i.e. monster level\n  // >6001 — true for every exploration level this tool searches past the\n  // very lowest). Dexterity/agility/defense get ONLY the `soft` multiplier\n  // (monster.js's applyTierScaling); health/strength get their own\n  // accelerating term PLUS applyDeepTierScaling once tier>1000.\n  function monsterTierScale(level){\n    var tier = Math.floor((level - 1) / 100);\n    var n = Math.min(tier - 10, 50);\n    return {\n      tier: tier,\n      soft: Math.max(0.6 - tier * 0.02, 0.25),\n      healthMult: 1.25 + 0.05 * n * Math.pow(1.005, n),\n    };\n  }\n  function monsterDex(level){\n    var mLevel = explorationMonsterLevel(level);\n    return monsterBaseStatCurve(mLevel) * monsterTierScale(mLevel).soft;\n  }\n  function monsterHP(level){\n    var mLevel = explorationMonsterLevel(level);\n    var scale = monsterTierScale(mLevel);\n    var health = monsterBaseStatCurve(mLevel) * scale.healthMult;\n    if (scale.tier > 1000) health *= 1 + 0.0025 * (scale.tier - 1000); // applyDeepTierScaling\n    return APOZ_FACTS.fightBaseLife + health * APOZ_FACTS.fightHealthPerStat;\n  }\n  // exploration.bleed.formula (data/formulas/exploration.json) — prose fact,\n  // hand-transcribed: newBleedPct = min(95, bleedPct + 15*1.25^(bleedPct/10)).\n  // Mirrors engine/kernels/sequentialHp.js's applyBleedStatDiscount exactly.\n  function nextBleedPct(p){ return Math.min(95, p + 15*Math.pow(1.25, p/10)); }\n  function marginNeeded(bleedPct){ return 1/(1-bleedPct/100); }\n\n  // relic-boosts.json relicBoost.valuePerLevel (APOZ_FACTS.boostValue):\n  // level/2000 for crit chance/crit damage/multistrike (0.05%-equivalent\n  // per point). critChance/critDamage/multistrikeChance are counts, not\n  // percentages (battleStats.boostIsTheCount) — this preview uses their\n  // EXPECTED value (deterministic), not a stochastic rollCount(), which is\n  // the one simplification left in this conversion.\n  function relicStatValue(pointsSpent){ return APOZ_FACTS.boostValue(pointsSpent, 'critChance'); }\n\n  // The real profile builder: sums each piece's roll for whatever stats it\n  // has selected, applies Local DMG% post-sum to damage only, adds base\n  // character stats and real per-slot pet rolls — no illustrative curve\n  // left for DEX/STR/DMG/pets.\n  function buildProfile(gearLevel, tier, slotLevel, relicCombatPts){\n    var totals = { dmg:0, str:0, dex:0, hp:0, def:0, agi:0 };\n    pieceStats.forEach(function(set, i){\n      set.forEach(function(k){ totals[k] += pieceStatValue(k, i, gearLevel, tier, slotLevel); });\n    });\n    var localDmgPct = implicitTotals(gearLevel)['Local DMG%'];\n    var equipDamage = totals.dmg * (1 + localDmgPct);\n    var pets = petTotals(gearLevel);\n    var totalStr = baseStats.str + totals.str + pets.str;\n    var totalDex = baseStats.dex + totals.dex;\n    var totalAgi = baseStats.agi + totals.agi;\n    var combatDamage = APOZ_FACTS.fightBaseDamage + totalStr * APOZ_FACTS.fightDamagePerStat + equipDamage + pets.dmg;\n    var pointsEach = relicCombatPts/3;\n    var critChance = relicStatValue(pointsEach), critDamage = relicStatValue(pointsEach), multistrike = relicStatValue(pointsEach);\n    return { dex: totalDex, agi: totalAgi, damage: combatDamage, critChance: critChance, critDamage: critDamage, multistrikeChance: multistrike };\n  }\n\n  // combat.js's real per-hit shape, using EXPECTED values instead of\n  // rollCount()'s stochastic floor (this preview is deterministic by design):\n  // strikes = multistrikeChance+1, each strike's damage = preReduced*(1+critDamage*critChance).\n  function turnsToKill(profile, level){\n    var mDef = monsterDex(level); // monster defense === dexterity === agility, confirmed\n    var softCapped = mDef + Math.min(APOZ_FACTS.drDefenseSoftCap, mDef) * 4;\n    var dr = 1 - 1/Math.pow(1 + softCapped/APOZ_FACTS.drDivisor, APOZ_FACTS.drExponent);\n    var preReduced = profile.damage * (1-dr);\n    var perHit = preReduced * (1 + profile.critDamage*profile.critChance);\n    var perTurn = perHit * (profile.multistrikeChance+1);\n    return Math.max(1, Math.ceil(monsterHP(level)/perTurn));\n  }\n\n  var DEPTH = 'margin';\n  function killsForMember(profile, level){\n    var bleed=0, kills=0, mDex=monsterDex(level);\n    var turns = DEPTH==='full' ? turnsToKill(profile, level) : 1;\n    while(kills<40){\n      var need = marginNeeded(bleed) * (turns>1 ? (1+0.5*(turns-1)) : 1);\n      if (profile.dex/mDex < need) break;\n      kills++; bleed = nextBleedPct(bleed);\n    }\n    return { kills:kills, turns:turns };\n  }\n\n  var STAGGER = [1.00, 0.82, 0.64, 0.46, 0.30];\n  var STAG_SCOPE = 'equip';\n  function staggerRowsInit(){\n    var wrap = document.getElementById('staggerRows');\n    wrap.innerHTML='';\n    STAGGER.forEach(function(pct,i){\n      var row=document.createElement('div'); row.className='stagger-row';\n      row.innerHTML = '<span class=\"band-badge\">B'+(i+1)+'</span><input type=\"range\" min=\"20\" max=\"100\" step=\"1\" value=\"'+Math.round(pct*100)+'\" data-band=\"'+i+'\"><span class=\"val num\" id=\"stagVal'+i+'\">'+Math.round(pct*100)+'%</span>';\n      wrap.appendChild(row);\n    });\n    wrap.addEventListener('input', function(e){\n      if(e.target.dataset.band===undefined) return;\n      var i=+e.target.dataset.band;\n      STAGGER[i]=+e.target.value/100;\n      document.getElementById('stagVal'+i).textContent = e.target.value+'%';\n      recompute();\n    });\n  }\n\n  function buildBandProfiles(){\n    var gearLevel=+document.getElementById('gearLevel').value;\n    var tier=+tierSel.value;\n    var slotLevel=+document.getElementById('slotLevel').value;\n    var relicCombat=+document.getElementById('relicPts').value;\n    return STAGGER.map(function(pct){\n      var g, t, sL, rC;\n      if (STAG_SCOPE==='all'){ g=gearLevel*pct; t=Math.max(1, Math.round(tier*pct)); sL=slotLevel*pct; rC=relicCombat*pct; }\n      else { g=gearLevel*pct; t=tier; sL=slotLevel*pct; rC=relicCombat; }\n      return buildProfile(g, t, sL, rC);\n    });\n  }\n\n  var liveApplied = null; // { names, sources[], bandProfiles[] } once Apply is clicked\n  var liveScanned = false; // true once Scan has run, even before Apply\n  var inspectedLevel = null;\n\n  function findCeiling(bandFn){\n    var lo=1, hi=40000, best=0;\n    function clears(level){\n      var total=0;\n      for(var b=0;b<5;b++){ var p=bandFn(b); for(var m=0;m<5;m++){ total += killsForMember(p, level).kills; if (total>=40) return true; } }\n      return total>=40;\n    }\n    while(lo<=hi){ var mid=(lo+hi)>>1; if(clears(mid)){ best=mid; lo=mid+1; } else { hi=mid-1; } }\n    return best;\n  }\n\n  function memberName(b, m, rank){\n    if (liveApplied) return liveApplied.names[b*5+m];\n    if (liveScanned) return REAL_NAMES[b*5+m] || ('Villager #'+rank); // names in immediately on scan, stats fall back\n    return 'Villager #'+rank;\n  }\n\n  // Kill-count -> status tier: 3 is the expected norm (matches the real\n  // village report this project is built from), so it reads neutral/good,\n  // not \"passing\" — only 0-1 reads as a real problem.\n  function resultTier(kills){\n    if (kills<=0) return { label:'no kills', cls:'ember' };\n    if (kills===1) return { label:'falls short', cls:'ember' };\n    if (kills===2) return { label:'needs work', cls:'amber' };\n    if (kills===3) return { label:'on pace', cls:'steel' };\n    return { label:'excellent', cls:'moss' };\n  }\n\n  function rosterAt(level, bandFn){\n    var rows=[], total=0, crossedAt=null;\n    for(var b=0;b<5;b++){\n      var p = bandFn(b);\n      for(var m=0;m<5;m++){\n        var res = killsForMember(p, level);\n        var before = total; total += res.kills;\n        var clinches = before<40 && total>=40;\n        if (clinches) crossedAt = rows.length;\n        var reserve = before>=40;\n        rows.push({ rank: rows.length+1, name: memberName(b,m,rows.length+1), band:b+1, dex:p.dex, damage:p.damage,\n          margin: p.dex/monsterDex(level), kills:res.kills, turns:res.turns, cum: Math.min(total,40),\n          reserve: reserve, clinches: clinches, source: liveApplied && liveApplied.sources[b*5+m] });\n      }\n    }\n    return { rows: rows, total: Math.min(total,40), crossedAt: crossedAt };\n  }\n\n  function fmtM(n){ return (n/1e6).toFixed(2)+'m'; }\n  function fmtX(n){ return n.toFixed(2)+'x'; }\n\n  // Real reference point: village \"Frosted Virtue\" had cleared through\n  // Level 249 as of the 2026-09-09 replay this whole calculator is built\n  // from — a genuine anchor to compare the standardized/live profile's\n  // projected ceiling against, not a placeholder number.\n  var REAL_LAST_CLEARED = 249;\n\n  var chartPts = [], chartLo=0, chartHi=0;\n  function drawChart(ceiling, bandFn){\n    var svg = document.getElementById('chart');\n    var span = Math.max(20, Math.ceil(Math.abs(ceiling-REAL_LAST_CLEARED)*0.6)+10);\n    chartLo = Math.max(1, Math.min(ceiling, REAL_LAST_CLEARED) - span);\n    chartHi = Math.max(ceiling, REAL_LAST_CLEARED) + span;\n    var step = Math.max(1, Math.round((chartHi-chartLo)/60));\n    chartPts=[];\n    for(var lvl=chartLo; lvl<=chartHi; lvl+=step){\n      var total=0;\n      for(var b=0;b<5;b++){ var p=bandFn(b); for(var m=0;m<5;m++){ total += killsForMember(p, lvl).kills; if(total>125) break; } }\n      chartPts.push({lvl:lvl, kills: total});\n    }\n    var W=900,H=260,padL=52,padR=18,padT=16,padB=40;\n    var maxK = Math.max(40, Math.max.apply(null, chartPts.map(function(p){return p.kills;})));\n    function x(lvl){ return padL + (lvl-chartLo)/(chartHi-chartLo)*(W-padL-padR); }\n    function y(k){ return H-padB - (k/maxK)*(H-padT-padB); }\n    var path = chartPts.map(function(p,i){ return (i===0?'M':'L')+x(p.lvl).toFixed(1)+','+y(p.kills).toFixed(1); }).join(' ');\n    var refY = y(40).toFixed(1);\n    var viewLvl = inspectedLevel!=null ? inspectedLevel : ceiling;\n    var nearest = chartPts.reduce(function(a,c){ return Math.abs(c.lvl-viewLvl)<Math.abs(a.lvl-viewLvl) ? c : a; }, chartPts[0]);\n    var cx = x(viewLvl).toFixed(1), cy = y(nearest.kills).toFixed(1);\n\n    var xTicks='', yTicks='', dots='';\n    var xStep = Math.max(1, Math.round((chartHi-chartLo)/8/step)*step);\n    for(var lvl2=chartLo; lvl2<=chartHi; lvl2+=xStep){\n      xTicks += '<line x1=\"'+x(lvl2).toFixed(1)+'\" y1=\"'+(H-padB)+'\" x2=\"'+x(lvl2).toFixed(1)+'\" y2=\"'+(H-padB+4)+'\" stroke=\"var(--border-strong)\"/>' +\n        '<text x=\"'+x(lvl2).toFixed(1)+'\" y=\"'+(H-padB+16)+'\" text-anchor=\"middle\" font-family=\"JetBrains Mono\" font-size=\"10\" fill=\"var(--ink-mute)\">'+lvl2+'</text>';\n    }\n    for(var ky=0; ky<=maxK; ky+=Math.ceil(maxK/4/5)*5||10){\n      yTicks += '<line x1=\"'+(padL-4)+'\" y1=\"'+y(ky).toFixed(1)+'\" x2=\"'+padL+'\" y2=\"'+y(ky).toFixed(1)+'\" stroke=\"var(--border-strong)\"/>' +\n        '<text x=\"'+(padL-8)+'\" y=\"'+(y(ky)+3).toFixed(1)+'\" text-anchor=\"end\" font-family=\"JetBrains Mono\" font-size=\"10\" fill=\"var(--ink-mute)\">'+ky+'</text>';\n    }\n    chartPts.forEach(function(p){\n      dots += '<circle cx=\"'+x(p.lvl).toFixed(1)+'\" cy=\"'+y(p.kills).toFixed(1)+'\" r=\"8\" fill=\"transparent\" data-tip=\"Level '+p.lvl+': '+p.kills+' kills\"/>';\n    });\n    var lastX = x(REAL_LAST_CLEARED).toFixed(1);\n\n    svg.innerHTML =\n      '<text x=\"'+(padL-38)+'\" y=\"'+(padT+6)+'\" font-family=\"JetBrains Mono\" font-size=\"10\" fill=\"var(--ink-mute)\" transform=\"rotate(-90 '+(padL-38)+' '+(padT+6)+')\">KILLS</text>' +\n      '<text x=\"'+(W/2)+'\" y=\"'+(H-4)+'\" text-anchor=\"middle\" font-family=\"JetBrains Mono\" font-size=\"10\" letter-spacing=\"1\" fill=\"var(--ink-mute)\">EXPLORATION LEVEL</text>' +\n      yTicks + xTicks +\n      '<line x1=\"'+padL+'\" y1=\"'+refY+'\" x2=\"'+(W-padR)+'\" y2=\"'+refY+'\" stroke=\"var(--border-strong)\" stroke-dasharray=\"3,3\"/>' +\n      '<text x=\"'+(W-padR)+'\" y=\"'+(parseFloat(refY)-5)+'\" text-anchor=\"end\" font-family=\"JetBrains Mono\" font-size=\"10\" fill=\"var(--ink-mute)\">40 cleared</text>' +\n      (chartLo<=REAL_LAST_CLEARED && REAL_LAST_CLEARED<=chartHi ?\n        '<line x1=\"'+lastX+'\" y1=\"'+padT+'\" x2=\"'+lastX+'\" y2=\"'+(H-padB)+'\" stroke=\"var(--moss)\" stroke-dasharray=\"2,3\"/>' +\n        '<text x=\"'+lastX+'\" y=\"'+(padT+10)+'\" text-anchor=\"middle\" font-family=\"JetBrains Mono\" font-size=\"10\" fill=\"var(--moss)\">real: last cleared '+REAL_LAST_CLEARED+'</text>' : '') +\n      '<path d=\"'+path+'\" fill=\"none\" stroke=\"var(--brass-fill)\" stroke-width=\"2.5\"/>' +\n      dots +\n      '<circle cx=\"'+cx+'\" cy=\"'+cy+'\" r=\"4.5\" fill=\"var(--brass-fill)\"/>' +\n      '<text x=\"'+cx+'\" y=\"'+(parseFloat(cy)-10)+'\" text-anchor=\"middle\" font-family=\"Oswald\" font-size=\"12\" font-weight=\"600\" fill=\"var(--brass-text)\">'+viewLvl+'</text>';\n  }\n\n  document.getElementById('chart').addEventListener('click', function(e){\n    var rect = this.getBoundingClientRect();\n    var frac = (e.clientX-rect.left)/rect.width;\n    var lvl = Math.round(chartLo + frac*(chartHi-chartLo));\n    inspectedLevel = Math.max(chartLo, Math.min(chartHi, lvl));\n    recompute(true);\n  });\n  document.getElementById('jumpCeilingBtn').addEventListener('click', function(){ inspectedLevel=null; recompute(true); });\n\n  // The two depth modes check different things, so they get different\n  // roster columns rather than forcing one shape on both.\n  function renderRosterHead(){\n    var head = document.getElementById('rosterHead');\n    if (DEPTH==='margin'){\n      head.innerHTML = '<tr><th data-k=\"rank\">#</th><th data-k=\"name\">Member</th><th data-k=\"band\">Band</th><th data-k=\"dex\" class=\"num\">DEX</th><th data-k=\"margin\" class=\"num\">Margin</th><th data-k=\"kills\" class=\"num\">Kills</th><th data-k=\"cum\" class=\"num\">Running total</th><th data-k=\"status\">Result</th></tr>';\n    } else {\n      head.innerHTML = '<tr><th data-k=\"rank\">#</th><th data-k=\"name\">Member</th><th data-k=\"band\">Band</th><th data-k=\"damage\" class=\"num\">DMG output</th><th data-k=\"turns\" class=\"num\">Turns/kill</th><th data-k=\"kills\" class=\"num\">Kills</th><th data-k=\"cum\" class=\"num\">Running total</th><th data-k=\"status\">Result</th></tr>';\n    }\n    wireSort();\n  }\n\n  function recompute(keepInspect){\n    var t0 = performance.now();\n    if (!keepInspect) inspectedLevel = null;\n    refreshImplicitTotals();\n    var bandFn;\n    if (liveApplied) { bandFn = function(b){ return liveApplied.bandProfiles[b]; }; }\n    else { var profiles = buildBandProfiles(); bandFn = function(b){ return profiles[b]; }; }\n\n    var ceiling = findCeiling(bandFn);\n    var viewLevel = inspectedLevel!=null ? inspectedLevel : ceiling;\n    var r = rosterAt(viewLevel, bandFn);\n    var rCeil = inspectedLevel!=null ? rosterAt(ceiling, bandFn) : r;\n\n    document.getElementById('verdictLevel').innerHTML = ceiling + '<span class=\"unit\">exploration level</span>';\n    document.getElementById('miniLevel').textContent = ceiling;\n    document.getElementById('miniSub').textContent = liveApplied ? 'from imported roster' : 'from standardized inputs';\n    document.getElementById('statMonsterDex').textContent = fmtM(monsterDex(ceiling));\n    document.getElementById('statMode').textContent = liveApplied ? 'Game live' : 'Standardized';\n    document.getElementById('statDexMargin').textContent = fmtX(bandFn(0).dex/monsterDex(ceiling));\n\n    if (rCeil.crossedAt!=null){\n      document.getElementById('statKillsAt40').textContent = '#'+(rCeil.crossedAt+1);\n      document.getElementById('verdictSub').textContent = rCeil.rows[rCeil.crossedAt].name + ' lands the 40th kill; the village fails one level higher.';\n    } else {\n      document.getElementById('statKillsAt40').textContent = '—';\n      document.getElementById('verdictSub').textContent = 'Roster runs out before clearing all 40 monsters at this level.';\n    }\n\n    document.getElementById('inspectLabel').textContent = inspectedLevel!=null ? ('Viewing level '+inspectedLevel+' (ceiling '+ceiling+') — click the chart to look elsewhere') : ('Viewing the ceiling level ('+ceiling+') — click the chart to inspect a different level');\n    document.getElementById('jumpCeilingBtn').hidden = inspectedLevel==null;\n    document.getElementById('rosterTag').textContent = '25 members · 5 bands · level '+viewLevel;\n\n    renderRosterHead();\n    var tbody = document.getElementById('rosterBody');\n    tbody.innerHTML='';\n    r.rows.forEach(function(row,i){\n      var tr=document.createElement('tr');\n      if (i%5===0) tr.className='band-first';\n      var tier = row.reserve ? {label:'reserve', cls:'reserve'} : resultTier(row.kills);\n      var statusHtml = '<span class=\"status-chip '+tier.cls+'\">'+tier.label+'</span>';\n      if (row.clinches) statusHtml += '<span class=\"risk-chip\">clinches the run</span>';\n      if (DEPTH==='full' && row.turns>1 && !row.reserve) statusHtml += '<span class=\"risk-chip\">'+row.turns+'-turn kill</span>';\n      var srcHtml = row.source ? ' <span class=\"hint\">('+row.source+')</span>' : '';\n      var cells = DEPTH==='margin'\n        ? '<td class=\"num\">'+fmtM(row.dex)+'</td><td class=\"num\">'+fmtX(row.margin)+'</td>'\n        : '<td class=\"num\">'+fmtM(row.damage)+'</td><td class=\"num\">'+row.turns+'</td>';\n      tr.innerHTML = '<td class=\"num\">'+row.rank+'</td><td>'+row.name+srcHtml+'</td><td><span class=\"band-badge\">B'+row.band+'</span></td>'+\n        cells + '<td class=\"num\">'+row.kills+'</td><td class=\"num\">'+row.cum+'/40</td><td>'+statusHtml+'</td>';\n      tbody.appendChild(tr);\n    });\n\n    drawChart(ceiling, bandFn);\n    buildSteps(ceiling, monsterDex(ceiling));\n\n    var elapsed = performance.now() - t0;\n    var perfEl = document.getElementById('perfReadout');\n    if (perfEl) perfEl.textContent = 'computed in ' + elapsed.toFixed(1) + 'ms';\n  }\n\n  function buildSteps(ceiling, mDex){\n    var steps = [\n      ['1','Roll each of the 7 gear pieces’ selected stats for real (sqrt-shape roll × tier × slot boost), sum into DEX/STR/DMG, add base character stats.'],\n      ['2','Compute the candidate level’s monster dexterity ('+fmtM(mDex)+' at the ceiling) and HP from a full transcription of the real monster generator, live-validated against a real anchor.'],\n      ['3','Full run mode: check whether each kill lands in one turn from real damage output vs. monster HP/defense — a multi-turn kill raises the effective margin needed that round.'],\n      ['4','Walk each member kill by kill: after k kills, bleed follows the real recurrence and survival needs dex/monsterDex ≥ 1/(1−bleed).'],\n      ['5','Sum kills across the queue in BP order until 40 monsters clear (win) or all 25 members fall short (loss).'],\n      ['6','Binary-search the exploration level for the highest one that still clears. Click the chart to inspect any other level’s roster.']\n    ];\n    var el = document.getElementById('stepsList');\n    el.innerHTML = steps.map(function(s){ return '<div class=\"step\"><div class=\"dot\">'+s[0]+'</div><div class=\"txt\">'+s[1]+'</div></div>'; }).join('');\n  }\n\n  ['gearLevel','relicPts','relicPts2','gemLevel','slotLevel'].forEach(function(id){\n    var r=document.getElementById(id), n=document.getElementById(id+'N');\n    r.addEventListener('input', function(){ n.value=r.value; recompute(); });\n    n.addEventListener('input', function(){ r.value=n.value; recompute(); });\n  });\n  tierSel.addEventListener('change', function(){ recompute(); });\n  document.getElementById('gemAuto').addEventListener('change', function(){\n    var gl = document.getElementById('gemLevel'), gn=document.getElementById('gemLevelN');\n    gl.disabled = this.checked; gn.disabled = this.checked;\n    if (this.checked){ gl.value=245; gn.value=245; }\n    recompute();\n  });\n\n  document.getElementById('depthMarginBtn').addEventListener('click', function(){\n    DEPTH='margin'; this.classList.add('active'); document.getElementById('depthFullBtn').classList.remove('active'); recompute();\n  });\n  document.getElementById('depthFullBtn').addEventListener('click', function(){\n    DEPTH='full'; this.classList.add('active'); document.getElementById('depthMarginBtn').classList.remove('active'); recompute();\n  });\n  document.getElementById('stagScopeEquipBtn').addEventListener('click', function(){\n    STAG_SCOPE='equip'; this.classList.add('active'); document.getElementById('stagScopeAllBtn').classList.remove('active'); recompute();\n  });\n  document.getElementById('stagScopeAllBtn').addEventListener('click', function(){\n    STAG_SCOPE='all'; this.classList.add('active'); document.getElementById('stagScopeEquipBtn').classList.remove('active'); recompute();\n  });\n\n  document.getElementById('modeStdBtn').addEventListener('click', function(){\n    this.classList.add('active'); document.getElementById('modeLiveBtn').classList.remove('active');\n    document.getElementById('panelStd').hidden=false; document.getElementById('panelLive').hidden=true;\n    liveApplied = null; liveScanned = false; recompute();\n  });\n  document.getElementById('modeLiveBtn').addEventListener('click', function(){\n    this.classList.add('active'); document.getElementById('modeStdBtn').classList.remove('active');\n    document.getElementById('panelLive').hidden=false; document.getElementById('panelStd').hidden=true;\n    liveScanned = true; recompute(); // real names show in the roster immediately, even before Apply\n  });\n\n  document.getElementById('scanBtn').addEventListener('click', function(){\n    liveScanned = true;\n    var list = document.getElementById('scanList');\n    list.hidden=false;\n    list.innerHTML = REAL_NAMES.map(function(nm){\n      var real = REAL_DEX[nm];\n      var pill = real ? '<span class=\"status-pill ok\">imported</span>' : '<span class=\"status-pill miss\">not captured</span>';\n      return '<div class=\"scan-row\"><span class=\"nm\">'+nm+'</span>'+pill+'</div>';\n    }).join('');\n    document.getElementById('importNote').hidden=false;\n    document.getElementById('importNote').textContent = '2 of 25 read from a live 2026-09-09 replay capture (Numb, Apoz). The other 23 fall back to the standardized profile, not a guess.';\n    document.getElementById('applyBtn').disabled = false;\n    recompute();\n  });\n\n  document.getElementById('applyBtn').addEventListener('click', function(){\n    var profiles = buildBandProfiles();\n    var names=[], sources=[], perMember=[];\n    REAL_NAMES.forEach(function(nm,i){\n      var band = Math.floor(i/5);\n      if (REAL_DEX[nm]) { perMember.push(Object.assign({}, profiles[band], { dex: REAL_DEX[nm] })); sources.push('live capture'); }\n      else { perMember.push(profiles[band]); sources.push('standardized fallback'); }\n      names.push(nm);\n    });\n    var bandProfiles=[];\n    var avgKeys = ['dex','agi','damage','critChance','critDamage','multistrikeChance'];\n    for(var b=0;b<5;b++){\n      var slice = perMember.slice(b*5,b*5+5);\n      var avg = {};\n      avgKeys.forEach(function(k){ avg[k] = slice.reduce(function(a,c){return a+(c[k]||0);},0)/slice.length; });\n      bandProfiles.push(avg);\n    }\n    liveApplied = { names:names, sources:sources, bandProfiles:bandProfiles };\n    recompute();\n  });\n\n  function wireSort(){\n    document.querySelectorAll('thead th[data-k]').forEach(function(th){\n      th.addEventListener('click', function(){\n        var rows = Array.prototype.slice.call(document.getElementById('rosterBody').rows);\n        var asc = th.dataset.asc !== '1';\n        document.querySelectorAll('thead th').forEach(function(t){ delete t.dataset.asc; });\n        th.dataset.asc = asc ? '1':'0';\n        var idx = Array.prototype.indexOf.call(th.parentNode.children, th);\n        rows.sort(function(a,b){\n          var av=a.children[idx].textContent, bv=b.children[idx].textContent;\n          var an=parseFloat(av), bn=parseFloat(bv);\n          var cmp = (!isNaN(an)&&!isNaN(bn)) ? an-bn : av.localeCompare(bv);\n          return asc ? cmp : -cmp;\n        });\n        var tbody = document.getElementById('rosterBody');\n        rows.forEach(function(r){ tbody.appendChild(r); });\n      });\n    });\n  }\n\n  baseGridInit();\n  pieceTableInit();\n  implicitRowsInit();\n  petRowsInit();\n  staggerRowsInit();\n\n  // Tooltip singleton — [data-tip]/[data-tip-dev] contract from the\n  // userscript's Core module: dev text is not merely hidden when off, it is\n  // not READ at all, so a dev-only element is fully inert.\n  var tipEl = document.getElementById('tipEl'), tipUserEl = document.getElementById('tipUser'), tipDevEl = document.getElementById('tipDev');\n  var devOn = false;\n  document.getElementById('devToggle').addEventListener('change', function(){ devOn = this.checked; });\n  function showTip(target, x, y){\n    var text = target.getAttribute('data-tip');\n    var dev = devOn ? target.getAttribute('data-tip-dev') : null;\n    if (!text && !dev) return;\n    tipUserEl.textContent = text && text!=='i' ? text : (target.title || '');\n    tipDevEl.textContent = dev || '';\n    tipDevEl.hidden = !dev;\n    tipEl.className = dev ? 'hasdev' : '';\n    tipEl.style.left = Math.min(x+10, window.innerWidth-270)+'px';\n    tipEl.style.top = (y+16)+'px';\n    tipEl.hidden = false;\n  }\n  function hideTip(){ tipEl.hidden = true; }\n  document.querySelectorAll('.info-ic').forEach(function(el){\n    var tip = el.textContent; el.textContent = 'i';\n    if (!el.getAttribute('title')) el.setAttribute('title', tip);\n  });\n  document.addEventListener('mousemove', function(e){\n    var t = e.target.closest && e.target.closest('[data-tip],[data-tip-dev]');\n    if (t) showTip(t, e.clientX, e.clientY); else hideTip();\n  });\n  document.querySelectorAll('[data-tip],[data-tip-dev]').forEach(function(el){\n    el.addEventListener('focus', function(){ var r=el.getBoundingClientRect(); showTip(el, r.left, r.bottom); });\n    el.addEventListener('blur', hideTip);\n  });\n\n  (function(){\n    var current = document.documentElement.getAttribute('data-palette') === 'ledger' ? 'ledger' : 'warroom';\n    document.querySelectorAll('.palette-pick .swatch').forEach(function(btn){\n      btn.classList.toggle('active', btn.getAttribute('data-p') === current);\n      btn.addEventListener('click', function(){\n        var p = btn.getAttribute('data-p');\n        if (p === 'ledger') document.documentElement.setAttribute('data-palette', 'ledger');\n        else document.documentElement.removeAttribute('data-palette');\n        document.querySelectorAll('.palette-pick .swatch').forEach(function(b){ b.classList.toggle('active', b===btn); });\n        try { localStorage.setItem('explCeiling.palette', p); } catch (e) {}\n      });\n    });\n  })();\n\n  recompute();\n})();\n</script>\n";

  // Tool payload: userscripts/src/tools/sculpture-stat-optimizer.html (generated facts inlined)
  const APOZ_TOOL_SCULPTURE_STAT_OPTIMIZER = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Sculpture Grid Stat Rate vs Specific Stat Drop Rate Optimizer</title>\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Source+Sans+3:wght@400;500;600;700&display=swap\">\n<script>\n  // Restore theme immediately to prevent any flicker\n  (function(){\n    try {\n      var saved = localStorage.getItem('APOZ_THEME') || 'dark-beach';\n      if (saved === 'beach') {\n        document.documentElement.setAttribute('data-theme', 'light');\n      } else {\n        document.documentElement.setAttribute('data-theme', 'dark');\n        document.documentElement.setAttribute('data-dark', saved);\n      }\n    } catch(e) {}\n  })();\n</script>\n<style>\n/* ---------------------------------------------------------------------------\n   THEME TOKENS (v4/v5 Baseline)\n   beach (light warm sand), dark-beach (warm night sand), ink, slate, umber\n--------------------------------------------------------------------------- */\n:root{\n  --bg:#efe7d7; --surface:#faf5ec; --surface-2:#f1e8d8; --surface-3:#e7dcc7;\n  --border:#d8cbb2; --border-strong:#c3b193;\n  --text:#33291d; --text-muted:#6b5c48; --text-faint:#94836c;\n  --accent:#4a6741; --accent-soft:#5f8352;\n  --warm:#a8552c; --warm-soft:#c26b3c;\n  --success:#4a6741; --band:#f4ead2; --current:#e2e8da;\n  --highlight:#6a48ea; --highlight-soft:#8d72f5;\n  --shadow:0 1px 2px rgba(80,60,35,.07), 0 4px 14px rgba(80,60,35,.06);\n  --mono:'IBM Plex Mono',ui-monospace,monospace;\n  --sans:'IBM Plex Sans',system-ui,sans-serif;\n  --display:'Big Shoulders Display','Arial Narrow',sans-serif;\n  --num:'Source Sans 3','Segoe UI','Open Sans',system-ui,sans-serif;\n}\n\n/* 1. Dark Beach (Warm Night Sand) - User favorite */\n:root[data-theme=\"dark\"][data-dark=\"dark-beach\"],\n:root:not([data-theme=\"light\"])[data-dark=\"dark-beach\"],\n:root:not([data-theme=\"light\"]):not([data-dark]){\n  --bg:#1a1714; --surface:#24201c; --surface-2:#2e2924; --surface-3:#39332d;\n  --border:#4a423a; --border-strong:#5c5349;\n  --text:#eae4dc; --text-muted:#b3a89a; --text-faint:#8a8073;\n  --accent:#8fa87a; --accent-soft:#a7bd93;\n  --warm:#d79a6e; --warm-soft:#e6b391;\n  --success:#8fa87a; --band:#2a2520; --current:#262a22;\n  --highlight:#9d88ff; --highlight-soft:#b6a6ff;\n  --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.32);\n}\n\n/* 2. Ink (Near black) */\n:root[data-theme=\"dark\"][data-dark=\"ink\"]{\n  --bg:#0e0e0f; --surface:#161617; --surface-2:#1c1c1e; --surface-3:#242427;\n  --border:#2a2a2d; --border-strong:#3c3c41;\n  --text:#eceae7; --text-muted:#9d9a95; --text-faint:#6a6763;\n  --accent:#9db38c; --accent-soft:#b6c9a7;\n  --warm:#d08a63; --warm-soft:#e0a483;\n  --success:#9db38c; --band:#211f1b; --current:#1c211c;\n  --shadow:0 1px 2px rgba(0,0,0,.5), 0 10px 30px rgba(0,0,0,.4);\n}\n\n/* 3. Slate (Cool blue-gray) */\n:root[data-theme=\"dark\"][data-dark=\"slate\"]{\n  --bg:#0f1216; --surface:#171b21; --surface-2:#1e232a; --surface-3:#272d36;\n  --border:#2b323b; --border-strong:#3f4854;\n  --text:#f0f3f6; --text-muted:#9aa5b1; --text-faint:#69737f;\n  --accent:#7fb3a5; --accent-soft:#9ccabd;\n  --warm:#d79a6e; --warm-soft:#e6b391;\n  --success:#7fb3a5; --band:#221f1a; --current:#182420;\n  --shadow:0 1px 2px rgba(0,0,0,.45), 0 10px 28px rgba(0,0,0,.38);\n}\n\n/* 4. Umber (Sepia brown) */\n:root[data-theme=\"dark\"][data-dark=\"umber\"]{\n  --bg:#14100c; --surface:#1c1712; --surface-2:#231d16; --surface-3:#2d251c;\n  --border:#332a20; --border-strong:#4a3d2e;\n  --text:#efe6d8; --text-muted:#a89a86; --text-faint:#7a6d5c;\n  --accent:#a3ad72; --accent-soft:#bcc48f;\n  --warm:#cf8f5c; --warm-soft:#e0a97c;\n  --success:#a3ad72; --band:#241d12; --current:#20241a;\n  --shadow:0 1px 2px rgba(0,0,0,.5), 0 10px 30px rgba(0,0,0,.42);\n}\n\n*{box-sizing:border-box}\n[hidden]{display:none!important}\nhtml,body{margin:0;background:var(--bg)}\nbody{color:var(--text);font-family:var(--sans);line-height:1.5;font-size:.9rem;overflow-x:hidden}\na{color:inherit}\n\n/* ---- shell ---- */\n.app{display:grid;grid-template-columns:360px minmax(0,1fr);gap:1.5rem;\n     max-width:1680px;margin:0 auto;padding:1.5rem 1.5rem 4rem}\n@media (max-width:1150px){.app{grid-template-columns:1fr;padding:1.25rem 1rem 4rem}}\n\n.eyebrow{font-family:var(--mono);font-size:.63rem;letter-spacing:.11em;text-transform:uppercase;color:var(--accent);margin-bottom:.3rem;white-space:nowrap}\nh1{font-family:var(--display);font-weight:700;font-size:1.85rem;margin:0 0 .2rem;line-height:1;letter-spacing:.02em;white-space:nowrap}\n.sub{color:var(--text-muted);font-size:.78rem;margin:0 0 .9rem;line-height:1.4}\n\n/* ---- sidebar ---- */\n.sidebar-inner{display:flex;flex-direction:column;gap:.6rem}\n@media (min-width:1151px){\n  .sidebar-inner{position:sticky;top:1.25rem;max-height:calc(100vh - 2.5rem);\n    overflow-y:auto;overflow-x:hidden;padding-right:.45rem;scrollbar-width:thin}\n  .sidebar-inner::-webkit-scrollbar{width:7px}\n  .sidebar-inner::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:4px}\n}\n.card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.7rem .8rem;box-shadow:var(--shadow)}\n\n.sec-label{font-family:var(--sans);font-size:.7rem;font-weight:700;letter-spacing:.03em;text-transform:uppercase;\n  color:var(--text-faint);display:flex;align-items:center;gap:.35rem;margin:0 0 .5rem;white-space:nowrap}\n.sec-label .rule{flex:1;height:1px;background:var(--border)}\n\n/* ---- unified compact aligned inputs ---- */\n.fields{display:grid;grid-template-columns:1fr auto;align-items:center;gap:.3rem .5rem}\n.fields label{font-size:.75rem;color:var(--text-muted);white-space:nowrap;display:flex;align-items:center;min-width:0}\n.fields input[type=number],.fields input[type=text],.fields select{\n  font-family:var(--num);font-size:.82rem;font-weight:600;color:var(--text);\n  background:var(--surface-2);border:1px solid var(--border);border-radius:4px;\n  padding:.14rem .4rem;width:5.8rem;min-width:0;font-variant-numeric:tabular-nums;\n  text-align:right;line-height:1.4;height:1.55rem}\n.fields select{text-align:right;text-align-last:right;width:7.2rem}\n.fields input[type=number]{-moz-appearance:textfield;appearance:textfield}\n.fields input[type=number]::-webkit-outer-spin-button,\n.fields input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}\n.fields input:focus,.fields select:focus,textarea:focus{outline:2px solid var(--accent);outline-offset:1px}\n.fields input:disabled{opacity:.5;cursor:not-allowed;background:var(--surface-3)}\n\n/* attached unit input wrapper (% badge) */\n.unit-input{display:inline-flex;align-items:center;background:var(--surface-2);border:1px solid var(--border);border-radius:4px;padding:0 .25rem;height:1.55rem;width:fit-content}\n.unit-input:focus-within{outline:2px solid var(--accent);outline-offset:1px}\n.unit-input input{border:none!important;background:transparent!important;outline:none!important;box-shadow:none!important;padding:.1rem .2rem!important;height:100%!important;width:4.4rem;text-align:right;font-family:var(--num);font-weight:600;color:var(--text);font-variant-numeric:tabular-nums}\n.unit-input input[type=number]{-moz-appearance:textfield;appearance:textfield}\n.unit-input input[type=number]::-webkit-outer-spin-button,.unit-input input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}\n.unit-input .unit{font-family:var(--num);font-size:.75rem;font-weight:600;color:var(--text-muted);margin-left:.15rem;user-select:none}\n\n.checkrow{grid-column:1 / -1;display:flex;align-items:center;gap:.45rem;font-size:.75rem;color:var(--text-muted);cursor:pointer;user-select:none;white-space:nowrap}\n.checkrow input{width:.9rem;height:.9rem;accent-color:var(--accent);margin:0;cursor:pointer}\n.note{grid-column:1 / -1;font-size:.68rem;color:var(--text-faint);line-height:1.35;margin:.15rem 0 .2rem}\n\n/* ---- button bar ---- */\n.btn-bar{display:flex;flex-wrap:nowrap;gap:.4rem;margin-top:.4rem}\n.btn{font-family:var(--sans);font-size:.72rem;font-weight:500;color:var(--text-muted);\n  background:var(--surface-2);border:1px solid var(--border);border-radius:6px;\n  padding:.28rem .55rem;cursor:pointer;white-space:nowrap;transition:background .12s,border-color .12s,color .12s;text-align:center}\n.btn:hover{border-color:var(--accent);color:var(--accent);background:var(--surface-3)}\n.btn-primary{background:var(--accent);color:#fff;border-color:var(--accent)}\n.btn-primary:hover{background:var(--accent-soft);color:#fff}\n.btn-theme{min-width:8.2rem;flex:none}\n.badge{font-family:var(--sans);font-size:.65rem;font-weight:600;padding:.15rem .4rem;border-radius:4px;background:var(--surface-3);color:var(--text-muted);white-space:nowrap}\n.badge-success{background:rgba(74,103,65,.15);color:var(--accent);border:1px solid rgba(74,103,65,.3)}\n.badge-highlight{background:rgba(106,72,234,.15);color:var(--highlight);border:1px solid rgba(106,72,234,.3)}\n\n/* ---- textarea & paste import box ---- */\ntextarea.paste-box{\n  width:100%;height:85px;resize:vertical;font-family:var(--mono);font-size:.7rem;\n  background:var(--surface-2);border:1px solid var(--border);border-radius:5px;\n  color:var(--text);padding:.35rem .45rem;line-height:1.3;margin-top:.25rem}\n\n/* ---- main column ---- */\n.main-inner{display:flex;flex-direction:column;gap:1.1rem}\n\n/* ---- live userscript banner ---- */\n.live-banner{background:rgba(106,72,234,.08);border:1px solid var(--highlight-soft);border-radius:8px;padding:.5rem .8rem;display:flex;justify-content:space-between;align-items:center;font-size:.78rem}\n.live-banner strong{color:var(--highlight)}\n\n/* ---- verdict card ---- */\n.verdict{\n  background:linear-gradient(135deg,var(--surface) 0%,var(--surface-2) 100%);\n  border:1.5px solid var(--border-strong);border-radius:12px;\n  padding:1.1rem 1.25rem;box-shadow:var(--shadow)}\n.verdict-eyebrow{font-family:var(--sans);font-size:.7rem;letter-spacing:.05em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:.2rem;white-space:nowrap}\n.verdict-headline{font-family:var(--display);font-size:1.8rem;font-weight:700;line-height:1.1;margin:0 0 .5rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.verdict-headline span.rate{color:var(--highlight)}\n.verdict-headline span.spec{color:var(--warm)}\n.verdict-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem;margin-top:.85rem}\n.kpi-tile{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:.55rem .75rem}\n.kpi-label{font-family:var(--sans);font-size:.68rem;letter-spacing:.03em;font-weight:600;text-transform:uppercase;color:var(--text-faint);margin-bottom:.15rem;white-space:nowrap}\n.kpi-val{font-family:var(--num);font-size:1.3rem;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;line-height:1.2;white-space:nowrap}\n.kpi-sub{font-size:.7rem;color:var(--text-muted);margin-top:.15rem;white-space:nowrap}\n\n/* ---- table styles ---- */\n.table-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.85rem;box-shadow:var(--shadow);overflow-x:auto}\n.table-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:.65rem;flex-wrap:nowrap;gap:.5rem}\n.table-title{font-family:var(--display);font-size:1.25rem;font-weight:700;margin:0;color:var(--text);white-space:nowrap}\n\ntable.matrix{width:100%;min-width:920px;border-collapse:collapse;font-size:.8rem}\ntable.matrix th,table.matrix td{padding:.48rem .55rem;border-bottom:1px solid var(--border);white-space:nowrap}\ntable.matrix th{font-family:var(--sans);font-size:.72rem;letter-spacing:.02em;color:var(--text-muted);background:var(--surface-2);font-weight:600}\ntable.matrix tbody tr:hover{background:var(--surface-2)}\ntable.matrix td.num{font-family:var(--num);font-variant-numeric:tabular-nums;text-align:right}\ntable.matrix th.num{text-align:right}\ntable.matrix .stat-tag{display:inline-block;width:.55rem;height:.55rem;border-radius:50%;margin-right:.35rem;vertical-align:middle}\n\n/* Exact in-game colors from Queslar live UI */\n.stat-strength{color:#ef4444;font-weight:600}\n.stat-health{color:#22c55e;font-weight:600}\n.stat-dexterity{color:#eab308;font-weight:600}\n.stat-agility{color:#3b82f6;font-weight:600}\n.stat-rate{color:#8b5cf6;font-weight:600}\n.stat-partner{color:#06b6d4;font-weight:600}\n\n.tag-strength{background:#ef4444}\n.tag-health{background:#22c55e}\n.tag-dexterity{background:#eab308}\n.tag-agility{background:#3b82f6}\n.tag-rate{background:#8b5cf6}\n.tag-partner{background:#06b6d4}\n\n/* ---- sensitivity sweep graph ---- */\n.sweep-wrap{display:flex;flex-direction:column;gap:.35rem;margin-top:.6rem}\n.sweep-bar-row{display:grid;grid-template-columns:6.5rem 1fr 5.5rem 5rem;align-items:center;gap:.65rem;font-size:.75rem;white-space:nowrap}\n.sweep-bar-bg{height:1.25rem;background:var(--surface-2);border-radius:4px;position:relative;overflow:hidden;border:1px solid var(--border)}\n.sweep-bar-fill{height:100%;background:linear-gradient(90deg,var(--surface-3),var(--accent-soft));border-radius:3px;transition:width .15s}\n.sweep-bar-fill.optimal{background:linear-gradient(90deg,var(--highlight-soft),var(--highlight))}\n.sweep-bar-fill.current{background:linear-gradient(90deg,var(--warm-soft),var(--warm))}\n\n/* ---- collapsible details sections ---- */\ndetails.panel{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.65rem .85rem;box-shadow:var(--shadow)}\ndetails.panel summary{font-family:var(--sans);font-weight:600;font-size:.82rem;color:var(--text);cursor:pointer;user-select:none;display:flex;align-items:center;gap:.4rem;white-space:nowrap}\ndetails.panel summary::marker{color:var(--text-faint)}\n.panel-body{margin-top:.75rem;padding-top:.6rem;border-top:1px solid var(--border);font-size:.76rem;line-height:1.55;color:var(--text-muted)}\n\n/* step by step rail */\n.step-rail{display:flex;flex-direction:column;gap:.45rem}\n.step-row{display:grid;grid-template-columns:1.6rem 1fr;gap:.55rem;align-items:baseline}\n.step-num{display:inline-flex;align-items:center;justify-content:center;width:1.35rem;height:1.35rem;border-radius:50%;\n  background:var(--surface-3);color:var(--text);font-family:var(--num);font-size:.72rem;font-weight:700}\n.step-title{font-weight:600;color:var(--text);font-size:.78rem}\n.step-code{font-family:var(--mono);font-size:.7rem;background:var(--surface-2);padding:.1rem .3rem;border-radius:3px;border:1px solid var(--border)}\n\n/* ---- fixed tooltips ---- */\n.ico{display:inline-flex;align-items:center;justify-content:center;width:.85rem;height:.85rem;\n  border-radius:50%;border:1px solid var(--text-faint);color:var(--text-faint);\n  font-size:.55rem;font-weight:700;cursor:help;flex:none;font-style:normal;margin-left:.3rem;user-select:none;transition:border-color .12s,color .12s}\n.ico:hover,.ico:focus{border-color:var(--accent);color:var(--accent);outline:none}\n\n#tip{position:fixed;z-index:9999;max-width:22rem;background:#1a1918;color:#f4eedf;white-space:pre-line;\n  font-family:var(--sans);font-size:.73rem;font-weight:400;line-height:1.45;\n  padding:.45rem .65rem;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.35);\n  opacity:0;visibility:hidden;transition:opacity .12s;pointer-events:none;left:0;top:0}\n#tip.on{opacity:1;visibility:visible}\n\n/* back to top */\n.back-top{position:fixed;bottom:1.5rem;right:1.5rem;width:2.2rem;height:2.2rem;border-radius:50%;\n  background:var(--surface-2);border:1px solid var(--border-strong);color:var(--text);\n  display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:var(--shadow);\n  opacity:0;visibility:hidden;transition:opacity .2s,visibility .2s;z-index:90}\n.back-top.visible{opacity:1;visibility:visible}\n</style>\n</head>\n<body>\n\n<div id=\"tip\"></div>\n\n<div class=\"app\">\n  <!-- ======================== LEFT SIDEBAR ======================== -->\n  <aside class=\"sidebar\">\n    <div class=\"sidebar-inner\">\n      <div>\n        <div class=\"eyebrow\">Sculpture Grid &bull; Income Optimization</div>\n        <h1>Stat Rate Optimizer</h1>\n        <div class=\"sub\">Closed-form break-even solver for Sculpture Grid budget: Stat Rate % vs Specific Stat Drop Rates.</div>\n      </div>\n\n      <!-- Quick action buttons: fixed width theme button prevents line-wrapping -->\n      <div class=\"btn-bar\" style=\"margin-bottom:.2rem\">\n        <button class=\"btn\" id=\"btnReset\">Reset Defaults</button>\n        <button class=\"btn\" id=\"btnSaveDefault\">Save as Default</button>\n        <!-- Standardized theme toggle cycling: Beach, Dark Beach, Ink, Slate, Umber -->\n        <button class=\"btn btn-theme\" id=\"btnThemeToggle\">Theme: Dark Beach</button>\n      </div>\n\n      <!-- 1. Live Userscript Handover Banner (Hidden if not launched from userscript) -->\n      <div class=\"live-banner\" id=\"liveUserscriptBanner\" hidden>\n        <div><strong>Live Data Ready:</strong> Handed over from Apoz userscript.</div>\n        <button class=\"btn btn-primary\" id=\"btnApplyLive\">Apply Live</button>\n      </div>\n\n      <!-- 2. Paste Profile Import Card -->\n      <div class=\"card\" id=\"importCard\">\n        <div class=\"sec-label\">\n          <span>Live Profile Stat Boost Import</span>\n          <div class=\"rule\"></div>\n          <span class=\"badge badge-success\" id=\"parseStatusBadge\">Ready</span>\n        </div>\n        <div class=\"note\">Copy-paste from <b>Character &gt; Boosts &gt; Stat Boost</b> hover card:</div>\n        <textarea class=\"paste-box\" id=\"profilePasteInput\" placeholder=\"Paste 'Stat boost\\n1.784,02%...' here\"></textarea>\n        <div class=\"btn-bar\">\n          <button class=\"btn btn-primary\" id=\"btnApplyParsed\">Parse &amp; Apply</button>\n          <button class=\"btn\" id=\"btnLoadSample\">Load Sample</button>\n          <button class=\"btn\" id=\"btnClearPaste\">Clear</button>\n        </div>\n        <div id=\"parseSummary\" class=\"note\" style=\"margin-top:.35rem;color:var(--text)\"></div>\n      </div>\n\n      <!-- 3. Base Stat Boost Sources (Split into in-game sources) -->\n      <div class=\"card\">\n        <div class=\"sec-label\">\n          <span>Base Stat Boost Sources</span>\n          <div class=\"rule\"></div>\n        </div>\n        <div class=\"fields\">\n          <label for=\"inpEnchants\">Enchants (Equipment)<span class=\"ico\" tabindex=\"0\" data-tip=\"Equipment enchantments contribution to Base.\">i</span></label>\n          <div class=\"unit-input\"><input type=\"number\" id=\"inpEnchants\" value=\"525.7\" step=\"0.1\"><span class=\"unit\">%</span></div>\n\n          <label for=\"inpPetsStat\">Pets (Stat)<span class=\"ico\" tabindex=\"0\" data-tip=\"Pets passive stat boost contribution to Base.\">i</span></label>\n          <div class=\"unit-input\"><input type=\"number\" id=\"inpPetsStat\" value=\"0.0\" step=\"0.1\"><span class=\"unit\">%</span></div>\n\n          <label for=\"inpVillageStable\">Village Stable<span class=\"ico\" tabindex=\"0\" data-tip=\"Village Stable building bonus to Base.\">i</span></label>\n          <div class=\"unit-input\"><input type=\"number\" id=\"inpVillageStable\" value=\"360.0\" step=\"1\"><span class=\"unit\">%</span></div>\n\n          <label for=\"inpVillageExplorations\">Village Explorations<span class=\"ico\" tabindex=\"0\" data-tip=\"Exploration passives contribution to Base.\">i</span></label>\n          <div class=\"unit-input\"><input type=\"number\" id=\"inpVillageExplorations\" value=\"66.0\" step=\"1\"><span class=\"unit\">%</span></div>\n\n          <label for=\"inpSkillTreeStat\">Skill Tree<span class=\"ico\" tabindex=\"0\" data-tip=\"Character skill tree nodes contributing to Base.\">i</span></label>\n          <div class=\"unit-input\"><input type=\"number\" id=\"inpSkillTreeStat\" value=\"0.0\" step=\"0.1\"><span class=\"unit\">%</span></div>\n\n          <label for=\"inpCurrentSculptureRate\">Current Sculptures<span class=\"ico\" tabindex=\"0\" data-tip=\"Your current grid's displayed Stat Rate %. This is replaced by the optimized grid bonus.\">i</span></label>\n          <div class=\"unit-input\"><input type=\"number\" id=\"inpCurrentSculptureRate\" value=\"22.9\" step=\"0.1\"><span class=\"unit\">%</span></div>\n\n          <label for=\"inpPvpTile\">PvP Stat Tile<span class=\"ico\" tabindex=\"0\" data-tip=\"Village PvP map tile modifier. Multiplies (1 + Base).\">i</span></label>\n          <div class=\"unit-input\"><input type=\"number\" id=\"inpPvpTile\" value=\"10.31\" step=\"0.1\"><span class=\"unit\">%</span></div>\n\n          <label for=\"inpVipPct\">VIP Premium<span class=\"ico\" tabindex=\"0\" data-tip=\"Flat +10% while active. Additive inside Premium category.\">i</span></label>\n          <div class=\"unit-input\"><input type=\"number\" id=\"inpVipPct\" value=\"10.00\" step=\"1\"><span class=\"unit\">%</span></div>\n\n          <label for=\"inpPotionPct\">Stat Potion<span class=\"ico\" tabindex=\"0\" data-tip=\"Active potion effect. Additive with VIP inside Premium category.\">i</span></label>\n          <div class=\"unit-input\"><input type=\"number\" id=\"inpPotionPct\" value=\"48.93\" step=\"0.1\"><span class=\"unit\">%</span></div>\n\n          <label for=\"inpEventPct\">Event Boost<span class=\"ico\" tabindex=\"0\" data-tip=\"Global event boost multiplier category.\">i</span></label>\n          <div class=\"unit-input\"><input type=\"number\" id=\"inpEventPct\" value=\"0.00\" step=\"1\"><span class=\"unit\">%</span></div>\n        </div>\n      </div>\n\n      <!-- 4. Character Base Stats (Denominator C_i) -->\n      <div class=\"card\">\n        <div class=\"sec-label\">\n          <span>Character Base Stats</span>\n          <div class=\"rule\"></div>\n        </div>\n        <div class=\"note\">Unbuffed base stats feeding drop chance denominator C_i:</div>\n        <div class=\"fields\" style=\"margin-top:.3rem\">\n          <label for=\"inpCharStrength\"><span class=\"stat-tag tag-strength\"></span>Strength<span class=\"ico\" tabindex=\"0\" data-tip=\"Raw character Strength. Higher stat increases drop rarity via denominator C_i.\">i</span></label>\n          <input type=\"text\" id=\"inpCharStrength\" value=\"521,939\" style=\"text-align:right\">\n\n          <label for=\"inpCharHealth\"><span class=\"stat-tag tag-health\"></span>Health<span class=\"ico\" tabindex=\"0\" data-tip=\"Raw character Health. Feeds denominator C_i.\">i</span></label>\n          <input type=\"text\" id=\"inpCharHealth\" value=\"485,400\" style=\"text-align:right\">\n\n          <label for=\"inpCharDexterity\"><span class=\"stat-tag tag-dexterity\"></span>Dexterity<span class=\"ico\" tabindex=\"0\" data-tip=\"Raw character Dexterity. Feeds denominator C_i.\">i</span></label>\n          <input type=\"text\" id=\"inpCharDexterity\" value=\"485,400\" style=\"text-align:right\">\n\n          <label for=\"inpCharAgility\"><span class=\"stat-tag tag-agility\"></span>Agility<span class=\"ico\" tabindex=\"0\" data-tip=\"Raw character Agility. Feeds denominator C_i.\">i</span></label>\n          <input type=\"text\" id=\"inpCharAgility\" value=\"485,400\" style=\"text-align:right\">\n        </div>\n      </div>\n\n      <!-- 5. External Stat Drop Modifiers (Combat Pets / Gear) -->\n      <div class=\"card\">\n        <div class=\"sec-label\">\n          <span>External Drop % (Pets / Gear)</span>\n          <div class=\"rule\"></div>\n        </div>\n        <div class=\"note\">Specific drop rate modifiers from your Combat Pets &amp; gear:</div>\n        <div class=\"fields\" style=\"margin-top:.3rem\">\n          <label for=\"inpExtStrength\"><span class=\"stat-tag tag-strength\"></span>Pet Strength Drop<span class=\"ico\" tabindex=\"0\" data-tip=\"E.g. 600% from combat pet modifier.\">i</span></label>\n          <div class=\"unit-input\"><input type=\"number\" id=\"inpExtStrength\" value=\"600.0\" step=\"10\"><span class=\"unit\">%</span></div>\n\n          <label for=\"inpExtHealth\"><span class=\"stat-tag tag-health\"></span>Pet Health Drop<span class=\"ico\" tabindex=\"0\" data-tip=\"Combat pet Health drop rate %.\">i</span></label>\n          <div class=\"unit-input\"><input type=\"number\" id=\"inpExtHealth\" value=\"0.0\" step=\"10\"><span class=\"unit\">%</span></div>\n\n          <label for=\"inpExtDexterity\"><span class=\"stat-tag tag-dexterity\"></span>Pet Dex Drop<span class=\"ico\" tabindex=\"0\" data-tip=\"Combat pet Dexterity drop rate %.\">i</span></label>\n          <div class=\"unit-input\"><input type=\"number\" id=\"inpExtDexterity\" value=\"0.0\" step=\"10\"><span class=\"unit\">%</span></div>\n\n          <label for=\"inpExtAgility\"><span class=\"stat-tag tag-agility\"></span>Pet Agility Drop<span class=\"ico\" tabindex=\"0\" data-tip=\"Combat pet Agility drop rate %.\">i</span></label>\n          <div class=\"unit-input\"><input type=\"number\" id=\"inpExtAgility\" value=\"0.0\" step=\"10\"><span class=\"unit\">%</span></div>\n        </div>\n      </div>\n\n      <!-- 6. Sanctum Map Calibration -->\n      <div class=\"card\">\n        <div class=\"sec-label\">\n          <span>Sanctum Map Calibration</span>\n          <div class=\"rule\"></div>\n        </div>\n        <div class=\"fields\">\n          <label for=\"inpSanctumLevel\">\n            Average Sanctum Level\n            <span class=\"ico\" tabindex=\"0\" data-tip=\"Map item level (e.g. 78,189). Drives modifier magnitude via pow(iLevel-100, 0.49).\">i</span>\n          </label>\n          <input type=\"text\" id=\"inpSanctumLevel\" value=\"78,189\" style=\"text-align:right\">\n\n          <label for=\"selTierRate\">\n            Stat Rate Tier\n            <span class=\"ico\" tabindex=\"0\" data-tip=\"Tier roll for Stat Rate on sanctum maps (e.g. T13 = +275% tier boost).\">i</span>\n          </label>\n          <select id=\"selTierRate\"></select>\n\n          <label for=\"selTierSpec\">\n            Specific Stat Tier\n            <span class=\"ico\" tabindex=\"0\" data-tip=\"Tier roll for specific stat drop rates on sanctum maps (e.g. T13).\">i</span>\n          </label>\n          <select id=\"selTierSpec\"></select>\n\n          <label for=\"selMaxSanctums\">\n            Max Modifiers per Map\n            <span class=\"ico\" tabindex=\"0\" data-tip=\"Maximum active player modifiers on one sanctum map (2 is reliable; 3 or 4 is high RNG).\">i</span>\n          </label>\n          <select id=\"selMaxSanctums\">\n            <option value=\"0\">0 (Battling / None)</option>\n            <option value=\"1\">1 Modifier</option>\n            <option value=\"2\" selected>2 Modifiers</option>\n            <option value=\"3\">3 Modifiers</option>\n            <option value=\"4\">4 Modifiers</option>\n            <option value=\"all\">All Modifiers</option>\n          </select>\n        </div>\n      </div>\n\n      <!-- 7. Combat & Partner Parameters -->\n      <div class=\"card\">\n        <div class=\"sec-label\">\n          <span>Combat &amp; Partner Speed</span>\n          <div class=\"rule\"></div>\n        </div>\n        <div class=\"fields\">\n          <label>\n            Battle Actions / hr\n            <span class=\"ico\" tabindex=\"0\" data-tip=\"Fixed at 360/hr in character combat (10.0s static action interval).\">i</span>\n          </label>\n          <div style=\"font-family:var(--num);font-weight:700;text-align:right;padding-right:.4rem\">360 / hr</div>\n\n          <label for=\"inpPartnerSpeedPoints\">\n            Partner Speed Points\n            <span class=\"ico\" tabindex=\"0\" data-tip=\"Speed points invested into partners. Formula: 18 / (0.1 + Speed/(Speed+10000)). Floor 16.36s.\">i</span>\n          </label>\n          <input type=\"number\" id=\"inpPartnerSpeedPoints\" value=\"5000\" min=\"0\" step=\"500\">\n\n          <label id=\"lblPartnerSeconds\">Partner Interval</label>\n          <div id=\"outPartnerSeconds\" style=\"font-family:var(--num);font-weight:600;text-align:right;padding-right:.4rem\">24.2s</div>\n\n          <div class=\"checkrow\" style=\"margin-top:.3rem\">\n            <input type=\"checkbox\" id=\"chkPartnerDrops\" checked>\n            <label for=\"chkPartnerDrops\" style=\"cursor:pointer\">Partner Stat Drops Active</label>\n          </div>\n\n          <label for=\"inpPartnerCount\" id=\"lblPartnerCount\">\n            Active Partners\n            <span class=\"ico\" tabindex=\"0\" data-tip=\"Partners contributing stat drops via 'partnerDropStatsAsCharacterStats' capstone.\">i</span>\n          </label>\n          <input type=\"number\" id=\"inpPartnerCount\" value=\"4\" min=\"0\" max=\"10\" step=\"1\">\n\n          <label for=\"inpStatGainMultiplier\">\n            Stat Drop Amount (xN)\n            <span class=\"ico\" tabindex=\"0\" data-tip=\"(1 + statGainFlat) × (1 + statGainPercentage). E.g. (1+1.49)×(1+5.43) = 16.01.\">i</span>\n          </label>\n          <input type=\"number\" id=\"inpStatGainMultiplier\" value=\"16.01\" step=\"0.01\">\n        </div>\n      </div>\n    </div>\n  </aside>\n\n  <!-- ======================== MAIN COLUMN ======================== -->\n  <main class=\"main-inner\">\n    <!-- v5 Verdict Card -->\n    <div class=\"verdict\" id=\"verdictCard\">\n      <div class=\"verdict-eyebrow\">Optimal Sculpture Grid Allocation</div>\n      <div class=\"verdict-headline\" id=\"verdictHeadline\">\n        OPTIMAL SPLIT: <span class=\"rate\" id=\"verdictRatePct\">175.0%</span> Stat Rate &bull; <span class=\"spec\" id=\"verdictSpecBudget\">5,125.0%</span> Specific\n      </div>\n      <div class=\"sub\" id=\"verdictSub\" style=\"margin-bottom:.5rem\">\n        Budget division: <b id=\"verdictRateBudget\">875</b> pts into Stat Rate (5× cost) &bull; <b id=\"verdictSpecBudget2\">5,125</b> pts distributed across active stats.\n      </div>\n      <div class=\"verdict-grid\">\n        <div class=\"kpi-tile\">\n          <div class=\"kpi-label\">Marginal Break-Even</div>\n          <div class=\"kpi-val\" id=\"kpiBreakEven\">1.000×</div>\n          <div class=\"kpi-sub\" id=\"kpiBreakEvenSub\">Current: 35.28× (Under-invested)</div>\n        </div>\n        <div class=\"kpi-tile\">\n          <div class=\"kpi-label\">Projected Total Gain</div>\n          <div class=\"kpi-val\" style=\"color:var(--accent)\" id=\"kpiGain\">+832.8%</div>\n          <div class=\"kpi-sub\">vs Current Grid Allocation</div>\n        </div>\n        <div class=\"kpi-tile\">\n          <div class=\"kpi-label\">Total Stat Yield / hr</div>\n          <div class=\"kpi-val\" id=\"kpiStatsPerHour\">112.5k</div>\n          <div class=\"kpi-sub\" id=\"kpiStatsPerDay\">2.70m stats / day</div>\n        </div>\n        <div class=\"kpi-tile\">\n          <div class=\"kpi-label\">Global Stat Boost %</div>\n          <div class=\"kpi-val\" id=\"kpiStatBoostTotal\">2,050.5%</div>\n          <div class=\"kpi-sub\" id=\"kpiStatBoostSub\">From 1,784.0% profile</div>\n        </div>\n      </div>\n    </div>\n\n    <!-- 1. Stats & Sanctum Matrix Table Card -->\n    <div class=\"table-card\">\n      <div class=\"table-card-head\">\n        <div>\n          <h2 class=\"table-title\">Stats &amp; Sanctum Multiplier Matrix</h2>\n          <div class=\"sub\" style=\"margin:0\">Set target ratios on the grid and allow sanctum modifiers to optimize. Canonical order: Strength, Health, Dexterity, Agility.</div>\n        </div>\n        <div class=\"fields\" style=\"display:inline-flex;align-items:center;gap:.4rem\">\n          <label for=\"inpTotalBudget\" style=\"font-weight:600\">Grid Budget:</label>\n          <input type=\"number\" id=\"inpTotalBudget\" value=\"6000\" min=\"0\" step=\"100\" style=\"width:5.4rem\">\n        </div>\n      </div>\n\n      <table class=\"matrix\" id=\"statsMatrixTable\">\n        <thead>\n          <tr>\n            <th style=\"width:2.5rem;text-align:center\">Grid</th>\n            <th style=\"min-width:12rem;text-align:left\">Stat Name</th>\n            <th class=\"num\" style=\"width:6rem\">Target Ratio</th>\n            <th class=\"num\" style=\"width:7rem\">Optimal Grid %</th>\n            <th class=\"num\" style=\"width:6.8rem\">Sanctum Map %</th>\n            <th style=\"width:5rem;text-align:center\">Sanctum Allowed</th>\n            <th class=\"num\" style=\"width:5.8rem\">Drop (1/N)</th>\n            <th class=\"num\" style=\"width:6.5rem\">Expected Drops / hr</th>\n          </tr>\n        </thead>\n        <tbody id=\"matrixTableBody\">\n          <!-- Populated by JavaScript -->\n        </tbody>\n      </table>\n    </div>\n\n    <!-- 2. Sanctum Multiplier Combinations Ranking Card -->\n    <div class=\"table-card\" id=\"sanctumRankingsCard\">\n      <div class=\"table-card-head\">\n        <div>\n          <h2 class=\"table-title\">Sanctum Combinations Ranking</h2>\n          <div class=\"sub\" style=\"margin:0\">Best map modifier combinations under current <b id=\"lblMaxSanctumsText\">2 Max Modifiers</b> limit.</div>\n        </div>\n      </div>\n      <table class=\"matrix\" id=\"sanctumRankingsTable\">\n        <thead>\n          <tr>\n            <th style=\"width:2.5rem;text-align:center\">Rank</th>\n            <th style=\"min-width:17rem;text-align:left\">Sanctum Modifiers Active</th>\n            <th class=\"num\" style=\"width:7.5rem\">Optimal Stat Rate</th>\n            <th class=\"num\" style=\"width:7.5rem\">Optimal Specific</th>\n            <th class=\"num\" style=\"width:7rem\">Est. Stats / hr</th>\n            <th class=\"num\" style=\"width:5.5rem\">Relative Yield</th>\n          </tr>\n        </thead>\n        <tbody id=\"sanctumRankingsBody\">\n          <!-- Populated by JS -->\n        </tbody>\n      </table>\n    </div>\n\n    <!-- 3. Allocation Sweep & Sensitivity Curve -->\n    <div class=\"table-card\">\n      <div class=\"table-card-head\">\n        <div>\n          <h2 class=\"table-title\">Budget Allocation Sweep (Stat Rate vs Specific)</h2>\n          <div class=\"sub\" style=\"margin:0\">Sweep of grid budget into Stat Rate (0% to 100%), showing the break-even crossing point.</div>\n        </div>\n      </div>\n      <div class=\"sweep-wrap\" id=\"sweepContainer\">\n        <!-- Rendered by JS -->\n      </div>\n    </div>\n\n    <!-- 4. Calculation Steps Panel (Collapsible) -->\n    <details class=\"panel\" id=\"stepsPanel\">\n      <summary>\n        <span>Calculation Steps (Click to expand)</span>\n        <span class=\"badge\">Exact Quadratic Solution</span>\n      </summary>\n      <div class=\"panel-body\">\n        <div class=\"step-rail\" id=\"calcStepsList\">\n          <!-- Populated by JS -->\n        </div>\n      </div>\n    </details>\n\n    <!-- 5. Formulas & Provenance Notes Panel (Collapsible) -->\n    <details class=\"panel\" id=\"formulasPanel\">\n      <summary>\n        <span>Formulas, Constants &amp; Provenance Notes (Click to expand)</span>\n        <span class=\"badge badge-success\">CODE + LIVE Validated</span>\n      </summary>\n      <div class=\"panel-body\">\n        <p><b>Core Facts &amp; Provenance:</b></p>\n        <ul>\n          <li><b>Canonical Stat Order:</b> <span class=\"step-code\">Strength &rarr; Health &rarr; Dexterity &rarr; Agility</span> is strictly preserved across all tables, formulas, and calculations.</li>\n          <li><b>Stat Drop Chance:</b> <code>statDrop.chance</code> from <span class=\"step-code\">core/data/formulas/economy.json</span>:\n            <br><code>N = pow(25*(statValue + 1), 0.4) * breakpoint(statValue > 1e6) / (1 + statBoost) / (1 + statSpecific)</code>\n            <br>Where <code>breakpoint = 1 + 2*(statValue - 1000000)/1000000</code> past 1 million stats. Confirmed independently via official patch notes PATCH 1.2.3.0.\n          </li>\n          <li><b>Sanctum Modifier Scaling:</b> <span class=\"step-code\">core/data/tables/modifier-tiers.json</span> &amp; <span class=\"step-code\">roll-coefficients.json</span>:\n            <br>Roll formula: <code>pow(max(iLevel - 100, 1), 0.49) &times; levelMultiplier &times; tierMultiplier</code>.\n            <br>Stat Rate multiplier = <b>0.001</b> (e.g. at iLevel 78189, T13 &rarr; 91.57%).\n            <br>Specific Stat Drop multiplier = <b>0.005</b> (exactly <b>5&times; higher</b>, e.g. 457.85%).\n          </li>\n          <li><b>Sculpture Roll Coefficients:</b> <span class=\"step-code\">core/data/tables/roll-coefficients.json</span>:\n            <br><code>statStrength/statHealth/statDexterity/statAgility</code> levelMultiplier = <b>0.005</b>.\n            <br><code>stat</code> (global stat rate) levelMultiplier = <b>0.001</b> (exactly <b>5× lower</b>).\n            <br><code>partnerExperience</code> levelMultiplier = <b>0.0005</b> (exactly <b>10× lower</b>).\n          </li>\n          <li><b>Partner Speed Curve:</b> <span class=\"step-code\">core/data/formulas/partners.json</span>:\n            <br>Speed interval: <code>seconds = 18 / (0.1 + Speed / (Speed + 10000))</code>. Hard floor 16.36s.\n          </li>\n        </ul>\n      </div>\n    </details>\n  </main>\n</div>\n\n<!-- Floating Back to Top Button -->\n<button class=\"back-top\" id=\"btnBackTop\" title=\"Back to top\">&uarr;</button>\n\n<script>\n/* ---------------------------------------------------------------------------\n   EQUIPMENT & SANCTUM TIER CURVE (from modifier-tiers.json)\n--------------------------------------------------------------------------- */\nvar EQUIPMENT_TIERS = [\n  { tier: 1,  boostPct: 10,  multiplier: 1.10 },\n  { tier: 2,  boostPct: 20,  multiplier: 1.20 },\n  { tier: 3,  boostPct: 30,  multiplier: 1.30 },\n  { tier: 4,  boostPct: 40,  multiplier: 1.40 },\n  { tier: 5,  boostPct: 50,  multiplier: 1.50 },\n  { tier: 6,  boostPct: 75,  multiplier: 1.75 },\n  { tier: 7,  boostPct: 100, multiplier: 2.00 },\n  { tier: 8,  boostPct: 125, multiplier: 2.25 },\n  { tier: 9,  boostPct: 150, multiplier: 2.50 },\n  { tier: 10, boostPct: 175, multiplier: 2.75 },\n  { tier: 11, boostPct: 200, multiplier: 3.00 },\n  { tier: 12, boostPct: 250, multiplier: 3.50 },\n  { tier: 13, boostPct: 275, multiplier: 3.75 },\n  { tier: 14, boostPct: 300, multiplier: 4.00 },\n  { tier: 15, boostPct: 325, multiplier: 4.25 },\n  { tier: 16, boostPct: 350, multiplier: 4.50 }\n];\n\nfunction calcSanctumModPercent(iLevel, tierNumber, isSpecificStat) {\n  var tObj = EQUIPMENT_TIERS[Math.max(0, Math.min(15, tierNumber - 1))];\n  var tMult = tObj ? tObj.multiplier : 1.0;\n  var coef = isSpecificStat ? 0.005 : 0.001;\n  var baseTerm = Math.pow(Math.max(1, iLevel - 100), 0.49);\n  return baseTerm * coef * tMult * 100;\n}\n\n/* ---------------------------------------------------------------------------\n   PURE MATH & PARSER ENGINE\n--------------------------------------------------------------------------- */\n\nfunction parsePercent(str) {\n  if (!str) return 0;\n  var cleaned = String(str).replace(/\\./g, '').replace(/,/g, '.').replace(/%/g, '').trim();\n  var val = parseFloat(cleaned);\n  return isNaN(val) ? 0 : val;\n}\n\nfunction parseFormattedNumber(str) {\n  if (!str) return 0;\n  var cleaned = String(str).replace(/\\./g, '').replace(/,/g, '').trim();\n  var val = parseFloat(cleaned);\n  return isNaN(val) ? 0 : val;\n}\n\nfunction parseProfileStatBoost(text) {\n  if (!text || typeof text !== 'string') return null;\n\n  var result = {\n    totalStatBoostPct: 0,\n    categories: { basePct: 0, pvpPct: 0, premiumPct: 0, eventPct: 0 },\n    sources: {\n      enchantsPct: 0, petsPct: 0, villageStablePct: 0, villageExplorationsPct: 0,\n      skillTreePct: 0, sculpturesPct: 0, statTilePct: 0, vipPct: 0, potionPct: 0, eventPct: 0\n    },\n    baseWithoutSculpturesPct: 0\n  };\n\n  var lines = text.split(/\\r?\\n/).map(function(l){ return l.trim(); }).filter(Boolean);\n\n  for (var i = 0; i < lines.length; i++) {\n    var line = lines[i];\n\n    if (/^Stat boost$/i.test(line) && lines[i + 1] && lines[i + 1].includes('%')) {\n      result.totalStatBoostPct = parsePercent(lines[i + 1]);\n    }\n    if (/^Enchants$/i.test(line) && lines[i + 1] && /Equipment/i.test(lines[i + 1])) {\n      if (lines[i + 2] && lines[i + 2].includes('%')) result.sources.enchantsPct = parsePercent(lines[i + 2]);\n    }\n    if (/^Stat$/i.test(line) && lines[i + 1] && /Pets/i.test(lines[i + 1])) {\n      if (lines[i + 2] && lines[i + 2].includes('%')) result.sources.petsPct = parsePercent(lines[i + 2]);\n    }\n    if (/^Stable$/i.test(line) && lines[i + 1] && /Village/i.test(lines[i + 1])) {\n      if (lines[i + 2] && lines[i + 2].includes('%')) result.sources.villageStablePct = parsePercent(lines[i + 2]);\n    }\n    if (/^Explorations$/i.test(line) && lines[i + 1] && /Village/i.test(lines[i + 1])) {\n      if (lines[i + 2] && lines[i + 2].includes('%')) result.sources.villageExplorationsPct = parsePercent(lines[i + 2]);\n    }\n    if (/^Stat$/i.test(line) && lines[i + 1] && /Skill tree/i.test(lines[i + 1])) {\n      if (lines[i + 2] && lines[i + 2].includes('%')) result.sources.skillTreePct = parsePercent(lines[i + 2]);\n    }\n    if (/^Stat$/i.test(line) && lines[i + 1] && /Sculptures/i.test(lines[i + 1])) {\n      if (lines[i + 2] && lines[i + 2].includes('%')) result.sources.sculpturesPct = parsePercent(lines[i + 2]);\n    }\n    if (/^Stat Tile$/i.test(line) && lines[i + 1] && /Village/i.test(lines[i + 1])) {\n      if (lines[i + 2] && lines[i + 2].includes('%')) result.sources.statTilePct = parsePercent(lines[i + 2]);\n    }\n    if (/^VIP$/i.test(line) && lines[i + 1] && /Premium/i.test(lines[i + 1])) {\n      if (lines[i + 2] && lines[i + 2].includes('%')) result.sources.vipPct = parsePercent(lines[i + 2]);\n    }\n    if (/^Stat$/i.test(line) && lines[i + 1] && /Potion/i.test(lines[i + 1])) {\n      if (lines[i + 2] && lines[i + 2].includes('%')) result.sources.potionPct = parsePercent(lines[i + 2]);\n    }\n    if (/^Event$/i.test(line) && lines[i + 1] && /Event/i.test(lines[i + 1])) {\n      if (lines[i + 2] && lines[i + 2].includes('%')) result.sources.eventPct = parsePercent(lines[i + 2]);\n    }\n\n    if (/^Base$/i.test(line) && lines[i + 1] && lines[i + 1].includes('%')) {\n      result.categories.basePct = parsePercent(lines[i + 1]);\n    }\n    if (/^PvP$/i.test(line) && lines[i + 1] && lines[i + 1].includes('%')) {\n      result.categories.pvpPct = parsePercent(lines[i + 1]);\n    }\n    if (/^Premium$/i.test(line) && lines[i + 1] && lines[i + 1].includes('%') && (!lines[i - 1] || !/VIP/i.test(lines[i - 1]))) {\n      result.categories.premiumPct = parsePercent(lines[i + 1]);\n    }\n    if (/^Event$/i.test(line) && lines[i + 1] && lines[i + 1].includes('%') && (!lines[i - 1] || !/Event/i.test(lines[i - 1]))) {\n      result.categories.eventPct = parsePercent(lines[i + 1]);\n    }\n  }\n\n  var calcBase = result.sources.enchantsPct + result.sources.petsPct +\n    result.sources.villageStablePct + result.sources.villageExplorationsPct +\n    result.sources.skillTreePct + result.sources.sculpturesPct;\n  if (!result.categories.basePct && calcBase > 0) result.categories.basePct = calcBase;\n  if (!result.categories.pvpPct && result.sources.statTilePct > 0) result.categories.pvpPct = result.sources.statTilePct;\n\n  var calcPrem = result.sources.vipPct + result.sources.potionPct;\n  if (!result.categories.premiumPct && calcPrem > 0) result.categories.premiumPct = calcPrem;\n\n  result.baseWithoutSculpturesPct = Math.max(0, result.categories.basePct - result.sources.sculpturesPct);\n  return result;\n}\n\nfunction calcStatDropDenominator(statValue) {\n  var v = Math.max(0, Number(statValue) || 0);\n  var breakpointMult = v > 1000000 ? 1 + (2 * (v - 1000000)) / 1000000 : 1;\n  return Math.pow(25 * (v + 1), 0.4) * breakpointMult;\n}\n\nfunction optimizeSculptureGrid(params) {\n  var totalBudgetNormalized = params.totalBudgetNormalized != null ? params.totalBudgetNormalized : 6000;\n  var baseWithoutSculpturesPct = params.baseWithoutSculpturesPct != null ? params.baseWithoutSculpturesPct : 951.71;\n  var pvpPct = params.pvpPct != null ? params.pvpPct : 10.31;\n  var premiumPct = params.premiumPct != null ? params.premiumPct : 58.93;\n  var eventPct = params.eventPct != null ? params.eventPct : 0;\n  var currentSculptureStatRatePct = params.currentSculptureStatRatePct != null ? params.currentSculptureStatRatePct : 22.9;\n  var sanctumStatRatePct = params.sanctumStatRatePct != null ? params.sanctumStatRatePct : 0;\n\n  // Canonical order: Strength, Health, Dexterity, Agility\n  var activeStats = params.activeStats || ['strength', 'health', 'dexterity', 'agility'];\n  var statRatios = params.statRatios || { strength: 1, health: 1, dexterity: 1, agility: 1 };\n  var statExternalBonusesPct = params.statExternalBonusesPct || { strength: 0, health: 0, dexterity: 0, agility: 0 };\n  var statValues = params.statValues || { strength: 521939, health: 485400, dexterity: 485400, agility: 485400 };\n  var sanctumStatMultipliersPct = params.sanctumStatMultipliersPct || { strength: 0, health: 0, dexterity: 0, agility: 0 };\n\n  // Partner XP ratio handling\n  var partnerXpRatio = params.partnerXpRatio != null ? params.partnerXpRatio : 0;\n  var partnerXpActive = params.partnerXpActive != null ? params.partnerXpActive : false;\n\n  var validStats = activeStats.filter(function(st) { return (statRatios[st] || 0) > 0; });\n  var W_stats = validStats.reduce(function(sum, st) { return sum + (statRatios[st] || 0); }, 0);\n  var effectivePxpRatio = (partnerXpActive && partnerXpRatio > 0) ? partnerXpRatio : 0;\n  var W_total = W_stats + effectivePxpRatio;\n\n  // Partner XP takes budget proportionally to its ratio, and costs 10x per %\n  var partnerXpBudgetNormalized = W_total > 0 ? (effectivePxpRatio / W_total) * totalBudgetNormalized : 0;\n  var partnerXpPct = partnerXpBudgetNormalized / 10;\n  var B_avail = Math.max(0, totalBudgetNormalized - partnerXpBudgetNormalized);\n\n  var M_ext = (1 + pvpPct / 100) * (1 + premiumPct / 100) * (1 + eventPct / 100);\n  var s_rate = sanctumStatRatePct / 100;\n\n  var Base_other = baseWithoutSculpturesPct / 100;\n  var alpha = (1 + Base_other) * M_ext * (1 + s_rate);\n  var beta = (M_ext * (1 + s_rate)) / 5;\n\n  if (validStats.length === 0 || W_stats <= 0) {\n    return {\n      optimalStatRateNormalized: B_avail,\n      optimalStatRatePct: B_avail / 5,\n      optimalSpecificBudgetNormalized: 0,\n      partnerXpBudgetNormalized: partnerXpBudgetNormalized,\n      partnerXpPct: partnerXpPct,\n      statAllocationsNormalized: {},\n      statAllocationsPct: {},\n      breakEvenRatioAtCurrent: 1.0,\n      breakEvenRatioAtOptimal: 1.0,\n      currentStatRateNormalized: Math.min(B_avail, currentSculptureStatRatePct * 5),\n      currentUtility: 0,\n      optimalUtility: 0,\n      gainPct: 0,\n      evalUtility: function() { return 0; }\n    };\n  }\n\n  var Gamma = 0;\n  var Delta = 0;\n  var statTerms = {};\n\n  for (var i = 0; i < validStats.length; i++) {\n    var st = validStats[i];\n    var w_i = statRatios[st] || 0;\n    var D_0 = (statExternalBonusesPct[st] || 0) / 100;\n    var s_i = (sanctumStatMultipliersPct[st] || 0) / 100;\n    var C_i = calcStatDropDenominator(statValues[st] || 0);\n\n    var gamma_i = (1 + D_0 + B_avail * (w_i / W_stats)) * (1 + s_i);\n    var delta_i = (w_i / W_stats) * (1 + s_i);\n    var K_i = w_i / C_i;\n\n    Gamma += K_i * gamma_i;\n    Delta += K_i * delta_i;\n\n    statTerms[st] = { w_i: w_i, D_0: D_0, s_i: s_i, C_i: C_i, gamma_i: gamma_i, delta_i: delta_i, K_i: K_i };\n  }\n\n  var unconstrainedOptimalXRate = 0.5 * (Gamma / Delta - 5 * (1 + Base_other));\n  var optimalStatRateNormalized = Math.max(0, Math.min(B_avail, unconstrainedOptimalXRate));\n  var optimalStatRatePct = optimalStatRateNormalized / 5;\n  var optimalSpecificBudgetNormalized = B_avail - optimalStatRateNormalized;\n\n  var statAllocationsNormalized = {};\n  var statAllocationsPct = {};\n  for (var j = 0; j < validStats.length; j++) {\n    var statKey = validStats[j];\n    var frac = statRatios[statKey] / W_stats;\n    statAllocationsNormalized[statKey] = optimalSpecificBudgetNormalized * frac;\n    statAllocationsPct[statKey] = statAllocationsNormalized[statKey];\n  }\n\n  function evalUtility(x) {\n    var statRateTerm = alpha + beta * x;\n    var specTerm = Gamma - Delta * x;\n    return statRateTerm * specTerm;\n  }\n\n  function calcMarginalRatio(x) {\n    var meRate = beta * (Gamma - Delta * x);\n    var meSpec = Delta * (alpha + beta * x);\n    return meSpec > 0 ? meRate / meSpec : 1.0;\n  }\n\n  var currentStatRateNormalized = Math.min(B_avail, currentSculptureStatRatePct * 5);\n  var currentUtility = evalUtility(currentStatRateNormalized);\n  var optimalUtility = evalUtility(optimalStatRateNormalized);\n  var gainPct = currentUtility > 0 ? ((optimalUtility - currentUtility) / currentUtility) * 100 : 0;\n\n  return {\n    optimalStatRateNormalized: optimalStatRateNormalized,\n    optimalStatRatePct: optimalStatRatePct,\n    optimalSpecificBudgetNormalized: optimalSpecificBudgetNormalized,\n    partnerXpBudgetNormalized: partnerXpBudgetNormalized,\n    partnerXpPct: partnerXpPct,\n    statAllocationsNormalized: statAllocationsNormalized,\n    statAllocationsPct: statAllocationsPct,\n    currentStatRateNormalized: currentStatRateNormalized,\n    currentUtility: currentUtility,\n    optimalUtility: optimalUtility,\n    gainPct: gainPct,\n    breakEvenRatioAtCurrent: calcMarginalRatio(currentStatRateNormalized),\n    breakEvenRatioAtOptimal: calcMarginalRatio(optimalStatRateNormalized),\n    evalUtility: evalUtility,\n    alpha: alpha,\n    beta: beta,\n    Gamma: Gamma,\n    Delta: Delta,\n    statTerms: statTerms,\n    B_avail: B_avail,\n    W_stats: W_stats,\n    W_total: W_total\n  };\n}\n\n// Test Seam\nwindow.__SCULPTURE_OPT_FOR_TEST = {\n  parseProfileStatBoost: parseProfileStatBoost,\n  calcStatDropDenominator: calcStatDropDenominator,\n  optimizeSculptureGrid: optimizeSculptureGrid,\n  calcSanctumModPercent: calcSanctumModPercent\n};\n\n/* ---------------------------------------------------------------------------\n   UI & DOM CONTROLLER\n--------------------------------------------------------------------------- */\n\nvar STAT_KEYS = ['strength', 'health', 'dexterity', 'agility'];\nvar STAT_META = {\n  strength: { name: 'Strength Drop Rate', class: 'stat-strength', tagClass: 'tag-strength' },\n  health: { name: 'Health Drop Rate', class: 'stat-health', tagClass: 'tag-health' },\n  dexterity: { name: 'Dexterity Drop Rate', class: 'stat-dexterity', tagClass: 'tag-dexterity' },\n  agility: { name: 'Agility Drop Rate', class: 'stat-agility', tagClass: 'tag-agility' }\n};\n\nvar DEFAULTS = {\n  theme: 'dark-beach',\n  totalBudget: 6000,\n  baseSources: {\n    enchants: 525.7,\n    pets: 0.0,\n    stable: 360.0,\n    explorations: 66.0,\n    skillTree: 0.0,\n    sculptures: 22.9\n  },\n  pvpTile: 10.31,\n  vipPct: 10.0,\n  potionPct: 48.93,\n  eventPct: 0.0,\n  charStats: {\n    strength: 521939,\n    health: 485400,\n    dexterity: 485400,\n    agility: 485400\n  },\n  externalDrops: {\n    strength: 600.0,\n    health: 0.0,\n    dexterity: 0.0,\n    agility: 0.0\n  },\n  sanctum: {\n    level: 78189,\n    tierRate: 13,\n    tierSpec: 13,\n    maxModifiers: '2'\n  },\n  partner: {\n    speedPoints: 5000,\n    dropsActive: true,\n    count: 4\n  },\n  statGainMultiplier: 16.01,\n  matrix: {\n    statRate: { allowed: true },\n    strength: { active: true, ratio: 1, allowed: true },\n    health: { active: true, ratio: 1, allowed: true },\n    dexterity: { active: true, ratio: 1, allowed: true },\n    agility: { active: true, ratio: 1, allowed: true },\n    partnerXp: { active: true, ratio: 0, allowed: false }\n  }\n};\n\nvar state = JSON.parse(JSON.stringify(DEFAULTS));\n\nfunction fmt(num, decimals) {\n  if (decimals == null) decimals = 1;\n  return Number(num).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });\n}\n\nfunction fmtInt(num) {\n  return Math.round(Number(num) || 0).toLocaleString('en-US');\n}\n\nfunction fmtK(num) {\n  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'm';\n  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';\n  return (Number(num) || 0).toFixed(0);\n}\n\n// Tooltip engine\nvar tipEl = null, tipFor = null;\nfunction showTip(el) {\n  var text = el.getAttribute('data-tip');\n  if (!text) return;\n  tipFor = el;\n  tipEl.textContent = text;\n  tipEl.classList.add('on');\n  var r = el.getBoundingClientRect();\n  var t = tipEl.getBoundingClientRect();\n  var left = Math.min(Math.max(8, r.left + r.width / 2 - t.width / 2), window.innerWidth - t.width - 8);\n  var top = r.top - t.height - 8;\n  if (top < 8) top = r.bottom + 8;\n  tipEl.style.left = Math.round(left) + 'px';\n  tipEl.style.top = Math.round(top) + 'px';\n}\nfunction hideTip() {\n  tipFor = null;\n  if (tipEl) tipEl.classList.remove('on');\n}\nfunction initTips() {\n  tipEl = document.getElementById('tip');\n  document.addEventListener('mouseover', function(e) {\n    var el = e.target && e.target.closest && e.target.closest('[data-tip]');\n    if (el) showTip(el);\n  });\n  document.addEventListener('mouseout', function(e) {\n    var el = e.target && e.target.closest && e.target.closest('[data-tip]');\n    if (el && el === tipFor) hideTip();\n  });\n  document.addEventListener('focusin', function(e) {\n    var el = e.target && e.target.closest && e.target.closest('[data-tip]');\n    if (el) showTip(el);\n  });\n  document.addEventListener('focusout', hideTip);\n  window.addEventListener('scroll', hideTip, true);\n}\n\n// Theme cycling\nvar THEMES = ['dark-beach', 'beach', 'ink', 'slate', 'umber'];\nvar THEME_LABELS = {\n  'dark-beach': 'Theme: Dark Beach',\n  'beach': 'Theme: Beach (Light)',\n  'ink': 'Theme: Ink (Dark)',\n  'slate': 'Theme: Slate (Dark)',\n  'umber': 'Theme: Umber (Dark)'\n};\n\nfunction applyTheme(name) {\n  state.theme = name;\n  var root = document.documentElement;\n  var btn = document.getElementById('btnThemeToggle');\n\n  if (name === 'beach') {\n    root.setAttribute('data-theme', 'light');\n    root.removeAttribute('data-dark');\n  } else {\n    root.setAttribute('data-theme', 'dark');\n    root.setAttribute('data-dark', name);\n  }\n  if (btn) btn.textContent = THEME_LABELS[name] || name;\n  try { localStorage.setItem('APOZ_THEME', name); } catch(e) {}\n}\n\nfunction toggleTheme() {\n  var idx = THEMES.indexOf(state.theme);\n  var nextIdx = (idx + 1) % THEMES.length;\n  applyTheme(THEMES[nextIdx]);\n}\n\n// Populate Tier dropdowns\nfunction initTierDropdowns() {\n  var selRate = document.getElementById('selTierRate');\n  var selSpec = document.getElementById('selTierSpec');\n  if (!selRate || !selSpec) return;\n\n  var opts = '';\n  EQUIPMENT_TIERS.forEach(function(t) {\n    opts += '<option value=\"' + t.tier + '\">Tier ' + t.tier + ' (+' + t.boostPct + '%)</option>';\n  });\n  selRate.innerHTML = opts;\n  selSpec.innerHTML = opts;\n}\n\n// Read inputs from DOM into state\nfunction readInputs() {\n  state.totalBudget = Math.max(0, parseFloat(document.getElementById('inpTotalBudget').value) || 0);\n\n  state.baseSources.enchants = parseFloat(document.getElementById('inpEnchants').value) || 0;\n  state.baseSources.pets = parseFloat(document.getElementById('inpPetsStat').value) || 0;\n  state.baseSources.stable = parseFloat(document.getElementById('inpVillageStable').value) || 0;\n  state.baseSources.explorations = parseFloat(document.getElementById('inpVillageExplorations').value) || 0;\n  state.baseSources.skillTree = parseFloat(document.getElementById('inpSkillTreeStat').value) || 0;\n  state.baseSources.sculptures = parseFloat(document.getElementById('inpCurrentSculptureRate').value) || 0;\n\n  state.pvpTile = parseFloat(document.getElementById('inpPvpTile').value) || 0;\n  state.vipPct = parseFloat(document.getElementById('inpVipPct').value) || 0;\n  state.potionPct = parseFloat(document.getElementById('inpPotionPct').value) || 0;\n  state.eventPct = parseFloat(document.getElementById('inpEventPct').value) || 0;\n\n  state.charStats.strength = parseFormattedNumber(document.getElementById('inpCharStrength').value);\n  state.charStats.health = parseFormattedNumber(document.getElementById('inpCharHealth').value);\n  state.charStats.dexterity = parseFormattedNumber(document.getElementById('inpCharDexterity').value);\n  state.charStats.agility = parseFormattedNumber(document.getElementById('inpCharAgility').value);\n\n  state.externalDrops.strength = parseFloat(document.getElementById('inpExtStrength').value) || 0;\n  state.externalDrops.health = parseFloat(document.getElementById('inpExtHealth').value) || 0;\n  state.externalDrops.dexterity = parseFloat(document.getElementById('inpExtDexterity').value) || 0;\n  state.externalDrops.agility = parseFloat(document.getElementById('inpExtAgility').value) || 0;\n\n  state.sanctum.level = parseFormattedNumber(document.getElementById('inpSanctumLevel').value) || 78189;\n  state.sanctum.tierRate = parseInt(document.getElementById('selTierRate').value, 10) || 13;\n  state.sanctum.tierSpec = parseInt(document.getElementById('selTierSpec').value, 10) || 13;\n  state.sanctum.maxModifiers = document.getElementById('selMaxSanctums').value;\n\n  state.partner.speedPoints = Math.max(0, parseFloat(document.getElementById('inpPartnerSpeedPoints').value) || 0);\n  state.partner.dropsActive = document.getElementById('chkPartnerDrops').checked;\n  state.partner.count = state.partner.dropsActive ? (parseInt(document.getElementById('inpPartnerCount').value, 10) || 0) : 0;\n  state.statGainMultiplier = parseFloat(document.getElementById('inpStatGainMultiplier').value) || 16.01;\n\n  // Matrix reads\n  var chkRateAllowed = document.getElementById('chk_sanctum_rate');\n  if (chkRateAllowed) state.matrix.statRate.allowed = chkRateAllowed.checked;\n\n  STAT_KEYS.forEach(function(k) {\n    var chkGrid = document.getElementById('chk_grid_' + k);\n    if (chkGrid) state.matrix[k].active = chkGrid.checked;\n    var inpRatio = document.getElementById('inp_ratio_' + k);\n    if (inpRatio) state.matrix[k].ratio = Math.max(0, parseFloat(inpRatio.value) || 0);\n    var chkAllowed = document.getElementById('chk_sanctum_' + k);\n    if (chkAllowed) state.matrix[k].allowed = chkAllowed.checked;\n  });\n\n  var chkPxpGrid = document.getElementById('chk_grid_partner_xp');\n  if (chkPxpGrid) state.matrix.partnerXp.active = chkPxpGrid.checked;\n  var inpPxpRatio = document.getElementById('inp_ratio_partner_xp');\n  if (inpPxpRatio) state.matrix.partnerXp.ratio = Math.max(0, parseFloat(inpPxpRatio.value) || 0);\n}\n\n// Build matrix table\nfunction renderMatrixTable() {\n  var tbody = document.getElementById('matrixTableBody');\n  if (!tbody) return;\n\n  var sanctumRatePct = calcSanctumModPercent(state.sanctum.level, state.sanctum.tierRate, false);\n  var sanctumSpecPct = calcSanctumModPercent(state.sanctum.level, state.sanctum.tierSpec, true);\n\n  var html = '';\n\n  // Specific stats: Strength, Health, Dexterity, Agility\n  STAT_KEYS.forEach(function(k) {\n    var m = state.matrix[k];\n    var meta = STAT_META[k];\n    html += '<tr>' +\n      '<td style=\"text-align:center\"><input type=\"checkbox\" id=\"chk_grid_' + k + '\" ' + (m.active ? 'checked' : '') + ' style=\"cursor:pointer\"></td>' +\n      '<td style=\"text-align:left\"><span class=\"stat-tag ' + meta.tagClass + '\"></span><span class=\"' + meta.class + '\">' + meta.name + '</span></td>' +\n      '<td class=\"num\"><input type=\"number\" id=\"inp_ratio_' + k + '\" value=\"' + m.ratio + '\" min=\"0\" step=\"0.5\" style=\"width:4.6rem;text-align:right\"></td>' +\n      '<td class=\"num\" id=\"out_grid_' + k + '\" style=\"font-weight:700;color:var(--warm)\">—</td>' +\n      '<td class=\"num\" id=\"out_sanctum_pct_' + k + '\" style=\"font-weight:600\">+' + fmt(sanctumSpecPct, 1) + '%</td>' +\n      '<td style=\"text-align:center\"><input type=\"checkbox\" id=\"chk_sanctum_' + k + '\" ' + (m.allowed ? 'checked' : '') + ' style=\"cursor:pointer\"></td>' +\n      '<td class=\"num\" id=\"out_drop_' + k + '\">—</td>' +\n      '<td class=\"num\" id=\"out_drops_hr_' + k + '\">—</td>' +\n      '</tr>';\n  });\n\n  // Stat Rate %\n  html += '<tr style=\"background:rgba(106,72,234,0.04)\">' +\n    '<td style=\"text-align:center\"><span class=\"badge badge-highlight\">Auto</span></td>' +\n    '<td style=\"text-align:left\"><span class=\"stat-tag tag-rate\"></span><span class=\"stat-rate\">Stat Rate %</span></td>' +\n    '<td class=\"num\" style=\"color:var(--text-faint)\"><i>Calculated</i></td>' +\n    '<td class=\"num\" id=\"out_grid_rate\" style=\"font-weight:700;color:var(--highlight)\">—</td>' +\n    '<td class=\"num\" id=\"out_sanctum_pct_rate\" style=\"font-weight:600\">+' + fmt(sanctumRatePct, 1) + '%</td>' +\n    '<td style=\"text-align:center\"><input type=\"checkbox\" id=\"chk_sanctum_rate\" ' + (state.matrix.statRate.allowed ? 'checked' : '') + ' style=\"cursor:pointer\"></td>' +\n    '<td class=\"num\" style=\"color:var(--text-faint)\">Global Divisor</td>' +\n    '<td class=\"num\" id=\"out_drops_hr_rate\">—</td>' +\n    '</tr>';\n\n  // Partner XP\n  html += '<tr style=\"background:rgba(6,182,212,0.04)\">' +\n    '<td style=\"text-align:center\"><input type=\"checkbox\" id=\"chk_grid_partner_xp\" ' + (state.matrix.partnerXp.active ? 'checked' : '') + ' style=\"cursor:pointer\"></td>' +\n    '<td style=\"text-align:left\"><span class=\"stat-tag tag-partner\"></span><span class=\"stat-partner\">Partner XP</span></td>' +\n    '<td class=\"num\"><input type=\"number\" id=\"inp_ratio_partner_xp\" value=\"' + state.matrix.partnerXp.ratio + '\" min=\"0\" step=\"0.5\" style=\"width:4.6rem;text-align:right\"></td>' +\n    '<td class=\"num\" id=\"out_grid_partner_xp\" style=\"font-weight:600;color:var(--accent)\">—</td>' +\n    '<td class=\"num\" style=\"color:var(--text-faint)\">None</td>' +\n    '<td style=\"text-align:center;color:var(--text-faint)\">—</td>' +\n    '<td class=\"num\" style=\"color:var(--text-faint)\">10× Cost</td>' +\n    '<td class=\"num\" style=\"color:var(--text-faint)\">PXP Gain</td>' +\n    '</tr>';\n\n  tbody.innerHTML = html;\n\n  tbody.querySelectorAll('input').forEach(function(inp) {\n    inp.addEventListener('input', scheduleRender);\n    inp.addEventListener('change', scheduleRender);\n  });\n}\n\nfunction computeAndRender() {\n  readInputs();\n\n  // Compute Partner Action interval from Speed Points\n  var effSpeed = state.partner.speedPoints;\n  var partnerInterval = 18 / (0.1 + effSpeed / (effSpeed + 10000));\n  partnerInterval = Math.max(16.36, partnerInterval);\n  var outPSeconds = document.getElementById('outPartnerSeconds');\n  if (outPSeconds) outPSeconds.textContent = fmt(partnerInterval, 1) + 's';\n\n  // Base without sculptures calculation\n  var baseWithoutSculptures = state.baseSources.enchants + state.baseSources.pets +\n    state.baseSources.stable + state.baseSources.explorations + state.baseSources.skillTree;\n\n  // Sanctum map modifiers\n  var sanctumRatePct = calcSanctumModPercent(state.sanctum.level, state.sanctum.tierRate, false);\n  var sanctumSpecPct = calcSanctumModPercent(state.sanctum.level, state.sanctum.tierSpec, true);\n\n  var outSancRate = document.getElementById('out_sanctum_pct_rate');\n  if (outSancRate) outSancRate.textContent = '+' + fmt(sanctumRatePct, 1) + '%';\n  STAT_KEYS.forEach(function(k) {\n    var el = document.getElementById('out_sanctum_pct_' + k);\n    if (el) el.textContent = '+' + fmt(sanctumSpecPct, 1) + '%';\n  });\n\n  var effSanctumStatRate = state.matrix.statRate.allowed ? sanctumRatePct : 0;\n\n  var activeStatsList = STAT_KEYS.filter(function(k) { return state.matrix[k].active; });\n  var statRatios = {};\n  var statExternalBonusesPct = {};\n  var statValues = {};\n  var sanctumStatMultipliersPct = {};\n\n  activeStatsList.forEach(function(k) {\n    statRatios[k] = state.matrix[k].ratio;\n    statExternalBonusesPct[k] = state.externalDrops[k] || 0;\n    statValues[k] = state.charStats[k] || 500000;\n    sanctumStatMultipliersPct[k] = state.matrix[k].allowed ? sanctumSpecPct : 0;\n  });\n\n  var opt = optimizeSculptureGrid({\n    totalBudgetNormalized: state.totalBudget,\n    partnerXpRatio: state.matrix.partnerXp.ratio,\n    partnerXpActive: state.matrix.partnerXp.active,\n    baseWithoutSculpturesPct: baseWithoutSculptures,\n    pvpPct: state.pvpTile,\n    premiumPct: state.vipPct + state.potionPct,\n    eventPct: state.eventPct,\n    currentSculptureStatRatePct: state.baseSources.sculptures,\n    sanctumStatRatePct: effSanctumStatRate,\n    activeStats: activeStatsList,\n    statRatios: statRatios,\n    statExternalBonusesPct: statExternalBonusesPct,\n    statValues: statValues,\n    sanctumStatMultipliersPct: sanctumStatMultipliersPct\n  });\n\n  // Actions per hour\n  var charActionsHr = 360; // Static 10s interval\n  var partnerActionsHr = (state.partner.dropsActive && state.partner.count > 0) ? state.partner.count * (3600 / partnerInterval) : 0;\n  var totalActionsHr = charActionsHr + partnerActionsHr;\n\n  // Verdict Card\n  document.getElementById('verdictRatePct').textContent = fmt(opt.optimalStatRatePct, 1) + '%';\n  document.getElementById('verdictSpecBudget').textContent = fmt(opt.optimalSpecificBudgetNormalized, 1) + '%';\n  document.getElementById('verdictRateBudget').textContent = fmtInt(opt.optimalStatRateNormalized);\n  document.getElementById('verdictSpecBudget2').textContent = fmtInt(opt.optimalSpecificBudgetNormalized);\n\n  var kpiBreakEven = document.getElementById('kpiBreakEven');\n  kpiBreakEven.textContent = fmt(opt.breakEvenRatioAtOptimal, 3) + '×';\n  document.getElementById('kpiBreakEvenSub').textContent = 'Current: ' + fmt(opt.breakEvenRatioAtCurrent, 2) + '× (' +\n    (opt.breakEvenRatioAtCurrent > 1.05 ? 'Under-invested in Stat Rate' : (opt.breakEvenRatioAtCurrent < 0.95 ? 'Over-invested in Stat Rate' : 'Balanced')) + ')';\n\n  var kpiGain = document.getElementById('kpiGain');\n  kpiGain.textContent = (opt.gainPct >= 0 ? '+' : '') + fmt(opt.gainPct, 1) + '%';\n  kpiGain.style.color = opt.gainPct > 0 ? 'var(--accent)' : 'var(--text)';\n\n  var Base_opt = (baseWithoutSculptures + opt.optimalStatRatePct) / 100;\n  var M_ext = (1 + state.pvpTile / 100) * (1 + (state.vipPct + state.potionPct) / 100) * (1 + state.eventPct / 100);\n  var statBoostTotalOptimal = ((1 + Base_opt) * M_ext * (1 + effSanctumStatRate / 100) - 1) * 100;\n  document.getElementById('kpiStatBoostTotal').textContent = fmt(statBoostTotalOptimal, 1) + '%';\n  document.getElementById('kpiStatBoostSub').textContent = 'Base: ' + fmt(baseWithoutSculptures + opt.optimalStatRatePct, 1) + '%';\n\n  // Matrix outputs\n  var outRateGrid = document.getElementById('out_grid_rate');\n  if (outRateGrid) outRateGrid.textContent = '+' + fmt(opt.optimalStatRatePct, 2) + '% (' + fmtInt(opt.optimalStatRateNormalized) + ' pts)';\n\n  var totalStatsHr = 0;\n\n  STAT_KEYS.forEach(function(k) {\n    var outGrid = document.getElementById('out_grid_' + k);\n    var outDrop = document.getElementById('out_drop_' + k);\n    var outHr = document.getElementById('out_drops_hr_' + k);\n    if (!outGrid) return;\n\n    if (!state.matrix[k].active) {\n      outGrid.textContent = 'Excluded';\n      outGrid.style.color = 'var(--text-faint)';\n      outDrop.textContent = '—';\n      outHr.textContent = '—';\n      return;\n    }\n\n    var allocPct = opt.statAllocationsPct[k] || 0;\n    outGrid.textContent = '+' + fmt(allocPct, 1) + '%';\n    outGrid.style.color = 'var(--warm)';\n\n    var totalStatSpecific = ((state.externalDrops[k] || 0) + allocPct) / 100;\n    var s_i = state.matrix[k].allowed ? (sanctumSpecPct / 100) : 0;\n    var effSpecific = (1 + totalStatSpecific) * (1 + s_i);\n    var effStatBoost = (1 + statBoostTotalOptimal / 100);\n    var C_i = calcStatDropDenominator(state.charStats[k] || 500000);\n\n    var N = C_i / (effStatBoost * effSpecific);\n    outDrop.textContent = '1 / ' + fmt(N, 1);\n\n    var dropsPerHour = (totalActionsHr / N) * state.statGainMultiplier;\n    outHr.textContent = fmtK(dropsPerHour);\n    totalStatsHr += dropsPerHour;\n  });\n\n  document.getElementById('kpiStatsPerHour').textContent = fmtK(totalStatsHr);\n  document.getElementById('kpiStatsPerDay').textContent = fmtK(totalStatsHr * 24) + ' stats / day';\n\n  var outPxpGrid = document.getElementById('out_grid_partner_xp');\n  if (outPxpGrid) {\n    outPxpGrid.textContent = state.matrix.partnerXp.active ? '+' + fmt(opt.partnerXpPct, 1) + '% (' + fmtInt(opt.partnerXpBudgetNormalized) + ' pts)' : '0%';\n  }\n\n  renderSanctumRankings(sanctumRatePct, sanctumSpecPct, baseWithoutSculptures);\n  renderSensitivitySweep(opt);\n  renderCalcSteps(opt, statBoostTotalOptimal, baseWithoutSculptures);\n}\n\n// Sanctum Combination Rankings\nfunction renderSanctumRankings(sanctumRatePct, sanctumSpecPct, baseWithoutSculptures) {\n  var tbody = document.getElementById('sanctumRankingsBody');\n  var lblMax = document.getElementById('lblMaxSanctumsText');\n  if (!tbody) return;\n\n  var maxK = state.sanctum.maxModifiers === 'all' ? 5 : parseInt(state.sanctum.maxModifiers, 10);\n  if (lblMax) lblMax.textContent = state.sanctum.maxModifiers === 'all' ? 'All Modifiers' : maxK + ' Max Modifiers';\n\n  var candidates = [];\n  if (state.matrix.statRate.allowed) {\n    candidates.push({ key: 'rate', name: '<span class=\"stat-rate\">Stat Rate</span> (+' + fmt(sanctumRatePct, 0) + '%)', isRate: true });\n  }\n\n  STAT_KEYS.forEach(function(k) {\n    if (state.matrix[k].active && state.matrix[k].allowed) {\n      candidates.push({ key: k, name: '<span class=\"' + STAT_META[k].class + '\">' + STAT_META[k].name.replace(' Drop Rate', '') + '</span> (+' + fmt(sanctumSpecPct, 0) + '%)', isRate: false });\n    }\n  });\n\n  function getSubsets(arr, k) {\n    var result = [[]];\n    for (var i = 0; i < arr.length; i++) {\n      var item = arr[i];\n      var len = result.length;\n      for (var j = 0; j < len; j++) {\n        var sub = result[j].concat([item]);\n        if (sub.length <= k) result.push(sub);\n      }\n    }\n    return result;\n  }\n\n  var allCombos = getSubsets(candidates, maxK);\n\n  var evaluated = allCombos.map(function(combo) {\n    var hasRate = combo.some(function(c) { return c.isRate; });\n    var effSanctumStatRate = hasRate ? sanctumRatePct : 0;\n\n    var activeStatsList = STAT_KEYS.filter(function(k) { return state.matrix[k].active; });\n    var statRatios = {};\n    var statExternalBonusesPct = {};\n    var statValues = {};\n    var sanctumStatMultipliersPct = {};\n\n    activeStatsList.forEach(function(k) {\n      statRatios[k] = state.matrix[k].ratio;\n      statExternalBonusesPct[k] = state.externalDrops[k] || 0;\n      statValues[k] = state.charStats[k] || 500000;\n      var isActiveInCombo = combo.some(function(c) { return c.key === k; });\n      sanctumStatMultipliersPct[k] = isActiveInCombo ? sanctumSpecPct : 0;\n    });\n\n    var opt = optimizeSculptureGrid({\n      totalBudgetNormalized: state.totalBudget,\n      partnerXpRatio: state.matrix.partnerXp.ratio,\n      partnerXpActive: state.matrix.partnerXp.active,\n      baseWithoutSculpturesPct: baseWithoutSculptures,\n      pvpPct: state.pvpTile,\n      premiumPct: state.vipPct + state.potionPct,\n      eventPct: state.eventPct,\n      currentSculptureStatRatePct: state.baseSources.sculptures,\n      sanctumStatRatePct: effSanctumStatRate,\n      activeStats: activeStatsList,\n      statRatios: statRatios,\n      statExternalBonusesPct: statExternalBonusesPct,\n      statValues: statValues,\n      sanctumStatMultipliersPct: sanctumStatMultipliersPct\n    });\n\n    var charActionsHr = 360;\n    var partnerInterval = Math.max(16.36, 18 / (0.1 + state.partner.speedPoints / (state.partner.speedPoints + 10000)));\n    var partnerActionsHr = (state.partner.dropsActive && state.partner.count > 0) ? state.partner.count * (3600 / partnerInterval) : 0;\n    var totalActionsHr = charActionsHr + partnerActionsHr;\n\n    var Base_opt = (baseWithoutSculptures + opt.optimalStatRatePct) / 100;\n    var M_ext = (1 + state.pvpTile / 100) * (1 + (state.vipPct + state.potionPct) / 100) * (1 + state.eventPct / 100);\n    var statBoostTotal = ((1 + Base_opt) * M_ext * (1 + effSanctumStatRate / 100) - 1) * 100;\n\n    var totalDropsHr = 0;\n    activeStatsList.forEach(function(k) {\n      var allocPct = opt.statAllocationsPct[k] || 0;\n      var totalStatSpecific = ((state.externalDrops[k] || 0) + allocPct) / 100;\n      var s_i = sanctumStatMultipliersPct[k] / 100;\n      var effSpecific = (1 + totalStatSpecific) * (1 + s_i);\n      var effStatBoost = (1 + statBoostTotal / 100);\n      var C_i = calcStatDropDenominator(state.charStats[k] || 500000);\n      var N = C_i / (effStatBoost * effSpecific);\n      totalDropsHr += (totalActionsHr / N) * state.statGainMultiplier;\n    });\n\n    var label = combo.length === 0 ? '<i>None (Battling / Normal)</i>' : combo.map(function(c) { return c.name; }).join(' + ');\n\n    return {\n      combo: combo,\n      label: label,\n      opt: opt,\n      totalDropsHr: totalDropsHr\n    };\n  });\n\n  evaluated.sort(function(a, b) { return b.totalDropsHr - a.totalDropsHr; });\n\n  var baseline = evaluated[evaluated.length - 1].totalDropsHr || 1;\n  var top10 = evaluated.slice(0, 8);\n\n  var html = '';\n  top10.forEach(function(row, idx) {\n    var rel = (row.totalDropsHr / baseline);\n    html += '<tr>' +\n      '<td style=\"text-align:center;font-weight:700\">' + (idx + 1) + '</td>' +\n      '<td style=\"text-align:left\">' + row.label + '</td>' +\n      '<td class=\"num\" style=\"font-weight:600;color:var(--highlight)\">+' + fmt(row.opt.optimalStatRatePct, 1) + '%</td>' +\n      '<td class=\"num\" style=\"font-weight:600;color:var(--warm)\">' + fmtInt(row.opt.optimalSpecificBudgetNormalized) + ' pts</td>' +\n      '<td class=\"num\" style=\"font-weight:700\">' + fmtK(row.totalDropsHr) + '</td>' +\n      '<td class=\"num\"><span class=\"badge badge-success\">' + fmt(rel, 2) + '×</span></td>' +\n      '</tr>';\n  });\n\n  tbody.innerHTML = html;\n}\n\n// Render Sensitivity Sweep\nfunction renderSensitivitySweep(opt) {\n  var container = document.getElementById('sweepContainer');\n  if (!container) return;\n\n  var B = opt.B_avail || 6000;\n  var steps = 10;\n  var sweepPoints = [];\n\n  for (var i = 0; i <= steps; i++) {\n    sweepPoints.push((B / steps) * i);\n  }\n\n  sweepPoints.push(opt.currentStatRateNormalized);\n  sweepPoints.push(opt.optimalStatRateNormalized);\n  sweepPoints.sort(function(a, b) { return a - b; });\n\n  var dedup = [];\n  for (var j = 0; j < sweepPoints.length; j++) {\n    if (j === 0 || Math.abs(sweepPoints[j] - sweepPoints[j - 1]) > 50) {\n      dedup.push(sweepPoints[j]);\n    }\n  }\n\n  var maxUtil = opt.optimalUtility > 0 ? opt.optimalUtility : 1;\n\n  var html = '<div class=\"sweep-bar-row\" style=\"font-weight:600;color:var(--text-faint)\">' +\n    '<span>Stat Rate Pts</span><span>Relative Yield Curve</span><span style=\"text-align:right\">Rate %</span><span style=\"text-align:right\">Ratio</span></div>';\n\n  dedup.forEach(function(x) {\n    var u = opt.evalUtility(x);\n    var pct = Math.max(2, (u / maxUtil) * 100);\n    var isOpt = Math.abs(x - opt.optimalStatRateNormalized) < 25;\n    var isCurr = Math.abs(x - opt.currentStatRateNormalized) < 25;\n\n    var fillClass = isOpt ? 'sweep-bar-fill optimal' : (isCurr ? 'sweep-bar-fill current' : 'sweep-bar-fill');\n    var badge = isOpt ? ' <span class=\"badge badge-highlight\">Optimal</span>' : (isCurr ? ' <span class=\"badge\">Current</span>' : '');\n\n    html += '<div class=\"sweep-bar-row\">' +\n      '<span style=\"font-family:var(--num)\">' + fmtInt(x) + badge + '</span>' +\n      '<div class=\"sweep-bar-bg\"><div class=\"' + fillClass + '\" style=\"width:' + pct + '%\"></div></div>' +\n      '<span style=\"font-family:var(--num);text-align:right\">+' + fmt(x / 5, 1) + '%</span>' +\n      '<span style=\"font-family:var(--num);text-align:right\">' + fmt((pct / 100), 2) + '×</span>' +\n      '</div>';\n  });\n\n  container.innerHTML = html;\n}\n\n// Render Step-by-Step Rail\nfunction renderCalcSteps(opt, statBoostTotalOptimal, baseWithoutSculptures) {\n  var rail = document.getElementById('calcStepsList');\n  if (!rail) return;\n\n  var html = '' +\n    '<div class=\"step-row\">' +\n      '<div class=\"step-num\">1</div>' +\n      '<div>' +\n        '<div class=\"step-title\">Effective Grid Budget &amp; Partner XP Allocation</div>' +\n        '<div>Total normalized budget: <span class=\"step-code\">' + fmtInt(state.totalBudget) + '</span> pts. Partner XP allocation: <span class=\"step-code\">' + fmtInt(opt.partnerXpBudgetNormalized) + '</span> pts (+' + fmt(opt.partnerXpPct, 1) + '% PXP). Available for stat optimization: <span class=\"step-code\">B_avail = ' + fmtInt(opt.B_avail) + '</span> pts.</div>' +\n      '</div>' +\n    '</div>' +\n\n    '<div class=\"step-row\">' +\n      '<div class=\"step-num\">2</div>' +\n      '<div>' +\n        '<div class=\"step-title\">Global Stat Rate Multiplier Term (&alpha; and &beta;)</div>' +\n        '<div>Base without sculptures = <span class=\"step-code\">' + fmt(baseWithoutSculptures, 1) + '%</span>. External Category Multiplier M_ext = <span class=\"step-code\">' + fmt((1 + state.pvpTile/100)*(1 + (state.vipPct+state.potionPct)/100)*(1 + state.eventPct/100), 3) + '</span>.</div>' +\n        '<div>Since Stat Rate on sculptures gets 1/5th bonus: <span class=\"step-code\">&alpha; = ' + fmt(opt.alpha, 3) + '</span>, <span class=\"step-code\">&beta; = ' + fmt(opt.beta, 4) + '</span> (where &alpha;/&beta; = 5 &times; (1 + Base_other) = ' + fmt(5*(1 + baseWithoutSculptures/100), 2) + ').</div>' +\n      '</div>' +\n    '</div>' +\n\n    '<div class=\"step-row\">' +\n      '<div class=\"step-num\">3</div>' +\n      '<div>' +\n        '<div class=\"step-title\">Specific Stat Drop Multipliers (&Gamma; and &Delta;)</div>' +\n        '<div>Aggregating across active droppable stats: <span class=\"step-code\">&Gamma; = ' + fmt(opt.Gamma, 4) + '</span>, <span class=\"step-code\">&Delta; = ' + fmt(opt.Delta, 6) + '</span>.</div>' +\n      '</div>' +\n    '</div>' +\n\n    '<div class=\"step-row\">' +\n      '<div class=\"step-num\">4</div>' +\n      '<div>' +\n        '<div class=\"step-title\">Closed-Form Optimum (Zero-Derivative Condition)</div>' +\n        '<div>Objective parabola V(x) = (&alpha; + &beta;x)(&Gamma; - &Delta;x). Maximum occurs exactly at:</div>' +\n        '<div><span class=\"step-code\">x* = 0.5 &times; (&Gamma;/&Delta; - &alpha;/&beta;) = ' + fmt(opt.optimalStatRateNormalized, 1) + ' pts</span> (&rarr; <span class=\"step-code\">+' + fmt(opt.optimalStatRatePct, 2) + '%</span> Stat Rate on Sculpture Grid).</div>' +\n      '</div>' +\n    '</div>' +\n\n    '<div class=\"step-row\">' +\n      '<div class=\"step-num\">5</div>' +\n      '<div>' +\n        '<div class=\"step-title\">Marginal Break-Even Condition</div>' +\n        '<div>Marginal efficiency ratio: <span class=\"step-code\">ME_rate / ME_spec = ' + fmt(opt.breakEvenRatioAtOptimal, 4) + '&times;</span> at optimum (perfect break-even).</div>' +\n      '</div>' +\n    '</div>';\n\n  rail.innerHTML = html;\n}\n\nvar renderPending = false;\nfunction scheduleRender() {\n  if (renderPending) return;\n  renderPending = true;\n  var callback = function() {\n    renderPending = false;\n    computeAndRender();\n    scheduleSave();\n  };\n  if (document.hidden) {\n    setTimeout(callback, 20);\n  } else {\n    requestAnimationFrame(callback);\n  }\n}\n\nvar saveTimer = null;\nfunction scheduleSave() {\n  if (saveTimer) clearTimeout(saveTimer);\n  saveTimer = setTimeout(function() {\n    try {\n      localStorage.setItem('APOZ_SCULPTURE_OPT_STATE', JSON.stringify(state));\n    } catch(e) {}\n  }, 800);\n}\n\nfunction loadSavedState() {\n  try {\n    var raw = localStorage.getItem('APOZ_SCULPTURE_OPT_STATE');\n    if (raw) {\n      var parsed = JSON.parse(raw);\n      for (var k in parsed) {\n        if (state.hasOwnProperty(k)) state[k] = parsed[k];\n      }\n    }\n  } catch(e) {}\n}\n\nfunction init() {\n  initTips();\n  initTierDropdowns();\n  loadSavedState();\n\n  // Apply restored theme\n  var savedTheme = localStorage.getItem('APOZ_THEME') || state.theme || 'dark-beach';\n  applyTheme(savedTheme);\n\n  // Populate UI from state\n  document.getElementById('inpTotalBudget').value = state.totalBudget;\n\n  document.getElementById('inpEnchants').value = state.baseSources.enchants;\n  document.getElementById('inpPetsStat').value = state.baseSources.pets;\n  document.getElementById('inpVillageStable').value = state.baseSources.stable;\n  document.getElementById('inpVillageExplorations').value = state.baseSources.explorations;\n  document.getElementById('inpSkillTreeStat').value = state.baseSources.skillTree;\n  document.getElementById('inpCurrentSculptureRate').value = state.baseSources.sculptures;\n\n  document.getElementById('inpPvpTile').value = state.pvpTile;\n  document.getElementById('inpVipPct').value = state.vipPct;\n  document.getElementById('inpPotionPct').value = state.potionPct;\n  document.getElementById('inpEventPct').value = state.eventPct;\n\n  document.getElementById('inpCharStrength').value = fmtInt(state.charStats.strength);\n  document.getElementById('inpCharHealth').value = fmtInt(state.charStats.health);\n  document.getElementById('inpCharDexterity').value = fmtInt(state.charStats.dexterity);\n  document.getElementById('inpCharAgility').value = fmtInt(state.charStats.agility);\n\n  document.getElementById('inpExtStrength').value = state.externalDrops.strength;\n  document.getElementById('inpExtHealth').value = state.externalDrops.health;\n  document.getElementById('inpExtDexterity').value = state.externalDrops.dexterity;\n  document.getElementById('inpExtAgility').value = state.externalDrops.agility;\n\n  document.getElementById('inpSanctumLevel').value = fmtInt(state.sanctum.level);\n  document.getElementById('selTierRate').value = state.sanctum.tierRate;\n  document.getElementById('selTierSpec').value = state.sanctum.tierSpec;\n  document.getElementById('selMaxSanctums').value = state.sanctum.maxModifiers;\n\n  document.getElementById('inpPartnerSpeedPoints').value = state.partner.speedPoints;\n  document.getElementById('chkPartnerDrops').checked = state.partner.dropsActive;\n  document.getElementById('inpPartnerCount').value = state.partner.count;\n  document.getElementById('inpStatGainMultiplier').value = state.statGainMultiplier;\n\n  // Live Userscript Handover Check\n  if (window.APOZ_LIVE) {\n    var banner = document.getElementById('liveUserscriptBanner');\n    if (banner) banner.removeAttribute('hidden');\n    document.getElementById('btnApplyLive').addEventListener('click', function() {\n      if (!window.APOZ_LIVE) return;\n      var live = window.APOZ_LIVE;\n      if (live.stats) {\n        if (live.stats.strength) state.charStats.strength = live.stats.strength;\n        if (live.stats.health) state.charStats.health = live.stats.health;\n        if (live.stats.dexterity) state.charStats.dexterity = live.stats.dexterity;\n        if (live.stats.agility) state.charStats.agility = live.stats.agility;\n        document.getElementById('inpCharStrength').value = fmtInt(state.charStats.strength);\n        document.getElementById('inpCharHealth').value = fmtInt(state.charStats.health);\n        document.getElementById('inpCharDexterity').value = fmtInt(state.charStats.dexterity);\n        document.getElementById('inpCharAgility').value = fmtInt(state.charStats.agility);\n      }\n      scheduleRender();\n    });\n  }\n\n  // Sidebar events\n  var sidebarInputs = document.querySelectorAll('.sidebar input, .sidebar select');\n  sidebarInputs.forEach(function(el) {\n    el.addEventListener('input', scheduleRender);\n    el.addEventListener('change', scheduleRender);\n  });\n\n  // Format large number inputs with commas on blur\n  ['inpCharStrength', 'inpCharHealth', 'inpCharDexterity', 'inpCharAgility', 'inpSanctumLevel'].forEach(function(id) {\n    var inp = document.getElementById(id);\n    if (!inp) return;\n    inp.addEventListener('blur', function() {\n      var val = parseFormattedNumber(inp.value);\n      inp.value = fmtInt(val);\n      scheduleRender();\n    });\n  });\n\n  // Buttons\n  document.getElementById('btnThemeToggle').addEventListener('click', toggleTheme);\n\n  document.getElementById('btnReset').addEventListener('click', function() {\n    state = JSON.parse(JSON.stringify(DEFAULTS));\n    localStorage.removeItem('APOZ_SCULPTURE_OPT_STATE');\n    init();\n  });\n\n  document.getElementById('btnSaveDefault').addEventListener('click', function() {\n    readInputs();\n    try {\n      localStorage.setItem('APOZ_SCULPTURE_OPT_STATE', JSON.stringify(state));\n      alert('Saved current configuration as default!');\n    } catch(e) {}\n  });\n\n  // Profile paste handlers\n  var pasteInput = document.getElementById('profilePasteInput');\n  var parseStatusBadge = document.getElementById('parseStatusBadge');\n  var parseSummary = document.getElementById('parseSummary');\n\n  document.getElementById('btnApplyParsed').addEventListener('click', function() {\n    var txt = pasteInput.value;\n    if (!txt.trim()) return;\n    var parsed = parseProfileStatBoost(txt);\n    if (!parsed) return;\n\n    state.baseSources.enchants = parsed.sources.enchantsPct;\n    state.baseSources.pets = parsed.sources.petsPct;\n    state.baseSources.stable = parsed.sources.villageStablePct;\n    state.baseSources.explorations = parsed.sources.villageExplorationsPct;\n    state.baseSources.skillTree = parsed.sources.skillTreePct;\n    state.baseSources.sculptures = parsed.sources.sculpturesPct;\n\n    state.pvpTile = parsed.categories.pvpPct;\n    state.vipPct = parsed.sources.vipPct;\n    state.potionPct = parsed.sources.potionPct;\n    state.eventPct = parsed.categories.eventPct;\n\n    document.getElementById('inpEnchants').value = state.baseSources.enchants;\n    document.getElementById('inpPetsStat').value = state.baseSources.pets;\n    document.getElementById('inpVillageStable').value = state.baseSources.stable;\n    document.getElementById('inpVillageExplorations').value = state.baseSources.explorations;\n    document.getElementById('inpSkillTreeStat').value = state.baseSources.skillTree;\n    document.getElementById('inpCurrentSculptureRate').value = state.baseSources.sculptures;\n\n    document.getElementById('inpPvpTile').value = state.pvpTile;\n    document.getElementById('inpVipPct').value = state.vipPct;\n    document.getElementById('inpPotionPct').value = state.potionPct;\n    document.getElementById('inpEventPct').value = state.eventPct;\n\n    parseStatusBadge.textContent = 'Applied';\n    parseStatusBadge.className = 'badge badge-success';\n    parseSummary.innerHTML = 'Extracted: Total <b>' + fmt(parsed.totalStatBoostPct, 2) + '%</b> | Base (excl. sculp) <b>' +\n      fmt(parsed.baseWithoutSculpturesPct, 2) + '%</b> | Sculptures <b>' + fmt(parsed.sources.sculpturesPct, 2) + '%</b> | PvP <b>' +\n      fmt(parsed.categories.pvpPct, 2) + '%</b> | Premium <b>' + fmt(parsed.categories.premiumPct, 2) + '%</b>';\n\n    scheduleRender();\n  });\n\n  document.getElementById('btnLoadSample').addEventListener('click', function() {\n    var sample = \"Stat boost\\n1.784,02%\\nIncreases stat gained globally\\n\\n(1 + 974,61%) × (1 + 10,31%) × (1 + 58,93%) × (1 + 0%) - 1 = 1.784,02%\\nBase\\n974,61%\\n├─\\nEnchants\\nEquipment\\n525,7%\\n├─\\nStat\\nPets\\n0%\\n├─\\nStable\\nVillage\\n360%\\n├─\\nExplorations\\nVillage\\n66%\\n├─\\nStat\\nSkill tree\\n0%\\n├─\\nStat\\nSculptures\\n22,9%\\nPvP\\n10,31%\\n├─\\nStat Tile\\nVillage\\n10,31%\\nPremium\\n58,93%\\n├─\\nVIP\\nPremium\\n10%\\n├─\\nStat\\nPotion\\n48,93%\\nEvent\\n0%\\n├─\\nEvent\\nEvent\\n0%\";\n    pasteInput.value = sample;\n    document.getElementById('btnApplyParsed').click();\n  });\n\n  document.getElementById('btnClearPaste').addEventListener('click', function() {\n    pasteInput.value = '';\n    parseStatusBadge.textContent = 'Ready';\n    parseStatusBadge.className = 'badge';\n    parseSummary.textContent = '';\n  });\n\n  renderMatrixTable();\n  computeAndRender();\n\n  var btnBackTop = document.getElementById('btnBackTop');\n  window.addEventListener('scroll', function() {\n    if (window.scrollY > 300) {\n      btnBackTop.classList.add('visible');\n    } else {\n      btnBackTop.classList.remove('visible');\n    }\n  });\n  btnBackTop.addEventListener('click', function() {\n    window.scrollTo({ top: 0, behavior: 'smooth' });\n  });\n}\n\nif (document.readyState === 'loading') {\n  document.addEventListener('DOMContentLoaded', init);\n} else {\n  init();\n}\n</script>\n</body>\n</html>\n";

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
  })("eta-tracker", "4.11.6", function (Core) {


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
  // FIXED 2026-09-10 — REPORTED REGRESSION: "alarm doesn't capture the pet
  // slot level any more... used to do that successfully and stable." Root
  // cause: a live patch moved the player's own Pets page from `/game/pets`
  // to `/game/profile/pets` (user-confirmed live, this session) — which broke
  // TWO things in the old gate at once: the prefix match no longer matched
  // the new own-page path at all, AND even a widened prefix match would have
  // been immediately vetoed by the very blacklist this function used to keep
  // out other players' views (`/profile/` was on it, precisely because
  // "someone else's profile" was the failure mode being guarded against —
  // and now that literal word is part of YOUR OWN path too).
  //
  // Replaced the prefix + word-blacklist with an EXACT match on the full own-
  // page path instead of trying to patch the blacklist. This sidesteps the
  // conflict rather than re-solving it with another guessed word: any other
  // player's view needs an extra path segment (an id, a slug, `/view/...`,
  // whatever the game actually uses — still not live-confirmed, see the note
  // below), and an exact match rejects every one of those by construction,
  // with no need to enumerate them. Doubt still reads as "not sure" and
  // returns false, matching this function's whole reason for existing.
  //
  // STILL NEEDS ONE LIVE CONFIRMATION: what another player's Pets view URL
  // actually looks like now, to be sure it does NOT also collapse to exactly
  // `/game/profile/pets` (e.g. if the game scopes the viewed player by query
  // string or session state rather than the path). Exact-match is strictly
  // safer than the old prefix+blacklist against everything checked so far,
  // but has not been checked against a real other-player URL post-patch.
  function isOwnPetsPage() {
    return location.pathname.replace(/\/+$/, '') === '/game/profile/pets';
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

  // The battle card, read for BOTH numbers it shows.
  //
  // It reports gold gained and gold kept, and the difference is the village
  // tax. That makes the tax rate a derived measurement rather than something
  // the user has to look up and type - and it is measured from the same card
  // in the same instant, so the two figures cannot drift apart.
  //
  // Guarded hard, because a wrong tax silently rescales every number in the
  // ROI tool: both values must parse, the kept must be strictly smaller and
  // strictly positive, and the implied rate must land in a sane band. Anything
  // else returns no rate at all rather than a suspicious one.
  function scanPartyGoldCard() {
    const root = document.querySelector('main') || document.body;
    for (const span of root.querySelectorAll('.font-semibold')) {
      if (!/gold$/i.test(span.textContent.trim())) continue;
      const muted = span.parentElement && span.parentElement.querySelector('.text-muted-foreground');
      if (!muted) continue;
      const lines = [...muted.querySelectorAll('div')].map((d) => d.textContent.trim());
      if (!lines.length) continue;

      let kept = null, gross = null;
      for (const line of lines) {
        // suffix set matches the game's own ladder (k..ud), not just k/m/b/t
        const keptMatch = line.match(/^([\d.,]+\s*(?:[a-z]{1,2})?)\s*kept/i);
        if (keptMatch) { const v = parseGoldString(keptMatch[1]); if (v !== null) kept = v; continue; }
        const bare = line.match(/^([\d.,]+\s*(?:[a-z]{1,2})?)\s*(?:gold\b|gained\b)?$/i);
        if (bare) { const v = parseGoldString(bare[1]); if (v !== null && v > 0) gross = Math.max(gross || 0, v); }
      }
      if (kept === null) continue;

      let taxRate = null;
      if (gross !== null && gross > kept && kept > 0) {
        const rate = 1 - kept / gross;
        // A village tax outside this band is far likelier to be two unrelated
        // numbers on one card than a real rate.
        if (rate > 0.0005 && rate < 0.75) taxRate = rate;
      }
      return { kept, gross, taxRate };
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
  let partyStaleSaidAtMs = null; // rate-limits the stale-party-reading strip line
  let keepAwakeBeforeSilence = false; // what silencing pulled down, so un-silencing can restore it

  // PLAYER confidence, and deliberately a setting rather than a constant.
  // The user's own figure: party actions run overnight, the daily reset lands
  // in the middle, and the pool is topped up by roughly this much before the
  // session ends. It is an average of someone's own experience, not a measured
  // game fact, so it lives where it can be corrected and is labelled as an
  // assumption wherever it changes a number. 0 turns it off.
  const OVERNIGHT_ACTIONS_DEFAULT = 860;
  let overnightActions = OVERNIGHT_ACTIONS_DEFAULT;

  // probeMergedMultipliers walks the React fiber, which is not free, and the
  // projection wants it on every render. Cached with a TTL rather than probed
  // per frame; null means "not readable right now", which the projection
  // reports rather than papering over.
  let mergedCache = null, mergedCacheAtMs = 0;
  const MERGED_TTL_MS = 60000;
  function mergedMultipliers() {
    if (mergedCache && Date.now() - mergedCacheAtMs < MERGED_TTL_MS) return mergedCache;
    if (typeof Core.probeMergedMultipliers !== 'function') return null;
    const m = Core.probeMergedMultipliers();
    if (m) { mergedCache = m; mergedCacheAtMs = Date.now(); }
    return m || null;
  }
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

  // ---- the run's end condition (v4.8) ----
  //
  // "Run for N actions" became "run until N actions remain, PARTY-WIDE", and
  // that is not a relabel: it swaps a DEADLINE, which cannot fail, for a
  // THRESHOLD on a live probe, which can. `configuredRunActions` now means the
  // party-actions figure to stop AT, not a count of your own actions to burn.
  //
  // Three rules, and the first is the one that matters:
  //
  // 1. AN ABSENT READING NEVER ENDS THE SESSION. Treating "I could not read
  //    the party's actions" as "the party has none left" is absent-as-zero,
  //    the exact failure CLAUDE.md rule 3 exists to stop, and here it would
  //    silence an alarm the user is relying on. Absent holds, and says so.
  // 2. A reading that has gone stale is reported, not trusted silently. The
  //    ambient poll refreshes roughly every 8s; a value minutes old means the
  //    page stopped showing it, which the user should know before the
  //    threshold fires off it.
  // 3. With no party reading ever seen, the old clock-based deadline still
  //    governs, so a session started on a page that never exposes the figure
  //    behaves exactly as it did before rather than running forever.
  const PARTY_STALE_MS = 150000;
  function runStatus() {
    if (configuredRunActions === null) return { mode: 'unlimited', done: false };
    if (partyActionsRemaining !== null) {
      const staleMs = partyActionsAtMs === null ? null : Date.now() - partyActionsAtMs;
      return {
        mode: 'party',
        done: partyActionsRemaining <= configuredRunActions,
        left: partyActionsRemaining - configuredRunActions,
        stale: staleMs !== null && staleMs > PARTY_STALE_MS,
        staleMs,
      };
    }
    const left = runRemaining();
    return { mode: 'clock', done: left !== null && left <= 0, left };
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
    say('done', configuredRunActions === null
      ? 'Session started — running until you stop it.'
      : `Session started — running until ${configuredRunActions} party actions remain.`);
    reportState('running', '');
    refreshFromLiveData();
  }

  // `reason` distinguishes the two ways a session ends, because they are not
  // the same event: reaching the threshold is a RESULT, and the user pressing
  // Stop is them ending it. The strip's levels carry that difference (`done`
  // vs `stopped`) rather than flattening both into "session over".
  function stopTracking(reason) {
    const wasRunning = runState === 'running';
    runState = 'idle';
    runEndsAtMs = null;
    applyKeepAwake();
    if (wasRunning) {
      if (reason) say('done', reason);
      else say('stopped', 'Session stopped by you.');
    }
    reportState('idle', '');
    render();
  }

  function resetSession() {
    runEndsAtMs = configuredRunActions !== null ? Date.now() + configuredRunActions * ACTION_MS : null;
    trackerAlarmFired = false;
    trackerAcknowledged = false;
    nextAlarmAtMs = null;
    say('done', 'Session reset.');
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
  let goldRefusedAtMs = null; // rate-limits the "gold read refused" strip line
  // Both pet slot levels, remembered across pages. The tracker itself only
  // needs `combat`; `utility` exists so the ROI tool can be handed a real
  // starting position instead of a placeholder.
  let slotLevels = { combat: null, utility: null };
  let autoRateRaw = null; // gold/action grabbed from the Party Battle page
  let autoRateAtMs = null;
  let derivedTaxRate = null; // 0..1, from the same card - see scanPartyGoldCard()
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
      const card = scanPartyGoldCard();
      if (card !== null) {
        autoRateRaw = card.kept;
        autoRateAtMs = Date.now();
        if (card.taxRate !== null) derivedTaxRate = card.taxRate;
        partyRateGrabbedThisVisit = true;
        // Named with the VALUE, not just "updated". A confirmation that does
        // not say what it read leaves you no better off than silence — you
        // still have to open the panel to find out whether it got a sane
        // number, which is the trip the line was supposed to save.
        say('done', `Party gold rate updated — ${formatGold(card.kept)}/action`
          + (card.taxRate !== null ? ` (tax ${Math.round(card.taxRate * 100)}%)` : ''));
      } else {
        // The page said it was the Party Battle page and the card was not
        // readable. Silence here is what made this whole class of problem
        // invisible: nothing distinguishes "no card on this page" from "the
        // scan has never worked". Once per visit, not once per poll.
        partyRateGrabbedThisVisit = true;
        say('refused', 'On the Party Battle page but could not read the gold card — rate left unchanged.');
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
      // PER-FIELD, NOT WHOLE-OBJECT. This used to be
      //   lastSync = { atMs: Date.now(), level, current };
      // which wrote BOTH probes' results including their nulls, so one failed
      // read replaced a perfectly good previous value with "unknown" — while
      // the identical pattern twenty lines above (slotLevels) correctly guards
      // with `if (lv !== null)`. Two sibling reads, opposite behaviour.
      //
      // This is a CLAUDE.md rule-3 violation, and absent-treated-as-present is
      // the failure mode this project has been hurt by worst: a null gold read
      // became "you have no gold", which moves the ETA rather than pausing it.
      // Keeping the last known value and SAYING the read refused is the whole
      // of §9.4 — refuse rather than guess, and tell the user which input went
      // missing rather than degrading silently.
      lastSync.atMs = Date.now();
      if (level !== null) lastSync.level = level;
      if (current !== null) lastSync.current = current;
      else if (goldRefusedAtMs === null || Date.now() - goldRefusedAtMs > 60000) {
        // Rate-limited: this poll runs every few seconds and a genuinely
        // absent card would otherwise fill the strip with one line per tick.
        goldRefusedAtMs = Date.now();
        say('refused', 'Could not read gold from the slot card — keeping the last value.');
      }
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
    // THE COMPANION OWNS THE NOISE WHEN IT HAS IT. Both alarms stay armed --
    // choosing one owner up front means getting it wrong exactly when the
    // Companion disappears -- so the browser stays silent only while the
    // Companion is genuinely delegating, and takes over the instant it is not.
    // The badge, the strip line and the ready state all still update either
    // way; this suppresses the SOUND, nothing else.
    if (companionMode() === 'companion') { trackerAlarmFired = true; return; }
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

  // SILENCE vs SNOOZE, because a toggle makes them easier to confuse.
  //   Snooze  - acks THIS ready alert only. Keep-awake untouched, the setting
  //             untouched, and the next time the ETA goes stale it rings again.
  //   Silence - the heavy one. Acks, clears the whole cadence, and pulls down
  //             keep-awake, i.e. "stop making noise at all". Also the module's
  //             own disable path, which is why it must stay callable any time.
  //
  // `silenced` is a USER INTENT, held separately from the cadence fields it
  // clears. That separation is the whole reason un-silencing can work:
  // checkTrackerReady() legitimately resets trackerAcknowledged on its own
  // whenever a fresh reading pushes the ETA back into the future, so acked-ness
  // is not a place to remember a decision -- it would evaporate on the next
  // poll and the button would flip back to "Silence" on its own.
  let silenced = false;

  function silenceAlarm() {
    silenced = true;
    trackerAcknowledged = true;
    trackerAlarmFired = false;
    nextAlarmAtMs = null;
    alarmRepeats = 0;
    // Remembered so un-silencing can put back what silencing took, rather than
    // reading the checkbox -- which the user may have changed meanwhile.
    keepAwakeBeforeSilence = keepAwake;
    if (keepAwakeNodes) { keepAwake = false; applyKeepAwake(); }
    saveProgress();
  }

  // The way back. Deliberately NOT just `silenced = false`: the module has to
  // land in the state it would have been in had you never pressed it.
  //
  //   * Clearing trackerAcknowledged re-arms the chime, and checkTrackerReady()
  //     rings on the very next tick IF the upgrade is ready right now. If it is
  //     not, that same function leaves everything alone, so un-silencing while
  //     nothing is due is silent -- which is the behaviour you want and the
  //     reason this does not ring anything itself.
  //   * alarmRepeats resets so the cadence starts from the first gap again
  //     rather than resuming mid-curve at a nine-minute interval.
  //   * keep-awake comes back only if it was on when you silenced AND a session
  //     is still running; restoring it into an idle session would hold the tab
  //     awake for nothing.
  function unsilenceAlarm() {
    silenced = false;
    trackerAcknowledged = false;
    trackerAlarmFired = false;
    nextAlarmAtMs = null;
    alarmRepeats = 0;
    if (keepAwakeBeforeSilence && runState === 'running') {
      keepAwake = true;
      applyKeepAwake();
    }
    keepAwakeBeforeSilence = false;
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
      // Torn down on `ended` rather than left to the graph. This alarm REPEATS
      // while unacknowledged, so it is six nodes per chime for as long as the
      // user is away — the one place in this module where "the browser will
      // probably collect it" is a bet made thousands of times.
      osc.onended = () => {
        try { osc.disconnect(); gain.disconnect(); } catch (e) { /* already gone */ }
      };
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
  // The party, from the React tree rather than the Party page.
  //
  // Reading it out of the tree instead of scraping the overview matters for a
  // practical reason: the numbers are wanted while the user is on the BATTLE
  // page, and requiring a trip to Overview to import them is the same mistake
  // as requiring a trip to Pets to learn a slot level (S9).
  //
  // SHAPE SOURCE: data/formulas/party.json, party.fifthMemberPenalty.liveCapture
  // - a real 5-member party captured as members keyed by name, each carrying
  // gold / experience / statRate / dropRate as PERCENTAGES. That capture is
  // what makes this a read rather than a guess.
  function partyFromFiber() {
    if (!Core.walkFiber) return null;
    let out = null;
    Core.walkFiber((cand) => {
      const m = cand.members;
      if (!Array.isArray(m) || m.length < 1 || m.length > 5) return false;
      if (!m.every((x) => x && typeof x === 'object' && typeof x.name === 'string')) return false;
      // Each member's own stacked income>gold total is what party pooling sums
      // (party.gold.rewardBoostFormula). Accept it under either the flat key or
      // a nested multipliers object, and only if EVERY member has it - a
      // partial read would silently under-count the pool.
      const goldOf = (x) => {
        if (typeof x.gold === 'number' && isFinite(x.gold)) return x.gold;
        const mm = x.mergedMultipliers || x.multipliers;
        if (mm && typeof mm.gold === 'number' && isFinite(mm.gold)) return mm.gold;
        return null;
      };
      const golds = m.map(goldOf);
      out = {
        count: m.length,
        names: m.map((x) => x.name),
        golds: golds.every((g) => g !== null) ? golds : null,
      };
      return true;
    });
    return out;
  }


  // The pet's own rolled modifiers, recovered from the merged totals.
  //
  // THE SUBTLETY THAT MAKES THIS WORTH READING. merged.monsterGoldFlat is the
  // value the game USES, which per pets.slotBoostFormula is already
  // rawRolledValue x (1 + slotBoost/100). The ROI tool needs the RAW roll,
  // because it re-applies the boost itself while sweeping slot levels — hand it
  // the merged figure and every row would be boosted twice.
  //
  // So divide the boost back out at the slot level we observed. That is exact
  // if the pet is the only contributor, and an over-estimate of the raw roll by
  // whatever share comes from elsewhere if it is not. The user confirmed no
  // other sources on their account; the tool labels the values as derived so
  // the assumption travels with them rather than being buried here.
  function petRollsFromMerged(merged) {
    if (!merged || slotLevels.combat === null) return null;
    // The PET curve (pets.slotUpgrade.boostFormula). Was equipment's until 2026-09-09;
    // above slot level 180 that overstated the boost, which here would have
    // UNDER-stated the raw roll it is being divided back out of.
    const boost = 1 + petSlotBoostPercent(slotLevels.combat);   // fraction, not percent
    if (!(boost > 0)) return null;
    const flat = merged.monsterGoldFlat / boost;
    const pct = merged.monsterGoldPercentage / boost;
    if (!isFinite(flat) || !isFinite(pct)) return null;
    const out = { flat, pct, potion: 0, atSlot: slotLevels.combat };
    // Potion Effect rides the UTILITY slot, so it de-boosts against that one.
    if (typeof merged.potionEffect === 'number' && isFinite(merged.potionEffect)
        && slotLevels.utility !== null) {
      const uBoost = 1 + petSlotBoostPercent(slotLevels.utility);
      if (uBoost > 0) out.potion = merged.potionEffect / uBoost;
    }
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

    const party = partyFromFiber();
    if (party) {
      add('partyMembers', party.count, 'party data');
      // The OTHERS' average, not the party's. The tool models 'me' from my own
      // boosts and multiplies the rest by (members - 1), so handing it a figure
      // that included me would count me twice. Identifying which member is me
      // by name is the only way to drop the right one - and if that fails, the
      // field is omitted rather than sent slightly wrong.
      const me = Core.probeCharacter ? Core.probeCharacter() : null;
      if (party.golds && party.names && me && me.name) {
        const others = [];
        for (let i = 0; i < party.names.length; i++) {
          if (party.names[i] !== me.name) others.push(party.golds[i]);
        }
        if (others.length && others.length === party.count - 1) {
          const avg = others.reduce((a2, b2) => a2 + b2, 0) / others.length;
          add('othersGoldBoost', avg * 100, `avg of ${others.length} party member${others.length === 1 ? '' : 's'}`);
        }
      }
    }

    const rate = effectiveRate();
    add('observedGold', rate, customRateRaw !== null ? 'your custom rate' : 'party battle reward');

    if (derivedTaxRate !== null) add('tax', derivedTaxRate * 100, 'gained vs kept on a battle card');

    const merged = Core.probeMergedMultipliers ? Core.probeMergedMultipliers() : null;
    let pet = null;
    if (merged) {
      // Your stacked income>gold total, as a percentage — the number on the
      // Character > Boosts "Gold Boost" card. Sent as an OVERRIDE for the
      // tool's computed total, never merged into one of its components, which
      // would double-count against the others.
      if (typeof merged.gold === 'number' && isFinite(merged.gold)) {
        add('goldBoost', merged.gold * 100, 'merged multipliers');
      }
      pet = petRollsFromMerged(merged);
    }

    // The per-member breakdown travels alongside the average so the tool can
    // show its working. The average alone invites 'where did that come from'
    // every time it looks surprising.
    let partyDetail = null;
    if (party && party.golds && party.names) {
      const me2 = Core.probeCharacter ? Core.probeCharacter() : null;
      partyDetail = {
        me: me2 && me2.name ? me2.name : null,
        members: party.names.map((n, i) => ({ name: n, gold: party.golds[i] })),
      };
    }

    return {
      ts: Date.now(),
      // DELIBERATELY NOT RENAMED with the module's display label, and no
      // longer matching the @name either (that became "Apoz Core: Pet Slot
      // Alarm" 2026-09-09, with the break accepted on purpose). This is a
      // provenance stamp on captured observations: records already on disk
      // carry this exact string, and changing it makes one producer look like
      // two whenever anything groups by source. It is a historical identifier,
      // not a label — if it ever must change, migrate the existing records in
      // the same commit rather than leaving two names for one tool.
      source: 'Apoz Core: Combat Slot ETA Tracker',
      numberProvenance: Core.numberProvenance ? Core.numberProvenance() : null,
      fields,
      pet,
      party: partyDetail,
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

  // Chrome refuses to start an AudioContext before the user has interacted
  // with the page, and logs a warning every time you try. Restoring an armed
  // session at load did exactly that, twice, on every page load - noise in the
  // console that made a real error harder to spot, which is precisely what
  // happened here.
  //
  // So the keepalive waits for a gesture. Any click or key anywhere counts,
  // and by then the user has almost certainly touched the panel anyway.
  let hadUserGesture = false;
  function noteUserGesture() {
    if (hadUserGesture) return;
    hadUserGesture = true;
    document.removeEventListener('pointerdown', noteUserGesture, true);
    document.removeEventListener('keydown', noteUserGesture, true);
    applyKeepAwake();          // honour a restored preference now that we may
  }
  document.addEventListener('pointerdown', noteUserGesture, true);
  document.addEventListener('keydown', noteUserGesture, true);

  function applyKeepAwake() {
    const want = keepAwake && runState === 'running' && hadUserGesture;
    if (want === !!keepAwakeNodes) return;
    if (!want) {
      try { keepAwakeNodes.osc.stop(); } catch (e) { /* already stopped */ }
      // Both ends of the chain, not just the gain: osc -> gain -> destination.
      // Leaving osc connected to a disconnected gain keeps the pair reachable,
      // and this toggles every time tracking starts or stops.
      try { keepAwakeNodes.osc.disconnect(); } catch (e) { /* ignore */ }
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
        keepAwake, notifyOnReady, alarmCfg, derivedTaxRate,
        customRateValue: ui.goldRateInput.value, customRateRaw,
        autoRateRaw, autoRateAtMs,
        lastSync, slotLevels, trackerEtaMs, trackerAlarmFired, trackerAcknowledged, nextAlarmAtMs,
        partyActionsRemaining, partyActionsAtMs, overnightActions,
        panelOpen,
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

    overnightActions = typeof saved.overnightActions === 'number' && saved.overnightActions >= 0
      ? saved.overnightActions : OVERNIGHT_ACTIONS_DEFAULT;
    partyActionsRemaining = typeof saved.partyActionsRemaining === 'number' ? saved.partyActionsRemaining : null;
    partyActionsAtMs = typeof saved.partyActionsAtMs === 'number' ? saved.partyActionsAtMs : null;

    panelOpen = !!saved.panelOpen;
    // windowGeometry itself is no longer read here (v6) — Core.createWindow
    // now owns geometry persistence under its own key; see
    // migrateWindowGeometryOnce(), called once before the window is created.

    keepAwake = !!saved.keepAwake;
    notifyOnReady = !!saved.notifyOnReady;
    if (typeof saved.derivedTaxRate === 'number' && isFinite(saved.derivedTaxRate)) {
      derivedTaxRate = saved.derivedTaxRate;
    }
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
    setFieldUnlessEditing(ui.alarmGrowth, String(alarmCfg.growth));

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
    //
    // REPORTED BUG: "ready" showed up before a session was even started. Cause:
    // trackerEtaMs is what got PERSISTED from the previous session and can sit
    // in the past the moment the page loads, well before Start is pressed again
    // — nothing gated the ready state on a session actually being armed. There
    // is nothing to be "ready" for if no alarm is armed to fire.
    const staleEta = trackerEtaMs !== null && trackerEtaMs <= Date.now();
    const isReady = runState === 'running' && staleEta;
    Core.setBadge(MODULE_ID, isReady);
    // The nav's state slot. "armed" was rejected as the wording — a session is
    // RUNNING, and when the upgrade is affordable the module needs you, which
    // is what `attention` means everywhere else in the overlay.
    if (runState === 'running') {
      const st = runStatus();
      reportState(isReady ? 'attention' : 'running',
        isReady ? 'upgrade ready'
          : st.mode === 'party' && !st.stale ? `${st.left} to go`
          : st.mode === 'clock' && st.left !== null ? formatMsRemaining(st.left).timeStr
          : 'running');
    } else {
      reportState('idle', '');
    }
    if (!panelOpen) return;

    if (runState === 'running') {
      const st = runStatus();
      // The hero reads the PARTY figure when there is one, because that is now
      // what the session actually ends on — showing a clock-derived count
      // beside a party-derived end condition would be showing the wrong number
      // confidently, which is worse than showing none.
      if (st.mode === 'party') {
        setText(ui.heroActions, String(Math.max(0, st.left)));
        setText(ui.heroLabel, st.stale
          ? 'party actions to go · reading is stale'
          : 'party actions to go');
        setText(ui.heroTime, `${partyActionsRemaining} left, stopping at ${configuredRunActions}`);
      } else {
        const left = runRemaining();
        setText(ui.heroActions, left === null ? '∞' : formatMsRemaining(left).actionsStr);
        setText(ui.heroLabel, left === null ? 'running · no limit set' : 'actions remaining');
        setText(ui.heroTime, left === null ? 'unlimited' : formatMsRemaining(left).timeStr);
      }
    } else {
      setText(ui.heroActions, 'OFF');
      setText(ui.heroLabel, configuredRunActions !== null
        ? `press Start — stops at ${configuredRunActions} party actions`
        : 'press Start (no limit)');
      setText(ui.heroTime, '');
    }
    // The label names the ACTION, not the state: a button reading "Silenced"
    // leaves you guessing whether pressing it silences or un-silences.
    if (ui.silenceBtn) {
      setText(ui.silenceBtn, silenced ? 'Un-silence' : 'Silence');
      setAttr(ui.silenceBtn, 'class', 'apoz-ui-btn' + (silenced ? ' apoz-ui-btn-primary' : ''));
    }
    renderReadiness();
    renderProjection();

    // PROMINENCE TRACKS RELEVANCE. All three used to sit at equal weight in
    // every state, which made a row of three the loudest thing under the
    // countdown. Now the one that does something is normal and the others
    // dim -- dimmed rather than hidden, so the panel keeps its shape and
    // nothing reflows when the state changes.
    const running = runState === 'running';
    setAttr(ui.startBtn, 'class', 'apoz-ui-btn' + (running ? ' qett-dim' : ' apoz-ui-btn-primary'));
    setAttr(ui.stopBtn, 'class', 'apoz-ui-btn' + (running ? '' : ' qett-dim'));
    // Reset re-derives the run's end from the configured figure, so it does
    // something exactly when a session is NOT running and a figure is set --
    // which is also when it is the button you want. It was hard-coded dim in
    // every state, i.e. the relevance rule applied to it backwards.
    const resetUseful = !running && configuredRunActions !== null;
    setAttr(ui.resetBtn, 'class', 'apoz-ui-btn' + (resetUseful ? '' : ' qett-dim'));
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
      if (ui.alarmHeadline.style.color !== 'var(--apoz-success)') ui.alarmHeadline.style.color = 'var(--apoz-success)';
      setText(ui.alarmSub, trackerAcknowledged ? 'Snoozed until the next upgrade.' : 'Alarm repeating every 30s.');
    } else if (staleEta && runState !== 'running') {
      // An ETA left over from a previous session, already in the past, but
      // nothing is armed to alarm on it — "ready" would be a lie. Prompt to
      // (re-)arm instead of announcing an alarm that will not fire.
      setText(ui.alarmHeadline, 'Estimate expired');
      if (ui.alarmHeadline.style.color !== '') ui.alarmHeadline.style.color = '';
      setText(ui.alarmSub, 'Press Start to arm the alarm for your next upgrade.');
    } else {
      setText(ui.alarmHeadline, 'Estimating…');
      if (ui.alarmHeadline.style.color !== '') ui.alarmHeadline.style.color = '';
      const eta = formatMsRemaining(Math.max(0, trackerEtaMs - Date.now()));
      setText(ui.alarmSub, `~${eta.actionsStr} actions (${eta.timeStr}) to go`);
    }

    setText(ui.detailLevel, lastSync.level !== null ? `${lastSync.level} → ${lastSync.level + 1}` : '—');
    const requiredGold = lastSync.level !== null ? nextUpgradeCost(lastSync.level) : null;
    // DECLARED BEFORE USE, and that is the entire fix for a bug that made the
    // whole module fail to start: this const used to sit BELOW the two lines
    // that read it, so `const` put it in the temporal dead zone and render()
    // threw ReferenceError on its first call. claim() caught it, marked the
    // module failed, and the menu button never appeared - reported twice as
    // "the script doesn't load".
    const gold = projectedGold();
    setText(ui.detailGold, (gold || requiredGold !== null)
      ? `${gold ? formatGold(gold.value) : '—'} / ${formatGold(requiredGold)}` : '—');

    setText(ui.detailGoldSource, gold
      ? `(${gold.from}${gold.projected ? ', projected' : ''}, read ${formatAgo(gold.atMs)})`
      : '(not read yet)');

    setAttr(ui.notifyCheck, 'checked', notifyOnReady);
    setAttr(ui.keepAwakeCheck, 'checked', keepAwake);
    ui.notifyRow = ui.notifyRow || ui.content.querySelector('#qett-notify-row');
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

  // ---- READINESS: the one failure that looks like success ----
  //
  // If no gold rate has been measured, this module can still show a countdown
  // -- it just has nothing real to base it on. That is worse than showing
  // nothing, because a fictional ETA arms a fictional alarm and you plan
  // around it. The rule everywhere else in this project is "refuse rather than
  // guess"; the UI half of that is saying which input is missing, out loud,
  // where you are already looking.
  //
  // Ordered by how badly each breaks the answer, and only the worst is shown:
  // a stack of warnings is a thing people stop reading.
  function readinessState() {
    if (autoRateRaw === null && customRateRaw === null) {
      return { level: 'warn', glyph: '!',
        text: 'No gold rate measured yet. Open the Party Battle page once and this will read it '
          + 'by itself - until then there is no ETA and the alarm cannot arm.' };
    }
    if (lastSync.level === null) {
      return { level: 'warn', glyph: '!',
        text: 'Slot level unknown. Open your Pets page once so it can see which upgrade you are saving for.' };
    }
    if (customRateRaw !== null) {
      return { level: 'warn', glyph: '!',
        text: 'Using a manual rate from Settings, not a measured one. The ETA is hypothetical - '
          + 'press Auto there to go back to reading it.' };
    }
    if (goldSnapshot() === null) {
      return { level: 'warn', glyph: '!',
        text: 'Cannot read your gold right now. Keeping the last value; the ETA is as stale as the Synced line says.' };
    }
    return { level: 'ok', glyph: '\u2713',
      text: 'Reading your gold and rate automatically. No server or companion program involved.' };
  }

  function renderReadiness() {
    if (!ui.readiness) return;
    const r = readinessState();
    // The OK state is deliberately NOT hidden. "Nothing is wrong" is the thing
    // you want confirmed before walking away from a browser for two hours, and
    // a banner that only ever appears when broken teaches you to ignore the
    // space it occupies.
    ui.readiness.hidden = false;
    setAttr(ui.readiness, 'class', 'qett-notice qett-notice-' + r.level);
    ui.readiness.innerHTML = '';
    const g = document.createElement('span');
    g.className = 'qett-notice-g';
    g.textContent = r.glyph;
    const t = document.createElement('span');
    t.textContent = r.text;
    ui.readiness.appendChild(g);
    ui.readiness.appendChild(t);
  }

  // ---- projected gold by the end of the session ----
  //
  // TWO ESTIMATES, because they answer different questions and the gap between
  // them IS the answer to a third: is it worth taking slot upgrades during the
  // run, or banking?
  //
  //   flat      = every remaining action at TODAY's rate. No upgrades, no
  //               compounding. The floor.
  //   upgrading = take each combat-slot upgrade the moment it is affordable.
  //               Every upgrade costs gold now and raises the rate for every
  //               action after it, so this is a simulation rather than a
  //               formula -- the crossover depends on how many actions remain.
  //
  // THE RATE MODEL, and its one assumption stated plainly. A slot upgrade
  // raises the pet's gold modifier, and the module already de-boosts
  // merged.monsterGoldPercentage by the slot's own boost curve to recover the
  // raw roll (petRollsFromMerged). So the rate at level L is the measured rate
  // scaled by (1 + raw*(1+boost(L))) / (1 + merged), which is exactly 1 at the
  // current level. The assumption inherited from petRollsFromMerged is that
  // merged.monsterGoldPercentage is pet-driven; if other sources contribute,
  // this OVERSTATES how much an upgrade helps. Flagged in the UI note rather
  // than hidden, because it is the number's weakest joint.
  //
  // Refuses rather than approximates: no rate, no slot level, no merged
  // multipliers, or no known action count all return null, and the row says
  // which one is missing (CLAUDE.md rule 3).
  const PROJECTION_ACTION_CAP = 200000;

  function remainingActionsForProjection() {
    if (configuredRunActions === null) return null;
    if (partyActionsRemaining !== null) {
      return Math.max(0, partyActionsRemaining - configuredRunActions);
    }
    const left = runRemaining();
    return left === null ? null : Math.max(0, Math.round(left / ACTION_MS));
  }

  function simulateUpgradePath(actions, startLevel, startGold, rate0, rawPct, mergedPct) {
    const rateAt = (L) => rate0 * (1 + rawPct * (1 + petSlotBoostPercent(L))) / (1 + mergedPct);
    let level = startLevel, gold = startGold, earned = 0, spent = 0, upgrades = 0;
    const n = Math.min(actions, PROJECTION_ACTION_CAP);
    for (let a = 0; a < n; a++) {
      const r = rateAt(level);
      gold += r; earned += r;
      // Buy as soon as affordable -- "within about ten actions of each ring",
      // which at this resolution is immediately. The inner guard exists
      // because a large enough balance could clear several levels at once and
      // an unbounded while inside a loop is how a projection hangs a tab.
      let guard = 0;
      while (guard++ < 64) {
        const cost = petSlotUpgradeCost(level, level + 1).value;
        if (!(gold >= cost)) break;
        gold -= cost; spent += cost; level++; upgrades++;
      }
    }
    return { earned, spent, endGold: gold, endLevel: level, upgrades, capped: actions > n };
  }

  // MEMOISED, because render() runs once a second and this is a simulation.
  // The loop is O(actions) -- typically a few thousand, up to the cap -- with a
  // cost computation per iteration, and none of its inputs change between most
  // ticks. Re-running it every second was a main-thread cost for no new answer.
  //
  // Gold is quantised into the key rather than used raw: it moves continuously
  // while a session runs, so keying on the exact figure would miss every cache
  // hit and the memo would be decoration. A thousandth of the current value is
  // far below what changes any displayed number.
  let projCache = null;
  function projectionKey(level, gold, rate, actions) {
    const goldBucket = gold === 0 ? 0 : Math.round(gold / Math.max(1, Math.abs(gold) / 1000));
    return [level, goldBucket, rate, actions, overnightActions].join('|');
  }

  function projectGold() {
    const rate = effectiveRate();
    if (!rate) return { blocked: 'no gold rate measured yet' };
    const base = remainingActionsForProjection();
    if (base === null) return { blocked: 'set a stop-at figure to project from' };
    // The overnight allowance tops up a run that is STILL GOING. Adding it to a
    // session already past its stop point projected 860 actions of earnings for
    // a run with nothing left in it.
    const actions = base > 0 ? base + Math.max(0, overnightActions) : 0;
    const flat = actions * rate;

    const gold = goldSnapshot();
    const merged = mergedMultipliers();
    if (lastSync.level === null) return { flat, actions, blocked: 'slot level unknown' };
    if (!gold) return { flat, actions, blocked: 'gold not readable' };
    if (!merged || typeof merged.monsterGoldPercentage !== 'number') {
      return { flat, actions, blocked: 'pet gold modifiers not readable on this page' };
    }
    const mergedPct = merged.monsterGoldPercentage;
    const boost0 = 1 + petSlotBoostPercent(lastSync.level);
    if (!(boost0 > 0)) return { flat, actions, blocked: 'slot boost unavailable' };
    const rawPct = mergedPct / boost0;
    const key = projectionKey(lastSync.level, gold.value, rate, actions);
    if (projCache && projCache.key === key) return { flat, actions, sim: projCache.sim };
    const sim = simulateUpgradePath(actions, lastSync.level, gold.value, rate, rawPct, mergedPct);
    projCache = { key, sim };
    return { flat, actions, sim };
  }

  function renderProjection() {
    if (!ui.projUpgrade) return;
    const p = projectGold();
    setText(ui.projFlat, p.flat == null ? '\u2014' : formatGold(p.flat));
    if (p.sim) {
      setText(ui.projUpgrade, formatGold(p.sim.earned));
      setText(ui.projUpgradeNote, p.sim.upgrades === 0
        ? 'no upgrade affordable in time'
        : `${p.sim.upgrades} upgrade${p.sim.upgrades === 1 ? '' : 's'} · `
          + `${formatGold(p.sim.spent)} spent · slot ${p.sim.endLevel} · `
          + `${formatGold(p.sim.endGold)} left`);
    } else {
      setText(ui.projUpgrade, '\u2014');
      setText(ui.projUpgradeNote, p.blocked ? 'needs ' + p.blocked : '');
    }
    // The caveat moved to the hover. It still has to be SAID -- the overnight
    // figure is an assumption and a number built on one should admit it -- but
    // it does not have to occupy two lines under every estimate to do so.
    setText(ui.projNote, p.actions == null ? ''
      : `${p.actions.toLocaleString()} actions`
        + (overnightActions > 0 && p.actions > 0 ? ` \u00b7 incl. +${overnightActions} overnight` : ''));
    setAttr(ui.projNote, 'title', overnightActions > 0
      ? `Includes ${overnightActions} actions for the overnight daily reset. That is an assumption, not a measurement \u2014 change it in this module's Settings tab.`
      : '');
  }

  function masterTick() {
    syncCompanionAlarm();
    if (runState === 'running') {
      const st = runStatus();
      if (st.done) {
        stopTracking(st.mode === 'party'
          ? `Party actions reached ${configuredRunActions} — session ended.`
          : 'Session length reached — ended.');
        return;
      }
      // Rate-limited to once per stale window, not once per tick: this runs
      // every second and the strip is a record, not a siren.
      if (st.stale && (partyStaleSaidAtMs === null || Date.now() - partyStaleSaidAtMs > PARTY_STALE_MS)) {
        partyStaleSaidAtMs = Date.now();
        say('refused', `Party actions last read ${formatAgo(partyActionsAtMs)} — still running, not ending on a stale figure.`);
      }
      checkTrackerReady();
    }
    render();
  }

// ---- overlay UI ----

  const ui = {};
  let panelOpen = false;
  let windowHandle = null; // Core.createWindow(...) — owns geometry, drag, resize, chrome
  let activity = null;     // Core.ui.activity(...) — the module's own record of what it did
  let cadenceNode = null;  // the alarm-cadence rows, adopted by the Settings pane

  // ---- the Companion delegation (Core v12) ----
  //
  // The browser alarm is not replaced, it is SHADOWED. Both stay armed: the
  // Companion because it can make a noise a throttled tab cannot, and the
  // browser because the Companion may not be running, may be stopped
  // mid-session, or may be on a machine that goes to sleep.
  //
  // Double-ringing is prevented at the point of noise rather than by choosing
  // one owner up front -- see checkTrackerReady. Choosing an owner would mean
  // getting it wrong exactly when the Companion disappears, which is the case
  // the delegation exists for.
  let companionAlarm = null;
  let lastPushedEtaMs = null;

  function companionMode() {
    return companionAlarm ? companionAlarm.mode : 'browser';
  }

  // Pushed whenever the deadline MOVES, not on a schedule: the Companion's
  // reminder is idempotent by id, so re-registering replaces rather than
  // stacks, and a re-push costs one request against a local socket.
  function syncCompanionAlarm() {
    if (!companionAlarm) return;
    const eta = (runState === 'running' && trackerEtaMs !== null) ? trackerEtaMs : null;
    if (eta === lastPushedEtaMs) return;
    lastPushedEtaMs = eta;
    if (eta === null) {
      companionAlarm.push((api) => api.request('/reminders/' + encodeURIComponent(REMINDER_ID),
        { method: 'DELETE' }));
      return;
    }
    companionAlarm.push(async (api) => {
      // A DECISION, already made. The Companion is told when and what, never
      // the gold rate and the cost -- duplicating that model across the process
      // boundary is how the two halves start disagreeing about the answer.
      const res = await api.request('/reminders', {
        method: 'POST',
        body: {
          id: REMINDER_ID,
          atMs: eta,
          title: 'Pet slot upgrade ready',
          body: lastSync.level !== null
            ? `Slot ${lastSync.level} \u2192 ${lastSync.level + 1} is affordable.`
            : 'Your combat pet slot upgrade is affordable.',
          source: 'Apoz Core: Pet Slot Alarm',
        },
      });
      if (!res.ok) throw new Error('the Companion refused the reminder (HTTP ' + res.status + ')');
      say('done', 'Alarm handed to the Companion \u2014 it will ring even if this tab is throttled.');
    });
  }
  const REMINDER_ID = 'eta-tracker:pet-slot';
  let rateNode = null;     // the manual rate override, likewise

  // say(level, text) — one call site for every "tell the user what happened".
  // Safe before the panel is built and safe against an older Core: a module
  // must never fail because its feedback surface is missing.
  function say(level, text) {
    if (activity && typeof activity[level] === 'function') activity[level](text);
  }

  // The nav's state slot. Reported on every meaningful transition so the
  // header can answer "is this still counting down?" without opening the
  // panel. Guarded for the same reason as everything else here.
  function reportState(state, detail) {
    if (typeof Core.setState === 'function') Core.setState(MODULE_ID, state, detail || '');
  }

  // Migrated onto Core's shared window framework (v6): the chrome (panel
  // border/shadow, header, drag, resize, close button) that used to be
  // hand-rolled here (#qett-panel/#qett-header/#qett-body) now comes from
  // Core.createWindow — every rule below is CONTENT styling, not chrome.
  function buildPanelContent() {
    const style = document.createElement('style');
    // MODULE-SPECIFIC RULES ONLY. Everything that was a re-typed copy of a
    // Core primitive is gone: .qett-group WAS byte-for-byte Core's
    // .apoz-ui-group, the tooltip ::after was a hand-copy of Core's global
    // [data-tooltip], and .qett-body-btn/.qett-small-btn duplicated
    // .apoz-ui-btn-primary/.apoz-ui-btn. Those were not variations — they were
    // the shared thing, typed twice, and then drifting apart. That drift is
    // the whole of the reported "these two modules look like different
    // products".
    //
    // EVERY THEME READ IS NAMESPACED. This block used to read the GAME's raw
    // var(--border) / var(--input) / var(--primary), which meant choosing
    // "Apoz Turquoise" restyled every surface in the overlay EXCEPT this
    // module. fighter-allocator already carried a comment about this exact bug
    // class; this module never got the fix. The raw variable stays as the
    // fallback so an older Core underneath still renders something sane.
    style.textContent = `
      #qett-header-party { font-size: var(--apoz-fs-control); opacity: var(--apoz-em-normal);
        font-weight: 500; cursor: default; text-align: right; margin-bottom: -2px;
        font-variant-numeric: tabular-nums; }

      .qett-buttons { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--apoz-s4);
        margin-top: var(--apoz-s4); }
      .qett-buttons.qett-two { grid-template-columns: 1fr auto; align-items: center; }

      #qett-alarm-headline { font-weight: bold; font-size: var(--apoz-fs-title); }
      #qett-alarm-sub { opacity: var(--apoz-em-normal); }
      .qett-hint-inline { opacity: var(--apoz-em-muted); font-size: var(--apoz-fs-caption); }
      .qett-check { display: flex; align-items: center; gap: 7px; font-size: var(--apoz-fs-control);
        cursor: pointer; user-select: none; }
      .qett-check input[type="checkbox"] { width: 13px; height: 13px;
        accent-color: var(--apoz-primary, var(--primary)); cursor: pointer; margin: 0; }
      .qett-check.qett-check-off { opacity: var(--apoz-em-muted); }
      .apoz-ui-rows input[type="range"] { width: 100%; accent-color: var(--apoz-primary, var(--primary));
        margin: 0; padding: 0; border: none; background: none; }

      .qett-setter { display: flex; align-items: center; gap: var(--apoz-s3);
        font-size: var(--apoz-fs-control); opacity: var(--apoz-em-normal); }
      .qett-setter input[type="number"], .qett-setter input[type="text"] {
        background: var(--apoz-input, var(--input)); color: inherit;
        border: 1px solid var(--apoz-border, var(--border));
        border-radius: var(--apoz-r-sm); padding: 3px 5px; width: 70px; box-sizing: border-box;
        font: inherit; font-variant-numeric: tabular-nums; }
      #qett-gold-rate { width: 130px; }
      .apoz-ui-rows > .k[data-tooltip], .apoz-ui-rows > .v[data-tooltip] { cursor: help; }
      .qett-info-icon { display: inline-flex; align-items: center; justify-content: center;
        opacity: var(--apoz-em-muted); cursor: help; margin-left: var(--apoz-s2); position: relative; }
      .qett-info-icon:hover { opacity: 1; }
      .qett-info-icon svg { width: 13px; height: 13px; display: block; }

      /* The cadence lives in this module's own Settings tab now (Core v11's
         sidebar). It is set once and then never touched, so it does not earn
         permanent main-window space -- while volume IS adjusted out of the
         box and keeps its row. The rows are BUILT here and re-parented into
         the pane, so every existing listener and id survives by reference
         rather than being rebuilt against a second copy.
         The growth factor is exposed for the first time: it always drove the
         curve between the two gap fields, and with no control for it you
         could set both ends of a shape you could not see. */
      .qett-adv-body { display: flex; flex-direction: column; gap: var(--apoz-s3); }

      /* The commit button sits WITH the input it commits. It used to be alone
         on a right-aligned row below, connected to nothing. */
      /* SPECIFICITY, not luck. Core's .apoz-ui-rows input sets width:100% and
         this sets 5.5em -- both (0,1,1), so the winner was decided by which
         stylesheet was appended last, which depends on which module built its
         panel first. When Core won, the input filled the cell and pushed the
         Set button over the unit label beside it. Two classes beats one, in
         every load order. */
      .apoz-ui-rows .qett-setter-inline { display: flex; align-items: center; gap: var(--apoz-s2); }
      .apoz-ui-rows .qett-setter-inline input { width: 4.5em; flex: none; }
      .apoz-ui-rows .qett-setter-inline button { flex: none; }


      /* Irrelevant right now, not gone. Dimming keeps the panel's shape stable
         so nothing jumps as the state changes -- hiding them would reflow the
         window every time you pressed Start. */
      .qett-dim { opacity: var(--apoz-em-faint); }

      /* THE READINESS LINE. An ETA computed without a measured gold rate is
         this module's one failure that still looks like success: a number
         appears, it counts down, and it is fiction. So the absence of the
         reading gets its own always-visible line rather than being inferred
         from a dash in a detail row. Warn-coloured when something real is
         missing, quiet when everything is being read. */
      .qett-notice { font-size: var(--apoz-fs-control); line-height: 1.45;
        border: 1px solid transparent; border-radius: var(--apoz-r-sm);
        padding: var(--apoz-s3) var(--apoz-s4); display: flex; gap: var(--apoz-s3);
        align-items: flex-start; }
      .qett-notice-ok { color: var(--apoz-success); opacity: var(--apoz-em-normal);
        border-color: color-mix(in srgb, var(--apoz-success) 35%, var(--apoz-border, var(--border))); }
      .qett-notice-warn { color: var(--apoz-warn);
        border-color: color-mix(in srgb, var(--apoz-warn) 45%, var(--apoz-border, var(--border))); }
      .qett-notice-g { flex: none; font-weight: 700; }
    `;
    document.head.appendChild(style);

    // Just the CONTENT now — no outer panel/header markup. Core.createWindow
    // supplies the title bar (with its own close button) around whatever
    // element handle.setContent() is given.
    const content = document.createElement('div');
    ui.content = content; // referenced later, in render(), outside this closure
    // ONE GRID TEMPLATE FOR EVERY LABEL/VALUE LIST (DESIGN.md §4).
    // Progress and Alarm both use .apoz-ui-rows, so their labels, values and
    // trailing units land on the same three x-positions — groups aligning
    // with each OTHER, not merely within themselves. The previous markup had
    // two independent grids, each sizing its own `auto` label column, and a
    // value right-aligned in one where its neighbour was left-aligned; both
    // were internally correct and they did not agree.
    //
    // The trailing column is a fixed ch width, which is what stops the volume
    // readout resizing the slider beside it as the percentage gains a digit —
    // the actual mechanism behind the reported alarm drift. Nothing was
    // misaligned; the track was breathing.
    // ---- LAYOUT: status at the top, data in the middle, controls by subject ----
    //
    // The previous arrangement mixed all three. A group called "Progress" held
    // the alarm's own headline AND the detail readouts AND the Snooze/Test
    // buttons, so the thing you look at (is it ringing?), the thing you read
    // (what does it know?) and the thing you press (make it stop) were one
    // block. That is most of what "the layout is a bit chaotic" was pointing
    // at. Now the alarm's state sits with the countdown it belongs to, the
    // detail rows are only data, and every alarm control lives under Alarm.
    //
    // CUSTOM ETA IS GONE FROM THE MAIN WINDOW. The whole point of this module
    // is that it reads the rate itself; a hand-typed rate produces a
    // hypothetical ETA, which is a debugging tool rather than a daily control,
    // and giving it a permanent panel implied the automatic path was optional.
    // It moved to the Settings tab. What replaced it is the opposite thing: a
    // readiness line that says out loud when the automatic reading is MISSING,
    // because an ETA computed without a real gold rate is the one failure this
    // module can have that still looks like it is working.
    content.innerHTML = `
        <span id="qett-header-party" class="qett-header-party"></span>
        <div id="qett-hero" class="apoz-ui-answer">
          <div id="qett-hero-actions" class="apoz-ui-answer-value">OFF</div>
          <div id="qett-hero-label" class="apoz-ui-answer-sub">press Start to begin</div>
          <div id="qett-hero-time" class="apoz-ui-answer-sub apoz-num"></div>
          <div id="qett-alarm-headline">Idle</div>
          <div id="qett-alarm-sub" class="qett-hint-inline">-</div>
        </div>
        <div class="qett-buttons">
          <button id="qett-start" class="apoz-ui-btn apoz-ui-btn-primary" type="button">Start</button>
          <button id="qett-stop" class="apoz-ui-btn" type="button">Stop</button>
          <button id="qett-reset" class="apoz-ui-btn" type="button">Reset</button>
        </div>

        <div id="qett-readiness" class="qett-notice" hidden></div>

        <div class="apoz-ui-group">
          <div class="apoz-ui-group-label">Session</div>
          <div class="apoz-ui-rows">
            <span class="k" data-tooltip="Ends the session once the party has this many actions left. Falls back to counting your own actions if the party figure cannot be read." data-tooltip-wide>Stop at</span>
            <span class="qett-setter-inline">
              <input id="qett-duration" type="number" min="0" placeholder="&#8734;" />
              <button id="qett-duration-set" class="apoz-ui-btn" type="button">Set</button>
            </span>
            <span class="t">left</span>
          </div>
        </div>

        <div class="apoz-ui-group">
          <div class="apoz-ui-group-label">Read</div>
          <div class="apoz-ui-rows">
            <span class="k">Slot</span>
            <span class="v" id="qett-detail-level" data-tooltip="Your combat pet slot now, and the level it is saving toward.">-</span><span class="t"></span>
            <span class="k">Gold</span>
            <span class="v" data-tooltip="Gold you hold, against what the next slot upgrade costs." data-tooltip-wide><span id="qett-detail-gold">-</span>
              <span id="qett-detail-gold-source" class="qett-hint-inline"></span></span><span class="t"></span>
            <span class="k">Rate</span>
            <span class="v" data-tooltip="Gold per action, measured from your Party Battle page." data-tooltip-wide><span id="qett-detail-rate">-</span>
              <span id="qett-detail-rate-source" class="qett-hint-inline"></span></span><span class="t"></span>
            <span class="k">Pets page</span>
            <span class="v" id="qett-detail-synced" data-tooltip="When your Pets page was last read. The rate above carries its own age." data-tooltip-wide>never</span><span class="t"></span>
          </div>
        </div>

        <div class="apoz-ui-group">
          <div class="apoz-ui-group-label">Party gold estimate</div>
          <div class="apoz-ui-rows">
            <span class="k">At pace</span>
            <span class="v" id="qett-proj-flat" data-tooltip="Remaining actions at your current rate. No upgrades, no compounding." data-tooltip-wide>-</span><span class="t"></span>
            <span class="k">Reinvesting</span>
            <span class="v" id="qett-proj-upgrade" data-tooltip="If you take each slot upgrade as soon as you can afford it. Each one costs gold now and raises the rate for every action after." data-tooltip-wide>-</span><span class="t"></span>
            <span class="wide qett-hint-inline" id="qett-proj-upgrade-note"></span>
            <span class="wide qett-hint-inline" id="qett-proj-note"></span>
          </div>
        </div>

        <div class="apoz-ui-group">
          <div class="apoz-ui-group-label">Alarm<button type="button" class="apoz-ui-group-link"
            id="qett-advanced-link" data-tooltip="Gap between chimes, and when it gives up.">Cadence &#8599;</button></div>
          <div class="apoz-ui-rows">
            <label class="k" for="qett-alarm-volume">Volume</label>
            <input id="qett-alarm-volume" type="range" min="0" max="100" step="5" />
            <span id="qett-alarm-volume-out" class="t"></span>
          </div>
          <div class="qett-buttons">
            <button id="qett-test-alarm" class="apoz-ui-btn" type="button">Test</button>
            <button id="qett-snooze" class="apoz-ui-btn" type="button">Snooze</button>
            <button id="qett-alarm-silence" class="apoz-ui-btn" type="button">Silence</button>
          </div>
        </div>

        <div class="apoz-ui-group">
          <div class="apoz-ui-group-label"
            data-tooltip="Browsers mute or throttle audio in tabs you are not looking at. The countdown stays correct either way; these keep the SOUND on time."
            data-tooltip-dev="Runs entirely in the browser -- no Companion needed. The countdown reads the clock rather than counting ticks, so timer throttling cannot drift it; only playback is at risk."
            data-tooltip-wide>Background</div>
          <label class="qett-check" id="qett-notify-row">
            <input id="qett-notify" type="checkbox" /><span>Desktop notification when ready</span></label>
          <label class="qett-check" id="qett-keepawake-row">
            <input id="qett-keepawake" type="checkbox" /><span>Keep tab awake while running</span></label>
          <div id="qett-companion-row"></div>
          <label class="qett-check" id="qett-companion-toggle-row">
            <input id="qett-companion-toggle" type="checkbox" /><span>Ring through the Companion when it is running</span></label>
          <div id="qett-bg-note" class="qett-hint-inline"></div>
        </div>

        <div class="qett-adv-body" hidden>
          <div class="apoz-ui-rows">
            <label class="k" for="qett-alarm-first">First gap</label>
            <input id="qett-alarm-first" type="number" min="2" max="600" step="1" />
            <span class="t">s</span>
            <label class="k" for="qett-alarm-growth">Growth</label>
            <input id="qett-alarm-growth" type="number" min="1" max="4" step="0.05" />
            <span class="t">&#215;</span>
            <label class="k" for="qett-alarm-max">Ceiling</label>
            <input id="qett-alarm-max" type="number" min="5" max="3600" step="5" />
            <span class="t">s</span>
            <label class="k" for="qett-alarm-repeats">Stop after</label>
            <input id="qett-alarm-repeats" type="number" min="1" max="999" step="1" />
            <span class="t">&#215;</span>
          </div>
          <div id="qett-alarm-preview" class="qett-hint-inline"></div>
          <div class="qett-buttons qett-two">
            <span></span>
            <button id="qett-alarm-defaults" class="apoz-ui-btn" type="button">Defaults</button>
          </div>
        </div>
        <div class="qett-adv-rate" hidden>
          <div class="qett-hint-inline" style="margin-bottom:var(--apoz-s3)">
            Overrides the rate this module reads for itself, to work out a hypothetical ETA.
            Leave it empty unless you are testing something: a typed rate is not measured, so
            the alarm it produces is a guess.
          </div>
          <div class="qett-setter">
            <input id="qett-gold-rate" type="text" placeholder="e.g. 12,34 (B/action)" />
            <button id="qett-gold-rate-set" class="apoz-ui-btn" type="button">Set</button>
            <button id="qett-gold-rate-auto" class="apoz-ui-btn" type="button">Auto</button>
          </div>
        </div>
    `;

    ui.heroActions = content.querySelector('#qett-hero-actions');
    ui.heroLabel = content.querySelector('#qett-hero-label');
    ui.heroTime = content.querySelector('#qett-hero-time');
    ui.startBtn = content.querySelector('#qett-start');
    ui.stopBtn = content.querySelector('#qett-stop');
    ui.resetBtn = content.querySelector('#qett-reset');
    ui.durationInput = content.querySelector('#qett-duration');
    ui.durationSetBtn = content.querySelector('#qett-duration-set');

    ui.alarmHeadline = content.querySelector('#qett-alarm-headline');
    ui.alarmSub = content.querySelector('#qett-alarm-sub');
    ui.detailLevel = content.querySelector('#qett-detail-level');
    ui.detailGold = content.querySelector('#qett-detail-gold');
    ui.detailRate = content.querySelector('#qett-detail-rate');
    ui.detailRateSource = content.querySelector('#qett-detail-rate-source');
    ui.detailSynced = content.querySelector('#qett-detail-synced');
    ui.headerParty = content.querySelector('#qett-header-party');
    ui.snoozeBtn = content.querySelector('#qett-snooze');
    ui.testAlarmBtn = content.querySelector('#qett-test-alarm');

    ui.detailGoldSource = content.querySelector('#qett-detail-gold-source');
    ui.notifyCheck = content.querySelector('#qett-notify');
    ui.keepAwakeCheck = content.querySelector('#qett-keepawake');
    ui.bgNote = content.querySelector('#qett-bg-note');

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

    ui.alarmVolume = content.querySelector('#qett-alarm-volume');
    ui.readiness = content.querySelector('#qett-readiness');
    ui.silenceBtn = content.querySelector('#qett-alarm-silence');
    ui.projUpgrade = content.querySelector('#qett-proj-upgrade');
    ui.projUpgradeNote = content.querySelector('#qett-proj-upgrade-note');
    ui.projFlat = content.querySelector('#qett-proj-flat');
    ui.projNote = content.querySelector('#qett-proj-note');
    ui.companionToggle = content.querySelector('#qett-companion-toggle');
    if (ui.companionToggle) {
      ui.companionToggle.checked = companionAlarm ? companionAlarm.enabled : false;
      ui.companionToggle.disabled = !companionAlarm;
      ui.companionToggle.addEventListener('change', () => {
        if (!companionAlarm) return;
        companionAlarm.setEnabled(ui.companionToggle.checked);
        lastPushedEtaMs = null;
        syncCompanionAlarm();
        say(ui.companionToggle.checked ? 'done' : 'stopped',
          ui.companionToggle.checked
            ? 'Alarm will use the Companion when it is running.'
            : 'Alarm will stay in this browser.');
      });
    }
    ui.alarmVolumeOut = content.querySelector('#qett-alarm-volume-out');
    ui.alarmFirst = content.querySelector('#qett-alarm-first');
    ui.alarmMax = content.querySelector('#qett-alarm-max');
    ui.alarmRepeats = content.querySelector('#qett-alarm-repeats');
    ui.alarmGrowth = content.querySelector('#qett-alarm-growth');
    ui.alarmPreview = content.querySelector('#qett-alarm-preview');

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
      // Exposed for the first time. It always drove the curve between the two
      // gap fields (nextAlarmGap multiplies by it per repeat); with no control
      // for it, "first gap" and "ceiling" were two ends of a shape you could
      // not see. 1 means a flat cadence, which is a legitimate choice.
      alarmCfg.growth = num(ui.alarmGrowth, 1, 4, ALARM_DEFAULTS.growth);
      saveProgress();
      renderAlarmSettings();
    }
    for (const el of [ui.alarmVolume, ui.alarmFirst, ui.alarmMax, ui.alarmRepeats, ui.alarmGrowth]) {
      el.addEventListener('change', readAlarmSettings);
    }
    ui.alarmVolume.addEventListener('input', () => {
      ui.alarmVolumeOut.textContent = `${ui.alarmVolume.value}%`;
    });
    content.querySelector('#qett-alarm-silence').addEventListener('click', () => {
      if (silenced) {
        unsilenceAlarm();
        Core.toast('Alarm back on.', { type: 'success', duration: 3000 });
        say('done', 'Alarm un-silenced' + (runState === 'running' ? ' — it will ring when ready.' : '.'));
      } else {
        silenceAlarm();
        Core.toast('Alarm silenced.', { type: 'success', duration: 3000 });
        say('stopped', 'Alarm silenced — it will not ring until you turn it back on.');
      }
      render();
    });
    content.querySelector('#qett-alarm-defaults').addEventListener('click', () => {
      alarmCfg = Object.assign({}, ALARM_DEFAULTS);
      renderAlarmSettings();
      saveProgress();
      say('done', 'Alarm cadence reset to defaults.');
    });

    ui.goldRateInput = content.querySelector('#qett-gold-rate');
    ui.goldRateSetBtn = content.querySelector('#qett-gold-rate-set');
    ui.goldRateAutoBtn = content.querySelector('#qett-gold-rate-auto');

    ui.startBtn.addEventListener('click', startTracking);
    // Wrapped, not passed directly: stopTracking's first argument is the
    // end REASON, and handing it a click Event would print one into the strip.
    ui.stopBtn.addEventListener('click', () => stopTracking());
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

    // Chrome (drag, resize, close button, geometry persistence) is Core's job
    // now — createWindow replaces the resize-toggle button and the hand-rolled
    // makeDraggable/saveWindowGeometry pair that used to live here.
    // The cadence block is built with the panel (so its ids resolve and every
    // listener above is already attached) and then handed to the Settings
    // pane, which ADOPTS the same node. Re-parenting rather than rebuilding is
    // what keeps one set of inputs: two copies would drift the moment one was
    // edited while the other was on screen.
    cadenceNode = content.querySelector('.qett-adv-body');
    rateNode = content.querySelector('.qett-adv-rate');
    const advLink = content.querySelector('#qett-advanced-link');
    if (advLink) {
      advLink.addEventListener('click', () => {
        if (typeof Core.openSettings === 'function') Core.openSettings(MODULE_ID);
        else say('refused', 'This Core is too old to open module settings — update Core.');
      });
    }

    // Guarded like every optional Core API: an older Core beneath a newer
    // module is a state real users reach, and without it the module simply has
    // no delegation and keeps its browser alarm.
    if (Core.companion && typeof Core.companion.feature === 'function') {
      companionAlarm = Core.companion.feature({
        id: 'eta-tracker.alarm',
        capability: 'remind',
        label: 'The alarm',
        // TRUE, and it is the important half: the browser alarm is a real
        // fallback, not a stub, so losing the Companion costs reliability
        // rather than the feature.
        fallback: true,
        onModeChange: () => { lastPushedEtaMs = null; syncCompanionAlarm(); },
      });
      // appendChild into the placeholder rather than replaceWith on it: the
      // shared DOM stub implements the former and not the latter, and a render
      // path that only works in a real browser is one nothing tests.
      const host = content.querySelector('#qett-companion-row');
      if (host && companionAlarm) host.appendChild(companionAlarm.el);
    }

    // THE ACTIVITY STRIP (Core v11). Guarded, because an older Core beneath a
    // newer module is a state real users reach — and this module degrades to
    // exactly what it did before if the API is absent, rather than throwing.
    if (Core.ui && typeof Core.ui.activity === 'function') {
      activity = Core.ui.activity({ name: MODULE_ID, max: 6 });
      content.appendChild(activity.el);
    }

    migrateWindowGeometryOnce();
    windowHandle = Core.createWindow({
      id: MODULE_ID,
      title: 'Pet Slot Alarm',
      resizable: true,
      // MEASURED AGAINST WHAT IS ACTUALLY ON SCREEN AT OPEN, which has now
      // gone stale three times. Today that is: the answer band with its
      // alarm headline, the three session buttons, the readiness line, and
      // four groups (Session, What it has read, Alarm, and the background
      // group), plus the activity strip. The cadence fields do NOT count
      // toward it -- they live in this module's Settings tab now.
      //
      // REPORTED 2026-09-10: 380x665 clipped the last group and forced a
      // scrollbar on open by default. Measured directly in a real browser
      // (not the viewport-shrunk test stub) at default state: the content
      // needs ~721px of body height against 665's ~631px available (header
      // eats 34px of the window's own 665) -- a real ~90px shortfall, not a
      // rounding nit. 760 leaves headroom rather than landing exactly on
      // today's number, which is how this went stale the first two times.
      // If you add or remove a group, RE-MEASURE here (open it, check
      // `.apoz-window-body`'s scrollHeight vs clientHeight) rather than
      // nudging the number until it looks right.
      minSize: { w: 380, h: 760 },
      settingsTab: MODULE_ID,
      content,
      onClose: () => togglePanel(false),
    });
  }

  // ONE-TIME MIGRATION (v6): Core.createWindow now owns geometry persistence
  // under its own apoz:windowGeometry:<id> key. Seed it from this module's
  // pre-v6 saved position, if any, so an existing user's custom placement
  // survives the framework migration instead of silently resetting to
  // default. Cosmetic data — a failure here is never worth failing boot over.
  function migrateWindowGeometryOnce() {
    const NEW_KEY = 'apoz:windowGeometry:' + MODULE_ID;
    try {
      if (localStorage.getItem(NEW_KEY)) return; // already migrated, or repositioned since
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      const g = saved && saved.windowGeometry;
      if (!g || !g.left || !g.top) return; // never dragged - let the new default apply
      const x = parseFloat(g.left), y = parseFloat(g.top);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const w = parseFloat(g.width), h = parseFloat(g.height);
      localStorage.setItem(NEW_KEY, JSON.stringify({
        x, y, w: Number.isFinite(w) ? w : 300, h: Number.isFinite(h) ? h : 460,
      }));
    } catch (e) { /* cosmetic migration only - never block boot on it */ }
  }

  function togglePanel(force) {
    const show = force !== undefined ? force : windowHandle.el.hidden;
    // Collapse the activity strip on the way DOWN. Expanding it grows the
    // window, and growing the window trips createWindow's persisting
    // ResizeObserver -- so closing while expanded banked the extra height into
    // saved geometry and every open/expand/close cycle stacked another one.
    if (!show && activity && typeof activity.collapse === 'function') activity.collapse();
    if (show) windowHandle.open(); else windowHandle.close();
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
  buildPanelContent();
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

  // Exploration Ceiling — highest Village Exploration level a 25-member
  // roster can still clear all 40 monsters. Unlike Party Gold ROI above,
  // this one carries NO live snapshot yet: reading all 25 members' real
  // stats needs a roster scrape this repo hasn't built (see the tool's own
  // Formulas panel, tagged OPEN) — Game live mode inside it is a stub until
  // then, so there is nothing live worth prepending. The blob is still
  // rebuilt fresh on each open (not cached at module load) for the same
  // reason as roiUrl: keeps this consistent if a live snapshot is added
  // later, and costs nothing today.
  let explorationCeilingUrl = null;
  Core.registerLink({
    id: 'exploration-ceiling',
    label: 'Exploration Ceiling',
    open() {
      if (explorationCeilingUrl) { try { URL.revokeObjectURL(explorationCeilingUrl); } catch (e) { /* ignore */ } }
      explorationCeilingUrl = URL.createObjectURL(new Blob([APOZ_TOOL_EXPLORATION_CEILING], { type: 'text/html' }));
      return explorationCeilingUrl;
    },
  });

  // Sculpture Stat Optimizer — optimal sculpture grid split for Stat Rate % vs
  // specific stat drop rates (Strength, Health, Dexterity, Agility).
  let sculptureOptUrl = null;
  Core.registerLink({
    id: 'sculpture-stat-optimizer',
    label: 'Sculpture Stat Optimizer',
    open() {
      if (sculptureOptUrl) { try { URL.revokeObjectURL(sculptureOptUrl); } catch (e) { /* ignore */ } }
      sculptureOptUrl = URL.createObjectURL(new Blob([APOZ_TOOL_SCULPTURE_STAT_OPTIMIZER], { type: 'text/html' }));
      return sculptureOptUrl;
    },
  });

  Core.registerModule({
    id: MODULE_ID,
    // The visible name only. MODULE_ID stays 'eta-tracker' -- it keys
    // localStorage, the saved window geometry and the settings tab, so
    // renaming it would orphan every preference anyone has set.
    label: 'Pet Slot Alarm',
    shortLabel: 'Alarm',
    description: 'Estimates time to the next combat pet slot upgrade and rings when it is affordable',
    // The Core API this was written against. A Core older than this refuses
    // the registration and says which version is needed, instead of the module
    // half-working and failing somewhere unrelated. See DISTRIBUTION.md §1.2.
    needsCore: 6, // v6: migrated onto Core.createWindow/Core.ui.* — see buildPanelContent()
    // Its own pane in Core's shared Settings window (v11). render() is called
    // once, the first time the tab is opened — which is also the first moment
    // the panel is guaranteed to have been built, so the node exists to adopt.
    settings: {
      label: 'ETA Tracker',
      render(container) {
        const head = document.createElement('div');
        head.className = 'apoz-settings-cat';
        head.textContent = 'Alarm cadence';
        container.appendChild(head);
        if (cadenceNode) {
          cadenceNode.hidden = false;
          container.appendChild(cadenceNode);
        } else {
          const note = document.createElement('div');
          note.className = 'qett-hint-inline';
          note.textContent = 'Open the ETA Tracker window once to load these.';
          container.appendChild(note);
        }
        const oh = document.createElement('div');
        oh.className = 'apoz-settings-cat';
        oh.textContent = 'Session projection';
        container.appendChild(oh);
        const ohRow = Core.ui.inputRow({
          label: 'Overnight actions',
          type: 'number',
          value: String(overnightActions),
          info: 'Party actions usually run through the daily reset overnight, which tops the pool '
            + 'back up before a session ends. This is YOUR average, not a measured game figure, so '
            + 'the projections label it as an assumption. Set 0 to leave it out.',
          onChange: (v) => {
            const n = parseInt(v, 10);
            overnightActions = Number.isFinite(n) && n >= 0 ? n : 0;
            saveProgress();
            render();
          },
        });
        container.appendChild(ohRow);

        if (rateNode) {
          const h2 = document.createElement('div');
          h2.className = 'apoz-settings-cat';
          h2.textContent = 'Manual rate override (testing)';
          container.appendChild(h2);
          rateNode.hidden = false;
          container.appendChild(rateNode);
        }
      },
    },
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
    // Enabling always shows the window right away — a page RELOAD restoring
    // last session's open state is the separate, settings-gated case (see
    // bootstrap()'s own togglePanel(true) call, below).
    onToggle: (enabled) => {
      if (enabled) togglePanel(true);
      else { stopTracking(); silenceAlarm(); togglePanel(false); }
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
      unsilence: () => unsilenceAlarm(),
      isSilenced: () => silenced,
      simulateUpgradePath, petSlotBoostPercent, petSlotUpgradeCost,
      silence: () => silenceAlarm(),
      simulatePurchaseClick: () => {
        lastSync = { atMs: Date.now(), level: null, current: null };
        trackerEtaMs = null; trackerAlarmFired = false; trackerAcknowledged = false;
        nextAlarmAtMs = null; alarmRepeats = 0;
      },
      recomputeEta: () => { recomputeEta(); return trackerEtaMs; },
    },
    onResetPosition: () => windowHandle.resetPosition(),
  });

  // Settings-gated (v6.1, default OFF): a page reload restoring every window
  // that happened to be open last session is clutter most of the time —
  // enabling a module fresh (onToggle above) always still shows it though.
  if (panelOpen && Core.getSetting && Core.getSetting('autoShowOnReload')) togglePanel(true);

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
