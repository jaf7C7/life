# Code Review

This is a full smell audit of `life/` (production code) and `tests/`
(`tests/unit/` and `tests/e2e/`, test code) in this Conway's Game of Life
project, produced by the `smell-audit` skill: read every file, run the
`growing-oos` and `refactoring` skills over them, synthesise and verify the
findings, then explain each smell and propose a fix order.

This supersedes the previous `smell_audit.md`. Five commits have landed
since that audit (`612bc41`, `b921149`, `06907dc`, `734d90b`, plus
`6b757c7 move DisplayCell.size to viewport.js`, `ce2dcfb move
DisplayCell.borderWidth to viewport.js`, `379806f move cell color stuff
from cell.js to app.js`), and several of its findings are now fixed --
verified below rather than silently dropped. `npm test` (`eslint && mocha
tests/unit && playwright test`) passes 22/22 on the current tree (10 unit,
12 e2e across three browsers) -- none of the smells below are live bugs,
all are design/maintenance risk.

## Fixes verified from the previous audit

- **Smell A, unused `ui` parameter (previous audit)** -- `createClickHandler`
  now reads `createClickHandler(canvas, cells)` in `life/app.js:73`; the
  `ui` parameter is gone and the sole call site (`initApp`) was updated to
  match.
- **Smell G, split `cell.js` imports (previous audit)** -- every import of
  `cell.js` across `life/app.js`, `life/viewport.js`, and
  `tests/e2e/helpers.js` is now a single combined statement (or imports
  only `Cell`, since `DisplayCell` no longer exists -- see below). No file
  still splits one module's exports across two `import` lines.
- **Smell H, `render()` raw origin arithmetic (previous audit)** --
  `life/app.js`'s `render()` now calls `visibleCells(canvas)` from
  `viewport.js` and iterates the result directly; the `minX`/`maxX`/
  `minY`/`maxY` arithmetic has been moved into `viewport.js` (function
  `visibleCells`), which is exactly the `Extract Function` + `Move
  Function` pair the previous audit recommended. `render()` no longer
  reaches past the module boundary for viewport-level facts.
- **`DisplayCell` fully dissolved** -- `grep -rn "DisplayCell"` across the
  whole tree (excluding `node_modules`) returns zero hits. The three most
  recent commits finished moving its state (`size`, `borderWidth`, color
  constants) into `viewport.js` and `app.js` respectively, and the class
  itself is gone rather than left as an empty shell. This is a clean,
  complete migration -- worth calling out since half-finished extractions
  (a class kept alive just to re-export fields) are a common way this kind
  of refactor goes wrong, and this one didn't.

These are genuine structural fixes, not just renames -- worth calling out
since they addressed three of the previous audit's cheapest, most
mechanical recommendations exactly as specified.

---

## Background: the principles referenced

- **Fowler** -- Martin Fowler, _Refactoring: Improving the Design of
  Existing Code_ (2nd ed., 2018). A catalogue of "code smells" -- surface
  symptoms of a design problem -- paired with named, mechanical
  "refactorings" that remove them without changing observable behaviour.

- **Freeman & Pryce** -- Steve Freeman & Nat Pryce, _Growing Object-Oriented
  Software, Guided by Tests_ (2012, "GOOS"). Central claim: tests are a
  design tool. When a test is hard to write, awkward to read, or needs a
  wall of setup, that's _feedback_ about the production design, not just a
  testing inconvenience.

- **SOLID** -- five principles of object-oriented design (Robert C. Martin):
  - **S**ingle Responsibility -- a class/module should have only one reason
    to change.
  - **O**pen/Closed -- open for extension, closed for modification.
  - **L**iskov Substitution -- a subtype must be usable wherever its
    supertype is expected, without surprising the caller.
  - **I**nterface Segregation -- clients shouldn't be forced to depend on
    methods they don't use.
  - **D**ependency Inversion -- depend on abstractions, not concrete
    details.

---

## The smells

### Smell B: live cells are represented as raw strings everywhere

(Primitive Obsession / "No String Types") -- **unchanged from previous
audit.**

**Where:** pervasive -- `life/rules.js` (`Set<String>` in/out,
`Cell.fromString`/`.toString()` calls in `next()`), `life/app.js`
(`toggleCell`, both loops in `render`, `createClickHandler`), and all
three test files, which build cell sets as `new Set(['0,0', '0,1', ...])`.

`life/app.js:53-60`'s docstring for `toggleCell` still reads:

```js
/**
 * @param {Set<Cell>} cells - The set of living cells, ...
 * @param {Cell} cell - The cell to toggle
 */
function toggleCell(cells, cell) { ... }
```

