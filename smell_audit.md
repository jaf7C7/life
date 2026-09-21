# Smell Audit

This is a full smell audit of `life/` (production: `app.js`, `cell.js`,
`rules.js`, `ui.js`, `viewport.js`, `index.html`) and `tests/` (`tests/unit/`,
`tests/e2e/`). `eslint.config.js` was also read because one finding concerns
it. `playwright.config.js` was read too; it is generated boilerplate and has no
findings. The audit was produced by the `smell-audit` skill. It read every file
in scope and ran the `growing-oos` and `refactoring` skills over them. It then
merged their findings into one list, checked each claim mechanically where
possible, explained each smell, and proposed a fix order.

**Previous audit:** `smell_audit.md` as committed in `fce45c5` ("re-audit using
opus 5 with xhigh effort"). Six commits have landed since:

- `975321a`–`877c78f` replace the static `<canvas>` with a `UI` class
  (`life/ui.js`) that creates and mounts the canvas.
- `42c8eca` fixes the vacuous e2e toggle test.

The changes are summarised under "Changes since the previous audit" below. Smell
letters are kept for continuity with that audit.

**How the findings were verified:**

- `grep` for every exported symbol's callers.
- Baseline `npm test` at `42c8eca`: eslint clean, 10/10 unit, 12/12 e2e
  (chromium, firefox, webkit).
- **Mutation testing** in scratch copies of `HEAD`. This working tree was not
  modified. The method: deliberately break one thing, run the tests, and see
  whether any test notices. A break that no test notices is a _surviving
  mutant_, which is evidence that the tests don't specify that behaviour. The
  e2e mutation runs used chromium only. M1–M7 repeat the previous audit's
  mutants so the two audits can be compared directly. M8 is new.

| #   | Deliberate break                                                            | At `fce45c5` (previous audit)                | At `42c8eca` (now)                                                                                                    | Smell |
| --- | --------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----- |
| M1  | Delete the `initApp(...)` call from `index.html`, so the app never runs     | 2 of 4 e2e tests still passed                | **Killed:** 4 of 4 e2e tests fail                                                                                     | N     |
| M2  | After any click, repaint dead cells in the border colour (grid goes black)  | 4 of 4 e2e tests passed                      | **Killed:** the toggle test fails at its final `isDead()`                                                             | N     |
| M3  | `initApp` calls `ui.createElement('div')` instead of `'canvas'`             | 3 unit tests fail; 4 of 4 e2e tests pass     | **Unchanged:** 3 unit tests fail; 4 of 4 e2e tests pass, because the new `UI.createElement` doesn't take a tag at all | O     |
| M4  | Birth rule `=== 3` becomes `>= 3` (`life/rules.js:31`)                      | 10 of 10 unit tests passed                   | **Unchanged:** 10 of 10 unit tests pass                                                                               | C     |
| M5  | `cellBorderWidth` 2 becomes 4; rendering stays self-consistent              | 2 of 4 e2e tests failed on correct output    | **Worse:** 3 of 4 fail on correct output. The stronger toggle test now consults the wrong oracle too                  | Q     |
| M6  | Swap x and y in `pixelData`'s index formula                                 | Survived (equivalent while cells are square) | **Unchanged:** survives                                                                                               | L     |
| M7  | Click handler never toggles; run the unit "twice leaves it dead" test alone | Passed                                       | **Unchanged:** passes                                                                                                 | N     |
| M8  | `render()` returns immediately (new)                                        | n/a                                          | **10 of 10 unit tests pass.** Drawing has no unit-level coverage at all                                               | O, R  |

The fixes proposed below for M4 and M7 were checked the same way. Each passes on
the current code and fails under its mutant.

---

## Changes since the previous audit

**Verified fixed:**

1. **Smell N's runaway e2e tests are fixed.** The toggle test now asserts
   `isAlive()` after the first click and `isDead()` after the second
   (`tests/e2e/life.test.js:36-40`). This kills M2. Moving canvas creation into
   `UI` also changed the e2e "A canvas element is created" test from a markup
   check into a real smoke test: the canvas only exists if the app runs, and M1
   now fails all four e2e tests. **The previous audit's advice to delete that
   test is withdrawn.** It now fails first and with the clearest message
   (`expect(locator).toBeVisible() failed`), which makes it the most useful
   smoke test in the suite.

**Reshaped, not fixed:**

2. **Smell O.** The previous audit recommended deleting the `UI` indirection
   and passing the canvas straight in (`initApp(canvas, cells)`). The recent
   commits went the other way and made `UI` a real class. That's a legitimate
   choice if `UI` is meant to grow into the app's display port, and `TODO.md`
   ("Implement a real `UI` class") suggests it is. But the class kept the
   boundary in the same place. It still speaks DOM (`createElement`), still
   hands back a raw canvas, and still ignores the tag it's asked for (M3). The
   section below is rewritten around the author's two stated goals: fast tests
   without a browser, and a future `TerminalUI` implementing the same
   interface as `WebUI`. Instead of reversing the direction, it finishes it:
   `UI` becomes a two-member interface owned by the app, with `WebUI` as its
   browser adapter. The rewrite also absorbs Smell R's move and parts of N and
   E, and it moves up the fix order.

**Code unchanged:** Q, C, P, B, R, J, D, M, L, I, E. Every claim was re-checked
against `HEAD`. Line numbers are unchanged, because the six commits touched only
`index.html`, `ui.js` and `tests/e2e/life.test.js`.

**Corrections to the previous audit:**

3. **Smell N diagnosed M7 but prescribed no fix for it.** It noted that the
   _unit_ toggle test passes with a no-op click handler. But its fix list only
   covered the e2e twin, so the unit test is still a runaway test. The fix is
   added under N below and verified.
4. **Smell P said `visibleCells`'s four bounds "use three different rounding
   rules: floor, floor, floor, ceil".** That is two rules, not three. The
   finding stands, because the bounds still disagree with `cellAtPosition` by
   one row.
5. **Smell Q missed one production export with no outside caller.**
   `getOrigin` (`viewport.js:65`) is exported but only used inside
   `viewport.js`.

---

## Background: the principles referenced

- **Fowler**: Martin Fowler, _Refactoring: Improving the Design of Existing
  Code_ (2nd ed., 2018). It catalogues "code smells", which are surface symptoms
  of a design problem. Each smell is paired with named, mechanical
  "refactorings" that remove it without changing observable behaviour. Fowler
  is explicit that refactoring depends on _self-testing code_: you can only
  restructure safely what your tests would catch you breaking.

- **Freeman & Pryce**: Steve Freeman & Nat Pryce, _Growing Object-Oriented
  Software, Guided by Tests_ (2012, "GOOS"). Its central claim is that tests are
  a design tool. When a test is hard to write, awkward to read, or needs a wall
  of setup, that is _feedback_ about the production design, not just a testing
  inconvenience. The heuristics used below:
  - _Only mock types you own_: fake your own interfaces, not third-party ones.
    Wrap third-party APIs in an adapter, fake the adapter's interface, and test
    the adapter against the real thing.
  - _Ports and adapters_: the application defines the interfaces ("ports") it
    needs, in its own vocabulary. Thin "adapters" translate between those ports
    and the outside world (here, the DOM and canvas).
  - _No String Types_: domain concepts get real types, not strings.
  - _Tell, Don't Ask_: tell an object what to do instead of pulling its state
    out and deciding for it.
  - _Context Independence_: an object shouldn't know about the system around
    it.
  - _Test for information, not representation_: assert what a value means, not
    how it happens to be stored.
  - _Runaway tests_: a test can pass vacuously if it checks a state the system
    is already in.
  - _Make diagnostics clear_: a failing test should say what went wrong, not
    only that something did.

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

These are ordered roughly by severity: test defects and boundary problems first,
then structural smells, then cosmetic ones.

### Smell N: one runaway unit test remains, and the e2e helpers hide their own diagnostics (partly fixed)

**Where:**

- `tests/unit/life.test.js:30-40`: "Clicking on a cell twice leaves it dead".
  After two clicks it asserts `cells` equals `new Set()`, which is the state
  the test started in.
- `tests/e2e/helpers.js:131-160`: `cellIsColor`, `isAlive` and `isDead`. They
  return booleans, and the tests assert `.toBe(true)`.

**Verified:**

- M7: with the click handler's `toggleCell` call deleted, the unit toggle test
  still passes. Its sibling "Clicking on the center…" catches that particular
  break, so the unit suite as a whole holds. The test itself specifies nothing.
- Adding `expect(cells).to.deep.equal(new Set(['1,1']))` between the two clicks
  passes on the current code and fails under M7.
- Under M5, all three failing e2e tests report only
  `Expected: true / Received: false`. They give no pixel, offset, or colour.

**Why it's bad:**

- **Freeman & Pryce: Runaway tests.** GOOS warns that a test "can pass
  vacuously if it checks for a state the system is already in before doing any
  work". An empty set after two clicks is also an empty set after zero clicks.
  The book's remedy is to observe the system _move away from_ its initial state
  before asserting the target state. `42c8eca` applied exactly that remedy to
  the e2e twin. The unit twin has the same defect and needs the same fix.
- **Freeman & Pryce: make diagnostics clear.** GOOS treats the failure message
  as its own step in the TDD cycle: fail, then _report_, then pass, then
  refactor. `cellIsColor` works out exactly which pixel is wrong and then
  collapses that into `true`/`false`. The one fact that would tell you what
  broke is thrown away before the assertion sees it. You only feel this cost
  when a test fails, which is exactly when you need the information.
- **Fowler: self-testing code** (_Refactoring_ ch. 4). A test that can't fail is
  worse than no test, because it licenses refactorings it doesn't protect. The
  click path is about to be reshaped by Smells O, B and R.

**The fix** (these change what the tests specify, so they aren't refactorings;
commit them separately):

1. Assert the intermediate state in the unit toggle test. **Verified** on the
   current test: adding `expect(cells).to.deep.equal(new Set(['1,1']))` after
   the first `clickCell(1, 1)` kills M7. The fix order folds this into Smell
   O's step 6, which rewrites the test against `FakeUI` with the intermediate
   assertion built in. That rewritten test was also verified to fail when the
   toggle is a no-op. So don't add it separately unless O is postponed.
2. Replace the boolean helpers with Playwright custom matchers, `toBeAlive` and
   `toBeDead`:
   - **Extract Function** on `cellIsColor`'s inner comparison to make
     `firstMismatch(color)`. It returns `{ x, y, expected, actual }`, or `null`
     if every pixel matches. Use nested `every`/`find` over the two ranges
     instead of building a 2-D array of booleans first.
   - In `tests/e2e/helpers.js`, export
     `expect = baseExpect.extend({ toBeAlive, toBeDead })`. Each matcher
     returns `{ pass: mismatch === null, message }`, with a message like
     "pixel (5,5) was #000000, expected #ffffff".
   - Tests import `expect` from `./helpers.js` and read
     `await expect(await canvas.cell(1, 1)).toBeDead()`.
   - Delete `isAlive`, `isDead` and `cellIsColor` once nothing calls them.

---

### Smell O: the new `UI` class is still a DOM factory, not an interface the app owns (reshaped)

**Where:**

- `life/ui.js:1-8`: `class UI { createElement() { ... } }`. It creates a
  canvas, sets `data-testid`, appends it to `document.body`, and returns it.
  It takes no parameter, and it is the only production module with no JSDoc.
- `life/app.js:96-99`: `@typedef {object} UI` with
  `createElement: (tag: string) => object`. `initApp` calls
  `ui.createElement('canvas')` (`:109`). It then does everything else to the
  raw canvas itself: `getContext` (`:35`), `width`/`height` (`:38`),
  `addEventListener` (`:112`) and `offsetX`/`offsetY` (`:87`).
- `tests/unit/helpers.js:5-53`: `MockUI`. It honours the tag (it stores
  `type`), keeps an `elements` array, and offers `findElement(type)`, which the
  real `UI` has no equivalent of. Its element imitates `HTMLCanvasElement`
  (100×100, where the real canvas is the default 300×150) and
  `CanvasRenderingContext2D` (`getContext()` returns `{ fillRect() {} }`). It
  also adds `click`/`clickCell` methods that the real canvas doesn't have.
- `tests/unit/life.test.js` has three tests: "A canvas element is created",
  "Clicking on the center of the canvas…" and "Clicking on a cell twice leaves
  it dead". Each has a same-named twin in `tests/e2e/life.test.js`.
- `clickCell(cellX, cellY)` is implemented twice, once in each helper file
  (`tests/unit/helpers.js:30-34` and `tests/e2e/helpers.js:214-218`). Both
  build a `Cell`, call production's `cellCentre`, and click the pixel.

**Verified:**

- M3: `initApp` asking for a `'div'` fails all three unit tests and passes all
  four e2e tests. The unit tests pin down a detail that production ignores.
  The unit "A canvas element is created" test can only fail for reasons that
  don't exist in production. Its e2e twin now covers canvas creation for real
  (M1).
- M8: with `render()` reduced to `return`, all 10 unit tests pass. The fake 2D
  context accepts anything and records nothing, so drawing is tested only
  end-to-end.
- `grep` shows two different things named `UI`: the typedef in `app.js` and the
  class in `ui.js`. They disagree about whether `createElement` takes a tag.
- `grep` shows no unit test file imports `viewport.js` except
  `tests/unit/helpers.js`, which uses `cellCentre` only to decide where to
  click.
- The refactoring below was prototyped in a scratch copy of `HEAD`: eslint is
  clean, and 12/12 unit tests and 4/4 e2e tests (chromium) pass. Mutating the
  prototype confirmed three things:
  - Each new unit test can fail. A no-op toggle fails both toggle tests, and
    skipping the initial draw fails the start-up test.
  - The adapter's own bugs are caught end-to-end. Swapping x and y in
    `WebUI`'s click handling fails 2 e2e tests.
  - M8 is still unit-invisible until Smell R's recording-context test is added.

**Stated intent.** After the first draft of this audit, the author gave two
reasons for `UI`:

1. It "abstracts the DOM manipulation, so we can fake it more easily in the
   tests and so have faster running tests … so we can test as close to the edge
   of the system as possible without spinning up a browser."
2. "Eventually we could make this game playable in the terminal just by
   implementing a new UI implementation (`WebUI` and `TerminalUI` classes,
   implementing the same interface), and it would be good if that interface was
   as small and simple as possible."

Both goals are sound, and this audit adopts them as the acceptance criteria for
the interface. The findings below are about whether the current boundary meets
them. It meets neither yet. Drawing, the behaviour nearest the edge, has no fast
coverage (M8). And no terminal could implement `createElement('canvas')`.

**Why it's bad:**

- **Freeman & Pryce: ports and adapters, and Only mock types you own.** GOOS
  separates the application from the outside world with _ports_, interfaces the
  application defines in its own vocabulary, and _adapters_, thin classes that
  translate between a port and a particular technology. `WebUI` and
  `TerminalUI` would be two adapters for one port. Introducing an adapter class
  is the right move. The problem is where the boundary sits. What crosses from
  `UI` into the app is a raw `HTMLCanvasElement`, and the app then calls
  `getContext`, `addEventListener`, `width`, `height` and `offsetX`/`offsetY`
  on it directly. So the browser's types are still inside the app. `MockUI`
  still has to impersonate a browser canvas and a 2D context, and it has already
  drifted from them (the size, the extra `click()`, a context that ignores every
  call). Wrapping `document.createElement` in a class you own doesn't count as
  owning the canvas it returns.
- **The terminal test.** The author's second goal gives a concrete test for
  every member of the interface: could a `TerminalUI` implement it without
  pixels, colours, the DOM or a mouse? `createElement('canvas')` fails on all
  four counts. So does every call `app.js` makes on the canvas it gets back.
  What passes is the game's own vocabulary. "The user asked to flip this cell"
  comes in, and "these cells are alive" goes out. That is two members.
- **What keeps the interface small is what stays out of it.** The grid is
  infinite, so panning and zooming only change what a UI _shows_. They never
  change game state, so they never need to cross the interface. The same goes
  for pixel geometry (`viewport.js`), the palette, drawing (`render`) and
  pixel-to-cell conversion. They are all private to `WebUI`, and a `TerminalUI`
  would have its own equivalents in character cells. The interface only grows
  when the user can ask for something new (Play/Stop, presets). It never grows
  because of _how_ something is shown. So the active `TODO.md` item,
  click-and-drag panning, happens entirely inside `WebUI` and doesn't change the
  interface.
- **Freeman & Pryce: two ways to get "close to the edge".**
  - _Move the fake outwards._ Make `MockUI` imitate more of the browser (a
    recording context, the real size, CSS versus backing-store pixels), so more
    production code runs against it. Every behaviour it imitates can drift from
    the real one. The only thing that would notice the drift is the slow
    browser suite the fake exists to avoid, and it has already drifted in three
    ways.
  - _Move the logic inwards._ Make the code that touches the DOM so thin that
    nothing in it is worth a unit test. Everything else goes into objects that
    need no browser to run:

    | Side     | Layer                 | Responsibility                                         | Tested by                                          |
    | -------- | --------------------- | ------------------------------------------------------ | -------------------------------------------------- |
    | web only | `WebUI` (the adapter) | create and mount the canvas; wire DOM events; no logic | e2e only                                           |
    | web only | `Viewport` (Smell P)  | pixel ↔ cell conversion; which cells are visible       | unit, with plain numbers and no fake at all        |
    | web only | `render` (Smell R)    | which rectangles are filled in which colour            | unit, against a recording context (see R's caveat) |
    | core     | `initApp`             | a toggle comes in → update the cells → draw            | unit, against `FakeUI`                             |
    | core     | `rules.js`, `Board`   | the game itself                                        | unit, no fakes                                     |

    Every row except the first runs without a browser, and only one fake
    imitates a browser type. This also gives the most error-prone edge logic,
    pixel ↔ cell conversion, the fastest coverage possible. Today it has almost
    none. `viewport.js` has no unit tests of its own. Its only unit coverage is
    two `MockUI` clicks: one at the canvas centre, and one at a pixel computed by
    `viewport.js`'s own `cellCentre`. The second only proves that `cellCentre`
    and `cellAtPosition` agree with each other, not that either is right.

- **Freeman & Pryce: let the interface emerge from the tests.** GOOS expects an
  interface's shape to be unclear at first and to take shape as tests demand it.
  The problem is that the DOM is currently setting the shape, not the tests: the
  unit tests pin a `'canvas'` tag that production ignores (M3). The test fake is
  also the interface's second implementation, and it is what keeps the
  interface honest long before a `TerminalUI` exists. If `FakeUI` ever needs to
  know about pixels, the interface has become too wide.
- **Freeman & Pryce: listen to the tests.** The unit suite is a copy of the
  acceptance suite with a fake browser swapped in: same three scenarios, same
  pixel arithmetic, same geometry import. That is the tests telling you there
  is no unit-sized object between "browser" and "whole app". Both test drivers
  independently grew a `clickCell(x, y)` method, which is the tests reaching for
  the interface's real vocabulary: cells, not pixels.
- **SOLID: Dependency Inversion.** High-level policy (toggle a cell, redraw)
  should depend on an abstraction the app defines. Here the abstraction is a
  slice of the DOM API, so the low-level detail dictates the interface.
  **Interface Segregation:** what `initApp` needs is "tell me which cell to
  flip" and "show these live cells". It is instead handed an element factory
  plus an entire canvas. The same principle is why `draw` should take an
  `Iterable<Cell>` rather than the `Board` (Smell B). A UI has no business
  calling `toggle`.
- **Fowler: Speculative Generality**, in both directions. `createElement(tag)`
  is a general element factory for an app that needs exactly one canvas. The
  production implementation proves it by not even declaring the parameter.
  `MockUI`'s `elements`/`findElement` add a **Lazy Element** on top: a registry
  for the one element ever created. The terminal plan must not tip into the same
  smell from the other side. Don't write `TerminalUI` now, and don't write a
  `UI` base class. JavaScript has no interfaces, so a JSDoc typedef owned by
  `app.js` _is_ the interface, and inheritance would add nothing.
- **Fowler: Alternative Classes with Different Interfaces.** `UI` and `MockUI`
  are meant to be interchangeable, but they aren't. `MockUI` has
  `findElement`, and it records the tag that `UI` ignores. The typedef and the
  class also define the interface twice, and the two definitions differ.
- **Fowler: Mysterious Name.** `createElement` borrows the DOM's name for a
  pure factory. This one also mounts the element into `document.body`, and a
  reader of `initApp` can't tell that from the call. (Setting `data-testid` in
  production isn't a smell in itself. GOOS names its Swing components for the
  test driver in the same way.)

**The refactoring:** **Change Function Declaration** (the port), **Rename
Class**, **Move Function** (drawing and click handling into the web side), and
**Inline Class** / **Remove Dead Code** (`MockUI`). Run `npm test` after each
step. The e2e suite is the only coverage `WebUI` has, which is why this comes
after the e2e helper fixes in the fix order.

1. **Add `tests/unit/viewport.test.js` first.** Test the current functions
   with plain numbers:
   - On a 300×150 canvas-like `{ width, height }`, the centre pixel
     `(150, 75)` is cell `0,0`.
   - `cellAtPosition(cellCentre(cell))` gives back `cell` for a few cells.

   Both pass today. They replace the pixel-level coverage that step 6 deletes
   along with `MockUI`, so there is never a gap. Smell P later migrates them to
   the `Viewport` API.

2. **Define the port.** Replace the `UI` typedef in `app.js` with the two
   members the app needs:

   ```js
   /**
    * What the game needs from any user interface: web, terminal, or a test fake.
    *
    * @typedef {object} UI
    * @property {(handler: (cell: Cell) => void) => void} onToggle - Registers
    *   `handler` to be called with each cell the user asks to flip.
    * @property {(liveCells: Iterable<Cell>) => void} draw - Shows the given live
    *   cells.
    */
   ```

   The member is `onToggle`, not `onCellClicked`, because a terminal user
   presses a key rather than clicking. Name members by intent, never by input
   device.

3. **Rename Class** `UI` to `WebUI`, which ends the name clash with the
   typedef. Change its constructor to take the parent element,
   `new WebUI(document.body)`, and create, tag and mount the canvas there,
   storing it on `this.canvas`. (Passing the parent in is **Context
   Independence**: the adapter is told where to live instead of reaching for
   `document.body` itself.) Keep a temporary `createElement()` that returns
   `this.canvas`, so `initApp` still works. Update `index.html`.
4. **Move Function** `render`, `renderCell` and the palette from `app.js` into a
   new `life/render.js`. On the way, change `render`'s second parameter from
   the `Set<string>` to an `Iterable<Cell>`, and move the `liveCells(cells)`
   call out to the caller. Point the e2e helper's palette import there (or
   delete it, if Smell Q is already done).
