import { useCallback, useRef, useState } from 'react';
import { NODE_TYPES } from '../utils/algorithms';
import styles from './Grid.module.css';

// ─── Cell class resolver ───────────────────────────────────────────────────────
// Priority order: wall > start/end > path > visited > frontier > terrain > empty

function getCellClasses(node) {
  const { type, astar, dijkstra, greedy } = node;
  const base = [styles.cell];

  if (type === NODE_TYPES.WALL)  return [...base, styles.wall].join(' ');
  if (type === NODE_TYPES.START) return [...base, styles.start].join(' ');
  if (type === NODE_TYPES.END)   return [...base, styles.end].join(' ');

  // Count how many algos have the path through this cell
  const pathCount = (astar.inPath ? 1 : 0) + (dijkstra.inPath ? 1 : 0) + (greedy.inPath ? 1 : 0);

  if (pathCount >= 2) {
    base.push(styles.pathShared);
  } else if (astar.inPath) {
    base.push(styles.pathAstar);
  } else if (dijkstra.inPath) {
    base.push(styles.pathDijkstra);
  } else if (greedy.inPath) {
    base.push(styles.pathGreedy);
  } else if (astar.visited && dijkstra.visited && greedy.visited) {
    base.push(styles.visitedAll);
  } else if (astar.visited && dijkstra.visited) {
    base.push(styles.visitedAstarDijkstra);
  } else if (astar.visited) {
    base.push(styles.visitedAstar);
  } else if (dijkstra.visited) {
    base.push(styles.visitedDijkstra);
  } else if (greedy.visited) {
    base.push(styles.visitedGreedy);
  } else if (astar.inFrontier || dijkstra.inFrontier || greedy.inFrontier) {
    base.push(styles.frontier);
  } else if (type === NODE_TYPES.SAND) {
    base.push(styles.sand);
  } else if (type === NODE_TYPES.WATER) {
    base.push(styles.water);
  }

  return base.join(' ');
}

// ─── Grid Component ────────────────────────────────────────────────────────────

export default function Grid({ grid, onCellInteract, interactMode, isRunning, astarScoreMap }) {
  const isMouseDown = useRef(false);
  const dragAction  = useRef(null);

  // Tooltip state — shows g/f scores on hover after a run
  const [tooltip, setTooltip] = useState(null); // { row, col, x, y }

  const handleMouseDown = useCallback((row, col) => {
    if (isRunning) return;
    isMouseDown.current = true;
    const node = grid[row][col];
    if (interactMode === 'wall' || interactMode === 'sand' || interactMode === 'water') {
      // Start a draw action; erase if hovering over the same terrain type
      dragAction.current = (node.type === NODE_TYPES.WALL && interactMode === 'wall') ||
                           (node.type === NODE_TYPES.SAND  && interactMode === 'sand')  ||
                           (node.type === NODE_TYPES.WATER && interactMode === 'water')
        ? 'erase' : 'draw';
    }
    onCellInteract(row, col, dragAction.current);
  }, [grid, interactMode, isRunning, onCellInteract]);

  const handleMouseEnter = useCallback((row, col, e) => {
    if (isMouseDown.current && !isRunning) {
      onCellInteract(row, col, dragAction.current);
    }
    // Show tooltip with g/f scores if we have them for this cell
    if (astarScoreMap) {
      const key = `${row},${col}`;
      const scores = astarScoreMap[key];
      if (scores) {
        setTooltip({ row, col, scores, x: e.clientX, y: e.clientY });
        return;
      }
    }
    setTooltip(null);
  }, [isRunning, onCellInteract, astarScoreMap]);

  const handleMouseLeaveCell = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleMouseUp = useCallback(() => {
    isMouseDown.current = false;
    dragAction.current  = null;
  }, []);

  return (
    <div
      className={styles.gridWrapper}
      onMouseLeave={() => { handleMouseUp(); setTooltip(null); }}
      onMouseUp={handleMouseUp}
    >
      <div className={styles.mapOverlay} aria-hidden="true" />

      <div className={styles.grid} style={{ '--cols': grid[0]?.length ?? 56 }}>
        {grid.map((row, rIdx) =>
          row.map((node, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              className={getCellClasses(node)}
              onMouseDown={() => handleMouseDown(rIdx, cIdx)}
              onMouseEnter={e => handleMouseEnter(rIdx, cIdx, e)}
              onMouseLeave={handleMouseLeaveCell}
              onDragStart={e => e.preventDefault()}
            />
          ))
        )}
      </div>

      {/* ── g/f score tooltip — shows A* cost values on hover ── */}
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipKey}>g</span>
            <span className={styles.tooltipVal}>{tooltip.scores.g?.toFixed(2) ?? '∞'}</span>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipKey}>f</span>
            <span className={styles.tooltipVal}>{tooltip.scores.f?.toFixed(2) ?? '∞'}</span>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipKey}>h</span>
            <span className={styles.tooltipVal}>
              {(tooltip.scores.f - tooltip.scores.g)?.toFixed(2) ?? '∞'}
            </span>
          </div>
        </div>
      )}

      <div className={styles.compass} aria-hidden="true">
        <span className={styles.compassN}>N</span>
        <span className={styles.compassMarker}>✦</span>
      </div>
    </div>
  );
}
