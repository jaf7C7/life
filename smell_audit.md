# Code Review

This is a full smell audit of `life/` and `tests/` (both `tests/unit/` and `tests/e2e/`),
produced by this project's `.claude/skills/smell-audit` skill: read every file, run the
`growing-oos` and `refactoring` skills over them, synthesise and verify the findings, then
explain each smell and propose a fix order.

This review supersedes `refactoring_notes_2.md`. One thing has changed since that document was
written: **the live bug it reported (Smell 1 — `tests/unit/helpers.js` referencing the
non-existent `Cell.step`) has since been fixed** — the file now correctly imports and uses
`DisplayCell.step`. That fix is verified below rather than re-reported as an open smell.
Everything else in `refactoring_notes_2.md` is still present in the current code and is
restated here, with one additional corroborating detail found on this pass (a JSDoc/behaviour
mismatch on `toggleCell`, see Smell 5).

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

## Fixed since the last review

### `MockUI.clickCell` — `Cell.step` → `DisplayCell.step` (verified)

`tests/unit/helpers.js` now reads:

```js
import { DisplayCell } from '../../life/cell.js';
...
clickCell(cellX, cellY) {
    this.click({
        x: this.width / 2 + cellX * DisplayCell.step,
        y: this.height / 2 - cellY * DisplayCell.step
    });
}
```

`npm test` (`eslint && mocha tests/unit && playwright test`) passes 22/22. This closes the
"vacuous test" trap described previously — `clickCell` now computes real coordinates instead of
`NaN`. The test itself (`'Clicking on a cell twice leaves it dead'`) still only asserts the
_final_ state, not the intermediate one, which is a minor, low-priority residual smell (folded
into Smell 8 below) but no longer masks an actual defect.

---

## The smells

### Smell 1: coordinate math duplicated across three files

**Where:**

- `life/app.js` — `cellToScreen` and `cellFromScreen`
- `tests/unit/helpers.js` — `MockUI.clickCell`
- `tests/e2e/helpers.js` — `Canvas.originX`, `Canvas.originY`, `Canvas.cellPosition`, and
  `RenderedCell.hasBorderPixel` (which independently re-derives cell/border geometry)

All of these encode the same fact: "a cell's screen position is the viewport origin plus/minus
`cell.coord * DisplayCell.step`, with Y inverted." They were written independently and have
already drifted once (the `Cell.step` bug above was a direct symptom of this duplication).

**Why it's bad:**

- **Fowler — Duplicated Code**: "the most important of the smells," because every future
  change to the coordinate formula (e.g. adding a zoom factor, per the `TODO.md` roadmap) must
  be made correctly in three-plus places, or the system and its tests silently disagree about
  what a "cell" is on screen.
- **SOLID — Single Responsibility**: three unrelated modules (the render loop, a synchronous
  unit-test double, and an async Playwright helper) have each taken on the responsibility of
  "know the coordinate system," which belongs to one thing.
- **GOOS — "the difficulty is telling you something"**: needing to reimplement the same
  geometry to build a _test double_ is a signal that the geometry isn't yet a proper
  collaborator/abstraction in production code — it's implicit knowledge scattered through
  functions instead of an explicit object.

**The refactoring:** **Extract Class**, then **Move Function**, to create a single `Viewport`
class (e.g. `life/viewport.js`) owning `originX`/`originY` and exposing `toScreen(cell)` and
`fromScreen(x, y)`.

1. Create the class with a constructor taking `(originX, originY)`.
2. Move `cellToScreen`'s body into `toScreen`, `cellFromScreen`'s body into `fromScreen`.
3. Update `app.js` to construct one `Viewport` and call its methods.
4. Update `tests/e2e/helpers.js`'s `Canvas` to delegate to `Viewport` instead of reimplementing
   `cellPosition`/`originX`/`originY`.
5. Update `tests/unit/helpers.js`'s `clickCell` to use the same `Viewport.toScreen`.
6. Run the full suite after each step.

---

### Smell 2: `originX`/`originY` are a Data Clump threaded through every function signature

**Where:** `life/app.js` — `cellToScreen(originX, originY, x, y)`, `renderCell(ctx, originX,
originY, cell, color)`, `render(canvas, originX, originY, cells)`, `cellFromScreen(offsetX,
offsetY, originX, originY)`, `createClickHandler(ui, canvas, originX, originY, cells)`.

