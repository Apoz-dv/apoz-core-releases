# apoz-core-releases — generated, do not edit

This repo only **hosts** the built Apoz Core userscripts, their tool pages and
the `manifest.json` that Core reads to notice updates. Tampermonkey installs and
updates from the raw URLs under `live/`.

**Nothing here is source, and nothing here should be edited by hand or by pull
request.** Every file under `live/` is overwritten by the next publish, so a
change made here is silently reverted — and it never reaches anyone's installed
scripts in the meantime, because those carry their own copy of each tool.

**To change something, open a pull request against the private source repo,
`awoo-vibe-sniffa/queslar-core`** — its `CONTRIBUTING.md` covers the whole flow,
including that a merge there still has to be published before players see it.

`beta/` is retired and frozen at 6.7.0-beta. It is kept, not deleted, so anyone
who once installed from it gets "no update" instead of a 404.