but `cell` is actually the _string_ produced by
`cellAtPosition(...).toString()`, and `cells` is a `Set<String>`, not
`Set<Cell>` -- the documentation describes the design the code _should_
have, which is a strong signal the string encoding is an accidental
workaround rather than an intentional choice, and it's actively dangerous:
a maintainer trusting the JSDoc could reasonably write `cells.has(new
Cell(x, y))`, which would silently always return `false` (`Set` uses
reference equality; no two `Cell` instances are `===`).

**Why it's bad:**

- **GOOS -- "No String Types"**: a raw string standing in for a domain
  concept gives you nowhere to attach behaviour, and forces every consumer
  to know the encoding (`"x,y"`) instead of asking an object a question.
  Here the string _is_ the entire public contract for "a live cell," even
  though a `Cell` class already exists.
- **Fowler -- Primitive Obsession**: the giveaway is the amount of code
  whose only job is converting between the primitive and the richer type --
  `Cell.fromString`/`.toString()` calls appear in `rules.js`, `app.js`, and
  implicitly in every test's `Set` literal.
- **Why `Cell` isn't used directly today**: `Cell` has no value equality,
  so `Set.has`/`.delete` (reference equality) can't track live cells if the
  set held `Cell` objects directly. The string encoding is a workaround
  for this missing capability, not a deliberate design choice.
- **SOLID -- Single Responsibility**, inverted: with no object responsible
  for "the set of live cells," that responsibility is smeared across
  `app.js` and `rules.js`.

**The refactoring:**

1. **Extract Class** to introduce a `Board` (or `LiveCells`) class that
   **encapsulates** the `Set<String>` internally (**Encapsulate
   Collection** -- the raw set is never handed out or mutated directly by
   callers again). Give it a small API: `has(cell)`, `toggle(cell)`,
   `add(cell)`, and iteration yielding `Cell` objects.
2. Keep the string encoding as a private implementation detail inside
   `Board`, used only for the underlying `Set`'s hashing.
3. Update `rules.js`'s `next(cells)` to accept/return a `Board`, operating
   on `Cell` objects throughout.
4. Update `app.js`'s `toggleCell` to become `board.toggle(cell)`.
5. Fix (or remove, once the type is real) the stale JSDoc, and update
   tests to construct `Board` instances rather than raw `Set` literals.

---

### Smell C: `next()` conflates two phases of the algorithm in one loop

**unchanged from previous audit.**

**Where:** `life/rules.js:41-67`. The single loop over live cells
simultaneously (a) counts each live cell's live neighbours to decide
survival, and (b) accumulates a counter of _dead_ neighbours across all
live cells, to later decide births.

**Why it's bad:**

- **Fowler -- Split Loop / Split Phase**: a loop doing two different
  things is a smell even when (especially when) it's efficient, because
  the reader must hold two unrelated computations in mind to understand
  any one line. Fowler treats combining loops for performance as a
  deliberate optimisation applied _after_ clarity, not the default.
- The `counter` object is a **Primitive Obsession** instance in miniature:
  a plain `{}` used as a multiset (`counter[key] = key in counter ?
counter[key] + 1 : 1`) is exactly the hand-rolled data structure Fowler
  suggests replacing -- here with a `Map`.
- **SOLID -- Single Responsibility**: `next()` currently has two reasons
  to change (the survival rule, and the birth rule), even though the two
  are logically independent in Conway's rules.

**The refactoring:** **Split Phase** -- extract `survivors(cells)` and
`births(cells)`, each with its own loop; `next()` becomes `new
Set([...survivors(cells), ...births(cells)])`. Use a `Map` in `births`
instead of a plain object. Sequence this _after_ Smell B's `Board`
extraction, since the counting logic should operate on the new API rather
than raw strings.

---

### Smell D: post-construction mutation in `RenderedCanvas.cell()`

**unchanged from previous audit.**

**Where:** `tests/e2e/helpers.js:214-224`:

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

- **Fowler -- incomplete object construction**: between `new
RenderedCell(x, y)` and the final `return`, the object exists with
  `posX`/`posY`/`imgData` all `undefined`, yet nothing stops it from being
  observed mid-construction if this function is later restructured (an
  `await` moved earlier, an exception thrown between assignments). A
  fully-constructed object should be usable the instant its constructor
  returns.
- **SOLID -- Single Responsibility**, applied to _when_ responsibility is
  discharged: construction and population are separated in time with no
  name marking the boundary, so `cell()` is doing a factory's job without
  being one.
- This split exists only because `imgData` needs an `async` fetch, which a
  synchronous constructor can't do -- a real constraint, but a factory
  function is the idiomatic fix, not ad hoc field assignment on the
  caller's side.

**The refactoring:** **Replace Constructor with Factory Function** -- move
the fetch and field assignment into a static async factory
(`RenderedCell.at(cell, canvas)`) whose constructor takes all fields as
arguments, so the object is complete the moment it exists.
`RenderedCanvas.cell(x, y)` becomes a one-line delegation.

