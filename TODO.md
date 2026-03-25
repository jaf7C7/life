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
  - [ ] **Clicking a cell on the canvas toggles it live/dead.**
  - [ ] Click-and-drag to pan around the grid.
  - [ ] Pinch/mousewheel to zoom in/out.
  - [ ] Play/stop buttons
  - [ ] Presets for interesting patterns.
