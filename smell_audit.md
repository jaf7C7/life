# Code Review

This is a full smell audit of `life/` (production code) and `tests/` (`tests/unit/` and
`tests/e2e/`, test code) in this Conway's Game of Life project, produced by the `smell-audit`
skill: read every file, run the `growing-oos` and `refactoring` skills over them, synthesise and
verify the findings, then explain each smell and propose a fix order.

This supersedes the previous `smell_audit.md`. Four commits have landed since that audit
(`612bc41 move viewport logic to separate module`, `b921149 extract function`, `06907dc delete
redundant function`, `734d90b extract method`), and several of its findings are now fixed —
verified below rather than silently dropped. The refactor also introduced a small new smell of
its own. `npm test` (`eslint && mocha tests/unit && playwright test`) passes 22/22 on the current
tree (10 unit, 12 e2e across three browsers) — none of the smells below are live bugs, all are
design/maintenance risk.

## Fixes verified from the previous audit

- **Duplicated coordinate math / origin data clump (old Smells 1 & 2)** — `life/viewport.js` now
  exists as a single shared module (`getOrigin`, `cellPosition`, `cellCentre`,
  `cellBodyPosition`, `cellAtPosition`, `isBorderPixel`), and `life/app.js`,
  `tests/unit/helpers.js`, and `tests/e2e/helpers.js` all import from it instead of
  reimplementing the geometry independently. The originX/originY pair is no longer threaded
  through every function signature as a raw parameter pair.
- **`RenderedCell extends Cell` (old Smell 6)** — `tests/e2e/helpers.js`'s `RenderedCell` is now a
  plain class with its own `x`/`y` fields; it no longer subclasses the domain `Cell`.
- **`isAlive`/`isDead` duplicated structure (old Smell 8)** — both now delegate to a shared
  `cellIsColor(color)` method.

These are genuine structural fixes, not just renames — worth calling out since they addressed the
two highest-leverage items the previous audit flagged.

---

## Background: the principles referenced

- **Fowler** — Martin Fowler, _Refactoring: Improving the Design of Existing Code_ (2nd ed.,
  2018). A catalogue of "code smells" — surface symptoms of a design problem — paired with
  named, mechanical "refactorings" that remove them without changing observable behaviour.

- **Freeman & Pryce** — Steve Freeman & Nat Pryce, _Growing Object-Oriented Software, Guided
  by Tests_ (2012, "GOOS"). Central claim: tests are a design tool. When a test is hard to
  write, awkward to read, or needs a wall of setup, that's _feedback_ about the production
  design, not just a testing inconvenience.

- **SOLID** — five principles of object-oriented design (Robert C. Martin):
  - **S**ingle Responsibility — a class/module should have only one reason to change.
  - **O**pen/Closed — open for extension, closed for modification.
  - **L**iskov Substitution — a subtype must be usable wherever its supertype is expected,
    without surprising the caller.
  - **I**nterface Segregation — clients shouldn't be forced to depend on methods they don't use.
  - **D**ependency Inversion — depend on abstractions, not concrete details.

---

## The smells

### Smell A: `createClickHandler` takes an unused parameter

**Where:** `life/app.js:84` — `createClickHandler(ui, canvas, cells)`.

**Verified:** read the full function body — `ui` is never referenced, either in the outer
function or the returned click-handling closure.

**Why it's bad:**

- **Fowler — Speculative Generality**: an unused parameter is either leftover from a previous
  design or a hook for something not yet built. Fowler's advice: remove it now, add it back with
  **Change Function Declaration** when a real caller needs it (YAGNI).
