import { useState, useCallback, useRef, useEffect } from 'react';
import Grid from './components/Grid';
import Controls from './components/Controls';
import Stats from './components/Stats';
import {
  createGrid,
  cloneGrid,
  runAStar,
  runDijkstra,
  generateMaze,
  NODE_TYPES,
  ROWS,
  COLS,
} from './utils/algorithms';
import styles from './App.module.css';

// ─── Default positions ─────────────────────────────────────────────────────────
const DEFAULT_START = { row: Math.floor(ROWS / 2), col: Math.floor(COLS * 0.15) };
const DEFAULT_END   = { row: Math.floor(ROWS / 2), col: Math.floor(COLS * 0.85) };

// Animation speed → delay per frame in ms (index 0-3)
// Shifted faster across the board — the grid is large so even "slow" was sluggish
const SPEED_DELAYS = [8, 3, 1, 0];

// ─── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Grid state ──
  const [grid,      setGrid]      = useState(() => createGrid(DEFAULT_START, DEFAULT_END));
  const [startPos,  setStartPos]  = useState(DEFAULT_START);
  const [endPos,    setEndPos]    = useState(DEFAULT_END);

  // ── Control state ──
  const [heuristic,    setHeuristic]    = useState('manhattan');
  const [weight,       setWeight]       = useState(1.0);
  const [speed,        setSpeed]        = useState(2); // default to Fast
  const [interactMode, setInteractMode] = useState('wall');

  // ── Sidebar resize ──
  // Drag the handle between panel and grid to resize the sidebar.
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const isResizing = useRef(false);

  const handleResizeStart = useCallback((e) => {
    isResizing.current = true;
    e.preventDefault();
  }, []);

  useEffect(() => {
    function onMouseMove(e) {
      if (!isResizing.current) return;
      // Clamp between 220px and 420px so the sidebar stays usable
      const newWidth = Math.min(420, Math.max(220, e.clientX));
      setSidebarWidth(newWidth);
    }
    function onMouseUp() {
      isResizing.current = false;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun,    setHasRun]    = useState(false);
  const animRef     = useRef(null); // stores the timeout handle so we can cancel

  // ── Stats state ──
  const [astarStats,    setAstarStats]    = useState(null);
  const [dijkstraStats, setDijkstraStats] = useState(null);

  // ─── Cell interaction handler ──────────────────────────────────────────────
  // Called on mousedown/mouseenter; handles wall draw, start move, end move.

  const handleCellInteract = useCallback((row, col, dragAction) => {
    setGrid(prev => {
      const next = prev.map(r => r.map(n => ({ ...n })));
      const node = next[row][col];

      if (interactMode === 'wall') {
        if (node.type === NODE_TYPES.START || node.type === NODE_TYPES.END) return prev;
        // dragAction tells us whether this drag started on empty (draw) or wall (erase)
        node.type = dragAction === 'erase' ? NODE_TYPES.EMPTY : NODE_TYPES.WALL;

      } else if (interactMode === 'start') {
        if (node.type === NODE_TYPES.END || node.type === NODE_TYPES.WALL) return prev;
        // Move start: clear old, set new
        const oldStart = next[startPos.row][startPos.col];
        if (oldStart.type === NODE_TYPES.START) oldStart.type = NODE_TYPES.EMPTY;
        node.type = NODE_TYPES.START;
        setStartPos({ row, col });

      } else if (interactMode === 'end') {
        if (node.type === NODE_TYPES.START || node.type === NODE_TYPES.WALL) return prev;
        const oldEnd = next[endPos.row][endPos.col];
        if (oldEnd.type === NODE_TYPES.END) oldEnd.type = NODE_TYPES.EMPTY;
        node.type = NODE_TYPES.END;
        setEndPos({ row, col });
      }

      return next;
    });
  }, [interactMode, startPos, endPos]);

  // ─── Clear only the algorithm visualization (keep walls) ──────────────────

  const handleReset = useCallback(() => {
    cancelAnimation();
    setGrid(prev => prev.map(row => row.map(node => ({
      ...node,
      astar:    { visited: false, inFrontier: false, inPath: false, g: Infinity, f: Infinity },
      dijkstra: { visited: false, inFrontier: false, inPath: false, g: Infinity },
    }))));
    setAstarStats(null);
    setDijkstraStats(null);
    setHasRun(false);
    setIsRunning(false);
  }, []);

  // ─── Clear everything ──────────────────────────────────────────────────────

  const handleClearAll = useCallback(() => {
    cancelAnimation();
    setGrid(createGrid(startPos, endPos));
    setAstarStats(null);
    setDijkstraStats(null);
    setHasRun(false);
    setIsRunning(false);
  }, [startPos, endPos]);

  // ─── Generate maze ─────────────────────────────────────────────────────────

  const handleMaze = useCallback(() => {
    cancelAnimation();
    setHasRun(false);
    setAstarStats(null);
    setDijkstraStats(null);
    setGrid(prev => generateMaze(prev, startPos, endPos));
  }, [startPos, endPos]);

  // ─── Cancel in-progress animation ─────────────────────────────────────────

  function cancelAnimation() {
    if (animRef.current) {
      clearTimeout(animRef.current);
      animRef.current = null;
    }
  }

  // ─── Main visualization runner ─────────────────────────────────────────────
  // Runs both algorithms, then interleaves their frames for a side-by-side
  // animation. A* and Dijkstra play out simultaneously.

  const handleRun = useCallback(() => {
    if (isRunning) return;

    // First clear any previous run visuals
    const baseGrid = grid.map(row => row.map(node => ({
      ...node,
      astar:    { visited: false, inFrontier: false, inPath: false, g: Infinity, f: Infinity },
      dijkstra: { visited: false, inFrontier: false, inPath: false, g: Infinity },
    })));

    // Run both algorithms eagerly — they produce frame arrays we then play back
    const astarResult    = runAStar(baseGrid, startPos, endPos, heuristic, weight);
    const dijkstraResult = runDijkstra(baseGrid, startPos, endPos);

    setAstarStats(null);
    setDijkstraStats(null);
    setHasRun(false);
    setIsRunning(true);

    const delay = SPEED_DELAYS[speed];

    // Instant mode — apply all frames at once, no animation loop needed
    if (delay === 0) {
      const finalGrid = cloneGrid(baseGrid);

      for (const frame of astarResult.frames) {
        finalGrid[frame.row][frame.col].astar.visited = true;
      }
      for (const frame of dijkstraResult.frames) {
        finalGrid[frame.row][frame.col].dijkstra.visited = true;
      }
      for (const frame of astarResult.pathFrames) {
        finalGrid[frame.row][frame.col].astar.inPath = true;
      }
      for (const frame of dijkstraResult.pathFrames) {
        finalGrid[frame.row][frame.col].dijkstra.inPath = true;
      }

      setGrid(finalGrid);
      setAstarStats(astarResult.stats);
      setDijkstraStats(dijkstraResult.stats);
      setHasRun(true);
      setIsRunning(false);
      return;
    }

    // ── Animated mode ──
    // We zip A* and Dijkstra frames together so they appear to run simultaneously.
    // Each "tick" advances both algorithms by one step.
    const maxVisitFrames = Math.max(astarResult.frames.length, dijkstraResult.frames.length);
    let tick = 0;

    // Working copy — mutated incrementally during animation
    let animGrid = cloneGrid(baseGrid);

    function step() {
      if (tick < maxVisitFrames) {
        // Advance one frame for each algorithm (if they have frames remaining)
        const aFrame = astarResult.frames[tick];
        const dFrame = dijkstraResult.frames[tick];

        animGrid = animGrid.map(r => r.map(n => ({ ...n, astar: {...n.astar}, dijkstra: {...n.dijkstra} })));

        if (aFrame) {
          if (aFrame.type === 'visit')    animGrid[aFrame.row][aFrame.col].astar.visited    = true;
          if (aFrame.type === 'frontier') animGrid[aFrame.row][aFrame.col].astar.inFrontier = true;
        }
        if (dFrame) {
          if (dFrame.type === 'visit')    animGrid[dFrame.row][dFrame.col].dijkstra.visited    = true;
          if (dFrame.type === 'frontier') animGrid[dFrame.row][dFrame.col].dijkstra.inFrontier = true;
        }

        // Live node counts while animating
        setAstarStats({
          nodesExplored: Math.min(tick + 1, astarResult.frames.filter(f => f.type === 'visit').length),
          pathLength: 0,
          found: false,
        });
        setDijkstraStats({
          nodesExplored: Math.min(tick + 1, dijkstraResult.frames.filter(f => f.type === 'visit').length),
          pathLength: 0,
          found: false,
        });

        setGrid(animGrid);
        tick++;
        animRef.current = setTimeout(step, delay);

      } else {
        // All visit frames done — now animate the paths
        animatePaths(animGrid, astarResult, dijkstraResult, delay);
      }
    }

    animRef.current = setTimeout(step, delay);
  }, [grid, startPos, endPos, heuristic, weight, speed, isRunning]);

  // ─── Path animation (after explore phase) ─────────────────────────────────

  function animatePaths(baseAnimGrid, astarResult, dijkstraResult, delay) {
    const maxPathFrames = Math.max(astarResult.pathFrames.length, dijkstraResult.pathFrames.length);
    let tick = 0;
    let animGrid = baseAnimGrid;

    function pathStep() {
      if (tick < maxPathFrames) {
        const aFrame = astarResult.pathFrames[tick];
        const dFrame = dijkstraResult.pathFrames[tick];

        animGrid = animGrid.map(r => r.map(n => ({ ...n, astar: {...n.astar}, dijkstra: {...n.dijkstra} })));

        if (aFrame) animGrid[aFrame.row][aFrame.col].astar.inPath    = true;
        if (dFrame) animGrid[dFrame.row][dFrame.col].dijkstra.inPath = true;

        setGrid(animGrid);
        tick++;
        animRef.current = setTimeout(pathStep, delay * 2); // paths animate slightly slower for clarity
      } else {
        // Done — commit final stats
        setAstarStats(astarResult.stats);
        setDijkstraStats(dijkstraResult.stats);
        setHasRun(true);
        setIsRunning(false);
        animRef.current = null;
      }
    }

    animRef.current = setTimeout(pathStep, delay);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.app}>
      {/* Sidebar with dynamic width set via inline style */}
      <div style={{ width: sidebarWidth, minWidth: sidebarWidth, flexShrink: 0 }}>
        <Controls
          heuristic={heuristic}       setHeuristic={setHeuristic}
          weight={weight}             setWeight={setWeight}
          speed={speed}               setSpeed={setSpeed}
          interactMode={interactMode} setInteractMode={setInteractMode}
          isRunning={isRunning}
          onRun={handleRun}
          onReset={handleReset}
          onMaze={handleMaze}
          onClear={handleClearAll}
        />
      </div>

      {/* Drag handle — the thin strip between sidebar and grid */}
      <div
        className={styles.resizeHandle}
        onMouseDown={handleResizeStart}
        title="Drag to resize sidebar"
      />

      <main className={styles.main}>
        <div className={styles.gridArea}>
          <Grid
            grid={grid}
            onCellInteract={handleCellInteract}
            interactMode={interactMode}
            isRunning={isRunning}
          />
        </div>

        <Stats
          astarStats={astarStats}
          dijkstraStats={dijkstraStats}
          isRunning={isRunning}
          hasRun={hasRun}
        />
      </main>
    </div>
  );
}
