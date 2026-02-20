# TODO

## Basic Rules

- [x] A live cell with no neighbours dies
- [x] A live cell with two or three live neighbours lives on to the next generation
- [x] A live cell with more than three neighbours dies
- [x] A dead cell with exactly three live neighbours becomes a live cell

## The User Interface

- [x] grid of empty cells
- [x] clicking a dead cell makes it alive
- [x] clicking an alive cell makes it dead
- [x] play button starts the game
- [x] stop button stops the game
- [x] game stops when all cells are dead
- [x] centre of grid is [0, 0]
- [x] can click-and-drag to pan the grid left and right
- [x] can zoom in/out on the grid: dynamic grid size?
- [x] styling: are there actually HTML elements on the screen?
- [ ] **clicks on the grid should activate the correct cell (the grid is drawn using a separate co-ordinate system than the click event uses, so you have to convert the click event location co-ords to canvas drawing co-ords)**
- [ ] grid cell size should remain constant with grid resizing (styling change / screen resize)
- [ ] presets for some interesting patterns?
