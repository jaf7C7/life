# Smell Audit

This is a full smell audit of `life/` (production: `app.js`, `cell.js`,
`rules.js`, `viewport.js`, `index.html`) and `tests/` (`tests/unit/`,
`tests/e2e/`). `eslint.config.js` was also read because one finding concerns
it; `playwright.config.js` was read and is generated boilerplate with no
findings. It was produced by the `smell-audit` skill: read every file in scope,
run the `growing-oos` and `refactoring` skills over them, synthesise one list,
verify each claim mechanically where possible, then explain each smell and
propose a fix order.

**Previous audit:** the working-copy `smell_audit.md` (uncommitted, written
against the current HEAD `7468f1d`). No commits have landed since, so nothing is
newly fixed. Instead, this audit re-checked the previous one's claims against
the code and found several that are wrong, overstated, or missing. They are
listed under "Corrections to the previous audit" below. Smell letters are kept
for continuity; new smells start at N.

**How the findings were verified:**

- `grep` for every exported symbol's callers.
- Baseline `npm test`: eslint clean, 10/10 unit, 12/12 e2e (chromium, firefox,
  webkit).
- **Mutation testing** in a scratch copy of the repo (this working tree was not
  modified): deliberately break one thing, run the tests, and see whether any
  test notices. A break that no test notices is a _surviving mutant_: evidence
  that the tests don't specify that behaviour. The e2e mutation runs used
  chromium only.

| #   | Deliberate break (scratch copy)                                                      | Result                                                                                                         | Smell |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----- |
| M1  | Delete the `initApp(...)` call from `index.html`, so the app never runs              | **2 of 4 e2e tests still pass** ("A canvas element is created", "Clicking on a cell twice leaves it dead")     | N     |
| M2  | After any click, repaint dead cells in the border colour (the whole grid goes black) | **4 of 4 e2e tests pass**                                                                                      | N     |
| M3  | `initApp` calls `ui.createElement('div')` instead of `'canvas'`                      | 3 of 3 app unit tests fail; 4 of 4 e2e tests pass, because production ignores the tag                          | O     |
| M4  | Birth rule `=== 3` becomes `>= 3` (`life/rules.js:31`)                               | **10 of 10 unit tests pass**                                                                                   | C     |
| M5  | `cellBorderWidth` 2 becomes 4; rendering stays self-consistent                       | 2 of 4 e2e tests fail on correct rendering: the test oracle `isBorderPixel` is wrong at pixel offsets 1 and 23 | Q     |
| M6  | Swap x and y in `pixelData`'s index formula                                          | 4 of 4 e2e tests pass (an equivalent mutant while cells are square-symmetric)                                  | L     |
| M7  | Click handler never toggles (unit level)                                             | The unit "Clicking on a cell twice leaves it dead" test passes on its own; its sibling test catches the break  | N     |

The fixes proposed for N and C were also checked against these mutants. They
pass on the current code and fail under M1, M2, and M4 respectively.

---

## Corrections to the previous audit

1. **Smell F was not fully fixed, and Smell M's "should pass" claim is false.**
   Enabling `jsdoc/check-param-names` fails lint today:
   `@param "y" does not match an existing function parameter` at
   `tests/e2e/helpers.js:201`. `RenderedCanvas.click({ x, y })` documents two
   positional
   parameters but takes one destructured object. The previous audit only
   checked the three production functions it had named.
2. **Smell M's alternative ("extend `flat/recommended`") would not guard
   anything.** Every rule in that preset is a warning. On this tree it reports
   97 warnings and 0 errors, and `eslint` exits 0, so `npm test` would stay
   green through exactly the drift the rule exists to catch.
3. **Smell B referred to "stale `toggleCell` JSDoc".** It isn't stale:
   `@param {Set<string>} cells` and `@param {string} cell` match
   `toggleCell(cells, cell)` (`life/app.js:64-68`). This was carried over from
   an older audit without re-checking.
4. **Smell D's main argument doesn't hold in JavaScript.** It said the half-built
   `RenderedCell` "could be observed mid-construction". It can't be: `cell` is a
   local binding that nothing else holds until `return`. The smell is real, but
   it's _Temporary Field_ and _Feature Envy_, restated below.
5. **Smell L overstated the risk and over-prescribed the fix.** M6 shows the
   only wrong index that survives is the x/y swap, which is equivalent while
   cells are symmetric. Any other wrong index fails loudly, because
   `cellIsColor` checks every pixel. A dedicated unit test for a test helper's
   one-line index calculation isn't proportionate; good names are enough.
6. **Smell C's Single Responsibility argument was weak.** It said "survival and
   birth are two reasons to change". But Conway's rule (B3/S23) is one rule,
   and changing it touches both halves together. The Split Loop case stands on
   readability alone. The more important finding in `rules.js`, the untested
   birth boundary (M4), was missed.
7. **Missed entirely:** the vacuous e2e tests (N), the `UI` fiction (O), the
   wrong border oracle (Q), the triplicated viewport transform (P), and
   `app.js`'s divergent change (R).
8. **Smell E is downgraded.** Most of its repeated setup exists only to serve
   the `UI` fiction (Smell O), so it should be folded into that fix rather than
   done separately.

---

## Background: the principles referenced

- **Fowler**: Martin Fowler, _Refactoring: Improving the Design of Existing
  Code_ (2nd ed., 2018). A catalogue of "code smells", which are surface
  symptoms of a design problem. Each is paired with named, mechanical
  "refactorings" that remove it without changing observable behaviour. Fowler
  is explicit that refactoring depends on _self-testing code_: you may only
  restructure safely what your tests would catch you breaking.

