# Smell audit: `life`

**Scope:** all production code in `life/` (`app.js`, `cell.js`, `rules.js`, `ui.js`,
`viewport.js`, `index.html`) and all test code in `tests/unit/` (`helpers.js`, `life.test.js`,
`rules.test.js`, `viewport.test.js`) and `tests/e2e/` (`helpers.js`, `life.test.js`). Tooling
config (`eslint`, `prettier`, `playwright`, git hooks), `README.md` and `TODO.md` were out of
scope. `package.json` was read only for Smell 12.

**Method:** every file in scope was read in full. A first pass used the `growing-oos` skill
(Freeman & Pryce: test-driven design feedback, test-double quality, Tell Don't Ask, Context
Independence, No String Types). A second pass used the `refactoring` skill (Fowler's smell
catalogue) to corroborate and extend. Claims were then checked mechanically:

- Both suites were run: 18 unit tests and 12 e2e tests (4 tests × 3 browsers), all passing, and
  `eslint` was clean.
- Symbol usages were grepped across `life/` and `tests/`.
- Seven mutation experiments were run in a throwaway git worktree, so the working tree was never
  touched. Each experiment made one deliberate change, then re-ran the relevant suite:
  - **M1:** stop painting live cells in `app.js`. **Unit suite:** still passes, 18/18.
  - **M2:** remove the CSS conversion from the unit `clickCell` helper. **Unit suite:** 1 test
    fails, as it should.
  - **M3:** change `livingCellColor` to `#00ff00`. **E2e suite (Chromium):** still passes, 4/4.
  - **M4:** give the canvas a CSS size of 600×300 in `index.html`. **E2e suite (Chromium):**
    3 of 4 tests fail, including one that never clicks.
  - **M5:** change `livingCellColor` to a near-white (`#fefefe`). **Unit suite:** still passes,
    18/18.
  - **M6:** make the exported free function `visibleCells(canvas)` return garbage.
    **Unit suite:** still passes, 18/18. Nothing imports it, so no suite can notice.
  - **M7:** remove the `render` call after a click is handled. **Unit suite:** still passes,
    18/18. **E2e suite (Chromium):** 2 of 4 fail.

---

## Background: the principles referenced

- **Fowler**: Martin Fowler, _Refactoring: Improving the Design of Existing Code_ (2nd ed.,
  2018). A catalogue of "code smells" (surface symptoms of a design problem), each paired with
  named, mechanical "refactorings" that remove the smell without changing observable behaviour.
  The discipline is small steps, with the tests run after every one. That only works if the
  tests would actually catch a mistake.

- **Freeman & Pryce**: Steve Freeman & Nat Pryce, _Growing Object-Oriented Software, Guided by
  Tests_ (2012, "GOOS"). Central claim: tests are a design tool. When a test is hard to write,
  needs a pile of setup, or has to know about the code's internals, that's feedback about the
  production design. Key ideas used below:
  - **Tell, Don't Ask**: tell an object what to do instead of pulling its state out and
    deciding for it.
  - **Context Independence**: an object should depend only on what it needs, and receive it
    explicitly.
  - **No String Types**: domain concepts deserve their own types, not raw strings or numbers.
  - **Only mock types you own**: fake your own interfaces (ports), not third-party/platform
    APIs whose real behaviour you don't control.
  - **Test for information, not representation**: assert on what a value means, not how it
    happens to be encoded.
  - **Listen to the tests**: if a test has to do something awkward to get an object into a
    usable state, the object's design is the thing to fix.

- **SOLID**: five object-oriented design principles (Robert C. Martin). Only these come up
  below:
  - **Single Responsibility Principle (SRP)**: a module should have one reason to change.
  - **Dependency Inversion Principle (DIP)**: high-level policy should depend on abstractions
    it defines, not on concrete low-level details. Low-level details implement those
    abstractions.
  - **Interface Segregation Principle (ISP)**: clients shouldn't depend on more of an interface
    than they use.

---

## The smells

### Smell 1: `viewport.js` keeps a dead copy of `visibleCells` and two spellings of `cellStep`

**Where:**

- `life/viewport.js:159-183`: an exported free function `visibleCells(canvas)`. Its body is a
  line-for-line copy of the `Viewport.visibleCells()` method (137-156), with `canvas.width`
  in place of `this.width` and a fresh `new Viewport(canvas.width, canvas.height)` to get the
  origin.
- `life/viewport.js:20-22`: an instance getter `get cellStep()` that only returns the static
  `Viewport.cellStep`. Four methods read the constant through the getter (`origin` 32-33,
  `cellAtPosition` 65-66, `cellPosition` 87-88, `cellCentre` 126-127), while three others read
  the static directly (`isBorderPixel` 48, `cellBodyPosition` 111-112, `visibleCells` 140-145).
  All callers outside the class use the static.

**Verified:** grepped for `visibleCells` across `life/` and `tests/`. The free function has no
importer: `app.js:36-39` and every test in `tests/unit/viewport.test.js` call the method.
Mutation M6 (make the free function return garbage) leaves all 18 unit tests passing, and since
nothing imports it the e2e suite can't reach it either. Grepped `cellStep`: the instance getter's
only readers are the four methods listed above.

