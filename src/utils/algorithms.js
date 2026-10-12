// ─── Grid Constants ────────────────────────────────────────────────────────────

export const ROWS = 28;
export const COLS = 56;

// Node type identifiers
export const NODE_TYPES = {
  EMPTY:  'empty',
  WALL:   'wall',
  START:  'start',
  END:    'end',
};

// All cells have uniform cost — terrain system removed
const TERRAIN_COSTS = {
  [NODE_TYPES.EMPTY]: 1,
  [NODE_TYPES.START]: 1,
  [NODE_TYPES.END]:   1,
};

// All valid heuristic functions for A* and Greedy
export const HEURISTICS = {
  manhattan: 'Manhattan',
  euclidean: 'Euclidean',
  chebyshev: 'Chebyshev',
  octile:    'Octile',
  zero:      'Zero (→ Dijkstra)',
};

// ─── Grid Factory ──────────────────────────────────────────────────────────────

export function createGrid(
  startPos = { row: Math.floor(ROWS / 2), col: Math.floor(COLS * 0.15) },
  endPos   = { row: Math.floor(ROWS / 2), col: Math.floor(COLS * 0.85) }
) {
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
    // Per-algorithm visual state — tracked independently so both run simultaneously
    astar:    { visited: false, inFrontier: false, inPath: false, g: Infinity, f: Infinity },
    dijkstra: { visited: false, inFrontier: false, inPath: false, g: Infinity },
    greedy:   { visited: false, inFrontier: false, inPath: false, h: Infinity },
  };
}

// Deep clone without sharing nested algorithm state objects
export function cloneGrid(grid) {
  return grid.map(row => row.map(node => ({
    ...node,
    astar:    { ...node.astar },
    dijkstra: { ...node.dijkstra },
    greedy:   { ...node.greedy },
  })));
}

// ─── Heuristics ────────────────────────────────────────────────────────────────

const heuristics = {
  manhattan: (r1, c1, r2, c2) => Math.abs(r1 - r2) + Math.abs(c1 - c2),
  euclidean: (r1, c1, r2, c2) => Math.sqrt((r1 - r2) ** 2 + (c1 - c2) ** 2),
  chebyshev: (r1, c1, r2, c2) => Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)),
  // Octile is the most accurate heuristic for 8-directional movement with √2 diagonal cost
  octile:    (r1, c1, r2, c2) => {
    const dr = Math.abs(r1 - r2), dc = Math.abs(c1 - c2);
    return Math.max(dr, dc) + (Math.SQRT2 - 1) * Math.min(dr, dc);
  },
  zero: () => 0,
};

// ─── Neighbor Discovery ────────────────────────────────────────────────────────

/**
 * Returns walkable 8-directional neighbors with their movement cost.
 * Terrain type of the DESTINATION cell determines the cost (entering cost model).
 * Diagonal moves also pay √2 × terrain cost.
 */
function getNeighbors(grid, row, col) {
  const neighbors = [];
  const dirs = [
    [-1,  0, 1],           // N
    [ 1,  0, 1],           // S
    [ 0, -1, 1],           // W
    [ 0,  1, 1],           // E
    [-1, -1, Math.SQRT2],  // NW
    [-1,  1, Math.SQRT2],  // NE
    [ 1, -1, Math.SQRT2],  // SW
    [ 1,  1, Math.SQRT2],  // SE
  ];
  for (const [dr, dc, baseCost] of dirs) {
    const r = row + dr, c = col + dc;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    const neighbor = grid[r][c];
    if (neighbor.type === NODE_TYPES.WALL) continue;
    // Multiply base movement cost by the terrain multiplier of the destination cell
    const terrainCost = TERRAIN_COSTS[neighbor.type] ?? 1;
    neighbors.push({ node: neighbor, cost: baseCost * terrainCost });
  }
  return neighbors;
}

// ─── Min-Heap Priority Queue ───────────────────────────────────────────────────

class MinHeap {
  constructor() { this.heap = []; }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    const top  = this.heap[0];
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
      const p = (i - 1) >> 1;
      if (this.heap[p].priority <= this.heap[i].priority) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let s = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l].priority < this.heap[s].priority) s = l;
      if (r < n && this.heap[r].priority < this.heap[s].priority) s = r;
      if (s === i) break;
      [this.heap[s], this.heap[i]] = [this.heap[i], this.heap[s]];
      i = s;
    }
  }
}