- **Freeman & Pryce**: Steve Freeman & Nat Pryce, _Growing Object-Oriented
  Software, Guided by Tests_ (2012, "GOOS"). Its central claim is that tests are
  a design tool. When a test is hard to write, awkward to read, or needs a wall
  of setup, that is _feedback_ about the production design, not just a testing
  inconvenience. Its heuristics used below:
  - _Only mock types you own_: fake your own interfaces, not third-party ones.
  - _No String Types_: domain concepts get real types, not strings.
  - _Context Independence_: an object shouldn't know about the system around
    it.
  - _Test for information, not representation_: assert what a value means, not
    how it happens to be stored.
  - _Runaway tests_: a test can pass vacuously if it checks a state the system
    is already in.

- **SOLID**: five principles of object-oriented design (Robert C. Martin):
  - **S**ingle Responsibility: a module should have only one reason to change.
  - **O**pen/Closed: open for extension, closed for modification. New behaviour
    should be addable without editing existing code.
  - **L**iskov Substitution: a subtype must be usable wherever its supertype is
    expected. (Not invoked below.)
  - **I**nterface Segregation: clients shouldn't be forced to depend on methods
    they don't use.
  - **D**ependency Inversion: high-level policy should depend on abstractions
    it owns, not on low-level details.

---

## The smells

Ordered roughly by severity: verified test defects first, then structural
smells, then cosmetic ones.

### Smell N: two of four e2e tests pass with the app switched off (new)

**Where:** `tests/e2e/life.test.js:4-8` and `:32-40`, relying on
`tests/e2e/helpers.js:131-160` (`cellIsColor`, `isAlive`, `isDead`).

- "A canvas element is created" asserts that `getByTestId('canvas')` is
  visible. That canvas is static markup at `life/index.html:14`; the app never
  creates it.
- "Clicking on a cell twice leaves it dead" asserts that `isAlive()` is
  `false`. "Not alive" is true of a dead cell. It is also true of an unpainted
  canvas (transparent pixels read back as `#000000`), an all-black grid, or a
  cell of any wrong colour.

**Verified:**

- M1: with `initApp` never called, both tests pass.
- M2: with the grid painted black after every click, all four e2e tests pass.
- M7: at unit level, the matching test also passes with a no-op click handler.
  There, the sibling "Clicking on the center…" test catches the break, so the
  unit suite as a whole holds. The e2e suite does not.
- When a boolean assertion does fail, Playwright reports only
  `Expected: true / Received: false`, with no pixel, colour, or offset.

**Why it's bad:**

- **Freeman & Pryce: Runaway tests.** GOOS warns that a test "can pass
  vacuously if it checks for a state the system is already in before doing any
  work." Both tests do exactly that. The canvas exists before any JavaScript
  runs, and the cell is "not alive" before any click. The book's remedy is to
  make the test observe the system _move away from_ its initial state before
  asserting the target state.
- **Freeman & Pryce: specify precisely what should happen.** The intended
  specification is "dead"; the assertion says "not alive". This imprecision
  runs the dangerous way: it under-specifies, so broken renders are accepted.
- **Freeman & Pryce: make diagnostics clear.** `cellIsColor` computes exactly
  which pixel is wrong, then collapses that into a boolean. The failure message
  throws away the only information that would tell you what broke.
- **Fowler: self-testing code** (_Refactoring_ ch. 4). A test that can't fail is
  worse than no test, because it licenses refactoring you haven't protected.
  Smells O, P, R and B below all move rendering code. Today the e2e suite would
  not notice a post-click render regression while doing them.

**The fix** (these are behaviour-specification changes to tests, not
refactorings; commit them separately):

1. In the toggle test, assert `isAlive()` is `true` after the first click, then
   `isDead()` is `true` after the second. **Verified:** this passes on the
   current code, fails under M1 (at the first assertion), and fails under M2 (at
   the final `isDead()`).
2. Delete the e2e "A canvas element is created" test. It tests `index.html`'s
   markup, not the app. "Cell `1,1` is rendered in the initial grid" already
   fails when the app doesn't run (M1), so that is the real smoke test.
3. Replace the boolean helpers with Playwright custom matchers `toBeAlive` and
   `toBeDead`, exported from `tests/e2e/helpers.js` via `baseExpect.extend`.
   - First, **Extract Function** on `cellIsColor`'s inner comparison to make
     `firstMismatch(color)`. It returns `{ x, y, expected, actual }` or `null`.
   - Each matcher returns `{ pass: mismatch === null, message }`, with a
     message like "pixel (5,5) was #000000, expected #ffffff".
   - Tests import `expect` from the helpers and read
     `await expect(await canvas.cell(1, 1)).toBeDead()`.

---

### Smell O: the `UI` "port" is a fake DOM, and production wires it with a lambda that ignores its argument (new)

**Where:**

- `life/app.js:96-115`: a `UI` typedef, `{ createElement(tag) }`, and
  `initApp`, which calls `ui.createElement('canvas')`.
- `life/index.html:21`: `initApp({ createElement: () => canvas }, cells)`. The
  "factory" returns the one existing canvas whatever tag it's asked for.
- `tests/unit/helpers.js:5-53`: `MockUI`. It imitates three browser APIs:
  `document.createElement`, `HTMLCanvasElement` (`width`, `height`,
  `addEventListener`) and `CanvasRenderingContext2D` (`getContext()` returns
  `{ fillRect() {} }`). It also adds `click`/`clickCell`, which a real canvas
  doesn't have, and keeps an `elements` array plus `findElement` for the single
  element ever created.
