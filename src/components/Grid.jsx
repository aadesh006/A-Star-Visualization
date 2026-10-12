import { useCallback, useRef } from 'react';
import { NODE_TYPES } from '../utils/algorithms';
import styles from './Grid.module.css';

// ─── Cell color resolver ───────────────────────────────────────────────────────

/**
 * Determines the visual class(es) for a cell based on its algorithm state.
 * When both algorithms have run, we blend their colors on empty nodes.
 */
function getCellClasses(node, mode) {
  const { type, astar, dijkstra } = node;
  const classes = [styles.cell];

  // Hard states always win
  if (type === NODE_TYPES.WALL)  return [...classes, styles.wall].join(' ');
  if (type === NODE_TYPES.START) return [...classes, styles.start].join(' ');
  if (type === NODE_TYPES.END)   return [...classes, styles.end].join(' ');

  // Path takes priority over visited/frontier
  if (astar.inPath && dijkstra.inPath) {
    classes.push(styles.pathBoth);
  } else if (astar.inPath) {
    classes.push(styles.pathAstar);
  } else if (dijkstra.inPath) {
    classes.push(styles.pathDijkstra);
  } else if (astar.visited && dijkstra.visited) {
    classes.push(styles.visitedBoth);
  } else if (astar.visited) {
    classes.push(styles.visitedAstar);
  } else if (dijkstra.visited) {
    classes.push(styles.visitedDijkstra);
  } else if (astar.inFrontier || dijkstra.inFrontier) {
    classes.push(styles.frontier);
  }

  return classes.join(' ');
}

// ─── Grid Component ────────────────────────────────────────────────────────────

export default function Grid({ grid, onCellInteract, interactMode, isRunning }) {
  // Track mouse-drag state so holding and dragging draws/erases walls
  const isMouseDown = useRef(false);
  const dragAction  = useRef(null); // 'draw' | 'erase' — consistent within one drag

  const handleMouseDown = useCallback((row, col) => {
    if (isRunning) return;
    isMouseDown.current = true;

    const node = grid[row][col];
    // When in wall mode, dragging over a wall erases it; dragging over empty draws
    if (interactMode === 'wall') {
      dragAction.current = node.type === NODE_TYPES.WALL ? 'erase' : 'draw';
    }
    onCellInteract(row, col, dragAction.current);
  }, [grid, interactMode, isRunning, onCellInteract]);

  const handleMouseEnter = useCallback((row, col) => {
    if (!isMouseDown.current || isRunning) return;
    onCellInteract(row, col, dragAction.current);
  }, [isRunning, onCellInteract]);

  const handleMouseUp = useCallback(() => {
    isMouseDown.current = false;
    dragAction.current  = null;
  }, []);

  return (
    <div
      className={styles.gridWrapper}
      onMouseLeave={handleMouseUp}
      onMouseUp={handleMouseUp}
    >
      {/* Subtle map overlay — gives the grid a slight terrain texture feel */}
      <div className={styles.mapOverlay} aria-hidden="true" />

      <div
        className={styles.grid}
        style={{ '--cols': grid[0]?.length ?? 56 }}
      >
        {grid.map((row, rIdx) =>
          row.map((node, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              className={getCellClasses(node)}
              onMouseDown={() => handleMouseDown(rIdx, cIdx)}
              onMouseEnter={() => handleMouseEnter(rIdx, cIdx)}
              // Prevent browser drag ghost image when painting walls
              onDragStart={e => e.preventDefault()}
              aria-label={`Cell ${rIdx},${cIdx} — ${node.type}`}
            />
          ))
        )}
      </div>

      {/* Compass rose in the corner — purely decorative map flavour */}
      <div className={styles.compass} aria-hidden="true">
        <span className={styles.compassN}>N</span>
        <span className={styles.compassMarker}>✦</span>
      </div>
    </div>
  );
}
