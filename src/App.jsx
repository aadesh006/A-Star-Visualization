import { useState, useCallback, useRef, useEffect } from 'react';
import Grid from './components/Grid';
import Controls from './components/Controls';
import Stats from './components/Stats';
import {
  createGrid, cloneGrid,
  runAStar, runDijkstra, runGreedy,
  generateMaze,
  NODE_TYPES, ROWS, COLS,
} from './utils/algorithms';
import styles from './App.module.css';

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_START = { row: Math.floor(ROWS / 2), col: Math.floor(COLS * 0.15) };
const DEFAULT_END   = { row: Math.floor(ROWS / 2), col: Math.floor(COLS * 0.85) };

// ms delay per animation frame — index 0-3 maps to Slow/Normal/Fast/Instant
const SPEED_DELAYS = [8, 3, 1, 0];

// ─── App ───────────────────────────────────────────────────────────────────────

export default function App() {

  // ── Grid & position state ──
  const [grid,     setGrid]     = useState(() => createGrid(DEFAULT_START, DEFAULT_END));
  const [startPos, setStartPos] = useState(DEFAULT_START);
  const [endPos,   setEndPos]   = useState(DEFAULT_END);

  // ── Algorithm controls ──
  const [heuristic,    setHeuristic]    = useState('manhattan');
  const [weight,       setWeight]       = useState(1.0);
  const [showGreedy,   setShowGreedy]   = useState(true);

  // ── Animation controls ──
  const [speed,        setSpeed]        = useState(2);
  const [isRunning,    setIsRunning]    = useState(false);
  const [isPaused,     setIsPaused]     = useState(false);
  const [hasRun,       setHasRun]       = useState(false);

  // ── Draw mode ──
  const [interactMode, setInteractMode] = useState('wall');

  // ── Stats ──
  const [astarStats,    setAstarStats]    = useState(null);
  const [dijkstraStats, setDijkstraStats] = useState(null);
  const [greedyStats,   setGreedyStats]   = useState(null);

  // ── Sidebar resize ──
  const [sidebarWidth, setSidebarWidth] = useState(290);
  const isResizing = useRef(false);

  // ── Score maps — stored after run so tooltip can look up g/f per cell ──
  const astarScoreMap = useRef({});

  // ── Animation engine refs ──
  const animRef      = useRef(null);  // current timeout handle
  const stepQueueRef = useRef(null);  // holds { frames, tick, animGrid, ... } when paused

  // ─── Sidebar resize handlers ───────────────────────────────────────────────

  const handleResizeStart = useCallback(e => {
    isResizing.current = true;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = e => {
      if (!isResizing.current) return;
      setSidebarWidth(Math.min(440, Math.max(220, e.clientX)));
    };
    const onUp = () => { isResizing.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // ─── Cell interaction ──────────────────────────────────────────────────────

  const handleCellInteract = useCallback((row, col, dragAction) => {
    setGrid(prev => {
      const next = prev.map(r => r.map(n => ({ ...n })));
      const node = next[row][col];

      if (interactMode === 'wall') {
        if (node.type === NODE_TYPES.START || node.type === NODE_TYPES.END) return prev;
        node.type = dragAction === 'erase' ? NODE_TYPES.EMPTY : NODE_TYPES.WALL;

      } else if (interactMode === 'sand') {
        if (node.type === NODE_TYPES.START || node.type === NODE_TYPES.END || node.type === NODE_TYPES.WALL) return prev;
        node.type = dragAction === 'erase' ? NODE_TYPES.EMPTY : NODE_TYPES.SAND;

      } else if (interactMode === 'water') {
        if (node.type === NODE_TYPES.START || node.type === NODE_TYPES.END || node.type === NODE_TYPES.WALL) return prev;
        node.type = dragAction === 'erase' ? NODE_TYPES.EMPTY : NODE_TYPES.WATER;

      } else if (interactMode === 'start') {
        if (node.type === NODE_TYPES.END || node.type === NODE_TYPES.WALL) return prev;
        next[startPos.row][startPos.col].type = NODE_TYPES.EMPTY;
        node.type = NODE_TYPES.START;
        setStartPos({ row, col });

      } else if (interactMode === 'end') {
        if (node.type === NODE_TYPES.START || node.type === NODE_TYPES.WALL) return prev;
        next[endPos.row][endPos.col].type = NODE_TYPES.END;
        node.type = NODE_TYPES.END;
        setEndPos({ row, col });
      }

      return next;
    });
  }, [interactMode, startPos, endPos]);

  // ─── Cancel running animation ──────────────────────────────────────────────

  function cancelAnimation() {
    if (animRef.current) { clearTimeout(animRef.current); animRef.current = null; }
    stepQueueRef.current = null;
  }

  // ─── Reset / Clear ─────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    cancelAnimation();
    astarScoreMap.current = {};
    setGrid(prev => prev.map(row => row.map(node => ({
      ...node,
      astar:    { visited: false, inFrontier: false, inPath: false, g: Infinity, f: Infinity },
      dijkstra: { visited: false, inFrontier: false, inPath: false, g: Infinity },
      greedy:   { visited: false, inFrontier: false, inPath: false, h: Infinity },
    }))));
    setAstarStats(null); setDijkstraStats(null); setGreedyStats(null);
    setHasRun(false); setIsRunning(false); setIsPaused(false);
  }, []);

  const handleClearAll = useCallback(() => {
    cancelAnimation();
    astarScoreMap.current = {};
    setGrid(createGrid(startPos, endPos));
    setAstarStats(null); setDijkstraStats(null); setGreedyStats(null);
    setHasRun(false); setIsRunning(false); setIsPaused(false);
  }, [startPos, endPos]);

  const handleMaze = useCallback(() => {
    cancelAnimation();
    setHasRun(false);
    setAstarStats(null); setDijkstraStats(null); setGreedyStats(null);
    setGrid(prev => generateMaze(prev, startPos, endPos));
  }, [startPos, endPos]);

  // ─── Pause / Resume ────────────────────────────────────────────────────────

  const handlePause = useCallback(() => {
    if (!isRunning || isPaused) return;
    cancelAnimation();        // stop the timeout loop
    setIsPaused(true);        // stepQueueRef still holds the queue position
  }, [isRunning, isPaused]);

  const handleResume = useCallback(() => {
    if (!isPaused || !stepQueueRef.current) return;
    setIsPaused(false);
    // Restart the step loop from where it left off
    const delay = SPEED_DELAYS[speed];
    animRef.current = setTimeout(() => continueStep(stepQueueRef.current, delay), delay);
  }, [isPaused, speed]);

  // ─── Step Forward (one frame at a time) ────────────────────────────────────

  const handleStepForward = useCallback(() => {
    if (!isPaused || !stepQueueRef.current) return;
    advanceOneFrame(stepQueueRef.current);
  }, [isPaused]);

  // ─── Main Run ──────────────────────────────────────────────────────────────

  const handleRun = useCallback(() => {
    if (isRunning) return;
    cancelAnimation();

    // Strip old visualization state from grid
    const baseGrid = grid.map(row => row.map(node => ({
      ...node,
      astar:    { visited: false, inFrontier: false, inPath: false, g: Infinity, f: Infinity },
      dijkstra: { visited: false, inFrontier: false, inPath: false, g: Infinity },
      greedy:   { visited: false, inFrontier: false, inPath: false, h: Infinity },
    })));

    // Run all three algorithms eagerly to get their full frame sequences
    const astarResult    = runAStar(baseGrid, startPos, endPos, heuristic, weight);
    const dijkstraResult = runDijkstra(baseGrid, startPos, endPos);
    const greedyResult   = showGreedy ? runGreedy(baseGrid, startPos, endPos, heuristic) : null;

    // Store A* score map for tooltip access (persists after animation ends)
    astarScoreMap.current = astarResult.scoreMap ?? {};

    setAstarStats(null); setDijkstraStats(null); setGreedyStats(null);
    setHasRun(false); setIsRunning(true); setIsPaused(false);

    const delay = SPEED_DELAYS[speed];

    // ── Instant mode ──
    if (delay === 0) {
      const finalGrid = cloneGrid(baseGrid);
      for (const f of astarResult.frames)    if (f.type === 'visit') finalGrid[f.row][f.col].astar.visited    = true;
      for (const f of dijkstraResult.frames) if (f.type === 'visit') finalGrid[f.row][f.col].dijkstra.visited = true;
      if (greedyResult) for (const f of greedyResult.frames) if (f.type === 'visit') finalGrid[f.row][f.col].greedy.visited = true;
      for (const f of astarResult.pathFrames)    finalGrid[f.row][f.col].astar.inPath    = true;
      for (const f of dijkstraResult.pathFrames) finalGrid[f.row][f.col].dijkstra.inPath = true;
      if (greedyResult) for (const f of greedyResult.pathFrames) finalGrid[f.row][f.col].greedy.inPath = true;
      setGrid(finalGrid);
      setAstarStats(astarResult.stats);
      setDijkstraStats(dijkstraResult.stats);
      if (greedyResult) setGreedyStats(greedyResult.stats);
      setHasRun(true); setIsRunning(false);
      return;
    }

    // ── Animated mode — build step queue ──
    const maxVisit = Math.max(
      astarResult.frames.length,
      dijkstraResult.frames.length,
      greedyResult?.frames.length ?? 0
    );

    // Per-algorithm visit counters for independent live stats
    let aVisited = 0, dVisited = 0, gVisited = 0;
    const aVisitTotal = astarResult.frames.filter(f => f.type === 'visit').length;
    const dVisitTotal = dijkstraResult.frames.filter(f => f.type === 'visit').length;
    const gVisitTotal = greedyResult ? greedyResult.frames.filter(f => f.type === 'visit').length : 0;

    const queue = {
      phase: 'visit',         // 'visit' | 'path'
      tick: 0,
      maxVisit,
      astarResult, dijkstraResult, greedyResult,
      animGrid: cloneGrid(baseGrid),
      aVisited, dVisited, gVisited,
      aVisitTotal, dVisitTotal, gVisitTotal,
    };

    stepQueueRef.current = queue;
    animRef.current = setTimeout(() => continueStep(queue, delay), delay);
  }, [grid, startPos, endPos, heuristic, weight, speed, showGreedy, isRunning]);

  // ─── Animation step loop ───────────────────────────────────────────────────
  // continueStep and advanceOneFrame are plain functions (not hooks) because
  // they only read from refs and call setters — no stale closure issues.

  function continueStep(queue, delay) {
    advanceOneFrame(queue);
    if (stepQueueRef.current && !isPausedRef.current) {
      animRef.current = setTimeout(() => continueStep(queue, delay), delay);
    }
  }

  // We need a ref mirror of isPaused to read inside the timeout closure
  const isPausedRef = useRef(false);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  function advanceOneFrame(queue) {
    if (queue.phase === 'visit') {
      if (queue.tick < queue.maxVisit) {
        const { astarResult, dijkstraResult, greedyResult } = queue;
        const aFrame = astarResult.frames[queue.tick];
        const dFrame = dijkstraResult.frames[queue.tick];
        const gFrame = greedyResult?.frames[queue.tick];

        // Shallow-clone only the cells that are changing to avoid full grid rebuild
        const newGrid = queue.animGrid.map(r => r.map(n => ({
          ...n,
          astar:    { ...n.astar },
          dijkstra: { ...n.dijkstra },
          greedy:   { ...n.greedy },
        })));

        if (aFrame) {
          if (aFrame.type === 'visit')    { newGrid[aFrame.row][aFrame.col].astar.visited    = true; queue.aVisited++; }
          if (aFrame.type === 'frontier')   newGrid[aFrame.row][aFrame.col].astar.inFrontier = true;
        }
        if (dFrame) {
          if (dFrame.type === 'visit')    { newGrid[dFrame.row][dFrame.col].dijkstra.visited    = true; queue.dVisited++; }
          if (dFrame.type === 'frontier')   newGrid[dFrame.row][dFrame.col].dijkstra.inFrontier = true;
        }
        if (gFrame) {
          if (gFrame.type === 'visit')    { newGrid[gFrame.row][gFrame.col].greedy.visited    = true; queue.gVisited++; }
          if (gFrame.type === 'frontier')   newGrid[gFrame.row][gFrame.col].greedy.inFrontier = true;
        }

        queue.animGrid = newGrid;
        queue.tick++;

        setGrid(newGrid);
        setAstarStats({    nodesExplored: Math.min(queue.aVisited, queue.aVisitTotal), pathLength: 0, found: false });
        setDijkstraStats({ nodesExplored: Math.min(queue.dVisited, queue.dVisitTotal), pathLength: 0, found: false });
        if (greedyResult) setGreedyStats({ nodesExplored: Math.min(queue.gVisited, queue.gVisitTotal), pathLength: 0, found: false });

      } else {
        // Transition to path animation phase
        queue.phase = 'path';
        queue.tick  = 0;
        queue.maxPath = Math.max(
          queue.astarResult.pathFrames.length,
          queue.dijkstraResult.pathFrames.length,
          queue.greedyResult?.pathFrames.length ?? 0
        );
      }
    } else if (queue.phase === 'path') {
      const { astarResult, dijkstraResult, greedyResult } = queue;
      if (queue.tick < queue.maxPath) {
        const aFrame = astarResult.pathFrames[queue.tick];
        const dFrame = dijkstraResult.pathFrames[queue.tick];
        const gFrame = greedyResult?.pathFrames[queue.tick];

        const newGrid = queue.animGrid.map(r => r.map(n => ({
          ...n,
          astar:    { ...n.astar },
          dijkstra: { ...n.dijkstra },
          greedy:   { ...n.greedy },
        })));

        if (aFrame) newGrid[aFrame.row][aFrame.col].astar.inPath    = true;
        if (dFrame) newGrid[dFrame.row][dFrame.col].dijkstra.inPath = true;
        if (gFrame) newGrid[gFrame.row][gFrame.col].greedy.inPath   = true;

        queue.animGrid = newGrid;
        queue.tick++;
        setGrid(newGrid);

      } else {
        // Animation complete
        setAstarStats(astarResult.stats);
        setDijkstraStats(dijkstraResult.stats);
        if (greedyResult) setGreedyStats(greedyResult.stats);
        setHasRun(true);
        setIsRunning(false);
        setIsPaused(false);
        stepQueueRef.current = null;
        animRef.current = null;
      }
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.app}>
      <div style={{ width: sidebarWidth, minWidth: sidebarWidth, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <Controls
          heuristic={heuristic}       setHeuristic={setHeuristic}
          weight={weight}             setWeight={setWeight}
          speed={speed}               setSpeed={setSpeed}
          interactMode={interactMode} setInteractMode={setInteractMode}
          showGreedy={showGreedy}     setShowGreedy={setShowGreedy}
          isRunning={isRunning}       isPaused={isPaused}
          onRun={handleRun}
          onPause={handlePause}
          onResume={handleResume}
          onStepForward={handleStepForward}
          onReset={handleReset}
          onMaze={handleMaze}
          onClear={handleClearAll}
        />
      </div>

      <div className={styles.resizeHandle} onMouseDown={handleResizeStart} />

      <main className={styles.main}>
        <div className={styles.gridArea}>
          <Grid
            grid={grid}
            onCellInteract={handleCellInteract}
            interactMode={interactMode}
            isRunning={isRunning && !isPaused}
            astarScoreMap={astarScoreMap.current}
          />
        </div>
        <Stats
          astarStats={astarStats}
          dijkstraStats={dijkstraStats}
          greedyStats={greedyStats}
          showGreedy={showGreedy}
          isRunning={isRunning}
          hasRun={hasRun}
        />
      </main>
    </div>
  );
}