5. **Add the port's members to `WebUI`.**
   - `onToggle(handler)` adds a `click` listener that converts
     `offsetX`/`offsetY` with `cellAtPosition` and calls `handler(cell)`. This
     is **Move Function** on the body of `createClickHandler`.
   - `draw(liveCells)` calls `render(this.canvas, liveCells)`.
6. **Switch `initApp` to the port, and swap `MockUI` for `FakeUI`, in one
   commit.** The old unit tests can't survive the switch, because they drive
   pixels.
   - `initApp` becomes:

     ```js
     ui.onToggle((cell) => {
       toggleCell(cells, cell.toString());
       ui.draw(liveCells(cells));
     });
     ui.draw(liveCells(cells));
     ```

   - Delete `createClickHandler` and `WebUI.createElement`.
   - In `tests/unit/helpers.js`, replace `MockUI` with a `FakeUI` that
     implements the port:
     - `onToggle` stores the handler;
     - `draw` records `[...liveCells].map(String).sort()` in `this.drawn`;
     - `toggle(x, y)` calls the handler with `new Cell(x, y)`.

     Leave `drawn` unset until the first `draw`, so a test that the initial
     state gets drawn can fail.

   - Rewrite `tests/unit/life.test.js` as three cell-level tests:
     - "The initial cells are drawn on start";
     - "Toggling a dead cell draws it live";
     - "Toggling a cell twice draws it dead again", which asserts `['1,1']`
       after the first toggle and `[]` after the second. This is Smell N's
       unit fix.

     Delete the unit "A canvas element is created" test.

   - The unit suite no longer imports `viewport.js`, the unit copy of
     `clickCell` disappears, and the setup repetition in Smell E drops to two
     lines per test.

