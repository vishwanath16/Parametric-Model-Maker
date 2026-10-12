# Parametric Model Maker

A browser app for customizing OpenSCAD models, in the style of MakerWorld's Parametric Model Maker.
Upload a `.scad` file, edit its Customizer variables in a form, render it with OpenSCAD compiled to
WebAssembly, inspect it on a build plate, and export an STL or 3MF.

Everything runs in your browser. There is no backend and nothing is uploaded.

## Requirements

- Node.js 20.19 or newer (developed on Node 25)
- A browser with WebGL and WebAssembly (any current Chrome, Edge, Firefox or Safari)

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Open the URL it prints, normally <http://localhost:5173>. Pick one of the three examples or drop
in your own `.scad` file.

## Build

```bash
npm run build     # type-checks, then writes a static site to dist/
npm run preview   # serves dist/ locally to check the production build
```

`dist/` is a plain static site and can be hosted anywhere. If you serve it from a sub-path, build
with `npx vite build --base=/your/path/`.

## Test

```bash
npm test            # all tests, once
npx vitest          # watch mode
npm run typecheck   # TypeScript only
```

The suite includes integration tests that run the real OpenSCAD WebAssembly build in Node and
render each bundled example.

## Using the app

| Action | How |
| --- | --- |
| Open a model | Drop files on the landing page, or choose an example |
| Upload dependencies | Select the `.scad` together with the files it `use`s / `include`s, or drop one `.zip` |
| Switch file | "Customizable List" dropdown in the Model card |
| Render | **Generate**, or Ctrl/Cmd+Enter |
| Render on every change | Toggle auto-regenerate (left of Reset); it waits 500 ms after the last change |
| Stop a render | **Cancel** in the progress box, or just start another render |
| Edit the source | **Code**; Ctrl/Cmd+S saves and re-reads the parameters, Ctrl/Cmd+Enter saves and generates |
| Faster drafts | Quality → **Preview** caps `$fn` at 24 (and raises `$fa`/`$fs`) where the file sets them at top level |
| Presets | Apply from the dropdown, **Save preset** (downloads JSON), **Load** (reads JSON) |
| Export | **Export STL** or **3MF**, top right of the viewport |
| See OpenSCAD's output | Console button in the viewport toolbar; it opens by itself when a render fails |

Your last project, parameter values and viewer settings are kept in IndexedDB, so a refresh
restores them. The back arrow closes the project and clears it.

## Customizer syntax

Only top-level assignments of literal values before the first `module` or `function` become
parameters. Assignments that use expressions or other variables are skipped.

```scad
/* [Body] */                     // starts a group; variables before any header go in "Global"
// Outer diameter, mm            // comment directly above = label and tooltip
body_d = 22;       // [16:0.5:40]   slider, min:step:max
body_h = 14;       // [8:40]        slider, min:max
count = 4;         // [2, 4, 8]     dropdown
size = 20;         // [10:Small, 20:Medium]   dropdown with labels
shape = "hex";     // [hex, round]  dropdown of strings
label = "Vishu";   // 16            text, at most 16 characters
step_only = 1.5;   // 0.5           plain number, +/- moves by 0.5
knurl = true;                    // toggle
inner = [60, 40, 25]; // [10:200]   one input per element, each limited to 10..200

/* [Hidden] */                   // everything below is not shown
EPS = 0.01;
```

Without a description comment, `ext_clear` is shown as "ext clear".

Presets use OpenSCAD's own parameter-set format, so a `model.json` saved by desktop OpenSCAD next
to `model.scad` is picked up when you upload both, and files saved here open in desktop OpenSCAD.

## Bundled libraries and fonts

- **BOSL2** and **MCAD** are fetched on demand the first time a file does `include <BOSL2/...>` or
  `use <MCAD/...>`. If you upload your own `BOSL2/` or `MCAD/` folder, yours is used instead.
- `text()` works with three bundled fonts: Liberation Sans (regular and bold) and Liberation Mono.
  Other font names are substituted with one of these.

## Project layout

```
public/
  fonts/                Liberation fonts, mounted when a file calls text()
  libraries/            BOSL2.zip and MCAD.zip, fetched on demand
src/
  parser/               Customizer parser and value validation (no React or DOM), with fixtures
  openscad/             Worker, worker client (cancel = terminate and recreate), -D serialisation
  viewer/               three.js scene: plate, grid, model, camera presets
  store/                Zustand stores, IndexedDB session, auto-regenerate
  lib/                  Upload/zip handling, presets, STL helpers, 3MF writer
  components/           landing, layout, model, customize, viewport, editor
  examples/             Bundled .scad examples
```

## Limits and known gaps

- **First render downloads about 14 MB** of OpenSCAD WebAssembly (cached by the browser afterwards).
- **No real progress percentage.** OpenSCAD does not report one, so the progress box shows the
  current stage and elapsed time.
- **Preview is not OpenSCAD's F5 preview.** It is a full render at lower facet counts, and it only
  affects `$fn`/`$fa`/`$fs` assigned at the top of the file, not values passed to individual calls.
- **3MF is converted from the STL in the browser**, not written by OpenSCAD (this WebAssembly build
  crashes on 3MF export). It contains one plain mesh with no colours or print settings.
- **Very large models** (over about 1.5 million triangles) show a warning and may be slow to view
  or export. If OpenSCAD runs out of memory the render fails with a message; try Preview quality.
- **Uploads are limited to 100 MB** in total.
- **The thread adapter example** uses the standard 60° unified thread profile, but it has not been
  test-printed. Adjust `ext_clear` and `int_clear` for your printer.

## Licences of bundled components

OpenSCAD (via the `openscad-wasm` package) is GPL-2.0-or-later, BOSL2 is BSD-2-Clause, MCAD is
LGPL-2.1, and the Liberation fonts are under the SIL Open Font License. This matters only if you
redistribute or host the app publicly.