**Why it's bad:**

- **Fowler: Dead Code.** An exported function invites someone to call it. Because it's
  untested (M6), a caller would get a copy of the algorithm that nothing checks, and that will
  drift from the method the first time the method is fixed or changed.
- **Fowler: Duplicated Code.** Two copies of a non-trivial range calculation (the off-by-one
  `- 1`/`+ 1` corrections in 141 and 144 are exactly the kind of detail that gets fixed in one
  copy only).
- **Fowler: Lazy Element / Middle Man.** The getter adds a name and a hop without adding
  meaning, and it creates two ways of spelling the same constant inside one class. A reader
  must check whether `this.cellStep` and `Viewport.cellStep` can ever differ (they can't),
  which is wasted effort.

**The refactoring:** **Remove Dead Code**, then **Inline Function**.

1. **Remove Dead Code:** delete `visibleCells(canvas)` (159-183). Run both suites.
2. **Inline Function** `get cellStep()`: replace each `this.cellStep` in the four methods with
   `Viewport.cellStep`, then delete the getter. Run the unit suite after each method.
3. If you expect per-instance cell sizes later (e.g. zoom), do the opposite instead: route
   _every_ read through the instance (`this.cellStep`, and add `this.cellSize`/
   `this.cellBorderWidth` getters). Either is fine, but pick one spelling and use it
   everywhere. Don't design for zoom before zoom exists; the statics are the simpler default.

---

### Smell 2: production code rebuilds a `Viewport` from a raw canvas at every call

**Where:**

- `life/app.js:16-21`: `renderCell(ctx, canvas, cell, color)` constructs a new `Viewport` for
  every cell it draws, then reads `Viewport.cellSize` to size the rectangle itself (line 20).
- `life/app.js:36-39`: `render` constructs another one to list the visible cells.
- `life/app.js:101`: the click handler constructs another one.
- `life/app.js:84-88`: `cssToCanvas`, which is pixel-space geometry, lives in `app.js` rather
  than with the rest of the coordinate maths, and takes the whole canvas.

**Verified:** traced `render` for the default 300×150 canvas: `visibleCells()` returns 15 × 7 =
105 cells, so one render builds 106 `Viewport` instances plus one per live cell. No `Viewport`
instance outlives the expression that creates it.

**Why it's bad:**

- **Fowler: Data Clump.** `canvas.width, canvas.height` travels together to every call site,
  and every call site turns it into the same object. The `Viewport` class was clearly created
  to absorb this clump, but the canvas is still the thing being passed around.
- **Freeman & Pryce: Context Independence / SOLID: ISP.** `renderCell` and `cssToCanvas` both
  take "a canvas" when one needs a viewport and the other needs four numbers. The canvas is a
  platform object, so anything that takes it can only be unit-tested with a fake canvas
  (Smell 6).
- **Freeman & Pryce: Tell, Don't Ask / Fowler: Feature Envy.** `renderCell` asks the viewport
  for a corner (`cellBodyPosition`) and separately reads a size (`Viewport.cellSize`), then
  assembles the rectangle itself. The viewport knows both and should hand back the rectangle.

**The refactoring:** **Introduce Parameter Object** (the `Viewport` already exists, so this is
about passing it), then **Extract Function** and **Move Function**.

1. In `render`, build **one** `const viewport = new Viewport(canvas.width, canvas.height)`
   (**Extract Variable**) and use it for `visibleCells()`.
2. **Change Function Declaration:** `renderCell(ctx, viewport, cell, color)`. Delete the
   construction inside it. Run the tests.
3. **Extract Function** `Viewport.cellBodyRect(cell)` returning `{ x, y, width, height }`, and
   have `renderCell` call `ctx.fillRect(rect.x, rect.y, rect.width, rect.height)`. That removes
   the Feature Envy on `cellSize`. Add a unit test for `cellBodyRect` in `viewport.test.js`.
4. In `createClickHandler`, build one `Viewport` per click (or, once Smell 6 has a renderer
   object, hold one per canvas).
5. **Move Function** `cssToCanvas` into `viewport.js`. It needs `clientWidth`/`clientHeight`,
   which `Viewport` doesn't hold, so either add a `Viewport.fromElement(el)` factory that also
   records the CSS size and exposes `cssToCanvas(point)`, or keep a separate small `Scale`
   object. The click handler then becomes
   `viewport.cellAtPosition(...viewport.cssToCanvas(offsetX, offsetY))`.

---

### Smell 3: CSS pixels and canvas pixels are both bare numbers, and the e2e helper mixes them up

**Where:** `tests/e2e/helpers.js`:

- `RenderedCanvas.fromPage` (187-192) takes `width`/`height` from `locator.boundingBox()`,
  which gives **CSS** pixels.
- `clickCell` (213-220) and `cell` (232-244) feed those into `new Viewport(this.width,
this.height)`, whose constructor documents **canvas** pixels.
- `clickCell` then passes the canvas-pixel `cellCentre` straight to `click()`, which Playwright
  treats as CSS pixels.

On the unit side, the conversion is done correctly, but in two near-identical functions,
`canvasToCssX`/`canvasToCssY` (`tests/unit/helpers.js:11-26`). The unit and e2e `clickCell`
helpers are two copies of the same idea, one with the conversion and one without. Everything in
`viewport.js` returns anonymous `number[]` pairs, with no indication of which pixel space they
belong to.

**Verified:** mutation M4 (a CSS `width: 600px; height: 300px` on the canvas) makes 3 of the 4
Chromium e2e tests fail. One of them, "Cell `1,1` is rendered in the initial grid", never
clicks, so it can only be failing because the helper samples pixels from the wrong place. The
app itself handles scaling correctly: the unit fake has a 300×150 backing store displayed at
200×400 CSS pixels, and mutation M2 confirms those tests would catch a missing conversion. So
the e2e suite would report a working app as broken as soon as the canvas is styled. The two
pixel spaces are equal today only because `index.html` gives the canvas no CSS size.

**Why it's bad:**

- **Freeman & Pryce: No String Types (for units).** Two different units are both `number`, so
  nothing stops one being passed where the other is expected. The code already needs long
  comments to keep them apart (`tests/unit/helpers.js:54-63`, `tests/unit/life.test.js:23-31,
52-54, 76-78`). When a distinction needs that much commentary, it should be a type.
- **Freeman & Pryce: an acceptance test should describe the system from outside.** The e2e
  helper reuses production geometry with the wrong inputs, so it's coupled to an accident of
  layout (no CSS sizing) that has nothing to do with the features under test.
- **Fowler: Primitive Obsession / Duplicated Code.** Bare `[x, y]` arrays stand in for points.
  The X and Y conversions are one function with the axis swapped (**Parameterize Function**).

**The refactoring:** fix the e2e helper first (that's test repair, so do it on its own), then
**Parameterize Function** and **Replace Primitive with Object** for points.

1. In `RenderedCanvas.fromPage`, read both sizes from the element:
   `locator.evaluate(el => ({ width: el.width, height: el.height, clientWidth: el.clientWidth,
clientHeight: el.clientHeight }))`. Store both pairs, named by pixel space.
2. Use the canvas-pixel pair for every `new Viewport(...)`. In `clickCell`, convert the
   canvas-pixel centre to CSS pixels before clicking.
3. Re-run mutation M4 and confirm the e2e suite now passes with a CSS-sized canvas, then revert
   the CSS. Consider keeping a scaled canvas in the e2e page permanently, so the suite keeps
   checking the conversion.
4. **Parameterize Function:** replace `canvasToCssX`/`canvasToCssY` with one
   `canvasToCss(canvas, { x, y })` returning a point. Share it between the unit and e2e
   helpers, or duplicate it deliberately if you want the two suites to stay independent.
5. Optionally, introduce named point shapes (`CanvasPoint`, `CssPoint` as JSDoc typedefs, or
   small classes) for `Viewport`'s return values and `cssToCanvas`'s input and output. Take
   this as far as the confusion keeps recurring, and no further.

---

### Smell 4: cells are strings everywhere except where they're briefly `Cell`s

**Where:** the live-cell state is a `Set<string>` of `"x,y"` keys (`index.html:18`;
`app.js:28, 52, 63-64, 95, 121`; `rules.js:38-39`). `Cell` exists (`cell.js`), but code
converts in and out of it constantly:

- `rules.js:45` parses every key into a `Cell`, and `rules.js:49` and `:58` turn `Cell`s back
  into strings.
- `app.js:56` (`liveCells`) parses again for rendering.
- `app.js:101-103` stringifies the clicked cell.
- `newCells` (`rules.js:30-32`) works directly on the string keys of a plain-object counter.

`app.js` carries three `// SMELL: primitive obsession` markers (lines 48, 59, 90) acknowledging
this.

**Verified:** every test in `rules.test.js` and `life.test.js` builds its inputs and asserts on
its outputs as string literals (`'0,0'`, `'-1,-1'`, …). Every test in `viewport.test.js` maps
`Cell`s back to strings (`.map((c) => c.toString())`) and sorts them before comparing. The whole
suite depends on the encoding.

**Why it's bad:**

- **Freeman & Pryce: No String Types.** "A live cell" is the program's central domain concept,
  and it's represented as a formatted string. There's nowhere to attach behaviour (neighbours,
  equality), and nothing stops a malformed key such as `"1, 1"` from being added.
- **Freeman & Pryce: test for information, not representation.**
  `expect(next(cells)).to.include('0,0')` asserts on how a cell is encoded, not on which cell
  it is. If the encoding changed, every test would change, though no behaviour did.
- **Fowler: Primitive Obsession.** The round-trips are what you get when a primitive stands in
  for an object. The reason for strings is legitimate: JS `Set` compares objects by reference,
  so two `new Cell(0, 0)` are distinct members. That argues for hiding the key inside one
  class, not for exposing it everywhere.

**The refactoring:** **Replace Primitive with Object**, as a collection class that owns the
encoding (this also sets up Smell 5).

1. Create `class Population` (or `LiveCells`) in a new module. Internally it holds a
   `Set<string>`. Its public API speaks only `Cell`: `has(cell)`, `add(cell)`, `delete(cell)`,
   `[Symbol.iterator]()` yielding `Cell`s, `size`, and a static `Population.of(...cells)`.
2. Make `Population` the only production caller of `Cell.toString`/`Cell.fromString`.
3. Change `rules.next` to accept and return a `Population`. The loop becomes
   `for (const cell of population)`, and each `neighbour.toString()`/`cells.has(key)` pair
   becomes `population.has(neighbour)`. The neighbour counter can stay keyed internally for now
   (Smell 9 restructures it).
4. Update `rules.test.js` to build inputs with `Population.of(cell(0, 0), …)` (a tiny
   `cell(x, y)` test helper keeps this readable) and assert with `population.has(cell(0, 0))`.
   For the blinker's whole-set comparison, add `equals(other)` or compare sorted cell lists.
5. Give `Cell` an `equals(other)` (or compare `{ x, y }` with `deep.equal`) so
   `viewport.test.js` can assert on cells rather than on their string form.
6. Migrate `app.js` and `index.html` to create and pass a `Population` (together with Smell 5).
   Delete `liveCells` and remove the `// SMELL` markers only once the strings are actually
   gone.

---

### Smell 5: the app mutates a raw `Set` it was handed, and tests assert through that shared reference

**Where:** `index.html:18-20` creates `new Set()` and passes it to `initApp`. `app.js:67-73`
(`toggleCell`) asks `cells.has(cell)`, then calls `delete`/`add` on the set from outside. Every
click test in `tests/unit/life.test.js` creates its own `Set`, passes it in, and inspects that
same object after clicking (`expect(cells).to.deep.equal(...)`).

**Why it's bad:**

- **Freeman & Pryce: Tell, Don't Ask.** `toggleCell` asks the set whether it contains the cell,
  then decides for it. "Toggle" is an operation on the population and belongs there.
- **Fowler: Mutable Data / Encapsulate Collection.** The same mutable reference is shared by
  `index.html`, `initApp`, the click-handler closure and, in tests, the test body. Anyone
  holding it can change it without the canvas being redrawn. The app has no control over its
  own state.
- **Freeman & Pryce: listen to the tests.** The tests need the shared reference because the app
  has no other observable output: `render` writes to a fake 2D context that records nothing
  (Smell 6). The shared `Set` is a workaround for a missing seam.

**The refactoring:** **Encapsulate Collection** (building on Smell 4's `Population`) plus
**Move Function**.

1. **Move Function** `toggleCell` onto `Population` as `toggle(cell)`. Delete the free
   function.
2. Keep `initApp(ui, population)` for now, but have the click handler call only
   `population.toggle(cell)`.
3. Once Smell 6 provides a display port, rewrite the click tests to assert on what was
   _displayed_ (the population handed to the fake display) rather than on the injected
   collection. The app can then own its population, and the tests stop depending on a shared
   mutable reference.

---

### Smell 6: `app.js` renders, handles input, converts coordinates, mutates state and owns the colour scheme, against faked platform types

**Where:** `life/app.js` in full:

- `render`/`renderCell` (16-46) draw directly with the Canvas 2D API.
- `createClickHandler` (98-109) translates DOM events and then re-renders.
- `cssToCanvas` (84-88) is coordinate maths.
- `toggleCell` (67-73) mutates state.
- The colour constants (4-6) are styling.

`renderCell(ctx, canvas, cell, color)` takes four parameters, two of which (`ctx`, `canvas`)
always travel together. In tests, `MockUI.createElement` (`tests/unit/helpers.js:38-95`)
returns a hand-rolled fake `HTMLCanvasElement`, whose `getContext()` returns
`{ fillRect() {} }`.

**Verified:** no unit test observes anything that is drawn, or even whether drawing happens.

- Mutation M1 (stop painting live cells) leaves all 18 unit tests passing.
- Mutation M5 (make the live colour indistinguishable from the dead colour) leaves all 18
  passing.
- Mutation M7 (stop re-rendering after a click) leaves all 18 passing. Only the e2e suite
  catches it (2 of 4 fail).

Rendering is therefore covered only by the e2e suite, which is slower and, per Smells 3 and 10,
partly derives its expectations from production code.

**Why it's bad:**

- **SOLID: SRP / Fowler: Divergent Change.** This one module changes for four unrelated
  reasons:
  - the colour scheme changes;
  - the drawing technique changes (e.g. redrawing only dirty cells);
  - input handling changes (drag, touch, pan);
  - state semantics change.
- **Freeman & Pryce: only mock types you own.** The unit tests fake `HTMLCanvasElement` and
  `CanvasRenderingContext2D`, which are platform types. The fake is a guess at their behaviour
  (fixed `clientWidth`/`clientHeight` that a real element computes from layout), and it's too
  thin to assert against. The alternative is a small port in the app's own terms ("show this
  population"), which the app depends on. A thin canvas adapter implements the port, and the
  adapter is tested against the real browser.
- **SOLID: DIP.** The high-level policy ("when a cell is clicked, toggle it and redisplay")
  depends directly on a low-level detail (the Canvas 2D API). Inverting that dependency gives
  the unit tests something meaningful to fake, which is also the missing seam from Smell 5.
- **Fowler: Long Parameter List / Data Clump.** `ctx` and `canvas` travel together and would
  become fields of a renderer object.

**The refactoring:** **Extract Class** twice, with ports named after their role.

1. **Extract Class** `CanvasRenderer` (e.g. `life/canvasRenderer.js`). Its constructor takes
   the canvas element and a `Viewport` (Smell 2), and its one method `draw(population)` holds
   the current `render` body. **Move Function** `renderCell` and **Move Field** the colour
   constants into it. `ctx` and the viewport become fields, so `renderCell(cell, color)` has
   two parameters.
2. Define the port: a documented `Display` shape with `draw(population)`. Have `initApp`
   receive a display (or a factory for one) instead of calling `render` itself.
3. **Extract Function** the input side: a click handler that takes the CSS offset, maps it to a
   cell via the `Viewport` (Smell 2, step 5), calls `population.toggle(cell)`, then
   `display.draw(population)`.
4. In unit tests, replace the fake 2D context with a fake `Display` that records each
   population it was asked to draw. A test like "Clicking on the center adds cell 0,0" then
   asserts "the last thing drawn contains exactly cell (0, 0)", which is a behaviour of the app
   and not a state probe, and M7 would now fail a unit test. Re-run M1 and M5 against a focused
   `CanvasRenderer` browser test (or accept that e2e covers them), so they no longer pass
   silently.
5. What remains in `app.js` is wiring (**Composite Simpler than the Sum of Its Parts**): build
   the viewport, the renderer and the population, then connect the click handler.

---

### Smell 7: the `UI` port is misnamed, ignores its argument, and its fake doubles as a test driver

**Where:** `life/ui.js:1-8`. `UI.createElement()` takes no parameter, although the typedef in
`app.js:111-114` declares `(tag: string) => object` and `app.js:124` passes `'canvas'`. It
always creates a canvas, sets a `data-testid`, **and** appends it to `document.body`. The fake,
`MockUI.createElement(type)` (`tests/unit/helpers.js:38`), does honour `type`, so the fake and
the real implementation have different contracts. The fake element also carries test-driver
methods (`click`, `clickCell`, lines 71-85) next to the fields that impersonate a DOM node, and
the fake class is documented as "a minimal fake of the DOM `document` object" (line 28), which
it isn't.

**Why it's bad:**

- **Fowler: Mysterious Name.** `createElement` suggests the DOM method of the same name, which
  only creates. This one creates, tags and attaches to the page, so a reader of `initApp` can't
  tell the call has a visible side effect on the document.
- **Freeman & Pryce: fakes must honour the real contract.** A double that accepts arguments the
  real object ignores means the tests describe a system that doesn't exist. Passing `'div'`
  would work in unit tests and silently produce a canvas in the browser.
- **Freeman & Pryce: name the role.** Neither `UI` nor `createElement` names what the app needs,
  which is "a surface to draw on that reports clicks". Once Smell 6 introduces a `Display`
  port, `UI` either becomes that port's factory or disappears.
- **SRP (in test code).** The fake element is both a stand-in for a DOM node and a driver that
  simulates gestures and converts coordinates. Driver logic belongs in helpers that _use_ the
  fake. Coordinate conversion inside a fake is exactly where a units bug is hardest to notice.

**The refactoring:**

1. **Change Function Declaration:** rename `UI.createElement()` to something honest, such as
   `mountCanvas()`. Drop the phantom `tag` from the typedef and call site, and rename
   `MockUI.createElement(type)` to match, without its parameter. Fix `MockUI`'s doc comment.
2. **Move** the `UI` typedef next to the class it describes (`ui.js`), or next to Smell 6's
   port.
3. **Extract Function** `click`/`clickCell` out of the fake element into standalone helpers,
   e.g. `clickAt(canvas, cssPoint)` and `clickCell(canvas, cell)`. The fake keeps only what it
   needs to impersonate an element (dimensions, `addEventListener`) plus one hook to dispatch an
   event.
4. After Smell 6, decide whether `UI` still needs to exist, or whether the composition root
   (`index.html`) can create the canvas and hand it to the adapter directly.

---

### Smell 8: unit tests repeat the same setup and explanations

**Where:** `tests/unit/life.test.js`:

- All six tests repeat `const cells = new Set(); const ui = new MockUI(); initApp(ui, cells);`,
  and five follow it with `ui.findElement('canvas')`.
- Four tests (lines 32, 47, 71, 93) rebuild the same `canvasCentre` object.
- The comment block at 52-54 is repeated verbatim at 76-78.
- The suite is named `'User Interface'` (line 7), but it tests `initApp`'s click-to-cell
  behaviour.

**Why it's bad:**

- **Freeman & Pryce: streamline test code.** Anything that doesn't describe the feature should
  be moved out of the test body. Here the setup outnumbers the lines that state the scenario.
  GOOS warns against production-strength DRY in tests, but this is noise, not duplication that
  aids clarity.
- **Fowler: Duplicated Code.** Every `initApp` signature change planned in Smells 5, 6 and 7
  would currently have to be made in six places instead of one.
- **Fowler: Mysterious Name (TestDox).** A suite name should read as the subject of its test
  names. "User Interface: The cell grid has a y axis that increases vertically upwards" doesn't.

**The refactoring:**

1. **Extract Function** `startApp()` (in `helpers.js` or at the top of the file) returning
   `{ cells, canvas }`. Replace the setup in each test.
2. **Extract Function** `canvasCentreCss(canvas)` for the repeated centre calculation.
3. Keep one copy of the explanatory comment, next to the helper that performs the conversion
   (Smell 3, step 4).
4. **Rename** the suite to describe its subject, e.g. `'Clicking the canvas'`.

---

### Smell 9: `rules.next` interleaves two phases, with magic numbers and vague names

**Where:** `life/rules.js:41-67`. One loop both (a) decides the survival of each live cell and
(b) tallies neighbour counts of dead cells into `counter`. A second phase, `newCells` (30-32),
then picks births. The rule thresholds appear as `> 1 && < 4` (line 57) and `=== 3` (line 31),
with no names. `counter` is a `{ [key: string]: number }` object used as a map, and `newCells`
names the result, not the rule. On the test side, `rules.test.js:63-71` ("Blinker oscillator")
asserts only that two generations return the starting state, so on its own it can't tell an
oscillator from a still life. The other tests in the file catch that today, but the blinker test
doesn't describe what its name claims.

**Why it's bad:**

- **Fowler: Long Function / Split Phase.** The survival check and the birth tally are two
  computations sharing a loop. **Split Phase** applies when code does two things in sequence
  that could be separated by an intermediate structure. Here that structure is "the
  live-neighbour count for every relevant cell".
- **Fowler: Mysterious Name.** The README names the four rules (underpopulation, survival,
  overpopulation, reproduction), and none of those names appears in the code.
  `liveNeighbourCount > 1 && liveNeighbourCount < 4` is the survival rule in disguise.
- **Freeman & Pryce: No String Types.** The counter is keyed by Smell 4's string encoding,
  which leaks straight into the result set via `newCells`.
- **Freeman & Pryce: specify precisely what should happen.** An oscillator test that doesn't
  check the intermediate phase is under-specified relative to its name.

**The refactoring:** **Split Phase**, then **Extract Function** on the rules. Do this after
Smell 4, so it's written against `Population`/`Cell` from the start.

1. **Extract Function** `neighbourCounts(population)`: for each live cell, for each neighbour,
   increment a count. Count all neighbours, live or dead, into one map (keyed internally, or a
   small `CellCounter` that hides the keying like `Population` does).
2. **Extract Function** `survives(count)` (`count === 2 || count === 3`) and `isBorn(count)`
   (`count === 3`).
3. Rewrite `next` as the second phase. A live cell is kept if `survives(counts.get(cell) ?? 0)`
   (a cell with no live neighbours never appears in the counts), and a dead cell is born if
   `isBorn(counts.get(cell))`.
4. Delete `newCells` and the ad-hoc `counter`.
5. `rules.test.js` covers 0, 1, 2, 3 and 4 neighbours for live cells and 3 and 4 for dead
   cells, which is a sufficient safety net for this change. While the file is open, add the
   blinker's intermediate assertion (`next(vertical)` equals the horizontal row).

---

### Smell 10: production modules export code only the tests use, and the tests use it as their oracle

**Where:**

- `life/viewport.js:44-50` (`Viewport.isBorderPixel`) and `life/viewport.js:123-130`
  (`Viewport.cellCentre`) have no production callers. `isBorderPixel` doesn't read `this`, yet
  it's an instance method, so its one caller has to invent a `Viewport` to reach it.
- `life/app.js:4-6` exports `livingCellColor`, `deadCellColor` and `cellBorderColor`. The only
  importer is `tests/e2e/helpers.js:2-6`, which uses them as the expected colours.
- The e2e helper also uses the production `cellPosition` to decide where to sample
  (`tests/e2e/helpers.js:235`).

**Verified:**

- Grepped each symbol. `isBorderPixel` is called only from `tests/e2e/helpers.js:116-119`, on a
  `new Viewport('FIXME: any old width', 'FIXME: any old height')`. `cellCentre` is called only
  from `tests/unit/helpers.js:78-81` and `tests/e2e/helpers.js:215-218`.
- Mutation M3 (change `livingCellColor` to green) leaves all 4 Chromium e2e tests passing. The
  e2e suite can't detect a change to the live-cell colour, because it asks production what that
  colour should be.

**Why it's bad:**

- **Freeman & Pryce: an acceptance test states its expectations independently.** If the e2e
  test asks production "what colour is a live cell?", then a regression in that answer moves
  the expectation along with the behaviour, and the test can't notice. M3 demonstrates this.
- **Freeman & Pryce: listen to the tests.** The `FIXME` placeholder arguments are the test
  saying "I can't construct this object honestly." The object is demanding data it doesn't
  need for the question being asked.
- **Fowler: Speculative Generality / Dead Code (from production's point of view).**
  `isBorderPixel` hard-codes `cellSize + cellBorderWidth / 2` as the far border pixel. That's a
  fact about how the _test_ slices image data, not about the game, but it lives on a production
  class and has to be kept consistent with it.
- **SRP (module level).** `Viewport` ends up serving two clients with different needs: the
  renderer and the pixel sampler.

**The refactoring:** **Move Function** into the test helpers, and state expected values in the
tests.

1. **Move Function** `isBorderPixel` into `tests/e2e/helpers.js` as a plain function taking the
   pixel, using `Viewport.cellSize`/`Viewport.cellBorderWidth`. Remove it from `Viewport`. The
   `FIXME` construction disappears with it.
2. Decide `cellCentre`'s home. Both callers are test helpers, so either move it to a shared
   test helper or leave it on `Viewport` only if the production click path starts using it.
3. In the e2e helper, define the expected colours as literals (`const LIVE = '#ff0000'`, etc.)
   instead of importing them, and remove the exports from `app.js` (or leave them unexported
   once Smell 6 moves them into the renderer). A deliberate colour change should require a
   matching test change. Re-run M3 to confirm it now fails.
4. For geometry, the e2e helper can reasonably keep using `Viewport` to find _where_ to sample,
   since hard-coding pixel offsets would be brittle. Keep at least one test that clicks raw
   coordinates (as "Clicking on the center of the canvas renders cell `0,0`" does), so the
   mapping is pinned from outside at least once.

---

### Smell 11: e2e helper objects are built half-empty and filled in from outside

**Where:** `tests/e2e/helpers.js`:

- `Pixel` declares `data;` (line 32), and `RenderedCell.pixel()` assigns it after construction
  (84-88).
- `RenderedCanvas.cell()` (232-244) creates a `RenderedCell`, then assigns `posX`, `posY` and
  `imgData` onto it. `RenderedCell` reads `this.imgData` (line 106) without declaring it.
- `RenderedCanvas.cell()` passes the `RenderedCell` to `Viewport.cellPosition` (235) as though
  it were a `Cell`. That works only because both happen to have `x` and `y`.
- `RenderedCell.hasBorderPixel` (115-120) does nothing but build a placeholder `Viewport` and
  forward to `isBorderPixel`.
- `pixelData` (97-107) contains "I can't understand this calculation any more… TODO: Work out
  what's going on here".
- `cellImgData` (255-267) takes a whole `RenderedCell` only to read `posX`/`posY` from it.

**Why it's bad:**

- **Fowler: Temporary Field / Remove Setting Method.** A `RenderedCell` isn't usable until
  another class has set three fields on it, and nothing documents or enforces that. Calling
  `isAlive()` on one built directly would throw on `this.imgData.slice`. Objects should be
  valid from construction.
- **Fowler: Middle Man.** `hasBorderPixel` adds a name and a hop without adding meaning, plus a
  placeholder construction.
- **Fowler: Comments.** A comment saying the code isn't understood calls for **Extract
  Variable** and **Rename**. The calculation is ordinary row-major indexing: `getImageData` is
  asked for a `cellStep × cellStep` block (line 259) and returns it row by row, 4 bytes per
  pixel, so pixel (x, y) starts at `(y * rowWidth + x) * 4`, where `rowWidth` is `cellStep`.
- **Freeman & Pryce: No String Types / Fowler: Primitive Obsession, mirrored.** Using a
  `RenderedCell` where a `Cell` is expected is an implicit, unchecked type pun. Constructing
  the real `Cell` (and keeping it as a field) states the relationship.

**The refactoring:**

1. **Change Function Declaration** on `RenderedCell` to take `(cell, imgData)`, where `cell` is
   a real `Cell`. Make `RenderedCanvas.cell()` build the `Cell`, compute the position from it,
   fetch the image data, then construct. Keep `posX`/`posY` as locals in `cell()` and pass them
   to `cellImgData(posX, posY)` directly (**Remove Setting Method**, **Change Function
   Declaration**).
2. Do the same for `Pixel`: construct it with `(x, y, rgba)`.
3. **Inline Function** `hasBorderPixel` into `cellIsColor`, calling the test-side
   `isBorderPixel` from Smell 10.
4. In `pixelData`, **Extract Variable** `const rowWidth = Viewport.cellStep` and
   `const bytesPerPixel = 4`, write the index as `(pixel.y * rowWidth + pixel.x) * bytesPerPixel`,
   and replace the TODO with one line naming row-major order.

---

### Smell 12: small inaccuracies in comments and metadata

**Where:**

- `package.json:6`: `"main": "index.js"` names a file that doesn't exist.
- `life/viewport.js:13`: the constructor's JSDoc has `@returns {Viewport}`. Constructors don't
  document a return value, and the tag adds nothing.
- `life/viewport.js:56-59`: `cellAtPosition`'s parameters are described as "the click
  location". This is a pure geometry function, so describing it in terms of one caller's use is
  misleading.
- `tests/e2e/helpers.js:164-165` documents `RenderedCanvas.width`/`height` as "in pixels", while
  the constructor (171-172) says "in CSS pixels". Smell 3 turns on exactly that difference.
- `tests/e2e/helpers.js:230`: `cell()` is `async` but documents `@returns {RenderedCell}`
  rather than a `Promise`. `cellImgData` (253) has the same problem, and `fromPage` (182-186)
  has no `@returns` at all.
- Typos: "aribtrary" (`tests/unit/life.test.js:27`) and "The blinker the simplest oscillator"
  (`tests/unit/rules.test.js:64`).

**Why it's bad:** **Fowler: Comments.** A comment is only useful while it's accurate. A wrong
annotation is worse than none, because readers and tooling (the project runs
`eslint-plugin-jsdoc`) both trust it. The `width` mismatch is the one that matters, because it
documents away the bug in Smell 3.

**The refactoring:** edit directly. Remove or correct `"main"`, drop the constructor
`@returns`, describe `cellAtPosition`'s parameters as canvas-pixel coordinates, make the
`RenderedCanvas` field docs say which pixel space they're in (and update them when Smell 3
changes it), change the async `@returns` to `Promise<…>` and add the missing one, and fix the
typos.

---

## Suggested order of work

1. **Smell 12 (comments and metadata), then Smell 1 (dead `visibleCells`, one `cellStep`
   spelling).** Neither has dependencies, and each is minutes of work. Doing them first keeps
   one-line edits out of the diffs for the structural changes, where they'd make review harder.
   Smell 1 matters before Smell 2 in particular: Smell 2 adds methods to `Viewport`, and doing
   it with the getter still present means choosing between two spellings of `cellStep` in each
   new method. Deleting the dead free function also means nobody "fixes" the wrong copy of
   `visibleCells` during the later steps.

2. **Smell 3, steps 1-3 (make the e2e helper use canvas pixels).** This is test repair, not
   refactoring, so it goes in its own commit, before any refactoring that relies on the e2e
   suite. Mutation M4 shows the suite gives false failures under a CSS-sized canvas, and M1, M5
   and M7 show it is the only suite that observes rendering at all (Smell 6). It needs to be
   trustworthy before Smells 2 and 6 move rendering and geometry code around.

3. **Smell 2 (pass one `Viewport`, add `cellBodyRect`, move `cssToCanvas`), then Smell 3,
   steps 4-5 (one conversion function, point types).** Both sit in `viewport.js`, `app.js` and
   the two helpers, so those files are opened once. Smell 2 has the widest fan-out among the
   production smells: Smells 6, 10 and 11 all need to know where geometry lives, and once
   `cellBodyRect` and `cssToCanvas` are on `Viewport`, that's decided. Doing Smell 6 first would
   mean building `CanvasRenderer` against `renderCell(ctx, canvas, …)` and rewriting it.

4. **Smell 8 (extract unit-test setup).** Before any step that changes `initApp`'s signature
   (Smells 5, 6, 7), so those changes are edited in one `startApp()` helper instead of six
   tests. It comes after step 3 so the consolidated conversion helper its comment points to
   already exists.

5. **Smell 4 (`Population`), then Smell 5 (`toggle` onto `Population`).** They add one class and
   share the same callers (`rules.js`, `app.js`, `index.html`, three unit test files), so do
   them back to back. This must come before Smell 6 so the display port's `draw(population)` is
   defined in domain terms from the start, not over a `Set<string>` that would need changing
   again.

6. **Smell 9 (`rules.next` Split Phase).** Straight after step 5, while `rules.js` is open and
   its tests have just been rewritten around `Population`. Doing it earlier would mean writing
   `neighbourCounts` against string keys and then rewriting it.

7. **Smell 6 (extract `CanvasRenderer` and a `Display` port), then Smell 7 (rename and slim
   `UI`/`MockUI`).**
   - By now the renderer is assembled from existing parts (`Viewport` with `cellBodyRect`,
     `Population`), so the extraction is mostly moving code.
   - Smell 7 follows immediately because it touches the same seam (`initApp`'s parameters,
     `MockUI`), and Smell 6's fake `Display` decides what's left for `MockUI` to do. Slimming
     the fake first would mean reshaping it twice.
   - This step also unlocks Smell 5's final step (assert on what was drawn, not on the shared
     collection). Do that here too, and confirm M7 now fails a unit test.

8. **Smell 10 (move test-only code out of production), then Smell 11 (e2e helper
   construction).**
   - Both are almost entirely in `tests/e2e/helpers.js`, so the file is opened once.
   - Smell 10 goes first because moving `isBorderPixel` into that file is what lets Smell 11
     inline `hasBorderPixel` into a local call.
   - They come last because by now `Viewport` (step 3) and the renderer (step 7) have settled
     which geometry and colours are production API. `cellCentre` and the colour constants are
     therefore moved only once, to their final homes.