7. **Optional:** `git mv` the web-only modules (`ui.js` → `web-ui.js`,
   `render.js`, `viewport.js`) into `life/web/`. That makes the boundary
   visible in the file tree, and it makes "no core module imports from `web/`"
   something you can check with `grep`.

After this, `app.js` holds only the port definition, the cell-set mutation
(which Smell B replaces with `Board`) and the wiring. `TODO.md`'s "Implement a
real `UI` class" is done. Its "Extract a `CanvasWrapper` or `GameGrid` class
from `MockUI`" is superseded, and pointed the other way: the app defines the
interface, production implements it, and the test fake shrinks to fit it.

---

### Smell Q: production code exports a test oracle, and the oracle is wrong for any border width but 2

**Code unchanged from the previous audit. M5 now rejects correct rendering in 3
tests, up from 2.**

**Where:**

- `life/viewport.js:143-147`: `isBorderPixel`. Its only caller is
  `tests/e2e/helpers.js:121`, via `RenderedCell.hasBorderPixel`. That method is
  a one-line **Middle Man** with a misleading name: it asks whether a pixel _is_
  a border pixel, not whether the cell _has_ one.
- `life/viewport.js:5` and `:52-56`: `cellStep` and `cellCentre` are exported
  only for the two test helper files. `getOrigin` (`:65`) is exported and has no
  caller outside the module at all.