Also worth folding into this pass, since it touches the same test's
intent: `tests/unit/life.test.js`'s `'Clicking on a cell twice leaves it
dead'` (and its e2e equivalent) only assert the _final_ state after two
toggles. Per GOOS's "precise assertions," add an intermediate assertion
after the first click (the cell should be present/alive) so the test
actually exercises and verifies both transitions, not just their net
effect.

---

### Smell E: duplicated setup across unit tests

**unchanged from previous audit.**

**Where:** `tests/unit/life.test.js` -- all three tests open with the same
two or three lines (`const cells = new Set(); const ui = new MockUI();
initApp(ui, cells);`, with two of the three also fetching `const canvas =
ui.findElement('canvas');`).

**Why it's bad:**

- **GOOS -- "Streamline Test Code"**: setup that doesn't contribute to the
  description of the specific scenario should be moved out of the test
  body, so the reader's eye goes straight to what's _different_ about this
  test.
- **Fowler -- Duplicated Code**, the "Rule of Three": three-for-three
  repetition is the trigger to extract.

**The refactoring:** **Extract Function** a small helper -- e.g.
`createTestApp()` returning `{ cells, canvas }` -- in
`tests/unit/helpers.js`; each test calls it as its one line of setup.
Low-risk, purely local, no dependents.

---

### Smell F: stale JSDoc left behind by the viewport-extraction refactor

**unchanged from previous audit.**

**Where:** two functions in `life/viewport.js`, plus one in `life/app.js`,
all describing a pre-refactor call convention that no longer exists:

- `life/app.js:13-24` -- `renderCell`'s docstring documents `@param
{Number} originX` and `@param {Number} originY`, neither of which exist
  in the actual signature `renderCell(ctx, canvas, cell, color)`;
  `canvas` itself is undocumented.
- `life/viewport.js:74-87` -- `cellBodyPosition`'s docstring documents
  `originX`/`originY` as parameters; the actual signature is
  `cellBodyPosition(canvas, cell)`.
- `life/viewport.js:99-113` -- `cellAtPosition`'s docstring documents
  `offsetX`/`offsetY` **and** `originX`/`originY`; the actual signature is
  `cellAtPosition(canvas, offsetX, offsetY)` -- two of the four documented
  parameters don't exist.

**Verified:** read each function's current signature against its
docstring directly; all three mismatches are exact and identical to what
the previous audit found -- none of the three commits that landed since
touched these functions' documentation.

**Why it's bad:**

- **Fowler -- Comments** (the smell): a comment (here, a JSDoc block) that
  describes something other than what the code does is worse than no
  comment -- it actively misleads.
- **GOOS -- tests/docs as a contract**: a signature's documentation is
  part of how a caller learns to use it without reading the body. Three
  call sites still lie about their own parameter list.

**The refactoring:** **Change Function Declaration** is not needed
(signatures are already correct) -- this is a straight documentation fix:
rewrite each JSDoc block's `@param` list to match the actual parameters
(`canvas`, plus whichever of `cell`/`x`/`y`/`offsetX`/`offsetY` apply).
Mechanical, zero behavioural risk.

---

### Smell I: garbled comment inside `cellBodyPosition` (new)

**Where:** `life/viewport.js:89-96`:

```js
    // `posX` and `posY` are the canvas pixel co-ords for the top left corner
    // `of the cell inclusive of its border. cellBorderWidth / 2` is
    // `added to each co-ord to give the position of the top-left corner of the
    // `*body* of the cell, which is needed by `ctx.fillRect` to paint the
    // `cell. the background is painted first then each cell painted onto the
    // `background (see `render()`).
```

**Verified:** read the raw file; every continuation line opens with a
stray backtick that doesn't pair with anything (`` `of ``, `` `added ``,
`` `cell. ``, `` `background ``), and one mid-sentence backtick pair
(`` `*body* of the cell, which is needed by `ctx.fillRect` ``) closes in
the wrong place, wrapping "of the cell, which is needed by " inside code
formatting instead of `ctx.fillRect`. This reads as inline-code/markdown
formatting that leaked into a plain `//` comment, most likely from a copy
edit that moved this text out of a Markdown JSDoc-adjacent context.

**Why it's bad:**

- **Fowler -- Comments**: a comment that's hard to parse fails at its one
  job. This one is still recoverable by a careful reader, but it forces
  them to mentally strip stray punctuation instead of reading the
  explanation directly -- exactly the kind of comment upkeep debt Fowler
  warns accumulates unless it's caught immediately.
- Low severity, but it sits inside the same function this audit is
  already rewriting the JSDoc for (Smell F), so it's free to fix in the
  same edit.

