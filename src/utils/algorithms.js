// ─── Grid Utilities ────────────────────────────────────────────────────────────

export const ROWS = 28;
export const COLS = 56;

// Node types used as grid cell state identifiers
export const NODE_TYPES = {
  EMPTY:    'empty',
  WALL:     'wall',
  START:    'start',
  END:      'end',
};

// All valid heuristic functions for A*
export const HEURISTICS = {
  manhattan:  'Manhattan',
  euclidean:  'Euclidean',
  chebyshev:  'Chebyshev',
  octile:     'Octile',
  zero:       'Zero (→ Dijkstra)',
};

/**
 * Creates a fresh 2D grid of node objects.
 * Each node tracks its position, type, and algorithm-specific state.
 */
export function createGrid(startPos = { row: 10, col: 10 }, endPos = { row: 10, col: 45 }) {
  return Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col) => createNode(row, col, startPos, endPos))
  );
}

function createNode(row, col, startPos, endPos) {
  const isStart = row === startPos.row && col === startPos.col;
  const isEnd   = row === endPos.row   && col === endPos.col;
  return {
    row,
    col,
    type: isStart ? NODE_TYPES.START : isEnd ? NODE_TYPES.END : NODE_TYPES.EMPTY,
    // A* state
    astar: { visited: false, inFrontier: false, inPath: false, g: Infinity, f: Infinity },
    // Dijkstra state
    dijkstra: { visited: false, inFrontier: false, inPath: false, g: Infinity },
  };
}

/**
 * Deep clone a grid — needed before each algorithm run to avoid mutating
 * the display grid mid-animation.
 */
export function cloneGrid(grid) {
  return grid.map(row => row.map(node => ({
    ...node,
    astar:    { ...node.astar },
    dijkstra: { ...node.dijkstra },
  })));
}

// ─── Heuristic Functions ───────────────────────────────────────────────────────

const heuristics = {
  manhattan:  (r1, c1, r2, c2) => Math.abs(r1 - r2) + Math.abs(c1 - c2),
  euclidean:  (r1, c1, r2, c2) => Math.sqrt((r1 - r2) ** 2 + (c1 - c2) ** 2),
  chebyshev:  (r1, c1, r2, c2) => Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)),
  // Octile distance is the most accurate for 8-directional grids
  octile:     (r1, c1, r2, c2) => {
    const dr = Math.abs(r1 - r2), dc = Math.abs(c1 - c2);
    return Math.max(dr, dc) + (Math.SQRT2 - 1) * Math.min(dr, dc);
  },
  zero:       () => 0, // Zero heuristic makes A* behave exactly like Dijkstra
};

// ─── Neighbor Discovery ────────────────────────────────────────────────────────

/**
 * Returns all 8-directional neighbors (diagonals included) that are walkable.
 * Diagonal moves cost √2, cardinal moves cost 1.
 */
function getNeighbors(grid, row, col) {
  const neighbors = [];
  const dirs = [
    [-1,  0, 1],       // up
    [ 1,  0, 1],       // down
    [ 0, -1, 1],       // left
    [ 0,  1, 1],       // right
    [-1, -1, Math.SQRT2], // diagonals
    [-1,  1, Math.SQRT2],
    [ 1, -1, Math.SQRT2],
    [ 1,  1, Math.SQRT2],
  ];
  for (const [dr, dc, cost] of dirs) {
    const r = row + dr, c = col + dc;
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c].type !== NODE_TYPES.WALL) {
      neighbors.push({ node: grid[r][c], cost });
    }
  }
  return neighbors;
}

// ─── Priority Queue (Min-Heap) ─────────────────────────────────────────────────

class MinHeap {
  constructor() { this.heap = []; }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  get size() { return this.heap.length; }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent].priority <= this.heap[i].priority) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l].priority < this.heap[smallest].priority) smallest = l;
      if (r < n && this.heap[r].priority < this.heap[smallest].priority) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

// ─── A* Algorithm ─────────────────────────────────────────────────────────────

/**
 * Runs A* and returns a step-by-step animation sequence.
 * Each frame is a snapshot of which nodes changed state so we can
 * animate incrementally rather than repainting the entire grid each tick.
 *
 * @param {Array}  grid       - The current grid (walls, start, end positions)
 * @param {{row,col}} start   - Start node position
 * @param {{row,col}} end     - End node position
 * @param {string} heuristic  - Key from HEURISTICS
 * @param {number} weight     - Heuristic weight (1 = standard A*, >1 = weighted)
 * @returns {{ frames: Array, stats: Object }}
 */
export function runAStar(grid, start, end, heuristic = 'manhattan', weight = 1) {
  const h = heuristics[heuristic] ?? heuristics.manhattan;
  const frames = [];

  // cameFrom lets us reconstruct the path at the end
  const cameFrom = new Map();
  const gScore   = new Map();
  const nodeKey  = (r, c) => `${r},${c}`;

  const startKey = nodeKey(start.row, start.col);
  gScore.set(startKey, 0);

  const open = new MinHeap();
  open.push({
    priority: h(start.row, start.col, end.row, end.col) * weight,
    row: start.row,
    col: start.col,
  });

  const inOpen  = new Set([startKey]);
  const closed  = new Set();
  let nodesExplored = 0;

  while (open.size > 0) {
    const { row, col } = open.pop();
    const key = nodeKey(row, col);

    if (closed.has(key)) continue;
    closed.add(key);
    inOpen.delete(key);
    nodesExplored++;

    // Record visited frame for animation
    frames.push({ type: 'visit', row, col });

    // Reached the goal — reconstruct path
    if (row === end.row && col === end.col) {
      const path = reconstructPath(cameFrom, end, nodeKey);
      return {
        frames,
        pathFrames: path.map(([r, c]) => ({ type: 'path', row: r, col: c })),
        stats: {
          nodesExplored,
          pathLength: path.length,
          found: true,
        },
      };
    }

    for (const { node, cost } of getNeighbors(grid, row, col)) {
      const nKey = nodeKey(node.row, node.col);
      if (closed.has(nKey)) continue;

      const tentativeG = (gScore.get(key) ?? Infinity) + cost;
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, [row, col]);
        gScore.set(nKey, tentativeG);
        const f = tentativeG + h(node.row, node.col, end.row, end.col) * weight;
        open.push({ priority: f, row: node.row, col: node.col });

        if (!inOpen.has(nKey)) {
          inOpen.add(nKey);
          frames.push({ type: 'frontier', row: node.row, col: node.col });
        }
      }
    }
  }

  // No path found
  return { frames, pathFrames: [], stats: { nodesExplored, pathLength: 0, found: false } };
}