- `life/app.js:9-11`: the three colour constants. Their only importer is
  `tests/e2e/helpers.js:2-6`. That import loads `app.js`, the composition root,
  into the Node-side Playwright process just for three strings. It only works
  because `app.js` happens to have no top-level DOM access.

**Verified:**

- A `grep` of every export confirms the callers listed above.
- M5: with `cellBorderWidth = 4`, rendering stays self-consistent (a 2 px body
  inset and a 24 px step), yet three of four e2e tests fail.
- Comparing `isBorderPixel` against the rectangle actually painted by
  `cellBodyPosition` gives agreement at width 2. At width 4 it misclassifies
  offsets 1 and 23. Its expression,
  `e === 0 || e === cellSize + cellBorderWidth / 2`, looks as if it's derived
  from the constants, but it hard-codes a 1 px border on each side.

**Why it's bad:**

- **Fowler: Duplicated Code.** `isBorderPixel` works out where a cell's body
  starts independently of `cellBodyPosition` (`viewport.js:113`). Two
  definitions of one fact drift apart, and these two already have.
- **Fowler: Insider Trading**, where modules trade in each other's internals.
  The tests import `cellStep`, `cellCentre`, `isBorderPixel` and the palette,
  so `viewport.js` and `app.js` carry exports whose only purpose is to serve
  tests. **SOLID: Single Responsibility:** `viewport.js` now has to change when
  the e2e helper's needs change.
- **Freeman & Pryce: test for information, not representation.** If the
  expected value is computed by the code under test, a bug in that code moves
  the expectation along with it. This case is worse, because the borrowed code
  is really _test_ logic that lives in production. It looks authoritative, and
  nothing tests it except the tests that rely on it.
- **Freeman & Pryce: Context Independence.** An acceptance-test helper that has
  to import the app's composition root is coupled to how the app is wired, not
  to what the app shows.

**The refactoring:**

1. **Move Function** `isBorderPixel` into `tests/e2e/helpers.js` as a
   `RenderedCell` method, then **Inline Function** the Middle Man
   `hasBorderPixel` at its one call site.
2. While moving it, make it correct. State the visual spec as test-owned named
   constants, for example `CELL_BODY = 20`, `BORDER_EACH_SIDE = 1` and
   `CELL_PITCH = CELL_BODY + 2 * BORDER_EACH_SIDE`, with the border check
   `i < BORDER_EACH_SIDE || i >= BORDER_EACH_SIDE + CELL_BODY`. A change to
   the border width then fails the tests as a visible _spec_ change that you
   have to acknowledge, instead of silently moving the oracle with it. Use
   `CELL_PITCH` in place of `cellStep` in `pixelData` and `cellImgData`.
3. Replace the palette import with test-owned named constants
   (`const LIVE = '#ff0000'` and so on). Remove `export` from the three colours
   in `app.js`, and from `getOrigin` in `viewport.js`.
4. Leave `cellCentre` and `cellPosition` in use. Test helpers may use
   production geometry to _locate_ cells (where to click, where to read
   pixels). The point of this fix is that what counts as _correct_ (colours,
   border extent) belongs to the tests. Those two exports get reshaped once, in
   Smell P.

---

### Smell C: the birth rule's "exactly three" is untested, and `next()` fuses two phases in one loop

**Code unchanged from the previous audit.**

**Where:** `life/rules.js:30-32` (`newCells`, `=== 3`), `:41-67` (`next`) and
`:57` (`> 1 && < 4`); `tests/unit/rules.test.js:5-64`.

**Verified:**

- M4: changing `=== 3` to `>= 3` passes all 10 unit tests. No fixture contains
  a dead cell with four or more live neighbours. In the overpopulation fixture,
  no dead cell has more than three.