**Why it's bad:**

- **Fowler — Data Clump**: "whenever you see the same two or three data items together in lots
  of places... it's time for [them] to have their own [object]." Delete one of the pair and the
  other stops making sense alone — that's the tell.
- **SOLID — Single Responsibility**: every function taking `(originX, originY)` has implicitly
  taken on responsibility for the viewport's positioning concept, when all it wants is "convert
  this cell to a point."
- **Long Parameter List** compounds this: `render` and `createClickHandler` thread the pair
  through unchanged purely to hand it to a nested call — noise for a reader trying to
  understand what each function actually does.

**The refactoring:** resolved as a side effect of Smell 1's `Viewport` extraction — a
specialised **Introduce Parameter Object**, since the object also carries behaviour
(`toScreen`/`fromScreen`), not just data. Once `Viewport` exists, `render(canvas, viewport,
cells)` and `renderCell(ctx, viewport, cell, color)` each take one meaningful parameter instead
of a coordinate pair.

---

### Smell 3: `createClickHandler` takes an unused parameter

**Where:** `life/app.js:102` — `createClickHandler(ui, canvas, originX, originY, cells)`. `ui`
is never referenced in the function body.

**Why it's bad:**

- **Fowler — Speculative Generality** (closest named relative): an unused parameter is either
  leftover from a previous design or a hook for something not yet built. Fowler's advice either
  way: remove it now, add it back with **Change Function Declaration** when a real caller needs
  it. This is the book's recurring YAGNI theme.