- `tests/unit/life.test.js:6-41`: every test fetches the canvas via
  `findElement('canvas')`. The tests then click using pixel arithmetic
  (`canvas.width / 2`) or production's `cellCentre`.

**Verified:**

- M3: changing the tag to `'div'` fails all three app unit tests, while all
  four e2e tests pass. The unit tests pin a detail that production ignores, and
  the unit "A canvas element is created" test cannot fail for any reason
  production could.
- The fake is 100×100. The real canvas is the HTML default 300×150; nothing in
  `life/` sets `width` or `height`.

**Why it's bad:**

- **Freeman & Pryce: Only mock types you own.** `MockUI` is a hand-written
  imitation of browser APIs whose contracts you don't control, and it has
  already diverged from them: a different size, a `click()` method the real
  element lacks, and a drawing context that accepts any call and records
  nothing. The unit tests pass against the imitation, not the real thing.
- **Freeman & Pryce: listen to the tests.** To say "clicking cell 0,0 makes it
  live", a _unit_ test of the app has to do pixel arithmetic and import viewport
  geometry. That is the test telling you the app's logic (toggle a cell) isn't
  separated from the canvas's pixel coordinate system. And because the fake
  context does nothing, `render()` has no unit-level coverage at all. Drawing
  rides entirely on the e2e suite, which Smell N shows is weak.
- **Fowler: Speculative Generality.** `createElement(tag)` is a general element
  factory for an app that needs exactly one canvas, and production proves it by
  ignoring `tag`. `MockUI.elements`/`findElement` is a **Lazy Element** on top
  of it.
- **SOLID: Dependency Inversion.** The abstraction `initApp` depends on is a
  slice of the DOM API, so the low-level detail defines the interface rather
  than the app. **Interface Segregation:** what `initApp` actually uses is
  `{ width, height, getContext, addEventListener }` (a canvas), not a document.
- Corroborated by `TODO.md`: "Implement a real `UI` class" and "Extract a
  `CanvasWrapper` or `GameGrid` class from `MockUI`".

**The refactoring** comes in two stages. Do stage 1 now. Do stage 2 when the
click-and-drag pan work starts (the next TODO item), because panning is exactly
the change that makes pixel-level app tests expensive.

_Stage 1: remove the fiction_ (**Change Function Declaration**, **Remove Middle
Man**, **Inline Class**):

1. Change `initApp(ui, cells)` to `initApp(canvas, cells)`. Delete the
   `ui.createElement` call and the `UI` typedef.
2. In `index.html`, call `initApp(document.querySelector('canvas'), cells)`.
3. In `tests/unit/helpers.js`, **Inline Class** `MockUI` into a `fakeCanvas()`
   factory returning the element object. Keep `click`/`clickCell` on it for
   now, and delete `elements`/`findElement`.
4. Change the two behavioural unit tests to start with
   `const canvas = fakeCanvas()` followed by `initApp(canvas, cells)` (fold in
   Smell E here). Delete the unit "A canvas
   element is created" test: what it asserted no longer exists, and never
   existed in production.
5. Run `npm test`.

_Stage 2: a port the app owns_ (**Extract Class**, **Move Function**):

1. Define the role the app needs in its own terms. For example, a `GridView`
   with `onCellClicked(handler)` (the handler receives a `Cell`) and
   `draw(board)`.
2. **Extract Class** `CanvasGridView` from `render`, `renderCell` and the
   pixel-to-cell conversion in `createClickHandler`. It owns the canvas, the
   `Viewport` (Smell P) and the palette (Smell R).
3. `initApp(view, board)` becomes pure wiring:
   `view.onCellClicked((cell) => { board.toggle(cell); view.draw(board); })`.