- A new test, "A dead cell with four live neighbours stays dead" (live cells on
  the four diagonals of `0,0`), passes on the current code and fails under M4.
- `rules.js` is imported only by its own test. It isn't wired into the app yet,
  so the gap has no user-visible effect today. It will once Play/Stop lands.

**Why it's bad:**

- **Freeman & Pryce: tests as specification.** The README says "exactly three",
  but the tests only specify "at least three". That upper boundary lives in
  `newCells`, which is the very function a Split Loop would move. Fowler's
  precondition for refactoring is tests that cover the code being moved, so
  today that refactoring would be done blind.
- **Fowler: Split Loop.** One loop computes two different things: each live
  cell's live-neighbour count (for survival), and a running tally of dead
  neighbours (for births). To follow any one line, the reader has to hold both
  in mind. Fowler treats combining loops as an optimisation to make on
  evidence, not as the default.
- **Fowler: Mysterious Name.** `counter` counts only _dead_ neighbours (live
  ones are skipped at `:50-51`), and its name doesn't say so. It is a plain
  object used as a multiset, with a hand-rolled increment
  (`key in counter ? counter[key] + 1 : 1`). A `Map` is the idiomatic tool.
- The rule's thresholds are two differently styled literals in two functions
  (`> 1 && < 4` and `=== 3`), so "B3/S23" can't be read off anywhere in the
  code.

**The refactoring:**

1. Add the four-neighbour test and commit it on its own.
2. **Split Loop.** Duplicate the loop in `next`. Keep only the survival
   counting in one copy and only the dead-neighbour tally in the other. Test.
3. **Extract Function** on each copy to make `survivors(board)` and
   `births(board)`. `next` becomes their union. Test.
4. Rename `counter` to `deadNeighbourCounts` and make it a `Map`. Use
   **Replace Loop with Pipeline** where it reads better. Test.
5. **Extract Variable** for the rule itself: `SURVIVES_WITH = new Set([2, 3])`
   and `BORN_WITH = new Set([3])`. Use `.has(n)` in both functions, so the rule
   reads as B3/S23 in one place.

Do steps 2–5 after Smell B, so the new functions are written against the
`Board` API instead of strings. Step 1 has no dependencies, so it goes early.

---

### Smell P: `viewport.js` is six functions sharing a `canvas` argument, with one coordinate transform written three times, and the copies disagree

**Code unchanged from the previous audit. The split cell-body rectangle is newly
noted.**

**Where:** `life/viewport.js:13-134` and `life/app.js:21-25`.

- `visibleCells`, `cellCentre`, `getOrigin`, `cellPosition`, `cellBodyPosition`
  and `cellAtPosition` all take `canvas` as their first argument, and they read
  only `width` and `height` from it.
- The grid↔pixel transform (origin, pitch, Y-axis flip) is worked out
  independently three times:
  - in `cellPosition` (cell→pixel, `:87-93`);
  - in `cellAtPosition` (pixel→cell, `:127-134`);
  - in `visibleCells` (pixel bounds→cell bounds, `:13-32`). Its four bounds mix
    `floor` and `ceil`.
- The rectangle for "a cell's body" is split across two modules.
  `renderCell` (`app.js:21-25`) takes its corner from `cellBodyPosition` and
  its size from the separately exported `cellSize` constant.

**Verified:**

- `visibleCells` on a 300×150 canvas returns 120 cells: x from −7 to 7, y from
  −4 to 3. The 15 cells in row y = −4 have their top edge at pixel y = 152,
  which is entirely below the canvas.
- `cellAtPosition` on the four corner pixels gives y from −3 to 3. So the two
  derivations disagree by one row.
- The overdraw is harmless today, because `fillRect` clips anything drawn off
  the canvas. It is still a measurable divergence between the copies.
- Callers pass three different kinds of object as `canvas`: a real
  `HTMLCanvasElement`, `MockUI`'s element, and a `RenderedCanvas`
  (`tests/e2e/helpers.js:216` and `:233`, which pass `this`). The JSDoc types
  all of them as `{object}`.

**Why it's bad:**

- **Fowler: Combine Functions into Class.** This is the textbook trigger: "a
  group of functions that operate closely together on a common body of data".
  Here the data is the canvas dimensions plus the origin derived from them,
  which is recomputed on every call.
- **Fowler: Duplicated Code**, and the **Shotgun Surgery** it sets up. Panning
  (the active TODO item) changes the origin. Today that means updating three
  hand-maintained derivations in step with each other, and they already
  disagree by a row. After Smell O, panning happens entirely inside `WebUI`,
  and this is the code it changes.
- **Fowler: Feature Envy.** `renderCell` combines two viewport facts (the body
  position and `cellSize`) to rebuild a rectangle that the viewport should hand
  over whole.
- **SOLID: Open/Closed.** If the origin were one field of a `Viewport`, panning
  would mean adding an offset to that field. Today it means modifying every
  function.
- **Freeman & Pryce: Context Independence.** The functions need a width and a
  height but ask for a canvas. Tests satisfy that by passing unrelated objects
  that happen to have `width`/`height`, so the parameter name misdescribes the
  dependency. Units are mixed up in a related way. `cellAtPosition` compares
  `offsetX` (CSS pixels) with `canvas.width` (backing-store pixels), and the
  e2e helper takes its dimensions from `boundingBox()` (CSS pixels). These only
  agree because the canvas isn't scaled by CSS. A class is the natural place to
  state which unit it works in.

**The refactoring:**