- **SOLID — Interface Segregation** (applied loosely to a function's own signature): callers
  are forced to know about and supply a `ui` object the function doesn't depend on.
- **GOOS**: a signature should communicate everything the function needs from its context. An
  unused parameter misleads a reader into thinking `ui` matters to click handling.

**The refactoring:** **Change Function Declaration** to drop the parameter; update the one call
site (`initApp`). Zero risk, no dependents — a good first move before larger diffs land.

---

### Smell 4: `RenderedCanvas.clickCell` targets the cell's corner, not its centre — contradicting its own docstring

**Where:** `tests/e2e/helpers.js:151-157` (`Canvas.originX`/`originY`) and `:225-229`
(`clickCell`).

`Canvas.cellPosition(cell)` returns `originX + cell.x * step` — i.e. the cell's **top-left
corner** (confirmed by `RenderedCell.hasBorderPixel`, which treats offset `0` as a border
pixel). But `clickCell`'s docstring reads:

> "Clicks the centre of the cell at the given cell co-ordinates."

**Why it's bad:**

- **Fowler — Comments (as a smell)**: a comment that no longer matches the code it describes is
  worse than no comment — Fowler's guidance is that a comment used to explain intent should be
  replaced by a well-named function or, when it's simply wrong, corrected immediately, since
  stale comments actively mislead rather than merely fail to help.
- **Correctness risk**: clicking exactly on a cell boundary means any floating-point rounding
  upstream (e.g. a non-integer `boundingBox()` width from a real browser layout) can push
  `Math.floor` in `cellFromScreen` into the _neighbouring_ cell, not the intended one. Today's
  tests happen to pass because the current viewport math and canvas sizes keep this from
  triggering, but the method is one rounding edge case away from a flaky e2e failure that would
  be very confusing to debug, because the docstring insists this can't happen.
- **GOOS — precise tests**: a test helper whose name and doc promise "the centre" but whose
  behaviour delivers "the corner" is exactly the kind of hidden mismatch between a test's
  declared intent and its actual behaviour that erodes trust in what a passing/failing test
  means.

**The refactoring:** **Extract Variable** / arithmetic fix — `clickCell` should click at the
cell's centre, i.e. `cellPosition(cell)` offset by half a step in each axis:
`{ x: posX + DisplayCell.step / 2, y: posY + DisplayCell.step / 2 }` (matching what
`app.js`'s own `originX`/`originY` centring already assumes elsewhere). Do this together with
the `Viewport` extraction (Smell 1) — once `Canvas` delegates to `Viewport.toScreen`, add the
half-step offset once, in one place, rather than patching `clickCell` in isolation and having to
re-derive the same fix again when `Canvas` is refactored.

---

### Smell 5: live cells are represented as raw strings everywhere (Primitive Obsession / "No String Types")

**Where:** pervasive — `rules.js` (`Set<String>` in/out, `Cell.fromString`/`.toString()` calls
in `next()`), `app.js` (`toggleCell`, both loops in `render`, `createClickHandler`), and all
three test files, which build cell sets as `new Set(['0,0', '0,1', ...])`.

**New on this pass — the JSDoc says what the code should be, not what it is:**
`life/app.js`'s docstring for `toggleCell` reads:

```js
/**
 * @param {Cell} cell - The cell to toggle
 * @param {Set<Cell>} cells - The set of living cells, ...
 */
function toggleCell(cell, cells) { ... }
```

but `cell` is actually the _string_ produced by `cellFromScreen(...).toString()`, and `cells`
is a `Set<String>`, not `Set<Cell>`. This is corroborating evidence for the smell, not a
separate one: the documentation describes the design the code _should_ have (cells as first-
class objects), which is a strong signal that the string encoding is an accidental workaround
rather than an intentional choice — and it's actively dangerous, because a future maintainer
trusting the JSDoc could reasonably write `cells.has(new Cell(x, y))`, which would silently
always return `false` (`Set` uses reference equality, and no two `Cell` instances are `===`).

**Why it's bad:**

- **GOOS — "No String Types"**: a raw string standing in for a domain concept gives you nowhere
  to attach behaviour, and forces every consumer to know the encoding (`"x,y"`) instead of
  asking an object a question. Here the string _is_ the entire public contract for "a live
  cell," even though a `Cell` class already exists.
- **Fowler — Primitive Obsession**: the fix category is literally named for this. The giveaway
  is the amount of code whose only job is converting between the primitive and the richer type
  — `Cell.fromString`/`.toString()` calls appear in `rules.js`, `app.js`, and implicitly in
  every test's `Set` literal.
- **Why `Cell` isn't used directly today**: `Cell` has no value equality, so `Set.has`/`.delete`
  (reference equality) can't track live cells if the set held `Cell` objects directly. The
  string encoding is a workaround for this missing capability, not a deliberate design
  choice — precisely the kind of implicit, load-bearing assumption GOOS warns will surprise the
  next person to touch the code (as the stale JSDoc above demonstrates it already has).
- **SOLID — Single Responsibility**, inverted: with no object responsible for "the set of live
  cells," that responsibility is smeared across `app.js` and `rules.js`.

A related, smaller smell: `toggleCell(cell, cells)` names its first parameter `cell` when it's
actually a string — a **Mysterious Name** (Fowler) independent of the JSDoc issue.

**The refactoring:**

1. **Extract Class** to introduce a `Board` (or `LiveCells`) class that **encapsulates** the
   `Set<String>` internally (**Encapsulate Collection** — the raw set is never handed out or
   mutated directly by callers again). Give it a small API: `has(cell)`, `toggle(cell)`,
   `add(cell)`, and iteration yielding `Cell` objects.
2. Keep the string encoding as a private implementation detail inside `Board`, used only for
   the underlying `Set`'s hashing.
3. Update `rules.js`'s `next(cells)` to accept/return a `Board`, operating on `Cell` objects
   throughout.
4. Update `app.js`'s `toggleCell` to become `board.toggle(cell)`.
5. Fix (or remove, once the type is real) the stale JSDoc, and update tests to construct
   `Board` instances rather than raw `Set` literals — this also removes the "which type is this
   really" ambiguity that produced the mismatch found on this pass.

---

### Smell 6: `next()` conflates two phases of the algorithm in one loop

**Where:** `life/rules.js:41-67`. The single loop over live cells simultaneously (a) counts
each live cell's live neighbours to decide survival, and (b) accumulates a counter of _dead_
neighbours across all live cells, to later decide births.

**Why it's bad:**

- **Fowler — Split Loop / Split Phase**: a loop doing two different things is a smell even when
  (especially when) it's efficient, because the reader must hold two unrelated computations in
  mind to understand any one line. Fowler treats combining loops for performance as a
  deliberate optimisation applied _after_ clarity, not the default.
- The `counter` object is a **Primitive Obsession** instance in miniature: a plain `{}` used as
  a multiset (`counter[key] = key in counter ? counter[key] + 1 : 1`) is exactly the hand-rolled
  data structure Fowler suggests replacing — here with a `Map`.
- **SOLID — Single Responsibility**: `next()` currently has two reasons to change (the survival
  rule, and the birth rule), even though the two are logically independent in Conway's rules.

**The refactoring:** **Split Phase** — extract `survivors(cells)` and `births(cells)`, each
with its own loop; `next()` becomes `new Set([...survivors(cells), ...births(cells)])`. Use a
`Map` in `births` instead of a plain object. Sequence this _after_ Smell 5's `Board`
extraction, since the counting logic should operate on the new API rather than raw strings.

---

### Smell 7: `RenderedCell extends Cell` — inheritance used for convenience, not "is-a"

**Where:** `tests/e2e/helpers.js:61` — `class RenderedCell extends Cell { ... }`, adding
`pixel()`, `pixelData()`, `hasBorderPixel()`, `isAlive()`, `isDead()`.

**Why it's bad:**

- **SOLID — Liskov Substitution**: LSP prompts the question "is every `Cell` conceptually
  interchangeable with a `RenderedCell`?" No — a `RenderedCell` only makes sense against a
  rendered Playwright page (it needs `imgData`/`posX`/`posY`), while `Cell` is a pure coordinate
  pair used throughout the domain. Subclassing a **production, domain** class from a
  **test-only** class inverts the dependency the wrong way: domain code shouldn't need to
  care that a test-only subtype exists, but that coupling is now baked into the class
  hierarchy rather than confined to test files.
- **GOOS — Context Independence**: `Cell` should be usable anywhere without dragging in
  unrelated context. `RenderedCell` just borrows `x`/`y`/`toString` for convenience —
  composition would give it the same thing without polluting the inheritance chain.
- Practically: if `Cell` ever grows a method that doesn't make sense for a `RenderedCell` (or
  vice versa), the link forces an awkward override or an empty method just to keep the
  hierarchy consistent — a classic setup for **Refused Bequest**.

**The refactoring:** stop extending; use composition. Give `RenderedCell` a `cell` field, use
**Hide Delegate** to forward `x`/`y`/`toString()`, and keep `pixel`/`isAlive`/`isDead` as
`RenderedCell`'s own behaviour. `RenderedCanvas.cell(x, y)` then does
`new RenderedCell(new Cell(x, y), imgData)`.

---

### Smell 8: post-construction mutation in `RenderedCanvas.cell()`

**Where:** `tests/e2e/helpers.js:241-251`:

```js
async cell(x, y) {
    const cell = new RenderedCell(x, y);
    const [posX, posY] = this.cellPosition(cell);
    cell.posX = posX;
    cell.posY = posY;
    cell.imgData = await this.cellImgData(cell);
    return cell;
}
```

**Why it's bad:**

- **Fowler — incomplete object construction**: between `new RenderedCell(x, y)` and the final
  `return`, the object exists with `posX`/`posY`/`imgData` all `undefined`, yet nothing stops
  it from being observed mid-construction if this function is later restructured (an `await`
  moved earlier, an exception thrown between assignments). A fully-constructed object should be
  usable the instant its constructor returns.
- **SOLID — Single Responsibility**, applied to _when_ responsibility is discharged:
  construction and population are separated in time with no name marking the boundary, so
  `cell()` is doing a factory's job without being one.
- This split exists only because `imgData` needs an `async` fetch, which a synchronous
  constructor can't do — a real constraint, but a factory function is the idiomatic fix, not ad
  hoc field assignment on the caller's side.

**The refactoring:** **Replace Constructor with Factory Function** — move the fetch and field
assignment into a static async factory (`RenderedCell.at(cell, canvas)`) whose constructor
takes all fields as arguments, so the object is complete the moment it exists.
`RenderedCanvas.cell(x, y)` becomes a one-line delegation. Pair with Smell 7 — both touch the
same class and constructor.

Also worth folding into this pass, since it's in the same file and touches the same test's
intent: `tests/unit/life.test.js`'s `'Clicking on a cell twice leaves it dead'` (and its e2e
equivalent) only assert the _final_ state after two toggles. Per GOOS's "precise assertions" —
specify precisely what should happen, no more and no less — add an intermediate assertion after
the first click (the cell should be present/alive) so the test actually exercises and verifies
both transitions, not just their net effect.