// ─── Dijkstra's Algorithm ──────────────────────────────────────────────────────

/**
 * Dijkstra is essentially A* with a zero heuristic — guaranteed optimal path,
 * but explores far more nodes than A* with a good heuristic.
 */
export function runDijkstra(grid, start, end) {
  const frames     = [];
  const cameFrom   = new Map();
  const dist       = new Map();
  const nodeKey    = (r, c) => `${r},${c}`;
  const startKey   = nodeKey(start.row, start.col);

  dist.set(startKey, 0);
  const open   = new MinHeap();
  open.push({ priority: 0, row: start.row, col: start.col });

  const inOpen = new Set([startKey]);
  const closed = new Set();
  let nodesExplored = 0;

  while (open.size > 0) {
    const { row, col } = open.pop();
    const key = nodeKey(row, col);

    if (closed.has(key)) continue;
    closed.add(key);
    inOpen.delete(key);
    nodesExplored++;

    frames.push({ type: 'visit', row, col });

    if (row === end.row && col === end.col) {
      const path = reconstructPath(cameFrom, end, nodeKey);
      return {
        frames,
        pathFrames: path.map(([r, c]) => ({ type: 'path', row: r, col: c })),
        stats: {
          nodesExplored,
          pathLength: path.length,
          found: true,
        },
      };
    }

    for (const { node, cost } of getNeighbors(grid, row, col)) {
      const nKey = nodeKey(node.row, node.col);
      if (closed.has(nKey)) continue;

      const newDist = (dist.get(key) ?? Infinity) + cost;
      if (newDist < (dist.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, [row, col]);
        dist.set(nKey, newDist);
        open.push({ priority: newDist, row: node.row, col: node.col });

        if (!inOpen.has(nKey)) {
          inOpen.add(nKey);
          frames.push({ type: 'frontier', row: node.row, col: node.col });
        }
      }
    }
  }

  return { frames, pathFrames: [], stats: { nodesExplored, pathLength: 0, found: false } };
}

// ─── Path Reconstruction ───────────────────────────────────────────────────────

function reconstructPath(cameFrom, end, nodeKey) {
  const path = [];
  let cur = [end.row, end.col];
  while (cur) {
    path.unshift(cur);
    cur = cameFrom.get(nodeKey(cur[0], cur[1])) ?? null;
  }
  return path;
}

// ─── Maze Generation (Recursive Division) ─────────────────────────────────────

/**
 * Generates a random maze using recursive division.
 * Produces interesting wall patterns that really stress-test the algorithms.
 */
export function generateMaze(grid, startPos, endPos) {
  const newGrid = cloneGrid(grid);

  // Clear everything first
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (newGrid[r][c].type !== NODE_TYPES.START && newGrid[r][c].type !== NODE_TYPES.END) {
        newGrid[r][c].type = NODE_TYPES.EMPTY;
      }
    }
  }

  divide(newGrid, 1, 1, ROWS - 2, COLS - 2, startPos, endPos);
  return newGrid;
}

function divide(grid, rStart, cStart, rEnd, cEnd, startPos, endPos) {
  if (rEnd - rStart < 2 || cEnd - cStart < 2) return;

  const horizontal = (rEnd - rStart) > (cEnd - cStart);

  if (horizontal) {
    // Pick a random row to place a wall, biased toward the middle
    const wallRow = rStart + 1 + Math.floor(Math.random() * (rEnd - rStart - 1));
    // Pick a random gap in the wall
    const gapCol  = cStart + Math.floor(Math.random() * (cEnd - cStart + 1));

    for (let c = cStart; c <= cEnd; c++) {
      if (c === gapCol) continue;
      const node = grid[wallRow][c];
      if (node.type === NODE_TYPES.EMPTY) node.type = NODE_TYPES.WALL;
    }

    divide(grid, rStart,   cStart, wallRow - 1, cEnd, startPos, endPos);
    divide(grid, wallRow + 1, cStart, rEnd,     cEnd, startPos, endPos);
  } else {
    const wallCol = cStart + 1 + Math.floor(Math.random() * (cEnd - cStart - 1));
    const gapRow  = rStart + Math.floor(Math.random() * (rEnd - rStart + 1));

    for (let r = rStart; r <= rEnd; r++) {
      if (r === gapRow) continue;
      const node = grid[r][wallCol];
      if (node.type === NODE_TYPES.EMPTY) node.type = NODE_TYPES.WALL;
    }

    divide(grid, rStart, cStart,   rEnd, wallCol - 1, startPos, endPos);
    divide(grid, rStart, wallCol + 1, rEnd, cEnd,     startPos, endPos);
  }
}