**The refactoring:** no named refactoring needed -- rewrite the six-line
comment as plain prose without the stray backticks, in the same pass as
Smell F's `cellBodyPosition` JSDoc fix.

---

### Smell J: pixel-coordinate pairs travel as raw two-element arrays

(Data Clump)

**Where:** `life/viewport.js` -- `getOrigin`, `cellPosition`,
`cellCentre`, and `cellBodyPosition` all return `[x, y]` as a bare array,
immediately destructured by every caller: `life/app.js` (`renderCell`),
`tests/unit/helpers.js` (`clickCell`), and `tests/e2e/helpers.js`
(`clickCell`, `RenderedCanvas.cell`). `cellAtPosition` and `cellCentre`'s
consumers all re-destructure the same pair on the way in or out.

**Why it's bad:**

- **Fowler -- Data Clumps**: "two data items that hang around together in
  function after function" should become a class of their own. Here it's
  the same X/Y pixel pair, unpacked and repacked via array destructuring
  at four call sites across three files, purely to move it from one
  function to the next.
- **GOOS -- "No String Types"** generalises here to "no positional-array
  types": a bare `[x, y]` array gives a reader no name for what it holds
  and no compile-time (or even runtime) guard against `[y, x]` being
  passed by mistake -- unlike the `Cell` class, which already exists for
  the analogous *grid*-coordinate pair and is used consistently.
- This is the pixel-coordinate counterpart of Smell B: the codebase
  already has one convention (a class) for the domain's other coordinate
  pair (grid cells) and a second, weaker convention (raw arrays) for this
  one.

**The refactoring:** **Replace Primitive with Object** -- introduce a
small `Point` (or `Pixel`, if kept distinct from the unrelated `Pixel`
class in `tests/e2e/helpers.js`) value class with `x`/`y` fields, exported
from `viewport.js`. Change `getOrigin`, `cellPosition`, `cellCentre`, and
`cellBodyPosition` to return a `Point` instead of a two-element array;
update the handful of call sites to use `.x`/`.y` instead of array
destructuring. Low risk -- purely mechanical, and it removes destructuring
boilerplate from every call site rather than adding any.

---

## Suggested order of work

Do the smallest, most self-contained refactorings first, then the
refactorings with the widest fan-out (the ones other fixes would
otherwise duplicate) before anything that depends on or overlaps with
their result -- so no line of code is edited twice for two different
reasons.

1. **Smells F and I together -- fix the stale JSDoc and the garbled
   comment.** Both land inside the same function (`cellBodyPosition`,
   plus the two other JSDoc fixes for `renderCell`/`cellAtPosition`);
   doing them in one pass means that region of `viewport.js` is opened
   once, not twice. Purely documentation, zero code risk, no dependents.

2. **Smell J -- introduce a `Point` value class for pixel coordinates.**
   This is the widest-reaching mechanical change left: it touches
   `viewport.js`'s exported return shapes and every call site that
   destructures them (`app.js`, both test helper files). Doing it now,
   before Smell D reworks `RenderedCanvas.cell()`/`RenderedCell` in the
   same file, means that factory-function rewrite is written once against
   the final `Point`-based API instead of being touched again afterward.

3. **Smell B -- encapsulate live cells behind a `Board` class**, removing
   the pervasive string/`Cell` conversion duplication in `app.js` and
   `rules.js`, and fixing the stale `toggleCell` JSDoc as part of
   introducing the real type. This is the largest single change and the
   other widest-fan-out item (touches `rules.js`, `app.js`, and all three
   test files); sequencing it after step 2 means `app.js` isn't
   independently reopened for two unrelated coordinate/collection
   refactors.

4. **Smell C -- split `next()` into `survivors`/`births`.** Directly
   depends on Smell B: it's far simpler once `next()` already works
   against the new `Board` API rather than raw strings, and it's the same
   file (`rules.js`), so doing it immediately after avoids reopening that
   file a second time.

5. **Smell D -- replace post-construction mutation in
   `RenderedCanvas.cell()` with a factory function, and add the missing
   intermediate assertion to the toggle-twice tests.** Self-contained to
   `tests/e2e/helpers.js` and the toggle tests; sequenced after step 2 so
   it's written directly against the `Point`-based viewport API rather
   than the old array-destructuring one.

6. **Smell E -- extract shared unit-test setup.** Purely local, no
   dependents, safe to do whenever -- last, as low-risk polish once
   `initApp`/`MockUI` have settled from the refactors above.

This clears every trivial, dependency-free fix (F, I) before anything
structural, does the two widest-fan-out refactors (J, then B) before the
work that depends on or would otherwise duplicate them (D and C
respectively), and leaves the one purely-local test cleanup (E) for
whenever convenient since it isn't a dependency of anything else.