---

### Smell 9: `isAlive()` and `isDead()` duplicate their entire structure

**Where:** `tests/e2e/helpers.js:109-135`. Both methods build the identical nested
`Array.from({length: step}, ...)` grid and call `hasBorderPixel` identically; the only
difference is which two colour constants (`aliveColor`/`deadColor`) are compared against.

**Why it's bad:**

- **Fowler — Duplicated Code**, textbook case for **Parameterize Function**: "when you see two
  functions that differ only in a literal value, combine them via a parameter." Duplicated
  structure like this means every future change to how a cell's colour is checked has to be
  made twice, correctly, in sync.
- GOOS explicitly allows test code _more_ duplication than production code where it aids
  readability of a single scenario — but two ~15-line, structurally identical methods isn't "a
  little duplication for clarity," so it doesn't qualify for that exemption.

**The refactoring:** **Parameterize Function** — replace both with a single `isColor(bodyColor)`
method (comparing border pixels to `DisplayCell.borderColor` and body pixels to `bodyColor`),
and make `isAlive()`/`isDead()` one-line callers (`isColor(DisplayCell.aliveColor)` /
`isColor(DisplayCell.deadColor)`), or **Inline Function** them away if callers are happy calling
`isColor(...)` directly.

---

### Smell 10: duplicated setup across unit tests