4. Unit-test `initApp` against a fake `GridView` that speaks cells ("when cell
   0,0 is clicked, it is drawn live"), with no pixels and no geometry imports.
   `CanvasGridView` is covered by the Playwright suite, which is already
   structured as its integration test.

---

### Smell Q: production code exports a test oracle, and the oracle is wrong for any border width but 2 (new)

**Where:**

- `life/viewport.js:143-147`: `isBorderPixel`. Its only caller is
  `tests/e2e/helpers.js:121`, via `RenderedCell.hasBorderPixel`, a one-line
  **Middle Man** with a misleading name.
- `life/viewport.js:5` and `:52-56`: the exports `cellStep` and `cellCentre`,
  used only by the two test helper files.
- `life/app.js:9-11`: the three colour constants, whose only importer is
  `tests/e2e/helpers.js:2-6`. That import loads `app.js`, the composition root,
  into the Node-side Playwright process for three strings. It works only
  because `app.js` happens to have no top-level DOM access. The import arrived
  in `379806f` ("move cell color stuff from `cell.js` to `app.js`").

**Verified:**

- A grep of every export confirms the callers listed above.
- M5: with `cellBorderWidth = 4`, rendering stays self-consistent (a 2 px body
  inset and a 24 px step). Yet "Cell `1,1` is rendered in the initial grid" and
  "Clicking on the center of the canvas renders cell `0,0`" both fail.
- Comparing `isBorderPixel` against the rectangle actually painted by
  `cellBodyPosition` shows it misclassifies offsets 1 and 23. Its expression
  `e === 0 || e === cellSize + cellBorderWidth / 2` hard-codes "the border is
  1 px wide" while appearing to be derived from the constants.

**Why it's bad:**

- **Fowler: Duplicated Code.** `isBorderPixel` re-derives where a cell's body
  starts independently of `cellBodyPosition` (`viewport.js:113`). Two
  definitions of one fact drift apart, and this one already has.
- **Fowler: Insider Trading** (modules trading in each other's internals). The
  tests import `cellStep`, `cellCentre`, `isBorderPixel` and the palette, so
  `viewport.js` and `app.js` carry exports whose only job is serving tests.
  **SOLID: Single Responsibility:** `viewport.js` now has to change when the e2e
  helper's needs change.
- **Freeman & Pryce: test for information, not representation.** When the
  expected value is computed by the system under test's own code, a bug in that
  code moves the expectation along with it. Here it is worse: the borrowed code
  is _test_ logic living in production. It looks authoritative, and nothing
  tests it except the tests that depend on it.
- **Freeman & Pryce: Context Independence.** An acceptance-test helper that
  must import the app's composition root is coupled to how the app is wired,
  not to what the app shows.

**The refactoring:**

1. **Move Function** `isBorderPixel` into `tests/e2e/helpers.js` as a
   `RenderedCell` method. **Inline Function** the Middle Man `hasBorderPixel`
   at its one call site in `cellIsColor`.
2. While moving it, make it correct by stating the visual spec as test-owned
   named constants, e.g. `CELL_BODY = 20`, `BORDER_EACH_SIDE = 1` and
   `CELL_PITCH = CELL_BODY + 2 * BORDER_EACH_SIDE`, with a border check of
   `i < BORDER_EACH_SIDE || i >= BORDER_EACH_SIDE + CELL_BODY`. A border-width
   change then fails the tests as a visible _spec_ change you have to
   acknowledge, instead of silently re-deriving the oracle. Use `CELL_PITCH` in
   `pixelData` and `cellImgData` in place of `cellStep`.
3. Replace the palette import with test-owned named constants
   (`const LIVE = '#ff0000'`, and so on). Remove `export` from the three colours
   in `app.js`.
4. Leave `cellCentre` and `cellPosition` in use for now: test helpers may keep
   using production geometry to _locate_ cells (where to click, where to read
   pixels). The change is that what counts as _correct_ (colours, border
   extent) belongs to the tests. Those exports get reshaped once, in Smell P.

---

### Smell C: the birth rule's "exactly three" is untested, and `next()` fuses two phases in one loop

**Code unchanged from the previous audit; the test gap is newly verified.**

**Where:** `life/rules.js:30-32` (`newCells`, `=== 3`), `:41-67` (`next`),
`:57` (`> 1 && < 4`); `tests/unit/rules.test.js:5-64`.

**Verified:**

- M4: changing `=== 3` to `>= 3` passes all 10 unit tests. No fixture contains
  a dead cell with four or more live neighbours; the overpopulation fixture's
  dead cells have at most three.
- A new test, "A dead cell with four live neighbours stays dead" (live cells on
  the four diagonals of `0,0`), passes on the current code and kills M4.
- `rules.js` is imported only by its own test. It isn't wired into the app yet,
  so the gap has no user-visible effect today. It will once Play/Stop lands.

**Why it's bad:**

- **Freeman & Pryce: tests as specification.** The README says "exactly three"
  but the tests specify "at least three". That upper boundary lives in
  `newCells`, the very function a Split Loop would move. Fowler's precondition
  for refactoring is tests that cover what you're moving, so today that
  refactoring would be done blind.
- **Fowler: Split Loop.** A single loop computes two different things: each live
  cell's live-neighbour count (for survival), and a running tally of dead
  neighbours (for births). The reader has to hold both in mind to follow any one
  line. Fowler treats combining loops as a measured optimisation, not the
  default.
- **Fowler: Mysterious Name.** `counter` counts only _dead_ neighbours (live
  ones are skipped at `:50-51`), and its name doesn't say so. It is a plain
  object used as a multiset with a hand-rolled increment
  (`key in counter ? counter[key] + 1 : 1`); a `Map` is the idiomatic tool.
- The rule's thresholds are two differently styled literals in two functions
  (`> 1 && < 4` and `=== 3`), so "B3/S23" isn't legible anywhere in the code.

**The refactoring:**

1. Add the missing four-neighbour test and commit it on its own.
2. **Split Loop.** Duplicate the loop in `next`. Keep only the survival counting
   in one copy and only the dead-neighbour tally in the other. Test.
3. **Extract Function** on each copy: `survivors(board)` and `births(board)`.
   `next` becomes their union. Test.
4. Rename `counter` to `deadNeighbourCounts` and make it a `Map`. Use **Replace
   Loop with Pipeline** where it reads better. Test.
5. **Extract Variable** for the rule itself: `SURVIVES_WITH = new Set([2, 3])`
   and `BORN_WITH = new Set([3])`. Use `.has(n)` in both functions, so the rule
   reads as B3/S23 in one place.

Do steps 2–5 after Smell B, so the new functions are written against the
`Board` API rather than strings. Step 1 has no dependencies and goes early.

---

### Smell P: `viewport.js` is six functions sharing a `canvas` argument, with one coordinate transform written three times, and the copies disagree (new)

**Where:** `life/viewport.js:13-134`.

- `visibleCells`, `cellCentre`, `getOrigin`, `cellPosition`, `cellBodyPosition`
  and `cellAtPosition` all take `canvas` as their first argument, and read only
  `width` and `height` from it.
- The grid↔pixel transform (origin, pitch, Y-axis flip) is derived
  independently three times:
  - in `cellPosition` (cell→pixel, `:87-93`);
  - in `cellAtPosition` (pixel→cell, `:127-134`);
  - in `visibleCells` (pixel bounds→cell bounds, `:13-32`), whose four bounds
    use three different rounding rules: `floor`, `floor`, `floor`, `ceil`.

**Verified:**

- Running `visibleCells` on a 300×150 canvas returns 120 cells: x from −7 to 7,
  y from −4 to 3. The 15 cells in row y = −4 have their top edge at pixel y =
  152, entirely below a 150 px canvas.
- `cellAtPosition` on the corner pixels gives y from −3 to 3. The two
  derivations disagree by one row.
- The overdraw is harmless today, because `fillRect` clips off-canvas draws. But
  it is the first measurable divergence between the three copies.
- Callers pass three different kinds of object as `canvas`: a real
  `HTMLCanvasElement`, `MockUI`'s element, and a `RenderedCanvas`
  (`tests/e2e/helpers.js:216,233`, passing `this`). The JSDoc types all of them
  as `{object}`.

**Why it's bad:**

- **Fowler: Combine Functions into Class.** This is the textbook trigger: "a
  group of functions that operate closely together on a common body of data".
  The data here is the canvas dimensions and the origin derived from them,
  which is recomputed on every call.
- **Fowler: Duplicated Code**, and the **Shotgun Surgery** it sets up. The next
  TODO item, click-and-drag panning, changes the origin. Today that means
  updating three hand-maintained derivations in lockstep, and they already
  disagree by a row.
- **SOLID: Open/Closed.** With the origin as one field of a `Viewport`, panning
  is adding an offset to that field. Today it means modifying every function.
- **Freeman & Pryce: Context Independence.** The functions need "a width and a
  height" but ask for "a canvas". Tests satisfy that by passing unrelated
  objects that happen to have `width`/`height`, so the parameter name
  misdescribes the dependency. There is a related unit mismatch.
  `cellAtPosition` compares `offsetX` (CSS pixels) with `canvas.width`
  (backing-store pixels), and the e2e helper takes its dimensions from
  `boundingBox()` (CSS pixels). These agree only because the canvas isn't
  CSS-scaled. A class is the natural place to state which unit it works in.

**The refactoring:**

1. **Combine Functions into Class.**
   - Create `export class Viewport { constructor(width, height) }`, and compute
     the origin once in the constructor.
   - Move each function in as a method without the `canvas` parameter:
     `positionOf(cell)`, `bodyPositionOf(cell)`, `centreOf(cell)`,
     `cellAt(point)`, `visibleCells()`.
   - Keep the old exports as one-line forwarders that build a `Viewport` from
     `canvas.width`/`canvas.height` and call the matching method. Test.
   - Migrate callers one file at a time (`app.js`, `tests/unit/helpers.js`,
     `tests/e2e/helpers.js`), testing after each. Delete the forwarders.
2. **Substitute Algorithm** on `visibleCells()`. Derive the bounds from
   `this.cellAt` applied to the top-left and bottom-right pixels, and iterate
   between them. That leaves one transform with one rounding rule. Give this its
   own commit: it changes which off-canvas cells are drawn. That can't be seen
   in the pixels, but it isn't strictly a pure refactoring.
3. Fold in Smell J (points instead of arrays) and Smell I (the garbled comment)
   during the move, since every line they touch is being moved anyway.

---

### Smell B: live cells are represented as raw strings everywhere

(Primitive Obsession / "No String Types"). **Code unchanged from the previous
audit.**

**Where:**

- `life/rules.js`: `Set<string>` in and out, with `[...cells].map(Cell.fromString)`
  at `:45` and `.toString()` at `:49` and `:58`.
- `life/app.js`: `liveCells` (`:56-58`, the identical
  `[...cells].map(Cell.fromString)`), `toggleCell` (`:68-74`), and
  `.toString()` in the click handler (`:88`). Three
  `// SMELL: primitive obsession` comments sit at `:49`, `:60` and `:76`.
- `life/index.html:18`.
- Every fixture in `tests/unit/rules.test.js`, plus the raw-`Set` assertions at
  `tests/unit/life.test.js:27` and `:39`.

**Verified:** grep shows the conversion `[...cells].map(Cell.fromString)`
verbatim at `app.js:57` and `rules.js:45`, and shows `rules.js` has no importer
besides its test.

**Why it's bad:**

- **Freeman & Pryce: No String Types.** A raw string standing in for a domain
  concept gives you nowhere to attach behaviour, and forces every consumer to
  know the `"x,y"` encoding. A `Cell` class already exists, yet the string _is_
  the public contract for "a live cell".
- **Fowler: Primitive Obsession**, with **Duplicated Code** as its symptom: the
  string↔`Cell` conversion appears verbatim in two modules.
- **Root cause.** `Cell` has no value equality, so a `Set<Cell>` would compare
  by reference and couldn't track live cells. The string encoding is a
  workaround for a missing capability, not a design choice.
- **Freeman & Pryce: Tell, Don't Ask.** `toggleCell` asks the set `has(cell)`
  and then mutates it from outside. The collection should make that decision
  itself, via `board.toggle(cell)`.
- **Freeman & Pryce: test for information, not representation.** The app unit
  tests observe behaviour by holding a reference to the mutable `Set` passed
  into `initApp` and comparing it with `new Set(['0,0'])`. The tests are
  coupled to both the representation and the fact that `initApp` mutates its
  argument.
- **Fowler: Comments.** The three `// SMELL:` comments are the right diagnosis
  in the wrong medium. They name the problem without removing it, and they must
  be deleted when it's fixed. `TODO.md` already tracks the fix ("Extract a
  `MultiCell` class").
- **Timing.** Because `rules.js` isn't wired to the app yet, now is the cheapest
  moment to design one collection type for both consumers: `next()` needs `has`
  and iteration; the UI needs `toggle` and iteration.

**The refactoring:**

1. **Extract Class** `Board` in a new `life/board.js`, using **Encapsulate
   Collection**:
   - Hold a private `#keys = new Set()` of strings.
   - Give it the API `has(cell)`, `add(cell)`, `toggle(cell)`,
     `[Symbol.iterator]` yielding `Cell`s, `equals(other)`, and
     `static of(...cells)`.
   - The string encoding lives only inside `Board`.
   - Don't put it in `cell.js` as `TODO.md` suggests. `Cell` is a single
     coordinate, and adding collection behaviour there recreates a Divergent
     Change in a new file.
2. Migrate `app.js`. **Inline Function** `toggleCell` as `board.toggle(cell)`,
   delete `liveCells` (iterate the board directly), and pass the `Cell` from the
   click handler without `.toString()`. `index.html` creates `new Board()`.
3. Migrate `rules.js`: `next(board)` returns a `Board` and uses
   `board.has(neighbour)`.
4. Migrate the tests to build fixtures with `Board.of(new Cell(0, 0), ...)`. A
   tiny helper like `board('0,0', '1,1')` is fine if it reads better; GOOS
   tolerates some test duplication for clarity. **Trap, verified:** chai's
   `deep.equal` cannot see private (`#`) fields. Two `Board`s with _different_
   contents compare equal, so the Blinker test's
   `expect(next(next(cells))).to.deep.equal(cells)` would pass vacuously after
   this migration. Assert with `board.equals(other)`, or compare
   `[...board].map(String).sort()`.
5. Delete the three `// SMELL:` comments in the same commit.

Alternative considered and rejected: make `Cell` a value via interning
(`Cell.of(x, y)` returning cached instances) so that `Set<Cell>` works by
identity. The cache grows without bound as patterns evolve, and the toggle logic
would still live outside the collection.

---

### Smell R: `app.js` changes for four unrelated reasons (new)

**Where:** `life/app.js` holds four concerns:

- the palette (`:9-11`);
- drawing (`renderCell`, `render`, `:21-47`);
- cell-set mutation (`liveCells`, `toggleCell`, `:56-74`);
- event wiring and composition (`createClickHandler`, `initApp`, `:86-115`).

**Verified:** in `git show 379806f`, the palette moved _into_ `app.js` from
`cell.js`. That fixed one misplacement by adding a fourth concern here, and it
introduced `tests/e2e/helpers.js`'s import of `app.js` (Smell Q). `TODO.md`
already lists "Move everything to do with rendering (mostly in `app.js`) to
`render.js`".

**Why it's bad:**

- **Fowler: Divergent Change**, where one module is changed in different ways
  for different reasons. A new colour, a new drawing style, a new mutation (drag
  to paint), and a new input (panning) all land in this file.
- **SOLID: Single Responsibility.** That makes four reasons to change.
- **Freeman & Pryce: hard to test means hard to use.** `render()` fetches its
  own drawing context from the canvas (`:35`), so the only way to observe
  drawing is a real browser. Passing the context in would let a small recording
  fake verify drawing at unit level.

**The refactoring:**

1. **Move Function** `render`, `renderCell` and the palette to `life/render.js`.
2. **Change Function Declaration** to `render(ctx, viewport, board)`, using
   **Replace Query with Parameter** for `ctx`, so `render` never calls
   `canvas.getContext` itself.
3. After Smell B, `liveCells` and `toggleCell` are already gone. After this
   step, `app.js` is left as composition only: build the `Viewport` and the
   `Board`, then wire click → toggle → render.
4. `render.js` becomes the body of `CanvasGridView` when Smell O's stage 2
   happens. If you're doing stage 2 immediately, go straight there instead.

---

### Smell J: pixel coordinates travel in three different shapes

(Data Clumps). **Code unchanged from the previous audit; the third shape is
newly noted.**

**Where:**

- As a bare `[x, y]` array: returned by `getOrigin` (`viewport.js:65-70`),
  `cellCentre` (`:52-56`), `cellPosition` (`:87-93`) and `cellBodyPosition`
  (`:104-114`), and destructured at `app.js:23`, `tests/unit/helpers.js:32`,
  `tests/e2e/helpers.js:216` and `:233`.
- As two scalars: `cellAtPosition(canvas, offsetX, offsetY)`.
- As `{ x, y }`: `isBorderPixel(pixel)` and the e2e `Pixel` class.

**Why it's bad:**

- **Fowler: Data Clumps.** Data items that travel together from function to
  function want to become an object. Here one pair is also spelled three
  different ways within one module and its tests.
- **Fowler: Primitive Obsession; Freeman & Pryce: No String Types**, generalised
  to positional arrays. A bare `[y, x]` is indistinguishable from `[x, y]`.
  Meanwhile the grid-coordinate pair already has a proper class (`Cell`) that
  is used consistently.

**The refactoring:**

- **Replace Primitive with Object**, using plain `{ x, y }` points. A class
  only earns its place once behaviour arrives, such as `plus(offset)` for
  panning.
- **Introduce Parameter Object** on `cellAtPosition(canvas, offsetX, offsetY)`
  to make it `cellAt(point)`.
- Do both during Smell P's move, since every signature involved is changing
  then anyway.

---

### Smell D: `RenderedCell` and `Pixel` are filled in from outside after construction

**Code unchanged; the rationale is corrected from the previous audit.**

**Where:**

- `tests/e2e/helpers.js:230-240`: `RenderedCanvas.cell()` constructs
  `RenderedCell(x, y)`, then assigns `posX`, `posY` and `imgData` onto it.
  `posX` and `posY` are read only by `RenderedCanvas.cellImgData` (`:257`).
  They exist purely to carry arguments from one `RenderedCanvas` method to
  another, through the cell.
- The same pattern at `:89-93`: `Pixel` is constructed, then `pixel.data` is
  assigned. The `data;` field declaration (`:37`) is left `undefined` by the
  constructor.
- The JSDoc for `cell()` says `@returns {RenderedCell}`, but the method is
  `async` and returns a `Promise`.

**Verified:** grep for `posX` and `imgData` finds only these sites.

**Why it's bad:**

- **Fowler: Temporary Field**, a field that is only meaningful in one narrow
  circumstance. `posX`/`posY` are exactly that.
- **Fowler: Feature Envy.** `RenderedCanvas.cell()` and `cellImgData(cell)`
  work with `RenderedCell`'s fields more than `RenderedCell` itself does.
- Reading `RenderedCell`'s constructor doesn't show the class's real shape.
  Every method depends on `imgData`, yet `imgData` appears nowhere in the class
  definition.

**The refactoring:**

1. **Change Function Declaration** from `cellImgData(cell)` to
   `imgDataAt(point)`, so it stops reading fields off the cell. Test.
2. Delete the `posX`/`posY` assignments, which are now dead code (**Remove Dead
   Code**).
3. Change the `RenderedCell` constructor to `(x, y, imgData)`. `cell()` then
   locates the cell, fetches the data, and returns
   `new RenderedCell(x, y, imgData)`. No static async factory is needed (the
   previous audit proposed one): `RenderedCanvas` already owns the locator, so
   it already is the factory.
4. Do the same for `Pixel`: `new Pixel(x, y, data)`, and delete the `data;`
   field declaration.
5. Fix `@returns` to `Promise<RenderedCell>`.

The previous audit's intermediate toggle assertion now lives in Smell N, where
it is verified.

---

### Smell M: the JSDoc lint rule checks types, not parameter names, and turning the right rule on fails today

**Where:** `eslint.config.js:12-14` (only `jsdoc/check-types` is enabled) and
`tests/e2e/helpers.js:196-206` (the drifted docstring).

**Verified:**

- `npx eslint --rule '{"jsdoc/check-param-names":"error"}'` gives one error, at
  `tests/e2e/helpers.js:201`.
- In a scratch copy, rewriting that docstring as `@param {object} position`,
  `@param {number} position.x`, `@param {number} position.y` makes lint clean.
- Extending `flat/recommended` gives 97 warnings, 0 errors, and exit code 0.

**Why it's bad:**

- Strictly this is a process gap rather than a Fowler or GOOS catalogue smell.
- **Fowler: Comments.** Documentation that has drifted from the code is worse
  than none, because readers believe it. The one live drift is in test code,
  which the previous audit's manual check didn't cover. That is direct evidence
  that checking by hand doesn't scale.
- **Freeman & Pryce: keep the feedback loops tight.** A check that only warns
  doesn't feed back, because `npm test` and the pre-commit hook both stay
  green.

**The fix** (configuration, not a refactoring):

1. Fix `click`'s docstring to the destructured form above.
2. Add `'jsdoc/check-param-names': 'error'` next to `check-types`.
3. Don't extend `flat/recommended` unless you also make warnings fail the build
   (`eslint --max-warnings 0`) and clear the 97 warnings first. They are mostly
   `require-param-description` and `tag-lines`, which is noise for a codebase
   this size.

---

### Smell L: an apology comment in place of two variable names

**Where:** `tests/e2e/helpers.js:102-112`:

```js
// ... I can't understand this calculation any
// more but it finds the [r, g, b, a] slice of the pixel we want to
// target.
// TODO: Work out what's going on here
const index = (pixel.x + pixel.y * cellStep) * pixelDataSize;
```

**Verified:** M6 (swapping x and y) survives. Every other plausible wrong index
fails, because `cellIsColor` checks all pixels against a ring-shaped expected
pattern.

**Why it's bad:**

- **Fowler: Comments.** "I can't understand this any more" is a comment standing
  in for names. The arithmetic is ordinary row-major indexing: the fetched image
  is `cellStep` pixels wide, so the pixel at column `x`, row `y` is entry
  `y * width + x`, and each entry is 4 bytes (RGBA). Fowler's remedy for a
  comment explaining _what_ code does is to put that explanation into names.
- **Freeman & Pryce: tests as specification.** The e2e fixture is a
  square-symmetric cell, so the suite cannot tell x from y (M6). That's fine
  today. But any future test of an asymmetric shape (the "presets" TODO, e.g. a
  glider) would depend on this orientation, which is currently unproven.

**The refactoring:** **Extract Variable**:

```js
const imageWidth = CELL_PITCH; // after Smell Q; cellStep today
const bytesPerPixel = 4; // RGBA
const offset = (pixel.y * imageWidth + pixel.x) * bytesPerPixel; // row-major
```

Delete the apology and the `TODO`. Don't add a unit test for this helper, as the
previous audit suggested; it isn't proportionate to the risk.

---

### Smell I: garbled comments in `viewport.js`

**Code unchanged from the previous audit.**

**Where:**

- `life/viewport.js:107-112`: a stray backtick opens every line of the
  `cellBodyPosition` comment.
- Typos in the `visibleCells` comments: "does is take" (`:21`), "analagous"
  (`:25`), "shown in by" (`:30`).

**Why it's bad:** **Fowler: Comments.** A comment that's hard to parse fails at
its one job, and makes the reader do error-correction instead of reading the
explanation.

**The fix:** rewrite the comments as plain prose during Smell P. Both comments
describe code that P moves into `Viewport`, and the `visibleCells` bounds
comment disappears entirely when P's Substitute Algorithm replaces that
arithmetic. Rewriting them first would mean editing text that is about to move
or be deleted. If P is deferred, just rewrite them now.

---

### Smell E: repeated setup in the app unit tests (downgraded)

**Where:** `tests/unit/life.test.js`. Every test begins
`const cells = new Set(); const ui = new MockUI(); initApp(ui, cells);`, and
two of the three follow it with `ui.findElement('canvas')`.

**Why it's bad:**

- **Freeman & Pryce: streamline test code**, and **Fowler: Duplicated Code**
  (the Rule of Three). Both point at extracting this setup.
- The case is weak, though. GOOS also warns against applying production-grade
  DRY pressure to tests, and two or three repeated lines per test is little.
- More to the point, most of this setup exists _because of_ Smell O:
  `findElement` is only needed because the test can't otherwise reach the canvas
  it handed to the app.

**The fix:** during Smell O stage 1, **Extract Function** `startApp()` in
`tests/unit/helpers.js`, returning `{ cells, canvas }`. It isn't worth a
separate pass.

---

## Suggested order of work

1. **Smell M: enable `jsdoc/check-param-names` and fix the one docstring.** A
   one-line config change plus a three-line comment edit, with no dependents.
   Doing it first means every signature change in steps 3–8 (O, P, J, D, B, R,
   and C all change signatures) is checked as it's made, instead of re-auditing
   the docs at the end.

2. **Smell N's test fixes, plus Smell C step 1 (the four-neighbour birth
   test).** This makes the safety net real before anything structural moves.
   Every later step except M is a refactoring, and Fowler's precondition is
   tests that would catch a mistake. Today the e2e suite would not catch a
   post-click render regression (M2), and the unit suite would not catch a
   birth-rule regression (M4). These are test-only changes with no production
   dependents, so nothing later invalidates them.

3. **Smells Q + D + L: one sitting in `tests/e2e/helpers.js`.** Step 2's custom
   matchers were written in this same file, so continuing here keeps the file
   open for one stretch instead of reopening it three times. Q goes before P and
   R on purpose. It deletes `isBorderPixel` from `viewport.js` and the colour
   exports from `app.js`, so P doesn't have to convert `isBorderPixel` into a
   `Viewport` method only for it to be deleted, and R doesn't carry test-only
   exports into `render.js`. D and L touch `cellPosition` and `cellStep` on
   about two lines, which P has to update regardless of order, so doing D and L
   now costs nothing extra.

4. **Smell O stage 1 + Smell E: `initApp(canvas, cells)` and `fakeCanvas()`.**
   This is small, and it shrinks the unit-test harness before P. P's migration
   then updates one `clickCell` in a plain fake instead of a `MockUI` that is
   about to be deleted. It also removes the unit test that could only fail for
   non-production reasons (M3), so the next refactorings aren't slowed by false
   failures.

5. **Smells P + J + I: introduce `Viewport`, points, and the single
   transform.** This is the widest mechanical change left (`viewport.js` plus
   call sites in `app.js` and both helper files), and J and I only touch lines P
   is already moving. Doing them together means `viewport.js` is rewritten once.
   It goes before R so `render.js` is born against `Viewport` and never uses the
   `canvas`-first functions. P and B commute; P goes first because it is smaller
   and lower-risk, so if work stops partway the codebase is still left better.

6. **Smell B: `Board`.** This is the largest change, touching `app.js`,
   `rules.js`, `index.html` and every unit test. It must precede R, because B
   deletes `liveCells` and `toggleCell`. R then moves only true rendering code,
   instead of deciding where a string-to-`Cell` converter belongs only for B to
   delete it. It must precede C's restructuring, so `survivors`/`births` are
   written once against `Board`. Watch for the chai `deep.equal` trap here.

7. **Smell R: move rendering to `render.js`.** After steps 3, 5 and 6, `app.js`
   holds only `render`, `renderCell`, the (no longer exported) palette, and
   wiring. So R is a pure Move Function of two functions and three constants,
   plus one Change Function Declaration.

8. **Smell C steps 2–5: split `next()` into `survivors` and `births`.** This
   depends on B (it uses the `Board` API) and on step 2's test (which protects
   the code being moved). It's the only remaining work in `rules.js`, so that
   file is opened once.

9. **Smell O stage 2: a `GridView` port the app owns. Do this when pan work
   starts, not before.** By this point R has produced the body of
   `CanvasGridView` (`render.js`) and P has produced its geometry (`Viewport`),
   so stage 2 is mostly Extract Class around finished parts. Doing it earlier
   would mean building the port around code that steps 5–7 are about to
   reshape. Doing it without the pan feature on the horizon would be the same
   Speculative Generality that Smell O criticises in `createElement(tag)`.

**Why this order minimises rework:** tests come before structure (steps 1–2),
so no refactoring runs unprotected. Everything that _deletes_ code (step 3
removes test-only exports; step 4 removes the `UI` layer; step 6 removes
`liveCells`/`toggleCell`) runs before the step that would otherwise _move_ that
code (P in step 5, R in step 7). Each file is grouped into one sitting:
`tests/e2e/helpers.js` in steps 2–3, `viewport.js` in step 5, `rules.js` in
steps 2 and 8 (test file, then source), and `app.js` touched structurally only
by steps 6–7, with call-site edits elsewhere. The one speculative design step,
the `GridView` port, is deferred until a feature demands it, when it is
cheapest to build.
