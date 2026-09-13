# TODO

- [x] Automated test scripts.
- [x] Add docstrings (and `prettier-jsdoc` plugin).
- [x] Make order of cells unimportant (use `Set` instead of `Array`)
- [x] Clearer assertions: `expect(next(cells)).not.toContain(cell)`

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
    - [x] Remove non-functioning code
    - [ ] **Refactor to eliminate code smells (see 'smell_audit.md')**
      - [ ] **Move everything to do with rendering (mostly in `app.js` to `render.js`**
      - [ ] Move everything to do with updating `cells` to `cell.js`
      - [ ] Extract a `MultiCell` class to model the group of living cells
    - [ ] Implement a real `UI` class
    - [ ] Extract a `CanvasWrapper` or `GameGrid` class from `MockUI` which can become part of the model code, and keep `MockUI` as simple as possible.
  - [ ] Pinch/mousewheel to zoom in/out.
  - [ ] Play/stop buttons
  - [ ] Presets for interesting patterns.