**Where:** `tests/unit/life.test.js` — all three tests open with:

```js
const cells = new Set();
const ui = new MockUI();
initApp(ui, cells);
const canvas = ui.findElement('canvas');
```

**Why it's bad:**

- **GOOS — "Streamline Test Code"**: setup that doesn't contribute to the description of the
  specific scenario should be moved out of the test body, so the reader's eye goes straight to
  what's _different_ about this test. Right now a reader must diff four identical lines across
  three tests to confirm none of it is scenario-specific.
- **Fowler — Duplicated Code**, the "Rule of Three": three-for-three repetition is the trigger
  to extract.

**The refactoring:** **Extract Function** a small helper — e.g. `createTestApp()` returning
`{ cells, canvas }` — in `tests/unit/helpers.js`; each test calls it as its one line of setup.
Low-risk, purely local, no dependents.

---

## Suggested order of work

Do the smallest, most self-contained refactorings first, then the refactorings with the widest
fan-out (the ones other fixes would otherwise duplicate) before anything that depends on their
result — so no line of code is edited twice for two different reasons.

1. **Smell 3 — remove the unused `ui` parameter.** Zero dependencies, zero risk, two minutes.
   Get it out of the way before larger diffs land.

2. **Smells 1, 2 and 4 together — extract a shared `Viewport` class**, used by `app.js`,
   `tests/unit/helpers.js`, and `tests/e2e/helpers.js`'s `Canvas`, and fix `clickCell`'s
   centre-vs-corner bug (Smell 4) as part of the same change. This is the highest-leverage
   refactor here: it eliminates the duplicated math, resolves the `originX`/`originY` data
   clump by giving the pair a proper home, and fixes the click-targeting bug in the one place
   that will need to compute "click position for a cell" going forward — rather than patching
   `clickCell` in isolation now and touching it again when `Canvas` is refactored later.

3. **Smell 5 — encapsulate live cells behind a `Board` class**, removing the pervasive
   string/`Cell` conversion duplication in `app.js` and `rules.js`, and fixing the stale JSDoc
   as part of introducing the real type. The largest single change; doing it after step 2 means
   the coordinate-conversion code is already stable and won't need touching again here.

4. **Smell 6 — split `next()` into `survivors`/`births`.** Right after Smell 5, since it's far
   simpler once `next()` already works against the new `Board` API rather than raw strings.

5. **Smells 7 + 8 — replace `RenderedCell extends Cell` with composition, replace
   post-construction mutation with a factory function, and add the missing intermediate
   assertion to the toggle-twice tests.** Grouped together because they touch the same class,
   constructor, and test intent in the same area of `tests/e2e/helpers.js`.

6. **Smell 9 — parameterize `isAlive`/`isDead` into `isColor`.** Same file as step 5; fold into
   the same pass.

7. **Smell 10 — extract shared unit-test setup.** Purely local, no dependents, safe to do
   whenever — last, as low-risk polish once `initApp`/`MockUI` have settled from the refactors
   above.

This front-loads the two structural refactors (`Viewport`, `Board`) that everything else either
depends on or would otherwise duplicate, catches the click-targeting bug as a side effect of the
first structural refactor rather than as a separate bolt-on patch, and leaves the purely local
cleanups (unused parameter, test setup duplication) for whenever convenient, since they carry no
risk of being redone.
