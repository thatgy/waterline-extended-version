# WATERLINE — Compact KAPLAY Port

Refactored from `waterline_kaplay.html` into a data-driven KAPLAY 3001 game.

## Run

Open `index.html` or the standalone `waterline_kaplay_compact.html` in a browser with internet access (KAPLAY loads from unpkg). Alternatively: `python -m http.server 8000` from this directory, then open `http://localhost:8000/`.

## Controls

- WASD or arrows: move (S remains **down**)
- Space: dig/pipe or rapid-tap crafting
- E: interact; C: workbench; P: toggle pipe mode
- Enter: sleep/end day; Esc: close or cancel building
- K / Ctrl+S: save; L: load
- Click map to place an item after choosing it from the workbench

## Organization

- `index.html`: UI/CSS + external `waterline.js`
- `waterline.js`: one compact, readable source (shape descriptors, shared functions, switch dispatch, declarative recipes)
- `waterline_kaplay_compact.html` (distributed separately): all HTML, CSS, and game logic inline, with KAPLAY loaded from the CDN

The refactor retains digging, aquifers, pipe delivery, settlements, shelters, patrols, suspicion, weather, resource trade, salvaging, crafting, timed assembly, random nightly events, minimap, and the full-world save format (`waterline_kaplay_v2`). Existing KAPLAY saves should remain compatible with this refactor.

## Validation

`node --check waterline.js` and headless game-state smoke tests passed (KAPLAY API mocked). Actual KAPLAY WebGL rendering needs testing in a browser with the KAPLAY CDN available.