// ─── A* ───────────────────────────────────────────────────────────────────────

/**
 * A* with configurable heuristic and weight.
 * Each visit frame carries the node's computed g and f scores so the
 * tooltip system can show them on hover without re-running the algorithm.
 *
 * weight = 1  → standard A* (optimal)
 * weight > 1  → Weighted A* (faster, potentially suboptimal)
 * weight = 0  → degrades to Dijkstra
 */
export function runAStar(grid, start, end, heuristic = 'manhattan', weight = 1) {
  const h        = heuristics[heuristic] ?? heuristics.manhattan;
  const frames   = [];
  const cameFrom = new Map();
  const gScore   = new Map();
  const fScore   = new Map(); // stored so frames can carry f values for tooltips
  const nodeKey  = (r, c) => `${r},${c}`;
  const startKey = nodeKey(start.row, start.col);

  gScore.set(startKey, 0);
  fScore.set(startKey, h(start.row, start.col, end.row, end.col) * weight);

  const open   = new MinHeap();
  open.push({ priority: fScore.get(startKey), row: start.row, col: start.col });

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

    // Carry g/f values in the frame so the Grid tooltip can display them
    frames.push({
      type: 'visit', row, col,
      g: gScore.get(key),
      f: fScore.get(key),
    });

    if (row === end.row && col === end.col) {
      const path = reconstructPath(cameFrom, end, nodeKey);
      return {
        frames,
        pathFrames: path.map(([r, c]) => ({ type: 'path', row: r, col: c })),
        // scoreMap lets the grid render stored g/f values on every cell after the run
        scoreMap: Object.fromEntries(
          [...gScore.entries()].map(([k, g]) => [k, { g, f: fScore.get(k) ?? Infinity }])
        ),
        stats: { nodesExplored, pathLength: path.length, found: true },
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
        fScore.set(nKey, f);
        open.push({ priority: f, row: node.row, col: node.col });

        if (!inOpen.has(nKey)) {
          inOpen.add(nKey);
          frames.push({ type: 'frontier', row: node.row, col: node.col, g: tentativeG, f });
        }
      }
    }
  }

  return {
    frames, pathFrames: [],
    scoreMap: Object.fromEntries(
      [...gScore.entries()].map(([k, g]) => [k, { g, f: fScore.get(k) ?? Infinity }])
    ),
    stats: { nodesExplored, pathLength: 0, found: false },
  };
}

// ─── Dijkstra ──────────────────────────────────────────────────────────────────

/**
 * Dijkstra's algorithm — optimal, uninformed.
 * Respects terrain costs. Explores uniformly outward from the start,
 * visiting every reachable node before giving up or finding the goal.
 */
export function runDijkstra(grid, start, end) {
  const frames   = [];
  const cameFrom = new Map();
  const dist     = new Map();
  const nodeKey  = (r, c) => `${r},${c}`;
  const startKey = nodeKey(start.row, start.col);

  dist.set(startKey, 0);
  const open   = new MinHeap();
  open.push({ priority: 0, row: start.row, col: start.col });

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

    frames.push({ type: 'visit', row, col, g: dist.get(key) });

    if (row === end.row && col === end.col) {
      const path = reconstructPath(cameFrom, end, nodeKey);
      return {
        frames,
        pathFrames: path.map(([r, c]) => ({ type: 'path', row: r, col: c })),
        stats: { nodesExplored, pathLength: path.length, found: true },
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
          frames.push({ type: 'frontier', row: node.row, col: node.col, g: newDist });
        }
      }
    }
  }

  return { frames, pathFrames: [], stats: { nodesExplored, pathLength: 0, found: false } };
}

// ─── Greedy Best-First Search ──────────────────────────────────────────────────

