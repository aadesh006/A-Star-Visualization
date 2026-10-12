import styles from './Stats.module.css';

// ─── Stats Bar ─────────────────────────────────────────────────────────────────
// Benchmark table comparing all three algorithms side-by-side.
// Columns collapse/expand based on whether Greedy is enabled.

export default function Stats({ astarStats, dijkstraStats, greedyStats, showGreedy, isRunning, hasRun }) {
  const nodesA = astarStats?.nodesExplored    ?? 0;
  const nodesD = dijkstraStats?.nodesExplored ?? 0;
  const nodesG = greedyStats?.nodesExplored   ?? 0;
  const pathA  = astarStats?.pathLength       ?? 0;
  const pathD  = dijkstraStats?.pathLength    ?? 0;
  const pathG  = greedyStats?.pathLength      ?? 0;

  // Efficiency: how many fewer nodes did A* explore vs Dijkstra?
  const ratio     = nodesD > 0 ? ((1 - nodesA / nodesD) * 100).toFixed(1) : null;
  // Path quality delta between A* and Dijkstra
  const pathDelta = pathA > 0 && pathD > 0 ? (pathA - pathD).toFixed(1) : null;

  return (
    <div className={styles.bar}>

      {/* ── Inverted header row ── */}
      <div className={styles.headerRow} style={{ '--algo-cols': showGreedy ? 4 : 3 }}>
        <div className={styles.headerCell}>METRIC</div>
        <div className={`${styles.headerCell} ${styles.astarHeader}`}>A*</div>
        <div className={`${styles.headerCell} ${styles.dijkstraHeader}`}>DIJKSTRA</div>
        {showGreedy && <div className={`${styles.headerCell} ${styles.greedyHeader}`}>GREEDY</div>}
        <div className={styles.headerCell}>ΔDIFF</div>
      </div>

      {/* ── Nodes explored ── */}
      <div className={styles.row} style={{ '--algo-cols': showGreedy ? 4 : 3 }}>
        <div className={styles.rowLabel}>nodes explored</div>
        <div className={`${styles.rowVal} ${styles.astarVal} ${isRunning && nodesA > 0 ? styles.live : ''}`}>
          {hasRun || isRunning ? nodesA.toLocaleString() : '—'}
        </div>
        <div className={`${styles.rowVal} ${styles.dijkstraVal} ${isRunning && nodesD > 0 ? styles.live : ''}`}>
          {hasRun || isRunning ? nodesD.toLocaleString() : '—'}
        </div>
        {showGreedy && (
          <div className={`${styles.rowVal} ${styles.greedyVal} ${isRunning && nodesG > 0 ? styles.live : ''}`}>
            {hasRun || isRunning ? nodesG.toLocaleString() : '—'}
          </div>
        )}
        <div className={styles.rowDiff}>
          {hasRun && ratio !== null
            ? <span className={parseFloat(ratio) > 0 ? styles.better : styles.neutral}>
                {parseFloat(ratio) > 0 ? `A* −${ratio}%` : 'equal'}
              </span>
            : '—'}
        </div>
      </div>

      {/* ── Path length ── */}
      <div className={styles.row} style={{ '--algo-cols': showGreedy ? 4 : 3 }}>
        <div className={styles.rowLabel}>path length</div>
        <div className={`${styles.rowVal} ${styles.astarVal}`}>
          {hasRun ? (pathA > 0 ? pathA.toFixed(1) : 'none') : '—'}
        </div>
        <div className={`${styles.rowVal} ${styles.dijkstraVal}`}>
          {hasRun ? (pathD > 0 ? pathD.toFixed(1) : 'none') : '—'}
        </div>
        {showGreedy && (
          <div className={`${styles.rowVal} ${styles.greedyVal}`}>
            {hasRun ? (pathG > 0 ? pathG.toFixed(1) : 'none') : '—'}
          </div>
        )}
        <div className={styles.rowDiff}>
          {hasRun && pathDelta !== null
            ? <span className={parseFloat(pathDelta) > 0 ? styles.worse : styles.better}>
                {parseFloat(pathDelta) > 0 ? `A* +${pathDelta}` : 'equal'}
              </span>
            : '—'}
        </div>
      </div>

      {/* ── Status ── */}
      <div className={styles.row} style={{ '--algo-cols': showGreedy ? 4 : 3 }}>
        <div className={styles.rowLabel}>status</div>
        <div className={`${styles.rowVal} ${styles.astarVal}`}>
          <StatusBadge isRunning={isRunning} hasRun={hasRun} found={astarStats?.found} />
        </div>
        <div className={`${styles.rowVal} ${styles.dijkstraVal}`}>
          <StatusBadge isRunning={isRunning} hasRun={hasRun} found={dijkstraStats?.found} />
        </div>
        {showGreedy && (
          <div className={`${styles.rowVal} ${styles.greedyVal}`}>
            <StatusBadge isRunning={isRunning} hasRun={hasRun} found={greedyStats?.found} />
          </div>
        )}
        <div className={styles.rowDiff}>—</div>
      </div>

    </div>
  );
}

function StatusBadge({ isRunning, hasRun, found }) {
  if (isRunning) return <span className={styles.running}>RUNNING</span>;
  if (!hasRun)   return '—';
  return <span className={found ? styles.found : styles.notFound}>{found ? 'FOUND' : 'NO PATH'}</span>;
}