1. **Combine Functions into Class.**
   - Create `export class Viewport { constructor(width, height) }` and compute
     the origin once, in the constructor.
   - Move each function in as a method without the `canvas` parameter:
     `positionOf(cell)`, `bodyRectOf(cell)`, `centreOf(cell)`, `cellAt(point)`
     and `visibleCells()`. `bodyRectOf` returns `{ x, y, width, height }` and
     replaces `cellBodyPosition`. `renderCell` then passes that rectangle
     straight to `fillRect`, and `cellSize` stops being exported.
   - Keep the old exports as one-line forwarders that build a `Viewport` from
     `canvas.width`/`canvas.height` and call the matching method. Test.
   - Migrate callers one file at a time, testing after each. After Smell O,
     the callers are all web-side or test files: `ui.js`, `render.js`,
     `tests/unit/viewport.test.js` (added in O's step 1) and
     `tests/e2e/helpers.js`. Then delete the forwarders.
   - `WebUI` builds the `Viewport` from its canvas's size and keeps it.
     Panning later becomes a change to that one object.
   - Do Smell R's **Change Function Declaration** in this same sitting:
     `render(canvas, liveCells)` becomes `render(ctx, viewport, liveCells)`.
     P replaces `canvas` with `viewport` in that signature anyway, so doing
     both together changes it once. Add R's recording-context test here too.
2. **Substitute Algorithm** on `visibleCells()`. Derive its bounds by applying
   `this.cellAt` to the top-left and bottom-right pixels, then iterate between
   them. That leaves one transform with one rounding rule. Give this its own
   commit. It changes which off-canvas cells get drawn. You can't see that in
   the pixels, but it isn't strictly a pure refactoring. In the same commit,
   add a test that `visibleCells()` covers exactly the cells `cellAt` finds at
   the four corners. That test fails on today's code, because of the extra row.
3. Fold in Smell J (points instead of arrays) and Smell I (the garbled
   comments) during the move, since every line they touch is moving anyway.

---

### Smell B: live cells are represented as raw strings everywhere

(Primitive Obsession / No String Types.) **Code unchanged from the previous
audit.**

**Where:**

- `life/rules.js`: `Set<string>` in and out, with
  `[...cells].map(Cell.fromString)` at `:45` and `.toString()` at `:49` and
  `:58`.
- `life/app.js`: `liveCells` (`:56-58`, the same
  `[...cells].map(Cell.fromString)`), `toggleCell` (`:68-74`), and
  `.toString()` in the click handler (`:88`). Three
  `// SMELL: primitive obsession` comments sit at `:49`, `:60` and `:76`.
- `life/index.html:18`.
- Every fixture in `tests/unit/rules.test.js`, and the raw-`Set` assertions at
  `tests/unit/life.test.js:27` and `:39`. (Smell O's rewrite replaces those two
  assertions.)

**Verified:** `grep` finds `[...cells].map(Cell.fromString)` word for word at
`app.js:57` and `rules.js:45`. It also shows that nothing imports `rules.js`
except its test.

**Why it's bad:**

- **Freeman & Pryce: No String Types.** A raw string standing in for a domain
  concept gives you nowhere to attach behaviour, and it forces every consumer to
  know the `"x,y"` encoding. A `Cell` class already exists, yet the string is
  still the public contract for "a live cell".
- **Fowler: Primitive Obsession**, with **Duplicated Code** as its symptom: the
  string↔`Cell` conversion appears word for word in two modules.
- **Root cause.** `Cell` has no value equality, so a `Set<Cell>` would compare
  cells by reference and couldn't track live cells. The string encoding is a
  workaround for a missing capability, not a design choice.
- **Freeman & Pryce: Tell, Don't Ask.** `toggleCell` asks the set `has(cell)`
  and then mutates it from outside. The collection should make that decision
  itself, via `board.toggle(cell)`.
- **Freeman & Pryce: test for information, not representation.** The app unit
  tests observe behaviour by keeping a reference to the mutable `Set` passed
  into `initApp` and comparing it with `new Set(['0,0'])`. That couples them to
  the representation _and_ to the fact that `initApp` mutates its argument.
  Smell O fixes this half first: its `FakeUI` tests observe what gets _drawn_,
  so they don't care how the cells are stored.
- **Fowler: Comments.** The three `// SMELL:` comments are the right diagnosis
  in the wrong medium. They name the problem without removing it, and someone
  has to remember to delete them when it's fixed.
- **Timing.** `rules.js` isn't wired to the app yet, so this is the cheapest
  moment to design one collection type for its consumers. `next()` needs `has`
  and iteration. `initApp` needs `toggle`. The UI needs only iteration, because
  Smell O's `draw` takes an `Iterable<Cell>`, and a `Board` is one.

**The refactoring:**

1. **Extract Class** `Board` in a new `life/board.js`, using **Encapsulate
   Collection**:
   - Hold a private `#keys = new Set()` of strings.
   - Give it the API `has(cell)`, `add(cell)`, `toggle(cell)`,
     `[Symbol.iterator]` (yielding `Cell`s), `equals(other)` and
     `static of(...cells)`.
   - The string encoding then lives only inside `Board`.
   - Don't put it in `cell.js`, as `TODO.md` suggests ("Move everything to do
     with updating `cells` to `cell.js`"). `Cell` is a single coordinate, and
     adding collection behaviour to that file creates a new Divergent Change.
2. Migrate `app.js`. **Inline Function** `toggleCell` as `board.toggle(cell)`,
   and pass the `Cell` from the `onToggle` handler without `.toString()`.
   Delete `liveCells` and pass the board straight to `ui.draw`, since a `Board`
   is an `Iterable<Cell>`. `index.html` creates `new Board()`.
3. Migrate `rules.js`: `next(board)` returns a `Board` and calls
   `board.has(neighbour)`.
4. Migrate the tests to build fixtures with `Board.of(new Cell(0, 0), ...)`. A
   tiny helper like `board('0,0', '1,1')` is fine if it reads better, since
   GOOS tolerates some duplication in tests for the sake of clarity. **Trap,
   verified in the previous audit:** chai's `deep.equal` can't see private (`#`)
   fields, so two `Board`s with _different_ contents compare equal. The Blinker
   test's `expect(next(next(cells))).to.deep.equal(cells)` would pass
   vacuously. Assert with `board.equals(other)`, or compare
   `[...board].map(String).sort()`. The app tests are safe, because `FakeUI`
   already records sorted strings. Only their fixtures change, e.g.
   `initApp(ui, Board.of(new Cell(2, 3)))`.
5. Delete the three `// SMELL:` comments in the same commit.

Alternative considered and rejected: make `Cell` a value by interning it
(`Cell.of(x, y)` returns cached instances), so that `Set<Cell>` works by
identity. The cache grows without bound as patterns evolve, and the toggle logic
would still live outside the collection.

---

### Smell R: `app.js` changes for four unrelated reasons

**Code unchanged from the previous audit.**

**Where:** `life/app.js` holds four concerns:

- the palette (`:9-11`);
- drawing (`renderCell` and `render`, `:21-47`);
- cell-set mutation (`liveCells` and `toggleCell`, `:56-74`);
- event wiring and composition (`createClickHandler` and `initApp`, `:86-115`).

**Verified:**

- M8 shows `render()` has no unit-level coverage. The reason is `:35`: `render`
  fetches its own drawing context from the canvas, so the only way to observe
  drawing is a real browser. `TODO.md` already lists "Move everything to do
  with rendering (mostly in `app.js`) to `render.js`" as the current item.
- In the Smell O prototype, a two-test `render` suite with a recording context
  passes. It fails when `render` is a no-op (M8), and it fails when dead cells
  are painted the border colour (M2's break, caught without a browser).

**Why it's bad:**

- **Fowler: Divergent Change**, where one module gets changed in different ways
  for different reasons. A new colour, a new drawing style, a new mutation
  (drag to paint) and a new input (panning) would all land in this one file.
- **SOLID: Single Responsibility.** That makes four reasons to change. Judged
  by the terminal test in Smell O, three of the four (palette, drawing, click
  handling) are web-only. They belong behind the interface in `WebUI`, not in
  the core that a `TerminalUI` would share.
- **Freeman & Pryce: hard to test means hard to use.** Because `render` fetches
  its own context, you can't hand it a small recording fake. Passing the
  context in would let a unit test check "live cells are filled in the live
  colour" without a browser.
- **Caveat: this fix makes a deliberate exception to "Only mock types you
  own".** A recording `ctx` is a fake of a browser type, which is exactly what
  Smell O criticises in `MockUI`. It is accepted here for three reasons:
  `render` uses only two members of the context (`fillStyle` and `fillRect`),
  their behaviour is simple and stable, and the e2e suite checks the real
  pixels. The exception has a limit. If `render` starts needing more of the
  context (transforms for zoom, `save`/`restore`, text), put a small interface
  you own in front of it instead. For example, a `Surface` with
  `fillRect(rect, colour)`, implemented by the adapter over the real context
  and faked in tests.

**The refactoring:** most of it now happens inside other smells' fixes, so
this section only has to track it.

1. **Palette and drawing:** **Move Function** into `life/render.js`, on the web
   side. This is Smell O's step 4.
2. **Click handling:** **Move Function** into `WebUI.onToggle`. This is Smell
   O's step 5.
3. **Cell-set mutation:** removed by Smell B. `toggleCell` becomes
   `board.toggle`, and `liveCells` disappears.
4. **What's left for R itself:**
   - **Change Function Declaration** `render(canvas, liveCells)` to
     `render(ctx, viewport, liveCells)`. This is **Replace Query with
     Parameter** for `ctx`, so `render` stops calling `canvas.getContext`
     itself. Do it during Smell P, which replaces `canvas` with `viewport` in
     the same signature.
   - Add `tests/unit/render.test.js` against a recording context, which pushes
     `{ color: this.fillStyle, x, y, w, h }` on each `fillRect`. Assert that a
     live cell's body is last filled in the live colour, and a dead visible
     cell's in the dead colour.

Keep `render.js` a separate module rather than folding it into `WebUI`. That way
the adapter stays thin, and `render` stays unit-testable within the limit of the
caveat above. After O and B, `app.js` holds only the `UI` typedef and
`initApp`'s wiring.

---

### Smell J: pixel coordinates travel in three different shapes

(Data Clumps.) **Code unchanged from the previous audit.**

**Where:**

- As a bare `[x, y]` array: returned by `getOrigin` (`viewport.js:65-70`),
  `cellCentre` (`:52-56`), `cellPosition` (`:87-93`) and `cellBodyPosition`
  (`:104-114`). These are destructured at `app.js:23`,
  `tests/unit/helpers.js:32`, and `tests/e2e/helpers.js:216` and `:233`.
- As two scalars: `cellAtPosition(canvas, offsetX, offsetY)`.
- As `{ x, y }`: `isBorderPixel(pixel)`, the e2e `Pixel` class, and both
  `click({ x, y })` helpers.

**Why it's bad:**

- **Fowler: Data Clumps.** Data items that travel together from function to
  function want to become an object. Here, one pair is spelled three different
  ways within a single module and its tests.
- **Fowler: Primitive Obsession**, and **Freeman & Pryce: No String Types**
  applied to positional arrays. Nothing distinguishes a bare `[y, x]` from
  `[x, y]`. The grid-coordinate pair, meanwhile, already has a proper class
  (`Cell`) that is used consistently.

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

**Code unchanged from the previous audit.**

**Where:**

- `tests/e2e/helpers.js:230-240`: `RenderedCanvas.cell()` constructs
  `RenderedCell(x, y)`, then assigns `posX`, `posY` and `imgData` onto it.
  `posX`/`posY` are read only by `RenderedCanvas.cellImgData` (`:257`). They
  exist purely to carry arguments from one `RenderedCanvas` method to another
  by way of the cell.
- The same pattern at `:89-93`: `Pixel` is constructed, then `pixel.data` is
  assigned. The `data;` field declaration (`:37`) is left `undefined` by the
  constructor.
- `cell()`'s JSDoc says `@returns {RenderedCell}` (`:228`), but the method is
  `async` and returns a `Promise`.
- `fromPage` (`:190`) `await`s `page.getByTestId(...)`, which returns a
  `Locator` synchronously, so the `await` does nothing.

**Verified:** a `grep` for `posX` and `imgData` finds only these sites.

**Why it's bad:**

- **Fowler: Temporary Field**, a field that only means something in one narrow
  circumstance. `posX`/`posY` are exactly that.
- **Fowler: Feature Envy.** `RenderedCanvas.cell()` and `cellImgData(cell)` use
  `RenderedCell`'s fields more than `RenderedCell` itself does.
- Reading `RenderedCell`'s constructor doesn't show the class's real shape.
  Every method depends on `imgData`, yet `imgData` appears nowhere in the class
  definition.
- **Fowler: Comments.** A wrong `@returns` type and a no-op `await` both tell
  the reader something untrue about when values become available.

**The refactoring:**

1. **Change Function Declaration** from `cellImgData(cell)` to
   `imgDataAt(point)`, so it stops reading fields off the cell. Test.
2. Delete the `posX`/`posY` assignments, which are now dead (**Remove Dead
   Code**).
3. Change the `RenderedCell` constructor to `(x, y, imgData)`. `cell()` then
   locates the cell, fetches the data, and returns
   `new RenderedCell(x, y, imgData)`. `RenderedCanvas` already owns the
   locator, so it already acts as the factory.
4. Do the same for `Pixel`: `new Pixel(x, y, data)`. Delete the `data;` field
   declaration.
5. Fix `@returns` to `Promise<RenderedCell>`, and drop the `await` in
   `fromPage`.

---

### Smell M: the JSDoc lint rule checks types, not parameter names, and turning on the right rule fails today

**Unchanged from the previous audit.**

**Where:** `eslint.config.js:12-14`, where only `jsdoc/check-types` is enabled,
and `tests/e2e/helpers.js:196-206`, where a docstring has drifted from its
function.

**Verified:**

- `npx eslint --rule '{"jsdoc/check-param-names":"error"}'` still reports one
  error: `@param "y" does not match an existing function parameter` at
  `tests/e2e/helpers.js:201`. `click({ x, y })` documents two positional
  parameters but takes one destructured object.
- The previous audit also checked that extending `flat/recommended` produces 97
  warnings, 0 errors and exit code 0. The config is unchanged, so that still
  applies.

**Why it's bad:**

- Strictly, this is a gap in the process rather than a Fowler or GOOS catalogue
  smell.
- **Fowler: Comments.** Documentation that has drifted from the code is worse
  than none, because readers believe it.
- **Freeman & Pryce: keep the feedback loops tight.** A check that doesn't run
  can't give feedback. Smells O, P, J, D, B, R and C all change signatures, so without this rule their docstrings have to be
  re-audited by hand afterwards.

**The fix** (configuration, not a refactoring):

1. Rewrite `click`'s docstring in the destructured form: `@param {object}
position`, `@param {number} position.x`, `@param {number} position.y`.
2. Add `'jsdoc/check-param-names': 'error'` next to `check-types`.
3. Don't extend `flat/recommended` unless you also make warnings fail the build
   (`eslint --max-warnings 0`) and clear the warnings first. They are mostly
   `require-param-description` and `tag-lines`, which is noise for a codebase
   this size.

---

### Smell L: an apology comment in place of two variable names

**Unchanged from the previous audit.**

**Where:** `tests/e2e/helpers.js:102-112`:

```js
// ... I can't understand this calculation any
// more but it finds the [r, g, b, a] slice of the pixel we want to
// target.
// TODO: Work out what's going on here
const index = (pixel.x + pixel.y * cellStep) * pixelDataSize;
```

**Verified:** M6 (swapping x and y) still survives. Every other plausible wrong
index fails, because `cellIsColor` checks every pixel against a ring-shaped
expected pattern.

**Why it's bad:**

- **Fowler: Comments.** "I can't understand this any more" is a comment
  standing in for names. The arithmetic is ordinary row-major indexing. The
  fetched image is `cellStep` pixels wide, so the pixel at column `x`, row `y`
  is entry `y * width + x`, and each entry takes 4 bytes (RGBA). When a comment
  explains _what_ code does, Fowler's remedy is to move that explanation into
  names.
- **Freeman & Pryce: tests as specification.** The e2e fixture is a
  square-symmetric cell, so the suite can't tell x from y (M6). That is fine
  today. But any future test of an asymmetric shape (a glider from the
  "presets" TODO, say) would depend on this orientation, which is currently
  unproven.

**The refactoring:** **Extract Variable**:

```js
const imageWidth = CELL_PITCH; // after Smell Q; cellStep today
const bytesPerPixel = 4; // RGBA
const offset = (pixel.y * imageWidth + pixel.x) * bytesPerPixel; // row-major
```

Delete the apology and the `TODO`. A dedicated unit test for a test helper's
one-line index calculation isn't proportionate to the risk.

---

### Smell I: garbled comments in `viewport.js`

**Unchanged from the previous audit.**

**Where:**

- `life/viewport.js:107-112`: a stray backtick opens every line of the
  `cellBodyPosition` comment.
- Typos in the `visibleCells` comments: "does is take" (`:21`), "analagous"
  (`:25`) and "shown in by" (`:30`).

**Why it's bad:** **Fowler: Comments.** A comment that is hard to parse fails
at its one job. It makes the reader correct errors instead of reading the
explanation.

**The fix:** rewrite them as plain prose during Smell P. Both comments describe
code that P moves into `Viewport`, and the `visibleCells` bounds comment
disappears entirely when P's Substitute Algorithm replaces that arithmetic.
Rewriting them first would mean editing text that is about to move or be
deleted. If P is deferred, just rewrite them now.

---

### Smell E: repeated setup in both test suites (minor)

**Broadened from the previous audit, which covered the unit suite only.**

**Where:**

- `tests/unit/life.test.js`: every test starts with
  `const cells = new Set(); const ui = new MockUI(); initApp(ui, cells);`, and
  two of the three follow it with `ui.findElement('canvas')`.
- `tests/e2e/life.test.js`: three of the four tests start with
  `await page.goto('/'); const canvas = await RenderedCanvas.fromPage(page);`.

**Why it's bad:**

- **Freeman & Pryce: streamline test code**, and **Fowler: Duplicated Code**
  (the Rule of Three). Both point at extracting this setup, so each test body
  holds only the lines that describe its scenario.
- The case is weak, though. GOOS also warns against putting production-grade
  DRY pressure on tests, and two or three repeated lines per test is not much.
- Most of the unit setup exists _because of_ Smell O. `findElement` is only
  needed because the test can't otherwise reach the canvas it handed to the
  app.

**The fix:**

- Unit: nothing to do separately. Smell O's step 6 rewrites these tests
  against `FakeUI`, which leaves two lines of setup per test
  (`const ui = new FakeUI(); initApp(ui, ...)`). That is below the Rule of
  Three's threshold, and extracting it would hide each test's initial cells.
- e2e: during the `tests/e2e/helpers.js` sitting (fix order, step 3), export a
  Playwright fixture, `test.extend({ canvas: async ({ page }, use) => { ... } })`,
  that navigates and builds the `RenderedCanvas`. Tests then take `{ canvas }`
  as a parameter.
- Neither is worth a separate pass.

---

## Suggested order of work

1. **Smell M: enable `jsdoc/check-param-names` and fix the one docstring.**
   This is a one-line config change plus a three-line comment edit, and nothing
   depends on it. Doing it first means every signature change in steps 4–7 (O,
   P, J, D, B, R and C all change signatures) is checked as it's made, instead
   of the docs being re-audited at the end.

2. **Smell C step 1: the four-neighbour birth test.** It is verified to kill M4
   and it passes today. It is a test-only change with nothing depending on it,
   and it has to exist before step 7 moves the code it protects. (Smell N's
   unit fix used to sit here too. It now rides along with step 4, which
   rewrites that test anyway.)

3. **One sitting in `tests/e2e/helpers.js`: Smell N's custom matchers, then
   Smells Q, D and L, then E's e2e fixture.**
   - _Why before step 4:_ step 4 moves all drawing and click handling behind
     `WebUI`, and the e2e suite is the only coverage `WebUI` has. So that suite
     needs clear failure messages (N) and a correct border oracle (Q) before
     the move, not after.
   - _Why the matchers first:_ Q then rewrites the border check inside
     `firstMismatch`, not inside `cellIsColor`, which is about to be deleted.
   - _Why Q before steps 4 and 5:_ Q removes the palette exports from `app.js`,
     so step 4 moves the colours into `render.js` as private constants and they
     are never exported again. Q also deletes `isBorderPixel`, so step 5 never
     has to turn it into a `Viewport` method.
   - _Why D and L now:_ they touch `cellPosition` and `cellStep` on about two
     lines, which step 5 updates whatever the order, so they cost nothing extra
     here.

4. **Smell O: the `UI` interface, `WebUI`, `render.js` and `FakeUI`.** This
   includes N's unit fix and E's unit part, and it completes R's moves. It
   comes this early because it has the widest fan-out of anything left. It
   decides where rendering and geometry live, and what every app unit test
   looks like. Doing it before the remaining steps makes each of them cheaper:
   - R's move of rendering out of `app.js` is done as part of it, rather than
     as a separate step to a module that would then need moving again.
   - P's callers shrink to web-side files and `viewport.test.js`. There is no
     `MockUI` left for P to migrate.
   - B's app-test migration shrinks to changing fixtures, because `FakeUI`
     tests already observe what's drawn rather than the raw `Set`.

   The previous audit deferred this step so it wouldn't be built around code
   that was about to be reshaped. That worry no longer applies. The interface's
   two signatures mention only `Cell`, which is stable, so `Viewport` and
   `Board` can change on either side of it without touching it.

5. **Smells P + J + I, plus R's signature change and render test: `Viewport`,
   points, `bodyRectOf`, and a single transform.** `viewport.js` and
   `render.js` are rewritten in one sitting. `bodyRectOf` feeds `renderCell`,
   and `canvas` becomes `viewport` in `render`'s signature at the same moment
   `ctx` is added. J and I only touch lines P is already moving. P and B could
   go in either order. P goes first because it is smaller and lower-risk: if
   work stops partway, the codebase is still better off. **Pan work can start
   after this step.** It happens entirely inside `WebUI` and `Viewport`, and it
   doesn't change the interface.

6. **Smell B: `Board`.** It touches `app.js`, `rules.js`, `index.html` and the
   unit tests. After step 4, `app.js` holds only `liveCells`, `toggleCell` and
   the wiring, so B deletes two functions and edits three lines there. It must
   come before C's restructuring, so that `survivors`/`births` are written
   once, against `Board`. Watch for the chai `deep.equal` trap in the Blinker
   test. The app tests are safe from it, because `FakeUI` records strings.

7. **Smell C steps 2–5: split `next()` into `survivors` and `births`.** This
   depends on B (it uses the `Board` API) and on step 2's test (which protects
   the code being moved). It is the only remaining work in `rules.js`, so that
   file is opened once.

**Why this order minimises rework:**

- Tests come before structure (steps 1–3). The e2e suite in particular is made
  trustworthy before step 4 moves everything it covers.
- Every step that _deletes_ code runs before the step that would otherwise have
  to _move_ or _migrate_ it:
  - step 3 removes the test-only exports before step 4 moves the palette and
    step 5 reshapes `viewport.js`;
  - step 4 removes `MockUI` before step 5 would have had to migrate it;
  - step 6 removes `liveCells`/`toggleCell` after step 4 has already moved
    everything around them out of `app.js`.
- The widest-reaching decision (where the boundary between the core and the
  web UI sits) is made once, early. Every later step is then a change on one
  side of it.
- Each file gets one sitting: `tests/e2e/helpers.js` in step 3, `app.js` and
  the unit app tests in step 4 (plus B's small edits in step 6), `viewport.js`
  and `render.js` in step 5, and `rules.js` in steps 2 and 7 (test file, then
  source).
- No `TerminalUI` and no `UI` base class appear anywhere in the order. The
  terminal goal shapes the interface. It doesn't add code until a terminal
  version is actually being built.
