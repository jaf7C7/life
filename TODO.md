# TODO

- [x] Automated test scripts.
- [x] Add docstrings (and `prettier-jsdoc` plugin).
- [x] Make order of cells unimportant (use `Set` instead of `Array`)
- [ ] Use `Array.sort()` instead of `Set`?
- [x] Clearer assertions: `expect(next(cells)).not.toContain(cell)`
- [ ] Refactor tests for readability

- [x] Basic Rules
  - [x] Any live cell with fewer than two live neighbours dies, as if by underpopulation.
    - [x] A lone cell with no neighbours dies.
    - [x] A lone cell with a single neighbour dies.
  - [x] Any live cell with two or three live neighbours lives on to the next generation.
    - [x] A cell with two neighbours survives.
    - [x] A cell with three neighbours also survives.
  - [x] Any live cell with more than three live neighbours dies, as if by overpopulation.
  - [x] Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.
  - [x] Blinker oscillator

- [ ] **UI**
  - [x] Clicking a cell on the canvas toggles it live/dead.
  - [ ] **Click-and-drag to pan around the grid.**
    - [ ] **Refactor to eliminate code smells (see 'smell_audit.md')**
      - [x] `canvas.{width,height}` and `offset{X,Y}` are quietly using different units.
        - [x] use comments or renaming to make the different units explicit and obvious
        - [x] Write a (failing) unit test which will expose the lack of conversion between units
        - [x] make the test pass and extract a conversion function
      - [x] specify that right is +x and up is +y
        - [x] **write a test specifying that the grid's y-axis increases upwards instead of downwards**
        - [x] ensure the test passes and fails correctly
      - [x] `visibleCells` returns more cells than it should
        - [x] write a (unit? e2e?) test to ensure `visibleCells` returns exactly as many cells as needed to fill the canvas (use a tiny canvas?)
      - [ ] **`visibleCells` should be using `cellAtPosition` instead of calculating things itself**
        - [ ] **rewrite `visibleCells` to use `cellAtPosition` to return just the cells visible in the viewport, without a margin**
      - [ ] `getOrigin` has a misleading name, as it actually returns the top-left corner of the cell `0,0`.
        - [ ] rename this function to `cell00TopLeft`
        - [ ] inline this function when extracting the `Viewport` class
      - [ ] to draw a cell you need a corner position and and a cell size, but they are imported separately and `renderCell` puts them together. if cell size changes (e.g. from zooming) then `cellSize` will cease to be a constant and should be encapsulated in `viewport.js`
      - [ ] extract a `cellBodyRect` function which returns `{x, y, width, height}` and then `cellSize` can be encapsulated in this function and doens't need exporting any more

  - [ ] Make sure all tests fail with an informative error message
  - [ ] Add acceptance tests
  - [ ] Pinch/mousewheel to zoom in/out.
  - [ ] Play/stop buttons
  - [ ] Presets for interesting patterns.
    - decide whether +y upwards is a requirement, and if so pin it with a test