- **SOLID — Interface Segregation** (applied to a function's own signature): callers are forced
  to know about and supply a `ui` object the function doesn't depend on.
- **GOOS**: a signature should communicate everything the function needs from its context. An
  unused parameter misleads a reader into thinking `ui` matters to click handling.

**The refactoring:** **Change Function Declaration** to drop the parameter; update the one call
site (`initApp`). Zero risk, no dependents — a good first move before larger diffs land.

---

### Smell B: live cells are represented as raw strings everywhere (Primitive Obsession / "No String Types")

**Where:** pervasive — `rules.js` (`Set<String>` in/out, `Cell.fromString`/`.toString()` calls
in `next()`), `app.js` (`toggleCell`, both loops in `render`, `createClickHandler`), and all
three test files, which build cell sets as `new Set(['0,0', '0,1', ...])`.

`life/app.js`'s docstring for `toggleCell` still reads:

```js
/**
 * @param {Set<Cell>} cells - The set of living cells, ...
 * @param {Cell} cell - The cell to toggle
 */
function toggleCell(cells, cell) { ... }
```

but `cell` is actually the _string_ produced by `cellAtPosition(...).toString()`, and `cells` is
a `Set<String>`, not `Set<Cell>` — the documentation describes the design the code _should_ have,
which is a strong signal the string encoding is an accidental workaround rather than an
intentional choice, and it's actively dangerous: a maintainer trusting the JSDoc could reasonably
write `cells.has(new Cell(x, y))`, which would silently always return `false` (`Set` uses
reference equality; no two `Cell` instances are `===`).

**Why it's bad:**

- **GOOS — "No String Types"**: a raw string standing in for a domain concept gives you nowhere
  to attach behaviour, and forces every consumer to know the encoding (`"x,y"`) instead of asking
  an object a question. Here the string _is_ the entire public contract for "a live cell," even
  though a `Cell` class already exists.
- **Fowler — Primitive Obsession**: the giveaway is the amount of code whose only job is
  converting between the primitive and the richer type — `Cell.fromString`/`.toString()` calls
  appear in `rules.js`, `app.js`, and implicitly in every test's `Set` literal.
- **Why `Cell` isn't used directly today**: `Cell` has no value equality, so `Set.has`/`.delete`
  (reference equality) can't track live cells if the set held `Cell` objects directly. The string
  encoding is a workaround for this missing capability, not a deliberate design choice.
- **SOLID — Single Responsibility**, inverted: with no object responsible for "the set of live
  cells," that responsibility is smeared across `app.js` and `rules.js`.

**The refactoring:**

1. **Extract Class** to introduce a `Board` (or `LiveCells`) class that **encapsulates** the
   `Set<String>` internally (**Encapsulate Collection** — the raw set is never handed out or
   mutated directly by callers again). Give it a small API: `has(cell)`, `toggle(cell)`,
   `add(cell)`, and iteration yielding `Cell` objects.
2. Keep the string encoding as a private implementation detail inside `Board`, used only for the
   underlying `Set`'s hashing.
3. Update `rules.js`'s `next(cells)` to accept/return a `Board`, operating on `Cell` objects
   throughout.
4. Update `app.js`'s `toggleCell` to become `board.toggle(cell)`.
5. Fix (or remove, once the type is real) the stale JSDoc, and update tests to construct `Board`
   instances rather than raw `Set` literals.

---

### Smell C: `next()` conflates two phases of the algorithm in one loop

**Where:** `life/rules.js:41-67`. The single loop over live cells simultaneously (a) counts each
live cell's live neighbours to decide survival, and (b) accumulates a counter of _dead_
neighbours across all live cells, to later decide births.

**Why it's bad:**

- **Fowler — Split Loop / Split Phase**: a loop doing two different things is a smell even when
  (especially when) it's efficient, because the reader must hold two unrelated computations in
  mind to understand any one line. Fowler treats combining loops for performance as a deliberate
  optimisation applied _after_ clarity, not the default.
- The `counter` object is a **Primitive Obsession** instance in miniature: a plain `{}` used as a
  multiset (`counter[key] = key in counter ? counter[key] + 1 : 1`) is exactly the hand-rolled
  data structure Fowler suggests replacing — here with a `Map`.
- **SOLID — Single Responsibility**: `next()` currently has two reasons to change (the survival
  rule, and the birth rule), even though the two are logically independent in Conway's rules.

**The refactoring:** **Split Phase** — extract `survivors(cells)` and `births(cells)`, each with
its own loop; `next()` becomes `new Set([...survivors(cells), ...births(cells)])`. Use a `Map` in
`births` instead of a plain object. Sequence this _after_ Smell B's `Board` extraction, since the
counting logic should operate on the new API rather than raw strings.

---

### Smell D: post-construction mutation in `RenderedCanvas.cell()`

**Where:** `tests/e2e/helpers.js:209-219`:

```js
async cell(x, y) {
    const cell = new RenderedCell(x, y);
    const [posX, posY] = cellPosition(this, cell);
    cell.posX = posX;
    cell.posY = posY;
    cell.imgData = await this.cellImgData(cell);
    return cell;
}
```

**Why it's bad:**

- **Fowler — incomplete object construction**: between `new RenderedCell(x, y)` and the final
  `return`, the object exists with `posX`/`posY`/`imgData` all `undefined`, yet nothing stops it
  from being observed mid-construction if this function is later restructured (an `await` moved
  earlier, an exception thrown between assignments). A fully-constructed object should be usable
  the instant its constructor returns.
- **SOLID — Single Responsibility**, applied to _when_ responsibility is discharged: construction
  and population are separated in time with no name marking the boundary, so `cell()` is doing a
  factory's job without being one.
- This split exists only because `imgData` needs an `async` fetch, which a synchronous
  constructor can't do — a real constraint, but a factory function is the idiomatic fix, not ad
  hoc field assignment on the caller's side.

**The refactoring:** **Replace Constructor with Factory Function** — move the fetch and field
assignment into a static async factory (`RenderedCell.at(cell, canvas)`) whose constructor takes
all fields as arguments, so the object is complete the moment it exists. `RenderedCanvas.cell(x,
y)` becomes a one-line delegation.

Also worth folding into this pass, since it touches the same test's intent:
`tests/unit/life.test.js`'s `'Clicking on a cell twice leaves it dead'` (and its e2e equivalent)
only assert the _final_ state after two toggles. Per GOOS's "precise assertions," add an
intermediate assertion after the first click (the cell should be present/alive) so the test
actually exercises and verifies both transitions, not just their net effect.

---

### Smell E: duplicated setup across unit tests

**Where:** `tests/unit/life.test.js` — all three tests open with the same two or three lines
(`const cells = new Set(); const ui = new MockUI(); initApp(ui, cells);`, with two of the three
also fetching `const canvas = ui.findElement('canvas');`).

**Why it's bad:**

- **GOOS — "Streamline Test Code"**: setup that doesn't contribute to the description of the
  specific scenario should be moved out of the test body, so the reader's eye goes straight to
  what's _different_ about this test.
- **Fowler — Duplicated Code**, the "Rule of Three": three-for-three repetition is the trigger to
  extract.

**The refactoring:** **Extract Function** a small helper — e.g. `createTestApp()` returning
`{ cells, canvas }` — in `tests/unit/helpers.js`; each test calls it as its one line of setup.
Low-risk, purely local, no dependents.

---

### Smell F: stale JSDoc left behind by the viewport-extraction refactor

**Where:** three functions, all touched by `612bc41 move viewport logic to separate module`:

- `life/app.js:1-20` — `renderCell`'s docstring documents `@param {Number} originX` and
  `@param {Number} originY`, neither of which exist in the actual signature
  `renderCell(ctx, canvas, cell, color)`; `canvas` itself is undocumented.
- `life/viewport.js:41-54` — `cellBodyPosition`'s docstring documents `originX`/`originY` as
  parameters; the actual signature is `cellBodyPosition(canvas, x, y)`.
- `life/viewport.js:70-84` — `cellAtPosition`'s docstring documents `offsetX`/`offsetY` **and**
  `originX`/`originY`; the actual signature is `cellAtPosition(canvas, offsetX, offsetY)` — two
  of the four documented parameters don't exist.

**Verified:** read each function's current signature against its docstring directly; all three
mismatches are exact — the docs describe the pre-refactor call convention (raw `originX`/`originY`
parameters) that the refactor replaced with a `canvas` argument internally computing the origin
via `getOrigin`.

**Why it's bad:**

- **Fowler — Comments** (the smell): a comment (here, a JSDoc block) that describes something
  other than what the code does is worse than no comment — it actively misleads. Fowler's fix for
  comments describing _behaviour_ is usually to name it in code instead, but here the JSDoc is
  simply wrong and needs correcting to match the refactored signature.
- **GOOS — tests/docs as a contract**: a signature's documentation is part of how a caller learns
  to use it without reading the body. Three call sites now lie about their own parameter list.
- Notably ironic: the previous audit's Smell 1 warned that scattering the coordinate geometry
  across independent implementations "verified to agree only by coincidence" was a desync risk.
  The refactor that fixed that smell has, in the same commit, introduced a smaller instance of
  the same underlying failure mode — code changed, documentation didn't follow.

**The refactoring:** **Change Function Declaration** is not needed (signatures are already
correct) — this is a straight documentation fix: rewrite each JSDoc block's `@param` list to match
the actual parameters (`canvas`, plus whichever of `cell`/`x`/`y`/`offsetX`/`offsetY` apply).
Mechanical, zero behavioural risk, but should happen before anyone reads these docs to understand
the module.

---

### Smell G: same-module imports split across two statements

**Where:** `life/app.js:1-2` and `tests/e2e/helpers.js:1-2`, both:

```js
import { Cell } from './cell.js';
import { DisplayCell } from './cell.js';
```

`life/viewport.js:1` shows the alternative already used correctly elsewhere in the codebase:
`import { Cell, DisplayCell } from './cell.js';`.

**Why it's bad:**

- **Fowler — Duplicated Code** in miniature: two statements doing the job of one, and an
  inconsistency between files importing from the exact same module.
- Minor, but it's a one-line fix with zero risk, worth folding into whichever pass next touches
  these files.

**The refactoring:** combine into a single `import { Cell, DisplayCell } from './cell.js';` in
each file.

---

### Smell H: `render()` still computes visible bounds via raw origin arithmetic

**Where:** `life/app.js:26-57`. `render()` calls `getOrigin(canvas)` and then directly computes
`minX`, `maxX`, `minY`, `maxY` using `originX`/`originY`/`canvas.width`/`canvas.height` and
`DisplayCell.step` — the same kind of raw coordinate-system knowledge that `viewport.js` was
extracted specifically to centralise.

**Why it's bad:**

- **Fowler — Feature Envy**: `render()` is more interested in `viewport.js`'s concept of "origin"
  and "step" than in its own job of painting cells; it reaches past the module boundary to derive
  a viewport-level fact (which cells are visible) using low-level primitives instead of asking for
  it directly.
- **SOLID — Single Responsibility**: `viewport.js` was given ownership of "how canvas pixels map
  to cell coordinates" by the recent refactor, but this one usage still bypasses that ownership,
  leaving a residual second copy of viewport-adjacent knowledge that the extraction didn't fully
  capture.
- Practically, this is exactly the kind of leftover the previous audit's Smell 1 was originally
  worried about: coordinate-system logic that continues to exist in more than one place, just now
  one fewer place than before.

**The refactoring:** **Extract Function** + **Move Function** — add a `visibleCellBounds(canvas)`
function to `life/viewport.js` that returns `{ minX, maxX, minY, maxY }`, moving the existing
`Math.floor`/`Math.ceil` arithmetic there verbatim; `render()` then calls it and destructures the
result instead of computing it inline. Low risk, self-contained to `render()` and `viewport.js`.

---

## Suggested order of work

Do the smallest, most self-contained refactorings first, then the refactorings with the widest
fan-out (the ones other fixes would otherwise duplicate) before anything that depends on their
result — so no line of code is edited twice for two different reasons.

1. **Smell A — remove the unused `ui` parameter.** Zero dependencies, zero risk, two minutes. Get
   it out of the way before larger diffs land.

2. **Smell G — merge the split `cell.js` imports** in `life/app.js` and `tests/e2e/helpers.js`.
   Trivial, independent, no reason to defer.

3. **Smell F — fix the three stale JSDoc blocks** (`renderCell`, `cellBodyPosition`,
   `cellAtPosition`). Purely documentation, no code risk, and worth doing before Smell H touches
   `app.js`/`viewport.js` again so the docs aren't stale a second time when that lands.

4. **Smell H — extract `visibleCellBounds` into `viewport.js`.** Same two files as step 3
   (`app.js`, `viewport.js`), so doing it immediately after means those files are only reopened
   once. This also finishes the job the original viewport extraction started, ahead of the larger
   `Board` work below which will also touch `app.js`'s `render()`.

5. **Smell B — encapsulate live cells behind a `Board` class**, removing the pervasive
   string/`Cell` conversion duplication in `app.js` and `rules.js`, and fixing the stale
   `toggleCell` JSDoc as part of introducing the real type. The largest single change; doing it
   after steps 1-4 means `app.js` is otherwise stable and won't need touching again for unrelated
   reasons while this lands.

6. **Smell C — split `next()` into `survivors`/`births`.** Right after Smell B, since it's far
   simpler once `next()` already works against the new `Board` API rather than raw strings.

7. **Smell D — replace post-construction mutation in `RenderedCanvas.cell()` with a factory
   function, and add the missing intermediate assertion to the toggle-twice tests.**
   Self-contained to `tests/e2e/helpers.js` and the toggle tests; independent of the production
   changes above, so it can land in parallel with steps 5-6 if convenient.

8. **Smell E — extract shared unit-test setup.** Purely local, no dependents, safe to do whenever
   — last, as low-risk polish once `initApp`/`MockUI` have settled from the refactors above.

This clears every trivial, dependency-free fix (A, G, F) before anything structural, finishes the
viewport module's job (H) before the next structural refactor touches the same file (B), and
leaves the two purely-local test cleanups (D, E) for whenever convenient since neither is a
dependency of anything else.