/**
 * Greedy Best-First Search — guided purely by the heuristic, ignoring actual cost.
 * Priority: h(n) only (no g cost).
 *
 * Key insight vs A*:
 *   - Greedy is usually FASTER (fewer nodes explored) because it beelines for the goal
 *   - But it is NOT optimal — it can find dramatically longer paths in mazes
 *   - With terrain: it completely ignores terrain cost, often walking through swamps
 *   - With zero heuristic it degrades to BFS (explores blindly, no cost awareness)
 *
 * Comparing Greedy vs A* vs Dijkstra in one view makes the exploration/optimality
 * tradeoff immediately visible.
 */
export function runGreedy(grid, start, end, heuristic = 'manhattan') {
  const h        = heuristics[heuristic] ?? heuristics.manhattan;
  const frames   = [];
  const cameFrom = new Map();
  const nodeKey  = (r, c) => `${r},${c}`;
  const startKey = nodeKey(start.row, start.col);

  const open   = new MinHeap();
  open.push({
    priority: h(start.row, start.col, end.row, end.col),
    row: start.row,
    col: start.col,
  });

  const inOpen  = new Set([startKey]);
  const visited = new Set();
  let nodesExplored = 0;

  while (open.size > 0) {
    const { row, col } = open.pop();
    const key = nodeKey(row, col);
    if (visited.has(key)) continue;

    visited.add(key);
    inOpen.delete(key);
    nodesExplored++;

    // Greedy frames carry the h value so tooltips can show it
    frames.push({
      type: 'visit', row, col,
      h: h(row, col, end.row, end.col),
    });

    if (row === end.row && col === end.col) {
      const path = reconstructPath(cameFrom, end, nodeKey);
      return {
        frames,
        pathFrames: path.map(([r, c]) => ({ type: 'path', row: r, col: c })),
        stats: { nodesExplored, pathLength: path.length, found: true },
      };
    }

    for (const { node } of getNeighbors(grid, row, col)) {
      // Greedy ignores edge cost entirely — only the heuristic matters
      const nKey = nodeKey(node.row, node.col);
      if (visited.has(nKey) || inOpen.has(nKey)) continue;

      cameFrom.set(nKey, [row, col]);
      const hVal = h(node.row, node.col, end.row, end.col);
      open.push({ priority: hVal, row: node.row, col: node.col });
      inOpen.add(nKey);
      frames.push({ type: 'frontier', row: node.row, col: node.col, h: hVal });
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

export function generateMaze(grid, startPos, endPos) {
  const newGrid = cloneGrid(grid);

  // Clear all non-landmark cells first
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = newGrid[r][c].type;
      if (t !== NODE_TYPES.START && t !== NODE_TYPES.END) {
        newGrid[r][c].type = NODE_TYPES.EMPTY;
      }
    }
  }

  divide(newGrid, 1, 1, ROWS - 2, COLS - 2, startPos, endPos);
  return newGrid;
}

function divide(grid, rStart, cStart, rEnd, cEnd) {
  if (rEnd - rStart < 2 || cEnd - cStart < 2) return;

  const horizontal = (rEnd - rStart) >= (cEnd - cStart);

  if (horizontal) {
    const wallRow = rStart + 1 + Math.floor(Math.random() * (rEnd - rStart - 1));
    const gapCol  = cStart + Math.floor(Math.random() * (cEnd - cStart + 1));
    for (let c = cStart; c <= cEnd; c++) {
      if (c !== gapCol && grid[wallRow][c].type === NODE_TYPES.EMPTY) {
        grid[wallRow][c].type = NODE_TYPES.WALL;
      }
    }
    divide(grid, rStart, cStart, wallRow - 1, cEnd);
    divide(grid, wallRow + 1, cStart, rEnd, cEnd);
  } else {
    const wallCol = cStart + 1 + Math.floor(Math.random() * (cEnd - cStart - 1));
    const gapRow  = rStart + Math.floor(Math.random() * (rEnd - rStart + 1));
    for (let r = rStart; r <= rEnd; r++) {
      if (r !== gapRow && grid[r][wallCol].type === NODE_TYPES.EMPTY) {
        grid[r][wallCol].type = NODE_TYPES.WALL;
      }
    }
    divide(grid, rStart, cStart, rEnd, wallCol - 1);
    divide(grid, rStart, wallCol + 1, rEnd, cEnd);
  }
}
